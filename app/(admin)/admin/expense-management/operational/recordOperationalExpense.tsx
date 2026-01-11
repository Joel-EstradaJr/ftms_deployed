"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import "@/styles/expense-management/operational.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { showWarning, showError, showConfirmation } from "@/utils/Alerts";
import { isValidAmount } from "@/utils/validation";
import SearchableDropdown, { DropdownOption } from "@/Components/SearchableDropdown";
import CustomDropdown from "@/Components/CustomDropdown";
import TripSelectorModal from '@/Components/TripSelector';

interface RecordOperationalExpenseModalProps {
  mode: "add" | "edit" | "approve";
  existingData?: OperationalExpenseData | null;
  onSave: (formData: OperationalExpenseData, mode: "add" | "edit" | "approve") => void;
  onClose: () => void;
  paymentMethods: Array<{ id: number; methodName: string; methodCode: string }>;
  departments: Array<{ id: number; name: string }>;
  cachedTrips: Array<{ 
    id: number; 
    busPlateNumber: string; 
    body_number: string;
    bus_type: string;
    route: string; 
    date_assigned: string;
    departmentId: number;
    departmentName: string;
  }>;
  chartOfAccounts: Array<{ id: number; accountCode: string; accountName: string }>;
  employees: Array<{ 
    employee_id: string; 
    name: string; 
    job_title: string; 
    department: string;
    employee_number: string;
  }>;
  currentUser: string;
}

export interface OperationalExpenseData {
  id?: number;
  expenseCode: string;
  dateRecorded: string;
  expenseCategory: string;
  expenseSubcategory?: string;
  amount: number;
  cachedTripId?: number;
  busPlateNumber?: string;
  route?: string;
  department?: string;
  receiptFile?: File | null;
  receiptUrl?: string;
  accountCodeId?: number;
  paymentMethodId: number;
  isReimbursable: boolean;
  remarks?: string;
  
  // Reimbursement fields
  reimbursementEmployeeId?: string;
  reimbursementPurpose?: string;
  reimbursementReceiptFile?: File | null;
  reimbursementReceiptUrl?: string;
  
  // View-only fields
  status?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt?: string;
  approvedAt?: string;
}

interface FormErrors {
  dateRecorded: string;
  expenseCategory: string;
  expenseSubcategory: string;
  amount: string;
  cachedTripId: string;
  receiptFile: string;
  accountCodeId: string;
  paymentMethodId: string;
  remarks: string;
  reimbursementEmployeeId: string;
  reimbursementPurpose: string;
  reimbursementReceiptFile: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'FUEL', label: 'Fuel' },
  { value: 'TOLLS', label: 'Tolls' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'ALLOWANCES', label: 'Allowances' },
  { value: 'PETTY_CASH', label: 'Petty Cash' },
  { value: 'VIOLATIONS', label: 'Violations' },
  { value: 'TERMINAL_FEES', label: 'Terminal Fees' },
];

export default function RecordOperationalExpenseModal({ 
  mode, 
  existingData, 
  onSave, 
  onClose, 
  paymentMethods,
  departments,
  cachedTrips,
  chartOfAccounts,
  employees = [],
  currentUser 
}: RecordOperationalExpenseModalProps) {
  
  // Generate expense code for new records
  const generateExpenseCode = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `EXP-OP-${timestamp}-${random}`.toUpperCase();
  };

  const [formData, setFormData] = useState<OperationalExpenseData>({
    id: existingData?.id,
    expenseCode: existingData?.expenseCode || generateExpenseCode(),
    dateRecorded: existingData?.dateRecorded || new Date().toISOString().split('T')[0],
    expenseCategory: existingData?.expenseCategory || '',
    expenseSubcategory: existingData?.expenseSubcategory || '',
    amount: existingData?.amount || 0,
    cachedTripId: existingData?.cachedTripId,
    busPlateNumber: existingData?.busPlateNumber || '',
    route: existingData?.route || '',
    department: existingData?.department || '',
    receiptFile: null,
    receiptUrl: existingData?.receiptUrl || '',
    accountCodeId: existingData?.accountCodeId,
    paymentMethodId: existingData?.paymentMethodId || 0,
    isReimbursable: existingData?.isReimbursable || false,
    remarks: existingData?.remarks || '',
    reimbursementEmployeeId: existingData?.reimbursementEmployeeId || '',
    reimbursementPurpose: existingData?.reimbursementPurpose || '',
    reimbursementReceiptFile: null,
    reimbursementReceiptUrl: existingData?.reimbursementReceiptUrl || '',
    createdBy: existingData?.createdBy || currentUser,
  });

  const [errors, setErrors] = useState<FormErrors>({
    dateRecorded: '',
    expenseCategory: '',
    expenseSubcategory: '',
    amount: '',
    cachedTripId: '',
    receiptFile: '',
    accountCodeId: '',
    paymentMethodId: '',
    remarks: '',
    reimbursementEmployeeId: '',
    reimbursementPurpose: '',
    reimbursementReceiptFile: '',
  });

  const [touched, setTouched] = useState<Set<keyof FormErrors>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isTripSelectorOpen, setIsTripSelectorOpen] = useState(false);
  const [selectedTripDetails, setSelectedTripDetails] = useState({
    date_assigned: '',
    body_number: '',
    bus_type: '',
    route: ''
  });

  // Handle trip selection from TripSelector modal
  const handleTripSelect = (trip: any) => {
    setFormData(prev => ({
      ...prev,
      cachedTripId: trip.id,
      busPlateNumber: trip.busPlateNumber,
      route: trip.route,
      department: trip.departmentName,
    }));
    
    setSelectedTripDetails({
      date_assigned: trip.date_assigned || '',
      body_number: trip.body_number || '',
      bus_type: trip.bus_type || '',
      route: trip.route || ''
    });
  };

  // Validation function
  const validateFormField = (name: keyof FormErrors, value: any): string => {
    switch (name) {
      case 'dateRecorded':
        if (!value) return 'Date is required';
        return '';
      
      case 'expenseCategory':
        if (!value) return 'Expense name is required';
        return '';
      
      case 'amount':
        if (!value || value <= 0) return 'Amount must be greater than 0';
        if (!isValidAmount(value.toString())) return 'Invalid amount format';
        return '';
      
      case 'paymentMethodId':
        if (!value || value === 0) return 'Payment method is required';
        return '';
      
      case 'remarks':
        if (value && value.length > 500) return 'Remarks must not exceed 500 characters';
        return '';
      
      case 'reimbursementEmployeeId':
        if (formData.isReimbursable && !value) return 'Employee is required for reimbursable expenses';
        return '';
      
      case 'reimbursementPurpose':
        if (formData.isReimbursable && !value) return 'Purpose is required for reimbursable expenses';
        if (value && value.length > 500) return 'Purpose must not exceed 500 characters';
        return '';
      
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      dateRecorded: validateFormField('dateRecorded', formData.dateRecorded),
      expenseCategory: validateFormField('expenseCategory', formData.expenseCategory),
      expenseSubcategory: '',
      amount: validateFormField('amount', formData.amount),
      cachedTripId: '',
      receiptFile: '',
      accountCodeId: '',
      paymentMethodId: validateFormField('paymentMethodId', formData.paymentMethodId),
      remarks: validateFormField('remarks', formData.remarks),
      reimbursementEmployeeId: validateFormField('reimbursementEmployeeId', formData.reimbursementEmployeeId),
      reimbursementPurpose: validateFormField('reimbursementPurpose', formData.reimbursementPurpose),
      reimbursementReceiptFile: '',
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = value === '' ? 0 : parseFloat(value);
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear error when user starts typing
    if (touched.has(name as keyof FormErrors)) {
      setErrors(prev => ({
        ...prev,
        [name]: validateFormField(name as keyof FormErrors, processedValue)
      }));
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched(prev => new Set(prev).add(name as keyof FormErrors));
    setErrors(prev => ({
      ...prev,
      [name]: validateFormField(name as keyof FormErrors, value)
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const fieldName = e.target.name;
    
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: 'Only JPG, PNG, and PDF files are allowed'
        }));
        return;
      }

      if (file.size > maxSize) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: 'File size must not exceed 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));

      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      await showWarning('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    const confirmed = await showConfirmation(
      `${mode === 'add' ? 'Record' : 'Update'} Operational Expense`,
      `Are you sure you want to ${mode === 'add' ? 'record' : 'update'} this operational expense?`
    );

    if (confirmed) {
      setIsSaving(true);
      try {
        onSave(formData, mode);
      } catch (error) {
        console.error('Error saving operational expense:', error);
        await showError('Error', 'Failed to save operational expense. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = async () => {
    const confirmed = await showConfirmation(
      'Cancel',
      'Are you sure you want to cancel? Any unsaved changes will be lost.'
    );
    if (confirmed) {
      onClose();
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">{mode === 'add' ? 'Record Operational Expense' : mode === 'approve' ? 'Approve Operational Expense' : 'Edit Operational Expense'}</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>

        <button className="close-modal-btn" onClick={onClose} aria-label="Close modal">
          <i className="ri-close-line"></i>
        </button>
      </div>

      <div className="modal-body">
        <form className="expense-form">
          <div className="modal-content">
            {/* Section I: Basic Expense Information */}
            <div className="form-section">
              <h3 className="section-title">I. Basic Expense Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expenseCode" className="required">Expense Code</label>
                  <input
                    type="text"
                    id="expenseCode"
                    name="expenseCode"
                    value={formData.expenseCode}
                    disabled
                    className="input-disabled"
                  />
                  <small className="field-note">Auto-generated</small>
                </div>

                <div className="form-group">
                  <label htmlFor="dateRecorded" className="required">Date Recorded</label>
                  <input
                    type="date"
                    id="dateRecorded"
                    name="dateRecorded"
                    value={formData.dateRecorded}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={errors.dateRecorded && touched.has('dateRecorded') ? 'input-error' : ''}
                    required
                    disabled={mode === 'edit'}
                  />
                  {errors.dateRecorded && touched.has('dateRecorded') && (
                    <span className="error-message">{errors.dateRecorded}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expenseCategory" className="required">Expense Name</label>
                  <CustomDropdown
                    options={EXPENSE_CATEGORIES}
                    value={formData.expenseCategory}
                    onChange={(value: string) => {
                      setFormData(prev => ({ ...prev, expenseCategory: value }));
                      if (touched.has('expenseCategory')) {
                        setErrors(prev => ({
                          ...prev,
                          expenseCategory: validateFormField('expenseCategory', value)
                        }));
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => new Set(prev).add('expenseCategory'));
                      setErrors(prev => ({
                        ...prev,
                        expenseCategory: validateFormField('expenseCategory', formData.expenseCategory)
                      }));
                    }}
                    placeholder="Select or enter expense"
                    className={errors.expenseCategory && touched.has('expenseCategory') ? 'input-error' : ''}
                    showDescription={false}
                    allowCustomInput={true}
                  />
                  {errors.expenseCategory && touched.has('expenseCategory') && (
                    <span className="error-message">{errors.expenseCategory}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="amount" className="required">Amount (₱)</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={errors.amount && touched.has('amount') ? 'input-error' : ''}
                    step="0.01"
                    min="0"
                    required
                    disabled
                  />
                  {errors.amount && touched.has('amount') && (
                    <span className="error-message">{errors.amount}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="paymentMethodId" className="required">Payment Method</label>
                  <select
                    id="paymentMethodId"
                    name="paymentMethodId"
                    value={formData.paymentMethodId}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={errors.paymentMethodId && touched.has('paymentMethodId') ? 'input-error' : ''}
                    required
                  >
                    <option value="">Select Payment Method</option>
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>
                        {method.methodName} ({method.methodCode})
                      </option>
                    ))}
                  </select>
                  {errors.paymentMethodId && touched.has('paymentMethodId') && (
                    <span className="error-message">{errors.paymentMethodId}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-content">
            {/* Section II: Trip Assignment Details */}
            <div className="form-section">
              <h3 className="section-title">II. Trip Assignment Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cachedTripId">Trip Assignment <span className="requiredTags"> *</span></label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      id="cachedTripId"
                      value={formData.cachedTripId ? `Trip #${formData.cachedTripId} - ${formData.busPlateNumber} (${formData.route})` : ''}
                      placeholder="No trip selected"
                      disabled
                      className="input-disabled"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsTripSelectorOpen(true)}
                      className="submit-btn"
                      style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
                      disabled={mode === 'edit'}
                    >
                      <i className="ri-search-line"></i> Select Trip
                    </button>
                  </div>
                  <small className="field-note">Trip Selector returns: Date Assigned, Body Number, Type, Route</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="busPlateNumber">Plate Number</label>
                  <input
                    type="text"
                    id="busPlateNumber"
                    name="busPlateNumber"
                    value={formData.busPlateNumber || ''}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bodyNumber">Body Number</label>
                  <input
                    type="text"
                    id="bodyNumber"
                    name="bodyNumber"
                    value={selectedTripDetails.body_number || ''} 
                    disabled
                    className="input-disabled"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="route">Route</label>
                  <input
                    type="text"
                    id="route"
                    name="route"
                    value={formData.route || ''}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="busType">Type</label>
                  <input
                    type="text"
                    id="busType"
                    name="busType"
                    value={selectedTripDetails.bus_type || ''}
                    disabled
                    className="input-disabled"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-content">
            {/* Section III: Accounting Details */}
            <div className="form-section">
              <h3 className="section-title">III. Accounting Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="accountCodeId">Accounting Code<span className="requiredTags"> *</span></label>
                  <select
                    id="accountCodeId"
                    name="accountCodeId"
                    value={formData.accountCodeId || ''}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Account Code</option>
                    {chartOfAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountCode} - {account.accountName}
                      </option>
                    ))}
                  </select>
                  <small className="field-note">Pre-select when Expense Name is selected, but still editable</small>
                </div>

                <div className="form-group">
                  <label htmlFor="isReimbursable">Reimbursable Expense</label>
                  <div className="checkbox-wrapper">
                    {/* <div className="checkbox-label"> */}
                      <input
                        type="checkbox"
                        id="isReimbursable"
                        name="isReimbursable"
                        checked={formData.isReimbursable}
                        onChange={handleInputChange}
                      />
                    {/* </div> */}

                    {/* <div className="checkbox-label"> */}
                      <label htmlFor="isReimbursable">
                        This expense is reimbursable to an employee
                      </label>
                    {/* </div> */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Section: Reimbursement Details */}
          {formData.isReimbursable && (
            <div className="modal-content">
              <div className="form-section reimbursement-section">
                <h3 className="section-title">III-A. Reimbursement Details</h3>
                <small className="section-note">Specify who will be reimbursed for this expense</small>
                <br/>
                <br/>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="reimbursementEmployeeId" className="required">Employee to Reimburse</label>
                    <SearchableDropdown
                      options={employees.map(emp => ({
                        value: emp.employee_id,
                        label: `${emp.employee_number} - ${emp.name}`,
                        description: `${emp.job_title} | ${emp.department}`
                      }))}
                      value={formData.reimbursementEmployeeId || ''}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, reimbursementEmployeeId: value }));
                        if (touched.has('reimbursementEmployeeId')) {
                          setErrors(prev => ({
                            ...prev,
                            reimbursementEmployeeId: validateFormField('reimbursementEmployeeId', value)
                          }));
                        }
                      }}
                      onBlur={() => {
                        setTouched(prev => new Set(prev).add('reimbursementEmployeeId'));
                        setErrors(prev => ({
                          ...prev,
                          reimbursementEmployeeId: validateFormField('reimbursementEmployeeId', formData.reimbursementEmployeeId)
                        }));
                      }}
                      placeholder="Select Employee"
                      className={errors.reimbursementEmployeeId && touched.has('reimbursementEmployeeId') ? 'input-error' : ''}
                      showDescription={true}
                    />
                    <small className="field-note">Searchable Dropdown - No Custom Input</small>
                    {errors.reimbursementEmployeeId && touched.has('reimbursementEmployeeId') && (
                      <span className="error-message">{errors.reimbursementEmployeeId}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="reimbursementPurpose" className="required">Purpose of Reimbursement</label>
                    <textarea
                      id="reimbursementPurpose"
                      name="reimbursementPurpose"
                      value={formData.reimbursementPurpose || ''}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      placeholder="Describe the purpose and reason for this reimbursement"
                      rows={3}
                      maxLength={500}
                      className={errors.reimbursementPurpose && touched.has('reimbursementPurpose') ? 'input-error' : ''}
                      required
                    />
                    <div className="textarea-footer">
                      <span className="hint-message">
                        {formData.reimbursementPurpose?.length || 0}/500 characters
                      </span>
                      {errors.reimbursementPurpose && touched.has('reimbursementPurpose') && (
                        <span className="error-message"><br/>{errors.reimbursementPurpose}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="reimbursementReceiptFile">Upload Supporting Document</label>
                    <input
                      type="file"
                      id="reimbursementReceiptFile"
                      name="reimbursementReceiptFile"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      style={{ cursor: 'pointer' }}
                    />
                    <small className="hint-message">Upload proof of payment or supporting document (JPG, PNG, PDF - Max 5MB)</small>
                    {errors.reimbursementReceiptFile && (
                      <span className="error-message">{errors.reimbursementReceiptFile}</span>
                    )}
                    {formData.reimbursementReceiptUrl && (
                      <div className="file-preview">
                        <i className="ri-file-text-line"></i>
                        <a href={formData.reimbursementReceiptUrl} target="_blank" rel="noopener noreferrer">
                          View Current Document
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="info-box">
                  <i className="ri-information-line"></i>
                  <span>The reimbursement amount will be automatically set to match the expense amount ({formatMoney(formData.amount)})</span>
                </div>
              </div>
            </div>
          )}

          <div className="modal-content">
            {/* Section IV: Supporting Documents */}
            <div className="form-section">
              <h3 className="section-title">IV. Supporting Documents</h3>
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="receiptFile">Upload Receipt</label>
                  <input
                    type="file"
                    id="receiptFile"
                    name="receiptFile"
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    style={{ cursor: 'pointer' }}
                  />
                  <small className="field-note">Accepted formats: JPG, PNG, PDF (Max 5MB)</small>
                  {errors.receiptFile && (
                    <span className="error-message">{errors.receiptFile}</span>
                  )}
                  {formData.receiptUrl && (
                    <div className="file-preview">
                      <i className="ri-file-text-line"></i>
                      <a href={formData.receiptUrl} target="_blank" rel="noopener noreferrer">
                        View Current Receipt
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-content">
            {/* Section V: Additional Information */}
            <div className="form-section">
              <h3 className="section-title">V. Additional Information</h3>
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="remarks">Description</label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    value={formData.remarks || ''}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder="Additional notes or comments about this expense"
                    rows={4}
                    maxLength={500}
                    className={errors.remarks && touched.has('remarks') ? 'input-error' : ''}
                  />
                  <div className="textarea-footer">
                    <span className="character-count">
                      {formData.remarks?.length || 0}/500 characters
                    </span>
                    {errors.remarks && touched.has('remarks') && (
                      <span className="error-message">{errors.remarks}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="modal-actions">
        <button 
          className="cancel-btn" 
          onClick={handleCancel}
          disabled={isSaving}
        >
          <i className="ri-close-line"></i>
          Cancel
        </button>
        <button 
          className="submit-btn" 
          onClick={handleSubmit}
          disabled={isSaving}
        >
          <i className={`ri-${isSaving ? 'loader-4-line spin' : 'save-line'}`}></i>
          {isSaving ? 'Saving...' : (mode === 'add' ? 'Record Expense' : mode === 'approve' ? 'Approve & Record' : 'Update Expense')}
        </button>
      </div>

      {/* Trip Selector Modal */}
      <TripSelectorModal
        isOpen={isTripSelectorOpen}
        onClose={() => setIsTripSelectorOpen(false)}
        onSelect={handleTripSelect}
        trips={cachedTrips}
      />
    </>
  );
}
