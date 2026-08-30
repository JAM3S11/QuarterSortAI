import { PhysicalDisk } from '../types';

export function matchPhysicalDisk(disks: PhysicalDisk[], scannerRootName?: string): PhysicalDisk | null {
  if (!scannerRootName) return null;

  const raw = scannerRootName.trim().toLowerCase();
  if (!raw) return null;

  // 1. Drive letter embedded in the scanned root (e.g. "G:", "C:")
  //    Covers cases where the browser returns absolute paths like "G:/SomeFolder/file.pdf".
  const driveLetter = raw.match(/\b([a-z]):/);
  if (driveLetter) {
    const letter = driveLetter[1];
    const byLetter = disks.find((d) => {
      const id = (d.id || d.mountPoint || '').trim().toLowerCase().replace(/\\$/, '');
      return id.replace(':', '') === letter;
    });
    if (byLetter) return byLetter;
  }

  // 2. Label match — prefer removable drives so fixed disks (e.g. Local Disk C:)
  //    stay a fallback unless they are the only candidates.
  const removable = disks.filter((d) => d.driveType === 'removable');
  const candidates = removable.length > 0 ? removable : disks;

  const exact = candidates.find((d) => d.label && d.label.trim().toLowerCase() === raw);
  if (exact) return exact;

  const partial = candidates.find(
    (d) =>
      d.label &&
      (d.label.trim().toLowerCase().includes(raw) || raw.includes(d.label.trim().toLowerCase()))
  );
  if (partial) return partial;

  return null;
}

export function driveLetterOf(disk: PhysicalDisk): string | null {
  const id = (disk.id || disk.mountPoint || '').trim().replace(/\\$/, '');
  const match = id.match(/^([a-z]):$/i);
  return match ? match[1].toUpperCase() : null;
}