import { describe, it, expect, jest } from '@jest/globals';
import { ConfigureWorkflowTool } from '../../src/mcp-server/tools/configure-workflow';
import { SessionRepository } from '../../src/services/session-repository';
import { ConfigurationManager } from '../../src/services/configuration-manager';

describe('ConfigureWorkflow Tool Contract', () => {
  let tool: ConfigureWorkflowTool;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let configManager: jest.Mocked<ConfigurationManager>;

  beforeEach(() => {
    sessionRepo = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
      listSessions: jest.fn(),
    } as any;

    configManager = {
      load: jest.fn(),
      save: jest.fn(),
      validate: jest.fn(),
      getInstallPath: jest.fn(),
    } as any;

    tool = new ConfigureWorkflowTool(sessionRepo, configManager);
  });

  describe('Input Contract', () => {
    it('should require workflow type', async () => {
      const input = {};

      await expect(tool.execute(input)).rejects.toThrow('workflowType is required');
    });

    it('should accept valid workflow types', async () => {
      const validTypes = ['launch', 'ship', 'hotfix'];

      for (const type of validTypes) {
        const input = { workflowType: type };

        configManager.validate.mockResolvedValue(true);
        sessionRepo.createSession.mockResolvedValue({
          id: 'test-id',
          workflowType: type,
          currentState: 'INIT',
        });

        const result = await tool.execute(input);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid workflow types', async () => {
      const input = { workflowType: 'invalid' };

      await expect(tool.execute(input)).rejects.toThrow('Invalid workflow type');
    });

    it('should accept optional branch name', async () => {
      const input = {
        workflowType: 'launch',
        branchName: 'feature/test-branch',
      };

      configManager.validate.mockResolvedValue(true);
      sessionRepo.createSession.mockResolvedValue({
        id: 'test-id',
        branchName: 'feature/test-branch',
        workflowType: 'launch',
        currentState: 'INIT',
      });

      const result = await tool.execute(input);
      expect(result.data.branchName).toBe('feature/test-branch');
    });
  });

  describe('Output Contract', () => {
    it('should return session configuration', async () => {
      const input = { workflowType: 'launch' };

      configManager.validate.mockResolvedValue(true);
      sessionRepo.createSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'INIT',
        branchName: 'feature/auto-generated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await tool.execute(input);

      expect(result).toMatchObject({
        success: true,
        data: {
          sessionId: 'session-123',
          workflowType: 'launch',
          currentState: 'INIT',
          branchName: 'feature/auto-generated',
        },
      });
    });

    it('should include configuration validation result', async () => {
      const input = { workflowType: 'ship' };

      configManager.validate.mockResolvedValue(true);
      sessionRepo.createSession.mockResolvedValue({
        id: 'session-456',
        workflowType: 'ship',
        currentState: 'BRANCH_READY',
      });

      const result = await tool.execute(input);

      expect(result.data.configurationValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration not initialized', async () => {
      const input = { workflowType: 'launch' };

      configManager.validate.mockRejectedValue(new Error('hansolo.yaml not found'));

      await expect(tool.execute(input)).rejects.toThrow('hansolo.yaml not found');
    });

    it('should handle session creation failure', async () => {
      const input = { workflowType: 'launch' };

      configManager.validate.mockResolvedValue(true);
      sessionRepo.createSession.mockRejectedValue(new Error('Failed to create session'));

      await expect(tool.execute(input)).rejects.toThrow('Failed to create session');
    });
  });

  describe('State Machine Contract', () => {
    it('should initialize launch workflow in INIT state', async () => {
      const input = { workflowType: 'launch' };

      configManager.validate.mockResolvedValue(true);
      sessionRepo.createSession.mockResolvedValue({
        id: 'test-id',
        workflowType: 'launch',
        currentState: 'INIT',
      });

      const result = await tool.execute(input);
      expect(result.data.currentState).toBe('INIT');
    });

    it('should initialize ship workflow in BRANCH_READY state', async () => {
      const input = { workflowType: 'ship' };

      configManager.validate.mockResolvedValue(true);
      sessionRepo.createSession.mockResolvedValue({
        id: 'test-id',
        workflowType: 'ship',
        currentState: 'BRANCH_READY',
      });

      const result = await tool.execute(input);
      expect(result.data.currentState).toBe('BRANCH_READY');
    });

    it('should initialize hotfix workflow in HOTFIX_INIT state', async () => {
      const input = { workflowType: 'hotfix' };

      configManager.validate.mockResolvedValue(true);
      sessionRepo.createSession.mockResolvedValue({
        id: 'test-id',
        workflowType: 'hotfix',
        currentState: 'HOTFIX_INIT',
      });

      const result = await tool.execute(input);
      expect(result.data.currentState).toBe('HOTFIX_INIT');
    });
  });
});