import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import { isSameDay, dayKey, makeId } from '../utils/date';
import * as db from '../storage/database';

export type MealEntry = {
  id: string;
  name: string;
  meal: string;
  detail: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  weightGrams: number;
  image: string | null;
  loggedAt: string;
};

export type NewMeal = Omit<MealEntry, 'id' | 'loggedAt'>;
export type MacroTotals = { protein: number; carbs: number; fat: number };
export type DailyTotal = { date: string; kcal: number };

const DEFAULT_DAILY_TARGET = 2400;
const EMPTY_MACROS: MacroTotals = { protein: 0, carbs: 0, fat: 0 };

function dbRowToMeal(row: db.DbMeal): MealEntry {
  return {
    id: row.id,
    name: row.name,
    meal: row.meal,
    detail: row.detail,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    weightGrams: row.weight_grams,
    image: row.image,
    loggedAt: row.logged_at,
  };
}

function mealToDbRow(id: string, loggedAt: string, meal: NewMeal): db.DbMeal {
  return {
    id,
    name: meal.name,
    meal: meal.meal,
    detail: meal.detail,
    kcal: meal.kcal,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    weight_grams: meal.weightGrams,
    image: meal.image,
    logged_at: loggedAt,
  };
}

type NutritionContextValue = {
  meals: MealEntry[];
  addMeal: (meal: NewMeal) => void;
  updateMeal: (id: string, meal: NewMeal) => void;
  removeMeal: (id: string) => void;
  consumedToday: number;
  macroTotalsToday: MacroTotals;
  dailyTotals: DailyTotal[];
  dailyCalorieTarget: number;
  setDailyCalorieTarget: (target: number) => void;
};

const NutritionContext = createContext<NutritionContextValue | null>(null);

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [dailyCalorieTarget, setDailyCalorieTargetState] = useState(DEFAULT_DAILY_TARGET);

  useEffect(() => {
    db.getAllMeals()
      .then((rows) => setMeals(rows.map(dbRowToMeal)))
      .catch(() => {});
    db.getSetting('calorie_target')
      .then((val) => {
        if (val) {
          const n = parseInt(val, 10);
          if (Number.isFinite(n) && n > 0) setDailyCalorieTargetState(n);
        }
      })
      .catch(() => {});
  }, []);

  useClearOnReset('meals', () => {
    db.clearMeals()
      .then(() => setMeals([]))
      .catch(() => setMeals([]));
  });

  const value = useMemo<NutritionContextValue>(() => {
    const today = new Date();
    const todaysMeals = meals.filter((m) => isSameDay(m.loggedAt, today));

    const consumedToday = todaysMeals.reduce((sum, m) => sum + m.kcal, 0);
    const macroTotalsToday = todaysMeals.reduce<MacroTotals>(
      (totals, m) => ({
        protein: totals.protein + m.protein,
        carbs: totals.carbs + m.carbs,
        fat: totals.fat + m.fat,
      }),
      { ...EMPTY_MACROS },
    );

    const totalsByDay = new Map<string, number>();
    for (const meal of meals) {
      const k = dayKey(meal.loggedAt);
      totalsByDay.set(k, (totalsByDay.get(k) ?? 0) + meal.kcal);
    }
    const dailyTotals: DailyTotal[] = Array.from(totalsByDay.entries())
      .map(([date, kcal]) => ({ date, kcal }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return {
      meals,
      addMeal: (meal) => {
        const id = makeId();
        const loggedAt = new Date().toISOString();
        const entry: MealEntry = { ...meal, id, loggedAt };
        db.insertMeal(mealToDbRow(id, loggedAt, meal)).catch(() => {});
        setMeals((prev) => [entry, ...prev]);
      },
      updateMeal: (id, meal) => {
        const updated: Partial<db.DbMeal> = {
          name: meal.name, meal: meal.meal, detail: meal.detail,
          kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
          weight_grams: meal.weightGrams, image: meal.image,
        };
        db.updateMeal(id, updated).catch(() => {});
        setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, ...meal } : m)));
      },
      removeMeal: (id) => {
        db.deleteMeal(id).catch(() => {});
        setMeals((prev) => prev.filter((m) => m.id !== id));
      },
      consumedToday,
      macroTotalsToday,
      dailyTotals,
      dailyCalorieTarget,
      setDailyCalorieTarget: (target) => {
        if (!Number.isFinite(target) || target <= 0) return;
        const rounded = Math.round(target);
        db.setSetting('calorie_target', String(rounded)).catch(() => {});
        setDailyCalorieTargetState(rounded);
      },
    };
  }, [meals, dailyCalorieTarget]);

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
}

export function useNutrition() {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error('useNutrition must be used within a NutritionProvider');
  return ctx;
}
