import { describe, it, expect } from '@jest/globals';
import { WorkflowSession } from '../../src/models/workflow-session';
import { WorkflowType, StateName } from '../../src/models/types';

describe('WorkflowSession Model', () => {
  describe('Creation', () => {
    it('should create a valid workflow session', () => {
      const session = new WorkflowSession({
        workflowType: 'launch' as WorkflowType,
        branchName: 'feature/test-feature',
      });

      expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(session.workflowType).toBe('launch');
      expect(session.branchName).toBe('feature/test-feature');
      expect(session.currentState).toBe('INIT');
      expect(session.stateHistory).toHaveLength(0);
    });

    it('should set appropriate initial state for each workflow type', () => {
      const launchSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      expect(launchSession.currentState).toBe('INIT');

      const shipSession = new WorkflowSession({ workflowType: 'ship' as WorkflowType });
      expect(shipSession.currentState).toBe('BRANCH_READY');

      const hotfixSession = new WorkflowSession({ workflowType: 'hotfix' as WorkflowType });
      expect(hotfixSession.currentState).toBe('HOTFIX_INIT');
    });

    it('should set expiration date 30 days from creation', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      const createdAt = new Date(session.createdAt);
      const expiresAt = new Date(session.expiresAt);

      const daysDiff = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(30, 0);
    });

    it('should auto-generate branch name if not provided', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      expect(session.branchName).toMatch(/^feature\/\d{3}-[a-z-]+$/);
    });
  });

  describe('Validation', () => {
    it('should validate UUID format', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      expect(session.isValidId()).toBe(true);

      (session as any).id = 'invalid-id';
      expect(session.isValidId()).toBe(false);
    });

    it('should validate branch name format', () => {
      const validNames = [
        'feature/add-user-auth',
        'fix/bug-123',
        'hotfix/urgent-fix',
        'feature/ABC-123-new-feature',
      ];

      for (const name of validNames) {
        const session = new WorkflowSession({
          workflowType: 'launch' as WorkflowType,
          branchName: name,
        });
        expect(session.isValidBranchName()).toBe(true);
      }

      const invalidNames = [
        'main',
        'master',
        'develop',
        '/leading-slash',
        'trailing-slash/',
        'spaces in name',
      ];

      for (const name of invalidNames) {
        const session = new WorkflowSession({
          workflowType: 'launch' as WorkflowType,
          branchName: name,
        });
        expect(session.isValidBranchName()).toBe(false);
      }
    });

    it('should validate state for workflow type', () => {
      const launchSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      expect(launchSession.isValidState('INIT' as StateName)).toBe(true);
      expect(launchSession.isValidState('BRANCH_READY' as StateName)).toBe(true);
      expect(launchSession.isValidState('HOTFIX_INIT' as StateName)).toBe(false);

      const hotfixSession = new WorkflowSession({ workflowType: 'hotfix' as WorkflowType });

      expect(hotfixSession.isValidState('HOTFIX_INIT' as StateName)).toBe(true);
      expect(hotfixSession.isValidState('HOTFIX_READY' as StateName)).toBe(true);
      expect(hotfixSession.isValidState('INIT' as StateName)).toBe(false);
    });

    it('should validate expiration', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      expect(session.isExpired()).toBe(false);

      // Set expiration to past
      (session as any).expiresAt = new Date(Date.now() - 1000).toISOString();
      expect(session.isExpired()).toBe(true);
    });
  });

  describe('State Transitions', () => {
    it('should add state transition to history', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      session.transitionTo('BRANCH_READY' as StateName);

      expect(session.currentState).toBe('BRANCH_READY');
      expect(session.stateHistory).toHaveLength(1);
      expect(session.stateHistory[0]).toMatchObject({
        from: 'INIT',
        to: 'BRANCH_READY',
        trigger: 'user_action',
      });
    });

    it('should update timestamps on transition', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      const originalUpdatedAt = session.updatedAt;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        session.transitionTo('BRANCH_READY' as StateName);
        expect(session.updatedAt).not.toBe(originalUpdatedAt);
      }, 10);
    });

    it('should not transition to invalid state', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      expect(() => {
        session.transitionTo('HOTFIX_INIT' as StateName);
      }).toThrow('Invalid state transition');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const session = new WorkflowSession({
        workflowType: 'launch' as WorkflowType,
        branchName: 'feature/test',
      });

      const json = session.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('workflowType', 'launch');
      expect(json).toHaveProperty('branchName', 'feature/test');
      expect(json).toHaveProperty('currentState');
      expect(json).toHaveProperty('stateHistory');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
      expect(json).toHaveProperty('expiresAt');
    });

    it('should deserialize from JSON', () => {
      const originalSession = new WorkflowSession({
        workflowType: 'ship' as WorkflowType,
        branchName: 'feature/original',
      });

      originalSession.transitionTo('CHANGES_COMMITTED' as StateName);

      const json = originalSession.toJSON();
      const restoredSession = WorkflowSession.fromJSON(json);

      expect(restoredSession.id).toBe(originalSession.id);
      expect(restoredSession.workflowType).toBe('ship');
      expect(restoredSession.currentState).toBe('CHANGES_COMMITTED');
      expect(restoredSession.stateHistory).toHaveLength(1);
    });
  });

  describe('Session Operations', () => {
    it('should check if session is active', () => {
      const activeSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      activeSession.currentState = 'BRANCH_READY' as StateName;
      expect(activeSession.isActive()).toBe(true);

      const completedSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      completedSession.currentState = 'COMPLETE' as StateName;
      expect(completedSession.isActive()).toBe(false);

      const abortedSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      abortedSession.currentState = 'ABORTED' as StateName;
      expect(abortedSession.isActive()).toBe(false);
    });

    it('should check if session can be resumed', () => {
      const resumableSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      resumableSession.currentState = 'BRANCH_READY' as StateName;
      expect(resumableSession.canResume()).toBe(true);

      const completedSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      completedSession.currentState = 'COMPLETE' as StateName;
      expect(completedSession.canResume()).toBe(false);

      const expiredSession = new WorkflowSession({ workflowType: 'launch' as WorkflowType });
      (expiredSession as any).expiresAt = new Date(Date.now() - 1000).toISOString();
      expect(expiredSession.canResume()).toBe(false);
    });

    it('should get session age', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      // Mock created time to 1 day ago
      const oneDayAgo = new Date(Date.now() - 86400000);
      (session as any).createdAt = oneDayAgo.toISOString();

      expect(session.getAge()).toMatch(/1 day/);
    });

    it('should get time remaining', () => {
      const session = new WorkflowSession({ workflowType: 'launch' as WorkflowType });

      expect(session.getTimeRemaining()).toMatch(/29 days|30 days/);

      // Set expiration to 1 hour from now
      const oneHourFromNow = new Date(Date.now() + 3600000);
      (session as any).expiresAt = oneHourFromNow.toISOString();

      expect(session.getTimeRemaining()).toMatch(/59 minutes|1 hour/);
    });
  });
});