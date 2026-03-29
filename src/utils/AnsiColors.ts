/**
 * AnsiColors - SMAUG color code to ANSI escape sequence conversion.
 *
 * SMAUG uses &x-style color codes in room descriptions, object names,
 * and all player-visible text. This module converts those codes to
 * standard ANSI terminal escape sequences.
 *
 * Supported code families:
 *   &X - Foreground colors (normal/bold)
 *   ^X - Background colors
 *   }X - Blinking foreground colors
 */

/** Map of SMAUG foreground color codes to ANSI escape sequences. */
const FG_COLOR_MAP: Record<string, string> = {
  // Normal intensity
  '&x': '\x1b[0m',       // Reset / normal
  '&r': '\x1b[0;31m',    // Red
  '&g': '\x1b[0;32m',    // Green
  '&O': '\x1b[0;33m',    // Orange (dark yellow)
  '&b': '\x1b[0;34m',    // Blue
  '&p': '\x1b[0;35m',    // Purple (magenta)
  '&c': '\x1b[0;36m',    // Cyan
  '&w': '\x1b[0;37m',    // White (light grey)

  // Bold / bright intensity
  '&z': '\x1b[1;30m',    // Dark grey (bold black)
  '&R': '\x1b[1;31m',    // Bright red
  '&G': '\x1b[1;32m',    // Bright green
  '&Y': '\x1b[1;33m',    // Yellow (bright)
  '&B': '\x1b[1;34m',    // Bright blue
  '&P': '\x1b[1;35m',    // Pink (bright magenta)
  '&C': '\x1b[1;36m',    // Bright cyan
  '&W': '\x1b[1;37m',    // Bright white

  // Reset aliases
  '&D': '\x1b[0m',       // Reset
  '&d': '\x1b[0m',       // Reset
};

/** Map of SMAUG background color codes (^X) to ANSI escape sequences. */
const BG_COLOR_MAP: Record<string, string> = {
  '^x': '\x1b[40m',      // Black background
  '^r': '\x1b[41m',      // Red background
  '^g': '\x1b[42m',      // Green background
  '^O': '\x1b[43m',      // Yellow/brown background
  '^b': '\x1b[44m',      // Blue background
  '^p': '\x1b[45m',      // Magenta background
  '^c': '\x1b[46m',      // Cyan background
  '^w': '\x1b[47m',      // White background
};

/** Map of SMAUG blink color codes (}X) to ANSI escape sequences. */
const BLINK_COLOR_MAP: Record<string, string> = {
  '}r': '\x1b[5m\x1b[0;31m',     // Blinking red
  '}g': '\x1b[5m\x1b[0;32m',     // Blinking green
  '}O': '\x1b[5m\x1b[0;33m',     // Blinking orange
  '}b': '\x1b[5m\x1b[0;34m',     // Blinking blue
  '}p': '\x1b[5m\x1b[0;35m',     // Blinking magenta
  '}c': '\x1b[5m\x1b[0;36m',     // Blinking cyan
  '}w': '\x1b[5m\x1b[0;37m',     // Blinking white
};

/** Combined map for all code types. */
const COLOR_MAP: Record<string, string> = {
  ...FG_COLOR_MAP,
  ...BG_COLOR_MAP,
  ...BLINK_COLOR_MAP,
};

/** Regex that matches any SMAUG color code (&x, ^x, }x variants). */
const COLOR_CODE_REGEX = /&[xrgObpcwzRGYBPCWDd]|\^[xrgObpcw]|\}[rgObpcw]/g;

/** Regex that matches raw ANSI escape sequences. */
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*m/g;

/**
 * Convert SMAUG color codes in text to ANSI escape sequences.
 *
 * If ansiEnabled is false, color codes are stripped entirely.
 * A final reset is appended if any codes were found and ANSI is enabled.
 *
 * @param text - Text containing SMAUG &x, ^x, }x style color codes
 * @param ansiEnabled - Whether to convert to ANSI (true) or strip codes (false)
 * @returns Text with ANSI escapes or stripped of color codes
 */
export function colorize(text: string, ansiEnabled: boolean = true): string {
  if (!ansiEnabled) {
    return text.replace(COLOR_CODE_REGEX, '');
  }

  let hasCode = false;
  const result = text.replace(COLOR_CODE_REGEX, (match) => {
    const ansi = COLOR_MAP[match];
    if (ansi) {
      hasCode = true;
      return ansi;
    }
    return match;
  });

  // Append reset if any codes were substituted
  if (hasCode) {
    return result + '\x1b[0m';
  }
  return result;
}

/**
 * Return the visible character length of a string after stripping
 * all SMAUG color codes. Does NOT count ANSI escape bytes.
 *
 * @param text - Text containing SMAUG color codes
 * @returns Number of visible characters (excluding color codes)
 */
export function colorStrlen(text: string): number {
  return text.replace(COLOR_CODE_REGEX, '').length;
}

/**
 * Strip ALL color codes from text - both SMAUG codes (&X, ^X, }X)
 * and raw ANSI escape sequences (\x1b[...m).
 *
 * @param text - Text containing color codes
 * @returns Plain text with all color information removed
 */
export function stripColor(text: string): string {
  return text.replace(COLOR_CODE_REGEX, '').replace(ANSI_ESCAPE_REGEX, '');
}

/**
 * Right-pad text to a given visible width, using colorStrlen for measurement.
 *
 * @param text - Text (may contain color codes)
 * @param width - Desired visible width
 * @param padChar - Character to pad with (default: space)
 * @returns Padded text
 */
export function padRight(text: string, width: number, padChar: string = ' '): string {
  const visLen = colorStrlen(text);
  if (visLen >= width) return text;
  return text + padChar.repeat(width - visLen);
}

/**
 * Center text within a given visible width, using colorStrlen for measurement.
 *
 * @param text - Text (may contain color codes)
 * @param width - Desired visible width
 * @param padChar - Character to pad with (default: space)
 * @returns Centered text
 */
export function padCenter(text: string, width: number, padChar: string = ' '): string {
  const visLen = colorStrlen(text);
  if (visLen >= width) return text;
  const totalPad = width - visLen;
  const leftPad = Math.floor(totalPad / 2);
  const rightPad = totalPad - leftPad;
  return padChar.repeat(leftPad) + text + padChar.repeat(rightPad);
}

/**
 * Word-wrap text at the given visible-character width.
 * Preserves color state across line breaks by re-emitting the last
 * active color code at the start of each new line.
 *
 * @param text - Text (may contain color codes)
 * @param width - Maximum visible characters per line
 * @returns Wrapped text with newlines inserted
 */
export function wordWrap(text: string, width: number): string {
  if (width <= 0) return text;

  const lines: string[] = [];
  // Split on existing newlines first
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }
    wrapParagraph(paragraph, width, lines);
  }

  return lines.join('\n');
}

/**
 * Internal helper: wrap a single paragraph (no embedded newlines).
 * Tracks color state and re-emits at line breaks.
 */
function wrapParagraph(text: string, width: number, lines: string[]): void {
  // Tokenize the text into segments: color codes and visible text
  const tokens: Array<{ type: 'color' | 'text'; value: string }> = [];
  let lastIndex = 0;
  const regex = new RegExp(COLOR_CODE_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    tokens.push({ type: 'color', value: match[0] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  let currentLine = '';
  let currentVisLen = 0;
  let lastColor = '';

  for (const token of tokens) {
    if (token.type === 'color') {
      currentLine += token.value;
      lastColor = token.value;
      continue;
    }

    // Text token - may need to split across lines
    const words = token.value.split(/( +)/);
    for (const word of words) {
      if (word.length === 0) continue;

      if (currentVisLen + word.length <= width) {
        currentLine += word;
        currentVisLen += word.length;
      } else if (currentVisLen === 0) {
        // Word is longer than width - force it on current line
        currentLine += word;
        currentVisLen += word.length;
      } else {
        // Wrap: push current line, start new one
        lines.push(currentLine);
        // Skip leading whitespace on new line
        const trimmedWord = word.trimStart();
        currentLine = lastColor ? lastColor + trimmedWord : trimmedWord;
        currentVisLen = trimmedWord.length;
      }
    }
  }

  if (currentLine.length > 0 || lines.length === 0) {
    lines.push(currentLine);
  }
}

export { COLOR_MAP, COLOR_CODE_REGEX, ANSI_ESCAPE_REGEX, BG_COLOR_MAP, BLINK_COLOR_MAP };

// TODO PARITY: Add player-facing color configuration commands (color, color default, color theme, color ansi)
