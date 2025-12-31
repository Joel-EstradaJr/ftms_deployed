"use client";
import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Modal from '@/Components/modal2';
import { Payroll } from './types';
import {
  calculateEarnings,
  calculateDeductions,
  generateAttendanceData,
  calculateGrossPay,
  calculateTotalDeductions,
  formatRateType,
  getEmployeeName,
  RateType,
} from '@/utils/payrollCalculations';
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

const ViewPayslipModal: React.FC<ViewPayslipModalProps> = ({
  isOpen,
  onClose,
  payroll,
  batchPeriodStart,
  batchPeriodEnd,
}) => {
  const payslipRef = useRef<HTMLDivElement>(null);

  // Calculate breakdowns (moved before hooks to avoid conditional hook issues)
  const rateType: RateType = 'monthly';
  const employee = payroll?.employee;
  const employeeName = employee ? getEmployeeName(employee) : '';

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
          background-color: #333333 !important;
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
        .attendanceValueLate { color: #ff9800 !important; }
        .attendanceValueOvertime { color: #2196f3 !important; }
      }
    `,
  });

  if (!payroll || !payroll.employee) return null;

  const earnings = calculateEarnings(payroll.baseSalary, payroll.allowances, rateType);
  const deductions = calculateDeductions(payroll.deductions);
  const attendance = generateAttendanceData(payroll.isDisbursed);
  const grossPay = calculateGrossPay(earnings);
  const totalDeductions = calculateTotalDeductions(deductions);

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
              <strong>ID:</strong> {employee?.employeeNumber}
            </div>
            <div className="empDetails">
              <strong>Department:</strong> {employee?.department || 'N/A'}
            </div>
            <div className="empDetails">
              <strong>Position:</strong> {employee?.position || 'N/A'}
            </div>
            <div className="empDetails">
              <strong>Basic Rate:</strong> {formatMoney(payroll.baseSalary)}
            </div>
            <div className="empDetails">
              <strong>Rate Type:</strong> {formatRateType(rateType)}
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
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Basic Pay ({formatRateType(rateType)})</td>
                  <td className="payslipTableCellAmount">{formatMoney(earnings.basicPay)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Overtime Pay ({attendance.overtimeHours} hrs @ 125%)</td>
                  <td className="payslipTableCellAmount">{formatMoney(earnings.overtimePay)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Rice Allowance</td>
                  <td className="payslipTableCellAmount">{formatMoney(earnings.riceAllowance)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Transportation Allowance</td>
                  <td className="payslipTableCellAmount">{formatMoney(earnings.transportationAllowance)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Other Allowances</td>
                  <td className="payslipTableCellAmount">{formatMoney(earnings.otherAllowances)}</td>
                </tr>
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
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Withholding Tax</td>
                  <td className="payslipTableCellAmount">{formatMoney(deductions.withholdingTax)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Social Security Contribution</td>
                  <td className="payslipTableCellAmount">{formatMoney(deductions.sssContribution)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">PhilHealth Contribution</td>
                  <td className="payslipTableCellAmount">{formatMoney(deductions.philhealthContribution)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Pag-IBIG Contribution</td>
                  <td className="payslipTableCellAmount">{formatMoney(deductions.pagibigContribution)}</td>
                </tr>
                <tr className="payslipTableRow">
                  <td className="payslipTableCell">Other Deductions</td>
                  <td className="payslipTableCellAmount">{formatMoney(deductions.otherDeductions)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
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
            <span>{formatMoney(payroll.netPay)}</span>
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
              <div className="attendanceValue attendanceValuePresent">{attendance.presentCount}</div>
            </div>
            <div>
              <strong>Absent Count:</strong>
              <div className="attendanceValue attendanceValueAbsent">{attendance.absentCount}</div>
            </div>
            <div>
              <strong>Late Count:</strong>
              <div className="attendanceValue attendanceValueLate">{attendance.lateCount}</div>
            </div>
            <div>
              <strong>Total Overtime Hours:</strong>
              <div className="attendanceValue attendanceValueOvertime">{attendance.overtimeHours}</div>
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
