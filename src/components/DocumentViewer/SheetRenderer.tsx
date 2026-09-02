import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { readFileBlob } from '../../lib/blob';
import { countWords } from '../../lib/docxMeta';
import { ViewerRenderProps } from './types';
import { Table } from 'lucide-react';
import { PRINT_PAGE_CSS } from '../../lib/printSupport';
import { formatSize } from '../../lib/format';

const MAX_SHEET_ROWS = 5000; // cap rendered rows to avoid DOM blow-up

interface Sheet {
  name: string;
  rows: string[][];
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else if (c !== '\r') {
      cur += c;
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

export const SheetRenderer: React.FC<ViewerRenderProps> = (props) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let result: Sheet[] = [];
        const ext = props.file.extension.toLowerCase();
        const blob = await readFileBlob(props.file);
        if (blob) {
          if (ext === 'csv') {
            const target = blob.size > 4 * 1024 * 1024 ? blob.slice(0, 4 * 1024 * 1024) : blob;
            const text = await target.text();
            result = [{ name: 'CSV', rows: parseCsv(text) }];
          } else {
            const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
            result = wb.SheetNames.map((name) => {
              const sheet = wb.Sheets[name];
              return { name, rows: XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) };
            });
          }
        } else if (props.file.textContent) {
          const sep = props.file.textContent.includes('\t') ? '\t' : ',';
          result = [{ name: ext.toUpperCase(), rows: parseCsv(props.file.textContent.replace(/\t/g, ',')) }];
          if (sep === ',') result = [{ name: ext.toUpperCase(), rows: parseCsv(props.file.textContent) }];
        } else {
          throw new Error('No spreadsheet content available.');
        }
        if (cancelled) return;
        const clean = result.map((s) => ({
          name: s.name,
          rows: s.rows.slice(0, MAX_SHEET_ROWS).map((r) => r.map((c) => String(c ?? ''))),
        }));
        const anyTruncated = result.some((s) => s.rows.length > MAX_SHEET_ROWS);
        setTruncated(anyTruncated);
        setSheets(clean);
        setActiveSheet(0);
        props.onPageCount(1);
        const allText = clean.map((s) => s.rows.map((r) => r.join(' ')).join(' ')).join(' ');
        props.onWordCount(countWords(allText));
        props.onTextExtracted(allText.slice(0, 20000));
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to parse spreadsheet');
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
    const grid = gridRef.current;
    if (!grid) return;
    grid.style.zoom = props.scaleMode === 'custom' ? String(props.scale) : '1';
    grid.style.transformOrigin = 'top left';
  }, [props.scale, props.scaleMode]);

  useEffect(() => {
    props.registerNav(null);
    props.onPageChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    props.registerPrint?.(() => {
      const grid = gridRef.current;
      if (!grid) return null;
      const table = grid.querySelector('table');
      if (!table) return null;
      return { title: props.file.name, html: table.outerHTML, css: PRINT_PAGE_CSS };
    });
    return () => props.registerPrint?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sheet = sheets[activeSheet];

  return (
    <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
      {loading && (
        <div className="flex items-center justify-center h-full text-sm text-slate-400">Parsing spreadsheet...</div>
      )}
      {error && !loading && (
        <div className="flex items-center justify-center h-full text-xs text-amber-500 px-4 text-center">{error}</div>
      )}
      {!loading && !error && sheet && (
        <>
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50 dark:bg-slate-950">
            {sheets.map((s, i) => (
              <button
                key={s.name + i}
                onClick={() => setActiveSheet(i)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  activeSheet === i
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {s.name}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-mono text-slate-400 px-2">
              {sheet.rows.length.toLocaleString()} rows{truncated ? ' shown' : ''}
            </span>
          </div>
          {truncated && (
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 text-[11px] text-amber-700 dark:text-amber-300">
              This spreadsheet is large — showing the first {MAX_SHEET_ROWS.toLocaleString()} rows per sheet. Download the file to view everything.
            </div>
          )}
          <div ref={gridRef} className="p-4">
            <div className="inline-block min-w-full">
              <table className="text-xs border-collapse font-mono min-w-[640px]">
                <thead>
                  <tr className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                    {sheet.rows[0]?.map((col, i) => (
                      <th
                        key={i}
                        className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-left text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap min-w-[90px]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 ? 'bg-slate-50 dark:bg-slate-800/40' : ''}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-nowrap min-w-[90px]"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sheet.rows.length === 0 && (
                <div className="flex items-center gap-2 py-10 text-slate-400 justify-center">
                  <Table className="w-5 h-5" /> Empty sheet
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
