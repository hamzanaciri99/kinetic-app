/**
 * Single SQLite database instance for all app data.
 * Schema: settings | categories | workouts | meals | weight_entries | gallery_items
 */
import * as SQLite from 'expo-sqlite';
import { makeId } from '../utils/date';

// ─── Row types (plain DB shapes, no context-level types to avoid circulars) ───

export type DbSetting = { key: string; value: string };

export type DbCategory = { id: string; name: string };

export type DbWorkout = {
  id: string;
  name: string;
  logged_at: string;
  exercises_json: string;
};

export type DbMeal = {
  id: string;
  name: string;
  meal: string;
  detail: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  weight_grams: number;
  image: string | null;
  logged_at: string;
};

export type DbWeightEntry = { id: string; date: string; kg: number };

export type DbGalleryItem = {
  id: string;
  date_label: string;
  local_path: string;
  is_remote: number;
  featured: number;
  category: string | null;
  created_at: string;
};

// ─── Singleton ────────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const database = await SQLite.openDatabaseAsync('kinetic.db');
    await initSchema(database);
    _db = database;
    return database;
  })();
  return _initPromise;
}

/** Exposed for tests — resets the singleton so a new in-memory DB can be used. */
export function _resetDbForTests(): void {
  _db = null;
  _initPromise = null;
}

// ─── Schema + seeding ─────────────────────────────────────────────────────────

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id   TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id             TEXT PRIMARY KEY NOT NULL,
      name           TEXT NOT NULL,
      logged_at      TEXT NOT NULL,
      exercises_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meals (
      id           TEXT PRIMARY KEY NOT NULL,
      name         TEXT NOT NULL,
      meal         TEXT NOT NULL,
      detail       TEXT NOT NULL,
      kcal         REAL NOT NULL,
      protein      REAL NOT NULL,
      carbs        REAL NOT NULL,
      fat          REAL NOT NULL,
      weight_grams REAL NOT NULL,
      image        TEXT,
      logged_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weight_entries (
      id   TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      kg   REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id         TEXT PRIMARY KEY NOT NULL,
      date_label TEXT NOT NULL,
      local_path TEXT NOT NULL,
      is_remote  INTEGER NOT NULL DEFAULT 0,
      featured   INTEGER NOT NULL DEFAULT 0,
      category   TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const seeded = await db.getFirstAsync<DbSetting>(
    'SELECT key, value FROM settings WHERE key = ?',
    ['seeded_v1'],
  );
  if (!seeded) {
    await seedInitialData(db);
    await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', ['seeded_v1', 'true']);
  }
}

function daysAgoIso(days: number, hour = 8): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

async function seedInitialData(db: SQLite.SQLiteDatabase): Promise<void> {
  // Default categories
  const defaultCategories = ['Chest', 'Back', 'Legs', 'Arms', 'Core', 'Full Body'];
  for (const name of defaultCategories) {
    await db.runAsync('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', [makeId(), name]);
  }

  // Daily calorie target
  await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [
    'calorie_target',
    '2400',
  ]);

  // Workouts
  const seedWorkouts = [
    { name: 'LEG DAY A', daysAgo: 27, hour: 6, exercises: [{ name: 'Back Squat', sets: 4, reps: 6, weightKg: 90 }, { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 72 }, { name: 'Leg Press', sets: 3, reps: 10, weightKg: 140 }] },
    { name: 'PUSH PERFORMANCE', daysAgo: 24, hour: 6, exercises: [{ name: 'Bench Press', sets: 4, reps: 6, weightKg: 72 }, { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 44 }, { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 10 }] },
    { name: 'PULL HYPERTROPHY', daysAgo: 22, hour: 17, exercises: [{ name: 'Deadlift', sets: 4, reps: 5, weightKg: 110 }, { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null }, { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 64 }] },
    { name: 'LEG DAY A', daysAgo: 20, hour: 6, exercises: [{ name: 'Back Squat', sets: 4, reps: 6, weightKg: 95 }, { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 75 }, { name: 'Leg Press', sets: 3, reps: 10, weightKg: 150 }] },
    { name: 'PUSH PERFORMANCE', daysAgo: 17, hour: 6, exercises: [{ name: 'Bench Press', sets: 4, reps: 6, weightKg: 76 }, { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 46 }, { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 10 }] },
    { name: 'PULL HYPERTROPHY', daysAgo: 15, hour: 17, exercises: [{ name: 'Deadlift', sets: 4, reps: 5, weightKg: 115 }, { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null }, { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 67 }] },
    { name: 'LEG DAY A', daysAgo: 13, hour: 6, exercises: [{ name: 'Back Squat', sets: 4, reps: 6, weightKg: 97 }, { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 78 }, { name: 'Leg Press', sets: 3, reps: 10, weightKg: 155 }] },
    { name: 'PUSH PERFORMANCE', daysAgo: 10, hour: 6, exercises: [{ name: 'Bench Press', sets: 4, reps: 6, weightKg: 78 }, { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 48 }, { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 12 }] },
    { name: 'PULL HYPERTROPHY', daysAgo: 8, hour: 17, exercises: [{ name: 'Deadlift', sets: 4, reps: 5, weightKg: 118 }, { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null }, { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 70 }] },
    { name: 'LEG DAY A', daysAgo: 6, hour: 6, exercises: [{ name: 'Back Squat', sets: 4, reps: 6, weightKg: 100 }, { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 80 }, { name: 'Leg Press', sets: 3, reps: 10, weightKg: 160 }] },
    { name: 'PULL HYPERTROPHY', daysAgo: 3, hour: 17, exercises: [{ name: 'Deadlift', sets: 4, reps: 5, weightKg: 120 }, { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null }, { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 70 }] },
    { name: 'PUSH PERFORMANCE', daysAgo: 1, hour: 6, exercises: [{ name: 'Bench Press', sets: 4, reps: 6, weightKg: 80 }, { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 50 }, { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 12 }] },
  ];
  for (const w of seedWorkouts) {
    await db.runAsync(
      'INSERT OR IGNORE INTO workouts (id, name, logged_at, exercises_json) VALUES (?, ?, ?, ?)',
      [makeId(), w.name, daysAgoIso(w.daysAgo, w.hour), JSON.stringify(w.exercises)],
    );
  }

  // Meals
  const priorDayKcals = [
    { days: 1, kcal: 1980 }, { days: 2, kcal: 2150 }, { days: 3, kcal: 1870 },
    { days: 4, kcal: 2260 }, { days: 5, kcal: 2040 }, { days: 6, kcal: 1790 },
    { days: 9, kcal: 2100 }, { days: 13, kcal: 1950 }, { days: 17, kcal: 2220 },
    { days: 21, kcal: 1880 },
  ];
  for (const p of priorDayKcals) {
    await db.runAsync(
      'INSERT OR IGNORE INTO meals (id, name, meal, detail, kcal, protein, carbs, fat, weight_grams, image, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [makeId(), 'Logged Meals', 'SUMMARY', 'Daily total', p.kcal, Math.round(p.kcal * 0.12), Math.round(p.kcal * 0.18), Math.round(p.kcal * 0.05), 0, null, daysAgoIso(p.days, 13)],
    );
  }
  const todayMeals = [
    { name: 'Oatmeal & Whey', meal: 'BREAKFAST', detail: 'Blueberries, Almonds, Protein Isolate', kcal: 450, protein: 38, carbs: 52, fat: 11, wg: 380, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgkKWhcr52xq5cySgfu1wuABnYGyNrKaZULkai6UxnY71oiznebJ2ibJ-Ie5DQ89JekPfInh4pxUhkNf5s4nVX2lyb-8Fhy6Tvur7hcd4GrTWDLBgqCKVBarhjw1jb0Gwkn4hkyfjtqZj2RU5S-RcS4cMQ3c95Yd2cT6h-oXsxVB-heuWj36ZxSvJXy1AS5IqZFawO9g1B8ABJmQW9eBLnPO-fny2EEvanwI_bNSVecaNsTXZA-20NCoP76bNf628rUDHCm8Ef0BKJ', hoursAgo: 8 },
    { name: 'Grilled Chicken Bowl', meal: 'LUNCH', detail: 'Quinoa, Kale, Avocado, Lemon Tahini', kcal: 620, protein: 48, carbs: 58, fat: 18, wg: 420, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyXjsOEuoIRDekI8Up0UfT2aPqRiWhkMAY8U9NPrkp36qR1yspXN36tNcquDsyH8qts4aa6U-RdUaO75CE2Lc05eIrMtG09vyBEqEuvLnM_sh1iis4smsHsjQHG9IzZyFJUnUbHOvNjY3gNGmM_X5cuCSz28YROLDfuVCK6hd5B-kNSlNCg6hcP1ZEJ7GWkguT5MMfuLLP4pNr8vy1-Gla62lTZQ7i8M4KiKkmIgm4L_ncEA352Z-2AArst_77Gqci46WkMpugY-GU', hoursAgo: 4 },
    { name: 'Seared Salmon', meal: 'DINNER', detail: 'Asparagus, Roasted Sweet Potato', kcal: 580, protein: 42, carbs: 38, fat: 22, wg: 360, img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAjRHP5bmtksEppzrmoY5lYa-Q25QA0OO5rwwLX_ebnbf4LDL53UMljfvEySgecX5XRJaNYEtWWMOLPAfz4G9_PZpewrBy_e0Cd5ulY8weghbFz9diKaBsAQADB_uBGHbvv3AofoRnx4Fc1V1V541MxackOwjgbik1DZBS1KdGfhOSn0B0FPFzRY9AAEKV0jJqhxWWsbku70LA7gark7BIABkcvrowv4lhZHZ9xSi-CRNLPXtprpxQCbLUTl7z0W4RQeBv4MtM5_gnc', hoursAgo: 1 },
  ];
  for (const m of todayMeals) {
    await db.runAsync(
      'INSERT OR IGNORE INTO meals (id, name, meal, detail, kcal, protein, carbs, fat, weight_grams, image, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [makeId(), m.name, m.meal, m.detail, m.kcal, m.protein, m.carbs, m.fat, m.wg, m.img, hoursAgoIso(m.hoursAgo)],
    );
  }

  // Weight entries
  const weightSeed = [
    { days: 28, kg: 84.6 }, { days: 24, kg: 84.1 }, { days: 19, kg: 83.7 },
    { days: 15, kg: 83.4 }, { days: 10, kg: 83.0 }, { days: 6, kg: 82.7 },
    { days: 3, kg: 82.6 }, { days: 0, kg: 82.4 },
  ];
  for (const w of weightSeed) {
    await db.runAsync('INSERT OR IGNORE INTO weight_entries (id, date, kg) VALUES (?, ?, ?)', [
      makeId(), daysAgoIso(w.days, 8), w.kg,
    ]);
  }

  // Gallery items (seed = remote URLs)
  const gallerySeed = [
    { id: 'seed-aug12', date_label: 'AUG 12', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXbNPC8x4jF5xMBCYaR6teWbxkImWGs2JuuZq1VaR4zMTAr7NOBXIf0d__rb2bz-twis8CgkGWZNnoVMXcCjLlyY0eZaTdAZdxzOnRG3UddKqh5VrBxQu-NPXZtyqaBTDDGlNdc2JyYhiD1tqX05SeckiImzmDr98vyJo9ZyTp1ZqDrSbt39q5ATACC-r_mSl6iSUW5hIIRZ_obA_SgTlDQGKRkXJkoiDqb1Nlgv0bQKl1e1J4XxQqI5hOehdz8Z0v5OVAZ0UBK9fO', featured: 0 },
    { id: 'seed-aug10', date_label: 'AUG 10', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtEUbni0g0O5GvObmg_aTJ8-SzLgM0XvrvRE1mv2iK9p0JDqTPH9WRlbeu2loUhqAYYMOPs4sAvYgF-3F8MQrxoIUlV4kypARPNeF6Ov721Zb-QDNYtIJLAOfBuFoDjB-kji5WSdiPRPsTU85TQQL-JV-KXvet3_Zyd0h2evEfp9wLyf6TAcYMAQ-Y6A2TZV3a1et5Pgvlvw7J_vKH0CWj-aqf0XI6Ev3f_1jEtd7Q7CPydizDM3zC764B-uAgYSNnhCOsS_q6sYq8', featured: 0 },
    { id: 'seed-aug08', date_label: 'AUG 08', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDm5YnJSmnFEr5wRL5XreKROyHvL0gUVK3pDTBRv83hYEyQgCeRM4a_AMp6MJlYZxInmpEeXp238P0zVO8muBmms7leVskWnOSezN_097Lud--4icicOVXmv-OFgUp0A7UMJCZES5SYBVAawaadDjiEGzwjUxooiX2wItxAuXm8NcscgsYisdRwtrFLJpHDuW1QpU1kQHGC9HDimJh2fvmzPKVFYGzdA7Z7g4a2Tc482d6A9ASVr6k2w09ffL6C8Yii-74YmGUXLrqf', featured: 0 },
    { id: 'seed-aug05', date_label: 'AUG 05', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuADtFz5JACtBrDe7ej6HnQBE6esvg6n12bnAqOPd_c1oyW7VV0QYLHFWobPLNXkoBljudz27MhvGeSe8abd98ovVFypTHZfIWpm8nhbd17Otuftg8xZyGLcWzTjxZ5todfqZ0pJ9k3MCiWxu5dw3PCwV1xqZ1OWcNkDbqlc1SAF5ubXLFabhfE9qvikoJv1UcdwwUF3kneo0rRZQlYC-JaKHEOPLGkUIpfHq3Ol-Vf5LX0ffO4kF_w_OIDoHE7r5bVPWcwDNMYppCzy', featured: 0 },
    { id: 'seed-aug02', date_label: 'AUG 02', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSVcQdUD2XkooYgkLyaknkTk9a7bSd36m9TSYirWLHDmdGi0aT9pfNPld7CDc8xG6lIkveT5-iMArLpe7mPYvbGXzdpJzCnTbSLQlzNhhv43H3CvFVVl6deSCGkre4rg42iDaZzkSKc-fvSSK1H-_u-SpJldcBfaJfa-e2VvPabcPE7SqEn94UniDF47J29EkM3zlJztluNbvBxDOkRSOtQkHRzClInBNZTj2C26HPZB00rcs45NltkGSPoWixz1itHLmsgskvJJX0', featured: 1 },
    { id: 'seed-jul29', date_label: 'JUL 29', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoUojIKXz8SKVLhgzHu2hyyzvxyUWMrsRlz2b415AH8_931Zc3Yj6YFajps06a3MCqww_lWGkrHl8gG6sX-SmD2DYS1DG4wdjfrlhlwwKjv6J5zvRzR9LMCCQB7uBCV1QEQnjPDPiIQrHFLl6bXwuX8mSMbdicL7DHJlaRVojmcMQ5DBxz3gXQ56qdgVivlgK2CPKFsTwfrEf3P6ntcDx2mCNXuNCwTAdhoG9APZqROd9dQgslX1pmbn5gV0eLe6lunHbmsT3q2jBT', featured: 0 },
    { id: 'seed-jul25', date_label: 'JUL 25', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANpBtSlQv1eIL6Fa7UQwLXBqCUleMXfhyN9ICT7nejtuN7tEfrFgux150da5akJZloZMad1HLKi3a9eOK5stw1HwrQjBQiSRoFEHKLVDdWXlzCVQ0kr7ved38kgUNpn06-AtyNBJvp6PMDtObSz6T3yy92hHLmx8xC6W9CHH4peSwV-fFHNbWyVb_crSkeU4p7AdsSfHA6xs65ac2VPkC2RrKYdx3WsNsOhY-EqIUPENWpTz2ih-VEgBh4ucMiFGs3eSBEcZcoopM7', featured: 0 },
    { id: 'seed-jul21', date_label: 'JUL 21', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAPVAVVTBvvZyPi6nOMT6NE0elUN5xPnnQwTzVJSX896qO46_3zyGVRZpNVvrnGn8ogL_jQKLolNK8VD8JvKvR8aH6Avtr6nH8r9AGczsla1edrj6C2VLc43MQB4KiswKiO1gzeaLjKPQgD0pc5s2FMJ1SCwK5zVin_Yl4v0JbDuQPDeVCsZCT_r_N7gKyNXEJKvl3wn-RdF-COQ-1K2z_GFHGvwQyQ6mhVMzGe4bHe9hHoV0xiv1qMBryWoYt3N31R_J_clN02FH9E', featured: 0 },
    { id: 'seed-jul18', date_label: 'JUL 18', local_path: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSjAc2so46763qkRDDxSoBIuGmub6_31tzb1EYtsSls2BH-5IHWBzw2OCgUDeVvvS4fLKIt9h2FHrHTVU6Fp4Ua4yYX98hDzvQIf4qKb_U8qZbd1_MuAnj56cwVN26Ghou9jjmLNQg1572ip-OxjymaNDfl0C3fPE7bJ2-Ck9iV26cF17ArKL9JG9KixVDrrBISdw3f__kzBmsr-i20dEfv2O6v5et5m9UjI7jf0VOWotViHpCankzopqUz5-M5MmXpbQR1kbCstRt', featured: 0 },
  ];
  for (const g of gallerySeed) {
    await db.runAsync(
      'INSERT OR IGNORE INTO gallery_items (id, date_label, local_path, is_remote, featured, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [g.id, g.date_label, g.local_path, 1, g.featured, null, new Date().toISOString()],
    );
  }

  // Gallery compare state
  await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [
    'gallery_compare_before',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCTSkse_Sa941Ox_cSeAJcqLUwbmluL_vwE2AWJ9o0yMSNssbZaYtBTpJsMwF9Xzm9O0UdRndX6zCLmJIGtF50HEYbNqaEDmjPfSbbIBvy8U1f2Ay3om7ap0DRJeie1HYZrxw70LYyDNX8vJIDSGhRGwMC3kcxZIL8kS5fyGi2v2UN-Moha_xwTtYTeOhKM9fb8KdctT7Q_W-fCH2qPK4TVxxvgBX3uan5A3FDieuNc7zxDSmAOQKOz4MzND86xx22ZcYBGOn2q5_g6',
  ]);
  await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [
    'gallery_compare_after',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBdY1S8ekhd5lkMeoVRRteKeELbNN-BKWa-COjlra3HOVIGqExzyP03ps6UgHkdAuFV8t7Dar7Qo6yI-kIhsQEKCXoPsB4BaG-nuiNiVqxlW3bhHsZY8V88HMM3MI3hdfdNIy0yS-P36ztUkkBYg5_6Dl2lcCG5xzB2OBfEegJQyK31aG5SaIKSLhh9qOxuFaNNsumA_bRFRchrDU2igOFeqrCJQdhDfqqI6s7f-_wGxL4K_OWgE55BhuUj-FtudPjLYHII8scw5sPN',
  ]);
}

// ─── Settings CRUD ────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DbSetting>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

// ─── Categories CRUD ──────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>('SELECT name FROM categories ORDER BY name');
  return rows.map((r) => r.name);
}

export async function addCategory(name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', [makeId(), name]);
}

export async function removeCategory(name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE name = ?', [name]);
}

export async function clearCategories(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM categories');
}

// ─── Workouts CRUD ────────────────────────────────────────────────────────────

export async function getAllWorkouts(): Promise<DbWorkout[]> {
  const db = await getDb();
  return db.getAllAsync<DbWorkout>('SELECT * FROM workouts ORDER BY logged_at DESC');
}

export async function insertWorkout(row: DbWorkout): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO workouts (id, name, logged_at, exercises_json) VALUES (?, ?, ?, ?)',
    [row.id, row.name, row.logged_at, row.exercises_json],
  );
}

export async function clearWorkouts(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM workouts');
}

// ─── Meals CRUD ───────────────────────────────────────────────────────────────

export async function getAllMeals(): Promise<DbMeal[]> {
  const db = await getDb();
  return db.getAllAsync<DbMeal>('SELECT * FROM meals ORDER BY logged_at DESC');
}

export async function insertMeal(row: DbMeal): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO meals (id, name, meal, detail, kcal, protein, carbs, fat, weight_grams, image, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [row.id, row.name, row.meal, row.detail, row.kcal, row.protein, row.carbs, row.fat, row.weight_grams, row.image ?? null, row.logged_at],
  );
}

export async function updateMeal(id: string, row: Partial<Omit<DbMeal, 'id'>>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(row) as Array<keyof typeof row>;
  if (fields.length === 0) return;
  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => row[f] ?? null);
  await db.runAsync(`UPDATE meals SET ${setClause} WHERE id = ?`, [...values, id]);
}

export async function deleteMeal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM meals WHERE id = ?', [id]);
}

export async function clearMeals(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM meals');
}

// ─── Weight entries CRUD ──────────────────────────────────────────────────────

export async function getAllWeightEntries(): Promise<DbWeightEntry[]> {
  const db = await getDb();
  return db.getAllAsync<DbWeightEntry>('SELECT * FROM weight_entries ORDER BY date ASC');
}

export async function insertWeightEntry(row: DbWeightEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO weight_entries (id, date, kg) VALUES (?, ?, ?)', [row.id, row.date, row.kg]);
}

export async function deleteWeightEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM weight_entries WHERE id = ?', [id]);
}

export async function clearWeightEntries(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM weight_entries');
}

// ─── Gallery CRUD ─────────────────────────────────────────────────────────────

export async function getAllGalleryItems(): Promise<DbGalleryItem[]> {
  const db = await getDb();
  return db.getAllAsync<DbGalleryItem>('SELECT * FROM gallery_items ORDER BY created_at DESC');
}

export async function insertGalleryItem(row: DbGalleryItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO gallery_items (id, date_label, local_path, is_remote, featured, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [row.id, row.date_label, row.local_path, row.is_remote, row.featured, row.category ?? null, row.created_at],
  );
}

export async function updateGalleryItemFeatured(id: string, featured: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE gallery_items SET featured = ? WHERE id = ?', [featured ? 1 : 0, id]);
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM gallery_items WHERE id = ?', [id]);
}

export async function clearGalleryItems(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM gallery_items');
}

// ─── Bulk import (for restore) ────────────────────────────────────────────────

export async function bulkInsertWorkouts(rows: DbWorkout[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync(
        'INSERT OR REPLACE INTO workouts (id, name, logged_at, exercises_json) VALUES (?, ?, ?, ?)',
        [r.id, r.name, r.logged_at, r.exercises_json],
      );
    }
  });
}

export async function bulkInsertMeals(rows: DbMeal[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync(
        'INSERT OR REPLACE INTO meals (id, name, meal, detail, kcal, protein, carbs, fat, weight_grams, image, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.name, r.meal, r.detail, r.kcal, r.protein, r.carbs, r.fat, r.weight_grams, r.image ?? null, r.logged_at],
      );
    }
  });
}

export async function bulkInsertWeightEntries(rows: DbWeightEntry[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync('INSERT OR REPLACE INTO weight_entries (id, date, kg) VALUES (?, ?, ?)', [r.id, r.date, r.kg]);
    }
  });
}

export async function bulkInsertGalleryItems(rows: DbGalleryItem[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync(
        'INSERT OR REPLACE INTO gallery_items (id, date_label, local_path, is_remote, featured, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.date_label, r.local_path, r.is_remote, r.featured, r.category ?? null, r.created_at],
      );
    }
  });
}

export async function bulkInsertCategories(names: string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const name of names) {
      await db.runAsync('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', [makeId(), name]);
    }
  });
}
