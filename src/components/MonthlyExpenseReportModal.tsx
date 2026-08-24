import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Calendar,
  Layers,
  Sparkles,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';
import { Expense, ExpenseCategory, SellerProfile } from '../types';
import { formatCurrency, formatDate, bahtText } from '../utils/format';
import { exportElementToPdf } from '../utils/pdf';

interface MonthlyExpenseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  seller: SellerProfile;
  initialYear?: number;
  initialMonth?: number; // 0-11
}

export const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const EXPENSE_CATEGORY_THAI: Record<ExpenseCategory, string> = {
  COST_OF_GOODS: 'ต้นทุนสินค้า',
  SHIPPING: 'ค่าจัดส่งสินค้า',
  PACKAGING: 'กล่อง/อุปกรณ์แพ็คของ',
  MARKETING: 'ค่าโฆษณา/การตลาด',
  UTILITIES: 'ค่าน้ำ/ค่าไฟ/อินเทอร์เน็ต',
  RENT: 'ค่าเช่าสถานที่/โกดัง',
  SALARY: 'ค่าแรง/เงินเดือน',
  OTHER: 'ค่าใช้จ่ายอื่นๆ',
};

export const MonthlyExpenseReportModal: React.FC<MonthlyExpenseReportModalProps> = ({
  isOpen,
  onClose,
  expenses,
  seller,
  initialYear,
  initialMonth,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Extract all distinct years and months from existing expenses
  const availablePeriods = useMemo(() => {
    const periodMap = new Map<string, { year: number; month: number; count: number; total: number }>();

    // Scan all expenses
    expenses.forEach((e) => {
      if (!e.date) return;
      const cleanDate = e.date.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-11
        if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
          const key = `${y}-${String(m + 1).padStart(2, '0')}`;
          const current = periodMap.get(key) || { year: y, month: m, count: 0, total: 0 };
          current.count += 1;
          if (e.status !== 'CANCELLED') {
            current.total += e.amount || 0;
          }
          periodMap.set(key, current);
        }
      }
    });

    // Ensure January 2026 and current month are available if needed
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const defaultKeys = [`2026-01`, `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`];
    defaultKeys.forEach((k) => {
      if (!periodMap.has(k)) {
        const [y, mStr] = k.split('-');
        periodMap.set(k, {
          year: parseInt(y, 10),
          month: parseInt(mStr, 10) - 1,
          count: 0,
          total: 0,
        });
      }
    });

    return Array.from(periodMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year; // newest year first
      return b.month - a.month;
    });
  }, [expenses]);

  // Determine smart default month/year:
  // If initial props passed, use them. Otherwise prefer January 2026 if it has data, or the latest available period.
  const defaultPeriod = useMemo(() => {
    if (initialYear !== undefined && initialMonth !== undefined) {
      return { year: initialYear, month: initialMonth };
    }
    // Check if 2026-01 has expenses
    const jan2026 = availablePeriods.find((p) => p.year === 2026 && p.month === 0 && p.count > 0);
    if (jan2026) {
      return { year: 2026, month: 0 };
    }
    // Else find first period with count > 0
    const withData = availablePeriods.find((p) => p.count > 0);
    if (withData) {
      return { year: withData.year, month: withData.month };
    }
    return { year: 2026, month: 0 };
  }, [availablePeriods, initialYear, initialMonth]);

  const [selectedYear, setSelectedYear] = useState<number>(defaultPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultPeriod.month); // 0-11
  const [includeCancelled, setIncludeCancelled] = useState<boolean>(false);

  // Distinct year options (e.g. 2026 (2569), 2025 (2568), 2027 (2570))
  const yearOptions = useMemo(() => {
    const set = new Set<number>([2026, 2025, 2024, new Date().getFullYear()]);
    availablePeriods.forEach((p) => set.add(p.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [availablePeriods]);

  // Filter and sort expenses for the selected year & month
  const targetPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  
  const monthlyExpenses = useMemo(() => {
    const list = expenses.filter((e) => {
      if (!e.date) return false;
      const cleanDate = e.date.split('T')[0];
      const matchMonth = cleanDate.startsWith(targetPrefix);
      if (!matchMonth) return false;
      if (!includeCancelled && e.status === 'CANCELLED') return false;
      return true;
    });

    // Sort by date ascending (oldest to newest), then by voucherNumber ascending
    return list.sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const vA = a.voucherNumber || '';
      const vB = b.voucherNumber || '';
      return vA.localeCompare(vB);
    });
  }, [expenses, targetPrefix, includeCancelled]);

  // Total summary calculation
  const totalItemsCount = monthlyExpenses.length;
  const activeItems = monthlyExpenses.filter((e) => e.status !== 'CANCELLED');
  const grandTotalAmount = activeItems.reduce((sum, e) => sum + (e.amount || 0), 0);

  const thaiMonthName = THAI_MONTH_NAMES[selectedMonth] || '';
  const thaiYearBE = selectedYear + 543;
  const reportPeriodThai = `ประจำเดือน ${thaiMonthName} ${thaiYearBE}`;

  // Seller info formatting
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
      setIsExportingPdf(true);
      const filename = `รายงานค่าใช้จ่าย_${thaiMonthName}_${thaiYearBE}`;
      await exportElementToPdf('printable-monthly-expense-report-doc', filename);
    } catch (err) {
      console.error('Export PDF error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      {/* Dynamic Print Styles for Clean Single/Multi-page A4 Output */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-monthly-expense-report-doc,
          #printable-monthly-expense-report-doc * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #printable-monthly-expense-report-doc {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16mm 14mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Control Bar */}
        <div className="no-print bg-[#F8FAFC] border-b border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-[#0759A6] flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#0D2B52]">
                  รายงานค่าใช้จ่ายทั้งหมด (รายเดือน)
                </h2>
                <span className="bg-sky-100 text-[#0759A6] px-2 py-0.5 rounded-md text-[11px] font-bold">
                  {thaiMonthName} {thaiYearBE}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                เลือกเดือนและปีเพื่อดู Preview รายงาน และพิมพ์หรือดาวน์โหลดเอกสาร PDF ขนาด A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all active:scale-98 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#0759A6]" />
              <span>พิมพ์รายงาน</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-[#0759A6] hover:bg-[#064B8B] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all ml-1 cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar: Month, Year, Quick Period, and Cancelled Toggle */}
        <div className="no-print bg-white border-b border-slate-200 p-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Month-Year selector with record count and amount */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#0D2B52] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0759A6]" />
                <span>เลือกเดือน:</span>
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-[#0D2B52] px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 shadow-2xs"
              >
                {THAI_MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-[#0D2B52]">เลือกปี (พ.ศ.):</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-[#0D2B52] px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 shadow-2xs"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y + 543} ({y})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Period Selector Jump */}
            {availablePeriods.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500">เดือนที่มีข้อมูล:</span>
                <select
                  value={`${selectedYear}-${selectedMonth}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-');
                    setSelectedYear(parseInt(y, 10));
                    setSelectedMonth(parseInt(m, 10));
                  }}
                  className="bg-sky-50/60 border border-sky-200 text-[11px] font-bold text-[#0759A6] px-2.5 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 shadow-2xs"
                >
                  {availablePeriods.map((p) => {
                    const mName = THAI_MONTH_NAMES[p.month];
                    const yBE = p.year + 543;
                    return (
                      <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                        {mName} {yBE} — {p.count} รายการ — ฿{formatCurrency(p.total)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Toggle: Include Cancelled items */}
          <button
            type="button"
            onClick={() => setIncludeCancelled(!includeCancelled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              includeCancelled
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {includeCancelled ? (
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>รวมรายการที่ยกเลิก</span>
          </button>
        </div>

        {/* Modal Scrollable Body - Document Preview Screen */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100/70 flex justify-center">
          {/* A4 Document Container */}
          <div
            id="printable-monthly-expense-report-doc"
            ref={documentRef}
            className="w-full max-w-[210mm] bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-10 space-y-6 text-slate-800"
            style={{ minHeight: '297mm', boxSizing: 'border-box' }}
          >
            {/* Header Section: Left Shop & Entrepreneur Info, Right Report Title in Light Blue Frame */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-5 border-b-2 border-sky-100 pb-5">
              {/* Left Column: Business & Entrepreneur Information */}
              <div className="space-y-1.5 max-w-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-[#0759A6] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-[#0D2B52] leading-tight">
                      KOZZI ราวตากผ้าอัจฉริยะ
                    </h1>
                    <p className="text-[11px] font-bold text-sky-700">SMART LIVING, BETTER LIFE</p>
                  </div>
                </div>

                <div className="pt-2 space-y-0.5 text-xs text-slate-600 leading-relaxed font-medium">
                  <p className="font-bold text-slate-800">
                    ชื่อผู้ประกอบการ : <span className="font-extrabold text-[#0D2B52]">{entrepreneurName}</span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-700">เลขประจำตัวผู้เสียภาษีอากร :</span>{' '}
                    <span className="font-mono">{taxIdNumber}</span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-700">ที่อยู่ :</span> {addressText}
                  </p>
                  <p>
                    <span className="font-bold text-slate-700">เบอร์โทรศัพท์ :</span> {phoneText}{' '}
                    <span className="mx-1 text-slate-300">|</span>{' '}
                    <span className="font-bold text-slate-700">Email :</span> {emailText}
                  </p>
                </div>
              </div>

              {/* Right Column: Report Title in Light Blue Transparent Box */}
              <div className="sm:text-right flex flex-col sm:items-end justify-start shrink-0">
                <div className="bg-sky-500/10 border border-sky-400/30 rounded-2xl px-5 py-3.5 shadow-2xs space-y-1 text-center sm:text-right">
                  <h2 className="text-base sm:text-lg font-black text-[#0D2B52] tracking-wide">
                    รายงานค่าใช้จ่ายประจำเดือน
                  </h2>
                  <p className="text-xs sm:text-sm font-extrabold text-[#0759A6]">
                    {reportPeriodThai}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-2">
                  วันที่พิมพ์เอกสาร: {formatDate(new Date().toISOString().split('T')[0])}
                </p>
              </div>
            </div>

            {/* Table of Monthly Expenses */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sky-500/15 border-y-2 border-sky-300/40 text-[#0D2B52] font-black">
                    <th className="py-2.5 px-2 text-center w-10">ลำดับ</th>
                    <th className="py-2.5 px-2.5 w-24">วันที่จ่าย</th>
                    <th className="py-2.5 px-2.5 w-32">เลขที่ใบสำคัญจ่าย</th>
                    <th className="py-2.5 px-2.5 w-28">หมวดหมู่</th>
                    <th className="py-2.5 px-3">รายการ / รายละเอียด</th>
                    <th className="py-2.5 px-2.5 w-28">ผู้รับเงิน</th>
                    <th className="py-2.5 px-2.5 w-28">ช่องทางชำระ</th>
                    <th className="py-2.5 px-3 text-right w-28">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {monthlyExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-500">
                          ไม่พบรายการค่าใช้จ่ายในเดือนที่เลือก
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          ({thaiMonthName} {thaiYearBE} - 0 รายการ)
                        </p>
                      </td>
                    </tr>
                  ) : (
                    monthlyExpenses.map((exp, idx) => {
                      const isCancelled = exp.status === 'CANCELLED';
                      const catName =
                        EXPENSE_CATEGORY_THAI[exp.category as ExpenseCategory] ||
                        exp.category ||
                        '-';

                      return (
                        <tr
                          key={exp.id || idx}
                          className={`hover:bg-sky-50/40 transition-colors ${
                            isCancelled ? 'bg-rose-50/40 text-slate-400' : ''
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2.5 font-mono text-slate-700 whitespace-nowrap">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-2.5 px-2.5 font-bold font-mono text-[#0759A6] whitespace-nowrap">
                            {exp.voucherNumber || '-'}
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[11px]">
                              {catName}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{exp.description}</span>
                              {isCancelled && (
                                <span className="px-1.5 py-0.2 text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 rounded">
                                  ยกเลิก
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap">
                            {exp.recipient || '-'}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap">
                            {exp.paymentMethod || 'โอนเงินธนาคาร'}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                              isCancelled ? 'line-through text-slate-400' : 'text-[#0D2B52]'
                            }`}
                          >
                            {formatCurrency(exp.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Monthly Summary Box */}
            <div className="bg-sky-500/5 border border-sky-200/60 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500">
                  จำนวนรายการค่าใช้จ่ายทั้งหมดในเดือนนี้:
                </span>
                <p className="text-sm font-extrabold text-[#0D2B52]">
                  {totalItemsCount} รายการ{' '}
                  {includeCancelled && (
                    <span className="text-xs text-slate-400 font-normal">
                      (รายการปกติ {activeItems.length} รายการ)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-600 font-bold mt-1">
                  จำนวนเงินตัวอักษร: <span className="text-[#0759A6] font-extrabold">({bahtText(grandTotalAmount)})</span>
                </p>
              </div>

              <div className="text-right bg-white border border-sky-300/50 rounded-xl px-5 py-3 shadow-2xs w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 block">
                  ยอดรวมค่าใช้จ่ายทั้งเดือน (สุทธิ)
                </span>
                <p className="text-xl sm:text-2xl font-black text-[#0759A6] font-mono mt-0.5">
                  ฿{formatCurrency(grandTotalAmount)}
                </p>
              </div>
            </div>

            {/* Signatures Area */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
              <div className="space-y-6">
                <p className="font-bold text-slate-700">ผู้จัดทำรายงาน</p>
                <div className="w-48 mx-auto border-b border-dotted border-slate-400 pt-8" />
                <p className="text-slate-600 font-medium">
                  ( ............................................................ )
                </p>
                <p className="text-[11px] text-slate-500">
                  วันที่ ......./......./.......
                </p>
              </div>

              <div className="space-y-6">
                <p className="font-bold text-slate-700">ผู้อนุมัติ / ผู้ตรวจสอบ</p>
                <div className="w-48 mx-auto border-b border-dotted border-slate-400 pt-8" />
                <p className="text-slate-600 font-medium">
                  ( ............................................................ )
                </p>
                <p className="text-[11px] text-slate-500">
                  วันที่ ......./......./.......
                </p>
              </div>
            </div>

            {/* Document Footer */}
            <div className="pt-4 text-center border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">
                KOZZI SMART LIVING • รายงานค่าใช้จ่ายประจำเดือน • เอกสารนี้ออกโดยระบบบริหารจัดการร้านค้า
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
