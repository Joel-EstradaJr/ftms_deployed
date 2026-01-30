/**
 * Consolidated Schedule Types
 * 
 * This file contains unified type definitions for payment schedules used across
 * both expense and revenue modules. It eliminates duplicate type definitions
 * and provides a single source of truth for schedule-related types.
 */

/**
 * Payment status for schedule items
 * Consolidated from expenses.ts and revenue.ts (previously duplicated)
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  WRITTEN_OFF = 'WRITTEN_OFF'
}

/**
 * Frequency options for recurring schedules
 * Aligned with backend receivable_frequency enum
 */
export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY'
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
