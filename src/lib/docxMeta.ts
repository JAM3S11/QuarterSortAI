import JSZip from 'jszip';
import { CommentItem, TocItem } from '../components/DocumentViewer/types';

function parseXml(s: string): Document {
  return new DOMParser().parseFromString(s, 'application/xml');
}

const HEADING_RE = /^(?:HEADING\s*)?([1-9])$/;
const HEADING_PREFIX_RE = /^HEADING\s+([1-9])/i;

interface StyleInfo {
  name: string;
  basedOn?: string;
}

export async function extractDocxHeadings(blob: Blob): Promise<TocItem[]> {
  try {
    const zip = await JSZip.loadAsync(blob);
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) return [];
    const stylesXml = await zip.file('word/styles.xml')?.async('string');

    const styleMap = new Map<string, StyleInfo>();
    if (stylesXml) {
      const stylesDoc = parseXml(stylesXml);
      for (const style of Array.from(stylesDoc.getElementsByTagName('w:style'))) {
        const id = style.getAttribute('w:styleId');
        if (!id) continue;
        const nameEl = style.getElementsByTagName('w:name')[0];
        const basedOnEl = style.getElementsByTagName('w:basedOn')[0];
        styleMap.set(id.toLowerCase(), {
          name: nameEl?.getAttribute('w:val') || '',
          basedOn: basedOnEl?.getAttribute('w:val'),
        });
      }
    }

    const resolveLevel = (styleId?: string): number => {
      if (!styleId) return 0;
      const id = styleId.toLowerCase();
      const m = HEADING_RE.exec(id);
      if (m) return parseInt(m[1], 10);
      // walk the style chain
      let info = styleMap.get(id);
      const seen = new Set<string>([id]);
      let hops = 0;
      while (info && hops < 12) {
        const upper = info.name.toUpperCase().trim();
        const pm = HEADING_PREFIX_RE.exec(upper);
        if (upper === 'TITLE' || pm) {
          if (upper === 'TITLE') return 1;
          return parseInt(pm![1], 10);
        }
        if (info.basedOn && !seen.has(info.basedOn.toLowerCase())) {
          seen.add(info.basedOn.toLowerCase());
          info = styleMap.get(info.basedOn.toLowerCase());
        } else {
          break;
        }
        hops++;
      }
      return 0;
    };

    const doc = parseXml(docXml);
    const items: TocItem[] = [];
    let idx = 0;
    for (const p of Array.from(doc.getElementsByTagName('w:p'))) {
      const pPr = p.getElementsByTagName('w:pPr')[0];
      let styleId: string | undefined;
      if (pPr) {
        const pStyle = pPr.getElementsByTagName('w:pStyle')[0];
        styleId = pStyle?.getAttribute('w:val');
      }
      const level = resolveLevel(styleId);
      if (level <= 0) continue;
      let text = '';
      for (const t of Array.from(p.getElementsByTagName('w:t'))) text += t.textContent || '';
      if (!text.trim()) continue;
      items.push({ id: `toc-${idx++}`, text: text.trim(), level });
    }
    return items.slice(0, 300);
  } catch {
    return [];
  }
}

export async function extractDocxComments(blob: Blob): Promise<CommentItem[]> {
  try {
    const zip = await JSZip.loadAsync(blob);
    const xml = await zip.file('word/comments.xml')?.async('string');
    if (!xml) return [];
    const doc = parseXml(xml);
    const comments: CommentItem[] = [];
    for (const c of Array.from(doc.getElementsByTagName('w:comment'))) {
      let text = '';
      for (const t of Array.from(c.getElementsByTagName('w:t'))) text += t.textContent || '';
      const author = c.getElementsByTagName('w:author')[0]?.textContent || 'Unknown';
      const date = c.getElementsByTagName('w:date')[0]?.textContent || undefined;
      if (!text.trim()) continue;
      comments.push({
        id: c.getAttribute('w:id') || `c-${comments.length}`,
        author,
        date,
        text: text.trim(),
      });
    }
    return comments;
  } catch {
    return [];
  }
}

export function countWords(text: string): number {
  return (text || '').match(/[^\s]+/g)?.length || 0;
}
