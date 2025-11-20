'use client';

import React, { useState } from 'react';
import { ExpenseScheduleItem, ExpenseScheduleFrequency, PaymentStatus } from '../types/expenses';
import { formatMoney, formatDate } from '../utils/formatting';
import { distributeAmount, smartDistributeAmount, validateDateRange } from '../utils/expenseScheduleCalculations';
import '../styles/components/table.css';
import '../styles/components/chips.css';
import '../styles/components/forms.css';

interface ExpenseScheduleTableProps {
  scheduleItems: ExpenseScheduleItem[];
  mode: 'add' | 'edit' | 'view';
  onItemChange?: (items: ExpenseScheduleItem[]) => void;
  totalAmount: number;
  isPrepaid: boolean;
  frequency?: ExpenseScheduleFrequency;
  onRecordPayment?: (item: ExpenseScheduleItem) => void;
}

const ExpenseScheduleTable: React.FC<ExpenseScheduleTableProps> = ({
  scheduleItems,
  mode,
  onItemChange,
  totalAmount,
  isPrepaid,
  frequency,
  onRecordPayment
}) => {
  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
  const [editingAmountIndex, setEditingAmountIndex] = useState<number | null>(null);
  const [dateError, setDateError] = useState<string>('');

  if (!isPrepaid || scheduleItems.length === 0) {
    return (
      <div className="modal-content view">
        <p className="no-data">No payment schedule configured</p>
      </div>
    );
  }

  const handleDateChange = (index: number, newDate: string) => {
    if (!onItemChange) return;

    const prevDate = index > 0 ? scheduleItems[index - 1].currentDueDate : undefined;
    const nextDate = index < scheduleItems.length - 1 ? scheduleItems[index + 1].currentDueDate : undefined;

    const validation = validateDateRange(newDate, prevDate, nextDate);

    if (!validation.isValid) {
      setDateError(validation.errorMessage || 'Invalid date');
      return;
    }

    setDateError('');
    const updatedItems = [...scheduleItems];
    updatedItems[index].currentDueDate = newDate;
    onItemChange(updatedItems);
  };

  const handleAmountChange = (index: number, newAmount: number) => {
    if (!onItemChange) return;

    const updatedItems = smartDistributeAmount(totalAmount, scheduleItems, index, newAmount);
    onItemChange(updatedItems);
  };

  const handleAddDate = () => {
    if (!onItemChange || frequency !== ExpenseScheduleFrequency.CUSTOM) return;

    const today = new Date();
    const lastItem = scheduleItems[scheduleItems.length - 1];
    const lastDate = lastItem ? new Date(lastItem.currentDueDate + 'T00:00:00') : today;
    
    // Default to 1 day after last item or today
    const newDate = new Date(lastDate);
    newDate.setDate(newDate.getDate() + 1);
    
    const newItem: ExpenseScheduleItem = {
      id: `temp-${Date.now()}`,
      installmentNumber: scheduleItems.length + 1,
      originalDueDate: formatDateInput(newDate),
      currentDueDate: formatDateInput(newDate),
      originalDueAmount: 0,
      currentDueAmount: 0,
      paidAmount: 0,
      carriedOverAmount: 0,
      paymentStatus: PaymentStatus.PENDING,
      isPastDue: false,
      isEditable: true
    };

    const updatedItems = [...scheduleItems, newItem];
    const redistributed = distributeAmount(totalAmount, updatedItems);
    onItemChange(redistributed);
  };

  const handleRemoveDate = (index: number) => {
    if (!onItemChange || frequency !== ExpenseScheduleFrequency.CUSTOM) return;

    // Can only remove if it's the last item and not paid
    if (index !== scheduleItems.length - 1 || !scheduleItems[index].isEditable) {
      return;
    }

    const updatedItems = scheduleItems.filter((_, i) => i !== index);
    // Renumber installments
    updatedItems.forEach((item, i) => {
      item.installmentNumber = i + 1;
    });
    const redistributed = distributeAmount(totalAmount, updatedItems);
    onItemChange(redistributed);
  };

  const getStatusChipClass = (status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.PAID:
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
    return status.replace('_', ' ');
  };

  // Calculate totals
  const totalDue = scheduleItems.reduce((sum, item) => sum + item.currentDueAmount, 0);
  const totalPaid = scheduleItems.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalBalance = totalDue - totalPaid;
  const totalCarriedOver = scheduleItems.reduce((sum, item) => sum + item.carriedOverAmount, 0);

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
      
      <div className="table-wrapper" style={{ maxHeight: '400px', marginBottom: '20px' }}>
        <table className="modal-table">
          <thead className="modal-table-heading">
            <tr>
              <th style={{ width: '60px' }}>No.</th>
              <th style={{ width: '140px' }}>Due Date</th>
              {mode !== 'add' && <th style={{ width: '120px' }}>Original Amount</th>}
              {totalCarriedOver > 0 && <th style={{ width: '120px' }}>Carried Over</th>}
              <th style={{ width: '120px' }}>Current Due</th>
              {showPaidColumn && <th style={{ width: '120px' }}>Paid Amount</th>}
              <th style={{ width: '120px' }}>Balance</th>
              <th style={{ width: '140px' }}>Status</th>
              {isEditable && frequency === ExpenseScheduleFrequency.CUSTOM && (
                <th style={{ width: '80px' }}>Actions</th>
              )}
              {onRecordPayment && (
                <th style={{ width: '80px' }}>Action</th>
              )}
            </tr>
          </thead>
          <tbody className="modal-table-body">
            {scheduleItems.map((item, index) => {
              const balance = item.currentDueAmount - item.paidAmount;
              const isDateEditable = isEditable && item.isEditable && item.paymentStatus === PaymentStatus.PENDING;
              const isAmountEditable = isEditable && item.isEditable;
              const hasCarryOver = item.carriedOverAmount > 0;
              const amountChanged = item.currentDueAmount !== item.originalDueAmount;

              return (
                <tr key={item.id || index}>
                  {/* Installment Number */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <span>{item.installmentNumber}</span>
                      {hasCarryOver && (
                        <span 
                          title={`Includes carried over amount: ${formatMoney(item.carriedOverAmount)}`}
                          style={{ 
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#FF8C00',
                            animation: 'pulse-dot 2s infinite'
                          }}
                        />
                      )}
                    </div>
                  </td>

                  {/* Due Date */}
                  <td>
                    {isDateEditable && editingDateIndex === index ? (
                      <div>
                        <input
                          type="date"
                          value={item.currentDueDate}
                          onChange={(e) => handleDateChange(index, e.target.value)}
                          onBlur={() => setEditingDateIndex(null)}
                          min={new Date().toISOString().split('T')[0]}
                          autoFocus
                          className={dateError ? 'invalid-input' : ''}
                          style={{ width: '100%', padding: '4px' }}
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
                        {formatDate(item.currentDueDate)}
                        {!item.isEditable && <i className="ri-lock-line" style={{ marginLeft: '5px', fontSize: '12px' }}></i>}
                      </span>
                    )}
                  </td>

                  {/* Original Amount (edit/view mode) */}
                  {mode !== 'add' && (
                    <td style={{ textDecoration: amountChanged ? 'line-through' : 'none', color: amountChanged ? '#999' : 'inherit' }}>
                      {formatMoney(item.originalDueAmount)}
                    </td>
                  )}

                  {/* Carried Over Amount */}
                  {totalCarriedOver > 0 && (
                    <td style={{ color: hasCarryOver ? '#FF8C00' : 'inherit', fontWeight: hasCarryOver ? '600' : 'normal' }}>
                      {hasCarryOver ? `+${formatMoney(item.carriedOverAmount)}` : '-'}
                    </td>
                  )}

                  {/* Current Due Amount */}
                  <td>
                    {isAmountEditable && editingAmountIndex === index ? (
                      <input
                        type="number"
                        value={item.currentDueAmount}
                        onChange={(e) => handleAmountChange(index, parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingAmountIndex(null)}
                        min="0.01"
                        step="0.01"
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => isAmountEditable && setEditingAmountIndex(index)}
                        style={{ 
                          cursor: isAmountEditable ? 'pointer' : 'default',
                          textDecoration: isAmountEditable ? 'underline' : 'none',
                          color: amountChanged ? '#007BFF' : 'inherit',
                          fontWeight: amountChanged ? '600' : 'normal'
                        }}
                      >
                        {formatMoney(item.currentDueAmount)}
                      </span>
                    )}
                  </td>

                  {/* Paid Amount (edit/view mode) */}
                  {showPaidColumn && (
                    <td style={{ backgroundColor: item.paidAmount > 0 ? '#E8F5E9' : 'transparent' }}>
                      {formatMoney(item.paidAmount)}
                    </td>
                  )}

                  {/* Balance */}
                  <td style={{ color: balance > 0 && item.isPastDue ? '#FF4949' : 'inherit', fontWeight: balance > 0 ? '600' : 'normal' }}>
                    {formatMoney(balance)}
                  </td>

                  {/* Status */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`chip ${getStatusChipClass(item.paymentStatus)}`}>
                      {formatStatusLabel(item.paymentStatus)}
                    </span>
                  </td>

                  {/* Actions (Custom frequency only) */}
                  {isEditable && frequency === ExpenseScheduleFrequency.CUSTOM && (
                    <td style={{ textAlign: 'center' }}>
                      {index === scheduleItems.length - 1 && item.isEditable && (
                        <button
                          onClick={() => handleRemoveDate(index)}
                          className="deleteBtn"
                          title="Remove"
                          style={{ width: '28px', height: '28px' }}
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      )}
                    </td>
                  )}
                  {onRecordPayment && (
                    <td style={{ textAlign: 'center' }}>
                      {item.paymentStatus !== PaymentStatus.PAID && (
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
              <td colSpan={mode !== 'add' ? 2 : 1}>
                TOTAL:
              </td>
              {mode !== 'add' && <td>{formatMoney(scheduleItems.reduce((sum, item) => sum + item.originalDueAmount, 0))}</td>}
              {totalCarriedOver > 0 && <td style={{ color: '#FF8C00' }}>{formatMoney(totalCarriedOver)}</td>}
              <td>{formatMoney(totalDue)}</td>
              {showPaidColumn && <td>{formatMoney(totalPaid)}</td>}
              <td style={{ color: totalBalance > 0 ? '#FF4949' : '#4CAF50' }}>{formatMoney(totalBalance)}</td>
              <td colSpan={frequency === ExpenseScheduleFrequency.CUSTOM && isEditable ? 2 : 1}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add Date Button for Custom Frequency */}
      {isEditable && frequency === ExpenseScheduleFrequency.CUSTOM && (
        <div style={{ marginTop: '10px' }}>
          <button
            type="button"
            onClick={handleAddDate}
            className="modal-table-add-btn"
          >
            <i className="ri-add-line"></i>
            Add Installment Date
          </button>
        </div>
      )}

      {/* Warning if total mismatch */}
      {Math.abs(totalDue - totalAmount) > 0.01 && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#FFF3CD', borderRadius: '4px', border: '1px solid #FFE69C' }}>
          <i className="ri-alert-line" style={{ color: '#856404', marginRight: '5px' }}></i>
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

export default ExpenseScheduleTable;
