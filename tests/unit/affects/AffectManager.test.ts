import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AffectManager,
  registerCharacter,
  unregisterCharacter,
  clearActiveCharacters,
  getActiveCharacters,
  wireAffectUpdate,
  resetAffectManager,
} from '../../../src/game/affects/AffectManager.js';
import { AffectRegistry, SPELL } from '../../../src/game/affects/AffectRegistry.js';
import { Affect } from '../../../src/game/entities/Affect.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { ApplyType, Position, AFF } from '../../../src/game/entities/types.js';
import { EventBus, GameEvent } from '../../../src/core/EventBus.js';

/** Concrete test subclass of Character. */
class TestCharacter extends Character {
  messages: string[] = [];
  get isNpc(): boolean { return false; }
  sendToChar(text: string): void { this.messages.push(text); }
}

function makeChar(init?: CharacterInit): TestCharacter {
  return new TestCharacter({
    name: 'TestPlayer',
    level: 10,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    ...init,
  });
}

describe('AffectManager', () => {
  let manager: AffectManager;
  let ch: TestCharacter;

  beforeEach(() => {
    manager = new AffectManager();
    ch = makeChar();
    clearActiveCharacters();
    resetAffectManager();
  });

  describe('applyAffect', () => {
    it('should add affect to character affects array', () => {
      const aff = new Affect(SPELL.ARMOR, 10, ApplyType.AC, -20);
      manager.applyAffect(ch, aff);
      expect(ch.affects).toHaveLength(1);
      expect(ch.affects[0]).toBe(aff);
    });

    it('should apply stat modification', () => {
      const aff = new Affect(SPELL.GIANT_STRENGTH, 10, ApplyType.Str, 3);
      manager.applyAffect(ch, aff);
      expect(ch.modStats.str).toBe(3);
      expect(ch.getStat('str')).toBe(18);
    });

    it('should apply AC modification', () => {
      const aff = new Affect(SPELL.ARMOR, 10, ApplyType.AC, -20);
      manager.applyAffect(ch, aff);
      expect(ch.armor).toBe(80);
    });

    it('should set bitvector flags on character', () => {
      const aff = new Affect(SPELL.SANCTUARY, 10, ApplyType.None, 0, AFF.SANCTUARY);
      manager.applyAffect(ch, aff);
      expect(ch.isAffected(AFF.SANCTUARY)).toBe(true);
    });

    it('should handle AFF_SLEEP by forcing sleeping position', () => {
      const aff = new Affect(SPELL.SLEEP, 5, ApplyType.None, 0, AFF.SLEEP);
      ch.position = Position.Standing;
      manager.applyAffect(ch, aff);
      expect(ch.position).toBe(Position.Sleeping);
    });

    it('should not crash with null-like character', () => {
      const aff = new Affect(1, 10, ApplyType.Str, 3);
      // @ts-expect-error testing null safety
      expect(() => manager.applyAffect(null, aff)).not.toThrow();
    });
  });

  describe('joinAffect', () => {
    it('should stack modifier when same type+location exists', () => {
      const aff1 = new Affect(SPELL.ARMOR, 10, ApplyType.AC, -20);
      const aff2 = new Affect(SPELL.ARMOR, 15, ApplyType.AC, -10);
      manager.applyAffect(ch, aff1);
      manager.joinAffect(ch, aff2);

      // Should still be 1 affect, but with combined modifier
      expect(ch.affects).toHaveLength(1);
      expect(ch.affects[0]!.modifier).toBe(-30);
      expect(ch.affects[0]!.duration).toBe(15); // max(10, 15)
      expect(ch.armor).toBe(70); // 100 - 30
    });

    it('should add new affect if type+location differs', () => {
      const aff1 = new Affect(SPELL.ARMOR, 10, ApplyType.AC, -20);
      const aff2 = new Affect(SPELL.BLESS, 10, ApplyType.Hitroll, 2);
      manager.applyAffect(ch, aff1);
      manager.joinAffect(ch, aff2);

      expect(ch.affects).toHaveLength(2);
    });
  });

  describe('removeAffect', () => {
    it('should reverse stat modifications', () => {
      const aff = new Affect(SPELL.GIANT_STRENGTH, 10, ApplyType.Str, 3);
      manager.applyAffect(ch, aff);
      expect(ch.modStats.str).toBe(3);

      manager.removeAffect(ch, aff);
      expect(ch.modStats.str).toBe(0);
      expect(ch.affects).toHaveLength(0);
    });

    it('should clear bitvector flags when no other affect sets them', () => {
      const aff = new Affect(SPELL.SANCTUARY, 10, ApplyType.None, 0, AFF.SANCTUARY);
      manager.applyAffect(ch, aff);
      expect(ch.isAffected(AFF.SANCTUARY)).toBe(true);

      manager.removeAffect(ch, aff);
      expect(ch.isAffected(AFF.SANCTUARY)).toBe(false);
    });

    it('should NOT clear bitvector if another affect sets the same flag', () => {
      const aff1 = new Affect(SPELL.SANCTUARY, 10, ApplyType.None, 0, AFF.SANCTUARY);
      const aff2 = new Affect(999, 20, ApplyType.None, 0, AFF.SANCTUARY);
      manager.applyAffect(ch, aff1);
      manager.applyAffect(ch, aff2);

      manager.removeAffect(ch, aff1);
      // aff2 still sets SANCTUARY
      expect(ch.isAffected(AFF.SANCTUARY)).toBe(true);
      expect(ch.affects).toHaveLength(1);
    });

    it('should not crash when affect not found', () => {
      const aff = new Affect(1, 10, ApplyType.Str, 3);
      expect(() => manager.removeAffect(ch, aff)).not.toThrow();
    });
  });

  describe('stripAffect', () => {
    it('should remove all affects of a given type', () => {
      const aff1 = new Affect(SPELL.POISON, 10, ApplyType.Str, -2, AFF.POISON);
      const aff2 = new Affect(SPELL.POISON, 5, ApplyType.Con, -1, AFF.POISON);
      const aff3 = new Affect(SPELL.ARMOR, 10, ApplyType.AC, -20);
      manager.applyAffect(ch, aff1);
      manager.applyAffect(ch, aff2);
      manager.applyAffect(ch, aff3);

      expect(ch.affects).toHaveLength(3);
      manager.stripAffect(ch, SPELL.POISON);

      expect(ch.affects).toHaveLength(1);
      expect(ch.affects[0]!.type).toBe(SPELL.ARMOR);
      expect(ch.isAffected(AFF.POISON)).toBe(false);
    });

    it('should reverse stat modifications on strip', () => {
      const aff = new Affect(SPELL.GIANT_STRENGTH, 10, ApplyType.Str, 3);
      manager.applyAffect(ch, aff);
      manager.stripAffect(ch, SPELL.GIANT_STRENGTH);
      expect(ch.modStats.str).toBe(0);
    });

    it('should do nothing if type not found', () => {
      const aff = new Affect(SPELL.ARMOR, 10, ApplyType.AC, -20);
      manager.applyAffect(ch, aff);
      manager.stripAffect(ch, SPELL.POISON);
      expect(ch.affects).toHaveLength(1);
    });
  });

  describe('isAffectedBy', () => {
    it('should return true when affect of type exists', () => {
      const aff = new Affect(SPELL.SANCTUARY, 10, ApplyType.None, 0, AFF.SANCTUARY);
      manager.applyAffect(ch, aff);
      expect(manager.isAffectedBy(ch, SPELL.SANCTUARY)).toBe(true);
    });

    it('should return false when no affect of type exists', () => {
      expect(manager.isAffectedBy(ch, SPELL.SANCTUARY)).toBe(false);
    });
  });

  describe('affectUpdate (tick processing)', () => {
    it('should decrement affect duration each tick', () => {
      const aff = new Affect(SPELL.ARMOR, 5, ApplyType.AC, -20);
      manager.applyAffect(ch, aff);
      registerCharacter(ch);

      manager.affectUpdate();
      expect(aff.duration).toBe(4);
    });

    it('should not decrement permanent affects (duration -1)', () => {
      const aff = new Affect(SPELL.ARMOR, -1, ApplyType.AC, -20);
      manager.applyAffect(ch, aff);
      registerCharacter(ch);

      manager.affectUpdate();
      expect(aff.duration).toBe(-1);
    });

    it('should remove affect and send message when duration reaches 0', () => {
      const aff = new Affect(SPELL.SANCTUARY, 1, ApplyType.None, 0, AFF.SANCTUARY);
      manager.applyAffect(ch, aff);
      registerCharacter(ch);

      manager.affectUpdate();
      expect(ch.affects).toHaveLength(0);
      expect(ch.isAffected(AFF.SANCTUARY)).toBe(false);
      expect(ch.messages.some(m => m.includes('white aura'))).toBe(true);
    });

    it('should apply poison periodic damage', () => {
      const aff = new Affect(SPELL.POISON, 5, ApplyType.Str, -2, AFF.POISON);
      const initialHit = ch.hit;
      manager.applyAffect(ch, aff);
      registerCharacter(ch);

      manager.affectUpdate();
      // Poison damage = floor(level/10) + 1 = floor(10/10) + 1 = 2
      expect(ch.hit).toBe(initialHit - 2);
      expect(ch.messages.some(m => m.includes('very sick'))).toBe(true);
    });

    it('should skip dead characters', () => {
      const aff = new Affect(SPELL.ARMOR, 5, ApplyType.AC, -20);
      manager.applyAffect(ch, aff);
      registerCharacter(ch);
      ch.position = Position.Dead;

      manager.affectUpdate();
      // Duration should not change
      expect(aff.duration).toBe(5);
    });

    it('should handle multiple affects expiring on the same tick', () => {
      const aff1 = new Affect(SPELL.ARMOR, 1, ApplyType.AC, -20);
      const aff2 = new Affect(SPELL.BLESS, 1, ApplyType.Hitroll, 2);
      manager.applyAffect(ch, aff1);
      manager.applyAffect(ch, aff2);
      registerCharacter(ch);

      manager.affectUpdate();
      expect(ch.affects).toHaveLength(0);
      expect(ch.armor).toBe(100); // reversed
      expect(ch.hitroll).toBe(0); // reversed
    });

    it('should process multiple characters', () => {
      const ch2 = makeChar({ name: 'TestPlayer2' });
      const aff1 = new Affect(SPELL.ARMOR, 3, ApplyType.AC, -10);
      const aff2 = new Affect(SPELL.BLESS, 3, ApplyType.Hitroll, 1);
      manager.applyAffect(ch, aff1);
      manager.applyAffect(ch2, aff2);
      registerCharacter(ch);
      registerCharacter(ch2);

      manager.affectUpdate();
      expect(aff1.duration).toBe(2);
      expect(aff2.duration).toBe(2);
    });
  });

  describe('character registration', () => {
    it('should register and unregister characters', () => {
      registerCharacter(ch);
      expect(getActiveCharacters().has(ch)).toBe(true);

      unregisterCharacter(ch);
      expect(getActiveCharacters().has(ch)).toBe(false);
    });

    it('should clear all characters', () => {
      registerCharacter(ch);
      registerCharacter(makeChar({ name: 'OtherPlayer' }));
      clearActiveCharacters();
      expect(getActiveCharacters().size).toBe(0);
    });
  });

  describe('wireAffectUpdate', () => {
    it('should wire affectUpdate to FullTick event', () => {
      const eventBus = new EventBus();
      const mgr = new AffectManager();
      const aff = new Affect(SPELL.ARMOR, 5, ApplyType.AC, -20);
      mgr.applyAffect(ch, aff);
      registerCharacter(ch);

      wireAffectUpdate(eventBus, mgr);

      // Emit a FullTick event
      eventBus.emitEvent(GameEvent.FullTick, { pulseNumber: 280, randomTick: false });

      expect(aff.duration).toBe(4);
    });
  });

  describe('bitvector edge cases', () => {
    it('should handle affect with both stat mod and bitvector', () => {
      const aff = new Affect(SPELL.CURSE, 10, ApplyType.Hitroll, -1, AFF.CURSE);
      manager.applyAffect(ch, aff);

      expect(ch.hitroll).toBe(-1);
      expect(ch.isAffected(AFF.CURSE)).toBe(true);

      manager.removeAffect(ch, aff);
      expect(ch.hitroll).toBe(0);
      expect(ch.isAffected(AFF.CURSE)).toBe(false);
    });

    it('should handle multiple different bitvector affects', () => {
      const aff1 = new Affect(SPELL.INVIS, 10, ApplyType.None, 0, AFF.INVISIBLE);
      const aff2 = new Affect(SPELL.DETECT_INVIS, 10, ApplyType.None, 0, AFF.DETECT_INVIS);
      manager.applyAffect(ch, aff1);
      manager.applyAffect(ch, aff2);

      expect(ch.isAffected(AFF.INVISIBLE)).toBe(true);
      expect(ch.isAffected(AFF.DETECT_INVIS)).toBe(true);

      manager.removeAffect(ch, aff1);
      expect(ch.isAffected(AFF.INVISIBLE)).toBe(false);
      expect(ch.isAffected(AFF.DETECT_INVIS)).toBe(true);
    });
  });
});
