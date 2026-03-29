import { describe, it, expect, beforeEach } from 'vitest';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Affect } from '../../../src/game/entities/Affect.js';
import { ApplyType, Position, AFF } from '../../../src/game/entities/types.js';

/** Concrete test subclass of Character. */
class TestCharacter extends Character {
  lastMessage = '';
  private readonly _isNpc: boolean;
  get isNpc(): boolean { return this._isNpc; }
  sendToChar(text: string): void { this.lastMessage = text; }
  constructor(init?: CharacterInit, isNpc = false) {
    super(init);
    this._isNpc = isNpc;
  }
}

function makeChar(init?: CharacterInit): TestCharacter {
  return new TestCharacter({
    name: 'TestHero',
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    ...init,
  });
}

describe('Character', () => {
  let ch: TestCharacter;

  beforeEach(() => {
    ch = makeChar();
  });

  describe('getStat', () => {
    it('should return permStats + modStats', () => {
      expect(ch.getStat('str')).toBe(15);
      ch.modStats.str = 3;
      expect(ch.getStat('str')).toBe(18);
    });

    it('should handle negative modifiers', () => {
      ch.modStats.dex = -5;
      expect(ch.getStat('dex')).toBe(7);
    });
  });

  describe('isAffected', () => {
    it('should return false when no flags set', () => {
      expect(ch.isAffected(AFF.BLIND)).toBe(false);
    });

    it('should return true when flag is set', () => {
      ch.affectedBy = AFF.BLIND | AFF.SANCTUARY;
      expect(ch.isAffected(AFF.BLIND)).toBe(true);
      expect(ch.isAffected(AFF.SANCTUARY)).toBe(true);
      expect(ch.isAffected(AFF.FLYING)).toBe(false);
    });
  });

  describe('applyAffect / removeAffect', () => {
    it('should apply and track an affect', () => {
      const aff = new Affect(42, 10, ApplyType.Str, 5);
      ch.applyAffect(aff);
      expect(ch.affects).toHaveLength(1);
      expect(ch.modStats.str).toBe(5);
    });

    it('should remove and reverse an affect', () => {
      const aff = new Affect(42, 10, ApplyType.Str, 5);
      ch.applyAffect(aff);
      ch.removeAffect(aff);
      expect(ch.affects).toHaveLength(0);
      expect(ch.modStats.str).toBe(0);
    });

    it('should handle removing an affect not in the list', () => {
      const aff = new Affect(42, 10, ApplyType.Str, 5);
      // Should not throw
      ch.removeAffect(aff);
      expect(ch.affects).toHaveLength(0);
    });
  });

  describe('stripAffect', () => {
    it('should remove all affects of a given type', () => {
      const aff1 = new Affect(42, 10, ApplyType.Str, 3);
      const aff2 = new Affect(42, 5, ApplyType.Dex, 2);
      const aff3 = new Affect(99, 10, ApplyType.Wis, 1);
      ch.applyAffect(aff1);
      ch.applyAffect(aff2);
      ch.applyAffect(aff3);
      expect(ch.affects).toHaveLength(3);

      ch.stripAffect(42);
      expect(ch.affects).toHaveLength(1);
      expect(ch.affects[0]).toBe(aff3);
      expect(ch.modStats.str).toBe(0);
      expect(ch.modStats.dex).toBe(0);
      expect(ch.modStats.wis).toBe(1);
    });
  });

  describe('getTotalWealth', () => {
    it('should calculate total wealth in copper', () => {
      ch.gold = 2;
      ch.silver = 3;
      ch.copper = 50;
      expect(ch.getTotalWealth()).toBe(2 * 10000 + 3 * 100 + 50);
    });

    it('should be 0 by default', () => {
      expect(ch.getTotalWealth()).toBe(0);
    });
  });

  describe('isImmortal', () => {
    it('should return false for trust < 51', () => {
      ch.trust = 50;
      expect(ch.isImmortal).toBe(false);
    });

    it('should return true for trust >= 51', () => {
      ch.trust = 51;
      expect(ch.isImmortal).toBe(true);
    });
  });

  describe('isPositionAtLeast', () => {
    it('should compare positions correctly', () => {
      ch.position = Position.Standing;
      expect(ch.isPositionAtLeast(Position.Standing)).toBe(true);
      expect(ch.isPositionAtLeast(Position.Resting)).toBe(true);
      expect(ch.isPositionAtLeast(Position.Mounted)).toBe(false);
    });

    it('should fail for lower position', () => {
      ch.position = Position.Sleeping;
      expect(ch.isPositionAtLeast(Position.Standing)).toBe(false);
    });
  });

  describe('isFighting', () => {
    it('should return false when not fighting', () => {
      expect(ch.isFighting).toBe(false);
    });

    it('should return true when fighting', () => {
      ch.fighting = makeChar();
      expect(ch.isFighting).toBe(true);
    });
  });

  describe('defaults', () => {
    it('should set sensible defaults', () => {
      const c = new TestCharacter();
      expect(c.level).toBe(1);
      expect(c.hit).toBe(20);
      expect(c.maxHit).toBe(20);
      expect(c.position).toBe(Position.Standing);
      expect(c.affectedBy).toBe(0n);
    });
  });

  // ===========================================================================
  // Regeneration
  // ===========================================================================

  describe('hitGain', () => {
    it('should compute base gain from level', () => {
      ch.hit = 0;
      ch.maxHit = 200;
      ch.position = Position.Standing;
      const gain = ch.hitGain();
      // level=1: base = floor(1*1.5)+5 = 6, warrior ×1.2 = floor(7.2) = 7
      expect(gain).toBe(7);
    });

    it('should apply sleeping modifier (×1.5)', () => {
      ch.hit = 0;
      ch.maxHit = 200;
      ch.position = Position.Sleeping;
      const gain = ch.hitGain();
      // base=6, sleeping=floor(6*1.5)=9, warrior=floor(9*1.2)=10
      expect(gain).toBe(10);
    });

    it('should apply resting modifier (×1.25)', () => {
      ch.hit = 0;
      ch.maxHit = 200;
      ch.position = Position.Resting;
      const gain = ch.hitGain();
      // base=6, resting=floor(6*1.25)=7, warrior=floor(7*1.2)=8
      expect(gain).toBe(8);
    });

    it('should apply poison penalty (÷4)', () => {
      ch.hit = 0;
      ch.maxHit = 200;
      ch.position = Position.Standing;
      ch.affectedBy = AFF.POISON;
      const gain = ch.hitGain();
      // base=6, poison=floor(6/4)=1, warrior=floor(1*1.2)=1
      expect(gain).toBe(1);
    });

    it('should not exceed maxHit - hit', () => {
      ch.hit = 195;
      ch.maxHit = 200;
      ch.position = Position.Standing;
      const gain = ch.hitGain();
      expect(gain).toBeLessThanOrEqual(5);
    });
  });

  describe('manaGain', () => {
    it('should include intelligence bonus', () => {
      ch.mana = 0;
      ch.maxMana = 200;
      ch.position = Position.Standing;
      // level=1: base=floor(1*1.5)+5=6, int bonus=14-10=4, total=10
      const gain = ch.manaGain();
      expect(gain).toBe(10);
    });

    it('should apply class bonus for mages', () => {
      const mage = new TestCharacter({
        name: 'Mage',
        level: 10,
        class_: 'mage',
        mana: 0,
        maxMana: 200,
        position: Position.Standing,
        permStats: { str: 10, int: 14, wis: 10, dex: 10, con: 10, cha: 10, lck: 10 },
      });
      const gain = mage.manaGain();
      // base=floor(10*1.5)+5=20, int bonus=4, total=24, mage ×1.3=floor(31.2)=31
      expect(gain).toBe(31);
    });
  });

  describe('moveGain', () => {
    it('should include dex bonus', () => {
      ch.move = 0;
      ch.maxMove = 200;
      ch.position = Position.Standing;
      // level=1: base=1+10=11, dex bonus=12-10=2, total=13
      const gain = ch.moveGain();
      expect(gain).toBe(13);
    });

    it('should apply sleeping modifier (×2)', () => {
      ch.move = 0;
      ch.maxMove = 200;
      ch.position = Position.Sleeping;
      // base=11, sleeping=floor(11*2)=22, dex bonus=2, total=24
      const gain = ch.moveGain();
      expect(gain).toBe(24);
    });
  });

  describe('updatePosition', () => {
    it('should set Dead at -10 HP', () => {
      ch.hit = -10;
      ch.updatePosition();
      expect(ch.position).toBe(Position.Dead);
    });

    it('should set Mortal at -6 HP', () => {
      ch.hit = -6;
      ch.updatePosition();
      expect(ch.position).toBe(Position.Mortal);
    });

    it('should set Incapacitated at -3 HP', () => {
      ch.hit = -3;
      ch.updatePosition();
      expect(ch.position).toBe(Position.Incap);
    });

    it('should set Stunned at -1 HP', () => {
      ch.hit = -1;
      ch.updatePosition();
      expect(ch.position).toBe(Position.Stunned);
    });

    it('should restore to standing from stunned when HP > 0', () => {
      ch.hit = -1;
      ch.updatePosition();
      expect(ch.position).toBe(Position.Stunned);

      ch.hit = 5;
      ch.updatePosition();
      expect(ch.position).toBe(Position.Standing);
    });

    it('should not change position if HP > 0 and already standing+', () => {
      ch.hit = 100;
      ch.position = Position.Fighting;
      ch.updatePosition();
      expect(ch.position).toBe(Position.Fighting);
    });
  });

  describe('charUpdate', () => {
    it('should apply regeneration', () => {
      ch.hit = 10;
      ch.maxHit = 200;
      ch.mana = 50;
      ch.maxMana = 200;
      ch.move = 50;
      ch.maxMove = 200;
      ch.position = Position.Standing;

      ch.charUpdate();

      expect(ch.hit).toBeGreaterThan(10);
      expect(ch.mana).toBeGreaterThan(50);
      expect(ch.move).toBeGreaterThan(50);
    });

    it('should decrement affect durations', () => {
      const aff = new Affect(1, 3, ApplyType.None, 0, 0n);
      ch.applyAffect(aff);
      expect(ch.affects.length).toBe(1);

      ch.charUpdate();
      expect(aff.duration).toBe(2);

      ch.charUpdate();
      expect(aff.duration).toBe(1);

      ch.charUpdate();
      // Duration reached 0, affect removed
      expect(ch.affects.length).toBe(0);
    });

    it('should apply poison damage', () => {
      ch.hit = 100;
      ch.maxHit = 100;
      ch.affectedBy = AFF.POISON;
      ch.position = Position.Standing;

      ch.charUpdate();

      // Poison damage = floor(level/10) + 1 = floor(10/10)+1 = 2
      // But regen also happened: 20 regen (reduced by poison to 5)
      // hit = 100 + 5 (regen, capped to 100) - 2 (poison) = 98
      expect(ch.hit).toBeLessThan(100);
    });

    it('should decrement timer', () => {
      ch.timer = 5;
      ch.charUpdate();
      expect(ch.timer).toBe(4);
    });
  });
});
