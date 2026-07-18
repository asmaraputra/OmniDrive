import { useState } from 'react';
import { Key, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useToastStore } from '../../stores/toastStore';

/** Change-password form for Settings. */
export function AccountPasswordForm() {
  const { addToast } = useToastStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('error', 'Kata sandi baru tidak cocok');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('success', 'Kata sandi diperbarui. Sesi lain telah dikeluarkan.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal mengubah kata sandi');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Akun</h2>
      <form onSubmit={handleChangePassword} className="bg-card border border-stone-200 rounded-xl p-5 space-y-4 max-w-md">
        <p className="text-sm text-stone-600">Ubah kata sandi login Anda. Perangkat lain akan dikeluarkan.</p>
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium text-stone-700 mb-1.5">
            Kata sandi saat ini
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-stone-700 mb-1.5">
            Kata sandi baru
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card"
          />
          <p className="mt-1 text-xs text-stone-500">Min 8 karakter, dengan huruf besar, huruf kecil, dan angka.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-stone-700 mb-1.5">
            Konfirmasi kata sandi baru
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-card"
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            Ubah kata sandi
          </button>
        </div>
      </form>
    </div>
  );
}
