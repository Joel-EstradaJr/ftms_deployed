"use client";
import React, { useRef } from 'react';
import Modal from '@/Components/modal2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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

    try {
      // Show loading state
      const downloadBtn = document.querySelector('.download-payslip-btn') as HTMLButtonElement;
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Generating PDF...';
      }

      // Capture the payslip content as canvas
      const canvas = await html2canvas(payslipRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // Convert canvas to PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Generate filename
      const filename = `Payslip_${employee.employeeNumber}_${formatDate(batchPeriodStart)}_${formatDate(batchPeriodEnd)}.pdf`;
      pdf.save(filename);

      // Reset button state
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<i class="ri-download-line"></i> Download PDF';
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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

      <div ref={payslipRef} style={{ padding: '20px', backgroundColor: '#ffffff' }}>
        {/* Company Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          borderBottom: '2px solid #333',
          paddingBottom: '15px',
        }}>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>ACME Solutions Inc.</h1>
          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>Payslip Reference: #{payroll.id}</p>
        </div>

        {/* Pay Period and Date */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          <div>
            <strong>Pay Period:</strong> {formatDate(batchPeriodStart)} - {formatDate(batchPeriodEnd)}
          </div>
          <div>
            <strong>Pay Date:</strong> {payroll.disbursementDate ? formatDate(payroll.disbursementDate) : 'Pending'}
          </div>
        </div>

        {/* Employee Information */}
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
            <div>
              <strong>Employee:</strong> {employeeName}
            </div>
            <div>
              <strong>ID:</strong> {employee.employeeNumber}
            </div>
            <div>
              <strong>Department:</strong> {employee.department || 'N/A'}
            </div>
            <div>
              <strong>Position:</strong> {employee.position || 'N/A'}
            </div>
            <div>
              <strong>Basic Rate:</strong> {formatMoney(payroll.baseSalary)}
            </div>
            <div>
              <strong>Rate Type:</strong> {formatRateType(rateType)}
            </div>
          </div>
        </div>

        {/* Earnings and Deductions Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Earnings Table */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
              EARNINGS
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Basic Pay ({formatRateType(rateType)})</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(earnings.basicPay)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Overtime Pay ({attendance.overtimeHours} hrs @ 125%)</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(earnings.overtimePay)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Rice Allowance</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(earnings.riceAllowance)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Transportation Allowance</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(earnings.transportationAllowance)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Other Allowances</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(earnings.otherAllowances)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions Table */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
              DEDUCTIONS
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Withholding Tax</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(deductions.withholdingTax)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Social Security Contribution</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(deductions.sssContribution)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>PhilHealth Contribution</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(deductions.philhealthContribution)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Pag-IBIG Contribution</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(deductions.pagibigContribution)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '8px 4px' }}>Other Deductions</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatMoney(deductions.otherDeductions)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div style={{
          backgroundColor: '#f9f9f9',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
            <span><strong>Total Gross Pay:</strong></span>
            <span>{formatMoney(grossPay)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
            <span><strong>Total Deductions:</strong></span>
            <span>({formatMoney(totalDeductions)})</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px',
            backgroundColor: '#333',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            <span>NET PAY:</span>
            <span>{formatMoney(payroll.netPay)}</span>
          </div>
        </div>

        {/* Attendance Summary */}
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '10px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
            Attendance Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', fontSize: '13px' }}>
            <div>
              <strong>Present Count:</strong>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4caf50' }}>{attendance.presentCount}</div>
            </div>
            <div>
              <strong>Absent Count:</strong>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f44336' }}>{attendance.absentCount}</div>
            </div>
            <div>
              <strong>Late Count:</strong>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800' }}>{attendance.lateCount}</div>
            </div>
            <div>
              <strong>Total Overtime Hours:</strong>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2196f3' }}>{attendance.overtimeHours}</div>
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
