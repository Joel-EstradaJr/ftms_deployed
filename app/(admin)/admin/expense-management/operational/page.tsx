'use client';

import React, { useState, useEffect } from 'react';
import '../../../../styles/expense-management/operational.css';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import PaginationComponent from '../../../../Components/pagination';
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import ExportButton from '../../../../Components/ExportButton';
import ModalManager from '../../../../Components/modalManager';
import RecordOperationalExpenseModal, { OperationalExpenseData } from './recordOperationalExpense';
import ViewOperationalExpenseModal from './viewOperationalExpense';
import { 
  OperationalExpense, 
  OperationalExpenseFilters, 
  OperationalExpenseType,
  ExpenseStatus 
} from '../../../../types/expenses';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import Swal from 'sweetalert2';

// Mock Data - Departments
const MOCK_DEPARTMENTS = [
  { id: 1, name: 'Operations' },
  { id: 2, name: 'Finance' },
  { id: 3, name: 'Human Resources' },
  { id: 4, name: 'Marketing' },
  { id: 5, name: 'Maintenance' },
  { id: 6, name: 'Administration' }
];

// Mock Data - Payment Methods
const MOCK_PAYMENT_METHODS = [
  { id: 1, methodName: 'Cash', methodCode: 'CASH' },
  { id: 2, methodName: 'Bank Transfer', methodCode: 'BANK' },
  { id: 3, methodName: 'Credit Card', methodCode: 'CC' },
  { id: 4, methodName: 'Debit Card', methodCode: 'DC' },
  { id: 5, methodName: 'Check', methodCode: 'CHECK' },
  { id: 6, methodName: 'Company Account', methodCode: 'COMP' }
];

// Mock Data - Cached Trips
const MOCK_CACHED_TRIPS = [
  { id: 1, busPlateNumber: 'ABC-123', route: 'Manila - Baguio', departmentId: 1, departmentName: 'Operations' },
  { id: 2, busPlateNumber: 'DEF-456', route: 'Manila - Batangas', departmentId: 1, departmentName: 'Operations' },
  { id: 3, busPlateNumber: 'GHI-789', route: 'Manila - Bicol', departmentId: 1, departmentName: 'Operations' },
  { id: 4, busPlateNumber: 'JKL-012', route: 'Manila - Tuguegarao', departmentId: 1, departmentName: 'Operations' },
  { id: 5, busPlateNumber: 'MNO-345', route: 'Manila - Pangasinan', departmentId: 1, departmentName: 'Operations' },
  { id: 6, busPlateNumber: 'PQR-678', route: 'Manila - Ilocos', departmentId: 1, departmentName: 'Operations' },
  { id: 7, busPlateNumber: 'STU-901', route: 'Manila - Camarines Sur', departmentId: 1, departmentName: 'Operations' },
  { id: 8, busPlateNumber: 'VWX-234', route: 'Manila - Nueva Ecija', departmentId: 1, departmentName: 'Operations' },
];

// Mock Data - Chart of Accounts (Expense accounts only)
const MOCK_CHART_OF_ACCOUNTS = [
  { id: 1, accountCode: '5001', accountName: 'Fuel Expense' },
  { id: 2, accountCode: '5002', accountName: 'Toll Fees' },
  { id: 3, accountCode: '5003', accountName: 'Parking Fees' },
  { id: 4, accountCode: '5004', accountName: 'Driver Allowances' },
  { id: 5, accountCode: '5005', accountName: 'Petty Cash Expense' },
  { id: 6, accountCode: '5006', accountName: 'Violation Penalties' },
  { id: 7, accountCode: '5007', accountName: 'Terminal Fees' },
  { id: 8, accountCode: '5010', accountName: 'Operational Supplies' },
  { id: 9, accountCode: '5011', accountName: 'Vehicle Maintenance' },
  { id: 10, accountCode: '5012', accountName: 'Miscellaneous Expense' }
];

// Mock Data - Employees
const MOCK_EMPLOYEES = [
  { employee_id: '1', name: 'Juan Dela Cruz', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0001' },
  { employee_id: '2', name: 'Maria Santos', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0002' },
  { employee_id: '3', name: 'Pedro Reyes', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0003' },
  { employee_id: '4', name: 'Rosa Garcia', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0004' },
  { employee_id: '5', name: 'Antonio Lopez', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0005' },
  { employee_id: '6', name: 'Linda Cruz', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0006' },
  { employee_id: '7', name: 'Carlos Mendoza', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0007' },
  { employee_id: '8', name: 'Miguel Torres', job_title: 'Driver', department: 'Operations', employee_number: 'EMP-0008' },
  { employee_id: '9', name: 'Ana Villanueva', job_title: 'Conductor', department: 'Operations', employee_number: 'EMP-0009' },
  { employee_id: '10', name: 'Roberto Cruz', job_title: 'Mechanic', department: 'Maintenance', employee_number: 'EMP-0010' },
  { employee_id: '11', name: 'Elena Martinez', job_title: 'Accountant', department: 'Finance', employee_number: 'EMP-0011' },
  { employee_id: '12', name: 'Jose Fernandez', job_title: 'HR Officer', department: 'Human Resources', employee_number: 'EMP-0012' }
];

// Transform backend record to form data
const transformRecordToFormData = (record: OperationalExpense): OperationalExpenseData => {
  return {
    id: Number(record.id),
    expenseCode: record.receipt_number || '',
    dateRecorded: record.date,
    expenseCategory: record.expense_type,
    expenseSubcategory: record.category || '',
    amount: record.amount,
    cachedTripId: record.bus_id ? Number(record.bus_id) : undefined,
    busPlateNumber: record.bus_number || '',
    route: '', // Not in current structure
    department: '', // Not in current structure
    receiptFile: null,
    receiptUrl: '', // Not in current structure
    accountCodeId: undefined,
    paymentMethodId: 1, // Default to Cash
    isReimbursable: false,
    remarks: record.description || '',
    status: record.status,
    createdBy: record.created_by,
    approvedBy: record.approved_by,
    createdAt: record.created_at,
    approvedAt: record.approved_at,
  };
};

// Sample data for demonstration (20 comprehensive records)
const sampleOperationalExpenses: OperationalExpense[] = [
  {
    id: '1',
    expense_type: OperationalExpenseType.FUEL,
    date: '2025-11-14',
    amount: 5000,
    description: 'Diesel fuel for Bus ABC-123',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '1',
    bus_number: 'ABC-123',
    employee_id: '1',
    employee_name: 'Juan Dela Cruz',
    receipt_number: 'EXP-OP-001',
    created_by: 'driver_001',
    approved_by: 'admin',
    created_at: '2025-11-14T08:00:00Z',
    approved_at: '2025-11-14T09:00:00Z',
    updated_at: '2025-11-14T09:00:00Z'
  },
  {
    id: '2',
    expense_type: OperationalExpenseType.TOLL,
    date: '2025-11-13',
    amount: 350,
    description: 'Skyway toll fee - Manila to Batangas',
    category: 'Transportation',
    status: ExpenseStatus.PENDING,
    bus_id: '2',
    bus_number: 'DEF-456',
    employee_id: '2',
    employee_name: 'Maria Santos',
    receipt_number: 'EXP-OP-002',
    created_by: 'driver_002',
    created_at: '2025-11-13T14:30:00Z',
    updated_at: '2025-11-13T14:30:00Z'
  },
  {
    id: '3',
    expense_type: OperationalExpenseType.PARKING,
    date: '2025-11-13',
    amount: 150,
    description: 'Terminal parking fee',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '3',
    bus_number: 'GHI-789',
    employee_id: '3',
    employee_name: 'Pedro Reyes',
    receipt_number: 'EXP-OP-003',
    created_by: 'driver_003',
    approved_by: 'supervisor_01',
    created_at: '2025-11-13T10:15:00Z',
    approved_at: '2025-11-13T11:00:00Z',
    updated_at: '2025-11-13T11:00:00Z'
  },
  {
    id: '4',
    expense_type: OperationalExpenseType.ALLOWANCES,
    date: '2025-11-12',
    amount: 800,
    description: 'Driver meal allowance - long trip',
    category: 'Allowances',
    status: ExpenseStatus.POSTED,
    bus_id: '4',
    bus_number: 'JKL-012',
    employee_id: '4',
    employee_name: 'Rosa Garcia',
    receipt_number: 'EXP-OP-004',
    created_by: 'driver_004',
    approved_by: 'admin',
    created_at: '2025-11-12T18:00:00Z',
    approved_at: '2025-11-12T18:30:00Z',
    updated_at: '2025-11-12T19:00:00Z'
  },
  {
    id: '5',
    expense_type: OperationalExpenseType.FUEL,
    date: '2025-11-12',
    amount: 4500,
    description: 'Premium diesel for express service',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '5',
    bus_number: 'MNO-345',
    employee_id: '5',
    employee_name: 'Antonio Lopez',
    receipt_number: 'EXP-OP-005',
    created_by: 'driver_005',
    approved_by: 'supervisor_01',
    created_at: '2025-11-12T07:30:00Z',
    approved_at: '2025-11-12T08:00:00Z',
    updated_at: '2025-11-12T08:00:00Z'
  },
  {
    id: '6',
    expense_type: OperationalExpenseType.PETTY_CASH,
    date: '2025-11-11',
    amount: 500,
    description: 'Emergency repair supplies',
    category: 'Maintenance',
    status: ExpenseStatus.APPROVED,
    bus_id: '6',
    bus_number: 'PQR-678',
    employee_id: '6',
    employee_name: 'Linda Cruz',
    receipt_number: 'EXP-OP-006',
    created_by: 'driver_006',
    approved_by: 'admin',
    created_at: '2025-11-11T13:45:00Z',
    approved_at: '2025-11-11T14:00:00Z',
    updated_at: '2025-11-11T14:00:00Z'
  },
  {
    id: '7',
    expense_type: OperationalExpenseType.TERMINAL_FEES,
    date: '2025-11-11',
    amount: 200,
    description: 'Provincial terminal entrance fee',
    category: 'Transportation',
    status: ExpenseStatus.PENDING,
    bus_id: '7',
    bus_number: 'STU-901',
    employee_id: '7',
    employee_name: 'Carlos Mendoza',
    receipt_number: 'EXP-OP-007',
    created_by: 'driver_007',
    created_at: '2025-11-11T16:20:00Z',
    updated_at: '2025-11-11T16:20:00Z'
  },
  {
    id: '8',
    expense_type: OperationalExpenseType.VIOLATIONS,
    date: '2025-11-10',
    amount: 1000,
    description: 'Traffic violation penalty',
    category: 'Penalties',
    status: ExpenseStatus.REJECTED,
    bus_id: '8',
    bus_number: 'VWX-234',
    employee_id: '8',
    employee_name: 'Miguel Torres',
    receipt_number: 'EXP-OP-008',
    created_by: 'driver_008',
    created_at: '2025-11-10T11:00:00Z',
    updated_at: '2025-11-10T12:00:00Z'
  },
  {
    id: '9',
    expense_type: OperationalExpenseType.FUEL,
    date: '2025-11-10',
    amount: 5200,
    description: 'Diesel refuel at Petron station',
    category: 'Transportation',
    status: ExpenseStatus.POSTED,
    bus_id: '1',
    bus_number: 'ABC-123',
    employee_id: '1',
    employee_name: 'Juan Dela Cruz',
    receipt_number: 'EXP-OP-009',
    created_by: 'driver_001',
    approved_by: 'admin',
    created_at: '2025-11-10T06:00:00Z',
    approved_at: '2025-11-10T07:00:00Z',
    updated_at: '2025-11-10T08:00:00Z'
  },
  {
    id: '10',
    expense_type: OperationalExpenseType.TOLL,
    date: '2025-11-09',
    amount: 280,
    description: 'NLEX toll fee',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '2',
    bus_number: 'DEF-456',
    employee_id: '2',
    employee_name: 'Maria Santos',
    receipt_number: 'EXP-OP-010',
    created_by: 'driver_002',
    approved_by: 'supervisor_01',
    created_at: '2025-11-09T15:00:00Z',
    approved_at: '2025-11-09T15:30:00Z',
    updated_at: '2025-11-09T15:30:00Z'
  },
  {
    id: '11',
    expense_type: OperationalExpenseType.ALLOWANCES,
    date: '2025-11-09',
    amount: 600,
    description: 'Conductor daily allowance',
    category: 'Allowances',
    status: ExpenseStatus.APPROVED,
    bus_id: '3',
    bus_number: 'GHI-789',
    employee_id: '9',
    employee_name: 'Ana Villanueva',
    receipt_number: 'EXP-OP-011',
    created_by: 'conductor_001',
    approved_by: 'admin',
    created_at: '2025-11-09T17:00:00Z',
    approved_at: '2025-11-09T17:30:00Z',
    updated_at: '2025-11-09T17:30:00Z'
  },
  {
    id: '12',
    expense_type: OperationalExpenseType.PARKING,
    date: '2025-11-08',
    amount: 100,
    description: 'Bus depot overnight parking',
    category: 'Transportation',
    status: ExpenseStatus.POSTED,
    bus_id: '4',
    bus_number: 'JKL-012',
    employee_id: '4',
    employee_name: 'Rosa Garcia',
    receipt_number: 'EXP-OP-012',
    created_by: 'driver_004',
    approved_by: 'admin',
    created_at: '2025-11-08T20:00:00Z',
    approved_at: '2025-11-08T20:15:00Z',
    updated_at: '2025-11-08T21:00:00Z'
  },
  {
    id: '13',
    expense_type: OperationalExpenseType.FUEL,
    date: '2025-11-08',
    amount: 4800,
    description: 'Gasoline for route operations',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '5',
    bus_number: 'MNO-345',
    employee_id: '5',
    employee_name: 'Antonio Lopez',
    receipt_number: 'EXP-OP-013',
    created_by: 'driver_005',
    approved_by: 'supervisor_01',
    created_at: '2025-11-08T09:00:00Z',
    approved_at: '2025-11-08T09:30:00Z',
    updated_at: '2025-11-08T09:30:00Z'
  },
  {
    id: '14',
    expense_type: OperationalExpenseType.PETTY_CASH,
    date: '2025-11-07',
    amount: 300,
    description: 'Cleaning supplies for bus',
    category: 'Maintenance',
    status: ExpenseStatus.PENDING,
    bus_id: '6',
    bus_number: 'PQR-678',
    employee_id: '6',
    employee_name: 'Linda Cruz',
    receipt_number: 'EXP-OP-014',
    created_by: 'driver_006',
    created_at: '2025-11-07T12:00:00Z',
    updated_at: '2025-11-07T12:00:00Z'
  },
  {
    id: '15',
    expense_type: OperationalExpenseType.TERMINAL_FEES,
    date: '2025-11-07',
    amount: 250,
    description: 'Terminal usage fee - Cubao',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '7',
    bus_number: 'STU-901',
    employee_id: '7',
    employee_name: 'Carlos Mendoza',
    receipt_number: 'EXP-OP-015',
    created_by: 'driver_007',
    approved_by: 'admin',
    created_at: '2025-11-07T08:30:00Z',
    approved_at: '2025-11-07T09:00:00Z',
    updated_at: '2025-11-07T09:00:00Z'
  },
  {
    id: '16',
    expense_type: OperationalExpenseType.TOLL,
    date: '2025-11-06',
    amount: 420,
    description: 'SCTEX toll charges',
    category: 'Transportation',
    status: ExpenseStatus.POSTED,
    bus_id: '8',
    bus_number: 'VWX-234',
    employee_id: '8',
    employee_name: 'Miguel Torres',
    receipt_number: 'EXP-OP-016',
    created_by: 'driver_008',
    approved_by: 'supervisor_01',
    created_at: '2025-11-06T14:00:00Z',
    approved_at: '2025-11-06T14:30:00Z',
    updated_at: '2025-11-06T15:00:00Z'
  },
  {
    id: '17',
    expense_type: OperationalExpenseType.ALLOWANCES,
    date: '2025-11-06',
    amount: 700,
    description: 'Emergency overnight allowance',
    category: 'Allowances',
    status: ExpenseStatus.APPROVED,
    bus_id: '1',
    bus_number: 'ABC-123',
    employee_id: '1',
    employee_name: 'Juan Dela Cruz',
    receipt_number: 'EXP-OP-017',
    created_by: 'driver_001',
    approved_by: 'admin',
    created_at: '2025-11-06T22:00:00Z',
    approved_at: '2025-11-06T22:30:00Z',
    updated_at: '2025-11-06T22:30:00Z'
  },
  {
    id: '18',
    expense_type: OperationalExpenseType.FUEL,
    date: '2025-11-05',
    amount: 5500,
    description: 'Shell diesel premium',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '2',
    bus_number: 'DEF-456',
    employee_id: '2',
    employee_name: 'Maria Santos',
    receipt_number: 'EXP-OP-018',
    created_by: 'driver_002',
    approved_by: 'supervisor_01',
    created_at: '2025-11-05T07:00:00Z',
    approved_at: '2025-11-05T07:30:00Z',
    updated_at: '2025-11-05T07:30:00Z'
  },
  {
    id: '19',
    expense_type: OperationalExpenseType.PETTY_CASH,
    date: '2025-11-05',
    amount: 450,
    description: 'First aid supplies',
    category: 'Safety',
    status: ExpenseStatus.PENDING,
    bus_id: '3',
    bus_number: 'GHI-789',
    employee_id: '3',
    employee_name: 'Pedro Reyes',
    receipt_number: 'EXP-OP-019',
    created_by: 'driver_003',
    created_at: '2025-11-05T11:30:00Z',
    updated_at: '2025-11-05T11:30:00Z'
  },
  {
    id: '20',
    expense_type: OperationalExpenseType.PARKING,
    date: '2025-11-04',
    amount: 180,
    description: 'Mall parking during layover',
    category: 'Transportation',
    status: ExpenseStatus.APPROVED,
    bus_id: '4',
    bus_number: 'JKL-012',
    employee_id: '4',
    employee_name: 'Rosa Garcia',
    receipt_number: 'EXP-OP-020',
    created_by: 'driver_004',
    approved_by: 'admin',
    created_at: '2025-11-04T16:00:00Z',
    approved_at: '2025-11-04T16:30:00Z',
    updated_at: '2025-11-04T16:30:00Z'
  }
];

const OperationalExpensePage = () => {
  // State management
  const [data, setData] = useState<OperationalExpense[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ModalManager states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);

  // Current user
  const currentUser = 'admin_user'; // TODO: Get from auth context

  // Modal management functions
  const openModal = (mode: 'add' | 'edit' | 'view' | 'approve', rowData?: OperationalExpense) => {
    let content: React.ReactNode = null;

    if (mode === 'view' && rowData) {
      // Find payment method name
      const paymentMethodName = MOCK_PAYMENT_METHODS.find(pm => pm.id === 1)?.methodName || 'Cash';
      
      // Find account details if exists
      const accountDetails = MOCK_CHART_OF_ACCOUNTS.find(acc => acc.id === 1);

      const expenseData: OperationalExpenseData & { 
        paymentMethodName?: string; 
        accountCode?: string;
        accountName?: string;
      } = {
        ...transformRecordToFormData(rowData),
        paymentMethodName: paymentMethodName,
        accountCode: accountDetails?.accountCode,
        accountName: accountDetails?.accountName,
      };

      content = (
        <ViewOperationalExpenseModal
          expenseData={expenseData}
          onClose={closeModal}
        />
      );
    } else if (mode === 'add' || mode === 'edit' || mode === 'approve') {
      const formData = rowData ? transformRecordToFormData(rowData) : null;

      content = (
        <RecordOperationalExpenseModal
          mode={mode}
          existingData={formData}
          onSave={handleSaveOperationalExpense}
          onClose={closeModal}
          paymentMethods={MOCK_PAYMENT_METHODS}
          departments={MOCK_DEPARTMENTS}
          cachedTrips={MOCK_CACHED_TRIPS}
          chartOfAccounts={MOCK_CHART_OF_ACCOUNTS}
          employees={MOCK_EMPLOYEES}
          currentUser={currentUser}
        />
      );
    }

    setModalContent(content);
    setIsModalOpen(true);
    setActiveRow(rowData ? Number(rowData.id) : null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  // Handle save operational expense (add or edit)
  const handleSaveOperationalExpense = async (formData: OperationalExpenseData, mode: 'add' | 'edit' | 'approve') => {
    try {
      console.log(`${mode === 'add' ? 'Adding' : 'Updating'} operational expense:`, formData);

      // TODO: Replace with actual API call
      // const endpoint = mode === 'add' 
      //   ? 'http://localhost:4000/api/admin/expenses/operational'
      //   : `http://localhost:4000/api/admin/expenses/operational/${formData.id}`;
      
      // const method = mode === 'add' ? 'POST' : 'PUT';
      
      // const response = await fetch(endpoint, {
      //   method: method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });

      // if (!response.ok) throw new Error('Failed to save operational expense');

      await new Promise(resolve => setTimeout(resolve, 500));

      await showSuccess(
        `${mode === 'add' ? 'Recorded' : mode === 'approve' ? 'Approved' : 'Updated'}!`,
        `Operational expense has been ${mode === 'add' ? 'recorded' : mode === 'approve' ? 'approved and recorded' : 'updated'} successfully.`
      );

      closeModal();
      fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error saving operational expense:', error);
      await showError(
        'Error',
        `Failed to ${mode === 'add' ? 'record' : 'update'} operational expense. Please try again.`
      );
    }
  };

  // Action handlers
  const handleAdd = () => {
    openModal('add');
  };

  const handleView = (id: string) => {
    const expense = data.find(item => item.id === id);
    if (expense) {
      openModal('view', expense);
    }
  };

  const handleEdit = (id: string) => {
    const expense = data.find(item => item.id === id);
    if (expense) {
      openModal('edit', expense);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Operational Expense',
        text: 'Are you sure you want to delete this operational expense? This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        console.log('Deleting operational expense:', id);

        // TODO: Replace with actual API call
        // const response = await fetch(`http://localhost:4000/api/admin/expenses/operational/${id}`, {
        //   method: 'DELETE'
        // });

        // if (!response.ok) throw new Error('Failed to delete operational expense');

        await new Promise(resolve => setTimeout(resolve, 500));

        await showSuccess(
          'Deleted!',
          'Operational expense has been deleted successfully.'
        );

        fetchData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error deleting operational expense:', error);
      await showError(
        'Error',
        'Failed to delete operational expense. Please try again.'
      );
    }
  };

  const handleApprove = async (id: string) => {
    const expense = data.find(item => item.id === id);
    if (expense) {
      openModal('approve', expense);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      const result = await showConfirmation(
        '<p>Are you sure you want to <b>rollback</b> this expense to <b>PENDING</b> status?</p><p>This will allow modifications to be made.</p>',
        'Rollback to Pending'
      );

      if (result.isConfirmed) {
        console.log('Rolling back operational expense:', id);

        // TODO: Replace with actual API call
        // const response = await fetch(`http://localhost:4000/api/admin/expenses/operational/${id}/rollback`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ status: ExpenseStatus.PENDING })
        // });

        // if (!response.ok) throw new Error('Failed to rollback operational expense');

        await new Promise(resolve => setTimeout(resolve, 500));

        await showSuccess(
          'Rolled Back!',
          'Operational expense has been rolled back to PENDING status.'
        );

        fetchData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error rolling back operational expense:', error);
      await showError(
        'Error',
        'Failed to rollback operational expense. Please try again.'
      );
    }
  };

  const handlePost = async (id: string) => {
    try {
      const expense = data.find(item => item.id === id);
      if (!expense) return;

      const result = await showConfirmation(
        `<p>Are you sure you want to <b>POST</b> this expense?</p><p><b>Amount:</b> ${formatMoney(expense.amount)}</p><p><b>Description:</b> ${expense.description}</p><p>This will create a Journal Entry Voucher (JEV) and the expense cannot be modified afterward.</p>`,
        'Post Expense to JEV'
      );

      if (result.isConfirmed) {
        console.log('Posting operational expense:', id);

        // TODO: Replace with actual API call
        // const response = await fetch(`http://localhost:4000/api/admin/expenses/operational/${id}/post`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ status: ExpenseStatus.POSTED })
        // });

        // if (!response.ok) throw new Error('Failed to post operational expense');

        await new Promise(resolve => setTimeout(resolve, 500));

        await showSuccess(
          'Posted!',
          'Operational expense has been posted to JEV successfully.'
        );

        fetchData(); // Refresh the data
      }
    } catch (error) {
      console.error('Error posting operational expense:', error);
      await showError(
        'Error',
        'Failed to post operational expense. Please try again.'
      );
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
        { id: OperationalExpenseType.FUEL, label: 'Fuel' },
        { id: OperationalExpenseType.TOLL, label: 'Toll' },
        { id: OperationalExpenseType.PARKING, label: 'Parking' },
        { id: OperationalExpenseType.ALLOWANCES, label: 'Allowances' },
        { id: OperationalExpenseType.PETTY_CASH, label: 'Petty Cash' },
        { id: OperationalExpenseType.VIOLATIONS, label: 'Violations' },
        { id: OperationalExpenseType.TERMINAL_FEES, label: 'Terminal Fees' }
      ],
      defaultValue: ''
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      options: [
        { id: '', label: 'All Status' },
        { id: ExpenseStatus.PENDING, label: 'Pending' },
        { id: ExpenseStatus.APPROVED, label: 'Approved' },
        { id: ExpenseStatus.REJECTED, label: 'Rejected' },
        { id: ExpenseStatus.POSTED, label: 'Posted' }
      ],
      defaultValue: ''
    }
  ];

  // Fetch data (using sample data for now)
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with ftms_backend API call - http://localhost:4000/api/admin/expenses/operational
      // const response = await fetch('/api/admin/expenses/operational?' + queryParams);
      // const result = await response.json();
      console.warn('API integration pending - using mock operational expense data');

      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredData = [...sampleOperationalExpenses];

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(expense =>
          expense.description.toLowerCase().includes(searchLower) ||
          expense.bus_number?.toLowerCase().includes(searchLower) ||
          expense.employee_name?.toLowerCase().includes(searchLower) ||
          expense.receipt_number?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.expense_type) {
        filteredData = filteredData.filter(expense => expense.expense_type === filters.expense_type);
      }

      if (filters.status) {
        filteredData = filteredData.filter(expense => expense.status === filters.status);
      }

      if (filters.dateRange?.from) {
        filteredData = filteredData.filter(expense => expense.date >= filters.dateRange!.from!);
      }

      if (filters.dateRange?.to) {
        filteredData = filteredData.filter(expense => expense.date <= filters.dateRange!.to!);
      }

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setData(paginatedData);
      setTotalCount(filteredData.length);
      setTotalPages(Math.ceil(filteredData.length / pageSize));

    } catch (err) {
      console.error('Error fetching operational expense data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setErrorCode('FETCH_ERROR');
    } finally {
      setLoading(false);
    }
  };

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
  }, [currentPage, pageSize, filters, searchTerm]);

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
    'Date': formatDate(expense.date),
    'Expense Type': expense.expense_type.replace(/_/g, ' '),
    'Bus': expense.bus_number || '-',
    'Employee': expense.employee_name || '-',
    'Description': expense.description,
    'Amount': formatMoney(expense.amount),
    'Status': expense.status,
    'Receipt': expense.receipt_number || '-'
  }));

  return (
    <div className="card">
        <div className="elements">
          <div className="title">
            <h1>Operational Expenses</h1>
          </div>

          <div className="settings">
            
            {/* Search bar with Filter button inline */}
            <div className="search-filter-container">
              <div className="searchBar">
                <i className="ri-search-line" />
                <input
                  className="searchInput"
                  type="text"
                  placeholder="Search description, bus, employee, receipt..."
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
              {/* Add New Button */}
              <button className="addButton" onClick={handleAdd}>
                <i className="ri-add-line"/> Record Expense
              </button>

            </div>
          </div>

          <div className="table-wrapper">
            <div className="tableContainer">
              <table className="data-table operational-expense-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expense Type</th>
                    <th>Bus</th>
                    <th>Employee</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="loading-cell">Loading...</td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-cell">No operational expenses found.</td>
                    </tr>
                  ) : (
                    data.map((expense) => (
                      <tr key={expense.id} className={activeRow === Number(expense.id) ? 'active-row' : ''}>
                        <td>{formatDate(expense.date)}</td>
                        <td>
                          <span className={`chip ${expense.expense_type.toLowerCase()}`}>
                            {expense.expense_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>{expense.bus_number || '-'}</td>
                        <td>{expense.employee_name || '-'}</td>
                        <td className="expense-description">{expense.description}</td>
                        <td className="expense-amount">{formatMoney(expense.amount)}</td>
                        <td>
                          <span className={`chip ${expense.status.toLowerCase()}`}>
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

                            {/* Status-based action buttons */}
                              <>
                                <button
                                  className="approveBtn"
                                  onClick={() => handleApprove(expense.id)}
                                  title="Approve Expense"
                                  disabled= {expense.status !== ExpenseStatus.PENDING}
                                >
                                  <i className="ri-check-line"></i>
                                </button>
                              </>

                              <>
                                <button
                                  className="editBtn"
                                  onClick={() => handleEdit(expense.id)}
                                  title="Edit Expense"
                                  disabled={expense.status !== ExpenseStatus.REJECTED}
                                >
                                  <i className="ri-edit-line"></i>
                                </button>
                              </>

                              <>
                                <button
                                  className="rejectBtn"
                                  onClick={() => handleRollback(expense.id)}
                                  title="Rollback to Pending"
                                  disabled={expense.status !== ExpenseStatus.APPROVED}
                                >
                                  <i className="ri-arrow-go-back-line"></i>
                                </button>

                                <button
                                  className="submitBtn"
                                  onClick={() => handlePost(expense.id)}
                                  title="Post to JEV"
                                  disabled={expense.status !== ExpenseStatus.APPROVED}
                                >
                                  <i className="ri-send-plane-line"></i>
                                </button>
                              </>

                            {/* POSTED status - only view button visible (already rendered above) */}
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
