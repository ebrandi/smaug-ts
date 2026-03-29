/**
 * movement.ts – Movement command handlers for SMAUG 2.0.
 *
 * Implements directional movement, door operations, recall, enter/leave,
 * and flee. Validates exits, checks for locked doors, applies movement
 * cost by sector, and triggers room enter/leave events.
 */

import type { Character } from '../entities/Character.js';
import { Room } from '../entities/Room.js';
import { Direction, Position, SectorType, AFF, ROOM_FLAGS, EX_FLAGS, ItemType } from '../entities/types.js';
import type { Exit } from '../entities/types.js';
import { hasFlag, setFlag, removeFlag } from '../../utils/BitVector.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import type { CharacterRoomPayload } from '../../core/EventBus.js';
import { Logger } from '../../utils/Logger.js';
import { numberRange, numberPercent } from '../../utils/Dice.js';
import { oneArgument, isName } from '../../utils/StringUtils.js';
import { CommandRegistry, type CommandDef, defaultCommandFlags, CommandLogLevel } from './CommandRegistry.js';
import { GameObject } from '../entities/GameObject.js';

// =============================================================================
// Constants
// =============================================================================

/** Movement cost per sector type. */
export const SECTOR_MOVE_COST: Record<number, number> = {
  [SectorType.Inside]:      1,
  [SectorType.City]:        2,
  [SectorType.Field]:       2,
  [SectorType.Forest]:      3,
  [SectorType.Hills]:       4,
  [SectorType.Mountain]:    6,
  [SectorType.WaterSwim]:   4,
  [SectorType.WaterNoSwim]: 1,
  [SectorType.Air]:         1,
  [SectorType.Desert]:      6,
  [SectorType.Lava]:        4,
  [SectorType.Swamp]:       4,
  [SectorType.Underwater]:  6,
  [SectorType.Dunno]:       2,
  [SectorType.OceanFloor]:  6,
  [SectorType.Underground]: 3,
};

/** Opposite direction mapping. */
export const OPPOSITE_DIR: Record<number, Direction> = {
  [Direction.North]: Direction.South,
  [Direction.South]: Direction.North,
  [Direction.East]:  Direction.West,
  [Direction.West]:  Direction.East,
  [Direction.Up]:    Direction.Down,
  [Direction.Down]:  Direction.Up,
};

/** Direction names for display. */
const DIR_NAMES: Record<number, string> = {
  [Direction.North]: 'north',
  [Direction.South]: 'south',
  [Direction.East]:  'east',
  [Direction.West]:  'west',
  [Direction.Up]:    'up',
  [Direction.Down]:  'down',
};

/** Reverse direction names for arrival messages. */
const DIR_FROM_NAMES: Record<number, string> = {
  [Direction.North]: 'the south',
  [Direction.South]: 'the north',
  [Direction.East]:  'the west',
  [Direction.West]:  'the east',
  [Direction.Up]:    'below',
  [Direction.Down]:  'above',
};

// Shared event bus and logger – set during registration
let eventBus: EventBus | null = null;
let logger: Logger | null = null;

/** Set the shared event bus for movement events. */
export function setMovementEventBus(bus: EventBus): void {
  eventBus = bus;
}

/** Set the shared logger for movement logging. */
export function setMovementLogger(log: Logger): void {
  logger = log;
}

// =============================================================================
// Direction Commands
// =============================================================================

export function doNorth(ch: Character, _arg: string): void { moveChar(ch, Direction.North); }
export function doSouth(ch: Character, _arg: string): void { moveChar(ch, Direction.South); }
export function doEast(ch: Character, _arg: string): void { moveChar(ch, Direction.East); }
export function doWest(ch: Character, _arg: string): void { moveChar(ch, Direction.West); }
export function doUp(ch: Character, _arg: string): void { moveChar(ch, Direction.Up); }
export function doDown(ch: Character, _arg: string): void { moveChar(ch, Direction.Down); }

// =============================================================================
// Core Movement
// =============================================================================

/**
 * Move a character in the given direction.
 * Performs all validation: position, exit, door, room flags, movement cost.
 * Emits CharacterLeaveRoom / CharacterEnterRoom events and handles followers.
 */
export function moveChar(ch: Character, direction: Direction, isFleeing: boolean = false): boolean {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar("You are in limbo and cannot move.\r\n");
    return false;
  }

  // 1. Position check
  if (!isFleeing && ch.isFighting) {
    ch.sendToChar("You are fighting! Use 'flee' to escape.\r\n");
    return false;
  }

  if (ch.position < Position.Standing && !isFleeing) {
    if (ch.position === Position.Sleeping) {
      ch.sendToChar("In your dreams, or what?\r\n");
    } else if (ch.position === Position.Resting || ch.position === Position.Sitting) {
      ch.sendToChar("Nah... You feel too relaxed...\r\n");
    } else {
      ch.sendToChar("You are not in a position to move.\r\n");
    }
    return false;
  }

  // 2. Exit check
  const exit = room.getExit(direction);
  if (!exit) {
    ch.sendToChar("Alas, you cannot go that way.\r\n");
    return false;
  }

  // We need a destination room reference. Check VnumRegistry or room map.
  // For now, destination is stored as toRoom vnum. We need to resolve it.
  const destRoom = resolveRoom(exit.toRoom);
  if (!destRoom) {
    ch.sendToChar("Alas, you cannot go that way.\r\n");
    return false;
  }

  // 3. Door check
  if (hasFlag(exit.flags, EX_FLAGS.ISDOOR) && hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
    if (hasFlag(exit.flags, EX_FLAGS.SECRET) || hasFlag(exit.flags, EX_FLAGS.HIDDEN)) {
      ch.sendToChar("Alas, you cannot go that way.\r\n");
    } else {
      const doorName = exit.keyword || 'door';
      ch.sendToChar(`The ${doorName} is closed.\r\n`);
    }
    return false;
  }

  // 4. Room flag checks on destination
  if (ch.isNpc && destRoom.hasFlag(ROOM_FLAGS.NO_MOB)) {
    ch.sendToChar("Mobs cannot enter that room.\r\n");
    return false;
  }

  if (destRoom.hasFlag(ROOM_FLAGS.PRIVATE)) {
    if (destRoom.characters.length >= 2) {
      ch.sendToChar("That room is private right now.\r\n");
      return false;
    }
  }

  if (destRoom.hasFlag(ROOM_FLAGS.SOLITARY)) {
    if (destRoom.characters.length >= 1) {
      ch.sendToChar("That room is occupied.\r\n");
      return false;
    }
  }

  if (destRoom.hasFlag(ROOM_FLAGS.TUNNEL) && destRoom.tunnel > 0) {
    if (destRoom.characters.length >= destRoom.tunnel) {
      ch.sendToChar("There is no room to pass through the tunnel.\r\n");
      return false;
    }
  }

  // Water/air/underwater sector checks
  if (destRoom.sectorType === SectorType.WaterNoSwim
    && !ch.isAffected(AFF.FLYING)
    && !ch.isAffected(AFF.FLOATING)) {
    // Check for boat in inventory
    if (!hasBoat(ch)) {
      ch.sendToChar("You need a boat to go there.\r\n");
      return false;
    }
  }

  if (destRoom.sectorType === SectorType.Air && !ch.isAffected(AFF.FLYING)) {
    ch.sendToChar("You would need to fly to go there.\r\n");
    return false;
  }

  if (destRoom.sectorType === SectorType.Underwater
    && !ch.isAffected(AFF.AQUA_BREATH)) {
    ch.sendToChar("You would drown!\r\n");
    return false;
  }

  // 5. Movement cost calculation
  const sectorCost = SECTOR_MOVE_COST[destRoom.sectorType] ?? 2;
  const moveCost = sectorCost;

  // 6. Insufficient movement check (immortals bypass)
  if (!ch.isImmortal && ch.move < moveCost) {
    ch.sendToChar("You are too exhausted.\r\n");
    return false;
  }

  // 7. Deduct movement (from mount or character)
  if (ch.mount) {
    if (ch.mount.move < moveCost) {
      ch.sendToChar("Your mount is too exhausted.\r\n");
      return false;
    }
    ch.mount.move -= moveCost;
  } else if (!ch.isImmortal) {
    ch.move -= moveCost;
  }

  // 8. Emit leave event
  const dirName = DIR_NAMES[direction] ?? 'somewhere';
  if (eventBus) {
    const payload: CharacterRoomPayload = {
      characterId: ch.id,
      roomVnum: room.vnum,
      direction,
    };
    eventBus.emitEvent(GameEvent.CharacterLeaveRoom, payload);
  }

  // 9. Send departure message to room
  const displayName = ch.isNpc ? ch.shortDescription : ch.name;
  for (const rch of room.characters) {
    if (rch !== ch && !rch.isNpc) {
      rch.sendToChar(`${displayName} leaves ${dirName}.\r\n`);
    }
  }

  // 10. Move character between rooms
  room.removeCharacter(ch);
  destRoom.addCharacter(ch);

  // 11. Send arrival message
  const fromName = DIR_FROM_NAMES[direction] ?? 'somewhere';
  for (const rch of destRoom.characters) {
    if (rch !== ch && !rch.isNpc) {
      rch.sendToChar(`${displayName} has arrived from ${fromName}.\r\n`);
    }
  }

  // 12. Emit enter event
  if (eventBus) {
    const payload: CharacterRoomPayload = {
      characterId: ch.id,
      roomVnum: destRoom.vnum,
      direction,
    };
    eventBus.emitEvent(GameEvent.CharacterEnterRoom, payload);
  }

  // 13. Auto-look
  doLookRoom(ch);

  // 14. Death room check
  if (destRoom.hasFlag(ROOM_FLAGS.DEATH) && !ch.isImmortal) {
    ch.sendToChar("&RYou have entered a death trap!&D\r\n");
    // In full implementation, would trigger character death
    logger?.warn('movement', `${ch.name} entered death room ${destRoom.vnum}`);
  }

  // 15. Follower movement
  if (!isFleeing) {
    for (const fch of [...room.characters]) {
      if (fch.master === ch && fch.position === Position.Standing) {
        fch.sendToChar(`You follow ${displayName}.\r\n`);
        moveChar(fch, direction);
      }
    }
  }

  return true;
}

// =============================================================================
// Room Resolution
// =============================================================================

/** Room lookup table – set by AreaManager or during registration. */
let roomLookup: Map<number, Room> | null = null;

/** Set the room lookup for movement resolution. */
export function setRoomLookup(lookup: Map<number, Room>): void {
  roomLookup = lookup;
}

function resolveRoom(vnum: number): Room | null {
  return roomLookup?.get(vnum) ?? null;
}

// =============================================================================
// Quick auto-look (simplified – delegates to information.ts doLook when available)
// =============================================================================

/** Simplified room look for auto-look on movement. */
function doLookRoom(ch: Character): void {
  const room = ch.inRoom as Room | null;
  if (!room) return;

  ch.sendToChar(`&c${room.name}&D\r\n`);

  // Brief mode check for players
  const player = ch as unknown as { pcData?: { flags: bigint } };
  const BRIEF_FLAG = 1n << 4n; // PLR_BRIEF
  const showDesc = !player.pcData || (player.pcData.flags & BRIEF_FLAG) === 0n;

  if (showDesc && room.description) {
    ch.sendToChar(room.description);
    if (!room.description.endsWith('\r\n') && !room.description.endsWith('\n')) {
      ch.sendToChar('\r\n');
    }
  }

  // Exits
  ch.sendToChar(formatExitsShort(room));

  // Room characters (other than self)
  for (const rch of room.characters) {
    if (rch === ch) continue;
    if (rch.isNpc) {
      ch.sendToChar(`${rch.longDescription || rch.shortDescription}\r\n`);
    } else {
      const posStr = getPositionString(rch);
      ch.sendToChar(`${rch.name}${rch.isNpc ? '' : ''} ${posStr}\r\n`);
    }
  }
}

function formatExitsShort(room: Room): string {
  const exits: string[] = [];
  for (const [dir, exit] of room.exits) {
    if (hasFlag(exit.flags, EX_FLAGS.SECRET) || hasFlag(exit.flags, EX_FLAGS.HIDDEN)) continue;
    const name = (DIR_NAMES[dir] ?? 'somewhere').charAt(0).toUpperCase();
    if (hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
      exits.push(`(${name})`);
    } else {
      exits.push(name);
    }
  }
  if (exits.length === 0) return '&D[Exits: none]\r\n';
  return `&D[Exits: ${exits.join(' ')}]\r\n`;
}

function getPositionString(ch: Character): string {
  switch (ch.position) {
    case Position.Dead: return 'is DEAD!!';
    case Position.Mortal: return 'is mortally wounded.';
    case Position.Incap: return 'is incapacitated.';
    case Position.Stunned: return 'is lying here stunned.';
    case Position.Sleeping: return 'is sleeping here.';
    case Position.Resting: return 'is resting here.';
    case Position.Sitting: return 'is sitting here.';
    case Position.Standing: return 'is here.';
    case Position.Fighting: return `is here, fighting ${ch.fighting ? ch.fighting.name : 'someone'}.`;
    case Position.Mounted: return 'is here, mounted.';
    default: return 'is here.';
  }
}

// =============================================================================
// Utility: Boat Check
// =============================================================================

function hasBoat(ch: Character): boolean {
  if (ch.isImmortal) return true;
  for (const item of ch.inventory) {
    const obj = item as { itemType?: ItemType };
    if (obj.itemType === ItemType.Boat) return true;
  }
  return false;
}

// =============================================================================
// Door Operations
// =============================================================================

/**
 * Find an exit by direction name or keyword.
 * Returns [exit, direction] or [null, -1].
 */
function findDoor(ch: Character, arg: string): [Exit | null, Direction] {
  const room = ch.inRoom as Room | null;
  if (!room) return [null, -1 as Direction];

  // Check direction names first
  for (const [dirStr, dir] of Object.entries(DIR_NAMES)) {
    const dirNum = parseInt(dirStr);
    if (arg.toLowerCase() === dir || arg.toLowerCase() === dir.charAt(0)) {
      const exit = room.getExit(dirNum as Direction);
      if (exit && hasFlag(exit.flags, EX_FLAGS.ISDOOR)) {
        return [exit, dirNum as Direction];
      }
    }
  }

  // Check door keywords
  for (const [dir, exit] of room.exits) {
    if (hasFlag(exit.flags, EX_FLAGS.ISDOOR) && exit.keyword && isName(arg, exit.keyword)) {
      return [exit, dir];
    }
  }

  return [null, -1 as Direction];
}

/**
 * Find the reverse exit (the exit on the other side of a door).
 */
function findReverseExit(exit: Exit, direction: Direction): Exit | null {
  const destRoom = resolveRoom(exit.toRoom);
  if (!destRoom) return null;
  const oppDir = OPPOSITE_DIR[direction];
  if (oppDir === undefined) return null;
  return destRoom.getExit(oppDir) ?? null;
}

/**
 * Perform a door action: open, close, lock, unlock, pick.
 */
export function doDoor(ch: Character, argument: string, action: 'open' | 'close' | 'lock' | 'unlock' | 'pick'): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar(`${action.charAt(0).toUpperCase() + action.slice(1)} what?\r\n`);
    return;
  }

  const [exit, direction] = findDoor(ch, argument.trim());
  if (!exit) {
    ch.sendToChar("You see no door there.\r\n");
    return;
  }

  const doorName = exit.keyword || 'door';

  switch (action) {
    case 'open': {
      if (!hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
        ch.sendToChar(`The ${doorName} is already open.\r\n`);
        return;
      }
      if (hasFlag(exit.flags, EX_FLAGS.LOCKED)) {
        ch.sendToChar(`The ${doorName} is locked.\r\n`);
        return;
      }
      exit.flags = removeFlag(exit.flags, EX_FLAGS.CLOSED);
      ch.sendToChar(`You open the ${doorName}.\r\n`);
      sendToRoom(ch, `${ch.isNpc ? ch.shortDescription : ch.name} opens the ${doorName}.\r\n`);

      // Update reverse exit
      const revExit = findReverseExit(exit, direction);
      if (revExit) {
        revExit.flags = removeFlag(revExit.flags, EX_FLAGS.CLOSED);
      }
      break;
    }

    case 'close': {
      if (hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
        ch.sendToChar(`The ${doorName} is already closed.\r\n`);
        return;
      }
      exit.flags = setFlag(exit.flags, EX_FLAGS.CLOSED);
      ch.sendToChar(`You close the ${doorName}.\r\n`);
      sendToRoom(ch, `${ch.isNpc ? ch.shortDescription : ch.name} closes the ${doorName}.\r\n`);

      const revExit = findReverseExit(exit, direction);
      if (revExit) {
        revExit.flags = setFlag(revExit.flags, EX_FLAGS.CLOSED);
      }
      break;
    }

    case 'lock': {
      if (!hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
        ch.sendToChar(`The ${doorName} is not closed.\r\n`);
        return;
      }
      if (hasFlag(exit.flags, EX_FLAGS.LOCKED)) {
        ch.sendToChar(`The ${doorName} is already locked.\r\n`);
        return;
      }
      if (exit.key <= 0 || !hasKey(ch, exit.key)) {
        ch.sendToChar("You lack the key.\r\n");
        return;
      }
      exit.flags = setFlag(exit.flags, EX_FLAGS.LOCKED);
      ch.sendToChar("*Click*\r\n");

      const revExit = findReverseExit(exit, direction);
      if (revExit) {
        revExit.flags = setFlag(revExit.flags, EX_FLAGS.LOCKED);
      }
      break;
    }

    case 'unlock': {
      if (!hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
        ch.sendToChar(`The ${doorName} is not closed.\r\n`);
        return;
      }
      if (!hasFlag(exit.flags, EX_FLAGS.LOCKED)) {
        ch.sendToChar(`The ${doorName} is not locked.\r\n`);
        return;
      }
      if (exit.key <= 0 || !hasKey(ch, exit.key)) {
        ch.sendToChar("You lack the key.\r\n");
        return;
      }
      exit.flags = removeFlag(exit.flags, EX_FLAGS.LOCKED);
      ch.sendToChar("*Click*\r\n");

      const revExit = findReverseExit(exit, direction);
      if (revExit) {
        revExit.flags = removeFlag(revExit.flags, EX_FLAGS.LOCKED);
      }
      break;
    }

    case 'pick': {
      if (!hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
        ch.sendToChar(`The ${doorName} is not closed.\r\n`);
        return;
      }
      if (!hasFlag(exit.flags, EX_FLAGS.LOCKED)) {
        ch.sendToChar(`The ${doorName} is not locked.\r\n`);
        return;
      }
      if (hasFlag(exit.flags, EX_FLAGS.PICKPROOF)) {
        ch.sendToChar("You failed to pick the lock.\r\n");
        return;
      }
      // Skill check – use learned percent or flat chance for NPCs
      const chance = ch.isNpc ? 75 : numberPercent();
      const skill = ch.isNpc ? 75 : 50; // simplified skill check
      if (chance > skill) {
        ch.sendToChar("You failed to pick the lock.\r\n");
        return;
      }
      exit.flags = removeFlag(exit.flags, EX_FLAGS.LOCKED);
      ch.sendToChar("*Click*\r\n");

      const revExit = findReverseExit(exit, direction);
      if (revExit) {
        revExit.flags = removeFlag(revExit.flags, EX_FLAGS.LOCKED);
      }
      break;
    }
  }
}

/** Check if character has a key with the given vnum. */
function hasKey(ch: Character, keyVnum: number): boolean {
  if (ch.isImmortal) return true;
  for (const item of ch.inventory) {
    const obj = item as { prototype?: { vnum: number }; itemType?: ItemType };
    if (obj.prototype?.vnum === keyVnum) return true;
  }
  return false;
}

/** Send a message to all other characters in the room. */
function sendToRoom(ch: Character, message: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) return;
  for (const rch of room.characters) {
    if (rch !== ch) {
      rch.sendToChar(message);
    }
  }
}

// =============================================================================
// Door Command Wrappers
// =============================================================================

export function doOpen(ch: Character, arg: string): void {
  if (!arg || arg.trim().length === 0) {
    ch.sendToChar("Open what?\r\n");
    return;
  }
  // Try to open a container first
  const [firstArg] = oneArgument(arg);

  // Check for container in inventory or room
  const container = findContainer(ch, firstArg);
  if (container) {
    openContainer(ch, container);
    return;
  }

  // Otherwise try door
  doDoor(ch, arg, 'open');
}

export function doClose(ch: Character, arg: string): void {
  if (!arg || arg.trim().length === 0) {
    ch.sendToChar("Close what?\r\n");
    return;
  }
  const [firstArg] = oneArgument(arg);
  const container = findContainer(ch, firstArg);
  if (container) {
    closeContainer(ch, container);
    return;
  }
  doDoor(ch, arg, 'close');
}

// TODO PARITY: doLock — implement key checking, lock state persistence, container lock support
export function doLock(ch: Character, arg: string): void {
  doDoor(ch, arg, 'lock');
}

// TODO PARITY: doUnlock — implement key checking, unlock state persistence, container unlock support
export function doUnlock(ch: Character, arg: string): void {
  doDoor(ch, arg, 'unlock');
}

// TODO PARITY: doPick — implement thief skill check, lock difficulty, trap detection
export function doPick(ch: Character, arg: string): void {
  doDoor(ch, arg, 'pick');
}

// =============================================================================
// Container Helpers
// =============================================================================

function findContainer(ch: Character, keyword: string): GameObject | null {
  // Check inventory
  for (const item of ch.inventory) {
    if (item instanceof GameObject && item.itemType === ItemType.Container) {
      if (isName(keyword, item.keywords.join(' '))) return item;
    }
  }
  // Check room contents
  const room = ch.inRoom as Room | null;
  if (room) {
    for (const item of room.contents) {
      if (item instanceof GameObject && item.itemType === ItemType.Container) {
        if (isName(keyword, item.keywords.join(' '))) return item;
      }
    }
  }
  return null;
}

function openContainer(ch: Character, obj: GameObject): void {
  if (!hasFlag(obj.extraFlags, 1n << 0n)) { // not closeable check simplified
    ch.sendToChar("You can't do that.\r\n");
    return;
  }
  if ((obj.values[1] ?? 0) === 0) { // already open
    ch.sendToChar("It's already open.\r\n");
    return;
  }
  if ((obj.values[2] ?? 0) !== 0) { // locked
    ch.sendToChar("It's locked.\r\n");
    return;
  }
  obj.values[1] = 0; // open
  ch.sendToChar(`You open ${obj.shortDescription}.\r\n`);
  sendToRoom(ch, `${ch.isNpc ? ch.shortDescription : ch.name} opens ${obj.shortDescription}.\r\n`);
}

function closeContainer(ch: Character, obj: GameObject): void {
  if ((obj.values[1] ?? 0) !== 0) { // already closed
    ch.sendToChar("It's already closed.\r\n");
    return;
  }
  obj.values[1] = 1; // closed
  ch.sendToChar(`You close ${obj.shortDescription}.\r\n`);
  sendToRoom(ch, `${ch.isNpc ? ch.shortDescription : ch.name} closes ${obj.shortDescription}.\r\n`);
}

// =============================================================================
// Recall
// =============================================================================

const DEFAULT_RECALL_VNUM = 3001; // Midgaard temple

export function doRecall(ch: Character, _arg: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) return;

  if (ch.isFighting) {
    // Allow recall only if below 50% HP while fighting
    if (ch.hit > ch.maxHit / 2) {
      ch.sendToChar("You are fighting! Finish the battle first!\r\n");
      return;
    }
  }

  if (room.hasFlag(ROOM_FLAGS.NO_RECALL) && !ch.isImmortal) {
    ch.sendToChar("For some strange reason, nothing happens.\r\n");
    return;
  }

  const recallRoom = resolveRoom(DEFAULT_RECALL_VNUM);
  if (!recallRoom) {
    ch.sendToChar("You are completely lost.\r\n");
    return;
  }

  if (room.vnum === recallRoom.vnum) {
    ch.sendToChar("You are already at your recall point.\r\n");
    return;
  }

  // Movement cost: half current move
  if (!ch.isImmortal) {
    ch.move = Math.floor(ch.move / 2);
  }

  // Stop fighting
  if (ch.fighting) {
    ch.fighting = null;
    ch.position = Position.Standing;
  }

  const displayName = ch.isNpc ? ch.shortDescription : ch.name;

  // Leave event
  if (eventBus) {
    eventBus.emitEvent(GameEvent.CharacterLeaveRoom, {
      characterId: ch.id,
      roomVnum: room.vnum,
    });
  }

  sendToRoom(ch, `${displayName} disappears in a swirl of smoke.\r\n`);
  room.removeCharacter(ch);
  recallRoom.addCharacter(ch);
  sendToRoom(ch, `${displayName} appears in the room.\r\n`);

  // Enter event
  if (eventBus) {
    eventBus.emitEvent(GameEvent.CharacterEnterRoom, {
      characterId: ch.id,
      roomVnum: recallRoom.vnum,
    });
  }

  doLookRoom(ch);
}

// =============================================================================
// Enter / Leave (Portals)
// =============================================================================

export function doEnter(ch: Character, arg: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) return;

  if (!arg || arg.trim().length === 0) {
    ch.sendToChar("Enter what?\r\n");
    return;
  }

  // Find portal in room
  for (const item of room.contents) {
    const obj = item as GameObject;
    if (obj.itemType === ItemType.Portal && isName(arg.trim(), obj.keywords?.join(' ') ?? obj.name)) {
      const destVnum = obj.values[0] ?? 0;
      const destRoom = resolveRoom(destVnum);
      if (!destRoom) {
        ch.sendToChar("The portal leads nowhere.\r\n");
        return;
      }

      const displayName = ch.isNpc ? ch.shortDescription : ch.name;
      sendToRoom(ch, `${displayName} enters ${obj.shortDescription}.\r\n`);

      if (eventBus) {
        eventBus.emitEvent(GameEvent.CharacterLeaveRoom, {
          characterId: ch.id,
          roomVnum: room.vnum,
        });
      }

      room.removeCharacter(ch);
      destRoom.addCharacter(ch);

      if (eventBus) {
        eventBus.emitEvent(GameEvent.CharacterEnterRoom, {
          characterId: ch.id,
          roomVnum: destRoom.vnum,
        });
      }

      ch.sendToChar(`You enter ${obj.shortDescription}.\r\n`);
      sendToRoom(ch, `${displayName} has arrived through a portal.\r\n`);
      doLookRoom(ch);
      return;
    }
  }

  ch.sendToChar("You see no such portal here.\r\n");
}

export function doLeave(ch: Character, _arg: string): void {
  // Simple implementation: just move out (try all directions for an exit)
  const room = ch.inRoom as Room | null;
  if (!room) return;

  // If in a building (INDOORS), try to find an exit leading outside
  if (room.hasFlag(ROOM_FLAGS.INDOORS)) {
    for (const [dir, exit] of room.exits) {
      const destRoom = resolveRoom(exit.toRoom);
      if (destRoom && !destRoom.hasFlag(ROOM_FLAGS.INDOORS)) {
        moveChar(ch, dir);
        return;
      }
    }
  }

  ch.sendToChar("You see no obvious way to leave.\r\n");
}

// =============================================================================
// Flee
// =============================================================================

export function doFlee(ch: Character, _arg: string): void {
  if (!ch.isFighting) {
    ch.sendToChar("You aren't fighting anyone.\r\n");
    return;
  }

  const room = ch.inRoom as Room | null;
  if (!room) return;

  // Collect valid exits
  const validDirs: Direction[] = [];
  for (const [dir, exit] of room.exits) {
    if (!hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
      const destRoom = resolveRoom(exit.toRoom);
      if (destRoom) {
        validDirs.push(dir);
      }
    }
  }

  if (validDirs.length === 0) {
    ch.sendToChar("PANIC! There's nowhere to flee to!\r\n");
    return;
  }

  // Try up to 3 times
  for (let attempt = 0; attempt < 3; attempt++) {
    const dir = validDirs[numberRange(0, validDirs.length - 1)]!;

    // Stop fighting before moving
    const wasHP = ch.hit;
    ch.fighting = null;
    ch.position = Position.Standing;

    if (moveChar(ch, dir, true)) {
      // Success! XP loss: level * 5 to level * 25
      const xpLoss = numberRange(ch.level * 5, ch.level * 25);
      ch.exp = Math.max(0, ch.exp - xpLoss);
      ch.sendToChar(`You flee from combat! You lose ${xpLoss} experience.\r\n`);
      return;
    }

    // Reset fighting state if move failed
    // (In a real implementation we'd restore the fighting target)
    void wasHP;
  }

  ch.sendToChar("PANIC! You couldn't escape!\r\n");
}

// =============================================================================
// Registration
// =============================================================================

/** Register all movement-related commands with the command registry. */
// TODO PARITY: Missing movement commands — climb, drag, dismount, mount, shove, survey
export function registerMovementCommands(registry: CommandRegistry): void {
  const movementCommands: Omit<CommandDef, 'useCount' | 'lagCount' | 'flags'>[] = [
    { name: 'north',  handler: doNorth,  minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'south',  handler: doSouth,  minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'east',   handler: doEast,   minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'west',   handler: doWest,   minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'up',     handler: doUp,     minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'down',   handler: doDown,   minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'open',   handler: doOpen,   minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'close',  handler: doClose,  minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'lock',   handler: doLock,   minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'unlock', handler: doUnlock, minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'pick',   handler: doPick,   minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'recall',  handler: doRecall,  minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'enter',   handler: doEnter,   minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'leave',   handler: doLeave,   minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'flee',    handler: doFlee,    minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
  ];

  for (const cmd of movementCommands) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
