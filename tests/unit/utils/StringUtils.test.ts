import { describe, it, expect } from 'vitest';
import {
  isName, isNamePrefix, oneArgument, strPrefix,
  smashTilde, capitalize, numberArgument, formatString, isNumber
} from '../../../src/utils/StringUtils.js';

describe('isName', () => {
  it('should find exact match in namelist', () => {
    expect(isName('sword', 'long sword weapon')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isName('SWORD', 'long sword weapon')).toBe(true);
    expect(isName('Sword', 'long SWORD weapon')).toBe(true);
  });

  it('should return false for non-matching name', () => {
    expect(isName('shield', 'long sword weapon')).toBe(false);
  });

  it('should return false for prefix-only match', () => {
    expect(isName('swo', 'long sword weapon')).toBe(false);
  });

  it('should return false for empty str', () => {
    expect(isName('', 'long sword weapon')).toBe(false);
  });

  it('should return false for empty namelist', () => {
    expect(isName('sword', '')).toBe(false);
  });
});

describe('isNamePrefix', () => {
  it('should match prefix of keyword', () => {
    expect(isNamePrefix('swo', 'long sword weapon')).toBe(true);
  });

  it('should match exact keyword', () => {
    expect(isNamePrefix('sword', 'long sword weapon')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isNamePrefix('SWO', 'long sword weapon')).toBe(true);
  });

  it('should return false for non-matching prefix', () => {
    expect(isNamePrefix('shi', 'long sword weapon')).toBe(false);
  });

  it('should return false for empty str', () => {
    expect(isNamePrefix('', 'long sword weapon')).toBe(false);
  });
});

describe('oneArgument', () => {
  it('should split on first space', () => {
    expect(oneArgument('hello world')).toEqual(['hello', 'world']);
  });

  it('should handle single word', () => {
    expect(oneArgument('hello')).toEqual(['hello', '']);
  });

  it('should handle empty string', () => {
    expect(oneArgument('')).toEqual(['', '']);
  });

  it('should handle leading spaces', () => {
    expect(oneArgument('  hello world')).toEqual(['hello', 'world']);
  });

  it('should handle single-quoted multi-word argument', () => {
    expect(oneArgument("'magic missile' goblin")).toEqual(['magic missile', 'goblin']);
  });

  it('should handle double-quoted multi-word argument', () => {
    expect(oneArgument('"magic missile" goblin')).toEqual(['magic missile', 'goblin']);
  });

  it('should handle quoted argument with no remainder', () => {
    expect(oneArgument("'magic missile'")).toEqual(['magic missile', '']);
  });

  it('should handle unclosed quote', () => {
    const [first, rest] = oneArgument("'magic missile");
    expect(first).toBe('magic missile');
    expect(rest).toBe('');
  });

  it('should trim remainder', () => {
    expect(oneArgument('hello   world')).toEqual(['hello', 'world']);
  });
});

describe('strPrefix', () => {
  it('should return true for valid prefix', () => {
    expect(strPrefix('hel', 'hello')).toBe(true);
  });

  it('should return true for exact match', () => {
    expect(strPrefix('hello', 'hello')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(strPrefix('HEL', 'hello')).toBe(true);
    expect(strPrefix('hel', 'HELLO')).toBe(true);
  });

  it('should return false when prefix is longer', () => {
    expect(strPrefix('helloo', 'hello')).toBe(false);
  });

  it('should return false for empty prefix', () => {
    expect(strPrefix('', 'hello')).toBe(false);
  });

  it('should return false for non-matching prefix', () => {
    expect(strPrefix('wor', 'hello')).toBe(false);
  });
});

describe('smashTilde', () => {
  it('should replace tildes with dashes', () => {
    expect(smashTilde('hello~world')).toBe('hello-world');
  });

  it('should replace multiple tildes', () => {
    expect(smashTilde('a~b~c')).toBe('a-b-c');
  });

  it('should return unchanged text without tildes', () => {
    expect(smashTilde('hello')).toBe('hello');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('should not change already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should preserve rest of string', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });
});

describe('numberArgument', () => {
  it('should parse "2.sword"', () => {
    expect(numberArgument('2.sword')).toEqual({ number: 2, keyword: 'sword' });
  });

  it('should return number 0 without dot', () => {
    expect(numberArgument('sword')).toEqual({ number: 0, keyword: 'sword' });
  });

  it('should parse "1.potion"', () => {
    expect(numberArgument('1.potion')).toEqual({ number: 1, keyword: 'potion' });
  });

  it('should handle non-numeric prefix', () => {
    expect(numberArgument('abc.sword')).toEqual({ number: 0, keyword: 'abc.sword' });
  });

  it('should handle "3." with empty keyword', () => {
    expect(numberArgument('3.')).toEqual({ number: 3, keyword: '' });
  });
});

describe('formatString', () => {
  it('should capitalize and add newline', () => {
    expect(formatString('hello world')).toBe('Hello world\n');
  });

  it('should not double newline', () => {
    expect(formatString('hello\n')).toBe('Hello\n');
  });

  it('should handle empty string', () => {
    expect(formatString('')).toBe('\n');
  });
});

describe('isNumber', () => {
  it('should return true for positive integers', () => {
    expect(isNumber('42')).toBe(true);
  });

  it('should return true for negative integers', () => {
    expect(isNumber('-7')).toBe(true);
  });

  it('should return false for non-numeric', () => {
    expect(isNumber('abc')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isNumber('')).toBe(false);
  });
});
