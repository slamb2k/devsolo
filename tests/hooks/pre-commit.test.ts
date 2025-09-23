import { PreCommitHook } from '../../src/hooks/pre-commit';
import { GitOperations } from '../../src/services/git-operations';
import { ConsoleOutput } from '../../src/ui/console-output';

jest.mock('../../src/services/git-operations');
jest.mock('../../src/ui/console-output');

describe('PreCommitHook', () => {
  let preCommitHook: PreCommitHook;
  let mockGitOps: jest.Mocked<GitOperations>;
  let mockConsole: jest.Mocked<ConsoleOutput>;

  beforeEach(() => {
    mockGitOps = new GitOperations('') as jest.Mocked<GitOperations>;
    mockConsole = new ConsoleOutput() as jest.Mocked<ConsoleOutput>;
    preCommitHook = new PreCommitHook(mockGitOps, mockConsole);
  });

  describe('run', () => {
    it('should allow commits on feature branches', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('feature/test-branch');

      const result = await preCommitHook.run();

      expect(result).toBe(true);
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should allow commits on hotfix branches', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('hotfix/critical-fix');

      const result = await preCommitHook.run();

      expect(result).toBe(true);
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should allow commits on release branches', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('release/v1.0.0');

      const result = await preCommitHook.run();

      expect(result).toBe(true);
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should block direct commits to main branch', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('main');

      const result = await preCommitHook.run();

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Direct commits to main branch are not allowed')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('/hansolo:launch')
      );
    });

    it('should block direct commits to master branch', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('master');

      const result = await preCommitHook.run();

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Direct commits to master branch are not allowed')
      );
    });

    it('should block direct commits to develop branch', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('develop');

      const result = await preCommitHook.run();

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Direct commits to develop branch are not allowed')
      );
    });

    it('should check for workflow session on feature branches', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('feature/with-session');
      // Mock session check
      preCommitHook.hasActiveSession = jest.fn().mockResolvedValue(true);

      const result = await preCommitHook.run();

      expect(result).toBe(true);
      expect(preCommitHook.hasActiveSession).toHaveBeenCalledWith('feature/with-session');
    });

    it('should warn if no active session on feature branch', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('feature/no-session');
      preCommitHook.hasActiveSession = jest.fn().mockResolvedValue(false);

      const result = await preCommitHook.run();

      expect(result).toBe(true); // Still allows commit
      expect(mockConsole.warning).toHaveBeenCalledWith(
        expect.stringContaining('No active han-solo session')
      );
    });

    it('should validate commit message format', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('feature/test');
      process.env.HANSOLO_COMMIT_MSG = 'feat: add new feature\n\nDetailed description';

      const result = await preCommitHook.run();

      expect(result).toBe(true);
    });

    it('should reject commits with invalid message format', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('feature/test');
      process.env.HANSOLO_COMMIT_MSG = 'bad commit message';

      preCommitHook.validateCommitMessage = jest.fn().mockReturnValue(false);

      const result = await preCommitHook.run();

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid commit message format')
      );
    });

    it('should check for staged files', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('feature/test');
      mockGitOps.status.mockResolvedValue({
        files: [],
        staged: [],
        modified: [],
        created: [],
        deleted: [],
        renamed: [],
        conflicted: []
      } as any);

      const result = await preCommitHook.run();

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('No files staged for commit')
      );
    });

    it('should prevent commits with unresolved conflicts', async () => {
      mockGitOps.getCurrentBranch.mockResolvedValue('feature/test');
      mockGitOps.status.mockResolvedValue({
        files: [{ path: 'conflicted.ts' }],
        conflicted: ['conflicted.ts'],
        staged: ['other.ts']
      } as any);

      const result = await preCommitHook.run();

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Unresolved conflicts detected')
      );
    });

    it('should handle errors gracefully', async () => {
      mockGitOps.getCurrentBranch.mockRejectedValue(new Error('Git error'));

      const result = await preCommitHook.run();

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Pre-commit hook error')
      );
    });
  });

  describe('install', () => {
    it('should install pre-commit hook to .git/hooks', async () => {
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(true);
      jest.spyOn(mockFs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(mockFs, 'chmodSync').mockImplementation(() => {});

      await PreCommitHook.install('/test/repo');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/repo/.git/hooks/pre-commit',
        expect.stringContaining('#!/bin/sh')
      );
      expect(mockFs.chmodSync).toHaveBeenCalledWith(
        '/test/repo/.git/hooks/pre-commit',
        '755'
      );
    });

    it('should not install if .git directory does not exist', async () => {
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(false);
      jest.spyOn(mockFs, 'writeFileSync').mockImplementation(() => {});

      await PreCommitHook.install('/test/repo');

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      expect(mockConsole.warning).toHaveBeenCalledWith(
        expect.stringContaining('Not a git repository')
      );
    });
  });

  describe('uninstall', () => {
    it('should remove pre-commit hook', async () => {
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(true);
      jest.spyOn(mockFs, 'unlinkSync').mockImplementation(() => {});

      await PreCommitHook.uninstall('/test/repo');

      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        '/test/repo/.git/hooks/pre-commit'
      );
    });

    it('should handle non-existent hook gracefully', async () => {
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(false);
      jest.spyOn(mockFs, 'unlinkSync').mockImplementation(() => {});

      await PreCommitHook.uninstall('/test/repo');

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });
});