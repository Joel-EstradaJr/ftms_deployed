'use client';

import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PayrollBatch, Payroll } from './types';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import { showConfirmation, showSuccess, showError } from '../../../../utils/Alerts';
import ViewPayslipModal from './viewPayslip';
import payrollService from '../../../../services/payrollService';
import '@/styles/components/modal2.css';
import '@/styles/components/forms.css';
import '@/styles/components/table.css';
import '@/styles/components/chips.css';
import '@/styles/payroll/payslip.css';

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
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  // Ref for batch print
  const batchPrintRef = useRef<HTMLDivElement>(null);

  // Batch print handler using react-to-print
  const handleBatchPrint = useReactToPrint({
    contentRef: batchPrintRef,
    documentTitle: `Payroll_${batch.payroll_period_code}_All_Payslips`,
    pageStyle: `
      @page {
        size: A4;
        margin: 8mm;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .batch-payslip-page {
          page-break-after: always;
          page-break-inside: avoid;
          height: 100%;
          overflow: hidden;
        }
        .batch-payslip-page:last-child {
          page-break-after: auto;
        }
        .payslipContainer {
          transform: scale(0.72);
          transform-origin: top center;
          background-color: #ffffff !important;
          padding: 10px !important;
          margin: 0 auto;
        }
        .companyHeader {
          margin-bottom: 8px !important;
          padding-bottom: 8px !important;
        }
        .payPeriodSection {
          padding: 6px 10px !important;
          margin-bottom: 8px !important;
        }
        .employeeInfoSection {
          padding: 8px !important;
          margin-bottom: 8px !important;
        }
        .employeeInfoGrid {
          gap: 4px !important;
        }
        .earningsDeductionsGrid {
          gap: 15px !important;
          margin-bottom: 8px !important;
        }
        .totalsSection {
          margin-top: 8px !important;
          padding: 8px !important;
        }
        .totalRow {
          padding: 4px 8px !important;
        }
        .netPayRow {
          background-color: #333333 !important;
          color: #ffffff !important;
          padding: 6px 8px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .attendanceSection {
          margin-top: 8px !important;
          padding: 8px !important;
        }
        .attendanceGrid {
          gap: 10px !important;
        }
        .companyLogo {
          max-height: 40px !important;
        }
        .companyName {
          font-size: 16px !important;
        }
        .sectionHeading {
          font-size: 11px !important;
          margin-bottom: 6px !important;
        }
        .payslipTable {
          font-size: 10px !important;
        }
        .payslipTableRow td {
          padding: 3px 6px !important;
        }
        .attendanceHeading {
          font-size: 11px !important;
          margin-bottom: 6px !important;
        }
        .attendanceValue {
          font-size: 16px !important;
        }
        .attendanceValuePresent { color: #4caf50 !important; }
        .attendanceValueAbsent { color: #f44336 !important; }
        .attendanceValueLate { color: #ff9800 !important; }
        .attendanceValueOvertime { color: #2196f3 !important; }
      }
    `,
  });

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

  // Render single payslip for batch print using actual HR data
  const renderPayslipForPrint = (payroll: Payroll) => {
    if (!payroll.employee) return null;

    // Get HR data from payroll
    const hrData = payroll.hrPayrollData;
    const employeeName = [
      payroll.employee.firstName,
      payroll.employee.middleName,
      payroll.employee.lastName
    ].filter(Boolean).join(' ') || payroll.employeeId;

    // Calculate values from HR data
    const basicRate = hrData ? parseFloat(hrData.basic_rate) || 0 : payroll.baseSalary;
    const presentDays = payroll.presentDays || 
      hrData?.attendances?.filter((a: any) => a.status === 'Present').length || 0;
    const basicPay = basicRate * presentDays;

    // Get actual benefits from HR data
    const benefits = (hrData?.benefits || [])
      .filter((b: any) => b.is_active)
      .map((b: any) => ({
        name: b.name || b.benefit_type?.name || 'Unknown Benefit',
        value: parseFloat(b.value) || 0,
      }));

    // Get actual deductions from HR data  
    const deductions = (hrData?.deductions || [])
      .filter((d: any) => d.is_active)
      .map((d: any) => ({
        name: d.name || d.deduction_type?.name || 'Unknown Deduction',
        value: parseFloat(d.value) || 0,
      }));

    const totalBenefits = benefits.reduce((sum: number, b: any) => sum + b.value, 0);
    const totalDeductions = deductions.reduce((sum: number, d: any) => sum + d.value, 0);
    const grossPay = basicPay + totalBenefits;
    const netPay = grossPay - totalDeductions;

    // Calculate attendance counts from HR data
    const attendanceCounts = {
      present: hrData?.attendances?.filter((a: any) => a.status === 'Present').length || 0,
      absent: hrData?.attendances?.filter((a: any) => a.status === 'Absent').length || 0,
    };

    const rateType = hrData?.rate_type || 'Weekly';

    return (
      <div key={payroll.id} className="batch-payslip-page">
        <div className="payslipContainer">
          {/* Company Header */}
          <div className="companyHeader">
            <div className="companyLogoContainer">
              <img
                src="/agilaLogo.png"
                alt="Agila Bus Transport Corp."
                className="companyLogo"
              />
              <h1 className="companyName">Agila Bus Transport Corp.</h1>
            </div>
            <p className="payslipReference">Payslip Reference: #{payroll.id}</p>
          </div>

          {/* Pay Period */}
          <div className="payPeriodSection">
            <div>
              <strong>Pay Period:</strong> {formatDate(batch.period_start)} - {formatDate(batch.period_end)}
            </div>
            <div>
              <strong>Pay Date:</strong> {payroll.disbursementDate ? formatDate(payroll.disbursementDate) : 'Pending'}
            </div>
          </div>

          {/* Employee Info */}
          <div className="employeeInfoSection">
            <div className="employeeInfoGrid">
              <div className="empDetails">
                <strong>Employee:</strong> {employeeName}
              </div>
              <div className="empDetails">
                <strong>ID:</strong> {payroll.employee.employeeNumber}
              </div>
              <div className="empDetails">
                <strong>Department:</strong> {payroll.employee.department || 'N/A'}
              </div>
              <div className="empDetails">
                <strong>Position:</strong> {payroll.employee.position || 'N/A'}
              </div>
              <div className="empDetails">
                <strong>Basic Rate:</strong> {formatMoney(basicRate)} ({rateType})
              </div>
              <div className="empDetails">
                <strong>Present Days:</strong> {presentDays}
              </div>
            </div>
          </div>

          {/* Earnings and Deductions */}
          <div className="earningsDeductionsGrid">
            <div>
              <h3 className="sectionHeading">EARNINGS</h3>
              <table className="payslipTable">
                <tbody>
                  <tr className="payslipTableRow">
                    <td className="payslipTableCell">Basic Pay ({presentDays} days × {formatMoney(basicRate)})</td>
                    <td className="payslipTableCellAmount">{formatMoney(basicPay)}</td>
                  </tr>
                  {benefits.map((benefit: any, index: number) => (
                    <tr key={`benefit-${index}`} className="payslipTableRow">
                      <td className="payslipTableCell">{benefit.name}</td>
                      <td className="payslipTableCellAmount">{formatMoney(benefit.value)}</td>
                    </tr>
                  ))}
                  {benefits.length === 0 && (
                    <tr className="payslipTableRow">
                      <td className="payslipTableCell" style={{ color: '#999', fontStyle: 'italic' }}>No additional benefits</td>
                      <td className="payslipTableCellAmount">₱ 0.00</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="sectionHeading">DEDUCTIONS</h3>
              <table className="payslipTable">
                <tbody>
                  {deductions.map((deduction: any, index: number) => (
                    <tr key={`deduction-${index}`} className="payslipTableRow">
                      <td className="payslipTableCell">{deduction.name}</td>
                      <td className="payslipTableCellAmount">{formatMoney(deduction.value)}</td>
                    </tr>
                  ))}
                  {deductions.length === 0 && (
                    <tr className="payslipTableRow">
                      <td className="payslipTableCell" style={{ color: '#999', fontStyle: 'italic' }}>No deductions</td>
                      <td className="payslipTableCellAmount">₱ 0.00</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="totalsSection">
            <div className="totalRow">
              <span><strong>Total Gross Pay:</strong></span>
              <span>{formatMoney(grossPay)}</span>
            </div>
            <div className="totalRow">
              <span><strong>Total Deductions:</strong></span>
              <span>({formatMoney(totalDeductions)})</span>
            </div>
            <div className="netPayRow">
              <span>NET PAY:</span>
              <span>{formatMoney(netPay)}</span>
            </div>
          </div>

          {/* Attendance */}
          <div className="attendanceSection">
            <h3 className="attendanceHeading">Attendance Summary</h3>
            <div className="attendanceGrid">
              <div>
                <strong>Present Count:</strong>
                <div className="attendanceValue attendanceValuePresent">{attendanceCounts.present}</div>
              </div>
              <div>
                <strong>Absent Count:</strong>
                <div className="attendanceValue attendanceValueAbsent">{attendanceCounts.absent}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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

            {/* Disbursement Action
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
            )} */}

            {/* Payroll Records Table */}
            <div className="tableContainer">
              <table className="data-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Base Salary</th>
                    <th>Present Days</th>
                    <th>Total Benefits</th>
                    <th>Total Deductions</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.payrolls && batch.payrolls.length > 0 ? (
                    batch.payrolls.map(payroll => {
                      const presentDays = payroll.presentDays || 0;
                      const hasAttendance = presentDays > 0;

                      return (
                        <tr key={payroll.id} style={{ backgroundColor: !hasAttendance ? '#fff3cd' : undefined }}>
                          {/* {undisbursedCount > 0 && onDisburse && (
                            <td>
                              {!payroll.isDisbursed && hasAttendance && (
                                <input
                                  type="checkbox"
                                  checked={selectedPayrolls.includes(payroll.id)}
                                  onChange={(e) => handleSelectPayroll(payroll.id, e.target.checked)}
                                />
                              )}
                            </td>
                          )} */}
                          <td>
                            <div style={{ fontWeight: 500 }}>
                              {/* Full name: firstName + middleName + lastName */}
                              {[
                                payroll.employee?.firstName,
                                payroll.employee?.middleName,
                                payroll.employee?.lastName
                              ].filter(Boolean).join(' ') || payroll.employeeId}
                              {!hasAttendance && (
                                <span style={{
                                  marginLeft: '8px',
                                  fontSize: '10px',
                                  color: '#856404',
                                  backgroundColor: '#fff3cd',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  border: '1px solid #ffeaa7'
                                }}>
                                  NO ATTENDANCE
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--secondary-text-color)' }}>
                              {payroll.employee?.employeeNumber || payroll.employeeId}
                            </div>
                          </td>
                          <td>{formatMoney(payroll.baseSalary)}</td>
                          <td>
                            <strong style={{ color: hasAttendance ? 'var(--success-color)' : 'var(--warning-color)' }}>
                              {presentDays}
                            </strong>
                          </td>
                          <td>{formatMoney(payroll.allowances)}</td>
                          <td>{formatMoney(payroll.deductions)}</td>
                          <td style={{ fontWeight: 600, color: hasAttendance ? 'var(--primary-color)' : 'var(--warning-color)' }}>
                            {formatMoney(payroll.netPay)}
                          </td>
                          <td>
                            {payroll.isDisbursed ? (
                              <span className="chip paid">Disbursed</span>
                            ) : (
                              <span className="chip pending">Pending</span>
                            )}
                          </td>
                          <td className="actionButtons">
                            <div className="actionButtonsContainer">
                              {/* <button
                                className="viewBtn"
                                onClick={() => setExpandedDetails(
                                  expandedDetails === payroll.id ? null : payroll.id
                                )}
                                title="View Details"
                              >
                                <i className={`ri-arrow-${expandedDetails === payroll.id ? 'up' : 'down'}-s-line`}></i>
                              </button> */}
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
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={undisbursedCount > 0 && onDisburse ? 9 : 8} style={{ textAlign: 'center', padding: '20px' }}>
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
                          <label>Base Salary ({payroll.hrPayrollData?.rate_type || 'Weekly'})</label>
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
                            value={payroll.hrPayrollData?.benefits?.filter((b: any) => b.is_active).map((b: any) => `${b.name || b.benefit_type?.name}: ${formatMoney(parseFloat(b.value))}`).join(', ') || 'No benefits'}
                            readOnly
                          />
                        </div>
                        <div className="form-group">
                          <label>Deductions Breakdown</label>
                          <input
                            type="text"
                            value={payroll.hrPayrollData?.deductions?.filter((d: any) => d.is_active).map((d: any) => `${d.name || d.deduction_type?.name}: ${formatMoney(parseFloat(d.value))}`).join(', ') || 'No deductions'}
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
                onClick={() => handleBatchPrint()}
              >
                <i className="ri-printer-line"></i>
                Print All Payslips
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

      {/* Hidden container for batch print */}
      <div style={{ display: 'none' }}>
        <div ref={batchPrintRef}>
          {batch.payrolls?.map(payroll => renderPayslipForPrint(payroll))}
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
