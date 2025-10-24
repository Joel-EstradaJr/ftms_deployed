"use client";

import React, { useEffect, useState } from "react";
import "../../../styles/components/table.css";
import "../../../styles/components/modal.css";
import "../../../styles/asset-management/asset-management.css";
import AssetTable from "./AssetTable";
import DepreciationModal from "./DepreciationModal";
import ExportButton from "../../../Components/ExportButton";
import FilterDropdown, { FilterSection } from "../../../Components/filter";
import Loading from "../../../Components/loading";
import ErrorDisplay from "../../../Components/errordisplay";
import type { Asset } from "../../../types/asset";

export default function AssetManagementPage() {
  // Mock data only (bus company) - TODO: replace with backend API when ready
  const mockAssets: Asset[] = [
    {
      id: 'bus-001',
      name: 'Unit 001 - Coach A',
      type: 'BUS',
      date_acquired: '2018-03-15',
      original_value: 8000000,
      depreciation_rate_annual: 10,
      total_depreciated: 3200000,
      current_value: 4800000,
      notes: 'Main fleet coach'
    },
    {
      id: 'bus-002',
      name: 'Unit 002 - Coach B',
      type: 'BUS',
      date_acquired: '2019-06-10',
      original_value: 8500000,
      depreciation_rate_annual: 10,
      total_depreciated: 2550000,
      current_value: 5950000,
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

  useEffect(() => {
    setLoading(true);
    // TODO (backend): replace this with service call and server-side pagination/filters
    const t = setTimeout(() => {
      setAssets(mockAssets);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, []);

  // Filter sections for the FilterDropdown
  const filterSections: FilterSection[] = [
    {
      id: 'dateRange',
      title: 'Date Acquired',
      type: 'dateRange',
      defaultValue: { from: '', to: '' }
    },
    {
      id: 'type',
      title: 'Asset Type',
      type: 'checkbox',
      options: Array.from(new Set(mockAssets.map(a => a.type))).map(t => ({ id: t, label: t }))
    }
  ];

  const handleApplyFilters = (values: Record<string, any>) => {
    setFilters(values);
  };

  // Derived filtered assets
  const filteredAssets = React.useMemo(() => {
    let res = [...assets];
    if (search) {
      const s = search.toLowerCase();
      res = res.filter(a =>
        a.name.toLowerCase().includes(s) ||
        a.id.toLowerCase().includes(s) ||
        (a.notes || '').toLowerCase().includes(s)
      );
    }

    if (filters.type && Array.isArray(filters.type) && filters.type.length) {
      res = res.filter(a => filters.type.includes(a.type));
    }

    if (filters.dateRange && typeof filters.dateRange === 'object') {
      const { from, to } = filters.dateRange;
      if (from) res = res.filter(a => a.date_acquired >= from);
      if (to) res = res.filter(a => a.date_acquired <= to);
    }

    return res;
  }, [assets, search, filters]);

  return (
    <div className="card">
      <div className="title">Asset Management</div>
      <div className="elements">
        <div className="settings" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="expense_searchBar">
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

          <ExportButton data={filteredAssets} filename="asset_management" />
        </div>

        {loading && <Loading />}
        {error && <ErrorDisplay errorCode={error} onRetry={() => { /* TODO: reload from backend */ }} />}

        {!loading && !error && (
          <AssetTable
            assets={filteredAssets}
            onRowClick={(a) => {
              setSelectedAsset(a);
              setShowDepModal(true);
            }}
          />
        )}
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
    </div>
  );
}
