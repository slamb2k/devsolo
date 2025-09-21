import { WorkflowSession } from '../../models/workflow-session';

describe('WorkflowSession', () => {
  describe('constructor', () => {
    it('should create a session with required fields', () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test-branch',
      });

      expect(session.id).toBeDefined();
      expect(session.workflowType).toBe('launch');
      expect(session.branchName).toBe('feature/test-branch');
      expect(session.currentState).toBe('INIT');
      expect(session.stateHistory).toHaveLength(0);
    });

    it('should create a session with optional fields', () => {
      const metadata = {
        projectPath: '/test/path',
        userEmail: 'test@example.com',
      };

      const session = new WorkflowSession({
        workflowType: 'hotfix',
        branchName: 'hotfix/critical-bug',
        metadata,
      });

      expect(session.metadata).toEqual(metadata);
    });
  });

  describe('state transitions', () => {
    let session: WorkflowSession;

    beforeEach(() => {
      session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });
    });

    it('should transition to a new state', () => {
      session.transitionTo('BRANCH_READY');

      expect(session.currentState).toBe('BRANCH_READY');
      expect(session.stateHistory).toHaveLength(1);
      expect(session.stateHistory[0].from).toBe('INIT');
      expect(session.stateHistory[0].to).toBe('BRANCH_READY');
    });

    it('should track transition trigger and metadata', () => {
      const metadata = { commit: 'abc123' };
      session.transitionTo('CHANGES_COMMITTED', 'user_action', metadata);

      const lastTransition = session.stateHistory[0];
      expect(lastTransition.trigger).toBe('user_action');
      expect(lastTransition.metadata).toEqual(metadata);
    });
  });

  describe('session state queries', () => {
    let session: WorkflowSession;

    beforeEach(() => {
      session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });
    });

    it('should identify active sessions', () => {
      expect(session.isActive()).toBe(true);

      session.transitionTo('COMPLETE');
      expect(session.isActive()).toBe(false);

      session.transitionTo('ABORTED');
      expect(session.isActive()).toBe(false);
    });

    it('should check if session can resume', () => {
      expect(session.canResume()).toBe(true);

      session.transitionTo('COMPLETE');
      expect(session.canResume()).toBe(false);
    });

    it('should check if session is expired', () => {
      expect(session.isExpired()).toBe(false);

      // Mock an old session
      const oldSession = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'old-feature',
      });
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days ago
      oldSession.createdAt = oldDate.toISOString();

      expect(oldSession.isExpired()).toBe(true);
    });
  });

  describe('session age and time', () => {
    let session: WorkflowSession;

    beforeEach(() => {
      session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });
    });

    it('should calculate session age', () => {
      const age = session.getAge();
      expect(age).toMatch(/\d+ seconds?/);
    });

    it('should calculate time remaining', () => {
      const remaining = session.getTimeRemaining();
      expect(remaining).toMatch(/\d+ days?/);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      const json = session.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('workflowType', 'launch');
      expect(json).toHaveProperty('branchName', 'feature/test');
      expect(json).toHaveProperty('currentState', 'INIT');
    });

    it('should deserialize from JSON', () => {
      const originalSession = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });
      originalSession.transitionTo('BRANCH_READY');

      const json = originalSession.toJSON();
      const restoredSession = WorkflowSession.fromJSON(json);

      expect(restoredSession.id).toBe(originalSession.id);
      expect(restoredSession.workflowType).toBe(originalSession.workflowType);
      expect(restoredSession.branchName).toBe(originalSession.branchName);
      expect(restoredSession.currentState).toBe(originalSession.currentState);
      expect(restoredSession.stateHistory).toHaveLength(1);
    });
  });

  describe('validation', () => {
    it('should validate session data', () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      const validation = session.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: '', // Invalid: empty branch name
      });

      const validation = session.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Branch name is required');
    });
  });
});