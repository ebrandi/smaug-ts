import { describe, it, expect, beforeEach } from 'vitest';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Room } from '../../../src/game/entities/Room.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import {
  Direction, Position, SectorType, Sex, WearLocation, ItemType,
  EX_FLAGS, ROOM_FLAGS, AFF,
  type ObjectPrototype,
} from '../../../src/game/entities/types.js';
import { setFlag } from '../../../src/utils/BitVector.js';
import {
  doLook, doScore, doWho, doConsider, doEquipment, doInventory,
  doAffects, doHelp, doExamine, doTime, doWeather,
  formatExits, formatRoomContents, formatRoomCharacters, getConditionString,
  setHelpTable, setPlayerListProvider,
} from '../../../src/game/commands/information.js';
import { Affect } from '../../../src/game/entities/Affect.js';
import { ApplyType } from '../../../src/game/entities/types.js';

// =============================================================================
// Test Character
// =============================================================================

class TestCharacter extends Character {
  messages: string[] = [];
  private readonly _isNpc: boolean;
  get isNpc(): boolean { return this._isNpc; }
  sendToChar(text: string): void { this.messages.push(text); }
  get lastMessage(): string { return this.messages[this.messages.length - 1] ?? ''; }
  get allOutput(): string { return this.messages.join(''); }
  clearMessages(): void { this.messages = []; }
  constructor(init?: CharacterInit, isNpc = false) {
    super(init);
    this._isNpc = isNpc;
  }
}

function makeChar(init?: CharacterInit, isNpc = false): TestCharacter {
  return new TestCharacter({
    id: 'test_char',
    name: 'TestHero',
    shortDescription: 'a test hero',
    longDescription: 'A test hero is standing here.',
    level: 10,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    ...init,
  }, isNpc);
}

function makeRoom(vnum: number, name?: string): Room {
  return new Room(vnum, name ?? `Room ${vnum}`, `This is room ${vnum}.`);
}

function makeObjectProto(vnum: number, name: string, type: ItemType): ObjectPrototype {
  return {
    vnum,
    name,
    shortDesc: `a ${name}`,
    longDesc: `A ${name} is here.`,
    description: `It is a ${name}.`,
    itemType: type,
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
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Information Commands', () => {
  let ch: TestCharacter;
  let room: Room;

  beforeEach(() => {
    ch = makeChar();
    room = makeRoom(3000, 'The Town Square');
    room.addCharacter(ch);
  });

  // ===========================================================================
  // doLook
  // ===========================================================================

  describe('doLook', () => {
    it('should display room name and description', () => {
      doLook(ch, '');
      expect(ch.allOutput).toContain('The Town Square');
      expect(ch.allOutput).toContain('This is room 3000');
    });

    it('should display exits', () => {
      room.exits.set(Direction.North, {
        direction: Direction.North,
        description: '',
        keyword: '',
        flags: 0n,
        key: 0,
        toRoom: 3001,
      });

      doLook(ch, '');
      expect(ch.allOutput).toContain('[Exits:');
      expect(ch.allOutput).toContain('N');
    });

    it('should show closed doors in parentheses', () => {
      room.exits.set(Direction.East, {
        direction: Direction.East,
        description: '',
        keyword: 'gate',
        flags: setFlag(setFlag(0n, EX_FLAGS.ISDOOR), EX_FLAGS.CLOSED),
        key: 0,
        toRoom: 3002,
      });

      doLook(ch, '');
      expect(ch.allOutput).toContain('(E)');
    });

    it('should show characters in the room', () => {
      const npc = makeChar({ name: 'goblin', shortDescription: 'a mean goblin', longDescription: 'A mean goblin lurks here.' }, true);
      room.addCharacter(npc);

      doLook(ch, '');
      expect(ch.allOutput).toContain('goblin');
    });

    it('should look at a character', () => {
      const npc = makeChar({
        name: 'guard',
        shortDescription: 'a town guard',
        description: 'He looks tough.',
      }, true);
      room.addCharacter(npc);

      doLook(ch, 'guard');
      expect(ch.allOutput).toContain('He looks tough.');
    });

    it('should look at extra descriptions', () => {
      room.extraDescriptions.push({
        keywords: 'fountain water',
        description: 'The water sparkles in the sunlight.',
      });

      doLook(ch, 'fountain');
      expect(ch.allOutput).toContain('sparkles');
    });

    it('should fail when sleeping', () => {
      ch.position = Position.Sleeping;
      doLook(ch, '');
      expect(ch.lastMessage).toContain("sleeping");
    });

    it('should look at a direction and show door state', () => {
      room.exits.set(Direction.North, {
        direction: Direction.North,
        description: 'A dark hallway stretches north.',
        keyword: 'door',
        flags: setFlag(setFlag(0n, EX_FLAGS.ISDOOR), EX_FLAGS.CLOSED),
        key: 0,
        toRoom: 3001,
      });

      doLook(ch, 'north');
      expect(ch.allOutput).toContain('dark hallway');
      expect(ch.allOutput).toContain('door is closed');
    });
  });

  // ===========================================================================
  // doScore
  // ===========================================================================

  describe('doScore', () => {
    it('should display all character stats', () => {
      doScore(ch, '');
      const output = ch.allOutput;
      expect(output).toContain('TestHero');
      expect(output).toContain('10'); // level
      expect(output).toContain('15');  // str
      expect(output).toContain('14');  // int
    });

    it('should display HP/Mana/Move', () => {
      ch.hit = 15;
      ch.maxHit = 20;
      ch.mana = 80;
      ch.maxMana = 100;
      doScore(ch, '');
      const output = ch.allOutput;
      expect(output).toContain('15');
      expect(output).toContain('20');
      expect(output).toContain('80');
      expect(output).toContain('100');
    });
  });

  // ===========================================================================
  // doWho
  // ===========================================================================

  describe('doWho', () => {
    it('should show online players', () => {
      const player1 = new Player({ name: 'Alice', level: 20, race: 'elf', class_: 'mage' });
      const player2 = new Player({ name: 'Bob', level: 10, race: 'human', class_: 'warrior' });
      setPlayerListProvider(() => [player1, player2]);

      doWho(ch, '');
      const output = ch.allOutput;
      expect(output).toContain('Alice');
      expect(output).toContain('Bob');
      expect(output).toContain('2 players');
    });

    it('should filter by race', () => {
      const player1 = new Player({ name: 'Alice', level: 20, race: 'elf', class_: 'mage' });
      const player2 = new Player({ name: 'Bob', level: 10, race: 'human', class_: 'warrior' });
      setPlayerListProvider(() => [player1, player2]);

      doWho(ch, '-r elf');
      const output = ch.allOutput;
      expect(output).toContain('Alice');
      expect(output).not.toContain('Bob');
      expect(output).toContain('1 player');
    });

    it('should filter by class', () => {
      const player1 = new Player({ name: 'Alice', level: 20, race: 'elf', class_: 'mage' });
      const player2 = new Player({ name: 'Bob', level: 10, race: 'human', class_: 'warrior' });
      setPlayerListProvider(() => [player1, player2]);

      doWho(ch, '-c warrior');
      const output = ch.allOutput;
      expect(output).not.toContain('Alice');
      expect(output).toContain('Bob');
    });

    it('should filter by minimum level', () => {
      const player1 = new Player({ name: 'Alice', level: 20, race: 'elf', class_: 'mage' });
      const player2 = new Player({ name: 'Bob', level: 10, race: 'human', class_: 'warrior' });
      setPlayerListProvider(() => [player1, player2]);

      doWho(ch, '-l 15');
      const output = ch.allOutput;
      expect(output).toContain('Alice');
      expect(output).not.toContain('Bob');
    });
  });

  // ===========================================================================
  // doConsider
  // ===========================================================================

  describe('doConsider', () => {
    it('should show difficulty messages', () => {
      const npc = makeChar({ name: 'rat', shortDescription: 'a rat', level: 1 }, true);
      room.addCharacter(npc);

      doConsider(ch, 'rat');
      expect(ch.allOutput).toContain('needle'); // diff <= -5
    });

    it('should show perfect match for same level', () => {
      const npc = makeChar({ name: 'guard', shortDescription: 'a guard', level: 10 }, true);
      room.addCharacter(npc);

      doConsider(ch, 'guard');
      expect(ch.allOutput).toContain('perfect match');
    });

    it('should show danger for higher level', () => {
      const npc = makeChar({ name: 'dragon', shortDescription: 'a dragon', level: 50 }, true);
      room.addCharacter(npc);

      doConsider(ch, 'dragon');
      expect(ch.allOutput).toContain('Death will thank');
    });

    it('should say target not here when missing', () => {
      doConsider(ch, 'nobody');
      expect(ch.lastMessage).toContain("not here");
    });
  });

  // ===========================================================================
  // doEquipment
  // ===========================================================================

  describe('doEquipment', () => {
    it('should show all wear locations with items', () => {
      const proto = makeObjectProto(100, 'helmet', ItemType.Armor);
      const obj = new GameObject(proto);
      ch.equipment.set(WearLocation.Head, obj);

      doEquipment(ch, '');
      const output = ch.allOutput;
      expect(output).toContain('worn on head');
      expect(output).toContain('helmet');
    });

    it('should show Nothing when no equipment', () => {
      doEquipment(ch, '');
      expect(ch.allOutput).toContain('Nothing');
    });
  });

  // ===========================================================================
  // doInventory
  // ===========================================================================

  describe('doInventory', () => {
    it('should show carried items', () => {
      const proto = makeObjectProto(101, 'sword', ItemType.Weapon);
      const obj = new GameObject(proto);
      ch.inventory.push(obj);

      doInventory(ch, '');
      expect(ch.allOutput).toContain('sword');
    });

    it('should group identical items', () => {
      const proto = makeObjectProto(102, 'potion', ItemType.Potion);
      const obj1 = new GameObject(proto);
      const obj2 = new GameObject(proto);
      ch.inventory.push(obj1, obj2);

      doInventory(ch, '');
      expect(ch.allOutput).toContain('(2)');
    });

    it('should show Nothing when empty', () => {
      doInventory(ch, '');
      expect(ch.allOutput).toContain('Nothing');
    });
  });

  // ===========================================================================
  // doAffects
  // ===========================================================================

  describe('doAffects', () => {
    it('should list active affects', () => {
      const aff = new Affect(42, 5, ApplyType.None, 0, 0n);
      ch.applyAffect(aff);

      doAffects(ch, '');
      expect(ch.allOutput).toContain('42');
      expect(ch.allOutput).toContain('5 hours');
    });

    it('should say not affected when none', () => {
      doAffects(ch, '');
      expect(ch.allOutput).toContain('not affected');
    });
  });

  // ===========================================================================
  // doHelp
  // ===========================================================================

  describe('doHelp', () => {
    it('should find help topics', () => {
      setHelpTable([
        { level: 0, keywords: 'LOOK', text: 'Help text for look.' },
        { level: 0, keywords: 'SCORE', text: 'Help text for score.' },
      ]);

      doHelp(ch, 'look');
      expect(ch.allOutput).toContain('Help text for look');
    });

    it('should say no help found for unknown topic', () => {
      setHelpTable([]);
      doHelp(ch, 'nonexistent');
      expect(ch.allOutput).toContain('No help found');
    });
  });

  // ===========================================================================
  // Helper functions
  // ===========================================================================

  describe('formatExits', () => {
    it('should show none when no exits', () => {
      const result = formatExits(room, ch);
      expect(result).toContain('none');
    });

    it('should show exit letters', () => {
      room.exits.set(Direction.North, {
        direction: Direction.North, description: '', keyword: '',
        flags: 0n, key: 0, toRoom: 3001,
      });
      room.exits.set(Direction.South, {
        direction: Direction.South, description: '', keyword: '',
        flags: 0n, key: 0, toRoom: 3002,
      });

      const result = formatExits(room, ch);
      expect(result).toContain('N');
      expect(result).toContain('S');
    });

    it('should hide secret exits from non-immortals', () => {
      room.exits.set(Direction.West, {
        direction: Direction.West, description: '', keyword: '',
        flags: setFlag(0n, EX_FLAGS.SECRET), key: 0, toRoom: 3003,
      });

      const result = formatExits(room, ch);
      expect(result).not.toContain('W');
    });
  });

  describe('getConditionString', () => {
    it('should return excellent condition at full HP', () => {
      ch.hit = 100;
      ch.maxHit = 100;
      expect(getConditionString(ch)).toContain('excellent');
    });

    it('should return awful condition at low HP', () => {
      ch.hit = 5;
      ch.maxHit = 100;
      expect(getConditionString(ch)).toContain('awful');
    });

    it('should return bleeding at 0 HP', () => {
      ch.hit = 0;
      ch.maxHit = 100;
      expect(getConditionString(ch)).toContain('bleeding');
    });

    it('should return few scratches at 90+%', () => {
      ch.hit = 95;
      ch.maxHit = 100;
      expect(getConditionString(ch)).toContain('scratches');
    });
  });

  describe('formatRoomCharacters', () => {
    it('should hide invisible characters', () => {
      const npc = makeChar({ name: 'spy', shortDescription: 'a spy', affectedBy: AFF.INVISIBLE }, true);
      room.addCharacter(npc);

      const result = formatRoomCharacters(room, ch);
      expect(result).not.toContain('spy');
    });

    it('should show invisible characters to detect-invis', () => {
      ch.affectedBy = AFF.DETECT_INVIS;
      const npc = makeChar({
        name: 'spy',
        shortDescription: 'a sneaky spy',
        longDescription: 'A sneaky spy lurks in the shadows.',
        affectedBy: AFF.INVISIBLE,
      }, true);
      room.addCharacter(npc);

      const result = formatRoomCharacters(room, ch);
      expect(result).toContain('spy');
    });
  });

  // --- PARITY: Missing test stubs ---
  it.todo('doGlance — should show quick health/status check of target');
  it.todo('doWizwho — should list only immortal characters online');
  it.todo('doChanges — should display recent MUD changes log');
  it.todo('doNews — should display news file contents');
  it.todo('doHlist — should list help files filtered by level range');


});
