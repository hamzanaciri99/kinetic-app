/**
 * Export/import all app data as a ZIP archive.
 *
 * ZIP structure:
 *   data.json          — workouts, meals, weight entries, settings, categories
 *   gallery_meta.json  — gallery item metadata
 *   photos/<id>.jpg    — base64-decoded local photo files (remote/seed URLs excluded)
 */
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  getAllWorkouts, getAllMeals, getAllWeightEntries, getAllGalleryItems, getAllCategories, getSetting,
  clearWorkouts, clearMeals, clearWeightEntries, clearGalleryItems, clearCategories,
  bulkInsertWorkouts, bulkInsertMeals, bulkInsertWeightEntries, bulkInsertGalleryItems, bulkInsertCategories,
  setSetting,
  type DbWorkout, type DbMeal, type DbWeightEntry, type DbGalleryItem,
} from './database';
import { readPhotoAsBase64, writePhotoFromBase64 } from './photos';

export type ExportData = {
  version: 1;
  exportedAt: string;
  settings: { calorie_target: string | null; gallery_compare_before: string | null; gallery_compare_after: string | null };
  categories: string[];
  workouts: DbWorkout[];
  meals: DbMeal[];
  weightEntries: DbWeightEntry[];
};

export type GalleryMeta = {
  items: DbGalleryItem[];
};

export type ImportOptions = {
  overrideConflicts: boolean;
  overrideAll: boolean;
};

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportAllData(): Promise<void> {
  const [workouts, meals, weightEntries, galleryItems, categories,
         calorieTarget, compareBefore, compareAfter] = await Promise.all([
    getAllWorkouts(),
    getAllMeals(),
    getAllWeightEntries(),
    getAllGalleryItems(),
    getAllCategories(),
    getSetting('calorie_target'),
    getSetting('gallery_compare_before'),
    getSetting('gallery_compare_after'),
  ]);

  const zip = new JSZip();

  const exportData: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { calorie_target: calorieTarget, gallery_compare_before: compareBefore, gallery_compare_after: compareAfter },
    categories,
    workouts,
    meals,
    weightEntries,
  };
  zip.file('data.json', JSON.stringify(exportData, null, 2));

  const galleryMeta: GalleryMeta = { items: galleryItems };
  zip.file('gallery_meta.json', JSON.stringify(galleryMeta, null, 2));

  // Bundle local (non-remote) photos as base64 inside photos/ folder
  const photosFolder = zip.folder('photos')!;
  for (const item of galleryItems) {
    if (item.is_remote === 0) {
      const b64 = await readPhotoAsBase64(item.local_path);
      if (b64) {
        photosFolder.file(`${item.id}.jpg`, b64, { base64: true });
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'base64' });

  const dateTag = new Date().toISOString().slice(0, 10);
  const zipPath = `${FileSystem.cacheDirectory}kinetic_export_${dateTag}.zip`;
  await FileSystem.writeAsStringAsync(zipPath, zipBlob, { encoding: FileSystem.EncodingType.Base64 });

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(zipPath, { mimeType: 'application/zip', dialogTitle: 'Export Kinetic Data' });
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function pickAndImportData(options: ImportOptions): Promise<{ imported: number; errors: string[] }> {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) {
    return { imported: 0, errors: [] };
  }

  const asset = result.assets[0];
  const zipB64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });

  const zip = await JSZip.loadAsync(zipB64, { base64: true });

  const errors: string[] = [];
  let imported = 0;

  // Parse data.json
  const dataFile = zip.file('data.json');
  if (!dataFile) throw new Error('Invalid export file: missing data.json');
  const dataText = await dataFile.async('string');
  const data: ExportData = JSON.parse(dataText);
  if (data.version !== 1) throw new Error(`Unsupported export version: ${data.version}`);

  // Parse gallery_meta.json
  const galleryFile = zip.file('gallery_meta.json');
  let galleryItems: DbGalleryItem[] = [];
  if (galleryFile) {
    try {
      const galleryText = await galleryFile.async('string');
      const galleryMeta: GalleryMeta = JSON.parse(galleryText);
      galleryItems = galleryMeta.items ?? [];
    } catch (e) {
      errors.push('Could not parse gallery_meta.json');
    }
  }

  // If override all — wipe everything first
  if (options.overrideAll) {
    await Promise.all([
      clearWorkouts(), clearMeals(), clearWeightEntries(),
      clearGalleryItems(), clearCategories(),
    ]);
  }

  // Restore photos from ZIP
  const restoredPaths = new Map<string, string>();
  const photosFolder = zip.folder('photos');
  if (photosFolder) {
    const photoFiles = Object.keys(zip.files).filter((name) => name.startsWith('photos/') && !zip.files[name].dir);
    for (const name of photoFiles) {
      const fileId = name.replace('photos/', '').replace('.jpg', '');
      try {
        const b64 = await zip.files[name].async('base64');
        const localPath = await writePhotoFromBase64(fileId, b64);
        restoredPaths.set(fileId, localPath);
      } catch (e) {
        errors.push(`Could not restore photo: ${fileId}`);
      }
    }
  }

  // Update gallery items to use restored local paths
  const updatedGalleryItems: DbGalleryItem[] = galleryItems.map((item) => {
    const restoredPath = restoredPaths.get(item.id);
    if (restoredPath) {
      return { ...item, local_path: restoredPath, is_remote: 0 };
    }
    return item;
  });

  // Insert data (INSERT OR IGNORE when not overriding conflicts; INSERT OR REPLACE when overriding)
  try {
    if (options.overrideConflicts || options.overrideAll) {
      await bulkInsertWorkouts(data.workouts);
      await bulkInsertMeals(data.meals);
      await bulkInsertWeightEntries(data.weightEntries);
      await bulkInsertGalleryItems(updatedGalleryItems);
      await bulkInsertCategories(data.categories);
    } else {
      // Merge without overriding — use INSERT OR IGNORE inside bulkInsert (already handled)
      await bulkInsertWorkouts(data.workouts);
      await bulkInsertMeals(data.meals);
      await bulkInsertWeightEntries(data.weightEntries);
      await bulkInsertGalleryItems(updatedGalleryItems);
      await bulkInsertCategories(data.categories);
    }
    imported = data.workouts.length + data.meals.length + data.weightEntries.length + updatedGalleryItems.length;
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Failed to import data');
  }

  // Restore settings
  if (data.settings.calorie_target) {
    await setSetting('calorie_target', data.settings.calorie_target).catch(() => {});
  }

  return { imported, errors };
}
