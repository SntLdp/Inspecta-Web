import { apiRequest } from "../api/client";
import type { ApiResponse, PaginatedResponse } from "../types/inspections";

export type CorrectiveActionStatus = "pending" | "in_progress" | "completed" | "verified";
export type CorrectiveActionPriority = "low" | "medium" | "high" | "critical";

export interface CorrectiveAction {
    id: string;
    organization_id: string;
    incident_id: string;
    assigned_to: string;
    assignee_name?: string | null;
    description: string;
    priority: CorrectiveActionPriority;
    due_date: string | null;
    status: CorrectiveActionStatus;
    observations: string | null;
    completed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CorrectiveActionUpdate {
    id: string;
    corrective_action_id: string;
    user_id: string;
    user_name?: string | null;
    status: CorrectiveActionStatus;
    comment: string | null;
    created_at: string | null;
}

export interface CorrectiveActionDetail extends CorrectiveAction {
    updates: CorrectiveActionUpdate[];
}

export interface CorrectiveActionFilters {
    page?: number;
    perPage?: number;
    assignedTo?: string;
    incidentId?: string;
    status?: CorrectiveActionStatus;
}

export function getCorrectiveActions(filters: CorrectiveActionFilters = {}): Promise<PaginatedResponse<CorrectiveAction>> {
    const params = new URLSearchParams({ page: String(filters.page ?? 1), per_page: String(filters.perPage ?? 100) });
    if (filters.assignedTo) params.set("assigned_to", filters.assignedTo);
    if (filters.incidentId) params.set("incident_id", filters.incidentId);
    if (filters.status) params.set("status", filters.status);
    return apiRequest<PaginatedResponse<CorrectiveAction>>(`/corrective-actions?${params}`, { method: "GET" });
}

export function getCorrectiveAction(id: string): Promise<ApiResponse<CorrectiveActionDetail>> {
    return apiRequest<ApiResponse<CorrectiveActionDetail>>(`/corrective-actions/${encodeURIComponent(id)}`, { method: "GET" });
}

export function getCorrectiveActionUpdates(id: string, page = 1): Promise<PaginatedResponse<CorrectiveActionUpdate>> {
    return apiRequest<PaginatedResponse<CorrectiveActionUpdate>>(`/corrective-actions/${encodeURIComponent(id)}/updates?page=${page}&per_page=100`, { method: "GET" });
}

export function recordCorrectiveActionUpdate(id: string, status: Exclude<CorrectiveActionStatus, "pending">, comment: string | null): Promise<ApiResponse<CorrectiveActionUpdate>> {
    return apiRequest<ApiResponse<CorrectiveActionUpdate>>(`/corrective-actions/${encodeURIComponent(id)}/updates`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                status,
                comment,
            }),
        }
    );
}

export async function getCorrectiveActionsByIncident(
    incidentId: string
): Promise<CorrectiveAction[]> {
    const first = await getCorrectiveActions({
        incidentId,
        page: 1,
        perPage: 100,
    });

    const actions = [...first.data];

    for (let page = 2; page <= first.meta.last_page; page++) {
        const next = await getCorrectiveActions({
            incidentId,
            page,
            perPage: 100,
        });

        actions.push(...next.data);
    }

    return actions;
}
