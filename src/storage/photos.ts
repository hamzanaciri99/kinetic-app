/**
 * Local photo file management.
 * Captured photos are copied from the picker's temp URI into the app's document directory
 * under `kinetic-photos/<id>.jpg`, making them permanent and portable across app restarts.
 *
 * Seed photos remain as remote HTTPS URLs (is_remote = 1) and are never copied locally.
 * If a user deletes a local file via the system file manager, `isPhotoAccessible` returns false
 * and the gallery shows a "Picture not found" placeholder instead.
 */
import * as FileSystem from 'expo-file-system/legacy';

const PHOTOS_DIR = `${FileSystem.documentDirectory}kinetic-photos/`;

export async function ensurePhotosDirExists(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
  }
}

/**
 * Copy the image at `tempUri` (from expo-image-picker or another transient source)
 * into the app's permanent photos folder and return the new local `file://` URI.
 */
export async function savePhotoToAppDir(tempUri: string, id: string): Promise<string> {
  await ensurePhotosDirExists();
  const destPath = `${PHOTOS_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: destPath });
  return destPath;
}

/**
 * Returns true when the file at `localPath` is accessible on disk.
 * Remote URLs (http/https) are always considered accessible (network is the responsibility of the caller).
 */
export async function isPhotoAccessible(localPath: string): Promise<boolean> {
  if (localPath.startsWith('http://') || localPath.startsWith('https://')) return true;
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    return info.exists;
  } catch {
    return false;
  }
}

/**
 * Delete a locally stored photo file.  Safe to call on remote URLs (no-op).
 */
export async function deleteLocalPhoto(localPath: string): Promise<void> {
  if (localPath.startsWith('http://') || localPath.startsWith('https://')) return;
  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    }
  } catch {
    // Best-effort
  }
}

/**
 * Read a local photo as a base64 string (for export bundling).
 * Returns null for remote URLs (they are not bundled into the export).
 */
export async function readPhotoAsBase64(localPath: string): Promise<string | null> {
  if (localPath.startsWith('http://') || localPath.startsWith('https://')) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.Base64 });
    return b64;
  } catch {
    return null;
  }
}

/**
 * Write a base64-encoded photo to the app's photos directory.
 * Returns the new local `file://` URI.
 */
export async function writePhotoFromBase64(id: string, base64: string): Promise<string> {
  await ensurePhotosDirExists();
  const destPath = `${PHOTOS_DIR}${id}.jpg`;
  await FileSystem.writeAsStringAsync(destPath, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destPath;
}
