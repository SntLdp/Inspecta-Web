const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ""
).replace(/\/+$/, "");

const TOKEN_KEY = "inspecta_token";
const USER_KEY = "inspecta_user";
const ORGANIZATION_KEY = "inspecta_organization_id";

/* =====================================================
   TIPOS Y EVENTOS
   ===================================================== */

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export const API_ACCESS_EVENT = "inspecta:access-invalidated";

export type ApiAccessEventDetail = {
  type: "session" | "organization";
  code: string;
  message: string;
};

const ORGANIZATION_ERROR_CODES = new Set([
  "organization_access_denied",
  "organization_not_tenant",
  "organization_required",
  "organization_invalid",
]);

/* =====================================================
   ERRORES DE LA API
   ===================================================== */

export class ApiError extends Error {
  public readonly code: string | null;

  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);

    this.name = "ApiError";
    this.code = getErrorCode(details);
  }
}

/* =====================================================
   CONFIGURACIÓN Y ALMACENAMIENTO
   ===================================================== */

export const isApiConfigured = Boolean(API_BASE_URL);

export const getApiBaseUrl = () => API_BASE_URL;

export const getAuthToken = () =>
  localStorage.getItem(TOKEN_KEY);

export const setAuthToken = (token: string) =>
  localStorage.setItem(TOKEN_KEY, token);

export const clearAuthToken = () =>
  localStorage.removeItem(TOKEN_KEY);

export const getOrganizationId = () =>
  localStorage.getItem(ORGANIZATION_KEY);

export const setOrganizationId = (id: string) =>
  localStorage.setItem(ORGANIZATION_KEY, id);

export const clearOrganizationId = () =>
  localStorage.removeItem(ORGANIZATION_KEY);

export const clearSession = () => {
  clearAuthToken();
  clearOrganizationId();

  localStorage.removeItem(USER_KEY);
};

/* =====================================================
   INVALIDACIÓN DE ACCESO
   ===================================================== */

function emitAccessEvent(
  detail: ApiAccessEventDetail
): void {
  window.dispatchEvent(
    new CustomEvent<ApiAccessEventDetail>(
      API_ACCESS_EVENT,
      { detail }
    )
  );
}

export function invalidateSession(
  code = "unauthenticated",
  message = "Tu sesión ya no es válida."
): void {
  clearSession();

  emitAccessEvent({
    type: "session",
    code,
    message,
  });
}

export function invalidateOrganization(
  code = "organization_access_denied",
  message = "Ya no tienes acceso a la organización seleccionada."
): void {
  clearOrganizationId();

  emitAccessEvent({
    type: "organization",
    code,
    message,
  });
}

/* =====================================================
   INTERPRETACIÓN DE ERRORES
   ===================================================== */

function getErrorCode(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;

  return typeof record.code === "string"
    ? record.code
    : null;
}

function getErrorMessage(
  data: unknown,
  fallback: string
): string {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.message === "string") {
    return record.message;
  }

  if (
    record.errors &&
    typeof record.errors === "object"
  ) {
    const first = Object.values(
      record.errors as Record<string, unknown>
    )[0];

    if (
      Array.isArray(first) &&
      typeof first[0] === "string"
    ) {
      return first[0];
    }
  }

  return fallback;
}

/* =====================================================
   CLIENTE HTTP
   ===================================================== */

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "Falta configurar VITE_API_BASE_URL en .env.local.",
      0
    );
  }

  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  const isLoginRequest =
    normalizedPath === "/auth/login";

  const token = getAuthToken();
  const organizationId = getOrganizationId();

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (token && !isLoginRequest) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requiresOrganization =
    !normalizedPath.startsWith("/auth/") ||
    normalizedPath === "/auth/capabilities";

  if (organizationId && requiresOrganization) {
    headers.set(
      "X-Organization-Id",
      organizationId
    );
  }

  /* =====================================================
     PREPARAR BODY
     ===================================================== */

  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    if (
      options.body instanceof FormData ||
      typeof options.body === "string"
    ) {
      body = options.body as BodyInit;
    } else {
      headers.set(
        "Content-Type",
        "application/json"
      );

      body = JSON.stringify(options.body);
    }
  }

  /* =====================================================
     EJECUTAR SOLICITUD
     ===================================================== */

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${normalizedPath}`,
      {
        ...options,
        headers,
        body,
      }
    );
  } catch (err) {
    if (options.signal?.aborted) {
      throw err;
    }

    throw new ApiError(
      "No fue posible conectar con la API. Comprueba la URL, la conexión y CORS.",
      0
    );
  }

  /* =====================================================
     RESPUESTA SIN CONTENIDO
     ===================================================== */

  if (response.status === 204) {
    return undefined as T;
  }

  /* =====================================================
     INTERPRETAR RESPUESTA
     ===================================================== */

  const contentType =
    response.headers.get("content-type") ?? "";

  let responseData: unknown;

  if (contentType.includes("application/json")) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    responseData = await response.text();
  }

  /* =====================================================
     COMPROBAR CANCELACIÓN
     ===================================================== */

  if (options.signal?.aborted) {
    throw new DOMException(
      "La solicitud fue cancelada.",
      "AbortError"
    );
  }

  /* =====================================================
     GESTIÓN CENTRALIZADA DE ERRORES
     ===================================================== */

  if (!response.ok) {
    const fallback =
      `Error HTTP ${response.status}` +
      (
        response.statusText
          ? `: ${response.statusText}`
          : ""
      );

    const apiError = new ApiError(
      getErrorMessage(responseData, fallback),
      response.status,
      responseData
    );

    // Comprobar que la respuesta pertenece a la sesión
    // que continúa activa.
    const sameSession =
      Boolean(token) &&
      getAuthToken() === token;

    // Comprobar que la organización no cambió mientras
    // se ejecutaba la solicitud.
    const sameOrganization =
      getOrganizationId() === organizationId;

    if (!isLoginRequest && sameSession) {
      const invalidSession =
        response.status === 401 ||
        (
          response.status === 403 &&
          apiError.code === "user_inactive"
        );

      if (invalidSession) {
        invalidateSession(
          apiError.code ?? "unauthenticated",
          apiError.message
        );
      } else if (
        requiresOrganization &&
        sameOrganization &&
        (
          response.status === 400 ||
          response.status === 403
        ) &&
        apiError.code &&
        ORGANIZATION_ERROR_CODES.has(apiError.code)
      ) {
        invalidateOrganization(
          apiError.code,
          apiError.message
        );
      }
    }

    throw apiError;
  }

  return responseData as T;
}