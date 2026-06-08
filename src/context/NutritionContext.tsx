import React, { createContext, useContext, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import { isSameDay, dayKey, makeId } from '../utils/date';

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

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgoAt(daysAgo: number, hour: number, kcal: number): { loggedAt: string; kcal: number } {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return { loggedAt: d.toISOString(), kcal };
}

const initialMeals: MealEntry[] = [
  {
    id: makeId(),
    name: 'Oatmeal & Whey',
    meal: 'BREAKFAST',
    detail: 'Blueberries, Almonds, Protein Isolate',
    kcal: 450,
    protein: 38,
    carbs: 52,
    fat: 11,
    weightGrams: 380,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBgkKWhcr52xq5cySgfu1wuABnYGyNrKaZULkai6UxnY71oiznebJ2ibJ-Ie5DQ89JekPfInh4pxUhkNf5s4nVX2lyb-8Fhy6Tvur7hcd4GrTWDLBgqCKVBarhjw1jb0Gwkn4hkyfjtqZj2RU5S-RcS4cMQ3c95Yd2cT6h-oXsxVB-heuWj36ZxSvJXy1AS5IqZFawO9g1B8ABJmQW9eBLnPO-fny2EEvanwI_bNSVecaNsTXZA-20NCoP76bNf628rUDHCm8Ef0BKJ',
    loggedAt: hoursAgo(8),
  },
  {
    id: makeId(),
    name: 'Grilled Chicken Bowl',
    meal: 'LUNCH',
    detail: 'Quinoa, Kale, Avocado, Lemon Tahini',
    kcal: 620,
    protein: 48,
    carbs: 58,
    fat: 18,
    weightGrams: 420,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAyXjsOEuoIRDekI8Up0UfT2aPqRiWhkMAY8U9NPrkp36qR1yspXN36tNcquDsyH8qts4aa6U-RdUaO75CE2Lc05eIrMtG09vyBEqEuvLnM_sh1iis4smsHsjQHG9IzZyFJUnUbHOvNjY3gNGmM_X5cuCSz28YROLDfuVCK6hd5B-kNSlNCg6hcP1ZEJ7GWkguT5MMfuLLP4pNr8vy1-Gla62lTZQ7i8M4KiKkmIgm4L_ncEA352Z-2AArst_77Gqci46WkMpugY-GU',
    loggedAt: hoursAgo(4),
  },
  {
    id: makeId(),
    name: 'Seared Salmon',
    meal: 'DINNER',
    detail: 'Asparagus, Roasted Sweet Potato',
    kcal: 580,
    protein: 42,
    carbs: 38,
    fat: 22,
    weightGrams: 360,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAjRHP5bmtksEppzrmoY5lYa-Q25QA0OO5rwwLX_ebnbf4LDL53UMljfvEySgecX5XRJaNYEtWWMOLPAfz4G9_PZpewrBy_e0Cd5ulY8weghbFz9diKaBsAQADB_uBGHbvv3AofoRnx4Fc1V1V541MxackOwjgbik1DZBS1KdGfhOSn0B0FPFzRY9AAEKV0jJqhxWWsbku70LA7gark7BIABkcvrowv4lhZHZ9xSi-CRNLPXtprpxQCbLUTl7z0W4RQeBv4MtM5_gnc',
    loggedAt: hoursAgo(1),
  },
];

// Seed a few prior days so the trend graph has history to show on first run.
const PRIOR_DAYS: { loggedAt: string; kcal: number }[] = [
  daysAgoAt(1, 13, 1980),
  daysAgoAt(2, 13, 2150),
  daysAgoAt(3, 13, 1870),
  daysAgoAt(4, 13, 2260),
  daysAgoAt(5, 13, 2040),
  daysAgoAt(6, 13, 1790),
  daysAgoAt(9, 13, 2100),
  daysAgoAt(13, 13, 1950),
  daysAgoAt(17, 13, 2220),
  daysAgoAt(21, 13, 1880),
];

const seededHistory: MealEntry[] = PRIOR_DAYS.map((entry) => ({
  id: makeId(),
  name: 'Logged Meals',
  meal: 'SUMMARY',
  detail: 'Daily total',
  kcal: entry.kcal,
  protein: Math.round(entry.kcal * 0.12),
  carbs: Math.round(entry.kcal * 0.18),
  fat: Math.round(entry.kcal * 0.05),
  weightGrams: 0,
  image: null,
  loggedAt: entry.loggedAt,
}));

const seedMeals: MealEntry[] = [...initialMeals, ...seededHistory];

const EMPTY_MACROS: MacroTotals = { protein: 0, carbs: 0, fat: 0 };
const DEFAULT_DAILY_TARGET = 2400;

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
  const [meals, setMeals] = useState<MealEntry[]>(seedMeals);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(DEFAULT_DAILY_TARGET);

  useClearOnReset('meals', () => setMeals([]));

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
      const key = dayKey(meal.loggedAt);
      totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + meal.kcal);
    }
    const dailyTotals: DailyTotal[] = Array.from(totalsByDay.entries())
      .map(([date, kcal]) => ({ date, kcal }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return {
      meals,
      addMeal: (meal) => {
        setMeals((prev) => [{ ...meal, id: makeId(), loggedAt: new Date().toISOString() }, ...prev]);
      },
      updateMeal: (id, meal) => {
        setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, ...meal } : m)));
      },
      removeMeal: (id) => {
        setMeals((prev) => prev.filter((m) => m.id !== id));
      },
      consumedToday,
      macroTotalsToday,
      dailyTotals,
      dailyCalorieTarget,
      setDailyCalorieTarget: (target: number) => {
        if (Number.isFinite(target) && target > 0) setDailyCalorieTarget(Math.round(target));
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
