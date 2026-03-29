import { describe, it, expect, beforeEach } from 'vitest';
import { Affect } from '../../../src/game/entities/Affect.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { ApplyType, Position, AFF } from '../../../src/game/entities/types.js';

/** Concrete test subclass of Character. */
class TestCharacter extends Character {
  lastMessage = '';
  get isNpc(): boolean { return false; }
  sendToChar(text: string): void { this.lastMessage = text; }
}

function makeChar(init?: CharacterInit): TestCharacter {
  return new TestCharacter({
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    ...init,
  });
}

describe('Affect', () => {
  let ch: TestCharacter;

  beforeEach(() => {
    ch = makeChar();
  });

  describe('applyTo', () => {
    it('should modify strength via modStats', () => {
      const aff = new Affect(1, 10, ApplyType.Str, 3);
      aff.applyTo(ch);
      expect(ch.modStats.str).toBe(3);
      expect(ch.getStat('str')).toBe(18);
    });

    it('should modify maxHit', () => {
      const aff = new Affect(1, 10, ApplyType.Hit, 50);
      aff.applyTo(ch);
      expect(ch.maxHit).toBe(70);
    });

    it('should modify maxMana', () => {
      const aff = new Affect(1, 10, ApplyType.Mana, 25);
      aff.applyTo(ch);
      expect(ch.maxMana).toBe(125);
    });

    it('should modify maxMove', () => {
      const aff = new Affect(1, 10, ApplyType.Move, -10);
      aff.applyTo(ch);
      expect(ch.maxMove).toBe(90);
    });

    it('should modify armor', () => {
      const aff = new Affect(1, 10, ApplyType.AC, -20);
      aff.applyTo(ch);
      expect(ch.armor).toBe(80);
    });

    it('should modify hitroll and damroll', () => {
      const aff1 = new Affect(1, 10, ApplyType.Hitroll, 5);
      const aff2 = new Affect(1, 10, ApplyType.Damroll, 3);
      aff1.applyTo(ch);
      aff2.applyTo(ch);
      expect(ch.hitroll).toBe(5);
      expect(ch.damroll).toBe(3);
    });

    it('should modify saving throws', () => {
      const aff = new Affect(1, 10, ApplyType.SavingSpell, -2);
      aff.applyTo(ch);
      expect(ch.savingSpell).toBe(-2);
    });

    it('should set bitvector flags via Affect apply type', () => {
      const aff = new Affect(1, 10, ApplyType.Affect, 0, AFF.SANCTUARY);
      aff.applyTo(ch);
      expect(ch.isAffected(AFF.SANCTUARY)).toBe(true);
    });

    it('should set bitvector flags for non-Affect apply types too', () => {
      const aff = new Affect(1, 10, ApplyType.Str, 2, AFF.INVISIBLE);
      aff.applyTo(ch);
      expect(ch.modStats.str).toBe(2);
      expect(ch.isAffected(AFF.INVISIBLE)).toBe(true);
    });
  });

  describe('removeFrom', () => {
    it('should reverse stat modification', () => {
      const aff = new Affect(1, 10, ApplyType.Str, 3);
      aff.applyTo(ch);
      expect(ch.modStats.str).toBe(3);
      aff.removeFrom(ch);
      expect(ch.modStats.str).toBe(0);
    });

    it('should reverse bitvector flags', () => {
      const aff = new Affect(1, 10, ApplyType.Affect, 0, AFF.FLYING);
      aff.applyTo(ch);
      expect(ch.isAffected(AFF.FLYING)).toBe(true);
      aff.removeFrom(ch);
      expect(ch.isAffected(AFF.FLYING)).toBe(false);
    });
  });

  describe('tick', () => {
    it('should decrement duration and return false while active', () => {
      const aff = new Affect(1, 3, ApplyType.None, 0);
      expect(aff.tick()).toBe(false);
      expect(aff.duration).toBe(2);
    });

    it('should return true when duration reaches 0', () => {
      const aff = new Affect(1, 1, ApplyType.None, 0);
      expect(aff.tick()).toBe(true);
      expect(aff.duration).toBe(0);
      expect(aff.isExpired).toBe(true);
    });

    it('should never expire for permanent affects (duration -1)', () => {
      const aff = new Affect(1, -1, ApplyType.None, 0);
      expect(aff.tick()).toBe(false);
      expect(aff.tick()).toBe(false);
      expect(aff.duration).toBe(-1);
      expect(aff.isExpired).toBe(false);
    });

    it('should not go below 0', () => {
      const aff = new Affect(1, 0, ApplyType.None, 0);
      expect(aff.isExpired).toBe(true);
      expect(aff.tick()).toBe(true);
      expect(aff.duration).toBe(0);
    });
  });
});
