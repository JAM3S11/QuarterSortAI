import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Tracks the "active" page inside a scrollable container whose page elements
 * are matched by `selector`, and provides a goToPage(n) helper.
 */
export function useActivePage(
  containerRef: RefObject<HTMLElement | null>,
  selector: string
): { activePage: number; goToPage: (n: number) => void; rescan: () => void } {
  const [activePage, setActivePage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const listRef = useRef<HTMLElement[]>([]);

  const rescan = useCallback(() => {
    const container = containerRef.current;
    observerRef.current?.disconnect();
    if (!container) return;
    const list = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    listRef.current = list;
    if (list.length === 0) {
      setActivePage(1);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.intersectionRatio - b.intersectionRatio);
        if (visible.length > 0) {
          const idx = list.indexOf(visible[visible.length - 1].target as HTMLElement);
          if (idx >= 0) setActivePage(idx + 1);
        }
      },
      { root: container, threshold: [0.15, 0.5, 0.95] }
    );
    list.forEach((el) => observer.observe(el));
    observerRef.current = observer;

    // initial active page = first page whose top is at/above viewport center
    const cRect = container.getBoundingClientRect();
    const center = cRect.top + cRect.height * 0.5;
    let current = 1;
    for (let i = 0; i < list.length; i++) {
      const rect = list[i].getBoundingClientRect();
      if (rect.top <= center) current = i + 1;
      else break;
    }
    setActivePage(current);
  }, [containerRef, selector]);

  useEffect(() => {
    rescan();
    const container = containerRef.current;
    const onScroll = () => {
      const cRect = container!.getBoundingClientRect();
      const center = cRect.top + cRect.height * 0.5;
      let current = 1;
      const list = listRef.current;
      for (let i = 0; i < list.length; i++) {
        const rect = list[i].getBoundingClientRect();
        if (rect.top <= center) current = i + 1;
        else break;
      }
      setActivePage(current);
    };
    container?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observerRef.current?.disconnect();
      container?.removeEventListener('scroll', onScroll);
    };
  }, [containerRef, selector, rescan]);

  const goToPage = useCallback(
    (n: number) => {
      const container = containerRef.current;
      if (!container) return;
      const list = listRef.current;
      if (list.length === 0) return;
      const idx = Math.max(0, Math.min(n - 1, list.length - 1));
      const el = list[idx];
      const target = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top: target, behavior: 'smooth' });
      setActivePage(idx + 1);
    },
    [containerRef]
  );

  return { activePage, goToPage, rescan };
}
