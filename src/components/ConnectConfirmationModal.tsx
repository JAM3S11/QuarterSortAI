import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import {
  HardDrive,
  ShieldCheck,
  Lock,
  ScanLine,
  Hash,
  Globe,
  AlertTriangle,
  Gauge,
  RefreshCw,
  Check,
} from 'lucide-react';
import { PhysicalDisk } from '../types';
import { formatSize } from '../lib/format';
import { driveLetterOf } from '../lib/diskMatch';

interface ConnectConfirmationModalProps {
  isOpen: boolean;
  disks: PhysicalDisk[];
  selectedDiskId: string;
  isMobile?: boolean;
  ocrEnabled?: boolean;
  onToggleOCR?: () => void;
  onSelectDisk: (id: string) => void;
  onRefreshDisks: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onLoadSample?: () => void;
  onDetectFromPicker?: () => void;
}

export const ConnectConfirmationModal: React.FC<ConnectConfirmationModalProps> = ({
  isOpen,
  disks,
  selectedDiskId,
  isMobile,
  ocrEnabled,
  onToggleOCR,
  onSelectDisk,
  onRefreshDisks,
  onAccept,
  onDecline,
  onLoadSample,
  onDetectFromPicker,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    if (disks.length > 0) {
      const exists = disks.some((d) => d.id === selectedDiskId);
      if (!exists) {
        const fallback = disks.find((d) => d.driveType === 'removable') ?? disks[0];
        onSelectDisk(fallback.id);
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, disks, selectedDiskId, onSelectDisk, onDecline]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,255,102,0.15)] overflow-hidden text-slate-100"
      >
        {/* Neon top bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-emerald-500/30 bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <HardDrive className="w-6 h-6 text-emerald-400 animate-pulse" />
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-full blur-sm" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-2">
                USB Drive Connection Request
              </h2>
              <p className="text-xs text-slate-400">Secure read-only indexing permission</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 bg-slate-900/50 overflow-y-auto">
          {/* Drive slot */}
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/60 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-cyan-500/20 bg-slate-950/80">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" /> Drive slot — select which drive is connecting
                </p>
                <p className="text-[11px] leading-relaxed text-slate-400 mt-0.5">
                  Pick the drive, e.g. <span className="font-mono text-slate-200">USB Drive (G:)</span> or{' '}
                  <span className="font-mono text-slate-200">Local Disk (C:)</span>. It will be auto-selected
                  and applied after the scan.
                </p>
              </div>
              <button
                onClick={onRefreshDisks}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-400 text-[10px] font-bold transition-colors shrink-0"
                title="Re-scan connected drives"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {disks.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <HardDrive className="w-5 h-5 mx-auto text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">
                  No drives detected — plug in your USB drive, then tap <span className="text-cyan-400 font-bold">Refresh</span>.
                </p>
                {onDetectFromPicker && (
                  <button
                    onClick={onDetectFromPicker}
                    className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold transition-colors"
                  >
                    <ScanLine className="w-3.5 h-3.5" />
                    Detect USB drive from this device
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2.5 space-y-1.5 max-h-48 overflow-y-auto">
                {disks.map((disk) => {
                  const checked = disk.id === selectedDiskId;
                  const letter = driveLetterOf(disk);
                  return (
                    <button
                      key={disk.id}
                      onClick={() => onSelectDisk(disk.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                        checked
                          ? 'bg-cyan-500/10 border-cyan-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <input type="radio" checked={checked} readOnly className="accent-cyan-400 shrink-0" />
                      <span
                        className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-black text-xs border ${
                          checked
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {letter || 'HD'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100 truncate">
                            {disk.label || 'Unlabelled drive'}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-bold shrink-0">
                            {disk.driveType === 'removable' ? 'Removable' : 'Fixed'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">{disk.id}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>{formatSize(disk.totalCapacityBytes)}</span>
                          <span>·</span>
                          <span>{formatSize(disk.freeBytes)} free</span>
                        </p>
                      </div>
                      {checked && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-slate-300">
              On <span className="font-bold text-slate-100">Accept</span>, your device's file chooser will
              open so you can select that drive's folder.
              {isMobile ? (
                <>
                  {' '}On this device, pick the folder you want to scan — or select individual files or a
                  folder from your Files app and everything chosen will still be indexed.
                </>
              ) : (
                <>
                  {' '}The files are read locally on your device — no upload, no modification, and no extra
                  browser permission popups.
                </>
              )}
              {' '}The drive picked in the slot above is applied automatically when the scan reports from that drive.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <Lock className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Read-Only</p>
              <p className="text-[11px] text-slate-500">Never writes to the source drive</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Privacy</p>
              <p className="text-[11px] text-slate-500">Files never leave your device</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <Hash className="w-4 h-4 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Integrity</p>
              <p className="text-[11px] text-slate-500">Every file SHA-256 hashed locally</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <Gauge className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="w-full min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Automatic capacity detection
              </p>
              <p className="text-[11px] leading-relaxed text-slate-400 mt-1">
                Real total / free / used storage is read from the drive selected in the slot (or matched by
                drive letter / label) and applied to the USB Overview. No manual entry needed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              You can connect without choosing a drive — it will just use estimated capacity. Your last picked
              drive is remembered so it shows up pre-selected next time.
            </p>
          </div>

          {/* Scan options */}
          <div className="space-y-3 pt-1">
            {onToggleOCR && (
              <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <button
                  role="switch"
                  aria-checked={ocrEnabled}
                  onClick={onToggleOCR}
                  className={`relative mt-0.5 w-10 h-5 rounded-full transition-colors shrink-0 ${ocrEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${ocrEnabled ? 'translate-x-5' : ''}`} />
                </button>
                <div className="text-xs leading-relaxed">
                  <span className="font-medium text-slate-300 group-hover:text-slate-200">Extract dates from document content (OCR)</span>
                  <p className="text-slate-600 mt-0.5">Downloads a ~4 MB engine on first scan. Reads dates inside images and scanned documents for more accurate quarter classification.</p>
                </div>
              </label>
            )}

            {onLoadSample && (
              <button
                onClick={onLoadSample}
                className="w-full text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors group"
              >
                <p className="text-xs font-medium text-slate-400 group-hover:text-slate-300">No drive? Try the demo dataset instead</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Pre-loaded with sample files to explore the dashboard without connecting anything.</p>
              </button>
            )}
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onDecline}
            className="flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 transition-colors text-xs shadow-[0_0_20px_rgba(0,255,102,0.3)]"
          >
            <ScanLine className="w-4 h-4 mr-2" />
            Accept & Connect USB
          </button>
        </div>
      </motion.div>
    </div>
  );
};