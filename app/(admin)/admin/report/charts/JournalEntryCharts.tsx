"use client";
import React from "react";
import { Bar, Doughnut } from "react-chartjs-2";
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
import { JournalTransaction } from "../journalEntry";

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

interface JournalEntryChartsProps {
  transactions: JournalTransaction[];
}

const JournalEntryCharts: React.FC<JournalEntryChartsProps> = ({ transactions }) => {
  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate account-wise totals
  const accountTotals = React.useMemo(() => {
    const totals: Record<string, { debit: number; credit: number; accountCode: string }> = {};
    
    transactions.forEach((txn) => {
      txn.lines.forEach((line) => {
        if (!totals[line.accountName]) {
          totals[line.accountName] = { debit: 0, credit: 0, accountCode: line.accountCode };
        }
        totals[line.accountName].debit += line.debit || 0;
        totals[line.accountName].credit += line.credit || 0;
      });
    });
    
    return totals;
  }, [transactions]);

  // Calculate transaction-wise totals
  const transactionTotals = React.useMemo(() => {
    return transactions.map((txn, index) => {
      const totals = txn.lines.reduce(
        (acc, line) => {
          acc.debit += line.debit || 0;
          acc.credit += line.credit || 0;
          return acc;
        },
        { debit: 0, credit: 0 }
      );
      return {
        id: txn.id,
        label: `TXN ${index + 1}: ${txn.lines[0]?.scenario || "Journal Entry"}`,
        ...totals,
      };
    });
  }, [transactions]);

  // Calculate overall totals
  const overallTotals = React.useMemo(() => {
    return transactions.reduce(
      (acc, txn) => {
        txn.lines.forEach((line) => {
          acc.debit += line.debit || 0;
          acc.credit += line.credit || 0;
        });
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [transactions]);

  // Bar chart data for account-wise breakdown
  const accountChartData = {
    labels: Object.keys(accountTotals).map((name) => 
      name.length > 25 ? name.substring(0, 22) + "..." : name
    ),
    datasets: [
      {
        label: "Debit (₱)",
        data: Object.values(accountTotals).map((t) => t.debit),
        backgroundColor: "rgba(54, 162, 235, 0.7)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: "rgba(54, 162, 235, 0.9)",
        hoverBorderColor: "rgba(54, 162, 235, 1)",
        hoverBorderWidth: 3,
      },
      {
        label: "Credit (₱)",
        data: Object.values(accountTotals).map((t) => t.credit),
        backgroundColor: "rgba(255, 99, 132, 0.7)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: "rgba(255, 99, 132, 0.9)",
        hoverBorderColor: "rgba(255, 99, 132, 1)",
        hoverBorderWidth: 3,
      },
    ],
  };

  // Bar chart data for transaction breakdown
  const transactionChartData = {
    labels: transactionTotals.map((t) => 
      t.label.length > 30 ? t.label.substring(0, 27) + "..." : t.label
    ),
    datasets: [
      {
        label: "Debit (₱)",
        data: transactionTotals.map((t) => t.debit),
        backgroundColor: "rgba(75, 192, 192, 0.7)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: "rgba(75, 192, 192, 0.9)",
        hoverBorderColor: "rgba(75, 192, 192, 1)",
        hoverBorderWidth: 3,
      },
      {
        label: "Credit (₱)",
        data: transactionTotals.map((t) => t.credit),
        backgroundColor: "rgba(153, 102, 255, 0.7)",
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
        hoverBackgroundColor: "rgba(153, 102, 255, 0.9)",
        hoverBorderColor: "rgba(153, 102, 255, 1)",
        hoverBorderWidth: 3,
      },
    ],
  };

  // Doughnut chart data for debit breakdown by account
  const debitDoughnutData = {
    labels: Object.entries(accountTotals)
      .filter(([, val]) => val.debit > 0)
      .map(([name]) => name.length > 20 ? name.substring(0, 17) + "..." : name),
    datasets: [
      {
        data: Object.entries(accountTotals)
          .filter(([, val]) => val.debit > 0)
          .map(([, val]) => val.debit),
        backgroundColor: [
          "rgba(54, 162, 235, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(199, 199, 199, 0.8)",
          "rgba(83, 102, 255, 0.8)",
          "rgba(255, 99, 132, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(54, 162, 235, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(199, 199, 199, 1)",
          "rgba(83, 102, 255, 1)",
          "rgba(255, 99, 132, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      },
    ],
  };

  // Doughnut chart data for credit breakdown by account
  const creditDoughnutData = {
    labels: Object.entries(accountTotals)
      .filter(([, val]) => val.credit > 0)
      .map(([name]) => name.length > 20 ? name.substring(0, 17) + "..." : name),
    datasets: [
      {
        data: Object.entries(accountTotals)
          .filter(([, val]) => val.credit > 0)
          .map(([, val]) => val.credit),
        backgroundColor: [
          "rgba(255, 99, 132, 0.8)",
          "rgba(255, 159, 64, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(54, 162, 235, 0.8)",
          "rgba(153, 102, 255, 0.8)",
        ],
        hoverBackgroundColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderColor: "#fff",
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: "easeOutQuart",
      delay: (context) => {
        let delay = 0;
        if (context.type === "data" && context.mode === "default") {
          delay = context.dataIndex * 100 + context.datasetIndex * 200;
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
        position: "top",
        labels: {
          font: { size: 12, weight: "bold" },
          color: "#333",
          padding: 20,
          usePointStyle: true,
          pointStyle: "rectRounded",
        },
      },
      title: {
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
            return `${context.dataset.label}: ₱${formatCurrency(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.06)",
        },
        ticks: {
          callback: (value) => `₱${Number(value).toLocaleString()}`,
          font: { size: 11 },
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
          size: 11,
        },
        textShadowColor: "rgba(0,0,0,0.3)",
        textShadowBlur: 4,
        formatter: (value: number) => {
          if (value < 500) return "";
          return `₱${formatCurrency(value)}`;
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
          Interactive charts showing the breakdown of journal entries
        </p>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card debit-card">
          <div className="summary-icon">
            <i className="ri-arrow-up-circle-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Debits</span>
            <span className="summary-value">₱{formatCurrency(overallTotals.debit)}</span>
          </div>
        </div>
        <div className="summary-card credit-card">
          <div className="summary-icon">
            <i className="ri-arrow-down-circle-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Credits</span>
            <span className="summary-value">₱{formatCurrency(overallTotals.credit)}</span>
          </div>
        </div>
        <div className="summary-card transactions-card">
          <div className="summary-icon">
            <i className="ri-file-list-3-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Transactions</span>
            <span className="summary-value">{transactions.length}</span>
          </div>
        </div>
        <div className="summary-card accounts-card">
          <div className="summary-icon">
            <i className="ri-book-2-line"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Accounts Used</span>
            <span className="summary-value">{Object.keys(accountTotals).length}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Account-wise Bar Chart */}
        <div className="chart-container chart-wide">
          <h4 className="chart-title">
            <i className="ri-bar-chart-grouped-line"></i>
            Debit vs Credit by Account
          </h4>
          <div className="chart-wrapper">
            <Bar data={accountChartData} options={barOptions} />
          </div>
        </div>

        {/* Transaction Bar Chart */}
        <div className="chart-container chart-wide">
          <h4 className="chart-title">
            <i className="ri-bar-chart-2-line"></i>
            Transaction Breakdown
          </h4>
          <div className="chart-wrapper">
            <Bar data={transactionChartData} options={barOptions} />
          </div>
        </div>

        {/* Debit Distribution Doughnut */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-pie-chart-line"></i>
            Debit Distribution
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={debitDoughnutData} options={doughnutOptions} />
          </div>
        </div>

        {/* Credit Distribution Doughnut */}
        <div className="chart-container">
          <h4 className="chart-title">
            <i className="ri-donut-chart-line"></i>
            Credit Distribution
          </h4>
          <div className="chart-wrapper doughnut-wrapper">
            <Doughnut data={creditDoughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalEntryCharts;
