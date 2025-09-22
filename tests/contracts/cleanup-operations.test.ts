import { MCPServer } from '../../src/mcp-server/server';
import { GitOperations } from '../../src/services/git-operations';
import { SessionRepository } from '../../src/services/session-repository';
import { AuditLogger } from '../../src/services/audit-logger';

describe('cleanup_operations MCP Tool', () => {
  let server: MCPServer;
  let gitOps: GitOperations;
  let sessionRepo: SessionRepository;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    gitOps = new GitOperations();
    sessionRepo = new SessionRepository();
    auditLogger = new AuditLogger();
    server = new MCPServer();
  });

  describe('Tool Registration', () => {
    it('should register cleanup_operations tool', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'cleanup_operations');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Cleanup completed workflow');
    });

    it('should define required parameters', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'cleanup_operations');
      expect(tool?.inputSchema.required).toContain('sessionId');
    });
  });

  describe('Branch Cleanup', () => {
    it('should delete local branch after merge', async () => {
      const session = {
        id: 'cleanup-session',
        workflowType: 'ship',
        branch: 'feature-completed',
        status: 'completed',
        currentState: 'MERGED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { prMerged: true }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'cleanup-session',
        deleteBranch: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.branchDeleted).toBe(true);
      expect(result.cleanup.branch).toBe('feature-completed');
    });

    it('should delete remote branch when specified', async () => {
      const session = {
        id: 'remote-cleanup',
        workflowType: 'ship',
        branch: 'feature-remote',
        status: 'completed',
        currentState: 'MERGED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'remote-cleanup',
        deleteBranch: true,
        deleteRemote: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.remoteBranchDeleted).toBe(true);
    });

    it('should switch to main after branch deletion', async () => {
      const session = {
        id: 'switch-session',
        workflowType: 'launch',
        branch: 'feature-switch',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'switch-session',
        deleteBranch: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.currentBranch).toBe('main');
    });

    it('should not delete branch with uncommitted changes', async () => {
      jest.spyOn(gitOps, 'hasUncommittedChanges').mockResolvedValue(true);

      const session = {
        id: 'uncommitted-session',
        workflowType: 'launch',
        branch: 'feature-uncommitted',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'uncommitted-session',
        deleteBranch: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Uncommitted changes');
    });
  });

  describe('Session Cleanup', () => {
    it('should archive completed session', async () => {
      const session = {
        id: 'archive-session',
        workflowType: 'ship',
        branch: 'feature-archive',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'archive-session',
        archiveSession: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.sessionArchived).toBe(true);
      const archived = await sessionRepo.findById('archive-session');
      expect(archived?.status).toBe('archived');
    });

    it('should clean up temporary files', async () => {
      const session = {
        id: 'temp-cleanup',
        workflowType: 'launch',
        branch: 'feature-temp',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          tempFiles: ['/tmp/hansolo-123.tmp', '/tmp/hansolo-456.tmp']
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'temp-cleanup',
        cleanTempFiles: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.tempFilesCleaned).toBe(2);
    });

    it('should remove session hooks', async () => {
      const session = {
        id: 'hooks-cleanup',
        workflowType: 'ship',
        branch: 'feature-hooks',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          hooks: ['pre-commit', 'pre-push']
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'hooks-cleanup',
        removeHooks: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.hooksRemoved).toEqual(['pre-commit', 'pre-push']);
    });
  });

  describe('Stash Management', () => {
    it('should pop stashed changes after cleanup', async () => {
      const session = {
        id: 'stash-session',
        workflowType: 'launch',
        branch: 'feature-stash',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          stashRef: 'stash@{0}'
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'stash-session',
        popStash: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.stashPopped).toBe(true);
    });

    it('should handle missing stash gracefully', async () => {
      const session = {
        id: 'no-stash',
        workflowType: 'launch',
        branch: 'feature-no-stash',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'no-stash',
        popStash: true
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.stashPopped).toBe(false);
      expect(result.message).toContain('No stash to pop');
    });
  });

  describe('Validation', () => {
    it('should prevent cleanup of active session', async () => {
      const session = {
        id: 'active-session',
        workflowType: 'launch',
        branch: 'feature-active',
        status: 'active',
        currentState: 'BRANCH_READY',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'active-session'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot cleanup active session');
    });

    it('should validate session exists', async () => {
      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'non-existent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should require explicit confirmation for destructive operations', async () => {
      const session = {
        id: 'confirm-session',
        workflowType: 'ship',
        branch: 'feature-confirm',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'confirm-session',
        deleteBranch: true,
        force: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('confirmation required');
    });
  });

  describe('Audit Trail', () => {
    it('should log all cleanup operations', async () => {
      const session = {
        id: 'audit-session',
        workflowType: 'ship',
        branch: 'feature-audit',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'audit-session',
        deleteBranch: true,
        archiveSession: true
      });

      expect(result.success).toBe(true);
      const auditEntries = await auditLogger.getEntriesForSession('audit-session');
      expect(auditEntries).toContainEqual(
        expect.objectContaining({
          action: 'CLEANUP',
          details: expect.objectContaining({
            branchDeleted: true,
            sessionArchived: true
          })
        })
      );
    });
  });

  describe('Selective Cleanup', () => {
    it('should perform only requested cleanup operations', async () => {
      const session = {
        id: 'selective-session',
        workflowType: 'launch',
        branch: 'feature-selective',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          tempFiles: ['/tmp/test.tmp'],
          hooks: ['pre-commit']
        }
      };

      await sessionRepo.save(session);

      const result = await server.handleToolCall('cleanup_operations', {
        sessionId: 'selective-session',
        cleanTempFiles: true,
        removeHooks: false,
        deleteBranch: false
      });

      expect(result.success).toBe(true);
      expect(result.cleanup.tempFilesCleaned).toBe(1);
      expect(result.cleanup.hooksRemoved).toBeUndefined();
      expect(result.cleanup.branchDeleted).toBe(false);
    });
  });
});