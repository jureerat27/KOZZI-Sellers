import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  X,
  TrendingDown,
  FileText,
  Edit,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseStatus } from '../types';
import { formatCurrency, formatDate, generateNextVoucherNumber } from '../utils/format';
import { DatePicker } from './DatePicker';

interface ExpenseManagementProps {
  expenses: Expense[];
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onViewVoucher: (expense: Expense) => void;
  showAddModalDirectly?: boolean;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  COST_OF_GOODS: 'ต้นทุนสินค้า',
  SHIPPING: 'ค่าจัดส่งสินค้า',
  PACKAGING: 'กล่อง/อุปกรณ์แพ็คของ',
  MARKETING: 'ค่าโฆษณา/การตลาด',
  UTILITIES: 'ค่าน้ำ/ค่าไฟ/อินเทอร์เน็ต',
  RENT: 'ค่าเช่าสถานที่/โกดัง',
  SALARY: 'ค่าแรง/เงินเดือน',
  OTHER: 'ค่าใช้จ่ายอื่นๆ',
};

const STATUS_LABELS: Record<
  ExpenseStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PAID: {
    label: 'ชำระแล้ว',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  DRAFT: {
    label: 'ร่าง',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock3,
  },
  CANCELLED: {
    label: 'ยกเลิก',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
};

const PAYMENT_METHODS = [
  'โอนเงินธนาคาร',
  'เงินสด',
  'พร้อมเพย์ / สแกน QR',
  'บัตรเครดิต',
  'เช็ค',
  'อื่น ๆ',
];

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({
  expenses,
  onSaveExpense,
  onDeleteExpense,
  onViewVoucher,
  showAddModalDirectly = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(showAddModalDirectly);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Delete modal state
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('COST_OF_GOODS');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [recipient, setRecipient] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('โอนเงินธนาคาร');
  const [paymentRef, setPaymentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('PAID');

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const monthlyExpenses = expenses.filter(
    (e) => e.date.startsWith(currentMonthStr) && e.status !== 'CANCELLED'
  );
  const totalMonthlyExpense = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const openAddModal = () => {
    setEditingExpense(null);
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('COST_OF_GOODS');
    setDescription('');
    setAmount(0);
    setRecipient('');
    setPaymentMethod('โอนเงินธนาคาร');
    setPaymentRef('');
    setNotes('');
    setRecordedBy('');
    setStatus('PAID');
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategory(exp.category);
    setDescription(exp.description);
    setAmount(exp.amount);
    setRecipient(exp.recipient || '');
    setPaymentMethod(exp.paymentMethod || 'โอนเงินธนาคาร');
    setPaymentRef(exp.paymentRef || '');
    setNotes(exp.notes || '');
    setRecordedBy(exp.recordedBy || '');
    setStatus(exp.status || 'PAID');
    setIsModalOpen(true);
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'ALL' || (e.status || 'PAID') === selectedStatus;
    
    const term = searchTerm.toLowerCase().trim();
    if (!term) return matchesCat && matchesStatus;

    const catLabel = (CATEGORY_LABELS[e.category] || '').toLowerCase();
    const voucherNo = (e.voucherNumber || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const recip = (e.recipient || '').toLowerCase();
    const dateStr = (e.date || '').toLowerCase();
    const dateFormatted = formatDate(e.date).toLowerCase();

    const matchesSearch =
      voucherNo.includes(term) ||
      desc.includes(term) ||
      recip.includes(term) ||
      catLabel.includes(term) ||
      dateStr.includes(term) ||
      dateFormatted.includes(term);

    return matchesCat && matchesStatus && matchesSearch;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    if (editingExpense) {
      // Retain existing voucher number
      const updated: Expense = {
        ...editingExpense,
        date,
        category,
        description,
        amount: Number(amount),
        recipient,
        paymentMethod,
        paymentRef,
        notes,
        recordedBy,
        status,
        updatedAt: new Date().toISOString(),
      };
      onSaveExpense(updated);
    } else {
      // Generate new sequential voucher number
      const newVoucherNumber = generateNextVoucherNumber(date, expenses);
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        voucherNumber: newVoucherNumber,
        date,
        category,
        description,
        amount: Number(amount),
        recipient,
        paymentMethod,
        paymentRef,
        notes,
        recordedBy: recordedBy || 'ผู้ดูแลระบบ',
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveExpense(newExp);
    }

    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const isDeleteConfirmed = deleteConfirmInput.trim().toLowerCase() === 'confirm';

  const handleConfirmDelete = () => {
    if (!isDeleteConfirmed || !deletingExpense) return;
    onDeleteExpense(deletingExpense.id);
    setDeletingExpense(null);
    setDeleteConfirmInput('');
  };

  return (
    <div className="space-y-5 pb-20 animate-fadeIn">
      {/* Header Bar & Summary Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 border border-rose-100 p-4 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="text-xl">💸</span>
            <span>หมวดรายจ่าย & ใบสำคัญจ่าย (Payment Voucher)</span>
          </h1>
          <p className="text-xs text-slate-500">
            บันทึกรายจ่ายและสร้างใบสำคัญจ่ายอัตโนมัติ พร้อมพิมพ์และดาวน์โหลด PDF ได้ทันที 🌸
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ บันทึกรายจ่ายใหม่ 📝</span>
        </button>
      </div>

      {/* Monthly Expense Badge */}
      <div className="bg-white/95 border border-rose-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">
            รวมรายจ่ายเดือนนี้ ({currentMonthStr}) [ไม่รวมรายการยกเลิก] 🗓️
          </span>
          <p className="text-2xl font-extrabold text-rose-500 mt-0.5 font-mono">
            ฿{formatCurrency(totalMonthlyExpense)}
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shadow-xs">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white/95 border border-rose-100 p-4 rounded-2xl space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="ALL">🏷️ ทุกหมวดหมู่รายจ่าย</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="ALL">📑 ทุกสถานะเอกสาร</option>
            <option value="PAID">✅ ชำระแล้ว</option>
            <option value="DRAFT">⏳ ร่าง</option>
            <option value="CANCELLED">❌ ยกเลิก</option>
          </select>

          {/* Search Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่ PV / ผู้รับเงิน / รายการ / วันที่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white/95 border border-rose-100 rounded-2xl p-10 text-center text-slate-400 text-xs shadow-xs">
            🌸 ไม่พบรายการรายจ่ายที่ค้นหา
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const statusKey: ExpenseStatus = exp.status || 'PAID';
            const statusCfg = STATUS_LABELS[statusKey] || STATUS_LABELS.PAID;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={exp.id}
                onClick={() => onViewVoucher(exp)}
                className="bg-white/95 border border-rose-100 hover:border-pink-300 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-all shadow-xs cursor-pointer hover:shadow-md"
              >
                {/* Left Side: Icon, Voucher No, Description & Meta */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 shadow-2xs mt-0.5">
                    <Receipt className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {exp.voucherNumber || 'PV-AUTO'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700 font-bold text-[11px]">
                        {CATEGORY_LABELS[exp.category] || exp.category}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 truncate">
                      {exp.description}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      <span>📅 {formatDate(exp.date)}</span>
                      {exp.recipient && <span>👤 ผู้รับ: {exp.recipient}</span>}
                      {exp.paymentMethod && <span>💳 {exp.paymentMethod}</span>}
                    </div>
                  </div>
                </div>

                {/* Right Side: Amount and Actions */}
                <div
                  className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={`font-mono font-extrabold text-base ${statusKey === 'CANCELLED' ? 'text-slate-400 line-through' : 'text-rose-600'}`}>
                    -฿{formatCurrency(exp.amount)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* View Payment Voucher Button */}
                    <button
                      onClick={() => onViewVoucher(exp)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1 transition-all"
                      title="ดูใบสำคัญจ่าย"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ดูใบสำคัญจ่าย</span>
                    </button>

                    {/* Edit Expense */}
                    <button
                      onClick={() => openEditModal(exp)}
                      className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-all"
                      title="แก้ไขรายจ่าย"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">แก้ไข</span>
                    </button>

                    {/* Delete Expense */}
                    <button
                      onClick={() => {
                        setDeletingExpense(exp);
                        setDeleteConfirmInput('');
                      }}
                      className="p-1.5 sm:p-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all"
                      title="ลบรายจ่าย"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span className="text-xl">💸</span>
                  <span>{editingExpense ? 'แก้ไขรายการรายจ่าย' : 'บันทึกรายจ่ายใหม่'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingExpense
                    ? `เลขที่ใบสำคัญจ่าย: ${editingExpense.voucherNumber || 'PV-AUTO'}`
                    : 'ระบบจะสร้างใบสำคัญจ่าย (Payment Voucher) ให้อัตโนมัติ'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingExpense(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    วันที่จ่าย / วันที่ทำรายการ *
                  </label>
                  <DatePicker
                    value={date}
                    onChange={(val) => setDate(val)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    สถานะเอกสาร
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  >
                    <option value="PAID">✅ ชำระแล้ว (PAID)</option>
                    <option value="DRAFT">⏳ ร่าง (DRAFT)</option>
                    <option value="CANCELLED">❌ ยกเลิก (CANCELLED)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    หมวดหมู่รายจ่าย *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    จำนวนเงิน (บาท) *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-rose-600 font-extrabold font-mono focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  รายการ / รายละเอียดค่าใช้จ่าย *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่ากล่องไปรษณีย์ 100 ใบ หรือ สั่งซื้อสินค้าล็อตใหม่"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ผู้รับเงิน / ร้านค้าซัพพลายเออร์
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Flash Express / ร้านกล่องไปรษณีย์"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ช่องทางการชำระเงิน
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เลขที่อ้างอิงการชำระเงิน (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น TRF-12345 / เลขสลิป"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ผู้บันทึกรายการ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ผู้ดูแลระบบ / สมชาย"
                    value={recordedBy}
                    onChange={(e) => setRecordedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="ระบุข้อความหรือหมายเหตุสำหรับใบสำคัญจ่าย..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingExpense ? 'บันทึกการแก้ไข 💾' : 'บันทึกรายจ่าย & สร้าง PV 🌸'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden">
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-700">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-bold text-base text-rose-900">ยืนยันการลบรายจ่าย</h3>
              </div>
              <button
                onClick={() => setDeletingExpense(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ใบสำคัญจ่าย:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {deletingExpense.voucherNumber || 'PV-AUTO'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">รายการ:</span>
                  <span className="font-semibold text-slate-800">{deletingExpense.description}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">จำนวนเงิน:</span>
                  <span className="font-bold text-rose-600">฿{formatCurrency(deletingExpense.amount)}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-bold text-amber-900">⚠️ คำเตือน:</p>
                <p>
                  หากต้องการคงเลขที่ใบสำคัญจ่ายไว้ แนะนำให้เลือกสถานะเป็น <b>"ยกเลิก (CANCELLED)"</b> แทนการลบ
                  หากลบ รายการและใบสำคัญจ่ายนี้จะถูกลบถาวร
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  พิมพ์คำว่า <span className="text-rose-600 font-extrabold underline">Confirm</span> เพื่อยืนยันการลบ:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isDeleteConfirmed) handleConfirmDelete();
                  }}
                  placeholder="พิมพ์ Confirm ที่นี่..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={!isDeleteConfirmed}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                  isDeleteConfirmed
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบรายจ่าย</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
