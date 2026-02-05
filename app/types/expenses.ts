// ==================== EXPENSE MANAGEMENT TYPE DEFINITIONS ====================

import {
  PaymentStatus as BasePaymentStatus,
  ApprovalStatus as BaseApprovalStatus,
  AccountingStatus as BaseAccountingStatus,
  ScheduleFrequency as BaseScheduleFrequency,
  ScheduleItem as BaseScheduleItem
} from './schedule';

// Operational Expense Types
export enum OperationalExpenseType {
  FUEL = 'FUEL',
  TOLL = 'TOLL',
  PARKING = 'PARKING',
  ALLOWANCES = 'ALLOWANCES',
  PETTY_CASH = 'PETTY_CASH',
  VIOLATIONS = 'VIOLATIONS',
  TERMINAL_FEES = 'TERMINAL_FEES'
}

// Administrative Expense Types
export enum AdministrativeExpenseType {
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  UTILITIES = 'UTILITIES',
  PROFESSIONAL_FEES = 'PROFESSIONAL_FEES',
  INSURANCE = 'INSURANCE',
  LICENSING = 'LICENSING',
  PERMITS = 'PERMITS',
  GENERAL_ADMIN = 'GENERAL_ADMIN'
}

// Re-export approval status from schedule.ts
export const ApprovalStatus = BaseApprovalStatus;
export type ApprovalStatus = BaseApprovalStatus;

// Re-export accounting status from schedule.ts  
export const AccountingStatus = BaseAccountingStatus;
export type AccountingStatus = BaseAccountingStatus;

/**
 * @deprecated Use ApprovalStatus from './schedule' instead
 * ExpenseStatus enum maintained for backward compatibility
 */
export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
  // Note: POSTED is now handled by AccountingStatus, not ExpenseStatus
}

// Purchase Expense Status (more detailed)
export enum PurchaseExpenseStatus {
  DRAFT = 'DRAFT',
  DELIVERED = 'DELIVERED',
  POSTED = 'POSTED',
  CLOSED = 'CLOSED',
  REFUNDED = 'REFUNDED',
  REPLACED = 'REPLACED'
}

// Payment Status (computed from CashTransaction records)
/**
 * @deprecated Use PaymentStatus from './schedule' instead
 * Type alias maintained for backward compatibility
 */
export const PaymentStatus = BasePaymentStatus;
export type PaymentStatus = BasePaymentStatus;

/**
 * @deprecated Use ScheduleFrequency from './schedule' instead
 * Type alias maintained for backward compatibility
 */
export const ExpenseScheduleFrequency = BaseScheduleFrequency;
export type ExpenseScheduleFrequency = BaseScheduleFrequency;

/**
 * @deprecated Use ScheduleItem from './schedule' instead
 * Type alias maintained for backward compatibility
 */
export type ExpenseScheduleItem = BaseScheduleItem;

// Payment Information from CashTransaction
export interface PaymentInfo {
  payment_status: PaymentStatus;
  total_paid: number;
  balance: number;
  due_date?: string;
  payment_terms?: string;
  payment_history: PaymentHistoryItem[];
}

export interface PaymentHistoryItem {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  created_by: string;
}

// Item Interface for expenses
export interface ExpenseItem {
  item_name: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  supplier: string;
  subtotal: number;
  type: 'supply' | 'service';
}

// Operational Expense Interface
export interface OperationalExpense {
  id: string;
  expense_type: string; // NO_DB_COLUMN - used for display/categorization only
  date_assigned: string;
  amount: number;
  description: string;
  category?: string;
  status: string;
  bus_id?: string;
  body_number?: string;
  employee_id?: string;
  employee_name?: string;
  receipt_number?: string;
  payable_id?: number | null; // if not null/empty, reimbursable
  items?: ExpenseItem[];
  created_by: string;
  approved_by?: string;
  created_at: string;
  approved_at?: string;
  updated_at: string;
}

// Administrative Expense Interface
// Aligned with backend expense + payable schema
export interface AdministrativeExpense {
  // Primary identifiers (maps to expense.id, expense.code)
  id: number | string;  // expense.id (int) or expense.code (string) for display
  code: string;         // expense.code - unique expense identifier

  // Core expense fields (aligned with expense model)
  expense_type_id: number;           // FK to expense_type table
  date_recorded: string;              // expense.date_recorded
  amount: number;                     // expense.amount
  description?: string;               // expense.description (also stores remarks)
  vendor_id?: number | null;          // expense.vendor_id FK to vendor table
  vendor?: string;                    // Computed vendor name for display (backwards compat)
  vendor_name?: string;               // Computed vendor name from relation
  vendor_code?: string;               // Vendor code (supplier_id or standalone code)
  invoice_number?: string;            // expense.invoice_number
  
  /**
   * @deprecated Use approval_status instead. Kept for backward compatibility.
   */
  status?: ExpenseStatus;             // expense.status enum (DEPRECATED)
  
  // New unified status fields (aligned with schema changes)
  approval_status?: ApprovalStatus;   // expense.approval_status enum (PENDING, APPROVED, REJECTED)
  accounting_status?: AccountingStatus; // expense.accounting_status enum (DRAFT, POSTED, ADJUSTED, REVERSED)
  
  payment_method?: string;            // expense.payment_method enum
  payment_reference?: string;         // expense.payment_reference

  // Payable relationship (for scheduled payments)
  payable_id?: number | null;         // expense.payable_id FK

  // Computed/derived fields for UI
  paymentStatus?: PaymentStatus;      // Computed from payable.payment_status or installments
  payment_status?: PaymentStatus;     // Direct mapping from payable.payment_status
  balance?: number;                   // payable.balance

  // Schedule items (from expense_installment_schedule via payable)
  scheduleItems?: ExpenseScheduleItem[];

  // Frequency for payable schedule (maps to payable.frequency)
  frequency?: ExpenseScheduleFrequency;

  // Audit trail (aligned with expense model)
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_remarks?: string;
  is_deleted?: boolean;
}

// Purchase Expense Interface
export interface PurchaseExpense {
  id: string;
  expense_code?: string;
  pr_number: string;
  pr_date: string;
  dr_number?: string;
  dr_date?: string;
  date: string;
  amount: number;
  category?: string;
  description: string;
  status: string;
  budget_code?: string;
  budget_allocated?: number;
  budget_utilized?: number;
  supplier?: string;
  receipt_number?: string;
  items?: ExpenseItem[];
  adjustment_reason?: string;
  adjustment_amount?: number;
  linked_purchase_id?: string;
  goods_receipt_date?: string;
  supplier_price_updated?: boolean;
  account_code?: string;
  remarks?: string;
  inventory_integration_id?: string;
  inventory_order_ref?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
  approved_at?: string;
  updated_at: string;
}

// Filter Interfaces
export interface OperationalExpenseFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  expense_type?: string;
  status?: string;
}

export interface AdministrativeExpenseFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  expense_type?: string;
  status?: string;
  amountRange?: {
    min?: string;
    max?: string;
  };
}

export interface PurchaseExpenseFilters {
  dateRange?: {
    from?: string;
    to?: string;
  };
  status?: string;
}
