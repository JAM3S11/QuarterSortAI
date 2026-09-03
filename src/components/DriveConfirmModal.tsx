import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { HardDrive, Radio, AlertTriangle, Check } from 'lucide-react';
import { PhysicalDisk } from '../types';
import { formatSize } from '../lib/format';
import { matchPhysicalDisk } from '../lib/diskMatch';

interface DriveConfirmModalProps {
  isOpen: boolean;
  disks: PhysicalDisk[];
  scannerRootName?: string;
  onConfirm: (disk: PhysicalDisk) => void;
  onSkip: () => void;
}

export const DriveConfirmModal: React.FC<DriveConfirmModalProps> = ({
  isOpen,
  disks,
  scannerRootName,
  onConfirm,
  onSkip,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const guess = matchPhysicalDisk(disks, scannerRootName);
    setSelectedId(guess ? guess.id : (disks.find((d) => d.driveType === 'removable')?.id ?? disks[0]?.id ?? ''));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, disks, scannerRootName, onSkip]);

  if (!isOpen) return null;

  const selected = disks.find((d) => d.id === selectedId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.15)] overflow-hidden text-slate-100 flex flex-col"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-cyan-500/30 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
              <div className="absolute -inset-1 bg-cyan-500/20 rounded-full blur-sm" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-cyan-400 uppercase">
                Which USB was scanned?
              </h2>
              <p className="text-xs text-slate-400">Pick the drive to attach its real capacity</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-slate-900/50">
          {scannerRootName && (
            <p className="text-[11px] text-slate-400">
              Scanned folder root: <span className="font-mono font-bold text-slate-300">{scannerRootName}</span>
            </p>
          )}

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {disks.map((disk) => {
              const checked = disk.id === selectedId;
              return (
                <button
                  key={disk.id}
                  onClick={() => setSelectedId(disk.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    checked
                      ? 'bg-cyan-500/10 border-cyan-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <input type="radio" checked={checked} readOnly className="accent-cyan-400" />
                  <HardDrive className={`w-4 h-4 shrink-0 ${checked ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {disk.label || 'Unlabelled drive'}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-bold">
                        {disk.driveType === 'removable' ? 'Removable' : 'Fixed'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{disk.id}</span>
                    </div>
                    {disk.capacityEstimated ? (
                      <p className="text-[10px] text-slate-500 mt-0.5">Capacity unavailable</p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span>{formatSize(disk.totalCapacityBytes)}</span>
                        <span>·</span>
                        <span>{formatSize(disk.totalCapacityBytes - disk.freeBytes)} used</span>
                        <span>·</span>
                        <span>{formatSize(disk.freeBytes)} free</span>
                        {disk.filesystem && (
                          <>
                            <span>·</span>
                            <span>{disk.filesystem}</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  {checked && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              The matched drive is preselected. If you're not sure, skip to keep an estimate — "Used" is always
              the real scanned size either way.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            onClick={onSkip}
            className="flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
          >
            Skip (keep estimate)
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="flex items-center justify-center px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-extrabold hover:bg-cyan-400 transition-colors text-xs shadow-[0_0_20px_rgba(34,211,238,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4 mr-2" />
            Use this drive
          </button>
        </div>
      </motion.div>
    </div>
  );
};