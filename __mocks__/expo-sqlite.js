// Mock for expo-sqlite used in Jest tests
const createMockDb = () => {
  const store = {
    settings: {},
    categories: [],
    workouts: [],
    meals: [],
    weight_entries: [],
    gallery_items: [],
  };

  return {
    _store: store,
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    withTransactionAsync: jest.fn().mockImplementation(async (fn) => fn()),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };
};

let _mockDb = null;

module.exports = {
  openDatabaseAsync: jest.fn().mockImplementation(async () => {
    _mockDb = createMockDb();
    return _mockDb;
  }),
  openDatabaseSync: jest.fn().mockImplementation(() => {
    _mockDb = createMockDb();
    return _mockDb;
  }),
  getMockDb: () => _mockDb,
  resetMockDb: () => {
    _mockDb = null;
  },
};
