const EncodingType = { Base64: 'base64', UTF8: 'utf8' };

const _store = new Map();

module.exports = {
  EncodingType,
  documentDirectory: 'file:///app-documents/',
  cacheDirectory: 'file:///app-cache/',
  getInfoAsync: jest.fn().mockImplementation(async (uri) => ({
    exists: _store.has(uri),
    isDirectory: false,
    size: _store.has(uri) ? (_store.get(uri) || '').length : 0,
    uri,
  })),
  copyAsync: jest.fn().mockImplementation(async ({ from, to }) => {
    _store.set(to, _store.get(from) ?? 'mock-file-data');
  }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockImplementation(async (uri) => {
    _store.delete(uri);
  }),
  writeAsStringAsync: jest.fn().mockImplementation(async (uri, data) => {
    _store.set(uri, data);
  }),
  readAsStringAsync: jest.fn().mockImplementation(async (uri) => {
    const data = _store.get(uri);
    if (data === undefined) throw new Error(`File not found: ${uri}`);
    return data;
  }),
  _store,
  _reset: () => _store.clear(),
};
