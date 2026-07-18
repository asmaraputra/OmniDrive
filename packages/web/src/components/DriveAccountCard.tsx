import { HardDrive, RefreshCw, Trash2 } from 'lucide-react';
import type { DriveAccount } from '../types';
import { QuotaBar } from './QuotaBar';
import { formatFileSize, getDriveColor } from '../lib/utils';
import { useState } from 'react';

interface DriveAccountCardProps {
  drive: DriveAccount;
  index: number;
  onSync: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
}

export function DriveAccountCard({ drive, index, onSync, onDisconnect }: DriveAccountCardProps) {
  const [syncing, setSyncing] = useState(false);
  const color = getDriveColor(index);

  const isSyncing = syncing || drive.syncStatus === 'syncing';

  const handleSync = async () => {
    setSyncing(true);
    try { await onSync(drive.id); } finally { setSyncing(false); }
  };

  return (
    <div className="bg-card border border-stone-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            <HardDrive size={18} color="white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-stone-800">{drive.email}</div>
            <div className="text-xs text-stone-400">
              {drive.type === 'service_account' ? 'Service Account' : 'OAuth'}
              {drive.isPrimary && <span className="ml-1.5 text-primary font-medium">· Utama</span>}
              {drive.health === 'auth_expired' && (
                <span className="ml-1.5 text-red-600 font-medium" title="Sesi Google kedaluwarsa — putuskan dan hubungkan kembali akun ini">· perlu sambungan ulang</span>
              )}
              {drive.health === 'error' && (
                <span className="ml-1.5 text-amber-600" title="Tidak dapat menjangkau Google Drive pada pemeriksaan terakhir — biasanya sementara">· tidak terjangkau</span>
              )}
            </div>
            {drive.lastSyncedAt && (
              <div className="text-[10px] text-stone-400 mt-0.5">
                Terakhir disinkron: {new Date(drive.lastSyncedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Menyinkron...' : 'Sinkron'}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            onClick={() => {
              const primaryNote = drive.isPrimary
                ? ' Ini adalah drive utama Anda — drive terhubung lain akan menjadi utama jika tersedia.'
                : '';
              const message =
                `Putuskan ${drive.email}?${primaryNote} ` +
                'File Anda di Google Drive tidak akan dihapus; hanya akses AzaDrive dan data tersinkron yang akan dihapus.';
              if (confirm(message)) {
                void onDisconnect(drive.id);
              }
            }}
          >
            <Trash2 size={12} />
            Putuskan
          </button>
        </div>
      </div>

      <QuotaBar used={drive.usedQuota} total={drive.totalQuota} color={color} showLabel={false} />
      <div className="flex justify-between mt-2 text-xs text-stone-400">
        <span>{formatFileSize(drive.freeSpace)} kosong dari {formatFileSize(drive.totalQuota)}</span>
        <span>{drive.usagePercent}%</span>
      </div>
    </div>
  );
}
