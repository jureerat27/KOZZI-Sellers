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
import { formatCurrency, formatDate, bahtText } from '../utils/format';
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

  const rawName =
    seller.bankAccountName ||
    (seller.name && !seller.name.includes('KOZZI') ? seller.name : 'จุรีรัตน์ มั่นคง');
  const cleanName = rawName.replace(/^(นางสาว|น\.ส\.|นาง|นาย)\s*/, '');
  const entrepreneurName = `นางสาว${cleanName || 'จุรีรัตน์ มั่นคง'}`;

  const taxIdNumber = seller.taxId || '1100200300401';
  const addressText =
    seller.address || '59/179 หมู่ 5 ตำบลลาดสวาย อำเภอลำลูกกา จังหวัดปทุมธานี 12150';
  const phoneText = seller.phone || '064-651-8822';
  const emailText = seller.email || 'kozzi.th@gmail.com';

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
            name: expense.description || 'ค่าใช้จ่ายทั่วไป',
            amount: expense.amount || 0,
            category: expense.category || 'OTHER',
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

          {/* 1. HEADER SECTION */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            {/* Left Side: Logo + Store Name on Top, and 4 Lines starting from the Far-Left under Logo */}
            <div className="max-w-lg space-y-1.5">
              {/* Row 1: Logo on Left + "KOZZI ราวตากผ้าอัจฉริยะ" on the Right of Logo */}
              <div className="flex items-center gap-3">
                {seller.logoUrl ? (
                  <img
                    src={seller.logoUrl}
                    alt="KOZZI"
                    className="h-10 sm:h-12 w-auto max-w-[120px] object-contain shrink-0"
                  />
                ) : (
                  <div className="h-10 px-3.5 rounded-xl bg-sky-500/15 border border-sky-300 text-[#0D2B52] flex items-center justify-center font-black text-lg tracking-wider shrink-0 shadow-xs">
                    KOZZI
                  </div>
                )}
                <span className="text-base sm:text-lg font-black text-[#0D2B52] leading-tight">
                  KOZZI ราวตากผ้าอัจฉริยะ
                </span>
              </div>

              {/* 4 Lines below the Logo, starting flush from the left edge of the document (Same alignment as Logo) */}
              <div className="space-y-0.5 text-xs text-slate-600 pt-1">
                <p className="font-semibold text-slate-800">
                  ชื่อผู้ประกอบการ : {entrepreneurName}
                </p>
                <p>
                  เลขประจำตัวผู้เสียภาษีอากร : {taxIdNumber}
                </p>
                <p className="leading-relaxed">
                  {addressText}
                </p>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-0.5">
                  <span className="flex items-center gap-1 font-medium">
                    <Phone className="w-3 h-3 text-[#0D2B52] shrink-0" />
                    <span>{phoneText}</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1 font-medium">
                    <Mail className="w-3 h-3 text-[#0D2B52] shrink-0" />
                    <span>{emailText}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side: Document Title Frame & PAYMENT VOUCHER below */}
            <div className="flex flex-col items-center sm:items-end shrink-0 self-stretch sm:self-auto pt-1 sm:pt-0">
              {/* Light Blue Transparent Rounded Box for "ใบสำคัญจ่าย" (15-25% opacity, soft sky border, Navy Blue Text) */}
              <div className="bg-sky-500/20 border border-sky-300/80 px-7 py-2.5 rounded-xl text-center min-w-[170px] sm:min-w-[190px]">
                <h1 className="text-base sm:text-xl font-black tracking-wide text-[#0D2B52] leading-tight">
                  ใบสำคัญจ่าย
                </h1>
              </div>
              {/* "PAYMENT VOUCHER" text outside the box below, centered with the box */}
              <div className="text-[11px] sm:text-xs font-black tracking-widest text-[#0D2B52] uppercase mt-1.5 text-center w-full sm:w-[190px]">
                PAYMENT VOUCHER
              </div>
            </div>
          </div>

          {/* Full-Width Horizontal Navy Blue Accent Divider Line */}
          <div className="h-[2px] bg-[#0D2B52] w-full my-4" />

          {/* 2. DOCUMENT INFO SECTION: 2 Columns x 2 Rows (Clean, No enclosing boxes) */}
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

          {/* 3. EXPENSE ITEMS TABLE: Light Blue Transparent Header, Navy Blue Text */}
          <div className="border border-sky-200 rounded-t-xl overflow-hidden mb-5">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-sky-500/20 text-[#0D2B52] font-bold border-b border-sky-200">
                  <th className="py-2.5 px-3 text-center w-14 border-r border-sky-200/80 font-bold">ลำดับ</th>
                  <th className="py-2.5 px-4 border-r border-sky-200/80 font-bold">รายการ</th>
                  <th className="py-2.5 px-4 border-r border-sky-200/80 w-40 sm:w-48 font-bold">หมวดหมู่</th>
                  <th className="py-2.5 px-4 text-right w-36 sm:w-40 font-bold">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2ECF8]">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-sky-50/40">
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

                {/* Fill subtle empty lines to maintain elegant A4 proportions if list is short */}
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
                <tr className="bg-sky-500/10 border-t-2 border-sky-200 font-bold text-slate-900">
                  <td
                    colSpan={3}
                    className="py-2.5 px-4 text-right text-[#0D2B52] font-extrabold border-r border-sky-200"
                  >
                    รวมเป็นเงินทั้งสิ้น (TOTAL)
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-black text-[#0D2B52] text-sm">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. UNDER TABLE SECTION: 2 Parts in 1 Row (Light Blue Transparent Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch mb-6">
            {/* Left: Baht Text Box (Light Blue Transparent background 10-20%, light blue border, rounded corners) */}
            <div className="sm:col-span-7 flex flex-col justify-between p-3.5 bg-sky-500/15 border border-sky-200 rounded-xl">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">
                  จำนวนเงินตัวอักษร
                </span>
                <span className="font-bold text-xs sm:text-sm text-[#0D2B52] mt-1 block">
                  ({bahtText(expense.amount)})
                </span>
              </div>

              {expense.notes && (
                <div className="mt-2 pt-2 border-t border-sky-200/80 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">หมายเหตุ: </span>
                  <span>{expense.notes}</span>
                </div>
              )}

              {expense.receiptUrl && (
                <div className="mt-2 pt-2 border-t border-sky-200/80 text-[11px] flex items-center justify-between">
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

            {/* Right: Grand Total Box (Light Blue Transparent background 15-25%, light blue border, rounded corners) */}
            <div className="sm:col-span-5 bg-sky-500/20 border border-sky-300/80 rounded-xl p-4 text-right flex flex-col justify-between">
              <span className="text-xs font-bold text-[#0D2B52] block uppercase tracking-wide">
                รวมเป็นเงินทั้งสิ้น (TOTAL)
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#0D2B52] tracking-tight my-1">
                ฿{formatCurrency(expense.amount)}
              </div>
              <span className="text-[10px] text-[#0D2B52]/70 block font-medium">
                (ยอดรวมสุทธิชำระเสร็จสมบูรณ์)
              </span>
            </div>
          </div>

          {/* 5. SIGNATURE SECTION: Exactly 3 Boxes in 1 Row (Light Blue Transparent 5-10% or soft white with sky border) */}
          <div className="mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs text-slate-700">
              {/* Box 1: ผู้จัดทำ */}
              <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-200/80 flex flex-col justify-between h-32">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้จัดทำ</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">
                    ({expense.recordedBy || 'ผู้จัดทำ'})
                  </p>
                  <p className="text-[10px] text-slate-500">วันที่ ____ / ____ / ____</p>
                </div>
              </div>

              {/* Box 2: ผู้จ่ายเงิน */}
              <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-200/80 flex flex-col justify-between h-32">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้จ่ายเงิน</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">(................................................)</p>
                  <p className="text-[10px] text-slate-500">วันที่ ____ / ____ / ____</p>
                </div>
              </div>

              {/* Box 3: ผู้รับเงิน */}
              <div className="p-3.5 rounded-xl bg-sky-500/5 border border-sky-200/80 flex flex-col justify-between h-32">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้รับเงิน</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">
                    ({expense.recipient || 'ผู้รับเงิน'})
                  </p>
                  <p className="text-[10px] text-slate-500">วันที่ ____ / ____ / ____</p>
                </div>
              </div>
            </div>
          </div>

          {/* 6. BRAND FOOTER BAR: Light Blue Transparent Bar with Flanking Navy Lines & Navy Text (No solid navy background) */}
          <div className="bg-sky-500/15 border border-sky-200/80 py-2 px-4 rounded-xl flex items-center justify-center gap-3 mt-4">
            <div className="h-[1px] bg-[#0D2B52]/25 flex-1 max-w-[80px] sm:max-w-[140px]" />
            <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-[#0D2B52]">
              SMART LIVING, BETTER LIFE
            </span>
            <div className="h-[1px] bg-[#0D2B52]/25 flex-1 max-w-[80px] sm:max-w-[140px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
