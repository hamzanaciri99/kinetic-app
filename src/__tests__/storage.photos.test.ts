jest.mock('expo-file-system/legacy', () => {
  const store = new Map<string, string>();
  const EncodingType = { Base64: 'base64', UTF8: 'utf8' };
  return {
    EncodingType,
    documentDirectory: 'file:///app-documents/',
    cacheDirectory: 'file:///app-cache/',
    getInfoAsync: jest.fn().mockImplementation(async (uri: string) => ({
      exists: store.has(uri), isDirectory: false,
      size: store.has(uri) ? (store.get(uri) || '').length : 0, uri,
    })),
    copyAsync: jest.fn().mockImplementation(async ({ from, to }: { from: string; to: string }) => {
      store.set(to, store.get(from) ?? 'mock-file-data');
    }),
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
    deleteAsync: jest.fn().mockImplementation(async (uri: string) => { store.delete(uri); }),
    writeAsStringAsync: jest.fn().mockImplementation(async (uri: string, data: string) => { store.set(uri, data); }),
    readAsStringAsync: jest.fn().mockImplementation(async (uri: string) => {
      const data = store.get(uri);
      if (data === undefined) throw new Error(`File not found: ${uri}`);
      return data;
    }),
    _store: store,
    _reset: () => store.clear(),
  };
});

import * as FileSystem from 'expo-file-system/legacy';
import {
  ensurePhotosDirExists,
  savePhotoToAppDir,
  isPhotoAccessible,
  deleteLocalPhoto,
  readPhotoAsBase64,
  writePhotoFromBase64,
} from '../storage/photos';

const PHOTOS_DIR = 'file:///app-documents/kinetic-photos/';

beforeEach(() => {
  jest.clearAllMocks();
  (FileSystem as any)._reset();
});

describe('ensurePhotosDirExists', () => {
  it('creates directory when it does not exist', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
    await ensurePhotosDirExists();
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(PHOTOS_DIR, { intermediates: true });
  });

  it('does not recreate directory when it already exists', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
    await ensurePhotosDirExists();
    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
  });
});

describe('savePhotoToAppDir', () => {
  it('copies the file and returns the destination path', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
    const dest = await savePhotoToAppDir('file:///tmp/photo.jpg', 'abc123');
    expect(FileSystem.copyAsync).toHaveBeenCalledWith({
      from: 'file:///tmp/photo.jpg',
      to: `${PHOTOS_DIR}abc123.jpg`,
    });
    expect(dest).toBe(`${PHOTOS_DIR}abc123.jpg`);
  });
});

describe('isPhotoAccessible', () => {
  it('returns true for https URLs without checking file system', async () => {
    const result = await isPhotoAccessible('https://example.com/photo.jpg');
    expect(result).toBe(true);
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
  });

  it('returns true for http URLs', async () => {
    const result = await isPhotoAccessible('http://example.com/photo.jpg');
    expect(result).toBe(true);
  });

  it('returns true when local file exists', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
    const result = await isPhotoAccessible('file:///app-documents/kinetic-photos/abc.jpg');
    expect(result).toBe(true);
  });

  it('returns false when local file does not exist', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
    const result = await isPhotoAccessible('file:///app-documents/kinetic-photos/missing.jpg');
    expect(result).toBe(false);
  });

  it('returns false when getInfoAsync throws', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
    const result = await isPhotoAccessible('file:///restricted/photo.jpg');
    expect(result).toBe(false);
  });
});

describe('deleteLocalPhoto', () => {
  it('is a no-op for remote URLs', async () => {
    await deleteLocalPhoto('https://example.com/photo.jpg');
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it('deletes existing local file', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
    await deleteLocalPhoto('file:///app-documents/kinetic-photos/abc.jpg');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///app-documents/kinetic-photos/abc.jpg', { idempotent: true });
  });

  it('skips deletion when file does not exist', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: false });
    await deleteLocalPhoto('file:///app-documents/kinetic-photos/missing.jpg');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it('silently handles errors', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValueOnce(new Error('Error'));
    await expect(deleteLocalPhoto('file:///app-documents/error.jpg')).resolves.not.toThrow();
  });
});

describe('readPhotoAsBase64', () => {
  it('returns null for remote URLs', async () => {
    const result = await readPhotoAsBase64('https://example.com/photo.jpg');
    expect(result).toBeNull();
  });

  it('reads and returns base64 for local file', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValueOnce('base64data');
    const result = await readPhotoAsBase64('file:///app-documents/kinetic-photos/abc.jpg');
    expect(result).toBe('base64data');
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      'file:///app-documents/kinetic-photos/abc.jpg',
      { encoding: FileSystem.EncodingType.Base64 },
    );
  });

  it('returns null when read fails', async () => {
    (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValueOnce(new Error('Read error'));
    const result = await readPhotoAsBase64('file:///app-documents/error.jpg');
    expect(result).toBeNull();
  });
});

describe('writePhotoFromBase64', () => {
  it('writes base64 data and returns local path', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });
    const path = await writePhotoFromBase64('myid', 'abc123base64');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      `${PHOTOS_DIR}myid.jpg`,
      'abc123base64',
      { encoding: FileSystem.EncodingType.Base64 },
    );
    expect(path).toBe(`${PHOTOS_DIR}myid.jpg`);
  });
});
