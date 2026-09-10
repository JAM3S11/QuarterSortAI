import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { CyberMatrixCanvas } from './CyberMatrixCanvas';
import { CyberScanLog } from '../types';
import { ShieldCheck, Terminal, Cpu, HardDrive, CheckCircle2, Lock, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CyberScannerModalProps {
  isOpen: boolean;
  scannedCount: number;
  folderCount: number;
  totalBytes: number;
  currentFolder: string;
  currentFileName: string;
  logs: CyberScanLog[];
  isComplete: boolean;
  onClose: () => void;
}

export const CyberScannerModal: React.FC<CyberScannerModalProps> = ({
  isOpen,
  scannedCount,
  folderCount,
  totalBytes,
  currentFolder,
  currentFileName,
  logs,
  isComplete,
  onClose,
}) => {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (isComplete && isOpen) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FF66', '#00F0FF', '#3B82F6'],
      });
    }
  }, [isComplete, isOpen]);

  if (!isOpen) return null;

  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 font-mono">
      {/* Matrix background canvas */}
      <CyberMatrixCanvas opacity={0.35} />

      {/* Scanner Container HUD */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,255,102,0.15)] overflow-y-auto text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Neon top bar */}
        <div className="px-4 sm:px-6 py-4 border-b border-emerald-500/30 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ShieldCheck className="w-6 h-6 text-emerald-400 animate-pulse" />
              <div className="absolute -inset-1 bg-emerald-500/20 rounded-full blur-sm" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-2">
                CYBER SECURITY DOCUMENT SCANNER v4.2
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </h2>
              <p className="text-xs text-slate-400">USB Virtual Indexing & SHA-256 Hash Verification</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-[0.6875rem] rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
              {isComplete ? 'SCAN COMPLETE' : 'SCANNING ACTIVE'}
            </span>
            {isComplete && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,102,0.4)]"
              >
                <CheckCircle2 className="w-4 h-4" />
                EXPLORE DASHBOARD
              </button>
            )}
          </div>
        </div>

        {/* HUD Scanner Middle Section */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/50 relative overflow-hidden shrink-0">
          {/* Animated Neon Scan Lines overlay */}
          {!isComplete && (
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,255,102,0.05)_50%,transparent_100%)] bg-[length:100%_8px] animate-pulse" />
          )}

          {/* Left Column: Rotating Hexagonal HUD & Radar Pulse */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-emerald-500/20 relative">
            <div className="relative w-36 h-36 flex items-center justify-center my-2">
              {/* Outer Hexagon ring */}
              <div
                className={`absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/50 ${
                  !isComplete ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '8s' }}
              />
              {/* Middle Cyan Ring */}
              <div
                className={`absolute inset-3 rounded-full border border-cyan-400/60 ${
                  !isComplete ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '4s', animationDirection: 'reverse' }}
              />
              {/* Radar pulse */}
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-400/40 flex items-center justify-center relative overflow-hidden">
                {!isComplete && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 to-transparent animate-spin" />
                )}
                <Cpu className="w-8 h-8 text-emerald-400 z-10" />
              </div>
            </div>

            <div className="text-center mt-2">
              <span className="text-2xl font-extrabold tracking-tight text-emerald-400">
                {scannedCount}
              </span>
              <p className="text-[0.6875rem] uppercase tracking-wider text-slate-400 mt-0.5">Scanned Documents</p>
            </div>
          </div>

          {/* Center & Right Column: Live Counters & Stats */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
              <HardDrive className="w-7 h-7 text-cyan-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase">Directories Index</p>
                <p className="text-lg font-bold text-slate-100">{folderCount} Folders</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center space-x-3">
              <Zap className="w-7 h-7 text-amber-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase">Data Processed</p>
                <p className="text-lg font-bold text-slate-100">{totalMB} MB</p>
              </div>
            </div>

            <div className="col-span-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <p className="text-[0.6875rem] text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Current Scanner Traversal
              </p>
              <p className="text-xs text-emerald-300 truncate font-mono bg-slate-900/80 px-2 py-1 rounded">
                {currentFolder || '/'}{currentFileName ? `/${currentFileName}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Terminal Logs Stream */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex-1 min-h-0 max-h-[40vh] overflow-y-auto overflow-x-hidden">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 pb-1 border-b border-slate-900">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>REAL-TIME AUDIT LOG STREAM</span>
          </div>

          <div className="space-y-1 text-[0.6875rem] font-mono leading-relaxed break-all">
            {logs.map((log, index) => {
              let color = 'text-slate-300';
              if (log.type === 'INFO') color = 'text-cyan-400';
              if (log.type === 'HASH') color = 'text-amber-300';
              if (log.type === 'QUARTER') color = 'text-emerald-400 font-bold';
              if (log.type === 'WARN') color = 'text-orange-400';
              if (log.type === 'SUCCESS') color = 'text-emerald-300 font-extrabold';

              return (
                <div key={index} className="flex space-x-2 min-w-0">
                  <span className="text-slate-600 select-none shrink-0">[{log.timestamp}]</span>
                  <span className={`${color} min-w-0 break-all`}>{log.message}</span>
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Virtual Storage Engine: Non-destructive read-only index</span>
          </div>
          {isComplete && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(0,255,102,0.3)]"
            >
              COMPLETE & VIEW EXPLORER
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
