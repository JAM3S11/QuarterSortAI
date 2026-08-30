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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  totalFiles: number;
  duplicateCount: number;
  photoCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
  totalFiles,
  duplicateCount,
  photoCount,
}) => {
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
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">
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
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? '' : 'space-x-3'}`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full border ${
                    item.badgeColor ||
                    (isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold border-transparent'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700')
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
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 text-[11px] space-y-0.5 text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <FileText className="w-3.5 h-3.5 text-emerald-500" />
              <span>Non-Modifying Index</span>
            </div>
            <p className="leading-tight text-[10px]">
              Files remain untouched on original storage device.
            </p>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
          aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
          className={`hidden lg:flex w-full items-center rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors py-2 ${
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
