import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, PackagePlus, Plus, Trash2, X } from 'lucide-react';
import { FulfillmentType, Order, OrderItem, OrderOptions, OrderPayment, Product, QueueStatus } from '../../types';
import {
  MAX_SITE_PHOTOS,
  TIME_OPTIONS,
  compressImage,
  deductedOf,
  findStockProduct,
  orderItems,
  fmtMoney,
  nextOrderNumber,
  todayISO,
  warrantyYearsFor,
  warrantyEndFrom,
} from '../../utils/orders';
import { DateInput, Field, Modal, Section, Select, btn, inputCls } from './ui';

interface Props {
  order?: Order | null;
  orders: Order[];
  products: Product[];
  options: OrderOptions;
  onSave: (order: Order) => Promise<Order>;
  onClose: () => void;
  onCreateStockProduct: (p: Product) => void;
}

const QUEUE: QueueStatus[] = ['ยังไม่ลงคิว', 'ลงคิวแล้ว', 'เสร็จแล้ว'];

const blankItem = (): OrderItem => ({ productLine: '', model: '', color: '', size: '', quantity: 1, unitPrice: 0 });

function blankOrder(orders: Order[], options: OrderOptions): Order {
  const date = todayISO();
  const now = new Date().toISOString();
  return {
    id: `ord-${Date.now()}`,
    orderNumber: nextOrderNumber(orders, date, options),
    orderDate: date,
    channel: options.channels[0] || 'Line',
    customerName: '',
    customerPhone: '',
    productLine: '',
    model: '',
    color: '',
    size: '',
    quantity: 1,
    stockDeducted: false,
    fulfillment: 'ติดตั้ง',
    queueStatus: 'ยังไม่ลงคิว',
    sitePhotos: [],
    price: 0,
    costPrice: 0,
    costPaidBy: '',
    payments: [],
    productStatus: options.productStatuses[0] || 'สั่งซื้อแล้ว',
    serviceTickets: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const OrderFormModal: React.FC<Props> = ({
  order,
  orders,
  products,
  options,
  onSave,
  onClose,
  onCreateStockProduct,
}) => {
  const isNew = !order;
  const [f, setF] = useState<Order>(() => (order ? { ...order } : blankOrder(orders, options)));
  const [numberTouched, setNumberTouched] = useState(false);
  const [takeDeposit, setTakeDeposit] = useState(true);
  const [depositAmount, setDepositAmount] = useState<number>(options.defaultDeposit);
  const [depositMethod, setDepositMethod] = useState(options.paymentMethods[0] || 'โอนเงิน');
  const [depositDate, setDepositDate] = useState(todayISO());
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Order>(k: K, v: Order[K]) => setF((p) => ({ ...p, [k]: v }));

  const isShopee = f.channel.toLowerCase().includes('shopee');

  // รายการสินค้า (หลายรุ่น/หลายสีได้) · ยอดรวมคำนวณอัตโนมัติจาก จำนวน × ราคาต่อชิ้น
  const [items, setItems] = useState<OrderItem[]>(() => (order ? orderItems(order).map((i) => ({ ...i })) : [blankItem()]));
  const setItem = (idx: number, patch: Partial<OrderItem>) =>
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const lineTotal = (i: OrderItem) => (Math.max(0, Number(i.quantity) || 0) * Math.max(0, Number(i.unitPrice) || 0));
  const total = items.reduce((s, i) => s + lineTotal(i), 0);
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const matchedList = useMemo(() => items.map((i) => findStockProduct(products, i)), [products, items]);
  // สต็อกที่ใช้ได้ = คงเหลือ + จำนวนที่ออเดอร์นี้ตัดไปแล้ว (กรณีแก้ไข) − จำนวนที่แถวก่อนหน้าในออเดอร์เดียวกันใช้ไป
  const prevDeducted = deductedOf(order);
  const availableFor = (idx: number) => {
    const m = matchedList[idx];
    if (!m) return 0;
    const back = prevDeducted.filter((d) => d.id === m.id).reduce((s, d) => s + d.qty, 0);
    const usedBefore = items.slice(0, idx).reduce((s, it, j) => s + (matchedList[j]?.id === m.id ? Number(it.quantity) || 0 : 0), 0);
    return m.stock + back - usedBefore;
  };

  const changeDate = (d: string) => {
    setF((p) => ({ ...p, orderDate: d, orderNumber: isNew && !numberTouched ? nextOrderNumber(orders, d, options) : p.orderNumber }));
  };

  const changeChannel = (c: string) => {
    const shopee = c.toLowerCase().includes('shopee');
    setF((p) => ({
      ...p,
      channel: c,
      awaitingShopeePayout: isNew ? shopee : p.awaitingShopeePayout,
      fulfillment: isNew && shopee ? 'จัดส่ง' : p.fulfillment,
    }));
    if (isNew) setTakeDeposit(!shopee);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_SITE_PHOTOS - (f.sitePhotos?.length || 0);
    if (room <= 0) {
      setError(`แนบรูปได้สูงสุด ${MAX_SITE_PHOTOS} รูปต่อออเดอร์`);
      return;
    }
    setPhotoBusy(true);
    setError('');
    try {
      const picked = Array.from(files).slice(0, room);
      const out: string[] = [];
      for (const file of picked) out.push(await compressImage(file));
      setF((p) => ({ ...p, sitePhotos: [...(p.sitePhotos || []), ...out] }));
      if (files.length > room) setError(`แนบได้อีก ${room} รูป ระบบจึงเลือกเฉพาะ ${room} รูปแรก`);
    } catch (e: any) {
      setError(e?.message || 'แนบรูปไม่สำเร็จ');
    } finally {
      setPhotoBusy(false);
    }
  };

  const createStockItem = (it: OrderItem) => {
    const p: Product = {
      id: `prod-${Date.now()}`,
      sku: `${it.model}-${it.color}-${it.size}`.replace(/\s+/g, ''),
      name: `${it.model} ${it.color} ${it.size}`,
      category: it.productLine || 'ราวตากผ้า',
      price: Number(it.unitPrice) || 0,
      costPrice: 0,
      stock: 0,
      minStock: 1,
      unit: 'ชุด',
      productLine: it.productLine || undefined,
      model: it.model,
      color: it.color,
      size: it.size,
      updatedAt: new Date().toISOString(),
    };
    onCreateStockProduct(p);
  };

  const submit = async () => {
    setError('');
    const missing = [
      !f.customerName.trim() && 'ชื่อลูกค้า',
      ...items.flatMap((it, i) => {
        const n = items.length > 1 ? ` (สินค้าแถวที่ ${i + 1})` : '';
        return [
          !it.productLine && `รุ่น${n}`,
          !it.model && `MODEL${n}`,
          !it.color && `สี${n}`,
          !it.size && `ขนาด${n}`,
          !(Number(it.quantity) >= 1) && `จำนวน${n}`,
        ];
      }),
    ].filter(Boolean);
    if (missing.length) {
      setError(`กรุณากรอก: ${missing.join(', ')}`);
      return;
    }
    if (!f.orderNumber.trim()) {
      setError('กรุณากรอกเลขออเดอร์');
      return;
    }
    if (f.scheduledTimeStart && f.scheduledTimeEnd && f.scheduledTimeEnd <= f.scheduledTimeStart) {
      setError('เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
      return;
    }
    if (orders.some((o) => o.id !== f.id && o.orderNumber === f.orderNumber.trim())) {
      setError(`เลขออเดอร์ ${f.orderNumber} มีอยู่แล้ว`);
      return;
    }

    let payments: OrderPayment[] = f.payments || [];
    if (isNew && takeDeposit && Number(depositAmount) > 0) {
      const full = total > 0 && Number(depositAmount) >= total;
      payments = [
        {
          id: `pay-${Date.now()}`,
          date: depositDate,
          amount: Number(depositAmount),
          type: full ? 'ชำระเต็มจำนวน' : 'มัดจำ',
          method: depositMethod,
        },
      ];
    }

    const cleanItems: OrderItem[] = items.map((it, i) => ({
      productLine: it.productLine,
      model: it.model,
      color: it.color,
      size: it.size,
      quantity: Math.max(1, Number(it.quantity) || 1),
      unitPrice: Math.max(0, Number(it.unitPrice) || 0),
      ...(matchedList[i]?.id ? { productId: matchedList[i]!.id } : {}),
    }));
    const first = cleanItems[0];
    const withItems: Order = {
      ...f,
      items: cleanItems,
      // ช่องหลักเก็บสินค้าแถวแรก + จำนวน/ยอดรวม เพื่อให้ส่วนอื่นของระบบทำงานเหมือนเดิม
      productLine: first.productLine,
      model: first.model,
      color: first.color,
      size: first.size,
      quantity: cleanItems.reduce((s, i) => s + i.quantity, 0),
      price: total,
      productId: first.productId,
    };
    const years = warrantyYearsFor(withItems, options);
    const saved: Order = {
      ...withItems,
      orderNumber: f.orderNumber.trim(),
      customerName: f.customerName.trim(),
      costPrice: Number(f.costPrice) || 0,
      payments,
      queueStatus: f.queueStatus === 'ยังไม่ลงคิว' && f.scheduledDate ? 'ลงคิวแล้ว' : f.queueStatus,
      warrantyEndDate: f.completedDate && years > 0 ? warrantyEndFrom(f.completedDate, years) : undefined,
    };
    setSaving(true);
    await onSave(saved);
    setSaving(false);
    onClose();
  };

  const willDeduct = (isNew ? (takeDeposit && Number(depositAmount) > 0) || !!f.awaitingShopeePayout : (f.payments || []).length > 0 || !!f.awaitingShopeePayout);

  return (
    <Modal
      title={isNew ? 'ออเดอร์ใหม่' : `แก้ไขออเดอร์ ${order?.orderNumber}`}
      subtitle="กรอกข้อมูลให้ครบ ระบบจะตัดสต็อกให้ทันทีเมื่อมีการรับเงิน (หรือออเดอร์ Shopee ที่รอเงินจาก Shopee)"
      onClose={onClose}
      footer={
        <>
          {error && <span className="text-xs text-rose-700 mr-auto">{error}</span>}
          <button className={btn.secondary} onClick={onClose} disabled={saving}>
            ยกเลิก
          </button>
          <button className={btn.primary} onClick={submit} disabled={saving || photoBusy}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            บันทึกออเดอร์
          </button>
        </>
      }
    >
      <Section title="1. ข้อมูลออเดอร์และลูกค้า">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="วันที่สั่งซื้อ" required>
            <DateInput value={f.orderDate} onChange={(v) => v && changeDate(v)} />
          </Field>
          <Field label="เลขออเดอร์" required>
            <input
              className={inputCls}
              value={f.orderNumber}
              onChange={(e) => {
                setNumberTouched(true);
                set('orderNumber', e.target.value);
              }}
            />
          </Field>
          <Field label="ช่องทางการขาย" required hint="เพิ่ม/แก้ช่องทางได้ที่ปุ่ม ตั้งค่าตัวเลือก">
            <Select value={f.channel} onChange={changeChannel} options={options.channels} />
          </Field>
          {isShopee && (
            <Field label="หมายเลขคำสั่งซื้อ Shopee" className="sm:col-span-3">
              <input
                className={inputCls}
                value={f.channelOrderId || ''}
                onChange={(e) => set('channelOrderId', e.target.value)}
                placeholder="เช่น 2610107PVXPHW4"
              />
            </Field>
          )}
          <Field label="ชื่อลูกค้า" required className="sm:col-span-2">
            <input className={inputCls} value={f.customerName} onChange={(e) => set('customerName', e.target.value)} />
          </Field>
          <Field label="เบอร์โทร">
            <input className={inputCls} value={f.customerPhone || ''} onChange={(e) => set('customerPhone', e.target.value)} />
          </Field>
          <Field label="ที่อยู่ลูกค้า" className="sm:col-span-3" hint="ใช้ในใบเสร็จและใบรับประกัน">
            <textarea
              rows={2}
              className={inputCls}
              value={f.customerAddress || ''}
              onChange={(e) => set('customerAddress', e.target.value)}
              placeholder="บ้านเลขที่ หมู่บ้าน/คอนโด ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="2. สินค้า"
        action={
          <button type="button" className={btn.small} onClick={() => setItems((l) => [...l, blankItem()])}>
            <Plus className="w-3.5 h-3.5" /> เพิ่มสินค้า
          </button>
        }
      >
        <div className="space-y-3">
          {items.map((it, idx) => {
            const m = matchedList[idx];
            const avail = availableFor(idx);
            const qty = Number(it.quantity) || 0;
            return (
              <div key={idx} className={items.length > 1 ? 'rounded-lg border border-zinc-200 p-3' : ''}>
                {items.length > 1 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-700">สินค้าแถวที่ {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setItems((l) => l.filter((_, i) => i !== idx))}
                      className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                      aria-label={`ลบสินค้าแถวที่ ${idx + 1}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="รุ่น" required>
                    <Select value={it.productLine} onChange={(v) => setItem(idx, { productLine: v })} options={options.productLines.map((l) => l.name)} />
                  </Field>
                  <Field label="MODEL" required>
                    <Select value={it.model} onChange={(v) => setItem(idx, { model: v })} options={options.models} />
                  </Field>
                  <Field label="สี" required>
                    <Select value={it.color} onChange={(v) => setItem(idx, { color: v })} options={options.colors} />
                  </Field>
                  <Field label="ขนาด" required>
                    <Select value={it.size} onChange={(v) => setItem(idx, { size: v })} options={options.sizes} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <Field label="จำนวน">
                    <input
                      type="number"
                      min={1}
                      className={inputCls}
                      value={it.quantity}
                      onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="ราคาต่อชิ้น (บาท)">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={it.unitPrice}
                      onChange={(e) => setItem(idx, { unitPrice: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="รวม (บาท)">
                    <div className={`${inputCls} bg-zinc-50 font-semibold text-zinc-900`}>{fmtMoney(lineTotal(it))}</div>
                  </Field>
                </div>
                {it.model && it.color && it.size && (
                  <div className="mt-2 text-xs">
                    {m ? (
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          avail >= qty ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        {avail >= qty ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        <span>
                          ในคลัง: <b>{m.name}</b> คงเหลือ {Math.max(0, avail)} {m.unit}
                          {avail < qty && ' — สต็อกไม่พอ (บันทึกได้ แต่สต็อกจะเหลือ 0)'}
                          {willDeduct ? ' · จะตัดสต็อกเมื่อบันทึก' : ' · ยังไม่ตัดสต็อกจนกว่าจะรับเงิน'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          ไม่พบ {it.model} · {it.color} · {it.size} ในคลังสินค้า ระบบจะยังไม่ตัดสต็อกให้สินค้านี้
                        </span>
                        <button type="button" className={btn.small} onClick={() => createStockItem(it)}>
                          <PackagePlus className="w-3.5 h-3.5" /> เพิ่มสินค้านี้เข้าคลัง
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-end gap-4 pt-1 text-sm">
            <span className="text-zinc-500">รวม {totalQty} ชิ้น</span>
            <span className="font-bold text-zinc-900">ยอดรวม ฿{fmtMoney(total)}</span>
          </div>
        </div>
      </Section>

      <Section title="3. ราคาและการชำระเงิน">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="ราคาขายรวม (บาท)" hint="คำนวณอัตโนมัติจากรายการสินค้า">
            <div className={`${inputCls} bg-zinc-50 font-bold text-zinc-900`}>{fmtMoney(total)}</div>
          </Field>
          <Field label="ต้นทุนสินค้า (บาท)">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.costPrice}
              onChange={(e) => set('costPrice', Number(e.target.value))}
            />
          </Field>
          <Field label="ชำระต้นทุนค่าสินค้าโดย">
            <Select value={f.costPaidBy || ''} onChange={(v) => set('costPaidBy', v)} options={options.costPaidBy} />
          </Field>
        </div>

        {isShopee && (
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={!!f.awaitingShopeePayout}
              onChange={(e) => set('awaitingShopeePayout', e.target.checked)}
            />
            รอชำระจากช้อปปี้ (ลูกค้าจ่ายผ่าน Shopee แล้ว รอ Shopee โอนเงิน)
          </label>
        )}

        {isNew ? (
          <div className="mt-3 rounded-lg border border-zinc-200 p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
              <input type="checkbox" checked={takeDeposit} onChange={(e) => setTakeDeposit(e.target.checked)} />
              รับเงินมัดจำตอนนี้
            </label>
            {takeDeposit && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="ยอดมัดจำ (บาท)" hint={total > 0 ? `เก็บหน้างานอีก ฿${fmtMoney(Math.max(0, total - depositAmount))}` : undefined}>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                  />
                </Field>
                <Field label="ช่องทางรับเงิน">
                  <Select value={depositMethod} onChange={setDepositMethod} options={options.paymentMethods} />
                </Field>
                <Field label="วันที่รับเงิน">
                  <DateInput value={depositDate} onChange={(v) => v && setDepositDate(v)} />
                </Field>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            การรับเงินเพิ่ม (เช่น ชำระหน้างาน) ทำได้ที่หน้ารายละเอียดออเดอร์ ปุ่ม "รับชำระเงิน"
          </p>
        )}
      </Section>

      <Section title="4. งานติดตั้ง / จัดส่ง">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="การดำเนินการ">
            <Select
              value={f.fulfillment}
              onChange={(v) => set('fulfillment', (v || 'ติดตั้ง') as FulfillmentType)}
              options={['ติดตั้ง', 'จัดส่ง']}
            />
          </Field>
          <Field label={f.fulfillment === 'ติดตั้ง' ? 'วันที่นัดติดตั้ง' : 'วันที่จัดส่ง'}>
            <DateInput clearable value={f.scheduledDate} onChange={(v) => set('scheduledDate', v || undefined)} />
          </Field>
          <Field label="ช่วงเวลา">
            <div className="flex items-center gap-2">
              <select
                className={inputCls}
                value={f.scheduledTimeStart || ''}
                onChange={(e) => set('scheduledTimeStart', e.target.value || undefined)}
                aria-label="เวลาเริ่ม"
              >
                <option value="">ตั้งแต่</option>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="text-zinc-500 text-sm shrink-0">ถึง</span>
              <select
                className={inputCls}
                value={f.scheduledTimeEnd || ''}
                onChange={(e) => set('scheduledTimeEnd', e.target.value || undefined)}
                aria-label="เวลาสิ้นสุด"
              >
                <option value="">ถึง</option>
                {TIME_OPTIONS.filter((t) => !f.scheduledTimeStart || t > f.scheduledTimeStart).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="สถานะคิว">
            <Select value={f.queueStatus} onChange={(v) => set('queueStatus', (v || 'ยังไม่ลงคิว') as QueueStatus)} options={QUEUE} />
          </Field>
          {f.fulfillment === 'ติดตั้ง' && (
            <>
              <Field label="เพดาน">
                <Select value={f.ceilingType || ''} onChange={(v) => set('ceilingType', v)} options={options.ceilingTypes} />
              </Field>
              <Field label="ช่างผู้รับผิดชอบ">
                <Select value={f.technician || ''} onChange={(v) => set('technician', v)} options={options.technicians} />
              </Field>
            </>
          )}
          <Field label={f.fulfillment === 'ติดตั้ง' ? 'พื้นที่ติดตั้ง / ที่อยู่' : 'ที่อยู่จัดส่ง'} className={f.fulfillment === 'ติดตั้ง' ? '' : 'sm:col-span-2'}>
            <input className={inputCls} value={f.installArea || ''} onChange={(e) => set('installArea', e.target.value)} placeholder="เช่น รัชดา 32" />
          </Field>
        </div>

        {f.fulfillment === 'ติดตั้ง' && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-600">
                รูปถ่ายพื้นที่หน้างาน ({f.sitePhotos?.length || 0}/{MAX_SITE_PHOTOS})
              </span>
              <label className={`${btn.small} cursor-pointer ${(f.sitePhotos?.length || 0) >= MAX_SITE_PHOTOS ? 'opacity-40 pointer-events-none' : ''}`}>
                {photoBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                แนบรูป
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {(f.sitePhotos?.length || 0) > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {f.sitePhotos!.map((src, i) => (
                  <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                    <img src={src} alt={`รูปหน้างาน ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => set('sitePhotos', f.sitePhotos!.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-rose-700 border border-zinc-200"
                      aria-label="ลบรูป"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400">ยังไม่มีรูป · ระบบย่อขนาดรูปให้อัตโนมัติก่อนบันทึก</p>
            )}
          </div>
        )}
      </Section>

      <Section title="5. สถานะสินค้าและการจัดส่ง">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="สถานะสินค้า">
            <Select value={f.productStatus} onChange={(v) => set('productStatus', v)} options={options.productStatuses} />
          </Field>
          <Field label="Tracking No.">
            <input className={inputCls} value={f.trackingNo || ''} onChange={(e) => set('trackingNo', e.target.value)} />
          </Field>
          {!isNew && (
            <Field label="วันที่ติดตั้ง/จัดส่งเสร็จ" hint="ใช้เริ่มนับวันรับประกัน">
              <DateInput clearable value={f.completedDate} onChange={(v) => set('completedDate', v || undefined)} />
            </Field>
          )}
          <Field label="หมายเหตุ" className="sm:col-span-3">
            <textarea rows={2} className={inputCls} value={f.note || ''} onChange={(e) => set('note', e.target.value)} />
          </Field>
        </div>
      </Section>
    </Modal>
  );
};
