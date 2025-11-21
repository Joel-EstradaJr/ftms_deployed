'use client';

import React, { useState } from 'react';
import { PayrollBatch, Payroll } from './types';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showConfirmation, showSuccess, showError } from '../../../../utils/Alerts';
import '@/styles/components/modal2.css';
import '@/styles/components/forms.css';
import '@/styles/components/table.css';
import '@/styles/components/chips.css';

interface ViewPayrollBatchProps {
  batch: PayrollBatch;
  onClose: () => void;
  onDisburse?: (batchId: string, payrollIds: string[]) => Promise<void>;
  currentUser: string;
}

export default function ViewPayrollBatch({
  batch,
  onClose,
  onDisburse,
  currentUser
}: ViewPayrollBatchProps) {
  
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [disbursing, setDisbursing] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const undisbursedIds = batch.payrolls
        ?.filter(p => !p.isDisbursed)
        .map(p => p.id) || [];
      setSelectedPayrolls(undisbursedIds);
    } else {
      setSelectedPayrolls([]);
    }
  };

  // Handle individual selection
  const handleSelectPayroll = (payrollId: string, checked: boolean) => {
    if (checked) {
      setSelectedPayrolls(prev => [...prev, payrollId]);
    } else {
      setSelectedPayrolls(prev => prev.filter(id => id !== payrollId));
    }
  };

  // Handle disbursement
  const handleDisburse = async () => {
    if (!onDisburse || selectedPayrolls.length === 0) return;

    const confirmed = await showConfirmation(
      `Disburse payroll for ${selectedPayrolls.length} employee(s)?`,
      'Confirm Disbursement'
    );

    if (confirmed.isConfirmed) {
      setDisbursing(true);
      try {
        await onDisburse(batch.id, selectedPayrolls);
        showSuccess('Payroll disbursed successfully', 'Success');
        setSelectedPayrolls([]);
      } catch (error) {
        showError(
          error instanceof Error ? error.message : 'Failed to disburse payroll',
          'Error'
        );
      } finally {
        setDisbursing(false);
      }
    }
  };

  // Get status badge class
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'approved':
        return 'approved';
      case 'disbursed':
        return 'paid';
      case 'cancelled':
        return 'cancelled';
      default:
        return '';
    }
  };

  const undisbursedCount = batch.payrolls?.filter(p => !p.isDisbursed).length || 0;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1000px' }}>
        <div className="modal-content-wrapper">
          {/* Modal Header */}
          <div className="modal-heading">
            <div className="modal-title-section">
              <h2 className="modal-title">Payroll Batch Details</h2>
              <p className="modal-subtitle">
                {batch.batchCode} • {formatDate(batch.periodStart)} to {formatDate(batch.periodEnd)}
              </p>
            </div>
            <button className="close-modal-btn" onClick={onClose}>
              <i className="ri-close-line"></i>
            </button>
          </div>

          {/* Modal Content */}
          <div className="modal-content view">
            
            {/* Batch Summary Section */}
            <div className="details-title">Batch Summary</div>
            <div className="form-row">
              <div className="form-group">
                <label>Batch Code</label>
                <input type="text" value={batch.batchCode} readOnly />
              </div>
              <div className="form-group">
                <label>Status</label>
                <div style={{ marginTop: '5px' }}>
                  <span className={`chip ${getStatusClass(batch.status)}`}>
                    {batch.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Period Start</label>
                <input type="text" value={formatDate(batch.periodStart)} readOnly />
              </div>
              <div className="form-group">
                <label>Period End</label>
                <input type="text" value={formatDate(batch.periodEnd)} readOnly />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Employees</label>
                <input type="text" value={batch.totalEmployees} readOnly />
              </div>
              <div className="form-group">
                <label>Undisbursed</label>
                <input 
                  type="text" 
                  value={undisbursedCount} 
                  readOnly 
                  style={{ 
                    color: undisbursedCount > 0 ? 'var(--warning-color)' : 'var(--success-color)',
                    fontWeight: 600
                  }} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Gross</label>
                <input type="text" value={formatMoney(batch.totalGross)} readOnly />
              </div>
              <div className="form-group">
                <label>Total Deductions</label>
                <input type="text" value={formatMoney(batch.totalDeductions)} readOnly />
              </div>
              <div className="form-group">
                <label>Total Net</label>
                <input 
                  type="text" 
                  value={formatMoney(batch.totalNet)} 
                  readOnly 
                  style={{ fontWeight: 600, color: 'var(--primary-color)' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Created By</label>
                <input type="text" value={batch.createdBy || 'System'} readOnly />
              </div>
              <div className="form-group">
                <label>Created At</label>
                <input type="text" value={formatDate(batch.createdAt)} readOnly />
              </div>
            </div>

            {batch.approvedBy && (
              <div className="form-row">
                <div className="form-group">
                  <label>Approved By</label>
                  <input type="text" value={batch.approvedBy} readOnly />
                </div>
                <div className="form-group">
                  <label>Approved At</label>
                  <input type="text" value={batch.approvedAt ? formatDate(batch.approvedAt) : '-'} readOnly />
                </div>
              </div>
            )}

            {/* Individual Payroll Records */}
            <div className="details-title" style={{ marginTop: '30px' }}>
              Employee Payroll Records
            </div>

            {/* Disbursement Action */}
            {undisbursedCount > 0 && onDisburse && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '12px', 
                backgroundColor: 'var(--table-row-hover-color)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedPayrolls.length === undisbursedCount && undisbursedCount > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <span>Select All Undisbursed ({undisbursedCount})</span>
                </label>
                <button
                  className="releaseBtn"
                  onClick={handleDisburse}
                  disabled={selectedPayrolls.length === 0 || disbursing}
                  style={{ padding: '8px 16px' }}
                >
                  <i className="ri-money-dollar-circle-line"></i>
                  {disbursing ? 'Disbursing...' : `Disburse Selected (${selectedPayrolls.length})`}
                </button>
              </div>
            )}

            {/* Payroll Records Table */}
            <div className="tableContainer">
              <table className="data-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    {undisbursedCount > 0 && onDisburse && <th style={{ width: '40px' }}></th>}
                    <th>Employee</th>
                    <th>Base Salary</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.payrolls && batch.payrolls.length > 0 ? (
                    batch.payrolls.map(payroll => (
                      <tr key={payroll.id}>
                        {undisbursedCount > 0 && onDisburse && (
                          <td>
                            {!payroll.isDisbursed && (
                              <input
                                type="checkbox"
                                checked={selectedPayrolls.includes(payroll.id)}
                                onChange={(e) => handleSelectPayroll(payroll.id, e.target.checked)}
                              />
                            )}
                          </td>
                        )}
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {payroll.employee?.firstName} {payroll.employee?.lastName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--secondary-text-color)' }}>
                            {payroll.employeeId}
                          </div>
                        </td>
                        <td>{formatMoney(payroll.baseSalary)}</td>
                        <td>{formatMoney(payroll.allowances)}</td>
                        <td>{formatMoney(payroll.deductions)}</td>
                        <td style={{ fontWeight: 600 }}>{formatMoney(payroll.netPay)}</td>
                        <td>
                          {payroll.isDisbursed ? (
                            <span className="chip paid">Disbursed</span>
                          ) : (
                            <span className="chip pending">Pending</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="viewBtn"
                            onClick={() => setExpandedDetails(
                              expandedDetails === payroll.id ? null : payroll.id
                            )}
                            title="View Details"
                            style={{ fontSize: '12px', padding: '4px 8px' }}
                          >
                            <i className={`ri-arrow-${expandedDetails === payroll.id ? 'up' : 'down'}-s-line`}></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={undisbursedCount > 0 && onDisburse ? 8 : 7} style={{ textAlign: 'center', padding: '20px' }}>
                        No payroll records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expanded Details */}
            {expandedDetails && batch.payrolls && (
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                backgroundColor: 'var(--table-row-hover-color)',
                borderRadius: '4px',
                border: '1px solid var(--border-color)'
              }}>
                {(() => {
                  const payroll = batch.payrolls.find(p => p.id === expandedDetails);
                  if (!payroll) return null;

                  return (
                    <>
                      <h4 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>
                        Payroll Details - {payroll.employee?.firstName} {payroll.employee?.lastName}
                      </h4>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Employee ID</label>
                          <input type="text" value={payroll.employeeId} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Department</label>
                          <input type="text" value={payroll.employee?.department || '-'} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Position</label>
                          <input type="text" value={payroll.employee?.position || '-'} readOnly />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Base Salary</label>
                          <input type="text" value={formatMoney(payroll.baseSalary)} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Allowances</label>
                          <input type="text" value={formatMoney(payroll.allowances)} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Deductions</label>
                          <input type="text" value={formatMoney(payroll.deductions)} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Net Pay</label>
                          <input 
                            type="text" 
                            value={formatMoney(payroll.netPay)} 
                            readOnly 
                            style={{ fontWeight: 600, color: 'var(--primary-color)' }}
                          />
                        </div>
                      </div>
                      {payroll.isDisbursed && (
                        <div className="form-row">
                          <div className="form-group">
                            <label>Disbursed By</label>
                            <input type="text" value={payroll.disbursedBy || '-'} readOnly />
                          </div>
                          <div className="form-group">
                            <label>Disbursement Date</label>
                            <input type="text" value={payroll.disbursementDate ? formatDate(payroll.disbursementDate) : '-'} readOnly />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

          </div>

          {/* Modal Actions */}
          <div className="modal-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
            >
              <i className="ri-close-line" /> Close
            </button>

            {undisbursedCount > 0 && selectedPayrolls.length > 0 && (
              <button 
                type="button" 
                className="submit-btn"
                onClick={handleDisburse}
                disabled={disbursing}
              >
                {disbursing ? (
                  <><i className="ri-loader-4-line" /> Disbursing...</>
                ) : (
                  <><i className="ri-check-line" /> Disburse Selected ({selectedPayrolls.length})</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
