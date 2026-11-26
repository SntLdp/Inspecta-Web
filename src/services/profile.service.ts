import {
  apiRequest,
  ApiError,
  getAuthToken,
  getOrganizationId,
} from "../api/client";

import {
  isAuthUser,
  updateStoredUser,
} from "../auth/user.store";

import type {
  ProfileIdentity,
  ProfileUpdateInput,
  ProfileUpdateResponse,
  ProfilePasswordInput,
  ProfilePasswordResponse,
  ProfileMembership,
  ProfileMembershipResponse,
  ProfileValidationErrors,
  ProfileValidationErrorResponse,
} from "../types/profile.types";

/* =====================================================
   ENDPOINTS
   ===================================================== */

const PROFILE_ENDPOINTS = {
  identity: "/auth/me",
  password: "/auth/password",
  membership: "/auth/me/membership",
} as const;

/* =====================================================
   CONTROL DE SOLICITUDES OBSOLETAS
   ===================================================== */

function ensureSameSession(
  token: string | null,
  signal?: AbortSignal
): void {
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
}

function ensureSameOrganization(
  organizationId: string,
  signal?: AbortSignal
): void {
  if (
    signal?.aborted ||
    getOrganizationId() !== organizationId
  ) {
    throw new DOMException(
      "La organización cambió durante la solicitud.",
      "AbortError"
    );
  }
}

/* =====================================================
   VALIDACIÓN Y SINCRONIZACIÓN DE IDENTIDAD
   ===================================================== */

function synchronizeIdentity(
  identity: ProfileIdentity
): void {
  if (!isAuthUser(identity)) {
    throw new ApiError(
      "La API devolvió una identidad de usuario no válida.",
      0
    );
  }

  updateStoredUser(identity);
}

/* =====================================================
   CONSULTAR IDENTIDAD GLOBAL
   ===================================================== */

export async function getProfile(
  signal?: AbortSignal
): Promise<ProfileIdentity> {
  const token = getAuthToken();

  const response = await apiRequest<{
    data: ProfileIdentity;
  }>(
    PROFILE_ENDPOINTS.identity,
    {
      method: "GET",
      signal,
    }
  );

  ensureSameSession(token, signal);

  synchronizeIdentity(response.data);

  return response.data;
}

/* =====================================================
   ACTUALIZAR INFORMACIÓN PERSONAL
   ===================================================== */

export async function updateProfile(
  data: ProfileUpdateInput,
  signal?: AbortSignal
): Promise<ProfileUpdateResponse> {
  const token = getAuthToken();

  const response = await apiRequest<ProfileUpdateResponse>(
    PROFILE_ENDPOINTS.identity,
    {
      method: "PATCH",
      body: data,
      signal,
    }
  );

  ensureSameSession(token, signal);

  synchronizeIdentity(response.data);

  return response;
}

/* =====================================================
   CAMBIAR CONTRASEÑA
   ===================================================== */

export async function updateProfilePassword(
  data: ProfilePasswordInput,
  signal?: AbortSignal
): Promise<ProfilePasswordResponse> {
  const token = getAuthToken();

  const response = await apiRequest<ProfilePasswordResponse>(
    PROFILE_ENDPOINTS.password,
    {
      method: "PUT",
      body: data,
      signal,
    }
  );

  ensureSameSession(token, signal);

  return response;
}

/* =====================================================
   CONSULTAR MEMBRESÍA ORGANIZACIONAL
   ===================================================== */

export async function getProfileMembership(
  signal?: AbortSignal
): Promise<ProfileMembership> {
  const token = getAuthToken();
  const organizationId = getOrganizationId();

  if (!organizationId) {
    throw new ApiError(
      "Debes seleccionar una organización.",
      400,
      {
        code: "organization_required",
      }
    );
  }

  const response = await apiRequest<ProfileMembershipResponse>(
    PROFILE_ENDPOINTS.membership,
    {
      method: "GET",
      signal,
    }
  );

  ensureSameSession(token, signal);

  ensureSameOrganization(
    organizationId,
    signal
  );

  if (
    response.data.organization.id !== organizationId
  ) {
    throw new ApiError(
      "La membresía recibida no corresponde a la organización seleccionada.",
      0
    );
  }

  return response.data;
}

/* =====================================================
   ERRORES DE VALIDACIÓN
   ===================================================== */

export function getProfileValidationErrors(
  error: unknown
): ProfileValidationErrors {
  if (
    !(error instanceof ApiError) ||
    error.status !== 422 ||
    !error.details ||
    typeof error.details !== "object"
  ) {
    return {};
  }

  const details =
    error.details as ProfileValidationErrorResponse;

  return details.errors ?? {};
}

export function getProfileErrorMessage(
  error: unknown
): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return "Tu sesión ya no es válida.";

      case 403:
        return (
          error.message ||
          "No tienes acceso a esta información."
        );

      case 415:
        return "El formato de la solicitud no es válido.";

      case 422:
        return (
          error.message ||
          "Comprueba los datos proporcionados."
        );

      case 429:
        return "Has realizado demasiadas solicitudes. Espera un momento antes de volver a intentarlo.";

      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

export function isProfileRequestAborted(
  error: unknown
): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
}