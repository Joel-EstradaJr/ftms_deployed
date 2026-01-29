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

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generate and download a PDF report for the forecast
 */
export async function exportForecastToPDF(options: PDFExportOptions): Promise<void> {
    const { forecastResult, dataType, chartImageBase64, explanation, dateRange } = options;
    const doc = new jsPDF();

    // Constants
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Add Standard Header
    let yPos = await addPDFHeader(doc);

    // Report Meta (Date)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const dateStr = new Date().toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`Generated: ${dateStr}`, margin, yPos);
    yPos += 10;

    yPos = 55;
    doc.setTextColor(0, 0, 0);

    // Report Type Badge
    const typeLabel = dataType === 'revenue' ? 'Revenue Forecast' : 'Expense Forecast';
    const badgeColor = dataType === 'revenue' ? [34, 197, 94] : [239, 68, 68];

    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    doc.roundedRect(margin, yPos, 60, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(typeLabel.toUpperCase(), margin + 5, yPos + 6);

    yPos += 20;
    doc.setTextColor(0, 0, 0);

    // Summary Cards Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, yPos);
    yPos += 8;

    // Draw summary cards
    const cardWidth = (contentWidth - 10) / 3;
    const cardHeight = 35;
    const cards = [
        {
            title: 'Trend',
            value: forecastResult.trend === 'increasing' ? '↑ Growing' :
                forecastResult.trend === 'decreasing' ? '↓ Declining' : '→ Stable',
            subtitle: `${Math.abs(forecastResult.trendPercentage)}% annually`,
            color: forecastResult.trend === 'increasing' ? [34, 197, 94] :
                forecastResult.trend === 'decreasing' ? [239, 68, 68] : [156, 163, 175],
        },
        {
            title: 'Next Month',
            value: `₱${forecastResult.nextMonthPrediction.toLocaleString()}`,
            subtitle: forecastResult.forecast[0]?.label || 'N/A',
            color: [59, 130, 246],
        },
        {
            title: 'Confidence',
            value: `${forecastResult.confidence}%`,
            subtitle: forecastResult.confidence >= 70 ? 'High' : forecastResult.confidence >= 50 ? 'Medium' : 'Low',
            color: forecastResult.confidence >= 70 ? [34, 197, 94] :
                forecastResult.confidence >= 50 ? [249, 115, 22] : [239, 68, 68],
        },
    ];

    cards.forEach((card, index) => {
        const cardX = margin + (index * (cardWidth + 5));

        // Card background
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 3, 3, 'F');

        // Card accent line
        doc.setFillColor(card.color[0], card.color[1], card.color[2]);
        doc.rect(cardX, yPos, 3, cardHeight, 'F');

        // Card content
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(card.title, cardX + 8, yPos + 10);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(17, 24, 39);
        doc.text(card.value, cardX + 8, yPos + 22);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(156, 163, 175);
        doc.text(card.subtitle, cardX + 8, yPos + 30);
    });

    yPos += cardHeight + 15;
    doc.setTextColor(0, 0, 0);

    // Chart Section
    if (chartImageBase64) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Forecast Visualization', margin, yPos);
        yPos += 5;

        // Add chart image
        try {
            const chartHeight = 70;
            doc.addImage(chartImageBase64, 'PNG', margin, yPos, contentWidth, chartHeight);
            yPos += chartHeight + 10;
        } catch (error) {
            console.error('Failed to add chart image:', error);
            yPos += 5;
        }
    }

    // Data Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
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
        const changeFromPrev = i === 0
            ? ((d.y - forecastResult.historical[forecastResult.historical.length - 1].y) /
                forecastResult.historical[forecastResult.historical.length - 1].y * 100).toFixed(1)
            : ((d.y - forecastResult.forecast[i - 1].y) / forecastResult.forecast[i - 1].y * 100).toFixed(1);

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
            cellPadding: 4,
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

    // AI Explanation Section
    if (explanation) {
        // Check if we need a new page
        if (yPos > 220) {
            doc.addPage();
            yPos = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('AI Analysis', margin, yPos);
        yPos += 8;

        // Explanation box
        doc.setFillColor(239, 246, 255);
        const explanationLines = doc.splitTextToSize(explanation, contentWidth - 10);
        const boxHeight = Math.min(explanationLines.length * 5 + 10, 60);
        doc.roundedRect(margin, yPos, contentWidth, boxHeight, 3, 3, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 58, 138);
        doc.text(explanationLines.slice(0, 10), margin + 5, yPos + 8);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(249, 250, 251);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

    doc.setFontSize(8);
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

    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ftms_${dataType}_forecast_${timestamp}.pdf`;
    doc.save(filename);
}
