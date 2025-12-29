'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '@/app/utils/Alerts';

import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import ErrorDisplay from '@/app/Components/errordisplay';
import ModalManager from '@/app/Components/modalManager';
import FilterDropdown, { FilterSection } from '@/app/Components/filter';

import RecordChartOfAccount from './recordChartOfAccount';
import AddAccountModal from './AddAccountModal';
import ValidateBalanceModal from './ValidateBalanceModal';
import AuditTrailModal from './AuditTrailModal';

import { ChartOfAccount, AccountType, AccountFormData} from '@/app/types/jev';
import { fetchChartOfAccounts, createChartOfAccount, ChartOfAccountsQueryParams, PaginationResponse } from '@/app/services/chartOfAccountsService';
import {getAccountTypeClass, 
        canArchiveAccount,
        getNormalBalance} from '@/app/lib/jev/accountHelpers';

// import '@/app/styles/JEV/chart-of-accounts.css';
import '@/app/styles/components/table.css'; 
import '@/app/styles/components/chips.css';
import '@/app/styles/JEV/JEV_table.css'; 

const ChartOfAccountsPage = () => {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [accountTypeFilters, setAccountTypeFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isInitialLoadRef = useRef(true);
  const lastReqIdRef = useRef(0);

  // Modal states - Unified approach like tripRevenue
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

  // Define filter sections for FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'accountTypes',
      title: 'Account Type',
      type: 'checkbox',
      options: [
        { id: AccountType.ASSET, label: 'Asset' },
        { id: AccountType.LIABILITY, label: 'Liability' },
        { id: AccountType.REVENUE, label: 'Revenue' },
        { id: AccountType.EXPENSE, label: 'Expense' },
      ],
      defaultValue: [] // Empty array = Show All account types
    },
    {
      id: 'status',
      title: 'Status',
      type: 'radio',
      options: [
        { id: 'all', label: 'All' },
        { id: 'active', label: 'Active' },
        { id: 'archived', label: 'Archived' },
      ],
      defaultValue: 'active'
    }
  ];

  // Fetch accounts from mock service with filters and pagination
  const loadAccountsFromApi = useCallback(async () => {
    const reqId = ++lastReqIdRef.current;
    try {
      // Show spinner only on first load
      if (isInitialLoadRef.current) {
        setLoading(true);
      }
      setError(null);
      setErrorCode(null);

      const hasAccountTypeFilter = accountTypeFilters.length > 0;
      const trimmedSearch = debouncedSearch.trim();

      const params: ChartOfAccountsQueryParams = {
        page: hasAccountTypeFilter ? 1 : currentPage,
        // fetch more when we need to paginate client-side to avoid truncation
        limit: hasAccountTypeFilter ? 10000 : pageSize,
        includeArchived: statusFilter !== 'active', // true for archived/all, false for active
      };

      if (trimmedSearch) {
        params.search = trimmedSearch;
      }

      const result = await fetchChartOfAccounts(params);

      // Ignore stale responses (out of order)
      if (reqId !== lastReqIdRef.current) return;

      // Frontend filters
      let filteredData = result.data;

      if (hasAccountTypeFilter) {
        const typeSet = new Set(accountTypeFilters.map(String));
        filteredData = filteredData.filter(acc => typeSet.has(String(acc.account_type)));
      }

      if (statusFilter === 'active') {
        filteredData = filteredData.filter(acc => acc.is_active);
      } else if (statusFilter === 'archived') {
        filteredData = filteredData.filter(acc => !acc.is_active);
      }
      // statusFilter === 'all' -> no extra filtering

      // Pagination
      let paginatedData = filteredData;
      let total = filteredData.length;
      let calculatedTotalPages = Math.ceil(total / pageSize);

      if (hasAccountTypeFilter) {
        const startIndex = (currentPage - 1) * pageSize;
        paginatedData = filteredData.slice(startIndex, startIndex + pageSize);
      } else {
        total = result.pagination.total;
        calculatedTotalPages = result.pagination.totalPages;
      }

      setAccounts(paginatedData);
      setTotalPages(Math.max(1, calculatedTotalPages));
      setTotalItems(total);
      
      // Mark loading as complete
      setLoading(false);
      if (isInitialLoadRef.current) {
        setIsInitialLoad(false);
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      setLoading(false);
      setIsInitialLoad(false);
      isInitialLoadRef.current = false;
      if (err instanceof Error) {
        setError(err.message);
        setErrorCode(500);
      } else {
        setError('An unexpected error occurred while fetching accounts');
        setErrorCode(500);
      }
      console.error('Error fetching chart of accounts:', err);
    }
  }, [currentPage, pageSize, debouncedSearch, statusFilter, accountTypeFilters, isInitialLoad]);

  // Debounce search input - update debouncedSearch after 500ms of no typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== debouncedSearch) {
        setDebouncedSearch(search);
        setCurrentPage(1); // Reset to page 1 when search changes
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, debouncedSearch]);

  // Initial load and reload when filters change
  useEffect(() => {
    loadAccountsFromApi();
  }, [loadAccountsFromApi]);

  // Handle filter changes from FilterDropdown component
  const handleFilterApply = (filterValues: Record<string, any>) => {
    setAccountTypeFilters((filterValues.accountTypes as string[]) || []);
    setStatusFilter((filterValues.status as 'active' | 'archived' | 'all') || 'active');
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Modal management functions - following tripRevenue pattern
  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setSelectedAccount(null);
  };

  const openAddModal = () => {
    setModalContent(
      <AddAccountModal
        onClose={closeModal}
        onSubmit={handleAddAccount}
      />
    );
    setIsModalOpen(true);
  };

  const openEditModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <RecordChartOfAccount
        account={account}
        mode="edit"
        accounts={accounts} // Using current page accounts
        onClose={closeModal}
        onSave={async (data) => {
          await showSuccess('Account updated successfully', 'Success');
          closeModal();
          loadAccountsFromApi();
        }}
      />
    );
    setIsModalOpen(true);
  };

  const openViewModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <RecordChartOfAccount
        account={account}
        mode="view"
        accounts={accounts} // Using current page accounts
        onClose={closeModal}
        onSave={async () => {}} // No-op for view mode
      />
    );
    setIsModalOpen(true);
  };


  const openValidateModal = () => {
    setModalContent(
      <ValidateBalanceModal
        onClose={closeModal}
        onValidate={loadAccountsFromApi}
      />
    );
    setIsModalOpen(true);
  };

  const openAuditTrailModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <AuditTrailModal
        recordId={account.account_id}
        recordType="ChartOfAccount"
        recordName={`${account.account_code} - ${account.account_name}`}
        onClose={closeModal}
      />
    );
    setIsModalOpen(true);
  };

  const handleAddAccount = async (formData: any) => {
    try {
      // Call API to create account with backend format
      await createChartOfAccount(formData);
      
      await showSuccess('Account created successfully!', 'Success');
      closeModal();
      loadAccountsFromApi(); // Refresh the table
    } catch (error) {
      console.error('Error adding account:', error);
      if (error instanceof Error) {
        await showError(error.message, 'Error');
      } else {
        await showError('Failed to create account', 'Error');
      }
    }
  };

  const handleExport = async () => {
    try {
      // Fetch ALL records matching current filters (no pagination)
      const params: ChartOfAccountsQueryParams = {
        page: 1,
        limit: 10000, // High limit to get all records
        includeArchived: statusFilter === 'archived' || statusFilter === 'all',
      };

      // Add search parameter if present
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const result = await fetchChartOfAccounts(params);
      
      // Apply frontend filters (same as display logic)
      let exportData = result.data;
      
      // Apply account type filter
      if (accountTypeFilters && accountTypeFilters.length > 0) {
        exportData = exportData.filter(acc => 
          accountTypeFilters.includes(acc.account_type)
        );
      }
      
      // Apply status filter
      if (statusFilter === 'active') {
        exportData = exportData.filter(acc => acc.is_active === true);
      } else if (statusFilter === 'archived') {
        exportData = exportData.filter(acc => acc.is_active === false);
      }

      if (exportData.length === 0) {
        await showError('No records to export', 'Export Failed');
        return;
      }

      // Generate CSV content
      const headers = ['No.', 'Account Code', 'Account Name', 'Account Type', 'Normal Balance', 'Description', 'Status'];
      const csvRows = [headers.join(',')];

      exportData.forEach((account, index) => {
        const row = [
          (index + 1).toString(),
          `"${account.account_code}"`,
          `"${account.account_name}"`,
          `"${account.account_type}"`,
          `"${getNormalBalance(account.account_type)}"`,
          `"${account.description?.replace(/"/g, '""') || '-'}"`, // Escape quotes in description
          `"${account.is_active ? 'Active' : 'Archived'}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');

      // Generate filename with filter information
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      let filenameParts = ['Accounts'];
      
      // Add status to filename if not showing all
      if (statusFilter !== 'all') {
        filenameParts.push(statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1));
      }
      
      // Add account types to filename if filtered
      if (accountTypeFilters.length > 0 && accountTypeFilters.length < 4) {
        const types = accountTypeFilters.map(t => 
          t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
        ).join('-');
        filenameParts.push(types);
      }
      
      // Add search term if present (sanitized)
      if (debouncedSearch && debouncedSearch.trim()) {
        const sanitizedSearch = debouncedSearch.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
        if (sanitizedSearch) {
          filenameParts.push(sanitizedSearch);
        }
      }
      
      filenameParts.push(today);
      const filename = filenameParts.join('_') + '.csv';

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await showSuccess(`Exported ${exportData.length} record(s) to ${filename}`, 'Export Successful');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      await showError('Failed to export data', 'Export Failed');
    }
  };

  const handleArchive = async (account: ChartOfAccount) => {
    if (!canArchiveAccount(account)) {
      await showError('Cannot archive system accounts', 'Error');
      return;
    }
    
    // Note: Child count check removed as we need all accounts to calculate this
    // Backend should validate this on archive attempt
    
    const result = await showConfirmation(
      `Are you sure you want to archive "${account.account_name}"?<br/>
      <span style="color: #666; font-size: 0.9em;">This account will no longer appear in active listings.</span>`,
      'Archive Account'
    );

    if (result.isConfirmed) {
      await showSuccess('Account archived successfully', 'Success');
      loadAccountsFromApi();
    }
  };

  const handleRestore = async (account: ChartOfAccount) => {
    const result = await showConfirmation(
      `Restore account "${account.account_name}"?`,
      'Restore Account'
    );

    if (result.isConfirmed) {
      await showSuccess('Account restored successfully', 'Success');
      loadAccountsFromApi();
    }
  };

  const renderActionButtons = (account: ChartOfAccount) => {
    // Determine deleted state: prefer `is_deleted` if available, fallback to inverse of `is_active`
    const isDeleted = (account as any).is_deleted ?? !account.is_active;

    if (isDeleted) {
      // Archived: show only View + Unarchive
      return (
        <div className="actionButtonsContainer">
          <button
            className="viewBtn"
            onClick={() => openViewModal(account)}
            title="View Details"
          >
            <i className="ri-eye-line" />
          </button>
          <button
            className="successBtn"
            onClick={() => handleRestore(account)}
            title="Unarchive Account"
          >
            <i className="ri-refresh-line" />
          </button>
        </div>
      );
    }

    // Active: show only View, Edit, Archive
    return (
      <div className="actionButtonsContainer">
        <button
          className="viewBtn"
          onClick={() => openViewModal(account)}
          title="View Details"
        >
          <i className="ri-eye-line" />
        </button>
        <button
          className="editBtn"
          onClick={() => openEditModal(account)}
          title="Edit Account"
        >
          <i className="ri-edit-2-line" />
        </button>
        <button
          className="deleteBtn"
          onClick={() => handleArchive(account)}
          title="Archive Account"
          disabled={!canArchiveAccount(account)}
        >
          <i className="ri-archive-line" />
        </button>
      </div>
    );
  };

   if (errorCode) {
    return (
      <div className="card">
        <h1 className="title">Chart of Accounts</h1>
        <ErrorDisplay
          errorCode={errorCode}
          onRetry={() => {
            setError(null);
            setErrorCode(null);
            loadAccountsFromApi();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Chart of Accounts</h1>
        <Loading />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="elements">
        <h1 className="title">Chart of Accounts</h1>

        <div className="settings">
          <div className='search-filter-container'>
            {/* Search Bar */}
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                type="text"
                className="searchInput"
                placeholder="Search account code or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <br/>
            {/* Filter Component */}
            <FilterDropdown
              key={`filter-${accountTypeFilters.join('-')}-${statusFilter}`}
              sections={filterSections}
              onApply={handleFilterApply}
              initialValues={{
                accountTypes: accountTypeFilters,
                status: statusFilter,
              }}
            />
          </div>
          

          {/* Filters and Actions */}
          <div className="filters">
            <button onClick={handleExport} id="export">
              <i className="ri-file-download-line" /> Generate CSV
            </button>

            <button onClick={openAddModal} id="addAccount">
              <i className="ri-add-line" /> Add Account
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">      
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 60,  minWidth: 60,  textAlign: 'center' }}>No.</th>
                  <th style={{ width: 140, minWidth: 140, textAlign: 'center' as const }}>Account Code</th>
                  <th className="account-name" style={{ minWidth: 150, textAlign: 'left' }}>Account Name</th>
                  <th style={{ minWidth: 140, textAlign: 'center' }}>Account Type</th>
                  <th style={{ width: 120, minWidth: 120, textAlign: 'center' }}>Normal Balance</th>
                  <th style={{ minWidth: 250, textAlign: 'left' }}>Description</th>
                  <th style={{ width: 120, minWidth: 120, textAlign: 'center' }}>Status</th>
                  <th style={{ width: 140, minWidth: 140, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => {
                  // Calculate row number based on current page
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  
                  return (
                    <tr key={account.account_id}>
                      {/* No. */}
                      <td>{rowNumber}</td>

                      {/* Account Code */}
                      <td>{account.account_code}</td>

                      {/* Account Name with hierarchy indicator */}
                      <td className="account-name">
                        {account.account_name}
                      </td>

                      {/* Account Type */}
                      <td>
                        <span className={`chip ${getAccountTypeClass(account.account_type)}`}>
                          {account.account_type}
                        </span>
                      </td>

                      {/* Normal Balance */}
                      <td>{getNormalBalance(account.account_type)}</td>

                      {/* Description */}
                      <td>
                        {account.description ? (
                          <span title={account.description}>
                            {account.description.length > 50 
                              ? `${account.description.substring(0, 50)}...` 
                              : account.description}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Status - Single value centered */}
                      <td className="table-status">
                        <span className={`chip ${account.is_active ? 'active' : 'closed'}`}>
                          {account.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="actionButtons">
                        {renderActionButtons(account)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {accounts.length === 0 && (
              <p className="noRecords">No accounts found matching your criteria.</p>
            )}
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

      {/* Dynamic Modal Manager - following tripRevenue pattern */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />
    </div>
  );
};

export default ChartOfAccountsPage;
