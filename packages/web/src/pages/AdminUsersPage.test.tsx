// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AdminUsersPage } from './AdminUsersPage';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock API
vi.mock('../lib/api', () => ({
  api: {
    getAdminUsers: vi.fn(),
    adminCreateUser: vi.fn(),
    getInvitations: vi.fn(),
    createInvitation: vi.fn(),
    deleteInvitation: vi.fn(),
  }
}));

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  ShieldAlert: () => <div data-testid="shield-alert-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  MoreVertical: () => <div data-testid="more-vertical-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

vi.mock('../components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, onSelect }: any) => (
    <button data-testid="dropdown-item" onClick={onClick || onSelect}>{children}</button>
  ),
}));

vi.mock('../components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getAdminUsers as Mock).mockResolvedValue({ users: [] });
    (api.getInvitations as Mock).mockResolvedValue({ invitations: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders access denied for non-admin users', () => {
    (useAuthStore as unknown as Mock).mockReturnValue({
      user: { id: 'user1', role: 'member' },
    });

    render(<AdminUsersPage />);

    expect(screen.getByText('Akses Ditolak')).toBeTruthy();
    expect(screen.getByText('Anda tidak memiliki izin untuk melihat halaman ini.')).toBeTruthy();
  });

  it('renders the user management page for admin users', async () => {
    (useAuthStore as unknown as Mock).mockReturnValue({
      user: { id: 'admin1', role: 'super_admin' },
    });

    render(<AdminUsersPage />);

    expect(await screen.findByText('Pengguna')).toBeTruthy();
    expect(screen.getByRole('button', { name: /tambah pengguna/i })).toBeTruthy();
    expect(api.getAdminUsers).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the add user modal', async () => {
    (useAuthStore as unknown as Mock).mockReturnValue({
      user: { id: 'admin1', role: 'super_admin' },
    });

    render(<AdminUsersPage />);

    // Open modal
    const addBtn = await screen.findByRole('button', { name: /tambah pengguna/i });
    fireEvent.click(addBtn);

    // Modal title renders — text appears in both DialogTitle and trigger button
    expect(screen.getAllByText('Tambah Pengguna').length).toBeGreaterThanOrEqual(2);

    // Close modal
    fireEvent.click(screen.getByText('Batal'));

    await waitFor(() => {
      // After closing, only the trigger button text remains
      expect(screen.getAllByText('Tambah Pengguna').length).toBe(1);
    });
  });

  it('toggles tabs and loads invitations', async () => {
    (useAuthStore as unknown as Mock).mockReturnValue({
      user: { id: 'admin1', role: 'super_admin' },
    });

    render(<AdminUsersPage />);

    expect(api.getAdminUsers).toHaveBeenCalledTimes(1);

    const invTab = await screen.findByText('Kode Undangan');
    fireEvent.click(invTab);

    expect(api.getInvitations).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Buat Kode')).toBeTruthy();
  });
});
