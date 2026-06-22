/**
 * Tests for CategoriesContext.
 */
jest.mock('../storage/database');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as db from '../storage/database';
import { DataProvider, useDataReset } from '../context/DataContext';
import { CategoriesProvider, useCategories } from '../context/CategoriesContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <CategoriesProvider>{children}</CategoriesProvider>
    </DataProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (db.getAllCategories as jest.Mock).mockResolvedValue([]);
  (db.addCategory as jest.Mock).mockResolvedValue(undefined);
  (db.removeCategory as jest.Mock).mockResolvedValue(undefined);
  (db.clearCategories as jest.Mock).mockResolvedValue(undefined);
});

describe('useCategories', () => {
  it('loads categories from the database on mount', async () => {
    (db.getAllCategories as jest.Mock).mockResolvedValue(['Chest', 'Back']);
    const { result } = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toHaveLength(2));
    expect(result.current.categories).toEqual(['Chest', 'Back']);
  });

  it('starts with an empty list when DB returns nothing', async () => {
    const { result } = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toEqual([]));
  });

  it('addCategory appends to the list and calls db.addCategory', async () => {
    const { result } = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toEqual([]));

    await act(async () => result.current.addCategory('Shoulders'));
    await waitFor(() => expect(result.current.categories).toContain('Shoulders'));
    expect(db.addCategory).toHaveBeenCalledWith('Shoulders');
  });

  it('addCategory trims whitespace', async () => {
    const { result } = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toEqual([]));

    await act(async () => result.current.addCategory('  Legs  '));
    await waitFor(() => expect(result.current.categories).toContain('Legs'));
    expect(db.addCategory).toHaveBeenCalledWith('Legs');
  });

  it('addCategory is a no-op for empty/blank strings', async () => {
    const { result } = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toEqual([]));

    await act(async () => result.current.addCategory('   '));
    await waitFor(() => expect(result.current.categories).toHaveLength(0));
    expect(db.addCategory).not.toHaveBeenCalled();
  });

  it('addCategory ignores case-insensitive duplicates', async () => {
    (db.getAllCategories as jest.Mock).mockResolvedValue(['Chest']);
    const { result } = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toContain('Chest'));

    await act(async () => result.current.addCategory('chest'));
    await waitFor(() => expect(result.current.categories).toHaveLength(1));
    expect(db.addCategory).not.toHaveBeenCalled();
  });

  it('removeCategory removes from the list and calls db.removeCategory', async () => {
    (db.getAllCategories as jest.Mock).mockResolvedValue(['Chest', 'Back']);
    const { result } = await renderHook(() => useCategories(), { wrapper });
    await waitFor(() => expect(result.current.categories).toHaveLength(2));

    await act(async () => result.current.removeCategory('Chest'));
    await waitFor(() => expect(result.current.categories).not.toContain('Chest'));
    expect(result.current.categories).toContain('Back');
    expect(db.removeCategory).toHaveBeenCalledWith('Chest');
  });

  it('clears categories when clearCategory("categories") is called', async () => {
    (db.getAllCategories as jest.Mock).mockResolvedValue(['Chest', 'Back']);
    const { result } = await renderHook(
      () => ({ categories: useCategories(), data: useDataReset() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.categories.categories).toHaveLength(2));

    await act(async () => result.current.data.clearCategory('categories'));
    await waitFor(() => expect(db.clearCategories).toHaveBeenCalled());
    await waitFor(() => expect(result.current.categories.categories).toHaveLength(0));
  });
});
