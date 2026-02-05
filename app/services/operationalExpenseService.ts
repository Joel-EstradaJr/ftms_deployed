/**
 * Operational Trip Expense Service - Backend API Integration
 * Connects to the FTMS backend API for operational trip expense management
 */

import { api } from '../lib/api';

// ============================================================================
// INTERFACES - Backend Response Types
// ============================================================================

/**
 * Query parameters for filtering operational expenses
 */
export interface OperationalExpenseQueryParams {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
    is_reimbursable?: boolean;
    status?: string | string[];
    search?: string;
    expense_name?: string;
    body_number?: string;
    trip_type?: 'operational' | 'rental' | 'all';
    sort_by?: 'date_recorded' | 'amount' | 'status';
    sort_order?: 'asc' | 'desc';
}

/**
 * Expense list item from backend
 */
export interface ExpenseListItem {
    id: number;
    code: string;
    date_recorded: string;
    expense_name: string;
    expense_type_id: number;
    body_number: string | null;
    amount: number;
    is_reimbursable: boolean;
    payment_status: string;
    approval_status: string;
    payment_method: string | null;
    trip_type: 'operational' | 'rental' | null;
    operational_trip: {
        assignment_id: string;
        bus_trip_id: string;
        body_number: string | null;
        bus_plate_number: string | null;
        bus_route: string | null;
        bus_type: string | null;
        date_assigned: string | null;
    } | null;
    rental_trip: {
        assignment_id: string;
        body_number: string | null;
        bus_plate_number: string | null;
        rental_destination: string | null;
        bus_type: string | null;
        rental_start_date: string | null;
    } | null;
    created_by: string;
    created_at: string;
    approved_by: string | null;
    approved_at: string | null;
}

/**
 * Expense summary for dashboard/export
 */
export interface ExpenseSummary {
    pending_count: number;
    approved_count: number;
    total_approved_amount: number;
}

/**
 * Pagination info
 */
export interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

/**
 * List expenses response
 */
export interface ExpenseListResponse {
    success: boolean;
    data: {
        expenses: ExpenseListItem[];
        pagination: PaginationInfo;
        summary: ExpenseSummary;
    };
}

/**
 * Expense detail response (for view modal)
 */
export interface ExpenseDetailResponse {
    success: boolean;
    data: {
        id: number;
        code: string;
        expense_information: {
            expense_code: string;
            date_recorded: string;
            expense_name: string;
            expense_type_id: number;
            amount: number;
            payment_method: string | null;
        };
        trip_assignment_details: {
            trip_type: string | null;
            date_assigned: string | null;
            body_number: string | null;
            bus_type: string | null;
            route: string | null;
            plate_number: string | null;
        } | null;
        accounting_details: {
            account_id: number | null;
            account_code: string | null;
            account_name: string | null;
            journal_entry_id: number | null;
        } | null;
        reimbursable_details: {
            payable_id: number;
            payable_code: string;
            employee_number: string | null;
            creditor_name: string;
            due_date: string | null;
        } | null;
        additional_information: {
            remarks: string | null;
        };
        audit_trail: {
            requested_by: string;
            requested_on: string;
            approved_by: string | null;
            approved_on: string | null;
        };
        status: string;
    };
}

/**
 * Create expense DTO
 */
export interface CreateExpenseDTO {
    expense_information: {
        expense_type_id: number;
        date_recorded: string;
        amount: number;
        payment_method: 'CASH' | 'BANK_TRANSFER' | 'ONLINE';
    };
    trip_assignment?: {
        trip_type?: 'operational' | 'rental';
        operational_trip_assignment_id?: string;
        operational_trip_bus_trip_id?: string;
        rental_trip_assignment_id?: string;
    };
    accounting_details?: {
        account_id?: number;
    };
    is_reimbursable: boolean;
    reimbursable_details?: {
        employee_number: string;
        employee_name: string;
        due_date?: string;
    };
    remarks?: string;
}

/**
 * Update expense DTO
 */
export interface UpdateExpenseDTO extends Partial<CreateExpenseDTO> { }

/**
 * Reference data types
 */
export interface ExpenseType {
    id: number;
    code: string;
    name: string;
    description: string | null;
}

export interface PaymentMethod {
    value: string;
    label: string;
}

export interface ChartOfAccountItem {
    id: number;
    account_code: string;
    account_name: string;
    account_type: string;
}

export interface OperationalTripItem {
    assignment_id: string;
    bus_trip_id: string;
    body_number: string | null;
    bus_plate_number: string | null;
    bus_route: string | null;
    bus_type: string | null;
    date_assigned: string | null;
    trip_fuel_expense: number | null;
    driver_id: string | null;
    driver_name: string | null;
    conductor_id: string | null;
    conductor_name: string | null;
}

export interface RentalTripItem {
    assignment_id: string;
    body_number: string | null;
    bus_plate_number: string | null;
    rental_destination: string | null;
    bus_type: string | null;
    rental_start_date: string | null;
    rental_end_date: string | null;
    total_rental_amount: number | null;
}

export interface EmployeeItem {
    employeeNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    position: string | null;
    department: string | null;
    formatted_names: {
        full: string;
        formal: string;
    };
}

// ============================================================================
// API ENDPOINT BASE
// ============================================================================

const EXPENSE_API_BASE = '/api/v1/admin/operational-expenses';

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
 * Reimbursement details structure with driver/conductor split
 */
export interface ReimbursementEmployeeDetails {
    employee_number: string;
    employee_name: string;
    share_amount: number;
    paid_amount: number;
    balance: number;
    status: string;
    installments: Array<{
        id: number;
        installment_number: number;
        due_date: string;
        amount_due: number;
        amount_paid: number;
        balance: number;
        status: string;
        payment_date?: string;
    }>;
}

export interface ReimbursementDetailsResponse {
    expense_id: number;
    expense_code: string;
    total_amount: number;
    payment_status: string;
    date_recorded: string;
    body_number?: string;
    expense_type_name?: string;
    driver?: ReimbursementEmployeeDetails;
    conductor?: ReimbursementEmployeeDetails;
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
        reason: reason || 'Deleted by admin'
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
 * Sync ingestion result from backend
 */
export interface SyncIngestionResult {
    success: boolean;
    source: 'operational' | 'rental';
    total_fetched: number;
    new_expenses_created: number;
    expenses_updated: number;
    skipped_duplicates: number;
    errors: Array<{ id: string; error: string }>;
}

/**
 * Full sync result
 */
export interface FullSyncResult {
    operational: SyncIngestionResult;
    rental: SyncIngestionResult;
    timestamp: string;
}

/**
 * Sync status response
 */
export interface SyncStatusResult {
    expenses: {
        total: number;
        pending: number;
        approved: number;
    };
    last_sync: {
        operational: string | null;
        rental: string | null;
    };
}

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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform backend expense to frontend format for table display
 */
export function transformExpenseForTable(expense: ExpenseListItem) {
    return {
        id: String(expense.id),
        expense_type: expense.expense_name,
        date_assigned: expense.date_recorded,
        amount: expense.amount,
        description: '', // Not in list view
        category: '',
        status: expense.approval_status,
        bus_id: expense.operational_trip?.assignment_id || expense.rental_trip?.assignment_id || undefined,
        body_number: expense.body_number || expense.operational_trip?.body_number || expense.rental_trip?.body_number || undefined,
        employee_id: undefined,
        employee_name: undefined,
        receipt_number: expense.code,
        payable_id: expense.is_reimbursable ? 1 : null, // Backend returns boolean
        created_by: expense.created_by,
        approved_by: expense.approved_by || undefined,
        created_at: expense.created_at,
        approved_at: expense.approved_at || undefined,
        updated_at: expense.created_at, // Use created_at as fallback
    };
}

/**
 * Transform form data to create/update DTO
 */
export function transformFormToDTO(formData: any, isReimbursable: boolean): CreateExpenseDTO {
    return {
        expense_information: {
            expense_type_id: formData.expenseTypeId,
            date_recorded: formData.dateRecorded,
            amount: formData.amount,
            payment_method: formData.paymentMethod,
        },
        trip_assignment: formData.tripAssignmentId ? {
            trip_type: formData.tripType || 'operational',
            operational_trip_assignment_id: formData.tripType === 'operational' ? formData.tripAssignmentId : undefined,
            operational_trip_bus_trip_id: formData.tripType === 'operational' ? formData.busTripId : undefined,
            rental_trip_assignment_id: formData.tripType === 'rental' ? formData.tripAssignmentId : undefined,
        } : undefined,
        accounting_details: formData.accountId ? {
            account_id: formData.accountId,
        } : undefined,
        is_reimbursable: isReimbursable,
        reimbursable_details: isReimbursable && formData.employeeNumber ? {
            employee_number: formData.employeeNumber,
            employee_name: formData.employeeName,
            due_date: formData.dueDate,
        } : undefined,
        remarks: formData.remarks,
    };
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    fetchExpenses,
    fetchExpenseById,
    fetchReimbursementDetails,
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
    transformExpenseForTable,
    transformFormToDTO,
};
