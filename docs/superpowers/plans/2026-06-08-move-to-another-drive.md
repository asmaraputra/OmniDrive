# Move to Another Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to seamlessly move files between connected Google Drive accounts from the Omnidrive interface.

**Architecture:** We use a synchronous API route (`POST /api/files/:id/move-drive`). The Worker shares the file from the source drive to the target drive, makes a copy within the target drive, trashes the original, and updates the D1 database to point to the new copy. 

**Tech Stack:** Cloudflare Workers, Hono, D1, React, Zustand, Radix UI.

---

### Task 1: Add Google Drive Methods

**Files:**
- Modify: `packages/worker/src/services/google-drive.ts`
- Create: `packages/worker/tests/google-drive-move.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/worker/tests/google-drive-move.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDriveService } from '../src/services/google-drive';

describe('GoogleDriveService - Move Operations', () => {
  let service: GoogleDriveService;
  let mockKV: any;

  beforeEach(() => {
    mockKV = { get: vi.fn().mockResolvedValue(JSON.stringify({ accessToken: 'test-token', expiresAt: Date.now() + 10000 })) };
    service = new GoogleDriveService(mockKV, 'client', 'secret');
    global.fetch = vi.fn();
  });

  it('shareFile should POST to permissions', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'perm123' }) });
    const permId = await service.shareFile('drive1', 'file1', 'target@gmail.com');
    expect(permId).toBe('perm123');
    expect(global.fetch).toHaveBeenCalledWith('https://www.googleapis.com/drive/v3/files/file1/permissions', expect.objectContaining({ method: 'POST' }));
  });

  it('copyFile should POST to copy', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ id: 'newFile' }) });
    const file = await service.copyFile('drive2', 'file1');
    expect(file.id).toBe('newFile');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/files/file1/copy'), expect.objectContaining({ method: 'POST' }));
  });

  it('trashFile should PATCH file', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true });
    await service.trashFile('drive1', 'file1');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/files/file1'), expect.objectContaining({ method: 'PATCH' }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/google-drive-move.test.ts`
Expected: FAIL with "service.shareFile is not a function"

- [ ] **Step 3: Write minimal implementation**

Modify `packages/worker/src/services/google-drive.ts`. Add these methods to the `GoogleDriveService` class:

```typescript
  async shareFile(driveAccountId: string, fileId: string, emailAddress: string): Promise<string> {
    const token = await this.getValidToken(driveAccountId);
    const response = await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'writer', type: 'user', emailAddress }),
    });
    if (!response.ok) throw new Error(`Failed to share file: ${await response.text()}`);
    const data: any = await response.json();
    return data.id;
  }

  async revokeShare(driveAccountId: string, fileId: string, permissionId: string): Promise<void> {
    const token = await this.getValidToken(driveAccountId);
    const response = await fetch(`${DRIVE_API}/files/${fileId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Failed to revoke share: ${await response.text()}`);
  }

  async copyFile(driveAccountId: string, fileId: string): Promise<GDriveFile> {
    const token = await this.getValidToken(driveAccountId);
    const response = await fetch(`${DRIVE_API}/files/${fileId}/copy?fields=id,name,mimeType,size,parents,trashed,thumbnailLink,webViewLink,webContentLink,createdTime,modifiedTime`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!response.ok) throw new Error(`Failed to copy file: ${await response.text()}`);
    return response.json();
  }

  async trashFile(driveAccountId: string, fileId: string): Promise<void> {
    const token = await this.getValidToken(driveAccountId);
    const response = await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
    if (!response.ok) throw new Error(`Failed to trash file: ${await response.text()}`);
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/google-drive-move.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/worker/src/services/google-drive.ts packages/worker/tests/google-drive-move.test.ts
git commit -m "feat: add Drive API methods for sharing, copying, and trashing"
```

### Task 2: Backend Move Route

**Files:**
- Modify: `packages/worker/src/routes/files.ts`

- [ ] **Step 1: Write implementation**

We will write the implementation directly. Add this endpoint to `filesRouter` in `packages/worker/src/routes/files.ts`:

```typescript
// Move file to a different drive account
filesRouter.post('/:id/move-drive', async (c) => {
  const userId = c.get('userId');
  const fileId = c.req.param('id');
  const { targetDriveId } = await c.req.json();
  const db = c.env.DB;

  if (!targetDriveId) throw new AppError(400, 'Target drive is required');

  // 1. Get file and source drive details
  const file = await db.prepare('SELECT f.*, d.google_account_id FROM files f JOIN drive_accounts d ON f.drive_account_id = d.id WHERE f.id = ? AND f.user_id = ?').bind(fileId, userId).first<any>();
  if (!file) throw new AppError(404, 'File not found');

  if (file.drive_account_id === targetDriveId) {
    throw new AppError(400, 'File is already in the target drive');
  }

  // 2. Get target drive email
  const targetDrive = await db.prepare('SELECT email FROM drive_accounts WHERE id = ? AND user_id = ?').bind(targetDriveId, userId).first<any>();
  if (!targetDrive) throw new AppError(404, 'Target drive not found');

  const gDriveService = new GoogleDriveService(c.env.KV, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET);

  // Step A: Share file from source to target
  const permissionId = await gDriveService.shareFile(file.drive_account_id, file.google_file_id, targetDrive.email);

  try {
    // Step B: Copy file in target drive
    const newFile = await gDriveService.copyFile(targetDriveId, file.google_file_id);

    // Step C: Trash original in source drive
    try {
      await gDriveService.trashFile(file.drive_account_id, file.google_file_id);
    } catch (err) {
      console.warn(`Failed to trash original file ${file.google_file_id} after copy:`, err);
    }

    // Step D: Update DB
    await db.prepare('UPDATE files SET drive_account_id = ?, google_file_id = ?, google_parent_id = NULL, synced_at = datetime("now"), updated_at = datetime("now") WHERE id = ?')
      .bind(targetDriveId, newFile.id, fileId).run();

    const updatedFile = await db.prepare('SELECT * FROM files WHERE id = ?').bind(fileId).first<any>();
    return c.json({ file: mapFileRow(updatedFile) });

  } catch (err) {
    // Revoke share on failure to copy
    await gDriveService.revokeShare(file.drive_account_id, file.google_file_id, permissionId).catch(console.error);
    throw new AppError(500, 'Failed to copy file to target drive: ' + (err as Error).message);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/routes/files.ts
git commit -m "feat: add POST /api/files/:id/move-drive endpoint"
```

### Task 3: Frontend API & Store Updates

**Files:**
- Modify: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Write API Client implementation**

Modify `packages/web/src/lib/api.ts`. Add `moveFileToDrive` to the `api` object (under the Files section):

```typescript
  moveFileToDrive: (id: string, targetDriveId: string) =>
    request<{ file: import('../types').FileEntry }>(`/api/files/${id}/move-drive`, {
      method: 'POST',
      body: JSON.stringify({ targetDriveId }),
    }),
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat: add moveFileToDrive to api client"
```

### Task 4: MoveDriveModal Component

**Files:**
- Create: `packages/web/src/components/MoveDriveModal.tsx`

- [ ] **Step 1: Write implementation**

Create `packages/web/src/components/MoveDriveModal.tsx`:

```tsx
import React, { useState } from 'react';
import type { FileEntry } from '../types';
import { useDriveStore } from '../stores/driveStore';
import { api } from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { X, HardDrive, Loader2 } from 'lucide-react';

export interface MoveDriveModalProps {
  file: FileEntry | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const MoveDriveModal: React.FC<MoveDriveModalProps> = ({ file, onClose, onSuccess, onError }) => {
  const drives = useDriveStore(state => state.drives);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!file) return null;

  const targetDrives = drives.filter(d => d.id !== file.driveAccountId);

  const handleMove = async (targetDriveId: string) => {
    setIsSubmitting(true);
    try {
      await api.moveFileToDrive(file.id, targetDriveId);
      onSuccess();
    } catch (err: any) {
      onError(err.message || 'Failed to move file');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Another Drive</DialogTitle>
          <DialogDescription>
            Select a destination drive for "{file.name}". This will physically copy the file between your Google Drive accounts.
          </DialogDescription>
        </DialogHeader>

        {isSubmitting ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Moving file... this may take a moment.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            {targetDrives.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No other drives available.</p>
            ) : (
              targetDrives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => handleMove(drive.id)}
                  className="flex items-center gap-3 p-3 text-left border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <HardDrive className="h-5 w-5 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{drive.email}</span>
                    <span className="text-xs text-gray-500">{drive.name || 'Google Drive'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/MoveDriveModal.tsx
git commit -m "feat: create MoveDriveModal component"
```

### Task 5: Connect MoveDriveModal to FileGrid

**Files:**
- Modify: `packages/web/src/components/files/FileGrid.tsx`

- [ ] **Step 1: Write implementation**

Modify `packages/web/src/components/files/FileGrid.tsx`. Add `onMoveDrive` to `FileGridProps`:

```typescript
// Replace lines ~22-26 (in FileGridProps)
  onPreviewFile?: (file: FileEntry) => void;
  onShare?: (id: string, type: 'file' | 'folder') => void;
  onRenameFile?: (id: string, name: string) => void;
  onDeleteFile?: (id: string) => void;
  onMoveDrive?: (file: FileEntry) => void;
  isTargetShared?: (id: string, type: 'file' | 'folder') => boolean;
```

Update the component signature to extract `onMoveDrive`:

```typescript
// Replace lines ~36-39
  onPreviewFile,
  onShare,
  onRenameFile,
  onDeleteFile,
  onMoveDrive,
  isTargetShared,
```

Add the context menu item inside the file's `<ContextMenuContent>` (around line ~145):

```tsx
              {onMoveDrive && (
                <ContextMenuItem onClick={() => onMoveDrive(file)}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Move to another drive
                </ContextMenuItem>
              )}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/files/FileGrid.tsx
git commit -m "feat: add Move to another drive option to file context menu"
```

### Task 6: Wire up in Pages

**Files:**
- Modify: `packages/web/src/pages/FilesPage.tsx`
- Modify: `packages/web/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Implement in FilesPage**

Modify `packages/web/src/pages/FilesPage.tsx`:

Import the modal:
```tsx
import { MoveDriveModal } from '../components/MoveDriveModal';
```

Add state (near other states like `shareTarget` around line 28):
```tsx
  const [moveFileTarget, setMoveFileTarget] = useState<FileEntry | null>(null);
```

Pass it to `<FileGrid>`:
```tsx
// Inside <FileGrid> props
  onMoveDrive={setMoveFileTarget}
```

Add the modal at the bottom of the component, just above the closing `</div>` or alongside other modals:
```tsx
      <MoveDriveModal 
        file={moveFileTarget}
        onClose={() => setMoveFileTarget(null)}
        onSuccess={() => {
          setMoveFileTarget(null);
          refresh();
          addToast('success', 'File moved successfully');
        }}
        onError={(msg) => addToast('error', msg)}
      />
```

- [ ] **Step 2: Implement in DashboardPage**

Modify `packages/web/src/pages/DashboardPage.tsx` identically:

Import the modal:
```tsx
import { MoveDriveModal } from '../components/MoveDriveModal';
```

Add state:
```tsx
  const [moveFileTarget, setMoveFileTarget] = useState<FileEntry | null>(null);
```

Pass it to `<FileGrid>`:
```tsx
  onMoveDrive={setMoveFileTarget}
```

Add the modal at the bottom:
```tsx
      <MoveDriveModal 
        file={moveFileTarget}
        onClose={() => setMoveFileTarget(null)}
        onSuccess={() => {
          setMoveFileTarget(null);
          refresh();
          addToast('success', 'File moved successfully');
        }}
        onError={(msg) => addToast('error', msg)}
      />
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/pages/FilesPage.tsx packages/web/src/pages/DashboardPage.tsx
git commit -m "feat: integrate MoveDriveModal in pages"
```
