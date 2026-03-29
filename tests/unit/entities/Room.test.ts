import { describe, it, expect, beforeEach } from 'vitest';
import { Room } from '../../../src/game/entities/Room.js';
import { Character } from '../../../src/game/entities/Character.js';
import { Direction, ROOM_FLAGS, type Exit } from '../../../src/game/entities/types.js';

/** Concrete test subclass of Character. */
class TestCharacter extends Character {
  lastMessage = '';
  private readonly _isNpc: boolean;
  get isNpc(): boolean { return this._isNpc; }
  sendToChar(text: string): void { this.lastMessage = text; }
  constructor(isNpc = false) {
    super({ name: isNpc ? 'TestMob' : 'TestPlayer' });
    this._isNpc = isNpc;
  }
}

describe('Room', () => {
  let room: Room;

  beforeEach(() => {
    room = new Room(3001, 'Town Square', 'You are in the town square.');
  });

  describe('addCharacter / removeCharacter', () => {
    it('should add a character to the room', () => {
      const ch = new TestCharacter();
      room.addCharacter(ch);
      expect(room.characters).toHaveLength(1);
      expect(ch.inRoom).toBe(room);
    });

    it('should not add the same character twice', () => {
      const ch = new TestCharacter();
      room.addCharacter(ch);
      room.addCharacter(ch);
      expect(room.characters).toHaveLength(1);
    });

    it('should remove a character from the room', () => {
      const ch = new TestCharacter();
      room.addCharacter(ch);
      room.removeCharacter(ch);
      expect(room.characters).toHaveLength(0);
      expect(ch.inRoom).toBeNull();
      expect(ch.wasInRoom).toBe(room);
    });

    it('should handle removing a character not in the room', () => {
      const ch = new TestCharacter();
      room.removeCharacter(ch);
      expect(room.characters).toHaveLength(0);
    });
  });

  describe('getExit', () => {
    it('should return an exit for a direction', () => {
      const exit: Exit = {
        direction: Direction.North,
        description: 'A path leads north.',
        keyword: 'door',
        flags: 0n,
        key: 0,
        toRoom: 3002,
      };
      room.exits.set(Direction.North, exit);
      expect(room.getExit(Direction.North)).toBe(exit);
    });

    it('should return undefined for no exit', () => {
      expect(room.getExit(Direction.South)).toBeUndefined();
    });
  });

  describe('hasFlag', () => {
    it('should detect set flags', () => {
      room.roomFlags = ROOM_FLAGS.SAFE | ROOM_FLAGS.INDOORS;
      expect(room.hasFlag(ROOM_FLAGS.SAFE)).toBe(true);
      expect(room.hasFlag(ROOM_FLAGS.INDOORS)).toBe(true);
      expect(room.hasFlag(ROOM_FLAGS.DARK)).toBe(false);
    });
  });

  describe('getPlayers / getMobiles', () => {
    it('should filter by isNpc', () => {
      const player = new TestCharacter(false);
      const mob = new TestCharacter(true);
      room.addCharacter(player);
      room.addCharacter(mob);

      const players = room.getPlayers();
      const mobiles = room.getMobiles();

      expect(players).toHaveLength(1);
      expect(players[0]!.name).toBe('TestPlayer');
      expect(mobiles).toHaveLength(1);
      expect(mobiles[0]!.name).toBe('TestMob');
    });
  });
});
