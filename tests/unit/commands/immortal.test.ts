import { describe, it, expect, beforeEach } from 'vitest';
import type { CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Mobile } from '../../../src/game/entities/Mobile.js';
import { Room } from '../../../src/game/entities/Room.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import { Position, Sex, ItemType, Direction } from '../../../src/game/entities/types.js';
import type { MobilePrototype, ObjectPrototype } from '../../../src/game/entities/types.js';
import { hasFlag } from '../../../src/utils/BitVector.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';
import { BanSystem } from '../../../src/admin/BanSystem.js';
import {
  doAuthorize, doFreeze, doSilence, doNoshout, doNotell, doLog,
  doGoto, doTransfer, doAt, doBamfin, doBamfout,
  doPurge, doMload, doOload, doSlay, doForce, doSnoop, doSwitch, doReturn,
  doReboot, doShutdown, doCopyover, doSet, doStat, doAdvance, doTrust,
  doRestore, doPeace, doEcho, doGecho,
  doBan, doAllow,
  doUsers, doMemory, doWizhelp,
  setImmortalVnumRegistry, setImmortalBanSystem, setImmortalConnectionManager, setImmortalLogger,
  PLR_UNAUTHED, PLR_FREEZE, PLR_SILENCE, PLR_NOSHOUT, PLR_NOTELL, PLR_LOG,
  registerImmortalCommands,
} from '../../../src/game/commands/immortal.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';

// =============================================================================
// Helpers
// =============================================================================

function makePlayer(init?: Partial<CharacterInit>): Player {
  const p = new Player({
    id: `player_${Math.random().toString(36).slice(2)}`,
    name: 'TestImm',
    level: init?.level ?? init?.trust ?? 60,
    trust: init?.trust ?? 60,
    hit: 100,
    maxHit: 100,
    mana: 100,
    maxMana: 100,
    move: 100,
    maxMove: 100,
    position: Position.Standing,
    permStats: { str: 18, int: 18, wis: 18, dex: 18, con: 18, cha: 18, lck: 18 },
    ...init,
  });
  (p as any)._messages = [] as string[];
  p.sendToChar = (text: string) => { (p as any)._messages.push(text); };
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
    vnum: 5000,
    name: 'a sword',
    shortDesc: 'a gleaming sword',
    longDesc: 'A gleaming sword lies here.',
    description: 'It is very sharp.',
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 1, 8, 0, 0, 0],
    weight: 5,
    cost: 100,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [],
    affects: [],
    ...overrides,
  };
}

/** Fake ConnectionManager for injection. */
function makeFakeConnectionManager(descriptors: Array<{ character: Player | null; state: number; host: string; idle: number }>) {
  return {
    getAllDescriptors: () => descriptors.map(d => ({
      character: d.character,
      state: d.state,
      host: d.host,
      idle: d.idle,
    })),
  } as any;
}

function placeInRoom(ch: any, room: Room): void {
  room.addCharacter(ch);
}

// =============================================================================
// Tests
// =============================================================================

describe('Immortal Commands', () => {
  let vnumReg: VnumRegistry;
  let banSys: BanSystem;
  let logger: Logger;
  let room: Room;
  let imm: Player;

  beforeEach(() => {
    vnumReg = new VnumRegistry();
    banSys = new BanSystem();
    logger = new Logger(LogLevel.Debug);
    Mobile.resetInstanceCounter();
    GameObject.resetCounters();

    room = new Room(3001, 'Test Room', 'A test room.');
    vnumReg.registerRoom(3001, room);

    // Set up dependencies
    setImmortalVnumRegistry(vnumReg);
    setImmortalBanSystem(banSys);
    setImmortalLogger(logger);

    // Create immortal
    imm = makePlayer({ name: 'Immortal', trust: 60, level: 60 });
    placeInRoom(imm, room);
  });

  // =========================================================================
  // Trust Gating
  // =========================================================================

  describe('Trust Gating', () => {
    it('rejects commands below required trust level', () => {
      const mortal = makePlayer({ name: 'Mortal', trust: 10, level: 10 });
      doFreeze(mortal, 'someone');
      expect(getMessages(mortal).join('')).toContain('Huh?');
    });

    it('allows commands at required trust level', () => {
      const target = makePlayer({ name: 'Target', trust: 10, level: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doFreeze(imm, 'Target');
      expect(getMessages(imm).join('')).toContain('frozen');
    });

    it('rejects teleportation commands below trust 52', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 51, level: 51 });
      doGoto(lowImm, '3001');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('rejects world manipulation below trust 53', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 52, level: 52 });
      doPurge(lowImm, '');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('rejects ban commands below trust 55', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 54, level: 54 });
      doBan(lowImm, 'list');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });

    it('rejects system admin commands below trust 58', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 57, level: 57 });
      doReboot(lowImm, '');
      expect(getMessages(lowImm).join('')).toContain('Huh?');
    });
  });

  // =========================================================================
  // Character Management (Trust 51+)
  // =========================================================================

  describe('doAuthorize', () => {
    it('authorizes pending player', () => {
      const pending = makePlayer({ name: 'Newbie', trust: 0, actFlags: PLR_UNAUTHED });
      const fakeConn = makeFakeConnectionManager([{ character: pending, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doAuthorize(imm, 'Newbie yes');
      expect(getMessages(imm).join('')).toContain('authorized');
      expect(getMessages(pending).join('')).toContain('authorized to play');
      expect(hasFlag(pending.actFlags, PLR_UNAUTHED)).toBe(false);
    });

    it('denies pending player', () => {
      let closed = false;
      const pending = makePlayer({ name: 'BadGuy', trust: 0, actFlags: PLR_UNAUTHED });
      pending.descriptor = { close: () => { closed = true; }, write: () => {} } as any;
      const fakeConn = makeFakeConnectionManager([{ character: pending, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doAuthorize(imm, 'BadGuy no');
      expect(getMessages(imm).join('')).toContain('denied');
      expect(closed).toBe(true);
    });

    it('reports error for non-pending player', () => {
      const regular = makePlayer({ name: 'RegPlayer', trust: 0 });
      const fakeConn = makeFakeConnectionManager([{ character: regular, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doAuthorize(imm, 'RegPlayer yes');
      expect(getMessages(imm).join('')).toContain('not awaiting');
    });

    it('shows syntax when missing arguments', () => {
      doAuthorize(imm, '');
      expect(getMessages(imm).join('')).toContain('Syntax');
    });
  });

  describe('doFreeze', () => {
    it('freezes a player', () => {
      const target = makePlayer({ name: 'Victim', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doFreeze(imm, 'Victim');
      expect(hasFlag(target.actFlags, PLR_FREEZE)).toBe(true);
      expect(getMessages(target).join('')).toContain('frozen');
    });

    it('unfreezes a frozen player', () => {
      const target = makePlayer({ name: 'Frozen', trust: 10, actFlags: PLR_FREEZE });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doFreeze(imm, 'Frozen');
      expect(hasFlag(target.actFlags, PLR_FREEZE)).toBe(false);
      expect(getMessages(target).join('')).toContain('play again');
    });

    it('cannot freeze someone of equal or higher trust', () => {
      const target = makePlayer({ name: 'HighTrust', trust: 65 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doFreeze(imm, 'HighTrust');
      expect(getMessages(imm).join('')).toContain("can't do that");
    });
  });

  describe('doSilence / doNoshout / doNotell / doLog', () => {
    it('toggles silence flag', () => {
      const target = makePlayer({ name: 'Target', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSilence(imm, 'Target');
      expect(hasFlag(target.actFlags, PLR_SILENCE)).toBe(true);
      doSilence(imm, 'Target');
      expect(hasFlag(target.actFlags, PLR_SILENCE)).toBe(false);
    });

    it('toggles noshout flag', () => {
      const target = makePlayer({ name: 'Target', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doNoshout(imm, 'Target');
      expect(hasFlag(target.actFlags, PLR_NOSHOUT)).toBe(true);
    });

    it('toggles notell flag', () => {
      const target = makePlayer({ name: 'Target', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doNotell(imm, 'Target');
      expect(hasFlag(target.actFlags, PLR_NOTELL)).toBe(true);
    });

    it('toggles log flag', () => {
      const target = makePlayer({ name: 'Target', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doLog(imm, 'Target');
      expect(hasFlag(target.actFlags, PLR_LOG)).toBe(true);
      doLog(imm, 'Target');
      expect(hasFlag(target.actFlags, PLR_LOG)).toBe(false);
    });
  });

  // =========================================================================
  // Teleportation (Trust 52+)
  // =========================================================================

  describe('doGoto', () => {
    it('teleports to room by vnum', () => {
      const destRoom = new Room(5000, 'Destination', 'A far away place.');
      vnumReg.registerRoom(5000, destRoom);

      doGoto(imm, '5000');
      expect(imm.inRoom).toBe(destRoom);
      expect(getMessages(imm).join('')).toContain('Destination');
    });

    it('teleports to player by name', () => {
      const otherRoom = new Room(5001, 'Other Room', 'Another room.');
      vnumReg.registerRoom(5001, otherRoom);
      const target = makePlayer({ name: 'FarPlayer', trust: 10 });
      placeInRoom(target, otherRoom);

      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doGoto(imm, 'FarPlayer');
      expect(imm.inRoom).toBe(otherRoom);
    });

    it('reports error for invalid destination', () => {
      doGoto(imm, '99999');
      expect(getMessages(imm).join('')).toContain('No such location');
    });

    it('shows bamfout/bamfin messages', () => {
      const destRoom = new Room(5002, 'Dest', 'Dest room.');
      vnumReg.registerRoom(5002, destRoom);
      const observer = makePlayer({ name: 'Observer', trust: 10 });
      placeInRoom(observer, room);

      doGoto(imm, '5002');
      expect(getMessages(observer).join('')).toContain('swirling mist');
    });
  });

  describe('doTransfer', () => {
    it('transfers player to immortal\'s room', () => {
      const otherRoom = new Room(5003, 'Far Room', 'Far away.');
      vnumReg.registerRoom(5003, otherRoom);
      const target = makePlayer({ name: 'TransTarget', trust: 10 });
      placeInRoom(target, otherRoom);

      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doTransfer(imm, 'TransTarget');
      expect(target.inRoom).toBe(room);
      expect(getMessages(target).join('')).toContain('transferred');
    });

    it('transfers player to specified room vnum', () => {
      const destRoom = new Room(5004, 'Specific Room', 'Specific.');
      vnumReg.registerRoom(5004, destRoom);
      const target = makePlayer({ name: 'TransTarget2', trust: 10 });
      placeInRoom(target, room);

      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doTransfer(imm, 'TransTarget2 5004');
      expect(target.inRoom).toBe(destRoom);
    });
  });

  describe('doAt', () => {
    it('executes command at remote location', () => {
      const remoteRoom = new Room(5005, 'Remote Room', 'Remote.');
      vnumReg.registerRoom(5005, remoteRoom);

      // At command runs interpretCommand, which is a stub in tests
      doAt(imm, '5005 look');
      // Should return to original room
      expect(imm.inRoom).toBe(room);
    });
  });

  describe('doBamfin / doBamfout', () => {
    it('sets bamfin message', () => {
      doBamfin(imm, 'Immortal materializes in a flash of light.');
      expect(imm.pcData.bamfIn).toBe('Immortal materializes in a flash of light.');
      expect(getMessages(imm).join('')).toContain('Bamfin set');
    });

    it('displays current bamfin when no argument', () => {
      doBamfin(imm, '');
      expect(getMessages(imm).join('')).toContain('Your bamfin is');
    });

    it('sets bamfout message', () => {
      doBamfout(imm, 'Immortal vanishes in a puff of smoke.');
      expect(imm.pcData.bamfOut).toBe('Immortal vanishes in a puff of smoke.');
    });
  });

  // =========================================================================
  // World Manipulation (Trust 53+)
  // =========================================================================

  describe('doPurge', () => {
    it('purges all NPCs from room', () => {
      const proto = makeMobProto();
      const mob1 = new Mobile(proto);
      const mob2 = new Mobile(proto);
      placeInRoom(mob1, room);
      placeInRoom(mob2, room);

      doPurge(imm, '');
      const npcsRemaining = room.characters.filter(c => c instanceof Mobile);
      expect(npcsRemaining.length).toBe(0);
      expect(getMessages(imm).join('')).toContain('purged');
    });

    it('purges specific mob', () => {
      const proto = makeMobProto({ name: 'a goblin' });
      const mob = new Mobile(proto);
      placeInRoom(mob, room);

      doPurge(imm, 'a goblin');
      expect(room.characters.filter(c => c instanceof Mobile).length).toBe(0);
    });

    it('reports nothing found for invalid target', () => {
      doPurge(imm, 'nonexistent');
      expect(getMessages(imm).join('')).toContain('Nothing like that');
    });
  });

  describe('doMload', () => {
    it('loads a mob by vnum', () => {
      const proto = makeMobProto({ vnum: 7000, name: 'a dragon' });
      vnumReg.registerMobile(7000, proto);

      doMload(imm, '7000');
      const mobs = room.characters.filter(c => c instanceof Mobile);
      expect(mobs.length).toBe(1);
      expect((mobs[0] as Mobile).prototype.vnum).toBe(7000);
      expect(getMessages(imm).join('')).toContain('Ok');
    });

    it('reports error for invalid vnum', () => {
      doMload(imm, '99999');
      expect(getMessages(imm).join('')).toContain('No mob has that vnum');
    });

    it('reports syntax error for no argument', () => {
      doMload(imm, '');
      expect(getMessages(imm).join('')).toContain('Syntax');
    });
  });

  describe('doOload', () => {
    it('loads an object by vnum', () => {
      const proto = makeObjProto({ vnum: 8000, name: 'a shield' });
      vnumReg.registerObject(8000, proto);

      doOload(imm, '8000');
      expect(imm.inventory.length).toBe(1);
      expect(getMessages(imm).join('')).toContain('Ok');
    });

    it('reports error for invalid vnum', () => {
      doOload(imm, '99999');
      expect(getMessages(imm).join('')).toContain('No object has that vnum');
    });
  });

  describe('doSlay', () => {
    it('slays a mob in the room', () => {
      const proto = makeMobProto({ vnum: 7001, name: 'a rat' });
      const mob = new Mobile(proto);
      placeInRoom(mob, room);

      doSlay(imm, 'a rat');
      expect(getMessages(imm).join('')).toContain('slay');
    });

    it('prevents self-slay', () => {
      doSlay(imm, 'Immortal');
      expect(getMessages(imm).join('')).toContain('Suicide');
    });

    it('prevents slaying higher trust player', () => {
      const boss = makePlayer({ name: 'Boss', trust: 65 });
      placeInRoom(boss, room);

      doSlay(imm, 'Boss');
      expect(getMessages(imm).join('')).toContain('failed');
    });
  });

  describe('doForce', () => {
    it('forces a player to execute a command', () => {
      const target = makePlayer({ name: 'Puppet', trust: 10 });
      let commandExecuted = '';
      target.interpretCommand = (cmd: string) => { commandExecuted = cmd; };

      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doForce(imm, 'Puppet say hello');
      expect(commandExecuted).toBe('say hello');
      expect(getMessages(target).join('')).toContain('forces you');
    });

    it('cannot force equal or higher trust', () => {
      const target = makePlayer({ name: 'Boss', trust: 65 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doForce(imm, 'Boss say hello');
      expect(getMessages(imm).join('')).toContain('Do it yourself');
    });
  });

  describe('doSnoop', () => {
    it('starts snooping a player', () => {
      const target = makePlayer({ name: 'SnoopTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSnoop(imm, 'SnoopTarget');
      expect(imm.pcData.snooping).toBe(target);
      expect(target.pcData.snoopedBy).toBe(imm);
    });

    it('stops snooping with no argument', () => {
      const target = makePlayer({ name: 'SnoopTarget', trust: 10 });
      imm.pcData.snooping = target;
      target.pcData.snoopedBy = imm;

      doSnoop(imm, '');
      expect(imm.pcData.snooping).toBeNull();
      expect(target.pcData.snoopedBy).toBeNull();
    });

    it('detects snoop loops', () => {
      const a = makePlayer({ name: 'PlayerA', trust: 10 });
      const b = makePlayer({ name: 'PlayerB', trust: 10 });
      // B is snooping imm
      b.pcData.snooping = imm;
      const fakeConn = makeFakeConnectionManager([
        { character: a, state: 12, host: 'localhost', idle: 0 },
        { character: b, state: 12, host: 'localhost', idle: 0 },
      ]);
      setImmortalConnectionManager(fakeConn);

      // imm tries to snoop B (who snoops imm) → loop
      doSnoop(imm, 'PlayerB');
      expect(getMessages(imm).join('')).toContain('snoop loops');
    });
  });

  describe('doSwitch / doReturn', () => {
    it('switches into an NPC', () => {
      const proto = makeMobProto({ vnum: 7002, name: 'a guard' });
      const mob = new Mobile(proto);
      placeInRoom(mob, room);

      doSwitch(imm, 'a guard');
      expect(imm.pcData.switched).toBe(mob);
    });

    it('returns from switch', () => {
      const proto = makeMobProto({ vnum: 7003, name: 'a soldier' });
      const mob = new Mobile(proto);
      placeInRoom(mob, room);

      doSwitch(imm, 'a soldier');
      doReturn(imm, '');
      expect(imm.pcData.switched).toBeNull();
    });

    it('cannot switch when already switched', () => {
      const proto = makeMobProto({ vnum: 7004 });
      const mob1 = new Mobile(proto);
      const mob2 = new Mobile(proto);
      placeInRoom(mob1, room);
      placeInRoom(mob2, room);

      imm.pcData.switched = mob1;
      doSwitch(imm, 'a goblin');
      expect(getMessages(imm).join('')).toContain('already switched');
    });
  });

  // =========================================================================
  // System Administration (Trust 58+)
  // =========================================================================

  describe('doSet', () => {
    it('sets player level', () => {
      const target = makePlayer({ name: 'SetTarget', trust: 10, level: 5 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSet(imm, 'char SetTarget level 25');
      expect(target.level).toBe(25);
    });

    it('sets player hp', () => {
      const target = makePlayer({ name: 'SetTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSet(imm, 'char SetTarget hp 500');
      expect(target.hit).toBe(500);
    });

    it('sets player gold', () => {
      const target = makePlayer({ name: 'SetTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSet(imm, 'char SetTarget gold 5000');
      expect(target.gold).toBe(5000);
    });

    it('sets player str', () => {
      const target = makePlayer({ name: 'SetTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSet(imm, 'char SetTarget str 20');
      expect(target.permStats.str).toBe(20);
    });

    it('sets player trust', () => {
      const target = makePlayer({ name: 'SetTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSet(imm, 'char SetTarget trust 55');
      expect(target.trust).toBe(55);
    });

    it('cannot set trust higher than own', () => {
      const target = makePlayer({ name: 'SetTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSet(imm, 'char SetTarget trust 99');
      expect(getMessages(imm).join('')).toContain("can't set trust higher");
    });

    it('sets room name', () => {
      doSet(imm, 'room name A Magical Chamber');
      expect(room.name).toBe('A Magical Chamber');
    });

    it('shows syntax for insufficient args', () => {
      doSet(imm, 'char');
      expect(getMessages(imm).join('')).toContain('Syntax');
    });

    it('reports unknown field', () => {
      const target = makePlayer({ name: 'SetTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doSet(imm, 'char SetTarget nonexistent 5');
      expect(getMessages(imm).join('')).toContain('Unknown field');
    });
  });

  describe('doStat', () => {
    it('displays character stats', () => {
      doStat(imm, 'char Immortal');
      const output = getMessages(imm).join('');
      expect(output).toContain('Name: Immortal');
      expect(output).toContain('Level: 60');
      expect(output).toContain('HP:');
    });

    it('displays room stats', () => {
      doStat(imm, 'room');
      const output = getMessages(imm).join('');
      expect(output).toContain('Room: 3001');
      expect(output).toContain('Test Room');
    });

    it('displays mob stats', () => {
      const proto = makeMobProto({ vnum: 7005, name: 'a troll' });
      const mob = new Mobile(proto);
      placeInRoom(mob, room);

      doStat(imm, 'mob troll');
      const output = getMessages(imm).join('');
      expect(output).toContain('a troll');
      expect(output).toContain('Vnum: 7005');
    });
  });

  describe('doAdvance', () => {
    it('advances a player to a higher level', () => {
      const target = makePlayer({ name: 'AdvTarget', trust: 10, level: 5 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doAdvance(imm, 'AdvTarget 20');
      expect(target.level).toBe(20);
      expect(getMessages(target).join('')).toContain('advanced');
    });

    it('demotes a player to a lower level', () => {
      const target = makePlayer({ name: 'AdvTarget', trust: 10, level: 30 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doAdvance(imm, 'AdvTarget 10');
      expect(target.level).toBe(10);
      expect(getMessages(target).join('')).toContain('demoted');
    });

    it('cannot advance above own trust', () => {
      const target = makePlayer({ name: 'AdvTarget', trust: 10, level: 5 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doAdvance(imm, 'AdvTarget 61');
      expect(getMessages(imm).join('')).toContain("above your own trust");
    });
  });

  describe('doTrust', () => {
    it('sets player trust level', () => {
      const target = makePlayer({ name: 'TrustTarget', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doTrust(imm, 'TrustTarget 55');
      expect(target.trust).toBe(55);
    });
  });

  describe('doRestore', () => {
    it('restores player to full stats', () => {
      const target = makePlayer({ name: 'RestoreTarget', trust: 10, hit: 10, maxHit: 100, mana: 5, maxMana: 100, move: 1, maxMove: 100 });
      const fakeConn = makeFakeConnectionManager([{ character: target, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doRestore(imm, 'RestoreTarget');
      expect(target.hit).toBe(100);
      expect(target.mana).toBe(100);
      expect(target.move).toBe(100);
    });

    it('restores self when no argument', () => {
      imm.hit = 10;
      doRestore(imm, '');
      expect(imm.hit).toBe(imm.maxHit);
    });
  });

  describe('doPeace', () => {
    it('stops all combat in room', () => {
      const fighter1 = makePlayer({ name: 'Fighter1', trust: 10, position: Position.Fighting });
      const fighter2 = makePlayer({ name: 'Fighter2', trust: 10, position: Position.Fighting });
      fighter1.fighting = fighter2;
      fighter2.fighting = fighter1;
      placeInRoom(fighter1, room);
      placeInRoom(fighter2, room);

      doPeace(imm, '');
      expect(fighter1.fighting).toBeNull();
      expect(fighter2.fighting).toBeNull();
      expect(fighter1.position).toBe(Position.Standing);
      expect(fighter2.position).toBe(Position.Standing);
      expect(getMessages(imm).join('')).toContain('Peace has been restored');
    });
  });

  describe('doEcho / doGecho', () => {
    it('echoes to all in room', () => {
      const observer = makePlayer({ name: 'Observer', trust: 10 });
      placeInRoom(observer, room);

      doEcho(imm, 'The ground shakes!');
      expect(getMessages(observer).join('')).toContain('The ground shakes!');
      expect(getMessages(imm).join('')).toContain('The ground shakes!');
    });

    it('global echoes to all players online', () => {
      const p1 = makePlayer({ name: 'P1', trust: 10 });
      const p2 = makePlayer({ name: 'P2', trust: 10 });
      const fakeConn = makeFakeConnectionManager([
        { character: p1, state: 12, host: 'localhost', idle: 0 },
        { character: p2, state: 12, host: 'localhost', idle: 0 },
      ]);
      setImmortalConnectionManager(fakeConn);

      doGecho(imm, 'Server-wide announcement!');
      expect(getMessages(p1).join('')).toContain('Server-wide announcement!');
      expect(getMessages(p2).join('')).toContain('Server-wide announcement!');
    });
  });

  // =========================================================================
  // Ban System (Trust 55+)
  // =========================================================================

  describe('doBan / doAllow', () => {
    it('adds a permanent ban', () => {
      doBan(imm, 'add evil.com permanent');
      const bans = banSys.getAllBans();
      expect(bans.length).toBe(1);
      expect(bans[0].name).toBe('evil.com');
      expect(bans[0].duration).toBe(-1);
    });

    it('adds a timed ban', () => {
      doBan(imm, 'add temp.com timed 24');
      const bans = banSys.getAllBans();
      expect(bans.length).toBe(1);
      expect(bans[0].name).toBe('temp.com');
      expect(bans[0].unbanDate).toBeTruthy();
    });

    it('lists bans', () => {
      doBan(imm, 'add site1.com');
      clearMessages(imm);
      doBan(imm, 'list');
      expect(getMessages(imm).join('')).toContain('site1.com');
    });

    it('lists empty ban list', () => {
      doBan(imm, 'list');
      expect(getMessages(imm).join('')).toContain('No sites are banned');
    });

    it('removes ban by allow command', () => {
      doBan(imm, 'add badsite.com');
      clearMessages(imm);
      doAllow(imm, 'badsite.com');
      expect(getMessages(imm).join('')).toContain('lifted');
      expect(banSys.getAllBans().length).toBe(0);
    });

    it('reports error when allowing non-banned site', () => {
      doAllow(imm, 'notbanned.com');
      expect(getMessages(imm).join('')).toContain('not banned');
    });
  });

  // =========================================================================
  // Information
  // =========================================================================

  describe('doUsers', () => {
    it('lists connected users', () => {
      const p1 = makePlayer({ name: 'User1', trust: 10 });
      const fakeConn = makeFakeConnectionManager([
        { character: p1, state: 12, host: '192.168.1.1', idle: 30 },
      ]);
      setImmortalConnectionManager(fakeConn);

      doUsers(imm, '');
      const output = getMessages(imm).join('');
      expect(output).toContain('Connected Users');
      expect(output).toContain('User1');
      expect(output).toContain('1 users connected');
    });
  });

  describe('doMemory', () => {
    it('displays memory and entity counts', () => {
      doMemory(imm, '');
      const output = getMessages(imm).join('');
      expect(output).toContain('Memory Usage');
      expect(output).toContain('Heap Used');
      expect(output).toContain('Entity Counts');
      expect(output).toContain('Rooms');
    });
  });

  describe('doWizhelp', () => {
    it('lists immortal commands', () => {
      doWizhelp(imm, '');
      const output = getMessages(imm).join('');
      expect(output).toContain('Immortal Commands Available');
      expect(output).toContain('Trust 51');
      expect(output).toContain('freeze');
      expect(output).toContain('goto');
    });

    it('filters by trust level', () => {
      const lowImm = makePlayer({ name: 'LowImm', trust: 51 });
      doWizhelp(lowImm, '');
      const output = getMessages(lowImm).join('');
      expect(output).toContain('Trust 51');
      expect(output).not.toContain('Trust 58');
    });
  });

  // =========================================================================
  // System Commands (basic behavior)
  // =========================================================================

  describe('doReboot / doShutdown / doCopyover', () => {
    it('reboot sends notification', () => {
      const p1 = makePlayer({ name: 'P1', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: p1, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doReboot(imm, '');
      expect(getMessages(p1).join('')).toContain('rebooting');
    });

    it('shutdown sends notification', () => {
      const p1 = makePlayer({ name: 'P1', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: p1, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doShutdown(imm, '');
      expect(getMessages(p1).join('')).toContain('shutting down');
    });

    it('copyover sends notification', () => {
      const p1 = makePlayer({ name: 'P1', trust: 10 });
      const fakeConn = makeFakeConnectionManager([{ character: p1, state: 12, host: 'localhost', idle: 0 }]);
      setImmortalConnectionManager(fakeConn);

      doCopyover(imm, '');
      expect(getMessages(p1).join('')).toContain('Copyover');
    });
  });

  // =========================================================================
  // Registration
  // =========================================================================

  describe('registerImmortalCommands', () => {
    it('registers all immortal commands', () => {
      const registry = new CommandRegistry(logger);
      registerImmortalCommands(registry);
      const cmds = registry.getAllCommands();
      const names = cmds.map(c => c.name);

      expect(names).toContain('goto');
      expect(names).toContain('freeze');
      expect(names).toContain('purge');
      expect(names).toContain('ban');
      expect(names).toContain('set');
      expect(names).toContain('stat');
      expect(names).toContain('restore');
      expect(names).toContain('peace');
      expect(names).toContain('wizhelp');
      expect(cmds.length).toBeGreaterThanOrEqual(30);
    });
  });

  // --- PARITY: Missing/Partial test stubs ---
  it.todo('doReboot — should implement actual process restart');
  it.todo('doShutdown — should implement actual process exit with save');
  it.todo('doCopyover — should implement hot-reboot with descriptor preservation');
  it.todo('doHeal — should implement full heal command (not just restore alias)');
  it.todo('doInvis — should set immortal invisibility level');
  it.todo('doGhost — should toggle ghost/invisible mode');
  it.todo('doDnd — should toggle do-not-disturb flag');
  it.todo('doHolylight — should toggle see-in-dark mode');
  it.todo('doWizlock — should lock/unlock MUD from new connections');
  it.todo('doRestrict — should restrict command access by level');
  it.todo('doDeny — should deny character access to the MUD');
  it.todo('doDisconnect — should disconnect a specific player');
  it.todo('doForceclose — should close a specific descriptor by number');
  it.todo('doPcrename — should rename a player character');
  it.todo('doDeleteChar — should permanently delete a character');
  it.todo('doMortalize — should demote an immortal to mortal');
  it.todo('doImmortalize — should promote a mortal to immortal');
  it.todo('doReset — should manually trigger area reset');
  it.todo('doLoadup — should load area files');
  it.todo('doSavearea — should save area to disk');
  it.todo('doInstallarea — should install a new area file');
  it.todo('doWstat — should display world-wide statistics');
  it.todo('doBestow — should bestow command access to a player');
  it.todo('doCset — should set character properties');
  it.todo('doMset — should set mobile properties');
  it.todo('doOset — should set object properties');
  it.todo('doRset — should set room properties');
  it.todo('doSset — should set spell/skill properties');
  it.todo('doHset — should set house properties');
  it.todo('doAassign — should assign OLC area to builder');
  it.todo('doMassign — should assign OLC mobile range to builder');
  it.todo('doRassign — should assign OLC room range to builder');
  it.todo('doVassign — should assign OLC vnum range to builder');
  it.todo('doRegoto — should return to saved location');
  it.todo('doRetransfer — should retransfer player to saved location');
  it.todo('doRat — should run command across vnum range');
  it.todo('doMinvoke — should invoke mobile by vnum');
  it.todo('doOinvoke — should invoke object by vnum with level/qty');
  it.todo('doStatshield — should toggle mob statshield on player');
  it.todo('doScatter — should scatter player to random room');
  it.todo('doStrew — should scatter coins/objects in room');
  it.todo('doWatch — should manage per-immortal watch list');
  it.todo('doMwhere — should show mobile locations globally');
  it.todo('doOfind — should find objects by vnum/keyword');
  it.todo('doMfind — should find mobiles by vnum/keyword');
  it.todo('doGfighting — should show global combat search results');
  it.todo('doOclaim — should claim an object from a player');
  it.todo('doBodybag — should find and retrieve a corpse');
  it.todo('doMakeadminlist — should regenerate admin list file');
  it.todo('doAdminlist — should display admin list');
  it.todo('doImmhost — should manage immortal host protections');
  it.todo('doSetvault — should manage vault room assignments');
  it.todo('doLast — should show last connected players');
  it.todo('doWizlist — should display immortal list');
  it.todo('doRetiredlist — should display retired immortals');
  it.todo('doIpcompare — should compare IP addresses');
  it.todo('doCheckVnums — should validate vnum assignments');
  it.todo('doVnums — should show vnum ranges');
  it.todo('doVsearch — should search vnums by keyword');
  it.todo('doVstat — should show vnum statistics');
  it.todo('doRstat — should show room statistics');
  it.todo('doMstat — should show mobile statistics');
  it.todo('doOstat — should show object statistics');
  it.todo('doLoop — should loop command across vnum range');
  it.todo('doLowPurge — should purge room items without NPC check');
  it.todo('doBalzhur — should demote player to level 2 as punishment');
  it.todo('doElevate — should elevate level 51 to 52');
  it.todo('doNohomepage — should prevent player from setting homepage');
  it.todo('doNodesc — should prevent player from setting description');
  it.todo('doNohttp — should prevent player from setting HTTP page');
  it.todo('doNobio — should prevent player from setting bio');
  it.todo('doNobeckon — should prevent player from using beckon');
  it.todo('doDelay — should delay player actions for specified rounds');
  it.todo('doHell — should send player to hell for specified duration');
  it.todo('doUnhell — should release player from hell early');


});
