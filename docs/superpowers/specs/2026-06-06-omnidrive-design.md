# Omnidrive — Design Specification

> **Date**: 2026-06-06
> **Status**: Approved
> **Target**: Small-team (5-10 users)
> **Deploy**: Cloudflare Free Tier (Workers, Pages, D1, KV)

## 1. Overview

Omnidrive is a web gateway that aggregates multiple Google Drive accounts into a single virtual storage dashboard. Users log in via Google OAuth, automatically connecting their first Drive account, and can add additional Drive accounts (or service accounts) to expand their storage pool. The system provides virtual folder organization, upload routing to the Drive with the most free space, file preview via Google Drive, and periodic background sync.

### Goals

- Unified dashboard showing aggregate quota across all connected Google Drives
- Virtual folder system for organizing files across multiple Drives
- Smart upload routing: user can choose target Drive or let the system pick the one with most free space
- Periodic sync via Cloudflare Cron Triggers to keep metadata in sync with Google Drive
- Zero file proxying: all file data flows directly between browser and Google Drive

### Non-Goals

- File content caching or CDN proxying
- Cross-Drive file splitting (splitting large files across accounts)
- Real-time collaboration features
- Public file sharing links
- Mobile native app

---

## 2. Architecture

### Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript | Deployed to Cloudflare Pages |
| Backend | Cloudflare Worker + Hono | Single worker, fetch + scheduled handlers |
| Database | Cloudflare D1 (SQLite) | User data, file metadata, virtual folders |
| Cache | Cloudflare KV | Sessions, OAuth tokens, quota cache |
| External API | Google Drive API v3 | Per connected account |

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Cloudflare Pages                       │
│              React + Vite + TypeScript                   │
│   ┌──────┬──────────┬────────┬──────────┬────────────┐  │
│   │Login │Dashboard │Files   │Upload    │Settings    │  │
│   └──┬───┴────┬─────┴───┬───┴────┬─────┴─────┬──────┘  │
└──────┼────────┼─────────┼────────┼───────────┼──────────┘
       │        │         │        │           │
       ▼        ▼         ▼        ▼           ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Worker (Hono)                    │
│                                                         │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │
│  │Auth     │ │Drive     │ │Files   │ │Sync          │  │
│  │Routes   │ │Routes    │ │Routes  │ │(scheduled)   │  │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘  │
│       │           │           │              │          │
│  ┌────┴───────────┴───────────┴──────────────┴───────┐  │
│  │            Middleware Layer                        │  │
│  │  (CORS, Auth Guard, Error Handler, Rate Limit)    │  │
│  └───────────────────────────────────────────────────┘  │
└──────────┬──────────────────────┬───────────────────────┘
           │                      │
     ┌─────▼─────┐          ┌────▼─────┐
     │    D1     │          │    KV    │
     │ (SQLite)  │          │ (Cache)  │
     │           │          │          │
     │• users    │          │• sessions│
     │• drives   │          │• oauth   │
     │• files    │          │• quota   │
     │• folders  │          │  tokens  │
     └───────────┘          └──────────┘
           │
           ▼
   ┌───────────────┐
   │ Google Drive   │
   │ API v3         │
   │ (per account)  │
   └───────────────┘
```

### Cloudflare Free Tier Constraints

| Resource | Limit | Impact |
|---|---|---|
| Workers requests | 100K/day | ~7 req/min avg. Fine for 5-10 users |
| Workers CPU time | 10ms/request | No file proxying, I/O-bound ops only |
| D1 row reads | 5M/day | Comfortable for metadata queries |
| D1 row writes | 100K/day | ~2K writes per sync cycle is fine |
| KV reads | 100K/day | Session + token lookups, cached quota |
| KV writes | 1K/day | Token refresh + session creation only |
| Worker request body | 100MB (free) | Not an issue — uploads bypass Worker |
| D1 storage | 5GB | Metadata only, very compact |

---

## 3. Project Structure

```
omnidrive/
├── packages/
│   ├── web/                        # React frontend (Cloudflare Pages)
│   │   ├── src/
│   │   │   ├── components/         # Reusable UI components
│   │   │   ├── pages/              # Route pages
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── lib/                # API client, utils
│   │   │   ├── stores/             # Zustand state stores
│   │   │   └── types/              # Shared TypeScript types
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── worker/                     # Cloudflare Worker backend (Hono)
│       ├── src/
│       │   ├── routes/             # Hono route modules
│       │   │   ├── auth.ts
│       │   │   ├── drives.ts
│       │   │   ├── files.ts
│       │   │   └── folders.ts
│       │   ├── middleware/         # Auth guard, CORS, error handler
│       │   ├── services/          # Business logic
│       │   │   ├── google-drive.ts
│       │   │   ├── sync.ts
│       │   │   └── upload-router.ts
│       │   ├── db/                # D1 schema & query helpers
│       │   │   ├── schema.sql
│       │   │   └── queries.ts
│       │   ├── types/             # Type definitions
│       │   └── index.ts           # Main Hono app entry
│       ├── wrangler.toml
│       └── package.json
│
├── package.json                   # Root workspace (npm workspaces)
└── tsconfig.base.json             # Shared TS config
```

No Turborepo — npm workspaces is sufficient for a small-team project.

---

## 4. Data Model

### D1 Tables

```sql
-- Users (from Google OAuth login)
CREATE TABLE users (
    id              TEXT PRIMARY KEY,
    google_id       TEXT UNIQUE NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    avatar_url      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Connected Google Drive accounts
CREATE TABLE drive_accounts (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_account_id TEXT NOT NULL,
    email           TEXT NOT NULL,
    name            TEXT,
    type            TEXT NOT NULL DEFAULT 'oauth',  -- 'oauth' | 'service_account'
    is_primary      INTEGER NOT NULL DEFAULT 0,
    root_folder_id  TEXT,                           -- "Omnidrive" folder in this Drive
    total_quota     INTEGER DEFAULT 0,
    used_quota      INTEGER DEFAULT 0,
    quota_updated_at TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, google_account_id)
);

-- Virtual folder structure (Omnidrive-only, not in Google Drive)
CREATE TABLE virtual_folders (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    parent_id       TEXT REFERENCES virtual_folders(id) ON DELETE CASCADE,
    icon            TEXT,
    color           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, parent_id, name)
);

-- File metadata synced from Google Drive
CREATE TABLE files (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drive_account_id TEXT NOT NULL REFERENCES drive_accounts(id) ON DELETE CASCADE,
    google_file_id  TEXT NOT NULL,
    virtual_folder_id TEXT REFERENCES virtual_folders(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    mime_type       TEXT,
    size            INTEGER DEFAULT 0,
    thumbnail_url   TEXT,
    web_view_link   TEXT,
    web_content_link TEXT,
    is_trashed      INTEGER NOT NULL DEFAULT 0,
    google_created_at  TEXT,
    google_modified_at TEXT,
    synced_at       TEXT NOT NULL DEFAULT (datetime('now')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(drive_account_id, google_file_id)
);

-- Sync state tracking per drive account
CREATE TABLE sync_state (
    drive_account_id TEXT PRIMARY KEY REFERENCES drive_accounts(id) ON DELETE CASCADE,
    change_token     TEXT,
    last_synced_at   TEXT,
    status           TEXT DEFAULT 'idle',  -- 'idle' | 'syncing' | 'error'
    error_message    TEXT
);

-- Performance indexes
CREATE INDEX idx_files_user_folder ON files(user_id, virtual_folder_id);
CREATE INDEX idx_files_drive ON files(drive_account_id);
CREATE INDEX idx_folders_user_parent ON virtual_folders(user_id, parent_id);
CREATE INDEX idx_drives_user ON drive_accounts(user_id);
```

### KV Key Patterns

| Key | Value | TTL | Purpose |
|---|---|---|---|
| `session:{sessionId}` | `{userId, email, name, avatar}` | 7 days | Cookie-based session |
| `oauth:{driveAccountId}` | `{accessToken, refreshToken, expiresAt}` | Permanent | OAuth tokens per Drive |
| `quota:{driveAccountId}` | `{total, used, updatedAt}` | 5 min | Quota cache |
| `pkce:{state}` | `{codeVerifier, mode, userId?}` | 10 min | OAuth PKCE state during login/connect |
| `sa:{driveAccountId}` | `{serviceAccountJSON}` | Permanent | Service account credentials |

### Design Decisions

- **`root_folder_id`**: Each connected Drive has a dedicated "Omnidrive" root folder. All uploads go into this folder. Sync only processes files within this folder.
- **Virtual folders ≠ Google Drive folders**: Virtual folders exist only in D1 for UI organization. One virtual folder can contain files from multiple Drive accounts. In Google Drive, all files are flat inside "Omnidrive".
- **OAuth tokens in KV**: Faster access than D1 for hot data. Avoids storing sensitive credentials in SQL.
- **`UNIQUE(drive_account_id, google_file_id)`**: Prevents file duplication during repeated syncs (upsert pattern).

---

## 5. Authentication

### Google OAuth Scopes

```
openid
email
profile
https://www.googleapis.com/auth/drive
```

Full `drive` scope is required because the app needs to: upload new files, read existing files in the Omnidrive folder, track quota, and sync changes. The narrower `drive.file` scope only covers files created by the app itself.

### Flow 1: Login (First Drive Auto-Connected)

1. User clicks "Login with Google" → `GET /api/auth/login`
2. Worker generates `state` + PKCE `code_verifier`, stores in KV (10-min TTL)
3. Redirect to Google OAuth consent screen
4. Google redirects back to `GET /api/auth/callback?code=xxx`
5. Worker exchanges code for tokens, fetches userinfo
6. **Automatic**: UPSERT user in D1, INSERT drive_account (is_primary=1), store tokens in KV
7. **Automatic**: Create "Omnidrive" folder in Google Drive root, save root_folder_id
8. Create session in KV, set `HttpOnly`/`Secure`/`SameSite=Lax` cookie
9. Redirect to `/dashboard`

### Flow 2: Connect Additional Drive (OAuth)

1. User clicks "Add Drive" → `GET /api/drives/connect`
2. Same OAuth flow but state includes `{mode: "connect", userId: "xxx"}`
3. On callback, Worker detects `mode === "connect"` from state
4. Creates new drive_account (is_primary=0) for the different Google account
5. Creates "Omnidrive" folder in the new Drive
6. Redirect to `/settings/drives`

**Single callback endpoint**: `/api/auth/callback` handles both login and connect, differentiated by the `state` parameter. Only one redirect URI in Google Cloud Console.

### Flow 3: Service Account (Advanced)

1. User uploads service account JSON + provides folder ID (shared with service account email)
2. `POST /api/drives/service-account` validates JSON structure and tests folder access
3. Creates drive_account with `type='service_account'`, stores credentials in KV (`sa:{driveId}`)

### Session Management

- Cookie: `omnidrive_sid`, HttpOnly, Secure, SameSite=Lax, 7-day maxAge
- Auth middleware: read cookie → lookup session in KV → inject userId into Hono context
- Sliding window: TTL extended on each valid request
- Revocation: delete session from KV → instant logout

---

## 6. Google Drive Integration

### Token Management

Every Google Drive API call goes through `getValidToken(driveAccountId)`:
1. Read `oauth:{driveAccountId}` from KV
2. If `expiresAt > now()` → return cached access token
3. Else → POST to Google token endpoint with refresh_token, update KV with new tokens

For service accounts: generate JWT from stored credentials, exchange for access token.

### Quota Tracking

- Fetched via `GET /drive/v3/about?fields=storageQuota`
- Cached in KV (`quota:{driveAccountId}`, TTL 5 min)
- Dashboard shows per-drive breakdown + aggregate totals
- Cron sync also refreshes quota cache

### Upload Flow (Resumable, Browser-Direct)

Files never pass through the Worker. The Worker only orchestrates:

1. **Frontend** → `POST /api/files/upload` with file metadata (name, size, mimeType, target drive, virtual folder)
2. **Worker** runs upload routing algorithm to select target Drive account
3. **Worker** creates resumable upload session via Google Drive API → receives `uploadUrl`
4. **Worker** returns `uploadUrl` to browser
5. **Browser uploads directly to Google Drive** via the authenticated `uploadUrl`
6. After upload completes, **browser** → `POST /api/files/confirm` with Google file details
7. **Worker** fetches file metadata from Google Drive, saves to D1

Benefits: zero bandwidth cost at Worker, no CPU limit issues, supports any file size, resumable on network interruption.

### Upload Routing Algorithm

```
selectDriveAccount(accounts, fileSize, preferredId?):
  if preferredId:
    account = find(accounts, preferredId)
    if account.freeSpace >= fileSize → return account
    else → throw "Not enough space in selected drive"

  eligible = accounts.filter(a => a.freeSpace >= fileSize)
                     .sort(by freeSpace descending)
  if eligible is empty → throw "No drive has enough free space"
  return eligible[0]  // most free space
```

### File Operations

| Operation | Mechanism | Where |
|---|---|---|
| List files | `SELECT FROM files WHERE virtual_folder_id = ?` | D1 only |
| Search | `SELECT FROM files WHERE name LIKE ?` | D1 only |
| Preview | Redirect to `thumbnailUrl` or `webViewLink` | Google Drive direct |
| Download | Redirect to `webContentLink` | Google Drive direct |
| Delete | `DELETE /drive/v3/files/{id}` + `DELETE FROM files` | Google API → D1 |
| Move (virtual) | `UPDATE files SET virtual_folder_id = ?` | D1 only |
| Rename | `PATCH /drive/v3/files/{id}` + `UPDATE files` | Google API → D1 |

Principle: reads touch D1 only (fast). Writes go through Google API first, then update D1. Google Drive is the source of truth.

---

## 7. Sync Mechanism

### Cron Trigger

```toml
# wrangler.toml
[triggers]
crons = ["*/30 * * * *"]   # every 30 minutes
```

### Initial Sync (New Drive Connected)

1. Create "Omnidrive" folder in Drive root
2. Save `root_folder_id` to drive_accounts
3. Get initial `startPageToken` from Google Drive Changes API
4. Store token in sync_state
5. For service accounts with existing files: list files in shared folder, batch insert to D1

### Incremental Sync (Cron)

For each drive_account:

1. Set `sync_state.status = 'syncing'`
2. Read stored `change_token` from sync_state
3. `GET /drive/v3/changes?pageToken={token}` — paginate through all changes
4. Filter: only process files whose parent is `root_folder_id` (Omnidrive folder)
5. For each change:
   - File removed/trashed → DELETE from D1
   - File new/modified → UPSERT in D1
6. Store new page token in sync_state
7. Refresh quota cache in KV
8. Set `sync_state.status = 'idle'`

### Manual Sync

`POST /api/drives/:id/sync` triggers the same logic for a single drive account on-demand.

### Error Handling

| Error | Action |
|---|---|
| Token refresh failed (revoked) | Set status='error', show warning in dashboard |
| Google API rate limit (429) | Skip account, retry next cron cycle |
| "Omnidrive" folder deleted | Set root_folder_id=NULL, prompt user to re-create |
| D1 write limit approaching | Log warning, prioritize accounts not synced longest |

---

## 8. Frontend

### Pages & Routing

| Route | Page | Description |
|---|---|---|
| `/login` | LoginPage | Google OAuth login button |
| `/` | Dashboard | Aggregate quota, per-drive breakdown, recent files |
| `/files` | FilesPage | Root virtual folder contents |
| `/files/:folderId` | FilesPage | Subfolder contents |
| `/settings/drives` | SettingsPage | Manage connected drives |

### Component Hierarchy

```
App
├── AuthGuard
│   ├── Layout
│   │   ├── Sidebar
│   │   │   ├── NavLinks
│   │   │   ├── DriveList
│   │   │   └── AddDriveButton
│   │   └── MainContent
│   │       ├── DashboardPage
│   │       │   ├── AggregateQuotaBar
│   │       │   ├── DriveQuotaCards
│   │       │   └── RecentFiles
│   │       ├── FilesPage
│   │       │   ├── Breadcrumb
│   │       │   ├── Toolbar (search, upload, view toggle)
│   │       │   ├── FolderGrid / FolderList
│   │       │   ├── FileGrid / FileList
│   │       │   ├── DropZone
│   │       │   ├── UploadModal
│   │       │   └── FilePreviewModal
│   │       └── SettingsPage
│   │           ├── DriveAccountCard[]
│   │           ├── AddDriveOAuth
│   │           └── AddServiceAccount
│   └── ToastProvider
└── LoginPage
    └── GoogleLoginButton
```

### State Management (Zustand)

Four stores with clear responsibilities:

- **authStore**: user session state, fetchUser, logout
- **driveStore**: connected drives, aggregate quota, fetchDrives, removeDrive, triggerSync
- **fileStore**: current folder contents, breadcrumb, CRUD operations, search
- **uploadStore**: upload queue, progress tracking, startUpload, cancelUpload

### Design Decisions

- **Dark mode default**: premium aesthetic, modern feel. Light mode can be added later via CSS custom properties toggle.
- **Grid + List view toggle**: user preference for file display.
- **Drag & drop upload**: intuitive UX via react-dropzone.
- **Drive color indicators**: each connected Drive has a colored dot next to its files, so users know which Drive stores each file.
- **Toast notifications**: non-blocking feedback for async operations (upload complete, sync error).
- **Vanilla CSS**: no CSS framework. Custom properties for theming, CSS Grid/Flexbox for layout.

### Frontend Dependencies

| Package | Purpose | Size |
|---|---|---|
| react + react-dom | UI framework | ~40KB |
| react-router-dom | Client-side routing | ~15KB |
| zustand | State management | ~2KB |
| lucide-react | Icons (tree-shakeable) | varies |
| react-dropzone | Drag & drop upload | ~8KB |

---

## 9. API Routes

```
AUTH
──────────────────────────────────────────────────────
GET    /api/auth/login              → 302 Google OAuth
GET    /api/auth/callback           → handle OAuth callback (login + connect)
POST   /api/auth/logout             → clear session cookie + KV
GET    /api/auth/me                 → current user info

DRIVES
──────────────────────────────────────────────────────
GET    /api/drives                  → list drives + quota (per-drive + aggregate)
GET    /api/drives/connect          → 302 Google OAuth (connect mode)
DELETE /api/drives/:id              → disconnect drive account
POST   /api/drives/service-account  → add service account
POST   /api/drives/:id/sync        → trigger manual sync

FOLDERS
──────────────────────────────────────────────────────
GET    /api/folders/root/contents   → root level files + folders
GET    /api/folders/:id/contents    → folder contents + breadcrumb
POST   /api/folders                 → create virtual folder
PATCH  /api/folders/:id             → rename / move folder
DELETE /api/folders/:id             → delete folder (files move to root)

FILES
──────────────────────────────────────────────────────
POST   /api/files/upload            → initiate resumable upload session
POST   /api/files/confirm           → confirm upload + save metadata to D1
PATCH  /api/files/:id/move          → move file to virtual folder
PATCH  /api/files/:id               → rename file
DELETE /api/files/:id               → delete file (Google Drive + D1)
GET    /api/files/search?q=         → search files by name
```

**Total: 16 endpoints**

---

## 10. Security Considerations

- **PKCE OAuth flow**: no client secret exposed in browser
- **HttpOnly + Secure + SameSite=Lax cookies**: prevents XSS token theft and CSRF
- **Session revocation**: KV-based sessions can be instantly revoked (unlike JWT)
- **OAuth tokens in KV only**: never exposed to frontend or stored in D1
- **CORS middleware**: restricts API access to the Pages domain only
- **Input validation**: all API inputs validated via Hono's validator middleware
- **Circular folder guard**: move-folder validates target is not a descendant of source
