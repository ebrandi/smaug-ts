/**
 * IfcheckRegistry – MudProg if-check function registry.
 *
 * Maps if-check names (rand, ispc, isnpc, isgood, isevil, etc.)
 * to evaluator functions. Replicates all 50+ ifchecks from legacy
 * mud_prog.c.
 *
 * Each ifcheck function receives:
 *   - target: the resolved $variable target
 *   - operator: comparison operator (==, !=, >, <, >=, <=)
 *   - value: comparison value string
 *   - context: the full MudProgContext
 */

import type { Character } from '../game/entities/Character.js';
import type { GameObject } from '../game/entities/GameObject.js';
import { Player } from '../game/entities/Player.js';
import { Mobile } from '../game/entities/Mobile.js';
import { AFF, EX_FLAGS } from '../game/entities/types.js';
import { hasFlag } from '../utils/BitVector.js';
import type { MudProgContext } from './VariableSubstitution.js';

/** Handler function type for evaluating an if-check. */
export type IfcheckHandler = (
  target: unknown,
  operator: string,
  value: string,
  context: MudProgContext,
) => boolean;

/**
 * Compare two numeric values using an operator string.
 */
function compareNumeric(a: number, op: string, b: number): boolean {
  switch (op) {
    case '==': return a === b;
    case '!=': return a !== b;
    case '>':  return a > b;
    case '<':  return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    default:   return a === b; // Default to equality
  }
}

/**
 * Safely cast to Character if possible.
 */
function asChar(target: unknown): Character | null {
  if (target && typeof target === 'object' && 'level' in target && 'name' in target) {
    return target as Character;
  }
  return null;
}

/**
 * Safely cast to GameObject if possible.
 */
function asObj(target: unknown): GameObject | null {
  if (target && typeof target === 'object' && 'itemType' in target && 'values' in target) {
    return target as GameObject;
  }
  return null;
}

// =============================================================================
// Ifcheck Registry Map
// =============================================================================

const ifchecks: Map<string, IfcheckHandler> = new Map();

// ---------------------------------------------------------------------------
// Boolean character state checks (no comparison needed)
// ---------------------------------------------------------------------------

ifchecks.set('ispc', (target) => {
  return target instanceof Player;
});

ifchecks.set('isnpc', (target) => {
  return target instanceof Mobile;
});

ifchecks.set('isgood', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.alignment > 350;
});

ifchecks.set('isevil', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.alignment < -350;
});

ifchecks.set('isneutral', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.alignment >= -350 && ch.alignment <= 350;
});

ifchecks.set('isfight', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.fighting !== null;
});

ifchecks.set('isimmort', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.level >= 51;
});

ifchecks.set('ischarmed', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.CHARM);
});

ifchecks.set('isfollow', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.master !== null;
});

ifchecks.set('ispkill', (target) => {
  if (!(target instanceof Player)) return false;
  return hasFlag(target.pcData.flags, 1n << 0n); // PCFLAG_DEADLY
});

ifchecks.set('isdevoted', (target) => {
  if (!(target instanceof Player)) return false;
  return target.pcData.deityName !== null && target.pcData.deityName !== '';
});

ifchecks.set('canpkill', (target) => {
  if (!(target instanceof Player)) return false;
  return target.level >= 5 && hasFlag(target.pcData.flags, 1n << 0n);
});

ifchecks.set('isflying', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.FLYING);
});

ifchecks.set('isinvisible', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.INVISIBLE);
});

ifchecks.set('ishidden', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.HIDE);
});

ifchecks.set('issneaking', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.SNEAK);
});

ifchecks.set('issleeping', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.position === 4; // Position.Sleeping
});

ifchecks.set('isawake', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.position > 4; // > Position.Sleeping
});

ifchecks.set('ismounted', (target) => {
  const ch = asChar(target);
  return ch !== null && ch.mount !== null;
});

ifchecks.set('ispoisoned', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.POISON);
});

ifchecks.set('issancted', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.SANCTUARY);
});

ifchecks.set('iscursed', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.CURSE);
});

ifchecks.set('isblind', (target) => {
  const ch = asChar(target);
  return ch !== null && hasFlag(ch.affectedBy, AFF.BLIND);
});

// ---------------------------------------------------------------------------
// Numeric comparison checks
// ---------------------------------------------------------------------------

ifchecks.set('hitprcnt', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  const pct = Math.floor((ch.hit * 100) / Math.max(1, ch.maxHit));
  return compareNumeric(pct, op, parseInt(val) || 0);
});

ifchecks.set('level', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.level ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('goldamt', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.gold ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('sex', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.sex ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('position', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.position ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('str', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  return compareNumeric(ch.getStat('str'), op, parseInt(val) || 0);
});

ifchecks.set('int', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  return compareNumeric(ch.getStat('int'), op, parseInt(val) || 0);
});

ifchecks.set('wis', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  return compareNumeric(ch.getStat('wis'), op, parseInt(val) || 0);
});

ifchecks.set('dex', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  return compareNumeric(ch.getStat('dex'), op, parseInt(val) || 0);
});

ifchecks.set('con', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  return compareNumeric(ch.getStat('con'), op, parseInt(val) || 0);
});

ifchecks.set('cha', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  return compareNumeric(ch.getStat('cha'), op, parseInt(val) || 0);
});

ifchecks.set('lck', (target, op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  return compareNumeric(ch.getStat('lck'), op, parseInt(val) || 0);
});

ifchecks.set('armor', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.armor ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('hitroll', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.hitroll ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('damroll', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.damroll ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('hp', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.hit ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('maxhp', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.maxHit ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('mana', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.mana ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('maxmana', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.maxMana ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('moves', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.move ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('maxmoves', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.maxMove ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('alignment', (target, op, val) => {
  const ch = asChar(target);
  return compareNumeric(ch?.alignment ?? 0, op, parseInt(val) || 0);
});

// ---------------------------------------------------------------------------
// String comparison checks
// ---------------------------------------------------------------------------

ifchecks.set('name', (target, op, val) => {
  const ch = asChar(target);
  const name = ch?.name?.toLowerCase() ?? '';
  const check = val.toLowerCase();
  return op === '!=' ? name !== check : name === check;
});

ifchecks.set('class', (target, op, val) => {
  const ch = asChar(target);
  const cls = ch?.class_?.toLowerCase() ?? '';
  const check = val.toLowerCase();
  if (op === '==' || op === '') return cls === check;
  if (op === '!=') return cls !== check;
  // Numeric class comparison fallback
  return compareNumeric(parseInt(cls) || 0, op, parseInt(val) || 0);
});

ifchecks.set('race', (target, op, val) => {
  const ch = asChar(target);
  const race = ch?.race?.toLowerCase() ?? '';
  const check = val.toLowerCase();
  if (op === '==' || op === '') return race === check;
  if (op === '!=') return race !== check;
  return compareNumeric(parseInt(race) || 0, op, parseInt(val) || 0);
});

ifchecks.set('clan', (target, op, val) => {
  if (!(target instanceof Player)) return false;
  const clanName = target.pcData.clanName?.toLowerCase() ?? '';
  const check = val.toLowerCase();
  return op === '!=' ? clanName !== check : clanName === check;
});

// ---------------------------------------------------------------------------
// Room checks
// ---------------------------------------------------------------------------

ifchecks.set('inroom', (target, op, val) => {
  const ch = asChar(target);
  const room = ch?.inRoom as { vnum?: number } | null;
  return compareNumeric(room?.vnum ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('inarea', (target, op, val) => {
  const ch = asChar(target);
  const room = ch?.inRoom as { area?: { name?: string } } | null;
  const areaName = room?.area?.name?.toLowerCase() ?? '';
  const check = val.toLowerCase();
  return op === '!=' ? areaName !== check : areaName === check;
});

ifchecks.set('wasinroom', (target, op, val) => {
  const ch = asChar(target);
  const room = ch?.wasInRoom as { vnum?: number } | null;
  return compareNumeric(room?.vnum ?? 0, op, parseInt(val) || 0);
});

// ---------------------------------------------------------------------------
// Affect checks
// ---------------------------------------------------------------------------

ifchecks.set('isaffected', (target, _op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  try {
    const affBit = BigInt(val);
    return hasFlag(ch.affectedBy, affBit);
  } catch {
    return false;
  }
});

ifchecks.set('hasaffect', (target, _op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  const affType = parseInt(val) || 0;
  return ch.affects.some(a => a.type === affType);
});

// ---------------------------------------------------------------------------
// Random check
// ---------------------------------------------------------------------------

ifchecks.set('rand', (target, _op, _val) => {
  // rand(25) passes 25 as the target string
  const chance = typeof target === 'number' ? target
    : typeof target === 'string' ? parseInt(target) || 0
    : 0;
  return Math.random() * 100 < chance;
});

// ---------------------------------------------------------------------------
// Object checks
// ---------------------------------------------------------------------------

ifchecks.set('objtype', (target, op, val) => {
  const obj = asObj(target);
  return compareNumeric(obj?.itemType ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('objval0', (target, op, val) => {
  const obj = asObj(target);
  return compareNumeric(obj?.values?.[0] ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('objval1', (target, op, val) => {
  const obj = asObj(target);
  return compareNumeric(obj?.values?.[1] ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('objval2', (target, op, val) => {
  const obj = asObj(target);
  return compareNumeric(obj?.values?.[2] ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('objval3', (target, op, val) => {
  const obj = asObj(target);
  return compareNumeric(obj?.values?.[3] ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('objval4', (target, op, val) => {
  const obj = asObj(target);
  return compareNumeric(obj?.values?.[4] ?? 0, op, parseInt(val) || 0);
});

ifchecks.set('objval5', (target, op, val) => {
  const obj = asObj(target);
  return compareNumeric(obj?.values?.[5] ?? 0, op, parseInt(val) || 0);
});

// ---------------------------------------------------------------------------
// Existence checks (use context.mob.inRoom)
// ---------------------------------------------------------------------------

ifchecks.set('mobinroom', (_target, _op, val, context) => {
  const vnum = parseInt(val) || 0;
  const room = context.mob.inRoom as { characters?: Character[] } | null;
  if (!room?.characters) return false;
  return room.characters.some(c => c instanceof Mobile && (c as Mobile).prototype?.vnum === vnum);
});

ifchecks.set('objinroom', (_target, _op, val, context) => {
  const vnum = parseInt(val) || 0;
  const room = context.mob.inRoom as { contents?: unknown[] } | null;
  if (!room?.contents) return false;
  return (room.contents as Array<{ prototype?: { vnum?: number } }>).some(o => o.prototype?.vnum === vnum);
});

ifchecks.set('objexists', (_target, _op, val, context) => {
  const vnum = parseInt(val) || 0;
  const room = context.mob.inRoom as { contents?: unknown[] } | null;
  if (!room?.contents) return false;
  return (room.contents as Array<{ prototype?: { vnum?: number } }>).some(o => o.prototype?.vnum === vnum);
});

ifchecks.set('mobhere', (_target, _op, val, context) => {
  // Check if mob with given name or vnum is in room
  const room = context.mob.inRoom as { characters?: Character[] } | null;
  if (!room?.characters) return false;
  const vnum = parseInt(val);
  if (!isNaN(vnum)) {
    return room.characters.some(c => c instanceof Mobile && (c as Mobile).prototype?.vnum === vnum);
  }
  return room.characters.some(c => c.name.toLowerCase() === val.toLowerCase());
});

ifchecks.set('objhere', (_target, _op, val, context) => {
  const room = context.mob.inRoom as { contents?: unknown[] } | null;
  if (!room?.contents) return false;
  const vnum = parseInt(val);
  if (!isNaN(vnum)) {
    return (room.contents as Array<{ prototype?: { vnum?: number } }>).some(o => o.prototype?.vnum === vnum);
  }
  return (room.contents as Array<{ name?: string }>).some(o => o.name?.toLowerCase() === val.toLowerCase());
});

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

ifchecks.set('cansee', (target, _op, _val, context) => {
  const ch = asChar(target);
  if (!ch) return false;
  // Simple visibility: check if target is invisible and mob doesn't have detect invis
  if (hasFlag(ch.affectedBy, AFF.INVISIBLE) && !hasFlag(context.mob.affectedBy, AFF.DETECT_INVIS)) {
    return false;
  }
  if (hasFlag(ch.affectedBy, AFF.HIDE) && !hasFlag(context.mob.affectedBy, AFF.DETECT_HIDDEN)) {
    return false;
  }
  return true;
});

// ---------------------------------------------------------------------------
// Door checks
// ---------------------------------------------------------------------------

ifchecks.set('isopen', (_target, _op, val, context) => {
  const dir = parseInt(val) || 0;
  const room = context.mob.inRoom as { exits?: Map<number, { flags: bigint }> } | null;
  if (!room?.exits) return false;
  const exit = room.exits.get(dir);
  if (!exit) return false;
  return !hasFlag(exit.flags, EX_FLAGS.CLOSED);
});

ifchecks.set('isclosed', (_target, _op, val, context) => {
  const dir = parseInt(val) || 0;
  const room = context.mob.inRoom as { exits?: Map<number, { flags: bigint }> } | null;
  if (!room?.exits) return false;
  const exit = room.exits.get(dir);
  if (!exit) return false;
  return hasFlag(exit.flags, EX_FLAGS.CLOSED);
});

ifchecks.set('islocked', (_target, _op, val, context) => {
  const dir = parseInt(val) || 0;
  const room = context.mob.inRoom as { exits?: Map<number, { flags: bigint }> } | null;
  if (!room?.exits) return false;
  const exit = room.exits.get(dir);
  if (!exit) return false;
  return hasFlag(exit.flags, EX_FLAGS.LOCKED);
});

// ---------------------------------------------------------------------------
// Time checks (use simple hour-of-day approximation)
// ---------------------------------------------------------------------------

/** Game time hour tracker - can be set externally. */
let _gameHour = 12;

/** Set the current game hour (for testing and game time integration). */
export function setGameHour(hour: number): void {
  _gameHour = hour;
}

/** Get the current game hour. */
export function getGameHour(): number {
  return _gameHour;
}

ifchecks.set('isday', () => {
  return _gameHour >= 6 && _gameHour < 20;
});

ifchecks.set('isnight', () => {
  return _gameHour < 6 || _gameHour >= 20;
});

ifchecks.set('timeis', (_target, op, val) => {
  return compareNumeric(_gameHour, op, parseInt(val) || 0);
});

ifchecks.set('hour', (_target, op, val) => {
  return compareNumeric(_gameHour, op, parseInt(val) || 0);
});

// ---------------------------------------------------------------------------
// Number checks (target is a number)
// ---------------------------------------------------------------------------

ifchecks.set('number', (target, op, val) => {
  const num = typeof target === 'number' ? target : parseInt(String(target)) || 0;
  return compareNumeric(num, op, parseInt(val) || 0);
});

// ---------------------------------------------------------------------------
// Inventory checks
// ---------------------------------------------------------------------------

ifchecks.set('hasobj', (target, _op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  const vnum = parseInt(val) || 0;
  return (ch.inventory as Array<{ prototype?: { vnum?: number } }>).some(
    o => o.prototype?.vnum === vnum,
  );
});

ifchecks.set('isobjinv', (target, _op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  const vnum = parseInt(val) || 0;
  return (ch.inventory as Array<{ prototype?: { vnum?: number } }>).some(
    o => o.prototype?.vnum === vnum,
  );
});

ifchecks.set('iswearing', (target, _op, val) => {
  const ch = asChar(target);
  if (!ch) return false;
  const vnum = parseInt(val) || 0;
  for (const [_, obj] of ch.equipment) {
    if ((obj as { prototype?: { vnum?: number } })?.prototype?.vnum === vnum) return true;
  }
  return false;
});

// =============================================================================
// Registry Interface
// =============================================================================

export const IfcheckRegistry = {
  /** Get an ifcheck handler by name. */
  get(name: string): IfcheckHandler | undefined {
    return ifchecks.get(name.toLowerCase());
  },

  /** Check if an ifcheck is registered. */
  has(name: string): boolean {
    return ifchecks.has(name.toLowerCase());
  },

  /** Register a custom ifcheck handler. */
  register(name: string, handler: IfcheckHandler): void {
    ifchecks.set(name.toLowerCase(), handler);
  },

  /** Evaluate an ifcheck by name with the given arguments. */
  evaluate(name: string, target: unknown, operator: string, value: string, context: MudProgContext): boolean {
    const handler = ifchecks.get(name.toLowerCase());
    if (!handler) return false;
    return handler(target, operator, value, context);
  },

  /** Get the count of registered ifchecks. */
  get size(): number {
    return ifchecks.size;
  },
};

// Export compareNumeric for testing
export { compareNumeric };
