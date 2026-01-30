"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForecastChart, { ForecastChartRef } from './ForecastChart';
import {
    getDefaultHistoricalData,
    MOCK_REVENUE_TYPES,
    MOCK_EXPENSE_TYPES
} from '../data/mockAnalyticsData';
import { forecast, ForecastResult } from '../utils/predictiveAnalytics';
import { exportForecastToPDF, exportCombinedForecastToPDF } from '../utils/ForecastPDFExport';
import {
    generateForecastExplanation,
    generateFallbackExplanation
} from '../services/geminiService';
import { useForecastData } from '../hooks/useDashboardData';

// ============================================================================
// TYPES
// ============================================================================

export type PredictiveDataType = 'revenue' | 'expense' | 'both';

interface PredictiveAnalyticsCardProps {
    dataType: PredictiveDataType;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
    container: {
        backgroundColor: 'var(--foreground-color)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--box-shadow)',
        marginTop: '24px',
    } as React.CSSProperties,

    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        gap: '12px',
    } as React.CSSProperties,

    title: {
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--primary-text-color)',
    } as React.CSSProperties,

    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
    } as React.CSSProperties,

    metricCard: {
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'var(--background-color)',
        border: '4px solid',
    } as React.CSSProperties,

    metricLabel: {
        fontSize: '0.75rem',
        color: 'var(--secondary-text-color)',
        marginBottom: '4px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
    } as React.CSSProperties,

    metricValue: {
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--primary-text-color)',
    } as React.CSSProperties,

    metricSubtext: {
        fontSize: '0.75rem',
        color: 'var(--secondary-text-color)',
        marginTop: '2px',
    } as React.CSSProperties,

    chartContainer: {
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: 'var(--background-color)',
        borderRadius: '12px',
    } as React.CSSProperties,

    chartsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '24px',
    } as React.CSSProperties,

    chartBox: {
        padding: '16px',
        backgroundColor: 'var(--background-color)',
        boxShadow: 'var(--box-shadow)',
        borderRadius: '12px',
    } as React.CSSProperties,

    chartTitle: {
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'var(--primary-text-color)',
        marginBottom: '12px',
        textAlign: 'center' as const,
    } as React.CSSProperties,

    buttonGroup: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap' as const,
    } as React.CSSProperties,

    button: (variant: 'primary' | 'secondary') => ({
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '8px',
        border: variant === 'secondary' ? '1px solid var(--border-color)' : 'none',
        backgroundColor: variant === 'primary' ? 'var(--primary-color)' : 'var(--foreground-color)',
        color: variant === 'primary' ? 'var(--button-font-color)' : 'var(--primary-text-color)',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    } as React.CSSProperties),

    explanationBox: {
        marginTop: '20px',
        padding: '20px',
        backgroundColor: 'var(--info-chip-bg-color)',
        borderRadius: '12px',
        borderLeft: '4px solid var(--info-color)',
    } as React.CSSProperties,

    explanationTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'var(--info-chip-text-color)',
        marginBottom: '12px',
    } as React.CSSProperties,

    explanationText: {
        fontSize: '0.875rem',
        color: 'var(--info-chip-text-color)',
        lineHeight: 1.6,
        whiteSpace: 'pre-line' as const,
    } as React.CSSProperties,

    loading: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: 'var(--secondary-text-color)',
    } as React.CSSProperties,

    spinner: {
        width: '24px',
        height: '24px',
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--primary-color)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: '12px',
    } as React.CSSProperties,

    comparisonGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '24px',
        marginBottom: '24px',
    } as React.CSSProperties,

    comparisonColumn: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    } as React.CSSProperties,

    comparisonHeader: {
        fontSize: '0.875rem',
        fontWeight: 600,
        padding: '8px 12px',
        borderRadius: '8px',
        textAlign: 'center' as const,
    } as React.CSSProperties,
};

// ============================================================================
// COMPONENT
// ============================================================================

const PredictiveAnalyticsCard: React.FC<PredictiveAnalyticsCardProps> = ({ dataType }) => {
    // State
    const [revenueForecast, setRevenueForecast] = useState<ForecastResult | null>(null);
    const [expenseForecast, setExpenseForecast] = useState<ForecastResult | null>(null);
    const [explanation, setExplanation] = useState<string>('');
    const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Refs
    const revenueChartRef = useRef<ForecastChartRef>(null);
    const expenseChartRef = useRef<ForecastChartRef>(null);

    // Fetch live data from API (12 months history by default)
    const { data: apiData, isError: isApiError, isLoading: isApiLoading } = useForecastData(12);

    // Load and compute forecast
    useEffect(() => {
        let revenueAggregates, expenseAggregates;

        if (apiData && !isApiError) {
            // Use API data
            revenueAggregates = apiData.revenueAggregates;
            expenseAggregates = apiData.expenseAggregates;
        } else if (!isApiLoading) {
            // Fallback to mock data if API missing or error
            const mockData = getDefaultHistoricalData();
            revenueAggregates = mockData.revenueAggregates;
            expenseAggregates = mockData.expenseAggregates;
        } else {
            // Still loading API, wait...
            return;
        }

        // Generate forecasts using the algorithm
        if (dataType === 'both') {
            setRevenueForecast(forecast(revenueAggregates, 3));
            setExpenseForecast(forecast(expenseAggregates, 3));
        } else if (dataType === 'revenue') {
            setRevenueForecast(forecast(revenueAggregates, 3));
            setExpenseForecast(null);
        } else {
            setRevenueForecast(null);
            setExpenseForecast(forecast(expenseAggregates, 3));
        }

        setShowExplanation(false);
        setExplanation('');
    }, [dataType, apiData, isApiError, isApiLoading]);

    // Get the primary forecast result for single view
    const primaryForecast = dataType === 'expense' ? expenseForecast : revenueForecast;
    const primaryType = dataType === 'expense' ? 'expense' : 'revenue';

    // Handle AI explanation
    const handleExplain = useCallback(async () => {
        setIsLoadingExplanation(true);
        setShowExplanation(true);

        if (dataType === 'both' && revenueForecast && expenseForecast) {
            // Combined explanation for both
            const revResult = await generateForecastExplanation(revenueForecast, 'revenue');
            const expResult = await generateForecastExplanation(expenseForecast, 'expense');

            if (revResult.success && expResult.success) {
                setExplanation(`📈 REVENUE ANALYSIS:\n${revResult.explanation}\n\n📉 EXPENSE ANALYSIS:\n${expResult.explanation}`);
            } else {
                const revFallback = generateFallbackExplanation(revenueForecast, 'revenue');
                const expFallback = generateFallbackExplanation(expenseForecast, 'expense');
                setExplanation(`📈 REVENUE ANALYSIS:\n${revFallback}\n\n📉 EXPENSE ANALYSIS:\n${expFallback}`);
            }
        } else if (primaryForecast) {
            const result = await generateForecastExplanation(primaryForecast, primaryType);
            if (result.success) {
                setExplanation(result.explanation);
            } else {
                setExplanation(generateFallbackExplanation(primaryForecast, primaryType));
            }
        }

        setIsLoadingExplanation(false);
    }, [dataType, revenueForecast, expenseForecast, primaryForecast, primaryType]);

    // Handle PDF export
    const handleExportPDF = useCallback(async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));

        if (dataType === 'both' && revenueForecast && expenseForecast) {
            // Export combined PDF with both forecasts (single file, two pages)
            const revChartImage = revenueChartRef.current?.getChartImage() || undefined;
            const expChartImage = expenseChartRef.current?.getChartImage() || undefined;

            await exportCombinedForecastToPDF({
                revenueForecast,
                expenseForecast,
                revenueChartImage: revChartImage,
                expenseChartImage: expChartImage,
                explanation: showExplanation ? explanation : undefined,
            });
        } else if (primaryForecast) {
            const chartRef = dataType === 'expense' ? expenseChartRef : revenueChartRef;
            const chartImage = chartRef.current?.getChartImage() || undefined;
            await exportForecastToPDF({
                forecastResult: primaryForecast,
                dataType: primaryType,
                chartImageBase64: chartImage,
                explanation: showExplanation ? explanation : undefined,
            });
        }

        setIsExporting(false);
    }, [dataType, revenueForecast, expenseForecast, primaryForecast, primaryType, explanation, showExplanation]);

    // Helper functions for metrics
    const getTrendColor = (result: ForecastResult | null) => {
        if (!result) return 'var(--secondary-text-color)';
        return result.trend === 'increasing' ? 'var(--success-color)' :
            result.trend === 'decreasing' ? 'var(--error-color)' : 'var(--secondary-text-color)';
    };

    const getTrendIcon = (result: ForecastResult | null) => {
        if (!result) return '→';
        return result.trend === 'increasing' ? '↑' :
            result.trend === 'decreasing' ? '↓' : '→';
    };

    // Loading state
    const isLoading = dataType === 'both'
        ? !revenueForecast || !expenseForecast
        : !primaryForecast;

    if (isLoading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner} />
                    Loading predictive analytics...
                </div>
            </div>
        );
    }

    // Render metrics for a single forecast
    const renderMetrics = (result: ForecastResult, type: 'revenue' | 'expense', prefix?: string) => (
        <>
            <div style={{ ...styles.metricCard, borderColor: getTrendColor(result) }}>
                <div style={styles.metricLabel}>{prefix}Trend</div>
                <div style={{ ...styles.metricValue, color: getTrendColor(result) }}>
                    {getTrendIcon(result)} {result.trend}
                </div>
                <div style={styles.metricSubtext}>
                    {Math.abs(result.trendPercentage)}% annually
                </div>
            </div>

            <div style={{ ...styles.metricCard, borderColor: type === 'revenue' ? 'var(--success-color)' : 'var(--error-color)' }}>
                <div style={styles.metricLabel}>{prefix}Next Month</div>
                <div style={styles.metricValue}>
                    ₱{(result.nextMonthPrediction / 1000).toFixed(1)}k
                </div>
                <div style={styles.metricSubtext}>
                    {result.forecast[0]?.label}
                </div>
            </div>

            <div style={{ ...styles.metricCard, borderColor: 'var(--info-color)' }}>
                <div style={styles.metricLabel}>{prefix}Monthly Avg</div>
                <div style={styles.metricValue}>
                    ₱{(result.averageHistorical / 1000).toFixed(1)}k
                </div>
                <div style={styles.metricSubtext}>Historical average</div>
            </div>

            <div style={{ ...styles.metricCard, borderColor: result.confidence >= 70 ? 'var(--success-color)' : result.confidence >= 50 ? 'var(--warning-color)' : 'var(--error-color)' }}>
                <div style={styles.metricLabel}>{prefix}Confidence</div>
                <div style={styles.metricValue}>{result.confidence}%</div>
                <div style={styles.metricSubtext}>
                    {result.confidence >= 70 ? 'High' : result.confidence >= 50 ? 'Medium' : 'Low'} confidence
                </div>
            </div>
        </>
    );

    return (
        <div style={styles.container}>
            {/* CSS for spinner animation */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .export-btn:hover { background-color: var(--primary-hover-color) !important; }
                .explain-btn:hover { background-color: var(--background-color) !important; }
            `}</style>

            {/* Header */}
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>Predictive Analytics</h2>
                <span style={{ fontSize: '0.875rem', color: 'var(--secondary-text-color)' }}>
                    {dataType === 'both' ? 'Revenue & Expenses' : dataType === 'revenue' ? 'Revenue' : 'Expenses'}
                </span>
            </div>

            {/* BOTH MODE - Side by Side */}
            {dataType === 'both' && revenueForecast && expenseForecast ? (
                <>
                    {/* Comparison Metrics */}
                    <div style={styles.comparisonGrid}>
                        {/* Revenue Column */}
                        <div style={styles.comparisonColumn}>
                            <div style={{ ...styles.comparisonHeader, backgroundColor: 'var(--success-chip-bg-color)', color: 'var(--success-chip-text-color)' }}>
                                Revenue Forecast
                            </div>
                            <div style={{ ...styles.metricsGrid, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                {renderMetrics(revenueForecast, 'revenue')}
                            </div>
                        </div>

                        {/* Expense Column */}
                        <div style={styles.comparisonColumn}>
                            <div style={{ ...styles.comparisonHeader, backgroundColor: 'var(--error-chip-bg-color)', color: 'var(--error-chip-text-color)' }}>
                                Expense Forecast
                            </div>
                            <div style={{ ...styles.metricsGrid, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                {renderMetrics(expenseForecast, 'expense')}
                            </div>
                        </div>
                    </div>

                    {/* Charts Side by Side */}
                    <div style={styles.chartsRow}>
                        <div style={styles.chartBox}>
                            <div style={{ ...styles.chartTitle, color: 'var(--success-chip-text-color)' }}>Revenue Trend & Forecast</div>
                            <ForecastChart
                                ref={revenueChartRef}
                                historical={revenueForecast.historical}
                                forecast={revenueForecast.forecast}
                                dataType="revenue"
                                height={220}
                            />
                        </div>
                        <div style={styles.chartBox}>
                            <div style={{ ...styles.chartTitle, color: 'var(--error-chip-text-color)' }}>Expense Trend & Forecast</div>
                            <ForecastChart
                                ref={expenseChartRef}
                                historical={expenseForecast.historical}
                                forecast={expenseForecast.forecast}
                                dataType="expense"
                                height={220}
                            />
                        </div>
                    </div>
                </>
            ) : (
                /* SINGLE MODE - Revenue or Expense */
                primaryForecast && (
                    <>
                        {/* Metrics Grid */}
                        <div style={styles.metricsGrid}>
                            {renderMetrics(primaryForecast, primaryType)}
                        </div>

                        {/* Chart */}
                        <div style={styles.chartContainer}>
                            <ForecastChart
                                ref={dataType === 'expense' ? expenseChartRef : revenueChartRef}
                                historical={primaryForecast.historical}
                                forecast={primaryForecast.forecast}
                                dataType={primaryType}
                                height={280}
                            />
                        </div>
                    </>
                )
            )}

            {/* Action Buttons */}
            <div style={styles.buttonGroup}>
                <button
                    className="export-btn"
                    style={styles.button('primary')}
                    onClick={handleExportPDF}
                    disabled={isExporting}
                >
                    {isExporting ? (
                        <>
                            <div style={{ ...styles.spinner, width: '16px', height: '16px', marginRight: '0' }} />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export PDF Report
                        </>
                    )}
                </button>

                <button
                    className="explain-btn"
                    style={styles.button('secondary')}
                    onClick={handleExplain}
                    disabled={isLoadingExplanation}
                >
                    {isLoadingExplanation ? (
                        <>
                            <div style={{ ...styles.spinner, width: '16px', height: '16px', marginRight: '0' }} />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            Explain with AI
                        </>
                    )}
                </button>
            </div>

            {/* AI Explanation Box */}
            {showExplanation && (
                <div style={styles.explanationBox}>
                    <div style={styles.explanationTitle}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                            <path d="m12 8 1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5L12 8" />
                        </svg>
                        AI Analysis
                    </div>
                    {isLoadingExplanation ? (
                        <div style={{ ...styles.loading, padding: '20px 0' }}>
                            <div style={styles.spinner} />
                            Generating insights...
                        </div>
                    ) : (
                        <div style={styles.explanationText}>{explanation}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PredictiveAnalyticsCard;
