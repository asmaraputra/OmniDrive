import type { FileEntry, DriveFolder, WorkspaceFolder } from '../../types';
import { Folder, Download, Trash2, Pencil, ExternalLink, Share2, RefreshCw, Eye, Star, Info } from 'lucide-react';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '../ui/context-menu';

export type ItemContextMenuProps = {
  type: 'file' | 'folder';
  id?: string;
  name?: string;
  native?: boolean;
  item?: FileEntry | DriveFolder | WorkspaceFolder;
  isTrashView?: boolean;
  isStarred?: boolean;
  onToggleStar?: (id: string, type: 'file' | 'folder', currentStarStatus: boolean) => void;
  onPreviewFile?: (file: FileEntry) => void;
  onShare?: (id: string, type: 'file' | 'folder') => void;
  onRenameFile?: (id: string, name: string) => void;
  onMoveDrive?: (file: FileEntry) => void;
  onDeleteFile?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onAddToWorkspace?: (item: FileEntry) => void;
  onViewInfo?: (item: FileEntry | DriveFolder | WorkspaceFolder, type: 'file' | 'folder') => void;
  onSetRetentionPolicy?: (id: string, type: 'file' | 'folder') => void;
};

export function ItemContextMenuContent({
  type,
  id,
  name,
  native,
  item,
  isTrashView,
  isStarred,
  onToggleStar,
  onPreviewFile,
  onShare,
  onRenameFile,
  onMoveDrive,
  onDeleteFile,
  onRestore,
  onPermanentDelete,
  onAddToWorkspace,
  onViewInfo,
  onSetRetentionPolicy,
}: ItemContextMenuProps) {
  const file = type === 'file' ? (item as FileEntry) : undefined;

  return (
    <ContextMenuContent className="w-48 bg-card border border-stone-200 shadow-xl rounded-xl overflow-hidden py-1">
      {onViewInfo && item && (
        <ContextMenuItem className="px-3 py-2 text-sm text-stone-700 cursor-pointer hover:bg-stone-100 outline-none flex items-center" onClick={() => onViewInfo(item, type)}>
          <Info size={16} className="mr-3 text-stone-500" />
          Lihat Info
        </ContextMenuItem>
      )}
      {isTrashView ? (
        <>
          {onRestore && id && (
            <ContextMenuItem className="px-3 py-2 text-sm text-stone-700 cursor-pointer hover:bg-stone-100 outline-none flex items-center" onClick={() => onRestore(id)}>
              <RefreshCw size={16} className="mr-3 text-stone-500" />
              Pulihkan
            </ContextMenuItem>
          )}
          {onPermanentDelete && id && (
            <ContextMenuItem className="px-3 py-2 text-sm text-red-600 cursor-pointer hover:bg-red-50 outline-none flex items-center" onClick={() => onPermanentDelete(id)}>
              <Trash2 size={16} className="mr-3 text-red-500" />
              Hapus Permanen
            </ContextMenuItem>
          )}
        </>
      ) : (
        <>
          {type === 'file' && file && onPreviewFile && (
            <ContextMenuItem className="px-3 py-2 text-sm text-stone-700 cursor-pointer hover:bg-stone-100 outline-none flex items-center" onClick={() => onPreviewFile(file)}>
              <Eye size={16} className="mr-3 text-stone-500" />
              Pratinjau
            </ContextMenuItem>
          )}
          {type === 'file' && file && native && file.webViewLink && (
            <ContextMenuItem onClick={() => window.open(file.webViewLink!, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="mr-2 h-4 w-4" /> Buka di Google
            </ContextMenuItem>
          )}
          {type === 'file' && file && !native && file.webContentLink && (
            <ContextMenuItem onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL || ''}/api/files/${file.id}/download`; }}>
              <Download className="mr-2 h-4 w-4" /> Unduh
            </ContextMenuItem>
          )}
          {onToggleStar && id && (
            <ContextMenuItem onClick={() => onToggleStar(id, type, !!isStarred)}>
              <Star className="mr-2 h-4 w-4" /> {isStarred ? 'Hapus dari Berbintang' : 'Tambah ke Berbintang'}
            </ContextMenuItem>
          )}
          {onShare && id && (
            <ContextMenuItem onClick={() => onShare(id, type)}>
              <Share2 className="mr-2 h-4 w-4" /> Bagikan
            </ContextMenuItem>
          )}
          {type === 'file' && file && onAddToWorkspace && (
            <ContextMenuItem onClick={() => onAddToWorkspace(file)}>
              <Folder className="mr-2 h-4 w-4" /> Tambah ke Workspace
            </ContextMenuItem>
          )}
          {onSetRetentionPolicy && id && (
            <ContextMenuItem onClick={() => onSetRetentionPolicy(id, type)}>
              <Folder className="mr-2 h-4 w-4" /> Atur Kebijakan Retensi
            </ContextMenuItem>
          )}
          {type === 'file' && onRenameFile && id && name && (
            <ContextMenuItem onClick={() => {
              const newName = prompt('Ubah nama file:', name);
              if (newName && newName !== name) onRenameFile(id, newName);
            }}>
              <Pencil className="mr-2 h-4 w-4" /> Ubah Nama
            </ContextMenuItem>
          )}
          {type === 'file' && onMoveDrive && file && (
            <ContextMenuItem onClick={() => onMoveDrive(file)}>
              <ExternalLink className="mr-2 h-4 w-4" /> Pindah ke drive lain
            </ContextMenuItem>
          )}
          {type === 'file' && onDeleteFile && id && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-red-600" onClick={() => onDeleteFile(id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </ContextMenuItem>
            </>
          )}
        </>
      )}
    </ContextMenuContent>
  );
}
