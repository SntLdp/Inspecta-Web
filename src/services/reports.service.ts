import { apiRequest } from "../api/client";

import type {
  ReportFilters,
  ReportSummaryResponse,
} from "../types/reports";

export function getReportSummary(
  filters: ReportFilters,
  signal?: AbortSignal
): Promise<ReportSummaryResponse> {
  const params = new URLSearchParams({
    date_from: filters.date_from,
    date_to: filters.date_to,
  });

  if (filters.plant_id) {
    params.set("plant_id", filters.plant_id);
  }

  if (filters.area_id) {
    params.set("area_id", filters.area_id);
  }

  if (filters.production_line_id) {
    params.set(
      "production_line_id",
      filters.production_line_id
    );
  }

  return apiRequest<ReportSummaryResponse>(
    `/reports/summary?${params.toString()}`,
    {
      method: "GET",
      signal,
    }
  );
}