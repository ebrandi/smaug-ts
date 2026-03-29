import { describe, it, expect, beforeEach } from 'vitest';
import { DamageCalculator } from '../../../src/game/combat/DamageCalculator.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { DamageType, Position } from '../../../src/game/entities/types.js';

// =============================================================================
// Test Character
// =============================================================================

class TestChar extends Character {
  messages: string[] = [];
  get isNpc(): boolean { return false; }
  sendToChar(text: string): void { this.messages.push(text); }
  constructor(init?: CharacterInit) { super(init); }
}

function makeChar(init?: Partial<CharacterInit>): TestChar {
  return new TestChar({
    id: 'test_1',
    name: 'TestHero',
    level: 10,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    class_: 'warrior',
    hitroll: 0,
    ...init,
  });
}

describe('DamageCalculator', () => {
  let calc: DamageCalculator;

  beforeEach(() => {
    calc = new DamageCalculator();
  });

  // ===========================================================================
  // getDamageMessage
  // ===========================================================================

  describe('getDamageMessage', () => {
    it('should return "miss" for 0 damage', () => {
      expect(calc.getDamageMessage(0)).toBe('miss');
    });

    it('should return "scratch" for 1-4 damage', () => {
      expect(calc.getDamageMessage(1)).toBe('scratch');
      expect(calc.getDamageMessage(4)).toBe('scratch');
    });

    it('should return "graze" for 5-8 damage', () => {
      expect(calc.getDamageMessage(5)).toBe('graze');
      expect(calc.getDamageMessage(8)).toBe('graze');
    });

    it('should return "hit" for 9-14 damage', () => {
      expect(calc.getDamageMessage(9)).toBe('hit');
      expect(calc.getDamageMessage(14)).toBe('hit');
    });

    it('should return "wound" for 23-32 damage', () => {
      expect(calc.getDamageMessage(23)).toBe('wound');
      expect(calc.getDamageMessage(32)).toBe('wound');
    });

    it('should return OBLITERATE for very high damage', () => {
      expect(calc.getDamageMessage(1600)).toBe('=== OBLITERATE ===');
      expect(calc.getDamageMessage(99999)).toBe('=== OBLITERATE ===');
    });

    it('should handle all thresholds correctly', () => {
      // Spot-check boundary values
      expect(calc.getDamageMessage(44)).toBe('maul');
      expect(calc.getDamageMessage(45)).toBe('decimate');
      expect(calc.getDamageMessage(58)).toBe('decimate');
      expect(calc.getDamageMessage(59)).toBe('devastate');
      expect(calc.getDamageMessage(99)).toBe('maim');
      expect(calc.getDamageMessage(100)).toBe('MUTILATE');
      expect(calc.getDamageMessage(139)).toBe('MUTILATE');
      expect(calc.getDamageMessage(140)).toBe('DISEMBOWEL');
      expect(calc.getDamageMessage(500)).toBe('MANGLE');
      expect(calc.getDamageMessage(1199)).toBe('*** DEMOLISH ***');
      expect(calc.getDamageMessage(1599)).toBe('*** ANNIHILATE ***');
    });
  });

  // ===========================================================================
  // calcThac0
  // ===========================================================================

  describe('calcThac0', () => {
    it('should give warriors lower THAC0 than mages at same level', () => {
      const warrior = makeChar({ class_: 'warrior', level: 10 });
      const mage = makeChar({ class_: 'mage', level: 10 });
      expect(calc.calcThac0(warrior)).toBeLessThan(calc.calcThac0(mage));
    });

    it('should improve with level', () => {
      const low = makeChar({ level: 5 });
      const high = makeChar({ level: 20 });
      expect(calc.calcThac0(high)).toBeLessThan(calc.calcThac0(low));
    });

    it('should improve with hitroll', () => {
      const noHitroll = makeChar({ hitroll: 0 });
      const highHitroll = makeChar({ hitroll: 10 });
      expect(calc.calcThac0(highHitroll)).toBeLessThan(calc.calcThac0(noHitroll));
    });

    it('should use base 20 for cleric', () => {
      const cleric = makeChar({ class_: 'cleric', level: 0, hitroll: 0, permStats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0, lck: 0 } });
      // base=20, levelBonus=0, hitroll=0, strHitBonus for str=0 is -5 → 20 - 0 - 0 - (-5) = 25
      expect(calc.calcThac0(cleric)).toBe(25);
    });
  });

  // ===========================================================================
  // calcDamageBonus
  // ===========================================================================

  describe('calcDamageBonus', () => {
    it('should return negative bonus for low strength', () => {
      const ch = makeChar({ permStats: { str: 3, int: 10, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 } });
      expect(calc.calcDamageBonus(ch)).toBeLessThan(0);
    });

    it('should return 0 for average strength (10-14)', () => {
      const ch = makeChar({ permStats: { str: 12, int: 10, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 } });
      expect(calc.calcDamageBonus(ch)).toBe(0);
    });

    it('should return positive bonus for high strength', () => {
      const ch = makeChar({ permStats: { str: 20, int: 10, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 } });
      expect(calc.calcDamageBonus(ch)).toBeGreaterThan(0);
    });

    it('should return 8 for max strength (25)', () => {
      const ch = makeChar({ permStats: { str: 25, int: 10, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 } });
      expect(calc.calcDamageBonus(ch)).toBe(8);
    });
  });

  // ===========================================================================
  // calcHitBonus
  // ===========================================================================

  describe('calcHitBonus', () => {
    it('should return negative bonus for low strength', () => {
      const ch = makeChar({ permStats: { str: 0, int: 10, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 } });
      expect(calc.calcHitBonus(ch)).toBe(-5);
    });

    it('should return 0 for average strength', () => {
      const ch = makeChar({ permStats: { str: 13, int: 10, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 } });
      expect(calc.calcHitBonus(ch)).toBe(0);
    });

    it('should return 5 for max strength (25)', () => {
      const ch = makeChar({ permStats: { str: 25, int: 10, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 } });
      expect(calc.calcHitBonus(ch)).toBe(5);
    });
  });

  // ===========================================================================
  // checkImmune
  // ===========================================================================

  describe('checkImmune', () => {
    it('should return 0 (immune) when immune flag is set', () => {
      const victim = makeChar({ immune: 1n << 3n }); // Slash
      expect(calc.checkImmune(victim, DamageType.Slash)).toBe(0);
    });

    it('should return 0.5 (resistant) when resistant flag is set', () => {
      const victim = makeChar({ resistant: 1n << 11n }); // Pierce
      expect(calc.checkImmune(victim, DamageType.Pierce)).toBe(0.5);
    });

    it('should return 2 (susceptible) when susceptible flag is set', () => {
      const victim = makeChar({ susceptible: 1n << 0n }); // Hit
      expect(calc.checkImmune(victim, DamageType.Hit)).toBe(2);
    });

    it('should return 1 (normal) when no flags match', () => {
      const victim = makeChar();
      expect(calc.checkImmune(victim, DamageType.Slash)).toBe(1);
    });

    it('should prioritize immune over resistant', () => {
      const flag = 1n << 3n; // Slash
      const victim = makeChar({ immune: flag, resistant: flag });
      expect(calc.checkImmune(victim, DamageType.Slash)).toBe(0);
    });
  });
});
