import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  User,
  Package,
  Calculator,
  Calendar,
  CheckCircle,
  FileText,
} from 'lucide-react';
import {
  Customer,
  DocumentItem,
  DocumentStatus,
  DocumentType,
  Product,
  SalesDocument,
  SellerProfile,
} from '../types';
import { generateDocNumber } from '../utils/storage';
import { formatCurrency } from '../utils/format';

interface DocumentCreateModalProps {
  initialType: DocumentType;
  editingDoc?: SalesDocument | null;
  products: Product[];
  customers: Customer[];
  seller: SellerProfile;
  onClose: () => void;
  onSave: (doc: SalesDocument) => void;
  onAddCustomer: (customer: Customer) => void;
}

export const DocumentCreateModal: React.FC<DocumentCreateModalProps> = ({
  initialType,
  editingDoc,
  products,
  customers,
  seller,
  onClose,
  onSave,
  onAddCustomer,
}) => {
  const [docType, setDocType] = useState<DocumentType>(editingDoc ? editingDoc.type : initialType);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(editingDoc ? editingDoc.customerId : '');
  const [customerName, setCustomerName] = useState<string>(editingDoc ? editingDoc.customerName : '');
  const [customerPhone, setCustomerPhone] = useState<string>(editingDoc ? editingDoc.customerPhone : '');
  const [customerAddress, setCustomerAddress] = useState<string>(editingDoc ? editingDoc.customerAddress : '');
  const [customerTaxId, setCustomerTaxId] = useState<string>(editingDoc ? editingDoc.customerTaxId || '' : '');

  const [docDate, setDocDate] = useState<string>(
    editingDoc ? editingDoc.date : new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    editingDoc ? editingDoc.dueDate : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  const [items, setItems] = useState<DocumentItem[]>(editingDoc ? editingDoc.items : []);
  const [shippingFee, setShippingFee] = useState<number>(editingDoc ? editingDoc.shippingFee : 0);
  const [discountAmount, setDiscountAmount] = useState<number>(editingDoc ? editingDoc.discountAmount : 0);
  const [vatRate, setVatRate] = useState<number>(editingDoc ? editingDoc.vatRate : 0); // 0 or 7
  const getDefaultNoteForType = (type: DocumentType): string => {
    if (type === 'QUOTATION') {
      return seller.defaultQuotationNotes || 'ใบเสนอราคานี้มีผลบังคับใช้ 15 วันนับจากวันที่ออกเอกสาร หากมีข้อสงสัยกรุณาติดต่อร้านค้า';
    } else if (type === 'INVOICE') {
      return seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า';
    } else {
      return seller.defaultReceiptNotes || seller.defaultDocumentNotes || 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา';
    }
  };

  const [notes, setNotes] = useState<string>(
    editingDoc ? (editingDoc.notes || '') : getDefaultNoteForType(docType)
  );
  const [status, setStatus] = useState<DocumentStatus>(
    editingDoc ? editingDoc.status : (docType === 'RECEIPT' ? 'PAID' : 'SENT')
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    editingDoc ? (editingDoc.paymentMethod || 'PromptPay QR') : 'PromptPay QR'
  );

  // New Quick Customer Inline Modal
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      setCustomerAddress(cust.address);
      setCustomerTaxId(cust.taxId || '');
    }
  };

  const handleAddItem = (product: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total =
        (updated[existingIndex].price - updated[existingIndex].discount) *
        updated[existingIndex].quantity;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          description: product.description || '',
          price: product.price,
          costPrice: product.costPrice,
          quantity: 1,
          discount: 0,
          total: product.price,
        },
      ]);
    }
  };

  const handleUpdateItem = (
    index: number,
    field: 'quantity' | 'price' | 'discount' | 'description',
    val: number | string
  ) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'quantity') item.quantity = Math.max(1, typeof val === 'number' ? val : 1);
    if (field === 'price') item.price = Math.max(0, typeof val === 'number' ? val : 0);
    if (field === 'discount') item.discount = Math.max(0, typeof val === 'number' ? val : 0);
    if (field === 'description') item.description = String(val);

    item.total = (item.price - item.discount) * item.quantity;
    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuickAddCustomer = () => {
    if (!newCustName.trim()) return;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      code: `C${(customers.length + 1).toString().padStart(3, '0')}`,
      name: newCustName,
      phone: newCustPhone,
      address: newCustAddress,
      createdAt: new Date().toISOString().split('T')[0],
    };
    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setCustomerName(newCust.name);
    setCustomerPhone(newCust.phone);
    setCustomerAddress(newCust.address);
    setShowQuickCustomer(false);
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const vatAmount = vatRate > 0 ? (afterDiscount * vatRate) / 100 : 0;
  const grandTotal = Math.round(afterDiscount + vatAmount + shippingFee);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('กรุณากรอกชื่อลูกค้า');
      return;
    }
    if (items.length === 0) {
      alert('กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    const docNum = editingDoc ? editingDoc.docNumber : generateDocNumber(docType);
    const savedDoc: SalesDocument = {
      id: editingDoc ? editingDoc.id : `doc-${Date.now()}`,
      docNumber: docNum,
      type: docType,
      date: docDate,
      dueDate,
      customerId: selectedCustomerId || `cust-temp-${Date.now()}`,
      customerName,
      customerPhone,
      customerAddress,
      customerTaxId,
      items,
      subtotal,
      discountAmount,
      shippingFee,
      vatRate,
      vatAmount,
      grandTotal,
      status,
      paymentMethod,
      paymentSlipUrl: editingDoc?.paymentSlipUrl,
      paymentDate: editingDoc?.paymentDate,
      notes,
      createdAt: editingDoc ? editingDoc.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedDoc);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-100">
                {editingDoc ? `แก้ไขเอกสาร (${editingDoc.docNumber})` : 'สร้างเอกสารการขายใหม่ (ในนามบุคคล)'}
              </h2>
              <p className="text-xs text-slate-400">
                ผู้ออกเอกสาร: {seller.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              ประเภทเอกสาร
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDocType('QUOTATION');
                  setStatus('SENT');
                  setNotes(getDefaultNoteForType('QUOTATION'));
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  docType === 'QUOTATION'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📋 ใบเสนอราคา (QT)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocType('INVOICE');
                  setStatus('SENT');
                  setNotes(getDefaultNoteForType('INVOICE'));
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  docType === 'INVOICE'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📄 ใบแจ้งหนี้ (INV)
              </button>

              <button
                type="button"
                onClick={() => {
                  setDocType('RECEIPT');
                  setStatus('PAID');
                  setNotes(getDefaultNoteForType('RECEIPT'));
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  docType === 'RECEIPT'
                    ? 'bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🧾 ใบเสร็จรับเงิน (REC)
              </button>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                <span>ข้อมูลลูกค้า</span>
              </label>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- เลือกลูกค้าจากคลัง --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowQuickCustomer(true)}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มลูกค้าใหม่</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ชื่อ-นามสกุล / บริษัท *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="เช่น คุณวิภาวรรณ สุขเกษม"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="เช่น 0898765432"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">ที่อยู่จัดส่ง / ออกเอกสาร</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="เช่น 88/9 หมู่บ้านปัญญา บางนา กม.7 สมุทรปราการ"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Add Customer Modal */}
          {showQuickCustomer && (
            <div className="p-4 bg-slate-800 border border-emerald-500/50 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-emerald-400">เพิ่มลูกค้าใหม่ด่วน</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="ชื่อลูกค้า *"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                />
                <input
                  type="text"
                  placeholder="เบอร์โทร"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                />
                <input
                  type="text"
                  placeholder="ที่อยู่จัดส่ง"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 sm:col-span-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomer(false)}
                  className="px-3 py-1 bg-slate-700 text-xs rounded-lg text-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleQuickAddCustomer}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-lg text-white"
                >
                  บันทึกลูกค้า
                </button>
              </div>
            </div>
          )}

          {/* Items Selector & Table */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>รายการสินค้าและบริการ</span>
              </label>

              {/* Add Product Dropdown */}
              <div className="relative">
                <select
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod) handleAddItem(prod);
                    e.target.value = '';
                  }}
                  className="bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="">+ เลือกสินค้าเพิ่มลงบิล</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} - ฿{p.price} (คงเหลือ: {p.stock})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-700/80 rounded-xl text-slate-400 text-xs">
                ยังไม่มีรายการสินค้า กรุณาเลือกสินค้าจากดรอปดาวน์ด้านบน
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900 border border-slate-700/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 space-y-1 w-full sm:w-auto">
                      <p className="font-bold text-slate-100">{item.productName}</p>
                      <input
                        type="text"
                        placeholder="รายละเอียดสินค้า (แสดงแทนรหัสสินค้า)"
                        value={item.description || ''}
                        onChange={(e) =>
                          handleUpdateItem(idx, 'description', e.target.value)
                        }
                        className="w-full bg-slate-800 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">จำนวน:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center text-slate-100 font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">ราคา/หน่วย:</span>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'price', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center text-slate-100 font-bold"
                        />
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="font-extrabold text-emerald-400 text-sm">
                          {formatCurrency(item.total)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-rose-400 hover:bg-rose-950 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Summary Breakdown */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>ส่วนลด ค่าจัดส่ง และภาษี</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ส่วนลดพิเศษ (บาท)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ค่าจัดส่ง (บาท)</label>
                <input
                  type="number"
                  min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ภาษีมูลค่าเพิ่ม VAT</label>
                <select
                  value={vatRate}
                  onChange={(e) => setVatRate(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                >
                  <option value={0}>ไม่มี VAT (0%) - บุคคลธรรมดา</option>
                  <option value={7}>VAT 7%</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-xs text-slate-400 space-y-1">
                <p>รวมราคาตั้งต้น: {formatCurrency(subtotal)}</p>
                {vatAmount > 0 && <p>ภาษี VAT 7%: {formatCurrency(vatAmount)}</p>}
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">ยอดรวมสุทธิทั้งสิ้น</span>
                <span className="text-2xl font-black text-emerald-400">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                วันที่ออกเอกสาร {docDate && <span className="text-emerald-400 font-bold ml-1">({formatDate(docDate)})</span>}
              </label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                วันครบกำหนดชำระ {dueDate && <span className="text-emerald-400 font-bold ml-1">({formatDate(dueDate)})</span>}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">สถานะเอกสาร</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold"
              >
                <option value="SENT">ส่งแล้ว / รอชำระ</option>
                <option value="PAID">ชำระเงินเรียบร้อยแล้ว (PAID)</option>
                <option value="DRAFT">ฉบับร่าง (DRAFT)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">หมายเหตุท้ายเอกสาร</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-slate-900/90 py-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>บันทึกออกเอกสาร</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
