import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditEntry } from '../models/audit-entry';
import { AuditAction, AuditDetails, StateName } from '../models/types';

export interface AuditLoggerOptions {
  logDir?: string;
  maxLogSize?: number;
  maxLogFiles?: number;
  consoleOutput?: boolean;
}

export class AuditLogger {
  private logDir: string;
  private maxLogSize: number;
  private maxLogFiles: number;
  private consoleOutput: boolean;
  private currentLogFile: string;
  private entries: AuditEntry[] = [];

  constructor(options: AuditLoggerOptions = {}) {
    this.logDir = options.logDir || path.join(process.cwd(), '.hansolo', 'audit');
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB default
    this.maxLogFiles = options.maxLogFiles || 10;
    this.consoleOutput = options.consoleOutput ?? false;
    this.currentLogFile = this.getCurrentLogFileName();
  }

  private getCurrentLogFileName(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    return path.join(this.logDir, `audit-${dateStr}.log`);
  }

  public async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
      await this.loadExistingEntries();
    } catch (error) {
      console.error('Failed to initialize audit logger:', error);
    }
  }

  private async loadExistingEntries(): Promise<void> {
    try {
      const content = await fs.readFile(this.currentLogFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          this.entries.push(AuditEntry.fromJSON(json));
        } catch (e) {
          // Skip invalid lines
        }
      }
    } catch (error) {
      // File doesn't exist yet, that's okay
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error loading existing audit entries:', error);
      }
    }
  }

  public async log(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);

    if (this.consoleOutput) {
      this.logToConsole(entry);
    }

    await this.appendToFile(entry);
    await this.rotateLogsIfNeeded();
  }

  private logToConsole(entry: AuditEntry): void {
    const severity = entry.getSeverity();
    const message = entry.getFormattedMessage();

    switch (severity) {
    case 'error':
      console.error('🔴', message);
      break;
    case 'warning':
      console.warn('🟡', message);
      break;
    default:
      console.log('🟢', message);
    }
  }

  private async appendToFile(entry: AuditEntry): Promise<void> {
    try {
      const line = JSON.stringify(entry.toJSON()) + '\n';
      await fs.appendFile(this.currentLogFile, line);
    } catch (error) {
      console.error('Failed to append to audit log:', error);
    }
  }

  private async rotateLogsIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.currentLogFile);

      if (stats.size > this.maxLogSize) {
        await this.rotateLogs();
      }
    } catch (error) {
      // File doesn't exist yet, no need to rotate
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error checking log file size:', error);
      }
    }
  }

  private async rotateLogs(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFileName = path.join(
        this.logDir,
        `audit-${timestamp}.log`
      );

      await fs.rename(this.currentLogFile, rotatedFileName);

      // Clean up old log files
      await this.cleanupOldLogs();

      // Reset current log file
      this.currentLogFile = this.getCurrentLogFileName();
      this.entries = [];
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const logFiles = files
        .filter(f => f.startsWith('audit-') && f.endsWith('.log'))
        .sort()
        .reverse();

      if (logFiles.length > this.maxLogFiles) {
        const filesToDelete = logFiles.slice(this.maxLogFiles);

        for (const file of filesToDelete) {
          await fs.unlink(path.join(this.logDir, file));
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  public async logStateTransition(
    sessionId: string,
    from: StateName,
    to: StateName,
    actor: string = 'system'
  ): Promise<void> {
    const entry = AuditEntry.createForStateTransition(sessionId, from, to, actor);
    await this.log(entry);
  }

  public async logGitOperation(
    sessionId: string | undefined,
    operation: string,
    success: boolean,
    actor: string = 'system',
    errorMessage?: string
  ): Promise<void> {
    const entry = AuditEntry.createForGitOperation(
      sessionId,
      operation,
      actor,
      success,
      errorMessage
    );
    await this.log(entry);
  }

  public async logError(
    error: Error,
    sessionId?: string,
    context?: string,
    actor: string = 'system'
  ): Promise<void> {
    const entry = AuditEntry.createForError(sessionId, error, actor, context);
    await this.log(entry);
  }

  public async logCustom(options: {
    sessionId?: string;
    action: AuditAction;
    actor?: string;
    details: AuditDetails;
    result: 'success' | 'failure' | 'aborted';
    errorMessage?: string;
  }): Promise<void> {
    const entry = new AuditEntry({
      sessionId: options.sessionId,
      action: options.action,
      actor: options.actor || 'system',
      details: options.details,
      result: options.result,
      errorMessage: options.errorMessage,
    });
    await this.log(entry);
  }

  public getEntries(sessionId?: string): AuditEntry[] {
    if (sessionId) {
      return this.entries.filter(e => e.sessionId === sessionId);
    }
    return [...this.entries];
  }

  public getRecentEntries(count: number = 100): AuditEntry[] {
    return this.entries.slice(-count);
  }

  public async exportToFile(outputPath: string, sessionId?: string): Promise<void> {
    const entries = this.getEntries(sessionId);
    const content = entries
      .map(e => e.getFormattedMessage())
      .join('\n');

    await fs.writeFile(outputPath, content);
  }

  public async exportToJSON(outputPath: string, sessionId?: string): Promise<void> {
    const entries = this.getEntries(sessionId);
    const json = JSON.stringify(
      entries.map(e => e.toJSON()),
      null,
      2
    );

    await fs.writeFile(outputPath, json);
  }

  public clearMemory(): void {
    this.entries = [];
  }

  public async flush(): Promise<void> {
    // Ensure all pending writes are completed
    // This is mainly for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Singleton instance for global access
let globalLogger: AuditLogger | null = null;

export function getAuditLogger(options?: AuditLoggerOptions): AuditLogger {
  if (!globalLogger) {
    globalLogger = new AuditLogger(options);
  }
  return globalLogger;
}

export function resetAuditLogger(): void {
  globalLogger = null;
}