import React, { useEffect, useState } from 'react';
import {
  X,
  Printer,
  Download,
  Send,
  Copy,
  QrCode,
  CheckCircle,
  FileCheck,
  Upload,
  ArrowRight,
  Share2,
  Edit3,
  CreditCard,
  Building2,
  Banknote,
  Trash2,
  FileText,
  Receipt,
  Layers,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { PaymentRecord, PaymentStage, SalesDocument, SellerProfile } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { exportElementToPdf, printOnlyElement } from '../utils/pdf';
import { formatDocumentForLine } from '../utils/line';
import { formatCurrency, formatDate } from '../utils/format';
import { DatePicker } from './DatePicker';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { DocumentHeader } from './DocumentHeader';
import { notify } from './AppNotifier';

interface DocumentDetailViewProps {
  doc: SalesDocument;
  documents?: SalesDocument[];
  seller: SellerProfile;
  customers?: any[];
  onClose: () => void;
  onSelectDoc?: (doc: SalesDocument) => void;
  onUpdateStatus: (docId: string, newStatus: any, paymentSlipUrl?: string) => void;
  onConvertDoc: (doc: SalesDocument, targetType: 'INVOICE' | 'RECEIPT') => void;
  onCreateDepositInvoice?: (quotation: SalesDocument) => void;
  onCreateBalanceInvoice?: (quotation: SalesDocument) => void;
  onReceivePayment?: (
    sourceDoc: SalesDocument,
    paymentData: {
      amount: number;
      method: string;
      date: string;
      payerName?: string;
      slipUrl?: string;
      notes?: string;
      stage?: PaymentStage;
    }
  ) => void;
  onEditDoc?: (doc: SalesDocument) => void;
  onSaveDocument?: (updatedDoc: SalesDocument) => void;
  onDeleteDoc?: (docId: string) => void;
}

export const DocumentDetailView: React.FC<DocumentDetailViewProps> = ({
  doc,
  documents = [],
  seller,
  customers = [],
  onClose,
  onSelectDoc,
  onUpdateStatus,
  onConvertDoc,
  onCreateDepositInvoice,
  onCreateBalanceInvoice,
  onReceivePayment,
  onEditDoc,
  onSaveDocument,
  onDeleteDoc,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string>(doc.paymentSlipUrl || '');
  const [isExporting, setIsExporting] = useState(false);

  // Receive Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalStage, setPaymentModalStage] = useState<PaymentStage>('FULL');
  const [payAmountInput, setPayAmountInput] = useState<number>(doc.grandTotal);
  const [payMethodInput, setPayMethodInput] = useState<string>('โอนเงินผ่านธนาคาร');
  const [payDateInput, setPayDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payPayerNameInput, setPayPayerNameInput] = useState<string>('');
  const [paySlipInput, setPaySlipInput] = useState<string>('');
  const [payNotesInput, setPayNotesInput] = useState<string>('');

  const [paymentRecords, setPaymentRecords] = useState<
    Array<{
      id: string;
      method: 'BANK_TRANSFER' | 'CASH';
      date: string;
      amount: number;
      payerName?: string;
    }>
  >([
    {
      id: '1',
      method: doc.paymentMethod === 'CASH' || doc.paymentMethod === 'เงินสด' ? 'CASH' : 'BANK_TRANSFER',
      date: doc.paymentDate || doc.date || new Date().toISOString().split('T')[0],
      amount: doc.grandTotal,
      payerName: '',
    },
  ]);

  const getDefaultNoteForDocType = (type: string, stage?: PaymentStage): string => {
    if (type === 'QUOTATION') {
      return seller.defaultQuotationNotes || 'ใบเสนอราคานี้มีผลบังคับใช้ 15 วันนับจากวันที่ออกเอกสาร หากมีข้อสงสัยกรุณาติดต่อร้านค้า';
    } else if (type === 'INVOICE') {
      if (stage === 'DEPOSIT') {
        return `ใบแจ้งหนี้ชำระเงินมัดจำ\n${seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า'}`;
      }
      if (stage === 'BALANCE') {
        return `ใบแจ้งหนี้ยอดคงเหลือส่วนส่งมอบงาน\n${seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า'}`;
      }
      return seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า';
    } else {
      if (stage === 'DEPOSIT') {
        return 'ได้รับเงินมัดจำเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา';
      }
      if (stage === 'BALANCE') {
        return 'ได้รับเงินยอดคงเหลือครบถ้วนสมบูรณ์ ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา';
      }
      return seller.defaultReceiptNotes || seller.defaultDocumentNotes || 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา';
    }
  };

  const [customNotes, setCustomNotes] = useState<string>(
    doc.notes || getDefaultNoteForDocType(doc.type, doc.paymentStage)
  );

  useEffect(() => {
    setCustomNotes(doc.notes || getDefaultNoteForDocType(doc.type, doc.paymentStage));
    setSlipUrl(doc.paymentSlipUrl || '');
  }, [doc]);

  // Determine Titles for Shared Document Header
  const getDocDisplayTitles = () => {
    if (doc.type === 'QUOTATION') {
      return {
        titleThai: 'ใบเสนอราคา',
        titleEnglish: 'QUOTATION',
      };
    }
    if (doc.type === 'INVOICE') {
      if (doc.paymentStage === 'DEPOSIT') {
        return {
          titleThai: 'ใบแจ้งหนี้ (เงินมัดจำ)',
          titleEnglish: 'INVOICE',
        };
      }
      if (doc.paymentStage === 'BALANCE') {
        return {
          titleThai: 'ใบแจ้งหนี้ (ยอดคงเหลือ)',
          titleEnglish: 'INVOICE',
        };
      }
      return {
        titleThai: 'ใบแจ้งหนี้',
        titleEnglish: 'INVOICE',
      };
    }
    if (doc.type === 'RECEIPT') {
      if (doc.paymentStage === 'DEPOSIT') {
        return {
          titleThai: 'ใบเสร็จรับเงิน',
          titleEnglish: 'RECEIPT',
        };
      }
      if (doc.paymentStage === 'BALANCE') {
        return {
          titleThai: 'ใบเสร็จรับเงิน',
          titleEnglish: 'RECEIPT',
        };
      }
      return {
        titleThai: 'ใบเสร็จรับเงิน',
        titleEnglish: 'RECEIPT',
      };
    }
    return {
      titleThai: 'เอกสารการขาย',
      titleEnglish: 'SALES DOCUMENT',
    };
  };

  const docTitles = getDocDisplayTitles();
  const docTitle = docTitles.titleThai;

  // Find linked pipeline documents
  const rootQuotation =
    doc.type === 'QUOTATION'
      ? doc
      : documents.find((d) => d.id === doc.parentQuotationId || d.docNumber === doc.parentQuotationDocNumber);

  const linkedInvoices = documents.filter(
    (d) =>
      d.type === 'INVOICE' &&
      ((rootQuotation && (d.parentQuotationId === rootQuotation.id || d.parentQuotationDocNumber === rootQuotation.docNumber)) ||
        d.id === doc.id ||
        d.sourceInvoiceId === doc.id)
  );

  const linkedReceipts = documents.filter(
    (d) =>
      d.type === 'RECEIPT' &&
      ((rootQuotation && (d.parentQuotationId === rootQuotation.id || d.parentQuotationDocNumber === rootQuotation.docNumber)) ||
        d.sourceInvoiceId === doc.id ||
        d.sourceInvoiceDocNumber === doc.docNumber ||
        d.id === doc.id)
  );

  const depositInvoice = linkedInvoices.find((i) => i.paymentStage === 'DEPOSIT');
  const balanceInvoice = linkedInvoices.find((i) => i.paymentStage === 'BALANCE');
  const depositReceipt = linkedReceipts.find((r) => r.paymentStage === 'DEPOSIT');
  const balanceReceipt = linkedReceipts.find((r) => r.paymentStage === 'BALANCE');

  const hasDepositTerms =
    doc.paymentTermType === 'DEPOSIT' ||
    rootQuotation?.paymentTermType === 'DEPOSIT' ||
    doc.paymentStage === 'DEPOSIT' ||
    doc.paymentStage === 'BALANCE';

  const depositAmount =
    doc.depositAmount ||
    rootQuotation?.depositAmount ||
    (doc.depositPercent ? Math.round((doc.grandTotal * doc.depositPercent) / 100) : 0);

  const balanceAmount =
    doc.balanceAmount !== undefined
      ? doc.balanceAmount
      : (rootQuotation?.balanceAmount !== undefined
          ? rootQuotation.balanceAmount
          : Math.max(0, (rootQuotation?.grandTotal || doc.grandTotal) - depositAmount));

  // ยอดเงินใน QR พร้อมเพย์: ใบแจ้งหนี้ที่ตั้งมัดจำไว้ ใช้ยอดมัดจำ (ถ้ารับมัดจำแล้ว ใช้ยอดคงเหลือ) ใบอื่นใช้ยอดเต็ม
  const qrInfo = (() => {
    const isDepositInvoice =
      doc.type === 'INVOICE' && hasDepositTerms && doc.paymentStage !== 'DEPOSIT' && doc.paymentStage !== 'BALANCE' && depositAmount > 0;
    if (isDepositInvoice && doc.status === 'DEPOSIT_PAID') return { amount: balanceAmount, label: 'ยอดคงเหลือ' };
    if (isDepositInvoice)
      return { amount: depositAmount, label: `เงินมัดจำ${doc.depositPercent ? ` ${doc.depositPercent}%` : ''}` };
    return { amount: doc.grandTotal, label: '' };
  })();

  useEffect(() => {
    if (doc.type !== 'RECEIPT' && seller.promptPayNumber) {
      generatePromptPayQRDataUrl(seller.promptPayNumber, qrInfo.amount)
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [doc.type, seller.promptPayNumber, qrInfo.amount]);

  // PDF Export
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await exportElementToPdf('printable-document-container', `${doc.docNumber}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  // LINE Text Copy
  const handleCopyLineText = () => {
    const text = formatDocumentForLine(doc, seller);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSlipUrl(result);
        onUpdateStatus(doc.id, 'PAID', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDocumentEdits = () => {
    const firstPayment = paymentRecords[0];
    const mainPaymentMethod =
      paymentRecords.length > 1
        ? `โอนเงินหลายช่องทาง (${paymentRecords.map((r) => `${r.method === 'CASH' ? 'เงินสด' : 'โอน'}: ฿${r.amount}`).join(', ')})`
        : firstPayment.method === 'CASH'
        ? 'เงินสด'
        : 'โอนเงินผ่านธนาคาร / พร้อมเพย์';

    const updatedDoc: SalesDocument = {
      ...doc,
      notes: customNotes,
      paymentMethod: mainPaymentMethod,
      paymentDate: firstPayment?.date || doc.paymentDate || new Date().toISOString().split('T')[0],
      paymentSlipUrl: slipUrl || doc.paymentSlipUrl,
      updatedAt: new Date().toISOString(),
    };

    if (onSaveDocument) {
      onSaveDocument(updatedDoc);
    } else {
      onUpdateStatus(doc.id, doc.status, slipUrl);
    }
    // แจ้งผลกลางจอ แล้วพากลับไปหน้ารายการออเดอร์เมื่อกด "ตกลง"
    notify('บันทึกเอกสารเรียบร้อยแล้ว', {
      onClose: () => window.dispatchEvent(new Event('app:go-orders')),
    });
  };

  // Open Receive Payment Modal with smart preset defaults
  const openReceivePaymentModal = (stage: PaymentStage) => {
    setPaymentModalStage(stage);
    let defaultAmount = doc.grandTotal;
    if (stage === 'DEPOSIT') {
      defaultAmount = depositAmount || Math.round(doc.grandTotal * 0.5);
    } else if (stage === 'BALANCE') {
      defaultAmount = balanceAmount || doc.grandTotal;
    } else if (doc.remainingAmount && doc.remainingAmount > 0) {
      defaultAmount = doc.remainingAmount;
    }

    setPayAmountInput(defaultAmount);
    setPayMethodInput(seller.bankName ? `โอนเงินผ่านธนาคาร (${seller.bankName})` : 'โอนเงินผ่านธนาคาร / พร้อมเพย์');
    setPayDateInput(new Date().toISOString().split('T')[0]);
    setPayPayerNameInput(doc.customerName || '');
    setPaySlipInput('');
    setPayNotesInput(
      stage === 'DEPOSIT'
        ? `รับชำระเงินมัดจำ ${depositAmount ? `฿${formatCurrency(depositAmount)}` : ''} ตามเอกสาร ${doc.docNumber}`
        : stage === 'BALANCE'
        ? `รับชำระเงินยอดคงเหลือส่งมอบงาน ฿${formatCurrency(defaultAmount)} ตามเอกสาร ${doc.docNumber}`
        : `รับชำระค่าสินค้า/บริการครบถ้วน ตามเอกสาร ${doc.docNumber}`
    );
    setShowPaymentModal(true);
  };

  // Submit Receive Payment
  const handleConfirmReceivePayment = () => {
    if (!payAmountInput || payAmountInput <= 0) {
      alert('กรุณาระบุยอดเงินที่รับชำระให้ถูกต้อง');
      return;
    }

    if (onReceivePayment) {
      onReceivePayment(doc, {
        amount: payAmountInput,
        method: payMethodInput,
        date: payDateInput,
        payerName: payPayerNameInput,
        slipUrl: paySlipInput,
        notes: payNotesInput,
        stage: paymentModalStage,
      });
      setShowPaymentModal(false);
    } else {
      // Fallback
      onConvertDoc(doc, 'RECEIPT');
      setShowPaymentModal(false);
    }
  };

  // All payment history records attached to this document or its parent
  const allRecordedPayments: PaymentRecord[] =
    doc.paymentRecords && doc.paymentRecords.length > 0
      ? doc.paymentRecords
      : rootQuotation?.paymentRecords || [];

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:m-0 print:overflow-visible print:block">
      <div className="bg-white border border-zinc-200 text-zinc-800 rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto print:bg-transparent print:border-none print:shadow-none print:max-w-full print:max-h-none print:p-0 print:m-0 print:overflow-visible">
        {/* Top Header Actions */}
        <div className="px-5 py-3 border-b border-zinc-200 bg-white flex flex-wrap items-center justify-between gap-2 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-zinc-900">{doc.docNumber}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              {doc.type}
            </span>
            {doc.paymentStage && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  doc.paymentStage === 'DEPOSIT'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : doc.paymentStage === 'BALANCE'
                    ? 'bg-[#EAF1FF] text-[#003BB3] border-[#BFD3FF]'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                {doc.paymentStage === 'DEPOSIT'
                  ? 'เงินมัดจำ'
                  : doc.paymentStage === 'BALANCE'
                  ? 'ยอดคงเหลือ'
                  : 'ชำระเต็มจำนวน'}
              </span>
            )}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                doc.status === 'PAID'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : doc.status === 'DEPOSIT_PAID'
                  ? 'bg-[#EAF1FF] text-[#003BB3] border-[#BFD3FF]'
                  : doc.status === 'PENDING_DEPOSIT'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : doc.status === 'PARTIALLY_PAID'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              {doc.status === 'PAID'
                ? '✓ ชำระครบแล้ว'
                : doc.status === 'DEPOSIT_PAID'
                ? '✓ ชำระมัดจำแล้ว'
                : doc.status === 'PENDING_DEPOSIT'
                ? '⏳ รอมัดจำ'
                : doc.status === 'PARTIALLY_PAID'
                ? 'ชำระบางส่วน'
                : doc.status === 'SENT'
                ? 'รอชำระ'
                : doc.status}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSaveDocumentEdits}
              className="px-3 py-1.5 bg-[#003BB3] hover:bg-[#002E8C] text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
              title="บันทึกการแก้ไขข้อมูลและการชำระเงิน"
            >
              <span>บันทึกเอกสาร</span>
            </button>

            {onEditDoc && (
              <button
                onClick={() => onEditDoc(doc)}
                className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
                title="แก้ไขข้อมูลเอกสาร"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>แก้ไขเอกสาร</span>
              </button>
            )}

            <button
              onClick={handleCopyLineText}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-lg border border-zinc-300 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกส่ง LINE'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3 py-1.5 bg-[#003BB3] hover:bg-[#002E8C] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'กำลังสร้าง...' : 'PDF'}</span>
            </button>

            <button
              onClick={() => printOnlyElement('printable-document-container')}
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-lg border border-zinc-300 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">พิมพ์</span>
            </button>

            {onDeleteDoc && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                title="ลบเอกสารนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ลบ</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Linked Documents Flow Banner (Quotation ➔ Deposit Invoice ➔ Receipt ➔ Balance Invoice ➔ Receipt) */}
        {(hasDepositTerms || linkedInvoices.length > 0 || linkedReceipts.length > 0 || doc.type === 'QUOTATION') && (
          <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-2.5 no-print">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
              <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-[#003BB3]" />
                <span>เส้นทางเอกสารและการชำระเงิน (Document & Payment Pipeline)</span>
              </span>
              {rootQuotation && (
                <span className="text-[11px] text-zinc-500 font-mono">
                  อ้างอิง QT: <strong className="text-zinc-800">{rootQuotation.docNumber}</strong> (฿{formatCurrency(rootQuotation.grandTotal)})
                </span>
              )}
            </div>

            {/* Pipeline Step Badges */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
              {/* Step 1: Quotation */}
              {rootQuotation && (
                <button
                  type="button"
                  onClick={() => onSelectDoc && onSelectDoc(rootQuotation)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shrink-0 ${
                    doc.id === rootQuotation.id
                      ? 'bg-[#EAF1FF] text-[#003BB3] font-extrabold border-[#003BB3] ring-2 ring-[#003BB3]/20 shadow-sm'
                      : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-zinc-400'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. ใบเสนอราคา ({rootQuotation.docNumber})</span>
                </button>
              )}

              {/* Step 2: Deposit Invoice */}
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              {depositInvoice ? (
                <button
                  type="button"
                  onClick={() => onSelectDoc && onSelectDoc(depositInvoice)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shrink-0 ${
                    doc.id === depositInvoice.id
                      ? 'bg-amber-400 text-zinc-950 font-extrabold border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                      : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-amber-400'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-500" />
                  <span>2. บิลมัดจำ ({depositInvoice.docNumber})</span>
                  <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-mono font-bold">
                    ฿{formatCurrency(depositInvoice.grandTotal)}
                  </span>
                </button>
              ) : (
                <div className="px-2.5 py-1 rounded-lg bg-white/60 border border-dashed border-zinc-300 text-zinc-400 text-[11px] flex items-center gap-1 shrink-0">
                  <span>2. บิลมัดจำ (ยังไม่ออก)</span>
                </div>
              )}

              {/* Step 3: Deposit Receipt */}
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              {depositReceipt ? (
                <button
                  type="button"
                  onClick={() => onSelectDoc && onSelectDoc(depositReceipt)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shrink-0 ${
                    doc.id === depositReceipt.id
                      ? 'bg-emerald-50 text-emerald-800 font-extrabold border-emerald-500 ring-2 ring-emerald-400/30 shadow-sm'
                      : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 hover:border-emerald-500'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. ใบเสร็จมัดจำ ({depositReceipt.docNumber})</span>
                  <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-mono font-bold">
                    ✓ ฿{formatCurrency(depositReceipt.grandTotal)}
                  </span>
                </button>
              ) : (
                <div className="px-2.5 py-1 rounded-lg bg-white/60 border border-dashed border-zinc-300 text-zinc-400 text-[11px] flex items-center gap-1 shrink-0">
                  <span>3. ใบเสร็จมัดจำ (ยังไม่ชำระ)</span>
                </div>
              )}

              {/* Step 4: Balance Invoice */}
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              {balanceInvoice ? (
                <button
                  type="button"
                  onClick={() => onSelectDoc && onSelectDoc(balanceInvoice)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shrink-0 ${
                    doc.id === balanceInvoice.id
                      ? 'bg-[#EAF1FF] text-[#003BB3] font-extrabold border-[#003BB3] ring-2 ring-[#003BB3]/20 shadow-sm'
                      : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-zinc-500" />
                  <span>4. บิลคงเหลือ ({balanceInvoice.docNumber})</span>
                  <span className="text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 font-mono font-bold">
                    ฿{formatCurrency(balanceInvoice.grandTotal)}
                  </span>
                </button>
              ) : (
                <div className="px-2.5 py-1 rounded-lg bg-white/60 border border-dashed border-zinc-300 text-zinc-400 text-[11px] flex items-center gap-1 shrink-0">
                  <span>4. บิลคงเหลือ</span>
                </div>
              )}

              {/* Step 5: Balance Receipt */}
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              {balanceReceipt ? (
                <button
                  type="button"
                  onClick={() => onSelectDoc && onSelectDoc(balanceReceipt)}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shrink-0 ${
                    doc.id === balanceReceipt.id
                      ? 'bg-emerald-50 text-emerald-800 font-extrabold border-emerald-500 ring-2 ring-emerald-400/30 shadow-sm'
                      : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-300 hover:border-emerald-400'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>5. ใบเสร็จงวดสุดท้าย ({balanceReceipt.docNumber})</span>
                  <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-mono font-bold">
                    ✓ จบงาน
                  </span>
                </button>
              ) : (
                <div className="px-2.5 py-1 rounded-lg bg-white/60 border border-dashed border-zinc-300 text-zinc-400 text-[11px] flex items-center gap-1 shrink-0">
                  <span>5. ใบเสร็จจบงาน</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Document Canvas Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-200 print:bg-white print:p-0 print:m-0 print:overflow-visible">
          <div
            id="printable-document-container"
            className="bg-white text-zinc-900 p-6 sm:p-10 max-w-3xl mx-auto font-sans shadow-lg print:shadow-none print:max-w-full print:p-6 print:m-0 print:border-none print:rounded-none space-y-6"
          >
            {/* 1. SHARED DOCUMENT HEADER */}
            <DocumentHeader
              seller={seller}
              titleThai={docTitles.titleThai}
              titleEnglish={docTitles.titleEnglish}
              showEntrepreneurAndTaxId={doc.type === 'RECEIPT'}
            />

            {/* 2. CUSTOMER & DOCUMENT METADATA SECTION */}
            <div className="flex flex-col sm:flex-row print:flex-row items-stretch gap-4">
              {/* Box 1: Customer Information */}
              <div className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg p-4 space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  ลูกค้า / ผู้สั่งซื้อ
                </span>
                <div className="space-y-1 text-xs">
                  <p className="text-zinc-900 font-bold text-sm">
                    <span className="font-semibold text-zinc-500 text-xs mr-1">ชื่อลูกค้า :</span>
                    {doc.customerName}
                  </p>
                  {doc.customerTaxId && doc.customerTaxId.trim() !== '' && (
                    <p className="text-zinc-800 font-mono font-medium">
                      <span className="font-semibold text-zinc-500 font-sans mr-1">เลขประจำตัวผู้เสียภาษีอากร :</span>
                      {doc.customerTaxId}
                    </p>
                  )}
                  {doc.customerAddress && doc.customerAddress.trim() !== '' && (
                    <p className="text-zinc-700 leading-relaxed">
                      <span className="font-semibold text-zinc-500 mr-1">ที่อยู่ :</span>
                      {doc.customerAddress}
                    </p>
                  )}
                  {doc.customerPhone && doc.customerPhone.trim() !== '' && (
                    <p className="text-zinc-700">
                      <span className="font-semibold text-zinc-500 mr-1">โทรศัพท์ :</span>
                      {doc.customerPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Box 2: Document Metadata & Status */}
              <div className="w-full sm:w-[260px] print:w-[260px] shrink-0 bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 border-b border-zinc-200 pb-1.5">
                    <span className="font-semibold text-zinc-500">เลขที่เอกสาร:</span>
                    <span className="font-mono font-black text-[#18181B] text-sm">{doc.docNumber}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-zinc-500">วันที่ออก:</span>
                    <span className="font-bold text-zinc-800">{formatDate(doc.date)}</span>
                  </div>
                  {doc.type !== 'RECEIPT' && doc.dueDate && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-zinc-500">กำหนดชำระ:</span>
                      <span className="font-bold text-zinc-800">{formatDate(doc.dueDate)}</span>
                    </div>
                  )}
                  {doc.parentQuotationDocNumber && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-zinc-500">อ้างอิงใบเสนอราคา:</span>
                      <span className="font-bold text-zinc-800">{doc.parentQuotationDocNumber}</span>
                    </div>
                  )}
                  {doc.sourceInvoiceDocNumber && (
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-zinc-500">อ้างอิงใบแจ้งหนี้:</span>
                      <span className="font-bold text-zinc-800">{doc.sourceInvoiceDocNumber}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-zinc-100 border-y border-zinc-200 text-zinc-700 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">รายการสินค้า / บริการ</th>
                    <th className="py-2.5 px-3 text-center">จำนวน</th>
                    <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                    <th className="py-2.5 px-3 text-right">รวมเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {doc.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 align-top">
                      <td className="py-3 px-3 text-zinc-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-zinc-800">
                        <div>{item.productName}</div>
                        {item.description ? (
                          <div className="text-[11px] text-zinc-500 font-normal mt-0.5 leading-snug whitespace-pre-line">
                            {item.description}
                          </div>
                        ) : null}
                        {item.discount && item.discount > 0 ? (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            ส่วนลดรายการ: -฿{formatCurrency(item.discount)}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-zinc-700">
                        {item.quantity} {item.unit ? <span className="font-normal text-zinc-500 text-[11px]">{item.unit}</span> : ''}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-600">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-zinc-900">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* บรรทัดว่างประมาณ 5 บรรทัด ใต้รายการสินค้า */}
                <tbody aria-hidden="true">
                  <tr>
                    <td colSpan={5} className="h-20 p-0" />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary & PromptPay / Payment Info Section */}
            {/* แถวบน: ยอดรวม/ส่วนลด/VAT (ขวา) · แถวล่าง: กล่อง QR (ซ้าย) เริ่มตรงกับกล่องยอดสุทธิ (ขวา) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-2 pt-4 border-t border-zinc-200">
              <div className="hidden sm:block print:block sm:col-start-1 sm:row-start-1 print:col-start-1 print:row-start-1" />

              {/* Payment Info & PromptPay QR */}
              <div className="order-1 sm:order-none sm:col-start-1 sm:row-start-2 print:col-start-1 print:row-start-2 flex flex-col gap-3">
                {doc.type !== 'RECEIPT' && seller.promptPayNumber && (
                  <div className="flex-1 p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center gap-4">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="PromptPay QR Code"
                        className="w-24 h-24 rounded-lg border border-zinc-300 shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-zinc-200 rounded-lg flex items-center justify-center text-xs text-zinc-500">
                        QR Code
                      </div>
                    )}
                    <div className="text-xs space-y-1">
                      <span className="font-extrabold text-zinc-900 block flex items-center gap-1">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        ชำระผ่าน PromptPay QR
                      </span>
                      <p className="text-zinc-700 font-semibold">
                        เลขพร้อมเพย์: {seller.promptPayNumber}
                      </p>
                      {qrInfo.label && (
                        <p className="text-amber-800 font-bold">
                          ยอดใน QR: ฿{formatCurrency(qrInfo.amount)} ({qrInfo.label})
                        </p>
                      )}
                      <p className="text-zinc-600">ชื่อบัญชี: {seller.bankAccountName || seller.name}</p>
                      {seller.bankName && (
                        <p className="text-zinc-500 text-[11px]">
                          {seller.bankName} ({seller.bankAccountNo})
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment History Record in Document — แสดงเฉพาะเมื่อมีการชำระเงินจริงแล้ว */}
                {(allRecordedPayments.length > 0 ||
                  doc.type === 'RECEIPT' ||
                  doc.status === 'PAID' ||
                  doc.status === 'DEPOSIT_PAID' ||
                  doc.status === 'PARTIALLY_PAID') && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                    <span className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      ข้อมูลการชำระเงิน
                    </span>
                    {doc.status === 'PAID' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ✓ ชำระครบถ้วนแล้ว
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    {allRecordedPayments.length > 0 ? (
                      allRecordedPayments.map((pay, idx) => (
                        <div
                          key={pay.id || idx}
                          className={`space-y-1 ${idx > 0 ? 'pt-2 border-t border-zinc-200' : ''}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase">
                              {pay.stage === 'DEPOSIT' ? 'ชำระเงินมัดจำ' : pay.stage === 'BALANCE' ? 'ชำระยอดคงเหลือ' : `งวดที่ ${idx + 1}`}
                              {pay.receiptDocNumber ? ` (ใบเสร็จ: ${pay.receiptDocNumber})` : ''}
                            </span>
                            <span className="font-extrabold text-emerald-700 text-xs">
                              {formatCurrency(pay.amount)} บาท
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-zinc-600">
                            <span>วันที่: {formatDate(pay.date)}</span>
                            <span>{pay.method}</span>
                          </div>
                          {pay.payerName && (
                            <div className="text-[10px] text-zinc-500">
                              ผู้โอน/ผู้ชำระ: {pay.payerName}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      paymentRecords.map((pay, idx) => (
                        <div
                          key={pay.id}
                          className={`space-y-1 ${idx > 0 ? 'pt-2 border-t border-zinc-200' : ''}`}
                        >
                          {paymentRecords.length > 1 && (
                            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                              รายการที่ {idx + 1} {pay.payerName ? `(${pay.payerName})` : ''}:
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                              ช่องทางการชำระเงิน
                            </span>
                            <span className="font-bold text-zinc-800">
                              {pay.method === 'CASH'
                                ? 'เงินสด (Cash)'
                                : 'โอนเข้าธนาคาร (Bank Transfer)'}
                            </span>
                          </div>
                          {pay.method === 'BANK_TRANSFER' && seller.bankName && (
                            <div className="text-right text-[11px] text-zinc-500">
                              {seller.bankName} {seller.bankAccountNo ? `(${seller.bankAccountNo})` : ''}
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                              วันที่โอน / ชำระเงิน
                            </span>
                            <span className="font-bold text-zinc-800">{formatDate(pay.date)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-zinc-100 pt-0.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                              ยอดเงินที่ชำระ
                            </span>
                            <span className="font-extrabold text-emerald-700 text-xs">
                              {formatCurrency(pay.amount)} บาท
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                )}
              </div>

              {/* Grand Total Breakdown */}
              <div className="order-2 sm:order-none sm:col-start-2 sm:row-start-1 print:col-start-2 print:row-start-1 space-y-2 text-xs text-zinc-600">
                <div className="flex justify-between py-1 px-3 border-b border-zinc-100">
                  <span className="font-medium text-zinc-700">รวมเป็นเงินทั้งสิ้น:</span>
                  <span className="font-bold text-zinc-900">{formatCurrency(doc.subtotal)}</span>
                </div>

                {doc.discountAmount > 0 && (
                  <div className="flex justify-between py-1 px-3 border-b border-zinc-100 text-zinc-700">
                    <span className="font-medium">หัก ส่วนลดพิเศษ:</span>
                    <span className="font-bold text-rose-600">
                      -{formatCurrency(doc.discountAmount)}
                    </span>
                  </div>
                )}

                {doc.shippingFee > 0 && (
                  <div className="flex justify-between py-1 px-3 border-b border-zinc-100 text-zinc-700">
                    <span className="font-medium">บวก ค่าจัดส่ง:</span>
                    <span className="font-bold text-zinc-900">
                      {formatCurrency(doc.shippingFee)}
                    </span>
                  </div>
                )}

                {doc.vatAmount > 0 && (
                  <div className="flex justify-between py-1 px-3 border-b border-zinc-100 text-zinc-700">
                    <span className="font-medium">ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                    <span className="font-bold text-zinc-900">{formatCurrency(doc.vatAmount)}</span>
                  </div>
                )}

              </div>

              <div className="order-3 sm:order-none sm:col-start-2 sm:row-start-2 print:col-start-2 print:row-start-2 space-y-2 text-xs text-zinc-600">
                <div className="flex justify-between py-2 border-t-2 border-zinc-900 text-sm font-black text-zinc-900 bg-zinc-100 px-3 rounded-lg">
                  <span>{doc.type === 'QUOTATION' ? 'มูลค่าโครงการรวมทั้งสิ้น:' : 'จำนวนเงินสุทธิตามเอกสารนี้:'}</span>
                  <span className="text-emerald-700 text-base font-black">
                    {formatCurrency(doc.grandTotal)}
                  </span>
                </div>

                {/* Deposit Terms Breakdown on Quotation / Invoice (ใบแจ้งหนี้ที่กำหนดมัดจำ) */}
                {(doc.type === 'QUOTATION' || (doc.type === 'INVOICE' && doc.paymentStage !== 'DEPOSIT' && doc.paymentStage !== 'BALANCE')) && hasDepositTerms && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between border-b border-amber-200/80 pb-1">
                      <span>เงื่อนไขการชำระเงิน (มัดจำ & ยอดคงเหลือ):</span>
                      <span className="text-[10px] bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded font-mono">
                        {doc.depositPercent ? `มัดจำ ${doc.depositPercent}%` : 'มัดจำระบุยอด'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-950 font-semibold">
                      <span>• งวดที่ 1 เงินมัดจำก่อนเริ่มงาน:</span>
                      <span className="font-bold text-amber-800">฿{formatCurrency(depositAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-950 font-semibold">
                      <span>• งวดที่ 2 ยอดคงเหลือเมื่อส่งมอบงาน:</span>
                      <span className="font-bold text-zinc-800">฿{formatCurrency(balanceAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Full Width Notes / Remarks Box */}
            <div className="text-xs text-zinc-700 bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 w-full mt-4">
              <span className="font-bold text-zinc-800 block mb-1">หมายเหตุ:</span>
              <p className="whitespace-pre-line leading-relaxed font-medium">
                {customNotes}
              </p>
            </div>

            {/* Signature & Personal Terms Footer */}
            <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-6 text-center text-xs text-zinc-600 items-end">
              <div className="space-y-3 flex flex-col items-center justify-end min-h-[90px]">
                <div className="pt-6">
                  <p className="text-zinc-500">ลงชื่อ ...........................................................</p>
                </div>
                <p className="font-semibold text-zinc-800">
                  ({doc.customerName})<br />
                  <span className="font-normal text-zinc-500">ผู้รับสินค้า / ลูกค้า</span>
                </p>
              </div>

              <div className="space-y-3 flex flex-col items-center justify-end min-h-[90px]">
                {seller.signatureUrl ? (
                  <div className="flex flex-col items-center justify-center min-h-[50px] mb-1">
                    <img
                      src={seller.signatureUrl}
                      alt="ลายเซ็นผู้ขาย"
                      className="max-h-16 max-w-[170px] object-contain"
                    />
                    <p className="text-[10px] text-zinc-300 font-mono -mt-1">-----------------------------------</p>
                  </div>
                ) : (
                  <div className="pt-6">
                    <p className="text-zinc-500">ลงชื่อ ...........................................................</p>
                  </div>
                )}
                <p className="font-semibold text-zinc-800">
                  ({seller.ownerName || seller.bankAccountName || seller.name})<br />
                  <span className="font-normal text-zinc-500">ผู้ออกเอกสาร / ผู้ขาย</span>
                </p>
              </div>
            </div>
          </div>

          {/* Deposit & Document Action Bar */}
          <div className="max-w-3xl mx-auto mt-6 bg-white border border-zinc-300 rounded-lg p-4 shadow-sm space-y-4 no-print">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#003BB3]" />
                <span>การดำเนินการและการออกเอกสารในระบบ</span>
              </h4>

              {/* Action Buttons based on Document Lifecycle */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. QUOTATION ACTIONS */}
                {doc.type === 'QUOTATION' && (
                  <>
                    {hasDepositTerms ? (
                      <>
                        {onCreateDepositInvoice && !depositInvoice && (
                          <button
                            type="button"
                            onClick={() => onCreateDepositInvoice(doc)}
                            className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 text-xs font-bold rounded-lg flex items-center gap-1 shadow transition-all active:scale-95"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>1. ออกบิลมัดจำ (Deposit Invoice)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openReceivePaymentModal('DEPOSIT')}
                          className="px-3.5 py-1.5 bg-[#003BB3] hover:bg-[#002E8C] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>บันทึกรับเงินมัดจำ (฿{formatCurrency(depositAmount)})</span>
                        </button>

                        {onCreateBalanceInvoice && !balanceInvoice && (
                          <button
                            type="button"
                            onClick={() => onCreateBalanceInvoice(doc)}
                            className="px-3 py-1.5 bg-[#003BB3] hover:bg-[#002E8C] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow transition-all active:scale-95"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>2. ออกบิลคงเหลือ (Balance Invoice)</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onConvertDoc(doc, 'INVOICE')}
                          className="px-3.5 py-1.5 bg-[#003BB3] hover:bg-[#002E8C] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow"
                        >
                          <span>แปลงเป็นใบแจ้งหนี้</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openReceivePaymentModal('FULL')}
                          className="px-3.5 py-1.5 bg-[#003BB3] hover:bg-[#002E8C] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow"
                        >
                          <span>รับชำระ & ออกใบเสร็จ</span>
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* 2. INVOICE ACTIONS */}
                {doc.type === 'INVOICE' && doc.status !== 'PAID' && (
                  <button
                    type="button"
                    onClick={() =>
                      openReceivePaymentModal(
                        doc.paymentStage === 'DEPOSIT'
                          ? 'DEPOSIT'
                          : doc.paymentStage === 'BALANCE'
                          ? 'BALANCE'
                          : 'FULL'
                      )
                    }
                    className="px-4 py-2 bg-[#003BB3] hover:bg-[#002E8C] text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {doc.paymentStage === 'DEPOSIT'
                        ? `รับชำระเงินมัดจำ & ออกใบเสร็จ (฿${formatCurrency(doc.grandTotal)})`
                        : doc.paymentStage === 'BALANCE'
                        ? `รับชำระยอดคงเหลือ & ออกใบเสร็จ (฿${formatCurrency(doc.grandTotal)})`
                        : `บันทึกรับเงิน & ออกใบเสร็จ (฿${formatCurrency(doc.grandTotal)})`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Slip Uploader and Interactive Edit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-200">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="cursor-pointer px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-300 flex items-center gap-2 transition-all">
                  <Upload className="w-4 h-4" />
                  <span>แนบสลิปชำระเงิน</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSlipUpload}
                    className="hidden"
                  />
                </label>

                {slipUrl && (
                  <a
                    href={slipUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:underline font-medium"
                  >
                    [ดูสลิปที่แนบ]
                  </a>
                )}
              </div>

              {doc.status !== 'PAID' && (
                <button
                  onClick={() => onUpdateStatus(doc.id, 'PAID')}
                  className="px-3.5 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-lg border border-zinc-300"
                >
                  ตั้งสถานะเป็นชำระแล้ว
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receive Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-emerald-500/30 text-zinc-100 rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-base text-emerald-400 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>
                  {paymentModalStage === 'DEPOSIT'
                    ? 'บันทึกรับเงินมัดจำ (Deposit Payment)'
                    : paymentModalStage === 'BALANCE'
                    ? 'บันทึกรับชำระยอดคงเหลือ (Balance Payment)'
                    : 'บันทึกรับชำระเงิน & ออกใบเสร็จ'}
                </span>
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Document Summary Info */}
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>เอกสารอ้างอิง:</span>
                  <strong className="text-zinc-200">{doc.docNumber} ({docTitle})</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>ลูกค้า:</span>
                  <strong className="text-emerald-400">{doc.customerName}</strong>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>มูลค่ารวมทั้งสิ้น:</span>
                  <strong className="text-zinc-100 font-mono">฿{formatCurrency(doc.grandTotal)}</strong>
                </div>
              </div>

              {/* Amount to receive */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  ยอดเงินที่รับชำระจริง (บาท) *
                </label>
                <input
                  type="number"
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(Number(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-sm font-black text-emerald-400 font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  ช่องทางการชำระเงิน *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethodInput('โอนเงินผ่านธนาคาร')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                      payMethodInput.includes('โอน')
                        ? 'bg-white text-zinc-900 border-emerald-500 shadow-xs'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    โอนธนาคาร
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethodInput('พร้อมเพย์ QR')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                      payMethodInput.includes('พร้อมเพย์')
                        ? 'bg-white text-zinc-900 border-emerald-500 shadow-xs'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    พร้อมเพย์
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethodInput('เงินสด')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                      payMethodInput === 'เงินสด'
                        ? 'bg-white text-zinc-900 border-emerald-500 shadow-xs'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    เงินสด
                  </button>
                </div>
              </div>

              {/* Payment Date & Payer Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    วันที่ชำระเงิน (วัน-เดือน-ปี)
                  </label>
                  <DatePicker
                    value={payDateInput}
                    onChange={(val) => setPayDateInput(val)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    ชื่อผู้โอน/ผู้ชำระ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น คุณกนกมล"
                    value={payPayerNameInput}
                    onChange={(e) => setPayPayerNameInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Slip Upload in Modal */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  แนบหลักฐานสลิปโอนเงิน (ถ้ามี)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3.5 py-1.5 bg-zinc-950 hover:bg-slate-850 text-emerald-400 rounded-lg border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>อัปโหลดรูปสลิป</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setPaySlipInput(evt.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {paySlipInput && (
                    <span className="text-xs text-emerald-400 font-bold">
                      ✓ แนบสลิปเรียบร้อยแล้ว
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  หมายเหตุใบเสร็จ
                </label>
                <input
                  type="text"
                  value={payNotesInput}
                  onChange={(e) => setPayNotesInput(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReceivePayment}
                className="px-5 py-2 bg-white hover:bg-zinc-200 text-zinc-900 text-xs font-extrabold rounded-lg shadow-lg flex items-center gap-1.5 active:scale-98 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>บันทึกรับเงิน & ออกใบเสร็จทันที</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Document Deletion */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        document={doc}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirmDelete={(docId) => {
          if (onDeleteDoc) onDeleteDoc(docId);
          setShowDeleteConfirm(false);
          onClose();
        }}
      />
    </div>
  );
};
