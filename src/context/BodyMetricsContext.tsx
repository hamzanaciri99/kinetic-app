import React, { createContext, useContext, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import { makeId } from '../utils/date';

export type WeightEntry = {
  id: string;
  date: string;
  kg: number;
};

function daysAgoIso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

const seedWeightEntries: WeightEntry[] = [
  { id: makeId(), date: daysAgoIso(28), kg: 84.6 },
  { id: makeId(), date: daysAgoIso(24), kg: 84.1 },
  { id: makeId(), date: daysAgoIso(19), kg: 83.7 },
  { id: makeId(), date: daysAgoIso(15), kg: 83.4 },
  { id: makeId(), date: daysAgoIso(10), kg: 83.0 },
  { id: makeId(), date: daysAgoIso(6), kg: 82.7 },
  { id: makeId(), date: daysAgoIso(3), kg: 82.6 },
  { id: makeId(), date: daysAgoIso(0), kg: 82.4 },
];

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
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>(seedWeightEntries);

  useClearOnReset('weight', () => setWeightEntries([]));

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
        setWeightEntries((prev) => [...prev, { id: makeId(), date: new Date().toISOString(), kg }]);
      },
      removeWeightEntry: (id) => {
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
