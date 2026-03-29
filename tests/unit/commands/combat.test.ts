import { describe, it, expect, beforeEach } from 'vitest';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Mobile } from '../../../src/game/entities/Mobile.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Position, DamageType, WearLocation, ItemType, Sex } from '../../../src/game/entities/types.js';
import type { MobilePrototype, ObjectPrototype } from '../../../src/game/entities/types.js';
import {
  doKill, doMurder, doWimpy, doBackstab, doBash, doDisarm,
  setCombatEngine,
} from '../../../src/game/commands/combat.js';
import { CombatEngine } from '../../../src/game/combat/CombatEngine.js';
import { DamageCalculator } from '../../../src/game/combat/DamageCalculator.js';
import { DeathHandler } from '../../../src/game/combat/DeathHandler.js';
import { EventBus } from '../../../src/core/EventBus.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';

// =============================================================================
// Helpers
// =============================================================================

function makePlayer(init?: Partial<CharacterInit>): Player {
  const p = new Player({
    id: `player_${Math.random().toString(36).slice(2)}`,
    name: 'TestPlayer',
    level: 10,
    hit: 100,
    maxHit: 100,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    class_: 'warrior',
    ...init,
  });
  // Capture messages
  (p as any).messages = [] as string[];
  const origSend = p.sendToChar.bind(p);
  p.sendToChar = (text: string) => {
    (p as any).messages.push(text);
  };
  return p;
}

function getMessages(p: Player): string[] {
  return (p as any).messages ?? [];
}

function makeMobProto(overrides?: Partial<MobilePrototype>): MobilePrototype {
  return {
    vnum: 3000,
    name: 'a goblin',
    shortDesc: 'a goblin',
    longDesc: 'A goblin stands here.',
    description: 'A small goblin.',
    actFlags: 0n,
    affectedBy: 0n,
    alignment: -500,
    level: 5,
    hitroll: 2,
    damroll: 3,
    hitDice: { num: 3, size: 8, bonus: 50 },
    damageDice: { num: 1, size: 6, bonus: 2 },
    gold: 100,
    exp: 200,
    sex: Sex.Male,
    position: Position.Standing,
    defaultPosition: Position.Standing,
    race: 'goblin',
    class: 'warrior',
    savingThrows: [0, 0, 0, 0, 0],
    resistant: 0n,
    immune: 0n,
    susceptible: 0n,
    speaks: 0,
    speaking: 0,
    numAttacks: 1,
    extraDescriptions: [],
    shop: null,
    repairShop: null,
    ...overrides,
  };
}

function makeObjProto(overrides?: Partial<ObjectPrototype>): ObjectPrototype {
  return {
    vnum: 100,
    name: 'a dagger',
    shortDesc: 'a dagger',
    longDesc: 'A dagger lies here.',
    description: 'A sharp dagger.',
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 1, 4, DamageType.Pierce, 0, 0],
    weight: 2,
    cost: 50,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [],
    affects: [],
    ...overrides,
  };
}

function makeRoom(vnum: number): Room {
  return new Room(vnum, `Room ${vnum}`, `Description ${vnum}`);
}

describe('Combat Commands', () => {
  let engine: CombatEngine;

  beforeEach(() => {
    const eventBus = new EventBus();
    const logger = new Logger(LogLevel.Error);
    const damageCalc = new DamageCalculator();
    const vnumRegistry = new VnumRegistry();
    const deathHandler = new DeathHandler(eventBus, logger, vnumRegistry);
    engine = new CombatEngine(eventBus, logger, damageCalc, deathHandler);
    setCombatEngine(engine);
    Mobile.resetInstanceCounter();
    GameObject.resetCounters();
  });

  // ===========================================================================
  // doKill
  // ===========================================================================

  describe('doKill', () => {
    it('should initiate combat with an NPC', () => {
      const player = makePlayer();
      const mob = new Mobile(makeMobProto({ name: 'goblin' }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      doKill(player, 'goblin');

      expect(player.fighting).toBe(mob);
      expect(player.position).toBe(Position.Fighting);
    });

    it('should reject player targets', () => {
      const player1 = makePlayer({ name: 'Alice' });
      const player2 = makePlayer({ name: 'Bob' });
      const room = makeRoom(1000);
      room.addCharacter(player1);
      room.addCharacter(player2);

      doKill(player1, 'Bob');

      expect(player1.fighting).toBeNull();
      expect(getMessages(player1).some(m => m.includes('MURDER'))).toBe(true);
    });

    it('should show error when no argument given', () => {
      const player = makePlayer();
      doKill(player, '');
      expect(getMessages(player).some(m => m.includes('whom'))).toBe(true);
    });

    it('should show error when target not found', () => {
      const player = makePlayer();
      const room = makeRoom(1000);
      room.addCharacter(player);

      doKill(player, 'dragon');
      expect(getMessages(player).some(m => m.includes("aren't here"))).toBe(true);
    });

    it('should reject killing yourself', () => {
      const player = makePlayer({ name: 'TestPlayer', keywords: ['testplayer'] });
      const room = makeRoom(1000);
      room.addCharacter(player);

      // Can't find self since findCharInRoom skips ch === self
      doKill(player, 'TestPlayer');
      expect(player.fighting).toBeNull();
    });
  });

  // ===========================================================================
  // doMurder
  // ===========================================================================

  describe('doMurder', () => {
    it('should work against NPCs', () => {
      const player = makePlayer();
      const mob = new Mobile(makeMobProto({ name: 'goblin' }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      doMurder(player, 'goblin');

      expect(player.fighting).toBe(mob);
    });
  });

  // ===========================================================================
  // doWimpy
  // ===========================================================================

  describe('doWimpy', () => {
    it('should set wimpy threshold', () => {
      const player = makePlayer({ maxHit: 100 });
      doWimpy(player, '30');
      expect(player.wimpy).toBe(30);
    });

    it('should show current wimpy with no arg', () => {
      const player = makePlayer();
      player.wimpy = 25;
      doWimpy(player, '');
      expect(getMessages(player).some(m => m.includes('25'))).toBe(true);
    });

    it('should reject wimpy above half max HP', () => {
      const player = makePlayer({ maxHit: 100 });
      doWimpy(player, '60');
      expect(player.wimpy).toBe(0); // unchanged
      expect(getMessages(player).some(m => m.includes('cannot exceed'))).toBe(true);
    });
  });

  // ===========================================================================
  // doBackstab
  // ===========================================================================

  describe('doBackstab', () => {
    it('should require a piercing weapon', () => {
      const player = makePlayer();
      const mob = new Mobile(makeMobProto({ name: 'goblin' }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      // No weapon
      doBackstab(player, 'goblin');
      expect(getMessages(player).some(m => m.includes('need a weapon'))).toBe(true);
    });

    it('should deal multiplied damage on success', () => {
      const player = makePlayer({ level: 25 });
      const mob = new Mobile(makeMobProto({ name: 'goblin', hitDice: { num: 10, size: 10, bonus: 500 } }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      const weapon = new GameObject(makeObjProto());
      weapon.wearLocation = WearLocation.Wield;
      player.equipment.set(WearLocation.Wield, weapon);

      const hpBefore = mob.hit;
      // Run multiple times to get at least one success
      let dealt = false;
      for (let i = 0; i < 50; i++) {
        player.fighting = null;
        player.position = Position.Standing;
        mob.fighting = null;
        mob.position = Position.Standing;
        mob.hit = hpBefore;

        doBackstab(player, 'goblin');
        if (mob.hit < hpBefore) {
          dealt = true;
          break;
        }
      }
      expect(dealt).toBe(true);
    });
  });

  // ===========================================================================
  // doBash
  // ===========================================================================

  describe('doBash', () => {
    it('should stun victim on success', () => {
      const player = makePlayer({ level: 50 }); // high level = high chance
      const mob = new Mobile(makeMobProto({ name: 'goblin', hitDice: { num: 10, size: 10, bonus: 500 } }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      let stunned = false;
      for (let i = 0; i < 50; i++) {
        mob.position = Position.Standing;
        mob.hit = 500;
        player.position = Position.Standing;
        player.fighting = null;

        doBash(player, 'goblin');
        if (mob.position === Position.Stunned) {
          stunned = true;
          break;
        }
      }
      expect(stunned).toBe(true);
    });

    it('should knock down attacker on fail', () => {
      // Very low level = high fail chance
      const player = makePlayer({ level: 1 });
      const mob = new Mobile(makeMobProto({ name: 'goblin', hitDice: { num: 10, size: 10, bonus: 500 } }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      let fell = false;
      for (let i = 0; i < 100; i++) {
        player.position = Position.Standing;
        player.fighting = null;

        doBash(player, 'goblin');
        if (player.position === Position.Sitting) {
          fell = true;
          break;
        }
      }
      expect(fell).toBe(true);
    });
  });

  // ===========================================================================
  // doDisarm
  // ===========================================================================

  describe('doDisarm', () => {
    it('should require opponent to be wielding a weapon', () => {
      const player = makePlayer();
      const mob = new Mobile(makeMobProto({ name: 'goblin' }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      engine.startCombat(player, mob);

      const weapon = new GameObject(makeObjProto());
      player.equipment.set(WearLocation.Wield, weapon);

      doDisarm(player, '');

      expect(getMessages(player).some(m => m.includes('not wielding'))).toBe(true);
    });

    it('should drop weapon to room on success', () => {
      const player = makePlayer({ level: 50 });
      const mob = new Mobile(makeMobProto({ name: 'goblin' }));
      const room = makeRoom(1000);
      room.addCharacter(player);
      room.addCharacter(mob);

      engine.startCombat(player, mob);

      const playerWeapon = new GameObject(makeObjProto({ name: 'player sword' }));
      player.equipment.set(WearLocation.Wield, playerWeapon);

      const mobWeapon = new GameObject(makeObjProto({ name: 'goblin axe', weight: 1 }));
      mob.equipment.set(WearLocation.Wield, mobWeapon);

      let disarmed = false;
      for (let i = 0; i < 100; i++) {
        mob.equipment.set(WearLocation.Wield, mobWeapon);
        room.contents = room.contents.filter(c => c !== mobWeapon);

        doDisarm(player, '');
        if (!mob.equipment.get(WearLocation.Wield)) {
          disarmed = true;
          break;
        }
      }
      expect(disarmed).toBe(true);
      expect(room.contents).toContain(mobWeapon);
    });
  });

  // --- PARITY: Missing test stubs ---
  it.todo('doBerserk — should enter berserk stance with HP/hitroll bonuses');
  it.todo('doBloodlet — should implement vampire bloodlet attack');
  it.todo('doCleave — should implement cleave with two-handed weapon check');
  it.todo('doDraw — should implement archery draw command');
  it.todo('doPoisonWeapon — should apply poison to wielded weapon');
  it.todo('doPounce — should implement pounce attack from standing');
  it.todo('doSlice — should implement slice attack in combat');


});
