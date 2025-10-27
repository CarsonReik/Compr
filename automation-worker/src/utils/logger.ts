import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private logFilePath: string | null = null;

  constructor() {
    const logPath = process.env.LOG_FILE_PATH;
    if (logPath) {
      this.logFilePath = logPath;
      // Ensure log directory exists
      const logDir = path.dirname(logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    const logLine = JSON.stringify(logEntry);

    // Console output
    console.log(logLine);

    // File output
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, logLine + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  debug(message: string, meta?: any) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error | any) {
    const meta = error instanceof Error
      ? { error: error.message, stack: error.stack }
      : { error };
    this.log(LogLevel.ERROR, message, meta);
  }

  jobStart(jobId: string, platform: string, listingId: string) {
    this.info('Job started', { jobId, platform, listingId });
  }

  jobSuccess(jobId: string, platform: string, listingId: string, platformListingId: string, platformUrl: string) {
    this.info('Job completed successfully', {
      jobId,
      platform,
      listingId,
      platformListingId,
      platformUrl,
    });
  }

  jobError(jobId: string, platform: string, listingId: string, error: Error | string) {
    this.error('Job failed', {
      jobId,
      platform,
      listingId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

export const logger = new Logger();
