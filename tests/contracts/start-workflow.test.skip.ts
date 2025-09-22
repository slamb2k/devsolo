import { describe, it, expect, jest } from '@jest/globals';
import { StartWorkflowTool } from '../../src/mcp-server/tools/start-workflow';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { WorkflowSession } from '../../src/models/workflow-session';

describe.skip('StartWorkflow Tool Contract', () => {
  let tool: StartWorkflowTool;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let gitOps: jest.Mocked<GitOperations>;

  beforeEach(() => {
    sessionRepo = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
      listSessions: jest.fn(),
    } as any;

    gitOps = {
      createBranch: jest.fn(),
      checkoutBranch: jest.fn(),
      getCurrentBranch: jest.fn(),
      getBranchStatus: jest.fn(),
      isClean: jest.fn(),
    } as any;

    tool = new StartWorkflowTool(sessionRepo, gitOps);
  });

  describe('Input Contract', () => {
    it('should require session ID', async () => {
      const input = {};

      await expect(tool.execute(input)).rejects.toThrow('sessionId is required');
    });

    it('should accept valid session ID', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'INIT',
        branchName: 'feature/test',
      } as WorkflowSession);

      gitOps.isClean.mockResolvedValue(true);
      gitOps.createBranch.mockResolvedValue(undefined);

      const result = await tool.execute(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Output Contract', () => {
    it('should return workflow start confirmation', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'INIT',
        branchName: 'feature/new-feature',
      } as WorkflowSession);

      gitOps.isClean.mockResolvedValue(true);
      gitOps.createBranch.mockResolvedValue(undefined);

      sessionRepo.updateSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
        branchName: 'feature/new-feature',
      } as WorkflowSession);

      const result = await tool.execute(input);

      expect(result).toMatchObject({
        success: true,
        data: {
          sessionId: 'session-123',
          branchName: 'feature/new-feature',
          currentState: 'BRANCH_READY',
          started: true,
        },
      });
    });

    it('should include Git operations performed', async () => {
      const input = { sessionId: 'session-456' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-456',
        workflowType: 'launch',
        currentState: 'INIT',
        branchName: 'feature/test-branch',
      } as WorkflowSession);

      gitOps.isClean.mockResolvedValue(true);
      gitOps.createBranch.mockResolvedValue(undefined);
      gitOps.checkoutBranch.mockResolvedValue(undefined);

      sessionRepo.updateSession.mockResolvedValue({
        id: 'session-456',
        currentState: 'BRANCH_READY',
      } as WorkflowSession);

      const result = await tool.execute(input);

      expect(result.data.gitOperations).toContain('branch_created');
      expect(result.data.gitOperations).toContain('branch_checked_out');
    });
  });

  describe('Error Handling', () => {
    it('should handle session not found', async () => {
      const input = { sessionId: 'nonexistent' };

      sessionRepo.getSession.mockResolvedValue(null);

      await expect(tool.execute(input)).rejects.toThrow('Session not found');
    });

    it('should handle dirty working directory', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'INIT',
      } as WorkflowSession);

      gitOps.isClean.mockResolvedValue(false);

      await expect(tool.execute(input)).rejects.toThrow('Working directory has uncommitted changes');
    });

    it('should handle branch creation failure', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'INIT',
        branchName: 'feature/test',
      } as WorkflowSession);

      gitOps.isClean.mockResolvedValue(true);
      gitOps.createBranch.mockRejectedValue(new Error('Branch already exists'));

      await expect(tool.execute(input)).rejects.toThrow('Branch already exists');
    });
  });

  describe('State Machine Contract', () => {
    it('should transition from INIT to BRANCH_READY for launch', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'INIT',
        branchName: 'feature/test',
      } as WorkflowSession);

      gitOps.isClean.mockResolvedValue(true);
      gitOps.createBranch.mockResolvedValue(undefined);

      sessionRepo.updateSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'BRANCH_READY',
      } as WorkflowSession);

      const result = await tool.execute(input);
      expect(result.data.currentState).toBe('BRANCH_READY');
    });

    it('should not start already started workflow', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
      } as WorkflowSession);

      await expect(tool.execute(input)).rejects.toThrow('Workflow already started');
    });

    it('should transition from HOTFIX_INIT to HOTFIX_READY for hotfix', async () => {
      const input = { sessionId: 'hotfix-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'hotfix-123',
        workflowType: 'hotfix',
        currentState: 'HOTFIX_INIT',
        branchName: 'hotfix/urgent-fix',
      } as WorkflowSession);

      gitOps.isClean.mockResolvedValue(true);
      gitOps.createBranch.mockResolvedValue(undefined);

      sessionRepo.updateSession.mockResolvedValue({
        id: 'hotfix-123',
        currentState: 'HOTFIX_READY',
      } as WorkflowSession);

      const result = await tool.execute(input);
      expect(result.data.currentState).toBe('HOTFIX_READY');
    });
  });
});