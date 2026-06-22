import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import { makeId } from '../utils/date';
import * as db from '../storage/database';

export type WeightEntry = {
  id: string;
  date: string;
  kg: number;
};

export type WeightSeriesPoint = { date: string; kg: number };

type BodyMetricsContextValue = {
  weightEntries: WeightEntry[];
  addWeightEntry: (kg: number) => void;
  removeWeightEntry: (id: string) => void;
  latestWeight: WeightEntry | null;
  weeklySeries: WeightSeriesPoint[];
  monthlySeries: WeightSeriesPoint[];
};

const BodyMetricsContext = createContext<BodyMetricsContextValue | null>(null);

function sortedByDate(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function BodyMetricsProvider({ children }: { children: React.ReactNode }) {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);

  useEffect(() => {
    db.getAllWeightEntries()
      .then((rows) => setWeightEntries(rows.map((r) => ({ id: r.id, date: r.date, kg: r.kg }))))
      .catch(() => {});
  }, []);

  useClearOnReset('weight', () => {
    db.clearWeightEntries()
      .then(() => setWeightEntries([]))
      .catch(() => setWeightEntries([]));
  });

  const value = useMemo<BodyMetricsContextValue>(() => {
    const sorted = sortedByDate(weightEntries);
    const latestWeight = sorted.length ? sorted[sorted.length - 1] : null;

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    const weeklySeries = sorted
      .filter((e) => now - new Date(e.date).getTime() <= weekMs)
      .map((e) => ({ date: e.date, kg: e.kg }));
    const monthlySeries = sorted
      .filter((e) => now - new Date(e.date).getTime() <= monthMs)
      .map((e) => ({ date: e.date, kg: e.kg }));

    return {
      weightEntries: sorted,
      addWeightEntry: (kg) => {
        if (!Number.isFinite(kg) || kg <= 0) return;
        const id = makeId();
        const date = new Date().toISOString();
        db.insertWeightEntry({ id, date, kg }).catch(() => {});
        setWeightEntries((prev) => [...prev, { id, date, kg }]);
      },
      removeWeightEntry: (id) => {
        db.deleteWeightEntry(id).catch(() => {});
        setWeightEntries((prev) => prev.filter((e) => e.id !== id));
      },
      latestWeight,
      weeklySeries,
      monthlySeries,
    };
  }, [weightEntries]);

  return <BodyMetricsContext.Provider value={value}>{children}</BodyMetricsContext.Provider>;
}

export function useBodyMetrics() {
  const ctx = useContext(BodyMetricsContext);
  if (!ctx) throw new Error('useBodyMetrics must be used within a BodyMetricsProvider');
  return ctx;
}
