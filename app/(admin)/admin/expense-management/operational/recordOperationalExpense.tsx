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
import PaymentScheduleTable from '@/Components/PaymentScheduleTable';
import { ScheduleFrequency, PaymentStatus, ScheduleItem } from '@/app/types/schedule';
import { generateScheduleDates, distributeAmount } from '@/app/utils/scheduleCalculations';

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
    driver_id?: string | null;
    driver_name?: string | null;
    conductor_id?: string | null;
    conductor_name?: string | null;
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

  // Crew details for fallback display
  driver_name?: string;
  conductor_name?: string;
  driver_id?: string;
  conductor_id?: string;

  // Additional trip details for edit mode display
  body_number?: string;
  bus_type?: string;
  date_assigned?: string;

  // View-only fields
  approval_status?: string;
  created_by: string;
  approved_by?: string;
  created_at?: string;
  approved_at?: string;

  // Reimbursement Schedule fields
  scheduleFrequency?: ScheduleFrequency;
  scheduleStartDate?: string;
  numberOfPayments?: number;
  scheduleItems?: ScheduleItem[];
  
  // Driver and Conductor installment details (for edit mode with reimbursement split)
  driverInstallments?: {
    employee_name: string;
    employee_number: string;
    total_share: number;
    paid_amount: number;
    balance: number;
    status: string;
    installments: ScheduleItem[];
  };
  conductorInstallments?: {
    employee_name: string;
    employee_number: string;
    total_share: number;
    paid_amount: number;
    balance: number;
    status: string;
    installments: ScheduleItem[];
  };
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
  scheduleStartDate: string;
  numberOfPayments: string;
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

    // Trip fields
    body_number: existingData?.body_number || '',
    bus_type: existingData?.bus_type || '',
    date_assigned: existingData?.date_assigned || '',

    // Crew details for fallback display
    driver_id: existingData?.driver_id || '',
    driver_name: existingData?.driver_name || '',
    conductor_id: existingData?.conductor_id || '',
    conductor_name: existingData?.conductor_name || '',

    // Reimbursement Schedule fields
    scheduleFrequency: existingData?.scheduleFrequency,
    scheduleStartDate: existingData?.scheduleStartDate || '',
    numberOfPayments: existingData?.numberOfPayments || 2,
    scheduleItems: existingData?.scheduleItems || [],

    // Driver and Conductor installment details (for edit mode with reimbursement split)
    driverInstallments: existingData?.driverInstallments,
    conductorInstallments: existingData?.conductorInstallments,
  });

  // Debug: Log existingData when modal opens in edit mode
  useEffect(() => {
    if (mode === 'edit' && existingData) {
      console.log('RecordOperationalExpenseModal - existingData received:', existingData);
      console.log('RecordOperationalExpenseModal - driverInstallments:', existingData.driverInstallments);
      console.log('RecordOperationalExpenseModal - conductorInstallments:', existingData.conductorInstallments);
    }
  }, [mode, existingData]);

  // Schedule items state for reimbursement
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(existingData?.scheduleItems || []);

  // Effect to initialize selectedTripDetails when in edit mode
  useEffect(() => {
    if (existingData) {
      setSelectedTripDetails({
        date_assigned: existingData.date_assigned || '',
        body_number: existingData.body_number || '',
        bus_type: existingData.bus_type || '',
        bus_route: existingData.bus_route || ''
      });
    }
  }, [existingData]);

  // Effect to generate schedule items when schedule parameters change
  useEffect(() => {
    if (
      formData.is_reimbursable &&
      formData.scheduleFrequency &&
      formData.scheduleFrequency !== 'CUSTOM' as any &&
      formData.scheduleStartDate &&
      formData.numberOfPayments &&
      formData.numberOfPayments >= 2 &&
      formData.amount > 0
    ) {
      const dates = generateScheduleDates(
        formData.scheduleFrequency,
        formData.scheduleStartDate,
        formData.numberOfPayments
      );

      const newItems: ScheduleItem[] = dates.map((date, index) => ({
        id: `temp-${index}`,
        installment_number: index + 1,
        due_date: date,
        amount_due: 0,
        amount_paid: 0,
        balance: 0,
        status: PaymentStatus.PENDING,
      }));

      const distributedItems = distributeAmount(formData.amount, newItems);
      setScheduleItems(distributedItems);
      setFormData(prev => ({ ...prev, scheduleItems: distributedItems }));
    } else if (!formData.is_reimbursable) {
      // Clear schedule items if reimbursable is unchecked
      setScheduleItems([]);
      setFormData(prev => ({ ...prev, scheduleItems: [] }));
    }
  }, [
    formData.is_reimbursable,
    formData.scheduleFrequency,
    formData.scheduleStartDate,
    formData.numberOfPayments,
    formData.amount
  ]);

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
    scheduleStartDate: '',
    numberOfPayments: '',
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
      payable_description: '',
      scheduleStartDate: '',
      numberOfPayments: '',
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
                    disabled={mode === 'edit'}
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
                    disabled={mode === 'edit'}
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
            <div className="form-section">
              <h3 className="section-title">III. Reimbursable Settings</h3>
              <div className="form-row">
                <div className="form-group">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="is_reimbursable"
                      name="is_reimbursable"
                      checked={formData.is_reimbursable}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="is_reimbursable">
                      This expense is reimbursable to an employee
                    </label>
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
                <br />
                <br />

                {/* Show driver/conductor options if trip is selected OR if we have crew data from edit mode */}
                {(formData.bus_trip_assignment_id || formData.driver_id || formData.conductor_id || formData.employee_reference) ? (
                  // If trip selected or crew data exists, show Driver/Conductor options
                  (() => {
                    const trip = cachedTrips.find(t => t.assignment_id === formData.bus_trip_assignment_id);

                    // Use trip details if available, otherwise fallback to formData (for Edit mode)
                    const driverId = trip?.driver_id || formData.driver_id;
                    const driverName = trip?.driver_name || formData.driver_name;
                    const conductorId = trip?.conductor_id || formData.conductor_id;
                    const conductorName = trip?.conductor_name || formData.conductor_name;

                    return (
                      <div className="form-row">
                        <div className="form-group full-width">
                          <label className="required">Employee to Reimburse</label>
                          <div className="reimburse-options" style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                            {driverId && (
                              <div
                                className={`option-card ${formData.employee_reference === driverId ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    employee_reference: driverId,
                                    creditor_name: driverName || ''
                                  }));
                                }}
                                style={{
                                  padding: '15px',
                                  border: formData.employee_reference === driverId ? '2px solid #007bff' : '1px solid #ddd',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  backgroundColor: formData.employee_reference === driverId ? '#f0f7ff' : '#fff'
                                }}
                              >
                                <strong>Driver:</strong> {driverName} <br />
                                <small>{driverId}</small>
                              </div>
                            )}
                            {conductorId && (
                              <div
                                className={`option-card ${formData.employee_reference === conductorId ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    employee_reference: conductorId,
                                    creditor_name: conductorName || ''
                                  }));
                                }}
                                style={{
                                  padding: '15px',
                                  border: formData.employee_reference === conductorId ? '2px solid #007bff' : '1px solid #ddd',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  backgroundColor: formData.employee_reference === conductorId ? '#f0f7ff' : '#fff'
                                }}
                              >
                                <strong>Conductor:</strong> {conductorName} <br />
                                <small>{conductorId}</small>
                              </div>
                            )}
                            {/* In edit mode, show selected employee even if no driver/conductor cards */}
                            {(!driverId && !conductorId && formData.employee_reference) && (
                              <div
                                className="option-card selected"
                                style={{
                                  padding: '15px',
                                  border: '2px solid #007bff',
                                  borderRadius: '8px',
                                  backgroundColor: '#f0f7ff'
                                }}
                              >
                                <strong>Selected Employee:</strong> {formData.creditor_name || formData.employee_reference} <br />
                                <small>{formData.employee_reference}</small>
                              </div>
                            )}
                            {(!driverId && !conductorId && !formData.employee_reference) && (
                              <p className="error-text">No crew details found for this trip.</p>
                            )}
                          </div>
                          {errors.employee_reference && touched.has('employee_reference') && (
                            <span className="error-message">{errors.employee_reference}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="hint-message">Select a trip to specify the employee to reimburse.</p>
                )}

                <div className="info-box">
                  <i className="ri-information-line"></i>
                  <span>The reimbursement amount will be automatically set to match the expense amount ({formatMoney(formData.amount)}). Attachments can be uploaded after saving the expense.</span>
                </div>

                {/* Display Driver/Conductor Installments in Edit Mode */}
                {mode === 'edit' && formData.is_reimbursable && (formData.driverInstallments || formData.conductorInstallments) ? (
                  <>
                    {/* Conductor Installment Schedule */}
                    {formData.conductorInstallments && (
                      <>
                        <p className="details-subtitle">Conductor Installment Schedule</p>
                        <div className="modal-content view">
                          <div className="installment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '12px' }}>
                            <strong>{formData.conductorInstallments.employee_name}</strong>
                            <strong>Total: {formatMoney(formData.conductorInstallments.total_share)}</strong>
                          </div>
                          <PaymentScheduleTable
                            scheduleItems={formData.conductorInstallments.installments}
                            mode="view"
                            totalAmount={formData.conductorInstallments.total_share}
                            isUnearnedRevenue={true}
                          />
                        </div>
                      </>
                    )}

                    {/* Driver Installment Schedule */}
                    {formData.driverInstallments && (
                      <>
                        <p className="details-subtitle">Driver Installment Schedule</p>
                        <div className="modal-content view">
                          <div className="installment-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '12px' }}>
                            <strong>{formData.driverInstallments.employee_name}</strong>
                            <strong>Total: {formatMoney(formData.driverInstallments.total_share)}</strong>
                          </div>
                          <PaymentScheduleTable
                            scheduleItems={formData.driverInstallments.installments}
                            mode="view"
                            totalAmount={formData.driverInstallments.total_share}
                            isUnearnedRevenue={true}
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  /* Show Schedule Form for Add Mode or Edit Mode without installments */
                  (formData.employee_reference || (mode === 'edit' && formData.is_reimbursable)) && (
                    <>
                      <div className="form-row" style={{ marginTop: '20px' }}>
                      <div className="form-group">
                        <label>
                          Schedule Frequency<span className="requiredTags"> *</span>
                        </label>
                        <select
                          value={formData.scheduleFrequency || ''}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              scheduleFrequency: e.target.value as ScheduleFrequency
                            }));
                          }}
                          disabled={mode === 'edit' && existingData?.approval_status !== 'PENDING'}
                        >
                          <option value="">Select Frequency</option>
                          <option value={ScheduleFrequency.DAILY}>Daily</option>
                          <option value={ScheduleFrequency.WEEKLY}>Weekly</option>
                          <option value={ScheduleFrequency.BIWEEKLY}>Bi-Weekly</option>
                          <option value={ScheduleFrequency.MONTHLY}>Monthly</option>
                        </select>
                        <small className="hint-message">
                          {formData.scheduleFrequency === ScheduleFrequency.DAILY && 'Consecutive daily payments'}
                          {formData.scheduleFrequency === ScheduleFrequency.WEEKLY && 'Same day each week'}
                          {formData.scheduleFrequency === ScheduleFrequency.BIWEEKLY && 'Same day every two weeks'}
                          {formData.scheduleFrequency === ScheduleFrequency.MONTHLY && 'Same date each month'}
                          {mode === 'edit' && existingData?.approval_status !== 'PENDING' && ' (Not editable - record is not PENDING)'}
                        </small>
                      </div>

                      <div className="form-group">
                        <label>
                          Start Date<span className="requiredTags"> *</span>
                        </label>
                        <input
                          type="date"
                          value={formData.scheduleStartDate || ''}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              scheduleStartDate: e.target.value
                            }));
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          disabled={mode === 'edit' && existingData?.approval_status !== 'PENDING'}
                          className={mode === 'edit' && existingData?.approval_status !== 'PENDING' ? 'disabled-field' : ''}
                        />
                        {formData.scheduleStartDate && (
                          <small className="hint-message">
                            {formatDate(formData.scheduleStartDate)}
                          </small>
                        )}
                        {errors.scheduleStartDate && (
                          <p className="add-error-message" style={{ marginTop: '0px' }}>{errors.scheduleStartDate}</p>
                        )}
                      </div>
                    </div>

                    {/* Number of Payments */}
                    {formData.scheduleFrequency && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>
                            Number of Payments<span className="requiredTags"> *</span>
                          </label>
                          <input
                            type="number"
                            value={formData.numberOfPayments || ''}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                numberOfPayments: parseInt(e.target.value) || 0
                              }));
                            }}
                            min="2"
                            max="100"
                            disabled={mode === 'edit' && existingData?.approval_status !== 'PENDING'}
                            className={mode === 'edit' && existingData?.approval_status !== 'PENDING' ? 'disabled-field' : ''}
                          />
                          <small className="hint-message">
                            {mode === 'edit' && existingData?.approval_status !== 'PENDING'
                              ? 'Not editable - record is not PENDING'
                              : 'Total installments: minimum 2, maximum 100'}
                          </small>
                          {errors.numberOfPayments && (
                            <p className="add-error-message">{errors.numberOfPayments}</p>
                          )}
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
                    {formData.scheduleFrequency && formData.amount > 0 && scheduleItems.length > 0 && (
                      <>
                        <div className="form-row">
                          <div className="form-group full-width">
                            <label>
                              <span style={{ fontWeight: 600 }}>Payment Schedule Preview</span>
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
                          isUnearnedRevenue={true}
                          frequency={formData.scheduleFrequency}
                        />

                        {/* Edit Mode Warnings */}
                        {mode === 'edit' && scheduleItems.length > 0 && (
                          <>
                            {scheduleItems.filter(item => item.status !== PaymentStatus.PENDING).length > 0 && (
                              <div style={{
                                marginTop: '10px',
                                padding: '12px',
                                backgroundColor: '#E3F2FD',
                                borderRadius: '6px',
                                border: '1px solid #90CAF9'
                              }}>
                                <i className="ri-information-line" style={{ color: '#1976D2', marginRight: '8px' }}></i>
                                <span style={{ color: '#1565C0', fontSize: '14px', fontWeight: '500' }}>
                                  {scheduleItems.filter(item => item.status !== PaymentStatus.PENDING).length} installment(s) have been paid and cannot be modified
                                </span>
                              </div>
                            )}

                            {scheduleItems.some(item => item.status === PaymentStatus.OVERDUE) && (
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
                  )
                )}
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
