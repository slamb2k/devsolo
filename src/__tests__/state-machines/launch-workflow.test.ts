import { LaunchWorkflowStateMachine } from '../../state-machines/launch-workflow';

describe('LaunchWorkflowStateMachine', () => {
  let stateMachine: LaunchWorkflowStateMachine;

  beforeEach(() => {
    stateMachine = new LaunchWorkflowStateMachine();
  });

  describe('initialization', () => {
    it('should have correct initial state', () => {
      expect(stateMachine.getInitialState()).toBe('INIT');
    });

    it('should have correct final states', () => {
      const finalStates = stateMachine.getFinalStates();
      expect(finalStates).toContain('COMPLETE');
      expect(finalStates).toContain('ABORTED');
    });
  });

  describe('transition validation', () => {
    it('should allow valid transitions', () => {
      expect(stateMachine.canTransition('INIT', 'BRANCH_READY')).toBe(true);
      expect(stateMachine.canTransition('BRANCH_READY', 'CHANGES_COMMITTED')).toBe(true);
      expect(stateMachine.canTransition('CHANGES_COMMITTED', 'PUSHED')).toBe(true);
      expect(stateMachine.canTransition('PUSHED', 'PR_CREATED')).toBe(true);
      expect(stateMachine.canTransition('PR_CREATED', 'WAITING_APPROVAL')).toBe(true);
      expect(stateMachine.canTransition('WAITING_APPROVAL', 'COMPLETE')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(stateMachine.canTransition('INIT', 'COMPLETE')).toBe(false);
      expect(stateMachine.canTransition('BRANCH_READY', 'PR_CREATED')).toBe(false);
      expect(stateMachine.canTransition('COMPLETE', 'INIT')).toBe(false);
    });

    it('should allow abort from any non-final state', () => {
      expect(stateMachine.canTransition('INIT', 'ABORTED')).toBe(true);
      expect(stateMachine.canTransition('BRANCH_READY', 'ABORTED')).toBe(true);
      expect(stateMachine.canTransition('PUSHED', 'ABORTED')).toBe(true);
    });

    it('should not allow transitions from final states', () => {
      expect(stateMachine.canTransition('COMPLETE', 'INIT')).toBe(false);
      expect(stateMachine.canTransition('ABORTED', 'BRANCH_READY')).toBe(false);
    });
  });

  describe('state queries', () => {
    it('should check if state exists', () => {
      expect(stateMachine.isValidState('INIT')).toBe(true);
      expect(stateMachine.isValidState('BRANCH_READY')).toBe(true);
      expect(stateMachine.isValidState('INVALID_STATE' as any)).toBe(false);
    });

    it('should check if state is final', () => {
      expect(stateMachine.isFinalState('COMPLETE')).toBe(true);
      expect(stateMachine.isFinalState('ABORTED')).toBe(true);
      expect(stateMachine.isFinalState('INIT')).toBe(false);
      expect(stateMachine.isFinalState('BRANCH_READY')).toBe(false);
    });

    it('should get next possible states', () => {
      const nextStates = stateMachine.getNextStates('INIT');
      expect(nextStates).toContain('BRANCH_READY');
      expect(nextStates).toContain('ABORTED');
      expect(nextStates).not.toContain('COMPLETE');
    });

    it('should return empty array for final states', () => {
      const nextStates = stateMachine.getNextStates('COMPLETE');
      expect(nextStates).toHaveLength(0);
    });
  });

  describe('transition execution', () => {
    it('should execute successful transition', async () => {
      const result = await stateMachine.transition('INIT', 'BRANCH_READY');
      expect(result.success).toBe(true);
      expect(result.fromState).toBe('INIT');
      expect(result.toState).toBe('BRANCH_READY');
    });

    it('should fail invalid transition', async () => {
      const result = await stateMachine.transition('INIT', 'COMPLETE');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    it('should include metadata in transition', async () => {
      const metadata = { reason: 'test' };
      const result = await stateMachine.transition(
        'INIT',
        'BRANCH_READY',
        metadata
      );
      expect(result.success).toBe(true);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('allowed actions', () => {
    it('should return correct actions for each state', () => {
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

  describe('state validation', () => {
    it('should pass validation for valid state', () => {
      const isValid = stateMachine.validateState('INIT', {
        gitClean: true,
        onMainBranch: true,
      });
      expect(isValid).toBe(true);
    });

    it('should fail validation for missing required context in BRANCH_READY', () => {
      const isValid = stateMachine.validateState('BRANCH_READY', {
        branchName: null,
        gitClean: true,
      });
      expect(isValid).toBe(false);
    });

    it('should validate PUSHED state correctly', () => {
      const isValid = stateMachine.validateState('PUSHED', {
        hasRemote: true,
      });
      expect(isValid).toBe(true);
    });
  });
});