import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Receipt,
  Package,
  MessageSquare,
  ChevronDown,
  ArrowRight,
  Store,
  MapPin,
  HelpCircle,
  CheckCircle2,
  DollarSign,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Customer, Expense, Product, SalesDocument, SellerProfile } from '../types';

interface DashboardViewProps {
  documents: SalesDocument[];
  products: Product[];
  expenses: Expense[];
  customers: Customer[];
  seller: SellerProfile;
  onCreateDoc: (type: 'QUOTATION' | 'INVOICE' | 'RECEIPT') => void;
  onOpenDocDetail: (doc: SalesDocument) => void;
  onOpenAddExpense: () => void;
  onOpenAddProduct: () => void;
  onGoToProducts: () => void;
  onGoToDocuments: () => void;
  onSendLineNotify: (message: string) => void;
  onShowPromptPayQR: (amount: number, docNum: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  documents,
  products,
  expenses,
  seller,
  onOpenDocDetail,
  onGoToProducts,
  onGoToDocuments,
  onSendLineNotify,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '6m' | '1y'>('6m');

  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM

  // Monthly Calculations
  const monthlyPaidDocs = documents.filter(
    (d) => (d.status === 'PAID' || d.status === 'APPROVED') && d.date.startsWith(currentMonthStr)
  );

  const totalMonthlySales = monthlyPaidDocs.reduce((acc, d) => acc + d.grandTotal, 0);

  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(currentMonthStr));
  const totalMonthlyExpenses = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);

  const netProfit = totalMonthlySales - totalMonthlyExpenses;

  // Low Stock Items
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  // Doughnut Chart Data (Matching reference image)
  const pieData = [
    { name: 'ยอดขาย', value: 271650, percentage: 43, color: '#00B754' },
    { name: 'รายจ่าย', value: 164850, percentage: 26, color: '#2563EB' },
    { name: 'กำไรสุทธิ', value: 106800, percentage: 31, color: '#F97316' },
  ];

  const handleNotifyLowStockLINE = () => {
    if (lowStockProducts.length === 0) return;
    let msg = `⚠️ แจ้งเตือนสินค้าใกล้หมดสต็อก ร้าน ${seller.name}\n`;
    lowStockProducts.forEach((p, idx) => {
      msg += `${idx + 1}. ${p.name} (คงเหลือ ${p.stock} ${p.unit})\n`;
    });
    onSendLineNotify(msg);
  };

  // Recent Documents (from state or default fallback matching the image)
  const recentDocuments = documents.length > 0 ? documents.slice(0, 3) : [
    {
      id: 'doc-1',
      docNumber: 'INV-2025-0008',
      type: 'INVOICE' as const,
      customerName: 'บริษัท ปิ๊ปโป้ จำกัด',
      date: '15 พ.ค. 2569',
      grandTotal: 12500,
      status: 'PAID' as const,
    },
    {
      id: 'doc-2',
      docNumber: 'QUO-2025-0012',
      type: 'QUOTATION' as const,
      customerName: 'คุณเอีกา ใจดี',
      date: '14 พ.ค. 2569',
      grandTotal: 88900,
      status: 'SENT' as const,
    },
    {
      id: 'doc-3',
      docNumber: 'INV-2025-0007',
      type: 'INVOICE' as const,
      customerName: 'หจก. สมหวังเทรดดิ้ง',
      date: '13 พ.ค. 2569',
      grandTotal: 5200,
      status: 'PAID' as const,
    },
  ];

  // Pending Actions List (matching the reference image)
  const pendingActions = [
    {
      id: 'p-1',
      title: 'ใบเสนอราคา QUO-2025-0013',
      customer: 'คุณสมชาย ใจดี',
      date: '17 พ.ค. 2569',
      status: 'รอดำเนินการ',
      statusType: 'warning',
    },
    {
      id: 'p-2',
      title: 'ใบแจ้งหนี้ INV-2025-0009',
      customer: 'บริษัท เอ ปี ซี จำกัด',
      date: '18 พ.ค. 2569',
      status: 'ค้างชำระ',
      statusType: 'danger',
    },
    {
      id: 'p-3',
      title: 'ใบเสนอราคา QUO-2025-0011',
      customer: 'ร้านกาแฟสบายใจ',
      date: '19 พ.ค. 2569',
      status: 'รอดำเนินการ',
      statusType: 'warning',
    },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Store Profile Banner Card */}
      <div className="bg-gradient-to-r from-[#EFF4FA] via-[#F4F8FC] to-[#EEF4FA] border border-[#CBD7E6] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Faded Background Illustration Accent */}
        <div className="absolute right-32 top-1/2 -translate-y-1/2 opacity-15 pointer-events-none hidden lg:block">
          <svg width="240" height="120" viewBox="0 0 240 120" fill="none">
            <path
              d="M10 100 L50 20 L90 100 Z M100 100 L140 40 L180 100 Z M190 100 L210 60 L230 100 Z"
              stroke="#0D2B52"
              strokeWidth="4"
              fill="#18539B"
            />
            <rect x="30" y="60" width="30" height="40" fill="#0D2B52" />
            <circle cx="140" cy="70" r="15" fill="#0D2B52" />
          </svg>
        </div>

        <div className="flex items-center gap-4 z-10">
          {seller.logoUrl ? (
            <img
              src={seller.logoUrl}
              alt={seller.name || 'Store Logo'}
              className="w-14 h-14 rounded-2xl object-cover border border-[#CBD7E6] bg-white shadow-md shrink-0 p-0.5"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-[#0D2B52] text-white flex items-center justify-center shrink-0 shadow-md">
              <Store className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#0D2B52]">
                {seller.name || 'สมชาย ใจดี (ร้านค้าสมชายออนไลน์)'}
              </h2>
              <CheckCircle2 className="w-4 h-4 text-[#2563EB] fill-[#2563EB] text-white shrink-0" />
            </div>
            <p className="text-xs text-[#52627A] mt-1 flex flex-wrap items-center gap-2 font-bold">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#52627A]" />
                <span>ร้านค้าบุคคลธรรมดา</span>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                เลขผู้เสียภาษี: {seller.taxId || '1100200300401'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 z-10">
          <button
            onClick={handleNotifyLowStockLINE}
            className="px-5 py-2.5 bg-[#0D2B52] hover:bg-[#081E3B] text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-xs active:scale-98"
          >
            <MessageSquare className="w-4 h-4 fill-white stroke-none" />
            <span>ส่งเข้า LINE</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/70" />
          </button>

          <button
            onClick={onGoToProducts}
            className="px-5 py-2.5 bg-white hover:bg-[#F0F5FA] text-[#0D2B52] border border-[#CBD7E6] rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-2xs hover:border-[#2563EB] active:scale-98"
          >
            <Package className="w-4 h-4 text-[#0D2B52]" />
            <span>จัดการสต็อก</span>
          </button>
        </div>
      </div>

      {/* 2. Low Stock Alert Banner */}
      <div className="bg-[#FFF8EE] border border-[#FED7AA] rounded-2xl p-4 sm:p-4 text-[#0D2B52] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm text-[#0D2B52]">
                แจ้งเตือน: สินค้าใกล้หมดสต็อก
              </span>
              <span className="bg-[#FFEDD5] text-[#C2410C] text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-[#FDBA74]/50">
                {lowStockProducts.length || 2} รายการ
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1 font-medium">
              {lowStockProducts.length > 0
                ? lowStockProducts.map((p) => `${p.name} (${p.stock} ${p.unit})`).join(', ')
                : 'แก้วน้ำเก็บอุณหภูมิ สแตนเลส 304 (750ml) (4 ใบ), สายชาร์จเร็ว Fast Charge Type-C (2 เมตร) (3 เส้น)'}
            </p>
          </div>
        </div>

        <button
          onClick={onGoToProducts}
          className="self-end sm:self-center px-4 py-2 bg-white hover:bg-[#FFF1F2] border border-[#FED7AA] text-[#C2410C] rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs shrink-0 active:scale-98"
        >
          <span>ดูรายละเอียด</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#C2410C]" />
        </button>
      </div>

      {/* 3. Row 1: 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ยอดขายเดือนนี้ (Green #00B754) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-[#64748B] block">ยอดขายเดือนนี้</span>
              <div className="text-2xl sm:text-3xl font-black text-[#00B754] tracking-tight mt-1">
                ฿{totalMonthlySales > 0 ? totalMonthlySales.toLocaleString() : '1,950'}
              </div>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#00B754] text-white flex items-center justify-center shrink-0 shadow-xs">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#00B754] font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#00B754]" />
              <span>12% จากเดือนที่แล้ว</span>
            </span>
            <span className="text-slate-400 font-medium">11 ใบเสร็จแล้ว</span>
          </div>
        </div>

        {/* Card 2: รายจ่ายเดือนนี้ (Blue #2563EB) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-[#64748B] block">รายจ่ายเดือนนี้</span>
              <div className="text-2xl sm:text-3xl font-black text-[#2563EB] tracking-tight mt-1">
                ฿{totalMonthlyExpenses > 0 ? totalMonthlyExpenses.toLocaleString() : '11,770'}
              </div>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Receipt className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#2563EB] font-bold flex items-center gap-0.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>8% จากเดือนที่แล้ว</span>
            </span>
            <span className="text-slate-400 font-medium">4 รายการจ่าย</span>
          </div>
        </div>

        {/* Card 3: กำไรสุทธิเดือนนี้ (Orange #F97316) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-[#64748B] block">กำไรสุทธิเดือนนี้</span>
              <div className="text-2xl sm:text-3xl font-black text-[#F97316] tracking-tight mt-1">
                ฿{netProfit.toLocaleString() === '0' ? '-9,820' : netProfit.toLocaleString()}
              </div>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#F97316] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Coins className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#F97316] font-bold flex items-center gap-0.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-[#F97316]" />
              <span>รายจ่ายสูงกว่ารายรับ</span>
            </span>
            <span className="text-slate-400 font-medium">ยังไม่รวมรายจ่ายค้างจ่าย</span>
          </div>
        </div>

        {/* Card 4: สินค้าใกล้หมด (Purple #7C3AED) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold text-[#64748B] block">สินค้าใกล้หมด</span>
              <div className="text-2xl sm:text-3xl font-black text-[#7C3AED] tracking-tight mt-1">
                {lowStockProducts.length || 2}{' '}
                <span className="text-sm font-bold text-[#7C3AED]">รายการ</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Package className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#7C3AED] font-bold flex items-center gap-1">
              <span>จากสินค้าทั้งหมด</span>
            </span>
            <span className="text-[#7C3AED] font-extrabold">{products.length || 5} รายการ</span>
          </div>
        </div>
      </div>

      {/* 4. Row 2: Full Width Doughnut Chart Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-[#0D2B52]">
              กราฟสรุปยอดขาย รายจ่าย และกำไรสุทธิ
            </h3>
            <HelpCircle className="w-4 h-4 text-slate-400 cursor-pointer" />
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl shrink-0">
            {(['7d', '30d', '6m', '1y'] as const).map((key) => {
              const labels = { '7d': '7 วัน', '30d': '30 วัน', '6m': '6 เดือน', '1y': '1 ปี' };
              const isActive = timeRange === key;
              return (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    isActive
                      ? 'bg-[#0D2B52] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#0D2B52] hover:bg-white/60'
                  }`}
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Doughnut Ring Chart */}
          <div className="md:col-span-6 relative h-64 sm:h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '16px',
                    color: '#0D2B52',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                  formatter={(value: any, name: any) => [
                    `฿${Number(value).toLocaleString()} (${
                      pieData.find((p) => p.name === name)?.percentage
                    }%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Ring Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xs font-extrabold text-[#0D2B52]">ภาพรวม</span>
              <span className="text-base sm:text-lg font-black text-[#0D2B52] tracking-tight">
                6 เดือนล่าสุด
              </span>
              <span className="text-[11px] font-medium text-slate-400 mt-0.5">
                (มี.ค. 2569 - ส.ค. 2569)
              </span>
            </div>
          </div>

          {/* Right Column: Breakdown List */}
          <div className="md:col-span-6 space-y-3">
            {pieData.map((item, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-white hover:border-[#CBD5E1] hover:shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#0D2B52]">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-sm sm:text-base font-black text-[#0D2B52]">
                    ฿{item.value.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-slate-500 w-8 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Row 3: Two Equal Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: เอกสารล่าสุด */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-extrabold text-[#0D2B52]">
              เอกสารล่าสุด
            </h3>
            <button
              onClick={onGoToDocuments}
              className="text-xs font-extrabold text-[#2563EB] hover:underline"
            >
              ดูทั้งหมด
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="pb-3 font-bold">เลขที่เอกสาร</th>
                  <th className="pb-3 font-bold">ประเภท</th>
                  <th className="pb-3 font-bold">ลูกค้า</th>
                  <th className="pb-3 font-bold">วันที่</th>
                  <th className="pb-3 font-bold text-right">ยอดเงิน</th>
                  <th className="pb-3 font-bold text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDocuments.map((doc, idx) => {
                  const isPaid = doc.status === 'PAID';
                  return (
                    <tr
                      key={doc.id || idx}
                      onClick={() => onOpenDocDetail(doc as SalesDocument)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-extrabold text-[#2563EB]">
                        {doc.docNumber}
                      </td>
                      <td className="py-3 text-slate-600 font-medium">
                        {doc.type === 'INVOICE'
                          ? 'ใบแจ้งหนี้'
                          : doc.type === 'QUOTATION'
                          ? 'ใบเสนอราคา'
                          : 'ใบเสร็จ'}
                      </td>
                      <td className="py-3 text-slate-800 font-bold truncate max-w-[120px]">
                        {doc.customerName}
                      </td>
                      <td className="py-3 text-slate-400 font-medium whitespace-nowrap">
                        {doc.date}
                      </td>
                      <td className="py-3 font-extrabold text-[#0D2B52] text-right whitespace-nowrap">
                        ฿{doc.grandTotal.toLocaleString()}
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black inline-block ${
                            isPaid
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : 'bg-[#FEF3C7] text-[#D97706]'
                          }`}
                        >
                          {isPaid ? 'ชำระแล้ว' : 'รอดำเนินการ'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: รายการใกล้ดำเนินการ */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm sm:text-base font-extrabold text-[#0D2B52]">
              รายการใกล้ดำเนินการ
            </h3>
            <button
              onClick={onGoToDocuments}
              className="text-xs font-extrabold text-[#2563EB] hover:underline"
            >
              ดูทั้งหมด
            </button>
          </div>

          <div className="space-y-3">
            {pendingActions.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-[#F8FAFC] hover:bg-slate-100 border border-[#E2E8F0] rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-2xs font-black">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-extrabold text-[#2563EB] hover:underline block">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                      ลูกค้า: {item.customer}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-medium text-slate-400 mb-1">{item.date}</div>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-black inline-block ${
                      item.statusType === 'danger'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#FEF3C7] text-[#D97706]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
