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
