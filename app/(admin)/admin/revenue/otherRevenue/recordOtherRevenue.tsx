"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import "@/styles/revenue/recordOtherRevenue.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { showWarning, showError, showConfirmation } from "@/utils/Alerts";
import { isValidAmount } from "@/utils/validation";
import { OtherRevenueData } from "./page";

interface RecordOtherRevenueModalProps {
  mode: "add" | "edit";
  existingData?: OtherRevenueData | null;
  onSave: (formData: OtherRevenueData, mode: "add" | "edit") => void;
  onClose: () => void;
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  departments: Array<{ id: number; name: string }>;
  currentUser: string;
}

interface FormErrors {
  dateRecorded: string;
  otherRevenueCategory: string;
  amount: string;
  sourceRefNo: string;
  department: string;
  paymentMethodId: string;
  discountAmount: string;
  discountPercentage: string;
  discountReason: string;
  recognitionSchedule: string;
  remarks: string;
}

const OTHER_REVENUE_CATEGORIES = [
  { value: 'ASSET_SALE', label: 'Asset Sale' },
  { value: 'INTEREST', label: 'Interest' },
  { value: 'PENALTIES', label: 'Penalties' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'DONATIONS', label: 'Donations' },
  { value: 'OTHER', label: 'Other' },
];

export default function RecordOtherRevenueModal({ 
  mode, 
  existingData, 
  onSave, 
  onClose, 
  paymentMethods,
  departments,
  currentUser 
}: RecordOtherRevenueModalProps) {
  
  // Generate revenue code for new records
  const generateRevenueCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REV-OTH-${timestamp}-${random}`.toUpperCase();
  };

  const [formData, setFormData] = useState<OtherRevenueData>({
    id: existingData?.id,
    revenueCode: existingData?.revenueCode || generateRevenueCode(),
    revenueType: 'OTHER',
    dateRecorded: existingData?.dateRecorded || new Date().toISOString().split('T')[0],
    otherRevenueCategory: existingData?.otherRevenueCategory || '',
    amount: existingData?.amount || 0,
    sourceRefNo: existingData?.sourceRefNo || '',
    department: existingData?.department || '',
    discountAmount: existingData?.discountAmount || 0,
    discountPercentage: existingData?.discountPercentage || 0,
    discountReason: existingData?.discountReason || '',
    isUnearnedRevenue: existingData?.isUnearnedRevenue || false,
    recognitionSchedule: existingData?.recognitionSchedule || '',
    isVerified: existingData?.isVerified || false,
    remarks: existingData?.remarks || '',
    paymentMethodId: existingData?.paymentMethodId || 0,
    verifiedBy: existingData?.verifiedBy || '',
    verifiedAt: existingData?.verifiedAt || '',
    receiptUrl: existingData?.receiptUrl || '',
    accountCode: existingData?.accountCode || '',
    createdBy: existingData?.createdBy || currentUser,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    dateRecorded: '',
    otherRevenueCategory: '',
    amount: '',
    sourceRefNo: '',
    department: '',
    paymentMethodId: '',
    discountAmount: '',
    discountPercentage: '',
    discountReason: '',
    recognitionSchedule: '',
    remarks: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Auto-calculate discount amount when percentage changes
  useEffect(() => {
    if (formData.discountPercentage && formData.amount) {
      const calculatedDiscount = (formData.amount * (formData.discountPercentage || 0)) / 100;
      setFormData(prev => ({
        ...prev,
        discountAmount: Number(calculatedDiscount.toFixed(2))
      }));
    }
  }, [formData.discountPercentage, formData.amount]);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  // Validate individual field
  const validateFormField = (fieldName: keyof FormErrors, value: any): boolean => {
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

      case 'otherRevenueCategory':
        if (!value) {
          errorMessage = 'Revenue category is required';
        }
        break;

      case 'amount':
        if (!value || value <= 0) {
          errorMessage = 'Amount must be greater than 0';
        } else if (!isValidAmount(value)) {
          errorMessage = 'Amount must be a valid positive number';
        }
        break;

      // case 'sourceRefNo':
      //   if (!value || value.trim() === '') {
      //     errorMessage = 'Reference number is required';
      //   } else if (value.length < 3) {
      //     errorMessage = 'Reference number must be at least 3 characters';
      //   }
      //   break;

      case 'department':
        if (!value) {
          errorMessage = 'Department is required';
        }
        break;

      case 'paymentMethodId':
        if (!value || value === 0) {
          errorMessage = 'Payment method is required';
        }
        break;

      case 'discountAmount':
        if (value && value > formData.amount) {
          errorMessage = 'Discount amount cannot exceed total amount';
        }
        break;

      case 'discountPercentage':
        if (value && (value < 0 || value > 100)) {
          errorMessage = 'Discount percentage must be between 0 and 100';
        }
        break;

      case 'discountReason':
        if ((formData.discountAmount || formData.discountPercentage) && !value) {
          errorMessage = 'Discount reason is required when discount is applied';
        }
        break;

      case 'recognitionSchedule':
        if (formData.isUnearnedRevenue && !value) {
          errorMessage = 'Recognition schedule is required for unearned revenue';
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
    const categoryValid = validateFormField('otherRevenueCategory', formData.otherRevenueCategory);
    const amountValid = validateFormField('amount', formData.amount);
    const refNoValid = validateFormField('sourceRefNo', formData.sourceRefNo);
    const deptValid = validateFormField('department', formData.department);
    const paymentMethodValid = validateFormField('paymentMethodId', formData.paymentMethodId);
    const remarksValid = validateFormField('remarks', formData.remarks);

    let discountValid = true;
    if (formData.discountAmount || formData.discountPercentage) {
      const amountValid = validateFormField('discountAmount', formData.discountAmount);
      const percentValid = validateFormField('discountPercentage', formData.discountPercentage);
      const reasonValid = validateFormField('discountReason', formData.discountReason);
      discountValid = amountValid && percentValid && reasonValid;
    }

    let unearnedValid = true;
    if (formData.isUnearnedRevenue) {
      unearnedValid = validateFormField('recognitionSchedule', formData.recognitionSchedule);
    }

    return dateValid && categoryValid && amountValid && refNoValid && deptValid && 
           paymentMethodValid && remarksValid && discountValid && unearnedValid;
  };

  // Check form validity
  useEffect(() => {
    const isValid = 
      formData.dateRecorded !== '' &&
      formData.otherRevenueCategory !== '' &&
      formData.amount > 0 &&
      formData.sourceRefNo !== '' &&
      formData.department !== '' &&
      formData.paymentMethodId !== 0 &&
      formErrors.dateRecorded === '' &&
      formErrors.otherRevenueCategory === '' &&
      formErrors.amount === '' &&
      formErrors.sourceRefNo === '' &&
      formErrors.department === '' &&
      formErrors.paymentMethodId === '' &&
      formErrors.remarks === '';

    setIsFormValid(isValid);
  }, [formData, formErrors]);

  // Handle input change
  const handleInputChange = (field: keyof OtherRevenueData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle input blur (validation)
  const handleInputBlur = (field: keyof FormErrors) => {
    validateFormField(field, formData[field as keyof OtherRevenueData]);
  };

  // Handle close with unsaved changes warning
  const handleClose = async () => {
    if (!isDirty || mode === 'edit' && !isDirty) {
      onClose();
      return;
    }

    const result = await showConfirmation(
      'You have unsaved changes. Are you sure you want to close?',
      'Unsaved Changes'
    );

    if (result.isConfirmed) {
      onClose();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showError('Please fix all validation errors before submitting', 'Validation Error');
      return;
    }

    // Show confirmation dialog
    const result = await showConfirmation(
      `Are you sure you want to ${mode === 'add' ? 'add' : 'update'} this other revenue record?`,
      `Confirm ${mode === 'add' ? 'Add' : 'Update'}`
    );

    if (!result.isConfirmed) {
      return;
    }

    onSave(formData, mode);
  };

  // Calculate net amount after discount
  const calculateNetAmount = (): number => {
    return formData.amount - (formData.discountAmount || 0);
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">
          {mode === 'add' ? 'Record Other Revenue' : 'Edit Other Revenue'}
        </h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>
        <button className="close-modal-btn" onClick={handleClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* I. Revenue Information */}
      <p className="details-title">I. Revenue Information</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            {/* Revenue Code */}
            <div className="form-group">
              <label>Revenue Code</label>
              <input
                type="text"
                value={formData.revenueCode}
                disabled
                className="disabled-field"
              />
              <small className="hint-message">Auto-generated</small>
            </div>

            {/* Revenue Type */}
            <div className="form-group">
              <label>Revenue Type</label>
              <input
                type="text"
                value="OTHER"
                disabled
                className="disabled-field"
              />
            </div>
          </div>

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

            {/* Revenue Category */}
            <div className="form-group">
              <label>
                Revenue Category<span className="requiredTags"> *</span>
              </label>
              <select
                value={formData.otherRevenueCategory}
                onChange={(e) => handleInputChange('otherRevenueCategory', e.target.value)}
                onBlur={() => handleInputBlur('otherRevenueCategory')}
                className={formErrors.otherRevenueCategory ? 'invalid-input' : ''}
                required
              >
                <option value="">Select Category</option>
                {OTHER_REVENUE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <p className="add-error-message">{formErrors.otherRevenueCategory}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Amount */}
            <div className="form-group">
              <label>
                Amount<span className="requiredTags"> *</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                onBlur={() => handleInputBlur('amount')}
                min="0.01"
                step="0.01"
                className={formErrors.amount ? 'invalid-input' : ''}
                placeholder="0.00"
                required
              />
              <p className="add-error-message">{formErrors.amount}</p>
            </div>

            {/* Reference Number */}
            <div className="form-group">
              <label>
                Reference Number {/* <span className="requiredTags"> *</span> */}
              </label>
              <input
                type="text"
                value={formData.sourceRefNo}
                onChange={(e) => handleInputChange('sourceRefNo', e.target.value)}
                onBlur={() => handleInputBlur('sourceRefNo')}
                className={formErrors.sourceRefNo ? 'invalid-input' : ''}
                placeholder="e.g., INV-2024-001"
                required
              />
              <p className="add-error-message">{formErrors.sourceRefNo}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Department */}
            <div className="form-group">
              <label>
                Department<span className="requiredTags"> *</span>
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                onBlur={() => handleInputBlur('department')}
                className={formErrors.department ? 'invalid-input' : ''}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <p className="add-error-message">{formErrors.department}</p>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label>
                Payment Method<span className="requiredTags"> *</span>
              </label>
              <select
                value={formData.paymentMethodId}
                onChange={(e) => handleInputChange('paymentMethodId', parseInt(e.target.value) || 0)}
                onBlur={() => handleInputBlur('paymentMethodId')}
                className={formErrors.paymentMethodId ? 'invalid-input' : ''}
                required
              >
                <option value={0}>Select Payment Method</option>
                {paymentMethods.map(method => (
                  <option key={method.id} value={method.id}>
                    {method.methodName}
                  </option>
                ))}
              </select>
              <p className="add-error-message">{formErrors.paymentMethodId}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Discount Information (Optional) */}
      <p className="details-title">II. Discount Information (Optional)</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            {/* Discount Amount */}
            <div className="form-group">
              <label>Discount Amount</label>
              <input
                type="number"
                value={formData.discountAmount}
                onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || 0)}
                onBlur={() => handleInputBlur('discountAmount')}
                min="0"
                step="0.01"
                className={formErrors.discountAmount ? 'invalid-input' : ''}
                placeholder="0.00"
              />
              <p className="add-error-message">{formErrors.discountAmount}</p>
            </div>

            {/* Discount Percentage */}
            <div className="form-group">
              <label>Discount Percentage (%)</label>
              <input
                type="number"
                value={formData.discountPercentage}
                onChange={(e) => handleInputChange('discountPercentage', parseFloat(e.target.value) || 0)}
                onBlur={() => handleInputBlur('discountPercentage')}
                min="0"
                max="100"
                step="0.01"
                className={formErrors.discountPercentage ? 'invalid-input' : ''}
                placeholder="0.00"
              />
              {(formData.discountPercentage || 0) > 0 && (
                <small className="hint-message">
                  Auto-calculated: {formatMoney(formData.discountAmount || 0)}
                </small>
              )}
              <p className="add-error-message">{formErrors.discountPercentage}</p>
            </div>
          </div>

          {(formData.discountAmount || formData.discountPercentage) ? (
            <>
              <div className="form-row">
                {/* Discount Reason */}
                <div className="form-group full-width">
                  <label>
                    Discount Reason<span className="requiredTags"> *</span>
                  </label>
                  <input
                    type="text"
                    value={formData.discountReason}
                    onChange={(e) => handleInputChange('discountReason', e.target.value)}
                    onBlur={() => handleInputBlur('discountReason')}
                    className={formErrors.discountReason ? 'invalid-input' : ''}
                    placeholder="Reason for discount..."
                    required
                  />
                  <p className="add-error-message">{formErrors.discountReason}</p>
                </div>
              </div>

              <div className="form-row">
                {/* Net Amount (Read-only) */}
                <div className="form-group">
                  <label>Net Amount</label>
                  <input
                    type="text"
                    value={formatMoney(calculateNetAmount())}
                    disabled
                    className="disabled-field net-amount-field"
                  />
                  <small className="hint-message">Amount after discount</small>
                </div>
              </div>
            </>
          ) : null}
        </form>
      </div>

      {/* III. Revenue Recognition (Optional) */}
      <p className="details-title">III. Revenue Recognition (Optional)</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isUnearnedRevenue}
                  onChange={(e) => handleInputChange('isUnearnedRevenue', e.target.checked)}
                />
                <span>This is Unearned Revenue</span>
              </label>
              <small className="hint-message">
                Check if revenue should be recognized over time
              </small>
            </div>
          </div>

          {formData.isUnearnedRevenue && (
            <div className="form-row">
              <div className="form-group full-width">
                <label>
                  Recognition Schedule<span className="requiredTags"> *</span>
                </label>
                <textarea
                  value={formData.recognitionSchedule}
                  onChange={(e) => handleInputChange('recognitionSchedule', e.target.value)}
                  onBlur={() => handleInputBlur('recognitionSchedule')}
                  className={formErrors.recognitionSchedule ? 'invalid-input' : ''}
                  rows={3}
                  placeholder="Enter recognition schedule (e.g., Monthly over 12 months)..."
                  required
                />
                <p className="add-error-message">{formErrors.recognitionSchedule}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* IV. Additional Information (Optional) */}
      <p className="details-title">IV. Additional Information (Optional)</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group full-width">
              <label>Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                onBlur={() => handleInputBlur('remarks')}
                className={formErrors.remarks ? 'invalid-input' : ''}
                maxLength={500}
                rows={4}
                placeholder="Additional notes or remarks..."
              />
              <small className="hint-message">{formData.remarks?.length || 0}/500 characters</small>
              <p className="add-error-message">{formErrors.remarks}</p>
            </div>
          </div>
        </form>
      </div>

      {/* Action Buttons */}
      <div className="modal-actions">
        <button
          type="button"
          className="cancel-btn"
          onClick={handleClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="submit-btn"
          disabled={!isFormValid}
          onClick={handleSubmit}
        >
          {mode === 'add' ? 'Record Revenue' : 'Update Revenue'}
        </button>
      </div>
    </>
  );
}