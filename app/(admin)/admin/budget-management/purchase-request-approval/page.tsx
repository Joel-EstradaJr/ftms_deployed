"use client";

import React, { useState, useEffect, useMemo } from "react";
import FilterDropdown, { FilterSection } from "../../../../Components/filter";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import PaginationComponent from "../../../../Components/pagination";
import { showConfirmation, showSuccess, showError } from "../../../../utils/Alerts";

// Import types for purchase request approval
import {
  ApprovalStatus,
  RequestType,
  ApprovalAction,
  RollbackAction,
  RefundAction,
  ApprovalFilters
} from "../../../../types/purchaseRequestApproval";
import type { PurchaseRequestApproval } from "../../../../types/purchaseRequestApproval";

// Import existing modal components
import ViewPurchaseRequest from "./viewPurchaseRequest";
import AuditTrailPurchaseRequest from "./auditTrailPurchaseRequest";
import TrackStatusPurchaseRequest from "./trackStatusPurchaseRequest";

// Import approval-specific modals
import ApprovalModal from "./approvalModal";
import RejectionModal from "./rejectionModal";
import ProcessRefundModal from "./processRefundModal";
import EditPurchaseRequest from "./editPurchaseRequest";
import RefundReplacementModal from "./refundReplacementModal";

// Import styles - using table.css and expense.css structure
import "../../../../styles/components/filter.css";
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import "../../../../styles/components/loading.css";
import "../../../../styles/expense/expense.css";
import "../../../../styles/purchase-approval/purchase-approval.css";

// Sample data matching complete structure with requestor and items - moved outside component
const sampleApprovalData: PurchaseRequestApproval[] = [
    {
      id: "1",
      purchase_request_code: "PR-2024-001",
      user_id: "user_001",
      department_name: "Operations",
      request_type: RequestType.URGENT,
      reason: "Critical vehicle maintenance needed for fleet safety and reliability",
      purchase_request_status: ApprovalStatus.PENDING,
      total_amount: 25000.00,
      created_at: "2024-01-15T08:00:00Z",
      requestor: {
        user_id: "user_001",
        employee_id: "EMP-001",
        employee_name: "Juan Dela Cruz",
        first_name: "Juan",
        last_name: "Dela Cruz",
        position: "Fleet Manager",
        contact_no: "09171234567",
        email_address: "juan.delacruz@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-OPS",
        department_name: "Operations",
        date_joined: "2020-03-15",
        monthly_rate: 35000
      },
      items: [
        {
          purchase_request_item_id: "PRI-001-1",
          purchase_request_code: "PR-2024-001",
          item_code: "ITM-001",
          supplier_code: "SUP-001",
          supplier_item_code: "SI-001",
          item: {
            item_code: "ITM-001",
            item_name: "Engine Oil (5W-30)",
            description: "Synthetic engine oil for diesel engines",            category: {              category_name: "Automotive Parts",
              status: "ACTIVE"
            },            unit: {              unit_name: "Liter",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-001",
            supplier_name: "AutoParts Supply Co.",
            contact_person: "Maria Santos",
            contact_number: "09181234567",
            email: "sales@autoparts.com",
            address: "123 Industrial Ave, Manila",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-001",
            supplier_code: "SUP-001",
            item_code: "ITM-001",
            supplier_name: "AutoParts Supply Co.",
            item_name: "Engine Oil (5W-30)",
            unit_cost: 850.00,
            status: "ACTIVE"
          },
          quantity: 20,
          unit_cost: 850.00,
          total_amount: 17000.00,
          status: "ACTIVE"
        },
        {
          purchase_request_item_id: "PRI-001-2",
          purchase_request_code: "PR-2024-001",
          item_code: "ITM-002",
          supplier_code: "SUP-001",
          supplier_item_code: "SI-002",
          item: {
            item_code: "ITM-002",
            item_name: "Air Filter",
            description: "Heavy duty air filter for buses",            category: {              category_name: "Automotive Parts",
              status: "ACTIVE"
            },            unit: {              unit_name: "Piece",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-001",
            supplier_name: "AutoParts Supply Co.",
            contact_person: "Maria Santos",
            contact_number: "09181234567",
            email: "sales@autoparts.com",
            address: "123 Industrial Ave, Manila",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-002",
            supplier_code: "SUP-001",
            item_code: "ITM-002",
            supplier_name: "AutoParts Supply Co.",
            item_name: "Air Filter",
            unit_cost: 400.00,
            status: "ACTIVE"
          },
          quantity: 20,
          unit_cost: 400.00,
          total_amount: 8000.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "2",
      purchase_request_code: "PR-2024-002",
      user_id: "user_002",
      department_name: "Administration",
      request_type: RequestType.REGULAR,
      reason: "Office equipment upgrade for productivity improvement - computers are 5+ years old",
      purchase_request_status: ApprovalStatus.APPROVED,
      total_amount: 45000.00,
      approved_by: "Admin Director",
      approved_date: "2024-01-12",
      created_at: "2024-01-10T09:30:00Z",
      finance_remarks: "Approved within Q1 budget allocation for IT upgrades",
      requestor: {
        user_id: "user_002",
        employee_id: "EMP-002",
        employee_name: "Maria Clara Reyes",
        first_name: "Maria Clara",
        last_name: "Reyes",
        position: "Admin Officer III",
        contact_no: "09171234568",
        email_address: "maria.reyes@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-ADMIN",
        department_name: "Administration",
        date_joined: "2019-06-01",
        monthly_rate: 32000
      },
      items: [
        {
          purchase_request_item_id: "PRI-002-1",
          purchase_request_code: "PR-2024-002",
          new_item_name: "Desktop Computer - Intel i5",
          new_supplier_name: "Tech Solutions Inc.",
          new_supplier_contact_person: "Robert Tan",
          new_supplier_contact: "09189876543",
          new_supplier_email: "sales@techsolutions.com",
          new_supplier_address: "456 Technology Park, Quezon City",
          new_unit_cost: 35000.00,
          quantity: 3,
          unit_cost: 35000.00,
          total_amount: 105000.00,
          adjusted_quantity: 2,
          adjustment_reason: "Budget constraint - prioritize critical workstations first",
          status: "ACTIVE"
        },
        {
          purchase_request_item_id: "PRI-002-2",
          purchase_request_code: "PR-2024-002",
          item_code: "ITM-101",
          supplier_code: "SUP-002",
          supplier_item_code: "SI-101",
          item: {
            item_code: "ITM-101",
            item_name: "Office Chair - Ergonomic",
            description: "Ergonomic office chair with lumbar support",            category: {              category_name: "Office Furniture",
              status: "ACTIVE"
            },            unit: {              unit_name: "Piece",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-002",
            supplier_name: "Office Depot Philippines",
            contact_person: "Linda Garcia",
            contact_number: "09171112222",
            email: "orders@officedepot.ph",
            address: "789 Business District, Makati",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-101",
            supplier_code: "SUP-002",
            item_code: "ITM-101",
            supplier_name: "Office Depot Philippines",
            item_name: "Office Chair - Ergonomic",
            unit_cost: 8500.00,
            status: "ACTIVE"
          },
          quantity: 5,
          unit_cost: 8500.00,
          total_amount: 42500.00,
          adjusted_quantity: 3,
          adjustment_reason: "Reduced quantity based on urgent needs assessment",
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "3",
      purchase_request_code: "PR-2024-003",
      user_id: "user_003",
      department_name: "Operations",
      request_type: RequestType.PROJECT_BASED,
      reason: "Safety equipment for new compliance project - replacement due to wear",
      purchase_request_status: ApprovalStatus.REJECTED,
      total_amount: 18000.00,
      rejected_by: "Finance Manager",
      rejected_date: "2024-01-14",
      rejection_reason: "Budget allocation exceeded for safety equipment this quarter",
      created_at: "2024-01-08T14:20:00Z",
      requestor: {
        user_id: "user_003",
        employee_id: "EMP-003",
        employee_name: "Pedro Santos",
        first_name: "Pedro",
        last_name: "Santos",
        position: "Safety Officer II",
        contact_no: "09171234569",
        email_address: "pedro.santos@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-OPS",
        department_name: "Operations",
        date_joined: "2021-01-10",
        monthly_rate: 30000
      },
      items: [
        {
          purchase_request_item_id: "PRI-003-1",
          purchase_request_code: "PR-2024-003",
          item_code: "ITM-201",
          supplier_code: "SUP-003",
          supplier_item_code: "SI-201",
          item: {
            item_code: "ITM-201",
            item_name: "Safety Helmet - Industrial Grade",
            description: "Impact-resistant safety helmet with adjustable suspension",            category: {              category_name: "Safety Equipment",
              status: "ACTIVE"
            },            unit: {              unit_name: "Piece",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-003",
            supplier_name: "Safety First Supplies",
            contact_person: "Anna Lopez",
            contact_number: "09183334444",
            email: "info@safetyfirst.ph",
            address: "321 Industrial Zone, Pasig",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-201",
            supplier_code: "SUP-003",
            item_code: "ITM-201",
            supplier_name: "Safety First Supplies",
            item_name: "Safety Helmet - Industrial Grade",
            unit_cost: 450.00,
            status: "ACTIVE"
          },
          quantity: 40,
          unit_cost: 450.00,
          total_amount: 18000.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "4",
      purchase_request_code: "PR-2024-004",
      user_id: "user_004",
      department_name: "Maintenance",
      request_type: RequestType.REGULAR,
      reason: "Monthly cleaning supplies replenishment for facility cleanliness",
      purchase_request_status: ApprovalStatus.CLOSED,
      total_amount: 12000.00,
      approved_by: "Operations Manager",
      approved_date: "2024-01-06",
      created_at: "2024-01-05T11:15:00Z",
      finance_remarks: "Regular monthly procurement - within budget",
      requestor: {
        user_id: "user_004",
        employee_id: "EMP-004",
        employee_name: "Rosa Martinez",
        first_name: "Rosa",
        last_name: "Martinez",
        position: "Maintenance Supervisor",
        contact_no: "09171234570",
        email_address: "rosa.martinez@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-MAINT",
        department_name: "Maintenance",
        date_joined: "2018-08-20",
        monthly_rate: 28000
      },
      items: [
        {
          purchase_request_item_id: "PRI-004-1",
          purchase_request_code: "PR-2024-004",
          item_code: "ITM-301",
          supplier_code: "SUP-004",
          supplier_item_code: "SI-301",
          item: {
            item_code: "ITM-301",
            item_name: "Floor Cleaner - Industrial Strength",
            description: "Heavy-duty floor cleaning solution",            category: {              category_name: "Cleaning Supplies",
              status: "ACTIVE"
            },            unit: {              unit_name: "Liter",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-004",
            supplier_name: "CleanPro Philippines",
            contact_person: "John Reyes",
            contact_number: "09185556666",
            email: "sales@cleanpro.ph",
            address: "555 Commerce St, Manila",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-301",
            supplier_code: "SUP-004",
            item_code: "ITM-301",
            supplier_name: "CleanPro Philippines",
            item_name: "Floor Cleaner - Industrial Strength",
            unit_cost: 300.00,
            status: "ACTIVE"
          },
          quantity: 40,
          unit_cost: 300.00,
          total_amount: 12000.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "5",
      purchase_request_code: "PR-2024-005",
      user_id: "user_005",
      department_name: "Administration",
      request_type: RequestType.EMERGENCY,
      reason: "Network infrastructure upgrade - current system cannot handle increased load",
      purchase_request_status: ApprovalStatus.ADJUSTED,
      total_amount: 35000.00,
      approved_by: "IT Director",
      approved_date: "2024-01-13",
      created_at: "2024-01-12T16:45:00Z",
      updated_at: "2024-01-14T10:30:00Z",
      finance_remarks: "Approved with reduced quantity due to emergency budget constraints",
      requestor: {
        user_id: "user_005",
        employee_id: "EMP-005",
        employee_name: "Carlos Villanueva",
        first_name: "Carlos",
        last_name: "Villanueva",
        position: "IT Officer II",
        contact_no: "09171234571",
        email_address: "carlos.villanueva@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-ADMIN",
        department_name: "Administration",
        date_joined: "2020-11-05",
        monthly_rate: 33000
      },
      items: [
        {
          purchase_request_item_id: "PRI-005-1",
          purchase_request_code: "PR-2024-005",
          item_code: "ITM-401",
          supplier_code: "SUP-005",
          supplier_item_code: "SI-401",
          item: {
            item_code: "ITM-401",
            item_name: "Network Switch - 24 Port Gigabit",
            description: "Managed network switch with VLAN support",            category: {              category_name: "IT Equipment",
              status: "ACTIVE"
            },            unit: {              unit_name: "Piece",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-005",
            supplier_name: "Network Solutions Corp",
            contact_person: "Michelle Tan",
            contact_number: "09187778888",
            email: "sales@networksolutions.ph",
            address: "888 Tech Hub, Taguig",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-401",
            supplier_code: "SUP-005",
            item_code: "ITM-401",
            supplier_name: "Network Solutions Corp",
            item_name: "Network Switch - 24 Port Gigabit",
            unit_cost: 17500.00,
            status: "ACTIVE"
          },
          quantity: 3,
          unit_cost: 17500.00,
          total_amount: 52500.00,
          adjusted_quantity: 2,
          adjustment_reason: "Emergency budget limits - prioritize critical infrastructure first",
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "6",
      purchase_request_code: "PR-2024-006",
      user_id: "user_006",
      department_name: "Finance",
      request_type: RequestType.URGENT,
      reason: "Financial software licenses renewal - expiring at end of month",
      purchase_request_status: ApprovalStatus.PENDING,
      total_amount: 28500.00,
      created_at: "2024-01-16T14:20:00Z",
      requestor: {
        user_id: "user_006",
        employee_id: "EMP-006",
        employee_name: "Angela Fernandez",
        first_name: "Angela",
        last_name: "Fernandez",
        position: "Finance Officer III",
        contact_no: "09171234572",
        email_address: "angela.fernandez@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-FIN",
        department_name: "Finance",
        date_joined: "2019-02-14",
        monthly_rate: 36000
      },
      items: [
        {
          purchase_request_item_id: "PRI-006-1",
          purchase_request_code: "PR-2024-006",
          new_item_name: "Accounting Software License - Annual Subscription",
          new_supplier_name: "Software Hub Philippines",
          new_supplier_contact_person: "David Cruz",
          new_supplier_contact: "09189990000",
          new_supplier_email: "licensing@softwarehub.ph",
          new_supplier_address: "999 Business Park, Makati City",
          new_unit_cost: 28500.00,
          quantity: 1,
          unit_cost: 28500.00,
          total_amount: 28500.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "7",
      purchase_request_code: "PR-2024-007",
      user_id: "user_007",
      department_name: "Operations",
      request_type: RequestType.EMERGENCY,
      reason: "Emergency tire replacement for 5 buses due to safety inspection failure",
      purchase_request_status: ApprovalStatus.APPROVED,
      total_amount: 180000.00,
      approved_by: "Operations Director",
      approved_date: "2024-01-17",
      created_at: "2024-01-17T06:30:00Z",
      finance_remarks: "Emergency approval granted - safety critical",
      requestor: {
        user_id: "user_007",
        employee_id: "EMP-007",
        employee_name: "Ricardo Mercado",
        first_name: "Ricardo",
        last_name: "Mercado",
        position: "Fleet Coordinator",
        contact_no: "09171234573",
        email_address: "ricardo.mercado@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-OPS",
        department_name: "Operations",
        date_joined: "2021-05-12",
        monthly_rate: 31000
      },
      items: [
        {
          purchase_request_item_id: "PRI-007-1",
          purchase_request_code: "PR-2024-007",
          item_code: "ITM-501",
          supplier_code: "SUP-006",
          supplier_item_code: "SI-501",
          item: {
            item_code: "ITM-501",
            item_name: "Bus Tire - 295/80R22.5",
            description: "Heavy duty radial tire for buses",            category: {              category_name: "Automotive Parts",
              status: "ACTIVE"
            },            unit: {              unit_name: "Piece",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-006",
            supplier_name: "Tire World Philippines",
            contact_person: "Benjamin Cruz",
            contact_number: "09186667777",
            email: "sales@tireworld.ph",
            address: "234 Highway Ave, Valenzuela",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-501",
            supplier_code: "SUP-006",
            item_code: "ITM-501",
            supplier_name: "Tire World Philippines",
            item_name: "Bus Tire - 295/80R22.5",
            unit_cost: 9000.00,
            status: "ACTIVE"
          },
          quantity: 20,
          unit_cost: 9000.00,
          total_amount: 180000.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "8",
      purchase_request_code: "PR-2024-008",
      user_id: "user_008",
      department_name: "HR",
      request_type: RequestType.REGULAR,
      reason: "Employee uniforms for new hires (January-March 2024 batch)",
      purchase_request_status: ApprovalStatus.PENDING,
      total_amount: 48000.00,
      created_at: "2024-01-16T10:15:00Z",
      requestor: {
        user_id: "user_008",
        employee_id: "EMP-008",
        employee_name: "Lisa Villanueva",
        first_name: "Lisa",
        last_name: "Villanueva",
        position: "HR Officer II",
        contact_no: "09171234574",
        email_address: "lisa.villanueva@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-HR",
        department_name: "HR",
        date_joined: "2020-07-01",
        monthly_rate: 29000
      },
      items: [
        {
          purchase_request_item_id: "PRI-008-1",
          purchase_request_code: "PR-2024-008",
          item_code: "ITM-601",
          supplier_code: "SUP-007",
          supplier_item_code: "SI-601",
          item: {
            item_code: "ITM-601",
            item_name: "Employee Uniform Set - Male",
            description: "Complete uniform set with pants and polo",            category: {              category_name: "Uniforms & Apparel",
              status: "ACTIVE"
            },            unit: {              unit_name: "Set",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-007",
            supplier_name: "Uniform Express Inc.",
            contact_person: "Teresa Ramos",
            contact_number: "09188889999",
            email: "orders@uniformexpress.ph",
            address: "567 Textile Road, Marikina",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-601",
            supplier_code: "SUP-007",
            item_code: "ITM-601",
            supplier_name: "Uniform Express Inc.",
            item_name: "Employee Uniform Set - Male",
            unit_cost: 1200.00,
            status: "ACTIVE"
          },
          quantity: 25,
          unit_cost: 1200.00,
          total_amount: 30000.00,
          status: "ACTIVE"
        },
        {
          purchase_request_item_id: "PRI-008-2",
          purchase_request_code: "PR-2024-008",
          item_code: "ITM-602",
          supplier_code: "SUP-007",
          supplier_item_code: "SI-602",
          item: {
            item_code: "ITM-602",
            item_name: "Employee Uniform Set - Female",
            description: "Complete uniform set with skirt/pants and blouse",            category: {              category_name: "Uniforms & Apparel",
              status: "ACTIVE"
            },            unit: {              unit_name: "Set",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-007",
            supplier_name: "Uniform Express Inc.",
            contact_person: "Teresa Ramos",
            contact_number: "09188889999",
            email: "orders@uniformexpress.ph",
            address: "567 Textile Road, Marikina",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-602",
            supplier_code: "SUP-007",
            item_code: "ITM-602",
            supplier_name: "Uniform Express Inc.",
            item_name: "Employee Uniform Set - Female",
            unit_cost: 1200.00,
            status: "ACTIVE"
          },
          quantity: 15,
          unit_cost: 1200.00,
          total_amount: 18000.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "9",
      purchase_request_code: "PR-2024-009",
      user_id: "user_009",
      department_name: "Accounting",
      request_type: RequestType.URGENT,
      reason: "Printer and scanner replacement - current equipment beyond repair",
      purchase_request_status: ApprovalStatus.ADJUSTED,
      total_amount: 65000.00,
      approved_by: "Finance Director",
      approved_date: "2024-01-15",
      created_at: "2024-01-14T14:00:00Z",
      updated_at: "2024-01-16T09:15:00Z",
      finance_remarks: "Approved with adjusted quantities - defer remaining units to Q2",
      requestor: {
        user_id: "user_009",
        employee_id: "EMP-009",
        employee_name: "Emmanuel Torres",
        first_name: "Emmanuel",
        last_name: "Torres",
        position: "Senior Accountant",
        contact_no: "09171234575",
        email_address: "emmanuel.torres@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-ACCT",
        department_name: "Accounting",
        date_joined: "2018-03-20",
        monthly_rate: 38000
      },
      items: [
        {
          purchase_request_item_id: "PRI-009-1",
          purchase_request_code: "PR-2024-009",
          new_item_name: "Multifunction Laser Printer - Brother MFC-L6900DW",
          new_supplier_name: "Office Tech Solutions",
          new_supplier_contact_person: "Mark Santiago",
          new_supplier_contact: "09189998888",
          new_supplier_email: "sales@officetech.ph",
          new_supplier_address: "890 Business Ave, Ortigas Center",
          new_unit_cost: 45000.00,
          quantity: 2,
          unit_cost: 45000.00,
          total_amount: 90000.00,
          adjusted_quantity: 1,
          adjustment_reason: "Budget limitation - purchase one unit now, defer second unit to Q2 budget",
          status: "ACTIVE"
        },
        {
          purchase_request_item_id: "PRI-009-2",
          purchase_request_code: "PR-2024-009",
          item_code: "ITM-701",
          supplier_code: "SUP-008",
          supplier_item_code: "SI-701",
          item: {
            item_code: "ITM-701",
            item_name: "Document Scanner - High Speed",
            description: "Automatic document feeder scanner 50ppm",            category: {              category_name: "IT Equipment",
              status: "ACTIVE"
            },            unit: {              unit_name: "Piece",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-008",
            supplier_name: "Digital Office Supply",
            contact_person: "Grace Alvarez",
            contact_number: "09177778888",
            email: "info@digitaloffice.ph",
            address: "123 Technology Plaza, BGC",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-701",
            supplier_code: "SUP-008",
            item_code: "ITM-701",
            supplier_name: "Digital Office Supply",
            item_name: "Document Scanner - High Speed",
            unit_cost: 20000.00,
            status: "ACTIVE"
          },
          quantity: 1,
          unit_cost: 20000.00,
          total_amount: 20000.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "10",
      purchase_request_code: "PR-2024-010",
      user_id: "user_010",
      department_name: "Maintenance",
      request_type: RequestType.PROJECT_BASED,
      reason: "Terminal building renovation - painting and electrical supplies for Q1 2024 project",
      purchase_request_status: ApprovalStatus.PENDING,
      total_amount: 125000.00,
      created_at: "2024-01-18T08:45:00Z",
      requestor: {
        user_id: "user_010",
        employee_id: "EMP-010",
        employee_name: "Roberto Castro",
        first_name: "Roberto",
        last_name: "Castro",
        position: "Maintenance Head",
        contact_no: "09171234576",
        email_address: "roberto.castro@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-MAINT",
        department_name: "Maintenance",
        date_joined: "2017-09-10",
        monthly_rate: 42000
      },
      items: [
        {
          purchase_request_item_id: "PRI-010-1",
          purchase_request_code: "PR-2024-010",
          item_code: "ITM-801",
          supplier_code: "SUP-009",
          supplier_item_code: "SI-801",
          item: {
            item_code: "ITM-801",
            item_name: "Latex Paint - Interior White",
            description: "Premium quality latex paint for interior walls",            category: {              category_name: "Construction Materials",
              status: "ACTIVE"
            },            unit: {              unit_name: "Gallon",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-009",
            supplier_name: "BuildMart Hardware",
            contact_person: "Antonio Ramos",
            contact_number: "09185554444",
            email: "sales@buildmart.ph",
            address: "456 Construction Ave, Quezon City",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-801",
            supplier_code: "SUP-009",
            item_code: "ITM-801",
            supplier_name: "BuildMart Hardware",
            item_name: "Latex Paint - Interior White",
            unit_cost: 2500.00,
            status: "ACTIVE"
          },
          quantity: 30,
          unit_cost: 2500.00,
          total_amount: 75000.00,
          status: "ACTIVE"
        },
        {
          purchase_request_item_id: "PRI-010-2",
          purchase_request_code: "PR-2024-010",
          item_code: "ITM-802",
          supplier_code: "SUP-009",
          supplier_item_code: "SI-802",
          item: {
            item_code: "ITM-802",
            item_name: "LED Bulb - 15W Daylight",
            description: "Energy efficient LED bulbs for terminal lighting",            category: {              category_name: "Construction Materials",
              status: "ACTIVE"
            },            unit: {              unit_name: "Piece",
              status: "ACTIVE"
            },
            status: "ACTIVE"
          },
          supplier: {
            supplier_code: "SUP-009",
            supplier_name: "BuildMart Hardware",
            contact_person: "Antonio Ramos",
            contact_number: "09185554444",
            email: "sales@buildmart.ph",
            address: "456 Construction Ave, Quezon City",
            status: "ACTIVE"
          },
          supplier_item: {
            supplier_item_code: "SI-802",
            supplier_code: "SUP-009",
            item_code: "ITM-802",
            supplier_name: "BuildMart Hardware",
            item_name: "LED Bulb - 15W Daylight",
            unit_cost: 250.00,
            status: "ACTIVE"
          },
          quantity: 200,
          unit_cost: 250.00,
          total_amount: 50000.00,
          status: "ACTIVE"
        }
      ]
    },
    {
      id: "11",
      purchase_request_code: "PR-2024-011",
      user_id: "user_011",
      department_name: "Operations",
      request_type: RequestType.REGULAR,
      reason: "Monthly fuel cards replenishment for administrative vehicles",
      purchase_request_status: ApprovalStatus.REJECTED,
      total_amount: 80000.00,
      rejected_by: "Budget Officer",
      rejected_date: "2024-01-16",
      rejection_reason: "Fuel allocation for January already exhausted - request can be resubmitted in February",
      created_at: "2024-01-15T13:20:00Z",
      requestor: {
        user_id: "user_011",
        employee_id: "EMP-011",
        employee_name: "Diana Soriano",
        first_name: "Diana",
        last_name: "Soriano",
        position: "Administrative Assistant II",
        contact_no: "09171234577",
        email_address: "diana.soriano@transport.gov.ph",
        employment_status: "REGULAR",
        user_type: "STAFF",
        department_id: "DEPT-OPS",
        department_name: "Operations",
        date_joined: "2022-01-15",
        monthly_rate: 26000
      },
      items: [
        {
          purchase_request_item_id: "PRI-011-1",
          purchase_request_code: "PR-2024-011",
          new_item_name: "Fuel Card Load - Petron Fleet Card",
          new_supplier_name: "Petron Corporation",
          new_supplier_contact_person: "James Rivera",
          new_supplier_contact: "09188887777",
          new_supplier_email: "fleet@petron.com",
          new_supplier_address: "Petron Head Office, Makati",
          new_unit_cost: 80000.00,
          quantity: 1,
          unit_cost: 80000.00,
          total_amount: 80000.00,
          status: "ACTIVE"
        }
      ]
    }
  ];

export default function PurchaseRequestApproval() {
  // State management - Initialize with sample data directly for testing
  const [data, setData] = useState<PurchaseRequestApproval[]>(sampleApprovalData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ApprovalFilters>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [activeRow, setActiveRow] = useState<PurchaseRequestApproval | null>(null);

  // Initialize data - Function for future API integration
  const loadData = async () => {
    console.log('loadData called');
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify data exists before setting
      if (sampleApprovalData && Array.isArray(sampleApprovalData) && sampleApprovalData.length > 0) {
        setData([...sampleApprovalData]); // Create new array reference
        console.log('Successfully loaded', sampleApprovalData.length, 'purchase requests');
      } else {
        throw new Error('No data available');
      }
    } catch (error: any) {
      console.error('Error loading approval data:', error);
      setError(error?.message || 'Failed to load purchase request approvals');
      setErrorCode('LOAD_ERROR');
    } finally {
      setLoading(false);
    }
  };

  // Commented out for testing with static data - uncomment when API is ready
  // useEffect(() => {
  //   loadData();
  // }, []);

  // Filter sections configuration - Updated to match specification
  const filterSections: FilterSection[] = [
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: ApprovalStatus.PENDING, label: 'Pending' },
        { id: ApprovalStatus.APPROVED, label: 'Approved' },
        { id: ApprovalStatus.ADJUSTED, label: 'Adjusted' },
        { id: ApprovalStatus.REJECTED, label: 'Rejected' },
        { id: ApprovalStatus.CLOSED, label: 'Closed' }
      ]
    },
    {
      id: 'department',
      title: 'Department',
      type: 'checkbox',
      options: [
        { id: 'Operations', label: 'Operations' },
        { id: 'Maintenance', label: 'Maintenance' },
        { id: 'Administration', label: 'Administration' },
        { id: 'Finance', label: 'Finance' },
        { id: 'Accounting', label: 'Accounting' },
        { id: 'HR', label: 'HR' },
        { id: 'Inventory', label: 'Inventory' }
      ]
    },
    {
      id: 'request_type',
      title: 'Type',
      type: 'checkbox',
      options: [
        { id: RequestType.EMERGENCY, label: 'Emergency' },
        { id: RequestType.URGENT, label: 'Urgent' },
        { id: RequestType.PROJECT_BASED, label: 'Project Based' },
        { id: RequestType.REGULAR, label: 'Regular' }
      ]
    }
    // TODO: Implement amount range filter when FilterDropdown component supports it
    // {
    //   id: 'amount_range',
    //   title: 'Total Amount',
    //   type: 'range',
    //   defaultValue: { min: 0, max: 1000000 }
    // }
  ];

  // Handle filter application - Updated for new structure
  const handleApplyFilters = (filterValues: Record<string, any>) => {
    console.log("Applied filters:", filterValues);
    
    const newFilters: ApprovalFilters = {};
    
    // Status filter
    if (filterValues.status && Array.isArray(filterValues.status)) {
      newFilters.status = filterValues.status as ApprovalStatus[];
    }
    
    // Department filter - now uses string array
    if (filterValues.department && Array.isArray(filterValues.department)) {
      newFilters.department = filterValues.department;
    }
    
    // Request type filter (was priority)
    if (filterValues.request_type && Array.isArray(filterValues.request_type)) {
      newFilters.request_type = filterValues.request_type as RequestType[];
    }
    
    // Amount range filter
    if (filterValues.amount_range && typeof filterValues.amount_range === 'object') {
      newFilters.amount_range = filterValues.amount_range as { min?: number; max?: number };
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Filter and sort data - Updated for new structure
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Search filter - updated fields
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item =>
        item.purchase_request_code.toLowerCase().includes(searchLower) ||
        (item.department_name && item.department_name.toLowerCase().includes(searchLower)) ||
        item.request_type?.toLowerCase().includes(searchLower) ||
        item.reason.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (filters.status?.length) {
      result = result.filter(item => item.purchase_request_status && filters.status!.includes(item.purchase_request_status));
    }
    
    // Apply department filter
    if (filters.department?.length) {
      result = result.filter(item => 
        item.department_name && filters.department!.includes(item.department_name)
      );
    }
    
    // Apply request type filter
    if (filters.request_type?.length) {
      result = result.filter(item => item.request_type && filters.request_type!.includes(item.request_type));
    }
    
    // Apply amount range filter
    if (filters.amount_range) {
      const { min, max } = filters.amount_range;
      if (min !== undefined) {
        result = result.filter(item => item.total_amount >= min);
      }
      if (max !== undefined) {
        result = result.filter(item => item.total_amount <= max);
      }
    }
    
    return result;
  }, [data, search, filters]);

  // Pagination calculations
  const indexOfLastRecord = currentPage * pageSize;
  const indexOfFirstRecord = indexOfLastRecord - pageSize;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Format request type for display - converts underscore to space
  const formatRequestType = (type: RequestType | string): string => {
    return type.replace(/_/g, ' ');
  };

  // Truncate reason text for table display with hover tooltip
  const truncateReason = (reason: string, maxLength: number = 50): string => {
    if (reason.length <= maxLength) return reason;
    return reason.substring(0, maxLength) + '...';
  };

  // Check if request can be edited (only APPROVED or ADJUSTED status)
  const canEdit = (request: PurchaseRequestApproval): boolean => {
    return request.purchase_request_status === ApprovalStatus.APPROVED ||
           request.purchase_request_status === ApprovalStatus.ADJUSTED;
  };

  // Modal handlers
  const openModal = (content: React.ReactNode, rowData?: PurchaseRequestApproval) => {
    setModalContent(content);
    setActiveRow(rowData || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveRow(null);
  };

  // Action handlers
  const handleView = (request: PurchaseRequestApproval) => {
    openModal(
      <ViewPurchaseRequest 
        purchaseRequest={request} 
        onClose={closeModal} 
      />, 
      request
    );
  };

  // Handle edit action - only for APPROVED or ADJUSTED status
  const handleEdit = (request: PurchaseRequestApproval) => {
    const handleEditSave = async (updatedRequest: PurchaseRequestApproval) => {
      const updatedData = data.map(item =>
        item.id === request.id ? updatedRequest : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been updated successfully.", "Request Updated");
      closeModal();
    };

    openModal(
      <EditPurchaseRequest 
        purchaseRequest={request}
        onSave={handleEditSave}
        onClose={closeModal}
      />,
      request
    );
  };

  const handleApprove = (request: PurchaseRequestApproval) => {
    const handleApprovalSubmit = async (updatedRequest: PurchaseRequestApproval, comments?: string) => {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...updatedRequest,
              purchase_request_status: ApprovalStatus.APPROVED,
              approved_by: "Current User", // In real app, get from auth
              approved_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString(),
              updated_by: "Current User",
              finance_remarks: comments || updatedRequest.finance_remarks
            }
          : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been approved successfully.", "Request Approved");
      closeModal();
    };

    openModal(
      <ApprovalModal 
        purchaseRequest={request}
        onApprove={handleApprovalSubmit}
        onClose={closeModal}
      />, 
      request
    );
  };

  const handleReject = (request: PurchaseRequestApproval) => {
    const handleRejectionSubmit = async (rejectionReason: string) => {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...item,
              purchase_request_status: ApprovalStatus.REJECTED,
              rejected_by: "Current User",
              rejected_date: new Date().toISOString().split('T')[0],
              rejection_reason: rejectionReason,
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been rejected.", "Request Rejected");
      closeModal();
    };

    openModal(
      <RejectionModal 
        request={{
          request_id: request.purchase_request_code,
          title: request.reason,
          requester_name: request.department_name || 'N/A',
          total_amount: request.total_amount,
          department: request.department_name || 'N/A'
        }}
        onReject={handleRejectionSubmit}
        onClose={closeModal}
      />, 
      request
    );
  };

  const handleRollback = async (request: PurchaseRequestApproval) => {
    const result = await showConfirmation(
      `Are you sure you want to <b>ROLLBACK</b> "${request.purchase_request_code}" to pending status?`,
      "Rollback Request"
    );
    
    if (result.isConfirmed) {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...item,
              purchase_request_status: ApprovalStatus.PENDING,
              approved_by: undefined,
              approved_date: undefined,
              rejected_by: undefined,
              rejected_date: undefined,
              rejection_reason: undefined,
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      );
      setData(updatedData);
      showSuccess("Purchase request has been rolled back to pending status.", "Request Rolled Back");
    }
  };

  const handleAuditTrail = (request: PurchaseRequestApproval) => {
    openModal(
      <AuditTrailPurchaseRequest 
        requestId={request.purchase_request_code}
        requestTitle={request.reason}
        onClose={closeModal} 
      />, 
      request
    );
  };

  const handleRefundReplacement = (request: PurchaseRequestApproval) => {
    const handleProcess = async (updatedRequest: PurchaseRequestApproval) => {
      const updatedData = data.map(item =>
        item.id === request.id
          ? {
              ...updatedRequest,
              purchase_request_status: ApprovalStatus.CLOSED,
              updated_at: new Date().toISOString(),
              updated_by: "Current User"
            }
          : item
      );
      setData(updatedData);
      showSuccess("Refund/replacement has been processed successfully.", "Processing Complete");
      closeModal();
    };

    openModal(
      <RefundReplacementModal 
        purchaseRequest={request}
        onProcess={handleProcess}
        onClose={closeModal}
      />, 
      request
    );
  };

  // Export functionality
  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'purchase_request_approvals';
    
    // Add filter info to filename
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
    return filteredData.map(request => ({
      'Code': request.purchase_request_code,
      'Department': request.department_name || 'N/A',
      'Type': formatRequestType(request.request_type || 'REGULAR'),
      'Reason': request.reason,
      'Status': request.purchase_request_status,
      'Total Amount': `₱${request.total_amount.toLocaleString()}`,
      'Approved By': request.approved_by || 'N/A',
      'Approved Date': request.approved_date ? new Date(request.approved_date).toLocaleDateString() : 'N/A',
      'Rejected By': request.rejected_by || 'N/A',
      'Rejected Date': request.rejected_date ? new Date(request.rejected_date).toLocaleDateString() : 'N/A',
      'Rejection Reason': request.rejection_reason || 'N/A',
      'Created At': new Date(request.created_at).toLocaleDateString()
    }));
  };

  const handleExport = async () => {
    try {
      // Show confirmation with export details
      const exportData = generateExportData();
      const result = await showConfirmation(
        `Export ${exportData.length} purchase request approval records?<br/>
        <small>Filters applied: ${filters.status?.length ? `Status (${filters.status.length})` : 'All Status'}, 
        ${filters.department?.length ? `Department (${filters.department.length})` : 'All Departments'}</small>`,
        "Confirm Export"
      );
      
      if (result.isConfirmed) {
        // Generate CSV header comment
        const generateHeaderComment = () => {
          let comment = `# Purchase Request Approval Export\n`;
          comment += `# Export Date: ${new Date().toISOString()}\n`;
          comment += `# Total Records: ${exportData.length}\n`;
          comment += `# Filters Applied:\n`;
          comment += `#   Status: ${filters.status?.length ? filters.status.join(', ') : 'All'}\n`;
          comment += `#   Department: ${filters.department?.length ? filters.department.join(', ') : 'All'}\n`;
          comment += `#   Search Term: ${search || 'None'}\n`;
          comment += `# \n`;
          return comment;
        };

        // Generate CSV content
        const headers = Object.keys(exportData[0] || {});
        const csvHeaders = headers.join(",") + "\n";
        
        const csvRows = exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            return typeof value === 'string' && value.includes(',') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(",")
        ).join("\n");
        
        // Create and download file
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

  // Get conditional action buttons based on status - Updated per specification
  const getActionButtons = (request: PurchaseRequestApproval) => {
    const actions = [];

    // View button - always available
    actions.push(
      <button
        key="view"
        className="viewBtn"
        onClick={() => handleView(request)}
        title="View Details"
      >
        <i className="ri-eye-line"></i>
      </button>
    );

    // Approve/Reject buttons - only for PENDING status
    if (request.purchase_request_status === ApprovalStatus.PENDING) {
      actions.push(
        <button
          key="approve"
          className="editBtn"
          onClick={() => handleApprove(request)}
          title="Approve"
        >
          <i className="ri-check-line"></i>
        </button>,
        <button
          key="reject"
          className="deleteBtn"
          onClick={() => handleReject(request)}
          title="Reject"
        >
          <i className="ri-close-line"></i>
        </button>
      );
    }

    // Edit button - only for APPROVED or ADJUSTED status
    if (canEdit(request)) {
      actions.push(
        <button
          key="edit"
          className="editBtn"
          onClick={() => handleEdit(request)}
          title="Edit Request"
        >
          <i className="ri-edit-line"></i>
        </button>
      );
    }

    // Refund/Replacement button - only for ADJUSTED status
    if (request.purchase_request_status === ApprovalStatus.ADJUSTED) {
      actions.push(
        <button
          key="refund-replace"
          className="processBtn"
          onClick={() => handleRefundReplacement(request)}
          title="Process Refund/Replacement"
        >
          <i className="ri-exchange-line"></i>
        </button>
      );
    }

    // Audit Trail - available for CLOSED status
    if (request.purchase_request_status === ApprovalStatus.CLOSED) {
      actions.push(
        <button
          key="audit"
          className="viewBtn"
          onClick={() => handleAuditTrail(request)}
          title="Audit Trail"
        >
          <i className="ri-file-list-3-line"></i>
        </button>
      );
    }

    return actions;
  };

   if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Purchase Request Approval</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={loadData}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Purchase Request Approval</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <div className="title">
          <h1>Purchase Request Approval</h1>
        </div>
        
        <div className="settings">
          <div className="expense_searchBar">
            <i className="ri-search-line" />
            <input
              className="searchInput"
              type="text"
              placeholder="Search by code, department, type, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <FilterDropdown
            sections={filterSections}
            onApply={handleApplyFilters}
          />
          
          <div className="filters">
            <button onClick={handleExport} id="export">
              <i className="ri-receipt-line" /> Export CSV
            </button>
          </div>
        </div>

        {/* Table - Following expense page structure */}
        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map(request => (
                  <tr key={request.id}>
                    <td>{request.purchase_request_code}</td>
                    <td className="table-status">{request.department_name || 'N/A'}</td>
                    <td className="table-status">
                      <span className={`chip ${(request.request_type || 'REGULAR').toLowerCase()}`}>
                        {formatRequestType(request.request_type || 'REGULAR')}
                      </span>
                    </td>
                    <td title={request.reason}>
                      {truncateReason(request.reason)}
                    </td>
                    <td className="table-status">
                      <span className={`chip ${(request.purchase_request_status || 'PENDING').toLowerCase()}`}>
                        {request.purchase_request_status}
                      </span>
                    </td>
                    <td>₱{request.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="actionButtons">
                      <div className="actionButtonsContainer">
                        {getActionButtons(request)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentRecords.length === 0 && !loading && (
              <p className="noRecords">No purchase requests found matching your criteria.</p>
            )}
          </div>
        </div>

        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />

        {/* Modal */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {modalContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}