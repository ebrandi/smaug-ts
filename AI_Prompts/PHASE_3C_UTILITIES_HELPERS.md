# SMAUG 2.0 TypeScript Port — Phase 3C: Utilities & Helpers

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phases 3A and 3B have established the complete project skeleton and core infrastructure. The project scaffold (package.json, tsconfig.json, ESLint, Vitest, Prisma schema, all stub files) is in place. The core engine (EventBus with 72 typed events, TickEngine with pulse constants, GameLoop at 250ms intervals), the network layer (dual WebSocket/Socket.IO with ConnectionManager and Descriptor), and foundational utilities (Logger, AnsiColors, Dice, BitVector, StringUtils with basic implementations) are all functional. The server boots, accepts connections, runs the game loop, and presents the login prompt. This phase expands the utility layer with string manipulation helpers, file I/O abstractions, legacy SMAUG format converters, text formatting functions, and general-purpose helpers that every downstream subsystem depends on.
>
> **Your role:** You are an expert TypeScript/Node.js engineer with deep knowledge of MUD engine architecture. You have access to five reference documents that describe the legacy C codebase in exhaustive detail:
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `COMMANDS.md` — Full command table with trust levels, positions, and flags
> - `STRUCTURE.md` — File inventory and subsystem grouping

## Cardinal Rules (apply to ALL code you produce)

1. **Preserve legacy gameplay exactly.** Every formula, threshold, constant, and order-of-operations must match the C original. When the architecture doc says "replicates legacy X", implement it verbatim.
2. **Use the scaffolded file paths.** Do not create new files or rename existing ones. Every file referenced below already exists as a stub from Phase 3A.
3. **Follow the TypeScript patterns established in ARCHITECTURE.md.** Use the exact class names, method signatures, enum values, and interface shapes defined there.
4. **Emit EventBus events** at every documented hook point so that downstream systems (MUDprogs, logging, admin dashboard) can subscribe.
5. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
6. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
7. **Handle edge cases defensively.** Check for null inputs, empty strings, negative numbers, and boundary conditions before every operation.
8. **No external runtime dependencies** beyond what's already in `package.json` (Prisma, Socket.IO, Express, jsonwebtoken, bcrypt, zlib).
9. **Maintain the pulse-based timing model.** 4 pulses/second, `PULSE_VIOLENCE` = 12, `PULSE_MOBILE` = 16, `PULSE_AUCTION` = 36, `PULSE_AREA` = 240, `PULSE_TICK` = 280. All durations and cooldowns are expressed in pulses.
10. **Log with the structured Logger** (`src/utils/Logger.ts`) using domain tags. Never use bare `console.log`.

## Folder Structure Reference

```
smaug-ts/
├── src/
│   ├── core/               # GameLoop, TickEngine, EventBus
│   ├── network/            # WebSocketServer, ConnectionManager, SocketIOAdapter, TelnetProtocol
│   ├── game/
│   │   ├── commands/       # CommandRegistry, movement, combat, communication, information, objects, magic, social, immortal, olc
│   │   ├── combat/         # CombatEngine, DamageCalculator, DeathHandler
│   │   ├── world/          # AreaManager, RoomManager, ResetEngine, VnumRegistry
│   │   ├── entities/       # Character, Player, Mobile, GameObject, Room, Area, Affect
│   │   ├── economy/        # Currency, ShopSystem, AuctionSystem, BankSystem
│   │   ├── spells/         # SpellEngine, SpellRegistry, SavingThrows, ComponentSystem
│   │   ├── affects/        # AffectManager, AffectRegistry, StatModifier
│   │   └── social/         # ClanSystem, CouncilSystem, DeitySystem, BoardSystem, HousingSystem
│   ├── persistence/        # PlayerRepository, WorldRepository
│   ├── admin/              # AdminRouter, AuthController, MonitoringController
│   ├── scripting/          # MudProgEngine, IfcheckRegistry, ScriptParser, VariableSubstitution
│   ├── utils/              # AnsiColors, Dice, StringUtils, BitVector, Logger, TextFormatter, FileIO, LegacyConverter
│   └── migration/          # AreFileParser, PlayerFileParser, MigrationRunner
├── prisma/schema.prisma
├── world/                  # JSON world data files (one subdirectory per area)
├── tests/                  # Unit, integration, e2e tests
└── public/                 # Browser client and admin dashboard static files
```

## Prior Sub-Phases Completed

**Sub-Phase 3A (Project Initialisation)** — Complete. All configuration files, directory tree, stub files, Prisma schema, and README exist and compile cleanly.

**Sub-Phase 3B (Core Infrastructure)** — Complete. The following modules are fully implemented and tested:

| Module | File | Status |
|---|---|---|
| EventBus | `src/core/EventBus.ts` | 72 typed events, synchronous pub/sub |
| TickEngine | `src/core/TickEngine.ts` | 6 pulse counters with randomised reset |
| GameLoop | `src/core/GameLoop.ts` | 250ms pulse interval, lag detection |
| Logger | `src/utils/Logger.ts` | Domain-tagged structured logging with 5 levels |
| AnsiColors | `src/utils/AnsiColors.ts` | `colorize()`, `colorStrlen()`, `stripColor()`, basic `padRight()`/`padCenter()` |
| Dice | `src/utils/Dice.ts` | `rollDice()`, `numberRange()`, `numberPercent()`, `parseDiceString()` |
| BitVector | `src/utils/BitVector.ts` | `hasFlag()`, `setFlag()`, `removeFlag()`, `flagsToArray()`, `parseFlagString()` |
| StringUtils | `src/utils/StringUtils.ts` | `isName()`, `oneArgument()`, `strPrefix()`, `numberArgument()` |
| WebSocketServer | `src/network/WebSocketServer.ts` | Dual ws/Socket.IO on configurable paths |
| ConnectionManager | `src/network/ConnectionManager.ts` | Descriptor class, input queue, output buffer, greeting banner |
| Entity Types | `src/game/entities/types.ts` | All enums, bitvector constants, interfaces |
| Entry Point | `src/main.ts` | Full boot sequence with graceful shutdown |

**Do NOT modify any of the above completed implementations** unless explicitly extending them. You may import from them freely.

---

## Sub-Phase 3C Objective

Expand the utility layer with advanced string manipulation, text formatting, file I/O helpers, legacy format converters, and general-purpose helper functions. These utilities are prerequisites for the world loader (Phase 3D), area parser (Phase 3E), and every command handler in later phases. After this phase, all string processing, text formatting, file reading, and legacy data conversion functions are available for use throughout the codebase.

---

## Files to Implement

### 1. `src/utils/StringUtils.ts` — Extended String Utilities

Extend the existing Phase 3B implementation with additional string manipulation functions that replicate legacy C string handling. All functions must be pure (no side effects) and handle edge cases defensively.

#### New Functions to Add

- **`isNameExact(str, namelist)`** — Exact match variant of `isName()`. The `str` must exactly match one of the space-separated keywords (not a prefix). Case-insensitive. Used by the world loader for strict keyword matching.

```typescript
export function isNameExact(str: string, namelist: string): boolean {
  if (!str || !namelist) return false;
  const target = str.toLowerCase().trim();
  const names = namelist.toLowerCase().split(/\s+/);
  return names.includes(target);
}
```

- **`allNamePrefix(str, namelist)`** — Return true if ALL space-separated words in `str` are prefix-matches against any word in `namelist`. Replicates legacy `is_name_prefix()` multi-word variant used by `get_char_room()` for multi-keyword targeting (e.g., `"old man"` matches `"old wise man"`).

```typescript
export function allNamePrefix(str: string, namelist: string): boolean {
  if (!str || !namelist) return false;
  const targets = str.toLowerCase().trim().split(/\s+/);
  const names = namelist.toLowerCase().split(/\s+/);
  return targets.every(target =>
    names.some(name => name.startsWith(target))
  );
}
```

- **`trimTilde(str)`** — Remove everything from the first `~` character onward. In legacy `.are` files, `~` is the string terminator. Distinct from `smash_tilde()` which replaces `~` with `-`.

```typescript
export function trimTilde(str: string): string {
  const idx = str.indexOf('~');
  return idx === -1 ? str : str.substring(0, idx);
}
```

- **`aOrAn(word)`** — Return `"an"` if the word starts with a vowel, `"a"` otherwise. Replicates legacy `aoran()` used in item descriptions and combat messages.

```typescript
export function aOrAn(word: string): string {
  if (!word) return 'a';
  const first = word.charAt(0).toLowerCase();
  return 'aeiou'.includes(first) ? 'an' : 'a';
}
```

- **`stripCr(str)`** — Remove all `\r` characters from a string. Used when reading legacy text files that may contain `\r\n` line endings.

```typescript
export function stripCr(str: string): string {
  return str.replace(/\r/g, '');
}
```

- **`wordWrap(text, width)`** — Word-wrap text at `width` characters. Splits on whitespace, respecting embedded newlines. Returns the wrapped string with `\r\n` line endings (MUD standard). Does NOT account for color codes — use `AnsiColors.wordWrap()` for color-aware wrapping.

```typescript
export function wordWrap(text: string, width: number = 78): string {
  if (!text) return '';
  const paragraphs = text.split('\n');
  const result: string[] = [];

  for (const para of paragraphs) {
    if (para.trim() === '') {
      result.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let line = '';
    for (const word of words) {
      if (line.length + word.length + 1 > width) {
        result.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) result.push(line);
  }

  return result.join('\r\n');
}
```

- **`truncate(str, maxLen, suffix?)`** — Truncate a string to `maxLen` characters, appending `suffix` (default `"..."`) if truncated. Respects word boundaries — does not cut mid-word.

```typescript
export function truncate(str: string, maxLen: number, suffix: string = '...'): string {
  if (!str || str.length <= maxLen) return str;
  const cutoff = maxLen - suffix.length;
  const trimmed = str.substring(0, cutoff);
  const lastSpace = trimmed.lastIndexOf(' ');
  return (lastSpace > 0 ? trimmed.substring(0, lastSpace) : trimmed) + suffix;
}
```

- **`pluralize(count, singular, plural?)`** — Return the correct singular/plural form. If `plural` is not provided, appends `"s"` to `singular`. Used in combat messages (`"1 hit"` vs `"3 hits"`).

```typescript
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural ?? `${singular}s`;
}
```

- **`centerText(text, width, fillChar?)`** — Center `text` within `width` characters using `fillChar` (default space). Used in title bars and banners.

```typescript
export function centerText(text: string, width: number, fillChar: string = ' '): string {
  if (text.length >= width) return text;
  const leftPad = Math.floor((width - text.length) / 2);
  const rightPad = width - text.length - leftPad;
  return fillChar.repeat(leftPad) + text + fillChar.repeat(rightPad);
}
```

- **`actSubstitute(format, ch, vict?, arg?, obj?)`** — Perform `act()` string substitution. This is the MUD equivalent of `printf()` — the single most-used output function in the legacy codebase. Replicates legacy `act()` from `handler.c`.

  Substitution tokens:
  - `$n` — Character's short name (visible to viewer, handles invisible/hidden)
  - `$N` — Victim's short name
  - `$e` — Character's subjective pronoun (he/she/it)
  - `$E` — Victim's subjective pronoun
  - `$m` — Character's objective pronoun (him/her/it)
  - `$M` — Victim's objective pronoun
  - `$s` — Character's possessive pronoun (his/her/its)
  - `$S` — Victim's possessive pronoun
  - `$t` — Argument string (first `arg` parameter)
  - `$T` — Second argument string (second `arg` parameter)
  - `$p` — Object short description
  - `$P` — Second object short description

```typescript
interface ActSubjectInfo {
  name: string;
  shortDescription?: string;
  sex: number; // 0=neutral, 1=male, 2=female
}

const SUBJECTIVE  = ['it', 'he', 'she'];
const OBJECTIVE   = ['it', 'him', 'her'];
const POSSESSIVE  = ['its', 'his', 'her'];

export function actSubstitute(
  format: string,
  ch: ActSubjectInfo,
  vict?: ActSubjectInfo | null,
  arg?: string | null,
  obj?: { shortDescription: string } | null,
  obj2?: { shortDescription: string } | null
): string {
  let result = format;

  result = result.replace(/\$n/g, ch.shortDescription ?? ch.name);
  result = result.replace(/\$N/g, vict?.shortDescription ?? vict?.name ?? 'someone');
  result = result.replace(/\$e/g, SUBJECTIVE[ch.sex] ?? 'it');
  result = result.replace(/\$E/g, SUBJECTIVE[vict?.sex ?? 0] ?? 'it');
  result = result.replace(/\$m/g, OBJECTIVE[ch.sex] ?? 'it');
  result = result.replace(/\$M/g, OBJECTIVE[vict?.sex ?? 0] ?? 'it');
  result = result.replace(/\$s/g, POSSESSIVE[ch.sex] ?? 'its');
  result = result.replace(/\$S/g, POSSESSIVE[vict?.sex ?? 0] ?? 'its');
  result = result.replace(/\$t/g, arg ?? '');
  result = result.replace(/\$T/g, obj2?.shortDescription ?? arg ?? '');
  result = result.replace(/\$p/g, obj?.shortDescription ?? 'something');
  result = result.replace(/\$P/g, obj2?.shortDescription ?? 'something');

  return result;
}
```

---

### 2. `src/utils/TextFormatter.ts` — Text Formatting Utilities

Create a new utility module for rich text formatting used throughout the MUD for room descriptions, score sheets, equipment lists, and information displays.

```typescript
// src/utils/TextFormatter.ts

import { colorize, colorStrlen, stripColor } from './AnsiColors.js';

/**
 * Text formatting utilities for MUD output.
 * Handles column alignment, tables, banners, progress bars,
 * and other visual formatting with ANSI color support.
 */

/** Draw a horizontal rule of the specified character. */
export function horizontalRule(width: number = 78, char: string = '-', color?: string): string {
  const rule = char.repeat(width);
  return color ? `${color}${rule}&D` : rule;
}

/** Format a two-column key-value pair with dot-leaders. */
export function keyValueLine(
  key: string,
  value: string,
  width: number = 78,
  dotChar: string = '.'
): string {
  const keyLen = colorStrlen(key);
  const valLen = colorStrlen(value);
  const dotsNeeded = Math.max(1, width - keyLen - valLen - 2);
  return `${key} ${dotChar.repeat(dotsNeeded)} ${value}`;
}

/**
 * Format data into aligned columns.
 * Each row is an array of strings; colWidths specifies the width of each column.
 * Pads with spaces using colorStrlen for accurate width calculation with color codes.
 */
export function formatColumns(
  rows: string[][],
  colWidths: number[],
  separator: string = '  '
): string {
  return rows.map(row => {
    return row.map((cell, i) => {
      const width = colWidths[i] ?? 20;
      const visLen = colorStrlen(cell);
      const pad = Math.max(0, width - visLen);
      return cell + ' '.repeat(pad);
    }).join(separator);
  }).join('\r\n');
}

/**
 * Build an ASCII progress bar.
 * Used for HP/mana/move display in prompts and score.
 */
export function progressBar(
  current: number,
  max: number,
  width: number = 20,
  filledChar: string = '█',
  emptyChar: string = '░',
  filledColor: string = '&G',
  emptyColor: string = '&x'
): string {
  const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  return `${filledColor}${filledChar.repeat(filled)}${emptyColor}${emptyChar.repeat(empty)}&D`;
}

/**
 * Format a number with commas for readability (e.g., 1,234,567).
 * Used in gold displays, experience points, etc.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format a duration in pulses to a human-readable string.
 * Converts pulses to hours/minutes/seconds at 4 pulses/second.
 */
export function formatDuration(pulses: number): string {
  const totalSeconds = Math.floor(pulses / 4);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Format an alignment value (-1000 to +1000) to a descriptive string.
 * Replicates legacy alignment display ranges.
 */
export function formatAlignment(alignment: number): string {
  if (alignment > 900)   return '&Wangelic&D';
  if (alignment > 700)   return '&Wsaintly&D';
  if (alignment > 350)   return '&Cgood&D';
  if (alignment > 100)   return '&ckind&D';
  if (alignment > -100)  return '&wneutral&D';
  if (alignment > -350)  return '&ymean&D';
  if (alignment > -700)  return '&revil&D';
  if (alignment > -900)  return '&rdemonic&D';
  return '&Rsatanic&D';
}

/**
 * Format a position enum value to a descriptive string.
 * Replicates legacy position display names.
 */
export function formatPosition(position: number): string {
  const POSITION_NAMES: readonly string[] = [
    'dead', 'mortal', 'incapacitated', 'stunned', 'sleeping',
    'resting', 'sitting', 'fighting', 'standing', 'mounted',
    'shove', 'drag', 'evasive', 'defensive', 'aggressive', 'berserk',
  ];
  return POSITION_NAMES[position] ?? 'unknown';
}

/**
 * Build a framed text box with a title.
 * Used for score displays, help text boxes, and admin panels.
 */
export function textBox(
  title: string,
  lines: string[],
  width: number = 78,
  borderColor: string = '&c'
): string {
  const top = `${borderColor}+${'-'.repeat(width - 2)}+&D`;
  const titleLine = `${borderColor}|&D ${title}${' '.repeat(Math.max(0, width - 4 - colorStrlen(title)))} ${borderColor}|&D`;
  const sep = `${borderColor}+${'-'.repeat(width - 2)}+&D`;
  const contentLines = lines.map(line => {
    const visLen = colorStrlen(line);
    const pad = Math.max(0, width - 4 - visLen);
    return `${borderColor}|&D ${line}${' '.repeat(pad)} ${borderColor}|&D`;
  });
  const bottom = `${borderColor}+${'-'.repeat(width - 2)}+&D`;

  return [top, titleLine, sep, ...contentLines, bottom].join('\r\n');
}

/**
 * Format a prompt string by substituting prompt tokens.
 * Replicates legacy prompt formatting from mud_comm.c.
 *
 * Tokens:
 *   %h — current HP         %H — max HP
 *   %m — current mana       %M — max mana
 *   %v — current move       %V — max move
 *   %x — current exp        %X — exp to next level
 *   %g — gold               %a — alignment
 *   %r — current room name  %R — current room vnum (imm only)
 *   %z — area name          %i — invis level (imm only)
 *   %c — newline (\r\n)     %% — literal %
 */
export interface PromptData {
  hit: number; maxHit: number;
  mana: number; maxMana: number;
  move: number; maxMove: number;
  exp: number; expToLevel: number;
  gold: number; alignment: number;
  roomName: string; roomVnum: number;
  areaName: string; invisLevel: number;
  isImmortal: boolean;
}

export function formatPrompt(template: string, data: PromptData): string {
  let result = template;
  result = result.replace(/%h/g, String(data.hit));
  result = result.replace(/%H/g, String(data.maxHit));
  result = result.replace(/%m/g, String(data.mana));
  result = result.replace(/%M/g, String(data.maxMana));
  result = result.replace(/%v/g, String(data.move));
  result = result.replace(/%V/g, String(data.maxMove));
  result = result.replace(/%x/g, String(data.exp));
  result = result.replace(/%X/g, String(data.expToLevel));
  result = result.replace(/%g/g, String(data.gold));
  result = result.replace(/%a/g, String(data.alignment));
  result = result.replace(/%r/g, data.roomName);
  result = result.replace(/%R/g, data.isImmortal ? String(data.roomVnum) : '');
  result = result.replace(/%z/g, data.areaName);
  result = result.replace(/%i/g, data.isImmortal ? String(data.invisLevel) : '');
  result = result.replace(/%c/g, '\r\n');
  result = result.replace(/%%/g, '%');
  return result;
}
```

---

### 3. `src/utils/FileIO.ts` — File I/O Helpers

Create a file I/O abstraction layer for reading world data files, configuration files, and other data files. Wraps Node.js `fs/promises` with error handling, caching, and convenience methods.

```typescript
// src/utils/FileIO.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './Logger.js';

/**
 * File I/O helpers for loading world data and configuration.
 * Provides safe file reading with error handling, directory scanning,
 * and JSON loading with validation.
 */

const logger = new Logger();

/**
 * Read a text file safely, returning null on error instead of throwing.
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      logger.debug('file', `File not found: ${filePath}`);
      return null;
    }
    logger.error('file', `Error reading file ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Read and parse a JSON file safely. Returns null on error.
 * Logs parse errors with file path and position information.
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T | null> {
  const content = await readFileSafe(filePath);
  if (content === null) return null;

  try {
    return JSON.parse(content) as T;
  } catch (err: any) {
    logger.error('file', `JSON parse error in ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Read and parse a JSON file, throwing on error. Used during boot
 * when missing files are fatal.
 */
export async function readJsonFileRequired<T = unknown>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  try {
    return JSON.parse(content) as T;
  } catch (err: any) {
    throw new Error(`JSON parse error in ${filePath}: ${err.message}`);
  }
}

/**
 * Write a JSON file with pretty formatting.
 * Creates parent directories if they don't exist.
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Write a text file safely. Creates parent directories if needed.
 */
export async function writeFileSafe(filePath: string, content: string): Promise<boolean> {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (err: any) {
    logger.error('file', `Error writing file ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * List all subdirectories in a directory.
 * Used by AreaManager to discover area directories.
 */
export async function listSubdirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(dirPath, entry.name))
      .sort();
  } catch (err: any) {
    logger.error('file', `Error reading directory ${dirPath}: ${err.message}`);
    return [];
  }
}

/**
 * List all files matching a pattern in a directory.
 * Simple glob-like matching (supports * wildcard).
 */
export async function listFiles(dirPath: string, extension?: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let files = entries
      .filter(entry => entry.isFile())
      .map(entry => path.join(dirPath, entry.name));

    if (extension) {
      files = files.filter(f => f.endsWith(extension));
    }

    return files.sort();
  } catch (err: any) {
    logger.error('file', `Error listing files in ${dirPath}: ${err.message}`);
    return [];
  }
}

/**
 * Check if a file or directory exists.
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Read all JSON files matching a naming pattern from a directory.
 * Returns a map from filename (without extension) to parsed content.
 */
export async function readAllJsonFiles<T = unknown>(
  dirPath: string
): Promise<Map<string, T>> {
  const result = new Map<string, T>();
  const files = await listFiles(dirPath, '.json');

  for (const filePath of files) {
    const basename = path.basename(filePath, '.json');
    const data = await readJsonFile<T>(filePath);
    if (data !== null) {
      result.set(basename, data);
    }
  }

  return result;
}
```

---

### 4. `src/utils/LegacyConverter.ts` — Legacy SMAUG Format Converters

Create conversion utilities for translating between legacy SMAUG data formats and the modern TypeScript/JSON formats. These are used by the migration system and the area file parser.

```typescript
// src/utils/LegacyConverter.ts

import { parseFlagString, flagsToArray } from './BitVector.js';

/**
 * Converters for legacy SMAUG text file formats.
 * Handles the peculiarities of the .are file format:
 * tilde-terminated strings, flag encoding, extended bitvectors,
 * and section-based layout.
 */

/**
 * Convert a SMAUG extended bitvector string to bigint.
 * Legacy format: a single number, or multiple numbers separated by '&'.
 * Example: "0" → 0n, "8" → 8n, "1&0&0" → 1n (multi-word flags: low&mid&high).
 *
 * In the legacy codebase, fread_bitvector() reads these values.
 * The first number is the low 32 bits, subsequent are higher 32-bit words.
 */
export function parseLegacyBitvector(str: string): bigint {
  if (!str || str.trim() === '0') return 0n;
  const parts = str.trim().split('&');
  let result = 0n;

  for (let i = 0; i < parts.length; i++) {
    const val = parseInt(parts[i]!, 10);
    if (!isNaN(val)) {
      result |= BigInt(val) << BigInt(i * 32);
    }
  }

  return result;
}

/**
 * Convert a bigint bitvector back to legacy format string.
 * Inverse of parseLegacyBitvector().
 */
export function toLegacyBitvector(flags: bigint): string {
  if (flags === 0n) return '0';

  const parts: string[] = [];
  let remaining = flags;
  while (remaining > 0n) {
    parts.push(String(Number(remaining & 0xFFFFFFFFn)));
    remaining >>= 32n;
  }

  return parts.join('&');
}

/**
 * Convert legacy SMAUG letter-based flag encoding.
 * In some area formats, flags are encoded as letters:
 * A=1, B=2, C=4, ..., Z=2^25, a=2^26, ..., e=2^30
 * Numbers 0-9 are literal bit positions.
 *
 * Replicates legacy fread_flag() from db.c.
 */
export function parseLegacyFlagLetters(str: string): number {
  let flags = 0;
  let negative = false;

  const trimmed = str.trim();
  let i = 0;

  if (trimmed[i] === '-') {
    negative = true;
    i++;
  }

  // If it starts with a digit, it's a plain number
  if (i < trimmed.length && trimmed[i]! >= '0' && trimmed[i]! <= '9') {
    const num = parseInt(trimmed.substring(i), 10);
    return negative ? -num : num;
  }

  // Otherwise, it's letter-based encoding
  for (; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    if (ch >= 'A' && ch <= 'Z') {
      flags |= 1 << (ch.charCodeAt(0) - 'A'.charCodeAt(0));
    } else if (ch >= 'a' && ch <= 'e') {
      flags |= 1 << (26 + ch.charCodeAt(0) - 'a'.charCodeAt(0));
    }
  }

  return negative ? -flags : flags;
}

/**
 * Convert legacy dice string format to structured data.
 * Legacy format: "NdS+P" (e.g., "5d8+100", "1d6+0", "3d10-5").
 * Already implemented in Dice.ts as parseDiceString, this version
 * handles the legacy format variations more robustly.
 */
export interface LegacyDice {
  count: number;
  sides: number;
  plus: number;
}

export function parseLegacyDice(str: string): LegacyDice {
  const match = str.match(/^(\d+)\s*d\s*(\d+)\s*([+-]\s*\d+)?$/i);
  if (!match) {
    return { count: 0, sides: 0, plus: parseInt(str, 10) || 0 };
  }
  return {
    count: parseInt(match[1]!, 10),
    sides: parseInt(match[2]!, 10),
    plus: match[3] ? parseInt(match[3].replace(/\s/g, ''), 10) : 0,
  };
}

/**
 * Convert legacy position string to Position enum value.
 * Handles both numeric and string formats.
 */
const POSITION_MAP: Record<string, number> = {
  dead: 0, mortal: 1, incapacitated: 2, stunned: 3,
  sleeping: 4, resting: 5, sitting: 6, fighting: 7,
  standing: 8, mounted: 9, shove: 10, drag: 11,
  evasive: 12, defensive: 13, aggressive: 14, berserk: 15,
};

export function parseLegacyPosition(str: string): number {
  const num = parseInt(str, 10);
  if (!isNaN(num)) return num;
  return POSITION_MAP[str.toLowerCase()] ?? 8; // default standing
}

/**
 * Convert legacy sex string to Sex enum value.
 */
const SEX_MAP: Record<string, number> = {
  neutral: 0, neuter: 0, male: 1, female: 2,
};

export function parseLegacySex(str: string): number {
  const num = parseInt(str, 10);
  if (!isNaN(num)) return num;
  return SEX_MAP[str.toLowerCase()] ?? 0;
}

/**
 * Convert legacy sector type string to SectorType enum value.
 */
const SECTOR_MAP: Record<string, number> = {
  inside: 0, city: 1, field: 2, forest: 3,
  hills: 4, mountain: 5, water_swim: 6, water_noswim: 7,
  underwater: 8, air: 9, desert: 10, unknown: 11,
  oceanfloor: 12, underground: 13, lava: 14, swamp: 15,
};

export function parseLegacySector(str: string): number {
  const num = parseInt(str, 10);
  if (!isNaN(num)) return num;
  return SECTOR_MAP[str.toLowerCase()] ?? 0;
}

/**
 * Convert legacy item type string to ItemType enum value.
 */
const ITEM_TYPE_MAP: Record<string, number> = {
  none: 0, light: 1, scroll: 2, wand: 3, staff: 4, weapon: 5,
  treasure: 8, armor: 9, potion: 10, furniture: 12, trash: 13,
  container: 15, drink_con: 17, key: 18, food: 19, money: 20,
  boat: 22, corpse_npc: 23, corpse_pc: 24, fountain: 25,
  pill: 26, blood: 27, bloodstain: 28, scraps: 29, pipe: 30,
  herb_con: 31, herb: 32, incense: 33, fire: 34, book: 35,
  switch: 36, lever: 37, pullchain: 38, button: 39,
  dial: 40, rune: 41, runepouch: 42, match: 43,
  trap: 44, map: 45, portal: 46, paper: 47,
  tinder: 48, lockpick: 49, spike: 50, disease: 51,
  oil: 52, fuel: 53, piece: 69,
};

export function parseLegacyItemType(str: string): number {
  const num = parseInt(str, 10);
  if (!isNaN(num)) return num;
  return ITEM_TYPE_MAP[str.toLowerCase()] ?? 0;
}

/**
 * Convert a legacy "tilde file" reader position to JSON-friendly data.
 * Parses the common "read next field" pattern from legacy .are files.
 */
export class LegacyFieldReader {
  private content: string;
  private pos: number;

  constructor(content: string) {
    this.content = content;
    this.pos = 0;
  }

  /** Read a tilde-terminated string (legacy format). */
  readString(): string {
    this.skipWhitespace();
    const start = this.pos;
    const end = this.content.indexOf('~', this.pos);
    if (end === -1) {
      this.pos = this.content.length;
      return this.content.substring(start).trim();
    }
    this.pos = end + 1;
    return this.content.substring(start, end).trim();
  }

  /** Read a number (handles negatives). Replicates legacy fread_number(). */
  readNumber(): number {
    this.skipWhitespace();
    const start = this.pos;
    if (this.content[this.pos] === '-' || this.content[this.pos] === '+') this.pos++;
    while (this.pos < this.content.length && /\d/.test(this.content[this.pos]!)) this.pos++;
    return parseInt(this.content.substring(start, this.pos), 10) || 0;
  }

  /** Read a single non-whitespace word. Replicates legacy fread_word(). */
  readWord(): string {
    this.skipWhitespace();
    const start = this.pos;
    while (this.pos < this.content.length && !this.isWhitespace(this.content[this.pos]!)) {
      this.pos++;
    }
    return this.content.substring(start, this.pos);
  }

  /** Read a single non-whitespace character. Replicates legacy fread_letter(). */
  readLetter(): string {
    this.skipWhitespace();
    if (this.pos >= this.content.length) return '';
    return this.content[this.pos++]!;
  }

  /** Skip to end of current line. Replicates legacy fread_to_eol(). */
  readToEol(): string {
    const start = this.pos;
    while (this.pos < this.content.length && this.content[this.pos] !== '\n') this.pos++;
    const line = this.content.substring(start, this.pos).trim();
    if (this.pos < this.content.length) this.pos++; // skip the \n
    return line;
  }

  /** Read a vnum (skip leading # if present). */
  readVnum(): number {
    this.skipWhitespace();
    if (this.content[this.pos] === '#') this.pos++;
    return this.readNumber();
  }

  /** Read a legacy flag value (letter-encoded or numeric). */
  readFlag(): number {
    const word = this.readWord();
    return parseLegacyFlagLetters(word);
  }

  /** Read a legacy bitvector (possibly multi-word with & separator). */
  readBitvector(): bigint {
    const word = this.readWord();
    return parseLegacyBitvector(word);
  }

  /** Peek at the next character without advancing. */
  peek(): string {
    this.skipWhitespace();
    return this.content[this.pos] ?? '';
  }

  /** Peek at the next word without advancing. */
  peekWord(): string {
    const saved = this.pos;
    const word = this.readWord();
    this.pos = saved;
    return word;
  }

  /** Check if we've reached the end of content. */
  get isEof(): boolean {
    return this.pos >= this.content.length;
  }

  /** Get current position (for error reporting). */
  get position(): number {
    return this.pos;
  }

  /** Get line number at current position (for error reporting). */
  get lineNumber(): number {
    return this.content.substring(0, this.pos).split('\n').length;
  }

  private skipWhitespace(): void {
    while (this.pos < this.content.length && this.isWhitespace(this.content[this.pos]!)) {
      this.pos++;
    }
  }

  private isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n';
  }
}
```

---

### 5. `src/utils/TimeUtils.ts` — Time and Date Utilities

Create time-related utility functions for the in-game time system, real-time conversions, and pulse-based timing helpers.

```typescript
// src/utils/TimeUtils.ts

/**
 * Time utilities for the MUD engine.
 * Handles conversion between real time and game time,
 * pulse counting, and formatted time display.
 */

/** Game time constants matching legacy values. */
export const HOURS_PER_DAY    = 24;
export const DAYS_PER_WEEK    = 7;
export const DAYS_PER_MONTH   = 35;
export const MONTHS_PER_YEAR  = 17;
export const SECONDS_PER_TICK = 70;

/** Day names matching legacy (Sunday through Saturday). */
export const DAY_NAMES: readonly string[] = [
  'the Moon', 'the Bull', 'Deception', 'Thunder',
  'Freedom', 'the Great Gods', 'the Sun',
];

/** Month names matching legacy (17 months). */
export const MONTH_NAMES: readonly string[] = [
  'Winter', 'the Winter Wolf', 'the Frost Giant', 'the Old Forces',
  'the Grand Struggle', 'the Spring', 'Nature', 'Futility',
  'the Dragon', 'the Sun', 'the Heat', 'the Battle',
  'the Dark Shades', 'the Shadows', 'the Long Shadows',
  'the Ancient Darkness', 'the Great Evil',
];

/** Sun position constants. */
export enum SunPosition {
  Dark  = 0,
  Rise  = 1,
  Light = 2,
  Set   = 3,
}

/** Sky condition constants. */
export enum SkyCondition {
  Cloudless  = 0,
  Cloudy     = 1,
  Raining    = 2,
  Lightning  = 3,
}

export interface GameTime {
  hour: number;    // 0–23
  day: number;     // 0–34
  month: number;   // 0–16
  year: number;
}

export interface WeatherData {
  temperature: number;
  pressure: number;
  change: number;
  sky: SkyCondition;
  sunlight: SunPosition;
}

/**
 * Convert real-world elapsed seconds to game time.
 * In legacy, 1 game hour = 1 real-world PULSE_TICK (~70 seconds).
 */
export function realSecondsToGameHours(seconds: number): number {
  return Math.floor(seconds / SECONDS_PER_TICK);
}

/**
 * Calculate game time from total game hours elapsed since epoch.
 */
export function gameTimeFromHours(totalHours: number): GameTime {
  const hour  = totalHours % HOURS_PER_DAY;
  const totalDays = Math.floor(totalHours / HOURS_PER_DAY);
  const day   = totalDays % DAYS_PER_MONTH;
  const totalMonths = Math.floor(totalDays / DAYS_PER_MONTH);
  const month = totalMonths % MONTHS_PER_YEAR;
  const year  = Math.floor(totalMonths / MONTHS_PER_YEAR);
  return { hour, day, month, year };
}

/**
 * Format game time as a human-readable string.
 * Replicates legacy do_time() output.
 */
export function formatGameTime(time: GameTime): string {
  const dayOfWeek = DAY_NAMES[time.day % DAYS_PER_WEEK] ?? 'unknown';
  const monthName = MONTH_NAMES[time.month] ?? 'unknown';
  return `It is ${time.hour} o'clock ${time.hour >= 12 ? 'pm' : 'am'}, ` +
    `Day of ${dayOfWeek}, ${time.day + 1}th the Month of ${monthName}, ` +
    `Year ${time.year}.`;
}

/**
 * Determine sun position from the hour.
 * Replicates legacy sunlight calculation.
 */
export function getSunPosition(hour: number): SunPosition {
  if (hour < 5 || hour >= 21) return SunPosition.Dark;
  if (hour < 6)  return SunPosition.Rise;
  if (hour < 19) return SunPosition.Light;
  return SunPosition.Set;
}

/**
 * Format played time in a human-readable string.
 * Input is total seconds played.
 */
export function formatPlayedTime(totalSeconds: number): string {
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0)    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0)   parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return parts.length > 0 ? parts.join(', ') : '0 minutes';
}

/**
 * Convert pulses to real-time milliseconds.
 */
export function pulsesToMs(pulses: number): number {
  return pulses * 250; // 4 pulses per second = 250ms per pulse
}

/**
 * Convert real-time milliseconds to pulses.
 */
export function msToPulses(ms: number): number {
  return Math.floor(ms / 250);
}
```

---

### 6. `src/utils/AnsiColors.ts` — Extended Color System

Extend the Phase 3B implementation with additional color processing functions:

#### New Functions to Add

- **`wordWrap(text, width)`** — Enhanced word-wrap that tracks active color state across line breaks. When a line is broken, the active color code is re-emitted at the start of the next line to prevent color bleed.

```typescript
/**
 * Word-wrap text at the specified visible character width, preserving
 * color codes across line breaks.
 * Replicates legacy word wrapping with color awareness.
 */
export function wordWrap(text: string, width: number = 78): string {
  if (!text) return '';
  const lines = text.split('\n');
  const result: string[] = [];
  let activeColor = '';

  for (const line of lines) {
    if (colorStrlen(line) <= width) {
      result.push(activeColor + line);
      // Track color state at end of line
      activeColor = getActiveColor(activeColor + line);
      continue;
    }

    // Need to wrap this line
    let remaining = line;
    while (colorStrlen(remaining) > width) {
      const { line: wrapped, rest } = splitAtWidth(activeColor + remaining, width);
      result.push(wrapped);
      activeColor = getActiveColor(wrapped);
      remaining = rest;
    }
    if (remaining) {
      result.push(activeColor + remaining);
      activeColor = getActiveColor(activeColor + remaining);
    }
  }

  return result.join('\r\n');
}

/**
 * Track the last active SMAUG color code in a string.
 * Returns the last color code found, or empty string if reset.
 */
function getActiveColor(text: string): string {
  let lastColor = '';
  const regex = /([&^}][a-zA-Z0-9])/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1] === '&D' || match[1] === '&d') {
      lastColor = '';
    } else {
      lastColor = match[1]!;
    }
  }
  return lastColor;
}

/**
 * Split a color-coded string at a visible character width boundary.
 * Returns the portion that fits and the remainder.
 */
function splitAtWidth(text: string, width: number): { line: string; rest: string } {
  let visCount = 0;
  let lastSpace = -1;
  let lastSpaceVis = 0;
  let i = 0;

  while (i < text.length && visCount < width) {
    // Skip SMAUG color codes
    if ((text[i] === '&' || text[i] === '^' || text[i] === '}') &&
        i + 1 < text.length && /[a-zA-Z0-9]/.test(text[i + 1]!)) {
      i += 2;
      continue;
    }
    // Skip ANSI escape sequences
    if (text[i] === '\x1b' && text[i + 1] === '[') {
      while (i < text.length && text[i] !== 'm') i++;
      i++;
      continue;
    }

    if (text[i] === ' ') {
      lastSpace = i;
      lastSpaceVis = visCount;
    }
    visCount++;
    i++;
  }

  if (visCount < width || i >= text.length) {
    return { line: text, rest: '' };
  }

  // Try to break at a word boundary
  if (lastSpace > 0 && lastSpaceVis > width * 0.3) {
    return {
      line: text.substring(0, lastSpace),
      rest: text.substring(lastSpace + 1),
    };
  }

  return { line: text.substring(0, i), rest: text.substring(i) };
}
```

- **`colorizeByThreshold(value, max, format?)`** — Colorize a number based on its percentage of max. Used for HP/mana/move displays: green (>75%), yellow (25–75%), red (<25%).

```typescript
export function colorizeByThreshold(value: number, max: number, format?: string): string {
  const ratio = max > 0 ? value / max : 0;
  let color: string;
  if (ratio > 0.75) color = '&G';
  else if (ratio > 0.50) color = '&Y';
  else if (ratio > 0.25) color = '&O';
  else color = '&R';

  const text = format ?? String(value);
  return `${color}${text}&D`;
}
```

---

### 7. `src/utils/Tables.ts` — Game Data Tables

Create a centralised module for all game data lookup tables that are used across multiple subsystems. These replicate the legacy `tables.c` data.

```typescript
// src/utils/Tables.ts

/**
 * Centralised game data tables.
 * Replicates legacy tables.c — class/race definitions,
 * language tables, title tables, and other static data.
 */

/** Race definition structure matching legacy race_type. */
export interface RaceDefinition {
  name: string;
  classRestrictions: number;  // Bitvector of restricted classes
  strMod: number; intMod: number; wisMod: number;
  dexMod: number; conMod: number; chaMod: number; lckMod: number;
  hitMod: number; manaMod: number; moveMod: number;
  resistances: number;  // RIS bitvector
  susceptibilities: number;
  language: number;  // Default language
  minAlign: number;
  maxAlign: number;
  expMultiplier: number;  // Experience multiplier (100 = normal)
  height: number;  // Average height
  weight: number;  // Average weight
  affectedBy: bigint;  // Default AFF_ flags
  attacks: number;  // Natural attack bitvector
  defenses: number;  // Natural defense bitvector
}

/** Race table — index matches legacy race numbers exactly. */
export const RACE_TABLE: readonly RaceDefinition[] = [
  { name: 'human',     classRestrictions: 0, strMod: 0, intMod: 0, wisMod: 0, dexMod: 0, conMod: 0, chaMod: 0, lckMod: 0, hitMod: 0, manaMod: 0, moveMod: 0, resistances: 0, susceptibilities: 0, language: 0, minAlign: -1000, maxAlign: 1000, expMultiplier: 100, height: 66, weight: 150, affectedBy: 0n, attacks: 0, defenses: 0 },
  { name: 'elf',       classRestrictions: 0, strMod: -1, intMod: 1, wisMod: 1, dexMod: 1, conMod: -2, chaMod: 1, lckMod: 0, hitMod: -2, manaMod: 3, moveMod: 1, resistances: 0, susceptibilities: 0, language: 1, minAlign: -1000, maxAlign: 1000, expMultiplier: 105, height: 60, weight: 110, affectedBy: 0n, attacks: 0, defenses: 0 },
  { name: 'dwarf',     classRestrictions: 0, strMod: 1, intMod: -1, wisMod: 0, dexMod: -1, conMod: 2, chaMod: -1, lckMod: 0, hitMod: 2, manaMod: -3, moveMod: 0, resistances: 0, susceptibilities: 0, language: 2, minAlign: -1000, maxAlign: 1000, expMultiplier: 108, height: 48, weight: 160, affectedBy: 0n, attacks: 0, defenses: 0 },
  { name: 'halfling',  classRestrictions: 0, strMod: -2, intMod: 0, wisMod: 0, dexMod: 2, conMod: 0, chaMod: 0, lckMod: 1, hitMod: -1, manaMod: 0, moveMod: 2, resistances: 0, susceptibilities: 0, language: 3, minAlign: -1000, maxAlign: 1000, expMultiplier: 103, height: 36, weight: 70, affectedBy: 0n, attacks: 0, defenses: 0 },
  { name: 'pixie',     classRestrictions: 0, strMod: -3, intMod: 2, wisMod: 1, dexMod: 3, conMod: -3, chaMod: 1, lckMod: 1, hitMod: -4, manaMod: 5, moveMod: 3, resistances: 0, susceptibilities: 0, language: 4, minAlign: -1000, maxAlign: 1000, expMultiplier: 115, height: 16, weight: 15, affectedBy: 0n, attacks: 0, defenses: 0 },
  // Additional races added in downstream phases (half-orc, half-elf, gith, drow, etc.)
];

/** Class definition structure matching legacy class_type. */
export interface ClassDefinition {
  name: string;
  abbrev: string;
  attrPrime: number;  // Primary stat index (0=str, 1=int, etc.)
  weapon: number;  // Starting weapon vnum
  guild: number;  // Guild room vnum
  skillAdept: number;  // Max skill percentage (95 for most, 85 for warriors)
  toHitBase: number;  // Base THAC0
  toHitPerLevel: number;  // THAC0 improvement per level
  hpMin: number;  // Min HP per level
  hpMax: number;  // Max HP per level
  manaEnabled: boolean;  // Whether class uses mana
  baseThac0: number;  // Starting THAC0 (for legacy compat)
  expBase: number;  // Base experience multiplier
}

/** Class table — index matches legacy class numbers exactly. */
export const CLASS_TABLE: readonly ClassDefinition[] = [
  { name: 'mage',     abbrev: 'Mag', attrPrime: 1, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 20, toHitPerLevel: 3, hpMin: 6, hpMax: 10, manaEnabled: true, baseThac0: 20, expBase: 1000 },
  { name: 'cleric',   abbrev: 'Cle', attrPrime: 2, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 18, toHitPerLevel: 3, hpMin: 7, hpMax: 12, manaEnabled: true, baseThac0: 18, expBase: 1000 },
  { name: 'thief',    abbrev: 'Thi', attrPrime: 3, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 18, toHitPerLevel: 2, hpMin: 8, hpMax: 13, manaEnabled: false, baseThac0: 18, expBase: 1000 },
  { name: 'warrior',  abbrev: 'War', attrPrime: 0, weapon: 0, guild: 0, skillAdept: 85, toHitBase: 16, toHitPerLevel: 2, hpMin: 11, hpMax: 15, manaEnabled: false, baseThac0: 16, expBase: 1000 },
  { name: 'vampire',  abbrev: 'Vam', attrPrime: 0, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 16, toHitPerLevel: 2, hpMin: 10, hpMax: 14, manaEnabled: true, baseThac0: 16, expBase: 1200 },
  { name: 'druid',    abbrev: 'Dru', attrPrime: 2, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 18, toHitPerLevel: 3, hpMin: 7, hpMax: 12, manaEnabled: true, baseThac0: 18, expBase: 1000 },
  { name: 'ranger',   abbrev: 'Ran', attrPrime: 2, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 17, toHitPerLevel: 2, hpMin: 9, hpMax: 14, manaEnabled: true, baseThac0: 17, expBase: 1100 },
  { name: 'augurer',  abbrev: 'Aug', attrPrime: 2, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 18, toHitPerLevel: 3, hpMin: 7, hpMax: 11, manaEnabled: true, baseThac0: 18, expBase: 1000 },
  { name: 'paladin',  abbrev: 'Pal', attrPrime: 0, weapon: 0, guild: 0, skillAdept: 90, toHitBase: 17, toHitPerLevel: 2, hpMin: 10, hpMax: 14, manaEnabled: true, baseThac0: 17, expBase: 1100 },
  { name: 'nephandi', abbrev: 'Nep', attrPrime: 1, weapon: 0, guild: 0, skillAdept: 95, toHitBase: 20, toHitPerLevel: 3, hpMin: 6, hpMax: 10, manaEnabled: true, baseThac0: 20, expBase: 1050 },
  { name: 'savage',   abbrev: 'Sav', attrPrime: 0, weapon: 0, guild: 0, skillAdept: 85, toHitBase: 16, toHitPerLevel: 2, hpMin: 12, hpMax: 16, manaEnabled: false, baseThac0: 16, expBase: 1000 },
];

/** Language definitions matching legacy lang_array. */
export interface LanguageDefinition {
  name: string;
  flag: number;  // Language bitvector flag
}

export const LANGUAGE_TABLE: readonly LanguageDefinition[] = [
  { name: 'common',    flag: 0 },
  { name: 'elvish',    flag: 1 },
  { name: 'dwarven',   flag: 2 },
  { name: 'pixie',     flag: 3 },
  { name: 'ogre',      flag: 4 },
  { name: 'orcish',    flag: 5 },
  { name: 'trollish',  flag: 6 },
  { name: 'rodent',    flag: 7 },
  { name: 'insectoid', flag: 8 },
  { name: 'mammal',    flag: 9 },
  { name: 'reptile',   flag: 10 },
  { name: 'dragon',    flag: 11 },
  { name: 'spiritual', flag: 12 },
  { name: 'magical',   flag: 13 },
  { name: 'goblin',    flag: 14 },
  { name: 'god',       flag: 15 },
  { name: 'ancient',   flag: 16 },
  { name: 'halfling',  flag: 17 },
  { name: 'clan',      flag: 18 },
  { name: 'gith',      flag: 19 },
];

/**
 * Look up a race definition by name (case-insensitive).
 */
export function findRace(name: string): RaceDefinition | undefined {
  return RACE_TABLE.find(r => r.name.toLowerCase() === name.toLowerCase());
}

/**
 * Look up a race index by name (case-insensitive).
 * Returns -1 if not found.
 */
export function findRaceIndex(name: string): number {
  return RACE_TABLE.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
}

/**
 * Look up a class definition by name (case-insensitive).
 */
export function findClass(name: string): ClassDefinition | undefined {
  return CLASS_TABLE.find(c => c.name.toLowerCase() === name.toLowerCase());
}

/**
 * Look up a class index by name (case-insensitive).
 * Returns -1 if not found.
 */
export function findClassIndex(name: string): number {
  return CLASS_TABLE.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
}

/**
 * Look up a language by name (case-insensitive).
 */
export function findLanguage(name: string): LanguageDefinition | undefined {
  return LANGUAGE_TABLE.find(l => l.name.toLowerCase() === name.toLowerCase());
}

/**
 * Maximum stat value for a given race and stat index.
 * Replicates legacy get_curr_stat() capping.
 */
export function getMaxStat(race: number, statIndex: number): number {
  const raceDef = RACE_TABLE[race];
  if (!raceDef) return 18;
  const mods = [raceDef.strMod, raceDef.intMod, raceDef.wisMod,
                raceDef.dexMod, raceDef.conMod, raceDef.chaMod, raceDef.lckMod];
  return 18 + (mods[statIndex] ?? 0);
}

/**
 * Title table — formatted titles by class and level.
 * Returns the appropriate title string.
 */
export function getTitle(classIndex: number, level: number, sex: number): string {
  // Simplified title generation — legacy has extensive per-class/level/sex tables
  const cls = CLASS_TABLE[classIndex];
  if (!cls) return 'the Adventurer';
  if (level >= 50) return `the ${cls.name} Lord`;
  if (level >= 40) return `the ${cls.name} Master`;
  if (level >= 30) return `the ${cls.name} Adept`;
  if (level >= 20) return `the ${cls.name} Veteran`;
  if (level >= 10) return `the ${cls.name} Apprentice`;
  return `the ${cls.name} Novice`;
}
```

---

## Tests for Sub-Phase 3C

### `tests/unit/utils/StringUtilsExtended.test.ts`

- Test `isNameExact("sword", "long sword dagger")` returns `true`; `isNameExact("swo", "long sword dagger")` returns `false`.
- Test `allNamePrefix("old man", "old wise man wizard")` returns `true`; `allNamePrefix("young man", "old wise man")` returns `false`.
- Test `trimTilde("Hello~World")` returns `"Hello"`.
- Test `aOrAn("apple")` returns `"an"`; `aOrAn("sword")` returns `"a"`.
- Test `stripCr("Hello\r\nWorld\r\n")` returns `"Hello\nWorld\n"`.
- Test `wordWrap` with a long string at width 40, verify no line exceeds 40 visible chars.
- Test `truncate("Hello World and more", 15)` returns `"Hello World..."`.
- Test `pluralize(1, "hit")` returns `"hit"`; `pluralize(3, "hit")` returns `"hits"`.
- Test `centerText("Title", 20)` returns a 20-character string with "Title" centered.
- Test `actSubstitute("$n hits $N", {name: "Orc", sex: 1}, {name: "Player", sex: 2})` returns `"Orc hits Player"`.
- Test `actSubstitute` with all pronoun tokens (`$e`, `$m`, `$s`, `$E`, `$M`, `$S`).

### `tests/unit/utils/TextFormatter.test.ts`

- Test `horizontalRule(40, '=')` returns a 40-character string of `=`.
- Test `keyValueLine("HP", "100/100", 40)` produces a properly padded line.
- Test `formatColumns` with a 3×3 grid, verify alignment.
- Test `progressBar(75, 100, 20)` produces a bar that is 75% filled.
- Test `formatNumber(1234567)` returns `"1,234,567"`.
- Test `formatDuration(280)` returns `"70s"` (280 pulses ÷ 4 = 70 seconds).
- Test `formatAlignment(1000)` returns a string containing `"angelic"`.
- Test `formatPosition(8)` returns `"standing"`.
- Test `textBox` produces correctly framed output with border characters.
- Test `formatPrompt` substitutes all tokens correctly.

### `tests/unit/utils/FileIO.test.ts`

- Test `readFileSafe` with existing file returns content; with non-existent file returns null.
- Test `readJsonFile` with valid JSON returns parsed object; with invalid JSON returns null.
- Test `readJsonFileRequired` with missing file throws error.
- Test `writeJsonFile` creates file and parent directories.
- Test `listSubdirectories` returns only directories, sorted.
- Test `listFiles` filters by extension correctly.
- Test `exists` returns true for existing files, false for missing.

### `tests/unit/utils/LegacyConverter.test.ts`

- Test `parseLegacyBitvector("0")` returns `0n`.
- Test `parseLegacyBitvector("8")` returns `8n`.
- Test `parseLegacyBitvector("1&0&0")` returns `1n`.
- Test `parseLegacyBitvector("0&1")` returns `4294967296n` (1 << 32).
- Test `toLegacyBitvector(8n)` returns `"8"`.
- Test roundtrip: `parseLegacyBitvector(toLegacyBitvector(x))` equals `x` for various values.
- Test `parseLegacyFlagLetters("A")` returns 1; `parseLegacyFlagLetters("AB")` returns 3; `parseLegacyFlagLetters("123")` returns 123.
- Test `parseLegacyDice("5d8+100")` returns `{count: 5, sides: 8, plus: 100}`.
- Test `parseLegacyPosition("standing")` returns 8; `parseLegacyPosition("4")` returns 4.
- Test `parseLegacySex("female")` returns 2; `parseLegacySex("1")` returns 1.
- Test `LegacyFieldReader` reads strings, numbers, words, vnums in sequence from a sample `.are` fragment.

### `tests/unit/utils/TimeUtils.test.ts`

- Test `realSecondsToGameHours(70)` returns 1; `realSecondsToGameHours(140)` returns 2.
- Test `gameTimeFromHours(0)` returns `{hour: 0, day: 0, month: 0, year: 0}`.
- Test `gameTimeFromHours(24)` returns `{hour: 0, day: 1, month: 0, year: 0}`.
- Test `gameTimeFromHours(24 * 35)` returns `{hour: 0, day: 0, month: 1, year: 0}`.
- Test `getSunPosition(3)` returns `Dark`; `getSunPosition(5)` returns `Rise`; `getSunPosition(12)` returns `Light`.
- Test `formatPlayedTime(90061)` returns `"1 day, 1 hour, 1 minute"`.
- Test `pulsesToMs(4)` returns `1000`; `msToPulses(1000)` returns `4`.

### `tests/unit/utils/Tables.test.ts`

- Test `findRace("elf")` returns the elf definition with `strMod: -1`.
- Test `findRaceIndex("dwarf")` returns 2.
- Test `findClass("warrior")` returns a definition with `hpMax: 15`.
- Test `findClassIndex("mage")` returns 0.
- Test `findLanguage("elvish")` returns `{name: "elvish", flag: 1}`.
- Test `getMaxStat(1, 0)` (elf, str) returns 17 (18 + (-1)).
- Test `getTitle(3, 50, 1)` returns a string containing `"warrior"` (case-insensitive).

### `tests/unit/utils/AnsiColorsExtended.test.ts`

- Test `wordWrap` preserves color codes across line breaks.
- Test `wordWrap("&RThis is a very long red line that should be wrapped at some point&D", 30)` — verify each line starts with `&R` and none exceeds 30 visible characters.
- Test `colorizeByThreshold(80, 100)` produces a green-colored string.
- Test `colorizeByThreshold(20, 100)` produces a red-colored string.

---

## Acceptance Criteria

- [ ] `isNameExact("sword", "long sword dagger")` returns `true`; partial match `isNameExact("swo", "...")` returns `false`.
- [ ] `allNamePrefix("old man", "old wise man wizard")` returns `true`.
- [ ] `trimTilde("Hello~World")` returns `"Hello"`.
- [ ] `actSubstitute("$n hits $N with $s fist", ch, vict)` produces correct pronoun substitution for all three genders.
- [ ] `horizontalRule(40, '=')` returns a 40-character string of `=`.
- [ ] `formatPrompt("%h/%H hp %m/%M mana", data)` produces `"100/200 hp 50/100 mana"` with correct values.
- [ ] `readJsonFile("valid.json")` returns parsed object; `readJsonFile("missing.json")` returns null without throwing.
- [ ] `listSubdirectories("./world")` returns sorted list of area directories.
- [ ] `parseLegacyBitvector("0&1")` returns `4294967296n` (2^32).
- [ ] `parseLegacyFlagLetters("AB")` returns `3`.
- [ ] `LegacyFieldReader` correctly reads a multi-field legacy `.are` fragment: tilde-strings, numbers, vnums, and flags in sequence.
- [ ] `gameTimeFromHours(24 * 35 * 17)` wraps to `{hour: 0, day: 0, month: 0, year: 1}`.
- [ ] `getSunPosition(12)` returns `SunPosition.Light`.
- [ ] `findRace("elf")` returns the correct race definition with `strMod: -1`.
- [ ] `findClass("warrior")` returns a definition where `manaEnabled === false`.
- [ ] `wordWrap` with color codes re-emits the active color at the start of each wrapped line.
- [ ] `colorizeByThreshold(80, 100)` produces a string starting with the green color code.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
