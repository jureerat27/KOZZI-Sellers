import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImagePlus, Loader2, PackagePlus, Trash2 } from 'lucide-react';
import { FulfillmentType, Order, OrderOptions, OrderPayment, Product, QueueStatus } from '../../types';
import {
  MAX_SITE_PHOTOS,
  addYears,
  compressImage,
  findStockProduct,
  fmtMoney,
  nextOrderNumber,
  todayISO,
  warrantyYearsFor,
} from '../../utils/orders';
import { Field, Modal, Section, Select, btn, inputCls } from './ui';

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

function blankOrder(orders: Order[], options: OrderOptions): Order {
  const date = todayISO();
  const now = new Date().toISOString();
  return {
    id: `ord-${Date.now()}`,
    orderNumber: nextOrderNumber(orders, date),
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
  const matched = useMemo(() => findStockProduct(products, f), [products, f.model, f.color, f.size]);
  // สต็อกที่ใช้ได้ = คงเหลือ + จำนวนที่ออเดอร์นี้ตัดไปแล้ว (กรณีแก้ไข)
  const available = matched
    ? matched.stock + (order?.stockDeducted && order.productId === matched.id ? order.quantity : 0)
    : 0;

  const changeDate = (d: string) => {
    setF((p) => ({ ...p, orderDate: d, orderNumber: isNew && !numberTouched ? nextOrderNumber(orders, d) : p.orderNumber }));
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

  const createStockItem = () => {
    const p: Product = {
      id: `prod-${Date.now()}`,
      sku: `${f.model}-${f.color}-${f.size}`.replace(/\s+/g, ''),
      name: `${f.model} ${f.color} ${f.size}`,
      category: f.productLine || 'ราวตากผ้า',
      price: Number(f.price) || 0,
      costPrice: Number(f.costPrice) || 0,
      stock: 0,
      minStock: 1,
      unit: 'ชุด',
      productLine: f.productLine || undefined,
      model: f.model,
      color: f.color,
      size: f.size,
      updatedAt: new Date().toISOString(),
    };
    onCreateStockProduct(p);
  };

  const submit = async () => {
    setError('');
    const missing = [
      !f.customerName.trim() && 'ชื่อลูกค้า',
      !f.productLine && 'รุ่น',
      !f.model && 'MODEL',
      !f.color && 'สี',
      !f.size && 'ขนาด',
    ].filter(Boolean);
    if (missing.length) {
      setError(`กรุณากรอก: ${missing.join(', ')}`);
      return;
    }
    if (!f.orderNumber.trim()) {
      setError('กรุณากรอกเลขออเดอร์');
      return;
    }
    if (orders.some((o) => o.id !== f.id && o.orderNumber === f.orderNumber.trim())) {
      setError(`เลขออเดอร์ ${f.orderNumber} มีอยู่แล้ว`);
      return;
    }

    let payments: OrderPayment[] = f.payments || [];
    if (isNew && takeDeposit && Number(depositAmount) > 0) {
      const full = Number(f.price) > 0 && Number(depositAmount) >= Number(f.price);
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

    const years = warrantyYearsFor(f, options);
    const saved: Order = {
      ...f,
      orderNumber: f.orderNumber.trim(),
      customerName: f.customerName.trim(),
      quantity: Math.max(1, Number(f.quantity) || 1),
      price: Number(f.price) || 0,
      costPrice: Number(f.costPrice) || 0,
      payments,
      productId: matched?.id,
      queueStatus: f.queueStatus === 'ยังไม่ลงคิว' && f.scheduledDate ? 'ลงคิวแล้ว' : f.queueStatus,
      warrantyEndDate: f.completedDate && years > 0 ? addYears(f.completedDate, years) : undefined,
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
            <input type="date" className={inputCls} value={f.orderDate} onChange={(e) => changeDate(e.target.value)} />
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
          <Field label="ช่องทางการขาย" required>
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
        </div>
      </Section>

      <Section title="2. สินค้า">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Field label="รุ่น" required>
            <Select value={f.productLine} onChange={(v) => set('productLine', v)} options={options.productLines.map((l) => l.name)} />
          </Field>
          <Field label="MODEL" required>
            <Select value={f.model} onChange={(v) => set('model', v)} options={options.models} />
          </Field>
          <Field label="สี" required>
            <Select value={f.color} onChange={(v) => set('color', v)} options={options.colors} />
          </Field>
          <Field label="ขนาด" required>
            <Select value={f.size} onChange={(v) => set('size', v)} options={options.sizes} />
          </Field>
          <Field label="จำนวน">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={f.quantity}
              onChange={(e) => set('quantity', Number(e.target.value))}
            />
          </Field>
        </div>
        {f.model && f.color && f.size && (
          <div className="mt-3 text-xs">
            {matched ? (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  available >= f.quantity ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {available >= f.quantity ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>
                  ในคลัง: <b>{matched.name}</b> คงเหลือ {available} {matched.unit}
                  {available < f.quantity && ' — สต็อกไม่พอ (บันทึกได้ แต่สต็อกจะเหลือ 0)'}
                  {willDeduct ? ' · จะตัดสต็อกเมื่อบันทึก' : ' · ยังไม่ตัดสต็อกจนกว่าจะรับเงิน'}
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span>ไม่พบ {f.model} · {f.color} · {f.size} ในคลังสินค้า ระบบจะยังไม่ตัดสต็อกให้ออเดอร์นี้</span>
                <button type="button" className={btn.small} onClick={createStockItem}>
                  <PackagePlus className="w-3.5 h-3.5" /> เพิ่มสินค้านี้เข้าคลัง
                </button>
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="3. ราคาและการชำระเงิน">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="ราคาขาย (บาท)">
            <input type="number" min={0} className={inputCls} value={f.price} onChange={(e) => set('price', Number(e.target.value))} />
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
                <Field label="ยอดมัดจำ (บาท)" hint={f.price > 0 ? `เก็บหน้างานอีก ฿${fmtMoney(Math.max(0, f.price - depositAmount))}` : undefined}>
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
                  <input type="date" className={inputCls} value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
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
            <input
              type="date"
              className={inputCls}
              value={f.scheduledDate || ''}
              onChange={(e) => set('scheduledDate', e.target.value)}
            />
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
              <input
                type="date"
                className={inputCls}
                value={f.completedDate || ''}
                onChange={(e) => set('completedDate', e.target.value || undefined)}
              />
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
