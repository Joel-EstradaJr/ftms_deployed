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

// Payment method enum values (matching schema)
const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'E_WALLET', label: 'E-Wallet' },
  { value: 'REIMBURSEMENT', label: 'Reimbursement' },
];

interface RecordOperationalExpenseModalProps {
  mode: "add" | "edit" | "approve";
  existingData?: OperationalExpenseData | null;
  onSave: (formData: OperationalExpenseData, mode: "add" | "edit" | "approve") => void;
  onClose: () => void;
  departments: Array<{ id: number; name: string }>;
  cachedTrips: Array<{ 
    assignment_id: string;
    bus_trip_id: string;
    plate_number: string; 
    body_number: string;
    bus_type: string;
    bus_route: string; 
    date_assigned: string;
    departmentId: number;
    departmentName: string;
  }>;
  chartOfAccounts: Array<{ id: number; account_code: string; account_name: string }>;
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
  code: string;
  date_recorded: string;
  expense_type_name: string; // UI display for expense type
  amount: number;
  // Composite trip reference (replacing cachedTripId)
  bus_trip_assignment_id?: string;
  bus_trip_id?: string;
  plate_number?: string;
  bus_route?: string;
  department?: string;
  account_id?: number;
  payment_method: string; // enum value: CASH, BANK_TRANSFER, E_WALLET, REIMBURSEMENT
  is_reimbursable: boolean;
  description?: string;
  
  // Reimbursement fields (maps to payable)
  employee_reference?: string;
  creditor_name?: string;
  payable_description?: string;
  
  // View-only fields
  status?: string;
  created_by: string;
  approved_by?: string;
  created_at?: string;
  approved_at?: string;
}

interface FormErrors {
  date_recorded: string;
  expense_type_name: string;
  amount: string;
  bus_trip_assignment_id: string;
  account_id: string;
  payment_method: string;
  description: string;
  employee_reference: string;
  payable_description: string;
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
    code: existingData?.code || generateExpenseCode(),
    date_recorded: existingData?.date_recorded || new Date().toISOString().split('T')[0],
    expense_type_name: existingData?.expense_type_name || '',
    amount: existingData?.amount || 0,
    bus_trip_assignment_id: existingData?.bus_trip_assignment_id,
    bus_trip_id: existingData?.bus_trip_id,
    plate_number: existingData?.plate_number || '',
    bus_route: existingData?.bus_route || '',
    department: existingData?.department || '',
    account_id: existingData?.account_id,
    payment_method: existingData?.payment_method || '',
    is_reimbursable: existingData?.is_reimbursable || false,
    description: existingData?.description || '',
    employee_reference: existingData?.employee_reference || '',
    creditor_name: existingData?.creditor_name || '',
    payable_description: existingData?.payable_description || '',
    created_by: existingData?.created_by || currentUser,
  });

  const [errors, setErrors] = useState<FormErrors>({
    date_recorded: '',
    expense_type_name: '',
    amount: '',
    bus_trip_assignment_id: '',
    account_id: '',
    payment_method: '',
    description: '',
    employee_reference: '',
    payable_description: '',
  });

  const [touched, setTouched] = useState<Set<keyof FormErrors>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isTripSelectorOpen, setIsTripSelectorOpen] = useState(false);
  const [selectedTripDetails, setSelectedTripDetails] = useState({
    date_assigned: '',
    body_number: '',
    bus_type: '',
    bus_route: ''
  });

  // Handle trip selection from TripSelector modal - using composite key
  const handleTripSelect = (trip: any) => {
    setFormData(prev => ({
      ...prev,
      bus_trip_assignment_id: trip.assignment_id,
      bus_trip_id: trip.bus_trip_id,
      plate_number: trip.plate_number,
      bus_route: trip.bus_route,
      department: trip.departmentName,
    }));
    
    setSelectedTripDetails({
      date_assigned: trip.date_assigned || '',
      body_number: trip.body_number || '',
      bus_type: trip.bus_type || '',
      bus_route: trip.bus_route || ''
    });
  };

  // Validation function
  const validateFormField = (name: keyof FormErrors, value: any): string => {
    switch (name) {
      case 'date_recorded':
        if (!value) return 'Date is required';
        return '';
      
      case 'expense_type_name':
        if (!value) return 'Expense name is required';
        return '';
      
      case 'amount':
        if (!value || value <= 0) return 'Amount must be greater than 0';
        if (!isValidAmount(value.toString())) return 'Invalid amount format';
        return '';
      
      case 'payment_method':
        if (!value) return 'Payment method is required';
        return '';
      
      case 'description':
        if (value && value.length > 500) return 'Description must not exceed 500 characters';
        return '';
      
      case 'employee_reference':
        if (formData.is_reimbursable && !value) return 'Employee is required for reimbursable expenses';
        return '';
      
      case 'payable_description':
        if (formData.is_reimbursable && !value) return 'Purpose is required for reimbursable expenses';
        if (value && value.length > 500) return 'Purpose must not exceed 500 characters';
        return '';
      
      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      date_recorded: validateFormField('date_recorded', formData.date_recorded),
      expense_type_name: validateFormField('expense_type_name', formData.expense_type_name),
      amount: validateFormField('amount', formData.amount),
      bus_trip_assignment_id: '',
      account_id: '',
      payment_method: validateFormField('payment_method', formData.payment_method),
      description: validateFormField('description', formData.description),
      employee_reference: validateFormField('employee_reference', formData.employee_reference),
      payable_description: validateFormField('payable_description', formData.payable_description),
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

  // Get display text for selected trip
  const getTripDisplayText = () => {
    if (formData.bus_trip_assignment_id && formData.bus_trip_id) {
      return `${formData.plate_number} - ${formData.bus_route}`;
    }
    return '';
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
                  <label htmlFor="code" className="required">Expense Code</label>
                  <input
                    type="text"
                    id="code"
                    name="code"
                    value={formData.code}
                    disabled
                    className="input-disabled"
                  />
                  <small className="field-note">Auto-generated</small>
                </div>

                <div className="form-group">
                  <label htmlFor="date_recorded" className="required">Date Recorded</label>
                  <input
                    type="date"
                    id="date_recorded"
                    name="date_recorded"
                    value={formData.date_recorded}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={errors.date_recorded && touched.has('date_recorded') ? 'input-error' : ''}
                    required
                    disabled={mode === 'edit'}
                  />
                  {errors.date_recorded && touched.has('date_recorded') && (
                    <span className="error-message">{errors.date_recorded}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expense_type_name" className="required">Expense Name</label>
                  <CustomDropdown
                    options={EXPENSE_CATEGORIES}
                    value={formData.expense_type_name}
                    onChange={(value: string) => {
                      setFormData(prev => ({ ...prev, expense_type_name: value }));
                      if (touched.has('expense_type_name')) {
                        setErrors(prev => ({
                          ...prev,
                          expense_type_name: validateFormField('expense_type_name', value)
                        }));
                      }
                    }}
                    onBlur={() => {
                      setTouched(prev => new Set(prev).add('expense_type_name'));
                      setErrors(prev => ({
                        ...prev,
                        expense_type_name: validateFormField('expense_type_name', formData.expense_type_name)
                      }));
                    }}
                    placeholder="Select or enter expense"
                    className={errors.expense_type_name && touched.has('expense_type_name') ? 'input-error' : ''}
                    showDescription={false}
                    allowCustomInput={true}
                  />
                  {errors.expense_type_name && touched.has('expense_type_name') && (
                    <span className="error-message">{errors.expense_type_name}</span>
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
                  <label htmlFor="payment_method" className="required">Payment Method</label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={errors.payment_method && touched.has('payment_method') ? 'input-error' : ''}
                    required
                  >
                    <option value="">Select Payment Method</option>
                    {PAYMENT_METHOD_OPTIONS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                  {errors.payment_method && touched.has('payment_method') && (
                    <span className="error-message">{errors.payment_method}</span>
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
                  <label htmlFor="bus_trip_assignment_id">Trip Assignment <span className="requiredTags"> *</span></label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      id="bus_trip_assignment_id"
                      value={getTripDisplayText()}
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
                  <label htmlFor="plate_number">Plate Number</label>
                  <input
                    type="text"
                    id="plate_number"
                    name="plate_number"
                    value={formData.plate_number || ''}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="body_number">Body Number</label>
                  <input
                    type="text"
                    id="body_number"
                    name="body_number"
                    value={selectedTripDetails.body_number || ''} 
                    disabled
                    className="input-disabled"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bus_route">Route</label>
                  <input
                    type="text"
                    id="bus_route"
                    name="bus_route"
                    value={formData.bus_route || ''}
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bus_type">Type</label>
                  <input
                    type="text"
                    id="bus_type"
                    name="bus_type"
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
                  <label htmlFor="account_id">Accounting Code<span className="requiredTags"> *</span></label>
                  <select
                    id="account_id"
                    name="account_id"
                    value={formData.account_id || ''}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Account Code</option>
                    {chartOfAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </option>
                    ))}
                  </select>
                  <small className="field-note">Pre-select when Expense Name is selected, but still editable</small>
                </div>

                <div className="form-group">
                  <label htmlFor="is_reimbursable">Reimbursable Expense</label>
                  <div className="checkbox-wrapper">
                    {/* <div className="checkbox-label"> */}
                      <input
                        type="checkbox"
                        id="is_reimbursable"
                        name="is_reimbursable"
                        checked={formData.is_reimbursable}
                        onChange={handleInputChange}
                      />
                    {/* </div> */}

                    {/* <div className="checkbox-label"> */}
                      <label htmlFor="is_reimbursable">
                        This expense is reimbursable to an employee
                      </label>
                    {/* </div> */}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conditional Section: Reimbursement Details */}
          {formData.is_reimbursable && (
            <div className="modal-content">
              <div className="form-section reimbursement-section">
                <h3 className="section-title">III-A. Reimbursement Details</h3>
                <small className="section-note">Specify who will be reimbursed for this expense</small>
                <br/>
                <br/>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="employee_reference" className="required">Employee to Reimburse</label>
                    <SearchableDropdown
                      options={employees.map(emp => ({
                        value: emp.employee_number,
                        label: `${emp.employee_number} - ${emp.name}`,
                        description: `${emp.job_title} | ${emp.department}`
                      }))}
                      value={formData.employee_reference || ''}
                      onChange={(value) => {
                        // Find employee to also set creditor_name
                        const selectedEmployee = employees.find(e => e.employee_number === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          employee_reference: value,
                          creditor_name: selectedEmployee?.name || ''
                        }));
                        if (touched.has('employee_reference')) {
                          setErrors(prev => ({
                            ...prev,
                            employee_reference: validateFormField('employee_reference', value)
                          }));
                        }
                      }}
                      onBlur={() => {
                        setTouched(prev => new Set(prev).add('employee_reference'));
                        setErrors(prev => ({
                          ...prev,
                          employee_reference: validateFormField('employee_reference', formData.employee_reference)
                        }));
                      }}
                      placeholder="Select Employee"
                      className={errors.employee_reference && touched.has('employee_reference') ? 'input-error' : ''}
                      showDescription={true}
                    />
                    <small className="field-note">Searchable Dropdown - No Custom Input</small>
                    {errors.employee_reference && touched.has('employee_reference') && (
                      <span className="error-message">{errors.employee_reference}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="payable_description" className="required">Purpose of Reimbursement</label>
                    <textarea
                      id="payable_description"
                      name="payable_description"
                      value={formData.payable_description || ''}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      placeholder="Describe the purpose and reason for this reimbursement"
                      rows={3}
                      maxLength={500}
                      className={errors.payable_description && touched.has('payable_description') ? 'input-error' : ''}
                      required
                    />
                    <div className="textarea-footer">
                      <span className="hint-message">
                        {formData.payable_description?.length || 0}/500 characters
                      </span>
                      {errors.payable_description && touched.has('payable_description') && (
                        <span className="error-message"><br/>{errors.payable_description}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="info-box">
                  <i className="ri-information-line"></i>
                  <span>The reimbursement amount will be automatically set to match the expense amount ({formatMoney(formData.amount)}). Attachments can be uploaded after saving the expense.</span>
                </div>
              </div>
            </div>
          )}

          <div className="modal-content">
            {/* Section IV: Additional Information */}
            <div className="form-section">
              <h3 className="section-title">IV. Additional Information</h3>
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder="Additional notes or comments about this expense"
                    rows={4}
                    maxLength={500}
                    className={errors.description && touched.has('description') ? 'input-error' : ''}
                  />
                  <div className="textarea-footer">
                    <span className="character-count">
                      {formData.description?.length || 0}/500 characters
                    </span>
                    {errors.description && touched.has('description') && (
                      <span className="error-message">{errors.description}</span>
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
