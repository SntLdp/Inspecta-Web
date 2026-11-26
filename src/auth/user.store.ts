export interface AuthUser {
  id: string;
  name: string;
  email: string;
  organization_id?: string | null;
  role?: string;
  [key: string]: unknown;
}

const USER_KEY = "inspecta_user";

export const AUTH_USER_EVENT = "inspecta:user-changed";

/* =====================================================
   SNAPSHOT DE IDENTIDAD
   ===================================================== */

let cachedRawUser: string | null | undefined;
let cachedUser: AuthUser | null = null;

/* =====================================================
   VALIDACIÓN
   ===================================================== */

export function isAuthUser(
  value: unknown
): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "string" &&
    user.id.length > 0 &&
    typeof user.name === "string" &&
    typeof user.email === "string"
  );
}

/* =====================================================
   CONSULTAR IDENTIDAD
   ===================================================== */

export function getStoredUser(): AuthUser | null {
  const rawUser = localStorage.getItem(USER_KEY);

  if (rawUser === cachedRawUser) {
    return cachedUser;
  }

  cachedRawUser = rawUser;
  cachedUser = null;

  if (!rawUser) {
    return null;
  }

  try {
    const parsedUser: unknown = JSON.parse(rawUser);

    if (isAuthUser(parsedUser)) {
      cachedUser = parsedUser;
    }
  } catch {
    cachedUser = null;
  }

  return cachedUser;
}

/* =====================================================
   NOTIFICACIÓN DE CAMBIOS
   ===================================================== */

function emitUserChanged(): void {
  window.dispatchEvent(
    new Event(AUTH_USER_EVENT)
  );
}

/* =====================================================
   ALMACENAR IDENTIDAD
   ===================================================== */

export function setStoredUser(user: AuthUser): void {
  if (!isAuthUser(user)) {
    throw new Error(
      "Los datos de identidad del usuario no son válidos."
    );
  }

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );

  emitUserChanged();
}

/* =====================================================
   ACTUALIZAR IDENTIDAD
   ===================================================== */

export function updateStoredUser(
  user: AuthUser
): void {
  const currentUser = getStoredUser();

  if (
    currentUser &&
    currentUser.id !== user.id
  ) {
    throw new Error(
      "La identidad recibida no corresponde al usuario de la sesión."
    );
  }

  setStoredUser({
    ...currentUser,
    ...user,
  });
}

/* =====================================================
   ELIMINAR IDENTIDAD
   ===================================================== */

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY);

  cachedRawUser = null;
  cachedUser = null;

  emitUserChanged();
}

/* =====================================================
   SUSCRIPCIÓN A CAMBIOS
   ===================================================== */

export function subscribeToAuthUser(
  listener: () => void
): () => void {
  const handleStorage = (
    event: StorageEvent
  ): void => {
    if (
      event.storageArea === localStorage &&
      (
        event.key === USER_KEY ||
        event.key === null
      )
    ) {
      listener();
    }
  };

  window.addEventListener(
    AUTH_USER_EVENT,
    listener
  );

  window.addEventListener(
    "storage",
    handleStorage
  );

  return () => {
    window.removeEventListener(
      AUTH_USER_EVENT,
      listener
    );

    window.removeEventListener(
      "storage",
      handleStorage
    );
  };
}