import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import * as db from '../storage/database';

type CategoriesContextValue = {
  categories: string[];
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    db.getAllCategories().then(setCategories).catch(() => {});
  }, []);

  useClearOnReset('categories', () => {
    db.clearCategories()
      .then(() => setCategories([]))
      .catch(() => setCategories([]));
  });

  const value = useMemo<CategoriesContextValue>(
    () => ({
      categories,
      addCategory: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
        db.addCategory(trimmed).catch(() => {});
        setCategories((prev) => [...prev, trimmed]);
      },
      removeCategory: (name) => {
        db.removeCategory(name).catch(() => {});
        setCategories((prev) => prev.filter((c) => c !== name));
      },
    }),
    [categories],
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within a CategoriesProvider');
  return ctx;
}
