/**
 * Tests for the database storage layer.
 * The expo-sqlite module is mocked by __mocks__/expo-sqlite.js.
 * We spy on the mock db's methods to verify CRUD calls are made.
 */
import * as SQLite from 'expo-sqlite';
import {
  getDb, _resetDbForTests, getSetting, setSetting,
  getAllCategories, addCategory, removeCategory, clearCategories,
  getAllWorkouts, insertWorkout, clearWorkouts,
  getAllMeals, insertMeal, updateMeal, deleteMeal, clearMeals,
  getAllWeightEntries, insertWeightEntry, deleteWeightEntry, clearWeightEntries,
  getAllGalleryItems, insertGalleryItem, updateGalleryItemFeatured, deleteGalleryItem, clearGalleryItems,
  bulkInsertWorkouts, bulkInsertMeals, bulkInsertWeightEntries, bulkInsertGalleryItems, bulkInsertCategories,
  type DbWorkout, type DbMeal, type DbWeightEntry, type DbGalleryItem,
} from '../storage/database';

let mockDb: ReturnType<typeof jest.fn> & any;

beforeEach(async () => {
  _resetDbForTests();
  // getDb() calls openDatabaseAsync internally, which creates a new mockDb.
  // Seeding runs (getFirstAsync returns null by default), but we clear calls afterwards.
  await getDb();
  // Grab the mockDb reference that getDb() actually used (via the mock module's helper).
  mockDb = (SQLite as any).getMockDb();
  // Reset call history from seeding, but keep the mock implementations.
  jest.clearAllMocks();
});

describe('getDb', () => {
  it('returns a database instance', async () => {
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it('returns the same singleton on repeated calls', async () => {
    const db1 = await getDb();
    const db2 = await getDb();
    expect(db1).toBe(db2);
  });
});

describe('getSetting / setSetting', () => {
  it('getSetting returns null when no row found', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce(null);
    const result = await getSetting('some_key');
    expect(result).toBeNull();
  });

  it('getSetting returns value from row', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ value: '2400' });
    const result = await getSetting('calorie_target');
    expect(result).toBe('2400');
  });

  it('setSetting calls runAsync with correct params', async () => {
    await setSetting('calorie_target', '1800');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO settings'),
      ['calorie_target', '1800'],
    );
  });
});

describe('Categories CRUD', () => {
  it('getAllCategories returns mapped names', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([{ name: 'Chest' }, { name: 'Back' }]);
    const result = await getAllCategories();
    expect(result).toEqual(['Chest', 'Back']);
  });

  it('addCategory calls INSERT OR IGNORE', async () => {
    await addCategory('Shoulders');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE INTO categories'),
      expect.arrayContaining(['Shoulders']),
    );
  });

  it('removeCategory calls DELETE WHERE name', async () => {
    await removeCategory('Legs');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'DELETE FROM categories WHERE name = ?',
      ['Legs'],
    );
  });

  it('clearCategories calls DELETE FROM categories', async () => {
    await clearCategories();
    expect(mockDb.execAsync).toHaveBeenCalledWith('DELETE FROM categories');
  });
});

describe('Workouts CRUD', () => {
  const sampleWorkout: DbWorkout = {
    id: 'w1',
    name: 'Push Day',
    logged_at: '2024-01-15T10:00:00.000Z',
    exercises_json: JSON.stringify([{ name: 'Bench Press', sets: 4, reps: 8, weightKg: 60 }]),
  };

  it('getAllWorkouts returns all rows', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([sampleWorkout]);
    const result = await getAllWorkouts();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Push Day');
  });

  it('insertWorkout calls INSERT with correct params', async () => {
    await insertWorkout(sampleWorkout);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO workouts'),
      ['w1', 'Push Day', '2024-01-15T10:00:00.000Z', sampleWorkout.exercises_json],
    );
  });

  it('clearWorkouts deletes all rows', async () => {
    await clearWorkouts();
    expect(mockDb.execAsync).toHaveBeenCalledWith('DELETE FROM workouts');
  });
});

describe('Meals CRUD', () => {
  const sampleMeal: DbMeal = {
    id: 'm1',
    name: 'Oatmeal',
    meal: 'BREAKFAST',
    detail: 'with blueberries',
    kcal: 400,
    protein: 30,
    carbs: 50,
    fat: 10,
    weight_grams: 300,
    image: null,
    logged_at: '2024-01-15T08:00:00.000Z',
  };

  it('getAllMeals returns all rows', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([sampleMeal]);
    const result = await getAllMeals();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Oatmeal');
  });

  it('insertMeal calls INSERT with all columns', async () => {
    await insertMeal(sampleMeal);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO meals'),
      ['m1', 'Oatmeal', 'BREAKFAST', 'with blueberries', 400, 30, 50, 10, 300, null, '2024-01-15T08:00:00.000Z'],
    );
  });

  it('updateMeal builds correct SET clause', async () => {
    await updateMeal('m1', { kcal: 500, protein: 35 });
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE meals SET .+ WHERE id = \?/),
      expect.arrayContaining([500, 35, 'm1']),
    );
  });

  it('updateMeal is a no-op when no fields provided', async () => {
    await updateMeal('m1', {});
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('deleteMeal calls DELETE WHERE id', async () => {
    await deleteMeal('m1');
    expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM meals WHERE id = ?', ['m1']);
  });

  it('clearMeals deletes all rows', async () => {
    await clearMeals();
    expect(mockDb.execAsync).toHaveBeenCalledWith('DELETE FROM meals');
  });
});

describe('Weight entries CRUD', () => {
  const sampleEntry: DbWeightEntry = { id: 'we1', date: '2024-01-15T08:00:00.000Z', kg: 82.5 };

  it('getAllWeightEntries returns all rows', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([sampleEntry]);
    const result = await getAllWeightEntries();
    expect(result[0].kg).toBe(82.5);
  });

  it('insertWeightEntry calls INSERT with correct params', async () => {
    await insertWeightEntry(sampleEntry);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO weight_entries'),
      ['we1', '2024-01-15T08:00:00.000Z', 82.5],
    );
  });

  it('deleteWeightEntry calls DELETE WHERE id', async () => {
    await deleteWeightEntry('we1');
    expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM weight_entries WHERE id = ?', ['we1']);
  });

  it('clearWeightEntries deletes all rows', async () => {
    await clearWeightEntries();
    expect(mockDb.execAsync).toHaveBeenCalledWith('DELETE FROM weight_entries');
  });
});

describe('Gallery items CRUD', () => {
  const sampleItem: DbGalleryItem = {
    id: 'gi1',
    date_label: 'AUG 12',
    local_path: 'file:///kinetic-photos/gi1.jpg',
    is_remote: 0,
    featured: 0,
    category: 'Chest',
    created_at: '2024-08-12T10:00:00.000Z',
  };

  it('getAllGalleryItems returns all rows', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([sampleItem]);
    const result = await getAllGalleryItems();
    expect(result[0].id).toBe('gi1');
  });

  it('insertGalleryItem calls INSERT with all columns', async () => {
    await insertGalleryItem(sampleItem);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO gallery_items'),
      ['gi1', 'AUG 12', 'file:///kinetic-photos/gi1.jpg', 0, 0, 'Chest', '2024-08-12T10:00:00.000Z'],
    );
  });

  it('updateGalleryItemFeatured sets featured = 1', async () => {
    await updateGalleryItemFeatured('gi1', true);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE gallery_items SET featured = ? WHERE id = ?',
      [1, 'gi1'],
    );
  });

  it('updateGalleryItemFeatured sets featured = 0', async () => {
    await updateGalleryItemFeatured('gi1', false);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE gallery_items SET featured = ? WHERE id = ?',
      [0, 'gi1'],
    );
  });

  it('deleteGalleryItem calls DELETE WHERE id', async () => {
    await deleteGalleryItem('gi1');
    expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM gallery_items WHERE id = ?', ['gi1']);
  });

  it('clearGalleryItems deletes all rows', async () => {
    await clearGalleryItems();
    expect(mockDb.execAsync).toHaveBeenCalledWith('DELETE FROM gallery_items');
  });
});

describe('Bulk insert operations', () => {
  it('bulkInsertWorkouts inserts all workouts in a transaction', async () => {
    const workouts: DbWorkout[] = [
      { id: 'w1', name: 'A', logged_at: '2024-01-01T00:00:00.000Z', exercises_json: '[]' },
      { id: 'w2', name: 'B', logged_at: '2024-01-02T00:00:00.000Z', exercises_json: '[]' },
    ];
    await bulkInsertWorkouts(workouts);
    expect(mockDb.withTransactionAsync).toHaveBeenCalled();
    expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
  });

  it('bulkInsertCategories inserts all categories', async () => {
    await bulkInsertCategories(['Chest', 'Back', 'Legs']);
    expect(mockDb.withTransactionAsync).toHaveBeenCalled();
    expect(mockDb.runAsync).toHaveBeenCalledTimes(3);
  });

  it('bulkInsertMeals calls runAsync for each meal', async () => {
    const meals: DbMeal[] = [
      { id: 'm1', name: 'X', meal: 'LUNCH', detail: '', kcal: 100, protein: 10, carbs: 10, fat: 5, weight_grams: 100, image: null, logged_at: '2024-01-01T00:00:00.000Z' },
    ];
    await bulkInsertMeals(meals);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  it('bulkInsertWeightEntries inserts all entries', async () => {
    const entries: DbWeightEntry[] = [
      { id: 'we1', date: '2024-01-01T00:00:00.000Z', kg: 80 },
      { id: 'we2', date: '2024-01-02T00:00:00.000Z', kg: 79.5 },
    ];
    await bulkInsertWeightEntries(entries);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
  });

  it('bulkInsertGalleryItems inserts all items', async () => {
    const items: DbGalleryItem[] = [
      { id: 'gi1', date_label: 'AUG 01', local_path: 'file://x', is_remote: 0, featured: 0, category: null, created_at: new Date().toISOString() },
    ];
    await bulkInsertGalleryItems(items);
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
  });
});
