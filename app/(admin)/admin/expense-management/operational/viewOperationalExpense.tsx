"use client";

import React from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { OperationalExpenseData } from "./recordOperationalExpense";

interface ViewOperationalExpenseModalProps {
  expenseData: OperationalExpenseData & {
    paymentMethodName?: string;
    accountCode?: string;
    accountName?: string;
    bodyNumber?: string;
    busType?: string;
    dateAssigned?: string;
    reimbursementEmployeeName?: string;
    reimbursementEmployeeNumber?: string;
  };
  onClose: () => void;
}

const STATUS_MAP: { [key: string]: string } = {
  'PENDING': 'Pending',
  'APPROVED': 'Approved',
  'REJECTED': 'Rejected',
  'COMPLETED': 'Completed',
};

export default function ViewOperationalExpenseModal({ expenseData, onClose }: ViewOperationalExpenseModalProps) {

  // Get status badge
  const getStatusBadge = () => {
    const status = expenseData.status || 'PENDING';
    const statusText = STATUS_MAP[status] || status;

    const statusClass = {
      'APPROVED': 'completed',
      'COMPLETED': 'completed',
      'PENDING': 'pending',
      'REJECTED': 'cancelled'
    }[status] || 'pending';

    return <span className={`chip ${statusClass}`}>{statusText}</span>;
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Operational Expense Details</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>

        <button className="close-modal-btn view" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Header Section with Code and Status */}
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <p><strong>{expenseData.expenseCode}</strong></p>
            </div>
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(expenseData.dateRecorded)}</p>
            </div>
            <div className="form-group">
              <label>Status</label>
              <span>{getStatusBadge()}</span>
            </div>
          </div>
        </form>
      </div>

      {/* I. Basic Expense Information */}
      <div className="modal-content view">
        <p className="details-title">I. Expense Information</p>
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Expense Name</label>
              <p>{expenseData.expenseCategory || 'N/A'}</p>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-field">{formatMoney(expenseData.amount)}</p>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <p>{expenseData.paymentMethodName || 'N/A'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Trip Assignment Details */}
      {(expenseData.dateAssigned || expenseData.bodyNumber || expenseData.busType || expenseData.route || expenseData.busPlateNumber) && (
        <div className="modal-content view">
          <p className="details-title">II. Trip Assignment Details</p>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Date Assigned</label>
                <p>{expenseData.dateAssigned ? formatDate(expenseData.dateAssigned) : 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Body Number</label>
                <p>{expenseData.bodyNumber || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Bus Type</label>
                <p>{expenseData.busType || 'N/A'}</p>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Route</label>
                <p>{expenseData.route || 'N/A'}</p>
              </div>
              <div className="form-group">
                <label>Plate Number</label>
                <p>{expenseData.busPlateNumber || 'N/A'}</p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* III. Accounting Details */}
      <div className="modal-content view">
        <p className="details-title">
          {(expenseData.dateAssigned || expenseData.bodyNumber) ? 'III' : 'II'}. Accounting Details
        </p>
        <form className="view-form">
          <div className="form-row">
            {(expenseData.accountCode || expenseData.accountName) && (
              <div className="form-group">
                <label>Accounting Code</label>
                <p>{expenseData.accountCode && expenseData.accountName
                  ? `${expenseData.accountCode} - ${expenseData.accountName}`
                  : 'N/A'}</p>
              </div>
            )}
            <div className="form-group">
              <label>Reimbursable Expense</label>
              <p className="chip-container">
                {expenseData.isReimbursable ? (
                  <span className="chip reimbursable">Yes</span>
                ) : (
                  <span className="chip not-reimbursable">No</span>
                )}
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Reimbursable Details (if applicable) */}
      {expenseData.isReimbursable && (expenseData.reimbursementEmployeeNumber || expenseData.reimbursementEmployeeName) && (
        <div className="modal-content view">
          <p className="details-title">Reimbursement Details</p>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group">
                <label>Employee to Reimburse</label>
                <p>
                  {expenseData.reimbursementEmployeeNumber && (
                    <span style={{ fontWeight: 600 }}>{expenseData.reimbursementEmployeeNumber}</span>
                  )}
                  {expenseData.reimbursementEmployeeNumber && expenseData.reimbursementEmployeeName && ' - '}
                  {expenseData.reimbursementEmployeeName || 'N/A'}
                </p>
              </div>
              {expenseData.reimbursementPurpose && (
                <div className="form-group">
                  <label>Purpose</label>
                  <p>{expenseData.reimbursementPurpose}</p>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Description/Remarks */}
      {expenseData.remarks && (
        <div className="modal-content view">
          <p className="details-title">Additional Information</p>
          <form className="view-form">
            <div className="form-row">
              <div className="form-group full-width">
                <label>Description / Remarks</label>
                <p style={{ whiteSpace: 'pre-wrap' }}>{expenseData.remarks}</p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Audit Trail */}
      <div className="modal-content view">
        <p className="details-title">Audit Trail</p>
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Requested By</label>
              <p>{expenseData.createdBy || 'N/A'}</p>
            </div>
            {expenseData.createdAt && (
              <div className="form-group">
                <label>Requested On</label>
                <p>{formatDate(expenseData.createdAt)}</p>
              </div>
            )}
          </div>

          {expenseData.approvedBy && (
            <div className="form-row">
              <div className="form-group">
                <label>Approved By</label>
                <p>{expenseData.approvedBy}</p>
              </div>
              {expenseData.approvedAt && (
                <div className="form-group">
                  <label>Approved On</label>
                  <p>{formatDate(expenseData.approvedAt)}</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
          Close
        </button>
      </div>
    </>
  );
}
