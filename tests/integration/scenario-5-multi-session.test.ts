import { MCPServer } from '../../src/mcp-server/server';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { ConfigurationManager } from '../../src/services/configuration-manager';
import fs from 'fs/promises';
import path from 'path';

describe('Integration: Multi-Session Management Scenario', () => {
  let server: MCPServer;
  let sessionRepo: SessionRepository;
  let gitOps: GitOperations;
  let configManager: ConfigurationManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join('/tmp', 'hansolo-multi-test-' + Date.now());
    await fs.mkdir(testProjectPath, { recursive: true });
    process.chdir(testProjectPath);

    sessionRepo = new SessionRepository();
    gitOps = new GitOperations();
    configManager = new ConfigurationManager();
    server = new MCPServer(sessionRepo);

    await gitOps.init();
    await gitOps.setConfig('user.name', 'Multi Session User');
    await gitOps.setConfig('user.email', 'multi@example.com');

    await fs.writeFile(path.join(testProjectPath, 'README.md'), '# Multi-Session Test\n');
    await gitOps.add('.');
    await gitOps.commit('Initial commit');

    await server.handleToolCall('configure_workflow', {
      projectPath: testProjectPath,
      defaultBranch: 'main',
      settings: {
        maxSessions: 10
      }
    });
  });

  afterEach(async () => {
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  describe('Concurrent Session Management', () => {
    it('should manage multiple active sessions', async () => {
      // Create multiple feature sessions
      const sessions = [];

      // Session 1: Feature development
      const feature1 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/authentication'
      });
      sessions.push(feature1.session);

      // Session 2: Another feature
      const feature2 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/api-integration'
      });
      sessions.push(feature2.session);

      // Session 3: Ship workflow
      await gitOps.createBranch('feature/ready-to-merge');
      await gitOps.checkout('feature/ready-to-merge');
      await fs.writeFile(path.join(testProjectPath, 'ready.js'), 'export default {};');
      await gitOps.add('.');
      await gitOps.commit('feat: ready feature');

      const ship1 = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-merge'
      });
      sessions.push(ship1.session);

      // Session 4: Hotfix
      const hotfix1 = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/urgent-fix'
      });
      sessions.push(hotfix1.session);

      // Verify all sessions
      const status = await server.handleToolCall('get_sessions_status', {});
      expect(status.sessions).toHaveLength(4);
      expect(status.activeSessions).toBe(4);

      // Verify session types
      const sessionTypes = status.sessions.map(s => s.workflowType);
      expect(sessionTypes).toContain('launch');
      expect(sessionTypes).toContain('ship');
      expect(sessionTypes).toContain('hotfix');
    });

    it('should switch between sessions maintaining state', async () => {
      // Create sessions with different states
      const session1 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/session-1'
      });

      // Progress session 1
      await server.handleToolCall('create_branch', {
        branchName: 'feature/session-1',
        sessionId: session1.session.id
      });
      await fs.writeFile(path.join(testProjectPath, 'feature1.js'), 'const f1 = 1;');
      await gitOps.add('.');
      await gitOps.commit('feat: session 1 work');

      await server.handleToolCall('execute_workflow_step', {
        sessionId: session1.session.id,
        action: 'commit'
      });

      // Create session 2
      const session2 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/session-2'
      });

      await server.handleToolCall('create_branch', {
        branchName: 'feature/session-2',
        sessionId: session2.session.id
      });

      // Switch to session 1
      let swapResult = await server.handleToolCall('swap_session', {
        sessionId: session1.session.id
      });

      expect(swapResult.success).toBe(true);
      expect(swapResult.currentSession.id).toBe(session1.session.id);
      expect(swapResult.currentSession.currentState).toBe('CHANGES_COMMITTED');

      // Verify branch switched
      const currentBranch = await gitOps.getCurrentBranch();
      expect(currentBranch).toBe('feature/session-1');

      // Switch to session 2
      swapResult = await server.handleToolCall('swap_session', {
        sessionId: session2.session.id
      });

      expect(swapResult.success).toBe(true);
      expect(swapResult.currentSession.id).toBe(session2.session.id);
      expect(swapResult.currentSession.currentState).toBe('BRANCH_READY');
    });

    it('should handle session limits', async () => {
      // Set max sessions
      await configManager.setSetting('maxSessions', 3);

      // Create max sessions
      for (let i = 1; i <= 3; i++) {
        await server.handleToolCall('start_workflow', {
          workflowType: 'launch',
          branch: `feature/session-${i}`
        });
      }

      // Try to create one more
      const result = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/overflow'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum sessions reached');
      expect(result.suggestion).toContain('complete or abort');
    });
  });

  describe('Session State Persistence', () => {
    it('should persist sessions across server restarts', async () => {
      // Create sessions
      const session1 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/persistent-1'
      });

      const session2 = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/persistent-2'
      });

      // Add metadata to sessions
      await server.handleToolCall('execute_workflow_step', {
        sessionId: session1.session.id,
        action: 'update_metadata',
        metadata: {
          customField: 'test-value',
          timestamp: new Date()
        }
      });

      // Simulate server restart
      const newSessionRepo = new SessionRepository();
      const newServer = new MCPServer(newSessionRepo);

      // Load sessions
      const status = await newServer.handleToolCall('get_sessions_status', {});

      expect(status.sessions).toHaveLength(2);

      const loadedSession1 = status.sessions.find(s => s.id === session1.session.id);
      expect(loadedSession1).toBeDefined();
      expect(loadedSession1.metadata.customField).toBe('test-value');
    });

    it('should recover from interrupted operations', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/interrupt-test'
      });

      // Progress partway through workflow
      session.currentState = 'PR_CREATED';
      session.metadata = {
        prNumber: 123,
        prUrl: 'https://github.com/user/repo/pull/123',
        halfwayComplete: true
      };

      await sessionRepo.save(session);

      // Simulate crash and restart
      const newServer = new MCPServer(sessionRepo);

      // Resume from interruption point
      const resumed = await newServer.handleToolCall('get_sessions_status', {
        sessionId: session.id
      });

      expect(resumed.session.currentState).toBe('PR_CREATED');
      expect(resumed.session.metadata.prNumber).toBe(123);
      expect(resumed.session.metadata.halfwayComplete).toBe(true);

      // Continue workflow
      const result = await newServer.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'request_review'
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe('WAITING_APPROVAL');
    });
  });

  describe('Session Filtering and Search', () => {
    it('should filter sessions by workflow type', async () => {
      // Create mixed session types
      await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/launch-1'
      });

      await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/launch-2'
      });

      await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ship-1'
      });

      await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/urgent'
      });

      // Filter by workflow type
      const launchSessions = await server.handleToolCall('get_sessions_status', {
        filter: { workflowType: 'launch' }
      });

      expect(launchSessions.sessions).toHaveLength(2);
      expect(launchSessions.sessions.every(s => s.workflowType === 'launch')).toBe(true);

      const hotfixSessions = await server.handleToolCall('get_sessions_status', {
        filter: { workflowType: 'hotfix' }
      });

      expect(hotfixSessions.sessions).toHaveLength(1);
      expect(hotfixSessions.sessions[0].branch).toBe('hotfix/urgent');
    });

    it('should filter sessions by status', async () => {
      // Create sessions in different states
      const active1 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/active-1'
      });

      const active2 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/active-2'
      });

      // Complete one session
      const completed = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/completed'
      });
      completed.session.status = 'completed';
      completed.session.currentState = 'COMPLETE';
      await sessionRepo.save(completed.session);

      // Abort one session
      await server.handleToolCall('abort_workflow', {
        sessionId: active2.session.id
      });

      // Filter active sessions
      const activeSessions = await server.handleToolCall('get_sessions_status', {
        filter: { status: 'active' }
      });

      expect(activeSessions.sessions).toHaveLength(1);
      expect(activeSessions.sessions[0].id).toBe(active1.session.id);

      // Filter completed sessions
      const completedSessions = await server.handleToolCall('get_sessions_status', {
        filter: { status: 'completed' }
      });

      expect(completedSessions.sessions).toHaveLength(1);
      expect(completedSessions.sessions[0].branch).toBe('feature/completed');
    });

    it('should find session by branch name', async () => {
      await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/unique-branch-name'
      });

      const result = await server.handleToolCall('get_sessions_status', {
        filter: { branch: 'feature/unique-branch-name' }
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].branch).toBe('feature/unique-branch-name');
    });
  });

  describe('Session Priority and Ordering', () => {
    it('should prioritize hotfix sessions', async () => {
      // Create sessions with different priorities
      const normal = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/normal'
      });

      const urgent = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/critical',
        metadata: { priority: 'critical' }
      });

      const status = await server.handleToolCall('get_sessions_status', {
        sort: 'priority'
      });

      // Hotfix should be first
      expect(status.sessions[0].workflowType).toBe('hotfix');
      expect(status.sessions[0].metadata.priority).toBe('critical');
    });

    it('should order sessions by creation time', async () => {
      const sessions = [];

      for (let i = 1; i <= 3; i++) {
        const session = await server.handleToolCall('start_workflow', {
          workflowType: 'launch',
          branch: `feature/time-${i}`
        });
        sessions.push(session.session);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      const status = await server.handleToolCall('get_sessions_status', {
        sort: 'created',
        order: 'asc'
      });

      expect(status.sessions[0].branch).toBe('feature/time-1');
      expect(status.sessions[2].branch).toBe('feature/time-3');

      const statusDesc = await server.handleToolCall('get_sessions_status', {
        sort: 'created',
        order: 'desc'
      });

      expect(statusDesc.sessions[0].branch).toBe('feature/time-3');
      expect(statusDesc.sessions[2].branch).toBe('feature/time-1');
    });
  });

  describe('Session Cleanup', () => {
    it('should cleanup completed sessions', async () => {
      // Create multiple sessions
      const sessions = [];
      for (let i = 1; i <= 5; i++) {
        const session = await server.handleToolCall('start_workflow', {
          workflowType: 'launch',
          branch: `feature/cleanup-${i}`
        });
        sessions.push(session.session);
      }

      // Complete some sessions
      sessions[0].status = 'completed';
      sessions[0].currentState = 'COMPLETE';
      await sessionRepo.save(sessions[0]);

      sessions[2].status = 'completed';
      sessions[2].currentState = 'COMPLETE';
      await sessionRepo.save(sessions[2]);

      // Cleanup completed sessions
      const cleanupResult = await server.handleToolCall('cleanup_operations', {
        cleanupCompleted: true,
        olderThan: 0 // Cleanup all completed
      });

      expect(cleanupResult.sessionsRemoved).toBe(2);

      // Verify only active sessions remain
      const status = await server.handleToolCall('get_sessions_status', {});
      expect(status.sessions).toHaveLength(3);
      expect(status.sessions.every(s => s.status === 'active')).toBe(true);
    });

    it('should cleanup old sessions by age', async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Create old session
      const oldSession = {
        id: 'old-session',
        workflowType: 'launch',
        branch: 'feature/old',
        status: 'completed',
        currentState: 'COMPLETE',
        createdAt: oldDate,
        updatedAt: oldDate,
        metadata: {}
      };
      await sessionRepo.save(oldSession);

      // Create recent session
      const recentSession = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/recent'
      });

      // Cleanup old sessions
      const cleanupResult = await server.handleToolCall('cleanup_operations', {
        olderThan: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      expect(cleanupResult.sessionsRemoved).toBe(1);

      // Verify recent session remains
      const status = await server.handleToolCall('get_sessions_status', {});
      expect(status.sessions).toHaveLength(1);
      expect(status.sessions[0].id).toBe(recentSession.session.id);
    });
  });
});