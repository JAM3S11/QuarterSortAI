/**
 * Minimal browser-safe extractor for legacy Word 97-2003 (.doc) binary files.
 *
 * Parses the OLE2 Compound File structure, reads the FIB from the
 * "WordDocument" stream, then resolves the piece table (CLX) stored in the
 * "0Table"/"1Table" stream to reconstruct the body text (including any UTF-16
 * and 8-bit (CP1252) pieces). Falls back to a UTF-16 heuristic scan if the
 * piece table cannot be parsed.
 */

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ENDOFCHAIN = 0xfffffffe;
const FREE = 0xffffffff;

const u8 = (b: Uint8Array, o: number) => b[o];
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) =>
  (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u64 = (b: Uint8Array, o: number) =>
  u32(b, o) + u32(b, o + 4) * 4294967296;

interface CfbReader {
  getStream(name: string): Uint8Array | null;
}

function parseCfb(buffer: ArrayBuffer): CfbReader {
  const b = new Uint8Array(buffer);
  if (b.length < 512) throw new Error('OLE: file too small');
  for (let i = 0; i < 8; i++) {
    if (b[i] !== OLE_MAGIC[i]) throw new Error('OLE: bad magic');
  }

  const sectorShift = u16(b, 0x1e) || 9;
  const miniSectorShift = u16(b, 0x20) || 6;
  const sectorSize = 1 << sectorShift;
  const miniSectorSize = 1 << miniSectorShift;
  const firstDirSector = u32(b, 0x30);
  const miniCutoff = u32(b, 0x38) || 4096;
  const firstMiniFatSector = u32(b, 0x3c);
  const numMiniFatSectors = u32(b, 0x40);
  const numFats = u32(b, 0x2c);

  const entriesPerSector = sectorSize / 4;

  // ---- DIFAT: list of FAT sector ids ----
  const fatSectorList: number[] = [];
  for (let i = 0; i < 109; i++) {
    const v = u32(b, 0x4c + i * 4);
    if (v !== ENDOFCHAIN && v !== FREE && v > 0) fatSectorList.push(v);
  }
  {
    let difat = u32(b, 0x44);
    let guard = 0;
    while (difat !== ENDOFCHAIN && difat !== FREE && guard < 64) {
      const off = difat * sectorSize;
      if (off + sectorSize > b.length) break;
      for (let i = 0; i < entriesPerSector - 1; i++) {
        const v = u32(b, off + i * 4);
        if (v !== ENDOFCHAIN && v !== FREE && v > 0) fatSectorList.push(v);
      }
      difat = u32(b, off + (entriesPerSector - 1) * 4);
      guard++;
    }
  }

  // ---- FAT: sector -> next sector ----
  const fat = new Map<number, number>();
  for (const fatSector of fatSectorList) {
    const off = fatSector * sectorSize;
    if (off + sectorSize > b.length) continue;
    for (let i = 0; i < entriesPerSector; i++) {
      const sector = fatSector * entriesPerSector + i;
      const next = u32(b, off + i * 4);
      if (sector >= 0 && next !== 0) fat.set(sector, next);
    }
  }

  const readChain = (start: number, size: number): Uint8Array => {
    const out: number[] = [];
    let sec = start;
    let remaining = size;
    let guard = 0;
    while (sec !== ENDOFCHAIN && sec !== FREE && sec > 0 && guard < 1e6) {
      const off = sec * sectorSize;
      if (off + sectorSize > b.length) break;
      const take = Math.min(sectorSize, remaining);
      for (let i = 0; i < take; i++) out.push(b[off + i]);
      remaining -= take;
      if (remaining <= 0) break;
      sec = fat.get(sec) ?? ENDOFCHAIN;
      guard++;
    }
    return new Uint8Array(out);
  };

  // ---- Directory ----
  const dirBytes = readChain(firstDirSector, sectorSize * 4);
  const entries: { name: string; type: number; start: number; size: number }[] = [];
  for (let off = 0; off + 128 <= dirBytes.length; off += 128) {
    const type = dirBytes[off + 0x42];
    if (type === 0) break;
    const nameLen = u16(dirBytes, off + 0x40);
    let name = '';
    for (let i = 0; i + 1 < nameLen; i += 2) {
      const c = u16(dirBytes, off + i);
      if (c !== 0) name += String.fromCharCode(c);
    }
    entries.push({
      name,
      type,
      start: u32(dirBytes, off + 0x74),
      size: u64(dirBytes, off + 0x78),
    });
  }

  const root = entries.find((e) => e.type === 5);
  if (!root) throw new Error('OLE: no root entry');

  // ---- Mini FAT & mini stream ----
  const miniFatBytes = readChain(firstMiniFatSector, numMiniFatSectors * sectorSize);
  const miniFat = new Map<number, number>();
  for (let i = 0; i < numMiniFatSectors * (sectorSize / 4); i++) {
    miniFat.set(i, u32(miniFatBytes, i * 4));
  }
  const miniStream = readChain(root.start, root.size);

  const readStream = (entry: { start: number; size: number }): Uint8Array => {
    if (entry.size < miniCutoff && entry.start !== ENDOFCHAIN && entry.start !== FREE) {
      // stored in the mini stream
      const out: number[] = [];
      let sec = entry.start;
      let remaining = entry.size;
      let guard = 0;
      while (sec !== ENDOFCHAIN && sec !== FREE && guard < 1e6) {
        const off = sec * miniSectorSize;
        if (off + miniSectorSize > miniStream.length) break;
        const take = Math.min(miniSectorSize, remaining);
        for (let i = 0; i < take; i++) out.push(miniStream[off + i]);
        remaining -= take;
        if (remaining <= 0) break;
        sec = miniFat.get(sec) ?? ENDOFCHAIN;
        guard++;
      }
      return new Uint8Array(out);
    }
    return readChain(entry.start, entry.size);
  };

  return {
    getStream(name: string): Uint8Array | null {
      const e = entries.find((x) => x.type === 2 && x.name.toLowerCase() === name.toLowerCase());
      return e ? readStream(e) : null;
    },
  };
}

function mapChar(code: number): string {
  switch (code) {
    case 0x0d: // paragraph mark
      return '\n';
    case 0x07: // cell mark
      return '\t';
    case 0x0b: // line break
      return '\n';
    case 0x0c: // page break
      return '\n';
    default:
      return String.fromCharCode(code);
  }
}

function decodeAnsi(bytes: Uint8Array): string {
  try {
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return Array.from(bytes, (x) => String.fromCharCode(x)).join('');
  }
}

function decodeUnicode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += mapChar(bytes[i] | (bytes[i + 1] << 8));
  }
  return out;
}

function decodeAnsiMapped(bytes: Uint8Array): string {
  return Array.from(bytes, (x) => mapChar(x)).join('');
}

interface ClxResult {
  pieces: { offset: number; count: number; compressed: boolean }[];
  totalChars: number;
}

function parseClx(clx: Uint8Array, table: Uint8Array, ccpText: number): ClxResult | null {
  let pos = 0;
  while (pos < clx.length) {
    const type = clx[pos];
    pos++;
    if (type === 0x01) {
      // Prc (skip)
      if (pos + 2 > clx.length) return null;
      const cb = u16(clx, pos);
      pos += 2 + cb;
    } else if (type === 0x02) {
      // Pcdt
      if (pos + 4 > clx.length) return null;
      const lcb = u32(clx, pos);
      pos += 4;
      const plc = clx.subarray(pos, pos + lcb);
      pos += lcb;
      const n = Math.floor(lcb / 12);
      if (n < 2) continue;
      const cps: number[] = [];
      for (let i = 0; i < n; i++) cps.push(u32(plc, i * 4));
      const pcdBase = n * 4;
      const pieces: ClxResult['pieces'] = [];
      let total = 0;
      for (let i = 0; i < n - 1; i++) {
        const cpStart = cps[i];
        const cpEnd = Math.min(cps[i + 1], ccpText);
        if (cpEnd <= cpStart) continue;
        const pcd = pcdBase + i * 8;
        const flags = u16(plc, pcd);
        const fc = u32(plc, pcd + 2);
        const compressed = (flags & 0x8000) !== 0;
        const count = cpEnd - cpStart;
        const byteOff = compressed ? fc >> 1 : fc;
        if (byteOff + (compressed ? count : count * 2) > table.length) continue;
        pieces.push({ offset: byteOff, count, compressed });
        total += count;
      }
      return { pieces, totalChars: total };
    } else {
      return null;
    }
  }
  return null;
}

function extractViaPieceTable(wordDoc: Uint8Array, table: Uint8Array, ccpText: number): string {
  // CLX offsets for Word 97-2003 (nFib 193/217)
  const candidates: { fc: number; lcb: number }[] = [];
  if (table.length >= 0x01a8) candidates.push({ fc: u32(wordDoc, 0x01a2), lcb: u32(wordDoc, 0x01a6) });
  // Word 95 fallback offsets
  if (wordDoc.length >= 0x014a) candidates.push({ fc: u32(wordDoc, 0x0142), lcb: u32(wordDoc, 0x0146) });

  for (const { fc, lcb } of candidates) {
    if (lcb <= 0 || lcb > table.length || fc < 0 || fc + lcb > table.length) continue;
    const clx = parseClx(table.subarray(fc, fc + lcb), wordDoc, ccpText);
    if (!clx || clx.pieces.length === 0) continue;
    let out = '';
    for (const piece of clx.pieces) {
      const bytes = wordDoc.subarray(piece.offset, piece.offset + (piece.compressed ? piece.count : piece.count * 2));
      out += piece.compressed ? decodeAnsiMapped(bytes) : decodeUnicode(bytes);
    }
    if (out.replace(/[ \t\n]/g, '').length > 20) return out;
  }
  return '';
}

function heuristicUtf16Scan(wordDoc: Uint8Array): string {
  const parts: string[] = [];
  let run = '';
  let inRun = false;
  for (let i = 0; i + 1 < wordDoc.length; i += 2) {
    const lo = wordDoc[i];
    const hi = wordDoc[i + 1];
    const ok =
      hi === 0x00 &&
      ((lo >= 0x20 && lo <= 0x7e) || lo === 0x0d || lo === 0x09 || lo === 0x0a || lo === 0x0b || lo === 0x0c);
    if (ok) {
      inRun = true;
      run += mapChar(lo);
    } else if (inRun) {
      if (run.trim().length >= 4) parts.push(run);
      run = '';
      inRun = false;
    }
  }
  if (inRun && run.trim().length >= 4) parts.push(run);
  return parts.join('\n');
}

function heuristicAsciiScan(bytes: Uint8Array): string {
  const parts: string[] = [];
  let run = '';
  let inRun = false;
  const push = () => {
    const t = run.trim();
    if (t.length >= 4) parts.push(t);
    run = '';
    inRun = false;
  };
  for (let i = 0; i < bytes.length; i++) {
    const x = bytes[i];
    const ok = (x >= 0x20 && x <= 0x7e) || x === 0x09 || x === 0x0a || x === 0x0d;
    if (ok) {
      inRun = true;
      run += mapChar(x);
    } else if (inRun) {
      push();
    }
  }
  if (inRun) push();
  return parts.join('\n');
}

function isMostlyAsciiText(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 200000);
  if (n < 4) return false;
  let printable = 0;
  for (let i = 0; i < n; i++) {
    const x = bytes[i];
    if ((x >= 0x20 && x <= 0x7e) || x === 0x09 || x === 0x0a || x === 0x0d || x === 0x0c) printable++;
  }
  return printable / n > 0.8;
}

function decodeSmartText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return decodeAnsi(bytes);
  }
}

function rtfByteToChar(code: number): string {
  if (code < 0x80 || code >= 0xa0) return String.fromCharCode(code);
  const CP1252: Record<number, string> = {
    0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
    0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž',
    0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
    0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
  };
  return CP1252[code] ?? String.fromCharCode(code);
}

const RTF_SKIP_GROUPS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'generator', 'pict', 'object',
  'datastore', 'themedata', 'colorschememapping', 'latentstyles', 'nonshppict',
  'revtbl', 'xmlln', 'xmlattrname', 'xmlattrval', 'xmlnstbl', 'htmltag', 'htmlrtf', 'webhidden',
]);

function stripRtf(src: string): string {
  let out = '';
  let i = 0;
  const n = src.length;
  const isCtrlEnd = (ch: string | undefined) => ch === undefined || ch === ' ' || ch === '\\' || ch === '{' || ch === '}' || !/[a-zA-Z]/.test(ch);
  while (i < n) {
    const ch = src[i];
    if (ch === '{') {
      // skip whole destination groups ({\*ctrlword or {\ctrlword) for metadata
      if (src[i + 1] === '\\') {
        let j = i + 2;
        if (src[j] === '*') j++;
        let k = j;
        while (k < n && /[a-zA-Z]/.test(src[k])) k++;
        const cw = src.slice(j, k);
        if (RTF_SKIP_GROUPS.has(cw)) {
          let depth = 1;
          let m = i + 1;
          while (m < n && depth > 0) {
            if (src[m] === '{') depth++;
            else if (src[m] === '}') depth--;
            m++;
          }
          i = m;
          continue;
        }
      }
      i++;
      continue;
    }
    if (ch === '}' || ch === '\r' || ch === '\n') {
      i++;
      continue;
    }
    if (ch === '\\') {
      const c = src[i + 1];
      if (c === '\\' || c === '{' || c === '}') {
        out += c;
        i += 2;
        continue;
      }
      if (c === "'") {
        const code = parseInt(src.slice(i + 2, i + 4), 16);
        if (!isNaN(code)) out += rtfByteToChar(code);
        i += 4;
        continue;
      }
      if (c === 'u') {
        const m = src.slice(i + 2).match(/^\d+/);
        if (m) {
          out += String.fromCharCode(parseInt(m[0], 10) & 0xffff);
          i += 2 + m[0].length;
          if (src[i] === '?') i++;
        } else {
          i += 2;
        }
        continue;
      }
      if (c === 'p' && src[i + 2] === 'a' && src[i + 3] === 'r' && isCtrlEnd(src[i + 4])) {
        out += '\n';
        i += 4;
        continue;
      }
      if (c === 'l' && src[i + 2] === 'i' && src[i + 3] === 'n' && src[i + 4] === 'e' && isCtrlEnd(src[i + 5])) {
        out += '\n';
        i += 5;
        continue;
      }
      if (c === 't' && src[i + 2] === 'a' && src[i + 3] === 'b' && isCtrlEnd(src[i + 4])) {
        out += '\t';
        i += 4;
        continue;
      }
      let j = i + 1;
      while (j < n && /[a-zA-Z]/.test(src[j])) j++;
      while (j < n && /[0-9-]/.test(src[j])) j++;
      if (j < n && src[j] === ' ') j++;
      i = j;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function normalizeText(text: string): string {
  const paragraphs = text.split('\n').map((p) => p.replace(/\r/g, '').trim());
  const kept = paragraphs.filter((p) => p.length > 0);
  return kept.join('\n').slice(0, 200000);
}

export async function extractDocText(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);

  // 1) .doc files that are actually RTF
  const head = String.fromCharCode(...bytes.subarray(0, 64)).replace(/^\uFEFF/, '').trimStart();
  if (/^\{?\\rtf/i.test(head)) {
    const stripped = stripRtf(decodeSmartText(bytes));
    if (stripped.replace(/\s/g, '').length > 20) return normalizeText(stripped);
  }

  // 2) .doc files that are actually plain text / XML / HTML
  if (isMostlyAsciiText(bytes)) {
    const decoded = decodeSmartText(bytes).replace(/[\u0000-\u0008\u000b-\u001f]/g, '');
    if (decoded.trim().length > 0) return normalizeText(decoded);
  }

  // 3) genuine OLE compound file
  try {
    const cfb = parseCfb(arrayBuffer);
    const wordDoc = cfb.getStream('WordDocument');
    if (wordDoc) {
      let ccpText = u32(wordDoc, 0x0044);
      if (!ccpText || ccpText > wordDoc.length * 4) ccpText = u32(wordDoc, 0x0042) || 0;

      const fWhichTblStm = (u16(wordDoc, 0x0a) & 0x0200) !== 0;
      const table = cfb.getStream(fWhichTblStm ? '1Table' : '0Table');

      let text = '';
      if (table && ccpText) {
        try {
          text = extractViaPieceTable(wordDoc, table, ccpText);
        } catch {
          text = '';
        }
      }
      if (!text) text = heuristicUtf16Scan(wordDoc);
      if (!text) text = heuristicAsciiScan(wordDoc);
      if (text) return normalizeText(text);
    }
    // Valid OLE but no usable WordDocument stream — scan the raw file
    const scan = heuristicUtf16Scan(bytes);
    if (scan) return normalizeText(scan);
  } catch {
    // not a parseable OLE file
  }

  // 4) last-resort scans over the raw bytes
  const utf16 = heuristicUtf16Scan(bytes);
  if (utf16) return normalizeText(utf16);
  const ascii = heuristicAsciiScan(bytes);
  if (ascii) return normalizeText(ascii);

  throw new Error('Unable to read text from this .doc file (unsupported or corrupt format).');
}
