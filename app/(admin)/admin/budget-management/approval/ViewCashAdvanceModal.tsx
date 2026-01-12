"use client";

import React from "react";
import "@/styles/components/forms.css";
import "@/styles/components/modal2.css";
import { formatDate, formatDateTime, formatMoney } from "@/utils/formatting";

export interface CashAdvanceRequest {
  request_id: string;
  employee_number: string;
  employee_name: string;
  contact_number: string | null;
  email: string | null;
  position: string;
  department: string;
  requested_amount: number;
  approved_amount: number | null;
  request_type: string;  // e.g. "Travel Advance", "Emergency"
  request_priority: string;  // e.g. "Regular", "Urgent"
  status: 'Pending' | 'Approved' | 'Rejected' | 'Disbursed';
  purpose: string;
  request_date: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason?: string;
  created_at: string;
  // Repayment fields
  repayment_method?: string;
  repayment_frequency?: string | null;
  number_of_repayment_periods?: number | null;
}

interface ViewCashAdvanceModalProps {
  request: CashAdvanceRequest;
  onClose: () => void;
}

export default function ViewCashAdvanceModal({ request, onClose }: ViewCashAdvanceModalProps) {
  // Format contact info - handle null/blank values
  const formatContactInfo = () => {
    const hasPhone = request.contact_number && request.contact_number.trim() !== '';
    const hasEmail = request.email && request.email.trim() !== '';

    if (hasPhone && hasEmail) {
      return (
        <>
          <div className="form-group">
            <label>Contact Number</label>
            <p>{request.contact_number}</p>
          </div>
          <div className="form-group">
            <label>Email</label>
            <p>{request.email}</p>
          </div>
        </>
      );
    } else if (hasPhone) {
      return (
        <div className="form-group">
          <label>Contact Number</label>
          <p>{request.contact_number}</p>
        </div>
      );
    } else if (hasEmail) {
      return (
        <div className="form-group">
          <label>Email</label>
          <p>{request.email}</p>
        </div>
      );
    } else {
      return (
        <div className="form-group">
          <label>Contact Info</label>
          <p>N/A</p>
        </div>
      );
    }
  };

  // Get status class for chip styling
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending': return 'pending';
      case 'Approved': return 'approved';
      case 'Rejected': return 'rejected';
      case 'Disbursed': return 'disbursed';
      default: return 'pending';
    }
  };

  // Get request type class for chip styling
  const getRequestTypeClass = (type: string) => {
    switch (type) {
      case 'Regular': return 'normal';
      case 'Urgent': return 'urgent';
      case 'Emergency': return 'rejected';
      default: return 'normal';
    }
  };

  return (
    <>
      <div className="modal-heading">
        <h1 className="modal-title">View Cash Advance Request</h1>
        <div className="modal-date-time">
          <p>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          <p>{new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
        </div>

        <button className="close-modal-btn view" onClick={onClose}>
          <i className="ri-close-line"></i>
        </button>
      </div>

      {/* Request Overview */}
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Request ID</label>
              <p>{request.request_id}</p>
            </div>

            <div className="form-group">
              <label>Request Date</label>
              <p>{formatDate(request.request_date)}</p>
            </div>

            <div className="form-group">
              <label>Status</label>
              <p className="chip-container">
                <span className={`chip ${getStatusClass(request.status)}`}>
                  {request.status}
                </span>
              </p>
            </div>

            <div className="form-group">
              <label>Request Type</label>
              <p className="chip-container">
                <span className={`chip ${getRequestTypeClass(request.request_type)}`}>
                  {request.request_type}
                </span>
              </p>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <p className="chip-container">
                <span className={`chip ${getRequestTypeClass(request.request_priority)}`}>
                  {request.request_priority}
                </span>
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* I. Employee Details */}
      <p className="details-title">I. Employee Details</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Employee Number</label>
              <p>{request.employee_number}</p>
            </div>

            <div className="form-group">
              <label>Employee Name</label>
              <p>{request.employee_name}</p>
            </div>

            <div className="form-group">
              <label>Position</label>
              <p>{request.position}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <p>{request.department}</p>
            </div>

            {formatContactInfo()}
          </div>
        </form>
      </div>

      {/* II. Amount Details */}
      <p className="details-title">II. Amount Details</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Requested Amount</label>
              <p>{formatMoney(request.requested_amount)}</p>
            </div>

            <div className="form-group">
              <label>Approved Amount</label>
              <p>{request.approved_amount !== null ? formatMoney(request.approved_amount) : 'Pending Approval'}</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Purpose</label>
              <p>{request.purpose}</p>
            </div>
          </div>
        </form>
      </div>

      {/* III. Repayment Details */}
      <p className="details-title">III. Repayment Details</p>
      <div className="modal-content view">
        <form className="view-form">
          <div className="form-row">
            <div className="form-group">
              <label>Repayment Method</label>
              <p>{request.repayment_method === 'DEDUCTION_FROM_NEXT_PAYROLL' ? 'Deduction from Next Payroll' : 
                  request.repayment_method === 'DEDUCTION_OVER_PERIODS' ? 'Deduction Over Periods' : 
                  request.repayment_method || 'N/A'}</p>
            </div>

            {request.repayment_method !== 'DEDUCTION_FROM_NEXT_PAYROLL' && (
              <>
                <div className="form-group">
                  <label>Repayment Frequency</label>
                  <p>{request.repayment_frequency || 'N/A'}</p>
                </div>

                <div className="form-group">
                  <label>Number of Periods</label>
                  <p>{request.number_of_repayment_periods ?? 'N/A'}</p>
                </div>
              </>
            )}
          </div>
        </form>
      </div>

      {/* IV. Review Details (only show if reviewed) */}
      {(request.reviewed_at || request.reviewed_by || request.rejection_reason) && (
        <>
          <p className="details-title">IV. Review Details</p>
          <div className="modal-content view">
            <form className="view-form">
              <div className="form-row">
                {request.reviewed_by && (
                  <div className="form-group">
                    <label>Reviewed By</label>
                    <p>{request.reviewed_by}</p>
                  </div>
                )}

                {request.reviewed_at && (
                  <div className="form-group">
                    <label>Reviewed At</label>
                    <p>{formatDateTime(request.reviewed_at)}</p>
                  </div>
                )}
              </div>

              {request.rejection_reason && (
                <div className="form-row">
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>Rejection Reason</label>
                    <p>{request.rejection_reason}</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </>
      )}

      {/* Modal Actions */}
      <div className="modal-actions">
        <button className="cancel-btn" onClick={onClose}>
          <i className="ri-close-line"></i>
          Close
        </button>
      </div>
    </>
  );
}
