/**
 * Admin Trip Revenue Page - Backend Integrated
 *
 * Displays bus trip records with revenue recording capability:
 * - Fetches data from /api/admin/revenue/bus-trips
 * - Server-side pagination, search, and sorting
 * - Database-optimized queries with indexes
 *
 * Columns: Body Number, Date Assigned, Trip Revenue, Assignment Type, Payment Method, Status, Actions
 */

"use client";

import React, { useState, useEffect } from "react";
import "../../../../styles/revenue/revenue.css";
import "../../../../styles/revenue/recordRevenue.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import Loading from '../../../../Components/loading';
import ErrorDisplay from '../../../../Components/errordisplay';
import ModalManager from "@/Components/modalManager";

import PaginationComponent from "../../../../Components/pagination";
import RevenueFilter from "../../../../Components/RevenueFilter";

import ViewTripRevenueModal from "./viewTripRevenue";
import RecordTripRevenueModal from "./recordTripRevenue"; // Combined add/edit modal

import { showSuccess, showError } from '../../../../utils/Alerts';
import { formatDate, formatMoney } from '../../../../utils/formatting';

// TypeScript interfaces
interface BusTripRecord {
  // Primary fields from Operations table
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string; // 'Percentage' or 'Boundary'
  assignment_value: number; // quota if Boundary, company share% if Percentage
  payment_method: string; // 'Company Cash' or 'Reimbursement'
  
  // Employee details (from Human Resource table)
  employee_id: string;
  employee_firstName: string;
  employee_middleName: string;
  employee_lastName: string;
  employee_suffix: string;
  position_id: string;
  position_name: string;
  
  // Bus details
  bus_plate_number: string;
  bus_type: string; // 'Airconditioned' or 'Ordinary'
  body_number: string;
  bus_brand: string; // 'Hilltop', 'Agila', 'DARJ'
  
  // Status tracking (from Model Revenue table)
  dateRecorded: string | null;
  amount: number | null;
  status: string; // 'remitted' or 'pending'
  remarks: string | null;
  
  // Computed/display fields
  driverName?: string; // Computed from employee fields
  conductorName?: string; // Computed from employee fields
}

interface RevenueSource {
  id: number;
  name: string;
  sourceCode: string;
}

interface PaymentMethod {
  id: number;
  methodName: string;
  methodCode: string;
}

// MOCK DATA FOR TESTING
const MOCK_BUS_TRIP_DATA: BusTripRecord[] = [
  {
    assignment_id: "ASSIGN-001",
    bus_trip_id: "TRIP-001",
    bus_route: "S. Palay to Sta. Cruz, S. Palay to PITX",
    date_assigned: "2024-11-10",
    trip_fuel_expense: 2500.00,
    trip_revenue: 15000.00,
    assignment_type: "Boundary",
    assignment_value: 8000.00,
    payment_method: "Company Cash",
    employee_id: "EMP-001",
    employee_firstName: "Juan",
    employee_middleName: "Santos",
    employee_lastName: "Dela Cruz",
    employee_suffix: "",
    position_id: "POS-001",
    position_name: "Driver",
    bus_plate_number: "ABC 1234",
    bus_type: "Airconditioned",
    body_number: "001",
    bus_brand: "Hilltop",
    dateRecorded: "2024-11-11",
    amount: 15000.00,
    status: "remitted",
    remarks: "On-time remittance, no issues",
    driverName: "Juan Santos Dela Cruz",
  },
  {
    assignment_id: "ASSIGN-002",
    bus_trip_id: "TRIP-002",
    bus_route: "S. Palay to Sta. Cruz",
    date_assigned: "2024-11-10",
    trip_fuel_expense: 2200.00,
    trip_revenue: 12500.00,
    assignment_type: "Percentage",
    assignment_value: 70,
    payment_method: "Reimbursement",
    employee_id: "EMP-002",
    employee_firstName: "Maria",
    employee_middleName: "Lopez",
    employee_lastName: "Garcia",
    employee_suffix: "Jr.",
    position_id: "POS-002",
    position_name: "Conductor",
    bus_plate_number: "XYZ 5678",
    bus_type: "Ordinary",
    body_number: "002",
    bus_brand: "Agila",
    dateRecorded: null,
    amount: null,
    status: "pending",
    remarks: null,
    conductorName: "Maria Lopez Garcia, Jr.",
  },
  {
    assignment_id: "ASSIGN-003",
    bus_trip_id: "TRIP-003",
    bus_route: "S. Palay to PITX",
    date_assigned: "2024-11-09",
    trip_fuel_expense: 3000.00,
    trip_revenue: 18000.00,
    assignment_type: "Boundary",
    assignment_value: 10000.00,
    payment_method: "Company Cash",
    employee_id: "EMP-003",
    employee_firstName: "Pedro",
    employee_middleName: "Ramos",
    employee_lastName: "Reyes",
    employee_suffix: "Sr.",
    position_id: "POS-001",
    position_name: "Driver",
    bus_plate_number: "DEF 9012",
    bus_type: "Airconditioned",
    body_number: "003",
    bus_brand: "DARJ",
    dateRecorded: "2024-11-10",
    amount: 18000.00,
    status: "remitted",
    remarks: "Complete remittance with fuel receipts",
    driverName: "Pedro Ramos Reyes, Sr.",
  },
  {
    assignment_id: "ASSIGN-004",
    bus_trip_id: "TRIP-004",
    bus_route: "Sta. Cruz to S. Palay",
    date_assigned: "2024-11-09",
    trip_fuel_expense: 1800.00,
    trip_revenue: 10000.00,
    assignment_type: "Percentage",
    assignment_value: 65,
    payment_method: "Company Cash",
    employee_id: "EMP-004",
    employee_firstName: "Ana",
    employee_middleName: "Torres",
    employee_lastName: "Santos",
    employee_suffix: "",
    position_id: "POS-002",
    position_name: "Conductor",
    bus_plate_number: "GHI 3456",
    bus_type: "Ordinary",
    body_number: "004",
    bus_brand: "Hilltop",
    dateRecorded: null,
    amount: null,
    status: "pending",
    remarks: null,
    conductorName: "Ana Torres Santos",
  },
  {
    assignment_id: "ASSIGN-005",
    bus_trip_id: "TRIP-005",
    bus_route: "S. Palay to Sta. Cruz, S. Palay to PITX",
    date_assigned: "2024-11-08",
    trip_fuel_expense: 2800.00,
    trip_revenue: 16500.00,
    assignment_type: "Boundary",
    assignment_value: 9000.00,
    payment_method: "Reimbursement",
    employee_id: "EMP-005",
    employee_firstName: "Carlos",
    employee_middleName: "Mendoza",
    employee_lastName: "Villanueva",
    employee_suffix: "III",
    position_id: "POS-001",
    position_name: "Driver",
    bus_plate_number: "JKL 7890",
    bus_type: "Airconditioned",
    body_number: "005",
    bus_brand: "Agila",
    dateRecorded: "2024-11-09",
    amount: 16500.00,
    status: "remitted",
    remarks: "Remitted with complete documentation",
    driverName: "Carlos Mendoza Villanueva, III",
  },
  {
    assignment_id: "ASSIGN-006",
    bus_trip_id: "TRIP-006",
    bus_route: "PITX to S. Palay",
    date_assigned: "2024-11-08",
    trip_fuel_expense: 2100.00,
    trip_revenue: 11000.00,
    assignment_type: "Percentage",
    assignment_value: 75,
    payment_method: "Company Cash",
    employee_id: "EMP-006",
    employee_firstName: "Elena",
    employee_middleName: "Cruz",
    employee_lastName: "Bautista",
    employee_suffix: "",
    position_id: "POS-002",
    position_name: "Conductor",
    bus_plate_number: "MNO 2345",
    bus_type: "Ordinary",
    body_number: "006",
    bus_brand: "DARJ",
    dateRecorded: null,
    amount: null,
    status: "pending",
    remarks: null,
    conductorName: "Elena Cruz Bautista",
  },
];

const MOCK_REVENUE_SOURCES: RevenueSource[] = [
  { id: 1, name: "Trip Revenue", sourceCode: "TRIP_REV" },
  { id: 2, name: "Charter Service", sourceCode: "CHARTER" },
  { id: 3, name: "Advertising", sourceCode: "ADVERT" },
];

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 1, methodName: "Company Cash", methodCode: "CASH" },
  { id: 2, methodName: "Reimbursement", methodCode: "REIMBURSE" },
];

const AdminTripRevenuePage = () => {
  // State for data and UI
  const [data, setData] = useState<BusTripRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Filter options state
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debouncing
  const [activeFilters, setActiveFilters] = useState<{
    sources: string[];
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }>({
    sources: [],
    paymentMethods: [],
    dateRange: { from: '', to: '' },
    amountRange: { from: '', to: '' }
  });

  // Sort states
  const [sortBy, setSortBy] = useState<"body_number" | "date_assigned" | "trip_revenue">("date_assigned");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states using ModalManager pattern
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<BusTripRecord | null>(null);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  // Open modal with different modes
  const openModal = (mode: "view" | "add" | "edit", rowData?: BusTripRecord) => {
    let content;

    switch (mode) {
      case "view":
        content = <ViewTripRevenueModal
          tripData={rowData!}
          onClose={closeModal}
        />;
        break;
      case "add":
      case "edit":
        // Check if editing a remitted record
        if (mode === "edit" && rowData && rowData.status && rowData.status.toLowerCase() === "remitted") {
          showError(`This trip revenue cannot be edited because it has already been marked as <strong>${rowData.status}</strong>.`, 'Cannot Edit');
          return;
        }
        
        content = <RecordTripRevenueModal
          mode={mode}
          tripData={rowData!}
          onSave={handleSaveTripRevenue}
          onClose={closeModal}
        />;
        break;
      default:
        content = null;
    }

    setModalContent(content);
    setActiveRow(rowData || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  // Handle save trip revenue (both add and edit)
  const handleSaveTripRevenue = async (formData: any, mode: "add" | "edit") => {
    console.log(`${mode === 'add' ? 'Recording' : 'Updating'} trip revenue:`, formData);
    
    // TODO: Replace with actual API call
    // Simulate success for now
    showSuccess(`Trip revenue ${mode === 'add' ? 'recorded' : 'updated'} successfully (MOCK)`, 'Success');
    
    // Update local mock data
    if (mode === 'add') {
      setData(prevData => prevData.map(item => 
        item.assignment_id === formData.assignment_id
          ? {
              ...item,
              dateRecorded: formData.dateRecorded,
              amount: formData.amount,
              status: 'remitted',
              remarks: formData.remarks
            }
          : item
      ));
    } else {
      setData(prevData => prevData.map(item => 
        item.assignment_id === formData.assignment_id
          ? {
              ...item,
              dateRecorded: formData.dateRecorded,
              amount: formData.amount,
              remarks: formData.remarks
            }
          : item
      ));
    }
    
    closeModal();
  };

  // Fetch filter options (revenue sources and payment methods)
  const fetchFilterOptions = async () => {
    console.log('Loading mock filter options...');
    // Simulate API delay
    setTimeout(() => {
      setRevenueSources(MOCK_REVENUE_SOURCES);
      setPaymentMethods(MOCK_PAYMENT_METHODS);
    }, 300);
  };

  // Fetch data from API (using mock data)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Loading mock bus trip data...');
    
    // Simulate API delay
    setTimeout(() => {
      let filteredData = [...MOCK_BUS_TRIP_DATA];
      
      // Apply search filter
      if (search) {
        filteredData = filteredData.filter(item => 
          item.body_number.toLowerCase().includes(search.toLowerCase()) ||
          item.bus_route.toLowerCase().includes(search.toLowerCase()) ||
          item.assignment_id.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Apply payment method filter
      if (activeFilters.paymentMethods.length > 0) {
        filteredData = filteredData.filter(item => 
          activeFilters.paymentMethods.includes(item.payment_method)
        );
      }
      
      // Apply date range filter
      if (activeFilters.dateRange.from) {
        filteredData = filteredData.filter(item => 
          item.date_assigned >= activeFilters.dateRange.from
        );
      }
      if (activeFilters.dateRange.to) {
        filteredData = filteredData.filter(item => 
          item.date_assigned <= activeFilters.dateRange.to
        );
      }
      
      // Apply sorting
      filteredData.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];
        
        if (sortBy === 'trip_revenue') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Apply pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = filteredData.slice(startIndex, endIndex);
      
      setData(paginatedData);
      setTotalPages(Math.ceil(filteredData.length / pageSize));
      setTotalCount(filteredData.length);
      setLoading(false);
    }, 500);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, search, sortBy, sortOrder, activeFilters]);

  // Sort handler
  const handleSort = (field: "body_number" | "date_assigned" | "trip_revenue") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Get sort indicator for column
  const getSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? " ↑" : " ↓";
  };

  // Handle filter apply
  const handleFilterApply = (filterValues: {
    sources: string[];
    paymentMethods: string[];
    dateRange: { from: string; to: string };
    amountRange: { from: string; to: string };
  }) => {
    setActiveFilters(filterValues);
    setCurrentPage(1);
  };

  // Loading state
  if (loading && data.length === 0) {
    return (
      <div className="card">
        <h1 className="title">Trip Revenue Records</h1>
        <Loading />
      </div>
    );
  }

  if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Trip Revenue Records</h1>
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

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Trip Revenue Records</h1>
        </div>

        <div className="settings">
          <div className="search-filter-container">
            <div className="revenue_searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                placeholder="Search by body number, route, or assignment ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <RevenueFilter
              sources={revenueSources.map(source => ({
                id: source.id.toString(),
                label: source.name
              }))}
              paymentMethods={paymentMethods.map(method => ({
                id: method.id.toString(),
                label: method.methodName
              }))}
              onApply={handleFilterApply}
              initialValues={activeFilters}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort("body_number")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Body Number"
                  >
                    Body Number{getSortIndicator("body_number")}
                  </th>
                  <th
                    onClick={() => handleSort("date_assigned")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Date Assigned"
                  >
                    Date Assigned{getSortIndicator("date_assigned")}
                  </th>
                  <th
                    onClick={() => handleSort("trip_revenue")}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to sort by Trip Revenue"
                  >
                    Trip Revenue{getSortIndicator("trip_revenue")}
                  </th>
                  <th>Assignment Type</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      No bus trip records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.assignment_id}>
                      <td>{item.body_number}</td>
                      <td>{formatDate(item.date_assigned)}</td>
                      <td style={{ textAlign: 'right' }}>{formatMoney(item.trip_revenue)}</td>
                      <td>{item.assignment_type}</td>
                      <td>{item.payment_method}</td>
                      <td>
                        <span className={`chip ${item.status === 'remitted' ? 'completed' : 'pending'}`}>
                          {item.status === 'remitted' ? 'Remitted' : 'Pending'}
                        </span>
                      </td>
                      <td className="actionButtons">
                        <div className="actionButtonsContainer">
                          <button
                            className="viewBtn"
                            onClick={() => openModal("view", item)}
                            title="View Trip Details"
                          >
                            <i className="ri-eye-line" />
                          </button>

                          {item.status === 'pending' && (
                            <button
                              className="editBtn"
                              onClick={() => openModal("add", item)}
                              title="Record Remittance"
                            >
                              <i className="ri-cash-line" />
                            </button>
                          )}

                          {item.status === 'remitted' && (
                            <button
                              className="editBtn"
                              onClick={() => openModal("edit", item)}
                              title="Edit Remittance"
                            >
                              <i className="ri-edit-line" />
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
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Dynamic Modal Manager */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />
    </div>
  );
};

export default AdminTripRevenuePage;