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
      `Are you sure you want to <b>APPROVE</b> the purchase request "${request.purchase_request_code}"?`,
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
      `Are you sure you want to <b>REJECT</b> the purchase request "${request.purchase_request_code}"?`,
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
  const itemTableItems = (request.items || []).map(item => ({
    item_name: item.item?.item_name || item.new_item || item.new_item_name || 'N/A',
    quantity: item.quantity,
    unit_measure: item.item?.unit?.unit_name || item.new_unit || 'N/A',
    unit_cost: item.unit_cost || item.supplier_item?.unit_price || item.new_unit_price || item.new_unit_cost || 0,
    supplier: item.supplier?.supplier_name || item.new_supplier || item.new_supplier_name || 'N/A',
    subtotal: item.total_amount || (item.quantity * (item.unit_cost || item.supplier_item?.unit_price || item.new_unit_price || item.new_unit_cost || 0)),
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
                  <div className="viewField">{request.purchase_request_code}</div>
                </div>

                <div className="formField full-width">
                  <label>Reason</label>
                  <div className="viewField">{request.reason}</div>
                </div>

                <div className="formField">
                  <label>Department</label>
                  <div className="viewField">{request.requestor?.department_name || request.department_name || 'N/A'}</div>
                </div>

                <div className="formField">
                  <label>Supplier</label>
                  <div className="viewField">{request.items?.[0]?.supplier?.supplier_name || request.items?.[0]?.new_supplier || 'Multiple/N/A'}</div>
                </div>

                <div className="formField">
                  <label>Total Amount</label>
                  <div className="viewField">{formatMoney(request.total_amount)}</div>
                </div>

                <div className="formField">
                  <label>Type</label>
                  <div className="viewField">
                    <span className={`chip ${request.request_type === 'EMERGENCY' || request.request_type === 'URGENT' || request.type === 'EMERGENCY' || request.type === 'URGENT' ? 'error' : 'info'}`}>
                      {request.request_type || request.type || 'REGULAR'}
                    </span>
                  </div>
                </div>

                <div className="formField">
                  <label>Requester</label>
                  <div className="viewField">{request.requestor?.employee_name || `${request.requestor?.first_name || ''} ${request.requestor?.last_name || ''}`.trim() || 'N/A'}</div>
                </div>

                <div className="formField">
                  <label>Position</label>
                  <div className="viewField">{request.requestor?.position_name || request.requestor?.position || 'N/A'}</div>
                </div>

                <div className="formField">
                  <label>Request Date</label>
                  <div className="viewField">{formatDate(request.created_at)}</div>
                </div>

                {request.finance_remarks && (
                  <div className="formField full-width">
                    <label>Finance Remarks</label>
                    <div className="viewField">{request.finance_remarks}</div>
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