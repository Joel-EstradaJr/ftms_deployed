/**
 * Chart of Accounts Service - Backend API Integration
 * Connects to the FTMS backend API for chart of accounts management
 */

import { api, ApiResponse } from '../lib/api';
import { ChartOfAccount, NormalBalance, AccountType } from '../types/jev';

/**
 * Query parameters for filtering chart of accounts
 */
export interface ChartOfAccountsQueryParams {
  includeArchived?: boolean;
  accountTypeId?: number;
  search?: string;
  page?: number;
  limit?: number;
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
 * Backend response for a single chart of account item in list view
 */
interface ChartOfAccountBackendItem {
  id: number;
  account_code: string;
  account_name: string;
  account_type_name: string; // Backend returns account_type.name
  normal_balance: NormalBalance;
  description: string | null;
  status: 'Active' | 'Archived'; // Backend returns computed status
  created_at: string;
  updated_at: string;
}

/**
 * Backend response for chart of accounts list
 */
interface ChartOfAccountsBackendResponse {
  success: boolean;
  data: ChartOfAccountBackendItem[];
  pagination: PaginationResponse;
  message: string;
}

/**
 * Backend response for a single detailed chart of account
 */
interface ChartOfAccountDetailBackendResponse {
  success: boolean;
  data: {
    id: number;
    account_code: string;
    account_name: string;
    account_type_id: number;
    account_type_name: string;
    normal_balance: NormalBalance;
    description: string | null;
    status: 'Active' | 'Archived';
    linked_entries_count: number;
    created_at: string;
    updated_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    archived_at: string | null;
    archived_by: string | null;
  };
  message: string;
}

/**
 * Extended chart of account details for view modal
 */
export interface ExtendedChartOfAccount {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  account_type_name: string;
  normal_balance: NormalBalance;
  description?: string;
  is_active: boolean;
  journal_entry_lines_count: number;
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  deleted_by?: string;
  deleted_at?: string;
}

/**
 * Map backend item to frontend ChartOfAccount type
 */
function mapBackendItemToFrontend(item: ChartOfAccountBackendItem): ChartOfAccount {
  // Map account_type_name to AccountType enum
  let accountType: AccountType;
  switch (item.account_type_name.toUpperCase()) {
    case 'ASSET':
      accountType = AccountType.ASSET;
      break;
    case 'LIABILITY':
      accountType = AccountType.LIABILITY;
      break;
    case 'EQUITY':
      accountType = AccountType.EQUITY;
      break;
    case 'REVENUE':
      accountType = AccountType.REVENUE;
      break;
    case 'EXPENSE':
      accountType = AccountType.EXPENSE;
      break;
    default:
      accountType = AccountType.ASSET; // Fallback
  }

  return {
    account_id: String(item.id),
    account_code: item.account_code,
    account_name: item.account_name,
    account_type: accountType,
    normal_balance: item.normal_balance,
    description: item.description || undefined,
    is_active: item.status === 'Active',
    is_system_account: false, // Not provided in list view
  };
}

/**
 * Fetch all chart of accounts with filtering and pagination
 */
export async function fetchChartOfAccounts(
  params?: ChartOfAccountsQueryParams
): Promise<{
  data: ChartOfAccount[];
  pagination: PaginationResponse;
}> {
  const queryParams: Record<string, any> = {
    page: params?.page || 1,
    limit: params?.limit || 10,
    includeArchived: params?.includeArchived || false,
  };

  if (params?.search) {
    queryParams.search = params.search;
  }

  if (params?.accountTypeId) {
    queryParams.accountTypeId = params.accountTypeId;
  }

  const response = await api.get<ChartOfAccountsBackendResponse>(
    '/api/v1/admin/chart-of-accounts',
    queryParams
  );

  if (!response.success) {
    throw new Error(response.message || 'Failed to fetch chart of accounts');
  }

  // Map backend data to frontend format
  const mappedData = response.data.map(mapBackendItemToFrontend);

  return {
    data: mappedData,
    pagination: response.pagination,
  };
}

/**
 * Fetch a single chart of account by ID
 */
export async function fetchChartOfAccountById(id: string): Promise<ChartOfAccount | null> {
  try {
    const response = await api.get<ChartOfAccountDetailBackendResponse>(
      `/api/v1/admin/chart-of-accounts/${id}`
    );

    if (!response.success || !response.data) {
      return null;
    }

    const item = response.data;

    // Map account_type_name to AccountType enum
    let accountType: AccountType;
    switch (item.account_type_name.toUpperCase()) {
      case 'ASSET':
        accountType = AccountType.ASSET;
        break;
      case 'LIABILITY':
        accountType = AccountType.LIABILITY;
        break;
      case 'EQUITY':
        accountType = AccountType.EQUITY;
        break;
      case 'REVENUE':
        accountType = AccountType.REVENUE;
        break;
      case 'EXPENSE':
        accountType = AccountType.EXPENSE;
        break;
      default:
        accountType = AccountType.ASSET; // Fallback
    }

    return {
      account_id: String(item.id),
      account_code: item.account_code,
      account_name: item.account_name,
      account_type: accountType,
      normal_balance: item.normal_balance,
      description: item.description || undefined,
      is_active: item.status === 'Active',
      is_system_account: false,
    };
  } catch (error) {
    console.error('Error fetching chart of account by ID:', error);
    return null;
  }
}

/**
 * Fetch extended chart of account details by ID (for view modal)
 * Includes audit fields and linked entries count
 */
export async function fetchChartOfAccountDetailById(id: string): Promise<ExtendedChartOfAccount | null> {
  try {
    const response = await api.get<ChartOfAccountDetailBackendResponse>(
      `/api/v1/admin/chart-of-accounts/${id}`
    );

    if (!response.success || !response.data) {
      return null;
    }

    const item = response.data;

    // Map account_type_name to AccountType enum
    let accountType: AccountType;
    switch (item.account_type_name.toUpperCase()) {
      case 'ASSET':
        accountType = AccountType.ASSET;
        break;
      case 'LIABILITY':
        accountType = AccountType.LIABILITY;
        break;
      case 'EQUITY':
        accountType = AccountType.EQUITY;
        break;
      case 'REVENUE':
        accountType = AccountType.REVENUE;
        break;
      case 'EXPENSE':
        accountType = AccountType.EXPENSE;
        break;
      default:
        accountType = AccountType.ASSET; // Fallback
    }

    return {
      account_id: String(item.id),
      account_code: item.account_code,
      account_name: item.account_name,
      account_type: accountType,
      account_type_name: item.account_type_name,
      normal_balance: item.normal_balance,
      description: item.description || undefined,
      is_active: item.status === 'Active',
      journal_entry_lines_count: item.linked_entries_count,
      created_by: item.created_by || undefined,
      created_at: item.created_at,
      updated_by: item.updated_by || undefined,
      updated_at: item.updated_at || undefined,
      deleted_by: item.archived_by || undefined,
      deleted_at: item.archived_at || undefined,
    };
  } catch (error) {
    console.error('Error fetching chart of account detail by ID:', error);
    return null;
  }
}

/**
 * Create a new chart of account
 */
export async function createChartOfAccount(data: {
  account_name: string;
  account_type_id?: number;
  account_type_code?: string;
  normal_balance: NormalBalance;
  description?: string;
  custom_suffix?: number;
}): Promise<ChartOfAccount> {
  const response = await api.post<{
    success: boolean;
    data: any;
    message: string;
  }>('/api/v1/admin/chart-of-accounts', {
    account_name: data.account_name,
    account_type_id: data.account_type_id,
    account_type_code: data.account_type_code,
    normal_balance: data.normal_balance,
    description: data.description,
    custom_suffix: data.custom_suffix,
  });

  if (!response.success) {
    throw new Error(response.message || 'Failed to create chart of account');
  }

  // Map the created account to frontend format
  const item = response.data;
  return {
    account_id: String(item.id),
    account_code: item.account_code,
    account_name: item.account_name,
    account_type: item.account_type?.name?.toUpperCase() || AccountType.ASSET,
    normal_balance: item.normal_balance,
    description: item.description || undefined,
    is_active: !item.is_deleted,
    is_system_account: item.is_system_account || false,
  };
}

/**
 * Update an existing chart of account
 */
export async function updateChartOfAccount(
  id: string,
  data: {
    account_code?: string;
    account_name?: string;
    account_type_id?: number;
    normal_balance?: NormalBalance;
    description?: string;
  }
): Promise<ChartOfAccount> {
  const response = await api.patch<{
    success: boolean;
    data: any;
    message: string;
  }>(`/api/v1/admin/chart-of-accounts/${id}`, data);

  if (!response.success) {
    throw new Error(response.message || 'Failed to update chart of account');
  }

  // Map the updated account to frontend format
  const item = response.data;
  return {
    account_id: String(item.id),
    account_code: item.account_code,
    account_name: item.account_name,
    account_type: item.account_type?.name?.toUpperCase() || AccountType.ASSET,
    normal_balance: item.normal_balance,
    description: item.description || undefined,
    is_active: !item.is_deleted,
    is_system_account: item.is_system_account || false,
  };
}

/**
 * Archive (soft delete) a chart of account
 */
export async function archiveChartOfAccount(id: string): Promise<void> {
  const response = await api.patch<{
    success: boolean;
    message: string;
  }>(`/api/v1/admin/chart-of-accounts/${id}/archive`);

  if (!response.success) {
    throw new Error(response.message || 'Failed to archive chart of account');
  }
}

/**
 * Restore an archived chart of account
 */
export async function restoreChartOfAccount(id: string): Promise<ChartOfAccount> {
  const response = await api.patch<{
    success: boolean;
    data: any;
    message: string;
  }>(`/api/v1/admin/chart-of-accounts/${id}/restore`);

  if (!response.success) {
    throw new Error(response.message || 'Failed to restore chart of account');
  }

  // Map the restored account to frontend format
  const item = response.data;
  return {
    account_id: String(item.id),
    account_code: item.account_code,
    account_name: item.account_name,
    account_type: item.account_type?.name?.toUpperCase() || AccountType.ASSET,
    normal_balance: item.normal_balance,
    description: item.description || undefined,
    is_active: !item.is_deleted,
    is_system_account: item.is_system_account || false,
  };
}

/**
 * Hard delete a chart of account
 */
export async function deleteChartOfAccount(id: string): Promise<void> {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/api/v1/admin/chart-of-accounts/${id}`);

  if (!response.success) {
    throw new Error(response.message || 'Failed to delete chart of account');
  }
}

/**
 * Fetch all account types
 */
export async function fetchAccountTypes(): Promise<{
  id: number;
  name: string;
  code: string;
  description: string | null;
}[]> {
  try {
    const response = await api.get<{
      success: boolean;
      data: {
        id: number;
        code: string;
        name: string;
        description: string | null;
      }[];
      message: string;
    }>('/api/v1/admin/account-types');

    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch account types');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching account types:', error);
    // Fallback to hardcoded values if API fails
    return [
      { id: 1, name: 'ASSET', code: '1', description: 'Resources owned by the company' },
      { id: 2, name: 'LIABILITY', code: '2', description: 'Obligations owed to others' },
      { id: 3, name: 'EQUITY', code: '3', description: "Owner's stake in the business" },
      { id: 4, name: 'REVENUE', code: '4', description: 'Income from operations' },
      { id: 5, name: 'EXPENSE', code: '5', description: 'Costs of doing business' },
    ];
  }
}

/**
 * Get suggested account code for a given account type
 */
export async function getSuggestedAccountCode(accountTypeId: number): Promise<string> {
  try {
    const response = await api.get<{
      success: boolean;
      data: {
        suggested_code: string;
      };
      message: string;
    }>(`/api/v1/admin/chart-of-accounts/suggest-code/${accountTypeId}`);

    if (!response.success) {
      throw new Error(response.message || 'Failed to get suggested account code');
    }

    return response.data.suggested_code;
  } catch (error) {
    console.error('Error fetching suggested account code:', error);
    throw error;
  }
}

export default {
  fetchChartOfAccounts,
  fetchChartOfAccountById,
  fetchChartOfAccountDetailById,
  createChartOfAccount,
  updateChartOfAccount,
  archiveChartOfAccount,
  restoreChartOfAccount,
  deleteChartOfAccount,
  fetchAccountTypes,
  getSuggestedAccountCode,
};
