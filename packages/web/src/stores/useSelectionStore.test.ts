import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore } from './useSelectionStore';
import type { FileEntry } from '../types';

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedItem: null });
  });

  it('adds and clears selection', () => {
    const dummyFile = { id: 'file-1', name: 'File 1' } as FileEntry;
    useSelectionStore.getState().setSelection({ type: 'file', item: dummyFile });
    expect(useSelectionStore.getState().selectedItem).toEqual({ type: 'file', item: dummyFile });

    useSelectionStore.getState().clearSelection();
    expect(useSelectionStore.getState().selectedItem).toBeNull();
  });
});
