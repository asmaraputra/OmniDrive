# Starred Files Implementation Plan

### Task 1: Database and Backend API

**Files:**
- Modify: `packages/worker/src/db/schema.sql`
- Modify: `packages/worker/src/routes/files.ts`
- Modify: `packages/worker/src/routes/folders.ts`
- Create: `packages/worker/tests/starred.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/worker/tests/starred.test.ts
import { describe, it, expect } from 'vitest';
import { filesRouter } from '../src/routes/files';
import { foldersRouter } from '../src/routes/folders';

describe('Starred Endpoints', () => {
  it('registers starred endpoints for files', () => {
    const routes = filesRouter.routes.map(r => `${r.method} ${r.path}`);
    expect(routes).toContain('GET /starred');
    expect(routes).toContain('POST /:id/star');
    expect(routes).toContain('POST /:id/unstar');
  });

  it('registers starred endpoints for folders', () => {
    const routes = foldersRouter.routes.map(r => `${r.method} ${r.path}`);
    expect(routes).toContain('POST /:id/star');
    expect(routes).toContain('POST /:id/unstar');
  });
});
```

- [ ] **Step 2: Update Schema**
Modify `packages/worker/src/db/schema.sql`: Add `is_starred INTEGER NOT NULL DEFAULT 0` to `files` and `virtual_folders` tables. 

- [ ] **Step 3: Write Backend Implementation**

Add to `packages/worker/src/routes/files.ts`:
- `GET /starred`: `SELECT f.*, d.email as driveEmail FROM files f JOIN drive_accounts d ON f.drive_account_id = d.id WHERE f.user_id = ? AND f.is_starred = 1 AND f.is_trashed = 0` (and fetch folders where `is_starred = 1`). Wait, just fetching files is fine, but to be complete, maybe `api/files/starred` can just return files, and we can fetch folders separately or together. Actually, just returning files for now is simpler and matches trash. Let's do files and folders.
Actually, the Trash plan only did files. Let's just do files and virtual_folders.
Let's make `GET /starred` in `filesRouter` return both files and folders, like:
```typescript
filesRouter.get('/starred', async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;
  const filesQuery = await db.prepare(`SELECT f.*, d.email as driveEmail FROM files f JOIN drive_accounts d ON f.drive_account_id = d.id WHERE f.user_id = ? AND f.is_starred = 1 AND f.is_trashed = 0 ORDER BY f.updated_at DESC`).bind(userId).all();
  const foldersQuery = await db.prepare(`SELECT * FROM virtual_folders WHERE user_id = ? AND is_starred = 1 ORDER BY updated_at DESC`).bind(userId).all();
  return c.json({
    files: filesQuery.results.map((r: any) => ({ ...mapFileRow(r), driveEmail: r.driveEmail })),
    folders: foldersQuery.results.map((r: any) => ({
      id: r.id, name: r.name, parentId: r.parent_id, createdAt: r.created_at, updatedAt: r.updated_at, isStarred: true
    }))
  });
});
```
Add `POST /:id/star` and `POST /:id/unstar` in `filesRouter` setting `is_starred = 1` or `0`.
Add `POST /:id/star` and `POST /:id/unstar` in `foldersRouter` setting `is_starred = 1` or `0`.

- [ ] **Step 4: Verify Tests & Commit**
Commit with `feat: add backend starred apis and schema`.

### Task 2: Frontend API Client

**Files:**
- Modify: `packages/web/src/lib/api.ts`
- Modify: `packages/web/src/types/index.ts`

- [ ] **Step 1: Update Types**
In `packages/web/src/types/index.ts`, add `isStarred?: boolean;` to `FileEntry` and `VirtualFolder`.

- [ ] **Step 2: Add API methods**
Add to `api.ts`:
```typescript
  getStarred: () => request<{ files: FileEntry[], folders: VirtualFolder[] }>('/api/files/starred'),
  starFile: (id: string) => request<{ success: boolean }>(`/api/files/${id}/star`, { method: 'POST' }),
  unstarFile: (id: string) => request<{ success: boolean }>(`/api/files/${id}/unstar`, { method: 'POST' }),
  starFolder: (id: string) => request<{ success: boolean }>(`/api/folders/${id}/star`, { method: 'POST' }),
  unstarFolder: (id: string) => request<{ success: boolean }>(`/api/folders/${id}/unstar`, { method: 'POST' }),
```

- [ ] **Step 3: Commit**
`feat: add frontend api client methods for starred`

### Task 3: Update UI (FileGrid)

**Files:**
- Modify: `packages/web/src/components/files/FileGrid.tsx`

- [ ] **Step 1: Update Context Menu**
In `FileGridProps`, add `onToggleStar?: (id: string, type: 'file' | 'folder', currentStarStatus: boolean) => void;`.
In `ItemContextMenuContent`, add a Star/Unstar button (using `Star` icon from `lucide-react`) if `onToggleStar` is provided. If `isStarred` is true, show "Remove from Starred", else "Add to Starred". Pass `isStarred` to `ItemContextMenuContent`.

- [ ] **Step 2: Show Star Icon**
In the list and grid views, if a file or folder is starred (`isStarred === true`), display a small yellow star icon `⭐` or `<Star className="fill-yellow-400 text-yellow-400" size={14} />` next to its name.

- [ ] **Step 3: Commit**
`feat: add star ui to filegrid`

### Task 4: Add Starred Page & Routes

**Files:**
- Create: `packages/web/src/pages/StarredPage.tsx`
- Modify: `packages/web/src/App.tsx`
- Modify: `packages/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Create StarredPage**
Create `StarredPage.tsx` similar to `TrashPage.tsx` but fetching `api.getStarred()`. Define `handleToggleStar` that calls `api.starFile` / `unstarFile` based on current status and type, then refreshes the list. Pass `onToggleStar` to `FileGrid`.

- [ ] **Step 2: Add Route and Navigation**
Update `App.tsx` with `<Route path="/starred" element={<StarredPage />} />`.
Update `Sidebar.tsx` to link to `/starred`.

- [ ] **Step 3: Commit**
`feat: add starred page and navigation`
