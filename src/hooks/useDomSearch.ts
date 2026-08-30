import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { applySearchHighlights, collectMatchElements, scrollElementIntoView } from '../lib/domSearch';

/**
 * Shared search-highlight behaviour for DOM-based renderers (text pages,
 * legacy .doc pages, etc).
 */
export function useDomSearch(
  containerRef: RefObject<HTMLElement | null>,
  searchQuery: string,
  activeMatch: number,
  onMatchCount: (n: number) => void
) {
  const matchesRef = useRef<HTMLElement[]>([]);
  const queryRef = useRef(searchQuery);

  const apply = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const count = applySearchHighlights(container, queryRef.current);
    matchesRef.current = collectMatchElements(container);
    onMatchCount(count);
  }, [containerRef, onMatchCount]);

  useEffect(() => {
    queryRef.current = searchQuery;
    apply();
  }, [searchQuery, apply]);

  useEffect(() => {
    if (activeMatch < 1 || matchesRef.current.length === 0 || !containerRef.current) return;
    const el = matchesRef.current[Math.min(activeMatch - 1, matchesRef.current.length - 1)];
    scrollElementIntoView(el, containerRef.current);
  }, [activeMatch, containerRef]);

  return apply;
}
