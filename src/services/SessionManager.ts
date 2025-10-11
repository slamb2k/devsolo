import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { InstallerSession } from '../models/InstallerSession';
import { InstallationContext } from '../models/InstallationContext';

export class SessionManager {
  private sessionDir: string;
  private sessionFile: string;

  constructor() {
    const home = process.env['HOME'] || process.env['USERPROFILE'] || '';
    this.sessionDir = path.join(home, '.devsolo', 'sessions');
    this.sessionFile = path.join(this.sessionDir, 'installer.json');

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  async createSession(context: InstallationContext): Promise<InstallerSession> {
    const session: InstallerSession = {
      id: this.generateSessionId(),
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      currentStep: 0,
      completedSteps: [],
      context: context,
      data: {},
    };

    await this.saveSession(session);
    return session;
  }

  async loadSession(): Promise<InstallerSession | null> {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        return null;
      }

      const content = fs.readFileSync(this.sessionFile, 'utf8');
      const session = JSON.parse(content) as InstallerSession;

      // Check if session is too old (more than 24 hours)
      const startTime = new Date(session.startedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        // Session is too old, delete it
        fs.unlinkSync(this.sessionFile);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  async saveSession(session: InstallerSession): Promise<void> {
    try {
      const content = JSON.stringify(session, null, 2);
      fs.writeFileSync(this.sessionFile, content, 'utf8');
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error('Could not save installation session');
    }
  }

  async clearSession(): Promise<void> {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  async resumeSession(sessionId: string): Promise<InstallerSession | null> {
    const session = await this.loadSession();
    if (session && session.id === sessionId) {
      return session;
    }
    return null;
  }

  private generateSessionId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async listSessions(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.sessionDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    } catch {
      return [];
    }
  }

  async getSessionStatus(sessionId?: string): Promise<'complete' | 'in_progress' | 'not_found' | 'aborted'> {
    const session = sessionId
      ? await this.resumeSession(sessionId)
      : await this.loadSession();

    if (!session) {
      return 'not_found';
    }

    return session.status === 'aborted' ? 'aborted' : session.status as 'complete' | 'in_progress';
  }
}