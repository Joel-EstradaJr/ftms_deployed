"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { showWarning, showError } from "@/utils/Alerts";
import { validateField } from "@/utils/validation";

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
  };
  onSave: (formData: any, mode: "add" | "edit") => void;
  onClose: () => void;
}

interface FormData {
  dateRecorded: string;
  amount: number;
  remarks: string;
}

interface FormErrors {
  dateRecorded: string;
  amount: string;
  remarks: string;
}

export default function RecordTripRevenueModal({ mode, tripData, onSave, onClose }: RecordTripRevenueModalProps) {
  const [formData, setFormData] = useState<FormData>({
    dateRecorded: mode === 'edit' && tripData.dateRecorded 
      ? new Date(tripData.dateRecorded).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    amount: mode === 'edit' && tripData.amount ? tripData.amount : 0,
    remarks: mode === 'edit' && tripData.remarks ? tripData.remarks : ''
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    dateRecorded: '',
    amount: '',
    remarks: ''
  });

  const [isFormValid, setIsFormValid] = useState(false);

  // Format employee name with suffix
  const formatEmployeeName = (firstName: string, middleName: string, lastName: string, suffix: string) => {
    const name = `${firstName} ${middleName} ${lastName}`;
    return suffix ? `${name}, ${suffix}` : name;
  };

  // Validate individual field
  const validateFormField = (fieldName: keyof FormData, value: any): boolean => {
    let errorMessage = '';

    switch (fieldName) {
      case 'dateRecorded':
        if (!value) {
          errorMessage = 'Date recorded is required';
        } else {
          const selectedDate = new Date(value as string);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate > today) {
            errorMessage = 'Date recorded cannot be in the future';
          }
        }
        break;
      
      case 'amount':
        if (!value || value <= 0) {
          errorMessage = 'Amount remitted must be greater than 0';
        }
        break;
      
      case 'remarks':
        if (value && value.length > 500) {
          errorMessage = 'Remarks cannot exceed 500 characters';
        }
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
    const remarksValid = validateFormField('remarks', formData.remarks);

    return dateValid && amountValid && remarksValid;
  };

  // Check form validity on data changes
  useEffect(() => {
    const isValid = 
      formData.dateRecorded !== '' &&
      formData.amount > 0 &&
      formErrors.dateRecorded === '' &&
      formErrors.amount === '' &&
      formErrors.remarks === '';
    
    setIsFormValid(isValid);
  }, [formData, formErrors]);

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: any) => {
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix all validation errors before submitting', 'Validation Error');
      return;
    }

    // Prepare data for submission
    const submissionData = {
      assignment_id: tripData.assignment_id,
      dateRecorded: formData.dateRecorded,
      amount: formData.amount,
      remarks: formData.remarks,
      status: 'remitted'
    };

    onSave(submissionData, mode);
  };

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
            {/* Employee Name */}
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

            {/* Position */}
            <div className="form-group">
              <label>Position</label>
              <p>{tripData.position_name}</p>
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
              <p className="add-error-message">{formErrors.dateRecorded}</p>
            </div>

            {/* Amount Remitted */}
            <div className="form-group">
              <label>
                Amount Remitted<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                onBlur={() => handleInputBlur('amount')}
                min="1"
                step="1"
                className={formErrors.amount ? 'invalid-input' : ''}
                placeholder="0.00"
                required
              />
              <p className="add-error-message">{formErrors.amount}</p>
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
              <small>{formData.remarks.length}/500 characters</small>
              <p className="add-error-message">{formErrors.remarks}</p>
            </div>
          </div>

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
            >
              {mode === 'add' ? 'Record Remittance' : 'Update Remittance'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}