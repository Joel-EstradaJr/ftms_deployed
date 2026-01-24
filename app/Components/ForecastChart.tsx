"use client";

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartOptions,
    ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DataPoint } from '../utils/predictiveAnalytics';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// ============================================================================
// INTERFACES
// ============================================================================

interface ForecastChartProps {
    historical: DataPoint[];
    forecast: DataPoint[];
    dataType: 'revenue' | 'expense';
    height?: number;
}

export interface ForecastChartRef {
    getChartImage: () => string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ForecastChart = forwardRef<ForecastChartRef, ForecastChartProps>(
    ({ historical, forecast, dataType, height = 300 }, ref) => {
        const chartRef = useRef<ChartJS<'line'> | null>(null);

        // Expose method to get chart as image
        useImperativeHandle(ref, () => ({
            getChartImage: () => {
                if (chartRef.current) {
                    return chartRef.current.toBase64Image();
                }
                return null;
            },
        }));

        // Combine labels
        const allLabels = [
            ...historical.map(d => d.label),
            ...forecast.map(d => d.label),
        ];

        // Historical data with null padding for forecast period
        const historicalValues = [
            ...historical.map(d => d.y),
            ...forecast.map(() => null),
        ];

        // Forecast data with null padding for historical period
        // Connect to last historical point for smooth transition
        const forecastValues = [
            ...historical.slice(0, -1).map(() => null),
            historical[historical.length - 1]?.y ?? null,
            ...forecast.map(d => d.y),
        ];

        // Colors based on data type
        const colors = dataType === 'revenue'
            ? {
                primary: 'rgba(34, 197, 94, 1)',      // Green
                primaryLight: 'rgba(34, 197, 94, 0.1)',
                secondary: 'rgba(16, 185, 129, 1)',   // Emerald
                secondaryLight: 'rgba(16, 185, 129, 0.2)',
            }
            : {
                primary: 'rgba(239, 68, 68, 1)',      // Red
                primaryLight: 'rgba(239, 68, 68, 0.1)',
                secondary: 'rgba(249, 115, 22, 1)',   // Orange
                secondaryLight: 'rgba(249, 115, 22, 0.2)',
            };

        const data: ChartData<'line'> = {
            labels: allLabels,
            datasets: [
                {
                    label: `Historical ${dataType === 'revenue' ? 'Revenue' : 'Expenses'}`,
                    data: historicalValues,
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: colors.primary,
                    borderWidth: 2,
                },
                {
                    label: 'Forecast',
                    data: forecastValues,
                    borderColor: colors.secondary,
                    backgroundColor: colors.secondaryLight,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: colors.secondary,
                    pointStyle: 'triangle',
                    borderWidth: 2,
                    borderDash: [5, 5],
                },
            ],
        };

        const options: ChartOptions<'line'> = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            weight: 500,
                        },
                    },
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 12,
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed.y;
                            if (value === null) return '';
                            return `${context.dataset.label}: ₱${value.toLocaleString()}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        font: { size: 11 },
                        maxRotation: 45,
                        minRotation: 0,
                    },
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)',
                    },
                    ticks: {
                        font: { size: 11 },
                        callback: (value) => `₱${(Number(value) / 1000).toFixed(0)}k`,
                    },
                },
            },
        };

        return (
            <div style={{ height: `${height}px`, width: '100%' }}>
                <Line
                    ref={(ref) => {
                        if (ref) {
                            chartRef.current = ref;
                        }
                    }}
                    data={data}
                    options={options}
                />
            </div>
        );
    }
);

ForecastChart.displayName = 'ForecastChart';

export default ForecastChart;
