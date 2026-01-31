"use client";

import React, { useState, useEffect, useMemo } from "react";
import PaginationComponent from "../../../../Components/pagination";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
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
import ViewPurchaseRequest from "../../budget-management/purchase-request-approval/viewPurchaseRequestNew";
import AuditTrailPurchaseRequest from "../../budget-management/purchase-request-approval/auditTrailPurchaseRequest";
import ApprovalModal from "../../budget-management/purchase-request-approval/approvalModal";
import RejectionModal from "../../budget-management/purchase-request-approval/rejectionModal"
import ProcessRefundModal from "../../budget-management/purchase-request-approval/processRefundModal";
import TrackStatusPurchaseRequest from "../../budget-management/purchase-request-approval/trackStatusPurchaseRequest";
//import PurchaseApprovalModal from "./PurchaseApprovalModal";
import ModalManager from "@/Components/modalManager";

// Import styles
import "@/styles/purchase-approval/purchase-approval.css";
import "@/styles/components/table.css";
import "@/styles/components/forms.css"


import { SharedApprovalFilters } from "../../../../types/approvals";
import { fetchPurchaseRequests } from "../../../../services/purchaseRequestService";

interface PurchaseApprovalTabProps {
  filters: SharedApprovalFilters;
  searchTerm: string;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  onDataUpdate?: (data: any[]) => void;
}

export default function PurchaseApprovalTab({
  filters,
  searchTerm,
  loading,
  onLoadingChange,
  onError,
  onExport,
  onDataUpdate
}: PurchaseApprovalTabProps) {
  const [data, setData] = useState<PurchaseRequestApproval[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequestApproval | null>(null);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Sample data - using the same data structure as purchase-request-approval page
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
          purchase_request_item_code: "PRI-2024-001-01",
          purchase_request_id: "1",
          status: "PENDING",
          remarks: "",
          quantity: 4,
          unit_cost: 3500.00,
          total_amount: 14000.00,
          is_deleted: false,
          created_at: "2024-01-15T08:00:00Z",
          item_code: "ITM-TIRE-001",
          supplier_code: "SUP-AUTO-001",
          item: {
            id: "item_001",
            item_code: "ITM-TIRE-001",
            item_name: "Heavy Duty Bus Tire 295/80R22.5",
            description: "All-season heavy duty tire for buses",
            unit: {
              unit_id: "unit_001",
              unit_code: "PCS",
              unit_name: "Pieces",
              abbreviation: "pcs"
            },
            category: {
              category_id: "cat_001",
              category_code: "AUTO-PARTS",
              category_name: "Automotive Parts"
            }
          },
          supplier: {
            supplier_id: "sup_001",
            supplier_code: "SUP-AUTO-001",
            supplier_name: "AutoParts Express Inc.",
            contact_number: "02-8123-4567",
            email: "sales@autoparts-express.ph"
          },
          supplier_item: {
            unit_cost: 3500.00,
            supplier_unit: {
              unit_id: "unit_001",
              unit_code: "PCS",
              unit_name: "Pieces",
              abbreviation: "pcs"
            },
            conversion_amount: 1
          }
        },
        {
          purchase_request_item_code: "PRI-2024-001-02",
          purchase_request_id: "1",
          status: "PENDING",
          remarks: "",
          quantity: 8,
          unit_cost: 450.00,
          total_amount: 3600.00,
          is_deleted: false,
          created_at: "2024-01-15T08:00:00Z",
          item_code: "ITM-OIL-002",
          supplier_code: "SUP-AUTO-001",
          item: {
            id: "item_002",
            item_code: "ITM-OIL-002",
            item_name: "Engine Oil 15W-40 (4 Liters)",
            description: "Premium diesel engine oil for heavy vehicles",
            unit: {
              unit_id: "unit_002",
              unit_code: "BTL",
              unit_name: "Bottle",
              abbreviation: "btl"
            },
            category: {
              category_id: "cat_001",
              category_code: "AUTO-PARTS",
              category_name: "Automotive Parts"
            }
          },
          supplier: {
            supplier_id: "sup_001",
            supplier_code: "SUP-AUTO-001",
            supplier_name: "AutoParts Express Inc.",
            contact_number: "02-8123-4567",
            email: "sales@autoparts-express.ph"
          },
          supplier_item: {
            unit_cost: 450.00,
            supplier_unit: {
              unit_id: "unit_003",
              unit_code: "BOX",
              unit_name: "Box",
              abbreviation: "box"
            },
            conversion_amount: 4
          }
        },
        {
          purchase_request_item_code: "PRI-2024-001-03",
          purchase_request_id: "1",
          status: "PENDING",
          remarks: "",
          quantity: 10,
          unit_cost: 740.00,
          total_amount: 7400.00,
          is_deleted: false,
          created_at: "2024-01-15T08:00:00Z",
          item_code: "",
          supplier_code: "",
          new_item: "Brake Pads - Heavy Duty Front Set",
          new_supplier: "Metro Auto Supplies",
          new_unit: "set",
          new_unit_cost: 740.00
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
          purchase_request_item_code: "PRI-2024-002-01",
          purchase_request_id: "2",
          status: "APPROVED",
          remarks: "Approved for immediate procurement",
          quantity: 5,
          unit_cost: 35000.00,
          total_amount: 175000.00,
          is_deleted: false,
          created_at: "2024-01-10T09:30:00Z",
          item_code: "ITM-COMP-001",
          supplier_code: "SUP-TECH-001",
          item: {
            id: "item_003",
            item_code: "ITM-COMP-001",
            item_name: "Dell OptiPlex 7090 Desktop Computer",
            description: "Intel Core i7, 16GB RAM, 512GB SSD, Windows 11 Pro",
            unit: {
              unit_id: "unit_004",
              unit_code: "UNIT",
              unit_name: "Unit",
              abbreviation: "unit"
            },
            category: {
              category_id: "cat_002",
              category_code: "IT-EQUIP",
              category_name: "IT Equipment"
            }
          },
          supplier: {
            supplier_id: "sup_002",
            supplier_code: "SUP-TECH-001",
            supplier_name: "TechWorld Philippines Inc.",
            contact_number: "02-8765-4321",
            email: "orders@techworld.ph"
          },
          supplier_item: {
            unit_cost: 35000.00,
            supplier_unit: {
              unit_id: "unit_004",
              unit_code: "UNIT",
              unit_name: "Unit",
              abbreviation: "unit"
            },
            conversion_amount: 1
          }
        },
        {
          purchase_request_item_code: "PRI-2024-002-02",
          purchase_request_id: "2",
          status: "APPROVED",
          remarks: "Standard office monitors",
          quantity: 5,
          unit_cost: 8500.00,
          total_amount: 42500.00,
          is_deleted: false,
          created_at: "2024-01-10T09:30:00Z",
          item_code: "ITM-MON-001",
          supplier_code: "SUP-TECH-001",
          item: {
            id: "item_004",
            item_code: "ITM-MON-001",
            item_name: "Dell 24-inch LED Monitor P2422H",
            description: "Full HD 1920x1080, IPS Panel, HDMI/DP",
            unit: {
              unit_id: "unit_004",
              unit_code: "UNIT",
              unit_name: "Unit",
              abbreviation: "unit"
            },
            category: {
              category_id: "cat_002",
              category_code: "IT-EQUIP",
              category_name: "IT Equipment"
            }
          },
          supplier: {
            supplier_id: "sup_002",
            supplier_code: "SUP-TECH-001",
            supplier_name: "TechWorld Philippines Inc.",
            contact_number: "02-8765-4321",
            email: "orders@techworld.ph"
          },
          supplier_item: {
            unit_cost: 8500.00,
            supplier_unit: {
              unit_id: "unit_004",
              unit_code: "UNIT",
              unit_name: "Unit",
              abbreviation: "unit"
            },
            conversion_amount: 1
          }
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
      }
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
      }
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
          purchase_request_item_code: "PRI-2024-005-01",
          purchase_request_id: "5",
          status: "ADJUSTED",
          remarks: "Quantity reduced from 8 to 5 units",
          quantity: 8,
          adjusted_quantity: 5,
          adjustment_reason: "Emergency budget constraints - remaining 3 units deferred to Q2",
          unit_cost: 4500.00,
          total_amount: 22500.00,
          is_deleted: false,
          created_at: "2024-01-12T16:45:00Z",
          item_code: "ITM-SWITCH-001",
          supplier_code: "SUP-TECH-002",
          item: {
            id: "item_005",
            item_code: "ITM-SWITCH-001",
            item_name: "Cisco Catalyst 2960 48-Port Switch",
            description: "Managed Gigabit Ethernet Switch, 48 ports",
            unit: {
              unit_id: "unit_004",
              unit_code: "UNIT",
              unit_name: "Unit",
              abbreviation: "unit"
            },
            category: {
              category_id: "cat_003",
              category_code: "NET-EQUIP",
              category_name: "Network Equipment"
            }
          },
          supplier: {
            supplier_id: "sup_003",
            supplier_code: "SUP-TECH-002",
            supplier_name: "Network Solutions Corp.",
            contact_number: "02-8555-1234",
            email: "sales@netsolutions.ph"
          },
          supplier_item: {
            unit_cost: 4500.00,
            supplier_unit: {
              unit_id: "unit_004",
              unit_code: "UNIT",
              unit_name: "Unit",
              abbreviation: "unit"
            },
            conversion_amount: 1
          }
        },
        {
          purchase_request_item_code: "PRI-2024-005-02",
          purchase_request_id: "5",
          status: "ADJUSTED",
          remarks: "Quantity reduced from 200 to 150 meters",
          quantity: 200,
          adjusted_quantity: 150,
          adjustment_reason: "Budget limitation - 50 meters will be purchased next month",
          unit_cost: 85.00,
          total_amount: 12750.00,
          is_deleted: false,
          created_at: "2024-01-12T16:45:00Z",
          item_code: "ITM-CABLE-001",
          supplier_code: "SUP-TECH-002",
          item: {
            id: "item_006",
            item_code: "ITM-CABLE-001",
            item_name: "Cat6 Network Cable - per meter",
            description: "Category 6 UTP Cable, 23AWG, Blue",
            unit: {
              unit_id: "unit_005",
              unit_code: "MTR",
              unit_name: "Meter",
              abbreviation: "m"
            },
            category: {
              category_id: "cat_003",
              category_code: "NET-EQUIP",
              category_name: "Network Equipment"
            }
          },
          supplier: {
            supplier_id: "sup_003",
            supplier_code: "SUP-TECH-002",
            supplier_name: "Network Solutions Corp.",
            contact_number: "02-8555-1234",
            email: "sales@netsolutions.ph"
          },
          supplier_item: {
            unit_cost: 42.50,
            supplier_unit: {
              unit_id: "unit_006",
              unit_code: "ROLL",
              unit_name: "Roll",
              abbreviation: "roll"
            },
            conversion_amount: 2
          }
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
      }
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
      }
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
      }
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
      }
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
      }
    }
  ];

  // API Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  // Transform API data to frontend types
  const transformApiData = (apiData: any[]): PurchaseRequestApproval[] => {
    return apiData.map((pr) => {
      // First map the items so we can calculate total if needed
      const items = pr.items?.map((item: any) => {
        const quantity = parseFloat(String(item.quantity || 0));
        // Check for unit price in various places: direct, supplier_item.unit_price, supplier_item.unit_cost
        const unitCost = parseFloat(String(item.supplier_item?.unit_price || item.supplier_item?.unit_cost || item.unit_cost || 0));

        return {
          purchase_request_item_id: item.id || item.purchase_request_item_id || item.purchase_request_item_code,
          purchase_request_item_code: item.purchase_request_item_code,
          purchase_request_id: String(item.purchase_request_id),
          status: item.status,
          remarks: item.remarks || '',
          quantity: quantity,
          unit_cost: unitCost,
          total_amount: item.total_amount ? parseFloat(String(item.total_amount)) : (quantity * unitCost),
          item_code: item.item_code,
          supplier_code: item.supplier_code,
          item: item.item ? {
            id: String(item.item.id),
            item_code: item.item.item_code,
            item_name: item.item.item_name,
            description: item.item.description,
            unit: item.item.unit ? {
              unit_id: String(item.item.unit.id || item.item.unit.unit_id),
              unit_code: item.item.unit.unit_code,
              unit_name: item.item.unit.unit_name,
              abbreviation: item.item.unit.abbreviation,
            } : undefined,
            category: item.item.category ? {
              category_id: String(item.item.category.id || item.item.category.category_id),
              category_code: item.item.category.category_code,
              category_name: item.item.category.category_name,
            } : undefined,
          } : undefined,
          supplier: item.supplier ? {
            supplier_id: String(item.supplier.id || item.supplier.supplier_id),
            supplier_code: item.supplier.supplier_code || item.supplier_code,
            supplier_name: item.supplier.supplier_name,
            contact_number: item.supplier.contact_number,
            email: item.supplier.email,
          } : undefined,
          supplier_item: item.supplier_item ? {
            unit_cost: parseFloat(String(item.supplier_item.unit_price || item.supplier_item.unit_cost || 0)),
            conversion_amount: parseFloat(String(item.supplier_item.conversion_amount || 1)),
            supplier_unit: item.supplier_item.supplier_unit,
          } : undefined,
          adjusted_quantity: item.adjusted_quantity,
          adjustment_reason: item.adjustment_reason,
        };
      }) || [];

      // Calculate total amount if it's 0 but there are items
      let totalAmount = parseFloat(String(pr.total_amount || 0));
      if (totalAmount === 0 && items.length > 0) {
        totalAmount = items.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0);
      }

      return {
        id: String(pr.id),
        purchase_request_code: pr.request_code || pr.purchase_request_code,
        user_id: pr.requestor?.user_id || pr.requestor?.employee_id || pr.requestor_id || '',
        department_name: pr.department_id || pr.department_name, // API returns department name in department_id field sometimes
        request_type: (pr.type || pr.request_type) as RequestType,
        reason: pr.reason,
        purchase_request_status: (pr.status === 'DRAFT' ? 'PENDING' : pr.status) as ApprovalStatus,
        status: pr.status,
        type: pr.type || pr.request_type,
        total_amount: totalAmount,
        finance_remarks: pr.finance_remarks,
        budget_request_code: pr.budget_request_code,
        department_budget_code: pr.department_buget_code || pr.department_budget_code,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        approved_by: pr.approved_by,
        approved_date: pr.approved_at,
        rejected_by: pr.rejected_by,
        rejected_date: pr.rejected_at,
        rejection_reason: pr.finance_remarks,
        requestor: {
          user_id: pr.requestor?.user_id || pr.requestor?.employee_id || String(pr.requestor_id) || '',
          employee_id: pr.requestor?.employee_id || String(pr.requestor_id) || '',
          employee_name: pr.requestor?.employee_name || pr.requestor?.first_name || 'N/A',
          first_name: pr.requestor?.first_name || '',
          last_name: pr.requestor?.last_name || '',
          department_id: pr.requestor?.department_id || '',
          department_name: pr.requestor?.department_name || pr.department_name || '',
        },
        items: items,
      };
    });
  };

  // Fetch data from API
  const loadPurchaseRequests = async (showLoading = true) => {
    if (showLoading) {
      onLoadingChange(true);
    }
    try {
      console.log('PurchaseApprovalTab: Fetching with filters:', filters);
      const response = await fetchPurchaseRequests({
        status: filters.status, // Pass filters if needed
        // page: currentPage, 
        // limit: pageSize 
      });

      if (response.success && response.data) {
        const transformed = transformApiData(response.data);
        setData(transformed);
        console.log('PurchaseApprovalTab: Loaded', transformed.length, 'records from API');
        onError(null);
      } else {
        throw new Error(response.message || 'Failed to load purchase requests');
      }
    } catch (err: any) {
      console.error('PurchaseApprovalTab: Error loading data', err);
      // If backend is unavailable, we show sample data fallback only if no data
      if (data.length === 0) {
        console.warn('PurchaseApprovalTab: Backend unavailable/error - using sample data fallback');
        // setData(sampleApprovalData); // Commented out to force real data check or empty state
        // onError(null);
        onError(err?.message || 'Failed to load purchase requests');
      } else {
        onError(err?.message || 'Failed to load purchase requests');
      }
    } finally {
      if (showLoading) {
        onLoadingChange(false);
      }
    }
  };

  // Initial fetch and 5-second polling
  useEffect(() => {
    // Initial fetch with loading
    loadPurchaseRequests(true);

    // Set up 5-second polling interval
    const pollInterval = setInterval(() => {
      loadPurchaseRequests(false); // Don't show loading spinner for background polling
    }, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, [filters, searchTerm, onLoadingChange, onError]);

  // Reset pagination when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.purchase_request_code.toLowerCase().includes(searchLower) ||
        (item.reason && item.reason.toLowerCase().includes(searchLower)) ||
        (item.requestor?.employee_name && item.requestor.employee_name.toLowerCase().includes(searchLower)) ||
        (item.department_name && item.department_name.toLowerCase().includes(searchLower)) ||
        item.total_amount.toString().includes(searchLower)
      );
    }

    // Status filter from shared filters
    if (filters.status?.length) {
      result = result.filter(item => {
        const statusMap: { [key: string]: ApprovalStatus } = {
          'pending': ApprovalStatus.PENDING,
          'approved': ApprovalStatus.APPROVED,
          'rejected': ApprovalStatus.REJECTED,
          'completed': ApprovalStatus.CLOSED
        };
        return filters.status!.some(status => statusMap[status] === item.purchase_request_status);
      });
    }

    // Date range filter
    if (filters.dateRange) {
      result = result.filter(item => {
        const itemDate = new Date(item.created_at);
        const fromDate = filters.dateRange!.from ? new Date(filters.dateRange!.from) : null;
        const toDate = filters.dateRange!.to ? new Date(filters.dateRange!.to) : null;

        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
        return true;
      });
    }

    return result;
  }, [data, filters, searchTerm]);

  // Send filtered data to parent for export
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(filteredData);
    }
  }, [filteredData, onDataUpdate]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Modal handlers
  const openViewModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  const openAuditModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowAuditModal(true);
  };

  const openTrackModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowTrackModal(true);
  };

  const openApproveModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowApproveModal(true);  //./approvalModal
    //setShowApprovalModal(true); // Use PurchaseApprovalModal
  };

  const openRejectModal = (request: PurchaseRequestApproval) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
    //setShowApprovalModal(true); // Use PurchaseApprovalModal
  };

  const closeAllModals = () => {
    setShowViewModal(false);
    setShowAuditModal(false);
    setShowTrackModal(false);
    setShowApproveModal(false);
    setShowRejectModal(false);
    setShowApprovalModal(false);
    setSelectedRequest(null);
  };

  // Action handlers - call backend API using PATCH endpoint
  const handleApprove = async (request: PurchaseRequestApproval, comments?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/integration/purchase-request/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          finance_remarks: comments || 'Approved by Finance',
          updated_by: 'Current User', // TODO: Get actual user from auth context
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve');
      }

      // Refresh data after successful approval
      await loadPurchaseRequests(false);
      return true;
    } catch (error: any) {
      console.error('Error approving request:', error);
      throw error;
    }
  };

  const handleReject = async (request: PurchaseRequestApproval, reason: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/integration/purchase-request/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
          finance_remarks: reason,
          updated_by: 'Current User', // TODO: Get actual user from auth context
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject');
      }

      // Refresh data after successful rejection
      await loadPurchaseRequests(false);
      return true;
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  };

  const handleApproveRequest = async (updatedRequest: PurchaseRequestApproval, comments?: string) => {
    if (!selectedRequest) return;

    try {
      await handleApprove(selectedRequest, comments);
      showSuccess("Purchase request approved successfully", "Approved");
      closeAllModals();
    } catch (error: any) {
      showError(error.message || "Failed to approve purchase request", "Error");
    }
  };

  const handleRejectRequest = async (reason: string) => {
    if (!selectedRequest) return;

    try {
      await handleReject(selectedRequest, reason);
      showSuccess("Purchase request rejected successfully", "Rejected");
      closeAllModals();
    } catch (error: any) {
      showError(error.message || "Failed to reject purchase request", "Error");
    }
  };

  const handleView = (request: PurchaseRequestApproval) => {
    openViewModal(request);
  };

  const handleAuditTrail = (request: PurchaseRequestApproval) => {
    openAuditModal(request);
  };

  const handleTrackStatus = (request: PurchaseRequestApproval) => {
    openTrackModal(request);
  };

  // Utility functions
  const formatDepartment = (dept: string | undefined) => {
    return dept || 'N/A';
  };

  const formatRequestType = (type: RequestType) => {
    return type.replace(/_/g, ' ');
  };

  const getStatusClass = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED: return 'approved';
      case ApprovalStatus.REJECTED: return 'rejected';
      case ApprovalStatus.PENDING: return 'pending';
      case ApprovalStatus.ADJUSTED: return 'adjusted';
      case ApprovalStatus.CLOSED: return 'closed';
      default: return 'pending';
    }
  };

  const formatStatus = (status: ApprovalStatus) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (paginatedData.length === 0 && !loading) {
    return (
      <div className="tab-empty">
        <div className="tab-empty-icon">🛒</div>
        <h3 className="tab-empty-title">No Purchase Requests Found</h3>
        <p className="tab-empty-description">
          {searchTerm || Object.keys(filters).length > 0
            ? "No purchase requests match your current filters."
            : "There are no purchase requests to approve at this time."}
        </p>
      </div>
    );
  }

  // Don't render table when loading
  if (loading) {
    return null;
  }

  return (
    <>
      <div className="table-wrapper">
        <div className="tableContainer">
          <table className="data-table">
            <thead>
              <tr>
                <th>CODE</th>
                <th>DEPARTMENT</th>
                <th>TYPE</th>
                <th>REASON</th>
                <th>STATUS</th>
                <th>TOTAL AMOUNT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(request => (
                <tr key={request.id}>
                  <td>{request.purchase_request_code}</td>
                  <td>{formatDepartment(request.department_name)}</td>
                  <td>
                    <span className={`chip ${request.request_type === RequestType.URGENT || request.request_type === RequestType.EMERGENCY ? 'urgent' : 'normal'}`}>
                      {request.request_type ? formatRequestType(request.request_type) : 'REGULAR'}
                    </span>
                  </td>
                  <td title={request.reason}>
                    {request.reason && request.reason.length > 50
                      ? `${request.reason.substring(0, 50)}...`
                      : request.reason || 'N/A'}
                  </td>
                  <td className="table-status">
                    <span className={`chip ${getStatusClass(request.purchase_request_status || ApprovalStatus.PENDING)}`}>
                      {request.purchase_request_status || ApprovalStatus.PENDING}
                    </span>
                  </td>
                  <td>₱{request.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="actionButtons">
                    <div className="actionButtonsContainer">
                      <button
                        className="viewBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(request);
                        }}
                        title="View"
                      >
                        <i className="ri-eye-line" />
                      </button>
                      <>
                        <button
                          className="approveBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openApproveModal(request);
                          }}
                          title="Approve"
                          disabled={request.purchase_request_status !== ApprovalStatus.PENDING}
                        >
                          <i className="ri-check-line" />
                        </button>
                        <button
                          className="rejectBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRejectModal(request);
                          }}
                          title="Reject"
                          disabled={request.purchase_request_status !== ApprovalStatus.PENDING}

                        >
                          <i className="ri-close-line" />
                        </button>
                      </>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <PaginationComponent
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1); // Reset to first page when page size changes
          }}
        />
      )}

      {/* Modals */}
      <ModalManager
        isOpen={showViewModal}
        onClose={closeAllModals}
        modalContent={
          selectedRequest ? (
            <ViewPurchaseRequest
              purchaseRequest={selectedRequest}
              onClose={closeAllModals}
            />
          ) : null
        }
      />

      {showAuditModal && selectedRequest && (
        <AuditTrailPurchaseRequest
          requestId={selectedRequest.purchase_request_code}
          requestTitle={selectedRequest.reason}
          onClose={closeAllModals}
        />
      )}

      {showTrackModal && selectedRequest && (
        <TrackStatusPurchaseRequest
          requestId={selectedRequest.purchase_request_code}
          requestTitle={selectedRequest.reason}
          onClose={closeAllModals}
        />
      )}

      {showApproveModal && selectedRequest && (
        <ApprovalModal
          purchaseRequest={selectedRequest}
          onApprove={async (updatedRequest, comments) => {
            // Handle approval logic here
            console.log('Approved:', updatedRequest, comments);
            closeAllModals();
          }}
          onClose={closeAllModals}
        />
      )}

      {showRejectModal && selectedRequest && (
        <RejectionModal
          request={{
            request_id: selectedRequest.purchase_request_code,
            title: selectedRequest.reason,
            requester_name: selectedRequest.requestor?.employee_name || 'N/A',
            total_amount: selectedRequest.total_amount,
            department: formatDepartment(selectedRequest.department_name)
          }}
          onReject={handleRejectRequest}
          onClose={closeAllModals}
        />
      )}

      {/* Legacy modal - can be removed once all modals are properly integrated */}
      {/* {showApprovalModal && selectedRequest && (
        <PurchaseApprovalModal
          request={selectedRequest}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRequest(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )} */}
    </>
  );
}