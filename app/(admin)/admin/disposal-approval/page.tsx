'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@/styles/components/table.css';
import '@/styles/components/chips.css';

import Swal from 'sweetalert2';
import { showSuccess, showError } from '@/utils/Alerts';
import { formatDate, formatMoney } from '@/utils/formatting';

import PaginationComponent from '@/Components/pagination';
import FilterDropdown, { FilterSection } from '@/Components/filter';
import Loading from '@/Components/loading';
import ErrorDisplay from '@/Components/errordisplay';
import ModalManager from '@/Components/modalManager';

import ViewDisposal from './viewDisposal';
import EditDisposal from './editDisposal';
import ReviewDisposal from './reviewDisposal';

// Types
interface DisposalRecord {
  id: number;
  disposalCode: string;
  disposalMethod: string;
  disposalDate: string;
  quantity: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  
  // Legacy fields for backward compatibility
  gainLoss?: number;
  itemCode?: string;
  batchNumber?: string;
  busCode?: string;
  
  // Stock details (if disposal type is stock)
  stock?: {
    item_code: string;
    item?: {
      item_name: string;
      unit?: {
        unit_name: string;
      };
      category?: {
        category_name: string;
      };
      description?: string;
    };
    current_stock: number;
    status: string;
    created_at: string;
  };
  
  // Batch details (if disposal type is batch)
  batch?: {
    batch_number: string;
    stock?: {
      item_code: string;
      item?: {
        item_name: string;
        unit?: {
          unit_name: string;
        };
        category?: {
          category_name: string;
        };
      };
    };
    quantity: number;
    expiration_date?: string;
    received_date: string;
    remarks?: string;
  };
  
  // Bus details (if disposal type is bus)
  bus?: {
    bus_code: string;
    plate_number: string;
    body_number: string;
    bus_type: string;
    status: string;
    model: string;
    year_model: string;
    condition: string;
    acquisition_method: string;
    manufacturer?: {
      manufacturer_name: string;
    };
    body_builder?: {
      body_builder_name: string;
    };
    chassis_number: string;
    engine_number: string;
    seat_capacity: number;
    registration_status: string;
    brand_new_details?: {
      dealer_name: string;
    };
    second_hand_details?: {
      previous_owner: string;
    };
  };
  
  // Revenue details
  revenue?: {
    disposalValue: number;
    bookValue: number;
    gainLoss: number;
  };
}

interface FilterValues {
  dateFrom?: string;
  dateTo?: string;
  gainLossMin?: number;
  gainLossMax?: number;
  statuses?: string[];
}

// Mock data
const MOCK_DISPOSAL_DATA: DisposalRecord[] = [
  {
    id: 1,
    disposalCode: 'DISP-2024-001',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-12-15',
    quantity: 5,
    gainLoss: 5000,
    itemCode: 'ITEM-001',
    status: 'PENDING',
    description: 'Old office furniture disposal'
  },
  {
    id: 2,
    disposalCode: 'DISP-2024-002',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-12-18',
    quantity: 100,
    gainLoss: -2000,
    batchNumber: 'BATCH-123',
    status: 'PENDING',
    description: 'Expired inventory batch'
  },
  {
    id: 3,
    disposalCode: 'DISP-2024-003',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-12-20',
    quantity: 1,
    gainLoss: 15000,
    busCode: 'BUS-456',
    status: 'APPROVED',
    description: 'Retired bus unit'
  },
  {
    id: 4,
    disposalCode: 'DISP-2024-004',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-12-10',
    quantity: 3,
    gainLoss: -5000,
    itemCode: 'ITEM-045',
    status: 'REJECTED',
    description: 'Damaged equipment disposal'
  },
  {
    id: 5,
    disposalCode: 'DISP-2024-005',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-12-12',
    quantity: 50,
    gainLoss: 8000,
    batchNumber: 'BATCH-089',
    status: 'PENDING',
    description: 'Surplus inventory sale'
  },
  {
    id: 6,
    disposalCode: 'DISP-2024-006',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-11-28',
    quantity: 1,
    gainLoss: 25000,
    busCode: 'BUS-234',
    status: 'APPROVED',
    description: 'Old bus unit disposal'
  },
  {
    id: 7,
    disposalCode: 'DISP-2024-007',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-11-25',
    quantity: 10,
    gainLoss: -3000,
    itemCode: 'ITEM-078',
    status: 'PENDING',
    description: 'Obsolete spare parts'
  },
  {
    id: 8,
    disposalCode: 'DISP-2024-008',
    disposalMethod: 'FOR_SALE',
    disposalDate: '2024-11-20',
    quantity: 75,
    gainLoss: 12000,
    batchNumber: 'BATCH-156',
    status: 'APPROVED',
    description: 'Excess stock disposal'
  },
];

const DisposalApproval = () => {
  // Filter sections configuration
  const filterSections: FilterSection[] = [
    {
      id: 'disposalDate',
      title: 'Disposal Date',
      type: 'dateRange',
      placeholder: 'Select date range'
    },
    {
      id: 'gainLoss',
      title: 'Gain or Loss',
      type: 'numberRange',
      placeholder: 'Enter amount'
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: 'PENDING', label: 'Pending' },
        { id: 'APPROVED', label: 'Approved' },
        { id: 'REJECTED', label: 'Rejected' }
      ]
    }
  ];

  // State declarations
  const [data, setData] = useState<DisposalRecord[]>(MOCK_DISPOSAL_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  
  // Search and filter states
  const [searchInput, setSearchInput] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterValues>({});
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting states
  const [sortField, setSortField] = useState<string | null>('disposalDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  // Filter and search logic
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchInput.trim()) {
      const search = searchInput.toLowerCase();
      filtered = filtered.filter((item) =>
        item.disposalCode.toLowerCase().includes(search) ||
        item.disposalMethod.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.status.toLowerCase().includes(search) ||
        item.itemCode?.toLowerCase().includes(search) ||
        item.batchNumber?.toLowerCase().includes(search) ||
        item.busCode?.toLowerCase().includes(search)
      );
    }

    // Apply date range filter
    if (activeFilters.dateFrom) {
      filtered = filtered.filter(item => new Date(item.disposalDate) >= new Date(activeFilters.dateFrom!));
    }
    if (activeFilters.dateTo) {
      filtered = filtered.filter(item => new Date(item.disposalDate) <= new Date(activeFilters.dateTo!));
    }

    // Apply gain/loss range filter
    if (activeFilters.gainLossMin !== undefined) {
      filtered = filtered.filter(item => {
        const gainLoss = item.revenue?.gainLoss ?? item.gainLoss ?? 0;
        return gainLoss >= activeFilters.gainLossMin!;
      });
    }
    if (activeFilters.gainLossMax !== undefined) {
      filtered = filtered.filter(item => {
        const gainLoss = item.revenue?.gainLoss ?? item.gainLoss ?? 0;
        return gainLoss <= activeFilters.gainLossMax!;
      });
    }

    // Apply status filter
    if (activeFilters.statuses && activeFilters.statuses.length > 0) {
      filtered = filtered.filter(item => activeFilters.statuses!.includes(item.status));
    }

    return filtered;
  }, [data, searchInput, activeFilters]);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal: any = a[sortField as keyof DisposalRecord];
      let bVal: any = b[sortField as keyof DisposalRecord];

      // Handle date sorting
      if (sortField === 'disposalDate') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numeric sorting
      if (sortField === 'gainLoss') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const filteredTableRows = sortedData.slice(startIndex, startIndex + pageSize);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, activeFilters]);

  // Handlers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (field: string) => {
    if (sortField !== field) return ' ↕';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const handleFilterApply = (filters: Record<string, any>) => {
    const transformedFilters: FilterValues = {
      dateFrom: filters.disposalDate?.from,
      dateTo: filters.disposalDate?.to,
      gainLossMin: filters.gainLoss?.from ? Number(filters.gainLoss.from) : undefined,
      gainLossMax: filters.gainLoss?.to ? Number(filters.gainLoss.to) : undefined,
      statuses: filters.status || []
    };
    setActiveFilters(transformedFilters);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'chip pending';
      case 'APPROVED':
        return 'chip approved';
      case 'REJECTED':
        return 'chip rejected';
      default:
        return 'chip normal';
    }
  };

  // Modal handlers
  const openModal = (type: 'view' | 'edit' | 'review', record: DisposalRecord, action?: 'approve' | 'reject') => {
    let content: React.ReactNode = null;

    switch (type) {
        case 'view':
        content = React.createElement(ViewDisposal, {
            disposal: record,
            onClose: closeModal
        });
        break;
        case 'edit':
        content = React.createElement(EditDisposal, {
            disposal: record,
            onSave: handleSave,
            onClose: closeModal
        });
        break;
        case 'review':
        content = React.createElement(ReviewDisposal, {
            disposal: record,
            action: action!,
            onSubmit: handleReview,
            onClose: closeModal
        });
        break;
    }

    setModalContent(content);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  const handleSave = async (updatedDisposal: DisposalRecord) => {
    try {
      // Update mock data
      const updatedData = data.map(item => 
        item.id === updatedDisposal.id ? updatedDisposal : item
      );
      setData(updatedData);

      showSuccess('Disposal updated successfully', 'Success');
      closeModal();
    } catch (err: any) {
      showError('Failed to update disposal', 'Error');
    }
  };

  const handleReview = async (disposalId: number, action: 'approve' | 'reject', remarks?: string) => {
    try {
      // Update mock data
      const updatedData = data.map(item => {
        if (item.id === disposalId) {
          return {
            ...item,
            status: action === 'approve' ? 'APPROVED' as const : 'REJECTED' as const
          };
        }
        return item;
      });
      setData(updatedData);

      showSuccess(
        `Disposal ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        'Success'
      );
      closeModal();
    } catch (err: any) {
      showError(`Failed to ${action} disposal`, 'Error');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the disposal record permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#961C1E',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      confirmButtonText: 'Yes, delete it!',
      background: 'white',
    });

    if (result.isConfirmed) {
      try {
        const updatedData = data.filter(item => item.id !== id);
        setData(updatedData);

        showSuccess('Disposal record deleted successfully', 'Deleted');
      } catch (err) {
        showError('Failed to delete disposal record', 'Error');
      }
    }
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Disposal Approval</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Disposal Approval</h1>
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

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Disposal Approval</h1>
        </div>
        
        <div className="settings">
          {/* Search bar */}
          <div className="search-filter-container">
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search disposals..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Filter button */}
            <FilterDropdown
              sections={filterSections}
              onApply={handleFilterApply}
              initialValues={{
                disposalDate: {
                  from: activeFilters.dateFrom || '',
                  to: activeFilters.dateTo || ''
                },
                gainLoss: {
                  from: activeFilters.gainLossMin?.toString() || '',
                  to: activeFilters.gainLossMax?.toString() || ''
                },
                status: activeFilters.statuses || []
              }}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('disposalCode')}
                    className="sortable-header"
                    title="Click to sort by Disposal Code"
                  >
                    Disposal Code{getSortIndicator('disposalCode')}
                  </th>
                  <th>Disposal Method</th>
                  <th
                    onClick={() => handleSort('disposalDate')}
                    className="sortable-header"
                    title="Click to sort by Disposal Date"
                  >
                    Disposal Date{getSortIndicator('disposalDate')}
                  </th>
                  <th
                    onClick={() => handleSort('gainLoss')}
                    className="sortable-header"
                    title="Click to sort by Gain/Loss"
                  >
                    Gain or Loss{getSortIndicator('gainLoss')}
                  </th>
                  <th>Item/Bus Reference</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="loading-cell">
                      Loading...
                    </td>
                  </tr>
                ) : filteredTableRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-cell">
                      No disposal records found.
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.disposalCode}</td>
                      <td>
                        <span className="chip normal">{row.disposalMethod}</span>
                      </td>
                      <td>{formatDate(row.disposalDate)}</td>
                      <td>
                        <span style={{
                          color: (row.revenue?.gainLoss ?? row.gainLoss ?? 0) >= 0 ? '#4CAF50' : '#FF4949',
                          fontWeight: '600'
                        }}>
                          {formatMoney(row.revenue?.gainLoss ?? row.gainLoss ?? 0)}
                        </span>
                      </td>
                      <td>
                        {row.itemCode || row.batchNumber || row.busCode || '—'}
                      </td>
                      <td>
                        <span className={getStatusClass(row.status)}>
                          {row.status}
                        </span>
                      </td>
                      <td className="actionButtons">
                        <div className="actionButtonsContainer">
                            {/* View button - always available */}
                            <button
                            className="viewBtn"
                            onClick={() => openModal('view', row)}
                            title="View Disposal"
                            >
                            <i className="ri-eye-line"></i>
                            </button>

                            {/* Approve button - enabled only for PENDING */}
                            <button
                            className="approveBtn"
                            onClick={() => row.status === 'PENDING' && openModal('review', row, 'approve')}
                            title={row.status === 'PENDING' ? 'Approve Disposal' : 'Only pending disposals can be approved'}
                            style={{ backgroundColor: '#4CAF50', color: 'white' }}
                            disabled={row.status !== 'PENDING'}
                            >
                            <i className="ri-check-line"></i>
                            </button>

                            {/* Reject button - enabled only for PENDING */}
                            <button
                            className="rejectBtn"
                            onClick={() => row.status === 'PENDING' && openModal('review', row, 'reject')}
                            title={row.status === 'PENDING' ? 'Reject Disposal' : 'Only pending disposals can be rejected'}
                            style={{ backgroundColor: '#FF4949', color: 'white' }}
                            disabled={row.status !== 'PENDING'}
                            >
                            <i className="ri-close-line"></i>
                            </button>

                            {/* Edit button - enabled only for PENDING */}
                            <button
                            className="editBtn"
                            onClick={() => row.status === 'PENDING' && openModal('edit', row)}
                            title={row.status === 'PENDING' ? 'Edit Disposal' : 'Only pending disposals can be edited'}
                            disabled={row.status !== 'PENDING'}
                            >
                            <i className="ri-edit-2-line" />
                            </button>

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

      {/* Modal Manager */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />
    </div>
  );
};

export default DisposalApproval;