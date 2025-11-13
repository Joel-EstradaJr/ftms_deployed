"use client";

import React from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { OtherRevenueData } from "./recordOtherRevenue";

interface ViewOtherRevenueModalProps {
  revenueData: OtherRevenueData & {
    paymentMethodName?: string;
  };
  onClose: () => void;
}

const OTHER_REVENUE_CATEGORIES_MAP: { [key: string]: string } = {
  'ASSET_SALE': 'Asset Sale',
  'INTEREST': 'Interest',
  'PENALTIES': 'Penalties',
  'INSURANCE': 'Insurance',
  'DONATIONS': 'Donations',
  'OTHER': 'Other',
};

export default function ViewOtherRevenueModal({ revenueData, onClose }: ViewOtherRevenueModalProps) {
  
  // Calculate net amount after discount
  const calculateNetAmount = (): number => {
    return revenueData.amount - (revenueData.discountAmount || 0);
  };

  // Format category for display
  const formatCategory = (category: string): string => {
    return OTHER_REVENUE_CATEGORIES_MAP[category] || category;
  };

  // Get verification status badge
  const getVerificationBadge = () => {
    if (revenueData.isVerified) {
      return <span className="chip completed">Verified</span>;
    }
    return <span className="chip pending">Pending Verification</span>;
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Other Revenue Details</h1>
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
            {/* Revenue Code */}
            <div className="form-group">
              <label>Revenue Code</label>
              <p>{revenueData.revenueCode}</p>
            </div>

            {/* Revenue Type */}
            <div className="form-group">
              <label>Revenue Type</label>
              <p>OTHER</p>
            </div>

            {/* Verification Status */}
            <div className="form-group">
              <label>Verification Status</label>
              <span>{getVerificationBadge()}</span>
            </div>
          </div>
        </form>
      </div>

      {/* I. Revenue Information */}
      <p className="details-title">I. Revenue Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Date Recorded */}
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(revenueData.dateRecorded)}</p>
            </div>

            {/* Revenue Category */}
            <div className="form-group">
              <label>Revenue Category</label>
              <p>{formatCategory(revenueData.otherRevenueCategory)}</p>
            </div>

            {/* Reference Number */}
            <div className="form-group">
              <label>Reference Number</label>
              <p>{revenueData.sourceRefNo}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Department */}
            <div className="form-group">
              <label>Department</label>
              <p>{revenueData.department}</p>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label>Payment Method</label>
              <p>{revenueData.paymentMethodName || 'N/A'}</p>
            </div>

            {/* Amount */}
            <div className="form-group">
              <label>Amount</label>
              <p className="amount-field">{formatMoney(revenueData.amount)}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Discount Information (if applicable) */}
      {(revenueData.discountAmount || revenueData.discountPercentage) ? (
        <>
          <p className="details-title">II. Discount Information</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                {/* Discount Amount */}
                <div className="form-group">
                  <label>Discount Amount</label>
                  <p>{formatMoney(revenueData.discountAmount || 0)}</p>
                </div>

                {/* Discount Percentage */}
                <div className="form-group">
                  <label>Discount Percentage</label>
                  <p>{revenueData.discountPercentage || 0}%</p>
                </div>

                {/* Net Amount */}
                <div className="form-group">
                  <label>Net Amount</label>
                  <p className="amount-field">{formatMoney(calculateNetAmount())}</p>
                </div>
              </div>

              <div className="form-row">
                {/* Discount Reason */}
                <div className="form-group full-width">
                  <label>Discount Reason</label>
                  <p>{revenueData.discountReason || 'N/A'}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      ) : null}

      {/* III. Revenue Recognition (if applicable) */}
      {revenueData.isUnearnedRevenue && (
        <>
          <p className="details-title">
            {(revenueData.discountAmount || revenueData.discountPercentage) ? 'III' : 'II'}. Revenue Recognition
          </p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                {/* Unearned Revenue Status */}
                <div className="form-group">
                  <label>Revenue Type</label>
                  <p className="chip pending">Unearned Revenue</p>
                </div>
              </div>

              <div className="form-row">
                {/* Recognition Schedule */}
                <div className="form-group full-width">
                  <label>Recognition Schedule</label>
                  <p>{revenueData.recognitionSchedule || 'N/A'}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* IV. Verification Details (if verified) */}
      {revenueData.isVerified && revenueData.verifiedBy && (
        <>
          <p className="details-title">
            {(() => {
              let section = 2;
              if (revenueData.discountAmount || revenueData.discountPercentage) section++;
              if (revenueData.isUnearnedRevenue) section++;
              return `${['', 'I', 'II', 'III', 'IV', 'V'][section]}`;
            })()}. Verification Details
          </p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                {/* Verified By */}
                <div className="form-group">
                  <label>Verified By</label>
                  <p>{revenueData.verifiedBy}</p>
                </div>

                {/* Verified At */}
                <div className="form-group">
                  <label>Verified At</label>
                  <p>{formatDate(revenueData.verifiedAt || '')}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* V. Additional Information */}
      {(revenueData.remarks || revenueData.receiptUrl || revenueData.accountCode) && (
        <>
          <p className="details-title">
            {(() => {
              let section = 2;
              if (revenueData.discountAmount || revenueData.discountPercentage) section++;
              if (revenueData.isUnearnedRevenue) section++;
              if (revenueData.isVerified && revenueData.verifiedBy) section++;
              return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][section]}`;
            })()}. Additional Information
          </p>
          <div className="modal-content view">
            <form className="view-form">
              {revenueData.remarks && (
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Remarks</label>
                    <p>{revenueData.remarks}</p>
                  </div>
                </div>
              )}

              {revenueData.receiptUrl && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Receipt Document</label>
                    <a href={revenueData.receiptUrl} target="_blank" rel="noopener noreferrer" className="document-link">
                      <i className="ri-file-line" /> View Receipt
                    </a>
                  </div>
                </div>
              )}

              {revenueData.accountCode && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Chart of Account</label>
                    <p>{revenueData.accountCode}</p>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Created By</label>
                  <p>{revenueData.createdBy}</p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Close Button */}
      <div className="modal-actions">
        <button
          type="button"
          className="submit-btn"
          onClick={onClose}
          style={{ backgroundColor: '#6c757d' }}
        >
          <i className="ri-close-line" /> Close
        </button>
      </div>
    </>
  );
}