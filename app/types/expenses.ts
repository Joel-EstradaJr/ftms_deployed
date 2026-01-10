// ==================== EXPENSE MANAGEMENT TYPE DEFINITIONS ====================

import { 
  PaymentStatus as BasePaymentStatus,
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

// Expense Status
export enum ExpenseStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  POSTED = 'POSTED'
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
export interface AdministrativeExpense {
  id: string;
  expense_type: string; // This might be mapped to category
  category: string; // New field
  subcategory: string; // New field
  date: string;
  amount: number;
  description: string;
  status?: string; // Status field (e.g., PENDING, APPROVED, POSTED)
  department?: string;
  vendor?: string;
  invoice_number?: string;
  items?: ExpenseItem[];
  
  // Prepaid/Payable fields
  isPrepaid: boolean;
  frequency?: ExpenseScheduleFrequency;
  startDate?: string;
  endDate?: string;
  scheduleItems?: ExpenseScheduleItem[];
  
  // Payment details
  paymentMethod?: string;
  referenceNo?: string;
  receiptUrl?: string;
  remarks?: string;
  paymentStatus?: PaymentStatus;
  remainingBalance?: number;

  created_by: string;
  approved_by?: string;
  created_at: string;
  approved_at?: string;
  updated_at: string;
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
