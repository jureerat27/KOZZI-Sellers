import React from 'react';
import {
  Home,
  FileText,
  Package,
  Wallet,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  X,
  ClipboardList,
} from 'lucide-react';
import { SellerProfile } from '../types';
import { KOZZI_LOGO } from '../assets/kozziLogo';
import { ActiveTab } from './Navbar';
import { User } from 'firebase/auth';

interface SidebarProps {
  seller?: SellerProfile;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  lowStockCount: number;
  orderAlertCount?: number;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  seller,
  activeTab,
  onChangeTab,
  lowStockCount,
  orderAlertCount = 0,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
  currentUser,
  onLogout,
}) => {
  const navTabs: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'ภาพรวม', icon: Home },
    { id: 'documents', label: 'เอกสารขาย', icon: FileText },
    { id: 'orders', label: 'ออเดอร์ & งานติดตั้ง', icon: ClipboardList, badge: orderAlertCount },
    { id: 'products', label: 'คลังสินค้า', icon: Package, badge: lowStockCount },
    { id: 'expenses', label: 'รายจ่าย', icon: Wallet },
    { id: 'customers', label: 'ลูกค้า', icon: Users },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
  ];

  const handleSelect = (tab: ActiveTab) => {
    onChangeTab(tab);
    onCloseMobile();
  };

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

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-zinc-200 text-zinc-800 p-4 w-64 select-none">
      {/* Top Logo Section */}
      <div>
        <div className="flex items-start justify-between pb-5 pt-2 border-b border-zinc-200 px-2">
          <div className="min-w-0">
            <img src={KOZZI_LOGO} alt="KOZZI" className="h-9 w-auto" />
            <div className="mt-2 font-extrabold text-lg tracking-tight text-zinc-900 leading-tight">SellersApp</div>
            <div className="text-xs text-zinc-500 font-medium">ระบบขายสินค้าและใบเสร็จ</div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-5 space-y-1.5">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-[15px] transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EAF1FF] text-[#003BB3] font-bold'
                    : 'text-zinc-800 font-semibold hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-[#003BB3] stroke-[2.25]' : 'text-zinc-700 stroke-[1.75]'
                    }`}
                  />
                  <span>{tab.label}</span>
                </div>

                {tab.badge && tab.badge > 0 ? (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-[#003BB3] text-white text-[11px] font-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 pt-4 border-t border-zinc-200">
        {/* User Account Bar */}
        <div
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'User'}
                className="w-9 h-9 rounded-full object-cover border border-zinc-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#003BB3] text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-zinc-900 leading-tight truncate">
                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Admin'}
              </div>
              <div className="text-[11px] text-zinc-500 font-medium truncate">
                {currentUser?.email || 'เจ้าของร้าน'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
        </div>

        {/* Settings & Logout Actions */}
        <div className="pt-1 space-y-1">
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5 text-zinc-700 stroke-[1.75]" />
            <span>ตั้งค่า</span>
          </button>
          {onLogout && (
            <button
              onClick={() => {
                onCloseMobile();
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-red-500 stroke-[1.75]" />
              <span>ออกจากระบบ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:block fixed top-0 bottom-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          ></div>
          <div className="relative z-10">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};
