/**
 * Expense Schedule Calculations - Backward Compatibility Layer
 * 
 * @deprecated This file now re-exports from './scheduleCalculations'
 * Please update your imports to use './scheduleCalculations' directly
 * 
 * This file maintains backward compatibility with existing code while
 * the codebase transitions to the unified schedule calculation utilities.
 */

// Re-export all functions from consolidated utilities
export {
  generateScheduleDates,
  distributeAmount,
  smartDistributeAmount,
  validateDateRange,
  calculatePaymentStatus,
  carryOverBalance,
  processOverdueCarryover,
  processCascadePayment,
  generateScheduleItems,
  validateSchedule
} from './scheduleCalculations';

// Re-export PaymentCascadeResult from consolidated types
export type { PaymentCascadeResult } from '../types/schedule';
