import { AuditEntry } from '../../src/models/audit-entry';

describe('AuditEntry Model', () => {
  describe('Entry Creation', () => {
    it('should create a valid audit entry', () => {
      const entry = new AuditEntry({
        id: 'audit-123',
        sessionId: 'session-456',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        action: 'WORKFLOW_STARTED',
        actor: 'user@example.com',
        details: {
          workflowType: 'launch',
          branch: 'feature/new',
          previousState: 'INIT',
          newState: 'BRANCH_READY'
        },
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'han-solo-cli/1.0.0'
        }
      });

      expect(entry.id).toBe('audit-123');
      expect(entry.sessionId).toBe('session-456');
      expect(entry.action).toBe('WORKFLOW_STARTED');
      expect(entry.actor).toBe('user@example.com');
      expect(entry.details.workflowType).toBe('launch');
    });

    it('should auto-generate ID if not provided', () => {
      const entry = new AuditEntry({
        sessionId: 'session-789',
        action: 'STATE_TRANSITION',
        actor: 'system'
      });

      expect(entry.id).toBeDefined();
      expect(entry.id).toMatch(/^audit-[a-z0-9-]+$/);
    });

    it('should set timestamp to now if not provided', () => {
      const before = new Date();
      const entry = new AuditEntry({
        sessionId: 'session-001',
        action: 'COMMAND_EXECUTED',
        actor: 'user'
      });
      const after = new Date();

      expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Action Types', () => {
    it('should categorize workflow actions', () => {
      const workflowEntry = new AuditEntry({
        action: 'WORKFLOW_STARTED',
        actor: 'user',
        sessionId: 'session-1'
      });

      expect(workflowEntry.getActionCategory()).toBe('workflow');
      expect(workflowEntry.isWorkflowAction()).toBe(true);
    });

    it('should categorize state actions', () => {
      const stateEntry = new AuditEntry({
        action: 'STATE_TRANSITION',
        actor: 'system',
        sessionId: 'session-1'
      });

      expect(stateEntry.getActionCategory()).toBe('state');
      expect(stateEntry.isStateAction()).toBe(true);
    });

    it('should categorize Git actions', () => {
      const gitEntry = new AuditEntry({
        action: 'GIT_COMMIT',
        actor: 'user',
        sessionId: 'session-1'
      });

      expect(gitEntry.getActionCategory()).toBe('git');
      expect(gitEntry.isGitAction()).toBe(true);
    });

    it('should categorize error actions', () => {
      const errorEntry = new AuditEntry({
        action: 'ERROR',
        actor: 'system',
        sessionId: 'session-1',
        severity: 'error'
      });

      expect(errorEntry.getActionCategory()).toBe('error');
      expect(errorEntry.isError()).toBe(true);
    });
  });

  describe('Severity Levels', () => {
    it('should support different severity levels', () => {
      const infoEntry = new AuditEntry({
        action: 'INFO',
        actor: 'system',
        sessionId: 'session-1',
        severity: 'info'
      });

      const warningEntry = new AuditEntry({
        action: 'WARNING',
        actor: 'system',
        sessionId: 'session-1',
        severity: 'warning'
      });

      const errorEntry = new AuditEntry({
        action: 'ERROR',
        actor: 'system',
        sessionId: 'session-1',
        severity: 'error'
      });

      const criticalEntry = new AuditEntry({
        action: 'CRITICAL',
        actor: 'system',
        sessionId: 'session-1',
        severity: 'critical'
      });

      expect(infoEntry.severity).toBe('info');
      expect(warningEntry.severity).toBe('warning');
      expect(errorEntry.severity).toBe('error');
      expect(criticalEntry.severity).toBe('critical');
    });

    it('should default to info severity', () => {
      const entry = new AuditEntry({
        action: 'COMMAND_EXECUTED',
        actor: 'user',
        sessionId: 'session-1'
      });

      expect(entry.severity).toBe('info');
    });

    it('should identify high severity entries', () => {
      const lowSeverity = new AuditEntry({
        action: 'INFO',
        severity: 'info',
        actor: 'user',
        sessionId: 'session-1'
      });

      const highSeverity = new AuditEntry({
        action: 'ERROR',
        severity: 'error',
        actor: 'system',
        sessionId: 'session-1'
      });

      expect(lowSeverity.isHighSeverity()).toBe(false);
      expect(highSeverity.isHighSeverity()).toBe(true);
    });
  });

  describe('Entry Details', () => {
    it('should store command details', () => {
      const entry = new AuditEntry({
        action: 'COMMAND_EXECUTED',
        actor: 'user',
        sessionId: 'session-1',
        details: {
          command: 'git commit',
          arguments: ['-m', 'Initial commit'],
          exitCode: 0,
          duration: 1250
        }
      });

      expect(entry.details.command).toBe('git commit');
      expect(entry.details.arguments).toEqual(['-m', 'Initial commit']);
      expect(entry.details.exitCode).toBe(0);
      expect(entry.details.duration).toBe(1250);
    });

    it('should store state transition details', () => {
      const entry = new AuditEntry({
        action: 'STATE_TRANSITION',
        actor: 'system',
        sessionId: 'session-1',
        details: {
          previousState: 'BRANCH_READY',
          newState: 'CHANGES_COMMITTED',
          trigger: 'user_action',
          validation: 'passed'
        }
      });

      expect(entry.details.previousState).toBe('BRANCH_READY');
      expect(entry.details.newState).toBe('CHANGES_COMMITTED');
      expect(entry.details.trigger).toBe('user_action');
    });

    it('should store error details', () => {
      const entry = new AuditEntry({
        action: 'ERROR',
        actor: 'system',
        sessionId: 'session-1',
        severity: 'error',
        details: {
          error: 'Git operation failed',
          stack: 'Error at line 123...',
          context: {
            branch: 'feature/test',
            operation: 'rebase'
          }
        }
      });

      expect(entry.details.error).toBe('Git operation failed');
      expect(entry.details.stack).toContain('Error at line 123');
      expect(entry.details.context.operation).toBe('rebase');
    });
  });

  describe('Metadata', () => {
    it('should store user context metadata', () => {
      const entry = new AuditEntry({
        action: 'WORKFLOW_STARTED',
        actor: 'john.doe',
        sessionId: 'session-1',
        metadata: {
          ipAddress: '10.0.0.1',
          hostname: 'dev-machine',
          userAgent: 'han-solo-cli/2.0.0',
          environment: 'development'
        }
      });

      expect(entry.metadata.ipAddress).toBe('10.0.0.1');
      expect(entry.metadata.hostname).toBe('dev-machine');
      expect(entry.metadata.environment).toBe('development');
    });

    it('should store system metadata', () => {
      const entry = new AuditEntry({
        action: 'SYSTEM_EVENT',
        actor: 'system',
        sessionId: 'session-1',
        metadata: {
          nodeVersion: '20.0.0',
          platform: 'darwin',
          architecture: 'x64',
          memoryUsage: 256
        }
      });

      expect(entry.metadata.nodeVersion).toBe('20.0.0');
      expect(entry.metadata.platform).toBe('darwin');
      expect(entry.metadata.memoryUsage).toBe(256);
    });
  });

  describe('Entry Filtering', () => {
    it('should match by session ID', () => {
      const entry = new AuditEntry({
        sessionId: 'session-123',
        action: 'TEST',
        actor: 'user'
      });

      expect(entry.matchesSession('session-123')).toBe(true);
      expect(entry.matchesSession('session-456')).toBe(false);
    });

    it('should match by actor', () => {
      const entry = new AuditEntry({
        sessionId: 'session-1',
        action: 'TEST',
        actor: 'alice@example.com'
      });

      expect(entry.matchesActor('alice@example.com')).toBe(true);
      expect(entry.matchesActor('bob@example.com')).toBe(false);
    });

    it('should match by time range', () => {
      const entry = new AuditEntry({
        sessionId: 'session-1',
        action: 'TEST',
        actor: 'user',
        timestamp: new Date('2024-01-15T12:00:00Z')
      });

      const before = new Date('2024-01-01T00:00:00Z');
      const after = new Date('2024-02-01T00:00:00Z');
      const wayBefore = new Date('2023-01-01T00:00:00Z');
      const wayAfter = new Date('2025-01-01T00:00:00Z');

      expect(entry.isInTimeRange(before, after)).toBe(true);
      expect(entry.isInTimeRange(wayBefore, before)).toBe(false);
      expect(entry.isInTimeRange(after, wayAfter)).toBe(false);
    });

    it('should match by action pattern', () => {
      const entry = new AuditEntry({
        sessionId: 'session-1',
        action: 'WORKFLOW_STARTED',
        actor: 'user'
      });

      expect(entry.matchesActionPattern(/^WORKFLOW_.*/)).toBe(true);
      expect(entry.matchesActionPattern(/^STATE_.*/)).toBe(false);
    });
  });

  describe('Entry Formatting', () => {
    it('should format as log line', () => {
      const entry = new AuditEntry({
        id: 'audit-001',
        sessionId: 'session-001',
        timestamp: new Date('2024-01-01T10:30:00Z'),
        action: 'COMMAND_EXECUTED',
        actor: 'user@example.com',
        details: {
          command: 'git status'
        }
      });

      const logLine = entry.toLogLine();
      expect(logLine).toContain('2024-01-01T10:30:00');
      expect(logLine).toContain('COMMAND_EXECUTED');
      expect(logLine).toContain('user@example.com');
      expect(logLine).toContain('git status');
    });

    it('should format as structured log', () => {
      const entry = new AuditEntry({
        sessionId: 'session-1',
        action: 'STATE_TRANSITION',
        actor: 'system',
        severity: 'info',
        details: {
          from: 'A',
          to: 'B'
        }
      });

      const structured = entry.toStructuredLog();
      expect(structured.level).toBe('info');
      expect(structured.message).toContain('STATE_TRANSITION');
      expect(structured.context.sessionId).toBe('session-1');
      expect(structured.context.actor).toBe('system');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const entry = new AuditEntry({
        id: 'audit-123',
        sessionId: 'session-456',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        action: 'TEST_ACTION',
        actor: 'test-user',
        severity: 'info',
        details: { test: true },
        metadata: { version: '1.0' }
      });

      const json = entry.toJSON();
      expect(json.id).toBe('audit-123');
      expect(json.sessionId).toBe('session-456');
      expect(json.action).toBe('TEST_ACTION');
      expect(json.details.test).toBe(true);
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: 'audit-789',
        sessionId: 'session-012',
        timestamp: '2024-01-01T15:00:00Z',
        action: 'DESERIALIZED',
        actor: 'system',
        severity: 'warning',
        details: { loaded: true }
      };

      const entry = AuditEntry.fromJSON(json);
      expect(entry.id).toBe('audit-789');
      expect(entry.action).toBe('DESERIALIZED');
      expect(entry.severity).toBe('warning');
      expect(entry.details.loaded).toBe(true);
    });
  });

  describe('Entry Relationships', () => {
    it('should track parent-child relationships', () => {
      const parent = new AuditEntry({
        id: 'parent-001',
        sessionId: 'session-1',
        action: 'PARENT_ACTION',
        actor: 'user'
      });

      const child = new AuditEntry({
        sessionId: 'session-1',
        action: 'CHILD_ACTION',
        actor: 'user',
        parentId: 'parent-001'
      });

      expect(child.parentId).toBe('parent-001');
      expect(child.isChildOf(parent)).toBe(true);
    });

    it('should track correlation IDs', () => {
      const entry1 = new AuditEntry({
        sessionId: 'session-1',
        action: 'ACTION_1',
        actor: 'user',
        correlationId: 'correlation-123'
      });

      const entry2 = new AuditEntry({
        sessionId: 'session-1',
        action: 'ACTION_2',
        actor: 'user',
        correlationId: 'correlation-123'
      });

      expect(entry1.isCorrelatedWith(entry2)).toBe(true);
    });
  });
});