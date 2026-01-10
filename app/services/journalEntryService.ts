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
  return {
    journal_entry_id: backendData.journal_entry_id,
    code: backendData.code,
    journal_number: backendData.code, // Legacy field
    date: backendData.date,
    transaction_date: backendData.date, // Legacy field
    posting_date: backendData.posting_date,
    reference: backendData.reference,
    reference_number: backendData.reference, // Legacy field
    description: backendData.description,
    entry_type: backendData.entry_type as EntryType,
    status: backendData.status as JournalStatus,
    total_debit: backendData.total_debit,
    total_credit: backendData.total_credit,
    is_balanced: backendData.is_balanced ?? Math.abs(backendData.total_debit - backendData.total_credit) < 0.01,
    source_module: backendData.source_module,
    source_id: backendData.source_id,
    reversed_by_id: backendData.reversed_by_id,
    created_at: backendData.created_at,
    created_by: backendData.created_by,
    posted_at: backendData.posted_at,
    posted_by: backendData.posted_by,
    updated_at: backendData.updated_at,
    updated_by: backendData.updated_by,
    attachments: backendData.attachments || [],
    journal_lines: (backendData.journal_lines || []).map((line: any): JournalEntryLine => ({
      line_id: line.line_id,
      journal_entry_id: line.journal_entry_id,
      account_id: line.account_id,
      account_code: line.account_code || line.account?.account_code,
      account_name: line.account_name || line.account?.account_name,
      account: line.account ? {
        account_id: line.account.account_id,
        account_code: line.account.account_code,
        account_name: line.account.account_name,
        account_type: line.account.account_type,
        normal_balance: line.account.normal_balance,
        is_active: line.account.is_active,
        is_system_account: false,
      } : undefined,
      line_number: line.line_number,
      description: line.description || line.line_description,
      debit: line.debit ?? line.debit_amount ?? 0,
      credit: line.credit ?? line.credit_amount ?? 0,
      debit_amount: line.debit_amount ?? line.debit ?? 0,
      credit_amount: line.credit_amount ?? line.credit ?? 0,
    })),
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
      '/api/v1/admin/journal-entries',
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
      `/api/v1/admin/journal-entries/${id}`
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
      '/api/v1/admin/journal-entries',
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
    const response = await api.put<JournalEntryDetailBackendResponse>(
      `/api/v1/admin/journal-entries/${id}`,
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
      `/api/v1/admin/journal-entries/${id}`,
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
