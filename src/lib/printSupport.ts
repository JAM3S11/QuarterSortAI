/**
 * Helpers for printing documents from the viewer.
 *
 * A dedicated print window is built on the fly and the native browser print
 * dialog is opened for it — the dialog is what enumerates the printers
 * connected to the device and lets the user pick the destination.
 */

export interface PrintPayload {
  title: string;
  html: string;
  css: string;
}

export const PRINT_PAGE_CSS = `
  @page { margin: 12mm; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Calibri, 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b; }
  img { max-width: 100%; }

  .qso-text-page, .qso-doc-page {
    box-sizing: border-box;
    padding: 1.5rem 1.75rem;
    background: #fff;
    max-width: 100% !important;
    break-after: page;
    page-break-after: always;
  }
  .qso-text-page:last-child, .qso-doc-page:last-child { break-after: auto; page-break-after: auto; }
  .qso-text-pre {
    font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
    font-size: 0.6875rem;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    color: #1e293b;
  }
  .qso-doc-page .qso-text-pre { font-family: Calibri, 'Segoe UI', sans-serif; font-size: 0.78125rem; line-height: 1.65; }
  .qso-doc-banner { display: none !important; }

  .docx-wrapper { padding: 0 !important; background: #fff !important; }
  section.docx {
    box-shadow: none !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    break-after: page;
    page-break-after: always;
  }
  section.docx:last-child { break-after: auto; page-break-after: auto; }

  .pp { break-after: page; page-break-after: always; }
  .pp:last-child { break-after: auto; page-break-after: auto; }
  .pp img { max-width: 100%; height: auto; display: block; margin: 0 auto; }

  table { border-collapse: collapse; font-size: 0.625rem; font-family: Consolas, 'Courier New', monospace; width: 100%; }
  th, td { border: 1px solid #cbd5e1; padding: 0.25rem 0.5rem; text-align: left; white-space: nowrap; }
  th { background: #f1f5f9; font-weight: 700; }
`;

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]
  );
}

/**
 * Open the blank print window synchronously (keeps the user gesture/event
 * context so pop-up blockers won't intercept it). Returns null if blocked.
 */
export function openPrintWindow(): Window | null {
  return window.open('', '_blank', 'width=900,height=1100,scrollbars=yes');
}

/** Write the payload into the window and trigger the native print dialog. */
export function writePrintWindow(win: Window | null, payload: PrintPayload): void {
  if (!win) return;
  const doc = win.document;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8">` +
      `<title>${escapeHtml(payload.title)}</title>` +
      `<style>${payload.css}</style></head><body>${payload.html}</body></html>`
  );
  doc.close();

  const finish = () => {
    try {
      win.focus();
      win.print();
    } catch {
      /* ignore */
    }
    try {
      win.addEventListener('afterprint', () => win.close());
    } catch {
      /* ignore */
    }
  };

  if (doc.readyState === 'complete') {
    window.setTimeout(finish, 500);
  } else {
    win.addEventListener('load', () => window.setTimeout(finish, 500));
  }
}

/** Serialize a canvas to a PNG data URL (best for canvas-only renderers). */
export function canvasToImgHtml(canvas: HTMLCanvasElement | null | undefined, extraStyle = ''): string {
  if (!canvas) return '';
  const url = canvas.toDataURL('image/png');
  return `<div class="pp"><img src="${url}" style="max-width:100%;height:auto;display:block;margin:0 auto;${extraStyle}"></div>`;
}