import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPdf(
  elementId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Document element not found for PDF export');
  }

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
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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

