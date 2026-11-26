import { apiRequest } from "../api/client";

export type DashboardGranularity =
  | "weekly"
  | "monthly"
  | "yearly";

export type DashboardRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type DashboardInspectionStatus =
  | "draft"
  | "completed"
  | "confirmed"
  | "rejected";

export type DashboardActionStatus =
  | "pending"
  | "in_progress";

export interface DashboardPeriod {
  month: string;
  granularity: DashboardGranularity;
  date_from: string;
  date_to: string;
  previous_date_from: string;
  previous_date_to: string;
}

export interface DashboardCapabilities {
  inspections: boolean;
  incidents: boolean;
  corrective_actions: boolean;
  create_inspection: boolean;
}

export interface DashboardApprovalRate {
  value: number | null;
  previous_value: number | null;
  change: number | null;
  approved: number;
  rejected: number;
  reviewed: number;
}

export interface DashboardInspectionCount {
  value: number;
  previous_value: number;
  change: number;
}

export interface DashboardOpenIncidents {
  value: number;
  critical: number;
}

export interface DashboardPendingActionCount {
  value: number;
  overdue: number;
}

export interface DashboardSummary {
  approval_rate?: DashboardApprovalRate;
  inspections?: DashboardInspectionCount;
  open_incidents?: DashboardOpenIncidents;
  pending_corrective_actions?: DashboardPendingActionCount;
}

export interface DashboardApprovalTrendPoint {
  month: string;
  period: string;
  date_from: string;
  date_to: string;
  value: number | null;
  approved: number;
  rejected: number;
  reviewed: number;
}

export interface DashboardRiskCount {
  risk_level: DashboardRiskLevel;
  value: number;
}

export interface DashboardCharts {
  approval_trend?: DashboardApprovalTrendPoint[];
  incidents_by_risk?: DashboardRiskCount[];
}

export interface DashboardRecentInspection {
  id: string;
  checklist_version_id: string;
  checklist_name: string | null;
  checklist_version: string | null;
  plant_name: string | null;
  area_name: string | null;
  production_line_name: string | null;
  started_at: string | null;
  status: DashboardInspectionStatus;
  progress: number | null;
  answered_questions: number;
  required_questions: number;
}

export interface DashboardPendingAction {
  id: string;
  incident_id: string;
  description: string;
  priority: DashboardRiskLevel;
  status: DashboardActionStatus;
  due_date: string | null;
  overdue: boolean;
  plant_name: string | null;
  area_name: string | null;
  production_line_name: string | null;
}

export interface DashboardResponse {
  organization_id: string;
  period: DashboardPeriod;
  capabilities: DashboardCapabilities;
  summary: DashboardSummary;
  charts: DashboardCharts;
  recent_inspections: DashboardRecentInspection[];
  pending_corrective_actions: DashboardPendingAction[];
}

export async function getDashboard(
  month?: string,
  signal?: AbortSignal,
  granularity: DashboardGranularity = "monthly"
): Promise<DashboardResponse> {
  const params = new URLSearchParams();

  if (month) {
    params.set("month", month);
  }

  params.set("granularity", granularity);

  return apiRequest<DashboardResponse>(
    `/dashboard?${params.toString()}`,
    {
      method: "GET",
      signal,
    }
  );
}