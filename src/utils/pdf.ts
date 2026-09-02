import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfExportOptions {
  format?: 'a4' | 'a5';
  orientation?: 'p' | 'l';
  marginMm?: number;
}

export async function exportElementToPdf(
  elementId: string,
  filename: string,
  options?: PdfExportOptions
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Document element not found for PDF export');
  }

  const format = options?.format || 'a4';
  const orientation = options?.orientation || 'p';
  const marginMm = options?.marginMm !== undefined ? options.marginMm : 0;

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc, clonedElement) => {
        // 1. Replace oklch(...) in all <style> tags of the cloned document to prevent html2canvas CSS parsing crashes
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach((style) => {
          if (style.textContent && /oklch/i.test(style.textContent)) {
            style.textContent = style.textContent.replace(
              /oklch\s*\([^)]+\)/gi,
              'rgb(100, 100, 100)'
            );
          }
        });

        // 2. Replace oklch in inline style attributes if any exist
        const allClonedNodes = clonedDoc.querySelectorAll('*');
        allClonedNodes.forEach((node) => {
          const styleAttr = node.getAttribute('style');
          if (styleAttr && /oklch/i.test(styleAttr)) {
            node.setAttribute(
              'style',
              styleAttr.replace(/oklch\s*\([^)]+\)/gi, 'rgb(100, 100, 100)')
            );
          }
        });

        // 3. Inline resolved computed RGB colors from original DOM to preserve exact visual colors
        const originalAll = element.querySelectorAll('*');
        const clonedAll = clonedElement.querySelectorAll('*');

        const applyComputedRgb = (orig: Element, clone: HTMLElement) => {
          try {
            const cs = window.getComputedStyle(orig);
            if (cs.color && cs.color.includes('rgb')) {
              clone.style.color = cs.color;
            }
            if (cs.backgroundColor && cs.backgroundColor.includes('rgb')) {
              clone.style.backgroundColor = cs.backgroundColor;
            }
            if (cs.borderColor && cs.borderColor.includes('rgb')) {
              clone.style.borderColor = cs.borderColor;
            }
          } catch (e) {
            // ignore
          }
        };

        if (clonedElement instanceof HTMLElement) {
          applyComputedRgb(element, clonedElement);
        }

        originalAll.forEach((orig, idx) => {
          const clone = clonedAll[idx] as HTMLElement | undefined;
          if (clone) {
            applyComputedRgb(orig, clone);
          }
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF(orientation, 'mm', format);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const availableWidth = pdfWidth - marginMm * 2;
    const availableHeight = pdfHeight - marginMm * 2;

    let renderWidth = availableWidth;
    let renderHeight = (canvas.height * renderWidth) / canvas.width;

    // If height exceeds 1 page, scale down proportionally so it fits completely on 1 single page
    if (renderHeight > availableHeight) {
      const scaleFactor = availableHeight / renderHeight;
      renderHeight = availableHeight;
      renderWidth = renderWidth * scaleFactor;
    }

    // Horizontally center on page
    const posX = marginMm + (availableWidth - renderWidth) / 2;
    const posY = marginMm;

    pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    // Fallback to native print dialog
    window.print();
  }
}

export function printDocument(): void {
  window.print();
}

/**
 * Cleanly prints a target DOM element in an isolated hidden iframe
 * ensuring no background dashboard or outer layout elements ever leak into the printout.
 */
export function printElementIsolated(
  elementId: string,
  documentTitle?: string,
  pageSize: 'a4' | 'a5' = 'a4'
): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with id "${elementId}" not found for isolated print. Falling back to window.print().`);
    window.print();
    return;
  }

  try {
    // 1. Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    // 2. Collect stylesheets and font links from main document
    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    // 3. Write standalone HTML into the iframe
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle || 'รายงานสรุปค่าใช้จ่ายประจำเดือน'}</title>
  ${headStyles}
  <style>
    @page {
      size: ${pageSize === 'a5' ? 'A5 portrait' : 'A4 portrait'};
      margin: ${pageSize === 'a5' ? '8mm 8mm' : '12mm 15mm'};
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #0D2B52 !important;
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      width: 100% !important;
      min-height: auto !important;
    }
    #print-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      box-shadow: none !important;
      border: none !important;
    }
    #print-container > div {
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: auto !important;
    }
    .no-print {
      display: none !important;
    }
    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    thead {
      display: table-header-group !important;
    }
    tfoot {
      display: table-footer-group !important;
    }
  </style>
</head>
<body>
  <div id="print-container">
    ${element.outerHTML}
  </div>
</body>
</html>`);
    doc.close();

    // 4. Trigger print once iframe resources are settled
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error during isolated iframe print:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 200);
  } catch (err) {
    console.error('Failed to setup isolated print iframe:', err);
    window.print();
  }
}

