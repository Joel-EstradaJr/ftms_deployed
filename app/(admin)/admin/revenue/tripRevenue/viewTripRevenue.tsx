/**
 * View Trip Revenue Modal Component
 * 
 * ============================================================================
 * BACKEND INTEGRATION NOTES
 * ============================================================================
 * 
 * This component displays detailed trip revenue and remittance information.
 * It calculates and displays receivable details if the trip has been converted to a receivable.
 * 
 * DATA REQUIREMENTS FROM BACKEND:
 * The tripData prop should include all fields from BusTripRecord interface:
 * - Assignment details (assignment_id, assignment_type, assignment_value, etc.)
 * - Bus details (bus_plate_number, body_number, etc.)
 * - Employee details (employee_id, position, etc.)
 * - Driver/Conductor names (driverName, conductorName) - can be pre-computed
 * - Remittance details (dateRecorded, amount, status, remarks)
 * 
 * Receivable CALCULATION:
 * If status is 'receivable' or deadline exceeded, the component automatically:
 * - Calculates the receivable principal amount (shortfall from expected remittance)
 * - Applies 10% interest (can be made configurable)
 * - Distributes the total receivable between conductor and driver
 * 
 * NOTE: receivable calculation logic should match recordTripRevenue.tsx for consistency
 * Consider moving calculation logic to a shared utility function or backend
 * 
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";

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
    bus_brand: string; // 'Hilltop', 'Agila', 'DARJ'
    
    // Status tracking (from Model Revenue table)
    dateRecorded: string | null;
    amount: number | null;
    status: string; // 'remitted', 'pending', or 'receivable'
    remarks: string | null;
    
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
          {/* Body number, plate number, and bus brand */}
          <div className="form-row">
            {/* Body Number */}
            <div className="form-group">
              <label>Body Number</label>
              <p>{tripData.body_number}</p>
            </div>

            {/* Plate Number */}
            <div className="form-group">
              <label>Plate Number</label>
              <p>{tripData.bus_plate_number}</p>
            </div>

            {/* Bus Brand */}
            <div className="form-group">
              <label>Bus Brand</label>
              <p>{tripData.bus_brand}</p>
            </div>
          </div>

          {/* Bus type and route */}
          <div className="form-row">
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
        </form>
      </div>

      {/* II. Assigned Employee */}
      <p className="details-title">II. Assigned Employee</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Driver Details */}
          <div className="form-row">
            <div className="form-group">
              <label>Employee ID</label>
              <p>{tripData.driverId || tripData.employee_id}</p>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>{tripData.driverName || 'N/A'}</label>
              <p>{tripData.driverPosition || tripData.position_name || 'Driver'}</p>
            </div>
          </div>

          {/* Conductor Details - Only show if conductor exists */}
          {tripData.conductorName && tripData.conductorName !== 'N/A' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID</label>
                  <p>{tripData.conductorId || 'N/A'}</p>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>{tripData.conductorName}</label>
                  <p>{tripData.conductorPosition || 'Conductor'}</p>
                </div>
              </div>
            </>
          )}
        </form>
      </div>

      {/* III. Remittance Details */}
      <p className="details-title">III. Remittance Details</p>
      <div className="modal-content view">
        <form className="view-form">
          {/* Date assigned and assignment type */}
          <div className="form-row">
            {/* Date Assigned */}
            <div className="form-group">
              <label>Date Assigned</label>
              <p>{formatDate(tripData.date_assigned)}</p>
            </div>

            {/* Assignment Type */}
            <div className="form-group">
              <label>Assignment Type</label>
              <p>{tripData.assignment_type}</p>
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

          {/* Assignment value and payment method */}
          <div className="form-row">
            {/* Assignment Value */}
            <div className="form-group">
              <label>
                {tripData.assignment_type === 'Boundary' ? 'Quota Amount' : 'Company Share %'}
              </label>
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

          {/* Trip revenue and fuel expense */}
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
          </div>

          {/* Expected remittance */}
          <div className="form-row">
            <div className="form-group">
              <label>Expected Remittance</label>
              <p>
                {calculatedData.expectedRemittance > 0 
                  ? formatMoney(calculatedData.expectedRemittance)
                  : 'N/A (Revenue does not meet minimum wage requirement)'
                }
              </p>
            </div>
          </div>

          {/* Date recorded and amount remitted */}
          <div className="form-row">
            {/* Date Recorded */}
            <div className="form-group">
              <label>Date Recorded</label>
              <p>{tripData.dateRecorded ? formatDate(tripData.dateRecorded) : 'Not yet recorded'}</p>
            </div>

            {/* Amount Remitted */}
            <div className="form-group">
              <label>Amount Remitted</label>
              <p>{tripData.amount !== null ? formatMoney(tripData.amount) : formatMoney(0)}</p>
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

      {/* IV. Receivable Details */}
      {calculatedData.showReceivableSection && (
        <>
          <p className="details-title">IV. Receivable Details</p>
          <div className="modal-content view">
            <form className="view-form">
              {/* Receivable type (always Trip Deficit) */}
              <div className="form-row">
                <div className="form-group">
                  <label>Receivable Type</label>
                  <p>Trip Deficit</p>
                </div>
              </div>

              {/* receivable amount and interest */}
              <div className="form-row">
                <div className="form-group">
                  <label>Receivable Amount (Principal)</label>
                  <p>{formatMoney(calculatedData.receivableAmount)}</p>
                </div>

                <div className="form-group">
                  <label>Receivable Interest (10%)</label>
                  <p>{formatMoney(calculatedData.receivableInterest)}</p>
                </div>

                <div className="form-group">
                  <label>Total Receivable Amount</label>
                  <p className="total-amount">{formatMoney(calculatedData.totalReceivableAmount)}</p>
                </div>
              </div>

              {/* Conductor and driver shares */}
              <div className="form-row">
                {tripData.conductorName && tripData.conductorName !== 'N/A' && (
                  <div className="form-group">
                    <label>Conductor Share ({config.defaultConductorShare}%)</label>
                    <p>{formatMoney(calculatedData.conductorShare)}</p>
                  </div>
                )}

                <div className="form-group">
                  <label>Driver Share ({tripData.conductorName && tripData.conductorName !== 'N/A' ? `${config.defaultDriverShare}%` : '100%'})</label>
                  <p>{formatMoney(calculatedData.driverShare)}</p>
                </div>
              </div>

              {/* Receivable due date (if recorded) */}
              {tripData.dateRecorded && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Receivable Due Date</label>
                    <p>
                      {(() => {
                        const dueDate = new Date(tripData.dateRecorded);
                        dueDate.setDate(dueDate.getDate() + 30); // 30 days from date recorded
                        return formatDate(dueDate.toISOString().split('T')[0]);
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </>
      )}
    </>
  );
}