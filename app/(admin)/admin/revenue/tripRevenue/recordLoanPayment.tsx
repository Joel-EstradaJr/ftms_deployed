/**
 * Record Loan Payment Modal Component
 * 
 * Handles individual trip deficit loan payments for driver and conductor.
 * Features:
 * - Separate payment cards for driver and conductor (if exists)
 * - Payment method selection and timestamp tracking
 * - Strict validation (exact amount matching)
 * - Confirmation with typed input ("PAY" to confirm)
 * - Close loan functionality when all payments complete
 * - Driver-only scenario support
 */

"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/modal.css";
import "@/styles/components/forms.css";
import "@/styles/components/chips.css";
import { showSuccess, showError, showConfirmation } from "@/utils/Alerts";
import { formatDate, formatMoney } from "@/utils/formatting";
import Swal from "sweetalert2";

interface RecordLoanPaymentModalProps {
  tripData: {
    assignment_id: string;
    body_number: string;
    bus_route: string;
    date_assigned: string;
    status?: string;
    driverName?: string;
    conductorName?: string;
    driverId?: string;
    driverFirstName?: string;
    driverMiddleName?: string;
    driverLastName?: string;
    driverSuffix?: string;
    conductorId?: string;
    conductorFirstName?: string;
    conductorMiddleName?: string;
    conductorLastName?: string;
    conductorSuffix?: string;
    loanDetails?: {
      totalAmount: number;
      dueDate: string;
      createdDate: string;
      driverShare: number;
      driverPaid: number;
      driverStatus: 'Pending' | 'Paid' | 'Overdue';
      driverPayments: Array<{
        date: string;
        time: string;
        amount: number;
        method: string;
        recordedBy: string;
      }>;
      conductorShare?: number;
      conductorPaid?: number;
      conductorStatus?: 'Pending' | 'Paid' | 'Overdue';
      conductorPayments?: Array<{
        date: string;
        time: string;
        amount: number;
        method: string;
        recordedBy: string;
      }>;
      overallStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Closed';
    };
  };
  onSave: (paymentData: any) => void;
  onClose: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Payroll Deduction', 'Bank Transfer'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

export default function RecordLoanPaymentModal({ tripData, onSave, onClose }: RecordLoanPaymentModalProps) {
  const hasConductor = () => {
    return tripData.conductorId && tripData.conductorName && tripData.conductorName !== 'N/A';
  };

  const [driverPaymentAmount, setDriverPaymentAmount] = useState<string>('');
  const [driverPaymentMethod, setDriverPaymentMethod] = useState<PaymentMethod | ''>('');
  const [driverError, setDriverError] = useState<string>('');

  const [conductorPaymentAmount, setConductorPaymentAmount] = useState<string>('');
  const [conductorPaymentMethod, setConductorPaymentMethod] = useState<PaymentMethod | ''>('');
  const [conductorError, setConductorError] = useState<string>('');

  const loanDetails = tripData.loanDetails;

  // Debug logging
  console.log('RecordLoanPaymentModal - tripData:', tripData);
  console.log('RecordLoanPaymentModal - loanDetails:', loanDetails);

  if (!loanDetails) {
    console.error('Loan details missing for trip:', tripData.assignment_id);
    return (
      <div className="modal-content">
        <p className="error-text">Loan details not found for this trip.</p>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          Assignment ID: {tripData.assignment_id}<br/>
          Status: {tripData.status}<br/>
          Date Assigned: {tripData.date_assigned}
        </p>
      </div>
    );
  }

  // Calculate remaining balances
  const driverRemaining = loanDetails.driverShare - loanDetails.driverPaid;
  const conductorRemaining = hasConductor() && loanDetails.conductorShare 
    ? loanDetails.conductorShare - (loanDetails.conductorPaid || 0)
    : 0;

  // Check if overdue
  const isOverdue = () => {
    const today = new Date();
    const dueDate = new Date(loanDetails.dueDate);
    return today > dueDate && loanDetails.overallStatus !== 'Paid' && loanDetails.overallStatus !== 'Closed';
  };

  // Validate driver payment
  const validateDriverPayment = (amount: string): boolean => {
    setDriverError('');
    
    if (!amount || amount.trim() === '') {
      setDriverError('Amount is required');
      return false;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setDriverError('Amount must be greater than zero');
      return false;
    }

    if (Math.abs(numAmount - driverRemaining) > 0.01) {
      setDriverError(`Amount must exactly match ${formatMoney(driverRemaining)}`);
      return false;
    }

    if (!driverPaymentMethod) {
      setDriverError('Payment method is required');
      return false;
    }

    return true;
  };

  // Validate conductor payment
  const validateConductorPayment = (amount: string): boolean => {
    setConductorError('');
    
    if (!amount || amount.trim() === '') {
      setConductorError('Amount is required');
      return false;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setConductorError('Amount must be greater than zero');
      return false;
    }

    if (Math.abs(numAmount - conductorRemaining) > 0.01) {
      setConductorError(`Amount must exactly match ${formatMoney(conductorRemaining)}`);
      return false;
    }

    if (!conductorPaymentMethod) {
      setConductorError('Payment method is required');
      return false;
    }

    return true;
  };

  // Handle driver payment with typed confirmation
  const handleDriverPayment = async () => {
    if (!validateDriverPayment(driverPaymentAmount)) {
      return;
    }

    // Show confirmation dialog requiring "PAY" to be typed
    const result = await Swal.fire({
      title: 'Confirm Payment',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Employee:</strong> ${tripData.driverName}</p>
          <p><strong>Amount:</strong> ${formatMoney(parseFloat(driverPaymentAmount))}</p>
          <p><strong>Payment Method:</strong> ${driverPaymentMethod}</p>
          <br/>
          <p style="color: #666;">Type <strong>PAY</strong> below to confirm this payment:</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Type PAY to confirm',
      showCancelButton: true,
      confirmButtonText: 'Confirm Payment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      background: 'white',
      backdrop: false,
      customClass: {
        popup: 'swal-custom-popup'
      },
      inputValidator: (value) => {
        if (value !== 'PAY') {
          return 'You must type PAY to confirm';
        }
      }
    });

    if (result.isConfirmed) {
      const now = new Date();
      const paymentData = {
        assignment_id: tripData.assignment_id,
        employeeType: 'driver',
        employeeId: tripData.driverId,
        payment: {
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          amount: parseFloat(driverPaymentAmount),
          method: driverPaymentMethod,
          recordedBy: 'Admin' // TODO: Get from auth context
        }
      };

      onSave(paymentData);
      showSuccess('Driver payment recorded successfully', 'Payment Recorded');
      
      // Close modal to refresh data
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  // Handle conductor payment with typed confirmation
  const handleConductorPayment = async () => {
    if (!validateConductorPayment(conductorPaymentAmount)) {
      return;
    }

    // Show confirmation dialog requiring "PAY" to be typed
    const result = await Swal.fire({
      title: 'Confirm Payment',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Employee:</strong> ${tripData.conductorName}</p>
          <p><strong>Amount:</strong> ${formatMoney(parseFloat(conductorPaymentAmount))}</p>
          <p><strong>Payment Method:</strong> ${conductorPaymentMethod}</p>
          <br/>
          <p style="color: #666;">Type <strong>PAY</strong> below to confirm this payment:</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Type PAY to confirm',
      showCancelButton: true,
      confirmButtonText: 'Confirm Payment',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      background: 'white',
      backdrop: false,
      customClass: {
        popup: 'swal-custom-popup'
      },
      inputValidator: (value) => {
        if (value !== 'PAY') {
          return 'You must type PAY to confirm';
        }
      }
    });

    if (result.isConfirmed) {
      const now = new Date();
      const paymentData = {
        assignment_id: tripData.assignment_id,
        employeeType: 'conductor',
        employeeId: tripData.conductorId,
        payment: {
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
          amount: parseFloat(conductorPaymentAmount),
          method: conductorPaymentMethod,
          recordedBy: 'Admin' // TODO: Get from auth context
        }
      };

      onSave(paymentData);
      showSuccess('Conductor payment recorded successfully', 'Payment Recorded');
      
      // Close modal to refresh data
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  // Handle close loan
  const handleCloseLoan = async () => {
    const hasUnpaidBalance = driverRemaining > 0 || conductorRemaining > 0;
    const totalUnpaid = driverRemaining + conductorRemaining;
    
    const result = await Swal.fire({
      title: 'Close Trip Deficit Loan',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Assignment ID:</strong> ${tripData.assignment_id}</p>
          <p><strong>Body Number:</strong> ${tripData.body_number}</p>
          <p><strong>Total Loan Amount:</strong> ${formatMoney(loanDetails.totalAmount)}</p>
          <p><strong>Total Paid:</strong> ${formatMoney(loanDetails.driverPaid + (loanDetails.conductorPaid || 0))}</p>
          ${hasUnpaidBalance ? `
            <p style="color: #FF4949; font-weight: 600; margin-top: 10px;">
              <strong>⚠️ Unpaid Balance:</strong> ${formatMoney(totalUnpaid)}
            </p>
            <p style="color: #666; font-size: 13px; margin-top: 8px;">
              This loan has an outstanding balance. Closing it will write off the unpaid amount.
            </p>
          ` : `
            <p style="color: #13CE66; font-weight: 600; margin-top: 10px;">
              ✓ Loan is fully paid
            </p>
          `}
          <br/>
          <p style="color: #666;">Type <strong>CLOSE</strong> below to confirm closing this loan:</p>
        </div>
      `,
      input: 'text',
      inputPlaceholder: 'Type CLOSE to confirm',
      showCancelButton: true,
      confirmButtonText: hasUnpaidBalance ? 'Close & Write Off' : 'Close Loan',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      background: 'white',
      backdrop: false,
      customClass: {
        popup: 'swal-custom-popup'
      },
      inputValidator: (value) => {
        if (value !== 'CLOSE') {
          return 'You must type CLOSE to confirm';
        }
      }
    });

    if (result.isConfirmed) {
      const closureData = {
        assignment_id: tripData.assignment_id,
        action: 'closeLoan',
        closedBy: 'Admin', // TODO: Get from auth context
        closedDate: new Date().toISOString()
      };

      onSave(closureData);
      showSuccess('Trip deficit loan closed successfully', 'Loan Closed');
      onClose();
    }
  };

  // Close loan is always available for administrative write-off or closure
  // No longer requires full payment - admin can close unpaid loans

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Trip Deficit Loan Payment</h1>
        <div className="modal-date-time">
          <p>{formatDate(new Date().toISOString())}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Loan Summary */}
      <p className="details-title">Loan Summary</p>
      <div className="modal-content view">
        <div className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Assignment ID</label>
              <p>{tripData.assignment_id}</p>
            </div>
            <div className="form-group">
              <label>Body Number</label>
              <p>{tripData.body_number}</p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Total Loan Amount</label>
              <p>{formatMoney(loanDetails.totalAmount)}</p>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <p>{formatDate(loanDetails.dueDate)}</p>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Overall Status</label>
              <span className={`chip ${loanDetails.overallStatus.toLowerCase().replace(' ', '-')}`}>
                {loanDetails.overallStatus}
              </span>
              {isOverdue() && (
                <span className="chip overdue" style={{ marginLeft: '8px' }}>
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Driver Payment Card */}
      <p className="details-title">Driver Payment</p>
      <div className="modal-content add">
        <div className="add-form">
          {/* Employee Info */}
          <div className="form-row">
            <div className="form-group">
              <label>Employee ID</label>
              <input type="text" value={tripData.driverId || ''} disabled />
            </div>
            <div className="form-group">
              <label>Position</label>
              <input type="text" value="Driver" disabled />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Employee Name</label>
              <input type="text" value={tripData.driverName || ''} disabled />
            </div>
          </div>

          {/* Financial Details */}
          <div className="form-row">
            <div className="form-group">
              <label>Share Amount</label>
              <input type="text" value={formatMoney(loanDetails.driverShare)} disabled />
            </div>
            <div className="form-group">
              <label>Amount Paid</label>
              <input type="text" value={formatMoney(loanDetails.driverPaid)} disabled />
            </div>
            <div className="form-group">
              <label>Remaining Balance</label>
              <input 
                type="text" 
                value={formatMoney(driverRemaining)} 
                disabled 
                style={{ fontWeight: 'bold', color: driverRemaining > 0 ? 'var(--error-color)' : 'var(--success-color)' }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="form-row">
            <div className="form-group">
              <label>Payment Status</label>
              <span className={`chip ${loanDetails.driverStatus.toLowerCase()}`}>
                {loanDetails.driverStatus}
              </span>
            </div>
          </div>

          {/* Payment Form (only if not paid) */}
          {loanDetails.driverStatus !== 'Paid' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Method<span className="requiredTags"> *</span></label>
                  <select
                    value={driverPaymentMethod}
                    onChange={(e) => setDriverPaymentMethod(e.target.value as PaymentMethod)}
                    className={driverError && !driverPaymentMethod ? 'invalid-input' : ''}
                  >
                    <option value="">Select payment method</option>
                    {PAYMENT_METHODS.map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Amount<span className="requiredTags"> *</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={driverPaymentAmount}
                    onChange={(e) => setDriverPaymentAmount(e.target.value)}
                    onBlur={() => validateDriverPayment(driverPaymentAmount)}
                    className={driverError ? 'invalid-input' : ''}
                    placeholder="Enter exact amount"
                  />
                  <small className="hint-message">
                    Must match remaining balance exactly: {formatMoney(driverRemaining)}
                  </small>
                  {driverError && <p className="add-error-message">{driverError}</p>}
                </div>
              </div>
              <div className="form-row">
                <button
                  type="button"
                  className="pay-btn"
                  onClick={handleDriverPayment}
                  disabled={
                    !driverPaymentAmount || 
                    !driverPaymentMethod || 
                    Math.abs(parseFloat(driverPaymentAmount) - driverRemaining) > 0.01
                  }
                  style={{ marginLeft: 'auto' }}
                >
                  <i className="ri-hand-coin-line"></i>
                  Pay Driver Share
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Conductor Payment Card (if exists) */}
      {hasConductor() && loanDetails.conductorShare && (
        <>
          <p className="details-title">Conductor Payment</p>
          <div className="modal-content add">
            <div className="add-form">
              {/* Employee Info */}
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID</label>
                  <input type="text" value={tripData.conductorId || ''} disabled />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input type="text" value="Conductor" disabled />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee Name</label>
                  <input type="text" value={tripData.conductorName || ''} disabled />
                </div>
              </div>

              {/* Financial Details */}
              <div className="form-row">
                <div className="form-group">
                  <label>Share Amount</label>
                  <input type="text" value={formatMoney(loanDetails.conductorShare)} disabled />
                </div>
                <div className="form-group">
                  <label>Amount Paid</label>
                  <input type="text" value={formatMoney(loanDetails.conductorPaid || 0)} disabled />
                </div>
                <div className="form-group">
                  <label>Remaining Balance</label>
                  <input 
                    type="text" 
                    value={formatMoney(conductorRemaining)} 
                    disabled 
                    style={{ fontWeight: 'bold', color: conductorRemaining > 0 ? 'var(--error-color)' : 'var(--success-color)' }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Status</label>
                  <span className={`chip ${loanDetails.conductorStatus?.toLowerCase() || 'pending'}`}>
                    {loanDetails.conductorStatus || 'Pending'}
                  </span>
                </div>
              </div>

              {/* Payment Form (only if not paid) */}
              {loanDetails.conductorStatus !== 'Paid' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Payment Method<span className="requiredTags"> *</span></label>
                      <select
                        value={conductorPaymentMethod}
                        onChange={(e) => setConductorPaymentMethod(e.target.value as PaymentMethod)}
                        className={conductorError && !conductorPaymentMethod ? 'invalid-input' : ''}
                      >
                        <option value="">Select payment method</option>
                        {PAYMENT_METHODS.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Payment Amount<span className="requiredTags"> *</span></label>
                      <input
                        type="number"
                        step="0.01"
                        value={conductorPaymentAmount}
                        onChange={(e) => setConductorPaymentAmount(e.target.value)}
                        onBlur={() => validateConductorPayment(conductorPaymentAmount)}
                        className={conductorError ? 'invalid-input' : ''}
                        placeholder="Enter exact amount"
                      />
                      <small className="hint-message">
                        Must match remaining balance exactly: {formatMoney(conductorRemaining)}
                      </small>
                      {conductorError && <p className="add-error-message">{conductorError}</p>}
                    </div>
                  </div>
                  <div className="form-row">
                    <button
                      type="button"
                      className="pay-btn"
                      onClick={handleConductorPayment}
                      disabled={
                        !conductorPaymentAmount || 
                        !conductorPaymentMethod || 
                        Math.abs(parseFloat(conductorPaymentAmount) - conductorRemaining) > 0.01
                      }
                      style={{ marginLeft: 'auto' }}
                    >
                      <i className="ri-hand-coin-line"></i>
                      Pay Conductor Share
                    </button>
                </div>
                </> 
              )}
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="submit-btn"
          onClick={handleCloseLoan}
          title="Close this loan (write off if unpaid)"
        >
          <i className="ri-checkbox-circle-line"></i>
          Close Loan
        </button>
      </div>
    </>
  );
}
