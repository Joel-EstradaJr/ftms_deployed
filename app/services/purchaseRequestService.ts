/**
 * Purchase Request Service - Backend API Integration
 * Connects to the FTMS backend API which proxies to the purchase request microservice
 */

import { api } from '../lib/api';
import { PurchaseRequestApproval } from '../types/purchaseRequestApproval';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PurchaseRequestFilters {
    status?: string | string[];
    department_id?: string;
    request_type?: string | string[];
    page?: number;
    limit?: number;
}

export interface PurchaseRequestResponse {
    success: boolean;
    data?: PurchaseRequestApproval[];
    total?: number;
    page?: number;
    limit?: number;
    message?: string;
}

export interface SinglePurchaseRequestResponse {
    success: boolean;
    data?: any;
    message?: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch purchase requests with optional filters
 */
// Hardcoded external API URL as requested by user
const PURCHASE_API_BASE_URL = 'https://purchase-request-production-17a6.up.railway.app/api/v1/finance';

/**
 * Fetch purchase requests with optional filters
 */
export async function fetchPurchaseRequests(filters?: PurchaseRequestFilters): Promise<PurchaseRequestResponse> {
    const params: Record<string, any> = {};
    if (filters?.status && filters.status.length > 0) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        if (statuses.length > 0) {
            params.status = statuses.map(s => {
                const upper = s.toUpperCase();
                return upper === 'COMPLETED' ? 'CLOSED' : upper;
            });
        }
    }
    if (filters?.request_type && filters.request_type.length > 0) {
        const types = Array.isArray(filters.request_type) ? filters.request_type : [filters.request_type];
        if (types.length > 0) {
            params.request_type = types.map(t => t.toUpperCase());
        }
    }
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    // Use fetch directly to bypass local API proxy
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
                // Backend requires bracket notation for arrays (e.g., status[]=PENDING&status[]=APPROVED)
                value.forEach(val => queryParams.append(`${key}[]`, String(val)));
            } else {
                queryParams.append(key, String(value));
            }
        }
    });

    const url = `${PURCHASE_API_BASE_URL}/purchase-requests${queryParams.toString() ? `?${queryParams}` : ''}`;

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization if needed, but keeping it simple as per request
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `Request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch purchase requests');
    }
}

/**
 * Fetch a single purchase request by ID
 */
export async function fetchPurchaseRequestById(id: string): Promise<SinglePurchaseRequestResponse> {
    const url = `${PURCHASE_API_BASE_URL}/purchase-requests/${id}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            // Allow not found to be handled by caller if needed
            if (response.status === 404) {
                // Return empty success false if acceptable, or throw specific error
            }
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `Request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch purchase request details');
    }
}

/**
 * Update purchase request (status, remarks)
 */
export async function updatePurchaseRequest(
    id: string,
    data: { status?: string; finance_remarks?: string }
): Promise<SinglePurchaseRequestResponse> {
    const url = `${PURCHASE_API_BASE_URL}/purchase-requests/${id}`;

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `Request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to update purchase request');
    }
}

/**
 * Update purchase request item
 */
export async function updatePurchaseRequestItem(
    id: string,
    data: { status?: string; quantity?: number; adjustmentReason?: string }
): Promise<SinglePurchaseRequestResponse> {
    const url = `${PURCHASE_API_BASE_URL}/purchase-request-items/${id}`; // Note: Check if endpoint matches /items/ or /purchase-request-items/

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `Request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to update purchase request item');
    }
}

/**
 * Bulk update purchase request items
 */
export async function bulkUpdatePurchaseRequestItems(
    items: Array<{ id: number; status: string; quantity?: number; adjustmentReason?: string }>
): Promise<SinglePurchaseRequestResponse> {
    const url = `${PURCHASE_API_BASE_URL}/purchase-request-items/bulk`;

    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(error.message || `Request failed: ${response.status}`);
        }

        return await response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Failed to bulk update items');
    }
}
