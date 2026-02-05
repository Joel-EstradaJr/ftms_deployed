/**
 * Journal Entry Service - Backend API Integration
 * Connects to the FTMS backend API for journal entry management
 */

import { api, ApiResponse } from '../lib/api';
import { JournalEntry, JournalStatus, EntryType, ChartOfAccount, JournalEntryLine } from '../types/jev';

/**
 * Query parameters for filtering journal entries
 */
export interface JournalEntryQueryParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: JournalStatus | '';
  entry_type?: EntryType | '';
  code?: string;
  reference?: string;
  description?: string;
  includeArchived?: boolean;
}

/**
 * Backend response for journal entries list
 */
interface JournalEntriesBackendResponse {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Backend response for a single journal entry
 */
interface JournalEntryDetailBackendResponse {
  success: boolean;
  data: any;
}

/**
 * Transform backend journal entry data to frontend format
 */
function transformJournalEntry(backendData: any): JournalEntry {
  // Backend returns 'id' as integer, frontend uses 'journal_entry_id' as string
  const entryId = String(backendData.id || backendData.journal_entry_id || '');

  // Backend returns 'lines', frontend uses 'journal_lines'
  const lines = backendData.lines || backendData.journal_lines || [];

  return {
    journal_entry_id: entryId,
    code: backendData.code,
    journal_number: backendData.code, // Legacy field
    date: backendData.date,
    transaction_date: backendData.date, // Legacy field
    posting_date: backendData.approved_at || backendData.posting_date,
    reference: backendData.reference,
    reference_number: backendData.reference, // Legacy field
    description: backendData.description,
    entry_type: backendData.entry_type as EntryType,
    status: backendData.status as JournalStatus,
    total_debit: typeof backendData.total_debit === 'number' ? backendData.total_debit : parseFloat(backendData.total_debit || '0'),
    total_credit: typeof backendData.total_credit === 'number' ? backendData.total_credit : parseFloat(backendData.total_credit || '0'),
    is_balanced: backendData.is_balanced ?? Math.abs((backendData.total_debit || 0) - (backendData.total_credit || 0)) < 0.01,
    source_module: backendData.source_module,
    source_id: backendData.source_id,
    reversed_by_id: backendData.reversed_by_id,
    created_at: backendData.created_at,
    created_by: backendData.created_by,
    posted_at: backendData.approved_at || backendData.posted_at,
    posted_by: backendData.approved_by || backendData.posted_by,
    updated_at: backendData.updated_at,
    updated_by: backendData.updated_by,
    attachments: backendData.attachments || [],
    journal_lines: lines.map((line: any, index: number): JournalEntryLine => {
      const lineId = String(line.id || line.line_id || `line-${index}`);
      return {
        line_id: lineId,
        journal_entry_id: entryId,
        account_id: String(line.account_id || ''),
        account_code: line.account_code || line.account?.account_code,
        account_name: line.account_name || line.account?.account_name,
        account: line.account ? {
          account_id: String(line.account.id || line.account.account_id || ''),
          account_code: line.account.account_code,
          account_name: line.account.account_name,
          account_type: line.account.account_type,
          normal_balance: line.account.normal_balance,
          is_active: line.account.is_active ?? true,
          is_system_account: false,
        } : undefined,
        line_number: line.line_number ?? (index + 1),
        description: line.description || line.line_description || '',
        debit: line.debit ?? line.debit_amount ?? 0,
        credit: line.credit ?? line.credit_amount ?? 0,
        debit_amount: line.debit ?? line.debit_amount ?? 0,
        credit_amount: line.credit ?? line.credit_amount ?? 0,
      };
    }),
  };
}


/**
 * Fetch all journal entries with filtering and pagination
 */
export async function fetchJournalEntries(
  params: JournalEntryQueryParams = {}
): Promise<{ entries: JournalEntry[]; pagination: any }> {
  try {
    const queryParams: Record<string, any> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    // Add optional filters
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.status && params.status !== '' as any) queryParams.status = params.status;
    if (params.entry_type && params.entry_type !== '' as any) queryParams.entry_type = params.entry_type;
    if (params.code) queryParams.code = params.code;
    if (params.reference) queryParams.reference = params.reference;
    if (params.description) queryParams.description = params.description;
    if (params.includeArchived) queryParams.includeArchived = params.includeArchived;

    const response = await api.get<JournalEntriesBackendResponse>(
      '/api/v1/admin/journal-entry',
      queryParams
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to fetch journal entries');
    }

    // Transform backend data to frontend format
    const entries = response.data.map(transformJournalEntry);

    return {
      entries,
      pagination: response.pagination,
    };
  } catch (error: any) {
    console.error('Error fetching journal entries:', error);
    throw new Error(error.message || 'Failed to fetch journal entries');
  }
}

/**
 * Fetch a single journal entry by ID
 */
export async function fetchJournalEntryById(id: string | number): Promise<JournalEntry> {
  try {
    const response = await api.get<JournalEntryDetailBackendResponse>(
      `/api/v1/admin/journal-entry/${id}`
    );

    if (!response.success || !response.data) {
      throw new Error('Journal entry not found');
    }

    // Transform backend data to frontend format
    return transformJournalEntry(response.data);
  } catch (error: any) {
    console.error('Error fetching journal entry:', error);
    throw new Error(error.message || 'Failed to fetch journal entry');
  }
}

/**
 * Create a new journal entry
 */
export async function createJournalEntry(data: any): Promise<JournalEntry> {
  try {
    const response = await api.post<JournalEntryDetailBackendResponse>(
      '/api/v1/admin/journal-entry',
      data
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to create journal entry');
    }

    return transformJournalEntry(response.data);
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    throw new Error(error.message || 'Failed to create journal entry');
  }
}

/**
 * Update an existing journal entry
 */
export async function updateJournalEntry(id: string | number, data: any): Promise<JournalEntry> {
  try {
    const response = await api.patch<JournalEntryDetailBackendResponse>(
      `/api/v1/admin/journal-entry/${id}`,
      data
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to update journal entry');
    }

    return transformJournalEntry(response.data);
  } catch (error: any) {
    console.error('Error updating journal entry:', error);
    throw new Error(error.message || 'Failed to update journal entry');
  }
}

/**
 * Delete a journal entry (soft delete)
 */
export async function deleteJournalEntry(id: string | number, reason: string): Promise<void> {
  try {
    const response = await api.delete<ApiResponse<void>>(
      `/api/v1/admin/journal-entry/${id}`,
      { reason }
    );

    if (!response.success) {
      throw new Error('Failed to delete journal entry');
    }
  } catch (error: any) {
    console.error('Error deleting journal entry:', error);
    throw new Error(error.message || 'Failed to delete journal entry');
  }
}

/**
 * Post a draft journal entry (change status to POSTED)
 */
export async function postJournalEntry(id: string | number): Promise<JournalEntry> {
  try {
    const response = await api.post<JournalEntryDetailBackendResponse>(
      `/api/v1/admin/journal-entry/${id}/post`
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to post journal entry');
    }

    return transformJournalEntry(response.data);
  } catch (error: any) {
    console.error('Error posting journal entry:', error);
    throw new Error(error.message || 'Failed to post journal entry');
  }
}

/**
 * Create an auto-generated journal entry (used for manual entries too)
 * Routes manual entries through the /auto endpoint with module: "MANUAL"
 */
export async function createAutoJournalEntry(data: {
  module: string;
  reference_id: string;
  description: string;
  date: string;
  entries: Array<{
    account_code: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}): Promise<JournalEntry> {
  try {
    const response = await api.post<JournalEntryDetailBackendResponse>(
      '/api/v1/admin/journal-entry/auto',
      data
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to create journal entry');
    }

    return transformJournalEntry(response.data);
  } catch (error: any) {
    console.error('Error creating journal entry:', error);
    throw new Error(error.message || 'Failed to create journal entry');
  }
}

/**
 * Create a reversal journal entry
 */
export async function createReversalEntry(
  reversalOfId: string | number,
  reason: string,
  date?: string
): Promise<JournalEntry> {
  try {
    const response = await api.post<JournalEntryDetailBackendResponse>(
      '/api/v1/admin/journal-entry/reversal',
      {
        reversal_of_id: typeof reversalOfId === 'string' ? parseInt(reversalOfId) : reversalOfId,
        reason,
        date: date || new Date().toISOString().split('T')[0],
      }
    );

    if (!response.success || !response.data) {
      throw new Error('Failed to create reversal entry');
    }

    return transformJournalEntry(response.data);
  } catch (error: any) {
    console.error('Error creating reversal entry:', error);
    throw new Error(error.message || 'Failed to create reversal entry');
  }
}

/**
 * Transform frontend form data to backend API payload format
 * Used by EditJournalEntryModal to properly format update requests
 */
export function transformUpdatePayload(
  formData: any,
  accounts: Array<{ account_id: string; account_code: string }>
): {
  description?: string;
  date?: string;
  entries?: Array<{
    account_code: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
} {
  const getAccountCode = (accountId: string): string => {
    const account = accounts.find(a => a.account_id === accountId);
    return account?.account_code || accountId;
  };

  return {
    description: formData.description,
    date: formData.transaction_date || formData.date,
    entries: formData.journal_lines?.map((line: any) => ({
      account_code: getAccountCode(line.account_id),
      debit: line.debit_amount ?? line.debit ?? 0,
      credit: line.credit_amount ?? line.credit ?? 0,
      description: line.description,
    })),
  };
}
