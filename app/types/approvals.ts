// Shared types for the combined approval system
export interface ApprovalTab {
  id: 'budget' | 'purchase';
  title: string;
  icon?: string;
  count?: number;
}

export interface SharedApprovalFilters {
  dateRange?: { from: string; to: string };
  status?: string[];
  search?: string;
}

export interface ApprovalTableConfig {
  columns: ApprovalColumn[];
  actions: ApprovalAction[];
}

export interface ApprovalColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any) => React.ReactNode;
}

export interface ApprovalAction {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick: (item: any) => void;
}

export interface ModalState {
  type: 'view' | 'approve' | 'reject' | 'audit' | null;
  item: any;
}

// Extended interfaces for unified data handling
export interface UnifiedApprovalItem {
  id: string;
  type: 'budget' | 'purchase';
  title: string;
  amount: number;
  status: string;
  requester: string;
  requestDate: string;
  category?: string;
  department?: string;
  priority?: string;
  supplier?: string;
  // Additional fields for specific types
  [key: string]: any;
}