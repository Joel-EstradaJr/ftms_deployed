/**
 * Gemini AI Service for Forecast Explanations
 * 
 * Uses Google Gemini API (free tier) to generate
 * human-readable explanations of forecast data.
 */

import { ForecastResult, generateForecastSummary } from '../utils/predictiveAnalytics';

// ============================================================================
// INTERFACES
// ============================================================================

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message: string;
        code: number;
    };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Note: In production, this should be in .env.local
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildForecastPrompt(
    summary: string,
    dataType: 'revenue' | 'expense'
): string {
    const typeLabel = dataType === 'revenue' ? 'revenue' : 'expenses';

    return `You are a financial analyst AI assistant for a Fleet Transportation Management System (FTMS). 
Analyze the following ${typeLabel} forecast data and provide a brief, actionable explanation.

${summary}

Please provide:
1. A 2-3 sentence summary of what the data shows
2. Key factors that might be driving this trend
3. One specific, actionable recommendation

Keep your response concise (under 150 words), professional, and focused on practical insights.
Use Philippine Peso (₱) for any monetary values.
Do not use markdown formatting, just plain text with numbered points.`;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Generate an AI explanation for forecast data using Gemini
 */
export async function generateForecastExplanation(
    forecastResult: ForecastResult,
    dataType: 'revenue' | 'expense'
): Promise<{ success: boolean; explanation: string; error?: string }> {
    // Check for API key
    if (!GEMINI_API_KEY) {
        return {
            success: false,
            explanation: '',
            error: 'Gemini API key not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.',
        };
    }

    try {
        // Generate summary for context
        const summary = generateForecastSummary(forecastResult, dataType);
        const prompt = buildForecastPrompt(summary, dataType);

        // Make API request
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 300,
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();

        // Extract text from response
        const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!explanation) {
            throw new Error('No explanation generated');
        }

        return {
            success: true,
            explanation: explanation.trim(),
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        return {
            success: false,
            explanation: '',
            error: error instanceof Error ? error.message : 'Failed to generate explanation',
        };
    }
}

/**
 * Generate a fallback explanation without using the API
 * Used when API is unavailable or for demo purposes
 */
export function generateFallbackExplanation(
    forecastResult: ForecastResult,
    dataType: 'revenue' | 'expense'
): string {
    const { trend, trendPercentage, confidence, averageHistorical, nextMonthPrediction } = forecastResult;
    const typeLabel = dataType === 'revenue' ? 'Revenue' : 'Expense';

    let analysis = `1. ${typeLabel} Analysis Summary:\n`;

    if (trend === 'increasing') {
        analysis += `Based on the historical data analysis, ${typeLabel.toLowerCase()} shows an upward trend of approximately ${Math.abs(trendPercentage)}% annually. `;
        analysis += dataType === 'revenue'
            ? `This positive growth suggests healthy business expansion.`
            : `This increase in expenses may require budget optimization strategies.`;
    } else if (trend === 'decreasing') {
        analysis += `The data indicates a downward trend of ${Math.abs(trendPercentage)}% annually in ${typeLabel.toLowerCase()}. `;
        analysis += dataType === 'revenue'
            ? `This decline may warrant investigation into market conditions and operational efficiency.`
            : `This reduction could indicate successful cost-cutting measures or reduced operational activity.`;
    } else {
        analysis += `${typeLabel} appears relatively stable with minimal variation from the average of ₱${averageHistorical.toLocaleString()}. `;
        analysis += `This consistency provides a reliable baseline for planning.`;
    }

    analysis += `\n\n2. Key Factors:\n`;
    analysis += dataType === 'revenue'
        ? `- Seasonal patterns in transportation demand\n- Fuel price fluctuations affecting pricing\n- Competition and market conditions`
        : `- Fuel price volatility\n- Maintenance schedule cycles\n- Personnel costs and overtime`;

    analysis += `\n\n3. Recommendation:\n`;
    const change = ((nextMonthPrediction - averageHistorical) / averageHistorical * 100).toFixed(1);
    if (dataType === 'revenue') {
        analysis += Number(change) > 5
            ? `Consider capitalizing on projected growth by increasing marketing efforts for the upcoming period.`
            : Number(change) < -5
                ? `Review pricing strategies and explore new revenue streams to offset the projected decline.`
                : `Maintain current operational strategies while monitoring for seasonal opportunities.`;
    } else {
        analysis += Number(change) > 5
            ? `Review upcoming expense projections and identify areas for potential cost optimization.`
            : Number(change) < -5
                ? `Validate that reduced expense projections won't impact service quality or operational capacity.`
                : `Continue current expense management practices with regular monitoring.`;
    }

    analysis += `\n\nPrediction Confidence: ${confidence}%`;

    return analysis;
}
