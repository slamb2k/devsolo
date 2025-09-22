import { MCPServer } from '../../src/mcp-server/server';
import { ConfigurationManager } from '../../src/services/configuration-manager';
import { GitOperations } from '../../src/services/git-operations';
import { ValidationService } from '../../src/services/validation-service';
import { SessionRepository } from '../../src/services/session-repository';
import fs from 'fs/promises';
import path from 'path';

describe('Integration: Project Initialization Scenario', () => {
  let server: MCPServer;
  let configManager: ConfigurationManager;
  let gitOps: GitOperations;
  let validationService: ValidationService;
  let sessionRepo: SessionRepository;
  let testProjectPath: string;

  beforeEach(async () => {
    // Setup test project directory
    testProjectPath = path.join('/tmp', 'hansolo-test-' + Date.now());
    await fs.mkdir(testProjectPath, { recursive: true });
    process.chdir(testProjectPath);

    // Initialize services
    configManager = new ConfigurationManager();
    gitOps = new GitOperations();
    validationService = new ValidationService(gitOps, configManager);
    sessionRepo = new SessionRepository();
    server = new MCPServer(sessionRepo);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  describe('First-time Setup', () => {
    it('should complete full project initialization flow', async () => {
      // Step 1: Validate environment
      const envResult = await server.handleToolCall('validate_environment', {
        checks: ['git', 'node', 'permissions']
      });
      expect(envResult.success).toBe(true);
      expect(envResult.checks.git.installed).toBe(true);

      // Step 2: Initialize Git repository if needed
      if (!await gitOps.isGitRepository()) {
        await gitOps.init();
        await gitOps.setConfig('user.name', 'Test User');
        await gitOps.setConfig('user.email', 'test@example.com');
      }

      // Step 3: Configure han-solo
      const configResult = await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        defaultBranch: 'main',
        platform: 'github',
        settings: {
          autoStash: true,
          verboseOutput: false,
          colorScheme: 'auto'
        }
      });
      expect(configResult.success).toBe(true);
      expect(configResult.configuration.initialized).toBe(true);

      // Step 4: Create hansolo.yaml
      const config = await configManager.load();
      await configManager.save(config);

      const configFile = path.join(testProjectPath, 'hansolo.yaml');
      const exists = await fs.access(configFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Step 5: Install Git hooks
      const hooksDir = path.join(testProjectPath, '.git', 'hooks');
      await fs.mkdir(hooksDir, { recursive: true });

      const preCommitHook = `#!/bin/bash
# han-solo pre-commit hook
if git diff --cached --name-only | grep -q "^main$"; then
  echo "Direct commits to main branch are not allowed"
  exit 1
fi`;

      await fs.writeFile(
        path.join(hooksDir, 'pre-commit'),
        preCommitHook,
        { mode: 0o755 }
      );

      // Step 6: Create .hansolo directory structure
      const hansoloDir = path.join(testProjectPath, '.hansolo');
      await fs.mkdir(path.join(hansoloDir, 'sessions'), { recursive: true });
      await fs.mkdir(path.join(hansoloDir, 'logs'), { recursive: true });
      await fs.mkdir(path.join(hansoloDir, 'temp'), { recursive: true });

      // Step 7: Verify initialization
      const statusResult = await server.handleToolCall('get_sessions_status', {});
      expect(statusResult.success).toBe(true);
      expect(statusResult.initialized).toBe(true);
      expect(statusResult.sessions).toEqual([]);
    });

    it('should handle existing Git repository', async () => {
      // Initialize Git repo first
      await gitOps.init();
      await gitOps.setConfig('user.name', 'Existing User');
      await gitOps.setConfig('user.email', 'existing@example.com');

      // Add initial commit
      await fs.writeFile(path.join(testProjectPath, 'README.md'), '# Test Project');
      await gitOps.add('.');
      await gitOps.commit('Initial commit');

      // Now initialize han-solo
      const result = await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        defaultBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.configuration.remoteUrl).toBeDefined();
      expect(result.existingRepo).toBe(true);
    });

    it('should detect and configure GitHub repository', async () => {
      await gitOps.init();
      await gitOps.addRemote('origin', 'https://github.com/user/repo.git');

      const result = await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        autoDetect: true
      });

      expect(result.success).toBe(true);
      expect(result.configuration.platform).toBe('github');
      expect(result.configuration.remoteUrl).toContain('github.com');
    });

    it('should detect and configure GitLab repository', async () => {
      await gitOps.init();
      await gitOps.addRemote('origin', 'git@gitlab.com:user/repo.git');

      const result = await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        autoDetect: true
      });

      expect(result.success).toBe(true);
      expect(result.configuration.platform).toBe('gitlab');
      expect(result.configuration.remoteUrl).toContain('gitlab.com');
    });
  });

  describe('Configuration Management', () => {
    it('should persist configuration across sessions', async () => {
      // Initial configuration
      const config1 = await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        settings: {
          autoStash: true,
          maxSessions: 5
        }
      });

      // Simulate new session (recreate services)
      const newConfigManager = new ConfigurationManager();
      const config2 = await newConfigManager.load();

      expect(config2.settings.autoStash).toBe(true);
      expect(config2.settings.maxSessions).toBe(5);
    });

    it('should update existing configuration', async () => {
      // Initial setup
      await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        settings: { autoStash: false }
      });

      // Update configuration
      const result = await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        settings: { autoStash: true, verboseOutput: true }
      });

      expect(result.success).toBe(true);
      expect(result.configuration.settings.autoStash).toBe(true);
      expect(result.configuration.settings.verboseOutput).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Git installation', async () => {
      jest.spyOn(gitOps, 'isInstalled').mockResolvedValue(false);

      const result = await server.handleToolCall('validate_environment', {});

      expect(result.checks.git.installed).toBe(false);
      expect(result.recommendations).toContain('Install Git');
    });

    it('should handle permission issues', async () => {
      const readOnlyPath = '/readonly-path';

      const result = await server.handleToolCall('configure_workflow', {
        projectPath: readOnlyPath
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should validate Node.js version', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['node']
      });

      expect(result.checks.node.version).toBeDefined();
      expect(result.checks.node.meetsMinimum).toBeDefined();

      if (!result.checks.node.meetsMinimum) {
        expect(result.recommendations).toContain('Update Node.js');
      }
    });
  });

  describe('Multi-platform Support', () => {
    it('should work on different platforms', async () => {
      const platform = process.platform;

      const result = await server.handleToolCall('validate_environment', {
        checks: ['platform']
      });

      expect(['darwin', 'linux', 'win32']).toContain(result.platform);

      if (platform === 'win32') {
        expect(result.platformSpecific.gitBash).toBeDefined();
      }
    });

    it('should handle platform-specific path separators', async () => {
      const result = await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath
      });

      expect(result.success).toBe(true);
      const normalizedPath = path.normalize(result.configuration.projectPath);
      expect(normalizedPath).toBe(path.normalize(testProjectPath));
    });
  });

  describe('Initialization Validation', () => {
    it('should prevent operations before initialization', async () => {
      const result = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature-test'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not initialized');
      expect(result.suggestion).toContain('run /hansolo:init first');
    });

    it('should check for hansolo.yaml', async () => {
      const hasConfig = await configManager.exists();
      expect(hasConfig).toBe(false);

      await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath
      });

      const hasConfigAfter = await configManager.exists();
      expect(hasConfigAfter).toBe(true);
    });
  });

  describe('Complete Initialization Flow', () => {
    it('should simulate real user initialization', async () => {
      // User runs /hansolo:init command
      const initSteps = [];

      // Step 1: Check environment
      initSteps.push(await server.handleToolCall('validate_environment', {}));

      // Step 2: Configure project
      initSteps.push(await server.handleToolCall('configure_workflow', {
        projectPath: testProjectPath,
        defaultBranch: 'main',
        platform: 'github'
      }));

      // Step 3: Setup Git if needed
      if (!await gitOps.isGitRepository()) {
        await gitOps.init();
        initSteps.push({ step: 'git_init', success: true });
      }

      // Step 4: Create initial commit if empty
      const hasCommits = await gitOps.hasCommits();
      if (!hasCommits) {
        await fs.writeFile(path.join(testProjectPath, '.gitignore'), 'node_modules/\n.hansolo/temp/');
        await gitOps.add('.');
        await gitOps.commit('Initial commit - han-solo setup');
        initSteps.push({ step: 'initial_commit', success: true });
      }

      // Verify all steps succeeded
      expect(initSteps.every(step => step.success !== false)).toBe(true);

      // Verify ready to use
      const status = await server.handleToolCall('get_sessions_status', {});
      expect(status.ready).toBe(true);
    });
  });
});