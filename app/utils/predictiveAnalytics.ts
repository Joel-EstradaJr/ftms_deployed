/**
 * Predictive Analytics Utilities
 * 
 * Pure TypeScript implementations of forecasting algorithms.
 * No external ML libraries required.
 */

import { MonthlyAggregate } from '../data/mockAnalyticsData';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DataPoint {
    x: number;      // Time index (e.g., month number)
    y: number;      // Value (e.g., amount)
    label: string;  // Label (e.g., "Jan 2025")
}

export interface ForecastResult {
    historical: DataPoint[];
    forecast: DataPoint[];
    trend: 'increasing' | 'decreasing' | 'stable';
    trendPercentage: number;          // e.g., +5.2 or -3.1
    confidence: number;               // 0-100%
    nextMonthPrediction: number;
    averageHistorical: number;
    r2Score: number;                  // Goodness of fit
    algorithm: string;
}

export interface RegressionResult {
    slope: number;
    intercept: number;
    r2: number;
}

// ============================================================================
// SIMPLE MOVING AVERAGE (SMA)
// ============================================================================

/**
 * Calculate Simple Moving Average
 * @param data Array of values
 * @param period Number of periods to average
 */
export function calculateSMA(data: number[], period: number = 3): number[] {
    if (data.length < period) return data;

    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
    }
    return result;
}

/**
 * Exponential Moving Average for more weight on recent data
 */
export function calculateEMA(data: number[], period: number = 3): number[] {
    if (data.length === 0) return [];

    const multiplier = 2 / (period + 1);
    const result: number[] = [data[0]];

    for (let i = 1; i < data.length; i++) {
        const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
        result.push(ema);
    }
    return result;
}

// ============================================================================
// LINEAR REGRESSION
// ============================================================================

/**
 * Simple linear regression: y = slope * x + intercept
 */
export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
    if (points.length < 2) {
        return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };
    }

    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (const point of points) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumX2 += point.x * point.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R² (coefficient of determination)
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    for (const point of points) {
        const predicted = slope * point.x + intercept;
        ssTotal += (point.y - meanY) ** 2;
        ssResidual += (point.y - predicted) ** 2;
    }

    const r2 = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
}

// ============================================================================
// FORECASTING
// ============================================================================

/**
 * Main forecasting function - combines trend analysis with smoothing
 */
export function forecast(
    aggregates: MonthlyAggregate[],
    periodsToPredict: number = 3
): ForecastResult {
    if (aggregates.length === 0) {
        return {
            historical: [],
            forecast: [],
            trend: 'stable',
            trendPercentage: 0,
            confidence: 0,
            nextMonthPrediction: 0,
            averageHistorical: 0,
            r2Score: 0,
            algorithm: 'linear_regression',
        };
    }

    // Prepare historical data points
    const historical: DataPoint[] = aggregates.map((agg, index) => ({
        x: index,
        y: agg.totalAmount,
        label: formatMonthLabel(agg.year, agg.monthNum),
    }));

    // Extract values for calculations
    const values = historical.map(d => d.y);
    const averageHistorical = values.reduce((a, b) => a + b, 0) / values.length;

    // Perform linear regression
    const regressionPoints = historical.map(d => ({ x: d.x, y: d.y }));
    const regression = linearRegression(regressionPoints);

    // Generate forecasts
    const forecast: DataPoint[] = [];
    const lastAgg = aggregates[aggregates.length - 1];
    let currentYear = lastAgg.year;
    let currentMonth = lastAgg.monthNum;

    for (let i = 0; i < periodsToPredict; i++) {
        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }

        const x = historical.length + i;
        const predictedValue = regression.slope * x + regression.intercept;

        // Add some seasonal adjustment based on historical patterns
        const seasonalFactor = calculateSeasonalFactor(aggregates, currentMonth);
        const adjustedValue = predictedValue * seasonalFactor;

        forecast.push({
            x,
            y: Math.max(0, Math.round(adjustedValue)),
            label: formatMonthLabel(currentYear, currentMonth),
        });
    }

    // Determine trend
    const trendPercentage = (regression.slope / averageHistorical) * 100 * 12; // Annualized
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (trendPercentage > 2) trend = 'increasing';
    else if (trendPercentage < -2) trend = 'decreasing';
    else trend = 'stable';

    // Calculate confidence based on R² and data consistency
    const confidence = calculateConfidence(regression.r2, values);

    return {
        historical,
        forecast,
        trend,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
        confidence,
        nextMonthPrediction: forecast[0]?.y || 0,
        averageHistorical: Math.round(averageHistorical),
        r2Score: Math.round(regression.r2 * 100) / 100,
        algorithm: 'linear_regression',
    };
}

/**
 * Calculate seasonal adjustment factor for a given month
 */
function calculateSeasonalFactor(aggregates: MonthlyAggregate[], targetMonth: number): number {
    // Find all data points for this month
    const sameMonthData = aggregates.filter(a => a.monthNum === targetMonth);
    if (sameMonthData.length === 0) return 1;

    const avgForMonth = sameMonthData.reduce((sum, a) => sum + a.totalAmount, 0) / sameMonthData.length;
    const overallAvg = aggregates.reduce((sum, a) => sum + a.totalAmount, 0) / aggregates.length;

    if (overallAvg === 0) return 1;
    return avgForMonth / overallAvg;
}

/**
 * Calculate confidence score (0-100%)
 */
function calculateConfidence(r2: number, values: number[]): number {
    // Base confidence from R²
    let confidence = r2 * 60; // R² contributes up to 60%

    // Add bonus for data consistency (low coefficient of variation)
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;

    // Lower CV = more consistent = higher confidence
    confidence += Math.max(0, (1 - cv) * 25);

    // Bonus for having more data points
    confidence += Math.min(values.length, 12) * 1.25;

    return Math.min(95, Math.max(10, Math.round(confidence)));
}

/**
 * Format month label for display
 */
function formatMonthLabel(year: number, month: number): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month - 1]} ${year}`;
}

// ============================================================================
// SUMMARY GENERATION (For LLM prompt context)
// ============================================================================

/**
 * Generate a text summary of the forecast for LLM context
 */
export function generateForecastSummary(
    forecastResult: ForecastResult,
    dataType: 'revenue' | 'expense'
): string {
    const { historical, forecast, trend, trendPercentage, confidence, averageHistorical } = forecastResult;

    const typeLabel = dataType === 'revenue' ? 'Revenue' : 'Expense';
    const trendWord = trend === 'increasing' ? 'increasing' :
        trend === 'decreasing' ? 'decreasing' : 'relatively stable';

    const lastHistorical = historical[historical.length - 1];
    const nextForecast = forecast[0];

    let summary = `${typeLabel} Analysis Summary:\n`;
    summary += `- Historical data spans ${historical.length} months\n`;
    summary += `- Average monthly ${typeLabel.toLowerCase()}: ₱${averageHistorical.toLocaleString()}\n`;
    summary += `- Most recent month (${lastHistorical?.label}): ₱${lastHistorical?.y.toLocaleString()}\n`;
    summary += `- Trend: ${trendWord} at ${Math.abs(trendPercentage)}% annually\n`;
    summary += `- Forecast for ${nextForecast?.label}: ₱${nextForecast?.y.toLocaleString()}\n`;
    summary += `- Prediction confidence: ${confidence}%\n`;

    // Add forecast details
    summary += `\nMonthly Forecasts:\n`;
    for (const f of forecast) {
        const changeFromAvg = ((f.y - averageHistorical) / averageHistorical * 100).toFixed(1);
        summary += `  ${f.label}: ₱${f.y.toLocaleString()} (${changeFromAvg}% vs avg)\n`;
    }

    return summary;
}
