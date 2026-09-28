import React, { useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  ArrowRight,
  Database,
  HardDrive,
  Laptop,
  RefreshCw,
  ScanLine,
  X,
} from 'lucide-react';
import { PhysicalDisk } from '../types';
import { formatSize } from '../lib/format';
import { driveLetterOf } from '../lib/diskMatch';

/* Shares the landing page's editorial palette (this modal always opens over it):
     paper #faf9f7   ink #542b2b   body #705957   rule #d8ceca   stroke #9d8580   ring #805d59 */

interface ConnectConfirmationModalProps {
  isOpen: boolean;
  disks: PhysicalDisk[];
  selectedDiskId: string;
  isRefreshing?: boolean;
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

const focusRing =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#542b2b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f7]';

const DATA_PATH = [
  { icon: HardDrive, title: 'Your drive', meta: 'Opened read-only' },
  { icon: Laptop, title: 'Your browser', meta: 'SHA-256 · classify · preview' },
  { icon: Database, title: 'Local index', meta: 'IndexedDB on this device' },
];

const SectionLabel: React.FC<{ index: string; children: React.ReactNode }> = ({ index, children }) => (
  <p className="flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">
    <span className="font-mono">({index})</span>
    <span className="h-px w-6 bg-[#d8ceca]" aria-hidden />
    {children}
  </p>
);

export const ConnectConfirmationModal: React.FC<ConnectConfirmationModalProps> = ({
  isOpen,
  disks,
  selectedDiskId,
  isRefreshing,
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
  // Keep a valid drive selected: prefer a removable drive when the current
  // selection is no longer among the detected disks.
  useEffect(() => {
    if (!isOpen || disks.length === 0) return;
    if (!disks.some((d) => d.id === selectedDiskId)) {
      const fallback = disks.find((d) => d.driveType === 'removable') ?? disks[0];
      onSelectDisk(fallback.id);
    }
  }, [isOpen, disks, selectedDiskId, onSelectDisk]);

  return (
    // Headless UI handles Escape, outside click, focus trapping and returning
    // focus to the "Scan a drive" button that opened the dialog.
    <Dialog open={isOpen} onClose={onDecline} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[#542b2b]/25 backdrop-blur-sm transition-opacity duration-300 ease-out data-closed:opacity-0 motion-reduce:transition-none"
      />

      <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
        <DialogPanel
          transition
          className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-md border border-[#d8ceca] bg-[#faf9f7] text-[#542b2b] shadow-[0_24px_60px_-20px_rgba(84,43,43,0.35)] transition duration-300 ease-out data-closed:translate-y-4 data-closed:opacity-0 motion-reduce:transition-none sm:rounded-sm"
        >
          {/* ---------- Header ---------- */}
          <header className="flex items-start justify-between gap-4 border-b border-[#d8ceca] px-5 py-5 sm:px-8 sm:py-6">
            <div>
              <SectionLabel index="01">USB drive connection</SectionLabel>
              <DialogTitle className="mt-3 font-display text-2xl font-normal tracking-tight sm:text-[1.75rem]">
                Allow read-only access?
              </DialogTitle>
              <p className="mt-1.5 text-sm text-[#705957]">
                QuarterSort will index the drive you choose. Nothing on it is changed.
              </p>
            </div>
            <button
              type="button"
              onClick={onDecline}
              aria-label="Close"
              className={`-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d8ceca] transition-colors hover:border-[#542b2b] ${focusRing}`}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </header>

          {/* ---------- Body ---------- */}
          <div className="space-y-7 overflow-y-auto px-5 py-6 sm:px-8">
            {/* Drive selection */}
            <section aria-labelledby="connect-drive-heading">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 id="connect-drive-heading" className="font-display text-base">Drive</h3>
                  <p className="mt-0.5 text-xs text-[#705957]">
                    Pick the drive that's connecting, e.g. <span className="font-mono">USB Drive (G:)</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onRefreshDisks}
                  disabled={isRefreshing}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d8ceca] px-3 py-1.5 text-xs transition-colors hover:border-[#542b2b] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden />
                  {isRefreshing ? 'Syncing…' : 'Refresh'}
                </button>
              </div>

              <div className="mt-3 rounded-sm border border-[#d8ceca]">
                {disks.length === 0 ? (
                  <div className="px-4 py-7 text-center" aria-live="polite">
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#9d8580] motion-reduce:animate-none" aria-hidden />
                        <p className="text-sm text-[#705957]">Looking for connected drives…</p>
                      </>
                    ) : (
                      <>
                        <HardDrive className="mx-auto mb-2 h-5 w-5 text-[#9d8580]" strokeWidth={1.5} aria-hidden />
                        <p className="text-sm text-[#705957]">
                          No drives detected. Plug in your USB drive, then press <span className="text-[#542b2b]">Refresh</span>.
                        </p>
                      </>
                    )}
                    {onDetectFromPicker && !isRefreshing && (
                      <button
                        type="button"
                        onClick={onDetectFromPicker}
                        className={`mt-4 inline-flex items-center gap-2 rounded-full border border-[#542b2b] px-4 py-2 text-xs transition-colors hover:bg-[#542b2b] hover:text-[#faf9f7] ${focusRing}`}
                      >
                        <ScanLine className="h-3.5 w-3.5" aria-hidden />
                        Detect USB drive from this device
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    role="radiogroup"
                    aria-labelledby="connect-drive-heading"
                    className="max-h-52 divide-y divide-[#d8ceca] overflow-y-auto"
                  >
                    {disks.map((disk) => {
                      const checked = disk.id === selectedDiskId;
                      const letter = driveLetterOf(disk);
                      return (
                        <button
                          key={disk.id}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          onClick={() => onSelectDisk(disk.id)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#542b2b] ${
                            checked ? 'bg-[#f3efeb]' : 'hover:bg-[#f7f4f1]'
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              checked ? 'border-[#542b2b]' : 'border-[#9d8580]'
                            }`}
                          >
                            {checked && <span className="h-2 w-2 rounded-full bg-[#542b2b]" />}
                          </span>
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${
                              checked ? 'border-[#542b2b] bg-[#542b2b] text-[#faf9f7]' : 'border-[#d8ceca]'
                            }`}
                          >
                            {letter || 'HD'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm">{disk.label || 'Unlabelled drive'}</span>
                              <span className="shrink-0 rounded-full border border-[#d8ceca] px-2 py-0.5 text-[0.625rem] uppercase tracking-wider text-[#705957]">
                                {disk.driveType === 'removable' ? 'Removable' : 'Fixed'}
                              </span>
                            </span>
                            <span className="mt-0.5 block font-mono text-[0.6875rem] text-[#705957]">
                              {disk.capacityEstimated
                                ? 'Capacity unavailable'
                                : `${formatSize(disk.totalCapacityBytes)} · ${formatSize(disk.freeBytes)} free`}
                              <span className="text-[#9d8580]"> · {disk.id}</span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#705957]">
                Its real capacity is applied to the USB Overview after the scan. You can also continue without
                choosing — capacity will be estimated, and your pick is remembered for next time.
              </p>
            </section>

            {/* What happens on accept */}
            <section aria-labelledby="connect-flow-heading" className="rounded-sm border border-[#d8ceca] p-5">
              <h3 id="connect-flow-heading" className="text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">
                What happens next
              </h3>
              <ol className="relative mt-4 space-y-3.5">
                <span aria-hidden className="absolute bottom-[18px] left-[18px] top-[18px] w-px bg-[#d8ceca]" />
                {DATA_PATH.map(({ icon: Icon, title, meta }) => (
                  <li key={title} className="relative flex items-center gap-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#805d59] bg-[#faf9f7]">
                      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </span>
                    <span>
                      <span className="block font-display text-sm">{title}</span>
                      <span className="block font-mono text-[0.6875rem] text-[#705957]">{meta}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 border-t border-dashed border-[#d8ceca] pt-3 text-xs leading-relaxed text-[#705957]">
                {isMobile
                  ? 'Your file chooser opens next. Pick the folder to scan — or select individual files or a folder from your Files app, and everything chosen is indexed.'
                  : 'Your file chooser opens next so you can select the drive’s folder. Files are read on this device — no upload, no changes and no extra permission prompts.'}
              </p>
            </section>

            {/* Options */}
            {(onToggleOCR || onLoadSample) && (
              <section className="divide-y divide-[#d8ceca] border-y border-[#d8ceca]">
                {onToggleOCR && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!ocrEnabled}
                    onClick={onToggleOCR}
                    className={`flex w-full items-start gap-4 py-4 text-left ${focusRing}`}
                  >
                    <span className="flex-1">
                      <span className="block text-sm">Read dates inside documents (OCR)</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-[#705957]">
                        More accurate quarters for images and scanned documents. Downloads a ~4 MB engine on first scan.
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
                        ocrEnabled ? 'border-[#542b2b] bg-[#542b2b]' : 'border-[#9d8580] bg-transparent'
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full transition-transform motion-reduce:transition-none ${
                          ocrEnabled ? 'translate-x-4 bg-[#faf9f7]' : 'bg-[#9d8580]'
                        }`}
                      />
                    </span>
                  </button>
                )}
                {onLoadSample && (
                  <button
                    type="button"
                    onClick={onLoadSample}
                    className={`group flex w-full items-center gap-4 py-4 text-left ${focusRing}`}
                  >
                    <span className="flex-1">
                      <span className="block text-sm">No drive? Explore the demo dataset</span>
                      <span className="mt-0.5 block text-xs text-[#705957]">
                        Sample files to try the dashboard without connecting anything.
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
                  </button>
                )}
              </section>
            )}
          </div>

          {/* ---------- Footer ---------- */}
          <footer className="flex flex-col-reverse gap-2.5 border-t border-[#d8ceca] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
            <button
              type="button"
              onClick={onDecline}
              className={`inline-flex h-11 items-center justify-center rounded-full border border-[#542b2b] px-6 text-sm transition-colors hover:bg-[#542b2b] hover:text-[#faf9f7] ${focusRing}`}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              autoFocus
              className={`group inline-flex h-11 items-center justify-center gap-2.5 rounded-full bg-[#542b2b] px-6 text-sm text-[#faf9f7] transition-colors hover:bg-[#6b3a3a] ${focusRing}`}
            >
              Accept & select drive
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </button>
          </footer>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
