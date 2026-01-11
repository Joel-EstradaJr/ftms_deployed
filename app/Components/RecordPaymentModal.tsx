'use client';

import React, { useState, useMemo } from 'react';
import { formatMoney, formatDate } from '@/utils/formatting';
import { validatePaymentAmount } from '@/utils/validation';
import { showError, showSuccess } from '@/utils/Alerts';
import Swal from 'sweetalert2';
import '@/styles/components/forms.css';
import '@/styles/components/modal2.css';
import '@/styles/components/table.css';
import '@/styles/components/chips.css';

// Minimal schedule item type — matches both revenue and expense fields used here
export interface SimpleScheduleItem {
  id?: string;
  installmentNumber: number;
  currentDueDate: string;
  currentDueAmount: number;
  paidAmount: number;
  carriedOverAmount: number;
  paymentStatus: string;
}

import { PaymentRecordData } from '@/app/types/payments';

interface RecordPaymentModalProps {
  entityType?: 'revenue' | 'expense' | string;
  recordId: string | number;
  recordRef?: string;
  scheduleItems: SimpleScheduleItem[];
  selectedInstallment: SimpleScheduleItem;
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  currentUser: string;
  onPaymentRecorded: (paymentData: PaymentRecordData) => Promise<void>;
  onClose: () => void;
  processCascadePayment: (amount: number, items: any[], startIndex: number) => any;
  // Employee information for revenue payments
  employeeNumber?: string;
  employeeName?: string;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  entityType = 'revenue',
  recordId,
  recordRef,
  scheduleItems,
  selectedInstallment,
  paymentMethods,
  currentUser,
  onPaymentRecorded,
  onClose,
  processCascadePayment,
  employeeNumber,
  employeeName
}) => {
  const [amountToPay, setAmountToPay] = useState<number>(0);

  const getLocalDateInputValue = (date?: Date) => {
    const d = date || new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [paymentDate, setPaymentDate] = useState<string>(getLocalDateInputValue());
  const [paymentMethodId, setPaymentMethodId] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Filter payment methods to only Cash and Online Payment for revenue
  const filteredPaymentMethods = entityType === 'revenue' 
    ? paymentMethods.filter(method => {
        const name = method.methodName.toLowerCase().trim();
        return name === 'cash' || name === 'online payment';
      })
    : paymentMethods;

  const currentIndex = scheduleItems.findIndex(item => item.id === selectedInstallment.id);
  const currentBalance = (selectedInstallment.currentDueAmount + selectedInstallment.carriedOverAmount) - selectedInstallment.paidAmount;
  const totalOutstanding = scheduleItems.reduce((sum, s) => sum + (s.currentDueAmount - s.paidAmount), 0);

  const cascadePreview = useMemo(() => {
    if (amountToPay <= 0 || currentIndex === -1) return null;
    const result = processCascadePayment(amountToPay, scheduleItems, currentIndex);
    return result;
  }, [amountToPay, scheduleItems, currentIndex, processCascadePayment]);

  const isOverflow = amountToPay > currentBalance;
  const affectedCount = cascadePreview?.affectedInstallments.length || 0;

  const handleAmountChange = (value: number) => {
    if (value < 0) {
      setAmountToPay(0);
    } else {
      setAmountToPay(value);
      const err = validatePaymentAmount(value, totalOutstanding);
      setPaymentError(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amountToPay <= 0) {
      showError('Payment amount must be greater than zero', 'Validation Error');
      return;
    }
    const amountValidation = validatePaymentAmount(amountToPay, totalOutstanding);
    if (amountValidation) {
      showError(amountValidation, 'Validation Error');
      setPaymentError(amountValidation);
      return;
    }

    if (paymentMethodId === 0) {
      showError('Please select a payment method', 'Validation Error');
      return;
    }

    if (!paymentDate) {
      showError('Please select a payment date', 'Validation Error');
      return;
    }

    const { value: confirmText, isConfirmed } = await Swal.fire({
      title: 'Confirm Payment',
      html: `
        <div style="text-align: left; margin-bottom: 20px;">
          <p><strong>${entityType === 'expense' ? 'Expense Ref' : 'Revenue Code'}:</strong> ${recordRef || recordId}</p>
          <p><strong>Installment:</strong> #${selectedInstallment.installmentNumber}</p>
          <p><strong>Amount to Pay:</strong> ${formatMoney(amountToPay)}</p>
          ${isOverflow ? `<p style="color: #FF8C00;"><strong>⚠️ Will cascade to ${affectedCount} installment(s)</strong></p>` : ''}
        </div>
        <p style="margin-bottom: 10px;">Type <strong>CONFIRM</strong> to proceed with this payment:</p>
      `,
      input: 'text',
      inputPlaceholder: 'Type CONFIRM',
      showCancelButton: true,
      confirmButtonText: 'Record Payment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#4CAF50',
      cancelButtonColor: '#d33',
      inputValidator: (value) => {
        if (!value) return 'You need to type CONFIRM!';
        if (value.toUpperCase() !== 'CONFIRM') return 'Please type CONFIRM exactly';
        return null;
      }
    });

    if (!isConfirmed || confirmText?.toUpperCase() !== 'CONFIRM') return;

    setIsProcessing(true);

    try {
      const selectedMethod = paymentMethods.find(m => m.id === paymentMethodId);
      const paymentData: PaymentRecordData = {
        recordId,
        recordRef,
        scheduleItemId: selectedInstallment.id || '',
        scheduleItemIds: cascadePreview?.affectedInstallments.map((a: any) => a.scheduleItemId) || [],
        installmentNumber: selectedInstallment.installmentNumber,
        amountToPay,
        paymentDate,
        paymentMethodId,
        paymentMethod: selectedMethod?.methodName || '',
        recordedBy: currentUser,
        cascadeBreakdown: cascadePreview?.affectedInstallments.map((affected: any) => ({
          installmentNumber: affected.installmentNumber,
          scheduleItemId: affected.scheduleItemId,
          amountApplied: affected.amountApplied
        }))
      };

      await onPaymentRecorded(paymentData);

      showSuccess(
        `Payment of ${formatMoney(amountToPay)} recorded successfully${affectedCount > 1 ? ` and applied to ${affectedCount} installments` : ''}`,
        'Payment Recorded'
      );

      onClose();
    } catch (error) {
      console.error('Payment recording error:', error);
      showError(error instanceof Error ? error.message : 'Failed to record payment', 'Payment Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const previewItems = useMemo(() => {
    if (!cascadePreview) return scheduleItems;
    return scheduleItems.map(item => {
      const affected = cascadePreview.affectedInstallments.find((a: any) => a.scheduleItemId === item.id);
      if (affected) return { ...item, paidAmount: item.paidAmount + affected.amountApplied, paymentStatus: affected.newStatus };
      return item;
    });
  }, [scheduleItems, cascadePreview]);

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Record Payment</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose} disabled={isProcessing}><i className="ri-close-line"></i></button>
      </div>

      <form onSubmit={handleSubmit}>
        <div>
          <div>
            <p className="details-title">Payment Information</p>
            <div className="modal-content add">
              <div className="add-form">
                <div style={{ padding: '12px', border: '2px solid var(--primary-color)', borderRadius: '6px', marginBottom: '15px' }}>
                  {entityType === 'revenue' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span><strong>Employee ID:</strong></span>
                        <span>{employeeNumber || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span><strong>Driver Name:</strong></span>
                        <span>{employeeName || 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span><strong>Expense Ref:</strong></span>
                      <span>{recordRef || recordId}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span><strong>Installment:</strong></span>
                    <span>#{selectedInstallment.installmentNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span><strong>Due Date:</strong></span>
                    <span>{formatDate(selectedInstallment.currentDueDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span><strong>Amount Due (this installment):</strong></span>
                    <span style={{ color: '#FF4949', fontWeight: '600' }}>{formatMoney(currentBalance)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>Total Balance (all installments):</strong></span>
                    <span style={{ color: '#FF4949', fontWeight: '600' }}>{formatMoney(totalOutstanding)}</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Amount Received<span className="requiredTags"> *</span></label>
                    <input type="number" value={amountToPay} onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)} min="1" placeholder="0.00" required disabled={isProcessing} style={{ fontSize: '16px', fontWeight: '600' }} />
                    {paymentError && <p className="add-error-message">{paymentError}</p>}
                    {isOverflow && <small style={{ color: '#FF8C00', fontWeight: '600' }}>⚠️ Amount exceeds this installment: will cascade to next {affectedCount - 1} installment(s)</small>}
                    {!isOverflow && amountToPay > 0 && amountToPay < currentBalance && (<small style={{ color: '#FF8C00' }}>Partial payment: {formatMoney(currentBalance - amountToPay)} will remain for this installment</small>)}
                  </div>
                </div>

                {isOverflow && cascadePreview && (
                  <div style={{ padding: '10px', backgroundColor: '#FFF9E6', border: '1px solid #FFE69C', borderRadius: '6px', marginBottom: '15px' }}>
                    <strong style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>Payment will be applied to:</strong>
                    {cascadePreview.affectedInstallments.map((affected: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '13px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Installment #{affected.installmentNumber}:</span>
                        <span style={{ fontWeight: '600' }}>{formatMoney(affected.amountApplied)}</span>
                      </div>
                    ))}
                    {cascadePreview.remainingAmount > 0 && (<div style={{ fontSize: '13px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #FFE69C', color: '#856404' }}><strong>Note:</strong> {formatMoney(cascadePreview.remainingAmount)} exceeds all balances</div>)}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Date<span className="requiredTags"> *</span></label>
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} max={getLocalDateInputValue()} required disabled={isProcessing} />
                    <small className="formatted-date-preview">{formatDate(paymentDate)}</small>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Method<span className="requiredTags"> *</span></label>
                    <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(parseInt(e.target.value) || 0)} required disabled={isProcessing}>
                      <option value={0}>Select Payment Method</option>
                      {filteredPaymentMethods.map(method => (<option key={method.id} value={method.id}>{method.methodName}</option>))}
                    </select>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div>
            <p className="details-title">Payment Schedule Overview</p>
            <div className="modal-content view" style={{ padding: 0 }}>
              <div className="table-wrapper" style={{ height: 'auto', maxHeight: '400px', marginTop: 0, marginBottom: 0 }}>
                <div className="tableContainer">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item, index) => {
                        const balance = item.currentDueAmount - item.paidAmount;
                        const isAffected = cascadePreview?.affectedInstallments.some((a: any) => a.scheduleItemId === item.id);

                        return (
                          <tr 
                            key={item.id || index}
                            style={{
                              backgroundColor: isAffected ? '#FFF9E6' : 'transparent',
                              fontWeight: isAffected ? '600' : 'normal'
                            }}
                          >
                            <td>{formatDate(item.currentDueDate)}</td>
                            <td>{formatMoney(item.currentDueAmount)}</td>
                            <td>{formatMoney(item.paidAmount)}</td>
                            <td>
                              <span style={{ 
                                color: balance > 0 ? '#FF4949' : '#4CAF50',
                                fontWeight: '600'
                              }}>
                                {formatMoney(balance)}
                              </span>
                            </td>
                            <td>
                              <span className={`chip ${item.paymentStatus.toLowerCase().replace('_', '-')}`}>
                                {item.paymentStatus.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {cascadePreview && affectedCount > 1 && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#E3F2FD',
                borderRadius: '6px',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                <i className="ri-information-line" style={{ marginRight: '5px', color: '#0277BD' }}></i>
                <span style={{ color: '#0277BD' }}>
                  Highlighted rows show updated balances after payment is applied
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={isProcessing || amountToPay <= 0 || paymentMethodId === 0 || !!paymentError}
          >
            {isProcessing ? (
              <>
                <i className="ri-loader-4-line" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}></i>
                Processing...
              </>
            ) : (
              <>
                <i className="ri-money-dollar-circle-line" style={{ marginRight: '8px' }}></i>
                Record
              </>
            )}
          </button>
        </div>
      </form>

      <style jsx>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export default RecordPaymentModal;
