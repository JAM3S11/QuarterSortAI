import React, { useState } from 'react';
import { ScannedFile, DuplicateGroup } from '../types';
import { Copy, FileText, Check, ArrowRight, ShieldCheck, Trash2, Edit3, Eye, HardDrive } from 'lucide-react';

interface DuplicateCenterProps {
  files: ScannedFile[];
  onPreviewFile: (file: ScannedFile) => void;
}

export const DuplicateCenter: React.FC<DuplicateCenterProps> = ({ files, onPreviewFile }) => {
  const [selectedGroupHash, setSelectedGroupHash] = useState<string | null>(null);

  // Group files by SHA256 hash
  const duplicateGroupsMap = new Map<string, ScannedFile[]>();
  for (const file of files) {
    if (!duplicateGroupsMap.has(file.sha256)) {
      duplicateGroupsMap.set(file.sha256, []);
    }
    duplicateGroupsMap.get(file.sha256)!.push(file);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  let totalSavingsBytes = 0;

  for (const [hash, groupFiles] of duplicateGroupsMap.entries()) {
    if (groupFiles.length > 1) {
      const fileSize = groupFiles[0].size;
      const savings = fileSize * (groupFiles.length - 1);
      totalSavingsBytes += savings;

      duplicateGroups.push({
        hash,
        files: groupFiles,
        totalSize: fileSize * groupFiles.length,
        potentialSavingsBytes: savings,
      });
    }
  }

  const activeGroup = selectedGroupHash
    ? duplicateGroups.find((g) => g.hash === selectedGroupHash) || duplicateGroups[0]
    : duplicateGroups[0];

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return bytes + ' B';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Banner */}
      <div className="shrink-0 p-5 bg-gradient-to-r from-[#f3d8c8]/70 via-[#faf9f7] to-transparent rounded-2xl border border-[#d8ceca] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-3 rounded-xl bg-[#542b2b] text-[#faf9f7] font-bold shrink-0">
            <Copy className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-[#542b2b] flex flex-wrap items-center gap-2">
              SHA-256 Duplicate Detection Engine
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#f2edea] text-[#542b2b] font-bold border border-[#d8ceca]">
                {duplicateGroups.length} Identical File Clusters
              </span>
            </h2>
            <p className="text-xs text-[#705957] mt-0.5">
              Exact cryptographic hash matches across directories • Virtual deduplication & comparison
            </p>
          </div>
        </div>

        <div className="bg-[#fffdfc] p-3 rounded-xl border border-[#d8ceca] text-right shrink-0">
          <span className="text-[0.625rem] font-bold uppercase text-[#705957] block">
            Potential Storage Reclaimed
          </span>
          <span className="text-xl font-black text-[#542b2b] font-mono">
            {formatSize(totalSavingsBytes)}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-6 overflow-y-auto overscroll-contain thin-scrollbar space-y-6">
      {duplicateGroups.length === 0 ? (
        <div className="p-16 text-center bg-[#fffdfc] rounded-2xl border border-[#d8ceca] shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
          <ShieldCheck className="w-12 h-12 text-[#542b2b] mx-auto mb-3" />
          <h3 className="font-extrabold text-[#542b2b] text-sm">No Duplicate Files Detected</h3>
          <p className="text-xs text-[#705957] max-w-md mx-auto mt-1">
            The <span className="font-bold text-[#542b2b]">Duplicate Center</span> groups files by SHA-256 hash to find exact cryptographic matches, displays side-by-side comparisons, and calculates potential storage savings from removing redundant copies. All scanned documents currently have unique signatures — no duplicates found!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Duplicate Clusters */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#705957]">
              Duplicate Clusters ({duplicateGroups.length})
            </h3>

            <div className="space-y-2 max-h-[37.5rem] overflow-y-auto overscroll-contain thin-scrollbar pr-1">
              {duplicateGroups.map((group) => {
                const isSelected = activeGroup?.hash === group.hash;

                return (
                  <button
                    key={group.hash}
                    onClick={() => setSelectedGroupHash(group.hash)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#f2edea] border-[#542b2b]/30 shadow-sm'
                        : 'bg-[#fffdfc] border-[#d8ceca] hover:border-[#542b2b]/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#542b2b] truncate max-w-[11.25rem]">
                        {group.files[0].name}
                      </span>
                      <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-[#f2edea] text-[#542b2b] font-mono">
                        {group.files.length} Copies
                      </span>
                    </div>

                    <p className="text-[0.625rem] text-[#705957] font-mono truncate mb-2">
                      SHA256: {group.hash.slice(0, 16)}...
                    </p>

                    <div className="flex items-center justify-between text-[0.6875rem] text-[#705957] font-mono">
                      <span>Size: {formatSize(group.files[0].size)}</span>
                      <span className="font-bold text-[#542b2b]">
                        Savings: {formatSize(group.potentialSavingsBytes)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Side-by-Side File Inspector & Virtual Actions */}
          {activeGroup && (
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 bg-[#fffdfc] rounded-2xl border border-[#d8ceca] space-y-4 shadow-[0_8px_20px_rgba(84,43,43,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#f2edea]">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-[#542b2b] text-sm">
                      Cluster Inspector — Side-by-Side Comparison
                    </h3>
                    <p className="text-xs text-[#705957] font-mono truncate mt-0.5">
                      Hash: {activeGroup.hash}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#542b2b]/10 text-[#542b2b]">
                    Safe Non-Modifying Resolution
                  </span>
                </div>

                <div className="space-y-3">
                  {activeGroup.files.map((file, idx) => (
                    <div
                      key={file.id}
                      className="p-4 rounded-xl bg-[#faf9f7] border border-[#d8ceca] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <div className="p-2 rounded-lg bg-[#f2edea] font-bold text-xs text-[#542b2b] shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-bold text-xs text-[#542b2b] break-words">
                              {file.name}
                            </span>
                            {idx === 0 && (
                              <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded bg-[#542b2b] text-[#faf9f7]">
                                Original (Kept)
                              </span>
                            )}
                          </div>
                          <p className="text-[0.6875rem] font-mono text-[#705957] mt-0.5 break-words">{file.path}</p>
                          <p className="text-[0.625rem] text-[#705957] mt-1">
                            Quarter: {file.classification.quarter} ({file.classification.month}) • Modified: {file.modifiedDate.toISOString().split('T')[0]}
                          </p>
                        </div>
                      </div>

                      {/* Virtual Resolution Options */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => onPreviewFile(file)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#d8ceca] hover:bg-[#f2edea] text-[#542b2b] text-xs font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};
