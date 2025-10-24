'use client';

import React, { useState, useEffect } from 'react';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
import AdminExpenseViewModal from './AdminExpenseViewModal';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import PaginationComponent from '../../../../Components/pagination';
import { AdministrativeExpense, AdministrativeExpenseFilters } from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import '../../../../styles/expense-management/administrative.css';

const AdministrativeExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<AdministrativeExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | number | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<AdministrativeExpense | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('view');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<AdministrativeExpenseFilters>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Sample data for demonstration
  const sampleAdministrativeExpenses: AdministrativeExpense[] = [
    {
      id: 'ADM-001',
      date: '2024-01-15',
      expense_type: 'OFFICE_SUPPLIES',
      description: 'Printer paper, pens, and office supplies for admin office',
      amount: 2500.00,
      department: 'Administration',
      vendor: 'Office Depot',
      invoice_number: 'INV-2024-001',
      items: [
        {
          item_name: 'Printer Paper',
          quantity: 20,
          unit_measure: 'boxes',
          unit_cost: 100,
          supplier: 'Office Depot',
          subtotal: 2000,
          type: 'supply'
        },
        {
          item_name: 'Ballpoint Pens',
          quantity: 50,
          unit_measure: 'pcs',
          unit_cost: 10,
          supplier: 'Office Depot',
          subtotal: 500,
          type: 'supply'
        }
      ],
      created_by: 'admin@ftms.com',
      created_at: '2024-01-15T08:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-15T14:30:00Z',
      updated_at: '2024-01-15T14:30:00Z',
    },
    {
      id: 'ADM-002',
      date: '2024-01-20',
      expense_type: 'UTILITIES',
      description: 'Monthly electricity bill for main office',
      amount: 15000.00,
      department: 'Administration',
      vendor: 'Electric Company',
      invoice_number: 'INV-ELEC-JAN-2024',
      items: [
        {
          item_name: 'Electricity Consumption',
          quantity: 1,
          unit_measure: 'months',
          unit_cost: 15000,
          supplier: 'Electric Company',
          subtotal: 15000,
          type: 'service'
        }
      ],
      created_by: 'admin@ftms.com',
      created_at: '2024-01-20T09:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-20T16:00:00Z',
      updated_at: '2024-01-21T10:00:00Z',
    },
  ];

  useEffect(() => {
    fetchData();
  }, [currentPage, filters, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/admin/expenses/administrative?page=${currentPage}&pageSize=${pageSize}&search=${searchTerm}&filters=${JSON.stringify(filters)}`);
      // const data = await response.json();

      // Simulate filtering on sample data
      let filtered = sampleAdministrativeExpenses;

      if (searchTerm) {
        filtered = filtered.filter(
          (exp) =>
            exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (filters.expense_type) {
        filtered = filtered.filter((exp) => exp.expense_type === filters.expense_type);
      }

      if (filters.dateRange?.from) {
        filtered = filtered.filter((exp) => exp.date >= filters.dateRange!.from!);
      }

      if (filters.dateRange?.to) {
        filtered = filtered.filter((exp) => exp.date <= filters.dateRange!.to!);
      }

      setExpenses(filtered);
      setTotalCount(filtered.length);
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
      expense_type: appliedFilters.expense_type,
    };
    setFilters(converted);
    setCurrentPage(1);
  };

  const handleRowClick = (expense: AdministrativeExpense) => {
    setSelectedExpense(expense);
  };

  const handleCloseModal = () => {
    // Clear selected expense and reset modal mode so the modal unmounts
    setSelectedExpense(null);
    setModalMode('view');
  };

  // Filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      icon: 'ri-calendar-line',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'expense_type',
      title: 'Expense Type',
      type: 'radio',
      icon: 'ri-folder-line',
      options: [
        { id: '', label: 'All Types' },
        { id: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
        { id: 'UTILITIES', label: 'Utilities' },
        { id: 'PROFESSIONAL_FEES', label: 'Professional Fees' },
        { id: 'INSURANCE', label: 'Insurance' },
        { id: 'LICENSING', label: 'Licensing' },
        { id: 'PERMITS', label: 'Permits' },
        { id: 'GENERAL_ADMIN', label: 'General Admin' }
      ],
      defaultValue: ''
    }
  ];

  // Prepare export data
  const exportData = expenses.map((exp) => ({
    Date: formatDate(exp.date),
    'Expense Type': exp.expense_type.replace(/_/g, ' '),
    Department: exp.department || 'N/A',
    Vendor: exp.vendor || 'N/A',
    'Invoice Number': exp.invoice_number || 'N/A',
    Description: exp.description,
    Amount: formatMoney(exp.amount),
  }));

  if (loading) return <Loading />;
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
                placeholder="Search by description, department, vendor, or invoice..."
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
                });
              }}
              initialValues={{
                dateRange: filters.dateRange ? { from: filters.dateRange.from || '', to: filters.dateRange.to || '' } : { from: '', to: '' },
                expense_type: filters.expense_type || '',
              }}
              title="Administrative Expense Filters"
            />
          </div>

          <div className="filters">
            <ExportButton
              data={exportData}
              filename="administrative-expenses"
              title="Administrative Expenses Report"
            />
            <button 
              className="addExpenseBtn"
              onClick={() => {
                setSelectedExpense(null);
                setModalMode('add');
              }}
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
                  <th>Expense Type</th>
                  <th>Vendor</th>
                  <th>Invoice Number</th>
                  <th>Description</th>
                  <th>Amount</th>
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
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpense(expense);
                                setModalMode('view');
                              }}
                      title="View Expense"
                    >
                      <td>{formatDate(expense.date)}</td>
                      <td>
                        <span className={`chip ${expense.expense_type.toLowerCase()}`}>
                          {expense.expense_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{expense.vendor || 'N/A'}</td>
                      <td>{expense.invoice_number || 'N/A'}</td>
                      <td className="description-cell">{expense.description}</td>
                      <td className="amount-cell">{formatMoney(expense.amount)}</td>
                      <td>
                        <div className="actionButtons">
                          <div className="actionButtonsContainer">
                            <button
                              className="editBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExpense(expense);
                                setModalMode('edit');
                              }}
                              title="Edit Expense"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                          </div>
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
          onPageSizeChange={() => {}}
        />
      </div>

      {(selectedExpense || modalMode === 'add') && (
        <AdminExpenseViewModal 
          mode={modalMode}
          expense={selectedExpense}
          onClose={handleCloseModal}
          onSave={(updatedExpense) => {
            if (modalMode === 'add') {
              // Add new expense to the list
              setExpenses(prev => [updatedExpense, ...prev]);
            } else if (modalMode === 'edit') {
              // Update existing expense
              setExpenses(prev => prev.map(exp => 
                exp.id === updatedExpense.id ? updatedExpense : exp
              ));
            }
            setSelectedExpense(null);
            setModalMode('view');
          }}
        />
      )}
    </div>
  );
};

export default AdministrativeExpensePage;
