import { create } from 'zustand';

interface SelectionState {
  selectedIds: string[];
  addSelection: (id: string) => void;
  removeSelection: (id: string) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: [],
  addSelection: (id) => set((state) => ({ selectedIds: [...state.selectedIds, id] })),
  removeSelection: (id) => set((state) => ({ selectedIds: state.selectedIds.filter(itemId => itemId !== id) })),
  clearSelection: () => set({ selectedIds: [] }),
}));
