import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { useDriveStore } from '../stores/driveStore';
import { useAuthStore } from '../stores/authStore';
import { useSharedStore } from '../stores/sharedStore';
import { QuotaBar } from '../components/QuotaBar';
import { formatFileSize, formatRelativeTime, getDriveColor } from '../lib/utils';
import { api } from '../lib/api';
import { useToastStore } from '../stores/toastStore';
import type { FileEntry, WorkspaceFolder } from '../types';
import {
  HardDrive,
  RefreshCw,
  Clock,
  Star,
  FolderTree,
  Share2,
  Settings,
  ArrowRight,
  Plus,
  Cloud,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  Archive,
  File,
  Users,
} from 'lucide-react';

type CategoryOverview = {
  images: number;
  videos: number;
  documents: number;
  audio: number;
  archives: number;
  others: number;
};

const CATEGORY_META: {
  key: keyof CategoryOverview;
  label: string;
  color: string;
  Icon: typeof ImageIcon;
}[] = [
  { key: 'documents', label: 'Dokumen', color: '#3b82f6', Icon: FileText },
  { key: 'images', label: 'Gambar', color: '#ef4444', Icon: ImageIcon },
  { key: 'videos', label: 'Video', color: '#f59e0b', Icon: Film },
  { key: 'audio', label: 'Audio', color: '#10b981', Icon: Music },
  { key: 'archives', label: 'Arsip', color: '#6366f1', Icon: Archive },
];

// Normalized shape so Recent can merge files + workspace folders into one sorted list.
type RecentItem = {
  id: string;
  name: string;
  modifiedAt: string | null;
  isStarred?: boolean;
  kind: 'file' | 'folder';
  driveIndex?: number;
  mimeType?: string | null;
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 17) return 'Selamat siang';
  return 'Selamat malam';
}

function firstName(name?: string | null): string {
  if (!name) return '';
  return name.split(' ')[0];
}

function getRecentFileIcon(mime: string | null | undefined) {
  if (!mime) return File;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  if (mime.includes('pdf') || mime.includes('text') || mime.includes('document') || mime.includes('sheet')) return FileText;
  if (mime.includes('zip') || mime.includes('compress')) return Archive;
  return File;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { drives, aggregate, isLoading, fetchDrives } = useDriveStore();
  const { user } = useAuthStore();
  const { sharedLinks, fetchSharedLinks } = useSharedStore();
  const { addToast } = useToastStore();

  const [recentFiles, setRecentFiles] = useState<FileEntry[]>([]);
  const [recentFolders, setRecentFolders] = useState<WorkspaceFolder[]>([]);
  const [category, setCategory] = useState<CategoryOverview | null>(null);

  const refreshRecent = useCallback(() => {
    api.getRecentFiles().then((data) => {
      setRecentFiles(data.files.slice(0, 8));
      setRecentFolders(data.folders ? data.folders.slice(0, 8) : []);
    }).catch(() => {
      addToast('error', 'Gagal memuat file terbaru');
    });
  }, [addToast]);

  const refreshCategory = useCallback(() => {
    api.getFileCategoryOverview().then(setCategory).catch(() => {
      setCategory(null);
      addToast('error', 'Gagal memuat kategori penyimpanan');
    });
  }, [addToast]);

  useEffect(() => {
    fetchDrives();
    fetchSharedLinks();
    refreshRecent();
    refreshCategory();
  }, [fetchDrives, fetchSharedLinks, refreshRecent, refreshCategory]);

  const hasDrives = drives.length > 0;
  const usedPercent = aggregate.totalQuota > 0
    ? (aggregate.totalUsed / aggregate.totalQuota) * 100
    : 0;

  // Donut data — only categories with bytes, sorted desc. Others folded in.
  const donutData = useMemo(() => {
    if (!category) return [];
    const rows = CATEGORY_META
      .map((m) => ({ name: m.label, value: category[m.key], color: m.color }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
    if ((category.others ?? 0) > 0) {
      rows.push({ name: 'Lainnya', value: category.others, color: '#9ca3af' });
    }
    return rows;
  }, [category]);

  const totalCategoryBytes = donutData.reduce((sum, d) => sum + d.value, 0);

  // Merged + sorted recent items (files + workspace folders), capped at 6.
  const recentItems = useMemo(() => {
    const files: RecentItem[] = recentFiles.map((f) => {
      const driveIndex = drives.findIndex((d) => d.id === f.driveAccountId);
      return {
        id: f.id,
        name: f.name,
        modifiedAt: f.googleModifiedAt ?? f.syncedAt,
        isStarred: f.isStarred,
        kind: 'file' as const,
        driveIndex: driveIndex >= 0 ? driveIndex : 0,
        mimeType: f.mimeType,
      };
    });
    const folders: RecentItem[] = recentFolders.map((f) => ({
      id: f.id,
      name: f.name,
      modifiedAt: f.updatedAt,
      isStarred: f.isStarred,
      kind: 'folder' as const,
    }));
    return [...files, ...folders]
      .sort((a, b) => {
        const aTime = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
        const bTime = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [recentFiles, recentFolders, drives]);

  const starredCount = recentFiles.filter((f) => f.isStarred).length;

  const quickLinks = [
    { to: '/files/root', label: 'Drive Saya', Icon: HardDrive, hint: 'Jelajahi semua file' },
    { to: '/starred', label: 'Berbintang', Icon: Star, hint: `${starredCount} ditandai` },
    { to: '/shared', label: 'Terbagi', Icon: Share2, hint: `${sharedLinks.length} tautan` },
    { to: '/workspaces', label: 'Workspace', Icon: FolderTree, hint: 'Folder tim' },
  ] as const;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Greeting + refresh */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-800">
            {greeting()}{user ? `, ${firstName(user.name)}` : ''}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {hasDrives
              ? `${aggregate.driveCount} drive${aggregate.driveCount > 1 ? ' ' : ''}terhubung · ${formatFileSize(aggregate.totalFree)} kosong`
              : 'Hubungkan Google Drive untuk mulai'}
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 bg-card border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          onClick={() => {
            fetchDrives();
            refreshRecent();
            refreshCategory();
            addToast('info', 'Disegarkan');
          }}
        >
          <RefreshCw size={14} />
          Segarkan
        </button>
      </div>

      {/* Empty state — no drives yet. */}
      {!hasDrives && !isLoading && (
        <div className="bg-card border border-stone-200 rounded-2xl p-8 sm:p-12 text-center bento-reveal">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Cloud size={26} className="text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-stone-800">Belum ada drive terhubung</h2>
          <p className="text-sm text-stone-500 mt-1 max-w-md mx-auto">
            Hubungkan Google Drive pertama Anda untuk mulai menyinkronkan, menjelajahi, dan berbagi file dari satu tempat.
          </p>
          <button
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => navigate('/settings/drives')}
          >
            <Plus size={16} />
            Hubungkan drive
          </button>
        </div>
      )}

      {/* Loading skeleton — matches bento shape */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 auto-rows-[minmax(150px,auto)]">
          <div className="lg:col-span-2 lg:row-span-2 bg-card border border-stone-200 rounded-2xl animate-pulse" />
          <div className="lg:col-span-2 lg:row-span-2 bg-card border border-stone-200 rounded-2xl animate-pulse" />
          <div className="lg:col-span-2 bg-card border border-stone-200 rounded-2xl animate-pulse" />
          <div className="lg:col-span-2 bg-card border border-stone-200 rounded-2xl animate-pulse" />
        </div>
      )}

      {/* Bento grid — 4 cols desktop. Storage hero is the protagonist. */}
      {hasDrives && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 auto-rows-[minmax(150px,auto)]">
          {/* Storage hero — col-span-2 row-span-2. Radial ring (Recharts) + cobalt wash. */}
          <article
            className="lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-primary/5 via-card to-card border border-stone-200 rounded-2xl p-6 flex flex-col justify-between bento-reveal"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-500">Total penyimpanan</span>
              <span className="text-xs text-stone-400">{aggregate.driveCount} drive</span>
            </div>
            <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto my-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="72%"
                  outerRadius="100%"
                  data={[{ value: Math.min(usedPercent, 100), fill: '#2563EB' }]}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" background={{ fill: '#e7e5e4' }} cornerRadius={8} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl sm:text-5xl font-semibold tracking-tight text-stone-800 leading-none">
                  {usedPercent.toFixed(1)}<span className="text-xl sm:text-2xl text-stone-400 ml-0.5">%</span>
                </span>
                <span className="text-xs text-stone-500 mt-1.5">dari {formatFileSize(aggregate.totalQuota)}</span>
              </div>
            </div>
            {/* ponytail: ring replaces QuotaBar here — one visual representation of %, not three. Per-drive bars still live on the drives card. */}
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-primary font-medium">{formatFileSize(aggregate.totalFree)} kosong</span>
              <span className="text-stone-300">·</span>
              <span className="text-stone-500">{formatFileSize(aggregate.totalUsed)} terpakai</span>
            </div>
          </article>

          {/* Quick access — col-span-2 row-span-2. Vertical list, not 2x2 grid. */}
          <article
            className="lg:col-span-2 lg:row-span-2 bg-surface border border-stone-200/70 rounded-2xl p-5 flex flex-col bento-reveal"
            style={{ animationDelay: '120ms' }}
          >
            <span className="text-sm font-medium text-stone-500 mb-3 block">Akses cepat</span>
            <div className="flex flex-col gap-2 flex-1">
              {quickLinks.map(({ to, label, Icon, hint }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="group flex items-center gap-3 bg-card border border-stone-200 rounded-xl p-3 text-left hover:border-primary/40 hover:-translate-y-[1px] hover:shadow-sm transition-all flex-1"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-800">{label}</div>
                    <div className="text-xs text-stone-400 mt-0.5 truncate">{hint}</div>
                  </div>
                  <ArrowRight size={14} className="text-stone-300 group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </article>

          {/* Category donut — col-span-2. Enlarged chart, center label. */}
          <article
            className="lg:col-span-2 bg-card border border-stone-200 rounded-2xl p-5 flex flex-col bento-reveal"
            style={{ animationDelay: '180ms' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-stone-500">Per tipe</span>
              {totalCategoryBytes > 0 && (
                <span className="text-xs text-stone-400">{formatFileSize(totalCategoryBytes)}</span>
              )}
            </div>

            {donutData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-stone-400">Belum ada file tersinkron.</p>
              </div>
            ) : (
              <div className="flex items-center gap-5 flex-1">
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="100%"
                        paddingAngle={2}
                        strokeWidth={0}
                        isAnimationActive
                        animationDuration={700}
                      >
                        {donutData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-stone-400 leading-none">terpakai</span>
                    <span className="text-sm font-semibold text-stone-700 leading-tight mt-0.5">
                      {formatFileSize(aggregate.totalUsed)}
                    </span>
                  </div>
                </div>
                <ul className="flex-1 space-y-1.5 min-w-0">
                  {donutData.slice(0, 4).map((c) => {
                    const pct = totalCategoryBytes > 0 ? (c.value / totalCategoryBytes) * 100 : 0;
                    return (
                      <li key={c.name} className="flex items-center justify-between text-sm gap-2">
                        <span className="flex items-center gap-2 text-stone-600 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="text-stone-400 text-xs flex-shrink-0">
                          {pct.toFixed(0)}%
                        </span>
                      </li>
                    );
                  })}
                  {donutData.length > 4 && (
                    <li className="text-xs text-stone-400 pt-1">+{donutData.length - 4} lainnya</li>
                  )}
                </ul>
              </div>
            )}
          </article>

          {/* Recent — col-span-2. Compact custom rows (files + folders), not FileGrid.
              ponytail: Home is a glance dashboard, not a file manager. Share/move/preview
              actions live on /files/:id — duplicating them here just adds state + modals. */}
          <article
            className="lg:col-span-2 bg-card border border-stone-200 rounded-2xl overflow-hidden bento-reveal"
            style={{ animationDelay: '240ms' }}
          >
            <div className="flex items-center justify-between p-5 pb-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-stone-400" />
                <h2 className="text-sm font-medium text-stone-500">Recent</h2>
              </div>
              {recentItems.length > 0 && (
                <button
                  className="text-xs text-primary hover:underline"
                  onClick={() => navigate('/files/root')}
                >
                  Lihat semua
                </button>
              )}
            </div>
            {recentItems.length > 0 ? (
              <ul className="px-2 pb-2">
                {recentItems.map((item) => {
                  const Icon = item.kind === 'folder' ? FolderTree : getRecentFileIcon(item.mimeType);
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <button
                        onClick={() => navigate(item.kind === 'folder' ? '/workspaces' : '/files/root')}
                        className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors text-left"
                      >
                        <Icon size={16} className="text-stone-400 group-hover:text-stone-600 transition-colors flex-shrink-0" />
                        <span className="flex-1 min-w-0 text-sm text-stone-700 truncate">{item.name}</span>
                        {item.isStarred && (
                          <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                        )}
                        {item.kind === 'file' && item.driveIndex !== undefined && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getDriveColor(item.driveIndex) }}
                            title={drives[item.driveIndex]?.email ?? ''}
                          />
                        )}
                        <span className="text-xs text-stone-400 flex-shrink-0 tabular-nums">
                          {item.modifiedAt ? formatRelativeTime(item.modifiedAt) : ''}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-stone-500">Belum ada file terbaru.</p>
                <button
                  className="mt-3 text-xs text-primary hover:underline"
                  onClick={() => navigate('/files/root')}
                >
                  Jelajahi Drive Saya
                </button>
              </div>
            )}
          </article>

          {/* Connected drives — col-span-4 full width. Drive identity stripe + bigger avatar. */}
          <article
            className="lg:col-span-4 bento-reveal"
            style={{ animationDelay: '300ms' }}
          >
            <h2 className="text-sm font-medium text-stone-500 mb-3">Drive terhubung</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {drives.map((drive, i) => (
                <div
                  key={drive.id}
                  className="bg-card border border-stone-200 border-l-4 rounded-xl p-4 hover:shadow-sm transition-shadow"
                  style={{ borderLeftColor: getDriveColor(i) }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: getDriveColor(i) }}
                    >
                      <HardDrive size={18} color="white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-stone-800 truncate">{drive.email}</div>
                      <div className="text-xs text-stone-400 flex items-center gap-1.5">
                        {drive.type === 'service_account' ? 'Service Account' : 'OAuth'}
                        {drive.isPrimary && (
                          <span className="inline-flex items-center text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            Utama
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <QuotaBar used={drive.usedQuota} total={drive.totalQuota} color={getDriveColor(i)} showLabel={false} />
                  <div className="flex justify-between mt-2 text-xs text-stone-400">
                    <span>{formatFileSize(drive.usedQuota)} terpakai</span>
                    <span>{drive.usagePercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Admin tools — col-span-4 conditional. Horizontal card for admins. */}
          {user?.role === 'super_admin' && (
            <article
              className="lg:col-span-4 bg-card border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bento-reveal"
              style={{ animationDelay: '360ms' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center flex-shrink-0">
                  <Users size={18} className="text-stone-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-stone-800">Alat admin</div>
                  <p className="text-xs text-stone-400 mt-0.5">Kelola pengguna dan undangan.</p>
                </div>
              </div>
              <button
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:gap-2 transition-all self-start sm:self-auto"
                onClick={() => navigate('/admin/users')}
              >
                <Settings size={14} />
                Buka
              </button>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
