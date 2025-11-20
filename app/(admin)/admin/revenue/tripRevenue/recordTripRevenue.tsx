/**
 * Record Trip Revenue Modal Component
 * 
 * ============================================================================
 * BACKEND INTEGRATION NOTES
 * ============================================================================
 * 
 * This component handles the recording and editing of trip revenue remittances.
 * It automatically calculates loan requirements when:
 * 1. The remitted amount is less than the expected remittance (shortfall)
 * 2. The deadline for remittance has been exceeded (converted to loan)
 * 
 * DATA REQUIREMENTS FROM BACKEND:
 * The tripData prop must include:
 * - conductorId, conductorFirstName, conductorMiddleName, conductorLastName, conductorSuffix
 * - driverId, driverFirstName, driverMiddleName, driverLastName, driverSuffix
 * 
 * These fields are CRITICAL for:
 * - hasConductor() function to detect driver-only scenarios
 * - Proper loan distribution (100% to driver if no conductor, 50/50 split otherwise)
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
 *   durationToLoan: number,
 *   remittanceStatus: string,
 *   status: 'remitted' | 'loaned',
 *   loan?: {  // Only included when shouldCreateLoan() returns true
 *     principalAmount: number,
 *     interestRate: number,
 *     interestRateType: 'percentage' | 'cash',
 *     totalLoanAmount: number,
 *     conductorId?: string,  // Only when hasConductor() is true
 *     conductorShare?: number,  // Only when hasConductor() is true
 *     driverId: string,
 *     driverShare: number,
 *     loanType: 'Trip Deficit',
 *     dueDate: string
 *   }
 * }
 * 
 * BACKEND RESPONSIBILITIES:
 * 1. Update Model Revenue table with remittance details
 * 2. If loan object exists, create loan records in Loan Management table
 * 3. Create separate loan entries for conductor (if exists) and driver
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
  durationToLate: number; // Days until considered late
  durationToLoan: number; // Days until converted to loan
  
  // Loan fields (only shown when revenue doesn't meet condition)
  loanPrincipalAmount: number;
  conductorShare: number;
  driverShare: number;
  loanType: string;
  interestRate: number;
  interestRateType: 'percentage' | 'cash';
  loanDueDate: string;
}

interface FormErrors {
  dateRecorded: string;
  amount: string;
  remarks: string;
  remittanceDueDate: string;
  durationToLate: string;
  durationToLoan: string;
  loanPrincipalAmount: string;
  conductorShare: string;
  driverShare: string;
  loanType: string;
  interestRate: string;
  interestRateType: string;
  loanDueDate: string;
}

interface RemittanceCalculation {
  minimumRemittance: number;
  needsLoan: boolean;
  loanAmount: number;
  status: 'PENDING' | 'ON_TIME' | 'LATE' | 'CONVERTED_TO_LOAN';
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
    durationToLoan: 168, // Default: 168 hours (7 days) to convert to loan
    
    // Loan fields
    loanPrincipalAmount: 0,
    conductorShare: 0,
    driverShare: 0,
    loanType: 'Trip Deficit',
    interestRate: 0,
    interestRateType: 'percentage',
    loanDueDate: ''
  });

  const [showLoanBreakdown, setShowLoanBreakdown] = useState(false);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    dateRecorded: '',
    amount: '',
    remarks: '',
    remittanceDueDate: '',
    durationToLate: '',
    durationToLoan: '',
    loanPrincipalAmount: '',
    conductorShare: '',
    driverShare: '',
    loanType: '',
    interestRate: '',
    interestRateType: '',
    loanDueDate: '',
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
      needsLoan: revenueInsufficient, // Flag that revenue is insufficient (will show warning)
      loanAmount,
      status: 'PENDING', // Initial status is always PENDING, will be calculated based on time
      conductorMinimum: MINIMUM_WAGE,
      driverMinimum: MINIMUM_WAGE
    };
  };

  // Calculate total loan amount (what driver and conductor owe together)
  const calculateLoanAmount = (remittedAmount: number): number => {
    if (tripData.assignment_type === 'Boundary') {
      // Expected remittance = Boundary/Quota + Fuel
      const expectedRemittance = tripData.assignment_value + tripData.trip_fuel_expense;
      // Total shortfall = what should have been remitted - what was actually remitted
      // When CONVERTED_TO_LOAN (amount = 0), the entire expected remittance becomes the loan
      return Math.max(0, expectedRemittance - remittedAmount);
    } else { // Percentage
      // Expected remittance = Company Share + Fuel
      const company_share = tripData.trip_revenue * (tripData.assignment_value / 100);
      const expectedRemittance = company_share + tripData.trip_fuel_expense;
      // Total shortfall = what should have been remitted - what was actually remitted
      // When CONVERTED_TO_LOAN (amount = 0), the entire expected remittance becomes the loan
      return Math.max(0, expectedRemittance - remittedAmount);
    }
  };

  // Calculate remittance status based on duration from assigned date (in hours)
  const calculateRemittanceStatus = (): 'PENDING' | 'ON_TIME' | 'LATE' | 'CONVERTED_TO_LOAN' => {
    const now = new Date();
    const assignedDate = new Date(tripData.date_assigned);
    
    // Use the remittanceDueDate if set, otherwise calculate from assigned date
    const dueDate = formData.remittanceDueDate 
      ? new Date(formData.remittanceDueDate + 'T23:59:59') // End of due date
      : new Date(assignedDate.getTime() + formData.durationToLoan * 60 * 60 * 1000);
    
    const lateDate = new Date(assignedDate.getTime() + formData.durationToLate * 60 * 60 * 1000);
    
    // Check if deadline has passed (now is after due date) - converted to loan
    if (now > dueDate) {
      return 'CONVERTED_TO_LOAN';
    }
    
    // Check if late (past durationToLate but before due date)
    if (now >= lateDate && now <= dueDate) {
      return 'LATE';
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

  // Auto-set amount to 0 when status becomes CONVERTED_TO_LOAN
  useEffect(() => {
    const status = calculateRemittanceStatus();
    if (status === 'CONVERTED_TO_LOAN' && formData.amount !== 0) {
      setFormData(prev => ({
        ...prev,
        amount: 0
      }));
    }
  }, [formData.durationToLoan, formData.remittanceDueDate, tripData.date_assigned]);

  // Update loan amount when remitted amount changes or when conversion to loan detected
  useEffect(() => {
    if (shouldCreateLoan()) {
      const principalAmt = calculateLoanAmount(formData.amount);
      
      // Calculate interest
      let interest = 0;
      if (formData.interestRate > 0) {
        if (formData.interestRateType === 'percentage') {
          interest = principalAmt * (formData.interestRate / 100);
        } else {
          interest = formData.interestRate;
        }
      }
      
      // Total loan = principal + interest
      const totalLoanAmt = principalAmt + interest;
      
      // Distribute loan based on whether there's a conductor
      if (hasConductor()) {
        setFormData(prev => ({
          ...prev,
          loanPrincipalAmount: principalAmt,
          conductorShare: totalLoanAmt * DEFAULT_CONDUCTOR_SHARE,
          driverShare: totalLoanAmt * DEFAULT_DRIVER_SHARE
        }));
      } else {
        // Driver only - 100% to driver
        setFormData(prev => ({
          ...prev,
          loanPrincipalAmount: principalAmt,
          conductorShare: 0,
          driverShare: totalLoanAmt
        }));
      }
    }
  }, [formData.amount, formData.durationToLoan, formData.interestRate, formData.interestRateType, remittanceCalc, tripData.date_assigned]);

  // Format employee name with suffix
  const formatEmployeeName = (firstName: string, middleName: string, lastName: string, suffix: string) => {
    const name = `${firstName} ${middleName} ${lastName}`;
    return suffix ? `${name}, ${suffix}` : name;
  };

  // Calculate total loan amount including interest
  const calculateTotalLoanAmount = (): number => {
    const principal = formData.loanPrincipalAmount;
    let interest = 0;
    
    if (formData.interestRate > 0) {
      if (formData.interestRateType === 'percentage') {
        interest = principal * (formData.interestRate / 100);
      } else {
        interest = formData.interestRate;
      }
    }
    
    return principal + interest;
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

  // Check if there's a shortfall in remittance
  const hasRemittanceShortfall = (): boolean => {
    return formData.amount > 0 && formData.amount < calculateExpectedRemittance();
  };

  // Check if loan should be created (either shortfall or deadline exceeded)
  const shouldCreateLoan = (): boolean => {
    const status = calculateRemittanceStatus();
    
    // Create loan if:
    // 1. There's a shortfall (amount > 0 but less than expected), OR
    // 2. Status is CONVERTED_TO_LOAN (deadline completely exceeded)
    // Note: LATE status alone does NOT create a loan - only shows warning
    if (status === 'CONVERTED_TO_LOAN') {
      return true; // Always create loan when converted to loan
    }
    
    return hasRemittanceShortfall(); // Create loan when there's a shortfall
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
        // When status is CONVERTED_TO_LOAN, amount can be 0 (it's automatically set)
        if (calculateRemittanceStatus() === 'CONVERTED_TO_LOAN') {
          // No validation needed - amount is auto-set to 0
          break;
        }
        
        if (!value || value <= 0) {
          errorMessage = 'Amount remitted must be greater than 0';
        } else if (remittanceCalc && !remittanceCalc.needsLoan && value > calculateExpectedRemittance()) {
          // When condition is met, amount should not exceed expected remittance
          errorMessage = `Amount cannot exceed expected remittance of ${formatMoney(calculateExpectedRemittance())}`;
        } else if (remittanceCalc && remittanceCalc.needsLoan) {
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
        } else if (formData.durationToLoan && value >= formData.durationToLoan) {
          errorMessage = 'Duration to late must be less than duration to loan';
        }
        break;
      
      case 'durationToLoan':
        if (!value || value <= 0) {
          errorMessage = 'Duration to loan must be greater than 0';
        } else if (formData.durationToLate && value <= formData.durationToLate) {
          errorMessage = 'Duration to loan must be greater than duration to late';
        }
        break;
      
      case 'remarks':
        if (value && value.length > 500) {
          errorMessage = 'Remarks cannot exceed 500 characters';
        }
        break;
      
      // Loan field validations (only when loan is needed)
      case 'conductorShare':
        if (shouldCreateLoan() && hasConductor() && (!value || value <= 0)) {
          errorMessage = 'Conductor share must be greater than 0';
        }
        break;
      
      case 'driverShare':
        if (shouldCreateLoan() && (!value || value <= 0)) {
          errorMessage = 'Driver share must be greater than 0';
        }
        break;
      
      case 'loanDueDate':
        // Loan due date is now optional - no validation needed
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
    const durationToLoanValid = validateFormField('durationToLoan', formData.durationToLoan);
    const remarksValid = validateFormField('remarks', formData.remarks);
    
    let loanFieldsValid = true;
    if (shouldCreateLoan()) {
      const driverShareValid = validateFormField('driverShare', formData.driverShare);
      let conductorShareValid = true;
      
      // Only validate conductor share if there's a conductor
      if (hasConductor()) {
        conductorShareValid = validateFormField('conductorShare', formData.conductorShare);
      }
      // Loan due date is now optional, no validation needed
      
      loanFieldsValid = conductorShareValid && driverShareValid;
    }

    return dateValid && amountValid && dueDateValid && durationToLateValid && durationToLoanValid && remarksValid && loanFieldsValid;
  };

  // Check form validity on data changes
  useEffect(() => {
    const isConvertedToLoan = calculateRemittanceStatus() === 'CONVERTED_TO_LOAN';
    
    let isValid = 
      formData.dateRecorded !== '' &&
      (isConvertedToLoan ? formData.amount === 0 : formData.amount > 0) && // Allow 0 when converted to loan
      formData.remittanceDueDate !== '' &&
      formData.durationToLate > 0 &&
      formData.durationToLoan > 0 &&
      formData.durationToLoan > formData.durationToLate &&
      formErrors.dateRecorded === '' &&
      formErrors.amount === '' &&
      formErrors.remittanceDueDate === '' &&
      formErrors.durationToLate === '' &&
      formErrors.durationToLoan === '' &&
      formErrors.remarks === '';
    
    // Add loan validation if loan should be created
    if (shouldCreateLoan()) {
      isValid = isValid && 
        formData.driverShare > 0 &&
        formErrors.driverShare === '';
      
      // Only validate conductor share if there's a conductor
      if (hasConductor()) {
        isValid = isValid && 
          formData.conductorShare > 0 &&
          formErrors.conductorShare === '';
      }
      // Loan due date is now optional, no validation needed
    }
    
    setIsFormValid(isValid);
  }, [formData, formErrors, remittanceCalc]);

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: any) => {
    // Special handling for conductor/driver share - auto-adjust the other share
    if (field === 'conductorShare' && shouldCreateLoan()) {
      const totalLoan = calculateTotalLoanAmount();
      const newConductorShare = parseFloat(value) || 0;
      const newDriverShare = totalLoan - newConductorShare;
      
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
    
    if (field === 'driverShare' && shouldCreateLoan()) {
      const totalLoan = calculateTotalLoanAmount();
      const newDriverShare = parseFloat(value) || 0;
      const newConductorShare = totalLoan - newDriverShare;
      
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
      hasLoan: shouldCreateLoan(),
      loanAmount: shouldCreateLoan() ? formData.loanPrincipalAmount : undefined
    });

    // If user cancels, stop submission
    if (!result.isConfirmed) {
      return;
    }

    const remittanceStatus = calculateRemittanceStatus();

    // Determine the final status based on loan type
    let finalStatus = 'remitted';
    if (shouldCreateLoan()) {
      // All loans (both trip deficit and shortfall) use 'loaned' status
      finalStatus = 'loaned';
    }

    // Prepare data for submission
    const submissionData = {
      assignment_id: tripData.assignment_id,
      dateRecorded: formData.dateRecorded,
      amount: formData.amount,
      remarks: formData.remarks,
      remittanceDueDate: formData.remittanceDueDate,
      durationToLate: formData.durationToLate,
      durationToLoan: formData.durationToLoan,
      remittanceStatus: remittanceStatus,
      status: finalStatus,
      
      // Include loan data if applicable (when there's a shortfall OR deadline exceeded)
      ...(shouldCreateLoan() && {
        loan: {
          principalAmount: formData.loanPrincipalAmount,
          interestRate: formData.interestRate,
          interestRateType: formData.interestRateType,
          totalLoanAmount: calculateTotalLoanAmount(),
          // Only include conductor data if there's a conductor
          ...(hasConductor() && {
            conductorId: tripData.conductorId,
            conductorShare: formData.conductorShare,
          }),
          driverId: tripData.driverId,
          driverShare: formData.driverShare,
          loanType: formData.loanType,
          dueDate: formData.loanDueDate
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
                        Amount Remitted{calculateRemittanceStatus() !== 'CONVERTED_TO_LOAN' && <span className="requiredTags"> *</span>}
                    </label>
                    <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                        onBlur={() => handleInputBlur('amount')}
                        min="1"
                        max={remittanceCalc.needsLoan ? calculateMaximumRemittance() : undefined}
                        className={calculateRemittanceStatus() === 'CONVERTED_TO_LOAN' ? 'disabled-field' : (formErrors.amount ? 'invalid-input' : '')}
                        placeholder="0"
                        disabled={calculateRemittanceStatus() === 'CONVERTED_TO_LOAN'}
                        required={calculateRemittanceStatus() !== 'CONVERTED_TO_LOAN'}
                    />
                    {remittanceCalc.minimumRemittance > 0 && calculateRemittanceStatus() !== 'CONVERTED_TO_LOAN' && (
                      <small className="hint-message">
                        Expected: {formatMoney(remittanceCalc.minimumRemittance)}
                      </small>
                    )}
                    {remittanceCalc.needsLoan && calculateRemittanceStatus() !== 'CONVERTED_TO_LOAN' && (
                      <small className="hint-message">
                        Maximum: {formatMoney(calculateMaximumRemittance())} (must leave ₱{MINIMUM_WAGE * getEmployeeCount()} for {hasConductor() ? 'driver and conductor' : 'driver'})
                      </small>
                    )}
                    {formData.amount > 0 && formData.amount < calculateExpectedRemittance() && calculateRemittanceStatus() !== 'CONVERTED_TO_LOAN' && (
                      <small className="error-message">
                        ⚠️ Amount is less than expected remittance. A loan will be created for the shortfall.
                      </small>
                    )}
                    {calculateRemittanceStatus() === 'CONVERTED_TO_LOAN' && (
                      <small className="error-message">
                        ⚠️ Deadline exceeded. Amount set to 0. Full expected remittance will be converted to a loan.
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
                          calculateRemittanceStatus() === 'CONVERTED_TO_LOAN' ? 'status-converted-to-loan' : 
                          calculateRemittanceStatus() === 'ON_TIME' ? 'status-on-time' : 
                          calculateRemittanceStatus() === 'LATE' ? 'status-late' : 'status-pending'
                        }`}
                    />
                    {calculateRemittanceStatus() === 'CONVERTED_TO_LOAN' && (
                      <small className="add-error-message">
                        ⚠️ Deadline exceeded. This will be converted to a loan.
                      </small>
                    )}
                    {calculateRemittanceStatus() === 'LATE' && (
                      <small className="add-error-message">
                        ⚠️ Submission is late. Please remit as soon as possible.
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
        
      {/* Loan Details - Only show if there's a shortfall in remittance OR deadline exceeded */}
      {shouldCreateLoan() && (
        <>
          <p className="details-title">Loan Details</p>
          <div className="modal-content add">
              <form className="add-form">
                  {/* Loan Breakdown - Collapsible */}
                  <div className="form-row">
                      <div className="form-group loan-breakdown-container">
                          <div 
                              className="loan-breakdown-header"
                              onClick={() => setShowLoanBreakdown(!showLoanBreakdown)}
                          >
                              <label className="loan-breakdown-title">
                                  Principal Amount Breakdown
                              </label>
                              <i className={`ri-arrow-${showLoanBreakdown ? 'up' : 'down'}-s-line`}></i>
                          </div>
                          
                          {showLoanBreakdown && (
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
                                              <span>Total Loan (Shortfall):</span>
                                              <span>{formatMoney(formData.loanPrincipalAmount)}</span>
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
                                              <span>Principal Amount (Shortfall):</span>
                                              <span>{formatMoney(formData.loanPrincipalAmount)}</span>
                                          </div>
                                      </>
                                  )}
                                  
                                  {/* Interest Calculation */}
                                  {formData.interestRate > 0 && (
                                      <div className="breakdown-interest-section">
                                          <div className="breakdown-row">
                                              <span>Interest ({formData.interestRateType === 'percentage' ? `${formData.interestRate}%` : 'Fixed'}):</span>
                                              <span>
                                                  {formData.interestRateType === 'percentage' 
                                                      ? formatMoney(formData.loanPrincipalAmount * (formData.interestRate / 100))
                                                      : formatMoney(formData.interestRate)
                                                  }
                                              </span>
                                          </div>
                                          <div className="breakdown-row-grand-total">
                                              <span>Total Loan Amount:</span>
                                              <span>{formatMoney(calculateTotalLoanAmount())}</span>
                                          </div>
                                      </div>
                                  )}
                                  
                                  <div className="breakdown-distribution-section">
                                      <div className="breakdown-section-title">
                                          <strong>Loan Distribution:</strong>
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
                      {/* Principal Amount (Auto-calculated) */}
                      <div className="form-group">
                          <label>Principal Amount (Shortfall)</label>
                          <input
                              type="text"
                              value={formatMoney(formData.loanPrincipalAmount)}
                              disabled
                              className="principalAmount"
                          />
                          <small className="hint-message">
                            The amount short from expected remittance
                          </small>
                      </div>

                      {/* Total Loan Amount (Principal + Interest) */}
                      <div className="form-group">
                          <label>Total Loan Amount</label>
                          <input
                              type="text"
                              value={formatMoney(calculateTotalLoanAmount())}
                              disabled
                              className="loanAmount"
                          />
                          <small className="hint-message">
                            Principal + Interest (if applicable)
                          </small>
                      </div>
                  </div>

                  <div className="form-row">
                      {/* Loan Type */}
                      <div className="form-group">
                          <label>
                              Loan Type
                          </label>
                          <select
                              value={formData.loanType}
                              disabled
                              className="loanType"
                          >
                              <option value="Trip Deficit">Trip Deficit</option>
                          </select>
                          <small className="hint-message">
                            Loan type is automatically set to Trip Deficit for remittance shortfalls
                          </small>
                      </div>

                      {/* Loan Due Date */}
                      <div className="form-group">
                          <label>
                              Loan Due Date
                          </label>
                          <input
                              type="date"
                              value={formData.loanDueDate}
                              onChange={(e) => handleInputChange('loanDueDate', e.target.value)}
                              onBlur={() => handleInputBlur('loanDueDate')}
                              min={new Date().toISOString().split('T')[0]}
                              className={formErrors.loanDueDate ? 'invalid-input' : ''}
                          />
                          <p className="add-error-message">{formErrors.loanDueDate}</p>
                      </div>
                  </div>

                  <div className="form-row">
                      {/* Interest Rate Type */}
                      <div className="form-group">
                          <label>Interest Rate Type</label>
                          <select
                              value={formData.interestRateType}
                              onChange={(e) => handleInputChange('interestRateType', e.target.value as 'percentage' | 'cash')}
                          >
                              <option value="percentage">Percentage</option>
                              <option value="cash">Cash</option>
                          </select>
                      </div>

                      {/* Interest Rate */}
                      <div className="form-group">
                          <label>Interest Rate (Optional)</label>
                          <input
                              type="number"
                              value={formData.interestRate}
                              onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value) || 0)}
                              min="0"
                              placeholder={formData.interestRateType === 'percentage' ? '0.00%' : '0.00'}
                          />
                          <small className="hint-message">
                            {formData.interestRateType === 'percentage' ? 'Enter as percentage (e.g., 5 for 5%)' : 'Enter fixed amount'}
                          </small>
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
                                max={calculateTotalLoanAmount()}
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
                              max={calculateTotalLoanAmount()}
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