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
    <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl max-w-md w-full shadow-2xl border border-zinc-100 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-zinc-50 border-b border-zinc-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-700">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="font-bold text-base text-rose-900">ยืนยันการลบเอกสาร</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100/50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3.5 space-y-1.5 text-xs text-zinc-700">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">เลขที่เอกสาร:</span>
              <span className="font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-zinc-200">
                {document.docNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">ลูกค้า:</span>
              <span className="font-semibold text-zinc-800">{document.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">ยอดรวม:</span>
              <span className="font-bold text-rose-600">฿{formatCurrency(document.grandTotal)}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1 text-amber-900">
              <span>คำเตือนการลบข้อมูล:</span>
            </p>
            <p>
              การลบเอกสารจะลบออกจากระบบและคลาวด์ถาวร ไม่สามารถกู้คืนข้อมูลเอกสารนี้กลับมาได้อีก
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700">
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
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-zinc-400 font-mono"
              autoFocus
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold rounded-lg border border-zinc-200 transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs ${
              isConfirmed
                ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
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
