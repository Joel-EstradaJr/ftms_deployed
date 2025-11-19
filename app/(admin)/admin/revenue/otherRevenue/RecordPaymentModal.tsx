'use client';

import React, { useState, useMemo } from 'react';
import { RevenueScheduleItem, PaymentRecordData, PaymentStatus } from '../../../../types/revenue';
import { formatMoney, formatDate } from '../../../../utils/formatting';
import { validatePaymentAmount } from '../../../../utils/validation';
import { processCascadePayment } from '../../../../utils/revenueScheduleCalculations';
import { showError, showSuccess } from '../../../../utils/Alerts';
import Swal from 'sweetalert2';
import '@/styles/components/forms.css';
import '@/styles/components/modal2.css';
import '@/styles/components/table.css';
import '@/styles/components/chips.css';

interface RecordPaymentModalProps {
  revenueId: number;
  revenueCode: string;
  scheduleItems: RevenueScheduleItem[];
  selectedInstallment: RevenueScheduleItem;
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  currentUser: string;
  onPaymentRecorded: (paymentData: PaymentRecordData) => Promise<void>;
  onClose: () => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  revenueId,
  revenueCode,
  scheduleItems,
  selectedInstallment,
  paymentMethods,
  currentUser,
  onPaymentRecorded,
  onClose
}) => {
  // Amount the user received (cash/amount being applied) - default to 0 so user enters actual amount received
  const [amountToPay, setAmountToPay] = useState<number>(0);
  // Use local date string (YYYY-MM-DD) to avoid timezone shift issues from toISOString()
  const getLocalDateInputValue = (date?: Date) => {
    const d = date || new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [paymentDate, setPaymentDate] = useState<string>(getLocalDateInputValue());
  const [paymentMethodId, setPaymentMethodId] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Get current installment index
  const currentIndex = scheduleItems.findIndex(item => item.id === selectedInstallment.id);
  const currentBalance = selectedInstallment.currentDueAmount - selectedInstallment.paidAmount;
  // Total outstanding across the whole receivable (all schedule items)
  const totalOutstanding = scheduleItems.reduce((sum, s) => sum + (s.currentDueAmount - s.paidAmount), 0);

  // Calculate cascade preview
  const cascadePreview = useMemo(() => {
    if (amountToPay <= 0 || currentIndex === -1) return null;

    const result = processCascadePayment(amountToPay, scheduleItems, currentIndex);
    return result;
  }, [amountToPay, scheduleItems, currentIndex]);

  const isOverflow = amountToPay > currentBalance;
  const affectedCount = cascadePreview?.affectedInstallments.length || 0;

  const handleAmountChange = (value: number) => {
    if (value < 0) {
      setAmountToPay(0);
    } else {
      setAmountToPay(value);
      // Validate against the total outstanding across the receivable so overflow that cascades is allowed
      const err = validatePaymentAmount(value, totalOutstanding);
      setPaymentError(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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

    // Show confirmation with CONFIRM text input
    const { value: confirmText, isConfirmed } = await Swal.fire({
      title: 'Confirm Payment',
      html: `
        <div style="text-align: left; margin-bottom: 20px;">
          <p><strong>Revenue Code:</strong> ${revenueCode}</p>
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
        if (!value) {
          return 'You need to type CONFIRM!';
        }
        if (value.toUpperCase() !== 'CONFIRM') {
          return 'Please type CONFIRM exactly';
        }
        return null;
      }
    });

    if (!isConfirmed || confirmText?.toUpperCase() !== 'CONFIRM') {
      return;
    }

    // Process payment
    setIsProcessing(true);

    try {
      const selectedMethod = paymentMethods.find(m => m.id === paymentMethodId);
      
      const paymentData: PaymentRecordData = {
        revenueId,
        revenueCode,
        scheduleItemId: selectedInstallment.id || '',
        scheduleItemIds: cascadePreview?.affectedInstallments.map(a => a.scheduleItemId) || [],
        installmentNumber: selectedInstallment.installmentNumber,
        amountToPay,
        paymentDate,
        paymentMethodId,
        paymentMethod: selectedMethod?.methodName || '',
        referenceNumber: referenceNumber || undefined,
        remarks: remarks || undefined,
        recordedBy: currentUser,
        cascadeBreakdown: cascadePreview?.affectedInstallments.map(affected => ({
          installmentNumber: affected.installmentNumber,
          scheduleItemId: affected.scheduleItemId,
          amountApplied: affected.amountApplied
        }))
      };

      await onPaymentRecorded(paymentData);

      showSuccess(
        `Payment of ${formatMoney(amountToPay)} recorded successfully${
          affectedCount > 1 ? ` and applied to ${affectedCount} installments` : ''
        }`,
        'Payment Recorded'
      );

      onClose();
    } catch (error) {
      console.error('Payment recording error:', error);
      showError(
        error instanceof Error ? error.message : 'Failed to record payment',
        'Payment Error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Create preview items for display
  const previewItems = useMemo(() => {
    if (!cascadePreview) return scheduleItems;

    return scheduleItems.map(item => {
      const affected = cascadePreview.affectedInstallments.find(
        a => a.scheduleItemId === item.id
      );

      if (affected) {
        return {
          ...item,
          paidAmount: item.paidAmount + affected.amountApplied,
          paymentStatus: affected.newStatus
        };
      }

      return item;
    });
  }, [scheduleItems, cascadePreview]);

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Record Payment</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose} disabled={isProcessing}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* LEFT COLUMN: Payment Entry */}
          <div>
            <p className="details-title">Payment Information</p>
            <div className="modal-content add">
              <div className="add-form">
                {/* Header Info */}
                <div style={{ 
                  padding: '12px', 
                  backgroundColor: 'var(--table-header-color)', 
                  borderRadius: '6px',
                  marginBottom: '15px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span><strong>Revenue Code:</strong></span>
                    <span>{revenueCode}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span><strong>Installment:</strong></span>
                    <span>#{selectedInstallment.installmentNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span><strong>Due Date:</strong></span>
                    <span>{formatDate(selectedInstallment.currentDueDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div><strong>Amount due (this installment):</strong></div>
                      <div style={{ color: '#FF4949', fontWeight: '600' }}>{formatMoney(currentBalance)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div><strong>Total balance (all installments):</strong></div>
                      <div style={{ color: '#FF4949', fontWeight: '600' }}>{formatMoney(totalOutstanding)}</div>
                    </div>
                  </div>
                </div>

                {/* Amount to Pay */}
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Amount Received<span className="requiredTags"> *</span>
                    </label>
                    <input
                      type="number"
                      value={amountToPay}
                      onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      required
                      disabled={isProcessing}
                      style={{ fontSize: '16px', fontWeight: '600' }}
                    />
                    {paymentError && (
                      <p className="add-error-message">{paymentError}</p>
                    )}
                      {isOverflow && (
                      <small style={{ color: '#FF8C00', fontWeight: '600' }}>
                        ⚠️ Amount exceeds this installment: will cascade to next {affectedCount - 1} installment(s)
                      </small>
                    )}
                      {!isOverflow && amountToPay > 0 && amountToPay < currentBalance && (
                      <small style={{ color: '#FF8C00' }}>
                        Partial payment: {formatMoney(currentBalance - amountToPay)} will remain for this installment
                      </small>
                    )}
                  </div>
                </div>

                {/* Cascade Breakdown */}
                {isOverflow && cascadePreview && (
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#FFF9E6',
                    border: '1px solid #FFE69C',
                    borderRadius: '6px',
                    marginBottom: '15px'
                  }}>
                    <strong style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                      Payment will be applied to:
                    </strong>
                    {cascadePreview.affectedInstallments.map((affected, idx) => (
                      <div key={idx} style={{ 
                        fontSize: '13px', 
                        marginBottom: '4px',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>Installment #{affected.installmentNumber}:</span>
                        <span style={{ fontWeight: '600' }}>{formatMoney(affected.amountApplied)}</span>
                      </div>
                    ))}
                    {cascadePreview.remainingAmount > 0 && (
                      <div style={{ 
                        fontSize: '13px', 
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid #FFE69C',
                        color: '#856404'
                      }}>
                        <strong>Note:</strong> {formatMoney(cascadePreview.remainingAmount)} exceeds all balances
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Date */}
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Payment Date<span className="requiredTags"> *</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      max={getLocalDateInputValue()}
                      required
                      disabled={isProcessing}
                    />
                    <small className="formatted-date-preview">
                      {formatDate(paymentDate)}
                    </small>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Payment Method<span className="requiredTags"> *</span>
                    </label>
                    <select
                      value={paymentMethodId}
                      onChange={(e) => setPaymentMethodId(parseInt(e.target.value) || 0)}
                      required
                      disabled={isProcessing}
                    >
                      <option value={0}>Select Payment Method</option>
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>
                          {method.methodName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reference Number */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g., CHK-12345, REF-6789"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Remarks</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      placeholder="Optional payment notes..."
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Schedule Overview */}
          <div>
            <p className="details-title">Payment Schedule Overview</p>
            <div className="modal-content view" style={{ padding: 0 }}>
              <div className="table-wrapper" style={{ height: 'auto', maxHeight: '400px', marginTop: 0, marginBottom: 0 }}>
                <div className="tableContainer">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Installment</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewItems.map((item, index) => {
                        const balance = item.currentDueAmount - item.paidAmount;
                        const isAffected = cascadePreview?.affectedInstallments.some(
                          a => a.scheduleItemId === item.id
                        );
                        
                        return (
                          <tr 
                            key={item.id || index}
                            style={{
                              backgroundColor: isAffected ? '#FFF9E6' : 'transparent',
                              fontWeight: isAffected ? '600' : 'normal'
                            }}
                          >
                            <td>
                              <span className="chip normal">
                                {item.installmentNumber} of {previewItems.length}
                              </span>
                            </td>
                            <td>{formatDate(item.currentDueDate)}</td>
                            <td>{formatMoney(item.currentDueAmount)}</td>
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

        {/* Action Buttons */}
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

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default RecordPaymentModal;
