import { ScannedFile } from '../types';

export async function readFileBlob(file: ScannedFile): Promise<Blob | null> {
  if (file.handle) {
    try {
      if ('getFile' in file.handle) {
        return await (file.handle as FileSystemFileHandle).getFile();
      }
      if (file.handle instanceof File) return file.handle;
    } catch {
      /* ignore */
    }
  }
  if (file.contentUrl) {
    try {
      const res = await fetch(file.contentUrl);
      if (res.ok) return await res.blob();
    } catch {
      /* ignore */
    }
  }
  return null;
}
