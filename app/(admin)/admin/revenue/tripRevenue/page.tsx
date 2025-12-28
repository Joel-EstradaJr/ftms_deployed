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
import RecordReceivablePaymentModal from "./recordReceivablePayment"; // Receivable payment modal
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
  date_expected: string | null;
  
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
  dueDate?: string | null; // receivable due date (for receivable status)
  
  // receivable payment details (for receivable status)
  receivableDetails?: {
    totalAmount: number;
    dueDate: string;
    createdDate: string;
    driverShare: number;
    driverPaid: number;
    driverStatus: 'Pending' | 'Paid' | 'Overdue';
    driverPayments: Array<{
      date: string;
      time: string;
      amount: number;
      method: string;
      recordedBy: string;
    }>;
    conductorShare?: number;
    conductorPaid?: number;
    conductorStatus?: 'Pending' | 'Paid' | 'Overdue';
    conductorPayments?: Array<{
      date: string;
      time: string;
      amount: number;
      method: string;
      recordedBy: string;
    }>;
    overallStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Closed';
  };
  
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
    date_assigned: "2025-11-10",
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
    dateRecorded: "2025-11-11",
    date_expected: "2025-11-14",
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
    date_assigned: "2025-12-04",
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
    date_expected: null,
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
    date_assigned: "2025-11-09",
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
    dateRecorded: "2025-11-10",
    date_expected: "2025-11-13",
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
    date_assigned: "2025-11-02", // Old date - will be auto-converted to receivable (trip deficit)
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
    date_expected: null,
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
    date_assigned: "2025-11-27",
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
    dateRecorded: "",
    date_expected: "",
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
    date_assigned: "2025-11-03",
    dateRecorded: "2025-11-03",
    date_expected: "2025-11-07",
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
    status: "pending", // Will be auto-converted to receivable by checkAndUpdateStatus
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
    date_assigned: "2025-11-10",
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
    dateRecorded: "2025-11-11",
    date_expected: "2025-11-14",
    amount: 5000.00, // Less than expected (7000 + 2000 = 9000), so it's receivable
    status: "Trip Deficit",
    remarks: "Partial remittance - shortfall converted to receivable.",
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
    date_assigned: "2025-11-10",
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
    date_expected: null,
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
  const [fullDataset, setFullDataset] = useState<BusTripRecord[]>(MOCK_BUS_TRIP_DATA); // Persistent mock data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);

  // Configuration state
  const [config, setConfig] = useState<ConfigData>({
    minimum_wage: 600,
    duration_to_late: 72,
    receivable_due_date: 30,
    conductor_share: 50,
    driver_share: 50,
  });

  // Filter options state
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // Search and filter states
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // For debouncing
  const [activeFilters, setActiveFilters] = useState<{
    types: string[];
    statuses: string[];
    dateAssignedRange: { from: string; to: string };
    dueDateRange: { from: string; to: string };
    tripRevenueRange: { from: string; to: string };
  }>({
    types: [],
    statuses: [],
    dateAssignedRange: { from: '', to: '' },
    dueDateRange: { from: '', to: '' },
    tripRevenueRange: { from: '', to: '' }
  });

  // Sort states
  const [sortBy, setSortBy] = useState<"body_number" | "date_assigned" | "trip_revenue" | "bus_route" | "assignment_type" | "assignment_value" | "date_expected">("date_assigned");
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
  const openModal = (mode: "view" | "add" | "edit" | "config" | "payReceivable", rowData?: BusTripRecord) => {
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
        // Check if editing a remitted record (but allow receivable status to be edited)
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
      case "payReceivable":
        content = <RecordReceivablePaymentModal
          tripData={rowData!}
          onSave={handleReceivablePayment}
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
    console.log('Page: Saving configuration:', configData);

    setConfig(configData);
    console.log('Page: Config state updated to:', configData);
    
    // Show success message
    showSuccess('Configuration saved successfully', 'Success');
  };

  // Handle receivable payment
  const handleReceivablePayment = async (paymentData: any) => {
    console.log('Recording receivable payment:', paymentData);
    
    // Update persistent mock data
    setFullDataset(prevData => prevData.map(item => {
      if (item.assignment_id === paymentData.assignment_id) {
        if (paymentData.action === 'closeReceivable') {
          // Close the receivable
          return {
            ...item,
            receivableDetails: item.receivableDetails ? {
              ...item.receivableDetails,
              overallStatus: 'Closed' as const
            } : item.receivableDetails
          };
        } else {
          // Record payment
          const receivableDetails = item.receivableDetails;
          if (!receivableDetails) return item;

          if (paymentData.employeeType === 'driver') {
            const newDriverPaid = receivableDetails.driverPaid + paymentData.payment.amount;
            const newDriverStatus: 'Pending' | 'Paid' | 'Overdue' = 
              Math.abs(newDriverPaid - receivableDetails.driverShare) < 0.01 ? 'Paid' : 'Pending';
            
            const hasConductor = item.conductorId && item.conductorName && item.conductorName !== 'N/A';
            let newOverallStatus = receivableDetails.overallStatus;
            
            if (hasConductor) {
              if (newDriverStatus === 'Paid' && receivableDetails.conductorStatus === 'Paid') {
                newOverallStatus = 'Paid';
              } else if (newDriverStatus === 'Paid' || receivableDetails.conductorStatus === 'Paid') {
                newOverallStatus = 'Partial';
              }
            } else {
              newOverallStatus = newDriverStatus === 'Paid' ? 'Paid' : 'Pending';
            }

            return {
              ...item,
              receivableDetails: {
                ...receivableDetails,
                driverPaid: newDriverPaid,
                driverStatus: newDriverStatus,
                driverPayments: [...receivableDetails.driverPayments, paymentData.payment],
                overallStatus: newOverallStatus
              }
            };
          } else if (paymentData.employeeType === 'conductor') {
            const newConductorPaid = (receivableDetails.conductorPaid || 0) + paymentData.payment.amount;
            const newConductorStatus: 'Pending' | 'Paid' | 'Overdue' = 
              Math.abs(newConductorPaid - (receivableDetails.conductorShare || 0)) < 0.01 ? 'Paid' : 'Pending';
            
            let newOverallStatus = receivableDetails.overallStatus;
            if (receivableDetails.driverStatus === 'Paid' && newConductorStatus === 'Paid') {
              newOverallStatus = 'Paid';
            } else if (receivableDetails.driverStatus === 'Paid' || newConductorStatus === 'Paid') {
              newOverallStatus = 'Partial';
            }

            return {
              ...item,
              receivableDetails: {
                ...receivableDetails,
                conductorPaid: newConductorPaid,
                conductorStatus: newConductorStatus,
                conductorPayments: [...(receivableDetails.conductorPayments || []), paymentData.payment],
                overallStatus: newOverallStatus
              }
            };
          }
        }
      }
      return item;
    }));
    
    // Refresh displayed data
    fetchData();
  };

  // Handle save trip revenue (both add and edit)
  const handleSaveTripRevenue = async (formData: any, mode: "add" | "edit") => {
    console.log(`${mode === 'add' ? 'Recording' : 'Updating'} trip revenue:`, formData);
    
    // TODO: Replace with actual API call
    // Simulate success for now
    showSuccess(`Trip revenue ${mode === 'add' ? 'recorded' : 'updated'} successfully (MOCK)`, 'Success');
    
    // Update persistent mock data
    if (mode === 'add') {
      setFullDataset(prevData => prevData.map(item => 
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
      setFullDataset(prevData => prevData.map(item => 
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
    
    // Refresh displayed data
    fetchData();
    
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

  // Check and update status based on time duration
  const checkAndUpdateStatus = (record: BusTripRecord): BusTripRecord => {
    if (record.status === 'remitted' || record.status === 'receivable') {
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
      duration_to_late: config.duration_to_late,
      shouldConvert: hoursDiff > config.duration_to_late,
      currentStatus: record.status
    });

    // Check if deadline exceeded (converted to receivable)
    if (hoursDiff > config.duration_to_late) {
      const dateRecorded = now.toISOString().split('T')[0];
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + config.receivable_due_date);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      
      // Calculate receivable shares based on conductor presence
      const hasConductor = record.conductorId && record.conductorName && record.conductorName !== 'N/A';
      const totalAmount = record.trip_revenue; // Total trip deficit is the unpaid revenue
      
      let driverShare = totalAmount;
      let conductorShare = undefined;
      
      if (hasConductor) {
        // Split based on configured shares
        driverShare = totalAmount * (config.driver_share / 100);
        conductorShare = totalAmount * (config.conductor_share / 100);
      }
      
      // Determine if already overdue
      const isOverdue = now > dueDate;
      
      console.log(`[${record.body_number}] ✓ Converting to receivables (trip deficit) - Setting dateRecorded=${dateRecorded}, dueDate=${dueDateStr} (${config.receivable_due_date} days)`);
      return {
        ...record,
        status: 'receivable', // Deadline exceeded, converted to receivable
        dateRecorded: dateRecorded, // Set current date as dateRecorded
        amount: 0, // No payment made, amount is 0
        dueDate: dueDateStr, // Calculate due date based on config
        remarks: `Automatically converted to receivable - Deadline exceeded with no remittance. Due: ${formatDate(dueDateStr)}`,
        receivableDetails: {
          totalAmount,
          dueDate: dueDateStr,
          createdDate: dateRecorded,
          driverShare,
          driverPaid: 0,
          driverStatus: isOverdue ? 'Overdue' : 'Pending',
          driverPayments: [],
          ...(hasConductor && conductorShare ? {
            conductorShare,
            conductorPaid: 0,
            conductorStatus: isOverdue ? 'Overdue' : 'Pending',
            conductorPayments: []
          } : {}),
          overallStatus: isOverdue ? 'Overdue' : 'Pending'
        }
      };
    }

    console.log(`[${record.body_number}] ✗ No conversion needed`);
    return record;
  };

  // Fetch data from API (using mock data)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    console.log('Loading mock bus trip data...');
    
    // Simulate API delay
    setTimeout(() => {
      let filteredData = [...fullDataset];

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

      if (activeFilters.dateAssignedRange.from) {
        filteredData = filteredData.filter(item => 
          item.date_assigned >= activeFilters.dateAssignedRange.from
        );
      }
      if (activeFilters.dateAssignedRange.to) {
        filteredData = filteredData.filter(item => 
          item.date_assigned <= activeFilters.dateAssignedRange.to
        );
      }
      
      // Apply due date range filter
      if (activeFilters.dueDateRange.from) {
        filteredData = filteredData.filter(item => 
          item.date_expected && item.date_expected >= activeFilters.dueDateRange.from
        );
      }
      if (activeFilters.dueDateRange.to) {
        filteredData = filteredData.filter(item => 
          item.date_expected && item.date_expected <= activeFilters.dueDateRange.to
        );
      }

      // Apply trip revenue range filter (NEW - replaces amountRange)
      if (activeFilters.tripRevenueRange.from) {
        filteredData = filteredData.filter(item => 
          item.trip_revenue >= Number(activeFilters.tripRevenueRange.from)
        );
      }
      if (activeFilters.tripRevenueRange.to) {
        filteredData = filteredData.filter(item => 
          item.trip_revenue <= Number(activeFilters.tripRevenueRange.to)
        );
      }

      // Apply type filter (NEW)
      if (activeFilters.types.length > 0) {
        filteredData = filteredData.filter(item => 
          activeFilters.types.includes(item.assignment_type)
        );
      }

      // Apply status filter (NEW)
      if (activeFilters.statuses.length > 0) {
        filteredData = filteredData.filter(item => {
          const itemStatus = item.status === 'remitted' ? 'Remitted' :
                            item.status === 'receivable' ? 'Receivable' :
                            item.status === 'closed' ? 'Closed' : 'Pending';
          return activeFilters.statuses.includes(itemStatus);
        });
      }
      
      // Apply sorting
      filteredData.sort((a, b) => {
        let aValue: any = a[sortBy];
        let bValue: any = b[sortBy];
        
        // Handle null values - put them at the end
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (sortBy === 'trip_revenue' || sortBy === 'assignment_value') {
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
  const handleSort = (field: "body_number" | "date_assigned" | "trip_revenue" | "bus_route" | "assignment_type" | "assignment_value" | "date_expected") => {
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

  // Calculate receivable due date (configurable days from dateRecorded)
  const getReceivableDueDate = (dateRecorded: string | null): string => {
    if (!dateRecorded) return 'N/A';
    const dueDate = new Date(dateRecorded);
    dueDate.setDate(dueDate.getDate() + config.receivable_due_date);
    return formatDate(dueDate.toISOString().split('T')[0]);
  };

  // Handle filter apply
  const handleFilterApply = (filterValues: {
    types: string[];
    statuses: string[];
    dateAssignedRange: { from: string; to: string };
    dueDateRange: { from: string; to: string };
    tripRevenueRange: { from: string; to: string };
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
              types={[
                { id: 'Boundary', label: 'Boundary' },
                { id: 'Percentage', label: 'Percentage' }
              ]}
              statuses={[
                { id: 'Remitted', label: 'Remitted' },
                { id: 'Receivable', label: 'Receivable' },
                { id: 'Closed', label: 'Closed' },
                { id: 'Pending', label: 'Pending' }
              ]}
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
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      No bus trip records found.
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.assignment_id}>
                      <td>{item.body_number}</td>
                      <td>{formatDate(item.date_assigned)}</td>
                      <td>{formatMoney(item.trip_revenue)}</td>
                      <td>{item.assignment_type}</td>
                      <td>{item.payment_method}</td>
                      <td>
                        <span className={`chip ${
                          item.status === 'remitted' ? 'completed' : 
                          item.status === 'receivable' ? (
                            item.receivableDetails?.overallStatus === 'Partial' ? 'partially-paid' :
                            item.receivableDetails?.overallStatus === 'Paid' ? 'paid' :
                            item.receivableDetails?.overallStatus === 'Closed' ? 'closed' :
                            'receivable'
                          ) : 
                          'pending'
                        }`}>
                          {item.status === 'remitted' ? 'Remitted' : 
                           item.status === 'receivable' ? (
                             item.receivableDetails?.overallStatus === 'Partial' ? 'Partially Paid' :
                             item.receivableDetails?.overallStatus === 'Paid' ? 'Paid' :
                             item.receivableDetails?.overallStatus === 'Closed' ? 'Closed' :
                             'Receivable'
                           ) : 
                           'Pending'}
                        </span>
                      </td>
                      <td>
                        {item.status === 'receivable' ? getReceivableDueDate(item.dateRecorded) : '-'}
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

                          {item.status === 'receivable' && (
                            <>
                              <button
                                className="editBtn"
                                onClick={() => openModal("payReceivable", item)}
                                title={item.receivableDetails?.overallStatus === 'Paid' || item.receivableDetails?.overallStatus === 'Closed' ? 'Receivable already paid/closed' : 'Pay Receivable'}
                                disabled={item.receivableDetails?.overallStatus === 'Paid' || item.receivableDetails?.overallStatus === 'Closed'}
                              >
                                <i className="ri-hand-coin-line" />
                              </button>
                              <button
                                className="editBtn"
                                onClick={() => openModal("edit", item)}
                                title="Edit Receivable Details"
                              >
                                <i className="ri-edit-line" />
                              </button>
                            </>
                          )}

                          {item.status === 'remitted' && (
                            <>
                            <button
                                className="editBtn"
                                onClick={() => openModal("payReceivable", item)}
                                title={item.receivableDetails?.overallStatus === 'Paid' || item.receivableDetails?.overallStatus === 'Closed' ? 'Receivable already paid/closed' : 'Pay Receivable'}
                                disabled={true}
                              >
                                <i className="ri-hand-coin-line" />
                              </button>

                            <button
                              className="editBtn"
                              onClick={() => openModal("edit", item)}
                              title="Edit Remittance"
                              disabled={true}
                            >
                              <i className="ri-edit-line" />
                            </button>
                            </>
                            
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