
import { apiRequest } from "../api/client";

import type {
  AdministrationRolesResponse,
  AdministrationRoleResponse,
  AdministrationPermissionsResponse,
  GetAdministrationRolesParams,
  AdministrationRoleCreateInput,
  AdministrationRoleUpdateInput,
  AdministrationRoleStatusInput,
  AdministrationRolePermissionsInput,
} from "../types/administration";

// =====================================================
// LISTAR ROLES
// =====================================================

export function getAdministrationRoles(
  filters: GetAdministrationRolesParams = {},
  signal?: AbortSignal
): Promise<AdministrationRolesResponse> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    per_page: String(filters.perPage ?? 15),
  });

  const search = filters.q?.trim();

  if (search) {
    params.set("q", search);
  }

  if (filters.status !== undefined) {
    params.set(
      "status",
      filters.status ? "1" : "0"
    );
  }

  return apiRequest<AdministrationRolesResponse>(
    `/roles?${params.toString()}`,
    {
      method: "GET",
      signal,
    }
  );
}

// =====================================================
// CONSULTAR ROL
// =====================================================

export function getAdministrationRole(
  roleId: string,
  signal?: AbortSignal
): Promise<AdministrationRoleResponse> {
  return apiRequest<AdministrationRoleResponse>(
    `/roles/${encodeURIComponent(roleId)}`,
    {
      method: "GET",
      signal,
    }
  );
}

// =====================================================
// CONSULTAR CATÁLOGO DE PERMISOS
// =====================================================

export function getAdministrationPermissions(
  signal?: AbortSignal
): Promise<AdministrationPermissionsResponse> {
  return apiRequest<AdministrationPermissionsResponse>(
    "/permissions",
    {
      method: "GET",
      signal,
    }
  );
}

// =====================================================
// CREAR ROL
// =====================================================

export function createAdministrationRole(
  data: AdministrationRoleCreateInput
): Promise<AdministrationRoleResponse> {
  return apiRequest<AdministrationRoleResponse>(
    "/roles",
    {
      method: "POST",
      body: data,
    }
  );
}

// =====================================================
// ACTUALIZAR ROL
// =====================================================

export function updateAdministrationRole(
  roleId: string,
  data: AdministrationRoleUpdateInput
): Promise<AdministrationRoleResponse> {
  return apiRequest<AdministrationRoleResponse>(
    `/roles/${encodeURIComponent(roleId)}`,
    {
      method: "PATCH",
      body: data,
    }
  );
}

// =====================================================
// CAMBIAR ESTADO DEL ROL
// =====================================================

export function updateAdministrationRoleStatus(
  roleId: string,
  data: AdministrationRoleStatusInput
): Promise<AdministrationRoleResponse> {
  return apiRequest<AdministrationRoleResponse>(
    `/roles/${encodeURIComponent(roleId)}/status`,
    {
      method: "PATCH",
      body: data,
    }
  );
}

// =====================================================
// SUSTITUIR PERMISOS DEL ROL
// =====================================================

export function updateAdministrationRolePermissions(
  roleId: string,
  data: AdministrationRolePermissionsInput
): Promise<AdministrationRoleResponse> {
  return apiRequest<AdministrationRoleResponse>(
    `/roles/${encodeURIComponent(roleId)}/permissions`,
    {
      method: "PUT",
      body: data,
    }
  );
}
