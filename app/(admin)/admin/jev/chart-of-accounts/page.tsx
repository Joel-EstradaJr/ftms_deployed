'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatDate } from '../../../../utils/formatting';
import { showSuccess, showError, showConfirmation } from '@/app/utils/Alerts';

import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import ErrorDisplay from '@/app/Components/errordisplay';
import ModalManager from '@/app/Components/modalManager';
import FilterDropdown, { FilterSection } from '@/app/Components/filter';
import ExportButton from '@/app/Components/ExportButton';

import RecordChartOfAccount from './recordChartOfAccount';
import AddAccountModal from './AddAccountModal';
import ValidateBalanceModal from './ValidateBalanceModal';
import AuditTrailModal from './AuditTrailModal';

import { ChartOfAccount, AccountType, AccountFormData} from '@/app/types/jev';
import { 
  fetchChartOfAccounts, 
  createChartOfAccount, 
  archiveChartOfAccount,
  restoreChartOfAccount,
  ChartOfAccountsQueryParams, 
  PaginationResponse 
} from '@/app/services/chartOfAccountsService';
import {getAccountTypeClass, 
        canArchiveAccount} from '@/app/lib/jev/accountHelpers';

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
  const [exportData, setExportData] = useState<any[]>([]);

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

      // Determine if we need client-side filtering
      // We need client-side filtering when:
      // 1. There's an account type filter (backend doesn't support accountTypeId array filter)
      // 2. Status filter is 'archived' (backend returns all when includeArchived=true, but we need only archived)
      const needsClientSideFiltering = hasAccountTypeFilter || statusFilter === 'archived';

      const params: ChartOfAccountsQueryParams = {
        page: needsClientSideFiltering ? 1 : currentPage,
        limit: needsClientSideFiltering ? 10000 : pageSize,
        includeArchived: statusFilter === 'archived' || statusFilter === 'all',
      };

      if (trimmedSearch) {
        params.search = trimmedSearch;
      }

      const result = await fetchChartOfAccounts(params);

      // Ignore stale responses (out of order)
      if (reqId !== lastReqIdRef.current) return;

      // Frontend filters
      let filteredData = result.data;

      // Apply account type filter (client-side only)
      if (hasAccountTypeFilter) {
        const typeSet = new Set(accountTypeFilters.map(String));
        filteredData = filteredData.filter(acc => typeSet.has(String(acc.account_type)));
      }

      // Apply status filter (client-side for additional filtering)
      // Backend includeArchived returns both active and archived when true
      // We need to filter further based on statusFilter
      if (statusFilter === 'active') {
        filteredData = filteredData.filter(acc => acc.is_active);
      } else if (statusFilter === 'archived') {
        filteredData = filteredData.filter(acc => !acc.is_active);
      }
      // statusFilter === 'all' -> no additional filtering needed

      // Pagination
      let paginatedData = filteredData;
      let total = filteredData.length;
      let calculatedTotalPages = Math.ceil(total / pageSize);

      if (needsClientSideFiltering) {
        // Client-side pagination
        const startIndex = (currentPage - 1) * pageSize;
        paginatedData = filteredData.slice(startIndex, startIndex + pageSize);
      } else {
        // Use backend pagination only when no client-side filtering
        total = result.pagination.total;
        calculatedTotalPages = result.pagination.totalPages;
      }

      setAccounts(paginatedData);
      setTotalPages(Math.max(1, calculatedTotalPages));
      setTotalItems(total);
      
      // Auto-adjust current page if it exceeds new total pages
      if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
        setCurrentPage(calculatedTotalPages);
      }
      
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

  // Prepare export data (fetch all records with current filters)
  const prepareExportData = useCallback(async () => {
    try {
      const params: ChartOfAccountsQueryParams = {
        page: 1,
        limit: 10000, // High limit to get all records
        includeArchived: statusFilter === 'archived' || statusFilter === 'all',
      };

      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const result = await fetchChartOfAccounts(params);
      
      // Apply frontend filters
      let filteredData = result.data;
      
      if (accountTypeFilters && accountTypeFilters.length > 0) {
        filteredData = filteredData.filter(acc => 
          accountTypeFilters.includes(acc.account_type)
        );
      }
      
      if (statusFilter === 'active') {
        filteredData = filteredData.filter(acc => acc.is_active === true);
      } else if (statusFilter === 'archived') {
        filteredData = filteredData.filter(acc => acc.is_active === false);
      }

      // Transform data for export
      const transformed = filteredData.map((account, index) => ({
        'No.': index + 1,
        'Account Code': account.account_code,
        'Account Name': account.account_name,
        'Account Type': account.account_type,
        'Normal Balance': account.normal_balance || 'N/A',
        'Description': account.description || '-',
        'Status': account.is_active ? 'Active' : 'Archived'
      }));

      setExportData(transformed);
    } catch (error) {
      console.error('Error preparing export data:', error);
    }
  }, [debouncedSearch, statusFilter, accountTypeFilters]);

  // Initial load and reload when filters change
  useEffect(() => {
    loadAccountsFromApi();
    prepareExportData();
  }, [loadAccountsFromApi, prepareExportData]);

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

  // Generate dynamic filename based on filters
  const getExportFilename = () => {
    const filenameParts = ['Chart_of_Accounts'];
    
    if (statusFilter !== 'all') {
      filenameParts.push(statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1));
    }
    
    if (accountTypeFilters.length > 0 && accountTypeFilters.length < 4) {
      const types = accountTypeFilters.map(t => 
        t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
      ).join('-');
      filenameParts.push(types);
    }
    
    if (debouncedSearch && debouncedSearch.trim()) {
      const sanitizedSearch = debouncedSearch.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      if (sanitizedSearch) {
        filenameParts.push(sanitizedSearch);
      }
    }
    
    return filenameParts.join('_');
  };

  const handleArchive = async (account: ChartOfAccount) => {
    if (!canArchiveAccount(account)) {
      await showError('Cannot archive system accounts', 'Error');
      return;
    }
    
    const result = await showConfirmation(
      `Are you sure you want to archive "${account.account_name}"?<br/>
      <span style="color: #666; font-size: 0.9em;">This account will no longer appear in active listings.</span>`,
      'Archive Account'
    );

    if (result.isConfirmed) {
      try {
        await archiveChartOfAccount(account.account_id);
        await showSuccess('Account archived successfully', 'Success');
        loadAccountsFromApi();
      } catch (error) {
        console.error('Error archiving account:', error);
        if (error instanceof Error) {
          await showError(error.message, 'Archive Failed');
        } else {
          await showError('Failed to archive account', 'Error');
        }
      }
    }
  };

  const handleRestore = async (account: ChartOfAccount) => {
    const result = await showConfirmation(
      `Restore account "${account.account_name}"?`,
      'Restore Account'
    );

    if (result.isConfirmed) {
      try {
        await restoreChartOfAccount(account.account_id);
        await showSuccess('Account restored successfully', 'Success');
        loadAccountsFromApi();
      } catch (error) {
        console.error('Error restoring account:', error);
        if (error instanceof Error) {
          await showError(error.message, 'Restore Failed');
        } else {
          await showError('Failed to restore account', 'Error');
        }
      }
    }
  };

  const renderActionButtons = (account: ChartOfAccount) => {
    // Use is_active to determine archived state (is_active = false means archived)
    const isArchived = !account.is_active;

    if (isArchived) {
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
            className="restoreBtn"
            onClick={() => handleRestore(account)}
            title="Restore Account"
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
            <ExportButton
              data={exportData}
              filename={getExportFilename()}
              title="Chart of Accounts Report"
            />

            <button onClick={openAddModal} id="addAccount" className='addButton'>
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
                  <th style={{ width: 140, minWidth: 140, textAlign: 'center', whiteSpace: 'nowrap' }}>Normal Balance</th>
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
                      <td>{account.normal_balance || 'N/A'}</td>

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
