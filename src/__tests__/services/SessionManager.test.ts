import { SessionManager } from '../../services/SessionManager';
import { InstallationContext } from '../../models/InstallationContext';
import fs from 'fs';

jest.mock('fs');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['HOME'] = '/home/user';

    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined as any);

    sessionManager = new SessionManager();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const context = new InstallationContext();
      context.installationType = 'global';

      mockFs.writeFileSync.mockImplementation(() => {});

      const session = await sessionManager.createSession(context);

      expect(session).toMatchObject({
        status: 'in_progress',
        currentStep: 0,
        completedSteps: [],
        context: context,
        data: {},
      });
      expect(session.id).toBeDefined();
      expect(session.startedAt).toBeDefined();
    });

    it('should save session after creation', async () => {
      const context = new InstallationContext();

      mockFs.writeFileSync.mockImplementation(() => {});

      await sessionManager.createSession(context);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('loadSession', () => {
    it('should load existing session', async () => {
      const context = new InstallationContext();
      const sessionData = {
        id: 'test-id',
        startedAt: new Date().toISOString(),
        status: 'in_progress',
        currentStep: 1,
        completedSteps: ['step1'],
        context: context,
        data: { test: 'data' },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));

      const session = await sessionManager.loadSession();

      // Check the main properties
      expect(session).toBeTruthy();
      expect(session?.id).toBe('test-id');
      expect(session?.status).toBe('in_progress');
      expect(session?.currentStep).toBe(1);
      expect(session?.completedSteps).toEqual(['step1']);
      expect(session?.data).toEqual({ test: 'data' });
    });

    it('should return null if no session file exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const session = await sessionManager.loadSession();

      expect(session).toBeNull();
    });

    it('should delete and return null for sessions older than 24 hours', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2 days old

      const sessionData = {
        id: 'old-session',
        startedAt: oldDate.toISOString(),
        status: 'in_progress',
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));
      mockFs.unlinkSync.mockImplementation(() => {});

      const session = await sessionManager.loadSession();

      expect(session).toBeNull();
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should handle corrupted session files gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const session = await sessionManager.loadSession();

      expect(session).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('should save session to file', async () => {
      const session = {
        id: 'test-id',
        startedAt: new Date().toISOString(),
        status: 'in_progress' as const,
        currentStep: 0,
        completedSteps: [],
        context: new InstallationContext(),
        data: {},
      };

      mockFs.writeFileSync.mockImplementation(() => {});

      await sessionManager.saveSession(session);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('installer.json'),
        expect.stringContaining('test-id'),
        'utf8'
      );
    });

    it('should throw error if save fails', async () => {
      const session = {
        id: 'test-id',
        startedAt: new Date().toISOString(),
        status: 'in_progress' as const,
        currentStep: 0,
        completedSteps: [],
        context: new InstallationContext(),
        data: {},
      };

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(sessionManager.saveSession(session)).rejects.toThrow(
        'Could not save installation session'
      );
    });
  });

  describe('clearSession', () => {
    it('should delete session file if exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {});

      await sessionManager.clearSession();

      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should handle non-existent file gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(sessionManager.clearSession()).resolves.not.toThrow();
    });
  });

  describe('resumeSession', () => {
    it('should resume session with matching ID', async () => {
      const sessionData = {
        id: 'test-id',
        startedAt: new Date().toISOString(),
        status: 'in_progress',
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));

      const session = await sessionManager.resumeSession('test-id');

      expect(session).toMatchObject(sessionData);
    });

    it('should return null for non-matching ID', async () => {
      const sessionData = {
        id: 'other-id',
        startedAt: new Date().toISOString(),
        status: 'in_progress',
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));

      const session = await sessionManager.resumeSession('test-id');

      expect(session).toBeNull();
    });
  });

  describe('getSessionStatus', () => {
    it('should return session status', async () => {
      const sessionData = {
        id: 'test-id',
        startedAt: new Date().toISOString(),
        status: 'complete' as const,
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));

      const status = await sessionManager.getSessionStatus();

      expect(status).toBe('complete');
    });

    it('should return not_found if no session exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const status = await sessionManager.getSessionStatus();

      expect(status).toBe('not_found');
    });

    it('should handle aborted status', async () => {
      const sessionData = {
        id: 'test-id',
        startedAt: new Date().toISOString(),
        status: 'aborted' as const,
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));

      const status = await sessionManager.getSessionStatus();

      expect(status).toBe('aborted');
    });
  });

  describe('listSessions', () => {
    it('should list all session files', async () => {
      mockFs.readdirSync.mockReturnValue(['session1.json', 'session2.json', 'other.txt'] as any);

      const sessions = await sessionManager.listSessions();

      expect(sessions).toEqual(['session1', 'session2']);
    });

    it('should return empty array if directory does not exist', async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory not found');
      });

      const sessions = await sessionManager.listSessions();

      expect(sessions).toEqual([]);
    });
  });
});