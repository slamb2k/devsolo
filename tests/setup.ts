import { jest } from '@jest/globals';

// Mock console methods during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set test environment variables
process.env['NODE_ENV'] = 'test';
process.env['HANSOLO_TEST_MODE'] = 'true';

// Mock Git operations by default
jest.mock('simple-git', () => {
  return () => ({
    init: jest.fn(() => Promise.resolve(undefined)),
    branch: jest.fn(() => Promise.resolve({ all: [], current: 'main' })),
    checkout: jest.fn(() => Promise.resolve(undefined)),
    checkoutBranch: jest.fn(() => Promise.resolve(undefined)),
    status: jest.fn(() => Promise.resolve({
      current: 'main',
      tracking: 'origin/main',
      ahead: 0,
      behind: 0,
      files: [],
      staged: [],
      modified: [],
      not_added: [],
      deleted: [],
      renamed: [],
      conflicted: [],
      created: [],
      isClean: () => true,
    })),
    add: jest.fn(() => Promise.resolve(undefined)),
    commit: jest.fn(() => Promise.resolve({ commit: 'abc123' })),
    push: jest.fn(() => Promise.resolve(undefined)),
    pull: jest.fn(() => Promise.resolve(undefined)),
    rebase: jest.fn(() => Promise.resolve(undefined)),
    merge: jest.fn(() => Promise.resolve(undefined)),
    deleteLocalBranch: jest.fn(() => Promise.resolve(undefined)),
    raw: jest.fn(() => Promise.resolve('')),
    getRemotes: jest.fn(() => Promise.resolve([])),
    revparse: jest.fn(() => Promise.resolve('abc123')),
    diff: jest.fn(() => Promise.resolve('')),
    log: jest.fn(() => Promise.resolve({ all: [] })),
    tags: jest.fn(() => Promise.resolve({ all: [] })),
    tag: jest.fn(() => Promise.resolve(undefined)),
    addRemote: jest.fn(() => Promise.resolve(undefined)),
    fetch: jest.fn(() => Promise.resolve(undefined)),
    stash: jest.fn(() => Promise.resolve('')),
  });
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);