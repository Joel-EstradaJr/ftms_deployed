// ============================================================================
// app/utils/purchaseRequestValidation.ts
// Validation utilities for Purchase Request Approval system
// ============================================================================

import type { PurchaseRequestItem, PurchaseRequestApproval } from "../types/purchaseRequestApproval";

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that a quantity is a positive integer
 */
export function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0;
}

/**
 * Validates that an amount is a positive number with up to 2 decimal places
 */
export function isValidAmount(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return false;
  }
  // Check if it has more than 2 decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
}

/**
 * Validates adjustment reason - must be at least 10 characters when provided
 */
export function isValidAdjustmentReason(reason: string): boolean {
  const trimmed = reason.trim();
  return trimmed.length >= 10 && trimmed.length <= 500;
}

/**
 * Validates that adjusted quantity is not greater than original quantity
 */
export function isValidAdjustedQuantity(
  originalQuantity: number,
  adjustedQuantity: number
): ValidationResult {
  const errors: string[] = [];

  if (!isValidQuantity(adjustedQuantity)) {
    errors.push('Adjusted quantity must be a positive integer.');
  }

  if (adjustedQuantity > originalQuantity) {
    errors.push(`Adjusted quantity (${adjustedQuantity}) cannot exceed original quantity (${originalQuantity}).`);
  }

  if (adjustedQuantity === 0) {
    errors.push('Adjusted quantity cannot be zero. Consider rejecting the item instead.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates approved quantity in approval modal
 */
export function isValidApprovedQuantity(
  requestedQuantity: number,
  approvedQuantity: number
): ValidationResult {
  const errors: string[] = [];

  if (!isValidQuantity(approvedQuantity)) {
    errors.push('Approved quantity must be a positive integer.');
  }

  if (approvedQuantity > requestedQuantity) {
    errors.push(`Approved quantity (${approvedQuantity}) cannot exceed requested quantity (${requestedQuantity}).`);
  }

  if (approvedQuantity === 0) {
    errors.push('Approved quantity cannot be zero. Consider rejecting the request instead.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that adjustment reason is provided when quantity changes
 */
export function validateQuantityAdjustment(
  originalQuantity: number,
  adjustedQuantity: number,
  adjustmentReason: string
): ValidationResult {
  const errors: string[] = [];

  // Check if quantity changed
  if (originalQuantity !== adjustedQuantity) {
    // Validate the adjusted quantity itself
    const qtyValidation = isValidAdjustedQuantity(originalQuantity, adjustedQuantity);
    if (!qtyValidation.isValid) {
      errors.push(...qtyValidation.errors);
    }

    // Require adjustment reason when quantity changes
    const trimmedReason = adjustmentReason.trim();
    if (!trimmedReason) {
      errors.push('Adjustment reason is required when quantity is changed.');
    } else if (!isValidAdjustmentReason(trimmedReason)) {
      errors.push('Adjustment reason must be between 10 and 500 characters.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates refund/replacement quantity distribution
 */
export function validateRefundReplacementDistribution(
  adjustedQuantity: number,
  refundQuantity: number,
  replaceQuantity: number,
  noActionQuantity: number
): ValidationResult {
  const errors: string[] = [];

  // Validate individual quantities are non-negative integers
  if (!Number.isInteger(refundQuantity) || refundQuantity < 0) {
    errors.push('Refund quantity must be a non-negative integer.');
  }

  if (!Number.isInteger(replaceQuantity) || replaceQuantity < 0) {
    errors.push('Replace quantity must be a non-negative integer.');
  }

  if (!Number.isInteger(noActionQuantity) || noActionQuantity < 0) {
    errors.push('No action quantity must be a non-negative integer.');
  }

  // Check that sum equals adjusted quantity
  const sum = refundQuantity + replaceQuantity + noActionQuantity;
  if (sum !== adjustedQuantity) {
    errors.push(
      `Total distribution (${sum}) must equal adjusted quantity (${adjustedQuantity}). ` +
      `Current: Refund ${refundQuantity} + Replace ${replaceQuantity} + No Action ${noActionQuantity} = ${sum}`
    );
  }

  // Check that at least one action is specified
  if (refundQuantity === 0 && replaceQuantity === 0 && noActionQuantity === 0) {
    errors.push('At least one quantity field must be greater than 0.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates all items in refund/replacement modal
 */
export function validateAllRefundReplacements(
  items: PurchaseRequestItem[],
  itemActions: Record<string, { 
    refund_quantity: number; 
    replace_quantity: number; 
    no_action_quantity: number 
  }>
): ValidationResult {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push('No items to process.');
    return { isValid: false, errors };
  }

  items.forEach((item, index) => {
    const itemId = item.purchase_request_item_id || `item-${index}`;
    const actions = itemActions[itemId];
    
    if (!actions) {
      errors.push(`Item #${index + 1}: Missing action configuration.`);
      return;
    }

    const adjustedQty = item.adjusted_quantity || item.quantity;
    const itemName = item.item?.item_name || item.new_item_name || `Item #${index + 1}`;

    const validation = validateRefundReplacementDistribution(
      adjustedQty,
      actions.refund_quantity,
      actions.replace_quantity,
      actions.no_action_quantity
    );

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        errors.push(`${itemName}: ${error}`);
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates finance remarks (optional but if provided must meet criteria)
 */
export function isValidFinanceRemarks(remarks: string): ValidationResult {
  const errors: string[] = [];
  
  if (remarks) {
    const trimmed = remarks.trim();
    if (trimmed.length < 5) {
      errors.push('Finance remarks must be at least 5 characters if provided.');
    }
    if (trimmed.length > 1000) {
      errors.push('Finance remarks cannot exceed 1000 characters.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates rejection reason - required and must meet length criteria
 */
export function isValidRejectionReason(reason: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = reason.trim();

  if (!trimmed) {
    errors.push('Rejection reason is required.');
  } else if (trimmed.length < 10) {
    errors.push('Rejection reason must be at least 10 characters.');
  } else if (trimmed.length > 500) {
    errors.push('Rejection reason cannot exceed 500 characters.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates item data for new items (when item_code is not provided)
 */
export function validateNewItemData(item: Partial<PurchaseRequestItem>): ValidationResult {
  const errors: string[] = [];

  if (!item.new_item_name || item.new_item_name.trim().length < 3) {
    errors.push('Item name must be at least 3 characters.');
  }

  if (!item.new_supplier_name || item.new_supplier_name.trim().length < 3) {
    errors.push('Supplier name must be at least 3 characters.');
  }

  if (item.new_supplier_contact && !/^09\d{9}$/.test(item.new_supplier_contact.trim())) {
    errors.push('Supplier contact must be a valid Philippine mobile number (09XXXXXXXXX).');
  }

  if (item.new_supplier_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(item.new_supplier_email.trim())) {
      errors.push('Supplier email must be a valid email address.');
    }
  }

  if (!item.new_unit_cost || item.new_unit_cost <= 0) {
    errors.push('Unit cost must be a positive number.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates complete item approval data
 */
export function validateItemApproval(
  item: PurchaseRequestItem,
  approvedQuantity: number,
  adjustmentReason: string
): ValidationResult {
  const errors: string[] = [];

  // Validate approved quantity
  const qtyValidation = isValidApprovedQuantity(item.quantity, approvedQuantity);
  if (!qtyValidation.isValid) {
    errors.push(...qtyValidation.errors);
  }

  // Validate adjustment reason if quantity changed
  if (item.quantity !== approvedQuantity) {
    if (!adjustmentReason.trim()) {
      errors.push('Adjustment reason is required when approved quantity differs from requested quantity.');
    } else if (!isValidAdjustmentReason(adjustmentReason)) {
      errors.push('Adjustment reason must be between 10 and 500 characters.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates all items in approval modal before submission
 */
export function validateAllItemApprovals(
  items: PurchaseRequestItem[],
  itemApprovals: Record<string, { approved_quantity: number; adjustment_reason: string }>
): ValidationResult {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push('No items to approve.');
    return { isValid: false, errors };
  }

  items.forEach((item, index) => {
    const itemId = item.purchase_request_item_id || `item-${index}`;
    const approval = itemApprovals[itemId];
    
    if (!approval) {
      errors.push(`Item #${index + 1}: Missing approval data.`);
      return;
    }

    const itemName = item.item?.item_name || item.new_item_name || `Item #${index + 1}`;
    const validation = validateItemApproval(item, approval.approved_quantity, approval.adjustment_reason);

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        errors.push(`${itemName}: ${error}`);
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates all items in edit modal before saving
 */
export function validateAllItemEdits(
  items: PurchaseRequestItem[],
  itemEdits: Record<string, { adjusted_quantity: number; adjustment_reason: string }>
): ValidationResult {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push('No items to edit.');
    return { isValid: false, errors };
  }

  items.forEach((item, index) => {
    const itemId = item.purchase_request_item_id || `item-${index}`;
    const edit = itemEdits[itemId];
    
    if (!edit) {
      errors.push(`Item #${index + 1}: Missing edit data.`);
      return;
    }

    const itemName = item.item?.item_name || item.new_item_name || `Item #${index + 1}`;
    const originalQty = item.adjusted_quantity || item.quantity;
    
    const validation = validateQuantityAdjustment(
      originalQty,
      edit.adjusted_quantity,
      edit.adjustment_reason
    );

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        errors.push(`${itemName}: ${error}`);
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates total amount calculation
 */
export function validateTotalAmount(
  items: PurchaseRequestItem[],
  expectedTotal: number
): ValidationResult {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push('Cannot calculate total amount - no items provided.');
    return { isValid: false, errors };
  }

  const calculatedTotal = items.reduce((sum, item) => {
    const qty = item.adjusted_quantity || item.quantity;
    return sum + (qty * (item.unit_cost || 0));
  }, 0);

  // Allow for small floating point differences (0.01)
  const difference = Math.abs(calculatedTotal - expectedTotal);
  if (difference > 0.01) {
    errors.push(
      `Total amount mismatch. Calculated: ₱${calculatedTotal.toFixed(2)}, ` +
      `Expected: ₱${expectedTotal.toFixed(2)}, ` +
      `Difference: ₱${difference.toFixed(2)}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes text input to prevent XSS
 */
export function sanitizeTextInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

/**
 * Validates and sanitizes adjustment reason
 */
export function validateAndSanitizeReason(reason: string): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const sanitized = sanitizeTextInput(reason);
  const isValid = isValidAdjustmentReason(sanitized);
  
  const errors: string[] = [];
  if (!isValid) {
    errors.push('Adjustment reason must be between 10 and 500 characters.');
  }

  return {
    isValid,
    sanitized,
    errors
  };
}

/**
 * Batch validation for multiple items - returns first error found
 */
export function validateItemsBatch(
  items: PurchaseRequestItem[]
): ValidationResult {
  const errors: string[] = [];

  items.forEach((item, index) => {
    // Validate quantity
    if (!isValidQuantity(item.quantity)) {
      errors.push(`Item #${index + 1}: Invalid quantity.`);
    }

    // Validate unit cost
    if (item.unit_cost === undefined || !isValidAmount(item.unit_cost)) {
      errors.push(`Item #${index + 1}: Invalid unit cost.`);
    }

    // Validate total amount
    const expectedTotal = item.quantity * (item.unit_cost || 0);
    if (item.total_amount !== undefined && Math.abs(item.total_amount - expectedTotal) > 0.01) {
      errors.push(`Item #${index + 1}: Total amount mismatch.`);
    }

    // Validate new item data if applicable
    if (!item.item_code && !item.supplier_code) {
      const newItemValidation = validateNewItemData(item);
      if (!newItemValidation.isValid) {
        errors.push(`Item #${index + 1}: ${newItemValidation.errors.join(', ')}`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates purchase request before submission
 */
export function validatePurchaseRequest(
  request: Partial<PurchaseRequestApproval>
): ValidationResult {
  const errors: string[] = [];

  if (!request.purchase_request_code || request.purchase_request_code.trim().length === 0) {
    errors.push('Purchase request code is required.');
  }

  if (!request.department_name || request.department_name.trim().length === 0) {
    errors.push('Department is required.');
  }

  if (!request.reason || request.reason.trim().length < 10) {
    errors.push('Reason must be at least 10 characters.');
  }

  if (!request.items || request.items.length === 0) {
    errors.push('At least one item is required.');
  } else {
    const itemsValidation = validateItemsBatch(request.items);
    if (!itemsValidation.isValid) {
      errors.push(...itemsValidation.errors);
    }
  }

  if (!request.total_amount || request.total_amount <= 0) {
    errors.push('Total amount must be greater than zero.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
