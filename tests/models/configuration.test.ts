import { Configuration } from '../../src/models/configuration';

describe('Configuration Model', () => {
  describe('Configuration Creation', () => {
    it('should create a valid configuration', () => {
      const config = new Configuration({
        projectPath: '/home/user/project',
        defaultBranch: 'main',
        remoteUrl: 'https://github.com/user/repo.git',
        platform: 'github',
        initialized: true,
        settings: {
          autoStash: true,
          verboseOutput: false,
          colorScheme: 'auto'
        }
      });

      expect(config.projectPath).toBe('/home/user/project');
      expect(config.defaultBranch).toBe('main');
      expect(config.platform).toBe('github');
      expect(config.initialized).toBe(true);
    });

    it('should set default values', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      expect(config.defaultBranch).toBe('main');
      expect(config.platform).toBe('github');
      expect(config.initialized).toBe(false);
      expect(config.settings.autoStash).toBe(false);
    });

    it('should validate project path', () => {
      expect(() => new Configuration({
        projectPath: ''
      })).toThrow('Project path is required');
    });
  });

  describe('Platform Detection', () => {
    it('should detect GitHub from remote URL', () => {
      const config = new Configuration({
        projectPath: '/project',
        remoteUrl: 'git@github.com:user/repo.git'
      });

      expect(config.detectPlatform()).toBe('github');
    });

    it('should detect GitLab from remote URL', () => {
      const config = new Configuration({
        projectPath: '/project',
        remoteUrl: 'https://gitlab.com/user/repo.git'
      });

      expect(config.detectPlatform()).toBe('gitlab');
    });

    it('should detect Bitbucket from remote URL', () => {
      const config = new Configuration({
        projectPath: '/project',
        remoteUrl: 'git@bitbucket.org:user/repo.git'
      });

      expect(config.detectPlatform()).toBe('bitbucket');
    });

    it('should return unknown for unrecognized platforms', () => {
      const config = new Configuration({
        projectPath: '/project',
        remoteUrl: 'https://custom-git.com/repo.git'
      });

      expect(config.detectPlatform()).toBe('unknown');
    });
  });

  describe('Settings Management', () => {
    it('should update individual settings', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      config.setSetting('autoStash', true);
      config.setSetting('verboseOutput', true);

      expect(config.settings.autoStash).toBe(true);
      expect(config.settings.verboseOutput).toBe(true);
    });

    it('should merge settings', () => {
      const config = new Configuration({
        projectPath: '/project',
        settings: {
          autoStash: true,
          colorScheme: 'dark'
        }
      });

      config.mergeSettings({
        verboseOutput: true,
        colorScheme: 'light'
      });

      expect(config.settings.autoStash).toBe(true);
      expect(config.settings.verboseOutput).toBe(true);
      expect(config.settings.colorScheme).toBe('light');
    });

    it('should validate setting values', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      expect(() => config.setSetting('colorScheme', 'invalid'))
        .toThrow('Invalid color scheme');

      expect(() => config.setSetting('maxSessions', -1))
        .toThrow('Max sessions must be positive');
    });
  });

  describe('Workflow Configuration', () => {
    it('should configure launch workflow settings', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      config.setWorkflowConfig('launch', {
        branchPrefix: 'feature/',
        requireTests: true,
        autoRebase: true
      });

      const launchConfig = config.getWorkflowConfig('launch');
      expect(launchConfig.branchPrefix).toBe('feature/');
      expect(launchConfig.requireTests).toBe(true);
    });

    it('should configure ship workflow settings', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      config.setWorkflowConfig('ship', {
        squashCommits: true,
        deleteAfterMerge: true,
        requireApproval: true
      });

      const shipConfig = config.getWorkflowConfig('ship');
      expect(shipConfig.squashCommits).toBe(true);
      expect(shipConfig.requireApproval).toBe(true);
    });

    it('should configure hotfix workflow settings', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      config.setWorkflowConfig('hotfix', {
        branchPrefix: 'hotfix/',
        targetBranch: 'production',
        backportToMain: true
      });

      const hotfixConfig = config.getWorkflowConfig('hotfix');
      expect(hotfixConfig.targetBranch).toBe('production');
      expect(hotfixConfig.backportToMain).toBe(true);
    });
  });

  describe('Hooks Configuration', () => {
    it('should configure Git hooks', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      config.setHookConfig({
        preCommit: {
          enabled: true,
          commands: ['npm test', 'npm run lint']
        },
        prePush: {
          enabled: true,
          commands: ['npm run typecheck']
        }
      });

      expect(config.hooks.preCommit.enabled).toBe(true);
      expect(config.hooks.preCommit.commands).toContain('npm test');
      expect(config.hooks.prePush.commands).toContain('npm run typecheck');
    });

    it('should disable specific hooks', () => {
      const config = new Configuration({
        projectPath: '/project',
        hooks: {
          preCommit: { enabled: true, commands: ['test'] }
        }
      });

      config.disableHook('preCommit');
      expect(config.hooks.preCommit.enabled).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate configuration completeness', () => {
      const incompleteConfig = new Configuration({
        projectPath: '/project'
      });

      const completeConfig = new Configuration({
        projectPath: '/project',
        defaultBranch: 'main',
        remoteUrl: 'https://github.com/user/repo.git',
        platform: 'github',
        initialized: true
      });

      expect(incompleteConfig.isComplete()).toBe(false);
      expect(completeConfig.isComplete()).toBe(true);
    });

    it('should validate remote URL format', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      expect(config.isValidRemoteUrl('https://github.com/user/repo.git')).toBe(true);
      expect(config.isValidRemoteUrl('git@github.com:user/repo.git')).toBe(true);
      expect(config.isValidRemoteUrl('not-a-url')).toBe(false);
    });

    it('should validate branch name format', () => {
      const config = new Configuration({
        projectPath: '/project'
      });

      expect(config.isValidBranchName('feature/new-feature')).toBe(true);
      expect(config.isValidBranchName('hotfix-123')).toBe(true);
      expect(config.isValidBranchName('invalid branch')).toBe(false);
      expect(config.isValidBranchName('feature/')).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should serialize to YAML', () => {
      const config = new Configuration({
        projectPath: '/project',
        defaultBranch: 'main',
        remoteUrl: 'https://github.com/user/repo.git',
        platform: 'github',
        initialized: true,
        settings: {
          autoStash: true
        }
      });

      const yaml = config.toYAML();
      expect(yaml).toContain('projectPath: /project');
      expect(yaml).toContain('defaultBranch: main');
      expect(yaml).toContain('autoStash: true');
    });

    it('should deserialize from YAML', () => {
      const yaml = `
        projectPath: /home/user/project
        defaultBranch: develop
        remoteUrl: git@gitlab.com:user/repo.git
        platform: gitlab
        initialized: true
        settings:
          autoStash: true
          verboseOutput: true
      `;

      const config = Configuration.fromYAML(yaml);
      expect(config.projectPath).toBe('/home/user/project');
      expect(config.defaultBranch).toBe('develop');
      expect(config.platform).toBe('gitlab');
      expect(config.settings.autoStash).toBe(true);
    });

    it('should serialize to JSON', () => {
      const config = new Configuration({
        projectPath: '/project',
        defaultBranch: 'main'
      });

      const json = config.toJSON();
      expect(json.projectPath).toBe('/project');
      expect(json.defaultBranch).toBe('main');
    });
  });

  describe('Environment Variables', () => {
    it('should load from environment variables', () => {
      process.env.HANSOLO_DEFAULT_BRANCH = 'develop';
      process.env.HANSOLO_AUTO_STASH = 'true';
      process.env.HANSOLO_COLOR_SCHEME = 'dark';

      const config = Configuration.fromEnvironment('/project');
      expect(config.defaultBranch).toBe('develop');
      expect(config.settings.autoStash).toBe(true);
      expect(config.settings.colorScheme).toBe('dark');

      // Cleanup
      delete process.env.HANSOLO_DEFAULT_BRANCH;
      delete process.env.HANSOLO_AUTO_STASH;
      delete process.env.HANSOLO_COLOR_SCHEME;
    });
  });

  describe('Migration', () => {
    it('should migrate old config format', () => {
      const oldConfig = {
        project_path: '/project',
        default_branch: 'master',
        auto_stash: true
      };

      const config = Configuration.migrateFromOld(oldConfig);
      expect(config.projectPath).toBe('/project');
      expect(config.defaultBranch).toBe('main'); // master -> main
      expect(config.settings.autoStash).toBe(true);
    });
  });
});