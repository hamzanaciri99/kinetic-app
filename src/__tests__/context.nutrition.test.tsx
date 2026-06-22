/**
 * Tests for NutritionContext.
 */
jest.mock('../storage/database');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as db from '../storage/database';
import { DataProvider, useDataReset } from '../context/DataContext';
import { NutritionProvider, useNutrition, type NewMeal } from '../context/NutritionContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <NutritionProvider>{children}</NutritionProvider>
    </DataProvider>
  );
}

const TODAY = new Date().toISOString();

const makeDbMeal = (overrides?: Partial<db.DbMeal>): db.DbMeal => ({
  id: 'm1',
  name: 'Rice',
  meal: 'LUNCH',
  detail: 'Brown rice',
  kcal: 400,
  protein: 30,
  carbs: 60,
  fat: 5,
  weight_grams: 200,
  image: null,
  logged_at: TODAY,
  ...overrides,
});

const makeNewMeal = (overrides?: Partial<NewMeal>): NewMeal => ({
  name: 'Chicken',
  meal: 'DINNER',
  detail: '',
  kcal: 300,
  protein: 40,
  carbs: 5,
  fat: 8,
  weightGrams: 150,
  image: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (db.getAllMeals as jest.Mock).mockResolvedValue([]);
  (db.getSetting as jest.Mock).mockResolvedValue(null);
  (db.insertMeal as jest.Mock).mockResolvedValue(undefined);
  (db.updateMeal as jest.Mock).mockResolvedValue(undefined);
  (db.deleteMeal as jest.Mock).mockResolvedValue(undefined);
  (db.clearMeals as jest.Mock).mockResolvedValue(undefined);
  (db.setSetting as jest.Mock).mockResolvedValue(undefined);
});

describe('useNutrition', () => {
  it('loads meals from database on mount', async () => {
    (db.getAllMeals as jest.Mock).mockResolvedValue([makeDbMeal()]);
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.meals).toHaveLength(1));
    expect(result.current.meals[0].name).toBe('Rice');
  });

  it('loads calorie target from settings on mount', async () => {
    (db.getSetting as jest.Mock).mockResolvedValue('1800');
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.dailyCalorieTarget).toBe(1800));
  });

  it('defaults dailyCalorieTarget to 2400 when no setting found', async () => {
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.dailyCalorieTarget).toBe(2400));
  });

  it('addMeal prepends to the list and calls db.insertMeal', async () => {
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.meals).toEqual([]));

    await act(async () => result.current.addMeal(makeNewMeal()));
    await waitFor(() => expect(result.current.meals[0].name).toBe('Chicken'));
    expect(db.insertMeal).toHaveBeenCalled();
  });

  it('consumedToday sums kcal for meals logged today', async () => {
    (db.getAllMeals as jest.Mock).mockResolvedValue([makeDbMeal({ kcal: 400 }), makeDbMeal({ id: 'm2', kcal: 300 })]);
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.consumedToday).toBe(700));
  });

  it('macroTotalsToday sums macros for meals logged today', async () => {
    (db.getAllMeals as jest.Mock).mockResolvedValue([
      makeDbMeal({ protein: 30, carbs: 60, fat: 5 }),
      makeDbMeal({ id: 'm2', protein: 20, carbs: 40, fat: 10 }),
    ]);
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.macroTotalsToday.protein).toBe(50));
    expect(result.current.macroTotalsToday.carbs).toBe(100);
    expect(result.current.macroTotalsToday.fat).toBe(15);
  });

  it('dailyTotals groups meals by day sorted ascending', async () => {
    (db.getAllMeals as jest.Mock).mockResolvedValue([
      makeDbMeal({ id: 'm1', kcal: 400, logged_at: '2024-01-15T08:00:00.000Z' }),
      makeDbMeal({ id: 'm2', kcal: 300, logged_at: '2024-01-15T12:00:00.000Z' }),
      makeDbMeal({ id: 'm3', kcal: 500, logged_at: '2024-01-16T08:00:00.000Z' }),
    ]);
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.dailyTotals).toHaveLength(2));
    expect(result.current.dailyTotals[0].kcal).toBe(700);
    expect(result.current.dailyTotals[1].kcal).toBe(500);
  });

  it('removeMeal removes from list and calls db.deleteMeal', async () => {
    (db.getAllMeals as jest.Mock).mockResolvedValue([makeDbMeal({ id: 'm1' }), makeDbMeal({ id: 'm2', name: 'Oats' })]);
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.meals).toHaveLength(2));

    await act(async () => result.current.removeMeal('m1'));
    await waitFor(() => expect(result.current.meals).toHaveLength(1));
    expect(result.current.meals[0].name).toBe('Oats');
    expect(db.deleteMeal).toHaveBeenCalledWith('m1');
  });

  it('updateMeal updates the meal in state and calls db.updateMeal', async () => {
    (db.getAllMeals as jest.Mock).mockResolvedValue([makeDbMeal({ id: 'm1', kcal: 400 })]);
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.meals).toHaveLength(1));

    await act(async () => result.current.updateMeal('m1', makeNewMeal({ kcal: 500 })));
    await waitFor(() => expect(result.current.meals[0].kcal).toBe(500));
    expect(db.updateMeal).toHaveBeenCalledWith('m1', expect.objectContaining({ kcal: 500 }));
  });

  it('setDailyCalorieTarget updates the value and persists to DB', async () => {
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.dailyCalorieTarget).toBe(2400));

    await act(async () => result.current.setDailyCalorieTarget(2000));
    await waitFor(() => expect(result.current.dailyCalorieTarget).toBe(2000));
    expect(db.setSetting).toHaveBeenCalledWith('calorie_target', '2000');
  });

  it('setDailyCalorieTarget ignores non-positive values', async () => {
    const { result } = await renderHook(() => useNutrition(), { wrapper });
    await waitFor(() => expect(result.current.dailyCalorieTarget).toBe(2400));

    await act(async () => result.current.setDailyCalorieTarget(-100));
    await waitFor(() => expect(result.current.dailyCalorieTarget).toBe(2400));
    expect(db.setSetting).not.toHaveBeenCalled();
  });

  it('clears meals when clearCategory("meals") is called', async () => {
    (db.getAllMeals as jest.Mock).mockResolvedValue([makeDbMeal()]);
    const { result } = await renderHook(
      () => ({ nutrition: useNutrition(), data: useDataReset() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.nutrition.meals).toHaveLength(1));

    await act(async () => result.current.data.clearCategory('meals'));
    await waitFor(() => expect(db.clearMeals).toHaveBeenCalled());
    await waitFor(() => expect(result.current.nutrition.meals).toHaveLength(0));
  });
});
