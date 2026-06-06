# Unified Drive Files View with Gmail Badges

## 1. Overview
The goal of this feature is to replace the dual-tab "Virtual Folders" and "Drive Files" architecture with a single, unified view. This "Merged Roots" approach aggregates all files and folders from all connected Google Drive accounts into one seamless interface at the root level. To distinguish file ownership, aesthetic and dynamic Gmail account badges using glassmorphism will be applied to every file and folder card.

## 2. Architecture & Data Flow

### 2.1 Root Level Merging
- When the user visits the root directory (`folderId === 'root'` or `undefined`), the system will execute parallel requests (`Promise.all`) to fetch contents from all connected drives.
- The results (arrays of folders and files) will be concatenated into a unified `displayFolders` and `displayFiles` array.
- **Error Resilience:** If a specific drive's API request fails (e.g., due to an expired token or network error), the failure will be caught individually. That drive will simply return an empty result and trigger a non-blocking toast notification, ensuring the rest of the functional drives are still displayed.

### 2.2 Sub-folder Navigation
- At the root level, folders from different drives may share the same name. They will be rendered as separate folder cards.
- To maintain context when navigating into a sub-folder, the application needs to know which specific drive the folder belongs to.
- The routing or state will be updated to carry the `driveId` context. When navigating to `/folders/:folderId?driveId=XYZ` (or maintaining `activeDriveId` in the store), the subsequent data fetching will strictly target that single drive.

## 3. UI/UX & Components

### 3.1 Badge Design & Glassmorphism
- **Avatar Badges:** `FileCard` and `FolderCard` components will be updated to accept a `driveEmail` and `driveColor` prop.
- A small circular avatar (displaying the first letter of the email) will be positioned at the top right of the card.
- The avatar will utilize a `backdrop-filter: blur()` (glassmorphism) effect to blend elegantly with the card's background.
- **Color Coding:** Consistent color assignment per account (e.g., based on the drive index or a hash of the email string) to provide immediate visual context.

### 3.2 Micro-interactions
- **Tooltip:** Hovering over the avatar badge will trigger a modern, smooth fade-in tooltip displaying the full Gmail address.

### 3.3 Breadcrumb Adjustments
- The root breadcrumb will be labeled **"All Drives"**.
- When navigating into a specific account's sub-folder, the breadcrumb will reflect the path (e.g., `All Drives > Documents`). The breadcrumb item may include a subtle visual indicator (like a colored dot) matching the account's assigned color.

## 4. Code Cleanup
- The existing "Virtual Folders" logic, UI tabs, and associated state inside `fileStore.ts` and `FilesPage.tsx` will be completely removed.
- `FilesPage.tsx` will transition into utilizing an upgraded, unified version of the `DriveFolderBrowser` logic.

## 5. Scope & Self-Review
- **Scope Check:** This design cleanly addresses the removal of the virtual folders and the introduction of a unified root view. It is small and focused enough for a single implementation plan.
- **Ambiguity:** Clarified that sub-folders do NOT merge. Merging only happens at the exact 'root' level.
- **Placeholder Check:** None. All requirements are explicit.
