import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  PieChart as PieIcon,
  Award,
  Printer,
  FileText,
  Receipt,
  Wallet,
  CheckCircle2,
  X,
  Filter,
  Eye,
  Store,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Expense, Product, SalesDocument, SellerProfile } from '../types';

interface ReportsViewProps {
  documents: SalesDocument[];
  expenses: Expense[];
  products: Product[];
  seller?: SellerProfile;
}

const CATEGORY_COLORS = ['#16A394', '#2374D8', '#F59E0B', '#6D4DE8', '#0759A6', '#EC4899', '#8B5CF6'];

export const ReportsView: React.FC<ReportsViewProps> = ({
  documents,
  expenses,
  products,
  seller,
}) => {
  // Date range state
  const now = new Date();
  const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .substring(0, 10);
  const todayStr = now.toISOString().substring(0, 10);

  const [startDate, setStartDate] = useState<string>(firstDayOfCurrentMonth);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Modal print state
  const [printModalType, setPrintModalType] = useState<'RECEIPTS' | 'EXPENSES' | 'SUMMARY' | null>(null);

  // Preset handlers
  const handleSetPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30' | 'THIS_YEAR') => {
    const d = new Date();
    if (preset === 'THIS_MONTH') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
      const end = d.toISOString().substring(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'LAST_MONTH') {
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().substring(0, 10);
      const end = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().substring(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'LAST_30') {
      const end = d.toISOString().substring(0, 10);
      const startD = new Date();
      startD.setDate(startD.getDate() - 30);
      const start = startD.toISOString().substring(0, 10);
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'THIS_YEAR') {
      const start = `${d.getFullYear()}-01-01`;
      const end = d.toISOString().substring(0, 10);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Filtered documents (Paid / Approved Sales Receipts) in selected date range
  const filteredReceipts = documents.filter((d) => {
    const isPaid = d.status === 'PAID' || d.status === 'APPROVED' || d.type === 'RECEIPT';
    return isPaid && d.date >= startDate && d.date <= endDate;
  });

  const totalSales = filteredReceipts.reduce((acc, d) => acc + d.grandTotal, 0);

  // Filtered expenses in selected date range
  const filteredExpenses = expenses.filter((e) => e.date >= startDate && e.date <= endDate);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Estimated COGS for filtered receipts
  const totalCogs = filteredReceipts.reduce((acc, d) => {
    const itemCogs = d.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
    return acc + itemCogs;
  }, 0);

  const grossProfit = totalSales - totalCogs;
  const netProfit = totalSales - totalExpenses;

  // Expense by category breakdown for Pie Chart
  const expenseCatMap: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    expenseCatMap[e.category] = (expenseCatMap[e.category] || 0) + e.amount;
  });

  const categoryTranslation: Record<string, string> = {
    COST_OF_GOODS: 'ต้นทุนสินค้า',
    SHIPPING: 'ค่าขนส่ง/เดลิเวอรี่',
    PACKAGING: 'กล่องและแพ็คเกจจิ้ง',
    MARKETING: 'การตลาดและโฆษณา',
    UTILITIES: 'ค่าน้ำ/ค่าไฟ/อินเทอร์เน็ต',
    RENT: 'ค่าเช่าสถานที่',
    SALARY: 'เงินเดือนพนักงาน',
    OTHER: 'ค่าใช้จ่ายอื่นๆ',
  };

  const expensePieData = Object.keys(expenseCatMap).map((cat) => ({
    name: categoryTranslation[cat] || cat,
    value: expenseCatMap[cat],
  }));

  // Top Selling Products calculation in date range
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  filteredReceipts.forEach((d) => {
    d.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Generate CSV Export
  const handleExportCsv = () => {
    let csv = `รายงานสรุปผลการดำเนินงาน (${startDate} ถึง ${endDate})\n`;
    csv += `ยอดขายรวม (Total Sales),${totalSales}\n`;
    csv += `ประมาณการต้นทุนสินค้า (COGS),${totalCogs}\n`;
    csv += `กำไรขั้นต้น (Gross Profit),${grossProfit}\n`;
    csv += `รายจ่ายรวมร้านค้า (Total Expenses),${totalExpenses}\n`;
    csv += `กำไรสุทธิ (Net Profit),${netProfit}\n\n`;

    csv += `--- รายการใบเสร็จรับเงิน ---\n`;
    csv += `เลขที่ใบเสร็จ,วันที่,ชื่อลูกค้า,ยอดรวม (บาท),สถานะ\n`;
    filteredReceipts.forEach((r) => {
      csv += `${r.docNumber},${r.date},"${r.customerName}",${r.grandTotal},${r.status}\n`;
    });

    csv += `\n--- รายการค่าใช้จ่าย ---\n`;
    csv += `วันที่,หมวดหมู่,รายละเอียด,ผู้รับเงิน,จำนวนเงิน (บาท)\n`;
    filteredExpenses.forEach((e) => {
      csv += `${e.date},${categoryTranslation[e.category] || e.category},"${e.description}","${
        e.recipient || '-'
      }",${e.amount}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print Native PDF Generator
  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header & Date Range Filter Section */}
      <div className="bg-white border border-[#E2E8F0] p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#172B4D] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#123B6D]" />
              <span>รายงานสรุปผลการดำเนินงาน & พิมพ์ PDF</span>
            </h1>
            <p className="text-xs text-[#6B7A90] mt-1 font-medium">
              เลือกระยะเวลาเพื่อดูวิเคราะห์ พิมพ์ใบเสร็จรับเงิน หรือส่งออกรายงานค่าใช้จ่ายเป็น PDF
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-[#F6F8FB] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-[#172B4D] text-xs font-extrabold rounded-xl shadow-2xs flex items-center gap-2 transition-all self-start md:self-auto active:scale-98"
          >
            <Download className="w-4 h-4 text-[#0759A6]" />
            <span>ส่งออกข้อมูล CSV</span>
          </button>
        </div>

        {/* Date Filter Bar & Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#F6F8FB] border border-[#E2E8F0] p-4 rounded-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-extrabold text-[#172B4D] flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-[#123B6D]" />
              <span>เลือกระยะวันที่:</span>
            </span>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-xs font-bold text-[#172B4D] px-3 py-2 rounded-xl focus:outline-none focus:border-[#0759A6] shadow-2xs"
              />
              <span className="text-xs text-[#6B7A90] font-bold">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-[#E2E8F0] text-xs font-bold text-[#172B4D] px-3 py-2 rounded-xl focus:outline-none focus:border-[#0759A6] shadow-2xs"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleSetPreset('THIS_MONTH')}
              className="px-3 py-1.5 bg-white hover:bg-[#E2EEFF] border border-[#E2E8F0] hover:border-[#B8D5FC] text-[#172B4D] hover:text-[#0759A6] text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-98"
            >
              เดือนนี้
            </button>
            <button
              onClick={() => handleSetPreset('LAST_MONTH')}
              className="px-3 py-1.5 bg-white hover:bg-[#E2EEFF] border border-[#E2E8F0] hover:border-[#B8D5FC] text-[#172B4D] hover:text-[#0759A6] text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-98"
            >
              เดือนที่แล้ว
            </button>
            <button
              onClick={() => handleSetPreset('LAST_30')}
              className="px-3 py-1.5 bg-white hover:bg-[#E2EEFF] border border-[#E2E8F0] hover:border-[#B8D5FC] text-[#172B4D] hover:text-[#0759A6] text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-98"
            >
              30 วันล่าสุด
            </button>
            <button
              onClick={() => handleSetPreset('THIS_YEAR')}
              className="px-3 py-1.5 bg-white hover:bg-[#E2EEFF] border border-[#E2E8F0] hover:border-[#B8D5FC] text-[#172B4D] hover:text-[#0759A6] text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-98"
            >
              ปีนี้
            </button>
          </div>
        </div>
      </div>

      {/* 2. PDF Download & Print Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: พิมพ์ PDF ใบเสร็จรับเงินทั้งหมด */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#16A394] text-white flex items-center justify-center shadow-2xs mb-3">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-extrabold text-[#172B4D]">
              พิมพ์ PDF ใบเสร็จรับเงิน
            </h3>
            <p className="text-xs text-[#6B7A90] mt-1 font-medium">
              พิมพ์รายงานสรุปใบเสร็จรับเงินทั้งหมด {filteredReceipts.length} รายการ (รวม ฿{totalSales.toLocaleString()})
            </p>
          </div>

          <button
            onClick={() => setPrintModalType('RECEIPTS')}
            className="w-full py-2.5 bg-[#16A394] hover:bg-[#0E7A6E] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>พิมพ์ / ดาวน์โหลด PDF ใบเสร็จ</span>
          </button>
        </div>

        {/* Card 2: พิมพ์ PDF ค่าใช้จ่ายทั้งหมด */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#2374D8] text-white flex items-center justify-center shadow-2xs mb-3">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-extrabold text-[#172B4D]">
              พิมพ์ PDF ค่าใช้จ่ายทั้งหมด
            </h3>
            <p className="text-xs text-[#6B7A90] mt-1 font-medium">
              พิมพ์รายการบันทึกค่าใช้จ่าย {filteredExpenses.length} รายการ (รวม ฿{totalExpenses.toLocaleString()})
            </p>
          </div>

          <button
            onClick={() => setPrintModalType('EXPENSES')}
            className="w-full py-2.5 bg-[#2374D8] hover:bg-[#1A5BB0] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>พิมพ์ / ดาวน์โหลด PDF รายจ่าย</span>
          </button>
        </div>

        {/* Card 3: พิมพ์ PDF สรุปผลการดำเนินงานรวม */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#0A3060] text-white flex items-center justify-center shadow-2xs mb-3">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-extrabold text-[#172B4D]">
              พิมพ์ PDF สรุปภาพรวมกำไรขาดทุน
            </h3>
            <p className="text-xs text-[#6B7A90] mt-1 font-medium">
              พิมพ์งบสรุปยอดขาย รายจ่าย และกำไรสุทธิประจำช่วงเวลา
            </p>
          </div>

          <button
            onClick={() => setPrintModalType('SUMMARY')}
            className="w-full py-2.5 bg-[#0A3060] hover:bg-[#123B6D] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>พิมพ์ / ดาวน์โหลด PDF รายงานสรุป</span>
          </button>
        </div>
      </div>

      {/* 3. KPI Summary Numbers for Date Range */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-[#6B7A90]">1. ยอดขายรวม (Sales) 💰</span>
          <p className="text-xl sm:text-2xl font-black text-[#16A394] mt-1">
            ฿{totalSales.toLocaleString()}
          </p>
          <span className="text-[11px] font-bold text-[#6B7A90]">{filteredReceipts.length} ใบเสร็จ</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-[#6B7A90]">2. ต้นทุนสินค้า (COGS) 📦</span>
          <p className="text-xl sm:text-2xl font-black text-[#2374D8] mt-1">
            ฿{totalCogs.toLocaleString()}
          </p>
          <span className="text-[11px] font-bold text-[#6B7A90]">กำไรขั้นต้น: ฿{grossProfit.toLocaleString()}</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-[#6B7A90]">3. รายจ่ายรวม (Expenses) 💸</span>
          <p className="text-xl sm:text-2xl font-black text-[#F59E0B] mt-1">
            ฿{totalExpenses.toLocaleString()}
          </p>
          <span className="text-[11px] font-bold text-[#6B7A90]">{filteredExpenses.length} รายการจ่าย</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-2xs">
          <span className="text-xs font-bold text-[#6B7A90]">4. กำไรสุทธิ (Net Profit) ✨</span>
          <p
            className={`text-xl sm:text-2xl font-black mt-1 ${
              netProfit >= 0 ? 'text-[#16A394]' : 'text-[#F59E0B]'
            }`}
          >
            ฿{netProfit.toLocaleString()}
          </p>
          <span className="text-[11px] font-bold text-[#6B7A90]">
            {totalSales > 0 ? `อัตรากำไร: ${((netProfit / totalSales) * 100).toFixed(1)}%` : 'ไม่มีการขาย'}
          </span>
        </div>
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Expense Category Breakdown Pie Chart */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl sm:rounded-3xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <PieIcon className="w-5 h-5 text-[#2374D8]" />
            <h3 className="font-extrabold text-sm text-[#172B4D]">
              สัดส่วนรายจ่ายตามหมวดหมู่ช่วงวันที่เลือก
            </h3>
          </div>

          {expensePieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#6B7A90] font-bold">
              ไม่พบข้อมูลรายจ่ายในระยะเวลาที่เลือก
            </div>
          ) : (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expensePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderColor: '#E2E8F0',
                      borderRadius: '16px',
                      color: '#172B4D',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                    formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, 'จำนวนเงิน']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Best Selling Products */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl sm:rounded-3xl space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
            <Award className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="font-extrabold text-sm text-[#172B4D]">
              สินค้าขายดี 5 อันดับแรก (ช่วงวันที่เลือก)
            </h3>
          </div>

          {topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#6B7A90] font-bold">
              ไม่พบข้อมูลการขายในระยะเวลาที่เลือก
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#F6F8FB] border border-[#E2E8F0] rounded-xl text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#0759A6] text-white font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-extrabold text-[#172B4D]">{p.name}</p>
                      <span className="text-[11px] font-medium text-[#6B7A90]">ขายได้: {p.qty} ชิ้น</span>
                    </div>
                  </div>

                  <span className="font-black text-[#16A394] text-sm">
                    ฿{p.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. PRINT PREVIEW MODAL FOR PDF DOWNLOAD */}
      {printModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Printable Style Sheet to ensure clean printing */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #pdf-printable-area, #pdf-printable-area * {
                visibility: visible;
              }
              #pdf-printable-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white;
                padding: 20px;
                color: black;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header Controls (Hidden on native Print) */}
            <div className="no-print p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F6F8FB] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#123B6D] text-white flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#172B4D]">
                    {printModalType === 'RECEIPTS' && 'ตัวอย่าง PDF รายงานใบเสร็จรับเงิน'}
                    {printModalType === 'EXPENSES' && 'ตัวอย่าง PDF รายงานค่าใช้จ่ายทั้งหมด'}
                    {printModalType === 'SUMMARY' && 'ตัวอย่าง PDF รายงานสรุปผลการดำเนินงาน'}
                  </h3>
                  <p className="text-[11px] text-[#6B7A90] font-medium">
                    ช่วงวันที่: {startDate} ถึง {endDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerPrint}
                  className="px-4 py-2 bg-[#0759A6] hover:bg-[#123B6D] text-white text-xs font-extrabold rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-98"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>พิมพ์ / บันทึกเป็น PDF</span>
                </button>

                <button
                  onClick={() => setPrintModalType(null)}
                  className="p-2 text-[#6B7A90] hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body Area */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white" id="pdf-printable-area">
              {/* Document Letterhead */}
              <div className="flex items-start justify-between border-b-2 border-[#123B6D] pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Store className="w-6 h-6 text-[#123B6D]" />
                    <h2 className="text-lg font-black text-[#123B6D]">
                      {seller?.name || 'สมชาย ใจดี (ร้านค้าสมชายออนไลน์)'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {seller?.address || '123/45 ถนนสุขุมวิท เขตวัฒนา กรุงเทพมหานคร 10110'}
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    เลขประจำตัวผู้เสียภาษี: {seller?.taxId || '1100200300401'} | เบอร์โทร: {seller?.phone || '081-234-5678'}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className="inline-block px-3 py-1 bg-[#123B6D] text-white font-extrabold text-xs rounded-md">
                    {printModalType === 'RECEIPTS' && 'รายงานใบเสร็จรับเงิน'}
                    {printModalType === 'EXPENSES' && 'รายงานค่าใช้จ่ายทั้งหมด'}
                    {printModalType === 'SUMMARY' && 'รายงานสรุปผลการดำเนินงาน'}
                  </span>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    ระยะเวลา: {startDate} ถึง {endDate}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}
                  </p>
                </div>
              </div>

              {/* CONTENTS TYPE 1: RECEIPTS REPORT */}
              {printModalType === 'RECEIPTS' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-4 border-[#16A394] pl-2">
                    รายการใบเสร็จรับเงินทั้งหมด ({filteredReceipts.length} รายการ)
                  </h3>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-y border-slate-300 text-slate-800 font-bold">
                        <th className="p-2.5">ลำดับ</th>
                        <th className="p-2.5">เลขที่ใบเสร็จ</th>
                        <th className="p-2.5">วันที่</th>
                        <th className="p-2.5">ลูกค้า</th>
                        <th className="p-2.5">วิธีชำระ</th>
                        <th className="p-2.5 text-right">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                      {filteredReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            ไม่พบรายการใบเสร็จรับเงินในช่วงเวลานี้
                          </td>
                        </tr>
                      ) : (
                        filteredReceipts.map((r, i) => (
                          <tr key={r.id}>
                            <td className="p-2.5">{i + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{r.docNumber}</td>
                            <td className="p-2.5">{r.date}</td>
                            <td className="p-2.5">{r.customerName}</td>
                            <td className="p-2.5">{r.paymentMethod || 'เงินโอน / PromptPay'}</td>
                            <td className="p-2.5 text-right font-bold text-[#16A394]">
                              ฿{r.grandTotal.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black border-t-2 border-slate-400 text-slate-900">
                        <td colSpan={5} className="p-3 text-right">
                          ยอดรวมใบเสร็จทั้งหมด ({filteredReceipts.length} รายการ):
                        </td>
                        <td className="p-3 text-right text-sm text-[#16A394]">
                          ฿{totalSales.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* CONTENTS TYPE 2: EXPENSES REPORT */}
              {printModalType === 'EXPENSES' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-l-4 border-[#2374D8] pl-2">
                    รายการค่าใช้จ่ายทั้งหมด ({filteredExpenses.length} รายการ)
                  </h3>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-y border-slate-300 text-slate-800 font-bold">
                        <th className="p-2.5">ลำดับ</th>
                        <th className="p-2.5">วันที่</th>
                        <th className="p-2.5">หมวดหมู่</th>
                        <th className="p-2.5">รายละเอียด</th>
                        <th className="p-2.5">ผู้รับเงิน</th>
                        <th className="p-2.5 text-right">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            ไม่พบรายการค่าใช้จ่ายในช่วงเวลานี้
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((e, i) => (
                          <tr key={e.id}>
                            <td className="p-2.5">{i + 1}</td>
                            <td className="p-2.5">{e.date}</td>
                            <td className="p-2.5 font-bold text-slate-800">
                              {categoryTranslation[e.category] || e.category}
                            </td>
                            <td className="p-2.5">{e.description}</td>
                            <td className="p-2.5">{e.recipient || '-'}</td>
                            <td className="p-2.5 text-right font-bold text-[#2374D8]">
                              ฿{e.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black border-t-2 border-slate-400 text-slate-900">
                        <td colSpan={5} className="p-3 text-right">
                          ยอดรวมค่าใช้จ่ายทั้งหมด ({filteredExpenses.length} รายการ):
                        </td>
                        <td className="p-3 text-right text-sm text-[#2374D8]">
                          ฿{totalExpenses.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* CONTENTS TYPE 3: EXECUTIVE SUMMARY REPORT */}
              {printModalType === 'SUMMARY' && (
                <div className="space-y-6">
                  {/* Financial Statement Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-300 rounded-xl bg-slate-50 space-y-2">
                      <span className="text-xs font-bold text-slate-600 block">สรุปยอดรับเงิน (Sales)</span>
                      <p className="text-xl font-black text-[#16A394]">฿{totalSales.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-500">
                        จาก {filteredReceipts.length} ใบเสร็จรับเงิน
                      </p>
                    </div>

                    <div className="p-4 border border-slate-300 rounded-xl bg-slate-50 space-y-2">
                      <span className="text-xs font-bold text-slate-600 block">สรุปค่าใช้จ่าย (Expenses)</span>
                      <p className="text-xl font-black text-[#2374D8]">฿{totalExpenses.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-500">
                        จาก {filteredExpenses.length} รายการจ่าย
                      </p>
                    </div>
                  </div>

                  {/* Net Profit Statement Box */}
                  <div className="p-4 border-2 border-[#123B6D] bg-slate-50 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-[#123B6D] uppercase">
                        สรุปกำไรสุทธิประจำช่วงเวลา (Net Profit)
                      </span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {startDate} ถึง {endDate}
                      </p>
                    </div>
                    <span
                      className={`text-2xl font-black ${
                        netProfit >= 0 ? 'text-[#16A394]' : 'text-[#F59E0B]'
                      }`}
                    >
                      ฿{netProfit.toLocaleString()}
                    </span>
                  </div>

                  {/* Expense Breakdown Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800">
                      สรุปสัดส่วนรายจ่ายแยกตามหมวดหมู่
                    </h4>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-y border-slate-300 font-bold text-slate-800">
                          <th className="p-2">หมวดหมู่</th>
                          <th className="p-2 text-right">จำนวนเงิน (บาท)</th>
                          <th className="p-2 text-right">สัดส่วน (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {expensePieData.map((cat, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium">{cat.name}</td>
                            <td className="p-2 text-right font-bold text-slate-800">
                              ฿{cat.value.toLocaleString()}
                            </td>
                            <td className="p-2 text-right text-slate-600">
                              {totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Document Signatures Footer */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs text-slate-700">
                <div className="space-y-12">
                  <div className="border-b border-dashed border-slate-400 w-48 mx-auto"></div>
                  <p className="font-bold">
                    ลงชื่อ ({seller?.name || 'ผู้รับเงิน / ผู้ลงนาม'})<br />
                    <span className="font-normal text-[10px] text-slate-500">ผู้จัดทำรายงาน</span>
                  </p>
                </div>

                <div className="space-y-12">
                  <div className="border-b border-dashed border-slate-400 w-48 mx-auto"></div>
                  <p className="font-bold">
                    ลงชื่อ..............................................................<br />
                    <span className="font-normal text-[10px] text-slate-500">ผู้อนุมัติรายงาน</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
