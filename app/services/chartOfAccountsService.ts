/**
 * Chart of Accounts Service - MOCK DATA VERSION (UI-ONLY)
 * Provides mock data for chart of accounts without any API calls
 */

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
 * Mock Chart of Accounts Data
 */
const MOCK_ACCOUNTS: ChartOfAccount[] = [
  {
    account_id: '1',
    account_code: '1000',
    account_name: 'Cash on Hand',
    account_type: AccountType.ASSET,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Physical cash in office',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '2',
    account_code: '1100',
    account_name: 'Cash in Bank',
    account_type: AccountType.ASSET,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Bank account deposits',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '3',
    account_code: '1200',
    account_name: 'Accounts Receivable',
    account_type: AccountType.ASSET,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Customer receivables',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '4',
    account_code: '1500',
    account_name: 'Inventory',
    account_type: AccountType.ASSET,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Spare parts and supplies',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '5',
    account_code: '1800',
    account_name: 'Property and Equipment',
    account_type: AccountType.ASSET,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Fixed assets',
    is_active: true,
    is_system_account: true,
  },
  {
    account_id: '6',
    account_code: '2000',
    account_name: 'Accounts Payable',
    account_type: AccountType.LIABILITY,
    normal_balance: 'CREDIT' as NormalBalance,
    description: 'Supplier payables',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '7',
    account_code: '2100',
    account_name: 'Loans Payable',
    account_type: AccountType.LIABILITY,
    normal_balance: 'CREDIT' as NormalBalance,
    description: 'Bank loans',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '8',
    account_code: '3000',
    account_name: "Owner's Equity",
    account_type: AccountType.EQUITY,
    normal_balance: 'CREDIT' as NormalBalance,
    description: 'Capital contribution',
    is_active: true,
    is_system_account: true,
  },
  {
    account_id: '9',
    account_code: '3100',
    account_name: 'Retained Earnings',
    account_type: AccountType.EQUITY,
    normal_balance: 'CREDIT' as NormalBalance,
    description: 'Accumulated earnings',
    is_active: true,
    is_system_account: true,
  },
  {
    account_id: '10',
    account_code: '4000',
    account_name: 'Service Revenue',
    account_type: AccountType.REVENUE,
    normal_balance: 'CREDIT' as NormalBalance,
    description: 'Transportation service income',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '11',
    account_code: '4100',
    account_name: 'Charter Revenue',
    account_type: AccountType.REVENUE,
    normal_balance: 'CREDIT' as NormalBalance,
    description: 'Charter trip income',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '12',
    account_code: '5000',
    account_name: 'Salaries Expense',
    account_type: AccountType.EXPENSE,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Employee salaries',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '13',
    account_code: '5100',
    account_name: 'Fuel Expense',
    account_type: AccountType.EXPENSE,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Diesel and gasoline',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '14',
    account_code: '5200',
    account_name: 'Maintenance Expense',
    account_type: AccountType.EXPENSE,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Vehicle maintenance and repairs',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '15',
    account_code: '5300',
    account_name: 'Utilities Expense',
    account_type: AccountType.EXPENSE,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'Electricity, water, etc.',
    is_active: true,
    is_system_account: false,
  },
  {
    account_id: '16',
    account_code: '9999',
    account_name: 'Archived Test Account',
    account_type: AccountType.EXPENSE,
    normal_balance: 'DEBIT' as NormalBalance,
    description: 'This is an archived account for testing',
    is_active: false,
    is_system_account: false,
  },
];

// Simulated storage for newly created accounts
let mockAccountsStorage = [...MOCK_ACCOUNTS];
let nextId = 100;

/**
 * Fetch all chart of accounts with filtering and pagination (MOCK)
 */
export async function fetchChartOfAccounts(
  params?: ChartOfAccountsQueryParams
): Promise<{
  data: ChartOfAccount[];
  pagination: PaginationResponse;
}> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  let filteredData = [...mockAccountsStorage];

  // Apply filters
  if (params?.search) {
    const searchLower = params.search.toLowerCase();
    filteredData = filteredData.filter(
      acc =>
        acc.account_code.toLowerCase().includes(searchLower) ||
        acc.account_name.toLowerCase().includes(searchLower)
    );
  }

  if (!params?.includeArchived) {
    filteredData = filteredData.filter(acc => acc.is_active);
  }

  // Calculate pagination
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const total = filteredData.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedData = filteredData.slice(startIndex, startIndex + limit);

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Fetch a single chart of account by ID (MOCK)
 */
export async function fetchChartOfAccountById(id: string): Promise<ChartOfAccount | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockAccountsStorage.find(acc => acc.account_id === id) || null;
}

/**
 * Create a new chart of account (MOCK)
 */
export async function createChartOfAccount(data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const newAccount: ChartOfAccount = {
    account_id: String(nextId++),
    account_code: data.account_code || '',
    account_name: data.account_name || '',
    account_type: data.account_type || AccountType.ASSET,
    normal_balance: data.normal_balance,
    description: data.description,
    is_active: true,
    is_system_account: false,
  };

  mockAccountsStorage.push(newAccount);
  return newAccount;
}

/**
 * Update an existing chart of account (MOCK)
 */
export async function updateChartOfAccount(id: string, data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
  await new Promise(resolve => setTimeout(resolve, 400));

  const index = mockAccountsStorage.findIndex(acc => acc.account_id === id);
  if (index === -1) {
    throw new Error('Account not found');
  }

  mockAccountsStorage[index] = {
    ...mockAccountsStorage[index],
    ...data,
  };

  return mockAccountsStorage[index];
}

/**
 * Archive (soft delete) a chart of account (MOCK)
 */
export async function archiveChartOfAccount(id: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const index = mockAccountsStorage.findIndex(acc => acc.account_id === id);
  if (index !== -1) {
    mockAccountsStorage[index].is_active = false;
  }
}

/**
 * Restore an archived chart of account (MOCK)
 */
export async function restoreChartOfAccount(id: string): Promise<ChartOfAccount> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const index = mockAccountsStorage.findIndex(acc => acc.account_id === id);
  if (index === -1) {
    throw new Error('Account not found');
  }

  mockAccountsStorage[index].is_active = true;
  return mockAccountsStorage[index];
}

/**
 * Fetch all account types (MOCK)
 */
export async function fetchAccountTypes(): Promise<any[]> {
  await new Promise(resolve => setTimeout(resolve, 200));

  return [
    { id: 1, name: 'ASSET', label: 'Asset' },
    { id: 2, name: 'LIABILITY', label: 'Liability' },
    { id: 3, name: 'EQUITY', label: 'Equity' },
    { id: 4, name: 'REVENUE', label: 'Revenue' },
    { id: 5, name: 'EXPENSE', label: 'Expense' },
  ];
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
