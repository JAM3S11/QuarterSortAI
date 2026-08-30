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
import { scanFileList } from './lib/scannerEngine';
import { matchPhysicalDisk } from './lib/diskMatch';
import { saveScannedIndexToDB, clearScannedIndexFromDB } from './lib/indexedDB';

const LAST_DRIVE_KEY = 'quartersort.lastDriveId';

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

  const handleConnectUSB = () => {
    fetchPhysicalDisks();
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
    handleConnectUSB();
  };

  const handleConnectAccept = () => {
    setShowConnectConfirm(false);
    performConnectUSB();
  };

  const performConnectUSB = () => {
    triggerFileInputFallback();
  };

  const triggerFileInputFallback = () => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    input.multiple = true;

    input.onchange = async (e: any) => {
      const filesList = e.target.files;
      if (!filesList || filesList.length === 0) return;

      setIsScanning(true);
      const result = await scanFileList(filesList, (prog) => {
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
      }, { enableOCR: ocrEnabled });

      const rootName = result.files[0]?.relativePath.split('/')[0] ?? '';
      let matchedDisk = matchPhysicalDisk(physicalDisks, rootName);

      let finalVolume = result.volumeInfo;
      if (matchedDisk) {
        finalVolume = applyRealDriveInfo(result.volumeInfo, matchedDisk);
      } else {
        const preselected = selectedDiskId ? physicalDisks.find((d) => d.id === selectedDiskId) ?? null : null;
        if (preselected) {
          matchedDisk = preselected;
          finalVolume = applyRealDriveInfo(result.volumeInfo, preselected);
        } else if (physicalDisks.length > 0) {
          setDriveConfirmRoot(rootName);
          setDriveConfirmDisks(physicalDisks);
          setIsDriveConfirmOpen(true);
        }
      }

      if (matchedDisk) {
        localStorage.setItem(LAST_DRIVE_KEY, matchedDisk.id);
        setSelectedDiskId(matchedDisk.id);
      }

      setScannedFiles(result.files);
      setVolumeInfo(finalVolume);
      await saveScannedIndexToDB(result.files, finalVolume);
    };

    input.click();
  };

  const fetchPhysicalDisks = async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/disk-stats', { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data && Array.isArray(data.disks)) {
        setPhysicalDisks(data.disks);
        const remembered = localStorage.getItem(LAST_DRIVE_KEY);
        if (remembered && data.disks.some((d) => d.id === remembered)) {
          setSelectedDiskId(remembered);
        }
      }
    } catch (err) {
      console.warn('disk-stats unavailable:', err);
    }
  };

  const handleSelectDisk = (id: string) => {
    setSelectedDiskId(id);
    localStorage.setItem(LAST_DRIVE_KEY, id);
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
      capacityEstimated: false,
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
      onLoadSampleUSB={handleLoadSampleUSB}
      ocrEnabled={ocrEnabled}
      onToggleOCR={() => setOcrEnabled(!ocrEnabled)}
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

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
          {activeTab === 'dashboard' && (
            <QuarterCards
              files={scannedFiles}
              onSelectQuarterFilter={handleQuarterFilterFromCard}
              onNeedsReviewFilter={handleNeedsReviewFilter}
            />
          )}

          {activeTab === 'explorer' && (
            <div className="space-y-4">
              <FilterPanel
                filterOptions={filterOptions}
                onChangeFilterOptions={setFilterOptions}
                onResetFilters={resetFilters}
                totalResults={scannedFiles.length}
              />
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
            <USBOverview volumeInfo={volumeInfo} files={scannedFiles} onRescan={handleConnectUSB} />
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
        onSelectDisk={handleSelectDisk}
        onRefreshDisks={fetchPhysicalDisks}
        onAccept={handleConnectAccept}
        onDecline={() => setShowConnectConfirm(false)}
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
