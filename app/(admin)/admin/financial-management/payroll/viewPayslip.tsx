"use client";
import React, { useRef } from 'react';
import Modal from '@/Components/modal2';
import domtoimage from 'dom-to-image-more';
import jsPDF from 'jspdf';
import Image from 'next/image';
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

  if (!payroll || !payroll.employee) return null;

  // Calculate breakdowns
  const rateType: RateType = 'monthly'; // Default to monthly, in production get from employee data
  const earnings = calculateEarnings(payroll.baseSalary, payroll.allowances, rateType);
  const deductions = calculateDeductions(payroll.deductions);
  const attendance = generateAttendanceData(payroll.isDisbursed);
  const grossPay = calculateGrossPay(earnings);
  const totalDeductions = calculateTotalDeductions(deductions);

  const employee = payroll.employee;
  const employeeName = getEmployeeName(employee);

  // Download payslip as PDF
  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;

    const downloadBtn = document.querySelector('.download-payslip-btn') as HTMLButtonElement;
    
    try {
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Generating PDF...';
      }

      // Get the element's actual dimensions
      const element = payslipRef.current;
      const originalWidth = element.offsetWidth;
      const originalHeight = element.offsetHeight;

      // Use dom-to-image-more with proper dimensions
      const dataUrl = await domtoimage.toPng(element, {
        quality: 1,
        bgcolor: '#ffffff',
        width: originalWidth * 2,
        height: originalHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left',
          width: `${originalWidth}px`,
          height: `${originalHeight}px`,
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Create image to get dimensions
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // A4 dimensions with margins
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      
      // Calculate image height maintaining aspect ratio
      const imgHeight = (img.height * contentWidth) / img.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      const filename = `Payslip_${employee.employeeNumber}_${formatDate(batchPeriodStart)}_${formatDate(batchPeriodEnd)}.pdf`;
      pdf.save(filename);

      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="ri-download-line"></i> Download PDF';
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="ri-download-line"></i> Download PDF';
      }
      
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
              src="/images/agila-logo.png" 
              alt="Agila Bus Transport Corp." 
              className="companyLogo"
            />
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
              <strong>ID:</strong> {employee.employeeNumber}
            </div>
            <div className="empDetails">
              <strong>Department:</strong> {employee.department || 'N/A'}
            </div>
            <div className="empDetails">
              <strong>Position:</strong> {employee.position || 'N/A'}
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
        <button className="submit-btn download-payslip-btn" onClick={handleDownloadPDF}>
          <i className="ri-download-line"></i> Download PDF
        </button>
      </div>
    </Modal>
  );
};

export default ViewPayslipModal;
