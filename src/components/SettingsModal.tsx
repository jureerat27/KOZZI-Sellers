import React, { useState } from 'react';
import {
  X,
  User,
  QrCode,
  Send,
  Download,
  Upload,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Bell,
  FileSpreadsheet,
  Image,
  Trash2,
  Settings,
} from 'lucide-react';
import { SellerProfile, SyncLog } from '../types';
import { sendLineOaPushNotification } from '../utils/line';

interface SettingsModalProps {
  seller: SellerProfile;
  syncLog: SyncLog;
  onClose: () => void;
  onSaveSeller: (profile: SellerProfile) => void;
  onSyncGoogleSheets: () => void;
  onTestLineNotify: (token: string) => void;
  onExportBackupJson: () => void;
  onImportBackupJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  seller,
  syncLog,
  onClose,
  onSaveSeller,
  onSyncGoogleSheets,
  onTestLineNotify,
  onExportBackupJson,
  onImportBackupJson,
}) => {
  const [name, setName] = useState(seller.name);
  const [taxId, setTaxId] = useState(seller.taxId);
  const [address, setAddress] = useState(seller.address);
  const [phone, setPhone] = useState(seller.phone);
  const [email, setEmail] = useState(seller.email);
  const [promptPayNumber, setPromptPayNumber] = useState(seller.promptPayNumber);
  const [bankName, setBankName] = useState(seller.bankName);
  const [bankAccountNo, setBankAccountNo] = useState(seller.bankAccountNo);
  const [bankAccountName, setBankAccountName] = useState(seller.bankAccountName);
  const [lineNotifyToken, setLineNotifyToken] = useState(seller.lineNotifyToken);
  const [lineOaChannelAccessToken, setLineOaChannelAccessToken] = useState(seller.lineOaChannelAccessToken || '');
  const [lineOaBasicId, setLineOaBasicId] = useState(seller.lineOaBasicId || '');
  const [testLineUserId, setTestLineUserId] = useState('');
  const [isTestingOa, setIsTestingOa] = useState(false);
  const [logoUrl, setLogoUrl] = useState(seller.logoUrl || '');
  const [signatureUrl, setSignatureUrl] = useState(seller.signatureUrl || '');
  const [defaultQuotationNotes, setDefaultQuotationNotes] = useState(
    seller.defaultQuotationNotes || 'ใบเสนอราคานี้มีผลบังคับใช้ 15 วันนับจากวันที่ออกเอกสาร หากมีข้อสงสัยกรุณาติดต่อร้านค้า'
  );
  const [defaultInvoiceNotes, setDefaultInvoiceNotes] = useState(
    seller.defaultInvoiceNotes || 'กรุณาชำระเงินตามกำหนดชำระผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคารของร้านค้า'
  );
  const [defaultReceiptNotes, setDefaultReceiptNotes] = useState(
    seller.defaultReceiptNotes || seller.defaultDocumentNotes || 'ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา'
  );

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('ขนาดไฟล์รูปภาพใหญ่เกินไป (กรุณาเลือกไฟล์ขนาดไม่เกิน 3MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('ขนาดไฟล์รูปภาพใหญ่เกินไป (กรุณาเลือกไฟล์ขนาดไม่เกิน 3MB)');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSignatureUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = () => {
    if (confirm('คุณต้องการลบโลโก้ร้านค้านี้ใช่หรือไม่?')) {
      setLogoUrl('');
    }
  };

  const handleDeleteSignature = () => {
    if (confirm('คุณต้องการลบลายเซ็นร้านค้านี้ใช่หรือไม่?')) {
      setSignatureUrl('');
    }
  };

  const handleTestLineOaPush = async () => {
    if (!lineOaChannelAccessToken) {
      alert('กรุณากรอก LINE OA Channel Access Token ก่อนทดสอบ');
      return;
    }
    if (!testLineUserId) {
      alert('กรุณากรอก LINE User ID ของลูกค้าที่ต้องการทดสอบส่ง');
      return;
    }
    setIsTestingOa(true);
    try {
      const res = await sendLineOaPushNotification(
        lineOaChannelAccessToken,
        testLineUserId,
        `💬 [ SellersApp ] ทดสอบการส่งข้อความจากระบบแจ้งเตือนร้านค้าผ่าน LINE OA (${lineOaBasicId || 'Official Account'})\nยินดีต้อนรับสู่ระบบส่งบิล/ใบเสร็จเข้าไลน์ลูกค้าโดยตรง! ✨`
      );
      if (res.success) {
        alert('✅ ส่งข้อความผ่าน LINE OA เข้าไลน์ลูกค้าสำเร็จแล้ว!');
      } else {
        alert(`❌ ไม่สามารถส่งข้อความได้: ${res.error}`);
      }
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsTestingOa(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: SellerProfile = {
      ...seller,
      name,
      taxId,
      address,
      phone,
      email,
      promptPayNumber,
      bankName,
      bankAccountNo,
      bankAccountName,
      lineNotifyToken,
      lineOaChannelAccessToken,
      lineOaBasicId,
      logoUrl,
      signatureUrl,
      defaultDocumentNotes: defaultReceiptNotes,
      defaultQuotationNotes,
      defaultInvoiceNotes,
      defaultReceiptNotes,
    };
    onSaveSeller(updated);
    alert('บันทึกการตั้งค่าร้านค้าเรียบร้อยแล้ว');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#CBD7E6] text-[#1F2A44] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0D2B52] text-white flex items-center justify-center font-bold shadow-md">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#0D2B52]">
                ตั้งค่าระบบร้านค้า & สำรองข้อมูล
              </h2>
              <p className="text-xs text-slate-500">
                จัดการโลโก้ร้านค้า, ข้อมูลผู้ขาย, พร้อมเพย์, LINE Notify และ Google Sheets Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Merchant Profile & Logo */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0D2B52] flex items-center gap-2">
              <User className="w-4 h-4 text-[#2563EB]" />
              <span>ข้อมูลผู้ขาย & โลโก้ร้านค้า (Merchant Profile)</span>
            </h3>

            {/* Logo Manager Box */}
            <div className="bg-white border border-[#CBD7E6] rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-[#0D2B52] flex items-center gap-2">
                  <Image className="w-4 h-4 text-[#2563EB]" />
                  <span>โลโก้ร้านค้า (Store Logo)</span>
                </label>
                {logoUrl && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ มีโลโก้ตั้งค่าอยู่
                  </span>
                )}
              </div>

              {logoUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200">
                  <div className="relative group shrink-0">
                    <img
                      src={logoUrl}
                      alt="Store Logo Preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md bg-white p-1"
                    />
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="text-xs font-bold text-[#0D2B52]">
                      โลโก้ปัจจุบันของร้านค้า
                    </div>
                    <p className="text-[11px] text-slate-500">
                      โลโก้นี้จะแสดงบนหัวเอกสารขาย (ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จ) และบนแถบ Dashboard
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                      <label className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-98">
                        <Upload className="w-3.5 h-3.5" />
                        <span>เปลี่ยนรูปโลโก้</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 active:scale-98"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>ลบโลโก้</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 border-2 border-dashed border-[#CBD7E6] hover:border-[#2563EB] rounded-2xl bg-[#F8FAFC] hover:bg-blue-50/40 transition-all text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#2563EB] flex items-center justify-center mx-auto shadow-2xs">
                    <Image className="w-6 h-6 text-[#2563EB]" />
                  </div>

                  <div>
                    <div className="text-xs font-extrabold text-[#0D2B52]">
                      ยังไม่มีโลโก้ร้านค้า
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      อัปโหลดรูปภาพโลโก้ (PNG, JPG, WEBP) เพื่อแสดงบนเอกสารขายและเมนูร้าน
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <label className="px-4 py-2 bg-[#0D2B52] hover:bg-[#081E3B] text-white text-xs font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-xs active:scale-98">
                      <Upload className="w-4 h-4 text-white" />
                      <span>อัปโหลดรูปภาพโลโก้</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* URL Direct Fallback */}
              <div className="pt-2 border-t border-slate-100">
                <details className="text-[11px] text-slate-500 cursor-pointer">
                  <summary className="font-bold hover:text-[#2563EB] transition-colors">
                    หรือระบุ URL รูปภาพโลโก้โดยตรง
                  </summary>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                    />
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 rounded-xl transition-colors"
                      >
                        ล้าง URL
                      </button>
                    )}
                  </div>
                </details>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ชื่อ-นามสกุล บุคคลธรรมดา / ชื่อร้าน *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี (ร้านสมชายออนไลน์)"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  เลขประจำตัวผู้เสียภาษี 13 หลัก / เลขบัตรประชาชน
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="เช่น 1100200300401"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">อีเมลติดต่อ</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="somchai@example.com"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ที่อยู่ผู้ขาย (จะแสดงในเอกสาร)</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                ></textarea>
              </div>
            </div>

            {/* Signature Manager Box */}
            <div className="bg-white border border-[#CBD7E6] rounded-2xl p-4 space-y-3 shadow-2xs mt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-[#0D2B52] flex items-center gap-2">
                  <span className="text-base">✍️</span>
                  <span>ลายเซ็นร้านค้า/ผู้ขาย (Embedded Signature for Documents)</span>
                </label>
                {signatureUrl && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ มีลายเซ็นตั้งค่าอยู่
                  </span>
                )}
              </div>

              {signatureUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#F8FAFC] p-3.5 rounded-xl border border-slate-200">
                  <div className="shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                    <img
                      src={signatureUrl}
                      alt="Store Signature Preview"
                      className="max-h-16 max-w-[160px] object-contain"
                    />
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="text-xs font-bold text-[#0D2B52]">
                      ลายเซ็นดิจิทัลที่จะแสดงบนเอกสาร
                    </div>
                    <p className="text-[11px] text-slate-500">
                      ลายเซ็นนี้จะประทับอยู่เหนือชื่อผู้ขายในส่วนท้ายของใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จรับเงิน
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                      <label className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs active:scale-98">
                        <Upload className="w-3.5 h-3.5" />
                        <span>เปลี่ยนรูปหรือไฟล์ลายเซ็น</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleDeleteSignature}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 active:scale-98"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>ลบลายเซ็น</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-[#CBD7E6] hover:border-[#2563EB] rounded-2xl bg-[#F8FAFC] hover:bg-blue-50/40 transition-all text-center space-y-2">
                  <div className="text-xs font-extrabold text-[#0D2B52]">
                    ยังไม่ได้ใส่ลายเซ็นของร้านค้า
                  </div>
                  <p className="text-[11px] text-slate-500">
                    อัปโหลดรูปภาพลายเซ็น (ไฟล์ PNG พื้นหลังใส หรือรูปถ่ายลายเซ็น) เพื่อให้แสดงบนเอกสารโดยอัตโนมัติ
                  </p>
                  <label className="inline-flex px-4 py-2 bg-[#0D2B52] hover:bg-[#081E3B] text-white text-xs font-extrabold rounded-xl cursor-pointer transition-all items-center gap-2 shadow-xs active:scale-98">
                    <Upload className="w-4 h-4 text-white" />
                    <span>อัปโหลดลายเซ็นผู้ขาย</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Default Document Notes Box - Separated per Document Type */}
            <div className="bg-white border border-[#CBD7E6] rounded-2xl p-4 space-y-4 shadow-2xs mt-4">
              <div>
                <label className="text-xs font-extrabold text-[#0D2B52] flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <span>ตั้งค่าข้อความหมายเหตุเอกสารเริ่มต้น (แยกตามประเภทเอกสาร)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ข้อความนี้จะนำไปแสดงในหมายเหตุเริ่มต้นเมื่อสร้างหรือเปลี่ยนประเภทเอกสาร
                </p>
              </div>

              {/* 1. Quotation Notes */}
              <div className="space-y-1.5 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>1. หมายเหตุสำหรับ "ใบเสนอราคา" (Quotation Notes)</span>
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={defaultQuotationNotes}
                  onChange={(e) => setDefaultQuotationNotes(e.target.value)}
                  placeholder="เช่น ใบเสนอราคานี้มีผลบังคับใช้ 15 วันนับจากวันที่ออกเอกสาร"
                  className="w-full bg-white border border-[#CBD7E6] rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] leading-relaxed font-sans"
                />
              </div>

              {/* 2. Invoice Notes */}
              <div className="space-y-1.5 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>2. หมายเหตุสำหรับ "ใบแจ้งหนี้" (Invoice Notes)</span>
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={defaultInvoiceNotes}
                  onChange={(e) => setDefaultInvoiceNotes(e.target.value)}
                  placeholder="เช่น กรุณาชำระเงินตามกำหนดผ่านพร้อมเพย์ หรือโอนผ่านบัญชีธนาคาร"
                  className="w-full bg-white border border-[#CBD7E6] rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] leading-relaxed font-sans"
                />
              </div>

              {/* 3. Receipt Notes */}
              <div className="space-y-1.5 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>3. หมายเหตุสำหรับ "ใบเสร็จรับเงิน" (Receipt Notes)</span>
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={defaultReceiptNotes}
                  onChange={(e) => setDefaultReceiptNotes(e.target.value)}
                  placeholder="เช่น ได้รับเงินเรียบร้อยแล้ว ขอบพระคุณที่ไว้วางใจเลือกใช้บริการร้านค้าของเรา"
                  className="w-full bg-white border border-[#CBD7E6] rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB] leading-relaxed font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section 2: PromptPay & Bank Details */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0D2B52] flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#2563EB]" />
              <span>ข้อมูลการรับเงิน (PromptPay & Bank Details)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  เลขพร้อมเพย์ (เบอร์โทร 10 หลัก หรือ เลขบัตรประชาชน 13 หลัก) *
                </label>
                <input
                  type="text"
                  required
                  value={promptPayNumber}
                  onChange={(e) => setPromptPayNumber(e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="w-full bg-white border border-[#CBD7E6] rounded-xl px-3 py-2 text-xs text-[#2563EB] font-extrabold font-mono focus:outline-none focus:border-[#0D2B52]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ชื่อบัญชีรับเงิน</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ธนาคาร</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="เช่น ธนาคารกสิกรไทย (KBank)"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">เลขที่บัญชีธนาคาร</label>
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="เช่น 012-3-45678-9"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: LINE Notify Integration */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0D2B52] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#2563EB]" />
              <span>การตั้งค่าแจ้งเตือน LINE Notify (แจ้งเตือนร้านค้า)</span>
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">LINE Notify Access Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={lineNotifyToken}
                  onChange={(e) => setLineNotifyToken(e.target.value)}
                  placeholder="กรอก Token จาก notify-bot.line.me"
                  className="flex-1 bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2563EB]"
                />
                <button
                  type="button"
                  onClick={() => onTestLineNotify(lineNotifyToken)}
                  className="px-3.5 py-2 bg-[#16A394] hover:bg-[#0D8A7C] text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-xs shrink-0 transition-all active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ทดสอบส่ง LINE</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                ระบบจะส่งการแจ้งเตือนเข้ากลุ่ม/ไลน์ร้านค้าเมื่อมีการออกบิล ยืนยันชำระเงิน หรือสินค้าใกล้หมดสต็อก
              </p>
            </div>
          </div>

          {/* Section 3.5: LINE Official Account (LINE OA) Integration */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                <span className="text-base">💬</span>
                <span>การตั้งค่าแจ้งเตือนเข้า LINE ลูกค้า (LINE Official Account / Messaging API)</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                แนะนำสำหรับส่งบิลหาลูกค้า
              </span>
            </div>

            <p className="text-[11px] text-emerald-800 leading-relaxed bg-white/80 p-3 rounded-xl border border-emerald-100">
              💡 <strong>ข้อดีของ LINE OA Messaging API:</strong> สามารถส่งข้อความ <strong>Push Message / Flex Receipt (การ์ดบิลใบเสร็จรับเงิน)</strong> ไปที่ LINE ของลูกค้าโดยตรงเมื่อทำการออกบิลหรือรับชำระเงินเรียบร้อยแล้ว
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    LINE OA Basic ID (@...)
                  </label>
                  <input
                    type="text"
                    value={lineOaBasicId}
                    onChange={(e) => setLineOaBasicId(e.target.value)}
                    placeholder="เช่น @myshop_official"
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Channel Access Token (Messaging API) *
                  </label>
                  <input
                    type="password"
                    value={lineOaChannelAccessToken}
                    onChange={(e) => setLineOaChannelAccessToken(e.target.value)}
                    placeholder="นำมาจาก LINE Developers Console (Messaging API channel)"
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Test OA Push Box */}
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  ทดสอบส่งข้อความหา LINE User ID ของลูกค้า
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={testLineUserId}
                    onChange={(e) => setTestLineUserId(e.target.value)}
                    placeholder="กรอก LINE User ID ลูกค้า (เช่น U1234567890abcdef...)"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={isTestingOa}
                    onClick={handleTestLineOaPush}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all shrink-0 active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestingOa ? 'กำลังส่ง...' : 'ทดสอบส่ง Push เข้า LINE'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  * LINE User ID สามารถดูได้จากระบบ CRM หรือเมื่อลูกค้าทักแชท LINE OA
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Google Sheets & Cloud Backup */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0D2B52] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#2563EB]" />
              <span>สำรองข้อมูลขึ้นคลาวด์ Google Sheets</span>
            </h3>

            <div className="p-4 bg-white rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">สถานะการเชื่อมต่อ Google Sheets:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  พร้อมซิงก์เรียบร้อย
                </span>
              </div>

              {syncLog.lastSynced && (
                <p className="text-[11px] text-slate-500">
                  ซิงก์ล่าสุดเมื่อ: {new Date(syncLog.lastSynced).toLocaleString('th-TH')}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onSyncGoogleSheets}
                  disabled={syncLog.status === 'SYNCING'}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-98"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncLog.status === 'SYNCING' ? 'animate-spin' : ''}`} />
                  <span>{syncLog.status === 'SYNCING' ? 'กำลังซิงก์...' : 'ซิงก์ข้อมูลไปที่ Google Sheets เดี๋ยวนี้'}</span>
                </button>

                {syncLog.spreadsheetUrl && (
                  <a
                    href={syncLog.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิด Google Sheet</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Offline Local JSON Backup & Restore */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0D2B52] flex items-center gap-2">
              <Download className="w-4 h-4 text-[#2563EB]" />
              <span>สำรอง & ฟื้นฟูข้อมูลไฟล์ JSON (Offline Data Backup)</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={onExportBackupJson}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-[#CBD7E6] flex items-center justify-center gap-2 transition-all shadow-2xs active:scale-98"
              >
                <Download className="w-4 h-4 text-[#2563EB]" />
                <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.json)</span>
              </button>

              <label className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-[#CBD7E6] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-98">
                <Upload className="w-4 h-4 text-[#16A394]" />
                <span>นำเข้าไฟล์สำรองข้อมูล (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportBackupJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 py-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold rounded-xl transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#0D2B52] hover:bg-[#081E3B] text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-98"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
