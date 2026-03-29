/**
 * StringUtils - String manipulation utilities for SMAUG 2.0
 *
 * Implements the core string functions from legacy SMAUG C code,
 * used by the command interpreter, text processing, and area loading.
 */

/**
 * Check if str matches any keyword in a space-separated namelist.
 * Case-insensitive exact match.
 *
 * Legacy equivalent: is_name() from handler.c
 *
 * @param str - The string to search for
 * @param namelist - Space-separated list of keywords
 * @returns true if str exactly matches any keyword
 */
export function isName(str: string, namelist: string): boolean {
  if (str.length === 0 || namelist.length === 0) return false;
  const lower = str.toLowerCase();
  const keywords = namelist.toLowerCase().split(/\s+/);
  return keywords.some(kw => kw === lower);
}

/**
 * Prefix-match variant of isName. str can be a prefix of any keyword.
 *
 * Legacy equivalent: is_name_prefix() from handler.c
 *
 * @param str - The prefix to search for
 * @param namelist - Space-separated list of keywords
 * @returns true if str is a prefix of any keyword
 */
export function isNamePrefix(str: string, namelist: string): boolean {
  if (str.length === 0 || namelist.length === 0) return false;
  const lower = str.toLowerCase();
  const keywords = namelist.toLowerCase().split(/\s+/);
  return keywords.some(kw => kw.startsWith(lower));
}

/**
 * Extract the first word from an argument string.
 * Handles single-quoted and double-quoted multi-word arguments.
 *
 * Examples:
 *   "hello world" → ["hello", "world"]
 *   "'magic missile' goblin" → ["magic missile", "goblin"]
 *   '"magic missile" goblin' → ["magic missile", "goblin"]
 *
 * Legacy equivalent: one_argument() from interp.c
 *
 * @param argument - The full argument string
 * @returns Tuple of [first argument, remaining string]
 */
export function oneArgument(argument: string): [string, string] {
  const trimmed = argument.trimStart();
  if (trimmed.length === 0) return ['', ''];

  const firstChar = trimmed.charAt(0);

  // Handle quoted arguments
  if (firstChar === "'" || firstChar === '"') {
    const endQuote = trimmed.indexOf(firstChar, 1);
    if (endQuote === -1) {
      // No closing quote - treat rest as the argument
      return [trimmed.slice(1), ''];
    }
    const word = trimmed.slice(1, endQuote);
    const rest = trimmed.slice(endQuote + 1).trimStart();
    return [word, rest];
  }

  // Normal space-delimited split
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return [trimmed, ''];
  }
  return [trimmed.substring(0, spaceIndex), trimmed.substring(spaceIndex + 1).trimStart()];
}

/**
 * Check if astr is a case-insensitive prefix of bstr.
 * Empty astr returns false.
 *
 * Legacy equivalent: str_prefix() from misc.c
 * Core of command abbreviation matching.
 *
 * @param astr - The prefix to check
 * @param bstr - The target string to check against
 * @returns true if astr is a case-insensitive prefix of bstr
 */
export function strPrefix(astr: string, bstr: string): boolean {
  if (astr.length === 0) return false;
  if (astr.length > bstr.length) return false;
  return bstr.toLowerCase().startsWith(astr.toLowerCase());
}

/**
 * Replace all tilde (~) characters with a dash (-).
 * Tildes are used as string terminators in legacy .are files.
 *
 * Legacy equivalent: smash_tilde() from db.c
 *
 * @param str - Input string possibly containing tildes
 * @returns String with tildes replaced by dashes
 */
export function smashTilde(str: string): string {
  return str.replace(/~/g, '-');
}

/**
 * Capitalize the first letter of a string.
 *
 * Legacy equivalent: capitalize() from misc.c
 *
 * @param str - Input string
 * @returns String with first character uppercased
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Parse "N.keyword" format used for targeting the Nth instance.
 *
 * Examples:
 *   "2.sword" → { number: 2, keyword: "sword" }
 *   "sword"   → { number: 0, keyword: "sword" }
 *   "3."      → { number: 3, keyword: "" }
 *
 * Legacy equivalent: number_argument() from handler.c
 *
 * @param argument - Argument string possibly in N.keyword format
 * @returns Object with number and keyword
 */
export function numberArgument(argument: string): { number: number; keyword: string } {
  const dotIndex = argument.indexOf('.');
  if (dotIndex === -1) {
    return { number: 0, keyword: argument };
  }
  const numStr = argument.substring(0, dotIndex);
  const keyword = argument.substring(dotIndex + 1);
  const num = parseInt(numStr, 10);
  if (isNaN(num)) {
    return { number: 0, keyword: argument };
  }
  return { number: num, keyword };
}

/**
 * Format a string: capitalize first letter and ensure it ends with a newline.
 *
 * Legacy equivalent: format_string() from build.c
 *
 * @param str - Input string
 * @returns Formatted string
 */
export function formatString(str: string): string {
  if (str.length === 0) return '\n';
  let result = str.charAt(0).toUpperCase() + str.slice(1);
  if (!result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}

/**
 * Check if a string represents a valid number.
 *
 * Legacy equivalent: is_number() from misc.c
 *
 * @param str - String to test
 * @returns true if the string is a valid integer
 */
export function isNumber(str: string): boolean {
  if (str.length === 0) return false;
  return /^-?\d+$/.test(str.trim());
}
