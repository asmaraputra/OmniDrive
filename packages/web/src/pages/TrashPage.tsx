import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { useDriveStore } from '../stores/driveStore';
import { useToastStore } from '../stores/toastStore';
import { FileGrid } from '../components/files/FileGrid';
import { EmptyState, ListSkeleton } from '../components/EmptyState';
import { api } from '../lib/api';
import type { FileEntry } from '../types';
import { FilePreviewModal } from '../components/FilePreviewModal';

export function TrashPage() {
  const { drives } = useDriveStore();
  const { addToast } = useToastStore();

  const [results, setResults] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);

  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getTrashFiles();
      setResults(data.files);
    } catch {
      addToast('error', 'Gagal memuat sampah');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (fileId: string) => {
    try {
      await api.restoreFile(fileId);
      addToast('success', 'File berhasil dipulihkan');
      fetchTrash();
    } catch {
      addToast('error', 'Gagal memulihkan file');
    }
  };

  const handlePermanentDelete = async (fileId: string) => {
    try {
      await api.deleteFilePermanent(fileId);
      addToast('success', 'File dihapus permanen');
      fetchTrash();
    } catch {
      addToast('error', 'Gagal menghapus file permanen');
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
        <h1 className="text-2xl font-semibold text-stone-800">Sampah</h1>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : results.length > 0 ? (
        <div className="bg-card rounded-xl border border-stone-200 overflow-hidden">
          <FileGrid
            files={results}
            subfolders={[]}
            getDriveInfo={getDriveInfo}
            onShare={() => {}}
            onMoveDrive={() => {}}
            onPreviewFile={setPreviewFile}
            isTargetShared={() => false}
            viewMode="list"
            isTrashView={true}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        </div>
      ) : (
        <EmptyState
          icon={Trash2}
          title="Sampah kosong"
          description="File yang dihapus akan muncul di sini."
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
