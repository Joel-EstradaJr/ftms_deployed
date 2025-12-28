/**
 * Record Trip Revenue Modal Component
 * 
 * ============================================================================
 * BACKEND INTEGRATION NOTES
 * ============================================================================
 * 
 * This component handles the recording and editing of trip revenue remittances.
 * It automatically converts to receivables when:
 * 1. The remittance is late (past the late deadline)
 * 2. The deadline for remittance has been exceeded (converted to receivable)
 * 
 * DATA REQUIREMENTS FROM BACKEND:
 * The tripData prop must include:
 * - conductorId, conductorFirstName, conductorMiddleName, conductorLastName, conductorSuffix
 * - driverId, driverFirstName, driverMiddleName, driverLastName, driverSuffix
 * 
 * These fields are CRITICAL for:
 * - hasConductor() function to detect driver-only scenarios
 * - Proper receivable distribution (100% to driver if no conductor, 50/50 split otherwise)
 * - Minimum wage calculation (1 * MINIMUM_WAGE for driver only, 2 * MINIMUM_WAGE for both)
 * 
 * DATA SUBMITTED TO BACKEND:
 * The onSave callback receives formData with structure:
 * {
 *   assignment_id: string,
 *   dateRecorded: string,
 *   amount: number,
 *   remarks: string,
 *   remittanceDueDate: string,
 *   durationToLate: number,
 *   durationToReceivable: number,
 *   remittanceStatus: string,
 *   status: 'remitted' | 'receivable',
 *   receivable?: {  // Only included when shouldCreateReceivable() returns true
 *     totalAmount: number,
 *     dueDate: string,
 *     conductorId?: string,  // Only when hasConductor() is true
 *     conductorShare?: number,  // Only when hasConductor() is true
 *     driverId: string,
 *     driverShare: number
 *   }
 * }
 * 
 * BACKEND RESPONSIBILITIES:
 * 1. Update Model Revenue table with remittance details
 * 2. If receivable object exists, create receivable records
 * 3. Create separate receivable entries for conductor (if exists) and driver
 * 4. Ensure atomic transaction (all-or-nothing)
 * 
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";

import { formatDate, formatMoney } from "@/utils/formatting";
import { showWarning, showError, showRemittanceConfirmation } from "@/utils/Alerts";

interface RecordTripRevenueModalProps {
  mode: "add" | "edit";
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
    
    // Status tracking (from Model Revenue table) - only for edit mode
    dateRecorded?: string | null;
    amount?: number | null;
    status?: string; // 'remitted' or 'pending'
    remarks?: string | null;
    
    // Computed/display fields
    driverName?: string;
    conductorName?: string;
    
    // Conductor and Driver details
    conductorId?: string;
    conductorFirstName?: string;
    conductorMiddleName?: string;
    conductorLastName?: string;
    conductorSuffix?: string;
    
    driverId?: string;
    driverFirstName?: string;
    driverMiddleName?: string;
    driverLastName?: string;
    driverSuffix?: string;
  };
  onSave: (formData: any, mode: "add" | "edit") => void;
  onClose: () => void;
}

interface FormData {
  dateRecorded: string;
  amount: number;
  remarks: string;
  remittanceDueDate: string;
  durationToLate: number; // Hours until considered late
  durationToReceivable: number; // Hours until converted to receivable
  
  // Receivable fields (only shown when late)
  receivableAmount: number;
  conductorShare: number;
  driverShare: number;
  receivableDueDate: string;
}

interface FormErrors {
  dateRecorded: string;
  amount: string;
  remarks: string;
  remittanceDueDate: string;
  durationToLate: string;
  durationToReceivable: string;
  receivableAmount: string;
  conductorShare: string;
  driverShare: string;
  receivableDueDate: string;
}

interface RemittanceCalculation {
  minimumRemittance: number;
  needsReceivable: boolean;
  receivableAmount: number;
  status: 'PENDING' | 'ON_TIME' | 'LATE' | 'CONVERTED_TO_RECEIVABLE';
  conductorMinimum: number;
  driverMinimum: number;
}

const MINIMUM_WAGE = 600;
const DEFAULT_CONDUCTOR_SHARE = 0.5; // 50%
const DEFAULT_DRIVER_SHARE = 0.5; // 50%

export default function RecordTripRevenueModal({ mode, tripData, onSave, onClose }: RecordTripRevenueModalProps) {
  // Helper function to check if there's a conductor
  const hasConductor = (): boolean => {
    return !!(tripData.conductorId && tripData.conductorFirstName);
  };

  // Helper function to get the number of employees (driver + conductor if exists)
  const getEmployeeCount = (): number => {
    return hasConductor() ? 2 : 1;
  };
  // Calculate expected remittance for initial state based on conditions
  const getInitialRemittanceAmount = () => {
    // Check if deadline has been exceeded (CONVERTED_TO_LOAN status)
    const now = new Date();
    const assignedDate = new Date(tripData.date_assigned);
    const hoursDiff = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
    
    // If deadline exceeded, amount should be 0 (converted to loan)
    if (hoursDiff > 168) { // Using default 168 hours (7 days) for initial check
      return 0;
    }
    
    const driver_conductor_minimum = getEmployeeCount() * MINIMUM_WAGE;
    
    if (tripData.assignment_type === 'Boundary') {
      const requiredRevenue = tripData.assignment_value + driver_conductor_minimum + tripData.trip_fuel_expense;
      
      if (tripData.trip_revenue >= requiredRevenue) {
        // Condition met: auto-calculate expected remittance
        return tripData.assignment_value + tripData.trip_fuel_expense;
      } else {
        // Condition not met: prefill with maximum remittance
        return tripData.trip_revenue - driver_conductor_minimum;
      }
    } else { // Percentage
      const company_share = tripData.trip_revenue * (tripData.assignment_value / 100);
      const netAfterCompanyAndFuel = tripData.trip_revenue - (company_share + tripData.trip_fuel_expense);
      
      if (netAfterCompanyAndFuel >= driver_conductor_minimum) {
        // Condition met: auto-calculate expected remittance
        return company_share + tripData.trip_fuel_expense;
      } else {
        // Condition not met: prefill with maximum remittance
        return tripData.trip_revenue - driver_conductor_minimum;
      }
    }
  };

  const [formData, setFormData] = useState<FormData>({
    dateRecorded: mode === 'edit' && tripData.dateRecorded 
      ? new Date(tripData.dateRecorded).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    amount: mode === 'edit' && tripData.amount ? tripData.amount : getInitialRemittanceAmount(),
    remarks: mode === 'edit' && tripData.remarks ? tripData.remarks : '',
    remittanceDueDate: '',
    durationToLate: 72, // Default: 72 hours (3 days) to late
    durationToReceivable: 72, // Default: 72 hours to convert to receivable (same as late)
    
    // Receivable fields
    receivableAmount: 0,
    conductorShare: 0,
    driverShare: 0,
    receivableDueDate: ''
  });

  const [showReceivableBreakdown, setShowReceivableBreakdown] = useState(false);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    dateRecorded: '',
    amount: '',
    remarks: '',
    remittanceDueDate: '',
    durationToLate: '',
    durationToReceivable: '',
    receivableAmount: '',
    conductorShare: '',
    driverShare: '',
    receivableDueDate: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [remittanceCalc, setRemittanceCalc] = useState<RemittanceCalculation | null>(null);

  // Calculate remittance requirements
  const calculateRemittance = (): RemittanceCalculation => {
    const driver_conductor_minimum = getEmployeeCount() * MINIMUM_WAGE;
    
    let minimumRemittance = 0;
    let revenueInsufficient = false; // Revenue doesn't meet minimum wage requirement
    let loanAmount = 0;
    
    if (tripData.assignment_type === 'Boundary') {
      const requiredRevenue = tripData.assignment_value + driver_conductor_minimum + tripData.trip_fuel_expense;
      
      if (tripData.trip_revenue >= requiredRevenue) {
        minimumRemittance = tripData.assignment_value + tripData.trip_fuel_expense;
        revenueInsufficient = false;
      } else {
        // Revenue doesn't meet minimum - user can input what they can remit
        minimumRemittance = 0;
        revenueInsufficient = true;
      }
    } else { // Percentage
      const company_share = tripData.trip_revenue * (tripData.assignment_value / 100);
      const netAfterCompanyAndFuel = tripData.trip_revenue - (company_share + tripData.trip_fuel_expense);
      
      if (netAfterCompanyAndFuel >= driver_conductor_minimum) {
        minimumRemittance = company_share + tripData.trip_fuel_expense;
        revenueInsufficient = false;
      } else {
        // Revenue doesn't meet minimum - user can input what they can remit
        minimumRemittance = 0;
        revenueInsufficient = true;
      }
    }
    
    return {
      minimumRemittance,
      needsReceivable: revenueInsufficient, // Flag that revenue is insufficient (will show warning)
      receivableAmount: 0,
      status: 'PENDING', // Initial status is always PENDING, will be calculated based on time
      conductorMinimum: MINIMUM_WAGE,
      driverMinimum: MINIMUM_WAGE
    };
  };

  // Calculate total receivable amount (what driver and conductor owe together)
  const calculateReceivableAmount = (remittedAmount: number): number => {
    if (tripData.assignment_type === 'Boundary') {
      // Expected remittance = Boundary/Quota + Fuel
      const expectedRemittance = tripData.assignment_value + tripData.trip_fuel_expense;
      // Total shortfall = what should have been remitted - what was actually remitted
      // When CONVERTED_TO_RECEIVABLE (amount = 0), the entire expected remittance becomes the receivable
      return Math.max(0, expectedRemittance - remittedAmount);
    } else { // Percentage
      // Expected remittance = Company Share + Fuel
      const company_share = tripData.trip_revenue * (tripData.assignment_value / 100);
      const expectedRemittance = company_share + tripData.trip_fuel_expense;
      // Total shortfall = what should have been remitted - what was actually remitted
      // When CONVERTED_TO_RECEIVABLE (amount = 0), the entire expected remittance becomes the receivable
      return Math.max(0, expectedRemittance - remittedAmount);
    }
  };

  // Calculate remittance status based on duration from assigned date (in hours)
  const calculateRemittanceStatus = (): 'PENDING' | 'ON_TIME' | 'LATE' | 'CONVERTED_TO_RECEIVABLE' => {
    const now = new Date();
    const assignedDate = new Date(tripData.date_assigned);
    
    // Use the remittanceDueDate if set, otherwise calculate from assigned date
    const dueDate = formData.remittanceDueDate 
      ? new Date(formData.remittanceDueDate + 'T23:59:59') // End of due date
      : new Date(assignedDate.getTime() + formData.durationToReceivable * 60 * 60 * 1000);
    
    const lateDate = new Date(assignedDate.getTime() + formData.durationToLate * 60 * 60 * 1000);
    
    // Check if late deadline has passed - converted to receivable
    if (now >= lateDate) {
      return 'CONVERTED_TO_RECEIVABLE';
    }
    
    // Otherwise it's on time or pending
    return 'PENDING';
  };

  // Initialize remittance calculation
  useEffect(() => {
    const calc = calculateRemittance();
    setRemittanceCalc(calc);
    
    // Set default remittance due date (e.g., 72 hours from date assigned)
    const assignedDate = new Date(tripData.date_assigned);
    assignedDate.setHours(assignedDate.getHours() + 72); // Add 72 hours (3 days)
    setFormData(prev => ({
      ...prev,
      remittanceDueDate: assignedDate.toISOString().split('T')[0]
    }));
  }, [tripData]);

  // Auto-set amount to 0 when status becomes CONVERTED_TO_RECEIVABLE
  useEffect(() => {
    const status = calculateRemittanceStatus();
    if (status === 'CONVERTED_TO_RECEIVABLE' && formData.amount !== 0) {
      setFormData(prev => ({
        ...prev,
        amount: 0
      }));
    }
  }, [formData.durationToReceivable, formData.remittanceDueDate, tripData.date_assigned]);

  // Update receivable amount when remitted amount changes or when conversion to receivable detected
  useEffect(() => {
    if (shouldCreateReceivable()) {
      const receivableAmt = calculateReceivableAmount(formData.amount);
      
      // Distribute receivable based on whether there's a conductor
      if (hasConductor()) {
        setFormData(prev => ({
          ...prev,
          receivableAmount: receivableAmt,
          conductorShare: receivableAmt * DEFAULT_CONDUCTOR_SHARE,
          driverShare: receivableAmt * DEFAULT_DRIVER_SHARE
        }));
      } else {
        // Driver only - 100% to driver
        setFormData(prev => ({
          ...prev,
          receivableAmount: receivableAmt,
          conductorShare: 0,
          driverShare: receivableAmt
        }));
      }
    }
  }, [formData.amount, formData.durationToReceivable, remittanceCalc, tripData.date_assigned]);

  // Format employee name with suffix
  const formatEmployeeName = (firstName: string, middleName: string, lastName: string, suffix: string) => {
    const name = `${firstName} ${middleName} ${lastName}`;
    return suffix ? `${name}, ${suffix}` : name;
  };

  // Calculate expected remittance amount
  const calculateExpectedRemittance = (): number => {
    if (tripData.assignment_type === 'Boundary') {
      // Expected remittance = Boundary/Quota + Fuel
      return tripData.assignment_value + tripData.trip_fuel_expense;
    } else { // Percentage
      // Expected remittance = Company Share + Fuel
      const company_share = tripData.trip_revenue * (tripData.assignment_value / 100);
      return company_share + tripData.trip_fuel_expense;
    }
  };

  // Check if receivable should be created (when late)
  const shouldCreateReceivable = (): boolean => {
    const status = calculateRemittanceStatus();
    
    // Create receivable if status is CONVERTED_TO_RECEIVABLE (late)
    return status === 'CONVERTED_TO_RECEIVABLE';
  };

  // Calculate maximum remittance amount (when condition isn't met)
  const calculateMaximumRemittance = (): number => {
    const driver_conductor_minimum = getEmployeeCount() * MINIMUM_WAGE;
    return tripData.trip_revenue - driver_conductor_minimum;
  };

  // Validate individual field
  const validateFormField = (fieldName: keyof FormData, value: any): boolean => {
    let errorMessage = '';

    switch (fieldName) {
      case 'dateRecorded':
        if (!value) {
          errorMessage = 'Date recorded is required';
        } else {
          const selectedDate = new Date(value + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate > today) {
            errorMessage = 'Date recorded cannot be in the future';
          }
        }
        break;
      
      case 'amount':
        const currentStatus = calculateRemittanceStatus();
        
        // When status is CONVERTED_TO_RECEIVABLE, amount can be 0 (optional)
        if (currentStatus === 'CONVERTED_TO_RECEIVABLE') {
          // No validation needed - amount is optional when late or converted
          // Allow 0 or any valid positive amount
          if (value && value > 0) {
            // If they do enter an amount, validate it's not excessive
            if (remittanceCalc && !remittanceCalc.needsReceivable && value > calculateExpectedRemittance()) {
              errorMessage = `Amount cannot exceed expected remittance of ${formatMoney(calculateExpectedRemittance())}`;
            } else if (remittanceCalc && remittanceCalc.needsReceivable) {
              const maxRemittance = calculateMaximumRemittance();
              if (value > maxRemittance) {
                const employeeText = hasConductor() ? 'driver and conductor' : 'driver';
                errorMessage = `Amount cannot exceed ${formatMoney(maxRemittance)} (must leave minimum wage for ${employeeText})`;
              }
            }
          }
          break;
        }
        
        // For ON_TIME or PENDING status, amount is required
        if (!value || value <= 0) {
          errorMessage = 'Amount remitted must be greater than 0';
        } else if (remittanceCalc && !remittanceCalc.needsReceivable && value > calculateExpectedRemittance()) {
          // When condition is met, amount should not exceed expected remittance
          errorMessage = `Amount cannot exceed expected remittance of ${formatMoney(calculateExpectedRemittance())}`;
        } else if (remittanceCalc && remittanceCalc.needsReceivable) {
          // When condition is not met, check maximum remittance
          const maxRemittance = calculateMaximumRemittance();
          if (value > maxRemittance) {
            const employeeText = hasConductor() ? 'driver and conductor' : 'driver';
            errorMessage = `Amount cannot exceed ${formatMoney(maxRemittance)} (must leave minimum wage for ${employeeText})`;
          }
        }
        break;
      
      case 'remittanceDueDate':
        if (!value) {
          errorMessage = 'Remittance due date is required';
        }
        break;
      
      case 'durationToLate':
        if (!value || value <= 0) {
          errorMessage = 'Duration to late must be greater than 0';
        }
        break;
      
      case 'durationToReceivable':
        if (!value || value <= 0) {
          errorMessage = 'Duration to receivable must be greater than 0';
        }
        break;
      
      case 'remarks':
        if (value && value.length > 500) {
          errorMessage = 'Remarks cannot exceed 500 characters';
        }
        break;
      
      // Receivable field validations (only when receivable is needed)
      case 'conductorShare':
        if (shouldCreateReceivable() && hasConductor() && (!value || value <= 0)) {
          errorMessage = 'Conductor share must be greater than 0';
        }
        break;
      
      case 'driverShare':
        if (shouldCreateReceivable() && (!value || value <= 0)) {
          errorMessage = 'Driver share must be greater than 0';
        }
        break;
      
      case 'receivableDueDate':
        // Receivable due date is now optional - no validation needed
        break;
    }

    setFormErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));

    return errorMessage === '';
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const dateValid = validateFormField('dateRecorded', formData.dateRecorded);
    const amountValid = validateFormField('amount', formData.amount);
    const dueDateValid = validateFormField('remittanceDueDate', formData.remittanceDueDate);
    const durationToLateValid = validateFormField('durationToLate', formData.durationToLate);
    const durationToReceivableValid = validateFormField('durationToReceivable', formData.durationToReceivable);
    const remarksValid = validateFormField('remarks', formData.remarks);
    
    let receivableFieldsValid = true;
    if (shouldCreateReceivable()) {
      const driverShareValid = validateFormField('driverShare', formData.driverShare);
      let conductorShareValid = true;
      
      // Only validate conductor share if there's a conductor
      if (hasConductor()) {
        conductorShareValid = validateFormField('conductorShare', formData.conductorShare);
      }
      // Receivable due date is now optional, no validation needed
      
      receivableFieldsValid = conductorShareValid && driverShareValid;
    }

    return dateValid && amountValid && dueDateValid && durationToLateValid && durationToReceivableValid && remarksValid && receivableFieldsValid;
  };

  // Check form validity on data changes
  useEffect(() => {
    const currentStatus = calculateRemittanceStatus();
    const isConvertedToReceivable = currentStatus === 'CONVERTED_TO_RECEIVABLE';
    
    // Amount validation based on status
    let amountValid = false;
    if (isConvertedToReceivable) {
      amountValid = formData.amount === 0; // Must be 0 when converted to receivable
    } else {
      amountValid = formData.amount >= 0; // Can be 0 or positive
    }
    
    let isValid = 
      formData.dateRecorded !== '' &&
      amountValid &&
      formData.remittanceDueDate !== '' &&
      formData.durationToLate > 0 &&
      formData.durationToReceivable > 0 &&
      formErrors.dateRecorded === '' &&
      formErrors.amount === '' &&
      formErrors.remittanceDueDate === '' &&
      formErrors.durationToLate === '' &&
      formErrors.durationToReceivable === '' &&
      formErrors.remarks === '';
    
    // Add receivable validation if receivable should be created
    if (shouldCreateReceivable()) {
      isValid = isValid && 
        formData.driverShare > 0 &&
        formErrors.driverShare === '';
      
      // Only validate conductor share if there's a conductor
      if (hasConductor()) {
        isValid = isValid && 
          formData.conductorShare > 0 &&
          formErrors.conductorShare === '';
      }
      // Receivable due date is now optional, no validation needed
    }
    
    setIsFormValid(isValid);
  }, [formData, formErrors, remittanceCalc]);

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: any) => {
    // Special handling for conductor/driver share - auto-adjust the other share
    if (field === 'conductorShare' && shouldCreateReceivable()) {
      const totalReceivable = formData.receivableAmount;
      const newConductorShare = parseFloat(value) || 0;
      const newDriverShare = totalReceivable - newConductorShare;
      
      setFormData(prev => ({
        ...prev,
        conductorShare: newConductorShare,
        driverShare: Math.max(0, newDriverShare) // Ensure non-negative
      }));
      
      // Clear errors for both fields
      setFormErrors(prev => ({
        ...prev,
        conductorShare: '',
        driverShare: ''
      }));
      return;
    }
    
    if (field === 'driverShare' && shouldCreateReceivable()) {
      const totalReceivable = formData.receivableAmount;
      const newDriverShare = parseFloat(value) || 0;
      const newConductorShare = totalReceivable - newDriverShare;
      
      setFormData(prev => ({
        ...prev,
        driverShare: newDriverShare,
        conductorShare: Math.max(0, newConductorShare) // Ensure non-negative
      }));
      
      // Clear errors for both fields
      setFormErrors(prev => ({
        ...prev,
        conductorShare: '',
        driverShare: ''
      }));
      return;
    }
    
    // Default handling for other fields
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle input blur (validation)
  const handleInputBlur = (field: keyof FormData) => {
    validateFormField(field, formData[field]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix all validation errors before submitting', 'Validation Error');
      return;
    }

    // Show confirmation dialog with preview
    const result = await showRemittanceConfirmation({
      dateRecorded: formData.dateRecorded,
      busPlateNumber: tripData.bus_plate_number,
      tripRevenue: tripData.trip_revenue,
      assignmentType: tripData.assignment_type,
      assignmentValue: tripData.assignment_value,
      paymentMethod: tripData.payment_method,
      remittedAmount: formData.amount,
      hasLoan: shouldCreateReceivable(),
      loanAmount: shouldCreateReceivable() ? formData.receivableAmount : undefined
    });

    // If user cancels, stop submission
    if (!result.isConfirmed) {
      return;
    }

    const remittanceStatus = calculateRemittanceStatus();

    // Determine the final status based on receivable conversion
    let finalStatus = 'remitted';
    if (shouldCreateReceivable()) {
      // Converted to receivable (late remittance)
      finalStatus = 'receivable';
    }

    // Prepare data for submission
    const submissionData = {
      assignment_id: tripData.assignment_id,
      dateRecorded: formData.dateRecorded,
      amount: formData.amount,
      remarks: formData.remarks,
      remittanceDueDate: formData.remittanceDueDate,
      durationToLate: formData.durationToLate,
      durationToReceivable: formData.durationToReceivable,
      remittanceStatus: remittanceStatus,
      status: finalStatus,
      
      // Include receivable data if applicable (when late)
      ...(shouldCreateReceivable() && {
        receivable: {
          totalAmount: formData.receivableAmount,
          dueDate: formData.receivableDueDate,
          // Only include conductor data if there's a conductor
          ...(hasConductor() && {
            conductorId: tripData.conductorId,
            conductorShare: formData.conductorShare,
          }),
          driverId: tripData.driverId,
          driverShare: formData.driverShare
        }
      })
    };

    onSave(submissionData, mode);
  };

  if (!remittanceCalc) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">
          {mode === 'add' ? 'Record Remittance' : 'Edit Remittance'}
        </h1>
        <div className="modal-date-time">
            <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={onClose}>
            <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Trip Information - Read Only */}
      <p className="details-title">Trip Information</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Body Number */}
            <div className="form-group">
              <label>Body Number</label>
              <p>{tripData.body_number}</p>
            </div>

            {/* Route */}
            <div className="form-group">
              <label>Route</label>
              <p>{tripData.bus_route}</p>
            </div>

            {/* Date Assigned */}
            <div className="form-group">
              <label>Date Assigned</label>
              <p>{formatDate(tripData.date_assigned)}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Assignment Type */}
            <div className="form-group">
              <label>Assignment Type</label>
              <p>{tripData.assignment_type}</p>
            </div>

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

      {/* Employee Details */}
      <p className="details-title">Employee Details</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            {/* Conductor Name */}
            <div className="form-group">
              <label>Conductor Name</label>
              <p>
                {tripData.conductorFirstName 
                  ? formatEmployeeName(
                      tripData.conductorFirstName,
                      tripData.conductorMiddleName || '',
                      tripData.conductorLastName || '',
                      tripData.conductorSuffix || ''
                    )
                  : 'N/A'
                }
              </p>
            </div>

            {/* Driver Name */}
            <div className="form-group">
              <label>Driver Name</label>
              <p>
                {tripData.driverFirstName 
                  ? formatEmployeeName(
                      tripData.driverFirstName,
                      tripData.driverMiddleName || '',
                      tripData.driverLastName || '',
                      tripData.driverSuffix || ''
                    )
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Remittance Form - Editable */}
      <p className="details-title">Remittance Details</p>
      <div className="modal-content add">
        <form className="add-form" onSubmit={handleSubmit}>
            <div className="form-row">
                {/* Date Recorded */}
                <div className="form-group">
                    <label>
                        Date Recorded<span className="requiredTags"> *</span>
                    </label>
                    <input
                        type="date"
                        value={formData.dateRecorded}
                        onChange={(e) => handleInputChange('dateRecorded', e.target.value)}
                        onBlur={() => handleInputBlur('dateRecorded')}
                        max={new Date().toISOString().split('T')[0]}
                        className={formErrors.dateRecorded ? 'invalid-input' : ''}
                        required
                    />
                    {formData.dateRecorded && (
                      <small className="formatted-date-preview">
                        {formatDate(formData.dateRecorded)}
                      </small>
                    )}
                    <p className="add-error-message">{formErrors.dateRecorded}</p>
                </div>

                {/* Remittance Due Date */}
                <div className="form-group">
                    <label>
                        Remittance Due Date<span className="requiredTags"> *</span>
                    </label>
                    <input
                        type="date"
                        value={formData.remittanceDueDate}
                        onChange={(e) => handleInputChange('remittanceDueDate', e.target.value)}
                        onBlur={() => handleInputBlur('remittanceDueDate')}
                        className={formErrors.remittanceDueDate ? 'invalid-input' : ''}
                        required
                    />
                    {formData.remittanceDueDate && (
                      <small className="formatted-date-preview">
                        {formatDate(formData.remittanceDueDate)}
                      </small>
                    )}
                    <p className="add-error-message">{formErrors.remittanceDueDate}</p>
                </div>
            </div>

            <div className="form-row">
                {/* Expected Remittance (Read-only, calculated) */}
                <div className="form-group">
                    <label>Expected Remittance</label>
                    <input
                        type="text"
                        value={formatMoney(calculateExpectedRemittance())}
                        disabled
                        className="disabled-field"
                    />
                    <small className="hint-message">
                      {tripData.assignment_type === 'Boundary' 
                        ? 'Quota + Fuel Expense' 
                        : 'Company Share + Fuel Expense'
                      }
                    </small>
                </div>

                {/* Amount Remitted */}
                <div className="form-group">
                    <label>
                        Amount Remitted{calculateRemittanceStatus() !== 'CONVERTED_TO_RECEIVABLE' && <span className="requiredTags"> *</span>}
                    </label>
                    <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                        onBlur={() => handleInputBlur('amount')}
                        min="0"
                        max={remittanceCalc.needsReceivable ? calculateMaximumRemittance() : undefined}
                        className={calculateRemittanceStatus() === 'CONVERTED_TO_RECEIVABLE' ? 'disabled-field' : (formErrors.amount ? 'invalid-input' : '')}
                        placeholder="0"
                        disabled={calculateRemittanceStatus() === 'CONVERTED_TO_RECEIVABLE'}
                        required={calculateRemittanceStatus() !== 'CONVERTED_TO_RECEIVABLE'}
                    />
                    {remittanceCalc.minimumRemittance > 0 && calculateRemittanceStatus() !== 'CONVERTED_TO_RECEIVABLE' && (
                      <small className="hint-message">
                        Expected: {formatMoney(remittanceCalc.minimumRemittance)}
                      </small>
                    )}
                    {remittanceCalc.needsReceivable && calculateRemittanceStatus() !== 'CONVERTED_TO_RECEIVABLE' && (
                      <small className="hint-message">
                        Maximum: {formatMoney(calculateMaximumRemittance())} (must leave ₱{MINIMUM_WAGE * getEmployeeCount()} for {hasConductor() ? 'driver and conductor' : 'driver'})
                      </small>
                    )}
                    {calculateRemittanceStatus() === 'CONVERTED_TO_RECEIVABLE' && (
                      <small className="error-message">
                        ⚠️ Deadline exceeded. Amount set to 0. Full expected remittance will be converted to a receivable.
                      </small>
                    )}
                    <p className="add-error-message">{formErrors.amount}</p>
                </div>
            </div>

            <div className="form-row">
                {/* Remittance Status (Read-only, calculated) */}
                <div className="form-group">
                    <label>Remittance Status</label>
                    <input
                        type="text"
                        value={calculateRemittanceStatus()}
                        disabled
                        className={`remittance-status-field ${
                          calculateRemittanceStatus() === 'CONVERTED_TO_RECEIVABLE' ? 'status-converted-to-receivable' : 
                          calculateRemittanceStatus() === 'ON_TIME' ? 'status-on-time' : 'status-pending'
                        }`}
                    />
                    {calculateRemittanceStatus() === 'CONVERTED_TO_RECEIVABLE' && (
                      <small className="add-error-message">
                        ⚠️ Deadline exceeded. This will be converted to a receivable.
                      </small>
                    )}
                </div>
            </div>

            {/* Remarks */}
            <div className="form-row">
                <div className="form-group">
                <label>Remarks</label>
                <textarea
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    onBlur={() => handleInputBlur('remarks')}
                    maxLength={500}
                    className={formErrors.remarks ? 'invalid-input' : ''}
                    placeholder="Enter any additional notes or remarks..."
                    rows={4}
                />
                <small className="hint-message">{formData.remarks.length}/500 characters</small>
                <p className="add-error-message">{formErrors.remarks}</p>
                </div>
            </div>
        </form>
      </div>
        
      {/* Receivable Details - Only show when late */}
      {shouldCreateReceivable() && (
        <>
          <p className="details-title">Receivable Details</p>
          <div className="modal-content add">
              <form className="add-form">
                  {/* Receivable Breakdown - Collapsible */}
                  <div className="form-row">
                      <div className="form-group loan-breakdown-container">
                          <div 
                              className="loan-breakdown-header"
                              onClick={() => setShowReceivableBreakdown(!showReceivableBreakdown)}
                          >
                              <label className="loan-breakdown-title">
                                  Receivable Amount Breakdown
                              </label>
                              <i className={`ri-arrow-${showReceivableBreakdown ? 'up' : 'down'}-s-line`}></i>
                          </div>
                          
                          {showReceivableBreakdown && (
                              <div className="loan-breakdown-content">
                                  <div className="breakdown-section-title">
                                      <strong>Calculation:</strong>
                                  </div>
                                  
                                  {tripData.assignment_type === 'Boundary' ? (
                                      <>
                                          <div className="breakdown-row">
                                              <span>Boundary/Quota Amount:</span>
                                              <span>{formatMoney(tripData.assignment_value)}</span>
                                          </div>
                                          <div className="breakdown-row">
                                              <span>Fuel Expense:</span>
                                              <span>{formatMoney(tripData.trip_fuel_expense)}</span>
                                          </div>
                                          <div className="breakdown-row-bold">
                                              <span>Expected Remittance:</span>
                                              <span>{formatMoney(tripData.assignment_value + tripData.trip_fuel_expense)}</span>
                                          </div>
                                          <div className="breakdown-row-negative">
                                              <span>(-) Amount Remitted:</span>
                                              <span>({formatMoney(formData.amount)})</span>
                                          </div>
                                          <div className="breakdown-row-total">
                                              <span>Total Receivable:</span>
                                              <span>{formatMoney(formData.receivableAmount)}</span>
                                          </div>
                                      </>
                                  ) : (
                                      <>
                                          <div className="breakdown-row">
                                              <span>Trip Revenue:</span>
                                              <span>{formatMoney(tripData.trip_revenue)}</span>
                                          </div>
                                          <div className="breakdown-row">
                                              <span>Company Share ({tripData.assignment_value}%):</span>
                                              <span>{formatMoney(tripData.trip_revenue * (tripData.assignment_value / 100))}</span>
                                          </div>
                                          <div className="breakdown-row">
                                              <span>Fuel Expense:</span>
                                              <span>{formatMoney(tripData.trip_fuel_expense)}</span>
                                          </div>
                                          <div className="breakdown-row-bold">
                                              <span>Expected Remittance:</span>
                                              <span>{formatMoney((tripData.trip_revenue * (tripData.assignment_value / 100)) + tripData.trip_fuel_expense)}</span>
                                          </div>
                                          <div className="breakdown-row-negative">
                                              <span>(-) Amount Remitted:</span>
                                              <span>({formatMoney(formData.amount)})</span>
                                          </div>
                                          <div className="breakdown-row-total">
                                              <span>Total Receivable:</span>
                                              <span>{formatMoney(formData.receivableAmount)}</span>
                                          </div>
                                      </>
                                  )}
                                  
                                  <div className="breakdown-distribution-section">
                                      <div className="breakdown-section-title">
                                          <strong>Receivable Distribution:</strong>
                                      </div>
                                      {hasConductor() ? (
                                        <>
                                          <div className="breakdown-row">
                                              <span>Conductor Share ({DEFAULT_CONDUCTOR_SHARE * 100}%):</span>
                                              <span>{formatMoney(formData.conductorShare)}</span>
                                          </div>
                                          <div className="breakdown-row">
                                              <span>Driver Share ({DEFAULT_DRIVER_SHARE * 100}%):</span>
                                              <span>{formatMoney(formData.driverShare)}</span>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="breakdown-row">
                                            <span>Driver Share (100%):</span>
                                            <span>{formatMoney(formData.driverShare)}</span>
                                        </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="form-row">
                      {/* Total Receivable Amount (Auto-calculated) */}
                      <div className="form-group">
                          <label>Total Receivable Amount</label>
                          <input
                              type="text"
                              value={formatMoney(formData.receivableAmount)}
                              disabled
                              className="receivableAmount"
                          />
                          <small className="hint-message">
                            The amount short from expected remittance
                          </small>
                      </div>

                      {/* Receivable Due Date */}
                      <div className="form-group">
                          <label>
                              Receivable Due Date
                          </label>
                          <input
                              type="date"
                              value={formData.receivableDueDate}
                              onChange={(e) => handleInputChange('receivableDueDate', e.target.value)}
                              onBlur={() => handleInputBlur('receivableDueDate')}
                              min={new Date().toISOString().split('T')[0]}
                              className={formErrors.receivableDueDate ? 'invalid-input' : ''}
                          />
                          <p className="add-error-message">{formErrors.receivableDueDate}</p>
                      </div>
                  </div>

                  {/* Only show conductor fields if there's a conductor */}
                  {hasConductor() && (
                    <div className="form-row">
                        {/* Conductor Share */}
                        <div className="form-group">
                            <label>
                                Conductor Name
                            </label>
                            <input
                                type="text"
                                value={tripData.conductorFirstName 
                                  ? formatEmployeeName(
                                      tripData.conductorFirstName,
                                      tripData.conductorMiddleName || '',
                                      tripData.conductorLastName || '',
                                      tripData.conductorSuffix || ''
                                    )
                                  : 'N/A'
                                }
                                disabled
                                className="disabled-field"
                            />
                        </div>

                        {/* Conductor Share Amount */}
                        <div className="form-group">
                            <label>
                                Conductor Share<span className="requiredTags"> *</span>
                            </label>
                            <input
                                type="number"
                                value={formData.conductorShare}
                                onChange={(e) => handleInputChange('conductorShare', parseFloat(e.target.value) || 0)}
                                onBlur={() => handleInputBlur('conductorShare')}
                                min="1"
                                max={formData.receivableAmount}
                                className={formErrors.conductorShare ? 'invalid-input' : ''}
                                placeholder="0.00"
                                required
                            />
                            <p className="add-error-message">{formErrors.conductorShare}</p>
                        </div>
                    </div>
                  )}

                  <div className="form-row">
                      {/* Driver Name */}
                      <div className="form-group">
                          <label>
                              Driver Name
                          </label>
                          <input
                              type="text"
                              value={tripData.driverFirstName 
                                ? formatEmployeeName(
                                    tripData.driverFirstName,
                                    tripData.driverMiddleName || '',
                                    tripData.driverLastName || '',
                                    tripData.driverSuffix || ''
                                  )
                                : 'N/A'
                              }
                              disabled
                              className="disabled-field"
                          />
                      </div>

                      {/* Driver Share Amount */}
                      <div className="form-group">
                          <label>
                              Driver Share<span className="requiredTags"> *</span>
                          </label>
                          <input
                              type="number"
                              value={formData.driverShare}
                              onChange={(e) => handleInputChange('driverShare', parseFloat(e.target.value) || 0)}
                              onBlur={() => handleInputBlur('driverShare')}
                              min="1"
                              max={formData.receivableAmount}
                              className={formErrors.driverShare ? 'invalid-input' : ''}
                              placeholder="0.00"
                              required
                          />
                          <p className="add-error-message">{formErrors.driverShare}</p>
                      </div>
                  </div>
              </form>
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
              type="submit"
              className="submit-btn"
              disabled={!isFormValid}
              onClick={handleSubmit}
          >
              {mode === 'add' ? 'Record Remittance' : 'Update Remittance'}
          </button>
      </div>
    </>
  );
}