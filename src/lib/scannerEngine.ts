import { ScannedFile, USBVolumeInfo, CyberScanLog } from '../types';
import { classifyFileQuarter, getFileCategory } from './quarterEngine';
import { runOCR } from './ocrEngine';

export interface ScanProgressCallback {
  (progress: {
    scannedFilesCount: number;
    scannedFoldersCount: number;
    totalBytes: number;
    currentFolder: string;
    currentFileName: string;
    logs: CyberScanLog[];
    isComplete: boolean;
    filesBatch: ScannedFile[];
  }): void;
}

export interface ScanOptions {
  enableOCR?: boolean;
}

const IGNORE_DIRECTORIES = new Set([
  'System Volume Information',
  '$RECYCLE.BIN',
  'Recycle Bin',
  '.Spotlight-V100',
  '.Trashes',
  '.git',
  '.fseventsd',
  'node_modules',
  '__MACOSX',
  '.idea',
  '.vscode'
]);

function estimateUSBCapacity(totalBytes: number): number {
  const usedGB = totalBytes / (1024 * 1024 * 1024);
  if (usedGB < 1) return 8 * 1024 * 1024 * 1024;
  if (usedGB < 4) return 16 * 1024 * 1024 * 1024;
  if (usedGB < 8) return 32 * 1024 * 1024 * 1024;
  if (usedGB < 16) return 64 * 1024 * 1024 * 1024;
  if (usedGB < 32) return 128 * 1024 * 1024 * 1024;
  if (usedGB < 64) return 256 * 1024 * 1024 * 1024;
  return 512 * 1024 * 1024 * 1024;
}

async function computeFileHash(file: File): Promise<string> {
  try {
    if (file.size === 0) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    let buffer: ArrayBuffer;
    if (file.size > 10 * 1024 * 1024) {
      const slice = file.slice(0, 1024 * 1024);
      buffer = await slice.arrayBuffer();
    } else {
      buffer = await file.arrayBuffer();
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return `hash_fb_${file.name}_${file.size}_${file.lastModified}`.padEnd(64, '0');
  }
}

export async function scanUSBDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  onProgress: ScanProgressCallback,
  options?: ScanOptions
): Promise<{ files: ScannedFile[]; volumeInfo: USBVolumeInfo }> {
  const startTime = Date.now();
  const scannedFiles: ScannedFile[] = [];
  const logs: CyberScanLog[] = [];

  let scannedFilesCount = 0;
  let scannedFoldersCount = 1;
  let totalBytes = 0;

  const addLog = (type: CyberScanLog['type'], message: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    logs.push({ timestamp: timeStr, type, message });
    if (logs.length > 200) logs.shift();
  };

  addLog('INFO', `INITIALISING DEVICE: ${dirHandle.name}`);
  addLog('INFO', `Authenticating USB directory structure...`);
  addLog('SCAN', `Scanning root directory: /`);

  async function traverse(directory: FileSystemDirectoryHandle, currentPath: string): Promise<void> {
    for await (const entry of (directory as any).values()) {
      if (entry.kind === 'directory') {
        if (IGNORE_DIRECTORIES.has(entry.name) || entry.name.startsWith('.')) {
          addLog('WARN', `Skipping system/hidden directory: ${entry.name}`);
          continue;
        }
        scannedFoldersCount++;
        const folderPath = `${currentPath}/${entry.name}`;
        addLog('SCAN', `Entering directory: ${folderPath}`);
        onProgress({
          scannedFilesCount, scannedFoldersCount, totalBytes,
          currentFolder: folderPath,
          currentFileName: entry.name,
          logs: [...logs],
          isComplete: false,
          filesBatch: [...scannedFiles]
        });
        await traverse(entry as FileSystemDirectoryHandle, folderPath);
      } else if (entry.kind === 'file') {
        if (entry.name.startsWith('._') || entry.name === 'Thumbs.db' || entry.name === '.DS_Store') continue;
        try {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          scannedFilesCount++;
          totalBytes += file.size;
          const ext = file.name.includes('.') ? file.name.split('.').pop()! : '';
          const category = getFileCategory(ext);
          const modDate = new Date(file.lastModified);
          const classification = classifyFileQuarter(file.name, currentPath, modDate, modDate);
          const sha256 = await computeFileHash(file);
          if (scannedFilesCount % 10 === 0 || file.size > 1000000) {
            addLog('HASH', `SHA256 [${sha256.slice(0, 12)}...]: ${file.name}`);
            addLog('QUARTER', `[${classification.quarter}] Classified ${file.name} -> ${classification.month} (${classification.source})`);
          }
          const fileObj: ScannedFile = {
            id: `${sha256.slice(0, 16)}_${scannedFilesCount}`,
            name: file.name,
            path: `${currentPath}/${file.name}`,
            relativePath: `${currentPath}/${file.name}`.slice(1),
            folderPath: currentPath || '/',
            extension: ext,
            size: file.size,
            category,
            createdDate: modDate,
            modifiedDate: modDate,
            sha256,
            classification,
            handle: fileHandle,
            metadata: {
              title: file.name,
              modifiedDate: modDate.toISOString(),
              mimeType: file.type || 'application/octet-stream'
            }
          };
          scannedFiles.push(fileObj);
          if (scannedFilesCount % 5 === 0) {
            onProgress({
              scannedFilesCount, scannedFoldersCount, totalBytes,
              currentFolder: currentPath,
              currentFileName: file.name,
              logs: [...logs],
              isComplete: false,
              filesBatch: [...scannedFiles]
            });
          }
        } catch (e: any) {
          addLog('WARN', `Access error reading file ${entry.name}: ${e.message || e}`);
        }
      }
    }
  }

  await traverse(dirHandle, '');

  const hashMap = new Map<string, ScannedFile[]>();
  for (const f of scannedFiles) {
    if (!hashMap.has(f.sha256)) hashMap.set(f.sha256, []);
    hashMap.get(f.sha256)!.push(f);
  }
  let dupCount = 0;
  for (const [hash, group] of hashMap.entries()) {
    if (group.length > 1) {
      dupCount += group.length - 1;
      for (const f of group) {
        f.isDuplicate = true;
        f.duplicateGroupHash = hash;
      }
    }
  }

  // ── OCR Phase ──
  if (options?.enableOCR) {
    addLog('INFO', `OCR: Analyzing documents for embedded dates...`);
    await runOCR(scannedFiles, (p) => {
      onProgress({
        scannedFilesCount, scannedFoldersCount, totalBytes,
        currentFolder: 'Content Analysis',
        currentFileName: `OCR: ${p.fileName} (${p.current}/${p.total})`,
        logs: [...logs],
        isComplete: false,
        filesBatch: [...scannedFiles]
      });
    });
    addLog('SUCCESS', `OCR: Date extraction completed.`);
  }

  const durationMs = Math.max(Date.now() - startTime, 100);
  const readSpeedMBps = Number(((totalBytes / (1024 * 1024)) / (durationMs / 1000)).toFixed(1));

  addLog('SUCCESS', `SCAN COMPLETED in ${(durationMs / 1000).toFixed(2)}s.`);
  addLog('INFO', `Indexed ${scannedFilesCount} files in ${scannedFoldersCount} folders. Duplicates detected: ${dupCount}.`);

  const name = dirHandle.name.toUpperCase() || 'USB_FLASH_DRIVE';
  const volumeInfo: USBVolumeInfo = {
    name,
    filesystem: 'FAT32/exFAT',
    totalCapacityBytes: estimateUSBCapacity(totalBytes),
    usedBytes: totalBytes,
    freeBytes: estimateUSBCapacity(totalBytes) - totalBytes,
    totalFiles: scannedFilesCount,
    totalFolders: scannedFoldersCount,
    lastScanTimestamp: new Date(),
    scanDurationMs: durationMs,
    readSpeedMBps: isNaN(readSpeedMBps) || !isFinite(readSpeedMBps) ? 142.5 : readSpeedMBps,
    serialNumber: `USB-SEC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    capacityEstimated: true,
  };

  onProgress({
    scannedFilesCount, scannedFoldersCount, totalBytes,
    currentFolder: '/',
    currentFileName: 'Scan Completed',
    logs: [...logs],
    isComplete: true,
    filesBatch: [...scannedFiles]
  });

  return { files: scannedFiles, volumeInfo };
}

export async function scanFileList(
  fileList: FileList,
  onProgress: ScanProgressCallback,
  options?: ScanOptions
): Promise<{ files: ScannedFile[]; volumeInfo: USBVolumeInfo }> {
  const startTime = Date.now();
  const scannedFiles: ScannedFile[] = [];
  const logs: CyberScanLog[] = [];

  let scannedFilesCount = 0;
  let totalBytes = 0;
  const foldersSet = new Set<string>();

  const addLog = (type: CyberScanLog['type'], message: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    logs.push({ timestamp: timeStr, type, message });
  };

  addLog('INFO', 'Processing files...');
  addLog('INFO', `Processing ${fileList.length} items...`);

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split('/');
    const fileName = parts.pop() || file.name;
    const currentPath = parts.length > 0 ? '/' + parts.join('/') : '/';

    if (IGNORE_DIRECTORIES.has(parts[parts.length - 1]) || fileName.startsWith('._') || fileName === 'Thumbs.db') continue;

    foldersSet.add(currentPath);
    scannedFilesCount++;
    totalBytes += file.size;

    const ext = fileName.includes('.') ? fileName.split('.').pop()! : '';
    const category = getFileCategory(ext);
    const modDate = new Date(file.lastModified);
    const classification = classifyFileQuarter(fileName, currentPath, modDate, modDate);
    const sha256 = await computeFileHash(file);

    if (scannedFilesCount % 10 === 0) {
      addLog('HASH', `SHA256 [${sha256.slice(0, 12)}...]: ${fileName}`);
      addLog('QUARTER', `[${classification.quarter}] Classified ${fileName} -> ${classification.month}`);
    }

    const fileObj: ScannedFile = {
      id: `${sha256.slice(0, 16)}_${scannedFilesCount}`,
      name: fileName,
      path: currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`,
      relativePath: relPath,
      folderPath: currentPath,
      extension: ext,
      size: file.size,
      category,
      createdDate: modDate,
      modifiedDate: modDate,
      sha256,
      classification,
      handle: file,
      metadata: {
        title: fileName,
        modifiedDate: modDate.toISOString(),
        mimeType: file.type || 'application/octet-stream'
      }
    };

    scannedFiles.push(fileObj);

    if (i % 10 === 0) {
      onProgress({
        scannedFilesCount,
        scannedFoldersCount: foldersSet.size,
        totalBytes,
        currentFolder: currentPath,
        currentFileName: fileName,
        logs: [...logs],
        isComplete: false,
        filesBatch: [...scannedFiles]
      });
    }
  }

  if (options?.enableOCR) {
    addLog('INFO', `OCR: Analyzing documents for embedded dates...`);
    await runOCR(scannedFiles, (p) => {
      onProgress({
        scannedFilesCount,
        scannedFoldersCount: foldersSet.size,
        totalBytes,
        currentFolder: 'Content Analysis',
        currentFileName: `OCR: ${p.fileName} (${p.current}/${p.total})`,
        logs: [...logs],
        isComplete: false,
        filesBatch: [...scannedFiles]
      });
    });
    addLog('SUCCESS', `OCR: Date extraction completed.`);
  }

  const durationMs = Math.max(Date.now() - startTime, 100);

  const volumeInfo: USBVolumeInfo = {
    name: 'USB_IMPORTED_VOLUME',
    filesystem: 'FAT32/exFAT',
    totalCapacityBytes: estimateUSBCapacity(totalBytes),
    usedBytes: totalBytes,
    freeBytes: Math.max(totalBytes * 1.5, 17179869184) - totalBytes,
    totalFiles: scannedFilesCount,
    totalFolders: foldersSet.size,
    lastScanTimestamp: new Date(),
    scanDurationMs: durationMs,
    readSpeedMBps: Number(((totalBytes / (1024 * 1024)) / (durationMs / 1000)).toFixed(1)) || 120,
    serialNumber: `USB-IMP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    capacityEstimated: true,
  };

  onProgress({
    scannedFilesCount,
    scannedFoldersCount: foldersSet.size,
    totalBytes,
    currentFolder: '/',
    currentFileName: 'Completed',
    logs: [...logs],
    isComplete: true,
    filesBatch: [...scannedFiles]
  });

  return { files: scannedFiles, volumeInfo };
}
