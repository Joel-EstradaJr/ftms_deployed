'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ModalHeader from '../../../../Components/ModalHeader';
import ItemsTable from '../../../../Components/itemTable';
import '../../../../styles/components/modal.css';
import { AdministrativeExpense } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showConfirmation, showSuccess, showError } from '../../../../utils/Alerts';

interface AdminExpenseViewModalProps {
  expense?: AdministrativeExpense | null;
  mode?: 'view' | 'add' | 'edit';
  onSave?: (expense: AdministrativeExpense) => void;
  onClose: () => void;
}

const AdminExpenseViewModal: React.FC<AdminExpenseViewModalProps> = ({
  expense,
  mode = 'view',
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState<Partial<AdministrativeExpense>>({
    date: new Date().toISOString().split('T')[0],
    expense_type: 'OFFICE_SUPPLIES',
    amount: 0,
    status: 'PENDING',
    category: '',
    receipt_number: '',
    description: '',
    department: '',
    vendor: '',
    invoice_number: '',
    items: []
  });
  const [showItems, setShowItems] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && expense) {
      setFormData({
        ...expense,
        date: expense.date.split('T')[0]
      });
    } else if (mode === 'add') {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        expense_type: 'OFFICE_SUPPLIES',
        amount: 0,
        status: 'PENDING',
        category: '',
        receipt_number: '',
        description: '',
        department: '',
        vendor: '',
        invoice_number: '',
        items: []
      });
    }
  }, [mode, expense]);

  const handleInputChange = (field: keyof AdministrativeExpense, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemsChange = (items: any[]) => {
    setFormData(prev => ({ ...prev, items }));
  };

  const validateForm = (): string | null => {
    if (!formData.date) return 'Date is required';
    if (!formData.amount || formData.amount <= 0) return 'Valid amount is required';
    if (!formData.description?.trim()) return 'Description is required';
    if (!formData.department?.trim()) return 'Department is required';
    return null;
  };

  const handleSubmit = async () => {
    if (mode === 'view') return;
    
    const validationError = validateForm();
    if (validationError) {
      showError(validationError, 'Validation Error');
      return;
    }

    const confirmed = await showConfirmation(
      mode === 'add' ? 'Add Expense' : 'Update Expense',
      `Are you sure you want to ${mode === 'add' ? 'add' : 'update'} this expense?`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const expenseData: AdministrativeExpense = {
        ...formData,
        id: mode === 'edit' ? (expense?.id || `exp-${Date.now()}`) : `exp-${Date.now()}`,
        created_by: mode === 'edit' ? (expense?.created_by || 'Current User') : 'Current User',
        created_at: mode === 'edit' ? (expense?.created_at || new Date().toISOString()) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as AdministrativeExpense;

      onSave && onSave(expenseData);
      showSuccess(`Expense ${mode === 'add' ? 'added' : 'updated'} successfully`, 'Success');
      onClose();
    } catch (error) {
      showError(`Failed to ${mode} expense`, 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (mode === 'view') return `Administrative Expense - ${expense?.invoice_number || expense?.id}`;
    return `${mode === 'add' ? 'Add' : 'Edit'} Administrative Expense`;
  };

  const isEditable = mode !== 'view';
  const isFormValid = () => {
    return formData.date && 
           (formData.amount !== undefined && formData.amount > 0) && 
           formData.expense_type && 
           formData.status &&
           formData.description?.trim() !== '';
  };

  const displayData = isEditable ? formData : expense;

  if (typeof document !== 'undefined') {
    return createPortal((
      <div className="modalOverlay">
        <div className="modalStandard">
          <ModalHeader
            title={getTitle()}
            onClose={onClose}
          />

          <div className="modalContent">
            <h3 className="sectionTitle">Expense Details</h3>
            <div className="formRow">
              <div className="formField">
                <label>Date:</label>
                <input 
                  type={isEditable ? "date" : "text"} 
                  value={isEditable ? formData.date : formatDate(displayData?.date || '')} 
                  onChange={(e) => handleInputChange('date', e.target.value)} 
                  readOnly={!isEditable} 
                />
              </div>
              <div className="formField">
                <label>Expense Type:</label>
                {isEditable ? (
                  <select value={formData.expense_type} onChange={(e) => handleInputChange('expense_type', e.target.value)}>
                    <option value="OFFICE_SUPPLIES">Office Supplies</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="TRAINING">Training</option>
                    <option value="OTHER">Other</option>
                  </select>
                ) : (
                  <div style={{ padding: '0.5rem 0' }}>
                    <span className={`chip ${displayData?.expense_type?.toLowerCase()}`}>
                      {displayData?.expense_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
              <div className="formField">
                <label>Amount:</label>
                {isEditable ? (
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.amount} 
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)} 
                    className="amount-text"
                  />
                ) : (
                  <input type="text" value={formatMoney(displayData?.amount || 0)} readOnly className="amount-text" />
                )}
              </div>
            </div>
            <div className="formRow">
              <div className="formField">
                <label>Status:</label>
                {isEditable ? (
                  <select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)}>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PAID">Paid</option>
                  </select>
                ) : (
                  <div style={{ padding: '0.5rem 0' }}>
                    <span className={`chip ${displayData?.status?.toLowerCase()}`}>
                      {displayData?.status ? (displayData.status.charAt(0).toUpperCase() + displayData.status.slice(1).toLowerCase()) : ''}
                    </span>
                  </div>
                )}
              </div>
              <div className="formField">
                <label>Category:</label>
                <input 
                  type="text" 
                  value={displayData?.category || ''} 
                  onChange={(e) => handleInputChange('category', e.target.value)} 
                  readOnly={!isEditable} 
                />
              </div>
              <div className="formField">
                <label>Receipt Number:</label>
                <input 
                  type="text" 
                  value={displayData?.receipt_number || ''} 
                  onChange={(e) => handleInputChange('receipt_number', e.target.value)} 
                  readOnly={!isEditable} 
                />
              </div>
            </div>

            <div className="formRow">
              <div className="formField full-width">
                <label>Description:</label>
                <textarea 
                  value={displayData?.description || ''} 
                  onChange={(e) => handleInputChange('description', e.target.value)} 
                  readOnly={!isEditable} 
                  rows={3} 
                />
              </div>
            </div>
          </div>

          <div className="modalContent">
            <h3 className="sectionTitle">Vendor & Department Information</h3>
            <div className="formRow">
              <div className="formField">
                <label>Department:</label>
                <input 
                  type="text" 
                  value={displayData?.department || ''} 
                  onChange={(e) => handleInputChange('department', e.target.value)} 
                  readOnly={!isEditable} 
                />
              </div>
              <div className="formField">
                <label>Vendor:</label>
                <input 
                  type="text" 
                  value={displayData?.vendor || ''} 
                  onChange={(e) => handleInputChange('vendor', e.target.value)} 
                  readOnly={!isEditable} 
                />
              </div>
              <div className="formField">
                <label>Invoice Number:</label>
                <input 
                  type="text" 
                  value={displayData?.invoice_number || ''} 
                  onChange={(e) => handleInputChange('invoice_number', e.target.value)} 
                  readOnly={!isEditable} 
                />
              </div>
            </div>
            <div className="formRow">
              <div className="formField">
                <label>Created By:</label>
                <input type="text" value={displayData?.created_by || ''} readOnly />
              </div>
              <div className="formField">
                <label>Created At:</label>
                <input type="text" value={formatDate(displayData?.created_at || '')} readOnly />
              </div>
            </div>
            {displayData?.approved_by && (
              <div className="formRow">
                <div className="formField">
                  <label>Approved By:</label>
                  <input type="text" value={displayData.approved_by} readOnly />
                </div>
                <div className="formField">
                  <label>Approved At:</label>
                  <input type="text" value={formatDate(displayData?.approved_at || '')} readOnly />
                </div>
              </div>
            )}
            <div className="formRow">
              <div className="formField">
                <label>Last Updated:</label>
                <input type="text" value={formatDate(displayData?.updated_at || '')} readOnly />
              </div>
            </div>
          </div>

          
            {/* Items Table */}
            {displayData?.items && displayData.items.length > 0 && (
              <div className="modalContent">
                  <div style={{ marginTop: '1.5rem' }}>
                  <ItemsTable
                      items={isEditable ? (formData.items || []) : (displayData?.items || [])}
                      onItemsChange={isEditable ? (items) => handleInputChange('items', items) : () => {}}
                      showItems={showItems}
                      onToggleItems={() => setShowItems(!showItems)}
                      readOnly={!isEditable}
                      title="Expense Items"
                  />
                  </div>
              </div>
            )}

            <div className="modalActions">
              {isEditable ? (
                <div>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSubmit}
                    disabled={!isFormValid()}
                  >
                    {mode === 'add' ? 'Create Expense' : 'Update Expense'}
                  </button>
                  <button className="btn btn-secondary" onClick={onClose}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
              )}
            </div>

        </div>
      </div>
    ), document.body);
  }

  return <div>Test</div>;
};

export default AdminExpenseViewModal;
