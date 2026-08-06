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
} from 'lucide-react';
import { SalesDocument, SellerProfile } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { exportElementToPdf, printDocument } from '../utils/pdf';
import { formatDocumentForLine, generateFlexReceipt, sendLineOaPushNotification } from '../utils/line';

interface DocumentDetailViewProps {
  doc: SalesDocument;
  seller: SellerProfile;
  customers?: any[];
  onClose: () => void;
  onUpdateStatus: (docId: string, newStatus: any, paymentSlipUrl?: string) => void;
  onConvertDoc: (doc: SalesDocument, targetType: 'INVOICE' | 'RECEIPT') => void;
  onSendLineNotify: (message: string) => void;
  onEditDoc?: (doc: SalesDocument) => void;
  onSaveDocument?: (updatedDoc: SalesDocument) => void;
}

export const DocumentDetailView: React.FC<DocumentDetailViewProps> = ({
  doc,
  seller,
  customers = [],
  onClose,
  onUpdateStatus,
  onConvertDoc,
  onSendLineNotify,
  onEditDoc,
  onSaveDocument,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string>(doc.paymentSlipUrl || '');
  const [isExporting, setIsExporting] = useState(false);
  const [showLineOaModal, setShowLineOaModal] = useState(false);
  const [lineUserIdInput, setLineUserIdInput] = useState('');
  const [isSendingOa, setIsSendingOa] = useState(false);
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
  const [customNotes, setCustomNotes] = useState<string>(
    doc.notes || seller.defaultDocumentNotes || 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา'
  );

  useEffect(() => {
    if (doc.type !== 'RECEIPT' && seller.promptPayNumber) {
      generatePromptPayQRDataUrl(seller.promptPayNumber, doc.grandTotal)
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [seller.promptPayNumber, doc.grandTotal, doc.type]);

  const docTitle =
    doc.type === 'QUOTATION'
      ? 'ใบเสนอราคา'
      : doc.type === 'INVOICE'
      ? 'ใบแจ้งหนี้'
      : 'ใบเสร็จรับเงิน';

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

  const handleCopyLineText = () => {
    const text = formatDocumentForLine(doc, seller);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToLineNotify = () => {
    const text = formatDocumentForLine(doc, seller);
    onSendLineNotify(text);
  };

  const handleOpenLineOaModal = () => {
    if (!seller.lineOaChannelAccessToken) {
      alert('กรุณาตั้งค่า Channel Access Token สำหรับ LINE OA ในหน้า "ตั้งค่าระบบ" ก่อนนะคะ/ครับ');
      return;
    }
    const matchedCustomer = customers.find(
      (c) => c.id === doc.customerId || c.name === doc.customerName
    );
    if (matchedCustomer && matchedCustomer.lineUserId) {
      setLineUserIdInput(matchedCustomer.lineUserId);
    }
    setShowLineOaModal(true);
  };

  const handleSendLineOaFlexReceipt = async () => {
    if (!lineUserIdInput.trim()) {
      alert('กรุณาระบุ LINE User ID ของลูกค้าก่อน');
      return;
    }
    if (!seller.lineOaChannelAccessToken) {
      alert('กรุณาตั้งค่า Channel Access Token ในหน้าตั้งค่าก่อน');
      return;
    }

    setIsSendingOa(true);
    try {
      const flexMsg = generateFlexReceipt(doc, seller);
      const res = await sendLineOaPushNotification(
        seller.lineOaChannelAccessToken,
        lineUserIdInput.trim(),
        undefined,
        flexMsg
      );

      if (res.success) {
        alert(`✅ ส่ง Flex Receipt การ์ดบิลเข้า LINE ของคุณ ${doc.customerName} สำเร็จแล้ว!`);
        setShowLineOaModal(false);
      } else {
        alert(`❌ เกิดข้อผิดพลาดจาก LINE OA API: ${res.error}`);
      }
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsSendingOa(false);
    }
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
    alert('✅ บันทึกข้อมูลการแก้ไขเอกสารเรียบร้อยแล้ว!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:m-0 print:overflow-visible print:block">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto print:bg-transparent print:border-none print:shadow-none print:max-w-full print:max-h-none print:p-0 print:m-0 print:overflow-visible">
        {/* Top Header Actions */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-100">{doc.docNumber}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
              {doc.type}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSaveDocumentEdits}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
              title="บันทึกการแก้ไขข้อมูลและการชำระเงิน"
            >
              <span>💾 บันทึกเอกสาร</span>
            </button>

            {onEditDoc && (
              <button
                onClick={() => onEditDoc(doc)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95"
                title="แก้ไขข้อมูลใบเสร็จ/เอกสาร"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{doc.type === 'RECEIPT' ? 'แก้ไขใบเสร็จ' : 'แก้ไขเอกสาร'}</span>
              </button>
            )}

            <button
              onClick={handleCopyLineText}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'คัดลอกข้อความแล้ว!' : 'คัดลอกส่ง LINE'}</span>
            </button>

            <button
              onClick={handleSendToLineNotify}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
              title="ส่งเข้ากลุ่มไลน์ร้านค้า"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>ส่ง Notify ร้านค้า</span>
            </button>

            <button
              onClick={handleOpenLineOaModal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow active:scale-98"
              title="ส่ง Flex Receipt การ์ดบิลเข้า LINE ของลูกค้าโดยตรง"
            >
              <span className="text-sm">💬</span>
              <span>ส่ง LINE OA หาลูกค้า</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}</span>
            </button>

            <button
              onClick={printDocument}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">พิมพ์</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Canvas Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 print:bg-white print:p-0 print:m-0 print:overflow-visible">
          <div
            id="printable-document-container"
            className="bg-white text-slate-900 p-6 sm:p-10 max-w-3xl mx-auto font-sans shadow-md print:shadow-none print:max-w-full print:p-6 print:m-0 print:border-none print:rounded-none space-y-6"
          >
            {/* Header: Seller Info & Document Title */}
            <div className="border-b border-slate-200 pb-6">
              <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-4">
                {/* Left Column: Logo + Store Info */}
                <div className="space-y-1 max-w-md">
                  {seller.logoUrl && (
                    <div className="mb-2">
                      <img
                        src={seller.logoUrl}
                        alt="Store Logo"
                        className="max-h-9 sm:max-h-10 w-auto max-w-[150px] object-contain shrink-0"
                      />
                    </div>
                  )}
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">
                    {seller.name || 'ร้านค้าออนไลน์บุคคลธรรมดา'}
                  </h1>
                  {seller.taxId && (
                    <p className="text-xs text-slate-600">
                      เลขประจำตัวผู้เสียภาษี/เลขบัตรประชาชน: {seller.taxId}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 leading-relaxed">{seller.address}</p>
                  <p className="text-xs text-slate-600">
                    โทร: {seller.phone} {seller.email ? `• อีเมล: ${seller.email}` : ''}
                  </p>
                </div>

                {/* Right Column: Title Box (Aligned at top with Logo) + Document Metadata */}
                <div className="flex flex-col items-start sm:items-start print:items-start text-left space-y-2 shrink-0">
                  {/* Title in Black Box - Aligned at top with Logo */}
                  <div className="doc-title-box bg-slate-900 text-white font-extrabold text-lg sm:text-xl px-8 py-3.5 sm:py-4 rounded-2xl text-center shadow-md min-w-[220px] tracking-wide">
                    {docTitle}
                  </div>

                  {/* Metadata lines - "เลขที่เอกสาร" aligned across from address, "วันที่ออกเอกสาร" aligned across from phone */}
                  <div className="text-left text-xs space-y-1 pt-2 sm:pt-3 print:pt-3 pl-1">
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-500 mr-1.5">เลขที่เอกสาร:</span>
                      <span className="font-extrabold text-slate-900">{doc.docNumber}</span>
                    </p>
                    <p className="text-slate-700">
                      <span className="font-semibold text-slate-500 mr-1.5">วันที่ออกเอกสาร:</span>
                      <span className="font-bold text-slate-900">{doc.date}</span>
                    </p>
                    {doc.type !== 'RECEIPT' && doc.dueDate && (
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-500 mr-1.5">กำหนดชำระ:</span>
                        <span className="font-bold text-slate-900">{doc.dueDate}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details & Payment Status Boxes (2 Separate Boxes) */}
            <div className="flex flex-col sm:flex-row print:flex-row items-stretch gap-4">
              {/* Box 1: Customer Information (Extends up to price table alignment) */}
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  ลูกค้า / ผู้สั่งซื้อ
                </span>
                <h3 className="font-bold text-sm text-slate-900">{doc.customerName}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{doc.customerAddress}</p>
                <p className="text-xs text-slate-600">
                  โทร: {doc.customerPhone}{' '}
                  {doc.customerTaxId ? `• เลขผู้เสียภาษี: ${doc.customerTaxId}` : ''}
                </p>
              </div>

              {/* Box 2: Standalone Payment Status Box */}
              <div className="w-full sm:w-[210px] print:w-[210px] shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between items-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  สถานะการชำระเงิน
                </span>
                <div className="my-auto py-1">
                  <span
                    className={`text-xs font-bold px-3.5 py-1.5 rounded-full border inline-flex items-center gap-1 shadow-xs ${
                      doc.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : doc.status === 'SENT' || doc.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                  >
                    {doc.status === 'PAID'
                      ? '✓ ชำระเงินเรียบร้อยแล้ว'
                      : doc.status === 'SENT'
                      ? 'รอชำระเงิน'
                      : doc.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">รายการสินค้า / บริการ</th>
                    <th className="py-2.5 px-3 text-center">จำนวน</th>
                    <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                    <th className="py-2.5 px-3 text-right">รวมเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doc.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div>{item.productName}</div>
                        {item.description ? (
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5 leading-snug">
                            {item.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        ฿{item.price.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        ฿{item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & PromptPay / Payment Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              {/* Payment Info & PromptPay QR */}
              <div className="space-y-3">
                {doc.type !== 'RECEIPT' && seller.promptPayNumber && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="PromptPay QR Code"
                        className="w-24 h-24 rounded-lg border border-slate-300 shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-500">
                        QR Code
                      </div>
                    )}
                    <div className="text-xs space-y-1">
                      <span className="font-extrabold text-slate-900 block flex items-center gap-1">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        ชำระผ่าน PromptPay QR
                      </span>
                      <p className="text-slate-700 font-semibold">
                        เลขพร้อมเพย์: {seller.promptPayNumber}
                      </p>
                      <p className="text-slate-600">ชื่อบัญชี: {seller.bankAccountName || seller.name}</p>
                      {seller.bankName && (
                        <p className="text-slate-500 text-[11px]">
                          {seller.bankName} ({seller.bankAccountNo})
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Information Box (ข้อมูลการชำระเงิน: รองรับสูงสุด 2 ช่องรายการ) */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      ข้อมูลการชำระเงิน
                    </span>
                    {doc.status === 'PAID' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        ✓ ชำระเงินเรียบร้อยแล้ว
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    {paymentRecords.map((pay, idx) => (
                      <div
                        key={pay.id}
                        className={`space-y-1 ${
                          idx > 0 ? 'pt-2 border-t border-slate-200' : ''
                        }`}
                      >
                        {paymentRecords.length > 1 && (
                          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                            รายการที่ {idx + 1} {pay.payerName ? `(${pay.payerName})` : ''}:
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            ช่องทางการชำระเงิน
                          </span>
                          <span className="font-bold text-slate-800">
                            {pay.method === 'CASH'
                              ? '💵 เงินสด (Cash)'
                              : '🏦 โอนเข้าธนาคาร (Bank Transfer)'}
                          </span>
                        </div>
                        {pay.method === 'BANK_TRANSFER' && seller.bankName && (
                          <div className="text-right text-[11px] text-slate-500">
                            {seller.bankName} {seller.bankAccountNo ? `(${seller.bankAccountNo})` : ''}
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            วันที่โอน / ชำระเงิน
                          </span>
                          <span className="font-bold text-slate-800">{pay.date}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100 pt-0.5 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            ยอดเงินที่ชำระ
                          </span>
                          <span className="font-extrabold text-emerald-700 text-xs">
                            ฿{pay.amount.toLocaleString()} บาท
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grand Total Breakdown */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="font-medium text-slate-700">รวมเป็นเงินทั้งสิ้น:</span>
                  <span className="font-bold text-slate-900">฿{doc.subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                  <span className="font-medium">หัก ส่วนลดพิเศษ:</span>
                  <span className="font-bold text-rose-600">
                    {doc.discountAmount > 0 ? `-฿${doc.discountAmount.toLocaleString()}` : '฿0'}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                  <span className="font-medium">บวก ค่าจัดส่ง:</span>
                  <span className="font-bold text-slate-900">
                    {doc.shippingFee > 0 ? `฿${doc.shippingFee.toLocaleString()}` : '฿0'}
                  </span>
                </div>

                {doc.vatAmount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span className="font-medium">ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                    <span className="font-bold text-slate-900">฿{doc.vatAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900 bg-slate-100 px-3 rounded-lg mt-2">
                  <span>จำนวนเงินสุทธิทั้งสิ้น:</span>
                  <span className="text-emerald-700 text-base font-black">
                    ฿{doc.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Full Width Notes / Remarks Box */}
            <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200 w-full mt-4">
              <span className="font-bold text-slate-800 block mb-1">หมายเหตุ:</span>
              <p className="whitespace-pre-line leading-relaxed font-medium">
                {customNotes}
              </p>
            </div>

            {/* Signature & Personal Terms Footer */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-center text-xs text-slate-600 items-end">
              <div className="space-y-3 flex flex-col items-center justify-end min-h-[90px]">
                <div className="pt-6">
                  <p className="text-slate-500">ลงชื่อ ...........................................................</p>
                </div>
                <p className="font-semibold text-slate-800">
                  ({doc.customerName})<br />
                  <span className="font-normal text-slate-500">ผู้รับสินค้า / ลูกค้า</span>
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
                    <p className="text-[10px] text-slate-300 font-mono -mt-1">-----------------------------------</p>
                  </div>
                ) : (
                  <div className="pt-6">
                    <p className="text-slate-500">ลงชื่อ ...........................................................</p>
                  </div>
                )}
                <p className="font-semibold text-slate-800">
                  ({seller.name})<br />
                  <span className="font-normal text-slate-500">ผู้ออกเอกสาร / ผู้ขาย</span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment Slip Upload & Status Controls */}
          <div className="max-w-3xl mx-auto mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 no-print">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>การตั้งค่าข้อมูลการชำระเงินและหมายเหตุเอกสาร</span>
              </h4>

              <button
                type="button"
                onClick={handleSaveDocumentEdits}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span>💾 บันทึกการแก้ไขเอกสาร</span>
              </button>
            </div>

            {/* Interactive Payment Method & Notes Controls */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>ข้อมูลการชำระเงิน ({paymentRecords.length} ช่องรายการ)</span>
                </label>
                {paymentRecords.length === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const half = Math.round(doc.grandTotal / 2);
                      setPaymentRecords([
                        { ...paymentRecords[0], amount: half },
                        {
                          id: '2',
                          method: 'BANK_TRANSFER',
                          date: doc.date || new Date().toISOString().split('T')[0],
                          amount: doc.grandTotal - half,
                          payerName: '',
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold transition-all"
                  >
                    + เพิ่มช่องการชำระเงินที่ 2
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentRecords([
                        { ...paymentRecords[0], amount: doc.grandTotal },
                      ]);
                    }}
                    className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition-all"
                  >
                    - ลดเหลือ 1 ช่องรายการ
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paymentRecords.map((rec, idx) => (
                  <div key={rec.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                    <div className="font-bold text-emerald-400 text-[11px]">
                      รายการชำระเงินที่ {idx + 1}
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">ช่องทางชำระเงิน</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...paymentRecords];
                            next[idx].method = 'BANK_TRANSFER';
                            setPaymentRecords(next);
                          }}
                          className={`flex-1 py-1 px-2 rounded text-[11px] font-bold border ${
                            rec.method === 'BANK_TRANSFER'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          โอนธนาคาร
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...paymentRecords];
                            next[idx].method = 'CASH';
                            setPaymentRecords(next);
                          }}
                          className={`flex-1 py-1 px-2 rounded text-[11px] font-bold border ${
                            rec.method === 'CASH'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          เงินสด
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">วันที่ชำระเงิน</label>
                      <input
                        type="date"
                        value={rec.date}
                        onChange={(e) => {
                          const next = [...paymentRecords];
                          next[idx].date = e.target.value;
                          setPaymentRecords(next);
                        }}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">ยอดเงินที่ชำระ (บาท)</label>
                      <input
                        type="number"
                        value={rec.amount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          const next = [...paymentRecords];
                          next[idx].amount = val;
                          setPaymentRecords(next);
                        }}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      />
                    </div>

                    {paymentRecords.length > 1 && (
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">ชื่อผู้โอน (ระบุหรือไม่ก็ได้)</label>
                        <input
                          type="text"
                          placeholder="เช่น คุณกนกมล / คุณสมชาย"
                          value={rec.payerName || ''}
                          onChange={(e) => {
                            const next = [...paymentRecords];
                            next[idx].payerName = e.target.value;
                            setPaymentRecords(next);
                          }}
                          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Custom Notes Input */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  ข้อความหมายเหตุเอกสาร
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Slip uploader */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-all">
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
                    className="text-xs text-blue-400 hover:underline font-medium"
                  >
                    [ดูสลิปที่แนบ]
                  </a>
                )}
              </div>

              {/* Conversion Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {doc.type === 'QUOTATION' && (
                  <button
                    onClick={() => onConvertDoc(doc, 'INVOICE')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow"
                  >
                    <span>แปลงเป็นใบแจ้งหนี้</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {doc.type === 'INVOICE' && doc.status !== 'PAID' && (
                  <button
                    onClick={() => onConvertDoc(doc, 'RECEIPT')}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow"
                  >
                    <span>รับชำระ & ออกใบเสร็จ</span>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}

                {doc.status !== 'PAID' && (
                  <button
                    onClick={() => onUpdateStatus(doc.id, 'PAID')}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl"
                  >
                    ทำรายการชำระแล้ว
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LINE OA Send Modal */}
      {showLineOaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/30 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-emerald-400 flex items-center gap-2">
                <span className="text-xl">💬</span>
                <span>ส่ง Flex Receipt เข้า LINE OA ของลูกค้า</span>
              </h3>
              <button
                onClick={() => setShowLineOaModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs space-y-1">
                <div className="text-slate-400 font-bold">รายละเอียดเอกสารที่จะส่ง:</div>
                <div className="font-bold text-white text-sm">{doc.docNumber} ({docTitle})</div>
                <div className="text-slate-300">ลูกค้า: <strong className="text-emerald-400">{doc.customerName}</strong></div>
                <div className="text-emerald-400 font-bold">ยอดสุทธิ: ฿{doc.grandTotal.toLocaleString()} บาท</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  LINE User ID ของลูกค้า *
                </label>
                <input
                  type="text"
                  value={lineUserIdInput}
                  onChange={(e) => setLineUserIdInput(e.target.value)}
                  placeholder="เช่น U1234567890abcdef..."
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 LINE User ID สามารถคัดลอกได้จากข้อมูลลูกค้า หรือแชท LINE OA เมื่อลูกค้าทักข้อความมา
                </p>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl text-[11px] text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1 text-emerald-400">
                  <span>✨ รูปแบบข้อความ Flex Message การ์ดบิล</span>
                </div>
                <p>ระบบจะสร้างการ์ดบิลใบเสร็จรับเงินพร้อมยอดชำระและรายการสินค้า ส่งเข้า LINE ของลูกค้าโดยตรงทันที!</p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowLineOaModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSendingOa}
                onClick={handleSendLineOaFlexReceipt}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 active:scale-98 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingOa ? 'กำลังส่งเข้า LINE...' : 'ส่ง Flex Receipt ทันที'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
