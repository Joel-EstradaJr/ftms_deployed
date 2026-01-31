"use client";

import React, { useState, useEffect, useMemo } from "react";
import FilterDropdown, { FilterSection } from "@/Components/filter";
import Loading from "@/Components/loading";
import ErrorDisplay from "@/Components/errordisplay";
import PaginationComponent from "@/Components/pagination";
import ExportButton from "@/Components/ExportButton";
import { showSuccess, showError } from "@/utils/Alerts";

// Import shared types
import {
  ApprovalTab,
  SharedApprovalFilters,
  UnifiedApprovalItem,
  ModalState
} from "../../../../types/approvals";

// Import styles
import "@/styles/components/table.css";
import "@/styles/components/chips.css";
import "@/styles/components/filter.css";
import "@/styles/components/modal.css";
import "@/styles/budget-management/approval.css";

// Import tab components
import BudgetApprovalTab from "./BudgetApprovalTab";
import PurchaseApprovalTab from "./PurchaseApprovalTab";
import CashAdvanceApprovalTab from "./CashAdvanceApprovalTab";

export default function ApprovalsPage() {
  // const [activeTab, setActiveTab] = useState<'budget' | 'purchase' | 'cash-advance'>('budget');
  const [activeTab, setActiveTab] = useState<'budget' | 'purchase' | 'cash-advance'>('budget');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedFilters, setSharedFilters] = useState<SharedApprovalFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [exportData, setExportData] = useState<any[]>([]);

  // Tab configuration
  const tabs: ApprovalTab[] = [
    {
      id: 'budget',
      title: 'Budget Approvals',
      icon: 'ri-money-dollar-circle-line',
      count: 0 // Will be populated from data
    },
    {
      id: 'purchase',
      title: 'Purchase Request Approvals',
      icon: 'ri-shopping-cart-line',
      count: 0 // Will be populated from data
    },
    {
      id: 'cash-advance',
      title: 'Cash Advance Approvals',
      icon: 'ri-hand-coin-line',
      count: 0 // Will be populated from data
    }
  ];

  // Export column configurations
  const budgetExportColumns = [
    { header: 'Request ID', key: 'request_id' },
    { header: 'Title', key: 'title' },
    { header: 'Category', key: 'category' },
    { header: 'Requested Amount', key: 'requested_amount' },
    { header: 'Status', key: 'status' },
    { header: 'Requested By', key: 'requested_by' },
    { header: 'Request Date', key: 'request_date' },
    { header: 'Approval Date', key: 'approval_date' },
    { header: 'Approved By', key: 'approved_by' }
  ];

  const purchaseExportColumns = [
    { header: 'PR Number', key: 'purchase_request_code' },
    { header: 'Department', key: 'department_name' },
    { header: 'Request Type', key: 'request_type' },
    { header: 'Reason', key: 'reason' },
    { header: 'Total Amount', key: 'total_amount' },
    { header: 'Status', key: 'purchase_request_status' },
    { header: 'Request Date', key: 'created_at' }
  ];

  const cashAdvanceExportColumns = [
    { header: 'Request ID', key: 'request_id' },
    { header: 'Employee Number', key: 'employee_number' },
    { header: 'Employee Name', key: 'employee_name' },
    { header: 'Position', key: 'position' },
    { header: 'Department', key: 'department' },
    { header: 'Requested Amount', key: 'requested_amount' },
    { header: 'Approved Amount', key: 'approved_amount' },
    { header: 'Request Type', key: 'request_type' },
    { header: 'Status', key: 'status' },
    { header: 'Purpose', key: 'purpose' },
    { header: 'Request Date', key: 'request_date' },
    { header: 'Reviewed By', key: 'reviewed_by' },
    { header: 'Reviewed At', key: 'reviewed_at' }
  ];

  // Shared filter sections (common across tabs)
  const sharedFilterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Range',
      type: 'dateRange',
      defaultValue: sharedFilters.dateRange || { from: "", to: "" }
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: 'pending', label: 'Pending Approval' },
        { id: 'approved', label: 'Approved' },
        { id: 'rejected', label: 'Rejected' },
        { id: 'completed', label: 'Completed' }
      ],
      defaultValue: sharedFilters.status || []
    }
  ];

  // Handle tab switching
  // const handleTabChange = (tabId: 'budget' | 'purchase' | 'cash-advance') => {
  const handleTabChange = (tabId: 'budget' | 'purchase' | 'cash-advance') => {
    setActiveTab(tabId);
    // Reset tab-specific state when switching
    setSharedFilters({});
    setSearchTerm('');
  };

  // Handle shared filter changes
  const handleSharedFiltersChange = (filterValues: Record<string, any>) => {
    const newFilters: SharedApprovalFilters = {};

    // Date range filter
    if (filterValues.dateRange && typeof filterValues.dateRange === 'object') {
      newFilters.dateRange = filterValues.dateRange as { from: string; to: string };
    }

    // Status filter
    if (filterValues.status && Array.isArray(filterValues.status)) {
      newFilters.status = filterValues.status as string[];
    }

    // Search term
    if (filterValues.search) {
      newFilters.search = filterValues.search;
    }

    setSharedFilters(newFilters);
  };

  // Handle search input
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setSharedFilters(prev => ({
      ...prev,
      search: value
    }));
  };

  // Export functionality (shared across tabs)
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    // Implementation will be handled by individual tabs
    console.log(`Exporting ${activeTab} data as ${format}`);
  };

  // Callback to receive export data from child tabs
  const handleExportDataUpdate = (data: any[]) => {
    setExportData(data);
  };

  return (
    <div className="card">
      <div className="elements">
        {/* Page Title */}
        <div className="title">
          <h1>Approval Management</h1>
        </div>

        {/* Tab Navigation */}
        <div className="approval-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`approval-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon && <i className={`approval-tab-icon ${tab.icon}`} />}
              <span>{tab.title}</span>
            </button>
          ))}
        </div>

        {/* Shared Controls */}
        <div className="settings">
          <div className="search-filter-container">
            {/* Search Bar */}
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                type="text"
                // placeholder={`Search ${activeTab === 'budget' ? 'budget requests' : activeTab === 'purchase' ? 'purchase requests' : 'cash advance requests'}...`}
                placeholder={`Search ${activeTab === 'budget' ? 'budget requests' : activeTab === 'purchase' ? 'purchase requests' : 'cash advance requests'}...`}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Shared Filters */}
            <FilterDropdown
              sections={sharedFilterSections}
              onApply={handleSharedFiltersChange}
              initialValues={{
                dateRange: sharedFilters.dateRange || { from: "", to: "" },
                status: sharedFilters.status || []
              }}
            />
          </div>

          {/* Export Controls */}
          <div className="filters">
            <ExportButton
              data={exportData}
              filename={`${activeTab}_approvals`}
              // columns={activeTab === 'budget' ? budgetExportColumns : activeTab === 'purchase' ? purchaseExportColumns : cashAdvanceExportColumns}
              // title={`${activeTab === 'budget' ? 'Budget' : activeTab === 'purchase' ? 'Purchase Request' : 'Cash Advance'} Approvals Report`}
              columns={activeTab === 'budget' ? budgetExportColumns : activeTab === 'purchase' ? purchaseExportColumns : cashAdvanceExportColumns}
              title={`${activeTab === 'budget' ? 'Budget' : activeTab === 'purchase' ? 'Purchase Request' : 'Cash Advance'} Approvals Report`}
              logo="/agilaLogo.png"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Budget Approval Tab */}
          <div className={`tab-panel ${activeTab === 'budget' ? 'active' : ''}`}>
            {activeTab === 'budget' && (
              <BudgetApprovalTab
                filters={sharedFilters}
                searchTerm={searchTerm}
                loading={loading}
                onLoadingChange={setLoading}
                onError={setError}
                onExport={handleExport}
                onDataUpdate={handleExportDataUpdate}
              />
            )}
          </div>

          {/* Purchase Approval Tab */}
          <div className={`tab-panel ${activeTab === 'purchase' ? 'active' : ''}`}>
            {activeTab === 'purchase' && (
              <PurchaseApprovalTab
                filters={sharedFilters}
                searchTerm={searchTerm}
                loading={loading}
                onLoadingChange={setLoading}
                onError={setError}
                onExport={handleExport}
                onDataUpdate={handleExportDataUpdate}
              />
            )}
          </div>


          {/* Cash Advance Approval Tab */}
          <div className={`tab-panel ${activeTab === 'cash-advance' ? 'active' : ''}`}>
            {activeTab === 'cash-advance' && (
              <CashAdvanceApprovalTab
                filters={sharedFilters}
                searchTerm={searchTerm}
                loading={loading}
                onLoadingChange={setLoading}
                onError={setError}
                onExport={handleExport}
                onDataUpdate={handleExportDataUpdate}
              />
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="tab-loading">
            <Loading />
            <div className="tab-loading-text">Loading approvals...</div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <ErrorDisplay
            errorCode={error}
            onRetry={() => {
              setError(null);
              // Trigger refresh of active tab
            }}
          />
        )}
      </div>
    </div>
  );
}