import { describe, it, expect, beforeEach } from 'vitest';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';
import { Room } from '../../../src/game/entities/Room.js';
import type { MobilePrototype, ObjectPrototype } from '../../../src/game/entities/types.js';
import { Sex, Position, ItemType, ApplyType } from '../../../src/game/entities/types.js';

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
    level: 1,
    hitroll: 0,
    damroll: 0,
    hitDice: { num: 1, size: 8, bonus: 10 },
    damageDice: { num: 1, size: 4, bonus: 0 },
    gold: 0,
    exp: 0,
    sex: Sex.Neutral,
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
    description: '',
    itemType: ItemType.Trash,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 0, 0, 0],
    weight: 1,
    cost: 0,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [],
    affects: [],
  };
}

describe('VnumRegistry', () => {
  let registry: VnumRegistry;

  beforeEach(() => {
    registry = new VnumRegistry();
  });

  describe('rooms', () => {
    it('should register and retrieve a room', () => {
      const room = new Room(3001, 'Temple', 'A grand temple.');
      registry.registerRoom(3001, room);
      expect(registry.getRoom(3001)).toBe(room);
    });

    it('should return undefined for unregistered room', () => {
      expect(registry.getRoom(9999)).toBeUndefined();
    });

    it('should throw on duplicate room vnum', () => {
      const room1 = new Room(3001, 'Temple', 'A grand temple.');
      const room2 = new Room(3001, 'Square', 'A town square.');
      registry.registerRoom(3001, room1);
      expect(() => registry.registerRoom(3001, room2)).toThrow('Duplicate room vnum: 3001');
    });

    it('should return all rooms', () => {
      const room1 = new Room(3001, 'Temple', 'A grand temple.');
      const room2 = new Room(3002, 'Square', 'A town square.');
      registry.registerRoom(3001, room1);
      registry.registerRoom(3002, room2);
      const all = registry.getAllRooms();
      expect(all).toHaveLength(2);
      expect(all).toContain(room1);
      expect(all).toContain(room2);
    });

    it('should count rooms', () => {
      expect(registry.getRoomCount()).toBe(0);
      registry.registerRoom(3001, new Room(3001, 'Temple', ''));
      expect(registry.getRoomCount()).toBe(1);
    });
  });

  describe('mobiles', () => {
    it('should register and retrieve a mobile', () => {
      const mob = makeMobProto(3001);
      registry.registerMobile(3001, mob);
      expect(registry.getMobile(3001)).toBe(mob);
    });

    it('should return undefined for unregistered mobile', () => {
      expect(registry.getMobile(9999)).toBeUndefined();
    });

    it('should throw on duplicate mobile vnum', () => {
      registry.registerMobile(3001, makeMobProto(3001));
      expect(() => registry.registerMobile(3001, makeMobProto(3001)))
        .toThrow('Duplicate mobile vnum: 3001');
    });

    it('should return all mobiles', () => {
      const m1 = makeMobProto(3001);
      const m2 = makeMobProto(3002);
      registry.registerMobile(3001, m1);
      registry.registerMobile(3002, m2);
      expect(registry.getAllMobiles()).toHaveLength(2);
    });

    it('should count mobiles', () => {
      expect(registry.getMobileCount()).toBe(0);
      registry.registerMobile(3001, makeMobProto(3001));
      expect(registry.getMobileCount()).toBe(1);
    });
  });

  describe('objects', () => {
    it('should register and retrieve an object', () => {
      const obj = makeObjProto(3001);
      registry.registerObject(3001, obj);
      expect(registry.getObject(3001)).toBe(obj);
    });

    it('should return undefined for unregistered object', () => {
      expect(registry.getObject(9999)).toBeUndefined();
    });

    it('should throw on duplicate object vnum', () => {
      registry.registerObject(3001, makeObjProto(3001));
      expect(() => registry.registerObject(3001, makeObjProto(3001)))
        .toThrow('Duplicate object vnum: 3001');
    });

    it('should return all objects', () => {
      const o1 = makeObjProto(3001);
      const o2 = makeObjProto(3002);
      registry.registerObject(3001, o1);
      registry.registerObject(3002, o2);
      expect(registry.getAllObjects()).toHaveLength(2);
    });

    it('should count objects', () => {
      expect(registry.getObjectCount()).toBe(0);
      registry.registerObject(3001, makeObjProto(3001));
      expect(registry.getObjectCount()).toBe(1);
    });
  });

  describe('getNextFreeVnum', () => {
    it('should find first free vnum in empty registry', () => {
      expect(registry.getNextFreeVnum('room', 100, 200)).toBe(100);
    });

    it('should find gaps in used vnums', () => {
      registry.registerRoom(100, new Room(100, 'R100', ''));
      registry.registerRoom(101, new Room(101, 'R101', ''));
      registry.registerRoom(103, new Room(103, 'R103', ''));
      expect(registry.getNextFreeVnum('room', 100, 200)).toBe(102);
    });

    it('should return null when range is full', () => {
      registry.registerRoom(100, new Room(100, 'R100', ''));
      registry.registerRoom(101, new Room(101, 'R101', ''));
      registry.registerRoom(102, new Room(102, 'R102', ''));
      expect(registry.getNextFreeVnum('room', 100, 102)).toBeNull();
    });

    it('should work for mobile type', () => {
      registry.registerMobile(100, makeMobProto(100));
      expect(registry.getNextFreeVnum('mobile', 100, 200)).toBe(101);
    });

    it('should work for object type', () => {
      registry.registerObject(100, makeObjProto(100));
      expect(registry.getNextFreeVnum('object', 100, 200)).toBe(101);
    });
  });
});
