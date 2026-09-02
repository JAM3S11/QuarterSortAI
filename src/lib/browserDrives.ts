import { PhysicalDisk } from '../types';

/**
 * Browser cannot enumerate physical drives or read their real total/free
 * capacity (sandboxed File System Access API). But we CAN measure the actual
 * used bytes of whatever folder the user picks and surface the drive letter /
 * label that the picker reveals, so the connect dialog is useful even when the
 * server-side `/api/disk-stats` endpoint (which powershell/wmic on the host OS)
 * is not deployed — e.g. on Vercel static hosting.
 *
 * `pickAndMeasureDrive` opens the folder picker, walks the selected root with a
 * hard bound (so a huge C: drive doesn't freeze the tab) to derive used bytes,
 * and detects the drive letter / label from the directory handle name.
 */

export interface PickedDrive {
  disk: PhysicalDisk;
  dirHandle: FileSystemDirectoryHandle;
}

function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function';
}

/** Windows Chromium names the root directory handle with the drive path, e.g. "C:", "E:\". */
function detectDriveLetter(name: string): string | null {
  const m = name.trim().match(/^([a-z]):/i);
  return m ? m[1].toUpperCase() : null;
}

/** Strip `(letter:)` from a label like "USB DISK (E:)" -> "USB DISK". */
function cleanLabel(name: string): string {
  return name.replace(/\s*\([a-z]:\)\s*$/i, '').trim() || null;
}

async function measureUsedBytes(
  dir: FileSystemDirectoryHandle,
  maxFiles: number,
  maxBytes: number,
  budgetFiles = 2000
): Promise<number> {
  let used = 0;
  let seen = 0;

  async function walk(d: FileSystemDirectoryHandle, budgetLeft: number): Promise<number> {
    if (budgetLeft <= 0 || maxFiles > 0 && seen >= maxFiles) return budgetLeft;
    let budget = budgetLeft;
    for await (const entry of (d as any).values()) {
      if (maxFiles > 0 && seen >= maxFiles) return budget;
      if (entry.kind === 'file') {
        try {
          const f = await (entry as FileSystemFileHandle).getFile();
          if (!Number.isFinite(f.size)) continue;
          used += f.size;
          seen++;
          budget--;
          if (used >= maxBytes) return 0;
        } catch {
          // unreadable file — skip
        }
      } else if (entry.kind === 'directory') {
        budget = await walk(entry as FileSystemDirectoryHandle, budget);
      }
      if (budget <= 0 && maxFiles > 0) return budget;
    }
    return budget;
  }

  await walk(dir, budgetFiles);
  return used;
}

/**
 * Build a PhysicalDisk from a directory handle the user has ALREADY picked.
 * Reuses an existing handle so callers don't have to prompt the user twice.
 */
export async function measureDriveFromHandle(
  dirHandle: FileSystemDirectoryHandle,
  maxFiles = 0,
  maxBytes = Infinity
): Promise<PhysicalDisk | null> {
  if (!dirHandle) return null;
  const rawName = dirHandle.name || '';
  const letter = detectDriveLetter(rawName);
  const label = cleanLabel(rawName);
  const usedBytes = await measureUsedBytes(dirHandle, maxFiles, maxBytes);

  // Browser can't read the true total, so derive a readable total from the
  // measured used bytes (consistent with the scanner's estimator).
  const estimatedTotal = Math.max(usedBytes * 1.5, 8 * 1024 * 1024 * 1024);

  return {
    id: letter ? `${letter}:` : rawName || 'USB_FLASH_DRIVE',
    label: label || (letter ? `Drive (${letter}:)` : rawName || null),
    mountPoint: letter ? `${letter}:` : rawName || null,
    filesystem: null,
    totalCapacityBytes: estimatedTotal,
    freeBytes: Math.max(0, estimatedTotal - usedBytes),
    driveType: 'removable',
  };
}

/**
 * Open the folder picker, read the drive letter/label the browser exposes for
 * the selected root, and measure actual used bytes. totalCapacityBytes is
 * unknown to the browser, so we size it off the measured used bytes and expose
 * the selection through the normal PhysicalDisk shape (marked removable).
 */
export async function pickAndMeasureDrive(maxFiles = 0, maxBytes = Infinity): Promise<PickedDrive | null> {
  if (!supportsDirectoryPicker()) return null;

  let dirHandle: FileSystemDirectoryHandle;
  try {
    dirHandle = await (window as any).showDirectoryPicker();
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    throw err;
  }

  const disk = await measureDriveFromHandle(dirHandle, maxFiles, maxBytes);
  return disk ? { disk, dirHandle } : null;
}

export { supportsDirectoryPicker };
