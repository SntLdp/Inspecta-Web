import type { PaginationMeta } from "./inspections";

export type MembershipStatus = "active" | "revoked";

export interface AdministrationMembership {
    id: string;
    status: MembershipStatus;
    revoked_at: string | null;
}

export interface AdministrationUserRole {
    id: string;
    name: string;
    system_key: string | null;
    status: boolean;
}

export interface AdministrationUserPlant {
    id: string;
    name: string;
    code: string;
    status: boolean;
}

export interface AdministrationUserArea {
    id: string;
    name: string;
    code: string;
    status: boolean;
    plant_id: string;
}

export interface AdministrationUserLocations {
    plants: AdministrationUserPlant[];
    areas: AdministrationUserArea[];
}

export interface AdministrationUser {
    id: string;
    name: string;
    email: string;
    account_status: boolean;
    membership: AdministrationMembership;
    roles: AdministrationUserRole[];
    locations: AdministrationUserLocations;
}

export interface AdministrationUsersResponse {
    data: AdministrationUser[];
    meta: PaginationMeta;
}

export interface AdministrationUserResponse {
    data: AdministrationUser;
}

export interface GetAdministrationUsersParams {
    page?: number;
    perPage?: number;
    q?: string;
    status?: MembershipStatus;
    roleId?: string;
}

// =====================================================
// ROLES Y PERMISOS
// =====================================================

export type AdministrationPermissionKey =
    | "plants.view"
    | "locations.view_all"
    | "plants.manage"
    | "users.manage"
    | "roles.manage"
    | "memberships.manage"
    | "checklists.view"
    | "checklists.manage"
    | "norms.view"
    | "norms.manage"
    | "inspections.manage"
    | "inspections.execute"
    | "findings.register"
    | "findings.close"
    | "corrective_actions.manage"
    | "corrective_actions.verify"
    | "reports.view"
    | "reports.view_own";

export interface AdministrationPermission {
    key: AdministrationPermissionKey;
    assignable: boolean;
}

export interface AdministrationPermissionsResponse {
    data: AdministrationPermission[];
}

export interface AdministrationRole {
    id: string;
    name: string;
    description: string | null;
    system_key: string | null;
    status: boolean;
    permissions: AdministrationPermissionKey[];
    users_count: number;
}

export interface AdministrationRolesResponse {
    data: AdministrationRole[];
    meta: PaginationMeta;
}

export interface AdministrationRoleResponse {
    data: AdministrationRole;
}

export interface GetAdministrationRolesParams {
    page?: number;
    perPage?: number;
    q?: string;
    status?: boolean;
}

// =====================================================
// OPERACIONES DE ESCRITURA DE USUARIOS
// =====================================================

export interface AdministrationUserCreateInput {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export interface AdministrationMembershipStatusInput {
    status: MembershipStatus;
}

export interface AdministrationUserRolesInput {
    role_ids: string[];
}

export interface AdministrationUserPasswordInput {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
}

// =====================================================
// OPERACIONES DE ESCRITURA DE ROLES
// =====================================================

export interface AdministrationRoleCreateInput {
    name: string;
    description?: string | null;
}

export interface AdministrationRoleUpdateInput {
    name?: string;
    description?: string | null;
}

export interface AdministrationRoleStatusInput {
    status: boolean;
}

export interface AdministrationRolePermissionsInput {
    permissions: AdministrationPermissionKey[];
}

export interface AdministrationUserLocationsInput {
    plant_ids: string[];
    area_ids: string[];
}