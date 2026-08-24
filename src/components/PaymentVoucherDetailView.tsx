import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  Edit,
  Phone,
  Mail,
  CheckCircle2,
  Clock3,
  XCircle,
  Paperclip,
} from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseStatus, SellerProfile } from '../types';
import { formatCurrency, formatDate, formatDateTime, bahtText } from '../utils/format';
import { exportElementToPdf } from '../utils/pdf';

interface PaymentVoucherDetailViewProps {
  expense: Expense;
  seller: SellerProfile;
  onClose: () => void;
  onEditExpense: (expense: Expense) => void;
  onUpdateStatus?: (expense: Expense, newStatus: ExpenseStatus) => void;
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

const STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  PAID: {
    label: 'ชำระแล้ว (PAID)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  DRAFT: {
    label: 'ร่าง (DRAFT)',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Clock3,
  },
  CANCELLED: {
    label: 'ยกเลิก (CANCELLED)',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
};

export const PaymentVoucherDetailView: React.FC<PaymentVoucherDetailViewProps> = ({
  expense,
  seller,
  onClose,
  onEditExpense,
  onUpdateStatus,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const statusKey: ExpenseStatus = expense.status || 'PAID';
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PAID;
  const StatusIcon = statusCfg.icon;

  const storeName = seller.name || 'KOZZI ราวตากผ้าอัจฉริยะ';
  const storeAddress =
    seller.address || '59/179 หมู่ 5 ตำบลลาดสวาย อำเภอลำลูกกา จังหวัดปทุมธานี 12150';
  const storePhone = seller.phone || '064-651-8822';
  const storeEmail = seller.email || 'kozzi.th@gmail.com';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const filename = `Payment_Voucher_${expense.voucherNumber || expense.id}`;
      await exportElementToPdf('printable-document-container', filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const items =
    expense.items && expense.items.length > 0
      ? expense.items
      : [
          {
            name: expense.description,
            amount: expense.amount,
            category: expense.category,
            notes: '',
          },
        ];

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">
      {/* Top Action Navigation Bar (Hidden during print) */}
      <div className="no-print bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับ</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0D2B52] text-sm sm:text-base">
                {expense.voucherNumber || 'ใบสำคัญจ่าย'}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusCfg.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              เชื่อมโยงกับรายการรายจ่าย ID: {expense.id}
            </p>
          </div>
        </div>

        {/* Actions right side */}
        <div className="flex items-center gap-2">
          {/* Status Switcher */}
          {onUpdateStatus && (
            <select
              value={statusKey}
              onChange={(e) => onUpdateStatus(expense, e.target.value as ExpenseStatus)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="PAID">สถานะ: ชำระแล้ว</option>
              <option value="DRAFT">สถานะ: ร่าง</option>
              <option value="CANCELLED">สถานะ: ยกเลิก</option>
            </select>
          )}

          <button
            onClick={() => onEditExpense(expense)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">แก้ไข</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-[#0D2B52] hover:bg-[#081d38] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF'}</span>
          </button>
        </div>
      </div>

      {/* Main Printable A4 Voucher Container */}
      <div className="flex justify-center">
        <div
          id="printable-document-container"
          className="bg-white border border-[#CBD7E6] rounded-2xl shadow-md p-6 sm:p-10 w-full max-w-4xl text-slate-800 transition-all font-sans relative"
        >
          {/* Cancelled Watermark if Cancelled */}
          {statusKey === 'CANCELLED' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-15 overflow-hidden">
              <span className="text-8xl font-black text-rose-600 border-8 border-rose-600 px-12 py-4 rounded-3xl -rotate-24 uppercase">
                CANCELLED / ยกเลิก
              </span>
            </div>
          )}

          {/* 1. HEADER: KOZZI Logo & Info (Left) + Document Title Frame (Right) */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            {/* Left: Logo + Store Info */}
            <div className="space-y-1.5 max-w-md">
              {/* Logo (Top-Left Prominent) */}
              <div className="pb-1">
                {seller.logoUrl ? (
                  <img
                    src={seller.logoUrl}
                    alt={storeName}
                    className="max-h-14 w-auto max-w-[140px] object-contain shrink-0"
                  />
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0D2B52] to-[#1D63B8] text-white shadow-xs">
                    <span className="font-black text-lg tracking-wider">KOZZI</span>
                    <span className="text-[10px] text-sky-200 font-medium border-l border-white/20 pl-2">
                      SMART LIVING
                    </span>
                  </div>
                )}
              </div>

              {/* Store Name - Exactly below Logo */}
              <h2 className="text-base font-extrabold text-[#0D2B52] leading-tight pt-0.5">
                {storeName}
              </h2>

              {/* Address - 1 line below Store Name */}
              <p className="text-xs text-slate-600 leading-relaxed">{storeAddress}</p>

              {/* Contact Info - with small phone and mail icons */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#0D2B52] shrink-0" />
                  <span>{storePhone}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#0D2B52] shrink-0" />
                  <span>{storeEmail}</span>
                </span>
              </div>
            </div>

            {/* Right: Document Title Frame - Aligned horizontally with "KOZZI ราวตากผ้าอัจฉริยะ" on the left */}
            <div className="text-right sm:min-w-[220px] shrink-0 self-stretch sm:self-auto flex flex-col items-end pt-0 sm:pt-[52px]">
              {/* Navy Blue Rounded Frame for "ใบสำคัญจ่าย" */}
              <div className="bg-[#0D2B52] text-white px-7 py-2 rounded-xl text-center shadow-xs inline-block">
                <h1 className="text-base sm:text-lg font-bold tracking-wide text-white leading-tight">
                  ใบสำคัญจ่าย
                </h1>
              </div>
              {/* "PAYMENT VOUCHER" text below the frame */}
              <div className="text-xs font-extrabold tracking-widest text-[#0D2B52] uppercase mt-1 pr-1 text-center w-full sm:w-auto">
                PAYMENT VOUCHER
              </div>
            </div>
          </div>

          {/* Full-Width Navy Blue Horizontal Divider Line */}
          <div className="h-[2px] bg-[#0D2B52] w-full my-5" />

          {/* 2. DOCUMENT INFO SECTION: 2 Columns x 2 Rows (No enclosing box) */}
          <div className="text-xs text-slate-700 space-y-2 mb-6">
            {/* Row 1: จ่ายให้ (Left) | เลขที่เอกสาร (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-[#E2ECF8] border-dashed">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-slate-500 shrink-0 min-w-[65px]">จ่ายให้ :</span>
                <span className="font-bold text-[#0D2B52] text-sm truncate">
                  {expense.recipient || 'ไม่ระบุผู้รับเงิน / ทั่วไป'}
                </span>
              </div>
              <div className="flex items-baseline justify-start sm:justify-end gap-2">
                <span className="font-semibold text-slate-500 shrink-0">เลขที่เอกสาร :</span>
                <span className="font-mono font-bold text-[#0D2B52] text-sm">
                  {expense.voucherNumber || expense.id}
                </span>
              </div>
            </div>

            {/* Row 2: ช่องทางการชำระเงิน (Left) | วันที่จ่าย (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-0.5">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-slate-500 shrink-0 min-w-[130px]">
                  ช่องทางการชำระเงิน :
                </span>
                <span className="font-medium text-slate-800">
                  {expense.paymentMethod || 'โอนเงินธนาคาร'}
                  {expense.paymentRef ? (
                    <span className="font-mono text-slate-600 ml-1.5">
                      (Ref: {expense.paymentRef})
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="flex items-baseline justify-start sm:justify-end gap-2">
                <span className="font-semibold text-slate-500 shrink-0">วันที่จ่าย :</span>
                <span className="font-semibold text-slate-800">{formatDate(expense.date)}</span>
              </div>
            </div>
          </div>

          {/* 3. EXPENSE ITEMS TABLE */}
          <div className="border border-[#CBD7E6] rounded-t-xl overflow-hidden mb-5">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#0D2B52] text-white font-bold">
                  <th className="py-2.5 px-3 text-center w-14 border-r border-[#1D406E]">ลำดับ</th>
                  <th className="py-2.5 px-4 border-r border-[#1D406E]">รายการ</th>
                  <th className="py-2.5 px-4 border-r border-[#1D406E] w-40">หมวดหมู่</th>
                  <th className="py-2.5 px-4 text-right w-36">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2ECF8]">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-[#E2ECF8]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 border-r border-[#E2ECF8]">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {item.notes && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 border-r border-[#E2ECF8] text-slate-700 font-medium">
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}

                {/* Fill subtle empty lines to maintain elegant A4 proportions */}
                {items.length < 3 &&
                  Array.from({ length: 3 - items.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-9">
                      <td className="border-r border-[#E2ECF8]"></td>
                      <td className="border-r border-[#E2ECF8]"></td>
                      <td className="border-r border-[#E2ECF8]"></td>
                      <td></td>
                    </tr>
                  ))}

                {/* Table Bottom Summary Row */}
                <tr className="bg-sky-50/50 border-t-2 border-[#CBD7E6] font-bold text-slate-900">
                  <td colSpan={3} className="py-2.5 px-4 text-right text-[#0D2B52] font-extrabold border-r border-[#CBD7E6]">
                    รวมเป็นเงินทั้งสิ้น (TOTAL)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-black text-[#0D2B52] text-sm">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. UNDER TABLE SECTION: 2 Parts in 1 Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch mb-6">
            {/* Left: Baht Text Box (White background, light blue border) */}
            <div className="sm:col-span-7 flex flex-col justify-between p-3.5 bg-white border border-[#BAE6FD] rounded-xl">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  จำนวนเงินตัวอักษร:
                </span>
                <span className="font-bold text-xs sm:text-sm text-[#0D2B52] mt-0.5 block">
                  ({bahtText(expense.amount)})
                </span>
              </div>

              {expense.notes && (
                <div className="mt-2 pt-2 border-t border-[#E2ECF8] text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">หมายเหตุ: </span>
                  <span>{expense.notes}</span>
                </div>
              )}

              {expense.receiptUrl && (
                <div className="mt-2 pt-2 border-t border-[#E2ECF8] text-[11px] flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#0D2B52]" />
                    หลักฐานการชำระเงินแนบ
                  </span>
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1877F2] hover:underline font-bold"
                  >
                    เปิดดูไฟล์แนบ
                  </a>
                </div>
              )}
            </div>

            {/* Right: Grand Total Box (Navy Blue background, rounded corners) */}
            <div className="sm:col-span-5 bg-[#0D2B52] text-white rounded-xl p-4 shadow-sm text-right flex flex-col justify-between">
              <span className="text-xs font-semibold text-sky-200 block uppercase tracking-wide">
                รวมเป็นเงินทั้งสิ้น (TOTAL)
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight my-1">
                ฿{formatCurrency(expense.amount)}
              </div>
              <span className="text-[10px] text-sky-300/80 block">
                (ยอดรวมสุทธิชำระเสร็จสมบูรณ์)
              </span>
            </div>
          </div>

          {/* 5. SIGNATURE SECTION: Exactly 3 Boxes in 1 Row */}
          <div className="mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs text-slate-700">
              {/* Box 1: ผู้จัดทำ */}
              <div className="p-3.5 rounded-xl bg-white border border-[#BAE6FD] flex flex-col justify-between h-32">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้จัดทำ</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">
                    ({expense.recordedBy || 'ผู้จัดทำ'})
                  </p>
                  <p className="text-[10px] text-slate-500">วันที่ ___ / ___ / ___</p>
                </div>
              </div>

              {/* Box 2: ผู้จ่ายเงิน */}
              <div className="p-3.5 rounded-xl bg-white border border-[#BAE6FD] flex flex-col justify-between h-32">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้จ่ายเงิน</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">(................................................)</p>
                  <p className="text-[10px] text-slate-500">วันที่ ___ / ___ / ___</p>
                </div>
              </div>

              {/* Box 3: ผู้รับเงิน */}
              <div className="p-3.5 rounded-xl bg-white border border-[#BAE6FD] flex flex-col justify-between h-32">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้รับเงิน</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">
                    ({expense.recipient || 'ผู้รับเงิน'})
                  </p>
                  <p className="text-[10px] text-slate-500">วันที่ ___ / ___ / ___</p>
                </div>
              </div>
            </div>
          </div>

          {/* 6. BRAND FOOTER BAR: Full-Width Thin Navy Blue Bar */}
          <div className="bg-[#0D2B52] text-white py-1.5 px-4 text-center rounded-b-xl">
            <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase text-sky-100">
              SMART LIVING, BETTER LIFE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
