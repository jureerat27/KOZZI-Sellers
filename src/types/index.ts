export type DocumentType = 'QUOTATION' | 'INVOICE' | 'RECEIPT';

export type DocumentStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PENDING_DEPOSIT' // รอมัดจำ
  | 'DEPOSIT_PAID'    // ชำระมัดจำแล้ว
  | 'PARTIALLY_PAID'  // ชำระบางส่วน
  | 'APPROVED'
  | 'PAID'            // ชำระครบแล้ว
  | 'CANCELLED';

export type PaymentTermType = 'FULL' | 'DEPOSIT';
export type DepositType = 'PERCENT' | 'FIXED';
export type PaymentStage = 'FULL' | 'DEPOSIT' | 'BALANCE';

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string; // 'BANK_TRANSFER' | 'CASH' | 'PROMPTPAY' | etc.
  payerName?: string;
  receiptDocNumber?: string;
  receiptId?: string;
  slipUrl?: string;
  notes?: string;
  stage?: PaymentStage;
  createdAt?: string;
}

export interface SellerProfile {
  name: string;
  businessName?: string;
  ownerName?: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  promptPayType: 'MOBILE' | 'NAT_ID';
  promptPayNumber: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  lineNotifyToken: string;
  lineOaChannelAccessToken?: string;
  lineOaBasicId?: string;
  logoUrl: string;
  signatureUrl: string;
  defaultDocumentNotes?: string;
  defaultQuotationNotes?: string;
  defaultInvoiceNotes?: string;
  defaultReceiptNotes?: string;
  googleSheetId?: string;
  autoSync: boolean;
  orderOptions?: OrderOptions; // ตัวเลือก dropdown ของหน้าออเดอร์
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
  // ข้อมูลรุ่น ใช้จับคู่กับออเดอร์เพื่อตัดสต็อก (MODEL + สี + ขนาด)
  productLine?: string;
  model?: string;
  color?: string;
  size?: string;
  description?: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  taxId?: string;
  lineUserId?: string;
  note?: string;
  createdAt: string;
}

export interface DocumentItem {
  productId?: string;
  productName: string;
  sku?: string;
  description?: string;
  unit?: string;
  price: number;
  costPrice?: number;
  quantity: number;
  discount: number;
  total: number;
}

export interface SalesDocument {
  id: string;
  docNumber: string;
  type: DocumentType;
  date: string;
  dueDate: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerTaxId?: string;
  items: DocumentItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  vatRate: number; // 0 or 7
  vatAmount: number;
  grandTotal: number;
  status: DocumentStatus;
  paymentMethod?: string;
  paymentSlipUrl?: string;
  paymentDate?: string;
  notes?: string;
  referenceDocNumber?: string;

  // Deposit (มัดจำ) & Payment Tracking Fields
  paymentTermType?: PaymentTermType; // 'FULL' | 'DEPOSIT'
  depositType?: DepositType;         // 'PERCENT' | 'FIXED'
  depositPercent?: number;           // e.g. 30, 50
  depositAmount?: number;            // e.g. 1500 (calculated or fixed deposit amount)
  balanceAmount?: number;            // e.g. 1500 (remaining balance)
  paidAmount?: number;               // real accumulated paid amount
  remainingAmount?: number;          // real remaining amount to be paid
  paymentStage?: PaymentStage;       // 'FULL' | 'DEPOSIT' | 'BALANCE'
  parentQuotationId?: string;        // ID of source quotation if converted
  parentQuotationDocNumber?: string; // Doc number of source quotation
  sourceInvoiceId?: string;          // ID of source invoice if converted to receipt
  sourceInvoiceDocNumber?: string;   // Doc number of source invoice
  linkedReceiptNumbers?: string[];   // Receipts issued for this document
  paymentRecords?: PaymentRecord[];  // History of payments received for this doc

  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'COST_OF_GOODS'
  | 'SHIPPING'
  | 'PACKAGING'
  | 'MARKETING'
  | 'UTILITIES'
  | 'RENT'
  | 'SALARY'
  | 'OTHER';

export type ExpenseStatus = 'PAID' | 'DRAFT' | 'CANCELLED';

export interface ExpenseItem {
  id?: string;
  name: string;
  amount: number;
  notes?: string;
}

export interface Expense {
  id: string;
  voucherNumber?: string; // e.g. PV-202608-0001
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  recipient?: string;
  paymentMethod?: string; // 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'OTHER'
  paymentRef?: string;
  receiptUrl?: string;
  notes?: string;
  recordedBy?: string;
  status?: ExpenseStatus;
  items?: ExpenseItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface SyncLog {
  lastSynced: string | null;
  status: 'SUCCESS' | 'ERROR' | 'IDLE' | 'SYNCING';
  message: string;
  spreadsheetUrl?: string;
}

// ===== ออเดอร์ & งานติดตั้ง =====
export interface ProductLineOption {
  name: string;          // เช่น รุ่นมือหมุน
  warrantyYears: number; // ระยะประกัน (ปี)
}

/** ส่วนวันที่ในเลขออเดอร์: YY/YYYY = ค.ศ., BB/BBBB = พ.ศ., NONE = ไม่ใส่วันที่ (นับต่อเนื่อง) */
export type OrderNumberDateFormat = 'YYMM' | 'YYYYMM' | 'BBMM' | 'BBBBMM' | 'NONE';

export interface OrderOptions {
  productLines: ProductLineOption[];
  models: string[];
  colors: string[];
  sizes: string[];
  channels: string[];
  ceilingTypes: string[];
  technicians: string[];
  productStatuses: string[];
  costPaidBy: string[];
  paymentMethods: string[];
  defaultDeposit: number;
  warrantyAlertDays: number;
  // รูปแบบเลขออเดอร์ เช่น KZ202611-001
  orderNumberPrefix: string;
  orderNumberDate: OrderNumberDateFormat;
  orderNumberDigits: number;
}

export type FulfillmentType = 'ติดตั้ง' | 'จัดส่ง';
export type QueueStatus = 'ยังไม่ลงคิว' | 'ลงคิวแล้ว' | 'เสร็จแล้ว';
export type OrderPaymentType = 'มัดจำ' | 'ชำระหน้างาน' | 'ชำระเต็มจำนวน' | 'ได้รับเงินจาก Shopee';

export interface OrderPayment {
  id: string;
  date: string;
  amount: number;
  type: OrderPaymentType;
  method: string;
  note?: string;
  receiptDocId?: string;
  receiptDocNumber?: string;
}

export type ServiceTicketStatus = 'รอดำเนินการ' | 'กำลังดำเนินการ' | 'เสร็จแล้ว';

export interface ServiceTicket {
  id: string;
  reportDate: string;
  issue: string;
  technician: string;
  action: string;
  cost: number;
  chargeTo: 'ในประกัน' | 'เก็บเงินลูกค้า';
  status: ServiceTicketStatus;
  completedDate?: string;
}

export interface Order {
  id: string;
  orderNumber: string;        // เลขออเดอร์ระบบ เช่น K2611-001
  channelOrderId?: string;    // เลขคำสั่งซื้อจาก Shopee
  orderDate: string;
  channel: string;
  customerName: string;
  customerPhone?: string;

  productLine: string;
  model: string;
  color: string;
  size: string;
  quantity: number;
  productId?: string;         // สินค้าในคลังที่ตัดสต็อก
  stockDeducted: boolean;

  fulfillment: FulfillmentType;
  ceilingType?: string;
  technician?: string;
  installArea?: string;
  scheduledDate?: string;     // วันที่นัดติดตั้ง/จัดส่ง
  scheduledTimeStart?: string; // เวลาเริ่ม เช่น 10:00
  scheduledTimeEnd?: string;   // เวลาสิ้นสุด เช่น 13:00
  queueStatus: QueueStatus;
  sitePhotos?: string[];      // รูปหน้างาน (บีบอัดแล้ว)

  price: number;
  costPrice: number;
  costPaidBy?: string;
  payments: OrderPayment[];
  awaitingShopeePayout?: boolean;

  productStatus: string;
  trackingNo?: string;
  completedDate?: string;     // วันที่ติดตั้ง/จัดส่งเสร็จ (เริ่มนับประกัน)
  warrantyEndDate?: string;
  warrantyAlertAcknowledged?: boolean; // กดรับทราบการแจ้งเตือนประกันแล้ว

  serviceTickets: ServiceTicket[];
  note?: string;
  cancelled?: boolean;
  createdAt: string;
  updatedAt: string;
}
