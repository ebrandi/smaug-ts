/**
 * social.ts – Social command loader and executor.
 *
 * Loads social definitions from a JSON data file and registers them
 * with the CommandRegistry's social table. Supports targeted and
 * untargeted forms with positional messages and variable substitution.
 *
 * Social format:
 *   charNoArg  – What actor sees with no target
 *   othersNoArg – What room sees with no target
 *   charFound  – What actor sees with a target
 *   othersFound – What room sees with a target
 *   victFound  – What target sees
 *   charAuto   – What actor sees targeting self
 *   othersAuto – What room sees when actor targets self
 *
 * Variable substitution:
 *   $n = ch.name, $N = victim.name
 *   $e = he/she/it (ch), $E = he/she/it (victim)
 *   $m = him/her/it (ch), $M = him/her/it (victim)
 *   $s = his/her/its (ch), $S = his/her/its (victim)
 */

import type { CommandRegistry, SocialDef } from './CommandRegistry.js';
import type { Character } from '../entities/Character.js';
import { Sex } from '../entities/types.js';
import { Logger } from '../../utils/Logger.js';
import { isNamePrefix } from '../../utils/StringUtils.js';
import * as fs from 'fs/promises';

const LOG_DOMAIN = 'social';

/** Raw social data as stored in JSON. */
export interface SocialData {
  name: string;
  charNoArg: string;
  othersNoArg: string;
  charFound: string;
  othersFound: string;
  victFound: string;
  charAuto: string;
  othersAuto: string;
}

/**
 * Load socials from a JSON file and register with the command registry.
 * Returns the count of socials loaded.
 */
export async function loadSocials(
  filePath: string,
  registry: CommandRegistry,
  logger: Logger,
): Promise<number> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    logger.warn(LOG_DOMAIN, `Could not load socials file: ${filePath}: ${String(err)}`);
    return 0;
  }

  let socials: SocialData[];
  try {
    socials = JSON.parse(raw) as SocialData[];
  } catch (err) {
    logger.error(LOG_DOMAIN, `Failed to parse socials JSON: ${String(err)}`);
    return 0;
  }

  let count = 0;
  for (const sd of socials) {
    if (!sd.name) continue;

    const social: SocialDef = {
      name: sd.name.toLowerCase(),
      charNoArg: sd.charNoArg ?? '',
      othersNoArg: sd.othersNoArg ?? '',
      charFound: sd.charFound ?? '',
      othersFound: sd.othersFound ?? '',
      victFound: sd.victFound ?? '',
      charAuto: sd.charAuto ?? '',
      othersAuto: sd.othersAuto ?? '',
    };

    registry.registerSocial(social);
    count++;
  }

  logger.info(LOG_DOMAIN, `Loaded ${count} socials from ${filePath}`);
  return count;
}

/**
 * Execute a social command.
 * Parses argument to find a target in the room, then displays appropriate messages.
 */
export function executeSocial(ch: Character, social: SocialDef, argument: string): void {
  const arg = argument.trim();

  if (arg.length === 0) {
    // No argument – untargeted social
    ch.sendToChar(substituteVariables(social.charNoArg, ch, null) + '\r\n');
    sendToRoom(ch, substituteVariables(social.othersNoArg, ch, null) + '\r\n');
    return;
  }

  // Try to find target in the room
  const victim = findCharInRoom(ch, arg);

  if (!victim) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  // Self-targeted social
  if (victim === ch) {
    ch.sendToChar(substituteVariables(social.charAuto, ch, null) + '\r\n');
    sendToRoom(ch, substituteVariables(social.othersAuto, ch, null) + '\r\n');
    return;
  }

  // Targeted social
  ch.sendToChar(substituteVariables(social.charFound, ch, victim) + '\r\n');
  victim.sendToChar(substituteVariables(social.victFound, ch, victim) + '\r\n');
  sendToRoomExcept(ch, victim, substituteVariables(social.othersFound, ch, victim) + '\r\n');
}

/**
 * Substitute social variables in a text string.
 *
 * $n = ch short description or name
 * $N = victim short description or name
 * $e = he/she/it for ch
 * $E = he/she/it for victim
 * $m = him/her/it for ch
 * $M = him/her/it for victim
 * $s = his/her/its for ch
 * $S = his/her/its for victim
 */
export function substituteVariables(text: string, ch: Character, victim: Character | null): string {
  let result = text;

  result = result.replace(/\$n/g, ch.shortDescription || ch.name);
  result = result.replace(/\$N/g, victim ? (victim.shortDescription || victim.name) : 'someone');
  result = result.replace(/\$e/g, subjectPronoun(ch.sex));
  result = result.replace(/\$E/g, victim ? subjectPronoun(victim.sex) : 'it');
  result = result.replace(/\$m/g, objectPronoun(ch.sex));
  result = result.replace(/\$M/g, victim ? objectPronoun(victim.sex) : 'it');
  result = result.replace(/\$s/g, possessivePronoun(ch.sex));
  result = result.replace(/\$S/g, victim ? possessivePronoun(victim.sex) : 'its');

  return result;
}

/** Get subject pronoun (he/she/it) for a sex. */
function subjectPronoun(sex: Sex): string {
  switch (sex) {
    case Sex.Male: return 'he';
    case Sex.Female: return 'she';
    default: return 'it';
  }
}

/** Get object pronoun (him/her/it) for a sex. */
function objectPronoun(sex: Sex): string {
  switch (sex) {
    case Sex.Male: return 'him';
    case Sex.Female: return 'her';
    default: return 'it';
  }
}

/** Get possessive pronoun (his/her/its) for a sex. */
function possessivePronoun(sex: Sex): string {
  switch (sex) {
    case Sex.Male: return 'his';
    case Sex.Female: return 'her';
    default: return 'its';
  }
}

/**
 * Find a character in the same room by name or keyword prefix.
 */
function findCharInRoom(ch: Character, name: string): Character | null {
  const room = ch.inRoom as { characters?: Character[] } | null;
  if (!room?.characters) return null;

  const lowerName = name.toLowerCase();
  for (const target of room.characters) {
    if (target.name.toLowerCase() === lowerName) return target;
    if (isNamePrefix(lowerName, (target.keywords ?? [target.name]).join(' '))) return target;
  }

  return null;
}

/**
 * Send a message to all characters in the room except the sender.
 */
function sendToRoom(ch: Character, message: string): void {
  const room = ch.inRoom as { characters?: Character[] } | null;
  if (!room?.characters) return;

  for (const target of room.characters) {
    if (target !== ch) {
      target.sendToChar(message);
    }
  }
}

/**
 * Send a message to all characters in the room except two (sender and victim).
 */
function sendToRoomExcept(ch: Character, victim: Character, message: string): void {
  const room = ch.inRoom as { characters?: Character[] } | null;
  if (!room?.characters) return;

  for (const target of room.characters) {
    if (target !== ch && target !== victim) {
      target.sendToChar(message);
    }
  }
}
