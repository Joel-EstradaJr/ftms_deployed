import jsPDF from 'jspdf';

/**
 * Loads an image from a URL and converts it to a base64 string
 */
const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('Could not get canvas context'));
            }
        };
        img.onerror = (error) => {
            reject(error);
        };
    });
};

/**
 * Adds the standardized Agila Bus Transport Corp header to a PDF document.
 * 
 * @param doc The jsPDF instance
 * @returns The Y-position where the header ends (to offset subsequent content)
 */
export const addPDFHeader = async (doc: jsPDF): Promise<number> => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let yPos = 10;

    // --- LOGO ---
    try {
        const logoUrl = '/agilaLogo.png';
        const logoBase64 = await loadImageAsBase64(logoUrl);
        const logoSize = 25;
        doc.addImage(logoBase64, 'PNG', margin, yPos, logoSize, logoSize);
    } catch (error) {
        console.warn('Failed to load Agila logo for PDF:', error);
        // Continue without logo if it fails
    }

    // --- TEXT CONTENT ---
    // Align text to the right of the logo
    const textStartX = margin + 30;
    const headerCenterY = yPos + 12.5; // Vertically center text relative to logo

    // Company Name (Primary Color #961C1E)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(150, 28, 30); // #961C1E
    doc.text('Agila Bus Transport Corp', textStartX, yPos + 8);

    // Address (Secondary Text Color #404040 - approx [64, 64, 64])
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(64, 64, 64);

    // Address Line
    const address = 'IBP Road Towerville City of San Jose Del Monte, Bulacan, Philippines';
    doc.text(address, textStartX, yPos + 14);

    // Contact Line
    const contact = 'Contact No.: 09xx-xxx-xxxx   |   Tel. No: (xx) xxx-xxxx';
    doc.text(contact, textStartX, yPos + 19);

    // Facebook Line
    const facebook = 'Facebook: https://web.facebook.com/profile.php?id=100084745104995';
    doc.text(facebook, textStartX, yPos + 24);

    // Draw a separator line below the header
    yPos += 30; // Move down below logo/text
    doc.setDrawColor(200, 200, 200); // Light gray
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    return yPos + 10; // Return Y position with some padding
};
