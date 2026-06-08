import React, { createContext, useContext, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';

const DEFAULT_CATEGORIES = ['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Full Body'];

type CategoriesContextValue = {
  categories: string[];
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useClearOnReset('categories', () => setCategories(DEFAULT_CATEGORIES));

  const value = useMemo<CategoriesContextValue>(
    () => ({
      categories,
      addCategory: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setCategories((prev) => (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]));
      },
      removeCategory: (name) => {
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
