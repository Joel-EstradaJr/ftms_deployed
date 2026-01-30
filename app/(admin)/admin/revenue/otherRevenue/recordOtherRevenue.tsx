"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";

import { formatDate, formatMoney } from "@/utils/formatting";
import { showWarning, showError, showConfirmation } from "@/utils/Alerts";
import { isValidAmount } from "@/utils/validation";
import { OtherRevenueData } from "./page";
import { RevenueScheduleFrequency, RevenueScheduleItem } from "@/app/types/revenue";
import { generateScheduleDates, generateScheduleItems, validateSchedule } from "@/utils/revenueScheduleCalculations";
import SearchableDropdown, { DropdownOption } from "@/Components/CustomDropdown";
// Reference number format validation removed — allowing any characters or empty value for other revenue
import PaymentScheduleTable from "@/Components/PaymentScheduleTable";

interface RecordOtherRevenueModalProps {
  mode: "add" | "edit";
  existingData?: OtherRevenueData | null;
  onSave: (formData: OtherRevenueData, mode: "add" | "edit") => void;
  onClose: () => void;
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  departments: Array<{ id: number; name: string }>;
  currentUser: string;
  revenueTypes?: Array<{ id: number; code: string; name: string; description?: string }>;
  scheduleFrequencies?: Array<{ value: string; label: string }>;
}

interface FormErrors {
  date_recorded: string;
  name: string;
  description: string;
  amount: string;
  payment_reference: string;
  department_id: string;  // Changed from 'department' to match formData field
  payment_method: string;
  numberOfPayments: string;
  scheduleStartDate: string;
  remarks: string;
}

const OTHER_REVENUE_CATEGORIES: DropdownOption[] = [
  { value: 'Asset Sale', label: 'Asset Sale', description: 'Revenue from selling company assets' },
  { value: 'Interest', label: 'Interest', description: 'Interest income from investments or deposits' },
  { value: 'Penalties', label: 'Penalties', description: 'Penalty fees collected' },
  { value: 'Insurance', label: 'Insurance', description: 'Insurance claims and reimbursements' },
  { value: 'Donations', label: 'Donations', description: 'Donations and contributions received' },
  { value: 'Other', label: 'Other', description: 'Other miscellaneous revenue' },
];

export default function RecordOtherRevenueModal({
  mode,
  existingData,
  onSave,
  onClose,
  paymentMethods,
  departments,
  currentUser,
  revenueTypes = [],
  scheduleFrequencies = []
}: RecordOtherRevenueModalProps) {

  // Build dropdown options from revenue types (use backend data if available, fallback to hardcoded)
  const revenueTypeOptions: DropdownOption[] = revenueTypes.length > 0
    ? revenueTypes.map(t => ({
      value: t.name,
      label: t.name,
      description: t.description || `Revenue type: ${t.code}`
    }))
    : OTHER_REVENUE_CATEGORIES;

  // Generate revenue code for new records
  const generateRevenueCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `REV-OTH-${timestamp}-${random}`.toUpperCase();
  };

  const [formData, setFormData] = useState<OtherRevenueData>({
    id: existingData?.id,
    code: existingData?.code || generateRevenueCode(),
    name: existingData?.name || '',
    date_recorded: existingData?.date_recorded || new Date().toISOString().split('T')[0],
    description: existingData?.description || '',
    amount: existingData?.amount || 0,
    payment_reference: existingData?.payment_reference || '',
    department_id: existingData?.department_id || undefined,
    isUnearnedRevenue: existingData?.isUnearnedRevenue || false,
    scheduleFrequency: existingData?.scheduleFrequency || undefined,
    scheduleStartDate: existingData?.scheduleStartDate || new Date().toISOString().split('T')[0],
    numberOfPayments: existingData?.numberOfPayments || 2,
    scheduleItems: existingData?.scheduleItems || [],
    remarks: existingData?.remarks || '',
    payment_method: existingData?.payment_method || '',
    accountCode: existingData?.accountCode || '',
    createdBy: existingData?.createdBy || currentUser,
  });

  const [scheduleItems, setScheduleItems] = useState<RevenueScheduleItem[]>(existingData?.scheduleItems || []);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    date_recorded: '',
    name: '',
    description: '',
    amount: '',
    payment_reference: '',
    department_id: '',  // Changed from 'department' to match formData field
    payment_method: '',
    remarks: '',
    numberOfPayments: '',
    scheduleStartDate: '',
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Generate schedule when relevant fields change
  // In edit mode, preserve existing schedule items from the backend
  useEffect(() => {
    // In edit mode with existing schedule, don't regenerate - preserve backend data
    if (mode === 'edit' && existingData?.scheduleItems && existingData.scheduleItems.length > 0) {
      // Keep existing schedule items, don't regenerate
      return;
    }

    if (
      formData.isUnearnedRevenue &&
      formData.scheduleFrequency &&
      formData.scheduleFrequency !== RevenueScheduleFrequency.CUSTOM &&
      formData.scheduleStartDate &&
      formData.numberOfPayments &&
      formData.numberOfPayments > 0 &&
      formData.amount > 0
    ) {
      const dates = generateScheduleDates(
        formData.scheduleFrequency,
        formData.scheduleStartDate,
        formData.numberOfPayments
      );
      const items = generateScheduleItems(dates, formData.amount);
      setScheduleItems(items);
      setFormData(prev => ({ ...prev, scheduleItems: items }));
    } else if (formData.isUnearnedRevenue && formData.scheduleFrequency === RevenueScheduleFrequency.CUSTOM) {
      // For custom, keep existing items or create one default item
      if (scheduleItems.length === 0 && formData.amount > 0) {
        const today = new Date().toISOString().split('T')[0];
        const items = generateScheduleItems([today], formData.amount);
        setScheduleItems(items);
        setFormData(prev => ({ ...prev, scheduleItems: items }));
      }
    } else if (!formData.isUnearnedRevenue) {
      setScheduleItems([]);
      setFormData(prev => ({ ...prev, scheduleItems: [] }));
    }
  }, [
    mode,
    existingData?.scheduleItems,
    formData.isUnearnedRevenue,
    formData.scheduleFrequency,
    formData.scheduleStartDate,
    formData.numberOfPayments,
    formData.amount
  ]);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  // Validate individual field
  // Returns empty string when valid, otherwise returns the error message
  const validateFormField = (fieldName: keyof FormErrors, value: any): string => {
    let errorMessage = '';

    switch (fieldName) {
      case 'date_recorded':
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

      case 'name':
        if (!value || value.trim() === '') {
          errorMessage = 'Revenue type is required';
        }
        break;

      case 'description':
        // Description is now optional since name (revenue type) is required
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

      case 'department_id':
        if (value === undefined || value === null || value === '') {
          errorMessage = 'Department is required';
        }
        break;

      case 'payment_method':
        if (!value || value.trim() === '') {
          errorMessage = 'Payment method is required';
        }
        break;

      case 'remarks':
        // Remarks are optional, but if present must be at least 5 characters and at most 500
        if (value && value.trim() !== '') {
          const len = value.trim().length;
          if (len < 5) {
            errorMessage = 'Remarks must be at least 5 characters';
          } else if (len > 500) {
            errorMessage = 'Remarks cannot exceed 500 characters';
          }
        }
        break;

      case 'numberOfPayments':
        // Number of payments required for non-custom schedule
        if (formData.scheduleFrequency && formData.scheduleFrequency !== RevenueScheduleFrequency.CUSTOM) {
          const n = Number(value);
          if (!n || !Number.isInteger(n) || n < 2 || n > 100) {
            errorMessage = 'Number of payments must be an integer between 2 and 100';
          }
        }
        break;

      case 'payment_reference':
        // Optional; accept any format (nullable)
        break;

      case 'scheduleStartDate':
        if (formData.isUnearnedRevenue && !value) {
          errorMessage = 'Schedule start date is required';
        } else if (value && mode === 'add') {
          // start date cannot be in the past (must be today or later) - only validate in add mode
          const startDate = new Date(value + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDate.setHours(0, 0, 0, 0);
          if (startDate < today) {
            errorMessage = 'Start date cannot be in the past';
          }
        }
        break;
    }

    setFormErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));

    return errorMessage;
  };

  // Validate entire form
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const dateErr = validateFormField('date_recorded', formData.date_recorded);
    const nameErr = validateFormField('name', formData.name);
    const amountErr = validateFormField('amount', formData.amount);
    const deptErr = validateFormField('department_id', formData.department_id);
    const paymentMethodErr = validateFormField('payment_method', formData.payment_method);
    const remarksErr = validateFormField('remarks', formData.remarks);

    let unearnedValid = true;
    const unearnedErrors: string[] = [];
    if (formData.isUnearnedRevenue) {
      // Schedule validations for non-custom frequencies
      if (formData.scheduleFrequency && formData.scheduleFrequency !== RevenueScheduleFrequency.CUSTOM) {
        const npErr = validateFormField('numberOfPayments', formData.numberOfPayments);
        const sdErr = validateFormField('scheduleStartDate', formData.scheduleStartDate);
        if (npErr) unearnedErrors.push(npErr);
        if (sdErr) unearnedErrors.push(sdErr);
        unearnedValid = unearnedValid && unearnedErrors.length === 0;
      } else if (formData.scheduleFrequency === RevenueScheduleFrequency.CUSTOM) {
        // For custom, still require start date
        const sdErr = validateFormField('scheduleStartDate', formData.scheduleStartDate);
        if (sdErr) unearnedErrors.push(sdErr);
        unearnedValid = unearnedValid && unearnedErrors.length === 0;
      }
    }

    const errors: string[] = [];
    if (dateErr) errors.push(dateErr);
    if (nameErr) errors.push(nameErr);
    if (amountErr) errors.push(amountErr);
    if (deptErr) errors.push(deptErr);
    if (paymentMethodErr) errors.push(paymentMethodErr);
    if (remarksErr) errors.push(remarksErr);
    errors.push(...unearnedErrors);

    const isValid = errors.length === 0;
    return { isValid, errors };
  };

  // Check form validity
  useEffect(() => {
    const isValid =
      formData.date_recorded !== '' &&
      formData.name !== '' &&
      formData.amount > 0 &&
      formData.department_id !== undefined &&
      formData.payment_method !== '' &&
      formErrors.date_recorded === '' &&
      formErrors.name === '' &&
      formErrors.amount === '' &&
      formErrors.department_id === '' &&
      formErrors.payment_method === '' &&
      formErrors.numberOfPayments === '' &&
      formErrors.scheduleStartDate === '' &&
      formErrors.remarks === '';

    setIsFormValid(isValid);
  }, [formData, formErrors]);

  // Handle input change - updates form data and clears any existing errors for the field
  const handleInputChange = (field: keyof OtherRevenueData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user provides a value
    // Map formData field names to formErrors field names where they differ
    const errorFieldMap: Partial<Record<keyof OtherRevenueData, keyof FormErrors>> = {
      department_id: 'department_id',
      name: 'name',
      date_recorded: 'date_recorded',
      amount: 'amount',
      payment_method: 'payment_method',
      payment_reference: 'payment_reference',
      remarks: 'remarks',
      description: 'description',
      numberOfPayments: 'numberOfPayments',
      scheduleStartDate: 'scheduleStartDate',
    };

    const errorField = errorFieldMap[field];
    if (errorField && formErrors[errorField]) {
      setFormErrors(prev => ({
        ...prev,
        [errorField]: ''
      }));
    }
  };

  // Handle input blur (validation) - validates with the value passed, not from stale state
  const handleInputBlur = (field: keyof FormErrors, value?: any) => {
    // Use provided value or fall back to formData (which may be stale during async updates)
    const fieldValue = value !== undefined ? value : formData[field as keyof OtherRevenueData];
    validateFormField(field, fieldValue);
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

    const validation = validateForm();
    if (!validation.isValid) {
      showError(validation.errors?.[0] || 'Please fix all validation errors before submitting', 'Validation Error');

      // Focus/scroll to the first invalid input for better UX
      // Allow state updates to apply so the invalid class is present in the DOM
      setTimeout(() => {
        const firstInvalid: HTMLElement | null = document.querySelector('.invalid-input') as HTMLElement | null;
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          try { firstInvalid.focus(); } catch (err) { /* ignore */ }
        }
      }, 20);
      return;
    }

    // Validate payment schedule if unearned revenue
    if (formData.isUnearnedRevenue) {
      if (!formData.scheduleFrequency) {
        showError('Please select a schedule frequency', 'Validation Error');
        return;
      }

      // In edit mode, use existing schedule items; in add mode, use generated items
      const itemsToValidate = mode === 'edit' && existingData?.scheduleItems && existingData.scheduleItems.length > 0
        ? existingData.scheduleItems
        : scheduleItems;

      if (itemsToValidate.length === 0 && formData.scheduleItems?.length === 0) {
        showError('Please generate a payment schedule', 'Validation Error');
        return;
      }

      // Only validate schedule amounts in add mode (existing schedules may have partial payments)
      if (mode === 'add') {
        const scheduleValidation = validateSchedule(scheduleItems, formData.amount);
        if (!scheduleValidation.isValid) {
          showError(scheduleValidation.errors.join('\n'), 'Schedule Validation Error');
          return;
        }
      }

      // Block saving if there are overdue payments in edit mode
      if (mode === 'edit' && scheduleItems.some(item => item.paymentStatus === 'OVERDUE')) {
        showError(
          'Cannot save schedule with overdue payments. Please resolve all overdue installments before updating.',
          'Overdue Payments Detected'
        );
        return;
      }
    }

    // Show confirmation dialog
    const result = await showConfirmation(
      `Are you sure you want to ${mode === 'add' ? 'add' : 'update'} this other revenue record?${formData.isUnearnedRevenue
        ? `\n\nThis will create ${scheduleItems.length} payment installments.`
        : ''
      }`,
      `Confirm ${mode === 'add' ? 'Add' : 'Update'}`
    );

    if (!result.isConfirmed) {
      return;
    }

    onSave(formData, mode);
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
                value={formData.code}
                disabled
                className="disabled-field"
              />
              <small className="hint-message">Auto-generated</small>
            </div>

            {/* Revenue Type */}
            <div className="form-group">
              <label>
                Revenue Type<span className="requiredTags"> *</span>
              </label>
              <SearchableDropdown
                options={revenueTypeOptions}
                value={formData.name}
                onChange={(value: string) => {
                  handleInputChange('name', value);
                  // Clear validation error immediately on selection
                  if (value && value.trim() !== '') {
                    setFormErrors(prev => ({ ...prev, name: '' }));
                  }
                }}
                onBlur={() => { }}
                placeholder="Select Revenue Type"
                className={formErrors.name ? 'invalid-input' : ''}
                disabled={false}
                showDescription={true}
                allowCustomInput={false}
              />
              <p className="add-error-message">{formErrors.name}</p>
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
                value={formData.date_recorded}
                onChange={(e) => handleInputChange('date_recorded', e.target.value)}
                onBlur={() => handleInputBlur('date_recorded')}
                max={new Date().toISOString().split('T')[0]}
                className={formErrors.date_recorded ? 'invalid-input' : ''}
                disabled={mode === 'edit'}
                required
              />
              {formData.date_recorded && (
                <small className="formatted-date-preview">
                  {formatDate(formData.date_recorded)}
                </small>
              )}
              <p className="add-error-message">{formErrors.date_recorded}</p>
            </div>

            {/* Description (Optional) */}
            <div className="form-group">
              <label>
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Additional details (optional)"
              />
              <small className="hint-message">Optional additional information</small>
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

            {/* Reference Number (optional) */}
            <div className="form-group">
              <label>
                Reference Number {/* <span className="requiredTags"> *</span> */}
              </label>
              <input
                type="text"
                value={formData.payment_reference}
                onChange={(e) => handleInputChange('payment_reference', e.target.value)}
                onBlur={() => handleInputBlur('payment_reference')}
                className={formErrors.payment_reference ? 'invalid-input' : ''}
                placeholder="e.g., INV-2024-001"
              />
              <small className="hint-message">Optional</small>
              <p className="add-error-message">{formErrors.payment_reference}</p>
            </div>
          </div>

          <div className="form-row">
            {/* Department */}
            <div className="form-group">
              <label>
                Department<span className="requiredTags"> *</span>
              </label>
              <select
                value={formData.department_id ?? ''}
                onChange={(e) => handleInputChange('department_id', e.target.value ? parseInt(e.target.value) : undefined)}
                onBlur={() => handleInputBlur('department_id')}
                className={formErrors.department_id ? 'invalid-input' : ''}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <p className="add-error-message">{formErrors.department_id}</p>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label>
                Payment Method<span className="requiredTags"> *</span>
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
                onBlur={() => handleInputBlur('payment_method')}
                className={formErrors.payment_method ? 'invalid-input' : ''}
                required
              >
                <option value="">Select Payment Method</option>
                {paymentMethods.map(method => (
                  <option key={method.id} value={method.methodName}>
                    {method.methodName}
                  </option>
                ))}
              </select>
              <p className="add-error-message">{formErrors.payment_method}</p>
            </div>
          </div>
        </form>
      </div>

      {/* II. Unearned Revenue Payment Schedule (Optional) */}
      <p className="details-title">II. Unearned Revenue Payment Schedule (Optional)</p>
      <div className="modal-content add">
        <form className="add-form">
          <div className="form-row">
            <div className="form-group">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="isUnearnedRevenue"
                  checked={formData.isUnearnedRevenue}
                  onChange={(e) => handleInputChange('isUnearnedRevenue', e.target.checked)}
                  disabled={mode === 'edit'}
                />
                <label htmlFor="isUnearnedRevenue">
                  This is Unearned Revenue (Payment Schedule)<br /><small className="hint-message" style={{ fontWeight: 'normal' }}>{mode === 'edit' && formData.isUnearnedRevenue ? 'Cannot change receivable status in edit mode' : 'Check if revenue will be received in multiple installments over time'}</small>
                </label>
              </div>

            </div>
          </div>

          {formData.isUnearnedRevenue && (
            <>
              <div className="form-row">
                {/* Schedule Frequency */}
                <div className="form-group">
                  <label>
                    Schedule Frequency<span className="requiredTags"> *</span>
                  </label>
                  <select
                    value={formData.scheduleFrequency || ''}
                    onChange={(e) => handleInputChange('scheduleFrequency', e.target.value as RevenueScheduleFrequency)}
                    disabled={mode === 'edit'}
                    required
                  >
                    <option value="">Select Frequency</option>
                    {scheduleFrequencies.length > 0 ? (
                      scheduleFrequencies.map((freq) => (
                        <option key={freq.value} value={freq.value}>{freq.label}</option>
                      ))
                    ) : (
                      // Fallback to hardcoded options if backend data not available
                      <>
                        <option value={RevenueScheduleFrequency.DAILY}>Daily</option>
                        <option value={RevenueScheduleFrequency.WEEKLY}>Weekly</option>
                        <option value={RevenueScheduleFrequency.MONTHLY}>Monthly</option>
                      </>
                    )}
                    {/* Always include CUSTOM option for manual date entry */}
                    <option value={RevenueScheduleFrequency.CUSTOM}>Custom Dates</option>
                  </select>
                  <small className="hint-message">
                    {formData.scheduleFrequency === 'DAILY' && 'Consecutive daily payments'}
                    {formData.scheduleFrequency === 'WEEKLY' && 'Same day each week'}
                    {formData.scheduleFrequency === 'BIWEEKLY' && 'Same day every two weeks'}
                    {formData.scheduleFrequency === 'MONTHLY' && 'Same date each month'}
                    {formData.scheduleFrequency === RevenueScheduleFrequency.CUSTOM && 'Enter dates manually in table below'}
                    {mode === 'edit' && ' (Not editable in edit mode)'}
                  </small>
                </div>

                {/* Start Date */}
                <div className="form-group">
                  <label>
                    Start Date<span className="requiredTags"> *</span>
                  </label>
                  <input
                    type="date"
                    value={formData.scheduleStartDate || ''}
                    onChange={(e) => handleInputChange('scheduleStartDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={mode === 'edit'}
                    className={mode === 'edit' ? 'disabled-field' : ''}
                    required
                  />
                  {formData.scheduleStartDate && (
                    <small className="hint-message">
                      {formatDate(formData.scheduleStartDate)}
                    </small>
                  )}
                  <p className="add-error-message" style={{ marginTop: '0px' }}>{formErrors.scheduleStartDate}</p>
                </div>
              </div>

              {/* Number of Payments (hidden for custom) */}
              {formData.scheduleFrequency && formData.scheduleFrequency !== RevenueScheduleFrequency.CUSTOM && (
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Number of Payments<span className="requiredTags"> *</span>
                    </label>
                    <input
                      type="number"
                      value={formData.numberOfPayments || ''}
                      onChange={(e) => handleInputChange('numberOfPayments', parseInt(e.target.value) || 0)}
                      min="1"
                      max="100"
                      disabled={mode === 'edit'}
                      className={mode === 'edit' ? 'disabled-field' : ''}
                      required
                    />
                    <small className="hint-message">
                      {mode === 'edit' ? 'Not editable in edit mode' : 'Total installments: minimum 2, maximum 100'}
                    </small>
                    <p className="add-error-message">{formErrors.numberOfPayments}</p>
                  </div>
                  <div className="form-group">
                    <label>Estimated End Date</label>
                    <input
                      type="text"
                      value={
                        formData.scheduleFrequency &&
                          formData.scheduleStartDate &&
                          formData.numberOfPayments &&
                          formData.numberOfPayments > 0
                          ? formatDate(
                            generateScheduleDates(
                              formData.scheduleFrequency,
                              formData.scheduleStartDate,
                              formData.numberOfPayments
                            )[formData.numberOfPayments - 1] || ''
                          )
                          : 'N/A'
                      }
                      disabled
                      className="disabled-field"
                    />
                  </div>
                </div>
              )}

              {/* Payment Schedule Table */}
              {formData.scheduleFrequency && formData.amount > 0 && (
                <>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>Payment Schedule Preview</span>
                        {formData.scheduleFrequency !== RevenueScheduleFrequency.CUSTOM && mode === 'add' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.scheduleFrequency && formData.scheduleStartDate && formData.numberOfPayments) {
                                const dates = generateScheduleDates(
                                  formData.scheduleFrequency,
                                  formData.scheduleStartDate,
                                  formData.numberOfPayments
                                );
                                const items = generateScheduleItems(dates, formData.amount);
                                setScheduleItems(items);
                                setFormData(prev => ({ ...prev, scheduleItems: items }));
                              }
                            }}
                            className="modal-table-add-btn"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                          >
                            <i className="ri-restart-line"></i>
                            Reset
                          </button>
                        )}
                      </label>
                    </div>
                  </div>
                  <PaymentScheduleTable
                    scheduleItems={scheduleItems}
                    mode={mode === 'edit' ? 'edit' : 'add'}
                    onItemChange={(items) => {
                      setScheduleItems(items);
                      setFormData(prev => ({ ...prev, scheduleItems: items }));
                    }}
                    totalAmount={formData.amount}
                    isUnearnedRevenue={formData.isUnearnedRevenue}
                    frequency={formData.scheduleFrequency}
                  />

                  {/* Edit Mode Warnings */}
                  {mode === 'edit' && scheduleItems.length > 0 && (
                    <>
                      {scheduleItems.filter(item => !item.isEditable).length > 0 && (
                        <div style={{
                          marginTop: '10px',
                          padding: '12px',
                          backgroundColor: '#E3F2FD',
                          borderRadius: '6px',
                          border: '1px solid #90CAF9'
                        }}>
                          <i className="ri-information-line" style={{ color: '#1976D2', marginRight: '8px' }}></i>
                          <span style={{ color: '#1565C0', fontSize: '14px', fontWeight: '500' }}>
                            {scheduleItems.filter(item => !item.isEditable).length} installment(s) have been paid and cannot be modified
                          </span>
                        </div>
                      )}

                      {scheduleItems.some(item => item.paymentStatus === 'OVERDUE') && (
                        <div style={{
                          marginTop: '10px',
                          padding: '12px',
                          backgroundColor: '#FFEBEE',
                          borderRadius: '6px',
                          border: '1px solid #FFCDD2'
                        }}>
                          <i className="ri-alert-line" style={{ color: '#C62828', marginRight: '8px' }}></i>
                          <span style={{ color: '#B71C1C', fontSize: '14px', fontWeight: '500' }}>
                            Cannot save schedule with overdue payments - please resolve overdue installments first
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </form>
      </div>

      {/* III. Additional Information (Optional) */}
      <p className="details-title">III. Additional Information (Optional)</p>
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