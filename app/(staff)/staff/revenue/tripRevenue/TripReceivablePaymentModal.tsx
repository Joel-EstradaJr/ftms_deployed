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

import React, { useState, useMemo, useEffect } from "react";
import RecordPaymentModal from "@/Components/RecordPaymentModal";
import { processCascadePayment } from "../../../../utils/revenueScheduleCalculations";
import { formatMoney, formatDate } from "@/utils/formatting";
import { PaymentRecordData } from "@/app/types/payments";
import { RevenueScheduleItem } from "../../../../types/revenue";
import { ScheduleItem, PaymentStatus } from "@/app/types/schedule";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";

// Use ScheduleItem directly instead of SimpleScheduleItem for type compatibility
type SimpleScheduleItem = ScheduleItem;

// Internal enriched trip data interface (populated from API)
interface EnrichedTripData {
  assignment_id: string;
  body_number: string;
  bus_route: string;
  date_assigned: string;
  payment_status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';

  // Driver details
  driverId?: string;
  driverEmployeeNumber?: string;
  driverName?: string;

  // Conductor details
  conductorId?: string;
  conductorEmployeeNumber?: string;
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
}

interface TripReceivablePaymentModalProps {
  revenueId: number; // Revenue ID to fetch detail data
  tripData: {
    assignment_id: string;
    body_number: string;
    bus_route: string;
    date_assigned: string;
    payment_status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';
  };
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  currentUser: string;
  onPaymentRecorded: (paymentData: PaymentRecordData & { employeeType: 'driver' | 'conductor'; employeeId: string; employeeNumber?: string }) => Promise<void>;
  onCloseReceivable?: (revenueId: number) => Promise<void>;
  onClose: () => void;
}

type EmployeeTab = 'driver' | 'conductor';

export default function TripReceivablePaymentModal({
  revenueId,
  tripData: initialTripData,
  paymentMethods,
  currentUser,
  onPaymentRecorded,
  onCloseReceivable,
  onClose
}: TripReceivablePaymentModalProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeTab>('driver');
  const [selectedInstallment, setSelectedInstallment] = useState<SimpleScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger data refresh after payment

  // Enriched trip data from API
  const [tripData, setTripData] = useState<EnrichedTripData>({
    assignment_id: initialTripData.assignment_id,
    body_number: initialTripData.body_number,
    bus_route: initialTripData.bus_route,
    date_assigned: initialTripData.date_assigned,
    payment_status: initialTripData.payment_status,
  });

  // Fetch detail data from API
  useEffect(() => {
    const fetchDetailData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/revenue/${revenueId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch revenue details');
        }

        const data = result.data;
        console.log("TripReceivablePaymentModal API Data:", data);

        // Map API response to enriched trip data
        const enrichedData: EnrichedTripData = {
          assignment_id: data.assignment_id || initialTripData.assignment_id,
          body_number: data.bus_details?.body_number || initialTripData.body_number,
          bus_route: data.bus_details?.route || initialTripData.bus_route || 'N/A',
          date_assigned: data.bus_details?.date_assigned || initialTripData.date_assigned,
          payment_status: data.payment_status || initialTripData.payment_status,

          // Driver details
          driverId: data.employees?.driver?.employee_number || undefined,
          driverEmployeeNumber: data.employees?.driver?.employee_number || undefined,
          driverName: data.employees?.driver?.name || 'N/A',

          // Conductor details
          conductorId: data.employees?.conductor?.employee_number || undefined,
          conductorEmployeeNumber: data.employees?.conductor?.employee_number || undefined,
          conductorName: data.employees?.conductor?.name || undefined,
        };

        // Map shortage details if present
        if (data.shortage_details) {
          const driverReceivable = data.shortage_details.driver_receivable;
          const conductorReceivable = data.shortage_details.conductor_receivable;

          enrichedData.receivableDetails = {
            totalAmount: data.remittance?.shortage || 0,
            dueDate: data.shortage_details.receivable_due_date || '',
            createdDate: data.remittance?.date_recorded || '',
            driverShare: data.shortage_details.driver_share || 0,
            conductorShare: data.shortage_details.conductor_share || undefined,
            overallStatus: mapReceivableStatus(driverReceivable?.status, conductorReceivable?.status),
          };

          // Map driver installments
          if (driverReceivable?.installment_schedules) {
            enrichedData.driverInstallments = driverReceivable.installment_schedules.map((inst: any) => ({
              id: `driver-inst-${inst.id}`, // Maintain unique ID for React keys
              // Map to ScheduleItem properties
              installment_number: inst.installment_number,
              due_date: inst.due_date,
              amount_due: inst.amount_due,
              amount_paid: inst.amount_paid || 0,
              balance: inst.balance || ((inst.amount_due || 0) - (inst.amount_paid || 0)),
              status: inst.status || 'PENDING',

              // UI computed properties
              isPastDue: new Date(inst.due_date) < new Date() && (inst.balance > 0 || ((inst.amount_due || 0) - (inst.amount_paid || 0)) > 0),
              isEditable: inst.status !== 'COMPLETED',
            }));
          }

          // Map conductor installments
          if (conductorReceivable?.installment_schedules) {
            enrichedData.conductorInstallments = conductorReceivable.installment_schedules.map((inst: any) => ({
              id: `conductor-inst-${inst.id}`,
              // Map to ScheduleItem properties
              installment_number: inst.installment_number,
              due_date: inst.due_date,
              amount_due: inst.amount_due,
              amount_paid: inst.amount_paid || 0,
              balance: inst.balance || ((inst.amount_due || 0) - (inst.amount_paid || 0)),
              status: inst.status || 'PENDING',

              // UI computed properties
              isPastDue: new Date(inst.due_date) < new Date() && (inst.balance > 0 || ((inst.amount_due || 0) - (inst.amount_paid || 0)) > 0),
              isEditable: inst.status !== 'COMPLETED',
            }));
          }
        }

        setTripData(enrichedData);
      } catch (err) {
        console.error('Error fetching revenue details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load revenue details');
      } finally {
        setLoading(false);
      }
    };

    if (revenueId) {
      fetchDetailData();
    }
  }, [revenueId, initialTripData, refreshKey]); // refreshKey triggers re-fetch after payment

  // Helper to map receivable status
  const mapReceivableStatus = (driverStatus?: string, conductorStatus?: string): 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Closed' => {
    if (driverStatus === 'COMPLETED' && (!conductorStatus || conductorStatus === 'COMPLETED')) return 'Paid';
    if (driverStatus === 'PARTIALLY_PAID' || conductorStatus === 'PARTIALLY_PAID') return 'Partial';
    if (driverStatus === 'OVERDUE' || conductorStatus === 'OVERDUE') return 'Overdue';
    return 'Pending';
  };

  // Check if conductor exists
  const hasConductor = (): boolean => {
    return !!(tripData.conductorId && tripData.conductorName && tripData.conductorName !== 'N/A');
  };

  // Get driver name directly from enriched data
  const driverName = tripData.driverName || 'N/A';

  // Get conductor name directly from enriched data
  const conductorName = tripData.conductorName || 'N/A';

  // Get schedule items for selected employee
  const getScheduleItems = (): SimpleScheduleItem[] => {
    const items = selectedEmployee === 'driver'
      ? tripData.driverInstallments
      : tripData.conductorInstallments;

    if (!items || items.length === 0) return [];

    // Convert RevenueScheduleItem to SimpleScheduleItem
    // Return items directly as they match the interface. avoid redundant mapping that may strip fields.
    return items;
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
    const totalDue = items.reduce((sum, item) => sum + item.amount_due, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.amount_paid, 0);
    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  }, [tripData.driverInstallments, driverShare]);

  const conductorTotal = useMemo(() => {
    const items = tripData.conductorInstallments || [];
    if (items.length === 0) {
      return { totalDue: conductorShare, totalPaid: 0, balance: conductorShare };
    }
    const totalDue = items.reduce((sum, item) => sum + item.amount_due, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.amount_paid, 0);
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
    const totalDue = items.reduce((sum, item) => sum + item.amount_due, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.amount_paid, 0);

    if (totalDue > 0 && totalPaid >= totalDue) return 'COMPLETED';
    if (totalPaid > 0) return 'PARTIAL';
    return 'PENDING';
  };

  // Get status chip class
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'COMPLETED': return 'paid';
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

    const employeeNumber = selectedEmployee === 'driver'
      ? tripData.driverEmployeeNumber
      : tripData.conductorEmployeeNumber;

    await onPaymentRecorded({
      ...paymentData,
      employeeType: selectedEmployee,
      employeeId,
      employeeNumber
    });

    // Refresh data to show updated balances
    setRefreshKey(prev => prev + 1);

    // Reset selected installment after payment (returns to installment list view)
    setSelectedInstallment(null);
  };

  // Handle close receivable
  const handleCloseReceivable = async () => {
    if (onCloseReceivable && isFullyPaid) {
      await onCloseReceivable(revenueId);
      onClose();
    }
  };

  // Get first unpaid installment for the selected employee
  const getFirstUnpaidInstallment = (): SimpleScheduleItem | null => {
    const unpaid = scheduleItems.find(item => {
      // Calculate balance if not provided
      const balance = item.balance ?? (item.amount_due - (item.amount_paid || 0));
      // Must have positive balance AND not be in a terminal status
      return balance > 0 &&
        item.status !== 'COMPLETED' &&
        item.status !== 'CANCELLED' &&
        item.status !== 'WRITTEN_OFF';
    });
    return unpaid || null;
  };

  // If an installment is selected, show RecordPaymentModal
  if (selectedInstallment) {
    const employeeName = selectedEmployee === 'driver' ? driverName : conductorName;
    const employeeNumber = selectedEmployee === 'driver'
      ? tripData.driverEmployeeNumber
      : tripData.conductorEmployeeNumber;
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
        employeeNumber={employeeNumber}
        employeeName={employeeName}
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <>
        <div className="modal-heading">
          <h1 className="modal-title">Record Receivable Payment</h1>
          <button className="close-modal-btn" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading receivable details...</p>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <div className="modal-heading">
          <h1 className="modal-title">Record Receivable Payment</h1>
          <button className="close-modal-btn" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view" style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
          <p>{error}</p>
        </div>
      </>
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
            {tripData.driverEmployeeNumber && (
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                ID: {tripData.driverEmployeeNumber}
              </div>
            )}
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
              {tripData.conductorEmployeeNumber && (
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                  ID: {tripData.conductorEmployeeNumber}
                </div>
              )}
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

        {!isFullyPaid && (
          <button
            type="button"
            className="submit-btn"
            onClick={() => {
              // If there are schedule items, select the first unpaid one
              if (scheduleItems.length > 0) {
                const firstUnpaid = getFirstUnpaidInstallment();
                if (firstUnpaid) setSelectedInstallment(firstUnpaid);
              } else {
                // No installments yet - create a synthetic schedule item for the share amount
                const currentBalance = selectedEmployee === 'driver'
                  ? driverTotal.balance
                  : conductorTotal.balance;

                if (currentBalance > 0) {
                  // Create a synthetic installment for direct payment
                  const syntheticInstallment: SimpleScheduleItem = {
                    id: `synthetic-${tripData.assignment_id}-${selectedEmployee}`,
                    installment_number: 1,
                    due_date: tripData.receivableDetails?.dueDate || new Date().toISOString(),
                    amount_due: currentBalance,
                    amount_paid: 0,
                    balance: currentBalance,
                    status: PaymentStatus.PENDING
                  };
                  setSelectedInstallment(syntheticInstallment);
                }
              }
            }}
            disabled={
              (selectedEmployee === 'driver' && driverTotal.balance <= 0) ||
              (selectedEmployee === 'conductor' && conductorTotal.balance <= 0)
            }
          >
            <i className="ri-money-dollar-circle-line" style={{ marginRight: '8px' }}></i>
            Add Payment
          </button>
        )}
      </div>
    </>
  );
}
