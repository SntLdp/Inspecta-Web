import { apiRequest } from "../api/client";

export interface ModuleCapabilities {
  dashboard: boolean;
  inspections: boolean;
  incidents: boolean;
  corrective_actions: boolean;
  checklists: boolean;
  norms: boolean;
  reports: boolean;
  administration: boolean;
}

export interface CorrectiveActionCapabilities {
  view: boolean;
  create: boolean;
  update: boolean;
  record_update: boolean;
  verify: boolean;
}

export interface AdministrationCapabilities {
  manage_users: boolean;
  manage_memberships: boolean;
  manage_roles: boolean;
  view_locations: boolean;
  manage_locations: boolean;
  view_all_locations: boolean;
  create_users: boolean;
  assign_roles: boolean;
  assign_locations: boolean;
}

export interface OrganizationCapabilities {
  organization_id: string;
  roles: string[];
  modules: ModuleCapabilities;
  corrective_actions: CorrectiveActionCapabilities;
  administration: AdministrationCapabilities;
}

export type ModuleKey = keyof ModuleCapabilities;

export async function getCapabilities(
  signal?: AbortSignal
): Promise<OrganizationCapabilities> {
  return apiRequest<OrganizationCapabilities>(
    "/auth/capabilities",
    {
      method: "GET",
      signal,
    }
  );
}