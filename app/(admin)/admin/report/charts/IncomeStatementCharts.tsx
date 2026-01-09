"use client";
import React from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartOptions,
  Filler,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { IncomeStatementData } from "../incomeStatement";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  ChartDataLabels
);

interface IncomeStatementChartsProps {
  data: IncomeStatementData;
}

const IncomeStatementCharts: React.FC<IncomeStatementChartsProps> = ({ data }) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  // Calculate profitability metrics
  const profitabilityMetrics = React.useMemo(() => {
    const grossMargin = ((data.grossProfit / (data.revenue.subtotal || 1)) * 100).toFixed(1);
    const operatingMargin = ((data.netOperatingIncome / (data.revenue.subtotal || 1)) * 100).toFixed(1);
    const netMargin = ((data.netIncome / (data.revenue.subtotal || 1)) * 100).toFixed(1);
    
    return { grossMargin, operatingMargin, netMargin };
  }, [data]);

  // Revenue breakdown doughnut chart
  const revenueChartData = {
    labels: data.revenue.items.map((item) => 
      item.accountName.length > 25 ? item.accountName.substring(0, 22) + "..." : item.accountName
    ),
    datasets: [
      {
        data: data.revenue.items.map((item) => item.amount),
        backgroundColor: [
          "rgba(75, 192, 192, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(255, 99, 132, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(255, 99, 132, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      },
    ],
  };

  // Cost of Service breakdown
  const costOfServiceChartData = {
    labels: data.costOfService.items.map((item) => 
      item.accountName.length > 20 ? item.accountName.substring(0, 17) + "..." : item.accountName
    ),
    datasets: [
      {
        label: "Cost of Service",
        data: data.costOfService.items.map((item) => item.amount),
        backgroundColor: "rgba(255, 99, 132, 0.7)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: "rgba(255, 99, 132, 0.9)",
        hoverBorderWidth: 3,
      },
    ],
  };

  // Operating Expenses breakdown
  const operatingExpensesChartData = {
    labels: data.operatingExpenses.items.map((item) => 
      item.accountName.replace(" - Office", "").length > 18 
        ? item.accountName.replace(" - Office", "").substring(0, 15) + "..." 
        : item.accountName.replace(" - Office", "")
    ),
    datasets: [
      {
        label: "Operating Expenses",
        data: data.operatingExpenses.items.map((item) => item.amount),
        backgroundColor: "rgba(255, 159, 64, 0.7)",
        borderColor: "rgba(255, 159, 64, 1)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: "rgba(255, 159, 64, 0.9)",
        hoverBorderWidth: 3,
      },
    ],
  };

  // Profitability waterfall data
  const waterfallChartData = {
    labels: [
      "Total Revenue",
      "Cost of Service",
      "Gross Profit",
      "Operating Exp.",
      "Net Operating",
      "Other Income",
      "Tax",
      "Net Income",
    ],
    datasets: [
      {
        label: "Amount (₱)",
        data: [
          data.revenue.subtotal || 0,
          -(data.costOfService.subtotal || 0),
          data.grossProfit,
          -(data.operatingExpenses.subtotal || 0),
          data.netOperatingIncome,
          data.otherIncome.subtotal || 0,
          -data.incomeTaxProvision,
          data.netIncome,
        ],
        backgroundColor: [
          "rgba(75, 192, 192, 0.8)",
          "rgba(255, 99, 132, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(255, 99, 132, 0.8)",
          data.netIncome >= 0 ? "rgba(46, 204, 113, 0.8)" : "rgba(231, 76, 60, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          data.netIncome >= 0 ? "rgba(46, 204, 113, 1)" : "rgba(231, 76, 60, 1)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          data.netIncome >= 0 ? "rgba(46, 204, 113, 1)" : "rgba(231, 76, 60, 1)",
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  // Expense comparison (Cost of Service vs Operating Expenses)
  const expenseComparisonData = {
    labels: ["Cost of Service", "Operating Expenses", "Income Tax"],
    datasets: [
      {
        data: [
          data.costOfService.subtotal || 0,
          data.operatingExpenses.subtotal || 0,
          data.incomeTaxProvision,
        ],
        backgroundColor: [
          "rgba(255, 99, 132, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(153, 102, 255, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      },
    ],
  };

  // Margin trends (horizontal bar)
  const marginChartData = {
    labels: ["Gross Margin", "Operating Margin", "Net Margin"],
    datasets: [
      {
        label: "Percentage (%)",
        data: [
          parseFloat(profitabilityMetrics.grossMargin),
          parseFloat(profitabilityMetrics.operatingMargin),
          parseFloat(profitabilityMetrics.netMargin),
        ],
        backgroundColor: [
          "rgba(46, 204, 113, 0.8)",
          "rgba(52, 152, 219, 0.8)",
          "rgba(155, 89, 182, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(46, 204, 113, 1)",
          "rgba(52, 152, 219, 1)",
          "rgba(155, 89, 182, 1)",
        ],
        borderColor: [
          "rgba(46, 204, 113, 1)",
          "rgba(52, 152, 219, 1)",
          "rgba(155, 89, 182, 1)",
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    animation: {
      duration: 1500,
      easing: "easeOutQuart",
      delay: (context) => {
        let delay = 0;
        if (context.type === "data" && context.mode === "default") {
          delay = context.dataIndex * 150;
        }
        return delay;
      },
    },
    transitions: {
      active: {
        animation: {
          duration: 300,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        padding: 15,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            return `₱${formatCurrency(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.06)",
        },
        ticks: {
          callback: (value) => `₱${Number(value).toLocaleString()}`,
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
  };

  const verticalBarOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1800,
      easing: "easeOutBounce",
      delay: (context) => {
        let delay = 0;
        if (context.type === "data" && context.mode === "default") {
          delay = context.dataIndex * 200;
        }
        return delay;
      },
    },
    transitions: {
      active: {
        animation: {
          duration: 300,
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        padding: 15,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const sign = value < 0 ? "-" : "";
            return `${sign}₱${formatCurrency(Math.abs(value))}`;
          },
        },
      },
    },
    scales: {
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.06)",
        },
        ticks: {
          callback: (value) => {
            const num = Number(value);
            return num < 0 ? `-₱${Math.abs(num).toLocaleString()}` : `₱${num.toLocaleString()}`;
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: { size: 10 },
        },
      },
    },
  };

  const marginBarOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    animation: {
      duration: 1500,
      easing: "easeOutElastic",
      delay: (context) => {
        let delay = 0;
        if (context.type === "data" && context.mode === "default") {
          delay = context.dataIndex * 300;
        }
        return delay;
      },
    },
    transitions: {
      active: {
        animation: {
          duration: 300,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        anchor: "end",
        align: "end",
        color: "#333",
        font: { weight: "bold", size: 12 },
        formatter: (value: number) => `${value.toFixed(1)}%`,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        padding: 15,
        cornerRadius: 10,
        callbacks: {
          label: (context) => `${(context.raw as number).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "rgba(0, 0, 0, 0.06)",
        },
        ticks: {
          callback: (value) => `${value}%`,
        },
      },
      y: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1500,
      easing: "easeOutCirc",
    },
    transitions: {
      active: {
        animation: {
          duration: 300,
        },
      },
    },
    plugins: {
      legend: {
        position: "right",
        labels: {
          font: { size: 11, weight: "normal" },
          color: "#333",
          boxWidth: 15,
          padding: 12,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      datalabels: {
        color: "#fff",
        font: {
          weight: "bold",
          size: 10,
        },
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowBlur: 4,
        formatter: (value: number, context) => {
          const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          if (parseFloat(percentage) < 5) return "";
          return `${percentage}%`;
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        padding: 15,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ₱${formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="charts-section">
      <div className="charts-header">
        <h3>Visual Data Analysis</h3>
        <p className="charts-subtitle">
          Interactive charts showing income and expense breakdown
        </p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card revenue-card">
          <div className="summary-icon">
            <i className="ri-money-dollar-circle-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Revenue</span>
            <span className="summary-value">₱{formatCurrency(data.revenue.subtotal || 0)}</span>
          </div>
        </div>
        <div className="summary-card expense-card">
          <div className="summary-icon">
            <i className="ri-shopping-cart-2-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Expenses</span>
            <span className="summary-value">
              ₱{formatCurrency((data.costOfService.subtotal || 0) + (data.operatingExpenses.subtotal || 0) + data.incomeTaxProvision)}
            </span>
          </div>
        </div>
        <div className="summary-card profit-card">
          <div className="summary-icon">
            <i className="ri-line-chart-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Net Income</span>
            <span className="summary-value" style={{ color: data.netIncome >= 0 ? "#27ae60" : "#e74c3c" }}>
              ₱{formatCurrency(data.netIncome)}
            </span>
          </div>
        </div>
        <div className="summary-card margin-card">
          <div className="summary-icon">
            <i className="ri-percent-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Net Margin</span>
            <span className="summary-value">{profitabilityMetrics.netMargin}%</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Income Flow Chart */}
        <div className="chart-container chart-wide">
          <h4 className="chart-title">
            <i className="ri-flow-chart"></i>
            Income Flow Analysis
          </h4>
          <div className="chart-wrapper">
            <Bar data={waterfallChartData} options={verticalBarOptions} />
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-pie-chart-line"></i>
            Revenue Breakdown
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={revenueChartData} options={doughnutOptions} />
          </div>
        </div>

        {/* Expense Distribution */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-donut-chart-line"></i>
            Expense Distribution
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={expenseComparisonData} options={doughnutOptions} />
          </div>
        </div>

        {/* Cost of Service Breakdown */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-bar-chart-horizontal-line"></i>
            Cost of Service Details
          </h4>
          <div className="chart-wrapper">
            <Bar data={costOfServiceChartData} options={barOptions} />
          </div>
        </div>

        {/* Operating Expenses Breakdown */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-bar-chart-horizontal-line"></i>
            Operating Expenses Details
          </h4>
          <div className="chart-wrapper">
            <Bar data={operatingExpensesChartData} options={barOptions} />
          </div>
        </div>

        {/* Profitability Margins */}
        <div className="chart-container chart-wide">
          <h4 className="chart-title">
            <i className="ri-funds-line"></i>
            Profitability Margins
          </h4>
          <div className="chart-wrapper margin-chart-wrapper">
            <Bar data={marginChartData} options={marginBarOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeStatementCharts;
