import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { readFileBlob } from '../../lib/blob';
import { countWords } from '../../lib/docxMeta';
import { useActivePage } from '../../hooks/useActivePage';
import { useDomSearch } from '../../hooks/useDomSearch';
import { ViewerRenderProps } from './types';

const PAGE_W = 794;
const PAGE_H = 1100;
const MAX_LINES_PER_PAGE = 46;

export const TextRenderer: FC<ViewerRenderProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitScale, setFitScale] = useState(1);

  const { activePage, goToPage, rescan } = useActivePage(containerRef, '.qso-text-page');
  useDomSearch(containerRef, props.searchQuery, props.activeMatch, props.onMatchCount);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let text = props.file.textContent || '';
        const blob = await readFileBlob(props.file);
        if (blob && !['txt', 'log', 'md', 'csv'].includes(props.file.extension.toLowerCase())) {
          text = await blob.text();
        } else if (blob && text.trim().length < 40) {
          text = await blob.text();
        }
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
          pageEl.className = 'qso-text-page';
          pageEl.style.width = `${PAGE_W}px`;
          pageEl.style.minHeight = `${PAGE_H}px`;
          pageEl.style.marginBottom = '28px';
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
          setError(e.message || 'Failed to load text');
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

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/60 text-sm text-slate-400">
          Loading text...
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-amber-500">{error}</div>
      )}
    </div>
  );
};
