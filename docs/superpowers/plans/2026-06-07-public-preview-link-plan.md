# Public Preview Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a feature allowing users to create, manage, and access public, optionally password-protected and expiring links for files and folders.

**Architecture:** A new `shared_links` table stores the link metadata. The Hono worker provides CRUD endpoints and a public access endpoint with password verification. The React web app provides a share modal and a public `/shared/:id` route for previewing/downloading.

**Tech Stack:** Cloudflare Workers, Hono, D1 (SQLite), React, Vite, TypeScript.

---

### Task 1: Update Database Schema

**Files:**
- Modify: `packages/worker/src/db/schema.sql`
- Modify: `packages/worker/src/types/index.ts`

- [ ] **Step 1: Add table to schema.sql**
```sql
CREATE TABLE IF NOT EXISTS shared_links (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type     TEXT NOT NULL,
    target_id       TEXT NOT NULL,
    password_hash   TEXT,
    expires_at      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```
Append this to the bottom of the file (around line 95).

- [ ] **Step 2: Add SharedLink type to index.ts**
```typescript
export interface SharedLink {
  id: string;
  userId: string;
  targetType: 'file' | 'folder';
  targetId: string;
  passwordHash: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function mapSharedLinkRow(row: Record<string, unknown>): SharedLink {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    targetType: row.target_type as 'file' | 'folder',
    targetId: row.target_id as string,
    passwordHash: (row.password_hash as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
```
Add these into `packages/worker/src/types/index.ts` alongside existing models and mappers.

- [ ] **Step 3: Commit**
```bash
rtk git add packages/worker/src/db/schema.sql packages/worker/src/types/index.ts
rtk git commit -m "feat(db): add shared_links schema and types"
```

### Task 2: Implement Worker Endpoints - Management

**Files:**
- Create: `packages/worker/src/routes/shared.ts`
- Modify: `packages/worker/src/index.ts`

- [ ] **Step 1: Create shared.ts with Management routes**
```typescript
import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import type { AppContext } from '../types/env';
import { authGuard } from '../middleware/auth-guard';
import { mapSharedLinkRow } from '../types';
import { generateId } from '../lib/id';

export const sharedRouter = new Hono<AppContext>({ strict: false });

// ─── Management Endpoints (Require Auth) ───

sharedRouter.post('/', authGuard, async (c) => {
  const userId = c.get('userId');
  const { targetType, targetId, password, expiresAt } = await c.req.json();
  const db = c.env.DB;
  
  const id = generateId().slice(0, 8); // Short slug
  let passwordHash = null;
  
  if (password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  await db.prepare(
    'INSERT INTO shared_links (id, user_id, target_type, target_id, password_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
  .bind(id, userId, targetType, targetId, passwordHash, expiresAt || null)
  .run();

  return c.json({ id, url: `${new URL(c.req.url).origin}/shared/${id}` });
});

sharedRouter.get('/', authGuard, async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;
  
  const { results } = await db.prepare('SELECT * FROM shared_links WHERE user_id = ?').bind(userId).all();
  return c.json({ links: results.map(mapSharedLinkRow) });
});

sharedRouter.delete('/:id', authGuard, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  
  await c.env.DB.prepare('DELETE FROM shared_links WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return c.json({ success: true });
});
```

- [ ] **Step 2: Mount sharedRouter in index.ts**
```typescript
import { sharedRouter } from './routes/shared';

// Under app.route('/api/files', filesRouter);
app.route('/api/shared', sharedRouter);
```

- [ ] **Step 3: Commit**
```bash
rtk git add packages/worker/src/routes/shared.ts packages/worker/src/index.ts
rtk git commit -m "feat(api): add shared_links management endpoints"
```

### Task 3: Implement Worker Endpoints - Public Access

**Files:**
- Modify: `packages/worker/src/routes/shared.ts`

- [ ] **Step 1: Add Public Endpoints to shared.ts**
```typescript
// ─── Public Endpoints (No Auth) ───

sharedRouter.get('/:id/meta', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;
  
  const row = await db.prepare('SELECT * FROM shared_links WHERE id = ?').bind(id).first();
  if (!row) return c.json({ error: 'Link not found' }, 404);
  
  const link = mapSharedLinkRow(row as Record<string, unknown>);
  
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return c.json({ error: 'Link expired' }, 410);
  }
  
  const requiresPassword = !!link.passwordHash;
  const sessionCookie = getCookie(c, `shared_session_${id}`);
  const isAuthenticated = !requiresPassword || sessionCookie === link.passwordHash;
  
  if (!isAuthenticated) {
    return c.json({ error: 'Password required', requiresPassword: true }, 401);
  }
  
  if (link.targetType === 'file') {
    const file = await db.prepare('SELECT * FROM files WHERE id = ?').bind(link.targetId).first();
    if (!file) return c.json({ error: 'File not found' }, 404);
    return c.json({ target: file, type: 'file' });
  } else {
    return c.json({ targetId: link.targetId, type: 'folder' });
  }
});

sharedRouter.post('/:id/verify', async (c) => {
  const id = c.req.param('id');
  const { password } = await c.req.json();
  const db = c.env.DB;
  
  const row = await db.prepare('SELECT * FROM shared_links WHERE id = ?').bind(id).first();
  if (!row) return c.json({ error: 'Link not found' }, 404);
  const link = mapSharedLinkRow(row as Record<string, unknown>);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (link.passwordHash !== passwordHash) {
    return c.json({ error: 'Invalid password' }, 401);
  }
  
  setCookie(c, `shared_session_${id}`, passwordHash, { path: '/', httpOnly: true, secure: true, maxAge: 60 * 60 * 24 });
  return c.json({ success: true });
});

sharedRouter.get('/:id/download', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;
  
  const row = await db.prepare('SELECT * FROM shared_links WHERE id = ?').bind(id).first();
  if (!row) return c.text('Not found', 404);
  const link = mapSharedLinkRow(row as Record<string, unknown>);
  
  const requiresPassword = !!link.passwordHash;
  const sessionCookie = getCookie(c, `shared_session_${id}`);
  const isAuthenticated = !requiresPassword || sessionCookie === link.passwordHash;
  
  if (!isAuthenticated) return c.text('Unauthorized', 401);
  
  // Note: Streaming logic via GoogleDriveService will be added here
  return c.text('Download ready (stream to be connected to Google API)', 200);
});
```

- [ ] **Step 2: Commit**
```bash
rtk git add packages/worker/src/routes/shared.ts
rtk git commit -m "feat(api): add public endpoints for shared links"
```

### Task 4: Web App API Client

**Files:**
- Modify: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Add functions to api.ts**
```typescript
export interface SharedLink {
  id: string;
  userId: string;
  targetType: 'file' | 'folder';
  targetId: string;
  expiresAt: string | null;
  createdAt: string;
}

// Ensure you use whatever method getAuthHeaders() or fetch configuration is used in api.ts
export const createSharedLink = async (targetType: string, targetId: string, password?: string, expiresAt?: string) => {
  const res = await fetch('/api/shared', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ targetType, targetId, password, expiresAt }),
  });
  if (!res.ok) throw new Error('Failed to create link');
  return res.json();
};

export const getSharedLinks = async () => {
  const res = await fetch('/api/shared', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  if (!res.ok) throw new Error('Failed to get links');
  return res.json();
};

export const deleteSharedLink = async (id: string) => {
  const res = await fetch(`/api/shared/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
  if (!res.ok) throw new Error('Failed to delete link');
  return res.json();
};

export const getSharedMeta = async (id: string) => {
  const res = await fetch(`/api/shared/${id}/meta`);
  return res;
};

export const verifySharedPassword = async (id: string, password: string) => {
  const res = await fetch(`/api/shared/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Invalid password');
  return res.json();
};
```

- [ ] **Step 2: Commit**
```bash
rtk git add packages/web/src/lib/api.ts
rtk git commit -m "feat(web): add API client methods for shared links"
```

### Task 5: Web App UI - Share Modal

**Files:**
- Create: `packages/web/src/components/ShareModal.tsx`

- [ ] **Step 1: Create ShareModal.tsx**
```tsx
import React, { useState } from 'react';
import { createSharedLink } from '../lib/api';

export function ShareModal({ isOpen, onClose, targetType, targetId }: { isOpen: boolean, onClose: () => void, targetType: 'file' | 'folder', targetId: string }) {
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  if (!isOpen) return null;

  const handleShare = async () => {
    try {
      const res = await createSharedLink(targetType, targetId, password || undefined, expiresAt || undefined);
      setLinkUrl(res.url);
    } catch (e) {
      alert('Failed to share');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full text-black">
        <h2 className="text-lg font-semibold mb-4">Share {targetType}</h2>
        <input 
          type="password" 
          placeholder="Optional password" 
          className="border p-2 w-full mb-2 rounded"
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />
        <input 
          type="date" 
          className="border p-2 w-full mb-4 rounded"
          value={expiresAt} 
          onChange={e => setExpiresAt(e.target.value)} 
        />
        <button onClick={handleShare} className="bg-blue-600 text-white px-4 py-2 rounded w-full font-medium">Generate Link</button>
        {linkUrl && (
          <div className="mt-4 p-2 bg-gray-100 rounded break-all text-sm">
            {linkUrl}
          </div>
        )}
        <button onClick={onClose} className="mt-4 text-gray-600 w-full">Close</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
rtk git add packages/web/src/components/ShareModal.tsx
rtk git commit -m "feat(web): add ShareModal component"
```

### Task 6: Web App UI - Public Preview Page

**Files:**
- Create: `packages/web/src/pages/SharedPage.tsx`
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Create SharedPage.tsx**
```tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedMeta, verifySharedPassword } from '../lib/api';

export function SharedPage() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<any>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loadMeta = async () => {
    const res = await getSharedMeta(id!);
    if (res.status === 401) {
      setNeedsPassword(true);
    } else if (res.ok) {
      setMeta(await res.json());
      setNeedsPassword(false);
    } else {
      setError('Link expired or not found');
    }
  };

  useEffect(() => {
    loadMeta();
  }, [id]);

  const handleVerify = async () => {
    try {
      await verifySharedPassword(id!, password);
      loadMeta();
    } catch {
      setError('Invalid password');
    }
  };

  if (error) return <div className="p-8 text-red-500 font-medium">{error}</div>;

  if (needsPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-black">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl mb-4 font-bold">Password Required</h2>
          <input 
            type="password" 
            className="border p-2 w-full mb-4 rounded" 
            placeholder="Enter password"
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          <button onClick={handleVerify} className="bg-blue-600 text-white px-4 py-2 rounded w-full font-medium">Unlock</button>
        </div>
      </div>
    );
  }

  if (!meta) return <div className="p-8 text-black">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center text-black">
      <div className="bg-white p-8 rounded shadow-lg max-w-2xl w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Shared {meta.type}</h1>
        {meta.type === 'file' && <p className="mb-6">{meta.target?.name}</p>}
        <a 
          href={`/api/shared/${id}/download`} 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded font-semibold"
        >
          Download
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**
```tsx
// At the top of packages/web/src/App.tsx
import { SharedPage } from './pages/SharedPage';

// Within the <Routes> structure, outside of the auth boundary/Layout if applicable:
<Route path="/shared/:id" element={<SharedPage />} />
```

- [ ] **Step 3: Commit**
```bash
rtk git add packages/web/src/pages/SharedPage.tsx packages/web/src/App.tsx
rtk git commit -m "feat(web): add public SharedPage route"
```
