"use client";

import React from "react";
import type { Asset } from "../../../types/asset";

export default function AssetTable({ assets, onRowClick }:{
  assets: Asset[];
  onRowClick: (a: Asset) => void;
}) {
  return (
    <div className="table-wrapper">
      <div className="tableContainer">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date Acquired</th>
              <th>Asset</th>
              <th>Original Value</th>
              <th>Depreciation (Annual %)</th>
              <th>Depreciated Value</th>
              <th>Current Value</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(a => (
              <tr key={a.id} style={{cursor: 'pointer'}} onClick={() => onRowClick(a)}>
                <td>{new Date(a.date_acquired).toLocaleDateString()}</td>
                <td>{a.name}</td>
                <td>₱{a.original_value.toLocaleString()}</td>
                <td>{a.depreciation_rate_annual ?? '-'}</td>
                <td>₱{(a.total_depreciated ?? 0).toLocaleString()}</td>
                <td>₱{(a.current_value ?? a.original_value).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
