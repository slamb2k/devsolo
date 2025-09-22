import { MCPServer } from '../../src/mcp-server/server';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { ConfigurationManager } from '../../src/services/configuration-manager';
import fs from 'fs/promises';
import path from 'path';

describe('Integration: Ship Code Scenario', () => {
  let server: MCPServer;
  let sessionRepo: SessionRepository;
  let gitOps: GitOperations;
  let configManager: ConfigurationManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join('/tmp', 'hansolo-ship-test-' + Date.now());
    await fs.mkdir(testProjectPath, { recursive: true });
    process.chdir(testProjectPath);

    sessionRepo = new SessionRepository();
    gitOps = new GitOperations();
    configManager = new ConfigurationManager();
    server = new MCPServer(sessionRepo);

    // Setup repository with existing feature branch
    await gitOps.init();
    await gitOps.setConfig('user.name', 'Ship Tester');
    await gitOps.setConfig('user.email', 'ship@example.com');

    await fs.writeFile(path.join(testProjectPath, 'README.md'), '# Project\n');
    await gitOps.add('.');
    await gitOps.commit('Initial commit');

    // Create and switch to feature branch with changes
    await gitOps.createBranch('feature/ready-to-ship');
    await gitOps.checkout('feature/ready-to-ship');

    await fs.writeFile(path.join(testProjectPath, 'feature.js'), 'export const feature = () => "ready";');
    await gitOps.add('.');
    await gitOps.commit('feat: implement feature');

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

  describe('Ship Workflow - Happy Path', () => {
    it('should complete full ship workflow from commit to merge', async () => {
      // Step 1: Start ship workflow
      const startResult = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });
      expect(startResult.success).toBe(true);
      const sessionId = startResult.session.id;

      // Step 2: Validate changes
      let stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'validate',
        metadata: {
          hasChanges: true,
          testsPass: true,
          lintPass: true
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('VALIDATING');

      // Step 3: Push changes (simulated)
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'push',
        metadata: {
          forcePush: false,
          upToDate: true
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('PUSHED');

      // Step 4: Create PR (simulated)
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'create_pr',
        metadata: {
          prNumber: 42,
          prUrl: 'https://github.com/user/repo/pull/42',
          title: 'feat: implement feature',
          description: 'Implements new feature functionality'
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('PR_CREATED');

      // Step 5: Wait for approval (simulated)
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'request_review',
        metadata: {
          reviewers: ['reviewer1', 'reviewer2'],
          requiredApprovals: 2
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('WAITING_APPROVAL');

      // Step 6: Get approvals (simulated)
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'approve',
        metadata: {
          approvals: ['reviewer1', 'reviewer2'],
          ciStatus: 'success'
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('APPROVED');

      // Step 7: Rebase on main
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'rebase',
        metadata: {
          upToDate: true,
          conflicts: false
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('REBASING');

      // Step 8: Merge (simulated)
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'merge',
        metadata: {
          mergeStrategy: 'squash',
          mergeCommit: 'abc123'
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('MERGING');

      // Step 9: Cleanup
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'cleanup',
        metadata: {
          branchDeleted: true,
          localCleaned: true
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('CLEANUP');

      // Step 10: Complete
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'complete'
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('COMPLETE');

      // Verify final state
      const status = await server.handleToolCall('get_sessions_status', {
        sessionId: sessionId
      });
      expect(status.session.status).toBe('completed');
    });

    it('should handle rebase conflicts during ship', async () => {
      // Setup conflicting changes on main
      await gitOps.checkout('main');
      await fs.writeFile(path.join(testProjectPath, 'feature.js'), 'export const feature = () => "conflict";');
      await gitOps.add('.');
      await gitOps.commit('feat: conflicting change on main');
      await gitOps.checkout('feature/ready-to-ship');

      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      // Progress to rebasing
      await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'validate',
        metadata: { hasChanges: true }
      });

      // Attempt rebase with conflicts
      const rebaseResult = await server.handleToolCall('rebase_on_main', {
        sessionId: session.id
      });

      expect(rebaseResult.rebase.hasConflicts).toBe(true);
      expect(rebaseResult.conflictFiles).toContain('feature.js');
      expect(rebaseResult.instructions).toContain('resolve conflicts');
    });
  });

  describe('PR Management', () => {
    it('should update PR with CI status', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      // Progress to PR created
      await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'validate',
        metadata: { hasChanges: true }
      });

      await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'push'
      });

      await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'create_pr',
        metadata: {
          prNumber: 123,
          draft: false
        }
      });

      // Update with CI status
      const updateResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'update_pr',
        metadata: {
          ciStatus: 'pending',
          checksRunning: ['unit-tests', 'lint', 'build']
        }
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.metadata.ciStatus).toBe('pending');

      // CI completes
      const ciComplete = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'update_pr',
        metadata: {
          ciStatus: 'success',
          checksPassed: ['unit-tests', 'lint', 'build']
        }
      });

      expect(ciComplete.success).toBe(true);
      expect(ciComplete.metadata.ciStatus).toBe('success');
    });

    it('should enforce squash merge strategy', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      // Create multiple commits
      await fs.writeFile(path.join(testProjectPath, 'commit1.js'), 'first');
      await gitOps.add('.');
      await gitOps.commit('WIP: first commit');

      await fs.writeFile(path.join(testProjectPath, 'commit2.js'), 'second');
      await gitOps.add('.');
      await gitOps.commit('WIP: second commit');

      await fs.writeFile(path.join(testProjectPath, 'commit3.js'), 'third');
      await gitOps.add('.');
      await gitOps.commit('feat: final implementation');

      // Progress to merge
      session.currentState = 'APPROVED';

      const mergeResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'merge',
        metadata: {
          mergeStrategy: 'squash',
          originalCommits: 3
        }
      });

      expect(mergeResult.success).toBe(true);
      expect(mergeResult.metadata.mergeStrategy).toBe('squash');
      expect(mergeResult.metadata.squashedIntoOne).toBe(true);
    });
  });

  describe('Approval Flow', () => {
    it('should enforce approval requirements', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      session.currentState = 'WAITING_APPROVAL';
      session.metadata = {
        requiredApprovals: 2,
        currentApprovals: 1
      };

      // Try to proceed without enough approvals
      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'proceed_to_merge'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient approvals');
      expect(result.error).toContain('1 of 2');
    });

    it('should handle approval with comments', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      session.currentState = 'WAITING_APPROVAL';

      const approvalResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'add_approval',
        metadata: {
          reviewer: 'senior-dev',
          status: 'approved',
          comments: 'LGTM! Great implementation.',
          suggestedChanges: []
        }
      });

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.metadata.approvals).toContain('senior-dev');
      expect(approvalResult.metadata.comments).toContain('Great implementation');
    });

    it('should handle requested changes', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      session.currentState = 'WAITING_APPROVAL';

      const reviewResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'add_review',
        metadata: {
          reviewer: 'tech-lead',
          status: 'changes_requested',
          comments: 'Please add tests',
          requestedChanges: ['Add unit tests', 'Update documentation']
        }
      });

      expect(reviewResult.success).toBe(true);
      expect(reviewResult.newState).toBe('CHANGES_REQUESTED');
      expect(reviewResult.metadata.blockedBy).toBe('tech-lead');
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up after successful merge', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      session.currentState = 'MERGED';

      const cleanupResult = await server.handleToolCall('cleanup_operations', {
        sessionId: session.id,
        deleteBranch: true,
        deleteRemote: true,
        archiveSession: true
      });

      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.cleanup.branchDeleted).toBe(true);
      expect(cleanupResult.cleanup.sessionArchived).toBe(true);

      // Verify we're back on main
      const currentBranch = await gitOps.getCurrentBranch();
      expect(currentBranch).toBe('main');
    });

    it('should preserve artifacts when requested', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'ship',
        branch: 'feature/ready-to-ship'
      });

      // Create artifacts
      const artifactsDir = path.join(testProjectPath, '.hansolo', 'artifacts');
      await fs.mkdir(artifactsDir, { recursive: true });
      await fs.writeFile(
        path.join(artifactsDir, 'pr-description.md'),
        '# Feature Implementation\nDetailed PR description'
      );

      session.currentState = 'COMPLETE';

      const cleanupResult = await server.handleToolCall('cleanup_operations', {
        sessionId: session.id,
        preserveArtifacts: true,
        deleteBranch: false
      });

      expect(cleanupResult.success).toBe(true);
      expect(cleanupResult.cleanup.artifactsPreserved).toBe(true);

      // Verify artifacts still exist
      const artifactExists = await fs.access(path.join(artifactsDir, 'pr-description.md'))
        .then(() => true)
        .catch(() => false);
      expect(artifactExists).toBe(true);
    });
  });
});