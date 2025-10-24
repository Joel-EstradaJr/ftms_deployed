// Mock asset service for Module 7.2
// TODO (backend): Replace with real API calls and move journaling logic to server-side integration with Module 7.1

import type { Asset, DepreciationEntry } from "../types/asset";

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
  }
];

export async function fetchAssets(): Promise<Asset[]> {
  // TODO: GET /api/assets
  return new Promise(res => setTimeout(() => res(mockAssets), 200));
}

export async function fetchAssetById(id: string): Promise<Asset|null> {
  // TODO: GET /api/assets/:id
  const found = mockAssets.find(a => a.id === id) ?? null;
  return new Promise(res => setTimeout(() => res(found), 150));
}

export async function postDepreciation(assetId: string, entry: Omit<DepreciationEntry, 'id'|'created_at'>): Promise<DepreciationEntry> {
  // TODO: POST /api/assets/:id/depreciation
  const newEntry: DepreciationEntry = {
    id: `dep-${Date.now()}`,
    ...entry,
    created_at: new Date().toISOString()
  };
  // mock success
  return new Promise(res => setTimeout(() => res(newEntry), 250));
}
