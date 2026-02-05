'use client';

import React, { useState, useEffect, useCallback } from 'react';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
import ModalManager from '../../../../Components/modalManager';
import RecordPaymentModal from '@/Components/RecordPaymentModal';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import PaginationComponent from '../../../../Components/pagination'

import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';

import ViewAdminExpenseModal from './viewAdminExpense';
import RecordAdminExpenseModal from './recordAdminExpense';

import { processCascadePayment as processExpenseCascade } from '@/app/utils/expenseScheduleCalculations';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import Swal from 'sweetalert2';
import { showSuccess, showError } from '@/app/utils/Alerts';

import { AdministrativeExpense, AdministrativeExpenseFilters, PaymentStatus, ExpenseScheduleItem, ExpenseStatus } from '../../../../types/expenses';
import { PaymentRecordData } from '@/app/types/payments';

// Expense type interface from API
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

const AdministrativeExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<AdministrativeExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | number | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<AdministrativeExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<AdministrativeExpenseFilters>({});

  // Reference data from API
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);  // Unified vendor list
  const [paymentMethods, setPaymentMethods] = useState<Array<{ value: string; label: string }>>([]);

  // Modal states using ModalManager pattern
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<AdministrativeExpense | null>(null);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<any | null>(null);
  const [selectedExpenseRecord, setSelectedExpenseRecord] = useState<AdministrativeExpense | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Summary data
  const [summary, setSummary] = useState<{ pending_count: number; approved_count: number; total_amount: number }>({
    pending_count: 0,
    approved_count: 0,
    total_amount: 0
  });

  // Fetch reference data on mount
  useEffect(() => {
    fetchExpenseTypes();
    fetchVendors();
    fetchPaymentMethods();
  }, []);

  // Fetch data when page/filters/search changes
  useEffect(() => {
    fetchData();
  }, [currentPage, filters, searchTerm]);

  const fetchExpenseTypes = async () => {
    try {
      const response = await fetch('/api/admin/other-expense/expense-types');
      const result = await response.json();
      if (result.success && result.data) {
        setExpenseTypes(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch expense types:', err);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/admin/other-expense/payment-methods');
      const result = await response.json();
      if (result.success && result.data) {
        // Map API response {id, code, name} to expected {value, label} format
        const mappedMethods = result.data.map((m: { id: number; code: string; name: string }) => ({
          value: m.code,
          label: m.name
        }));
        setPaymentMethods(mappedMethods);
      }
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/other-expense/vendors');
      const result = await response.json();
      if (result.success && result.data) {
        // Transform backend vendor format to frontend expected format
        const transformedVendors = result.data.map((v: any) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          type: v.isSupplier ? 'supplier' : 'standalone',
          supplier_id: v.isSupplier ? v.code : undefined
        }));
        setVendors(transformedVendors);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', pageSize.toString());

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      if (filters.status) {
        params.set('status', filters.status);
      }

      if (filters.dateRange?.from) {
        params.set('date_from', filters.dateRange.from);
      }

      if (filters.dateRange?.to) {
        params.set('date_to', filters.dateRange.to);
      }

      if (filters.amountRange?.min) {
        params.set('amount_min', filters.amountRange.min);
      }

      if (filters.amountRange?.max) {
        params.set('amount_max', filters.amountRange.max);
      }

      const response = await fetch(`/api/admin/other-expense?${params.toString()}`);
      const result = await response.json();

      if (result.success && result.data) {
        // Map API response to frontend interface
        const mappedExpenses: AdministrativeExpense[] = result.data.expenses.map((exp: any) => ({
          id: exp.id,
          code: exp.code,
          expense_type_id: exp.expense_type_id,
          date_recorded: exp.date_recorded,
          amount: exp.amount,
          description: exp.description,
          vendor: exp.vendor,
          invoice_number: exp.invoice_number,
          status: exp.status as ExpenseStatus,
          payment_method: exp.payment_method,
          payable_id: exp.payable_id,
          paymentStatus: exp.paymentStatus as PaymentStatus,
          balance: exp.balance,
          scheduleItems: exp.scheduleItems || [],
          frequency: exp.frequency,
          created_by: exp.created_by,
          created_at: exp.created_at,
          approved_by: exp.approved_by,
          approved_at: exp.approved_at,
        }));

        setExpenses(mappedExpenses);
        setTotalCount(result.data.pagination?.total || 0);
        setSummary(result.data.summary || { pending_count: 0, approved_count: 0, total_amount: 0 });
      } else {
        setError(result.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      setError(500);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = (appliedFilters: any) => {
    const converted: AdministrativeExpenseFilters = {
      dateRange: appliedFilters.dateRange,
      status: appliedFilters.status,
      amountRange: appliedFilters.amountRange,
    };
    setFilters(converted);
    setCurrentPage(1);
  };

  const handleRowClick = (expense: AdministrativeExpense) => {
    setSelectedExpense(expense);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  const closePaymentModal = () => {
    setModalContent(null);
    setSelectedScheduleItem(null);
    setSelectedExpenseRecord(null);
    setIsPaymentModalOpen(false);
    setIsModalOpen(false);
  };

  const openPaymentModal = (scheduleItem: any, expense: AdministrativeExpense) => {
    setSelectedScheduleItem(scheduleItem);
    setSelectedExpenseRecord(expense);

    const methods = paymentMethods.map((m, idx) => ({
      id: idx + 1,
      methodName: m.label,
      methodCode: m.value
    }));

    setModalContent(
      <RecordPaymentModal
        entityType="expense"
        recordId={expense.id}
        recordRef={expense.invoice_number}
        scheduleItems={(expense.scheduleItems || []).map(i => ({ ...(i as any) }))}
        selectedInstallment={scheduleItem}
        paymentMethods={methods}
        currentUser={expense.created_by || 'admin@ftms.com'}
        onPaymentRecorded={handlePaymentRecorded}
        onClose={closePaymentModal}
        processCascadePayment={processExpenseCascade}
      />
    );

    setIsPaymentModalOpen(true);
    setIsModalOpen(true);
  };

  const handlePaymentRecorded = async (paymentData: PaymentRecordData) => {
    try {
      // Call backend payment API
      const response = await fetch('/api/admin/other-expense/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseId: paymentData.recordId,
          scheduleItemId: paymentData.scheduleItemId,
          scheduleItemIds: paymentData.scheduleItemIds,
          amountPaid: paymentData.amountToPay,
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethodCode,
          recordedBy: paymentData.recordedBy,
          cascadeBreakdown: paymentData.cascadeBreakdown
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to record payment');
      }

      await fetchData();
      closePaymentModal();
    } catch (error) {
      console.error('Payment recording failed:', error);
      throw error; // Let RecordPaymentModal handle error display
    }
  };

  // Open modal with different modes
  const openModal = async (mode: 'view' | 'add' | 'edit', rowData?: AdministrativeExpense) => {
    if (rowData) {
      setActiveRow(rowData);
    }

    // For view and edit modes, fetch full expense details including schedule items
    let fullExpenseData = rowData;
    if ((mode === 'view' || mode === 'edit') && rowData?.id) {
      try {
        const response = await fetch(`/api/admin/other-expense/${rowData.id}`);
        const result = await response.json();
        if (result.success && result.data) {
          // Extract vendor info from object if needed
          const vendorData = result.data.vendor;
          const vendorName = typeof vendorData === 'object' && vendorData !== null
            ? (vendorData.supplier_local?.supplier_name || vendorData.name || '')
            : (vendorData || '');
          // Extract vendor_id - prioritize direct field, then from vendor object
          const vendorId = result.data.vendor_id 
            || (typeof vendorData === 'object' && vendorData !== null ? vendorData.id : null)
            || rowData.vendor_id;

          fullExpenseData = {
            ...rowData,
            ...result.data,
            vendor: vendorName,  // Ensure vendor is a string, not object
            vendor_id: vendorId,
            scheduleItems: result.data.scheduleItems || [],
            frequency: result.data.frequency || rowData.frequency,
          };
        }
      } catch (error) {
        console.error('Failed to fetch expense details:', error);
        // Fallback to rowData if fetch fails
      }
    }

    if (mode === 'view' && fullExpenseData) {
      setModalContent(
        <ViewAdminExpenseModal
          data={fullExpenseData}
          onClose={closeModal}
          onEdit={(data) => openModal('edit', data)}
          onRecordPayment={(scheduleItem?: ExpenseScheduleItem) => {
            // Default to earliest pending installment if none passed
            const pendingItem = scheduleItem || (fullExpenseData.scheduleItems || []).find((it: ExpenseScheduleItem) => it.status === PaymentStatus.PENDING || it.status === PaymentStatus.PARTIALLY_PAID);
            if (pendingItem) openPaymentModal(pendingItem, fullExpenseData);
          }}
        />
      );
    } else if (mode === 'add') {
      setModalContent(
        <RecordAdminExpenseModal
          mode="add"
          existingData={null}
          onSave={handleSave}
          onClose={closeModal}
          currentUser="admin@ftms.com"
          expenseTypes={expenseTypes}
          vendors={vendors}
        />
      );
    } else if (mode === 'edit' && fullExpenseData) {
      // Check if expense is PENDING - only allow edit for PENDING
      if (String(fullExpenseData.status).toUpperCase() !== 'PENDING') {
        showError('Error', 'Only PENDING expenses can be edited');
        return;
      }
      setModalContent(
        <RecordAdminExpenseModal
          mode="edit"
          existingData={fullExpenseData}
          onSave={handleSave}
          onClose={closeModal}
          currentUser="admin@ftms.com"
          expenseTypes={expenseTypes}
          vendors={vendors}
        />
      );
    }

    setIsModalOpen(true);
  };

  const handleSave = async (formData: AdministrativeExpense, mode: 'add' | 'edit') => {
    try {
      if (mode === 'add') {
        // Create new expense via API
        const payload = {
          expense_type_id: formData.expense_type_id,
          date_recorded: formData.date_recorded,
          amount: formData.amount,
          description: formData.description,
          vendor_id: formData.vendor_id,  // Changed from vendor to vendor_id
          invoice_number: formData.invoice_number,
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference,
          // Schedule settings
          enable_schedule: formData.scheduleItems && formData.scheduleItems.length > 0,
          frequency: formData.frequency,
          number_of_payments: formData.scheduleItems?.length,
          schedule_start_date: formData.scheduleItems?.[0]?.due_date,
        };

        const response = await fetch('/api/admin/other-expense', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          showSuccess('Success', 'Expense created successfully');
          await fetchData();
        } else {
          showError('Error', result.message || 'Failed to create expense');
        }
      } else {
        // Update existing expense via API
        const payload = {
          expense_type_id: formData.expense_type_id,
          date_recorded: formData.date_recorded,
          amount: formData.amount,
          description: formData.description,
          vendor_id: formData.vendor_id,
          invoice_number: formData.invoice_number,
          payment_method: formData.payment_method,
          payment_reference: formData.payment_reference,
          // Schedule settings for update
          enable_schedule: formData.scheduleItems && formData.scheduleItems.length > 0,
          frequency: formData.frequency,
          number_of_payments: formData.scheduleItems?.length,
          schedule_start_date: formData.scheduleItems?.[0]?.due_date,
        };

        const response = await fetch(`/api/admin/other-expense/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
          showSuccess('Success', 'Expense updated successfully');
          await fetchData();
        } else {
          showError('Error', result.message || 'Failed to update expense');
        }
      }
      closeModal();
    } catch (err) {
      console.error('Save error:', err);
      showError('Error', 'An error occurred while saving');
    }
  };

  // Action handlers
  const handleAdd = () => {
    openModal('add');
  };

  const handleView = (expense: AdministrativeExpense) => {
    openModal('view', expense);
  };

  const handleEdit = (expense: AdministrativeExpense) => {
    openModal('edit', expense);
  };

  const handleRecordPayment = (expense: AdministrativeExpense) => {
    // For expenses with a payable and schedule items, find the first pending installment
    if (expense.payable_id && expense.scheduleItems && expense.scheduleItems.length > 0) {
      const pendingItem = expense.scheduleItems.find(
        item => item.status === PaymentStatus.PENDING || item.status === PaymentStatus.PARTIALLY_PAID
      );
      if (pendingItem) {
        openPaymentModal(pendingItem, expense);
      }
    } else {
      // For non-scheduled expenses, create a single installment for payment
      const singleInstallment: ExpenseScheduleItem = {
        id: `${expense.id}-SINGLE`,
        installment_number: 1,
        due_date: expense.date_recorded,
        amount_due: expense.amount,
        amount_paid: 0,
        balance: expense.amount,
        status: PaymentStatus.PENDING
      };

      // Create a temporary expense object with schedule for payment modal
      const expenseWithSchedule = {
        ...expense,
        scheduleItems: [singleInstallment]
      };

      openPaymentModal(singleInstallment, expenseWithSchedule);
    }
  };



  const handleDelete = async (expense: AdministrativeExpense) => {
    if (expense.status !== ExpenseStatus.PENDING) {
      showError('Error', 'Only PENDING expenses can be deleted');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Expense?',
      text: `Are you sure you want to delete ${expense.code}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/other-expense/${expense.id}/soft-delete`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Deleted via UI' }),
        });

        const apiResult = await response.json();

        if (apiResult.success) {
          showSuccess('Success', 'Expense deleted');
          await fetchData();
        } else {
          showError('Error', apiResult.message || 'Failed to delete expense');
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        showError('Error', 'Failed to delete expense. Please try again.');
      }
    }
  };

  // Filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date',
      type: 'dateRange',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'amountRange',
      title: 'Amount',
      type: 'numberRange',
      defaultValue: { min: '', max: '' }
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      options: [
        { id: '', label: 'All Status' },
        { id: 'PENDING', label: 'Pending' },
        { id: 'APPROVED', label: 'Approved' },
        { id: 'REJECTED', label: 'Rejected' },
      ],
      defaultValue: ''
    }
  ];

  // Prepare export data
  const exportData = expenses.map((exp) => ({
    'Date Recorded': formatDate(exp.date_recorded),
    'Request Code': exp.code || exp.id,
    Vendor: exp.vendor || 'N/A',
    'Invoice Number': exp.invoice_number || 'N/A',
    Description: exp.description || 'N/A',
    Amount: formatMoney(exp.amount),
    Status: exp.status || 'PENDING',
  }));

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Administrative Expenses</h1>
        <Loading />
      </div>
    );
  }
  if (error) return <ErrorDisplay errorCode={error} onRetry={() => { setError(null); fetchData(); }} />;

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Administrative Expenses</h1>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by code, vendor, invoice number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter button right next to search bar */}
            <FilterDropdown
              sections={filterSections}
              onApply={(filterValues) => {
                const dateRange = filterValues.dateRange as { from: string; to: string } || { from: '', to: '' };
                const amountRange = filterValues.amountRange as { min: string; max: string } || { min: '', max: '' };
                handleFilterApply({
                  dateRange,
                  amountRange,
                  status: (filterValues.status as string) || '',
                });
              }}
              initialValues={{
                dateRange: filters.dateRange ? { from: filters.dateRange.from || '', to: filters.dateRange.to || '' } : { from: '', to: '' },
                amountRange: filters.amountRange ? { min: filters.amountRange.min || '', max: filters.amountRange.max || '' } : { min: '', max: '' },
                status: filters.status || '',
              }}
            />
          </div>

          <div className="filters">
            <ExportButton
              data={exportData}
              filename="administrative-expenses"
              title="Administrative Expenses Report"
            />
            <button
              className="addButton"
              onClick={handleAdd}
            >
              <i className="ri-add-line"></i>
              Add Expense
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense Code</th>
                  <th>Vendor</th>
                  <th>Invoice #</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      No administrative expenses found
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense, index) => (
                    <tr
                      key={expense.id}
                      className="expense-row"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(expense);
                      }}
                      title="View Expense"
                    >
                      <td>{formatDate(expense.date_recorded)}</td>
                      <td>{expense.code || expense.id}</td>
                      <td>{expense.vendor || '-'}</td>
                      <td>{expense.invoice_number || '-'}</td>
                      <td>{formatMoney(expense.amount)}</td>
                      <td>
                        <span className={`chip ${(expense.status || 'PENDING').toLowerCase().replace('_', '-')}`}>
                          {(expense.status || 'PENDING').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="actionButtons">
                        <div className="actionButtonsContainer">
                          <button
                            className="viewBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(expense);
                            }}
                            title="View"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                          {String(expense.status).toUpperCase() === 'PENDING' && (
                            <>
                              <button
                                className="editBtn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(expense);
                                }}
                                title="Edit"
                              >
                                <i className="ri-pencil-line"></i>
                              </button>

                              <button
                                className="deleteBtn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(expense);
                                }}
                                title="Delete"
                                style={{ backgroundColor: '#6c757d' }}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={Math.ceil(totalCount / pageSize)}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={() => { }}
        />
      </div>

      {/* Modal Manager */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />
    </div>
  );
};

export default AdministrativeExpensePage;
