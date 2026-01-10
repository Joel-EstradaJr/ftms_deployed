'use client';

import React, { useState, useEffect } from 'react';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
import ModalManager from '../../../../Components/modalManager';
import RecordPaymentModal from '@/Components/RecordPaymentModal';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import PaginationComponent from '../../../../Components/pagination';
import Swal from 'sweetalert2';

import ViewPurchaseExpense from './viewPurchaseExpense';
import RecordPurchaseExpense from './recordPurchaseExpense';

import { PurchaseExpense, PurchaseExpenseFilters, PaymentStatus, ExpenseScheduleItem } from '../../../../types/expenses';
import { PaymentRecordData } from '@/app/types/payments';

import { processCascadePayment as processExpenseCascade } from '@/app/utils/expenseScheduleCalculations';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showSuccess, showError } from '../../../../utils/Alerts';

import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';

const PurchaseExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<PurchaseExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | number | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<PurchaseExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<PurchaseExpenseFilters>({});
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Payment status tracking (fetched from CashTransaction API)
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, PaymentStatus>>({});
  
  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalContent, setPaymentModalContent] = useState<React.ReactNode>(null);
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: number; methodName: string; methodCode: string }>>([
    { id: 1, methodName: 'Bank Transfer', methodCode: 'BANK' },
    { id: 2, methodName: 'Cash', methodCode: 'CASH' },
    { id: 3, methodName: 'Check', methodCode: 'CHECK' }
  ]);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Sample data for demonstration
  const samplePurchaseExpenses: PurchaseExpense[] = [
    {
      id: 'PUR-001',
      expense_code: 'EXP-PUR-2024-001',
      date: '2024-01-25',
      pr_number: 'PR-2024-001',
      pr_date: '2024-01-10',
      dr_number: 'DR-2024-001',
      dr_date: '2024-01-25',
      description: 'Bus spare parts - brake pads and filters',
      amount: 25000.00,
      category: 'Maintenance',
      budget_code: 'BUD-MAINT-2024',
      budget_allocated: 500000.00,
      budget_utilized: 125000.00,
      status: 'DELIVERED',
      receipt_number: 'REC-PUR-001',
      supplier: 'Auto Parts Supplier Inc.',
      items: [
        {
          item_name: 'Brake Pads Set',
          quantity: 10,
          unit_measure: 'sets',
          unit_cost: 1500,
          supplier: 'Auto Parts Supplier Inc.',
          subtotal: 15000,
          type: 'supply'
        },
        {
          item_name: 'Oil Filter',
          quantity: 20,
          unit_measure: 'pcs',
          unit_cost: 500,
          supplier: 'Auto Parts Supplier Inc.',
          subtotal: 10000,
          type: 'supply'
        }
      ],
      created_by: 'procurement@ftms.com',
      created_at: '2024-01-10T10:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-11T14:00:00Z',
      updated_at: '2024-01-25T16:30:00Z',
    },
    {
      id: 'PUR-002',
      expense_code: 'EXP-PUR-2024-002',
      date: '2024-01-28',
      pr_number: 'PR-2024-002',
      pr_date: '2024-01-15',
      dr_number: 'DR-2024-002',
      dr_date: '2024-01-28',
      description: 'Fuel purchase - bulk diesel for fleet',
      amount: 150000.00,
      category: 'Fuel',
      budget_code: 'BUD-FUEL-2024',
      budget_allocated: 2000000.00,
      budget_utilized: 450000.00,
      status: 'POSTED',
      receipt_number: 'REC-PUR-002',
      supplier: 'Petron Corporation',
      items: [
        {
          item_name: 'Diesel Fuel',
          quantity: 3000,
          unit_measure: 'liters',
          unit_cost: 50,
          supplier: 'Petron Corporation',
          subtotal: 150000,
          type: 'supply'
        }
      ],
      created_by: 'procurement@ftms.com',
      created_at: '2024-01-15T09:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-29T08:00:00Z',
    },
    {
      id: 'PUR-003',
      expense_code: 'EXP-PUR-2024-003',
      date: '2024-02-01',
      pr_number: 'PR-2024-003',
      pr_date: '2024-01-20',
      description: 'Office supplies and equipment',
      amount: 35000.00,
      category: 'Supplies',
      budget_code: 'BUD-ADMIN-2024',
      budget_allocated: 300000.00,
      budget_utilized: 85000.00,
      status: 'DRAFT',
      supplier: 'Office Depot',
      items: [
        {
          item_name: 'Printer Paper',
          quantity: 50,
          unit_measure: 'reams',
          unit_cost: 250,
          supplier: 'Office Depot',
          subtotal: 12500,
          type: 'supply'
        },
        {
          item_name: 'Printer Toner',
          quantity: 15,
          unit_measure: 'pcs',
          unit_cost: 1500,
          supplier: 'Office Depot',
          subtotal: 22500,
          type: 'supply'
        }
      ],
      created_by: 'admin@ftms.com',
      created_at: '2024-01-20T08:00:00Z',
      updated_at: '2024-02-01T09:00:00Z',
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
      // const response = await fetch(`/api/admin/expenses/purchase?page=${currentPage}&pageSize=${pageSize}&search=${searchTerm}&filters=${JSON.stringify(filters)}`);
      // const data = await response.json();

      // Simulate filtering on sample data
      let filtered = samplePurchaseExpenses;

      if (searchTerm) {
        filtered = filtered.filter(
          (exp) =>
            exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.pr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.dr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (filters.status) {
        filtered = filtered.filter((exp) => exp.status === filters.status);
      }

      if (filters.dateRange?.from) {
        filtered = filtered.filter((exp) => exp.date >= filters.dateRange!.from!);
      }

      if (filters.dateRange?.to) {
        filtered = filtered.filter((exp) => exp.date <= filters.dateRange!.to!);
      }

      setExpenses(filtered);
      setTotalCount(filtered.length);

      // TODO: Fetch actual payment statuses from CashTransaction API
      // const paymentStatusPromises = filtered.map(exp => 
      //   fetch(`/api/cash-transactions/payment-status?expenseId=${exp.id}&expenseType=PURCHASE`)
      // );
      // const paymentResults = await Promise.all(paymentStatusPromises);
      // const statuses = paymentResults.reduce((acc, result, idx) => {
      //   acc[filtered[idx].id] = result.payment_status;
      //   return acc;
      // }, {});
      
      // Mock payment status data for demonstration
      const mockPaymentStatuses: Record<string, PaymentStatus> = {
        'PUR-001': PaymentStatus.PAID,
        'PUR-002': PaymentStatus.PARTIALLY_PAID,
        'PUR-003': PaymentStatus.PENDING,
      };
      setPaymentStatuses(mockPaymentStatuses);
    } catch (err) {
      setError(500);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = (appliedFilters: any) => {
    const converted: PurchaseExpenseFilters = {
      dateRange: appliedFilters.dateRange,
      status: appliedFilters.status,
    };
    setFilters(converted);
    setCurrentPage(1);
  };

  const handleRowClick = (expense: PurchaseExpense) => {
    setSelectedExpense(expense);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedExpense(null);
  };

  const handleOpenEditModal = (expense: PurchaseExpense) => {
    setSelectedExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedExpense(null);
  };

  const closePaymentModal = () => {
    setPaymentModalContent(null);
    setIsPaymentModalOpen(false);
  };

  const openPaymentModal = (expense: PurchaseExpense) => {
    // For purchase expenses, create a single installment for the full amount
    const singleInstallment: ExpenseScheduleItem = {
      id: `${expense.id}-SINGLE`,
      installmentNumber: 1,
      originalDueDate: expense.date,
      currentDueDate: expense.date,
      originalDueAmount: expense.amount,
      currentDueAmount: expense.amount,
      paidAmount: 0,
      carriedOverAmount: 0,
      paymentStatus: PaymentStatus.PENDING,
      isPastDue: false,
      isEditable: false
    };

    setPaymentModalContent(
      <RecordPaymentModal
        entityType="expense"
        recordId={expense.id}
        recordRef={expense.expense_code || expense.pr_number}
        scheduleItems={[singleInstallment]}
        selectedInstallment={singleInstallment}
        paymentMethods={paymentMethods}
        currentUser="admin@ftms.com"
        onPaymentRecorded={handlePaymentRecorded}
        onClose={closePaymentModal}
        processCascadePayment={processExpenseCascade}
      />
    );

    setIsPaymentModalOpen(true);
  };

  const handlePaymentRecorded = async (paymentData: PaymentRecordData) => {
    // Update payment status locally for demo purposes
    // In production, this would call an API and refresh from server
    const { recordId, amountToPay } = paymentData;
    
    setPaymentStatuses(prev => {
      const expense = expenses.find(e => e.id === recordId);
      if (!expense) return prev;
      
      const recordIdStr = String(recordId);
      const currentPaid = expense.amount - (prev[recordIdStr] === PaymentStatus.PAID ? 0 : 
                                            prev[recordIdStr] === PaymentStatus.PARTIALLY_PAID ? expense.amount * 0.5 : 
                                            expense.amount);
      const newTotalPaid = currentPaid + amountToPay;
      const newStatus = newTotalPaid >= expense.amount ? PaymentStatus.PAID : 
                       newTotalPaid > 0 ? PaymentStatus.PARTIALLY_PAID : 
                       PaymentStatus.PENDING;
      
      return { ...prev, [recordIdStr]: newStatus };
    });

    closePaymentModal();
    
    // Refresh the view modal if it's open
    if (isViewModalOpen && selectedExpense?.id === recordId) {
      setIsViewModalOpen(false);
      setTimeout(() => {
        const updatedExpense = expenses.find(e => e.id === recordId);
        if (updatedExpense) {
          setSelectedExpense(updatedExpense);
          setIsViewModalOpen(true);
        }
      }, 100);
    }
  };

  const handleRecordPayment = (expense: PurchaseExpense) => {
    openPaymentModal(expense);
  };

  const handlePostToJEV = async (expense: PurchaseExpense) => {
    const result = await Swal.fire({
      title: 'Confirm Posting',
      text: 'Are you sure you want to post this record?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#9C27B0',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, post it!',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // TODO: Replace with actual API call to post to JEV
      // const response = await fetch(`/api/admin/expenses/purchase/${expense.id}/post-to-jev`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' }
      // });

      showSuccess(`Purchase expense ${expense.expense_code || expense.id} posted to JEV successfully`, 'Posted to JEV');
      
      // Update status to POSTED locally
      setExpenses(prev => prev.map(exp => 
        exp.id === expense.id ? { ...exp, status: 'POSTED' } : exp
      ));
    } catch (error) {
      showError('Failed to post to JEV', 'Error');
      console.error(error);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/admin/expenses/purchase/${formData.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });

      showSuccess('Purchase expense updated successfully', 'Success');
      handleCloseEditModal();
      fetchData();
    } catch (error) {
      showError('Failed to update purchase expense', 'Error');
      console.error(error);
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
      id: 'status',
      title: 'Status',
      type: 'radio',
      options: [
        { id: '', label: 'All Status' },
        { id: 'DRAFT', label: 'Draft' },
        { id: 'DELIVERED', label: 'Delivered' },
        { id: 'POSTED', label: 'Posted' },
        { id: 'CLOSED', label: 'Closed' },
        { id: 'REFUNDED', label: 'Refunded' },
        { id: 'REPLACED', label: 'Replaced' }
      ],
      defaultValue: ''
    }
  ];

  // Prepare export data
  const exportData = expenses.map((exp) => ({
    'Date': formatDate(exp.date),
    'Request Code': exp.pr_number,
    'Expense/Expense Name': exp.description,
    'Department': exp.category || 'N/A',
    'Amount': formatMoney(exp.amount),
    'Status': exp.status,
  }));

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay errorCode={error} onRetry={() => { setError(null); fetchData(); }} />;

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Purchase Expenses</h1>
        </div>

        <div className="settings">
          {/* Search bar with Filter button inline */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by date, request code, expense name, department, amount, or status..."
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
              filename="purchase-expenses"
              title="Purchase Expenses Report"
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table purchase-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Request Code</th>
                  <th>Expense/Expense Name</th>
                  <th>Department</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      No purchase expenses found
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="expense-row">
                      <td>{formatDate(expense.date)}</td>
                      <td>{expense.pr_number}</td>
                      <td>{expense.description}</td>
                      <td>{expense.category || 'N/A'}</td>
                      <td className="amount-cell">{formatMoney(expense.amount)}</td>
                      <td>
                        <span className={`chip ${expense.status.toLowerCase()}`}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="actionButtons">
                        <div className="actionButtonsContainer">
                          <button
                            className="viewBtn"
                            onClick={() => handleRowClick(expense)}
                            title="View Details"
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                          <button
                            className="editBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(expense);
                            }}
                            title={expense.status === 'POSTED' ? 'Cannot edit posted records' : 'Edit'}
                            disabled={expense.status === 'POSTED'}
                            style={expense.status === 'POSTED' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          {/* Post to JEV button - show for DELIVERED expenses */}
                          {expense.status === 'DELIVERED' && (
                            <button
                              className="submitBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePostToJEV(expense);
                              }}
                              title="Post to JEV"
                            >
                              <i className="ri-send-plane-line"></i>
                            </button>
                          )}
                          {/* Payment button - show for PENDING or PARTIALLY_PAID expenses */}
                          {paymentStatuses[expense.id] && 
                           (paymentStatuses[expense.id] === PaymentStatus.PENDING || 
                            paymentStatuses[expense.id] === PaymentStatus.PARTIALLY_PAID) && (
                            <button
                              className="payBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordPayment(expense);
                              }}
                              title={expense.status === 'POSTED' ? 'Cannot record payment for posted records' : 'Record Payment'}
                              disabled={expense.status === 'POSTED'}
                              style={expense.status === 'POSTED' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              <i className="ri-money-dollar-circle-line"></i>
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
          totalPages={Math.ceil(totalCount / pageSize)}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={() => {}}
        />
      </div>

      <ModalManager
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        modalContent={
          selectedExpense ? (
            <ViewPurchaseExpense
              expense={selectedExpense}
              onClose={handleCloseViewModal}
              onRecordPayment={() => handleRecordPayment(selectedExpense)}
            />
          ) : null
        }
      />

      <ModalManager
        isOpen={isPaymentModalOpen}
        onClose={closePaymentModal}
        modalContent={paymentModalContent}
      />

      <ModalManager
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        modalContent={
          selectedExpense ? (
            <RecordPurchaseExpense
              existingData={selectedExpense}
              onSave={handleSave}
              onClose={handleCloseEditModal}
            />
          ) : null
        }
      />
    </div>
  );
};

export default PurchaseExpensePage;
