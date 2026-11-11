import React, { useState } from 'react';
import { Ban, CheckCircle2, FileText, Link2, Pencil, Plus, Receipt, RotateCcw, ShieldCheck, Trash2, Wrench, X, Award } from 'lucide-react';
import { Order, OrderOptions, OrderPayment, OrderPaymentType, SalesDocument, ServiceTicket, ServiceTicketStatus } from '../../types';
import {
  balanceDue,
  fmtDate,
  fmtTimeRange,
  fmtMoney,
  paidTotal,
  paymentState,
  productTitle,
  orderItems,
  productLinesOf,
  todayISO,
  warrantyState,
  warrantyEndFrom,
  warrantyYearsFor,
} from '../../utils/orders';
import { WarrantyCardModal } from './WarrantyCardModal';
import { Badge, DateInput, Field, Modal, Section, Select, btn, inputCls, productStatusTone } from './ui';

interface Props {
  order: Order;
  orders: Order[];
  options: OrderOptions;
  onSave: (order: Order) => Promise<Order>;
  onEdit: () => void;
  onDelete: (order: Order) => void;
  onClose: () => void;
  onIssueReceipt: (order: Order, paymentId: string) => void;
  onOpenDoc: (docId: string) => void;
  documents?: SalesDocument[];
  onLinkDoc?: (order: Order, docId: string) => Promise<void>;
  onUnlinkDoc?: (order: Order, docId: string) => Promise<void>;
  startWithTicketForm?: boolean;
}

const DOC_TYPE_TH: Record<string, string> = { QUOTATION: 'ใบเสนอราคา', INVOICE: 'ใบแจ้งหนี้', RECEIPT: 'ใบเสร็จ' };
const DOC_STATUS_TH: Record<string, { label: string; tone: 'green' | 'amber' | 'neutral' | 'red' | 'dark' }> = {
  DRAFT: { label: 'ร่าง', tone: 'neutral' },
  SENT: { label: 'รอชำระ', tone: 'amber' },
  PENDING_DEPOSIT: { label: 'รอมัดจำ', tone: 'amber' },
  APPROVED: { label: 'อนุมัติแล้ว', tone: 'neutral' },
  DEPOSIT_PAID: { label: 'ชำระมัดจำแล้ว', tone: 'dark' },
  PARTIALLY_PAID: { label: 'ชำระบางส่วน', tone: 'dark' },
  PAID: { label: 'ชำระครบแล้ว', tone: 'green' },
  CANCELLED: { label: 'ยกเลิก', tone: 'red' },
};
const normName = (s?: string) => (s || '').replace(/^(คุณ|นาย|นางสาว|นาง)\s*/, '').replace(/\s+/g, '').toLowerCase();

const PAY_TYPES: OrderPaymentType[] = ['มัดจำ', 'ชำระหน้างาน', 'ชำระเต็มจำนวน', 'ได้รับเงินจาก Shopee'];
const TICKET_STATUS: ServiceTicketStatus[] = ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จแล้ว'];

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-3 py-1.5 border-b border-zinc-100 last:border-0 text-sm">
    <span className="text-zinc-500 shrink-0">{label}</span>
    <span className="text-zinc-900 text-right font-medium">{children || '-'}</span>
  </div>
);

function blankTicket(): ServiceTicket {
  return {
    id: `svc-${Date.now()}`,
    reportDate: todayISO(),
    issue: '',
    technician: '',
    action: '',
    cost: 0,
    chargeTo: 'ในประกัน',
    status: 'รอดำเนินการ',
  };
}

export const OrderDetailModal: React.FC<Props> = ({
  order,
  orders,
  options,
  onSave,
  onEdit,
  onDelete,
  onClose,
  onIssueReceipt,
  onOpenDoc,
  documents = [],
  onLinkDoc,
  onUnlinkDoc,
  startWithTicketForm,
}) => {
  const o = order;
  const pay = paymentState(o);
  const paid = paidTotal(o);
  const balance = balanceDue(o);
  const years = warrantyYearsFor(o, options);
  const w = warrantyState(o, options.warrantyAlertDays);
  const serviceCost = (o.serviceTickets || []).reduce((s, t) => s + (Number(t.cost) || 0), 0);

  const [payForm, setPayForm] = useState<OrderPayment | null>(null);
  const [ticket, setTicket] = useState<ServiceTicket | null>(startWithTicketForm ? blankTicket() : null);
  const [closeDate, setCloseDate] = useState(todayISO());
  const [photo, setPhoto] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [cardOrder, setCardOrder] = useState<Order | null>(null);
  const [linkPick, setLinkPick] = useState<string | null>(null); // null = ปิดตัวเลือก

  // เอกสารที่ผูกกับออเดอร์นี้ และเอกสารที่ผูกได้ (ใบเสนอราคา/ใบแจ้งหนี้ ที่ยังไม่ผูกกับออเดอร์อื่น)
  const explicitDocs = (o.linkedDocIds || [])
    .map((id) => documents.find((d) => d.id === id))
    .filter((d): d is SalesDocument => !!d);
  // ใบแจ้งหนี้ที่ออกจากใบเสนอราคาที่ผูกไว้ นับว่าผูกด้วย
  const childInvoices = documents.filter(
    (d) =>
      d.type === 'INVOICE' &&
      !!d.parentQuotationId &&
      (o.linkedDocIds || []).includes(d.parentQuotationId) &&
      !(o.linkedDocIds || []).includes(d.id)
  );
  const linkedDocs = [...explicitDocs, ...childInvoices];
  const custKey = normName(o.customerName);
  const linkCandidates = documents
    .filter(
      (d) =>
        (d.type === 'QUOTATION' || d.type === 'INVOICE') &&
        d.status !== 'CANCELLED' &&
        !(o.linkedDocIds || []).includes(d.id) &&
        !childInvoices.some((c) => c.id === d.id) &&
        (!d.linkedOrderId || d.linkedOrderId === o.id || !orders.some((x) => x.id === d.linkedOrderId))
    )
    .map((d) => ({ d, same: !!custKey && normName(d.customerName) === custKey }))
    .sort((a, b) => Number(b.same) - Number(a.same) || (b.d.date + b.d.docNumber).localeCompare(a.d.date + a.d.docNumber));
  const linkedInvoice = linkedDocs.find((d) => d.type === 'INVOICE') || linkedDocs[0];

  const doLink = async () => {
    if (!linkPick || !onLinkDoc) return;
    setBusy(true);
    await onLinkDoc(o, linkPick);
    setBusy(false);
    setLinkPick(null);
  };

  const doUnlink = async (d: SalesDocument) => {
    if (!onUnlinkDoc) return;
    if (!confirm(`ยกเลิกการผูก ${DOC_TYPE_TH[d.type] || ''} ${d.docNumber}?\nยอดรับเงินที่บันทึกลงเอกสารไปแล้วจะยังอยู่เหมือนเดิม`)) return;
    setBusy(true);
    await onUnlinkDoc(o, d.id);
    setBusy(false);
  };

  const save = async (next: Order) => {
    setBusy(true);
    await onSave(next);
    setBusy(false);
  };

  const openPayForm = () => {
    const type: OrderPaymentType = o.awaitingShopeePayout
      ? 'ได้รับเงินจาก Shopee'
      : paid === 0
      ? 'มัดจำ'
      : 'ชำระหน้างาน';
    setPayForm({
      id: `pay-${Date.now()}`,
      date: todayISO(),
      amount: paid === 0 && type === 'มัดจำ' ? Math.min(options.defaultDeposit, o.price || options.defaultDeposit) : balance,
      type,
      method: type === 'ได้รับเงินจาก Shopee' ? 'Shopee' : options.paymentMethods[0] || 'โอนเงิน',
    });
  };

  const submitPayment = async () => {
    if (!payForm || !(Number(payForm.amount) > 0)) return;
    await save({
      ...o,
      payments: [...(o.payments || []), { ...payForm, amount: Number(payForm.amount) }],
      awaitingShopeePayout: payForm.type === 'ได้รับเงินจาก Shopee' ? false : o.awaitingShopeePayout,
    });
    setPayForm(null);
  };

  const removePayment = async (p: OrderPayment) => {
    const msg = p.receiptDocNumber
      ? `ลบรายการรับเงิน ฿${fmtMoney(p.amount)}?\nใบเสร็จ ${p.receiptDocNumber} ในหน้าเอกสารขายจะไม่ถูกลบ กรุณาจัดการเองถ้าต้องการ`
      : `ลบรายการรับเงิน ฿${fmtMoney(p.amount)}?`;
    if (!confirm(msg)) return;
    await save({ ...o, payments: o.payments.filter((x) => x.id !== p.id) });
  };

  const closeJob = async () => {
    const doneStatus = o.fulfillment === 'ติดตั้ง' ? 'ติดตั้งเรียบร้อยแล้ว' : 'จัดส่งแล้ว';
    const next: Order = {
      ...o,
      completedDate: closeDate,
      queueStatus: 'เสร็จแล้ว',
      productStatus: options.productStatuses.includes(doneStatus) ? doneStatus : o.productStatus,
      warrantyEndDate: years > 0 ? warrantyEndFrom(closeDate, years) : undefined,
      warrantyAlertAcknowledged: false,
    };
    await save(next);
    // ปิดงานแล้วเปิดใบรับประกันให้ทันที
    setCardOrder(next);
  };

  const reopenJob = async () => {
    if (!confirm('ยกเลิกการปิดงาน? วันหมดประกันจะถูกล้างด้วย')) return;
    await save({ ...o, completedDate: undefined, warrantyEndDate: undefined, queueStatus: 'ลงคิวแล้ว' });
  };

  const submitTicket = async () => {
    if (!ticket || !ticket.issue.trim()) return;
    const t: ServiceTicket = {
      ...ticket,
      cost: Number(ticket.cost) || 0,
      completedDate: ticket.status === 'เสร็จแล้ว' ? ticket.completedDate || todayISO() : undefined,
    };
    const exists = (o.serviceTickets || []).some((x) => x.id === t.id);
    await save({
      ...o,
      serviceTickets: exists ? o.serviceTickets.map((x) => (x.id === t.id ? t : x)) : [...(o.serviceTickets || []), t],
    });
    setTicket(null);
  };

  const setTicketStatus = async (t: ServiceTicket, status: ServiceTicketStatus) => {
    const next = { ...t, status, completedDate: status === 'เสร็จแล้ว' ? t.completedDate || todayISO() : undefined };
    await save({ ...o, serviceTickets: o.serviceTickets.map((x) => (x.id === t.id ? next : x)) });
  };

  const toggleCancel = async () => {
    if (!o.cancelled) {
      if (!confirm(`ยกเลิกออเดอร์ ${o.orderNumber}?${o.stockDeducted ? '\nสต็อกที่ตัดไปจะถูกคืนเข้าคลัง' : ''}`)) return;
      await save({ ...o, cancelled: true });
    } else {
      await save({ ...o, cancelled: false });
    }
  };

  const remove = () => {
    if (!confirm(`ลบออเดอร์ ${o.orderNumber} ถาวร?${o.stockDeducted ? '\nสต็อกที่ตัดไปจะถูกคืนเข้าคลัง' : ''}`)) return;
    onDelete(o);
    onClose();
  };

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        <span className="flex flex-wrap items-center gap-2">
          ออเดอร์ {o.orderNumber}
          <Badge tone="neutral">{o.channel}</Badge>
          <Badge tone={pay.tone}>{pay.label}</Badge>
          <Badge tone={productStatusTone(o.productStatus)}>{o.productStatus}</Badge>
        </span>
      }
      subtitle={`สั่งซื้อ ${fmtDate(o.orderDate)}${o.channelOrderId ? ` · Shopee ${o.channelOrderId}` : ''}`}
      footer={
        <>
          <button className={`${btn.danger} mr-auto`} onClick={remove} disabled={busy}>
            <Trash2 className="w-4 h-4" /> ลบ
          </button>
          <button className={btn.secondary} onClick={toggleCancel} disabled={busy}>
            {o.cancelled ? <RotateCcw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            {o.cancelled ? 'เปิดออเดอร์อีกครั้ง' : 'ยกเลิกออเดอร์'}
          </button>
          <button className={btn.primary} onClick={onEdit} disabled={busy}>
            <Pencil className="w-4 h-4" /> แก้ไขข้อมูล
          </button>
        </>
      }
    >
      {o.cancelled && (
        <div className="px-4 py-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-sm">
          ออเดอร์นี้ถูกยกเลิกแล้ว · ไม่ตัดสต็อก (ถ้าเคยตัดไว้ ระบบคืนเข้าคลังแล้ว)
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Section title="ลูกค้าและสินค้า">
            <Row label="ลูกค้า">{o.customerName}</Row>
            <Row label="เบอร์โทร">{o.customerPhone}</Row>
            <Row label="ที่อยู่">{o.customerAddress}</Row>
            <Row label="สินค้า">
              <div className="space-y-0.5">
                {orderItems(o).map((it, i) => (
                  <div key={i}>
                    {it.productLine} · {productTitle(it)} ×{it.quantity}
                    {it.unitPrice > 0 && <span className="text-zinc-500"> · ฿{fmtMoney(it.unitPrice * it.quantity)}</span>}
                  </div>
                ))}
              </div>
            </Row>
            <Row label="จำนวนรวม">{o.quantity}</Row>
            <Row label="สต็อก">
              {o.stockDeducted ? (
                <Badge tone="green">ตัดสต็อกแล้ว</Badge>
              ) : o.productId ? (
                <Badge tone="neutral">ยังไม่ตัด (รอรับเงิน)</Badge>
              ) : (
                <Badge tone="amber">ไม่พบสินค้าในคลัง</Badge>
              )}
            </Row>
            <Row label="Tracking No.">{o.trackingNo}</Row>
            {o.note && <Row label="หมายเหตุ">{o.note}</Row>}
          </Section>

          <Section title={o.fulfillment === 'ติดตั้ง' ? 'งานติดตั้ง' : 'งานจัดส่ง'}>
            <Row label="การดำเนินการ">{o.fulfillment}</Row>
            <Row label={o.fulfillment === 'ติดตั้ง' ? 'วันที่นัดติดตั้ง' : 'วันที่จัดส่ง'}>{fmtDate(o.scheduledDate)}
              {fmtTimeRange(o) && ` · ${fmtTimeRange(o)}`}
            </Row>
            <Row label="สถานะคิว">{o.queueStatus}</Row>
            {o.fulfillment === 'ติดตั้ง' && (
              <>
                <Row label="เพดาน">{o.ceilingType}</Row>
                <Row label="ช่างผู้รับผิดชอบ">{o.technician}</Row>
              </>
            )}
            <Row label={o.fulfillment === 'ติดตั้ง' ? 'พื้นที่ติดตั้ง' : 'ที่อยู่จัดส่ง'}>{o.installArea}</Row>

            {(o.sitePhotos?.length || 0) > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {o.sitePhotos!.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setPhoto(i)}
                    className="aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                  >
                    <img src={src} alt={`รูปหน้างาน ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-zinc-100">
              {o.completedDate ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-zinc-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {o.fulfillment === 'ติดตั้ง' ? 'ติดตั้งเสร็จ' : 'จัดส่งเสร็จ'} {fmtDate(o.completedDate)}
                  </span>
                  <button className={btn.ghost} onClick={reopenJob} disabled={busy}>
                    ยกเลิกการปิดงาน
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-end gap-2">
                  <Field label={o.fulfillment === 'ติดตั้ง' ? 'วันที่ติดตั้งเสร็จ' : 'วันที่จัดส่งเสร็จ'}>
                    <DateInput value={closeDate} onChange={setCloseDate} />
                  </Field>
                  <button className={btn.primary} onClick={closeJob} disabled={busy || o.cancelled}>
                    <CheckCircle2 className="w-4 h-4" /> ปิดงาน
                  </button>
                  <span className="text-[11px] text-zinc-500 w-full">
                    ปิดงานแล้วระบบจะเริ่มนับประกัน {years > 0 ? `${years} ปี` : '(ยังไม่ได้ตั้งระยะประกันของรุ่นนี้)'}
                  </span>
                </div>
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <Section
            title="เอกสารที่ผูก (ใบเสนอราคา / ใบแจ้งหนี้)"
            action={
              onLinkDoc &&
              linkPick === null && (
                <button className={btn.small} onClick={() => setLinkPick(linkCandidates[0]?.d.id || '')} disabled={busy}>
                  <Link2 className="w-3.5 h-3.5" /> ผูกเอกสาร
                </button>
              )
            }
          >
            {linkedDocs.length === 0 ? (
              <p className="text-xs text-zinc-500">
                ยังไม่ได้ผูกเอกสาร · ถ้าลูกค้าขอใบเสนอราคา/ใบแจ้งหนี้ ให้ผูกไว้ที่นี่ แล้วรับเงินและออกใบเสร็จที่ออเดอร์นี้ ใบแจ้งหนี้จะอัปเดตยอดให้อัตโนมัติ
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
                {linkedDocs.map((d) => {
                  const st = DOC_STATUS_TH[d.status] || { label: d.status, tone: 'neutral' as const };
                  return (
                    <div key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0 mr-auto">
                        <div className="font-semibold text-zinc-900 flex flex-wrap items-center gap-1.5">
                          {DOC_TYPE_TH[d.type] || d.type} {d.docNumber}
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {!(o.linkedDocIds || []).includes(d.id) && (
                            <span className="text-[10px] font-normal text-zinc-500">(จาก {d.parentQuotationDocNumber || 'ใบเสนอราคา'})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {fmtDate(d.date)} · ยอด ฿{fmtMoney(d.grandTotal)}
                          {(Number(d.paidAmount) || 0) > 0 && ` · รับแล้ว ฿${fmtMoney(Number(d.paidAmount))}`}
                        </div>
                      </div>
                      <button className={btn.small} onClick={() => onOpenDoc(d.id)}>
                        <FileText className="w-3.5 h-3.5" /> เปิด
                      </button>
                      {onUnlinkDoc && (o.linkedDocIds || []).includes(d.id) && (
                        <button
                          className="p-1 text-zinc-400 hover:text-rose-600"
                          onClick={() => doUnlink(d)}
                          disabled={busy}
                          aria-label="ยกเลิกการผูกเอกสาร"
                          title="ยกเลิกการผูก"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {linkPick !== null && (
              <div className="mt-3 rounded-lg border border-zinc-300 p-3 space-y-2 bg-zinc-50">
                {linkCandidates.length === 0 ? (
                  <p className="text-xs text-zinc-500">ไม่มีใบเสนอราคา/ใบแจ้งหนี้ที่ผูกได้</p>
                ) : (
                  <Field label="เลือกเอกสาร (เอกสารของลูกค้าคนนี้อยู่ด้านบน)">
                    <select className={inputCls} value={linkPick} onChange={(e) => setLinkPick(e.target.value)}>
                      {linkCandidates.map(({ d, same }) => (
                        <option key={d.id} value={d.id}>
                          {same ? '★ ' : ''}
                          {d.docNumber} · {DOC_TYPE_TH[d.type]} · {d.customerName} · ฿{fmtMoney(d.grandTotal)} · {fmtDate(d.date)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <p className="text-[11px] text-zinc-500">
                  ใบเสร็จที่ออกจากออเดอร์นี้ไปแล้ว จะถูกบันทึกลงเอกสารที่ผูกให้อัตโนมัติ (ไม่ออกใบเสร็จใหม่)
                </p>
                <div className="flex justify-end gap-2">
                  <button className={btn.secondary} onClick={() => setLinkPick(null)}>
                    ยกเลิก
                  </button>
                  <button className={btn.primary} onClick={doLink} disabled={busy || !linkPick}>
                    <Link2 className="w-4 h-4" /> ผูกเอกสาร
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section
            title="การเงิน"
            action={
              !o.cancelled && (
                <button className={btn.small} onClick={openPayForm}>
                  <Plus className="w-3.5 h-3.5" /> รับชำระเงิน
                </button>
              )
            }
          >
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                ['ราคาขาย', o.price],
                ['รับแล้ว', paid],
                ['คงเหลือ', balance],
              ].map(([label, v]) => (
                <div key={label as string} className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2">
                  <div className="text-[11px] text-zinc-500">{label}</div>
                  <div className="text-base font-bold text-zinc-900">฿{fmtMoney(v as number)}</div>
                </div>
              ))}
            </div>
            <Row label="ต้นทุนสินค้า">฿{fmtMoney(o.costPrice)}</Row>
            <Row label="ชำระต้นทุนโดย">{o.costPaidBy}</Row>
            <Row label="ค่าใช้จ่ายหลังการขาย">฿{fmtMoney(serviceCost)}</Row>
            <Row label="กำไรขั้นต้นโดยประมาณ">฿{fmtMoney(o.price - o.costPrice - serviceCost)}</Row>

            <div className="mt-3">
              <div className="text-xs font-semibold text-zinc-600 mb-1.5">ประวัติรับเงิน</div>
              {linkedInvoice && (
                <p className="text-[11px] text-[#003BB3] mb-1.5">
                  ออกใบเสร็จที่นี่ ระบบจะบันทึกยอดลง{DOC_TYPE_TH[linkedInvoice.type]} {linkedInvoice.docNumber} ให้อัตโนมัติ
                </p>
              )}
              {(o.payments || []).length === 0 ? (
                <p className="text-xs text-zinc-400">ยังไม่มีการรับเงิน</p>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
                  {o.payments.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0 mr-auto">
                        <div className="font-semibold text-zinc-900">
                          {p.type} ฿{fmtMoney(p.amount)}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {fmtDate(p.date)} · {p.method}
                          {p.note ? ` · ${p.note}` : ''}
                        </div>
                      </div>
                      {p.receiptDocId ? (
                        <button className={btn.small} onClick={() => onOpenDoc(p.receiptDocId!)}>
                          <FileText className="w-3.5 h-3.5" /> {p.receiptDocNumber}
                        </button>
                      ) : (
                        <button className={btn.small} onClick={() => onIssueReceipt(o, p.id)}>
                          <Receipt className="w-3.5 h-3.5" /> ออกใบเสร็จ
                        </button>
                      )}
                      <button className="p-1 text-zinc-400 hover:text-rose-600" onClick={() => removePayment(p)} aria-label="ลบรายการรับเงิน">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {payForm && (
              <div className="mt-3 rounded-lg border border-zinc-300 p-3 space-y-3 bg-zinc-50">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ประเภท">
                    <Select
                      value={payForm.type}
                      onChange={(v) => setPayForm({ ...payForm, type: (v || 'ชำระหน้างาน') as OrderPaymentType })}
                      options={PAY_TYPES}
                    />
                  </Field>
                  <Field label="ยอดเงิน (บาท)">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="ช่องทาง">
                    <Select value={payForm.method} onChange={(v) => setPayForm({ ...payForm, method: v })} options={options.paymentMethods} />
                  </Field>
                  <Field label="วันที่">
                    <DateInput value={payForm.date} onChange={(v) => setPayForm({ ...payForm, date: v })} />
                  </Field>
                  <Field label="หมายเหตุ" className="col-span-2">
                    <input className={inputCls} value={payForm.note || ''} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
                  </Field>
                </div>
                <div className="flex justify-end gap-2">
                  <button className={btn.secondary} onClick={() => setPayForm(null)}>
                    ยกเลิก
                  </button>
                  <button className={btn.primary} onClick={submitPayment} disabled={busy || !(Number(payForm.amount) > 0)}>
                    บันทึกรับเงิน
                  </button>
                </div>
              </div>
            )}
          </Section>

          <Section title="การรับประกัน">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-zinc-700 mt-0.5 shrink-0" />
              <div className="text-sm text-zinc-700 flex-1">
                {years > 0 ? `${productLinesOf(o)} รับประกัน ${years} ปี` : 'ยังไม่ได้ตั้งระยะประกันของรุ่นนี้'}
                <div className="mt-1">
                  {o.warrantyEndDate ? (
                    <span className="flex flex-wrap items-center gap-2">
                      หมดประกัน {fmtDate(o.warrantyEndDate)}
                      {w.status === 'expired' && <Badge tone="red">หมดประกันแล้ว</Badge>}
                      {w.status === 'expiring' && <Badge tone="amber">เหลือ {w.daysLeft} วัน</Badge>}
                      {w.status === 'active' && <Badge tone="green">อยู่ในประกัน · เหลือ {w.daysLeft} วัน</Badge>}
                    </span>
                  ) : (
                    <span className="text-zinc-500">เริ่มนับเมื่อปิดงานติดตั้ง/จัดส่ง</span>
                  )}
                </div>
                {(w.status === 'expiring' || w.status === 'expired') && !o.warrantyAlertAcknowledged && (
                  <button
                    className={`${btn.small} mt-2`}
                    onClick={() => save({ ...o, warrantyAlertAcknowledged: true })}
                    disabled={busy}
                  >
                    รับทราบแล้ว (ซ่อนการแจ้งเตือน)
                  </button>
                )}
                {o.completedDate && (
                  <button className={`${btn.small} mt-2 ml-0 sm:ml-2`} onClick={() => setCardOrder(o)} disabled={busy}>
                    <Award className="w-3.5 h-3.5" /> ใบรับประกัน{o.warrantyNumber ? ` (${o.warrantyNumber})` : ''}
                  </button>
                )}
              </div>
            </div>
          </Section>

          <Section
            title="หลังการขาย / แจ้งซ่อม"
            action={
              !ticket && (
                <button className={btn.small} onClick={() => setTicket(blankTicket())}>
                  <Wrench className="w-3.5 h-3.5" /> แจ้งซ่อม
                </button>
              )
            }
          >
            {(o.serviceTickets || []).length === 0 && !ticket && <p className="text-xs text-zinc-400">ยังไม่มีการแจ้งซ่อม</p>}
            <div className="space-y-2">
              {(o.serviceTickets || []).map((t) => (
                <div key={t.id} className="border border-zinc-200 rounded-lg p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900">{t.issue}</div>
                      <div className="text-[11px] text-zinc-500">
                        แจ้ง {fmtDate(t.reportDate)} · {t.technician || 'ยังไม่ระบุช่าง'}
                        {t.completedDate ? ` · เสร็จ ${fmtDate(t.completedDate)}` : ''}
                      </div>
                    </div>
                    <select
                      className="text-xs border border-zinc-300 rounded-md px-2 py-1 bg-white"
                      value={t.status}
                      onChange={(e) => setTicketStatus(t, e.target.value as ServiceTicketStatus)}
                    >
                      {TICKET_STATUS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  {t.action && <div className="text-xs text-zinc-700 mt-1.5">การดำเนินการ: {t.action}</div>}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-zinc-700">
                      ค่าใช้จ่าย ฿{fmtMoney(t.cost)} · <Badge tone={t.chargeTo === 'ในประกัน' ? 'neutral' : 'amber'}>{t.chargeTo}</Badge>
                    </span>
                    <button className={btn.ghost} onClick={() => setTicket({ ...t })}>
                      <Pencil className="w-3.5 h-3.5" /> แก้ไข
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {ticket && (
              <div className="mt-3 rounded-lg border border-zinc-300 p-3 space-y-3 bg-zinc-50">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันที่แจ้ง">
                    <DateInput value={ticket.reportDate} onChange={(v) => setTicket({ ...ticket, reportDate: v })} />
                  </Field>
                  <Field label="ช่างที่รับผิดชอบ">
                    <Select value={ticket.technician} onChange={(v) => setTicket({ ...ticket, technician: v })} options={options.technicians} />
                  </Field>
                  <Field label="อาการ / ปัญหาที่แจ้ง" required className="col-span-2">
                    <input className={inputCls} value={ticket.issue} onChange={(e) => setTicket({ ...ticket, issue: e.target.value })} />
                  </Field>
                  <Field label="ดำเนินการอย่างไร" className="col-span-2">
                    <textarea rows={2} className={inputCls} value={ticket.action} onChange={(e) => setTicket({ ...ticket, action: e.target.value })} />
                  </Field>
                  <Field label="ค่าใช้จ่าย (บาท)">
                    <input type="number" min={0} className={inputCls} value={ticket.cost} onChange={(e) => setTicket({ ...ticket, cost: Number(e.target.value) })} />
                  </Field>
                  <Field label="ค่าใช้จ่ายนี้">
                    <Select
                      value={ticket.chargeTo}
                      onChange={(v) => setTicket({ ...ticket, chargeTo: (v || 'ในประกัน') as ServiceTicket['chargeTo'] })}
                      options={['ในประกัน', 'เก็บเงินลูกค้า']}
                    />
                  </Field>
                  <Field label="สถานะ">
                    <Select
                      value={ticket.status}
                      onChange={(v) => setTicket({ ...ticket, status: (v || 'รอดำเนินการ') as ServiceTicketStatus })}
                      options={TICKET_STATUS}
                    />
                  </Field>
                </div>
                <div className="flex justify-end gap-2">
                  <button className={btn.secondary} onClick={() => setTicket(null)}>
                    ยกเลิก
                  </button>
                  <button className={btn.primary} onClick={submitTicket} disabled={busy || !ticket.issue.trim()}>
                    บันทึกแจ้งซ่อม
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>

      {cardOrder && (
        <WarrantyCardModal order={cardOrder} orders={orders} onSave={onSave} onClose={() => setCardOrder(null)} />
      )}

      {photo !== null && o.sitePhotos && (
        <div className="fixed inset-0 z-[60] bg-zinc-950/90 flex items-center justify-center p-4" onClick={() => setPhoto(null)}>
          <img src={o.sitePhotos[photo]} alt="รูปหน้างาน" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white" aria-label="ปิด">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </Modal>
  );
};
