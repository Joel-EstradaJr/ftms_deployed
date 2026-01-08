"use client";
import React from "react";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartOptions,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { FinancialPositionData } from "../trialBalance";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartDataLabels
);

interface FinancialPositionChartsProps {
  data: FinancialPositionData;
}

const FinancialPositionCharts: React.FC<FinancialPositionChartsProps> = ({ data }) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  // Calculate financial ratios
  const financialRatios = React.useMemo(() => {
    const currentRatio = (data.currentAssets.subtotal / (data.currentLiabilities.subtotal || 1)).toFixed(2);
    const debtToEquity = (data.totalLiabilities / (data.equity.subtotal || 1)).toFixed(2);
    const equityRatio = ((data.equity.subtotal / (data.totalAssets || 1)) * 100).toFixed(1);
    const assetToLiability = (data.totalAssets / (data.totalLiabilities || 1)).toFixed(2);
    
    return { currentRatio, debtToEquity, equityRatio, assetToLiability };
  }, [data]);

  // Asset composition data (combining current and non-current)
  const assetCompositionData = {
    labels: ["Current Assets", "Non-Current Assets"],
    datasets: [
      {
        data: [data.currentAssets.subtotal, data.nonCurrentAssets.subtotal],
        backgroundColor: [
          "rgba(52, 152, 219, 0.8)",
          "rgba(46, 204, 113, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(52, 152, 219, 1)",
          "rgba(46, 204, 113, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      },
    ],
  };

  // Current Assets breakdown
  const currentAssetsChartData = {
    labels: data.currentAssets.items.map((item) => 
      item.accountName.length > 20 ? item.accountName.substring(0, 17) + "..." : item.accountName
    ),
    datasets: [
      {
        data: data.currentAssets.items.map((item) => Math.abs(item.amount)),
        backgroundColor: [
          "rgba(52, 152, 219, 0.8)",
          "rgba(41, 128, 185, 0.8)",
          "rgba(26, 188, 156, 0.8)",
          "rgba(46, 204, 113, 0.8)",
          "rgba(39, 174, 96, 0.8)",
          "rgba(22, 160, 133, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(52, 152, 219, 1)",
          "rgba(41, 128, 185, 1)",
          "rgba(26, 188, 156, 1)",
          "rgba(46, 204, 113, 1)",
          "rgba(39, 174, 96, 1)",
          "rgba(22, 160, 133, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 12,
      },
    ],
  };

  // Non-Current Assets breakdown (excluding accumulated depreciation for cleaner visualization)
  const nonCurrentAssetsChartData = {
    labels: data.nonCurrentAssets.items
      .filter((item) => !item.isAccumulatedDepreciation)
      .map((item) => 
        item.accountName.length > 18 ? item.accountName.substring(0, 15) + "..." : item.accountName
      ),
    datasets: [
      {
        data: data.nonCurrentAssets.items
          .filter((item) => !item.isAccumulatedDepreciation)
          .map((item) => Math.abs(item.amount)),
        backgroundColor: [
          "rgba(155, 89, 182, 0.8)",
          "rgba(142, 68, 173, 0.8)",
          "rgba(52, 73, 94, 0.8)",
          "rgba(44, 62, 80, 0.8)",
          "rgba(127, 140, 141, 0.8)",
          "rgba(149, 165, 166, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(155, 89, 182, 1)",
          "rgba(142, 68, 173, 1)",
          "rgba(52, 73, 94, 1)",
          "rgba(44, 62, 80, 1)",
          "rgba(127, 140, 141, 1)",
          "rgba(149, 165, 166, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 12,
      },
    ],
  };

  // Liabilities and Equity composition
  const liabilitiesEquityData = {
    labels: ["Current Liabilities", "Long-term Liabilities", "Equity"],
    datasets: [
      {
        data: [
          data.currentLiabilities.subtotal,
          data.longTermLiabilities.subtotal,
          data.equity.subtotal,
        ],
        backgroundColor: [
          "rgba(231, 76, 60, 0.8)",
          "rgba(230, 126, 34, 0.8)",
          "rgba(46, 204, 113, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(231, 76, 60, 1)",
          "rgba(230, 126, 34, 1)",
          "rgba(46, 204, 113, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      },
    ],
  };

  // Balance Sheet structure (stacked bar)
  const balanceSheetStructureData = {
    labels: ["Assets", "Liabilities & Equity"],
    datasets: [
      {
        label: "Current Assets",
        data: [data.currentAssets.subtotal, 0],
        backgroundColor: "rgba(52, 152, 219, 0.8)",
        hoverBackgroundColor: "rgba(52, 152, 219, 1)",
        borderColor: "rgba(52, 152, 219, 1)",
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: "Non-Current Assets",
        data: [data.nonCurrentAssets.subtotal, 0],
        backgroundColor: "rgba(46, 204, 113, 0.8)",
        hoverBackgroundColor: "rgba(46, 204, 113, 1)",
        borderColor: "rgba(46, 204, 113, 1)",
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: "Current Liabilities",
        data: [0, data.currentLiabilities.subtotal],
        backgroundColor: "rgba(231, 76, 60, 0.8)",
        hoverBackgroundColor: "rgba(231, 76, 60, 1)",
        borderColor: "rgba(231, 76, 60, 1)",
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: "Long-term Liabilities",
        data: [0, data.longTermLiabilities.subtotal],
        backgroundColor: "rgba(230, 126, 34, 0.8)",
        hoverBackgroundColor: "rgba(230, 126, 34, 1)",
        borderColor: "rgba(230, 126, 34, 1)",
        borderWidth: 2,
        borderRadius: 6,
      },
      {
        label: "Equity",
        data: [0, data.equity.subtotal],
        backgroundColor: "rgba(155, 89, 182, 0.8)",
        hoverBackgroundColor: "rgba(155, 89, 182, 1)",
        borderColor: "rgba(155, 89, 182, 1)",
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  // Equity breakdown
  const equityBreakdownData = {
    labels: data.equity.items.map((item) => 
      item.accountName.length > 20 ? item.accountName.substring(0, 17) + "..." : item.accountName
    ),
    datasets: [
      {
        data: data.equity.items.map((item) => item.amount),
        backgroundColor: [
          "rgba(46, 204, 113, 0.8)",
          "rgba(39, 174, 96, 0.8)",
          "rgba(22, 160, 133, 0.8)",
          "rgba(26, 188, 156, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(46, 204, 113, 1)",
          "rgba(39, 174, 96, 1)",
          "rgba(22, 160, 133, 1)",
          "rgba(26, 188, 156, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 12,
      },
    ],
  };

  // Liabilities breakdown (combined)
  const liabilitiesBreakdownData = {
    labels: [
      ...data.currentLiabilities.items.map((item) => 
        item.accountName.length > 18 ? item.accountName.substring(0, 15) + "..." : item.accountName
      ),
      ...data.longTermLiabilities.items.map((item) => 
        item.accountName.length > 18 ? item.accountName.substring(0, 15) + "..." : item.accountName
      ),
    ],
    datasets: [
      {
        label: "Amount (₱)",
        data: [
          ...data.currentLiabilities.items.map((item) => item.amount),
          ...data.longTermLiabilities.items.map((item) => item.amount),
        ],
        backgroundColor: [
          ...data.currentLiabilities.items.map(() => "rgba(231, 76, 60, 0.7)"),
          ...data.longTermLiabilities.items.map(() => "rgba(230, 126, 34, 0.7)"),
        ],
        hoverBackgroundColor: [
          ...data.currentLiabilities.items.map(() => "rgba(231, 76, 60, 0.9)"),
          ...data.longTermLiabilities.items.map(() => "rgba(230, 126, 34, 0.9)"),
        ],
        borderColor: [
          ...data.currentLiabilities.items.map(() => "rgba(231, 76, 60, 1)"),
          ...data.longTermLiabilities.items.map(() => "rgba(230, 126, 34, 1)"),
        ],
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const stackedBarOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: "easeOutQuart",
      delay: (context) => {
        let delay = 0;
        if (context.type === "data" && context.mode === "default") {
          delay = context.datasetIndex * 300 + context.dataIndex * 150;
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
        position: "top",
        labels: {
          font: { size: 11, weight: "bold" },
          boxWidth: 15,
          padding: 15,
          usePointStyle: true,
          pointStyle: "rectRounded",
        },
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
            if (value === 0) return "";
            return `${context.dataset.label}: ₱${formatCurrency(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        grid: {
          color: "rgba(0, 0, 0, 0.06)",
        },
        ticks: {
          callback: (value) => `₱${Number(value).toLocaleString()}`,
        },
      },
    },
  };

  const horizontalBarOptions: ChartOptions<"bar"> = {
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

  const pieOptions: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1800,
      easing: "easeOutBack",
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
        position: "bottom",
        labels: {
          font: { size: 11, weight: "normal" },
          color: "#333",
          boxWidth: 15,
          padding: 15,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      datalabels: {
        color: "#fff",
        font: {
          weight: "bold",
          size: 12,
        },
        textShadowColor: "rgba(0,0,0,0.4)",
        textShadowBlur: 5,
        formatter: (value: number, context) => {
          const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          if (parseFloat(percentage) < 8) return "";
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
          Interactive charts showing financial position breakdown
        </p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card assets-card">
          <div className="summary-icon">
            <i className="ri-building-2-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Assets</span>
            <span className="summary-value">₱{formatCurrency(data.totalAssets)}</span>
          </div>
        </div>
        <div className="summary-card liabilities-card">
          <div className="summary-icon">
            <i className="ri-bank-card-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Liabilities</span>
            <span className="summary-value">₱{formatCurrency(data.totalLiabilities)}</span>
          </div>
        </div>
        <div className="summary-card equity-card">
          <div className="summary-icon">
            <i className="ri-shield-check-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Equity</span>
            <span className="summary-value">₱{formatCurrency(data.equity.subtotal)}</span>
          </div>
        </div>
        <div className="summary-card ratio-card">
          <div className="summary-icon">
            <i className="ri-scales-3-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Current Ratio</span>
            <span className="summary-value">{financialRatios.currentRatio}x</span>
          </div>
        </div>
      </div>

      {/* Financial Ratios Section */}
      <div className="financial-ratios">
        <h4 className="ratios-title">
          <i className="ri-calculator-line"></i>
          Key Financial Ratios
        </h4>
        <div className="ratios-grid">
          <div className="ratio-item">
            <span className="ratio-name">Current Ratio</span>
            <span className="ratio-value">{financialRatios.currentRatio}x</span>
            <span className="ratio-desc">Current Assets / Current Liabilities</span>
          </div>
          <div className="ratio-item">
            <span className="ratio-name">Debt to Equity</span>
            <span className="ratio-value">{financialRatios.debtToEquity}x</span>
            <span className="ratio-desc">Total Liabilities / Total Equity</span>
          </div>
          <div className="ratio-item">
            <span className="ratio-name">Equity Ratio</span>
            <span className="ratio-value">{financialRatios.equityRatio}%</span>
            <span className="ratio-desc">Equity / Total Assets</span>
          </div>
          <div className="ratio-item">
            <span className="ratio-name">Asset Coverage</span>
            <span className="ratio-value">{financialRatios.assetToLiability}x</span>
            <span className="ratio-desc">Total Assets / Total Liabilities</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Balance Sheet Structure */}
        <div className="chart-container chart-wide">
          <h4 className="chart-title">
            <i className="ri-bar-chart-grouped-line"></i>
            Balance Sheet Structure
          </h4>
          <div className="chart-wrapper">
            <Bar data={balanceSheetStructureData} options={stackedBarOptions} />
          </div>
        </div>

        {/* Asset Composition */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-pie-chart-line"></i>
            Asset Composition
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Pie data={assetCompositionData} options={pieOptions} />
          </div>
        </div>

        {/* Liabilities & Equity Composition */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-donut-chart-line"></i>
            Liabilities & Equity
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={liabilitiesEquityData} options={doughnutOptions} />
          </div>
        </div>

        {/* Current Assets Breakdown */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-funds-box-line"></i>
            Current Assets Breakdown
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={currentAssetsChartData} options={doughnutOptions} />
          </div>
        </div>

        {/* Non-Current Assets Breakdown */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-building-4-line"></i>
            Non-Current Assets
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={nonCurrentAssetsChartData} options={doughnutOptions} />
          </div>
        </div>

        {/* Equity Breakdown */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-shield-star-line"></i>
            Equity Breakdown
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={equityBreakdownData} options={doughnutOptions} />
          </div>
        </div>

        {/* Liabilities Breakdown */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-bar-chart-horizontal-line"></i>
            Liabilities Detail
          </h4>
          <div className="chart-wrapper">
            <Bar data={liabilitiesBreakdownData} options={horizontalBarOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialPositionCharts;
