'use client';

import React, { useState, useEffect } from 'react';
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

import { AdministrativeExpense, AdministrativeExpenseFilters, PaymentStatus, ExpenseScheduleItem, ExpenseScheduleFrequency } from '../../../../types/expenses';
import { PaymentRecordData } from '@/app/types/payments';




const AdministrativeExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<AdministrativeExpense[]>([]);
  const [allExpenses, setAllExpenses] = useState<AdministrativeExpense[]>([]); // Store all expenses separately
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | number | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<AdministrativeExpense | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<AdministrativeExpenseFilters>({});

  // Modal states using ModalManager pattern
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<AdministrativeExpense | null>(null);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedScheduleItem, setSelectedScheduleItem] = useState<any | null>(null);
  const [selectedExpenseRecord, setSelectedExpenseRecord] = useState<AdministrativeExpense | null>(null);
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
  const sampleAdministrativeExpenses: AdministrativeExpense[] = [
    {
      id: 'ADM-001',
      date: '2024-01-15',
      expense_type: 'OFFICE_SUPPLIES',
      category: 'OFFICE_SUPPLIES',
      subcategory: 'Paper & Pens',
      description: 'Printer paper, pens, and office supplies for admin office',
      amount: 2500.00,
      department: 'Administration',
      vendor: 'Office Depot',
      invoice_number: 'INV-2024-001',
      isPrepaid: false,
      paymentStatus: PaymentStatus.PAID,
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
      category: 'UTILITIES',
      subcategory: 'Electricity',
      description: 'Monthly electricity bill for main office',
      amount: 15000.00,
      department: 'Administration',
      vendor: 'Electric Company',
      invoice_number: 'INV-ELEC-JAN-2024',
      isPrepaid: false,
      paymentStatus: PaymentStatus.PENDING,
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
    {
      id: 'ADM-003',
      date: '2024-02-01',
      expense_type: 'INSURANCE',
      category: 'INSURANCE',
      subcategory: 'Vehicle Insurance',
      description: 'Annual vehicle insurance premium - 12 monthly installments',
      amount: 60000.00,
      department: 'Administration',
      vendor: 'Insurance Corp',
      invoice_number: 'INV-INS-2024-001',
      isPrepaid: true,
      frequency: ExpenseScheduleFrequency.MONTHLY,
      startDate: '2024-02-15',
      paymentStatus: PaymentStatus.PARTIALLY_PAID,
      scheduleItems: [
        {
          id: 'SCH-003-1',
          installmentNumber: 1,
          originalDueDate: '2024-02-15',
          currentDueDate: '2024-02-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 5000,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PAID,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-2',
          installmentNumber: 2,
          originalDueDate: '2024-03-15',
          currentDueDate: '2024-03-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 3000,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PARTIALLY_PAID,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-3',
          installmentNumber: 3,
          originalDueDate: '2024-04-15',
          currentDueDate: '2024-04-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-4',
          installmentNumber: 4,
          originalDueDate: '2024-05-15',
          currentDueDate: '2024-05-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-5',
          installmentNumber: 5,
          originalDueDate: '2024-06-15',
          currentDueDate: '2024-06-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-6',
          installmentNumber: 6,
          originalDueDate: '2024-07-15',
          currentDueDate: '2024-07-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-7',
          installmentNumber: 7,
          originalDueDate: '2024-08-15',
          currentDueDate: '2024-08-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-8',
          installmentNumber: 8,
          originalDueDate: '2024-09-15',
          currentDueDate: '2024-09-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-9',
          installmentNumber: 9,
          originalDueDate: '2024-10-15',
          currentDueDate: '2024-10-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-10',
          installmentNumber: 10,
          originalDueDate: '2024-11-15',
          currentDueDate: '2024-11-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-11',
          installmentNumber: 11,
          originalDueDate: '2024-12-15',
          currentDueDate: '2024-12-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        },
        {
          id: 'SCH-003-12',
          installmentNumber: 12,
          originalDueDate: '2025-01-15',
          currentDueDate: '2025-01-15',
          originalDueAmount: 5000,
          currentDueAmount: 5000,
          paidAmount: 0,
          carriedOverAmount: 0,
          paymentStatus: PaymentStatus.PENDING,
          isPastDue: false,
          isEditable: false
        }
      ],
      items: [
        {
          item_name: 'Vehicle Insurance Premium',
          quantity: 12,
          unit_measure: 'months',
          unit_cost: 5000,
          supplier: 'Insurance Corp',
          subtotal: 60000,
          type: 'service'
        }
      ],
      created_by: 'admin@ftms.com',
      created_at: '2024-02-01T10:00:00Z',
      approved_by: 'manager@ftms.com',
      approved_at: '2024-02-01T15:00:00Z',
      updated_at: '2024-03-20T11:30:00Z',
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

      // Simulate filtering on sample data from allExpenses (or initialize if empty)
      const baseData = allExpenses.length > 0 ? allExpenses : sampleAdministrativeExpenses;
      
      // Update allExpenses if this is first load
      if (allExpenses.length === 0) {
        setAllExpenses(sampleAdministrativeExpenses);
      }

      let filtered = [...baseData];

      if (searchTerm) {
        filtered = filtered.filter(
          (exp) =>
            exp.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.date?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exp.paymentStatus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(exp.amount).includes(searchTerm)
        );
      }

      if (filters.status) {
        filtered = filtered.filter((exp) => exp.paymentStatus === filters.status);
      }

      if (filters.amountRange?.min) {
        filtered = filtered.filter((exp) => exp.amount >= Number(filters.amountRange.min));
      }

      if (filters.amountRange?.max) {
        filtered = filtered.filter((exp) => exp.amount <= Number(filters.amountRange.max));
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

    setModalContent(
      <RecordPaymentModal
        entityType="expense"
        recordId={expense.id}
        recordRef={expense.invoice_number}
        scheduleItems={(expense.scheduleItems || []).map(i => ({ ...(i as any) }))}
        selectedInstallment={scheduleItem}
        paymentMethods={paymentMethods}
        currentUser={expense.created_by}
        onPaymentRecorded={handlePaymentRecorded}
        onClose={closePaymentModal}
        processCascadePayment={processExpenseCascade}
      />
    );

    setIsPaymentModalOpen(true);
    setIsModalOpen(true);
  };

  const handlePaymentRecorded = async (paymentData: PaymentRecordData) => {
    // Update the local state with the payment result for demo/mock purposes
    // In production, this should call an API and refresh the data
    const { scheduleItemId, cascadeBreakdown } = paymentData;

    setExpenses(prev => {
      return prev.map(exp => {
        if (exp.id !== paymentData.recordId) return exp;
        const items = exp.scheduleItems?.map(item => {
          // If the schedule item is affected by the cascade, update its paidAmount
          const affected = cascadeBreakdown?.find((a: any) => a.scheduleItemId === item.id);
          if (affected) {
            const newPaid = (item.paidAmount || 0) + affected.amountApplied;
            return {
              ...item,
              paidAmount: newPaid,
              paymentStatus: newPaid >= item.currentDueAmount ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID
            };
          }
          return item;
        }) || [];
        // Recompute overall paymentStatus and remainingBalance
        const totalPaid = items.reduce((s: any, i: any) => s + (i.paidAmount || 0), 0);
        const remainingBalance = (exp.amount || 0) - totalPaid;
        const newPaymentStatus = remainingBalance <= 0 ? PaymentStatus.PAID : totalPaid > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PENDING;

        return {
          ...exp,
          scheduleItems: items,
          remainingBalance,
          paymentStatus: newPaymentStatus
        };
      });
    });

    closePaymentModal();
  };

  // Open modal with different modes
  const openModal = (mode: 'view' | 'add' | 'edit', rowData?: AdministrativeExpense) => {
    if (rowData) {
      setActiveRow(rowData);
    }

    if (mode === 'view' && rowData) {
      setModalContent(
        <ViewAdminExpenseModal
          data={rowData}
          onClose={closeModal}
          onEdit={(data) => openModal('edit', data)}
          onRecordPayment={(scheduleItem?: ExpenseScheduleItem) => {
            // Default to earliest pending installment if none passed
            const pendingItem = scheduleItem || (rowData.scheduleItems || []).find((it: ExpenseScheduleItem) => it.paymentStatus === PaymentStatus.PENDING || it.paymentStatus === PaymentStatus.PARTIALLY_PAID);
            if (pendingItem) openPaymentModal(pendingItem, rowData);
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
        />
      );
    } else if (mode === 'edit' && rowData) {
      setModalContent(
        <RecordAdminExpenseModal
          mode="edit"
          existingData={rowData}
          onSave={handleSave}
          onClose={closeModal}
          currentUser="admin@ftms.com"
        />
      );
    }

    setIsModalOpen(true);
  };

  const handleSave = (formData: AdministrativeExpense, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      const newExpense = {
        ...formData,
        id: `ADM-${Date.now()}`, // Mock ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setExpenses(prev => [newExpense, ...prev]);
    } else {
      setExpenses(prev => prev.map(exp => exp.id === formData.id ? formData : exp));
    }
    closeModal();
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
    // For prepaid expenses with schedule items, find the first pending installment
    if (expense.isPrepaid && expense.scheduleItems && expense.scheduleItems.length > 0) {
      const pendingItem = expense.scheduleItems.find(
        item => item.paymentStatus === PaymentStatus.PENDING || item.paymentStatus === PaymentStatus.PARTIALLY_PAID
      );
      if (pendingItem) {
        openPaymentModal(pendingItem, expense);
      }
    } else {
      // For non-prepaid expenses, create a single installment for payment
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
      
      // Create a temporary expense object with schedule for payment modal
      const expenseWithSchedule = {
        ...expense,
        scheduleItems: [singleInstallment]
      };
      
      openPaymentModal(singleInstallment, expenseWithSchedule);
    }
  };

  const handlePostToJEV = async (expense: AdministrativeExpense) => {
    const result = await Swal.fire({
      title: 'Post to JEV?',
      text: `Are you sure you want to post ${expense.invoice_number || expense.id} to the Journal Entry Voucher?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, post it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // TODO: Replace with actual API call
        // await fetch(`/api/admin/expenses/administrative/${expense.id}/post-to-jev`, { method: 'POST' });
        
        // Update both allExpenses and expenses state to mark as POSTED
        setAllExpenses(prev => prev.map(exp => 
          exp.id === expense.id 
            ? { ...exp, status: 'POSTED' } 
            : exp
        ));
        
        setExpenses(prev => prev.map(exp => 
          exp.id === expense.id 
            ? { ...exp, status: 'POSTED' } 
            : exp
        ));
        
        showSuccess('Success', 'Expense has been posted to JEV successfully.');
      } catch (error) {
        console.error('Error posting to JEV:', error);
        showError('Error', 'Failed to post expense to JEV. Please try again.');
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
        { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
        { id: 'PAID', label: 'Paid' },
        { id: 'OVERDUE', label: 'Overdue' },
        { id: 'CANCELLED', label: 'Cancelled' }
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
                placeholder="Search by request code, expense name, department..."
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
                      <td>{formatDate(expense.date)}</td>
                      <td>{expense.id}</td>
                      <td>{expense.vendor || '-'}</td>
                      <td>{expense.department || '-'}</td>
                      <td>{formatMoney(expense.amount)}</td>
                      <td>
                        {expense.paymentStatus ? (
                          <span className={`chip ${expense.paymentStatus.toLowerCase().replace('_', '-')}`}>
                            {expense.paymentStatus.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="chip pending">PENDING</span>
                        )}
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
                          <button
                            className="editBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(expense);
                            }}
                            title="Edit"
                            disabled={expense.status === 'POSTED'}
                            style={expense.status === 'POSTED' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          {/* Payment button - show for PENDING or PARTIALLY_PAID expenses, disable when POSTED */}
                          {expense.paymentStatus && 
                           (expense.paymentStatus === PaymentStatus.PENDING || 
                            expense.paymentStatus === PaymentStatus.PARTIALLY_PAID) && (
                            <button
                              className="payBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordPayment(expense);
                              }}
                              title="Record Payment"
                              disabled={expense.status === 'POSTED'}
                              style={expense.status === 'POSTED' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              <i className="ri-money-dollar-circle-line"></i>
                            </button>
                          )}
                          {/* Post to JEV button - show for PAID expenses */}
                          {expense.paymentStatus === PaymentStatus.PAID && expense.status !== 'POSTED' && (
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
