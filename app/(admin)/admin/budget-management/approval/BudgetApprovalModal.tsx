'use client';

import React, { useState } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemTableModal, { ItemField } from '../../../../Components/ItemTableModal';
import { formatMoney, formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/table.css';

interface BudgetItem {
  item_name: string;
  quantity: number;
  unit_measure: string;
  unit_cost: number;
  supplier: string;
  subtotal: number;
  type: 'supply' | 'service';
}

interface BudgetRequest {
  request_id: string;
  title: string;
  description: string;
  requested_amount: number;
  approved_amount?: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Closed';
  category: string;
  requested_by: string;
  request_date: string;
  department: string;
  requested_type: 'Emergency' | 'Urgent' | 'Regular' | 'Project-Based';
  approval_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at?: string;
  requester_position?: string;
  budget_period?: string;
  start_date?: string;
  end_date?: string;
  items?: BudgetItem[];
}

interface BudgetApprovalModalProps {
  request: BudgetRequest;
  onClose: () => void;
  onApprove: (request: BudgetRequest) => void;
  onReject: (request: BudgetRequest, reason: string) => void;
}

export default function BudgetApprovalModal({
  request,
  onClose,
  onApprove,
  onReject
}: BudgetApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);

  const handleApprove = async () => {
    const result = await showConfirmation(
      `Are you sure you want to <b>APPROVE</b> the budget request "${request.title}"?`,
      "Approve Budget Request"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        onApprove(request);
        showSuccess("Budget request has been approved successfully.", "Request Approved");
        onClose();
      } catch (error) {
        showError("Failed to approve budget request.", "Approval Failed");
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
        onReject(request, rejectionReason);
        showSuccess("Budget request has been rejected.", "Request Rejected");
        onClose();
      } catch (error) {
        showError("Failed to reject budget request.", "Rejection Failed");
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

                <div className="formField full-width">
                  <label>Description</label>
                  <div className="viewField">{request.description}</div>
                </div>

                <div className="formField">
                  <label>Category</label>
                  <div className="viewField">{request.category}</div>
                </div>

                <div className="formField">
                  <label>Requested Amount</label>
                  <div className="viewField">{formatMoney(request.requested_amount)}</div>
                </div>

                <div className="formField">
                  <label>Requested By</label>
                  <div className="viewField">{request.requested_by}</div>
                </div>

                <div className="formField">
                  <label>Request Date</label>
                  <div className="viewField">{formatDate(request.request_date)}</div>
                </div>

                <div className="formField">
                  <label>Department</label>
                  <div className="viewField">{request.department || 'N/A'}</div>
                </div>

                <div className="formField">
                  <label>Requested Type</label>
                  <div className="viewField">
                    <span className={`chip ${
                      request.requested_type === 'Emergency' ? 'emergency' : 
                      request.requested_type === 'Urgent' ? 'urgent' : 
                      'regular'
                    }`}>
                      {request.requested_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Budget Items Button */}
              {request.items && request.items.length > 0 && (
                <>
                  <div className="sectionTitle">Budget Items</div>
                  <div className="formFieldsHorizontal">
                    <div className="formField full-width">
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={() => setShowItemsModal(true)}
                      >
                        <i className="ri-list-check" />
                        View Budget Items ({request.items.length})
                      </button>
                    </div>
                  </div>
                </>
              )}

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
              <p>Are you sure you want to approve this budget request? This action cannot be undone.</p>

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

      {/* ItemTableModal for viewing budget items */}
      {showItemsModal && request.items && (
        <ItemTableModal
          isOpen={showItemsModal}
          onClose={() => setShowItemsModal(false)}
          mode="view"
          title="Budget Items"
          items={request.items.map((item): ItemField => ({
            item_name: item.item_name,
            quantity: item.quantity,
            unit_measure: item.unit_measure,
            unit_price: item.unit_cost,
            supplier_name: item.supplier,
            subtotal: item.subtotal
          }))}
          isLinkedToPurchaseRequest={false}
        />
      )}
    </div>
  );
}