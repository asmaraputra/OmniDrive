# Advanced Public Links Design

## 1. Overview
The "Advanced Public Links" feature upgrades the basic public sharing capabilities of Omnidrive to cater specifically to developers and entrepreneurs. It allows users to share single files or entire folders with advanced configuration options such as Dropzone mode (allow uploads), download limits, webhook integrations, and rich media/code previews. Users can also edit active links and revoke access at any time.

## 2. Features & UI/UX

### Share Link Management
- **Advanced Config Modal (Create & Edit)**:
  - **Basic**: URL Slug, Expiry Date, Password Protection.
  - **Permissions**: Toggle "Allow Downloads" (view-only mode vs downloadable), toggle "Allow Uploads" (turns a folder into a Dropzone).
  - **Limits & Tracking**: "Max Downloads Limit", "Require Email" (collects visitor emails), "Webhook URL" (pings server when accessed).
- **Dashboard Management**: A "Shared Links" page to view all active links, see view/download stats, edit configurations, or click "Stop Sharing" to instantly revoke access.

### Public Folder View
- **Layout**: List/Grid toggle, local search bar to filter files.
- **README Rendering**: Auto-renders `README.md` (if present) below the file list, similar to GitHub.
- **Bulk Actions**: "Download All as ZIP" button (if downloads are allowed).

### Public File Preview
- **Code**: Built-in syntax highlighting for developer code/JSON files.
- **Media**: Native PDF rendering, high-res image zoom, and basic video streaming.

## 3. Architecture & Database

### Schema Updates (`shared_links` table)
New columns added to the existing table:
- `allow_downloads` (BOOLEAN, default `true`)
- `allow_uploads` (BOOLEAN, default `false`)
- `max_downloads` (INTEGER, nullable)
- `require_email` (BOOLEAN, default `false`)
- `webhook_url` (TEXT, nullable)
- `view_count` (INTEGER, default `0`)
- `download_count` (INTEGER, default `0`)

### New Schema (`shared_link_logs` table)
- `id` (INTEGER, PRIMARY KEY)
- `shared_link_id` (TEXT, Foreign Key)
- `action` (TEXT) - e.g., 'view', 'download', 'upload'
- `visitor_email` (TEXT, nullable)
- `created_at` (DATETIME)

### API Endpoints (Worker)
- `POST /api/shared` (Updated): Accepts advanced config fields.
- `PUT /api/shared/:id` (New): Edit existing share link configuration without breaking the URL.
- `DELETE /api/shared/:id` (Existing): Instantly revoke access ("Stop Sharing").
- `POST /api/shared/:id/upload` (New): Dropzone endpoint. Accepts files if `allow_uploads=true`.
- `GET /api/shared/:id/zip` (New): Streams dynamically generated ZIP of folder contents (using `fflate`).
- `GET /api/shared/:id` & `GET /api/shared/:id/download` (Updated): Increments counters, checks `max_downloads`, logs emails, and fires async webhooks.

## 4. Error Handling & Edge Cases
- **Download Limits Exceeded**: Returns `403 Forbidden` with a "Link Expired or Limit Reached" message.
- **Dropzone File Size**: Worker enforces standard upload limits; returns `413 Payload Too Large`.
- **Webhook Failures**: Fire-and-forget using `ctx.waitUntil`. Failures do not block the user from downloading/viewing the file.
- **ZIP Generation OOM**: Streaming ZIP generation is used to prevent Out-Of-Memory errors on Cloudflare Workers.
