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
 * Consolidated from ExpenseScheduleFrequency and RevenueScheduleFrequency
 */
export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
  CUSTOM = 'CUSTOM'
}

/**
 * Base interface for schedule items
 * Consolidated from ExpenseScheduleItem and RevenueScheduleItem (identical structures)
 */
export interface ScheduleItem {
  /** Unique identifier for the schedule item */
  id?: string;
  
  /** Parent schedule identifier */
  scheduleId?: string;
  
  /** Sequential installment number (1-based) */
  installmentNumber: number;
  
  /** Original due date when schedule was created */
  originalDueDate: string;
  
  /** Current due date (may be adjusted) */
  currentDueDate: string;
  
  /** Original due amount when schedule was created */
  originalDueAmount: number;
  
  /** Current due amount (may include carried over amounts) */
  currentDueAmount: number;
  
  /** Amount that has been paid */
  paidAmount: number;
  
  /** Amount carried over from previous installments */
  carriedOverAmount: number;
  
  /** Current payment status */
  paymentStatus: PaymentStatus;
  
  /** Whether this installment is past its due date */
  isPastDue: boolean;
  
  /** Whether this installment can be edited */
  isEditable: boolean;
  
  /** Timestamp when payment was made */
  paidAt?: string;
  
  /** User who made the payment */
  paidBy?: string;
  
  /** Payment method used */
  paymentMethod?: string;
  
  /** Payment reference number */
  referenceNumber?: string;
  
  /** Additional notes about this installment */
  remarks?: string;
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
