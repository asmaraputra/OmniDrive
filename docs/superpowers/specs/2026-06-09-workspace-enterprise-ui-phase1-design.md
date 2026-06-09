# Workspace Enterprise UI Refinement (Phase 1: Foundation & Navigation)

## Overview
This design spec outlines Phase 1 of transforming the OmniDrive Workspace into a more "enterprise" experience. Phase 1 focuses on the foundation and navigation, specifically upgrading the Workspace Sidebar to a premium "Notion/Linear" style tree and introducing a rich header with tabs in the main view.

## Scope
This phase covers:
1. Refactoring the `WorkspacesPage` to use smaller, focused components.
2. Upgrading the `WorkspaceSidebar` with expand/collapse logic and hover context menus.
3. Creating a new `WorkspaceMainView` with breadcrumbs, a large hero header, and a seamless tab structure.

*Note: Phase 2 (Data Density), Phase 3 (Access & Permissions), and Phase 4 (Activity & Auditing) will be handled in subsequent specs.*

## Architecture & Component Structure

We will split the current `WorkspacesPage.tsx` into the following component hierarchy:

- **`WorkspacesPage.tsx`**: The main container. Manages the overall workspace tree data and `activeFolderId`.
- **`WorkspaceSidebar.tsx`**: The left navigation pane.
  - **`WorkspaceTreeNode.tsx`** (New): A recursive component to handle individual folder states (expanded/collapsed, hover menus).
- **`WorkspaceMainView.tsx`** (New): The right main content area.
  - **Breadcrumbs**: Calculates and displays the path based on `activeFolderId`.
  - **Hero Header**: Displays the `activeFolderId` name and primary actions (Sync, New Folder).
  - **Tabs Navigation**: A row of tabs (`Files`, `Members`, `Settings`).
  - **`WorkspaceFilesTab.tsx`** (New): Wraps the existing `FileGrid` and manages fetching folder contents.
  - **`WorkspaceMembersTab.tsx`** & **`WorkspaceSettingsTab.tsx`** (New): Placeholder "Coming Soon" components for future phases.

## Sidebar Tree Interaction & State Management

To achieve a premium, minimalist feel:
- **Expand/Collapse**: A local `Set` in `WorkspaceSidebar` tracks expanded folder IDs. Clicking a small chevron toggles expansion without selecting the folder.
- **Selection**: Clicking the folder name selects it (setting it active) and automatically expands it.
- **Context Menu**: A subtle `...` button appears on hover. Clicking it opens a portal-based dropdown with: "New Sub-workspace", "Rename", and "Delete".
- **Styling**: Minimalist. Neutral text (`text-gray-700`), darker on active (`text-gray-900`, `font-medium`). Subtle hover highlights (`bg-gray-100`) and active highlights (`bg-gray-200` or a very soft blue).

## Main View Layout & Routing

- **Breadcrumbs**: Displayed at the top left. Clickable parts to navigate up the hierarchy.
- **Header**: A prominent `<h1 className="text-3xl font-semibold">` for the workspace title. Actions like "Sync" sit to the right.
- **Tabs**: Seamless, text-based tabs beneath the title. The active tab has a subtle underline (`border-b-2 border-black`).
- **Content Area**: A scrollable container that renders the content of the active tab.

## Error Handling & Edge Cases
- **Empty State**: If no workspaces exist, the sidebar displays an empty state, and the main view prompts the user to create one.
- **Deleted Workspace**: If the active workspace is deleted via the context menu, the `activeFolderId` should reset to `null`.
