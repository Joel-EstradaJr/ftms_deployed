"use client";
import React, { useState, useEffect, useCallback } from "react";
import PieChart from "../../../Components/pieChart";
import ExportConfirmationModal from "../../../Components/ExportConfirmationModal";
import ErrorDisplay from '../../../Components/ErrorDisplay';
import "../../../styles/dashboard/dashboard.css";
import Loading from '../../../Components/loading';
import EmotionSettingsModal from "../../../Components/dashboardEmotion";

interface DashboardData {
  revenue: {
    total: number;
    byCategory: Record<string, { name: string; amount: number }>;
  };
  expense: {
    total: number;
    byCategory: Record<string, { name: string; amount: number }>;
  };
  profit: number;
}

interface EmotionSettings {
  veryPoor: number;
  poor: number;
  good: number;
  excellent: number;
}

// Mock data stored in memory - modify these values to test different scenarios
const MOCK_REVENUE_CATEGORIES = [
  { id: "1", name: "Sales", baseAmount: 75000 },
  { id: "2", name: "Services", baseAmount: 45000 },
  { id: "3", name: "Consulting", baseAmount: 30000 },
  { id: "4", name: "Products", baseAmount: 25000 },
];

const MOCK_EXPENSE_CATEGORIES = [
  { id: "1", name: "Salaries", baseAmount: 50000 },
  { id: "2", name: "Utilities", baseAmount: 15000 },
  { id: "3", name: "Supplies", baseAmount: 10000 },
  { id: "4", name: "Marketing", baseAmount: 8000 },
];

// Calculate multiplier based on date filter
const getDateMultiplier = (dateFilter: string, dateFrom: string, dateTo: string): number => {
  switch (dateFilter) {
    case "Day":
      return 0.033; // ~1/30 of monthly
    case "Month":
      return 1;
    case "Year":
      return 12;
    case "Custom":
      if (dateFrom && dateTo) {
        const start = new Date(dateFrom);
        const end = new Date(dateTo);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return Math.max(0.033, days / 30); // At least one day's worth
      }
      return 1;
    default:
      return 12; // All time (assume 1 year)
  }
};

// Generate dashboard data based on filters
const generateDashboardData = (dateFilter: string, dateFrom: string, dateTo: string): DashboardData => {
  const multiplier = getDateMultiplier(dateFilter, dateFrom, dateTo);
  
  // Add slight random variation to make it more realistic
  const randomFactor = () => 0.9 + Math.random() * 0.2; // 90% to 110%
  
  const revenueByCategory: Record<string, { name: string; amount: number }> = {};
  MOCK_REVENUE_CATEGORIES.forEach((cat) => {
    revenueByCategory[cat.name] = {
      name: cat.name,
      amount: Math.round(cat.baseAmount * multiplier * randomFactor())
    };
  });

  const expenseByCategory: Record<string, { name: string; amount: number }> = {};
  MOCK_EXPENSE_CATEGORIES.forEach((cat) => {
    expenseByCategory[cat.name] = {
      name: cat.name,
      amount: Math.round(cat.baseAmount * multiplier * randomFactor())
    };
  });

  const totalRevenue = Object.values(revenueByCategory).reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = Object.values(expenseByCategory).reduce((acc, curr) => acc + curr.amount, 0);
  const profit = totalRevenue - totalExpense;

  return {
    revenue: { total: totalRevenue, byCategory: revenueByCategory },
    expense: { total: totalExpense, byCategory: expenseByCategory },
    profit
  };
};

const DashboardPage = () => {
  const today = new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    revenue: { total: 0, byCategory: {} },
    expense: { total: 0, byCategory: {} },
    profit: 0
  });
  const [isEmotionModalOpen, setIsEmotionModalOpen] = useState(false);
  const [emotionSettings, setEmotionSettings] = useState<EmotionSettings>({
    veryPoor: 0,
    poor: 10000,
    good: 50000,
    excellent: 100000
  });

  const getProfitEmoji = (profit: number) => {
    if (profit < emotionSettings.veryPoor) return "/cry.webp";
    if (profit < emotionSettings.poor) return "/neutral.webp";
    if (profit < emotionSettings.good) return "/smile_with_big_eyes.webp";
    return "/congratulation.webp";
  };

  const getEmotionStatus = (profit: number) => {
    if (profit < emotionSettings.veryPoor) return "Very Poor";
    if (profit < emotionSettings.poor) return "Poor";
    if (profit < emotionSettings.good) return "Good";
    return "Excellent";
  };

  const handleEmotionSave = (newSettings: EmotionSettings) => {
    setEmotionSettings(newSettings);
    try {
      localStorage.setItem('emotionSettings', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Failed to save emotion settings:', err);
    }
  };

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('emotionSettings');
      if (savedSettings) {
        setEmotionSettings(JSON.parse(savedSettings));
      }
    } catch (err) {
      console.error('Failed to load emotion settings:', err);
    }
  }, []);

  // Load dashboard data (pure frontend - no API calls)
  const loadDashboardData = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate slight delay for realistic UX
      setTimeout(() => {
        const data = generateDashboardData(dateFilter, dateFrom, dateTo);
        setDashboardData(data);
        setLoading(false);
      }, 300);
    } catch (err) {
      console.error("Error generating dashboard data:", err);
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  }, [dateFilter, dateFrom, dateTo]);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Optional: Auto-refresh every 30 seconds (useful for demo)
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadDashboardData();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [loadDashboardData]);

  const generateFileName = () => {
    const now = new Date();
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, 8);
    const dateStamp = now.toISOString().split('T')[0];
    
    let fileName = 'dashboard_report';
    
    if (dateFilter) {
      fileName += `_${dateFilter.toLowerCase()}`;
    }
    
    if (dateFilter === 'Custom' && dateFrom && dateTo) {
      fileName += `_${dateFrom}_to_${dateTo}`;
    }
    
    fileName += `_${dateStamp}_${timeStamp}`;
    
    return `${fileName}.csv`;
  };

  // Frontend-only CSV export
  const handleExport = () => {
    try {
      const fileName = generateFileName();
      
      // Build CSV content
      let csv = "Financial Dashboard Report\n";
      csv += `Generated: ${new Date().toLocaleString()}\n`;
      csv += `Filter: ${dateFilter || 'All Time'}\n`;
      
      if (dateFilter === 'Custom' && dateFrom && dateTo) {
        csv += `Date Range: ${dateFrom} to ${dateTo}\n`;
      }
      
      csv += "\n";
      
      // Revenue section
      csv += "REVENUE BREAKDOWN\n";
      csv += "Category,Amount\n";
      Object.values(dashboardData.revenue.byCategory).forEach((cat) => {
        csv += `"${cat.name}","₱${cat.amount.toLocaleString()}"\n`;
      });
      csv += `"Total Revenue","₱${dashboardData.revenue.total.toLocaleString()}"\n`;
      csv += "\n";
      
      // Expense section
      csv += "EXPENSE BREAKDOWN\n";
      csv += "Category,Amount\n";
      Object.values(dashboardData.expense.byCategory).forEach((cat) => {
        csv += `"${cat.name}","₱${cat.amount.toLocaleString()}"\n`;
      });
      csv += `"Total Expenses","₱${dashboardData.expense.total.toLocaleString()}"\n`;
      csv += "\n";
      
      // Summary
      csv += "FINANCIAL SUMMARY\n";
      csv += "Metric,Value\n";
      csv += `"Total Revenue","₱${dashboardData.revenue.total.toLocaleString()}"\n`;
      csv += `"Total Expenses","₱${dashboardData.expense.total.toLocaleString()}"\n`;
      csv += `"Net Profit","₱${dashboardData.profit.toLocaleString()}"\n`;
      csv += `"Profit Margin","${((dashboardData.profit / dashboardData.revenue.total) * 100).toFixed(2)}%"\n`;
      
      // Create and trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      setIsExportModalOpen(false);
      
      console.log('✅ Dashboard exported successfully:', fileName);
    } catch (err) {
      console.error('❌ Export failed:', err);
      alert('Failed to export dashboard. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="card">
        <h1 className="title">Dashboard</h1>
        <ErrorDisplay
          type="503"
          message="Unable to load dashboard data."
          onRetry={() => {
            setError(null);
            loadDashboardData();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h1 className="title">Dashboard</h1>
        <Loading />
      </div>
    );
  }
  
  return (
    <>
      <div className="dashboardPage">
        <div className="accounting">
          <div className="dashboard_settings">
            <div className="filterDate">
              <div className="dashboard_filter">
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
            <div className="dashboard_exportButton">
              <button onClick={() => setIsExportModalOpen(true)}>
                <i className="ri-receipt-line" /> Export
              </button>
            </div>
          </div>
          <div className="dataContainer">
            <div className="data">
              {/* Revenue Card */}
              <div className="dataGrid" id="revenue">
                <div className="cardHeader">
                  <div className="cardIcon">💰</div>
                  <div className="cardInfo">
                    <h3>Revenue</h3>
                    <span className="categoryCount">{Object.keys(dashboardData.revenue.byCategory).length} Categories</span>
                  </div>
                </div>
                <div className="categoryBreakdown">
                  {Object.values(dashboardData.revenue.byCategory).map((categoryData) => (
                    <div key={categoryData.name} className="categoryItem">
                      <span>{categoryData.name}</span>
                      <span>₱{categoryData.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="categoryItem" style={{ fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                    <span>Total</span>
                    <span>₱{dashboardData.revenue.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Expenses Card */}
              <div className="dataGrid" id="expenses">
                <div className="cardHeader">
                  <div className="cardIcon">💸</div>
                  <div className="cardInfo">
                    <h3>Expenses</h3>
                    <span className="categoryCount">{Object.keys(dashboardData.expense.byCategory).length} Categories</span>
                  </div>
                </div>
                <div className="categoryBreakdown">
                  {Object.values(dashboardData.expense.byCategory).map((categoryData) => (
                    <div key={categoryData.name} className="categoryItem">
                      <span>{categoryData.name}</span>
                      <span>₱{categoryData.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="categoryItem" style={{ fontWeight: 'bold', borderTop: '1px solid #ddd', paddingTop: '8px', marginTop: '8px' }}>
                    <span>Total</span>
                    <span>₱{dashboardData.expense.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Profit Card */}
              <div className="dataGrid" id="profit">
                <div className="cardHeader">
                  <div className="cardIcon">📈</div>
                  <div className="cardInfo">
                    <h3>Profit</h3>
                  </div>
                </div>
                <div className="profitAmount">
                  ₱{dashboardData.profit.toLocaleString()}
                </div>
              </div>
              
              {/* Emotion Card */}
              <div className="dataGrid" id="emoji">
                <div className="cardHeader">
                  <div className="cardIcon">😊</div>
                  <div className="cardInfo">
                    <h3>Emotion</h3>
                    <span className="categoryCount">{getEmotionStatus(dashboardData.profit)}</span>
                  </div>
                  <button 
                    className="three-dots-btn"
                    onClick={() => setIsEmotionModalOpen(true)}
                    aria-label="Emotion settings"
                  >
                    ⋯
                  </button>
                </div>
                <div className="emoji">
                  <img
                    src={getProfitEmoji(dashboardData.profit)}
                    alt="Emotion indicator"
                    style={{ 
                      width: '80px', 
                      height: '60px', 
                      objectFit: 'contain' 
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="graphContainer-wrapper">
              <div className="graphContainer">
                <div className="title"><h2>Financial Overview</h2></div>
                <div className="pieChartContainer">
                  <PieChart 
                    revenueData={Object.fromEntries(
                      Object.entries(dashboardData.revenue.byCategory).map(([key, value]) => [key, value.amount])
                    )}
                    expenseData={Object.fromEntries(
                      Object.entries(dashboardData.expense.byCategory).map(([key, value]) => [key, value.amount])
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <EmotionSettingsModal
        isOpen={isEmotionModalOpen}
        onClose={() => setIsEmotionModalOpen(false)}
        onSave={handleEmotionSave}
        currentSettings={emotionSettings}
      />
      
      <ExportConfirmationModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExport}
        dateFilter={dateFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        dashboardData={dashboardData}
      />
    </>
  );
};

export default DashboardPage;