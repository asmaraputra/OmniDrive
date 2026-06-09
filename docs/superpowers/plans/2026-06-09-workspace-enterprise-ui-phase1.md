# Workspace Enterprise UI Refinement Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Workspaces UI into an enterprise-grade experience by introducing a "Notion/Linear" style sidebar tree and a rich main view with breadcrumbs and tabs.

**Architecture:** We are breaking down `WorkspacesPage.tsx` into smaller, focused components: `WorkspaceTreeNode`, `WorkspaceSidebar`, `WorkspaceMainView`, and Tab components (`WorkspaceFilesTab`, `WorkspaceMembersTab`, `WorkspaceSettingsTab`).

**Tech Stack:** React, TailwindCSS, Lucide React, Zustand, Vitest + React Testing Library

---

### Task 1: Create Placeholder Tab Components

**Files:**
- Create: `packages/web/src/components/workspaces/WorkspaceMembersTab.tsx`
- Create: `packages/web/src/components/workspaces/WorkspaceSettingsTab.tsx`
- Create: `packages/web/src/components/workspaces/WorkspaceFilesTab.tsx`
- Test: `packages/web/tests/components/workspaces/WorkspaceTabs.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/web/tests/components/workspaces/WorkspaceTabs.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceMembersTab } from '../../../src/components/workspaces/WorkspaceMembersTab';
import { WorkspaceSettingsTab } from '../../../src/components/workspaces/WorkspaceSettingsTab';
import { WorkspaceFilesTab } from '../../../src/components/workspaces/WorkspaceFilesTab';

// Mock FileGrid to avoid complex dependencies
vi.mock('../../../src/components/files/FileGrid', () => ({
  FileGrid: () => <div data-testid="file-grid-mock">FileGrid Mock</div>
}));

describe('Workspace Tab Components', () => {
  it('renders Members tab placeholder', () => {
    render(<WorkspaceMembersTab />);
    expect(screen.getByText('Members (Coming Soon)')).toBeDefined();
  });

  it('renders Settings tab placeholder', () => {
    render(<WorkspaceSettingsTab />);
    expect(screen.getByText('Settings (Coming Soon)')).toBeDefined();
  });

  it('renders Files tab with FileGrid mock', () => {
    const mockProps = {
      files: [], subfolders: [], getDriveInfo: vi.fn(), onNavigateFolder: vi.fn(),
      onPreviewFile: vi.fn(), onShare: vi.fn(), onRenameFile: vi.fn(), onDeleteFile: vi.fn(),
      onMoveDrive: vi.fn(), isTargetShared: vi.fn(), errorDrives: new Set<string>(), onViewInfo: vi.fn()
    };
    render(<WorkspaceFilesTab {...mockProps} />);
    expect(screen.getByTestId('file-grid-mock')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run tests/components/workspaces/WorkspaceTabs.test.tsx`
Expected: FAIL due to missing files.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/web/src/components/workspaces/WorkspaceMembersTab.tsx
export function WorkspaceMembersTab() {
  return (
    <div className="flex items-center justify-center h-full p-12 text-gray-500">
      <p>Members (Coming Soon)</p>
    </div>
  );
}
```

```tsx
// packages/web/src/components/workspaces/WorkspaceSettingsTab.tsx
export function WorkspaceSettingsTab() {
  return (
    <div className="flex items-center justify-center h-full p-12 text-gray-500">
      <p>Settings (Coming Soon)</p>
    </div>
  );
}
```

```tsx
// packages/web/src/components/workspaces/WorkspaceFilesTab.tsx
import { FileGrid } from '../files/FileGrid';
import type { FileEntry, WorkspaceFolder, DriveFolder } from '../../types';

interface WorkspaceFilesTabProps {
  files: FileEntry[];
  subfolders: WorkspaceFolder[];
  getDriveInfo: (id: string | null) => { drive: any; index: number };
  onNavigateFolder: (id: string) => void;
  onPreviewFile: (file: FileEntry) => void;
  onShare: (item: FileEntry | WorkspaceFolder | DriveFolder, type: 'file' | 'folder') => void;
  onRenameFile: (file: FileEntry) => void;
  onDeleteFile: (id: string) => void;
  onMoveDrive: (item: FileEntry | WorkspaceFolder | DriveFolder, type: 'file' | 'folder') => void;
  isTargetShared: (id: string | null) => boolean;
  errorDrives: Set<string>;
  onViewInfo: (item: FileEntry | WorkspaceFolder | DriveFolder, type: 'file' | 'folder') => void;
}

export function WorkspaceFilesTab(props: WorkspaceFilesTabProps) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <FileGrid {...props} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run tests/components/workspaces/WorkspaceTabs.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Run: `rtk git add packages/web/src/components/workspaces packages/web/tests && rtk git commit -m "feat(workspaces): add workspace tab components"`

---

### Task 2: Create WorkspaceMainView Component

**Files:**
- Create: `packages/web/src/components/workspaces/WorkspaceMainView.tsx`
- Test: `packages/web/tests/components/workspaces/WorkspaceMainView.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/web/tests/components/workspaces/WorkspaceMainView.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceMainView } from '../../../src/components/workspaces/WorkspaceMainView';

vi.mock('../../../src/components/workspaces/WorkspaceFilesTab', () => ({
  WorkspaceFilesTab: () => <div data-testid="files-tab">Files Tab Content</div>
}));
vi.mock('../../../src/components/workspaces/WorkspaceMembersTab', () => ({
  WorkspaceMembersTab: () => <div data-testid="members-tab">Members Tab Content</div>
}));
vi.mock('../../../src/components/workspaces/WorkspaceSettingsTab', () => ({
  WorkspaceSettingsTab: () => <div data-testid="settings-tab">Settings Tab Content</div>
}));

describe('WorkspaceMainView', () => {
  const mockProps = {
    activeFolder: { id: '1', name: 'Engineering', workspaceId: 'w1', parentId: null, icon: null, color: null, isStarred: false, createdAt: '', updatedAt: '' },
    path: [{ id: '1', name: 'Engineering' }],
    onCreateFolder: vi.fn(),
    onSync: vi.fn(),
    isSyncing: false,
    fileTabProps: {
      files: [], subfolders: [], getDriveInfo: vi.fn(), onNavigateFolder: vi.fn(),
      onPreviewFile: vi.fn(), onShare: vi.fn(), onRenameFile: vi.fn(), onDeleteFile: vi.fn(),
      onMoveDrive: vi.fn(), isTargetShared: vi.fn(), errorDrives: new Set<string>(), onViewInfo: vi.fn()
    }
  };

  it('renders breadcrumbs and title', () => {
    render(<WorkspaceMainView {...mockProps} />);
    expect(screen.getByText('Engineering')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Engineering' })).toBeDefined();
  });

  it('switches tabs correctly', () => {
    render(<WorkspaceMainView {...mockProps} />);
    expect(screen.getByTestId('files-tab')).toBeDefined();
    
    fireEvent.click(screen.getByText('Members'));
    expect(screen.getByTestId('members-tab')).toBeDefined();
    
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByTestId('settings-tab')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run tests/components/workspaces/WorkspaceMainView.test.tsx`
Expected: FAIL due to missing component.

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/web/src/components/workspaces/WorkspaceMainView.tsx
import { useState } from 'react';
import { FolderPlus, RefreshCw, ChevronRight } from 'lucide-react';
import type { WorkspaceFolder, BreadcrumbItem } from '../../types';
import { WorkspaceFilesTab } from './WorkspaceFilesTab';
import { WorkspaceMembersTab } from './WorkspaceMembersTab';
import { WorkspaceSettingsTab } from './WorkspaceSettingsTab';

interface WorkspaceMainViewProps {
  activeFolder: WorkspaceFolder | null;
  path: BreadcrumbItem[];
  onCreateFolder: () => void;
  onSync: () => void;
  isSyncing: boolean;
  fileTabProps: any; // Type omitted for brevity, it's passed directly to WorkspaceFilesTab
}

export function WorkspaceMainView({ 
  activeFolder, path, onCreateFolder, onSync, isSyncing, fileTabProps 
}: WorkspaceMainViewProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'members' | 'settings'>('files');

  if (!activeFolder) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50 border-l border-gray-200">
        Select or create a Workspace to get started.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header Area */}
      <div className="px-8 pt-8 pb-4 border-b border-gray-200 flex flex-col gap-4">
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-gray-500 gap-2">
          {path.map((item, index) => (
            <div key={item.id || index} className="flex items-center gap-2">
              <span className="hover:text-gray-900 cursor-pointer">{item.name}</span>
              {index < path.length - 1 && <ChevronRight size={14} />}
            </div>
          ))}
        </div>

        {/* Title & Actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-gray-900">{activeFolder.name}</h1>
          <div className="flex gap-2">
            <button onClick={onCreateFolder} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <FolderPlus size={16} /> New Folder
            </button>
            <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> Sync
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mt-4">
          {(['files', 'members', 'settings'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-gray-900 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {activeTab === 'files' && <WorkspaceFilesTab {...fileTabProps} />}
        {activeTab === 'members' && <WorkspaceMembersTab />}
        {activeTab === 'settings' && <WorkspaceSettingsTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run tests/components/workspaces/WorkspaceMainView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Run: `rtk git add packages/web/src/components/workspaces packages/web/tests && rtk git commit -m "feat(workspaces): add workspace main view with tabs"`

---

### Task 3: Create WorkspaceTreeNode Component

**Files:**
- Create: `packages/web/src/components/workspaces/WorkspaceTreeNode.tsx`
- Test: `packages/web/tests/components/workspaces/WorkspaceTreeNode.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/web/tests/components/workspaces/WorkspaceTreeNode.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceTreeNode } from '../../../src/components/workspaces/WorkspaceTreeNode';

describe('WorkspaceTreeNode', () => {
  const mockFolder = { id: '1', name: 'Engineering', workspaceId: 'w1', parentId: null, icon: null, color: null, isStarred: false, createdAt: '', updatedAt: '' };
  
  it('renders and responds to clicks', () => {
    const onSelect = vi.fn();
    const onToggle = vi.fn();
    render(
      <WorkspaceTreeNode 
        folder={mockFolder} level={0} isExpanded={false} isActive={false} 
        hasChildren={true} onSelect={onSelect} onToggle={onToggle}
        onRename={vi.fn()} onDelete={vi.fn()} onNewSubfolder={vi.fn()}
      />
    );
    
    // Toggle click
    fireEvent.click(screen.getByTestId('tree-node-toggle-1'));
    expect(onToggle).toHaveBeenCalledWith('1');

    // Select click
    fireEvent.click(screen.getByText('Engineering'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/web && npx vitest run tests/components/workspaces/WorkspaceTreeNode.test.tsx`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```tsx
// packages/web/src/components/workspaces/WorkspaceTreeNode.tsx
import { useState } from 'react';
import { ChevronRight, ChevronDown, MoreHorizontal, FolderPlus, Edit2, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { WorkspaceFolder } from '../../types';

interface WorkspaceTreeNodeProps {
  folder: WorkspaceFolder;
  level: number;
  isExpanded: boolean;
  isActive: boolean;
  hasChildren: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onNewSubfolder: (parentId: string) => void;
}

export function WorkspaceTreeNode({
  folder, level, isExpanded, isActive, hasChildren,
  onSelect, onToggle, onRename, onDelete, onNewSubfolder
}: WorkspaceTreeNodeProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`flex items-center justify-between px-2 py-1.5 mx-2 rounded-md cursor-pointer transition-colors ${
          isActive ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${level * 0.75 + 0.5}rem` }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1" onClick={() => onSelect(folder.id)}>
          <button 
            data-testid={`tree-node-toggle-${folder.id}`}
            onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }}
            className="p-0.5 rounded hover:bg-gray-200 text-gray-400"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <div className="w-[14px]" /> // Spacer
            )}
          </button>
          <span className="truncate text-sm">{folder.name}</span>
        </div>

        {isHovered && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()} 
                className="p-1 rounded hover:bg-gray-200 text-gray-500"
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-[160px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50">
                <DropdownMenu.Item onClick={() => onNewSubfolder(folder.id)} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:outline-none rounded cursor-pointer">
                  <FolderPlus size={14} /> New Sub-folder
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => onRename(folder.id)} className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:outline-none rounded cursor-pointer">
                  <Edit2 size={14} /> Rename
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                <DropdownMenu.Item onClick={() => onDelete(folder.id)} className="flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 hover:outline-none rounded cursor-pointer">
                  <Trash2 size={14} /> Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/web && npx vitest run tests/components/workspaces/WorkspaceTreeNode.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Run: `rtk git add packages/web/src/components/workspaces packages/web/tests && rtk git commit -m "feat(workspaces): add workspace tree node component"`

---

### Task 4: Refactor WorkspaceSidebar

**Files:**
- Modify: `packages/web/src/components/workspaces/WorkspaceSidebar.tsx:1-46`

- [ ] **Step 1: Replace implementation**

```tsx
// packages/web/src/components/workspaces/WorkspaceSidebar.tsx
import { useState, useCallback } from 'react';
import type { WorkspaceFolder } from '../../types';
import { WorkspaceTreeNode } from './WorkspaceTreeNode';

interface WorkspaceSidebarProps {
  folders: WorkspaceFolder[];
  activeFolderId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onNewSubfolder: (parentId: string) => void;
}

export function WorkspaceSidebar({ 
  folders, activeFolderId, onSelect, onRename, onDelete, onNewSubfolder 
}: WorkspaceSidebarProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    onSelect(id);
    setExpandedIds(prev => new Set([...prev, id])); // Auto-expand on select
  }, [onSelect]);

  const rootFolders = folders.filter(f => !f.parentId);

  const renderTree = (folderList: WorkspaceFolder[], level: number = 0) => {
    return folderList.map(folder => {
      const children = folders.filter(f => f.parentId === folder.id);
      const isActive = activeFolderId === folder.id;
      const isExpanded = expandedIds.has(folder.id);

      return (
        <div key={folder.id}>
          <WorkspaceTreeNode
            folder={folder}
            level={level}
            isExpanded={isExpanded}
            isActive={isActive}
            hasChildren={children.length > 0}
            onSelect={handleSelect}
            onToggle={handleToggle}
            onRename={onRename}
            onDelete={onDelete}
            onNewSubfolder={onNewSubfolder}
          />
          {isExpanded && children.length > 0 && renderTree(children, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50/50 flex flex-col h-full overflow-y-auto py-4">
      <div className="px-4 mb-2 flex items-center justify-between group">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workspaces</h3>
      </div>
      <div className="flex-1">
        {rootFolders.length === 0 ? (
          <p className="px-4 text-sm text-gray-500 italic">No workspaces yet.</p>
        ) : (
          renderTree(rootFolders)
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check compiler errors**
Run `cd packages/web && npx tsc --noEmit` to verify type safety.

- [ ] **Step 3: Commit**

Run: `rtk git add packages/web/src/components/workspaces/WorkspaceSidebar.tsx && rtk git commit -m "refactor(workspaces): upgrade sidebar to notion-style tree"`

---

### Task 5: Refactor WorkspacesPage to use new components

**Files:**
- Modify: `packages/web/src/pages/WorkspacesPage.tsx`

- [ ] **Step 1: Replace implementation**

```tsx
// packages/web/src/pages/WorkspacesPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import type { WorkspaceFolder, FileEntry, DriveFolder, BreadcrumbItem } from '../types';
import { WorkspaceSidebar } from '../components/workspaces/WorkspaceSidebar';
import { WorkspaceMainView } from '../components/workspaces/WorkspaceMainView';
import { useToastStore } from '../stores/toastStore';
import { useSelectionStore, type SelectedItem } from '../stores/useSelectionStore';
import { useUIStore } from '../stores/useUIStore';

export function WorkspacesPage() {
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [subfolders, setSubfolders] = useState<WorkspaceFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const addToast = useToastStore(state => state.addToast);
  const { clearSelection, toggleSelection } = useSelectionStore();
  const setIsInfoPanelOpen = useUIStore(s => s.setIsInfoPanelOpen);

  const fetchTree = async () => {
    try {
      const res = await api.getWorkspaceTree();
      setFolders(res.folders);
    } catch {
      addToast('error', 'Failed to load workspaces');
    }
  };

  const fetchContents = async (folderId: string) => {
    setIsLoading(true);
    try {
      const res = await api.getFolderContents(folderId);
      setFiles(res.files);
      setSubfolders(res.subfolders);
    } catch {
      addToast('error', 'Failed to load folder contents');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTree(); }, []);

  useEffect(() => {
    if (activeFolderId) fetchContents(activeFolderId);
    else { setFiles([]); setSubfolders([]); }
    clearSelection();
  }, [activeFolderId, clearSelection]);

  const handleCreateFolder = async (parentId?: string) => {
    const name = prompt('New workspace name:');
    if (name?.trim()) {
      try {
        await api.createFolder(name.trim(), parentId || activeFolderId || undefined);
        fetchTree();
      } catch { addToast('error', 'Failed to create workspace'); }
    }
  };

  const handleRename = async (id: string) => {
    const name = prompt('New name:');
    if (name?.trim()) {
      try {
        await api.renameFolder(id, name.trim());
        fetchTree();
      } catch { addToast('error', 'Failed to rename workspace'); }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this workspace?')) {
      try {
        await api.deleteFolder(id);
        if (activeFolderId === id) setActiveFolderId(null);
        fetchTree();
      } catch { addToast('error', 'Failed to delete workspace'); }
    }
  };

  const handleSync = async () => {
    if (!activeFolderId) return;
    setIsSyncing(true);
    try {
      await api.syncWorkspace(activeFolderId);
      addToast('success', 'Sync started.');
      setTimeout(() => fetchContents(activeFolderId), 2000);
    } catch { addToast('error', 'Failed to start sync'); } finally { setIsSyncing(false); }
  };

  const handleViewInfo = (item: FileEntry | WorkspaceFolder | DriveFolder, type: 'file' | 'folder') => {
    clearSelection();
    toggleSelection({ type, item } as SelectedItem);
    setIsInfoPanelOpen(true);
  };

  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId) || null, [folders, activeFolderId]);

  const breadcrumbPath = useMemo(() => {
    const path: BreadcrumbItem[] = [];
    let current = activeFolder;
    while (current) {
      path.unshift({ id: current.id, name: current.name });
      current = folders.find(f => f.id === current!.parentId) || null;
    }
    return path;
  }, [activeFolder, folders]);

  const fileTabProps = {
    files, subfolders,
    getDriveInfo: () => ({ drive: null as any, index: 0 }),
    onNavigateFolder: setActiveFolderId,
    onPreviewFile: () => {}, onShare: () => {}, onRenameFile: () => {},
    onDeleteFile: async (id: string) => {
      try {
        await api.moveFile(id, null);
        addToast('success', 'Removed');
        if (activeFolderId) fetchContents(activeFolderId);
      } catch { addToast('error', 'Failed'); }
    },
    onMoveDrive: () => {}, isTargetShared: () => false, errorDrives: new Set<string>(),
    onViewInfo: handleViewInfo
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      <WorkspaceSidebar 
        folders={folders} activeFolderId={activeFolderId} onSelect={setActiveFolderId} 
        onRename={handleRename} onDelete={handleDelete} onNewSubfolder={handleCreateFolder}
      />
      <WorkspaceMainView
        activeFolder={activeFolder}
        path={breadcrumbPath}
        onCreateFolder={() => handleCreateFolder()}
        onSync={handleSync}
        isSyncing={isSyncing}
        fileTabProps={fileTabProps}
      />
    </div>
  );
}
```

- [ ] **Step 2: Check compiler errors**
Run `cd packages/web && npx tsc --noEmit` to verify type safety.

- [ ] **Step 3: Commit**

Run: `rtk git add packages/web/src/pages/WorkspacesPage.tsx && rtk git commit -m "refactor(workspaces): integrate new enterprise UI components into page"`
