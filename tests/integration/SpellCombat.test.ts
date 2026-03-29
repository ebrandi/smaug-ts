import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { doCast, calculateManaCost } from '../../src/game/spells/SpellEngine.js';
import { findSpell, SPELL_ID } from '../../src/game/spells/SpellRegistry.js';
import { Player } from '../../src/game/entities/Player.js';
import { Character, type CharacterInit } from '../../src/game/entities/Character.js';
import { Affect } from '../../src/game/entities/Affect.js';
import { Room } from '../../src/game/entities/Room.js';
import { Position, AFF, ApplyType } from '../../src/game/entities/types.js';
import { SPELL } from '../../src/game/affects/AffectRegistry.js';
import * as Dice from '../../src/utils/Dice.js';

class TestNpc extends Character {
  messages: string[] = [];
  get isNpc(): boolean { return true; }
  sendToChar(text: string): void { this.messages.push(text); }
}

function makePlayer(init?: Partial<CharacterInit>): Player {
  const p = new Player(
    {
      name: 'Gandalf',
      level: 30,
      mana: 500,
      maxMana: 500,
      hit: 200,
      maxHit: 200,
      position: Position.Standing,
      permStats: { str: 15, int: 18, wis: 14, dex: 12, con: 13, cha: 10, lck: 9 },
      ...init,
    },
  );
  (p as unknown as { messages: string[] }).messages = [];
  p.sendToChar = function (text: string) {
    (this as unknown as { messages: string[] }).messages.push(text);
  };
  return p;
}

function getMessages(ch: Character): string[] {
  return (ch as unknown as { messages: string[] }).messages ?? [];
}

function makeMob(init?: Partial<CharacterInit>): TestNpc {
  return new TestNpc({
    name: 'Orc',
    level: 15,
    hit: 200,
    maxHit: 200,
    position: Position.Standing,
    savingSpell: 0,
    ...init,
  });
}

describe('Integration: Spell Combat', () => {
  let player: Player;
  let mob: TestNpc;
  let room: Room;

  beforeEach(() => {
    player = makePlayer();
    mob = makeMob();
    room = new Room(2000, 'Battle Arena', 'A fierce arena.');
    room.addCharacter(player);
    room.addCharacter(mob);

    // Learn fireball at 100%
    player.pcData.learned.set(SPELL_ID.FIREBALL, 100);
    // Proficiency always succeeds
    vi.spyOn(Dice, 'numberPercent').mockReturnValue(1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should cast fireball at mob, verify damage, and deduct mana', () => {
    const startHp = mob.hit;
    const startMana = player.mana;

    doCast(player, "'fireball' Orc");

    // Damage dealt
    expect(mob.hit).toBeLessThan(startHp);
    // Mana deducted
    const spell = findSpell('fireball')!;
    const expectedCost = calculateManaCost(spell, player);
    expect(player.mana).toBe(startMana - expectedCost);
    // Player got a message about damage
    expect(getMessages(player).some(m => m.includes('hits') && m.includes('Orc'))).toBe(true);
    // Mob got hit message
    expect(mob.messages.some(m => m.includes('hits you'))).toBe(true);
  });

  it('should deal less damage when mob makes saving throw', () => {
    // First: always fail save (high roll) → full damage
    let callIdx = 0;
    vi.spyOn(Dice, 'numberPercent').mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return 1; // proficiency
      return 99; // save fail
    });

    doCast(player, "'fireball' Orc");
    const fullDamageHp = mob.hit;

    // Reset
    mob.hit = 200;
    player.mana = 500;
    (player as unknown as { messages: string[] }).messages = [];
    mob.messages = [];
    callIdx = 0;

    // Now: always make save (low roll) → half damage
    vi.spyOn(Dice, 'numberPercent').mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return 1;
      return 1; // save succeeds
    });

    doCast(player, "'fireball' Orc");
    const halfDamageHp = mob.hit;

    // With saving throw, mob should have more HP remaining
    expect(halfDamageHp).toBeGreaterThanOrEqual(fullDamageHp);
  });

  it('should apply poison debuff on failed save and strip with cure poison', () => {
    player.pcData.learned.set(SPELL.POISON, 100);
    player.pcData.learned.set(SPELL_ID.CURE_POISON, 100);

    let callIdx = 0;
    vi.spyOn(Dice, 'numberPercent').mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return 1;
      return 99; // save fail
    });

    doCast(player, "'poison' Orc");
    expect(mob.isAffected(AFF.POISON)).toBe(true);

    // Cure poison
    callIdx = 0;
    player.mana = 500;
    doCast(player, "'cure poison' Orc");
    expect(mob.isAffected(AFF.POISON)).toBe(false);
  });

  it('should apply sanctuary buff and then dispel it', () => {
    player.pcData.learned.set(SPELL.SANCTUARY, 100);
    player.pcData.learned.set(SPELL_ID.DISPEL_MAGIC, 100);

    doCast(player, "'sanctuary'");
    expect(player.isAffected(AFF.SANCTUARY)).toBe(true);

    // Dispel on a mob with sanctuary
    const mob2 = makeMob({ name: 'BuffedOrc' });
    room.addCharacter(mob2);
    const sanctAff = new Affect(SPELL.SANCTUARY, 10, ApplyType.None, 0, AFF.SANCTUARY);
    mob2.applyAffect(sanctAff);
    expect(mob2.isAffected(AFF.SANCTUARY)).toBe(true);

    let callIdx = 0;
    vi.spyOn(Dice, 'numberPercent').mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return 1;
      return 99; // save fail
    });

    player.mana = 500;
    doCast(player, "'dispel magic' BuffedOrc");
    expect(mob2.affects.length).toBe(0);
  });

  it('should handle earthquake (area damage) affecting multiple mobs', () => {
    player.pcData.learned.set(SPELL_ID.EARTHQUAKE, 100);
    const mob2 = makeMob({ name: 'Troll' });
    room.addCharacter(mob2);

    const startHpMob = mob.hit;
    const startHpMob2 = mob2.hit;

    doCast(player, "'earthquake'");

    expect(mob.hit).toBeLessThan(startHpMob);
    expect(mob2.hit).toBeLessThan(startHpMob2);
  });

  it('full combat flow: multiple spell casts deplete mana', () => {
    player.pcData.learned.set(SPELL_ID.MAGIC_MISSILE, 100);

    for (let i = 0; i < 5; i++) {
      if (player.mana <= 0) break;
      mob.hit = 200; // Reset mob HP
      doCast(player, "'magic missile' Orc");
    }

    expect(player.mana).toBeLessThan(500);
  });
});
