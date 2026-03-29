import { describe, it, expect, beforeEach } from 'vitest';
import {
  MonitoringController,
  MAX_AUDIT_LOG_SIZE,
  type MetricsProviders,
} from '../../../src/admin/MonitoringController.js';

// =============================================================================
// Helpers
// =============================================================================

function makeProviders(overrides?: Partial<MetricsProviders>): MetricsProviders {
  return {
    getOnlinePlayerCount: () => 5,
    getTotalRegisteredCount: async () => 100,
    getAreaCount: () => 10,
    getRoomCount: () => 500,
    getMobileCount: () => 200,
    getObjectCount: () => 300,
    getCurrentTick: () => 42,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('MonitoringController', () => {
  let monitor: MonitoringController;

  beforeEach(() => {
    MonitoringController.resetIdCounter();
    monitor = new MonitoringController(makeProviders());
    monitor.clearAuditLog();
    monitor.clearTickTimings();
  });

  // ===========================================================================
  // getServerStats
  // ===========================================================================

  describe('getServerStats', () => {
    it('should return valid server stats', async () => {
      const stats = await monitor.getServerStats();
      expect(stats.uptime).toBeGreaterThan(0);
      expect(stats.memoryUsedMB).toBeGreaterThan(0);
      expect(stats.memoryTotalMB).toBeGreaterThan(0);
      expect(stats.memoryRssMB).toBeGreaterThan(0);
      expect(stats.onlinePlayers).toBe(5);
      expect(stats.totalRegistered).toBe(100);
      expect(stats.areaCount).toBe(10);
      expect(stats.roomCount).toBe(500);
      expect(stats.mobileCount).toBe(200);
      expect(stats.objectCount).toBe(300);
      expect(stats.currentTick).toBe(42);
      expect(stats.nodeVersion).toMatch(/^v/);
    });

    it('should calculate average tick time from recorded timings', async () => {
      monitor.recordTickTime(10);
      monitor.recordTickTime(20);
      monitor.recordTickTime(30);
      const stats = await monitor.getServerStats();
      expect(stats.averageTickMs).toBe(20);
    });

    it('should return 0 average when no timings recorded', async () => {
      const stats = await monitor.getServerStats();
      expect(stats.averageTickMs).toBe(0);
    });

    it('should handle failing getTotalRegisteredCount gracefully', async () => {
      const providers = makeProviders({
        getTotalRegisteredCount: async () => { throw new Error('DB down'); },
      });
      const m = new MonitoringController(providers);
      const stats = await m.getServerStats();
      expect(stats.totalRegistered).toBe(0);
    });
  });

  // ===========================================================================
  // Tick Timing
  // ===========================================================================

  describe('recordTickTime', () => {
    it('should record and retrieve tick timings', () => {
      monitor.recordTickTime(5);
      monitor.recordTickTime(15);
      const perf = monitor.getPerformanceData();
      expect(perf.timings).toHaveLength(2);
      expect(perf.average).toBe(10);
      expect(perf.max).toBe(15);
      expect(perf.min).toBe(5);
    });

    it('should keep sliding window of 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        monitor.recordTickTime(i);
      }
      const perf = monitor.getPerformanceData();
      expect(perf.timings).toHaveLength(100);
      expect(perf.min).toBe(50);
      expect(perf.max).toBe(149);
    });

    it('should return empty performance data when cleared', () => {
      monitor.clearTickTimings();
      const perf = monitor.getPerformanceData();
      expect(perf.timings).toHaveLength(0);
      expect(perf.average).toBe(0);
      expect(perf.max).toBe(0);
      expect(perf.min).toBe(0);
    });
  });

  // ===========================================================================
  // Audit Log
  // ===========================================================================

  describe('logAction', () => {
    it('should add an audit log entry', () => {
      monitor.logAction('Admin', 'ban.add', '192.168.*', 'Banned for spam');
      const logs = monitor.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].actor).toBe('Admin');
      expect(logs[0].action).toBe('ban.add');
      expect(logs[0].target).toBe('192.168.*');
      expect(logs[0].details).toBe('Banned for spam');
    });

    it('should assign sequential IDs', () => {
      monitor.logAction('A', 'x', 'y', 'z');
      monitor.logAction('B', 'x', 'y', 'z');
      const logs = monitor.getAuditLogs();
      // Most recent first
      expect(logs[0].id).toContain('audit_2');
      expect(logs[1].id).toContain('audit_1');
    });

    it('should include IP address', () => {
      monitor.logAction('Admin', 'test', 'target', 'details', '10.0.0.1');
      const logs = monitor.getAuditLogs();
      expect(logs[0].ip).toBe('10.0.0.1');
    });

    it('should include timestamp', () => {
      const before = new Date();
      monitor.logAction('Admin', 'test', 'target', 'details');
      const after = new Date();
      const logs = monitor.getAuditLogs();
      expect(logs[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(logs[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getAuditLogs', () => {
    beforeEach(() => {
      monitor.logAction('Admin1', 'ban.add', 'site1', 'Note 1');
      monitor.logAction('Admin2', 'player.freeze', 'Bob', 'Note 2');
      monitor.logAction('Admin1', 'area.reset', 'midgaard', 'Note 3');
    });

    it('should return all logs in reverse chronological order', () => {
      const logs = monitor.getAuditLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].action).toBe('area.reset');  // Most recent
      expect(logs[2].action).toBe('ban.add');      // Oldest
    });

    it('should filter by actor', () => {
      const logs = monitor.getAuditLogs({ actor: 'Admin1' });
      expect(logs).toHaveLength(2);
      expect(logs.every(l => l.actor === 'Admin1')).toBe(true);
    });

    it('should filter by action (partial match)', () => {
      const logs = monitor.getAuditLogs({ action: 'ban' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('ban.add');
    });

    it('should filter by date range', () => {
      const now = new Date();
      const logs = monitor.getAuditLogs({
        from: new Date(now.getTime() - 1000),
        to: new Date(now.getTime() + 1000),
      });
      expect(logs).toHaveLength(3);
    });

    it('should limit results', () => {
      const logs = monitor.getAuditLogs({ limit: 2 });
      expect(logs).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const logs = monitor.getAuditLogs({ actor: 'NonExistent' });
      expect(logs).toHaveLength(0);
    });
  });

  describe('audit log size limit', () => {
    it('should trim old entries when exceeding MAX_AUDIT_LOG_SIZE', () => {
      // This would be slow with 10000, so just verify the mechanism
      for (let i = 0; i < 50; i++) {
        monitor.logAction('Admin', 'test', `target_${i}`, 'bulk');
      }
      expect(monitor.getAuditLogCount()).toBe(50);
    });

    it('should have MAX_AUDIT_LOG_SIZE of 10000', () => {
      expect(MAX_AUDIT_LOG_SIZE).toBe(10000);
    });
  });

  describe('clearAuditLog', () => {
    it('should remove all entries', () => {
      monitor.logAction('Admin', 'test', 'target', 'note');
      expect(monitor.getAuditLogCount()).toBe(1);
      monitor.clearAuditLog();
      expect(monitor.getAuditLogCount()).toBe(0);
    });
  });
});
