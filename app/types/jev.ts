// ==================== JEV TYPE DEFINITIONS ====================

// Account Types
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum AccountSubType {
  // Assets
  CURRENT_ASSET = 'current_asset',
  NON_CURRENT_ASSET = 'non_current_asset',
  
  // Liabilities
  CURRENT_LIABILITY = 'current_liability',
  NON_CURRENT_LIABILITY = 'non_current_liability',
  
  // Equity
  CAPITAL = 'capital',
  RETAINED_EARNINGS = 'retained_earnings',
  
  // Revenue
  OPERATING_REVENUE = 'operating_revenue',
  NON_OPERATING_REVENUE = 'non_operating_revenue',
  
  // Expenses
  OPERATING_EXPENSE = 'operating_expense',
  NON_OPERATING_EXPENSE = 'non_operating_expense'
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export interface ChartOfAccount {
  // CORE FIELDS (Required)
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  
  // CLASSIFICATION FIELDS
  category?: AccountSubType;
  normal_balance?: NormalBalance;
  expense_category?: string;
  statement_section?: string;
  display_order?: number;
  
  // OPTIONAL FIELDS
  description?: string;
  notes?: string;
  
  // PRACTICAL FIELDS
  is_active: boolean;
  is_system_account: boolean;
}

// Journal Entry Types
export enum EntryType {
  MANUAL = 'MANUAL',
  AUTO_REVENUE = 'AUTO_REVENUE',
  AUTO_EXPENSE = 'AUTO_EXPENSE',
  AUTO_PAYROLL = 'AUTO_PAYROLL',
  AUTO_LOAN = 'AUTO_LOAN',
  AUTO_PURCHASE = 'AUTO_PURCHASE',
  AUTO_REFUND = 'AUTO_REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  CLOSING = 'CLOSING'
}

export enum JournalStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export interface JournalEntryLine {
  line_id?: string;
  journal_entry_id?: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  account?: ChartOfAccount;
  line_number: number;
  description?: string;
  debit?: number;
  credit?: number;
  // Legacy field names for backward compatibility
  debit_amount?: number;
  credit_amount?: number;
}

export interface JournalEntry {
  journal_entry_id: string;
  code: string; // DB: journal_entry.code (was journal_number)
  date: string; // DB: journal_entry.date (was transaction_date)
  posting_date?: string;
  reference?: string; // DB: journal_entry.reference (was reference_number)
  description: string; // DB: journal_entry.description
  entry_type: EntryType; // DB: journal_entry.entry_type
  status: JournalStatus; // DB: journal_entry.status
  total_debit: number; // DB: journal_entry.total_debit
  total_credit: number; // DB: journal_entry.total_credit
  reversal_of_code?: string; // DB: reversal_of_code - for reversal entries
  is_balanced: boolean;
  // Legacy fields for backward compatibility
  journal_number?: string;
  transaction_date?: string;
  reference_number?: string;
  source_module?: string;
  source_id?: string;
  reversed_by_id?: string;
  reversed_entry?: JournalEntry;
  reverses_entry?: JournalEntry[];
  created_at?: string;
  created_by?: string;
  posted_at?: string;
  posted_by?: string;
  updated_at?: string;
  updated_by?: string;
  attachments?: string[];
  journal_lines: JournalEntryLine[];
}

// Form Data Types
export interface AccountFormData {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  category?: AccountSubType;
  normal_balance?: NormalBalance;
  is_contra_account?: boolean;
  contra_to_code?: string;
  expense_category?: string;
  statement_section?: string;
  display_order?: number;
  description?: string;
  notes?: string;
  is_active?: boolean;
}

export interface JournalEntryFormData {
  code?: string; // DB: journal_entry.code (auto-generated)
  date: string; // DB: journal_entry.date
  reference?: string; // DB: journal_entry.reference
  description: string; // DB: journal_entry.description
  entry_type: EntryType; // DB: journal_entry.entry_type
  status?: JournalStatus; // DB: journal_entry.status
  reversal_of_code?: string; // DB: reversal_of_code
  journal_lines: JournalEntryLine[];
  // Legacy fields for backward compatibility
  transaction_date?: string;
  reference_number?: string;
  source_module?: string;
  source_id?: string;
}

// Validation Types
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BalanceValidationResult {
  balanced: boolean;
  issues: string[];
  orphaned_accounts?: string[];
  duplicate_codes?: string[];
  balance_mismatches?: Array<{
    account_code: string;
    account_name: string;
    expected: number;
    actual: number;
  }>;
}

// User Role for Permissions
export enum UserRole {
  FINANCE_ADMIN = 'FINANCE_ADMIN',
  FINANCE_STAFF = 'FINANCE_STAFF',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
  VIEWER = 'VIEWER'
}

// Filter Types
export interface AccountFilters {
  search?: string;
  account_type?: AccountType | '';
  status?: 'active' | 'archived' | 'all';
  parent_id?: string;
  has_transactions?: boolean;
}

export interface JournalEntryFilters {
  search?: string;
  date_from?: string;
  date_to?: string;
  entry_type?: EntryType | '';
  status?: JournalStatus | '';
  source_module?: string;
  account_id?: string;
}

// Audit Trail
export interface AuditLog {
  audit_id: string;
  action: string;
  table_affected: string;
  record_id: string;
  performed_by: string;
  performed_at: string;
  details: string;
  old_values?: any;
  new_values?: any;
}
