import { describe, it, expect } from 'vitest';
import {
  colorize, colorStrlen, stripColor,
  padRight, padCenter, wordWrap
} from '../../../src/utils/AnsiColors.js';

describe('colorize', () => {
  it('should convert &R to bold red ANSI', () => {
    const result = colorize('&RHello');
    expect(result).toBe('\x1b[1;31mHello\x1b[0m');
  });

  it('should convert &g to green ANSI', () => {
    const result = colorize('&gWorld');
    expect(result).toBe('\x1b[0;32mWorld\x1b[0m');
  });

  it('should strip codes when ansiEnabled is false', () => {
    const result = colorize('&RHello &gWorld', false);
    expect(result).toBe('Hello World');
  });

  it('should handle multiple adjacent colour codes', () => {
    const result = colorize('&R&gTest');
    expect(result).toBe('\x1b[1;31m\x1b[0;32mTest\x1b[0m');
  });

  it('should handle nested colour codes in text', () => {
    const result = colorize('&RHello &Yworld &xdone');
    expect(result).toContain('\x1b[1;31m');
    expect(result).toContain('Hello ');
    expect(result).toContain('\x1b[1;33m');
    expect(result).toContain('world ');
    expect(result).toContain('\x1b[0m');
  });

  it('should return text unchanged if no colour codes present', () => {
    const result = colorize('Hello World');
    expect(result).toBe('Hello World');
  });

  it('should handle reset codes &D and &d', () => {
    const result = colorize('&Dtest&dtest');
    expect(result).toBe('\x1b[0mtest\x1b[0mtest\x1b[0m');
  });

  it('should handle all normal intensity codes', () => {
    const text = '&x&r&g&O&b&p&c&w';
    const result = colorize(text);
    expect(result).toContain('\x1b[0m');
    expect(result).toContain('\x1b[0;31m');
    expect(result).toContain('\x1b[0;32m');
    expect(result).toContain('\x1b[0;33m');
    expect(result).toContain('\x1b[0;34m');
    expect(result).toContain('\x1b[0;35m');
    expect(result).toContain('\x1b[0;36m');
    expect(result).toContain('\x1b[0;37m');
  });

  it('should handle all bold intensity codes', () => {
    const text = '&z&R&G&Y&B&P&C&W';
    const result = colorize(text);
    expect(result).toContain('\x1b[1;30m');
    expect(result).toContain('\x1b[1;31m');
    expect(result).toContain('\x1b[1;32m');
    expect(result).toContain('\x1b[1;33m');
    expect(result).toContain('\x1b[1;34m');
    expect(result).toContain('\x1b[1;35m');
    expect(result).toContain('\x1b[1;36m');
    expect(result).toContain('\x1b[1;37m');
  });

  // Background color tests
  it('should convert ^r to red background ANSI', () => {
    const result = colorize('^rHello');
    expect(result).toBe('\x1b[41mHello\x1b[0m');
  });

  it('should convert all background codes', () => {
    const text = '^x^r^g^O^b^p^c^w';
    const result = colorize(text);
    expect(result).toContain('\x1b[40m');
    expect(result).toContain('\x1b[41m');
    expect(result).toContain('\x1b[42m');
    expect(result).toContain('\x1b[43m');
    expect(result).toContain('\x1b[44m');
    expect(result).toContain('\x1b[45m');
    expect(result).toContain('\x1b[46m');
    expect(result).toContain('\x1b[47m');
  });

  it('should strip background codes when ansiEnabled is false', () => {
    const result = colorize('^rHello ^bWorld', false);
    expect(result).toBe('Hello World');
  });

  // Blink color tests
  it('should convert }r to blinking red ANSI', () => {
    const result = colorize('}rHello');
    expect(result).toContain('\x1b[5m');
    expect(result).toContain('\x1b[0;31m');
    expect(result).toContain('Hello');
  });

  it('should convert all blink codes', () => {
    const text = '}r}g}O}b}p}c}w';
    const result = colorize(text);
    expect(result).toContain('\x1b[5m\x1b[0;31m');
    expect(result).toContain('\x1b[5m\x1b[0;32m');
    expect(result).toContain('\x1b[5m\x1b[0;33m');
    expect(result).toContain('\x1b[5m\x1b[0;34m');
    expect(result).toContain('\x1b[5m\x1b[0;35m');
    expect(result).toContain('\x1b[5m\x1b[0;36m');
    expect(result).toContain('\x1b[5m\x1b[0;37m');
  });

  it('should strip blink codes when ansiEnabled is false', () => {
    const result = colorize('}rHello }bWorld', false);
    expect(result).toBe('Hello World');
  });

  // Mixed code test
  it('should handle mixed foreground, background, and blink codes', () => {
    const result = colorize('&RHello ^bWorld }rBlink');
    expect(result).toContain('\x1b[1;31m');
    expect(result).toContain('\x1b[44m');
    expect(result).toContain('\x1b[5m');
  });
});

describe('colorStrlen', () => {
  it('should return correct visible length ignoring colour codes', () => {
    expect(colorStrlen('&RHello')).toBe(5);
  });

  it('should count plain text correctly', () => {
    expect(colorStrlen('Hello World')).toBe(11);
  });

  it('should handle multiple colour codes', () => {
    expect(colorStrlen('&RHello &gWorld&x')).toBe(11);
  });

  it('should return 0 for only colour codes', () => {
    expect(colorStrlen('&R&g&B')).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(colorStrlen('')).toBe(0);
  });

  it('should strip background codes from length', () => {
    expect(colorStrlen('^rHello')).toBe(5);
  });

  it('should strip blink codes from length', () => {
    expect(colorStrlen('}rHello')).toBe(5);
  });

  it('should handle mixed code types', () => {
    expect(colorStrlen('&RHi ^bThere }rBye')).toBe(12);
  });
});

describe('stripColor', () => {
  it('should remove SMAUG foreground codes', () => {
    expect(stripColor('&RHello &gWorld')).toBe('Hello World');
  });

  it('should remove SMAUG background codes', () => {
    expect(stripColor('^rHello ^bWorld')).toBe('Hello World');
  });

  it('should remove SMAUG blink codes', () => {
    expect(stripColor('}rHello }bWorld')).toBe('Hello World');
  });

  it('should remove raw ANSI escape sequences', () => {
    expect(stripColor('\x1b[1;31mHello\x1b[0m')).toBe('Hello');
  });

  it('should remove both SMAUG and ANSI codes', () => {
    const mixed = '&RHello\x1b[44m World';
    expect(stripColor(mixed)).toBe('Hello World');
  });

  it('should return plain text unchanged', () => {
    expect(stripColor('Hello World')).toBe('Hello World');
  });
});

describe('padRight', () => {
  it('should pad plain text to width', () => {
    expect(padRight('Hi', 10)).toBe('Hi        ');
  });

  it('should pad colored text using visible length', () => {
    const colored = '&RHi';
    const padded = padRight(colored, 10);
    // Visible length of "Hi" is 2, needs 8 spaces
    expect(padded).toBe('&RHi        ');
  });

  it('should not pad if text is already wide enough', () => {
    expect(padRight('Hello World', 5)).toBe('Hello World');
  });

  it('should use custom pad character', () => {
    expect(padRight('Hi', 6, '.')).toBe('Hi....');
  });
});

describe('padCenter', () => {
  it('should center plain text', () => {
    const result = padCenter('Hi', 10);
    expect(result).toBe('    Hi    ');
  });

  it('should center colored text using visible length', () => {
    const colored = '&RHi';
    const result = padCenter(colored, 10);
    // 4 spaces left, "&RHi", 4 spaces right
    expect(result).toBe('    &RHi    ');
  });

  it('should not pad if text is already wide enough', () => {
    expect(padCenter('Hello World', 5)).toBe('Hello World');
  });

  it('should handle odd padding', () => {
    const result = padCenter('Hi', 9);
    // 3 left, "Hi" (2), 4 right = 9
    expect(result.length).toBe(9 + 0); // no color codes
    expect(stripColor(result).length).toBe(9);
  });
});

describe('wordWrap', () => {
  it('should wrap long text at width', () => {
    const text = 'hello world foo bar';
    const result = wordWrap(text, 11);
    expect(result).toBe('hello world\nfoo bar');
  });

  it('should preserve existing newlines', () => {
    const text = 'hello\nworld';
    const result = wordWrap(text, 80);
    expect(result).toBe('hello\nworld');
  });

  it('should handle text shorter than width', () => {
    const text = 'hello';
    expect(wordWrap(text, 80)).toBe('hello');
  });

  it('should preserve color codes across line breaks', () => {
    const text = '&Rhello world foo bar';
    const result = wordWrap(text, 11);
    const lines = result.split('\n');
    expect(lines.length).toBe(2);
    // Second line should re-emit the &R color
    expect(lines[1]).toContain('&R');
  });

  it('should handle empty text', () => {
    expect(wordWrap('', 80)).toBe('');
  });

  it('should handle words longer than width', () => {
    const text = 'superlongword short';
    const result = wordWrap(text, 5);
    // The long word should still appear (can't break it)
    expect(result).toContain('superlongword');
  });
});
