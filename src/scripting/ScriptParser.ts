/**
 * ScriptParser – MudProg trigger dispatcher and parser.
 *
 * Handles trigger matching and dispatching for MudProg scripts
 * attached to mobiles. Checks if a trigger condition is met, builds
 * the execution context, and delegates to MudProgEngine for execution.
 *
 * Trigger types match the legacy SMAUG mprog_types:
 *   ACT_PROG, SPEECH_PROG, RAND_PROG, FIGHT_PROG, HITPRCNT_PROG,
 *   DEATH_PROG, ENTRY_PROG, GREET_PROG, ALL_GREET_PROG, GIVE_PROG,
 *   BRIBE_PROG, HOUR_PROG, TIME_PROG, WEAR_PROG, REMOVE_PROG,
 *   SAC_PROG, LOOK_PROG, EXA_PROG, ZAP_PROG, GET_PROG, DROP_PROG,
 *   DAMAGE_PROG, REPAIR_PROG, PULL_PROG, PUSH_PROG, SLEEP_PROG,
 *   REST_PROG, LEAVE_PROG, SCRIPT_PROG, USE_PROG
 */

import type { Character } from '../game/entities/Character.js';
import type { GameObject } from '../game/entities/GameObject.js';
import { Player } from '../game/entities/Player.js';
import { Mobile } from '../game/entities/Mobile.js';
import { MudProgEngine, type MudProg } from './MudProgEngine.js';
import type { MudProgContext } from './VariableSubstitution.js';
import { getGameHour } from './IfcheckRegistry.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// Trigger Type Enum
// =============================================================================

export enum TriggerType {
  ACT_PROG       = 0,
  SPEECH_PROG    = 1,
  RAND_PROG      = 2,
  FIGHT_PROG     = 3,
  HITPRCNT_PROG  = 4,
  DEATH_PROG     = 5,
  ENTRY_PROG     = 6,
  GREET_PROG     = 7,
  ALL_GREET_PROG = 8,
  GIVE_PROG      = 9,
  BRIBE_PROG     = 10,
  HOUR_PROG      = 11,
  TIME_PROG      = 12,
  WEAR_PROG      = 13,
  REMOVE_PROG    = 14,
  SAC_PROG       = 15,
  LOOK_PROG      = 16,
  EXA_PROG       = 17,
  ZAP_PROG       = 18,
  GET_PROG       = 19,
  DROP_PROG       = 20,
  DAMAGE_PROG    = 21,
  REPAIR_PROG    = 22,
  PULL_PROG      = 23,
  PUSH_PROG      = 24,
  SLEEP_PROG     = 25,
  REST_PROG      = 26,
  LEAVE_PROG     = 27,
  SCRIPT_PROG    = 28,
  USE_PROG       = 29,
}

/** Parsed script node – placeholder type for the AST. */
export interface ScriptNode {
  type: 'command' | 'if' | 'else' | 'endif';
  value: string;
  children?: ScriptNode[];
}

// =============================================================================
// Trigger Matching
// =============================================================================

/**
 * Check if a trigger argument matches the actual argument.
 * Different trigger types have different matching rules.
 */
function matchesTriggerArg(
  type: TriggerType,
  progArg: string,
  actualArg: string,
  actor: Character | null,
): boolean {
  switch (type) {
    case TriggerType.SPEECH_PROG:
      // 'p' matches any speech, otherwise check if speech contains trigger word
      if (progArg.toLowerCase() === 'p') return true;
      return actualArg.toLowerCase().includes(progArg.toLowerCase());

    case TriggerType.RAND_PROG:
      // progArg is percentage chance
      return Math.random() * 100 < (parseInt(progArg) || 0);

    case TriggerType.HITPRCNT_PROG:
      // progArg is HP percentage threshold
      if (!actor) return false;
      {
        const pct = Math.floor((actor.hit * 100) / Math.max(1, actor.maxHit));
        return pct <= (parseInt(progArg) || 0);
      }

    case TriggerType.BRIBE_PROG:
      // progArg is minimum gold amount
      return (parseInt(actualArg) || 0) >= (parseInt(progArg) || 0);

    case TriggerType.HOUR_PROG:
    case TriggerType.TIME_PROG:
      // progArg is game hour
      return getGameHour() === (parseInt(progArg) || 0);

    case TriggerType.GIVE_PROG:
      // progArg is object name or 'all'
      if (progArg.toLowerCase() === 'all') return true;
      return actualArg.toLowerCase().includes(progArg.toLowerCase());

    case TriggerType.ACT_PROG:
      // progArg is keyword pattern to match against act output
      if (progArg === 'p' || progArg === 'P') return true;
      return actualArg.toLowerCase().includes(progArg.toLowerCase());

    case TriggerType.GREET_PROG:
      // Only trigger for visible PCs
      if (!actor || actor instanceof Mobile) return false;
      return true;

    case TriggerType.ALL_GREET_PROG:
      // Trigger for all characters entering
      return true;

    default:
      // Most triggers don't need arg matching
      return true;
  }
}

/**
 * Get a random PC in the given room.
 */
function getRandomPCInRoom(room: unknown): Character | null {
  if (!room || typeof room !== 'object') return null;
  const r = room as { characters?: Character[] };
  if (!r.characters || r.characters.length === 0) return null;

  const pcs = r.characters.filter(ch => ch instanceof Player);
  if (pcs.length === 0) return null;
  return pcs[Math.floor(Math.random() * pcs.length)] ?? null;
}

// =============================================================================
// Core Trigger Check
// =============================================================================

/**
 * Check and execute MudProgs on a mobile for a specific trigger type.
 *
 * @param triggerType - The trigger type to check
 * @param mob - The mobile whose progs to check
 * @param actor - The triggering character (if any)
 * @param arg - Trigger argument text
 * @param obj - Triggering object (if any)
 * @returns true if a program was triggered and executed
 */
export function checkTrigger(
  triggerType: TriggerType,
  mob: Mobile,
  actor: Character | null = null,
  arg: string = '',
  obj: GameObject | null = null,
): boolean {
  // Check if mob has any MudProgs
  const mudProgs = (mob as Mobile & { mudProgs?: MudProg[] }).mudProgs;
  if (!mudProgs || mudProgs.length === 0) return false;

  for (const prog of mudProgs) {
    if (prog.triggerType !== triggerType) continue;

    // Check trigger argument match
    if (!matchesTriggerArg(triggerType, prog.argList, arg, actor)) continue;

    // Build context
    const context: MudProgContext = {
      mob,
      actor,
      victim: null,
      obj,
      arg,
      randomPC: getRandomPCInRoom(mob.inRoom),
    };

    // Execute the prog
    try {
      MudProgEngine.execute(prog, context);
    } catch (err) {
      logger.error('scripting', `MudProg execution error on mob ${mob.name}: ${err}`);
    }
    return true;
  }

  return false;
}

// =============================================================================
// Exported Trigger Check Functions
// =============================================================================

/** Check GREET_PROG triggers when a player enters a mob's room. */
export function checkGreetProg(mob: Mobile, actor: Character): boolean {
  return checkTrigger(TriggerType.GREET_PROG, mob, actor);
}

/** Check ALL_GREET_PROG triggers when any character enters a mob's room. */
export function checkAllGreetProg(mob: Mobile, actor: Character): boolean {
  return checkTrigger(TriggerType.ALL_GREET_PROG, mob, actor);
}

/** Check SPEECH_PROG triggers when a player says something. */
export function checkSpeechProg(mob: Mobile, actor: Character, speech: string): boolean {
  return checkTrigger(TriggerType.SPEECH_PROG, mob, actor, speech);
}

/** Check DEATH_PROG triggers when a mobile dies. */
export function checkDeathProg(mob: Mobile, killer: Character): boolean {
  return checkTrigger(TriggerType.DEATH_PROG, mob, killer);
}

/** Check FIGHT_PROG triggers during combat. */
export function checkFightProg(mob: Mobile, victim: Character): boolean {
  return checkTrigger(TriggerType.FIGHT_PROG, mob, victim);
}

/** Check HITPRCNT_PROG triggers when HP drops below threshold. */
export function checkHitPrcntProg(mob: Mobile, victim: Character): boolean {
  return checkTrigger(TriggerType.HITPRCNT_PROG, mob, victim);
}

/** Check GIVE_PROG triggers when a player gives an object to a mob. */
export function checkGiveProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.GIVE_PROG, mob, actor, obj.name, obj);
}

/** Check BRIBE_PROG triggers when a player gives gold to a mob. */
export function checkBribeProg(mob: Mobile, actor: Character, amount: number): boolean {
  return checkTrigger(TriggerType.BRIBE_PROG, mob, actor, amount.toString());
}

/** Check RAND_PROG triggers (random chance each tick). */
export function checkRandProg(mob: Mobile): boolean {
  return checkTrigger(TriggerType.RAND_PROG, mob, null);
}

/** Check ENTRY_PROG triggers when a mob enters a room. */
export function checkEntryProg(mob: Mobile): boolean {
  return checkTrigger(TriggerType.ENTRY_PROG, mob, null);
}

/** Check ACT_PROG triggers on act() output. */
export function checkActProg(mob: Mobile, actor: Character, actText: string): boolean {
  return checkTrigger(TriggerType.ACT_PROG, mob, actor, actText);
}

/** Check HOUR_PROG triggers at specific game hours. */
export function checkHourProg(mob: Mobile): boolean {
  return checkTrigger(TriggerType.HOUR_PROG, mob, null);
}

/** Check TIME_PROG triggers at specific game hours. */
export function checkTimeProg(mob: Mobile): boolean {
  return checkTrigger(TriggerType.TIME_PROG, mob, null);
}

/** Check WEAR_PROG triggers when an object is worn. */
export function checkWearProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.WEAR_PROG, mob, actor, obj.name, obj);
}

/** Check REMOVE_PROG triggers when an object is removed. */
export function checkRemoveProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.REMOVE_PROG, mob, actor, obj.name, obj);
}

/** Check SAC_PROG triggers when an object is sacrificed. */
export function checkSacProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.SAC_PROG, mob, actor, obj.name, obj);
}

/** Check LOOK_PROG triggers when a player looks at the mob. */
export function checkLookProg(mob: Mobile, actor: Character): boolean {
  return checkTrigger(TriggerType.LOOK_PROG, mob, actor);
}

/** Check EXA_PROG triggers when a player examines the mob. */
export function checkExaProg(mob: Mobile, actor: Character): boolean {
  return checkTrigger(TriggerType.EXA_PROG, mob, actor);
}

/** Check GET_PROG triggers when a player gets an object. */
export function checkGetProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.GET_PROG, mob, actor, obj.name, obj);
}

/** Check DROP_PROG triggers when a player drops an object. */
export function checkDropProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.DROP_PROG, mob, actor, obj.name, obj);
}

/** Check DAMAGE_PROG triggers when damage is dealt. */
export function checkDamageProg(mob: Mobile, actor: Character, amount: number): boolean {
  return checkTrigger(TriggerType.DAMAGE_PROG, mob, actor, amount.toString());
}

/** Check LEAVE_PROG triggers when a character leaves the room. */
export function checkLeaveProg(mob: Mobile, actor: Character): boolean {
  return checkTrigger(TriggerType.LEAVE_PROG, mob, actor);
}

/** Check SLEEP_PROG triggers when a character goes to sleep. */
export function checkSleepProg(mob: Mobile, actor: Character): boolean {
  return checkTrigger(TriggerType.SLEEP_PROG, mob, actor);
}

/** Check REST_PROG triggers when a character rests. */
export function checkRestProg(mob: Mobile, actor: Character): boolean {
  return checkTrigger(TriggerType.REST_PROG, mob, actor);
}

/** Check USE_PROG triggers when an object is used. */
export function checkUseProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.USE_PROG, mob, actor, obj.name, obj);
}

/** Check PULL_PROG triggers when an object is pulled. */
export function checkPullProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.PULL_PROG, mob, actor, obj.name, obj);
}

/** Check PUSH_PROG triggers when an object is pushed. */
export function checkPushProg(mob: Mobile, actor: Character, obj: GameObject): boolean {
  return checkTrigger(TriggerType.PUSH_PROG, mob, actor, obj.name, obj);
}

// =============================================================================
// ScriptParser class (backward compatibility with stub interface)
// =============================================================================

// TODO PARITY: ScriptParser — implement full MUDprog command set (mpforce, mptransfer, mpechoat, mpoload, mpmload, mpkill, mpjunk, mpecho, mpechoaround, mpat)
export class ScriptParser {
  /**
   * Parse raw MudProg script text into an array of ScriptNodes.
   * The MudProgEngine uses line-by-line execution rather than an AST,
   * but this method is provided for analysis/tooling purposes.
   */
  parse(scriptText: string): ScriptNode[] {
    const lines = scriptText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const nodes: ScriptNode[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('if ') || lower.startsWith('or ')) {
        nodes.push({ type: 'if', value: line });
      } else if (lower === 'else') {
        nodes.push({ type: 'else', value: line });
      } else if (lower === 'endif') {
        nodes.push({ type: 'endif', value: line });
      } else {
        nodes.push({ type: 'command', value: line });
      }
    }

    return nodes;
  }
}
