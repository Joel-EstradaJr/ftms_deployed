"use client";
import React, { useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import Modal from '@/Components/modal2';
import { Payroll } from './types';
import { HrPayrollData } from '@/app/services/payrollService';
import { formatDate, formatMoney } from '../../../../utils/formatting';
import '@/styles/components/modal2.css';
import '@/styles/components/forms.css';
import '@/styles/components/table.css';
import '@/styles/payroll/payslip.css';

interface ViewPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: Payroll | null;
  batchPeriodStart: string;
  batchPeriodEnd: string;
}

/**
 * Format rate type for display
 */
function formatRateType(rateType: string): string {
  switch (rateType?.toLowerCase()) {
    case 'monthly': return 'Monthly';
    case 'weekly': return 'Weekly';
    case 'daily': return 'Daily';
    case 'semi-monthly': return 'Semi-Monthly';
    default: return rateType || 'Weekly';
  }
}

/**
 * Get employee name from employee object
 */
function getEmployeeName(employee: any): string {
  if (!employee) return 'Unknown Employee';
  
  const parts = [
    employee.firstName,
    employee.middleName,
    employee.lastName,
    employee.suffix
  ].filter(Boolean);
  
  return parts.join(' ') || employee.employeeNumber || 'Unknown Employee';
}

const ViewPayslipModal: React.FC<ViewPayslipModalProps> = ({
  isOpen,
  onClose,
  payroll,
  batchPeriodStart,
  batchPeriodEnd,
}) => {
  const payslipRef = useRef<HTMLDivElement>(null);

  // Get HR data from payroll
  const hrData: HrPayrollData | null = payroll?.hrPayrollData || null;
  const employee = payroll?.employee;
  const employeeName = employee ? getEmployeeName(employee) : '';

  // Calculate actual values from HR data
  const calculations = useMemo(() => {
    if (!hrData || !payroll) {
      return {
        basicRate: 0,
        presentDays: 0,
        basicPay: 0,
        benefits: [] as { name: string; value: number }[],
        deductions: [] as { name: string; value: number }[],
        totalBenefits: 0,
        totalDeductions: 0,
        grossPay: 0,
        netPay: 0,
        attendances: { present: 0, absent: 0 },
      };
    }

    const basicRate = parseFloat(hrData.basic_rate) || 0;
    const presentDays = hrData.present_days || 
      hrData.attendances?.filter(a => a.status === 'Present').length || 0;
    const basicPay = basicRate * presentDays;

    // Get actual benefits from HR data
    const benefits = (hrData.benefits || [])
      .filter(b => b.is_active)
      .map(b => ({
        name: b.name || b.benefit_type?.name || 'Unknown Benefit',
        value: parseFloat(b.value) || 0,
      }));

    // Get actual deductions from HR data
    const deductions = (hrData.deductions || [])
      .filter(d => d.is_active)
      .map(d => ({
        name: d.name || d.deduction_type?.name || 'Unknown Deduction',
        value: parseFloat(d.value) || 0,
      }));

    const totalBenefits = benefits.reduce((sum, b) => sum + b.value, 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.value, 0);
    const grossPay = basicPay + totalBenefits;
    const netPay = grossPay - totalDeductions;

    // Calculate attendance counts
    const attendances = {
      present: hrData.attendances?.filter(a => a.status === 'Present').length || 0,
      absent: hrData.attendances?.filter(a => a.status === 'Absent').length || 0,
    };

    return {
      basicRate,
      presentDays,
      basicPay,
      benefits,
      deductions,
      totalBenefits,
      totalDeductions,
      grossPay,
      netPay,
      attendances,
    };
  }, [hrData, payroll]);

  // Use react-to-print hook
  const handlePrint = useReactToPrint({
    contentRef: payslipRef,
    documentTitle: payroll ? `Payslip_${employee?.employeeNumber}_${formatDate(batchPeriodStart)}_${formatDate(batchPeriodEnd)}` : 'Payslip',
    pageStyle: `
      @page {
        size: A4;
        margin: 8mm;
      }
      @media print {
        html, body {
          height: 100%;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .payslipContainer {
          background-color: #ffffff !important;
          padding: 10px !important;
          margin: 0 !important;
          page-break-inside: avoid !important;
          transform: scale(0.85);
          transform-origin: top center;
        }
        .companyHeader {
          margin-bottom: 10px !important;
          padding-bottom: 8px !important;
        }
        .companyLogo {
          max-height: 50px !important;
        }
        .companyName {
          font-size: 18px !important;
        }
        .payPeriodSection {
          margin-bottom: 10px !important;
          padding: 6px 10px !important;
          font-size: 11px !important;
        }
        .employeeInfoSection {
          padding: 8px !important;
          margin-bottom: 10px !important;
        }
        .empDetails {
          padding: 4px 8px !important;
          font-size: 11px !important;
        }
        .earningsDeductionsGrid {
          margin-bottom: 10px !important;
        }
        .sectionHeading {
          font-size: 12px !important;
          margin-bottom: 6px !important;
          padding-bottom: 3px !important;
        }
        .payslipTable {
          font-size: 10px !important;
        }
        .payslipTableRow td {
          padding: 4px 2px !important;
        }
        .totalsSection {
          padding: 8px !important;
          margin-bottom: 10px !important;
        }
        .totalRow {
          font-size: 12px !important;
          margin-bottom: 4px !important;
        }
        .netPayRow {
          background-color: var(--primary-color) !important;
          color: #ffffff !important;
          padding: 8px 10px !important;
          font-size: 14px !important;
          margin-top: 8px !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .attendanceSection {
          padding: 8px !important;
          margin-bottom: 0 !important;
        }
        .attendanceHeading {
          font-size: 12px !important;
          margin-bottom: 8px !important;
        }
        .attendanceGrid > div {
          padding: 6px !important;
          font-size: 10px !important;
        }
        .attendanceValue {
          font-size: 16px !important;
        }
        .attendanceValuePresent { color: #4caf50 !important; }
        .attendanceValueAbsent { color: #f44336 !important; }
      }
    `,
  });

  if (!payroll || !payroll.employee) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-heading view">
        <h2 className="modal-title">Employee Payslip</h2>
        <button className="close-modal-btn view" onClick={onClose}>
          ✕
        </button>
      </div>

      <div ref={payslipRef} className="payslipContainer">
        {/* Company Header with Logo */}
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

        {/* Pay Period and Date */}
        <div className="payPeriodSection">
          <div>
            <strong>Pay Period:</strong> {formatDate(batchPeriodStart)} - {formatDate(batchPeriodEnd)}
          </div>
          <div>
            <strong>Pay Date:</strong> {payroll.disbursementDate ? formatDate(payroll.disbursementDate) : 'Pending'}
          </div>
        </div>

        {/* Employee Information */}
        <div className="employeeInfoSection">
          <div className="employeeInfoGrid">
            <div className="empDetails">
              <strong>Employee:</strong> {employeeName}
            </div>
            <div className="empDetails">
              <strong>Employee Number:</strong> {employee?.employeeNumber}
            </div>
            <div className="empDetails">
              <strong>Department:</strong> {employee?.department || 'N/A'}
            </div>
            <div className="empDetails">
              <strong>Position:</strong> {employee?.position || 'N/A'}
            </div>
            <div className="empDetails">
              <strong>Basic Rate:</strong> {formatMoney(calculations.basicRate)} ({formatRateType(hrData?.rate_type || '')})
            </div>
            <div className="empDetails">
              <strong>Present Days:</strong> {calculations.presentDays}
            </div>
          </div>
        </div>

        {/* Earnings and Deductions Tables */}
        <div className="earningsDeductionsGrid">
          {/* Earnings Table */}
          <div>
            <h3 className="sectionHeading">
              EARNINGS
            </h3>
            <table className="payslipTable">
              <tbody>
                {/* Basic Pay */}
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">
                    Basic Pay ({calculations.presentDays} days × {formatMoney(calculations.basicRate)})
                  </td>
                  <td className="payslipTableCellAmount">{formatMoney(calculations.basicPay)}</td>
                </tr>
                
                {/* Benefits from HR data */}
                {calculations.benefits.length > 0 ? (
                  calculations.benefits.map((benefit, index) => (
                    <tr key={`benefit-${index}`} className="payslipTableRow">
                      <td className="payslipTableCell">{benefit.name}</td>
                      <td className="payslipTableCellAmount">{formatMoney(benefit.value)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="payslipTableRow">
                    <td className="payslipTableCell" style={{ color: '#999', fontStyle: 'italic' }}>
                      No additional benefits
                    </td>
                    <td className="payslipTableCellAmount">₱ 0.00</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Deductions Table */}
          <div>
            <h3 className="sectionHeading">
              DEDUCTIONS
            </h3>
            <table className="payslipTable">
              <tbody>
                {calculations.deductions.length > 0 ? (
                  calculations.deductions.map((deduction, index) => (
                    <tr key={`deduction-${index}`} className="payslipTableRow">
                      <td className="payslipTableCell">{deduction.name}</td>
                      <td className="payslipTableCellAmount">{formatMoney(deduction.value)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="payslipTableRow">
                    <td className="payslipTableCell" style={{ color: '#999', fontStyle: 'italic' }}>
                      No deductions
                    </td>
                    <td className="payslipTableCellAmount">₱ 0.00</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="totalsSection">
          <div className="totalRow">
            <span><strong>Total Gross Pay:</strong></span>
            <span>{formatMoney(calculations.grossPay)}</span>
          </div>
          <div className="totalRow">
            <span><strong>Total Deductions:</strong></span>
            <span>({formatMoney(calculations.totalDeductions)})</span>
          </div>
          <div className="netPayRow">
            <span>NET PAY:</span>
            <span>{formatMoney(calculations.netPay)}</span>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="attendanceSection">
          <h3 className="attendanceHeading">
            Attendance Summary
          </h3>
          <div className="attendanceGrid">
            <div>
              <strong>Present Count:</strong>
              <div className="attendanceValue attendanceValuePresent">{calculations.attendances.present}</div>
            </div>
            <div>
              <strong>Absent Count:</strong>
              <div className="attendanceValue attendanceValueAbsent">{calculations.attendances.absent}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          Close
        </button>
        <button className="submit-btn download-payslip-btn" onClick={() => handlePrint()}>
          <i className="ri-print-line"></i> Print / Save as PDF
        </button>
      </div>
    </Modal>
  );
};

export default ViewPayslipModal;
