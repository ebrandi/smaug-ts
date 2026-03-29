/**
 * DamageCalculator – Damage computation, severity messages, and modifier lookups.
 *
 * Provides:
 *   - getDamageMessage(): severity descriptor from damage amount
 *   - calcThac0(): class-based THAC0 calculation
 *   - calcDamageBonus(): strength-based damage bonus table
 *   - calcHitBonus(): strength-based hit bonus table
 *   - checkImmune(): immune/resistant/susceptible multiplier
 *
 * Mirrors legacy SMAUG damage tables and class progression.
 */

import type { Character } from '../entities/Character.js';
import { DamageType } from '../entities/types.js';
import { hasFlag } from '../../utils/BitVector.js';

// =============================================================================
// Damage severity messages (legacy exact thresholds)
// =============================================================================

/**
 * Damage severity table.
 * Each entry: [maxDamageInclusive, message].
 * Ordered ascending — first match wins.
 */
const DAMAGE_MESSAGES: ReadonlyArray<readonly [number, string]> = [
  [0,    'miss'],
  [4,    'scratch'],
  [8,    'graze'],
  [14,   'hit'],
  [22,   'injure'],
  [32,   'wound'],
  [44,   'maul'],
  [58,   'decimate'],
  [74,   'devastate'],
  [99,   'maim'],
  [139,  'MUTILATE'],
  [199,  'DISEMBOWEL'],
  [299,  'DISMEMBER'],
  [499,  'MASSACRE'],
  [749,  'MANGLE'],
  [1199, '*** DEMOLISH ***'],
  [1599, '*** ANNIHILATE ***'],
] as const;

/** Fallback for damage above the highest threshold. */
const MAX_DAMAGE_MESSAGE = '=== OBLITERATE ===';

// =============================================================================
// Strength tables (legacy str_app)
// =============================================================================

/** Strength → damage bonus (indices 0..25). */
const STR_DAMAGE_BONUS: readonly number[] = [
  -4, -4, -3, -3, -2, -2, -1, -1, 0, 0,  // 0-9
   0,  0,  0,  0,  0,  1,  1,  2, 2, 3,  // 10-19
   3,  4,  5,  6,  7,  8,                 // 20-25
];

/** Strength → hit bonus (indices 0..25). */
const STR_HIT_BONUS: readonly number[] = [
  -5, -5, -4, -4, -3, -3, -2, -2, -1, -1, // 0-9
   0,  0,  0,  0,  0,  0,  0,  1,  1,  2, // 10-19
   2,  3,  3,  4,  4,  5,                  // 20-25
];

// =============================================================================
// Damage type bitvectors for immunity/resistance/susceptibility
// =============================================================================

/**
 * Maps DamageType enum → bigint flag for immune/resistant/susceptible checks.
 * In legacy SMAUG, the RIS flags use bits 0..17 mirroring the damage types.
 */
const DAMAGE_TYPE_FLAGS: Readonly<Record<number, bigint>> = {
  [DamageType.Hit]:     1n << 0n,
  [DamageType.Slice]:   1n << 1n,
  [DamageType.Stab]:    1n << 2n,
  [DamageType.Slash]:   1n << 3n,
  [DamageType.Whip]:    1n << 4n,
  [DamageType.Claw]:    1n << 5n,
  [DamageType.Blast]:   1n << 6n,
  [DamageType.Pound]:   1n << 7n,
  [DamageType.Crush]:   1n << 8n,
  [DamageType.Grep]:    1n << 9n,
  [DamageType.Bite]:    1n << 10n,
  [DamageType.Pierce]:  1n << 11n,
  [DamageType.Suction]: 1n << 12n,
  [DamageType.Bolt]:    1n << 13n,
  [DamageType.Arrow]:   1n << 14n,
  [DamageType.Dart]:    1n << 15n,
  [DamageType.Stone]:   1n << 16n,
  [DamageType.Thrust]:  1n << 17n,
};

// =============================================================================
// DamageCalculator
// =============================================================================

export class DamageCalculator {
  /**
   * Return a severity descriptor for the given damage amount.
   * 0 → "miss", 1-4 → "scratch", ... 1600+ → "=== OBLITERATE ==="
   */
  getDamageMessage(damage: number): string {
    for (const [threshold, message] of DAMAGE_MESSAGES) {
      if (damage <= threshold) return message;
    }
    return MAX_DAMAGE_MESSAGE;
  }

  /**
   * Calculate THAC0 (To Hit Armor Class 0) for a character.
   *
   * Base depends on class, then reduced by level progression and hitroll.
   */
  calcThac0(ch: Character): number {
    let base: number;

    // Class-based starting THAC0 (warriors best, mages worst)
    switch (ch.class_.toLowerCase()) {
      case 'warrior':
      case 'ranger':
      case 'paladin':
        base = 18;
        break;
      case 'thief':
      case 'vampire':
        base = 19;
        break;
      case 'cleric':
      case 'druid':
        base = 20;
        break;
      case 'mage':
      case 'augurer':
        base = 21;
        break;
      default:
        base = 20;
        break;
    }

    // Level-based improvement
    const levelBonus = Math.floor(ch.level * 0.75);

    // hitroll from equipment/affects/damroll stat
    return base - levelBonus - ch.hitroll - this.calcHitBonus(ch);
  }

  /**
   * Strength-based damage bonus.
   * @returns bonus damage from strength (can be negative for low str).
   */
  calcDamageBonus(ch: Character): number {
    const str = Math.min(25, Math.max(0, ch.getStat('str')));
    return STR_DAMAGE_BONUS[str] ?? 0;
  }

  /**
   * Strength-based hit bonus.
   * @returns bonus to-hit from strength (can be negative for low str).
   */
  calcHitBonus(ch: Character): number {
    const str = Math.min(25, Math.max(0, ch.getStat('str')));
    return STR_HIT_BONUS[str] ?? 0;
  }

  /**
   * Check immunity/resistance/susceptibility for a damage type.
   *
   * @returns Multiplier: 0 = immune, 0.5 = resistant, 2 = susceptible, 1 = normal.
   */
  checkImmune(victim: Character, damType: DamageType): number {
    const flag = DAMAGE_TYPE_FLAGS[damType];
    if (flag === undefined) return 1;

    // Immune takes priority
    if (hasFlag(victim.immune, flag)) return 0;

    // Resistant
    if (hasFlag(victim.resistant, flag)) return 0.5;

    // Susceptible
    if (hasFlag(victim.susceptible, flag)) return 2;

    return 1;
  }
}
