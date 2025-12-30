// Types for Asset Management (Module 7.2)
// TODO (backend): ensure these shapes match server models and include created_by/audit fields

export type AssetType = 'BUS' | 'EQUIPMENT' | 'OTHER';

export interface Asset {
  id: string;
  asset_code?: string; // DB: fixed_asset.asset_code
  name: string;
  type: AssetType;
  asset_type_name?: string; // DB: fixed_asset.asset_type_id > name
  date_acquired: string; // ISO date string - DB: fixed_asset.acquisition_date
  original_value: number; // in PHP - DB: acquisition cost
  depreciation_rate_annual?: number; // percentage (e.g. 10 means 10%/yr)
  total_depreciated?: number; // computed/aggregated from entries
  current_value?: number; // original_value - total_depreciated (can be computed server-side)
  book_value?: number; // DB: derived from Acquisition Cost +/- accumulated amount
  status?: string; // DB: fixed_asset.status (PENDING, ACTIVE, FULLY DEPRECIATED, DISPOSED)
  estimated_life_years?: number; // DB: fixed_asset.estimated_life_years
  notes?: string;
  is_disposed?: boolean;
  
  // Disposal Fields (for DISPOSED status)
  disposal_code?: string; // auto-generated when status becomes DISPOSED
  disposal_date?: string; // editable if linked Entry is DRAFT
  disposal_value?: number; // editable if linked Entry is DRAFT
  disposal_gain_loss?: number; // derived: disposal_value - book_value
  disposal_entry_id?: string; // link to JEV entry
  disposal_entry_status?: 'DRAFT' | 'POSTED'; // status of linked disposal entry
  
  // Accumulation/Depreciation Fields (for NON-PENDING status)
  accumulation_period_start?: string; // default to acquisition_date, overridable
  accumulation_period_end?: string; // derived: acquisition_date + estimated_years_of_life
  accumulation_monthly_amount?: number; // derived: (acquisition_cost / estimated_years_of_life) / 12
  accumulated_amount?: number; // derived: monthly_amount × months since acquisition_date
  accumulation_type?: 'APPRECIATION' | 'DEPRECIATION'; // default DEPRECIATION
  current_book_value?: number; // APPRECIATION: cost + accumulated; DEPRECIATION: cost - accumulated
  
  // Inventory Tracking Fields (link to source inventory)
  linked_bus_id?: string; // for BUS type assets, links to inventory bus.id
  linked_batch_asset_id?: string; // for EQUIPMENT type assets, links to inventory batch_asset_id
  linked_item_id?: string; // for EQUIPMENT type assets, links to inventory item_id
  
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
