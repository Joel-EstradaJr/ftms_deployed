'use client';

import React, { useState } from 'react';
import { PayrollBatch, Payroll } from './types';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showConfirmation, showSuccess, showError } from '../../../../utils/Alerts';
import ViewPayslipModal from './viewPayslip';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import {
  calculateEarnings,
  calculateDeductions,
  formatRateType,
  getEmployeeName,
  RateType,
} from '@/utils/payrollCalculations';
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
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [selectedPayrollForPayslip, setSelectedPayrollForPayslip] = useState<Payroll | null>(null);
  const [downloadingBatch, setDownloadingBatch] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

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

  // Handle view payslip
  const handleViewPayslip = (payroll: Payroll) => {
    setSelectedPayrollForPayslip(payroll);
    setPayslipModalOpen(true);
  };

  // Handle download all payslips as ZIP
  const handleDownloadAllPayslips = async () => {
    if (!batch.payrolls || batch.payrolls.length === 0) return;

    setDownloadingBatch(true);
    try {
      const zip = new JSZip();
      const payslipsFolder = zip.folder('payslips');

      if (!payslipsFolder) {
        throw new Error('Failed to create ZIP folder');
      }

      // Generate PDF for each payroll
      for (const payroll of batch.payrolls) {
        if (!payroll.employee) continue;

        // Create a temporary div for the payslip content
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.padding = '20px';
        tempDiv.style.backgroundColor = '#ffffff';
        tempDiv.style.width = '800px';
        document.body.appendChild(tempDiv);

        // Generate payslip HTML (simplified version)
        const rateType: RateType = 'monthly';
        const earnings = calculateEarnings(payroll.baseSalary, payroll.allowances, rateType);
        const deductions = calculateDeductions(payroll.deductions);
        const employeeName = getEmployeeName(payroll.employee);

        tempDiv.innerHTML = `
          <div style="font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px;">
              <h1 style="margin: 0; font-size: 24px;">ACME Solutions Inc.</h1>
              <p style="margin: 5px 0; font-size: 14px;">Payslip Reference: #${payroll.id}</p>
            </div>
            <div style="margin-bottom: 20px;">
              <strong>Pay Period:</strong> ${formatDate(batch.period_start)} - ${formatDate(batch.period_end)}<br/>
              <strong>Employee:</strong> ${employeeName}<br/>
              <strong>ID:</strong> ${payroll.employee.employeeNumber}<br/>
              <strong>Department:</strong> ${payroll.employee.department || 'N/A'}<br/>
              <strong>Net Pay:</strong> ${formatMoney(payroll.netPay)}
            </div>
          </div>
        `;

        // Convert to canvas and PDF
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // Add PDF to ZIP
        const pdfBlob = pdf.output('blob');
        const filename = `Payslip_${payroll.employee.employeeNumber}_${payroll.employee.lastName}.pdf`;
        payslipsFolder.file(filename, pdfBlob);

        // Clean up
        document.body.removeChild(tempDiv);
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payroll_${batch.payroll_period_code}_Payslips.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('All payslips downloaded successfully', 'Success');
    } catch (error) {
      console.error('Error generating payslips:', error);
      showError('Failed to generate payslips. Please try again.', 'Error');
    } finally {
      setDownloadingBatch(false);
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
                {batch.payroll_period_code} • {formatDate(batch.period_start)} to {formatDate(batch.period_end)}
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
                <input type="text" value={batch.payroll_period_code} readOnly />
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
                <input type="text" value={formatDate(batch.period_start)} readOnly />
              </div>
              <div className="form-group">
                <label>Period End</label>
                <input type="text" value={formatDate(batch.period_end)} readOnly />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Employees</label>
                <input type="text" value={batch.total_employees} readOnly />
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
                  value={formatMoney(batch.total_net)} 
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
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
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
                        <td style={{ fontWeight: 600 }}>{formatMoney(payroll.netPay)}</td>
                        <td>
                          {payroll.isDisbursed ? (
                            <span className="chip paid">Disbursed</span>
                          ) : (
                            <span className="chip pending">Pending</span>
                          )}
                        </td>
                        <td className="actionButtons">
                          <div className="actionButtonsContainer">
                            <button
                              className="viewBtn"
                              onClick={() => setExpandedDetails(
                                expandedDetails === payroll.id ? null : payroll.id
                              )}
                              title="View Details"
                            >
                              <i className={`ri-arrow-${expandedDetails === payroll.id ? 'up' : 'down'}-s-line`}></i>
                            </button>
                            <button
                              className="exportBtn"
                              onClick={() => handleViewPayslip(payroll)}
                              title="View Payslip"
                            >
                              <i className="ri-file-text-line"></i>
                            </button>
                          </div>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>
                          <strong>Payroll Details - {payroll.employee?.firstName} {payroll.employee?.lastName}</strong>
                        </h4>
                        <button
                          className="submit-btn"
                          onClick={() => handleViewPayslip(payroll)}
                          onMouseEnter={() => setHoveredBtn(payroll.id)}
                          onMouseLeave={() => setHoveredBtn(null)}
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '13px', 
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            transform: hoveredBtn === payroll.id ? 'scale(1.03)' : 'scale(1)',
                            transition: 'transform 0.2s ease'
                          }}
                        >
                          <i className="ri-file-text-line"></i> View Full Payslip
                        </button>
                      </div>
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
                          <label>Base Salary ({formatRateType('monthly')})</label>
                          <input type="text" value={formatMoney(payroll.baseSalary)} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Total Allowances</label>
                          <input type="text" value={formatMoney(payroll.allowances)} readOnly />
                        </div>
                        <div className="form-group">
                          <label>Total Deductions</label>
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
                      <div className="form-row">
                        <div className="form-group">
                          <label>Benefits Breakdown</label>
                          <input 
                            type="text" 
                            value={`Rice: ${formatMoney(calculateEarnings(payroll.baseSalary, payroll.allowances).riceAllowance)}, Transport: ${formatMoney(calculateEarnings(payroll.baseSalary, payroll.allowances).transportationAllowance)}`} 
                            readOnly 
                          />
                        </div>
                        <div className="form-group">
                          <label>Deductions Breakdown</label>
                          <input 
                            type="text" 
                            value={`Tax: ${formatMoney(calculateDeductions(payroll.deductions).withholdingTax)}, SSS: ${formatMoney(calculateDeductions(payroll.deductions).sssContribution)}`} 
                            readOnly 
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
            {/* Download Button */}
            {batch.payrolls && batch.payrolls.length > 0 && (
              <button
                type="button"
                className="submit-btn"
                id='DownloadAllPayslipsBtn'
                onClick={handleDownloadAllPayslips}
                disabled={downloadingBatch}
              >
                <i className="ri-download-line"></i>
                {downloadingBatch ? 'Generating...' : 'Download All Payslips'}
              </button>
            )}

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

      {/* Payslip Modal */}
      {payslipModalOpen && selectedPayrollForPayslip && (
        <ViewPayslipModal
          isOpen={payslipModalOpen}
          onClose={() => {
            setPayslipModalOpen(false);
            setSelectedPayrollForPayslip(null);
          }}
          payroll={selectedPayrollForPayslip}
          batchPeriodStart={batch.period_start}
          batchPeriodEnd={batch.period_end}
        />
      )}
    </div>
  );
}
