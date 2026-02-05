"use client";

import React, { useState, useEffect, useMemo } from "react";
import PaginationComponent from "../../../../Components/pagination";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import FilterDropdown, { FilterSection } from "../../../../Components/filter";
import { showSuccess, showError, showConfirmation } from "../../../../utils/Alerts";
import { formatDateTime, formatDate } from '../../../../utils/formatting';

// Import Loan Management Modals
import AddLoanRequestModal from "../../../../../app/(admin)/admin/loan-management/loanRequest/addLoanRequest";
import ViewLoanRequestModal from "../../../../../app/(admin)/admin/loan-management/loanRequest/viewLoanRequest";

// Import styles
//@ts-ignore
import "../../../../styles/loan-management/loanRequest.css";
//@ts-ignore
import "../../../../styles/components/table.css";
//@ts-ignore
import "../../../../styles/components/chips.css";

// Loan Request Interfaces
enum LoanStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  DISBURSED = 'disbursed',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

enum Department {
  OPERATIONS = 'operations',
  MAINTENANCE = 'maintenance',
  ADMINISTRATION = 'administration',
  FINANCE = 'finance',
  HR = 'hr'
}

enum LoanType {
  EMERGENCY = 'emergency',
  EDUCATIONAL = 'educational',
  MEDICAL = 'medical',
  HOUSING = 'housing',
  PERSONAL = 'personal',
  SALARY_ADVANCE = 'salary_advance'
}

interface AuditTrailEntry {
  id: string;
  action: string;
  action_type: 'created' | 'updated' | 'approved' | 'rejected' | 'disbursed' | 'closed' | 'cancelled';
  performed_by: string;
  performed_at: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  comments?: string;
  ip_address?: string;
  user_agent?: string;
}

interface Employee {
  employee_id?: string;
  name: string;
  job_title: string;
  department: Department | string;
  employee_number: string;
  monthly_salary?: number;
  hire_date: string;
}

interface LoanRequest {
  id: string;
  loan_request_id: string;
  employee_id?: string;
  employee: Employee;
  loan_type: LoanType | string;
  requested_amount: number;
  purpose: string;
  justification: string;
  repayment_terms: number;
  monthly_deduction: number;
  status: LoanStatus | string;
  
  application_date: string;
  submitted_by?: string;
  submitted_date?: string;
  
  reviewed_by?: string;
  reviewed_date?: string;
  approved_by?: string;
  approved_date?: string;
  approval_comments?: string;
  approved_amount?: number;
  adjusted_terms?: number;
  interest_rate?: number;
  processing_fee?: number;
  rejected_by?: string;
  rejected_date?: string;
  rejection_reason?: string;
  
  disbursed_by?: string;
  disbursed_date?: string;
  disbursed_amount?: number;
  disbursement_method?: string;
  disbursement_reference?: string;
  disbursement_attachment?: string;
  
  closed_by?: string;
  closed_date?: string;
  closure_reason?: string;
  closure_type?: 'completed' | 'early_settlement' | 'write_off' | 'transfer';
  closure_notes?: string;
  
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  
  total_paid?: number;
  remaining_balance?: number;
  payment_records?: any[];
  
  audit_trail?: AuditTrailEntry[];
  
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
  is_deleted?: boolean;
}

interface LoanFilters {
  employee?: string[];
  department?: Department[];
  status?: LoanStatus[];
  loan_type?: LoanType[];
  date_range?: { from: string; to: string };
  amount_range?: { min: number; max: number };
}

const LoanRequestPage = () => {
  // Sample data for loan requests with enhanced fields
  const sampleLoanData: LoanRequest[] = [
    {
      id: "1",
      loan_request_id: "LR-2024-001",
      employee_id: "EMP-001",
      employee: {
        employee_id: "EMP-001",
        name: "Juan Dela Cruz",
        job_title: "Bus Driver",
        department: Department.OPERATIONS,
        employee_number: "20240001",
        monthly_salary: 25000.00,
        hire_date: "2022-03-15"
      },
      loan_type: LoanType.EMERGENCY,
      requested_amount: 50000.00,
      purpose: "Medical Emergency",
      justification: "Hospitalization of spouse requires immediate financial assistance",
      repayment_terms: 12,
      monthly_deduction: 4166.67,
      status: LoanStatus.PENDING_APPROVAL,
      application_date: "2024-01-15",
      submitted_by: "Juan Dela Cruz",
      submitted_date: "2024-01-15",
      emergency_contact_name: "Maria Dela Cruz",
      emergency_contact_phone: "+63912-345-6789",
      emergency_contact_relationship: "Spouse",
      audit_trail: [
        {
          id: "1",
          action: "Loan request created",
          action_type: "created",
          performed_by: "Juan Dela Cruz",
          performed_at: "2024-01-15T08:00:00Z",
          comments: "Initial loan request submission"
        }
      ],
      created_at: "2024-01-15T08:00:00Z",
      created_by: "Juan Dela Cruz",
      is_deleted: false
    },
    {
      id: "2",
      loan_request_id: "LR-2024-002",
      employee_id: "EMP-002",
      employee: {
        employee_id: "EMP-002",
        name: "Maria Santos",
        job_title: "Administrative Assistant",
        department: Department.ADMINISTRATION,
        employee_number: "20240002",
        monthly_salary: 22000.00,
        hire_date: "2021-08-20"
      },
      loan_type: LoanType.EDUCATIONAL,
      requested_amount: 75000.00,
      approved_amount: 75000.00,
      purpose: "Child's College Tuition",
      justification: "Tuition fee for child's engineering degree program",
      repayment_terms: 24,
      adjusted_terms: 24,
      monthly_deduction: 3125.00,
      interest_rate: 5.0,
      processing_fee: 500.00,
      status: LoanStatus.APPROVED,
      application_date: "2024-01-10",
      submitted_by: "Maria Santos",
      submitted_date: "2024-01-10",
      reviewed_by: "HR Manager",
      reviewed_date: "2024-01-12",
      approved_by: "Finance Director",
      approved_date: "2024-01-14",
      approval_comments: "Approved based on excellent employment record and reasonable repayment terms",
      audit_trail: [
        {
          id: "1",
          action: "Loan request created",
          action_type: "created",
          performed_by: "Maria Santos",
          performed_at: "2024-01-10T09:30:00Z",
          comments: "Initial loan request submission"
        },
        {
          id: "2",
          action: "Loan request approved",
          action_type: "approved",
          performed_by: "Finance Director",
          performed_at: "2024-01-14T14:20:00Z",
          comments: "Approved with standard terms"
        }
      ],
      created_at: "2024-01-10T09:30:00Z",
      created_by: "Maria Santos",
      updated_at: "2024-01-14T14:20:00Z",
      updated_by: "Finance Director",
      is_deleted: false
    },
    {
      id: "3",
      loan_request_id: "LR-2024-003",
      employee_id: "EMP-003",
      employee: {
        employee_id: "EMP-003",
        name: "Carlos Rodriguez",
        job_title: "Mechanic",
        department: Department.MAINTENANCE,
        employee_number: "20240003",
        monthly_salary: 28000.00,
        hire_date: "2020-11-10"
      },
      loan_type: LoanType.HOUSING,
      requested_amount: 100000.00,
      approved_amount: 100000.00,
      purpose: "Home Down Payment",
      justification: "Down payment for first home purchase through Pag-IBIG housing loan",
      repayment_terms: 36,
      adjusted_terms: 36,
      monthly_deduction: 2777.78,
      interest_rate: 5.0,
      processing_fee: 1000.00,
      status: LoanStatus.DISBURSED,
      application_date: "2024-01-08",
      submitted_by: "Carlos Rodriguez",
      submitted_date: "2024-01-08",
      reviewed_by: "HR Manager",
      reviewed_date: "2024-01-09",
      approved_by: "Finance Director",
      approved_date: "2024-01-11",
      disbursed_by: "Finance Manager",
      disbursed_date: "2024-01-18",
      disbursement_method: "Bank Transfer",
      disbursement_reference: "BT-2024-001",
      total_paid: 8333.34,
      remaining_balance: 105666.66,
      payment_records: [
        {
          id: "1",
          payment_date: "2024-02-01",
          amount_paid: 2777.78,
          payment_method: "salary_deduction",
          processed_by: "Payroll System"
        },
        {
          id: "2",
          payment_date: "2024-03-01",
          amount_paid: 2777.78,
          payment_method: "salary_deduction",
          processed_by: "Payroll System"
        },
        {
          id: "3",
          payment_date: "2024-04-01",
          amount_paid: 2777.78,
          payment_method: "salary_deduction",
          processed_by: "Payroll System"
        }
      ],
      audit_trail: [
        {
          id: "1",
          action: "Loan request created",
          action_type: "created",
          performed_by: "Carlos Rodriguez",
          performed_at: "2024-01-08T14:20:00Z"
        },
        {
          id: "2",
          action: "Loan request approved",
          action_type: "approved",
          performed_by: "Finance Director",
          performed_at: "2024-01-11T10:15:00Z"
        },
        {
          id: "3",
          action: "Loan disbursed",
          action_type: "disbursed",
          performed_by: "Finance Manager",
          performed_at: "2024-01-18T10:15:00Z"
        }
      ],
      created_at: "2024-01-08T14:20:00Z",
      created_by: "Carlos Rodriguez",
      updated_at: "2024-01-18T10:15:00Z",
      updated_by: "Finance Manager",
      is_deleted: false
    },
    {
      id: "4",
      loan_request_id: "LR-2024-004",
      employee_id: "EMP-004",
      employee: {
        employee_id: "EMP-004",
        name: "Ana Garcia",
        job_title: "Bus Conductor",
        department: Department.OPERATIONS,
        employee_number: "20240004",
        monthly_salary: 20000.00,
        hire_date: "2023-05-12"
      },
      loan_type: LoanType.PERSONAL,
      requested_amount: 30000.00,
      purpose: "Family Event",
      justification: "Wedding expenses for daughter's wedding ceremony",
      repayment_terms: 18,
      monthly_deduction: 1666.67,
      status: LoanStatus.REJECTED,
      application_date: "2024-01-05",
      submitted_by: "Ana Garcia",
      submitted_date: "2024-01-05",
      reviewed_by: "HR Manager",
      reviewed_date: "2024-01-07",
      rejected_by: "Finance Director",
      rejected_date: "2024-01-12",
      rejection_reason: "Insufficient employment tenure (less than 2 years required for personal loans)",
      audit_trail: [
        {
          id: "1",
          action: "Loan request created",
          action_type: "created",
          performed_by: "Ana Garcia",
          performed_at: "2024-01-05T11:15:00Z"
        },
        {
          id: "2",
          action: "Loan request rejected",
          action_type: "rejected",
          performed_by: "Finance Director",
          performed_at: "2024-01-12T16:30:00Z",
          comments: "Insufficient employment tenure"
        }
      ],
      created_at: "2024-01-05T11:15:00Z",
      created_by: "Ana Garcia",
      updated_at: "2024-01-12T16:30:00Z",
      updated_by: "Finance Director",
      is_deleted: false
    },
    {
      id: "5",
      loan_request_id: "LR-2023-015",
      employee_id: "EMP-005",
      employee: {
        employee_id: "EMP-005",
        name: "Roberto Kim",
        job_title: "Finance Officer",
        department: Department.FINANCE,
        employee_number: "20230005",
        monthly_salary: 35000.00,
        hire_date: "2019-02-14"
      },
      loan_type: LoanType.MEDICAL,
      requested_amount: 80000.00,
      approved_amount: 80000.00,
      purpose: "Medical Treatment",
      justification: "Surgery and treatment for chronic condition",
      repayment_terms: 24,
      adjusted_terms: 24,
      monthly_deduction: 3333.33,
      interest_rate: 5.0,
      processing_fee: 800.00,
      status: LoanStatus.CLOSED,
      application_date: "2023-11-20",
      submitted_by: "Roberto Kim",
      submitted_date: "2023-11-20",
      reviewed_by: "HR Manager",
      reviewed_date: "2023-11-22",
      approved_by: "Finance Director",
      approved_date: "2023-11-25",
      disbursed_by: "Finance Manager",
      disbursed_date: "2023-12-01",
      disbursement_method: "Check",
      disbursement_reference: "CHK-2023-045",
      closed_by: "Finance Manager",
      closed_date: "2024-01-15",
      closure_reason: "Loan fully repaid ahead of schedule",
      closure_type: "completed",
      closure_notes: "Employee made additional payments to complete loan early",
      total_paid: 84000.00,
      remaining_balance: 0,
      audit_trail: [
        {
          id: "1",
          action: "Loan request created",
          action_type: "created",
          performed_by: "Roberto Kim",
          performed_at: "2023-11-20T16:45:00Z"
        },
        {
          id: "2",
          action: "Loan request approved",
          action_type: "approved",
          performed_by: "Finance Director",
          performed_at: "2023-11-25T14:20:00Z"
        },
        {
          id: "3",
          action: "Loan disbursed",
          action_type: "disbursed",
          performed_by: "Finance Manager",
          performed_at: "2023-12-01T09:30:00Z"
        },
        {
          id: "4",
          action: "Loan closed",
          action_type: "closed",
          performed_by: "Finance Manager",
          performed_at: "2024-01-15T09:20:00Z",
          comments: "Loan fully repaid ahead of schedule"
        }
      ],
      created_at: "2023-11-20T16:45:00Z",
      created_by: "Roberto Kim",
      updated_at: "2024-01-15T09:20:00Z",
      updated_by: "Finance Manager",
      is_deleted: false
    },
    {
      id: "6",
      loan_request_id: "LR-2024-006",
      employee_id: "EMP-006",
      employee: {
        employee_id: "EMP-006",
        name: "Lisa Reyes",
        job_title: "HR Assistant",
        department: Department.HR,
        employee_number: "20240006",
        monthly_salary: 24000.00,
        hire_date: "2022-07-03"
      },
      loan_type: LoanType.SALARY_ADVANCE,
      requested_amount: 15000.00,
      purpose: "Salary Advance",
      justification: "Emergency home repair due to typhoon damage",
      repayment_terms: 6,
      monthly_deduction: 2500.00,
      status: LoanStatus.DRAFT,
      application_date: "2024-01-20",
      submitted_by: "Lisa Reyes",
      audit_trail: [
        {
          id: "1",
          action: "Loan request created as draft",
          action_type: "created",
          performed_by: "Lisa Reyes",
          performed_at: "2024-01-20T13:30:00Z"
        }
      ],
      created_at: "2024-01-20T13:30:00Z",
      created_by: "Lisa Reyes",
      is_deleted: false
    }
  ];

  // State management
  const [data, setData] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LoanFilters>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeRecord, setActiveRecord] = useState<LoanRequest | null>(null);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setData(sampleLoanData);
      } catch (error) {
        console.error('Error loading loan requests:', error);
        showError('Failed to load loan requests', 'Error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Get unique values for filter options
  const getUniqueEmployees = () => {
    const employees = Array.from(new Set(data.map(item => item.employee.name)))
      .map(name => ({ id: name, label: name }));
    return employees;
  };

  const getUniqueDepartments = () => {
    return [
      { id: Department.OPERATIONS, label: 'Operations' },
      { id: Department.MAINTENANCE, label: 'Maintenance' },
      { id: Department.ADMINISTRATION, label: 'Administration' },
      { id: Department.FINANCE, label: 'Finance' },
      { id: Department.HR, label: 'HR' }
    ];
  };

  const getUniqueStatuses = () => {
    return [
      { id: LoanStatus.DRAFT, label: 'Draft' },
      { id: LoanStatus.PENDING_APPROVAL, label: 'Pending Approval' },
      { id: LoanStatus.APPROVED, label: 'Approved' },
      { id: LoanStatus.DISBURSED, label: 'Disbursed' },
      { id: LoanStatus.REJECTED, label: 'Rejected' },
      { id: LoanStatus.CLOSED, label: 'Closed' },
      { id: LoanStatus.CANCELLED, label: 'Cancelled' }
    ];
  };

  const getUniqueLoanTypes = () => {
    return [
      { id: LoanType.EMERGENCY, label: 'Emergency' },
      { id: LoanType.EDUCATIONAL, label: 'Educational' },
      { id: LoanType.MEDICAL, label: 'Medical' },
      { id: LoanType.HOUSING, label: 'Housing' },
      { id: LoanType.PERSONAL, label: 'Personal' },
      { id: LoanType.SALARY_ADVANCE, label: 'Salary Advance' }
    ];
  };

  // Filter sections configuration
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: { from: "", to: "" }
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: getUniqueStatuses()
    },
    {
      id: 'employee',
      title: 'Employee',
      type: 'checkbox',
      options: getUniqueEmployees()
    },
    {
      id: 'department',
      title: 'Department',
      type: 'checkbox',
      options: getUniqueDepartments()
    },
    {
      id: 'loanType',
      title: 'Loan Type',
      type: 'checkbox',
      options: getUniqueLoanTypes()
    }
  ];

  // Handle filter application
  const handleApplyFilters = (filterValues: Record<string, any>) => {
    console.log("Applied filters:", filterValues);
    
    const newFilters: LoanFilters = {};
    
    if (filterValues.dateRange && typeof filterValues.dateRange === 'object') {
      newFilters.date_range = filterValues.dateRange as { from: string; to: string };
    }
    
    if (filterValues.status && Array.isArray(filterValues.status)) {
      newFilters.status = filterValues.status as LoanStatus[];
    }
    
    if (filterValues.employee && Array.isArray(filterValues.employee)) {
      newFilters.employee = filterValues.employee;
    }
    
    if (filterValues.department && Array.isArray(filterValues.department)) {
      newFilters.department = filterValues.department as Department[];
    }
    
    if (filterValues.loanType && Array.isArray(filterValues.loanType)) {
      newFilters.loan_type = filterValues.loanType as LoanType[];
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item =>
        item.loan_request_id.toLowerCase().includes(searchLower) ||
        item.employee.name.toLowerCase().includes(searchLower) ||
        item.employee.employee_number.toLowerCase().includes(searchLower) ||
        item.purpose.toLowerCase().includes(searchLower) ||
        item.requested_amount.toString().includes(searchLower) ||
        item.loan_type.toLowerCase().includes(searchLower) ||
        item.employee.department.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply filters
    if (filters.status?.length) {
      result = result.filter(item => filters.status!.includes(item.status as LoanStatus));
    }
    
    if (filters.employee?.length) {
      result = result.filter(item => filters.employee!.includes(item.employee.name));
    }
    
    if (filters.department?.length) {
      result = result.filter(item => filters.department!.includes(item.employee.department as Department));
    }
    
    if (filters.loan_type?.length) {
      result = result.filter(item => filters.loan_type!.includes(item.loan_type as LoanType));
    }
    
    if (filters.date_range) {
      const { from, to } = filters.date_range;
      if (from) result = result.filter(item => item.application_date >= from);
      if (to) result = result.filter(item => item.application_date <= to);
    }
    
    return result.sort((a, b) => {
      const aLatestAction = a.updated_at || a.created_at;
      const bLatestAction = b.updated_at || b.created_at;
      return new Date(bLatestAction).getTime() - new Date(aLatestAction).getTime();
    });
  }, [data, search, filters]);

  // Pagination calculations
  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Format functions
  const formatStatus = (status: LoanStatus | string): string => {
    const statusMap = {
      [LoanStatus.DRAFT]: 'Draft',
      [LoanStatus.PENDING_APPROVAL]: 'Pending Approval',
      [LoanStatus.APPROVED]: 'Approved',
      [LoanStatus.DISBURSED]: 'Disbursed',
      [LoanStatus.REJECTED]: 'Rejected',
      [LoanStatus.CLOSED]: 'Closed',
      [LoanStatus.CANCELLED]: 'Cancelled'
    };
    return statusMap[status as LoanStatus] || status;
  };

  const formatDepartment = (department: Department | string): string => {
    const departmentMap = {
      [Department.OPERATIONS]: 'Operations',
      [Department.MAINTENANCE]: 'Maintenance',
      [Department.ADMINISTRATION]: 'Administration',
      [Department.FINANCE]: 'Finance',
      [Department.HR]: 'HR'
    };
    return departmentMap[department as Department] || department;
  };

  const formatLoanType = (loanType: LoanType | string): string => {
    const typeMap = {
      [LoanType.EMERGENCY]: 'Emergency',
      [LoanType.EDUCATIONAL]: 'Educational',
      [LoanType.MEDICAL]: 'Medical',
      [LoanType.HOUSING]: 'Housing',
      [LoanType.PERSONAL]: 'Personal',
      [LoanType.SALARY_ADVANCE]: 'Salary Advance'
    };
    return typeMap[loanType as LoanType] || loanType;
  };

  // Modal action handlers
  const handleView = (loan: LoanRequest) => {
    setActiveRecord(loan);
    setShowViewModal(true);
  };

  const handleEdit = (loan: LoanRequest) => {
    setActiveRecord(loan);
    setShowEditModal(true);
  };

  // CRUD Operations
  const handleAddLoan = async (loanData: any) => {
    try {
      const newId = (Math.max(...data.map(item => parseInt(item.id))) + 1).toString();
      const currentYear = new Date().getFullYear();
      const nextNumber = data.filter(item => item.loan_request_id.includes(currentYear.toString())).length + 1;
      const loanRequestId = `LR-${currentYear}-${String(nextNumber).padStart(3, '0')}`;

      const newLoan: LoanRequest = {
        ...loanData,
        id: newId,
        loan_request_id: loanRequestId,
        status: LoanStatus.DRAFT,
        application_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        created_by: "Current User",
        is_deleted: false,
        audit_trail: [
          {
            id: "1",
            action: "Loan request created",
            action_type: "created",
            performed_by: "Current User",
            performed_at: new Date().toISOString(),
            comments: "Initial loan request creation"
          }
        ]
      };

      setData(prevData => [newLoan, ...prevData]);
      showSuccess("Loan request has been created successfully.", "Request Created");
    } catch (error) {
      console.error('Error adding loan request:', error);
      showError('Failed to create loan request. Please try again.', 'Error');
    }
  };

  const handleUpdateLoan = async (loanId: string, loanData: any) => {
    try {
      const updatedData = data.map(item =>
        item.id === loanId
          ? {
              ...item,
              ...loanData,
              updated_at: new Date().toISOString(),
              updated_by: "Current User",
              audit_trail: [
                ...(item.audit_trail || []),
                {
                  id: Date.now().toString(),
                  action: "Loan request updated",
                  action_type: "updated",
                  performed_by: "Current User",
                  performed_at: new Date().toISOString(),
                  comments: "Loan request details modified"
                }
              ]
            }
          : item
      );
      setData(updatedData);
      showSuccess("Loan request has been updated successfully.", "Request Updated");
    } catch (error) {
      console.error('Error updating loan request:', error);
      showError('Failed to update loan request. Please try again.', 'Error');
    }
  };

  const handleDelete = async (loan: LoanRequest) => {
    const result = await showConfirmation(
      `Are you sure you want to delete loan request "${loan.loan_request_id}"?<br/>
      <small>This action cannot be undone.</small>`,
      "Delete Loan Request"
    );
    
    if (result.isConfirmed) {
      const updatedData = data.filter(item => item.id !== loan.id);
      setData(updatedData);
      showSuccess("Loan request has been deleted.", "Request Deleted");
    }
  };

  const handleSubmitForApproval = async (loan: LoanRequest) => {
    const result = await showConfirmation(
      `Submit loan request "${loan.loan_request_id}" for approval?<br/>
      <small>Once submitted, you cannot edit the request.</small>`,
      "Submit for Approval"
    );
    
    if (result.isConfirmed) {
      const updatedData = data.map(item =>
        item.id === loan.id
          ? {
              ...item,
              status: LoanStatus.PENDING_APPROVAL,
              submitted_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
              updated_by: "Current User",
              audit_trail: [
                ...(item.audit_trail || []),
                {
                  id: Date.now().toString(),
                  action: "Loan request submitted for approval",
                  action_type: "updated" as const,
                  performed_by: "Current User",
                  performed_at: new Date().toISOString(),
                  comments: "Submitted for management approval"
                }
              ]
            }
          : item
      );
      setData(updatedData);
      showSuccess("Loan request has been submitted for approval.", "Request Submitted");
    }
  };

  // Export functionality
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'loan_requests';
    
    if (filters.status?.length) {
      fileName += `_${filters.status.join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
    }
    
    if (filters.department?.length) {
      fileName += `_${filters.department.join('-')}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.csv`;
  };

  const generateExportData = () => {
    return filteredData.map(loan => ({
      'Loan Request ID': loan.loan_request_id,
      'Employee Name': loan.employee.name,
      'Employee Number': loan.employee.employee_number,
      'Department': formatDepartment(loan.employee.department),
      'Job Title': loan.employee.job_title,
      'Loan Type': formatLoanType(loan.loan_type),
      'Requested Amount': `₱${loan.requested_amount.toLocaleString()}`,
      'Approved Amount': loan.approved_amount ? `₱${loan.approved_amount.toLocaleString()}` : 'N/A',
      'Monthly Deduction': `₱${loan.monthly_deduction.toLocaleString()}`,
      'Repayment Terms': `${loan.repayment_terms} months`,
      'Purpose': loan.purpose,
      'Status': formatStatus(loan.status),
      'Application Date': formatDate(loan.application_date),
      'Submitted Date': loan.submitted_date ? formatDate(loan.submitted_date) : 'N/A',
      'Approved Date': loan.approved_date ? formatDate(loan.approved_date) : 'N/A',
      'Approved By': loan.approved_by || 'N/A',
      'Disbursed Date': loan.disbursed_date ? formatDate(loan.disbursed_date) : 'N/A',
      'Disbursement Method': loan.disbursement_method || 'N/A',
      'Rejection Reason': loan.rejection_reason || 'N/A',
      'Created Date': formatDate(loan.created_at)
    }));
  };

  const handleExport = async () => {
    try {
      const exportData = generateExportData();
      const result = await showConfirmation(
        `Export ${exportData.length} loan request records?<br/>
        <small>Filters applied: ${filters.status?.length ? `Status (${filters.status.length})` : 'All Status'}, 
        ${filters.department?.length ? `Department (${filters.department.length})` : 'All Departments'}</small>`,
        "Confirm Export"
      );
      
      if (result.isConfirmed) {
        const generateHeaderComment = () => {
          let comment = `# Loan Request Export\n`;
          comment += `# Export Date: ${new Date().toISOString()}\n`;
          comment += `# Total Records: ${exportData.length}\n`;
          comment += `# Filters Applied:\n`;
          comment += `#   Status: ${filters.status?.length ? filters.status.join(', ') : 'All'}\n`;
          comment += `#   Department: ${filters.department?.length ? filters.department.join(', ') : 'All'}\n`;
          comment += `#   Employee: ${filters.employee?.length ? filters.employee.join(', ') : 'All'}\n`;
          comment += `#   Search Term: ${search || 'None'}\n`;
          comment += `# \n`;
          return comment;
        };

        const headers = Object.keys(exportData[0] || {});
        const csvHeaders = headers.join(",") + "\n";
        
        const csvRows = exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            return typeof value === 'string' && value.includes(',') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(",")
        ).join("\n");
        
        const blob = new Blob([generateHeaderComment() + csvHeaders + csvRows], { 
          type: "text/csv;charset=utf-8;" 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = generateFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccess(`Successfully exported ${exportData.length} records.`, "Export Complete");
      }
    } catch (error) {
      console.error("Export error:", error);
      showError("Failed to export data. Please try again.", "Export Error");
    }
  };

  // Get conditional action buttons based on status
  const getActionButtons = (loan: LoanRequest) => {
    const baseActions = [
      <button
        key="view"
        className="viewBtn"
        onClick={() => handleView(loan)}
        title="View Details"
      >
        <i className="ri-eye-line"></i>
      </button>
    ];

    switch (loan.status) {
      case LoanStatus.DRAFT:
        return [
          ...baseActions,
          <button
            key="edit"
            className="editBtn"
            onClick={() => handleEdit(loan)}
            title="Edit"
          >
            <i className="ri-edit-line"></i>
          </button>,
          <button
            key="delete"
            className="deleteBtn"
            onClick={() => handleDelete(loan)}
            title="Delete"
          >
            <i className="ri-delete-bin-line"></i>
          </button>,
          <button
            key="submit"
            className="submitBtn"
            onClick={() => handleSubmitForApproval(loan)}
            title="Submit for Approval"
          >
            <i className="ri-send-plane-line"></i>
          </button>
        ];

      default:
        return baseActions;
    }
  };

 if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Loan Requests</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Loan Requests</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Loan Requests</h1>
        </div>
        
        <div className="settings">
          <div className="search-filter-container">
            <div className="loan_searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search loan requests, employee, purpose..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <FilterDropdown
              sections={filterSections}
              onApply={handleApplyFilters}
            />
          </div>
          <div className="filters">
            <button onClick={handleExport} id="export">
              <i className="ri-download-line" /> Export CSV
            </button>
            
            <button onClick={() => setShowAddModal(true)} id="addLoan">
              <i className="ri-add-line" /> Add Loan Request
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Loan Type</th>
                  <th>Amount</th>
                  <th>Terms</th>
                  <th>Application Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(loan => (
                  <tr key={loan.id}>
                    <td>
                      <div>
                        <strong>{loan.employee.name}</strong><br />
                        <small>{loan.employee.employee_number} - {loan.employee.job_title}</small>
                      </div>
                    </td>
                    <td>{formatDepartment(loan.employee.department)}</td>
                    <td>{formatLoanType(loan.loan_type)}</td>
                    <td>₱{loan.requested_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{loan.repayment_terms} months</td>
                    <td>{formatDate(loan.application_date)}</td>
                    <td className="table-status">
                      <span className={`chip ${loan.status}`}>
                        {formatStatus(loan.status)}
                      </span>
                    </td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        {getActionButtons(loan)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && (
              <p className="noRecords">No loan requests found matching your criteria.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size: number) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />

        {/* Add Loan Modal */}
        {showAddModal && (
          <AddLoanRequestModal
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddLoan}
          />
        )}

        {/* Edit Loan Modal */}
        {showEditModal && activeRecord && (
          <AddLoanRequestModal
            onClose={() => {
              setShowEditModal(false);
              setActiveRecord(null);
            }}
            onSubmit={(loanData) => handleUpdateLoan(activeRecord.id, loanData)}
            editData={activeRecord}
            isEditMode={true}
          />
        )}

        {/* View Loan Modal */}
        {showViewModal && activeRecord && (
          <ViewLoanRequestModal
            loan={activeRecord}
            onClose={() => {
              setShowViewModal(false);
              setActiveRecord(null);
            }}
            onEdit={(loan) => {
              setShowViewModal(false);
              setActiveRecord(loan);
              setShowEditModal(true);
            }}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
};

export default LoanRequestPage;
