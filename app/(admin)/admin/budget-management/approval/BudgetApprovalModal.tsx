'use client';

import React, { useState } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemTableModal, { ItemField } from '@/Components/ItemTableModal';
import { formatMoney, formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import { BudgetItem, BudgetRequest } from './viewBudgetRequest';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/table.css';

interface BudgetApprovalModalProps {
  request: BudgetRequest;
  onClose: () => void;
  onApprove: (request: BudgetRequest) => Promise<void>;
  onReject: (request: BudgetRequest, reason: string) => Promise<void>;
}

export default function BudgetApprovalModal({
  request,
  onClose,
  onApprove,
  onReject
}: BudgetApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveAmount, setApproveAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);

  // Helper to convert BudgetItem[] to ItemField[]
  const mapItemsToTableFormat = (items?: BudgetItem[]): ItemField[] => {
    if (!items || items.length === 0) return [];
    return items.map(item => ({
      item_name: item.item_name,
      quantity: item.quantity,
      unit_measure: item.unit_measure,
      unit_cost: item.unit_cost,
      supplier_name: item.supplier,
      subtotal: item.subtotal
    }));
  };

  const handleApprove = async () => {
    // Validate approve amount
    const amount = parseFloat(approveAmount);
    if (!approveAmount || isNaN(amount) || amount <= 0) {
      showError("Please enter a valid approval amount.", "Invalid Amount");
      return;
    }

    if (amount > request.requested_amount) {
      const confirmHigher = await showConfirmation(
        `The approval amount (₱${amount.toLocaleString()}) is higher than the requested amount (₱${request.requested_amount.toLocaleString()}). Do you want to proceed?`,
        "Confirm Higher Amount"
      );
      if (!confirmHigher.isConfirmed) return;
    }

    const result = await showConfirmation(
      `Are you sure you want to <b>APPROVE</b> the budget request "${request.title}" with an amount of <b>₱${amount.toLocaleString()}</b>?`,
      "Approve Budget Request"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        await onApprove({ ...request, approved_amount: amount });
        showSuccess("Budget request has been approved successfully.", "Request Approved");
        onClose();
      } catch (error: any) {
        console.error("Approval error in modal:", error);
        showError(error.message || "Failed to approve budget request.", "Approval Failed");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showError("Please provide a reason for rejection.", "Rejection Reason Required");
      return;
    }

    const result = await showConfirmation(
      `Are you sure you want to <b>REJECT</b> the budget request "${request.title}"?`,
      "Reject Budget Request"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        await onReject(request, rejectionReason);
        showSuccess("Budget request has been rejected.", "Request Rejected");
        onClose();
      } catch (error: any) {
        console.error("Rejection error in modal:", error);
        showError(error.message || "Failed to reject budget request.", "Rejection Failed");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSubmit = () => {
    if (action === 'approve') {
      handleApprove();
    } else if (action === 'reject') {
      handleReject();
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalStandard">
        <ModalHeader
          title={`${action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Review'} Budget Request`}
          onClose={onClose}
        />
        <div className="modalContent">
          {!action ? (
            <div className="displayInputs">
              <div className="sectionHeader">Request Information</div>
              <div className="displayRow">
                <div className="displayField displayFieldHalf">
                  <label>Request Code</label>
                  <div className="displayValue highlightValue">{request.request_id}</div>
                </div>
                <div className="displayField displayFieldHalf">
                  <label>Date of Request</label>
                  <div className="displayValue">{formatDate(request.request_date)}</div>
                </div>
              </div>
              <div className="displayRow">
                <div className="displayField displayFieldHalf">
                  <label>Department</label>
                  <div className="displayValue">{request.department || 'Operations'}</div>
                </div>
                <div className="displayField displayFieldHalf">
                  <label>Requested By</label>
                  <div className="displayValue">{request.requested_by}</div>
                </div>
              </div>
              <div className="displayRow">
                <div className="displayField displayFieldHalf">
                  <label>Request Type</label>
                  <div className="displayValue">
                    <span className={`chip ${request.requested_type === 'Emergency' ? 'emergency' :
                        request.requested_type === 'Urgent' ? 'urgent' :
                          'regular'
                      }`}>
                      {request.requested_type}
                    </span>
                  </div>
                </div>
                <div className="displayField displayFieldHalf">
                  <label>Category</label>
                  <div className="displayValue">{request.category}</div>
                </div>
              </div>
              <div className="sectionHeader">Budget Details</div>
              <div className="displayField">
                <label>Budget Title / Project Name</label>
                <div className="displayValue highlightValue">{request.title}</div>
              </div>
              <div className="displayField">
                <label>Description</label>
                <div className="displayValue displayValueTextarea">{request.description}</div>
              </div>
              <div className="displayRow">
                <div className="displayField displayFieldHalf">
                  <label>Budget Period</label>
                  <div className="displayValue">{request.budget_period || 'One Time Use'}</div>
                </div>
                <div className="displayField displayFieldHalf">
                  <label>Requested Amount</label>
                  <div className="displayValue highlightValue">{formatMoney(request.requested_amount)}</div>
                </div>
              </div>
              {request.items && request.items.length > 0 && (
                <div className="itemsDisplaySection">
                  <div className="sectionHeader">Budget Items ({request.items.length})</div>
                  <ItemTableModal
                    isOpen={true}
                    onClose={() => { }}
                    mode="view"
                    title="Budget Items"
                    items={mapItemsToTableFormat(request.items)}
                    isLinkedToPurchaseRequest={false}
                    embedded={true}
                  />
                </div>
              )}
              <div className="modalButtons" style={{ marginTop: '20px' }}>
                <button
                  className="approveButton"
                  onClick={() => {
                    setAction('approve');
                    setApproveAmount(request.requested_amount.toString());
                  }}
                  disabled={isProcessing}
                >
                  <i className="ri-check-line"></i>
                  Approve Request
                </button>
                <button
                  className="rejectButton"
                  onClick={() => setAction('reject')}
                  disabled={isProcessing}
                >
                  <i className="ri-close-line"></i>
                  Reject Request
                </button>
                <button
                  className="cancelButton"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : action === 'approve' ? (
            // Approval confirmation
            <>
              <div className="sectionTitle">Confirm Approval</div>

              <div className="formFieldsHorizontal">
                <div className="formField">
                  <label>Requested Amount</label>
                  <div className="viewField">{formatMoney(request.requested_amount)}</div>
                </div>

                <div className="formField">
                  <label>Approve Amount <span className="requiredTags">*</span></label>
                  <input
                    type="number"
                    value={approveAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Limit to 15 characters (max ~999,999,999,999.99)
                      if (value.length <= 15) {
                        setApproveAmount(value);
                      }
                    }}
                    placeholder="Enter approval amount"
                    min="0"
                    max="999999.99"
                    step="0.01"
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                  <small style={{ color: 'var(--secondary-text-color)', fontSize: '12px' }}>
                    Default is requested amount. Maximum 15 characters.
                  </small>
                </div>
              </div>

              <div className="modalButtons">
                <button
                  className="approveButton"
                  onClick={handleSubmit}
                  disabled={isProcessing || !approveAmount || parseFloat(approveAmount) <= 0}
                >
                  {isProcessing ? 'Processing...' : 'Confirm Approval'}
                </button>
                <button
                  className="cancelButton"
                  onClick={() => setAction(null)}
                  disabled={isProcessing}
                >
                  Back
                </button>
              </div>
            </>
          ) : (
            // Rejection form
            <>
              <div className="sectionTitle">Rejection Reason</div>
              <div className="formField full-width">
                <label>Reason for Rejection <span className="requiredTags">*</span></label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a detailed reason for rejecting this budget request..."
                  rows={4}
                  required
                />
              </div>

              <div className="modalButtons">
                <button
                  className="rejectButton"
                  onClick={handleSubmit}
                  disabled={isProcessing || !rejectionReason.trim()}
                >
                  {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                </button>
                <button
                  className="cancelButton"
                  onClick={() => setAction(null)}
                  disabled={isProcessing}
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}