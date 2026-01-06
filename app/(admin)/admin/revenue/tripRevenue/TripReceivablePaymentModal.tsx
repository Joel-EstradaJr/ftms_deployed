/**
 * Trip Receivable Payment Modal
 * 
 * Wrapper component for RecordPaymentModal that handles driver/conductor
 * separation for trip revenue receivable payments.
 * 
 * Features:
 * - Employee selector tabs (Driver | Conductor)
 * - Summary card showing total receivable and status
 * - Passes selected employee's schedule to generic RecordPaymentModal
 * - Auto-close receivable when all payments complete
 */

"use client";

import React, { useState, useMemo } from "react";
import RecordPaymentModal, { SimpleScheduleItem } from "@/Components/RecordPaymentModal";
import { processCascadePayment } from "../../../../utils/revenueScheduleCalculations";
import { formatMoney, formatDate } from "@/utils/formatting";
import { PaymentRecordData } from "@/app/types/payments";
import { RevenueScheduleItem } from "../../../../types/revenue";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";

interface TripReceivablePaymentModalProps {
  tripData: {
    assignment_id: string;
    body_number: string;
    bus_route: string;
    date_assigned: string;
    status?: string;
    
    // Driver details
    driverId?: string;
    driverFirstName?: string;
    driverMiddleName?: string;
    driverLastName?: string;
    driverSuffix?: string;
    driverName?: string;
    
    // Conductor details
    conductorId?: string;
    conductorFirstName?: string;
    conductorMiddleName?: string;
    conductorLastName?: string;
    conductorSuffix?: string;
    conductorName?: string;
    
    // Receivable details
    receivableDetails?: {
      totalAmount: number;
      dueDate: string;
      createdDate: string;
      driverShare: number;
      conductorShare?: number;
      overallStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Closed';
    };
    
    // Installment schedules (RevenueScheduleItem format)
    driverInstallments?: RevenueScheduleItem[];
    conductorInstallments?: RevenueScheduleItem[];
  };
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  currentUser: string;
  onPaymentRecorded: (paymentData: PaymentRecordData & { employeeType: 'driver' | 'conductor'; employeeId: string }) => Promise<void>;
  onCloseReceivable?: (assignmentId: string) => Promise<void>;
  onClose: () => void;
}

type EmployeeTab = 'driver' | 'conductor';

export default function TripReceivablePaymentModal({
  tripData,
  paymentMethods,
  currentUser,
  onPaymentRecorded,
  onCloseReceivable,
  onClose
}: TripReceivablePaymentModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeTab>('driver');
  const [selectedInstallment, setSelectedInstallment] = useState<SimpleScheduleItem | null>(null);

  // Check if conductor exists
  const hasConductor = (): boolean => {
    return !!(tripData.conductorId && tripData.conductorName && tripData.conductorName !== 'N/A');
  };

  // Format employee name
  const formatEmployeeName = (firstName?: string, middleName?: string, lastName?: string, suffix?: string): string => {
    if (!firstName) return 'N/A';
    const name = `${firstName} ${middleName || ''} ${lastName || ''}`.trim();
    return suffix ? `${name}, ${suffix}` : name;
  };

  // Get driver name
  const driverName = tripData.driverName || formatEmployeeName(
    tripData.driverFirstName,
    tripData.driverMiddleName,
    tripData.driverLastName,
    tripData.driverSuffix
  );

  // Get conductor name
  const conductorName = tripData.conductorName || formatEmployeeName(
    tripData.conductorFirstName,
    tripData.conductorMiddleName,
    tripData.conductorLastName,
    tripData.conductorSuffix
  );

  // Get schedule items for selected employee
  const getScheduleItems = (): SimpleScheduleItem[] => {
    const items = selectedEmployee === 'driver' 
      ? tripData.driverInstallments 
      : tripData.conductorInstallments;
    
    if (!items || items.length === 0) return [];
    
    // Convert RevenueScheduleItem to SimpleScheduleItem
    return items.map(item => ({
      id: item.id,
      installmentNumber: item.installmentNumber,
      currentDueDate: item.currentDueDate,
      currentDueAmount: item.currentDueAmount,
      paidAmount: item.paidAmount,
      carriedOverAmount: item.carriedOverAmount,
      paymentStatus: item.paymentStatus
    }));
  };

  const scheduleItems = getScheduleItems();

  // Get share amounts from receivableDetails
  const driverShare = tripData.receivableDetails?.driverShare || 0;
  const conductorShare = tripData.receivableDetails?.conductorShare || 0;

  // Calculate totals for each employee - use share if no installments
  const driverTotal = useMemo(() => {
    const items = tripData.driverInstallments || [];
    if (items.length === 0) {
      return { totalDue: driverShare, totalPaid: 0, balance: driverShare };
    }
    const totalDue = items.reduce((sum, item) => sum + item.currentDueAmount, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0);
    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  }, [tripData.driverInstallments, driverShare]);

  const conductorTotal = useMemo(() => {
    const items = tripData.conductorInstallments || [];
    if (items.length === 0) {
      return { totalDue: conductorShare, totalPaid: 0, balance: conductorShare };
    }
    const totalDue = items.reduce((sum, item) => sum + item.currentDueAmount, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0);
    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  }, [tripData.conductorInstallments, conductorShare]);

  // Check if all payments are complete
  const isFullyPaid = useMemo(() => {
    // Only fully paid if there are installments and all are paid
    const driverItems = tripData.driverInstallments || [];
    const conductorItems = tripData.conductorInstallments || [];
    
    if (driverItems.length === 0 && driverShare > 0) return false;
    if (hasConductor() && conductorItems.length === 0 && conductorShare > 0) return false;
    
    const driverPaid = driverTotal.balance <= 0;
    const conductorPaid = !hasConductor() || conductorTotal.balance <= 0;
    return driverPaid && conductorPaid;
  }, [driverTotal.balance, conductorTotal.balance, tripData.driverInstallments, tripData.conductorInstallments, driverShare, conductorShare]);

  // Get status for display
  const getEmployeeStatus = (items: RevenueScheduleItem[] | undefined, share: number, paid: number): string => {
    if (!items || items.length === 0) {
      return share > 0 ? 'PENDING' : 'N/A';
    }
    const totalDue = items.reduce((sum, item) => sum + item.currentDueAmount, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0);
    
    if (totalDue > 0 && totalPaid >= totalDue) return 'PAID';
    if (totalPaid > 0) return 'PARTIAL';
    return 'PENDING';
  };

  // Get status chip class
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'PAID': return 'paid';
      case 'PARTIAL': return 'partially-paid';
      case 'OVERDUE': return 'overdue';
      default: return 'pending';
    }
  };

  // Handle payment recorded - wrap with employee info
  const handlePaymentRecorded = async (paymentData: PaymentRecordData): Promise<void> => {
    const employeeId = selectedEmployee === 'driver' 
      ? tripData.driverId || '' 
      : tripData.conductorId || '';
    
    await onPaymentRecorded({
      ...paymentData,
      employeeType: selectedEmployee,
      employeeId
    });

    // Reset selected installment after payment
    setSelectedInstallment(null);
  };

  // Handle close receivable
  const handleCloseReceivable = async () => {
    if (onCloseReceivable && isFullyPaid) {
      await onCloseReceivable(tripData.assignment_id);
      onClose();
    }
  };

  // Get first unpaid installment for the selected employee
  const getFirstUnpaidInstallment = (): SimpleScheduleItem | null => {
    const unpaid = scheduleItems.find(item => 
      item.paymentStatus !== 'PAID' && 
      item.paymentStatus !== 'CANCELLED' && 
      item.paymentStatus !== 'WRITTEN_OFF'
    );
    return unpaid || null;
  };

  // If an installment is selected, show RecordPaymentModal
  if (selectedInstallment) {
    const employeeName = selectedEmployee === 'driver' ? driverName : conductorName;
    const recordRef = `${tripData.body_number} - ${selectedEmployee === 'driver' ? 'Driver' : 'Conductor'}: ${employeeName}`;

    return (
      <RecordPaymentModal
        entityType="receivable"
        recordId={tripData.assignment_id}
        recordRef={recordRef}
        scheduleItems={scheduleItems}
        selectedInstallment={selectedInstallment}
        paymentMethods={paymentMethods}
        currentUser={currentUser}
        onPaymentRecorded={handlePaymentRecorded}
        onClose={() => setSelectedInstallment(null)}
        processCascadePayment={processCascadePayment}
      />
    );
  }

  // Main view - Employee selection
  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">Record Receivable Payment</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Trip Information Summary */}
      <p className="details-title">Trip Information</p>
      <div className="modal-content view">
        <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>Body Number:</strong> {tripData.body_number}
          </div>
          <div>
            <strong>Route:</strong> {tripData.bus_route}
          </div>
          <div>
            <strong>Date Assigned:</strong> {formatDate(tripData.date_assigned)}
          </div>
          {tripData.receivableDetails && (
            <>
              <div>
                <strong>Total Receivable:</strong> {formatMoney(tripData.receivableDetails.totalAmount)}
              </div>
              <div>
                <strong>Due Date:</strong> {formatDate(tripData.receivableDetails.dueDate)}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span className={`chip ${tripData.receivableDetails.overallStatus.toLowerCase()}`}>
                  {tripData.receivableDetails.overallStatus}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Employee Selection Tabs */}
      <p className="details-title">Select Employee to Pay</p>
      <div className="modal-content add">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          {/* Driver Tab */}
          <div
            onClick={() => setSelectedEmployee('driver')}
            style={{
              flex: 1,
              padding: '16px',
              border: selectedEmployee === 'driver' ? '2px solid var(--primary-color)' : '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedEmployee === 'driver' ? '#f0f7ff' : '#fff',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <strong style={{ fontSize: '16px' }}>
                <i className="ri-steering-2-line" style={{ marginRight: '8px' }}></i>
                Driver
              </strong>
              <span className={`chip ${getStatusClass(getEmployeeStatus(tripData.driverInstallments, driverShare, driverTotal.totalPaid))}`}>
                {getEmployeeStatus(tripData.driverInstallments, driverShare, driverTotal.totalPaid)}
              </span>
            </div>
            <div style={{ color: '#666', marginBottom: '8px' }}>{driverName}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Share: {formatMoney(driverTotal.totalDue)}</span>
              <span style={{ color: driverTotal.balance > 0 ? '#FF4949' : '#4CAF50', fontWeight: '600' }}>
                Balance: {formatMoney(driverTotal.balance)}
              </span>
            </div>
            {tripData.driverInstallments && tripData.driverInstallments.length > 0 && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                {tripData.driverInstallments.length} installment(s)
              </div>
            )}
          </div>

          {/* Conductor Tab - Only show if conductor exists */}
          {hasConductor() && (
            <div
              onClick={() => setSelectedEmployee('conductor')}
              style={{
                flex: 1,
                padding: '16px',
                border: selectedEmployee === 'conductor' ? '2px solid var(--primary-color)' : '1px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: selectedEmployee === 'conductor' ? '#f0f7ff' : '#fff',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '16px' }}>
                  <i className="ri-user-line" style={{ marginRight: '8px' }}></i>
                  Conductor
                </strong>
                <span className={`chip ${getStatusClass(getEmployeeStatus(tripData.conductorInstallments, conductorShare, conductorTotal.totalPaid))}`}>
                  {getEmployeeStatus(tripData.conductorInstallments, conductorShare, conductorTotal.totalPaid)}
                </span>
              </div>
              <div style={{ color: '#666', marginBottom: '8px' }}>{conductorName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Share: {formatMoney(conductorTotal.totalDue)}</span>
                <span style={{ color: conductorTotal.balance > 0 ? '#FF4949' : '#4CAF50', fontWeight: '600' }}>
                  Balance: {formatMoney(conductorTotal.balance)}
                </span>
              </div>
              {tripData.conductorInstallments && tripData.conductorInstallments.length > 0 && (
                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                  {tripData.conductorInstallments.length} installment(s)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Installment Schedule for Selected Employee */}
        {scheduleItems.length > 0 ? (
          <>
            <p style={{ fontWeight: '600', marginBottom: '12px' }}>
              {selectedEmployee === 'driver' ? 'Driver' : 'Conductor'} Installment Schedule
            </p>
            <div className="table-wrapper" style={{ maxHeight: '300px' }}>
              <table className="modal-table">
                <thead className="modal-table-heading">
                  <tr>
                    <th>#</th>
                    <th>Due Date</th>
                    <th>Amount Due</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className="modal-table-body">
                  {scheduleItems.map((item, index) => {
                    const balance = item.currentDueAmount - item.paidAmount;
                    const canPay = item.paymentStatus !== 'PAID' && 
                                   item.paymentStatus !== 'CANCELLED' && 
                                   item.paymentStatus !== 'WRITTEN_OFF';

                    return (
                      <tr key={item.id || index}>
                        <td>{item.installmentNumber}</td>
                        <td>{formatDate(item.currentDueDate)}</td>
                        <td>{formatMoney(item.currentDueAmount)}</td>
                        <td>{formatMoney(item.paidAmount)}</td>
                        <td style={{ color: balance > 0 ? '#FF4949' : '#4CAF50', fontWeight: '600' }}>
                          {formatMoney(balance)}
                        </td>
                        <td>
                          <span className={`chip ${item.paymentStatus.toLowerCase().replace('_', '-')}`}>
                            {item.paymentStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          {canPay && (
                            <button
                              onClick={() => setSelectedInstallment(item)}
                              className="recordBtn"
                              title="Record Payment"
                              style={{ width: '34px', height: '34px' }}
                            >
                              <i className="ri-money-dollar-circle-line"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <i className="ri-file-list-line" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}></i>
            No installment schedule found for {selectedEmployee === 'driver' ? 'driver' : 'conductor'}.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose}>
          Close
        </button>
        
        {isFullyPaid && onCloseReceivable && (
          <button
            type="button"
            className="submit-btn"
            onClick={handleCloseReceivable}
            style={{ backgroundColor: '#4CAF50' }}
          >
            <i className="ri-check-double-line" style={{ marginRight: '8px' }}></i>
            Close Receivable
          </button>
        )}
        
        {!isFullyPaid && scheduleItems.length > 0 && (
          <button
            type="button"
            className="submit-btn"
            onClick={() => {
              const firstUnpaid = getFirstUnpaidInstallment();
              if (firstUnpaid) setSelectedInstallment(firstUnpaid);
            }}
          >
            <i className="ri-money-dollar-circle-line" style={{ marginRight: '8px' }}></i>
            Pay {selectedEmployee === 'driver' ? 'Driver' : 'Conductor'}
          </button>
        )}
      </div>
    </>
  );
}
