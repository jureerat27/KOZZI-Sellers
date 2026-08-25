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
} from './utils/storage';
import { sendLineNotification } from './utils/line';
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
} from './services/firestoreService';

export default function App() {
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

  // Subscribe to Firestore real-time database updates across all devices
  useEffect(() => {
    const unsubSeller = subscribeSellerProfile((p) => setSeller(p));
    const unsubProducts = subscribeProducts((p) => setProducts(p));
    const unsubCustomers = subscribeCustomers((c) => setCustomers(c));
    const unsubDocs = subscribeDocuments((d) => setDocuments(d));
    const unsubExpenses = subscribeExpenses((e) => setExpenses(e));

    return () => {
      unsubSeller();
      unsubProducts();
      unsubCustomers();
      unsubDocs();
      unsubExpenses();
    };
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

  // Google Sheets Auto / Manual Sync
  const syncToGoogleSheets = async () => {
    setSyncLog((prev) => ({ ...prev, status: 'SYNCING', message: 'กำลังซิงก์ข้อมูล...' }));
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          customers,
          documents,
          expenses,
          spreadsheetId: seller.googleSheetId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newLog: SyncLog = {
          lastSynced: new Date().toISOString(),
          status: 'SUCCESS',
          message: 'ซิงก์สำเร็จเรียบร้อยแล้ว',
          spreadsheetUrl: data.spreadsheetUrl,
        };
        setSyncLog(newLog);
        saveSyncLog(newLog);

        if (data.spreadsheetId && data.spreadsheetId !== seller.googleSheetId) {
          const updatedSeller = { ...seller, googleSheetId: data.spreadsheetId };
          setSeller(updatedSeller);
          saveSellerProfileCloud(updatedSeller);
        }
      } else {
        const errLog: SyncLog = {
          lastSynced: syncLog.lastSynced,
          status: 'ERROR',
          message: data.error || 'การซิงก์ล้มเหลว',
        };
        setSyncLog(errLog);
        saveSyncLog(errLog);
      }
    } catch (err: any) {
      const errLog: SyncLog = {
        lastSynced: syncLog.lastSynced,
        status: 'ERROR',
        message: err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้',
      };
      setSyncLog(errLog);
      saveSyncLog(errLog);
    }
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

      // 4. Trigger LINE Notify if token present
      if (seller.lineNotifyToken && isNewDoc) {
        sendLineNotification(
          seller.lineNotifyToken,
          `📄 มีการออกเอกสารใหม่ (${savedDoc.docNumber})\nประเภท: ${savedDoc.type}\nลูกค้า: ${savedDoc.customerName}\nยอดรวม: ฿${savedDoc.grandTotal.toLocaleString()}`
        ).catch(console.error);
      }

      // 5. Auto sync to sheets if enabled
      if (seller.autoSync) {
        syncToGoogleSheets().catch(console.error);
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

    if (seller.lineNotifyToken && newStatus === 'PAID') {
      sendLineNotification(
        seller.lineNotifyToken,
        `💰 แจ้งเตือนได้รับชำระเงินเรียบร้อย! (${updatedDoc.docNumber})\nลูกค้า: ${updatedDoc.customerName}\nยอดชำระ: ฿${updatedDoc.grandTotal.toLocaleString()}`
      );
    }
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
    if (stage === 'DEPOSIT') {
      updatedSourceStatus = 'DEPOSIT_PAID';
    } else if (remaining > 0) {
      updatedSourceStatus = 'PARTIALLY_PAID';
    } else {
      updatedSourceStatus = 'PAID';
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

    // Notify LINE if token enabled
    if (seller.lineNotifyToken) {
      sendLineNotification(
        seller.lineNotifyToken,
        `💰 ได้รับชำระเงิน (${stage === 'DEPOSIT' ? 'มัดจำ' : stage === 'BALANCE' ? 'คงเหลือ' : 'เต็มจำนวน'})\nเลขที่ใบเสร็จ: ${newReceiptDocNum}\nลูกค้า: ${sourceDoc.customerName}\nยอดเงิน: ฿${paymentData.amount.toLocaleString()}\nช่องทาง: ${paymentData.method}`
      ).catch(console.error);
    }

    setSelectedDoc(receiptDoc);
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

  const handleSendLineNotify = async (msg: string) => {
    if (!seller.lineNotifyToken) {
      alert('กรุณากรอก LINE Notify Token ในเมนูตั้งค่าก่อนครับ');
      setIsSettingsOpen(true);
      return;
    }
    const res = await sendLineNotification(seller.lineNotifyToken, msg);
    if (res.success) {
      alert('ส่งการแจ้งเตือนเข้า LINE เรียบร้อยแล้ว!');
    } else {
      alert(`การส่ง LINE ล้มเหลว: ${res.error}`);
    }
  };

  const handleExportBackupJson = () => {
    const backupData = {
      seller,
      products,
      customers,
      documents,
      expenses,
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

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#1F2A44] font-sans">
      {/* 1. Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        lowStockCount={lowStockCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Right Column */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Navbar
          seller={seller}
          syncLog={syncLog}
          isOnline={isOnline}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSyncGoogleSheets={syncToGoogleSheets}
          lowStockCount={lowStockCount}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
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
              onSendLineNotify={handleSendLineNotify}
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
            onSendLineNotify={handleSendLineNotify}
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
            onSendLineNotify={handleSendLineNotify}
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
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
          onSendLineNotify={handleSendLineNotify}
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
          syncLog={syncLog}
          onClose={() => setIsSettingsOpen(false)}
          onSaveSeller={handleSaveSeller}
          onSyncGoogleSheets={syncToGoogleSheets}
          onTestLineNotify={handleSendLineNotify}
          onExportBackupJson={handleExportBackupJson}
          onImportBackupJson={handleImportBackupJson}
        />
      )}
    </div>
  );
}
