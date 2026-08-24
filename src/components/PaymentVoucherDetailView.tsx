import React, { useState } from 'react';
import {
  ArrowLeft,
  Printer,
  Download,
  Edit,
  Building2,
  Phone,
  Mail,
  Receipt,
  FileText,
  CreditCard,
  User,
  Clock,
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

  const items = expense.items && expense.items.length > 0
    ? expense.items
    : [{ name: expense.description, amount: expense.amount, notes: '' }];

  return (
    <div className="space-y-4 pb-16 animate-fadeIn">
      {/* Top Action Navigation Bar (Hidden during print) */}
      <div className="no-print bg-white/95 backdrop-blur-xs border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับ</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base">
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
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">แก้ไข</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="px-3.5 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
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
          className="bg-white border border-slate-200/90 rounded-2xl shadow-md p-6 sm:p-10 w-full max-w-4xl text-slate-800 transition-all font-sans relative"
        >
          {/* Cancelled Watermark if Cancelled */}
          {statusKey === 'CANCELLED' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 opacity-15 overflow-hidden">
              <span className="text-8xl font-black text-rose-600 border-8 border-rose-600 px-12 py-4 rounded-3xl -rotate-24 uppercase">
                CANCELLED / ยกเลิก
              </span>
            </div>
          )}

          {/* 1. HEADER: Company Info + Document Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6">
            {/* Left: Store / Company Info */}
            <div className="flex items-start gap-3.5 max-w-lg">
              {seller.logoUrl ? (
                <img
                  src={seller.logoUrl}
                  alt={seller.name}
                  className="max-h-16 max-w-[120px] object-contain shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div className="space-y-1 text-xs">
                <h2 className="text-base font-extrabold text-slate-950 leading-tight">
                  {seller.name || 'ชื่อร้านค้า / บริษัท'}
                </h2>
                {seller.taxId && (
                  <p className="text-slate-600 font-medium">
                    เลขประจำตัวผู้เสียภาษี: <span className="font-mono font-bold text-slate-900">{seller.taxId}</span>
                  </p>
                )}
                {seller.address && (
                  <p className="text-slate-600 leading-relaxed">{seller.address}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-500 pt-0.5">
                  {seller.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {seller.phone}
                    </span>
                  )}
                  {seller.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {seller.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Document Title & Meta Box */}
            <div className="text-right sm:min-w-[240px] shrink-0 self-stretch sm:self-auto flex flex-col justify-between">
              <div>
                <div className="doc-title-box bg-slate-900 text-white px-5 py-2.5 rounded-xl inline-block text-center shadow-xs">
                  <h1 className="text-base font-extrabold tracking-wide">ใบสำคัญจ่าย</h1>
                  <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase block">
                    PAYMENT VOUCHER
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs pt-3 sm:pt-0">
                <div className="flex justify-between sm:justify-end gap-2">
                  <span className="text-slate-500 font-medium">เลขที่เอกสาร:</span>
                  <span className="font-mono font-black text-slate-900">
                    {expense.voucherNumber || 'PV-XXXXXXXX-0000'}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-end gap-2">
                  <span className="text-slate-500 font-medium">วันที่จ่าย:</span>
                  <span className="font-semibold text-slate-900">{formatDate(expense.date)}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-2 items-center">
                  <span className="text-slate-500 font-medium">สถานะ:</span>
                  <span className={`font-bold text-[11px] px-2 py-0.5 rounded border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. PAYEE & PAYMENT INFO BOX */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 p-4 bg-slate-50 rounded-xl border border-slate-200/90 text-xs">
            {/* Left Col: Payee & Category */}
            <div className="space-y-2">
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">ผู้รับเงิน / ผู้รับชำระ:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {expense.recipient || 'ไม่ระบุผู้รับเงิน / ทั่วไป'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">หมวดหมู่รายจ่าย:</span>
                <span className="font-semibold text-slate-800 inline-block px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  {CATEGORY_LABELS[expense.category] || expense.category}
                </span>
              </div>
            </div>

            {/* Right Col: Payment Details */}
            <div className="space-y-2">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">ช่องทางการชำระเงิน:</span>
                <span className="font-bold text-slate-900">
                  {expense.paymentMethod || 'โอนเงินธนาคาร / เงินสด'}
                </span>
              </div>
              {expense.paymentRef && (
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">เลขที่อ้างอิงชำระ:</span>
                  <span className="font-mono font-semibold text-slate-800">{expense.paymentRef}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">ผู้บันทึกรายการ:</span>
                <span className="font-medium text-slate-700">{expense.recordedBy || seller.name || 'ผู้ดูแลระบบ'}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-medium">บันทึกเมื่อ:</span>
                <span className="text-slate-600">{formatDateTime(expense.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* 3. ITEMS TABLE */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mb-5">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-2.5 px-3 text-center w-12 border-r border-slate-700">ลำดับ</th>
                  <th className="py-2.5 px-4 border-r border-slate-700">รายการ / รายละเอียดค่าใช้จ่าย</th>
                  <th className="py-2.5 px-4 text-right w-36">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-center font-mono text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 border-r border-slate-200">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      {item.notes && <div className="text-[11px] text-slate-500 mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}

                {/* Fill empty lines to preserve professional height */}
                {items.length < 3 &&
                  Array.from({ length: 3 - items.length }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-9">
                      <td className="border-r border-slate-200"></td>
                      <td className="border-r border-slate-200"></td>
                      <td></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* 4. TOTAL & BAHT TEXT SUMMARY */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start mb-6">
            {/* Left: Baht Text Box & Notes */}
            <div className="sm:col-span-7 space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-medium text-slate-500 block">จำนวนเงินตัวอักษร:</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm text-blue-950 mt-0.5 block">
                  ({bahtText(expense.amount)})
                </span>
              </div>

              {expense.notes && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-0.5">
                  <span className="font-bold text-slate-700 block text-[11px]">หมายเหตุ:</span>
                  <p className="text-slate-600 whitespace-pre-line leading-relaxed">{expense.notes}</p>
                </div>
              )}

              {expense.receiptUrl && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    หลักฐานการชำระเงินแนบ
                  </span>
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-bold text-xs"
                  >
                    เปิดดูไฟล์แนบ
                  </a>
                </div>
              )}
            </div>

            {/* Right: Grand Total Box */}
            <div className="sm:col-span-5 bg-slate-900 text-white rounded-xl p-4 space-y-2 text-right shadow-xs">
              <span className="text-xs text-slate-300 font-medium block">รวมเป็นเงินทั้งสิ้น (TOTAL)</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                ฿{formatCurrency(expense.amount)}
              </div>
              <span className="text-[10px] text-slate-400 block border-t border-slate-700 pt-1.5">
                (ยอดรวมสุทธิรวมภาษีถ้ามี)
              </span>
            </div>
          </div>

          {/* 5. SIGNATURES & AUDIT BLOCK */}
          <div className="pt-6 border-t-2 border-slate-900">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs text-slate-700">
              {/* Preparer */}
              <div className="space-y-6 flex flex-col justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px]">ผู้จัดทำ (Prepared By)</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">
                    ({expense.recordedBy || seller.name || 'ผู้จัดทำ'})
                  </p>
                  <p className="text-[10px] text-slate-500">วันที่ ...../...../.........</p>
                </div>
              </div>

              {/* Checker */}
              <div className="space-y-6 flex flex-col justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px]">ผู้ตรวจสอบ (Checked By)</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">(................................................)</p>
                  <p className="text-[10px] text-slate-500">วันที่ ...../...../.........</p>
                </div>
              </div>

              {/* Approver */}
              <div className="space-y-6 flex flex-col justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px]">ผู้อนุมัติ (Approved By)</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">(................................................)</p>
                  <p className="text-[10px] text-slate-500">วันที่ ...../...../.........</p>
                </div>
              </div>

              {/* Receiver */}
              <div className="space-y-6 flex flex-col justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-200">
                <span className="font-bold text-slate-800 text-[11px]">ผู้รับเงิน (Received By)</span>
                <div className="space-y-1">
                  <p className="text-slate-400 text-[11px]">................................................</p>
                  <p className="font-medium text-slate-700 text-[11px]">
                    ({expense.recipient || 'ผู้รับเงิน'})
                  </p>
                  <p className="text-[10px] text-slate-500">วันที่ ...../...../.........</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
