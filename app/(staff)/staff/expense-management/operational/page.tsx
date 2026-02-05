'use client';

import React, { useState, useEffect, useCallback } from 'react';
import '../../../../styles/expense-management/operational.css';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import PaginationComponent from '../../../../Components/pagination';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
import ModalManager from '../../../../Components/modalManager';
import ViewOperationalExpenseModal from './viewOperationalExpense';
import RecordOperationalExpenseModal, { OperationalExpenseData } from './recordOperationalExpense';
import RecordReimbursementPaymentModal from '../../../../Components/RecordReimbursementPaymentModal';
// import { useAuth } from '../../../../hooks/use-auth';
import { OperationalExpenseFilters } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import Swal from 'sweetalert2';

// Import API service - STAFF VERSION
import {
  fetchExpenses,
  fetchExpenseById,
  fetchReimbursementDetails,
  softDeleteExpense,
  approveExpense,
  rejectExpense,
  ExpenseListItem,
  ExpenseSummary,
  updateExpense,
  fetchChartOfAccounts,
  fetchEmployees,
  fetchOperationalTrips,
  fetchRentalTrips,
  transformFormToDTO,
} from '../../../../services/staffOperationalExpenseService';

// Transform API expense to form data format for viewing
interface OperationalExpenseViewData {
  id?: number;
  code: string;
  date_recorded: string;
  expense_type_name: string;
  amount: number;
  bus_trip_assignment_id?: string;
  bus_trip_id?: string;
  plate_number?: string;
  bus_route?: string;
  account_id?: number;
  payment_method: string;
  is_reimbursable: boolean;
  description?: string;
  approval_status?: string;
  created_by: string;
  approved_by?: string;
  created_at?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  // View-only fields
  body_number?: string;
  bus_type?: string;
  date_assigned?: string;
  employee_reference?: string;
  creditor_name?: string;
  payable_description?: string;
  payment_method_name?: string;
  account_code?: string;
  account_name?: string;
  journal_entry_id?: number;
  journal_entry_code?: string;
  // Remarks fields
  approval_remarks?: string;
  rejection_remarks?: string;
  deletion_remarks?: string;
}

// Transform API expense to form data format for viewing
// Backend returns flat structure directly, not nested
const transformApiToFormData = (expense: any): OperationalExpenseViewData => {
  return {
    id: expense.id,
    code: expense.code || '',
    date_recorded: expense.date_recorded || '',
    expense_type_name: expense.expense_type_name || '',
    amount: expense.amount || 0,
    bus_trip_assignment_id: expense.bus_trip_assignment_id,
    bus_trip_id: expense.bus_trip_id,
    plate_number: expense.plate_number || '',
    bus_route: expense.bus_route || '',
    account_id: expense.account_id,
    payment_method: expense.payment_method || '',
    is_reimbursable: expense.is_reimbursable || expense.payment_method === 'REIMBURSEMENT',
    description: expense.description || '',
    approval_status: expense.approval_status,
    created_by: expense.created_by || '',
    approved_by: expense.approved_by,
    created_at: expense.created_at,
    approved_at: expense.approved_at,
    rejected_by: expense.rejected_by,
    rejected_at: expense.rejected_at,
    // Additional view fields - directly from flat response
    body_number: expense.body_number,
    bus_type: expense.bus_type,
    date_assigned: expense.date_assigned,
    employee_reference: expense.employee_reference,
    creditor_name: expense.creditor_name,
    payable_description: expense.payable_description,
    payment_method_name: expense.payment_method,
    account_code: expense.account_code,
    account_name: expense.account_name,
    journal_entry_id: expense.journal_entry_id,
    journal_entry_code: expense.journal_entry_code,
    // Remarks fields
    approval_remarks: expense.approval_remarks,
    rejection_remarks: expense.rejection_remarks,
    deletion_remarks: expense.deletion_remarks,
  };
};

const OperationalExpensePage = () => {
  // State management
  const [data, setData] = useState<ExpenseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<OperationalExpenseFilters>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Summary state
  const [summary, setSummary] = useState<ExpenseSummary>({
    pending_count: 0,
    approved_count: 0,
    total_approved_amount: 0,
  });

  // ModalManager states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  // Reference tables for Edit Modal
  const [employeesRef, setEmployeesRef] = useState<any[]>([]);
  const [coaRef, setCoaRef] = useState<any[]>([]);
  const [tripsRef, setTripsRef] = useState<any[]>([]);
  const [refDataLoaded, setRefDataLoaded] = useState(false);
  const [currentUser] = useState('Admin'); // Placeholder until Auth context is fixed

  const loadReferenceData = async () => {
    if (refDataLoaded) return;
    try {
      const [empData, coaData, opTrips, rentalTrips] = await Promise.all([
        fetchEmployees(),
        fetchChartOfAccounts(),
        fetchOperationalTrips(),
        fetchRentalTrips(),
      ]);

      // Transform Employees
      const formattedEmps = empData.map(e => ({
        employee_id: e.employeeNumber,
        name: `${e.firstName} ${e.lastName}`,
        job_title: e.position || '',
        department: e.department || '',
        employee_number: e.employeeNumber
      }));
      setEmployeesRef(formattedEmps);
      setCoaRef(coaData);

      // Transform Trips
      const mappedTrips = [
        ...opTrips.map(t => ({
          assignment_id: t.assignment_id,
          bus_trip_id: t.bus_trip_id,
          plate_number: t.bus_plate_number || '',
          body_number: t.body_number || '',
          bus_type: t.bus_type || '',
          bus_route: t.bus_route || '',
          date_assigned: t.date_assigned || '',
          departmentId: 0,
          departmentName: 'Operations'
        })),
        ...rentalTrips.map(t => ({
          assignment_id: t.assignment_id,
          bus_trip_id: 'RENTAL',
          plate_number: t.bus_plate_number || '',
          body_number: t.body_number || '',
          bus_type: t.bus_type || '',
          bus_route: t.rental_destination || '',
          date_assigned: t.rental_start_date || '',
          departmentId: 0,
          departmentName: 'Rental'
        }))
      ];
      setTripsRef(mappedTrips);

      setRefDataLoaded(true);
    } catch (err) {
      console.error("Failed to load reference data", err);
      showError("Error", "Failed to load form data.");
    }
  };

  const handleSaveExpense = async (formData: OperationalExpenseData, mode: "add" | "edit" | "approve") => {
    try {
      if (mode === 'edit' && formData.id) {
        const dto = transformFormToDTO(formData, formData.is_reimbursable);
        await updateExpense(formData.id, dto);
        await showSuccess("Success", "Expense updated successfully.");
        setIsModalOpen(false);
        fetchData(); // Refresh list
      }
    } catch (err) {
      console.error("Error updating expense", err);
      await showError("Error", "Failed to update expense.");
    }
  };

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch expenses data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchExpenses({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm || undefined,
        date_from: filters.dateRange?.from || undefined,
        date_to: filters.dateRange?.to || undefined,
        status: filters.status ? [filters.status] : undefined,
      });

      setData(result.expenses);
      setTotalCount(result.pagination.total);
      setTotalPages(result.pagination.total_pages);
      setSummary(result.summary);

    } catch (err) {
      console.error('Error fetching operational expense data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setErrorCode('FETCH_ERROR');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters, debouncedSearchTerm]);


  // Modal management functions
  const openModal = async (mode: 'view' | 'edit', rowData: ExpenseListItem) => {
    let content: React.ReactNode = null;

    if (mode === 'edit') {
      await loadReferenceData();
    }

    // Fetch full details
    const fullDetails = await fetchExpenseById(rowData.id);
    if (!fullDetails) {
      await showError('Error', 'Failed to load expense details');
      return;
    }
    
    console.log('Backend returned full details:', fullDetails);

    if (mode === 'view') {
      const expenseData = transformApiToFormData(fullDetails);
      content = (
        <ViewOperationalExpenseModal
          expenseData={expenseData}
          onClose={closeModal}
        />
      );
    } else {
      // Transform for Edit
      // Cast to any because backend returns flat structure but interface defines nested
      const flatDetails = fullDetails as any;
      const editData: OperationalExpenseData = {
        id: flatDetails.id,
        code: flatDetails.code,
        date_recorded: (flatDetails.date_recorded || '').split('T')[0],
        expense_type_name: flatDetails.expense_type_name || flatDetails.expense_name,
        amount: flatDetails.amount,
        payment_method: flatDetails.payment_method || '',
        bus_trip_assignment_id: rowData.operational_trip?.assignment_id || rowData.rental_trip?.assignment_id || flatDetails.bus_trip_assignment_id || undefined,
        bus_trip_id: rowData.operational_trip?.bus_trip_id || flatDetails.bus_trip_id || undefined,
        department: 'Operations',
        account_id: flatDetails.account_id || undefined,
        is_reimbursable: flatDetails.is_reimbursable,
        description: flatDetails.description || '',
        employee_reference: flatDetails.payable?.employee_reference || flatDetails.employee_reference || '',
        creditor_name: flatDetails.payable?.creditor_name || flatDetails.creditor_name || '',
        payable_description: flatDetails.payable?.description || flatDetails.payable_description || '',
        created_by: flatDetails.created_by,
        plate_number: rowData.operational_trip?.bus_plate_number || rowData.rental_trip?.bus_plate_number || flatDetails.plate_number || '',
        bus_route: rowData.operational_trip?.bus_route || rowData.rental_trip?.rental_destination || flatDetails.bus_route || '',
        body_number: flatDetails.body_number || '',
        bus_type: flatDetails.bus_type || '',
        date_assigned: flatDetails.date_assigned || '',
        driver_id: flatDetails.driver_id || null,
        driver_name: flatDetails.driver_name || null,
        conductor_id: flatDetails.conductor_id || null,
        conductor_name: flatDetails.conductor_name || null,
      };

      // Fetch reimbursement details with driver/conductor split if expense is reimbursable
      if (flatDetails.is_reimbursable) {
        const reimbursementDetails = await fetchReimbursementDetails(flatDetails.id);
        if (reimbursementDetails) {
          // Store driver installments
          if (reimbursementDetails.driver) {
            editData.driverInstallments = {
              employee_name: reimbursementDetails.driver.employee_name,
              employee_number: reimbursementDetails.driver.employee_number,
              total_share: reimbursementDetails.driver.share_amount,
              paid_amount: reimbursementDetails.driver.paid_amount,
              balance: reimbursementDetails.driver.balance,
              status: reimbursementDetails.driver.status,
              installments: reimbursementDetails.driver.installments.map((inst: any) => ({
                id: inst.id,
                installment_number: inst.installment_number,
                due_date: inst.due_date.split('T')[0],
                amount_due: inst.amount_due,
                status: inst.status.toUpperCase() as any,
                payment_date: inst.payment_date ? inst.payment_date.split('T')[0] : undefined,
                amount_paid: inst.amount_paid,
                balance: inst.balance,
              }))
            };
          }
          
          // Store conductor installments
          if (reimbursementDetails.conductor) {
            editData.conductorInstallments = {
              employee_name: reimbursementDetails.conductor.employee_name,
              employee_number: reimbursementDetails.conductor.employee_number,
              total_share: reimbursementDetails.conductor.share_amount,
              paid_amount: reimbursementDetails.conductor.paid_amount,
              balance: reimbursementDetails.conductor.balance,
              status: reimbursementDetails.conductor.status,
              installments: reimbursementDetails.conductor.installments.map((inst: any) => ({
                id: inst.id,
                installment_number: inst.installment_number,
                due_date: inst.due_date.split('T')[0],
                amount_due: inst.amount_due,
                status: inst.status.toUpperCase() as any,
                payment_date: inst.payment_date ? inst.payment_date.split('T')[0] : undefined,
                amount_paid: inst.amount_paid,
                balance: inst.balance,
              }))
            };
          }
        }
      }
      
      console.log('Edit Data being sent to modal:', editData);

      content = (
        <RecordOperationalExpenseModal
          mode="edit"
          existingData={editData}
          onSave={handleSaveExpense}
          onClose={closeModal}
          departments={[{ id: 1, name: "Operations" }]}
          cachedTrips={tripsRef}
          chartOfAccounts={coaRef}
          employees={employeesRef}
          currentUser={currentUser}
        />
      );
    }

    setModalContent(content);
    setIsModalOpen(true);
    setActiveRow(Number(rowData.id));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  // Action handlers
  const handleView = (id: number) => {
    const expense = data.find(item => item.id === id);
    if (expense) {
      openModal('view', expense);
    }
  };

  const handleEdit = (id: number) => {
    const expense = data.find(item => item.id === id);
    if (expense) {
      openModal('edit', expense);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Delete Operational Expense',
        input: 'textarea',
        inputLabel: 'Reason for deletion',
        inputPlaceholder: 'Enter the reason for deleting this expense...',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        inputValidator: (value) => {
          if (!value) {
            return 'Please provide a reason for deletion';
          }
          return null;
        }
      });

      if (isConfirmed && reason) {
        await softDeleteExpense(id, reason);
        await showSuccess('Deleted!', 'Operational expense has been deleted successfully.');
        fetchData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error deleting operational expense:', error);
      await showError('Error', 'Failed to delete operational expense. Please try again.');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const { value: remarks } = await Swal.fire({
        title: 'Approve Expense',
        input: 'textarea',
        inputLabel: 'Approval remarks (optional)',
        inputPlaceholder: 'Enter any remarks for this approval...',
        inputAttributes: {
          'aria-label': 'Approval remarks'
        },
        showCancelButton: true,
        confirmButtonText: 'Approve',
        confirmButtonColor: '#28a745',
        html: `
          <p style="color: #666; font-size: 0.9em; margin-bottom: 1rem;">
            Approving this expense will automatically generate a journal entry with:
            <br>â€¢ Debit: Fuel Expense (4000)
            <br>â€¢ Credit: Cash on Hand (1010)
          </p>
        `,
      });

      if (remarks !== undefined) {
        await approveExpense(id, remarks || '');
        await showSuccess('Approved!', 'Expense approved and journal entry created successfully.');
        fetchData();
      }
    } catch (error) {
      console.error('Error approving operational expense:', error);
      await showError('Error', 'Failed to approve operational expense. Please try again.');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const { value: reason } = await Swal.fire({
        title: 'Reject Expense',
        input: 'textarea',
        inputLabel: 'Reason for rejection',
        inputPlaceholder: 'Enter the reason for rejecting this expense...',
        inputAttributes: {
          'aria-label': 'Reason for rejection'
        },
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#d33',
        inputValidator: (value) => {
          if (!value) {
            return 'Please provide a reason for rejection';
          }
          return null;
        }
      });

      if (reason) {
        await rejectExpense(id, reason);
        await showSuccess('Rejected!', 'Operational expense has been rejected.');
        fetchData();
      }
    } catch (error) {
      console.error('Error rejecting operational expense:', error);
      await showError('Error', 'Failed to reject operational expense. Please try again.');
    }
  };

  // Filter sections for FilterDropdown - only Status (matches table columns)
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: { from: '', to: '' }
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
        { id: 'COMPLETED', label: 'Completed' }
      ],
      defaultValue: ''
    }
  ];

  const handleFilterApply = (appliedFilters: any) => {
    const converted: OperationalExpenseFilters = {
      dateRange: appliedFilters.dateRange,
      status: appliedFilters.status,
    };
    setFilters(converted);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Operational Expenses</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Operational Expenses</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            fetchData();
          }}
        />
      </div>
    );
  }

  // Payment status display mapping
  const getPaymentStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDING': 'Pending',
      'PENDING_REIMBURSEMENT': 'Pending Reimbursement',
      'PARTIALLY_PAID': 'Partially Paid',
      'PARTIALLY_REIMBURSED': 'Partially Reimbursed',
      'COMPLETED': 'Completed',
      'OVERDUE': 'Overdue',
      'CANCELLED': 'Cancelled',
      'WRITTEN_OFF': 'Written Off',
    };
    return labels[status] || status.replace(/_/g, ' ');
  };

  // Check if expense can have reimbursement recorded
  const canRecordReimbursement = (expense: ExpenseListItem) => {
    return expense.approval_status === 'APPROVED' &&
      expense.is_reimbursable === true &&
      (expense.payment_status === 'PENDING' ||
        expense.payment_status === 'PENDING_REIMBURSEMENT' ||
        expense.payment_status === 'PARTIALLY_REIMBURSED' ||
        expense.payment_status === 'PARTIALLY_PAID');
  };

  // Handle record reimbursement click
  const handleRecordReimbursement = (expenseId: number) => {
    // Payment methods for the modal
    const paymentMethods = [
      { id: 1, methodName: 'Cash', methodCode: 'CASH' },
      { id: 2, methodName: 'Bank Transfer', methodCode: 'BANK_TRANSFER' },
      { id: 3, methodName: 'E-Wallet', methodCode: 'E_WALLET' },
    ];

    const content = (
      <RecordReimbursementPaymentModal
        expenseId={expenseId}
        paymentMethods={paymentMethods}
        currentUser="Admin"
        onPaymentRecorded={async () => {
          await showSuccess('Payment recorded successfully!', 'Success');
          fetchData(); // Refresh the list
        }}
        onClose={closeModal}
      />
    );

    setModalContent(content);
    setIsModalOpen(true);
    setActiveRow(expenseId);
  };

  // Prepare export data - matches visible table columns exactly
  const exportData = data.map(expense => ({
    'Date Recorded': formatDate(expense.date_recorded),
    'Expense Code': expense.code,
    'Body Number': expense.body_number || '-',
    'Amount': formatMoney(expense.amount),
    'Payment Status': getPaymentStatusLabel(expense.payment_status),
    'Status': expense.approval_status,
  }));

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Operational Expenses</h1>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div className="summary-card" style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', flex: 1 }}>
            <span style={{ fontSize: '0.875rem', color: '#856404' }}>Pending</span>
            <h3 style={{ margin: '0.5rem 0', fontSize: '1.5rem' }}>{summary.pending_count}</h3>
          </div>
          <div className="summary-card" style={{ padding: '1rem', backgroundColor: '#d4edda', borderRadius: '8px', flex: 1 }}>
            <span style={{ fontSize: '0.875rem', color: '#155724' }}>Approved</span>
            <h3 style={{ margin: '0.5rem 0', fontSize: '1.5rem' }}>{summary.approved_count}</h3>
          </div>
          <div className="summary-card" style={{ padding: '1rem', backgroundColor: '#cce5ff', borderRadius: '8px', flex: 1 }}>
            <span style={{ fontSize: '0.875rem', color: '#004085' }}>Total Approved Amount</span>
            <h3 style={{ margin: '0.5rem 0', fontSize: '1.5rem' }}>{formatMoney(summary.total_approved_amount)}</h3>
          </div>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by expense code, body number, amount, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter button right next to search bar */}
            <FilterDropdown
              sections={filterSections}
              onApply={(filterValues) => {
                const dateRange = filterValues.dateRange as { from: string; to: string } || { from: '', to: '' };
                handleFilterApply({
                  dateRange,
                  status: (filterValues.status as string) || ''
                });
              }}
              initialValues={{
                dateRange: filters.dateRange ? { from: filters.dateRange.from || '', to: filters.dateRange.to || '' } : { from: '', to: '' },
                status: filters.status || ''
              }}
            />
          </div>

          <div className="filters">
            <ExportButton
              data={exportData}
              filename="operational-expenses"
              title="Operational Expenses Report"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table operational-expense-table">
              <thead>
                <tr>
                  <th>Date Recorded</th>
                  <th>Expense Code</th>
                  <th>Body Number</th>
                  <th>Amount</th>
                  <th>Payment Status</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="loading-cell">Loading...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">No operational expenses found.</td>
                  </tr>
                ) : (
                  data.map((expense) => (
                    <tr key={expense.id} className={activeRow === Number(expense.id) ? 'active-row' : ''}>
                      <td>{formatDate(expense.date_recorded)}</td>
                      <td>
                        <span className="chip expense-code">
                          {expense.code || '-'}
                        </span>
                      </td>
                      <td>{expense.body_number || '-'}</td>
                      <td className="expense-amount">{formatMoney(expense.amount)}</td>
                      <td>
                        <span className={`chip ${expense.payment_status?.toLowerCase().replace('_', '-')}`}>
                          {getPaymentStatusLabel(expense.payment_status)}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${expense.approval_status?.toLowerCase()}`}>
                          {expense.approval_status}
                        </span>
                      </td>
                      <td className="actionButtons">
                        <div className="actionButtonsContainer">
                          {/* View button - always visible */}
                          <button
                            className="viewBtn"
                            onClick={() => handleView(expense.id)}
                            title="View Details"
                          >
                            <i className="ri-eye-line"></i>
                          </button>

                          {/* Approve button - only for PENDING */}
                          {expense.approval_status === 'PENDING' && (
                            <button
                              className="approveBtn"
                              onClick={() => handleApprove(expense.id)}
                              title="Approve Expense"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                          )}

                          {/* Reject button - only for PENDING */}
                          {expense.approval_status === 'PENDING' && (
                            <button
                              className="rejectBtn"
                              onClick={() => handleReject(expense.id)}
                              title="Reject Expense"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          )}

                          {/* Edit button - PENDING or APPROVED (Unpaid/Partial) */}
                          {(expense.approval_status === 'PENDING' || (expense.approval_status === 'APPROVED' && ['PENDING', 'PARTIALLY_PAID'].includes(expense.payment_status))) && (
                            <button
                              className="editBtn"
                              onClick={() => handleEdit(expense.id)}
                              title="Edit Expense"
                            >
                              <i className="ri-pencil-line"></i>
                            </button>
                          )}

                          {/* Record Reimbursement button - for approved reimbursable expenses */}
                          {canRecordReimbursement(expense) && (
                            <button
                              className="editBtn"
                              onClick={() => handleRecordReimbursement(expense.id)}
                              title="Record Reimbursement"
                            >
                              <i className="ri-hand-coin-line"></i>
                            </button>
                          )}

                          {/* Delete button - only for PENDING */}
                          {expense.approval_status === 'PENDING' && (
                            <button
                              className="deleteBtn"
                              onClick={() => handleDelete(expense.id)}
                              title="Delete Expense"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
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
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* ModalManager for centralized modal handling */}
      <ModalManager isOpen={isModalOpen} onClose={closeModal} modalContent={modalContent} />
    </div>
  );
};

export default OperationalExpensePage;

