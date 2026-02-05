"use client";

import React, { useState, useEffect } from "react";
import ModalHeader from "../../../../Components/ModalHeader";
import { showSuccess, showError, showConfirmation } from "../../../../utils/Alerts";
import type { PurchaseRequestApproval, PurchaseRequestItem } from "../../../../types/purchaseRequestApproval";
import {
  validateAllItemApprovals,
  isValidQuantity,
  sanitizeTextInput
} from "../../../../utils/purchaseRequestValidation";
//@ts-ignore
import "../../../../styles/purchase-approval/approvalModal.css";
//@ts-ignore
import "../../../../styles/components/modal.css";

interface ApprovalModalProps {
  purchaseRequest: PurchaseRequestApproval;
  onApprove: (updatedRequest: PurchaseRequestApproval, comments?: string) => Promise<void>;
  onClose: () => void;
}

interface ItemApproval {
  approved_quantity: number;
  adjustment_reason: string;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ purchaseRequest, onApprove, onClose }) => {
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemApprovals, setItemApprovals] = useState<Record<string, ItemApproval>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initialize item approvals with original quantities
    const initialApprovals: Record<string, ItemApproval> = {};
    purchaseRequest.items?.forEach((item, index) => {
      const itemId = item.purchase_request_item_id || `item-${index}`;
      initialApprovals[itemId] = {
        approved_quantity: item.quantity,
        adjustment_reason: ''
      };
    });
    setItemApprovals(initialApprovals);
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

  const handleItemQuantityChange = (itemId: string, quantity: number) => {
    setItemApprovals(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        approved_quantity: quantity
      }
    }));
  };

  const handleItemReasonChange = (itemId: string, reason: string) => {
    // Sanitize input to prevent XSS
    const sanitized = sanitizeTextInput(reason);

    setItemApprovals(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        adjustment_reason: sanitized
      }
    }));
  };

  const validateApproval = (): boolean => {
    // Use comprehensive validation utility
    const validation = validateAllItemApprovals(
      purchaseRequest.items || [],
      itemApprovals
    );

    if (!validation.isValid) {
      // Show first error with more context
      showError(validation.errors[0], "Validation Error");
      return false;
    }

    return true;
  };

  const calculateItemTotal = (item: PurchaseRequestItem, itemId: string): number => {
    const approval = itemApprovals[itemId];
    if (approval && approval.approved_quantity) {
      return approval.approved_quantity * (item.unit_cost || 0);
    }
    return item.total_amount || 0;
  };

  const calculateGrandTotal = (): number => {
    return purchaseRequest.items?.reduce((total, item, index) => {
      const itemId = item.purchase_request_item_id || `item-${index}`;
      return total + calculateItemTotal(item, itemId);
    }, 0) || 0;
  };

  const hasAnyAdjustments = (): boolean => {
    return Object.entries(itemApprovals).some(([itemId, approval]) => {
      const item = purchaseRequest.items?.find((i, idx) =>
        (i.purchase_request_item_id || `item-${idx}`) === itemId
      );
      return item && approval.approved_quantity !== item.quantity;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateApproval()) {
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to approve <b>${purchaseRequest.purchase_request_code}</b>?${hasAnyAdjustments() ? '<br/><small>This request has quantity adjustments.</small>' : ''}`,
      'Confirm Approval'
    );

    if (!result.isConfirmed) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Update items with approved quantities
      const updatedItems = purchaseRequest.items?.map((item, index) => {
        const itemId = item.purchase_request_item_id || `item-${index}`;
        const approval = itemApprovals[itemId];

        if (approval.approved_quantity !== item.quantity) {
          return {
            ...item,
            adjusted_quantity: approval.approved_quantity,
            adjustment_reason: approval.adjustment_reason,
            total_amount: approval.approved_quantity * (item.unit_cost || 0)
          };
        }
        return item;
      });

      const updatedRequest: PurchaseRequestApproval = {
        ...purchaseRequest,
        items: updatedItems,
        total_amount: calculateGrandTotal()
      };

      await onApprove(updatedRequest, comments.trim() || undefined);
      onClose();
    } catch (error) {
      console.error("Error approving request:", error);
      showError("Failed to approve request", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="modalOverlay">
      <div className="addExpenseModal" style={{ minWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <ModalHeader
          title={`Approve Purchase Request - ${purchaseRequest.purchase_request_code}`}
          onClose={onClose}
          showDateTime={true}
        />

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div className="modalContent">
              {/* Request Details */}
              <div className="formField">
                <label>Request Details</label>
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Request Code:</strong> {purchaseRequest.purchase_request_code}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Requester:</strong> {purchaseRequest.requestor?.employee_name || 'N/A'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Department:</strong> {purchaseRequest.department_name}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Reason:</strong> {purchaseRequest.reason}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Original Total:</strong> {(() => {
                      let total = purchaseRequest.total_amount;
                      if ((total === 0 || !total) && purchaseRequest.items && purchaseRequest.items.length > 0) {
                        total = purchaseRequest.items.reduce((sum, item) => {
                          const qty = item.quantity || 0;
                          const cost = item.unit_cost || 0;
                          return sum + (item.total_amount || (qty * cost));
                        }, 0);
                      }
                      return formatCurrency(total);
                    })()}
                  </div>
                  {hasAnyAdjustments() && (
                    <div style={{ marginBottom: '0', color: '#f59e0b', fontWeight: 'bold' }}>
                      <strong>Adjusted Total:</strong> {formatCurrency(calculateGrandTotal())}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="modalContent">
              <div className="formField">
                <label>
                  <i className="ri-shopping-cart-line"></i> Items to Approve
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>
                    (Click to adjust quantities)
                  </span>
                </label>

                {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
                  <div className="itemsList">
                    {purchaseRequest.items.map((item, index) => {
                      const itemId = item.purchase_request_item_id || `item-${index}`;
                      const isExpanded = expandedItems.has(itemId);
                      const approval = itemApprovals[itemId] || { approved_quantity: item.quantity, adjustment_reason: '' };
                      const hasQuantityChanged = approval.approved_quantity !== item.quantity;
                      const isNewItem = !!item.new_item_name;

                      return (
                        <div key={itemId} className="modal-content" style={{ marginBottom: '16px' }}>
                          <div className="itemCard" style={{
                            border: `2px solid ${hasQuantityChanged ? '#f59e0b' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            padding: '12px',
                            backgroundColor: hasQuantityChanged ? '#fffbeb' : 'white'
                          }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                              }}
                              onClick={() => toggleItemExpand(itemId)}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                    #{index + 1} - {isNewItem ? item.new_item_name : item.item?.item_name || 'N/A'}
                                  </span>
                                  {isNewItem && (
                                    <span className="chip" style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#fef3c7', color: '#92400e' }}>
                                      NEW ITEM
                                    </span>
                                  )}
                                  {hasQuantityChanged && (
                                    <span className="chip" style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: '#fef3c7', color: '#92400e' }}>
                                      ADJUSTED
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                  {isNewItem ? item.new_supplier_name : item.supplier?.supplier_name || 'N/A'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', marginRight: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: hasQuantityChanged ? '#f59e0b' : '#2563eb' }}>
                                  {formatCurrency(calculateItemTotal(item, itemId))}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  {approval.approved_quantity} × {formatCurrency(item.unit_cost || 0)}
                                </div>
                              </div>
                              <i className={isExpanded ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"}
                                style={{ fontSize: '20px', color: '#6b7280' }}></i>
                            </div>

                            {isExpanded && (
                              <div style={{
                                paddingTop: '12px',
                                marginTop: '12px',
                                borderTop: '1px solid #e5e7eb'
                              }}>
                                {/* Item Details Grid */}
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: '12px',
                                  marginBottom: '12px',
                                  padding: '12px',
                                  backgroundColor: '#f9fafb',
                                  borderRadius: '6px'
                                }}>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      ITEM CODE
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {item.item_code || 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      ITEM NAME
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {isNewItem ? item.new_item_name : item.item?.item_name || 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      UNIT MEASURE
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {item.item?.unit?.unit_name || item.item?.unit?.abbreviation || item.new_unit || 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      SUPPLIER CODE
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {item.supplier_code || 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      SUPPLIER NAME
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {isNewItem ? item.new_supplier_name : item.supplier?.supplier_name || 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      SUPPLIER UNIT MEASURE
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {item.supplier_item?.supplier_unit?.unit_name || item.supplier_item?.supplier_unit?.abbreviation || item.new_unit || 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      CONVERSION
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {item.supplier_item?.conversion_amount || 1}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      UNIT PRICE
                                    </label>
                                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                      {formatCurrency(item.unit_cost || 0)}
                                    </div>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                      STATUS
                                    </label>
                                    <span className="chip" style={{ fontSize: '11px' }}>
                                      {item.status || 'PENDING'}
                                    </span>
                                  </div>
                                  {item.remarks && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                      <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                        REMARKS
                                      </label>
                                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                        {item.remarks}
                                      </div>
                                    </div>
                                  )}
                                  {item.attachment_id && (
                                    <div>
                                      <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                        ATTACHMENT FILE
                                      </label>
                                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#2563eb' }}>
                                        <i className="ri-file-line"></i> Attachment #{item.attachment_id}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Quantity Adjustment */}
                                <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                  <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: '#15803d' }}>
                                    <i className="ri-edit-line"></i> Approve Quantity
                                  </h4>

                                  <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: '12px', marginBottom: '10px' }}>
                                    <div>
                                      <label style={{ fontSize: '11px', color: '#15803d', display: 'block', marginBottom: '4px' }}>
                                        Requested
                                      </label>
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        disabled
                                        style={{
                                          width: '100%',
                                          padding: '6px',
                                          borderRadius: '4px',
                                          border: '1px solid #d1d5db',
                                          fontSize: '13px',
                                          backgroundColor: '#f3f4f6',
                                          cursor: 'not-allowed'
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <label style={{ fontSize: '11px', color: '#15803d', display: 'block', marginBottom: '4px' }}>
                                        Approve Qty <span style={{ color: '#dc2626' }}>*</span>
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={approval.approved_quantity}
                                        onChange={(e) => handleItemQuantityChange(itemId, parseInt(e.target.value) || 0)}
                                        style={{
                                          width: '100%',
                                          padding: '6px',
                                          borderRadius: '4px',
                                          border: '2px solid #16a34a',
                                          fontSize: '13px',
                                          fontWeight: 'bold'
                                        }}
                                      />
                                    </div>

                                    <div>
                                      <label style={{ fontSize: '11px', color: '#15803d', display: 'block', marginBottom: '4px' }}>
                                        Approved Total
                                      </label>
                                      <div style={{
                                        padding: '6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'white',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        color: hasQuantityChanged ? '#f59e0b' : '#16a34a',
                                        border: '1px solid #bbf7d0'
                                      }}>
                                        {formatCurrency(calculateItemTotal(item, itemId))}
                                        {hasQuantityChanged && (
                                          <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '5px' }}>
                                            (was {formatCurrency(item.total_amount || 0)})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {hasQuantityChanged && (
                                    <div>
                                      <label style={{ fontSize: '11px', color: '#15803d', display: 'block', marginBottom: '4px' }}>
                                        Adjustment Reason <span style={{ color: '#dc2626' }}>*Required</span>
                                      </label>
                                      <textarea
                                        value={approval.adjustment_reason}
                                        onChange={(e) => handleItemReasonChange(itemId, e.target.value)}
                                        placeholder="Explain why the quantity is being adjusted..."
                                        rows={2}
                                        style={{
                                          width: '100%',
                                          padding: '6px',
                                          borderRadius: '4px',
                                          border: !approval.adjustment_reason.trim() ? '2px solid #dc2626' : '1px solid #bbf7d0',
                                          fontSize: '12px',
                                          fontFamily: 'inherit',
                                          backgroundColor: 'white'
                                        }}
                                      />
                                      {!approval.adjustment_reason.trim() && (
                                        <span style={{ fontSize: '10px', color: '#dc2626', marginTop: '3px', display: 'block' }}>
                                          <i className="ri-error-warning-line"></i> Reason required when adjusting quantity
                                        </span>
                                      )}
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
                  <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                    <i className="ri-shopping-cart-line" style={{ fontSize: '36px' }}></i>
                    <p>No items in this purchase request</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modalContent">
              {/* Approval Comments */}
              <div className="formField">
                <label htmlFor="comments">
                  Approval Comments <span style={{ fontSize: '11px', color: '#6b7280' }}>(Optional)</span>
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments about this approval..."
                  className="formInput"
                  rows={3}
                  style={{ resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              {/* Confirmation Message */}
              <div style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '10px',
                color: '#155724'
              }}>
                <i className="ri-check-line" style={{ marginRight: '8px' }}></i>
                <strong>Confirm Approval:</strong> This will approve the purchase request{hasAnyAdjustments() ? ' with quantity adjustments' : ''} and allow it to proceed.
              </div>
            </div>
          </div>

          <div className="modalButtons">
            <button
              type="button"
              className="cancelButton"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <i className="ri-close-line"></i>Cancel
            </button>
            <button
              type="submit"
              className="addButton"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-line" style={{ animation: 'spin 1s linear infinite' }}></i>
                  Approving...
                </>
              ) : (
                <>
                  <i className="ri-check-line"></i>
                  Approve Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApprovalModal;