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

  // html2canvas วัดตำแหน่งเส้นฐานตัวอักษรด้วย <img> ชั่วคราวใน body แต่ Tailwind ตั้ง img เป็น display:block
  // ทำให้วัดผิดและตัวหนังสือใน PDF ถูกวาดต่ำกว่าจริง (ไม่อยู่กึ่งกลางกรอบ/ไม่ตรงกับไอคอน)
  // แก้โดยให้ img ในกล่องวัดของ html2canvas (div ที่ซ่อนไว้ใต้ body) เป็น inline ระหว่างสร้าง PDF เท่านั้น
  const metricsFix = document.createElement('style');
  metricsFix.textContent = 'body > div[style*="visibility: hidden"] > img { display: inline !important; }';
  document.head.appendChild(metricsFix);

  try {
    const canvas = await html2canvas(element, {
      scale: 2.5, // Crisp high resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc, clonedElement) => {
        // html2canvas อ่านสีแบบใหม่ของ Tailwind v4 (oklch / oklab / color-mix) ไม่ได้
        // วิธีแก้: แปลงสีที่เบราว์เซอร์คำนวณแล้วของทุกองค์ประกอบเป็น rgb จริงด้วย canvas แล้วใส่เป็น inline style
        // และแปลงฟังก์ชันสีแบบใหม่ที่เหลือในสไตล์ชีต/inline style เป็น rgb เพื่อไม่ให้ html2canvas พัง
        const MODERN = /(oklch|oklab|lab|lch|color-mix|color)\(/i;
        // ตัวแปลงสีใดๆ → rgba ด้วย canvas (เบราว์เซอร์แปลงให้เอง)
        const cvs = document.createElement('canvas');
        cvs.width = cvs.height = 1;
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        const cache = new Map<string, string>();
        const toRgb = (c: string): string => {
          if (!c || /^rgba?\(/i.test(c) || c === 'transparent') return c;
          const hit = cache.get(c);
          if (hit) return hit;
          let out = 'transparent';
          if (ctx) {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = '#000';
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
            out = `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
          }
          cache.set(c, out);
          return out;
        };

        // แปลงฟังก์ชันสีแบบใหม่ในข้อความ CSS เป็น rgb (ตัวที่มี var() ซึ่งแปลงไม่ได้จะกลายเป็น transparent)
        const stripModern = (css: string) =>
          css.replace(/(?:oklch|oklab|lab|lch|color-mix|color)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/gi, (m) =>
            /var\(/i.test(m) ? 'transparent' : toRgb(m)
          );

        // 1) แทน <link> สไตล์ชีตด้วย <style> ที่ล้างสีแบบใหม่แล้ว
        const allSheets = Array.from(document.styleSheets);
        Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => {
          const href = link.getAttribute('href') || '';
          for (const sheet of allSheets) {
            try {
              if (sheet.href && href && (sheet.href.includes(href) || href.includes(sheet.href))) {
                const css = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
                const styleEl = clonedDoc.createElement('style');
                styleEl.textContent = stripModern(css);
                link.parentNode?.replaceChild(styleEl, link);
                break;
              }
            } catch {
              /* สไตล์ชีตข้ามโดเมน (เช่น Google Fonts) อ่านไม่ได้ ข้ามไป */
            }
          }
        });
        clonedDoc.querySelectorAll('style').forEach((st) => {
          if (st.textContent && MODERN.test(st.textContent)) st.textContent = stripModern(st.textContent);
        });

        const apply = (orig: Element, clone: HTMLElement) => {
          try {
            const cs = window.getComputedStyle(orig);
            clone.style.color = toRgb(cs.color);
            clone.style.backgroundColor = toRgb(cs.backgroundColor);
            clone.style.borderTopColor = toRgb(cs.borderTopColor);
            clone.style.borderRightColor = toRgb(cs.borderRightColor);
            clone.style.borderBottomColor = toRgb(cs.borderBottomColor);
            clone.style.borderLeftColor = toRgb(cs.borderLeftColor);
            clone.style.outlineColor = toRgb(cs.outlineColor);
            clone.style.textDecorationColor = toRgb(cs.textDecorationColor);
            if (MODERN.test(cs.boxShadow)) clone.style.boxShadow = 'none';
            if (MODERN.test(cs.textShadow)) clone.style.textShadow = 'none';
            if (MODERN.test(cs.backgroundImage)) clone.style.backgroundImage = 'none';
            if (cs.fill && MODERN.test(cs.fill)) clone.style.fill = toRgb(cs.fill);
            if (cs.stroke && MODERN.test(cs.stroke)) clone.style.stroke = toRgb(cs.stroke);
            // ข้อความที่ถูกตัดด้วย truncate: ตัวอักษรไทย (สระล่าง) จะโดนตัดใน PDF จึงปล่อยให้แสดงเต็ม
            if (cs.overflow === 'hidden' && cs.textOverflow === 'ellipsis') {
              clone.style.overflow = 'visible';
              clone.style.textOverflow = 'clip';
            }
          } catch {
            /* ignore */
          }
        };

        // องค์ประกอบที่ html2canvas สร้างแทน ::before/::after จะคัดลอกสีแบบใหม่มาเป็น inline style → แปลงให้หมด
        clonedDoc.querySelectorAll('[style]').forEach((n) => {
          const st = n.getAttribute('style') || '';
          if (MODERN.test(st)) n.setAttribute('style', stripModern(st));
        });

        if (clonedElement instanceof HTMLElement) apply(element, clonedElement);
        const originalAll = element.querySelectorAll('*');
        const clonedAll = clonedElement.querySelectorAll('*');
        originalAll.forEach((orig, idx) => {
          const clone = clonedAll[idx] as HTMLElement | undefined;
          if (clone && clone.style) apply(orig, clone);
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
  finally {
    metricsFix.remove();
  }
}

/** ชื่อไฟล์เอกสาร: "เลขที่เอกสาร_ชื่อ" (ตัดอักขระที่ใช้ในชื่อไฟล์ไม่ได้ออก) */
export function docFileName(docNumber: string, name?: string): string {
  const clean = (s?: string) =>
    (s || '')
      .replace(/[\\/:*?"<>|\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  return [clean(docNumber), clean(name)].filter(Boolean).join('_') || 'document';
}

export function printDocument(): void {
  window.print();
}

/**
 * พิมพ์เฉพาะเอกสาร: คัดลอกเอกสารไปไว้ใต้ body แล้วซ่อนหน้าแอปทั้งหมด (display:none) ระหว่างพิมพ์
 * ไม่ให้เนื้อหาที่ซ่อนอยู่ด้านหลังกินพื้นที่จนเกิดหน้าว่างหน้าที่ 2
 */
export function printOnlyElement(elementId: string, fileTitle?: string): void {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  // ชื่อไฟล์ตอน "บันทึกเป็น PDF" จากหน้าพิมพ์ = document.title
  const prevTitle = document.title;
  if (fileTitle) document.title = fileTitle;
  const holder = document.createElement('div');
  holder.id = 'print-only-holder';
  holder.appendChild(el.cloneNode(true));
  document.body.appendChild(holder);
  document.body.classList.add('printing-only-doc');
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    document.body.classList.remove('printing-only-doc');
    holder.remove();
    document.title = prevTitle;
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 60000);
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
      color: #18181B !important;
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

