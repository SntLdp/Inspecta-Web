import {
  apiRequest,
  clearOrganizationId,
  getOrganizationId,
  setOrganizationId,
} from "../api/client";

export interface Organization {
  id: string;
  name: string;
  code: string;
  type: "client";
  status: boolean;
  membership_id: string;
  membership_status: string;
}

interface OrganizationsResponse {
  message?: string;
  data: Organization[];
}

export async function getOrganizations(
  signal?: AbortSignal
): Promise<Organization[]> {
  const response = await apiRequest<OrganizationsResponse>(
    "/auth/organizations",
    {
      method: "GET",
      signal,
    }
  );

  if (!Array.isArray(response.data)) {
    throw new Error(
      "La API no devolvió una lista válida de organizaciones."
    );
  }

  return response.data;
}

export function selectOrganization(
  organization: Organization
): void {
  setOrganizationId(organization.id);
}

export function getSelectedOrganizationId(): string | null {
  return getOrganizationId();
}

export function unselectOrganization(): void {
  clearOrganizationId();
}