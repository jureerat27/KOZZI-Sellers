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
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DocumentStatus, DocumentType, SalesDocument } from '../types';
import { formatCurrency, formatDate, formatMonthThai } from '../utils/format';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DocumentsViewProps {
  documents: SalesDocument[];
  onCreateDoc: (type: DocumentType) => void;
  onOpenDocDetail: (doc: SalesDocument) => void;
  onDeleteDoc: (docId: string) => void;
  onShowPromptPayQR: (amount: number, docNum: string) => void;
  onEditDoc?: (doc: SalesDocument) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  onCreateDoc,
  onOpenDocDetail,
  onDeleteDoc,
  onShowPromptPayQR,
  onEditDoc,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DocumentStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingDoc, setDeletingDoc] = useState<SalesDocument | null>(null);

  // เลือกเดือนที่จะแสดง: ค่าเริ่มต้นคือเดือนปัจจุบัน ('ALL' = ทุกเดือน)
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [month, setMonth] = useState<string>(currentMonth);
  const monthList = Array.from(
    new Set([currentMonth, ...documents.map((d) => (d.date || '').slice(0, 7)).filter((m) => /^\d{4}-\d{2}$/.test(m))])
  ).sort((a, b) => b.localeCompare(a));
  const shiftMonth = (step: number) => {
    const base = month === 'ALL' ? currentMonth : month;
    const [y, m] = base.split('-').map(Number);
    const d = new Date(y, m - 1 + step, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const monthDocs = month === 'ALL' ? documents : documents.filter((d) => (d.date || '').startsWith(month));
  const typeCount = (t: DocumentType) => monthDocs.filter((d) => d.type === t).length;

  const filteredDocs = monthDocs.filter((doc) => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-zinc-200/80 px-5 py-5 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
            <FileText className="w-8 h-8 stroke-[1.75] shrink-0" />
            <span>ระบบจัดการเอกสารการขาย</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1 sm:ml-11">
            ออกใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จรับเงินในนามบุคคลมินิมอล
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onCreateDoc('QUOTATION')}
            className="px-5 py-2.5 bg-[#0068F0] hover:bg-[#0052C7] text-white text-sm font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
          >
            <FilePlus className="w-4 h-4" />
            <span>+ ใบเสนอราคา</span>
          </button>

          <button
            onClick={() => onCreateDoc('INVOICE')}
            className="px-5 py-2.5 bg-[#0068F0] hover:bg-[#0052C7] text-white text-sm font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>+ ใบแจ้งหนี้</span>
          </button>

          <button
            onClick={() => onCreateDoc('RECEIPT')}
            className="px-5 py-2.5 bg-[#0068F0] hover:bg-[#0052C7] text-white text-sm font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            <span>+ ใบเสร็จ</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white border border-zinc-200/80 p-4 rounded-2xl space-y-3 shadow-xs">
        {/* Month selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftMonth(-1)}
              className="w-10 h-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-600"
              aria-label="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 bg-white border border-zinc-200 rounded-lg pl-9 pr-8 text-sm font-bold text-zinc-900 focus:outline-none focus:border-[#0068F0]"
              >
                {(month === 'ALL' || monthList.includes(month) ? monthList : [month, ...monthList]).map((m) => (
                  <option key={m} value={m}>
                    {formatMonthThai(m)}
                    {m === currentMonth ? ' (เดือนนี้)' : ''}
                  </option>
                ))}
                <option value="ALL">ทุกเดือน</option>
              </select>
            </div>
            <button
              onClick={() => shiftMonth(1)}
              className="w-10 h-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-600"
              aria-label="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {month !== currentMonth && (
              <button
                onClick={() => setMonth(currentMonth)}
                className="ml-1 px-3 h-10 rounded-lg text-sm font-semibold text-[#003BB3] hover:bg-[#EAF1FF]"
              >
                กลับเดือนนี้
              </button>
            )}
          </div>
          <div className="text-sm text-zinc-600">
            รวม <b className="text-zinc-900">{filteredDocs.length}</b> ใบ ·{' '}
            <b className="text-zinc-900">฿{formatCurrency(filteredDocs.reduce((sum, d) => sum + (Number(d.grandTotal) || 0), 0))}</b>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-[#003BB3] border-[#003BB3] text-white'
                  : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              ทั้งหมด ({monthDocs.length})
            </button>
            <button
              onClick={() => setTypeFilter('QUOTATION')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-all ${
                typeFilter === 'QUOTATION'
                  ? 'bg-[#003BB3] border-[#003BB3] text-white'
                  : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              ใบเสนอราคา ({typeCount('QUOTATION')})
            </button>
            <button
              onClick={() => setTypeFilter('INVOICE')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-all ${
                typeFilter === 'INVOICE'
                  ? 'bg-[#003BB3] border-[#003BB3] text-white'
                  : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              ใบแจ้งหนี้ ({typeCount('INVOICE')})
            </button>
            <button
              onClick={() => setTypeFilter('RECEIPT')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap border transition-all ${
                typeFilter === 'RECEIPT'
                  ? 'bg-[#003BB3] border-[#003BB3] text-white'
                  : 'bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              ใบเสร็จรับเงิน ({typeCount('RECEIPT')})
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

      {/* Documents List: ตารางแถวละบรรทัดเดียว */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center text-zinc-400 text-xs shadow-xs">
          {month !== 'ALL' && monthDocs.length === 0 ? `ยังไม่มีเอกสารในเดือน${formatMonthThai(month)}` : 'ไม่พบเอกสารตามเงื่อนไขที่ค้นหา'}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[11px] font-semibold text-zinc-500 whitespace-nowrap">
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">วันที่</th>
                <th className="px-3 py-2.5">เลขที่เอกสาร</th>
                <th className="px-3 py-2.5">ประเภท</th>
                <th className="px-3 py-2.5">สถานะ</th>
                <th className="px-3 py-2.5">ลูกค้า</th>
                <th className="px-3 py-2.5 text-center">รายการ</th>
                <th className="px-3 py-2.5 text-right">ยอดรวมทั้งสิ้น</th>
                <th className="px-3 py-2.5 text-center sticky right-0 bg-zinc-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredDocs.map((doc, idx) => {
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
                  <tr
                    key={doc.id}
                    onClick={() => onOpenDocDetail(doc)}
                    className="group cursor-pointer hover:bg-zinc-50 text-xs text-zinc-800 whitespace-nowrap"
                  >
                    <td className="px-3 py-2.5 text-zinc-400">{idx + 1}</td>
                    <td className="px-3 py-2.5">{formatDate(doc.date)}</td>
                    <td className="px-3 py-2.5 font-bold text-zinc-900">
                      {doc.docNumber}
                      {doc.parentQuotationDocNumber && (
                        <div className="text-[10px] text-zinc-400 font-normal font-mono">QT: {doc.parentQuotationDocNumber}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${typeBadgeColor}`}>{doc.type}</span>
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
                            {doc.paymentStage === 'DEPOSIT' ? 'เงินมัดจำ' : doc.paymentStage === 'BALANCE' ? 'ยอดคงเหลือ' : 'เต็มจำนวน'}
                          </span>
                        )}
                        {doc.type === 'QUOTATION' && doc.paymentTermType === 'DEPOSIT' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md border font-bold bg-amber-50 text-amber-700 border-amber-200">
                            มัดจำ {doc.depositPercent ? `${doc.depositPercent}%` : `฿${formatCurrency(doc.depositAmount || 0)}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${statusBg}`}>{statusText}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold">{doc.customerName}</span>
                      {doc.customerTaxId ? (
                        <span className="font-mono text-zinc-500 text-[11px] ml-1.5">(Tax: {doc.customerTaxId})</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-center text-zinc-600">{doc.items.length}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-zinc-900 text-sm">฿{formatCurrency(doc.grandTotal)}</td>
                    <td className="px-3 py-1.5 sticky right-0 bg-white group-hover:bg-zinc-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenDocDetail(doc)}
                          className="px-2 py-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-md text-[11px] font-bold border border-zinc-200 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดู/พิมพ์</span>
                        </button>
                        {onEditDoc && (
                          <button
                            onClick={() => onEditDoc(doc)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[11px] font-bold border border-amber-200 flex items-center gap-1"
                            title="แก้ไขเอกสาร"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>
                        )}
                        <button
                          onClick={() => onShowPromptPayQR(doc.grandTotal, doc.docNumber)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200"
                          title="PromptPay QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingDoc(doc)}
                          className="p-1.5 bg-zinc-50 hover:bg-zinc-100 text-rose-600 rounded-md border border-zinc-200"
                          title="ลบเอกสาร"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
