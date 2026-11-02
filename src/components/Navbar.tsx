import React, { useState } from 'react';
import {
  Cloud,
  Settings,
  Bell,
  ChevronDown,
  FileSpreadsheet,
  Search,
  Menu,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { SellerProfile, SyncLog } from '../types';
import { User } from 'firebase/auth';

export type TabType = 'dashboard' | 'documents' | 'orders' | 'products' | 'expenses' | 'customers' | 'reports';
export type ActiveTab = TabType;

interface NavbarProps {
  seller: SellerProfile;
  syncLog: SyncLog;
  isOnline: boolean;
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenSettings: () => void;
  onSyncGoogleSheets: () => void;
  lowStockCount: number;
  orderAlertCount?: number;
  onOpenMobileMenu?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  syncLog,
  isOnline,
  onChangeTab,
  onOpenSettings,
  onSyncGoogleSheets,
  lowStockCount,
  orderAlertCount = 0,
  onOpenMobileMenu,
  currentUser,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Derive display initials
  const initials = currentUser?.displayName
    ? currentUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : currentUser?.email
    ? currentUser.email.slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E4E4E7] text-[#18181B] shadow-2xs h-16 flex items-center px-4 sm:px-6">
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 text-[#18181B] hover:bg-zinc-100 rounded-lg transition-colors shrink-0"
            aria-label="Open Navigation"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar matching image */}
          <div className="relative w-full hidden sm:block">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาลูกค้า, สินค้า, เอกสาร..."
              className="w-full pl-10 pr-16 py-2 bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg text-xs text-[#18181B] placeholder-zinc-400 focus:outline-none focus:border-[#27272A] focus:bg-white transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded shadow-2xs">
              Ctrl + K
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Online/Offline Pill */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isOnline
                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#003BB3] inline-block animate-pulse"></span>
            <span>ออนไลน์</span>
          </div>

          {/* Sync to Google Sheets Button */}
          <button
            onClick={onSyncGoogleSheets}
            disabled={syncLog.status === 'SYNCING'}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs font-extrabold transition-all shadow-2xs disabled:opacity-50 active:scale-98"
            title="เชื่อมต่อ Google Sheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#15803D]" />
            <span className="hidden sm:inline">
              {syncLog.status === 'SYNCING' ? 'กำลังส่ง...' : 'เชื่อมต่อ Google Sheet'}
            </span>
          </button>

          {/* Bell Notifications */}
          <div
            className="relative cursor-pointer p-2 rounded-lg hover:bg-zinc-100 text-[#18181B] transition-colors"
            onClick={() => (orderAlertCount > 0 ? onChangeTab('orders') : onOpenSettings())}
            title={orderAlertCount > 0 ? `แจ้งเตือนประกัน ${orderAlertCount} รายการ` : 'การแจ้งเตือน'}
          >
            <Bell className="w-5 h-5 text-[#18181B]" />
            {lowStockCount + orderAlertCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#003BB3] text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                {lowStockCount + orderAlertCount}
              </span>
            )}
          </div>

          {/* Settings Gear */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-zinc-100 text-[#18181B] transition-colors"
            title="ตั้งค่าระบบ"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* User Avatar Pill & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-zinc-100 border-l border-zinc-200 transition-colors text-left"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#003BB3] text-white font-black text-xs flex items-center justify-center shadow-xs">
                  {initials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[#18181B] leading-tight truncate max-w-[120px]">
                  {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                  {currentUser?.email || 'เจ้าของร้าน'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500 hidden sm:block ml-0.5" />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsUserMenuOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-zinc-100 py-2 z-30 animate-fadeIn">
                  <div className="px-4 py-2.5 border-b border-zinc-100">
                    <div className="text-xs font-bold text-zinc-800 truncate">
                      {currentUser?.displayName || 'เจ้าของร้าน'}
                    </div>
                    <div className="text-[11px] text-zinc-400 font-medium truncate">
                      {currentUser?.email}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>ตั้งค่าร้านค้า</span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-zinc-50 transition-colors border-t border-zinc-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>ออกจากระบบ (Log Out)</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
