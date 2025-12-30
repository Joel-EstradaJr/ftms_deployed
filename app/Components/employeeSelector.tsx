"use client";
import React, { useState } from "react";
import "../styles/components/employeeSelector.css";

export interface Employee {
  employee_id: string;
  employee_name: string;
  job: string;
  department: string;
}

interface EmployeeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (employee: Employee) => void;
  employees: Employee[];
}

const EmployeeSelectorModal: React.FC<EmployeeSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  employees,
}) => {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const filtered = employees.filter(
    (emp) =>
      (emp.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(search.toLowerCase()) ||
        emp.job.toLowerCase().includes(search.toLowerCase())) &&
      (filterDept === "" || emp.department === filterDept)
  );

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()} style={{maxWidth: 600, width: "95%"}}>
        <div className="modalHeader">
          <h2>Select Employee</h2>
          <button className="closeButton" onClick={onClose}>
            <i className="ri-close-line"></i>
          </button>
        </div>
        <div className="modalBody">
          <div style={{display: "flex", gap: 8, marginBottom: 12}}>
            <input
              type="text"
              placeholder="Search by name, ID, or job"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{flex: 1, padding: "0.5rem"}}
            />
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{padding: "0.5rem"}}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div style={{maxHeight: 300, overflowY: "auto"}}>
            <table style={{width: "100%", borderCollapse: "collapse"}}>
              <thead>
                <tr>
                  <th style={{textAlign: "left", padding: 8}}>Employee Name</th>
                  <th style={{textAlign: "left", padding: 8}}>Job</th>
                  <th style={{textAlign: "left", padding: 8}}>Department</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr
                    key={emp.employee_id}
                    style={{cursor: "pointer"}}
                    onClick={() => { onSelect(emp); onClose(); }}
                  >
                    <td style={{padding: 8}}>{emp.employee_name}</td>
                    <td style={{padding: 8}}>{emp.job}</td>
                    <td style={{padding: 8}}>{emp.department}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{textAlign: "center", padding: 16, color: "#888"}}>
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modalFooter">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSelectorModal;