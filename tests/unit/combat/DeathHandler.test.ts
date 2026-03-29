import { describe, it, expect, beforeEach } from 'vitest';
import { DeathHandler } from '../../../src/game/combat/DeathHandler.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Mobile } from '../../../src/game/entities/Mobile.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Position, ItemType, WearLocation, Sex } from '../../../src/game/entities/types.js';
import type { MobilePrototype, ObjectPrototype } from '../../../src/game/entities/types.js';
import { EventBus } from '../../../src/core/EventBus.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';

// =============================================================================
// Helpers
// =============================================================================

function makePlayer(init?: Partial<CharacterInit>): Player {
  return new Player({
    id: 'player_1',
    name: 'TestPlayer',
    level: 10,
    hit: 100,
    maxHit: 100,
    position: Position.Standing,
    gold: 500,
    exp: 10000,
    ...init,
  });
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
    hitDice: { num: 3, size: 8, bonus: 20 },
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
    values: [0, 1, 4, 11, 0, 0],
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

describe('DeathHandler', () => {
  let handler: DeathHandler;
  let eventBus: EventBus;
  let logger: Logger;
  let vnumRegistry: VnumRegistry;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger(LogLevel.Error);
    vnumRegistry = new VnumRegistry();
    handler = new DeathHandler(eventBus, logger, vnumRegistry);
    Mobile.resetInstanceCounter();
    GameObject.resetCounters();
  });

  // ===========================================================================
  // makeCorpse
  // ===========================================================================

  describe('makeCorpse', () => {
    it('should create a PC corpse with correct item type', () => {
      const player = makePlayer();
      const room = makeRoom(1000);
      room.addCharacter(player);

      const corpse = handler.makeCorpse(player);

      expect(corpse.itemType).toBe(ItemType.Corpse_PC);
      expect(corpse.timer).toBe(25);
    });

    it('should create an NPC corpse with correct item type', () => {
      const mob = new Mobile(makeMobProto());
      const room = makeRoom(1000);
      room.addCharacter(mob);

      const corpse = handler.makeCorpse(mob);

      expect(corpse.itemType).toBe(ItemType.Corpse_NPC);
      expect(corpse.timer).toBe(6);
    });

    it('should transfer inventory to corpse', () => {
      const player = makePlayer();
      const room = makeRoom(1000);
      room.addCharacter(player);

      const item = new GameObject(makeObjProto());
      player.inventory.push(item);
      item.carriedBy = player;

      const corpse = handler.makeCorpse(player);

      expect(corpse.contents.length).toBe(1);
      expect(corpse.contents[0]).toBe(item);
      expect(player.inventory.length).toBe(0);
    });

    it('should transfer equipment to corpse', () => {
      const player = makePlayer();
      const room = makeRoom(1000);
      room.addCharacter(player);

      const weapon = new GameObject(makeObjProto());
      weapon.wearLocation = WearLocation.Wield;
      player.equipment.set(WearLocation.Wield, weapon);

      const corpse = handler.makeCorpse(player);

      expect(corpse.contents.length).toBe(1);
      expect(corpse.contents[0]).toBe(weapon);
      expect(player.equipment.get(WearLocation.Wield)).toBeUndefined();
    });

    it('should transfer gold to corpse', () => {
      const player = makePlayer({ gold: 1000 });
      const room = makeRoom(1000);
      room.addCharacter(player);

      const corpse = handler.makeCorpse(player);

      expect(corpse.values[0]).toBe(1000);
      expect(player.gold).toBe(0);
    });

    it('should place corpse in room', () => {
      const player = makePlayer();
      const room = makeRoom(1000);
      room.addCharacter(player);

      const corpse = handler.makeCorpse(player);

      expect(room.contents).toContain(corpse);
    });
  });

  // ===========================================================================
  // handlePlayerDeath
  // ===========================================================================

  describe('handlePlayerDeath', () => {
    it('should teleport player to recall room', () => {
      const recallRoom = makeRoom(3001);
      vnumRegistry.registerRoom(3001, recallRoom);

      const player = makePlayer();
      const room = makeRoom(1000);
      room.addCharacter(player);

      const corpse = handler.makeCorpse(player);
      handler.handlePlayerDeath(null, player, corpse);

      expect(player.inRoom).toBe(recallRoom);
      expect(recallRoom.characters).toContain(player);
    });

    it('should restore HP to 1', () => {
      const recallRoom = makeRoom(3001);
      vnumRegistry.registerRoom(3001, recallRoom);

      const player = makePlayer({ hit: -10 });
      const room = makeRoom(1000);
      room.addCharacter(player);

      const corpse = handler.makeCorpse(player);
      handler.handlePlayerDeath(null, player, corpse);

      expect(player.hit).toBe(1);
      expect(player.mana).toBe(1);
      expect(player.move).toBe(1);
      expect(player.position).toBe(Position.Resting);
    });

    it('should lose XP on death', () => {
      const recallRoom = makeRoom(3001);
      vnumRegistry.registerRoom(3001, recallRoom);

      const player = makePlayer({ exp: 10000 });
      const room = makeRoom(1000);
      room.addCharacter(player);

      const corpse = handler.makeCorpse(player);
      handler.handlePlayerDeath(null, player, corpse);

      expect(player.exp).toBeLessThan(10000);
    });

    it('should increment pdeaths counter', () => {
      const recallRoom = makeRoom(3001);
      vnumRegistry.registerRoom(3001, recallRoom);

      const player = makePlayer();
      const room = makeRoom(1000);
      room.addCharacter(player);

      const corpse = handler.makeCorpse(player);
      handler.handlePlayerDeath(null, player, corpse);

      expect(player.pcData.pdeaths).toBe(1);
    });
  });

  // ===========================================================================
  // handleNPCDeath
  // ===========================================================================

  describe('handleNPCDeath', () => {
    it('should award XP to killer', () => {
      const killer = makePlayer({ exp: 0 });
      const mob = new Mobile(makeMobProto({ level: 5 }));
      const room = makeRoom(1000);
      room.addCharacter(killer);
      room.addCharacter(mob);

      handler.handleNPCDeath(killer, mob);

      expect(killer.exp).toBeGreaterThan(0);
    });

    it('should remove mob from room', () => {
      const killer = makePlayer();
      const mob = new Mobile(makeMobProto());
      const room = makeRoom(1000);
      room.addCharacter(killer);
      room.addCharacter(mob);

      handler.handleNPCDeath(killer, mob);

      expect(room.characters).not.toContain(mob);
    });

    it('should increment mkills counter', () => {
      const killer = makePlayer();
      const mob = new Mobile(makeMobProto());
      const room = makeRoom(1000);
      room.addCharacter(killer);
      room.addCharacter(mob);

      handler.handleNPCDeath(killer, mob);

      expect(killer.pcData.mkills).toBe(1);
    });
  });

  // ===========================================================================
  // calculateXPAward
  // ===========================================================================

  describe('calculateXPAward', () => {
    it('should return positive XP', () => {
      const killer = makePlayer({ level: 10 });
      const mob = new Mobile(makeMobProto({ level: 10 }));

      const xp = handler.calculateXPAward(killer, mob);
      expect(xp).toBeGreaterThan(0);
    });

    it('should give bonus XP for higher-level victims', () => {
      const killer = makePlayer({ level: 5 });
      const mobHigh = new Mobile(makeMobProto({ level: 15 }));
      const mobEqual = new Mobile(makeMobProto({ level: 5 }));

      const xpHigh = handler.calculateXPAward(killer, mobHigh);
      const xpEqual = handler.calculateXPAward(killer, mobEqual);
      expect(xpHigh).toBeGreaterThan(xpEqual);
    });

    it('should give reduced XP for much lower-level victims', () => {
      const killer = makePlayer({ level: 20 });
      const mobLow = new Mobile(makeMobProto({ level: 5 }));
      const mobEqual = new Mobile(makeMobProto({ level: 20 }));

      const xpLow = handler.calculateXPAward(killer, mobLow);
      const xpEqual = handler.calculateXPAward(killer, mobEqual);
      expect(xpLow).toBeLessThan(xpEqual);
    });

    it('should give alignment bonus for good vs evil', () => {
      const killer = makePlayer({ level: 10, alignment: 1000 });
      const evilMob = new Mobile(makeMobProto({ level: 10, alignment: -1000 }));
      const neutralMob = new Mobile(makeMobProto({ level: 10, alignment: 0 }));

      const xpEvil = handler.calculateXPAward(killer, evilMob);
      const xpNeutral = handler.calculateXPAward(killer, neutralMob);
      expect(xpEvil).toBeGreaterThan(xpNeutral);
    });
  });
});
