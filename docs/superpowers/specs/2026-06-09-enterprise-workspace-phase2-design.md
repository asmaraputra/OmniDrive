# Enterprise Workspace Phase 2: Administrative Governance & Policies

## 1. Overview
Phase 2 focuses on providing IT administrators with the tools necessary to enforce data governance. This includes setting folder-level data retention rules (auto-deletion and legal holds) and enforcing hard storage quotas to manage costs.

## 2. Architecture & Data Model
A unified Policy Engine will be implemented using a new `workspace_policies` table to handle all governance rules dynamically via JSON configuration.

**`workspace_policies` schema:**
- `id`: TEXT PRIMARY KEY
- `workspace_id`: TEXT NOT NULL (Foreign Key to `workspaces`)
- `target_type`: TEXT NOT NULL (Enum: 'workspace' | 'folder')
- `target_id`: TEXT (Foreign Key to `workspace_folders`, nullable if target_type is 'workspace')
- `policy_type`: TEXT NOT NULL (Enum: 'storage_quota' | 'data_retention')
- `config`: TEXT NOT NULL (JSON string with policy parameters)
- `created_at`: TEXT
- `updated_at`: TEXT

**Workspace Storage Tracking:**
To avoid expensive `SUM(size)` queries, the `workspaces` table will be extended to include:
- `used_bytes`: INTEGER DEFAULT 0

## 3. Backend API & Enforcement
- **Storage Quotas:** Checked synchronously on upload/sync. If `workspace.used_bytes + file.size > policy.config.maxBytes`, the API returns a 403 Forbidden.
- **Retention Protection:** Checked synchronously on file deletion. If the file's folder (or workspace) has an active `prevent_deletion` policy, deletion is blocked with a 403.
- **Retention Auto-Delete:** A daily cron job finds files older than the configured days in folders with an `auto_delete` policy and permanently deletes them.
- **REST Endpoints:**
  - `GET /api/workspaces/:id/policies`
  - `POST /api/workspaces/:id/policies`
  - `DELETE /api/workspaces/:id/policies/:policyId`
  *(Protected by the `manager` or `owner` RBAC roles introduced in Phase 1).*

## 4. UI & Frontend Experience
- **Workspace Settings:**
  - **Storage Usage:** A progress bar comparing `used_bytes` to `quota_bytes`, with an input for owners to update the quota policy.
  - **Governance Policies:** A data table listing all active policies in the workspace for easy management and auditing.
- **File Grid / Context Menus:**
  - Right-clicking a folder reveals a "Set Retention Policy" option, opening a modal to configure auto-delete or prevent-deletion rules.
  - Folders with active policies display a subtle visual indicator (e.g., a shield icon).
