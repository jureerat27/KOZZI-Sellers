import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';

export type ExportKind = 'orders' | 'documents' | 'expenses' | 'products' | 'customers';

export const EXPORT_OPTIONS: { kind: ExportKind; label: string }[] = [
  { kind: 'orders', label: 'ออเดอร์ & งานติดตั้ง' },
  { kind: 'documents', label: 'เอกสารขาย' },
  { kind: 'expenses', label: 'รายจ่าย' },
  { kind: 'products', label: 'สินค้าคงคลัง' },
  { kind: 'customers', label: 'ลูกค้า' },
];

/** ปุ่ม Export CSV บนแถบด้านบน: กดแล้วเลือกข้อมูลที่ต้องการดาวน์โหลด */
export const ExportCsvMenu: React.FC<{ onExport: (kind: ExportKind) => void }> = ({ onExport }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs font-extrabold transition-all shadow-2xs"
        title="ดาวน์โหลดข้อมูลเป็นไฟล์ CSV"
      >
        <Download className="w-4 h-4 text-[#15803D]" />
        <span className="hidden sm:inline">Export CSV</span>
        <ChevronDown className="w-3.5 h-3.5 hidden sm:inline" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 bg-white border border-zinc-200 rounded-lg shadow-lg p-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-500">ดาวน์โหลดไฟล์ CSV (เปิดด้วย Excel ได้)</div>
          {EXPORT_OPTIONS.map((o) => (
            <button
              key={o.kind}
              onClick={() => {
                setOpen(false);
                onExport(o.kind);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-zinc-800 rounded-md hover:bg-zinc-50"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
