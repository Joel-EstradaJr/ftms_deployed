"use client";

import React, { useState, useEffect, useMemo } from "react";
import FilterDropdown, { FilterSection } from "../../../../Components/filter";
import Loading from "../../../../Components/loading";
import ErrorDisplay from "../../../../Components/errordisplay";
import PaginationComponent from "../../../../Components/pagination";
import { showSuccess, showError } from "../../../../utils/Alerts";

// Import shared types
import {
  ApprovalTab,
  SharedApprovalFilters,
  UnifiedApprovalItem,
  ModalState
} from "../../../../types/approvals";

// Import styles
import "../../../../styles/components/table.css";
import "../../../../styles/components/chips.css";
import "../../../../styles/components/filter.css";
import "../../../../styles/components/modal.css";
import "../../../../styles/budget-management/approval.css";

// Import tab components
import BudgetApprovalTab from "./BudgetApprovalTab";
import PurchaseApprovalTab from "./PurchaseApprovalTab";

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'budget' | 'purchase'>('budget');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedFilters, setSharedFilters] = useState<SharedApprovalFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

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
    }
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
  const handleTabChange = (tabId: 'budget' | 'purchase') => {
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
                placeholder={`Search ${activeTab === 'budget' ? 'budget requests' : 'purchase requests'}...`}
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
          <div className="export-section">
            <div className="export-dropdown">
              <button className="export-dropdown-toggle">
                <i className="ri-download-line" /> Export
              </button>
              <div className="export-dropdown-menu">
                <button onClick={() => handleExport('csv')}>
                  <i className="ri-file-text-line" />
                  CSV
                </button>
                <button onClick={() => handleExport('excel')}>
                  <i className="ri-file-excel-line" />
                  Excel
                </button>
                <button onClick={() => handleExport('pdf')}>
                  <i className="ri-file-pdf-line" />
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Budget Approval Tab */}
          <div className={`tab-panel ${activeTab === 'budget' ? 'active' : ''}`}>
            <BudgetApprovalTab
              filters={sharedFilters}
              searchTerm={searchTerm}
              loading={loading}
              onLoadingChange={setLoading}
              onError={setError}
              onExport={handleExport}
            />
          </div>

          {/* Purchase Approval Tab */}
          <div className={`tab-panel ${activeTab === 'purchase' ? 'active' : ''}`}>
            <PurchaseApprovalTab
              filters={sharedFilters}
              searchTerm={searchTerm}
              loading={loading}
              onLoadingChange={setLoading}
              onError={setError}
              onExport={handleExport}
            />
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