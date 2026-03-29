import { describe, it, expect, beforeEach } from 'vitest';
import { CombatEngine } from '../../src/game/combat/CombatEngine.js';
import { DamageCalculator } from '../../src/game/combat/DamageCalculator.js';
import { DeathHandler } from '../../src/game/combat/DeathHandler.js';
import { Player } from '../../src/game/entities/Player.js';
import { Mobile } from '../../src/game/entities/Mobile.js';
import { Room } from '../../src/game/entities/Room.js';
import { Position, Sex, ItemType, DamageType, WearLocation } from '../../src/game/entities/types.js';
import type { MobilePrototype, ObjectPrototype } from '../../src/game/entities/types.js';
import { EventBus, GameEvent } from '../../src/core/EventBus.js';
import { Logger, LogLevel } from '../../src/utils/Logger.js';
import { VnumRegistry } from '../../src/game/world/VnumRegistry.js';
import { GameObject } from '../../src/game/entities/GameObject.js';

// =============================================================================
// Helpers
// =============================================================================

function makePlayer(overrides?: Record<string, unknown>): Player {
  const p = new Player({
    id: 'player_1',
    name: 'Hero',
    level: 15,
    hit: 200,
    maxHit: 200,
    mana: 100,
    maxMana: 100,
    move: 100,
    maxMove: 100,
    position: Position.Standing,
    permStats: { str: 18, int: 14, wis: 13, dex: 16, con: 15, cha: 12, lck: 10 },
    class_: 'warrior',
    hitroll: 5,
    damroll: 5,
    armor: 50,
    ...overrides,
  });
  (p as any).messages = [] as string[];
  p.sendToChar = (text: string) => { (p as any).messages.push(text); };
  return p;
}

function makeMobProto(overrides?: Partial<MobilePrototype>): MobilePrototype {
  return {
    vnum: 3000,
    name: 'a troll',
    shortDesc: 'a troll',
    longDesc: 'A large troll stands here.',
    description: 'A fearsome troll.',
    actFlags: 0n,
    affectedBy: 0n,
    alignment: -500,
    level: 10,
    hitroll: 3,
    damroll: 4,
    hitDice: { num: 5, size: 10, bonus: 50 },
    damageDice: { num: 2, size: 6, bonus: 3 },
    gold: 200,
    exp: 500,
    sex: Sex.Male,
    position: Position.Standing,
    defaultPosition: Position.Standing,
    race: 'troll',
    class: 'warrior',
    savingThrows: [0, 0, 0, 0, 0],
    resistant: 0n,
    immune: 0n,
    susceptible: 0n,
    speaks: 0,
    speaking: 0,
    numAttacks: 2,
    extraDescriptions: [],
    shop: null,
    repairShop: null,
    ...overrides,
  };
}

function makeWeaponProto(): ObjectPrototype {
  return {
    vnum: 100,
    name: 'a longsword',
    shortDesc: 'a longsword',
    longDesc: 'A longsword lies here.',
    description: 'A fine longsword.',
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 3, 8, DamageType.Slash, 0, 0],
    weight: 8,
    cost: 200,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [],
    affects: [],
  };
}

describe('Integration: Combat Round', () => {
  let engine: CombatEngine;
  let eventBus: EventBus;
  let logger: Logger;
  let vnumRegistry: VnumRegistry;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger(LogLevel.Error);
    vnumRegistry = new VnumRegistry();
    const damageCalc = new DamageCalculator();
    const deathHandler = new DeathHandler(eventBus, logger, vnumRegistry);
    engine = new CombatEngine(eventBus, logger, damageCalc, deathHandler);
    Mobile.resetInstanceCounter();
    GameObject.resetCounters();
  });

  it('should complete a full combat round: player attacks mob', () => {
    const player = makePlayer();
    const mob = new Mobile(makeMobProto());
    const room = new Room(1000, 'Battle Room', 'A dark battle room.');
    room.addCharacter(player);
    room.addCharacter(mob);

    // Equip player with weapon
    const weapon = new GameObject(makeWeaponProto());
    player.equipment.set(WearLocation.Wield, weapon);

    // Start combat
    engine.startCombat(player, mob);

    expect(player.fighting).toBe(mob);
    expect(mob.fighting).toBe(player);

    // Run a violence update round
    engine.violenceUpdate([player, mob]);

    // Both should have generated messages
    expect((player as any).messages.length).toBeGreaterThan(0);
  });

  it('should handle mob death during combat', () => {
    const player = makePlayer({ hitroll: 20, damroll: 50, level: 50, exp: 0 });
    const mob = new Mobile(makeMobProto({
      hitDice: { num: 1, size: 1, bonus: 1 }, // Very low HP
      level: 2,
    }));
    const room = new Room(1000, 'Battle Room', 'A dark battle room.');
    room.addCharacter(player);
    room.addCharacter(mob);

    const weapon = new GameObject(makeWeaponProto());
    player.equipment.set(WearLocation.Wield, weapon);

    engine.startCombat(player, mob);

    // Run violence updates until mob dies
    let died = false;
    for (let round = 0; round < 20; round++) {
      if (mob.position === Position.Dead) {
        died = true;
        break;
      }
      engine.violenceUpdate([player, mob]);
    }

    expect(died).toBe(true);
    expect(room.characters).not.toContain(mob);
    // Player should have gained XP
    expect(player.exp).toBeGreaterThan(0);
  });

  it('should emit combat events', () => {
    const player = makePlayer();
    const mob = new Mobile(makeMobProto());
    const room = new Room(1000, 'Battle Room', 'A dark battle room.');
    room.addCharacter(player);
    room.addCharacter(mob);

    const events: string[] = [];
    eventBus.on(GameEvent.CombatStart, () => events.push('start'));
    eventBus.on(GameEvent.CombatDamage, () => events.push('damage'));

    engine.startCombat(player, mob);
    engine.violenceUpdate([player, mob]);

    expect(events).toContain('start');
    expect(events).toContain('damage');
  });

  it('should create corpse with inventory when NPC dies', () => {
    const player = makePlayer({ hitroll: 20, damroll: 100, level: 50 });
    const mob = new Mobile(makeMobProto({
      hitDice: { num: 1, size: 1, bonus: 1 },
      gold: 500,
    }));
    const room = new Room(1000, 'Battle Room', 'A dark battle room.');
    room.addCharacter(player);
    room.addCharacter(mob);

    // Give mob an item
    const mobItem = new GameObject(makeWeaponProto());
    mob.inventory.push(mobItem);
    mobItem.carriedBy = mob;

    const weapon = new GameObject(makeWeaponProto());
    player.equipment.set(WearLocation.Wield, weapon);

    engine.startCombat(player, mob);

    // Kill the mob
    for (let round = 0; round < 50; round++) {
      if (mob.position === Position.Dead) break;
      engine.violenceUpdate([player, mob]);
    }

    // Should have a corpse in the room
    const corpse = room.contents.find(
      (c: any) => c.itemType === ItemType.Corpse_NPC
    ) as GameObject | undefined;

    expect(corpse).toBeDefined();
    if (corpse) {
      // Corpse should contain the mob's item
      expect(corpse.contents.length).toBeGreaterThanOrEqual(1);
      expect(corpse.values[0]).toBe(500); // gold transferred
    }
  });

  it('should stop fighting if characters are separated', () => {
    const player = makePlayer();
    const mob = new Mobile(makeMobProto());
    const roomA = new Room(1000, 'Room A', 'Room A.');
    const roomB = new Room(1001, 'Room B', 'Room B.');
    roomA.addCharacter(player);
    roomA.addCharacter(mob);

    engine.startCombat(player, mob);

    // Move mob to different room
    roomA.removeCharacter(mob);
    roomB.addCharacter(mob);

    engine.violenceUpdate([player, mob]);

    expect(player.fighting).toBeNull();
    expect(player.position).toBe(Position.Standing);
  });
});
