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
  disposal_code: string;
  disposal_method: string;
  disposal_date: string;
  quantity: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  
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
  disposal_revenue?: {
    disposal_value: number;
    book_value: number;
    gain_loss: number;
  };
  
  // Legacy fields for backward compatibility
  gainLoss?: number;
  itemCode?: string;
  batchNumber?: string;
  busCode?: string;
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
  // 1. STOCK DISPOSAL - Office Equipment
  {
    id: 1,
    disposal_code: 'DISP-2026-001',
    disposal_method: 'FOR_SALE',
    disposal_date: '2026-01-15',
    quantity: 8,
    status: 'PENDING',
    description: 'Disposal of obsolete office computers and monitors - end of useful life',
    
    // Stock details with nested item information
    stock: {
      item_code: 'IT-COMP-001',
      item: {
        item_name: 'Desktop Computer - Dell OptiPlex 7040',
        unit: {
          unit_name: 'Units'
        },
        category: {
          category_name: 'IT Equipment'
        },
        description: 'Desktop computer with Intel i5 processor, 8GB RAM, 500GB HDD'
      },
      current_stock: 25,
      status: 'ACTIVE',
      created_at: '2020-03-15'
    },
    
    // Revenue details
    disposal_revenue: {
      disposal_value: 32000.00,
      book_value: 48000.00,
      gain_loss: -16000.00
    }
  },

  // 2. BATCH DISPOSAL - Expired Medical Supplies
  {
    id: 2,
    disposal_code: 'DISP-2026-002',
    disposal_method: 'DONATION',
    disposal_date: '2026-01-10',
    quantity: 250,
    status: 'PENDING',
    description: 'Disposal of near-expiry first aid supplies - donation to local health centers',
    
    // Batch details with nested stock and item information
    batch: {
      batch_number: 'BATCH-2024-MED-089',
      stock: {
        item_code: 'MED-FAK-003',
        item: {
          item_name: 'First Aid Kit - Complete Set',
          unit: {
            unit_name: 'Boxes'
          },
          category: {
            category_name: 'Medical Supplies'
          }
        }
      },
      quantity: 250,
      expiration_date: '2026-03-31',
      received_date: '2024-04-15',
      remarks: 'Nearing expiration date - suitable for donation before expiry'
    },
    
    // Revenue details
    disposal_revenue: {
      disposal_value: 0.00,
      book_value: 187500.00,
      gain_loss: -187500.00
    }
  },

  // 3. BUS DISPOSAL - Brand New Acquisition (Retired Bus)
  {
    id: 3,
    disposal_code: 'DISP-2026-003',
    disposal_method: 'FOR_SALE',
    disposal_date: '2026-01-08',
    quantity: 1,
    status: 'APPROVED',
    description: 'Disposal of bus unit due to excessive repair costs and age - replaced with newer model',
    
    // Bus details with nested manufacturer and body builder information
    bus: {
      bus_code: 'BUS-2015-045',
      plate_number: 'ABC-1234',
      body_number: 'BN-2015-045',
      bus_type: 'AIRCONDITIONED',
      status: 'OUT_OF_SERVICE',
      model: 'Fuso Rosa',
      year_model: '2015',
      condition: 'FAIR',
      acquisition_method: 'BRAND_NEW',
      
      // Nested manufacturer details
      manufacturer: {
        manufacturer_name: 'Mitsubishi Fuso Truck and Bus Corporation'
      },
      
      // Nested body builder details
      body_builder: {
        body_builder_name: 'Santarosa Motor Works Inc.'
      },
      
      chassis_number: 'MHFFE8B00FK123456',
      engine_number: '4P10-T123456',
      seat_capacity: 29,
      registration_status: 'REGISTERED',
      
      // Brand new acquisition details
      brand_new_details: {
        dealer_name: 'Diamond Motor Corporation - Cebu Branch'
      }
    },
    
    // Revenue details
    disposal_revenue: {
      disposal_value: 850000.00,
      book_value: 1200000.00,
      gain_loss: -350000.00
    }
  },

  // 4. BUS DISPOSAL - Second Hand Acquisition
  {
    id: 4,
    disposal_code: 'DISP-2026-004',
    disposal_method: 'FOR_SALE',
    disposal_date: '2025-12-20',
    quantity: 1,
    status: 'APPROVED',
    description: 'Disposal of older bus unit acquired second-hand - retiring from service',
    
    // Bus details with second-hand acquisition
    bus: {
      bus_code: 'BUS-2012-018',
      plate_number: 'XYZ-5678',
      body_number: 'BN-2012-018',
      bus_type: 'NON_AIRCONDITIONED',
      status: 'OUT_OF_SERVICE',
      model: 'Isuzu NQR',
      year_model: '2012',
      condition: 'POOR',
      acquisition_method: 'SECOND_HAND',
      
      // Nested manufacturer details
      manufacturer: {
        manufacturer_name: 'Isuzu Motors Limited'
      },
      
      // Nested body builder details
      body_builder: {
        body_builder_name: 'Centro Manufacturing Corporation'
      },
      
      chassis_number: 'JALC4B16007123789',
      engine_number: '4HK1-TC456789',
      seat_capacity: 33,
      registration_status: 'REGISTERED',
      
      // Second-hand acquisition details
      second_hand_details: {
        previous_owner: 'Metro Manila Transport Services Inc.'
      }
    },
    
    // Revenue details
    disposal_revenue: {
      disposal_value: 320000.00,
      book_value: 280000.00,
      gain_loss: 40000.00
    }
  },

  // 5. STOCK DISPOSAL - Spare Parts with Gain
  {
    id: 5,
    disposal_code: 'DISP-2025-089',
    disposal_date: '2025-12-15',
    disposal_method: 'FOR_SALE',
    quantity: 15,
    status: 'APPROVED',
    description: 'Sale of excess spare parts inventory - compatible with multiple bus models',
    
    stock: {
      item_code: 'BUS-ENG-FILTER-007',
      item: {
        item_name: 'Engine Oil Filter - Universal Type',
        unit: {
          unit_name: 'Pieces'
        },
        category: {
          category_name: 'Bus Spare Parts'
        },
        description: 'High-quality engine oil filter compatible with Isuzu, Mitsubishi, and Hino models'
      },
      current_stock: 45,
      status: 'ACTIVE',
      created_at: '2023-06-20'
    },
    
    disposal_revenue: {
      disposal_value: 18000.00,
      book_value: 12000.00,
      gain_loss: 6000.00
    }
  },

  // 6. BATCH DISPOSAL - Food Supplies Near Expiry
  {
    id: 6,
    disposal_code: 'DISP-2025-112',
    disposal_method: 'DONATION',
    disposal_date: '2025-11-28',
    quantity: 500,
    status: 'REJECTED',
    description: 'Proposed disposal of canned goods batch - donation to charity organizations',
    
    batch: {
      batch_number: 'BATCH-2023-FOOD-156',
      stock: {
        item_code: 'FOOD-CANNED-012',
        item: {
          item_name: 'Canned Sardines - 155g',
          unit: {
            unit_name: 'Cans'
          },
          category: {
            category_name: 'Food Supplies'
          }
        }
      },
      quantity: 500,
      expiration_date: '2026-02-15',
      received_date: '2023-08-10',
      remarks: 'Still within safe consumption period - proposed for employee welfare distribution instead'
    },
    
    disposal_revenue: {
      disposal_value: 0.00,
      book_value: 17500.00,
      gain_loss: -17500.00
    }
  }
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
  const [sortField, setSortField] = useState<string | null>('disposal_date');
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
        item.disposal_code.toLowerCase().includes(search) ||
        item.disposal_method.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.status.toLowerCase().includes(search) ||
        item.stock?.item_code?.toLowerCase().includes(search) ||
        item.stock?.item?.item_name?.toLowerCase().includes(search) ||
        item.batch?.batch_number?.toLowerCase().includes(search) ||
        item.batch?.stock?.item?.item_name?.toLowerCase().includes(search) ||
        item.bus?.bus_code?.toLowerCase().includes(search) ||
        item.bus?.plate_number?.toLowerCase().includes(search) ||
        item.bus?.model?.toLowerCase().includes(search) ||
        item.itemCode?.toLowerCase().includes(search) ||
        item.batchNumber?.toLowerCase().includes(search) ||
        item.busCode?.toLowerCase().includes(search)
      );
    }

    // Apply date range filter
    if (activeFilters.dateFrom) {
      filtered = filtered.filter(item => new Date(item.disposal_date) >= new Date(activeFilters.dateFrom!));
    }
    if (activeFilters.dateTo) {
      filtered = filtered.filter(item => new Date(item.disposal_date) <= new Date(activeFilters.dateTo!));
    }

    // Apply gain/loss range filter
    if (activeFilters.gainLossMin !== undefined) {
      filtered = filtered.filter(item => {
        const gainLoss = item.disposal_revenue?.gain_loss ?? item.revenue?.gainLoss ?? item.gainLoss ?? 0;
        return gainLoss >= activeFilters.gainLossMin!;
      });
    }
    if (activeFilters.gainLossMax !== undefined) {
      filtered = filtered.filter(item => {
        const gainLoss = item.disposal_revenue?.gain_loss ?? item.revenue?.gainLoss ?? item.gainLoss ?? 0;
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
      if (sortField === 'disposal_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      // Handle numeric sorting
      if (sortField === 'gainLoss') {
        aVal = a.disposal_revenue?.gain_loss ?? a.revenue?.gainLoss ?? a.gainLoss ?? 0;
        bVal = b.disposal_revenue?.gain_loss ?? b.revenue?.gainLoss ?? b.gainLoss ?? 0;
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
                maxLength={50}
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
                    onClick={() => handleSort('disposal_code')}
                    className="sortable-header"
                    title="Click to sort by Disposal Code"
                  >
                    Disposal Code{getSortIndicator('disposal_code')}
                  </th>
                  <th>Disposal Method</th>
                  <th
                    onClick={() => handleSort('disposal_date')}
                    className="sortable-header"
                    title="Click to sort by Disposal Date"
                  >
                    Disposal Date{getSortIndicator('disposal_date')}
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
                      <td>{row.disposal_code}</td>
                      <td>
                        <span className="chip normal">{row.disposal_method}</span>
                      </td>
                      <td>{formatDate(row.disposal_date)}</td>
                      <td>
                        <span style={{
                          color: (row.disposal_revenue?.gain_loss ?? row.revenue?.gainLoss ?? row.gainLoss ?? 0) >= 0 ? '#4CAF50' : '#FF4949',
                          fontWeight: '600'
                        }}>
                          {formatMoney(row.disposal_revenue?.gain_loss ?? row.revenue?.gainLoss ?? row.gainLoss ?? 0)}
                        </span>
                      </td>
                      <td>
                        {row.stock?.item?.item_name || row.batch?.batch_number || row.bus?.plate_number || row.itemCode || row.batchNumber || row.busCode || '—'}
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