/**
 * immortal.ts – Immortal / admin command handlers for SMAUG 2.0.
 *
 * Replicates legacy act_wiz.c. All commands are trust-gated.
 * Grouped by trust level:
 *   51+ Character management, information
 *   52+ Teleportation
 *   53+ World manipulation
 *   55+ Ban system
 *   58+ System administration
 */

import type { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import { Mobile } from '../entities/Mobile.js';
import { Room } from '../entities/Room.js';
import { GameObject } from '../entities/GameObject.js';
import { Position } from '../entities/types.js';
import { hasFlag, setFlag, removeFlag } from '../../utils/BitVector.js';
import { Logger } from '../../utils/Logger.js';
import { CommandRegistry, type CommandDef, defaultCommandFlags, CommandLogLevel } from './CommandRegistry.js';
import { TRUST_LEVELS } from '../../admin/TrustLevels.js';
import type { BanSystem } from '../../admin/BanSystem.js';
import type { VnumRegistry } from '../world/VnumRegistry.js';
import type { AreaManager } from '../world/AreaManager.js';
import type { ConnectionManager } from '../../network/ConnectionManager.js';
import { isNamePrefix } from '../../utils/StringUtils.js';

// =============================================================================
// Trust Level Constants (local aliases)
// =============================================================================

const LEVEL_IMMORTAL  = TRUST_LEVELS.NEOPHYTE;    // 51
const LEVEL_SAVIOR    = TRUST_LEVELS.ACOLYTE;     // 52
const LEVEL_CREATOR   = TRUST_LEVELS.CREATOR;     // 53
const LEVEL_TRUEIMM   = TRUST_LEVELS.DEMI_GOD;    // 55
const LEVEL_GREATER   = TRUST_LEVELS.GREATER_GOD;  // 58
const LEVEL_IMPLEMENTOR = TRUST_LEVELS.SUPREME;     // 65

// =============================================================================
// Player act flags (bitvector bits used for PLR_ flags)
// =============================================================================

export const PLR_UNAUTHED = 1n << 0n;
export const PLR_FREEZE   = 1n << 6n;
export const PLR_SILENCE  = 1n << 7n;
export const PLR_NOSHOUT  = 1n << 8n;
export const PLR_NOTELL   = 1n << 9n;
export const PLR_LOG      = 1n << 10n;

// =============================================================================
// Module-level dependencies (injected at registration)
// =============================================================================

let logger: Logger | null = null;
let banSystem: BanSystem | null = null;
let vnumRegistry: VnumRegistry | null = null;
let areaManager: AreaManager | null = null;
let connectionManager: ConnectionManager | null = null;

/** Set the logger instance for immortal commands. */
export function setImmortalLogger(l: Logger): void { logger = l; }
/** Set the BanSystem instance. */
export function setImmortalBanSystem(bs: BanSystem): void { banSystem = bs; }
/** Set the VnumRegistry instance. */
export function setImmortalVnumRegistry(vr: VnumRegistry): void { vnumRegistry = vr; }
/** Set the AreaManager instance. */
export function setImmortalAreaManager(am: AreaManager): void { areaManager = am; }
/** Set the ConnectionManager instance. */
export function setImmortalConnectionManager(cm: ConnectionManager): void { connectionManager = cm; }

// =============================================================================
// Helper: find players/characters
// =============================================================================

/**
 * Find an online player by name (case-insensitive prefix match).
 */
function findPlayerByName(name: string): Player | null {
  if (!connectionManager) return null;
  const lower = name.toLowerCase();
  for (const desc of connectionManager.getAllDescriptors()) {
    const ch = desc.character as Player | null;
    if (ch && ch instanceof Player && ch.name.toLowerCase().startsWith(lower)) {
      return ch;
    }
  }
  return null;
}

/**
 * Find any character (player or mob) by name, searching all rooms.
 */
function findCharByName(name: string): Character | null {
  // Try players first
  const player = findPlayerByName(name);
  if (player) return player;

  // Try mobs in all rooms
  if (!vnumRegistry) return null;
  for (const room of vnumRegistry.getAllRooms()) {
    for (const ch of room.characters) {
      if (isNamePrefix(name, ch.name)) {
        return ch;
      }
    }
  }
  return null;
}

/**
 * Find a character in a specific room by name.
 */
function findCharInRoom(room: Room, name: string): Character | null {
  const lower = name.toLowerCase();
  for (const ch of room.characters) {
    if (ch.name.toLowerCase().startsWith(lower) ||
        ch.shortDescription.toLowerCase().startsWith(lower)) {
      return ch;
    }
  }
  return null;
}

/**
 * Find an object in room or inventory by name.
 */
function findObjHere(ch: Character, name: string): GameObject | null {
  const lower = name.toLowerCase();
  // Check inventory
  for (const item of ch.inventory) {
    const obj = item as GameObject;
    if (obj && obj.name && obj.name.toLowerCase().startsWith(lower)) {
      return obj;
    }
  }
  // Check room contents
  const room = ch.inRoom as Room | null;
  if (room) {
    for (const item of room.contents) {
      const obj = item as GameObject;
      if (obj && obj.name && obj.name.toLowerCase().startsWith(lower)) {
        return obj;
      }
    }
  }
  return null;
}

// =============================================================================
// Helper: room movement
// =============================================================================

function charFromRoom(ch: Character): void {
  const room = ch.inRoom as Room | null;
  if (room) {
    room.removeCharacter(ch);
  }
}

function charToRoom(ch: Character, room: Room): void {
  room.addCharacter(ch);
}

// =============================================================================
// Character Management (Trust 51+)
// =============================================================================

/**
 * doAuthorize – Approve or deny pending new characters.
 * Syntax: authorize <name> yes|no
 */
export function doAuthorize(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  const parts = arg.trim().split(/\s+/);
  const name = parts[0];
  const decision = parts[1];

  if (!name || !decision) {
    ch.sendToChar('Syntax: authorize <name> yes|no\r\n');
    return;
  }

  const target = findPlayerByName(name);
  if (!target) {
    ch.sendToChar('No such player pending authorization.\r\n');
    return;
  }

  if (!hasFlag(target.actFlags, PLR_UNAUTHED)) {
    ch.sendToChar('That player is not awaiting authorization.\r\n');
    return;
  }

  if (decision.toLowerCase() === 'yes') {
    target.actFlags = removeFlag(target.actFlags, PLR_UNAUTHED);
    target.sendToChar('You have been authorized to play!\r\n');
    ch.sendToChar(`${target.name} has been authorized.\r\n`);
    logger?.info('admin', `${ch.name} authorized ${target.name}`);
  } else if (decision.toLowerCase() === 'no') {
    ch.sendToChar(`${target.name} has been denied and will be disconnected.\r\n`);
    target.sendToChar('Your character has been denied. Goodbye.\r\n');
    if (target.descriptor) {
      target.descriptor.close();
    }
    logger?.info('admin', `${ch.name} denied ${target.name}`);
  } else {
    ch.sendToChar('Syntax: authorize <name> yes|no\r\n');
  }
}

/**
 * doFreeze – Toggle freeze flag on a player.
 * Frozen players cannot execute commands except quit.
 */
export function doFreeze(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  const name = arg.trim();
  if (!name) { ch.sendToChar('Freeze whom?\r\n'); return; }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (target.getTrust() >= ch.getTrust()) { ch.sendToChar('You can\'t do that.\r\n'); return; }

  if (hasFlag(target.actFlags, PLR_FREEZE)) {
    target.actFlags = removeFlag(target.actFlags, PLR_FREEZE);
    target.sendToChar('You can play again.\r\n');
    ch.sendToChar(`${target.name} is now unfrozen.\r\n`);
  } else {
    target.actFlags = setFlag(target.actFlags, PLR_FREEZE);
    target.sendToChar('You have been frozen!\r\n');
    ch.sendToChar(`${target.name} is now frozen.\r\n`);
  }
  logger?.info('admin', `${ch.name} toggled freeze on ${target.name}`);
}

/**
 * doSilence – Toggle silence flag (cannot use channels).
 */
export function doSilence(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  const name = arg.trim();
  if (!name) { ch.sendToChar('Silence whom?\r\n'); return; }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (target.getTrust() >= ch.getTrust()) { ch.sendToChar('You can\'t do that.\r\n'); return; }

  if (hasFlag(target.actFlags, PLR_SILENCE)) {
    target.actFlags = removeFlag(target.actFlags, PLR_SILENCE);
    target.sendToChar('You can use channels again.\r\n');
    ch.sendToChar(`${target.name} is no longer silenced.\r\n`);
  } else {
    target.actFlags = setFlag(target.actFlags, PLR_SILENCE);
    target.sendToChar('You have been silenced!\r\n');
    ch.sendToChar(`${target.name} is now silenced.\r\n`);
  }
  logger?.info('admin', `${ch.name} toggled silence on ${target.name}`);
}

/**
 * doNoshout – Toggle noshout flag.
 */
export function doNoshout(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  const name = arg.trim();
  if (!name) { ch.sendToChar('Noshout whom?\r\n'); return; }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (target.getTrust() >= ch.getTrust()) { ch.sendToChar('You can\'t do that.\r\n'); return; }

  if (hasFlag(target.actFlags, PLR_NOSHOUT)) {
    target.actFlags = removeFlag(target.actFlags, PLR_NOSHOUT);
    target.sendToChar('You can shout again.\r\n');
    ch.sendToChar(`${target.name} can shout again.\r\n`);
  } else {
    target.actFlags = setFlag(target.actFlags, PLR_NOSHOUT);
    target.sendToChar('You can no longer shout!\r\n');
    ch.sendToChar(`${target.name} can no longer shout.\r\n`);
  }
  logger?.info('admin', `${ch.name} toggled noshout on ${target.name}`);
}

/**
 * doNotell – Toggle notell flag.
 */
export function doNotell(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  const name = arg.trim();
  if (!name) { ch.sendToChar('Notell whom?\r\n'); return; }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (target.getTrust() >= ch.getTrust()) { ch.sendToChar('You can\'t do that.\r\n'); return; }

  if (hasFlag(target.actFlags, PLR_NOTELL)) {
    target.actFlags = removeFlag(target.actFlags, PLR_NOTELL);
    target.sendToChar('You can use tell again.\r\n');
    ch.sendToChar(`${target.name} can use tell again.\r\n`);
  } else {
    target.actFlags = setFlag(target.actFlags, PLR_NOTELL);
    target.sendToChar('You can no longer use tell!\r\n');
    ch.sendToChar(`${target.name} can no longer use tell.\r\n`);
  }
  logger?.info('admin', `${ch.name} toggled notell on ${target.name}`);
}

/**
 * doLog – Toggle command logging for a player.
 */
export function doLog(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  const name = arg.trim();
  if (!name) { ch.sendToChar('Log whom?\r\n'); return; }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t here.\r\n'); return; }

  if (hasFlag(target.actFlags, PLR_LOG)) {
    target.actFlags = removeFlag(target.actFlags, PLR_LOG);
    ch.sendToChar(`${target.name} is no longer being logged.\r\n`);
  } else {
    target.actFlags = setFlag(target.actFlags, PLR_LOG);
    ch.sendToChar(`${target.name} is now being logged.\r\n`);
  }
  logger?.info('admin', `${ch.name} toggled log on ${target.name}`);
}

// =============================================================================
// Teleportation (Trust 52+)
// =============================================================================

/**
 * doGoto – Teleport to room by vnum or to player/mob by name.
 * Syntax: goto <vnum> OR goto <name>
 */
export function doGoto(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_SAVIOR) { ch.sendToChar('Huh?\r\n'); return; }

  const target = arg.trim();
  if (!target) { ch.sendToChar('Goto where?\r\n'); return; }

  let targetRoom: Room | undefined;

  // Try as vnum first
  const vnum = parseInt(target, 10);
  if (!isNaN(vnum) && vnumRegistry) {
    targetRoom = vnumRegistry.getRoom(vnum);
  }

  // Try as character name
  if (!targetRoom) {
    const targetChar = findCharByName(target);
    if (targetChar && targetChar.inRoom) {
      targetRoom = targetChar.inRoom as Room;
    }
  }

  if (!targetRoom) {
    ch.sendToChar('No such location.\r\n');
    return;
  }

  // Show bamfout message to current room
  const currentRoom = ch.inRoom as Room | null;
  if (currentRoom) {
    const bamfout = (ch instanceof Player) ? ch.pcData.bamfOut : `${ch.name} leaves in a swirling mist.`;
    for (const occ of currentRoom.characters) {
      if (occ !== ch) {
        occ.sendToChar(`${bamfout}\r\n`);
      }
    }
    charFromRoom(ch);
  }

  // Move to target room
  charToRoom(ch, targetRoom);

  // Show bamfin message to new room
  const bamfin = (ch instanceof Player) ? ch.pcData.bamfIn : `${ch.name} appears in a swirling mist.`;
  for (const occ of targetRoom.characters) {
    if (occ !== ch) {
      occ.sendToChar(`${bamfin}\r\n`);
    }
  }

  // Show room info to the mover
  ch.sendToChar(`${targetRoom.name}\r\n`);
  ch.sendToChar(`${targetRoom.description}\r\n`);
}

/**
 * doTransfer – Teleport a player to your room.
 * Syntax: transfer <name> [room_vnum]
 */
export function doTransfer(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_SAVIOR) { ch.sendToChar('Huh?\r\n'); return; }

  const parts = arg.trim().split(/\s+/);
  const name = parts[0];
  const roomArg = parts[1];

  if (!name) { ch.sendToChar('Transfer whom?\r\n'); return; }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t playing.\r\n'); return; }

  let destRoom: Room | undefined;
  if (roomArg && vnumRegistry) {
    const vnum = parseInt(roomArg, 10);
    destRoom = vnumRegistry.getRoom(vnum);
    if (!destRoom) { ch.sendToChar('No such room.\r\n'); return; }
  } else {
    destRoom = ch.inRoom as Room | undefined;
  }

  if (!destRoom) { ch.sendToChar('You are not in a room.\r\n'); return; }

  // Remove from old room
  const oldRoom = target.inRoom as Room | null;
  if (oldRoom) {
    for (const occ of oldRoom.characters) {
      if (occ !== target) {
        occ.sendToChar(`${target.name} disappears in a puff of smoke.\r\n`);
      }
    }
    charFromRoom(target);
  }

  charToRoom(target, destRoom);
  for (const occ of destRoom.characters) {
    if (occ !== target) {
      occ.sendToChar(`${target.name} arrives in a puff of smoke.\r\n`);
    }
  }
  target.sendToChar('You have been transferred!\r\n');
  ch.sendToChar('Ok.\r\n');
}

/**
 * doAt – Execute a command at a remote location.
 * Syntax: at <vnum|name> <command>
 */
export function doAt(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_SAVIOR) { ch.sendToChar('Huh?\r\n'); return; }

  const spaceIdx = arg.indexOf(' ');
  if (spaceIdx === -1) { ch.sendToChar('At where what?\r\n'); return; }

  const location = arg.substring(0, spaceIdx).trim();
  const command = arg.substring(spaceIdx + 1).trim();

  // Find target room
  let targetRoom: Room | undefined;
  const vnum = parseInt(location, 10);
  if (!isNaN(vnum) && vnumRegistry) {
    targetRoom = vnumRegistry.getRoom(vnum);
  }
  if (!targetRoom) {
    const target = findCharByName(location);
    if (target && target.inRoom) {
      targetRoom = target.inRoom as Room;
    }
  }

  if (!targetRoom) { ch.sendToChar('No such location.\r\n'); return; }

  // Save original room, move, execute, return
  const originalRoom = ch.inRoom as Room | null;
  charFromRoom(ch);
  charToRoom(ch, targetRoom);

  // Execute the command via the player's interpretCommand
  if (ch instanceof Player) {
    ch.interpretCommand(command);
  }

  // Return to original room
  charFromRoom(ch);
  if (originalRoom) {
    charToRoom(ch, originalRoom);
  }
}

/**
 * doBamfin – Set custom arrival message.
 */
export function doBamfin(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_SAVIOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  if (!arg.trim()) {
    ch.sendToChar(`Your bamfin is: ${ch.pcData.bamfIn || '(default)'}\r\n`);
    return;
  }

  ch.pcData.bamfIn = arg.trim();
  ch.sendToChar('Bamfin set.\r\n');
}

/**
 * doBamfout – Set custom departure message.
 */
export function doBamfout(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_SAVIOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  if (!arg.trim()) {
    ch.sendToChar(`Your bamfout is: ${ch.pcData.bamfOut || '(default)'}\r\n`);
    return;
  }

  ch.pcData.bamfOut = arg.trim();
  ch.sendToChar('Bamfout set.\r\n');
}

// =============================================================================
// World Manipulation (Trust 53+)
// =============================================================================

/**
 * doPurge – Remove all NPCs and objects from room (or specific one).
 * Syntax: purge [target]
 */
export function doPurge(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  const room = ch.inRoom as Room | null;
  if (!room) return;

  const target = arg.trim();

  if (!target) {
    // Purge all NPCs and objects in room
    const toRemove = room.characters.filter(c => c instanceof Mobile);
    for (const mob of toRemove) {
      room.removeCharacter(mob);
    }
    room.contents = [];
    ch.sendToChar('Room purged.\r\n');
    for (const occ of room.characters) {
      if (occ !== ch) {
        occ.sendToChar(`${ch.name} purges the room.\r\n`);
      }
    }
    return;
  }

  // Purge specific target
  const victim = findCharInRoom(room, target);
  if (victim && victim instanceof Mobile) {
    for (const occ of room.characters) {
      if (occ !== ch && occ !== victim) {
        occ.sendToChar(`${ch.name} purges ${victim.shortDescription}.\r\n`);
      }
    }
    room.removeCharacter(victim);
    ch.sendToChar('Ok.\r\n');
    return;
  }

  ch.sendToChar('Nothing like that here.\r\n');
}

/**
 * doMload – Load a mob by vnum.
 * Syntax: mload <vnum>
 */
export function doMload(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  const room = ch.inRoom as Room | null;
  if (!room) return;

  const vnum = parseInt(arg.trim(), 10);
  if (isNaN(vnum)) { ch.sendToChar('Syntax: mload <vnum>\r\n'); return; }

  if (!vnumRegistry) { ch.sendToChar('VnumRegistry not available.\r\n'); return; }

  const prototype = vnumRegistry.getMobile(vnum);
  if (!prototype) { ch.sendToChar('No mob has that vnum.\r\n'); return; }

  const mob = new Mobile(prototype);
  charToRoom(mob, room);
  ch.sendToChar('Ok.\r\n');

  for (const occ of room.characters) {
    if (occ !== ch && occ !== mob) {
      occ.sendToChar(`${ch.name} has created ${mob.shortDescription}!\r\n`);
    }
  }

  logger?.info('admin', `${ch.name} loaded mob ${vnum} at room ${room.vnum}`);
}

/**
 * doOload – Load an object by vnum.
 * Syntax: oload <vnum> [level]
 */
export function doOload(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }

  const parts = arg.trim().split(/\s+/);
  const vnum = parseInt(parts[0] ?? '', 10);
  if (isNaN(vnum)) { ch.sendToChar('Syntax: oload <vnum> [level]\r\n'); return; }

  if (!vnumRegistry) { ch.sendToChar('VnumRegistry not available.\r\n'); return; }

  const prototype = vnumRegistry.getObject(vnum);
  if (!prototype) { ch.sendToChar('No object has that vnum.\r\n'); return; }

  const obj = new GameObject(prototype);
  if (parts[1]) {
    const level = parseInt(parts[1], 10);
    if (!isNaN(level)) {
      (obj as any).level = level;
    }
  }

  // Give to character (add to inventory)
  ch.inventory.push(obj);
  (obj as any).carriedBy = ch;

  const room = ch.inRoom as Room | null;
  if (room) {
    for (const occ of room.characters) {
      if (occ !== ch) {
        occ.sendToChar(`${ch.name} has created ${obj.shortDescription}!\r\n`);
      }
    }
  }

  ch.sendToChar('Ok.\r\n');
  logger?.info('admin', `${ch.name} loaded object ${vnum}`);
}

/**
 * doSlay – Instantly kill a character (bypasses all protections).
 */
export function doSlay(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  const room = ch.inRoom as Room | null;
  if (!room) return;

  const name = arg.trim();
  if (!name) { ch.sendToChar('Slay whom?\r\n'); return; }

  const target = findCharInRoom(room, name);
  if (!target) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (target === ch) { ch.sendToChar('Suicide is a mortal sin.\r\n'); return; }
  if (target instanceof Player && target.getTrust() >= ch.getTrust()) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  ch.sendToChar(`You slay ${target.name} in cold blood!\r\n`);
  target.sendToChar(`${ch.name} slays you in cold blood!\r\n`);
  for (const occ of room.characters) {
    if (occ !== ch && occ !== target) {
      occ.sendToChar(`${ch.name} slays ${target.name} in cold blood!\r\n`);
    }
  }

  // Kill the target
  target.hit = -10;
  target.position = Position.Dead;
  if (target instanceof Mobile) {
    room.removeCharacter(target);
  }

  logger?.info('admin', `${ch.name} slayed ${target.name}`);
}

/**
 * doForce – Force a player to execute a command.
 * Syntax: force <name|all> <command>
 */
export function doForce(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }

  const spaceIdx = arg.indexOf(' ');
  if (spaceIdx === -1) { ch.sendToChar('Force whom to do what?\r\n'); return; }

  const name = arg.substring(0, spaceIdx).trim();
  const command = arg.substring(spaceIdx + 1).trim();

  if (name.toLowerCase() === 'all') {
    if (!connectionManager) { ch.sendToChar('No connection manager available.\r\n'); return; }
    for (const desc of connectionManager.getAllDescriptors()) {
      const player = desc.character as Player | null;
      if (player && player instanceof Player && player.getTrust() < ch.getTrust()) {
        player.sendToChar(`${ch.name} forces you to '${command}'.\r\n`);
        player.interpretCommand(command);
      }
    }
    ch.sendToChar('Ok.\r\n');
    return;
  }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t playing.\r\n'); return; }
  if (target.getTrust() >= ch.getTrust()) { ch.sendToChar('Do it yourself!\r\n'); return; }

  target.sendToChar(`${ch.name} forces you to '${command}'.\r\n`);
  target.interpretCommand(command);
  ch.sendToChar('Ok.\r\n');
  logger?.info('admin', `${ch.name} forced ${target.name} to '${command}'`);
}

/**
 * doSnoop – See all input/output of another player's session.
 */
export function doSnoop(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  const name = arg.trim();
  if (!name) {
    if (ch.pcData.snooping) {
      ch.pcData.snooping.pcData.snoopedBy = null;
      ch.pcData.snooping = null;
      ch.sendToChar('You stop snooping.\r\n');
    } else {
      ch.sendToChar('You aren\'t snooping anyone.\r\n');
    }
    return;
  }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t playing.\r\n'); return; }
  if (target === ch) { ch.sendToChar('Snooping yourself is pointless.\r\n'); return; }
  if (target.getTrust() >= ch.getTrust()) { ch.sendToChar('You failed.\r\n'); return; }

  // Check for snoop loops
  let loop: Player | null = target;
  while (loop && loop.pcData.snooping) {
    if (loop.pcData.snooping === ch) {
      ch.sendToChar('No snoop loops.\r\n');
      return;
    }
    loop = loop.pcData.snooping;
  }

  // Stop current snoop if any
  if (ch.pcData.snooping) {
    ch.pcData.snooping.pcData.snoopedBy = null;
  }

  ch.pcData.snooping = target;
  target.pcData.snoopedBy = ch;
  ch.sendToChar(`You start snooping ${target.name}.\r\n`);
  logger?.info('admin', `${ch.name} started snooping ${target.name}`);
}

/**
 * doSwitch – Possess an NPC body.
 */
export function doSwitch(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  const name = arg.trim();
  if (!name) { ch.sendToChar('Switch into whom?\r\n'); return; }

  const room = ch.inRoom as Room | null;
  if (!room) return;

  const target = findCharInRoom(room, name);
  if (!target) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (!(target instanceof Mobile)) { ch.sendToChar('You can only switch into NPCs.\r\n'); return; }
  if (ch.pcData.switched) { ch.sendToChar('You are already switched.\r\n'); return; }

  ch.pcData.switched = target;
  (target as any).switched = ch;
  ch.sendToChar(`You switch into ${target.shortDescription}.\r\n`);
  logger?.info('admin', `${ch.name} switched into mob vnum ${target.prototype.vnum}`);
}

/**
 * doReturn – Return from switch/possess.
 */
export function doReturn(ch: Character, _arg: string): void {
  if (ch instanceof Player) {
    if (!ch.pcData.switched) {
      ch.sendToChar('You aren\'t switched.\r\n');
      return;
    }
    (ch.pcData.switched as any).switched = null;
    ch.pcData.switched = null;
    ch.sendToChar('You return to your body.\r\n');
  } else {
    ch.sendToChar('Huh?\r\n');
  }
}

// =============================================================================
// System Administration (Trust 58+)
// =============================================================================

/**
 * doReboot – Initiate server reboot (stub: logs and notifies).
 */
// TODO PARITY: doReboot — stub; needs actual process restart/shutdown/hot-reboot logic
export function doReboot(ch: Character, _arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  if (connectionManager) {
    for (const desc of connectionManager.getAllDescriptors()) {
      const player = desc.character as Player | null;
      if (player) {
        player.sendToChar('\r\n*** Server is rebooting. Please reconnect in a moment. ***\r\n');
      }
    }
  }

  logger?.info('admin', `${ch.name} initiated server reboot`);
  ch.sendToChar('Reboot initiated.\r\n');
}

/**
 * doShutdown – Shut down the server.
 * Syntax: shutdown [nosave]
 */
// TODO PARITY: doShutdown — stub; needs actual process restart/shutdown/hot-reboot logic
export function doShutdown(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  const nosave = arg.trim().toLowerCase() === 'nosave';

  if (connectionManager) {
    for (const desc of connectionManager.getAllDescriptors()) {
      const player = desc.character as Player | null;
      if (player) {
        player.sendToChar('\r\n*** Server is shutting down. Goodbye! ***\r\n');
      }
    }
  }

  logger?.info('admin', `${ch.name} initiated server shutdown${nosave ? ' (nosave)' : ''}`);
  ch.sendToChar('Shutdown initiated.\r\n');
}

/**
 * doCopyover – Hot reboot (stub: logs and saves state).
 */
// TODO PARITY: doCopyover — stub; needs actual process restart/shutdown/hot-reboot logic
export function doCopyover(ch: Character, _arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  if (connectionManager) {
    for (const desc of connectionManager.getAllDescriptors()) {
      const player = desc.character as Player | null;
      if (player) {
        player.sendToChar('\r\n*** Copyover in progress. Please wait... ***\r\n');
      }
    }
  }

  logger?.info('admin', `${ch.name} initiated copyover`);
  ch.sendToChar('Copyover initiated.\r\n');
}

/**
 * doSet – Set player/mob/object/room properties.
 * Syntax: set char <name> <field> <value>
 *         set room <field> <value>
 */
export function doSet(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  const args = arg.trim().split(/\s+/);
  if (args.length < 3) {
    ch.sendToChar('Syntax: set <char|mob|room> <target> <field> <value>\r\n');
    return;
  }

  const type = args[0]!.toLowerCase();

  switch (type) {
    case 'char':
    case 'player': {
      const target = findPlayerByName(args[1] ?? '');
      if (!target) { ch.sendToChar('Player not found.\r\n'); return; }
      setCharField(ch, target, args[2] ?? '', args.slice(3).join(' '));
      break;
    }
    case 'mob': {
      const room = ch.inRoom as Room | null;
      if (!room) { ch.sendToChar('You are not in a room.\r\n'); return; }
      const target = findCharInRoom(room, args[1] ?? '');
      if (!target || !(target instanceof Mobile)) { ch.sendToChar('Mob not found.\r\n'); return; }
      setCharField(ch, target, args[2] ?? '', args.slice(3).join(' '));
      break;
    }
    case 'obj': {
      const obj = findObjHere(ch, args[1] ?? '');
      if (!obj) { ch.sendToChar('Object not found.\r\n'); return; }
      setObjField(ch, obj, args[2] ?? '', args.slice(3).join(' '));
      break;
    }
    case 'room': {
      const room = ch.inRoom as Room | null;
      if (!room) { ch.sendToChar('You are not in a room.\r\n'); return; }
      setRoomField(ch, room, args[1] ?? '', args.slice(2).join(' '));
      break;
    }
    default:
      ch.sendToChar('Set what? char, mob, obj, or room?\r\n');
  }
}

function setCharField(ch: Character, target: Character, field: string, value: string): void {
  const numValue = parseInt(value, 10);

  switch (field.toLowerCase()) {
    case 'level':
      if (isNaN(numValue) || numValue < 1 || numValue > LEVEL_IMPLEMENTOR) {
        ch.sendToChar('Level must be 1-65.\r\n');
        return;
      }
      target.level = numValue;
      ch.sendToChar(`${target.name}'s level set to ${numValue}.\r\n`);
      break;
    case 'hp':
      target.hit = numValue;
      ch.sendToChar(`${target.name}'s HP set to ${numValue}.\r\n`);
      break;
    case 'maxhp':
      target.maxHit = numValue;
      ch.sendToChar(`${target.name}'s max HP set to ${numValue}.\r\n`);
      break;
    case 'mana':
      target.mana = numValue;
      ch.sendToChar(`${target.name}'s mana set to ${numValue}.\r\n`);
      break;
    case 'maxmana':
      target.maxMana = numValue;
      ch.sendToChar(`${target.name}'s max mana set to ${numValue}.\r\n`);
      break;
    case 'move':
      target.move = numValue;
      ch.sendToChar(`${target.name}'s move set to ${numValue}.\r\n`);
      break;
    case 'maxmove':
      target.maxMove = numValue;
      ch.sendToChar(`${target.name}'s max move set to ${numValue}.\r\n`);
      break;
    case 'gold':
      target.gold = numValue;
      ch.sendToChar(`${target.name}'s gold set to ${numValue}.\r\n`);
      break;
    case 'exp':
      if (target instanceof Player) {
        target.exp = numValue;
        ch.sendToChar(`${target.name}'s exp set to ${numValue}.\r\n`);
      } else {
        ch.sendToChar('Can only set exp on players.\r\n');
      }
      break;
    case 'alignment':
      target.alignment = Math.max(-1000, Math.min(1000, numValue));
      ch.sendToChar(`${target.name}'s alignment set to ${target.alignment}.\r\n`);
      break;
    case 'str':
      target.permStats.str = numValue;
      ch.sendToChar(`${target.name}'s STR set to ${numValue}.\r\n`);
      break;
    case 'int':
      target.permStats.int = numValue;
      ch.sendToChar(`${target.name}'s INT set to ${numValue}.\r\n`);
      break;
    case 'wis':
      target.permStats.wis = numValue;
      ch.sendToChar(`${target.name}'s WIS set to ${numValue}.\r\n`);
      break;
    case 'dex':
      target.permStats.dex = numValue;
      ch.sendToChar(`${target.name}'s DEX set to ${numValue}.\r\n`);
      break;
    case 'con':
      target.permStats.con = numValue;
      ch.sendToChar(`${target.name}'s CON set to ${numValue}.\r\n`);
      break;
    case 'cha':
      target.permStats.cha = numValue;
      ch.sendToChar(`${target.name}'s CHA set to ${numValue}.\r\n`);
      break;
    case 'lck':
      target.permStats.lck = numValue;
      ch.sendToChar(`${target.name}'s LCK set to ${numValue}.\r\n`);
      break;
    case 'trust':
      if (target instanceof Player) {
        if (numValue > ch.getTrust()) {
          ch.sendToChar('You can\'t set trust higher than your own.\r\n');
          return;
        }
        target.trust = numValue;
        ch.sendToChar(`${target.name}'s trust set to ${numValue}.\r\n`);
      } else {
        ch.sendToChar('Can only set trust on players.\r\n');
      }
      break;
    case 'practice':
      if (target instanceof Player) {
        target.practice = numValue;
        ch.sendToChar(`${target.name}'s practices set to ${numValue}.\r\n`);
      } else {
        ch.sendToChar('Can only set practice on players.\r\n');
      }
      break;
    case 'sex':
      target.sex = numValue;
      ch.sendToChar(`${target.name}'s sex set to ${numValue}.\r\n`);
      break;
    case 'title':
      if (target instanceof Player) {
        target.pcData.title = value;
        ch.sendToChar(`${target.name}'s title set.\r\n`);
      }
      break;
    default:
      ch.sendToChar(`Unknown field: ${field}\r\n`);
      return;
  }

  logger?.info('admin', `${ch.name} set ${target.name} ${field} to ${value}`);
}

function setObjField(ch: Character, obj: GameObject, field: string, value: string): void {
  const numValue = parseInt(value, 10);

  switch (field.toLowerCase()) {
    case 'weight':
      obj.weight = numValue;
      ch.sendToChar(`Object weight set to ${numValue}.\r\n`);
      break;
    case 'cost':
      obj.cost = numValue;
      ch.sendToChar(`Object cost set to ${numValue}.\r\n`);
      break;
    case 'timer':
      obj.timer = numValue;
      ch.sendToChar(`Object timer set to ${numValue}.\r\n`);
      break;
    default:
      ch.sendToChar(`Unknown object field: ${field}\r\n`);
      return;
  }

  logger?.info('admin', `${ch.name} set object ${obj.name} ${field} to ${value}`);
}

function setRoomField(ch: Character, room: Room, field: string, value: string): void {
  const numValue = parseInt(value, 10);

  switch (field.toLowerCase()) {
    case 'name':
      room.name = value;
      ch.sendToChar('Room name set.\r\n');
      break;
    case 'sector':
      room.sectorType = numValue;
      ch.sendToChar(`Room sector set to ${numValue}.\r\n`);
      break;
    case 'tunnel':
      room.tunnel = numValue;
      ch.sendToChar(`Room tunnel set to ${numValue}.\r\n`);
      break;
    case 'teleport':
      room.teleportVnum = numValue;
      ch.sendToChar(`Room teleport vnum set to ${numValue}.\r\n`);
      break;
    default:
      ch.sendToChar(`Unknown room field: ${field}\r\n`);
      return;
  }

  logger?.info('admin', `${ch.name} set room ${room.vnum} ${field} to ${value}`);
}

/**
 * doStat – Display detailed stats of player/mob/object/room.
 * Syntax: stat <char|mob|obj|room> [target]
 */
export function doStat(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  const args = arg.trim().split(/\s+/);
  const type = args[0]?.toLowerCase() || 'room';
  const targetName = args[1];

  switch (type) {
    case 'char':
    case 'player':
    case 'mob': {
      let victim: Character | null = null;
      if (targetName) {
        victim = findCharByName(targetName);
      } else {
        victim = ch;
      }
      if (!victim) { ch.sendToChar('They aren\'t here.\r\n'); return; }
      statChar(ch, victim);
      break;
    }
    case 'obj': {
      if (!targetName) { ch.sendToChar('Stat what object?\r\n'); return; }
      const obj = findObjHere(ch, targetName);
      if (!obj) { ch.sendToChar('Nothing like that here.\r\n'); return; }
      statObj(ch, obj);
      break;
    }
    case 'room': {
      const room = ch.inRoom as Room | null;
      if (!room) { ch.sendToChar('You are not in a room.\r\n'); return; }
      statRoom(ch, room);
      break;
    }
    default:
      ch.sendToChar('Stat what? char, mob, obj, or room?\r\n');
  }
}

function statChar(ch: Character, victim: Character): void {
  const isPlayerTarget = victim instanceof Player;
  const isMobileTarget = victim instanceof Mobile;

  let output = `Name: ${victim.name}`;
  if (isPlayerTarget) output += ` (${(victim as Player).pcData.title})`;
  output += `\r\n`;

  output += `Level: ${victim.level}  Race: ${victim.race}  Class: ${victim.class_}  Sex: ${victim.sex}\r\n`;

  if (isMobileTarget) {
    output += `Vnum: ${(victim as Mobile).prototype.vnum}  In room: ${(victim.inRoom as Room)?.vnum ?? 'none'}\r\n`;
  }

  output += `HP: ${victim.hit}/${victim.maxHit}  Mana: ${victim.mana}/${victim.maxMana}  Move: ${victim.move}/${victim.maxMove}\r\n`;

  output += `Str: ${victim.getStat('str')}  Int: ${victim.getStat('int')}  Wis: ${victim.getStat('wis')}  Dex: ${victim.getStat('dex')}  Con: ${victim.getStat('con')}  Cha: ${victim.getStat('cha')}  Lck: ${victim.getStat('lck')}\r\n`;

  output += `Gold: ${victim.gold}  Alignment: ${victim.alignment}  Position: ${victim.position}\r\n`;

  if (isPlayerTarget) {
    const p = victim as Player;
    output += `Trust: ${p.trust}  Exp: ${p.exp}  Practices: ${p.practice}\r\n`;
    output += `Played: ${Math.floor(p.pcData.played / 3600)} hours\r\n`;
  }

  output += `Act flags: ${victim.actFlags.toString(16)}\r\n`;
  output += `Affected by: ${victim.affectedBy.toString(16)}\r\n`;

  if (victim.affects.length > 0) {
    output += `Affects:\r\n`;
    for (const aff of victim.affects) {
      output += `  type ${aff.type} for ${aff.duration} ticks\r\n`;
    }
  }

  ch.sendToChar(output);
}

function statObj(ch: Character, obj: GameObject): void {
  let output = `Name: ${obj.name}\r\n`;
  output += `Short: ${obj.shortDescription}\r\n`;
  output += `Vnum: ${obj.prototype.vnum}  Type: ${obj.itemType}\r\n`;
  output += `Weight: ${obj.weight}  Cost: ${obj.cost}  Timer: ${obj.timer}\r\n`;
  output += `Values: ${obj.values.join(' ')}\r\n`;
  output += `Extra flags: ${obj.extraFlags.toString(16)}\r\n`;
  output += `Wear flags: ${obj.wearFlags.toString(16)}\r\n`;

  if (obj.affects.length > 0) {
    output += `Affects:\r\n`;
    for (const aff of obj.affects) {
      output += `  location ${aff.location} modifier ${aff.modifier}\r\n`;
    }
  }

  ch.sendToChar(output);
}

function statRoom(ch: Character, room: Room): void {
  let output = `Room: ${room.vnum}  Name: ${room.name}\r\n`;
  output += `Sector: ${room.sectorType}  Flags: ${room.roomFlags.toString(16)}\r\n`;
  output += `Area: ${room.area?.name ?? 'none'}\r\n`;
  output += `Characters: ${room.characters.length}  Contents: ${room.contents.length}\r\n`;
  output += `Light: ${room.light}  Tunnel: ${room.tunnel}\r\n`;
  output += `Teleport: ${room.teleportVnum} delay ${room.teleportDelay}\r\n`;

  const exits: string[] = [];
  for (const [dir, exit] of room.exits) {
    exits.push(`${dir}→${exit.toRoom}`);
  }
  output += `Exits: ${exits.length > 0 ? exits.join(', ') : 'none'}\r\n`;

  ch.sendToChar(output);
}

/**
 * doAdvance – Set a player's level.
 * Syntax: advance <name> <level>
 */
export function doAdvance(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  const parts = arg.trim().split(/\s+/);
  const name = parts[0];
  const levelStr = parts[1];

  if (!name || !levelStr) {
    ch.sendToChar('Syntax: advance <name> <level>\r\n');
    return;
  }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t playing.\r\n'); return; }

  const level = parseInt(levelStr, 10);
  if (isNaN(level) || level < 1 || level > LEVEL_IMPLEMENTOR) {
    ch.sendToChar('Level must be 1-65.\r\n');
    return;
  }

  if (level > ch.getTrust()) {
    ch.sendToChar('You can\'t advance someone above your own trust.\r\n');
    return;
  }

  const oldLevel = target.level;
  target.level = level;

  if (level > oldLevel) {
    target.sendToChar(`You have been advanced to level ${level}!\r\n`);
  } else {
    target.sendToChar(`You have been demoted to level ${level}.\r\n`);
  }

  ch.sendToChar(`${target.name} is now level ${level}.\r\n`);
  logger?.info('admin', `${ch.name} advanced ${target.name} to level ${level}`);
}

/**
 * doTrust – Set a player's trust level.
 */
export function doTrust(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  const parts = arg.trim().split(/\s+/);
  const name = parts[0];
  const trustStr = parts[1];

  if (!name || !trustStr) {
    ch.sendToChar('Syntax: trust <name> <level>\r\n');
    return;
  }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t playing.\r\n'); return; }

  const trust = parseInt(trustStr, 10);
  if (isNaN(trust) || trust < 0 || trust > ch.getTrust()) {
    ch.sendToChar(`Trust must be 0-${ch.getTrust()}.\r\n`);
    return;
  }

  target.trust = trust;
  ch.sendToChar(`${target.name}'s trust is now ${trust}.\r\n`);
  target.sendToChar(`Your trust has been set to ${trust}.\r\n`);
  logger?.info('admin', `${ch.name} set ${target.name}'s trust to ${trust}`);
}

/**
 * doRestore – Restore a player to full HP/mana/move.
 */
export function doRestore(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }

  const name = arg.trim();

  if (!name || name.toLowerCase() === 'all') {
    // Restore all players online
    if (name.toLowerCase() === 'all' && connectionManager) {
      for (const desc of connectionManager.getAllDescriptors()) {
        const player = desc.character as Player | null;
        if (player && player instanceof Player) {
          player.hit = player.maxHit;
          player.mana = player.maxMana;
          player.move = player.maxMove;
          player.sendToChar('You have been restored!\r\n');
        }
      }
      ch.sendToChar('Ok.\r\n');
      return;
    }
    // Restore self if no arg
    ch.hit = ch.maxHit;
    ch.mana = ch.maxMana;
    ch.move = ch.maxMove;
    ch.sendToChar('You have been restored!\r\n');
    return;
  }

  const target = findPlayerByName(name);
  if (!target) { ch.sendToChar('They aren\'t playing.\r\n'); return; }

  target.hit = target.maxHit;
  target.mana = target.maxMana;
  target.move = target.maxMove;
  target.sendToChar('You have been restored!\r\n');
  ch.sendToChar('Ok.\r\n');
}

/**
 * doHeal – Alias for restore (for legacy compatibility).
 */
// TODO PARITY: doHeal — implement heal command (currently stub)
export function doHeal(ch: Character, arg: string): void {
  doRestore(ch, arg);
}

/**
 * doPeace – Stop all combat in the room.
 */
export function doPeace(ch: Character, _arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }
  const room = ch.inRoom as Room | null;
  if (!room) return;

  for (const victim of room.characters) {
    if (victim.fighting) {
      victim.fighting = null;
      victim.numFighting = 0;
      if (victim.position >= Position.Fighting) {
        victim.position = Position.Standing;
      }
    }
  }

  ch.sendToChar('Peace has been restored.\r\n');
  for (const occ of room.characters) {
    if (occ !== ch) {
      occ.sendToChar(`${ch.name} stops all fighting.\r\n`);
    }
  }
}

/**
 * doEcho – Send a message to all players in room.
 */
export function doEcho(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }
  if (!arg.trim()) { ch.sendToChar('Echo what?\r\n'); return; }

  const room = ch.inRoom as Room | null;
  if (!room) return;

  for (const victim of room.characters) {
    victim.sendToChar(`${arg}\r\n`);
  }
}

/**
 * doGecho – Send a message to all players globally.
 */
export function doGecho(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_GREATER) { ch.sendToChar('Huh?\r\n'); return; }
  if (!arg.trim()) { ch.sendToChar('Global echo what?\r\n'); return; }

  if (!connectionManager) return;

  for (const desc of connectionManager.getAllDescriptors()) {
    const player = desc.character as Player | null;
    if (player && player instanceof Player) {
      player.sendToChar(`${arg}\r\n`);
    }
  }
}

// =============================================================================
// Ban System (Trust 55+)
// =============================================================================

/**
 * doBan – Ban a site/IP.
 * Syntax: ban add <site> [permanent|timed] [hours]
 *         ban list
 *         ban remove <id>
 */
export function doBan(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_TRUEIMM) { ch.sendToChar('Huh?\r\n'); return; }
  if (!banSystem) { ch.sendToChar('Ban system not available.\r\n'); return; }

  const args = arg.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'add': {
      const site = args[1];
      const type = args[2]?.toLowerCase() || 'permanent';
      const duration = parseInt(args[3] ?? '0', 10) || 0;

      if (!site) {
        ch.sendToChar('Syntax: ban add <site> [permanent|timed] [hours]\r\n');
        return;
      }

      const isPermanent = type !== 'timed';
      const unbanDate = isPermanent ? null : new Date(Date.now() + duration * 3600000);

      banSystem.addBan({
        id: `ban_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: site,
        user: '',
        note: `Banned by ${ch.name}`,
        bannedBy: ch.name,
        bannedAt: new Date(),
        flagType: 'all',
        level: 0,
        unbanDate,
        duration: isPermanent ? -1 : duration * 3600,
        prefix: false,
        suffix: false,
      });

      ch.sendToChar(`Site ${site} has been banned${isPermanent ? ' permanently' : ` for ${duration} hours`}.\r\n`);
      logger?.info('admin', `${ch.name} banned site ${site}`);
      break;
    }
    case 'list': {
      const bans = banSystem.getAllBans();
      if (bans.length === 0) {
        ch.sendToChar('No sites are banned.\r\n');
        return;
      }

      let output = 'Banned Sites:\r\n';
      output += '-'.repeat(60) + '\r\n';

      for (const ban of bans) {
        const expiry = ban.duration === -1 ? 'permanent' : `expires ${ban.unbanDate?.toISOString() ?? 'unknown'}`;
        output += `${ban.name.padEnd(30)} ${expiry} (by ${ban.bannedBy})\r\n`;
      }

      ch.sendToChar(output);
      break;
    }
    case 'remove': {
      const id = args[1];
      if (!id) { ch.sendToChar('Syntax: ban remove <id>\r\n'); return; }

      if (banSystem.removeBan(id)) {
        ch.sendToChar(`Ban ${id} has been lifted.\r\n`);
        logger?.info('admin', `${ch.name} removed ban ${id}`);
      } else {
        ch.sendToChar('No ban with that ID found.\r\n');
      }
      break;
    }
    default:
      ch.sendToChar('Syntax: ban <add|list|remove> ...\r\n');
  }
}

/**
 * doAllow – Remove a ban by site name.
 */
export function doAllow(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_TRUEIMM) { ch.sendToChar('Huh?\r\n'); return; }
  if (!banSystem) { ch.sendToChar('Ban system not available.\r\n'); return; }

  const site = arg.trim();
  if (!site) { ch.sendToChar('Allow which site?\r\n'); return; }

  // Find ban by site name and remove it
  const bans = banSystem.getAllBans();
  const ban = bans.find(b => b.name.toLowerCase() === site.toLowerCase());

  if (ban && banSystem.removeBan(ban.id)) {
    ch.sendToChar(`Ban on ${site} has been lifted.\r\n`);
    logger?.info('admin', `${ch.name} removed ban on ${site}`);
  } else {
    ch.sendToChar('That site is not banned.\r\n');
  }
}

// =============================================================================
// Information (Trust 51+)
// =============================================================================

/**
 * doUsers – List all connected descriptors.
 */
export function doUsers(ch: Character, _arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  if (!connectionManager) {
    ch.sendToChar('Connection manager not available.\r\n');
    return;
  }

  const connections = connectionManager.getAllDescriptors();

  let output = 'Connected Users:\r\n';
  output += '-'.repeat(70) + '\r\n';
  output += 'Name'.padEnd(20) + 'State'.padEnd(15) + 'Host'.padEnd(25) + 'Idle\r\n';
  output += '-'.repeat(70) + '\r\n';

  for (const conn of connections) {
    const name = (conn.character as Player | null)?.name || '(connecting)';
    const state = String(conn.state);
    const host = conn.host.substring(0, 24);
    const idle = conn.idle;
    const idleStr = idle > 60 ? `${Math.floor(idle / 60)}m` : `${idle}s`;

    output += `${name.padEnd(20)}${state.padEnd(15)}${host.padEnd(25)}${idleStr}\r\n`;
  }

  output += `\r\n${connections.length} users connected.\r\n`;
  ch.sendToChar(output);
}

/**
 * doMemory – Show memory usage and entity counts.
 */
export function doMemory(ch: Character, _arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  const mem = process.memoryUsage();
  const areas = areaManager?.getAllAreas() ?? [];
  const rooms = vnumRegistry?.getRoomCount() ?? 0;
  const mobs = vnumRegistry?.getMobileCount() ?? 0;
  const objs = vnumRegistry?.getObjectCount() ?? 0;
  const players = connectionManager?.getAllDescriptors().length ?? 0;

  let output = 'Memory Usage:\r\n';
  output += `  Heap Used:  ${Math.round(mem.heapUsed / 1024 / 1024)} MB\r\n`;
  output += `  Heap Total: ${Math.round(mem.heapTotal / 1024 / 1024)} MB\r\n`;
  output += `  RSS:        ${Math.round(mem.rss / 1024 / 1024)} MB\r\n`;
  output += '\r\nEntity Counts:\r\n';
  output += `  Areas:   ${areas.length}\r\n`;
  output += `  Rooms:   ${rooms}\r\n`;
  output += `  Mobiles: ${mobs}\r\n`;
  output += `  Objects: ${objs}\r\n`;
  output += `  Players: ${players} online\r\n`;

  ch.sendToChar(output);
}

/**
 * doWizhelp – List all immortal commands at player's trust level.
 */
export function doWizhelp(ch: Character, _arg: string): void {
  if (ch.getTrust() < LEVEL_IMMORTAL) { ch.sendToChar('Huh?\r\n'); return; }

  // We don't have direct access to the registry here, so just list known immortal commands
  const immCmds: Array<{ name: string; trust: number }> = [
    { name: 'authorize', trust: 51 }, { name: 'freeze', trust: 51 },
    { name: 'silence', trust: 51 }, { name: 'noshout', trust: 51 },
    { name: 'notell', trust: 51 }, { name: 'log', trust: 51 },
    { name: 'users', trust: 51 }, { name: 'memory', trust: 51 },
    { name: 'wizhelp', trust: 51 },
    { name: 'goto', trust: 52 }, { name: 'transfer', trust: 52 },
    { name: 'at', trust: 52 }, { name: 'bamfin', trust: 52 },
    { name: 'bamfout', trust: 52 },
    { name: 'purge', trust: 53 }, { name: 'mload', trust: 53 },
    { name: 'oload', trust: 53 }, { name: 'slay', trust: 53 },
    { name: 'force', trust: 53 }, { name: 'snoop', trust: 53 },
    { name: 'switch', trust: 53 }, { name: 'return', trust: 53 },
    { name: 'ban', trust: 55 }, { name: 'allow', trust: 55 },
    { name: 'reboot', trust: 58 }, { name: 'shutdown', trust: 58 },
    { name: 'copyover', trust: 58 }, { name: 'set', trust: 58 },
    { name: 'stat', trust: 58 }, { name: 'advance', trust: 58 },
    { name: 'trust', trust: 58 }, { name: 'restore', trust: 58 },
    { name: 'heal', trust: 58 }, { name: 'peace', trust: 58 },
    { name: 'echo', trust: 58 }, { name: 'gecho', trust: 58 },
  ];

  const available = immCmds.filter(c => ch.getTrust() >= c.trust);

  let output = 'Immortal Commands Available:\r\n';
  output += '-'.repeat(60) + '\r\n';

  // Group by trust level
  const byTrust = new Map<number, string[]>();
  for (const cmd of available) {
    if (!byTrust.has(cmd.trust)) {
      byTrust.set(cmd.trust, []);
    }
    byTrust.get(cmd.trust)!.push(cmd.name);
  }

  for (const [trust, cmds] of [...byTrust.entries()].sort((a, b) => a[0] - b[0])) {
    output += `\r\nTrust ${trust}:\r\n`;
    output += `  ${cmds.sort().join(', ')}\r\n`;
  }

  ch.sendToChar(output);
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all immortal commands with the CommandRegistry.
 */
// TODO PARITY: Missing immortal commands — invis, ghost, dnd, holylight, wizlock, restrict, deny, disconnect, forceclose, pcrename, delete_char, mortalize, immortalize, reset, loadup, savearea, installarea, mredit, oredit, wstat, bestow, cset, mset, oset, rset, sset, hset, aassign, massign, rassign, vassign, regoto, retransfer, rat, minvoke, oinvoke, statshield, scatter, strew, watch, mwhere, ofind, mfind, gfighting, oclaim, bodybag, makeadminlist, adminlist, immhost, setvault, last, wizlist, retiredlist, ipcompare, check_vnums, vnums, vsearch, vstat, rstat, mstat, ostat, loop, low_purge, balzhur, elevate, nohomepage, nodesc, nohttp, nobio, nobeckon, delay, hell, unhell
export function registerImmortalCommands(registry: CommandRegistry): void {
  const immortalCommands: Omit<CommandDef, 'useCount' | 'lagCount' | 'flags'>[] = [
    // Trust 51+ – Character Management & Information
    { name: 'authorize', handler: doAuthorize, minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Always },
    { name: 'freeze',    handler: doFreeze,    minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Always },
    { name: 'silence',   handler: doSilence,   minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Always },
    { name: 'noshout',   handler: doNoshout,   minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Always },
    { name: 'notell',    handler: doNotell,    minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Always },
    { name: 'log',       handler: doLog,       minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Always },
    { name: 'users',     handler: doUsers,     minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Normal },
    { name: 'memory',    handler: doMemory,    minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Normal },
    { name: 'wizhelp',   handler: doWizhelp,   minPosition: Position.Dead, minTrust: LEVEL_IMMORTAL, logLevel: CommandLogLevel.Normal },

    // Trust 52+ – Teleportation
    { name: 'goto',      handler: doGoto,      minPosition: Position.Dead, minTrust: LEVEL_SAVIOR,   logLevel: CommandLogLevel.Normal },
    { name: 'transfer',  handler: doTransfer,  minPosition: Position.Dead, minTrust: LEVEL_SAVIOR,   logLevel: CommandLogLevel.Always },
    { name: 'at',        handler: doAt,        minPosition: Position.Dead, minTrust: LEVEL_SAVIOR,   logLevel: CommandLogLevel.Normal },
    { name: 'bamfin',    handler: doBamfin,    minPosition: Position.Dead, minTrust: LEVEL_SAVIOR,   logLevel: CommandLogLevel.Normal },
    { name: 'bamfout',   handler: doBamfout,   minPosition: Position.Dead, minTrust: LEVEL_SAVIOR,   logLevel: CommandLogLevel.Normal },

    // Trust 53+ – World Manipulation
    { name: 'purge',     handler: doPurge,     minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Always },
    { name: 'mload',     handler: doMload,     minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Always },
    { name: 'oload',     handler: doOload,     minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Always },
    { name: 'slay',      handler: doSlay,      minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Always },
    { name: 'force',     handler: doForce,     minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Always },
    { name: 'snoop',     handler: doSnoop,     minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Always },
    { name: 'switch',    handler: doSwitch,    minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Always },
    { name: 'return',    handler: doReturn,    minPosition: Position.Dead, minTrust: LEVEL_CREATOR,  logLevel: CommandLogLevel.Normal },

    // Trust 55+ – Ban System
    { name: 'ban',       handler: doBan,       minPosition: Position.Dead, minTrust: LEVEL_TRUEIMM,  logLevel: CommandLogLevel.Always },
    { name: 'allow',     handler: doAllow,     minPosition: Position.Dead, minTrust: LEVEL_TRUEIMM,  logLevel: CommandLogLevel.Always },

    // Trust 58+ – System Administration
    { name: 'reboot',    handler: doReboot,    minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
    { name: 'shutdown',  handler: doShutdown,  minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
    { name: 'copyover',  handler: doCopyover,  minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
    { name: 'set',       handler: doSet,       minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
    { name: 'stat',      handler: doStat,      minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Normal },
    { name: 'advance',   handler: doAdvance,   minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
    { name: 'trust',     handler: doTrust,     minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
    { name: 'restore',   handler: doRestore,   minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Normal },
    { name: 'heal',      handler: doHeal,      minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Normal },
    { name: 'peace',     handler: doPeace,     minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Normal },
    { name: 'echo',      handler: doEcho,      minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
    { name: 'gecho',     handler: doGecho,     minPosition: Position.Dead, minTrust: LEVEL_GREATER,  logLevel: CommandLogLevel.Always },
  ];

  for (const cmd of immortalCommands) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
