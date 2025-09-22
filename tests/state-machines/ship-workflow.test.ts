import { ShipWorkflow } from '../../src/state-machines/ship-workflow';
import { WorkflowSession } from '../../src/models/workflow-session';
import { StateTransition } from '../../src/models/state-transition';

describe('ShipWorkflow State Machine', () => {
  let workflow: ShipWorkflow;
  let session: WorkflowSession;

  beforeEach(() => {
    session = {
      id: 'session-ship-001',
      workflowType: 'ship',
      branch: 'feature/ready-to-ship',
      status: 'active',
      currentState: 'INIT',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };
    workflow = new ShipWorkflow(session);
  });

  describe('State Definitions', () => {
    it('should define all ship workflow states', () => {
      const states = workflow.getStates();
      expect(states).toContain('INIT');
      expect(states).toContain('VALIDATING');
      expect(states).toContain('CHANGES_COMMITTED');
      expect(states).toContain('PUSHED');
      expect(states).toContain('PR_CREATED');
      expect(states).toContain('WAITING_APPROVAL');
      expect(states).toContain('APPROVED');
      expect(states).toContain('REBASING');
      expect(states).toContain('MERGING');
      expect(states).toContain('MERGED');
      expect(states).toContain('CLEANUP');
      expect(states).toContain('COMPLETE');
      expect(states).toContain('ERROR');
      expect(states).toContain('ABORTED');
    });

    it('should identify terminal states', () => {
      expect(workflow.isTerminalState('COMPLETE')).toBe(true);
      expect(workflow.isTerminalState('ABORTED')).toBe(true);
      expect(workflow.isTerminalState('PR_CREATED')).toBe(false);
    });

    it('should identify error states', () => {
      expect(workflow.isErrorState('ERROR')).toBe(true);
      expect(workflow.isErrorState('MERGE_CONFLICT')).toBe(true);
      expect(workflow.isErrorState('PUSHED')).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should transition from INIT to VALIDATING', async () => {
      const result = await workflow.transition('VALIDATING', {
        trigger: 'start_ship',
        actor: 'user'
      });

      expect(result.success).toBe(true);
      expect(result.fromState).toBe('INIT');
      expect(result.toState).toBe('VALIDATING');
      expect(session.currentState).toBe('VALIDATING');
    });

    it('should transition through commit flow', async () => {
      session.currentState = 'VALIDATING';

      // VALIDATING -> CHANGES_COMMITTED
      let result = await workflow.transition('CHANGES_COMMITTED', {
        trigger: 'commit_changes',
        metadata: { commitHash: 'abc123' }
      });
      expect(result.success).toBe(true);
      expect(session.currentState).toBe('CHANGES_COMMITTED');

      // CHANGES_COMMITTED -> PUSHED
      result = await workflow.transition('PUSHED', {
        trigger: 'push_changes'
      });
      expect(result.success).toBe(true);
      expect(session.currentState).toBe('PUSHED');
    });

    it('should transition through PR flow', async () => {
      session.currentState = 'PUSHED';

      // PUSHED -> PR_CREATED
      let result = await workflow.transition('PR_CREATED', {
        trigger: 'create_pr',
        metadata: { prNumber: 123, prUrl: 'https://github.com/...' }
      });
      expect(result.success).toBe(true);

      // PR_CREATED -> WAITING_APPROVAL
      result = await workflow.transition('WAITING_APPROVAL', {
        trigger: 'request_review',
        metadata: { reviewers: ['alice', 'bob'] }
      });
      expect(result.success).toBe(true);

      // WAITING_APPROVAL -> APPROVED
      result = await workflow.transition('APPROVED', {
        trigger: 'pr_approved',
        metadata: { approvedBy: ['alice', 'bob'] }
      });
      expect(result.success).toBe(true);
    });

    it('should handle rebasing before merge', async () => {
      session.currentState = 'APPROVED';

      // APPROVED -> REBASING
      let result = await workflow.transition('REBASING', {
        trigger: 'start_rebase'
      });
      expect(result.success).toBe(true);

      // REBASING -> MERGING
      result = await workflow.transition('MERGING', {
        trigger: 'rebase_complete'
      });
      expect(result.success).toBe(true);
    });

    it('should complete merge and cleanup', async () => {
      session.currentState = 'MERGING';

      // MERGING -> MERGED
      let result = await workflow.transition('MERGED', {
        trigger: 'merge_complete',
        metadata: { mergeCommit: 'def456' }
      });
      expect(result.success).toBe(true);

      // MERGED -> CLEANUP
      result = await workflow.transition('CLEANUP', {
        trigger: 'start_cleanup'
      });
      expect(result.success).toBe(true);

      // CLEANUP -> COMPLETE
      result = await workflow.transition('COMPLETE', {
        trigger: 'cleanup_complete'
      });
      expect(result.success).toBe(true);
      expect(workflow.isComplete()).toBe(true);
    });

    it('should prevent invalid transitions', async () => {
      session.currentState = 'PR_CREATED';

      // Cannot skip to MERGING
      const result = await workflow.transition('MERGING', {
        trigger: 'invalid_transition'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(session.currentState).toBe('PR_CREATED');
    });
  });

  describe('Error Handling', () => {
    it('should transition to ERROR on validation failure', async () => {
      session.currentState = 'VALIDATING';

      const result = await workflow.transition('ERROR', {
        trigger: 'validation_failed',
        error: { message: 'Uncommitted changes detected' }
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('ERROR');
      expect(result.metadata.error).toBeDefined();
    });

    it('should handle merge conflicts', async () => {
      session.currentState = 'REBASING';

      const result = await workflow.transition('MERGE_CONFLICT', {
        trigger: 'conflict_detected',
        metadata: {
          conflictFiles: ['file1.ts', 'file2.ts']
        }
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('MERGE_CONFLICT');
    });

    it('should allow recovery from error states', async () => {
      session.currentState = 'ERROR';

      const result = await workflow.transition('VALIDATING', {
        trigger: 'retry',
        isRecovery: true
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('VALIDATING');
    });

    it('should allow conflict resolution', async () => {
      session.currentState = 'MERGE_CONFLICT';

      const result = await workflow.transition('REBASING', {
        trigger: 'conflicts_resolved',
        isRecovery: true
      });

      expect(result.success).toBe(true);
      expect(session.currentState).toBe('REBASING');
    });
  });

  describe('Abort Flow', () => {
    it('should allow abort from non-terminal states', async () => {
      const nonTerminalStates = [
        'VALIDATING',
        'CHANGES_COMMITTED',
        'PUSHED',
        'PR_CREATED',
        'WAITING_APPROVAL'
      ];

      for (const state of nonTerminalStates) {
        session.currentState = state;
        const result = await workflow.transition('ABORTED', {
          trigger: 'user_abort',
          metadata: { reason: 'User cancelled' }
        });

        expect(result.success).toBe(true);
        expect(session.currentState).toBe('ABORTED');

        // Reset for next iteration
        session.currentState = state;
      }
    });

    it('should not allow abort from MERGING state', async () => {
      session.currentState = 'MERGING';

      const result = await workflow.transition('ABORTED', {
        trigger: 'user_abort'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot abort during merge');
    });
  });

  describe('State Validations', () => {
    it('should validate PR creation requirements', async () => {
      session.currentState = 'PUSHED';
      session.metadata = {
        hasChanges: false
      };

      const result = await workflow.transition('PR_CREATED', {
        trigger: 'create_pr'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No changes to create PR');
    });

    it('should validate approval requirements', async () => {
      session.currentState = 'WAITING_APPROVAL';
      session.metadata = {
        requiredApprovals: 2,
        currentApprovals: 1
      };

      const result = await workflow.transition('APPROVED', {
        trigger: 'check_approval'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient approvals');
    });

    it('should validate CI status before merge', async () => {
      session.currentState = 'APPROVED';
      session.metadata = {
        ciStatus: 'failed'
      };

      const result = await workflow.transition('REBASING', {
        trigger: 'start_merge'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('CI checks failed');
    });
  });

  describe('State Machine Queries', () => {
    it('should return current state info', () => {
      session.currentState = 'PR_CREATED';

      const info = workflow.getCurrentStateInfo();
      expect(info.name).toBe('PR_CREATED');
      expect(info.description).toContain('Pull request created');
      expect(info.allowedTransitions).toContain('WAITING_APPROVAL');
    });

    it('should check if transition is allowed', () => {
      session.currentState = 'PUSHED';

      expect(workflow.canTransitionTo('PR_CREATED')).toBe(true);
      expect(workflow.canTransitionTo('COMPLETE')).toBe(false);
    });

    it('should get next possible states', () => {
      session.currentState = 'APPROVED';

      const nextStates = workflow.getNextStates();
      expect(nextStates).toContain('REBASING');
      expect(nextStates).toContain('ABORTED');
      expect(nextStates).not.toContain('INIT');
    });

    it('should calculate progress percentage', () => {
      const progressMap = {
        'INIT': 0,
        'VALIDATING': 10,
        'CHANGES_COMMITTED': 20,
        'PUSHED': 30,
        'PR_CREATED': 40,
        'WAITING_APPROVAL': 50,
        'APPROVED': 60,
        'REBASING': 70,
        'MERGING': 80,
        'MERGED': 90,
        'CLEANUP': 95,
        'COMPLETE': 100
      };

      for (const [state, expectedProgress] of Object.entries(progressMap)) {
        session.currentState = state;
        expect(workflow.getProgress()).toBe(expectedProgress);
      }
    });
  });

  describe('State History', () => {
    it('should track state transition history', async () => {
      await workflow.transition('VALIDATING', { trigger: 'start' });
      await workflow.transition('CHANGES_COMMITTED', { trigger: 'commit' });
      await workflow.transition('PUSHED', { trigger: 'push' });

      const history = workflow.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].toState).toBe('VALIDATING');
      expect(history[1].toState).toBe('CHANGES_COMMITTED');
      expect(history[2].toState).toBe('PUSHED');
    });

    it('should include metadata in history', async () => {
      await workflow.transition('VALIDATING', {
        trigger: 'start',
        actor: 'john.doe',
        metadata: { timestamp: new Date() }
      });

      const history = workflow.getHistory();
      expect(history[0].actor).toBe('john.doe');
      expect(history[0].metadata.timestamp).toBeDefined();
    });
  });

  describe('Workflow Metadata', () => {
    it('should update session metadata on transitions', async () => {
      session.currentState = 'PUSHED';

      await workflow.transition('PR_CREATED', {
        trigger: 'create_pr',
        metadata: {
          prNumber: 456,
          prUrl: 'https://github.com/user/repo/pull/456',
          draft: false
        }
      });

      expect(session.metadata.prNumber).toBe(456);
      expect(session.metadata.prUrl).toContain('456');
      expect(session.metadata.draft).toBe(false);
    });

    it('should preserve metadata across transitions', async () => {
      session.metadata = { initialData: 'preserved' };

      await workflow.transition('VALIDATING', { trigger: 'start' });
      await workflow.transition('CHANGES_COMMITTED', {
        trigger: 'commit',
        metadata: { newData: 'added' }
      });

      expect(session.metadata.initialData).toBe('preserved');
      expect(session.metadata.newData).toBe('added');
    });
  });
});