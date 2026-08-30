import React, { useCallback, useEffect, useRef, useState } from 'react';
import { readFileBlob } from '../../lib/blob';
import { escapeRegExp } from '../../lib/domSearch';
import { countWords } from '../../lib/docxMeta';
import { useActivePage } from '../../hooks/useActivePage';
import { ViewerRenderProps } from './types';

let pdfjsPromise: Promise<any> | null = null;

function getPdfJs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((m) => {
      m.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      return m;
    });
  }
  return pdfjsPromise;
}

function applyPdfPageSearch(textDiv: HTMLElement, query: string) {
  textDiv.querySelectorAll('mark.qso-pdf-match').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  const trimmed = query.trim();
  if (!trimmed) return;
  const re = new RegExp(escapeRegExp(trimmed), 'gi');
  const spans = Array.from(textDiv.children).filter((el) => el.tagName === 'SPAN') as HTMLElement[];
  for (const span of spans) {
    const text = span.textContent || '';
    if (!re.test(text)) {
      re.lastIndex = 0;
      continue;
    }
    re.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      if (m.index > last) fragment.appendChild(document.createTextNode(text.slice(last, m.index)));
      const mark = document.createElement('mark');
      mark.className = 'qso-pdf-match';
      mark.appendChild(document.createTextNode(text.slice(m.index, m.index + m[0].length)));
      fragment.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
    span.textContent = '';
    span.appendChild(fragment);
  }
}

export const PdfRenderer: React.FC<ViewerRenderProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [baseSize, setBaseSize] = useState<{ w: number; h: number } | null>(null);

  const pdfRef = useRef<any>(null);
  const scaleRef = useRef(1);
  const renderVersionRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageTextsRef = useRef<string[]>([]);
  const matchStartsRef = useRef<number[]>([]);
  const queryRef = useRef(props.searchQuery);
  const loadingRef = useRef(false);

  const { activePage, goToPage, rescan } = useActivePage(containerRef, '.qso-pdf-page');

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfRef.current;
    const container = containerRef.current;
    if (!pdf || !container || loadingRef.current) return;
    const version = renderVersionRef.current;
    let page: any;
    try {
      page = await pdf.getPage(pageNum);
    } catch {
      return;
    }
    if (renderVersionRef.current !== version) return;
    const viewport = page.getViewport({ scale: scaleRef.current });
    const pageEl = container.querySelector(`[data-pdf-page="${pageNum}"]`) as HTMLElement | null;
    if (!pageEl) return;
    pageEl.style.width = `${viewport.width}px`;
    pageEl.style.height = `${viewport.height}px`;

    pageEl.querySelectorAll('canvas, .qso-pdf-textlayer').forEach((n) => n.remove());

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    pageEl.insertBefore(canvas, pageEl.firstChild);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
    try {
      await page.render({ canvasContext: ctx, viewport, transform }).promise;
    } catch {
      return;
    }
    if (renderVersionRef.current !== version) return;

    const pdfjs = await getPdfJs();
    if (renderVersionRef.current !== version) return;
    const textDiv = document.createElement('div');
    textDiv.className = 'qso-pdf-textlayer';
    textDiv.style.width = `${viewport.width}px`;
    textDiv.style.height = `${viewport.height}px`;
    textDiv.style.setProperty('--total-scale-factor', String(scaleRef.current));
    textDiv.style.setProperty('--scale-factor', String(scaleRef.current));
    pageEl.appendChild(textDiv);

    try {
      const textContent = await page.getTextContent();
      if (renderVersionRef.current !== version) return;
      const textLayer = new pdfjs.TextLayer({ textContentSource: textContent, container: textDiv, viewport });
      await textLayer.render();
    } catch {
      /* text layer is optional */
    }
    if (renderVersionRef.current !== version) return;
    if (queryRef.current.trim()) applyPdfPageSearch(textDiv, queryRef.current);
  }, []);

  const renderVisiblePages = useCallback(() => {
    const container = containerRef.current;
    const pdf = pdfRef.current;
    if (!container || !pdf) return;
    const cRect = container.getBoundingClientRect();
    const visible = (Array.from(container.querySelectorAll('[data-pdf-page]')) as HTMLElement[]).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > cRect.top && r.top < cRect.bottom;
    });
    for (const el of visible) {
      const pageNum = parseInt(el.dataset.pdfPage || '0', 10);
      if (pageNum > 0) renderPage(pageNum);
    }
  }, [renderPage]);

  const search = useCallback(
    async (query: string) => {
      queryRef.current = query;
      const container = containerRef.current;
      const pdf = pdfRef.current;
      if (!container) return;
      const trimmed = query.trim();
      container.querySelectorAll('mark.qso-pdf-match').forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      });
      if (!trimmed || !pdf) {
        props.onMatchCount(0);
        matchStartsRef.current = [];
        return;
      }
      if (pageTextsRef.current.length < pdf.numPages) {
        const texts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            texts.push(tc.items.map((it: any) => it.str).join(' '));
          } catch {
            texts.push('');
          }
        }
        pageTextsRef.current = texts;
      }
      const lower = trimmed.toLowerCase();
      const starts = [0];
      let total = 0;
      for (const t of pageTextsRef.current) {
        const tl = t.toLowerCase();
        let idx = tl.indexOf(lower);
        let c = 0;
        while (idx !== -1) {
          c++;
          idx = tl.indexOf(lower, idx + trimmed.length);
        }
        total += c;
        starts.push(total);
      }
      matchStartsRef.current = starts;
      props.onMatchCount(total);
      container.querySelectorAll('.qso-pdf-textlayer').forEach((tl) => applyPdfPageSearch(tl as HTMLElement, trimmed));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  const navigateToMatch = useCallback(
    (activeMatch: number) => {
      const container = containerRef.current;
      if (!container || activeMatch < 1) return;
      const starts = matchStartsRef.current;
      if (starts.length < 2) return;
      let pageIdx = 0;
      for (let i = 0; i < starts.length - 1; i++) {
        if (activeMatch > starts[i] && activeMatch <= starts[i + 1]) {
          pageIdx = i;
          break;
        }
      }
      goToPage(pageIdx + 1);
      const pageEl = container.querySelector(`[data-pdf-page="${pageIdx + 1}"]`);
      const tl = pageEl?.querySelector('.qso-pdf-textlayer') as HTMLElement | null;
      if (tl) {
        const marks = Array.from(tl.querySelectorAll<HTMLElement>('mark.qso-pdf-match'));
        const within = activeMatch - starts[pageIdx];
        const el = marks[Math.min(within - 1, marks.length - 1)];
        if (el) {
          tl.querySelectorAll('.qso-pdf-match-active').forEach((m) => m.classList.remove('qso-pdf-match-active'));
          el.classList.add('qso-pdf-match-active');
          const rect = el.getBoundingClientRect();
          const cRect = container.getBoundingClientRect();
          if (rect.top < cRect.top || rect.bottom > cRect.bottom) {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }
    },
    [goToPage]
  );

  useEffect(() => {
    search(props.searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.searchQuery]);

  useEffect(() => {
    navigateToMatch(props.activeMatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.activeMatch]);

  // load pdf
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      loadingRef.current = true;
      try {
        const blob = await readFileBlob(props.file);
        if (!blob) throw new Error('No PDF binary available for this file.');
        const pdfjs = await getPdfJs();
        if (cancelled) return;
        const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
        if (cancelled) {
          pdf.destroy?.();
          return;
        }
        pdfRef.current = pdf;

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const div = document.createElement('div');
          div.className = 'qso-pdf-page';
          div.dataset.pdfPage = String(i);
          container.appendChild(div);
        }

        const first = await pdf.getPage(1);
        const vp1 = first.getViewport({ scale: 1 });
        setBaseSize({ w: vp1.width, h: vp1.height });
        props.onPageCount(pdf.numPages);

        // load text content (for search + word count)
        const texts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const tc = await page.getTextContent();
            texts.push(tc.items.map((it: any) => it.str).join(' '));
          } catch {
            texts.push('');
          }
          if (cancelled) return;
        }
        pageTextsRef.current = texts;
        props.onWordCount(countWords(texts.join(' ')));
        props.onTextExtracted(texts.join('\n').slice(0, 20000));

        observerRef.current?.disconnect();
        const observer = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                const pageNum = parseInt((e.target as HTMLElement).dataset.pdfPage || '0', 10);
                if (pageNum > 0) renderPage(pageNum);
              }
            }
          },
          { root: container, rootMargin: '300px 0px 300px 0px' }
        );
        observerRef.current = observer;
        container.querySelectorAll('[data-pdf-page]').forEach((el) => observer.observe(el));

        rescan();
        renderVisiblePages();
        setLoading(false);
        loadingRef.current = false;
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load PDF');
          setLoading(false);
          loadingRef.current = false;
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      renderVersionRef.current++;
      observerRef.current?.disconnect();
      pdfRef.current?.destroy?.();
      pdfRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.file]);

  // effective scale (custom vs fit)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !baseSize) return;
    const compute = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (props.scaleMode === 'fitWidth') setFitScale(Math.max(0.2, (cw - 48) / baseSize.w));
      else if (props.scaleMode === 'fitPage') {
        const sx = (cw - 48) / baseSize.w;
        const sy = (ch - 48) / baseSize.h;
        setFitScale(Math.max(0.15, Math.min(sx, sy)));
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [props.scaleMode, baseSize, containerRef]);

  const effectiveScale = props.scaleMode === 'custom' ? props.scale : fitScale;

  useEffect(() => {
    scaleRef.current = effectiveScale;
    renderVersionRef.current++;
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll('canvas, .qso-pdf-textlayer').forEach((n) => n.remove());
    renderVisiblePages();
  }, [effectiveScale, renderVisiblePages]);

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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 rounded-full border-2 border-slate-600 border-t-emerald-500 animate-spin" />
            Loading PDF...
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/60">
          <div className="text-center text-slate-500 max-w-md px-4">
            <p className="text-sm font-semibold text-amber-500 mb-1">PDF could not be loaded</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
