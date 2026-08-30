import { ScannedFile } from '../types';
import { classifyFileQuarter, extractMetadataFromDocx, extractMetadataFromPDF } from './quarterEngine';

const CONTENT_EXTS = new Set(['jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp', 'heic', 'docx', 'pdf']);

export interface OCRProgress {
  current: number;
  total: number;
  fileName: string;
}

async function readBlob(file: ScannedFile): Promise<Blob | null> {
  if (!file.handle) return null;
  try {
    if ('getFile' in file.handle) {
      return await (file.handle as FileSystemFileHandle).getFile();
    } else if (file.handle instanceof File) {
      return file.handle;
    }
  } catch {}
  return null;
}

export async function runOCR(
  files: ScannedFile[],
  onProgress?: (p: OCRProgress) => void
): Promise<void> {
  const toProcess = files.filter(f => CONTENT_EXTS.has(f.extension));
  if (toProcess.length === 0) return;

  const { recognize } = await import('tesseract.js');

  const BATCH_SIZE = 4;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (file) => {
      onProgress?.({ current: i + batch.indexOf(file), total: toProcess.length, fileName: file.name });
      const blob = await readBlob(file);
      if (!blob) return;
      let text = '';
      let embeddedDate: string | undefined;
      try {
        if (file.extension === 'docx') {
          const arrayBuffer = await blob.arrayBuffer();
          const { extractRawText } = await import('mammoth');
          const result = await extractRawText({ arrayBuffer });
          text = result.value.trim();
          const meta = extractMetadataFromDocx(arrayBuffer);
          embeddedDate = meta.createdDate || meta.modifiedDate;
        } else if (file.extension === 'pdf') {
          text = await extractPdfText(blob);
        } else {
          const { data } = await recognize(blob, 'eng');
          text = data.text.trim();
        }
        if (text || embeddedDate) {
          file.classification = classifyFileQuarter(
            file.name,
            file.folderPath || '/',
            file.modifiedDate,
            file.createdDate,
            embeddedDate,
            text
          );
          if (text) file.textContent = text.slice(0, 10000);
        }
      } catch {}
      onProgress?.({ current: i + batch.indexOf(file) + 1, total: toProcess.length, fileName: file.name });
    }));
  }
}

async function extractPdfText(blob: Blob): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.2.108/pdf.worker.min.mjs';
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const texts: string[] = [];
    for (let p = 1; p <= Math.min(pdf.numPages, 10); p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      texts.push(content.items.map((item: any) => item.str).join(' '));
    }
    return texts.join('\n').trim();
  } catch {
    return '';
  }
}
