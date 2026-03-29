import { describe, it, expect, beforeEach } from 'vitest';
import { BanSystem, type BanEntry } from '../../../src/admin/BanSystem.js';

function makeBan(overrides: Partial<BanEntry> = {}): BanEntry {
  return {
    id: 'ban1',
    name: 'evil.example.com',
    user: '',
    note: 'Bad site',
    bannedBy: 'Admin',
    bannedAt: new Date('2025-01-01'),
    flagType: 'all',
    level: 0,
    unbanDate: null,
    duration: -1,
    prefix: false,
    suffix: false,
    ...overrides,
  };
}

describe('BanSystem', () => {
  let banSystem: BanSystem;

  beforeEach(() => {
    banSystem = new BanSystem();
  });

  describe('exact host match', () => {
    it('should match exact host', () => {
      banSystem.addBan(makeBan({ name: 'evil.example.com' }));
      expect(banSystem.checkBan('evil.example.com', 1)).not.toBeNull();
    });

    it('should be case insensitive', () => {
      banSystem.addBan(makeBan({ name: 'EVIL.example.COM' }));
      expect(banSystem.checkBan('evil.example.com', 1)).not.toBeNull();
    });

    it('should not match different host', () => {
      banSystem.addBan(makeBan({ name: 'evil.example.com' }));
      expect(banSystem.checkBan('good.example.com', 1)).toBeNull();
    });
  });

  describe('prefix match', () => {
    it('should match host starting with ban name', () => {
      banSystem.addBan(makeBan({ name: 'evil', prefix: true }));
      expect(banSystem.checkBan('evil.example.com', 1)).not.toBeNull();
    });

    it('should not match non-prefix', () => {
      banSystem.addBan(makeBan({ name: 'evil', prefix: true }));
      expect(banSystem.checkBan('notevil.example.com', 1)).toBeNull();
    });
  });

  describe('suffix match', () => {
    it('should match host ending with ban name', () => {
      banSystem.addBan(makeBan({ name: '.ru', suffix: true }));
      expect(banSystem.checkBan('hacker.ru', 1)).not.toBeNull();
    });

    it('should not match non-suffix', () => {
      banSystem.addBan(makeBan({ name: '.ru', suffix: true }));
      expect(banSystem.checkBan('hacker.ru.com', 1)).toBeNull();
    });
  });

  describe('prefix + suffix (contains)', () => {
    it('should match host containing ban name', () => {
      banSystem.addBan(makeBan({ name: 'evil', prefix: true, suffix: true }));
      expect(banSystem.checkBan('super-evil-host.com', 1)).not.toBeNull();
    });

    it('should not match when not contained', () => {
      banSystem.addBan(makeBan({ name: 'evil', prefix: true, suffix: true }));
      expect(banSystem.checkBan('good-host.com', 1)).toBeNull();
    });
  });

  describe('ban type vs level', () => {
    it('should block all levels for flagType all', () => {
      banSystem.addBan(makeBan({ flagType: 'all' }));
      expect(banSystem.checkBan('evil.example.com', 100)).not.toBeNull();
    });

    it('should block newbies only for flagType newbie', () => {
      banSystem.addBan(makeBan({ flagType: 'newbie' }));
      expect(banSystem.checkBan('evil.example.com', 1)).not.toBeNull();
      expect(banSystem.checkBan('evil.example.com', 5)).toBeNull();
    });

    it('should block mortals (< 51) for flagType mortal', () => {
      banSystem.addBan(makeBan({ flagType: 'mortal' }));
      expect(banSystem.checkBan('evil.example.com', 50)).not.toBeNull();
      expect(banSystem.checkBan('evil.example.com', 51)).toBeNull();
    });

    it('should block up to ban level for flagType level', () => {
      banSystem.addBan(makeBan({ flagType: 'level', level: 30 }));
      expect(banSystem.checkBan('evil.example.com', 30)).not.toBeNull();
      expect(banSystem.checkBan('evil.example.com', 31)).toBeNull();
    });

    it('should return ban for flagType warn regardless of level', () => {
      banSystem.addBan(makeBan({ flagType: 'warn' }));
      expect(banSystem.checkBan('evil.example.com', 100)).not.toBeNull();
    });
  });

  describe('expired bans', () => {
    it('should skip expired bans', () => {
      banSystem.addBan(makeBan({
        unbanDate: new Date('2020-01-01'),  // In the past
      }));
      expect(banSystem.checkBan('evil.example.com', 1)).toBeNull();
    });

    it('should not skip non-expired bans', () => {
      banSystem.addBan(makeBan({
        unbanDate: new Date('2099-01-01'),  // In the future
      }));
      expect(banSystem.checkBan('evil.example.com', 1)).not.toBeNull();
    });
  });

  describe('addBan / removeBan', () => {
    it('should add and retrieve bans', () => {
      banSystem.addBan(makeBan({ id: 'b1' }));
      banSystem.addBan(makeBan({ id: 'b2', name: 'other.com' }));
      expect(banSystem.getAllBans()).toHaveLength(2);
    });

    it('should remove a ban by ID', () => {
      banSystem.addBan(makeBan({ id: 'b1' }));
      expect(banSystem.removeBan('b1')).toBe(true);
      expect(banSystem.getAllBans()).toHaveLength(0);
    });

    it('should return false for non-existent ban removal', () => {
      expect(banSystem.removeBan('nonexistent')).toBe(false);
    });
  });
});
