import { GitOperations } from '../../src/services/git-operations';
import simpleGit, { SimpleGit } from 'simple-git';

jest.mock('simple-git');

describe('GitOperations', () => {
  let gitOps: GitOperations;
  let mockGit: jest.Mocked<SimpleGit>;

  beforeEach(() => {
    mockGit = {
      branch: jest.fn(),
      checkout: jest.fn(),
      checkoutBranch: jest.fn(),
      add: jest.fn(),
      commit: jest.fn(),
      push: jest.fn(),
      pull: jest.fn(),
      rebase: jest.fn(),
      status: jest.fn(),
      log: jest.fn(),
      merge: jest.fn(),
      fetch: jest.fn(),
      diff: jest.fn(),
      revparse: jest.fn(),
      raw: jest.fn(),
      clean: jest.fn(),
      reset: jest.fn(),
      stash: jest.fn(),
      stashList: jest.fn(),
      stashPop: jest.fn()
    } as any;

    (simpleGit as jest.Mock).mockReturnValue(mockGit);
    gitOps = new GitOperations('/test/repo');
  });

  describe('createBranch', () => {
    it('should create and checkout a new branch', async () => {
      mockGit.checkoutBranch.mockResolvedValue(undefined as any);

      await gitOps.createBranch('feature/test-branch');

      expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feature/test-branch', 'HEAD');
    });

    it('should create branch from specific base', async () => {
      mockGit.checkoutBranch.mockResolvedValue(undefined as any);

      await gitOps.createBranch('feature/test-branch', 'main');

      expect(mockGit.checkoutBranch).toHaveBeenCalledWith('feature/test-branch', 'main');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      mockGit.branch.mockResolvedValue({
        current: 'feature/current-branch',
        all: [],
        branches: {}
      } as any);

      const branch = await gitOps.getCurrentBranch();

      expect(branch).toBe('feature/current-branch');
    });
  });

  describe('commit', () => {
    it('should add files and create commit', async () => {
      mockGit.add.mockResolvedValue(undefined as any);
      mockGit.commit.mockResolvedValue({
        commit: 'abc123',
        author: null,
        branch: 'main',
        root: false,
        summary: { changes: 1, deletions: 0, insertions: 1 }
      } as any);

      const result = await gitOps.commit('Test commit message', ['file1.ts', 'file2.ts']);

      expect(mockGit.add).toHaveBeenCalledWith(['file1.ts', 'file2.ts']);
      expect(mockGit.commit).toHaveBeenCalledWith('Test commit message');
      expect(result).toBe('abc123');
    });

    it('should add all files when no specific files provided', async () => {
      mockGit.add.mockResolvedValue(undefined as any);
      mockGit.commit.mockResolvedValue({
        commit: 'def456',
        author: null,
        branch: 'main',
        root: false,
        summary: { changes: 1, deletions: 0, insertions: 1 }
      } as any);

      await gitOps.commit('Test commit message');

      expect(mockGit.add).toHaveBeenCalledWith('.');
    });
  });

  describe('push', () => {
    it('should push current branch to remote', async () => {
      mockGit.branch.mockResolvedValue({
        current: 'feature/push-test',
        all: [],
        branches: {}
      } as any);
      mockGit.push.mockResolvedValue(undefined as any);

      await gitOps.push();

      expect(mockGit.push).toHaveBeenCalledWith('origin', 'feature/push-test', ['--set-upstream']);
    });

    it('should push with force if specified', async () => {
      mockGit.branch.mockResolvedValue({
        current: 'feature/force-push',
        all: [],
        branches: {}
      } as any);
      mockGit.push.mockResolvedValue(undefined as any);

      await gitOps.push(true);

      expect(mockGit.push).toHaveBeenCalledWith('origin', 'feature/force-push', ['--set-upstream', '--force-with-lease']);
    });
  });

  describe('rebase', () => {
    it('should rebase current branch on target', async () => {
      mockGit.rebase.mockResolvedValue(undefined as any);

      await gitOps.rebase('main');

      expect(mockGit.rebase).toHaveBeenCalledWith(['main']);
    });

    it('should handle rebase conflicts', async () => {
      mockGit.rebase.mockRejectedValue(new Error('Rebase conflict'));

      await expect(gitOps.rebase('main')).rejects.toThrow('Rebase conflict');
    });
  });

  describe('status', () => {
    it('should return repository status', async () => {
      const mockStatus = {
        current: 'feature/test',
        tracking: 'origin/feature/test',
        ahead: 2,
        behind: 0,
        modified: ['file1.ts'],
        created: ['file2.ts'],
        deleted: [],
        renamed: [],
        conflicted: [],
        files: []
      };

      mockGit.status.mockResolvedValue(mockStatus as any);

      const status = await gitOps.status();

      expect(status).toEqual(mockStatus);
    });
  });

  describe('isClean', () => {
    it('should return true for clean repository', async () => {
      mockGit.status.mockResolvedValue({
        files: [],
        modified: [],
        created: [],
        deleted: [],
        renamed: [],
        conflicted: []
      } as any);

      const isClean = await gitOps.isClean();

      expect(isClean).toBe(true);
    });

    it('should return false for dirty repository', async () => {
      mockGit.status.mockResolvedValue({
        files: [{ path: 'modified.ts', index: 'M', working_dir: 'M' }],
        modified: ['modified.ts'],
        created: [],
        deleted: [],
        renamed: [],
        conflicted: []
      } as any);

      const isClean = await gitOps.isClean();

      expect(isClean).toBe(false);
    });
  });

  describe('hasUnpushedCommits', () => {
    it('should return true when ahead of remote', async () => {
      mockGit.status.mockResolvedValue({
        ahead: 3,
        behind: 0,
        tracking: 'origin/feature/test'
      } as any);

      const hasUnpushed = await gitOps.hasUnpushedCommits();

      expect(hasUnpushed).toBe(true);
    });

    it('should return false when up to date with remote', async () => {
      mockGit.status.mockResolvedValue({
        ahead: 0,
        behind: 0,
        tracking: 'origin/feature/test'
      } as any);

      const hasUnpushed = await gitOps.hasUnpushedCommits();

      expect(hasUnpushed).toBe(false);
    });
  });

  describe('getLastCommit', () => {
    it('should return last commit information', async () => {
      mockGit.log.mockResolvedValue({
        latest: {
          hash: 'abc123def',
          date: '2025-01-01T00:00:00.000Z',
          message: 'Test commit',
          author_name: 'Test Author',
          author_email: 'test@example.com'
        },
        total: 1,
        all: []
      } as any);

      const commit = await gitOps.getLastCommit();

      expect(commit).toEqual({
        hash: 'abc123def',
        date: '2025-01-01T00:00:00.000Z',
        message: 'Test commit',
        author_name: 'Test Author',
        author_email: 'test@example.com'
      });
      expect(mockGit.log).toHaveBeenCalledWith(['-1']);
    });
  });

  describe('stash', () => {
    it('should stash changes with message', async () => {
      mockGit.stash.mockResolvedValue('Saved working directory');

      await gitOps.stash('WIP: test changes');

      expect(mockGit.stash).toHaveBeenCalledWith(['push', '-m', 'WIP: test changes']);
    });

    it('should pop stash', async () => {
      mockGit.stash.mockResolvedValue('Applied stash');

      await gitOps.stashPop();

      expect(mockGit.stash).toHaveBeenCalledWith(['pop']);
    });
  });
});