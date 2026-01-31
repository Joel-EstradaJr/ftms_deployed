'use client';

import React, { useState, useEffect, useCallback } from 'react';
import '../../../../styles/components/modal.css';
import '../../../../styles/components/table.css';
import '../../../../styles/components/chips.css';
import { formatDate } from '../../../../utils/formatting';
import PaginationComponent from '../../../../Components/pagination';
import { DepartmentBudget, AllocationHistory, fetchAllocationHistory } from '@/app/services/budgetAllocationService';

// Props interface
interface DepartmentDetailsModalProps {
  department: DepartmentBudget;
  isOpen: boolean;
  onClose: () => void;
}

interface FilterState {
  search: string;
  type: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}

interface SortState {
  field: 'date' | 'amount' | 'type' | 'status' | 'allocated_by';
  direction: 'asc' | 'desc';
}

const DepartmentDetailsModal: React.FC<DepartmentDetailsModalProps> = ({
  department,
  isOpen,
  onClose
}) => {
  // State management
  const [allocationHistory, setAllocationHistory] = useState<AllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: ''
  });
  const [sort, setSort] = useState<SortState>({
    field: 'date',
    direction: 'desc'
  });

  // Load allocation history from API
  const loadAllocationHistory = useCallback(async () => {
    if (!department) return;

    try {
      setLoading(true);
      const result = await fetchAllocationHistory(department.department_id, {
        type: filters.type as 'Allocation' | 'Deduction' | undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      setAllocationHistory(result.data);
    } catch (error) {
      console.error('Error loading allocation history:', error);
      setAllocationHistory([]);
    } finally {
      setLoading(false);
    }
  }, [department, filters.type, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    if (isOpen && department) {
      loadAllocationHistory();
    }
  }, [isOpen, department, loadAllocationHistory]);

  // Filter and sort logic
  const getFilteredAndSortedHistory = () => {
    const filtered = allocationHistory.filter(item => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          item.allocation_id.toLowerCase().includes(searchLower) ||
          item.allocated_by.toLowerCase().includes(searchLower) ||
          item.notes.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (filters.type && item.type !== filters.type) return false;

      // Status filter
      if (filters.status && item.status !== filters.status) return false;

      // Date range filter
      if (filters.dateFrom && new Date(item.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(item.date) > new Date(filters.dateTo)) return false;

      // Amount range filter
      const absoluteAmount = Math.abs(item.amount);
      if (filters.amountMin && absoluteAmount < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && absoluteAmount > parseFloat(filters.amountMax)) return false;

      return true;
    });

    // Sort filtered results
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'allocated_by':
          aValue = a.allocated_by;
          bValue = b.allocated_by;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  // Pagination logic
  const filteredHistory = getFilteredAndSortedHistory();
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort]);

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Allocated': return 'Approved';
      case 'Closed': return 'Closed';
      case 'Pending': return 'pending-approval';
      case 'Cancelled': return 'Rejected';
      default: return 'Approved';
    }
  };

  // Get type badge class
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Allocation': return 'type-allocation';
      case 'Deduction': return 'type-deduction';
      case 'Adjustment': return 'type-adjustment';
      default: return 'type-allocation';
    }
  };

  // Format amount with proper sign and color
  const formatAmount = (amount: number) => {
    const isPositive = amount >= 0;
    return (
      <span className={`amount-value ${isPositive ? 'positive' : 'negative'}`}>
        {isPositive ? '+' : ''}₱{Math.abs(amount).toLocaleString()}
      </span>
    );
  };

  // Filter handlers
  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSortChange = (field: SortState['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      type: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: ''
    });
  };

  // Export handlers
  const handleExportCSV = () => {
    console.log('Export CSV');
  };

  const handleExportExcel = () => {
    console.log('Export Excel');
  };

  const handleExportPDF = () => {
    console.log('Export PDF');
  };

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalStandard" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modalHeader">
          <h1>{department.department_name} Department</h1>
          <button
            className="closeButton"
            onClick={onClose}
            style={{ position: 'absolute', top: '10px', right: '10px' }}
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {/* Department Summary */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <i className="ri-money-dollar-circle-line" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary-text-color)', marginBottom: '0.25rem' }}>Allocated</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-text-color)' }}>₱{department.allocated_budget.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <i className="ri-shopping-cart-line" style={{ fontSize: '1.5rem', color: 'var(--warning-color)' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary-text-color)', marginBottom: '0.25rem' }}>Used</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-text-color)' }}>₱{department.used_budget.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <i className="ri-wallet-line" style={{ fontSize: '1.5rem', color: department.remaining_budget < 0 ? 'var(--error-color)' : 'var(--success-color)' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary-text-color)', marginBottom: '0.25rem' }}>Remaining</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: department.remaining_budget < 0 ? 'var(--error-color)' : 'var(--primary-text-color)' }}>₱{department.remaining_budget.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--table-row-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <i className="ri-percent-line" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }} />
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--secondary-text-color)', marginBottom: '0.25rem' }}>Utilization</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-text-color)' }}>
                    {Math.round((department.used_budget / department.allocated_budget) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Global Actions */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                <i className="ri-search-line" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-text-color)' }} />
                <input
                  type="text"
                  placeholder="Search allocations..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--foreground-color)',
                    color: 'var(--primary-text-color)',
                    outline: 'none'
                  }}
                />
              </div>

              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--foreground-color)',
                  color: 'var(--primary-text-color)',
                  outline: 'none'
                }}
              >
                <option value="">All Types</option>
                <option value="Allocation">Allocation</option>
                <option value="Deduction">Deduction</option>
                <option value="Adjustment">Adjustment</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--foreground-color)',
                  color: 'var(--primary-text-color)',
                  outline: 'none'
                }}
              >
                <option value="">All Statuses</option>
                <option value="Allocated">Allocated</option>
                <option value="Closed">Closed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <input
                type="date"
                placeholder="Date From"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--foreground-color)',
                  color: 'var(--primary-text-color)',
                  outline: 'none'
                }}
              />

              <input
                type="date"
                placeholder="Date To"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--foreground-color)',
                  color: 'var(--primary-text-color)',
                  outline: 'none'
                }}
              />

              <button
                onClick={clearAllFilters}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--foreground-color)',
                  color: 'var(--secondary-text-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <i className="ri-filter-off-line" /> Clear Filters
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <button style={{
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--button-font-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <i className="ri-download-line" /> Export
                </button>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  backgroundColor: 'var(--foreground-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: 'var(--box-shadow)',
                  zIndex: '1000',
                  minWidth: '120px',
                  display: 'none' // This would need to be controlled with state
                }}>
                  <button onClick={handleExportCSV} style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                    <i className="ri-file-text-line" /> CSV
                  </button>
                  <button onClick={handleExportExcel} style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                    <i className="ri-file-excel-line" /> Excel
                  </button>
                  <button onClick={handleExportPDF} style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
                    <i className="ri-file-pdf-line" /> PDF
                  </button>
                </div>
              </div>

              <button style={{
                padding: '0.75rem 1rem',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: 'var(--success-color)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="ri-add-line" /> Add Allocation
              </button>
            </div>
          </div>

          {/* Allocation History Table */}
          <div className="table-wrapper">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-text-color)' }}>
                <i className="ri-loader-4-line" style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem' }}>Loading allocation history...</p>
              </div>
            ) : (
              <>
                <div className="tableContainer">
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => handleSortChange('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Date
                          <i className={`ri-arrow-${sort.field === 'date' && sort.direction === 'asc' ? 'up' : 'down'}-line`} style={{ marginLeft: '0.5rem' }} />
                        </th>
                        <th onClick={() => handleSortChange('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Type
                          <i className={`ri-arrow-${sort.field === 'type' && sort.direction === 'asc' ? 'up' : 'down'}-line`} style={{ marginLeft: '0.5rem' }} />
                        </th>
                        <th onClick={() => handleSortChange('amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Amount
                          <i className={`ri-arrow-${sort.field === 'amount' && sort.direction === 'asc' ? 'up' : 'down'}-line`} style={{ marginLeft: '0.5rem' }} />
                        </th>
                        <th onClick={() => handleSortChange('allocated_by')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Allocated By
                          <i className={`ri-arrow-${sort.field === 'allocated_by' && sort.direction === 'asc' ? 'up' : 'down'}-line`} style={{ marginLeft: '0.5rem' }} />
                        </th>
                        <th>Notes</th>
                        <th onClick={() => handleSortChange('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                          Status
                          <i className={`ri-arrow-${sort.field === 'status' && sort.direction === 'asc' ? 'up' : 'down'}-line`} style={{ marginLeft: '0.5rem' }} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map((item) => (
                        <tr key={item.allocation_id}>
                          <td>
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--primary-text-color)' }}>{formatDate(item.date)}</div>
                              <div style={{ fontSize: '0.875rem', color: 'var(--secondary-text-color)' }}>{item.allocation_id}</div>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              backgroundColor: item.type === 'Allocation' ? 'var(--success-color)' : item.type === 'Deduction' ? 'var(--error-color)' : 'var(--warning-color)',
                              color: 'white'
                            }}>
                              {item.type}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              color: item.amount >= 0 ? 'var(--success-color)' : 'var(--error-color)',
                              fontWeight: '600'
                            }}>
                              {item.amount >= 0 ? '+' : ''}₱{Math.abs(item.amount).toLocaleString()}
                            </span>
                          </td>
                          <td>{item.allocated_by}</td>
                          <td>
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.notes}>
                              {item.notes.length > 50 ? `${item.notes.substring(0, 50)}...` : item.notes}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              backgroundColor: item.status === 'Allocated' ? 'var(--success-color)' : item.status === 'Closed' ? 'var(--secondary-text-color)' : item.status === 'Pending' ? 'var(--warning-color)' : 'var(--error-color)',
                              color: 'white'
                            }}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredHistory.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--secondary-text-color)' }}>
                    <i className="ri-file-list-line" style={{ fontSize: '3rem', marginBottom: '1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-text-color)' }}>No allocation history found</h3>
                    <p style={{ margin: '0' }}>Try adjusting your search and filter criteria</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredHistory.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <PaginationComponent
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={setItemsPerPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetailsModal;