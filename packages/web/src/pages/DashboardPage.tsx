import { useEffect, useState, useCallback } from 'react';
import { useDriveStore } from '../stores/driveStore';
import { QuotaBar } from '../components/QuotaBar';
import { FileGrid } from '../components/files/FileGrid';
import { ShareModal } from '../components/ShareModal';
import { MoveDriveModal } from '../components/MoveDriveModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { formatFileSize, getDriveColor, parseSizeToBytes } from '../lib/utils';
import { api } from '../lib/api';
import { useSharedStore } from '../stores/sharedStore';
import { HardDrive, RefreshCw, TrendingUp, Clock, Settings2 } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import type { FileEntry } from '../types';

export function DashboardPage() {
  const { drives, aggregate, isLoading, fetchDrives } = useDriveStore();
  const [recentFiles, setRecentFiles] = useState<FileEntry[]>([]);
  const [recentFolders, setRecentFolders] = useState<any[]>([]);
  const [shareTarget, setShareTarget] = useState<{ id: string, type: 'file' | 'folder' } | null>(null);
  const [moveDriveFiles, setMoveDriveFiles] = useState<FileEntry[]>([]);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [quotaEditingId, setQuotaEditingId] = useState<string | null>(null);
  const [quotaInput, setQuotaInput] = useState('');
  const [quotaSaving, setQuotaSaving] = useState(false);
  const { addToast } = useToastStore();

  const startEditQuota = (driveId: string, currentOverride: number | null | undefined, totalQuota: number) => {
    // Show override if set, else current computed total so the user sees what's in use.
    setQuotaInput(formatFileSize(currentOverride && currentOverride > 0 ? currentOverride : totalQuota));
    setQuotaEditingId(driveId);
  };

  const saveQuota = async (driveId: string) => {
    const bytes = parseSizeToBytes(quotaInput);
    if (bytes === null) {
      addToast('error', 'Invalid size. Use format like 5 TB, 500 GB, 200 GB');
      return;
    }
    setQuotaSaving(true);
    try {
      await api.updateDriveQuota(driveId, bytes === 0 ? null : bytes);
      addToast('success', 'Storage capacity updated');
      setQuotaEditingId(null);
      await fetchDrives();
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'Failed to update capacity');
    } finally {
      setQuotaSaving(false);
    }
  };
  
  const { fetchSharedLinks, isTargetShared } = useSharedStore();

  const refreshRecent = useCallback(() => {
    api.getRecentFiles().then((data) => {
      setRecentFiles(data.files.slice(0, 12));
      setRecentFolders(data.folders ? data.folders.slice(0, 12) : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDrives();
    fetchSharedLinks();
    refreshRecent();
  }, [fetchDrives, fetchSharedLinks, refreshRecent]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Home</h1>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={() => fetchDrives()}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Aggregate Quota */}
      {aggregate.driveCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              <span className="font-semibold text-gray-800">Total Storage</span>
            </div>
            <span className="text-sm text-gray-500">
              {aggregate.driveCount} drive{aggregate.driveCount > 1 ? 's' : ''} connected
            </span>
          </div>
          <QuotaBar used={aggregate.totalUsed} total={aggregate.totalQuota} />
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            <span className="text-blue-700 font-medium">{formatFileSize(aggregate.totalUsed)} used</span>
            <span>·</span>
            <span>{formatFileSize(aggregate.totalFree)} free</span>
            <span>·</span>
            <span>{formatFileSize(aggregate.totalQuota)} total</span>
          </div>
        </div>
      )}

      {/* Per-Drive Quota */}
      {drives.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Connected Drives</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {drives.map((drive, i) => (
              <div key={drive.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getDriveColor(i) }}
                  >
                    <HardDrive size={16} color="white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{drive.email}</div>
                    <div className="text-xs text-gray-400">
                      {drive.type === 'service_account' ? 'Service Account' : 'OAuth'}
                      {drive.isPrimary && <span className="ml-1.5 text-blue-600 font-medium">· Primary</span>}
                      {drive.quotaOverride && drive.quotaOverride > 0 && (
                        <span className="ml-1.5 text-amber-600" title="Capacity set manually — Google's API does not report it for this account">· manual</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="ml-auto p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => startEditQuota(drive.id, drive.quotaOverride, drive.totalQuota)}
                    title="Set storage capacity manually (for Workspace / service accounts where Google omits the limit)"
                  >
                    <Settings2 size={14} />
                  </button>
                </div>
                {quotaEditingId === drive.id ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. 5 TB, 500 GB"
                      value={quotaInput}
                      onChange={(e) => setQuotaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveQuota(drive.id);
                        if (e.key === 'Escape') setQuotaEditingId(null);
                      }}
                    />
                    <p className="text-[10px] text-gray-400">
                      Google's API hides the real limit for Workspace / service accounts. Enter the actual capacity (e.g. 5 TB). Set 0 to clear.
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
                        onClick={() => saveQuota(drive.id)}
                        disabled={quotaSaving}
                      >
                        {quotaSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => setQuotaEditingId(null)}
                        disabled={quotaSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <QuotaBar used={drive.usedQuota} total={drive.totalQuota} color={getDriveColor(i)} showLabel={false} />
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      <span>{formatFileSize(drive.usedQuota)} used</span>
                      <span>{drive.usagePercent}%</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      {(recentFiles.length > 0 || recentFolders.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <FileGrid
              files={recentFiles}
              subfolders={recentFolders}
              getDriveInfo={(driveAccountId) => {
                if (!driveAccountId) return { drive: null, index: 0 };
                const index = drives.findIndex((d) => d.id === driveAccountId);
                if (index === -1) return { drive: drives[0] || null, index: 0 };
                return { drive: drives[index], index };
              }}
              onShare={(id, type) => setShareTarget({ id, type })}
              onMoveDrive={(file) => setMoveDriveFiles([file])}
              onPreviewFile={setPreviewFile}
              isTargetShared={isTargetShared}
              viewMode="list"
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      <ShareModal
        open={!!shareTarget}
        targetType={shareTarget?.type ?? 'file'}
        targetId={shareTarget?.id ?? ''}
        onClose={() => setShareTarget(null)}
      />

      {moveDriveFiles.length > 0 && (
        <MoveDriveModal
          files={moveDriveFiles}
          onClose={() => setMoveDriveFiles([])}
          onSuccess={() => {
            setMoveDriveFiles([]);
            refreshRecent();
          }}
          onError={(msg) => {
            console.error('Error moving file(s):', msg);
            addToast('error', 'Failed to move file(s)');
            setMoveDriveFiles([]);
          }}
        />
      )}

      <FilePreviewModal
        open={!!previewFile}
        file={previewFile ?? undefined}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
