"use client";

import React, { useState, useEffect, useMemo } from "react";
import PaginationComponent from "../../../../Components/pagination";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import ExportButton from "../../../../Components/ExportButton";
import { showSuccess, showError, showConfirmation } from "../../../../utils/Alerts";
import { formatDate, formatDateTime, formatMoney } from "../../../../utils/formatting";

// Import existing modal components
import ViewBudgetRequest, { BudgetItem, BudgetRequest } from "./viewBudgetRequest";
import AuditTrailBudgetRequest from "../budgetRequest/auditTrailBudgetRequest";
import BudgetApprovalModal from "./BudgetApprovalModal";

// Import styles
import "../../../../styles/budget-management/budgetApproval.css";
import "../../../../styles/components/table.css";


import { SharedApprovalFilters } from "../../../../types/approvals";

interface BudgetApprovalTabProps {
  filters: SharedApprovalFilters;
  searchTerm: string;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  onDataUpdate?: (data: any[]) => void;
}

export default function BudgetApprovalTab({
  filters,
  searchTerm,
  loading,
  onLoadingChange,
  onError,
  onExport,
  onDataUpdate
}: BudgetApprovalTabProps) {
  const [data, setData] = useState<BudgetRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequestForAudit, setSelectedRequestForAudit] = useState<BudgetRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
  const [sortField, setSortField] = useState<keyof BudgetRequest>('request_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchData = async () => {
      onLoadingChange(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockData: BudgetRequest[] = [
          {
            request_id: 'BR001',
            title: 'New Bus Maintenance Equipment',
            description: 'Purchase of diagnostic equipment for bus maintenance including computerized diagnostic tools and specialized repair equipment for improving service quality.',
            requested_amount: 50000,
            status: 'Pending Approval',
            category: 'Maintenance',
            requested_by: 'John Doe',
            request_date: '2024-03-15',
            department: 'Operations',
            requested_type: 'Urgent',
            created_at: '2024-03-15T10:00:00Z',
            items: [
              {
                item_name: 'Computerized Diagnostic Tool',
                quantity: 2,
                unit_measure: 'Unit',
                unit_cost: 15000,
                supplier: 'Auto Tech Solutions Inc.',
                subtotal: 30000
              },
              {
                item_name: 'Hydraulic Lift System',
                quantity: 1,
                unit_measure: 'Unit',
                unit_cost: 12000,
                supplier: 'Heavy Equipment Co.',
                subtotal: 12000
              },
              {
                item_name: 'Specialized Repair Tools Set',
                quantity: 3,
                unit_measure: 'Set',
                unit_cost: 2666.67,
                supplier: 'Industrial Tools Ltd.',
                subtotal: 8000
              }
            ]
          },
          {
            request_id: 'BR002',
            title: 'Driver Training Program',
            description: 'Comprehensive training program for new drivers including safety protocols and customer service training.',
            requested_amount: 25000,
            approved_amount: 25000,
            status: 'Approved',
            category: 'Training',
            requested_by: 'Mike Johnson',
            request_date: '2024-03-10',
            department: 'Human Resources',
            requested_type: 'Regular',
            approval_date: '2024-03-12',
            approved_by: 'Finance Director',
            created_at: '2024-03-10T14:30:00Z',
            items: [
              {
                item_name: 'Safety Training Materials',
                quantity: 50,
                unit_measure: 'Set',
                unit_cost: 150,
                supplier: 'Safety First Training Co.',
                subtotal: 7500
              },
              {
                item_name: 'Customer Service Manual',
                quantity: 50,
                unit_measure: 'Book',
                unit_cost: 80,
                supplier: 'Professional Publishing',
                subtotal: 4000
              },
              {
                item_name: 'Training Course Enrollment (per person)',
                quantity: 25,
                unit_measure: 'Person',
                unit_cost: 540,
                supplier: 'Advanced Driver Institute',
                subtotal: 13500
              }
            ]
          },
          {
            request_id: 'BR003',
            title: 'Marketing Campaign Materials',
            description: 'Design and production of marketing materials for the new route promotion campaign.',
            requested_amount: 15000,
            status: 'Rejected',
            category: 'Marketing',
            requested_by: 'Sarah Wilson',
            request_date: '2024-03-08',
            department: 'Marketing',
            requested_type: 'Project-Based',
            rejection_reason: 'Budget already allocated for Q1 marketing activities',
            created_at: '2024-03-08T09:15:00Z',
            items: [
              {
                item_name: 'Promotional Brochures (Design & Print)',
                quantity: 5000,
                unit_measure: 'Piece',
                unit_cost: 1.5,
                supplier: 'Creative Print Solutions',
                subtotal: 7500
              },
              {
                item_name: 'Billboard Advertisement (3 months)',
                quantity: 3,
                unit_measure: 'Unit',
                unit_cost: 1500,
                supplier: 'City Media Advertising',
                subtotal: 4500
              },
              {
                item_name: 'Social Media Campaign Management',
                quantity: 1,
                unit_measure: 'Package',
                unit_cost: 3000,
                supplier: 'Digital Marketing Pro',
                subtotal: 3000
              }
            ]
          },
          {
            request_id: 'BR004',
            title: 'Office Supplies and Stationery',
            description: 'Monthly office supplies including paper, pens, and other stationery items.',
            requested_amount: 8000,
            status: 'Pending Approval',
            category: 'Office Supplies',
            requested_by: 'Anna Garcia',
            request_date: '2024-03-12',
            department: 'Administration',
            requested_type: 'Regular',
            created_at: '2024-03-12T11:20:00Z',
            items: [
              {
                item_name: 'A4 Copy Paper (Ream)',
                quantity: 100,
                unit_measure: 'Ream',
                unit_cost: 35,
                supplier: 'Office Supply Depot',
                subtotal: 3500
              },
              {
                item_name: 'Ballpoint Pens (Box of 50)',
                quantity: 20,
                unit_measure: 'Box',
                unit_cost: 45,
                supplier: 'Stationery World',
                subtotal: 900
              },
              {
                item_name: 'File Folders (Pack of 100)',
                quantity: 15,
                unit_measure: 'Pack',
                unit_cost: 120,
                supplier: 'Office Supply Depot',
                subtotal: 1800
              },
              {
                item_name: 'Printer Ink Cartridges',
                quantity: 25,
                unit_measure: 'Unit',
                unit_cost: 65,
                supplier: 'Print Supplies Co.',
                subtotal: 1625
              },
              {
                item_name: 'Sticky Notes (Assorted)',
                quantity: 35,
                unit_measure: 'Pack',
                unit_cost: 5,
                supplier: 'Stationery World',
                subtotal: 175
              }
            ]
          },
          {
            request_id: 'BR005',
            title: 'IT Equipment Upgrade',
            description: 'Upgrade of computer systems and networking equipment for improved performance.',
            requested_amount: 75000,
            approved_amount: 65000,
            status: 'Approved',
            category: 'IT',
            requested_by: 'Carlos Rodriguez',
            request_date: '2024-03-05',
            department: 'Information Technology',
            requested_type: 'Urgent',
            approval_date: '2024-03-07',
            approved_by: 'IT Director',
            created_at: '2024-03-05T14:45:00Z',
            items: [
              {
                item_name: 'Desktop Computer (i7, 16GB RAM)',
                quantity: 10,
                unit_measure: 'Unit',
                unit_cost: 3500,
                supplier: 'Tech Hardware Solutions',
                subtotal: 35000
              },
              {
                item_name: 'Network Switch (24-Port)',
                quantity: 3,
                unit_measure: 'Unit',
                unit_cost: 5000,
                supplier: 'Networking Pro Inc.',
                subtotal: 15000
              },
              {
                item_name: 'UPS Battery Backup System',
                quantity: 5,
                unit_measure: 'Unit',
                unit_cost: 2000,
                supplier: 'Power Solutions Ltd.',
                subtotal: 10000
              },
              {
                item_name: 'Software Licenses (Office Suite)',
                quantity: 15,
                unit_measure: 'License',
                unit_cost: 333.33,
                supplier: 'Software Distributors',
                subtotal: 5000
              }
            ]
          },
          {
            request_id: 'BR006',
            title: 'Employee Wellness Program',
            description: 'Implementation of employee wellness initiatives including gym memberships and health screenings.',
            requested_amount: 30000,
            status: 'Pending Approval',
            category: 'HR',
            requested_by: 'Maria Lopez',
            request_date: '2024-03-18',
            department: 'Human Resources',
            requested_type: 'Project-Based',
            created_at: '2024-03-18T09:30:00Z',
            items: [
              {
                item_name: 'Gym Membership (Annual, per employee)',
                quantity: 50,
                unit_measure: 'Membership',
                unit_cost: 400,
                supplier: 'Fitness First Gym',
                subtotal: 20000
              },
              {
                item_name: 'Health Screening Package',
                quantity: 100,
                unit_measure: 'Package',
                unit_cost: 80,
                supplier: 'City Health Clinic',
                subtotal: 8000
              },
              {
                item_name: 'Wellness Seminar & Workshop',
                quantity: 4,
                unit_measure: 'Session',
                unit_cost: 500,
                supplier: 'Wellness Experts Inc.',
                subtotal: 2000
              }
            ]
          },
          {
            request_id: 'BR007',
            title: 'Security System Enhancement',
            description: 'Installation of additional security cameras and access control systems.',
            requested_amount: 45000,
            status: 'Rejected',
            category: 'Security',
            requested_by: 'David Chen',
            request_date: '2024-03-01',
            department: 'Security',
            requested_type: 'Urgent',
            rejection_reason: 'Security budget already committed for the year',
            created_at: '2024-03-01T16:15:00Z',
            items: [
              {
                item_name: 'IP Security Camera (4K)',
                quantity: 20,
                unit_measure: 'Unit',
                unit_cost: 1200,
                supplier: 'SecureVision Systems',
                subtotal: 24000
              },
              {
                item_name: 'Access Control Card Reader',
                quantity: 10,
                unit_measure: 'Unit',
                unit_cost: 800,
                supplier: 'Access Tech Solutions',
                subtotal: 8000
              },
              {
                item_name: 'Network Video Recorder (NVR)',
                quantity: 2,
                unit_measure: 'Unit',
                unit_cost: 3500,
                supplier: 'SecureVision Systems',
                subtotal: 7000
              },
              {
                item_name: 'Installation & Configuration Service',
                quantity: 1,
                unit_measure: 'Project',
                unit_cost: 6000,
                supplier: 'Security Install Pro',
                subtotal: 6000
              }
            ]
          },
          {
            request_id: 'BR008',
            title: 'Vehicle Fuel Efficiency Program',
            description: 'Implementation of fuel efficiency monitoring and driver training program.',
            requested_amount: 20000,
            approved_amount: 20000,
            status: 'Approved',
            category: 'Operations',
            requested_by: 'Elena Martinez',
            request_date: '2024-02-28',
            department: 'Operations',
            requested_type: 'Project-Based',
            approval_date: '2024-03-02',
            approved_by: 'Operations Manager',
            created_at: '2024-02-28T13:40:00Z',
            items: [
              {
                item_name: 'Fuel Monitoring System (GPS + Sensors)',
                quantity: 30,
                unit_measure: 'Unit',
                unit_cost: 450,
                supplier: 'Fleet Tech Solutions',
                subtotal: 13500
              },
              {
                item_name: 'Eco-Driving Training Program',
                quantity: 40,
                unit_measure: 'Person',
                unit_cost: 125,
                supplier: 'Green Driving Academy',
                subtotal: 5000
              },
              {
                item_name: 'Fuel Analysis Software License',
                quantity: 5,
                unit_measure: 'License',
                unit_cost: 300,
                supplier: 'Fleet Analytics Inc.',
                subtotal: 1500
              }
            ]
          },
          {
            request_id: 'BR009',
            title: 'Customer Service Training',
            description: 'Advanced customer service training for all front-line staff.',
            requested_amount: 15000,
            status: 'Pending Approval',
            category: 'Training',
            requested_by: 'Robert Kim',
            request_date: '2024-03-20',
            department: 'Customer Service',
            requested_type: 'Regular',
            created_at: '2024-03-20T10:00:00Z',
            items: [
              {
                item_name: 'Customer Service Excellence Course',
                quantity: 35,
                unit_measure: 'Person',
                unit_cost: 350,
                supplier: 'Professional Training Institute',
                subtotal: 12250
              },
              {
                item_name: 'Training Workbook & Materials',
                quantity: 35,
                unit_measure: 'Set',
                unit_cost: 50,
                supplier: 'Training Resources Co.',
                subtotal: 1750
              },
              {
                item_name: 'Video Training Module License',
                quantity: 1,
                unit_measure: 'License',
                unit_cost: 1000,
                supplier: 'E-Learning Solutions',
                subtotal: 1000
              }
            ]
          },
          {
            request_id: 'BR010',
            title: 'Facility Maintenance Contract',
            description: 'Annual contract for facility maintenance and cleaning services.',
            requested_amount: 60000,
            approved_amount: 60000,
            status: 'Approved',
            category: 'Facilities',
            requested_by: 'Lisa Wong',
            request_date: '2024-02-25',
            department: 'Facilities',
            requested_type: 'Regular',
            approval_date: '2024-02-27',
            approved_by: 'Facilities Manager',
            created_at: '2024-02-25T12:30:00Z',
            items: [
              {
                item_name: 'Daily Cleaning Service (Annual)',
                quantity: 12,
                unit_measure: 'Month',
                unit_cost: 3500,
                supplier: 'Premium Cleaning Services',
                subtotal: 42000
              },
              {
                item_name: 'HVAC Maintenance Contract',
                quantity: 1,
                unit_measure: 'Year',
                unit_cost: 8000,
                supplier: 'Climate Control Experts',
                subtotal: 8000
              },
              {
                item_name: 'Plumbing & Electrical Maintenance',
                quantity: 1,
                unit_measure: 'Year',
                unit_cost: 6000,
                supplier: 'Building Services Co.',
                subtotal: 6000
              },
              {
                item_name: 'Landscaping & Grounds Maintenance',
                quantity: 12,
                unit_measure: 'Month',
                unit_cost: 333.33,
                supplier: 'Green Spaces Ltd.',
                subtotal: 4000
              }
            ]
          },
          {
            request_id: 'BR011',
            title: 'Software License Renewal',
            description: 'Annual renewal of software licenses for accounting and management systems.',
            requested_amount: 25000,
            status: 'Pending Approval',
            category: 'IT',
            requested_by: 'James Park',
            request_date: '2024-03-22',
            department: 'Information Technology',
            requested_type: 'Regular',
            created_at: '2024-03-22T15:20:00Z',
            items: [
              {
                item_name: 'Accounting Software (Annual License)',
                quantity: 10,
                unit_measure: 'License',
                unit_cost: 1200,
                supplier: 'QuickBooks Enterprise',
                subtotal: 12000
              },
              {
                item_name: 'Fleet Management System License',
                quantity: 5,
                unit_measure: 'License',
                unit_cost: 1500,
                supplier: 'Fleet Management Pro',
                subtotal: 7500
              },
              {
                item_name: 'HR Management Software',
                quantity: 8,
                unit_measure: 'License',
                unit_cost: 450,
                supplier: 'HR Solutions Inc.',
                subtotal: 3600
              },
              {
                item_name: 'Antivirus & Security Suite',
                quantity: 50,
                unit_measure: 'License',
                unit_cost: 38,
                supplier: 'CyberSecurity Partners',
                subtotal: 1900
              }
            ]
          },
          {
            request_id: 'BR012',
            title: 'Emergency Response Equipment',
            description: 'Purchase of first aid kits, defibrillators, and emergency response equipment.',
            requested_amount: 35000,
            approved_amount: 35000,
            status: 'Approved',
            category: 'Safety',
            requested_by: 'Sarah Johnson',
            request_date: '2024-02-20',
            department: 'Safety and Compliance',
            requested_type: 'Emergency',
            approval_date: '2024-02-22',
            approved_by: 'Safety Officer',
            created_at: '2024-02-20T11:10:00Z',
            items: [
              {
                item_name: 'Automated External Defibrillator (AED)',
                quantity: 5,
                unit_measure: 'Unit',
                unit_cost: 4500,
                supplier: 'Medical Equipment Specialists',
                subtotal: 22500
              },
              {
                item_name: 'Comprehensive First Aid Kit',
                quantity: 20,
                unit_measure: 'Kit',
                unit_cost: 350,
                supplier: 'Safety First Supplies',
                subtotal: 7000
              },
              {
                item_name: 'Fire Extinguisher (ABC Type)',
                quantity: 15,
                unit_measure: 'Unit',
                unit_cost: 250,
                supplier: 'Fire Safety Equipment Co.',
                subtotal: 3750
              },
              {
                item_name: 'Emergency Response Kit',
                quantity: 10,
                unit_measure: 'Kit',
                unit_cost: 175,
                supplier: 'Safety First Supplies',
                subtotal: 1750
              }
            ]
          }
        ];

        setData(mockData);
        onError(null);
      } catch (err) {
        onError('Failed to load budget requests');
      } finally {
        onLoadingChange(false);
      }
    };

    fetchData();
  }, [filters, searchTerm, onLoadingChange, onError]);

  // Reset pagination when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search filter - searches across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.request_id.toLowerCase().includes(searchLower) ||
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.requested_by.toLowerCase().includes(searchLower) ||
        item.department.toLowerCase().includes(searchLower) ||
        item.category.toLowerCase().includes(searchLower) ||
        item.requested_type.toLowerCase().includes(searchLower) ||
        item.requested_amount.toString().includes(searchLower) ||
        (item.approved_amount && item.approved_amount.toString().includes(searchLower))
      );
    }

    // Status filter from shared filters
    if (filters.status?.length) {
      result = result.filter(item => {
        const statusMap: { [key: string]: string } = {
          'pending': 'Pending Approval',
          'approved': 'Approved',
          'rejected': 'Rejected',
          'completed': 'Closed',
          'draft': 'Draft'
        };
        return filters.status!.some(status => statusMap[status] === item.status);
      });
    }

    // Request Type filter
    if (filters.requestType?.length) {
      result = result.filter(item =>
        filters.requestType!.includes(item.requested_type)
      );
    }

    // Category filter
    if (filters.category?.length) {
      result = result.filter(item =>
        filters.category!.some(cat => 
          item.category.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    // Date range filter
    if (filters.dateRange) {
      result = result.filter(item => {
        const itemDate = new Date(item.request_date);
        const fromDate = filters.dateRange!.from ? new Date(filters.dateRange!.from) : null;
        const toDate = filters.dateRange!.to ? new Date(filters.dateRange!.to) : null;

        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
        return true;
      });
    }

    // Sort data
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
      if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, filters, searchTerm, sortField, sortOrder]);

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

  // Handle sorting
  const handleSort = (field: keyof BudgetRequest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Handle view modal
  const handleView = (request: BudgetRequest) => {
    setSelectedRequest(request);
    setShowViewModal(true);
  };

  // Handle audit trail modal
  const handleAuditTrail = (request: BudgetRequest) => {
    setSelectedRequestForAudit(request);
    setShowAuditModal(true);
  };

  // Handle approve/reject modal
  const handleApprovalAction = (request: BudgetRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  // Handle approve from modal
  const handleApprove = (request: BudgetRequest) => {
    setData(prevData =>
      prevData.map(item =>
        item.request_id === request.request_id
          ? {
              ...item,
              status: 'Approved' as const,
              approved_amount: request.approved_amount,
              approval_date: new Date().toISOString().split('T')[0],
              approved_by: 'Current User'
            }
          : item
      )
    );
  };

  // Handle reject from modal
  const handleReject = (request: BudgetRequest, reason: string) => {
    setData(prevData =>
      prevData.map(item =>
        item.request_id === request.request_id
          ? {
              ...item,
              status: 'Rejected' as const,
              rejection_reason: reason
            }
          : item
      )
    );
  };

  // Handle export
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    onExport(format);
  };

  // Get status class for styling
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending Approval':
        return 'pending-approval';
      case 'Approved':
        return 'approved';
      case 'Rejected':
        return 'rejected';
      case 'Closed':
        return 'completed';
      case 'Draft':
        return 'draft';
      default:
        return 'pending';
    }
  };

  // Get request type chip class
  const getRequestTypeClass = (type: string) => {
    switch (type) {
      case 'Emergency':
        return 'emergency';
      case 'Urgent':
        return 'urgent';
      case 'Regular':
        return 'regular';
      case 'Project-Based':
        return 'project-based';
      default:
        return 'regular';
    }
  };

  if (paginatedData.length === 0 && !loading) {
    return (
      <div className="tab-empty">
        <div className="tab-empty-icon">📋</div>
        <h3 className="tab-empty-title">No Budget Requests Found</h3>
        <p className="tab-empty-description">
          {searchTerm || Object.keys(filters).length > 0
            ? "No budget requests match your current filters."
            : "There are no budget requests to approve at this time."}
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
                <th onClick={() => handleSort('request_date')} className="sortable">
                  Request Date
                  {sortField === 'request_date' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('department')} className="sortable">
                  Department
                  {sortField === 'department' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('category')} className="sortable">
                  Budget Category
                  {sortField === 'category' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('requested_amount')} className="sortable">
                  Requested Amount
                  {sortField === 'requested_amount' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('approved_amount')} className="sortable">
                  Approved Amount
                  {sortField === 'approved_amount' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th onClick={() => handleSort('requested_type')} className="sortable">
                  Requested Type
                  {sortField === 'requested_type' && (
                    <i className={`ri-arrow-${sortOrder === 'asc' ? 'up' : 'down'}-line`} />
                  )}
                </th>
                <th className="sticky-status">Status</th>
                <th className="sticky-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map(request => (
                <tr key={request.request_id}>
                  <td>{formatDate(request.request_date)}</td>
                  <td>{request.department}</td>
                  <td>{request.category}</td>
                  <td className="amount-cell">{formatMoney(request.requested_amount)}</td>
                  <td className="amount-cell">
                    {request.approved_amount ? formatMoney(request.approved_amount) : '-'}
                  </td>
                  <td>
                    <span className={`chip ${getRequestTypeClass(request.requested_type)}`}>
                      {request.requested_type}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${getStatusClass(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="actionButtons">
                    <div className="actionButtonsContainer">
                      <button 
                          className="viewBtn"
                          onClick={() => handleView(request)} 
                          title="View Details"
                        >
                          <i className="ri-eye-line" />
                        </button>
                      <button
                        className="approveBtn"
                        onClick={() => handleApprovalAction(request)}
                        title="Approve/Reject"
                        disabled={request.status !== 'Pending Approval'}
                      >
                        <i className="ri-check-line" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
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
      {showViewModal && selectedRequest && (
        <ViewBudgetRequest
          request={selectedRequest}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {showAuditModal && selectedRequestForAudit && (
        <AuditTrailBudgetRequest
          requestId={selectedRequestForAudit.request_id}
          requestTitle={selectedRequestForAudit.title}
          onClose={() => {
            setShowAuditModal(false);
            setSelectedRequestForAudit(null);
          }}
        />
      )}

      {showApprovalModal && selectedRequest && (
        <BudgetApprovalModal
          request={selectedRequest}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRequest(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}