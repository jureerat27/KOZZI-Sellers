import React, { useEffect, useState } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DocumentsView } from './components/DocumentsView';
import { DocumentCreateModal } from './components/DocumentCreateModal';
import { DocumentDetailView } from './components/DocumentDetailView';
import { ProductManagement } from './components/ProductManagement';
import { ExpenseManagement } from './components/ExpenseManagement';
import { PaymentVoucherDetailView } from './components/PaymentVoucherDetailView';
import { CustomerManagement } from './components/CustomerManagement';
import { ReportsView } from './components/ReportsView';
import { SettingsModal } from './components/SettingsModal';
import { PromptPayModal } from './components/PromptPayModal';
import { LoginView } from './components/LoginView';
import { OrdersView } from './components/OrdersView';
import {
  Customer,
  DocumentStatus,
  DocumentType,
  Expense,
  ExpenseStatus,
  PaymentRecord,
  PaymentStage,
  Product,
  SalesDocument,
  SellerProfile,
  SyncLog,
  Order,
  OrderOptions,
} from './types';
import { generateNextVoucherNumber } from './utils/format';
import {
  getCustomers,
  getDocuments,
  getExpenses,
  getProducts,
  getSellerProfile,
  getSyncLog,
  saveSellerProfile,
  saveSyncLog,
  updateStockForDocument,
  generateDocNumber,
  getOrders,
} from './utils/storage';
import {
  deleteCustomerCloud,
  deleteDocumentCloud,
  deleteExpenseCloud,
  deleteProductCloud,
  importBackupToCloud,
  saveCustomerCloud,
  saveDocumentCloud,
  saveExpenseCloud,
  saveProductCloud,
  saveProductsBatchCloud,
  saveSellerProfileCloud,
  subscribeCustomers,
  subscribeDocuments,
  subscribeExpenses,
  subscribeProducts,
  subscribeSellerProfile,
  subscribeOrders,
  saveOrderCloud,
  deleteOrderCloud,
} from './services/firestoreService';
import { ExportKind } from './components/ExportCsvMenu';
import { customersCsv, documentsCsv, downloadCsv, expensesCsv, ordersCsv, productsCsv } from './utils/exportCsv';
import { getOrderOptions, warrantyAlerts, orderItems, deductedOf, itemsTitle, productLinesOf } from './utils/orders';
import { subscribeAuthState, logOut, User } from './services/authService';
import { Loader2, ShoppingBag, Lock } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // App Main State
  const [seller, setSeller] = useState<SellerProfile>(getSellerProfile());
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [customers, setCustomers] = useState<Customer[]>(getCustomers());
  const [documents, setDocuments] = useState<SalesDocument[]>(getDocuments());
  const [expenses, setExpenses] = useState<Expense[]>(getExpenses());
  const [syncLog, setSyncLog] = useState<SyncLog>(getSyncLog());
  const [orders, setOrders] = useState<Order[]>(getOrders());

  // Modal States
  const [isCreateDocOpen, setIsCreateDocOpen] = useState(false);
  const [createDocType, setCreateDocType] = useState<DocumentType>('QUOTATION');
  const [editingDoc, setEditingDoc] = useState<SalesDocument | null>(null);

  const [selectedDoc, setSelectedDoc] = useState<SalesDocument | null>(null);
  const [selectedExpenseVoucher, setSelectedExpenseVoucher] = useState<Expense | null>(null);

  const [promptPayModalData, setPromptPayModalData] = useState<{
    amount: number;
    docNumber?: string;
  } | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubAuth = subscribeAuthState((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
      alert('เกิดข้อผิดพลาดในการออกจากระบบ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Subscribe to Firestore real-time database updates when authenticated as owner
  useEffect(() => {
    const isOwner = currentUser?.email?.toLowerCase().trim() === 'mp.jureerat@gmail.com';
    if (!currentUser || !isOwner) {
      return;
    }

    const unsubSeller = subscribeSellerProfile((p) => setSeller(p));
    const unsubProducts = subscribeProducts((p) => setProducts(p));
    const unsubCustomers = subscribeCustomers((c) => setCustomers(c));
    const unsubDocs = subscribeDocuments((d) => setDocuments(d));
    const unsubExpenses = subscribeExpenses((e) => setExpenses(e));
    const unsubOrders = subscribeOrders((o) => setOrders(o));

    return () => {
      unsubSeller();
      unsubProducts();
      unsubCustomers();
      unsubDocs();
      unsubExpenses();
      unsubOrders();
    };
  }, [currentUser]);

  // หลังกด "ตกลง" ที่ป๊อปอัพบันทึกเอกสาร: ปิดหน้าเอกสาร แล้วไปหน้ารายการออเดอร์
  useEffect(() => {
    const goOrders = () => {
      setSelectedDoc(null);
      setIsCreateDocOpen(false);
      setActiveTab('orders');
    };
    window.addEventListener('app:go-orders', goOrders);
    return () => window.removeEventListener('app:go-orders', goOrders);
  }, []);

  // Track online / offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Low stock products count
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  // Warranty alerts (ประกันใกล้หมด / หมดแล้ว ที่ยังไม่กดรับทราบ)
  const orderOptions = getOrderOptions(seller);
  const warrantyAlertCount = warrantyAlerts(orders, orderOptions).length;

  // Export CSV (แทนการซิงก์ Google Sheets)
  const exportCsv = (kind: ExportKind) => {
    const map: Record<ExportKind, [string, () => string]> = {
      orders: ['Orders', () => ordersCsv(orders)],
      documents: ['Documents', () => documentsCsv(documents)],
      expenses: ['Expenses', () => expensesCsv(expenses)],
      products: ['Inventory', () => productsCsv(products)],
      customers: ['Customers', () => customersCsv(customers)],
    };
    // ชื่อไฟล์ภาษาอังกฤษ (บางเบราว์เซอร์ไม่รับชื่อไฟล์ภาษาไทย)
    const [name, build] = map[kind];
    downloadCsv(name, build());
  };

  // Handlers
  const handleSaveSeller = (profile: SellerProfile) => {
    setSeller(profile);
    saveSellerProfileCloud(profile);
  };

  const handleCreateDocument = (type: DocumentType) => {
    setEditingDoc(null);
    setCreateDocType(type);
    setIsCreateDocOpen(true);
  };

  const handleEditDocument = (doc: SalesDocument) => {
    setSelectedDoc(null);
    setEditingDoc(doc);
    setCreateDocType(doc.type);
    setIsCreateDocOpen(true);
  };

  const handleSaveDocument = async (savedDoc: SalesDocument): Promise<SalesDocument> => {
    try {
      const isNewDoc = !documents.some((d) => d.id === savedDoc.id);

      // 1. Immediately update React state for instant UI update
      setDocuments((prev) => {
        const existingIndex = prev.findIndex((d) => d.id === savedDoc.id);
        if (existingIndex >= 0) {
          return prev.map((d, i) => (i === existingIndex ? savedDoc : d));
        }
        return [savedDoc, ...prev];
      });

      // 2. Persist to Firestore & Local Storage
      const result = await saveDocumentCloud(savedDoc);
      if (!result || !result.id) {
        throw new Error('ไม่สามารถบันทึกเอกสารลงฐานข้อมูลได้');
      }

      if (selectedDoc && selectedDoc.id === savedDoc.id) {
        setSelectedDoc(savedDoc);
      }

      // 3. Update product stock if document status is SENT or PAID or APPROVED
      if (savedDoc.status === 'PAID' || savedDoc.status === 'SENT' || savedDoc.status === 'APPROVED') {
        updateStockForDocument(savedDoc);
        const updatedProds = getProducts();
        setProducts(updatedProds);
        saveProductsBatchCloud(updatedProds);
      }

      return result;
    } catch (error) {
      console.error('Save sales document failed in App:', error);
      throw error;
    }
  };

  const handleUpdateDocStatus = (
    docId: string,
    newStatus: DocumentStatus,
    paymentSlipUrl?: string
  ) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    const updatedDoc: SalesDocument = {
      ...targetDoc,
      status: newStatus,
      paymentSlipUrl: paymentSlipUrl || targetDoc.paymentSlipUrl || '',
      paymentDate: newStatus === 'PAID' ? new Date().toISOString().split('T')[0] : (targetDoc.paymentDate || ''),
      updatedAt: new Date().toISOString(),
    };

    setDocuments((prev) => prev.map((d) => (d.id === docId ? updatedDoc : d)));
    saveDocumentCloud(updatedDoc);
    if (selectedDoc?.id === docId) setSelectedDoc(updatedDoc);
  };

  const handleConvertDoc = async (doc: SalesDocument, targetType: 'INVOICE' | 'RECEIPT') => {
    const targetNote =
      targetType === 'INVOICE'
        ? seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า'
        : seller.defaultReceiptNotes || seller.defaultDocumentNotes || 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา';

    const newDocNum = generateDocNumber(targetType, documents);
    const newDoc: SalesDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      docNumber: newDocNum,
      type: targetType,
      notes: targetNote,
      status: targetType === 'RECEIPT' ? 'PAID' : 'SENT',
      paymentDate: targetType === 'RECEIPT' ? new Date().toISOString().split('T')[0] : '',
      parentQuotationId: doc.type === 'QUOTATION' ? doc.id : doc.parentQuotationId,
      parentQuotationDocNumber: doc.type === 'QUOTATION' ? doc.docNumber : doc.parentQuotationDocNumber,
      sourceInvoiceId: doc.type === 'INVOICE' ? doc.id : doc.sourceInvoiceId,
      sourceInvoiceDocNumber: doc.type === 'INVOICE' ? doc.docNumber : doc.sourceInvoiceDocNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDocuments((prev) => [newDoc, ...prev]);
    await saveDocumentCloud(newDoc);
    setSelectedDoc(newDoc);
  };

  // Create Deposit Invoice from Quotation
  const handleCreateDepositInvoice = async (quotation: SalesDocument) => {
    const depositAmt =
      quotation.depositAmount ||
      (quotation.depositPercent ? Math.round((quotation.grandTotal * quotation.depositPercent) / 100) : Math.round(quotation.grandTotal * 0.5));
    const balanceAmt = Math.max(0, quotation.grandTotal - depositAmt);

    const newDocNum = generateDocNumber('INVOICE', documents);
    const depositInvoice: SalesDocument = {
      id: `doc-${Date.now()}`,
      docNumber: newDocNum,
      type: 'INVOICE',
      date: new Date().toISOString().split('T')[0],
      dueDate: quotation.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      customerTaxId: quotation.customerTaxId,
      items: [
        {
          productId: `deposit-${quotation.id}`,
          productName: `เงินมัดจำ ${quotation.depositPercent ? `${quotation.depositPercent}% ` : ''}(สำหรับ ${quotation.items[0]?.productName || 'รายการสั่งซื้อ/บริการ'})`,
          sku: 'DEPOSIT',
          description: `อ้างอิงใบเสนอราคา ${quotation.docNumber} ยอดรวมโครงการทั้งสิ้น ฿${quotation.grandTotal.toLocaleString()} (ยอดยกไปคงเหลือ ฿${balanceAmt.toLocaleString()})`,
          unit: 'งวด',
          price: depositAmt,
          costPrice: 0,
          quantity: 1,
          discount: 0,
          total: depositAmt,
        },
      ],
      subtotal: depositAmt,
      discountAmount: 0,
      shippingFee: 0,
      vatRate: 0,
      vatAmount: 0,
      grandTotal: depositAmt,
      status: 'SENT',
      paymentTermType: 'DEPOSIT',
      depositType: quotation.depositType,
      depositPercent: quotation.depositPercent,
      depositAmount: depositAmt,
      balanceAmount: balanceAmt,
      paymentStage: 'DEPOSIT',
      parentQuotationId: quotation.id,
      parentQuotationDocNumber: quotation.docNumber,
      notes: `ใบแจ้งหนี้ชำระเงินมัดจำ ${quotation.depositPercent ? `${quotation.depositPercent}% ` : ''}ตามใบเสนอราคา ${quotation.docNumber}\n${seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า'}`,
      paymentRecords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update quotation status to PENDING_DEPOSIT if not already
    const updatedQuotation: SalesDocument = {
      ...quotation,
      status: quotation.status === 'DRAFT' ? 'PENDING_DEPOSIT' : (quotation.status === 'SENT' ? 'PENDING_DEPOSIT' : quotation.status),
      depositAmount: depositAmt,
      balanceAmount: balanceAmt,
      updatedAt: new Date().toISOString(),
    };

    setDocuments((prev) => [
      depositInvoice,
      ...prev.map((d) => (d.id === quotation.id ? updatedQuotation : d)),
    ]);

    await Promise.all([
      saveDocumentCloud(depositInvoice),
      saveDocumentCloud(updatedQuotation),
    ]);

    setSelectedDoc(depositInvoice);
  };

  // Create Balance Invoice from Quotation
  const handleCreateBalanceInvoice = async (quotation: SalesDocument) => {
    const depositAmt =
      quotation.depositAmount ||
      (quotation.depositPercent ? Math.round((quotation.grandTotal * quotation.depositPercent) / 100) : 0);
    const balanceAmt = quotation.balanceAmount !== undefined ? quotation.balanceAmount : Math.max(0, quotation.grandTotal - depositAmt);

    const newDocNum = generateDocNumber('INVOICE', documents);
    const balanceInvoice: SalesDocument = {
      id: `doc-${Date.now()}`,
      docNumber: newDocNum,
      type: 'INVOICE',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      customerTaxId: quotation.customerTaxId,
      items: [
        {
          productId: `balance-${quotation.id}`,
          productName: `ชำระยอดคงเหลือส่วนที่ 2 (สำหรับ ${quotation.items[0]?.productName || 'รายการสั่งซื้อ/บริการ'})`,
          sku: 'BALANCE',
          description: `อ้างอิงใบเสนอราคา ${quotation.docNumber} ยอดรวมโครงการ ฿${quotation.grandTotal.toLocaleString()} (หักมัดจำแล้ว ฿${depositAmt.toLocaleString()})`,
          unit: 'งวด',
          price: balanceAmt,
          costPrice: 0,
          quantity: 1,
          discount: 0,
          total: balanceAmt,
        },
      ],
      subtotal: balanceAmt,
      discountAmount: 0,
      shippingFee: 0,
      vatRate: 0,
      vatAmount: 0,
      grandTotal: balanceAmt,
      status: 'SENT',
      paymentTermType: 'DEPOSIT',
      depositAmount: depositAmt,
      balanceAmount: balanceAmt,
      paymentStage: 'BALANCE',
      parentQuotationId: quotation.id,
      parentQuotationDocNumber: quotation.docNumber,
      notes: `ใบแจ้งหนี้ยอดคงเหลือส่วนส่งมอบงาน ตามใบเสนอราคา ${quotation.docNumber}\n${seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า'}`,
      paymentRecords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setDocuments((prev) => [balanceInvoice, ...prev]);
    await saveDocumentCloud(balanceInvoice);
    setSelectedDoc(balanceInvoice);
  };

  // Receive Payment and auto-generate linked Receipt
  const handleReceivePayment = async (
    sourceDoc: SalesDocument,
    paymentData: {
      amount: number;
      method: string;
      date: string;
      payerName?: string;
      slipUrl?: string;
      notes?: string;
      stage?: PaymentStage;
    }
  ) => {
    const stage: PaymentStage =
      paymentData.stage ||
      sourceDoc.paymentStage ||
      (sourceDoc.paymentTermType === 'DEPOSIT' && (!sourceDoc.paidAmount || sourceDoc.paidAmount === 0) ? 'DEPOSIT' : 'FULL');

    const newReceiptDocNum = generateDocNumber('RECEIPT', documents);
    const newReceiptId = `doc-${Date.now()}`;

    const newPaymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      date: paymentData.date,
      amount: paymentData.amount,
      method: paymentData.method,
      payerName: paymentData.payerName,
      receiptDocNumber: newReceiptDocNum,
      receiptId: newReceiptId,
      slipUrl: paymentData.slipUrl,
      notes: paymentData.notes,
      stage,
      createdAt: new Date().toISOString(),
    };

    // 1. Generate Receipt Document
    const receiptTitleNote =
      stage === 'DEPOSIT'
        ? `ใบเสร็จรับเงินมัดจำ (Deposit Receipt) ตามเอกสาร ${sourceDoc.docNumber}`
        : stage === 'BALANCE'
        ? `ใบเสร็จรับเงินยอดคงเหลือ (Balance Receipt) ตามเอกสาร ${sourceDoc.docNumber}`
        : `ใบเสร็จรับเงิน ชำระครบถ้วน`;

    const receiptDoc: SalesDocument = {
      id: newReceiptId,
      docNumber: newReceiptDocNum,
      type: 'RECEIPT',
      date: paymentData.date,
      dueDate: paymentData.date,
      customerId: sourceDoc.customerId,
      customerName: sourceDoc.customerName,
      customerPhone: sourceDoc.customerPhone,
      customerAddress: sourceDoc.customerAddress,
      customerTaxId: sourceDoc.customerTaxId,
      items: [
        {
          productId: `rec-item-${Date.now()}`,
          productName:
            stage === 'DEPOSIT'
              ? `รับชำระเงินมัดจำ (Deposit)`
              : stage === 'BALANCE'
              ? `รับชำระเงินยอดคงเหลือ (Balance Payment)`
              : `รับชำระค่าสินค้าและบริการ (${sourceDoc.items[0]?.productName || sourceDoc.docNumber})`,
          sku: stage,
          description: `อ้างอิงเอกสาร ${sourceDoc.docNumber} (${paymentData.notes || receiptTitleNote})`,
          unit: 'งวด',
          price: paymentData.amount,
          costPrice: 0,
          quantity: 1,
          discount: 0,
          total: paymentData.amount,
        },
      ],
      subtotal: paymentData.amount,
      discountAmount: 0,
      shippingFee: 0,
      vatRate: 0,
      vatAmount: 0,
      grandTotal: paymentData.amount,
      status: 'PAID',
      paymentMethod: paymentData.method,
      paymentSlipUrl: paymentData.slipUrl || '',
      paymentDate: paymentData.date,
      paymentStage: stage,
      parentQuotationId: sourceDoc.parentQuotationId || (sourceDoc.type === 'QUOTATION' ? sourceDoc.id : undefined),
      parentQuotationDocNumber: sourceDoc.parentQuotationDocNumber || (sourceDoc.type === 'QUOTATION' ? sourceDoc.docNumber : undefined),
      sourceInvoiceId: sourceDoc.type === 'INVOICE' ? sourceDoc.id : undefined,
      sourceInvoiceDocNumber: sourceDoc.type === 'INVOICE' ? sourceDoc.docNumber : undefined,
      notes: paymentData.notes || seller.defaultReceiptNotes || receiptTitleNote,
      paymentRecords: [newPaymentRecord],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Update source document status and payment records
    const existingPaid = Number(sourceDoc.paidAmount) || 0;
    const newPaidAmount = existingPaid + paymentData.amount;
    const remaining = Math.max(0, sourceDoc.grandTotal - newPaidAmount);

    let updatedSourceStatus: DocumentStatus = 'PAID';
    if (remaining < 0.01) {
      updatedSourceStatus = 'PAID';
    } else if (stage === 'DEPOSIT') {
      updatedSourceStatus = 'DEPOSIT_PAID';
    } else {
      updatedSourceStatus = 'PARTIALLY_PAID';
    }

    const updatedSourceDoc: SalesDocument = {
      ...sourceDoc,
      status: updatedSourceStatus,
      paidAmount: newPaidAmount,
      remainingAmount: remaining,
      paymentRecords: [...(sourceDoc.paymentRecords || []), newPaymentRecord],
      linkedReceiptNumbers: [...(sourceDoc.linkedReceiptNumbers || []), newReceiptDocNum],
      paymentSlipUrl: paymentData.slipUrl || sourceDoc.paymentSlipUrl,
      paymentDate: paymentData.date,
      updatedAt: new Date().toISOString(),
    };

    // 3. If there is a parent quotation, update it as well
    let updatedParentQuotation: SalesDocument | null = null;
    const parentId = sourceDoc.parentQuotationId;
    if (parentId && parentId !== sourceDoc.id) {
      const parentQt = documents.find((d) => d.id === parentId);
      if (parentQt) {
        const pExistingPaid = Number(parentQt.paidAmount) || 0;
        const pNewPaid = pExistingPaid + paymentData.amount;
        const pRem = Math.max(0, parentQt.grandTotal - pNewPaid);
        let pStatus: DocumentStatus = 'PAID';
        if (pRem === 0 || stage === 'BALANCE') {
          pStatus = 'PAID';
        } else if (stage === 'DEPOSIT') {
          pStatus = 'DEPOSIT_PAID';
        } else {
          pStatus = 'PARTIALLY_PAID';
        }
        updatedParentQuotation = {
          ...parentQt,
          status: pStatus,
          paidAmount: pNewPaid,
          remainingAmount: pRem,
          paymentRecords: [...(parentQt.paymentRecords || []), newPaymentRecord],
          linkedReceiptNumbers: [...(parentQt.linkedReceiptNumbers || []), newReceiptDocNum],
          updatedAt: new Date().toISOString(),
        };
      }
    }

    // 4. Commit all changes to state and Firestore
    setDocuments((prev) => {
      let next = [receiptDoc, ...prev.map((d) => (d.id === sourceDoc.id ? updatedSourceDoc : d))];
      if (updatedParentQuotation) {
        next = next.map((d) => (d.id === updatedParentQuotation!.id ? updatedParentQuotation! : d));
      }
      return next;
    });

    const promises: Promise<any>[] = [
      saveDocumentCloud(receiptDoc),
      saveDocumentCloud(updatedSourceDoc),
    ];
    if (updatedParentQuotation) {
      promises.push(saveDocumentCloud(updatedParentQuotation));
    }
    await Promise.all(promises);

    setSelectedDoc(receiptDoc);
  };

  // ===== Orders (ออเดอร์ & งานติดตั้ง) =====
  const adjustStock = (productId: string, delta: number, currentProducts: Product[]): Product[] => {
    const prod = currentProducts.find((p) => p.id === productId);
    if (!prod) return currentProducts;
    const updated = { ...prod, stock: Math.max(0, prod.stock + delta), updatedAt: new Date().toISOString() };
    saveProductCloud(updated);
    return currentProducts.map((p) => (p.id === productId ? updated : p));
  };

  /**
   * Save order and keep stock in sync:
   * stock is deducted once the order is confirmed (has a payment, or is waiting for Shopee payout),
   * and returned if the order is cancelled or its product/quantity changes.
   */
  const handleSaveOrder = async (incoming: Order): Promise<Order> => {
    const prev = orders.find((o) => o.id === incoming.id);
    const confirmed =
      !incoming.cancelled && ((incoming.payments || []).length > 0 || !!incoming.awaitingShopeePayout);
    // รวมจำนวนต่อสินค้าในคลัง (1 ออเดอร์มีได้หลายแถว)
    const sum = (list: { id: string; qty: number }[]) => {
      const m = new Map<string, number>();
      list.forEach((x) => m.set(x.id, (m.get(x.id) || 0) + x.qty));
      return Array.from(m, ([id, qty]) => ({ id, qty }));
    };
    const target = confirmed
      ? sum(
          orderItems(incoming)
            .filter((i) => i.productId)
            .map((i) => ({ id: i.productId as string, qty: Math.max(1, Number(i.quantity) || 1) }))
        )
      : [];
    const before = sum(deductedOf(prev));

    let nextProducts = products;
    const key = (l: { id: string; qty: number }[]) =>
      l
        .map((x) => `${x.id}:${x.qty}`)
        .sort()
        .join('|');
    if (key(before) !== key(target)) {
      before.forEach((b) => (nextProducts = adjustStock(b.id, b.qty, nextProducts)));
      target.forEach((t) => (nextProducts = adjustStock(t.id, -t.qty, nextProducts)));
      if (nextProducts !== products) setProducts(nextProducts);
    }

    const order: Order = {
      ...incoming,
      stockDeducted: target.length > 0,
      deductedItems: target,
      updatedAt: new Date().toISOString(),
    };
    setOrders((list) => {
      const i = list.findIndex((o) => o.id === order.id);
      return i >= 0 ? list.map((o) => (o.id === order.id ? order : o)) : [order, ...list];
    });
    try {
      await saveOrderCloud(order);
    } catch (err: any) {
      alert(
        'บันทึกออเดอร์ขึ้นระบบไม่สำเร็จ' +
          (String(err?.message || '').includes('exceeds the maximum')
            ? ' เพราะรูปหน้างานมีขนาดรวมใหญ่เกินไป กรุณาลบรูปออกบางรูปแล้วบันทึกใหม่'
            : ` (${err?.message || 'ไม่ทราบสาเหตุ'})`)
      );
    }
    return order;
  };

  const handleDeleteOrder = (order: Order) => {
    let nextProducts = products;
    deductedOf(order).forEach((d) => (nextProducts = adjustStock(d.id, d.qty, nextProducts)));
    if (nextProducts !== products) setProducts(nextProducts);
    setOrders((list) => list.filter((o) => o.id !== order.id));
    deleteOrderCloud(order.id);
  };

  const handleSaveOrderOptions = (opts: OrderOptions) => {
    handleSaveSeller({ ...seller, orderOptions: opts });
  };

  const handleCreateStockProduct = (p: Product) => {
    setProducts((list) => [p, ...list]);
    saveProductCloud(p);
  };

  // ===== ผูกออเดอร์กับใบเสนอราคา/ใบแจ้งหนี้ (รับเงินที่ออเดอร์ที่เดียว) =====

  const orderPayStage = (type: string): PaymentStage =>
    type === 'มัดจำ' ? 'DEPOSIT' : type === 'ชำระหน้างาน' ? 'BALANCE' : 'FULL';

  /** เลือกเอกสารที่จะบันทึกยอดรับเงินของออเดอร์: ใบแจ้งหนี้ตามงวดก่อน ถ้าไม่มีใช้ใบเสนอราคา */
  /** เอกสารที่ผูก + ใบแจ้งหนี้ที่ออกจากใบเสนอราคาที่ผูกไว้ */
  const expandLinked = (linkedIds: string[], docs: SalesDocument[]) => [
    ...new Set([
      ...linkedIds,
      ...docs.filter((d) => d.type === 'INVOICE' && d.parentQuotationId && linkedIds.includes(d.parentQuotationId)).map((d) => d.id),
    ]),
  ];

  const pickLinkedTarget = (linkedIdsRaw: string[], stage: PaymentStage, docs: SalesDocument[]) => {
    const linkedIds = expandLinked(linkedIdsRaw, docs);
    const linked = docs.filter((d) => linkedIds.includes(d.id) && d.status !== 'CANCELLED' && d.status !== 'PAID');
    const inv = linked.filter((d) => d.type === 'INVOICE');
    return (
      (stage !== 'FULL' && inv.find((d) => d.paymentStage === stage)) ||
      inv.find((d) => !d.paymentStage || d.paymentStage === 'FULL') ||
      inv[0] ||
      linked.find((d) => d.type === 'QUOTATION') ||
      null
    );
  };

  /** บันทึกยอดรับเงินลงเอกสาร (และใบเสนอราคาต้นทาง) แบบเดียวกับการรับเงินที่ใบแจ้งหนี้ — คืนเอกสารที่เปลี่ยน */
  const applyPaymentToDoc = (
    target: SalesDocument,
    record: PaymentRecord,
    stage: PaymentStage,
    docs: SalesDocument[]
  ): SalesDocument[] => {
    const now = new Date().toISOString();
    const apply = (d: SalesDocument, isParent: boolean): SalesDocument => {
      const paid = (Number(d.paidAmount) || 0) + record.amount;
      const remaining = Math.max(0, d.grandTotal - paid);
      const status: DocumentStatus =
        remaining < 0.01 || (isParent && stage === 'BALANCE')
          ? 'PAID'
          : stage === 'DEPOSIT'
          ? 'DEPOSIT_PAID'
          : 'PARTIALLY_PAID';
      return {
        ...d,
        status,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentRecords: [...(d.paymentRecords || []), record],
        linkedReceiptNumbers: [...(d.linkedReceiptNumbers || []), record.receiptDocNumber || ''].filter(Boolean),
        paymentDate: record.date,
        updatedAt: now,
      };
    };
    const out = [apply(target, false)];
    const parent =
      target.parentQuotationId && target.parentQuotationId !== target.id
        ? docs.find((d) => d.id === target.parentQuotationId)
        : null;
    if (parent && !(parent.paymentRecords || []).some((r) => r.receiptId === record.receiptId)) out.push(apply(parent, true));
    return out;
  };

  /** ใบเสร็จที่เคยออกจากออเดอร์แล้ว ยังไม่ได้บันทึกลงเอกสารที่ผูก → บันทึกให้ (ไม่ออกใบเสร็จใหม่) */
  const syncOrderReceiptsToDocs = (order: Order, docs: SalesDocument[]): SalesDocument[] => {
    const linkedIds = expandLinked(order.linkedDocIds || [], docs);
    let cur = docs;
    const changed = new Map<string, SalesDocument>();
    const put = (d: SalesDocument) => {
      changed.set(d.id, d);
      cur = cur.map((x) => (x.id === d.id ? d : x));
    };
    for (const p of order.payments || []) {
      if (!p.receiptDocId) continue;
      const already = cur.some((d) => linkedIds.includes(d.id) && (d.paymentRecords || []).some((r) => r.receiptId === p.receiptDocId));
      if (already) continue;
      const stage = orderPayStage(p.type);
      const target = pickLinkedTarget(linkedIds, stage, cur);
      if (!target) continue;
      const record: PaymentRecord = {
        id: `pay-${p.id}`,
        date: p.date,
        amount: p.amount,
        method: p.method,
        payerName: order.customerName,
        receiptDocNumber: p.receiptDocNumber,
        receiptId: p.receiptDocId,
        notes: `รับเงินที่ออเดอร์ ${order.orderNumber}`,
        stage,
        createdAt: new Date().toISOString(),
      };
      applyPaymentToDoc(target, record, stage, cur).forEach(put);
      // ใบเสร็จเดิม: เติมเลขเอกสารอ้างอิง
      const rc = cur.find((d) => d.id === p.receiptDocId);
      if (rc && !rc.referenceDocNumber) {
        put({
          ...rc,
          referenceDocNumber: target.docNumber,
          sourceInvoiceId: target.type === 'INVOICE' ? target.id : rc.sourceInvoiceId,
          sourceInvoiceDocNumber: target.type === 'INVOICE' ? target.docNumber : rc.sourceInvoiceDocNumber,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    return [...changed.values()];
  };

  const commitDocs = async (list: SalesDocument[]) => {
    if (list.length === 0) return;
    const byId = new Map(list.map((d) => [d.id, d]));
    setDocuments((prev) => prev.map((d) => byId.get(d.id) || d));
    if (selectedDoc && byId.has(selectedDoc.id)) setSelectedDoc(byId.get(selectedDoc.id)!);
    // บันทึกตรงลงฐานข้อมูล (ไม่ผ่าน handleSaveDocument เพื่อไม่ให้ตัดสต็อกซ้ำ)
    await Promise.all(list.map((d) => saveDocumentCloud(d)));
  };

  const handleLinkOrderDoc = async (order: Order, docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) return;
    const next: Order = { ...order, linkedDocIds: [...new Set([...(order.linkedDocIds || []), docId])] };
    await handleSaveOrder(next);
    const linkedDoc: SalesDocument = {
      ...doc,
      linkedOrderId: order.id,
      linkedOrderNumber: order.orderNumber,
      updatedAt: new Date().toISOString(),
    };
    const docsNow = documents.map((d) => (d.id === docId ? linkedDoc : d));
    const synced = syncOrderReceiptsToDocs(next, docsNow);
    const all = new Map<string, SalesDocument>([[linkedDoc.id, linkedDoc]]);
    synced.forEach((d) => all.set(d.id, d));
    await commitDocs([...all.values()]);
  };

  const handleUnlinkOrderDoc = async (order: Order, docId: string) => {
    await handleSaveOrder({ ...order, linkedDocIds: (order.linkedDocIds || []).filter((id) => id !== docId) });
    const doc = documents.find((d) => d.id === docId);
    if (doc && doc.linkedOrderId === order.id) {
      await commitDocs([{ ...doc, linkedOrderId: undefined, linkedOrderNumber: undefined, updatedAt: new Date().toISOString() }]);
    }
  };

  // เปิดออเดอร์จากหน้าเอกสาร (เอกสารที่ผูกออเดอร์: รับเงินที่ออเดอร์)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const handleGoToOrder = (orderId: string) => {
    setSelectedDoc(null);
    setActiveTab('orders');
    setOpenOrderId(orderId);
  };

  /** ออกใบเสร็จรับเงินในระบบเอกสารขาย จากรายการรับเงินของออเดอร์ */
  const handleIssueOrderReceipt = async (order: Order, paymentId: string) => {
    const pay = order.payments.find((p) => p.id === paymentId);
    if (!pay) return;
    if (pay.receiptDocId) {
      const existing = documents.find((d) => d.id === pay.receiptDocId);
      if (existing) {
        setSelectedDoc(existing);
        return;
      }
    }
    const stage: PaymentStage =
      pay.type === 'มัดจำ' ? 'DEPOSIT' : pay.type === 'ชำระหน้างาน' ? 'BALANCE' : 'FULL';
    // เอกสารที่ผูกกับออเดอร์ (ใบแจ้งหนี้/ใบเสนอราคา) จะถูกบันทึกยอดรับเงินด้วย
    const target = pickLinkedTarget(order.linkedDocIds || [], stage, documents);
    const docNumber = generateDocNumber('RECEIPT', documents);
    const now = new Date().toISOString();
    const itemName = `${productLinesOf(order)} ${itemsTitle(order)}`.trim();
    const receipt: SalesDocument = {
      id: `doc-${Date.now()}`,
      docNumber,
      type: 'RECEIPT',
      date: pay.date,
      dueDate: pay.date,
      customerId: '',
      customerName: order.customerName,
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || order.installArea || '',
      items: [
        {
          // ไม่ผูก productId: สต็อกถูกตัดไปแล้วตอนยืนยันออเดอร์ ถ้าผูกไว้ระบบเอกสารจะตัดซ้ำ
          productName: `${pay.type === 'มัดจำ' ? 'รับชำระเงินมัดจำ' : pay.type === 'ชำระหน้างาน' ? 'รับชำระยอดคงเหลือ' : 'รับชำระค่าสินค้า'} ${itemName}`,
          sku: order.orderNumber,
          description: `ออเดอร์ ${order.orderNumber}${target ? ` · อ้างอิง${target.type === 'INVOICE' ? 'ใบแจ้งหนี้' : 'ใบเสนอราคา'} ${target.docNumber}` : ''} · ราคาเต็ม ฿${order.price.toLocaleString()}${order.fulfillment === 'ติดตั้ง' ? ' (รวมติดตั้ง)' : ''}`,
          unit: 'รายการ',
          price: pay.amount,
          costPrice: 0,
          quantity: 1,
          discount: 0,
          total: pay.amount,
        },
      ],
      subtotal: pay.amount,
      discountAmount: 0,
      shippingFee: 0,
      vatRate: 0,
      vatAmount: 0,
      grandTotal: pay.amount,
      status: 'PAID',
      paymentMethod: pay.method,
      paymentDate: pay.date,
      paymentStage: stage,
      depositAmount: stage === 'DEPOSIT' ? pay.amount : undefined,
      paidAmount: pay.amount,
      remainingAmount: 0,
      notes: pay.note || seller.defaultReceiptNotes || `อ้างอิงออเดอร์ ${order.orderNumber}`,
      referenceDocNumber: target?.docNumber,
      sourceInvoiceId: target?.type === 'INVOICE' ? target.id : undefined,
      sourceInvoiceDocNumber: target?.type === 'INVOICE' ? target.docNumber : undefined,
      parentQuotationId: target ? target.parentQuotationId || (target.type === 'QUOTATION' ? target.id : undefined) : undefined,
      parentQuotationDocNumber: target
        ? target.parentQuotationDocNumber || (target.type === 'QUOTATION' ? target.docNumber : undefined)
        : undefined,
      createdAt: now,
      updatedAt: now,
    };
    await handleSaveDocument(receipt);
    if (target) {
      const record: PaymentRecord = {
        id: `pay-${pay.id}`,
        date: pay.date,
        amount: pay.amount,
        method: pay.method,
        payerName: order.customerName,
        receiptDocNumber: docNumber,
        receiptId: receipt.id,
        notes: `รับเงินที่ออเดอร์ ${order.orderNumber}`,
        stage,
        createdAt: now,
      };
      await commitDocs(applyPaymentToDoc(target, record, stage, documents));
    }
    await handleSaveOrder({
      ...order,
      payments: order.payments.map((p) =>
        p.id === paymentId ? { ...p, receiptDocId: receipt.id, receiptDocNumber: docNumber } : p
      ),
    });
    setSelectedDoc(receipt);
  };

  const handleOpenDocById = (docId: string) => {
    const d = documents.find((x) => x.id === docId);
    if (d) setSelectedDoc(d);
  };

  const handleDeleteDocument = (docId: string) => {
    deleteDocumentCloud(docId);
    if (selectedDoc?.id === docId) setSelectedDoc(null);
  };

  const handleSaveProduct = (prod: Product) => {
    saveProductCloud(prod);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้จากคลัง?')) {
      deleteProductCloud(id);
    }
  };

  const handleUpdateStock = (id: string, newStock: number) => {
    const prod = products.find((p) => p.id === id);
    if (prod) {
      saveProductCloud({ ...prod, stock: newStock, updatedAt: new Date().toISOString() });
    }
  };

  const handleSaveCustomer = (cust: Customer) => {
    saveCustomerCloud(cust);
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลลูกค้านี้?')) {
      deleteCustomerCloud(id);
    }
  };

  const handleSaveExpense = (exp: Expense) => {
    saveExpenseCloud(exp);
    if (selectedExpenseVoucher && selectedExpenseVoucher.id === exp.id) {
      setSelectedExpenseVoucher(exp);
    }
  };

  const handleViewExpenseVoucher = (exp: Expense) => {
    // If the expense doesn't have a voucherNumber yet, assign one automatically
    if (!exp.voucherNumber) {
      const generatedVoucherNumber = generateNextVoucherNumber(exp.date, expenses);
      const updatedExp: Expense = {
        ...exp,
        voucherNumber: generatedVoucherNumber,
        status: exp.status || 'PAID',
        updatedAt: new Date().toISOString(),
      };
      saveExpenseCloud(updatedExp);
      setSelectedExpenseVoucher(updatedExp);
    } else {
      setSelectedExpenseVoucher(exp);
    }
  };

  const handleUpdateExpenseStatus = (exp: Expense, newStatus: ExpenseStatus) => {
    const updatedExp: Expense = {
      ...exp,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    saveExpenseCloud(updatedExp);
    setSelectedExpenseVoucher(updatedExp);
  };

  const handleDeleteExpense = (id: string) => {
    deleteExpenseCloud(id);
    if (selectedExpenseVoucher?.id === id) {
      setSelectedExpenseVoucher(null);
    }
  };

  const handleExportBackupJson = () => {
    const backupData = {
      seller,
      products,
      customers,
      documents,
      expenses,
      orders,
      exportedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SellersApp_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.products || parsed.documents || parsed.seller) {
            await importBackupToCloud(parsed);
            alert('นำเข้าไฟล์สำรองข้อมูลเข้าคลาวด์สำเร็จเรียบร้อยแล้ว!');
          }
        } catch (err) {
          alert('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
        }
      };
      reader.readAsText(file);
    }
  };

  // 1. Loading screen while initializing auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#18181B] via-[#18181B] to-[#18181B] flex flex-col items-center justify-center p-4 text-white">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white/10 border border-white/20 shadow-inner mb-4 animate-pulse">
          <ShoppingBag className="w-8 h-8 text-zinc-300" />
        </div>
        <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-100">
          <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          <span>กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: Only display the Login Screen
  if (!currentUser) {
    return <LoginView />;
  }

  // 2.1 Unauthorized user: Logged in with an email other than owner
  const isOwner = currentUser.email?.toLowerCase().trim() === 'mp.jureerat@gmail.com';
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#18181B] via-[#18181B] to-[#18181B] flex flex-col items-center justify-center p-4 sm:p-6 text-white text-center">
        <div className="w-full max-w-md bg-white text-[#18181B] rounded-xl shadow-2xl p-7 border border-zinc-100">
          <div className="w-14 h-14 bg-zinc-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4 border border-zinc-200">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-zinc-800 mb-2">ไม่มีสิทธิ์เข้าถึงระบบ</h2>
          <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
            ระบบจัดการร้านค้านี้จำกัดสิทธิ์การเข้าถึงเฉพาะบัญชีเจ้าของร้าน (<strong>mp.jureerat@gmail.com</strong>) เท่านั้น
          </p>
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-600 mb-5 text-left space-y-1">
            <div className="text-zinc-500">บัญชีที่กำลังล็อกอินอยู่ในปัจจุบัน:</div>
            <div className="font-bold text-red-600 truncate">{currentUser.email || 'ไม่ระบุอีเมล'}</div>
            <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200">
              กรุณากดปุ่มด้านล่างเพื่อออกจากระบบ แล้วเลือกล็อกอินด้วยบัญชี <strong>mp.jureerat@gmail.com</strong>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-[#0068F0] hover:bg-[#0052C7] text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
          >
            ออกจากระบบเพื่อเปลี่ยนบัญชี Google
          </button>
        </div>
      </div>
    );
  }

  // 3. Authenticated App Layout
  return (
    <div className="min-h-screen bg-[#F4F4F5] text-[#18181B] font-sans">
      {/* 1. Left Sidebar */}
      <Sidebar
        seller={seller}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        lowStockCount={lowStockCount}
        orderAlertCount={warrantyAlertCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Right Column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Navbar
          seller={seller}
          isOnline={isOnline}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onExportCsv={exportCsv}
          lowStockCount={lowStockCount}
          orderAlertCount={warrantyAlertCount}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main View Area */}
        <main className="p-4 sm:p-6 max-w-[1600px] w-full mx-auto flex-1">
          {activeTab === 'dashboard' && (
            <DashboardView
              documents={documents}
              products={products}
              expenses={expenses}
              customers={customers}
              seller={seller}
              onCreateDoc={handleCreateDocument}
              onOpenDocDetail={(doc) => setSelectedDoc(doc)}
              onOpenAddExpense={() => setActiveTab('expenses')}
              onOpenAddProduct={() => setActiveTab('products')}
              onGoToProducts={() => setActiveTab('products')}
              onGoToDocuments={() => setActiveTab('documents')}
              onShowPromptPayQR={(amount, docNumber) =>
                setPromptPayModalData({ amount, docNumber })
              }
            />
          )}

        {activeTab === 'documents' && (
          <DocumentsView
            documents={documents}
            onCreateDoc={handleCreateDocument}
            onOpenDocDetail={(doc) => setSelectedDoc(doc)}
            onDeleteDoc={handleDeleteDocument}
            onShowPromptPayQR={(amount, docNumber) =>
              setPromptPayModalData({ amount, docNumber })
            }
            onEditDoc={handleEditDocument}
          />
        )}

        {activeTab === 'products' && (
          <ProductManagement
            products={products}
            seller={seller}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateStock={handleUpdateStock}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseManagement
            expenses={expenses}
            seller={seller}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            onViewVoucher={handleViewExpenseVoucher}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManagement
            customers={customers}
            documents={documents}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            products={products}
            options={orderOptions}
            onSaveOrder={handleSaveOrder}
            onDeleteOrder={handleDeleteOrder}
            onSaveOptions={handleSaveOrderOptions}
            onCreateStockProduct={handleCreateStockProduct}
            onIssueReceipt={handleIssueOrderReceipt}
            onOpenDoc={handleOpenDocById}
            documents={documents}
            onLinkDoc={handleLinkOrderDoc}
            onUnlinkDoc={handleUnlinkOrderDoc}
            openOrderId={openOrderId}
            onOpenOrderHandled={() => setOpenOrderId(null)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            documents={documents}
            expenses={expenses}
            products={products}
            seller={seller}
          />
        )}
      </main>
    </div>

      {/* Document Creation Modal */}
      {isCreateDocOpen && (
        <DocumentCreateModal
          initialType={createDocType}
          editingDoc={editingDoc}
          products={products}
          customers={customers}
          seller={seller}
          onClose={() => {
            setIsCreateDocOpen(false);
            setEditingDoc(null);
          }}
          onSave={handleSaveDocument}
          onAddCustomer={handleSaveCustomer}
        />
      )}

      {/* Payment Voucher Detail Modal */}
      {selectedExpenseVoucher && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-5xl my-auto">
            <PaymentVoucherDetailView
              expense={selectedExpenseVoucher}
              seller={seller}
              onClose={() => setSelectedExpenseVoucher(null)}
              onEditExpense={(exp) => {
                setSelectedExpenseVoucher(null);
                setActiveTab('expenses');
              }}
              onUpdateStatus={handleUpdateExpenseStatus}
            />
          </div>
        </div>
      )}

      {/* Document Detail Preview Modal */}
      {selectedDoc && (
        <DocumentDetailView
          doc={selectedDoc}
          documents={documents}
          seller={seller}
          customers={customers}
          onClose={() => setSelectedDoc(null)}
          onSelectDoc={(d) => setSelectedDoc(d)}
          onUpdateStatus={handleUpdateDocStatus}
          onConvertDoc={handleConvertDoc}
          onCreateDepositInvoice={handleCreateDepositInvoice}
          onCreateBalanceInvoice={handleCreateBalanceInvoice}
          onReceivePayment={handleReceivePayment}
          linkedOrder={
            orders.find(
              (o) =>
                !o.cancelled &&
                ((o.linkedDocIds || []).includes(selectedDoc.id) ||
                  (selectedDoc.type === 'INVOICE' &&
                    !!selectedDoc.parentQuotationId &&
                    (o.linkedDocIds || []).includes(selectedDoc.parentQuotationId)))
            ) || null
          }
          onGoToOrder={handleGoToOrder}
          onEditDoc={handleEditDocument}
          onSaveDocument={handleSaveDocument}
          onDeleteDoc={handleDeleteDocument}
        />
      )}

      {/* PromptPay QR Code Modal */}
      {promptPayModalData && (
        <PromptPayModal
          amount={promptPayModalData.amount}
          docNumber={promptPayModalData.docNumber}
          seller={seller}
          onClose={() => setPromptPayModalData(null)}
        />
      )}

      {/* Settings & Backup Modal */}
      {isSettingsOpen && (
        <SettingsModal
          seller={seller}
          onClose={() => setIsSettingsOpen(false)}
          onSaveSeller={handleSaveSeller}
          onExportCsv={exportCsv}
          onExportBackupJson={handleExportBackupJson}
          onImportBackupJson={handleImportBackupJson}
        />
      )}
    </div>
  );
}
