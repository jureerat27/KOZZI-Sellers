import { Order } from '../types';
import { orderItems } from './orders';

const uniq = (l: string[]) => Array.from(new Set(l.filter(Boolean))).join(', ');
import { WARRANTY_TEMPLATE, WARRANTY_TEMPLATE_H, WARRANTY_TEMPLATE_W } from '../assets/warrantyTemplate';

/** วันที่แบบ วว/ดด/ปปปป (ค.ศ.) ตามตัวอย่างใบรับประกัน เช่น 15/06/2026 */
export function cardDate(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}

/** เลขที่ใบรับประกัน KZ-WR-ปปดด-ลำดับ (ปี ค.ศ. 2 หลัก + เดือนที่ปิดงาน) เช่น KZ-WR-2606-001 */
export function nextWarrantyNumber(orders: Order[], completedDate: string): string {
  const [y, m] = completedDate.slice(0, 7).split('-');
  const prefix = `KZ-WR-${y.slice(2)}${m}-`;
  let max = 0;
  for (const o of orders) {
    if (o.warrantyNumber?.startsWith(prefix)) {
      const n = parseInt(o.warrantyNumber.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('โหลดแม่แบบใบรับประกันไม่สำเร็จ'));
    img.src = src;
  });
}

/** ตัดข้อความให้พอดีความกว้าง (ตัดเป็นบรรทัดตามช่องว่าง ถ้ายาวเกินใส่ …) */
function wrap(ctx: CanvasRenderingContext2D, text: string, widths: number[]): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let cur = '';
  let li = 0;
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= widths[li] || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      li++;
      cur = w;
      if (li >= widths.length) break;
    }
  }
  if (li < widths.length && cur) lines.push(cur);
  // ข้อความเหลือใส่ไม่หมด: ใส่ … ท้ายบรรทัดสุดท้าย
  if (lines.join(' ').length < words.join(' ').length && lines.length) lines[lines.length - 1] += '…';
  // ตัดท้ายถ้ายังยาวเกินช่อง
  return lines.slice(0, widths.length).map((l, i) => {
    let s = l;
    while (ctx.measureText(s).width > widths[i] && s.length > 1) s = s.slice(0, -2) + '…';
    return s;
  });
}

export interface WarrantyCardData {
  warrantyNumber: string;
  customerName: string;
  address: string;
  model: string;
  color: string;
  size: string;
  orderDate?: string;
  deliveryDate?: string;
  installDate?: string;
  warrantyEnd?: string;
}

export function cardDataFromOrder(o: Order, warrantyNumber: string): WarrantyCardData {
  return {
    warrantyNumber,
    customerName: o.customerName,
    address: o.customerAddress || o.installArea || '',
    // หลายรายการ: รวมค่าที่ไม่ซ้ำกันไว้ในช่องเดียว
    model: uniq(orderItems(o).map((i) => i.model)),
    color: uniq(orderItems(o).map((i) => i.color)),
    size: uniq(orderItems(o).map((i) => i.size)),
    orderDate: o.orderDate,
    deliveryDate: o.fulfillment === 'จัดส่ง' ? o.completedDate : undefined,
    installDate: o.fulfillment === 'ติดตั้ง' ? o.completedDate : undefined,
    warrantyEnd: o.warrantyEndDate,
  };
}

/** วาดใบรับประกันลงบนแม่แบบ ได้ผลเป็นรูป JPEG (data URL) */
export async function renderWarrantyCard(data: WarrantyCardData): Promise<string> {
  const FONT = "'Sarabun', 'IBM Plex Sans Thai', sans-serif";
  try {
    await Promise.all([document.fonts.load(`500 34px Sarabun`), document.fonts.load(`600 34px Sarabun`)]);
  } catch {
    /* ใช้ฟอนต์สำรองของเครื่อง */
  }
  const bg = await loadImage(WARRANTY_TEMPLATE);
  const scale = 2; // ความละเอียด 2 เท่าให้ตัวอักษรคมเมื่อซูม
  const canvas = document.createElement('canvas');
  canvas.width = WARRANTY_TEMPLATE_W * scale;
  canvas.height = WARRANTY_TEMPLATE_H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('เบราว์เซอร์ไม่รองรับการสร้างรูป');
  ctx.scale(scale, scale);
  ctx.drawImage(bg, 0, 0, WARRANTY_TEMPLATE_W, WARRANTY_TEMPLATE_H);
  ctx.fillStyle = '#111111';
  ctx.textBaseline = 'alphabetic';

  // ตำแหน่ง: x เริ่มข้อความ, y = เส้นประ (เขียนเหนือเส้น), w = ความกว้างสูงสุด
  const put = (text: string | undefined, x: number, lineY: number, maxW: number, size = 34) => {
    if (!text) return;
    ctx.font = `500 ${size}px ${FONT}`;
    let s = text;
    while (ctx.measureText(s).width > maxW && s.length > 1) s = s.slice(0, -2) + '…';
    ctx.fillText(s, x, lineY - 9);
  };

  // คอลัมน์ซ้าย
  put(data.warrantyNumber, 392, 328, 350);
  put(data.customerName, 326, 390, 415);
  // ที่อยู่ยาว: ลดขนาดตัวอักษรลงทีละนิดจนใส่ครบ 2 บรรทัด (ต่ำสุด 26px)
  let addrSize = 34;
  let addr: string[] = [];
  for (; addrSize >= 26; addrSize -= 2) {
    ctx.font = `500 ${addrSize}px ${FONT}`;
    addr = wrap(ctx, data.address, [365, 565]);
    if (addr.join(' ').replace(/…$/, '') === data.address.replace(/\s+/g, ' ').trim()) break;
  }
  if (addrSize < 26) addrSize = 26;
  put(addr[0], 392, 454, 365, addrSize);
  put(addr[1], 175, 510, 570, addrSize);
  put(data.model, 326, 567, 415);
  put(data.color, 326, 626, 415);
  put(data.size, 326, 688, 415);

  // คอลัมน์ขวา
  put(cardDate(data.orderDate), 1133, 328, 330);
  put(cardDate(data.deliveryDate), 1133, 390, 330);
  put(cardDate(data.installDate), 1133, 454, 330);
  put(cardDate(data.warrantyEnd), 1133, 526, 330);

  return canvas.toDataURL('image/jpeg', 0.92);
}
