/**
 * communication.ts – Communication command handlers & Language system.
 *
 * Replicates legacy act_comm.c talk_channel() and language translation.
 *
 * Channels: chat/gossip, yell, shout, say, tell, whisper, gtell,
 *   clantalk, ordertalk, counciltalk, guildtalk, music, newbiechat,
 *   immtalk, racetalk, wartalk, emote
 *
 * Language system: 20 languages with scramble-based translation.
 *
 * @module communication
 */

import type { Character } from '../entities/Character.js';
import type { Player } from '../entities/Player.js';
import type { Room } from '../entities/Room.js';
import { Position, ROOM_FLAGS } from '../entities/types.js';
import { hasFlag, toggleFlag } from '../../utils/BitVector.js';
import { oneArgument } from '../../utils/StringUtils.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import type { CommandRegistry } from './CommandRegistry.js';
import { CommandLogLevel, defaultCommandFlags, type CommandDef } from './CommandRegistry.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// Channel Scope
// =============================================================================

export enum ChannelScope {
  Global  = 'global',
  Area    = 'area',
  Room    = 'room',
  Group   = 'group',
  Private = 'private',
}

// =============================================================================
// Channel Configuration
// =============================================================================

export interface ChannelConfig {
  name: string;
  color: string;           // SMAUG color code prefix
  scope: ChannelScope;
  minTrust: number;
  minLevel: number;
  deafBit: bigint;
  requiresPK?: boolean;
  requiresGroup?: 'clan' | 'order' | 'council' | 'guild' | 'race';
  maxLevel?: number;       // For newbie channel
}

// =============================================================================
// Deaf Bit Constants (ch.deaf bitvector)
// =============================================================================

export const CHANNEL_CHAT      = 1n << 0n;
export const CHANNEL_YELL      = 1n << 1n;
export const CHANNEL_SHOUT     = 1n << 2n;
export const CHANNEL_MUSIC     = 1n << 3n;
export const CHANNEL_NEWBIE    = 1n << 4n;
export const CHANNEL_IMMTALK   = 1n << 5n;
export const CHANNEL_WARTALK   = 1n << 6n;
export const CHANNEL_RACETALK  = 1n << 7n;
export const CHANNEL_CLANTALK  = 1n << 8n;
export const CHANNEL_GUILDTALK = 1n << 9n;
export const CHANNEL_ORDERTALK = 1n << 10n;
export const CHANNEL_COUNCILTALK = 1n << 11n;
export const CHANNEL_SAY       = 1n << 12n;
export const CHANNEL_WHISPER   = 1n << 13n;
export const CHANNEL_GTELL     = 1n << 14n;
export const CHANNEL_TELL      = 1n << 15n;

// =============================================================================
// Channel Definitions (17 channels)
// =============================================================================

export const CHANNEL_CONFIGS: Record<string, ChannelConfig> = {
  chat:        { name: 'chat',        color: '&Y', scope: ChannelScope.Global,  minTrust: 0,  minLevel: 0, deafBit: CHANNEL_CHAT },
  yell:        { name: 'yell',        color: '&R', scope: ChannelScope.Area,    minTrust: 0,  minLevel: 0, deafBit: CHANNEL_YELL },
  shout:       { name: 'shout',       color: '&Y', scope: ChannelScope.Global,  minTrust: 3,  minLevel: 0, deafBit: CHANNEL_SHOUT },
  say:         { name: 'say',         color: '&w', scope: ChannelScope.Room,    minTrust: 0,  minLevel: 0, deafBit: CHANNEL_SAY },
  tell:        { name: 'tell',        color: '&G', scope: ChannelScope.Private, minTrust: 0,  minLevel: 0, deafBit: CHANNEL_TELL },
  whisper:     { name: 'whisper',     color: '&w', scope: ChannelScope.Room,    minTrust: 0,  minLevel: 0, deafBit: CHANNEL_WHISPER },
  gtell:       { name: 'gtell',       color: '&C', scope: ChannelScope.Group,   minTrust: 0,  minLevel: 0, deafBit: CHANNEL_GTELL },
  clantalk:    { name: 'clantalk',    color: '&P', scope: ChannelScope.Group,   minTrust: 0,  minLevel: 0, deafBit: CHANNEL_CLANTALK, requiresGroup: 'clan' },
  ordertalk:   { name: 'ordertalk',   color: '&P', scope: ChannelScope.Group,   minTrust: 0,  minLevel: 0, deafBit: CHANNEL_ORDERTALK, requiresGroup: 'order' },
  counciltalk: { name: 'counciltalk', color: '&C', scope: ChannelScope.Group,   minTrust: 0,  minLevel: 0, deafBit: CHANNEL_COUNCILTALK, requiresGroup: 'council' },
  guildtalk:   { name: 'guildtalk',   color: '&G', scope: ChannelScope.Group,   minTrust: 0,  minLevel: 0, deafBit: CHANNEL_GUILDTALK, requiresGroup: 'guild' },
  music:       { name: 'music',       color: '&P', scope: ChannelScope.Global,  minTrust: 0,  minLevel: 0, deafBit: CHANNEL_MUSIC },
  newbiechat:  { name: 'newbiechat',  color: '&G', scope: ChannelScope.Global,  minTrust: 0,  minLevel: 0, deafBit: CHANNEL_NEWBIE, maxLevel: 10 },
  immtalk:     { name: 'immtalk',     color: '&C', scope: ChannelScope.Global,  minTrust: 51, minLevel: 0, deafBit: CHANNEL_IMMTALK },
  racetalk:    { name: 'racetalk',    color: '&B', scope: ChannelScope.Group,   minTrust: 0,  minLevel: 0, deafBit: CHANNEL_RACETALK, requiresGroup: 'race' },
  wartalk:     { name: 'wartalk',     color: '&R', scope: ChannelScope.Global,  minTrust: 0,  minLevel: 0, deafBit: CHANNEL_WARTALK, requiresPK: true },
};

// Mapping from deaf bit name to bit value for doDeaf listing
const DEAF_CHANNEL_MAP: Record<string, bigint> = {
  chat: CHANNEL_CHAT,
  yell: CHANNEL_YELL,
  shout: CHANNEL_SHOUT,
  music: CHANNEL_MUSIC,
  newbie: CHANNEL_NEWBIE,
  immtalk: CHANNEL_IMMTALK,
  wartalk: CHANNEL_WARTALK,
  racetalk: CHANNEL_RACETALK,
  clantalk: CHANNEL_CLANTALK,
  guildtalk: CHANNEL_GUILDTALK,
  ordertalk: CHANNEL_ORDERTALK,
  counciltalk: CHANNEL_COUNCILTALK,
  tell: CHANNEL_TELL,
  whisper: CHANNEL_WHISPER,
  gtell: CHANNEL_GTELL,
  say: CHANNEL_SAY,
};

// =============================================================================
// Language System
// =============================================================================

export enum Language {
  Common    = 0,
  Elvish    = 1,
  Dwarvish  = 2,
  Pixie     = 3,
  Ogre      = 4,
  Orcish    = 5,
  Trollish  = 6,
  Rodent    = 7,
  Insectoid = 8,
  Mammalian = 9,
  Reptile   = 10,
  Dragon    = 11,
  Spiritual = 12,
  Magical   = 13,
  Goblin    = 14,
  God       = 15,
  Ancient   = 16,
  Halfling  = 17,
  Clan      = 18,
  Unknown   = 19,
}

export const LANGUAGE_NAMES: Record<Language, string> = {
  [Language.Common]:    'common',
  [Language.Elvish]:    'elvish',
  [Language.Dwarvish]:  'dwarvish',
  [Language.Pixie]:     'pixie',
  [Language.Ogre]:      'ogre',
  [Language.Orcish]:    'orcish',
  [Language.Trollish]:  'trollish',
  [Language.Rodent]:    'rodent',
  [Language.Insectoid]: 'insectoid',
  [Language.Mammalian]: 'mammalian',
  [Language.Reptile]:   'reptile',
  [Language.Dragon]:    'dragon',
  [Language.Spiritual]: 'spiritual',
  [Language.Magical]:   'magical',
  [Language.Goblin]:    'goblin',
  [Language.God]:       'god',
  [Language.Ancient]:   'ancient',
  [Language.Halfling]:  'halfling',
  [Language.Clan]:      'clan',
  [Language.Unknown]:   'unknown',
};

/** Language-specific substitution tables for scrambling. */
export const languageSubstitutions: Partial<Record<Language, Record<string, string>>> = {
  [Language.Elvish]:    { a: 'e', e: 'i', o: 'a', t: 'l', s: 'th', r: 'n', n: 'r' },
  [Language.Dwarvish]:  { a: 'o', e: 'u', i: 'a', s: 'z', r: 'k', n: 'g', l: 'r' },
  [Language.Pixie]:     { a: 'i', e: 'a', o: 'u', s: 'z', t: 'p', r: 'l', n: 't' },
  [Language.Ogre]:      { a: 'u', e: 'o', i: 'a', s: 'g', t: 'k', r: 'g', l: 'r' },
  [Language.Orcish]:    { a: 'u', e: 'a', i: 'o', s: 'z', t: 'g', r: 'k', n: 'r' },
  [Language.Trollish]:  { a: 'o', e: 'u', i: 'a', s: 'k', t: 'g', r: 'n', l: 'g' },
  [Language.Rodent]:    { a: 'e', e: 'i', o: 'a', s: 'q', t: 'k', r: 'ch', n: 'k' },
  [Language.Insectoid]: { a: 'i', e: 'a', o: 'u', s: 'z', t: 'ck', r: 'z', n: 'x' },
  [Language.Mammalian]: { a: 'o', e: 'a', i: 'u', s: 'r', t: 'n', r: 'l', l: 'w' },
  [Language.Reptile]:   { a: 'ss', e: 'a', i: 'o', s: 'sh', t: 'ss', r: 'z', n: 'l' },
  [Language.Dragon]:    { a: 'au', e: 'ae', i: 'y', s: 'th', t: 'dh', r: 'rh', n: 'nn' },
  [Language.Spiritual]: { a: 'ah', e: 'eh', i: 'ih', s: 'sh', t: 'th', r: 'rh', n: 'nh' },
  [Language.Magical]:   { a: 'ix', e: 'ax', i: 'oz', s: 'zz', t: 'xx', r: 'qr', n: 'nz' },
  [Language.Goblin]:    { a: 'u', e: 'o', i: 'a', s: 'g', t: 'k', r: 'z', n: 'b' },
  [Language.God]:       { a: 'ou', e: 'ae', i: 'ai', s: 'zh', t: 'kh', r: 'rh', n: 'mn' },
  [Language.Ancient]:   { a: 'ae', e: 'ei', i: 'oi', s: 'ss', t: 'th', r: 'rr', n: 'nn' },
  [Language.Halfling]:  { a: 'o', e: 'a', i: 'e', s: 'z', t: 'd', r: 'l', n: 'm' },
  [Language.Clan]:      { a: 'x', e: 'y', i: 'z', s: 'q', t: 'w', r: 'v', n: 'k' },
  [Language.Unknown]:   { a: 'z', e: 'x', i: 'q', s: 'j', t: 'f', r: 'v', n: 'b' },
};

// =============================================================================
// Connection Manager Interface (for dependency injection)
// =============================================================================

/** Minimal interface for the connection manager needed by talkChannel. */
export interface ICommConnectionManager {
  getPlayingDescriptors(): { character: unknown | null }[];
}

// Module-level connection manager (set at registration time)
let _connectionMgr: ICommConnectionManager | null = null;

/** Set the connection manager for broadcasting. */
export function setCommConnectionManager(mgr: ICommConnectionManager): void {
  _connectionMgr = mgr;
}

// Module-level EventBus (set at registration time)
let _eventBus: EventBus | null = null;

/** Set the EventBus for speech events. */
export function setCommEventBus(bus: EventBus): void {
  _eventBus = bus;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if character `ch` is ignoring `target`.
 * Uses pcData.ignored Set on Player characters.
 */
export function isIgnoring(ch: Character, target: Character): boolean {
  const player = ch as unknown as Player;
  if (!player.pcData?.ignored) return false;
  return player.pcData.ignored.has(target.name.toLowerCase());
}

/**
 * Check if recipient can receive messages on the given channel.
 * Checks deaf bit and trust/level requirements.
 */
export function canSeeChannel(recipient: Character, config: ChannelConfig): boolean {
  // Trust check
  if (recipient.getTrust() < config.minTrust) return false;

  // Level check
  if (recipient.level < config.minLevel) return false;

  // Deaf check
  if (hasFlag(recipient.deaf, config.deafBit)) return false;

  // Max level check (newbie channel)
  if (config.maxLevel && recipient.level > config.maxLevel && !recipient.isImmortal) return false;

  return true;
}

/**
 * Format a channel message for display.
 */
export function formatChannelMessage(
  config: ChannelConfig,
  senderName: string,
  message: string,
  toSender: boolean,
): string {
  const name = toSender ? 'You' : senderName;
  return `${config.color}[${config.name}] ${name}: ${message}&D\r\n`;
}

/**
 * Check if a character is a PK-killer (deadly).
 * Checks pcData.flags for the DEADLY bit.
 */
function isPKiller(ch: Character): boolean {
  const player = ch as unknown as Player;
  if (!player.pcData) return false;
  // PCFLAG_DEADLY = 1n << 12n (from types.ts ACT.DEADLY pattern)
  return hasFlag(player.pcData.flags, 1n << 3n); // PCFLAG_DEADLY bit 3 in pcData.flags
}

/**
 * Check if a room has the SILENCE flag.
 */
function isRoomSilent(ch: Character): boolean {
  const room = ch.inRoom as Room | null;
  if (!room) return false;
  return room.hasFlag(ROOM_FLAGS.SILENCE);
}

/**
 * Check group membership for group channels.
 */
function checkGroupMembership(
  ch: Character,
  target: Character,
  groupType: string,
): boolean {
  const chPlayer = ch as unknown as Player;
  const tgtPlayer = target as unknown as Player;

  switch (groupType) {
    case 'clan':
      return !!(chPlayer.pcData?.clanName &&
        tgtPlayer.pcData?.clanName &&
        chPlayer.pcData.clanName === tgtPlayer.pcData.clanName);
    case 'order':
      return !!(chPlayer.pcData?.orderName &&
        tgtPlayer.pcData?.orderName &&
        chPlayer.pcData.orderName === tgtPlayer.pcData.orderName);
    case 'council':
      return !!(chPlayer.pcData?.councilName &&
        tgtPlayer.pcData?.councilName &&
        chPlayer.pcData.councilName === tgtPlayer.pcData.councilName);
    case 'guild':
      return ch.class_ === target.class_;
    case 'race':
      return ch.race === target.race;
    default:
      return false;
  }
}

// =============================================================================
// Language Translation
// =============================================================================

/**
 * Translate a message based on speaker's language and listener's comprehension.
 * Replicates legacy translate() — 85% comprehension threshold.
 */
export function translateMessage(
  speaker: Character,
  listener: Character,
  message: string,
): string {
  const lang = speaker.speaking as Language;

  // Common is always understood
  if (lang === Language.Common) return message;

  // God language always understood by immortals
  if (lang === Language.God && listener.isImmortal) return message;

  // Get listener's comprehension of the language
  const playerListener = listener as unknown as Player;
  const comprehension = playerListener.pcData?.learned?.get(lang) ?? 0;

  // If comprehension >= 85%, pass through unchanged
  if (comprehension >= 85) return message;

  // Otherwise scramble based on comprehension
  return scrambleMessage(message, lang, comprehension);
}

/**
 * Scramble a message based on language substitution tables.
 * The lower the comprehension, the more characters are scrambled.
 */
export function scrambleMessage(
  message: string,
  language: Language,
  comprehension: number,
): string {
  const subs = languageSubstitutions[language];
  if (!subs) {
    // No substitution table — generic scramble
    return genericScramble(message, comprehension);
  }

  const scrambleChance = (100 - comprehension) / 100;
  let result = '';

  for (const ch of message) {
    // Preserve spaces and punctuation
    if (ch === ' ' || /[.,!?;:'"()\-]/.test(ch)) {
      result += ch;
      continue;
    }

    // Determine if this character gets scrambled
    if (Math.random() < scrambleChance) {
      const lower = ch.toLowerCase();
      const sub = subs[lower];
      if (sub) {
        // Preserve case of first character
        result += ch === ch.toUpperCase() ? sub.charAt(0).toUpperCase() + sub.slice(1) : sub;
      } else {
        result += ch;
      }
    } else {
      result += ch;
    }
  }

  return result;
}

/**
 * Generic scramble when no substitution table exists.
 */
function genericScramble(message: string, comprehension: number): string {
  const scrambleChance = (100 - comprehension) / 100;
  const vowels = 'aeiou';
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  let result = '';

  for (const ch of message) {
    if (ch === ' ' || /[.,!?;:'"()\-]/.test(ch)) {
      result += ch;
      continue;
    }

    if (Math.random() < scrambleChance) {
      const lower = ch.toLowerCase();
      const isVowel = vowels.includes(lower);
      const pool = isVowel ? vowels : consonants;
      const replacement = pool.charAt(Math.floor(Math.random() * pool.length));
      result += ch === ch.toUpperCase() ? replacement.toUpperCase() : replacement;
    } else {
      result += ch;
    }
  }

  return result;
}

// =============================================================================
// Core Broadcast Function
// =============================================================================

/**
 * Send a message on a channel.
 * Replicates legacy talk_channel() in act_comm.c.
 *
 * Checks: trust, level, deaf, group, PK, scope, ROOM_SILENCE, ignore.
 */
export function talkChannel(
  ch: Character,
  message: string,
  channelName: string,
  connectionMgr?: ICommConnectionManager,
): void {
  const mgr = connectionMgr ?? _connectionMgr;
  const config = CHANNEL_CONFIGS[channelName];
  if (!config) {
    logger.warn('communication', `Unknown channel: ${channelName}`);
    return;
  }

  // 1. Trust check
  if (ch.getTrust() < config.minTrust) {
    ch.sendToChar("You can't use that channel.\r\n");
    return;
  }

  // 2. Level check
  if (ch.level < config.minLevel) {
    ch.sendToChar(`You must be level ${config.minLevel} to use that channel.\r\n`);
    return;
  }

  // 3. Deaf check (sender has channel muted)
  if (hasFlag(ch.deaf, config.deafBit)) {
    ch.sendToChar('You have that channel turned off.\r\n');
    return;
  }

  // 4. Group check
  if (config.requiresGroup) {
    const player = ch as unknown as Player;
    switch (config.requiresGroup) {
      case 'clan':
        if (!player.pcData?.clanName) {
          ch.sendToChar("You aren't in a clan.\r\n");
          return;
        }
        break;
      case 'order':
        if (!player.pcData?.orderName) {
          ch.sendToChar("You aren't in an order.\r\n");
          return;
        }
        break;
      case 'council':
        if (!player.pcData?.councilName) {
          ch.sendToChar("You aren't in a council.\r\n");
          return;
        }
        break;
      case 'guild':
        // Guild = class, no membership check needed
        break;
      case 'race':
        // Race is always set, no check needed
        break;
    }
  }

  // 5. PK check
  if (config.requiresPK && !isPKiller(ch)) {
    ch.sendToChar("You must be a pkiller to use this channel.\r\n");
    return;
  }

  // 6. ROOM_SILENCE check on sender
  if (isRoomSilent(ch)) {
    ch.sendToChar("The room is too quiet for that.\r\n");
    return;
  }

  // Send echo to sender
  ch.sendToChar(formatChannelMessage(config, ch.name, message, true));

  // Broadcast to qualifying recipients
  if (!mgr) return;

  const chRoom = ch.inRoom as Room | null;

  for (const desc of mgr.getPlayingDescriptors()) {
    const victim = desc.character as Character | null;
    if (!victim || victim === ch) continue;

    // Skip NPCs
    if (victim.isNpc) continue;

    // Deaf check on recipient
    if (hasFlag(victim.deaf, config.deafBit)) continue;

    // Can see channel (trust/level)
    if (!canSeeChannel(victim, config)) continue;

    // Ignore check
    if (isIgnoring(victim, ch)) continue;

    // ROOM_SILENCE on recipient's room
    if (isRoomSilent(victim)) continue;

    // Scope check
    const victimRoom = victim.inRoom as Room | null;
    switch (config.scope) {
      case ChannelScope.Global:
        // All pass
        break;
      case ChannelScope.Area:
        if (!chRoom || !victimRoom || chRoom.area !== victimRoom.area) continue;
        break;
      case ChannelScope.Room:
        if (!chRoom || !victimRoom || chRoom !== victimRoom) continue;
        break;
      case ChannelScope.Group:
        if (config.requiresGroup) {
          if (!checkGroupMembership(ch, victim, config.requiresGroup)) continue;
        }
        break;
      case ChannelScope.Private:
        // Private handled separately (doTell)
        continue;
    }

    // Apply language translation per recipient
    const translated = translateMessage(ch, victim, message);
    victim.sendToChar(formatChannelMessage(config, ch.name, translated, false));
  }
}

// =============================================================================
// Channel Commands
// =============================================================================

/** Chat / Gossip - global channel. */
// TODO PARITY: doChat — thin wrapper; verify channel-specific position/flag checks match legacy
export function doChat(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_CHAT);
    const isOn = !hasFlag(ch.deaf, CHANNEL_CHAT);
    ch.sendToChar(`Chat channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'chat');
}

/** Alias for doChat. */
export function doGossip(ch: Character, argument: string): void {
  doChat(ch, argument);
}

/** Yell - area-scope broadcast. */
// TODO PARITY: doYell — thin wrapper; verify channel-specific position/flag checks match legacy
export function doYell(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar('Yell what?\r\n');
    return;
  }
  talkChannel(ch, arg, 'yell');
}

/** Shout - global broadcast, costs 10 move points. */
export function doShout(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_SHOUT);
    const isOn = !hasFlag(ch.deaf, CHANNEL_SHOUT);
    ch.sendToChar(`Shout channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }

  if (ch.move < 10) {
    ch.sendToChar("You're too tired to shout.\r\n");
    return;
  }
  ch.move -= 10;

  talkChannel(ch, arg, 'shout');
}

/** Say - room-only communication. Emits Speech event for SPEECH_PROG. */
export function doSay(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar('Say what?\r\n');
    return;
  }

  // Room silence check
  if (isRoomSilent(ch)) {
    ch.sendToChar("The room is too quiet for that.\r\n");
    return;
  }

  // Send to sender
  ch.sendToChar(`&wYou say '${arg}'&D\r\n`);

  // Send to others in room
  const room = ch.inRoom as Room | null;
  if (room) {
    for (const victim of room.characters) {
      if (victim === ch) continue;
      const translated = translateMessage(ch, victim, arg);
      victim.sendToChar(`&w${ch.name} says '${translated}'&D\r\n`);
    }

    // Fire SPEECH_PROG trigger event
    if (_eventBus) {
      _eventBus.emitEvent(GameEvent.SayMessage, {
        speaker: ch,
        message: arg,
        room,
      });
    }
  }
}

/** Tell - private message to a specific player. */
export function doTell(ch: Character, argument: string): void {
  let arg = argument.trim();
  if (!arg) {
    ch.sendToChar('Tell whom what?\r\n');
    return;
  }

  const [targetName, message] = oneArgument(arg);
  if (!message.trim()) {
    ch.sendToChar('Tell them what?\r\n');
    return;
  }

  // Find target
  const mgr = _connectionMgr;
  if (!mgr) {
    ch.sendToChar("No one by that name is playing.\r\n");
    return;
  }

  let target: Character | null = null;
  for (const desc of mgr.getPlayingDescriptors()) {
    const victim = desc.character as Character | null;
    if (victim && !victim.isNpc && victim.name.toLowerCase() === targetName.toLowerCase()) {
      target = victim;
      break;
    }
  }

  if (!target) {
    ch.sendToChar("No one by that name is playing.\r\n");
    return;
  }

  if (target === ch) {
    ch.sendToChar("Talking to yourself again?\r\n");
    return;
  }

  // Check target not ignoring sender
  if (isIgnoring(target, ch)) {
    ch.sendToChar("That player is ignoring you.\r\n");
    return;
  }

  // ROOM_SILENCE check
  if (isRoomSilent(ch)) {
    ch.sendToChar("The room is too quiet for that.\r\n");
    return;
  }

  const msg = message.trim();

  // Apply language translation
  const translated = translateMessage(ch, target, msg);

  // Send messages
  ch.sendToChar(`&GYou tell ${target.name} '${msg}'&D\r\n`);
  target.sendToChar(`&G${ch.name} tells you '${translated}'&D\r\n`);

  // Store in tell history (keep last 20)
  const targetPlayer = target as unknown as Player;
  if (targetPlayer.pcData?.tellHistory) {
    targetPlayer.pcData.tellHistory.set(ch.name, msg);
    // Trim to 20 entries
    if (targetPlayer.pcData.tellHistory.size > 20) {
      const firstKey = targetPlayer.pcData.tellHistory.keys().next().value;
      if (firstKey !== undefined) {
        targetPlayer.pcData.tellHistory.delete(firstKey);
      }
    }
  }

  // Set reply target
  target.reply = ch;
}

/** Reply - reply to last tell. */
export function doReply(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar('Reply what?\r\n');
    return;
  }

  if (!ch.reply) {
    ch.sendToChar("No one has sent you a tell recently.\r\n");
    return;
  }

  // Find the reply target (they must still be online)
  const mgr = _connectionMgr;
  if (!mgr) {
    ch.sendToChar("They are no longer playing.\r\n");
    return;
  }

  let target: Character | null = null;
  for (const desc of mgr.getPlayingDescriptors()) {
    const victim = desc.character as Character | null;
    if (victim === ch.reply) {
      target = victim;
      break;
    }
  }

  if (!target) {
    ch.sendToChar("They are no longer playing.\r\n");
    return;
  }

  // Check ignore
  if (isIgnoring(target, ch)) {
    ch.sendToChar("That player is ignoring you.\r\n");
    return;
  }

  const translated = translateMessage(ch, target, arg);

  ch.sendToChar(`&GYou tell ${target.name} '${arg}'&D\r\n`);
  target.sendToChar(`&G${ch.name} tells you '${translated}'&D\r\n`);

  // Update reply
  target.reply = ch;
}

/** Whisper - room-only, to specific person. */
export function doWhisper(ch: Character, argument: string): void {
  let arg = argument.trim();
  if (!arg) {
    ch.sendToChar('Whisper to whom what?\r\n');
    return;
  }

  const [targetName, message] = oneArgument(arg);
  if (!message.trim()) {
    ch.sendToChar('Whisper what?\r\n');
    return;
  }

  // Find target in room
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar("You're not in a room.\r\n");
    return;
  }

  let target: Character | null = null;
  for (const victim of room.characters) {
    if (victim !== ch && victim.name.toLowerCase() === targetName.toLowerCase()) {
      target = victim;
      break;
    }
  }

  if (!target) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  if (isRoomSilent(ch)) {
    ch.sendToChar("The room is too quiet for that.\r\n");
    return;
  }

  const msg = message.trim();
  const translated = translateMessage(ch, target, msg);

  ch.sendToChar(`&wYou whisper to ${target.name} '${msg}'&D\r\n`);
  target.sendToChar(`&w${ch.name} whispers to you '${translated}'&D\r\n`);

  // Others in room see generic message
  for (const victim of room.characters) {
    if (victim === ch || victim === target) continue;
    victim.sendToChar(`&w${ch.name} whispers something to ${target.name}.&D\r\n`);
  }
}

/** Gtell - group/party tell. */
export function doGtell(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar('Tell your group what?\r\n');
    return;
  }

  // Check if in a group
  if (!ch.leader && ch.followers.length === 0) {
    ch.sendToChar("You aren't in a group.\r\n");
    return;
  }

  // Send to sender
  ch.sendToChar(`&CYou tell the group '${arg}'&D\r\n`);

  // Gather group members
  const members: Character[] = [];
  const groupLeader = ch.leader ?? ch;

  // Add leader if not sender
  if (groupLeader !== ch) members.push(groupLeader);

  // Add all followers of the leader
  for (const follower of groupLeader.followers) {
    if (follower !== ch) members.push(follower);
  }

  // Also add ch's own followers if ch is not the leader
  if (ch !== groupLeader) {
    for (const follower of ch.followers) {
      if (follower !== ch && !members.includes(follower)) {
        members.push(follower);
      }
    }
  }

  for (const member of members) {
    const translated = translateMessage(ch, member, arg);
    member.sendToChar(`&C${ch.name} tells the group '${translated}'&D\r\n`);
  }
}

/** ClanTalk - clan members only. */
// TODO PARITY: doClanTalk — thin wrapper; verify channel-specific position/flag checks match legacy
export function doClanTalk(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_CLANTALK);
    const isOn = !hasFlag(ch.deaf, CHANNEL_CLANTALK);
    ch.sendToChar(`Clan channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'clantalk');
}

/** OrderTalk - order members only. */
// TODO PARITY: doOrderTalk — thin wrapper; verify channel-specific position/flag checks match legacy
export function doOrderTalk(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_ORDERTALK);
    const isOn = !hasFlag(ch.deaf, CHANNEL_ORDERTALK);
    ch.sendToChar(`Order channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'ordertalk');
}

/** CouncilTalk - council members only. */
// TODO PARITY: doCouncilTalk — thin wrapper; verify channel-specific position/flag checks match legacy
export function doCouncilTalk(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_COUNCILTALK);
    const isOn = !hasFlag(ch.deaf, CHANNEL_COUNCILTALK);
    ch.sendToChar(`Council channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'counciltalk');
}

/** GuildTalk - same class members. */
// TODO PARITY: doGuildTalk — thin wrapper; verify channel-specific position/flag checks match legacy
export function doGuildTalk(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_GUILDTALK);
    const isOn = !hasFlag(ch.deaf, CHANNEL_GUILDTALK);
    ch.sendToChar(`Guild channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'guildtalk');
}

/** Music - global music channel. */
// TODO PARITY: doMusic — thin wrapper; verify channel-specific position/flag checks match legacy
export function doMusic(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_MUSIC);
    const isOn = !hasFlag(ch.deaf, CHANNEL_MUSIC);
    ch.sendToChar(`Music channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'music');
}

/** NewbieChat - for level ≤ 10 or immortals. */
// TODO PARITY: doNewbieChat — thin wrapper; verify channel-specific position/flag checks match legacy
export function doNewbieChat(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_NEWBIE);
    const isOn = !hasFlag(ch.deaf, CHANNEL_NEWBIE);
    ch.sendToChar(`Newbie channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'newbiechat');
}

/** Immtalk - immortal-only channel. */
export function doImmtalk(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_IMMTALK);
    const isOn = !hasFlag(ch.deaf, CHANNEL_IMMTALK);
    ch.sendToChar(`Immortal channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'immtalk');
}

/** RaceTalk - same race members. */
export function doRaceTalk(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_RACETALK);
    const isOn = !hasFlag(ch.deaf, CHANNEL_RACETALK);
    ch.sendToChar(`Race channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'racetalk');
}

/** Wartalk - PK-only channel. */
// TODO PARITY: doWartalk — thin wrapper; verify channel-specific position/flag checks match legacy
export function doWartalk(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.deaf = toggleFlag(ch.deaf, CHANNEL_WARTALK);
    const isOn = !hasFlag(ch.deaf, CHANNEL_WARTALK);
    ch.sendToChar(`War channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
    return;
  }
  talkChannel(ch, arg, 'wartalk');
}

// =============================================================================
// Emote
// =============================================================================

/** Emote - custom action to room. No quotes around action. */
export function doEmote(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar('Emote what?\r\n');
    return;
  }

  if (isRoomSilent(ch)) {
    ch.sendToChar("The room is too quiet for that.\r\n");
    return;
  }

  const room = ch.inRoom as Room | null;
  if (!room) return;

  // Display to all in room including sender
  for (const victim of room.characters) {
    if (victim === ch) {
      victim.sendToChar(`${ch.name} ${arg}\r\n`);
    } else {
      victim.sendToChar(`${ch.name} ${arg}\r\n`);
    }
  }
}

// =============================================================================
// Deaf Toggle
// =============================================================================

/** Toggle channel deaf bits. */
export function doDeaf(ch: Character, argument: string): void {
  const arg = argument.trim().toLowerCase();

  if (!arg) {
    // List current deaf settings
    ch.sendToChar('Current channel settings:\r\n');
    for (const [name, bit] of Object.entries(DEAF_CHANNEL_MAP)) {
      const status = hasFlag(ch.deaf, bit) ? 'OFF' : 'ON';
      ch.sendToChar(`  ${name.padEnd(15)} ${status}\r\n`);
    }
    return;
  }

  const bit = DEAF_CHANNEL_MAP[arg];
  if (!bit) {
    ch.sendToChar(`Unknown channel: ${arg}\r\n`);
    ch.sendToChar('Available channels: ' + Object.keys(DEAF_CHANNEL_MAP).join(', ') + '\r\n');
    return;
  }

  ch.deaf = toggleFlag(ch.deaf, bit);
  const isOn = !hasFlag(ch.deaf, bit);
  ch.sendToChar(`${arg.charAt(0).toUpperCase() + arg.slice(1)} channel is now ${isOn ? 'ON' : 'OFF'}.\r\n`);
}

// =============================================================================
// Ignore List Management
// =============================================================================

/** Toggle ignore for a player. */
export function doIgnore(ch: Character, argument: string): void {
  const player = ch as unknown as Player;
  if (!player.pcData) {
    ch.sendToChar("NPCs can't ignore anyone.\r\n");
    return;
  }

  const arg = argument.trim();

  if (!arg) {
    // List ignored players
    if (player.pcData.ignored.size === 0) {
      ch.sendToChar("You aren't ignoring anyone.\r\n");
      return;
    }
    ch.sendToChar('You are ignoring:\r\n');
    for (const name of player.pcData.ignored) {
      ch.sendToChar(`  ${name}\r\n`);
    }
    return;
  }

  const targetName = arg.toLowerCase();

  // Can't ignore yourself
  if (targetName === ch.name.toLowerCase()) {
    ch.sendToChar("You can't ignore yourself.\r\n");
    return;
  }

  if (player.pcData.ignored.has(targetName)) {
    player.pcData.ignored.delete(targetName);
    ch.sendToChar(`You are no longer ignoring ${arg}.\r\n`);
  } else {
    // Max 20 ignored players
    if (player.pcData.ignored.size >= 20) {
      ch.sendToChar("You can't ignore any more players (max 20).\r\n");
      return;
    }
    player.pcData.ignored.add(targetName);
    ch.sendToChar(`You are now ignoring ${arg}.\r\n`);
  }
}

// =============================================================================
// Language Commands
// =============================================================================

/** Change speaking language. */
export function doSpeak(ch: Character, argument: string): void {
  const arg = argument.trim().toLowerCase();

  if (!arg) {
    const currentLang = LANGUAGE_NAMES[ch.speaking as Language] ?? 'common';
    ch.sendToChar(`You are currently speaking ${currentLang}.\r\n`);
    return;
  }

  // Find the language by name
  let targetLang: Language | null = null;
  for (const [langVal, langName] of Object.entries(LANGUAGE_NAMES)) {
    if (langName === arg) {
      targetLang = Number(langVal) as Language;
      break;
    }
  }

  if (targetLang === null) {
    ch.sendToChar(`Unknown language: ${arg}.\r\n`);
    return;
  }

  // Common is always available
  if (targetLang === Language.Common) {
    ch.speaking = targetLang;
    ch.sendToChar('You now speak common.\r\n');
    return;
  }

  // Check if ch knows the language (comprehension > 0)
  const player = ch as unknown as Player;
  const comprehension = player.pcData?.learned?.get(targetLang) ?? 0;
  if (comprehension <= 0 && !ch.isImmortal) {
    ch.sendToChar(`You don't know how to speak ${arg}.\r\n`);
    return;
  }

  ch.speaking = targetLang;
  ch.sendToChar(`You now speak ${LANGUAGE_NAMES[targetLang]}.\r\n`);
}

/** List languages and comprehension. */
export function doLanguages(ch: Character, _argument: string): void {
  ch.sendToChar('Languages:\r\n');

  const player = ch as unknown as Player;
  for (const [langVal, langName] of Object.entries(LANGUAGE_NAMES)) {
    const lang = Number(langVal) as Language;
    let comprehension: number;

    if (lang === Language.Common) {
      comprehension = 100;
    } else {
      comprehension = player.pcData?.learned?.get(lang) ?? 0;
    }

    const speaking = ch.speaking === lang ? ' (speaking)' : '';
    ch.sendToChar(`  ${langName.padEnd(12)} ${String(comprehension).padStart(3)}%${speaking}\r\n`);
  }
}

// =============================================================================
// Command Registration
// =============================================================================

/** Register all communication-related commands with the command registry. */
// TODO PARITY: Missing communication commands — say_to, retell, beckon, dismiss, repeat (tell history)
export function registerCommunicationCommands(registry: CommandRegistry): void {
  const commands: Omit<CommandDef, 'useCount' | 'lagCount' | 'flags'>[] = [
    { name: 'chat',        handler: doChat,         minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'gossip',      handler: doGossip,       minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'yell',        handler: doYell,         minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'shout',       handler: doShout,        minPosition: Position.Resting, minTrust: 3,  logLevel: CommandLogLevel.Normal },
    { name: 'say',         handler: doSay,          minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'tell',        handler: doTell,         minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'reply',       handler: doReply,        minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'whisper',     handler: doWhisper,      minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'gtell',       handler: doGtell,        minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'clantalk',    handler: doClanTalk,     minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'ordertalk',   handler: doOrderTalk,    minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'counciltalk', handler: doCouncilTalk,  minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'guildtalk',   handler: doGuildTalk,    minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'music',       handler: doMusic,        minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'newbiechat',  handler: doNewbieChat,   minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'immtalk',     handler: doImmtalk,      minPosition: Position.Resting, minTrust: 51, logLevel: CommandLogLevel.Normal },
    { name: 'racetalk',    handler: doRaceTalk,     minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'wartalk',     handler: doWartalk,      minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'emote',       handler: doEmote,        minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'deaf',        handler: doDeaf,         minPosition: Position.Sleeping, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'ignore',      handler: doIgnore,       minPosition: Position.Sleeping, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'speak',       handler: doSpeak,        minPosition: Position.Resting, minTrust: 0,  logLevel: CommandLogLevel.Normal },
    { name: 'languages',   handler: doLanguages,    minPosition: Position.Sleeping, minTrust: 0, logLevel: CommandLogLevel.Normal },
  ];

  for (const cmd of commands) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
