"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";

// Installment schedule interface
interface InstallmentSchedule {
  due_date: string;
  amount_due: number;
  status: string;
}

// Employee installment data interface
interface EmployeeInstallments {
  employee_name: string;
  total_share: number;
  installments: InstallmentSchedule[];
}

interface ViewTripRevenueModalProps {
  tripData: {
    // Primary fields from Operations table
    assignment_id: string;
    bus_trip_id: string;
    bus_route: string;
    date_assigned: string;
    trip_fuel_expense: number;
    trip_revenue: number;
    assignment_type: string; // 'Percentage' or 'Boundary'
    assignment_value: number; // quota if Boundary, company share% if Percentage
    payment_method: string; // 'Company Cash' or 'Reimbursement'
    
    // Employee details (from Human Resource table)
    employee_id: string;
    employee_firstName: string;
    employee_middleName: string;
    employee_lastName: string;
    employee_suffix: string;
    position_id: string;
    position_name: string;
    
    // Bus details
    bus_plate_number: string;
    bus_type: string; // 'Airconditioned' or 'Ordinary'
    body_number: string;
    body_builder: string; // 'Hilltop', 'Agila', 'DARJ'
    
    // Status tracking (from Model Revenue table)
    date_recorded: string | null;
    date_expected: string | null;
    amount: number | null;
    status: string; // 'remitted', 'pending', or 'receivable'
    remarks: string | null;
    
    // Shortage/Receivable details
    total_amount: number | null;
    due_date: string | null;
    installments?: InstallmentSchedule[]; // Legacy support
    driver_installments?: EmployeeInstallments;
    conductor_installments?: EmployeeInstallments;
    
    // Computed/display fields
    driverName?: string;
    conductorName?: string;
    
    // Driver details
    driverId?: string;
    driverPosition?: string;
    
    // Conductor details
    conductorId?: string;
    conductorPosition?: string;
  };
  onClose: () => void;
}

// Configuration interface
interface ConfigData {
  minimumWage: number;
  durationToLate: 72;
  durationToReceivable: 168;
  defaultConductorShare: number;
  defaultDriverShare: number;
}

export default function ViewTripRevenueModal({ tripData, onClose }: ViewTripRevenueModalProps) {
  // Mock configuration (should match page.tsx config)
  const config: ConfigData = {
    minimumWage: 600,
    durationToLate: 72,
    durationToReceivable: 168,
    defaultConductorShare: 50,
    defaultDriverShare: 50,
  };

  // Calculate remittance details
  const [calculatedData, setCalculatedData] = useState({
    expectedRemittance: 0,
    maximumRemittance: 0,
    remittanceStatus: '',
    showReceivableSection: false,
    receivableAmount: 0,
    receivableInterest: 0,
    totalReceivableAmount: 0,
    conductorShare: 0,
    driverShare: 0,
    dueDate: '',
    principalAmount: 0,
  });

  useEffect(() => {
    // Calculate expected remittance based on assignment type
    // Using the same logic as recordTripRevenue.tsx
    let expectedRemittance = 0;
    let maximumRemittance = 0;

    const driver_conductor_minimum = 2 * config.minimumWage; // 1200

    if (tripData.assignment_type === 'Boundary') {
      const requiredRevenue = tripData.assignment_value + driver_conductor_minimum + tripData.trip_fuel_expense;
      
      if (tripData.trip_revenue >= requiredRevenue) {
        // Condition met: auto-calculate expected remittance
        expectedRemittance = tripData.assignment_value + tripData.trip_fuel_expense;
      } else {
        // Condition not met: maximum remittance is what's left after minimum wage
        expectedRemittance = 0; // No expected remittance when condition not met
      }
      maximumRemittance = Math.max(0, tripData.trip_revenue - driver_conductor_minimum);
    } else if (tripData.assignment_type === 'Percentage') {
      const companyShare = (tripData.trip_revenue * tripData.assignment_value) / 100;
      const netAfterCompanyAndFuel = tripData.trip_revenue - companyShare - tripData.trip_fuel_expense;
      
      if (netAfterCompanyAndFuel >= driver_conductor_minimum) {
        // Condition met: auto-calculate expected remittance
        expectedRemittance = companyShare + tripData.trip_fuel_expense;
      } else {
        // Condition not met: maximum remittance is what's left after minimum wage
        expectedRemittance = 0; // No expected remittance when condition not met
      }
      maximumRemittance = Math.max(0, tripData.trip_revenue - driver_conductor_minimum);
    }

    // Calculate remittance status
    const now = new Date();
    const assignedDate = new Date(tripData.date_assigned);
    const hoursDiff = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);

    let remittanceStatus = 'PENDING';
    if (tripData.status === 'remitted') {
      remittanceStatus = 'REMITTED';
    } else if (tripData.status === 'receivable') {
      remittanceStatus = 'RECEIVABLE';
    } else if (hoursDiff > config.durationToReceivable) {
      remittanceStatus = 'CONVERTED TO RECEIVABLE';
    } else if (hoursDiff > config.durationToLate) {
      remittanceStatus = 'LATE';
    } else {
      remittanceStatus = 'ON TIME';
    }

    // Calculate receivable details if applicable
    const amount = tripData.amount || 0;
    const showReceivableSection = tripData.status === 'receivable' || remittanceStatus === 'CONVERTED TO RECEIVABLE';
    
    let receivableAmount = 0;
    let receivableInterest = 0;
    let totalReceivableAmount = 0;
    let conductorShare = 0;
    let driverShare = 0;

    if (showReceivableSection) {
      // If amount is 0 or null (deadline exceeded), use full expected remittance
      // Otherwise, calculate the shortfall
      receivableAmount = Math.abs(expectedRemittance - amount);
      receivableInterest = receivableAmount * 0.10; // 10% interest
      totalReceivableAmount = receivableAmount + receivableInterest;
      
      // Check if conductor is assigned
      const hasConductor = tripData.conductorName && tripData.conductorName !== 'N/A';
      
      if (hasConductor) {
        // Split receivable according to configuration
        conductorShare = totalReceivableAmount * (config.defaultConductorShare / 100);
        driverShare = totalReceivableAmount * (config.defaultDriverShare / 100);
      } else {
        // No conductor - entire receivable goes to driver
        conductorShare = 0;
        driverShare = totalReceivableAmount;
      }
    }

    // Calculate due date: use date_expected if provided, otherwise calculate from date_assigned
    let dueDate = '';
    if (tripData.date_expected) {
      dueDate = tripData.date_expected;
    } else {
      const calculatedDueDate = new Date(tripData.date_assigned);
      calculatedDueDate.setHours(calculatedDueDate.getHours() + config.durationToLate);
      dueDate = calculatedDueDate.toISOString().split('T')[0];
    }

    // Calculate principal amount: use total_amount if provided, otherwise calculate
    const principalAmount = tripData.total_amount ?? receivableAmount;

    setCalculatedData({
      expectedRemittance,
      maximumRemittance,
      remittanceStatus,
      showReceivableSection,
      receivableAmount,
      receivableInterest,
      totalReceivableAmount,
      conductorShare,
      driverShare,
      dueDate,
      principalAmount,
    });
  }, [tripData, config]);

  // Format employee name with suffix
  const formatEmployeeName = (firstName: string, middleName: string, lastName: string, suffix: string) => {
    const name = `${firstName} ${middleName} ${lastName}`;
    return suffix ? `${name}, ${suffix}` : name;
  };

  // Format status for display
  const formatStatus = (status: string) => {
    if (status === 'receivable') return 'receivable';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

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

      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Assignment ID */}
            <div className="form-group">
              <label>Assignment ID</label>
              <p>{tripData.assignment_id}</p>
            </div>

            {/* Trip ID */}
            <div className="form-group">
              <label>Trip ID</label>
              <p>{tripData.bus_trip_id}</p>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <p className={`chip ${tripData.status === 'remitted' ? 'completed' : 'pending'}`}>
                {formatStatus(tripData.status)}
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* I. Bus Details */}
      <p className="details-title">I. Bus Details</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Date Assigned, Body Number, Body Builder */}
          <div className="form-row">
            {/* Date Assigned */}
            <div className="form-group">
              <label>Date Assigned</label>
              <p>{formatDate(tripData.date_assigned)}</p>
            </div>

            {/* Body Number */}
            <div className="form-group">
              <label>Body Number</label>
              <p>{tripData.body_number}</p>
            </div>

            {/* Body Builder */}
            <div className="form-group">
              <label>Body Builder</label>
              <p>{tripData.body_builder}</p>
            </div>
          </div>

          {/* Plate Number, Bus Type, Route */}
          <div className="form-row">
            {/* Plate Number */}
            <div className="form-group">
              <label>Plate Number</label>
              <p>{tripData.bus_plate_number}</p>
            </div>

            {/* Bus Type */}
            <div className="form-group">
              <label>Bus Type</label>
              <p>{tripData.bus_type}</p>
            </div>

            {/* Route */}
            <div className="form-group">
              <label>Route</label>
              <p>{tripData.bus_route}</p>
            </div>
          </div>

          {/* Assignment Type, Company Share, Payment Method */}
          <div className="form-row">
            {/* Assignment Type */}
            <div className="form-group">
              <label>Assignment Type</label>
              <p>{tripData.assignment_type}</p>
            </div>

            {/* Company Share */}
            <div className="form-group">
              <label>Company Share</label>
              <p>
                {tripData.assignment_type === 'Boundary' 
                  ? formatMoney(tripData.assignment_value)
                  : `${tripData.assignment_value}%`
                }
              </p>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label>Payment Method</label>
              <p>{tripData.payment_method}</p>
            </div>
          </div>

          {/* Trip Revenue, Fuel Expense, Company Share (calculated) */}
          <div className="form-row">
            {/* Trip Revenue */}
            <div className="form-group">
              <label>Trip Revenue</label>
              <p>{formatMoney(tripData.trip_revenue)}</p>
            </div>

            {/* Fuel Expense */}
            <div className="form-group">
              <label>Fuel Expense</label>
              <p>{formatMoney(tripData.trip_fuel_expense)}</p>
            </div>

            {/* Company Share (calculated amount) */}
            <div className="form-group">
              <label>Company Share</label>
              <p>{formatMoney(tripData.assignment_value)}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Employee Details */}
      <p className="details-title">II. Employee Details</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Driver Name and Conductor Name */}
          <div className="form-row">
            {/* Driver Name */}
            <div className="form-group">
              <label>Driver Name</label>
              <p>{tripData.driverName || 'N/A'}</p>
            </div>

            {/* Conductor Name */}
            <div className="form-group">
              <label>Conductor Name</label>
              <p>{tripData.conductorName || 'N/A'}</p>
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
            {/* Date Recorded */}
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{tripData.date_recorded ? formatDate(tripData.date_recorded) : 'Not yet recorded'}</p>
            </div>

            {/* Due Date */}
            <div className="form-group">
              <label>Due Date</label>
              <p>{formatDate(calculatedData.dueDate)}</p>
            </div>

            {/* Expected Remittance */}
            <div className="form-group">
              <label>Expected Remittance</label>
              <p>{formatMoney(tripData.assignment_value + tripData.trip_fuel_expense)}</p>
            </div>
          </div>

          {/* Amount Remitted, Remittance Status */}
          <div className="form-row">
            {/* Amount Remitted */}
            <div className="form-group">
              <label>Amount Remitted</label>
              <p>{tripData.amount !== null ? formatMoney(tripData.amount) : formatMoney(0)}</p>
            </div>

            {/* Remittance Status */}
            <div className="form-group">
              <label>Remittance Status</label>
              <p className={`chip ${
                calculatedData.remittanceStatus === 'REMITTED' || calculatedData.remittanceStatus === 'ON TIME' 
                  ? 'completed' 
                  : calculatedData.remittanceStatus === 'LATE' 
                  ? 'pending' 
                  : 'receivable'
              }`}>
                {calculatedData.remittanceStatus}
              </p>
            </div>
          </div>

          {/* Remarks */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Remarks</label>
              <p>{tripData.remarks || 'No remarks'}</p>
            </div>
          </div>
        </form>
      </div>

      {/* IV. Shortage Details */}
      {calculatedData.showReceivableSection && (
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
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(tripData.trip_revenue)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Company Share ({tripData.assignment_type === 'Percentage' ? `${tripData.assignment_value}%` : 'Boundary'}):</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>
                      {tripData.assignment_type === 'Percentage' 
                        ? formatMoney((tripData.trip_revenue * tripData.assignment_value) / 100)
                        : formatMoney(tripData.assignment_value)
                      }
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Fuel Expense:</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(tripData.trip_fuel_expense)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Expected Remittance:</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(tripData.assignment_value + tripData.trip_fuel_expense)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>(-) Amount Remitted:</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>({formatMoney(tripData.amount || 0)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', marginTop: '10px', borderTop: '2px solid #333', gap: '60px' }}>
                    <span style={{ fontWeight: '600', flex: '1' }}>Total Receivable:</span>
                    <span style={{ fontWeight: '700', fontSize: '1.1em', textAlign: 'right', minWidth: '120px' }}>{formatMoney(calculatedData.totalReceivableAmount)}</span>
                  </div>
                  
                  <p style={{ fontWeight: '600', marginTop: '28px', marginBottom: '12px' }}>Receivable Distribution:</p>
                  {tripData.conductorName && tripData.conductorName !== 'N/A' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e0e0e0', gap: '60px' }}>
                      <span style={{ flex: '1' }}>Conductor Share ({config.defaultConductorShare}%):</span>
                      <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(calculatedData.conductorShare)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', gap: '60px' }}>
                    <span style={{ flex: '1' }}>Driver Share ({tripData.conductorName && tripData.conductorName !== 'N/A' ? `${config.defaultDriverShare}%` : '100%'}):</span>
                    <span style={{ fontWeight: '500', textAlign: 'right', minWidth: '120px' }}>{formatMoney(calculatedData.driverShare)}</span>
                  </div>
                </div>
              </details>

              {/* Total Receivable Amount and Due Date */}
              <div className="form-row" style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label>Total Receivable Amount</label>
                  <p className="total-amount">{formatMoney(calculatedData.totalReceivableAmount)}</p>
                  <small className="helper-text">The amount short from expected remittance</small>
                </div>

                <div className="form-group">
                  <label>Receivable Due Date</label>
                  <p>
                    {tripData.due_date 
                      ? formatDate(tripData.due_date)
                      : tripData.date_recorded 
                        ? (() => {
                            const dueDate = new Date(tripData.date_recorded);
                            dueDate.setDate(dueDate.getDate() + 30);
                            return formatDate(dueDate.toISOString().split('T')[0]);
                          })()
                        : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {/* Conductor Name and Share */}
              {tripData.conductorName && tripData.conductorName !== 'N/A' && (
                <div style={{ display: 'flex', gap: '60px', marginBottom: '16px' }}>
                  <div style={{ flex: '1' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Conductor Name</label>
                    <p style={{ margin: 0 }}>{tripData.conductorName}</p>
                  </div>

                  <div style={{ minWidth: '200px' }}>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Conductor Share</label>
                    <p style={{ margin: 0 }}>{formatMoney(calculatedData.conductorShare)}</p>
                  </div>
                </div>
              )}

              {/* Driver Name and Share */}
              <div style={{ display: 'flex', gap: '60px' }}>
                <div style={{ flex: '1' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Driver Name</label>
                  <p style={{ margin: 0 }}>{tripData.driverName || 'N/A'}</p>
                </div>

                <div style={{ minWidth: '200px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#555' }}>Driver Share</label>
                  <p style={{ margin: 0 }}>{formatMoney(calculatedData.driverShare)}</p>
                </div>
              </div>
            </form>
          </div>

          {/* Conductor Installment Schedule - Only show if conductor exists */}
          {tripData.conductorName && tripData.conductorName !== 'N/A' && (
            <>
              <p className="details-subtitle">Conductor Installment Schedule</p>
              <div className="modal-content view">
                <div className="installment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '12px' }}>
                  <span className="employee-name" style={{ fontWeight: '600' }}>{tripData.conductor_installments?.employee_name || tripData.conductorName}</span>
                  <span className="employee-share" style={{ fontWeight: '500', color: '#666' }}>Total: {formatMoney(tripData.conductor_installments?.total_share || calculatedData.conductorShare)}</span>
                </div>
                <table className="installment-table">
                  <thead>
                    <tr>
                      <th>Due Date</th>
                      <th>Amount Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tripData.conductor_installments?.installments && tripData.conductor_installments.installments.length > 0 ? (
                      tripData.conductor_installments.installments.map((installment, index) => (
                        <tr key={index}>
                          <td>{formatDate(installment.due_date)}</td>
                          <td>{formatMoney(installment.amount_due)}</td>
                          <td>
                            <span className={`chip ${installment.status === 'paid' ? 'completed' : 'pending'}`}>
                              {installment.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center' }}>No installment schedule available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Driver Installment Schedule */}
          <p className="details-subtitle">Driver Installment Schedule</p>
          <div className="modal-content view">
            <div className="installment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '12px' }}>
              <span className="employee-name" style={{ fontWeight: '600' }}>{tripData.driver_installments?.employee_name || tripData.driverName || 'N/A'}</span>
              <span className="employee-share" style={{ fontWeight: '500', color: '#666' }}>Total: {formatMoney(tripData.driver_installments?.total_share || calculatedData.driverShare)}</span>
            </div>
            <table className="installment-table">
              <thead>
                <tr>
                  <th>Due Date</th>
                  <th>Amount Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tripData.driver_installments?.installments && tripData.driver_installments.installments.length > 0 ? (
                  tripData.driver_installments.installments.map((installment, index) => (
                    <tr key={index}>
                      <td>{formatDate(installment.due_date)}</td>
                      <td>{formatMoney(installment.amount_due)}</td>
                      <td>
                        <span className={`chip ${installment.status === 'paid' ? 'completed' : 'pending'}`}>
                          {installment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center' }}>No installment schedule available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}