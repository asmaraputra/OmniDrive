# Virtual Folders (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Core Organization and UI for Virtual Folders allowing nested structures and cross-drive file mapping with a dedicated UI.

**Architecture:** Local Database First with manual sync. Endpoints added to `foldersRouter` to fetch the tree, update metadata, map files, and trigger background sync. Frontend gets a dedicated Split-pane page, Sidebar Tree-View, and modal pickers.

**Tech Stack:** React, TypeScript, Hono (Cloudflare Workers), SQLite (D1), TailwindCSS, Lucide Icons.

---

### Task 1: Backend - Folder Tree & Update Endpoints

**Files:**
- Modify: `packages/worker/src/routes/folders.ts`

- [ ] **Step 1: Add GET /tree and PUT /:id endpoints**

Modify `packages/worker/src/routes/folders.ts`. Insert the new `GET /tree` route BEFORE `foldersRouter.get('/:id?', ...)` to prevent path conflict. Insert `PUT /:id` after `POST /`.

```typescript
// Insert before GET /:id?
foldersRouter.get('/tree', async (c) => {
  const userId = c.get('userId');
  const { results } = await c.env.DB.prepare('SELECT * FROM virtual_folders WHERE user_id = ? ORDER BY name ASC').bind(userId).all();
  return c.json({ folders: results.map(mapFolderRow) });
});

// ... existing GET /:id? ...
// ... existing POST / ...

// Insert after POST /
foldersRouter.put('/:id', async (c) => {
  const userId = c.get('userId');
  const folderId = c.req.param('id');
  const body = await c.req.json();
  const { name, parentId, icon, color } = body;
  
  const { meta } = await c.env.DB.prepare(
    'UPDATE virtual_folders SET name = coalesce(?, name), parent_id = ?, icon = coalesce(?, icon), color = coalesce(?, color), updated_at = datetime("now") WHERE id = ? AND user_id = ?'
  ).bind(name ?? null, parentId !== undefined ? parentId : null, icon ?? null, color ?? null, folderId, userId).run();
  
  if (meta.changes === 0) throw new AppError(404, 'Folder not found');
  return c.json({ success: true });
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/worker/src/routes/folders.ts
git commit -m "feat(backend): add virtual folder tree and update endpoints"
```

### Task 2: Backend - File Management Endpoints

**Files:**
- Modify: `packages/worker/src/routes/folders.ts`

- [ ] **Step 1: Import GoogleDriveService and syncDriveAccount**

At the top of `packages/worker/src/routes/folders.ts`:
```typescript
import { syncDriveAccount } from '../services/sync';
import { GoogleDriveService } from '../services/google-drive';
import { mapDriveRow } from '../types/index';
```

- [ ] **Step 2: Add POST /:id/files and POST /:id/sync**

Add these after the `DELETE /:id` endpoint:
```typescript
foldersRouter.post('/:id/files', async (c) => {
  const userId = c.get('userId');
  const folderId = c.req.param('id');
  const { fileIds } = await c.req.json<{ fileIds: string[] }>();
  
  if (!fileIds || fileIds.length === 0) return c.json({ success: true });
  
  const placeholders = fileIds.map(() => '?').join(',');
  const query = `UPDATE files SET virtual_folder_id = ?, updated_at = datetime('now') WHERE user_id = ? AND id IN (${placeholders})`;
  await c.env.DB.prepare(query).bind(folderId, userId, ...fileIds).run();
  
  return c.json({ success: true });
});

foldersRouter.post('/:id/sync', async (c) => {
  const userId = c.get('userId');
  const folderId = c.req.param('id');
  const db = c.env.DB;
  
  const { results } = await db.prepare(`
    SELECT DISTINCT d.* 
    FROM files f 
    JOIN drive_accounts d ON f.drive_account_id = d.id 
    WHERE f.virtual_folder_id = ? AND f.user_id = ?
  `).bind(folderId, userId).all();
  
  if (results && results.length > 0) {
    const driveService = new GoogleDriveService(c.env.KV, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET);
    for (const row of results) {
       const drive = mapDriveRow(row);
       c.executionCtx.waitUntil(syncDriveAccount(drive, db, c.env.KV, driveService).catch(console.error));
    }
  }
  
  return c.json({ success: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add packages/worker/src/routes/folders.ts
git commit -m "feat(backend): add virtual folder file map and sync endpoints"
```

### Task 3: Frontend - API Client Additions

**Files:**
- Modify: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Add Virtual Folder methods**

In `packages/web/src/lib/api.ts`, add these methods to the `api` object (around line 68, near `deleteFolder`):

```typescript
  getVirtualFolderTree: () => request<{ folders: import('../types').VirtualFolder[] }>('/api/folders/tree'),
  updateVirtualFolder: (id: string, data: { name?: string; parentId?: string | null; icon?: string; color?: string }) =>
    request<{ success: boolean }>(`/api/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  addFilesToVirtualFolder: (id: string, fileIds: string[]) =>
    request<{ success: boolean }>(`/api/folders/${id}/files`, {
      method: 'POST',
      body: JSON.stringify({ fileIds }),
    }),
  syncVirtualFolder: (id: string) =>
    request<{ success: boolean }>(`/api/folders/${id}/sync`, { method: 'POST' }),
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(frontend): add api client methods for virtual folders"
```

### Task 4: Virtual Folders Tree Components

**Files:**
- Create: `packages/web/src/components/virtual-folders/VirtualFolderSidebar.tsx`

- [ ] **Step 1: Create VirtualFolderSidebar**

Create `packages/web/src/components/virtual-folders/VirtualFolderSidebar.tsx`:

```tsx
import { Folder } from 'lucide-react';
import type { VirtualFolder } from '../../types';

interface VirtualFolderSidebarProps {
  folders: VirtualFolder[];
  activeFolderId: string | null;
  onSelect: (id: string) => void;
}

export function VirtualFolderSidebar({ folders, activeFolderId, onSelect }: VirtualFolderSidebarProps) {
  const rootFolders = folders.filter(f => !f.parentId);

  const renderTree = (folderList: VirtualFolder[], level: number = 0) => {
    return folderList.map(folder => {
      const children = folders.filter(f => f.parentId === folder.id);
      const isActive = activeFolderId === folder.id;
      return (
        <div key={folder.id} className="flex flex-col">
          <button
            onClick={() => onSelect(folder.id)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-100 rounded-md mx-2 ${isActive ? 'bg-[#c2e7ff] text-gray-900 font-medium' : 'text-gray-700'}`}
            style={{ paddingLeft: \`\${level * 1rem + 0.75rem}\` }}
          >
            {folder.icon ? <span>{folder.icon}</span> : <Folder size={16} className="text-gray-400" />}
            <span className="truncate">{folder.name}</span>
          </button>
          {children.length > 0 && renderTree(children, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-full overflow-y-auto py-4">
      <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Virtual Folders</h3>
      <div className="flex-1">
        {rootFolders.length === 0 ? (
          <p className="px-4 text-sm text-gray-500 italic">No virtual folders yet.</p>
        ) : (
          renderTree(rootFolders)
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/virtual-folders/VirtualFolderSidebar.tsx
git commit -m "feat(frontend): add VirtualFolderSidebar component"
```

### Task 5: Virtual Folders Main Page & Routing

**Files:**
- Create: `packages/web/src/pages/VirtualFoldersPage.tsx`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/components/Sidebar.tsx`

- [ ] **Step 1: Create VirtualFoldersPage**

Create `packages/web/src/pages/VirtualFoldersPage.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { VirtualFolder, FileEntry } from '../types';
import { VirtualFolderSidebar } from '../components/virtual-folders/VirtualFolderSidebar';
import { FileGrid } from '../components/files/FileGrid';
import { useToastStore } from '../stores/toastStore';
import { FolderPlus, RefreshCw, Plus } from 'lucide-react';

export function VirtualFoldersPage() {
  const [folders, setFolders] = useState<VirtualFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [subfolders, setSubfolders] = useState<VirtualFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const fetchTree = async () => {
    try {
      const res = await api.getVirtualFolderTree();
      setFolders(res.folders);
    } catch {
      addToast('error', 'Failed to load virtual folders');
    }
  };

  const fetchContents = async (folderId: string) => {
    setIsLoading(true);
    try {
      const res = await api.getFolderContents(folderId);
      setFiles(res.files);
      setSubfolders(res.subfolders);
    } catch {
      addToast('error', 'Failed to load folder contents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  useEffect(() => {
    if (activeFolderId) {
      fetchContents(activeFolderId);
    } else {
      setFiles([]);
      setSubfolders([]);
    }
  }, [activeFolderId]);

  const handleCreateFolder = async () => {
    const name = prompt('New virtual folder name:');
    if (name?.trim()) {
      try {
        await api.createFolder(name.trim(), activeFolderId || undefined);
        fetchTree();
      } catch {
        addToast('error', 'Failed to create virtual folder');
      }
    }
  };

  const handleSync = async () => {
    if (!activeFolderId) return;
    setIsSyncing(true);
    try {
      await api.syncVirtualFolder(activeFolderId);
      addToast('success', 'Sync started. Give it a moment to complete.');
      // Wait a bit then refresh
      setTimeout(() => fetchContents(activeFolderId), 2000);
    } catch {
      addToast('error', 'Failed to start sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveFile = async (id: string) => {
    try {
      await api.moveFile(id, null);
      addToast('success', 'Removed from virtual folder');
      if (activeFolderId) fetchContents(activeFolderId);
    } catch {
      addToast('error', 'Failed to remove file');
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <VirtualFolderSidebar folders={folders} activeFolderId={activeFolderId} onSelect={setActiveFolderId} />
      
      <div className="flex-1 flex flex-col h-full bg-gray-50 border-l border-gray-200">
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">
            {activeFolderId ? folders.find(f => f.id === activeFolderId)?.name : 'Select a Virtual Folder'}
          </h2>
          <div className="flex gap-2">
            <button onClick={handleCreateFolder} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <FolderPlus size={16} /> New Folder
            </button>
            {activeFolderId && (
              <>
                <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Sync
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : activeFolderId ? (
            <FileGrid
              files={files}
              subfolders={subfolders}
              getDriveInfo={() => ({ drive: null, index: 0 })}
              onNavigateFolder={setActiveFolderId}
              onPreviewFile={() => {}}
              onShare={() => {}}
              onRenameFile={() => {}}
              onDeleteFile={handleRemoveFile}
              onMoveDrive={() => {}}
              isTargetShared={() => false}
              errorDrives={new Set()}
            />
          ) : (
            <div className="text-center p-12 text-gray-500">
              Select or create a Virtual Folder to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

Modify `packages/web/src/App.tsx`. Import `VirtualFoldersPage`:
```tsx
import { VirtualFoldersPage } from './pages/VirtualFoldersPage';
```
Add route inside the Layout `<Routes>`:
```tsx
<Route path="/virtual-folders" element={<VirtualFoldersPage />} />
```

- [ ] **Step 3: Add to Sidebar.tsx**

Modify `packages/web/src/components/Sidebar.tsx`. Add import `FolderTree` from `lucide-react`.
Add the link above the Trash link:
```tsx
<NavLink
  to="/virtual-folders"
  className={({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 mt-2 rounded-full font-medium transition-colors ${
      isActive ? 'bg-[#c2e7ff] text-gray-900' : 'text-gray-700 hover:bg-gray-100'
    }`
  }
>
  <FolderTree size={20} />
  <span>Virtual Folders</span>
</NavLink>
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/pages/VirtualFoldersPage.tsx packages/web/src/App.tsx packages/web/src/components/Sidebar.tsx
git commit -m "feat(frontend): add VirtualFoldersPage and routing"
```

### Task 6: Add to Virtual Folder Context Menu & Modal

**Files:**
- Create: `packages/web/src/components/virtual-folders/AddToVirtualFolderModal.tsx`
- Modify: `packages/web/src/components/files/FileGrid.tsx`
- Modify: `packages/web/src/pages/FilesPage.tsx`

- [ ] **Step 1: Create AddToVirtualFolderModal**

Create `packages/web/src/components/virtual-folders/AddToVirtualFolderModal.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { VirtualFolder, FileEntry } from '../../types';
import { X, Folder } from 'lucide-react';

interface Props {
  file: FileEntry;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToVirtualFolderModal({ file, onClose, onSuccess }: Props) {
  const [folders, setFolders] = useState<VirtualFolder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.getVirtualFolderTree().then(res => setFolders(res.folders));
  }, []);

  const handleAdd = async () => {
    if (!selectedId) return;
    try {
      await api.addFilesToVirtualFolder(selectedId, [file.id]);
      onSuccess();
    } catch {
      // Error handled by parent
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Add to Virtual Folder</h2>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setSelectedId(folder.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left ${selectedId === folder.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
            >
              <Folder size={16} className="text-blue-500" />
              {folder.name}
            </button>
          ))}
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={handleAdd} disabled={!selectedId} className="px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Add</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update FileGrid.tsx props and Context Menu**

Modify `packages/web/src/components/files/FileGrid.tsx`:
Add to `FileGridProps`:
```typescript
  onAddToVirtualFolder?: (file: FileEntry) => void;
```
In `ItemContextMenuContent` for **Files** (around line 291/422), add the new menu item BEFORE the Share separator:
```tsx
{onAddToVirtualFolder && (
  <ContextMenuItem onClick={() => onAddToVirtualFolder(file as FileEntry)}>
    <span className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100">
      Add to Virtual Folder
    </span>
  </ContextMenuItem>
)}
```
Make sure to pass `onAddToVirtualFolder` from `FileGrid` to `ItemContextMenuContent` calls.

- [ ] **Step 3: Update FilesPage.tsx**

Modify `packages/web/src/pages/FilesPage.tsx`:
Import `AddToVirtualFolderModal`:
```typescript
import { AddToVirtualFolderModal } from '../components/virtual-folders/AddToVirtualFolderModal';
```
Add state:
```typescript
const [virtualFolderTarget, setVirtualFolderTarget] = useState<FileEntry | null>(null);
```
Pass `onAddToVirtualFolder={setVirtualFolderTarget}` to `<FileGrid ... />`.
Add Modal to render output:
```tsx
{virtualFolderTarget && (
  <AddToVirtualFolderModal
    file={virtualFolderTarget}
    onClose={() => setVirtualFolderTarget(null)}
    onSuccess={() => {
      setVirtualFolderTarget(null);
      addToast('success', 'Added to virtual folder');
      refresh();
    }}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/virtual-folders/AddToVirtualFolderModal.tsx packages/web/src/components/files/FileGrid.tsx packages/web/src/pages/FilesPage.tsx
git commit -m "feat(frontend): add context menu to add files to virtual folder"
```
