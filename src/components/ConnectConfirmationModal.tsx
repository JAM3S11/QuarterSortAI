import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { HardDrive, ShieldCheck, Lock, ScanLine, Hash, Globe, AlertTriangle, Gauge } from 'lucide-react';

interface ConnectConfirmationModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const ConnectConfirmationModal: React.FC<ConnectConfirmationModalProps> = ({ isOpen, onAccept, onDecline }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDecline();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,255,102,0.15)] overflow-hidden text-slate-100 flex flex-col"
      >
        {/* Neon top bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-emerald-500/30 bg-slate-950/80">
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
        <div className="p-6 space-y-4 bg-slate-900/50">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <Globe className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-slate-300">
              On <span className="font-bold text-slate-100">Accept</span>, your device's file chooser will
              open so you can select your USB drive folder. The files are read locally on your device —
              no upload, no modification, and no extra browser permission popups.
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
                Real total / free / used storage is read from your system automatically after the scan and applied
                to the USB Overview. No manual entry needed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              On some devices selecting a folder opens the standard file browser. You can cancel anytime
              to decline connecting.
            </p>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
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