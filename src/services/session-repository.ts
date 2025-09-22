import * as fs from 'fs/promises';
import * as path from 'path';
import { WorkflowSession } from '../models/workflow-session';
import { AuditEntry } from '../models/audit-entry';

export class SessionRepository {
  private sessionPath: string;
  private lockPath: string;

  constructor(basePath: string = '.hansolo') {
    this.sessionPath = path.join(basePath, 'sessions');
    this.lockPath = path.join(basePath, 'locks');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.sessionPath, { recursive: true });
    await fs.mkdir(this.lockPath, { recursive: true });
  }

  async createSession(session: WorkflowSession): Promise<WorkflowSession> {
    await this.initialize();

    const sessionFile = path.join(this.sessionPath, `${session.id}.json`);
    const lockFile = path.join(this.lockPath, `${session.id}.lock`);

    // Check if session already exists
    try {
      await fs.access(sessionFile);
      throw new Error(`Session ${session.id} already exists`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Write session atomically
    const tempFile = `${sessionFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(session.toJSON(), null, 2));
    await fs.rename(tempFile, sessionFile);

    // Create lock file with PID
    await fs.writeFile(lockFile, process.pid.toString());

    // Update index
    await this.updateIndex(session);

    // Create audit entry
    const auditEntry = new AuditEntry({
      sessionId: session.id,
      action: 'session_created',
      actor: process.env['USER'] || 'unknown',
      details: {
        command: 'create_session',
        gitOperation: `branch: ${session.branchName}`,
      },
      result: 'success',
    });
    await this.appendAudit(auditEntry);

    return session;
  }

  async getSession(sessionId: string): Promise<WorkflowSession | null> {
    const sessionFile = path.join(this.sessionPath, `${sessionId}.json`);

    try {
      const data = await fs.readFile(sessionFile, 'utf-8');
      const json = JSON.parse(data);
      return WorkflowSession.fromJSON(json);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async getSessionByBranch(branchName: string): Promise<WorkflowSession | null> {
    const index = await this.readIndex();
    const sessionId = index.branchMap?.[branchName];

    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }

  async updateSession(sessionId: string, updates: Partial<WorkflowSession>): Promise<WorkflowSession> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Merge updates
    Object.assign(session, updates);
    session.updatedAt = new Date().toISOString();

    // Write atomically
    const sessionFile = path.join(this.sessionPath, `${sessionId}.json`);
    const tempFile = `${sessionFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(session.toJSON(), null, 2));
    await fs.rename(tempFile, sessionFile);

    // Update index
    await this.updateIndex(session);

    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessionFile = path.join(this.sessionPath, `${sessionId}.json`);
    const lockFile = path.join(this.lockPath, `${sessionId}.lock`);

    // Get session for audit
    const session = await this.getSession(sessionId);
    if (!session) {
      return; // Already deleted
    }

    // Delete files
    await fs.unlink(sessionFile).catch(() => { /* ignore */ });
    await fs.unlink(lockFile).catch(() => { /* ignore */ });

    // Update index
    await this.removeFromIndex(sessionId, session.branchName);

    // Create audit entry
    const auditEntry = new AuditEntry({
      sessionId,
      action: 'session_completed',
      actor: process.env['USER'] || 'unknown',
      details: {
        command: 'delete_session',
      },
      result: 'success',
    });
    await this.appendAudit(auditEntry);
  }

  async listSessions(includeExpired: boolean = false): Promise<WorkflowSession[]> {
    await this.initialize();

    const files = await fs.readdir(this.sessionPath);
    const sessions: WorkflowSession[] = [];

    for (const file of files) {
      if (!file.endsWith('.json') || file === 'index.json') {
        continue;
      }

      const sessionId = path.basename(file, '.json');
      const session = await this.getSession(sessionId);

      if (session && (includeExpired || !session.isExpired())) {
        sessions.push(session);
      }
    }

    // Sort by updatedAt descending
    return sessions.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // Alias for listSessions to match MCP tool expectations
  async getAllSessions(): Promise<WorkflowSession[]> {
    return this.listSessions(true);
  }

  // Alias for createSession to match MCP tool expectations
  async saveSession(session: WorkflowSession): Promise<WorkflowSession> {
    return this.createSession(session);
  }

  // Add save method for test compatibility
  async save(session: WorkflowSession): Promise<void> {
    await this.updateSession(session);
  }

  // Add findById method for test compatibility
  async findById(sessionId: string): Promise<WorkflowSession | null> {
    return this.getSession(sessionId);
  }

  // Add findByBranch method for test compatibility
  async findByBranch(branchName: string): Promise<WorkflowSession | null> {
    const sessions = await this.listSessions();
    return sessions.find(s => s.branchName === branchName) || null;
  }

  // Add setCurrentSession method for test compatibility
  async setCurrentSession(sessionId: string): Promise<void> {
    const currentFile = path.join(this.sessionPath, 'current.json');
    await fs.writeFile(currentFile, JSON.stringify({ sessionId }));
  }

  // Add getCurrentSession method for test compatibility
  async getCurrentSession(): Promise<WorkflowSession | null> {
    try {
      const currentFile = path.join(this.sessionPath, 'current.json');
      const data = await fs.readFile(currentFile, 'utf-8');
      const { sessionId } = JSON.parse(data);
      return this.getSession(sessionId);
    } catch {
      return null;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    const sessions = await this.listSessions(true);
    let cleaned = 0;

    for (const session of sessions) {
      if (session.isExpired()) {
        await this.deleteSession(session.id);
        cleaned++;
      }
    }

    return cleaned;
  }

  async acquireLock(sessionId: string): Promise<boolean> {
    const lockFile = path.join(this.lockPath, `${sessionId}.lock`);

    try {
      // Check if lock exists
      const existingPid = await fs.readFile(lockFile, 'utf-8');

      // Check if process is still running
      try {
        process.kill(parseInt(existingPid), 0);
        return false; // Process still running, lock is held
      } catch {
        // Process not running, can acquire lock
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Acquire lock
    await fs.writeFile(lockFile, process.pid.toString());
    return true;
  }

  async releaseLock(sessionId: string): Promise<void> {
    const lockFile = path.join(this.lockPath, `${sessionId}.lock`);
    await fs.unlink(lockFile).catch(() => { /* ignore */ });
  }

  async isLocked(sessionId: string): Promise<boolean> {
    const lockFile = path.join(this.lockPath, `${sessionId}.lock`);
    try {
      await fs.access(lockFile);
      return true;
    } catch {
      return false;
    }
  }

  async cleanupOrphanedLocks(): Promise<number> {
    await this.initialize();
    const lockFiles = await fs.readdir(this.lockPath);
    let cleaned = 0;

    for (const file of lockFiles) {
      if (file.endsWith('.lock')) {
        const lockPath = path.join(this.lockPath, file);
        const stat = await fs.stat(lockPath);
        const ageMs = Date.now() - stat.mtimeMs;

        // Remove locks older than 1 hour
        if (ageMs > 60 * 60 * 1000) {
          await fs.unlink(lockPath).catch(() => { /* ignore error */ });
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  private async readIndex(): Promise<any> {
    const indexFile = path.join(this.sessionPath, 'index.json');

    try {
      const data = await fs.readFile(indexFile, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { sessions: [], branchMap: {} };
      }
      throw error;
    }
  }

  private async updateIndex(session: WorkflowSession): Promise<void> {
    const index = await this.readIndex();

    // Update sessions list
    if (!index.sessions) {
      index.sessions = [];
    }
    const existingIndex = index.sessions.findIndex((s: any) => s.id === session.id);
    const sessionSummary = {
      id: session.id,
      branchName: session.branchName,
      workflowType: session.workflowType,
      currentState: session.currentState,
      updatedAt: session.updatedAt,
    };

    if (existingIndex >= 0) {
      index.sessions[existingIndex] = sessionSummary;
    } else {
      index.sessions.push(sessionSummary);
    }

    // Update branch map
    if (!index.branchMap) {
      index.branchMap = {};
    }
    index.branchMap[session.branchName] = session.id;

    // Write index
    const indexFile = path.join(this.sessionPath, 'index.json');
    const tempFile = `${indexFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(index, null, 2));
    await fs.rename(tempFile, indexFile);
  }

  private async removeFromIndex(sessionId: string, branchName: string): Promise<void> {
    const index = await this.readIndex();

    // Remove from sessions list
    if (index.sessions) {
      index.sessions = index.sessions.filter((s: any) => s.id !== sessionId);
    }

    // Remove from branch map
    if (index.branchMap && index.branchMap[branchName] === sessionId) {
      delete index.branchMap[branchName];
    }

    // Write index
    const indexFile = path.join(this.sessionPath, 'index.json');
    const tempFile = `${indexFile}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(index, null, 2));
    await fs.rename(tempFile, indexFile);
  }

  private async appendAudit(entry: AuditEntry): Promise<void> {
    const auditPath = path.join(path.dirname(this.sessionPath), 'audit');
    await fs.mkdir(auditPath, { recursive: true });

    const date = new Date();
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const day = String(date.getDate()).padStart(2, '0');

    const monthDir = path.join(auditPath, yearMonth);
    await fs.mkdir(monthDir, { recursive: true });

    const auditFile = path.join(monthDir, `${day}.jsonl`);
    const line = JSON.stringify(entry.toJSON()) + '\n';

    await fs.appendFile(auditFile, line);
  }
}