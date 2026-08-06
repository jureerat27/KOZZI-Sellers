import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  QrCode,
  Send,
  Trash2,
  Receipt,
  FilePlus,
  CheckCircle,
  Edit3,
} from 'lucide-react';
import { DocumentStatus, DocumentType, SalesDocument } from '../types';
import { formatCurrency } from '../utils/format';

interface DocumentsViewProps {
  documents: SalesDocument[];
  onCreateDoc: (type: DocumentType) => void;
  onOpenDocDetail: (doc: SalesDocument) => void;
  onDeleteDoc: (docId: string) => void;
  onShowPromptPayQR: (amount: number, docNum: string) => void;
  onSendLineNotify: (message: string) => void;
  onEditDoc?: (doc: SalesDocument) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onCreateDoc,
  onOpenDocDetail,
  onDeleteDoc,
  onShowPromptPayQR,
  onSendLineNotify,
  onEditDoc,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = documents.filter((doc) => {
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    const matchesSearch =
      doc.docNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customerPhone.includes(searchTerm);

    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5 pb-20">
      {/* Header & New Document Quick Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 border border-rose-100 p-4 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="text-xl">📑</span>
            <span>ระบบจัดการเอกสารการขาย</span>
          </h1>
          <p className="text-xs text-slate-500">
            ออกใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จรับเงินในนามบุคคลมินิมอล 🌸
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onCreateDoc('QUOTATION')}
            className="px-3.5 py-2 bg-sky-400 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>+ ใบเสนอราคา 📄</span>
          </button>

          <button
            onClick={() => onCreateDoc('INVOICE')}
            className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>+ ใบแจ้งหนี้ 🧾</span>
          </button>

          <button
            onClick={() => onCreateDoc('RECEIPT')}
            className="px-3.5 py-2 bg-pink-400 hover:bg-pink-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            <span>+ ใบเสร็จ 💳</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white/90 border border-rose-100 p-4 rounded-2xl space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 bg-pink-50/60 p-1 rounded-xl w-full sm:w-auto overflow-x-auto border border-pink-100">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-white text-pink-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({documents.length}) 🌸
            </button>
            <button
              onClick={() => setTypeFilter('QUOTATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'QUOTATION'
                  ? 'bg-sky-400 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ใบเสนอราคา 📄
            </button>
            <button
              onClick={() => setTypeFilter('INVOICE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'INVOICE'
                  ? 'bg-emerald-400 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ใบแจ้งหนี้ 🧾
            </button>
            <button
              onClick={() => setTypeFilter('RECEIPT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'RECEIPT'
                  ? 'bg-pink-400 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ใบเสร็จรับเงิน 💳
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-pink-400" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่เอกสาร / ลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-pink-50/30 border border-pink-200 text-xs text-slate-800 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-pink-400"
            />
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2.5">
        {filteredDocs.length === 0 ? (
          <div className="bg-white/90 border border-rose-100 rounded-2xl p-10 text-center text-slate-400 text-xs shadow-xs">
            🌸 ไม่พบเอกสารตามเงื่อนไขที่ค้นหา
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const statusBg =
              doc.status === 'PAID'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : doc.status === 'SENT' || doc.status === 'APPROVED'
                ? 'bg-sky-100 text-sky-800 border-sky-200'
                : 'bg-slate-100 text-slate-600 border-slate-200';

            const statusText =
              doc.status === 'PAID'
                ? 'ชำระแล้ว 🟢'
                : doc.status === 'SENT'
                ? 'ส่งแล้ว 🔵'
                : doc.status === 'APPROVED'
                ? 'อนุมัติแล้ว ✨'
                : 'ฉบับร่าง 📝';

            const typeBadgeColor =
              doc.type === 'QUOTATION'
                ? 'bg-sky-100 text-sky-800 border-sky-200'
                : doc.type === 'INVOICE'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-pink-100 text-pink-800 border-pink-200';

            return (
              <div
                key={doc.id}
                className="bg-white/90 border border-rose-100 hover:border-pink-200 p-4 rounded-2xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5 text-pink-500" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800">{doc.docNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${typeBadgeColor}`}>
                        {doc.type}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusBg}`}>
                        {statusText}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-semibold mt-1">
                      👤 ลูกค้า: {doc.customerName}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      📅 ออกเมื่อ: {doc.date} • 📦 รายการสินค้า ({doc.items.length} รายการ)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-rose-50">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 block">ยอดรวมทั้งสิ้น</span>
                    <span className="font-extrabold text-pink-600 text-base">
                      ฿{formatCurrency(doc.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenDocDetail(doc)}
                      className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold border border-pink-200 flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดู/พิมพ์ 🖨️</span>
                    </button>

                    {onEditDoc && (
                      <button
                        onClick={() => onEditDoc(doc)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 flex items-center gap-1 transition-all"
                        title="แก้ไขเอกสาร"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                    )}

                    <button
                      onClick={() => onShowPromptPayQR(doc.grandTotal, doc.docNumber)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition-all"
                      title="PromptPay QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteDoc(doc.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-all"
                      title="ลบเอกสาร"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
