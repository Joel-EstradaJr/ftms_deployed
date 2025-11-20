/**
 * Admin Trip Revenue Page - Backend Integrated
 *
 * Displays bus trip records with revenue recording capability:
 * - Fetches data from /api/admin/revenue/bus-trips
 * - Server-side pagination, search, and sorting
 * - Database-optimized queries with indexes
 *
 * Columns: Body Number, Date Assigned, Trip Revenue, Assignment Type, Payment Method, Status, Actions
 * 
 * ============================================================================
 * BACKEND INTEGRATION GUIDE
 * ============================================================================
 * 
 * This page requires the following backend endpoints:
 * 
 * 1. GET /api/admin/revenue/bus-trips
 *    - Returns paginated list of bus trip records
 *    - Supports filtering, sorting, and search
 *    - See fetchData() function for details
 * 
 * 2. GET /api/admin/revenue/filter-options
 *    - Returns revenue sources and payment methods for filtering
 *    - See fetchFilterOptions() function for details
 * 
 * 3. POST /api/admin/revenue/remittance
 *    - Creates new remittance record
 *    - May include loan creation if shortfall exists
 *    - See handleSaveTripRevenue() function for details
 * 
 * 4. PUT /api/admin/revenue/remittance/:assignment_id
 *    - Updates existing remittance record
 *    - See handleSaveTripRevenue() function for details
 * 
 * 5. POST /api/admin/revenue/config (optional)
 *    - Saves trip revenue configuration (minimum wage, durations, shares)
 *    - See handleSaveConfig() function for details
 * 
 * DATABASE TABLES INVOLVED:
 * - Operations (bus trip assignments)
 * - Human Resource (driver and conductor details)
 * - Bus (bus details)
 * - Model Revenue (remittance records)
 * - Loan Management (trip deficit loans)
 * 
 * KEY FIELDS TO RETURN:
 * - Conductor/Driver IDs and name components (firstName, middleName, lastName, suffix)
 * - These are essential for the loan distribution logic in recordTripRevenue.tsx
 * 
 * IMPORTANT NOTES:
 * - Status conversion logic (pending -> loaned) can be handled in backend
 * - Currently implemented in frontend for demonstration
 * - See checkAndUpdateStatus() function
 * 
 * ============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import "@/styles/components/table.css";
import "@/styles/components/chips.css";
import "@/styles/components/config.css";
 
import Loading from '@/Components/loading';
import ErrorDisplay from '@/Components/errordisplay';
import ModalManager from "@/Components/modalManager";
import PaginationComponent from "@/Components/pagination";
import RevenueFilter from "@/Components/RevenueFilter";

import ViewTripRevenueModal from "./viewTripRevenue";
import RecordTripRevenueModal from "./recordTripRevenue"; // Combined add/edit modal
import ConfigModal, { ConfigData } from "./configModal"; // Configuration modal

import { showSuccess, showError } from '@/utils/Alerts';
import { formatDate, formatMoney } from '@/utils/formatting';

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
  payment_method: string; // 'Company Cash'
  
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
  
  // Conductor and Driver details
  conductorId?: string;
  conductorFirstName?: string;
  conductorMiddleName?: string;
  conductorLastName?: string;
  conductorSuffix?: string;
  
  driverId?: string;
  driverFirstName?: string;
  driverMiddleName?: string;
  driverLastName?: string;
  driverSuffix?: string;
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
    conductorName: "Pedro Reyes Santos",
    // Driver details
    driverId: "EMP-001",
    driverFirstName: "Juan",
    driverMiddleName: "Santos",
    driverLastName: "Dela Cruz",
    driverSuffix: "",
    // Conductor details
    conductorId: "EMP-002",
    conductorFirstName: "Pedro",
    conductorMiddleName: "Reyes",
    conductorLastName: "Santos",
    conductorSuffix: "",
  },
  {
    assignment_id: "ASSIGN-002",
    bus_trip_id: "TRIP-002",
    bus_route: "S. Palay to Sta. Cruz",
    date_assigned: "2024-11-01", // Old date - will be auto-converted to loaned (trip deficit)
    trip_fuel_expense: 2200.00,
    trip_revenue: 12500.00,
    assignment_type: "Percentage",
    assignment_value: 70,
    payment_method: "Company Cash",
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
    driverName: "Carlos Mendoza Cruz",
    conductorName: "Maria Lopez Garcia, Jr.",
    // Driver details
    driverId: "EMP-003",
    driverFirstName: "Carlos",
    driverMiddleName: "Mendoza",
    driverLastName: "Cruz",
    driverSuffix: "",
    // Conductor details
    conductorId: "EMP-002",
    conductorFirstName: "Maria",
    conductorMiddleName: "Lopez",
    conductorLastName: "Garcia",
    conductorSuffix: "Jr.",
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
    conductorName: "Elena Bautista Torres",
    // Driver details
    driverId: "EMP-003",
    driverFirstName: "Pedro",
    driverMiddleName: "Ramos",
    driverLastName: "Reyes",
    driverSuffix: "Sr.",
    // Conductor details
    conductorId: "EMP-004",
    conductorFirstName: "Elena",
    conductorMiddleName: "Bautista",
    conductorLastName: "Torres",
    conductorSuffix: "",
  },
  {
    assignment_id: "ASSIGN-004",
    bus_trip_id: "TRIP-004",
    bus_route: "Sta. Cruz to S. Palay",
    date_assigned: "2024-11-02", // Old date - will be auto-converted to loaned (trip deficit)
    trip_fuel_expense: 1800.00,
    trip_revenue: 10000.00,
    amount: 0,
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
    status: "pending",
    remarks: null,
    driverName: "Miguel Garcia Fernandez",
    conductorName: "Ana Torres Santos",
    // Driver details
    driverId: "EMP-005",
    driverFirstName: "Miguel",
    driverMiddleName: "Garcia",
    driverLastName: "Fernandez",
    driverSuffix: "",
    // Conductor details
    conductorId: "EMP-004",
    conductorFirstName: "Ana",
    conductorMiddleName: "Torres",
    conductorLastName: "Santos",
    conductorSuffix: "",
  },

  {
    assignment_id: "ASSIGN-005",
    bus_trip_id: "TRIP-005",
    bus_route: "S. Palay to Sta. Cruz, S. Palay to PITX",
    date_assigned: "2024-11-08",
    trip_fuel_expense: 2800.00,
    trip_revenue: 16500.00,
    amount: 0,
    assignment_type: "Boundary",
    assignment_value: 9000.00,
    payment_method: "Company Cash",
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
    status: "pending",
    remarks: "Remitted with complete documentation",
    driverName: "Carlos Mendoza Villanueva, III",
    conductorName: "Rosa Santos Martinez",
    // Driver details
    driverId: "EMP-005",
    driverFirstName: "Carlos",
    driverMiddleName: "Mendoza",
    driverLastName: "Villanueva",
    driverSuffix: "III",
    // Conductor details
    conductorId: "EMP-006",
    conductorFirstName: "Rosa",
    conductorMiddleName: "Santos",
    conductorLastName: "Martinez",
    conductorSuffix: "",
  },
  {
    assignment_id: "ASSIGN-006",
    bus_trip_id: "TRIP-006",
    bus_route: "PITX to S. Palay",
    date_assigned: "2024-11-03",
    dateRecorded: "2024-11-03",
    trip_fuel_expense: 2100.00,
    trip_revenue: 11000.00,
    amount: 0,
    assignment_type: "Percentage",
    assignment_value: 45,
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
    status: "pending", // Will be auto-converted to loaned by checkAndUpdateStatus
    remarks: null,
    driverName: "Jose Alvarez Reyes",
    conductorName: "Elena Cruz Bautista",
    // Driver details
    driverId: "EMP-007",
    driverFirstName: "Jose",
    driverMiddleName: "Alvarez",
    driverLastName: "Reyes",
    driverSuffix: "",
    // Conductor details
    conductorId: "EMP-006",
    conductorFirstName: "Elena",
    conductorMiddleName: "Cruz",
    conductorLastName: "Bautista",
    conductorSuffix: "",
  },
  
  {
    assignment_id: "ASSIGN-007",
    bus_trip_id: "TRIP-007",
    bus_route: "S. Palay to Sta. Cruz",
    date_assigned: "2024-11-10",
    trip_fuel_expense: 2000.00,
    trip_revenue: 10000.00,
    assignment_type: "Boundary",
    assignment_value: 7000.00,
    payment_method: "Company Cash",
    employee_id: "EMP-007",
    employee_firstName: "Ricardo",
    employee_middleName: "Alvarez",
    employee_lastName: "Fernandez",
    employee_suffix: "",
    position_id: "POS-001",
    position_name: "Driver",
    bus_plate_number: "PQR 6789",
    bus_type: "Airconditioned",
    body_number: "007",
    bus_brand: "Hilltop",
    dateRecorded: "2024-11-11",
    amount: 5000.00, // Less than expected (7000 + 2000 = 9000), so it's loaned
    status: "Trip Deficit",
    remarks: "Partial remittance - shortfall converted to loan",
    driverName: "Ricardo Alvarez Fernandez",
    conductorName: "Maria Santos Lopez",
    // Driver details
    driverId: "EMP-007",
    driverFirstName: "Ricardo",
    driverMiddleName: "Alvarez",
    driverLastName: "Fernandez",
    driverSuffix: "",
    // Conductor details
    conductorId: "EMP-008",
    conductorFirstName: "Maria",
    conductorMiddleName: "Santos",
    conductorLastName: "Lopez",
    conductorSuffix: "",
  },
  
  // Test case: Driver only (no conductor)
  {
    assignment_id: "ASSIGN-008",
    bus_trip_id: "TRIP-008",
    bus_route: "S. Palay to Sta. Cruz",
    date_assigned: "2024-11-10",
    trip_fuel_expense: 1500.00,
    trip_revenue: 8000.00,
    assignment_type: "Boundary",
    assignment_value: 5000.00,
    payment_method: "Company Cash",
    employee_id: "EMP-009",
    employee_firstName: "Luis",
    employee_middleName: "Cruz",
    employee_lastName: "Santos",
    employee_suffix: "",
    position_id: "POS-001",
    position_name: "Driver",
    bus_plate_number: "STU 1111",
    bus_type: "Ordinary",
    body_number: "008",
    bus_brand: "Hilltop",
    dateRecorded: null,
    amount: null,
    status: "pending",
    remarks: null,
    driverName: "Luis Cruz Santos",
    conductorName: undefined,
    // Driver details
    driverId: "EMP-009",
    driverFirstName: "Luis",
    driverMiddleName: "Cruz",
    driverLastName: "Santos",
    driverSuffix: "",
    // NO CONDUCTOR - leave fields undefined to test driver-only scenario
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

  // Configuration state
  const [config, setConfig] = useState<ConfigData>({
    minimumWage: 600,
    durationToLate: 72,
    durationToLoan: 168,
    defaultConductorShare: 50,
    defaultDriverShare: 50,
  });

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
  const openModal = (mode: "view" | "add" | "edit" | "config", rowData?: BusTripRecord) => {
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
        // Check if editing a remitted record (but allow loan status to be edited)
        if (mode === "edit" && rowData && rowData.status && rowData.status.toLowerCase() === "remitted") {
          showError(`This trip revenue cannot be edited because it has already been marked as "${rowData.status.toUpperCase()}".`, 'Cannot Edit');          
          return;
        }
        
        content = <RecordTripRevenueModal
          mode={mode}
          tripData={rowData!}
          onSave={handleSaveTripRevenue}
          onClose={closeModal}
        />;
        break;
      case "config":
        content = <ConfigModal
          currentConfig={config}
          onSave={handleSaveConfig}
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

  // Handle save configuration
  const handleSaveConfig = (configData: ConfigData) => {
    // TODO: BACKEND CONNECTION
    // Save configuration to database/backend
    // Expected endpoint: POST /api/admin/revenue/config
    // Request body: configData (ConfigData interface)
    // Expected response: { success: boolean, message: string, data: ConfigData }
    
    console.log('Page: Saving configuration:', configData);
    
    // TODO: Replace with actual API call
    setConfig(configData);
    console.log('Page: Config state updated to:', configData);
    
    // Show success message
    showSuccess('Configuration saved successfully', 'Success');
    
    /* BACKEND INTEGRATION EXAMPLE:
    try {
      const response = await fetch('/api/admin/revenue/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      
      const result = await response.json();
      setConfig(result.data);
      showSuccess(result.message || 'Configuration saved successfully', 'Success');
    } catch (error) {
      console.error('Error saving configuration:', error);
      showError('Failed to save configuration', 'Error');
    }
    */
  };

  // Handle save trip revenue (both add and edit)
  const handleSaveTripRevenue = async (formData: any, mode: "add" | "edit") => {
    // TODO: BACKEND CONNECTION
    // Save or update trip revenue remittance
    // Expected endpoint: 
    // - POST /api/admin/revenue/remittance (for add mode)
    // - PUT /api/admin/revenue/remittance/:assignment_id (for edit mode)
    //
    // Request body structure (formData):
    // {
    //   assignment_id: string,
    //   dateRecorded: string (YYYY-MM-DD),
    //   amount: number,
    //   remarks: string,
    //   remittanceDueDate: string (YYYY-MM-DD),
    //   durationToLate: number (hours),
    //   durationToLoan: number (hours),
    //   remittanceStatus: 'PENDING' | 'ON_TIME' | 'LATE' | 'CONVERTED_TO_LOAN',
    //   status: 'remitted' | 'loaned',
    //   loan?: {  // Only included if shouldCreateLoan() is true
    //     principalAmount: number,
    //     interestRate: number,
    //     interestRateType: 'percentage' | 'cash',
    //     totalLoanAmount: number,
    //     conductorId?: string,  // Only if conductor exists
    //     conductorShare?: number,  // Only if conductor exists
    //     driverId: string,
    //     driverShare: number,
    //     loanType: 'Trip Deficit',
    //     dueDate: string (YYYY-MM-DD, optional)
    //   }
    // }
    //
    // Expected response format:
    // {
    //   success: boolean,
    //   message: string,
    //   data: {
    //     remittance: { ... updated remittance record },
    //     loan?: { ... created loan record if applicable }
    //   }
    // }
    //
    // IMPORTANT: Backend should:
    // 1. Update the Model Revenue table with remittance details
    // 2. If loan exists in formData, create entries in Loan Management table
    // 3. Create separate loan records for conductor and driver with their respective shares
    // 4. Handle transaction atomically (both remittance and loan creation should succeed or fail together)
    
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
    
    /* BACKEND INTEGRATION EXAMPLE:
    try {
      const endpoint = mode === 'add' 
        ? '/api/admin/revenue/remittance'
        : `/api/admin/revenue/remittance/${formData.assignment_id}`;
      
      const method = mode === 'add' ? 'POST' : 'PUT';
      
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${mode === 'add' ? 'record' : 'update'} trip revenue`);
      }
      
      const result = await response.json();
      
      showSuccess(
        result.message || `Trip revenue ${mode === 'add' ? 'recorded' : 'updated'} successfully`,
        'Success'
      );
      
      // Refresh data to get updated records
      fetchData();
      
      closeModal();
    } catch (error) {
      console.error(`Error ${mode === 'add' ? 'recording' : 'updating'} trip revenue:`, error);
      showError(
        `Failed to ${mode === 'add' ? 'record' : 'update'} trip revenue`,
        'Error'
      );
    }
    */
  };

  // Fetch filter options (revenue sources and payment methods)
  const fetchFilterOptions = async () => {
    // TODO: BACKEND CONNECTION
    // Replace mock data with actual API call
    // Expected endpoint: GET /api/admin/revenue/filter-options
    // Expected response format:
    // {
    //   revenueSources: [{ id: number, name: string, sourceCode: string }],
    //   paymentMethods: [{ id: number, methodName: string, methodCode: string }]
    // }
    
    console.log('Loading mock filter options...');
    // Simulate API delay
    setTimeout(() => {
      setRevenueSources(MOCK_REVENUE_SOURCES);
      setPaymentMethods(MOCK_PAYMENT_METHODS);
    }, 300);
    
    /* BACKEND INTEGRATION EXAMPLE:
    try {
      const response = await fetch('/api/admin/revenue/filter-options');
      if (!response.ok) throw new Error('Failed to fetch filter options');
      const data = await response.json();
      setRevenueSources(data.revenueSources);
      setPaymentMethods(data.paymentMethods);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      showError('Failed to load filter options', 'Error');
    }
    */
  };

  // Check and update status based on time duration
  const checkAndUpdateStatus = (record: BusTripRecord): BusTripRecord => {
    // NOTE: This function handles automatic status conversion based on time elapsed
    // In production, this logic should ideally be handled by the backend
    // to ensure consistency across all users and sessions
    
    if (record.status === 'remitted' || record.status === 'loaned') {
      console.log(`[${record.body_number}] Already finalized: ${record.status}`);
      return record; // Don't change already finalized records
    }

    const now = new Date();
    const assignedDate = new Date(record.date_assigned);
    const hoursDiff = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);

    console.log(`[${record.body_number}] Checking status:`, {
      date_assigned: record.date_assigned,
      assignedDate: assignedDate.toISOString(),
      now: now.toISOString(),
      hoursDiff: hoursDiff.toFixed(2),
      durationToLoan: config.durationToLoan,
      shouldConvert: hoursDiff > config.durationToLoan,
      currentStatus: record.status
    });

    // Check if deadline exceeded (converted to loan)
    if (hoursDiff > config.durationToLoan) {
      console.log(`[${record.body_number}] ✓ Converting to loaned (trip deficit) - Setting dateRecorded and amount=0`);
      return {
        ...record,
        status: 'loaned', // Deadline exceeded, converted to loan
        dateRecorded: now.toISOString().split('T')[0], // Set current date as dateRecorded
        amount: 0, // No payment made, amount is 0
        remarks: 'Automatically converted to loan - Deadline exceeded with no remittance'
      };
    }

    console.log(`[${record.body_number}] ✗ No conversion needed`);
    return record;
  };

  // Fetch data from API (using mock data)
  const fetchData = async () => {
    // TODO: BACKEND CONNECTION
    // Replace mock data with actual API call
    // Expected endpoint: GET /api/admin/revenue/bus-trips
    // Query parameters to include:
    // - page: currentPage
    // - pageSize: pageSize
    // - search: search (for filtering by body_number, route, assignment_id)
    // - sortBy: sortBy (body_number | date_assigned | trip_revenue)
    // - sortOrder: sortOrder (asc | desc)
    // - paymentMethods: activeFilters.paymentMethods (array)
    // - dateFrom: activeFilters.dateRange.from
    // - dateTo: activeFilters.dateRange.to
    // - amountFrom: activeFilters.amountRange.from
    // - amountTo: activeFilters.amountRange.to
    //
    // Expected response format:
    // {
    //   data: BusTripRecord[],
    //   pagination: {
    //     currentPage: number,
    //     pageSize: number,
    //     totalPages: number,
    //     totalCount: number
    //   }
    // }
    //
    // IMPORTANT: Backend should return records with:
    // - All fields from BusTripRecord interface
    // - Conductor/Driver details: conductorId, conductorFirstName, etc.
    // - Pre-computed driverName and conductorName (optional, can be computed in frontend)
    
    setLoading(true);
    setError(null);
    
    console.log('Loading mock bus trip data...');
    
    // Simulate API delay
    setTimeout(() => {
      let filteredData = [...MOCK_BUS_TRIP_DATA];

      // Check and update status for all records
      filteredData = filteredData.map(record => checkAndUpdateStatus(record));
      
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
    
    /* BACKEND INTEGRATION EXAMPLE:
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        search: search,
        sortBy: sortBy,
        sortOrder: sortOrder,
        ...(activeFilters.dateRange.from && { dateFrom: activeFilters.dateRange.from }),
        ...(activeFilters.dateRange.to && { dateTo: activeFilters.dateRange.to }),
        ...(activeFilters.amountRange.from && { amountFrom: activeFilters.amountRange.from }),
        ...(activeFilters.amountRange.to && { amountTo: activeFilters.amountRange.to }),
      });
      
      // Add payment methods as array
      activeFilters.paymentMethods.forEach(method => {
        queryParams.append('paymentMethods[]', method);
      });
      
      const response = await fetch(`/api/admin/revenue/bus-trips?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      setData(result.data);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.totalCount);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bus trip data:', error);
      setError(error.message);
      setErrorCode(500);
      setLoading(false);
      showError('Failed to load trip revenue data', 'Error');
    }
    */
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
            <div className="searchBar">
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
            <button
              className="config-btn"
              onClick={() => openModal("config")}
              title="Configure Bus Trip Rules"
            >
              <i className="ri-settings-3-line"></i>
              Config
            </button>
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
                        <span className={`chip ${
                          item.status === 'remitted' ? 'completed' : 
                          item.status === 'loaned' ? 'loan' : 
                          'pending'
                        }`}>
                          {item.status === 'remitted' ? 'Remitted' : 
                           item.status === 'loaned' ? 'Loaned' : 
                           'Pending'}
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

                          {(item.status === 'loaned' || item.status === 'remitted') && (
                            <button
                              className="editBtn"
                              onClick={() => openModal("edit", item)}
                              title="Edit Remittance"
                              disabled={true}
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