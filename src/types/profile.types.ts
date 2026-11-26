export type ProfilePermission =
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

/* =====================================================
   IDENTIDAD GLOBAL
   ===================================================== */

export interface ProfileIdentity {
  id: string;
  name: string;
  email: string;
  organization_id: string | null;
}

/* =====================================================
   ACTUALIZACIÓN DE INFORMACIÓN PERSONAL
   ===================================================== */

export type ProfileUpdateInput =
  | {
      name: string;
      email?: string;
      current_password?: string;
    }
  | {
      name?: string;
      email: string;
      current_password?: string;
    };

export interface ProfileUpdateResponse {
  message: string;
  data: ProfileIdentity;
}

/* =====================================================
   CAMBIO DE CONTRASEÑA
   ===================================================== */

export interface ProfilePasswordInput {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface ProfilePasswordResponse {
  message: string;
}

/* =====================================================
   ORGANIZACIÓN Y MEMBRESÍA
   ===================================================== */

export interface ProfileOrganization {
  id: string;
  name: string;
  code: string;
  type: "client";
  status: true;
}

export interface ProfileMembershipDetails {
  id: string;
  status: "active";
  revoked_at: string | null;
}

/* =====================================================
   ROLES
   ===================================================== */

export interface ProfileRole {
  id: string;
  name: string;
  status: boolean;
}

/* =====================================================
   UBICACIONES
   ===================================================== */

export interface ProfilePlant {
  id: string;
  name: string;
  code: string;
  status: boolean;
  available: boolean;
}

export interface ProfileArea {
  id: string;
  plant_id: string;
  plant_name: string;
  name: string;
  code: string;
  status: boolean;
  available: boolean;
}

export interface ProfileLocations {
  can_view: boolean;
  view_all: boolean;
  plants: ProfilePlant[];
  areas: ProfileArea[];
}

/* =====================================================
   RESPUESTA DE MEMBRESÍA
   ===================================================== */

export interface ProfileMembership {
  organization: ProfileOrganization;
  membership: ProfileMembershipDetails;
  roles: ProfileRole[];
  permissions: ProfilePermission[];
  locations: ProfileLocations;
}

export interface ProfileMembershipResponse {
  data: ProfileMembership;
}

/* =====================================================
   ERRORES DE VALIDACIÓN
   ===================================================== */

export interface ProfileValidationErrors {
  name?: string[];
  email?: string[];
  current_password?: string[];
  password?: string[];
  password_confirmation?: string[];
}

export interface ProfileValidationErrorResponse {
  message: string;
  code?: string;
  errors?: ProfileValidationErrors;
}