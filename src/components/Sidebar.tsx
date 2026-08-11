import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Package,
  Wallet,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Crown,
  ChevronRight,
  ShoppingBag,
  X,
} from 'lucide-react';
import { SellerProfile } from '../types';
import { ActiveTab } from './Navbar';

interface SidebarProps {
  seller?: SellerProfile;
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  lowStockCount: number;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  seller,
  activeTab,
  onChangeTab,
  lowStockCount,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navTabs: { id: ActiveTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'documents', label: 'เอกสารขาย', icon: FileText },
    { id: 'products', label: 'คลังสินค้า', icon: Package, badge: lowStockCount },
    { id: 'expenses', label: 'รายจ่าย', icon: Wallet },
    { id: 'customers', label: 'ลูกค้า', icon: Users },
    { id: 'reports', label: 'รายงาน', icon: BarChart3 },
  ];

  const handleSelect = (tab: ActiveTab) => {
    onChangeTab(tab);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-gradient-to-b from-[#0A203F] via-[#0D2B52] to-[#0A1D38] text-white p-4 w-64 select-none">
      {/* Top Logo Section */}
      <div>
        <div className="flex items-center justify-between pb-6 pt-2 border-b border-white/10 px-2">
          <div className="flex items-center gap-3">
            {seller?.logoUrl ? (
              <img
                src={seller.logoUrl}
                alt={seller.name || 'Store Logo'}
                className="max-h-10 w-auto max-w-[100px] object-contain shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#1D63B8] border border-blue-400/30 text-white flex items-center justify-center font-black shadow-md shrink-0">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <div className="font-extrabold text-lg tracking-tight text-white leading-tight">
                SellersApp
              </div>
              <div className="text-[11px] text-slate-300/80 font-medium tracking-wide">
                ระบบขายสินค้าและใบเสร็จ
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
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
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#18539B] text-white shadow-md border border-blue-400/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white stroke-[2.5]' : 'text-slate-300 stroke-2'
                    }`}
                  />
                  <span>{tab.label}</span>
                </div>

                {tab.badge && tab.badge > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-[#18539B] border border-blue-300 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {/* User Account Bar */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#18539B] text-white font-extrabold text-xs flex items-center justify-center border border-white/20">
              AD
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight">Admin</div>
              <div className="text-[10px] text-slate-400 font-medium">เจ้าของร้าน</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Settings & Logout Actions */}
        <div className="pt-1 space-y-1">
          <button
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>ตั้งค่า</span>
          </button>
          <button
            onClick={() => alert('คุณได้ออกจากระบบเรียบร้อยแล้ว')}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden lg:block fixed top-0 bottom-0 left-0 z-30 shadow-xl">
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
