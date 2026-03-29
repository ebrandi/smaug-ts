import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doCast, castSpell, calculateManaCost } from '../../../src/game/spells/SpellEngine.js';
import { findSpell, getSpell, SPELL_ID } from '../../../src/game/spells/SpellRegistry.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Position, AFF, ROOM_FLAGS } from '../../../src/game/entities/types.js';
import { SPELL } from '../../../src/game/affects/AffectRegistry.js';
import * as Dice from '../../../src/utils/Dice.js';

/** Concrete test character that captures messages. */
class TestCharacter extends Character {
  messages: string[] = [];
  get isNpc(): boolean { return false; }
  sendToChar(text: string): void { this.messages.push(text); }
}

class TestNpc extends Character {
  messages: string[] = [];
  get isNpc(): boolean { return true; }
  sendToChar(text: string): void { this.messages.push(text); }
}

/** Create a Player with captured messages. */
function makePlayer(init?: Partial<CharacterInit>): Player {
  const p = new Player(
    {
      name: 'TestMage',
      level: 20,
      mana: 200,
      maxMana: 200,
      position: Position.Standing,
      permStats: { str: 15, int: 18, wis: 14, dex: 12, con: 13, cha: 10, lck: 9 },
      ...init,
    },
  );
  // Intercept sendToChar with a messages array
  (p as unknown as { messages: string[] }).messages = [];
  p.sendToChar = function (text: string) {
    (this as unknown as { messages: string[] }).messages.push(text);
  };
  return p;
}

function getMessages(ch: Character): string[] {
  return (ch as unknown as { messages: string[] }).messages ?? [];
}

function makeRoom(flags: bigint = 0n): Room {
  const room = new Room(1000, 'Test Room', 'A test room.');
  room.roomFlags = flags;
  return room;
}

function makeVictim(init?: Partial<CharacterInit>): TestNpc {
  return new TestNpc({
    name: 'TestMob',
    level: 10,
    hit: 100,
    maxHit: 100,
    position: Position.Standing,
    ...init,
  });
}

describe('SpellEngine', () => {
  describe('calculateManaCost()', () => {
    it('should return maxMana at level 0', () => {
      const spell = findSpell('fireball')!;
      const ch = makePlayer({ level: 0 });
      const cost = calculateManaCost(spell, ch);
      expect(cost).toBe(spell.maxMana);
    });

    it('should return minMana at level 50', () => {
      const spell = findSpell('fireball')!;
      const ch = makePlayer({ level: 50 });
      const cost = calculateManaCost(spell, ch);
      expect(cost).toBe(spell.minMana);
    });

    it('should return intermediate cost at level 25', () => {
      const spell = findSpell('fireball')!;
      const ch = makePlayer({ level: 25 });
      const cost = calculateManaCost(spell, ch);
      expect(cost).toBeGreaterThan(spell.minMana);
      expect(cost).toBeLessThan(spell.maxMana);
    });
  });

  describe('doCast() – 13-step pipeline', () => {
    let player: Player;
    let room: Room;
    let victim: TestNpc;

    beforeEach(() => {
      player = makePlayer();
      room = makeRoom();
      victim = makeVictim();
      room.addCharacter(player);
      room.addCharacter(victim);
      // Learn fireball at 100% so no fizzle
      player.pcData.learned.set(SPELL_ID.FIREBALL, 100);
      // Always succeed proficiency
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(1);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('step 1: should error on empty argument', () => {
      doCast(player, '');
      expect(getMessages(player).some(m => m.includes('Cast which spell'))).toBe(true);
    });

    it('step 2: should error on unknown spell', () => {
      doCast(player, "'xyzzy'");
      expect(getMessages(player).some(m => m.includes("don't know any spells"))).toBe(true);
    });

    it('step 3: should error if player hasn\'t learned the spell', () => {
      player.pcData.learned.clear();
      doCast(player, "'fireball' TestMob");
      expect(getMessages(player).some(m => m.includes("don't know that spell"))).toBe(true);
    });

    it('step 5: should block in ROOM_NO_MAGIC', () => {
      room.roomFlags = ROOM_FLAGS.NO_MAGIC;
      doCast(player, "'fireball' TestMob");
      expect(getMessages(player).some(m => m.includes('devoid of magic'))).toBe(true);
    });

    it('step 5: should block offensive spells in ROOM_SAFE', () => {
      room.roomFlags = ROOM_FLAGS.SAFE;
      doCast(player, "'fireball' TestMob");
      expect(getMessages(player).some(m => m.includes("can't cast offensive"))).toBe(true);
    });

    it('step 7: should error if not enough mana', () => {
      player.mana = 0;
      doCast(player, "'fireball' TestMob");
      expect(getMessages(player).some(m => m.includes('enough mana'))).toBe(true);
    });

    it('step 8: TAR_CHAR_OFFENSIVE should find victim in room', () => {
      const startHp = victim.hit;
      doCast(player, "'fireball' TestMob");
      expect(victim.hit).toBeLessThan(startHp);
    });

    it('step 8: TAR_CHAR_OFFENSIVE with no target should use fighting target', () => {
      player.fighting = victim;
      player.position = Position.Fighting;
      const startHp = victim.hit;
      doCast(player, "'fireball'");
      expect(victim.hit).toBeLessThan(startHp);
    });

    it('step 8: TAR_CHAR_OFFENSIVE with no target and not fighting should error', () => {
      doCast(player, "'fireball'");
      expect(getMessages(player).some(m => m.includes('Cast the spell on whom'))).toBe(true);
    });

    it('step 8: TAR_CHAR_DEFENSIVE defaults to self', () => {
      player.pcData.learned.set(SPELL.ARMOR, 100);
      doCast(player, "'armor'");
      expect(player.affects.some(a => a.type === SPELL.ARMOR)).toBe(true);
    });

    it('step 11: should deduct mana', () => {
      const startMana = player.mana;
      doCast(player, "'fireball' TestMob");
      expect(player.mana).toBeLessThan(startMana);
    });

    it('step 12: should apply damage to victim', () => {
      const startHp = victim.hit;
      doCast(player, "'fireball' TestMob");
      expect(victim.hit).toBeLessThan(startHp);
    });

    it('should apply command lag (wait)', () => {
      const startWait = player.wait;
      doCast(player, "'fireball' TestMob");
      expect(player.wait).toBeGreaterThan(startWait);
    });
  });

  describe('doCast() – proficiency failure', () => {
    it('step 10: should fizzle and cost half mana on proficiency failure', () => {
      const player = makePlayer();
      const room = makeRoom();
      const victim = makeVictim();
      room.addCharacter(player);
      room.addCharacter(victim);
      player.pcData.learned.set(SPELL_ID.FIREBALL, 50);
      // Roll 99 > 50 → fizzle
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(99);

      const startMana = player.mana;
      doCast(player, "'fireball' TestMob");
      expect(getMessages(player).some(m => m.includes('lost your concentration'))).toBe(true);
      // Half mana deducted
      const spell = findSpell('fireball')!;
      const fullCost = calculateManaCost(spell, player);
      expect(player.mana).toBe(startMana - Math.floor(fullCost / 2));
      // Victim should NOT take damage
      expect(victim.hit).toBe(100);
      vi.restoreAllMocks();
    });
  });

  describe('castSpell() – direct invocation', () => {
    it('should cast spell directly without mana check or proficiency', () => {
      const ch = new TestCharacter({ name: 'Test', level: 20, hit: 100, maxHit: 100, mana: 0 });
      const victim = makeVictim();
      const room = makeRoom();
      room.addCharacter(ch);
      room.addCharacter(victim);

      const startHp = victim.hit;
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(1);
      castSpell(ch, SPELL_ID.FIREBALL, 20, victim);
      expect(victim.hit).toBeLessThan(startHp);
      // Mana should NOT be deducted
      expect(ch.mana).toBe(0);
      vi.restoreAllMocks();
    });

    it('should handle unknown spell ID gracefully', () => {
      const ch = new TestCharacter({ name: 'Test', level: 10 });
      // Should not throw
      castSpell(ch, 99999, 10, null);
    });
  });

  describe('doCast() – healing spells', () => {
    it('should heal the caster when casting cure light on self', () => {
      const player = makePlayer({ hit: 10, maxHit: 100 });
      const room = makeRoom();
      room.addCharacter(player);
      player.pcData.learned.set(SPELL_ID.CURE_LIGHT, 100);
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(1);

      doCast(player, "'cure light'");
      expect(player.hit).toBeGreaterThan(10);
      vi.restoreAllMocks();
    });
  });

  describe('doCast() – buff spells', () => {
    it('should apply sanctuary affect', () => {
      const player = makePlayer();
      const room = makeRoom();
      room.addCharacter(player);
      player.pcData.learned.set(SPELL.SANCTUARY, 100);
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(1);

      doCast(player, "'sanctuary'");
      expect(player.affects.some(a => a.type === SPELL.SANCTUARY)).toBe(true);
      expect(player.isAffected(AFF.SANCTUARY)).toBe(true);
      vi.restoreAllMocks();
    });

    it('should apply fly affect', () => {
      const player = makePlayer();
      const room = makeRoom();
      room.addCharacter(player);
      player.pcData.learned.set(SPELL.FLY, 100);
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(1);

      doCast(player, "'fly'");
      expect(player.isAffected(AFF.FLYING)).toBe(true);
      vi.restoreAllMocks();
    });
  });

  describe('doCast() – debuff spells (saving throw)', () => {
    it('should apply blindness when target fails save', () => {
      const player = makePlayer();
      const room = makeRoom();
      const victim = makeVictim();
      room.addCharacter(player);
      room.addCharacter(victim);
      player.pcData.learned.set(SPELL.BLINDNESS, 100);
      // Always succeed proficiency (1), always fail save (99)
      let callCount = 0;
      vi.spyOn(Dice, 'numberPercent').mockImplementation(() => {
        callCount++;
        // First call is proficiency check in doCast (need <= learned)
        if (callCount === 1) return 1;
        // Second call is saving throw (need < saveChance to save, so 99 = fail)
        return 99;
      });

      doCast(player, "'blindness' TestMob");
      expect(victim.isAffected(AFF.BLIND)).toBe(true);
      vi.restoreAllMocks();
    });
  });
});
