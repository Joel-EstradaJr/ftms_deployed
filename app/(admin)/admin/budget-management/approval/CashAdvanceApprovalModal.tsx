'use client';

import React, { useState, useEffect } from 'react';
import ModalHeader from '../../../../Components/ModalHeader';
import { formatMoney, formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/forms.css';

import { CashAdvanceRequest } from './ViewCashAdvanceModal';

interface CashAdvanceApprovalModalProps {
  request: CashAdvanceRequest;
  onClose: () => void;
  onApprove: (request: CashAdvanceRequest, approvedAmount: number) => void;
  onReject: (request: CashAdvanceRequest, reason: string) => void;
}

export default function CashAdvanceApprovalModal({
  request,
  onClose,
  onApprove,
  onReject
}: CashAdvanceApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(request.requested_amount);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAmountWarning, setShowAmountWarning] = useState(false);

  // Check if approved amount exceeds requested amount
  useEffect(() => {
    setShowAmountWarning(approvedAmount > request.requested_amount);
  }, [approvedAmount, request.requested_amount]);

  // Get request type class for chip styling
  const getRequestTypeClass = (type: string) => {
    switch (type) {
      case 'Regular': return 'normal';
      case 'Urgent': return 'urgent';
      case 'Emergency': return 'rejected';
      default: return 'normal';
    }
  };

  // Format contact info for display
  const formatContactInfo = () => {
    const hasPhone = request.contact_number && request.contact_number.trim() !== '';
    const hasEmail = request.email && request.email.trim() !== '';

    if (hasPhone && hasEmail) {
      return `${request.contact_number} | ${request.email}`;
    } else if (hasPhone) {
      return request.contact_number;
    } else if (hasEmail) {
      return request.email;
    } else {
      return 'N/A';
    }
  };

  const handleApprove = async () => {
    if (approvedAmount <= 0) {
      showError("Approved amount must be greater than zero.", "Invalid Amount");
      return;
    }

    const warningText = showAmountWarning 
      ? `<br/><br/><span style="color: #f39c12;">⚠️ Note: Approved amount (${formatMoney(approvedAmount)}) exceeds requested amount (${formatMoney(request.requested_amount)})</span>`
      : '';

    const result = await showConfirmation(
      `Are you sure you want to <b>APPROVE</b> this cash advance request for <b>${formatMoney(approvedAmount)}</b>?${warningText}`,
      "Approve Cash Advance"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        onApprove(request, approvedAmount);
        showSuccess("Cash advance request has been approved successfully.", "Request Approved");
        onClose();
      } catch (error) {
        showError("Failed to approve cash advance request.", "Approval Failed");
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
      `Are you sure you want to <b>REJECT</b> this cash advance request from <b>${request.employee_name}</b>?`,
      "Reject Cash Advance"
    );

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        onReject(request, rejectionReason);
        showSuccess("Cash advance request has been rejected.", "Request Rejected");
        onClose();
      } catch (error) {
        showError("Failed to reject cash advance request.", "Rejection Failed");
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
          title={`${action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Review'} Cash Advance Request`}
          onClose={onClose}
        />

        <div className="modalContent">
          {!action ? (
            // Initial review screen
            <>
              <div className="sectionTitle">Request Details</div>

              <div className="formFieldsHorizontal">
                <div className="formField">
                  <label>Request ID</label>
                  <div className="viewField">{request.request_id}</div>
                </div>

                <div className="formField">
                  <label>Request Date</label>
                  <div className="viewField">{formatDate(request.request_date)}</div>
                </div>

                <div className="formField">
                  <label>Request Type</label>
                  <div className="viewField">
                    <span className={`chip ${getRequestTypeClass(request.request_type)}`}>
                      {request.request_type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sectionTitle">Employee Information</div>

              <div className="formFieldsHorizontal">
                <div className="formField">
                  <label>Employee Number</label>
                  <div className="viewField">{request.employee_number}</div>
                </div>

                <div className="formField">
                  <label>Employee Name</label>
                  <div className="viewField">{request.employee_name}</div>
                </div>

                <div className="formField">
                  <label>Position</label>
                  <div className="viewField">{request.position}</div>
                </div>

                <div className="formField">
                  <label>Department</label>
                  <div className="viewField">{request.department}</div>
                </div>

                <div className="formField">
                  <label>Contact</label>
                  <div className="viewField">{formatContactInfo()}</div>
                </div>
              </div>

              <div className="sectionTitle">Amount Details</div>

              <div className="formFieldsHorizontal">
                <div className="formField">
                  <label>Requested Amount</label>
                  <div className="viewField" style={{ fontWeight: 600, color: '#1890ff' }}>
                    {formatMoney(request.requested_amount)}
                  </div>
                </div>

                <div className="formField full-width">
                  <label>Purpose</label>
                  <div className="viewField">{request.purpose}</div>
                </div>
              </div>

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
            // Approval form with editable amount
            <>
              <div className="sectionTitle">Approve Cash Advance</div>
              
              <div className="formFieldsHorizontal">
                <div className="formField">
                  <label>Employee</label>
                  <div className="viewField">{request.employee_name}</div>
                </div>

                <div className="formField">
                  <label>Requested Amount</label>
                  <div className="viewField">{formatMoney(request.requested_amount)}</div>
                </div>
              </div>

              <div className="formField full-width">
                <label>Approved Amount <span className="requiredTags">*</span></label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  placeholder="Enter approved amount"
                  style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                />
                {showAmountWarning && (
                  <p className="hint-message" style={{ color: '#f39c12', marginTop: '8px' }}>
                    <i className="ri-alert-line"></i> Approved amount exceeds the requested amount
                  </p>
                )}
              </div>

              <div className="modalButtons">
                <button
                  className="approveButton"
                  onClick={handleSubmit}
                  disabled={isProcessing || approvedAmount <= 0}
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
              <div className="sectionTitle">Reject Cash Advance</div>
              
              <div className="formFieldsHorizontal">
                <div className="formField">
                  <label>Employee</label>
                  <div className="viewField">{request.employee_name}</div>
                </div>

                <div className="formField">
                  <label>Requested Amount</label>
                  <div className="viewField">{formatMoney(request.requested_amount)}</div>
                </div>
              </div>

              <div className="formField full-width">
                <label>Reason for Rejection <span className="requiredTags">*</span></label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a detailed reason for rejecting this cash advance request..."
                  rows={4}
                  required
                  style={{ width: '100%', resize: 'vertical' }}
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
