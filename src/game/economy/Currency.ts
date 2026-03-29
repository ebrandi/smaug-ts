/**
 * Currency.ts – Three-currency economy system for SMAUG 2.0.
 *
 * Fixed ratios: 1 gold = 100 silver = 10,000 copper.
 * Replicates legacy conv_currency() normalization and all currency
 * manipulation found throughout the C codebase.
 */

// =============================================================================
// Interface
// =============================================================================

export interface Currency {
  gold: number;
  silver: number;
  copper: number;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Convert a currency triple to total copper value.
 * gold * 10000 + silver * 100 + copper
 */
export function toCopper(c: Currency): number {
  return c.gold * 10000 + c.silver * 100 + c.copper;
}

/**
 * Normalize excess copper/silver upward.
 * E.g. 150 copper → 1 silver 50 copper.
 * Handles negative totals by clamping to zero.
 */
export function normalizeCurrency(c: Currency): Currency {
  let total = toCopper(c);
  if (total < 0) total = 0;
  const gold = Math.floor(total / 10000);
  total -= gold * 10000;
  const silver = Math.floor(total / 100);
  const copper = total - silver * 100;
  return { gold, silver, copper };
}

/**
 * Check if a currency amount can cover a copper-denominated cost.
 */
export function canAfford(c: Currency, costInCopper: number): boolean {
  return toCopper(c) >= costInCopper;
}

/**
 * Subtract a copper-denominated cost from currency, returning
 * the new normalized currency. Clamps to zero if insufficient.
 */
export function deductCost(c: Currency, costInCopper: number): Currency {
  const remaining = toCopper(c) - costInCopper;
  return normalizeCurrency({ gold: 0, silver: 0, copper: remaining });
}

/**
 * Add two currency values together, returning normalized result.
 */
export function addCurrency(a: Currency, b: Currency): Currency {
  return normalizeCurrency({
    gold: a.gold + b.gold,
    silver: a.silver + b.silver,
    copper: a.copper + b.copper,
  });
}

/**
 * Format a currency value for display.
 * Only includes non-zero denominations.
 * Returns "nothing" if all zero.
 */
export function formatCurrency(c: Currency): string {
  const parts: string[] = [];
  const normalized = normalizeCurrency(c);

  if (normalized.gold > 0) {
    parts.push(`${normalized.gold} gold`);
  }
  if (normalized.silver > 0) {
    parts.push(`${normalized.silver} silver`);
  }
  if (normalized.copper > 0) {
    parts.push(`${normalized.copper} copper`);
  }

  return parts.length > 0 ? parts.join(', ') : 'nothing';
}

/**
 * Factory function to create a Currency with defaults of 0.
 */
export function createCurrency(
  gold: number = 0,
  silver: number = 0,
  copper: number = 0,
): Currency {
  return { gold, silver, copper };
}
