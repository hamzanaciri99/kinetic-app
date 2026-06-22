/**
 * Tests for exportAllData and pickAndImportData.
 * expo-sqlite, expo-file-system, expo-sharing, expo-document-picker, and jszip are mocked.
 */
jest.mock('../storage/database');
jest.mock('../storage/photos');
jest.mock('jszip');
jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  documentDirectory: 'file:///app-documents/',
  cacheDirectory: 'file:///app-cache/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  copyAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

import * as db from '../storage/database';
import * as photos from '../storage/photos';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { exportAllData, pickAndImportData, type ImportOptions } from '../storage/exportImport';

// ─── JSZip mock setup ────────────────────────────────────────────────────────

const mockZipFileMap: Record<string, string> = {};
const mockZipFolders: Record<string, boolean> = {};

type MockJSZipInstance = {
  file: jest.Mock;
  folder: jest.Mock;
  generateAsync: jest.Mock;
  files: Record<string, unknown>;
  loadAsync: jest.Mock;
};

const mockJSZipInstance: MockJSZipInstance = {
  file: jest.fn((name: string, content?: unknown) => {
    if (content !== undefined) {
      mockZipFileMap[name] = content as string;
    } else {
      if (mockZipFileMap[name] !== undefined) {
        return { async: jest.fn().mockResolvedValue(mockZipFileMap[name]) };
      }
      return null;
    }
    return mockJSZipInstance;
  }),
  folder: jest.fn((name: string) => {
    mockZipFolders[name] = true;
    return {
      file: jest.fn((innerName: string, content: unknown) => {
        mockZipFileMap[`${name}/${innerName}`] = content as string;
      }),
    };
  }),
  generateAsync: jest.fn().mockResolvedValue('MOCK_BASE64_ZIP'),
  files: {} as Record<string, unknown>,
  loadAsync: jest.fn(),
};

const JSZip = require('jszip');
JSZip.mockImplementation(() => mockJSZipInstance);
JSZip.loadAsync = jest.fn().mockResolvedValue(mockJSZipInstance);

// ─── DB mock defaults ─────────────────────────────────────────────────────────

const mockWorkouts = [{ id: 'w1', name: 'Workout', logged_at: '2024-01-01T00:00:00.000Z', exercises_json: '[]' }];
const mockMeals = [{ id: 'm1', name: 'Rice', meal: 'LUNCH', detail: '', kcal: 500, protein: 30, carbs: 60, fat: 10, weight_grams: 200, image: null, logged_at: '2024-01-01T00:00:00.000Z' }];
const mockWeightEntries = [{ id: 'we1', date: '2024-01-01T00:00:00.000Z', kg: 80 }];
const mockGalleryItems = [
  { id: 'gi1', date_label: 'JAN 01', local_path: 'file:///kinetic-photos/gi1.jpg', is_remote: 0, featured: 0, category: null, created_at: '2024-01-01T00:00:00.000Z' },
  { id: 'gi2', date_label: 'JAN 02', local_path: 'https://example.com/remote.jpg', is_remote: 1, featured: 0, category: null, created_at: '2024-01-02T00:00:00.000Z' },
];
const mockCategories = ['Chest', 'Back'];

beforeEach(() => {
  jest.clearAllMocks();
  // Clear zip maps
  Object.keys(mockZipFileMap).forEach((k) => delete mockZipFileMap[k]);
  Object.keys(mockZipFolders).forEach((k) => delete mockZipFolders[k]);

  // DB mocks
  (db.getAllWorkouts as jest.Mock).mockResolvedValue(mockWorkouts);
  (db.getAllMeals as jest.Mock).mockResolvedValue(mockMeals);
  (db.getAllWeightEntries as jest.Mock).mockResolvedValue(mockWeightEntries);
  (db.getAllGalleryItems as jest.Mock).mockResolvedValue(mockGalleryItems);
  (db.getAllCategories as jest.Mock).mockResolvedValue(mockCategories);
  (db.getSetting as jest.Mock).mockResolvedValue(null);
  (db.clearWorkouts as jest.Mock).mockResolvedValue(undefined);
  (db.clearMeals as jest.Mock).mockResolvedValue(undefined);
  (db.clearWeightEntries as jest.Mock).mockResolvedValue(undefined);
  (db.clearGalleryItems as jest.Mock).mockResolvedValue(undefined);
  (db.clearCategories as jest.Mock).mockResolvedValue(undefined);
  (db.bulkInsertWorkouts as jest.Mock).mockResolvedValue(undefined);
  (db.bulkInsertMeals as jest.Mock).mockResolvedValue(undefined);
  (db.bulkInsertWeightEntries as jest.Mock).mockResolvedValue(undefined);
  (db.bulkInsertGalleryItems as jest.Mock).mockResolvedValue(undefined);
  (db.bulkInsertCategories as jest.Mock).mockResolvedValue(undefined);
  (db.setSetting as jest.Mock).mockResolvedValue(undefined);

  // Photo mocks
  (photos.readPhotoAsBase64 as jest.Mock).mockResolvedValue('base64photodata');
  (photos.writePhotoFromBase64 as jest.Mock).mockImplementation(async (id: string) => `file:///kinetic-photos/${id}.jpg`);

  // FileSystem mocks
  (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('MOCK_ZIP_BASE64');
  (FileSystem.cacheDirectory as any) = 'file:///cache/';

  // Sharing mock
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
});

// ─── exportAllData ────────────────────────────────────────────────────────────

describe('exportAllData', () => {
  it('queries all data from the database', async () => {
    await exportAllData();
    expect(db.getAllWorkouts).toHaveBeenCalled();
    expect(db.getAllMeals).toHaveBeenCalled();
    expect(db.getAllWeightEntries).toHaveBeenCalled();
    expect(db.getAllGalleryItems).toHaveBeenCalled();
    expect(db.getAllCategories).toHaveBeenCalled();
  });

  it('adds data.json and gallery_meta.json to the zip', async () => {
    await exportAllData();
    const fileNames = (mockJSZipInstance.file as jest.Mock).mock.calls.map(([name]: [string]) => name);
    expect(fileNames).toContain('data.json');
    expect(fileNames).toContain('gallery_meta.json');
  });

  it('reads base64 for local photos and skips remote photos', async () => {
    await exportAllData();
    expect(photos.readPhotoAsBase64).toHaveBeenCalledWith('file:///kinetic-photos/gi1.jpg');
    expect(photos.readPhotoAsBase64).not.toHaveBeenCalledWith('https://example.com/remote.jpg');
  });

  it('writes the zip to the cache directory', async () => {
    await exportAllData();
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('file:///cache/'),
      'MOCK_BASE64_ZIP',
      expect.objectContaining({ encoding: FileSystem.EncodingType.Base64 }),
    );
  });

  it('shares the zip file after writing', async () => {
    await exportAllData();
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringContaining('.zip'),
      expect.objectContaining({ mimeType: 'application/zip' }),
    );
  });

  it('throws when sharing is not available', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    await expect(exportAllData()).rejects.toThrow('Sharing is not available');
  });
});

// ─── pickAndImportData ────────────────────────────────────────────────────────

const makeDataJson = (overrides?: object) => JSON.stringify({
  version: 1,
  exportedAt: new Date().toISOString(),
  settings: { calorie_target: '2000', gallery_compare_before: null, gallery_compare_after: null },
  categories: ['Legs'],
  workouts: [{ id: 'w2', name: 'Leg Day', logged_at: '2024-02-01T00:00:00.000Z', exercises_json: '[]' }],
  meals: [],
  weightEntries: [],
  ...overrides,
});

function setupDocumentPicker(dataJson: string, galleryMeta?: string) {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///tmp/export.zip' }],
  });

  mockZipFileMap['data.json'] = dataJson;
  if (galleryMeta) mockZipFileMap['gallery_meta.json'] = galleryMeta;
  (mockJSZipInstance.files as any) = {};

  mockJSZipInstance.file.mockImplementation((name: string, content?: any) => {
    if (content !== undefined) {
      mockZipFileMap[name] = content;
      return mockJSZipInstance;
    }
    if (mockZipFileMap[name] !== undefined) {
      return { async: jest.fn().mockResolvedValue(mockZipFileMap[name]) };
    }
    return null;
  });
}

describe('pickAndImportData', () => {
  it('returns { imported: 0, errors: [] } when user cancels picker', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });
    const result = await pickAndImportData({ overrideConflicts: false, overrideAll: false });
    expect(result).toEqual({ imported: 0, errors: [] });
  });

  it('throws when data.json is missing from zip', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/export.zip' }],
    });
    mockJSZipInstance.file.mockReturnValue(null);
    await expect(pickAndImportData({ overrideConflicts: false, overrideAll: false })).rejects.toThrow('missing data.json');
  });

  it('throws when version is not 1', async () => {
    setupDocumentPicker(JSON.stringify({ version: 2 }));
    await expect(pickAndImportData({ overrideConflicts: false, overrideAll: false })).rejects.toThrow('Unsupported export version');
  });

  it('imports data without clearing tables when no override options', async () => {
    setupDocumentPicker(makeDataJson());
    await pickAndImportData({ overrideConflicts: false, overrideAll: false });
    expect(db.clearWorkouts).not.toHaveBeenCalled();
    expect(db.clearMeals).not.toHaveBeenCalled();
    expect(db.bulkInsertWorkouts).toHaveBeenCalled();
    expect(db.bulkInsertCategories).toHaveBeenCalledWith(['Legs']);
  });

  it('clears all tables when overrideAll is true', async () => {
    setupDocumentPicker(makeDataJson());
    await pickAndImportData({ overrideConflicts: false, overrideAll: true });
    expect(db.clearWorkouts).toHaveBeenCalled();
    expect(db.clearMeals).toHaveBeenCalled();
    expect(db.clearWeightEntries).toHaveBeenCalled();
    expect(db.clearGalleryItems).toHaveBeenCalled();
    expect(db.clearCategories).toHaveBeenCalled();
  });

  it('restores calorie_target setting from data.json', async () => {
    setupDocumentPicker(makeDataJson({ settings: { calorie_target: '2400', gallery_compare_before: null, gallery_compare_after: null } }));
    await pickAndImportData({ overrideConflicts: false, overrideAll: false });
    expect(db.setSetting).toHaveBeenCalledWith('calorie_target', '2400');
  });

  it('returns imported count equal to total records', async () => {
    const dataJson = makeDataJson({
      workouts: [{ id: 'w1', name: 'A', logged_at: '2024-01-01T00:00:00.000Z', exercises_json: '[]' }],
      meals: [{ id: 'm1', name: 'Rice', meal: 'LUNCH', detail: '', kcal: 200, protein: 10, carbs: 20, fat: 5, weight_grams: 100, image: null, logged_at: '2024-01-01T00:00:00.000Z' }],
      weightEntries: [],
    });
    const galleryMeta = JSON.stringify({ items: [] });
    setupDocumentPicker(dataJson, galleryMeta);
    const result = await pickAndImportData({ overrideConflicts: false, overrideAll: false });
    // workouts(1) + meals(1) + weightEntries(0) + gallery(0) = 2
    expect(result.imported).toBe(2);
    expect(result.errors).toHaveLength(0);
  });

  it('handles corrupt gallery_meta.json gracefully', async () => {
    setupDocumentPicker(makeDataJson(), 'NOT_VALID_JSON{{{');
    const result = await pickAndImportData({ overrideConflicts: false, overrideAll: false });
    expect(result.errors).toContain('Could not parse gallery_meta.json');
  });
});
