import { HotfixWorkflow } from '../../src/state-machines/hotfix-workflow';
import { WorkflowSession } from '../../src/models/workflow-session';

describe('HotfixWorkflow State Machine', () => {
  let workflow: HotfixWorkflow;
  let session: WorkflowSession;

  beforeEach(() => {
    session = {
      id: 'session-hotfix-001',
      workflowType: 'hotfix',
      branch: 'hotfix/critical-bug',
      status: 'active',
      currentState: 'INIT',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        priority: 'critical',
        targetBranch: 'production'
      }
    };
    workflow = new HotfixWorkflow(session);
  });

  describe('State Definitions', () => {
    it('should define all hotfix workflow states', () => {
      const states = workflow.getStates();
      expect(states).toContain('INIT');
      expect(states).toContain('HOTFIX_BRANCH_CREATED');
      expect(states).toContain('FIX_IMPLEMENTED');
      expect(states).toContain('TESTING');
      expect(states).toContain('APPROVED_FOR_PRODUCTION');
      expect(states).toContain('DEPLOYING_TO_PRODUCTION');
      expect(states).toContain('PRODUCTION_DEPLOYED');
      expect(states).toContain('BACKPORTING_TO_MAIN');
      expect(states).toContain('BACKPORT_COMPLETE');
      expect(states).toContain('CLEANUP');
      expect(states).toContain('COMPLETE');
      expect(states).toContain('ERROR');
      expect(states).toContain('ROLLBACK');
    });

    it('should identify critical states', () => {
      expect(workflow.isCriticalState('DEPLOYING_TO_PRODUCTION')).toBe(true);
      expect(workflow.isCriticalState('PRODUCTION_DEPLOYED')).toBe(true);
      expect(workflow.isCriticalState('TESTING')).toBe(false);
    });

    it('should identify rollback points', () => {
      const rollbackPoints = workflow.getRollbackPoints();
      expect(rollbackPoints).toContain('HOTFIX_BRANCH_CREATED');
      expect(rollbackPoints).toContain('TESTING');
      expect(rollbackPoints).not.toContain('DEPLOYING_TO_PRODUCTION');
    });
  });

  describe('Hotfix Creation Flow', () => {
    it('should create hotfix branch from production', async () => {
      const result = await workflow.transition('HOTFIX_BRANCH_CREATED', {
        trigger: 'create_hotfix',
        metadata: {
          baseBranch: 'production',
          issueId: 'CRITICAL-123'
        }
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('HOTFIX_BRANCH_CREATED');
      expect(session.metadata.baseBranch).toBe('production');
    });

    it('should validate production branch exists', async () => {
      session.metadata.productionBranchExists = false;

      const result = await workflow.transition('HOTFIX_BRANCH_CREATED', {
        trigger: 'create_hotfix'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Production branch not found');
    });
  });

  describe('Fix Implementation Flow', () => {
    it('should implement and test fix', async () => {
      session.currentState = 'HOTFIX_BRANCH_CREATED';

      // Implement fix
      let result = await workflow.transition('FIX_IMPLEMENTED', {
        trigger: 'commit_fix',
        metadata: {
          commitHash: 'fix123',
          filesChanged: ['critical.ts']
        }
      });
      expect(result.success).toBe(true);

      // Run tests
      result = await workflow.transition('TESTING', {
        trigger: 'run_tests'
      });
      expect(result.success).toBe(true);

      // Mark tests passed
      session.metadata.testsPassed = true;
      result = await workflow.transition('APPROVED_FOR_PRODUCTION', {
        trigger: 'tests_passed',
        metadata: {
          testResults: 'All tests passed',
          coverage: 95
        }
      });
      expect(result.success).toBe(true);
    });

    it('should handle test failures', async () => {
      session.currentState = 'TESTING';
      session.metadata.testsPassed = false;

      const result = await workflow.transition('ERROR', {
        trigger: 'tests_failed',
        error: { message: 'Unit tests failed' }
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('ERROR');
    });

    it('should allow re-implementation after test failure', async () => {
      session.currentState = 'ERROR';
      session.metadata.errorType = 'test_failure';

      const result = await workflow.transition('FIX_IMPLEMENTED', {
        trigger: 'retry_fix',
        isRecovery: true,
        metadata: { attemptNumber: 2 }
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('FIX_IMPLEMENTED');
    });
  });

  describe('Production Deployment Flow', () => {
    it('should deploy to production', async () => {
      session.currentState = 'APPROVED_FOR_PRODUCTION';

      // Start deployment
      let result = await workflow.transition('DEPLOYING_TO_PRODUCTION', {
        trigger: 'start_deploy',
        metadata: {
          deploymentId: 'deploy-123',
          environment: 'production'
        }
      });
      expect(result.success).toBe(true);
      expect(workflow.isCriticalState(session.currentState)).toBe(true);

      // Complete deployment
      result = await workflow.transition('PRODUCTION_DEPLOYED', {
        trigger: 'deploy_complete',
        metadata: {
          deployedAt: new Date(),
          version: '1.2.3-hotfix'
        }
      });
      expect(result.success).toBe(true);
    });

    it('should prevent abort during deployment', async () => {
      session.currentState = 'DEPLOYING_TO_PRODUCTION';

      const result = await workflow.transition('ABORTED', {
        trigger: 'user_abort'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot abort during production deployment');
    });

    it('should handle deployment failure', async () => {
      session.currentState = 'DEPLOYING_TO_PRODUCTION';

      const result = await workflow.transition('ROLLBACK', {
        trigger: 'deploy_failed',
        error: {
          message: 'Deployment failed',
          rollbackRequired: true
        }
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('ROLLBACK');
    });
  });

  describe('Backport Flow', () => {
    it('should backport fix to main branch', async () => {
      session.currentState = 'PRODUCTION_DEPLOYED';

      // Start backport
      let result = await workflow.transition('BACKPORTING_TO_MAIN', {
        trigger: 'start_backport',
        metadata: {
          targetBranch: 'main',
          cherryPick: true
        }
      });
      expect(result.success).toBe(true);

      // Complete backport
      result = await workflow.transition('BACKPORT_COMPLETE', {
        trigger: 'backport_merged',
        metadata: {
          mainCommit: 'main123',
          prNumber: 789
        }
      });
      expect(result.success).toBe(true);
    });

    it('should handle backport conflicts', async () => {
      session.currentState = 'BACKPORTING_TO_MAIN';

      const result = await workflow.transition('BACKPORT_CONFLICT', {
        trigger: 'conflict_detected',
        metadata: {
          conflictFiles: ['shared.ts'],
          requiresManualResolution: true
        }
      });

      expect(result.success).toBe(true);
      expect(session.metadata.conflictFiles).toContain('shared.ts');
    });

    it('should allow skipping backport for isolated fixes', async () => {
      session.currentState = 'PRODUCTION_DEPLOYED';
      session.metadata.backportRequired = false;

      const result = await workflow.transition('CLEANUP', {
        trigger: 'skip_backport',
        metadata: {
          reason: 'Production-only fix'
        }
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('CLEANUP');
    });
  });

  describe('Rollback Mechanism', () => {
    it('should rollback from production deployment', async () => {
      session.currentState = 'ROLLBACK';
      session.metadata = {
        previousVersion: '1.2.2',
        rollbackTarget: 'production'
      };

      const result = await workflow.transition('PRODUCTION_DEPLOYED', {
        trigger: 'rollback_complete',
        metadata: {
          rolledBackTo: '1.2.2',
          rolledBackAt: new Date()
        }
      });

      expect(result.success).toBe(true);
      expect(session.metadata.rolledBackTo).toBe('1.2.2');
    });

    it('should track rollback history', async () => {
      session.currentState = 'ROLLBACK';

      await workflow.transition('TESTING', {
        trigger: 'rollback_to_testing',
        isRollback: true,
        metadata: {
          rollbackReason: 'Deployment failed',
          rollbackFrom: 'DEPLOYING_TO_PRODUCTION'
        }
      });

      const history = workflow.getHistory();
      const rollback = history[history.length - 1];
      expect(rollback.isRollback).toBe(true);
      expect(rollback.metadata.rollbackReason).toBe('Deployment failed');
    });
  });

  describe('Emergency Protocols', () => {
    it('should escalate critical failures', async () => {
      session.currentState = 'DEPLOYING_TO_PRODUCTION';
      session.metadata.severity = 'critical';

      const result = await workflow.transition('ERROR', {
        trigger: 'critical_failure',
        error: {
          message: 'Database corruption detected',
          severity: 'critical',
          escalate: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.escalated).toBe(true);
      expect(result.metadata.notificationSent).toBe(true);
    });

    it('should enforce approval for critical operations', async () => {
      session.currentState = 'APPROVED_FOR_PRODUCTION';
      session.metadata.requiresApproval = true;
      session.metadata.approvals = [];

      const result = await workflow.transition('DEPLOYING_TO_PRODUCTION', {
        trigger: 'deploy'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Approval required');
    });

    it('should validate emergency access', async () => {
      session.currentState = 'INIT';
      session.metadata.emergencyAccess = false;

      const result = await workflow.transition('HOTFIX_BRANCH_CREATED', {
        trigger: 'emergency_fix',
        metadata: { bypassChecks: true }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Emergency access not authorized');
    });
  });

  describe('Cleanup and Completion', () => {
    it('should cleanup after successful hotfix', async () => {
      session.currentState = 'BACKPORT_COMPLETE';

      // Start cleanup
      let result = await workflow.transition('CLEANUP', {
        trigger: 'start_cleanup',
        metadata: {
          deleteBranch: true,
          archiveArtifacts: true
        }
      });
      expect(result.success).toBe(true);

      // Complete workflow
      result = await workflow.transition('COMPLETE', {
        trigger: 'cleanup_done',
        metadata: {
          duration: 3600000,
          issueResolved: 'CRITICAL-123'
        }
      });
      expect(result.success).toBe(true);
      expect(workflow.isComplete()).toBe(true);
    });

    it('should preserve audit trail', async () => {
      // Run through complete workflow
      await workflow.transition('HOTFIX_BRANCH_CREATED', { trigger: 'create' });
      await workflow.transition('FIX_IMPLEMENTED', { trigger: 'fix' });
      await workflow.transition('TESTING', { trigger: 'test' });
      session.metadata.testsPassed = true;
      await workflow.transition('APPROVED_FOR_PRODUCTION', { trigger: 'approve' });
      await workflow.transition('DEPLOYING_TO_PRODUCTION', { trigger: 'deploy' });
      await workflow.transition('PRODUCTION_DEPLOYED', { trigger: 'deployed' });

      const history = workflow.getHistory();
      expect(history.length).toBeGreaterThan(5);
      expect(history.every(t => t.sessionId === session.id)).toBe(true);
      expect(history.every(t => t.workflowType === 'hotfix')).toBe(true);
    });
  });

  describe('Priority Handling', () => {
    it('should fast-track critical hotfixes', async () => {
      session.metadata.priority = 'critical';
      session.metadata.fastTrack = true;

      const result = await workflow.transition('HOTFIX_BRANCH_CREATED', {
        trigger: 'emergency_create',
        metadata: {
          skipValidation: true,
          notifyOncall: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.fastTracked).toBe(true);
    });

    it('should enforce normal flow for low priority', async () => {
      session.metadata.priority = 'low';
      session.metadata.fastTrack = true;

      const result = await workflow.transition('HOTFIX_BRANCH_CREATED', {
        trigger: 'create',
        metadata: { skipValidation: true }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Fast track not allowed for low priority');
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should track deployment metrics', async () => {
      session.currentState = 'DEPLOYING_TO_PRODUCTION';
      const startTime = new Date();

      await workflow.transition('PRODUCTION_DEPLOYED', {
        trigger: 'deploy_complete',
        metadata: {
          deploymentDuration: 300000,
          downtime: 0,
          affectedServices: ['api', 'web']
        }
      });

      expect(session.metadata.deploymentDuration).toBe(300000);
      expect(session.metadata.downtime).toBe(0);
      expect(session.metadata.affectedServices).toEqual(['api', 'web']);
    });

    it('should calculate mean time to recovery (MTTR)', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T11:30:00Z');

      session.createdAt = startTime;
      session.currentState = 'COMPLETE';
      session.metadata.completedAt = endTime;

      const mttr = workflow.calculateMTTR();
      expect(mttr).toBe(5400000); // 1.5 hours in ms
    });
  });
});