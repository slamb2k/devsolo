import { describe, it, expect, jest } from '@jest/globals';
import { AbortWorkflowTool } from '../../src/mcp-server/tools/abort-workflow';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { WorkflowSession } from '../../src/models/workflow-session';

describe.skip('AbortWorkflow Tool Contract', () => {
  let tool: AbortWorkflowTool;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let gitOps: jest.Mocked<GitOperations>;

  beforeEach(() => {
    sessionRepo = {
      getSession: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
    } as any;

    gitOps = {
      getCurrentBranch: jest.fn(),
      checkoutBranch: jest.fn(),
      deleteBranch: jest.fn(),
      hasUncommittedChanges: jest.fn(),
      stashChanges: jest.fn(),
    } as any;

    tool = new AbortWorkflowTool(sessionRepo, gitOps);
  });

  describe('Input Contract', () => {
    it('should require session ID', async () => {
      await expect(tool.execute({})).rejects.toThrow('sessionId is required');
    });

    it('should accept optional force flag', async () => {
      const input = {
        sessionId: 'session-123',
        force: true,
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'PR_CREATED',
        branchName: 'feature/test',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(true);
      gitOps.stashChanges.mockResolvedValue(undefined);
      gitOps.checkoutBranch.mockResolvedValue(undefined);
      gitOps.deleteBranch.mockResolvedValue(undefined);

      const result = await tool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should accept optional reason for abort', async () => {
      const input = {
        sessionId: 'session-123',
        reason: 'Requirements changed',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(false);
      gitOps.checkoutBranch.mockResolvedValue(undefined);

      const result = await tool.execute(input);
      expect(result.data.reason).toBe('Requirements changed');
    });
  });

  describe('Output Contract', () => {
    it('should return abort confirmation', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
        branchName: 'feature/abandoned',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(false);
      gitOps.checkoutBranch.mockResolvedValue(undefined);
      gitOps.deleteBranch.mockResolvedValue(undefined);

      const result = await tool.execute(input);

      expect(result).toMatchObject({
        success: true,
        data: {
          sessionId: 'session-123',
          aborted: true,
          cleanupPerformed: true,
          branchDeleted: true,
        },
      });
    });

    it('should include stash reference if changes were stashed', async () => {
      const input = {
        sessionId: 'session-123',
        force: true,
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
        branchName: 'feature/with-changes',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(true);
      gitOps.stashChanges.mockResolvedValue({ stashRef: 'stash@{0}' });
      gitOps.checkoutBranch.mockResolvedValue(undefined);

      const result = await tool.execute(input);

      expect(result.data.stashRef).toBe('stash@{0}');
      expect(result.data.stashMessage).toContain('Changes stashed');
    });
  });

  describe('Error Handling', () => {
    it('should handle session not found', async () => {
      const input = { sessionId: 'nonexistent' };

      sessionRepo.getSession.mockResolvedValue(null);

      await expect(tool.execute(input)).rejects.toThrow('Session not found');
    });

    it('should prevent abort of non-abortable states without force', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'ship',
        currentState: 'MERGING',
      } as WorkflowSession);

      await expect(tool.execute(input)).rejects.toThrow('Cannot abort during merge');
    });

    it('should handle uncommitted changes without force flag', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(true);

      await expect(tool.execute(input)).rejects.toThrow('Uncommitted changes detected');
    });

    it('should handle branch deletion failure gracefully', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
        branchName: 'feature/test',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(false);
      gitOps.checkoutBranch.mockResolvedValue(undefined);
      gitOps.deleteBranch.mockRejectedValue(new Error('Branch has unmerged changes'));

      const result = await tool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data.branchDeleted).toBe(false);
      expect(result.data.warnings).toContain('Failed to delete branch');
    });
  });

  describe('State Machine Contract', () => {
    it('should mark session as ABORTED', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(false);
      gitOps.checkoutBranch.mockResolvedValue(undefined);

      await tool.execute(input);

      expect(sessionRepo.updateSession).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          currentState: 'ABORTED',
        })
      );
    });

    it('should not abort completed workflows', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'COMPLETE',
      } as WorkflowSession);

      await expect(tool.execute(input)).rejects.toThrow('Workflow already completed');
    });

    it('should handle hotfix workflow abort', async () => {
      const input = { sessionId: 'hotfix-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'hotfix-123',
        workflowType: 'hotfix',
        currentState: 'HOTFIX_READY',
        branchName: 'hotfix/urgent',
      } as WorkflowSession);

      gitOps.hasUncommittedChanges.mockResolvedValue(false);
      gitOps.checkoutBranch.mockResolvedValue(undefined);

      const result = await tool.execute(input);

      expect(result.data.workflowType).toBe('hotfix');
      expect(result.data.aborted).toBe(true);
    });
  });
});