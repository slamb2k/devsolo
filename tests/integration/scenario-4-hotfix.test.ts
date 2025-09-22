import { MCPServer } from '../../src/mcp-server/server';
import { SessionRepository } from '../../src/services/session-repository';
import { GitOperations } from '../../src/services/git-operations';
import { ConfigurationManager } from '../../src/services/configuration-manager';
import fs from 'fs/promises';
import path from 'path';

describe('Integration: Emergency Hotfix Scenario', () => {
  let server: MCPServer;
  let sessionRepo: SessionRepository;
  let gitOps: GitOperations;
  let configManager: ConfigurationManager;
  let testProjectPath: string;

  beforeEach(async () => {
    testProjectPath = path.join('/tmp', 'hansolo-hotfix-test-' + Date.now());
    await fs.mkdir(testProjectPath, { recursive: true });
    process.chdir(testProjectPath);

    sessionRepo = new SessionRepository();
    gitOps = new GitOperations();
    configManager = new ConfigurationManager();
    server = new MCPServer(sessionRepo);

    // Setup repository with production branch
    await gitOps.init();
    await gitOps.setConfig('user.name', 'Hotfix Developer');
    await gitOps.setConfig('user.email', 'hotfix@example.com');

    // Create main branch with some history
    await fs.writeFile(path.join(testProjectPath, 'app.js'), 'const version = "1.0.0";');
    await gitOps.add('.');
    await gitOps.commit('Initial release');

    // Create production branch
    await gitOps.createBranch('production');
    await gitOps.checkout('production');
    await fs.writeFile(path.join(testProjectPath, 'app.js'), 'const version = "1.0.0";\nconst production = true;');
    await gitOps.add('.');
    await gitOps.commit('Production configuration');

    // Initialize han-solo
    await server.handleToolCall('configure_workflow', {
      projectPath: testProjectPath,
      defaultBranch: 'main',
      platform: 'github',
      workflows: {
        hotfix: {
          targetBranch: 'production',
          backportToMain: true,
          requireEmergencyApproval: true
        }
      }
    });
  });

  afterEach(async () => {
    await fs.rm(testProjectPath, { recursive: true, force: true });
  });

  describe('Hotfix Workflow - Critical Bug Fix', () => {
    it('should complete emergency hotfix workflow', async () => {
      // Step 1: Start hotfix workflow
      const startResult = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/critical-security-fix',
        metadata: {
          priority: 'critical',
          issueId: 'SEC-001',
          affectedVersion: '1.0.0'
        }
      });
      expect(startResult.success).toBe(true);
      const sessionId = startResult.session.id;

      // Step 2: Create hotfix branch from production
      const branchResult = await server.handleToolCall('create_branch', {
        branchName: 'hotfix/critical-security-fix',
        workflowType: 'hotfix',
        baseBranch: 'production',
        sessionId: sessionId
      });
      expect(branchResult.success).toBe(true);
      expect(branchResult.branch.baseBranch).toBe('production');

      // Step 3: Implement fix
      await fs.writeFile(
        path.join(testProjectPath, 'security.js'),
        'export function validateInput(input) { return input.replace(/<script>/gi, ""); }'
      );
      await fs.appendFile(
        path.join(testProjectPath, 'app.js'),
        '\nimport { validateInput } from "./security";\n'
      );
      await gitOps.add('.');
      await gitOps.commit('fix: critical security vulnerability');

      let stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'implement_fix',
        metadata: {
          filesChanged: 2,
          linesAdded: 4,
          testsPassed: true
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('FIX_IMPLEMENTED');

      // Step 4: Run tests
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'test',
        metadata: {
          unitTests: 'passed',
          integrationTests: 'passed',
          smokeTests: 'passed'
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('TESTING');

      // Step 5: Get emergency approval
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'emergency_approve',
        metadata: {
          approvedBy: 'security-team',
          approvalTime: new Date(),
          riskAssessment: 'high-priority-fix'
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('APPROVED_FOR_PRODUCTION');

      // Step 6: Deploy to production (simulated)
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'deploy',
        metadata: {
          environment: 'production',
          deploymentId: 'deploy-001',
          rollbackEnabled: true
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('DEPLOYING_TO_PRODUCTION');

      // Step 7: Mark deployment complete
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'deployment_complete',
        metadata: {
          deployedAt: new Date(),
          version: '1.0.1-hotfix',
          monitoring: 'active'
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('PRODUCTION_DEPLOYED');

      // Step 8: Backport to main
      await gitOps.checkout('main');
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'backport',
        metadata: {
          targetBranch: 'main',
          cherryPicked: true,
          conflictsResolved: true
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('BACKPORTING_TO_MAIN');

      // Step 9: Complete backport
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'backport_complete',
        metadata: {
          mainUpdated: true,
          prCreated: false
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('BACKPORT_COMPLETE');

      // Step 10: Cleanup and complete
      stepResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: sessionId,
        action: 'complete',
        metadata: {
          issueResolved: 'SEC-001',
          mttr: 3600000 // 1 hour
        }
      });
      expect(stepResult.success).toBe(true);
      expect(stepResult.newState).toBe('COMPLETE');
    });

    it('should handle deployment rollback', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/failed-deployment'
      });

      // Progress to deployment
      session.currentState = 'DEPLOYING_TO_PRODUCTION';
      session.metadata = {
        previousVersion: '1.0.0',
        currentVersion: '1.0.1-hotfix'
      };

      // Simulate deployment failure
      const deployResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'deployment_failed',
        error: {
          message: 'Health checks failed',
          errorRate: 0.15,
          rollbackRequired: true
        }
      });

      expect(deployResult.success).toBe(true);
      expect(deployResult.newState).toBe('ROLLBACK');

      // Execute rollback
      const rollbackResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'rollback_complete',
        metadata: {
          rolledBackTo: '1.0.0',
          rollbackDuration: 300000,
          serviceRestored: true
        }
      });

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.metadata.rolledBackTo).toBe('1.0.0');
    });
  });

  describe('Priority and Escalation', () => {
    it('should fast-track critical hotfixes', async () => {
      const result = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/critical-data-loss',
        metadata: {
          priority: 'critical',
          severity: 'P0',
          fastTrack: true,
          skipNonEssentialChecks: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.session.metadata.fastTrack).toBe(true);
      expect(result.session.metadata.priority).toBe('critical');
    });

    it('should enforce standard flow for low priority', async () => {
      const result = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/minor-ui-fix',
        metadata: {
          priority: 'low',
          fastTrack: true // Try to fast-track low priority
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Low priority hotfixes cannot be fast-tracked');
    });

    it('should escalate on critical failures', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/database-corruption',
        metadata: {
          priority: 'critical'
        }
      });

      session.currentState = 'DEPLOYING_TO_PRODUCTION';

      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'critical_failure',
        error: {
          message: 'Database corruption detected during deployment',
          severity: 'critical',
          escalate: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.escalated).toBe(true);
      expect(result.metadata.notifiedTeams).toContain('oncall');
      expect(result.metadata.notifiedTeams).toContain('leadership');
    });
  });

  describe('Backport Scenarios', () => {
    it('should handle clean backport to main', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/clean-backport'
      });

      // Create fix on hotfix branch
      await gitOps.checkout('hotfix/clean-backport');
      await fs.writeFile(path.join(testProjectPath, 'fix.js'), 'export const fix = true;');
      await gitOps.add('.');
      await gitOps.commit('fix: apply hotfix');

      session.currentState = 'PRODUCTION_DEPLOYED';

      const backportResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'backport',
        metadata: {
          strategy: 'cherry-pick',
          targetBranch: 'main'
        }
      });

      expect(backportResult.success).toBe(true);
      expect(backportResult.metadata.conflicts).toBe(false);
    });

    it('should handle backport conflicts', async () => {
      // Create conflicting changes on main
      await gitOps.checkout('main');
      await fs.writeFile(path.join(testProjectPath, 'app.js'), 'const version = "2.0.0-dev";');
      await gitOps.add('.');
      await gitOps.commit('chore: update version for development');

      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/conflict-backport'
      });

      await gitOps.checkout('production');
      await gitOps.createBranch('hotfix/conflict-backport');
      await gitOps.checkout('hotfix/conflict-backport');
      await fs.writeFile(path.join(testProjectPath, 'app.js'), 'const version = "1.0.1-hotfix";');
      await gitOps.add('.');
      await gitOps.commit('fix: update version for hotfix');

      session.currentState = 'PRODUCTION_DEPLOYED';

      const backportResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'backport',
        metadata: {
          strategy: 'cherry-pick',
          targetBranch: 'main'
        }
      });

      expect(backportResult.success).toBe(true);
      expect(backportResult.newState).toBe('BACKPORT_CONFLICT');
      expect(backportResult.metadata.conflictFiles).toContain('app.js');
      expect(backportResult.metadata.requiresManualResolution).toBe(true);
    });

    it('should skip backport for production-only fixes', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/prod-only',
        metadata: {
          backportRequired: false,
          reason: 'Production-specific configuration'
        }
      });

      session.currentState = 'PRODUCTION_DEPLOYED';

      const skipResult = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'skip_backport',
        metadata: {
          reason: 'Not applicable to main branch'
        }
      });

      expect(skipResult.success).toBe(true);
      expect(skipResult.newState).toBe('CLEANUP');
      expect(skipResult.metadata.backportSkipped).toBe(true);
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should track MTTR (Mean Time To Recovery)', async () => {
      const startTime = new Date();

      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/track-mttr',
        metadata: {
          incidentStartTime: startTime,
          severity: 'P1'
        }
      });

      // Simulate hotfix workflow
      session.currentState = 'PRODUCTION_DEPLOYED';

      const completeTime = new Date(startTime.getTime() + 3600000); // 1 hour later

      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'complete',
        metadata: {
          resolvedAt: completeTime
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.mttr).toBe(3600000); // 1 hour in milliseconds
      expect(result.metadata.mttrHuman).toBe('1 hour');
    });

    it('should track deployment metrics', async () => {
      const { session } = await server.handleToolCall('start_workflow', {
        workflowType: 'hotfix',
        branch: 'hotfix/metrics'
      });

      session.currentState = 'DEPLOYING_TO_PRODUCTION';

      const deployStart = new Date();
      const deployEnd = new Date(deployStart.getTime() + 300000); // 5 minutes

      const result = await server.handleToolCall('execute_workflow_step', {
        sessionId: session.id,
        action: 'deployment_complete',
        metadata: {
          deploymentStartTime: deployStart,
          deploymentEndTime: deployEnd,
          downtime: 0,
          affectedServices: ['api', 'web', 'worker'],
          usersImpacted: 1000
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.deploymentDuration).toBe(300000);
      expect(result.metadata.downtime).toBe(0);
      expect(result.metadata.affectedServices.length).toBe(3);
    });
  });
});