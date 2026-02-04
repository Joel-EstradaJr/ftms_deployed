// staff\payroll\page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import "../../../styles/payroll/payroll.css";
import "../../../styles/components/table.css";
import "../../../styles/components/chips.css"
import PaginationComponent from "../../../Components/pagination";
import Loading from '../../../Components/loading';
import ErrorDisplay from '../../../Components/errordisplay';
import FilterDropdown, { FilterSection } from '../../../Components/filter';
import { formatMoney, formatDate } from '../../../utils/formatting';
import { PayrollBatch } from '../../../(admin)/admin/financial-management/payroll/types';
import ViewPayrollBatch from '../../../(admin)/admin/financial-management/payroll/viewPayrollBatch';
import ModalManager from '../../../Components/modalManager';
import ExportButton from '../../../Components/ExportButton';
import payrollService, { HrPayrollData } from '../../../services/payrollService';

const StaffPayrollPage = () => {
  // State for payroll batches
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);

  // Current user (TODO: Get from auth context)
  const currentUser = 'Staff User';

  // Fetch payroll batches from API
  const fetchPayrollBatches = useCallback(async (isSearch = false) => {
    try {
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch HR payroll data grouped by period from integration endpoint
      try {
        // Get current date for default filtering
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-based (0 = January)

        const payrollBatches = await payrollService.fetchPayrollBatches(currentYear, currentMonth);

        // Transform grouped payroll data to PayrollBatch format for display
        const transformedBatches: PayrollBatch[] = payrollBatches.map((batch, index) => {
          // Calculate totals for the entire batch
          let totalGross = 0;
          let totalDeductions = 0;
          let totalNet = 0;

          const payrolls = batch.employees.map((employee: HrPayrollData) => {
            // Enrich employee with batch period dates for correct calculations
            const enrichedEmployee: HrPayrollData = {
              ...employee,
              payroll_period_start: batch.payroll_period_start,
              payroll_period_end: batch.payroll_period_end,
            };
            
            const grossEarnings = payrollService.calculateGrossEarnings(enrichedEmployee);
            const deductions = payrollService.calculateTotalDeductions(enrichedEmployee);
            const netPay = payrollService.calculateNetPay(enrichedEmployee);
            const presentDays = enrichedEmployee.present_days ||
              enrichedEmployee.attendances.filter(a => a.status === 'Present').length;

            totalGross += grossEarnings;
            totalDeductions += deductions;
            totalNet += netPay;

            return {
              id: `${batch.payroll_period_start}-${enrichedEmployee.employee_number}`,
              batchId: `batch-${batch.payroll_period_start}`,
              employeeId: enrichedEmployee.employee_number,
              baseSalary: parseFloat(enrichedEmployee.basic_rate),
              allowances: payrollService.getBenefitsByType(enrichedEmployee).size > 0
                ? Array.from(payrollService.getBenefitsByType(enrichedEmployee).values()).reduce((a, b) => a + b, 0)
                : 0,
              deductions: deductions,
              netPay: netPay,
              isDisbursed: false,
              createdAt: new Date().toISOString(),
              employee: {
                employeeNumber: enrichedEmployee.employee_number,
                firstName: enrichedEmployee.employee_name || enrichedEmployee.employee_number,
                lastName: '',
                department: (enrichedEmployee as any).department || 'N/A',
                position: (enrichedEmployee as any).position || enrichedEmployee.rate_type,
                status: 'active'
              },
              hrPayrollData: enrichedEmployee,
              presentDays: presentDays
            };
          });

          return {
            id: `batch-${batch.payroll_period_start}`,
            payroll_period_code: `PAY-${batch.payroll_period_start.replace(/-/g, '')}`,
            period_start: batch.payroll_period_start,
            period_end: batch.payroll_period_end,
            totalGross: totalGross,
            totalDeductions: totalDeductions,
            total_net: totalNet,
            total_employees: batch.total_employees,
            status: 'PENDING',
            createdBy: 'Admin User',
            createdAt: new Date().toISOString(),
            payrolls: payrolls
          };
        });

        setBatches(transformedBatches);
        setTotalPages(Math.ceil(transformedBatches.length / pageSize));

        console.log('✅ HR Payroll batches loaded successfully:', transformedBatches.length, 'batches with', transformedBatches.reduce((sum, b) => sum + b.total_employees, 0), 'total employees');
      } catch (apiError) {
        console.error('HR Payroll API error:', apiError);
        // Fallback to mock data if API fails
        console.warn('Using fallback mock data due to API error');

        const mockBatches: PayrollBatch[] = [
          {
            id: '1',
            payroll_period_code: 'PAY-202601-P1',
            period_start: '2026-01-01',
            period_end: '2026-01-15',
            totalGross: 150000,
            totalDeductions: 30000,
            total_net: 120000,
            total_employees: 16,
            status: 'PENDING',
            createdBy: 'Admin User',
            createdAt: '2026-01-10T10:00:00Z',
            payrolls: []
          }
        ];

        setBatches(mockBatches);
        setTotalPages(Math.ceil(mockBatches.length / pageSize));
      }

      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching payroll batches:", err);
      setError("Error retrieving payroll data.");
      setErrorCode(500);
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [currentPage, pageSize]);

  // Fetch data when component mounts or filters change
  useEffect(() => {
    fetchPayrollBatches(false);
  }, [fetchPayrollBatches]);

  // Separate effect for search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchPayrollBatches(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Effect to handle page changes
  useEffect(() => {
    if (currentPage !== 1) {
      fetchPayrollBatches(false);
    }
  }, [currentPage, pageSize]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setSearch(e.target.value);
  };

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Handle key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearch("");
  };

  // Handle retry
  const handleRetry = () => {
    fetchPayrollBatches(false);
  };

  // Define filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: 'pending', label: 'Pending' },
        { id: 'approved', label: 'Approved' },
        { id: 'disbursed', label: 'Disbursed' },
        { id: 'cancelled', label: 'Cancelled' }
      ],
      defaultValue: []
    },
    {
      id: 'period_start',
      title: 'Period Start',
      type: 'date',
      defaultValue: ''
    },
    {
      id: 'period_end',
      title: 'Period End',
      type: 'date',
      defaultValue: ''
    },
    {
      id: 'total_employees',
      title: 'Total Employees Range',
      type: 'numberRange',
      defaultValue: { min: '', max: '' }
    },
    {
      id: 'total_net',
      title: 'Total Net Range',
      type: 'numberRange',
      defaultValue: { min: '', max: '' }
    },
    {
      id: 'dateRange',
      title: 'Period Date Range',
      type: 'dateRange',
      defaultValue: { from: '', to: '' }
    }
  ];

  // Handle filter apply
  const handleApplyFilters = (values: Record<string, any>) => {
    setFilterValues(values);
    setCurrentPage(1);
  };

  // Filter logic for client-side filtering
  const filteredData = batches.filter(batch => {
    // Search filter - enhanced to include numeric fields
    const matchesSearch = !search || (
      batch.payroll_period_code.toLowerCase().includes(search.toLowerCase()) ||
      formatDate(batch.period_start).toLowerCase().includes(search.toLowerCase()) ||
      formatDate(batch.period_end).toLowerCase().includes(search.toLowerCase()) ||
      batch.total_employees.toString().includes(search) ||
      batch.total_net.toString().includes(search)
    );

    // Status filter (from FilterDropdown)
    const statusValues = filterValues.status || [];
    const matchesStatus = statusValues.length === 0 ||
      statusValues.includes(batch.status.toLowerCase());

    // Individual Period Start filter
    const periodStartFilter = filterValues.period_start;
    const matchesPeriodStart = !periodStartFilter ||
      new Date(batch.period_start) >= new Date(periodStartFilter);

    // Individual Period End filter
    const periodEndFilter = filterValues.period_end;
    const matchesPeriodEnd = !periodEndFilter ||
      new Date(batch.period_end) <= new Date(periodEndFilter);

    // Total Employees range filter
    const totalEmployeesRange = filterValues.total_employees || { min: '', max: '' };
    const matchesTotalEmployees = (
      (!totalEmployeesRange.min || batch.total_employees >= Number(totalEmployeesRange.min)) &&
      (!totalEmployeesRange.max || batch.total_employees <= Number(totalEmployeesRange.max))
    );

    // Total Net range filter
    const totalNetRange = filterValues.total_net || { min: '', max: '' };
    const matchesTotalNet = (
      (!totalNetRange.min || batch.total_net >= Number(totalNetRange.min)) &&
      (!totalNetRange.max || batch.total_net <= Number(totalNetRange.max))
    );

    // Date range filter (keep existing for backward compatibility)
    const dateRange = filterValues.dateRange || { from: '', to: '' };
    let matchesDateRange = true;
    if (dateRange.from || dateRange.to) {
      const periodStart = new Date(batch.period_start);
      const periodEnd = new Date(batch.period_end);

      if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        matchesDateRange = matchesDateRange && (periodStart >= fromDate || periodEnd >= fromDate);
      }

      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        matchesDateRange = matchesDateRange && (periodStart <= toDate || periodEnd <= toDate);
      }
    }

    return matchesSearch && matchesStatus && matchesPeriodStart && matchesPeriodEnd &&
      matchesTotalEmployees && matchesTotalNet && matchesDateRange;
  });

  // Handle open view modal
  const handleOpenViewModal = (batch: PayrollBatch) => {
    setSelectedBatch(batch);
    setViewModalOpen(true);
  };

  // Prepare export data
  const exportData = filteredData.map(batch => ({
    'Batch Code': batch.payroll_period_code,
    'Period Start': formatDate(batch.period_start),
    'Period End': formatDate(batch.period_end),
    'Total Employees': batch.total_employees,
    'Total Net': formatMoney(batch.total_net),
    'Status': batch.status
  }));

  const exportColumns = [
    { header: 'Batch Code', key: 'Batch Code' },
    { header: 'Period Start', key: 'Period Start' },
    { header: 'Period End', key: 'Period End' },
    { header: 'Total Employees', key: 'Total Employees' },
    { header: 'Total Net', key: 'Total Net' },
    { header: 'Status', key: 'Status' }
  ];

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Payroll Management</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Payroll Management</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setLoading(true);
            setError(null);
            setErrorCode(null);
            fetchPayrollBatches(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Payroll Management (View Only)</h1>
        </div>

        {/* Settings: Search Bar + Filters */}
        <div className="settings">
          <div className="search-filter-container">
            <div className="searchBar">
              <form onSubmit={handleSearchSubmit}>
                <i className="ri-search-line" />
                <input
                  type="text"
                  placeholder="Search batch code, period, employees, net pay"
                  value={search}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyPress}
                  disabled={searchLoading}
                  className="searchInput"
                />

              </form>
            </div>
            <FilterDropdown
              sections={filterSections}
              onApply={handleApplyFilters}
              initialValues={filterValues}
            />
          </div>

          <div className="filters">
            <ExportButton
              data={exportData}
              filename="Payroll_Report"
              columns={exportColumns}
              title="Payroll Management Report"
            />
          </div>
        </div>

        {/* Payroll Batches Table */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Batch Code</th>
                  <th>Period Start</th>
                  <th>Period End</th>
                  <th>Total Employees</th>
                  <th>Total Net</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((batch, index) => (
                  <tr
                    key={batch.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleOpenViewModal(batch)}
                  >
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td>{batch.payroll_period_code}</td>
                    <td>{formatDate(batch.period_start)}</td>
                    <td>{formatDate(batch.period_end)}</td>
                    <td>{batch.total_employees}</td>
                    <td>{formatMoney(batch.total_net)}</td>
                    <td>
                      <span className={`chip ${batch.status.toLowerCase()}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td>
                      <div className="actionButtonsContainer">
                        <button
                          className="viewBtn"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenViewModal(batch);
                          }}
                          title="View Details"
                        >
                          <i className="ri-eye-line" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredData.length === 0 && (
              <p className="noRecords">No payroll batches found.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {/* View Payroll Batch Modal - Read-only for staff */}
        {viewModalOpen && selectedBatch && (
          <ModalManager
            isOpen={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedBatch(null);
            }}
            modalContent={
              <ViewPayrollBatch
                batch={selectedBatch}
                onClose={() => {
                  setViewModalOpen(false);
                  setSelectedBatch(null);
                }}
                onDisburse={async () => {}} // Disabled for staff
                currentUser={currentUser}
              />
            }
          />
        )}
      </div>
    </div>
  );
};

export default StaffPayrollPage;
