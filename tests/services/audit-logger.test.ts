import { AuditLogger } from '../../src/services/audit-logger';
import { AuditEntry } from '../../src/models/audit-entry';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  const mockAuditFile = '.hansolo/audit.log';

  beforeEach(() => {
    jest.clearAllMocks();
    auditLogger = new AuditLogger();
  });

  describe('log', () => {
    it('should create audit entry and append to file', async () => {
      const entry = {
        sessionId: 'test-session-123',
        action: 'WORKFLOW_STARTED',
        timestamp: new Date().toISOString(),
        metadata: {
          workflowType: 'launch',
          branch: 'feature/test',
          user: 'test-user'
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.appendFileSync as jest.Mock).mockImplementation(() => {});

      await auditLogger.log(entry);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        mockAuditFile,
        JSON.stringify(entry) + '\n'
      );
    });

    it('should create audit directory if it does not exist', async () => {
      const entry = {
        sessionId: 'test-session-123',
        action: 'STATE_TRANSITION',
        timestamp: new Date().toISOString(),
        metadata: {
          from: 'INIT',
          to: 'BRANCH_READY'
        }
      };

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.appendFileSync as jest.Mock).mockImplementation(() => {});

      await auditLogger.log(entry);

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(mockAuditFile), { recursive: true });
    });
  });

  describe('getSessionLogs', () => {
    it('should return logs for specific session', async () => {
      const logs = [
        { sessionId: 'session-1', action: 'WORKFLOW_STARTED', timestamp: '2025-01-01T00:00:00Z', metadata: {} },
        { sessionId: 'session-2', action: 'STATE_TRANSITION', timestamp: '2025-01-01T00:01:00Z', metadata: {} },
        { sessionId: 'session-1', action: 'WORKFLOW_COMPLETED', timestamp: '2025-01-01T00:02:00Z', metadata: {} }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );

      const sessionLogs = await auditLogger.getSessionLogs('session-1');

      expect(sessionLogs).toEqual([logs[0], logs[2]]);
    });

    it('should return empty array if audit file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const sessionLogs = await auditLogger.getSessionLogs('non-existent-session');

      expect(sessionLogs).toEqual([]);
    });
  });

  describe('getRecentLogs', () => {
    it('should return specified number of recent logs', async () => {
      const logs = Array.from({ length: 20 }, (_, i) => ({
        sessionId: `session-${i}`,
        action: 'TEST_ACTION',
        timestamp: new Date(2025, 0, 1, 0, i).toISOString(),
        metadata: {}
      }));

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );

      const recentLogs = await auditLogger.getRecentLogs(5);

      expect(recentLogs).toHaveLength(5);
      expect(recentLogs[0].sessionId).toBe('session-19');
      expect(recentLogs[4].sessionId).toBe('session-15');
    });

    it('should return all logs if fewer than requested', async () => {
      const logs = [
        { sessionId: 'session-1', action: 'ACTION_1', timestamp: '2025-01-01T00:00:00Z', metadata: {} },
        { sessionId: 'session-2', action: 'ACTION_2', timestamp: '2025-01-01T00:01:00Z', metadata: {} }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );

      const recentLogs = await auditLogger.getRecentLogs(10);

      expect(recentLogs).toEqual(logs.reverse());
    });
  });

  describe('searchLogs', () => {
    it('should filter logs by action', async () => {
      const logs = [
        { sessionId: 'session-1', action: 'WORKFLOW_STARTED', timestamp: '2025-01-01T00:00:00Z', metadata: {} },
        { sessionId: 'session-2', action: 'STATE_TRANSITION', timestamp: '2025-01-01T00:01:00Z', metadata: {} },
        { sessionId: 'session-3', action: 'WORKFLOW_STARTED', timestamp: '2025-01-01T00:02:00Z', metadata: {} }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );

      const filteredLogs = await auditLogger.searchLogs({ action: 'WORKFLOW_STARTED' });

      expect(filteredLogs).toEqual([logs[0], logs[2]]);
    });

    it('should filter logs by time range', async () => {
      const logs = [
        { sessionId: 'session-1', action: 'ACTION_1', timestamp: '2025-01-01T00:00:00Z', metadata: {} },
        { sessionId: 'session-2', action: 'ACTION_2', timestamp: '2025-01-01T12:00:00Z', metadata: {} },
        { sessionId: 'session-3', action: 'ACTION_3', timestamp: '2025-01-02T00:00:00Z', metadata: {} }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );

      const filteredLogs = await auditLogger.searchLogs({
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T23:59:59Z'
      });

      expect(filteredLogs).toEqual([logs[1]]);
    });

    it('should filter logs by multiple criteria', async () => {
      const logs = [
        { sessionId: 'session-1', action: 'WORKFLOW_STARTED', timestamp: '2025-01-01T00:00:00Z', metadata: { user: 'alice' } },
        { sessionId: 'session-1', action: 'STATE_TRANSITION', timestamp: '2025-01-01T00:01:00Z', metadata: { user: 'alice' } },
        { sessionId: 'session-2', action: 'WORKFLOW_STARTED', timestamp: '2025-01-01T00:02:00Z', metadata: { user: 'bob' } }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );

      const filteredLogs = await auditLogger.searchLogs({
        sessionId: 'session-1',
        action: 'STATE_TRANSITION'
      });

      expect(filteredLogs).toEqual([logs[1]]);
    });
  });

  describe('clearOldLogs', () => {
    it('should remove logs older than specified days', async () => {
      const now = new Date();
      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 31);
      const recentDate = new Date(now);
      recentDate.setDate(recentDate.getDate() - 29);

      const logs = [
        { sessionId: 'old-session', action: 'OLD_ACTION', timestamp: oldDate.toISOString(), metadata: {} },
        { sessionId: 'recent-session', action: 'RECENT_ACTION', timestamp: recentDate.toISOString(), metadata: {} },
        { sessionId: 'current-session', action: 'CURRENT_ACTION', timestamp: now.toISOString(), metadata: {} }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await auditLogger.clearOldLogs(30);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAuditFile,
        expect.stringContaining('recent-session')
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAuditFile,
        expect.stringContaining('current-session')
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockAuditFile,
        expect.not.stringContaining('old-session')
      );
    });
  });

  describe('exportLogs', () => {
    it('should export logs to specified file', async () => {
      const logs = [
        { sessionId: 'session-1', action: 'ACTION_1', timestamp: '2025-01-01T00:00:00Z', metadata: {} },
        { sessionId: 'session-2', action: 'ACTION_2', timestamp: '2025-01-01T00:01:00Z', metadata: {} }
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        logs.map(log => JSON.stringify(log)).join('\n')
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await auditLogger.exportLogs('/tmp/audit-export.json');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/audit-export.json',
        JSON.stringify(logs, null, 2)
      );
    });
  });
});