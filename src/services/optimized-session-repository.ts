import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkflowSession } from '../models/workflow-session';
import { LRUCache } from '../utils/cache';
import { ParallelExecutor } from '../utils/parallel-executor';
import { globalMonitor } from '../utils/performance-monitor';

export interface SessionIndex {
  sessions: Array<{
    id: string;
    branchName: string;
    workflowType: string;
    currentState: string;
    startedAt: Date;
    lastModified: Date;
  }>;
  version: string;
}

export class OptimizedSessionRepository {
  private basePath: string;
  private sessionCache: LRUCache<WorkflowSession>;
  private indexCache?: SessionIndex;
  private indexDirty: boolean = false;
  private parallelExecutor: ParallelExecutor;
  private readonly INDEX_FILE = 'session-index.json';
  private readonly SESSION_DIR = 'sessions';

  constructor(basePath: string = '.devsolo') {
    this.basePath = basePath;
    this.sessionCache = new LRUCache<WorkflowSession>(20, 300000); // 5 min TTL
    this.parallelExecutor = new ParallelExecutor(4);
  }

  async initialize(): Promise<void> {
    await globalMonitor.measure('session_repo_init', async () => {
      await this.ensureDirectories();
      await this.loadIndex();
      await this.cleanupOrphanedSessions();
    });
  }

  private async ensureDirectories(): Promise<void> {
    const sessionDir = path.join(this.basePath, this.SESSION_DIR);
    await fs.mkdir(sessionDir, { recursive: true });
  }

  private async loadIndex(): Promise<SessionIndex> {
    if (this.indexCache && !this.indexDirty) {
      return this.indexCache;
    }

    const indexPath = path.join(this.basePath, this.INDEX_FILE);
    
    try {
      const data = await fs.readFile(indexPath, 'utf-8');
      this.indexCache = JSON.parse(data);
      this.indexDirty = false;
      return this.indexCache!;
    } catch (error) {
      // Create new index if not exists
      this.indexCache = {
        sessions: [],
        version: '1.0.0',
      };
      await this.saveIndex();
      return this.indexCache;
    }
  }

  private async saveIndex(): Promise<void> {
    if (!this.indexCache) {
      return;
    }

    const indexPath = path.join(this.basePath, this.INDEX_FILE);
    const tempPath = `${indexPath}.tmp`;

    // Write to temp file first for atomicity
    await fs.writeFile(
      tempPath,
      JSON.stringify(this.indexCache, null, 2)
    );
    
    // Atomic rename
    await fs.rename(tempPath, indexPath);
    this.indexDirty = false;
  }

  async save(session: WorkflowSession): Promise<void> {
    await globalMonitor.measure('session_save', async () => {
      // Update cache
      this.sessionCache.set(session.id, session);

      // Save to disk
      const sessionPath = this.getSessionPath(session.id);
      const tempPath = `${sessionPath}.tmp`;

      await fs.writeFile(
        tempPath,
        JSON.stringify(session, null, 2)
      );
      await fs.rename(tempPath, sessionPath);

      // Update index
      await this.updateIndex(session);
    });
  }

  async saveMultiple(sessions: WorkflowSession[]): Promise<void> {
    await globalMonitor.measure('session_save_multiple', async () => {
      // Parallel save operations
      await this.parallelExecutor.map(
        sessions,
        async (session) => {
          this.sessionCache.set(session.id, session);
          
          const sessionPath = this.getSessionPath(session.id);
          const tempPath = `${sessionPath}.tmp`;

          await fs.writeFile(
            tempPath,
            JSON.stringify(session, null, 2)
          );
          await fs.rename(tempPath, sessionPath);
        },
        { concurrency: 4 }
      );

      // Batch update index
      for (const session of sessions) {
        await this.updateIndex(session, false); // Don't save yet
      }
      await this.saveIndex();
    });
  }

  async load(sessionId: string): Promise<WorkflowSession | null> {
    return globalMonitor.measure('session_load', async () => {
      // Check cache first
      const cached = this.sessionCache.get(sessionId);
      if (cached) {
        return cached;
      }

      // Load from disk
      const sessionPath = this.getSessionPath(sessionId);
      
      try {
        const data = await fs.readFile(sessionPath, 'utf-8');
        const session = JSON.parse(data) as WorkflowSession;
        
        // Session dates are already strings in ISO format

        // Update cache
        this.sessionCache.set(sessionId, session);
        
        return session;
      } catch (error) {
        return null;
      }
    });
  }

  async loadByBranch(branchName: string): Promise<WorkflowSession | null> {
    return globalMonitor.measure('session_load_by_branch', async () => {
      const index = await this.loadIndex();
      const entry = index.sessions.find(s => s.branchName === branchName);
      
      if (!entry) {
        return null;
      }

      return this.load(entry.id);
    });
  }

  async loadAll(): Promise<WorkflowSession[]> {
    return globalMonitor.measure('session_load_all', async () => {
      const index = await this.loadIndex();
      
      // Load sessions in parallel
      const results = await this.parallelExecutor.map(
        index.sessions,
        async (entry) => this.load(entry.id),
        { concurrency: 8 }
      );

      return results.filter((s): s is WorkflowSession => s !== null);
    });
  }

  async delete(sessionId: string): Promise<void> {
    await globalMonitor.measure('session_delete', async () => {
      // Remove from cache
      this.sessionCache.delete(sessionId);

      // Delete file
      const sessionPath = this.getSessionPath(sessionId);
      try {
        await fs.unlink(sessionPath);
      } catch (error) {
        // Ignore if file doesn't exist
      }

      // Update index
      await this.removeFromIndex(sessionId);
    });
  }

  async exists(sessionId: string): Promise<boolean> {
    // Check cache first
    if (this.sessionCache.has(sessionId)) {
      return true;
    }

    // Check index
    const index = await this.loadIndex();
    return index.sessions.some(s => s.id === sessionId);
  }

  async getActiveSessions(): Promise<WorkflowSession[]> {
    return globalMonitor.measure('session_get_active', async () => {
      const allSessions = await this.loadAll();
      return allSessions.filter(s => 
        s.currentState !== 'COMPLETE' && 
        s.currentState !== 'ABORTED'
      );
    });
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    return globalMonitor.measure('session_cleanup', async () => {
      const index = await this.loadIndex();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const toDelete = index.sessions.filter(s => {
        const sessionDate = new Date(s.lastModified);
        return sessionDate < cutoffDate;
      });

      // Delete in parallel
      await this.parallelExecutor.map(
        toDelete,
        async (entry) => this.delete(entry.id),
        { concurrency: 4 }
      );

      return toDelete.length;
    });
  }

  private async updateIndex(
    session: WorkflowSession,
    save: boolean = true
  ): Promise<void> {
    const index = await this.loadIndex();
    
    const existingIndex = index.sessions.findIndex(s => s.id === session.id);
    const indexEntry = {
      id: session.id,
      branchName: session.branchName,
      workflowType: session.workflowType,
      currentState: session.currentState,
      startedAt: new Date(session.createdAt),
      lastModified: new Date(),
    };

    if (existingIndex >= 0) {
      index.sessions[existingIndex] = indexEntry;
    } else {
      index.sessions.push(indexEntry);
    }

    this.indexDirty = true;

    if (save) {
      await this.saveIndex();
    }
  }

  private async removeFromIndex(sessionId: string): Promise<void> {
    const index = await this.loadIndex();
    index.sessions = index.sessions.filter(s => s.id !== sessionId);
    this.indexDirty = true;
    await this.saveIndex();
  }

  private async cleanupOrphanedSessions(): Promise<void> {
    const index = await this.loadIndex();
    const sessionDir = path.join(this.basePath, this.SESSION_DIR);
    
    try {
      const files = await fs.readdir(sessionDir);
      const orphaned = files.filter(file => {
        const id = file.replace('.json', '');
        return !index.sessions.some(s => s.id === id);
      });

      // Delete orphaned files
      await this.parallelExecutor.map(
        orphaned,
        async (file) => {
          const filePath = path.join(sessionDir, file);
          await fs.unlink(filePath);
        },
        { concurrency: 4 }
      );
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.basePath, this.SESSION_DIR, `${sessionId}.json`);
  }

  async getStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    cacheHitRate: number;
    averageLoadTime: number;
  }> {
    const index = await this.loadIndex();
    const activeSessions = await this.getActiveSessions();
    const perfStats = globalMonitor.getStats();

    return {
      totalSessions: index.sessions.length,
      activeSessions: activeSessions.length,
      cacheHitRate: 0, // Would need to track this
      averageLoadTime: perfStats.operationBreakdown['session_load']?.avgDuration || 0,
    };
  }
}