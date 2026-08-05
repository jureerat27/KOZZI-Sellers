import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  X,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
} from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';

interface ExpenseManagementProps {
  expenses: Expense[];
  onSaveExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
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

export const ExpenseManagement: React.FC<ExpenseManagementProps> = ({
  expenses,
  onSaveExpense,
  onDeleteExpense,
  showAddModalDirectly = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(showAddModalDirectly);

  // New Expense Form
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('COST_OF_GOODS');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [recipient, setRecipient] = useState('');

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(currentMonthStr));
  const totalMonthlyExpense = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    const matchesCat = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.recipient && e.recipient.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      date,
      category,
      description,
      amount: Number(amount),
      recipient,
      createdAt: new Date().toISOString(),
    };

    onSaveExpense(newExp);
    setIsModalOpen(false);
    setDescription('');
    setAmount(0);
    setRecipient('');
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Bar & Summary Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 border border-rose-100 p-4 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="text-xl">💸</span>
            <span>หมวดรายจ่าย & ค่าใช้จ่ายภายในระบบ</span>
          </h1>
          <p className="text-xs text-slate-500">
            บันทึกต้นทุนและค่าใช้จ่ายร้านค้าเพื่อคำนวณรายงานกำไรขาดทุนที่แม่นยำ 🌸
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-rose-400 to-pink-400 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ บันทึกรายจ่ายใหม่ 📝</span>
        </button>
      </div>

      {/* Monthly Expense Badge */}
      <div className="bg-white/90 border border-rose-100 p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs text-slate-500 font-medium">รวมรายจ่ายเดือนนี้ ({currentMonthStr}) 🗓️</span>
          <p className="text-2xl font-extrabold text-rose-500 mt-0.5">
            ฿{totalMonthlyExpense.toLocaleString()}
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center">
          <TrendingDown className="w-6 h-6" />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white/90 border border-rose-100 p-4 rounded-2xl space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-pink-50/40 border border-pink-200 text-xs text-slate-700 font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">🏷️ ทุกหมวดหมู่รายจ่าย</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-pink-400" />
            <input
              type="text"
              placeholder="ค้นหารายการ / ผู้รับเงิน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-pink-50/30 border border-pink-200 text-xs text-slate-800 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-pink-400"
            />
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-2.5">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white/90 border border-rose-100 rounded-2xl p-10 text-center text-slate-400 text-xs shadow-xs">
            🌸 ยังไม่มีรายการค่าใช้จ่าย
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white/90 border border-rose-100 hover:border-pink-200 p-4 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                  <Receipt className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">{exp.description}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                    <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700 font-bold">
                      {CATEGORY_LABELS[exp.category]}
                    </span>
                    <span>• 📅 {exp.date}</span>
                    {exp.recipient && <span>• 👤 ผู้รับ: {exp.recipient}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-extrabold text-base text-rose-600">
                  -฿{exp.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => onDeleteExpense(exp.id)}
                  className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all"
                  title="ลบรายจ่าย"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-100 text-slate-800 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <span className="text-xl">💸</span>
                <span>บันทึกรายจ่ายร้านค้าใหม่</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-rose-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">วันที่ทำรายการ</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">หมวดหมู่รายจ่าย *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">รายละเอียดรายจ่าย *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่ากล่องไปรษณีย์ 100 ใบ"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="0"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-sm text-rose-500 font-extrabold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ผู้รับเงิน / ร้านค้าซัพพลายเออร์</label>
                <input
                  type="text"
                  placeholder="เช่น Flash Express / ร้านกล่องไปรษณีย์"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-pink-50/30 border border-pink-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-rose-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  บันทึกรายจ่าย 🌸
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
