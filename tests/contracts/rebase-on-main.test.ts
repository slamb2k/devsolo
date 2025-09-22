import { MCPServer } from '../../src/mcp-server/server';
import { GitOperations } from '../../src/services/git-operations';
import { SessionRepository } from '../../src/services/session-repository';
import { ValidationService } from '../../src/services/validation-service';

describe('rebase_on_main MCP Tool', () => {
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
    it('should register rebase_on_main tool', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'rebase_on_main');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Rebase current branch on main');
    });

    it('should define optional parameters', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'rebase_on_main');
      expect(tool?.inputSchema.properties).toHaveProperty('sessionId');
      expect(tool?.inputSchema.properties).toHaveProperty('strategy');
    });
  });

  describe('Rebase Operations', () => {
    it('should rebase current branch on main', async () => {
      const session = {
        id: 'rebase-session',
        workflowType: 'launch',
        branch: 'feature-rebase',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);
      await sessionRepo.setCurrentSession('rebase-session');

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'rebase-session'
      });

      expect(result.success).toBe(true);
      expect(result.rebase.branch).toBe('feature-rebase');
      expect(result.rebase.baseBranch).toBe('main');
      expect(result.rebase.completed).toBe(true);
    });

    it('should update main before rebasing', async () => {
      const session = {
        id: 'update-session',
        workflowType: 'launch',
        branch: 'feature-update',
        status: 'active',
        currentState: 'PUSHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'update-session',
        updateMain: true
      });

      expect(result.success).toBe(true);
      expect(result.rebase.mainUpdated).toBe(true);
      expect(result.rebase.upToDate).toBe(true);
    });

    it('should handle merge conflicts', async () => {
      jest.spyOn(gitOps, 'rebase').mockRejectedValue(new Error('CONFLICT'));

      const session = {
        id: 'conflict-session',
        workflowType: 'launch',
        branch: 'feature-conflict',
        status: 'active',
        currentState: 'PUSHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'conflict-session'
      });

      expect(result.success).toBe(false);
      expect(result.rebase.hasConflicts).toBe(true);
      expect(result.conflictFiles).toBeDefined();
      expect(result.instructions).toContain('resolve conflicts');
    });

    it('should support interactive rebase', async () => {
      const session = {
        id: 'interactive-session',
        workflowType: 'launch',
        branch: 'feature-interactive',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'interactive-session',
        strategy: 'interactive',
        squashCommits: true
      });

      expect(result.success).toBe(true);
      expect(result.rebase.strategy).toBe('interactive');
      expect(result.rebase.squashed).toBe(true);
    });

    it('should preserve commit history by default', async () => {
      const session = {
        id: 'preserve-session',
        workflowType: 'launch',
        branch: 'feature-preserve',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          commits: ['abc123', 'def456', 'ghi789']
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'preserve-session',
        preserveHistory: true
      });

      expect(result.success).toBe(true);
      expect(result.rebase.commitsPreserved).toBe(3);
    });
  });

  describe('State Validation', () => {
    it('should prevent rebase with uncommitted changes', async () => {
      jest.spyOn(gitOps, 'hasUncommittedChanges').mockResolvedValue(true);

      const session = {
        id: 'uncommitted-session',
        workflowType: 'launch',
        branch: 'feature-uncommitted',
        status: 'active',
        currentState: 'BRANCH_READY',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'uncommitted-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Uncommitted changes');
      expect(result.suggestion).toContain('commit or stash');
    });

    it('should validate branch is not main', async () => {
      const session = {
        id: 'main-session',
        workflowType: 'ship',
        branch: 'main',
        status: 'active',
        currentState: 'INIT',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'main-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot rebase main on itself');
    });

    it('should check for ongoing rebase', async () => {
      jest.spyOn(gitOps, 'isRebasing').mockResolvedValue(true);

      const result = await server.handleToolCall('rebase_on_main', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rebase already in progress');
      expect(result.suggestion).toContain('--continue or --abort');
    });
  });

  describe('Rebase Strategies', () => {
    it('should support standard rebase', async () => {
      const session = {
        id: 'standard-session',
        workflowType: 'launch',
        branch: 'feature-standard',
        status: 'active',
        currentState: 'PUSHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'standard-session',
        strategy: 'standard'
      });

      expect(result.success).toBe(true);
      expect(result.rebase.strategy).toBe('standard');
    });

    it('should support autosquash for fixup commits', async () => {
      const session = {
        id: 'autosquash-session',
        workflowType: 'launch',
        branch: 'feature-autosquash',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          hasFixupCommits: true
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'autosquash-session',
        strategy: 'autosquash'
      });

      expect(result.success).toBe(true);
      expect(result.rebase.strategy).toBe('autosquash');
      expect(result.rebase.fixupsApplied).toBe(true);
    });

    it('should support onto rebase for different base', async () => {
      const session = {
        id: 'onto-session',
        workflowType: 'hotfix',
        branch: 'hotfix-critical',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'onto-session',
        strategy: 'onto',
        targetBranch: 'production'
      });

      expect(result.success).toBe(true);
      expect(result.rebase.strategy).toBe('onto');
      expect(result.rebase.targetBranch).toBe('production');
    });
  });

  describe('Force Push Handling', () => {
    it('should detect need for force push after rebase', async () => {
      const session = {
        id: 'force-session',
        workflowType: 'launch',
        branch: 'feature-force',
        status: 'active',
        currentState: 'PUSHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          hasRemote: true
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'force-session'
      });

      expect(result.success).toBe(true);
      expect(result.rebase.requiresForcePush).toBe(true);
      expect(result.warning).toContain('force push required');
    });

    it('should handle force push with lease', async () => {
      const session = {
        id: 'lease-session',
        workflowType: 'launch',
        branch: 'feature-lease',
        status: 'active',
        currentState: 'PUSHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          hasRemote: true
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'lease-session',
        forcePush: true,
        useLease: true
      });

      expect(result.success).toBe(true);
      expect(result.rebase.forcePushed).toBe(true);
      expect(result.rebase.usedLease).toBe(true);
    });
  });

  describe('Rollback and Recovery', () => {
    it('should create backup before rebase', async () => {
      const session = {
        id: 'backup-session',
        workflowType: 'launch',
        branch: 'feature-backup',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'backup-session',
        createBackup: true
      });

      expect(result.success).toBe(true);
      expect(result.rebase.backupRef).toBeDefined();
      expect(result.rebase.backupRef).toContain('backup/feature-backup');
    });

    it('should abort rebase on failure', async () => {
      jest.spyOn(gitOps, 'rebase')
        .mockRejectedValueOnce(new Error('Rebase failed'))
        .mockResolvedValueOnce({ aborted: true });

      const session = {
        id: 'abort-session',
        workflowType: 'launch',
        branch: 'feature-abort',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'abort-session'
      });

      expect(result.success).toBe(false);
      expect(result.rebase.aborted).toBe(true);
      expect(result.message).toContain('Rebase aborted');
    });
  });

  describe('Session State Updates', () => {
    it('should update session state after successful rebase', async () => {
      const session = {
        id: 'state-session',
        workflowType: 'launch',
        branch: 'feature-state',
        status: 'active',
        currentState: 'PUSHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('rebase_on_main', {
        sessionId: 'state-session'
      });

      expect(result.success).toBe(true);
      const updated = await sessionRepo.findById('state-session');
      expect(updated?.currentState).toBe('REBASING');
      expect(updated?.metadata.lastRebase).toBeDefined();
    });
  });
});