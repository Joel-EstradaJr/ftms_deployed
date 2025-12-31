// financial-management\payroll\page.tsx
"use client";

import React, { useState, useEffect, useCallback} from "react";
import "../../../../styles/payroll/payroll.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css"
import PaginationComponent from "../../../../Components/pagination";
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import FilterDropdown, { FilterSection } from '../../../../Components/filter';
import { showSuccess, showError, showConfirmation } from '../../../../utils/Alerts';
import { formatMoney, formatDate } from '../../../../utils/formatting';
import { PayrollBatch, PayrollBatchFormData } from './types';
import RecordPayrollBatch from './recordPayrollBatch';
import ViewPayrollBatch from './viewPayrollBatch';
import ModalManager from '../../../../Components/modalManager';
import ExportButton from '../../../../Components/ExportButton';

const PayrollPage = () => {
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
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);

  // Current user (TODO: Get from auth context)
  const currentUser = 'Admin User';

  // Fetch payroll batches from API
  const fetchPayrollBatches = useCallback(async (isSearch = false) => {
    try {
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // TODO: Replace with ftms_backend API call - http://localhost:4000/api/payroll/batches
      console.warn('API integration pending - using mock payroll batch data');
      
      // Mock data for demonstration
      const mockBatches: PayrollBatch[] = [
        {
          id: '1',
          payroll_period_code: 'PAY-202511-001',
          period_start: '2025-11-01',
          period_end: '2025-11-30',
          totalGross: 150000,
          totalDeductions: 30000,
          total_net: 120000,
          total_employees: 5,
          status: 'PENDING',
          createdBy: 'Admin User',
          createdAt: '2025-11-20T10:00:00Z',
          payrolls: [
            {
              id: 'p1',
              batchId: '1',
              employeeId: 'EMP-001',
              baseSalary: 15600,
              allowances: 2000,
              deductions: 1500,
              netPay: 16100,
              isDisbursed: false,
              createdAt: '2025-11-20T10:00:00Z',
              employee: {
                employeeNumber: 'EMP-001',
                firstName: 'Juan',
                lastName: 'Dela Cruz',
                department: 'Operations',
                position: 'Driver',
                status: 'active'
              }
            }
          ]
        }
      ];
      
      setBatches(mockBatches);
      setTotalPages(Math.ceil(mockBatches.length / pageSize));
      
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

  // Handle save (add/edit) payroll batch
  const handleSaveBatch = async (formData: PayrollBatchFormData, mode: 'add' | 'edit') => {
    try {
      // TODO: Replace with actual API call to ftms_backend
      console.warn('Save payroll batch API call pending');
      console.log('Form data:', formData);
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchPayrollBatches(false);
      setRecordModalOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      throw new Error('Failed to save payroll batch');
    }
  };

  // Handle disbursement
  const handleDisburse = async (batchId: string, payrollIds: string[]) => {
    try {
      // TODO: Replace with actual API call to ftms_backend
      console.warn('Disburse payroll API call pending');
      console.log('Disbursing payrolls:', payrollIds, 'in batch:', batchId);
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await fetchPayrollBatches(false);
    } catch (error) {
      throw new Error('Failed to disburse payroll');
    }
  };

  // Handle delete batch
  const handleDeleteBatch = async (batchId: string) => {
    const confirmed = await showConfirmation(
      'Are you sure you want to delete this payroll batch?',
      'Confirm Delete'
    );

    if (confirmed.isConfirmed) {
      try {
        // TODO: Replace with actual API call to ftms_backend
        console.warn('Delete payroll batch API call pending');
        
        await fetchPayrollBatches(false);
        showSuccess('Payroll batch deleted successfully', 'Success');
      } catch (error) {
        showError('Failed to delete payroll batch', 'Error');
      }
    }
  };

  // Handle release all pending
  const handleReleaseAll = async () => {
    const pendingBatches = filteredData.filter(b => b.status.toLowerCase() === 'pending');
    
    if (pendingBatches.length === 0) {
      showError('No pending payroll batches to release', 'No Pending Batches');
      return;
    }

    const confirmed = await showConfirmation(
      `Release all ${pendingBatches.length} pending payroll batch(es)?`,
      'Confirm Release All'
    );

    if (confirmed.isConfirmed) {
      try {
        // TODO: Replace with ftms_backend API call
        console.warn('API integration pending - mock release all');
        await new Promise(resolve => setTimeout(resolve, 500));
        showSuccess(`${pendingBatches.length} payroll batch(es) released successfully`, 'Success');
        fetchPayrollBatches(false);
      } catch (error) {
        showError('Failed to release payroll batches', 'Error');
      }
    }
  };

  // Handle open add modal
  const handleOpenAddModal = () => {
    setEditMode('add');
    setSelectedBatch(null);
    setRecordModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (batch: PayrollBatch) => {
    setEditMode('edit');
    setSelectedBatch(batch);
    setRecordModalOpen(true);
  };

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
          <h1>Payroll Management</h1>
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
            <button
              className="releaseAllBtn"
              onClick={handleReleaseAll}
              disabled={filteredData.filter(b => b.status.toLowerCase() === 'pending').length === 0}
            >
              <i className="ri-check-double-line" /> Release All Pending
            </button>

            <ExportButton
              data={exportData}
              filename="Payroll_Report"
              columns={exportColumns}
              title="Payroll Management Report"
            />
            
            <button
              className="addButton"
              onClick={handleOpenAddModal}
            >
              <i className="ri-add-line" /> Generate Payroll Batch
            </button>
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
                        {batch.status === 'PENDING' && (
                          <button
                            className="editBtn"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEditModal(batch);
                            }}
                            title="Edit Batch"
                          >
                            <i className="ri-edit-line" />
                          </button>
                        )}
                        <button
                          className="deleteBtn"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteBatch(batch.id);
                          }}
                          title="Delete Batch"
                        >
                          <i className="ri-delete-bin-line" />
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

        {/* Record Payroll Batch Modal */}
        {recordModalOpen && (
          <ModalManager
            isOpen={recordModalOpen}
            onClose={() => {
              setRecordModalOpen(false);
              setSelectedBatch(null);
            }}
            modalContent={
              <RecordPayrollBatch
                mode={editMode}
                existingData={selectedBatch}
                onSave={handleSaveBatch}
                onClose={() => {
                  setRecordModalOpen(false);
                  setSelectedBatch(null);
                }}
                currentUser={currentUser}
              />
            }
          />
        )}

        {/* View Payroll Batch Modal */}
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
                onDisburse={handleDisburse}
                currentUser={currentUser}
              />
            }
          />
        )}
      </div>
    </div>
  );
};

export default PayrollPage;