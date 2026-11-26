export interface ReportFilters {
  date_from: string;
  date_to: string;
  plant_id?: string;
  area_id?: string;
  production_line_id?: string;
}

export interface ReportPeriod {
  date_from: string;
  date_to: string;
}

export interface ReportLocationFilters {
  plant_id: string | null;
  area_id: string | null;
  production_line_id: string | null;
}

export interface ReportCapabilities {
  inspections: boolean;
  incidents: boolean;
  corrective_actions: boolean;
}

export interface ReportInspectionStatistics {
  total: number;
  finalized: number;
  reviewed: number;
  completion_rate: number | null;
  approval_rate: number | null;

  by_status: {
    draft: number;
    completed: number;
    confirmed: number;
    rejected: number;
  };
}

export interface ReportIncidentArea {
  area_id: string;
  area_name: string;
  count: number;
  percentage: number | null;
}

export interface ReportIncidentStatistics {
  total: number;
  critical: number;
  open: number;
  resolved: number;

  by_status: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };

  by_risk_level: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  by_area: ReportIncidentArea[];
}

export interface ReportCorrectiveActionStatistics {
  total: number;
  verified: number;
  pending: number;
  overdue: number;
  verification_rate: number | null;

  by_status: {
    pending: number;
    in_progress: number;
    completed: number;
    verified: number;
  };
}

export interface ReportSummaryResponse {
  organization_id: string;
  period: ReportPeriod;
  filters: ReportLocationFilters;
  scope: "all" | "own";
  capabilities: ReportCapabilities;
  inspections: ReportInspectionStatistics | null;
  incidents: ReportIncidentStatistics | null;
  corrective_actions: ReportCorrectiveActionStatistics | null;
}