import React, { useCallback, useEffect, useRef, useState } from 'react';
import { readFileBlob } from '../../lib/blob';
import { ViewerRenderProps } from './types';
import { PRINT_PAGE_CSS, canvasToImgHtml } from '../../lib/printSupport';

export const SlideRenderer: React.FC<ViewerRenderProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slideCount, setSlideCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const BASE_W = 960;

  const goToSlide = useCallback(async (idx: number) => {
    if (!rendererRef.current || !canvasRef.current) return;
    const clamped = Math.max(0, Math.min(idx, rendererRef.current.slideCount - 1));
    const width = Math.max(320, Math.round(BASE_W * (props.scaleMode === 'custom' ? props.scale : 1)));
    try {
      await rendererRef.current.renderSlide(clamped, canvasRef.current, width);
      setCurrentSlide(clamped);
      props.onPageChange(clamped + 1);
    } catch {
      /* render error */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.scale, props.scaleMode]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await readFileBlob(props.file);
        if (!blob) throw new Error('No .pptx binary available.');
        const { PptxRenderer } = await import('pptx-browser');
        const renderer = new PptxRenderer();
        rendererRef.current = renderer;
        await renderer.load(blob);
        if (cancelled) return;
        setSlideCount(renderer.slideCount);
        props.onPageCount(renderer.slideCount);
        setLoading(false);
        requestAnimationFrame(() => goToSlide(0));
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load presentation');
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.file]);

  useEffect(() => {
    props.registerNav((n) => goToSlide(n - 1));
    return () => props.registerNav(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goToSlide]);

  useEffect(() => {
    props.registerPrint?.(async () => {
      const renderer = rendererRef.current;
      if (!renderer || renderer.slideCount === 0) return null;
      const canvases: string[] = [];
      for (let i = 0; i < renderer.slideCount; i++) {
        const c = document.createElement('canvas');
        try {
          await renderer.renderSlide(i, c, 960);
          canvases.push(c.toDataURL('image/png'));
        } catch {
          /* skip unrenderable slide */
        }
      }
      if (canvases.length === 0) return null;
      const html = canvases
        .map((url) => `<div class="pp"><img src="${url}" style="max-width:100%;height:auto;display:block;margin:0 auto"></div>`)
        .join('');
      return { title: props.file.name, html, css: PRINT_PAGE_CSS };
    });
    return () => props.registerPrint?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rendererRef.current && slideCount > 0) goToSlide(currentSlide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.scale, props.scaleMode]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-4 overflow-y-auto">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 rounded-full border-2 border-slate-600 border-t-emerald-500 animate-spin" />
          Rendering slides...
        </div>
      )}
      {error && !loading && <div className="text-xs text-amber-500">{error}</div>}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-xl shadow-xl overflow-hidden" style={{ maxWidth: '100%' }}>
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => goToSlide(currentSlide - 1)}
              disabled={currentSlide <= 0}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-500 font-mono min-w-[80px] text-center">
              {slideCount > 0 ? `${currentSlide + 1} / ${slideCount}` : '—'}
            </span>
            <button
              onClick={() => goToSlide(currentSlide + 1)}
              disabled={currentSlide >= slideCount - 1}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
