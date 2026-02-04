"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import "@/styles/expense-management/administrative.css";
import "@/styles/components/chips.css";
import { formatDate, formatMoney } from "@/utils/formatting";
import { showWarning, showError, showConfirmation } from "@/utils/Alerts";
import { isValidAmount } from "@/utils/validation";
import {
  AdministrativeExpense,
  ExpenseScheduleFrequency,
  ExpenseScheduleItem,
  PaymentStatus
} from "@/app/types/expenses";
import { generateScheduleDates, generateScheduleItems, validateSchedule } from "@/app/utils/expenseScheduleCalculations";
import ExpenseScheduleTable from "@/Components/ExpenseScheduleTable";
import CustomDropdown from "@/Components/CustomDropdown";

// Expense type from API
interface ExpenseType {
  id: number;
  code: string;
  name: string;
  description?: string;
}

// Vendor from API
interface Vendor {
  id: number;
  code: string;
  name: string;
  type: 'supplier' | 'standalone';
  supplier_id?: string;
}

interface RecordAdminExpenseModalProps {
  mode: "add" | "edit";
  existingData?: AdministrativeExpense | null;
  onSave: (formData: AdministrativeExpense, mode: "add" | "edit") => void;
  onClose: () => void;
  currentUser: string;
  expenseTypes?: ExpenseType[]; // From API
  vendors?: Vendor[];  // From API - unified vendor list
}

interface FormErrors {
  date_recorded: string;
  expense_type_id: string;
  amount: string;
  description: string;
  vendor_id: string;  // Changed from vendor to vendor_id
  invoice_number: string;
  payment_method: string;
  payment_reference: string;
  numberOfPayments: string;
  startDate: string;
}

export default function RecordAdminExpenseModal({
  mode,
  existingData,
  onSave,
  onClose,
  currentUser,
  expenseTypes = [],
  vendors = []  // New prop for vendors
}: RecordAdminExpenseModalProps) {

  const [formData, setFormData] = useState<AdministrativeExpense>({
    id: existingData?.id || 0,
    code: existingData?.code || '',
    expense_type_id: existingData?.expense_type_id || 0,
    date_recorded: existingData?.date_recorded || new Date().toISOString().split('T')[0],
    amount: existingData?.amount || 0,
    description: existingData?.description || '',
    vendor_id: existingData?.vendor_id || null,  // Changed from vendor to vendor_id
    vendor: existingData?.vendor || '',  // Keep for display
    invoice_number: existingData?.invoice_number || '',

    // Payable relationship
    payable_id: existingData?.payable_id || null,
    frequency: existingData?.frequency || undefined,
    scheduleItems: existingData?.scheduleItems || [],

    // Payment details
    payment_method: existingData?.payment_method || '',
    payment_reference: existingData?.payment_reference || '',
    paymentStatus: existingData?.paymentStatus || PaymentStatus.PENDING,

    created_by: existingData?.created_by || currentUser,
    created_at: existingData?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const [scheduleItems, setScheduleItems] = useState<ExpenseScheduleItem[]>(existingData?.scheduleItems || []);
  const [numberOfPayments, setNumberOfPayments] = useState<number>(existingData?.scheduleItems?.length || 2);
  const [scheduleStartDate, setScheduleStartDate] = useState<string>(
    existingData?.scheduleItems?.[0]?.due_date || new Date().toISOString().split('T')[0]
  );
  // Initialize enablePayable - true if existing data has payable_id or schedule items
  const initialHasPayable = Boolean(existingData?.payable_id) || Boolean(existingData?.scheduleItems && existingData.scheduleItems.length > 0);
  const [enablePayable, setEnablePayable] = useState<boolean>(initialHasPayable);

  const [formErrors, setFormErrors] = useState<FormErrors>({
    date_recorded: '',
    expense_type_id: '',
    amount: '',
    description: '',
    vendor_id: '',
    invoice_number: '',
    payment_method: '',
    payment_reference: '',
    numberOfPayments: '',
    startDate: ''
  });

  const [isDirty, setIsDirty] = useState(false);

  // Generate schedule when relevant fields change
  // In edit mode: regenerate if frequency/numberOfPayments changed, redistribute if only amount changed
  useEffect(() => {
    // Skip if payable not enabled
    if (!enablePayable) {
      setScheduleItems([]);
      setFormData(prev => ({ ...prev, scheduleItems: [], payable_id: null }));
      return;
    }

    // Check if we have all required fields
    if (!formData.frequency || !scheduleStartDate || !numberOfPayments || numberOfPayments <= 0 || formData.amount <= 0) {
      return;
    }

    // In edit mode, check what changed
    if (mode === 'edit' && existingData?.scheduleItems && existingData.scheduleItems.length > 0) {
      const frequencyChanged = formData.frequency !== existingData.frequency;
      const numberOfPaymentsChanged = numberOfPayments !== existingData.scheduleItems.length;
      const amountChanged = formData.amount !== existingData.amount;
      const startDateChanged = scheduleStartDate !== existingData.scheduleItems[0]?.due_date;

      // If frequency, number of payments, or start date changed - regenerate completely
      if (frequencyChanged || numberOfPaymentsChanged || startDateChanged) {
        const dates = generateScheduleDates(
          formData.frequency,
          scheduleStartDate,
          numberOfPayments
        );
        const items = generateScheduleItems(dates, formData.amount);
        setScheduleItems(items);
        setFormData(prev => ({ ...prev, scheduleItems: items }));
        return;
      }

      // If only amount changed - redistribute across existing schedule items
      if (amountChanged) {
        const amountPerInstallment = formData.amount / scheduleItems.length;
        const updatedItems = scheduleItems.map(item => ({
          ...item,
          amount_due: amountPerInstallment,
          balance: amountPerInstallment - (item.amount_paid || 0)
        }));
        setScheduleItems(updatedItems);
        setFormData(prev => ({ ...prev, scheduleItems: updatedItems }));
      }
      return;
    }

    // Add mode - generate new schedule
    const dates = generateScheduleDates(
      formData.frequency,
      scheduleStartDate,
      numberOfPayments
    );
    const items = generateScheduleItems(dates, formData.amount);
    setScheduleItems(items);
    setFormData(prev => ({ ...prev, scheduleItems: items }));
  }, [
    mode,
    enablePayable,
    formData.frequency,
    scheduleStartDate,
    numberOfPayments,
    formData.amount,
    existingData?.scheduleItems,
    existingData?.amount,
    existingData?.frequency
  ]);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  const validateFormField = (fieldName: keyof FormErrors, value: any): string => {
    let errorMessage = '';

    switch (fieldName) {
      case 'date_recorded':
        if (!value) errorMessage = 'Date is required';
        break;
      case 'expense_type_id':
        if (!value || value === 0) errorMessage = 'Expense type is required';
        break;
      case 'amount':
        if (!value || value <= 0) errorMessage = 'Amount must be greater than 0';
        break;
      case 'vendor_id':
        if (!value) errorMessage = 'Vendor is required';
        break;
      case 'numberOfPayments':
        if (enablePayable) {
          const n = Number(value);
          if (!n || !Number.isInteger(n) || n < 2 || n > 100) {
            errorMessage = 'Number of payments must be between 2 and 100';
          }
        }
        break;
      case 'startDate':
        if (enablePayable && !value) {
          errorMessage = 'Start date is required';
        } else if (value) {
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

    setFormErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
    return errorMessage;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'amount') {
      newValue = parseFloat(value) || 0;
    } else if (name === 'expense_type_id') {
      newValue = parseInt(value) || 0;
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    validateFormField(name as keyof FormErrors, newValue);
  };

  const handleScheduleChange = (newItems: ExpenseScheduleItem[]) => {
    setScheduleItems(newItems);
    setFormData(prev => ({ ...prev, scheduleItems: newItems }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && typeof (e as any).preventDefault === 'function') (e as any).preventDefault();

    // Validate all fields
    const errors: FormErrors = {
      date_recorded: validateFormField('date_recorded', formData.date_recorded),
      expense_type_id: validateFormField('expense_type_id', formData.expense_type_id),
      amount: validateFormField('amount', formData.amount),
      description: '',
      vendor_id: validateFormField('vendor_id', formData.vendor_id),
      invoice_number: '',
      payment_method: '',
      payment_reference: '',
      numberOfPayments: validateFormField('numberOfPayments', numberOfPayments),
      startDate: ''
    };

    if (Object.values(errors).some(err => err !== '')) {
      showError('Please fix the errors in the form', 'error');
      return;
    }

    if (enablePayable) {
      const scheduleValidation = validateSchedule(scheduleItems, formData.amount);
      if (!scheduleValidation.isValid) {
        showError(scheduleValidation.errors[0], 'error');
        return;
      }
    }

    onSave(formData, mode);
  };

  // Get expense type name for display
  const getExpenseTypeName = (typeId: number): string => {
    const expType = expenseTypes.find(t => t.id === typeId);
    return expType ? `${expType.code} - ${expType.name}` : '';
  };

  return (
    <>
      <div className="modal-heading modal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 className="modal-title">{mode === 'add' ? 'Record Administrative Expense' : 'Edit Administrative Expense'}</h1>
        </div>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString()}</p>
          <p>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={onClose} className="close-modal-btn"><i className="ri-close-line" /></button>
      </div>

      <p className="details-title">I. Expense Information</p>
      <div className={`modal-content ${mode}`}>
        <form className={`${mode}-form`}>
          {/* Row: Expense Code + Date Recorded */}
          <div className="form-row">
            <div className="form-group">
              <label>Expense Code</label>
              <input
                type="text"
                value={formData.code || 'Auto-generated'}
                readOnly
                className="readonly-input"
              />
            </div>
            <div className="form-group">
              <label>Date Recorded <span className="requiredTags">*</span></label>
              <input
                type="date"
                name="date_recorded"
                value={formData.date_recorded}
                onChange={handleInputChange}
                className={formErrors.date_recorded ? 'error' : ''}
                readOnly={mode === 'edit'}
              />
              {formErrors.date_recorded && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.date_recorded}</p>}
            </div>
          </div>

          {/* Row: Vendor + Amount */}
          <div className="form-row">
            <div className="form-group">
              <label>Vendor <span className="requiredTags">*</span></label>
              <select
                name="vendor_id"
                value={formData.vendor_id || ''}
                onChange={(e) => {
                  const vendorId = e.target.value ? parseInt(e.target.value) : null;
                  const selectedVendor = vendors.find(v => v.id === vendorId);
                  setFormData(prev => ({
                    ...prev,
                    vendor_id: vendorId,
                    vendor: selectedVendor?.name || ''
                  }));
                }}
                className={formErrors.vendor_id ? 'error' : ''}
              >
                <option value="">Select Vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              {formErrors.vendor_id && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.vendor_id}</p>}
            </div>
            <div className="form-group">
              <label>Amount <span className="requiredTags">*</span></label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className={formErrors.amount ? 'error' : ''}
                step="0.01"
                min="0"
              />
              {formErrors.amount && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.amount}</p>}
            </div>
          </div>

          {/* Row: Invoice Number + Payment Method */}
          <div className="form-row">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number || ''}
                onChange={handleInputChange}
                placeholder="Enter invoice number"
              />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
              >
                <option value="">Select Payment Method</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="E_WALLET">E-Wallet</option>
                <option value="REIMBURSEMENT">Reimbursement</option>
              </select>
            </div>
          </div>

          {/* Row: Description */}
          <div className="form-row">
            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                rows={2}
                placeholder="Enter expense description or remarks"
              />
            </div>
          </div>

          {/* Row: Expense Type */}
          <div className="form-row">
            <div className="form-group">
              <label>Expense Type <span className="requiredTags">*</span></label>
              <select
                name="expense_type_id"
                value={formData.expense_type_id}
                onChange={handleInputChange}
                className={formErrors.expense_type_id ? 'error' : ''}
              >
                <option value={0}>Select Expense Type</option>
                {expenseTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
              {formErrors.expense_type_id && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.expense_type_id}</p>}
            </div>
          </div>
        </form>
      </div>

      {/* II. Payables */}
      <p className="details-title">II. Payables</p>
      <div className={`modal-content ${mode}`}>
        <form className={`${mode}-form`}>
          {/* Enable Payable Section */}
          <div className="form-row">
            <div className="form-group full-width section-divider">
              <div className="checkbox-wrapper">
                <input
                  type="checkbox"
                  id="enablePayable"
                  name="enablePayable"
                  checked={enablePayable}
                  onChange={(e) => setEnablePayable(e.target.checked)}
                />
                <label htmlFor="enablePayable" style={{ fontWeight: '600' }}>
                  Enable Payment Schedule
                </label>
              </div>
            </div>
          </div>

          {enablePayable && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Frequency <span className="requiredTags">*</span></label>
                  <select
                    name="frequency"
                    value={formData.frequency || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Frequency</option>
                    {Object.values(ExpenseScheduleFrequency).map(freq => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Number of Payments <span className="requiredTags">*</span></label>
                  <input
                    type="number"
                    value={numberOfPayments}
                    onChange={(e) => {
                      setNumberOfPayments(parseInt(e.target.value) || 0);
                      validateFormField('numberOfPayments', e.target.value);
                    }}
                    min="2"
                    max="100"
                    className={formErrors.numberOfPayments ? 'error' : ''}
                  />
                  {formErrors.numberOfPayments && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.numberOfPayments}</p>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date <span className="requiredTags">*</span></label>
                  <input
                    type="date"
                    value={scheduleStartDate}
                    onChange={(e) => setScheduleStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={formErrors.startDate ? 'error' : ''}
                  />
                  {formErrors.startDate && <p className={mode === 'add' ? 'add-error-message' : 'edit-error-message'}>{formErrors.startDate}</p>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Payment Schedule</label>
                  <ExpenseScheduleTable
                    scheduleItems={scheduleItems}
                    mode={mode}
                    onItemChange={handleScheduleChange}
                    totalAmount={formData.amount}
                    hasPayable={enablePayable}
                    frequency={formData.frequency}
                  />
                </div>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
        <button type="button" className="submit-btn" onClick={(e) => handleSubmit(e as any)}>
          {mode === 'add' ? 'Record Expense' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}
