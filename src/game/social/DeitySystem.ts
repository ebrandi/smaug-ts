/**
 * DeitySystem – Deity and favour system.
 *
 * Replicates legacy deity.c: deity worship, supplicate commands,
 * and favour modification hooks.
 */

import type { Character } from '../entities/Character.js';
import type { Player } from '../entities/Player.js';
import { CharClass, Race } from '../entities/types.js';
import { oneArgument } from '../../utils/StringUtils.js';

// =============================================================================
// Interfaces
// =============================================================================

/** Full deity data – mirrors legacy deity structure. */
export interface DeityData {
  name: string;
  filename: string;
  description: string;
  alignment: number;
  minAlign: number;
  maxAlign: number;
  worshippers: number;

  // Favour deltas on actions
  flee: number;
  kill: number;
  killMagic: number;
  sacrifice: number;
  buryCorpse: number;
  aidSpell: number;
  aid: number;
  backstab: number;
  steal: number;
  die: number;
  dieMagic: number;

  // Supplicate costs (favour consumed)
  spellAid: number;
  recallCost: number;
  avatarCost: number;

  recallRoom: number;
  avatarVnum: number;

  element: number;
  suscept: bigint;

  race: number;
  charClass: number;
  sex: number;
  objstat: number;
  npcRace: number;
  npcFoe: number;
}

// =============================================================================
// In-Memory Storage
// =============================================================================

const deityList: Map<string, DeityData> = new Map();

export function getDeity(name: string): DeityData | undefined {
  const lower = name.toLowerCase();
  for (const [key, deity] of deityList) {
    if (key.toLowerCase() === lower) return deity;
  }
  return undefined;
}

export function getAllDeities(): DeityData[] {
  return Array.from(deityList.values());
}

export function setDeity(deity: DeityData): void {
  deityList.set(deity.name, deity);
}

export function clearDeities(): void {
  deityList.clear();
}

// =============================================================================
// Persistence Delegates
// =============================================================================

export let loadDeities: () => Promise<void> = async () => {};
export function setLoadDeities(fn: () => Promise<void>): void {
  loadDeities = fn;
}

export let saveDeity: (deity: DeityData) => Promise<void> = async () => {};
export function setSaveDeity(fn: (deity: DeityData) => Promise<void>): void {
  saveDeity = fn;
}

// =============================================================================
// Room Mover Delegate (for supplicate recall)
// =============================================================================

let moveCharToRoom: (ch: Character, vnum: number) => boolean = () => false;

export function setMoveCharToRoom(fn: (ch: Character, vnum: number) => boolean): void {
  moveCharToRoom = fn;
}

// =============================================================================
// Constants
// =============================================================================

const FAVOUR_MIN = -2500;
const FAVOUR_MAX = 2500;

// =============================================================================
// Helpers
// =============================================================================

function getPlayerDeity(ch: Character): DeityData | undefined {
  const player = ch as Player;
  if (!player.pcData?.deityName) return undefined;
  return getDeity(player.pcData.deityName);
}

// =============================================================================
// Favour Modification
// =============================================================================

/**
 * modifyFavour – Adjust a player's favour with their deity.
 * Clamps to [-2500, 2500].
 */
export function modifyFavour(ch: Character, amount: number): void {
  if (ch.isNpc) return;
  const player = ch as Player;
  if (!player.pcData.deityName) return;

  player.pcData.favour = Math.max(
    FAVOUR_MIN,
    Math.min(FAVOUR_MAX, player.pcData.favour + amount),
  );
}

// =============================================================================
// Commands
// =============================================================================

/**
 * doWorship – Worship a deity or show current deity info.
 *
 * Syntax: worship [<deity name>]
 */
export function doWorship(ch: Character, argument: string): void {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot worship deities.\r\n');
    return;
  }

  const player = ch as Player;
  const arg = argument.trim();

  // No argument – show current deity
  if (!arg) {
    const deity = getPlayerDeity(ch);
    if (!deity) {
      ch.sendToChar('You do not worship any deity.\r\n');
      return;
    }
    let buf = `You worship ${deity.name}.\r\n`;
    buf += `Description: ${deity.description || '(none)'}\r\n`;
    buf += `Alignment: ${deity.alignment}\r\n`;
    buf += `Your favour: ${player.pcData.favour}\r\n`;
    ch.sendToChar(buf);
    return;
  }

  // Handle renounce
  if (arg.toLowerCase() === 'renounce') {
    if (!player.pcData.deityName) {
      ch.sendToChar('You do not worship any deity.\r\n');
      return;
    }
    const oldDeity = getPlayerDeity(ch);
    if (oldDeity) {
      oldDeity.worshippers = Math.max(0, oldDeity.worshippers - 1);
      saveDeity(oldDeity).catch(() => {});
    }
    player.pcData.deityName = null;
    player.pcData.favour = 0;
    ch.sendToChar('You renounce your deity.\r\n');
    return;
  }

  // Attempt to worship a new deity
  const deity = getDeity(arg);
  if (!deity) {
    ch.sendToChar('No such deity.\r\n');
    return;
  }

  // Must renounce current deity first
  if (player.pcData.deityName) {
    ch.sendToChar('You must renounce your current deity first.\r\n');
    return;
  }

  // Alignment check
  if (ch.alignment < deity.minAlign || ch.alignment > deity.maxAlign) {
    ch.sendToChar('Your alignment is not compatible with that deity.\r\n');
    return;
  }

  // Race check
  if (deity.race >= 0) {
    const chRace = typeof ch.race === 'number'
      ? ch.race
      : Race[ch.race as keyof typeof Race] ?? -1;
    if (chRace !== deity.race) {
      ch.sendToChar('Your race is not favoured by that deity.\r\n');
      return;
    }
  }

  // Class check
  if (deity.charClass >= 0) {
    const chClass = typeof ch.class_ === 'number'
      ? ch.class_
      : CharClass[ch.class_ as keyof typeof CharClass] ?? -1;
    if (chClass !== deity.charClass) {
      ch.sendToChar('Your class is not favoured by that deity.\r\n');
      return;
    }
  }

  player.pcData.deityName = deity.name;
  player.pcData.favour = 0;
  deity.worshippers++;

  ch.sendToChar(`You are now a worshipper of ${deity.name}.\r\n`);

  saveDeity(deity).catch(() => {});
}

/**
 * doSupplicate – Request aid from your deity.
 *
 * Syntax: supplicate <recall|heal|avatar>
 */
export function doSupplicate(ch: Character, argument: string): void {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot supplicate.\r\n');
    return;
  }

  const player = ch as Player;
  const deity = getPlayerDeity(ch);
  if (!deity) {
    ch.sendToChar('You do not worship a deity.\r\n');
    return;
  }

  const [subCmd] = oneArgument(argument);
  if (!subCmd) {
    ch.sendToChar('Supplicate for what? (recall, heal, avatar)\r\n');
    return;
  }

  const sub = subCmd.toLowerCase();

  switch (sub) {
    case 'recall':
      return doSupplicateRecall(ch, player, deity);
    case 'heal':
      return doSupplicateHeal(ch, player, deity);
    case 'avatar':
      return doSupplicateAvatar(ch, player, deity);
    default:
      ch.sendToChar('Supplicate for what? (recall, heal, avatar)\r\n');
      return;
  }
}

function doSupplicateRecall(ch: Character, player: Player, deity: DeityData): void {
  if (!deity.recallRoom) {
    ch.sendToChar('Your deity has no recall room.\r\n');
    return;
  }

  if (player.pcData.favour < deity.recallCost) {
    ch.sendToChar('You do not have enough favour.\r\n');
    return;
  }

  player.pcData.favour -= deity.recallCost;
  const success = moveCharToRoom(ch, deity.recallRoom);
  if (success) {
    ch.sendToChar('Your deity transports you to safety.\r\n');
  } else {
    player.pcData.favour += deity.recallCost;
    ch.sendToChar('Your deity cannot transport you there.\r\n');
  }
}

function doSupplicateHeal(ch: Character, player: Player, deity: DeityData): void {
  if (player.pcData.favour < deity.spellAid) {
    ch.sendToChar('You do not have enough favour.\r\n');
    return;
  }

  player.pcData.favour -= deity.spellAid;
  const healAmount = ch.level * 2;
  ch.hit = Math.min(ch.hit + healAmount, ch.maxHit);
  ch.sendToChar('Your deity heals your wounds.\r\n');
}

function doSupplicateAvatar(ch: Character, player: Player, deity: DeityData): void {
  if (!deity.avatarVnum) {
    ch.sendToChar('Your deity has no avatar.\r\n');
    return;
  }

  if (player.pcData.favour < deity.avatarCost) {
    ch.sendToChar('You do not have enough favour.\r\n');
    return;
  }

  player.pcData.favour -= deity.avatarCost;
  ch.sendToChar('Your deity sends an avatar to aid you.\r\n');
}

/**
 * createDefaultDeity – Create a deity with sensible defaults.
 */
export function createDefaultDeity(name: string): DeityData {
  return {
    name,
    filename: name.toLowerCase().replace(/\s+/g, '_'),
    description: '',
    alignment: 0,
    minAlign: -1000,
    maxAlign: 1000,
    worshippers: 0,
    flee: -2,
    kill: 4,
    killMagic: 3,
    sacrifice: 2,
    buryCorpse: 1,
    aidSpell: 3,
    aid: 2,
    backstab: -3,
    steal: -5,
    die: -10,
    dieMagic: -8,
    spellAid: 100,
    recallCost: 50,
    avatarCost: 500,
    recallRoom: 0,
    avatarVnum: 0,
    element: 0,
    suscept: 0n,
    race: -1,
    charClass: -1,
    sex: -1,
    objstat: 0,
    npcRace: -1,
    npcFoe: -1,
  };
}
