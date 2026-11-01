import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

/**
 * แทนที่ป๊อปอัพ alert() ของเบราว์เซอร์ด้วยการแจ้งเตือนในแอป
 * - สำเร็จ → กล่องข้อความกลางจอ กด "ตกลง" เพื่อปิด
 * - ข้อผิดพลาด → กล่องข้อความกลางจอ กด "ตกลง" เพื่อปิด
 * - ข้อความแนะนำทั่วไป (เช่น "กรุณากรอก…") → แถบแจ้งเตือนมุมขวาบน หายเองอัตโนมัติ
 * ทุกจุดที่เรียก alert() เดิมจะใช้รูปแบบใหม่นี้โดยไม่ต้องแก้ทีละจุด
 */

type Kind = 'success' | 'error' | 'info';
interface Note {
  id: number;
  kind: Kind;
  text: string;
  onClose?: () => void;
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

export function notify(message: unknown, opts?: { onClose?: () => void }) {
  const { kind, text } = classify(String(message ?? ''));
  const n: Note = { id: ++seq, kind, text, onClose: opts?.onClose };
  if (listener) listener(n);
  else pending.push(n);
}

if (typeof window !== 'undefined') {
  window.alert = (message?: unknown) => notify(message);
}

const dialogStyle = {
  success: { icon: CheckCircle2, title: 'สำเร็จ', iconCls: 'text-emerald-600', bg: 'bg-emerald-50' },
  error: { icon: AlertCircle, title: 'เกิดข้อผิดพลาด', iconCls: 'text-rose-600', bg: 'bg-rose-50' },
};

export const AppNotifier: React.FC = () => {
  const [toasts, setToasts] = useState<Note[]>([]);
  const [dialog, setDialog] = useState<Note | null>(null);

  useEffect(() => {
    const show = (n: Note) => {
      if (n.kind !== 'info') {
        setDialog(n);
        return;
      }
      setToasts((t) => [...t.slice(-2), n]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== n.id)), 5000);
    };
    listener = show;
    pending.splice(0).forEach(show);
    return () => {
      listener = null;
    };
  }, []);

  const closeDialog = () => {
    const cb = dialog?.onClose;
    setDialog(null);
    if (cb) cb();
  };

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        closeDialog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <>
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-[100] flex flex-col items-end gap-2 pointer-events-none no-print">
        {toasts.map((t) => {
          const Icon = Info;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto w-full sm:w-auto sm:min-w-[300px] sm:max-w-sm flex items-start gap-3 bg-white border border-zinc-200 shadow-lg rounded-xl px-4 py-3 animate-[toastIn_.18s_ease-out]"
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5 text-zinc-700" />
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
          onClick={closeDialog}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-xl shadow-2xl border border-zinc-200 p-5"
          >
            <div className="flex items-start gap-3">
              {(() => {
                const st = dialogStyle[dialog.kind as 'success' | 'error'];
                const DIcon = st.icon;
                return (
                  <div className={`w-10 h-10 rounded-full ${st.bg} flex items-center justify-center shrink-0`}>
                    <DIcon className={`w-6 h-6 ${st.iconCls}`} />
                  </div>
                );
              })()}
              <div className="flex-1">
                <h3 className="text-base font-bold text-zinc-900">{dialogStyle[dialog.kind as 'success' | 'error'].title}</h3>
                <p className="text-sm text-zinc-700 mt-1 leading-relaxed break-words">{dialog.text}</p>
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <button
                autoFocus
                onClick={closeDialog}
                className="px-5 py-2 rounded-lg bg-[#0068F0] hover:bg-[#0052C7] text-white text-sm font-semibold"
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
