/**
 * VariableSubstitution – MudProg variable expansion.
 *
 * Expands MudProg variables in script text to the appropriate
 * character/object names and pronouns.
 *
 * Variable reference (from SMAUG legacy mud_prog.c):
 *   $n/$N – Actor name / short description
 *   $i/$I – Mob (self) name / short description
 *   $t/$T – Victim name / short description
 *   $r/$R – Random PC in room name / short description
 *   $p/$P – Object name / short description
 *   $e/$m/$s – Actor pronouns (he/him/his)
 *   $E/$M/$S – Victim pronouns (he/him/his)
 *   $j/$k/$l – Mob (self) pronouns (he/him/his)
 *   $$ – Literal dollar sign
 */

import type { Character } from '../game/entities/Character.js';
import type { GameObject } from '../game/entities/GameObject.js';
import { Sex } from '../game/entities/types.js';

/**
 * Context for MudProg variable substitution.
 */
export interface MudProgContext {
  /** The mob executing the program. */
  mob: Character;
  /** The triggering character ($n). */
  actor: Character | null;
  /** Secondary target ($t). */
  victim: Character | null;
  /** Triggering object ($p). */
  obj: GameObject | null;
  /** Trigger argument text. */
  arg: string;
  /** Random PC in room ($r). */
  randomPC: Character | null;
}

/**
 * Get the subjective pronoun for a character (he/she/it).
 */
function getHeSheIt(ch: Character | null): string {
  if (!ch) return 'it';
  switch (ch.sex) {
    case Sex.Male: return 'he';
    case Sex.Female: return 'she';
    default: return 'it';
  }
}

/**
 * Get the objective pronoun for a character (him/her/it).
 */
function getHimHerIt(ch: Character | null): string {
  if (!ch) return 'it';
  switch (ch.sex) {
    case Sex.Male: return 'him';
    case Sex.Female: return 'her';
    default: return 'it';
  }
}

/**
 * Get the possessive pronoun for a character (his/her/its).
 */
function getHisHerIts(ch: Character | null): string {
  if (!ch) return 'its';
  switch (ch.sex) {
    case Sex.Male: return 'his';
    case Sex.Female: return 'her';
    default: return 'its';
  }
}

/**
 * Get the display name for a character.
 * PCs use their name, NPCs use their short description.
 */
function getCharName(ch: Character | null): string {
  if (!ch) return 'someone';
  return ch.name || 'someone';
}

/**
 * Get the short description for a character.
 * PCs use their name, NPCs use their short description.
 */
function getCharShortDesc(ch: Character | null): string {
  if (!ch) return 'someone';
  return ch.shortDescription || ch.name || 'someone';
}

/**
 * Get the display name for an object.
 */
function getObjName(obj: GameObject | null): string {
  if (!obj) return 'something';
  return obj.name || 'something';
}

/**
 * Get the short description for an object.
 */
function getObjShortDesc(obj: GameObject | null): string {
  if (!obj) return 'something';
  return obj.shortDescription || obj.name || 'something';
}

/**
 * Substitute MudProg variables in the given text.
 *
 * Processes all $X variable tokens and replaces them with
 * appropriate values from the execution context.
 *
 * @param line - The text containing $-variables to expand
 * @param context - The execution context with mob, actor, victim, etc.
 * @returns The text with all variables expanded
 */
export function substituteVariables(line: string, context: MudProgContext): string {
  // Use a single-pass regex replacement to handle all variables
  return line.replace(/\$(.)/g, (match, code: string) => {
    switch (code) {
      // Actor (triggering character)
      case 'n': return getCharName(context.actor);
      case 'N': return getCharShortDesc(context.actor);

      // Mob (self - the executing mobile)
      case 'i': return getCharName(context.mob);
      case 'I': return getCharShortDesc(context.mob);

      // Victim (secondary target)
      case 't': return getCharName(context.victim);
      case 'T': return getCharShortDesc(context.victim);

      // Random PC in room
      case 'r': return getCharName(context.randomPC);
      case 'R': return getCharShortDesc(context.randomPC);

      // Object
      case 'p': return getObjName(context.obj);
      case 'P': return getObjShortDesc(context.obj);

      // Actor pronouns
      case 'e': return getHeSheIt(context.actor);
      case 'm': return getHimHerIt(context.actor);
      case 's': return getHisHerIts(context.actor);

      // Victim pronouns
      case 'E': return getHeSheIt(context.victim);
      case 'M': return getHimHerIt(context.victim);
      case 'S': return getHisHerIts(context.victim);

      // Mob (self) pronouns
      case 'j': return getHeSheIt(context.mob);
      case 'k': return getHimHerIt(context.mob);
      case 'l': return getHisHerIts(context.mob);

      // Escaped dollar sign
      case '$': return '$';

      default: return match; // Unknown variable, leave as-is
    }
  });
}

// Re-export helper functions for testing
export { getHeSheIt, getHimHerIt, getHisHerIts };
