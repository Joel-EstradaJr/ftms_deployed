"use client";

import React, { useState } from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { OtherRevenueData } from "./page";
import PaymentScheduleTable from "@/Components/PaymentScheduleTable";
import { PaymentStatus, RevenueScheduleItem } from "@/app/types/revenue";

interface ViewOtherRevenueModalProps {
  revenueData: OtherRevenueData & {
    paymentMethodName?: string;
  };
  onClose: () => void;
  onRecordPayment?: (scheduleItem?: RevenueScheduleItem) => void;
}

const OTHER_REVENUE_CATEGORIES_MAP: { [key: string]: string } = {
  'ASSET_SALE': 'Asset Sale',
  'INTEREST': 'Interest',
  'PENALTIES': 'Penalties',
  'INSURANCE': 'Insurance',
  'DONATIONS': 'Donations',
  'OTHER': 'Other',
};

export default function ViewOtherRevenueModal({ revenueData, onClose, onRecordPayment }: ViewOtherRevenueModalProps) {
  
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

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

  // Calculate payment schedule stats
  const getScheduleStats = () => {
    if (!revenueData.scheduleItems || revenueData.scheduleItems.length === 0) {
      return {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        totalPaid: 0,
        totalAmount: revenueData.amount,
        nextPayment: null
      };
    }

    const items = revenueData.scheduleItems;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
      total: items.length,
      paid: items.filter((i: RevenueScheduleItem) => i.paymentStatus === PaymentStatus.PAID).length,
      pending: items.filter((i: RevenueScheduleItem) => i.paymentStatus === PaymentStatus.PENDING).length,
      overdue: items.filter((i: RevenueScheduleItem) => i.paymentStatus === PaymentStatus.OVERDUE).length,
      totalPaid: items.reduce((sum: number, i: RevenueScheduleItem) => sum + i.paidAmount, 0),
      totalAmount: items.reduce((sum: number, i: RevenueScheduleItem) => sum + i.currentDueAmount, 0),
      nextPayment: items
        .filter((i: RevenueScheduleItem) => i.paymentStatus !== PaymentStatus.PAID && i.paymentStatus !== PaymentStatus.CANCELLED)
        .sort((a: RevenueScheduleItem, b: RevenueScheduleItem) => new Date(a.currentDueDate).getTime() - new Date(b.currentDueDate).getTime())[0] || null
    };

    return stats;
  };

  const scheduleStats = revenueData.isUnearnedRevenue ? getScheduleStats() : null;

  // Check if there are any pending or overdue payments
  const hasPendingPayments = scheduleStats && 
    revenueData.scheduleItems && 
    revenueData.scheduleItems.some((item: RevenueScheduleItem) => 
      item.paymentStatus === PaymentStatus.PENDING || 
      item.paymentStatus === PaymentStatus.OVERDUE ||
      item.paymentStatus === PaymentStatus.PARTIALLY_PAID
    );

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
              <p>{revenueData.code}</p>
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
              <p>{formatDate(revenueData.date_recorded)}</p>
            </div>

            {/* Revenue Category */}
            <div className="form-group">
              <label>Revenue Category</label>
              <p>{formatCategory(revenueData.description)}</p>
            </div>

            {/* Reference Number */}
            <div className="form-group">
              <label>Reference Number</label>
              <p>{revenueData.payment_reference}</p>
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

      {/* IV. Payment Schedule & History (for unearned revenue) */}
      {revenueData.isUnearnedRevenue && revenueData.scheduleItems && revenueData.scheduleItems.length > 0 && scheduleStats && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <p className="details-title" style={{ margin: 0 }}>
              {(() => {
                let section = 2;
                if (revenueData.discountAmount || revenueData.discountPercentage) section++;
                if (revenueData.isUnearnedRevenue) section++;
                return `${['', 'I', 'II', 'III', 'IV'][section]}`;
              })()}. Payment Schedule & History
            </p>
            {hasPendingPayments && (
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  // Find first unpaid installment
                  const firstUnpaid = revenueData.scheduleItems?.find(
                    item => item.paymentStatus === PaymentStatus.OVERDUE || 
                            item.paymentStatus === PaymentStatus.PARTIALLY_PAID || 
                            item.paymentStatus === PaymentStatus.PENDING
                  );
                  if (firstUnpaid && onRecordPayment) {
                    onRecordPayment(firstUnpaid);
                  }
                }}
                style={{ 
                  fontSize: '0.85rem', 
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)'
                }}
              >
                <i className="ri-money-dollar-circle-line" style={{ marginRight: '0.3rem' }} />
                Record Payment
              </button>
            )}
          </div>

          {/* Payment Schedule Table */}
          <div className="modal-content view">
            <PaymentScheduleTable
              scheduleItems={revenueData.scheduleItems}
              mode="view"
              totalAmount={scheduleStats.totalAmount}
              isUnearnedRevenue={true}
              onRecordPayment={onRecordPayment}
            />
          </div>

          {/* Payment History (Expandable) */}
          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#333',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ebebeb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            >
              <span>
                <i className="ri-history-line" style={{ marginRight: '0.5rem' }} />
                Payment History
              </span>
              <i className={`ri-arrow-${showPaymentHistory ? 'up' : 'down'}-s-line`} />
            </button>

            {showPaymentHistory && (
              <div className="modal-content view" style={{ marginTop: '0.5rem' }}>
                <div className="tableContainer">
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th>Payment Date</th>
                        <th>Amount Paid</th>
                        <th>Applied To</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Recorded By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.scheduleItems
                        .filter((item: RevenueScheduleItem) => item.paidAmount > 0)
                        .sort((a: RevenueScheduleItem, b: RevenueScheduleItem) => {
                          if (!a.paidAt || !b.paidAt) return 0;
                          return new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime();
                        })
                        .map((item: RevenueScheduleItem, idx: number) => (
                          <tr key={idx}>
                            <td>{item.paidAt ? formatDate(item.paidAt) : 'N/A'}</td>
                            <td>{formatMoney(item.paidAmount)}</td>
                            <td>Installment #{item.installmentNumber}</td>
                            <td>{item.paymentMethod || 'N/A'}</td>
                            <td>{item.referenceNumber || '—'}</td>
                            <td>{item.paidBy || 'N/A'}</td>
                          </tr>
                        ))}
                      {revenueData.scheduleItems.filter((item: RevenueScheduleItem) => item.paidAmount > 0).length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#999' }}>
                            No payment history yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Verification Details (if verified) */}
      {revenueData.isVerified && revenueData.verifiedBy && (
        <>
          <p className="details-title">
            {(() => {
              let section = 2;
              if (revenueData.discountAmount || revenueData.discountPercentage) section++;
              if (revenueData.isUnearnedRevenue) section++; // Revenue Recognition
              if (revenueData.isUnearnedRevenue && revenueData.scheduleItems && revenueData.scheduleItems.length > 0) section++; // Payment Schedule
              return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI'][section]}`;
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

      {/* Additional Information */}
      {(revenueData.remarks || revenueData.receiptUrl || revenueData.accountCode) && (
        <>
          <p className="details-title">
            {(() => {
              let section = 2;
              if (revenueData.discountAmount || revenueData.discountPercentage) section++;
              if (revenueData.isUnearnedRevenue) section++; // Revenue Recognition
              if (revenueData.isUnearnedRevenue && revenueData.scheduleItems && revenueData.scheduleItems.length > 0) section++; // Payment Schedule
              if (revenueData.isVerified && revenueData.verifiedBy) section++; // Verification
              return `${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][section]}`;
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