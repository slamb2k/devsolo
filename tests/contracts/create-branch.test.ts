import { MCPServer } from '../../src/mcp-server/server';
import { GitOperations } from '../../src/services/git-operations';
import { SessionRepository } from '../../src/services/session-repository';
import { ValidationService } from '../../src/services/validation-service';

describe('create_branch MCP Tool', () => {
  let server: MCPServer;
  let gitOps: GitOperations;
  let sessionRepo: SessionRepository;
  let validationService: ValidationService;

  beforeEach(() => {
    gitOps = new GitOperations();
    sessionRepo = new SessionRepository();
    validationService = new ValidationService(gitOps);
    server = new MCPServer();
  });

  describe('Tool Registration', () => {
    it('should register create_branch tool', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'create_branch');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Create and switch to a new branch');
    });

    it('should define required parameters', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'create_branch');
      expect(tool?.inputSchema.required).toContain('branchName');
      expect(tool?.inputSchema.required).toContain('workflowType');
    });
  });

  describe('Branch Creation', () => {
    it('should create new branch from main', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-test-123',
        workflowType: 'launch',
        baseBranch: 'main'
      });

      expect(result.success).toBe(true);
      expect(result.branch.name).toBe('feature-test-123');
      expect(result.branch.baseBranch).toBe('main');
      expect(result.branch.created).toBe(true);
    });

    it('should enforce branch naming conventions', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'INVALID BRANCH NAME',
        workflowType: 'launch'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid branch name');
    });

    it('should prevent duplicate branch names', async () => {
      await server.handleToolCall('create_branch', {
        branchName: 'feature-duplicate',
        workflowType: 'launch'
      });

      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-duplicate',
        workflowType: 'launch'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Branch already exists');
    });

    it('should update from main before creating branch', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-updated',
        workflowType: 'launch',
        updateFromMain: true
      });

      expect(result.success).toBe(true);
      expect(result.mainUpdated).toBe(true);
      expect(result.branch.upToDate).toBe(true);
    });

    it('should handle hotfix branches differently', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'hotfix-critical',
        workflowType: 'hotfix',
        baseBranch: 'production'
      });

      expect(result.success).toBe(true);
      expect(result.branch.name).toContain('hotfix');
      expect(result.branch.priority).toBe('high');
    });
  });

  describe('Session Integration', () => {
    it('should create session for new branch', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-with-session',
        workflowType: 'launch'
      });

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session.branch).toBe('feature-with-session');
      expect(result.session.workflowType).toBe('launch');
    });

    it('should link branch to workflow session', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-linked',
        workflowType: 'ship',
        sessionId: 'existing-session-id'
      });

      expect(result.success).toBe(true);
      expect(result.session.id).toBe('existing-session-id');
      expect(result.session.branch).toBe('feature-linked');
    });
  });

  describe('Branch Validation', () => {
    it('should validate base branch exists', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-invalid-base',
        workflowType: 'launch',
        baseBranch: 'non-existent-branch'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Base branch does not exist');
    });

    it('should check for uncommitted changes', async () => {
      // Simulate uncommitted changes
      jest.spyOn(gitOps, 'hasUncommittedChanges').mockResolvedValue(true);

      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-uncommitted',
        workflowType: 'launch'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Uncommitted changes detected');
    });

    it('should validate workflow type', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-invalid-workflow',
        workflowType: 'invalid'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid workflow type');
    });
  });

  describe('Branch Prefixes', () => {
    it('should apply correct prefix for launch workflow', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'test-feature',
        workflowType: 'launch',
        applyPrefix: true
      });

      expect(result.branch.name).toMatch(/^feature\//);
    });

    it('should apply correct prefix for hotfix workflow', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'critical-fix',
        workflowType: 'hotfix',
        applyPrefix: true
      });

      expect(result.branch.name).toMatch(/^hotfix\//);
    });

    it('should not double-apply prefixes', async () => {
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature/already-prefixed',
        workflowType: 'launch',
        applyPrefix: true
      });

      expect(result.branch.name).toBe('feature/already-prefixed');
      expect(result.branch.name).not.toContain('feature/feature/');
    });
  });

  describe('Error Recovery', () => {
    it('should rollback on branch creation failure', async () => {
      jest.spyOn(gitOps, 'createBranch').mockRejectedValue(new Error('Git error'));

      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-rollback',
        workflowType: 'launch'
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
    });

    it('should cleanup partial session on failure', async () => {
      jest.spyOn(sessionRepo, 'save').mockRejectedValue(new Error('Session error'));

      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature-cleanup',
        workflowType: 'launch'
      });

      expect(result.success).toBe(false);
      const session = await sessionRepo.findByBranch('feature-cleanup');
      expect(session).toBeNull();
    });
  });
});