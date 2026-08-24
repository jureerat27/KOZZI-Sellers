import {
  Customer,
  Expense,
  Product,
  SalesDocument,
  SellerProfile,
  SyncLog,
} from '../types';

const STORAGE_KEYS = {
  SELLER: 'sellersapp_seller_profile',
  PRODUCTS: 'sellersapp_products',
  CUSTOMERS: 'sellersapp_customers',
  DOCUMENTS: 'sellersapp_documents',
  EXPENSES: 'sellersapp_expenses',
  SYNC_LOG: 'sellersapp_sync_log',
};

// Initial default seller profile in Personal Name
const DEFAULT_SELLER: SellerProfile = {
  name: 'สมชาย ใจดี (ร้านค้าสมชายออนไลน์)',
  taxId: '1100200300401',
  address: '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
  phone: '0812345678',
  email: 'somchai.shop@example.com',
  promptPayType: 'MOBILE',
  promptPayNumber: '0812345678',
  bankName: 'ธนาคารกสิกรไทย (KBank)',
  bankAccountNo: '012-3-45678-9',
  bankAccountName: 'นายสมชาย ใจดี',
  lineNotifyToken: '',
  logoUrl: '',
  signatureUrl: '',
  defaultDocumentNotes: 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา',
  defaultQuotationNotes: 'ใบเสนอราคานี้มีผลบังคับใช้ 15 วันนับจากวันที่ออกเอกสาร หากมีข้อสงสัยกรุณาติดต่อร้านค้า',
  defaultInvoiceNotes: 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า',
  defaultReceiptNotes: 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา',
  autoSync: true,
};

// Initial Sample Products
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    sku: 'P001',
    name: 'หูฟังบลูทูธไร้สาย เสียงระดับ HD',
    category: 'อุปกรณ์ไอที',
    price: 890,
    costPrice: 450,
    stock: 18,
    minStock: 5,
    unit: 'ชิ้น',
    description: 'หูฟังบลูทูธ 5.3 ตัดเสียงรบกวน แบตอยู่นาน 24 ชม.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-002',
    sku: 'P002',
    name: 'แก้วน้ำเก็บอุณหภูมิ สแตนเลส 304 (750ml)',
    category: 'ของใช้ในบ้าน',
    price: 350,
    costPrice: 160,
    stock: 4, // Low stock for testing alert
    minStock: 10,
    unit: 'ใบ',
    description: 'เก็บความเย็นได้ 24 ชั่วโมง ความร้อน 12 ชั่วโมง',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-003',
    sku: 'P003',
    name: 'ขาตั้งมือถือแบบพับได้ ปรับระดับได้ 360 องศา',
    category: 'อุปกรณ์ไอที',
    price: 190,
    costPrice: 75,
    stock: 35,
    minStock: 8,
    unit: 'อัน',
    description: 'อลูมิเนียมน้ำหนักเบา พกพาสะดวก',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-004',
    sku: 'P004',
    name: 'กระเป๋าผ้าแคนวาสมินิมอล สายสะพายไหล่',
    category: 'แฟชั่น',
    price: 290,
    costPrice: 120,
    stock: 22,
    minStock: 5,
    unit: 'ใบ',
    description: 'ผ้าหนาทนทาน ซักได้ ช่องใส่ของเยอะ',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-005',
    sku: 'P005',
    name: 'สายชาร์จเร็ว Fast Charge Type-C (2 เมตร)',
    category: 'อุปกรณ์ไอที',
    price: 150,
    costPrice: 45,
    stock: 3, // Low stock!
    minStock: 10,
    unit: 'เส้น',
    description: 'รองรับ 65W ชาร์จไว ถักไนลอนแข็งแรง',
    updatedAt: new Date().toISOString(),
  },
];

// Initial Sample Customers
const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    code: 'C001',
    name: 'คุณวิภาวรรณ สุขเกษม',
    phone: '0898765432',
    email: 'wipawan@example.com',
    address: '88/9 หมู่บ้านปัญญา บางนา กม.7 อ.บางพลี จ.สมุทรปราการ 10540',
    taxId: '3100500123456',
    note: 'ลูกค้าประจำ ชอบสั่งหูฟังและสายชาร์จ',
    createdAt: new Date().toISOString().split('T')[0],
  },
  {
    id: 'cust-002',
    code: 'C002',
    name: 'คุณอนันต์ ชัยประเสริฐ',
    phone: '0861112233',
    email: 'anan@example.com',
    address: '45/12 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ 10310',
    taxId: '1200300400500',
    note: 'ส่งของช่วงบ่ายเท่านั้น',
    createdAt: new Date().toISOString().split('T')[0],
  },
];

// Initial Sample Expenses
const sampleDateMonth = new Date().toISOString().slice(0, 7).replace('-', '');
const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp-001',
    voucherNumber: `PV-${sampleDateMonth}-0001`,
    date: new Date().toISOString().split('T')[0],
    category: 'COST_OF_GOODS',
    description: 'สั่งซื้อหูฟังบลูทูธล็อตใหม่ 20 ชิ้น',
    amount: 9000,
    recipient: 'โรงงานซัพพลายเออร์ แฟคทอรี่',
    paymentMethod: 'โอนเงินธนาคาร',
    paymentRef: 'TRF-8890123',
    status: 'PAID',
    recordedBy: 'ผู้ดูแลระบบ',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-002',
    voucherNumber: `PV-${sampleDateMonth}-0002`,
    date: new Date().toISOString().split('T')[0],
    category: 'PACKAGING',
    description: 'กล่องพัสดุฝาชน Size B + บับเบิ้ลกันกระแทก',
    amount: 850,
    recipient: 'ร้านกล่องไปรษณีย์สำโรง',
    paymentMethod: 'พร้อมเพย์ / สแกน QR',
    status: 'PAID',
    recordedBy: 'ผู้ดูแลระบบ',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-003',
    voucherNumber: `PV-${sampleDateMonth}-0003`,
    date: new Date().toISOString().split('T')[0],
    category: 'SHIPPING',
    description: 'ค่าส่งสินค้า Flash Express / ไปรษณีย์ประจำวัน',
    amount: 420,
    recipient: 'Flash Express',
    paymentMethod: 'เงินสด',
    status: 'PAID',
    recordedBy: 'ผู้ดูแลระบบ',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'exp-004',
    voucherNumber: `PV-${sampleDateMonth}-0004`,
    date: new Date().toISOString().split('T')[0],
    category: 'MARKETING',
    description: 'โฆษณาบรอดแคสต์ไลน์และยิงแอด Facebook',
    amount: 1500,
    recipient: 'Meta / LINE Thailand',
    paymentMethod: 'บัตรเครดิต',
    paymentRef: 'TX-FB-4412',
    status: 'PAID',
    recordedBy: 'ผู้ดูแลระบบ',
    createdAt: new Date().toISOString(),
  },
];

// Initial Sample Documents
const DEFAULT_DOCUMENTS: SalesDocument[] = [
  {
    id: 'doc-001',
    docNumber: `INV-${new Date().toISOString().slice(0, 7).replace('-', '')}-0001`,
    type: 'INVOICE',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    customerId: 'cust-001',
    customerName: 'คุณวิภาวรรณ สุขเกษม',
    customerPhone: '0898765432',
    customerAddress: '88/9 หมู่บ้านปัญญา บางนา กม.7 อ.บางพลี จ.สมุทรปราการ 10540',
    customerTaxId: '3100500123456',
    items: [
      {
        productId: 'prod-001',
        productName: 'หูฟังบลูทูธไร้สาย เสียงระดับ HD',
        sku: 'P001',
        price: 890,
        costPrice: 450,
        quantity: 2,
        discount: 0,
        total: 1780,
      },
      {
        productId: 'prod-003',
        productName: 'ขาตั้งมือถือแบบพับได้ ปรับระดับได้ 360 องศา',
        sku: 'P003',
        price: 190,
        costPrice: 75,
        quantity: 1,
        discount: 0,
        total: 190,
      },
    ],
    subtotal: 1970,
    discountAmount: 70,
    shippingFee: 50,
    vatRate: 0,
    vatAmount: 0,
    grandTotal: 1950,
    status: 'PAID',
    paymentMethod: 'PromptPay QR',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: 'ขอบคุณที่อุดหนุนสินค้าครับ จัดส่งภายในวันนี้',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-002',
    docNumber: `QT-${new Date().toISOString().slice(0, 7).replace('-', '')}-0001`,
    type: 'QUOTATION',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    customerId: 'cust-002',
    customerName: 'คุณอนันต์ ชัยประเสริฐ',
    customerPhone: '0861112233',
    customerAddress: '45/12 ถนนรัชดาภิเษก เขตห้วยขวาง กรุงเทพฯ 10310',
    customerTaxId: '1200300400500',
    items: [
      {
        productId: 'prod-002',
        productName: 'แก้วน้ำเก็บอุณหภูมิ สแตนเลส 304 (750ml)',
        sku: 'P002',
        price: 350,
        costPrice: 160,
        quantity: 5,
        discount: 50,
        total: 1700,
      },
    ],
    subtotal: 1750,
    discountAmount: 50,
    shippingFee: 80,
    vatRate: 0,
    vatAmount: 0,
    grandTotal: 1780,
    status: 'SENT',
    notes: 'ใบเสนอราคามีผล 15 วัน',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function getSellerProfile(): SellerProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SELLER);
    return data ? JSON.parse(data) : DEFAULT_SELLER;
  } catch {
    return DEFAULT_SELLER;
  }
}

export function saveSellerProfile(profile: SellerProfile): void {
  localStorage.setItem(STORAGE_KEYS.SELLER, JSON.stringify(profile));
}

export function getProducts(): Product[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const initialized = localStorage.getItem('sellersapp_has_initialized');
    if (data !== null) {
      return JSON.parse(data);
    }
    if (initialized) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  } catch {
    return [];
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem('sellersapp_has_initialized', 'true');
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

export function getCustomers(): Customer[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const initialized = localStorage.getItem('sellersapp_has_initialized');
    if (data !== null) {
      return JSON.parse(data);
    }
    if (initialized) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
    return DEFAULT_CUSTOMERS;
  } catch {
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem('sellersapp_has_initialized', 'true');
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

export function getExpenses(): Expense[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    const initialized = localStorage.getItem('sellersapp_has_initialized');
    if (data !== null) {
      return JSON.parse(data);
    }
    if (initialized) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
    return DEFAULT_EXPENSES;
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem('sellersapp_has_initialized', 'true');
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

export function getDocuments(): SalesDocument[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const initialized = localStorage.getItem('sellersapp_has_initialized');
    if (data !== null) {
      return JSON.parse(data);
    }
    if (initialized) {
      return [];
    }
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(DEFAULT_DOCUMENTS));
    return DEFAULT_DOCUMENTS;
  } catch {
    return [];
  }
}

export function saveDocuments(docs: SalesDocument[]): void {
  localStorage.setItem('sellersapp_has_initialized', 'true');
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
}

export function getSyncLog(): SyncLog {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SYNC_LOG);
    return data
      ? JSON.parse(data)
      : { lastSynced: null, status: 'IDLE', message: 'พร้อมใช้งาน' };
  } catch {
    return { lastSynced: null, status: 'IDLE', message: 'พร้อมใช้งาน' };
  }
}

export function saveSyncLog(log: SyncLog): void {
  localStorage.setItem(STORAGE_KEYS.SYNC_LOG, JSON.stringify(log));
}

/**
 * Generate Next Auto Document Number
 * e.g. QT-202608-0001, INV-202608-0002, REC-202608-0001
 */
export function generateDocNumber(type: 'QUOTATION' | 'INVOICE' | 'RECEIPT'): string {
  const prefix = type === 'QUOTATION' ? 'QT' : type === 'INVOICE' ? 'INV' : 'REC';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const docs = getDocuments();

  const matchingDocs = docs.filter(
    (d) => d.type === type && d.docNumber.startsWith(`${prefix}-${yearMonth}`)
  );

  const nextCount = matchingDocs.length + 1;
  return `${prefix}-${yearMonth}-${nextCount.toString().padStart(4, '0')}`;
}

/**
 * Update stock quantities based on document creation / status update
 */
export function updateStockForDocument(doc: SalesDocument, isCancellation = false): void {
  const products = getProducts();
  const updatedProducts = products.map((p) => {
    const item = doc.items.find((i) => i.productId === p.id);
    if (item) {
      const change = isCancellation ? item.quantity : -item.quantity;
      const newStock = Math.max(0, p.stock + change);
      return { ...p, stock: newStock, updatedAt: new Date().toISOString() };
    }
    return p;
  });
  saveProducts(updatedProducts);
}
