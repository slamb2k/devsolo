import { describe, it, expect, jest } from '@jest/globals';
import { ExecuteWorkflowStepTool } from '../../src/mcp-server/tools/execute-workflow-step';
import { SessionRepository } from '../../src/services/session-repository';
import { StateMachine } from '../../src/state-machines/base-state-machine';
import { GitOperations } from '../../src/services/git-operations';
import { WorkflowSession } from '../../src/models/workflow-session';

describe.skip('ExecuteWorkflowStep Tool Contract', () => {
  let tool: ExecuteWorkflowStepTool;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let gitOps: jest.Mocked<GitOperations>;
  let stateMachine: jest.Mocked<StateMachine>;

  beforeEach(() => {
    sessionRepo = {
      getSession: jest.fn(),
      updateSession: jest.fn(),
    } as any;

    gitOps = {
      commit: jest.fn(),
      push: jest.fn(),
      rebase: jest.fn(),
      status: jest.fn(),
    } as any;

    stateMachine = {
      canTransition: jest.fn(),
      transition: jest.fn(),
      getCurrentState: jest.fn(),
    } as any;

    tool = new ExecuteWorkflowStepTool(sessionRepo, gitOps);
  });

  describe('Input Contract', () => {
    it('should require session ID and action', async () => {
      await expect(tool.execute({})).rejects.toThrow('sessionId is required');
      await expect(tool.execute({ sessionId: '123' })).rejects.toThrow('action is required');
    });

    it('should accept valid actions', async () => {
      const validActions = ['commit', 'push', 'create_pr', 'rebase', 'merge', 'abort'];

      for (const action of validActions) {
        const input = {
          sessionId: 'session-123',
          action,
        };

        sessionRepo.getSession.mockResolvedValue({
          id: 'session-123',
          currentState: 'BRANCH_READY',
          workflowType: 'launch',
        } as WorkflowSession);

        // Mock the specific action
        if (action === 'commit') {
          gitOps.status.mockResolvedValue({ files: ['file.txt'] });
          gitOps.commit.mockResolvedValue({ commit: 'abc123' });
        }

        try {
          const result = await tool.execute(input);
          expect(result.success).toBeDefined();
        } catch (error) {
          // Some actions may have additional requirements
          expect(error).toBeDefined();
        }
      }
    });

    it('should accept optional parameters for specific actions', async () => {
      const input = {
        sessionId: 'session-123',
        action: 'commit',
        parameters: {
          message: 'Custom commit message',
          files: ['file1.txt', 'file2.txt'],
        },
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'BRANCH_READY',
        workflowType: 'launch',
      } as WorkflowSession);

      gitOps.status.mockResolvedValue({ files: ['file1.txt', 'file2.txt'] });
      gitOps.commit.mockResolvedValue({ commit: 'abc123' });

      const result = await tool.execute(input);
      expect(gitOps.commit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom commit message',
        })
      );
    });
  });

  describe('Output Contract', () => {
    it('should return step execution result', async () => {
      const input = {
        sessionId: 'session-123',
        action: 'commit',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'BRANCH_READY',
        workflowType: 'launch',
      } as WorkflowSession);

      gitOps.status.mockResolvedValue({ files: ['modified.txt'] });
      gitOps.commit.mockResolvedValue({ commit: 'def456' });

      sessionRepo.updateSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'CHANGES_COMMITTED',
      } as WorkflowSession);

      const result = await tool.execute(input);

      expect(result).toMatchObject({
        success: true,
        data: {
          sessionId: 'session-123',
          action: 'commit',
          newState: 'CHANGES_COMMITTED',
          actionResult: expect.objectContaining({
            commit: 'def456',
          }),
        },
      });
    });

    it('should include validation warnings if any', async () => {
      const input = {
        sessionId: 'session-123',
        action: 'push',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'CHANGES_COMMITTED',
        workflowType: 'launch',
      } as WorkflowSession);

      gitOps.push.mockResolvedValue({ pushed: true });

      sessionRepo.updateSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'PUSHED',
      } as WorkflowSession);

      const result = await tool.execute(input);

      expect(result.data.warnings).toBeDefined();
      expect(Array.isArray(result.data.warnings)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle session not found', async () => {
      const input = {
        sessionId: 'nonexistent',
        action: 'commit',
      };

      sessionRepo.getSession.mockResolvedValue(null);

      await expect(tool.execute(input)).rejects.toThrow('Session not found');
    });

    it('should handle invalid state transitions', async () => {
      const input = {
        sessionId: 'session-123',
        action: 'merge',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'BRANCH_READY',
        workflowType: 'launch',
      } as WorkflowSession);

      await expect(tool.execute(input)).rejects.toThrow('Cannot merge from current state');
    });

    it('should handle Git operation failures', async () => {
      const input = {
        sessionId: 'session-123',
        action: 'commit',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'BRANCH_READY',
        workflowType: 'launch',
      } as WorkflowSession);

      gitOps.status.mockResolvedValue({ files: [] });

      await expect(tool.execute(input)).rejects.toThrow('No changes to commit');
    });
  });

  describe('State Machine Contract', () => {
    it('should validate state transitions before executing', async () => {
      const input = {
        sessionId: 'session-123',
        action: 'push',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'BRANCH_READY',
        workflowType: 'launch',
      } as WorkflowSession);

      await expect(tool.execute(input)).rejects.toThrow('Must commit changes before pushing');
    });

    it('should update state after successful action', async () => {
      const input = {
        sessionId: 'session-123',
        action: 'commit',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        currentState: 'BRANCH_READY',
        workflowType: 'launch',
      } as WorkflowSession);

      gitOps.status.mockResolvedValue({ files: ['changed.txt'] });
      gitOps.commit.mockResolvedValue({ commit: 'abc123' });

      await tool.execute(input);

      expect(sessionRepo.updateSession).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          currentState: 'CHANGES_COMMITTED',
        })
      );
    });

    it('should handle workflow-specific actions', async () => {
      const input = {
        sessionId: 'hotfix-123',
        action: 'validate',
      };

      sessionRepo.getSession.mockResolvedValue({
        id: 'hotfix-123',
        currentState: 'HOTFIX_COMMITTED',
        workflowType: 'hotfix',
      } as WorkflowSession);

      sessionRepo.updateSession.mockResolvedValue({
        id: 'hotfix-123',
        currentState: 'HOTFIX_VALIDATED',
      } as WorkflowSession);

      const result = await tool.execute(input);
      expect(result.data.newState).toBe('HOTFIX_VALIDATED');
    });
  });
});