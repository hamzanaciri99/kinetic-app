/**
 * Tests for WorkoutContext.
 */
jest.mock('../storage/database');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as db from '../storage/database';
import { DataProvider, useDataReset } from '../context/DataContext';
import { WorkoutProvider, useWorkouts } from '../context/WorkoutContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <WorkoutProvider>{children}</WorkoutProvider>
    </DataProvider>
  );
}

const makeDbWorkout = (overrides?: Partial<db.DbWorkout>): db.DbWorkout => ({
  id: 'w1',
  name: 'Push Day',
  logged_at: '2024-01-15T10:00:00.000Z',
  exercises_json: JSON.stringify([{ name: 'Bench Press', sets: 4, reps: 8, weightKg: 60, detail: '' }]),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (db.getAllWorkouts as jest.Mock).mockResolvedValue([]);
  (db.insertWorkout as jest.Mock).mockResolvedValue(undefined);
  (db.clearWorkouts as jest.Mock).mockResolvedValue(undefined);
});

describe('useWorkouts', () => {
  it('loads workouts from database on mount', async () => {
    (db.getAllWorkouts as jest.Mock).mockResolvedValue([makeDbWorkout()]);
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toHaveLength(1));
    expect(result.current.workouts[0].name).toBe('Push Day');
  });

  it('parses exercises_json into exercises array', async () => {
    (db.getAllWorkouts as jest.Mock).mockResolvedValue([makeDbWorkout()]);
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toHaveLength(1));
    expect(result.current.workouts[0].exercises[0].name).toBe('Bench Press');
  });

  it('handles malformed exercises_json gracefully', async () => {
    (db.getAllWorkouts as jest.Mock).mockResolvedValue([makeDbWorkout({ exercises_json: 'INVALID' })]);
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toHaveLength(1));
    expect(result.current.workouts[0].exercises).toEqual([]);
  });

  it('addWorkout prepends to the list and calls db.insertWorkout', async () => {
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toEqual([]));

    await act(async () => result.current.addWorkout({ name: 'Leg Day', exercises: [{ name: 'Squat', sets: 5, reps: 5, weightKg: 100 }] }));
    await waitFor(() => expect(result.current.workouts[0].name).toBe('Leg Day'));
    expect(db.insertWorkout).toHaveBeenCalled();
  });

  it('exerciseNames derives unique sorted names from all workouts', async () => {
    (db.getAllWorkouts as jest.Mock).mockResolvedValue([
      makeDbWorkout({ exercises_json: JSON.stringify([{ name: 'Squat', sets: 3, reps: 5, weightKg: 100, detail: '' }, { name: 'Deadlift', sets: 3, reps: 5, weightKg: 140, detail: '' }]) }),
      makeDbWorkout({ id: 'w2', exercises_json: JSON.stringify([{ name: 'Squat', sets: 4, reps: 4, weightKg: 110, detail: '' }]) }),
    ]);
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toHaveLength(2));
    expect(result.current.exerciseNames).toEqual(['Deadlift', 'Squat']);
  });

  it('exerciseHistory returns sorted history for a given exercise', async () => {
    (db.getAllWorkouts as jest.Mock).mockResolvedValue([
      makeDbWorkout({ id: 'w1', logged_at: '2024-01-01T00:00:00.000Z', exercises_json: JSON.stringify([{ name: 'Bench Press', sets: 3, reps: 8, weightKg: 55, detail: '' }]) }),
      makeDbWorkout({ id: 'w2', logged_at: '2024-01-15T00:00:00.000Z', exercises_json: JSON.stringify([{ name: 'Bench Press', sets: 4, reps: 8, weightKg: 60, detail: '' }]) }),
    ]);
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toHaveLength(2));
    const history = result.current.exerciseHistory('Bench Press');
    expect(history).toHaveLength(2);
    expect(history[0].date).toBe('2024-01-01T00:00:00.000Z');
    expect(history[1].weightKg).toBe(60);
  });

  it('totalVolumeKg sums sets * reps * weightKg across all workouts', async () => {
    (db.getAllWorkouts as jest.Mock).mockResolvedValue([
      makeDbWorkout({ exercises_json: JSON.stringify([{ name: 'Squat', sets: 4, reps: 8, weightKg: 100, detail: '' }]) }),
    ]);
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.workouts).toHaveLength(1));
    expect(result.current.totalVolumeKg).toBe(4 * 8 * 100);
  });

  it('totalVolumeKg is 0 when no workouts', async () => {
    const { result } = await renderHook(() => useWorkouts(), { wrapper });
    await waitFor(() => expect(result.current.totalVolumeKg).toBe(0));
  });

  it('clears workouts when clearCategory("workouts") is called', async () => {
    (db.getAllWorkouts as jest.Mock).mockResolvedValue([makeDbWorkout()]);
    const { result } = await renderHook(
      () => ({ workouts: useWorkouts(), data: useDataReset() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.workouts.workouts).toHaveLength(1));

    await act(async () => result.current.data.clearCategory('workouts'));
    await waitFor(() => expect(db.clearWorkouts).toHaveBeenCalled());
    await waitFor(() => expect(result.current.workouts.workouts).toHaveLength(0));
  });
});
