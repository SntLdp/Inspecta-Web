export interface Norm {
    id: string;
    organization_id: string;
    code: string;
    name: string;
    description: string | null;
    issuing_body: string | null;
    version: string | null;
    effective_date: string | null;
    status: boolean;
    created_at: string | null;
    updated_at: string | null;
}

export interface NormPayload {
    code: string;
    name: string;
    description: string | null;
    issuing_body: string | null;
    version: string | null;
    effective_date: string | null;
}

export interface NormFilters {
    page?: number;
    perPage?: number;
}

export interface NormRequirement {
    id: string;
    organization_id: string;
    norm_id: string;
    code: string;
    section: string | null;
    description: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface NormRequirementPayload {
    code: string;
    section: string | null;
    description: string;
}