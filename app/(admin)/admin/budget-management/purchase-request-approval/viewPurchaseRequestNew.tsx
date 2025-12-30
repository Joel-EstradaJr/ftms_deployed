'use client';

import React, { useState } from 'react';
import "../../../../styles/components/modal2.css";
import "../../../../styles/components/forms.css";
import { formatDate } from '../../../../utils/formatting';
import type { PurchaseRequestApproval, PurchaseRequestItem } from '../../../../types/purchaseRequestApproval';

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
    return type.replace(/_/g, ' ').toUpperCase();
  };

  // Helper to check if item is new (not from inventory)
  const isNewItem = (item: PurchaseRequestItem) => {
    return !!item.new_item || !!item.new_item_name;
  };

  // Get item name (existing or new)
  const getItemName = (item: PurchaseRequestItem) => {
    return item.item?.item_name || item.new_item || item.new_item_name || 'N/A';
  };

  // Get supplier name (existing or new)
  const getSupplierName = (item: PurchaseRequestItem) => {
    return item.supplier?.supplier_name || item.new_supplier || item.new_supplier_name || 'N/A';
  };

  // Get unit price
  const getUnitPrice = (item: PurchaseRequestItem) => {
    return item.supplier_item?.unit_price || item.new_unit_price || item.unit_cost || 0;
  };

  // Calculate total amount
  const getTotalAmount = (item: PurchaseRequestItem) => {
    const quantity = item.adjusted_quantity || item.quantity;
    const unitPrice = getUnitPrice(item);
    return quantity * unitPrice;
  };

  return (
    <>
      {/* Close Button */}
      <button className="close-modal-btn view" onClick={onClose}>
        <i className="ri-close-line"></i>
      </button>

      {/* Modal Header */}
      <div className="modal-heading">
        <h2 className="modal-title">View Purchase Request</h2>
      </div>

      {/* Modal Content */}
      <div className="modal-content-wrapper">
          {/* PURCHASE REQUEST SECTION */}
          <div className="purchase-request-section">
            <div className="section-title">
              <i className="ri-file-text-line"></i>
              PURCHASE REQUEST SECTION
            </div>

            <div className="pr-details-grid">
              <div className="form-group">
                <label>CODE</label>
                <p>{purchaseRequest.purchase_request_code}</p>
              </div>

              <div className="form-group">
                <label>DEPARTMENT</label>
                <p>{purchaseRequest.requestor?.department_name || purchaseRequest.department_name || 'N/A'}</p>
              </div>

              <div className="form-group">
                <label>TYPE</label>
                <p>
                  <span className={`chip ${(purchaseRequest.type || purchaseRequest.request_type || '').toLowerCase()}`}>
                    {formatRequestType(purchaseRequest.type || String(purchaseRequest.request_type) || 'REGULAR')}
                  </span>
                </p>
              </div>

              <div className="form-group">
                <label>STATUS</label>
                <p>
                  <span className={`chip ${(purchaseRequest.status || purchaseRequest.purchase_request_status || '').toLowerCase()}`}>
                    {(purchaseRequest.status || purchaseRequest.purchase_request_status || 'PENDING').toUpperCase()}
                  </span>
                </p>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>REASON</label>
                <p>{purchaseRequest.reason}</p>
              </div>

              <div className="form-group">
                <label>TOTAL AMOUNT</label>
                <p style={{ fontSize: '1.1em', fontWeight: '700', color: 'var(--primary-color)' }}>
                  {formatCurrency(purchaseRequest.total_amount)}
                </p>
              </div>

              {purchaseRequest.finance_remarks && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>FINANCE REMARKS</label>
                  <p style={{ color: 'var(--info-color)' }}>{purchaseRequest.finance_remarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* ITEM SECTION */}
          <div className="purchase-items-section">
            <div className="section-title">
              <i className="ri-shopping-cart-line"></i>
              ITEM SECTION ({purchaseRequest.items?.length || 0} items)
            </div>

            {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
              <div>
                {purchaseRequest.items.map((item, index) => {
                  const itemId = item.purchase_request_item_code || item.purchase_request_item_id || `item-${index}`;
                  const isExpanded = expandedItems.has(itemId);
                  const isNew = isNewItem(item);

                  return (
                    <div key={itemId} className="modal-content" style={{ marginBottom: '16px' }}>
                      <div className="item-card">
                        <div className="item-card-header" onClick={() => toggleItemExpand(itemId)}>
                          <div className="item-card-header-left">
                            <span className="item-number">#{index + 1}</span>
                            <span className="item-name">{getItemName(item)}</span>
                            {isNew && <span className="new-item-badge">NEW ITEM</span>}
                          </div>
                          <i className={`ri-arrow-down-s-line item-expand-icon ${isExpanded ? 'expanded' : ''}`}></i>
                        </div>

                        {isExpanded && (
                          <div className="item-card-body">
                            {/* Row 1: Item & Supplier Info */}
                            <div className="item-detail-group">
                              <div className="form-group">
                                <label>ITEM CODE</label>
                                <p>{item.item_code || 'N/A'}</p>
                              </div>

                              <div className="form-group">
                                <label>ITEM NAME</label>
                                <p>{getItemName(item)}</p>
                              </div>

                              <div className="form-group">
                                <label>UNIT MEASURE</label>
                                <p>
                                  {item.item?.unit?.unit_name || 
                                   item.item?.unit?.abbreviation || 
                                   item.new_unit || 
                                   'N/A'}
                                </p>
                              </div>
                            </div>

                            <div className="item-detail-group">
                              <div className="form-group">
                                <label>SUPPLIER CODE</label>
                                <p>{item.supplier_code || 'N/A'}</p>
                              </div>

                              <div className="form-group">
                                <label>SUPPLIER NAME</label>
                                <p>{getSupplierName(item)}</p>
                              </div>

                              <div className="form-group">
                                <label>SUPPLIER UNIT MEASURE</label>
                                <p>
                                  {item.supplier_item?.supplier_unit?.unit_name || 
                                   item.supplier_item?.supplier_unit?.abbreviation || 
                                   item.new_unit || 
                                   'N/A'}
                                </p>
                              </div>
                            </div>

                            {/* Row 2: Pricing & Quantities */}
                            <div className="item-detail-group">
                              <div className="form-group">
                                <label>CONVERSION</label>
                                <p>{item.supplier_item?.conversion_amount || 1}</p>
                              </div>

                              <div className="form-group">
                                <label>UNIT PRICE</label>
                                <p>{formatCurrency(getUnitPrice(item))}</p>
                              </div>

                              <div className="form-group">
                                <label>QUANTITY</label>
                                <p>{item.quantity}</p>
                              </div>

                              {item.adjusted_quantity && (
                                <div className="form-group">
                                  <label>ADJUSTED QUANTITY</label>
                                  <p style={{ color: 'var(--warning-color)', fontWeight: '600' }}>
                                    {item.adjusted_quantity}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Row 3: Status & Additional Info */}
                            <div className="item-detail-group">
                              <div className="form-group">
                                <label>STATUS</label>
                                <p>
                                  <span className={`chip ${(item.status || '').toLowerCase()}`}>
                                    {item.status || 'PENDING'}
                                  </span>
                                </p>
                              </div>

                              {item.remarks && (
                                <div className="form-group">
                                  <label>REMARKS</label>
                                  <p>{item.remarks}</p>
                                </div>
                              )}

                              {item.adjustment_reason && (
                                <div className="form-group">
                                  <label>ADJUSTMENT REASON</label>
                                  <p style={{ color: 'var(--warning-color)' }}>
                                    {item.adjustment_reason}
                                  </p>
                                </div>
                              )}

                              {item.attachment_id && (
                                <div className="form-group">
                                  <label>ATTACHMENT FILE</label>
                                  <div className="view-document-item link">
                                    <i className="ri-file-line"></i>
                                    <span>Attachment #{item.attachment_id}</span>
                                  </div>
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
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--secondary-text-color)' }}>
                <i className="ri-shopping-cart-2-line" style={{ fontSize: '48px', opacity: 0.3 }}></i>
                <p>No items in this purchase request</p>
              </div>
            )}
          </div>
        </div>

      {/* Modal Actions */}
      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  );
};

export default ViewPurchaseRequest;
