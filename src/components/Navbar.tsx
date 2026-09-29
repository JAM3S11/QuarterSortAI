import React from 'react';
import { USBVolumeInfo } from '../types';
import { HardDrive, Search, Command,FolderPlus, Menu } from 'lucide-react';
import { UilSorting } from '@iconscout/react-unicons';

interface NavbarProps {
  volumeInfo: USBVolumeInfo | null;
  onConnectUSB: () => void;
  onGoHome: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  volumeInfo,
  onConnectUSB,
  onGoHome,
  onOpenCommandPalette,
  onToggleSidebar,
}) => {
  const usedGB = volumeInfo ? (volumeInfo.usedBytes / (1024 * 1024 * 1024)).toFixed(1) : '0';

  return (
    <header className="z-30 w-full border-b border-[#d8ceca] bg-[#faf9f7]/90 backdrop-blur-md px-4 lg:px-6 py-3 transition-colors shrink-0">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Menu (mobile) + Brand */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl border border-[#d8ceca] hover:bg-[#f2edea] text-[#542b2b] transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button onClick={onGoHome} className="flex items-center space-x-2 group min-w-0">
            <div className="hidden sm:flex p-2 rounded-xl bg-[#542b2b]/10 border border-[#542b2b]/30 text-[#542b2b] group-hover:bg-[#542b2b]/15 transition-colors">
              <UilSorting size={22} color="currentColor" />
            </div>
            <span className="font-extrabold tracking-tight text-[#542b2b] text-base sm:text-lg truncate">
              QuarterSort<span className="text-[#805d59] font-black">AI</span>
            </span>
          </button>
        </div>

        {/* Center: Search — opens command palette popup */}
        <div className="flex-1 max-w-md hidden sm:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-[#d8ceca] bg-[#fffdfc] text-[#705957] hover:text-[#542b2b] transition-colors text-xs shadow-sm"
          >
            <div className="flex items-center space-x-2 truncate">
              <Search className="w-4 h-4 text-[#805d59]" />
              <span className="truncate">Search files, quarters, SHA256 hashes...</span>
            </div>
            <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.625rem] font-mono font-medium text-[#705957] bg-[#f2edea] rounded border border-[#d8ceca]">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>
        </div>

        {/* Right: USB storage (used) + Connect USB link */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {volumeInfo && volumeInfo.capacityEstimated !== true && (
            <div
              title={`${volumeInfo.name} — storage used so far`}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#705957]"
            >
              <HardDrive className="w-4 h-4 text-[#542b2b]" />
              <span className="font-mono">
                {usedGB} <span className="text-[#9d8580] font-medium">GB used</span>
              </span>
            </div>
          )}

          <button
            onClick={onOpenCommandPalette}
            className="sm:hidden p-2 rounded-xl border border-[#d8ceca] hover:bg-[#f2edea] text-[#542b2b] transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onConnectUSB}
            className="flex items-center gap-1.5 text-sm font-bold text-[#542b2b] hover:underline underline-offset-4 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Connect USB</span>
            <span className="sm:hidden">USB</span>
          </button>
        </div>
      </div>
    </header>
  );
};