import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Image as ImageIcon,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { Order, OrderNumberDateFormat, OrderOptions, Product } from '../types';
import {
  balanceDue,
  fmtDate,
  fmtMoney,
  fmtTimeRange,
  nextOrderNumber,
  paidTotal,
  paymentState,
  productTitle,
  todayISO,
  warrantyAlerts,
  warrantyState,
} from '../utils/orders';
import { OrderFormModal } from './orders/OrderFormModal';
import { OrderDetailModal } from './orders/OrderDetailModal';
import { Badge, Field, Modal, btn, inputCls, productStatusTone } from './orders/ui';

const inlineSelect = inputCls.replace('w-full ', '') + ' w-auto';

interface OrdersViewProps {
  orders: Order[];
  products: Product[];
  options: OrderOptions;
  onSaveOrder: (order: Order) => Promise<Order>;
  onDeleteOrder: (order: Order) => void;
  onSaveOptions: (opts: OrderOptions) => void;
  onCreateStockProduct: (p: Product) => void;
  onIssueReceipt: (order: Order, paymentId: string) => void;
  onOpenDoc: (docId: string) => void;
}

type SubTab = 'list' | 'queue' | 'aftersales';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`;
};

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-3 py-2.5 text-left text-[11px] font-semibold text-zinc-500 whitespace-nowrap ${className}`}>{children}</th>
);
const Td: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2.5 text-xs text-zinc-800 whitespace-nowrap ${className}`}>{children ?? ''}</td>
);

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  products,
  options,
  onSaveOrder,
  onDeleteOrder,
  onSaveOptions,
  onCreateStockProduct,
  onIssueReceipt,
  onOpenDoc,
}) => {
  const [tab, setTab] = useState<SubTab>('list');
  const [formOrder, setFormOrder] = useState<Order | null | undefined>(undefined); // undefined = closed, null = new
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTicket, setDetailTicket] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // filters
  const [q, setQ] = useState('');
  const [month, setMonth] = useState('ALL');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [payFilter, setPayFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [fulfillFilter, setFulfillFilter] = useState('');
  const [warrantyFilter, setWarrantyFilter] = useState<'alert' | 'active' | 'expired' | 'all'>('alert');
  const [ticketFilter, setTicketFilter] = useState<'open' | 'all'>('open');
  const [ticketOrderId, setTicketOrderId] = useState('');

  const today = todayISO();
  const detailOrder = detailId ? orders.find((o) => o.id === detailId) || null : null;
  const alerts = warrantyAlerts(orders, options, today);

  const months = useMemo(
    () => Array.from(new Set(orders.map((o) => o.orderDate.slice(0, 7)))).sort().reverse(),
    [orders]
  );

  const inMonth = (o: Order) => month === 'ALL' || o.orderDate.startsWith(month);
  const active = orders.filter((o) => !o.cancelled);

  // summary
  const monthOrders = active.filter(inMonth);
  const summary = {
    count: monthOrders.length,
    sales: monthOrders.reduce((s, o) => s + (Number(o.price) || 0), 0),
    received: monthOrders.reduce((s, o) => s + paidTotal(o), 0),
    outstanding: active.reduce((s, o) => s + balanceDue(o), 0),
    pendingJobs: active.filter((o) => o.queueStatus !== 'เสร็จแล้ว').length,
  };

  const filtered = orders.filter((o) => {
    if (!inMonth(o)) return false;
    if (channel && o.channel !== channel) return false;
    if (status && o.productStatus !== status) return false;
    if (techFilter && o.technician !== techFilter) return false;
    if (payFilter) {
      const label = paymentState(o).label;
      if (payFilter === 'มัดจำ' ? !label.startsWith('มัดจำ') : label !== payFilter) return false;
    }
    if (q) {
      const hay = [o.orderNumber, o.channelOrderId, o.customerName, o.customerPhone, o.model, o.installArea, o.trackingNo]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  // แสดงเรียงตามวันที่สั่งซื้อจากเก่าไปใหม่เหมือนตารางเดิม
  const listRows = [...filtered].sort((a, b) => (a.orderDate + a.orderNumber).localeCompare(b.orderDate + b.orderNumber));

  const openDetail = (o: Order, withTicket = false) => {
    setDetailTicket(withTicket);
    setDetailId(o.id);
  };

  const subTabs: { id: SubTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'list', label: 'รายการออเดอร์', icon: ClipboardList },
    { id: 'queue', label: 'คิวงานติดตั้ง/จัดส่ง', icon: CalendarDays, badge: summary.pendingJobs },
    { id: 'aftersales', label: 'ประกัน & แจ้งซ่อม', icon: ShieldCheck, badge: alerts.length },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-zinc-200 p-4 rounded-xl">
        <div>
          <h1 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> ออเดอร์ & งานติดตั้ง
          </h1>
          <p className="text-xs text-zinc-500">รับมัดจำ · ตัดสต็อก · ลงคิวช่าง · ปิดงาน · ติดตามประกันและงานซ่อม</p>
        </div>
        <div className="flex items-center gap-2">
          <button className={btn.secondary} onClick={() => setOptionsOpen(true)}>
            <Settings2 className="w-4 h-4" /> ตั้งค่าตัวเลือก
          </button>
          <button className={btn.primary} onClick={() => setFormOrder(null)}>
            <Plus className="w-4 h-4" /> ออเดอร์ใหม่
          </button>
        </div>
      </div>

      {/* Warranty alert */}
      {alerts.length > 0 && (
        <button
          onClick={() => {
            setTab('aftersales');
            setWarrantyFilter('alert');
          }}
          className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900"
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm">
            <b>แจ้งเตือนประกัน {alerts.length} รายการ</b> — ใกล้หมดภายใน {options.warrantyAlertDays} วันหรือหมดแล้ว:{' '}
            {alerts
              .slice(0, 3)
              .map((o) => `${o.customerName} (${o.orderNumber})`)
              .join(', ')}
            {alerts.length > 3 ? ' …' : ''}
          </span>
        </button>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: `ออเดอร์${month === 'ALL' ? 'ทั้งหมด' : ` ${monthLabel(month)}`}`, value: `${summary.count} รายการ` },
          { label: 'ยอดขาย', value: `฿${fmtMoney(summary.sales)}` },
          { label: 'รับเงินแล้ว', value: `฿${fmtMoney(summary.received)}` },
          { label: 'ยอดค้างรับ (ทุกออเดอร์)', value: `฿${fmtMoney(summary.outstanding)}` },
          { label: 'งานที่ยังไม่ปิด', value: `${summary.pendingJobs} งาน` },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
            <div className="text-[11px] text-zinc-500">{c.label}</div>
            <div className="text-lg font-bold text-zinc-900 mt-0.5">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 bg-white border border-zinc-200 p-1 rounded-xl overflow-x-auto">
        {subTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                tab === t.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {!!t.badge && (
                <span className={`text-[10px] px-1.5 rounded-full ${tab === t.id ? 'bg-white text-zinc-900' : 'bg-zinc-200 text-zinc-700'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'list' && (
        <div className="bg-white border border-zinc-200 rounded-xl">
          <div className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2 border-b border-zinc-100">
            <div className="relative col-span-2">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="ค้นหาเลขออเดอร์ / ลูกค้า / MODEL / พื้นที่ / Tracking"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="ALL">ทุกเดือน</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <select className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">ทุกช่องทาง</option>
              {options.channels.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className={inputCls} value={payFilter} onChange={(e) => setPayFilter(e.target.value)}>
              <option value="">ทุกสถานะการชำระ</option>
              {['ยังไม่ชำระ', 'มัดจำ', 'รอชำระจากช้อปปี้', 'จ่ายครบแล้ว', 'ยกเลิก'].map((c) => (
                <option key={c} value={c}>
                  {c === 'มัดจำ' ? 'มัดจำแล้ว (ค้างเก็บหน้างาน)' : c}
                </option>
              ))}
            </select>
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">ทุกสถานะสินค้า</option>
              {options.productStatuses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {listRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              {orders.length === 0 ? 'ยังไม่มีออเดอร์ กด "ออเดอร์ใหม่" เพื่อเริ่มบันทึก' : 'ไม่พบออเดอร์ตามเงื่อนไข'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <Th>#</Th>
                    <Th>วันที่สั่งซื้อ</Th>
                    <Th>เลขออเดอร์</Th>
                    <Th>ลูกค้า</Th>
                    <Th>รุ่น</Th>
                    <Th>สินค้า (MODEL · สี · ขนาด)</Th>
                    <Th>ช่องทาง</Th>
                    <Th>การดำเนินการ</Th>
                    <Th>เพดาน</Th>
                    <Th>ช่าง</Th>
                    <Th>พื้นที่</Th>
                    <Th>นัดวันที่</Th>
                    <Th>สถานะคิว</Th>
                    <Th>การชำระเงิน</Th>
                    <Th>ชำระต้นทุนโดย</Th>
                    <Th>สถานะสินค้า</Th>
                    <Th>หมดประกัน</Th>
                    <Th>Tracking No.</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {listRows.map((o, i) => {
                    const pay = paymentState(o);
                    const w = warrantyState(o, options.warrantyAlertDays, today);
                    return (
                      <tr
                        key={o.id}
                        onClick={() => openDetail(o)}
                        className={`cursor-pointer hover:bg-zinc-50 ${o.cancelled ? 'opacity-50' : ''}`}
                      >
                        <Td className="text-zinc-400">{i + 1}</Td>
                        <Td>{fmtDate(o.orderDate)}</Td>
                        <Td className="font-semibold">
                          {o.orderNumber}
                          {o.channelOrderId && <div className="text-[10px] text-zinc-400 font-normal">{o.channelOrderId}</div>}
                        </Td>
                        <Td className="font-medium">{o.customerName}</Td>
                        <Td>{o.productLine}</Td>
                        <Td>{productTitle(o)}{o.quantity > 1 ? ` ×${o.quantity}` : ''}</Td>
                        <Td>
                          <Badge tone="neutral">{o.channel}</Badge>
                        </Td>
                        <Td>
                          <Badge tone={o.fulfillment === 'ติดตั้ง' ? 'dark' : 'neutral'}>{o.fulfillment}</Badge>
                        </Td>
                        <Td>{o.ceilingType}</Td>
                        <Td>{o.technician}</Td>
                        <Td className="max-w-[160px] truncate">{o.installArea}</Td>
                        <Td className={o.scheduledDate && o.scheduledDate < today && o.queueStatus !== 'เสร็จแล้ว' ? 'text-rose-700 font-semibold' : ''}>
                          {o.scheduledDate ? fmtDate(o.scheduledDate) : ''}
                          {fmtTimeRange(o) && <div className="text-[10px] text-zinc-500 font-normal">{fmtTimeRange(o)}</div>}
                        </Td>
                        <Td>{o.queueStatus === 'ยังไม่ลงคิว' ? '' : o.queueStatus}</Td>
                        <Td>
                          <Badge tone={pay.tone}>{pay.label}</Badge>
                        </Td>
                        <Td>{o.costPaidBy}</Td>
                        <Td>
                          <select
                            onClick={(e) => e.stopPropagation()}
                            value={o.productStatus}
                            onChange={(e) => onSaveOrder({ ...o, productStatus: e.target.value })}
                            className={`text-[11px] font-semibold rounded-md border px-1.5 py-0.5 ${
                              {
                                green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                amber: 'bg-amber-50 text-amber-800 border-amber-200',
                                dark: 'bg-zinc-900 text-white border-zinc-900',
                                neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                                red: 'bg-rose-50 text-rose-700 border-rose-200',
                              }[productStatusTone(o.productStatus)]
                            }`}
                          >
                            {(options.productStatuses.includes(o.productStatus)
                              ? options.productStatuses
                              : [o.productStatus, ...options.productStatuses]
                            ).map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </Td>
                        <Td>
                          {o.warrantyEndDate ? (
                            <span className={w.status === 'expired' ? 'text-rose-700' : w.status === 'expiring' ? 'text-amber-700 font-semibold' : ''}>
                              {fmtDate(o.warrantyEndDate)}
                            </span>
                          ) : (
                            ''
                          )}
                        </Td>
                        <Td className="font-mono text-[11px]">{o.trackingNo}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'queue' && (
        <QueueView
          orders={active}
          options={options}
          tech={techFilter}
          setTech={setTechFilter}
          fulfill={fulfillFilter}
          setFulfill={setFulfillFilter}
          onOpen={openDetail}
        />
      )}

      {tab === 'aftersales' && (
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> การรับประกัน
              </h3>
              <select className={`${inlineSelect}`} value={warrantyFilter} onChange={(e) => setWarrantyFilter(e.target.value as any)}>
                <option value="alert">ต้องแจ้งเตือน (ใกล้หมด/หมดแล้ว)</option>
                <option value="active">อยู่ในประกัน</option>
                <option value="expired">หมดประกันแล้วทั้งหมด</option>
                <option value="all">ทุกออเดอร์ที่ปิดงานแล้ว</option>
              </select>
            </div>
            <WarrantyList
              orders={active.filter((o) => {
                const s = warrantyState(o, options.warrantyAlertDays, today).status;
                if (s === 'none') return false;
                if (warrantyFilter === 'alert') return alerts.some((a) => a.id === o.id);
                if (warrantyFilter === 'active') return s === 'active' || s === 'expiring';
                if (warrantyFilter === 'expired') return s === 'expired';
                return true;
              })}
              options={options}
              onOpen={openDetail}
              onAck={(o) => onSaveOrder({ ...o, warrantyAlertAcknowledged: true })}
            />
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> งานแจ้งซ่อม
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${inlineSelect}`} value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value as any)}>
                  <option value="open">ยังไม่เสร็จ</option>
                  <option value="all">ทั้งหมด</option>
                </select>
                <select className={`${inlineSelect} max-w-[220px]`} value={ticketOrderId} onChange={(e) => setTicketOrderId(e.target.value)}>
                  <option value="">เลือกออเดอร์ที่จะแจ้งซ่อม…</option>
                  {[...active]
                    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} · {o.customerName}
                      </option>
                    ))}
                </select>
                <button
                  className={btn.primary}
                  disabled={!ticketOrderId}
                  onClick={() => {
                    const o = orders.find((x) => x.id === ticketOrderId);
                    if (o) openDetail(o, true);
                    setTicketOrderId('');
                  }}
                >
                  <Plus className="w-4 h-4" /> แจ้งซ่อม
                </button>
              </div>
            </div>
            <TicketList orders={orders} onlyOpen={ticketFilter === 'open'} onOpen={openDetail} />
          </div>
        </div>
      )}

      {formOrder !== undefined && (
        <OrderFormModal
          order={formOrder}
          orders={orders}
          products={products}
          options={options}
          onSave={onSaveOrder}
          onClose={() => setFormOrder(undefined)}
          onCreateStockProduct={onCreateStockProduct}
        />
      )}

      {detailOrder && formOrder === undefined && (
        <OrderDetailModal
          key={detailOrder.id}
          order={detailOrder}
          options={options}
          onSave={onSaveOrder}
          onEdit={() => setFormOrder(detailOrder)}
          onDelete={onDeleteOrder}
          onClose={() => setDetailId(null)}
          onIssueReceipt={onIssueReceipt}
          onOpenDoc={onOpenDoc}
          startWithTicketForm={detailTicket}
        />
      )}

      {optionsOpen && <OptionsModal options={options} onSave={onSaveOptions} onClose={() => setOptionsOpen(false)} />}
    </div>
  );
};

/* ---------- คิวงาน ---------- */
const QueueView: React.FC<{
  orders: Order[];
  options: OrderOptions;
  tech: string;
  setTech: (v: string) => void;
  fulfill: string;
  setFulfill: (v: string) => void;
  onOpen: (o: Order) => void;
}> = ({ orders, options, tech, setTech, fulfill, setFulfill, onOpen }) => {
  const today = todayISO();
  const jobs = orders.filter(
    (o) => o.queueStatus !== 'เสร็จแล้ว' && (!tech || o.technician === tech) && (!fulfill || o.fulfillment === fulfill)
  );
  const groups = new Map<string, Order[]>();
  const keyOf = (o: Order) => (!o.scheduledDate ? 'none' : o.scheduledDate < today ? 'late' : o.scheduledDate);
  for (const o of jobs) {
    const k = keyOf(o);
    groups.set(k, [...(groups.get(k) || []), o]);
  }
  const keys = Array.from(groups.keys()).sort((a, b) => {
    const rank = (k: string) => (k === 'late' ? '0' : k === 'none' ? '9' : '1' + k);
    return rank(a).localeCompare(rank(b));
  });
  const title = (k: string) =>
    k === 'late' ? 'เลยวันนัดแล้ว' : k === 'none' ? 'ยังไม่ได้นัดวัน' : k === today ? `วันนี้ · ${fmtDate(k)}` : fmtDate(k);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 bg-white border border-zinc-200 rounded-xl p-3">
        <select className={`${inlineSelect}`} value={tech} onChange={(e) => setTech(e.target.value)}>
          <option value="">ช่างทุกคน</option>
          {options.technicians.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select className={`${inlineSelect}`} value={fulfill} onChange={(e) => setFulfill(e.target.value)}>
          <option value="">ติดตั้งและจัดส่ง</option>
          <option value="ติดตั้ง">เฉพาะติดตั้ง</option>
          <option value="จัดส่ง">เฉพาะจัดส่ง</option>
        </select>
        <span className="text-xs text-zinc-500 self-center">งานที่ยังไม่ปิด {jobs.length} งาน</span>
      </div>

      {keys.length === 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center text-sm text-zinc-500">ไม่มีงานค้างในคิว</div>
      )}

      {keys.map((k) => (
        <div key={k} className="bg-white border border-zinc-200 rounded-xl">
          <div className={`px-4 py-2.5 border-b border-zinc-100 text-sm font-bold ${k === 'late' ? 'text-rose-700' : 'text-zinc-900'}`}>
            {title(k)} <span className="text-zinc-400 font-normal">({groups.get(k)!.length})</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {[...groups.get(k)!]
              .sort((a, b) => (a.scheduledTimeStart || '99').localeCompare(b.scheduledTimeStart || '99'))
              .map((o) => {
              const pay = paymentState(o);
              return (
                <button key={o.id} onClick={() => onOpen(o)} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex flex-wrap items-start gap-x-4 gap-y-1">
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-semibold text-zinc-900">
                      {fmtTimeRange(o) && <span className="mr-2 px-1.5 py-0.5 rounded bg-zinc-900 text-white text-[11px]">{fmtTimeRange(o)}</span>}
                      {o.customerName} <span className="text-zinc-400 font-normal">· {o.orderNumber}</span>
                    </div>
                    <div className="text-xs text-zinc-600">
                      {o.productLine} · {productTitle(o)}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600 min-w-[200px] flex-1">
                    <Badge tone={o.fulfillment === 'ติดตั้ง' ? 'dark' : 'neutral'}>{o.fulfillment}</Badge>{' '}
                    {o.fulfillment === 'ติดตั้ง' && (
                      <>
                        {o.technician || 'ยังไม่ระบุช่าง'} · {o.ceilingType || 'ยังไม่ระบุเพดาน'}
                      </>
                    )}
                    <div className="mt-0.5">{o.installArea}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(o.sitePhotos?.length || 0) > 0 && (
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" /> {o.sitePhotos!.length}
                      </span>
                    )}
                    <Badge tone={pay.tone}>{pay.label}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- ประกัน ---------- */
const WarrantyList: React.FC<{
  orders: Order[];
  options: OrderOptions;
  onOpen: (o: Order) => void;
  onAck: (o: Order) => void;
}> = ({ orders, options, onOpen, onAck }) => {
  const rows = [...orders].sort((a, b) => (a.warrantyEndDate || '').localeCompare(b.warrantyEndDate || ''));
  if (rows.length === 0) return <div className="p-8 text-center text-sm text-zinc-500">ไม่มีรายการ</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <Th>ออเดอร์</Th>
            <Th>ลูกค้า</Th>
            <Th>สินค้า</Th>
            <Th>ติดตั้ง/ส่งเสร็จ</Th>
            <Th>หมดประกัน</Th>
            <Th>สถานะ</Th>
            <Th> </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((o) => {
            const w = warrantyState(o, options.warrantyAlertDays);
            return (
              <tr key={o.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => onOpen(o)}>
                <Td className="font-semibold">{o.orderNumber}</Td>
                <Td>
                  {o.customerName}
                  {o.customerPhone && <div className="text-[10px] text-zinc-400">{o.customerPhone}</div>}
                </Td>
                <Td>
                  {o.productLine} · {productTitle(o)}
                </Td>
                <Td>{fmtDate(o.completedDate)}</Td>
                <Td>{fmtDate(o.warrantyEndDate)}</Td>
                <Td>
                  {w.status === 'expired' ? (
                    <Badge tone="red">หมดแล้ว {Math.abs(w.daysLeft)} วัน</Badge>
                  ) : w.status === 'expiring' ? (
                    <Badge tone="amber">เหลือ {w.daysLeft} วัน</Badge>
                  ) : (
                    <Badge tone="green">เหลือ {w.daysLeft} วัน</Badge>
                  )}
                  {o.warrantyAlertAcknowledged && <span className="ml-1 text-[10px] text-zinc-400">รับทราบแล้ว</span>}
                </Td>
                <Td>
                  {(w.status === 'expiring' || w.status === 'expired') && !o.warrantyAlertAcknowledged && (
                    <button
                      className={btn.small}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAck(o);
                      }}
                    >
                      รับทราบ
                    </button>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ---------- แจ้งซ่อม ---------- */
const TicketList: React.FC<{ orders: Order[]; onlyOpen: boolean; onOpen: (o: Order) => void }> = ({ orders, onlyOpen, onOpen }) => {
  const rows = orders
    .flatMap((o) => (o.serviceTickets || []).map((t) => ({ o, t })))
    .filter(({ t }) => !onlyOpen || t.status !== 'เสร็จแล้ว')
    .sort((a, b) => b.t.reportDate.localeCompare(a.t.reportDate));
  if (rows.length === 0) return <div className="p-8 text-center text-sm text-zinc-500">ไม่มีงานแจ้งซ่อม</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <Th>วันที่แจ้ง</Th>
            <Th>ออเดอร์ / ลูกค้า</Th>
            <Th>อาการ</Th>
            <Th>ช่าง</Th>
            <Th>การดำเนินการ</Th>
            <Th>ค่าใช้จ่าย</Th>
            <Th>สถานะ</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map(({ o, t }) => (
            <tr key={t.id} className="hover:bg-zinc-50 cursor-pointer" onClick={() => onOpen(o)}>
              <Td>{fmtDate(t.reportDate)}</Td>
              <Td>
                <span className="font-semibold">{o.orderNumber}</span> · {o.customerName}
              </Td>
              <Td className="max-w-[220px] truncate">{t.issue}</Td>
              <Td>{t.technician}</Td>
              <Td className="max-w-[220px] truncate">{t.action}</Td>
              <Td>
                ฿{fmtMoney(t.cost)} <span className="text-[10px] text-zinc-500">({t.chargeTo})</span>
              </Td>
              <Td>
                <Badge tone={t.status === 'เสร็จแล้ว' ? 'green' : t.status === 'กำลังดำเนินการ' ? 'dark' : 'amber'}>{t.status}</Badge>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ---------- ตั้งค่าตัวเลือก ---------- */
const OptionsModal: React.FC<{ options: OrderOptions; onSave: (o: OrderOptions) => void; onClose: () => void }> = ({
  options,
  onSave,
  onClose,
}) => {
  const toText = (a: string[]) => a.join('\n');
  const toList = (t: string) =>
    Array.from(new Set(t.split('\n').map((s) => s.trim()).filter(Boolean)));
  const [lines, setLines] = useState(options.productLines.map((l) => `${l.name} | ${l.warrantyYears}`).join('\n'));
  const [lists, setLists] = useState({
    models: toText(options.models),
    colors: toText(options.colors),
    sizes: toText(options.sizes),
    channels: toText(options.channels),
    ceilingTypes: toText(options.ceilingTypes),
    technicians: toText(options.technicians),
    productStatuses: toText(options.productStatuses),
    costPaidBy: toText(options.costPaidBy),
    paymentMethods: toText(options.paymentMethods),
  });
  const [deposit, setDeposit] = useState(options.defaultDeposit);
  const [alertDays, setAlertDays] = useState(options.warrantyAlertDays);
  const [numPrefix, setNumPrefix] = useState(options.orderNumberPrefix);
  const [numDate, setNumDate] = useState<OrderNumberDateFormat>(options.orderNumberDate);
  const [numDigits, setNumDigits] = useState(options.orderNumberDigits);
  const [err, setErr] = useState('');
  const numberPreview = nextOrderNumber([], todayISO(), {
    orderNumberPrefix: numPrefix,
    orderNumberDate: numDate,
    orderNumberDigits: numDigits,
  });

  const labels: Record<keyof typeof lists, string> = {
    models: 'MODEL',
    colors: 'สี',
    sizes: 'ขนาด',
    channels: 'ช่องทางการขาย',
    ceilingTypes: 'เพดาน',
    technicians: 'ช่างผู้รับผิดชอบ',
    productStatuses: 'สถานะสินค้า',
    costPaidBy: 'ชำระต้นทุนค่าสินค้าโดย',
    paymentMethods: 'ช่องทางรับเงิน',
  };

  const save = () => {
    const productLines = toList(lines).map((row) => {
      const [name, y] = row.split('|').map((s) => s.trim());
      return { name, warrantyYears: Number(y) || 0 };
    });
    if (productLines.length === 0) {
      setErr('ต้องมีอย่างน้อย 1 รุ่น');
      return;
    }
    const out: OrderOptions = {
      ...options,
      productLines,
      models: toList(lists.models),
      colors: toList(lists.colors),
      sizes: toList(lists.sizes),
      channels: toList(lists.channels),
      ceilingTypes: toList(lists.ceilingTypes),
      technicians: toList(lists.technicians),
      productStatuses: toList(lists.productStatuses),
      costPaidBy: toList(lists.costPaidBy),
      paymentMethods: toList(lists.paymentMethods),
      defaultDeposit: Number(deposit) || 0,
      warrantyAlertDays: Number(alertDays) || 0,
      orderNumberPrefix: numPrefix.trim(),
      orderNumberDate: numDate,
      orderNumberDigits: Number(numDigits) || 3,
    };
    onSave(out);
    onClose();
  };

  return (
    <Modal
      title="ตั้งค่าตัวเลือกของออเดอร์"
      subtitle="พิมพ์ 1 ตัวเลือกต่อ 1 บรรทัด · ออเดอร์เก่าที่ใช้ค่าที่ลบไปแล้วยังแสดงค่าเดิมได้"
      onClose={onClose}
      footer={
        <>
          {err && <span className="text-xs text-rose-700 mr-auto">{err}</span>}
          <button className={btn.secondary} onClick={onClose}>
            ยกเลิก
          </button>
          <button className={btn.primary} onClick={save}>
            บันทึก
          </button>
        </>
      }
    >
      <div className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="text-sm font-bold text-zinc-900 mb-2">รูปแบบเลขออเดอร์</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="คำนำหน้า" hint="เช่น K, KZ">
            <input className={inputCls} value={numPrefix} onChange={(e) => setNumPrefix(e.target.value.replace(/\s+/g, ''))} />
          </Field>
          <Field label="วันที่ในเลขออเดอร์">
            <select className={inputCls} value={numDate} onChange={(e) => setNumDate(e.target.value as OrderNumberDateFormat)}>
              <option value="YYYYMM">ปี ค.ศ. 4 หลัก + เดือน (202611)</option>
              <option value="YYMM">ปี ค.ศ. 2 หลัก + เดือน (2611)</option>
              <option value="BBBBMM">ปี พ.ศ. 4 หลัก + เดือน (256911)</option>
              <option value="BBMM">ปี พ.ศ. 2 หลัก + เดือน (6911)</option>
              <option value="NONE">ไม่ใส่วันที่ (นับต่อเนื่อง)</option>
            </select>
          </Field>
          <Field label="จำนวนหลักของลำดับ">
            <select className={inputCls} value={numDigits} onChange={(e) => setNumDigits(Number(e.target.value))}>
              {[3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d} หลัก ({'1'.padStart(d, '0')})
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          ตัวอย่างเลขออเดอร์ถัดไปเดือนนี้: <b className="text-zinc-900">{numberPreview}</b> ·{' '}
          {numDate === 'NONE' ? 'ลำดับนับต่อเนื่อง' : 'ลำดับเริ่มใหม่ทุกเดือน'} ·
          ออเดอร์เก่าไม่เปลี่ยนเลข
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="รุ่น | ระยะประกัน (ปี)" hint="เช่น รุ่นมือหมุน | 2" className="sm:col-span-2">
          <textarea rows={3} className={inputCls} value={lines} onChange={(e) => setLines(e.target.value)} />
        </Field>
        {(Object.keys(lists) as (keyof typeof lists)[]).map((k) => (
          <Field key={k} label={labels[k]}>
            <textarea rows={4} className={inputCls} value={lists[k]} onChange={(e) => setLists({ ...lists, [k]: e.target.value })} />
          </Field>
        ))}
        <Field label="ยอดมัดจำเริ่มต้น (บาท)">
          <input type="number" min={0} className={inputCls} value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} />
        </Field>
        <Field label="แจ้งเตือนก่อนประกันหมด (วัน)">
          <input type="number" min={0} className={inputCls} value={alertDays} onChange={(e) => setAlertDays(Number(e.target.value))} />
        </Field>
      </div>
    </Modal>
  );
};
