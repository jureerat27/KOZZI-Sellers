import React, { useEffect, useState } from 'react';
import { X, QrCode, Download, Share2, Copy, CheckCircle } from 'lucide-react';
import { SellerProfile } from '../types';
import { generatePromptPayQRDataUrl } from '../utils/promptpay';

interface PromptPayModalProps {
  amount: number;
  docNumber?: string;
  seller: SellerProfile;
  onClose: () => void;
}

export const PromptPayModal: React.FC<PromptPayModalProps> = ({
  amount,
  docNumber,
  seller,
  onClose,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (seller.promptPayNumber) {
      generatePromptPayQRDataUrl(seller.promptPayNumber, amount)
        .then((url) => setQrUrl(url))
        .catch((err) => console.error(err));
    }
  }, [seller.promptPayNumber, amount]);

  const handleCopyPromptPayNum = () => {
    navigator.clipboard.writeText(seller.promptPayNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `PromptPay_QR_${docNumber || 'Scan'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-100 text-zinc-800 rounded-xl w-full max-w-sm p-5 shadow-xl space-y-4 text-center">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <span className="font-bold text-sm text-zinc-800 flex items-center gap-1.5">
            <QrCode className="w-5 h-5" />
            <span>PromptPay QR Code สแกนจ่าย</span>
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 bg-zinc-50 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-zinc-50/40 p-4 rounded-xl inline-block shadow-xs border border-zinc-100">
          {qrUrl ? (
            <img src={qrUrl} alt="PromptPay QR Code" className="w-52 h-52 mx-auto rounded-lg shadow-xs bg-white p-2" />
          ) : (
            <div className="w-52 h-52 bg-white rounded-lg flex items-center justify-center text-xs text-zinc-400">
              กำลังสร้าง QR Code...
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1">
          {docNumber && (
            <span className="text-xs text-zinc-500 block">อ้างอิงเอกสาร: {docNumber}</span>
          )}
          <span className="text-2xl font-black text-zinc-900 block">
            ฿{amount.toLocaleString()}
          </span>
          <p className="text-xs text-zinc-700 font-bold mt-1">
            {seller.bankAccountName || seller.name}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs text-zinc-600 font-mono font-semibold">
              พร้อมเพย์: {seller.promptPayNumber}
            </span>
            <button
              onClick={handleCopyPromptPayNum}
              className="text-[10px] px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-md border border-zinc-200 transition-all"
            >
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-center gap-2">
          <button
            onClick={handleDownloadQR}
            className="w-full py-2.5 bg-[#0068F0] hover:bg-[#0052C7] text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดรูป QR Code</span>
          </button>
        </div>
      </div>
    </div>
  );
};
