
import {
  apiRequest,
  clearOrganizationId,
  clearSession,
  setAuthToken,
} from "../api/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  organization_id?: string | null;
  role?: string;
  [key: string]: unknown;
}

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

const USER_KEY = "inspecta_user";

export function getStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  // Evita reutilizar la organización de una sesión anterior.
  clearOrganizationId();

  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  const token = response.data?.token ?? response.token;
  const user = response.data?.user ?? response.user;

  if (!token || !user) {
    throw new Error(
      response.message ??
        "La API no devolvió el token o los datos del usuario esperados."
    );
  }

  setAuthToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<CurrentUserResponse>("/auth/me", {
    method: "GET",
  });

  const user = response.data ?? response.user ?? response;

  if (
    !user ||
    typeof user !== "object" ||
    !("id" in user) ||
    !("email" in user)
  ) {
    throw new Error("La API no devolvió los datos esperados del usuario.");
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));

  return user as AuthUser;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearSession();
  }
}
