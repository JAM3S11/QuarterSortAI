import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  Image as ImageIcon,
  Copy,
  HardDrive,
  BarChart3,
  BrainCircuit,
  FileText,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export type TabId = 'dashboard' | 'explorer' | 'photos' | 'duplicates' | 'usb_overview' | 'analytics' | 'ai_insights';

interface SidebarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onNavigate?: () => void;
  sidebarWidth?: number;
  onToggleCollapse?: () => void;
  totalFiles: number;
  duplicateCount: number;
  photoCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNavigate,
  sidebarWidth = 256,
  onToggleCollapse,
  totalFiles,
  duplicateCount,
  photoCount,
}) => {
  const isCollapsed = sidebarWidth <= 90;
  const menuItems: { id: TabId; label: string; icon: React.FC<{ className?: string }>; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Quarter Summary',
      icon: LayoutDashboard,
      badge: totalFiles > 0 ? totalFiles : undefined,
    },
    {
      id: 'explorer',
      label: 'Folder Explorer',
      icon: FolderTree,
    },
    {
      id: 'photos',
      label: 'Photo Gallery',
      icon: ImageIcon,
      badge: photoCount > 0 ? photoCount : undefined,
    },
    {
      id: 'duplicates',
      label: 'Duplicate Center',
      icon: Copy,
      badge: duplicateCount > 0 ? duplicateCount : undefined,
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      id: 'usb_overview',
      label: 'USB Overview',
      icon: HardDrive,
    },
    {
      id: 'analytics',
      label: 'Analytics & Trends',
      icon: BarChart3,
    },
    {
      id: 'ai_insights',
      label: 'AI Audit Report',
      icon: BrainCircuit,
      badge: 'AI',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold',
    },
  ];

  return (
    <div className="flex flex-col justify-between p-3 h-full min-h-0">
      <div className="space-y-1 overflow-y-auto overscroll-contain min-h-0 thin-scrollbar">
        {!isCollapsed && (
          <div className="px-3 py-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-[#705957] whitespace-nowrap">
            Navigation Menu
          </div>
        )}

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                onNavigate?.();
              }}
              title={item.badge !== undefined ? `${item.label} (${item.badge})` : item.label}
              className={`w-full flex items-center rounded-xl font-medium text-xs transition-all ${
                isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
              } ${
                isActive
                  ? 'bg-[#542b2b] text-[#faf9f7] border border-[#805d59]/30 font-semibold shadow-sm'
                  : 'text-[#705957] hover:bg-[#fffdfc] hover:text-[#542b2b]'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#faf9f7]' : 'text-[#9d8580]'}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-[0.625rem] rounded-full border ${
                    item.badgeColor ||
                    (isActive
                      ? 'bg-[#faf9f7] text-[#542b2b] font-bold border-transparent'
                      : 'bg-[#fffdfc] text-[#705957] border-[#d8ceca]')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box & Collapse Toggle */}
      <div className="mt-2 space-y-2 shrink-0">
        {!isCollapsed && (
          <div className="p-2.5 bg-[#fffdfc] rounded-xl border border-[#d8ceca] text-[0.6875rem] space-y-0.5 text-[#705957]">
            <div className="flex items-center space-x-1.5 font-semibold text-[#542b2b]">
              <FileText className="w-3.5 h-3.5 text-[#542b2b]" />
              <span>Non-Modifying Index</span>
            </div>
            <p className="leading-tight text-[0.625rem]">
              Files remain untouched on original storage device.
            </p>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
          aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
          className={`hidden lg:flex w-full items-center rounded-xl border border-[#d8ceca] hover:bg-[#fffdfc] text-[#705957] transition-colors py-2 ${
            isCollapsed ? 'justify-center px-2' : 'justify-start px-3'
          }`}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-4 h-4 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="w-4 h-4 shrink-0" />
              <span className="ml-2 text-xs font-medium whitespace-nowrap">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
