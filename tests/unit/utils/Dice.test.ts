import { describe, it, expect } from 'vitest';
import {
  rollDice, numberRange, parseDiceString,
  numberPercent, numberBits, numberFuzzy
} from '../../../src/utils/Dice.js';

describe('rollDice', () => {
  it('should return a value in the correct range for 3d6', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDice(3, 6);
      expect(result).toBeGreaterThanOrEqual(3);
      expect(result).toBeLessThanOrEqual(18);
    }
  });

  it('should return 1 for 1d1', () => {
    expect(rollDice(1, 1)).toBe(1);
  });

  it('should handle numDice < 1 by treating as 1', () => {
    const result = rollDice(0, 6);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(6);
  });

  it('should handle sizeDice < 1 by treating as 1', () => {
    const result = rollDice(3, 0);
    expect(result).toBe(3);
  });
});

describe('numberRange', () => {
  it('should return a value in [low, high]', () => {
    for (let i = 0; i < 100; i++) {
      const result = numberRange(5, 10);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('should handle swapped arguments', () => {
    for (let i = 0; i < 100; i++) {
      const result = numberRange(10, 5);
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(10);
    }
  });

  it('should return exact value when low == high', () => {
    expect(numberRange(7, 7)).toBe(7);
  });
});

describe('parseDiceString', () => {
  it('should parse "3d8+10"', () => {
    const result = parseDiceString('3d8+10');
    expect(result).toEqual({ numDice: 3, sizeDice: 8, bonus: 10 });
  });

  it('should parse "2d6-3"', () => {
    const result = parseDiceString('2d6-3');
    expect(result).toEqual({ numDice: 2, sizeDice: 6, bonus: -3 });
  });

  it('should parse "1d20"', () => {
    const result = parseDiceString('1d20');
    expect(result).toEqual({ numDice: 1, sizeDice: 20, bonus: 0 });
  });

  it('should parse plain number "10"', () => {
    const result = parseDiceString('10');
    expect(result).toEqual({ numDice: 0, sizeDice: 0, bonus: 10 });
  });

  it('should return null for empty string', () => {
    expect(parseDiceString('')).toBeNull();
  });

  it('should return null for invalid string', () => {
    expect(parseDiceString('abc')).toBeNull();
  });
});

describe('numberPercent', () => {
  it('should return values between 1 and 100', () => {
    for (let i = 0; i < 200; i++) {
      const result = numberPercent();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    }
  });

  it('should return integers', () => {
    for (let i = 0; i < 50; i++) {
      const result = numberPercent();
      expect(Number.isInteger(result)).toBe(true);
    }
  });
});

describe('numberBits', () => {
  it('should return 0 for width 0', () => {
    expect(numberBits(0)).toBe(0);
  });

  it('should return 0 or 1 for width 1', () => {
    for (let i = 0; i < 50; i++) {
      const result = numberBits(1);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it('should return values in correct range for width 4', () => {
    for (let i = 0; i < 100; i++) {
      const result = numberBits(4);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(15);
    }
  });

  it('should return values in correct range for width 8', () => {
    for (let i = 0; i < 100; i++) {
      const result = numberBits(8);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(255);
    }
  });

  it('should handle large widths safely', () => {
    for (let i = 0; i < 50; i++) {
      const result = numberBits(30);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1073741823);
    }
  });
});

describe('numberFuzzy', () => {
  it('should return number-1, number, or number+1', () => {
    const results = new Set<number>();
    for (let i = 0; i < 200; i++) {
      results.add(numberFuzzy(10));
    }
    // With 200 iterations, all three values should appear
    expect(results.has(9)).toBe(true);
    expect(results.has(10)).toBe(true);
    expect(results.has(11)).toBe(true);
    expect(results.size).toBe(3);
  });

  it('should work with 0', () => {
    for (let i = 0; i < 50; i++) {
      const result = numberFuzzy(0);
      expect(result).toBeGreaterThanOrEqual(-1);
      expect(result).toBeLessThanOrEqual(1);
    }
  });

  it('should work with negative numbers', () => {
    for (let i = 0; i < 50; i++) {
      const result = numberFuzzy(-5);
      expect(result).toBeGreaterThanOrEqual(-6);
      expect(result).toBeLessThanOrEqual(-4);
    }
  });
});
