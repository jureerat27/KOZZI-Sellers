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
  const marginMm = options?.marginMm !== undefined ? options.marginMm : (format === 'a5' ? 5 : 0);

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5, // Crisp high resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc, clonedElement) => {
        // 1. Convert all external <link rel="stylesheet"> into inline <style> tags with oklch sanitized
        // In production builds, CSS is bundled into <link> stylesheets which html2canvas parses
        const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
        linkTags.forEach((link) => {
          const href = link.getAttribute('href') || '';
          let fullCss = '';

          // Look through document.styleSheets and clonedDoc.styleSheets to extract parsed CSS rules
          const allSheets = [...Array.from(document.styleSheets), ...Array.from(clonedDoc.styleSheets)];
          for (const sheet of allSheets) {
            try {
              if (sheet.href && href && (sheet.href.includes(href) || href.includes(sheet.href))) {
                const rules = sheet.cssRules || sheet.rules;
                if (rules && rules.length > 0) {
                  fullCss = Array.from(rules).map((r) => r.cssText).join('\n');
                  if (fullCss) break;
                }
              }
            } catch (e) {
              // ignore cross-origin stylesheet access restrictions
            }
          }

          // If extracted CSS rules, replace oklch and replace the <link> with a <style> tag
          if (fullCss) {
            const styleEl = clonedDoc.createElement('style');
            styleEl.textContent = fullCss.replace(/oklch\s*\([^)]+\)/gi, 'rgb(100, 100, 100)');
            link.parentNode?.replaceChild(styleEl, link);
          }
        });

        // 2. Scan all clonedDoc.styleSheets directly for any remaining oklch rules and sanitize
        try {
          const sheets = Array.from(clonedDoc.styleSheets);
          sheets.forEach((sheet) => {
            try {
              const rules = sheet.cssRules || sheet.rules;
              if (rules) {
                let hasOklch = false;
                let sheetCss = '';
                for (let i = 0; i < rules.length; i++) {
                  const ruleText = rules[i].cssText;
                  sheetCss += ruleText + '\n';
                  if (/oklch/i.test(ruleText)) {
                    hasOklch = true;
                  }
                }
                if (hasOklch && sheet.ownerNode && sheet.ownerNode.parentNode) {
                  const styleEl = clonedDoc.createElement('style');
                  styleEl.textContent = sheetCss.replace(/oklch\s*\([^)]+\)/gi, 'rgb(100, 100, 100)');
                  sheet.ownerNode.parentNode.replaceChild(styleEl, sheet.ownerNode);
                }
              }
            } catch (e) {
              // ignore
            }
          });
        } catch (e) {
          // ignore
        }

        // 3. Replace oklch(...) in all <style> tags of the cloned document
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach((style) => {
          if (style.textContent && /oklch/i.test(style.textContent)) {
            style.textContent = style.textContent.replace(
              /oklch\s*\([^)]+\)/gi,
              'rgb(100, 100, 100)'
            );
          }
        });

        // 4. Replace oklch in inline style attributes if any exist
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

        // 5. Inline resolved computed RGB colors from original DOM to preserve exact visual colors
        const originalAll = element.querySelectorAll('*');
        const clonedAll = clonedElement.querySelectorAll('*');

        const applyComputedRgb = (orig: Element, clone: HTMLElement) => {
          try {
            const cs = window.getComputedStyle(orig);
            if (cs.color && cs.color.includes('rgb') && !/oklch/i.test(cs.color)) {
              clone.style.color = cs.color;
            }
            if (cs.backgroundColor && cs.backgroundColor.includes('rgb') && !/oklch/i.test(cs.backgroundColor)) {
              clone.style.backgroundColor = cs.backgroundColor;
            }
            if (cs.borderColor && cs.borderColor.includes('rgb') && !/oklch/i.test(cs.borderColor)) {
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

    // Top-aligned on page
    const posX = marginMm + (availableWidth - renderWidth) / 2;
    const posY = marginMm;

    pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    // Fallback to isolated print
    printElementIsolated(elementId, filename, format);
  }
}

export function printDocument(): void {
  window.print();
}

/**
 * Cleanly prints a target DOM element in an isolated hidden iframe
 * ensuring no background dashboard or outer layout elements ever leak into the printout,
 * while matching the preview layout and colors 100%.
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

    // 3. Write standalone HTML into the iframe with matching fonts and print rules
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle || 'ใบสำคัญจ่าย'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${headStyles}
  <style>
    @page {
      size: ${pageSize === 'a5' ? 'A5 portrait' : 'A4 portrait'};
      margin: ${pageSize === 'a5' ? '6mm 6mm' : '12mm 15mm'};
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
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
      margin: 0 auto !important;
      padding: 0 !important;
      background: #ffffff !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    #print-container > div,
    #payment-voucher-container {
      box-shadow: none !important;
      margin: 0 auto !important;
      width: 100% !important;
      max-width: 100% !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .no-print {
      display: none !important;
    }
    table, tr, td, th, tbody, thead, tfoot {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
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

    // 4. Trigger print once iframe resources and fonts (Sarabun) are fully loaded
    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
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
        }, 1200);
      }
    };

    // Use document.fonts.ready from the iframe to guarantee Sarabun font is fully rendered
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc && 'fonts' in iframeDoc && iframeDoc.fonts && typeof iframeDoc.fonts.ready?.then === 'function') {
      iframeDoc.fonts.ready
        .then(() => {
          // Slight 50ms buffer for layout paint
          setTimeout(triggerPrint, 50);
        })
        .catch(() => {
          triggerPrint();
        });
      // Fallback timeout in case fonts.ready hangs or takes too long
      setTimeout(triggerPrint, 600);
    } else {
      // Fallback for browsers without document.fonts API
      setTimeout(triggerPrint, 250);
    }
  } catch (err) {
    console.error('Failed to setup isolated print iframe:', err);
    window.print();
  }
}

