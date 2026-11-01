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
import { formatCurrency, formatDate } from '../utils/format';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
  const [deletingDoc, setDeletingDoc] = useState<SalesDocument | null>(null);

  const filteredDocs = documents.filter((doc) => {
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      doc.docNumber.toLowerCase().includes(term) ||
      doc.customerName.toLowerCase().includes(term) ||
      doc.customerPhone.includes(term) ||
      (doc.customerTaxId && doc.customerTaxId.toLowerCase().includes(term));

    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5 pb-20">
      {/* Header & New Document Quick Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 border border-zinc-100 p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-base font-bold text-zinc-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <span>ระบบจัดการเอกสารการขาย</span>
          </h1>
          <p className="text-xs text-zinc-500">
            ออกใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จรับเงินในนามบุคคลมินิมอล
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onCreateDoc('QUOTATION')}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>+ ใบเสนอราคา</span>
          </button>

          <button
            onClick={() => onCreateDoc('INVOICE')}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>+ ใบแจ้งหนี้</span>
          </button>

          <button
            onClick={() => onCreateDoc('RECEIPT')}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            <span>+ ใบเสร็จ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white/90 border border-zinc-100 p-4 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-50/60 p-1 rounded-lg w-full sm:w-auto overflow-x-auto border border-zinc-100">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              ทั้งหมด ({documents.length})
            </button>
            <button
              onClick={() => setTypeFilter('QUOTATION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'QUOTATION'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              ใบเสนอราคา
            </button>
            <button
              onClick={() => setTypeFilter('INVOICE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'INVOICE'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              ใบแจ้งหนี้
            </button>
            <button
              onClick={() => setTypeFilter('RECEIPT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === 'RECEIPT'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              ใบเสร็จรับเงิน
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่เอกสาร / ลูกค้า / เลขผู้เสียภาษี..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50/30 border border-zinc-200 text-xs text-zinc-800 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2.5">
        {filteredDocs.length === 0 ? (
          <div className="bg-white/90 border border-zinc-100 rounded-xl p-10 text-center text-zinc-400 text-xs shadow-xs">
            ไม่พบเอกสารตามเงื่อนไขที่ค้นหา
          </div>
        ) : (
          filteredDocs.map((doc) => {
            let statusBg = 'bg-zinc-100 text-zinc-600 border-zinc-200';
            let statusText = 'ฉบับร่าง';

            if (doc.status === 'PAID') {
              statusBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
              statusText = 'ชำระแล้ว';
            } else if (doc.status === 'DEPOSIT_PAID') {
              statusBg = 'bg-zinc-100 text-zinc-950 border-zinc-200';
              statusText = 'ชำระมัดจำแล้ว';
            } else if (doc.status === 'PENDING_DEPOSIT') {
              statusBg = 'bg-amber-100 text-amber-800 border-amber-200';
              statusText = 'รอมัดจำ ⏳';
            } else if (doc.status === 'PARTIALLY_PAID') {
              statusBg = 'bg-yellow-100 text-yellow-800 border-yellow-200';
              statusText = 'ชำระบางส่วน';
            } else if (doc.status === 'SENT') {
              statusBg = 'bg-zinc-100 text-zinc-950 border-zinc-200';
              statusText = 'ส่งแล้ว';
            } else if (doc.status === 'APPROVED') {
              statusBg = 'bg-zinc-100 text-zinc-950 border-zinc-200';
              statusText = 'อนุมัติแล้ว';
            }

            const typeBadgeColor =
              doc.type === 'QUOTATION'
                ? 'bg-zinc-100 text-zinc-950 border-zinc-200'
                : doc.type === 'INVOICE'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-zinc-100 text-zinc-950 border-zinc-200';

            return (
              <div
                key={doc.id}
                className="bg-white/90 border border-zinc-100 hover:border-zinc-200 p-4 rounded-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-800 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5 text-zinc-800" />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-zinc-800">{doc.docNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${typeBadgeColor}`}>
                        {doc.type}
                      </span>
                      {doc.paymentStage && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-bold ${
                            doc.paymentStage === 'DEPOSIT'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : doc.paymentStage === 'BALANCE'
                              ? 'bg-zinc-50 text-zinc-900 border-zinc-200'
                              : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          {doc.paymentStage === 'DEPOSIT'
                            ? 'เงินมัดจำ'
                            : doc.paymentStage === 'BALANCE'
                            ? 'ยอดคงเหลือ'
                            : 'เต็มจำนวน'}
                        </span>
                      )}
                      {doc.type === 'QUOTATION' && doc.paymentTermType === 'DEPOSIT' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md border font-bold bg-amber-50 text-amber-700 border-amber-200">
                          มัดจำ {doc.depositPercent ? `${doc.depositPercent}%` : `฿${formatCurrency(doc.depositAmount || 0)}`}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusBg}`}>
                        {statusText}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-700 font-semibold mt-1">
                      ลูกค้า: {doc.customerName}
                      {doc.customerTaxId ? (
                        <span className="font-normal font-mono text-zinc-500 text-[11px] ml-1.5">
                          (Tax: {doc.customerTaxId})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>ออกเมื่อ: {formatDate(doc.date)}</span>
                      <span>• {doc.items.length} รายการ</span>
                      {doc.parentQuotationDocNumber && (
                        <span className="text-zinc-400 font-mono text-[10px] bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200">
                          QT: {doc.parentQuotationDocNumber}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-zinc-50">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-zinc-500 block">ยอดรวมทั้งสิ้น</span>
                    <span className="font-extrabold text-zinc-900 text-base">
                      ฿{formatCurrency(doc.grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenDocDetail(doc)}
                      className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-lg text-xs font-bold border border-zinc-200 flex items-center gap-1 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ดู/พิมพ์</span>
                    </button>

                    {onEditDoc && (
                      <button
                        onClick={() => onEditDoc(doc)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 flex items-center gap-1 transition-all"
                        title="แก้ไขเอกสาร"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                    )}

                    <button
                      onClick={() => onShowPromptPayQR(doc.grandTotal, doc.docNumber)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-all"
                      title="PromptPay QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingDoc(doc)}
                      className="p-2 bg-zinc-50 hover:bg-zinc-100 text-rose-600 rounded-lg border border-zinc-200 transition-all"
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

      {/* Confirmation Modal for Document Deletion */}
      <ConfirmDeleteModal
        isOpen={!!deletingDoc}
        document={deletingDoc}
        onClose={() => setDeletingDoc(null)}
        onConfirmDelete={(docId) => {
          onDeleteDoc(docId);
          setDeletingDoc(null);
        }}
      />
    </div>
  );
};
