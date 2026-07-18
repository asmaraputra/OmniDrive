import { useEffect, useState } from 'react';
import { useDriveStore } from '../stores/driveStore';
import { DriveAccountCard } from '../components/DriveAccountCard';
import { AccountPasswordForm } from '../components/settings/AccountPasswordForm';
import { useToastStore } from '../stores/toastStore';
import { Plus, Key, X, Trash2, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { api } from '../lib/api';

const parseSqliteDate = (dateVal: any) => {
  if (!dateVal) return new Date();
  if (typeof dateVal === 'string') {
    const normalized = dateVal.includes(' ') && !dateVal.includes('T')
      ? dateVal.replace(' ', 'T') + 'Z'
      : dateVal;
    return new Date(normalized);
  }
  return new Date(dateVal);
};

export function SettingsPage() {
  const { drives, fetchDrives, removeDrive, triggerSync } = useDriveStore();
  const { addToast } = useToastStore();
  const [showSaForm, setShowSaForm] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [saCredentials, setSaCredentials] = useState('');
  const [saFolderId, setSaFolderId] = useState('');

  const [s3Keys, setS3Keys] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loadingS3, setLoadingS3] = useState(false);

  const handleConnectDrive = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    try {
      const { url } = await api.getDriveConnectUrl();
      window.location.href = url;
    } catch (e) {
      setIsConnecting(false);
      addToast('error', e instanceof Error ? e.message : 'Gagal memulai Google OAuth');
    }
  };

  // Form states for creating a key
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyScope, setNewKeyScope] = useState(''); // Empty string means Global
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Form states for showing the created credentials
  const [createdCredential, setCreatedCredential] = useState<{
    accessKeyId: string;
    secretAccessKey: string;
    description: string;
  } | null>(null);
  const [copiedAccessKey, setCopiedAccessKey] = useState(false);
  const [copiedSecretKey, setCopiedSecretKey] = useState(false);

  const loadData = async () => {
    setLoadingS3(true);
    try {
      const [keys, wsData] = await Promise.all([
        api.getS3Credentials(),
        api.getWorkspaces()
      ]);
      setS3Keys(keys);
      // Filter the list of workspaces to only contain items where role === 'manager' || role === 'owner'
      const filtered = (wsData.workspaces || []).filter(
        (w: any) => w.role === 'manager' || w.role === 'owner'
      );
      setWorkspaces(filtered);
    } catch (err) {
      addToast('error', 'Gagal memuat data kunci S3');
    } finally {
      setLoadingS3(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyDescription.trim()) return;

    setIsCreatingKey(true);
    try {
      const result = await api.createS3Credential(
        newKeyDescription,
        newKeyScope || undefined
      );

      // Store the returned credentials to display in the success modal/view
      setCreatedCredential({
        accessKeyId: result.accessKeyId,
        secretAccessKey: result.secretAccessKey,
        description: result.description,
      });

      // Clear form
      setNewKeyDescription('');
      setNewKeyScope('');
      setShowCreateModal(false);

      // Refresh list
      loadData();
      addToast('success', 'Kunci API S3 berhasil dibuat');
    } catch (err) {
      addToast('error', 'Gagal membuat kunci API S3');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Anda yakin ingin mencabut kunci API S3 ini? Tindakan ini permanen dan aplikasi apa pun yang menggunakan kunci ini akan kehilangan akses.')) {
      return;
    }
    try {
      await api.deleteS3Credential(id);
      addToast('success', 'Kunci S3 berhasil dicabut');
      // Refresh list
      loadData();
    } catch {
      addToast('error', 'Gagal mencabut kunci S3');
    }
  };

  const handleCopy = (text: string, type: 'access' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'access') {
      setCopiedAccessKey(true);
      setTimeout(() => setCopiedAccessKey(false), 2000);
    } else {
      setCopiedSecretKey(true);
      setTimeout(() => setCopiedSecretKey(false), 2000);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  useEffect(() => {
    const hasSyncing = drives.some(d => d.syncStatus === 'syncing');
    if (!hasSyncing) return;

    const interval = setInterval(() => {
      fetchDrives();
    }, 3000);

    return () => clearInterval(interval);
  }, [drives, fetchDrives]);

  const handleSync = async (id: string) => {
    try {
      await triggerSync(id);
      addToast('success', 'Sinkron selesai');
      fetchDrives();
    } catch {
      addToast('error', 'Sinkron gagal');
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await removeDrive(id);
      addToast('success', 'Drive terputus');
      fetchDrives();
    } catch {
      addToast('error', 'Gagal memutuskan drive');
    }
  };

  const handleAddServiceAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addServiceAccount(saCredentials, saFolderId);
      addToast('success', 'Service account ditambahkan');
      setSaCredentials('');
      setSaFolderId('');
      setShowSaForm(false);
      fetchDrives();
    } catch {
      addToast('error', 'Gagal menambahkan service account');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-stone-800">Pengaturan</h1>

      <AccountPasswordForm />

      {/* Section: Connected Drives */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Drive Terhubung</h2>
        <div className="space-y-3">
          {drives.map((drive, i) => (
            <DriveAccountCard
              key={drive.id}
              drive={drive}
              index={i}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
          ))}
          {drives.length === 0 && (
            <div className="text-center py-8 text-stone-400 border border-dashed border-stone-200 rounded-xl">
              Belum ada drive terhubung
            </div>
          )}
        </div>
      </div>

      {/* Section: Add Drive */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Tambah Drive</h2>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleConnectDrive}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium text-sm disabled:opacity-60"
          >
            {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Tambah Google Drive
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-card text-stone-700 rounded-xl border border-stone-300 hover:bg-stone-50 transition-colors font-medium text-sm"
            onClick={() => setShowSaForm(!showSaForm)}
          >
            <Key size={18} /> Tambah Service Account
          </button>
        </div>
      </div>

      {/* Service Account Form */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showSaForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="bg-card border border-stone-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-stone-800">Tambah Service Account</h3>
            <button
              onClick={() => setShowSaForm(false)}
              className="p-1.5 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleAddServiceAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Service Account JSON
              </label>
              <textarea
                value={saCredentials}
                onChange={(e) => setSaCredentials(e.target.value)}
                placeholder="Tempel kunci JSON service account..."
                rows={6}
                className="w-full font-mono text-xs border border-stone-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Folder ID yang Dibagikan
              </label>
              <input
                type="text"
                value={saFolderId}
                onChange={(e) => setSaFolderId(e.target.value)}
                placeholder="Folder ID Google Drive yang dibagikan dengan SA"
                className="w-full border border-stone-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-stone-700 bg-card border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors"
                onClick={() => setShowSaForm(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
              >
                Tambah Akun
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      {/* Section: S3 API Keys */}
      <div className="border-t border-stone-200 pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide">Kunci API S3</h2>
            <p className="text-xs text-stone-400 mt-1">Kelola kredensial S3-kompatibel dengan cakupan workspace dan global untuk mengakses object storage.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl transition-colors font-medium text-xs shadow-sm"
          >
            <Plus size={16} /> Buat Kunci Baru
          </button>
        </div>

        {loadingS3 ? (
          <div className="flex items-center justify-center py-8 text-stone-400">
            <Loader2 className="animate-spin mr-2" size={18} />
            Memuat kredensial S3...
          </div>
        ) : s3Keys.length === 0 ? (
          <div className="text-center py-8 text-stone-400 border border-dashed border-stone-200 rounded-xl">
            Belum ada kunci API S3 yang dibuat.
          </div>
        ) : (
          <div className="bg-card border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Deskripsi</th>
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Access Key ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Cakupan</th>
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Dibuat Pada</th>
                    <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {s3Keys.map((key) => (
                    <tr key={key.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-sm text-stone-800 font-medium">
                        {key.description || <span className="text-stone-400 italic">Tanpa deskripsi</span>}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-stone-600 bg-stone-50/50 rounded select-all font-semibold">
                        {key.access_key_id || key.accessKeyId}
                      </td>
                      <td className="px-4 py-3.5 text-sm">
                        {key.workspace_id || key.workspaceId ? (
                          <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                            Workspace: {key.workspace_name || key.workspaceName || 'Tidak diketahui'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-50 text-green-700 border border-green-150">
                            Global
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-stone-400">
                        {parseSqliteDate(key.created_at || key.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="p-1 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Cabut Kunci"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create S3 Key Dialog */}
      <Dialog open={showCreateModal} onOpenChange={(open) => !open && !isCreatingKey && setShowCreateModal(false)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-stone-800">Buat Kunci API S3</DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Buat kredensial untuk mengakses storage AzaDrive dengan aplikasi yang kompatibel dengan S3.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Deskripsi
              </label>
              <input
                type="text"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder="mis. klien desktop Rclone, skrip backup"
                className="w-full border border-stone-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Cakupan
              </label>
              <select
                value={newKeyScope}
                onChange={(e) => setNewKeyScope(e.target.value)}
                className="w-full border border-stone-300 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card"
              >
                <option value="">Global (Semua Workspace)</option>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    Workspace: {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-stone-700 bg-card border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors"
                onClick={() => setShowCreateModal(false)}
                disabled={isCreatingKey}
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                disabled={isCreatingKey || !newKeyDescription.trim()}
              >
                {isCreatingKey && <Loader2 className="animate-spin" size={16} />}
                Buat Kunci
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Modal - Credentials Display */}
      <Dialog open={createdCredential !== null} onOpenChange={(open) => !open && setCreatedCredential(null)}>
        <DialogContent
          className="sm:max-w-[480px] rounded-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-stone-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-ping" />
              S3 Key Berhasil Dibuat
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-400">
              Simpan kredensial ini. Demi keamanan, secret key tidak akan pernah ditampilkan lagi.
            </DialogDescription>
          </DialogHeader>

          {createdCredential && (
            <div className="space-y-4 pt-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3">
                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-amber-800">
                  <span className="font-semibold block mb-0.5">Peringatan Keamanan:</span>
                  Silakan salin Secret Access Key di bawah ini sekarang. Anda tidak akan dapat mengambil atau melihatnya lagi setelah modal ini ditutup.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Deskripsi
                </label>
                <div className="text-sm font-medium text-stone-800 bg-stone-50 border border-stone-150 rounded-xl px-3 py-2">
                  {createdCredential.description || <span className="text-stone-400 italic">Tanpa deskripsi</span>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Access Key ID
                  </label>
                  <button
                    onClick={() => handleCopy(createdCredential.accessKeyId, 'access')}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary font-medium"
                  >
                    {copiedAccessKey ? (
                      <>
                        <Check size={14} />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Salin
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-stone-700 bg-stone-50 border border-stone-150 rounded-xl px-3 py-2.5 break-all select-all">
                  {createdCredential.accessKeyId}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                    Secret Access Key
                  </label>
                  <button
                    onClick={() => handleCopy(createdCredential.secretAccessKey, 'secret')}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary font-medium"
                  >
                    {copiedSecretKey ? (
                      <>
                        <Check size={14} />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Salin
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-stone-700 bg-stone-50 border border-stone-150 rounded-xl px-3 py-2.5 break-all select-all">
                  {createdCredential.secretAccessKey}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-stone-100">
                <button
                  type="button"
                  className="px-5 py-2 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
                  onClick={() => setCreatedCredential(null)}
                >
                  Saya sudah menyalin Secret Key
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
