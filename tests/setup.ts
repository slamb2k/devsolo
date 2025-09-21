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
    init: jest.fn().mockResolvedValue(undefined as any),
    branch: jest.fn().mockResolvedValue({ all: [], current: 'main' } as any),
    checkout: jest.fn().mockResolvedValue(undefined as any),
    checkoutBranch: jest.fn().mockResolvedValue(undefined as any),
    status: jest.fn().mockResolvedValue({
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
    } as any),
    add: jest.fn().mockResolvedValue(undefined as any),
    commit: jest.fn().mockResolvedValue({ commit: 'abc123' } as any),
    push: jest.fn().mockResolvedValue(undefined as any),
    pull: jest.fn().mockResolvedValue(undefined as any),
    rebase: jest.fn().mockResolvedValue(undefined as any),
    merge: jest.fn().mockResolvedValue(undefined as any),
    deleteLocalBranch: jest.fn().mockResolvedValue(undefined as any),
    raw: jest.fn().mockResolvedValue('' as any),
  });
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);