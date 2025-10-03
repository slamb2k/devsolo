import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LoggerConfig {
  level: LogLevel;
  logFile?: string;
  includeTimestamp?: boolean;
  includeLevel?: boolean;
}

/**
 * Structured logger with configurable log levels
 * Can be enabled via config or DEBUG environment variable
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logFilePath?: string;

  private constructor(config?: Partial<LoggerConfig>) {
    // Default configuration
    this.config = {
      level: this.getDefaultLogLevel(),
      includeTimestamp: true,
      includeLevel: true,
      ...config,
    };

    if (this.config.logFile) {
      this.logFilePath = path.resolve(this.config.logFile);
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    } else if (config) {
      // Update config if provided
      Logger.instance.config = { ...Logger.instance.config, ...config };
    }
    return Logger.instance;
  }

  /**
   * Determine default log level from environment
   */
  private getDefaultLogLevel(): LogLevel {
    const debug = process.env['DEBUG'];
    const logLevel = process.env['LOG_LEVEL'];

    if (debug === 'true' || debug === '1') {
      return LogLevel.DEBUG;
    }

    if (logLevel) {
      const level = logLevel.toUpperCase();
      return LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO;
    }

    return LogLevel.INFO;
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.logFile) {
      this.logFilePath = path.resolve(config.logFile);
    }
  }

  /**
   * Format log message with timestamp and level
   */
  private formatMessage(level: string, message: string, context?: string): string {
    const parts: string[] = [];

    if (this.config.includeTimestamp) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    if (this.config.includeLevel) {
      parts.push(`[${level}]`);
    }

    if (context) {
      parts.push(`[${context}]`);
    }

    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Write to log file if configured
   */
  private writeToFile(message: string): void {
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, message + '\n');
      } catch (error) {
        // Silently fail to avoid infinite loops
      }
    }
  }

  /**
   * Log at specified level
   */
  private log(level: LogLevel, levelName: string, message: string, context?: string): void {
    if (this.config.level > level) {
      return; // Skip if below configured level
    }

    const formatted = this.formatMessage(levelName, message, context);

    // Write to console
    if (level >= LogLevel.ERROR) {
      console.error(formatted);
    } else if (level >= LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Write to file if configured
    this.writeToFile(formatted);
  }

  /**
   * Debug level logging (only shown when debug mode enabled)
   */
  debug(message: string, context?: string): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: string): void {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: string): void {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: string, error?: Error): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context);
    if (error && this.config.level <= LogLevel.DEBUG) {
      console.error(error.stack);
      if (this.logFilePath) {
        this.writeToFile(error.stack ?? '');
      }
    }
  }

  /**
   * Check if debug logging is enabled
   */
  isDebugEnabled(): boolean {
    return this.config.level <= LogLevel.DEBUG;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.config.level;
  }
}

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
  return Logger.getInstance();
}
