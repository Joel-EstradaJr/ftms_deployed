'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { formatDate } from '../../../../utils/formatting';;
import { showSuccess, showError, showConfirmation } from '@/app/utils/Alerts';

import PaginationComponent from '@/app/Components/pagination';
import Loading from '@/app/Components/loading';
import ErrorDisplay from '@/app/Components/errordisplay';
import ModalManager from '@/app/Components/modalManager';
import FilterDropdown, { FilterSection } from '@/app/Components/filter';

import RecordChartOfAccount from './recordChartOfAccount';
import AddAccountModal from './AddAccountModal';
import AddChildAccountModal from './AddChildAccountModal';
import ValidateBalanceModal from './ValidateBalanceModal';
import AuditTrailModal from './AuditTrailModal';

import { ChartOfAccount, AccountType, AccountFormData} from '@/app/types/jev';
import { fetchChartOfAccounts, createChartOfAccount, ChartOfAccountsQueryParams, PaginationResponse } from '@/app/services/chartOfAccountsService';
import { ApiError } from '@/app/lib/api';
import {getAccountTypeClass, 
        getAccountStatusInfo, 
        canArchiveAccount,
        getChildCount,
        canHaveChildren,
        isParentAccount,
        getNormalBalance} from '@/app/lib/jev/accountHelpers';

import '@/app/styles/JEV/chart-of-accounts.css';
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
        // { id: AccountType.EQUITY, label: 'Equity' },
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

  // Fetch accounts from backend API with filters and pagination
  const loadAccountsFromApi = useCallback(async () => {
    try {
      // Only show loading spinner on initial load, not on subsequent searches
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      setErrorCode(null);

      // Build query parameters based on filters
      // When account type filters are applied, we need to fetch ALL records
      // and paginate on the frontend since backend doesn't support multiple accountTypeId filtering
      const hasAccountTypeFilter = accountTypeFilters && accountTypeFilters.length > 0;
      
      const params: ChartOfAccountsQueryParams = {
        page: hasAccountTypeFilter ? 1 : currentPage,
        limit: hasAccountTypeFilter ? 1000 : pageSize, // Fetch all when filtering by account type
        includeArchived: statusFilter === 'archived' || statusFilter === 'all',
      };

      // Add search parameter if present
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const result = await fetchChartOfAccounts(params);
      
      // Apply frontend filters
      let filteredData = result.data;
      
      // Apply account type filter if types selected
      if (accountTypeFilters && accountTypeFilters.length > 0) {
        filteredData = filteredData.filter(acc => 
          accountTypeFilters.includes(acc.account_type)
        );
      }
      
      // Apply status filter on frontend (since backend includeArchived shows all)
      if (statusFilter === 'active') {
        filteredData = filteredData.filter(acc => acc.is_active === true);
      } else if (statusFilter === 'archived') {
        filteredData = filteredData.filter(acc => acc.is_active === false);
      }
      // If statusFilter === 'all', show everything (no filtering)

      // Apply client-side pagination when account type filter is active
      let paginatedData = filteredData;
      let total = filteredData.length;
      let calculatedTotalPages = Math.ceil(total / pageSize);
      
      if (hasAccountTypeFilter) {
        // Client-side pagination
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        paginatedData = filteredData.slice(startIndex, endIndex);
      } else {
        // Backend already paginated
        total = result.pagination.total;
        calculatedTotalPages = result.pagination.totalPages;
      }

      setAccounts(paginatedData);
      setTotalPages(Math.max(1, calculatedTotalPages));
      setTotalItems(total);
      if (isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    } catch (err) {
      setLoading(false);
      setIsInitialLoad(false);
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.status);
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

  const openAddChildModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setModalContent(
      <AddChildAccountModal
        parentAccount={account}
        onClose={closeModal}
        onSubmit={async (data) => {
          await showSuccess('Child account created successfully', 'Success');
          closeModal();
          loadAccountsFromApi();
        }}
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
      if (error instanceof ApiError) {
        await showError(error.message, 'Error');
      } else {
        await showError('Failed to create account', 'Error');
      }
    }
  };

  const handleExport = async () => {
    await showSuccess('Chart of Accounts exported successfully', 'Success');
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
                  <th>No.</th>
                  <th>Account Code</th>
                  <th className="account-name">Account Name</th>
                  <th>Account Type</th>
                  <th>Normal Balance</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => {
                  // Note: Child count calculation removed as we only have current page data
                  // Backend should provide this information if needed
                  
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
