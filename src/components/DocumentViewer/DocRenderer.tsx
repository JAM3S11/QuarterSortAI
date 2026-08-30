import React, { useCallback, useEffect, useRef, useState } from 'react';
import { readFileBlob } from '../../lib/blob';
import { extractDocText } from '../../lib/docExtractor';
import { countWords } from '../../lib/docxMeta';
import { useActivePage } from '../../hooks/useActivePage';
import { useDomSearch } from '../../hooks/useDomSearch';
import { ViewerRenderProps } from './types';
import { FileWarning } from 'lucide-react';
import { PRINT_PAGE_CSS } from '../../lib/printSupport';

const PAGE_W = 794;
const PAGE_H = 1100;
const MAX_LINES_PER_PAGE = 46;

export const DocRenderer: React.FC<ViewerRenderProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitScale, setFitScale] = useState(1);

  const { activePage, goToPage, rescan } = useActivePage(containerRef, '.qso-doc-page');
  useDomSearch(containerRef, props.searchQuery, props.activeMatch, props.onMatchCount);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await readFileBlob(props.file);
        if (!blob) {
          // No binary — fall back to cached text preview if present
          if (props.file.textContent) {
            const container = containerRef.current;
            if (!container) return;
            container.innerHTML = '';
            const pageEl = document.createElement('div');
            pageEl.className = 'qso-doc-page';
            pageEl.style.width = `${PAGE_W}px`;
            pageEl.style.minHeight = `${PAGE_H}px`;
            const pre = document.createElement('pre');
            pre.className = 'qso-text-pre';
            pre.textContent = props.file.textContent;
            pageEl.appendChild(pre);
            container.appendChild(pageEl);
            props.onPageCount(1);
            props.onWordCount(countWords(props.file.textContent));
            props.onTextExtracted(props.file.textContent.slice(0, 20000));
            rescan();
            setLoading(false);
            return;
          }
          throw new Error('No .doc binary available for this file.');
        }
        const text = await extractDocText(await blob.arrayBuffer());
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const lines = text.split(/\r?\n/);
        const pages: string[][] = [];
        let page: string[] = [];
        for (const line of lines) {
          page.push(line);
          if (page.length >= MAX_LINES_PER_PAGE) {
            pages.push(page);
            page = [];
          }
        }
        if (page.length > 0 || pages.length === 0) pages.push(page);

        for (let i = 0; i < pages.length; i++) {
          const pageEl = document.createElement('div');
          pageEl.className = 'qso-doc-page';
          pageEl.style.width = `${PAGE_W}px`;
          pageEl.style.minHeight = `${PAGE_H}px`;
          pageEl.style.marginBottom = '28px';
          if (i === 0) {
            const banner = document.createElement('div');
            banner.className = 'qso-doc-banner';
            banner.textContent = 'Legacy .doc (Word 97-2003) — text approximation. Full visual fidelity requires conversion to .docx.';
            pageEl.appendChild(banner);
          }
          const pre = document.createElement('pre');
          pre.className = 'qso-text-pre';
          pre.textContent = pages[i].join('\n');
          pageEl.appendChild(pre);
          container.appendChild(pageEl);
        }

        props.onPageCount(pages.length);
        props.onWordCount(countWords(text));
        props.onTextExtracted(text.slice(0, 20000));
        rescan();
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to extract .doc text');
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.file]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const compute = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (props.scaleMode === 'fitWidth') setFitScale(Math.max(0.25, (cw - 48) / PAGE_W));
      else if (props.scaleMode === 'fitPage') {
        const sx = (cw - 48) / PAGE_W;
        const sy = (ch - 48) / PAGE_H;
        setFitScale(Math.max(0.2, Math.min(sx, sy)));
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [props.scaleMode, containerRef]);

  const effectiveScale = props.scaleMode === 'custom' ? props.scale : fitScale;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.zoom = String(effectiveScale);
    container.style.transformOrigin = 'top center';
  }, [effectiveScale]);

  useEffect(() => {
    props.onPageChange(activePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  useEffect(() => {
    props.registerNav(goToPage);
    return () => props.registerNav(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToPage]);

  useEffect(() => {
    props.registerPrint?.(() => {
      const container = containerRef.current;
      if (!container) return null;
      const pages = Array.from(container.querySelectorAll('.qso-doc-page')) as HTMLElement[];
      if (pages.length === 0) return null;
      return { title: props.file.name, html: pages.map((p) => p.outerHTML).join(''), css: PRINT_PAGE_CSS };
    });
    return () => props.registerPrint?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/60 text-sm text-slate-400">
          Extracting legacy Word document...
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/60">
          <div className="text-center text-slate-500 max-w-md px-4">
            <FileWarning className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm font-semibold text-amber-500 mb-1">Legacy .doc could not be parsed</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
