import { describe, it, expect } from 'vitest';
import {
  hasFlag, setFlag, removeFlag, toggleFlag,
  flagsToArray, arrayToFlags, parseFlagString
} from '../../../src/utils/BitVector.js';

const TEST_FLAGS: Record<string, bigint> = {
  SANCTUARY: 1n << 0n,
  INVISIBLE: 1n << 1n,
  DETECT_EVIL: 1n << 2n,
  DETECT_INVIS: 1n << 3n,
  FLY: 1n << 4n,
};

describe('hasFlag', () => {
  it('should return true when flag is set', () => {
    expect(hasFlag(3n, 1n)).toBe(true);
  });

  it('should return false when flag is not set', () => {
    expect(hasFlag(2n, 1n)).toBe(false);
  });

  it('should handle zero flags', () => {
    expect(hasFlag(0n, 0n)).toBe(true);
  });

  it('should handle high bit flags', () => {
    const highBit = 1n << 40n;
    expect(hasFlag(highBit, highBit)).toBe(true);
    expect(hasFlag(0n, highBit)).toBe(false);
  });
});

describe('setFlag', () => {
  it('should set a new flag', () => {
    expect(setFlag(0n, 1n)).toBe(1n);
  });

  it('should keep existing flags', () => {
    expect(setFlag(1n, 2n)).toBe(3n);
  });
});

describe('removeFlag', () => {
  it('should remove a flag', () => {
    expect(removeFlag(3n, 1n)).toBe(2n);
  });

  it('should do nothing if flag not set', () => {
    expect(removeFlag(2n, 1n)).toBe(2n);
  });
});

describe('toggleFlag', () => {
  it('should set flag if not present', () => {
    expect(toggleFlag(0n, 1n)).toBe(1n);
  });

  it('should clear flag if present', () => {
    expect(toggleFlag(1n, 1n)).toBe(0n);
  });
});

describe('flagsToArray', () => {
  it('should return matching flag names', () => {
    const flags = TEST_FLAGS.SANCTUARY! | TEST_FLAGS.FLY!;
    const result = flagsToArray(flags, TEST_FLAGS);
    expect(result).toContain('SANCTUARY');
    expect(result).toContain('FLY');
    expect(result).not.toContain('INVISIBLE');
  });

  it('should return empty array for 0n', () => {
    expect(flagsToArray(0n, TEST_FLAGS)).toEqual([]);
  });
});

describe('arrayToFlags', () => {
  it('should convert flag names to bigint', () => {
    const result = arrayToFlags(['SANCTUARY', 'FLY'], TEST_FLAGS);
    expect(result).toBe(TEST_FLAGS.SANCTUARY! | TEST_FLAGS.FLY!);
  });

  it('should return 0n for empty array', () => {
    expect(arrayToFlags([], TEST_FLAGS)).toBe(0n);
  });

  it('should skip unknown flag names', () => {
    const result = arrayToFlags(['SANCTUARY', 'BOGUS'], TEST_FLAGS);
    expect(result).toBe(TEST_FLAGS.SANCTUARY!);
  });

  it('should round-trip with flagsToArray', () => {
    const original = TEST_FLAGS.SANCTUARY! | TEST_FLAGS.INVISIBLE! | TEST_FLAGS.FLY!;
    const names = flagsToArray(original, TEST_FLAGS);
    const roundTripped = arrayToFlags(names, TEST_FLAGS);
    expect(roundTripped).toBe(original);
  });
});

describe('parseFlagString', () => {
  it('should parse space-separated flag names', () => {
    const result = parseFlagString('SANCTUARY INVISIBLE', TEST_FLAGS);
    expect(result).toBe(TEST_FLAGS.SANCTUARY! | TEST_FLAGS.INVISIBLE!);
  });

  it('should parse pipe-separated flag names', () => {
    const result = parseFlagString('SANCTUARY|FLY', TEST_FLAGS);
    expect(result).toBe(TEST_FLAGS.SANCTUARY! | TEST_FLAGS.FLY!);
  });

  it('should parse numeric string', () => {
    const result = parseFlagString('384', TEST_FLAGS);
    expect(result).toBe(384n);
  });

  it('should return 0n for empty string', () => {
    expect(parseFlagString('', TEST_FLAGS)).toBe(0n);
  });

  it('should handle mixed separators', () => {
    const result = parseFlagString('SANCTUARY INVISIBLE|FLY', TEST_FLAGS);
    expect(result).toBe(TEST_FLAGS.SANCTUARY! | TEST_FLAGS.INVISIBLE! | TEST_FLAGS.FLY!);
  });

  it('should skip unknown names gracefully', () => {
    const result = parseFlagString('SANCTUARY BOGUS', TEST_FLAGS);
    expect(result).toBe(TEST_FLAGS.SANCTUARY!);
  });
});
