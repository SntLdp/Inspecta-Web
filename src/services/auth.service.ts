import {
  apiRequest,
  clearOrganizationId,
  clearSession,
  getAuthToken,
  setAuthToken,
} from "../api/client";

import {
  getStoredUser,
  isAuthUser,
  setStoredUser,
  updateStoredUser,
} from "../auth/user.store";

import type {
  AuthUser,
} from "../auth/user.store";

/* =====================================================
   EXPORTACIONES DE COMPATIBILIDAD
   ===================================================== */

export type { AuthUser } from "../auth/user.store";

export { getStoredUser } from "../auth/user.store";

/* =====================================================
   TIPOS DE RESPUESTA
   ===================================================== */

interface LoginResponse {
  message?: string;
  data?: {
    user?: AuthUser;
    token?: string;
  };
  user?: AuthUser;
  token?: string;
}

interface CurrentUserResponse {
  data?: AuthUser;
  user?: AuthUser;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/* =====================================================
   INICIO DE SESIÓN
   ===================================================== */

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  // Evita reutilizar la organización de una sesión anterior.
  clearOrganizationId();

  const response = await apiRequest<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: {
        email,
        password,
      },
    }
  );

  const token =
    response.data?.token ?? response.token;

  const user =
    response.data?.user ?? response.user;

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    !isAuthUser(user)
  ) {
    throw new Error(
      response.message ??
        "La API no devolvió el token o los datos del usuario esperados."
    );
  }

  setAuthToken(token);
  setStoredUser(user);

  return user;
}

/* =====================================================
   CONSULTAR USUARIO AUTENTICADO
   ===================================================== */

export async function getCurrentUser(
  signal?: AbortSignal
): Promise<AuthUser> {
  const token = getAuthToken();

  const response = await apiRequest<CurrentUserResponse>(
    "/auth/me",
    {
      method: "GET",
      signal,
    }
  );

  if (
    signal?.aborted ||
    !token ||
    getAuthToken() !== token
  ) {
    throw new DOMException(
      "La sesión cambió durante la solicitud.",
      "AbortError"
    );
  }

  const user =
    response.data ??
    response.user ??
    response;

  if (!isAuthUser(user)) {
    throw new Error(
      "La API no devolvió los datos esperados del usuario."
    );
  }

  const storedUser = getStoredUser();

  if (
    storedUser &&
    storedUser.id !== user.id
  ) {
    throw new Error(
      "La identidad recibida no corresponde a la sesión actual."
    );
  }

  updateStoredUser(user);

  return user;
}

/* =====================================================
   CIERRE DE SESIÓN
   ===================================================== */

export async function logout(): Promise<void> {
  const token = getAuthToken();

  try {
    await apiRequest<void>(
      "/auth/logout",
      {
        method: "POST",
      }
    );
  } finally {
    // Una respuesta antigua no debe eliminar
    // una sesión iniciada posteriormente.
    if (getAuthToken() === token) {
      clearSession();
    }
  }
}