import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  Edit,
  CheckCircle2,
  Clock3,
  XCircle,
  Paperclip,
} from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseStatus, SellerProfile } from '../types';
import { formatCurrency, formatDate, bahtText } from '../utils/format';
import { exportElementToPdf, printElementIsolated } from '../utils/pdf';
import { DocumentHeader } from './DocumentHeader';

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

  const handlePrint = () => {
    printElementIsolated(
      'payment-voucher-container',
      `ใบสำคัญจ่าย_${expense.voucherNumber || expense.id}`,
      'a5'
    );
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExporting(true);
      const filename = `Payment_Voucher_${expense.voucherNumber || expense.id}`;
      await exportElementToPdf('payment-voucher-container', filename, {
        format: 'a5',
        orientation: 'p',
        marginMm: 6,
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      printElementIsolated(
        'payment-voucher-container',
        `ใบสำคัญจ่าย_${expense.voucherNumber || expense.id}`,
        'a5'
      );
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                ขนาด A5 (148 x 210 mm)
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
        <div className="flex items-center gap-2 flex-wrap">
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
            <span>พิมพ์ (A5)</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'กำลังสร้าง...' : 'ดาวน์โหลด PDF (A5)'}</span>
          </button>
        </div>
      </div>

      {/* Main Printable A5 Voucher Container */}
      <div className="flex justify-center">
        <div
          id="payment-voucher-container"
          className="bg-white p-4 sm:p-5 w-full max-w-[540px] text-slate-800 transition-all font-sans relative"
        >
          {/* Cancelled Watermark if Cancelled */}
          {statusKey === 'CANCELLED' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-15 overflow-hidden">
              <span className="text-6xl font-black text-rose-600 border-8 border-rose-600 px-6 py-2.5 rounded-2xl -rotate-24 uppercase">
                CANCELLED / ยกเลิก
              </span>
            </div>
          )}

          {/* 1. SHARED DOCUMENT HEADER (Compact A5 Mode) */}
          <DocumentHeader
            seller={seller}
            titleThai="ใบสำคัญจ่าย"
            titleEnglish="PAYMENT VOUCHER"
            showEntrepreneurAndTaxId={true}
            showStoreName={false}
            showPhoneAndEmail={false}
            compact={true}
          />

          {/* 2. DOCUMENT INFO SECTION: 2 Columns x 2 Rows */}
          <div className="text-[11px] text-slate-700 space-y-1 mb-2.5">
            {/* Row 1: จ่ายให้ (Left) | เลขที่เอกสาร (Right) */}
            <div className="grid grid-cols-2 gap-2 pb-1 border-b border-[#E2ECF8] border-dashed">
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="font-semibold text-slate-500 shrink-0 min-w-[48px]">จ่ายให้ :</span>
                <span className="font-bold text-[#0D2B52] text-xs truncate">
                  {expense.recipient || 'ไม่ระบุผู้รับเงิน / ทั่วไป'}
                </span>
              </div>
              <div className="flex items-baseline justify-end gap-1 min-w-0">
                <span className="font-semibold text-slate-500 shrink-0">เลขที่เอกสาร :</span>
                <span className="font-mono font-bold text-[#0D2B52] text-xs truncate">
                  {expense.voucherNumber || expense.id}
                </span>
              </div>
            </div>

            {/* Row 2: ช่องทางการชำระเงิน (Left) | วันที่จ่าย (Right) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="font-semibold text-slate-500 shrink-0 min-w-[95px]">
                  ช่องทางการชำระเงิน :
                </span>
                <span className="font-medium text-slate-800 text-[11px] truncate">
                  {expense.paymentMethod || 'โอนเงินธนาคาร'}
                  {expense.paymentRef ? (
                    <span className="font-mono text-slate-600 ml-1">
                      (Ref: {expense.paymentRef})
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="flex items-baseline justify-end gap-1 min-w-0">
                <span className="font-semibold text-slate-500 shrink-0">วันที่จ่าย :</span>
                <span className="font-semibold text-slate-800 text-[11px]">{formatDate(expense.date)}</span>
              </div>
            </div>
          </div>

          {/* 3. EXPENSE ITEMS TABLE: Compact, Light Blue Header, Navy Blue Text */}
          <div className="border border-[#BAE6FD] rounded-lg overflow-hidden mb-2.5">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="bg-[#E0F2FE] text-[#0D2B52] font-bold border-b border-[#BAE6FD]">
                  <th className="py-1.5 px-2 text-center w-10 border-r border-[#BAE6FD] font-bold">ลำดับ</th>
                  <th className="py-1.5 px-2.5 border-r border-[#BAE6FD] font-bold">รายการ</th>
                  <th className="py-1.5 px-2 border-r border-[#BAE6FD] w-28 font-bold">หมวดหมู่</th>
                  <th className="py-1.5 px-2.5 text-right w-28 font-bold">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2ECF8]">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-sky-50/40">
                    <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-[#E2ECF8]">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-[#E2ECF8]">
                      <div className="font-semibold text-slate-900 leading-tight">{item.name}</div>
                      {item.notes && (
                        <div className="text-[9px] text-slate-500 mt-0.5">{item.notes}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border-r border-[#E2ECF8] text-slate-700 font-medium">
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}

                {/* Single subtle compact placeholder row if only 1 item */}
                {items.length === 1 && (
                  <tr className="h-5">
                    <td className="border-r border-[#E2ECF8]"></td>
                    <td className="border-r border-[#E2ECF8]"></td>
                    <td className="border-r border-[#E2ECF8]"></td>
                    <td></td>
                  </tr>
                )}

                {/* Table Bottom Summary Row */}
                <tr className="bg-[#F0F9FF] border-t border-[#BAE6FD] font-bold text-slate-900">
                  <td
                    colSpan={3}
                    className="py-1.5 px-2.5 text-right text-[#0D2B52] font-extrabold border-r border-[#BAE6FD] text-[11px]"
                  >
                    รวมเป็นเงินทั้งสิ้น (TOTAL)
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono font-black text-[#0D2B52] text-xs">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. UNDER TABLE SECTION: Baht Text & Total Card */}
          <div className="grid grid-cols-12 gap-2 items-stretch mb-2.5">
            {/* Left: Baht Text Box */}
            <div className="col-span-7 flex flex-col justify-between p-2 bg-[#EBF5FE] border border-[#BAE6FD] rounded-lg">
              <div>
                <span className="text-[9px] font-semibold text-slate-500 block">
                  จำนวนเงินตัวอักษร
                </span>
                <span className="font-bold text-[11px] text-[#0D2B52] mt-0.5 block leading-tight">
                  ({bahtText(expense.amount)})
                </span>
              </div>

              {expense.notes && (
                <div className="mt-1 pt-1 border-t border-[#BAE6FD] text-[9px] text-slate-600">
                  <span className="font-bold text-slate-700">หมายเหตุ: </span>
                  <span>{expense.notes}</span>
                </div>
              )}

              {expense.receiptUrl && (
                <div className="mt-1 pt-1 border-t border-[#BAE6FD] text-[9px] flex items-center justify-between no-print">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Paperclip className="w-2.5 h-2.5 text-[#0D2B52]" />
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

            {/* Right: Grand Total Box */}
            <div className="col-span-5 bg-[#E0F2FE] border border-[#7DD3FC] rounded-lg p-2 text-right flex flex-col justify-between">
              <span className="text-[10px] font-bold text-[#0D2B52] block uppercase tracking-wide">
                รวมเป็นเงินทั้งสิ้น (TOTAL)
              </span>
              <div className="text-lg font-black font-mono text-[#0D2B52] tracking-tight my-0.5">
                ฿{formatCurrency(expense.amount)}
              </div>
              <span className="text-[8px] text-[#0D2B52]/70 block font-medium">
                (ยอดรวมสุทธิชำระเสร็จสมบูรณ์)
              </span>
            </div>
          </div>

          {/* 5. SIGNATURE SECTION: Exactly 3 Generous Boxes in 1 Row */}
          <div>
            <div className="grid grid-cols-3 gap-2.5 text-center text-slate-700">
              {/* Box 1: ผู้จัดทำ */}
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#BAE6FD] flex flex-col justify-between h-[100px]">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้จัดทำ</span>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-slate-400 font-semibold tracking-wider text-[10px] leading-none">
                    ........................................
                  </p>
                  <p className="font-medium text-slate-700 text-[9px] truncate leading-tight">
                    ({expense.recordedBy || 'ผู้จัดทำ'})
                  </p>
                  <p className="text-[8px] text-slate-500 leading-none">วันที่ ____ / ____ / ____</p>
                </div>
              </div>

              {/* Box 2: ผู้จ่ายเงิน */}
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#BAE6FD] flex flex-col justify-between h-[100px]">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้จ่ายเงิน</span>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-slate-400 font-semibold tracking-wider text-[10px] leading-none">
                    ........................................
                  </p>
                  <p className="font-medium text-slate-700 text-[9px] truncate leading-tight">(....................................)</p>
                  <p className="text-[8px] text-slate-500 leading-none">วันที่ ____ / ____ / ____</p>
                </div>
              </div>

              {/* Box 3: ผู้รับเงิน */}
              <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#BAE6FD] flex flex-col justify-between h-[100px]">
                <span className="font-bold text-[#0D2B52] text-xs">ผู้รับเงิน</span>
                <div className="space-y-1.5 mt-auto">
                  <p className="text-slate-400 font-semibold tracking-wider text-[10px] leading-none">
                    ........................................
                  </p>
                  <p className="font-medium text-slate-700 text-[9px] truncate leading-tight">
                    ({expense.recipient || 'ผู้รับเงิน'})
                  </p>
                  <p className="text-[8px] text-slate-500 leading-none">วันที่ ____ / ____ / ____</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

