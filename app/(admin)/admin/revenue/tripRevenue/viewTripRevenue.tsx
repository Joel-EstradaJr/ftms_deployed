"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import Loading from "@/Components/loading";
import { formatDate, formatMoney } from "@/utils/formatting";

// ============================================================================
// INTERFACES - Aligned with Backend DTOs
// ============================================================================

// Backend InstallmentSchedule interface
interface InstallmentSchedule {
  id: number;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  status: string;
}

// Backend ReceivableWithSchedules interface
interface ReceivableWithSchedules {
  id: number;
  code: string;
  debtor_name: string;
  employee_number: string | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  due_date: string | null;
  installment_schedules: InstallmentSchedule[];
}

// Backend RevenueDetailResponse interface
interface RevenueDetailResponse {
  id: number;
  code: string;
  assignment_id: string;
  bus_trip_id: string;
  payment_status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'WRITTEN_OFF';

  bus_details: {
    date_assigned: string | null;
    body_number: string | null;
    license_plate: string | null;
    bus_type: string | null;
    route: string | null;
    assignment_type: string | null;
    assignment_value: number | null;
    payment_method: string | null;
    trip_revenue: number;
    trip_fuel_expense: number;
    company_share_amount: number;
  };

  employees: {
    driver: {
      employee_number: string;
      name: string;
    } | null;
    conductor: {
      employee_number: string;
      name: string;
    } | null;
  };

  remittance: {
    date_recorded: string | null;
    date_expected: string | null;
    expected_remittance: number;
    amount_remitted: number;
    shortage: number;
    description: string | null;
  };

  shortage_details?: {
    driver_share: number;
    conductor_share: number;
    receivable_due_date: string | null;
    driver_receivable: ReceivableWithSchedules | null;
    conductor_receivable: ReceivableWithSchedules | null;
  };

  journal_entry?: {
    id: number;
    code: string;
    status: string;
  };

  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

// Component Props
interface ViewTripRevenueModalProps {
  revenueId: number;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ViewTripRevenueModal({ revenueId, onClose }: ViewTripRevenueModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RevenueDetailResponse | null>(null);

  // Fetch data from backend API
  useEffect(() => {
    const fetchRevenueDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the Next.js API proxy route
        const response = await fetch(`/api/admin/revenue/${revenueId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch revenue details: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);
        } else {
          throw new Error(result.message || 'Failed to load revenue details');
        }
      } catch (err) {
        console.error('Error fetching revenue details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (revenueId) {
      fetchRevenueDetails();
    }
  }, [revenueId]);

  // Format status for display
  const formatStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'PENDING': 'Pending',
      'PARTIALLY_PAID': 'Partially Paid',
      'PAID': 'Paid',
      'COMPLETED': 'Completed',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled',
      'WRITTEN_OFF': 'Written Off',
    };
    return statusMap[status] || status;
  };

  // Get status chip class
  const getStatusChipClass = (status: string): string => {
    const classMap: Record<string, string> = {
      'PENDING': 'pending',
      'PARTIALLY_PAID': 'partial',
      'PAID': 'paid',
      'COMPLETED': 'completed',
      'OVERDUE': 'overdue',
      'CANCELLED': 'cancelled',
      'WRITTEN_OFF': 'written-off',
    };
    return classMap[status] || 'pending';
  };

  // Format installment status for display
  const formatInstallmentStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'PENDING': 'Pending',
      'COMPLETED': 'Completed',
      'PARTIALLY_PAID': 'Partial',
      'OVERDUE': 'Overdue',
    };
    return statusMap[status] || status;
  };

  // Get installment status chip class
  const getInstallmentChipClass = (status: string): string => {
    const classMap: Record<string, string> = {
      'PENDING': 'pending',
      'COMPLETED': 'completed',
      'PARTIALLY_PAID': 'receivable',
      'OVERDUE': 'overdue',
    };
    return classMap[status] || 'pending';
  };

  // Format payment method for display
  // Note: REIMBURSEMENT from external data is treated as CASH for revenue
  const formatPaymentMethod = (method: string | null): string => {
    if (!method) return 'N/A';
    const methodMap: Record<string, string> = {
      'CASH': 'Cash',
      'BANK_TRANSFER': 'Bank Transfer',
      'E_WALLET': 'E-Wallet',
    };
    return methodMap[method] || 'Cash'; // Default to Cash for unknown methods
  };

  // Format assignment type for display
  const formatAssignmentType = (type: string | null): string => {
    if (!type) return 'N/A';
    const typeMap: Record<string, string> = {
      'BOUNDARY': 'Boundary',
      'PERCENTAGE': 'Percentage',
    };
    return typeMap[type] || type;
  };

  // Check if shortage section should be shown
  const showShortageSection = data?.payment_status === 'PARTIALLY_PAID' ||
    data?.payment_status === 'OVERDUE' ||
    (data?.shortage_details !== undefined);

  // Check if conductor exists
  const hasConductor = data?.employees.conductor !== null;

  // Loading state
  if (loading) {
    return (
      <>
        <div className="modal-heading">
          <h1 className="modal-title">View Trip Revenue Details</h1>
          <button className="close-modal-btn view" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <Loading />
      </>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <>
        <div className="modal-heading">
          <h1 className="modal-title">View Trip Revenue Details</h1>
          <button className="close-modal-btn view" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modal-content view" style={{ textAlign: 'center', padding: '40px', color: '#dc3545' }}>
          <p>{error || 'Failed to load revenue details'}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Trip Revenue Details</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>

        <button className="close-modal-btn view" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Header Info */}
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Revenue Code */}
            <div className="form-group">
              <label>Revenue Code</label>
              <p>{data.code}</p>
            </div>

            {/* Assignment ID */}
            <div className="form-group">
              <label>Assignment ID</label>
              <p>{data.assignment_id}</p>
            </div>

            {/* Trip ID */}
            <div className="form-group">
              <label>Trip ID</label>
              <p>{data.bus_trip_id}</p>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`chip ${getStatusChipClass(data.payment_status)}`}>
                  {formatStatus(data.payment_status)}
                </span>
              </div>
            </div>

          </div>
        </form>
      </div>

      {/* I. Bus Details */}
      <p className="details-title">I. Bus Details</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Date Assigned, Body Number */}
          <div className="form-row">
            <div className="form-group">
              <label>Date Assigned</label>
              <p>{data.bus_details.date_assigned ? formatDate(data.bus_details.date_assigned) : 'N/A'}</p>
            </div>

            <div className="form-group">
              <label>Body Number</label>
              <p>{data.bus_details.body_number || 'N/A'}</p>
            </div>
          </div>

          {/* Plate Number, Bus Type, Route */}
          <div className="form-row">
            <div className="form-group">
              <label>Plate Number</label>
              <p>{data.bus_details.license_plate || 'N/A'}</p>
            </div>

            <div className="form-group">
              <label>Bus Type</label>
              <p>{data.bus_details.bus_type || 'N/A'}</p>
            </div>

            <div className="form-group">
              <label>Route</label>
              <p>{data.bus_details.route || 'N/A'}</p>
            </div>
          </div>

          {/* Assignment Type, Company Share, Payment Method */}
          <div className="form-row">
            <div className="form-group">
              <label>Assignment Type</label>
              <p>{formatAssignmentType(data.bus_details.assignment_type)}</p>
            </div>

            <div className="form-group">
              <label>Company Share</label>
              <p>
                {data.bus_details.assignment_type === 'PERCENTAGE'
                  ? `${data.bus_details.assignment_value}%`
                  : formatMoney(data.bus_details.assignment_value || 0)
                }
              </p>
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <p>{formatPaymentMethod(data.bus_details.payment_method)}</p>
            </div>
          </div>

          {/* Trip Revenue, Fuel Expense, Company Share (calculated amount) */}
          <div className="form-row">
            <div className="form-group">
              <label>Trip Revenue</label>
              <p>{formatMoney(data.bus_details.trip_revenue)}</p>
            </div>

            <div className="form-group">
              <label>Fuel Expense</label>
              <p>{formatMoney(data.bus_details.trip_fuel_expense)}</p>
            </div>

            <div className="form-group">
              <label>Company Share (Amount)</label>
              <p>{formatMoney(data.bus_details.company_share_amount)}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Employee Details */}
      <p className="details-title">II. Employee Details</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Driver</label>
              <p>
                {data.employees.driver
                  ? `${data.employees.driver.name} (${data.employees.driver.employee_number})`
                  : 'N/A'
                }
              </p>
            </div>

            <div className="form-group">
              <label>Conductor</label>
              <p>
                {data.employees.conductor
                  ? `${data.employees.conductor.name} (${data.employees.conductor.employee_number})`
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* III. Remittance Details */}
      <p className="details-title">III. Remittance Details</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Date Recorded, Due Date, Expected Remittance */}
          <div className="form-row">
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{data.remittance.date_recorded ? formatDate(data.remittance.date_recorded) : 'Not yet recorded'}</p>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <p>{data.remittance.date_expected ? formatDate(data.remittance.date_expected) : 'N/A'}</p>
            </div>

            <div className="form-group">
              <label>Expected Remittance</label>
              <p>{formatMoney(data.remittance.expected_remittance)}</p>
            </div>
          </div>

          {/* Amount Remitted, Shortage, Status */}
          <div className="form-row">
            <div className="form-group">
              <label>Amount Remitted</label>
              <p>{formatMoney(data.remittance.amount_remitted)}</p>
            </div>

            <div className="form-group">
              <label>Shortage</label>
              <p>{formatMoney(data.remittance.shortage)}</p>
            </div>

            <div className="form-group">
              <label>Payment Status</label>
              <p className={`chip ${getStatusChipClass(data.payment_status)}`}>
                {formatStatus(data.payment_status)}
              </p>
            </div>
          </div>

          {/* Remarks/Description */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Remarks</label>
              <p>{data.remittance.description || 'No remarks'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* IV. Shortage Details - Only shown for PARTIALLY_PAID or OVERDUE */}
      {showShortageSection && data.shortage_details && (
        <>
          <p className="details-title">IV. Shortage Details</p>
          <div className="modal-content view">
            <form className="view-form">
              {/* Receivable Amount Breakdown - Collapsible */}
              <details className="breakdown-details">
                <summary className="breakdown-summary">
                  <span>Receivable Amount Breakdown</span>
                </summary>
                <div className="breakdown-content" style={{ padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px', marginTop: '12px' }}>
                  <p className="breakdown-section-title" style={{ fontWeight: '600', marginBottom: '12px' }}>Calculation:</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Trip Revenue:</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(data.bus_details.trip_revenue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Company Share ({data.bus_details.assignment_type === 'PERCENTAGE' ? `${data.bus_details.assignment_value}%` : 'Boundary'}):</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(data.bus_details.company_share_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Fuel Expense:</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(data.bus_details.trip_fuel_expense)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Expected Remittance:</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(data.remittance.expected_remittance)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>(-) Amount Remitted:</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>({formatMoney(data.remittance.amount_remitted)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', marginTop: '10px', borderTop: '2px solid #333', gap: '60px' }}>
                    <span style={{ fontWeight: '600', flex: '1' }}>Total Shortage:</span>
                    <span style={{ fontWeight: '700', fontSize: '1.1em', textAlign: 'right', minWidth: '120px' }}>{formatMoney(data.remittance.shortage)}</span>
                  </div>
                </div>
              </details>

              {/* Total Shortage and Due Date */}
              <div className="form-row" style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label>Total Shortage Amount</label>
                  <p className="total-amount">{formatMoney(data.remittance.shortage)}</p>
                  <small className="helper-text">The amount short from expected remittance</small>
                </div>

                <div className="form-group">
                  <label>Receivable Due Date</label>
                  <p>{data.shortage_details.receivable_due_date ? formatDate(data.shortage_details.receivable_due_date) : 'N/A'}</p>
                </div>
              </div>

              {/* Conductor Share - Only show if conductor exists */}
              {hasConductor && data.shortage_details.conductor_receivable && (
                <div style={{ display: 'flex', gap: '60px', marginBottom: '16px' }}>
                  <div style={{ flex: '1' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Conductor Name</label>
                    <p style={{ margin: 0 }}>{data.shortage_details.conductor_receivable.debtor_name}</p>
                  </div>

                  <div style={{ minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Conductor Share</label>
                    <p style={{ margin: 0 }}>{formatMoney(data.shortage_details.conductor_share)}</p>
                  </div>

                  <div style={{ minWidth: '150px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Balance</label>
                    <p style={{ margin: 0 }}>{formatMoney(data.shortage_details.conductor_receivable.balance)}</p>
                  </div>
                </div>
              )}

              {/* Driver Share */}
              {data.shortage_details.driver_receivable && (
                <div style={{ display: 'flex', gap: '60px' }}>
                  <div style={{ flex: '1' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Driver Name</label>
                    <p style={{ margin: 0 }}>{data.shortage_details.driver_receivable.debtor_name}</p>
                  </div>

                  <div style={{ minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Driver Share</label>
                    <p style={{ margin: 0 }}>{formatMoney(data.shortage_details.driver_share)}</p>
                  </div>

                  <div style={{ minWidth: '150px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Balance</label>
                    <p style={{ margin: 0 }}>{formatMoney(data.shortage_details.driver_receivable.balance)}</p>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Conductor Installment Schedule - Only show if conductor exists and has receivable */}
          {hasConductor && data.shortage_details.conductor_receivable && (
            <>
              <p className="details-subtitle">Conductor Installment Schedule</p>
              <div className="modal-content view">
                <div className="installment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '12px' }}>
                  <span className="employee-name" style={{ fontWeight: '600' }}>{data.shortage_details.conductor_receivable.debtor_name}</span>
                  <span className="employee-share" style={{ fontWeight: '500', color: '#666' }}>
                    Total: {formatMoney(data.shortage_details.conductor_receivable.total_amount)} |
                    Paid: {formatMoney(data.shortage_details.conductor_receivable.paid_amount)} |
                    Balance: {formatMoney(data.shortage_details.conductor_receivable.balance)}
                  </span>
                </div>
                <table className="installment-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Due Date</th>
                      <th>Amount Due</th>
                      <th>Amount Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.shortage_details.conductor_receivable.installment_schedules.length > 0 ? (
                      data.shortage_details.conductor_receivable.installment_schedules.map((installment) => (
                        <tr key={installment.id}>
                          <td>{installment.installment_number}</td>
                          <td>{formatDate(installment.due_date)}</td>
                          <td>{formatMoney(installment.amount_due)}</td>
                          <td>{formatMoney(installment.amount_paid)}</td>
                          <td>{formatMoney(installment.balance)}</td>
                          <td>
                            <span className={`chip ${getInstallmentChipClass(installment.status)}`}>
                              {formatInstallmentStatus(installment.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center' }}>No installment schedule available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Driver Installment Schedule */}
          {data.shortage_details.driver_receivable && (
            <>
              <p className="details-subtitle">Driver Installment Schedule</p>
              <div className="modal-content view">
                <div className="installment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '12px' }}>
                  <span className="employee-name" style={{ fontWeight: '600' }}>{data.shortage_details.driver_receivable.debtor_name}</span>
                  <span className="employee-share" style={{ fontWeight: '500', color: '#666' }}>
                    Total: {formatMoney(data.shortage_details.driver_receivable.total_amount)} |
                    Paid: {formatMoney(data.shortage_details.driver_receivable.paid_amount)} |
                    Balance: {formatMoney(data.shortage_details.driver_receivable.balance)}
                  </span>
                </div>
                <table className="installment-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Due Date</th>
                      <th>Amount Due</th>
                      <th>Amount Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.shortage_details.driver_receivable.installment_schedules.length > 0 ? (
                      data.shortage_details.driver_receivable.installment_schedules.map((installment) => (
                        <tr key={installment.id}>
                          <td>{installment.installment_number}</td>
                          <td>{formatDate(installment.due_date)}</td>
                          <td>{formatMoney(installment.amount_due)}</td>
                          <td>{formatMoney(installment.amount_paid)}</td>
                          <td>{formatMoney(installment.balance)}</td>
                          <td>
                            <span className={`chip ${getInstallmentChipClass(installment.status)}`}>
                              {formatInstallmentStatus(installment.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center' }}>No installment schedule available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Journal Entry Info (if available) */}
      {data.journal_entry && (
        <>
          <p className="details-title">V. Journal Entry</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Journal Code</label>
                  <p>{data.journal_entry.code}</p>
                </div>

                <div className="form-group">
                  <label>Journal Status</label>
                  <p className={`chip ${data.journal_entry.status === 'POSTED' ? 'completed' : 'pending'}`}>
                    {data.journal_entry.status}
                  </p>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Audit Trail */}
      <p className="details-title">{data.journal_entry ? 'VI.' : 'V.'} Audit Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Created By</label>
              <p>{data.created_by || 'System'}</p>
            </div>

            <div className="form-group">
              <label>Created At</label>
              <p>{formatDate(data.created_at)}</p>
            </div>

            <div className="form-group">
              <label>Updated By</label>
              <p>{data.updated_by || 'N/A'}</p>
            </div>

            <div className="form-group">
              <label>Updated At</label>
              <p>{data.updated_at ? formatDate(data.updated_at) : 'N/A'}</p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}