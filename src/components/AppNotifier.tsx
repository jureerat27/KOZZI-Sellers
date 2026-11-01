import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

/**
 * แทนที่ป๊อปอัพ alert() ของเบราว์เซอร์ด้วยการแจ้งเตือนในแอป
 * - สำเร็จ / ข้อมูลทั่วไป → แถบแจ้งเตือนมุมขวาบน หายเองอัตโนมัติ
 * - ข้อผิดพลาด → กล่องข้อความกลางจอ กด "ตกลง" เพื่อปิด
 * ทุกจุดที่เรียก alert() เดิมจะใช้รูปแบบใหม่นี้โดยไม่ต้องแก้ทีละจุด
 */

type Kind = 'success' | 'error' | 'info';
interface Note {
  id: number;
  kind: Kind;
  text: string;
}

let listener: ((n: Note) => void) | null = null;
const pending: Note[] = [];
let seq = 0;

const EMOJI = /^[\s✅❌⚠️✨ℹ]+/u;

function classify(raw: string): { kind: Kind; text: string } {
  const text = raw.replace(EMOJI, '').trim();
  if (/^❌/.test(raw) || /ผิดพลาด|ไม่สามารถ|ล้มเหลว|ไม่ถูกต้อง|ไม่สำเร็จ|error/i.test(text)) return { kind: 'error', text };
  if (/^✅/.test(raw) || /เรียบร้อย|สำเร็จ/.test(text)) return { kind: 'success', text };
  return { kind: 'info', text };
}

export function notify(message: unknown) {
  const { kind, text } = classify(String(message ?? ''));
  const n: Note = { id: ++seq, kind, text };
  if (listener) listener(n);
  else pending.push(n);
}

if (typeof window !== 'undefined') {
  window.alert = (message?: unknown) => notify(message);
}

const toastStyle: Record<Exclude<Kind, 'error'>, { icon: React.ElementType; cls: string }> = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600' },
  info: { icon: Info, cls: 'text-zinc-700' },
};

export const AppNotifier: React.FC = () => {
  const [toasts, setToasts] = useState<Note[]>([]);
  const [dialog, setDialog] = useState<Note | null>(null);

  useEffect(() => {
    const show = (n: Note) => {
      if (n.kind === 'error') {
        setDialog(n);
        return;
      }
      setToasts((t) => [...t.slice(-2), n]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), n.kind === 'success' ? 3000 : 5000);
    };
    listener = show;
    pending.splice(0).forEach(show);
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') setDialog(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <>
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col items-end gap-2 pointer-events-none no-print">
        {toasts.map((t) => {
          const s = toastStyle[t.kind as 'success' | 'info'];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto w-full sm:w-auto sm:min-w-[300px] sm:max-w-sm flex items-start gap-3 bg-white border border-zinc-200 shadow-lg rounded-xl px-4 py-3 animate-[toastIn_.18s_ease-out]"
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.cls}`} />
              <p className="text-sm text-zinc-800 flex-1 leading-relaxed">{t.text}</p>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="p-0.5 rounded text-zinc-400 hover:text-zinc-700"
                aria-label="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <div
          className="fixed inset-0 z-[110] bg-zinc-950/40 flex items-center justify-center p-4 no-print"
          onClick={() => setDialog(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-xl shadow-2xl border border-zinc-200 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-zinc-900">เกิดข้อผิดพลาด</h3>
                <p className="text-sm text-zinc-700 mt-1 leading-relaxed break-words">{dialog.text}</p>
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <button
                autoFocus
                onClick={() => setDialog(null)}
                className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
