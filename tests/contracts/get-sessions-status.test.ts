import { describe, it, expect, jest } from '@jest/globals';
import { GetSessionsStatusTool } from '../../src/mcp-server/tools/get-sessions-status';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { WorkflowSession } from '../../src/models/workflow-session';

describe('GetSessionsStatus Tool Contract', () => {
  let tool: GetSessionsStatusTool;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let gitOps: jest.Mocked<GitOperations>;

  beforeEach(() => {
    sessionRepo = {
      listSessions: jest.fn(),
      getSession: jest.fn(),
    } as any;

    gitOps = {
      getBranchStatus: jest.fn(),
      getCurrentBranch: jest.fn(),
    } as any;

    tool = new GetSessionsStatusTool(sessionRepo, gitOps);
  });

  describe('Input Contract', () => {
    it('should accept empty input for all sessions', async () => {
      sessionRepo.listSessions.mockResolvedValue([]);

      const result = await tool.execute({});
      expect(result.success).toBe(true);
    });

    it('should accept optional sessionId filter', async () => {
      const input = { sessionId: 'session-123' };

      sessionRepo.getSession.mockResolvedValue({
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
        branchName: 'feature/test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as WorkflowSession);

      gitOps.getBranchStatus.mockResolvedValue({
        ahead: 0,
        behind: 0,
        hasRemote: true,
      });

      const result = await tool.execute(input);
      expect(result.data.sessions).toHaveLength(1);
    });

    it('should accept optional includeExpired flag', async () => {
      const input = { includeExpired: true };

      const expiredSession = {
        id: 'expired-123',
        workflowType: 'launch',
        currentState: 'COMPLETE',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      } as WorkflowSession;

      const activeSession = {
        id: 'active-123',
        workflowType: 'ship',
        currentState: 'BRANCH_READY',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      } as WorkflowSession;

      sessionRepo.listSessions.mockResolvedValue([expiredSession, activeSession]);

      const result = await tool.execute(input);
      expect(result.data.sessions).toHaveLength(2);
    });
  });

  describe('Output Contract', () => {
    it('should return list of sessions with details', async () => {
      const sessions = [
        {
          id: 'session-1',
          workflowType: 'launch',
          currentState: 'BRANCH_READY',
          branchName: 'feature/one',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
        },
        {
          id: 'session-2',
          workflowType: 'ship',
          currentState: 'PR_CREATED',
          branchName: 'feature/two',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T02:00:00Z',
        },
      ] as WorkflowSession[];

      sessionRepo.listSessions.mockResolvedValue(sessions);

      for (const session of sessions) {
        gitOps.getBranchStatus.mockResolvedValueOnce({
          ahead: 2,
          behind: 0,
          hasRemote: true,
        });
      }

      const result = await tool.execute({});

      expect(result).toMatchObject({
        success: true,
        data: {
          sessions: expect.arrayContaining([
            expect.objectContaining({
              id: 'session-1',
              workflowType: 'launch',
              currentState: 'BRANCH_READY',
              branchName: 'feature/one',
              gitStatus: expect.objectContaining({
                ahead: 2,
                behind: 0,
              }),
            }),
            expect.objectContaining({
              id: 'session-2',
              workflowType: 'ship',
              currentState: 'PR_CREATED',
              branchName: 'feature/two',
            }),
          ]),
          totalSessions: 2,
          activeSessions: 2,
        },
      });
    });

    it('should include current session indicator', async () => {
      const sessions = [
        {
          id: 'session-1',
          branchName: 'feature/current',
          workflowType: 'launch',
          currentState: 'BRANCH_READY',
        },
        {
          id: 'session-2',
          branchName: 'feature/other',
          workflowType: 'ship',
          currentState: 'BRANCH_READY',
        },
      ] as WorkflowSession[];

      sessionRepo.listSessions.mockResolvedValue(sessions);
      gitOps.getCurrentBranch.mockResolvedValue('feature/current');

      const result = await tool.execute({});

      const currentSession = result.data.sessions.find(s => s.id === 'session-1');
      const otherSession = result.data.sessions.find(s => s.id === 'session-2');

      expect(currentSession?.isCurrent).toBe(true);
      expect(otherSession?.isCurrent).toBe(false);
    });

    it('should include session age and time remaining', async () => {
      const now = new Date();
      const createdAt = new Date(now.getTime() - 86400000); // 1 day ago
      const expiresAt = new Date(now.getTime() + 86400000 * 29); // 29 days from now

      const session = {
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      } as WorkflowSession;

      sessionRepo.listSessions.mockResolvedValue([session]);

      const result = await tool.execute({});

      expect(result.data.sessions[0]).toMatchObject({
        age: expect.stringMatching(/1 day/),
        timeRemaining: expect.stringMatching(/29 days/),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle session repository errors', async () => {
      sessionRepo.listSessions.mockRejectedValue(new Error('Database connection failed'));

      await expect(tool.execute({})).rejects.toThrow('Database connection failed');
    });

    it('should handle Git operation errors gracefully', async () => {
      const session = {
        id: 'session-123',
        workflowType: 'launch',
        currentState: 'BRANCH_READY',
        branchName: 'feature/deleted',
      } as WorkflowSession;

      sessionRepo.listSessions.mockResolvedValue([session]);
      gitOps.getBranchStatus.mockRejectedValue(new Error('Branch not found'));

      const result = await tool.execute({});

      expect(result.data.sessions[0]).toMatchObject({
        id: 'session-123',
        gitStatus: {
          error: 'Branch not found',
        },
      });
    });

    it('should handle invalid session ID filter', async () => {
      const input = { sessionId: 'nonexistent' };

      sessionRepo.getSession.mockResolvedValue(null);

      await expect(tool.execute(input)).rejects.toThrow('Session not found');
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter expired sessions by default', async () => {
      const expiredSession = {
        id: 'expired-123',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      } as WorkflowSession;

      const activeSession = {
        id: 'active-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      } as WorkflowSession;

      sessionRepo.listSessions.mockResolvedValue([expiredSession, activeSession]);

      const result = await tool.execute({});
      expect(result.data.sessions).toHaveLength(1);
      expect(result.data.sessions[0].id).toBe('active-123');
    });

    it('should sort sessions by last updated', async () => {
      const sessions = [
        {
          id: 'old',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'newest',
          updatedAt: '2024-01-03T00:00:00Z',
        },
        {
          id: 'middle',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ] as WorkflowSession[];

      sessionRepo.listSessions.mockResolvedValue(sessions);

      const result = await tool.execute({});

      expect(result.data.sessions[0].id).toBe('newest');
      expect(result.data.sessions[1].id).toBe('middle');
      expect(result.data.sessions[2].id).toBe('old');
    });
  });
});