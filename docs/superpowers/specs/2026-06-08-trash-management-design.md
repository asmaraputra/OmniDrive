# Trash Management Design Spec

## 1. Overview
This spec details the implementation of the Trash feature, replacing the mock sidebar link with a fully functional Trash view that allows users to restore or permanently delete files.

## 2. Backend APIs (`packages/worker/src/routes/files.ts`)
Three new endpoints will be added:
- **`GET /api/files/trash`**: Fetches all files where `is_trashed = 1` for the current user. Returns a list of `FileEntry` objects.
- **`POST /api/files/:id/restore`**: Sets `is_trashed = 0` for the specified file in the database.
- **`DELETE /api/files/:id/permanent`**: 
  1. Calls Google Drive API (`driveService.deleteFile`) to permanently delete the file from the cloud.
  2. Deletes the file record from the SQLite database.

## 3. Frontend API Client (`packages/web/src/lib/api.ts`)
Add the corresponding client functions:
- `getTrashFiles()`
- `restoreFile(id: string)`
- `deleteFilePermanent(id: string)`

## 4. UI & Routing
- **Sidebar (`packages/web/src/components/layout/Sidebar.tsx`)**: The mocked Trash div will be replaced with a `<NavLink to="/trash">` using the existing active styling logic.
- **Router (`packages/web/src/App.tsx`)**: Add `<Route path="/trash" element={<TrashPage />} />`.

## 5. TrashPage Component
- **Component (`packages/web/src/pages/TrashPage.tsx`)**: 
  - Fetches trashed files on mount.
  - Displays them using `<FileGrid isTrashView={true} files={files} ... />`.
  - Passes handlers for `onRestore` and `onPermanentDelete` which call the respective API functions, display success/error toasts, and refresh the trash list.

## 6. FileGrid Component Modification
- **`packages/web/src/components/files/FileGrid.tsx`**:
  - Add `isTrashView?: boolean` to the props.
  - Add `onRestore?: (fileId: string) => void` to the props.
  - Add `onPermanentDelete?: (fileId: string) => void` to the props.
  - When `isTrashView` is true:
    - Double-click to preview is disabled.
    - The standard context menu actions (Preview, Share, Move, Rename, standard Delete) are hidden.
    - Two new context menu actions are shown: "Restore" and "Delete Forever".
