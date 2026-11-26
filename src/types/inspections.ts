export type InspectionStatus =
  | "draft"
  | "completed"
  | "confirmed"
  | "rejected";

export interface InspectionBase {
  id: string;
  organization_id: string;
  user_id: string;
  inspector_name: string | null;
  supervisor_id: string | null;

  checklist_version_id: string;
  checklist_name: string | null;
  checklist_version: string | null;

  plant_id: string;
  plant_name: string | null;

  area_id: string;
  area_name: string | null;

  production_line_id: string | null;
  production_line_name: string | null;

  progress: number | null;
  answered_questions: number;
  required_questions: number;

  observations?: string | null;
  status: InspectionStatus;
  started_at: string | null;
  completed_at: string | null;
  supervisor_confirmed_at?: string | null;
  rejected_at?: string | null;
  location_description?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InspectionDetail extends InspectionBase {
  supervisor_observations?: string | null;
  answers?: Array<{
    id: string;
    question_id: string;
    answer: string | null;
    observation: string | null;
  }>;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
}

export interface InspectionQuestion {
  id: string;
  question_text: string;
  description: string | null;
  answer_type: string;
  options: Array<{ value: string; label?: string }> | null;
  required: boolean;
  allows_evidence: boolean;
  display_order: number;
  supported: boolean;
}

export interface InspectionSection {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  questions: InspectionQuestion[];
}

export interface InspectionChecklist {
  inspection_id: string;
  checklist: {
    id: string;
    name: string | null;
    status: boolean | null;
  };
  checklist_version: {
    id: string;
    version: string;
    status: string;
    published_at: string | null;
  };
  sections: InspectionSection[];
}

export interface InspectionAnswer {
  id: string;
  inspection_id: string;
  question_id: string;
  answer: string | null;
  observation: string | null;
}