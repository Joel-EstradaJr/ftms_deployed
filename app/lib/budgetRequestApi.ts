/**
 * Budget Request API
 * 
 * API functions for interacting with budget request management endpoints
 * Uses the base API client for consistent error handling and authentication
 */

import api, { ApiResponse } from './api';
import { BudgetRequest, BudgetItem } from '../(admin)/admin/budget-management/approval/viewBudgetRequest';

// Type for microservice budget request response
export interface MicroserviceBudgetRequest {
    id: number;
    request_code: string;
    department_id: string;
    department_name: string | null;
    requested_by: string;
    requester_position: string;
    requested_for: string | null;
    request_date: string;
    total_amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADJUSTED' | 'CLOSED';
    purpose: string | null;
    remarks: string | null;
    request_type: 'REGULAR' | 'PROJECT_BASED' | 'URGENT' | 'EMERGENCY';
    pr_reference_code: string | null;
    approved_by: string | null;
    approved_at: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
    rejection_reason: string | null;
    created_at: string;
    updated_at: string;
    aggregated_requested_amount: number;
    aggregated_approved_amount: number;
    items: Array<{
        id: number;
        description: string | null;
        requested_amount: number;
        approved_amount: number;
        notes: string | null;
        category: {
            id: number;
            code: string;
            name: string;
        } | null;
    }>;
}

/**
 * Map microservice status to frontend status
 */
function mapStatus(status: string): BudgetRequest['status'] {
    const statusMap: Record<string, BudgetRequest['status']> = {
        'PENDING': 'Pending Approval',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
        'ADJUSTED': 'Pending Approval',
        'CLOSED': 'Closed',
    };
    return statusMap[status] || 'Pending Approval';
}

/**
 * Map microservice request type to frontend type
 */
function mapRequestType(type: string): BudgetRequest['requested_type'] {
    const typeMap: Record<string, BudgetRequest['requested_type']> = {
        'REGULAR': 'Regular',
        'PROJECT_BASED': 'Project-Based',
        'URGENT': 'Urgent',
        'EMERGENCY': 'Emergency',
    };
    return typeMap[type] || 'Regular';
}

/**
 * Transform microservice response to frontend format
 */
export function transformBudgetRequest(data: MicroserviceBudgetRequest): BudgetRequest {
    // Transform items
    const items: BudgetItem[] = data.items?.map(item => ({
        item_name: item.description || 'Budget Item',
        quantity: 1,
        unit_measure: 'Lot',
        unit_cost: Number(item.requested_amount),
        supplier: '',
        subtotal: Number(item.requested_amount),
    })) || [];


    return {
        id: data.id,
        request_id: data.request_code,
        request_code: data.request_code,
        title: data.purpose?.split('\n')[0] || `Budget Request ${data.request_code}`,
        description: data.purpose || '',
        requested_amount: Number(data.aggregated_requested_amount || data.total_amount),
        approved_amount: data.aggregated_approved_amount ? Number(data.aggregated_approved_amount) : undefined,
        status: mapStatus(data.status),
        category: data.items?.[0]?.category?.name || 'General',
        requested_by: data.requested_by,
        request_date: data.request_date,
        department: data.department_name || data.department_id || 'Unknown',
        department_id: data.department_id,
        department_name: data.department_name || undefined,
        requested_type: mapRequestType(data.request_type),
        request_type: data.request_type,
        approval_date: data.approved_at || undefined,
        approved_at: data.approved_at || undefined,
        approved_by: data.approved_by || undefined,
        rejection_reason: data.rejection_reason || undefined,
        rejected_at: data.rejected_at || undefined,
        rejected_by: data.rejected_by || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
        requester_position: data.requester_position,
        requested_for: data.requested_for || undefined,
        pr_reference_code: data.pr_reference_code || undefined,
        purpose: data.purpose || undefined,
        remarks: data.remarks || undefined,
        total_amount: Number(data.total_amount),
        items: items.length > 0 ? items : undefined,
    };
}

export interface BudgetRequestFilters {
    status?: string;
    department_id?: string;
    request_type?: string;
    page?: number;
    limit?: number;
}

export interface BudgetRequestListResponse {
    success: boolean;
    data: MicroserviceBudgetRequest[];
    total?: number;
    page?: number;
    limit?: number;
}

/**
 * Fetch all budget requests with optional filters
 */
export async function fetchBudgetRequests(filters?: BudgetRequestFilters): Promise<BudgetRequest[]> {
    const apiFilters = { ...filters };

    if (apiFilters.status) {
        const upper = apiFilters.status.toUpperCase();
        apiFilters.status = upper === 'COMPLETED' ? 'CLOSED' : upper;
    }

    if (apiFilters.request_type) {
        apiFilters.request_type = apiFilters.request_type.toUpperCase();
    }

    const response = await api.get<BudgetRequestListResponse>('/finance/budget-requests', apiFilters);

    if (!response.success || !response.data) {
        throw new Error('Failed to fetch budget requests');
    }

    return response.data.map(transformBudgetRequest);
}

/**
 * Fetch a single budget request by ID
 */
export async function fetchBudgetRequestById(id: string): Promise<BudgetRequest> {
    const response = await api.get<ApiResponse<MicroserviceBudgetRequest>>(`/finance/budget-requests/${id}`);

    if (!response.success || !response.data) {
        throw new Error('Failed to fetch budget request');
    }

    return transformBudgetRequest(response.data);
}

/**
 * Approve a budget request
 */
export async function approveBudgetRequest(
    id: string | number,
    data: { approved_amount?: number; remarks?: string }
): Promise<BudgetRequest> {
    const response = await api.post<ApiResponse<MicroserviceBudgetRequest>>(
        `/finance/budget-requests/${id}/approve`,
        data
    );

    if (!response.success || !response.data) {
        throw new Error('Failed to approve budget request');
    }

    return transformBudgetRequest(response.data);
}

/**
 * Reject a budget request
 */
export async function rejectBudgetRequest(
    id: string | number,
    data: { rejection_reason: string }
): Promise<BudgetRequest> {
    const response = await api.post<ApiResponse<MicroserviceBudgetRequest>>(
        `/finance/budget-requests/${id}/reject`,
        data
    );

    if (!response.success || !response.data) {
        throw new Error('Failed to reject budget request');
    }

    return transformBudgetRequest(response.data);
}
