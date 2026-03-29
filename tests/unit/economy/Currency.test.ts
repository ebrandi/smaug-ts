import { describe, it, expect } from 'vitest';
import {
  toCopper,
  normalizeCurrency,
  canAfford,
  deductCost,
  addCurrency,
  formatCurrency,
  createCurrency,
  type Currency,
} from '../../../src/game/economy/Currency.js';

// =============================================================================
// toCopper
// =============================================================================

describe('toCopper', () => {
  it('converts zero currency to 0', () => {
    expect(toCopper({ gold: 0, silver: 0, copper: 0 })).toBe(0);
  });

  it('converts gold only', () => {
    expect(toCopper({ gold: 1, silver: 0, copper: 0 })).toBe(10000);
  });

  it('converts silver only', () => {
    expect(toCopper({ gold: 0, silver: 1, copper: 0 })).toBe(100);
  });

  it('converts copper only', () => {
    expect(toCopper({ gold: 0, silver: 0, copper: 50 })).toBe(50);
  });

  it('converts mixed currency', () => {
    expect(toCopper({ gold: 3, silver: 2, copper: 15 })).toBe(30215);
  });

  it('handles large values', () => {
    expect(toCopper({ gold: 100, silver: 99, copper: 99 })).toBe(1009999);
  });
});

// =============================================================================
// normalizeCurrency
// =============================================================================

describe('normalizeCurrency', () => {
  it('normalizes already-normal currency unchanged', () => {
    const c = normalizeCurrency({ gold: 3, silver: 50, copper: 25 });
    expect(c).toEqual({ gold: 3, silver: 50, copper: 25 });
  });

  it('promotes 150 copper to 1 silver 50 copper', () => {
    const c = normalizeCurrency({ gold: 0, silver: 0, copper: 150 });
    expect(c).toEqual({ gold: 0, silver: 1, copper: 50 });
  });

  it('promotes 150 silver to 1 gold 50 silver', () => {
    const c = normalizeCurrency({ gold: 0, silver: 150, copper: 0 });
    expect(c).toEqual({ gold: 1, silver: 50, copper: 0 });
  });

  it('cascades promotion: 10050 copper = 1 gold 0 silver 50 copper', () => {
    const c = normalizeCurrency({ gold: 0, silver: 0, copper: 10050 });
    expect(c).toEqual({ gold: 1, silver: 0, copper: 50 });
  });

  it('handles zero currency', () => {
    const c = normalizeCurrency({ gold: 0, silver: 0, copper: 0 });
    expect(c).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it('clamps negative totals to zero', () => {
    const c = normalizeCurrency({ gold: -1, silver: 0, copper: 0 });
    expect(c).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it('normalizes mixed overflow', () => {
    const c = normalizeCurrency({ gold: 1, silver: 200, copper: 350 });
    // total = 10000 + 20000 + 350 = 30350
    // gold = 3, silver = 3, copper = 50
    expect(c).toEqual({ gold: 3, silver: 3, copper: 50 });
  });
});

// =============================================================================
// canAfford
// =============================================================================

describe('canAfford', () => {
  it('can afford when exact match', () => {
    expect(canAfford({ gold: 1, silver: 0, copper: 0 }, 10000)).toBe(true);
  });

  it('can afford when surplus', () => {
    expect(canAfford({ gold: 2, silver: 0, copper: 0 }, 10000)).toBe(true);
  });

  it('cannot afford when insufficient', () => {
    expect(canAfford({ gold: 0, silver: 99, copper: 99 }, 10000)).toBe(false);
  });

  it('can afford zero cost', () => {
    expect(canAfford({ gold: 0, silver: 0, copper: 0 }, 0)).toBe(true);
  });

  it('mixed denominations cover cost', () => {
    // 1 gold + 50 silver + 75 copper = 15075 copper
    expect(canAfford({ gold: 1, silver: 50, copper: 75 }, 15075)).toBe(true);
    expect(canAfford({ gold: 1, silver: 50, copper: 75 }, 15076)).toBe(false);
  });
});

// =============================================================================
// deductCost
// =============================================================================

describe('deductCost', () => {
  it('deducts exact cost', () => {
    const result = deductCost({ gold: 1, silver: 0, copper: 0 }, 10000);
    expect(result).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it('deducts partial cost with change', () => {
    const result = deductCost({ gold: 1, silver: 0, copper: 0 }, 5000);
    // 10000 - 5000 = 5000 copper = 0 gold, 50 silver, 0 copper
    expect(result).toEqual({ gold: 0, silver: 50, copper: 0 });
  });

  it('deducts small amount from mixed currency', () => {
    const result = deductCost({ gold: 3, silver: 2, copper: 15 }, 215);
    // 30215 - 215 = 30000 = 3 gold
    expect(result).toEqual({ gold: 3, silver: 0, copper: 0 });
  });

  it('clamps to zero when cost exceeds total', () => {
    const result = deductCost({ gold: 0, silver: 0, copper: 50 }, 100);
    expect(result).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it('handles zero cost', () => {
    const result = deductCost({ gold: 5, silver: 10, copper: 20 }, 0);
    expect(result).toEqual({ gold: 5, silver: 10, copper: 20 });
  });
});

// =============================================================================
// addCurrency
// =============================================================================

describe('addCurrency', () => {
  it('adds two zero currencies', () => {
    const result = addCurrency(
      { gold: 0, silver: 0, copper: 0 },
      { gold: 0, silver: 0, copper: 0 },
    );
    expect(result).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it('adds simple currencies', () => {
    const result = addCurrency(
      { gold: 1, silver: 2, copper: 3 },
      { gold: 4, silver: 5, copper: 6 },
    );
    expect(result).toEqual({ gold: 5, silver: 7, copper: 9 });
  });

  it('normalizes overflow on addition', () => {
    const result = addCurrency(
      { gold: 0, silver: 0, copper: 80 },
      { gold: 0, silver: 0, copper: 70 },
    );
    // 150 copper = 1 silver 50 copper
    expect(result).toEqual({ gold: 0, silver: 1, copper: 50 });
  });

  it('normalizes cascading overflow', () => {
    const result = addCurrency(
      { gold: 0, silver: 99, copper: 99 },
      { gold: 0, silver: 1, copper: 1 },
    );
    // total = 9999 + 101 = 10100 copper = 1 gold, 1 silver, 0 copper
    expect(result).toEqual({ gold: 1, silver: 1, copper: 0 });
  });
});

// =============================================================================
// formatCurrency
// =============================================================================

describe('formatCurrency', () => {
  it('formats zero as "nothing"', () => {
    expect(formatCurrency({ gold: 0, silver: 0, copper: 0 })).toBe('nothing');
  });

  it('formats gold only', () => {
    expect(formatCurrency({ gold: 5, silver: 0, copper: 0 })).toBe('5 gold');
  });

  it('formats silver only', () => {
    expect(formatCurrency({ gold: 0, silver: 10, copper: 0 })).toBe('10 silver');
  });

  it('formats copper only', () => {
    expect(formatCurrency({ gold: 0, silver: 0, copper: 25 })).toBe('25 copper');
  });

  it('formats mixed currency', () => {
    expect(formatCurrency({ gold: 3, silver: 2, copper: 15 })).toBe('3 gold, 2 silver, 15 copper');
  });

  it('formats gold and copper without silver', () => {
    expect(formatCurrency({ gold: 1, silver: 0, copper: 50 })).toBe('1 gold, 50 copper');
  });

  it('normalizes before formatting', () => {
    // 250 copper = 2 silver 50 copper
    expect(formatCurrency({ gold: 0, silver: 0, copper: 250 })).toBe('2 silver, 50 copper');
  });
});

// =============================================================================
// createCurrency
// =============================================================================

describe('createCurrency', () => {
  it('creates zero currency by default', () => {
    expect(createCurrency()).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it('creates currency with gold only', () => {
    expect(createCurrency(5)).toEqual({ gold: 5, silver: 0, copper: 0 });
  });

  it('creates currency with all denominations', () => {
    expect(createCurrency(3, 2, 15)).toEqual({ gold: 3, silver: 2, copper: 15 });
  });

  it('creates currency with silver and copper', () => {
    expect(createCurrency(0, 50, 75)).toEqual({ gold: 0, silver: 50, copper: 75 });
  });
});
