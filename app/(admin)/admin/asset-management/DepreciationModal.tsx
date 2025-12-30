"use client";

import React, { useEffect, useState } from "react";
import "../../../styles/components/modal.css";
import ModalHeader from "../../../Components/ModalHeader";
import type { Asset } from "../../../types/asset";
import { showConfirmation, showSuccess, showError } from "../../../utils/Alerts";

export default function DepreciationModal({ asset, onClose, onSaved }:{
  asset: Asset;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [depreciatedValue, setDepreciatedValue] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // default suggestion (0) — user will input manual depreciation value per update
    setDepreciatedValue(0);
  }, [asset]);

  const handleAdd = async () => {
    if (depreciatedValue <= 0) {
      showError('Depreciated value must be greater than zero', 'Validation');
      return;
    }

    const remaining = (asset.current_value ?? asset.original_value) - (asset.total_depreciated ?? 0);
    if (depreciatedValue > remaining) {
      showError('Depreciated value cannot exceed remaining/current value', 'Validation');
      return;
    }

    const conf = await showConfirmation(`Apply ₱${depreciatedValue.toLocaleString()} depreciation to ${asset.name}?`, 'Confirm Depreciation');
    if (!conf.isConfirmed) return;

    setSubmitting(true);
    try {
      // TODO: call backend POST /assets/:id/depreciation and create journal entry (Module 7.1)
      // For now we simulate success
      await new Promise(res => setTimeout(res, 300));
      showSuccess('Depreciation recorded', 'Success');
      onSaved && onSaved();
      onClose();
    } catch (e) {
      showError('Failed to record depreciation', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="addBudgetRequestModal">
        <ModalHeader title={`Depreciate: ${asset.name}`} onClose={onClose} />
        <div className="modalContent" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label>Asset</label>
              <div>{asset.name}</div>
            </div>

            <div>
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div>
              <label>Original Value</label>
              <div>₱{asset.original_value.toLocaleString()}</div>
            </div>

            <div>
              <label>Depreciated Value (input)</label>
              <input type="number" value={depreciatedValue} onChange={e => setDepreciatedValue(Number(e.target.value))} />
            </div>

            <div>
              <label>Reason (optional)</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modalButtons" style={{ padding: '12px 16px' }}>
          <button className="saveAsDraftButton" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="submitButton" onClick={handleAdd} disabled={submitting}>Add Depreciation</button>
        </div>
      </div>
    </div>
  );
}
