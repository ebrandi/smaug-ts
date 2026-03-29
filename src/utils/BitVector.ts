/**
 * BitVector - Bigint-based flag operations for SMAUG 2.0
 *
 * All bitvector operations use bigint to support flag fields
 * exceeding 32 bits (e.g., affected_by with 32+ flags).
 */

/**
 * Check if a specific flag is set in the flags bitvector.
 *
 * @param flags - The bitvector to check
 * @param flag - The flag bit(s) to test
 * @returns true if all bits in `flag` are set in `flags`
 */
export function hasFlag(flags: bigint, flag: bigint): boolean {
  return (flags & flag) === flag;
}

/**
 * Set a flag in the bitvector (bitwise OR).
 *
 * @param flags - The current bitvector
 * @param flag - The flag bit(s) to set
 * @returns New bitvector with the flag set
 */
export function setFlag(flags: bigint, flag: bigint): bigint {
  return flags | flag;
}

/**
 * Remove a flag from the bitvector (bitwise AND NOT).
 *
 * @param flags - The current bitvector
 * @param flag - The flag bit(s) to remove
 * @returns New bitvector with the flag cleared
 */
export function removeFlag(flags: bigint, flag: bigint): bigint {
  return flags & ~flag;
}

/**
 * Toggle a flag in the bitvector (bitwise XOR).
 *
 * @param flags - The current bitvector
 * @param flag - The flag bit(s) to toggle
 * @returns New bitvector with the flag toggled
 */
export function toggleFlag(flags: bigint, flag: bigint): bigint {
  return flags ^ flag;
}

/**
 * Convert a bitvector to an array of flag names by checking each
 * entry in a mapping object.
 *
 * @param flags - The bitvector to decompose
 * @param mapping - Object mapping flag names to bigint values
 * @returns Array of flag names that are set in the bitvector
 */
export function flagsToArray(
  flags: bigint,
  mapping: Record<string, bigint>
): string[] {
  const result: string[] = [];
  for (const [name, value] of Object.entries(mapping)) {
    if ((flags & value) === value && value !== 0n) {
      result.push(name);
    }
  }
  return result;
}

/**
 * Convert an array of flag names back to a bigint bitvector.
 * Reverse of flagsToArray.
 *
 * @param names - Array of flag name strings
 * @param flagMap - Object mapping flag names to bigint values
 * @returns Combined bitvector with all named flags set
 */
export function arrayToFlags(names: string[], flagMap: Record<string, bigint>): bigint {
  let result = 0n;
  for (const name of names) {
    const value = flagMap[name];
    if (value !== undefined) {
      result |= value;
    }
  }
  return result;
}

/**
 * Parse a string of flag names (space or pipe separated) into a bigint bitvector.
 * Also handles numeric values for legacy compatibility.
 *
 * Examples:
 *   "SANCTUARY INVISIBLE"  → combined bigint
 *   "SANCTUARY|INVISIBLE"  → combined bigint
 *   "384"                  → BigInt(384)
 *
 * @param str - String containing flag names or a numeric value
 * @param flagMap - Object mapping flag names to bigint values
 * @returns Combined bitvector
 */
export function parseFlagString(str: string, flagMap: Record<string, bigint>): bigint {
  const trimmed = str.trim();
  if (trimmed.length === 0) return 0n;

  // Try as numeric value first
  if (/^-?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }

  // Split on spaces or pipes
  const names = trimmed.split(/[\s|]+/).filter(n => n.length > 0);
  return arrayToFlags(names, flagMap);
}
