/**
 * Logger - Structured logging with in-memory ring buffer for SMAUG 2.0
 *
 * Provides leveled logging (Debug through Fatal) with domain tagging,
 * an in-memory ring buffer for recent log retrieval, and a command
 * execution wrapper for error isolation.
 */

/** Log severity levels. */
export enum LogLevel {
  Debug = 0,
  Info  = 1,
  Warn  = 2,
  Error = 3,
  Fatal = 4,
}

/** A single log entry. */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  domain: string;
  message: string;
  data?: unknown;
}

/** Default maximum entries in the ring buffer. */
const DEFAULT_MAX_ENTRIES = 10_000;

/**
 * Structured logger with in-memory ring buffer.
 *
 * Stores recent log entries for retrieval via getRecentLogs().
 * Entries older than maxEntries are discarded (FIFO).
 */
export class Logger {
  private readonly buffer: LogEntry[] = [];
  private readonly maxEntries: number;
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.Info, maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.minLevel = minLevel;
    this.maxEntries = maxEntries;
  }

  /** Set the minimum log level. Messages below this level are ignored. */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /** Get the current minimum log level. */
  getMinLevel(): LogLevel {
    return this.minLevel;
  }

  /** Log at Debug level. */
  debug(domain: string, message: string, data?: unknown): void {
    this.log(LogLevel.Debug, domain, message, data);
  }

  /** Log at Info level. */
  info(domain: string, message: string, data?: unknown): void {
    this.log(LogLevel.Info, domain, message, data);
  }

  /** Log at Warn level. */
  warn(domain: string, message: string, data?: unknown): void {
    this.log(LogLevel.Warn, domain, message, data);
  }

  /** Log at Error level. */
  error(domain: string, message: string, data?: unknown): void {
    this.log(LogLevel.Error, domain, message, data);
  }

  /** Log at Fatal level. */
  fatal(domain: string, message: string, data?: unknown): void {
    this.log(LogLevel.Fatal, domain, message, data);
  }

  /**
   * Get recent log entries from the ring buffer.
   *
   * @param count - Maximum number of entries to return (default: 100)
   * @param minLevel - Minimum level filter (default: Debug, i.e., all)
   * @returns Array of matching LogEntry objects, most recent last
   */
  getRecentLogs(count: number = 100, minLevel: LogLevel = LogLevel.Debug): LogEntry[] {
    const filtered = this.buffer.filter((entry) => entry.level >= minLevel);
    return filtered.slice(-count);
  }

  /**
   * Wrap a command execution handler with try/catch logging.
   * If the handler throws, the error is logged and not re-thrown,
   * preventing a single command from crashing the server.
   *
   * @param commandName - Name of the command being executed
   * @param handler - The command handler function
   * @param playerName - Name of the player executing the command
   */
  wrapCommandExecution(
    commandName: string,
    handler: () => void,
    playerName: string
  ): void {
    try {
      handler();
    } catch (err) {
      this.error('command', `Error executing '${commandName}' for ${playerName}`, {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }

  /** Internal logging method. */
  private log(level: LogLevel, domain: string, message: string, data?: unknown): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      domain,
      message,
      data,
    };

    this.buffer.push(entry);

    // Trim ring buffer if exceeded
    while (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
  }
}
