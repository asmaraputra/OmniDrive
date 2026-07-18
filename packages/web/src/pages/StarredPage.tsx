import { useEffect, useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { useDriveStore } from '../stores/driveStore';
import { useToastStore } from '../stores/toastStore';
import { FileGrid } from '../components/files/FileGrid';
import { EmptyState, ListSkeleton } from '../components/EmptyState';
import { api } from '../lib/api';
import type { FileEntry, WorkspaceFolder } from '../types';
import { FilePreviewModal } from '../components/FilePreviewModal';

export function StarredPage() {
  const { drives, fetchDrives } = useDriveStore();
  const { addToast } = useToastStore();
  
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);

  const fetchStarred = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getStarred();
      setFiles(data.files);
      setFolders(data.folders);
    } catch (error) {
      addToast('error', 'Gagal memuat item berbintang');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDrives();
    fetchStarred();
  }, [fetchDrives, fetchStarred]);

  const handleToggleStar = async (id: string, type: 'file' | 'folder', currentStarStatus: boolean) => {
    try {
      if (type === 'file') {
        if (currentStarStatus) {
          await api.unstarFile(id);
          addToast('success', 'Bintang file dihapus');
          setFiles((prev) => prev.filter((f) => f.id !== id));
        } else {
          await api.starFile(id);
          addToast('success', 'File dibintangi');
        }
      } else {
        if (currentStarStatus) {
          await api.unstarFolder(id);
          addToast('success', 'Bintang folder dihapus');
          setFolders((prev) => prev.filter((f) => f.id !== id));
        } else {
          await api.starFolder(id);
          addToast('success', 'Folder dibintangi');
        }
      }
    } catch (error) {
      addToast('error', 'Gagal memperbarui status bintang');
    }
  };

  const getDriveInfo = useCallback((driveAccountId?: string) => {
    if (!driveAccountId) return { drive: null, index: 0 };
    const index = drives.findIndex((d) => d.id === driveAccountId);
    if (index === -1) return { drive: drives[0] || null, index: 0 };
    return { drive: drives[index], index };
  }, [drives]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-800">Berbintang</h1>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : files.length > 0 || folders.length > 0 ? (
        <div className="bg-card rounded-xl border border-stone-200 overflow-hidden">
          <FileGrid
            files={files}
            subfolders={folders.map((f) => ({ ...f, googleFolderId: '', driveAccountId: '', isSynced: true }))}
            getDriveInfo={getDriveInfo}
            isTargetShared={() => false}
            viewMode="list"
            onToggleStar={handleToggleStar}
            onPreviewFile={setPreviewFile}
          />
        </div>
      ) : (
        <EmptyState
          icon={Star}
          title="Belum ada item berbintang"
          description="Beri bintang pada file atau folder untuk menemukannya dengan cepat di sini."
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
