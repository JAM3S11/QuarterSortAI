import React from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle, ArrowRight, HardDrive } from 'lucide-react';

/* Shares the landing page's editorial palette:
     paper #faf9f7   ink #542b2b   body #705957   rule #d8ceca   ring #805d59 */

interface USBReplaceConfirmModalProps {
  isOpen: boolean;
  currentDriveName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#542b2b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf9f7]';

export const USBReplaceConfirmModal: React.FC<USBReplaceConfirmModalProps> = ({
  isOpen,
  currentDriveName,
  onConfirm,
  onCancel,
}) => (
  // Escape and outside click both cancel — the safe choice — so nothing is replaced by accident.
  <Dialog open={isOpen} onClose={onCancel} className="relative z-50">
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
        <header className="border-b border-[#d8ceca] px-5 py-5 sm:px-8 sm:py-6">
          <p className="flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">
            <span className="font-mono">(01)</span>
            <span className="h-px w-6 bg-[#d8ceca]" aria-hidden />
            Switch drive
          </p>
          <DialogTitle className="mt-3 font-display text-2xl font-normal leading-tight tracking-tight sm:text-[1.75rem]">
            Connect a different USB drive
          </DialogTitle>
          <p className="mt-1.5 text-sm text-[#705957]">Please confirm before switching drives.</p>
        </header>

        {/* ---------- Body ---------- */}
        <div className="space-y-5 overflow-y-auto px-5 py-6 sm:px-8">
          <div>
            <p className="text-sm leading-relaxed">
              Remove the current drive and connect another USB drive instead?
            </p>

            {currentDriveName && (
              <div className="mt-4 flex items-center gap-3 rounded-sm border border-[#d8ceca] p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#805d59]">
                  <HardDrive className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-[#705957]">Currently in use</p>
                  <p className="mt-0.5 truncate font-mono text-sm" title={currentDriveName}>
                    {currentDriveName}
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm leading-relaxed text-[#705957]">
            The current drive&apos;s index will be removed from this view, and its files won&apos;t be shown until
            you connect it again. No files on the drive are changed or deleted — this only affects what is
            displayed here.
          </p>

          <div className="flex items-start gap-3 rounded-sm border border-[#e3b7a8] bg-[#fbf1ed] p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#a4472f]" strokeWidth={1.5} aria-hidden />
            <p className="text-xs leading-relaxed text-[#8a5a4d]">
              Still working with the current drive? Choose <span className="font-medium">No</span> to keep
              everything as it is.
            </p>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <footer className="flex flex-col-reverse gap-2.5 border-t border-[#d8ceca] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
          {/* Focus starts on the safe choice. */}
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-[#542b2b] px-6 text-sm transition-colors hover:bg-[#542b2b] hover:text-[#faf9f7] ${focusRing}`}
          >
            No, keep the current drive
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`group inline-flex h-11 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-[#542b2b] px-6 text-sm text-[#faf9f7] transition-colors hover:bg-[#6b3a3a] ${focusRing}`}
          >
            Yes, connect another USB
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </button>
        </footer>
      </DialogPanel>
    </div>
  </Dialog>
);
