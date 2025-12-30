/**
 * Consolidated Schedule Calculation Utilities
 * 
 * Generic utility functions for managing payment schedules across both
 * expense and revenue modules. Uses TypeScript generics for type safety
 * while maintaining code reusability.
 */

import { 
  ScheduleItem, 
  ScheduleFrequency, 
  PaymentStatus,
  PaymentCascadeResult
} from '../types/schedule';

/**
 * Generate schedule dates based on frequency and start date
 * @param frequency - Payment frequency
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param numberOfPayments - Number of payments to generate
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function generateScheduleDates(
  frequency: ScheduleFrequency,
  startDate: string,
  numberOfPayments: number
): string[] {
  if (frequency === ScheduleFrequency.CUSTOM) {
    return []; // User will input dates manually
  }

  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');

  for (let i = 0; i < numberOfPayments; i++) {
    let nextDate: Date;

    switch (frequency) {
      case ScheduleFrequency.DAILY:
        // Consecutive days
        nextDate = new Date(start);
        nextDate.setDate(start.getDate() + i);
        break;

      case ScheduleFrequency.WEEKLY:
        // Same day of week, +7 days
        nextDate = new Date(start);
        nextDate.setDate(start.getDate() + (i * 7));
        break;

      case ScheduleFrequency.MONTHLY:
        // Same date each month, handle edge cases
        nextDate = new Date(start);
        nextDate.setMonth(start.getMonth() + i);
        
        // Handle months with fewer days (e.g., Jan 31 → Feb 28/29)
        if (nextDate.getDate() !== start.getDate()) {
          // Set to last day of the previous month
          nextDate.setDate(0);
        }
        break;

      case ScheduleFrequency.ANNUAL:
        // Same month/day each year
        nextDate = new Date(start);
        nextDate.setFullYear(start.getFullYear() + i);
        
        // Handle leap year edge case (Feb 29)
        if (start.getMonth() === 1 && start.getDate() === 29) {
          // Check if target year is not a leap year
          if (!isLeapYear(nextDate.getFullYear())) {
            nextDate.setDate(28);
          }
        }
        break;

      default:
        nextDate = new Date(start);
    }

    dates.push(formatDateForInput(nextDate));
  }

  return dates;
}

/**
 * Distribute total amount across schedule items
 * @param totalAmount - Total amount to distribute
 * @param scheduleItems - Current schedule items
 * @param editedIndex - Index of edited item (optional)
 * @param newAmount - New amount for edited item (optional)
 * @returns Updated schedule items with recalculated amounts
 */
export function distributeAmount<T extends ScheduleItem>(
  totalAmount: number,
  scheduleItems: T[],
  editedIndex?: number,
  newAmount?: number
): T[] {
  const items = [...scheduleItems];
  
  // Filter only editable (PENDING) items
  const editableItems = items.filter(item => item.isEditable);
  const lockedItems = items.filter(item => !item.isEditable);

  if (editableItems.length === 0) {
    return items;
  }

  // Calculate total locked amount (paid + carried over)
  const lockedAmount = lockedItems.reduce((sum, item) => sum + item.currentDueAmount, 0);
  const remainingAmount = totalAmount - lockedAmount;

  if (editedIndex !== undefined && newAmount !== undefined) {
    // User edited a specific amount
    const editedItem = items[editedIndex];
    
    if (!editedItem.isEditable) {
      return items; // Cannot edit locked items
    }

    editedItem.currentDueAmount = newAmount;
    
    // Recalculate other editable items
    const otherEditableItems = editableItems.filter((_, idx) => 
      items.indexOf(editableItems[idx]) !== editedIndex
    );

    if (otherEditableItems.length > 0) {
      const remainingForOthers = remainingAmount - newAmount;
      const amountPerItem = remainingForOthers / otherEditableItems.length;

      otherEditableItems.forEach(item => {
        const itemIndex = items.indexOf(item);
        items[itemIndex].currentDueAmount = parseFloat(amountPerItem.toFixed(2));
      });

      // Adjust last item to handle rounding
      const lastEditableIndex = items.indexOf(otherEditableItems[otherEditableItems.length - 1]);
      const totalDistributed = items.reduce((sum, item) => sum + item.currentDueAmount, 0);
      const difference = totalAmount - totalDistributed;
      items[lastEditableIndex].currentDueAmount += difference;
    }
  } else {
    // Equal distribution among all editable items
    const amountPerItem = remainingAmount / editableItems.length;

    editableItems.forEach(item => {
      const itemIndex = items.indexOf(item);
      items[itemIndex].currentDueAmount = parseFloat(amountPerItem.toFixed(2));
    });

    // Adjust last editable item to handle rounding
    const lastEditableIndex = items.indexOf(editableItems[editableItems.length - 1]);
    const totalDistributed = items.reduce((sum, item) => sum + item.currentDueAmount, 0);
    const difference = totalAmount - totalDistributed;
    items[lastEditableIndex].currentDueAmount += difference;
  }

  return items;
}

/**
 * Smart distribute amount with forward-only redistribution
 * Locks the edited item and previous items, only redistributes across subsequent PENDING items
 * @param totalAmount - Total amount to distribute
 * @param scheduleItems - Current schedule items
 * @param editedIndex - Index of edited item
 * @param newAmount - New amount for edited item
 * @returns Updated schedule items with forward-only redistribution
 */
export function smartDistributeAmount<T extends ScheduleItem>(
  totalAmount: number,
  scheduleItems: T[],
  editedIndex: number,
  newAmount: number
): T[] {
  const items = [...scheduleItems];
  const editedItem = items[editedIndex];

  // Cannot edit non-editable items
  if (!editedItem.isEditable) {
    return items;
  }

  // Set the edited item amount
  items[editedIndex].currentDueAmount = newAmount;

  // Calculate sum of all items up to and including the edited index
  const sumUpToEdited = items
    .slice(0, editedIndex + 1)
    .reduce((sum, item) => sum + item.currentDueAmount, 0);

  // Find subsequent editable (PENDING) items
  const subsequentEditableItems = items
    .slice(editedIndex + 1)
    .map((item, relativeIndex) => ({
      item,
      absoluteIndex: editedIndex + 1 + relativeIndex
    }))
    .filter(({ item }) => item.isEditable && item.paymentStatus === PaymentStatus.PENDING);

  if (subsequentEditableItems.length === 0) {
    // No subsequent editable items to redistribute to
    return items;
  }

  // Calculate remaining amount to distribute
  const remainingAmount = totalAmount - sumUpToEdited;

  // Distribute remaining amount equally among subsequent editable items
  const amountPerItem = remainingAmount / subsequentEditableItems.length;

  subsequentEditableItems.forEach(({ absoluteIndex }) => {
    items[absoluteIndex].currentDueAmount = parseFloat(amountPerItem.toFixed(2));
  });

  // Adjust last subsequent editable item to handle rounding
  const lastSubsequentIndex = subsequentEditableItems[subsequentEditableItems.length - 1].absoluteIndex;
  const totalDistributed = items.reduce((sum, item) => sum + item.currentDueAmount, 0);
  const difference = totalAmount - totalDistributed;
  items[lastSubsequentIndex].currentDueAmount += difference;

  return items;
}

/**
 * Validate date is within allowed range
 * @param newDate - Date to validate
 * @param prevDate - Previous installment date (optional)
 * @param nextDate - Next installment date (optional)
 * @returns Validation result with error message
 */
export function validateDateRange(
  newDate: string,
  prevDate?: string,
  nextDate?: string
): { isValid: boolean; errorMessage?: string } {
  const date = new Date(newDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Cannot select past dates
  if (date < today) {
    return {
      isValid: false,
      errorMessage: 'Cannot select past dates'
    };
  }

  // Must be after previous installment
  if (prevDate) {
    const prev = new Date(prevDate + 'T00:00:00');
    if (date <= prev) {
      return {
        isValid: false,
        errorMessage: 'Date must be after previous installment'
      };
    }
  }

  // Must be before next installment
  if (nextDate) {
    const next = new Date(nextDate + 'T00:00:00');
    if (date >= next) {
      return {
        isValid: false,
        errorMessage: 'Date must be before next installment'
      };
    }
  }

  return { isValid: true };
}

/**
 * Calculate payment status based on amounts and due date
 * @param item - Schedule item
 * @returns Payment status
 */
export function calculatePaymentStatus<T extends ScheduleItem>(item: T): PaymentStatus {
  const { currentDueDate, currentDueAmount, paidAmount, paymentStatus } = item;

  // Preserve manual status changes
  if (paymentStatus === PaymentStatus.CANCELLED || paymentStatus === PaymentStatus.WRITTEN_OFF) {
    return paymentStatus;
  }

  const dueDate = new Date(currentDueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fully paid
  if (paidAmount >= currentDueAmount) {
    return PaymentStatus.PAID;
  }

  // Check if past due
  const isPastDue = dueDate < today;

  // Overdue (past due date with unpaid balance)
  if (isPastDue && paidAmount < currentDueAmount) {
    return PaymentStatus.OVERDUE;
  }

  // Partially paid (not past due)
  if (paidAmount > 0 && paidAmount < currentDueAmount) {
    return PaymentStatus.PARTIALLY_PAID;
  }

  // Pending (future or today)
  return PaymentStatus.PENDING;
}

/**
 * Carry over unpaid balance from overdue item to next pending item
 * @param scheduleItems - All schedule items
 * @param overdueIndex - Index of overdue item
 * @returns Updated schedule items
 */
export function carryOverBalance<T extends ScheduleItem>(
  scheduleItems: T[],
  overdueIndex: number
): T[] {
  const items = [...scheduleItems];
  const overdueItem = items[overdueIndex];

  // Calculate unpaid balance
  const unpaidBalance = overdueItem.currentDueAmount - overdueItem.paidAmount;

  if (unpaidBalance <= 0) {
    return items; // Nothing to carry over
  }

  // Find next PENDING item
  const nextPendingIndex = items.findIndex((item, idx) => 
    idx > overdueIndex && item.paymentStatus === PaymentStatus.PENDING
  );

  if (nextPendingIndex === -1) {
    return items; // No pending items to carry over to
  }

  // Update next pending item
  items[nextPendingIndex].carriedOverAmount += unpaidBalance;
  items[nextPendingIndex].currentDueAmount += unpaidBalance;

  // Mark overdue item as processed
  overdueItem.carriedOverAmount = unpaidBalance;

  return items;
}

/**
 * Process all overdue items and carry over unpaid balances
 * Runs through all schedule items, identifies overdue ones not yet processed,
 * and carries over their unpaid balances to the next pending installments
 * @param scheduleItems - All schedule items
 * @returns Object with updated items and count of carryovers processed
 */
export function processOverdueCarryover<T extends ScheduleItem>(
  scheduleItems: T[]
): { updatedItems: T[]; carryoversProcessed: number } {
  let items = [...scheduleItems];
  let carryoversProcessed = 0;

  // Recalculate all statuses first
  items = items.map(item => ({
    ...item,
    paymentStatus: calculatePaymentStatus(item)
  }));

  // Find all overdue items that haven't been carried over yet
  const overdueItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => 
      item.paymentStatus === PaymentStatus.OVERDUE && 
      item.carriedOverAmount === 0 && // Not yet carried over
      (item.currentDueAmount - item.paidAmount) > 0 // Has unpaid balance
    );

  // Process each overdue item
  for (const { index } of overdueItems) {
    const unpaidBalance = items[index].currentDueAmount - items[index].paidAmount;

    // Find next PENDING item
    const nextPendingIndex = items.findIndex((item, idx) => 
      idx > index && item.paymentStatus === PaymentStatus.PENDING
    );

    if (nextPendingIndex !== -1) {
      // Carry over the balance
      items[nextPendingIndex].carriedOverAmount += unpaidBalance;
      items[nextPendingIndex].currentDueAmount += unpaidBalance;
      items[index].carriedOverAmount = unpaidBalance;
      carryoversProcessed++;
    }
  }

  return { updatedItems: items, carryoversProcessed };
}

/**
 * Process cascade payment across multiple installments
 * @param amount - Total amount to pay
 * @param scheduleItems - All schedule items
 * @param startIndex - Index to start applying payment
 * @returns Cascade result with affected installments
 */
export function processCascadePayment<T extends ScheduleItem>(
  amount: number,
  scheduleItems: T[],
  startIndex: number
): PaymentCascadeResult {
  let remainingAmount = amount;
  const affectedInstallments: PaymentCascadeResult['affectedInstallments'] = [];

  for (let i = startIndex; i < scheduleItems.length && remainingAmount > 0; i++) {
    const item = scheduleItems[i];
    
    // Skip already paid, cancelled, or written-off items
    if (
      item.paymentStatus === PaymentStatus.PAID ||
      item.paymentStatus === PaymentStatus.CANCELLED ||
      item.paymentStatus === PaymentStatus.WRITTEN_OFF
    ) {
      continue;
    }

    const balance = item.currentDueAmount - item.paidAmount;
    const amountToApply = Math.min(remainingAmount, balance);
    
    const previousBalance = balance;
    const newPaidAmount = item.paidAmount + amountToApply;
    const newBalance = balance - amountToApply;
    
    const newStatus = newBalance === 0 
      ? PaymentStatus.PAID 
      : newPaidAmount > 0 
        ? PaymentStatus.PARTIALLY_PAID 
        : item.paymentStatus;

    affectedInstallments.push({
      installmentNumber: item.installmentNumber,
      scheduleItemId: item.id || `item-${i}`,
      amountApplied: amountToApply,
      previousBalance,
      newBalance,
      newStatus
    });

    remainingAmount -= amountToApply;
  }

  return {
    affectedInstallments,
    remainingAmount,
    totalProcessed: amount - remainingAmount
  };
}

/**
 * Generate initial schedule items
 * @param dates - Array of due dates
 * @param totalAmount - Total amount to distribute
 * @returns Array of schedule items
 */
export function generateScheduleItems<T extends ScheduleItem>(
  dates: string[],
  totalAmount: number
): T[] {
  const items: T[] = dates.map((date, index) => ({
    id: `temp-${Date.now()}-${index}`,
    installmentNumber: index + 1,
    originalDueDate: date,
    currentDueDate: date,
    originalDueAmount: 0,
    currentDueAmount: 0,
    paidAmount: 0,
    carriedOverAmount: 0,
    paymentStatus: PaymentStatus.PENDING,
    isPastDue: false,
    isEditable: true
  } as T));

  // Distribute amount equally
  return distributeAmount<T>(totalAmount, items);
}

/**
 * Check if schedule is valid
 * @param scheduleItems - Schedule items to validate
 * @param totalAmount - Expected total amount
 * @returns Validation result
 */
export function validateSchedule<T extends ScheduleItem>(
  scheduleItems: T[],
  totalAmount: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (scheduleItems.length === 0) {
    errors.push('Schedule must have at least one installment');
  }

  // Check total amount matches
  const calculatedTotal = scheduleItems.reduce((sum, item) => sum + item.currentDueAmount, 0);
  const difference = Math.abs(calculatedTotal - totalAmount);
  
  if (difference > 0.01) {
    errors.push(`Total amount mismatch: Expected ${totalAmount}, Got ${calculatedTotal}`);
  }

  // Check dates are in chronological order
  for (let i = 1; i < scheduleItems.length; i++) {
    const prevDate = new Date(scheduleItems[i - 1].currentDueDate + 'T00:00:00');
    const currDate = new Date(scheduleItems[i].currentDueDate + 'T00:00:00');
    
    if (currDate <= prevDate) {
      errors.push(`Installment ${i + 1} date must be after installment ${i} date`);
    }
  }

  // Check no negative amounts
  scheduleItems.forEach((item, index) => {
    if (item.currentDueAmount <= 0) {
      errors.push(`Installment ${index + 1} amount must be greater than zero`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Helper functions

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
