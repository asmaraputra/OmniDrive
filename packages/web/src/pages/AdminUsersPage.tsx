import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { ShieldAlert, Plus, MoreVertical } from 'lucide-react';
import type { User } from '../types';
import { api } from '../lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const AddUserModal: React.FC<{ open: boolean, onClose: () => void, onSuccess: () => void }> = ({ open, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'super_admin' | 'member'>('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.adminCreateUser({
        username: username.trim(),
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        password,
        role
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat pengguna');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 rounded-2xl overflow-hidden">
        <div className="flex items-center px-6 py-4 border-b border-stone-100 shrink-0">
          <DialogTitle className="text-lg font-medium text-stone-900">Tambah Pengguna</DialogTitle>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Username *</label>
              <input required value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Kata Sandi *</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nama</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Peran</label>
              <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full px-3 py-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-primary outline-none">
                <option value="member">Anggota</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 border rounded-md transition-colors">Batal</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50 transition-colors">Buat</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AdminUsersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // Users Tab State
  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Invitations Tab State
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState(1);

  const loadUsers = async () => {
    try {
      const res = await api.getAdminUsers();
      setUsers(res.users);
    } catch (e: any) {
      alert(e.message || 'Gagal memuat pengguna');
      console.error(e);
    }
  };

  const loadInvitations = async () => {
    try {
      const res = await api.getInvitations();
      setInvitations(res.invitations);
    } catch (e: any) {
      alert(e.message || 'Gagal memuat undangan');
      console.error(e);
    }
  };

  useEffect(() => {
    if (user?.role === 'super_admin') {
      if (activeTab === 'users') {
        loadUsers();
      } else {
        loadInvitations();
      }
    }
  }, [user, activeTab]);

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-500">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-medium text-stone-800">Akses Ditolak</h2>
        <p className="mt-2">Anda tidak memiliki izin untuk melihat halaman ini.</p>
      </div>
    );
  }

  // Users Actions
  const handleToggleStatus = (_id: string, _currentStatus: 'active' | 'blocked' | undefined) => {
    alert('Fitur segera hadir');
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      alert('Fitur segera hadir');
      setUserToDelete(null);
    }
  };

  // Invitations Actions
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInvitation(inviteCode, inviteMaxUses);
      setInviteCode('');
      setInviteMaxUses(1);
      loadInvitations();
    } catch (e: any) {
      alert(e.message || 'Terjadi error saat membuat undangan');
      console.error(e);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      await api.deleteInvitation(id);
      loadInvitations();
    } catch (e: any) {
      alert(e.message || 'Terjadi error saat menghapus undangan');
      console.error(e);
    }
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-800">Pengguna</h1>
      </div>

      <div className="flex border-b border-stone-200 mb-6 gap-6">
        <button
          className={`pb-3 font-medium text-sm transition-colors ${activeTab === 'users' ? 'border-b-2 border-primary text-primary' : 'text-stone-500 hover:text-stone-700'}`}
          onClick={() => setActiveTab('users')}
        >
          Pengguna Aktif
        </button>
        <button
          className={`pb-3 font-medium text-sm transition-colors ${activeTab === 'invitations' ? 'border-b-2 border-primary text-primary' : 'text-stone-500 hover:text-stone-700'}`}
          onClick={() => setActiveTab('invitations')}
        >
          Kode Undangan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={20} />
                <span>Tambah Pengguna</span>
              </button>
            </div>

            <div className="bg-card border border-stone-200 rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Nama</th>
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Peran</th>
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-stone-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary font-medium overflow-hidden">
                            {userItem.avatarUrl ? <img src={userItem.avatarUrl} alt="" className="w-full h-full object-cover" /> : (userItem.name || userItem.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-stone-900">{userItem.name || (userItem as any).username || 'Tidak diketahui'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">{userItem.email || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userItem.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-stone-100 text-stone-800'}`}>
                          {userItem.role || 'member'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userItem.status === 'blocked' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {userItem.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        {((userItem as any).username !== (user as any)?.username && userItem.id !== user?.id && userItem.id !== (user as any)?.userId) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-stone-200 rounded text-stone-500">
                                <MoreVertical size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card shadow-xl rounded-xl border border-stone-200 w-40">
                              <DropdownMenuItem className="cursor-pointer" onSelect={() => handleToggleStatus(userItem.id, userItem.status)}>
                                {userItem.status === 'blocked' ? 'Buka Blokir Pengguna' : 'Blokir Pengguna'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onSelect={() => setUserToDelete(userItem.id)}>
                                Hapus Pengguna
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'invitations' && (
          <div>
            <form onSubmit={handleCreateInvitation} className="flex gap-4 mb-6">
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="Kode (mis. TEAM-2026)"
                className="border border-stone-300 px-3 py-2 rounded focus:ring-2 focus:ring-primary outline-none"
                required
              />
              <input
                type="number"
                value={inviteMaxUses}
                onChange={e => setInviteMaxUses(Number(e.target.value))}
                placeholder="Maks Penggunaan"
                className="border border-stone-300 w-24 px-3 py-2 rounded focus:ring-2 focus:ring-primary outline-none"
                required
                min="0"
              />
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors">
                Buat Kode
              </button>
            </form>
            
            <div className="bg-card border border-stone-200 rounded-lg overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {invitations.length === 0 ? (
                  <li className="p-4 text-stone-500 text-center">Belum ada kode undangan.</li>
                ) : (
                  invitations.map(inv => (
                    <li key={inv.id} className="flex items-center justify-between p-4 hover:bg-stone-50">
                      <div>
                        <span className="font-semibold text-stone-800">{inv.code}</span>
                        <span className="text-sm text-stone-500 ml-4">
                          Digunakan: {inv.used_count} / {inv.max_uses === 0 ? 'Tanpa batas' : inv.max_uses}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteInvitation(inv.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Hapus
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      <AddUserModal
        open={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={() => {
          setIsAddUserModalOpen(false);
          loadUsers();
        }}
      />

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Pengguna</DialogTitle>
            <DialogDescription>
              Anda yakin ingin menghapus pengguna ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setUserToDelete(null)}
              className="px-4 py-2 border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50"
            >
              Batal
            </button>
            <button
              onClick={confirmDeleteUser}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Hapus
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

