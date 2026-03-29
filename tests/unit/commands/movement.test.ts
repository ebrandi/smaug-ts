import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Direction, Position, SectorType, EX_FLAGS, ROOM_FLAGS, AFF } from '../../../src/game/entities/types.js';
import {
  moveChar, doOpen, doClose, doLock, doUnlock, doPick, doFlee, doRecall,
  setRoomLookup, setMovementEventBus, SECTOR_MOVE_COST, OPPOSITE_DIR,
} from '../../../src/game/commands/movement.js';
import { EventBus } from '../../../src/core/EventBus.js';
import { setFlag } from '../../../src/utils/BitVector.js';

// =============================================================================
// Test Character
// =============================================================================

class TestCharacter extends Character {
  messages: string[] = [];
  private readonly _isNpc: boolean;
  get isNpc(): boolean { return this._isNpc; }
  sendToChar(text: string): void { this.messages.push(text); }
  get lastMessage(): string { return this.messages[this.messages.length - 1] ?? ''; }
  clearMessages(): void { this.messages = []; }
  constructor(init?: CharacterInit, isNpc = false) {
    super(init);
    this._isNpc = isNpc;
  }
}

function makeChar(init?: CharacterInit): TestCharacter {
  return new TestCharacter({
    id: 'test_char_1',
    name: 'TestHero',
    shortDescription: 'a test hero',
    level: 10,
    move: 100,
    maxMove: 100,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    ...init,
  });
}

function makeRoom(vnum: number, name?: string, sector?: SectorType): Room {
  const room = new Room(vnum, name ?? `Room ${vnum}`, `Description of room ${vnum}.`);
  room.sectorType = sector ?? SectorType.City;
  return room;
}

// =============================================================================
// Setup
// =============================================================================

describe('Movement Commands', () => {
  let ch: TestCharacter;
  let roomA: Room;
  let roomB: Room;
  let rooms: Map<number, Room>;
  let eventBus: EventBus;

  beforeEach(() => {
    ch = makeChar();
    roomA = makeRoom(3000, 'Room A', SectorType.City);
    roomB = makeRoom(3001, 'Room B', SectorType.City);
    rooms = new Map([[3000, roomA], [3001, roomB]]);
    setRoomLookup(rooms);

    eventBus = new EventBus();
    setMovementEventBus(eventBus);

    // Place character in Room A
    roomA.addCharacter(ch);

    // Add north exit from A to B
    roomA.exits.set(Direction.North, {
      direction: Direction.North,
      description: '',
      keyword: '',
      flags: 0n,
      key: 0,
      toRoom: 3001,
    });

    // Add south exit from B to A
    roomB.exits.set(Direction.South, {
      direction: Direction.South,
      description: '',
      keyword: '',
      flags: 0n,
      key: 0,
      toRoom: 3000,
    });
  });

  // ===========================================================================
  // moveChar
  // ===========================================================================

  describe('moveChar', () => {
    it('should move character to destination room', () => {
      const result = moveChar(ch, Direction.North);
      expect(result).toBe(true);
      expect(ch.inRoom).toBe(roomB);
      expect(roomA.characters).not.toContain(ch);
      expect(roomB.characters).toContain(ch);
    });

    it('should deduct correct movement cost per sector type', () => {
      roomB.sectorType = SectorType.Mountain;
      const initialMove = ch.move;
      moveChar(ch, Direction.North);
      expect(ch.move).toBe(initialMove - SECTOR_MOVE_COST[SectorType.Mountain]!);
    });

    it('should deduct city sector cost', () => {
      roomB.sectorType = SectorType.City;
      const initialMove = ch.move;
      moveChar(ch, Direction.North);
      expect(ch.move).toBe(initialMove - SECTOR_MOVE_COST[SectorType.City]!);
    });

    it('should block movement when no exit exists', () => {
      const result = moveChar(ch, Direction.West);
      expect(result).toBe(false);
      expect(ch.inRoom).toBe(roomA);
      expect(ch.lastMessage).toContain('cannot go that way');
    });

    it('should block movement by closed door', () => {
      const exit = roomA.getExit(Direction.North)!;
      exit.flags = setFlag(exit.flags, EX_FLAGS.ISDOOR);
      exit.flags = setFlag(exit.flags, EX_FLAGS.CLOSED);
      exit.keyword = 'gate';

      const result = moveChar(ch, Direction.North);
      expect(result).toBe(false);
      expect(ch.inRoom).toBe(roomA);
      expect(ch.lastMessage).toContain('gate is closed');
    });

    it('should not reveal secret door name', () => {
      const exit = roomA.getExit(Direction.North)!;
      exit.flags = setFlag(exit.flags, EX_FLAGS.ISDOOR);
      exit.flags = setFlag(exit.flags, EX_FLAGS.CLOSED);
      exit.flags = setFlag(exit.flags, EX_FLAGS.SECRET);
      exit.keyword = 'hidden door';

      const result = moveChar(ch, Direction.North);
      expect(result).toBe(false);
      expect(ch.lastMessage).toContain('cannot go that way');
      expect(ch.lastMessage).not.toContain('hidden door');
    });

    it('should block ROOM_PRIVATE when 2+ characters present', () => {
      roomB.roomFlags = setFlag(roomB.roomFlags, ROOM_FLAGS.PRIVATE);
      const npc1 = makeChar({ id: 'npc1', name: 'npc1' });
      const npc2 = makeChar({ id: 'npc2', name: 'npc2' });
      roomB.addCharacter(npc1);
      roomB.addCharacter(npc2);

      const result = moveChar(ch, Direction.North);
      expect(result).toBe(false);
      expect(ch.lastMessage).toContain('private');
    });

    it('should allow ROOM_PRIVATE when only 1 character', () => {
      roomB.roomFlags = setFlag(roomB.roomFlags, ROOM_FLAGS.PRIVATE);
      const npc1 = makeChar({ id: 'npc1', name: 'npc1' });
      roomB.addCharacter(npc1);

      const result = moveChar(ch, Direction.North);
      expect(result).toBe(true);
    });

    it('should block ROOM_SOLITARY when occupied', () => {
      roomB.roomFlags = setFlag(roomB.roomFlags, ROOM_FLAGS.SOLITARY);
      const npc1 = makeChar({ id: 'npc1', name: 'npc1' });
      roomB.addCharacter(npc1);

      const result = moveChar(ch, Direction.North);
      expect(result).toBe(false);
      expect(ch.lastMessage).toContain('occupied');
    });

    it('should block ROOM_TUNNEL when at limit', () => {
      roomB.roomFlags = setFlag(roomB.roomFlags, ROOM_FLAGS.TUNNEL);
      roomB.tunnel = 1;
      const npc1 = makeChar({ id: 'npc1', name: 'npc1' });
      roomB.addCharacter(npc1);

      const result = moveChar(ch, Direction.North);
      expect(result).toBe(false);
      expect(ch.lastMessage).toContain('tunnel');
    });

    it('should handle ROOM_DEATH', () => {
      roomB.roomFlags = setFlag(roomB.roomFlags, ROOM_FLAGS.DEATH);
      const result = moveChar(ch, Direction.North);
      expect(result).toBe(true);
      expect(ch.messages.some(m => m.includes('death trap'))).toBe(true);
    });

    it('should block movement when exhausted', () => {
      ch.move = 0;
      const result = moveChar(ch, Direction.North);
      expect(result).toBe(false);
      expect(ch.lastMessage).toContain('exhausted');
    });

    it('should block movement when fighting (non-flee)', () => {
      const enemy = makeChar({ name: 'enemy' });
      ch.fighting = enemy;

      const result = moveChar(ch, Direction.North);
      expect(result).toBe(false);
      expect(ch.lastMessage).toContain('fighting');
    });

    it('should emit CharacterLeaveRoom and CharacterEnterRoom events', () => {
      const leaveHandler = vi.fn();
      const enterHandler = vi.fn();
      eventBus.on('char:leaveRoom', leaveHandler);
      eventBus.on('char:enterRoom', enterHandler);

      moveChar(ch, Direction.North);

      expect(leaveHandler).toHaveBeenCalledOnce();
      expect(enterHandler).toHaveBeenCalledOnce();
      expect(leaveHandler.mock.calls[0]![0]).toMatchObject({ roomVnum: 3000 });
      expect(enterHandler.mock.calls[0]![0]).toMatchObject({ roomVnum: 3001 });
    });

    it('should move followers along', () => {
      const follower = makeChar({ id: 'follower', name: 'Follower', position: Position.Standing });
      roomA.addCharacter(follower);
      follower.master = ch;

      moveChar(ch, Direction.North);

      expect(roomB.characters).toContain(ch);
      expect(roomB.characters).toContain(follower);
    });

    it('should send departure and arrival messages to room occupants', () => {
      const bystander = makeChar({ id: 'bystander', name: 'Bystander' });
      roomA.addCharacter(bystander);
      const destBystander = makeChar({ id: 'destBystander', name: 'DestBystander' });
      roomB.addCharacter(destBystander);

      moveChar(ch, Direction.North);

      expect(bystander.messages.some(m => m.includes('leaves north'))).toBe(true);
      expect(destBystander.messages.some(m => m.includes('arrived from the south'))).toBe(true);
    });
  });

  // ===========================================================================
  // Door operations
  // ===========================================================================

  describe('doOpen / doClose', () => {
    beforeEach(() => {
      const exit = roomA.getExit(Direction.North)!;
      exit.flags = setFlag(exit.flags, EX_FLAGS.ISDOOR);
      exit.flags = setFlag(exit.flags, EX_FLAGS.CLOSED);
      exit.keyword = 'gate';
    });

    it('should open a closed door', () => {
      doOpen(ch, 'north');
      const exit = roomA.getExit(Direction.North)!;
      expect((exit.flags & EX_FLAGS.CLOSED) === 0n).toBe(true);
      expect(ch.messages.some(m => m.includes('open the gate'))).toBe(true);
    });

    it('should close an open door', () => {
      doOpen(ch, 'north');
      ch.clearMessages();
      doClose(ch, 'north');
      const exit = roomA.getExit(Direction.North)!;
      expect((exit.flags & EX_FLAGS.CLOSED) !== 0n).toBe(true);
      expect(ch.messages.some(m => m.includes('close the gate'))).toBe(true);
    });

    it('should update reverse exit', () => {
      const revExit = roomB.getExit(Direction.South)!;
      revExit.flags = setFlag(revExit.flags, EX_FLAGS.ISDOOR);
      revExit.flags = setFlag(revExit.flags, EX_FLAGS.CLOSED);

      doOpen(ch, 'north');

      expect((revExit.flags & EX_FLAGS.CLOSED) === 0n).toBe(true);
    });
  });

  describe('doLock / doUnlock', () => {
    beforeEach(() => {
      const exit = roomA.getExit(Direction.North)!;
      exit.flags = setFlag(exit.flags, EX_FLAGS.ISDOOR);
      exit.flags = setFlag(exit.flags, EX_FLAGS.CLOSED);
      exit.key = 100;
      exit.keyword = 'gate';
    });

    it('should require key to lock', () => {
      doLock(ch, 'north');
      expect(ch.lastMessage).toContain('lack the key');
    });

    it('should require key to unlock', () => {
      const exit = roomA.getExit(Direction.North)!;
      exit.flags = setFlag(exit.flags, EX_FLAGS.LOCKED);

      doUnlock(ch, 'north');
      expect(ch.lastMessage).toContain('lack the key');
    });
  });

  describe('doPick', () => {
    it('should fail on pickproof door', () => {
      const exit = roomA.getExit(Direction.North)!;
      exit.flags = setFlag(exit.flags, EX_FLAGS.ISDOOR);
      exit.flags = setFlag(exit.flags, EX_FLAGS.CLOSED);
      exit.flags = setFlag(exit.flags, EX_FLAGS.LOCKED);
      exit.flags = setFlag(exit.flags, EX_FLAGS.PICKPROOF);
      exit.keyword = 'gate';

      doPick(ch, 'north');
      expect(ch.lastMessage).toContain('failed');
    });
  });

  // ===========================================================================
  // doFlee
  // ===========================================================================

  describe('doFlee', () => {
    it('should require fighting', () => {
      doFlee(ch, '');
      expect(ch.lastMessage).toContain("aren't fighting");
    });

    it('should pick random exit and cost XP', () => {
      const enemy = makeChar({ name: 'enemy' });
      ch.fighting = enemy;
      ch.exp = 1000;
      ch.position = Position.Fighting;

      doFlee(ch, '');

      // Should have moved or failed after 3 attempts
      if (ch.inRoom === roomB) {
        expect(ch.exp).toBeLessThan(1000);
        expect(ch.fighting).toBe(null);
      } else {
        // stayed (possible if all 3 attempts failed)
        expect(ch.messages.some(m =>
          m.includes('lose') || m.includes("couldn't escape")
        )).toBe(true);
      }
    });
  });

  // ===========================================================================
  // doRecall
  // ===========================================================================

  describe('doRecall', () => {
    it('should teleport to recall room', () => {
      const recallRoom = makeRoom(3001, 'Temple');
      rooms.set(3001, recallRoom);
      setRoomLookup(rooms);

      doRecall(ch, '');
      expect(ch.inRoom).toBe(recallRoom);
    });

    it('should not recall from no-recall room (non-immortal)', () => {
      roomA.roomFlags = setFlag(roomA.roomFlags, ROOM_FLAGS.NO_RECALL);
      doRecall(ch, '');
      expect(ch.inRoom).toBe(roomA);
      expect(ch.lastMessage).toContain('nothing happens');
    });
  });

  // ===========================================================================
  // Constants
  // ===========================================================================

  describe('Constants', () => {
    it('should have SECTOR_MOVE_COST for all basic sectors', () => {
      expect(SECTOR_MOVE_COST[SectorType.Inside]).toBe(1);
      expect(SECTOR_MOVE_COST[SectorType.City]).toBe(2);
      expect(SECTOR_MOVE_COST[SectorType.Mountain]).toBe(6);
      expect(SECTOR_MOVE_COST[SectorType.Forest]).toBe(3);
    });

    it('should have correct OPPOSITE_DIR mapping', () => {
      expect(OPPOSITE_DIR[Direction.North]).toBe(Direction.South);
      expect(OPPOSITE_DIR[Direction.South]).toBe(Direction.North);
      expect(OPPOSITE_DIR[Direction.East]).toBe(Direction.West);
      expect(OPPOSITE_DIR[Direction.West]).toBe(Direction.East);
      expect(OPPOSITE_DIR[Direction.Up]).toBe(Direction.Down);
      expect(OPPOSITE_DIR[Direction.Down]).toBe(Direction.Up);
    });
  });

  // --- PARITY: Missing/Partial test stubs ---
  it.todo('doLock — should check for correct key in inventory before locking');
  it.todo('doLock — should handle container locks');
  it.todo('doUnlock — should check for correct key in inventory before unlocking');
  it.todo('doUnlock — should handle container unlocks');
  it.todo('doPick — should use thief skill check for lock picking');
  it.todo('doPick — should detect and trigger traps on locked doors');
  it.todo('doClimb — should implement climb command with skill check');
  it.todo('doDrag — should implement drag command for objects and characters');
  it.todo('doDismount — should dismount from a mount');
  it.todo('doMount — should mount a valid mount NPC');
  it.todo('doShove — should shove another character through an exit');
  it.todo('doSurvey — should display overland map surroundings');


});
