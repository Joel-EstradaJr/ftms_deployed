"use client";

import React from "react";
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
    status: string; // 'remitted' or 'pending'
    remarks: string | null;
    
    // Computed/display fields
    driverName?: string;
    conductorName?: string;
  };
  onClose: () => void;
}

export default function ViewTripRevenueModal({ tripData, onClose }: ViewTripRevenueModalProps) {
  // Format employee name with suffix
  const formatEmployeeName = (firstName: string, middleName: string, lastName: string, suffix: string) => {
    const name = `${firstName} ${middleName} ${lastName}`;
    return suffix ? `${name}, ${suffix}` : name;
  };

  // Format status for display
  const formatStatus = (status: string) => {
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
          {/* Employee ID and Position */}
          <div className="form-row">
            {/* Employee ID */}
            <div className="form-group">
              <label>Employee ID</label>
              <p>{tripData.employee_id}</p>
            </div>

            {/* Position */}
            <div className="form-group">
              <label>Position</label>
              <p>{tripData.position_name}</p>
            </div>
          </div>

          {/* Employee Name */}
          <div className="form-row">
            <div className="form-group">
              <label>Employee Name</label>
              <p>
                {formatEmployeeName(
                  tripData.employee_firstName,
                  tripData.employee_middleName,
                  tripData.employee_lastName,
                  tripData.employee_suffix
                )}
              </p>
            </div>
          </div>
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
        </form>
      </div>

      {/* IV. Audit Trail */}
      {tripData.status === 'remitted' && (
        <>
          <p className="details-title">IV. Audit Trail</p>
          <div className="modal-content view">
            <form className="view-form">
              {/* Date recorded and amount */}
              <div className="form-row">
                {/* Date Recorded */}
                <div className="form-group">
                  <label>Date Recorded</label>
                  <p>{tripData.dateRecorded ? formatDate(tripData.dateRecorded) : 'N/A'}</p>
                </div>

                {/* Amount Remitted */}
                <div className="form-group">
                  <label>Amount Remitted</label>
                  <p>{tripData.amount ? formatMoney(tripData.amount) : 'N/A'}</p>
                </div>
              </div>

              {/* Remarks */}
              {tripData.remarks && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Remarks</label>
                    <p>{tripData.remarks}</p>
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