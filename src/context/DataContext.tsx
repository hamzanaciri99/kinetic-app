import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

export type ClearableCategory = 'workouts' | 'meals' | 'gallery' | 'categories' | 'weight';

export const CLEARABLE_CATEGORIES: { key: ClearableCategory; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'workouts', label: 'Workout Logs & Programs', icon: 'fitness-center' },
  { key: 'meals', label: 'Meal & Nutrition Logs', icon: 'restaurant' },
  { key: 'gallery', label: 'Progress Photos', icon: 'photo-library' },
  { key: 'categories', label: 'Photo Categories', icon: 'sell' },
  { key: 'weight', label: 'Body Weight Log', icon: 'monitor-weight' },
];

type DataContextValue = {
  resetTokens: Record<ClearableCategory, number>;
  clearCategory: (category: ClearableCategory) => void;
};

const EMPTY_TOKENS: Record<ClearableCategory, number> = { workouts: 0, meals: 0, gallery: 0, categories: 0, weight: 0 };

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [resetTokens, setResetTokens] = useState<Record<ClearableCategory, number>>(EMPTY_TOKENS);

  const clearCategory = useCallback((category: ClearableCategory) => {
    setResetTokens((prev) => ({ ...prev, [category]: prev[category] + 1 }));
  }, []);

  const value = useMemo<DataContextValue>(() => ({ resetTokens, clearCategory }), [resetTokens, clearCategory]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataReset() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataReset must be used within a DataProvider');
  return ctx;
}

/** Runs `onReset` whenever the given category's data is cleared (skips the initial mount). */
export function useClearOnReset(category: ClearableCategory, onReset: () => void) {
  const { resetTokens } = useDataReset();
  const token = resetTokens[category];
  const mounted = useRef(false);
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onResetRef.current();
  }, [token]);
}
