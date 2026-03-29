import { describe, it, expect, beforeEach } from 'vitest';
import { ResetEngine } from '../../../src/game/world/ResetEngine.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';
import { EventBus } from '../../../src/core/EventBus.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { Area, type ResetData } from '../../../src/game/entities/Area.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Mobile } from '../../../src/game/entities/Mobile.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import type { MobilePrototype, ObjectPrototype } from '../../../src/game/entities/types.js';
import { Sex, Position, ItemType, WearLocation, Direction } from '../../../src/game/entities/types.js';

function makeMobProto(vnum: number): MobilePrototype {
  return {
    vnum,
    name: `mob${vnum}`,
    shortDesc: `a mob ${vnum}`,
    longDesc: `A mob stands here.`,
    description: '',
    actFlags: 0n,
    affectedBy: 0n,
    alignment: 0,
    level: 5,
    hitroll: 2,
    damroll: 3,
    hitDice: { num: 2, size: 8, bonus: 15 },
    damageDice: { num: 1, size: 6, bonus: 1 },
    gold: 10,
    exp: 100,
    sex: Sex.Male,
    position: Position.Standing,
    defaultPosition: Position.Standing,
    race: 'human',
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
  };
}

function makeObjProto(vnum: number): ObjectPrototype {
  return {
    vnum,
    name: `obj${vnum}`,
    shortDesc: `an obj ${vnum}`,
    longDesc: `An object lies here.`,
    description: `A basic object.`,
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 1, 4, 3, 0, 0],
    weight: 3,
    cost: 50,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [],
    affects: [],
  };
}

describe('ResetEngine', () => {
  let vnumRegistry: VnumRegistry;
  let eventBus: EventBus;
  let logger: Logger;
  let engine: ResetEngine;
  let area: Area;
  let room: Room;

  beforeEach(() => {
    vnumRegistry = new VnumRegistry();
    eventBus = new EventBus();
    logger = new Logger(LogLevel.Error);
    engine = new ResetEngine(vnumRegistry, eventBus, logger);

    // Set up an area with a room
    area = new Area('test', 'Test Area', 'Tester');
    room = new Room(1000, 'Test Room', 'A test room.');
    room.area = area;
    area.rooms.set(1000, room);
    vnumRegistry.registerRoom(1000, room);

    // Reset counters
    Mobile.resetInstanceCounter();
    GameObject.resetCounters();
  });

  describe('resetMobile (M command)', () => {
    it('should create mob and place in room', () => {
      const proto = makeMobProto(1000);
      vnumRegistry.registerMobile(1000, proto);
      area.mobilePrototypes.set(1000, proto);

      area.resets = [
        { command: 'M', extra: 0, arg1: 1000, arg2: 1, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
      ];

      engine.resetArea(area);

      expect(room.characters.length).toBe(1);
      expect(room.characters[0]).toBeInstanceOf(Mobile);
      expect((room.characters[0] as Mobile).name).toBe('mob1000');
      expect((room.characters[0] as Mobile).resetRoom).toBe(1000);
    });

    it('should respect max_count', () => {
      const proto = makeMobProto(1000);
      vnumRegistry.registerMobile(1000, proto);
      area.mobilePrototypes.set(1000, proto);

      // Reset with max 1, but try to load twice
      area.resets = [
        { command: 'M', extra: 0, arg1: 1000, arg2: 1, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
        { command: 'M', extra: 0, arg1: 1000, arg2: 1, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
      ];

      engine.resetArea(area);

      // Only 1 mob should be placed due to max_count
      expect(room.characters.length).toBe(1);
    });
  });

  describe('resetObject (O command)', () => {
    it('should create object in room', () => {
      const proto = makeObjProto(1000);
      vnumRegistry.registerObject(1000, proto);

      area.resets = [
        { command: 'O', extra: 0, arg1: 1000, arg2: 1, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
      ];

      engine.resetArea(area);

      expect(room.contents.length).toBe(1);
      expect((room.contents[0] as GameObject).name).toBe('obj1000');
    });
  });

  describe('resetPut (P command)', () => {
    it('should place object in container', () => {
      const containerProto = makeObjProto(1001);
      containerProto.itemType = ItemType.Container;
      vnumRegistry.registerObject(1001, containerProto);

      const innerProto = makeObjProto(1002);
      vnumRegistry.registerObject(1002, innerProto);

      area.resets = [
        { command: 'O', extra: 0, arg1: 1001, arg2: 1, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
        { command: 'P', extra: 0, arg1: 1002, arg2: 1, arg3: 0, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
      ];

      engine.resetArea(area);

      expect(room.contents.length).toBe(1);
      const container = room.contents[0] as GameObject;
      expect(container.contents.length).toBe(1);
      expect(container.contents[0]!.name).toBe('obj1002');
    });
  });

  describe('resetGive (G command)', () => {
    it('should add object to mob inventory', () => {
      const mobProto = makeMobProto(1000);
      vnumRegistry.registerMobile(1000, mobProto);

      const objProto = makeObjProto(1000);
      vnumRegistry.registerObject(1000, objProto);

      area.resets = [
        { command: 'M', extra: 0, arg1: 1000, arg2: 1, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
        { command: 'G', extra: 0, arg1: 1000, arg2: 1, arg3: 0, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
      ];

      engine.resetArea(area);

      const mob = room.characters[0] as Mobile;
      expect(mob.inventory.length).toBe(1);
      expect((mob.inventory[0] as GameObject).name).toBe('obj1000');
    });
  });

  describe('resetEquip (E command)', () => {
    it('should equip object on mob', () => {
      const mobProto = makeMobProto(1000);
      vnumRegistry.registerMobile(1000, mobProto);

      const objProto = makeObjProto(1000);
      vnumRegistry.registerObject(1000, objProto);

      area.resets = [
        { command: 'M', extra: 0, arg1: 1000, arg2: 1, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
        { command: 'E', extra: 0, arg1: 1000, arg2: 1, arg3: 16, arg4: 0, arg5: 0, arg6: 0, arg7: 0 }, // WearLocation.Wield = 16
      ];

      engine.resetArea(area);

      const mob = room.characters[0] as Mobile;
      expect(mob.equipment.has(WearLocation.Wield)).toBe(true);
    });
  });

  describe('resetDoor (D command)', () => {
    it('should set exit flags', () => {
      // Add an exit to the room
      room.exits.set(Direction.North, {
        direction: Direction.North,
        toRoom: 1001,
        keyword: 'door',
        description: 'A door.',
        flags: 0n,
        key: -1,
      });

      area.resets = [
        { command: 'D', extra: 0, arg1: 1000, arg2: 0, arg3: 2, arg4: 0, arg5: 0, arg6: 0, arg7: 0 }, // Lock door north
      ];

      engine.resetArea(area);

      const exit = room.exits.get(Direction.North);
      expect(exit).toBeDefined();
      // Should have closed + locked bits set
      expect(exit!.flags & 1n).toBe(1n); // EX_CLOSED
      expect(exit!.flags & 2n).toBe(2n); // EX_LOCKED
    });
  });

  describe('shouldReset', () => {
    it('should return true when age >= frequency', () => {
      area.resetFrequency = 10;
      area.age = 10;
      expect(engine.shouldReset(area)).toBe(true);
    });

    it('should return false when age < frequency', () => {
      area.resetFrequency = 10;
      area.age = 5;
      expect(engine.shouldReset(area)).toBe(false);
    });
  });

  describe('tickAreas', () => {
    it('should increment area age and reset when due', () => {
      area.resetFrequency = 2;
      area.age = 1; // After tick, age will be 2 = resetFrequency

      const mobProto = makeMobProto(1000);
      vnumRegistry.registerMobile(1000, mobProto);
      area.resets = [
        { command: 'M', extra: 0, arg1: 1000, arg2: 5, arg3: 1000, arg4: 0, arg5: 0, arg6: 0, arg7: 0 },
      ];

      engine.tickAreas([area]);

      // Area should have been reset
      expect(area.age).toBe(0); // resetAge was called
      expect(room.characters.length).toBeGreaterThanOrEqual(1);
    });
  });
});
