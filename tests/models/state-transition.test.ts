import { StateTransition } from '../../src/models/state-transition';

describe('StateTransition Model', () => {
  describe('Transition Creation', () => {
    it('should create a valid state transition', () => {
      const transition = new StateTransition({
        id: 'transition-123',
        sessionId: 'session-456',
        workflowType: 'launch',
        fromState: 'BRANCH_READY',
        toState: 'CHANGES_COMMITTED',
        trigger: 'user_action',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        actor: 'user@example.com',
        metadata: {
          commitHash: 'abc123',
          filesChanged: 5
        }
      });

      expect(transition.id).toBe('transition-123');
      expect(transition.fromState).toBe('BRANCH_READY');
      expect(transition.toState).toBe('CHANGES_COMMITTED');
      expect(transition.trigger).toBe('user_action');
    });

    it('should auto-generate ID if not provided', () => {
      const transition = new StateTransition({
        sessionId: 'session-789',
        workflowType: 'ship',
        fromState: 'INIT',
        toState: 'BRANCH_READY',
        trigger: 'command'
      });

      expect(transition.id).toBeDefined();
      expect(transition.id).toMatch(/^transition-[a-z0-9-]+$/);
    });

    it('should set timestamp to now if not provided', () => {
      const before = new Date();
      const transition = new StateTransition({
        sessionId: 'session-001',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'auto'
      });
      const after = new Date();

      expect(transition.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(transition.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Transition Validation', () => {
    it('should validate transition is allowed', () => {
      const validTransition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'BRANCH_READY',
        toState: 'CHANGES_COMMITTED',
        trigger: 'git_commit'
      });

      const invalidTransition = new StateTransition({
        sessionId: 'session-2',
        workflowType: 'launch',
        fromState: 'COMPLETE',
        toState: 'PR_CREATED',
        trigger: 'invalid'
      });

      expect(validTransition.isValid()).toBe(true);
      expect(invalidTransition.isValid()).toBe(false);
    });

    it('should validate workflow type matches states', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'HOTFIX_INIT', // Wrong workflow type
        toState: 'BRANCH_READY',
        trigger: 'command'
      });

      const validation = transition.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('State mismatch with workflow type');
    });

    it('should prevent transitions from terminal states', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'COMPLETE',
        toState: 'ANY_STATE',
        trigger: 'user'
      });

      expect(transition.isValid()).toBe(false);
      expect(transition.validate().errors).toContain('Cannot transition from terminal state');
    });

    it('should allow error recovery transitions', () => {
      const errorRecovery = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'ERROR',
        toState: 'RETRY',
        trigger: 'error_recovery',
        isRecovery: true
      });

      expect(errorRecovery.isValid()).toBe(true);
    });
  });

  describe('Trigger Types', () => {
    it('should categorize user triggers', () => {
      const userTrigger = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user_action'
      });

      expect(userTrigger.getTriggerType()).toBe('user');
      expect(userTrigger.isUserTriggered()).toBe(true);
    });

    it('should categorize system triggers', () => {
      const systemTrigger = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'system_auto'
      });

      expect(systemTrigger.getTriggerType()).toBe('system');
      expect(systemTrigger.isSystemTriggered()).toBe(true);
    });

    it('should categorize webhook triggers', () => {
      const webhookTrigger = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'PR_CREATED',
        toState: 'WAITING_APPROVAL',
        trigger: 'webhook_github'
      });

      expect(webhookTrigger.getTriggerType()).toBe('webhook');
      expect(webhookTrigger.isWebhookTriggered()).toBe(true);
    });

    it('should categorize timeout triggers', () => {
      const timeoutTrigger = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'WAITING_APPROVAL',
        toState: 'TIMEOUT',
        trigger: 'timeout_exceeded'
      });

      expect(timeoutTrigger.getTriggerType()).toBe('timeout');
      expect(timeoutTrigger.isTimeoutTriggered()).toBe(true);
    });
  });

  describe('Transition Conditions', () => {
    it('should validate preconditions', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'CHANGES_COMMITTED',
        toState: 'PUSHED',
        trigger: 'git_push',
        preconditions: [
          { type: 'tests_passed', required: true },
          { type: 'lint_passed', required: true },
          { type: 'build_successful', required: false }
        ]
      });

      const conditions = {
        tests_passed: true,
        lint_passed: true,
        build_successful: false
      };

      expect(transition.checkPreconditions(conditions)).toBe(true);

      conditions.tests_passed = false;
      expect(transition.checkPreconditions(conditions)).toBe(false);
    });

    it('should validate postconditions', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'PR_CREATED',
        toState: 'WAITING_APPROVAL',
        trigger: 'pr_opened',
        postconditions: [
          { type: 'reviewers_assigned', expected: true },
          { type: 'ci_running', expected: true }
        ]
      });

      const conditions = {
        reviewers_assigned: true,
        ci_running: true
      };

      expect(transition.checkPostconditions(conditions)).toBe(true);
    });

    it('should track guards', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'BRANCH_READY',
        toState: 'CHANGES_COMMITTED',
        trigger: 'commit',
        guards: [
          { name: 'hasChanges', passed: true },
          { name: 'validCommitMessage', passed: true }
        ]
      });

      expect(transition.allGuardsPassed()).toBe(true);

      transition.guards.push({ name: 'signedOff', passed: false });
      expect(transition.allGuardsPassed()).toBe(false);
    });
  });

  describe('Transition Duration', () => {
    it('should calculate transition duration', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:05:30Z');

      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user',
        timestamp: startTime,
        completedAt: endTime
      });

      expect(transition.getDuration()).toBe(330000); // 5.5 minutes in ms
      expect(transition.getDurationSeconds()).toBe(330);
    });

    it('should handle incomplete transitions', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user'
      });

      expect(transition.isComplete()).toBe(false);
      expect(transition.getDuration()).toBeNull();
    });

    it('should mark transition as complete', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user'
      });

      transition.complete();
      expect(transition.isComplete()).toBe(true);
      expect(transition.completedAt).toBeDefined();
    });
  });

  describe('Transition Metadata', () => {
    it('should store action metadata', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'CHANGES_COMMITTED',
        toState: 'PUSHED',
        trigger: 'git_push',
        metadata: {
          commitHash: 'abc123def',
          branch: 'feature/test',
          forcePush: false,
          filesChanged: 10,
          insertions: 150,
          deletions: 50
        }
      });

      expect(transition.metadata.commitHash).toBe('abc123def');
      expect(transition.metadata.filesChanged).toBe(10);
      expect(transition.metadata.forcePush).toBe(false);
    });

    it('should store error metadata', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'PUSHING',
        toState: 'ERROR',
        trigger: 'push_failed',
        error: {
          message: 'Remote rejected push',
          code: 'PUSH_REJECTED',
          details: 'Protected branch requires pull request'
        }
      });

      expect(transition.error).toBeDefined();
      expect(transition.error?.code).toBe('PUSH_REJECTED');
      expect(transition.hasError()).toBe(true);
    });

    it('should update metadata', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user',
        metadata: { initial: true }
      });

      transition.updateMetadata({
        updated: true,
        timestamp: new Date()
      });

      expect(transition.metadata.initial).toBe(true);
      expect(transition.metadata.updated).toBe(true);
    });
  });

  describe('Transition History', () => {
    it('should track retry attempts', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'MERGING',
        toState: 'MERGED',
        trigger: 'merge',
        retryCount: 2,
        maxRetries: 3
      });

      expect(transition.retryCount).toBe(2);
      expect(transition.canRetry()).toBe(true);

      transition.incrementRetry();
      expect(transition.retryCount).toBe(3);
      expect(transition.canRetry()).toBe(false);
    });

    it('should track rollback information', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'ERROR',
        toState: 'BRANCH_READY',
        trigger: 'rollback',
        isRollback: true,
        rollbackFrom: 'CHANGES_COMMITTED',
        rollbackReason: 'Tests failed'
      });

      expect(transition.isRollback).toBe(true);
      expect(transition.rollbackFrom).toBe('CHANGES_COMMITTED');
      expect(transition.rollbackReason).toBe('Tests failed');
    });
  });

  describe('Transition Comparison', () => {
    it('should compare transitions for equality', () => {
      const transition1 = new StateTransition({
        id: 'trans-1',
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user'
      });

      const transition2 = new StateTransition({
        id: 'trans-1',
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user'
      });

      const transition3 = new StateTransition({
        id: 'trans-2',
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'B',
        toState: 'C',
        trigger: 'user'
      });

      expect(transition1.equals(transition2)).toBe(true);
      expect(transition1.equals(transition3)).toBe(false);
    });

    it('should check if transition matches pattern', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'ship',
        fromState: 'PR_CREATED',
        toState: 'WAITING_APPROVAL',
        trigger: 'pr_opened'
      });

      expect(transition.matches({
        workflowType: 'ship',
        fromState: 'PR_CREATED'
      })).toBe(true);

      expect(transition.matches({
        workflowType: 'launch'
      })).toBe(false);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const transition = new StateTransition({
        id: 'trans-123',
        sessionId: 'session-456',
        workflowType: 'launch',
        fromState: 'INIT',
        toState: 'BRANCH_READY',
        trigger: 'start',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        metadata: { test: true }
      });

      const json = transition.toJSON();
      expect(json.id).toBe('trans-123');
      expect(json.fromState).toBe('INIT');
      expect(json.toState).toBe('BRANCH_READY');
      expect(json.metadata.test).toBe(true);
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: 'trans-789',
        sessionId: 'session-012',
        workflowType: 'ship',
        fromState: 'PUSHED',
        toState: 'PR_CREATED',
        trigger: 'pr_open',
        timestamp: '2024-01-01T15:00:00Z',
        actor: 'user@example.com'
      };

      const transition = StateTransition.fromJSON(json);
      expect(transition.id).toBe('trans-789');
      expect(transition.fromState).toBe('PUSHED');
      expect(transition.toState).toBe('PR_CREATED');
      expect(transition.actor).toBe('user@example.com');
    });
  });

  describe('Transition Events', () => {
    it('should emit events for state changes', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'B',
        trigger: 'user'
      });

      const events = transition.getEvents();
      expect(events).toContainEqual({
        type: 'STATE_CHANGED',
        from: 'A',
        to: 'B'
      });
    });

    it('should emit events for errors', () => {
      const transition = new StateTransition({
        sessionId: 'session-1',
        workflowType: 'launch',
        fromState: 'A',
        toState: 'ERROR',
        trigger: 'failure',
        error: {
          message: 'Operation failed',
          code: 'OP_FAILED'
        }
      });

      const events = transition.getEvents();
      expect(events).toContainEqual({
        type: 'ERROR_OCCURRED',
        error: 'Operation failed',
        code: 'OP_FAILED'
      });
    });
  });
});