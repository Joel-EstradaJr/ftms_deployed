"use client";
import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Modern Line Chart Component
export const ModernLineChart = ({ data, labels }: { data?: number[], labels?: string[] }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Revenue',
          data: data || [65000, 75000, 85000, 95000, 88000, 105000, 115000, 125000, 118000, 135000, 145000, 160000],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#3b82f6',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function (context) {
                return '₱' + (context.parsed.y ?? 0).toLocaleString();
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              color: '#9ca3af',
              callback: function (value) {
                return '₱' + (Number(value) / 1000) + 'k';
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, labels]);

  return <canvas ref={chartRef} style={{ width: '100%', height: '300px' }}></canvas>;
};

// Modern Doughnut Chart
export const ModernDoughnutChart = ({ revenueData, expenseData }: {
  revenueData: Record<string, number>,
  expenseData: Record<string, number>
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Process data: Combine small values into "Others"
    const THRESHOLD_PERCENTAGE = 2; // Items below 2% get grouped

    // Helper to process a record of data
    const processData = (data: Record<string, number>, prefix: string) => {
      const entries = Object.entries(data);
      const total = entries.reduce((sum, [, val]) => sum + val, 0);

      const processed: { label: string, value: number, type: 'Revenue' | 'Expense' }[] = [];
      let othersValue = 0;

      entries.forEach(([key, value]) => {
        const percentage = (value / total) * 100;
        if (percentage < THRESHOLD_PERCENTAGE) {
          othersValue += value;
        } else {
          processed.push({ label: `${prefix} - ${key}`, value, type: prefix as 'Revenue' | 'Expense' });
        }
      });

      if (othersValue > 0) {
        processed.push({ label: `${prefix} - Others`, value: othersValue, type: prefix as 'Revenue' | 'Expense' });
      }

      // Sort by value descending
      return processed.sort((a, b) => b.value - a.value);
    };

    const processedRevenue = processData(revenueData, 'Revenue');
    const processedExpense = processData(expenseData, 'Expense');

    const combinedData = [...processedRevenue, ...processedExpense];

    const labels = combinedData.map(d => d.label);
    const dataValues = combinedData.map(d => d.value);

    // Calculate Total Net (Profit/Loss) for center text
    const totalRev = Object.values(revenueData).reduce((a, b) => a + b, 0);
    const totalExp = Object.values(expenseData).reduce((a, b) => a + b, 0);
    const netProfit = totalRev - totalExp;

    const colors = combinedData.map(d => {
      if (d.type === 'Revenue') {
        // Gold/Yellow variants for Revenue
        return d.label.includes('Others') ? '#d97706' :
          ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#d97706', '#b45309'][Math.floor(Math.random() * 6)];
      } else {
        // Red variants for Expense
        return d.label.includes('Others') ? '#b91c1c' :
          ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#b91c1c', '#991b1b'][Math.floor(Math.random() * 6)];
      }
    });

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 4,
          spacing: 2,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%', // Slightly thicker ring
        layout: {
          padding: 20
        },
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#374151', // Gray-700
              font: { size: 11, family: "'Inter', sans-serif" },
              padding: 10,
              boxWidth: 10,
              usePointStyle: true,
              generateLabels: (chart) => {
                const data = chart.data;
                if (data.labels?.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i] as number;
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i, false);

                    return {
                      text: label as string, // Just text in legend to keep it clean
                      fillStyle: style.backgroundColor as string,
                      strokeStyle: style.borderColor as string,
                      lineWidth: style.borderWidth as number,
                      hidden: isNaN(value) || (meta.data[i] as any).hidden,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#111827', // Gray-900
            bodyColor: '#374151', // Gray-700
            borderColor: '#e5e7eb', // Gray-200
            borderWidth: 1,
            padding: 12,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return ` ₱${value.toLocaleString()} (${percentage}%)`;
              },
              labelColor: function (context) {
                return {
                  borderColor: 'transparent',
                  backgroundColor: context.dataset.backgroundColor as string | string[],
                  borderWidth: 0,
                  borderRadius: 2,
                } as any;
              }
            }
          },
        }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw: function (chart) {
          const width = chart.width,
            height = chart.height,
            ctx = chart.ctx;

          ctx.restore();

          // Net Profit Label
          const fontSizeLabel = (height / 160).toFixed(2);
          ctx.font = `bold ${fontSizeLabel}em sans-serif`;
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          ctx.fillStyle = "#6b7280"; // Gray-500

          const textLabel = "Net Profit";
          const textXLabel = Math.round((width - (chart.legend?.width || 0)) / 2); // Center in chart area excluding legend
          const textYLabel = height / 2 - 15;
          ctx.fillText(textLabel, textXLabel, textYLabel);

          // Net Profit Value
          const fontSizeValue = (height / 100).toFixed(2);
          ctx.font = `bold ${fontSizeValue}em sans-serif`;
          ctx.fillStyle = netProfit >= 0 ? "#10b981" : "#ef4444"; // Green or Red

          const textValue = `₱${(netProfit / 1000).toFixed(1)}k`;
          const textYValue = height / 2 + 15;
          ctx.fillText(textValue, textXLabel, textYValue);

          ctx.save();
        }
      }]
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [revenueData, expenseData]);

  return <canvas ref={chartRef} style={{ width: '100%', height: '350px' }}></canvas>;
};
