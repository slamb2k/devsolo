import { SessionRepository } from '../../src/services/session-repository';
import { WorkflowSession } from '../../src/models/workflow-session';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('SessionRepository', () => {
  let repository: SessionRepository;
  const mockSessionsDir = '.hansolo/sessions';

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SessionRepository();
  });

  describe('save', () => {
    it('should save session to file system', async () => {
      const session: WorkflowSession = {
        id: 'test-session-123',
        workflowType: 'launch',
        branch: 'feature/test',
        state: 'BRANCH_READY',
        metadata: {
          startTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          user: 'test-user',
          projectPath: '/test/path'
        },
        history: [],
        active: true
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await repository.save(session);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join(mockSessionsDir, 'test-session-123.json'),
        JSON.stringify(session, null, 2)
      );
    });

    it('should create sessions directory if it does not exist', async () => {
      const session: WorkflowSession = {
        id: 'test-session-123',
        workflowType: 'ship',
        branch: 'feature/test',
        state: 'INIT',
        metadata: {
          startTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          user: 'test-user',
          projectPath: '/test/path'
        },
        history: [],
        active: true
      };

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await repository.save(session);

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockSessionsDir, { recursive: true });
    });
  });

  describe('load', () => {
    it('should load session from file system', async () => {
      const sessionData = {
        id: 'test-session-123',
        workflowType: 'hotfix',
        branch: 'hotfix/critical',
        state: 'WAITING_APPROVAL',
        metadata: {
          startTime: '2025-01-01T00:00:00.000Z',
          lastUpdate: '2025-01-01T01:00:00.000Z',
          user: 'test-user',
          projectPath: '/test/path'
        },
        history: [],
        active: true
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(sessionData));

      const session = await repository.load('test-session-123');

      expect(session).toEqual(sessionData);
      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(mockSessionsDir, 'test-session-123.json'),
        'utf-8'
      );
    });

    it('should return null if session file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const session = await repository.load('non-existent-session');

      expect(session).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete session file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await repository.delete('test-session-123');

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        path.join(mockSessionsDir, 'test-session-123.json')
      );
    });

    it('should not throw if session file does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(repository.delete('non-existent-session')).resolves.not.toThrow();
    });
  });

  describe('listAll', () => {
    it('should list all session IDs', async () => {
      const files = [
        'session-1.json',
        'session-2.json',
        'session-3.json',
        'not-a-session.txt'
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(files);

      const sessions = await repository.listAll();

      expect(sessions).toEqual(['session-1', 'session-2', 'session-3']);
    });

    it('should return empty array if sessions directory does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const sessions = await repository.listAll();

      expect(sessions).toEqual([]);
    });
  });

  describe('findByBranch', () => {
    it('should find session by branch name', async () => {
      const sessionData = {
        id: 'test-session-123',
        workflowType: 'launch',
        branch: 'feature/test-branch',
        state: 'BRANCH_READY',
        metadata: {},
        history: [],
        active: true
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['test-session-123.json']);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(sessionData));

      const session = await repository.findByBranch('feature/test-branch');

      expect(session).toEqual(sessionData);
    });

    it('should return null if no session found for branch', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const session = await repository.findByBranch('non-existent-branch');

      expect(session).toBeNull();
    });
  });

  describe('getActiveSessions', () => {
    it('should return only active sessions', async () => {
      const activeSession = {
        id: 'active-session',
        branch: 'feature/active',
        active: true,
        workflowType: 'launch',
        state: 'BRANCH_READY',
        metadata: {},
        history: []
      };

      const inactiveSession = {
        id: 'inactive-session',
        branch: 'feature/inactive',
        active: false,
        workflowType: 'ship',
        state: 'COMPLETE',
        metadata: {},
        history: []
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['active-session.json', 'inactive-session.json']);
      (fs.readFileSync as jest.Mock)
        .mockReturnValueOnce(JSON.stringify(activeSession))
        .mockReturnValueOnce(JSON.stringify(inactiveSession));

      const sessions = await repository.getActiveSessions();

      expect(sessions).toEqual([activeSession]);
    });
  });
});