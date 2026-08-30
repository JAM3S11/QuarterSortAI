import { ScannedFile } from '../types';

export interface DocumentInsights {
  fileName: string;
  effectiveDate: string;
  quarter: string;
  month: string;
  pages: number;
  words: number;
  author: string;
  documentType: string;
  confidence: number;
  keywords: string[];
  relatedDocuments: { name: string; path: string }[];
  ocrStatus: string;
}

const STOP_WORDS = new Set(
  `a an the and or but if then else for of to in on at by with from as is are was were be been being this that these those it its it's have has had do does did not no nor so too very can will would should could may might must shall about into over after before between under during through above below again further once here there when where why how all any both each few more most other some such only own same than too s t don now what which who whom their there they them then`.split(/\s+/)
);

const TYPE_KEYWORDS: { type: string; words: string[] }[] = [
  { type: 'Quarterly Report', words: ['quarterly', 'q1', 'q2', 'q3', 'q4', 'report'] },
  { type: 'Financial Statement', words: ['financial', 'statement', 'revenue', 'income', 'balance', 'surplus'] },
  { type: 'Invoice', words: ['invoice', 'receipt', 'billing', 'payment'] },
  { type: 'Payroll', words: ['payroll', 'salary', 'wage', 'disbursement', 'bonus'] },
  { type: 'Audit Report', words: ['audit', 'auditor', 'compliance', 'opinion'] },
  { type: 'Contract', words: ['contract', 'agreement', 'procurement', 'vendor', 'terms'] },
  { type: 'Budget', words: ['budget', 'allocation', 'expenditure', 'cost'] },
  { type: 'Minutes', words: ['minutes', 'meeting', 'agenda'] },
  { type: 'Tax Document', words: ['tax', 'compliance', 'remittance', 'revenue authority'] },
  { type: 'Strategic Plan', words: ['strategy', 'strategic', 'roadmap', 'initiative', 'milestone'] },
  { type: 'Checklist', words: ['checklist', 'closing', 'reconcile'] },
  { type: 'Security Log', words: ['security', 'scan', 'malware', 'hash', 'daemon'] },
];

export function detectDocumentType(name: string, text: string): string {
  const lower = `${name} ${(text || '').slice(0, 4000)}`.toLowerCase();
  const scored = TYPE_KEYWORDS.map((t) => {
    let score = 0;
    for (const w of t.words) if (lower.includes(w)) score++;
    return { type: t.type, score };
  }).sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score > 0 ? scored[0].type : 'Document';
}

export function extractKeywords(text: string, max = 8): string[] {
  const counts = new Map<string, number>();
  const words = (text || '').toLowerCase().match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g) || [];
  for (const w of words) {
    if (STOP_WORDS.has(w) || w.length < 4) continue;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([w]) => w);
}

export function computeDocumentInsights(
  file: ScannedFile,
  allFiles: ScannedFile[],
  opts: { pages?: number; words?: number; text?: string; ocrStatus?: string } = {}
): DocumentInsights {
  const text = opts.text || file.textContent || '';
  const pages = opts.pages ?? file.metadata?.pdfPages ?? 0;
  const words = opts.words ?? file.metadata?.wordWordCount ?? (text ? text.split(/\s+/).filter(Boolean).length : 0);

  const related: { name: string; path: string }[] = [];
  if (allFiles.length > 0) {
    const candidates = allFiles.filter((f) => f.id !== file.id);
    const byFolder = candidates
      .filter((f) => f.folderPath === file.folderPath)
      .map((f) => ({ name: f.name, path: f.path }));
    const byQuarter = candidates
      .filter((f) => !byFolder.some((r) => r.path === f.path) && f.classification.quarter === file.classification.quarter)
      .map((f) => ({ name: f.name, path: f.path }));
    const byHash = candidates
      .filter((f) => f.duplicateGroupHash && f.duplicateGroupHash === file.duplicateGroupHash)
      .map((f) => ({ name: f.name, path: f.path }));
    const merged = [...byFolder, ...byQuarter, ...byHash.filter((r) => !byFolder.some((x) => x.path === r.path))];
    const seen = new Set<string>();
    for (const r of merged) {
      if (seen.has(r.path)) continue;
      seen.add(r.path);
      related.push(r);
      if (related.length >= 5) break;
    }
  }

  return {
    fileName: file.name,
    effectiveDate: file.classification.effectiveDate || file.metadata?.createdDate || '—',
    quarter: file.classification.quarter,
    month: file.classification.month,
    pages,
    words,
    author: file.metadata?.author || 'Unknown',
    documentType: detectDocumentType(file.name, text),
    confidence: file.classification.confidence,
    keywords: extractKeywords(text),
    relatedDocuments: related,
    ocrStatus: opts.ocrStatus || (file.textContent ? 'Text available' : 'OCR not run'),
  };
}
