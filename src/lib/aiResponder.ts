import { ScannedFile, QuarterId, FileCategory } from '../types';

export interface RepoContext {
  totalFiles: number;
  totalFolders: number;
  quarterBreakdown: Record<QuarterId, number>;
  categoryBreakdown: Record<FileCategory, number>;
  duplicateSavingsMB: number;
  duplicateFiles: number;
  topDirectories: string[];
}

const MB = 1024 * 1024;

/** Build a compact, serializable summary of the scanned repository. */
export function buildRepoContext(files: ScannedFile[], totalFolders: number): RepoContext {
  const quarterBreakdown: Record<QuarterId, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const categoryBreakdown: Record<FileCategory, number> = {
    Documents: 0,
    Images: 0,
    Videos: 0,
    Audio: 0,
    Archives: 0,
    Folders: 0,
    Executables: 0,
    Other: 0,
  };
  const dirCounts: Record<string, number> = {};
  const hashMap = new Map<string, number>();
  let dupSavingsBytes = 0;
  let dupFiles = 0;

  for (const f of files) {
    quarterBreakdown[f.classification.quarter] = (quarterBreakdown[f.classification.quarter] || 0) + 1;
    categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + 1;

    const dir = f.folderPath && f.folderPath !== '/' ? f.folderPath.split('/').filter(Boolean)[0] : '(root)';
    dirCounts[dir] = (dirCounts[dir] || 0) + 1;

    if (hashMap.has(f.sha256)) {
      dupSavingsBytes += f.size;
      dupFiles++;
    } else {
      hashMap.set(f.sha256, 1);
    }
  }

  const topDirectories = Object.entries(dirCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([dir]) => dir);

  return {
    totalFiles: files.length,
    totalFolders,
    quarterBreakdown,
    categoryBreakdown,
    duplicateSavingsMB: dupSavingsBytes / MB,
    duplicateFiles: dupFiles,
    topDirectories,
  };
}

function fmtMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function topKey(obj: Record<string, number>): string | null {
  let best: string | null = null;
  let bestVal = -1;
  for (const [k, v] of Object.entries(obj)) {
    if (v > bestVal) {
      bestVal = v;
      best = k;
    }
  }
  return best;
}

/** Rule-based answerer that works fully offline (e.g. Vercel static hosting). */
export function answerQuestion(question: string, ctx: RepoContext): string {
  const q = question.toLowerCase();

  const human = (n: number) => n.toLocaleString();

  // Category with most / least files
  if (/category|type of file|file type|most files|what kinds|kinds of files|distribution/.test(q)) {
    const topCat = topKey(ctx.categoryBreakdown);
    const entries = Object.entries(ctx.categoryBreakdown)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      return 'No files have been indexed yet, so I have no category breakdown to report. Connect a drive or load the demo dataset and ask me again.';
    }
    const topPct = ctx.totalFiles ? ((ctx.categoryBreakdown[topCat as FileCategory] || 0) / ctx.totalFiles) * 100 : 0;
    const line = entries.slice(0, 4).map(([c, n]) => `${c}: ${human(n)}`).join(' · ');
    return `Across your ${human(ctx.totalFiles)} indexed files, ${topCat} dominates at ${
      human(ctx.categoryBreakdown[topCat as FileCategory] || 0)
    } files (${topPct.toFixed(0)}%).\n\nBreakdown: ${line}.`;
  }

  // Quarter distribution
  if (/quarter|q1|q2|q3|q4|how are (files|my data) (organized|grouped)|distribution/.test(q)) {
    const active = Object.entries(ctx.quarterBreakdown).filter(([, v]) => v > 0);
    if (active.length === 0) {
      return 'I don\'t see any quarter classification yet — no files have been scanned. Connect a drive first.';
    }
    const total = active.reduce((s, [, v]) => s + v, 0);
    const line = active
      .sort((a, b) => b[1] - a[1])
      .map(([qtr, n]) => `${qtr}: ${human(n)} (${total ? ((n / total) * 100).toFixed(0) : 0}%)`)
      .join(' · ');
    const busiest = active.sort((a, b) => b[1] - a[1])[0];
    return `Your files are grouped into financial quarters as follows:\n\n${line}.\n\n${busiest[0]} is your busiest quarter with ${human(busiest[1])} files.`;
  }

  // Duplicates
  if (/duplicate|dupes|redundant|copies|reclaim/.test(q)) {
    if (ctx.duplicateFiles === 0) {
      return 'Great news — no duplicate files were detected in the scanned repository, so there is nothing to reclaim.';
    }
    return `I found ${human(ctx.duplicateFiles)} duplicate copies totaling roughly ${fmtMB(ctx.duplicateSavingsMB)} of reclaimable space. Running the built-in Duplicate Center and consolidating replicas into a single archive would recover that storage.`;
  }

  // Storage / size / optimization
  if (/storage|space|size|capacity|optim|large|volume|used|free|how big/.test(q)) {
    const dupLine = ctx.duplicateFiles > 0
      ? ` and ~${fmtMB(ctx.duplicateSavingsMB)} is wasted on duplicates`
      : '';
    return `You have ${human(ctx.totalFiles)} files across ${human(ctx.totalFolders)} folders. The biggest opportunities for storage optimization${dupLine}. I'd suggest archiving legacy uncompressed archives and enforcing strict naming for new records.`;
  }

  // Folder / structure / organization
  if (/folder|director|structured|organiz|layout|where/.test(q)) {
    if (ctx.topDirectories.length === 0) {
      return 'No folders have been indexed yet. Scan a drive to see the repository structure.';
    }
    let answer = `Your repository is organized across ${human(ctx.totalFolders)} folders. The most populated top-level areas are:\n\n`;
    const dirList = ctx.topDirectories.map((d, i) => `  ${i + 1}. ${d}`).join('\n');
    answer += dirList;
    return answer;
  }

  // Total count
  if (/how many (files|folders)|total (files|folders)|count|amount of (files|data)/.test(q)) {
    return `Your repository currently holds ${human(ctx.totalFiles)} files across ${human(ctx.totalFolders)} directories.`;
  }

  // Help / what can you do
  if (/help|what can you|what do you do|how (do|can) i/.test(q)) {
    return `I can answer questions about your scanned repository, such as:\n\n• Which category or quarter has the most files\n• Where duplicates are hiding and how much space they waste\n• How your folders are organized\n• Storage optimization suggestions\n\nTry asking something like "Which quarter is the busiest?"`;
  }

  // General default
  if (ctx.totalFiles === 0) {
    return 'I don\'t have any scanned data to work with yet. Connect a USB drive or load the demo dataset, then ask me anything about your repository.';
  }
  return `I can't give a precise answer to that specific question, but here's a snapshot of your repository: ${human(ctx.totalFiles)} files across ${human(ctx.totalFolders)} folders. ${
    ctx.duplicateFiles > 0 ? `I also detected ${human(ctx.duplicateFiles)} duplicates (~${fmtMB(ctx.duplicateSavingsMB)}), which you can clean up in the Duplicate Center.` : 'No duplicates were detected.'
  }\n\nTry asking about categories, quarters, storage, or folder organization for more detail.`;
}
