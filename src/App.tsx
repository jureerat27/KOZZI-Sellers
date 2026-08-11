import React, { useEffect, useState } from 'react';
import { ActiveTab, Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DocumentsView } from './components/DocumentsView';
import { DocumentCreateModal } from './components/DocumentCreateModal';
import { DocumentDetailView } from './components/DocumentDetailView';
import { ProductManagement } from './components/ProductManagement';
import { ExpenseManagement } from './components/ExpenseManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { ReportsView } from './components/ReportsView';
import { SettingsModal } from './components/SettingsModal';
import { PromptPayModal } from './components/PromptPayModal';
import {
  Customer,
  DocumentStatus,
  DocumentType,
  Expense,
  Product,
  SalesDocument,
  SellerProfile,
  SyncLog,
} from './types';
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

  const handleSaveDocument = (savedDoc: SalesDocument) => {
    const existingIndex = documents.findIndex((d) => d.id === savedDoc.id);
    
    // Save to Firestore real-time cloud database
    saveDocumentCloud(savedDoc);
    setIsCreateDocOpen(false);
    setEditingDoc(null);

    if (selectedDoc && selectedDoc.id === savedDoc.id) {
      setSelectedDoc(savedDoc);
    }

    // Update product stock if document status is SENT or PAID or APPROVED
    if (savedDoc.status === 'PAID' || savedDoc.status === 'SENT' || savedDoc.status === 'APPROVED') {
      updateStockForDocument(savedDoc);
      const updatedProds = getProducts();
      setProducts(updatedProds);
      saveProductsBatchCloud(updatedProds);
    }

    // Trigger LINE Notify if token present
    if (seller.lineNotifyToken && existingIndex < 0) {
      sendLineNotification(
        seller.lineNotifyToken,
        `📄 มีการออกเอกสารใหม่ (${savedDoc.docNumber})\nประเภท: ${savedDoc.type}\nลูกค้า: ${savedDoc.customerName}\nยอดรวม: ฿${savedDoc.grandTotal.toLocaleString()}`
      );
    }

    // Auto sync to sheets if enabled
    if (seller.autoSync) {
      syncToGoogleSheets();
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
      paymentSlipUrl: paymentSlipUrl || targetDoc.paymentSlipUrl,
      paymentDate: newStatus === 'PAID' ? new Date().toISOString().split('T')[0] : targetDoc.paymentDate,
      updatedAt: new Date().toISOString(),
    };

    saveDocumentCloud(updatedDoc);
    if (selectedDoc?.id === docId) setSelectedDoc(updatedDoc);

    if (seller.lineNotifyToken && newStatus === 'PAID') {
      sendLineNotification(
        seller.lineNotifyToken,
        `💰 แจ้งเตือนได้รับชำระเงินเรียบร้อย! (${updatedDoc.docNumber})\nลูกค้า: ${updatedDoc.customerName}\nยอดชำระ: ฿${updatedDoc.grandTotal.toLocaleString()}`
      );
    }
  };

  const handleConvertDoc = (doc: SalesDocument, targetType: 'INVOICE' | 'RECEIPT') => {
    const targetNote =
      targetType === 'INVOICE'
        ? seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า'
        : seller.defaultReceiptNotes || seller.defaultDocumentNotes || 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา';

    const newDoc: SalesDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      docNumber: `${targetType === 'INVOICE' ? 'INV' : 'REC'}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${(documents.length + 1).toString().padStart(4, '0')}`,
      type: targetType,
      notes: targetNote,
      status: targetType === 'RECEIPT' ? 'PAID' : 'SENT',
      paymentDate: targetType === 'RECEIPT' ? new Date().toISOString().split('T')[0] : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveDocumentCloud(newDoc);
    setSelectedDoc(newDoc);
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
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบรายการจ่ายนี้?')) {
      deleteExpenseCloud(id);
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
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
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

      {/* Document Detail Preview Modal */}
      {selectedDoc && (
        <DocumentDetailView
          doc={selectedDoc}
          seller={seller}
          customers={customers}
          onClose={() => setSelectedDoc(null)}
          onUpdateStatus={handleUpdateDocStatus}
          onConvertDoc={handleConvertDoc}
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
