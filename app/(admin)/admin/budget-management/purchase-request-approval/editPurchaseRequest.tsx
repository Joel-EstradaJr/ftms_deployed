'use client';

import React, { useState, useEffect } from 'react';
//@ts-ignore
import "../../../../styles/budget-management/addBudgetRequest.css";
//@ts-ignore
import "../../../../styles/components/modal.css";
import { formatDate } from '../../../../utils/formatting';
import ModalHeader from '../../../../Components/ModalHeader';
import { showError, showConfirmation } from '../../../../utils/Alerts';
import type { PurchaseRequestApproval, PurchaseRequestItem } from '../../../../types/purchaseRequestApproval';
import { 
  validateAllItemEdits, 
  isValidFinanceRemarks,
  sanitizeTextInput 
} from '../../../../utils/purchaseRequestValidation';

interface EditPurchaseRequestProps {
  purchaseRequest: PurchaseRequestApproval;
  onSave: (updatedRequest: PurchaseRequestApproval) => void;
  onClose: () => void;
}

interface ItemEdit {
  adjusted_quantity: number;
  adjustment_reason: string;
}

const EditPurchaseRequest: React.FC<EditPurchaseRequestProps> = ({
  purchaseRequest,
  onSave,
  onClose
}) => {
  const [financeRemarks, setFinanceRemarks] = useState(purchaseRequest.finance_remarks || '');
  const [itemEdits, setItemEdits] = useState<Record<string, ItemEdit>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initialize item edits with current values
    const initialEdits: Record<string, ItemEdit> = {};
    purchaseRequest.items?.forEach((item, index) => {
      const itemId = item.purchase_request_item_id || `item-${index}`;
      initialEdits[itemId] = {
        adjusted_quantity: item.adjusted_quantity || item.quantity,
        adjustment_reason: item.adjustment_reason || ''
      };
    });
    setItemEdits(initialEdits);
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
    setItemEdits(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        adjusted_quantity: quantity
      }
    }));
    setHasChanges(true);
  };

  const handleItemReasonChange = (itemId: string, reason: string) => {
    // Sanitize input to prevent XSS
    const sanitized = sanitizeTextInput(reason);
    
    setItemEdits(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        adjustment_reason: sanitized
      }
    }));
    setHasChanges(true);
  };

  const handleFinanceRemarksChange = (value: string) => {
    // Sanitize finance remarks
    const sanitized = sanitizeTextInput(value);
    setFinanceRemarks(sanitized);
    setHasChanges(true);
  };

  const validateForm = (): boolean => {
    // Validate finance remarks if provided
    const remarksValidation = isValidFinanceRemarks(financeRemarks);
    if (!remarksValidation.isValid) {
      showError(remarksValidation.errors[0], 'Validation Error');
      return false;
    }

    // Use comprehensive validation utility for item edits
    const itemsValidation = validateAllItemEdits(
      purchaseRequest.items || [],
      itemEdits
    );

    if (!itemsValidation.isValid) {
      showError(itemsValidation.errors[0], 'Validation Error');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to save changes to <b>${purchaseRequest.purchase_request_code}</b>?`,
      'Confirm Save'
    );

    if (result.isConfirmed) {
      // Update items with edits
      const updatedItems = purchaseRequest.items?.map((item, index) => {
        const itemId = item.purchase_request_item_id || `item-${index}`;
        const edit = itemEdits[itemId];
        
        return {
          ...item,
          adjusted_quantity: edit.adjusted_quantity,
          adjustment_reason: edit.adjustment_reason
        };
      });

      const updatedRequest: PurchaseRequestApproval = {
        ...purchaseRequest,
        finance_remarks: financeRemarks,
        items: updatedItems,
        updated_at: new Date().toISOString(),
        updated_by: 'Current User' // In real app, get from auth
      };

      onSave(updatedRequest);
    }
  };

  const handleClose = async () => {
    if (hasChanges) {
      const result = await showConfirmation(
        'You have unsaved changes. Are you sure you want to close?',
        'Unsaved Changes'
      );
      if (result.isConfirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatRequestType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  const calculateNewTotal = (item: PurchaseRequestItem, itemId: string): number => {
    const edit = itemEdits[itemId];
    if (edit && edit.adjusted_quantity) {
      return edit.adjusted_quantity * (item.unit_cost || 0);
    }
    return item.total_amount || 0;
  };

  const calculateGrandTotal = (): number => {
    return purchaseRequest.items?.reduce((total, item, index) => {
      const itemId = item.purchase_request_item_id || `item-${index}`;
      return total + calculateNewTotal(item, itemId);
    }, 0) || 0;
  };

  return (
    <div className="modalOverlay">
      <div className="addBudgetRequestModal" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', minWidth: '900px' }}>
        <ModalHeader 
          title={`Edit Purchase Request - ${purchaseRequest.purchase_request_code}`}
          onClose={handleClose} 
          showDateTime={true} 
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Request Information (Read-Only) */}
          <div className="modalContent">
            <div className="sectionHeader">
              <i className="ri-file-text-line"></i> Request Information
            </div>
            
            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Request Code</label>
                <div className="viewOnlyField">{purchaseRequest.purchase_request_code}</div>
              </div>
              <div className="formField formFieldHalf">
                <label>Requestor</label>
                <div className="viewOnlyField">
                  {purchaseRequest.requestor?.employee_name || 'N/A'}
                </div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Department</label>
                <div className="viewOnlyField">{purchaseRequest.department_name}</div>
              </div>
              <div className="formField formFieldHalf">
                <label>Request Type</label>
                <div className="viewOnlyField">
                  <span className={`chip ${(purchaseRequest.request_type || 'REGULAR').toLowerCase()}`}>
                    {formatRequestType(purchaseRequest.request_type || 'REGULAR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="formField">
              <label>Reason</label>
              <div className="viewOnlyField multiline">{purchaseRequest.reason}</div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Original Total</label>
                <div className="viewOnlyField">{formatCurrency(purchaseRequest.total_amount)}</div>
              </div>
              <div className="formField formFieldHalf">
                <label>Adjusted Total</label>
                <div className="viewOnlyField" style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#2563eb' }}>
                  {formatCurrency(calculateGrandTotal())}
                </div>
              </div>
            </div>
          </div>

          {/* Finance Remarks (Editable) */}
          <div className="modalContent">
            <div className="sectionHeader">
              <i className="ri-bank-line"></i> Finance Remarks
            </div>
            
            <div className="formField">
              <label htmlFor="finance_remarks">
                Remarks <span style={{ color: '#6b7280', fontSize: '12px' }}>(Optional)</span>
              </label>
              <textarea
                id="finance_remarks"
                value={financeRemarks}
                onChange={(e) => handleFinanceRemarksChange(e.target.value)}
                placeholder="Enter finance remarks or notes..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Items (Editable Quantities) */}
          <div className="modalContent">
            <div className="sectionHeader">
              <i className="ri-shopping-cart-line"></i> Items - Adjust Quantities
            </div>
            
            {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
              <div className="itemsList">
                {purchaseRequest.items.map((item, index) => {
                  const itemId = item.purchase_request_item_id || `item-${index}`;
                  const isExpanded = expandedItems.has(itemId);
                  const edit = itemEdits[itemId] || { adjusted_quantity: item.quantity, adjustment_reason: '' };
                  const hasQuantityChanged = edit.adjusted_quantity !== item.quantity;
                  const isNewItem = !!item.new_item_name;
                  
                  return (
                    <div key={itemId} className="itemCard" style={{ 
                      border: `2px solid ${hasQuantityChanged ? '#f59e0b' : '#e5e7eb'}`, 
                      borderRadius: '8px', 
                      padding: '15px', 
                      marginBottom: '15px',
                      backgroundColor: hasQuantityChanged ? '#fffbeb' : '#f9fafb'
                    }}>
                      <div 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          marginBottom: isExpanded ? '15px' : '0'
                        }}
                        onClick={() => toggleItemExpand(itemId)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                              Item #{index + 1}
                            </span>
                            {hasQuantityChanged && (
                              <span className="chip" style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#fef3c7', color: '#92400e' }}>
                                ADJUSTED
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                            {isNewItem ? item.new_item_name : item.item?.item_name || 'N/A'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: '15px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb' }}>
                            {formatCurrency(calculateNewTotal(item, itemId))}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {edit.adjusted_quantity} × {formatCurrency(item.unit_cost || 0)}
                          </div>
                        </div>
                        <i className={isExpanded ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} 
                           style={{ fontSize: '24px', color: '#6b7280' }}></i>
                      </div>

                      {isExpanded && (
                        <div style={{ 
                          paddingTop: '15px', 
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          {/* Item Details (Read-Only) */}
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>
                              <i className="ri-information-line"></i> Item Information
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '12px', color: '#6b7280' }}>Item Name</label>
                                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {isNewItem ? item.new_item_name : item.item?.item_name || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '12px', color: '#6b7280' }}>Supplier</label>
                                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {isNewItem ? item.new_supplier_name : item.supplier?.supplier_name || 'N/A'}
                                </div>
                              </div>
                              <div>
                                <label style={{ fontSize: '12px', color: '#6b7280' }}>Unit Cost</label>
                                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {formatCurrency(item.unit_cost || 0)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quantity Adjustment (Editable) */}
                          <div style={{ backgroundColor: '#fef3c7', padding: '15px', borderRadius: '6px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '15px', color: '#92400e' }}>
                              <i className="ri-edit-line"></i> Adjust Quantity
                            </h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 150px 1fr', gap: '15px', marginBottom: '15px' }}>
                              <div>
                                <label htmlFor={`orig_qty_${itemId}`} style={{ fontSize: '12px', color: '#92400e', display: 'block', marginBottom: '5px' }}>
                                  Original Quantity
                                </label>
                                <input
                                  id={`orig_qty_${itemId}`}
                                  type="number"
                                  value={item.quantity}
                                  disabled
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    backgroundColor: '#f3f4f6',
                                    cursor: 'not-allowed'
                                  }}
                                />
                              </div>
                              
                              <div>
                                <label htmlFor={`adj_qty_${itemId}`} style={{ fontSize: '12px', color: '#92400e', display: 'block', marginBottom: '5px' }}>
                                  Adjusted Quantity <span style={{ color: '#dc2626' }}>*</span>
                                </label>
                                <input
                                  id={`adj_qty_${itemId}`}
                                  type="number"
                                  min="0"
                                  value={edit.adjusted_quantity}
                                  onChange={(e) => handleItemQuantityChange(itemId, parseInt(e.target.value) || 0)}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '2px solid #f59e0b',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '12px', color: '#92400e', display: 'block', marginBottom: '5px' }}>
                                  New Total
                                </label>
                                <div style={{
                                  padding: '8px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fef3c7',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  color: '#92400e',
                                  border: '1px solid #fbbf24'
                                }}>
                                  {formatCurrency(calculateNewTotal(item, itemId))}
                                  {hasQuantityChanged && (
                                    <span style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '5px' }}>
                                      (was {formatCurrency(item.total_amount || 0)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <label htmlFor={`reason_${itemId}`} style={{ fontSize: '12px', color: '#92400e', display: 'block', marginBottom: '5px' }}>
                                Adjustment Reason 
                                {hasQuantityChanged && <span style={{ color: '#dc2626' }}> *Required</span>}
                              </label>
                              <textarea
                                id={`reason_${itemId}`}
                                value={edit.adjustment_reason}
                                onChange={(e) => handleItemReasonChange(itemId, e.target.value)}
                                placeholder="Explain why the quantity is being adjusted..."
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: hasQuantityChanged ? '2px solid #dc2626' : '1px solid #d1d5db',
                                  fontSize: '13px',
                                  fontFamily: 'inherit',
                                  backgroundColor: 'white'
                                }}
                              />
                              {hasQuantityChanged && !edit.adjustment_reason.trim() && (
                                <span style={{ fontSize: '11px', color: '#dc2626', marginTop: '5px', display: 'block' }}>
                                  <i className="ri-error-warning-line"></i> Adjustment reason is required when quantity changes
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                <i className="ri-shopping-cart-line" style={{ fontSize: '48px' }}></i>
                <p>No items in this purchase request</p>
              </div>
            )}
          </div>
        </div>

        <div className="modalButtons">
          <button type="button" className="secondaryButton" onClick={handleClose}>
            <i className="ri-close-line" /> Cancel
          </button>
          <button 
            type="button" 
            className="primaryButton" 
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <i className="ri-save-line" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPurchaseRequest;
