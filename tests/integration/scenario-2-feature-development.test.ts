import { MCPServer } from '../../src/mcp-server/server';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { ConfigurationManager } from '../../src/services/configuration-manager';
import { LaunchWorkflow } from '../../src/state-machines/launch-workflow';
import fs from 'fs/promises';
import path from 'path';

describe('Integration: Feature Development Scenario', () => {
  let server: MCPServer;
  let sessionRepo: SessionRepository;
  let gitOps: GitOperations;
  let configManager: ConfigurationManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join('/tmp', 'hansolo-launch-test-' + Date.now());
    await fs.mkdir(testProjectPath, { recursive: true });
    process.chdir(testProjectPath);

    // Initialize services
    sessionRepo = new SessionRepository();
    gitOps = new GitOperations();
    configManager = new ConfigurationManager();
    server = new MCPServer(sessionRepo);

    // Setup Git repository
    await gitOps.init();
    await gitOps.setConfig('user.name', 'Test Developer');
    await gitOps.setConfig('user.email', 'dev@example.com');

    // Create initial commit
    await fs.writeFile(path.join(testProjectPath, 'README.md'), '# Test Project\n');
    await gitOps.add('.');
    await gitOps.commit('Initial commit');

    // Initialize han-solo
    await server.handleToolCall('configure_workflow', {
      projectPath: testProjectPath,
      defaultBranch: 'main',
      platform: 'github'
    });
  });

  afterEach(async () => {
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  describe('Launch Workflow - Happy Path', () => {
    it('should complete full feature development workflow', async () => {
      // Step 1: Start launch workflow
      const startResult = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/add-user-auth'
      });
      expect(startResult.success).toBe(true);
      expect(startResult.session).toBeDefined();
      const sessionId = startResult.session.id;

      // Step 2: Create feature branch
      const branchResult = await server.handleToolCall('create_branch', {
        branchName: 'feature/add-user-auth',
        workflowType: 'launch',
        sessionId: sessionId
      });
      expect(branchResult.success).toBe(true);
      expect(branchResult.branch.created).toBe(true);

      // Step 3: Execute workflow step - make changes
      let stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'make_changes'
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('BRANCH_READY');

      // Step 4: Simulate development work
      await fs.writeFile(
        path.join(testProjectPath, 'auth.js'),
        'export function authenticate() { return true; }'
      );
      await fs.writeFile(
        path.join(testProjectPath, 'auth.test.js'),
        'import { authenticate } from "./auth"; test("auth", () => expect(authenticate()).toBe(true));'
      );

      // Step 5: Commit changes
      await gitOps.add('.');
      await gitOps.commit('feat: add user authentication module');

      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'commit',
        metadata: {
          commitMessage: 'feat: add user authentication module',
          filesChanged: 2
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('CHANGES_COMMITTED');

      // Step 6: Push changes (simulated)
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'push',
        metadata: {
          remote: 'origin',
          branch: 'feature/add-user-auth'
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('PUSHED');

      // Step 7: Check session status
      const statusResult = await server.handleToolCall('get_sessions_status', {
        sessionId: sessionId
      });
      expect(statusResult.success).toBe(true);
      expect(statusResult.session.currentState).toBe('PUSHED');
      expect(statusResult.session.branch).toBe('feature/add-user-auth');
    });

    it('should handle multiple file changes in feature', async () => {
      // Start workflow
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/refactor-api'
      });

      // Create branch
      await server.handleToolCall('create_branch', {
        branchName: 'feature/refactor-api',
        workflowType: 'launch',
        sessionId: session.id
      });

      // Make multiple changes
      const files = [
        { name: 'api/users.js', content: 'export const getUsers = () => []' },
        { name: 'api/posts.js', content: 'export const getPosts = () => []' },
        { name: 'api/index.js', content: 'export * from "./users"; export * from "./posts"' }
      ];

      await fs.mkdir(path.join(testProjectPath, 'api'), { recursive: true });
      for (const file of files) {
        await fs.writeFile(path.join(testProjectPath, file.name), file.content);
      }

      await gitOps.add('.');
      await gitOps.commit('refactor: reorganize API structure');

      // Progress through workflow
      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'commit',
        metadata: { filesChanged: 3, insertions: 3, deletions: 0 }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.filesChanged).toBe(3);
    });
  });

  describe('Launch Workflow - Error Scenarios', () => {
    it('should handle uncommitted changes error', async () => {
      // Create uncommitted changes
      await fs.writeFile(path.join(testProjectPath, 'uncommitted.js'), 'changes');

      // Try to start workflow
      const result = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/will-fail'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Uncommitted changes');
      expect(result.suggestion).toContain('commit or stash');
    });

    it('should handle branch name conflicts', async () => {
      // Create first feature
      await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/duplicate'
      });

      await server.handleToolCall('create_branch', {
        branchName: 'feature/duplicate',
        workflowType: 'launch'
      });

      // Try to create duplicate
      const result = await server.handleToolCall('create_branch', {
        branchName: 'feature/duplicate',
        workflowType: 'launch'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should recover from failed push', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/push-retry'
      });

      // Progress to CHANGES_COMMITTED
      await server.handleToolCall('create_branch', {
        branchName: 'feature/push-retry',
        sessionId: session.id
      });

      await fs.writeFile(path.join(testProjectPath, 'feature.js'), 'export default {}');
      await gitOps.add('.');
      await gitOps.commit('feat: add feature');

      await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'commit'
      });

      // Simulate push failure
      jest.spyOn(gitOps, 'push').mockRejectedValueOnce(new Error('Network error'));

      let result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'push'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');

      // Retry push
      jest.spyOn(gitOps, 'push').mockResolvedValueOnce(true);

      result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'push',
        retry: true
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should handle multiple concurrent features', async () => {
      // Start first feature
      const feature1 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/auth'
      });

      // Start second feature
      const feature2 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/api'
      });

      // Start third feature
      const feature3 = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/ui'
      });

      // Check all sessions
      const status = await server.handleToolCall('get_sessions_status', {});
      expect(status.sessions).toHaveLength(3);
      expect(status.sessions.map(s => s.branch)).toEqual([
        'feature/auth',
        'feature/api',
        'feature/ui'
      ]);

      // Switch between sessions
      const swapResult = await server.handleToolCall('swap_session', {
        sessionId: feature2.session.id
      });
      expect(swapResult.success).toBe(true);
      expect(swapResult.currentSession.branch).toBe('feature/api');
    });

    it('should resume interrupted workflow', async () => {
      // Start workflow
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/resume-test'
      });

      // Progress partway
      await server.handleToolCall('create_branch', {
        branchName: 'feature/resume-test',
        sessionId: session.id
      });

      await fs.writeFile(path.join(testProjectPath, 'work.js'), 'partial');
      await gitOps.add('.');
      await gitOps.commit('WIP: partial work');

      await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'commit'
      });

      // Simulate interruption (new server instance)
      const newServer = new MCPServer(sessionRepo);

      // Resume workflow
      const resumed = await newServer.handleToolCall('get_sessions_status', {
        sessionId: session.id
      });

      expect(resumed.success).toBe(true);
      expect(resumed.session.currentState).toBe('CHANGES_COMMITTED');
      expect(resumed.session.branch).toBe('feature/resume-test');

      // Continue from where left off
      const result = await newServer.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'push'
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe('PUSHED');
    });
  });

  describe('Abort Scenarios', () => {
    it('should cleanly abort feature development', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/to-abort'
      });

      await server.handleToolCall('create_branch', {
        branchName: 'feature/to-abort',
        sessionId: session.id
      });

      // Make some progress
      await fs.writeFile(path.join(testProjectPath, 'abort.js'), 'content');
      await gitOps.add('.');

      // Abort workflow
      const abortResult = await server.handleToolCall('abort_workflow', {
        sessionId: session.id,
        cleanup: true,
        reason: 'Requirements changed'
      });

      expect(abortResult.success).toBe(true);
      expect(abortResult.session.status).toBe('aborted');

      // Verify cleanup
      const currentBranch = await gitOps.getCurrentBranch();
      expect(currentBranch).toBe('main');

      // Verify session marked as aborted
      const status = await server.handleToolCall('get_sessions_status', {
        sessionId: session.id
      });
      expect(status.session.status).toBe('aborted');
    });

    it('should preserve work when aborting without cleanup', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'launch',
        branch: 'feature/preserve'
      });

      await server.handleToolCall('create_branch', {
        branchName: 'feature/preserve',
        sessionId: session.id
      });

      await fs.writeFile(path.join(testProjectPath, 'preserve.js'), 'important work');
      await gitOps.add('.');
      await gitOps.commit('feat: important changes to preserve');

      // Abort without cleanup
      const abortResult = await server.handleToolCall('abort_workflow', {
        sessionId: session.id,
        cleanup: false,
        preserveBranch: true
      });

      expect(abortResult.success).toBe(true);

      // Verify branch still exists
      const branches = await gitOps.getBranches();
      expect(branches).toContain('feature/preserve');

      // Verify commit preserved
      const log = await gitOps.getLog('feature/preserve', 1);
      expect(log[0].message).toContain('important changes');
    });
  });
});