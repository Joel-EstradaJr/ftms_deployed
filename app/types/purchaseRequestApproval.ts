// Purchase Request Approval Status Enum
export enum ApprovalStatus {
  PENDING = 'PENDING',    
  APPROVED = 'APPROVED',
  ADJUSTED = 'ADJUSTED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED'
}

export enum RequestType {
  EMERGENCY = 'EMERGENCY',
  URGENT = 'URGENT',
  PROJECT_BASED = 'PROJECT_BASED',
  REGULAR = 'REGULAR'
}

export enum Department {
  OPERATIONS = 'OPERATIONS',
  MAINTENANCE = 'MAINTENANCE',
  ADMINISTRATION = 'ADMINISTRATION',
  FINANCE = 'FINANCE',
  HR = 'HR'
}

export enum RequestPriority {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL'
}

// Nested interfaces for requestor (employee details) - Matches inventory payload
export interface Requestor {
  user_id: string;
  employee_number?: string;       // Maps to employee_id (optional for backward compatibility)
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  phone_number?: string;          // Maps to contact_no
  employee_status?: string;       // Maps to employment_status (optional for backward compatibility)
  role_id?: string;
  role_name?: string;             // Maps to user_type
  position_id?: string;
  position_name?: string;         // Maps to position (optional for backward compatibility)
  department_id: string;
  department_name: string;
  
  // Computed/derived fields for backward compatibility
  employee_id?: string;           // Alias for employee_number
  employee_name?: string;         // Computed from first_name + last_name
  contact_no?: string;            // Alias for phone_number
  email_address?: string;
  employment_status?: string;     // Alias for employee_status
  user_type?: string;             // Alias for role_name
  position?: string;              // Alias for position_name
  date_joined?: string;
  monthly_rate?: number;
}

// Nested interfaces for item details - Matches inventory payload
export interface Unit {
  unit_id?: string;                // Optional for backward compatibility
  unit_code?: string;              // Optional for backward compatibility
  unit_name: string;
  abbreviation?: string;
  status?: string;
}

export interface Category {
  category_id?: string;            // Optional for backward compatibility
  category_code?: string;          // Optional for backward compatibility
  category_name: string;
  status?: string;
}

export interface Item {
  id?: string;
  item_code: string;
  item_name: string;
  description?: string;
  unit: Unit;
  category: Category;
  status?: string;
}

export interface Supplier {
  supplier_id?: string;            // Optional for backward compatibility
  supplier_code: string;
  supplier_name: string;
  contact_number?: string;
  email?: string;
  contact_person?: string;       // For backward compatibility
  address?: string;               // For backward compatibility
  status?: string;
}

export interface SupplierItem {
  unit_price?: number;             // Maps to unit_cost (optional for backward compatibility)
  supplier_unit?: Unit;            // Unit used by supplier (optional for backward compatibility)
  conversion_amount?: number;      // Conversion factor between units (optional for backward compatibility)
  
  // For backward compatibility
  supplier_item_code?: string;
  supplier_code?: string;
  item_code?: string;
  supplier_name?: string;
  item_name?: string;
  unit_cost?: number;             // Alias for unit_price
  status?: string;
}

// Purchase Request Item interface - Matches inventory payload exactly
export interface PurchaseRequestItem {
  purchase_request_item_code?: string;     // Maps to purchase_request_item_id (optional for backward compatibility)
  purchase_request_id?: string;            // Maps to purchase_request_code (optional for backward compatibility)
  status: string;                         // PATCHABLE by Finance
  remarks?: string;
  quantity: number;
  is_deleted?: boolean;                    // Optional for backward compatibility
  created_at?: string;                     // Optional for backward compatibility
  
  // For existing items (from inventory)
  item_code?: string | null;              // Null if new_item is used
  supplier_code?: string | null;          // Null if new_supplier is used
  item?: Item;
  supplier?: Supplier;
  supplier_item?: SupplierItem;
  
  // For new items/suppliers (not in inventory)
  new_item?: string;                      // Raw item name
  new_supplier?: string;                  // Raw supplier name
  new_unit?: string;                      // Raw unit name
  new_unit_price?: number;                // Raw unit price
  
  // For backward compatibility
  purchase_request_item_id?: string;      // Alias for purchase_request_item_code
  purchase_request_code?: string;         // Alias for purchase_request_id
  supplier_item_code?: string;            // Legacy field for backward compatibility
  new_item_name?: string;                 // Alias for new_item
  new_supplier_name?: string;             // Alias for new_supplier
  new_supplier_contact_person?: string;
  new_supplier_contact?: string;
  new_supplier_email?: string;
  new_supplier_address?: string;
  new_unit_cost?: number;                 // Alias for new_unit_price
  unit_cost?: number;                     // Computed from supplier_item
  total_amount?: number;                  // Computed from quantity * unit_cost
  
  // Adjustment fields (for APPROVED/ADJUSTED status)
  adjusted_quantity?: number;
  adjustment_reason?: string;
  
  // Refund/Replacement fields (for refund processing)
  refund_quantity?: number;
  replace_quantity?: number;
  no_action_quantity?: number;
  
  // Attachment
  attachment_id?: string;
  
  // Metadata
  updated_at?: string;
}

// Main Purchase Request Approval interface - Matches inventory payload structure
export interface PurchaseRequestApproval {
  // From purchase_request object in payload
  purchase_request_code: string;           // Unique identifier (e.g., PR-2024-001)
  type?: string;                           // Maps to request_type (EMERGENCY/URGENT/PROJECT_BASED/REGULAR) - optional for backward compatibility
  reason: string;                          // Short explanation
  status?: string;                         // PATCHABLE by Finance (PENDING/APPROVED/ADJUSTED/REJECTED/CLOSED) - optional for backward compatibility
  total_amount: number;                    // Derived from sum of items
  is_deleted?: boolean;                    // Optional for backward compatibility
  finance_remarks?: string;                // PATCHABLE by Finance
  budget_request_code?: string;
  department_budget_code?: string;
  old_order_code?: string;
  created_at: string;
  
  // Nested requestor details
  requestor: Requestor;
  
  // Items array from root level of payload
  items?: PurchaseRequestItem[];
  
  // For backward compatibility with existing code
  id?: string;                             // Alias for purchase_request_code
  user_id?: string;                        // From requestor.user_id
  department_name?: string;                // From requestor.department_name
  request_type?: RequestType;              // Parsed from type string
  purchase_request_status?: ApprovalStatus; // Parsed from status string
  
  // Approval workflow data (legacy fields)
  approved_by?: string;
  approved_date?: string;
  rejected_by?: string;
  rejected_date?: string;
  rejection_reason?: string;
  
  // Attachment
  attachment_id?: string;
  
  // Metadata
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// Approval Action Data interfaces
export interface ApprovalAction {
  request_id: string;
  action: 'approve' | 'reject';
  comments?: string;
  approved_by: string;
  rejection_reason?: string;
}

export interface RollbackAction {
  request_id: string;
  rollback_reason: string;
  rollback_by: string;
}

export interface RefundAction {
  request_id: string;
  refund_amount: number;
  refund_reason: string;
  processed_by: string;
}

// Filter interfaces for the approval page - Updated to match specification
export interface ApprovalFilters {
  status?: ApprovalStatus[];      // PENDING, APPROVED, ADJUSTED, REJECTED, CLOSED
  department?: string[];          // Department names (not enum)
  request_type?: RequestType[];   // EMERGENCY, URGENT, PROJECT_BASED, REGULAR
  amount_range?: {
    min?: number;
    max?: number;
  };
}

// Export data interface
export interface ApprovalExportData {
  request_id: string;
  title: string;
  department: string;
  requester_name: string;
  supplier_name: string;
  total_amount: number;
  status: string;
  priority: string;
  request_date: string;
  approved_date?: string;
  rejection_reason?: string;
  items_count: number;
  total_items_value: number;
}

// Audit Trail Entry interface
export interface ApprovalAuditEntry {
  id: string;
  request_id: string;
  action: string;
  performed_by: string;
  performed_at: string;
  old_status?: string;
  new_status?: string;
  comments?: string;
  additional_data?: Record<string, any>;
}

// Status tracking interface
export interface StatusTrackingEntry {
  id: string;
  request_id: string;
  status: ApprovalStatus;
  timestamp: string;
  updated_by: string;
  notes?: string;
  milestone: string;
  expected_completion?: string;
}