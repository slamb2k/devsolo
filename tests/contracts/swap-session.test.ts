import { MCPServer } from '../../src/mcp-server/server';
import { SessionRepository } from '../../src/services/session-repository';
import { WorkflowSession } from '../../src/models/workflow-session';

describe('swap_session MCP Tool', () => {
  let server: MCPServer;
  let sessionRepo: SessionRepository;

  beforeEach(() => {
    sessionRepo = new SessionRepository();
    server = new MCPServer(sessionRepo);
  });

  describe('Tool Registration', () => {
    it('should register swap_session tool', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'swap_session');
      expect(tool).toBeDefined();
      expect(tool?.description).toContain('Switch between concurrent workflow sessions');
    });

    it('should define required parameters', () => {
      const tools = server.getRegisteredTools();
      const tool = tools.find(t => t.name === 'swap_session');
      expect(tool?.inputSchema.required).toContain('sessionId');
    });
  });

  describe('Session Swapping', () => {
    it('should swap to existing session', async () => {
      const session1: WorkflowSession = {
        id: 'session-1',
        workflowType: 'launch',
        branch: 'feature-1',
        status: 'active',
        currentState: 'BRANCH_READY',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      const session2: WorkflowSession = {
        id: 'session-2',
        workflowType: 'ship',
        branch: 'feature-2',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session1);
      await sessionRepo.save(session2);
      await sessionRepo.setCurrentSession('session-1');

      const result = await server.handleToolCall('swap_session', {
        sessionId: 'session-2'
      });

      expect(result.success).toBe(true);
      expect(result.previousSessionId).toBe('session-1');
      expect(result.currentSession.id).toBe('session-2');
      expect(await sessionRepo.getCurrentSession()).toEqual(session2);
    });

    it('should fail when swapping to non-existent session', async () => {
      const result = await server.handleToolCall('swap_session', {
        sessionId: 'non-existent'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should handle swapping to current session gracefully', async () => {
      const session: WorkflowSession = {
        id: 'current-session',
        workflowType: 'launch',
        branch: 'feature',
        status: 'active',
        currentState: 'BRANCH_READY',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session);
      await sessionRepo.setCurrentSession('current-session');

      const result = await server.handleToolCall('swap_session', {
        sessionId: 'current-session'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('already the current session');
    });

    it('should preserve session state during swap', async () => {
      const session1: WorkflowSession = {
        id: 'session-1',
        workflowType: 'launch',
        branch: 'feature-1',
        status: 'active',
        currentState: 'CHANGES_COMMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          unsavedChanges: true,
          lastCommand: 'git add .'
        }
      };

      await sessionRepo.save(session1);
      await sessionRepo.setCurrentSession('session-1');

      // Create and swap to new session
      const session2: WorkflowSession = {
        id: 'session-2',
        workflowType: 'ship',
        branch: 'feature-2',
        status: 'active',
        currentState: 'PR_CREATED',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      };

      await sessionRepo.save(session2);
      await server.handleToolCall('swap_session', { sessionId: 'session-2' });

      // Swap back to first session
      const result = await server.handleToolCall('swap_session', {
        sessionId: 'session-1'
      });

      expect(result.success).toBe(true);
      expect(result.currentSession.metadata.unsavedChanges).toBe(true);
      expect(result.currentSession.metadata.lastCommand).toBe('git add .');
    });
  });

  describe('Validation', () => {
    it('should validate sessionId parameter is provided', async () => {
      const result = await server.handleToolCall('swap_session', {});
      expect(result.success).toBe(false);
      expect(result.error).toContain('sessionId is required');
    });

    it('should validate sessionId format', async () => {
      const result = await server.handleToolCall('swap_session', {
        sessionId: ''
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid session ID');
    });
  });
});