# Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a scrollable breadcrumb navigation for Google Drive folders, replacing the static back button.

**Architecture:** We will add a `buildDriveBreadcrumb` helper in the backend to fetch the folder hierarchy recursively from the database. The frontend will consume this array and render a horizontally scrollable `<Breadcrumb>` component instead of the static title and back button.

**Tech Stack:** TypeScript, SQLite (D1), React, Vite

---

### Task 1: Update Shared Types and Hook

**Files:**
- Modify: `packages/web/src/types/index.ts`
- Modify: `packages/web/src/hooks/useMergedDrive.ts`

- [ ] **Step 1: Add breadcrumb to type**

Update `packages/web/src/types/index.ts` to add `breadcrumb: BreadcrumbItem[];` to `DriveFolderContents`. Modify lines ~90-94.

```typescript
export interface DriveFolderContents {
  folder: DriveFolder | null;
  subfolders: DriveFolder[];
  files: FileEntry[];
  breadcrumb: BreadcrumbItem[];
}
```

- [ ] **Step 2: Expose breadcrumb from Hook**

In `packages/web/src/hooks/useMergedDrive.ts`, add the `breadcrumb` state and extract it from the API responses.

Add state at line ~13:
```typescript
  const [breadcrumb, setBreadcrumb] = useState<import('../types').BreadcrumbItem[]>([]);
```

Clear it before fetching at line ~26:
```typescript
    setBreadcrumb([]);
```

For the root case (line ~43), set a default breadcrumb:
```typescript
        setBreadcrumb([{ id: 'root', name: 'All Files' }]);
```

For the specific folder case (line ~57), extract it from `data`:
```typescript
        setSubfolders(data.subfolders);
        setFiles(data.files);
        setBreadcrumb(data.breadcrumb || [{ id: 'root', name: 'All Files' }]);
```

And finally, return it at line ~77:
```typescript
  return { subfolders, files, breadcrumb, isLoading, errorDrives, refresh: () => fetchContents() };
```

- [ ] **Step 3: Verify Types Compile**

Run: `cd packages/web && npm run build`
Expected: Passes without type errors in `useMergedDrive.ts`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/types/index.ts packages/web/src/hooks/useMergedDrive.ts
git commit -m "feat: add breadcrumb type and hook state"
```

---

### Task 2: Backend Logic (Recursive API)

**Files:**
- Create: `packages/worker/tests/breadcrumb.test.ts`
- Modify: `packages/worker/src/routes/drives.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/worker/tests/breadcrumb.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildDriveBreadcrumb } from '../src/routes/drives';

describe('buildDriveBreadcrumb', () => {
  it('returns [All Files] when googleFolderId is root', async () => {
    const mockDb = {
      prepare: () => ({ bind: () => ({ all: () => Promise.resolve({ results: [] }) }) })
    };
    const result = await buildDriveBreadcrumb(mockDb as any, 'driveId', 'root');
    expect(result).toEqual([{ id: 'root', name: 'All Files' }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/worker && npx vitest run tests/breadcrumb.test.ts`
Expected: FAIL with "buildDriveBreadcrumb is not a function"

- [ ] **Step 3: Write minimal implementation**

In `packages/worker/src/routes/drives.ts`, add the exported helper function below the imports (around line 10):

```typescript
import type { BreadcrumbItem } from '../types';

export async function buildDriveBreadcrumb(db: any, driveId: string, googleFolderId: string): Promise<BreadcrumbItem[]> {
  const path: BreadcrumbItem[] = [];
  
  if (googleFolderId && googleFolderId !== 'root') {
    const query = `
      WITH RECURSIVE breadcrumb_path(id, google_parent_id, name, lvl) AS (
        SELECT google_folder_id, google_parent_id, name, 0 as lvl 
        FROM drive_folders 
        WHERE drive_account_id = ? AND google_folder_id = ?
        UNION ALL
        SELECT d.google_folder_id, d.google_parent_id, d.name, bp.lvl + 1 
        FROM drive_folders d
        JOIN breadcrumb_path bp ON d.google_folder_id = bp.google_parent_id
        WHERE d.drive_account_id = ?
      )
      SELECT id, name FROM breadcrumb_path ORDER BY lvl DESC
    `;
    const { results } = await db.prepare(query).bind(driveId, googleFolderId, driveId).all();
    for (const row of results) {
      path.push({ id: row.id as string, name: row.name as string });
    }
  }
  
  path.unshift({ id: 'root', name: 'All Files' });
  return path;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/worker && npx vitest run tests/breadcrumb.test.ts`
Expected: PASS

- [ ] **Step 5: Integrate helper into API endpoints**

In `packages/worker/src/routes/drives.ts`, inside `drivesRouter.get('/:driveId/folders/:googleFolderId')`, right before the `return c.json({`:

```typescript
  const breadcrumb = await buildDriveBreadcrumb(c.env.DB, driveId, googleFolderId);
```
And add `breadcrumb,` to the returned JSON object.

Inside `drivesRouter.post('/:driveId/folders/:googleFolderId/sync')`, there are two places that return JSON. Add the same breadcrumb calculation before BOTH returns, and include `breadcrumb` in the response payloads.

- [ ] **Step 6: Commit**

```bash
git add packages/worker/src/routes/drives.ts packages/worker/tests/breadcrumb.test.ts
git commit -m "feat: implement recursive breadcrumb fetching in worker"
```

---

### Task 3: UI Components Integration

**Files:**
- Modify: `packages/web/src/components/Breadcrumb.tsx`
- Modify: `packages/web/src/pages/FilesPage.tsx`

- [ ] **Step 1: Enhance Breadcrumb Component**

Modify `packages/web/src/components/Breadcrumb.tsx` to support horizontal scrolling and optional `driveId`:

```tsx
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { BreadcrumbItem } from '../types';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  driveId?: string;
}

export function Breadcrumb({ items, driveId }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Folder navigation">
      {items.map((item, i) => {
        let linkTo = item.id === 'root' ? '/files' : `/files/${item.id}`;
        if (driveId && item.id !== 'root') {
          linkTo += `?driveId=${driveId}`;
        }

        return (
          <span key={item.id ?? `fallback-${i}`} className="breadcrumb-item">
            {i > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
            {i < items.length - 1 ? (
              <Link to={linkTo} className="breadcrumb-link">
                {item.name}
              </Link>
            ) : (
              <span className="breadcrumb-current">{item.name}</span>
            )}
          </span>
        );
      })}

      <style>{`
        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: nowrap;
          gap: 2px;
          font-size: var(--font-size-sm);
          overflow-x: auto;
          white-space: nowrap;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .breadcrumb::-webkit-scrollbar {
          display: none;
        }
        .breadcrumb-item { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
        .breadcrumb-separator { color: var(--text-tertiary); }
        .breadcrumb-link { color: var(--text-secondary); text-decoration: none; }
        .breadcrumb-link:hover { color: var(--text-primary); text-decoration: underline; }
        .breadcrumb-current { color: var(--text-primary); font-weight: 500; }
      `}</style>
    </nav>
  );
}
```

- [ ] **Step 2: Update FilesPage**

In `packages/web/src/pages/FilesPage.tsx`, import the component:
```tsx
import { Breadcrumb } from '../components/Breadcrumb';
```

Extract `breadcrumb` from `useMergedDrive`:
```typescript
  const { subfolders, files, breadcrumb, isLoading, errorDrives, refresh } = useMergedDrive(folderId, driveIdParam);
```

Remove the static toolbar header:
```tsx
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {!isRoot && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginRight: 'var(--space-xs)' }}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
            {isRoot ? 'All Files' : 'Folder'}
          </h2>
        </div>
```
And replace it with:
```tsx
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Breadcrumb items={breadcrumb} driveId={driveIdParam || undefined} />
        </div>
```

- [ ] **Step 3: Run build to verify**

Run: `cd packages/web && npm run build`
Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/Breadcrumb.tsx packages/web/src/pages/FilesPage.tsx
git commit -m "feat: integrate scrollable breadcrumbs into FilesPage"
```
