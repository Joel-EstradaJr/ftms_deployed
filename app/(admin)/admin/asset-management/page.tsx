"use client";

import React, { useEffect, useState, useMemo } from "react";
import "@/styles/components/table.css";
import "@/styles/components/modal2.css";
import "@/styles/components/chips.css";
import "@/styles/components/forms.css"


import AssetTable from "./AssetTable";
import DepreciationModal from "./DepreciationModal";
import RecordAssetModal from "./recordAsset";
import ViewAssetModal from "./ViewAssetModal";
import ModalManager from "@/app/Components/modalManager";
import ExportButton from "../../../Components/ExportButton";
import FilterDropdown, { FilterSection } from "../../../Components/filter";
import PaginationComponent from "../../../Components/pagination";
import Loading from "../../../Components/loading";
import ErrorDisplay from "../../../Components/errordisplay";
import { showSuccess, showError, showTypeToConfirm } from "@/app/utils/Alerts";
import type { Asset } from "../../../types/asset";

export default function AssetManagementPage() {
  // Mock data only (bus company) - TODO: replace with backend API when ready
  const mockAssets: Asset[] = [
    {
      id: 'bus-001',
      asset_code: 'FA-BUS-001',
      name: 'Yutong | 001',
      type: 'BUS',
      asset_type_name: 'Bus - Airconditioned',
      date_acquired: '2018-03-15',
      original_value: 8000000,
      depreciation_rate_annual: 10,
      total_depreciated: 3200000,
      current_value: 4800000,
      book_value: 4800000,
      status: 'ACTIVE',
      estimated_life_years: 10,
      notes: 'Main fleet coach'
    },
    {
      id: 'bus-002',
      asset_code: 'FA-BUS-002',
      name: 'King Long | 002',
      type: 'BUS',
      asset_type_name: 'Bus - Ordinary',
      date_acquired: '2019-06-10',
      original_value: 8500000,
      depreciation_rate_annual: 10,
      total_depreciated: 2550000,
      current_value: 5950000,
      book_value: 5950000,
      status: 'ACTIVE',
      estimated_life_years: 10,
      notes: 'Spare coach'
    }
  ];

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showDepModal, setShowDepModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Modal management states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  // Mock data for dropdowns - TODO: Replace with backend API
  const mockAssetTypes = [
    { id: '1', name: 'Bus - Airconditioned' },
    { id: '2', name: 'Bus - Ordinary' },
    { id: '3', name: 'Equipment' },
    { id: '4', name: 'Furniture' },
    { id: '5', name: 'Vehicle' },
    { id: '6', name: 'Building' },
  ];

  const mockUnitMeasures = [
    { id: '1', name: 'Piece', abbreviation: 'pcs' },
    { id: '2', name: 'Unit', abbreviation: 'unit' },
    { id: '3', name: 'Set', abbreviation: 'set' },
    { id: '4', name: 'Lot', abbreviation: 'lot' },
  ];

  useEffect(() => {
    setLoading(true);
    // TODO (backend): replace this with service call and server-side pagination/filters
    const t = setTimeout(() => {
      setAssets(mockAssets);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  // Filter sections for the FilterDropdown - memoized to prevent infinite re-renders
  const filterSections: FilterSection[] = useMemo(() => [
    {
      id: 'assetType',
      title: 'Asset Type',
      type: 'checkbox',
      options: [
        { id: 'Bus - Airconditioned', label: 'Bus - Airconditioned' },
        { id: 'Bus - Ordinary', label: 'Bus - Ordinary' },
        { id: 'Equipment', label: 'Equipment' },
        { id: 'Furniture', label: 'Furniture' },
        { id: 'Vehicle', label: 'Vehicle' },
        { id: 'Building', label: 'Building' },
      ]
    },
    {
      id: 'status',
      title: 'Status',
      type: 'checkbox',
      options: [
        { id: 'PENDING', label: 'Pending' },
        { id: 'ACTIVE', label: 'Active' },
        { id: 'FULLY DEPRECIATED', label: 'Fully Depreciated' },
        { id: 'DISPOSED', label: 'Disposed' },
      ]
    },
    {
      id: 'bookValueRange',
      title: 'Book Value',
      type: 'numberRange',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'dateRange',
      title: 'Acquisition Date',
      type: 'dateRange',
      defaultValue: { from: '', to: '' }
    },
  ], []);

  const handleApplyFilters = (values: Record<string, any>) => {
    setFilters(values);
  };

  // Open modal with different modes
  const openModal = (mode: 'add' | 'edit', assetData?: Asset) => {
    const content = (
      <RecordAssetModal
        mode={mode}
        existingData={assetData || null}
        onClose={closeModal}
        onSave={handleSaveAsset}
        assetTypes={mockAssetTypes}
        unitMeasures={mockUnitMeasures}
        currentUser="admin"
      />
    );

    setModalContent(content);
    setActiveAsset(assetData || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
    setActiveAsset(null);
  };

  const handleSaveAsset = (assetData: Asset, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      // Add new asset
      const newAsset: Asset = {
        ...assetData,
        id: `asset-${Date.now()}`,
      };
      setAssets(prev => [...prev, newAsset]);
      showSuccess('Asset added successfully', 'Success');
    } else {
      // Update existing asset
      setAssets(prev => prev.map(a => a.id === assetData.id ? assetData : a));
      showSuccess('Asset updated successfully', 'Success');
    }
    closeModal();
  };

  const handleAdd = () => {
    openModal('add');
  };

  // Open view modal
  const openViewModal = (asset: Asset) => {
    // Mock: Fetch bus/item data based on asset type
    // TODO: Replace with actual API calls
    let busData = null;
    let itemBatchData = null;

    if (asset.type === 'BUS') {
      busData = {
        bus_code: 'BUS-001',
        plate_number: 'ABC-1234',
        body_number: 'BN-001',
        bus_type: 'Airconditioned',
        condition: 'Good',
        acquisition_method: 'Purchase',
        registration_status: 'Registered',
        chassis_number: 'CH-12345',
        engine_number: 'EN-67890',
        seat_capacity: 45,
        model: 'Yutong ZK6127H',
        year_model: '2020',
        warranty_expiration_date: '2025-12-31',
        body_builder: 'Yutong',
        manufacturer: 'Yutong Bus Co.',
        dealer_name: 'ABC Motors',
        dealer_contact: '+63 912 345 6789',
        previous_owner: 'N/A',
        source: 'Direct Purchase',
        odometer_reading: 45000,
      };
    } else if (asset.type === 'EQUIPMENT') {
      itemBatchData = {
        batch_number: 'BATCH-001',
        item_code: 'ITEM-001',
        item_name: 'Desktop Computer',
        item_description: 'Dell OptiPlex 7090',
        item_category_name: 'Equipment',
        item_unit_measure_name: 'Piece',
        item_unit_measure_abbreviation: 'pcs',
        item_batch_quantity: 10,
      };
    }

    const content = (
      <ViewAssetModal
        asset={asset}
        onClose={closeModal}
        busData={busData}
        itemBatchData={itemBatchData}
      />
    );

    setModalContent(content);
    setActiveAsset(asset);
    setIsModalOpen(true);
  };

  // Derived filtered assets
  const filteredAssets = React.useMemo(() => {
    let res = [...assets];
    if (search) {
      const s = search.toLowerCase();
      res = res.filter(a =>
        a.name.toLowerCase().includes(s) ||
        (a.asset_code || '').toLowerCase().includes(s) ||
        a.id.toLowerCase().includes(s) ||
        (a.notes || '').toLowerCase().includes(s)
      );
    }

    // Asset Type filter
    if (filters.assetType && Array.isArray(filters.assetType) && filters.assetType.length) {
      res = res.filter(a => filters.assetType.includes(a.asset_type_name || a.type));
    }

    // Status filter
    if (filters.status && Array.isArray(filters.status) && filters.status.length) {
      res = res.filter(a => filters.status.includes(a.status || 'ACTIVE'));
    }

    // Book Value range filter
    if (filters.bookValueRange && typeof filters.bookValueRange === 'object') {
      const { from, to } = filters.bookValueRange;
      const fromNum = from ? parseFloat(from) : null;
      const toNum = to ? parseFloat(to) : null;
      if (fromNum !== null) {
        res = res.filter(a => (a.book_value ?? a.current_value ?? a.original_value) >= fromNum);
      }
      if (toNum !== null) {
        res = res.filter(a => (a.book_value ?? a.current_value ?? a.original_value) <= toNum);
      }
    }

    // Acquisition Date range filter
    if (filters.dateRange && typeof filters.dateRange === 'object') {
      const { from, to } = filters.dateRange;
      if (from) res = res.filter(a => a.date_acquired >= from);
      if (to) res = res.filter(a => a.date_acquired <= to);
    }

    return res;
  }, [assets, search, filters]);

  // Update total pages when filtered assets change
  React.useEffect(() => {
    const newTotalPages = Math.ceil(filteredAssets.length / pageSize);
    setTotalPages(newTotalPages);
    
    // Reset to page 1 if current page exceeds total pages
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredAssets.length, pageSize, currentPage]);

  // Paginated assets for display
  const paginatedAssets = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAssets.slice(startIndex, endIndex);
  }, [filteredAssets, currentPage, pageSize]);

  return (
    <div className="card">
      <div className="title">Asset Management</div>
      <div className="elements">
        <div className="settings" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="searchBar">
              <i className="ri-search-line" />
              <input
                className="searchInput"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <FilterDropdown sections={filterSections} onApply={handleApplyFilters} />
          </div>

          
          {/* Add Revenue Button on the right */}
          <div className="filters">
            <ExportButton data={filteredAssets} filename="asset_management" />
            <button onClick={handleAdd} className='addButton'>
              <i className="ri-add-line" /> Add Asset
            </button>
          </div>
        </div>

        {loading && <Loading />}
        {error && <ErrorDisplay errorCode={error} onRetry={() => { /* TODO: reload from backend */ }} />}

        <div className="table-wrapper">
          <div className="tableContainer">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Code</th>
                  <th>Asset Name</th>
                  <th>Asset Type</th>
                  <th>Acquisition Date</th>
                  <th>Book Value</th>
                  <th>Status</th>
                  <th>Estimated Years of Life</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                      {loading ? 'Loading...' : 'No assets found'}
                    </td>
                  </tr>
                ) : (
                  paginatedAssets.map(a => (
                    <tr key={a.id}>
                      <td>{a.asset_code || a.id}</td>
                      <td>{a.name}</td>
                      <td>{a.asset_type_name || a.type}</td>
                      <td>{new Date(a.date_acquired).toLocaleDateString()}</td>
                      <td>₱{(a.book_value ?? a.current_value ?? a.original_value).toLocaleString()}</td>
                      <td>
                        <span className={`chip ${(a.status || 'ACTIVE').toLowerCase().replace(/ /g, '-')}`}>
                          {a.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{a.estimated_life_years ? `${a.estimated_life_years} years` : '-'}</td>
                      <td>
                        <div className="actionButtonsContainer" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            className="viewBtn"
                            onClick={() => openViewModal(a)}
                            title="View Asset Details"
                          >
                            <i className="ri-eye-line" />
                          </button>
                          <button
                            className="editBtn"
                            onClick={() => openModal('edit', a)}
                            title="Edit Asset"
                          >
                            <i className="ri-edit-line" />
                          </button>
                          <button
                            className="deleteBtn"
                            onClick={async () => {
                              const confirmed = await showTypeToConfirm(
                                "DISPOSE",
                                "Dispose Asset",
                                "This action will permanently dispose the asset. This cannot be undone."
                              );
                              if (confirmed) {
                                // Proceed with disposal logic here (e.g., update status, remove asset, call API)
                                showSuccess("Asset disposed successfully.", "Disposed");
                              }
                            }}
                            title="Dispose Asset"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

      {showDepModal && selectedAsset && (
        <DepreciationModal
          asset={selectedAsset}
          onClose={() => setShowDepModal(false)}
          onSaved={() => {
            // TODO: refresh data from backend after save
            setShowDepModal(false);
          }}
        />
      )}

      {/* Modal Manager for Add/Edit Asset */}
      <ModalManager
        isOpen={isModalOpen}
        onClose={closeModal}
        modalContent={modalContent}
      />
    </div>
  );
}
