import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Calendar,
  FileSpreadsheet,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Expense, ExpenseCategory, SellerProfile } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const filename = `รายงานสรุปค่าใช้จ่าย_${thaiMonthName}_${thaiYearBE}`;
      await exportElementToPdf('monthly-expense-print', filename);
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
      {/* Modal Container */}
      <div className="bg-white w-full max-w-5xl max-h-[94vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-[#F8FAFC] border-b border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-[#0759A6] flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#0D2B52]">
                  รายงานสรุปค่าใช้จ่ายประจำเดือน
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

        {/* Filter Controls Bar: Month, Year, Quick Period Jump (Hidden on Print) */}
        <div className="no-print bg-white border-b border-slate-200 p-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month selector */}
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

            {/* Year selector */}
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
          {/* =========================================================================
              Dedicated Print & PDF Container: #monthly-expense-print
              A4 Portrait Summary Layout (Simple, elegant, clean 5-column table)
             ========================================================================= */}
          <div
            id="monthly-expense-print"
            ref={documentRef}
            className="w-full max-w-[210mm] bg-white rounded-xl sm:rounded-2xl shadow-md border border-slate-200 p-6 sm:p-10 space-y-6 text-slate-800"
            style={{
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            {/* Header Section: Business Info on Top Left, Report Title on Top Right */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-sky-200 pb-5">
              {/* Left Column: Business & Entrepreneur Information */}
              <div className="space-y-1">
                <h1 className="text-lg sm:text-xl font-bold text-[#0D2B52] leading-tight">
                  KOZZI ราวตากผ้าอัจฉริยะ
                </h1>
                <p className="text-xs sm:text-sm text-slate-700 font-medium pt-1">
                  ชื่อผู้ประกอบการ : <span className="font-bold text-[#0D2B52]">{entrepreneurName}</span>
                </p>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">
                  เลขประจำตัวผู้เสียภาษีอากร : <span className="font-mono font-bold text-slate-800">{taxIdNumber}</span>
                </p>
              </div>

              {/* Right Column: Report Title and Period */}
              <div className="sm:text-right flex flex-col sm:items-end justify-start shrink-0">
                <div className="report-badge-box bg-[#f0f7ff] border border-sky-200 rounded-xl px-5 py-3 text-center sm:text-right space-y-0.5">
                  <h2 className="text-base sm:text-lg font-black text-[#0D2B52] tracking-tight">
                    รายงานสรุปค่าใช้จ่ายประจำเดือน
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-[#0759A6]">
                    {reportPeriodThai}
                  </p>
                </div>
              </div>
            </div>

            {/* Table: 5 Columns Only */}
            {/* Proportions: ลำดับ 7%, วันที่ 15%, รายการ 43%, หมวดหมู่ 20%, จำนวนเงิน 15% */}
            <div className="w-full">
              <table className="w-full text-left text-xs sm:text-sm border-collapse border border-slate-300 table-fixed">
                <thead>
                  <tr className="bg-[#f0f7ff] border-b border-slate-300 text-[#0D2B52] font-bold">
                    <th
                      className="py-3 px-1 text-center align-middle border-r border-slate-300 whitespace-nowrap"
                      style={{ width: '7%' }}
                    >
                      ลำดับ
                    </th>
                    <th
                      className="py-3 px-2 text-center align-middle border-r border-slate-300 whitespace-nowrap"
                      style={{ width: '15%' }}
                    >
                      วันที่
                    </th>
                    <th
                      className="py-3 px-3 text-center align-middle border-r border-slate-300"
                      style={{ width: '43%' }}
                    >
                      รายการ
                    </th>
                    <th
                      className="py-3 px-3 text-center align-middle border-r border-slate-300"
                      style={{ width: '20%' }}
                    >
                      หมวดหมู่
                    </th>
                    <th
                      className="py-3 px-2 text-center align-middle"
                      style={{ width: '15%' }}
                    >
                      <div className="leading-tight">
                        <span>จำนวนเงิน</span>
                        <span className="block text-[11px] font-semibold text-[#0759A6]">(บาท)</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                  {monthlyExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 space-y-2 border-b border-slate-200">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-500">
                          ไม่พบรายการค่าใช้จ่ายในเดือนที่เลือก
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
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
                          className={`hover:bg-sky-50/30 transition-colors border-b border-slate-200 ${
                            isCancelled ? 'bg-rose-50/40 text-slate-400' : 'bg-white'
                          }`}
                          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                        >
                          <td className="py-2.5 px-1 text-center align-middle font-bold text-slate-600 border-r border-slate-200 whitespace-nowrap">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-1.5 text-center align-middle font-mono text-slate-700 whitespace-nowrap border-r border-slate-200">
                            {formatDate(exp.date)}
                          </td>
                          <td className="py-2.5 px-2.5 text-left align-middle font-medium text-slate-800 border-r border-slate-200 leading-relaxed break-words">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{exp.description}</span>
                              {isCancelled && (
                                <span className="px-1.5 py-0.2 text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200 rounded">
                                  ยกเลิก
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-left align-middle text-slate-700 border-r border-slate-200 break-words">
                            {catName}
                          </td>
                          <td
                            className={`py-2.5 px-2 text-right align-middle font-mono font-bold whitespace-nowrap ${
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
                {/* Table Footer: Summary Row */}
                <tfoot>
                  <tr
                    className="bg-[#f8fafc] border-t-2 border-slate-300 font-bold text-slate-800"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <td
                      colSpan={4}
                      className="py-3 px-4 text-right font-extrabold text-[#0D2B52] border-r border-slate-300"
                    >
                      รวมค่าใช้จ่ายประจำเดือน {thaiMonthName} {thaiYearBE}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-black text-sm sm:text-base text-[#0759A6] whitespace-nowrap">
                      {formatCurrency(grandTotalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
