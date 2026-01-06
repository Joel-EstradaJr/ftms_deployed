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

const EXPENSE_CATEGORIES_MAP: { [key: string]: string } = {
  'FUEL': 'Fuel',
  'TOLLS': 'Tolls',
  'PARKING': 'Parking',
  'ALLOWANCES': 'Allowances',
  'PETTY_CASH': 'Petty Cash',
  'VIOLATIONS': 'Violations',
  'TERMINAL_FEES': 'Terminal Fees',
};

const STATUS_MAP: { [key: string]: string } = {
  'PENDING': 'Pending',
  'APPROVED': 'Approved',
  'REJECTED': 'Rejected',
  'POSTED': 'Posted',
};

export default function ViewOperationalExpenseModal({ expenseData, onClose }: ViewOperationalExpenseModalProps) {
  
  // Format category for display
  const formatCategory = (category: string): string => {
    return EXPENSE_CATEGORIES_MAP[category] || category;
  };

  // Get status badge
  const getStatusBadge = () => {
    const status = expenseData.status || 'PENDING';
    const statusText = STATUS_MAP[status] || status;
    
    const statusClass = {
      'APPROVED': 'completed',
      'POSTED': 'completed',
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

      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Expense Code */}
            <div className="form-group">
              <label>Expense Code</label>
              <p>{expenseData.expenseCode}</p>
            </div>

            {/* Date Recorded */}
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(expenseData.dateRecorded)}</p>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <span>{getStatusBadge()}</span>
            </div>
          </div>
        </form>
      </div>

      {/* I. Basic Expense Information */}
      <div className="modal-content view">
        <p className="details-title">I. Basic Expense Information</p>
        <form className="view-form">
          <div className="form-row">
            {/* Expense Name */}
            <div className="form-group">
              <label>Expense Name</label>
              <p>{formatCategory(expenseData.expenseCategory)}</p>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-field">{formatMoney(expenseData.amount)}</p>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label>Payment Method</label>
              <p>{expenseData.paymentMethodName || 'N/A'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Trip Assignment Details (if applicable) */}
      {(expenseData.cachedTripId || expenseData.busPlateNumber || expenseData.route || expenseData.department) && (
        <>
          <div className="modal-content view">
            <p className="details-title">II. Trip Assignment Details</p>
            <form className="view-form">
              <div className="form-row">
                {/* Plate Number */}
                <div className="form-group">
                  <label>Plate Number</label>
                  <p>{expenseData.busPlateNumber || 'N/A'}</p>
                </div>

                {/* Body Number */}
                <div className="form-group">
                  <label>Body Number</label>
                  <p>{expenseData.bodyNumber || 'N/A'}</p>
                </div>

                {/* Route */}
                <div className="form-group">
                  <label>Route</label>
                  <p>{expenseData.route || 'N/A'}</p>
                </div>
              </div>

              <div className="form-row">
                {/* Type */}
                <div className="form-group">
                  <label>Type</label>
                  <p>{expenseData.busType || 'N/A'}</p>
                </div>

                {/* Date Assigned */}
                <div className="form-group">
                  <label>Date Assigned</label>
                  <p>{expenseData.dateAssigned ? formatDate(expenseData.dateAssigned) : 'N/A'}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* III. Accounting Details */}
      <div className="modal-content view">
        <p className="details-title">
          {(expenseData.cachedTripId || expenseData.busPlateNumber) ? 'III' : 'II'}. Accounting Details
        </p>
        <form className="view-form">
          <div className="form-row">
            {/* Accounting Code */}
            {expenseData.accountCodeId && (
              <div className="form-group">
                <label>Accounting Code</label>
                <p>{expenseData.accountCode && expenseData.accountName ? `${expenseData.accountCode} - ${expenseData.accountName}` : 'N/A'}</p>
              </div>
            )}

            {/* Reimbursable Status */}
            <div className="form-group">
              <label>Reimbursable Expense</label>
              <p>
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
      {expenseData.isReimbursable && expenseData.reimbursementEmployeeId && (
        <>
          <div className="modal-content view">
            <p className="details-title">
              {(() => {
                let section = 2;
                if (expenseData.cachedTripId || expenseData.busPlateNumber) section++;
                section++; // Accounting Details always shows
                return `${['', 'I', 'II', 'III', 'IV', 'V'][section]}`;
              })()}. Reimbursable Details
            </p>
            <form className="view-form">
              <div className="form-row">
                {/* Employee to Reimburse */}
                <div className="form-group">
                  <label>Employee to Reimburse</label>
                  <p>{expenseData.reimbursementEmployeeName || expenseData.reimbursementEmployeeNumber || 'N/A'}</p>
                </div>

                {/* Reimbursement Purpose */}
                {expenseData.reimbursementPurpose && (
                  <div className="form-group">
                    <label>Purpose</label>
                    <p>{expenseData.reimbursementPurpose}</p>
                  </div>
                )}
              </div>
            </form>
          </div>
        </>
      )}

      {/* Supporting Documents */}
      {expenseData.receiptUrl && (
        <>
          <div className="modal-content view">
            <p className="details-title">
              {(() => {
                let section = 2;
                if (expenseData.cachedTripId || expenseData.busPlateNumber) section++;
                section++; // Accounting Details
                if (expenseData.isReimbursable && expenseData.reimbursementEmployeeId) section++;
                return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][section]}`;
              })()}. Supporting Documents
            </p>
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Receipt Document</label>
                  <a href={expenseData.receiptUrl} target="_blank" rel="noopener noreferrer" className="document-link">
                    <i className="ri-file-line" /> View Receipt
                  </a>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Audit Details */}
      <div className="modal-content view">
        <p className="details-title">
          {(() => {
            let section = 2;
            if (expenseData.cachedTripId || expenseData.busPlateNumber) section++;
            section++; // Accounting Details
            if (expenseData.isReimbursable && expenseData.reimbursementEmployeeId) section++;
            if (expenseData.receiptUrl) section++;
            return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][section]}`;
          })()}. Audit
        </p>
        <form className="view-form">
          <div className="form-row">
            {/* Requested By */}
            <div className="form-group">
              <label>Requested by</label>
              <p>{expenseData.createdBy}</p>
            </div>

            {/* Requested On */}
            {expenseData.createdAt && (
              <div className="form-group">
                <label>Requested on</label>
                <p>{formatDate(expenseData.createdAt)}</p>
              </div>
            )}
          </div>

          {expenseData.approvedBy && (
            <div className="form-row">
              {/* Approved By */}
              <div className="form-group">
                <label>Approved by</label>
                <p>{expenseData.approvedBy}</p>
              </div>

              {/* Approved On */}
              {expenseData.approvedAt && (
                <div className="form-group">
                  <label>Approved on</label>
                  <p>{formatDate(expenseData.approvedAt)}</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Additional Information */}
      {expenseData.remarks && (
        <>
          <div className="modal-content view">
            <p className="details-title">
              {(() => {
                let section = 2;
                if (expenseData.cachedTripId || expenseData.busPlateNumber) section++;
                section++; // Accounting Details
                if (expenseData.isReimbursable && expenseData.reimbursementEmployeeId) section++;
                if (expenseData.receiptUrl) section++;
                section++; // Audit
                return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][section]}`;
              })()}. Additional Information
            </p>
            <form className="view-form">
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Description</label>
                  <p>{expenseData.remarks}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
          Close
        </button>
      </div>
    </>
  );
}
