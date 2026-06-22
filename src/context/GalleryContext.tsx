import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import { makeId } from '../utils/date';
import * as db from '../storage/database';
import { savePhotoToAppDir, deleteLocalPhoto } from '../storage/photos';

export type TimelineItem = {
  id: string;
  date: string;
  /** `file://` URI for captured photos, `https://` URL for seed/remote photos */
  image: string;
  /** True when the local file at `image` could not be found on disk (deleted externally) */
  photoMissing?: boolean;
  featured?: boolean;
  category?: string;
  isRemote?: boolean;
};

export const BEFORE_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCTSkse_Sa941Ox_cSeAJcqLUwbmluL_vwE2AWJ9o0yMSNssbZaYtBTpJsMwF9Xzm9O0UdRndX6zCLmJIGtF50HEYbNqaEDmjPfSbbIBvy8U1f2Ay3om7ap0DRJeie1HYZrxw70LYyDNX8vJIDSGhRGwMC3kcxZIL8kS5fyGi2v2UN-Moha_xwTtYTeOhKM9fb8KdctT7Q_W-fCH2qPK4TVxxvgBX3uan5A3FDieuNc7zxDSmAOQKOz4MzND86xx22ZcYBGOn2q5_g6';
export const AFTER_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBdY1S8ekhd5lkMeoVRRteKeELbNN-BKWa-COjlra3HOVIGqExzyP03ps6UgHkdAuFV8t7Dar7Qo6yI-kIhsQEKCXoPsB4BaG-nuiNiVqxlW3bhHsZY8V88HMM3MI3hdfdNIy0yS-P36ztUkkBYg5_6Dl2lcCG5xzB2OBfEegJQyK31aG5SaIKSLhh9qOxuFaNNsumA_bRFRchrDU2igOFeqrCJQdhDfqqI6s7f-_wGxL4K_OWgE55BhuUj-FtudPjLYHII8scw5sPN';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

function dbRowToItem(row: db.DbGalleryItem): TimelineItem {
  return {
    id: row.id,
    date: row.date_label,
    image: row.local_path,
    featured: row.featured === 1,
    category: row.category ?? undefined,
    isRemote: row.is_remote === 1,
  };
}

type GalleryContextValue = {
  timeline: TimelineItem[];
  compare: { before: string; after: string };
  addCapture: (tempUri: string, category?: string) => Promise<void>;
  setCompareImage: (slot: 'before' | 'after', image: string) => void;
  toggleFeatured: (id: string) => void;
};

const GalleryContext = createContext<GalleryContextValue | null>(null);

/** Holds progress-photo timeline + before/after compare state at the provider level. */
export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [compare, setCompare] = useState({ before: BEFORE_IMG, after: AFTER_IMG });

  useEffect(() => {
    Promise.all([
      db.getAllGalleryItems(),
      db.getSetting('gallery_compare_before'),
      db.getSetting('gallery_compare_after'),
    ])
      .then(([rows, before, after]) => {
        setTimeline(rows.map(dbRowToItem));
        setCompare({
          before: before ?? BEFORE_IMG,
          after: after ?? AFTER_IMG,
        });
      })
      .catch(() => {});
  }, []);

  useClearOnReset('gallery', () => {
    // Delete all local photo files (non-remote) before clearing rows
    timeline.forEach((item) => {
      if (!item.isRemote) deleteLocalPhoto(item.image).catch(() => {});
    });
    db.clearGalleryItems()
      .then(() => {
        setTimeline([]);
        setCompare({ before: BEFORE_IMG, after: AFTER_IMG });
        return Promise.all([
          db.setSetting('gallery_compare_before', BEFORE_IMG),
          db.setSetting('gallery_compare_after', AFTER_IMG),
        ]);
      })
      .catch(() => {
        setTimeline([]);
        setCompare({ before: BEFORE_IMG, after: AFTER_IMG });
      });
  });

  const value = useMemo<GalleryContextValue>(
    () => ({
      timeline,
      compare,
      addCapture: async (tempUri, category) => {
        const id = makeId();
        const localPath = await savePhotoToAppDir(tempUri, id);
        const now = new Date().toISOString();
        const dbRow: db.DbGalleryItem = {
          id,
          date_label: todayLabel(),
          local_path: localPath,
          is_remote: 0,
          featured: 0,
          category: category ?? null,
          created_at: now,
        };
        await db.insertGalleryItem(dbRow);
        setTimeline((prev) => [{ id, date: todayLabel(), image: localPath, featured: false, category, isRemote: false }, ...prev]);
      },
      setCompareImage: (slot, image) => {
        db.setSetting(`gallery_compare_${slot}`, image).catch(() => {});
        setCompare((prev) => ({ ...prev, [slot]: image }));
      },
      toggleFeatured: (id) => {
        const item = timeline.find((t) => t.id === id);
        if (!item) return;
        const next = !item.featured;
        db.updateGalleryItemFeatured(id, next).catch(() => {});
        setTimeline((prev) => prev.map((t) => (t.id === id ? { ...t, featured: next } : t)));
      },
    }),
    [timeline, compare],
  );

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error('useGallery must be used within a GalleryProvider');
  return ctx;
}
