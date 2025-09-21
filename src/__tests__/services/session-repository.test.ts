import { SessionRepository } from '../../services/session-repository';
import { WorkflowSession } from '../../models/workflow-session';
import * as fs from 'fs/promises';
import * as path from 'path';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { rimraf } from 'rimraf';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = mkdtempSync(path.join(tmpdir(), 'hansolo-test-'));
    repository = new SessionRepository(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rimraf(tempDir);
  });

  describe('initialization', () => {
    it('should create repository directory if it does not exist', async () => {
      const newPath = path.join(tempDir, 'new-repo');
      const newRepo = new SessionRepository(newPath);

      // Trigger directory creation
      await newRepo.listSessions();

      const dirExists = await fs.stat(path.join(newPath, 'sessions'))
        .then(() => true)
        .catch(() => false);

      expect(dirExists).toBe(true);
    });
  });

  describe('session management', () => {
    it('should create a new session', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      await repository.createSession(session);

      const retrieved = await repository.getSession(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
      expect(retrieved?.branchName).toBe('feature/test');
    });

    it('should update an existing session', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      await repository.createSession(session);

      // Update session state
      session.transitionTo('BRANCH_READY');
      await repository.updateSession(session.id, session);

      const retrieved = await repository.getSession(session.id);
      expect(retrieved?.currentState).toBe('BRANCH_READY');
      expect(retrieved?.stateHistory).toHaveLength(1);
    });

    it('should delete a session', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      await repository.createSession(session);
      await repository.deleteSession(session.id);

      const retrieved = await repository.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should list all sessions', async () => {
      const session1 = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test1',
      });

      const session2 = new WorkflowSession({
        workflowType: 'hotfix',
        branchName: 'hotfix/bug',
      });

      await repository.createSession(session1);
      await repository.createSession(session2);

      const sessions = await repository.listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.branchName)).toContain('feature/test1');
      expect(sessions.map(s => s.branchName)).toContain('hotfix/bug');
    });

    it('should filter active sessions', async () => {
      const activeSession = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/active',
      });

      const completedSession = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/completed',
      });
      completedSession.transitionTo('COMPLETE');

      await repository.createSession(activeSession);
      await repository.createSession(completedSession);

      const activeSessions = await repository.listSessions(false); // Only active
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].branchName).toBe('feature/active');
    });

    it('should get session by branch name', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/unique-branch',
      });

      await repository.createSession(session);

      const retrieved = await repository.getSessionByBranch('feature/unique-branch');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });
  });

  describe('session locking', () => {
    it('should acquire lock for session', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      await repository.createSession(session);

      const locked = await repository.acquireLock(session.id);
      expect(locked).toBe(true);

      // Should fail to acquire lock again
      const lockedAgain = await repository.acquireLock(session.id);
      expect(lockedAgain).toBe(false);
    });

    it('should release lock for session', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      await repository.createSession(session);
      await repository.acquireLock(session.id);
      await repository.releaseLock(session.id);

      // Should be able to acquire lock again
      const locked = await repository.acquireLock(session.id);
      expect(locked).toBe(true);
    });

    it('should check if session is locked', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      await repository.createSession(session);

      expect(await repository.isLocked(session.id)).toBe(false);

      await repository.acquireLock(session.id);
      expect(await repository.isLocked(session.id)).toBe(true);

      await repository.releaseLock(session.id);
      expect(await repository.isLocked(session.id)).toBe(false);
    });
  });

  describe('cleanup operations', () => {
    it('should clean up expired sessions', async () => {
      const activeSession = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/active',
      });

      const expiredSession = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/expired',
      });

      // Mock expired date
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      expiredSession.createdAt = oldDate.toISOString();

      await repository.createSession(activeSession);
      await repository.createSession(expiredSession);

      const cleaned = await repository.cleanupExpiredSessions();
      expect(cleaned).toBe(1);

      const sessions = await repository.listSessions(true);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].branchName).toBe('feature/active');
    });

    it('should clean up orphaned locks', async () => {
      const session = new WorkflowSession({
        workflowType: 'launch',
        branchName: 'feature/test',
      });

      await repository.createSession(session);
      await repository.acquireLock(session.id);

      // Delete session but leave lock
      await repository.deleteSession(session.id);

      // Cleanup should remove orphaned lock
      await repository.cleanupOrphanedLocks();

      // Verify lock file doesn't exist
      const lockPath = path.join(tempDir, 'sessions', `${session.id}.lock`);
      const lockExists = await fs.stat(lockPath)
        .then(() => true)
        .catch(() => false);

      expect(lockExists).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent session gracefully', async () => {
      const session = await repository.getSession('non-existent-id');
      expect(session).toBeNull();
    });

    it('should handle corrupted session file', async () => {
      const sessionId = 'corrupted-session';
      const sessionPath = path.join(tempDir, 'sessions', `${sessionId}.json`);

      // Create corrupted file
      await fs.mkdir(path.join(tempDir, 'sessions'), { recursive: true });
      await fs.writeFile(sessionPath, 'invalid json content');

      const session = await repository.getSession(sessionId);
      expect(session).toBeNull();
    });
  });
});