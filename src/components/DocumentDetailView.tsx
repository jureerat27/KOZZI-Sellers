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
} from 'lucide-react';
import { SalesDocument, SellerProfile } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';
import { exportElementToPdf, printDocument } from '../utils/pdf';
import { formatDocumentForLine } from '../utils/line';

interface DocumentDetailViewProps {
  doc: SalesDocument;
  seller: SellerProfile;
  onClose: () => void;
  onUpdateStatus: (docId: string, newStatus: any, paymentSlipUrl?: string) => void;
  onConvertDoc: (doc: SalesDocument, targetType: 'INVOICE' | 'RECEIPT') => void;
  onSendLineNotify: (message: string) => void;
}

export const DocumentDetailView: React.FC<DocumentDetailViewProps> = ({
  doc,
  seller,
  onClose,
  onUpdateStatus,
  onConvertDoc,
  onSendLineNotify,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [slipUrl, setSlipUrl] = useState<string>(doc.paymentSlipUrl || '');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (seller.promptPayNumber) {
      generatePromptPayQRDataUrl(seller.promptPayNumber, doc.grandTotal)
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [seller.promptPayNumber, doc.grandTotal]);

  const docTitle =
    doc.type === 'QUOTATION'
      ? 'ใบเสนอราคา (Quotation)'
      : doc.type === 'INVOICE'
      ? 'ใบแจ้งหนี้ / ใบวางบิล (Invoice)'
      : 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ (Receipt)';

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Header Actions */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-100">{doc.docNumber}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
              {doc.type}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyLineText}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'คัดลอกข้อความแล้ว!' : 'คัดลอกส่ง LINE'}</span>
            </button>

            <button
              onClick={handleSendToLineNotify}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ส่งแจ้งเตือน LINE</span>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          <div
            id="printable-document-container"
            className="bg-white text-slate-900 rounded-xl p-6 sm:p-10 max-w-3xl mx-auto shadow-2xl border border-slate-200 space-y-6 font-sans"
          >
            {/* Header: Seller Info & Document Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-6">
              <div className="flex items-start gap-3.5 max-w-md">
                {seller.logoUrl && (
                  <img
                    src={seller.logoUrl}
                    alt="Store Logo"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 p-0.5"
                  />
                )}
                <div className="space-y-1">
                  <h1 className="text-xl font-bold text-slate-900 leading-tight">
                    {seller.name || 'ร้านค้าออนไลน์บุคคลธรรมดา'}
                  </h1>
                  <p className="text-xs text-slate-600">
                    {seller.taxId && `เลขประจำตัวผู้เสียภาษี/เลขบัตรประชาชน: ${seller.taxId}`}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{seller.address}</p>
                  <p className="text-xs text-slate-600">
                    โทร: {seller.phone} {seller.email ? `• อีเมล: ${seller.email}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right w-full sm:w-auto">
                <span className="inline-block px-3 py-1 rounded-md bg-slate-900 text-white font-extrabold text-xs uppercase tracking-wider mb-1">
                  {docTitle}
                </span>
                <p className="text-sm font-bold text-slate-800 mt-1">{doc.docNumber}</p>
                <p className="text-xs text-slate-500">วันที่: {doc.date}</p>
                <p className="text-xs text-slate-500">กำหนดชำระ: {doc.dueDate}</p>
              </div>
            </div>

            {/* Customer Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  ลูกค้า / ผู้สั่งซื้อ
                </span>
                <h3 className="font-bold text-sm text-slate-900">{doc.customerName}</h3>
                <p className="text-xs text-slate-600">{doc.customerAddress}</p>
                <p className="text-xs text-slate-600">
                  โทร: {doc.customerPhone}{' '}
                  {doc.customerTaxId ? `• เลขผู้เสียภาษี: ${doc.customerTaxId}` : ''}
                </p>
              </div>

              <div className="text-right flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  สถานะเอกสาร
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border inline-block mt-1 ${
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
                        {item.productName}
                        {item.sku && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            รหัส: {item.sku}
                          </span>
                        )}
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

            {/* Summary & PromptPay Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              {/* Payment Info & PromptPay QR */}
              <div className="space-y-3">
                {seller.promptPayNumber && (
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

                {doc.notes && (
                  <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-0.5">หมายเหตุ:</span>
                    {doc.notes}
                  </div>
                )}
              </div>

              {/* Grand Total Breakdown */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>รวมเป็นเงิน (Subtotal):</span>
                  <span className="font-bold text-slate-800">฿{doc.subtotal.toLocaleString()}</span>
                </div>

                {doc.discountAmount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                    <span>หัก ส่วนลดพิเศษ:</span>
                    <span className="font-bold">-฿{doc.discountAmount.toLocaleString()}</span>
                  </div>
                )}

                {doc.shippingFee > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>บวก ค่าจัดส่ง:</span>
                    <span className="font-bold text-slate-800">฿{doc.shippingFee.toLocaleString()}</span>
                  </div>
                )}

                {doc.vatAmount > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
                    <span className="font-bold text-slate-800">฿{doc.vatAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black text-slate-900 bg-slate-100 px-3 rounded-lg">
                  <span>จำนวนเงินสุทธิทั้งสิ้น:</span>
                  <span className="text-emerald-700 text-base">
                    ฿{doc.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature & Personal Terms Footer */}
            <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-6 text-center text-xs text-slate-600">
              <div className="space-y-8">
                <p>ลงชื่อ ...........................................................</p>
                <p>({doc.customerName})<br />ผู้รับสินค้า / ลูกค้า</p>
              </div>

              <div className="space-y-8">
                <p>ลงชื่อ ...........................................................</p>
                <p>({seller.name})<br />ผู้ออกเอกสาร / ผู้ขาย</p>
              </div>
            </div>
          </div>

          {/* Payment Slip Upload & Status Controls */}
          <div className="max-w-3xl mx-auto mt-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>การเปลี่ยนสถานะและการสลิปชำระเงิน</span>
            </h4>

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
    </div>
  );
};
