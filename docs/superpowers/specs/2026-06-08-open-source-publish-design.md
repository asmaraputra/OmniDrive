# Omnidrive — Open Source Publish Preparation

**Date:** 2026-06-08
**Status:** Approved
**Scope:** Configuration cleanup, credential removal, documentation, bug fixes

---

## 1. Overview

Prepare the Omnidrive monorepo for publishing as a public open-source repository on GitHub. This involves four work streams: securing credentials, cleaning up dev artifacts, writing documentation, and fixing known bugs.

The repo is currently local-only (no remote) with 112 commits on `master`.

---

## 2. Configuration & Security

### 2.1 Expand `.gitignore`

Replace the current `.gitignore` with a comprehensive version:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
tsconfig.tsbuildinfo

# Cloudflare
.dev.vars
.wrangler/
.mf/
wrangler.toml

# Environment
.env*
!.env.example

# Local overrides
*.local

# OS
.DS_Store
Thumbs.db

# Logs
*.log
```

Key additions:
- `wrangler.toml` — contains personal D1 database ID and KV namespace ID
- `.env*` with `!.env.example` exception — prevents `.env.production` and similar from being tracked
- `tsconfig.tsbuildinfo` — build cache, already present in `packages/web/`
- `.DS_Store`, `*.log` — standard OS/dev artifacts

### 2.2 Example/Template Files

Create three template files that get committed in place of real config:

#### `packages/worker/wrangler.example.toml`

Copy of `wrangler.toml` with all personal values replaced:

```toml
name = "omnidrive-api"
main = "src/index.ts"
compatibility_date = "2025-06-01"

[triggers]
crons = ["*/30 * * * *"]

[[d1_databases]]
binding = "DB"
database_name = "omnidrive"
database_id = "<your-d1-database-id>"

[[kv_namespaces]]
binding = "KV"
id = "<your-kv-namespace-id>"

[vars]
FRONTEND_URL = "http://localhost:5173"
WORKER_URL = "http://localhost:8787"

[observability]
enabled = false
head_sampling_rate = 1

[observability.logs]
enabled = true
head_sampling_rate = 1
persist = true
invocation_logs = true

[observability.traces]
enabled = false
persist = true
head_sampling_rate = 1
```

Notes:
- `FRONTEND_URL` and `WORKER_URL` default to localhost for development
- Database and KV IDs are placeholder strings contributors must fill in

#### `packages/worker/.dev.vars.example`

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

This already matches the current `.dev.vars` content. Create it as a committed reference.

#### `packages/web/.env.example`

```
# API URL - leave empty for local dev (Vite proxy handles it)
# Set to your Worker URL for production builds
VITE_API_URL=
```

### 2.3 Remove `.env.production` from Tracking

- `git rm --cached packages/web/.env.production` — untrack without deleting the local file
- The updated `.gitignore` (`.env*`) prevents re-tracking

No git history rewrite — the file only contains a public API URL, not secrets.

---

## 3. Cleanup

### 3.1 Delete 8 Temporary Dev Files

**Root directory (5 files):**

| File | Purpose | Size |
|------|---------|------|
| `fix.js` | Console.log sanity check | 65 B |
| `replace_api.js` | One-time code gen script | 1.9 KB |
| `test-crypto.js` | Standalone PBKDF2 test | 1.7 KB |
| `test-date.ts` | Date parsing test | 185 B |
| `test_api.js` | Manual localhost API test | 333 B |

**`packages/worker/` (3 files):**

| File | Purpose | Size |
|------|---------|------|
| `test-crypto.js` | Web Crypto API PBKDF2 test | 809 B |
| `test-local.js` | Wrangler dev + health check | 797 B |
| `test-script.js` | D1 query debug script | 735 B |

All are scratch/debug scripts with no production value. Delete via `git rm`.

### 3.2 Fix Known Bugs

#### Bug 1: `SharedLinksPage.tsx` — Bad Import

`SharedLinksPage.tsx` imports `request` from `../lib/api`, but `request` is not exported (it's a private helper). This page is also not wired into `App.tsx` routes — it appears to be dead/WIP code.

**Fix:** Update the import to use the exported `fetchSharedLinks` function from `api.ts`. The page is a minimal stub that lists shared links — `fetchSharedLinks` is the correct function to use.

#### Bug 2: `ShareModal.tsx` — Interface Mismatch

`ShareModal.tsx` calls `createSharedLink(targetType, targetId, password, isoExpiresAt)` with positional arguments, but the exported function expects a single `CreateSharedLinkPayload` object.

**Fix:** Change the call to pass a single object:
```typescript
createSharedLink({ targetType, targetId, password, expiresAt: isoExpiresAt })
```

---

## 4. Documentation

### 4.1 `README.md` (English)

Structure:

1. **Header** — Project name, tagline ("Unified multi-Google Drive storage gateway"), badges (License, TypeScript, Cloudflare Workers)
2. **What is Omnidrive?** — 2-3 sentence description
3. **Features** — Bullet list:
   - Multi-drive account management (Google OAuth + Service Account)
   - Unified file browsing across drives (merged view)
   - Virtual folder organization system
   - File upload with smart drive selection (most free space)
   - Password-protected shared links with expiry and download limits
   - File automation rules (auto-move, auto-delete by conditions)
   - Real-time sync via Google Drive Changes API
   - Dark mode UI with responsive design
4. **Tech Stack** — Table: Backend (Hono, Cloudflare Workers, D1, KV), Frontend (React 19, Vite, Zustand, TypeScript)
5. **Architecture** — Monorepo diagram showing packages/worker ↔ packages/web relationship
6. **Prerequisites** — Node.js 18+, npm, Cloudflare account, Google Cloud project with Drive API enabled
7. **Getting Started** — Step-by-step:
   - Clone repo
   - `npm install`
   - Copy `wrangler.example.toml` → `wrangler.toml`, fill IDs
   - Copy `.dev.vars.example` → `.dev.vars`, fill Google OAuth credentials
   - Create D1 database, apply schema
   - Copy `.env.example` → `.env` (web)
   - `npm run dev` (runs both worker + web concurrently)
8. **Deployment** — Cloudflare Workers deploy + Cloudflare Pages deploy (reference Makefile)
9. **Environment Variables** — Reference table for all env vars and secrets
10. **Project Structure** — Tree view of key directories
11. **License** — MIT

### 4.2 `README.id.md` (Bahasa Indonesia)

Full translation of `README.md` with:
- Link back to English version at the top
- English `README.md` links forward to Indonesian version
- Identical structure and content

### 4.3 `CHANGELOG.md`

Format follows [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-08

### Added
- Google OAuth authentication with session management
- Multi-Google Drive account support (OAuth + Service Account)
- Google Drive file sync (initial + incremental via Changes API)
- Cron-based automatic sync (every 30 minutes)
- Virtual folder system for cross-drive organization
- Merged drive view with unified browsing
- File upload with smart drive selection
- Breadcrumb navigation
- Password-protected shared links with expiry and download limits
- File automation rules engine (auto-move, auto-delete)
- Dark mode UI design system
- Dashboard with aggregate storage stats
- File preview modal (images, documents)
- Drag-and-drop file upload
```

### 4.4 `LICENSE`

Standard MIT License text with:
- Year: 2026
- Copyright holder: abilfida (matches git author)

---

## 5. Package Metadata

Update root `package.json`:

```json
{
  "name": "omnidrive",
  "version": "0.1.0",
  "description": "Unified multi-Google Drive storage gateway built on Cloudflare Workers",
  "private": true,
  "license": "MIT",
  "author": "abilfida",
  "repository": {
    "type": "git",
    "url": "https://github.com/abilfida/omnidrive.git"
  },
  ...
}
```

Note: `"private": true` stays — this is a monorepo root, not an npm package. The `repository.url` is a placeholder until the actual GitHub repo is created.

---

## 6. Out of Scope

The following are explicitly excluded:
- Git history rewrite (`.env.production` only contains a public URL)
- CI/CD pipeline setup (GitHub Actions)
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
- GitHub issue/PR templates
- Adding a dedicated `JWT_SECRET` env var (the `GOOGLE_CLIENT_SECRET` dual-use concern is noted but not addressed in this scope)
- Screenshots / demo images for README

---

## 7. Implementation Order

1. Delete 8 temporary files
2. Fix 2 bugs (SharedLinksPage, ShareModal)
3. Create example/template files (wrangler.example.toml, .dev.vars.example, .env.example)
4. Update `.gitignore`
5. Untrack `.env.production` and `wrangler.toml`
6. Create LICENSE
7. Create CHANGELOG.md
8. Update root `package.json` metadata
9. Create README.md (English)
10. Create README.id.md (Indonesian)
11. Commit all changes
