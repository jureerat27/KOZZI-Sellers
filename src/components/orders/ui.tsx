import React from 'react';
import { Calendar, X } from 'lucide-react';
import { Tone, fmtDate } from '../../utils/orders';

export const inputCls =
  'w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0068F0]/15 focus:border-[#0068F0] disabled:bg-zinc-50 disabled:text-zinc-400';

const toneCls: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  dark: 'bg-zinc-900 text-white border-zinc-900',
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
