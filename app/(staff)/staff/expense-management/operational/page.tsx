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

  ExpenseListItem,
  ExpenseSummary,
} from '../../../../services/operationalExpenseService';

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
  status?: string;
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
    status: expense.status,
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

  // Prepare export data - matches visible table columns exactly
  const exportData = data.map(expense => ({
    'Date Recorded': formatDate(expense.date_recorded),
    'Expense Code': expense.code,
    'Body Number': expense.body_number || '-',
    'Amount': formatMoney(expense.amount),
    'Reimbursable': expense.is_reimbursable ? 'Yes' : 'No',
    'Status': expense.status,
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
                        <span className="chip expense-code">
                          {expense.code || '-'}
                        </span>
                      </td>
                      <td>{expense.body_number || '-'}</td>
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
