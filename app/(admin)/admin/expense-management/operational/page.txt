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
import { OperationalExpenseFilters } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import Swal from 'sweetalert2';

// Import API service
import {
  fetchExpenses,
  fetchExpenseById,
  softDeleteExpense,
  approveExpense,
  rejectExpense,
  fetchExpenseTypes,
  syncExpenses,
  ExpenseListItem,
  ExpenseSummary,
  ExpenseType,
} from '../../../../services/operationalExpenseService';

// Transform API expense to form data format for viewing
interface OperationalExpenseViewData {
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
  status?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt?: string;
  approvedAt?: string;
  // View-only fields
  bodyNumber?: string;
  busType?: string;
  dateAssigned?: string;
  reimbursementEmployeeNumber?: string;
  reimbursementEmployeeName?: string;
  paymentMethodName?: string;
  accountCode?: string;
  accountName?: string;
}

// Transform API expense to form data format for viewing
const transformApiToFormData = (expense: any): OperationalExpenseViewData => {
  return {
    id: expense.id,
    expenseCode: expense.code || expense.expense_information?.expense_code || '',
    dateRecorded: expense.expense_information?.date_recorded || expense.date_recorded || '',
    expenseCategory: expense.expense_information?.expense_name || expense.expense_name || '',
    expenseSubcategory: '',
    amount: expense.expense_information?.amount || expense.amount || 0,
    cachedTripId: undefined,
    busPlateNumber: expense.trip_assignment_details?.plate_number || '',
    route: expense.trip_assignment_details?.route || '',
    department: '',
    receiptFile: null,
    receiptUrl: '',
    accountCodeId: expense.accounting_details?.account_id,
    paymentMethodId: 1,
    isReimbursable: !!expense.reimbursable_details,
    remarks: expense.additional_information?.remarks || expense.description || '',
    status: expense.status,
    createdBy: expense.audit_trail?.requested_by || expense.created_by || '',
    approvedBy: expense.audit_trail?.approved_by || expense.approved_by,
    createdAt: expense.audit_trail?.requested_on || expense.created_at,
    approvedAt: expense.audit_trail?.approved_on || expense.approved_at,
    // Additional view fields
    bodyNumber: expense.trip_assignment_details?.body_number || expense.body_number,
    busType: expense.trip_assignment_details?.bus_type,
    dateAssigned: expense.trip_assignment_details?.date_assigned,
    reimbursementEmployeeNumber: expense.reimbursable_details?.employee_number,
    reimbursementEmployeeName: expense.reimbursable_details?.creditor_name,
    paymentMethodName: expense.expense_information?.payment_method || expense.payment_method,
    accountCode: expense.accounting_details?.account_code,
    accountName: expense.accounting_details?.account_name,
  };
};

const OperationalExpensePage = () => {
  // State management
  const [data, setData] = useState<ExpenseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
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

  // Reference data states (for filters)
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

  // ModalManager states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  // Load reference data on mount (expense types for filter)
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const types = await fetchExpenseTypes();
        setExpenseTypes(types);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };
    loadReferenceData();
  }, []);

  // Fetch expenses data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchExpenses({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        date_from: filters.dateRange?.from || undefined,
        date_to: filters.dateRange?.to || undefined,
        status: filters.status ? [filters.status] : undefined,
        // Map expense_type filter to expense_name
        expense_name: filters.expense_type || undefined,
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
  }, [currentPage, pageSize, filters, searchTerm]);

  // Load employees when reimbursable section needs them
  const loadEmployees = async (search?: string) => {
    try {
      const employeeList = await fetchEmployees(search);
      setEmployees(employeeList);
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  // Modal management functions
  const openModal = async (mode: 'view', rowData: ExpenseListItem) => {
    let content: React.ReactNode = null;

    // Fetch full details for view
    const fullDetails = await fetchExpenseById(rowData.id);
    if (!fullDetails) {
      await showError('Error', 'Failed to load expense details');
      return;
    }

    const expenseData = transformApiToFormData(fullDetails);

    content = (
      <ViewOperationalExpenseModal
        expenseData={expenseData}
        onClose={closeModal}
      />
    );

    setModalContent(content);
    setIsModalOpen(true);
    setActiveRow(Number(rowData.id));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  // Handle sync from external APIs
  const handleSync = async () => {
    try {
      const confirmed = await showConfirmation(
        'Sync Expenses',
        'This will fetch the latest operational and rental trip expenses from the external BOMS system. Continue?'
      );

      if (!confirmed) return;

      setSyncing(true);

      const result = await syncExpenses();

      const totalNew = (result.operational?.new_expenses_created || 0) + (result.rental?.new_expenses_created || 0);
      const totalUpdated = (result.operational?.expenses_updated || 0) + (result.rental?.expenses_updated || 0);
      const totalErrors = (result.operational?.errors?.length || 0) + (result.rental?.errors?.length || 0);

      if (totalErrors > 0) {
        await Swal.fire({
          title: 'Sync Completed with Warnings',
          html: `
            <div style="text-align: left;">
              <p><strong>New expenses:</strong> ${totalNew}</p>
              <p><strong>Updated:</strong> ${totalUpdated}</p>
              <p style="color: #dc3545;"><strong>Errors:</strong> ${totalErrors}</p>
            </div>
          `,
          icon: 'warning',
        });
      } else {
        await showSuccess(
          'Sync Complete',
          `Successfully synced ${totalNew} new expenses and updated ${totalUpdated} existing expenses.`
        );
      }

      fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error syncing expenses:', error);
      await showError('Sync Failed', 'Failed to sync expenses from external system. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // Action handlers
  const handleView = (id: number) => {
    const expense = data.find(item => item.id === id);
    if (expense) {
      openModal('view', expense);
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
            <br>• Debit: Fuel Expense (4000)
            <br>• Credit: Cash on Hand (1010)
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

  // Filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'expense_type',
      title: 'Expense Type',
      type: 'radio',
      options: [
        { id: '', label: 'All Types' },
        ...expenseTypes.map(et => ({ id: et.name, label: et.name }))
      ],
      defaultValue: ''
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
      expense_type: appliedFilters.expense_type,
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

  // Prepare export data
  const exportData = data.map(expense => ({
    'Date': formatDate(expense.date_recorded),
    'Expense Type': expense.expense_name,
    'Body Number': expense.body_number || expense.operational_trip?.body_number || '-',
    'Amount': formatMoney(expense.amount),
    'Reimbursable': expense.is_reimbursable ? 'Yes' : 'No',
    'Status': expense.status,
    'Code': expense.code
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
                placeholder="Search expense name, body number, code..."
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
                  expense_type: (filterValues.expense_type as string) || '',
                  status: (filterValues.status as string) || ''
                });
              }}
              initialValues={{
                dateRange: filters.dateRange ? { from: filters.dateRange.from || '', to: filters.dateRange.to || '' } : { from: '', to: '' },
                expense_type: filters.expense_type || '',
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
            {/* Sync Button - Fetch expenses from external BOMS API */}
            <button 
              className="addButton" 
              onClick={handleSync}
              disabled={syncing}
              title="Sync expenses from external BOMS system"
            >
              <i className={syncing ? "ri-loader-4-line" : "ri-refresh-line"} /> 
              {syncing ? 'Syncing...' : 'Sync Expenses'}
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table operational-expense-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense</th>
                  <th>Body Number</th>
                  <th>Amount</th>
                  <th>Reimbursable</th>
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
                        <span className={`chip ${expense.expense_name?.toLowerCase().replace(/\s+/g, '_') || ''}`}>
                          {expense.expense_name || '-'}
                        </span>
                      </td>
                      <td>{expense.body_number || expense.operational_trip?.body_number || '-'}</td>
                      <td className="expense-amount">{formatMoney(expense.amount)}</td>
                      <td>
                        <span className={`chip ${expense.is_reimbursable ? 'reimbursable' : 'not-reimbursable'}`}>
                          {expense.is_reimbursable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${expense.status?.toLowerCase()}`}>
                          {expense.status}
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
                          {expense.status === 'PENDING' && (
                            <button
                              className="approveBtn"
                              onClick={() => handleApprove(expense.id)}
                              title="Approve Expense"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                          )}

                          {/* Reject button - only for PENDING */}
                          {expense.status === 'PENDING' && (
                            <button
                              className="rejectBtn"
                              onClick={() => handleReject(expense.id)}
                              title="Reject Expense"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          )}

                          {/* Delete button - only for PENDING */}
                          {expense.status === 'PENDING' && (
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
