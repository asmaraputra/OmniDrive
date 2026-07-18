import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useDriveStore } from '../stores/driveStore';
import { useSharedStore } from '../stores/sharedStore';
import { useToastStore } from '../stores/toastStore';
import { FileGrid } from '../components/files/FileGrid';
import { ShareModal } from '../components/ShareModal';
import { MoveDriveModal } from '../components/MoveDriveModal';
import { FilePreviewModal } from '../components/FilePreviewModal';
import { EmptyState, ListSkeleton } from '../components/EmptyState';
import { api } from '../lib/api';
import type { FileEntry } from '../types';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { drives } = useDriveStore();
  const { isTargetShared } = useSharedStore();
  const { addToast } = useToastStore();

  const [results, setResults] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [shareTarget, setShareTarget] = useState<{ id: string, type: 'file' | 'folder' } | null>(null);
  const [moveDriveFiles, setMoveDriveFiles] = useState<FileEntry[]>([]);
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);

  const fetchResults = useCallback(async (q: string, signal?: AbortSignal) => {
    if (!q) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.searchFiles(q);
      if (signal?.aborted) return;
      setResults(data.files);
    } catch {
      if (signal?.aborted) return;
      addToast('error', 'Gagal melakukan pencarian');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [addToast]);

  useEffect(() => {
    const controller = new AbortController();
    fetchResults(query, controller.signal);
    return () => controller.abort();
  }, [query, fetchResults]);

  const getDriveInfo = useCallback((driveAccountId?: string | null) => {
    if (!driveAccountId) return { drive: null, index: 0 };
    const index = drives.findIndex((d) => d.id === driveAccountId);
    if (index === -1) return { drive: drives[0] || null, index: 0 };
    return { drive: drives[index], index };
  }, [drives]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-800">
          {query ? `Hasil pencarian untuk "${query}"` : 'Cari'}
        </h1>
      </div>

      {!query ? (
        <EmptyState
          icon={Search}
          title="Cari file Anda"
          description="Masukkan kata kunci pencarian di omnibar di atas."
        />
      ) : isLoading ? (
        <ListSkeleton rows={6} />
      ) : results.length > 0 ? (
        <div className="bg-card rounded-xl border border-stone-200 overflow-hidden">
          <FileGrid
            files={results}
            subfolders={[]}
            getDriveInfo={getDriveInfo}
            onShare={(id, type) => setShareTarget({ id, type })}
            onMoveDrive={(file) => setMoveDriveFiles([file])}
            onPreviewFile={setPreviewFile}
            isTargetShared={isTargetShared}
            viewMode="list"
          />
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Tidak ada file ditemukan"
          description={`Tidak ada yang cocok dengan "${query}".`}
        />
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
            fetchResults(query);
          }}
          onError={() => {
            addToast('error', 'Gagal memindahkan file');
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
