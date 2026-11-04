import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  ClipboardList,
  FileText,
  MapPin,
  MoreHorizontal,
  Pencil,
  Tag,
  Trash2,
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
  Tone,
} from '../utils/orders';
import { OrderFormModal } from './orders/OrderFormModal';
import { OrderDetailModal } from './orders/OrderDetailModal';
import { Badge, Field, Modal, PageHeader, Pager, StatCard, TabButtons, btn, inputCls, productStatusTone } from './orders/ui';
import { WarrantyCardModal } from './orders/WarrantyCardModal';

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
  return `${THAI_MONTHS[m - 1]} ${y}`;
};

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <th className={`px-3 py-2.5 text-left text-[11px] font-semibold text-zinc-500 whitespace-nowrap ${className}`}>{children}</th>
);
const Td: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <td className={`px-3 py-2.5 text-xs text-zinc-800 whitespace-nowrap ${className}`}>{children ?? ''}</td>
);

const PAGE_SIZE = 20;

/** ช่องการชำระเงินในตาราง: ถ้ามีหลายส่วน (มัดจำ · เก็บหน้างาน) แยกเป็นบรรทัดละส่วน ตัวอักษรเล็ก */
const PayCell: React.FC<{ label: string; tone: Tone }> = ({ label, tone }) => {
  const lines = label.split(' · ');
  if (lines.length === 1) return <Badge tone={tone}>{label}</Badge>;
  return (
    <span
      className={`inline-flex flex-col px-1.5 py-0.5 rounded-md border text-[10px] font-semibold leading-tight ${
        { neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200', dark: 'bg-zinc-900 text-white border-zinc-900', green: 'bg-emerald-50 text-emerald-700 border-emerald-200', amber: 'bg-amber-50 text-amber-800 border-amber-200', red: 'bg-rose-50 text-rose-700 border-rose-200' }[tone || 'neutral']
      }`}
    >
      {lines.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </span>
  );
};
type SortKey = 'default' | 'number' | 'price';

const SortHead: React.FC<{
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
}> = ({ label, k, sort, onSort }) => {
  const Icon = sort.key !== k ? ChevronsUpDown : sort.dir === 1 ? ChevronUp : ChevronDown;
  return (
    <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-zinc-900">
      {label}
      <Icon className={`w-3.5 h-3.5 ${sort.key === k ? 'text-[#003BB3]' : 'text-zinc-400'}`} />
    </button>
  );
};

/** ปุ่ม ••• ท้ายแถว: แก้ไขข้อมูล / ใบรับประกัน / ลบออเดอร์ */
const RowMenu: React.FC<{ order: Order; onEdit: () => void; onWarranty: () => void; onDelete: () => void }> = ({
  order,
  onEdit,
  onWarranty,
  onDelete,
}) => {
  // เมนูลอยแบบ fixed เพื่อไม่ให้ถูกตารางที่เลื่อนแนวนอนตัดหรือถูกแถวอื่นทับ
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const open = !!pos;
  const ref = React.useRef<HTMLDivElement>(null);
  const setOpen = (v: boolean | ((x: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(open) : v;
    if (!next) return setPos(null);
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === 'mousedown' && ref.current && ref.current.contains(e.target as Node)) return;
      setPos(null);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);
  const item = 'w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md';
  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
    fn();
  };
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-7 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700"
        aria-label="จัดการออเดอร์"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {pos &&
        createPortal(
        <div
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg p-1 text-left"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button className={`${item} text-zinc-800 hover:bg-zinc-50`} onClick={run(onEdit)}>
            <Pencil className="w-4 h-4" /> แก้ไขข้อมูล
          </button>
          <button
            className={`${item} text-zinc-800 hover:bg-zinc-50 disabled:text-zinc-300 disabled:hover:bg-white`}
            onClick={run(onWarranty)}
            disabled={!order.completedDate}
            title={order.completedDate ? '' : 'ใช้ได้เมื่อปิดงานแล้ว'}
          >
            <Award className="w-4 h-4" /> ใบรับประกัน
          </button>
          <button className={`${item} text-rose-600 hover:bg-rose-50`} onClick={run(onDelete)}>
            <Trash2 className="w-4 h-4" /> ลบออเดอร์
          </button>
        </div>,
          document.body
        )}
    </div>
  );
};

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

  // กลับมาที่รายการออเดอร์ (เช่น หลังบันทึกเอกสาร): ปิดหน้ารายละเอียด/ฟอร์มที่เปิดค้างไว้
  useEffect(() => {
    const back = () => {
      setDetailId(null);
      setFormOrder(undefined);
      setTab('list');
    };
    window.addEventListener('app:go-orders', back);
    return () => window.removeEventListener('app:go-orders', back);
  }, []);

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
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'default', dir: 1 });
  const [pageRaw, setPage] = useState(1);
  const [cardOrder, setCardOrder] = useState<Order | null>(null);
  // เปลี่ยนตัวกรองแล้วกลับไปหน้าแรก
  useEffect(() => setPage(1), [q, month, channel, status, payFilter]);

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
  // ค่าเริ่มต้น: เรียงตามวันที่สั่งซื้อจากเก่าไปใหม่เหมือนตารางเดิม · กดหัวคอลัมน์เพื่อเรียงตามเลขออเดอร์/ยอดเงิน
  const listRows = [...filtered].sort((a, b) => {
    if (sort.key === 'price') return ((Number(a.price) || 0) - (Number(b.price) || 0)) * sort.dir;
    if (sort.key === 'number') return a.orderNumber.localeCompare(b.orderNumber) * sort.dir;
    return (a.orderDate + a.orderNumber).localeCompare(b.orderDate + b.orderNumber);
  });
  const pageCount = Math.max(1, Math.ceil(listRows.length / PAGE_SIZE));
  const page = Math.min(pageRaw, pageCount);
  const pageRows = listRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? (s.dir === 1 ? { key, dir: -1 } : { key: 'default', dir: 1 }) : { key, dir: 1 }));

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
      <PageHeader
        icon={ClipboardList}
        title="ออเดอร์ & งานติดตั้ง"
        subtitle="รับมัดจำ · ตัดสต็อก · ลงคิวช่าง · ปิดงาน · ติดตามประกันและงานซ่อม"
        actions={
          <>
            <button className={`${btn.secondary} px-5 py-2.5`} onClick={() => setOptionsOpen(true)}>
              <Settings2 className="w-4 h-4" /> ตั้งค่าตัวเลือก
            </button>
            <button className={`${btn.primary} px-5 py-2.5`} onClick={() => setFormOrder(null)}>
              <Plus className="w-4 h-4" /> ออเดอร์ใหม่
            </button>
          </>
        }
      />

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
        <StatCard icon={FileText} label={`ออเดอร์${month === 'ALL' ? 'ทั้งหมด' : ` ${monthLabel(month)}`}`} value={`${summary.count} รายการ`} />
        <StatCard icon={Tag} label="ยอดขาย" value={`฿${fmtMoney(summary.sales)}`} />
        <StatCard icon={CheckCircle2} tone="green" label="รับเงินแล้ว" value={`฿${fmtMoney(summary.received)}`} />
        <StatCard icon={Clock} tone="orange" label="ยอดค้างรับ (ทุกออเดอร์)" value={`฿${fmtMoney(summary.outstanding)}`} />
        <StatCard icon={Wrench} label="งานที่ยังไม่ปิด" value={`${summary.pendingJobs} งาน`} />
      </div>

      {/* Sub tabs */}
      <TabButtons tabs={subTabs} value={tab} onChange={setTab} />

      {tab === 'list' && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2.5">
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
            <div className="p-10 text-center text-sm text-zinc-500 border-t border-zinc-100">
              {orders.length === 0 ? 'ยังไม่มีออเดอร์ กด "ออเดอร์ใหม่" เพื่อเริ่มบันทึก' : 'ไม่พบออเดอร์ตามเงื่อนไข'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border-t border-zinc-100">
                <table className="min-w-full">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <Th>#</Th>
                      <Th>สถานะสินค้า</Th>
                      <Th>การชำระเงิน</Th>
                      <Th>วันที่สั่งซื้อ</Th>
                      <Th>นัดวันที่</Th>
                      <Th>
                        <SortHead label="เลขออเดอร์" k="number" sort={sort} onSort={toggleSort} />
                      </Th>
                      <Th>ลูกค้า</Th>
                      <Th>รุ่น</Th>
                      <Th>สินค้า (MODEL · สี · ขนาด)</Th>
                      <Th>ช่องทาง</Th>
                      <Th>การดำเนินการ</Th>
                      <Th>เพดาน</Th>
                      <Th>ช่าง</Th>
                      <Th>พื้นที่</Th>
                      <Th>สถานะคิว</Th>
                      <Th>ชำระต้นทุนโดย</Th>
                      <Th>หมดประกัน</Th>
                      <Th>Tracking No.</Th>
                      <Th className="text-center sticky right-0 bg-zinc-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">จัดการ</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {pageRows.map((o, i) => {
                      const pay = paymentState(o);
                      const w = warrantyState(o, options.warrantyAlertDays, today);
                      return (
                        <tr
                          key={o.id}
                          onClick={() => openDetail(o)}
                          className={`group cursor-pointer hover:bg-zinc-50 ${o.cancelled ? 'opacity-50' : ''}`}
                        >
                          <Td className="text-zinc-400">{(page - 1) * PAGE_SIZE + i + 1}</Td>
                          <Td>
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={o.productStatus}
                              onChange={(e) => onSaveOrder({ ...o, productStatus: e.target.value })}
                              className={`text-[11px] font-semibold rounded-md border px-1.5 py-0.5 ${
                                {
                                  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                  amber: 'bg-amber-50 text-amber-800 border-amber-200',
                                  dark: 'bg-[#003BB3] text-white border-[#003BB3]',
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
                            <PayCell label={pay.label} tone={pay.tone} />
                          </Td>
                          <Td>{fmtDate(o.orderDate)}</Td>
                          <Td className={o.scheduledDate && o.scheduledDate < today && o.queueStatus !== 'เสร็จแล้ว' ? 'text-rose-700 font-semibold' : ''}>
                            {o.scheduledDate ? fmtDate(o.scheduledDate) : ''}
                            {fmtTimeRange(o) && <div className="text-[10px] text-zinc-500 font-normal">{fmtTimeRange(o)}</div>}
                          </Td>
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
                          <Td>{o.queueStatus === 'ยังไม่ลงคิว' ? '' : o.queueStatus}</Td>
                          <Td>{o.costPaidBy}</Td>
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
                          <Td className="text-center py-1.5 sticky right-0 bg-white group-hover:bg-zinc-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                            <RowMenu
                              order={o}
                              onEdit={() => setFormOrder(o)}
                              onWarranty={() => setCardOrder(o)}
                              onDelete={() => {
                                if (!confirm(`ลบออเดอร์ ${o.orderNumber} ถาวร?${o.stockDeducted ? '\nสต็อกที่ตัดไปจะถูกคืนเข้าคลัง' : ''}`)) return;
                                onDeleteOrder(o);
                              }}
                            />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-zinc-100">
                <Pager page={page} pageSize={PAGE_SIZE} total={listRows.length} onPage={setPage} />
              </div>
            </>
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
          <div className="bg-white border border-zinc-200/80 rounded-2xl">
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

          <div className="bg-white border border-zinc-200/80 rounded-2xl">
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
          orders={orders}
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

      {cardOrder && (
        <WarrantyCardModal
          order={orders.find((x) => x.id === cardOrder.id) || cardOrder}
          orders={orders}
          onSave={onSaveOrder}
          onClose={() => setCardOrder(null)}
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
      <div className="flex flex-wrap gap-2 bg-white border border-zinc-200/80 rounded-2xl p-3">
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
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center text-sm text-zinc-500">ไม่มีงานค้างในคิว</div>
      )}

      {keys.map((k) => (
        <div key={k} className="bg-white border border-zinc-200/80 rounded-2xl">
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
                      {fmtTimeRange(o) && <span className="mr-2 px-1.5 py-0.5 rounded bg-[#003BB3] text-white text-[11px]">{fmtTimeRange(o)}</span>}
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
