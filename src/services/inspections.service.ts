
import { apiRequest } from "../api/client";

import type {
  ApiResponse,
  InspectionBase,
  InspectionDetail,
  InspectionStatus,
  InspectionChecklist,
  InspectionAnswer,
  PaginatedResponse,
} from "../types/inspections";

export interface GetInspectionsParams {
  page?: number;
  perPage?: number;
  status?: InspectionStatus;
  plantId?: string;
  areaId?: string;
}

export function getInspections(
  filters: GetInspectionsParams = {}
): Promise<PaginatedResponse<InspectionBase>> {
  const params = new URLSearchParams();

  params.set("page", String(filters.page ?? 1));
  params.set("per_page", String(filters.perPage ?? 15));

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.plantId) {
    params.set("plant_id", filters.plantId);
  }

  if (filters.areaId) {
    params.set("area_id", filters.areaId);
  }

  return apiRequest<PaginatedResponse<InspectionBase>>(
    `/inspections?${params.toString()}`,
    { method: "GET" }
  );
}

export function getInspection(
  id: string,
  signal?: AbortSignal
): Promise<ApiResponse<InspectionDetail>> {
  return apiRequest<ApiResponse<InspectionDetail>>(
    `/inspections/${encodeURIComponent(id)}`,
    {
      method: "GET",
      signal,
    }
  );
}

export function getInspectionChecklist(
  id: string
): Promise<ApiResponse<InspectionChecklist>> {
  return apiRequest<ApiResponse<InspectionChecklist>>(
    `/inspections/${encodeURIComponent(id)}/checklist`,
    { method: "GET" }
  );
}

export function getInspectionAnswers(
  id: string,
  page = 1
): Promise<PaginatedResponse<InspectionAnswer>> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: "100",
  });

  return apiRequest<PaginatedResponse<InspectionAnswer>>(
    `/inspections/${encodeURIComponent(id)}/answers?${params.toString()}`,
    { method: "GET" }
  );
}