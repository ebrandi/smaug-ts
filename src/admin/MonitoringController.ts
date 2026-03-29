/**
 * MonitoringController – Server health, metrics, and audit log endpoint.
 *
 * Collects real-time server stats: uptime, memory, player counts,
 * entity counts, tick performance. Maintains an audit log of admin
 * actions for accountability.
 */

import { Logger } from '../utils/Logger.js';

const LOG_DOMAIN = 'monitoring';

// =============================================================================
// Interfaces
// =============================================================================

/** Snapshot of server metrics at a point in time. */
export interface ServerStats {
  uptime: number;              // Seconds since process start
  memoryUsedMB: number;        // Heap memory used in MB
  memoryTotalMB: number;       // Heap memory total in MB
  memoryRssMB: number;         // RSS memory in MB
  onlinePlayers: number;       // Currently connected and playing
  totalRegistered: number;     // Total registered players (from lookup fn)
  areaCount: number;
  roomCount: number;
  mobileCount: number;         // Registered mobile prototypes
  objectCount: number;         // Registered object prototypes
  currentTick: number;         // Current tick/pulse number
  averageTickMs: number;       // Average tick processing time in ms
  nodeVersion: string;
}

/** Audit log entry for admin actions. */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  actor: string;               // Admin name who performed action
  action: string;              // Action type (e.g., 'ban.add', 'player.freeze')
  target: string;              // Target of the action (player name, IP, etc.)
  details: string;             // Additional context
  ip: string;                  // IP address of the admin
}

/** Provider functions for entity counts — injected to avoid coupling. */
export interface MetricsProviders {
  getOnlinePlayerCount: () => number;
  getTotalRegisteredCount: () => Promise<number>;
  getAreaCount: () => number;
  getRoomCount: () => number;
  getMobileCount: () => number;
  getObjectCount: () => number;
  getCurrentTick: () => number;
}

// =============================================================================
// MonitoringController
// =============================================================================

/** Maximum number of audit log entries retained in memory. */
export const MAX_AUDIT_LOG_SIZE = 10000;

export class MonitoringController {
  private readonly logger: Logger | null;
  private readonly providers: MetricsProviders;
  private readonly auditLog: AuditLogEntry[] = [];
  private tickTimings: number[] = [];
  private static logIdCounter = 0;

  /**
   * @param providers - Functions that return entity counts
   * @param logger - Optional structured logger
   */
  constructor(providers: MetricsProviders, logger?: Logger) {
    this.providers = providers;
    this.logger = logger ?? null;
  }

  /**
   * Get current server metrics.
   */
  async getServerStats(): Promise<ServerStats> {
    const mem = process.memoryUsage();
    const avgTick = this.tickTimings.length > 0
      ? this.tickTimings.reduce((a, b) => a + b, 0) / this.tickTimings.length
      : 0;

    let totalRegistered = 0;
    try {
      totalRegistered = await this.providers.getTotalRegisteredCount();
    } catch {
      // If the lookup fails, just report 0
    }

    return {
      uptime: process.uptime(),
      memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      memoryTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      memoryRssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      onlinePlayers: this.providers.getOnlinePlayerCount(),
      totalRegistered,
      areaCount: this.providers.getAreaCount(),
      roomCount: this.providers.getRoomCount(),
      mobileCount: this.providers.getMobileCount(),
      objectCount: this.providers.getObjectCount(),
      currentTick: this.providers.getCurrentTick(),
      averageTickMs: Math.round(avgTick * 100) / 100,
      nodeVersion: process.version,
    };
  }

  /**
   * Record a tick processing time for average calculation.
   * Keeps a sliding window of the last 100 tick times.
   */
  recordTickTime(ms: number): void {
    this.tickTimings.push(ms);
    if (this.tickTimings.length > 100) {
      this.tickTimings.shift();
    }
  }

  /**
   * Get tick timing performance data.
   */
  getPerformanceData(): { timings: number[]; average: number; max: number; min: number } {
    if (this.tickTimings.length === 0) {
      return { timings: [], average: 0, max: 0, min: 0 };
    }
    const avg = this.tickTimings.reduce((a, b) => a + b, 0) / this.tickTimings.length;
    const max = Math.max(...this.tickTimings);
    const min = Math.min(...this.tickTimings);
    return {
      timings: [...this.tickTimings],
      average: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
    };
  }

  // ===========================================================================
  // Audit Log
  // ===========================================================================

  /**
   * Record an admin action in the audit log.
   */
  logAction(actor: string, action: string, target: string, details: string, ip: string = ''): void {
    MonitoringController.logIdCounter++;
    const entry: AuditLogEntry = {
      id: `audit_${MonitoringController.logIdCounter}`,
      timestamp: new Date(),
      actor,
      action,
      target,
      details,
      ip,
    };

    this.auditLog.push(entry);

    // Trim to max size
    while (this.auditLog.length > MAX_AUDIT_LOG_SIZE) {
      this.auditLog.shift();
    }

    this.logger?.info(LOG_DOMAIN, `AUDIT: ${actor} → ${action} on ${target}: ${details}`);
  }

  /**
   * Query audit logs with optional filters.
   */
  getAuditLogs(opts?: {
    actor?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let results = [...this.auditLog];

    if (opts?.actor) {
      const actor = opts.actor.toLowerCase();
      results = results.filter(e => e.actor.toLowerCase() === actor);
    }

    if (opts?.action) {
      const action = opts.action.toLowerCase();
      results = results.filter(e => e.action.toLowerCase().includes(action));
    }

    if (opts?.from) {
      results = results.filter(e => e.timestamp >= opts.from!);
    }

    if (opts?.to) {
      results = results.filter(e => e.timestamp <= opts.to!);
    }

    // Most recent first
    results.reverse();

    if (opts?.limit && opts.limit > 0) {
      results = results.slice(0, opts.limit);
    }

    return results;
  }

  /**
   * Get total number of audit log entries.
   */
  getAuditLogCount(): number {
    return this.auditLog.length;
  }

  /**
   * Clear all audit logs. Used for testing.
   */
  clearAuditLog(): void {
    this.auditLog.length = 0;
  }

  /**
   * Clear tick timings. Used for testing.
   */
  clearTickTimings(): void {
    this.tickTimings = [];
  }

  /**
   * Reset the static log ID counter. Used for testing.
   */
  static resetIdCounter(): void {
    MonitoringController.logIdCounter = 0;
  }
}
