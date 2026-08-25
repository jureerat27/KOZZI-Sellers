export type DocumentType = 'QUOTATION' | 'INVOICE' | 'RECEIPT';

export type DocumentStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'PAID' | 'CANCELLED';

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
