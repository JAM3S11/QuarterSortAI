import React, { useState, useMemo, useEffect } from 'react';
import { ScannedFile } from '../types';
import { readFileBlob } from '../lib/blob';
import {
  Image as ImageIcon,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  GalleryThumbnails,
  LayoutGrid,
  Grid2x2,
  Grid3x3,
  List,
  TableProperties,
  PanelsTopLeft,
  StretchHorizontal,
} from 'lucide-react';

interface PhotoGalleryProps {
  files: ScannedFile[];
}

type GalleryViewMode =
  | 'xlIcons'
  | 'lgIcons'
  | 'mdIcons'
  | 'smIcons'
  | 'list'
  | 'details'
  | 'tiles'
  | 'content';

interface ImageFormat {
  key: string;
  label: string;
  extensions: string[];
  description: string;
}

const IMAGE_FORMATS: ImageFormat[] = [
  {
    key: 'jpeg',
    label: 'JPEG',
    extensions: ['jpg', 'jpeg', 'jpe', 'jfif'],
    description: 'Best for photographs and complex color images using lossy compression.',
  },
  {
    key: 'png',
    label: 'PNG',
    extensions: ['png', 'apng'],
    description: 'Best for graphics requiring transparency and lossless quality.',
  },
  {
    key: 'webp',
    label: 'WebP',
    extensions: ['webp'],
    description: 'Modern format by Google offering high compression and quality for web images.',
  },
  {
    key: 'gif',
    label: 'GIF',
    extensions: ['gif'],
    description: 'Used for simple animated clips and low-color graphics.',
  },
  {
    key: 'svg',
    label: 'SVG',
    extensions: ['svg', 'svgz'],
    description: 'Vector format ideal for logos and UI elements that scale to any size.',
  },
  {
    key: 'avif',
    label: 'AVIF',
    extensions: ['avif', 'avifs'],
    description: 'Next-generation format providing superior compression and color depth.',
  },
];

const imageExtSet = new Set(IMAGE_FORMATS.flatMap((f) => f.extensions));

const formatByKey = (key: string) => IMAGE_FORMATS.find((f) => f.key === key);

const VIEW_MODES: { id: GalleryViewMode; label: string; icon: React.ElementType }[] = [
  { id: 'xlIcons', label: 'Extra Large Icons', icon: GalleryThumbnails },
  { id: 'lgIcons', label: 'Large Icons', icon: LayoutGrid },
  { id: 'mdIcons', label: 'Medium Icons', icon: Grid2x2 },
  { id: 'smIcons', label: 'Small Icons', icon: Grid3x3 },
  { id: 'list', label: 'List', icon: List },
  { id: 'details', label: 'Details', icon: TableProperties },
  { id: 'tiles', label: 'Tiles', icon: PanelsTopLeft },
  { id: 'content', label: 'Content', icon: StretchHorizontal },
];

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
};

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const resolveImageUrl = async (file: ScannedFile): Promise<string | null> => {
  if (file.contentUrl) return file.contentUrl;
  const blob = await readFileBlob(file);
  return blob ? URL.createObjectURL(blob) : null;
};

const Thumb: React.FC<{
  file: ScannedFile;
  className?: string;
  iconClass?: string;
}> = ({ file, className = '', iconClass = 'w-8 h-8' }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setUrl(null);
    setFailed(false);
    resolveImageUrl(file)
      .then((u) => {
        if (!cancelled && u) {
          if (!file.contentUrl) created = u;
          setUrl(u);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file.id]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={file.name}
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
        loading="lazy"
        draggable={false}
      />
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center p-2 text-center overflow-hidden ${className}`}
    >
      <ImageIcon className={`${iconClass} text-emerald-400/80 mb-1`} />
      <span className="text-[9px] font-bold text-slate-200 truncate w-full px-1">{file.name}</span>
    </div>
  );
};

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ files }) => {
  const [viewMode, setViewMode] = useState<GalleryViewMode>('lgIcons');
  const [selectedExt, setSelectedExt] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const imageFiles = useMemo(() => {
    return files.filter((f) => {
      const ext = f.extension.toLowerCase().replace('.', '');
      // Only include the curated image formats in the gallery.
      return imageExtSet.has(ext);
    });
  }, [files]);

  const availableExtensions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of imageFiles) {
      const ext = f.extension.toLowerCase().replace('.', '') || 'unknown';
      counts.set(ext, (counts.get(ext) || 0) + 1);
    }
    // Order by the curated format spec; jpg/jpeg count rolls up under the JPEG key.
    return IMAGE_FORMATS.map((fmt) => {
      const matched = fmt.extensions.filter((e) => counts.has(e));
      return { ...fmt, count: matched.reduce((sum, e) => sum + (counts.get(e) || 0), 0) };
    });
  }, [imageFiles]);

  const displayFiles = useMemo(() => {
    let base = imageFiles;
    if (selectedExt !== 'ALL') {
      const spec = formatByKey(selectedExt);
      const exts = spec ? new Set(spec.extensions) : new Set([selectedExt]);
      base = imageFiles.filter((f) => {
        const ext = f.extension.toLowerCase().replace('.', '');
        return exts.has(ext);
      });
    }
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [imageFiles, selectedExt]);

  const selectedIndex = selectedId ? displayFiles.findIndex((f) => f.id === selectedId) : -1;
  const selectedFile = selectedIndex >= 0 ? displayFiles[selectedIndex] : null;

  useEffect(() => {
    if (selectedId && !displayFiles.some((f) => f.id === selectedId)) {
      setSelectedId(null);
    }
  }, [displayFiles, selectedId]);

  const handleNext = () => {
    if (selectedIndex < 0) return;
    setSelectedId(displayFiles[(selectedIndex + 1) % displayFiles.length].id);
    setZoomLevel(1);
    setRotation(0);
  };

  const handlePrev = () => {
    if (selectedIndex < 0) return;
    setSelectedId(displayFiles[(selectedIndex - 1 + displayFiles.length) % displayFiles.length].id);
    setZoomLevel(1);
    setRotation(0);
  };

  const openViewer = (id: string) => {
    setSelectedId(id);
    setZoomLevel(1);
    setRotation(0);
  };

  const quarterBadge = (file: ScannedFile, size: string = 'text-[9px] px-1.5 py-0.5') => (
    <span className={`inline-block font-mono font-bold rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 ${size}`}>
      {file.classification.quarter}
    </span>
  );

  /* ---------- Icon Views (XL / L / M) ---------- */
  const renderIconGrid = (gridCls: string, thumbCls: string, nameCls: string, showMeta: boolean) => (
    <div className={`grid ${gridCls} gap-3`}>
      {displayFiles.map((file) => (
        <div
          key={file.id}
          onClick={() => openViewer(file.id)}
          className="group relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-lg hover:border-emerald-500/50 transition-all duration-200 flex flex-col"
        >
          <Thumb file={file} className={`w-full ${thumbCls}`} iconClass={showMeta ? 'w-10 h-10' : 'w-6 h-6'} />
          <div className="p-2">
            <span className={`block font-bold text-slate-800 dark:text-slate-100 truncate w-full ${nameCls}`}>
              {file.name}
            </span>
            {showMeta && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-slate-400 font-mono uppercase">{file.extension}</span>
                <span className="text-[9px] text-slate-400 font-mono">{formatSize(file.size)}</span>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>
      ))}
    </div>
  );

  /* ---------- Small Icons View ---------- */
  const renderSmallIcons = () => (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {displayFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => openViewer(file.id)}
            title={file.path}
            className="group flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-emerald-500/5 hover:ring-1 hover:ring-emerald-500/30 transition-all max-w-[240px]"
          >
            <Thumb file={file} className="w-7 h-7 rounded-md shrink-0" iconClass="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              {file.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------- List View ---------- */
  const renderList = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-2">
        {displayFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => openViewer(file.id)}
            title={file.path}
            className="group w-full break-inside-avoid mb-0.5 flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-emerald-500/5 transition-colors text-left"
          >
            <Thumb file={file} className="w-8 h-8 rounded-lg shrink-0" iconClass="w-4 h-4" />
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                {file.name}
              </span>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">{formatSize(file.size)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------- Details View ---------- */
  const renderDetails = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-sm">
      <table className="w-full min-w-[860px] text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-3">Type</th>
            <th className="py-3 px-3">Quarter</th>
            <th className="py-3 px-3">Month</th>
            <th className="py-3 px-3">Resolution</th>
            <th className="py-3 px-3">Size</th>
            <th className="py-3 px-3">Date Modified</th>
            <th className="py-3 px-4">Folder Path</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {displayFiles.map((file) => (
            <tr
              key={file.id}
              onClick={() => openViewer(file.id)}
              onDoubleClick={() => openViewer(file.id)}
              className={`hover:bg-emerald-500/5 transition-colors cursor-pointer ${
                selectedId === file.id ? 'bg-emerald-500/10' : ''
              }`}
            >
              <td className="py-2 px-4">
                <div className="flex items-center gap-2.5">
                  <Thumb file={file} className="w-8 h-8 rounded-lg shrink-0" iconClass="w-4 h-4" />
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[220px]">
                    {file.name}
                  </span>
                </div>
              </td>
              <td className="py-2 px-3">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                  {file.extension}
                </span>
              </td>
              <td className="py-2 px-3">{quarterBadge(file)}</td>
              <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-medium">
                {file.classification.month}
              </td>
              <td className="py-2 px-3 font-mono text-slate-500">
                {file.metadata?.exifResolution || '—'}
              </td>
              <td className="py-2 px-3 font-mono text-slate-500">{formatSize(file.size)}</td>
              <td className="py-2 px-3 text-slate-400">{formatDate(file.modifiedDate)}</td>
              <td className="py-2 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                {file.folderPath}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* ---------- Tiles View ---------- */
  const renderTiles = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {displayFiles.map((file) => (
        <div
          key={file.id}
          onClick={() => openViewer(file.id)}
          className="group flex items-stretch bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all duration-200"
        >
          <Thumb file={file} className="w-24 h-24 shrink-0" iconClass="w-8 h-8" />
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                {file.name}
              </span>
              {quarterBadge(file)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono uppercase">
              {file.extension} • {formatSize(file.size)}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {file.classification.month} {file.classification.financialYear.replace('FY ', '')}
            </span>
            <span className="text-[10px] text-slate-400 font-mono truncate">{file.folderPath}</span>
          </div>
        </div>
      ))}
    </div>
  );

  /* ---------- Content View ---------- */
  const renderContent = () => (
    <div className="space-y-3">
      {displayFiles.map((file) => (
        <div
          key={file.id}
          onClick={() => openViewer(file.id)}
          className={`group flex gap-4 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
            selectedId === file.id
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
          }`}
        >
          <Thumb file={file} className="w-36 h-28 rounded-xl shrink-0" iconClass="w-10 h-10" />

          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {file.name}
                </span>
                {quarterBadge(file, 'text-[10px] px-2 py-0.5')}
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{file.path}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                {file.extension}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {formatSize(file.size)}
              </span>
              {file.metadata?.exifResolution && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {file.metadata.exifResolution}
                </span>
              )}
              {file.metadata?.exifCamera && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                  {file.metadata.exifCamera}
                </span>
              )}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {file.classification.quarter} • {file.classification.month}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                Modified {formatDate(file.modifiedDate)}
              </span>
              {file.isDuplicate && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Duplicate
                </span>
              )}
            </div>
          </div>

          <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderActiveView = () => {
    switch (viewMode) {
      case 'xlIcons':
        return renderIconGrid(
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
          'aspect-square',
          'text-sm',
          true
        );
      case 'lgIcons':
        return renderIconGrid(
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
          'aspect-square',
          'text-xs',
          true
        );
      case 'mdIcons':
        return renderIconGrid(
          'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10',
          'aspect-square',
          'text-[10px]',
          false
        );
      case 'smIcons':
        return renderSmallIcons();
      case 'list':
        return renderList();
      case 'details':
        return renderDetails();
      case 'tiles':
        return renderTiles();
      case 'content':
        return renderContent();
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-500" />
            USB Photo Gallery & EXIF Inspector
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {imageFiles.length} Image Files • Viewable Formats: JPEG, PNG, WebP, GIF, SVG, AVIF — click any format chip to view its images
          </p>
        </div>
      </div>

      {/* View Mode Toolbar */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm shrink-0">
        {/* Extension Filters */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Filter by Type:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedExt('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                selectedExt === 'ALL'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({imageFiles.length})
            </button>
            {availableExtensions
              .filter((fmt) => fmt.count > 0)
              .map((fmt) => (
                <button
                  key={fmt.key}
                  onClick={() => setSelectedExt(fmt.key)}
                  title={fmt.description}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase transition-colors ${
                    selectedExt === fmt.key
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {fmt.label} ({fmt.count})
                </button>
              ))}
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start lg:self-auto flex-wrap">
          {VIEW_MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              title={label}
              aria-label={label}
              aria-pressed={viewMode === id}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === id
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <span className="hidden xl:inline text-[10px] font-bold text-slate-400 pl-1.5 pr-1 whitespace-nowrap">
            {VIEW_MODES.find((v) => v.id === viewMode)?.label}
          </span>
        </div>
      </div>

      {/* Only the gallery views scroll; the header and toolbar stay fixed. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden thin-scrollbar overscroll-contain pr-1 space-y-4">
      {/* Empty State */}
      {displayFiles.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            {imageFiles.length === 0
              ? 'No Images Found on USB'
              : `No ${formatByKey(selectedExt)?.label || selectedExt} Images Found`}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {imageFiles.length === 0
              ? 'There are no viewable files in the current scanned index.'
              : 'Try selecting a different extension filter above.'}
          </p>
        </div>
      ) : (
        <>
          {/* Active View Label */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {VIEW_MODES.find((v) => v.id === viewMode)?.label} View — {displayFiles.length} item
                {displayFiles.length !== 1 ? 's' : ''}
              </h3>
            </div>
            {selectedExt !== 'ALL' && formatByKey(selectedExt) && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span>
                  <span className="font-bold uppercase">{formatByKey(selectedExt)!.label}</span> (
                  <span className="font-mono">.{formatByKey(selectedExt)!.extensions.join(', .')}</span>):{' '}
                  {formatByKey(selectedExt)!.description}
                </span>
              </p>
            )}
          </div>
          {renderActiveView()}
        </>
      )}
      </div>

      {/* Fullscreen Photo Lightbox Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-6xl h-[90dvh] max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Main Stage View */}
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden p-2 sm:p-6">
              {/* Top controls */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex items-center space-x-1 sm:space-x-2 bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl text-slate-200">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 5))}
                  title="Zoom In"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-xs"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 0.5))}
                  title="Zoom Out"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-xs"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-xs"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2 text-slate-400">
                  {Math.round(zoomLevel * 100)}%
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-2 sm:top-4 right-2 sm:right-4 z-20 p-2 bg-slate-900/80 border border-slate-800 text-slate-200 hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image Preview Canvas */}
              <div
                className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                }}
              >
                <LightboxStage file={selectedFile} />
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={handlePrev}
                className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-full"
              >
                <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-full"
              >
                <ChevronRight className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
            </div>

            {/* EXIF Metadata Sidebar Drawer */}
            <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between text-xs font-sans overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-400" /> EXIF Metadata
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 font-mono">
                    {selectedFile.classification.quarter}
                  </span>
                </div>

                <div className="space-y-2.5 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Filename</span>
                    <span className="font-bold text-slate-100 break-words">{selectedFile.name}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Path</span>
                    <span className="font-mono text-slate-400 break-words">{selectedFile.path}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Type</span>
                      <span className="font-mono text-slate-200 uppercase">
                        .{selectedFile.extension}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">File Size</span>
                      <span className="font-mono text-slate-200">{formatSize(selectedFile.size)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Resolution</span>
                      <span className="font-mono text-slate-200">
                        {selectedFile.metadata?.exifResolution || '3840 x 2160 (4K)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Camera</span>
                      <span className="font-mono text-slate-200">
                        {selectedFile.metadata?.exifCamera || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Financial Quarter</span>
                    <span className="font-semibold text-emerald-400">
                      {selectedFile.classification.quarter} — {selectedFile.classification.month} (
                      {selectedFile.classification.financialYear})
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">SHA-256 Hash</span>
                    <span className="font-mono text-[10px] text-slate-400 break-all bg-slate-950 p-2 rounded block">
                      {selectedFile.sha256}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-slate-500 text-[11px]">
                Item {selectedIndex + 1} of {displayFiles.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Lightbox Stage: real photo when a blob/handle exists, virtual card otherwise */
const LightboxStage: React.FC<{ file: ScannedFile }> = ({ file }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setUrl(null);
    setFailed(false);
    resolveImageUrl(file)
      .then((u) => {
        if (!cancelled && u) {
          if (!file.contentUrl) created = u;
          setUrl(u);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file.id]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={file.name}
        onError={() => setFailed(true)}
        className="max-w-full max-h-[60vh] sm:max-h-[70vh] object-contain rounded-xl shadow-2xl"
        draggable={false}
      />
    );
  }

  return (
    <div className="w-80 h-80 rounded-2xl bg-gradient-to-tr from-emerald-950/80 to-slate-900 border border-emerald-500/30 flex flex-col items-center justify-center p-6 text-center shadow-2xl">
      <ImageIcon className="w-16 h-16 text-emerald-400 mb-3 animate-pulse" />
      <p className="font-extrabold text-sm text-slate-100 break-words w-full">{file.name}</p>
      <p className="text-xs text-slate-400 font-mono mt-1 uppercase">
        .{file.extension} Preview{imageExtSet.has(file.extension.toLowerCase().replace('.', '')) ? '' : ' (Non-Image)'}
      </p>
    </div>
  );
};
