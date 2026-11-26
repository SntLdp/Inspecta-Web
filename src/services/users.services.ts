
import { apiRequest } from "../api/client";

import type {
  ApiResponse,
  PaginationMeta,
} from "../types/inspections";

import type {
  AdministrationUsersResponse,
  AdministrationUserResponse,
  GetAdministrationUsersParams,
  AdministrationUserCreateInput,
  AdministrationMembershipStatusInput,
  AdministrationUserRolesInput,
  AdministrationUserPasswordInput,
  AdministrationUserLocationsInput
} from "../types/administration";

// =====================================================
// TIPOS EXISTENTES
// =====================================================

export interface User {
  id: string;
  name: string;
  email: string;
  status: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UsersResponse {
  data: User[];
  meta: PaginationMeta;
}

// =====================================================
// CONSULTAS EXISTENTES
// =====================================================

export function getUsers(
  page = 1,
  perPage = 100
): Promise<UsersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  return apiRequest<UsersResponse>(
    `/users?${params.toString()}`
  );
}

export function getUser(
  id: string
): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(
    `/users/${encodeURIComponent(id)}`
  );
}

// =====================================================
// LISTADO ADMINISTRATIVO
// =====================================================

export function getAdministrationUsers(
  filters: GetAdministrationUsersParams = {},
  signal?: AbortSignal
): Promise<AdministrationUsersResponse> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    per_page: String(filters.perPage ?? 15),
  });

  const search = filters.q?.trim();

  if (search) {
    params.set("q", search);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.roleId) {
    params.set("role_id", filters.roleId);
  }

  return apiRequest<AdministrationUsersResponse>(
    `/users?${params.toString()}`,
    {
      method: "GET",
      signal,
    }
  );
}

// =====================================================
// CONSULTAR USUARIO
// =====================================================

export function getAdministrationUser(
  userId: string,
  signal?: AbortSignal
): Promise<AdministrationUserResponse> {
  return apiRequest<AdministrationUserResponse>(
    `/users/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      signal,
    }
  );
}

// =====================================================
// CREAR USUARIO
// =====================================================

export function createAdministrationUser(
  data: AdministrationUserCreateInput
): Promise<AdministrationUserResponse> {
  return apiRequest<AdministrationUserResponse>(
    "/users",
    {
      method: "POST",
      body: data,
    }
  );
}

// =====================================================
// CAMBIAR ESTADO DE MEMBRESÍA
// =====================================================

export function updateAdministrationMembershipStatus(
  userId: string,
  data: AdministrationMembershipStatusInput
): Promise<AdministrationUserResponse> {
  return apiRequest<AdministrationUserResponse>(
    `/users/${encodeURIComponent(userId)}/membership/status`,
    {
      method: "PATCH",
      body: data,
    }
  );
}

// =====================================================
// SUSTITUIR ROLES ASIGNADOS
// =====================================================

export function updateAdministrationUserRoles(
  userId: string,
  data: AdministrationUserRolesInput
): Promise<AdministrationUserResponse> {
  return apiRequest<AdministrationUserResponse>(
    `/users/${encodeURIComponent(userId)}/roles`,
    {
      method: "PUT",
      body: data,
    }
  );
}

// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

export function updateUserPassword(
  userId: string,
  data: AdministrationUserPasswordInput
): Promise<ApiResponse<User>> {
  return apiRequest<ApiResponse<User>>(
    `/users/${encodeURIComponent(userId)}/password`,
    {
      method: "PUT",
      body: data,
    }
  );
}

export function updateAdministrationUserLocations(
  userId: string,
  data: AdministrationUserLocationsInput
): Promise<AdministrationUserResponse> {
  return apiRequest(
    `/users/${encodeURIComponent(userId)}/locations`,
    {
      method: "PUT",
      body: data,
    }
  );
}
