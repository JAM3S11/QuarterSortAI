export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SearchResult {
  count: number;
  matches: HTMLElement[];
}

export function clearSearchHighlights(root: HTMLElement): void {
  root.querySelectorAll('mark.qso-search').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  root.normalize();
}

export function applySearchHighlights(root: HTMLElement, query: string): number {
  clearSearchHighlights(root);
  const trimmed = query.trim();
  if (!trimmed) return 0;

  const re = new RegExp(escapeRegExp(trimmed), 'gi');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (parent && parent.closest('mark, script, style, noscript')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  let count = 0;
  for (const node of textNodes) {
    const text = node.nodeValue || '';
    if (!text) continue;
    let match = re.exec(text);
    if (!match) continue;
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
      mark.className = 'qso-search';
      mark.appendChild(document.createTextNode(text.slice(m.index, m.index + m[0].length)));
      fragment.appendChild(mark);
      count++;
      last = m.index + m[0].length;
    }
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode!.replaceChild(fragment, node);
  }

  return count;
}

export function collectMatchElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('mark.qso-search'));
}

export function scrollElementIntoView(el: HTMLElement, container: HTMLElement, block: ScrollLogicalPosition = 'center'): void {
  const elRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const inView = elRect.top >= cRect.top && elRect.bottom <= cRect.bottom;
  if (!inView) {
    el.scrollIntoView({ block, behavior: 'smooth' });
  } else {
    el.classList.add('qso-match-active');
    window.setTimeout(() => el.classList.remove('qso-match-active'), 1500);
  }
}
