import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Package,
  Receipt,
  Users,
  BarChart3,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'documents'
  | 'products'
  | 'expenses'
  | 'customers'
  | 'reports';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  lowStockCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  lowStockCount,
}) => {
  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'documents' as ActiveTab, label: 'เอกสารขาย', icon: FileText },
    {
      id: 'products' as ActiveTab,
      label: 'คลังสินค้า',
      icon: Package,
      badge: lowStockCount,
    },
    { id: 'expenses' as ActiveTab, label: 'รายจ่าย', icon: Receipt },
    { id: 'customers' as ActiveTab, label: 'ลูกค้า', icon: Users },
    { id: 'reports' as ActiveTab, label: 'รายงาน', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 text-slate-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-2 flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-all ${
                isActive
                  ? 'text-[#FF4F87] font-bold scale-105'
                  : 'hover:text-slate-700 text-slate-500'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'stroke-[2.5] text-[#FF4F87]' : 'stroke-2 text-slate-400'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-[#FF4F87] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[65px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-7 h-1 bg-[#FF4F87] rounded-full shadow-2xs"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
