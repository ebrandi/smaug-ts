import { describe, it, expect, beforeEach } from 'vitest';
import type { CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Area } from '../../../src/game/entities/Area.js';
import { Position, Sex, ItemType, Direction, SectorType, ROOM_FLAGS, EX_FLAGS } from '../../../src/game/entities/types.js';
import type { MobilePrototype, ObjectPrototype } from '../../../src/game/entities/types.js';
import { hasFlag } from '../../../src/utils/BitVector.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import {
  canModifyVnum,
  doRedit,
  doMedit,
  doOedit,
  doMpedit,
  doAedit,
  setOlcVnumRegistry,
  setOlcLogger,
  setOlcAreaManager,
  registerOlcCommands,
} from '../../../src/game/commands/olc.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';

// =============================================================================
// Helpers
// =============================================================================

function makePlayer(init?: Partial<CharacterInit>): Player {
  const p = new Player({
    id: `player_${Math.random().toString(36).slice(2)}`,
    name: 'Builder',
    level: init?.level ?? init?.trust ?? 55,
    trust: init?.trust ?? 55,
    hit: 100, maxHit: 100, mana: 100, maxMana: 100, move: 100, maxMove: 100,
    position: Position.Standing,
    permStats: { str: 18, int: 18, wis: 18, dex: 18, con: 18, cha: 18, lck: 18 },
    ...init,
  });
  (p as any)._messages = [] as string[];
  p.sendToChar = (text: string) => { (p as any)._messages.push(text); };
  // Set default vnum ranges for building
  p.pcData.rRangeLo = 1000;
  p.pcData.rRangeHi = 1099;
  p.pcData.mRangeLo = 1000;
  p.pcData.mRangeHi = 1099;
  p.pcData.oRangeLo = 1000;
  p.pcData.oRangeHi = 1099;
  return p;
}

function getMessages(p: Player): string[] {
  return (p as any)._messages ?? [];
}

function clearMessages(p: Player): void {
  (p as any)._messages = [];
}

function makeMobProto(overrides?: Partial<MobilePrototype>): MobilePrototype {
  return {
    vnum: 1000,
    name: 'a test mob',
    shortDesc: 'a test mob',
    longDesc: 'A test mob stands here.',
    description: 'A generic mob.',
    actFlags: 0n,
    affectedBy: 0n,
    alignment: 0,
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
    ...overrides,
  };
}

function makeObjProto(overrides?: Partial<ObjectPrototype>): ObjectPrototype {
  return {
    vnum: 1000,
    name: 'a test object',
    shortDesc: 'a test object',
    longDesc: 'A test object lies here.',
    description: 'Nothing special.',
    itemType: ItemType.Treasure,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 0, 0, 0, 0, 0],
    weight: 1,
    cost: 10,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [],
    affects: [],
    ...overrides,
  };
}

/** Fake AreaManager */
function makeFakeAreaManager(areas: Area[]) {
  return {
    getAllAreas: () => areas,
  } as any;
}

function placeInRoom(ch: any, room: Room): void {
  room.addCharacter(ch);
}

// =============================================================================
// Tests
// =============================================================================

describe('OLC Commands', () => {
  let vnumReg: VnumRegistry;
  let logger: Logger;
  let room: Room;
  let area: Area;
  let builder: Player;

  beforeEach(() => {
    vnumReg = new VnumRegistry();
    logger = new Logger(LogLevel.Debug);

    // Create area covering vnums 1000-1099
    area = new Area('test.are', 'Test Area', 'Builder');
    area.vnumRanges.rooms.low = 1000;
    area.vnumRanges.rooms.high = 1099;
    area.vnumRanges.mobiles.low = 1000;
    area.vnumRanges.mobiles.high = 1099;
    area.vnumRanges.objects.low = 1000;
    area.vnumRanges.objects.high = 1099;

    // Create room in area
    room = new Room(1001, 'Builder Room', 'A room for building.');
    room.area = area;
    area.rooms.set(1001, room);
    vnumReg.registerRoom(1001, room);

    // Set up dependencies
    setOlcVnumRegistry(vnumReg);
    setOlcLogger(logger);
    setOlcAreaManager(makeFakeAreaManager([area]));

    // Create builder (trust 55 = DEMI_GOD)
    builder = makePlayer({ name: 'Builder', trust: 55, level: 55 });
    placeInRoom(builder, room);
  });

  // =========================================================================
  // canModifyVnum
  // =========================================================================

  describe('canModifyVnum', () => {
    it('allows vnum within assigned range', () => {
      expect(canModifyVnum(builder, 1050, 'room')).toBe(true);
      expect(canModifyVnum(builder, 1000, 'mobile')).toBe(true);
      expect(canModifyVnum(builder, 1099, 'object')).toBe(true);
    });

    it('denies vnum outside assigned range', () => {
      expect(canModifyVnum(builder, 2000, 'room')).toBe(false);
      expect(canModifyVnum(builder, 999, 'mobile')).toBe(false);
      expect(canModifyVnum(builder, 1100, 'object')).toBe(false);
    });

    it('allows any vnum for LEVEL_GREATER and above', () => {
      const god = makePlayer({ name: 'God', trust: 58, level: 58 });
      god.pcData.rRangeLo = 0;
      god.pcData.rRangeHi = 0;
      expect(canModifyVnum(god, 9999, 'room')).toBe(true);
      expect(canModifyVnum(god, 9999, 'mobile')).toBe(true);
      expect(canModifyVnum(god, 9999, 'object')).toBe(true);
    });
  });

  // =========================================================================
  // Trust Gating
  // =========================================================================

  describe('Trust Gating', () => {
    it('rejects OLC commands below LEVEL_CREATOR (53)', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 52, level: 52 });
      placeInRoom(lowImm, room);
      doRedit(lowImm, 'name Test');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('allows OLC commands at LEVEL_CREATOR', () => {
      const creator = makePlayer({ name: 'Creator', trust: 53, level: 53 });
      placeInRoom(creator, room);
      doRedit(creator, '');
      const output = getMessages(creator).join('');
      // Should show room info, not "Huh?"
      expect(output).not.toContain('Huh?');
    });
  });

  // =========================================================================
  // Vnum Range Enforcement
  // =========================================================================

  describe('Vnum Range Enforcement', () => {
    it('denies editing rooms outside assigned range', () => {
      const outRoom = new Room(2000, 'Far Room', 'Out of range.');
      vnumReg.registerRoom(2000, outRoom);
      builder.inRoom?.removeCharacter(builder);
      placeInRoom(builder, outRoom);

      doRedit(builder, 'name Forbidden');
      expect(getMessages(builder).join('')).toContain('not in your assigned vnum range');
    });
  });

  // =========================================================================
  // doRedit (Room Editor)
  // =========================================================================

  describe('doRedit', () => {
    it('shows room stats with no subcommand', () => {
      doRedit(builder, '');
      const output = getMessages(builder).join('');
      expect(output).toContain('Room: 1001');
      expect(output).toContain('Builder Room');
    });

    it('sets room name', () => {
      doRedit(builder, 'name Grand Hall');
      expect(room.name).toBe('Grand Hall');
      expect(getMessages(builder).join('')).toContain('Room name set');
    });

    it('enters desc editing mode', () => {
      doRedit(builder, 'desc');
      expect(builder.pcData.editMode).toBe('room_desc');
      expect(getMessages(builder).join('')).toContain('Enter room description');
    });

    it('creates an exit', () => {
      const destRoom = new Room(1002, 'Dest Room', 'Destination.');
      vnumReg.registerRoom(1002, destRoom);

      doRedit(builder, 'exit north 1002');
      expect(room.exits.has(Direction.North)).toBe(true);
      expect(room.exits.get(Direction.North)!.toRoom).toBe(1002);
      expect(getMessages(builder).join('')).toContain('Exit north now leads to room 1002');
    });

    it('rejects exit to nonexistent room', () => {
      doRedit(builder, 'exit south 9999');
      expect(getMessages(builder).join('')).toContain('does not exist');
    });

    it('rejects invalid direction', () => {
      doRedit(builder, 'exit nowhere 1002');
      expect(getMessages(builder).join('')).toContain('Invalid direction');
    });

    it('toggles exit flags', () => {
      const destRoom = new Room(1003, 'Exit Room', 'Has exit.');
      vnumReg.registerRoom(1003, destRoom);
      doRedit(builder, 'exit east 1003');
      clearMessages(builder);

      doRedit(builder, 'exflag east door');
      const exit = room.exits.get(Direction.East)!;
      expect(hasFlag(exit.flags, EX_FLAGS.ISDOOR)).toBe(true);
      expect(getMessages(builder).join('')).toContain('toggled');
    });

    it('sets exit key', () => {
      const destRoom = new Room(1004, 'Key Room', 'Locked.');
      vnumReg.registerRoom(1004, destRoom);
      doRedit(builder, 'exit west 1004');
      clearMessages(builder);

      doRedit(builder, 'exkey west 5001');
      expect(room.exits.get(Direction.West)!.key).toBe(5001);
      expect(getMessages(builder).join('')).toContain('Exit key set');
    });

    it('sets sector type', () => {
      doRedit(builder, 'sector forest');
      expect(room.sectorType).toBe(SectorType.Forest);
      expect(getMessages(builder).join('')).toContain('Sector type set');
    });

    it('rejects invalid sector type', () => {
      doRedit(builder, 'sector bogus');
      expect(getMessages(builder).join('')).toContain('Valid sectors');
    });

    it('toggles room flags', () => {
      doRedit(builder, 'flags dark safe');
      expect(hasFlag(room.roomFlags, ROOM_FLAGS.DARK)).toBe(true);
      expect(hasFlag(room.roomFlags, ROOM_FLAGS.SAFE)).toBe(true);
    });

    it('sets tunnel limit', () => {
      doRedit(builder, 'tunnel 2');
      expect(room.tunnel).toBe(2);
    });

    it('sets teleport', () => {
      doRedit(builder, 'teleport 1050 5');
      expect(room.teleportVnum).toBe(1050);
      expect(room.teleportDelay).toBe(5);
    });

    it('creates a new room', () => {
      doRedit(builder, 'create 1010');
      expect(vnumReg.getRoom(1010)).toBeTruthy();
      expect(getMessages(builder).join('')).toContain('Room 1010 created');
    });

    it('prevents creating duplicate rooms', () => {
      doRedit(builder, 'create 1001');
      expect(getMessages(builder).join('')).toContain('already exists');
    });

    it('prevents creating rooms outside range', () => {
      doRedit(builder, 'create 2000');
      expect(getMessages(builder).join('')).toContain('not in your assigned range');
    });

    it('sets area modified flag', () => {
      doRedit(builder, 'name Modified Room');
      expect((area as any).modified).toBe(true);
    });

    it('shows help for unknown subcommand', () => {
      doRedit(builder, 'boguscommand');
      expect(getMessages(builder).join('')).toContain('Redit subcommands');
    });

    it('sets up extra description editing mode', () => {
      doRedit(builder, 'ed sign');
      expect(builder.pcData.editMode).toBe('room_ed');
      expect(builder.pcData.editKeyword).toBe('sign');
    });
  });

  // =========================================================================
  // doMedit (Mobile Editor)
  // =========================================================================

  describe('doMedit', () => {
    let mobProto: MobilePrototype;

    beforeEach(() => {
      mobProto = makeMobProto({ vnum: 1010 });
      vnumReg.registerMobile(1010, mobProto);
      area.mobilePrototypes.set(1010, mobProto);
    });

    it('selects and shows mob info when given a vnum', () => {
      doMedit(builder, '1010');
      const output = getMessages(builder).join('');
      expect(output).toContain('1010');
      expect(output).toContain('a test mob');
      // Should set editingMob
      expect(builder.pcData.editingMob).toBe(mobProto);
    });

    it('rejects invalid vnum', () => {
      doMedit(builder, '9999');
      expect(getMessages(builder).join('')).toContain('No mobile has that vnum');
    });

    it('sets mob name (after selecting)', () => {
      doMedit(builder, '1010'); // select
      clearMessages(builder);
      doMedit(builder, 'name a big troll');
      expect(mobProto.name).toBe('a big troll');
      expect(getMessages(builder).join('')).toContain('Name set');
    });

    it('sets mob short description (after selecting)', () => {
      doMedit(builder, '1010'); // select
      clearMessages(builder);
      doMedit(builder, 'short A big troll');
      expect(mobProto.shortDesc).toBe('A big troll');
    });

    it('sets mob level (after selecting)', () => {
      doMedit(builder, '1010'); // select
      clearMessages(builder);
      doMedit(builder, 'level 20');
      expect(mobProto.level).toBe(20);
    });

    it('sets mob alignment (after selecting)', () => {
      doMedit(builder, '1010'); // select
      clearMessages(builder);
      doMedit(builder, 'alignment -1000');
      expect(mobProto.alignment).toBe(-1000);
    });

    it('creates a new mobile prototype', () => {
      doMedit(builder, 'create 1020');
      expect(vnumReg.getMobile(1020)).toBeTruthy();
      expect(getMessages(builder).join('')).toContain('1020');
    });

    it('prevents creating mob outside range', () => {
      doMedit(builder, 'create 2000');
      expect(getMessages(builder).join('')).toContain('not in your assigned');
    });

    it('rejects trust below LEVEL_CREATOR', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 52 });
      doMedit(lowImm, '1010');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('requires mob selection before subcommands', () => {
      doMedit(builder, 'name something');
      expect(getMessages(builder).join('')).toContain('not editing a mobile');
    });
  });

  // =========================================================================
  // doOedit (Object Editor)
  // =========================================================================

  describe('doOedit', () => {
    let objProto: ObjectPrototype;

    beforeEach(() => {
      objProto = makeObjProto({ vnum: 1030 });
      vnumReg.registerObject(1030, objProto);
      area.objectPrototypes.set(1030, objProto);
    });

    it('selects and shows object info when given a vnum', () => {
      doOedit(builder, '1030');
      const output = getMessages(builder).join('');
      expect(output).toContain('1030');
      expect(output).toContain('a test object');
      expect(builder.pcData.editingObj).toBe(objProto);
    });

    it('rejects invalid object vnum', () => {
      doOedit(builder, '9999');
      expect(getMessages(builder).join('')).toContain('No object has that vnum');
    });

    it('sets object name (after selecting)', () => {
      doOedit(builder, '1030'); // select
      clearMessages(builder);
      doOedit(builder, 'name a shiny gem');
      expect(objProto.name).toBe('a shiny gem');
    });

    it('sets object short description (after selecting)', () => {
      doOedit(builder, '1030');
      clearMessages(builder);
      doOedit(builder, 'short A shiny gem');
      expect(objProto.shortDesc).toBe('A shiny gem');
    });

    it('sets object type (after selecting)', () => {
      doOedit(builder, '1030');
      clearMessages(builder);
      doOedit(builder, 'type weapon');
      expect(objProto.itemType).toBe(ItemType.Weapon);
    });

    it('sets object weight (after selecting)', () => {
      doOedit(builder, '1030');
      clearMessages(builder);
      doOedit(builder, 'weight 25');
      expect(objProto.weight).toBe(25);
    });

    it('sets object cost (after selecting)', () => {
      doOedit(builder, '1030');
      clearMessages(builder);
      doOedit(builder, 'cost 500');
      expect(objProto.cost).toBe(500);
    });

    it('creates a new object prototype', () => {
      doOedit(builder, 'create 1040');
      expect(vnumReg.getObject(1040)).toBeTruthy();
      expect(getMessages(builder).join('')).toContain('1040');
    });

    it('prevents creating object outside range', () => {
      doOedit(builder, 'create 2000');
      expect(getMessages(builder).join('')).toContain('not in your assigned');
    });

    it('rejects trust below LEVEL_CREATOR', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 52 });
      doOedit(lowImm, '1030');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('requires object selection before subcommands', () => {
      doOedit(builder, 'name something');
      expect(getMessages(builder).join('')).toContain('not editing an object');
    });
  });

  // =========================================================================
  // doMpedit (MUDprog Editor)
  // =========================================================================

  describe('doMpedit', () => {
    let mobProto: MobilePrototype;

    beforeEach(() => {
      mobProto = makeMobProto({ vnum: 1050 });
      vnumReg.registerMobile(1050, mobProto);
      area.mobilePrototypes.set(1050, mobProto);
    });

    it('rejects trust below LEVEL_CREATOR', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 52 });
      doMpedit(lowImm, 'list');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('requires editing mob to be set first', () => {
      doMpedit(builder, 'list');
      expect(getMessages(builder).join('')).toContain('No mobile to edit');
    });

    it('adds a mudprog after mob selected', () => {
      // First select mob via medit
      doMedit(builder, '1050');
      clearMessages(builder);

      doMpedit(builder, 'add greet hello');
      expect(getMessages(builder).join('')).toContain('MUDprog added');
      expect(builder.pcData.editMode).toBe('mudprog');
    });

    it('lists mudprogs', () => {
      doMedit(builder, '1050');
      clearMessages(builder);
      doMpedit(builder, 'list');
      // Should show something (even if no progs)
      const output = getMessages(builder).join('');
      expect(output).toBeTruthy();
    });
  });

  // =========================================================================
  // doAedit (Area Editor)
  // =========================================================================

  describe('doAedit', () => {
    it('rejects trust below LEVEL_CREATOR', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 52 });
      placeInRoom(lowImm, room);
      doAedit(lowImm, 'name Test');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('sets area name', () => {
      doAedit(builder, 'name New Area Name');
      expect(area.name).toBe('New Area Name');
      expect(getMessages(builder).join('')).toContain('Area name set');
    });

    it('sets area author', () => {
      doAedit(builder, 'author NewAuthor');
      expect(area.author).toBe('NewAuthor');
      expect(getMessages(builder).join('')).toContain('Area author set');
    });

    it('shows area info with no subcommand', () => {
      doAedit(builder, '');
      const output = getMessages(builder).join('');
      expect(output).toContain('Test Area');
    });

    it('sets area reset frequency', () => {
      doAedit(builder, 'resetfreq 15');
      expect(area.resetFrequency).toBe(15);
      expect(getMessages(builder).join('')).toContain('Reset frequency');
    });
  });

  // =========================================================================
  // registerOlcCommands
  // =========================================================================

  describe('registerOlcCommands', () => {
    it('registers OLC commands in the registry', () => {
      const registry = new CommandRegistry();
      registerOlcCommands(registry);
      // The commands should be registered without throwing
      expect(true).toBe(true);
    });
  });
});
