import { ContextDetector } from '../../services/ContextDetector';
import { execSync } from 'child_process';
import fs from 'fs';

jest.mock('child_process');
jest.mock('fs');

describe('ContextDetector', () => {
  let detector: ContextDetector;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    detector = new ContextDetector();
    jest.clearAllMocks();

    // Reset environment variables
    delete process.env['npm_config_user_agent'];
    delete process.env['CI'];
    delete process.env['HOME'];
    delete process.env['USERPROFILE'];

    // Set defaults
    process.env['HOME'] = '/home/user';
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
    });
  });

  describe('detect', () => {
    it('should detect all context properties', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockExecSync.mockReturnValue('git@github.com:user/repo.git\n' as any);

      const context = await detector.detect();

      expect(context).toHaveProperty('installationType');
      expect(context).toHaveProperty('isCI');
      expect(context).toHaveProperty('hasTTY');
      expect(context).toHaveProperty('globalPath');
      expect(context).toHaveProperty('localPath');
    });

    it('should detect npx installation', async () => {
      process.env['npm_config_user_agent'] = 'npm/8.0.0 node/v16.0.0 linux x64 npx/8.0.0';
      mockFs.existsSync.mockReturnValue(false);

      const context = await detector.detect();

      expect(context.installationType).toBe('npx');
    });

    it('should detect global installation', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd === 'npm config get prefix') {
          return '/usr/local' as any;
        }
        return '' as any;
      });

      Object.defineProperty(process.argv, '1', {
        value: '/usr/local/bin/hansolo',
        writable: true,
      });

      mockFs.existsSync.mockReturnValue(false);

      const context = await detector.detect();

      expect(context.installationType).toBe('global');
    });

    it('should detect CI environment', async () => {
      process.env['CI'] = 'true';
      mockFs.existsSync.mockReturnValue(false);

      const context = await detector.detect();

      expect(context.isCI).toBe(true);
    });

    it('should detect GitHub integration', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git remote')) {
          return 'origin\tgit@github.com:user/repo.git (fetch)\n' as any;
        }
        return '' as any;
      });
      mockFs.existsSync.mockReturnValue(false);

      const context = await detector.detect();

      expect(context.hasGitHub).toBe(true);
    });

    it('should detect GitLab integration', async () => {
      mockExecSync.mockImplementation((cmd) => {
        if (cmd.includes('git remote')) {
          return 'origin\tgit@gitlab.com:user/repo.git (fetch)\n' as any;
        }
        return '' as any;
      });
      mockFs.existsSync.mockReturnValue(false);

      const context = await detector.detect();

      expect(context.hasGitLab).toBe(true);
    });

    it('should detect existing installation as upgrade', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString().includes('config.yaml');
      });
      mockFs.readFileSync.mockReturnValue('version: 0.9.0\n');

      const context = await detector.detect();

      expect(context.isUpgrade).toBe(true);
      expect(context.currentVersion).toBe('0.9.0');
    });

    it('should detect yarn package manager', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString() === 'yarn.lock';
      });

      const context = await detector.detect();

      expect(context.packageManager).toBe('yarn');
    });

    it('should detect pnpm package manager', async () => {
      mockFs.existsSync.mockImplementation((path) => {
        return path.toString() === 'pnpm-lock.yaml';
      });

      const context = await detector.detect();

      expect(context.packageManager).toBe('pnpm');
    });

    it('should handle errors gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });
      mockFs.existsSync.mockReturnValue(false);

      const context = await detector.detect();

      expect(context.hasGitHub).toBe(false);
      expect(context.hasGitLab).toBe(false);
      expect(context.installationType).toBe('local');
    });
  });
});