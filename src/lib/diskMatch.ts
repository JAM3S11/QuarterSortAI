import { PhysicalDisk } from '../types';

export function matchPhysicalDisk(disks: PhysicalDisk[], scannerRootName?: string): PhysicalDisk | null {
  if (!scannerRootName) return null;

  const normalized = scannerRootName.trim().toLowerCase();
  if (!normalized) return null;

  const removable = disks.filter((d) => d.driveType === 'removable');
  const candidates = removable.length > 0 ? removable : disks;

  const exact = candidates.find((d) => d.label && d.label.trim().toLowerCase() === normalized);
  if (exact) return exact;

  const partial = candidates.find(
    (d) =>
      d.label &&
      (d.label.trim().toLowerCase().includes(normalized) || normalized.includes(d.label.trim().toLowerCase()))
  );
  if (partial) return partial;

  return null;
}