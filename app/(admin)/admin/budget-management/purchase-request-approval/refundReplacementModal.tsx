"use client";

import React, { useState, useEffect } from "react";
import ModalHeader from "../../../../Components/ModalHeader";
import { showSuccess, showError, showConfirmation } from "../../../../utils/Alerts";
import type { PurchaseRequestApproval, PurchaseRequestItem } from "../../../../types/purchaseRequestApproval";
import { validateAllRefundReplacements } from "../../../../utils/purchaseRequestValidation";
//@ts-ignore
import "../../../../styles/purchase-approval/refundReplacementModal.css";
//@ts-ignore
import "../../../../styles/components/modal.css";

interface RefundReplacementModalProps {
  purchaseRequest: PurchaseRequestApproval;
  onProcess: (updatedRequest: PurchaseRequestApproval) => Promise<void>;
  onClose: () => void;
}

interface ItemRefundReplacement {
  refund_quantity: number;
  replace_quantity: number;
  no_action_quantity: number;
}

const RefundReplacementModal: React.FC<RefundReplacementModalProps> = ({ 
  purchaseRequest, 
  onProcess, 
  onClose 
}) => {
  const [itemActions, setItemActions] = useState<Record<string, ItemRefundReplacement>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize item actions - all quantities default to 0
    const initialActions: Record<string, ItemRefundReplacement> = {};
    purchaseRequest.items?.forEach((item, index) => {
      const itemId = item.purchase_request_item_id || `item-${index}`;
      initialActions[itemId] = {
        refund_quantity: 0,
        replace_quantity: 0,
        no_action_quantity: item.adjusted_quantity || item.quantity
      };
    });
    setItemActions(initialActions);
  }, [purchaseRequest.items]);

  const toggleItemExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleQuantityChange = (
    itemId: string, 
    field: keyof ItemRefundReplacement, 
    value: number
  ) => {
    const item = purchaseRequest.items?.find(
      (i, idx) => (i.purchase_request_item_id || `item-${idx}`) === itemId
    );
    if (!item) return;

    const adjustedQty = item.adjusted_quantity || item.quantity;
    const newValue = Math.max(0, Math.min(adjustedQty, value));

    setItemActions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: newValue
      }
    }));
  };

  const getItemAdjustedQuantity = (item: PurchaseRequestItem): number => {
    return item.adjusted_quantity || item.quantity;
  };

  const validateItemQuantities = (itemId: string): boolean => {
    const item = purchaseRequest.items?.find(
      (i, idx) => (i.purchase_request_item_id || `item-${idx}`) === itemId
    );
    if (!item) return false;

    const actions = itemActions[itemId];
    if (!actions) return false;

    const adjustedQty = getItemAdjustedQuantity(item);
    const sum = actions.refund_quantity + actions.replace_quantity + actions.no_action_quantity;

    return sum === adjustedQty;
  };

  const validateAllItems = (): boolean => {
    // Use comprehensive validation utility
    const validation = validateAllRefundReplacements(
      purchaseRequest.items || [],
      itemActions
    );

    if (!validation.isValid) {
      // Show first error
      showError(validation.errors[0], "Validation Error");
      return false;
    }

    return true;
  };

  const calculateRefundAmount = (): number => {
    let totalRefund = 0;
    purchaseRequest.items?.forEach((item, index) => {
      const itemId = item.purchase_request_item_id || `item-${index}`;
      const actions = itemActions[itemId];
      if (actions && actions.refund_quantity > 0) {
        totalRefund += actions.refund_quantity * (item.unit_cost || 0);
      }
    });
    return totalRefund;
  };

  const calculateReplaceAmount = (): number => {
    let totalReplace = 0;
    purchaseRequest.items?.forEach((item, index) => {
      const itemId = item.purchase_request_item_id || `item-${index}`;
      const actions = itemActions[itemId];
      if (actions && actions.replace_quantity > 0) {
        totalReplace += actions.replace_quantity * (item.unit_cost || 0);
      }
    });
    return totalReplace;
  };

  const hasAnyActions = (): boolean => {
    return Object.values(itemActions).some(
      action => action.refund_quantity > 0 || action.replace_quantity > 0
    );
  };

  const handleSubmit = async () => {
    if (!validateAllItems()) {
      return;
    }

    const refundAmount = calculateRefundAmount();
    const replaceAmount = calculateReplaceAmount();

    let confirmMessage = `<strong>Confirm Refund/Replacement Processing</strong><br/><br/>`;
    
    if (refundAmount > 0) {
      confirmMessage += `<strong>Total Refund:</strong> ₱${refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>`;
    }
    
    if (replaceAmount > 0) {
      confirmMessage += `<strong>Total Replacement Value:</strong> ₱${replaceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>`;
    }

    if (refundAmount === 0 && replaceAmount === 0) {
      confirmMessage += `<em>No refunds or replacements. All items marked as no action.</em><br/>`;
    }

    confirmMessage += `<br/>Do you want to proceed?`;

    const result = await showConfirmation(confirmMessage, "Process Refund/Replacement");

    if (!result.isConfirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Update items with refund/replacement quantities
      const updatedItems = purchaseRequest.items?.map((item, index) => {
        const itemId = item.purchase_request_item_id || `item-${index}`;
        const actions = itemActions[itemId];
        
        return {
          ...item,
          refund_quantity: actions.refund_quantity,
          replace_quantity: actions.replace_quantity,
          no_action_quantity: actions.no_action_quantity,
          updated_at: new Date().toISOString()
        };
      });

      const updatedRequest: PurchaseRequestApproval = {
        ...purchaseRequest,
        items: updatedItems,
        updated_at: new Date().toISOString(),
        updated_by: "Current User"
      };

      await onProcess(updatedRequest);
      showSuccess("Refund/replacement has been processed successfully.", "Processing Complete");
      onClose();
    } catch (error) {
      showError("Failed to process refund/replacement. Please try again.", "Processing Error");
      console.error("Refund/replacement processing error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemDisplayName = (item: PurchaseRequestItem): string => {
    return item.item?.item_name || item.new_item_name || 'Unknown Item';
  };

  const getSupplierDisplayName = (item: PurchaseRequestItem): string => {
    return item.supplier?.supplier_name || item.new_supplier_name || 'Unknown Supplier';
  };

  const refundAmount = calculateRefundAmount();
  const replaceAmount = calculateReplaceAmount();

  return (
    <div className="modalOverlay">
      <div className="modalLarge">
        <ModalHeader
          title="Refund/Replacement Processing"
          onClose={onClose}
        />

        <div className="modalContent">
          {/* Request Information */}
          <div className="request-info-section">
            <div className="info-grid">
              <div className="info-item">
                <label>Request Code:</label>
                <span>{purchaseRequest.purchase_request_code}</span>
              </div>
              <div className="info-item">
                <label>Department:</label>
                <span>{purchaseRequest.department_name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Request Type:</label>
                <span className={`request-type-badge ${(purchaseRequest.request_type || 'REGULAR').toLowerCase()}`}>
                  {purchaseRequest.request_type || 'REGULAR'}
                </span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span className={`status-badge ${(purchaseRequest.purchase_request_status || 'PENDING').toLowerCase()}`}>
                  {purchaseRequest.purchase_request_status || 'PENDING'}
                </span>
              </div>
              <div className="info-item full-width">
                <label>Reason:</label>
                <span>{purchaseRequest.reason}</span>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="summary-section">
            <h3>Processing Summary</h3>
            <div className="summary-grid">
              <div className="summary-item refund">
                <label>Total Refund Amount:</label>
                <span className="amount">₱{refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="summary-item replace">
                <label>Total Replacement Value:</label>
                <span className="amount">₱{replaceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            {!hasAnyActions() && (
              <div className="warning-message">
                <i className="fas fa-info-circle"></i>
                <span>No refunds or replacements specified. All items will be marked as "no action".</span>
              </div>
            )}
          </div>

          {/* Items Section */}
          <div className="items-section">
            <h3>Items - Refund/Replacement Breakdown</h3>
            <p className="instruction-text">
              For each item, distribute the adjusted quantity across refund, replace, and no action. 
              The sum must equal the adjusted quantity.
            </p>

            {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
              <div className="items-list">
                {purchaseRequest.items.map((item, index) => {
                  const itemId = item.purchase_request_item_id || `item-${index}`;
                  const isExpanded = expandedItems.has(itemId);
                  const actions = itemActions[itemId] || {
                    refund_quantity: 0,
                    replace_quantity: 0,
                    no_action_quantity: 0
                  };
                  const adjustedQty = getItemAdjustedQuantity(item);
                  const currentSum = actions.refund_quantity + actions.replace_quantity + actions.no_action_quantity;
                  const isValid = currentSum === adjustedQty;
                  const itemRefundAmount = actions.refund_quantity * (item.unit_cost || 0);
                  const itemReplaceAmount = actions.replace_quantity * (item.unit_cost || 0);

                  return (
                    <div key={itemId} className="modal-content" style={{ marginBottom: '16px' }}>
                      <div 
                        className={`item-card ${isExpanded ? 'expanded' : ''} ${!isValid ? 'invalid' : ''}`}
                      >
                        {/* Item Header - Clickable */}
                        <div 
                          className="item-header"
                          onClick={() => toggleItemExpand(itemId)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="item-header-content">
                            <div className="item-main-info">
                              <span className="item-number">#{index + 1}</span>
                              <span className="item-name">{getItemDisplayName(item)}</span>
                              {!isValid && (
                                <span className="validation-badge invalid">
                                  <i className="fas fa-exclamation-triangle"></i> Invalid Sum
                                </span>
                              )}
                              {isValid && (actions.refund_quantity > 0 || actions.replace_quantity > 0) && (
                                <span className="validation-badge action-taken">
                                  <i className="fas fa-check-circle"></i> Actions Set
                                </span>
                              )}
                            </div>
                            <div className="item-sub-info">
                              <span>Adjusted Qty: <strong>{adjustedQty}</strong></span>
                              <span>|</span>
                              <span>Unit Cost: <strong>₱{(item.unit_cost || 0).toLocaleString()}</strong></span>
                              <span>|</span>
                              <span>Supplier: <strong>{getSupplierDisplayName(item)}</strong></span>
                            </div>
                          </div>
                          <div className="expand-icon">
                            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                          </div>
                        </div>

                        {/* Item Details - Expandable */}
                        {isExpanded && (
                          <div className="item-details">
                            {/* Complete Item Details Grid */}
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(3, 1fr)', 
                              gap: '12px', 
                              marginBottom: '12px',
                              padding: '12px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb'
                            }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  ITEM CODE
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {item.item_code || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  ITEM NAME
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {getItemDisplayName(item)}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  UNIT MEASURE
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {item.item?.unit?.unit_name || item.item?.unit?.abbreviation || item.new_unit || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  SUPPLIER CODE
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {item.supplier_code || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  SUPPLIER NAME
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {getSupplierDisplayName(item)}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  SUPPLIER UNIT MEASURE
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {item.supplier_item?.supplier_unit?.unit_name || item.supplier_item?.supplier_unit?.abbreviation || item.new_unit || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  CONVERSION
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {item.supplier_item?.conversion_amount || 1}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  UNIT PRICE
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  ₱{(item.unit_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  QUANTITY
                                </label>
                                <div style={{ fontSize: '13px' }}>
                                  {item.quantity}
                                </div>
                              </div>
                              {item.adjusted_quantity && (
                                <div>
                                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                    ADJUSTED QUANTITY
                                  </label>
                                  <div style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '600' }}>
                                    {item.adjusted_quantity}
                                  </div>
                                </div>
                              )}
                              <div>
                                <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                  STATUS
                                </label>
                                <span className="chip" style={{ fontSize: '11px' }}>
                                  {item.status || 'PENDING'}
                                </span>
                              </div>
                              {item.remarks && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                    REMARKS
                                  </label>
                                  <div style={{ fontSize: '13px' }}>
                                    {item.remarks}
                                  </div>
                                </div>
                              )}
                              {item.adjustment_reason && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                    ADJUSTMENT REASON
                                  </label>
                                  <div style={{ fontSize: '13px', color: '#f59e0b' }}>
                                    {item.adjustment_reason}
                                  </div>
                                </div>
                              )}
                              {item.attachment_id && (
                                <div>
                                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                                    ATTACHMENT FILE
                                  </label>
                                  <div style={{ fontSize: '13px', color: '#2563eb' }}>
                                    <i className="fas fa-file"></i> Attachment #{item.attachment_id}
                                  </div>
                                </div>
                              )}
                            </div>

                          {/* Quantity Distribution Form */}
                          <div className="quantity-distribution">
                            <div className="distribution-header">
                              <h4>Quantity Distribution</h4>
                              <div className={`sum-indicator ${isValid ? 'valid' : 'invalid'}`}>
                                <span>Sum: {currentSum} / {adjustedQty}</span>
                                {isValid ? (
                                  <i className="fas fa-check-circle"></i>
                                ) : (
                                  <i className="fas fa-times-circle"></i>
                                )}
                              </div>
                            </div>

                            <div className="distribution-grid">
                              {/* Refund Quantity */}
                              <div className="distribution-field refund-field">
                                <label>
                                  <i className="fas fa-undo"></i>
                                  Refund Quantity
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={adjustedQty}
                                  value={actions.refund_quantity}
                                  onChange={(e) => handleQuantityChange(itemId, 'refund_quantity', parseInt(e.target.value) || 0)}
                                  className="quantity-input"
                                />
                                {actions.refund_quantity > 0 && (
                                  <div className="amount-display">
                                    ₱{itemRefundAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                )}
                              </div>

                              {/* Replace Quantity */}
                              <div className="distribution-field replace-field">
                                <label>
                                  <i className="fas fa-exchange-alt"></i>
                                  Replace Quantity
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={adjustedQty}
                                  value={actions.replace_quantity}
                                  onChange={(e) => handleQuantityChange(itemId, 'replace_quantity', parseInt(e.target.value) || 0)}
                                  className="quantity-input"
                                />
                                {actions.replace_quantity > 0 && (
                                  <div className="amount-display">
                                    ₱{itemReplaceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                )}
                              </div>

                              {/* No Action Quantity */}
                              <div className="distribution-field no-action-field">
                                <label>
                                  <i className="fas fa-ban"></i>
                                  No Action
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={adjustedQty}
                                  value={actions.no_action_quantity}
                                  onChange={(e) => handleQuantityChange(itemId, 'no_action_quantity', parseInt(e.target.value) || 0)}
                                  className="quantity-input"
                                />
                              </div>
                            </div>

                            {!isValid && (
                              <div className="validation-error">
                                <i className="fas fa-exclamation-circle"></i>
                                The sum must equal {adjustedQty}. Current sum: {currentSum}
                              </div>
                            )}
                          </div>

                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-items-message">
                <i className="fas fa-inbox"></i>
                <p>No items found for this purchase request.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modalActions">
          <button
            type="button"
            className="modalButton cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <i className="fas fa-times"></i>
            Cancel
          </button>
          <button
            type="button"
            className="modalButton primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Processing...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                Process Refund/Replacement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundReplacementModal;
