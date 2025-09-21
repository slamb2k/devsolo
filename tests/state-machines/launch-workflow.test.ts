import { describe, it, expect, jest } from '@jest/globals';
import { LaunchWorkflowStateMachine } from '../../src/state-machines/launch-workflow';
import { StateName } from '../../src/models/types';

describe('LaunchWorkflow State Machine', () => {
  let stateMachine: LaunchWorkflowStateMachine;

  beforeEach(() => {
    stateMachine = new LaunchWorkflowStateMachine();
  });

  describe('State Definitions', () => {
    it('should define all launch workflow states', () => {
      const expectedStates: StateName[] = [
        'INIT',
        'BRANCH_READY',
        'CHANGES_COMMITTED',
        'PUSHED',
        'PR_CREATED',
        'COMPLETE',
        'ABORTED',
      ];

      for (const state of expectedStates) {
        expect(stateMachine.hasState(state)).toBe(true);
      }
    });

    it('should set INIT as initial state', () => {
      expect(stateMachine.getInitialState()).toBe('INIT');
    });

    it('should identify terminal states', () => {
      expect(stateMachine.isTerminal('COMPLETE')).toBe(true);
      expect(stateMachine.isTerminal('ABORTED')).toBe(true);
      expect(stateMachine.isTerminal('BRANCH_READY')).toBe(false);
    });
  });

  describe('State Transitions', () => {
    it('should allow valid transitions', () => {
      // INIT → BRANCH_READY
      expect(stateMachine.canTransition('INIT', 'BRANCH_READY')).toBe(true);

      // BRANCH_READY → CHANGES_COMMITTED
      expect(stateMachine.canTransition('BRANCH_READY', 'CHANGES_COMMITTED')).toBe(true);

      // CHANGES_COMMITTED → PUSHED
      expect(stateMachine.canTransition('CHANGES_COMMITTED', 'PUSHED')).toBe(true);

      // PUSHED → PR_CREATED
      expect(stateMachine.canTransition('PUSHED', 'PR_CREATED')).toBe(true);

      // PR_CREATED → COMPLETE
      expect(stateMachine.canTransition('PR_CREATED', 'COMPLETE')).toBe(true);
    });

    it('should allow abort from non-terminal states', () => {
      expect(stateMachine.canTransition('INIT', 'ABORTED')).toBe(true);
      expect(stateMachine.canTransition('BRANCH_READY', 'ABORTED')).toBe(true);
      expect(stateMachine.canTransition('CHANGES_COMMITTED', 'ABORTED')).toBe(true);
      expect(stateMachine.canTransition('PUSHED', 'ABORTED')).toBe(true);
      expect(stateMachine.canTransition('PR_CREATED', 'ABORTED')).toBe(true);
    });

    it('should prevent invalid transitions', () => {
      // Cannot skip states
      expect(stateMachine.canTransition('INIT', 'PUSHED')).toBe(false);
      expect(stateMachine.canTransition('BRANCH_READY', 'PR_CREATED')).toBe(false);

      // Cannot go backwards
      expect(stateMachine.canTransition('PUSHED', 'BRANCH_READY')).toBe(false);
      expect(stateMachine.canTransition('PR_CREATED', 'INIT')).toBe(false);

      // Cannot transition from terminal states
      expect(stateMachine.canTransition('COMPLETE', 'BRANCH_READY')).toBe(false);
      expect(stateMachine.canTransition('ABORTED', 'INIT')).toBe(false);
    });

    it('should allow back-and-forth between BRANCH_READY and CHANGES_COMMITTED', () => {
      // Can commit changes
      expect(stateMachine.canTransition('BRANCH_READY', 'CHANGES_COMMITTED')).toBe(true);

      // Can make more changes (uncommit)
      expect(stateMachine.canTransition('CHANGES_COMMITTED', 'BRANCH_READY')).toBe(true);
    });
  });

  describe('Transition Execution', () => {
    it('should execute valid transition', async () => {
      const result = await stateMachine.transition('INIT', 'BRANCH_READY');

      expect(result.success).toBe(true);
      expect(result.fromState).toBe('INIT');
      expect(result.toState).toBe('BRANCH_READY');
      expect(result.timestamp).toBeDefined();
    });

    it('should fail invalid transition', async () => {
      const result = await stateMachine.transition('INIT', 'COMPLETE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should include transition metadata', async () => {
      const metadata = { trigger: 'user_action', userId: 'user-123' };
      const result = await stateMachine.transition('INIT', 'BRANCH_READY', metadata);

      expect(result.metadata).toMatchObject(metadata);
    });
  });

  describe('State Validation', () => {
    it('should validate state requirements for BRANCH_READY', () => {
      const context = {
        branchName: 'feature/test',
        gitClean: true,
      };

      expect(stateMachine.validateState('BRANCH_READY', context)).toBe(true);

      const invalidContext = {
        branchName: null,
        gitClean: false,
      };

      expect(stateMachine.validateState('BRANCH_READY', invalidContext)).toBe(false);
    });

    it('should validate state requirements for CHANGES_COMMITTED', () => {
      const context = {
        hasChanges: true,
        commitMessage: 'feat: add new feature',
      };

      expect(stateMachine.validateState('CHANGES_COMMITTED', context)).toBe(true);

      const invalidContext = {
        hasChanges: false,
      };

      expect(stateMachine.validateState('CHANGES_COMMITTED', invalidContext)).toBe(false);
    });

    it('should validate state requirements for PR_CREATED', () => {
      const context = {
        prNumber: 123,
        prUrl: 'https://github.com/user/repo/pull/123',
      };

      expect(stateMachine.validateState('PR_CREATED', context)).toBe(true);

      const invalidContext = {
        prNumber: null,
      };

      expect(stateMachine.validateState('PR_CREATED', invalidContext)).toBe(false);
    });
  });

  describe('Workflow Rules', () => {
    it('should enforce user input requirements', () => {
      expect(stateMachine.requiresUserInput('BRANCH_READY')).toBe(true);
      expect(stateMachine.requiresUserInput('CHANGES_COMMITTED')).toBe(true);
      expect(stateMachine.requiresUserInput('PUSHED')).toBe(false);
      expect(stateMachine.requiresUserInput('PR_CREATED')).toBe(false);
    });

    it('should identify reversible states', () => {
      expect(stateMachine.isReversible('CHANGES_COMMITTED')).toBe(true);
      expect(stateMachine.isReversible('PUSHED')).toBe(false);
      expect(stateMachine.isReversible('PR_CREATED')).toBe(false);
      expect(stateMachine.isReversible('COMPLETE')).toBe(false);
    });

    it('should get allowed actions for each state', () => {
      const initActions = stateMachine.getAllowedActions('INIT');
      expect(initActions).toContain('start');
      expect(initActions).toContain('abort');

      const branchReadyActions = stateMachine.getAllowedActions('BRANCH_READY');
      expect(branchReadyActions).toContain('commit');
      expect(branchReadyActions).toContain('abort');

      const completeActions = stateMachine.getAllowedActions('COMPLETE');
      expect(completeActions).toHaveLength(0);
    });
  });

  describe('State Machine Lifecycle', () => {
    it('should handle onEnter hooks', async () => {
      const onEnterSpy = jest.fn();
      stateMachine.setHook('BRANCH_READY', 'onEnter', onEnterSpy);

      await stateMachine.transition('INIT', 'BRANCH_READY');

      expect(onEnterSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fromState: 'INIT',
          toState: 'BRANCH_READY',
        })
      );
    });

    it('should handle onExit hooks', async () => {
      const onExitSpy = jest.fn();
      stateMachine.setHook('INIT', 'onExit', onExitSpy);

      await stateMachine.transition('INIT', 'BRANCH_READY');

      expect(onExitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fromState: 'INIT',
          toState: 'BRANCH_READY',
        })
      );
    });

    it('should handle transition validation hooks', async () => {
      const validationSpy = jest.fn().mockResolvedValue(false);
      stateMachine.setHook('BRANCH_READY', 'validate', validationSpy);

      const result = await stateMachine.transition('INIT', 'BRANCH_READY');

      expect(validationSpy).toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });
});