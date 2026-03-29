/**
 * Dice - Dice rolling and parsing utilities for SMAUG 2.0
 *
 * Provides dice rolling (NdS), random integer ranges, and
 * dice string parsing ("3d8+10").
 */

/**
 * Roll `numDice` dice each with `sizeDice` sides.
 * Returns the sum of all rolls.
 *
 * @param numDice - Number of dice to roll (must be >= 1)
 * @param sizeDice - Number of sides per die (must be >= 1)
 * @returns Sum of all dice rolls, in range [numDice, numDice * sizeDice]
 */
export function rollDice(numDice: number, sizeDice: number): number {
  if (numDice < 1) numDice = 1;
  if (sizeDice < 1) sizeDice = 1;

  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * sizeDice) + 1;
  }
  return total;
}

/**
 * Return a random integer in [low, high] inclusive.
 * Matches legacy number_range() from dice.c.
 *
 * @param low - Lower bound (inclusive)
 * @param high - Upper bound (inclusive)
 * @returns Random integer in [low, high]
 */
export function numberRange(low: number, high: number): number {
  if (low > high) {
    [low, high] = [high, low];
  }
  return low + Math.floor(Math.random() * (high - low + 1));
}

/**
 * Return a random integer from 1 to 100 inclusive.
 * Legacy equivalent: number_percent() from dice.c.
 *
 * @returns Random integer in [1, 100]
 */
export function numberPercent(): number {
  return Math.floor(Math.random() * 100) + 1;
}

/**
 * Return a random number using the given bit width.
 * Generates a random value masked to `width` bits.
 * Legacy equivalent: number_bits() from dice.c.
 *
 * @param width - Number of bits to use
 * @returns Random integer in [0, (1 << width) - 1]
 */
export function numberBits(width: number): number {
  if (width <= 0) return 0;
  if (width >= 30) width = 30; // Stay within safe 32-bit integer range
  const mask = (1 << width) - 1;
  return Math.floor(Math.random() * (mask + 1));
}

/**
 * Return number-1, number, or number+1 randomly.
 * Legacy equivalent: number_fuzzy() from dice.c.
 *
 * @param number - The base number
 * @returns number-1, number, or number+1 with equal probability
 */
export function numberFuzzy(number: number): number {
  return number + Math.floor(Math.random() * 3) - 1;
}

/** Parsed dice expression result. */
export interface DiceExpression {
  numDice: number;
  sizeDice: number;
  bonus: number;
}

/**
 * Parse a dice string like "3d8+10" or "2d6-3" into components.
 *
 * Supported formats:
 *   - "3d8"     → { numDice: 3, sizeDice: 8, bonus: 0 }
 *   - "3d8+10"  → { numDice: 3, sizeDice: 8, bonus: 10 }
 *   - "3d8-5"   → { numDice: 3, sizeDice: 8, bonus: -5 }
 *   - "10"      → { numDice: 0, sizeDice: 0, bonus: 10 }
 *
 * @param str - Dice expression string
 * @returns Parsed DiceExpression, or null if parsing fails
 */
export function parseDiceString(str: string): DiceExpression | null {
  const trimmed = str.trim().toLowerCase();
  if (trimmed.length === 0) return null;

  // Try NdS+B or NdS-B or NdS
  const diceRegex = /^(\d+)d(\d+)(?:([+-])(\d+))?$/;
  const match = trimmed.match(diceRegex);

  if (match) {
    const numDice = parseInt(match[1]!, 10);
    const sizeDice = parseInt(match[2]!, 10);
    let bonus = 0;
    if (match[3] && match[4]) {
      bonus = parseInt(match[4]!, 10);
      if (match[3] === '-') bonus = -bonus;
    }
    return { numDice, sizeDice, bonus };
  }

  // Try plain number
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    return { numDice: 0, sizeDice: 0, bonus: num };
  }

  return null;
}
