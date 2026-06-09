# Design Specification: Team Workspace Feature

## 1. Overview
Transform the existing "Virtual Folder" feature into a fully collaborative "Workspace" feature for teams. The Workspace acts as a shared environment with access control, replacing personal-only Virtual Folders. Files stored in Workspaces utilize the existing automatic pooling upload mechanism across connected Google Drive accounts.

## 2. Architecture & Data Model (Database)
The database schema will be updated to handle Workspaces and Team roles:
- **`workspaces` table**: Replaces `virtual_folders`. Contains `id`, `name`, `created_by`, `icon`, `color`, `created_at`, `updated_at`.
- **`workspace_members` table**: Manages team access. Contains `workspace_id`, `user_id`, `role` (enum: 'owner', 'editor', 'viewer'), `joined_at`.
- **`workspace_folders` table**: Manages the folder hierarchy within workspaces. Contains `id`, `workspace_id`, `parent_id`, `name`.
- **`files` table modifications**: Remove `virtual_folder_id` and add `workspace_id` and `workspace_folder_id` to link files to the workspace and specific folders.

## 3. Backend (API)
New endpoints grouped under `/api/workspaces`:
- **Workspace & Folders CRUD**: 
  - `GET /api/workspaces` (list)
  - `POST /api/workspaces` (create)
  - `GET /api/workspaces/:id` (details & content)
  - `POST /api/workspaces/:id/folders` (create folder)
- **Team Management**:
  - `POST /api/workspaces/:id/members` (invite member - `owner` only)
  - `PUT /api/workspaces/:id/members/:userId` (update role - `owner` only)
  - `DELETE /api/workspaces/:id/members/:userId` (remove member - `owner` only)
- **File Operations**:
  - `POST /api/workspaces/:id/files` (upload using existing 'auto' GDrive pooling, link via `workspace_id`)
- **Access Control Middleware**: Validates `role` against the requested action (`viewer` cannot write/delete).

## 4. Frontend (UI/UX)
- **Navigation**: Rename "Virtual Folders" to "Workspaces" in the sidebar.
- **Workspace List**: Display a grid/list of workspaces including the user's role on each card. Add a "Create Workspace" button.
- **Workspace Explorer**: Similar to the existing drive file grid.
  - Role-based UI: Hide upload, create folder, rename, and delete actions if the user role is `viewer`.
  - Add a "Members" button in the workspace header.
- **Team Management Modal**: Accessible by `owner`. Shows member list, allows inviting new members via email/username, changing roles, and removing members.

## 5. Security & Constraints
- Only the `owner` can manage members.
- `editor` can upload, delete, and modify files.
- `viewer` can only view and download.
- Uploads to workspace will utilize the existing `auto` mechanism to store binary data across connected Google Drive accounts, maintaining separation from OmniDrive's central database.
