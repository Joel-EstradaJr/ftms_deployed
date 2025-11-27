/**
 * Chart of Accounts Service
 * Handles all API calls related to chart of accounts
 */

import { api, ApiError } from '../lib/api';
import { ChartOfAccount } from '../types/jev';

/**
 * Backend API response for chart of accounts
 */
export interface ChartOfAccountApiResponse {
  id: number;
  account_code: string;
  account_name: string;
  account_type_name: string;
  normal_balance: 'DEBIT' | 'CREDIT';
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  parent_account_id?: number;
  parent_account_code?: string;
  parent_account_name?: string;
  level?: number;
  is_system_account?: boolean;
}

/**
 * Map backend response to frontend ChartOfAccount type
 */
function mapApiResponseToChartOfAccount(apiAccount: ChartOfAccountApiResponse): ChartOfAccount {
  // Map account_type_name to AccountType enum
  let accountType: any = 'ASSET'; // default
  switch (apiAccount.account_type_name?.toUpperCase()) {
    case 'ASSETS':
    case 'ASSET':
      accountType = 'ASSET';
      break;
    case 'LIABILITIES':
    case 'LIABILITY':
      accountType = 'LIABILITY';
      break;
    case 'EQUITY':
      accountType = 'EQUITY';
      break;
    case 'REVENUES':
    case 'REVENUE':
      accountType = 'REVENUE';
      break;
    case 'EXPENSES':
    case 'EXPENSE':
      accountType = 'EXPENSE';
      break;
  }

  return {
    account_id: String(apiAccount.id),
    account_code: apiAccount.account_code,
    account_name: apiAccount.account_name,
    account_type: accountType,
    normal_balance: apiAccount.normal_balance,
    description: apiAccount.description || undefined,
    is_active: apiAccount.status?.toLowerCase() === 'active',
    is_system_account: apiAccount.is_system_account || false,
    parent_account_id: apiAccount.parent_account_id ? String(apiAccount.parent_account_id) : undefined,
    parent_account_code: apiAccount.parent_account_code,
    parent_account_name: apiAccount.parent_account_name,
    level: apiAccount.level || 1,
  };
}

/**
 * Fetch all chart of accounts from the backend
 */
export async function fetchChartOfAccounts(): Promise<ChartOfAccount[]> {
  try {
    const response = await api.get<{
      success: boolean;
      data: ChartOfAccountApiResponse[];
      pagination?: any;
      message?: string;
    }>('/api/v1/admin/chart-of-accounts');
    
    // Map the API response to frontend type
    return response.data.map(mapApiResponseToChartOfAccount);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error fetching chart of accounts:', error.message);
      throw error;
    }
    throw new ApiError(0, 'Failed to fetch chart of accounts');
  }
}

/**
 * Fetch a single chart of account by ID
 */
export async function fetchChartOfAccountById(id: string): Promise<ChartOfAccount | null> {
  try {
    const response = await api.get<{
      success: boolean;
      data: ChartOfAccountApiResponse;
      message?: string;
    }>(`/api/v1/admin/chart-of-accounts/${id}`);
    return mapApiResponseToChartOfAccount(response.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a new chart of account
 */
export async function createChartOfAccount(data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
  try {
    const response = await api.post<{
      success: boolean;
      data: ChartOfAccountApiResponse;
      message?: string;
    }>('/api/v1/admin/chart-of-accounts', data);
    return mapApiResponseToChartOfAccount(response.data);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error creating chart of account:', error.message);
      throw error;
    }
    throw new ApiError(0, 'Failed to create chart of account');
  }
}

/**
 * Update an existing chart of account
 */
export async function updateChartOfAccount(id: string, data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
  try {
    const response = await api.put<{
      success: boolean;
      data: ChartOfAccountApiResponse;
      message?: string;
    }>(`/api/v1/admin/chart-of-accounts/${id}`, data);
    return mapApiResponseToChartOfAccount(response.data);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error updating chart of account:', error.message);
      throw error;
    }
    throw new ApiError(0, 'Failed to update chart of account');
  }
}

/**
 * Archive (soft delete) a chart of account
 */
export async function archiveChartOfAccount(id: string): Promise<void> {
  try {
    await api.delete(`/api/v1/admin/chart-of-accounts/${id}`);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error archiving chart of account:', error.message);
      throw error;
    }
    throw new ApiError(0, 'Failed to archive chart of account');
  }
}

/**
 * Restore an archived chart of account
 */
export async function restoreChartOfAccount(id: string): Promise<ChartOfAccount> {
  try {
    const response = await api.patch<{
      success: boolean;
      data: ChartOfAccountApiResponse;
      message?: string;
    }>(`/api/v1/admin/chart-of-accounts/${id}/restore`);
    return mapApiResponseToChartOfAccount(response.data);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error restoring chart of account:', error.message);
      throw error;
    }
    throw new ApiError(0, 'Failed to restore chart of account');
  }
}

/**
 * Fetch all account types from the backend
 */
export async function fetchAccountTypes(): Promise<any[]> {
  try {
    const response = await api.get<{
      success: boolean;
      data: any[];
      message?: string;
    }>('/api/v1/admin/account-types');
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API Error fetching account types:', error.message);
      throw error;
    }
    throw new ApiError(0, 'Failed to fetch account types');
  }
}

export default {
  fetchChartOfAccounts,
  fetchChartOfAccountById,
  createChartOfAccount,
  updateChartOfAccount,
  archiveChartOfAccount,
  restoreChartOfAccount,
  fetchAccountTypes,
};
