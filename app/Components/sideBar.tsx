"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useNavigationUrl } from '../hooks/useRouteContext';
// @ts-ignore
import "../styles/components/sidebar.css";

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const { getUrl } = useNavigationUrl();

  // Audit link (static, no longer using microservices)
  const auditHref = getUrl('/audit');
  const auditActiveKey = 'audit';
  const auditIconClass = 'ri-booklet-line';

  // Detect user role from pathname
  const userRole = pathname.startsWith('/admin') ? 'admin' : 'staff';

  const staticRoutes: { [key: string]: string } = {
    "/dashboard": "dashboard",
    "/revenue": "revenue",
    "/revenue/tripRevenue": "tripRevenue",
    "/revenue/busRental": "busRental",
    "/revenue/otherRevenue": "otherRevenue",
    "/expense": "expense",
    "/expense-management/operational": "operational-expense",
    "/expense-management/administrative": "administrative-expense",
    "/expense-management/purchase": "purchase-expense",
    "/reimbursement": "reimbursement",
    "/financial-management/payroll": "payroll",
    "/loan-management/loanRequest": "loan-request",
    "/loan-management/loanPayment": "loan-payment",
    "/report": "report",
    "/audit": "audit",
    "/budget-management/budgetAllocation": "budgetAllocation",
    "/budget-management/approval": "approval",
    "/budget-management/budgetRequest": "budget-request",
    "/jev/chart-of-accounts": "chart-of-accounts",
    "/jev/journal-entries": "journal-entries",
    "/records-reports/JEV": "JEV-records",
    "/asset-management": "asset-management",
    "/admin/disposal-approval": "disposal-approval",
  };

  // Function to normalize pathname for comparison (remove role prefix)
  const getNormalizedPath = (path: string): string => {
    if (path.startsWith('/admin')) return path.replace('/admin', '');
    if (path.startsWith('/staff')) return path.replace('/staff', '');
    return path;
  };

  useEffect(() => {
    const normalizedPath = getNormalizedPath(pathname);
    
      const staticMatch = staticRoutes[normalizedPath];
    if (staticMatch) {
      setActiveItem(staticMatch);
      
      if (["expense", "reimbursement", "operational-expense", "administrative-expense", "purchase-expense"].includes(staticMatch)) {
        setOpenSubMenu("expense-management");
      } else if (["budget-request", "budgetAllocation", "approval"].includes(staticMatch)) {
        setOpenSubMenu("budget-management");
      } else if (["purchase-request", "purchaseApproval"].includes(staticMatch)) {
        setOpenSubMenu("purchase-management");
      } else if (["loan-request", "loan-payment"].includes(staticMatch)) {
        setOpenSubMenu("loan-management");
      } else if (["chart-of-accounts", "journal-entries"].includes(staticMatch)) {
        setOpenSubMenu("jev-management");
      } else if (["JEV-records", "asset-management", "disposal-approval"].includes(staticMatch)) {
        setOpenSubMenu("records-reports");
      } else if (["tripRevenue", "busRental", "otherRevenue"].includes(staticMatch)) {
        setOpenSubMenu("revenue-management");
      }
      return;
    }

    if (pathname.startsWith('/microservice/budget-request-management')) {
      setActiveItem('budget-request');
      setOpenSubMenu("budget-management");
      return;
    }

    if (pathname.startsWith('/microservice/purchase-request')) {
      setActiveItem('purchase-request');
      setOpenSubMenu("purchase-management");
      return;
    }

    setActiveItem(null);
  }, [pathname]);

  const toggleSubMenu = (id: string) => {
    setOpenSubMenu((prev) => (prev === id ? null : id));
  };

  return (
    <div className="sidebar shadow-lg" id="sidebar">
      <div className="sidebar-content">
        <div className="logo-img">
          <Image src="/agilaLogo.png" alt="logo" width={150} height={50} priority />
        </div>

        <div className="nav-links">
          {/* Dashboard - Both roles */}
          <Link
            href={getUrl("/dashboard")}
            className={`nav-item ${activeItem === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveItem("dashboard")}
          >
            <i className="ri-dashboard-line" />
            <span>Dashboard</span>
          </Link>

          {/* Revenue Management Submenu - Both roles */}
          <div
            className={`nav-item module ${
              ["tripRevenue", "busRental", "otherRevenue"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("revenue-management")}
          >
            <i className="ri-money-dollar-circle-line" />
            <span>Revenue Management</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "revenue-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "revenue-management" && (
            <div className="sub-menu active">
              <Link
                href={getUrl("/revenue/tripRevenue")}
                className={`sub-item ${activeItem === "tripRevenue" ? "active" : ""}`}
                onClick={() => setActiveItem("tripRevenue")}
              >
                Trip Revenue
              </Link>
              <Link
                href={getUrl("/revenue/busRental")}
                className={`sub-item ${activeItem === "busRental" ? "active" : ""}`}
                onClick={() => setActiveItem("busRental")}
              >
                Bus Rental
              </Link>
              <Link
                href={getUrl("/revenue/otherRevenue")}
                className={`sub-item ${activeItem === "otherRevenue" ? "active" : ""}`}
                onClick={() => setActiveItem("otherRevenue")}
              >
                Other Revenue
              </Link>
            </div>
          )}

          {/* Expense Management Submenu - Both roles */}
          <div
            className={`nav-item module ${
              ["operational-expense", "administrative-expense", "purchase-expense"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("expense-management")}
          >
            <i className="ri-money-dollar-circle-line"></i>
            <span>Expense Management</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "expense-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "expense-management" && (
            <div className="sub-menu active">
              <Link
                href={getUrl("/expense-management/operational")}
                className={`sub-item ${activeItem === "operational-expense" ? "active" : ""}`}
                onClick={() => setActiveItem("operational-expense")}
              >
                Operational Expenses
              </Link>
              <Link
                href={getUrl("/expense-management/purchase")}
                className={`sub-item ${activeItem === "purchase-expense" ? "active" : ""}`}
                onClick={() => setActiveItem("purchase-expense")}
              >
                Purchase Expenses
              </Link>
              <Link
                href={getUrl("/expense-management/administrative")}
                className={`sub-item ${activeItem === "administrative-expense" ? "active" : ""}`}
                onClick={() => setActiveItem("administrative-expense")}
              >
                Administrative Expenses
              </Link>
            </div>
          )}

          {/* Payroll - Both roles */}
          <Link
            href={getUrl("/financial-management/payroll")}
            className={`nav-item ${activeItem === "payroll" ? "active" : ""}`}
            onClick={() => setActiveItem("payroll")}
          >
            <i className="ri-group-line" />
            <span>Payroll</span>
          </Link>

          {/* Budget Management Submenu */}
          <div
            className={`nav-item module ${
              ["budget-request", "budgetAllocation", "approval"].includes(activeItem!) ? "active" : ""
            }`}
            onClick={() => toggleSubMenu("budget-management")}
          >
            <i className="ri-wallet-3-line"></i>
            <span>Budget Management</span>
            <i
              className={`dropdown-arrow ri-arrow-down-s-line ${
                openSubMenu === "budget-management" ? "rotate" : ""
              }`}
            />
          </div>

          {openSubMenu === "budget-management" && (
            <div className="sub-menu active">
              {/* Budget Request - Both roles */}
              <Link
                href={getUrl("/budget-management/budgetRequest")}
                className={`sub-item ${activeItem === "budget-request" ? "active" : ""}`}
                onClick={() => setActiveItem("budget-request")}
              >
                Budget Request
              </Link>
              
              {/* Budget Allocation - Admin only */}
              {userRole === 'admin' && (
                <Link
                  href={getUrl("/budget-management/budgetAllocation")}
                  className={`sub-item ${activeItem === "budgetAllocation" ? "active" : ""}`}
                  onClick={() => setActiveItem("budgetAllocation")}
                >
                  Budget Allocation
                </Link>
              )}
              
              {/* Approvals - Admin only */}
              {userRole === 'admin' && (
                <Link
                  href={getUrl("/budget-management/approval")}
                  className={`sub-item ${activeItem === "approval" ? "active" : ""}`}
                  onClick={() => setActiveItem("approval")}
                >
                  Approvals
                </Link>
              )}
            </div>
          )}

          
          {/* Financial Reports - Both roles */}
          <Link
            href={getUrl("/report")}
            className={`nav-item ${activeItem === "report" ? "active" : ""}`}
            onClick={() => setActiveItem("report")}
          >
            <i className="ri-file-chart-line" />
            <span>Financial Reports</span>
          </Link>

        
          {/* Records & Reports - Admin only */}
          {userRole === 'admin' && (
            <>
              <div
                className={`nav-item module ${
                  ["journal-entries","chart-of-accounts", "asset-management", "disposal-approval"].includes(activeItem!) ? "active" : ""
                }`}
                onClick={() => toggleSubMenu("records-reports")}
              >
                <i className="ri-folder-3-line"></i>
                <span>Records & Reports</span>
                <i
                  className={`dropdown-arrow ri-arrow-down-s-line ${
                    openSubMenu === "records-reports" ? "rotate" : ""
                  }`}
                />
              </div>

              {openSubMenu === "records-reports" && (
                <div className="sub-menu active">
                  <Link
                    href={getUrl("/jev/chart-of-accounts")}
                    className={`sub-item ${activeItem === "chart-of-accounts" ? "active" : ""}`}
                    onClick={() => setActiveItem("chart-of-accounts")}
                  >
                    Chart of Accounts
                  </Link>

                  <Link
                    href={getUrl("/jev/journal-entries")}
                    className={`sub-item ${activeItem === "journal-entries" ? "active" : ""}`}
                    onClick={() => setActiveItem("journal-entries")}
                  >
                    Journal Entries
                  </Link>

                  <Link
                    href={getUrl("/asset-management")}
                    className={`sub-item ${activeItem === "asset-management" ? "active" : ""}`}
                    onClick={() => setActiveItem("asset-management")}
                  >
                    Asset Management
                  </Link>

                  <Link
                    href={getUrl("/disposal-approval")}
                    className={`sub-item ${activeItem === "disposal-approval" ? "active" : ""}`}
                    onClick={() => setActiveItem("disposal-approval")}
                  >
                    Disposal Approval
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Audit Logs - Admin only */}
          {userRole === 'admin' && (
            <Link
              href={auditHref}
              className={`nav-item ${activeItem === auditActiveKey ? "active" : ""}`}
              onClick={() => setActiveItem(auditActiveKey)}
            >
              <i className={auditIconClass} />
              <span>Audit Logs</span>
            </Link>
            )}
        </div>

        <div className="logout">
          <a href="#">
            <i className="ri-logout-box-r-line" />
            <span>Logout</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;