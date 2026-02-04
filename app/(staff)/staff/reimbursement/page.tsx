"use client";
import React, { useState, useEffect } from "react";
import '../../../../styles/components/table.css';
import "../../../../styles/reimbursement/reimbursement.css";
import PaginationComponent from "../../../Components/pagination";
import Loading from '../../../Components/loading';
import ErrorDisplay from '../../../Components/errordisplay';
import { showSuccess, showError } from '../../../utils/Alerts';
import ViewReimbursement from '../../../(admin)/admin/reimbursement/viewReimbursement';
import { formatDateTime } from '../../../utils/formatting';

type ExpenseRecord = {
  expense_id: string;
  category: {
    category_id: string;
    name: string;
  };
  other_category?: string;
  total_amount: number;
  expense_date: string;
  assignment?: {
    assignment_id: string;
    bus_route: string;
    date_assigned: string;
    bus_plate_number: string;
    bus_type: string;
    driver_id: string;
    conductor_id: string;
    trip_fuel_expense: number;
  };
  other_source?: string;
  payment_method: {
    id: string;
    name: string;
  };
  reimbursements?: {
    reimbursement_id: string;
    expense_id: string;
    employee_id: string;
    employee_name: string;
    job_title?: string;
    amount: number;
    status: {
      id: string;
      name: string;
    };
    requested_date: string;
    approved_by?: string;
    approved_date?: string;
    rejection_reason?: string;
    paid_by?: string;
    paid_date?: string;
    payment_reference?: string;
    payment_method?: string;
    created_by: string;
    created_at: string;
    updated_by?: string;
    updated_at?: string;
    is_deleted: boolean;
    cancelled_by?: string;
    cancelled_date?: string;
  }[];
};

// REIMBURSEMENT TYPE
type ReimbursementData = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  job_title?: string;
  amount: number;
  status: string;
  requested_date: string;
  submitted_date: string;
  approved_by?: string | null;
  approved_date?: string | null;
  rejection_reason?: string | null;
  paid_by?: string | null;
  paid_date?: string | null;
  payment_reference?: string | null;
  payment_method?: string | null;
  created_by: string;
  created_at: string;
  updated_by?: string | null;
  updated_at?: string | null;
  is_deleted: boolean;
  cancelled_by?: string | null;
  cancelled_date?: string | null;
  remarks?: string | null;
  expense?: {
    expense_id: string;
    category: {
      category_id: string;
      name: string;
    };
    total_amount: number;
    expense_date: string;
    assignment_id?: string;
    payment_method: {
      id: string;
      name: string;
    };
  };
};

// Update ApiReimbursement to match Prisma schema structure
type ApiReimbursement = {
  reimbursement_id: string;
  expense_id: string;
  employee_id: string;
  employee_name: string;
  created_at: string;
  requested_date: string;
  approved_by: string | null;
  approved_date: string | null;
  status: {
    id: string;
    name: string;
  };
  amount: number | null;
  rejection_reason: string | null;
  paid_date: string | null;
  payment_reference: string | null;
  remarks?: string | null;
  cancelled_by?: string | null;
  cancelled_date?: string | null;
  updated_at?: string | null;
  expense?: ExpenseRecord;
};

const ReimbursementPage = () => {
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedReimbursement, setSelectedReimbursement] = useState<ReimbursementData | null>(null);
  const [reimbursements, setReimbursements] = useState<ReimbursementData[]>([]);

  // Fetch reimbursements
  const fetchReimbursements = async (
    setLoading: (b: boolean) => void,
    setReimbursements: (r: ReimbursementData[]) => void
  ) => {
    setLoading(true);
    try {
      // TODO: Replace with ftms_backend API call - http://localhost:4000/api/...
      // const res = await fetch('/api/reimbursements');
      // Mock response for now
      const res = {
        ok: true,
        status: 200,
        text: async () => JSON.stringify([
          {
            reimbursement_id: 'R001',
            expense_id: 'E001',
            employee_id: 'EMP001',
            employee_name: 'John Doe',
            created_at: '2024-01-01T00:00:00Z',
            requested_date: '2024-01-01T00:00:00Z',
            approved_by: null,
            approved_date: null,
            status: { name: 'PENDING' },
            amount: 1000,
            rejection_reason: null,
            paid_date: null,
            payment_reference: null,
            remarks: null,
            cancelled_by: null,
            cancelled_date: null,
            updated_at: '2024-01-01T00:00:00Z',
            expense: null
          }
        ])
      };

      console.log('API response status:', res.status);
      const text = await res.text();
      console.log('API response text:', text);
      if (!res.ok) throw new Error('Failed to fetch reimbursements');
      const data: ApiReimbursement[] = JSON.parse(text);
      console.log('Parsed API data:', data);
      setReimbursements(
        data.map((item) => {
          const statusName = item.status?.name || 'PENDING';
          console.log('Processing item:', item.reimbursement_id, 'Status:', statusName);
          
          const getUppercaseStatus = (status: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED' => {
            const upperStatus = status.toUpperCase();
            if (['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'].includes(upperStatus)) {
              return upperStatus as 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED';
            }
            return 'PENDING';
          };

          return {
            reimbursement_id: item.reimbursement_id,
            expense_id: item.expense_id,
            employee_id: item.employee_id,
            employee_name: item.employee_name,
            job_title: item.employee_name,
            created_at: item.created_at ? item.created_at : '',
            submitted_date: item.requested_date ? item.requested_date : '',
            requested_date: item.requested_date ? item.requested_date : '',
            approved_by: item.approved_by,
            approved_date: item.approved_date ? item.approved_date : null,
            status: getUppercaseStatus(statusName),
            amount: Number(item.amount) || 0,
            rejection_reason: item.rejection_reason,
            paid_date: item.paid_date ? item.paid_date : null,
            payment_reference: item.payment_reference,
            notes: '',
            remarks: item.remarks || null,
            cancelled_by: item.cancelled_by ?? null,
            cancelled_date: item.cancelled_date ? item.cancelled_date : null,
            updated_at: item.updated_at ? item.updated_at : null,
            expense: item.expense ? {
              ...item.expense,
              payment_method: {
                id: 'default',
                name: 'CASH'
              }
            } : undefined,
            created_by: 'ftms_user',
            is_deleted: false,
          };
        })
        .sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA;
        })
      );
    } catch {
      showError('Failed to fetch reimbursements', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements(setLoading, setReimbursements);
  }, []);

const filteredReimbursements = reimbursements.filter(reimbursement => {
  const searchLower = search.toLowerCase();
  const matchesEmployee = (reimbursement.employee_name ?? '').toLowerCase().includes(searchLower);
  const matchesSubmittedDate = reimbursement.submitted_date
    ? formatDateTime(reimbursement.submitted_date).toLowerCase().includes(searchLower)
    : false;
  
  // Finalized By / Finalized Date
  let finalizedBy = 'N/A';
  let finalizedDate = 'N/A';
  if (reimbursement.status === 'APPROVED' || reimbursement.status === 'REJECTED') {
    finalizedBy = reimbursement.approved_by || 'N/A';
    finalizedDate = reimbursement.approved_date ? formatDateTime(reimbursement.approved_date) : 'N/A';
  } else if (reimbursement.status === 'CANCELLED') {
    finalizedBy = reimbursement.cancelled_by || 'N/A';
    finalizedDate = reimbursement.cancelled_date ? formatDateTime(reimbursement.cancelled_date) : 'N/A';
  } else if (reimbursement.status === 'PAID') {
    finalizedBy = reimbursement.paid_date ? 'ftms_user' : 'N/A';
    finalizedDate = reimbursement.paid_date ? formatDateTime(reimbursement.paid_date) : 'N/A';
  }

  const matchesFinalized =
    (finalizedBy ?? '').toLowerCase().includes(searchLower) ||
    (finalizedDate ?? '').toLowerCase().includes(searchLower);
  const matchesStatusText = (reimbursement.status ?? '').toLowerCase().includes(searchLower);
    
  const matchesAmount = (reimbursement.amount ?? 0).toFixed(2).includes(search);
  const matchesPaidDate = reimbursement.paid_date
    ? formatDateTime(reimbursement.paid_date).toLowerCase().includes(searchLower)
    : false;

  const matchesSearch =
    search === "" ||
    matchesEmployee ||
    matchesSubmittedDate ||
    matchesFinalized ||
    matchesStatusText ||
    matchesAmount ||
    matchesPaidDate;

  const matchesStatus = statusFilter === "" || reimbursement.status === statusFilter.toUpperCase();

  let matchesDate = true;
  if (dateFilter === "Day") {
    matchesDate = reimbursement.submitted_date === today;
  } else if (dateFilter === "Month") {
    const [year, month] = today.split('-');
    matchesDate = reimbursement.submitted_date.startsWith(`${year}-${month}`);
  } else if (dateFilter === "Year") {
    const [year] = today.split('-');
    matchesDate = reimbursement.submitted_date.startsWith(year);
  } else if (dateFilter === "Custom") {
    matchesDate =
      (!dateFrom || reimbursement.submitted_date >= dateFrom) &&
      (!dateTo || reimbursement.submitted_date <= dateTo);
  }

  return matchesSearch && matchesStatus && matchesDate;
});

const totalPages = Math.ceil(filteredReimbursements.length / pageSize);
const currentRecords = filteredReimbursements.slice(
  (currentPage - 1) * pageSize,
  currentPage * pageSize
);

if (errorCode) {
  return (
    <div className="card">
      <h1 className="title">Reimbursement Requests</h1>
      <ErrorDisplay
        errorCode={errorCode}
        onRetry={() => {
          setLoading(true);
          setError(null);
          setErrorCode(null);
          fetchReimbursements(setLoading, setReimbursements);
        }}
      />
    </div>
  );
}


if (loading) {
  return (
    <div className="card">
      <h1 className="title">Reimbursement Requests</h1>
      <Loading />
    </div>
  );
}

return (
  <div className="card">
    <div className="elements">
      <h1 className="title">Reimbursement Requests</h1>
      <div className="settings">
        <div className="searchBar">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="Search reimbursements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filters">
          <div className="filterDate">
              {/* STATUS FILTER */}
              <div className="reimbursement-filter">
                  <label htmlFor="statusFilter">Status:</label>
                  <select
                      value={statusFilter}
                      id="statusFilter"
                      onChange={(e) => setStatusFilter(e.target.value)}
                  >
                      <option value="">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                  </select>
              </div>
              {/* DROPDOWN FILTER OF PERIODS */}
              <div className="reimbursement-filter">
                  <label htmlFor="dateFilter">Filter By:</label>
                  <select
                      value={dateFilter}
                      id="dateFilter"
                      onChange={(e) => {
                      setDateFilter(e.target.value);
                      if (e.target.value !== 'Custom') {
                          setDateFrom('');
                          setDateTo('');
                      }
                      }}
                  >
                      <option value="">All</option>
                      <option value="Day">Today</option>
                      <option value="Month">This Month</option>
                      <option value="Year">This Year</option>
                      <option value="Custom">Custom</option>
                  </select>
              </div>
              {dateFilter === "Custom" && (
                  <div className="dateRangePicker">
                      <div className="date">
                          <label htmlFor="startDate">Start Date:</label>
                          <input
                              type="date"
                              id="startDate"
                              name="startDate"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              max={today}
                          />
                      </div>
                      <div className="date">
                          <label htmlFor="endDate">End Date:</label>
                          <input
                              type="date"
                              id="endDate"
                              name="endDate"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                              max={today}
                          />
                      </div>
                  </div>
              )}
          </div>
        </div>
      </div>
      <div className="table-wrapper">
        <div className="tableContainer">
          <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Submitted Date</th>
                  <th>Finalized By / Finalized Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Paid Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.map((item) => {
                  // Compute finalized by/date based on status
                  let finalizedBy = 'N/A';
                  let finalizedDate = 'N/A';
                  if (item.status === 'APPROVED' || item.status === 'REJECTED') {
                    finalizedBy = item.approved_by || 'N/A';
                    finalizedDate = item.approved_date ? formatDateTime(item.approved_date) : 'N/A';
                  } else if (item.status === 'CANCELLED') {
                    finalizedBy = item.cancelled_by || 'N/A';
                    finalizedDate = item.cancelled_date ? formatDateTime(item.cancelled_date) : 'N/A';
                  } else if (item.status === 'PAID') {
                    finalizedBy = item.paid_date ? 'ftms_user' : 'N/A';
                    finalizedDate = item.paid_date ? formatDateTime(item.paid_date) : 'N/A';
                  }

                  return (
                    <tr key={item.reimbursement_id} onClick={() => {
                      setSelectedReimbursement(item);
                      setViewModalOpen(true);
                    }}>
                      <td>{item.employee_name}</td>
                      <td>{formatDateTime(item.submitted_date)}</td>
                      <td>{finalizedBy} | {finalizedDate}</td>
                      <td>
                        <span className={`status ${typeof item.status === 'string' ? item.status.toLowerCase() : ''}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>₱{(item.amount ?? 0).toFixed(2)}</td>
                      <td>
                        {item.status === 'PAID'
                          ? (item.paid_date ? formatDateTime(item.paid_date) : 'N/A')
                          : 'N/A'}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedReimbursement(item);
                            setViewModalOpen(true);
                          }}
                          className="action-btn view-btn"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
          </table>
          {currentRecords.length === 0 && <p className="noRecords">No reimbursements found.</p>}
        </div>
      </div>
      <PaginationComponent
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
    <ViewReimbursement
      isOpen={viewModalOpen}
      onClose={() => setViewModalOpen(false)}
      record={selectedReimbursement}
    />
  </div>
);
};

export default ReimbursementPage;
