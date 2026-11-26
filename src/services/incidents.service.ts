import { apiRequest } from "../api/client";
import type { ApiResponse, PaginatedResponse } from "../types/inspections";

export type IncidentStatus = "open" | "in_progress" | "resolved" | "closed";
export type IncidentRiskLevel = "low" | "medium" | "high" | "critical";
export type IncidentType = "unsafe_condition" | "unsafe_act" | "near_miss" | "environmental_spill" | "equipment_damage";

export interface Incident {
  id: string;
  organization_id?: string;
  inspection_id: string | null;
  question_id?: string | null;
  reported_by: string;
  reporter_name?: string | null;
  plant_id: string;
  area_id: string;
  production_line_id: string | null;
  type: IncidentType | null;
  title: string;
  description: string;
  risk_level: IncidentRiskLevel;
  status: IncidentStatus;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location_description?: string | null;
  reported_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface GetIncidentsParams {
  page?: number;
  perPage?: number;
  status?: IncidentStatus;
  riskLevel?: IncidentRiskLevel;
  plantId?: string;
  areaId?: string;
  reportedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function getIncidents(filters: GetIncidentsParams = {}): Promise<PaginatedResponse<Incident>> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 1));
  params.set("per_page", String(filters.perPage ?? 15));
  if (filters.status) params.set("status", filters.status);
  if (filters.riskLevel) params.set("risk_level", filters.riskLevel);
  if (filters.plantId) params.set("plant_id", filters.plantId);
  if (filters.areaId) params.set("area_id", filters.areaId);
  if (filters.reportedBy) params.set("reported_by", filters.reportedBy);
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
  return apiRequest<PaginatedResponse<Incident>>(`/incidents?${params.toString()}`);
}

export function getIncident(id: string): Promise<ApiResponse<Incident>> {
  return apiRequest<ApiResponse<Incident>>(`/incidents/${encodeURIComponent(id)}`);
}

export async function getAllVisibleIncidents(): Promise<Incident[]> {
  const first = await getIncidents({ page: 1, perPage: 100 });
  const incidents = [...first.data];
  for (let page = 2; page <= first.meta.last_page; page++) {
    const next = await getIncidents({ page, perPage: 100 });
    incidents.push(...next.data);
  }
  return incidents;
}
