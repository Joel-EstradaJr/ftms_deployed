'use client';

import React, { useState } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemTable from '../../../../Components/itemTable';
import { formatMoney, formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/table.css';

// Import the correct types
import type { PurchaseRequestApproval, PurchaseRequestItem } from '../../../../types/purchaseRequestApproval';

interface PurchaseApprovalModalProps {
  request: PurchaseRequestApproval;
  onClose: () => void;
  onApprove: (request: PurchaseRequestApproval) => void;
  onReject: (request: PurchaseRequestApproval, reason: string) => void;
}

export default function PurchaseApprovalModal({
  request,
  onClose,
  onApprove,
  onReject
}: PurchaseApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async () => {
    const result = await showConfirmation(
      `Are you sure you want to <b>APPROVE</b> the purchase request "${request.title}"?`,
      "Approve Purchase Request"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        onApprove(request);
        showSuccess("Purchase request has been approved successfully.", "Request Approved");
        onClose();
      } catch (error) {
        showError("Failed to approve purchase request.", "Approval Failed");
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
      `Are you sure you want to <b>REJECT</b> the purchase request "${request.title}"?`,
      "Reject Purchase Request"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        onReject(request, rejectionReason);
        showSuccess("Purchase request has been rejected.", "Request Rejected");
        onClose();
      } catch (error) {
        showError("Failed to reject purchase request.", "Rejection Failed");
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

  // Convert purchase items to Item format for ItemTable
  const itemTableItems = request.items.map(item => ({
    item_name: item.item_name,
    quantity: item.quantity,
    unit_measure: item.unit_measure,
    unit_cost: item.unit_cost,
    supplier: item.supplier || 'N/A', // Handle optional supplier
    subtotal: item.total_cost,
    type: 'supply' as const
  }));

  return (
    <div className="modalOverlay">
      <div className="modalStandard">
        <ModalHeader
          title={`${action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Review'} Purchase Request`}
          onClose={onClose}
        />

        <div className="modalContent">
          {!action ? (
            // Initial review screen
            <>
              <div className="sectionTitle">Request Details</div>

              <div className="formFieldsHorizontal">
                <div className="formField full-width">
                  <label>Request ID</label>
                  <div className="viewField">{request.request_id}</div>
                </div>

                <div className="formField full-width">
                  <label>Title</label>
                  <div className="viewField">{request.title}</div>
                </div>

                <div className="formField">
                  <label>Department</label>
                  <div className="viewField">{request.department.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</div>
                </div>

                <div className="formField">
                  <label>Supplier</label>
                  <div className="viewField">{request.supplier_name}</div>
                </div>

                <div className="formField">
                  <label>Total Amount</label>
                  <div className="viewField">{formatMoney(request.total_amount)}</div>
                </div>

                <div className="formField">
                  <label>Priority</label>
                  <div className="viewField">
                    <span className={`chip ${request.priority === 'urgent' ? 'error' : 'info'}`}>
                      {request.priority === 'urgent' ? 'High' : 'Normal'}
                    </span>
                  </div>
                </div>

                <div className="formField">
                  <label>Requester</label>
                  <div className="viewField">{request.requester_name}</div>
                </div>

                <div className="formField">
                  <label>Position</label>
                  <div className="viewField">{request.requester_position}</div>
                </div>

                <div className="formField">
                  <label>Request Date</label>
                  <div className="viewField">{formatDate(request.request_date)}</div>
                </div>

                {request.purpose && (
                  <div className="formField full-width">
                    <label>Purpose</label>
                    <div className="viewField">{request.purpose}</div>
                  </div>
                )}

                {request.justification && (
                  <div className="formField full-width">
                    <label>Justification</label>
                    <div className="viewField">{request.justification}</div>
                  </div>
                )}
              </div>

              {/* Purchase Items Table */}
              <div className="sectionTitle">Purchase Items</div>
              <ItemTable
                items={itemTableItems}
                onItemsChange={() => {}} // Read-only
                showItems={true}
                onToggleItems={() => {}}
                readOnly={true}
                title=""
              />

              <div className="modalButtons">
                <button
                  className="approveButton"
                  onClick={() => setAction('approve')}
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
            </>
          ) : action === 'approve' ? (
            // Approval confirmation
            <>
              <div className="sectionTitle">Confirm Approval</div>
              <p>Are you sure you want to approve this purchase request? This action cannot be undone.</p>

              <div className="modalButtons">
                <button
                  className="approveButton"
                  onClick={handleSubmit}
                  disabled={isProcessing}
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
                  placeholder="Please provide a detailed reason for rejecting this purchase request..."
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