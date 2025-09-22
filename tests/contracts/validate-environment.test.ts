import { MCPServer } from '../../src/mcp-server/server';
import { ValidationService } from '../../src/services/validation-service';
import { GitOperations } from '../../src/services/git-operations';
import { ConfigurationManager } from '../../src/services/configuration-manager';

describe('validate_environment MCP Tool', () => {
  let server: MCPServer;
  let validationService: ValidationService;
  let gitOps: GitOperations;
  let configManager: ConfigurationManager;

  beforeEach(() => {
    gitOps = new GitOperations();
    configManager = new ConfigurationManager();
    validationService = new ValidationService(gitOps, configManager);
    server = new MCPServer();
  });

  describe('Tool Registration', () => {
    it('should register validate_environment tool', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'validate_environment');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Validate environment setup');
    });

    it('should define optional parameters', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'validate_environment');
      expect(tool?.inputSchema.properties).toHaveProperty('checks');
      expect(tool?.inputSchema.required).toEqual([]);
    });
  });

  describe('Environment Validation', () => {
    it('should validate Git installation', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['git']
      });

      expect(result.success).toBe(true);
      expect(result.checks.git).toBeDefined();
      expect(result.checks.git.installed).toBe(true);
      expect(result.checks.git.version).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should validate Node.js version', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['node']
      });

      expect(result.success).toBe(true);
      expect(result.checks.node).toBeDefined();
      expect(result.checks.node.installed).toBe(true);
      expect(result.checks.node.version).toMatch(/\d+\.\d+\.\d+/);
      expect(result.checks.node.meetsMinimum).toBe(true);
    });

    it('should validate Git repository', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['repository']
      });

      expect(result.checks.repository).toBeDefined();
      expect(result.checks.repository.isGitRepo).toBeDefined();
      if (result.checks.repository.isGitRepo) {
        expect(result.checks.repository.remote).toBeDefined();
        expect(result.checks.repository.branch).toBeDefined();
      }
    });

    it('should validate configuration', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['config']
      });

      expect(result.checks.config).toBeDefined();
      expect(result.checks.config.hansoloYaml).toBeDefined();
      expect(result.checks.config.initialized).toBeDefined();
    });

    it('should validate GitHub CLI when requested', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['github']
      });

      expect(result.checks.github).toBeDefined();
      expect(result.checks.github.cliInstalled).toBeDefined();
      if (result.checks.github.cliInstalled) {
        expect(result.checks.github.authenticated).toBeDefined();
      }
    });

    it('should run all checks by default', async () => {
      const result = await server.handleToolCall('validate_environment', {});

      expect(result.success).toBe(true);
      expect(result.checks).toHaveProperty('git');
      expect(result.checks).toHaveProperty('node');
      expect(result.checks).toHaveProperty('repository');
      expect(result.checks).toHaveProperty('config');
      expect(result.checks).toHaveProperty('permissions');
    });

    it('should check write permissions', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['permissions']
      });

      expect(result.checks.permissions).toBeDefined();
      expect(result.checks.permissions.canWrite).toBeDefined();
      expect(result.checks.permissions.hansoloDir).toBeDefined();
    });

    it('should provide recommendations for failed checks', async () => {
      const result = await server.handleToolCall('validate_environment', {});

      if (!result.allChecksPassed) {
        expect(result.recommendations).toBeDefined();
        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Platform-specific Checks', () => {
    it('should detect platform', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['platform']
      });

      expect(result.platform).toBeDefined();
      expect(['darwin', 'linux', 'win32']).toContain(result.platform);
    });

    it('should validate platform-specific requirements', async () => {
      const result = await server.handleToolCall('validate_environment', {});

      expect(result.platformSpecific).toBeDefined();
      if (result.platform === 'win32') {
        expect(result.platformSpecific.gitBash).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid check types gracefully', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['invalid-check']
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Unknown check type: invalid-check');
    });

    it('should continue with other checks if one fails', async () => {
      const result = await server.handleToolCall('validate_environment', {
        checks: ['git', 'node', 'config']
      });

      expect(result.success).toBe(true);
      expect(result.checks.git).toBeDefined();
      expect(result.checks.node).toBeDefined();
      expect(result.checks.config).toBeDefined();
    });
  });
});