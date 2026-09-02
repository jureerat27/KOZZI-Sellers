import React from 'react';
import { Phone, Mail } from 'lucide-react';
import { SellerProfile } from '../types';

export interface DocumentHeaderProps {
  seller: SellerProfile;
  titleThai: string;
  titleEnglish: string;
  brandSubtitle?: string;
  className?: string;
  showDivider?: boolean;
  showEntrepreneurAndTaxId?: boolean;
  showStoreName?: boolean;
  showPhoneAndEmail?: boolean;
  compact?: boolean;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  seller,
  titleThai,
  titleEnglish,
  brandSubtitle,
  className = '',
  showDivider = true,
  showEntrepreneurAndTaxId,
  showStoreName = true,
  showPhoneAndEmail = true,
  compact = false,
}) => {
  // 1. Dynamic Store Name from latest Merchant Profile
  const storeName =
    brandSubtitle?.trim() ||
    seller.businessName?.trim() ||
    seller.name?.trim() ||
    'KOZZI ราวตากผ้าอัจฉริยะ';

  // 2. Dynamic Entrepreneur Name from latest Merchant Profile
  const entrepreneurName =
    seller.ownerName?.trim() ||
    seller.bankAccountName?.trim() ||
    (seller.name && !seller.name.includes('KOZZI') ? seller.name.trim() : 'นางสาวจุรีรัตน์ มั่นคง');

  // 3. Dynamic Tax ID, Address, Phone, Email
  const taxIdNumber = seller.taxId?.trim() || '1100200300401';
  const addressText =
    seller.address?.trim() || '59/179 หมู่ 5 ตำบลลาดสวาย อำเภอลำลูกกา จังหวัดปทุมธานี 12150';
  const phoneText = seller.phone?.trim() || '064-651-8822';
  const emailText = seller.email?.trim() || 'kozzi.th@gmail.com';

  // 4. Determine visibility of Entrepreneur Name & Tax ID
  // Shown ONLY for Payment Voucher (ใบสำคัญจ่าย) and Receipt (ใบเสร็จรับเงิน)
  const shouldShowTaxAndOwner =
    showEntrepreneurAndTaxId !== undefined
      ? showEntrepreneurAndTaxId
      : titleEnglish.toUpperCase() === 'PAYMENT VOUCHER' ||
        titleEnglish.toUpperCase() === 'RECEIPT' ||
        titleThai.includes('ใบสำคัญจ่าย') ||
        titleThai.includes('ใบเสร็จรับเงิน');

  return (
    <div className={`w-full ${className}`}>
      {/* Top Header Section */}
      <div className={`flex flex-row justify-between items-start ${compact ? 'gap-2' : 'gap-4'}`}>
        {/* Left Side: Logo + Store Name on Top, and Lines starting from the Far-Left under Logo */}
        <div className={`flex-1 min-w-0 ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
          {/* Row 1: Logo on Left + Store Name on the Right of Logo */}
          <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
            {seller.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt={storeName}
                className={`${compact ? 'h-8 max-w-[110px]' : 'h-10 max-w-[140px]'} w-auto object-contain shrink-0`}
              />
            ) : showStoreName ? (
              <div className={`${compact ? 'h-8 px-2.5 text-xs' : 'h-10 px-3.5 text-base'} rounded-xl bg-sky-100 border border-sky-300 text-[#0D2B52] flex items-center justify-center font-black tracking-wider shrink-0`}>
                {storeName.split(' ')[0] || 'KOZZI'}
              </div>
            ) : null}
            {showStoreName && (
              <span className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} font-black text-[#0D2B52] leading-tight truncate`}>
                {storeName}
              </span>
            )}
          </div>

          {/* Details below Logo: Address, Phone, Email, and optionally Entrepreneur/Tax ID for Payment Voucher & Receipt */}
          <div className={`space-y-0.5 ${compact ? 'text-[11px] leading-tight pt-0.5' : 'text-xs text-slate-600 pt-1'}`}>
            {shouldShowTaxAndOwner && (
              <>
                <p className="font-semibold text-slate-800">
                  ชื่อผู้ประกอบการ : {entrepreneurName}
                </p>
                <p className="text-slate-600">
                  เลขประจำตัวผู้เสียภาษีอากร : {taxIdNumber}
                </p>
              </>
            )}
            <p className="text-slate-600 leading-snug">
              {addressText}
            </p>
            {showPhoneAndEmail && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-0.5 text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Phone className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-[#0D2B52] shrink-0`} />
                  <span>{phoneText}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 font-medium">
                  <Mail className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-[#0D2B52] shrink-0`} />
                  <span>{emailText}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Document Title Frame & English Title below */}
        <div className="flex flex-col items-end shrink-0 pl-2">
          {/* Light Blue Box for Title */}
          <div className={`bg-[#E0F2FE] border border-[#7DD3FC] ${compact ? 'px-3.5 py-1.5 min-w-[140px] rounded-lg' : 'px-6 py-2 min-w-[170px] rounded-xl'} text-center`}>
            <h1 className={`${compact ? 'text-sm' : 'text-base sm:text-xl'} font-black tracking-wide text-[#0D2B52] leading-tight`}>
              {titleThai}
            </h1>
          </div>
          {/* English Title text outside the box below, centered with the box */}
          <div className={`${compact ? 'text-[9px] mt-0.5 w-[140px]' : 'text-[11px] mt-1.5 w-[170px]'} font-black tracking-widest text-[#0D2B52] uppercase text-center`}>
            {titleEnglish}
          </div>
        </div>
      </div>

      {/* Full-Width Horizontal Navy Blue Accent Divider Line */}
      {showDivider && <div className={`h-[1.5px] bg-[#0D2B52] w-full ${compact ? 'my-2' : 'my-4'}`} />}
    </div>
  );
};
