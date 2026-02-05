'use client';

import React, { useState } from 'react';
import { RevenueScheduleItem, RevenueScheduleFrequency, PaymentStatus } from '../types/revenue';
import { ScheduleFrequency } from '../types/schedule';
import { formatMoney, formatDate } from '../utils/formatting';
import { distributeAmount, smartDistributeAmount, validateDateRange } from '../utils/revenueScheduleCalculations';
import '../styles/components/table.css';
import '../styles/components/chips.css';
import '../styles/components/forms.css';

interface PaymentScheduleTableProps {
  scheduleItems: RevenueScheduleItem[];
  mode: 'add' | 'edit' | 'view';
  onItemChange?: (items: RevenueScheduleItem[]) => void;
  totalAmount: number;
  isUnearnedRevenue: boolean;
  frequency?: RevenueScheduleFrequency | ScheduleFrequency;
  onRecordPayment?: (item: RevenueScheduleItem) => void;
}

const PaymentScheduleTable: React.FC<PaymentScheduleTableProps> = ({
  scheduleItems,
  mode,
  onItemChange,
  totalAmount,
  isUnearnedRevenue,
  frequency,
  onRecordPayment
}) => {
  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
  const [editingAmountIndex, setEditingAmountIndex] = useState<number | null>(null);
  const [dateError, setDateError] = useState<string>('');

  if (!isUnearnedRevenue || scheduleItems.length === 0) {
    return (
      <div className="modal-content view">
        <p className="no-data">No payment schedule configured</p>
      </div>
    );
  }

  const handleDateChange = (index: number, newDate: string) => {
    if (!onItemChange) return;

    const prevDate = index > 0 ? scheduleItems[index - 1].due_date : undefined;
    const nextDate = index < scheduleItems.length - 1 ? scheduleItems[index + 1].due_date : undefined;

    const validation = validateDateRange(newDate, prevDate, nextDate);

    if (!validation.isValid) {
      setDateError(validation.errorMessage || 'Invalid date');
      return;
    }

    setDateError('');
    const updatedItems = [...scheduleItems];
    updatedItems[index].due_date = newDate;
    onItemChange(updatedItems);
  };

  const handleAmountChange = (index: number, newAmount: number) => {
    if (!onItemChange) return;

    const updatedItems = smartDistributeAmount(totalAmount, scheduleItems, index, newAmount);
    onItemChange(updatedItems);
  };

  const handleAddDate = () => {
    if (!onItemChange) return;

    const today = new Date();
    const lastItem = scheduleItems[scheduleItems.length - 1];
    const lastDate = lastItem ? new Date(lastItem.due_date + 'T00:00:00') : today;

    // Default to 1 day after last item or today
    const newDate = new Date(lastDate);
    newDate.setDate(newDate.getDate() + 1);

    const newItem: RevenueScheduleItem = {
      id: `temp-${Date.now()}`,
      installment_number: scheduleItems.length + 1,
      due_date: formatDateInput(newDate),
      amount_due: 0,
      amount_paid: 0,
      balance: 0,
      status: PaymentStatus.PENDING,
      isPastDue: false,
      isEditable: true
    };

    const updatedItems = [...scheduleItems, newItem];
    const redistributed = distributeAmount(totalAmount, updatedItems);
    onItemChange(redistributed);
  };

  const handleRemoveDate = (index: number) => {
    if (!onItemChange) return;

    // Can only remove if it's the last item and not paid
    if (index !== scheduleItems.length - 1 || scheduleItems[index].status !== PaymentStatus.PENDING) {
      return;
    }

    const updatedItems = scheduleItems.filter((_, i) => i !== index);
    // Renumber installments
    updatedItems.forEach((item, i) => {
      item.installment_number = i + 1;
    });
    const redistributed = distributeAmount(totalAmount, updatedItems);
    onItemChange(redistributed);
  };

  const getStatusChipClass = (status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return 'paid';
      case PaymentStatus.PARTIALLY_PAID:
        return 'partially-paid';
      case PaymentStatus.OVERDUE:
        return 'overdue';
      case PaymentStatus.PENDING:
        return 'pending';
      case PaymentStatus.CANCELLED:
        return 'cancelled';
      case PaymentStatus.WRITTEN_OFF:
        return 'written-off';
      default:
        return 'pending';
    }
  };

  const formatStatusLabel = (status: PaymentStatus): string => {
    return (status || 'PENDING').replace('_', ' ');
  };

  // Calculate totals using schema-aligned field names
  const totalDue = scheduleItems.reduce((sum, item) => sum + (item.amount_due || 0), 0);
  const totalPaid = scheduleItems.reduce((sum, item) => sum + (item.amount_paid || 0), 0);
  const totalBalance = totalDue - totalPaid;

  const isEditable = mode === 'add' || mode === 'edit';
  const showPaidColumn = mode === 'edit' || mode === 'view';

  return (
    <>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>

      <div className="payment-table-wrapper">
        <table className="tableContainer">
          <thead className="data-table">
            <tr>
              <th style={{ width: '140px' }}>Due Date</th>
              <th style={{ width: '120px' }}>Amount Due</th>
              {showPaidColumn && <th style={{ width: '120px' }}>Paid Amount</th>}
              <th style={{ width: '120px' }}>Balance</th>
              <th style={{ width: '110px' }}>Status</th>
              {onRecordPayment && (
                <th style={{ width: '80px' }}>Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {scheduleItems.map((item, index) => {
              const balance = (item.amount_due || 0) - (item.amount_paid || 0);
              const isDateEditable = isEditable && item.status === PaymentStatus.PENDING;
              const isAmountEditable = isEditable && item.status === PaymentStatus.PENDING;
              const itemStatus = item.status || PaymentStatus.PENDING;

              return (
                <tr key={item.id || index}>
                  {/* Due Date */}
                  <td>
                    {isDateEditable && editingDateIndex === index ? (
                      <div>
                        <input
                          type="date"
                          value={item.due_date}
                          onChange={(e) => handleDateChange(index, e.target.value)}
                          onBlur={() => setEditingDateIndex(null)}
                          min={new Date().toISOString().split('T')[0]}
                          autoFocus
                          className={dateError ? 'invalid-input' : ''}
                        />
                        {dateError && <small className="error-text">{dateError}</small>}
                      </div>
                    ) : (
                      <span
                        onClick={() => isDateEditable && setEditingDateIndex(index)}
                        style={{
                          cursor: isDateEditable ? 'pointer' : 'default',
                          textDecoration: isDateEditable ? 'underline' : 'none'
                        }}
                      >
                        {formatDate(item.due_date)}
                        {itemStatus !== PaymentStatus.PENDING && <i className="ri-lock-line"></i>}
                      </span>
                    )}
                  </td>

                  {/* Amount Due */}
                  <td>
                    {isAmountEditable && editingAmountIndex === index ? (
                      <input
                        type="number"
                        value={item.amount_due}
                        onChange={(e) => handleAmountChange(index, parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingAmountIndex(null)}
                        min="0.01"
                        step="0.01"
                        autoFocus
                      />
                    ) : (
                      <div>
                        <span
                          onClick={() => isAmountEditable && setEditingAmountIndex(index)}
                          style={{
                            cursor: isAmountEditable ? 'pointer' : 'default',
                            textDecoration: isAmountEditable ? 'underline' : 'none'
                          }}
                        >
                          {formatMoney(item.amount_due || 0)}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Paid Amount (edit/view mode) */}
                  {showPaidColumn && (
                    <td style={{ backgroundColor: (item.amount_paid || 0) > 0 ? '#E8F5E9' : 'transparent' }}>
                      {formatMoney(item.amount_paid || 0)}
                    </td>
                  )}

                  {/* Balance */}
                  <td style={{ color: balance > 0 && item.isPastDue ? '#FF4949' : 'inherit', fontWeight: balance > 0 ? '600' : 'normal' }}>
                    {formatMoney(balance)}
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`chip ${getStatusChipClass(itemStatus)}`}>
                      {formatStatusLabel(itemStatus)}
                    </span>
                  </td>

                  {onRecordPayment && (
                    <td style={{ textAlign: 'center' }}>
                      {itemStatus !== PaymentStatus.COMPLETED &&
                        itemStatus !== PaymentStatus.CANCELLED &&
                        itemStatus !== PaymentStatus.WRITTEN_OFF && (
                          <button
                            onClick={() => onRecordPayment(item)}
                            className="recordBtn"
                            title="Record Payment"
                            style={{ width: '34px', height: '34px' }}
                          >
                            <i className="ri-money-dollar-circle-line"></i>
                          </button>
                        )}
                    </td>
                  )}
                </tr>
              );
            })}

            {/* Totals Row */}
            <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: '600', backgroundColor: 'var(--table-header-color)' }}>
              <td>
                TOTAL:
              </td>
              <td>{formatMoney(totalDue)}</td>
              {showPaidColumn && <td>{formatMoney(totalPaid)}</td>}
              <td style={{ color: totalBalance > 0 ? '#FF4949' : '#4CAF50' }}>{formatMoney(totalBalance)}</td>
              <td colSpan={onRecordPayment ? 2 : 1}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Warning if total mismatch */}
      {Math.abs(totalDue - totalAmount) > 0.01 && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#FFF3CD', borderRadius: '4px', border: '1px solid #FFE69C' }}>
          <i className="ri-alert-line" style={{ color: '#856404' }}></i>
          <span style={{ color: '#856404', fontSize: '14px' }}>
            Warning: Total due ({formatMoney(totalDue)}) does not match total amount ({formatMoney(totalAmount)})
          </span>
        </div>
      )}
    </>
  );
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default PaymentScheduleTable;
