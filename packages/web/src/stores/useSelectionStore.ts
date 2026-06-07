import { create } from 'zustand';
import type { FileEntry, DriveFolder } from '../types';

export type SelectedItem = 
  | { type: 'file'; item: FileEntry }
  | { type: 'folder'; item: DriveFolder };

interface SelectionState {
  selectedItem: SelectedItem | null;
  setSelection: (item: SelectedItem | null) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedItem: null,
  setSelection: (item) => set({ selectedItem: item }),
  clearSelection: () => set({ selectedItem: null }),
}));
