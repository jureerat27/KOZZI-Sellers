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
  saveCustomers,
  saveDocuments,
  saveExpenses,
  saveProducts,
  saveSellerProfile,
  saveSyncLog,
  updateStockForDocument,
} from './utils/storage';
import { sendLineNotification } from './utils/line';

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
          saveSellerProfile(updatedSeller);
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
    saveSellerProfile(profile);
  };

  const handleCreateDocument = (type: DocumentType) => {
    setEditingDoc(null);
    setCreateDocType(type);
    setIsCreateDocOpen(true);
  };

  const handleEditDocument = (doc: SalesDocument) => {
    setEditingDoc(doc);
    setCreateDocType(doc.type);
    setIsCreateDocOpen(true);
  };

  const handleSaveDocument = (savedDoc: SalesDocument) => {
    const existingIndex = documents.findIndex((d) => d.id === savedDoc.id);
    let updated: SalesDocument[];
    if (existingIndex >= 0) {
      updated = [...documents];
      updated[existingIndex] = savedDoc;
    } else {
      updated = [savedDoc, ...documents];
    }
    setDocuments(updated);
    saveDocuments(updated);
    setIsCreateDocOpen(false);
    setEditingDoc(null);

    if (selectedDoc && selectedDoc.id === savedDoc.id) {
      setSelectedDoc(savedDoc);
    }

    // Update product stock if document status is SENT or PAID or APPROVED
    if (savedDoc.status === 'PAID' || savedDoc.status === 'SENT' || savedDoc.status === 'APPROVED') {
      updateStockForDocument(savedDoc);
      setProducts(getProducts());
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
    const updated = documents.map((d) => {
      if (d.id === docId) {
        const u = {
          ...d,
          status: newStatus,
          paymentSlipUrl: paymentSlipUrl || d.paymentSlipUrl,
          paymentDate: newStatus === 'PAID' ? new Date().toISOString().split('T')[0] : d.paymentDate,
          updatedAt: new Date().toISOString(),
        };
        if (selectedDoc?.id === docId) setSelectedDoc(u);
        return u;
      }
      return d;
    });
    setDocuments(updated);
    saveDocuments(updated);

    if (seller.lineNotifyToken && newStatus === 'PAID') {
      const doc = documents.find((d) => d.id === docId);
      if (doc) {
        sendLineNotification(
          seller.lineNotifyToken,
          `💰 แจ้งเตือนได้รับชำระเงินเรียบร้อย! (${doc.docNumber})\nลูกค้า: ${doc.customerName}\nยอดชำระ: ฿${doc.grandTotal.toLocaleString()}`
        );
      }
    }
  };

  const handleConvertDoc = (doc: SalesDocument, targetType: 'INVOICE' | 'RECEIPT') => {
    const newDoc: SalesDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      docNumber: `${targetType === 'INVOICE' ? 'INV' : 'REC'}-${new Date().toISOString().slice(0, 7).replace('-', '')}-${(documents.length + 1).toString().padStart(4, '0')}`,
      type: targetType,
      status: targetType === 'RECEIPT' ? 'PAID' : 'SENT',
      paymentDate: targetType === 'RECEIPT' ? new Date().toISOString().split('T')[0] : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    saveDocuments(updated);
    setSelectedDoc(newDoc);
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบเอกสารนี้?')) {
      const updated = documents.filter((d) => d.id !== docId);
      setDocuments(updated);
      saveDocuments(updated);
      if (selectedDoc?.id === docId) setSelectedDoc(null);
    }
  };

  const handleSaveProduct = (prod: Product) => {
    const existingIndex = products.findIndex((p) => p.id === prod.id);
    let updated: Product[];
    if (existingIndex >= 0) {
      updated = [...products];
      updated[existingIndex] = prod;
    } else {
      updated = [prod, ...products];
    }
    setProducts(updated);
    saveProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้จากคลัง?')) {
      const updated = products.filter((p) => p.id !== id);
      setProducts(updated);
      saveProducts(updated);
    }
  };

  const handleUpdateStock = (id: string, newStock: number) => {
    const updated = products.map((p) => (p.id === id ? { ...p, stock: newStock } : p));
    setProducts(updated);
    saveProducts(updated);
  };

  const handleSaveCustomer = (cust: Customer) => {
    const existingIndex = customers.findIndex((c) => c.id === cust.id);
    let updated: Customer[];
    if (existingIndex >= 0) {
      updated = [...customers];
      updated[existingIndex] = cust;
    } else {
      updated = [cust, ...customers];
    }
    setCustomers(updated);
    saveCustomers(updated);
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลลูกค้านี้?')) {
      const updated = customers.filter((c) => c.id !== id);
      setCustomers(updated);
      saveCustomers(updated);
    }
  };

  const handleSaveExpense = (exp: Expense) => {
    const updated = [exp, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบรายการจ่ายนี้?')) {
      const updated = expenses.filter((e) => e.id !== id);
      setExpenses(updated);
      saveExpenses(updated);
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
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.products && parsed.documents) {
            if (parsed.seller) {
              setSeller(parsed.seller);
              saveSellerProfile(parsed.seller);
            }
            if (parsed.products) {
              setProducts(parsed.products);
              saveProducts(parsed.products);
            }
            if (parsed.customers) {
              setCustomers(parsed.customers);
              saveCustomers(parsed.customers);
            }
            if (parsed.documents) {
              setDocuments(parsed.documents);
              saveDocuments(parsed.documents);
            }
            if (parsed.expenses) {
              setExpenses(parsed.expenses);
              saveExpenses(parsed.expenses);
            }
            alert('นำเข้าไฟล์สำรองข้อมูลสำเร็จเรียบร้อยแล้ว!');
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
