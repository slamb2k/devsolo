import { WorkflowState } from '../../src/models/workflow-state';
import { StateTransition } from '../../src/models/state-transition';

describe('WorkflowState Model', () => {
  describe('State Creation', () => {
    it('should create a valid workflow state', () => {
      const state = new WorkflowState({
        name: 'BRANCH_READY',
        workflowType: 'launch',
        description: 'Branch created and ready for changes',
        allowedTransitions: ['CHANGES_COMMITTED', 'ABORT'],
        metadata: {
          requiresValidation: true
        }
      });

      expect(state.name).toBe('BRANCH_READY');
      expect(state.workflowType).toBe('launch');
      expect(state.allowedTransitions).toContain('CHANGES_COMMITTED');
      expect(state.metadata.requiresValidation).toBe(true);
    });

    it('should validate state name format', () => {
      expect(() => new WorkflowState({
        name: 'invalid-name',
        workflowType: 'launch'
      })).toThrow('Invalid state name format');
    });

    it('should validate workflow type', () => {
      expect(() => new WorkflowState({
        name: 'VALID_STATE',
        workflowType: 'invalid' as any
      })).toThrow('Invalid workflow type');
    });
  });

  describe('State Properties', () => {
    it('should identify terminal states', () => {
      const completeState = new WorkflowState({
        name: 'COMPLETE',
        workflowType: 'launch',
        isTerminal: true
      });

      const activeState = new WorkflowState({
        name: 'BRANCH_READY',
        workflowType: 'launch',
        isTerminal: false
      });

      expect(completeState.isTerminal).toBe(true);
      expect(activeState.isTerminal).toBe(false);
    });

    it('should identify error states', () => {
      const errorState = new WorkflowState({
        name: 'ERROR',
        workflowType: 'ship',
        isError: true,
        errorRecovery: ['RETRY', 'ABORT']
      });

      expect(errorState.isError).toBe(true);
      expect(errorState.errorRecovery).toContain('RETRY');
    });

    it('should track entry and exit actions', () => {
      const state = new WorkflowState({
        name: 'PR_CREATED',
        workflowType: 'ship',
        entryActions: ['validatePR', 'notifyReviewers'],
        exitActions: ['updateMetrics', 'clearCache']
      });

      expect(state.entryActions).toHaveLength(2);
      expect(state.exitActions).toContain('updateMetrics');
    });
  });

  describe('State Transitions', () => {
    it('should validate allowed transitions', () => {
      const state = new WorkflowState({
        name: 'CHANGES_COMMITTED',
        workflowType: 'launch',
        allowedTransitions: ['PUSHED', 'ABORT']
      });

      expect(state.canTransitionTo('PUSHED')).toBe(true);
      expect(state.canTransitionTo('PR_CREATED')).toBe(false);
    });

    it('should prevent transitions from terminal states', () => {
      const state = new WorkflowState({
        name: 'COMPLETE',
        workflowType: 'ship',
        isTerminal: true,
        allowedTransitions: []
      });

      expect(state.canTransitionTo('ANY_STATE')).toBe(false);
    });

    it('should allow error recovery transitions', () => {
      const state = new WorkflowState({
        name: 'MERGE_CONFLICT',
        workflowType: 'ship',
        isError: true,
        errorRecovery: ['RESOLVE_CONFLICT', 'ABORT']
      });

      expect(state.canRecoverTo('RESOLVE_CONFLICT')).toBe(true);
      expect(state.canRecoverTo('RANDOM_STATE')).toBe(false);
    });
  });

  describe('State Validation', () => {
    it('should validate required fields', () => {
      const state = new WorkflowState({
        name: 'PUSHED',
        workflowType: 'launch',
        requiredFields: ['prTitle', 'prDescription'],
        validationRules: {
          prTitle: { minLength: 5, maxLength: 100 },
          prDescription: { minLength: 20 }
        }
      });

      const valid = state.validateFields({
        prTitle: 'Feature: Add new functionality',
        prDescription: 'This PR adds important new features to the system'
      });

      const invalid = state.validateFields({
        prTitle: 'PR',
        prDescription: 'Short desc'
      });

      expect(valid.isValid).toBe(true);
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors).toContain('prTitle too short');
    });

    it('should validate state preconditions', () => {
      const state = new WorkflowState({
        name: 'PR_CREATED',
        workflowType: 'ship',
        preconditions: [
          { type: 'branch_exists', value: true },
          { type: 'changes_pushed', value: true },
          { type: 'ci_passed', value: true }
        ]
      });

      const conditions = {
        branch_exists: true,
        changes_pushed: true,
        ci_passed: false
      };

      const result = state.checkPreconditions(conditions);
      expect(result.met).toBe(false);
      expect(result.failed).toContain('ci_passed');
    });
  });

  describe('State Metadata', () => {
    it('should store and retrieve metadata', () => {
      const state = new WorkflowState({
        name: 'WAITING_APPROVAL',
        workflowType: 'ship',
        metadata: {
          timeout: 3600,
          autoApprove: false,
          requiredApprovals: 2,
          notificationChannels: ['email', 'slack']
        }
      });

      expect(state.metadata.timeout).toBe(3600);
      expect(state.metadata.requiredApprovals).toBe(2);
      expect(state.metadata.notificationChannels).toContain('slack');
    });

    it('should merge metadata updates', () => {
      const state = new WorkflowState({
        name: 'REBASING',
        workflowType: 'launch',
        metadata: {
          strategy: 'interactive',
          preserveCommits: true
        }
      });

      state.updateMetadata({
        conflictResolution: 'manual',
        preserveCommits: false
      });

      expect(state.metadata.strategy).toBe('interactive');
      expect(state.metadata.preserveCommits).toBe(false);
      expect(state.metadata.conflictResolution).toBe('manual');
    });
  });

  describe('State Comparison', () => {
    it('should compare states for equality', () => {
      const state1 = new WorkflowState({
        name: 'BRANCH_READY',
        workflowType: 'launch'
      });

      const state2 = new WorkflowState({
        name: 'BRANCH_READY',
        workflowType: 'launch'
      });

      const state3 = new WorkflowState({
        name: 'CHANGES_COMMITTED',
        workflowType: 'launch'
      });

      expect(state1.equals(state2)).toBe(true);
      expect(state1.equals(state3)).toBe(false);
    });

    it('should check if state belongs to workflow', () => {
      const launchState = new WorkflowState({
        name: 'BRANCH_READY',
        workflowType: 'launch'
      });

      const shipState = new WorkflowState({
        name: 'PR_CREATED',
        workflowType: 'ship'
      });

      expect(launchState.belongsToWorkflow('launch')).toBe(true);
      expect(launchState.belongsToWorkflow('ship')).toBe(false);
      expect(shipState.belongsToWorkflow('ship')).toBe(true);
    });
  });

  describe('State Serialization', () => {
    it('should serialize to JSON', () => {
      const state = new WorkflowState({
        name: 'MERGING',
        workflowType: 'ship',
        description: 'Merging PR to main',
        allowedTransitions: ['CLEANUP', 'ERROR'],
        metadata: { autoMerge: true }
      });

      const json = state.toJSON();
      expect(json.name).toBe('MERGING');
      expect(json.workflowType).toBe('ship');
      expect(json.allowedTransitions).toEqual(['CLEANUP', 'ERROR']);
    });

    it('should deserialize from JSON', () => {
      const json = {
        name: 'CLEANUP',
        workflowType: 'ship',
        description: 'Cleaning up after merge',
        isTerminal: false,
        allowedTransitions: ['COMPLETE']
      };

      const state = WorkflowState.fromJSON(json);
      expect(state.name).toBe('CLEANUP');
      expect(state.canTransitionTo('COMPLETE')).toBe(true);
    });
  });
});