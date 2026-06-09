# Implementation Plan: Enterprise Workspace Phase 2

## Step 1: Database Migration
- **Target:** `packages/worker/src/db/0003_enterprise_workspace_phase2.sql` and `schema.sql`
- **Actions:**
  - Add `used_bytes INTEGER DEFAULT 0` to `workspaces` table.
  - Create `workspace_policies` table with necessary indexes (`idx_workspace_policies_workspace`).

## Step 2: Shared Types Update
- **Target:** `packages/web/src/types/index.ts`
- **Actions:**
  - Update `Workspace` interface to include `usedBytes`.
  - Add `WorkspacePolicy` interface mapping to the new schema.

## Step 3: Policy Service & Quota Enforcement
- **Target:** `packages/worker/src/services/policy.service.ts` and file upload/sync routes.
- **Actions:**
  - Create `PolicyService` to evaluate storage quotas and retention rules.
  - Integrate quota checks into upload and sync handlers. Return 403 if `used_bytes` + incoming exceeds quota.
  - Implement logic to increment/decrement `used_bytes` when files are created, deleted, or permanently trashed.

## Step 4: Policy CRUD API Routes
- **Target:** `packages/worker/src/routes/workspaces.ts`
- **Actions:**
  - Add `GET /:id/policies`, `POST /:id/policies`, `DELETE /:id/policies/:policyId` routes.
  - Protect these routes using the `manager` or `owner` RBAC requirement.

## Step 5: Auto-Delete Cron Job Updates
- **Target:** `packages/worker/src/index.ts`
- **Actions:**
  - Update the `scheduled` handler to run retention policy enforcement (querying for `auto_delete` policies and purging old files).

## Step 6: Frontend API Client
- **Target:** `packages/web/src/lib/api.ts`
- **Actions:**
  - Add methods: `getWorkspacePolicies`, `createWorkspacePolicy`, `deleteWorkspacePolicy`.

## Step 7: UI - Storage Quota & Policy Settings
- **Target:** `packages/web/src/components/workspaces/WorkspaceSettingsTab.tsx`
- **Actions:**
  - Add a visual progress bar for storage usage (`usedBytes` vs Quota).
  - Add a data table to list existing governance policies.
  - Add UI for owners to update the storage quota policy.

## Step 8: UI - Folder Context Menu for Retention
- **Target:** `packages/web/src/components/files/FileGrid.tsx` / `ContextMenu`
- **Actions:**
  - Add "Set Retention Policy" to folder context menus.
  - Build a modal to define `auto_delete` or `prevent_deletion` rules with day counts.
  - Add a visual indicator (icon) to folders that have an active policy.
