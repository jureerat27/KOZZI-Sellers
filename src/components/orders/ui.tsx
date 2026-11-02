import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Tone, fmtDate } from '../../utils/orders';

export const inputCls =
  'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0068F0]/15 focus:border-[#0068F0] disabled:bg-zinc-50 disabled:text-zinc-400';

const toneCls: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  dark: 'bg-[#003BB3] text-white border-[#003BB3]',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const Badge: React.FC<{ tone?: Tone; children: React.ReactNode; className?: string }> = ({
  tone = 'neutral',
  children,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap ${toneCls[tone]} ${className}`}
  >
    {children}
  </span>
);

export function productStatusTone(status: string): Tone {
  if (status === 'ติดตั้งเรียบร้อยแล้ว' || status === 'จัดส่งแล้ว') return 'green';
  if (status === 'สั่งซื้อแล้ว') return 'amber';
  if (status === 'อยู่ที่ช่าง' || status === 'แพ็คเสร็จรอส่ง') return 'dark';
  return 'neutral';
}

export const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  required,
  hint,
  children,
  className = '',
}) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-semibold text-zinc-600 mb-1">
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </span>
    {children}
    {hint && <span className="block text-[11px] text-zinc-500 mt-1">{hint}</span>}
  </label>
);

export const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, options, placeholder = '— เลือก —', disabled }) => {
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="">{placeholder}</option>
      {list.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
};

export const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  action,
  children,
}) => (
  <section className="border border-zinc-200 rounded-xl bg-white">
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-100">
      <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
      {action}
    </div>
    <div className="p-4">{children}</div>
  </section>
);

export const Modal: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ title, subtitle, onClose, children, footer, wide }) => (
  <div className="fixed inset-0 z-50 bg-zinc-950/50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
    <div
      className={`bg-zinc-50 w-full ${wide ? 'sm:max-w-5xl' : 'sm:max-w-3xl'} sm:rounded-xl shadow-2xl flex flex-col min-h-screen sm:min-h-0 sm:max-h-[94vh]`}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4 bg-white border-b border-zinc-200 sm:rounded-t-xl sticky top-0 z-10">
        <div className="min-w-0">
          <div className="text-base font-bold text-zinc-900">{title}</div>
          {subtitle && <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500" aria-label="ปิด">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-white border-t border-zinc-200 sm:rounded-b-xl flex flex-wrap items-center justify-end gap-2 sticky bottom-0">
          {footer}
        </div>
      )}
    </div>
  </div>
);

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#0068F0] hover:bg-[#0052C7] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-sm font-semibold disabled:opacity-40',
  ghost: 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 text-zinc-700 text-xs font-semibold',
  danger:
    'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold',
  small:
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 text-xs font-semibold',
};

/** ช่องวันที่ แสดงเป็น วว/ดด/ปปปป (ค.ศ.) ไม่ขึ้นกับภาษาของเบราว์เซอร์ — ค่าที่เก็บยังเป็น YYYY-MM-DD */
export const DateInput: React.FC<{
  value?: string;
  onChange: (v: string) => void;
  clearable?: boolean;
  placeholder?: string;
}> = ({ value, onChange, clearable, placeholder = 'วว/ดด/ปปปป' }) => (
  <div className={`${inputCls} relative flex items-center justify-between gap-2 cursor-pointer`}>
    <span className={value ? 'text-zinc-900' : 'text-zinc-400'}>{value ? fmtDate(value) : placeholder}</span>
    <span className="flex items-center gap-1 relative z-20">
      {clearable && value && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
          }}
          className="p-0.5 rounded text-zinc-400 hover:text-zinc-700"
          aria-label="ล้างวันที่"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <Calendar className="w-4 h-4 text-zinc-500 pointer-events-none" />
    </span>
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => {
        try {
          (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        } catch {
          /* บางเบราว์เซอร์ไม่รองรับ showPicker — ใช้การแตะปกติ */
        }
      }}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
    />
  </div>
);

/* ---------- ส่วนประกอบหน้าตาร่วมทั้งระบบ ---------- */

/** หัวหน้า: ไอคอน + ชื่อหน้าใหญ่ + คำอธิบาย และปุ่มด้านขวา */
export const PageHeader: React.FC<{
  icon: React.ElementType;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ icon: Icon, title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-zinc-200/80 rounded-2xl px-5 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
    <div className="flex items-start gap-3.5 min-w-0">
      <Icon className="w-9 h-9 text-zinc-900 stroke-[1.75] shrink-0 mt-0.5" />
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-zinc-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </div>
);

export type StatTone = 'blue' | 'green' | 'orange' | 'red' | 'gray';
const statTone: Record<StatTone, { circle: string; icon: string; card: string; value: string; label: string }> = {
  blue: { circle: 'bg-[#EAF1FF]', icon: 'text-[#0068F0]', card: 'bg-white border-zinc-200/80', value: 'text-zinc-900', label: 'text-zinc-500' },
  green: { circle: 'bg-emerald-50', icon: 'text-emerald-600', card: 'bg-white border-zinc-200/80', value: 'text-zinc-900', label: 'text-zinc-500' },
  orange: { circle: 'bg-orange-100/70', icon: 'text-orange-500', card: 'bg-orange-50/60 border-orange-100', value: 'text-orange-500', label: 'text-orange-500' },
  red: { circle: 'bg-rose-50', icon: 'text-rose-600', card: 'bg-white border-zinc-200/80', value: 'text-rose-600', label: 'text-zinc-500' },
  gray: { circle: 'bg-zinc-100', icon: 'text-zinc-600', card: 'bg-white border-zinc-200/80', value: 'text-zinc-900', label: 'text-zinc-500' },
};

/** การ์ดตัวเลขสรุป: ไอคอนในวงกลมสีอ่อน + หัวข้อ + ตัวเลขใหญ่ */
export const StatCard: React.FC<{
  icon: React.ElementType;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: StatTone;
  note?: React.ReactNode;
}> = ({ icon: Icon, label, value, tone = 'blue', note }) => {
  const t = statTone[tone];
  return (
    <div className={`border rounded-2xl px-4 py-4 flex items-start gap-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${t.card}`}>
      <div className={`w-11 h-11 rounded-full ${t.circle} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${t.icon}`} />
      </div>
      <div className="min-w-0">
        <div className={`text-sm ${t.label} truncate`}>{label}</div>
        <div className={`text-2xl font-bold mt-1 leading-tight ${t.value}`}>{value}</div>
        {note && <div className="text-xs text-zinc-500 mt-1">{note}</div>}
      </div>
    </div>
  );
};

/** แท็บย่อยแบบปุ่มแยก: ปุ่มที่เลือกเป็นสีน้ำเงินทึบ */
export function TabButtons<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: React.ElementType; badge?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-colors ${
              on ? 'bg-[#003BB3] border-[#003BB3] text-white' : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            {Icon && <Icon className="w-[18px] h-[18px]" />}
            {t.label}
            {!!t.badge && (
              <span
                className={`min-w-6 h-6 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                  on ? 'bg-white text-[#003BB3]' : 'bg-[#EAF1FF] text-[#003BB3]'
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** แถบเลขหน้า: แสดง x - y จาก n รายการ + ปุ่มก่อนหน้า/ถัดไป */
export const Pager: React.FC<{ page: number; pageSize: number; total: number; onPage: (p: number) => void }> = ({
  page,
  pageSize,
  total,
  onPage,
}) => {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const cell = 'min-w-10 h-10 px-2 rounded-lg border text-sm font-semibold flex items-center justify-center';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <span className="text-sm text-zinc-500">
        แสดง {from} - {to} จาก {total} รายการ
      </span>
      <div className="flex items-center gap-1.5">
        <button className={`${cell} border-zinc-200 text-zinc-500 disabled:opacity-40`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="หน้าก่อน">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {nums.map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-zinc-400">…</span>}
            <button
              className={`${cell} ${n === page ? 'border-[#BFD4FF] bg-[#EAF1FF] text-[#003BB3]' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
              onClick={() => onPage(n)}
            >
              {n}
            </button>
          </React.Fragment>
        ))}
        <button className={`${cell} border-zinc-200 text-zinc-500 disabled:opacity-40`} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="หน้าถัดไป">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
