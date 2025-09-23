import { performance } from 'perf_hooks';
import { SessionRepository } from '../../src/services/session-repository';
import { WorkflowSession } from '../../src/models/workflow-session';
import * as fs from 'fs';
import * as path from 'path';

describe('Session Load Performance', () => {
  let sessionRepository: SessionRepository;
  const TEST_SESSIONS_DIR = '.hansolo/test-sessions';
  const SESSION_COUNT = 100; // Test with 100+ sessions

  beforeAll(async () => {
    // Create test sessions directory
    if (!fs.existsSync(TEST_SESSIONS_DIR)) {
      fs.mkdirSync(TEST_SESSIONS_DIR, { recursive: true });
    }

    // Use test directory for sessions
    sessionRepository = new SessionRepository(TEST_SESSIONS_DIR);

    // Generate test sessions
    await generateTestSessions(SESSION_COUNT);
  });

  afterAll(async () => {
    // Clean up test sessions
    if (fs.existsSync(TEST_SESSIONS_DIR)) {
      fs.rmSync(TEST_SESSIONS_DIR, { recursive: true });
    }
  });

  async function generateTestSessions(count: number): Promise<void> {
    const sessions: WorkflowSession[] = [];

    for (let i = 0; i < count; i++) {
      const session: WorkflowSession = {
        id: `test-session-${i.toString().padStart(3, '0')}`,
        workflowType: ['launch', 'ship', 'hotfix'][i % 3] as any,
        branch: `feature/test-${i}`,
        state: ['INIT', 'BRANCH_READY', 'COMPLETE'][i % 3] as any,
        metadata: {
          startTime: new Date(Date.now() - i * 3600000).toISOString(),
          lastUpdate: new Date().toISOString(),
          user: `user-${i % 10}`,
          projectPath: `/project/${i % 5}`,
          commits: Array(i % 5).fill(null).map((_, j) => ({
            hash: `hash-${i}-${j}`,
            message: `Commit ${j} for session ${i}`
          }))
        },
        history: Array(i % 10).fill(null).map((_, j) => ({
          timestamp: new Date(Date.now() - j * 60000).toISOString(),
          from: `STATE_${j}`,
          to: `STATE_${j + 1}`,
          action: `ACTION_${j}`
        })),
        active: i < 10 // First 10 sessions are active
      };

      sessions.push(session);
      await sessionRepository.save(session);
    }
  }

  describe('Session Loading Performance', () => {
    it('should list all 100+ sessions quickly', async () => {
      const start = performance.now();

      const sessions = await sessionRepository.listAll();

      const duration = performance.now() - start;

      expect(sessions.length).toBe(SESSION_COUNT);
      expect(duration).toBeLessThan(100); // Should list in under 100ms
    });

    it('should load a single session quickly', async () => {
      const start = performance.now();

      const session = await sessionRepository.load('test-session-050');

      const duration = performance.now() - start;

      expect(session).toBeDefined();
      expect(duration).toBeLessThan(20); // Single load under 20ms
    });

    it('should find session by branch quickly', async () => {
      const start = performance.now();

      const session = await sessionRepository.findByBranch('feature/test-75');

      const duration = performance.now() - start;

      expect(session).toBeDefined();
      expect(session?.id).toBe('test-session-075');
      expect(duration).toBeLessThan(50); // Search under 50ms
    });

    it('should get active sessions quickly', async () => {
      const start = performance.now();

      const activeSessions = await sessionRepository.getActiveSessions();

      const duration = performance.now() - start;

      expect(activeSessions.length).toBe(10); // First 10 are active
      expect(duration).toBeLessThan(100); // Filter under 100ms
    });
  });

  describe('Concurrent Session Operations', () => {
    it('should handle 20 concurrent reads', async () => {
      const readOperations = Array(20).fill(null).map((_, i) =>
        sessionRepository.load(`test-session-${i.toString().padStart(3, '0')}`)
      );

      const start = performance.now();

      const results = await Promise.all(readOperations);

      const duration = performance.now() - start;

      expect(results.every(r => r !== null)).toBe(true);
      expect(duration).toBeLessThan(200); // Concurrent reads under 200ms
    });

    it('should handle mixed read/write operations', async () => {
      const operations = [
        ...Array(5).fill(null).map((_, i) =>
          sessionRepository.load(`test-session-${i.toString().padStart(3, '0')}`)
        ),
        ...Array(5).fill(null).map((_, i) =>
          sessionRepository.save({
            id: `concurrent-test-${i}`,
            workflowType: 'launch',
            branch: `feature/concurrent-${i}`,
            state: 'INIT',
            metadata: {},
            history: [],
            active: true
          } as WorkflowSession)
        )
      ];

      const start = performance.now();

      await Promise.all(operations);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(150); // Mixed ops under 150ms
    });
  });

  describe('Session Search Performance', () => {
    it('should search sessions by state efficiently', async () => {
      const start = performance.now();

      const completeSessions = await sessionRepository.findByState('COMPLETE');

      const duration = performance.now() - start;

      expect(completeSessions.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it('should search sessions by workflow type efficiently', async () => {
      const start = performance.now();

      const launchSessions = await sessionRepository.findByWorkflowType('launch');

      const duration = performance.now() - start;

      expect(launchSessions.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100);
    });

    it('should search sessions by date range efficiently', async () => {
      const start = performance.now();

      const recentSessions = await sessionRepository.findByDateRange(
        new Date(Date.now() - 86400000), // Last 24 hours
        new Date()
      );

      const duration = performance.now() - start;

      expect(recentSessions.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(150);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory when loading many sessions', async () => {
      const memoryBefore = process.memoryUsage().heapUsed;

      // Load all sessions multiple times
      for (let i = 0; i < 10; i++) {
        const sessions = await sessionRepository.listAll();
        for (const sessionId of sessions) {
          await sessionRepository.load(sessionId);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryIncrease = memoryAfter - memoryBefore;

      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Session Cleanup Performance', () => {
    it('should clean old sessions efficiently', async () => {
      // Create some old sessions
      const oldDate = new Date(Date.now() - 31 * 86400000); // 31 days old
      for (let i = 0; i < 20; i++) {
        await sessionRepository.save({
          id: `old-session-${i}`,
          workflowType: 'ship',
          branch: `feature/old-${i}`,
          state: 'COMPLETE',
          metadata: {
            startTime: oldDate.toISOString(),
            lastUpdate: oldDate.toISOString()
          },
          history: [],
          active: false
        } as WorkflowSession);
      }

      const start = performance.now();

      const cleaned = await sessionRepository.cleanupOldSessions(30);

      const duration = performance.now() - start;

      expect(cleaned).toBeGreaterThanOrEqual(20);
      expect(duration).toBeLessThan(200); // Cleanup under 200ms
    });

    it('should archive sessions efficiently', async () => {
      const sessionsToArchive = Array(10).fill(null).map((_, i) => ({
        id: `archive-session-${i}`,
        workflowType: 'hotfix',
        branch: `hotfix/archive-${i}`,
        state: 'COMPLETE',
        metadata: {},
        history: [],
        active: false
      } as WorkflowSession));

      // Save sessions
      for (const session of sessionsToArchive) {
        await sessionRepository.save(session);
      }

      const start = performance.now();

      const archivePath = path.join(TEST_SESSIONS_DIR, 'archive.json');
      await sessionRepository.archiveSessions(
        sessionsToArchive.map(s => s.id),
        archivePath
      );

      const duration = performance.now() - start;

      expect(fs.existsSync(archivePath)).toBe(true);
      expect(duration).toBeLessThan(100); // Archive under 100ms
    });
  });

  describe('Session Statistics Performance', () => {
    it('should calculate session statistics quickly', async () => {
      const start = performance.now();

      const stats = await sessionRepository.getStatistics();

      const duration = performance.now() - start;

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('byWorkflowType');
      expect(stats).toHaveProperty('byState');
      expect(duration).toBeLessThan(150); // Stats under 150ms
    });

    it('should generate session report quickly', async () => {
      const start = performance.now();

      const report = await sessionRepository.generateReport({
        includeHistory: true,
        includMetadata: true
      });

      const duration = performance.now() - start;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(200); // Report under 200ms
    });
  });

  describe('Scalability Tests', () => {
    it('should handle 500+ sessions', async () => {
      // Generate additional sessions
      await generateTestSessions(400); // Total 500

      const start = performance.now();

      const sessions = await sessionRepository.listAll();

      const duration = performance.now() - start;

      expect(sessions.length).toBeGreaterThanOrEqual(500);
      expect(duration).toBeLessThan(500); // Still under 500ms for 500 sessions
    });

    it('should maintain performance with large session files', async () => {
      // Create a session with large history
      const largeSession: WorkflowSession = {
        id: 'large-session',
        workflowType: 'ship',
        branch: 'feature/large',
        state: 'COMPLETE',
        metadata: {
          commits: Array(100).fill(null).map((_, i) => ({
            hash: `hash-${i}`,
            message: `Commit message ${i}`.repeat(10)
          }))
        },
        history: Array(1000).fill(null).map((_, i) => ({
          timestamp: new Date().toISOString(),
          from: `STATE_${i}`,
          to: `STATE_${i + 1}`,
          action: `ACTION_${i}`,
          details: `Details for action ${i}`.repeat(10)
        })),
        active: false
      };

      await sessionRepository.save(largeSession);

      const start = performance.now();

      const loaded = await sessionRepository.load('large-session');

      const duration = performance.now() - start;

      expect(loaded).toBeDefined();
      expect(loaded?.history.length).toBe(1000);
      expect(duration).toBeLessThan(50); // Large file still loads quickly
    });
  });
});