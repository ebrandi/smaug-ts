/**
 * TrustLevels – Immortal trust level definitions.
 *
 * Defines the trust hierarchy and provides helper functions
 * for checking command access permissions.
 */

export const TRUST_LEVELS = {
  MORTAL: 0,
  AVATAR: 50,
  NEOPHYTE: 51,
  ACOLYTE: 52,
  CREATOR: 53,
  SAVANT: 54,
  DEMI_GOD: 55,
  LESSER_GOD: 56,
  GOD: 57,
  GREATER_GOD: 58,
  ASCENDANT: 59,
  SUB_IMPLEM: 60,
  IMPLEMENTOR: 61,
  ETERNAL: 62,
  INFINITE: 63,
  SUPREME: 65,
} as const;

export type TrustLevel = typeof TRUST_LEVELS[keyof typeof TRUST_LEVELS];

/** Whether the given trust level qualifies as immortal (>= 51). */
export function isImmortal(trust: number): boolean {
  return trust >= 51;
}

/** Whether the given trust level qualifies as hero/avatar (>= 50). */
export function isHero(trust: number): boolean {
  return trust >= 50;
}

/** Get the human-readable name for a trust level. */
export function getTrustName(trust: number): string {
  // Find the highest-matching name
  let bestName = 'Mortal';
  let bestValue = -1;

  for (const [name, value] of Object.entries(TRUST_LEVELS)) {
    if (value <= trust && value > bestValue) {
      bestValue = value;
      bestName = name;
    }
  }

  // Format the name nicely
  return bestName
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
