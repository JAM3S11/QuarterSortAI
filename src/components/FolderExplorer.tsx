import React, { useState, useMemo } from 'react';
import { ScannedFile, FolderNode, FilterOptions, QuarterId } from '../types';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileCode,
  File,
  ChevronRight,
  Grid,
  List,
  LayoutGrid,
  SlidersHorizontal,
  Eye,
  Info,
  Copy,
  Hash,
  ArrowUpDown,
  Search,
  Check,
} from 'lucide-react';

interface FolderExplorerProps {
  files: ScannedFile[];
  currentFolderPath: string;
  onNavigateFolder: (path: string) => void;
  onPreviewFile: (file: ScannedFile) => void;
  filterOptions: FilterOptions;
  onChangeFilterOptions: (options: FilterOptions) => void;
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  files,
  currentFolderPath,
  onNavigateFolder,
  onPreviewFile,
  filterOptions,
  onChangeFilterOptions,
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: ScannedFile } | null>(null);

  // Compute directory structure & items for current folder path
  const { currentSubfolders, currentFolderFiles, breadcrumbs } = useMemo(() => {
    const normalizedCurrent = currentFolderPath || '/';

    // Breadcrumbs path items
    const parts = normalizedCurrent.split('/').filter(Boolean);
    const crumbs: { name: string; path: string }[] = [{ name: 'USB Root (/)', path: '/' }];
    let accPath = '';
    for (const p of parts) {
      accPath += `/${p}`;
      crumbs.push({ name: p, path: accPath });
    }

    // Filter files matching criteria
    let filtered = files.filter((f) => {
      // Quarter filter
      if (filterOptions.selectedQuarter !== 'ALL' && f.classification.quarter !== filterOptions.selectedQuarter) {
        return false;
      }
      // Month filter
      if (filterOptions.selectedMonth !== 'ALL' && f.classification.month !== filterOptions.selectedMonth) {
        return false;
      }
      // Category filter
      if (filterOptions.selectedCategory !== 'ALL' && f.category !== filterOptions.selectedCategory) {
        return false;
      }
      // Duplicates filter
      if (filterOptions.onlyDuplicates && !f.isDuplicate) {
        return false;
      }
      // Needs Review filter
      if (filterOptions.onlyNeedsReview && !f.classification.needsReview) {
        return false;
      }
      // Search query
      if (filterOptions.searchQuery.trim()) {
        const q = filterOptions.searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchPath = f.path.toLowerCase().includes(q);
        const matchHash = f.sha256.toLowerCase().includes(q);
        const matchQuarter = f.classification.quarter.toLowerCase().includes(q);
        const matchReason = f.classification.reasoning.toLowerCase().includes(q);
        if (!matchName && !matchPath && !matchHash && !matchQuarter && !matchReason) return false;
      }
      return true;
    });

    // Files in current directory
    const folderFiles = filtered.filter((f) => {
      if (filterOptions.searchQuery.trim() || filterOptions.selectedQuarter !== 'ALL') {
        // Flat search results mode when query active
        return true;
      }
      return f.folderPath === normalizedCurrent || (normalizedCurrent === '/' && f.folderPath === '');
    });

    // Derive subfolders in current folder
    const subfolderMap = new Map<string, FolderNode>();

    if (!filterOptions.searchQuery.trim() && filterOptions.selectedQuarter === 'ALL') {
      for (const f of files) {
        if (f.folderPath.startsWith(normalizedCurrent) && f.folderPath !== normalizedCurrent) {
          const relative = normalizedCurrent === '/' ? f.folderPath.slice(1) : f.folderPath.slice(normalizedCurrent.length + 1);
          const subName = relative.split('/')[0];
          if (!subName) continue;

          const subPath = normalizedCurrent === '/' ? `/${subName}` : `${normalizedCurrent}/${subName}`;

          if (!subfolderMap.has(subPath)) {
            subfolderMap.set(subPath, {
              id: subPath,
              name: subName,
              path: subPath,
              parentPath: normalizedCurrent,
              fileCount: 0,
              subfolderCount: 0,
              totalSize: 0,
              modifiedDate: f.modifiedDate,
              quarterDistribution: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
              categoryBreakdown: { Documents: 0, Images: 0, Videos: 0, Audio: 0, Archives: 0, Folders: 0, Executables: 0, Other: 0 },
            });
          }

          const sf = subfolderMap.get(subPath)!;
          sf.fileCount++;
          sf.totalSize += f.size;
          sf.quarterDistribution[f.classification.quarter]++;
          sf.categoryBreakdown[f.category]++;
          if (f.modifiedDate > sf.modifiedDate) sf.modifiedDate = f.modifiedDate;
        }
      }
    }

    const subfoldersArray = Array.from(subfolderMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Sort files
    folderFiles.sort((a, b) => {
      let cmp = 0;
      if (filterOptions.sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (filterOptions.sortBy === 'dateModified') cmp = a.modifiedDate.getTime() - b.modifiedDate.getTime();
      else if (filterOptions.sortBy === 'dateCreated') cmp = a.createdDate.getTime() - b.createdDate.getTime();
      else if (filterOptions.sortBy === 'size') cmp = a.size - b.size;
      else if (filterOptions.sortBy === 'quarter') cmp = a.classification.quarter.localeCompare(b.classification.quarter);

      return filterOptions.sortOrder === 'asc' ? cmp : -cmp;
    });

    return { currentSubfolders: subfoldersArray, currentFolderFiles: folderFiles, breadcrumbs: crumbs };
  }, [files, currentFolderPath, filterOptions]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Documents':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'Images':
        return <ImageIcon className="w-5 h-5 text-emerald-500" />;
      case 'Videos':
        return <Film className="w-5 h-5 text-purple-500" />;
      case 'Audio':
        return <Music className="w-5 h-5 text-pink-500" />;
      case 'Archives':
        return <Archive className="w-5 h-5 text-amber-500" />;
      case 'Executables':
        return <FileCode className="w-5 h-5 text-red-500" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  const handleContextMenu = (e: React.MouseEvent, file: ScannedFile) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const closeContextMenu = () => setContextMenu(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden" onClick={closeContextMenu}>
      {/* Top Controls: Breadcrumb & View Options */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-1 overflow-x-auto text-xs text-slate-600 dark:text-slate-300 font-medium py-1">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <button
                onClick={() => onNavigateFolder(crumb.path)}
                className={`px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap ${
                  idx === breadcrumbs.length - 1
                    ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : ''
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* View Mode & Sorting Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Sort dropdown */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={filterOptions.sortBy}
              onChange={(e) =>
                onChangeFilterOptions({ ...filterOptions, sortBy: e.target.value as any })
              }
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none pr-1 cursor-pointer"
            >
              <option value="name">Name (A-Z)</option>
              <option value="dateModified">Date Modified</option>
              <option value="dateCreated">Date Created</option>
              <option value="size">Size</option>
              <option value="quarter">Quarter</option>
            </select>
            <button
              onClick={() =>
                onChangeFilterOptions({
                  ...filterOptions,
                  sortOrder: filterOptions.sortOrder === 'asc' ? 'desc' : 'asc',
                })
              }
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              {filterOptions.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* View mode buttons */}
          <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => onChangeFilterOptions({ ...filterOptions, viewMode: 'grid' })}
              title="Grid View"
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                filterOptions.viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChangeFilterOptions({ ...filterOptions, viewMode: 'list' })}
              title="List View"
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                filterOptions.viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChangeFilterOptions({ ...filterOptions, viewMode: 'largeIcons' })}
              title="Large Icons View"
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                filterOptions.viewMode === 'largeIcons'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Only the folders + files region scrolls; the breadcrumb/sort controls stay fixed. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden thin-scrollbar overscroll-contain pr-1 space-y-4">
      {/* Folders Section (Alphabetical Subfolders) */}
      {currentSubfolders.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Folders ({currentSubfolders.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {currentSubfolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onNavigateFolder(folder.path)}
                className="group p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition-all duration-200 hover:shadow-md flex flex-col justify-between"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                    <Folder className="w-6 h-6 fill-amber-500/20" />
                  </div>
                  <div className="truncate flex-1">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate block">
                      {folder.name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {folder.fileCount} files • {formatSize(folder.totalSize)}
                    </span>
                  </div>
                </div>

                {/* Quarter distribution mini bar */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex mt-1">
                  <div className="bg-emerald-500" style={{ width: `${(folder.quarterDistribution.Q1 / Math.max(folder.fileCount, 1)) * 100}%` }} title="Q1 Files" />
                  <div className="bg-cyan-500" style={{ width: `${(folder.quarterDistribution.Q2 / Math.max(folder.fileCount, 1)) * 100}%` }} title="Q2 Files" />
                  <div className="bg-amber-500" style={{ width: `${(folder.quarterDistribution.Q3 / Math.max(folder.fileCount, 1)) * 100}%` }} title="Q3 Files" />
                  <div className="bg-indigo-500" style={{ width: `${(folder.quarterDistribution.Q4 / Math.max(folder.fileCount, 1)) * 100}%` }} title="Q4 Files" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Files ({currentFolderFiles.length})
          </h3>
          {currentFolderFiles.length === 0 && currentSubfolders.length === 0 && (
            <span className="text-xs text-slate-400">No documents found matching filters</span>
          )}
        </div>

        {/* Empty State */}
        {currentFolderFiles.length === 0 && currentSubfolders.length === 0 && (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Directory or Filter Result Empty</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No files match the selected quarter or criteria in this directory. Try clearing search filters.
            </p>
          </div>
        )}

        {/* VIEW 1: Grid View */}
        {filterOptions.viewMode === 'grid' && currentFolderFiles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {currentFolderFiles.map((file) => {
              const isSelected = selectedFileId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  onDoubleClick={() => onPreviewFile(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform shrink-0">
                      {getCategoryIcon(file.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {file.name}
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                          {file.classification.quarter}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-mono truncate">{file.path}</p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                        <span>{formatSize(file.size)}</span>
                        <span>{file.classification.month}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {file.classification.source}
                        </span>
                        {file.classification.needsReview && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Needs Review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {file.isDuplicate && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Duplicate
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: List View */}
        {filterOptions.viewMode === 'list' && currentFolderFiles.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
            <table className="w-full min-w-[720px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Quarter</th>
                  <th className="py-3 px-3">Month</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Modified</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {currentFolderFiles.map((file) => (
                  <tr
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    onDoubleClick={() => onPreviewFile(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
className={`transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                    selectedFileId === file.id ? 'bg-emerald-500/5' : ''
                  }`}
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2.5">
                      {getCategoryIcon(file.category)}
                      <span className="truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                        {file.classification.quarter}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">
                      {file.classification.month}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        file.classification.confidence >= 0.85
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : file.classification.confidence >= 0.60
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}>
                        {(file.classification.confidence * 100).toFixed(0)}%
                      </span>
                      {file.classification.needsReview && (
                        <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Review
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{file.category}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{formatSize(file.size)}</td>
                    <td className="py-2.5 px-3 text-slate-400">{file.modifiedDate.toISOString().split('T')[0]}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewFile(file);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: Large Icons View */}
        {filterOptions.viewMode === 'largeIcons' && currentFolderFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {currentFolderFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                onDoubleClick={() => onPreviewFile(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-center transition-all duration-200 cursor-pointer group flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  {getCategoryIcon(file.category)}
                </div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-2 w-full break-words">
                  {file.name}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">{formatSize(file.size)}</span>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 w-52 text-xs font-medium text-slate-700 dark:text-slate-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              onPreviewFile(contextMenu.file);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span>Preview Document</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.file.path);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
          >
            <Copy className="w-3.5 h-3.5 text-blue-500" />
            <span>Copy Virtual Path</span>
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.file.sha256);
              closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2"
          >
            <Hash className="w-3.5 h-3.5 text-amber-500" />
            <span>Copy SHA-256 Hash</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

          <div className="px-3 py-1 text-[10px] text-slate-400 uppercase font-bold">
            Source: {contextMenu.file.classification.source}
          </div>
        </div>
      )}
    </div>
  );
};
