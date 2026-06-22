/**
 * Tests for GalleryContext.
 */
jest.mock('../storage/database');
jest.mock('../storage/photos');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as db from '../storage/database';
import * as photos from '../storage/photos';
import { DataProvider, useDataReset } from '../context/DataContext';
import { GalleryProvider, useGallery, BEFORE_IMG, AFTER_IMG } from '../context/GalleryContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <GalleryProvider>{children}</GalleryProvider>
    </DataProvider>
  );
}

const makeDbItem = (overrides?: Partial<db.DbGalleryItem>): db.DbGalleryItem => ({
  id: 'gi1',
  date_label: 'JAN 15',
  local_path: 'file:///kinetic-photos/gi1.jpg',
  is_remote: 0,
  featured: 0,
  category: null,
  created_at: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (db.getAllGalleryItems as jest.Mock).mockResolvedValue([]);
  (db.getSetting as jest.Mock).mockResolvedValue(null);
  (db.insertGalleryItem as jest.Mock).mockResolvedValue(undefined);
  (db.updateGalleryItemFeatured as jest.Mock).mockResolvedValue(undefined);
  (db.clearGalleryItems as jest.Mock).mockResolvedValue(undefined);
  (db.setSetting as jest.Mock).mockResolvedValue(undefined);
  (db.deleteWeightEntry as jest.Mock).mockResolvedValue(undefined);
  (photos.savePhotoToAppDir as jest.Mock).mockImplementation(
    async (_: string, id: string) => `file:///kinetic-photos/${id}.jpg`,
  );
  (photos.deleteLocalPhoto as jest.Mock).mockResolvedValue(undefined);
});

describe('useGallery', () => {
  it('loads timeline from database on mount', async () => {
    (db.getAllGalleryItems as jest.Mock).mockResolvedValue([makeDbItem()]);
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toHaveLength(1));
    expect(result.current.timeline[0].date).toBe('JAN 15');
  });

  it('maps is_remote=1 to isRemote=true', async () => {
    (db.getAllGalleryItems as jest.Mock).mockResolvedValue([makeDbItem({ id: 'gi2', is_remote: 1 })]);
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toHaveLength(1));
    expect(result.current.timeline[0].isRemote).toBe(true);
  });

  it('maps featured=1 to featured=true', async () => {
    (db.getAllGalleryItems as jest.Mock).mockResolvedValue([makeDbItem({ featured: 1 })]);
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toHaveLength(1));
    expect(result.current.timeline[0].featured).toBe(true);
  });

  it('loads compare images from settings', async () => {
    (db.getSetting as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'gallery_compare_before') return 'file:///before.jpg';
      if (key === 'gallery_compare_after') return 'file:///after.jpg';
      return null;
    });
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.compare.before).toBe('file:///before.jpg'));
    expect(result.current.compare.after).toBe('file:///after.jpg');
  });

  it('defaults compare images to BEFORE_IMG/AFTER_IMG when no setting found', async () => {
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => {
      expect(result.current.compare.before).toBe(BEFORE_IMG);
      expect(result.current.compare.after).toBe(AFTER_IMG);
    });
  });

  it('addCapture saves file, inserts to DB, and prepends to timeline', async () => {
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toEqual([]));

    await act(async () => { await result.current.addCapture('file:///tmp/photo.jpg', 'Chest'); });
    expect(photos.savePhotoToAppDir).toHaveBeenCalledWith('file:///tmp/photo.jpg', expect.any(String));
    expect(db.insertGalleryItem).toHaveBeenCalled();
    await waitFor(() => expect(result.current.timeline).toHaveLength(1));
    expect(result.current.timeline[0].category).toBe('Chest');
  });

  it('addCapture works without a category', async () => {
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toEqual([]));

    await act(async () => { await result.current.addCapture('file:///tmp/photo.jpg'); });
    await waitFor(() => expect(result.current.timeline).toHaveLength(1));
    expect(result.current.timeline[0].category).toBeUndefined();
  });

  it('setCompareImage updates compare state and persists to DB', async () => {
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.compare.before).toBe(BEFORE_IMG));

    await act(async () => result.current.setCompareImage('before', 'file:///my-before.jpg'));
    await waitFor(() => expect(result.current.compare.before).toBe('file:///my-before.jpg'));
    expect(db.setSetting).toHaveBeenCalledWith('gallery_compare_before', 'file:///my-before.jpg');
  });

  it('toggleFeatured flips featured state and calls db.updateGalleryItemFeatured', async () => {
    (db.getAllGalleryItems as jest.Mock).mockResolvedValue([makeDbItem({ id: 'gi1', featured: 0 })]);
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toHaveLength(1));

    await act(async () => result.current.toggleFeatured('gi1'));
    await waitFor(() => expect(result.current.timeline[0].featured).toBe(true));
    expect(db.updateGalleryItemFeatured).toHaveBeenCalledWith('gi1', true);
  });

  it('toggleFeatured is a no-op for unknown id', async () => {
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toEqual([]));

    await act(async () => result.current.toggleFeatured('nonexistent'));
    expect(db.updateGalleryItemFeatured).not.toHaveBeenCalled();
  });

  it('toggleFeatured can un-feature a currently featured item', async () => {
    (db.getAllGalleryItems as jest.Mock).mockResolvedValue([makeDbItem({ featured: 1 })]);
    const { result } = await renderHook(() => useGallery(), { wrapper });
    await waitFor(() => expect(result.current.timeline).toHaveLength(1));

    await act(async () => result.current.toggleFeatured('gi1'));
    await waitFor(() => expect(result.current.timeline[0].featured).toBe(false));
    expect(db.updateGalleryItemFeatured).toHaveBeenCalledWith('gi1', false);
  });

  it('clears timeline when clearCategory("gallery") is called', async () => {
    (db.getAllGalleryItems as jest.Mock).mockResolvedValue([makeDbItem()]);
    const { result } = await renderHook(
      () => ({ gallery: useGallery(), data: useDataReset() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.gallery.timeline).toHaveLength(1));

    await act(async () => result.current.data.clearCategory('gallery'));
    await waitFor(() => expect(db.clearGalleryItems).toHaveBeenCalled());
    await waitFor(() => expect(result.current.gallery.timeline).toHaveLength(0));
  });

  it('clears deletes local photo files on reset', async () => {
    (db.getAllGalleryItems as jest.Mock).mockResolvedValue([
      makeDbItem({ id: 'gi1', is_remote: 0, local_path: 'file:///kinetic-photos/gi1.jpg' }),
    ]);
    const { result } = await renderHook(
      () => ({ gallery: useGallery(), data: useDataReset() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.gallery.timeline).toHaveLength(1));

    await act(async () => result.current.data.clearCategory('gallery'));
    await waitFor(() => expect(photos.deleteLocalPhoto).toHaveBeenCalledWith('file:///kinetic-photos/gi1.jpg'));
  });

  it('clears resets compare images to defaults', async () => {
    const { result } = await renderHook(
      () => ({ gallery: useGallery(), data: useDataReset() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.gallery.compare.before).toBe(BEFORE_IMG));

    await act(async () => result.current.gallery.setCompareImage('before', 'file:///custom.jpg'));
    await waitFor(() => expect(result.current.gallery.compare.before).toBe('file:///custom.jpg'));
    await act(async () => result.current.data.clearCategory('gallery'));
    await waitFor(() => expect(db.clearGalleryItems).toHaveBeenCalled());
    await waitFor(() => expect(result.current.gallery.compare.before).toBe(BEFORE_IMG));
  });
});
