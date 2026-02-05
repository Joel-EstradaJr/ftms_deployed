/**
 * Consolidated Schedule Types
 * 
 * This file contains unified type definitions for payment schedules used across
 * both expense and revenue modules. It eliminates duplicate type definitions
 * and provides a single source of truth for schedule-related types.
 * 
 * Updated to align with new status model:
 * - payment_status enum (replaces receivable_status and payable_status)
 * - approval_status enum (replaces revenue_status and expense_status)
 * - accounting_status uses journal_status enum
 */

/**
 * Payment status for revenue/expense records and schedule items
 * Aligned with backend payment_status enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',           // Not yet paid at all
  PARTIALLY_PAID = 'PARTIALLY_PAID', // Some payments received, balance exists
  COMPLETED = 'COMPLETED',       // Fully settled, balance = 0 (replaces PAID)
  PAID = 'COMPLETED',            // @deprecated Alias for COMPLETED - use COMPLETED instead
  OVERDUE = 'OVERDUE',           // Past due date
  CANCELLED = 'CANCELLED',       // Invalidated before collection
  WRITTEN_OFF = 'WRITTEN_OFF'    // Cannot be collected; bad debts
}

/**
 * @deprecated Use PaymentStatus.COMPLETED instead of PaymentStatus.PAID
 * Alias maintained for backward compatibility during migration
 */
export const PAID_STATUS = PaymentStatus.COMPLETED;

/**
 * Approval status for revenue and expense records
 * Aligned with backend approval_status enum
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

/**
 * Accounting status for revenue and expense records
 * Aligned with backend journal_status enum
 */
export enum AccountingStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  ADJUSTED = 'ADJUSTED',
  REVERSED = 'REVERSED'
}

/**
 * Frequency options for recurring schedules
 * Aligned with backend receivable_frequency enum
 */
export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  ANNUALLY = 'ANNUALLY',
  CUSTOM = 'CUSTOM'           // Custom schedule
}

/**
 * Base interface for schedule items
 * Aligned with backend expense_installment_schedule model
 */
export interface ScheduleItem {
  /** Unique identifier for the schedule item (expense_installment_schedule.id) */
  id?: number | string;
  
  /** Parent payable identifier (expense_installment_schedule.payable_id) */
  payable_id?: number;
  
  /** Sequential installment number (expense_installment_schedule.installment_number) */
  installment_number: number;
  
  /** Due date (expense_installment_schedule.due_date) */
  due_date: string;
  
  /** Amount due for this installment (expense_installment_schedule.amount_due) */
  amount_due: number;
  
  /** Amount that has been paid (expense_installment_schedule.amount_paid) */
  amount_paid: number;
  
  /** Remaining balance (expense_installment_schedule.balance) */
  balance: number;
  
  /** Current payment status (expense_installment_schedule.status - installment_status enum) */
  status: PaymentStatus;
  
  // Audit trail
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  
  // ============================================
  // UI-only computed fields (not persisted)
  // ============================================
  
  /** Whether this installment is past its due date (computed at runtime) */
  isPastDue?: boolean;
  
  /** Whether this installment can be edited (computed based on status) */
  isEditable?: boolean;
}

/**
 * Result of cascade payment calculation
 * Used when payment amount exceeds current installment balance
 */
export interface PaymentCascadeResult {
  /** List of installments affected by the payment */
  affectedInstallments: Array<{
    /** Schedule item ID */
    scheduleItemId: string;
    /** Installment number */
    installmentNumber: number;
    /** Amount applied to this installment */
    amountApplied: number;
    /** Previous balance before payment */
    previousBalance: number;
    /** New balance after payment */
    newBalance: number;
    /** New payment status */
    newStatus: PaymentStatus;
  }>;
  
  /** Amount remaining after applying to all installments */
  remainingAmount: number;
  
  /** Total amount processed */
  totalProcessed: number;
}
