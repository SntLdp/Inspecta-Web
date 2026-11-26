
import { apiRequest } from "../api/client";

import type {
    ApiResponse,
    PaginatedResponse,
} from "../types/inspections";

import type {
    Norm,
    NormPayload,
    NormFilters,
    NormRequirement,
    NormRequirementPayload,
} from "../types/norms";

const JSON_HEADERS = {
    "Content-Type": "application/json",
    Accept: "application/json",
};

export function getNorms(
    filters: NormFilters = {}
): Promise<PaginatedResponse<Norm>> {
    const params = new URLSearchParams({
        page: String(filters.page ?? 1),
        per_page: String(filters.perPage ?? 100),
    });

    return apiRequest<PaginatedResponse<Norm>>(
        `/norms?${params}`,
        {
            method: "GET",
        }
    );
}

export async function getAllNorms(): Promise<Norm[]> {
    const first = await getNorms();

    const norms = [...first.data];

    for (let page = 2; page <= first.meta.last_page; page++) {
        const response = await getNorms({ page });

        norms.push(...response.data);
    }

    return norms;
}

export function getNorm(
    normId: string
): Promise<ApiResponse<Norm>> {
    return apiRequest<ApiResponse<Norm>>(
        `/norms/${encodeURIComponent(normId)}`,
        {
            method: "GET",
        }
    );
}

export function createNorm(
    payload: NormPayload
): Promise<ApiResponse<Norm>> {
    return apiRequest<ApiResponse<Norm>>(
        "/norms",
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateNorm(
    normId: string,
    payload: NormPayload
): Promise<ApiResponse<Norm>> {
    return apiRequest<ApiResponse<Norm>>(
        `/norms/${encodeURIComponent(normId)}`,
        {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateNormStatus(
    normId: string,
    status: boolean
): Promise<ApiResponse<Norm>> {
    return apiRequest<ApiResponse<Norm>>(
        `/norms/${encodeURIComponent(normId)}`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({ status }),
        }
    );
}


export function getNormRequirements(
    normId: string,
    page = 1,
    perPage = 100
): Promise<PaginatedResponse<NormRequirement>> {
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });

    return apiRequest<PaginatedResponse<NormRequirement>>(
        `/norms/${encodeURIComponent(normId)}/requirements?${params}`,
        {
            method: "GET",
        }
    );
}

export async function getAllNormRequirements(
    normId: string
): Promise<NormRequirement[]> {
    const first = await getNormRequirements(normId);

    const requirements = [...first.data];

    for (
        let page = 2;
        page <= first.meta.last_page;
        page++
    ) {
        const response = await getNormRequirements(
            normId,
            page
        );

        requirements.push(...response.data);
    }

    return requirements;
}

export function getNormRequirement(
    requirementId: string
): Promise<ApiResponse<NormRequirement>> {
    return apiRequest<ApiResponse<NormRequirement>>(
        `/requirements/${encodeURIComponent(requirementId)}`,
        {
            method: "GET",
        }
    );
}

export function createNormRequirement(
    normId: string,
    payload: NormRequirementPayload
): Promise<ApiResponse<NormRequirement>> {
    return apiRequest<ApiResponse<NormRequirement>>(
        `/norms/${encodeURIComponent(normId)}/requirements`,
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateNormRequirement(
    requirementId: string,
    payload: NormRequirementPayload
): Promise<ApiResponse<NormRequirement>> {
    return apiRequest<ApiResponse<NormRequirement>>(
        `/requirements/${encodeURIComponent(requirementId)}`,
        {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}
