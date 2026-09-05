import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabId } from './components/Sidebar';
import { QuarterCards } from './components/QuarterCards';
import { FolderExplorer } from './components/FolderExplorer';
import { FilterPanel } from './components/FilterPanel';
import { PhotoGallery } from './components/PhotoGallery';
import { DocumentViewer } from './components/DocumentViewer/DocumentViewer';
import { DuplicateCenter } from './components/DuplicateCenter';
import { USBOverview } from './components/USBOverview';
import { AnalyticsView } from './components/AnalyticsView';
import { AIInsightsView } from './components/AIInsightsView';
import { CyberScannerModal } from './components/CyberScannerModal';
import { ConnectConfirmationModal } from './components/ConnectConfirmationModal';
import { USBReplaceConfirmModal } from './components/USBReplaceConfirmModal';
import { DriveConfirmModal } from './components/DriveConfirmModal';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './components/LandingPage';
import { ScannedFile, USBVolumeInfo, FilterOptions, QuarterId, MonthName, CyberScanLog, PhysicalDisk } from './types';
import { SAMPLE_FILES, SAMPLE_USB_INFO } from './lib/sampleUSBData';
import { scanFileList, scanUSBDirectoryHandle } from './lib/scannerEngine';
import { matchPhysicalDisk } from './lib/diskMatch';
import { saveScannedIndexToDB, clearScannedIndexFromDB } from './lib/indexedDB';
import { detectFilePickerCapability } from './lib/deviceInfo';
import { pickAndMeasureDrive, measureDriveFromHandle, supportsDirectoryPicker } from './lib/browserDrives';

const LAST_DRIVE_KEY = 'quartersort.lastDriveId';
const BROWSER_DRIVES_KEY = 'quartersort.browserDrives';

const FILE_PICKER_CAPS = detectFilePickerCapability();

export default function App() {
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [volumeInfo, setVolumeInfo] = useState<USBVolumeInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [currentFolderPath, setCurrentFolderPath] = useState<string>('/');
  const [previewFile, setPreviewFile] = useState<ScannedFile | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showConnectConfirm, setShowConnectConfirm] = useState<boolean>(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState<boolean>(false);
  const [physicalDisks, setPhysicalDisks] = useState<PhysicalDisk[]>([]);
  const [selectedDiskId, setSelectedDiskId] = useState<string>(() => localStorage.getItem(LAST_DRIVE_KEY) || '');
  const [driveConfirmDisks, setDriveConfirmDisks] = useState<PhysicalDisk[]>([]);
  const [driveConfirmRoot, setDriveConfirmRoot] = useState<string>('');
  const [isDriveConfirmOpen, setIsDriveConfirmOpen] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<{
    scannedCount: number;
    folderCount: number;
    totalBytes: number;
    currentFolder: string;
    currentFileName: string;
    logs: CyberScanLog[];
    isComplete: boolean;
  }>({
    scannedCount: 0,
    folderCount: 0,
    totalBytes: 0,
    currentFolder: '/',
    currentFileName: '',
    logs: [],
    isComplete: false,
  });

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [cyberMode, setCyberMode] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [ocrEnabled, setOcrEnabled] = useState<boolean>(false);
  const [isRefreshingDisks, setIsRefreshingDisks] = useState<boolean>(false);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    selectedQuarter: 'ALL',
    selectedMonth: 'ALL',
    selectedCategory: 'ALL',
    dateFilterType: 'ALL',
    onlyDuplicates: false,
    onlyNeedsReview: false,
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'grid',
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Drop the previous scan's view state so a new round starts clean.
  const resetScanViewState = () => {
    setScannedFiles([]);
    setVolumeInfo(null);
    setCurrentFolderPath('/');
    setFilterOptions({
      searchQuery: '',
      selectedQuarter: 'ALL',
      selectedMonth: 'ALL',
      selectedCategory: 'ALL',
      dateFilterType: 'ALL',
      onlyDuplicates: false,
      onlyNeedsReview: false,
      sortBy: 'name',
      sortOrder: 'asc',
      viewMode: 'grid',
    });
    clearScannedIndexFromDB();
  };

  const handleConnectUSB = () => {
    beginFreshScanRound();
  };

  // Start a brand-new scan round. Every connection path goes through here so
  // the drive slot only ever shows drives detected in THIS round — no cached
  // browser-drive entries and no remembered selection carried over from a
  // previous session (both are cleared synchronously before the disk fetch,
  // which prevents stale drives from being reloaded on production/Vercel).
  const beginFreshScanRound = () => {
    resetScanViewState();
    clearCachedDriveState();
    fetchPhysicalDisks(false);
    setShowConnectConfirm(true);
  };

  const handleConnectUSBClick = () => {
    if (scannedFiles.length > 0) {
      setShowReplaceConfirm(true);
    } else {
      handleConnectUSB();
    }
  };

  const handleReplaceConfirm = () => {
    setShowReplaceConfirm(false);
    beginFreshScanRound();
  };

  const handleConnectAccept = () => {
    setShowConnectConfirm(false);
    performConnectUSB();
  };

  const applyScanResult = async (result: { files: ScannedFile[]; volumeInfo: USBVolumeInfo }) => {
    const rootName =
      result.files[0]?.relativePath.split('/')[0] ??
      result.files[0]?.folderPath?.split('/').filter(Boolean)[0] ??
      '';
    let matchedDisk: PhysicalDisk | null = null;
    let finalVolume = result.volumeInfo;

    // 1. If the user explicitly chose a drive in the ConnectConfirmationModal
    //    slot, always honour that choice — it carries real capacity data.
    if (selectedDiskId) {
      matchedDisk = physicalDisks.find((d) => d.id === selectedDiskId) ?? null;
    }

    // 2. Fallback: auto-match by scanned root folder name against drive labels.
    if (!matchedDisk) {
      matchedDisk = matchPhysicalDisk(physicalDisks, rootName);
    }

    if (matchedDisk) {
      finalVolume = applyRealDriveInfo(result.volumeInfo, matchedDisk);
    } else if (physicalDisks.length > 0) {
      // 3. Neither selection nor auto-match worked — ask the user.
      setDriveConfirmRoot(rootName);
      setDriveConfirmDisks(physicalDisks);
      setIsDriveConfirmOpen(true);
    }

    if (matchedDisk) {
      localStorage.setItem(LAST_DRIVE_KEY, matchedDisk.id);
      setSelectedDiskId(matchedDisk.id);
    }

    setScannedFiles(result.files);
    setVolumeInfo(finalVolume);
    await saveScannedIndexToDB(result.files, finalVolume);
  };

  const reportProgress = (prog: {
    scannedFilesCount: number;
    scannedFoldersCount: number;
    totalBytes: number;
    currentFolder: string;
    currentFileName: string;
    logs: CyberScanLog[];
    isComplete: boolean;
    filesBatch: ScannedFile[];
  }) => {
    setScanProgress({
      scannedCount: prog.scannedFilesCount,
      folderCount: prog.scannedFoldersCount,
      totalBytes: prog.totalBytes,
      currentFolder: prog.currentFolder,
      currentFileName: prog.currentFileName,
      logs: prog.logs,
      isComplete: prog.isComplete,
    });
    if (prog.filesBatch.length > 0) {
      setScannedFiles(prog.filesBatch);
    }
  };

  const performConnectUSB = async () => {
    // Desktop Chromium (and modern Android Chrome): use the File System Access API
    // for real read-only directory traversal.
    if (FILE_PICKER_CAPS.supportsDirectoryPicker) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (!dirHandle) return;
        setIsScanning(true);
        // Capture the drive the browser exposes for this root so the connect
        // slot reflects the real detected drive (letter/label) even when the
        // server-side /api/disk-stats endpoint isn't available (Vercel).
        // Reuses the handle already picked above — no second picker prompt.
        //
        // IMPORTANT: persistBrowserDetectedDrive overwrites selectedDiskId
        // with the browser-detected disk (which has estimated capacity).
        // Save the user's explicit selection first and restore it after, so
        // applyScanResult picks the user-chosen drive (with real capacity)
        // instead of the estimated one.
        const preScanSelectedId = selectedDiskId;
        const disk = await measureDriveFromHandle(dirHandle, 400);
        if (disk) {
          // Only persist the browser-detected (estimated) drive when the user
          // hasn't already chosen a drive in the ConnectConfirmationModal.
          // Otherwise persistBrowserDetectedDrive would REPLACE the real entry
          // with an estimated one, even though selectedDiskId is restored.
          if (!preScanSelectedId) {
            persistBrowserDetectedDrive(disk);
          }
          // Always restore the user's explicit selection so applyScanResult
          // uses the drive they chose (with real capacity), not the estimated one.
          if (preScanSelectedId) {
            setSelectedDiskId(preScanSelectedId);
            localStorage.setItem(LAST_DRIVE_KEY, preScanSelectedId);
          }
        }
        const result = await scanUSBDirectoryHandle(dirHandle, reportProgress, { enableOCR: ocrEnabled });
        await applyScanResult(result);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // user cancelled the picker
        console.warn('Directory picker unavailable, falling back to file input:', err);
      }
    }
    triggerFileInputFallback();
  };

  const triggerFileInputFallback = () => {
    const input = document.createElement('input');
    input.type = 'file';

    // Both folder inputs and multi-file inputs use `multiple`; webkitdirectory turns
    // the picker into a folder selector (works on desktop browsers and Android/iOS),
    // while plain `multiple` (mobile fallback) lets users pick several files or a folder
    // from the native Files app.
    input.multiple = true;

    if (FILE_PICKER_CAPS.supportsWebkitDirectory || !FILE_PICKER_CAPS.isMobile) {
      (input as any).webkitdirectory = true;
    }

    input.onchange = async (e: any) => {
      const filesList = e.target.files as FileList | null;
      if (!filesList || filesList.length === 0) return;

      setIsScanning(true);
      const result = await scanFileList(filesList, reportProgress, { enableOCR: ocrEnabled });
      await applyScanResult(result);
    };

    input.click();
  };

  const loadBrowserDetectedDrives = () => {
    try {
      const raw = localStorage.getItem(BROWSER_DRIVES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPhysicalDisks(parsed);
        const remembered = localStorage.getItem(LAST_DRIVE_KEY);
        if (remembered && parsed.some((d) => d.id === remembered)) {
          setSelectedDiskId(remembered);
        }
        return parsed;
      }
    } catch (err) {
      console.warn('load browser drives failed:', err);
    }
    return [];
  };

  const persistBrowserDetectedDrive = (disk: PhysicalDisk) => {
    setPhysicalDisks((prev) => {
      const next = prev.filter((d) => d.id !== disk.id);
      next.unshift(disk);
      try {
        localStorage.setItem(BROWSER_DRIVES_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('persist browser drive failed:', err);
      }
      return next;
    });
    setSelectedDiskId(disk.id);
    localStorage.setItem(LAST_DRIVE_KEY, disk.id);
  };

  // On static hosting (Vercel) browser-detected drives are stored in localStorage
  // and never pruned, so they linger across sessions and can be wrongly matched
  // to a freshly scanned drive (attaching a stale estimated capacity). Each fresh
  // round clears ALL cached/estimated drive entries and the remembered selection.
  // This is synchronous on purpose: it must land in localStorage BEFORE the
  // disk fetch reads it, otherwise the stale list reloads immediately (the old
  // version wrote localStorage inside a React setState updater, which runs after
  // render — too late, so stale drives survived every refresh).
  const clearCachedDriveState = () => {
    try {
      localStorage.removeItem(BROWSER_DRIVES_KEY);
      localStorage.removeItem(LAST_DRIVE_KEY);
    } catch (err) {
      console.warn('clear cached drive state failed:', err);
    }
    setSelectedDiskId('');
    setPhysicalDisks([]);
  };

  const fetchPhysicalDisks = async (isRefreshRequest = false) => {
    setIsRefreshingDisks(true);
    try {
      let serverDisks: PhysicalDisk[] = [];
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('/api/disk-stats', { signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.disks)) serverDisks = data.disks;
        } else {
          console.warn('disk-stats non-ok status:', res.status);
        }
      } catch (err) {
        // Static hosting (Vercel) has no /api/disk-stats server — this is expected.
        console.warn('disk-stats unavailable:', err);
      }

      // Merge real server-sourced drives with any previously browser-detected
      // drives (from localStorage). Browser drives are estimates, so prefer the
      // server entry when letters/ids coincide; otherwise keep both so the user
      // can still pick a previously-detected USB.
      const browserDrives = loadBrowserDetectedDrives();
      const merged: PhysicalDisk[] = [...serverDisks];
      const serverIds = new Set(serverDisks.map((d) => d.id));
      for (const bd of browserDrives) {
        if (!serverIds.has(bd.id)) merged.push(bd);
      }

      // Prefer removable/USB drives so the freshly connected drive is the first
      // thing the user sees in the slot.
      merged.sort((a, b) => {
        const ra = a.driveType === 'removable' ? 0 : 1;
        const rb = b.driveType === 'removable' ? 0 : 1;
        return ra - rb;
      });

      if (merged.length > 0) {
        setPhysicalDisks(merged);
      }

      // On Vercel (no server, no cached drives) the drive list is empty — when
      // the user explicitly hits Refresh, give them a way to detect a drive from
      // the browser picker as a fallback. Never auto-prompt on initial open.
      if (isRefreshRequest && serverDisks.length === 0 && merged.length === 0 && supportsDirectoryPicker()) {
        try {
          const picked = await pickAndMeasureDrive(200);
          if (picked) {
            persistBrowserDetectedDrive(picked.disk);
            serverDisks.push(picked.disk);
            setPhysicalDisks((prev) => (prev.length > 0 ? prev : [picked.disk]));
          }
        } catch (err) {
          console.warn('Browser drive detect after refresh failed:', err);
        }
      }

      const remembered = localStorage.getItem(LAST_DRIVE_KEY);
      if (remembered && merged.length > 0 && merged.some((d) => d.id === remembered)) {
        setSelectedDiskId(remembered);
      }
    } catch (err) {
      console.warn('refresh disks failed:', err);
    } finally {
      setIsRefreshingDisks(false);
    }
  };

  const handleSelectDisk = (id: string) => {
    setSelectedDiskId(id);
    localStorage.setItem(LAST_DRIVE_KEY, id);
  };

  const detectDriveFromPicker = async () => {
    if (!supportsDirectoryPicker()) return;
    try {
      const picked = await pickAndMeasureDrive(200);
      if (picked) persistBrowserDetectedDrive(picked.disk);
    } catch (err: any) {
      console.warn('browser drive detect failed:', err);
    }
  };

  const applyRealDriveInfo = (vinfo: USBVolumeInfo, disk: PhysicalDisk): USBVolumeInfo => {
    const usedBytes = Math.max(0, disk.totalCapacityBytes - disk.freeBytes);
    return {
      ...vinfo,
      name: disk.label || disk.id || vinfo.name,
      filesystem: disk.filesystem || vinfo.filesystem,
      totalCapacityBytes: disk.totalCapacityBytes,
      usedBytes,
      freeBytes: Math.max(0, disk.freeBytes),
      capacityEstimated: disk.capacityEstimated ?? false,
    };
  };

  const handleDriveConfirm = (disk: PhysicalDisk) => {
    setIsDriveConfirmOpen(false);
    if (!volumeInfo) return;
    localStorage.setItem(LAST_DRIVE_KEY, disk.id);
    setSelectedDiskId(disk.id);
    const patched = applyRealDriveInfo(volumeInfo, disk);
    setVolumeInfo(patched);
    saveScannedIndexToDB(scannedFiles, patched);
  };

  const handleDriveSkip = () => {
    setIsDriveConfirmOpen(false);
  };

  const handleLoadSampleUSB = () => {
    setScannedFiles(SAMPLE_FILES);
    setVolumeInfo(SAMPLE_USB_INFO);
    saveScannedIndexToDB(SAMPLE_FILES, SAMPLE_USB_INFO);
  };

  const handleGoHome = () => {
    setScannedFiles([]);
    setVolumeInfo(null);
    setActiveTab('dashboard');
    setCurrentFolderPath('/');
    clearScannedIndexFromDB();
  };

  const handleQuarterFilterFromCard = (quarter: QuarterId | 'ALL', month?: MonthName | 'ALL') => {
    setFilterOptions((prev) => ({
      ...prev,
      selectedQuarter: quarter,
      selectedMonth: month || 'ALL',
      onlyNeedsReview: false,
    }));
    setActiveTab('explorer');
  };

  const handleNeedsReviewFilter = () => {
    setFilterOptions((prev) => ({
      ...prev,
      selectedQuarter: 'ALL',
      selectedMonth: 'ALL',
      onlyNeedsReview: true,
    }));
    setActiveTab('explorer');
  };

  const resetFilters = () => {
    setFilterOptions({
      searchQuery: '',
      selectedQuarter: 'ALL',
      selectedMonth: 'ALL',
      selectedCategory: 'ALL',
      dateFilterType: 'ALL',
      onlyDuplicates: false,
      onlyNeedsReview: false,
      sortBy: 'name',
      sortOrder: 'asc',
      viewMode: 'grid',
    });
  };

  const duplicateCount = scannedFiles.filter((f) => f.isDuplicate).length;
  const photoCount = scannedFiles.filter((f) => f.category === 'Images').length;

  return (
    <>
      {scannedFiles.length === 0 ? (
    <LandingPage
      onConnectUSB={handleConnectUSB}
    />
      ) : (
    <div className={`h-dvh overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors ${cyberMode ? 'border-2 border-emerald-500/20 shadow-[0_0_30px_rgba(0,255,102,0.1)]' : ''}`}>
      <Navbar
        volumeInfo={volumeInfo}
        onConnectUSB={handleConnectUSBClick}
        onGoHome={handleGoHome}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
      />

      <div className="relative flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside
          className={`absolute lg:static inset-y-0 left-0 z-40 w-64 ${
            isSidebarCollapsed ? 'lg:w-20' : ''
          } border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 shadow-2xl lg:shadow-none overflow-hidden transition-[width,transform] duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onNavigate={() => setIsSidebarOpen(false)}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
            totalFiles={scannedFiles.length}
            duplicateCount={duplicateCount}
            photoCount={photoCount}
          />
        </aside>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto hide-scrollbar max-w-7xl mx-auto w-full space-y-6 flex flex-col">
          {activeTab === 'dashboard' && (
            <QuarterCards
              files={scannedFiles}
              onSelectQuarterFilter={handleQuarterFilterFromCard}
              onNeedsReviewFilter={handleNeedsReviewFilter}
            />
          )}

          {activeTab === 'explorer' && (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="shrink-0">
              <FilterPanel
                filterOptions={filterOptions}
                onChangeFilterOptions={setFilterOptions}
                onResetFilters={resetFilters}
                totalResults={scannedFiles.length}
              />
              </div>
              <FolderExplorer
                files={scannedFiles}
                currentFolderPath={currentFolderPath}
                onNavigateFolder={setCurrentFolderPath}
                onPreviewFile={setPreviewFile}
                filterOptions={filterOptions}
                onChangeFilterOptions={setFilterOptions}
              />
            </div>
          )}

          {activeTab === 'photos' && <PhotoGallery files={scannedFiles} />}

          {activeTab === 'duplicates' && (
            <DuplicateCenter files={scannedFiles} onPreviewFile={setPreviewFile} />
          )}

          {activeTab === 'usb_overview' && (
            <USBOverview volumeInfo={volumeInfo} files={scannedFiles} onRescan={beginFreshScanRound} />
          )}

          {activeTab === 'analytics' && <AnalyticsView files={scannedFiles} />}

          {activeTab === 'ai_insights' && (
            <AIInsightsView files={scannedFiles} totalFolders={volumeInfo?.totalFolders || 36} />
          )}
        </main>
      </div>
      </div>
      )}

      <CyberScannerModal
        isOpen={isScanning}
        scannedCount={scanProgress.scannedCount}
        folderCount={scanProgress.folderCount}
        totalBytes={scanProgress.totalBytes}
        currentFolder={scanProgress.currentFolder}
        currentFileName={scanProgress.currentFileName}
        logs={scanProgress.logs}
        isComplete={scanProgress.isComplete}
        onClose={() => setIsScanning(false)}
      />

      <ConnectConfirmationModal
        isOpen={showConnectConfirm}
        disks={physicalDisks}
        selectedDiskId={selectedDiskId}
        isMobile={FILE_PICKER_CAPS.isMobile}
        ocrEnabled={ocrEnabled}
        onToggleOCR={() => setOcrEnabled(!ocrEnabled)}
        onSelectDisk={handleSelectDisk}
        onRefreshDisks={() => fetchPhysicalDisks(true)}
        isRefreshing={isRefreshingDisks}
        onAccept={handleConnectAccept}
        onDecline={() => setShowConnectConfirm(false)}
        onLoadSample={handleLoadSampleUSB}
        onDetectFromPicker={detectDriveFromPicker}
      />

      <USBReplaceConfirmModal
        isOpen={showReplaceConfirm}
        currentDriveName={volumeInfo?.name}
        onConfirm={handleReplaceConfirm}
        onCancel={() => setShowReplaceConfirm(false)}
      />

      <DriveConfirmModal
        isOpen={isDriveConfirmOpen}
        disks={driveConfirmDisks}
        scannerRootName={driveConfirmRoot || undefined}
        onConfirm={handleDriveConfirm}
        onSkip={handleDriveSkip}
      />

      <DocumentViewer file={previewFile} files={scannedFiles} onClose={() => setPreviewFile(null)} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        files={scannedFiles}
        onSelectFile={setPreviewFile}
        onSelectTab={setActiveTab}
        onSelectQuarter={(q) => handleQuarterFilterFromCard(q, 'ALL')}
      />
    </>
  );
}
