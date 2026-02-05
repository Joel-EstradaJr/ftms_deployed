"use client";

import React, { useState } from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { AdministrativeExpense, ExpenseScheduleItem, PaymentStatus, ExpenseStatus } from "@/app/types/expenses";
import ExpenseScheduleTable from "@/Components/ExpenseScheduleTable";

// Payment History Component
function PaymentHistorySection({ scheduleItems }: { scheduleItems: ExpenseScheduleItem[] }) {
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Collect all payment records from all schedule items
  const allPayments: Array<{
    paymentDate: string;
    amountPaid: number;
    installmentNumber: number;
    paymentMethod: string | null;
    createdBy: string | null;
  }> = [];

  scheduleItems.forEach((item: ExpenseScheduleItem) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments = (item as any).payments || [];
    payments.forEach((p: { payment_date: string; amount_paid: number; payment_method: string | null; created_by: string | null }) => {
      allPayments.push({
        paymentDate: p.payment_date,
        amountPaid: p.amount_paid,
        installmentNumber: item.installment_number,
        paymentMethod: p.payment_method,
        createdBy: p.created_by
      });
    });
  });

  // Sort by payment date descending
  allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  return (
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
          Payment History ({allPayments.length})
        </span>
        <i className={`ri-arrow-${showPaymentHistory ? 'up' : 'down'}-s-line`} />
      </button>

      {showPaymentHistory && (
        <div className="tableContainer" style={{ marginTop: '0.5rem' }}>
          <table className="modal-table">
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Amount Paid</th>
                <th>Applied To</th>
                <th>Method</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {allPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#999' }}>
                    No payment history yet
                  </td>
                </tr>
              ) : (
                allPayments.map((payment, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td>{formatMoney(payment.amountPaid)}</td>
                    <td>Installment #{payment.installmentNumber}</td>
                    <td>{payment.paymentMethod ? payment.paymentMethod.replace('_', ' ') : 'N/A'}</td>
                    <td>{payment.createdBy || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ViewAdminExpenseModalProps {
  data: AdministrativeExpense;
  onClose: () => void;
  onEdit?: (data: AdministrativeExpense) => void;
  onRecordPayment?: (scheduleItem?: ExpenseScheduleItem) => void;
}

export default function ViewAdminExpenseModal({
  data,
  onClose,
  onEdit,
  onRecordPayment: onRecordPaymentProp
}: ViewAdminExpenseModalProps) {

  const getStatusChipClass = (status?: PaymentStatus | ExpenseStatus | string) => {
    const statusStr = String(status || '').toUpperCase();
    switch (statusStr) {
      case 'PAID': return 'paid';
      case 'PARTIALLY_PAID': return 'partially-paid';
      case 'OVERDUE': return 'overdue';
      case 'PENDING': return 'pending';
      case 'CANCELLED': return 'cancelled';
      case 'APPROVED': return 'approved';
      case 'REJECTED': return 'rejected';
      default: return 'pending';
    }
  };

  // Determine if payable exists (has schedule items)
  const hasPayable = data.payable_id !== null && data.payable_id !== undefined ||
    (data.scheduleItems && data.scheduleItems.length > 0);

  return (
    <>
      <div className="modal-heading modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: 'calc(100% - 200px)' }}>
          <h1 className="modal-title">Expense Details</h1>
          {data.status && (
            <span className={`chip ${getStatusChipClass(data.status)}`}>
              {String(data.status).replace('_', ' ')}
            </span>
          )}
        </div>
        <div className="modal-date-time">
          <p>{new Date(data.created_at).toLocaleDateString()}</p>
          <p>{new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={onClose} className="close-modal-btn"><i className="ri-close-line" /></button>
      </div>

      {/* I. Expense Information */}
      <p className="details-title">I. Expense Information</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Row: Expense Code + Date Recorded */}
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <p>{data.code || data.id}</p>
            </div>
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{formatDate(data.date_recorded)}</p>
            </div>
          </div>

          {/* Row: Vendor + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label>Vendor</label>
              <p>{data.vendor || '-'}</p>
            </div>
            <div className="form-group">
              <label>Amount</label>
              <p style={{ fontWeight: 'bold', color: '#961C1E' }}>{formatMoney(data.amount)}</p>
            </div>
          </div>

          {/* Row: Invoice Number + Payment Method */}
          <div className="form-row">
            <div className="form-group">
              <label>Invoice Number</label>
              <p>{data.invoice_number || '-'}</p>
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <p>{data.payment_method || '-'}</p>
            </div>
          </div>

          {/* Row: Description */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Description</label>
              <p>{data.description || 'No description'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Payables */}
      {hasPayable && data.scheduleItems && data.scheduleItems.length > 0 && (
        <>
          <p className="details-title">II. Payables</p>
          <div className="modal-content view">
            <form className="view-form">
              {data.frequency && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Frequency</label>
                    <p>{data.frequency}</p>
                  </div>
                  <div className="form-group">
                    <label>Balance</label>
                    <p style={{ fontWeight: 'bold', color: '#961C1E' }}>{formatMoney(data.balance || 0)}</p>
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Payment Schedule</label>
                  <ExpenseScheduleTable
                    scheduleItems={data.scheduleItems}
                    mode="view"
                    totalAmount={data.amount}
                    frequency={data.frequency}
                    hasPayable={hasPayable}
                    expenseStatus={data.status}
                    onRecordPayment={(item) => {
                      onRecordPaymentProp?.(item);
                    }}
                  />
                </div>
              </div>

              {/* Payment History (Expandable) */}
              <div className="form-row">
                <div className="form-group full-width">
                  <PaymentHistorySection scheduleItems={data.scheduleItems} />
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* III. Journal Entry (only show if approved and has JE) */}
      {data.journal_entry_id && (
        <>
          <p className="details-title">III. Journal Entry</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>JE Code</label>
                  <p style={{ fontWeight: 'bold', color: '#2563eb' }}>{data.journal_entry_code || '-'}</p>
                </div>
                <div className="form-group">
                  <label>JE Status</label>
                  <span className={`chip ${getStatusChipClass(data.journal_entry_status)}`}>
                    {data.journal_entry_status || 'N/A'}
                  </span>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Accounting Status</label>
                  <span className={`chip ${getStatusChipClass(data.accounting_status)}`}>
                    {data.accounting_status || 'N/A'}
                  </span>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* IV. Audit */}
      <p className="details-title">{data.journal_entry_id ? 'IV' : 'III'}. Audit</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Created By</label>
              <p>{data.created_by || '-'}</p>
            </div>
            <div className="form-group">
              <label>Created On</label>
              <p>{data.created_at ? new Date(data.created_at).toLocaleString() : '-'}</p>
            </div>
          </div>
          {data.approved_by && (
            <div className="form-row">
              <div className="form-group">
                <label>Approved By</label>
                <p>{data.approved_by}</p>
              </div>
              <div className="form-group">
                <label>Approved On</label>
                <p>{data.approved_at ? new Date(data.approved_at).toLocaleString() : '-'}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="modal-actions">
        {String(data.status).toUpperCase() === 'APPROVED' && hasPayable && data.scheduleItems && data.scheduleItems.length > 0 && (
          <button
            onClick={() => {
              const pending = (data.scheduleItems || []).find(
                it => it.status === PaymentStatus.PENDING || it.status === PaymentStatus.PARTIALLY_PAID
              );
              if (pending) onRecordPaymentProp?.(pending);
            }}
            className="pay-btn"
          >
            <i className="ri-money-dollar-circle-line"></i> Record Payment
          </button>
        )}
        <button onClick={onClose} className="cancel-btn">Close</button>
      </div>
    </>
  );
}