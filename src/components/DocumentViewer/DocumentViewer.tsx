import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScannedFile } from '../../types';
import { ViewToolbar } from './ViewToolbar';
import { DocxRenderer } from './DocxRenderer';
import { PdfRenderer } from './PdfRenderer';
import { DocRenderer } from './DocRenderer';
import { SheetRenderer } from './SheetRenderer';
import { SlideRenderer } from './SlideRenderer';
import { TextRenderer } from './TextRenderer';
import { UnsupportedFile } from './UnsupportedFile';
import { TocPanel } from './TocPanel';
import { InsightsPanel } from './InsightsPanel';
import { CommentsPanel } from './CommentsPanel';
import { ScaleMode, TocItem, CommentItem, ViewerRenderProps } from './types';
import { DocumentInsights, computeDocumentInsights } from '../../lib/documentInsights';
import { readFileBlob } from '../../lib/blob';
import { PrintPayload, PRINT_PAGE_CSS, openPrintWindow, writePrintWindow, escapeHtml } from '../../lib/printSupport';

const VIEWER_STYLES = `
  .docx-wrapper {
    background: transparent !important;
    padding: 28px 20px 0 !important;
  }
  .docx-wrapper > section.docx {
    box-shadow: 0 4px 22px rgba(2, 6, 23, 0.18);
    margin-bottom: 32px !important;
    border-radius: 2px;
  }
  .docx-wrapper > section.docx,
  section.docx { background: #fff !important; color: #1e293b; margin-left: auto; margin-right: auto; }
  .qso-pdf-page {
    position: relative;
    margin: 0 auto 28px;
    background: #fff;
    box-shadow: 0 4px 22px rgba(2, 6, 23, 0.18);
  }
  .qso-pdf-page canvas { display: block; }
  .qso-pdf-textlayer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    line-height: 1;
    text-size-adjust: none;
    forced-color-adjust: none;
    transform-origin: 0 0;
    z-index: 2;
  }
  .qso-pdf-textlayer span {
    color: transparent;
    position: absolute;
    white-space: pre;
    cursor: text;
    transform-origin: 0 0;
  }
  .qso-pdf-textlayer ::selection { background: rgba(0, 0, 255, 0.25); color: transparent; }
  .qso-text-page, .qso-doc-page {
    background: #fff;
    box-shadow: 0 4px 22px rgba(2, 6, 23, 0.18);
    padding: 40px 48px;
    box-sizing: border-box;
    color: #1e293b;
    margin-left: auto;
    margin-right: auto;
  }
  .qso-text-pre {
    font-family: 'Cascadia Code', 'Consolas', monospace;
    font-size: 11px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
    color: #1e293b;
    margin: 0;
  }
  .qso-doc-page .qso-text-pre {
    font-family: Calibri, 'Segoe UI', sans-serif;
    font-size: 12.5px;
    line-height: 1.65;
  }
  .qso-doc-banner {
    background: #fffbeb;
    border: 1px solid #fcd34d;
    color: #92400e;
    font-size: 11px;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 16px;
  }
  mark.qso-search { background: #ffe066; color: inherit; border-radius: 2px; }
  mark.qso-search.qso-match-active { background: #ffb800; }
  mark.qso-pdf-match { background: rgba(255, 213, 0, 0.45); border-radius: 2px; }
  mark.qso-pdf-match-active { background: rgba(255, 140, 0, 0.65); }
`;

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'tif', 'tiff', 'ico', 'icns', 'avif'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'mkv', 'avi'];
const TEXT_EXTS = ['txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml', 'ini', 'cfg', 'env', 'sh', 'bat', 'ps1', 'py', 'js', 'ts', 'html', 'css', 'sql', 'rtf'];

const PREVIEWABLE_EXTS = new Set([
  'docx', 'pdf', 'doc', 'xlsx', 'xls', 'csv', 'pptx',
  ...TEXT_EXTS,
  ...IMAGE_EXTS,
  ...AUDIO_EXTS,
  ...VIDEO_EXTS,
]);

interface DocumentViewerProps {
  file: ScannedFile | null;
  files?: ScannedFile[];
  onClose: () => void;
}

const MediaViewer: React.FC<{ file: ScannedFile }> = ({ file }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      const blob = await readFileBlob(file);
      if (cancelled) return;
      if (blob) {
        const u = URL.createObjectURL(blob);
        revoked = u;
        setUrl(u);
      } else if (file.contentUrl) {
        setUrl(file.contentUrl);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file]);
  const ext = file.extension.toLowerCase();
  return (
    <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950">
      {!url && <div className="text-xs text-slate-400">No binary available for preview.</div>}
      {url && IMAGE_EXTS.includes(ext) && (
        <img src={url} alt={file.name} className="max-w-full max-h-full rounded-lg shadow-xl bg-white" />
      )}
      {url && AUDIO_EXTS.includes(ext) && <audio src={url} controls className="w-full max-w-xl" />}
      {url && VIDEO_EXTS.includes(ext) && <video src={url} controls className="max-w-full max-h-full rounded-lg shadow-xl" />}
    </div>
  );
};

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, files = [], onClose }) => {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [scaleMode, setScaleMode] = useState<ScaleMode>('fitWidth');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatch, setActiveMatch] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [rightPanel, setRightPanel] = useState<'insights' | 'comments' | null>('insights');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [insights, setInsights] = useState<DocumentInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [extractedText, setExtractedText] = useState('');

  const navRef = useRef<((n: number) => void) | null>(null);
  const tocNavRef = useRef<((item: TocItem) => void) | null>(null);
  const printRef = useRef<(() => PrintPayload | Promise<PrintPayload> | null) | null>(null);
  const tocAutoOpenedRef = useRef<string | null>(null);
  const aiFetchedRef = useRef<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) return;
    setPageCount(0);
    setCurrentPage(1);
    setSearchQuery('');
    setMatchCount(0);
    setActiveMatch(0);
    setTocOpen(false);
    setTocItems([]);
    setComments([]);
    setInsights(null);
    setWordCount(0);
    setExtractedText('');
    setScale(1);
    setScaleMode('fitWidth');
    setRightPanel('insights');
    tocAutoOpenedRef.current = null;
    aiFetchedRef.current = null;
  }, [file]);

  const registerNav = useCallback((fn: ((n: number) => void) | null) => {
    navRef.current = fn;
  }, []);
  const registerTocNav = useCallback((fn: ((item: TocItem) => void) | null) => {
    tocNavRef.current = fn;
  }, []);
  const registerPrint = useCallback((fn: (() => PrintPayload | Promise<PrintPayload> | null) | null) => {
    printRef.current = fn;
  }, []);

  const handlePageCount = useCallback((n: number) => setPageCount(n), []);
  const handlePageChange = useCallback((n: number) => setCurrentPage(n), []);
  const handleToc = useCallback((items: TocItem[]) => setTocItems(items), []);
  const handleComments = useCallback((items: CommentItem[]) => setComments(items), []);
  const handleWordCount = useCallback((n: number) => setWordCount(n), []);
  const handleMatchCount = useCallback((n: number) => setMatchCount(n), []);
  const handleActiveMatchChange = useCallback((n: number) => setActiveMatch(n), []);
  const handleTextExtracted = useCallback((t: string) => setExtractedText(t), []);

  const goToPage = useCallback(
    (n: number) => {
      if (!navRef.current) return;
      const clamped = Math.max(1, Math.min(n, pageCount || 1));
      navRef.current(clamped);
      setCurrentPage(clamped);
    },
    [pageCount]
  );

  const goPrev = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const goNext = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);

  const handleZoomChange = useCallback((nextScale: number, mode: ScaleMode) => {
    setScale(nextScale);
    setScaleMode(mode);
  }, []);

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    setActiveMatch(q.trim() ? 1 : 0);
    if (!q.trim()) setMatchCount(0);
  }, []);

  const goPrevMatch = useCallback(() => {
    if (matchCount === 0) return;
    setActiveMatch((a) => (a <= 1 ? matchCount : a - 1));
  }, [matchCount]);
  const goNextMatch = useCallback(() => {
    if (matchCount === 0) return;
    setActiveMatch((a) => (a >= matchCount ? 1 : a + 1));
  }, [matchCount]);

  // Auto-open TOC once for documents that have headings
  useEffect(() => {
    if (tocItems.length > 0 && tocAutoOpenedRef.current !== (file?.path || '')) {
      tocAutoOpenedRef.current = file?.path || '';
      setTocOpen(true);
    }
  }, [tocItems.length, file]);

  const handleTocNavigate = useCallback((item: TocItem) => {
    tocNavRef.current?.(item);
  }, []);

  // Deterministic insights + optional AI enrichment (hybrid)
  useEffect(() => {
    if (!file) return;
    const local = computeDocumentInsights(file, files, {
      pages: pageCount,
      words: wordCount,
      text: extractedText,
      ocrStatus: file.textContent ? 'Text available' : 'OCR not run',
    });
    setInsights(local);

    const text = extractedText || file.textContent || '';
    if (text.trim() && aiFetchedRef.current !== file.path) {
      aiFetchedRef.current = file.path;
      setInsightsLoading(true);
      fetch('/api/document-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          text: text.slice(0, 8000),
          metadata: file.metadata,
          classification: file.classification,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.insights) setInsights((prev) => ({ ...prev, ...data.insights }));
        })
        .catch(() => undefined)
        .finally(() => setInsightsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, pageCount, wordCount, extractedText]);

  const handleDownload = useCallback(async () => {
    if (!file) return;
    const blob = await readFileBlob(file);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, [file]);

  const buildMediaPrintPayload = useCallback(async (): Promise<PrintPayload | null> => {
    if (!file) return null;
    const ext = file.extension.toLowerCase();
    const isImage = IMAGE_EXTS.includes(ext);
    let src = file.contentUrl || '';
    if (isImage) {
      const blob = await readFileBlob(file);
      if (blob) {
        try {
          src = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(new Error('read failed'));
            r.readAsDataURL(blob);
          });
        } catch {
          src = '';
        }
      }
    }
    const html = isImage && src
      ? `<div class="pp"><img src="${src}" style="max-width:100%;height:auto;display:block;margin:0 auto"></div>`
      : `<p style="font-family:Calibri,Arial,sans-serif;color:#64748b;padding:40px;text-align:center;">` +
        `No printable content available for <strong>${escapeHtml(file.name)}</strong>.</p>`;
    return { title: file.name, html, css: PRINT_PAGE_CSS };
  }, [file]);

  const handlePrint = useCallback(async () => {
    // Open synchronously so the click gesture survives pop-up blocking.
    const win = openPrintWindow();
    try {
      const payload = printRef.current ? await printRef.current() : await buildMediaPrintPayload();
      if (!payload || !win) throw new Error('Print content unavailable');
      writePrintWindow(win, payload);
    } catch (e) {
      console.error('Print failed:', e);
      try {
        win?.close();
      } catch {
        /* ignore */
      }
    }
  }, [buildMediaPrintPayload]);

  // Keyboard navigation + Ctrl+wheel zoom
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal || !file) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        if (e.key === 'Escape') onClose();
        return;
      }
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'PageDown':
          e.preventDefault();
          goNext();
          break;
        case 'PageUp':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          goPrev();
          break;
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const step = scaleMode === 'custom' ? 0.1 : 0.25;
      const next = Math.min(2, Math.max(0.25, Math.round((scale + delta * step) * 100) / 100));
      handleZoomChange(next, 'custom');
    };
    window.addEventListener('keydown', onKey, true);
    modal.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey, true);
      modal.removeEventListener('wheel', onWheel);
    };
  }, [file, onClose, goNext, goPrev, scale, scaleMode, handleZoomChange]);

  if (!file) return null;

  const ext = file.extension.toLowerCase();
  const isPaged = !['xlsx', 'xls', 'csv', 'pptx'].includes(ext) && !IMAGE_EXTS.includes(ext) && !AUDIO_EXTS.includes(ext) && !VIDEO_EXTS.includes(ext) && PREVIEWABLE_EXTS.has(ext);

  const commonProps: ViewerRenderProps = {
    file,
    scale,
    scaleMode,
    searchQuery,
    activeMatch,
    onPageCount: handlePageCount,
    onPageChange: handlePageChange,
    registerNav,
    onToc: handleToc,
    onComments: handleComments,
    onWordCount: handleWordCount,
    onMatchCount: handleMatchCount,
    onActiveMatchChange: handleActiveMatchChange,
    onTextExtracted: handleTextExtracted,
    registerTocNav,
    registerPrint,
  };

  const renderer = (() => {
    if (ext === 'docx') return <DocxRenderer key={file.path} {...commonProps} />;
    if (ext === 'pdf') return <PdfRenderer key={file.path} {...commonProps} />;
    if (ext === 'doc') return <DocRenderer key={file.path} {...commonProps} />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <SheetRenderer key={file.path} {...commonProps} />;
    if (ext === 'pptx') return <SlideRenderer key={file.path} {...commonProps} />;
    if (TEXT_EXTS.includes(ext)) return <TextRenderer key={file.path} {...commonProps} />;
    if (IMAGE_EXTS.includes(ext) || AUDIO_EXTS.includes(ext) || VIDEO_EXTS.includes(ext)) {
      return <MediaViewer key={file.path} file={file} />;
    }
    if (!PREVIEWABLE_EXTS.has(ext)) {
      return <UnsupportedFile key={file.path} file={file} />;
    }
    return <TextRenderer key={file.path} {...commonProps} />;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-1 sm:p-4">
      <style>{VIEWER_STYLES}</style>
      <div
        ref={modalRef}
        className="relative w-full max-w-[1700px] h-[96vh] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        <ViewToolbar
          file={file}
          onClose={onClose}
          pageCount={pageCount}
          currentPage={currentPage}
          onGoToPage={goToPage}
          onPrev={goPrev}
          onNext={goNext}
          scale={scale}
          scaleMode={scaleMode}
          onZoomChange={handleZoomChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          matchCount={matchCount}
          activeMatch={activeMatch}
          onPrevMatch={goPrevMatch}
          onNextMatch={goNextMatch}
          tocOpen={tocOpen}
          tocCount={tocItems.length}
          onToggleToc={() => setTocOpen((v) => !v)}
          insightsOpen={rightPanel === 'insights'}
          onToggleInsights={() => setRightPanel((p) => (p === 'insights' ? null : 'insights'))}
          commentsOpen={rightPanel === 'comments'}
          commentCount={comments.length}
          onToggleComments={() => setRightPanel((p) => (p === 'comments' ? null : 'comments'))}
          onDownload={handleDownload}
          onPrint={handlePrint}
        />

        <div className="flex-1 flex overflow-hidden">
          {tocOpen && tocItems.length > 0 && (
            <aside className="absolute inset-y-0 left-0 z-30 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-xl md:shadow-none md:static">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">Contents</span>
                <button onClick={() => setTocOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TocPanel items={tocItems} onNavigate={handleTocNavigate} />
              </div>
            </aside>
          )}

          <div className="flex-1 flex flex-col overflow-hidden relative">{renderer}</div>

          {rightPanel && (
            <aside className="absolute inset-y-0 right-0 z-30 w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-xl lg:shadow-none lg:static">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">
                  {rightPanel === 'insights' ? 'Insights' : 'Comments'}
                </span>
                <button onClick={() => setRightPanel(null)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {rightPanel === 'insights' ? (
                  <InsightsPanel file={file} insights={insights} insightsLoading={insightsLoading} aiUnavailable={false} />
                ) : (
                  <CommentsPanel comments={comments} />
                )}
              </div>
            </aside>
          )}
        </div>

        {!isPaged && (
          <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center gap-3 text-[10px] font-mono text-slate-400 shrink-0">
            <span>{ext.toUpperCase()} · {wordCount.toLocaleString()} words</span>
            <span className="ml-auto">{file.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
