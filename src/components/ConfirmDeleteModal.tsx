import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { SalesDocument } from '../types';
import { formatCurrency } from '../utils/format';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  document: SalesDocument | null;
  onClose: () => void;
  onConfirmDelete: (docId: string) => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  document,
  onClose,
  onConfirmDelete,
}) => {
  const [confirmInput, setConfirmInput] = useState('');

  if (!isOpen || !document) return null;

  const isConfirmed = confirmInput.trim().toLowerCase() === 'confirm';

  const handleClose = () => {
    setConfirmInput('');
    onClose();
  };

  const handleConfirm = () => {
    if (!isConfirmed) return;
    onConfirmDelete(document.id);
    setConfirmInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-100 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="p-2 bg-rose-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="font-bold text-base text-rose-900">ยืนยันการลบเอกสาร</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-rose-100/50 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">เลขที่เอกสาร:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {document.docNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ลูกค้า:</span>
              <span className="font-semibold text-slate-800">{document.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">ยอดรวม:</span>
              <span className="font-bold text-rose-600">฿{formatCurrency(document.grandTotal)}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1 text-amber-900">
              <span>⚠️ คำเตือนการลบข้อมูล:</span>
            </p>
            <p>
              การลบเอกสารจะลบออกจากระบบและคลาวด์ถาวร ไม่สามารถกู้คืนข้อมูลเอกสารนี้กลับมาได้อีก
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              พิมพ์คำว่า <span className="text-rose-600 font-extrabold underline">Confirm</span> เพื่อยืนยันการลบ:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed) handleConfirm();
              }}
              placeholder="พิมพ์ Confirm ที่นี่..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-slate-400 font-mono"
              autoFocus
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
              isConfirmed
                ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ยืนยันลบเอกสารถาวร</span>
          </button>
        </div>
      </div>
    </div>
  );
};
