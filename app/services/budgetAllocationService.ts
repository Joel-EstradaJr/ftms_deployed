/**
 * Budget Allocation Service - Backend API Integration
 * Connects to the FTMS backend API for budget allocation management
 */

import { api } from '../lib/api';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Department budget information from backend
 */
export interface DepartmentBudget {
    department_id: string;
    department_name: string;
    allocated_budget: number;
    used_budget: number;
    remaining_budget: number;
    last_update_date: string;
    budget_period: string;
    status: 'Active' | 'Exceeded';
}

/**
 * Data for allocating budget to a department
 */
export interface BudgetAllocationData {
    allocation_id?: string;
    department_id: string;
    department_name?: string;
    amount: number;
    allocated_date?: string;
    allocated_by?: string;
    period: string;
    notes: string;
}

/**
 * Data for deducting budget from a department
 */
export interface BudgetDeductionData {
    deduction_id?: string;
    department_id: string;
    department_name?: string;
    amount: number;
    deducted_date?: string;
    deducted_by?: string;
    period: string;
    notes: string;
}

/**
 * Allocation history entry
 */
export interface AllocationHistory {
    allocation_id: string;
    department_id: string;
    type: 'Allocation' | 'Deduction';
    amount: number;
    date: string;
    allocated_by: string;
    notes: string;
    created_at: string;
    updated_at?: string;
}

/**
 * Pagination response
 */
export interface PaginationResponse {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/**
 * Allocation result from backend
 */
export interface AllocationResult {
    allocation_id: number;
    new_allocated_budget: number;
    new_remaining_budget: number;
}

// ============================================================================
// Backend Response Types
// ============================================================================

interface DepartmentBudgetsResponse {
    success: boolean;
    data: DepartmentBudget[];
    period: string;
}

interface AllocationResponse {
    success: boolean;
    message: string;
    data: AllocationResult;
}

interface AllocationHistoryResponse {
    success: boolean;
    data: AllocationHistory[];
    pagination: PaginationResponse;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch all department budgets for a specific period
 * @param period - Budget period in YYYY-MM format
 */
export async function fetchDepartmentBudgets(period: string): Promise<DepartmentBudget[]> {
    const response = await api.get<DepartmentBudgetsResponse>(
        '/api/v1/admin/budget-allocation',
        { period }
    );

    if (!response.success) {
        throw new Error('Failed to fetch department budgets');
    }

    return response.data;
}

/**
 * Allocate budget to a department
 * @param data - Allocation data including department_id, amount, period, notes
 */
export async function allocateBudget(data: BudgetAllocationData): Promise<AllocationResult> {
    const response = await api.post<AllocationResponse>(
        '/api/v1/admin/budget-allocation/allocate',
        {
            department_id: data.department_id,
            amount: data.amount,
            period: data.period,
            notes: data.notes,
        }
    );

    if (!response.success) {
        throw new Error(response.message || 'Failed to allocate budget');
    }

    return response.data;
}

/**
 * Deduct budget from a department
 * @param data - Deduction data including department_id, amount, period, notes
 */
export async function deductBudget(data: BudgetDeductionData): Promise<AllocationResult> {
    const response = await api.post<AllocationResponse>(
        '/api/v1/admin/budget-allocation/deduct',
        {
            department_id: data.department_id,
            amount: data.amount,
            period: data.period,
            notes: data.notes,
        }
    );

    if (!response.success) {
        throw new Error(response.message || 'Failed to deduct budget');
    }

    return response.data;
}

/**
 * Fetch allocation history for a department
 * @param departmentId - Department ID
 * @param filters - Optional filters for type, date range, pagination
 */
export async function fetchAllocationHistory(
    departmentId: string,
    filters?: {
        type?: 'Allocation' | 'Deduction';
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
    }
): Promise<{ data: AllocationHistory[]; pagination: PaginationResponse }> {
    const params: Record<string, any> = {};

    if (filters?.type) params.type = filters.type;
    if (filters?.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters?.dateTo) params.dateTo = filters.dateTo;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const response = await api.get<AllocationHistoryResponse>(
        `/api/v1/admin/budget-allocation/${departmentId}/history`,
        params
    );

    if (!response.success) {
        throw new Error('Failed to fetch allocation history');
    }

    return {
        data: response.data,
        pagination: response.pagination,
    };
}

export default {
    fetchDepartmentBudgets,
    allocateBudget,
    deductBudget,
    fetchAllocationHistory,
};
