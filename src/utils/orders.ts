import { Order, OrderNumberDateFormat, OrderOptions, Product, SellerProfile } from '../types';

export const DEFAULT_ORDER_OPTIONS: OrderOptions = {
  productLines: [
    { name: 'รุ่นมือหมุน', warrantyYears: 2 },
    { name: 'รุ่นติดผนัง', warrantyYears: 2 },
    { name: 'รุ่นไฟฟ้า', warrantyYears: 1 },
  ],
  models: ['G06 Perfect', 'G05 Sole', 'X4', 'T10Pro', 'V8-QM', '150 Kg.'],
  colors: ['สีดำ', 'สีขาว', 'สีเทา'],
  sizes: ['1 เมตร', '1.5 เมตร', '2 เมตร', '2.4 เมตร'],
  channels: ['Line', 'Shopee'],
  ceilingTypes: ['ฝ้าเพดาน', 'โครงเหล็ก', 'ผนังปูน', 'เพดานปูน'],
  technicians: ['ช่างแบล็ค', 'ช่างเบียร์', 'ช่างท็อป', 'ช่างโจ'],
  productStatuses: [
    'สั่งซื้อแล้ว',
    'ร้านจีนจัดส่งแล้ว',
    'แพ็คเสร็จรอส่ง',
    'อยู่ที่ช่าง',
    'จัดส่งแล้ว',
    'ติดตั้งเรียบร้อยแล้ว',
  ],
  costPaidBy: ['Line Pay'],
  paymentMethods: ['โอนเงิน', 'เงินสด', 'พร้อมเพย์', 'Shopee'],
  defaultDeposit: 1500,
  warrantyAlertDays: 30,
  orderNumberPrefix: 'K',
  orderNumberDate: 'YYMM',
  orderNumberDigits: 3,
};

export function getOrderOptions(seller?: SellerProfile): OrderOptions {
  const o = seller?.orderOptions;
  if (!o) return DEFAULT_ORDER_OPTIONS;
  return { ...DEFAULT_ORDER_OPTIONS, ...o };
}

/** วันที่วันนี้ตามเวลาเครื่อง รูปแบบ YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** แสดงวันที่แบบ วว/ดด/ปปปป พ.ศ. เช่น 01/11/2569 */
export function fmtDate(iso?: string): string {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${Number(y) + 543}`;
}

export function fmtMoney(n: number): string {
  return (Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

export function paidTotal(o: Order): number {
  return (o.payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

export function balanceDue(o: Order): number {
  return Math.max(0, (Number(o.price) || 0) - paidTotal(o));
}

export type Tone = 'neutral' | 'dark' | 'green' | 'amber' | 'red';

/** ข้อความสถานะการชำระเงิน (คอลัมน์ "การชำระเงิน" เดิม) */
export function paymentState(o: Order): { label: string; tone: Tone } {
  if (o.cancelled) return { label: 'ยกเลิก', tone: 'red' };
  const paid = paidTotal(o);
  const price = Number(o.price) || 0;
  if (price > 0 && paid >= price) return { label: 'จ่ายครบแล้ว', tone: 'green' };
  if (o.awaitingShopeePayout && paid === 0) return { label: 'รอชำระจากช้อปปี้', tone: 'amber' };
  if (paid === 0) return { label: price > 0 ? 'ยังไม่ชำระ' : 'ยังไม่ระบุราคา', tone: 'neutral' };
  if (price <= 0) return { label: `รับแล้ว ฿${fmtMoney(paid)} · ยังไม่ระบุราคา`, tone: 'amber' };
  return { label: `มัดจำ ฿${fmtMoney(paid)} · เก็บหน้างาน ฿${fmtMoney(price - paid)}`, tone: 'amber' };
}

export function productTitle(o: Pick<Order, 'productLine' | 'model' | 'color' | 'size'>): string {
  return [o.model, o.color, o.size].filter(Boolean).join(' · ');
}

export function warrantyYearsFor(o: Order, opts: OrderOptions): number {
  const line = opts.productLines.find((l) => l.name === o.productLine);
  return line ? Number(line.warrantyYears) || 0 : 0;
}

export function addYears(iso: string, years: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(y + years, m - 1, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso.slice(0, 10) + 'T00:00:00');
  const b = new Date(toIso.slice(0, 10) + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export type WarrantyStatus = 'none' | 'active' | 'expiring' | 'expired';

export function warrantyState(
  o: Order,
  alertDays: number,
  today = todayISO()
): { status: WarrantyStatus; daysLeft: number } {
  if (o.cancelled || !o.warrantyEndDate) return { status: 'none', daysLeft: 0 };
  const left = daysBetween(today, o.warrantyEndDate);
  if (left < 0) return { status: 'expired', daysLeft: left };
  if (left <= alertDays) return { status: 'expiring', daysLeft: left };
  return { status: 'active', daysLeft: left };
}

/** ออเดอร์ที่ต้องแจ้งเตือนประกัน (ใกล้หมด/หมดแล้ว และยังไม่กดรับทราบ) */
export function warrantyAlerts(orders: Order[], opts: OrderOptions, today = todayISO()): Order[] {
  return orders.filter((o) => {
    if (o.warrantyAlertAcknowledged) return false;
    const s = warrantyState(o, opts.warrantyAlertDays, today).status;
    return s === 'expiring' || s === 'expired';
  });
}

function datePart(orderDate: string, fmt: OrderNumberDateFormat): string {
  const [y, m] = orderDate.slice(0, 7).split('-');
  const be = String(Number(y) + 543);
  switch (fmt) {
    case 'YYYYMM':
      return `${y}${m}`;
    case 'BBMM':
      return `${be.slice(2)}${m}`;
    case 'BBBBMM':
      return `${be}${m}`;
    case 'NONE':
      return '';
    default:
      return `${y.slice(2)}${m}`;
  }
}

/**
 * เลขออเดอร์ตามที่ตั้งค่า: คำนำหน้า + วันที่ + "-" + ลำดับ เช่น KZ202611-001
 * ลำดับเริ่มใหม่ทุกเดือน (ถ้าไม่ใส่วันที่ จะนับต่อเนื่อง)
 */
export function nextOrderNumber(
  orders: Order[],
  orderDate: string,
  opts: Pick<OrderOptions, 'orderNumberPrefix' | 'orderNumberDate' | 'orderNumberDigits'> = DEFAULT_ORDER_OPTIONS
): string {
  const digits = Math.min(6, Math.max(1, Number(opts.orderNumberDigits) || 3));
  const prefix = `${(opts.orderNumberPrefix || '').trim()}${datePart(orderDate, opts.orderNumberDate)}-`;
  let max = 0;
  for (const o of orders) {
    if (o.orderNumber?.startsWith(prefix)) {
      const n = parseInt(o.orderNumber.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(digits, '0')}`;
}

const norm = (s?: string) => (s || '').trim().toLowerCase();

/** หาสินค้าในคลังที่ตรงกับ MODEL + สี + ขนาด */
export function findStockProduct(
  products: Product[],
  o: Pick<Order, 'model' | 'color' | 'size'>
): Product | undefined {
  if (!o.model || !o.color || !o.size) return undefined;
  return products.find(
    (p) => norm(p.model) === norm(o.model) && norm(p.color) === norm(o.color) && norm(p.size) === norm(o.size)
  );
}

/** บีบอัดรูปให้เล็กพอเก็บในฐานข้อมูล (ประมาณ ≤ 180KB ต่อรูป) */
export function compressImage(file: File, maxDim = 1280, targetBytes = 180_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปไม่ได้'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์นี้ไม่ใช่รูปภาพที่รองรับ'));
      img.onload = () => {
        let dim = maxDim;
        let quality = 0.7;
        let out = '';
        for (let i = 0; i < 8; i++) {
          const scale = Math.min(1, dim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('เบราว์เซอร์ไม่รองรับการบีบอัดรูป'));
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          out = canvas.toDataURL('image/jpeg', quality);
          // dataURL base64 ≈ 4/3 ของขนาดจริง
          if (out.length * 0.75 <= targetBytes) break;
          if (quality > 0.45) quality -= 0.1;
          else dim = Math.round(dim * 0.8);
        }
        resolve(out);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const MAX_SITE_PHOTOS = 4;

/** ตัวเลือกเวลาทุก 30 นาที 07:00–20:00 */
export const TIME_OPTIONS: string[] = Array.from({ length: 27 }, (_, i) => {
  const mins = 7 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
});

/** ข้อความช่วงเวลานัด เช่น "10:00–13:00 น." */
export function fmtTimeRange(o: { scheduledTimeStart?: string; scheduledTimeEnd?: string }): string {
  const a = o.scheduledTimeStart;
  const b = o.scheduledTimeEnd;
  if (a && b) return `${a}–${b} น.`;
  if (a) return `${a} น.`;
  return '';
}

/** วันหมดประกัน = วันติดตั้ง/จัดส่งเสร็จ + จำนวนปี − 1 วัน (เช่น 15/06/2026 → 14/06/2027) */
export function warrantyEndFrom(iso: string, years: number): string {
  const end = addYears(iso, years);
  const [y, m, d] = end.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
