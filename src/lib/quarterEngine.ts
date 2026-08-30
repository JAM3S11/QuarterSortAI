import { QuarterClassification, QuarterId, MonthName, FileCategory, ClassificationSource } from '../types';

export const MONTH_QUARTER_MAP: Record<number, { quarter: QuarterId; month: MonthName }> = {
  7: { quarter: 'Q1', month: 'July' },
  8: { quarter: 'Q1', month: 'August' },
  9: { quarter: 'Q1', month: 'September' },
  10: { quarter: 'Q2', month: 'October' },
  11: { quarter: 'Q2', month: 'November' },
  12: { quarter: 'Q2', month: 'December' },
  1: { quarter: 'Q3', month: 'January' },
  2: { quarter: 'Q3', month: 'February' },
  3: { quarter: 'Q3', month: 'March' },
  4: { quarter: 'Q4', month: 'April' },
  5: { quarter: 'Q4', month: 'May' },
  6: { quarter: 'Q4', month: 'June' },
};

export const QUARTER_MONTHS: Record<QuarterId, MonthName[]> = {
  Q1: ['July', 'August', 'September'],
  Q2: ['October', 'November', 'December'],
  Q3: ['January', 'February', 'March'],
  Q4: ['April', 'May', 'June'],
};

export const QUARTER_LABELS: Record<QuarterId, string> = {
  Q1: 'Q1 (Jul - Sep)',
  Q2: 'Q2 (Oct - Dec)',
  Q3: 'Q3 (Jan - Mar)',
  Q4: 'Q4 (Apr - Jun)',
};

export const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
};

const MONTH_NUMBER_TO_NAME: Record<number, MonthName> = {
  1: 'January', 2: 'February', 3: 'March',
  4: 'April', 5: 'May', 6: 'June',
  7: 'July', 8: 'August', 9: 'September',
  10: 'October', 11: 'November', 12: 'December',
};

export function getFinancialYear(year: number, month1To12: number): string {
  if (month1To12 >= 7) return `FY ${year}-${year + 1}`;
  return `FY ${year - 1}-${year}`;
}

export function getFileCategory(extension: string): FileCategory {
  const ext = extension.toLowerCase().replace('.', '');
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md'].includes(ext)) return 'Documents';
  if (['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(ext)) return 'Documents';
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return 'Documents';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 'ico', 'heic', 'raw'].includes(ext)) return 'Images';
  if (['mp4', 'mkv', 'mov', 'avi', 'wmv', 'webm', 'flv', 'm4v', '3gp'].includes(ext)) return 'Videos';
  if (['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma'].includes(ext)) return 'Audio';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) return 'Archives';
  if (['exe', 'msi', 'bat', 'sh', 'cmd', 'app', 'dmg', 'bin', 'vbs'].includes(ext)) return 'Executables';
  return 'Other';
}

function confidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high';
  if (score >= 0.60) return 'medium';
  return 'low';
}

function buildClassification(
  year: number,
  month: number,
  source: ClassificationSource,
  confidence: number,
  sourceDetails: string,
  reasoning: string
): QuarterClassification {
  const qInfo = MONTH_QUARTER_MAP[month];
  const effectiveDate = `${year}-${String(month).padStart(2, '0')}-01`;
  return {
    quarter: qInfo.quarter,
    month: qInfo.month,
    monthNumber: month,
    financialYear: getFinancialYear(year, month),
    year,
    effectiveDate,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    source,
    sourceDetails,
    needsReview: confidence < 0.60,
    reasoning,
  };
}

export interface DateParseResult {
  month: number;
  year: number;
  day?: number;
  sourcePattern: string;
  ambiguous?: boolean;
}

export function classifyFileQuarter(
  fileName: string,
  folderPath: string,
  modifiedDate: Date,
  createdDate?: Date,
  embeddedDateStr?: string,
  ocrText?: string
): QuarterClassification {
  const P1 = tryEmbeddedMetadata(embeddedDateStr);
  if (P1) return P1;

  const P2 = tryFilename(fileName);
  if (P2) return P2;

  const P3 = tryOCRContent(ocrText);
  if (P3) return P3;

  const P4 = tryFolderAnalysis(folderPath);
  if (P4) return P4;

  const P5 = tryModifiedDate(modifiedDate);
  if (P5) return P5;

  return tryCreatedDate(createdDate || modifiedDate);
}

function tryEmbeddedMetadata(embeddedDateStr?: string): QuarterClassification | null {
  if (!embeddedDateStr) return null;
  const parsed = new Date(embeddedDateStr);
  if (isNaN(parsed.getTime())) return null;
  const m = parsed.getMonth() + 1;
  const y = parsed.getFullYear();
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return buildClassification(
    y, m, 'EmbeddedMetadata', 1.0,
    `Embedded metadata: ${iso}`,
    `Document metadata date: ${iso}`
  );
}

function tryFilename(fileName: string): QuarterClassification | null {
  const result = parseDateFromText(fileName);
  if (!result) return null;
  const { month, year } = result;
  const confidence = result.ambiguous ? 0.80 : 0.95;
  return buildClassification(
    year, month, 'Filename', confidence,
    `Filename pattern: ${result.sourcePattern}`,
    `Date extracted from filename: ${result.sourcePattern}`
  );
}

function tryOCRContent(ocrText?: string): QuarterClassification | null {
  if (!ocrText || ocrText.trim().length === 0) return null;
  const dates = findAllDates(ocrText);
  if (dates.length === 0) return null;
  const best = pickBestDate(dates, ocrText);
  return buildClassification(
    best.year, best.month, 'ContentOCR', 0.90,
    `OCR content date: ${best.sourcePattern}`,
    `OCR extracted date: ${best.sourcePattern}`
  );
}

function tryFolderAnalysis(folderPath: string): QuarterClassification | null {
  const segments = folderPath.split('/').filter(Boolean);

  let foundYear: number | null = null;
  let foundMonth: number | null = null;

  for (const seg of segments) {
    const yearMatch = seg.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const y = parseInt(yearMatch[1], 10);
      if (y >= 2000 && y <= 2099) foundYear = y;
    }

    for (const [mName, mNum] of Object.entries(MONTH_NAME_TO_NUMBER)) {
      if (mName.length < 3) continue;
      if (seg.toLowerCase() === mName || seg.toLowerCase().startsWith(mName)) {
        foundMonth = mNum;
        break;
      }
    }
  }

  if (foundYear && foundMonth) {
    return buildClassification(
      foundYear, foundMonth, 'FolderAnalysis', 0.75,
      `Folder hierarchy: ${folderPath}`,
      `Inferred from folder path: ${foundMonth}/${foundYear}`
    );
  }

  if (foundMonth && !foundYear) {
    const fallbackYear = new Date().getFullYear();
    return buildClassification(
      fallbackYear, foundMonth, 'FolderAnalysis', 0.70,
      `Folder name month: ${foundMonth}`,
      `Month inferred from folder path, year default to current`
    );
  }

  return null;
}

function tryModifiedDate(modifiedDate: Date): QuarterClassification | null {
  const d = modifiedDate || new Date();
  if (isNaN(d.getTime())) return null;
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return buildClassification(
    y, m, 'ModifiedDate', 0.60,
    `File modified: ${d.toISOString().split('T')[0]}`,
    `Based on last modified timestamp: ${d.toISOString().split('T')[0]}`
  );
}

function tryCreatedDate(createdDate: Date): QuarterClassification {
  const d = createdDate || new Date();
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return buildClassification(
    y, m, 'CreatedDate', 0.50,
    `File created: ${d.toISOString().split('T')[0]}`,
    `Fallback to creation date: ${d.toISOString().split('T')[0]}`
  );
}

export function parseDateFromText(text: string): DateParseResult | null {
  const results = findAllDates(text);
  return results.length > 0 ? results[0] : null;
}

function findAllDates(text: string): DateParseResult[] {
  const results: DateParseResult[] = [];
  const lower = text.toLowerCase();

  const isoRE = /\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/g;
  let m: RegExpExecArray | null;
  while ((m = isoRE.exec(lower)) !== null) {
    results.push({ year: parseInt(m[1], 10), month: parseInt(m[2], 10), day: parseInt(m[3], 10), sourcePattern: m[0] });
  }

  const mdyRE = /\b(0[1-9]|1[0-2])[-/.](1[3-9]|2[0-9]|3[01])[-/.](20\d{2})\b/g;
  while ((m = mdyRE.exec(lower)) !== null) {
    results.push({ month: parseInt(m[1], 10), day: parseInt(m[2], 10), year: parseInt(m[3], 10), sourcePattern: m[0] });
  }

  const dmyRE = /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/g;
  while ((m = dmyRE.exec(lower)) !== null) {
    results.push({ day: parseInt(m[1], 10), month: parseInt(m[2], 10), year: parseInt(m[3], 10), sourcePattern: m[0] });
  }

  const ambiguousRE = /\b(0[1-9]|1[0-2])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/g;
  while ((m = ambiguousRE.exec(lower)) !== null) {
    const already = results.some(r => r.sourcePattern === m![0]);
    if (!already) {
      results.push({ month: parseInt(m[1], 10), day: parseInt(m[2], 10), year: parseInt(m[3], 10), sourcePattern: m[0], ambiguous: true });
    }
  }

  for (const [mName, mNum] of Object.entries(MONTH_NAME_TO_NUMBER)) {
    if (mName.length < 3) continue;
    const monthYearRE = new RegExp(`\\b${mName}[\\s._/-]*(20\\d{2})\\b`, 'gi');
    while ((m = monthYearRE.exec(text)) !== null) {
      results.push({ month: mNum, year: parseInt(m[1], 10), sourcePattern: m[0] });
    }
    const yearMonthRE = new RegExp(`\\b(20\\d{2})[\\s._/-]*${mName}\\b`, 'gi');
    while ((m = yearMonthRE.exec(text)) !== null) {
      results.push({ month: mNum, year: parseInt(m[1], 10), sourcePattern: m[0] });
    }
  }

  const qRE = /\b(q[1-4])[_\s.-]*(20\d{2})\b/i;
  const qMatch = text.match(qRE);
  if (qMatch) {
    const qStr = qMatch[1].toUpperCase();
    const qMonths: Record<string, number> = { Q1: 7, Q2: 10, Q3: 1, Q4: 4 };
    results.push({ month: qMonths[qStr] || 7, year: parseInt(qMatch[2], 10), sourcePattern: qMatch[0] });
  }

  const fyRE = /fy\s*(?:20)?(\d{2})/gi;
  while ((m = fyRE.exec(lower)) !== null) {
    const fyYear = 2000 + parseInt(m[1], 10);
    for (const [mName, mNum] of Object.entries(MONTH_NAME_TO_NUMBER)) {
      if (mName.length < 3) continue;
      if (lower.includes(mName)) {
        results.push({ month: mNum, year: fyYear, sourcePattern: `FY${m[1]} ${mName}` });
        break;
      }
    }
  }

  results.sort((a, b) => {
    if (a.ambiguous && !b.ambiguous) return 1;
    if (!a.ambiguous && b.ambiguous) return -1;
    return b.year - a.year;
  });

  const seen = new Set<string>();
  return results.filter(r => {
    const key = `${r.year}-${r.month}-${r.sourcePattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const DATE_PRIORITY_KEYWORDS = [
  'document date', 'invoice date', 'meeting date', 'letter date',
  'report date', 'statement date', 'transaction date', 'payment date',
  'issue date', 'created date', 'published date', 'date issued',
  'date of invoice', 'date prepared', 'accounting date', 'fiscal date',
];

const IGNORE_KEYWORDS = [
  'birth', 'dob', 'date of birth', 'phone', 'tel', 'fax', 'ssn',
  'id:', 'id #', 'reference', 'ref:', 'account #', 'policy #',
  'expiration date', 'expiry', 'valid thru', 'valid through',
];

function pickBestDate(dates: DateParseResult[], fullText: string): DateParseResult {
  if (dates.length === 1) return dates[0];

  const lower = fullText.toLowerCase();

  const priorityLines: DateParseResult[] = [];
  for (const d of dates) {
    for (const kw of DATE_PRIORITY_KEYWORDS) {
      const idx = lower.indexOf(kw);
      if (idx >= 0) {
        const line = lower.slice(idx, idx + 200);
        if (line.includes(d.sourcePattern.toLowerCase())) {
          priorityLines.push(d);
          break;
        }
      }
    }
  }
  if (priorityLines.length > 0) return priorityLines[0];

  const clean: DateParseResult[] = [];
  for (const d of dates) {
    const shouldIgnore = IGNORE_KEYWORDS.some(kw => {
      const idx = lower.indexOf(kw);
      if (idx < 0) return false;
      const segment = lower.slice(idx, idx + 150);
      return segment.includes(d.sourcePattern.toLowerCase());
    });
    if (!shouldIgnore) clean.push(d);
  }

  if (clean.length > 0) return clean[0];
  return dates[0];
}

export function extractMetadataFromDocx(
  arrayBuffer: ArrayBuffer
): { author?: string; createdDate?: string; modifiedDate?: string; title?: string } {
  try {
    const zipView = new Uint8Array(arrayBuffer);
    const zipHeader = [0x50, 0x4B, 0x03, 0x04];
    for (let i = 0; i < 4; i++) {
      if (zipView[i] !== zipHeader[i]) return {};
    }
    let coreXml = '';
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(zipView);
    const coreIdx = text.indexOf('docProps/core.xml');
    if (coreIdx < 0) return {};
    const before = text.lastIndexOf('PK', coreIdx - 100);
    if (before < 0) return {};
    const after = text.indexOf('PK', coreIdx + 30);
    const seg = after > before ? text.slice(before, after) : text.slice(before);
    coreXml = seg;
    if (!coreXml) return {};
    const getTag = (tag: string): string | undefined => {
      const open = `<${tag}>`;
      const close = `</${tag}>`;
      const s = coreXml.indexOf(open);
      if (s < 0) return undefined;
      const e = coreXml.indexOf(close, s);
      if (e < 0) return undefined;
      return coreXml.slice(s + open.length, e).trim();
    };
    return {
      title: getTag('dc:title'),
      author: getTag('dc:creator'),
      createdDate: getTag('dcterms:created') || getTag('cp:created'),
      modifiedDate: getTag('dcterms:modified') || getTag('cp:modified'),
    };
  } catch {
    return {};
  }
}

export function extractMetadataFromPDF(
  pdfDoc: { info?: Record<string, any>; metadata?: any }
): { title?: string; author?: string; createdDate?: string; modifiedDate?: string } {
  try {
    const info = pdfDoc.info || {};
    const raw = {
      title: info.Title,
      author: info.Author,
      createdDate: info.CreationDate,
      modifiedDate: info.ModDate,
    };
    const parsePDFDate = (s: string): string | undefined => {
      if (!s) return undefined;
      const m = s.match(/D:(\d{4})(\d{2})(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      return s;
    };
    return {
      title: raw.title,
      author: raw.author,
      createdDate: parsePDFDate(raw.createdDate as string),
      modifiedDate: parsePDFDate(raw.modifiedDate as string),
    };
  } catch {
    return {};
  }
}

export function extractMetadataFromXLSX(
  arrayBuffer: ArrayBuffer
): { author?: string; createdDate?: string; modifiedDate?: string; title?: string } {
  try {
    const zipView = new Uint8Array(arrayBuffer);
    const text = new TextDecoder('utf-8').decode(zipView);
    const coreIdx = text.indexOf('docProps/core.xml');
    if (coreIdx < 0) return {};
    const before = text.lastIndexOf('PK', coreIdx - 100);
    if (before < 0) return {};
    const after = text.indexOf('PK', coreIdx + 30);
    const seg = after > before ? text.slice(before, after) : text.slice(before);
    const getTag = (tag: string): string | undefined => {
      const open = `<${tag}>`;
      const close = `</${tag}>`;
      const s = seg.indexOf(open);
      if (s < 0) return undefined;
      const e = seg.indexOf(close, s);
      if (e < 0) return undefined;
      return seg.slice(s + open.length, e).trim();
    };
    return {
      title: getTag('dc:title'),
      author: getTag('dc:creator'),
      createdDate: getTag('dcterms:created') || getTag('cp:created'),
      modifiedDate: getTag('dcterms:modified') || getTag('cp:modified'),
    };
  } catch {
    return {};
  }
}
