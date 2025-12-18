'use client';

import React, { useState } from 'react';
//@ts-ignore
import "../../../../styles/budget-management/addBudgetRequest.css";
//@ts-ignore
import "../../../../styles/components/modal.css";
import { formatDate } from '../../../../utils/formatting';
import ModalHeader from '../../../../Components/ModalHeader';
import type { PurchaseRequestApproval } from '../../../../types/purchaseRequestApproval';

// Types
interface ViewPurchaseRequestProps {
  purchaseRequest: PurchaseRequestApproval;
  onClose: () => void;
}

const ViewPurchaseRequest: React.FC<ViewPurchaseRequestProps> = ({
  purchaseRequest,
  onClose
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItemExpand = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatRequestType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  return (
    <div className="modalOverlay">
      <div className="addBudgetRequestModal" style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', minWidth: '900px' }}>
        <ModalHeader 
          title={`View Purchase Request - ${purchaseRequest.purchase_request_code}`}
          onClose={onClose} 
          showDateTime={true} 
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* SECTION I: REQUEST INFORMATION */}
          <div className="modalContent">
            <div className="sectionHeader">
              <i className="ri-file-text-line"></i> Section I: Request Information
            </div>
            
            {/* Requestor Information */}
            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Request Code</label>
                <div className="viewOnlyField">{purchaseRequest.purchase_request_code}</div>
              </div>
              <div className="formField formFieldHalf">
                <label>Request Status</label>
                <div className="viewOnlyField">
                  <span className={`chip ${(purchaseRequest.purchase_request_status || 'PENDING').toLowerCase()}`}>
                    {purchaseRequest.purchase_request_status || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Requestor Name</label>
                <div className="viewOnlyField">
                  {purchaseRequest.requestor?.employee_name || 'N/A'}
                </div>
              </div>
              <div className="formField formFieldHalf">
                <label>Employee ID</label>
                <div className="viewOnlyField">
                  {purchaseRequest.requestor?.employee_id || 'N/A'}
                </div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Position</label>
                <div className="viewOnlyField">
                  {purchaseRequest.requestor?.position || 'N/A'}
                </div>
              </div>
              <div className="formField formFieldHalf">
                <label>Department</label>
                <div className="viewOnlyField">
                  {purchaseRequest.department_name || purchaseRequest.requestor?.department_name || 'N/A'}
                </div>
              </div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Contact Number</label>
                <div className="viewOnlyField">
                  {purchaseRequest.requestor?.contact_no || 'N/A'}
                </div>
              </div>
              <div className="formField formFieldHalf">
                <label>Email Address</label>
                <div className="viewOnlyField">
                  {purchaseRequest.requestor?.email_address || 'N/A'}
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="formRow" style={{ marginTop: '20px' }}>
              <div className="formField formFieldHalf">
                <label>Request Type</label>
                <div className="viewOnlyField">
                  <span className={`chip ${(purchaseRequest.request_type || 'REGULAR').toLowerCase()}`}>
                    {formatRequestType(purchaseRequest.request_type || 'REGULAR')}
                  </span>
                </div>
              </div>
              <div className="formField formFieldHalf">
                <label>Request Date</label>
                <div className="viewOnlyField">
                  {formatDate(purchaseRequest.created_at)}
                </div>
              </div>
            </div>

            <div className="formField">
              <label>Reason for Request</label>
              <div className="viewOnlyField multiline">{purchaseRequest.reason}</div>
            </div>

            <div className="formRow">
              <div className="formField formFieldHalf">
                <label>Total Amount</label>
                <div className="viewOnlyField" style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#2563eb' }}>
                  {formatCurrency(purchaseRequest.total_amount)}
                </div>
              </div>
              <div className="formField formFieldHalf">
                <label>Total Items</label>
                <div className="viewOnlyField">
                  {purchaseRequest.items?.length || 0} item(s)
                </div>
              </div>
            </div>

            {/* Approval Information (if applicable) */}
            {(purchaseRequest.approved_by || purchaseRequest.rejected_by) && (
              <>
                <div className="formRow" style={{ marginTop: '20px' }}>
                  {purchaseRequest.approved_by && (
                    <>
                      <div className="formField formFieldHalf">
                        <label>Approved By</label>
                        <div className="viewOnlyField">{purchaseRequest.approved_by}</div>
                      </div>
                      <div className="formField formFieldHalf">
                        <label>Approved Date</label>
                        <div className="viewOnlyField">
                          {purchaseRequest.approved_date ? formatDate(purchaseRequest.approved_date) : 'N/A'}
                        </div>
                      </div>
                    </>
                  )}
                  {purchaseRequest.rejected_by && (
                    <>
                      <div className="formField formFieldHalf">
                        <label>Rejected By</label>
                        <div className="viewOnlyField">{purchaseRequest.rejected_by}</div>
                      </div>
                      <div className="formField formFieldHalf">
                        <label>Rejected Date</label>
                        <div className="viewOnlyField">
                          {purchaseRequest.rejected_date ? formatDate(purchaseRequest.rejected_date) : 'N/A'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {purchaseRequest.rejection_reason && (
                  <div className="formField">
                    <label>Rejection Reason</label>
                    <div className="viewOnlyField multiline" style={{ color: '#dc2626' }}>
                      {purchaseRequest.rejection_reason}
                    </div>
                  </div>
                )}
                {purchaseRequest.finance_remarks && (
                  <div className="formField">
                    <label>Finance Remarks</label>
                    <div className="viewOnlyField multiline" style={{ color: '#16a34a' }}>
                      {purchaseRequest.finance_remarks}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* SECTION II: ITEMS */}
          <div className="modalContent">
            <div className="sectionHeader">
              <i className="ri-shopping-cart-line"></i> Section II: Requested Items
            </div>
            
            {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
              <div className="itemsList">
                {purchaseRequest.items.map((item, index) => {
                  const itemId = item.purchase_request_item_id || `item-${index}`;
                  const isExpanded = expandedItems.has(itemId);
                  const isNewItem = !!item.new_item_name;
                  
                  return (
                    <div key={itemId} className="itemCard" style={{ 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      padding: '15px', 
                      marginBottom: '15px',
                      backgroundColor: '#f9fafb'
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
                            {isNewItem && (
                              <span className="chip" style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                                NEW ITEM
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '5px' }}>
                            {isNewItem ? item.new_item_name : item.item?.item_name || 'N/A'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: '15px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb' }}>
                            {formatCurrency(item.total_amount || 0)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {item.quantity} × {formatCurrency(item.unit_cost || 0)}
                          </div>
                        </div>
                        <i className={isExpanded ? "ri-arrow-up-s-line" : "ri-arrow-down-s-line"} 
                           style={{ fontSize: '24px', color: '#6b7280' }}></i>
                      </div>

                      {isExpanded && (
                        <div style={{ 
                          paddingTop: '15px', 
                          borderTop: '1px solid #e5e7eb',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '15px'
                        }}>
                          {/* Item Details */}
                          <div>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>
                              <i className="ri-information-line"></i> Item Details
                            </h4>
                            <div className="formField">
                              <label>Item Name</label>
                              <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                {isNewItem ? item.new_item_name : item.item?.item_name || 'N/A'}
                              </div>
                            </div>
                            {!isNewItem && item.item?.item_code && (
                              <div className="formField">
                                <label>Item Code</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {item.item.item_code}
                                </div>
                              </div>
                            )}
                            {!isNewItem && item.item?.description && (
                              <div className="formField">
                                <label>Description</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {item.item.description}
                                </div>
                              </div>
                            )}
                            {!isNewItem && item.item?.category && (
                              <div className="formField">
                                <label>Category</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {item.item.category.category_name}
                                </div>
                              </div>
                            )}
                            {!isNewItem && item.item?.unit && (
                              <div className="formField">
                                <label>Unit of Measure</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {item.item.unit.unit_name}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Supplier Details */}
                          <div>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>
                              <i className="ri-building-line"></i> Supplier Details
                            </h4>
                            <div className="formField">
                              <label>Supplier Name</label>
                              <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                {isNewItem ? item.new_supplier_name : item.supplier?.supplier_name || 'N/A'}
                              </div>
                            </div>
                            {!isNewItem && item.supplier?.supplier_code && (
                              <div className="formField">
                                <label>Supplier Code</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {item.supplier.supplier_code}
                                </div>
                              </div>
                            )}
                            <div className="formField">
                              <label>Contact Person</label>
                              <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                {isNewItem ? item.new_supplier_contact_person : item.supplier?.contact_person || 'N/A'}
                              </div>
                            </div>
                            <div className="formField">
                              <label>Contact Number</label>
                              <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                {isNewItem ? item.new_supplier_contact : item.supplier?.contact_number || 'N/A'}
                              </div>
                            </div>
                            {(isNewItem ? item.new_supplier_email : item.supplier?.email) && (
                              <div className="formField">
                                <label>Email</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {isNewItem ? item.new_supplier_email : item.supplier?.email || 'N/A'}
                                </div>
                              </div>
                            )}
                            {(isNewItem ? item.new_supplier_address : item.supplier?.address) && (
                              <div className="formField">
                                <label>Address</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {isNewItem ? item.new_supplier_address : item.supplier?.address || 'N/A'}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quantity and Pricing - Full Width */}
                          <div style={{ gridColumn: '1 / -1' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>
                              <i className="ri-money-dollar-circle-line"></i> Quantity & Pricing
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                              <div className="formField">
                                <label>Requested Quantity</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px', fontWeight: 'bold' }}>
                                  {item.quantity}
                                </div>
                              </div>
                              <div className="formField">
                                <label>Unit Cost</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px' }}>
                                  {formatCurrency(item.unit_cost || 0)}
                                </div>
                              </div>
                              <div className="formField">
                                <label>Total Amount</label>
                                <div className="viewOnlyField" style={{ fontSize: '13px', fontWeight: 'bold', color: '#2563eb' }}>
                                  {formatCurrency(item.total_amount || 0)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Adjustment Information (if exists) */}
                          {(item.adjusted_quantity || item.adjustment_reason) && (
                            <div style={{ gridColumn: '1 / -1', backgroundColor: '#fef3c7', padding: '10px', borderRadius: '6px' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: '#92400e' }}>
                                <i className="ri-edit-line"></i> Adjustment Information
                              </h4>
                              {item.adjusted_quantity && (
                                <div className="formField">
                                  <label>Adjusted Quantity</label>
                                  <div className="viewOnlyField" style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e' }}>
                                    {item.adjusted_quantity} (Original: {item.quantity})
                                  </div>
                                </div>
                              )}
                              {item.adjustment_reason && (
                                <div className="formField">
                                  <label>Adjustment Reason</label>
                                  <div className="viewOnlyField" style={{ fontSize: '13px', color: '#92400e' }}>
                                    {item.adjustment_reason}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
          <button type="button" className="secondaryButton" onClick={onClose}>
            <i className="ri-close-line" /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPurchaseRequest;