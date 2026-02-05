/**
 * Staff Operational Trip Expense Service - Backend API Integration
 * Connects to the FTMS backend API for staff operational trip expense management
 * 
 * This is the STAFF version - uses /api/v1/staff/operational-expenses endpoints
 */

import { api } from '../lib/api';

// ============================================================================
// INTERFACES - Backend Response Types (re-exported from main service)
// ============================================================================

// Re-export types with 'export type' for isolatedModules compatibility
export type {
    OperationalExpenseQueryParams,
    ExpenseListItem,
    ExpenseSummary,
    PaginationInfo,
    ExpenseListResponse,
    ExpenseDetailResponse,
    CreateExpenseDTO,
    UpdateExpenseDTO,
    ExpenseType,
    PaymentMethod,
    ChartOfAccountItem,
    OperationalTripItem,
    RentalTripItem,
    EmployeeItem,
    ReimbursementEmployeeDetails,
    ReimbursementDetailsResponse,
    SyncIngestionResult,
    FullSyncResult,
    SyncStatusResult,
} from './operationalExpenseService';

// Re-export functions
export {
    transformExpenseForTable,
    transformFormToDTO,
} from './operationalExpenseService';

import type {
    OperationalExpenseQueryParams,
    ExpenseListItem,
    ExpenseSummary,
    PaginationInfo,
    ExpenseListResponse,
    ExpenseDetailResponse,
    CreateExpenseDTO,
    UpdateExpenseDTO,
    ExpenseType,
    PaymentMethod,
    ChartOfAccountItem,
    OperationalTripItem,
    RentalTripItem,
    EmployeeItem,
    ReimbursementDetailsResponse,
    FullSyncResult,
    SyncIngestionResult,
    SyncStatusResult,
} from './operationalExpenseService';

// ============================================================================
// API ENDPOINT BASE - STAFF VERSION
// ============================================================================

const EXPENSE_API_BASE = '/api/v1/staff/operational-expenses';

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch list of operational expenses with filters and pagination
 */
export async function fetchExpenses(
    params?: OperationalExpenseQueryParams
): Promise<{
    expenses: ExpenseListItem[];
    pagination: PaginationInfo;
    summary: ExpenseSummary;
}> {
    const queryParams: Record<string, any> = {
        page: params?.page || 1,
        limit: params?.limit || 10,
    };

    // Add optional filters
    if (params?.date_from) queryParams.date_from = params.date_from;
    if (params?.date_to) queryParams.date_to = params.date_to;
    if (params?.amount_min !== undefined) queryParams.amount_min = params.amount_min;
    if (params?.amount_max !== undefined) queryParams.amount_max = params.amount_max;
    if (params?.is_reimbursable !== undefined) queryParams.is_reimbursable = params.is_reimbursable;
    if (params?.search) queryParams.search = params.search;
    if (params?.expense_name) queryParams.expense_name = params.expense_name;
    if (params?.body_number) queryParams.body_number = params.body_number;
    if (params?.trip_type) queryParams.trip_type = params.trip_type;
    if (params?.sort_by) queryParams.sort_by = params.sort_by;
    if (params?.sort_order) queryParams.sort_order = params.sort_order;

    // Handle status (can be array)
    if (params?.status) {
        if (Array.isArray(params.status)) {
            queryParams.status = params.status.join(',');
        } else {
            queryParams.status = params.status;
        }
    }

    const response = await api.get<ExpenseListResponse>(EXPENSE_API_BASE, queryParams);

    if (!response.success) {
        throw new Error('Failed to fetch expenses');
    }

    return {
        expenses: response.data.expenses,
        pagination: response.data.pagination,
        summary: response.data.summary,
    };
}

/**
 * Fetch a single expense by ID
 */
export async function fetchExpenseById(id: number): Promise<ExpenseDetailResponse['data'] | null> {
    try {
        const response = await api.get<ExpenseDetailResponse>(`${EXPENSE_API_BASE}/${id}`);

        if (!response.success || !response.data) {
            return null;
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching expense by ID:', error);
        return null;
    }
}

/**
 * Create a new expense
 */
export async function createExpense(data: CreateExpenseDTO): Promise<{ id: number; code: string }> {
    const response = await api.post<{
        success: boolean;
        message: string;
        data: { id: number; code: string; payable_id?: number; payable_code?: string };
    }>(EXPENSE_API_BASE, data);

    if (!response.success) {
        throw new Error(response.message || 'Failed to create expense');
    }

    return response.data;
}

/**
 * Fetch reimbursement details for an expense with driver/conductor split
 */
export async function fetchReimbursementDetails(id: number): Promise<ReimbursementDetailsResponse | null> {
    try {
        const response = await api.get<{
            success: boolean;
            data: ReimbursementDetailsResponse;
        }>(`${EXPENSE_API_BASE}/${id}/reimbursement`);

        if (!response.success || !response.data) {
            console.error('fetchReimbursementDetails: No data returned for expense', id);
            return null;
        }

        console.log('fetchReimbursementDetails: Received data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching reimbursement details:', error);
        return null;
    }
}

/**
 * Update an existing expense (PATCH)
 */
export async function updateExpense(id: number, data: UpdateExpenseDTO): Promise<{ id: number; code: string }> {
    const response = await api.patch<{
        success: boolean;
        message: string;
        data: { id: number; code: string };
    }>(`${EXPENSE_API_BASE}/${id}`, data);

    if (!response.success) {
        throw new Error(response.message || 'Failed to update expense');
    }

    return response.data;
}

/**
 * Soft delete an expense
 * @param id - Expense ID
 * @param reason - Reason for deletion (required by backend)
 */
export async function softDeleteExpense(id: number, reason?: string): Promise<void> {
    const response = await api.patch<{
        success: boolean;
        message: string;
    }>(`${EXPENSE_API_BASE}/${id}/soft-delete`, {
        reason: reason || 'Deleted by staff'
    });

    if (!response.success) {
        throw new Error(response.message || 'Failed to delete expense');
    }
}

/**
 * Hard delete an expense (permanent)
 */
export async function hardDeleteExpense(id: number): Promise<void> {
    const response = await api.delete<{
        success: boolean;
        message: string;
    }>(`${EXPENSE_API_BASE}/${id}`);

    if (!response.success) {
        throw new Error(response.message || 'Failed to permanently delete expense');
    }
}

/**
 * Approve an expense
 */
export async function approveExpense(id: number, remarks?: string): Promise<{
    id: number;
    code: string;
    status: string;
    journal_entry_id: number;
}> {
    const response = await api.post<{
        success: boolean;
        message: string;
        data: { id: number; code: string; status: string; journal_entry_id: number };
    }>(`${EXPENSE_API_BASE}/${id}/approve`, { remarks });

    if (!response.success) {
        throw new Error(response.message || 'Failed to approve expense');
    }

    return response.data;
}

/**
 * Reject an expense
 */
export async function rejectExpense(id: number, reason: string): Promise<{
    id: number;
    code: string;
    status: string;
}> {
    const response = await api.post<{
        success: boolean;
        message: string;
        data: { id: number; code: string; status: string };
    }>(`${EXPENSE_API_BASE}/${id}/reject`, { reason });

    if (!response.success) {
        throw new Error(response.message || 'Failed to reject expense');
    }

    return response.data;
}

/**
 * Export expenses with summary
 */
export async function exportExpenses(params?: OperationalExpenseQueryParams): Promise<{
    expenses: ExpenseListItem[];
    summary: ExpenseSummary & { date_from?: string; date_to?: string };
}> {
    const queryParams: Record<string, any> = {};

    if (params?.date_from) queryParams.date_from = params.date_from;
    if (params?.date_to) queryParams.date_to = params.date_to;
    if (params?.status) {
        queryParams.status = Array.isArray(params.status) ? params.status.join(',') : params.status;
    }
    if (params?.is_reimbursable !== undefined) queryParams.is_reimbursable = params.is_reimbursable;
    if (params?.search) queryParams.search = params.search;

    const response = await api.get<{
        success: boolean;
        data: {
            expenses: ExpenseListItem[];
            summary: ExpenseSummary & { date_from?: string; date_to?: string };
        };
    }>(`${EXPENSE_API_BASE}/export`, queryParams);

    if (!response.success) {
        throw new Error('Failed to export expenses');
    }

    return response.data;
}

// ============================================================================
// SYNC API FUNCTIONS - Fetch expenses from external BOMS system
// ============================================================================

/**
 * Sync expenses from external BOMS APIs
 * @param source - Optional: 'operational' | 'rental' to sync specific source, or omit for full sync
 */
export async function syncExpenses(source?: 'operational' | 'rental'): Promise<FullSyncResult> {
    // Build URL with query params
    let url = `${EXPENSE_API_BASE}/sync`;
    if (source) {
        url += `?source=${source}`;
    }

    const response = await api.post<{
        success: boolean;
        message: string;
        data: FullSyncResult | SyncIngestionResult;
    }>(url, {});

    if (!response.success) {
        throw new Error(response.message || 'Failed to sync expenses');
    }

    // If single source sync, wrap in full sync format
    if (source) {
        const singleResult = response.data as SyncIngestionResult;
        return {
            operational: source === 'operational' ? singleResult : {
                success: true,
                source: 'operational',
                total_fetched: 0,
                new_expenses_created: 0,
                expenses_updated: 0,
                skipped_duplicates: 0,
                errors: [],
            },
            rental: source === 'rental' ? singleResult : {
                success: true,
                source: 'rental',
                total_fetched: 0,
                new_expenses_created: 0,
                expenses_updated: 0,
                skipped_duplicates: 0,
                errors: [],
            },
            timestamp: new Date().toISOString(),
        };
    }

    return response.data as FullSyncResult;
}

/**
 * Get sync status and statistics
 */
export async function getSyncStatus(): Promise<SyncStatusResult> {
    const response = await api.get<{
        success: boolean;
        data: SyncStatusResult;
    }>(`${EXPENSE_API_BASE}/sync-status`);

    if (!response.success) {
        throw new Error('Failed to get sync status');
    }

    return response.data;
}

// ============================================================================
// REFERENCE DATA API FUNCTIONS
// ============================================================================

/**
 * Fetch expense types for dropdown
 */
export async function fetchExpenseTypes(): Promise<ExpenseType[]> {
    try {
        const response = await api.get<{
            success: boolean;
            data: ExpenseType[];
        }>(`${EXPENSE_API_BASE}/expense-types`);

        if (!response.success) {
            throw new Error('Failed to fetch expense types');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching expense types:', error);
        return [];
    }
}

/**
 * Fetch payment methods for dropdown
 */
export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
    try {
        const response = await api.get<{
            success: boolean;
            data: PaymentMethod[];
        }>(`${EXPENSE_API_BASE}/payment-methods`);

        if (!response.success) {
            throw new Error('Failed to fetch payment methods');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        // Fallback
        return [
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
            { value: 'ONLINE', label: 'Online Payment' },
        ];
    }
}

/**
 * Fetch chart of accounts for dropdown
 */
export async function fetchChartOfAccounts(): Promise<ChartOfAccountItem[]> {
    try {
        const response = await api.get<{
            success: boolean;
            data: ChartOfAccountItem[];
        }>(`${EXPENSE_API_BASE}/chart-of-accounts`);

        if (!response.success) {
            throw new Error('Failed to fetch chart of accounts');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching chart of accounts:', error);
        return [];
    }
}

/**
 * Fetch operational trips for trip selector
 */
export async function fetchOperationalTrips(): Promise<OperationalTripItem[]> {
    try {
        const response = await api.get<{
            success: boolean;
            data: OperationalTripItem[];
        }>(`${EXPENSE_API_BASE}/operational-trips`);

        if (!response.success) {
            throw new Error('Failed to fetch operational trips');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching operational trips:', error);
        return [];
    }
}

/**
 * Fetch rental trips for trip selector
 */
export async function fetchRentalTrips(): Promise<RentalTripItem[]> {
    try {
        const response = await api.get<{
            success: boolean;
            data: RentalTripItem[];
        }>(`${EXPENSE_API_BASE}/rental-trips`);

        if (!response.success) {
            throw new Error('Failed to fetch rental trips');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching rental trips:', error);
        return [];
    }
}

/**
 * Fetch employees from HR API proxy
 */
export async function fetchEmployees(search?: string): Promise<EmployeeItem[]> {
    try {
        const params: Record<string, string> = {};
        if (search) params.search = search;

        const response = await api.get<{
            success: boolean;
            data: EmployeeItem[];
        }>(`${EXPENSE_API_BASE}/employees`, params);

        if (!response.success) {
            throw new Error('Failed to fetch employees');
        }

        return response.data;
    } catch (error) {
        console.error('Error fetching employees:', error);
        return [];
    }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    fetchExpenses,
    fetchExpenseById,
    fetchReimbursementDetails,
    createExpense,
    updateExpense,
    softDeleteExpense,
    hardDeleteExpense,
    approveExpense,
    rejectExpense,
    exportExpenses,
    syncExpenses,
    getSyncStatus,
    fetchExpenseTypes,
    fetchPaymentMethods,
    fetchChartOfAccounts,
    fetchOperationalTrips,
    fetchRentalTrips,
    fetchEmployees,
};
