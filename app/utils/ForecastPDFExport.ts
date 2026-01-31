/**
 * Forecast PDF Export Utility
 * 
 * Generates a professional PDF report with forecast data,
 * chart image, and optional LLM explanation.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ForecastResult } from './predictiveAnalytics';
import { addPDFHeader } from './PDFHeader';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PDFExportOptions {
    forecastResult: ForecastResult;
    dataType: 'revenue' | 'expense';
    chartImageBase64?: string;
    explanation?: string;
    dateRange?: {
        from: string;
        to: string;
    };
}

export interface CombinedPDFExportOptions {
    revenueForecast: ForecastResult;
    expenseForecast: ForecastResult;
    revenueChartImage?: string;
    expenseChartImage?: string;
    explanation?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format the AI explanation text for PDF output
 */
function formatExplanationForPDF(explanation: string): { sections: { title: string; content: string[] }[] } {
    const sections: { title: string; content: string[] }[] = [];

    // Clean up encoding artifacts
    let cleanText = explanation
        .replace(/[Ø=ÜÈ]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    // Split by numbered sections or headers
    const lines = cleanText.split('\n');
    let currentSection: { title: string; content: string[] } | null = null;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Check if this is a header (ends with colon or starts with number followed by period)
        const isHeader = /^\d+\.\s*[A-Z]/.test(trimmedLine) ||
            /^[A-Z][^.]*:$/.test(trimmedLine) ||
            /^[A-Z][A-Z\s]+:/.test(trimmedLine);

        if (isHeader) {
            if (currentSection) {
                sections.push(currentSection);
            }
            currentSection = {
                title: trimmedLine.replace(/^\d+\.\s*/, '').replace(/:$/, ''),
                content: [],
            };
        } else if (currentSection) {
            // Check if it's a bullet point
            if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                currentSection.content.push(trimmedLine);
            } else {
                currentSection.content.push(trimmedLine);
            }
        } else {
            // No current section, create a default one
            currentSection = {
                title: 'Analysis',
                content: [trimmedLine],
            };
        }
    }

    if (currentSection) {
        sections.push(currentSection);
    }

    return { sections };
}

/**
 * Get trend text without special characters
 */
function getTrendText(trend: string, percentage: number): string {
    const trendWord = trend === 'increasing' ? 'Growing' :
        trend === 'decreasing' ? 'Declining' : 'Stable';
    return `${trendWord} (${Math.abs(percentage)}% annually)`;
}

/**
 * Get confidence level text
 */
function getConfidenceText(confidence: number): string {
    const level = confidence >= 70 ? 'High' : confidence >= 50 ? 'Medium' : 'Low';
    return `${confidence}% (${level})`;
}

// ============================================================================
// SINGLE FORECAST PDF GENERATION
// ============================================================================

/**
 * Generate a single page for a forecast report
 */
async function generateForecastPage(
    doc: jsPDF,
    options: PDFExportOptions,
    isFirstPage: boolean
): Promise<void> {
    const { forecastResult, dataType, chartImageBase64, explanation } = options;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Add Standard Header
    let yPos = isFirstPage ? await addPDFHeader(doc) : 40;

    // Generated Date (smaller, italic)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    const dateStr = new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Generated: ${dateStr}`, margin, yPos);
    yPos += 12;

    // Report Type Heading (simple text, no badge)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55); // Dark gray #1F2937
    const reportTitle = dataType === 'revenue' ? 'Revenue Forecast Report' : 'Expense Forecast Report';
    doc.text(reportTitle, margin, yPos);
    yPos += 12;

    // Executive Summary as Table (compact, readable)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', margin, yPos);
    yPos += 5;

    const summaryData = [
        ['Trend', getTrendText(forecastResult.trend, forecastResult.trendPercentage)],
        ['Next Month Prediction', `₱${forecastResult.nextMonthPrediction.toLocaleString()}`],
        ['Confidence', getConfidenceText(forecastResult.confidence)],
        ['Historical Average', `₱${Math.round(forecastResult.averageHistorical).toLocaleString()}`],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        styles: {
            fontSize: 9,
            cellPadding: 4,
        },
        headStyles: {
            fillColor: [107, 114, 128],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' },
            1: { cellWidth: 80 },
        },
        tableWidth: 140,
        margin: { left: margin },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 12;

    // Chart Section
    if (chartImageBase64) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Forecast Visualization', margin, yPos);
        yPos += 5;

        // Add chart frame
        const chartHeight = 65;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, yPos, contentWidth, chartHeight + 4, 2, 2, 'S');

        // Add chart image
        try {
            doc.addImage(chartImageBase64, 'PNG', margin + 2, yPos + 2, contentWidth - 4, chartHeight);
            yPos += chartHeight + 10;
        } catch (error) {
            console.error('Failed to add chart image:', error);
            yPos += 10;
        }
    }

    // Data Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Monthly Breakdown', margin, yPos);
    yPos += 5;

    // Prepare table data
    const tableData: (string | number)[][] = [];

    // Add historical data
    forecastResult.historical.forEach(d => {
        tableData.push([
            d.label,
            `₱${d.y.toLocaleString()}`,
            'Actual',
            '-',
        ]);
    });

    // Add forecast data
    forecastResult.forecast.forEach((d, i) => {
        const prevValue = i === 0
            ? forecastResult.historical[forecastResult.historical.length - 1].y
            : forecastResult.forecast[i - 1].y;
        const changeFromPrev = prevValue !== 0
            ? ((d.y - prevValue) / prevValue * 100).toFixed(1)
            : '0';

        tableData.push([
            d.label,
            `₱${d.y.toLocaleString()}`,
            'Forecast',
            `${Number(changeFromPrev) >= 0 ? '+' : ''}${changeFromPrev}%`,
        ]);
    });

    autoTable(doc, {
        startY: yPos,
        head: [['Period', 'Amount', 'Type', 'Change']],
        body: tableData.slice(-8), // Show last 5 historical + 3 forecast
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [17, 24, 39],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251],
        },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 50, halign: 'right' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 35, halign: 'center' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                if (data.cell.raw === 'Forecast') {
                    data.cell.styles.fontStyle = 'italic';
                    data.cell.styles.textColor = [249, 115, 22];
                }
            }
        },
    });

    // Get the final Y position after table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // AI Explanation Section (formatted)
    if (explanation) {
        // Check if we need a new page
        if (yPos > 220) {
            doc.addPage();
            yPos = margin;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('AI Analysis', margin, yPos);
        yPos += 8;

        // Parse and format the explanation
        const formatted = formatExplanationForPDF(explanation);

        for (const section of formatted.sections) {
            // Check if we need a new page
            if (yPos > 260) {
                doc.addPage();
                yPos = margin;
            }

            // Section title
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 64, 175); // Blue
            doc.text(section.title, margin + 5, yPos);
            yPos += 5;

            // Section content
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(55, 65, 81); // Gray

            for (const line of section.content) {
                const wrappedLines = doc.splitTextToSize(line, contentWidth - 10);
                for (const wrappedLine of wrappedLines) {
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.text(wrappedLine, margin + 5, yPos);
                    yPos += 4;
                }
            }
            yPos += 3;
        }
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(249, 250, 251);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(
        'Generated by FTMS Predictive Analytics Module',
        margin,
        pageHeight - 7
    );
    doc.text(
        `Algorithm: ${forecastResult.algorithm} | R² Score: ${forecastResult.r2Score}`,
        pageWidth - margin - 70,
        pageHeight - 7
    );
}

/**
 * Generate and download a PDF report for a single forecast
 */
export async function exportForecastToPDF(options: PDFExportOptions): Promise<void> {
    const doc = new jsPDF();

    await generateForecastPage(doc, options, true);

    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ftms_${options.dataType}_forecast_${timestamp}.pdf`;
    doc.save(filename);
}

// ============================================================================
// COMBINED FORECAST PDF GENERATION
// ============================================================================

/**
 * Generate and download a combined PDF report with both revenue and expense forecasts
 */
export async function exportCombinedForecastToPDF(options: CombinedPDFExportOptions): Promise<void> {
    const { revenueForecast, expenseForecast, revenueChartImage, expenseChartImage, explanation } = options;

    const doc = new jsPDF();

    // Page 1: Revenue Forecast
    await generateForecastPage(doc, {
        forecastResult: revenueForecast,
        dataType: 'revenue',
        chartImageBase64: revenueChartImage,
        explanation: explanation,
    }, true);

    // Page 2: Expense Forecast
    doc.addPage();
    await generateForecastPage(doc, {
        forecastResult: expenseForecast,
        dataType: 'expense',
        chartImageBase64: expenseChartImage,
        explanation: undefined, // Only include explanation once
    }, false);

    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ftms_combined_forecast_${timestamp}.pdf`;
    doc.save(filename);
}
