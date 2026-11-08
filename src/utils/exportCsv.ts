import { Customer, Expense, Order, Product, SalesDocument } from '../types';
import { balanceDue, itemsTitle, paidTotal, paymentState, productLinesOf } from './orders';

/**
 * ส่งออกข้อมูลเป็นไฟล์ CSV (ใส่ BOM ไว้หน้าไฟล์ ให้ Excel อ่านภาษาไทยได้ถูกต้อง)
 * วันที่ในไฟล์เป็น วว/ดด/ปปปป (ค.ศ.)
 */

type Col<T> = [header: string, get: (row: T) => unknown];

function cell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv<T>(rows: T[], cols: Col<T>[]): string {
  const head = cols.map(([h]) => cell(h)).join(',');
  const body = rows.map((r) => cols.map(([, get]) => cell(get(r))).join(','));
  return '﻿' + [head, ...body].join('\r\n');
}

// เบอร์โทร/เลขผู้เสียภาษี: เขียนแบบ ="..." เพื่อไม่ให้ Excel ตัดเลข 0 ข้างหน้า
const txt = (v?: string) => (v ? `="${v}"` : '');

const d = (iso?: string) => {
  if (!iso) return '';
  const [y, m, dd] = iso.slice(0, 10).split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : iso;
};

const DOC_TYPE: Record<string, string> = { QUOTATION: 'ใบเสนอราคา', INVOICE: 'ใบแจ้งหนี้', RECEIPT: 'ใบเสร็จรับเงิน' };
const DOC_STATUS: Record<string, string> = {
  DRAFT: 'ร่าง',
  SENT: 'ส่งแล้ว',
  PENDING_DEPOSIT: 'รอมัดจำ',
  DEPOSIT_PAID: 'ชำระมัดจำแล้ว',
  PARTIALLY_PAID: 'ชำระบางส่วน',
  APPROVED: 'อนุมัติแล้ว',
  PAID: 'ชำระแล้ว',
  CANCELLED: 'ยกเลิก',
};
const STAGE: Record<string, string> = { FULL: 'เต็มจำนวน', DEPOSIT: 'เงินมัดจำ', BALANCE: 'ยอดคงเหลือ' };
const EXP_CAT: Record<string, string> = {
  COST_OF_GOODS: 'ต้นทุนสินค้า',
  SHIPPING: 'ค่าจัดส่งสินค้า',
  PACKAGING: 'กล่อง/อุปกรณ์แพ็คของ',
  MARKETING: 'ค่าโฆษณา/การตลาด',
  UTILITIES: 'ค่าน้ำ/ค่าไฟ/อินเทอร์เน็ต',
  RENT: 'ค่าเช่าสถานที่/โกดัง',
  SALARY: 'ค่าแรง/เงินเดือน',
  OTHER: 'ค่าใช้จ่ายอื่นๆ',
};
const EXP_STATUS: Record<string, string> = { PAID: 'ชำระแล้ว', DRAFT: 'ร่าง', CANCELLED: 'ยกเลิก' };
const PAY_METHOD: Record<string, string> = {
  CASH: 'เงินสด',
  BANK_TRANSFER: 'โอนเงินธนาคาร',
  CREDIT_CARD: 'บัตรเครดิต',
  OTHER: 'อื่นๆ',
};

export function ordersCsv(orders: Order[]): string {
  const rows = [...orders].sort((a, b) => (a.orderDate + a.orderNumber).localeCompare(b.orderDate + b.orderNumber));
  return toCsv<Order>(rows, [
    ['วันที่สั่งซื้อ', (o) => d(o.orderDate)],
    ['เลขออเดอร์', (o) => o.orderNumber],
    ['ช่องทาง', (o) => o.channel],
    ['เลขคำสั่งซื้อช่องทาง', (o) => o.channelOrderId],
    ['ลูกค้า', (o) => o.customerName],
    ['เบอร์โทร', (o) => txt(o.customerPhone)],
    ['ที่อยู่ลูกค้า', (o) => o.customerAddress],
    ['รุ่น', (o) => productLinesOf(o)],
    ['สินค้า (MODEL · สี · ขนาด)', (o) => itemsTitle(o)],
    ['จำนวนรวม', (o) => o.quantity],
    ['ราคาขาย', (o) => o.price],
    ['ต้นทุน', (o) => o.costPrice],
    ['รับเงินแล้ว', (o) => paidTotal(o)],
    ['ค้างรับ', (o) => balanceDue(o)],
    ['การชำระเงิน', (o) => paymentState(o).label],
    ['ชำระต้นทุนโดย', (o) => o.costPaidBy],
    ['การดำเนินการ', (o) => o.fulfillment],
    ['เพดาน', (o) => o.ceilingType],
    ['พื้นที่ติดตั้ง', (o) => o.installArea],
    ['ช่าง', (o) => o.technician],
    ['นัดวันที่', (o) => d(o.scheduledDate)],
    ['เวลานัด', (o) => [o.scheduledTimeStart, o.scheduledTimeEnd].filter(Boolean).join('-')],
    ['สถานะคิว', (o) => o.queueStatus],
    ['สถานะสินค้า', (o) => o.productStatus],
    ['วันที่ปิดงาน', (o) => d(o.completedDate)],
    ['หมดประกัน', (o) => d(o.warrantyEndDate)],
    ['เลขใบรับประกัน', (o) => o.warrantyNumber],
    ['Tracking No.', (o) => o.trackingNo],
    ['ยกเลิก', (o) => (o.cancelled ? 'ยกเลิก' : '')],
    ['หมายเหตุ', (o) => o.note],
  ]);
}

export function documentsCsv(docs: SalesDocument[]): string {
  const rows = [...docs].sort((a, b) => (a.date + a.docNumber).localeCompare(b.date + b.docNumber));
  return toCsv<SalesDocument>(rows, [
    ['วันที่', (x) => d(x.date)],
    ['เลขที่เอกสาร', (x) => x.docNumber],
    ['ประเภท', (x) => DOC_TYPE[x.type] || x.type],
    ['งวด', (x) => (x.paymentStage ? STAGE[x.paymentStage] || x.paymentStage : '')],
    ['สถานะ', (x) => DOC_STATUS[x.status] || x.status],
    ['ครบกำหนด', (x) => d(x.dueDate)],
    ['ลูกค้า', (x) => x.customerName],
    ['เบอร์โทร', (x) => txt(x.customerPhone)],
    ['ที่อยู่', (x) => x.customerAddress],
    ['เลขผู้เสียภาษี', (x) => txt(x.customerTaxId)],
    ['รายการ', (x) => x.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')],
    ['ยอดก่อนส่วนลด', (x) => x.subtotal],
    ['ส่วนลด', (x) => x.discountAmount],
    ['ค่าจัดส่ง', (x) => x.shippingFee],
    ['VAT', (x) => x.vatAmount],
    ['ยอดสุทธิ', (x) => x.grandTotal],
    ['มัดจำ', (x) => (x.paymentTermType === 'DEPOSIT' ? x.depositAmount : '')],
    ['วิธีชำระ', (x) => (x.paymentMethod ? PAY_METHOD[x.paymentMethod] || x.paymentMethod : '')],
    ['วันที่ชำระ', (x) => d(x.paymentDate)],
    ['อ้างอิงเอกสาร', (x) => x.referenceDocNumber],
    ['หมายเหตุ', (x) => x.notes],
  ]);
}

export function expensesCsv(expenses: Expense[]): string {
  const rows = [...expenses].sort((a, b) => (a.date + (a.voucherNumber || '')).localeCompare(b.date + (b.voucherNumber || '')));
  return toCsv<Expense>(rows, [
    ['วันที่', (x) => d(x.date)],
    ['เลขที่ PV', (x) => x.voucherNumber],
    ['หมวดหมู่', (x) => EXP_CAT[x.category] || x.category],
    ['รายการ', (x) => x.description],
    ['ผู้รับเงิน', (x) => x.recipient],
    ['วิธีจ่าย', (x) => (x.paymentMethod ? PAY_METHOD[x.paymentMethod] || x.paymentMethod : '')],
    ['อ้างอิงการจ่าย', (x) => x.paymentRef],
    ['จำนวนเงิน', (x) => x.amount],
    ['สถานะ', (x) => EXP_STATUS[x.status || 'PAID'] || x.status],
    ['หมายเหตุ', (x) => x.notes],
  ]);
}

export function productsCsv(products: Product[]): string {
  return toCsv<Product>(products, [
    ['SKU', (x) => x.sku],
    ['ชื่อสินค้า', (x) => x.name],
    ['หมวดหมู่', (x) => x.category],
    ['รุ่น', (x) => x.productLine],
    ['MODEL', (x) => x.model],
    ['สี', (x) => x.color],
    ['ขนาด', (x) => x.size],
    ['ราคาขาย', (x) => x.price],
    ['ต้นทุน', (x) => x.costPrice],
    ['คงเหลือ', (x) => x.stock],
    ['ขั้นต่ำ', (x) => x.minStock],
    ['หน่วย', (x) => x.unit],
  ]);
}

export function customersCsv(customers: Customer[]): string {
  return toCsv<Customer>(customers, [
    ['รหัสลูกค้า', (x) => x.code],
    ['ชื่อ', (x) => x.name],
    ['เบอร์โทร', (x) => txt(x.phone)],
    ['อีเมล', (x) => x.email],
    ['ที่อยู่', (x) => x.address],
    ['เลขผู้เสียภาษี', (x) => txt(x.taxId)],
    ['หมายเหตุ', (x) => x.note],
  ]);
}

export function downloadCsv(name: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `KOZZI_${name}_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
