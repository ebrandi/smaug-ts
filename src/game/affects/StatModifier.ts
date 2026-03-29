/**
 * StatModifier – Attribute bonus lookup tables.
 *
 * Replicates the legacy SMAUG 2.0 str_app, int_app, wis_app, dex_app,
 * con_app, cha_app, and lck_app tables from tables.c. Each stat value
 * (0-25) maps to a set of derived bonuses used throughout the game.
 *
 * Usage:
 *   getStatModifier('str', 18) → { toHit: 1, toDam: 3, carry: 200, wield: 18 }
 */

// =============================================================================
// Stat Bonus Interfaces
// =============================================================================

export interface StrModifier {
  toHit: number;    // To-hit bonus
  toDam: number;    // Damage bonus
  carry: number;    // Max carry weight in pounds
  wield: number;    // Max wield weight in pounds
}

export interface IntModifier {
  learn: number;    // Learning rate percentage (5-25)
}

export interface WisModifier {
  practice: number; // Bonus practice sessions per level
}

export interface DexModifier {
  defensive: number; // AC bonus (negative = better)
}

export interface ConModifier {
  hitp: number;     // HP bonus per level
  shock: number;    // Shock survival percentage
}

export interface ChaModifier {
  charm: number;    // Charm adjust (unused in most formulas, but legacy-accurate)
}

export interface LckModifier {
  luck: number;     // General luck modifier for random events
}

export type StatModifierResult =
  | StrModifier
  | IntModifier
  | WisModifier
  | DexModifier
  | ConModifier
  | ChaModifier
  | LckModifier;

// =============================================================================
// Legacy SMAUG 2.0 Stat Tables (from tables.c)
// Indexed 0-25. Values outside range clamp to nearest bound.
// =============================================================================

/**
 * str_app_type str_app[26] — Strength bonus table.
 * Fields: toHit, toDam, carry, wield
 */
const STR_TABLE: StrModifier[] = [
  /* 0  */ { toHit: -5, toDam: -4, carry:   0, wield:  0 },
  /* 1  */ { toHit: -5, toDam: -4, carry:   3, wield:  1 },
  /* 2  */ { toHit: -3, toDam: -2, carry:   3, wield:  2 },
  /* 3  */ { toHit: -3, toDam: -1, carry:  10, wield:  3 },
  /* 4  */ { toHit: -2, toDam: -1, carry:  25, wield:  4 },
  /* 5  */ { toHit: -2, toDam: -1, carry:  55, wield:  5 },
  /* 6  */ { toHit: -1, toDam:  0, carry:  80, wield:  6 },
  /* 7  */ { toHit: -1, toDam:  0, carry:  90, wield:  7 },
  /* 8  */ { toHit:  0, toDam:  0, carry: 100, wield:  8 },
  /* 9  */ { toHit:  0, toDam:  0, carry: 100, wield:  9 },
  /* 10 */ { toHit:  0, toDam:  0, carry: 115, wield: 10 },
  /* 11 */ { toHit:  0, toDam:  0, carry: 115, wield: 11 },
  /* 12 */ { toHit:  0, toDam:  0, carry: 140, wield: 12 },
  /* 13 */ { toHit:  0, toDam:  0, carry: 140, wield: 13 },
  /* 14 */ { toHit:  0, toDam:  1, carry: 170, wield: 14 },
  /* 15 */ { toHit:  1, toDam:  1, carry: 170, wield: 15 },
  /* 16 */ { toHit:  1, toDam:  2, carry: 195, wield: 16 },
  /* 17 */ { toHit:  2, toDam:  3, carry: 220, wield: 22 },
  /* 18 */ { toHit:  2, toDam:  4, carry: 250, wield: 25 },
  /* 19 */ { toHit:  3, toDam:  5, carry: 400, wield: 30 },
  /* 20 */ { toHit:  3, toDam:  6, carry: 500, wield: 35 },
  /* 21 */ { toHit:  4, toDam:  7, carry: 600, wield: 40 },
  /* 22 */ { toHit:  5, toDam:  7, carry: 700, wield: 45 },
  /* 23 */ { toHit:  6, toDam:  8, carry: 800, wield: 50 },
  /* 24 */ { toHit:  8, toDam: 10, carry: 900, wield: 55 },
  /* 25 */ { toHit: 10, toDam: 12, carry:1000, wield: 60 },
];

/**
 * int_app_type int_app[26] — Intelligence bonus table.
 * Fields: learn (percentage)
 */
const INT_TABLE: IntModifier[] = [
  /* 0  */ { learn:  3 },
  /* 1  */ { learn:  5 },
  /* 2  */ { learn:  7 },
  /* 3  */ { learn:  8 },
  /* 4  */ { learn:  9 },
  /* 5  */ { learn: 10 },
  /* 6  */ { learn: 11 },
  /* 7  */ { learn: 12 },
  /* 8  */ { learn: 13 },
  /* 9  */ { learn: 15 },
  /* 10 */ { learn: 17 },
  /* 11 */ { learn: 19 },
  /* 12 */ { learn: 20 },
  /* 13 */ { learn: 21 },
  /* 14 */ { learn: 23 },
  /* 15 */ { learn: 25 },
  /* 16 */ { learn: 28 },
  /* 17 */ { learn: 31 },
  /* 18 */ { learn: 34 },
  /* 19 */ { learn: 37 },
  /* 20 */ { learn: 40 },
  /* 21 */ { learn: 44 },
  /* 22 */ { learn: 49 },
  /* 23 */ { learn: 55 },
  /* 24 */ { learn: 60 },
  /* 25 */ { learn: 65 },
];

/**
 * wis_app_type wis_app[26] — Wisdom bonus table.
 * Fields: practice (bonus practice sessions per level)
 */
const WIS_TABLE: WisModifier[] = [
  /* 0  */ { practice: 0 },
  /* 1  */ { practice: 0 },
  /* 2  */ { practice: 0 },
  /* 3  */ { practice: 0 },
  /* 4  */ { practice: 0 },
  /* 5  */ { practice: 1 },
  /* 6  */ { practice: 1 },
  /* 7  */ { practice: 1 },
  /* 8  */ { practice: 1 },
  /* 9  */ { practice: 1 },
  /* 10 */ { practice: 1 },
  /* 11 */ { practice: 2 },
  /* 12 */ { practice: 2 },
  /* 13 */ { practice: 2 },
  /* 14 */ { practice: 2 },
  /* 15 */ { practice: 3 },
  /* 16 */ { practice: 3 },
  /* 17 */ { practice: 4 },
  /* 18 */ { practice: 5 },
  /* 19 */ { practice: 5 },
  /* 20 */ { practice: 5 },
  /* 21 */ { practice: 6 },
  /* 22 */ { practice: 6 },
  /* 23 */ { practice: 6 },
  /* 24 */ { practice: 7 },
  /* 25 */ { practice: 7 },
];

/**
 * dex_app_type dex_app[26] — Dexterity bonus table.
 * Fields: defensive (AC bonus, negative = better AC)
 */
const DEX_TABLE: DexModifier[] = [
  /* 0  */ { defensive:  60 },
  /* 1  */ { defensive:  50 },
  /* 2  */ { defensive:  50 },
  /* 3  */ { defensive:  40 },
  /* 4  */ { defensive:  30 },
  /* 5  */ { defensive:  20 },
  /* 6  */ { defensive:  10 },
  /* 7  */ { defensive:   0 },
  /* 8  */ { defensive:   0 },
  /* 9  */ { defensive:   0 },
  /* 10 */ { defensive:   0 },
  /* 11 */ { defensive:   0 },
  /* 12 */ { defensive:   0 },
  /* 13 */ { defensive:   0 },
  /* 14 */ { defensive:   0 },
  /* 15 */ { defensive: -10 },
  /* 16 */ { defensive: -15 },
  /* 17 */ { defensive: -20 },
  /* 18 */ { defensive: -30 },
  /* 19 */ { defensive: -40 },
  /* 20 */ { defensive: -50 },
  /* 21 */ { defensive: -60 },
  /* 22 */ { defensive: -75 },
  /* 23 */ { defensive: -90 },
  /* 24 */ { defensive:-105 },
  /* 25 */ { defensive:-120 },
];

/**
 * con_app_type con_app[26] — Constitution bonus table.
 * Fields: hitp (HP per level), shock (shock survival %)
 */
const CON_TABLE: ConModifier[] = [
  /* 0  */ { hitp: -4, shock: 20 },
  /* 1  */ { hitp: -3, shock: 25 },
  /* 2  */ { hitp: -2, shock: 30 },
  /* 3  */ { hitp: -2, shock: 35 },
  /* 4  */ { hitp: -1, shock: 40 },
  /* 5  */ { hitp: -1, shock: 45 },
  /* 6  */ { hitp: -1, shock: 50 },
  /* 7  */ { hitp:  0, shock: 55 },
  /* 8  */ { hitp:  0, shock: 60 },
  /* 9  */ { hitp:  0, shock: 65 },
  /* 10 */ { hitp:  0, shock: 70 },
  /* 11 */ { hitp:  0, shock: 75 },
  /* 12 */ { hitp:  0, shock: 80 },
  /* 13 */ { hitp:  0, shock: 85 },
  /* 14 */ { hitp:  0, shock: 88 },
  /* 15 */ { hitp:  1, shock: 90 },
  /* 16 */ { hitp:  2, shock: 95 },
  /* 17 */ { hitp:  3, shock: 97 },
  /* 18 */ { hitp:  4, shock: 99 },
  /* 19 */ { hitp:  5, shock: 99 },
  /* 20 */ { hitp:  6, shock: 99 },
  /* 21 */ { hitp:  7, shock: 99 },
  /* 22 */ { hitp:  8, shock: 99 },
  /* 23 */ { hitp:  9, shock: 99 },
  /* 24 */ { hitp: 10, shock: 99 },
  /* 25 */ { hitp: 11, shock: 99 },
];

/**
 * cha_app_type cha_app[26] — Charisma bonus table.
 * Fields: charm (charm/price modifier)
 */
const CHA_TABLE: ChaModifier[] = [
  /* 0  */ { charm: -60 },
  /* 1  */ { charm: -50 },
  /* 2  */ { charm: -50 },
  /* 3  */ { charm: -40 },
  /* 4  */ { charm: -30 },
  /* 5  */ { charm: -25 },
  /* 6  */ { charm: -20 },
  /* 7  */ { charm: -15 },
  /* 8  */ { charm: -10 },
  /* 9  */ { charm:  -5 },
  /* 10 */ { charm:   0 },
  /* 11 */ { charm:   0 },
  /* 12 */ { charm:   0 },
  /* 13 */ { charm:   0 },
  /* 14 */ { charm:   0 },
  /* 15 */ { charm:   5 },
  /* 16 */ { charm:   5 },
  /* 17 */ { charm:  10 },
  /* 18 */ { charm:  15 },
  /* 19 */ { charm:  20 },
  /* 20 */ { charm:  25 },
  /* 21 */ { charm:  30 },
  /* 22 */ { charm:  35 },
  /* 23 */ { charm:  40 },
  /* 24 */ { charm:  45 },
  /* 25 */ { charm:  50 },
];

/**
 * lck_app_type lck_app[26] — Luck bonus table.
 * Fields: luck (general luck modifier for random events)
 */
const LCK_TABLE: LckModifier[] = [
  /* 0  */ { luck: -60 },
  /* 1  */ { luck: -50 },
  /* 2  */ { luck: -50 },
  /* 3  */ { luck: -40 },
  /* 4  */ { luck: -30 },
  /* 5  */ { luck: -20 },
  /* 6  */ { luck: -10 },
  /* 7  */ { luck:  -5 },
  /* 8  */ { luck:   0 },
  /* 9  */ { luck:   0 },
  /* 10 */ { luck:   0 },
  /* 11 */ { luck:   0 },
  /* 12 */ { luck:   0 },
  /* 13 */ { luck:   0 },
  /* 14 */ { luck:   0 },
  /* 15 */ { luck:   5 },
  /* 16 */ { luck:   7 },
  /* 17 */ { luck:  10 },
  /* 18 */ { luck:  15 },
  /* 19 */ { luck:  20 },
  /* 20 */ { luck:  25 },
  /* 21 */ { luck:  30 },
  /* 22 */ { luck:  35 },
  /* 23 */ { luck:  40 },
  /* 24 */ { luck:  45 },
  /* 25 */ { luck:  50 },
];

// =============================================================================
// Lookup Tables Map
// =============================================================================

const STAT_TABLES: Record<string, readonly StatModifierResult[]> = {
  str: STR_TABLE,
  int: INT_TABLE,
  wis: WIS_TABLE,
  dex: DEX_TABLE,
  con: CON_TABLE,
  cha: CHA_TABLE,
  lck: LCK_TABLE,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Look up the bonus table entry for a given stat and value.
 * Values are clamped to [0, 25].
 *
 * @param stat - The stat name: 'str', 'int', 'wis', 'dex', 'con', 'cha', 'lck'
 * @param value - The effective stat value (perm + mod)
 * @returns The modifier object for that stat/value combination
 * @throws Error if stat name is not recognized
 */
export function getStatModifier(stat: string, value: number): StatModifierResult {
  const table = STAT_TABLES[stat.toLowerCase()];
  if (!table) {
    throw new Error(`Unknown stat: ${stat}`);
  }
  const clamped = Math.max(0, Math.min(25, value));
  return table[clamped]!;
}

/**
 * Type-safe lookup returning the specific modifier type.
 */
export function getStrModifier(value: number): StrModifier {
  return getStatModifier('str', value) as StrModifier;
}

export function getIntModifier(value: number): IntModifier {
  return getStatModifier('int', value) as IntModifier;
}

export function getWisModifier(value: number): WisModifier {
  return getStatModifier('wis', value) as WisModifier;
}

export function getDexModifier(value: number): DexModifier {
  return getStatModifier('dex', value) as DexModifier;
}

export function getConModifier(value: number): ConModifier {
  return getStatModifier('con', value) as ConModifier;
}

export function getChaModifier(value: number): ChaModifier {
  return getStatModifier('cha', value) as ChaModifier;
}

export function getLckModifier(value: number): LckModifier {
  return getStatModifier('lck', value) as LckModifier;
}
