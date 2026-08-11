import React, { useState } from 'react';
import { ShieldAlert, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemCount?: number;
  confirmWord?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  description,
  itemCount,
  confirmWord = 'confirm',
  onConfirm,
  onClose,
}) => {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const isConfirmed = inputText.trim().toLowerCase() === confirmWord.toLowerCase();

  const handleConfirm = () => {
    if (!isConfirmed) return;
    onConfirm();
    setInputText('');
    onClose();
  };

  const handleClose = () => {
    setInputText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>{title}</span>
            {itemCount !== undefined && (
              <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-700 font-bold rounded-full">
                {itemCount} รายการ
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/70 p-3 rounded-xl border border-rose-100 text-rose-900 font-medium">
            ⚠️ {description}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            พิมพ์คำว่า <span className="text-rose-600 underline font-mono font-black px-1.5 py-0.5 bg-rose-100 rounded select-all">{confirmWord}</span> เพื่อยืนยันการลบ:
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`กรอก '${confirmWord}' ที่นี่...`}
            className="w-full text-sm font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isConfirmed) {
                handleConfirm();
              }
            }}
          />
          {inputText.length > 0 && !isConfirmed && (
            <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
              <span>⚠️ คำที่กรอกยังไม่ถูกต้อง (ต้องเป็นคำว่า '{confirmWord}')</span>
            </p>
          )}
          {isConfirmed && (
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <span>✅ พิมพ์ถูกต้องแล้ว สามารถกดปุ่มยืนยันลบได้</span>
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isConfirmed
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>ยืนยันการลบ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
