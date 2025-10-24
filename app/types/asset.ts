// Types for Asset Management (Module 7.2)
// TODO (backend): ensure these shapes match server models and include created_by/audit fields

export type AssetType = 'BUS' | 'EQUIPMENT' | 'OTHER';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  date_acquired: string; // ISO date string
  original_value: number; // in PHP
  depreciation_rate_annual?: number; // percentage (e.g. 10 means 10%/yr)
  total_depreciated?: number; // computed/aggregated from entries
  current_value?: number; // original_value - total_depreciated (can be computed server-side)
  notes?: string;
  is_disposed?: boolean;
  // TODO backend: include created_by, created_at, updated_by, updated_at
}

export interface DepreciationEntry {
  id: string;
  asset_id: string;
  date: string; // ISO date string
  depreciated_value: number; // manual input value
  reason?: string;
  created_at?: string;
  created_by?: string;
  // TODO backend: ledger / journal reference id for integration with Module 7.1
}
