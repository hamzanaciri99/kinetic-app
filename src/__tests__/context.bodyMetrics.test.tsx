/**
 * Tests for BodyMetricsContext.
 */
jest.mock('../storage/database');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as db from '../storage/database';
import { DataProvider, useDataReset } from '../context/DataContext';
import { BodyMetricsProvider, useBodyMetrics } from '../context/BodyMetricsContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <BodyMetricsProvider>{children}</BodyMetricsProvider>
    </DataProvider>
  );
}

const now = Date.now();
const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
const weekAgo = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString();
const monthAgo = new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString();
const oldDate = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

const makeDbEntry = (id: string, kg: number, date: string): db.DbWeightEntry => ({ id, date, kg });

beforeEach(() => {
  jest.clearAllMocks();
  (db.getAllWeightEntries as jest.Mock).mockResolvedValue([]);
  (db.insertWeightEntry as jest.Mock).mockResolvedValue(undefined);
  (db.deleteWeightEntry as jest.Mock).mockResolvedValue(undefined);
  (db.clearWeightEntries as jest.Mock).mockResolvedValue(undefined);
});

describe('useBodyMetrics', () => {
  it('loads weight entries from database on mount', async () => {
    (db.getAllWeightEntries as jest.Mock).mockResolvedValue([makeDbEntry('we1', 80, dayAgo)]);
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(1));
    expect(result.current.weightEntries[0].kg).toBe(80);
  });

  it('latestWeight is null when no entries exist', async () => {
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.latestWeight).toBeNull());
  });

  it('latestWeight returns the most recent entry', async () => {
    (db.getAllWeightEntries as jest.Mock).mockResolvedValue([
      makeDbEntry('we1', 82, weekAgo),
      makeDbEntry('we2', 80, dayAgo),
    ]);
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(2));
    expect(result.current.latestWeight?.kg).toBe(80);
  });

  it('weightEntries are sorted by date ascending', async () => {
    (db.getAllWeightEntries as jest.Mock).mockResolvedValue([
      makeDbEntry('we2', 80, dayAgo),
      makeDbEntry('we1', 82, weekAgo),
    ]);
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(2));
    expect(result.current.weightEntries[0].kg).toBe(82);
    expect(result.current.weightEntries[1].kg).toBe(80);
  });

  it('weeklySeries contains only entries from last 7 days', async () => {
    (db.getAllWeightEntries as jest.Mock).mockResolvedValue([
      makeDbEntry('we1', 82, weekAgo),
      makeDbEntry('we2', 80, dayAgo),
      makeDbEntry('we3', 75, oldDate),
    ]);
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(3));
    expect(result.current.weeklySeries).toHaveLength(2);
    expect(result.current.weeklySeries.find((e) => e.kg === 75)).toBeUndefined();
  });

  it('monthlySeries contains only entries from last 30 days', async () => {
    (db.getAllWeightEntries as jest.Mock).mockResolvedValue([
      makeDbEntry('we1', 82, weekAgo),
      makeDbEntry('we2', 80, monthAgo),
      makeDbEntry('we3', 75, oldDate),
    ]);
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(3));
    expect(result.current.monthlySeries).toHaveLength(2);
    expect(result.current.monthlySeries.find((e) => e.kg === 75)).toBeUndefined();
  });

  it('addWeightEntry adds to the list and calls db.insertWeightEntry', async () => {
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toEqual([]));

    await act(async () => result.current.addWeightEntry(85));
    await waitFor(() => expect(result.current.weightEntries.some((e) => e.kg === 85)).toBe(true));
    expect(db.insertWeightEntry).toHaveBeenCalledWith(expect.objectContaining({ kg: 85 }));
  });

  it('addWeightEntry ignores non-positive values', async () => {
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toEqual([]));

    await act(async () => result.current.addWeightEntry(-10));
    await act(async () => result.current.addWeightEntry(0));
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(0));
    expect(db.insertWeightEntry).not.toHaveBeenCalled();
  });

  it('removeWeightEntry removes from the list and calls db.deleteWeightEntry', async () => {
    (db.getAllWeightEntries as jest.Mock).mockResolvedValue([makeDbEntry('we1', 80, dayAgo)]);
    const { result } = await renderHook(() => useBodyMetrics(), { wrapper });
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(1));

    await act(async () => result.current.removeWeightEntry('we1'));
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(0));
    expect(db.deleteWeightEntry).toHaveBeenCalledWith('we1');
  });

  it('clears entries when clearCategory("weight") is called', async () => {
    (db.getAllWeightEntries as jest.Mock).mockResolvedValue([makeDbEntry('we1', 80, dayAgo)]);
    const { result } = await renderHook(
      () => ({ body: useBodyMetrics(), data: useDataReset() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.body.weightEntries).toHaveLength(1));

    await act(async () => result.current.data.clearCategory('weight'));
    await waitFor(() => expect(db.clearWeightEntries).toHaveBeenCalled());
    await waitFor(() => expect(result.current.body.weightEntries).toHaveLength(0));
  });
});
