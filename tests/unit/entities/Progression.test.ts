import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { classTable } from '../../../src/game/entities/tables.js';
import { CharClass, Position } from '../../../src/game/entities/types.js';

// Mock descriptor
const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

function makePlayer(overrides: Record<string, any> = {}): Player {
  const p = new Player({
    name: 'TestHero',
    level: 1,
    exp: 0,
    hit: 20,
    maxHit: 20,
    mana: 100,
    maxMana: 100,
    move: 100,
    maxMove: 100,
    class_: 'Warrior',
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 15, cha: 10, lck: 9 },
    ...overrides,
  });
  p.descriptor = mockDescriptor as any;
  return p;
}

describe('Player Progression', () => {
  let player: Player;

  beforeEach(() => {
    player = makePlayer();
    Player.setEventBus(null);
  });

  describe('xpToNextLevel', () => {
    it('should calculate level * level * 500', () => {
      expect(Player.xpToNextLevel(1)).toBe(500);
      expect(Player.xpToNextLevel(2)).toBe(2000);
      expect(Player.xpToNextLevel(5)).toBe(12500);
      expect(Player.xpToNextLevel(10)).toBe(50000);
    });

    it('should apply class expBase modifier', () => {
      const vampireData = classTable[CharClass.Vampire]!;
      // Vampire expBase = 1100, so xp at level 5 = 12500 * 1100 / 1000 = 13750
      expect(Player.xpToNextLevel(5, vampireData)).toBe(13750);
    });

    it('should not modify for expBase=1000', () => {
      const warriorData = classTable[CharClass.Warrior]!;
      expect(Player.xpToNextLevel(5, warriorData)).toBe(12500);
    });
  });

  describe('gainXp', () => {
    it('should add XP without leveling if below threshold', () => {
      player.gainXp(100);
      expect(player.exp).toBe(100);
      expect(player.level).toBe(1);
    });

    it('should clamp XP to 0 on negative', () => {
      player.exp = 50;
      player.gainXp(-100);
      expect(player.exp).toBe(0);
    });

    it('should advance level when XP reaches threshold', () => {
      // Level 1 needs 500 XP
      player.gainXp(500);
      expect(player.level).toBe(2);
    });

    it('should handle multi-level gains', () => {
      // Level 1 needs 500, level 2 needs 2000, level 3 needs 4500
      player.gainXp(5000);
      expect(player.level).toBeGreaterThanOrEqual(3);
    });
  });

  describe('advanceLevel', () => {
    it('should increment level by 1', () => {
      const startLevel = player.level;
      player.advanceLevel();
      expect(player.level).toBe(startLevel + 1);
    });

    it('should increase maxHit by at least 1', () => {
      const startHP = player.maxHit;
      player.advanceLevel();
      expect(player.maxHit).toBeGreaterThan(startHP);
    });

    it('should increase hit along with maxHit', () => {
      const startHit = player.hit;
      player.advanceLevel();
      expect(player.hit).toBeGreaterThan(startHit);
    });

    it('should not give mana to warriors (0d0 mana dice)', () => {
      const startMana = player.maxMana;
      player.advanceLevel();
      expect(player.maxMana).toBe(startMana);
    });

    it('should give mana to mages', () => {
      const mage = makePlayer({ class_: 'Mage' });
      const startMana = mage.maxMana;
      mage.advanceLevel();
      expect(mage.maxMana).toBeGreaterThan(startMana);
    });

    it('should increase maxMove', () => {
      const startMove = player.maxMove;
      player.advanceLevel();
      expect(player.maxMove).toBeGreaterThan(startMove);
    });

    it('should grant practice sessions based on WIS', () => {
      // WIS 13 gives practice 2
      const startPractice = player.practice;
      player.advanceLevel();
      expect(player.practice).toBeGreaterThan(startPractice);
    });

    it('should grant more practices with higher WIS', () => {
      const highWis = makePlayer({ permStats: { str: 15, int: 14, wis: 18, dex: 12, con: 15, cha: 10, lck: 9 } });
      highWis.advanceLevel();
      // WIS 18 gives practice 5
      expect(highWis.practice).toBe(5);
    });

    it('should handle multiple level-ups consistently', () => {
      const startLevel = player.level;
      for (let i = 0; i < 5; i++) {
        player.advanceLevel();
      }
      expect(player.level).toBe(startLevel + 5);
      expect(player.maxHit).toBeGreaterThanOrEqual(25); // at least +1 per level
    });
  });
});
