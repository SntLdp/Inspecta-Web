
import { apiRequest } from "../api/client";

import type {
    ApiResponse,
    PaginatedResponse,
} from "../types/inspections";

import type {
    Checklist,
    ChecklistFilters,
    ChecklistPayload,
    ChecklistWithActiveVersion,
    ChecklistVersion,
    ChecklistSection,
    ChecklistSectionPayload,
    ChecklistQuestion,
    ChecklistQuestionPayload,
} from "../types/checklists";

const JSON_HEADERS = {
    "Content-Type": "application/json",
    Accept: "application/json",
};

// CHECKLISTS

export function getChecklists(
    filters: ChecklistFilters = {}
): Promise<PaginatedResponse<Checklist>> {
    const params = new URLSearchParams({
        page: String(filters.page ?? 1),
        per_page: String(filters.perPage ?? 100),
    });

    return apiRequest<PaginatedResponse<Checklist>>(
        `/checklists?${params.toString()}`,
        { method: "GET" }
    );
}

export async function getAllChecklists(): Promise<Checklist[]> {
    const first = await getChecklists({
        page: 1,
        perPage: 100,
    });

    const checklists = [...first.data];

    for (let page = 2; page <= first.meta.last_page; page++) {
        const response = await getChecklists({
            page,
            perPage: 100,
        });

        checklists.push(...response.data);
    }

    return checklists;
}

export function getChecklist(
    id: string
): Promise<ApiResponse<Checklist>> {
    return apiRequest<ApiResponse<Checklist>>(
        `/checklists/${encodeURIComponent(id)}`,
        { method: "GET" }
    );
}

export function createChecklist(
    payload: ChecklistPayload
): Promise<ApiResponse<Checklist>> {
    return apiRequest<ApiResponse<Checklist>>(
        "/checklists",
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateChecklist(
    id: string,
    payload: ChecklistPayload
): Promise<ApiResponse<Checklist>> {
    return apiRequest<ApiResponse<Checklist>>(
        `/checklists/${encodeURIComponent(id)}`,
        {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateChecklistStatus(
    id: string,
    status: boolean
): Promise<ApiResponse<Checklist>> {
    return apiRequest<ApiResponse<Checklist>>(
        `/checklists/${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({ status }),
        }
    );
}

export function getChecklistActiveVersion(
    id: string
): Promise<ApiResponse<ChecklistWithActiveVersion>> {
    return apiRequest<ApiResponse<ChecklistWithActiveVersion>>(
        `/checklists/${encodeURIComponent(id)}/active-version`,
        { method: "GET" }
    );
}

// VERSIONES

export function getChecklistVersions(
    checklistId: string,
    page = 1,
    perPage = 100
): Promise<PaginatedResponse<ChecklistVersion>> {
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });

    return apiRequest<PaginatedResponse<ChecklistVersion>>(
        `/checklists/${encodeURIComponent(checklistId)}/versions?${params}`,
        { method: "GET" }
    );
}

export async function getAllChecklistVersions(
    checklistId: string
): Promise<ChecklistVersion[]> {
    const first = await getChecklistVersions(checklistId);
    const versions = [...first.data];

    for (let page = 2; page <= first.meta.last_page; page++) {
        const response = await getChecklistVersions(
            checklistId,
            page
        );

        versions.push(...response.data);
    }

    return versions;
}

export function getChecklistVersion(
    checklistId: string,
    versionId: string
): Promise<ApiResponse<ChecklistVersion>> {
    return apiRequest<ApiResponse<ChecklistVersion>>(
        `/checklists/${encodeURIComponent(checklistId)}/versions/${encodeURIComponent(versionId)}`,
        { method: "GET" }
    );
}

export function createChecklistVersion(
    checklistId: string,
    version: string
): Promise<ApiResponse<ChecklistVersion>> {
    return apiRequest<ApiResponse<ChecklistVersion>>(
        `/checklists/${encodeURIComponent(checklistId)}/versions`,
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify({ version }),
        }
    );
}

export function updateChecklistVersion(
    checklistId: string,
    versionId: string,
    version: string
): Promise<ApiResponse<ChecklistVersion>> {
    return apiRequest<ApiResponse<ChecklistVersion>>(
        `/checklists/${encodeURIComponent(checklistId)}/versions/${encodeURIComponent(versionId)}`,
        {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify({ version }),
        }
    );
}

export function updateChecklistVersionStatus(
    checklistId: string,
    versionId: string,
    status: "published" | "archived"
): Promise<ApiResponse<ChecklistVersion>> {
    return apiRequest<ApiResponse<ChecklistVersion>>(
        `/checklists/${encodeURIComponent(checklistId)}/versions/${encodeURIComponent(versionId)}`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({ status }),
        }
    );
}


// SECCIONES

export function getChecklistSections(
    versionId: string,
    page = 1,
    perPage = 100
): Promise<PaginatedResponse<ChecklistSection>> {
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });

    return apiRequest<PaginatedResponse<ChecklistSection>>(
        `/versions/${encodeURIComponent(versionId)}/sections?${params}`,
        { method: "GET" }
    );
}

export async function getAllChecklistSections(
    versionId: string
): Promise<ChecklistSection[]> {
    const first = await getChecklistSections(versionId);
    const sections = [...first.data];

    for (let page = 2; page <= first.meta.last_page; page++) {
        const response = await getChecklistSections(
            versionId,
            page
        );

        sections.push(...response.data);
    }

    return sections.sort(
        (a, b) => a.display_order - b.display_order
    );
}

export function getChecklistSection(
    sectionId: string
): Promise<ApiResponse<ChecklistSection>> {
    return apiRequest<ApiResponse<ChecklistSection>>(
        `/sections/${encodeURIComponent(sectionId)}`,
        { method: "GET" }
    );
}

export function createChecklistSection(
    versionId: string,
    payload: ChecklistSectionPayload
): Promise<ApiResponse<ChecklistSection>> {
    return apiRequest<ApiResponse<ChecklistSection>>(
        `/versions/${encodeURIComponent(versionId)}/sections`,
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateChecklistSection(
    sectionId: string,
    payload: ChecklistSectionPayload
): Promise<ApiResponse<ChecklistSection>> {
    return apiRequest<ApiResponse<ChecklistSection>>(
        `/sections/${encodeURIComponent(sectionId)}`,
        {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function reorderChecklistSections(
    versionId: string,
    sectionIds: string[]
): Promise<ApiResponse<ChecklistSection[]>> {
    return apiRequest<ApiResponse<ChecklistSection[]>>(
        `/versions/${encodeURIComponent(versionId)}/sections/reorder`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({
                section_ids: sectionIds,
            }),
        }
    );
}

export function reorderChecklistQuestions(
    sectionId: string,
    questionIds: string[]
): Promise<ApiResponse<ChecklistQuestion[]>> {
    return apiRequest<ApiResponse<ChecklistQuestion[]>>(
        `/sections/${encodeURIComponent(sectionId)}/questions/reorder`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({
                question_ids: questionIds,
            }),
        }
    );
}


export function getChecklistQuestions(
    sectionId: string,
    page = 1,
    perPage = 100
): Promise<PaginatedResponse<ChecklistQuestion>> {
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });

    return apiRequest<PaginatedResponse<ChecklistQuestion>>(
        `/sections/${encodeURIComponent(sectionId)}/questions?${params}`,
        {
            method: "GET",
        }
    );
}

export async function getAllChecklistQuestions(
    sectionId: string
): Promise<ChecklistQuestion[]> {
    const first = await getChecklistQuestions(sectionId);

    const questions = [...first.data];

    for (let page = 2; page <= first.meta.last_page; page++) {
        const response = await getChecklistQuestions(
            sectionId,
            page
        );

        questions.push(...response.data);
    }

    return questions.sort(
        (a, b) => a.display_order - b.display_order
    );
}

export function getChecklistQuestion(
    questionId: string
): Promise<ApiResponse<ChecklistQuestion>> {
    return apiRequest<ApiResponse<ChecklistQuestion>>(
        `/questions/${encodeURIComponent(questionId)}`,
        {
            method: "GET",
        }
    );
}

export function createChecklistQuestion(
    sectionId: string,
    payload: ChecklistQuestionPayload
): Promise<ApiResponse<ChecklistQuestion>> {
    return apiRequest<ApiResponse<ChecklistQuestion>>(
        `/sections/${encodeURIComponent(sectionId)}/questions`,
        {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateChecklistQuestion(
    questionId: string,
    payload: ChecklistQuestionPayload
): Promise<ApiResponse<ChecklistQuestion>> {
    return apiRequest<ApiResponse<ChecklistQuestion>>(
        `/questions/${encodeURIComponent(questionId)}`,
        {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
        }
    );
}

export function updateChecklistQuestionStatus(
    questionId: string,
    status: boolean
): Promise<ApiResponse<ChecklistQuestion>> {
    return apiRequest<ApiResponse<ChecklistQuestion>>(
        `/questions/${encodeURIComponent(questionId)}`,
        {
            method: "PATCH",
            headers: JSON_HEADERS,
            body: JSON.stringify({ status }),
        }
    );
}
