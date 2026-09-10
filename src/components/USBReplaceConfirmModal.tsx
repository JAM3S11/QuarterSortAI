import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { PlugZap, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

interface USBReplaceConfirmModalProps {
  isOpen: boolean;
  currentDriveName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const USBReplaceConfirmModal: React.FC<USBReplaceConfirmModalProps> = ({
  isOpen,
  currentDriveName,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-slate-900/95 border border-slate-700 rounded-2xl shadow-[0_0_50px_rgba(14,165,233,0.15)] overflow-hidden text-slate-100 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <PlugZap className="w-6 h-6 text-sky-400" />
              <div className="absolute -inset-1 bg-sky-500/20 rounded-full blur-sm" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide text-slate-100">
                Connect a Different USB Drive
              </h2>
              <p className="text-xs text-slate-400">Please confirm before switching drives</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3 bg-slate-900/50">
          <p className="text-sm leading-relaxed text-slate-200">
            Are you sure you want to remove the current drive
            {currentDriveName ? (
              <>
                {' '}
                <span className="font-mono font-bold text-sky-300">“{currentDriveName}”</span>{' '}
              </>
            ) : (
              ' currently in use '
            )}
            and connect another USB drive instead?
          </p>

          <p className="text-xs leading-relaxed text-slate-400">
            The current drive's index will be removed from this view, and its files will no longer be
            shown until you connect it again. No files on the drive are changed or deleted — this only
            affects what is displayed here.
          </p>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[0.6875rem] leading-relaxed text-amber-200/90">
              If you are still working with the current drive, choose "No" to keep everything as it is.
            </p>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="flex items-center justify-center px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
          >
            <XCircle className="w-4 h-4 mr-2" />
            No, Keep the Current Drive
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-extrabold transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Yes, Connect Another USB
          </button>
        </div>
      </motion.div>
    </div>
  );
};