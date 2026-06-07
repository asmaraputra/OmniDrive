import { create } from 'zustand';

type ViewMode = 'list' | 'grid';
type Theme = 'light' | 'dark';

interface UIState {
  isSidebarOpen: boolean;
  isInfoPanelOpen: boolean;
  viewMode: ViewMode;
  theme: Theme;
  toggleSidebar: () => void;
  toggleInfoPanel: () => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isInfoPanelOpen: false,
  viewMode: 'list',
  theme: 'light',
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleInfoPanel: () => set((state) => ({ isInfoPanelOpen: !state.isInfoPanelOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setTheme: (theme) => set({ theme }),
}));
