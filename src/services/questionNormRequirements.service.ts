import { apiRequest } from "../api/client";

import type {
    ApiResponse,
    PaginatedResponse,
} from "../types/inspections";

export interface QuestionNormRequirement {
    link_id: string;
    id: string;
    code: string;
    section: string | null;
    description: string;

    norm_id: string;
    norm_code: string;
    norm_name: string;
    norm_version: string | null;
    norm_status: boolean;
}

export interface QuestionNormRequirementLink {
    link_id: string;
    question_id: string;
    norm_requirement_id: string;
}

const JSON_HEADERS = {
    "Content-Type": "application/json",
    Accept: "application/json",
};

export function getQuestionNormRequirements(
    questionId: string,
    page = 1,
    perPage = 100
): Promise<PaginatedResponse<QuestionNormRequirement>> {
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });

    return apiRequest<
        PaginatedResponse<QuestionNormRequirement>
    >(
        `/questions/${encodeURIComponent(questionId)}/norm-requirements?${params}`,
        {
            method: "GET",
        }
    );
}

export async function getAllQuestionNormRequirements(
    questionId: string
): Promise<QuestionNormRequirement[]> {
    const first = await getQuestionNormRequirements(
        questionId
    );

    const requirements = [...first.data];

    for (
        let page = 2;
        page <= first.meta.last_page;
        page++
    ) {
        const response =
            await getQuestionNormRequirements(
                questionId,
                page
            );

        requirements.push(...response.data);
    }

    return requirements;
}

export function linkQuestionNormRequirement(
    questionId: string,
    requirementId: string
): Promise<ApiResponse<QuestionNormRequirementLink>> {
    return apiRequest<
        ApiResponse<QuestionNormRequirementLink>
    >(
        `/questions/${encodeURIComponent(questionId)}/norm-requirements`,
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({
                norm_requirement_id: requirementId,
            }),
        }
    );
}

export async function unlinkQuestionNormRequirement(
    questionId: string,
    linkId: string
): Promise<void> {
    await apiRequest<void>(
        `/questions/${encodeURIComponent(questionId)}/norm-requirements/${encodeURIComponent(linkId)}`,
        {
            method: "DELETE",
            headers: JSON_HEADERS,
        }
    );
}