export type ChecklistVersionStatus =
    | "draft"
    | "published"
    | "archived";

export interface Checklist {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    status: boolean;
    created_at: string | null;
    updated_at: string | null;
}

export interface ChecklistVersion {
    id: string;
    organization_id: string;
    checklist_id: string;
    version: string;
    status: ChecklistVersionStatus;
    created_by: string;
    published_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export type QuestionAnswerType =
    | "boolean"
    | "text"
    | "number"
    | "multiple_choice"
    | "signature"
    | "date";

export interface QuestionOption {
    value: string;
    label: string;
}

export interface ChecklistQuestion {
    id: string;
    organization_id: string;
    checklist_section_id: string;
    question_text: string;
    description: string | null;
    answer_type: QuestionAnswerType;
    options: QuestionOption[] | null;
    display_order: number;
    required: boolean;
    allows_evidence: boolean;
    status: boolean;
    created_at: string | null;
    updated_at: string | null;
    norm_requirements?: ChecklistNormRequirement[];
}

export interface ChecklistQuestionPayload {
    question_text: string;
    description: string | null;
    answer_type: QuestionAnswerType;
    options: QuestionOption[] | null;
    display_order?: number;
    required: boolean;
    allows_evidence: boolean;
}

export const QUESTION_TYPE_LABELS: Record<QuestionAnswerType, string> = {
    boolean: "Sí / No",
    text: "Texto",
    number: "Numérica",
    multiple_choice: "Opción múltiple",
    signature: "Firma",
    date: "Fecha",
};

export interface ChecklistNormRequirement {
    link_id: string;
    id: string;
    code: string;
    description: string | null;
}

export interface ChecklistSection {
    id: string;
    organization_id: string;
    checklist_version_id: string;
    name: string;
    description: string | null;
    display_order: number;
    created_at?: string | null;
    updated_at?: string | null;
    questions?: ChecklistQuestion[];
}

export interface ActiveChecklistVersion {
    id: string;
    version: string;
    status: ChecklistVersionStatus;
    published_at: string | null;
    sections: ChecklistSection[];
}

export interface ChecklistWithActiveVersion extends Checklist {
    active_version: ActiveChecklistVersion;
}

export interface ChecklistPayload {
    name: string;
    description: string | null;
}

export interface ChecklistFilters {
    page?: number;
    perPage?: number;
}

export interface ChecklistSectionPayload {
    name: string;
    description: string | null;
    display_order?: number;
}