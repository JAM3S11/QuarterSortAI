import React, { useEffect, useRef } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowRight, Check, Cpu, Gauge, HardDrive, Terminal } from 'lucide-react';
import { CyberScanLog } from '../types';

/* Shares the landing page's editorial palette (this modal opens from it):
     paper #faf9f7   ink #542b2b   body #705957   rule #d8ceca   stroke #9d8580   ring #805d59 */

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

const focusRing =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#542b2b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f7]';

// Log line colours, kept inside the palette. Warnings need to stand out, so they
// get a terracotta that still reads on paper (≈5.6:1).
const LOG_STYLES: Record<CyberScanLog['type'], string> = {
  INFO: 'text-[#705957]',
  SCAN: 'text-[#705957]',
  HASH: 'text-[#805d59]',
  QUARTER: 'font-medium text-[#542b2b]',
  WARN: 'text-[#a4472f]',
  SUCCESS: 'font-semibold text-[#542b2b]',
};

const Stat: React.FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({
  icon: Icon, label, children,
}) => (
  <div className="flex items-center gap-4 bg-[#faf9f7] p-5">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#805d59]">
      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
    </span>
    <div className="min-w-0">
      <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">{label}</p>
      <p className="mt-1 font-display text-xl tabular-nums">{children}</p>
    </div>
  </div>
);

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
  const logRef = useRef<HTMLDivElement | null>(null);
  const doneButtonRef = useRef<HTMLButtonElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Follow the newest line inside the log box only — scrollIntoView would also
    // scroll the panel and push the counters out of view on small screens.
    const el = logRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [logs, reduceMotion]);

  useEffect(() => {
    if (!isComplete || !isOpen) return;
    // Hand keyboard focus to the way forward as soon as it exists.
    doneButtonRef.current?.focus();
    if (reduceMotion) return;
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#542b2b', '#805d59', '#9d8580', '#d8ceca'],
    });
  }, [isComplete, isOpen, reduceMotion]);

  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const path = currentFileName ? `${(currentFolder || '').replace(/\/$/, '')}/${currentFileName}` : currentFolder || '/';

  return (
    // A scan can't be dismissed mid-way; once complete, Escape / outside click continue to the dashboard.
    <Dialog open={isOpen} onClose={isComplete ? onClose : () => {}} className="relative z-50">
      {/* The dashboard fills in behind this as files are hashed, so the scrim is a
          frosted paper wash: it reads the same over the landing page or the dashboard. */}
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[#faf9f7]/85 backdrop-blur-md transition-opacity duration-300 ease-out data-closed:opacity-0 motion-reduce:transition-none"
      />

      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          transition
          className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-md border border-[#d8ceca] bg-[#faf9f7] text-[#542b2b] shadow-[0_24px_60px_-20px_rgba(84,43,43,0.35)] transition duration-300 ease-out data-closed:translate-y-4 data-closed:opacity-0 motion-reduce:transition-none sm:rounded-sm"
        >
          {/* Progress rule: a travelling segment while scanning, solid once complete. */}
          <div className="relative h-0.5 w-full shrink-0 overflow-hidden bg-[#d8ceca]" aria-hidden>
            {isComplete ? (
              <div className="absolute inset-0 bg-[#542b2b]" />
            ) : (
              <motion.div
                className="absolute inset-y-0 w-1/4 bg-[#542b2b]"
                initial={{ x: '-100%' }}
                animate={reduceMotion ? { x: '150%' } : { x: ['-100%', '400%'] }}
                transition={reduceMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </div>

          {/* ---------- Header ---------- */}
          <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 border-b border-[#d8ceca] px-5 py-5 sm:px-8 sm:py-6">
            <div className="min-w-0">
              <p className="flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">
                <span className="font-mono">(01)</span>
                <span className="h-px w-6 bg-[#d8ceca]" aria-hidden />
                USB scan
              </p>
              <DialogTitle className="mt-3 font-display text-2xl font-normal leading-tight tracking-tight sm:text-[1.75rem]">
                Cyber security document scanner
                <span className="ml-2 align-middle font-mono text-xs text-[#805d59]">v4.2</span>
              </DialogTitle>
              <p className="mt-1.5 text-sm text-[#705957]">USB virtual indexing &amp; SHA-256 hash verification</p>
            </div>

            <div className="flex items-center gap-3">
              <span
                role="status"
                className="inline-flex items-center gap-2 rounded-full border border-[#d8ceca] px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.15em]"
              >
                {isComplete ? (
                  <Check className="h-3 w-3 text-[#542b2b]" aria-hidden />
                ) : (
                  <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#542b2b] motion-reduce:animate-none" />
                )}
                {isComplete ? 'Scan complete' : 'Scanning active'}
              </span>
            </div>
          </header>

          {/* ---------- Body (scrolls on short screens) ---------- */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Readouts: hairline-divided cells, like the Privacy grid */}
            <div className="grid grid-cols-2 gap-px border-b border-[#d8ceca] bg-[#d8ceca] md:grid-cols-3">
              <div className="col-span-2 flex flex-col items-center justify-center bg-[#faf9f7] px-5 py-6 md:col-span-1 md:row-span-2">
                <div className="relative flex h-32 w-32 items-center justify-center" aria-hidden>
                  <div
                    className={`absolute inset-0 rounded-full border border-dashed border-[#9d8580] ${
                      isComplete ? '' : 'animate-spin motion-reduce:animate-none'
                    }`}
                    style={{ animationDuration: '8s' }}
                  />
                  <div
                    className={`absolute inset-3 rounded-full border border-[#805d59]/60 ${
                      isComplete ? '' : 'animate-spin motion-reduce:animate-none'
                    }`}
                    style={{ animationDuration: '4s', animationDirection: 'reverse' }}
                  />
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#805d59] bg-[#faf9f7]">
                    {!isComplete && (
                      <div
                        className="absolute inset-0 animate-spin bg-[conic-gradient(from_0deg,rgba(128,93,89,0.28),transparent_45%)] motion-reduce:animate-none"
                        style={{ animationDuration: '2s' }}
                      />
                    )}
                    <Cpu className="relative h-6 w-6" strokeWidth={1.5} />
                  </div>
                </div>
                <p className="mt-4 font-display text-4xl tabular-nums">{scannedCount}</p>
                <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">Scanned documents</p>
              </div>

              <Stat icon={HardDrive} label="Directories indexed">
                {folderCount} <span className="text-sm text-[#705957]">{folderCount === 1 ? 'folder' : 'folders'}</span>
              </Stat>
              <Stat icon={Gauge} label="Data processed">
                {totalMB} <span className="text-sm text-[#705957]">MB</span>
              </Stat>

              <div className="col-span-2 bg-[#faf9f7] p-5">
                <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">Current traversal</p>
                <p className="mt-2 truncate rounded-sm bg-[#f3efeb] px-3 py-2 font-mono text-xs" title={path}>
                  {path}
                </p>
              </div>
            </div>

            {/* Audit log */}
            <section aria-labelledby="scan-log-heading" className="px-5 py-5 sm:px-8">
              <h3
                id="scan-log-heading"
                className="flex items-center gap-2 text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]"
              >
                <Terminal className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                Real-time audit log stream
              </h3>

              {/* Focusable so keyboard users can scroll it (and so the dialog always has a focus target mid-scan). */}
              <div
                ref={logRef}
                role="log"
                aria-live="off"
                aria-labelledby="scan-log-heading"
                tabIndex={0}
                className={`mt-3 max-h-[34dvh] min-h-24 overflow-y-auto overflow-x-hidden rounded-sm border border-[#d8ceca] bg-[#f3efeb]/60 p-3 sm:p-4 ${focusRing}`}
              >
                <div className="space-y-1 font-mono text-[0.6875rem] leading-relaxed">
                  {logs.map((log, index) => (
                    <div key={index} className="flex min-w-0 gap-2">
                      <span className="shrink-0 select-none text-[#805d59]">[{log.timestamp}]</span>
                      <span className={`min-w-0 break-all ${LOG_STYLES[log.type] ?? LOG_STYLES.INFO}`}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* ---------- Footer ---------- */}
          <footer className="flex flex-col gap-3 border-t border-[#d8ceca] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="flex items-center gap-2 text-xs text-[#705957]">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#805d59]" />
              Virtual storage engine: non-destructive read-only index
            </p>
            {isComplete && (
              <button
                ref={doneButtonRef}
                type="button"
                onClick={onClose}
                className={`group inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-[#542b2b] px-6 text-sm text-[#faf9f7] transition-colors hover:bg-[#6b3a3a] sm:w-auto ${focusRing}`}
              >
                Complete &amp; view explorer
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </button>
            )}
          </footer>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
