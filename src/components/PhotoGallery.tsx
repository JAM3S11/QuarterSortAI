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
      className={`bg-gradient-to-br from-[#f2edea] via-[#faf9f7] to-[#d8ceca] flex flex-col items-center justify-center p-2 text-center overflow-hidden ${className}`}
    >
      <ImageIcon className={`${iconClass} text-[#542b2b]/80 mb-1`} />
      <span className="text-[0.5625rem] font-bold text-[#542b2b] truncate w-full px-1">{file.name}</span>
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

  const quarterBadge = (file: ScannedFile, size: string = 'text-[0.5625rem] px-1.5 py-0.5') => (
    <span className={`inline-block font-mono font-bold rounded bg-[#542b2b]/10 border border-[#542b2b]/20 text-[#542b2b] ${size}`}>
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
          className="group relative rounded-2xl overflow-hidden bg-[#fffdfc] border border-[#d8ceca] cursor-pointer hover:shadow-[0_10px_24px_rgba(84,43,43,0.08)] hover:border-[#542b2b]/40 transition-all duration-200 flex flex-col"
        >
          <Thumb file={file} className={`w-full ${thumbCls}`} iconClass={showMeta ? 'w-10 h-10' : 'w-6 h-6'} />
          <div className="p-2">
            <span className={`block font-bold text-[#542b2b] truncate w-full ${nameCls}`}>
              {file.name}
            </span>
            {showMeta && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-[0.5625rem] text-[#705957] font-mono uppercase">{file.extension}</span>
                <span className="text-[0.5625rem] text-[#705957] font-mono">{formatSize(file.size)}</span>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-[#542b2b]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Maximize2 className="w-5 h-5 text-white" />
          </div>
        </div>
      ))}
    </div>
  );

  /* ---------- Small Icons View ---------- */
  const renderSmallIcons = () => (
    <div className="p-4 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] shadow-[0_8px_24px_rgba(84,43,43,0.04)]">
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {displayFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => openViewer(file.id)}
            title={file.path}
            className="group flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[#542b2b]/5 hover:ring-1 hover:ring-[#542b2b]/20 transition-all max-w-[240px]"
          >
            <Thumb file={file} className="w-7 h-7 rounded-md shrink-0" iconClass="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-[#542b2b] truncate group-hover:text-[#805d59]">
              {file.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------- List View ---------- */
  const renderList = () => (
    <div className="bg-[#fffdfc] rounded-2xl border border-[#d8ceca] p-3 shadow-[0_8px_24px_rgba(84,43,43,0.04)]">
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-2">
        {displayFiles.map((file) => (
          <button
            key={file.id}
            onClick={() => openViewer(file.id)}
            title={file.path}
            className="group w-full break-inside-avoid mb-0.5 flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#542b2b]/5 transition-colors text-left"
          >
            <Thumb file={file} className="w-8 h-8 rounded-lg shrink-0" iconClass="w-4 h-4" />
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#542b2b] truncate group-hover:text-[#805d59]">
                {file.name}
              </span>
              <span className="text-[0.625rem] font-mono text-[#705957] shrink-0">{formatSize(file.size)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------- Details View ---------- */
  const renderDetails = () => (
    <div className="bg-[#fffdfc] rounded-2xl border border-[#d8ceca] overflow-x-auto shadow-[0_8px_24px_rgba(84,43,43,0.04)]">
      <table className="w-full min-w-[860px] text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#d8ceca] bg-[#f5f1ee] text-[#705957] font-semibold uppercase text-[0.625rem] tracking-wider">
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
        <tbody className="divide-y divide-[#f2edea]">
          {displayFiles.map((file) => (
            <tr
              key={file.id}
              onClick={() => openViewer(file.id)}
              onDoubleClick={() => openViewer(file.id)}
              className={`hover:bg-[#542b2b]/5 transition-colors cursor-pointer ${
                selectedId === file.id ? 'bg-[#542b2b]/10' : ''
              }`}
            >
              <td className="py-2 px-4">
                <div className="flex items-center gap-2.5">
                  <Thumb file={file} className="w-8 h-8 rounded-lg shrink-0" iconClass="w-4 h-4" />
                  <span className="font-bold text-[#542b2b] truncate max-w-[220px]">
                    {file.name}
                  </span>
                </div>
              </td>
              <td className="py-2 px-3">
                <span className="font-mono text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-[#f2edea] text-[#705957] uppercase">
                  {file.extension}
                </span>
              </td>
              <td className="py-2 px-3">{quarterBadge(file)}</td>
              <td className="py-2 px-3 text-[#705957] font-medium">
                {file.classification.month}
              </td>
              <td className="py-2 px-3 font-mono text-[#705957]">
                {file.metadata?.exifResolution || '—'}
              </td>
              <td className="py-2 px-3 font-mono text-[#705957]">{formatSize(file.size)}</td>
              <td className="py-2 px-3 text-[#9d8580]">{formatDate(file.modifiedDate)}</td>
              <td className="py-2 px-4 font-mono text-[0.625rem] text-[#705957] truncate max-w-[180px]">
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
          className="group flex items-stretch bg-[#fffdfc] rounded-2xl border border-[#d8ceca] overflow-hidden cursor-pointer hover:border-[#542b2b]/40 hover:shadow-[0_10px_24px_rgba(84,43,43,0.08)] transition-all duration-200"
        >
          <Thumb file={file} className="w-24 h-24 shrink-0" iconClass="w-8 h-8" />
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <span className="font-bold text-xs text-[#542b2b] truncate">
                {file.name}
              </span>
              {quarterBadge(file)}
            </div>
            <span className="text-[0.625rem] text-[#9d8580] font-mono uppercase">
              {file.extension} • {formatSize(file.size)}
            </span>
            <span className="text-[0.625rem] text-[#705957]">
              {file.classification.month} {file.classification.financialYear.replace('FY ', '')}
            </span>
            <span className="text-[0.625rem] text-[#705957] font-mono truncate">{file.folderPath}</span>
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
          className={`group flex gap-4 p-3.5 bg-[#fffdfc] rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-[0_10px_24px_rgba(84,43,43,0.08)] ${
            selectedId === file.id
              ? 'border-[#542b2b] ring-2 ring-[#542b2b]/15'
              : 'border-[#d8ceca] hover:border-[#542b2b]/40'
          }`}
        >
          <Thumb file={file} className="w-36 h-28 rounded-xl shrink-0" iconClass="w-10 h-10" />

          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-extrabold text-sm text-[#542b2b] truncate group-hover:text-[#805d59] transition-colors">
                  {file.name}
                </span>
                {quarterBadge(file, 'text-[0.625rem] px-2 py-0.5')}
              </div>
              <p className="text-[0.6875rem] text-[#705957] font-mono truncate mt-0.5">{file.path}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-[#f2edea] text-[#705957] uppercase">
                {file.extension}
              </span>
              <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-[#542b2b]/10 text-[#542b2b]">
                {formatSize(file.size)}
              </span>
              {file.metadata?.exifResolution && (
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-[#805d59]/10 text-[#542b2b]">
                  {file.metadata.exifResolution}
                </span>
              )}
              {file.metadata?.exifCamera && (
                <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-[#9d8580]/10 text-[#542b2b]">
                  {file.metadata.exifCamera}
                </span>
              )}
              <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-[#542b2b]/10 text-[#542b2b]">
                {file.classification.quarter} • {file.classification.month}
              </span>
              <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded-full bg-[#f2edea] text-[#705957]">
                Modified {formatDate(file.modifiedDate)}
              </span>
              {file.isDuplicate && (
                <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/20">
                  Duplicate
                </span>
              )}
            </div>
          </div>

          <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
            <div className="p-2 rounded-xl bg-[#542b2b]/10 text-[#542b2b]">
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
          'text-[0.625rem]',
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
    <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden bg-[#faf9f7] text-[#542b2b]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#d8ceca] shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-[#542b2b] flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#542b2b]" />
            USB Photo Gallery & EXIF Inspector
          </h2>
          <p className="text-xs text-[#705957] mt-0.5">
            {imageFiles.length} Image Files • Viewable Formats: JPEG, PNG, WebP, GIF, SVG, AVIF — click any format chip to view its images
          </p>
        </div>
      </div>

      {/* View Mode Toolbar */}
      <div className="p-3 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-[0_8px_24px_rgba(84,43,43,0.04)] shrink-0">
        {/* Extension Filters */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-[#705957]">
            Filter by Type:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedExt('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold transition-colors ${
                selectedExt === 'ALL'
                  ? 'bg-[#542b2b] text-[#faf9f7] shadow-sm'
                  : 'bg-[#f2edea] text-[#542b2b] hover:bg-[#e9e1dd]'
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
                  className={`px-2.5 py-1 rounded-lg text-[0.6875rem] font-mono font-bold uppercase transition-colors ${
                    selectedExt === fmt.key
                      ? 'bg-[#542b2b] text-[#faf9f7] shadow-sm'
                      : 'bg-[#f2edea] text-[#542b2b] hover:bg-[#e9e1dd]'
                  }`}
                >
                  {fmt.label} ({fmt.count})
                </button>
              ))}
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-0.5 bg-[#f2edea] p-1 rounded-xl self-start lg:self-auto flex-wrap border border-[#d8ceca]">
          {VIEW_MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              title={label}
              aria-label={label}
              aria-pressed={viewMode === id}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === id
                  ? 'bg-[#fffdfc] text-[#542b2b] shadow-sm'
                  : 'text-[#705957] hover:text-[#542b2b]'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <span className="hidden xl:inline text-[0.625rem] font-bold text-[#705957] pl-1.5 pr-1 whitespace-nowrap">
            {VIEW_MODES.find((v) => v.id === viewMode)?.label}
          </span>
        </div>
      </div>

      {/* Only the gallery views scroll; the header and toolbar stay fixed. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden thin-scrollbar overscroll-contain pr-1 space-y-4">
      {/* Empty State */}
      {displayFiles.length === 0 ? (
        <div className="p-16 text-center bg-[#fffdfc] rounded-2xl border border-[#d8ceca]">
          <ImageIcon className="w-12 h-12 text-[#9d8580] mx-auto mb-3" />
          <h3 className="font-bold text-[#542b2b] text-sm">
            {imageFiles.length === 0
              ? 'No Images Found on USB'
              : `No ${formatByKey(selectedExt)?.label || selectedExt} Images Found`}
          </h3>
          <p className="text-xs text-[#705957] max-w-md mx-auto mt-1">
            {imageFiles.length === 0 ? (
              <>
                The <span className="font-bold text-[#542b2b]">Photo Gallery</span> displays all viewable images (JPEG, PNG, WebP, GIF, SVG, AVIF) with 8 layout modes, extension filtering, a fullscreen lightbox with zoom and rotate, and full EXIF metadata inspection. Connect a USB drive containing images to get started.
              </>
            ) : (
              <>
                No <span className="font-bold text-[#542b2b]">{formatByKey(selectedExt)?.label || selectedExt}</span> images found with the current filter. Try selecting a different extension filter above or view all image types.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Active View Label */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#705957]">
                {VIEW_MODES.find((v) => v.id === viewMode)?.label} View — {displayFiles.length} item
                {displayFiles.length !== 1 ? 's' : ''}
              </h3>
            </div>
            {selectedExt !== 'ALL' && formatByKey(selectedExt) && (
              <p className="text-[0.6875rem] text-[#705957] mt-1 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#542b2b] mt-0.5 shrink-0" />
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
        <div className="fixed inset-0 z-50 bg-[#542b2b]/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-6xl h-[90dvh] max-h-[90vh] bg-[#fffdfc] border border-[#d8ceca] rounded-2xl overflow-hidden flex flex-col md:flex-row">
            {/* Main Stage View */}
            <div className="flex-1 relative bg-[#faf9f7] flex items-center justify-center overflow-hidden p-2 sm:p-6">
              {/* Top controls */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex items-center space-x-1 sm:space-x-2 bg-[#fffdfc]/90 border border-[#d8ceca] p-1.5 rounded-xl text-[#542b2b]">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.5, 5))}
                  title="Zoom In"
                  className="p-1.5 hover:bg-[#f2edea] rounded-lg text-xs"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.5, 0.5))}
                  title="Zoom Out"
                  className="p-1.5 hover:bg-[#f2edea] rounded-lg text-xs"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotate 90°"
                  className="p-1.5 hover:bg-[#f2edea] rounded-lg text-xs"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono px-2 text-[#705957]">
                  {Math.round(zoomLevel * 100)}%
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-2 sm:top-4 right-2 sm:right-4 z-20 p-2 bg-[#fffdfc]/90 border border-[#d8ceca] text-[#542b2b] hover:bg-[#f2edea] rounded-xl"
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
                className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-[#fffdfc]/90 border border-[#d8ceca] hover:bg-[#f2edea] text-[#542b2b] rounded-full"
              >
                <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-[#fffdfc]/90 border border-[#d8ceca] hover:bg-[#f2edea] text-[#542b2b] rounded-full"
              >
                <ChevronRight className="w-5 sm:w-6 h-5 sm:h-6" />
              </button>
            </div>

            {/* EXIF Metadata Sidebar Drawer */}
            <div className="w-full md:w-80 bg-[#f5f1ee] border-t md:border-t-0 md:border-l border-[#d8ceca] p-5 flex flex-col justify-between text-xs font-sans overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#d8ceca]">
                  <span className="font-bold text-[#542b2b] uppercase tracking-wider text-[0.6875rem] flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#542b2b]" /> EXIF Metadata
                  </span>
                  <span className="px-2 py-0.5 rounded text-[0.625rem] font-bold bg-[#542b2b]/10 text-[#542b2b] font-mono">
                    {selectedFile.classification.quarter}
                  </span>
                </div>

                <div className="space-y-2.5 text-[#542b2b]">
                  <div>
                    <span className="text-[#705957] block text-[0.625rem] uppercase">Filename</span>
                    <span className="font-bold text-[#542b2b] break-words">{selectedFile.name}</span>
                  </div>

                  <div>
                    <span className="text-[#705957] block text-[0.625rem] uppercase">Path</span>
                    <span className="font-mono text-[#705957] break-words">{selectedFile.path}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[#705957] block text-[0.625rem] uppercase">Type</span>
                      <span className="font-mono text-[#542b2b] uppercase">
                        .{selectedFile.extension}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#705957] block text-[0.625rem] uppercase">File Size</span>
                      <span className="font-mono text-[#542b2b]">{formatSize(selectedFile.size)}</span>
                    </div>
                    <div>
                      <span className="text-[#705957] block text-[0.625rem] uppercase">Resolution</span>
                      <span className="font-mono text-[#542b2b]">
                        {selectedFile.metadata?.exifResolution || '3840 x 2160 (4K)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#705957] block text-[0.625rem] uppercase">Camera</span>
                      <span className="font-mono text-[#542b2b]">
                        {selectedFile.metadata?.exifCamera || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#705957] block text-[0.625rem] uppercase">Financial Quarter</span>
                    <span className="font-semibold text-[#542b2b]">
                      {selectedFile.classification.quarter} — {selectedFile.classification.month} (
                      {selectedFile.classification.financialYear})
                    </span>
                  </div>

                  <div>
                    <span className="text-[#705957] block text-[0.625rem] uppercase">SHA-256 Hash</span>
                    <span className="font-mono text-[0.625rem] text-[#542b2b] break-all bg-[#fffdfc] p-2 rounded block border border-[#d8ceca]">
                      {selectedFile.sha256}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#d8ceca] text-[#705957] text-[0.6875rem]">
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
    <div className="w-80 h-80 rounded-2xl bg-gradient-to-tr from-[#f2edea] to-[#faf9f7] border border-[#d8ceca] flex flex-col items-center justify-center p-6 text-center shadow-2xl">
      <ImageIcon className="w-16 h-16 text-[#542b2b] mb-3 animate-pulse" />
      <p className="font-extrabold text-sm text-[#542b2b] break-words w-full">{file.name}</p>
      <p className="text-xs text-[#705957] font-mono mt-1 uppercase">
        .{file.extension} Preview{imageExtSet.has(file.extension.toLowerCase().replace('.', '')) ? '' : ' (Non-Image)'}
      </p>
    </div>
  );
};
