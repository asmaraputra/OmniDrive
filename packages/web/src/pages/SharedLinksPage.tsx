import { useEffect, useState } from 'react';
import { getSharedLinks, deleteSharedLink, SharedLink } from '../lib/api';
import { Link, FileText, Folder, Eye, Download, Trash2, Copy, Check, Clock, Settings } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import { EditShareModal } from '../components/EditShareModal';
import { EmptyState, ListSkeleton } from '../components/EmptyState';

export function SharedLinksPage() {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<SharedLink | null>(null);
  const { addToast } = useToastStore();

  useEffect(() => {
    getSharedLinks()
      .then((res) => {
        setLinks(res.links);
        setIsLoading(false);
      })
      .catch(() => {
        addToast('error', 'Gagal memuat tautan terbagi');
        setIsLoading(false);
      });
  }, [addToast]);

  const revoke = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin berhenti membagikan item ini?')) {
      try {
        await deleteSharedLink(id);
        setLinks(links.filter((l) => l.id !== id));
        addToast('success', 'Tautan berhasil dicabut');
      } catch {
        addToast('error', 'Gagal mencabut tautan');
      }
    }
  };

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/shared/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    addToast('success', 'Tautan disalin ke papan klip');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
          <Link className="text-primary" size={32} aria-hidden />
          Tautan Terbagi
        </h1>
        <p className="text-stone-500 mt-2 text-lg">
          Kelola file dan folder yang telah Anda bagikan kepada orang lain.
        </p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : links.length === 0 ? (
        <div className="bg-card rounded-xl border border-stone-200">
          <EmptyState
            icon={Link}
            title="Belum ada tautan terbagi aktif"
            description="Klik kanan file apa pun untuk membuat tautan yang dapat dibagikan."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <div
              key={link.id}
              className="group bg-card rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-stone-100 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-3 rounded-lg flex-shrink-0 bg-primary/10 text-primary">
                      {link.targetType === 'folder' ? <Folder size={24} aria-hidden /> : <FileText size={24} aria-hidden />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-stone-900 font-semibold truncate text-lg" title={link.targetName || link.targetId}>
                        {link.targetName || (link.targetType === 'folder' ? 'Folder' : 'File') + ' Tidak Diketahui'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-1">
                        <Clock size={12} aria-hidden />
                        <span>Dibuat {formatDate(link.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 py-3 px-4 bg-stone-50 rounded-lg mt-4">
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Eye size={16} className="text-stone-400" aria-hidden />
                    <span className="font-medium">{link.viewCount}</span>
                    <span className="text-stone-400 text-xs uppercase tracking-wider">Tampilan</span>
                  </div>
                  <div className="w-px h-8 bg-stone-200" />
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Download size={16} className="text-stone-400" aria-hidden />
                    <span className="font-medium">{link.downloadCount}</span>
                    <span className="text-stone-400 text-xs uppercase tracking-wider">Unduhan</span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 bg-stone-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(link.id)}
                  className="flex items-center justify-center gap-2 flex-1 py-2 px-4 rounded-lg bg-card border border-stone-200 text-stone-700 font-medium text-sm hover:bg-stone-50 hover:text-primary hover:border-primary/30 transition-colors"
                >
                  {copiedId === link.id ? (
                    <>
                      <Check size={16} className="text-green-500" aria-hidden />
                      <span className="text-green-600">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} aria-hidden />
                      <span>Salin Tautan</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLink(link)}
                  className="p-2 rounded-lg text-stone-400 hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Edit pengaturan berbagi"
                >
                  <Settings size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => revoke(link.id)}
                  className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Berhenti membagikan"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EditShareModal
        open={!!editingLink}
        link={editingLink}
        onClose={() => setEditingLink(null)}
      />
    </div>
  );
}
