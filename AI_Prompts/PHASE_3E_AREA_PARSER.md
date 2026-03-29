# SMAUG 2.0 TypeScript Port — Phase 3E: Legacy Area File Parser

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phases 3A through 3D have established the complete project infrastructure and world loading system. The project scaffold (package.json, tsconfig.json, ESLint, Vitest, Prisma schema, all stub files) exists. The core engine (EventBus, TickEngine, GameLoop), network layer (WebSocket/Socket.IO, ConnectionManager, Descriptor), comprehensive utility layer (Logger, AnsiColors, Dice, BitVector, StringUtils with `actSubstitute`, TextFormatter, FileIO helpers, LegacyConverter with `LegacyFieldReader`, TimeUtils, Tables), and the complete world loading system (VnumRegistry, Room/Area entities, ResetEngine, AreaManager with JSON loading, exit resolution, and area reset lifecycle) are all implemented and tested. The game world can be populated from JSON files. This phase implements the migration pipeline that converts legacy `.are` text files into the JSON format consumed by the world loader.
>
> **Your role:** You are an expert TypeScript/Node.js engineer with deep knowledge of MUD engine architecture. You have access to five reference documents that describe the legacy C codebase in exhaustive detail:
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `COMMANDS.md` — Full command table with trust levels, positions, and flags
> - `STRUCTURE.md` — File inventory and subsystem grouping

## Cardinal Rules (apply to ALL code you produce)

1. **Preserve legacy gameplay exactly.** Every formula, threshold, constant, and order-of-operations must match the C original. When the architecture doc says "replicates legacy X", implement it verbatim.
2. **Use the scaffolded file paths.** Do not create new files or rename existing ones. Every file referenced below already exists as a stub from earlier phases.
3. **Follow the TypeScript patterns established in ARCHITECTURE.md.** Use the exact class names, method signatures, enum values, and interface shapes defined there.
4. **Emit EventBus events** at every documented hook point so that downstream systems (MUDprogs, logging, admin dashboard) can subscribe.
5. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
6. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`, `roomFlags`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
7. **Handle edge cases defensively.** Check for malformed input, truncated sections, missing terminators, out-of-range vnums, and corrupt data. Log warnings rather than crashing. A single malformed entry must not abort the entire file parse.
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
│   ├── utils/              # AnsiColors, Dice, StringUtils, BitVector, Logger, TextFormatter, FileIO, LegacyConverter, TimeUtils, Tables
│   └── migration/          # AreFileParser, PlayerFileParser, MigrationRunner
├── prisma/schema.prisma
├── world/                  # JSON world data files (one subdirectory per area)
│   ├── midgaard/           # Example area: Midgaard city
│   │   ├── area.json
│   │   ├── rooms.json
│   │   ├── mobiles.json
│   │   ├── objects.json
│   │   ├── resets.json
│   │   ├── shops.json
│   │   └── programs.json
│   └── ...
├── tests/                  # Unit, integration, e2e tests
│   └── fixtures/
│       └── legacyFiles/    # Test .are files for parser testing
│           └── test.are
└── public/                 # Browser client and admin dashboard static files
```

## Prior Sub-Phases Completed

**Sub-Phase 3A (Project Initialisation)** — Complete. Full project scaffold with all dependencies and configuration.

**Sub-Phase 3B (Core Infrastructure)** — Complete. EventBus (72 events), TickEngine (6 pulse counters), GameLoop (250ms), Logger, AnsiColors, Dice, BitVector, StringUtils, WebSocketServer, ConnectionManager, entity type definitions, and main.ts entry point.

**Sub-Phase 3C (Utilities & Helpers)** — Complete. The following utility modules are fully implemented and tested:

| Module | File | Status |
|---|---|---|
| StringUtils (extended) | `src/utils/StringUtils.ts` | `isNameExact()`, `allNamePrefix()`, `trimTilde()`, `aOrAn()`, `stripCr()`, `wordWrap()`, `truncate()`, `pluralize()`, `centerText()`, `actSubstitute()` |
| TextFormatter | `src/utils/TextFormatter.ts` | `horizontalRule()`, `keyValueLine()`, `formatColumns()`, `progressBar()`, `formatNumber()`, `formatDuration()`, `formatAlignment()`, `formatPosition()`, `textBox()`, `formatPrompt()` |
| FileIO | `src/utils/FileIO.ts` | `readFileSafe()`, `readJsonFile()`, `readJsonFileRequired()`, `writeJsonFile()`, `listSubdirectories()`, `listFiles()`, `exists()`, `ensureDirectory()` |
| LegacyConverter | `src/utils/LegacyConverter.ts` | `parseLegacyBitvector()`, `toLegacyBitvector()`, `parseLegacyFlagLetters()`, `parseLegacyDice()`, `parseLegacyPosition()`, `parseLegacySex()`, `parseLegacySector()`, `parseLegacyItemType()`, `LegacyFieldReader` |
| TimeUtils | `src/utils/TimeUtils.ts` | Game time constants, `gameTimeFromHours()`, `formatGameTime()`, `getSunPosition()`, `pulsesToMs()` |
| Tables | `src/utils/Tables.ts` | `RACE_TABLE`, `CLASS_TABLE`, `LANGUAGE_TABLE`, `findRace()`, `findClass()`, `findLanguage()`, `getMaxStat()`, `getTitle()` |
| AnsiColors (extended) | `src/utils/AnsiColors.ts` | `wordWrap()` with color tracking, `colorizeByThreshold()` |

**Sub-Phase 3D (World Loader)** — Complete. The following world loading modules are fully implemented and tested:

| Module | File | Key Exports |
|---|---|---|
| VnumRegistry | `src/game/world/VnumRegistry.ts` | `registerRoom()`, `getRoom()`, `registerMobPrototype()`, `getMobPrototype()`, `registerObjPrototype()`, `getObjPrototype()`, `getNextFreeVnum()`, `getStats()`, `clear()` |
| Room Entity | `src/game/entities/Room.ts` | `Room` class with exits map, extra descriptions, character/contents lists, `hasFlag()`, `isDark`, `playerCount` |
| RoomExit | `src/game/entities/Room.ts` | `RoomExit` class with direction, flags, key, distance, `isClosed`, `isLocked`, `isDoor` |
| Area Entity | `src/game/entities/Area.ts` | `Area` class with vnum ranges, level ranges, economy, climate, reset commands, `createRoom()`, `containsRoomVnum()` |
| ResetEngine | `src/game/world/ResetEngine.ts` | `resetArea()`, `shouldReset()`, `createMobileInstance()`, `createObjectInstance()` — handles M/O/P/G/E/D/R reset commands |
| AreaManager | `src/game/world/AreaManager.ts` | `loadAllAreas()`, `loadArea()`, `loadRooms()`, `loadMobiles()`, `loadObjects()`, `loadResets()`, `loadShops()`, `loadPrograms()`, `resolveExits()`, `areaUpdate()` |
| RoomManager | `src/game/world/RoomManager.ts` | `reverseDirection()`, `directionName()`, `findPath()` (BFS), `isRoomFull()` |

**Do NOT modify any of the above completed implementations** unless explicitly extending them. You may import from them freely.

---

## Sub-Phase 3E Objective

Implement the complete legacy `.are` file parser and migration pipeline. SMAUG 2.0's original area files use a custom section-based text format with `~` string terminators, `#SECTION` headers, and space-delimited numeric values. This phase creates the `AreFileParser` class that reads these files and produces the exact JSON structures consumed by the Phase 3D AreaManager. It also implements the `PlayerFileParser` for legacy player saves and the `MigrationRunner` that orchestrates bulk conversion. After this phase, any existing SMAUG area file can be imported into the TypeScript engine.

---

## Files to Implement

### 1. `src/migration/AreFileParser.ts` — Legacy Area File Parser

Replace the stub with the complete area file parser. Replicates the parsing logic from `db.c:969-2527` in the legacy C source:

```typescript
// src/migration/AreFileParser.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/Logger.js';
import {
  parseLegacyBitvector, parseLegacyFlagLetters,
  parseLegacyDice, parseLegacyPosition, parseLegacySex,
  parseLegacySector, parseLegacyItemType
} from '../utils/LegacyConverter.js';

const logger = new Logger();

/**
 * Structured output from parsing a single .are file.
 * Each field maps directly to a JSON file consumed by AreaManager.
 */
export interface ParsedArea {
  area: AreaHeaderData;
  rooms: ParsedRoom[];
  mobiles: ParsedMobile[];
  objects: ParsedObject[];
  resets: ParsedReset[];
  shops: ParsedShop[];
  repairShops: ParsedRepairShop[];
  specials: ParsedSpecial[];
  programs: {
    mobProgs: ParsedMudProg[];
    objProgs: ParsedMudProg[];
    roomProgs: ParsedMudProg[];
  };
}

// ─── Sub-interfaces for each parsed entity type ──────────────────────

export interface AreaHeaderData {
  name: string;
  filename: string;
  author: string;
  credits: string;
  resetMessage: string;
  flags: number;
  resetFrequency: number;
  vnumRanges: {
    rooms: { low: number; high: number };
    mobiles: { low: number; high: number };
    objects: { low: number; high: number };
  };
  levelRange: {
    softLow: number;
    softHigh: number;
    hardLow: number;
    hardHigh: number;
  };
  economy: { highEconomy: number; lowEconomy: number };
  climate: { temp: number; precip: number; wind: number };
}

export interface ParsedRoom {
  vnum: number;
  name: string;
  description: string;
  sectorType: number;
  roomFlags: string; // Stored as string for bigint compatibility
  light: number;
  tunnel: number;
  teleport: { vnum: number; delay: number } | null;
  exits: ParsedExit[];
  extraDescriptions: Array<{ keywords: string[]; description: string }>;
}

export interface ParsedExit {
  direction: number;
  description: string;
  keyword: string;
  exitFlags: number;
  key: number;
  toVnum: number;
  distance: number;
  pull: number;
  pullType: number;
}

export interface ParsedMobile {
  vnum: number;
  name: string;
  shortDescription: string;
  longDescription: string;
  description: string;
  keywords: string[];
  complexity: 'S' | 'C' | 'V';
  level: number;
  sex: number;
  race: number;
  class: number;
  alignment: number;
  actFlags: string;     // String for bigint
  affectedBy: string;   // String for bigint
  position: number;
  defaultPosition: number;
  stats: {
    str: number; int: number; wis: number;
    dex: number; con: number; cha: number; lck: number;
  };
  combat: {
    hitDice: string;
    damDice: string;
    hitroll: number;
    damroll: number;
    armor: number;
    numAttacks: number;
    attacks: number;
    defenses: number;
  };
  savingThrows: {
    poison: number; rod: number; para: number;
    breath: number; spell: number;
  };
  ris: { immune: number; resistant: number; susceptible: number };
  economy: { gold: number; silver: number; copper: number; exp: number };
  languages: { speaking: number; speaks: number };
  specFun: string;
  stances: number[];
}

export interface ParsedObject {
  vnum: number;
  name: string;
  shortDescription: string;
  description: string;
  actionDescription: string;
  keywords: string[];
  itemType: number;
  level: number;
  weight: number;
  extraFlags: number;
  magicFlags: number;
  wearFlags: number;
  values: number[];
  cost: { gold: number; silver: number; copper: number };
  layers: number;
  timer: number;
  affects: Array<{ location: number; modifier: number }>;
  extraDescriptions: Array<{ keywords: string[]; description: string }>;
}

export interface ParsedReset {
  command: string;
  arg1: number;
  arg2: number;
  arg3: number;
  extra?: number;
}

export interface ParsedShop {
  keeperVnum: number;
  buyTypes: number[];
  profitBuy: number;
  profitSell: number;
  openHour: number;
  closeHour: number;
}

export interface ParsedRepairShop {
  keeperVnum: number;
  fixTypes: number[];
  profitFix: number;
  shopType: number;
  openHour: number;
  closeHour: number;
}

export interface ParsedSpecial {
  mobVnum: number;
  specFun: string;
}

export interface ParsedMudProg {
  entityVnum: number;
  trigger: string;
  argList: string;
  commandList: string;
}
```

**Core parser class:**

```typescript
/**
 * Parser for SMAUG 2.0 legacy .are files.
 *
 * The legacy format is section-based with #SECTION headers:
 *   #AREA, #MOBILES, #OBJECTS, #ROOMS, #RESETS, #SHOPS,
 *   #REPAIRSHOPS, #SPECIALS, #CLIMATE, #NEIGHBOR,
 *   #MUDPROGS, #OPROGS, #RPROGS, #END
 *
 * Strings are terminated with ~. Numbers are space-delimited.
 * Mobiles have three complexity levels: S (simple), C (basic), V (verbose/full).
 *
 * Replicates the parsing logic from db.c:969-2527 in the legacy C source.
 */
export class AreFileParser {
  private content: string = '';
  private pos: number = 0;
  private lineNumber: number = 1;
  private currentFile: string = '';

  /**
   * Parse a legacy .are file and return structured JSON data.
   * This is the main entry point for the parser.
   *
   * @param filePath — Absolute or relative path to the .are file.
   * @returns ParsedArea containing all sections.
   */
  async parseFile(filePath: string): Promise<ParsedArea> {
    this.currentFile = path.basename(filePath);
    this.content = await fs.readFile(filePath, 'utf-8');
    this.pos = 0;
    this.lineNumber = 1;

    const result: ParsedArea = {
      area: this.createDefaultAreaHeader(),
      rooms: [],
      mobiles: [],
      objects: [],
      resets: [],
      shops: [],
      repairShops: [],
      specials: [],
      programs: { mobProgs: [], objProgs: [], roomProgs: [] },
    };

    while (this.pos < this.content.length) {
      const section = this.readSection();
      if (!section) break;

      try {
        switch (section) {
          case '#AREA':
            result.area = this.parseAreaHeader();
            break;
          case '#MOBILES':
            result.mobiles = this.parseMobiles();
            break;
          case '#OBJECTS':
            result.objects = this.parseObjects();
            break;
          case '#ROOMS':
            result.rooms = this.parseRooms();
            break;
          case '#RESETS':
            result.resets = this.parseResets();
            break;
          case '#SHOPS':
            result.shops = this.parseShops();
            break;
          case '#REPAIRSHOPS':
            result.repairShops = this.parseRepairShops();
            break;
          case '#SPECIALS':
            result.specials = this.parseSpecials();
            break;
          case '#CLIMATE':
            this.parseClimate(result.area);
            break;
          case '#NEIGHBOR':
            this.skipToNextSection(); // Neighbor weather not needed for JSON
            break;
          case '#MUDPROGS':
            result.programs.mobProgs = this.parseMudProgs();
            break;
          case '#OPROGS':
            result.programs.objProgs = this.parseMudProgs();
            break;
          case '#RPROGS':
            result.programs.roomProgs = this.parseMudProgs();
            break;
          case '#END':
            // End of file marker — stop parsing
            break;
          default:
            logger.warn('migration',
              `${this.currentFile}:${this.lineNumber}: Unknown section '${section}' — skipping`);
            this.skipToNextSection();
        }
      } catch (err: any) {
        logger.error('migration',
          `${this.currentFile}:${this.lineNumber}: Error parsing section ${section}: ${err.message}`);
        this.skipToNextSection();
      }
    }

    // Apply specials to mobile data
    this.applySpecials(result);

    logger.info('migration',
      `Parsed ${this.currentFile}: ${result.rooms.length} rooms, ` +
      `${result.mobiles.length} mobs, ${result.objects.length} objects, ` +
      `${result.resets.length} resets`);

    return result;
  }

  /**
   * Write parsed area data to JSON files in the target directory.
   * Creates the directory structure expected by AreaManager.loadAllAreas().
   */
  async writeToJson(parsed: ParsedArea, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(
      path.join(outputDir, 'area.json'),
      JSON.stringify(parsed.area, null, 2)
    );
    await fs.writeFile(
      path.join(outputDir, 'rooms.json'),
      JSON.stringify(parsed.rooms, null, 2)
    );
    await fs.writeFile(
      path.join(outputDir, 'mobiles.json'),
      JSON.stringify(parsed.mobiles, null, 2)
    );
    await fs.writeFile(
      path.join(outputDir, 'objects.json'),
      JSON.stringify(parsed.objects, null, 2)
    );
    await fs.writeFile(
      path.join(outputDir, 'resets.json'),
      JSON.stringify(parsed.resets, null, 2)
    );

    if (parsed.shops.length > 0 || parsed.repairShops.length > 0) {
      await fs.writeFile(
        path.join(outputDir, 'shops.json'),
        JSON.stringify([...parsed.shops, ...parsed.repairShops], null, 2)
      );
    }

    const allPrograms = [
      ...parsed.programs.mobProgs,
      ...parsed.programs.objProgs,
      ...parsed.programs.roomProgs,
    ];
    if (allPrograms.length > 0) {
      await fs.writeFile(
        path.join(outputDir, 'programs.json'),
        JSON.stringify(parsed.programs, null, 2)
      );
    }

    logger.info('migration', `Wrote JSON files to ${outputDir}`);
  }

  // ─── Section Parsers ──────────────────────────────────────────────────

  /**
   * Parse #AREA section header.
   * Legacy format (SMAUG 2.0 extended format):
   *   Name~
   *   Filename~
   *   Author~
   *   Credits~
   *   <lowVnum> <highVnum>
   *   <softLow> <softHigh> <hardLow> <hardHigh>
   *   <resetFrequency> <flags>
   *   <resetMessage>~
   *
   * Some .are files use the simpler Merc/ROM format:
   *   <name>~ <first_vnum> <last_vnum>
   *
   * The parser detects the format by checking if the next non-whitespace
   * after the first tilde-string is a number (Merc format) or another
   * tilde-string (SMAUG format).
   */
  private parseAreaHeader(): AreaHeaderData {
    const header = this.createDefaultAreaHeader();

    header.name = this.readString();

    // Detect format: check if next token is a number (Merc) or string (SMAUG)
    this.skipWhitespace();
    if (this.isDigit(this.peek()) || this.peek() === '-') {
      // Merc/ROM format: name already read, now low high vnums
      const lowVnum = this.readNumber();
      const highVnum = this.readNumber();
      header.vnumRanges = {
        rooms: { low: lowVnum, high: highVnum },
        mobiles: { low: lowVnum, high: highVnum },
        objects: { low: lowVnum, high: highVnum },
      };
    } else {
      // SMAUG 2.0 extended format
      header.filename = this.readString();
      header.author = this.readString();
      header.credits = this.readString();

      // Vnum ranges
      const lowRoomVnum = this.readNumber();
      const highRoomVnum = this.readNumber();
      header.vnumRanges = {
        rooms: { low: lowRoomVnum, high: highRoomVnum },
        mobiles: { low: lowRoomVnum, high: highRoomVnum },
        objects: { low: lowRoomVnum, high: highRoomVnum },
      };

      // Level ranges (optional — some files omit these)
      this.skipWhitespace();
      if (this.isDigit(this.peek()) || this.peek() === '-') {
        header.levelRange.softLow = this.readNumber();
        header.levelRange.softHigh = this.readNumber();
        header.levelRange.hardLow = this.readNumber();
        header.levelRange.hardHigh = this.readNumber();
      }

      // Reset frequency and flags
      this.skipWhitespace();
      if (this.isDigit(this.peek())) {
        header.resetFrequency = this.readNumber() || 15;
        header.flags = this.readNumber();
      }

      // Reset message (optional)
      this.skipWhitespace();
      if (this.peek() !== '#') {
        header.resetMessage = this.readString();
      }
    }

    return header;
  }

  /**
   * Parse #ROOMS section.
   * Each room entry:
   *   #<vnum>
   *   <name>~
   *   <description>~
   *   <area_number (unused)> <room_flags> <sector_type>
   *   [D<direction>]  — exit definition (repeatable)
   *   [E]             — extra description (repeatable)
   *   [T]             — teleport data
   *   [M]             — tunnel limit
   *   [S]             — end of room
   *
   * Exit format (after D<direction>):
   *   <description>~
   *   <keyword>~
   *   <exit_flags> <key_vnum> <to_vnum>
   *   [<distance> <pull> <pullType>]   — optional SMAUG extensions
   *
   * Extra description format (after E):
   *   <keywords>~
   *   <description>~
   *
   * Teleport format (after T):
   *   <tele_delay> <tele_vnum>
   *
   * Tunnel format (after M):
   *   <max_occupants>
   *
   * Section ends with #0.
   *
   * Replicates legacy load_rooms() from db.c.
   */
  private parseRooms(): ParsedRoom[] {
    const rooms: ParsedRoom[] = [];

    while (true) {
      this.skipWhitespace();
      if (this.peek() === '#' && this.peekWord() === '#0') {
        this.readWord(); // consume '#0'
        break;
      }

      const vnum = this.readVnum();
      if (vnum === 0) break;

      const room: ParsedRoom = {
        vnum,
        name: this.readString(),
        description: this.readString(),
        sectorType: 0,
        roomFlags: '0',
        light: 0,
        tunnel: 0,
        teleport: null,
        exits: [],
        extraDescriptions: [],
      };

      // Area number (ignored in SMAUG — legacy Merc field)
      this.readNumber();
      // Room flags — may be a number or letter-based flags
      const flagsRaw = this.readWord();
      room.roomFlags = String(parseLegacyBitvector(flagsRaw));
      // Sector type
      room.sectorType = this.readNumber();

      // Parse sub-entries until 'S' (end of room)
      let done = false;
      while (!done && this.pos < this.content.length) {
        this.skipWhitespace();
        const marker = this.peek();

        switch (marker) {
          case 'D': {
            // Exit definition
            this.advance(); // consume 'D'
            const direction = this.readNumber();
            const exit: ParsedExit = {
              direction,
              description: this.readString(),
              keyword: this.readString(),
              exitFlags: this.readNumber(),
              key: this.readNumber(),
              toVnum: this.readNumber(),
              distance: 1,
              pull: 0,
              pullType: 0,
            };
            // SMAUG extensions: distance, pull, pullType (optional)
            this.skipWhitespace();
            if (this.isDigit(this.peek()) || this.peek() === '-') {
              exit.distance = this.readNumber();
              exit.pull = this.readNumber();
              exit.pullType = this.readNumber();
            }
            room.exits.push(exit);
            break;
          }
          case 'E': {
            // Extra description
            this.advance(); // consume 'E'
            const keywords = this.readString();
            const description = this.readString();
            room.extraDescriptions.push({
              keywords: keywords.split(/\s+/).filter(k => k.length > 0),
              description,
            });
            break;
          }
          case 'T': {
            // Teleport data
            this.advance(); // consume 'T'
            const delay = this.readNumber();
            const teleVnum = this.readNumber();
            room.teleport = { vnum: teleVnum, delay };
            break;
          }
          case 'M': {
            // Tunnel limit
            this.advance(); // consume 'M'
            room.tunnel = this.readNumber();
            break;
          }
          case 'S': {
            // End of room
            this.advance(); // consume 'S'
            done = true;
            break;
          }
          default: {
            // Unknown marker — skip line
            logger.warn('migration',
              `${this.currentFile}:${this.lineNumber}: Unknown room marker '${marker}' in room ${vnum}`);
            this.readToEol();
            break;
          }
        }
      }

      rooms.push(room);
    }

    return rooms;
  }

  /**
   * Parse #MOBILES section.
   * Each mobile entry:
   *   #<vnum>
   *   <keywords>~
   *   <short_desc>~
   *   <long_desc>~
   *   <description>~
   *   <act_flags> <affected_by> <alignment> <complexity_letter>
   *
   * Then complexity-dependent fields:
   *
   * **S (Simple):**
   *   <level> <hitroll> <armor>
   *   0d0+<hp> 1d<damdice>+<damroll>
   *   <gold> <exp>
   *   <position> <default_position> <sex>
   *
   * **C (Basic):** Same as S plus:
   *   <race> <class> <height> <weight>
   *   <speaks> <speaking>
   *   <numAttacks>
   *   <hitroll> <damroll>
   *
   * **V (Verbose/Full):** Same as C plus:
   *   <str> <int> <wis> <dex> <con> <cha> <lck>
   *   <saves: poison rod para breath spell>
   *   <immune> <resistant> <susceptible>
   *   <attacks> <defenses>
   *   <stances[0..9]>
   *
   * Section ends with #0.
   *
   * Replicates legacy load_mobiles() from db.c.
   */
  private parseMobiles(): ParsedMobile[] {
    const mobs: ParsedMobile[] = [];

    while (true) {
      this.skipWhitespace();
      if (this.peek() === '#' && this.peekWord() === '#0') {
        this.readWord(); // consume '#0'
        break;
      }

      const vnum = this.readVnum();
      if (vnum === 0) break;

      const name = this.readString();
      const shortDesc = this.readString();
      const longDesc = this.readString();
      const description = this.readString();

      // Act flags, affected_by, alignment
      const actFlagsRaw = this.readWord();
      const affectedByRaw = this.readWord();
      const alignment = this.readNumber();

      // Complexity letter
      const complexity = this.readWord().toUpperCase() as 'S' | 'C' | 'V';

      const mob: ParsedMobile = {
        vnum,
        name,
        shortDescription: shortDesc,
        longDescription: longDesc,
        description,
        keywords: name.split(/\s+/).filter(k => k.length > 0),
        complexity,
        level: 0,
        sex: 0,
        race: 0,
        class: 0,
        alignment,
        actFlags: String(parseLegacyBitvector(actFlagsRaw)),
        affectedBy: String(parseLegacyBitvector(affectedByRaw)),
        position: 8,       // POS_STANDING
        defaultPosition: 8,
        stats: { str: 13, int: 13, wis: 13, dex: 13, con: 13, cha: 13, lck: 13 },
        combat: {
          hitDice: '1d8+0',
          damDice: '1d4+0',
          hitroll: 0,
          damroll: 0,
          armor: 100,
          numAttacks: 1,
          attacks: 0,
          defenses: 0,
        },
        savingThrows: { poison: 0, rod: 0, para: 0, breath: 0, spell: 0 },
        ris: { immune: 0, resistant: 0, susceptible: 0 },
        economy: { gold: 0, silver: 0, copper: 0, exp: 0 },
        languages: { speaking: 0, speaks: 0 },
        specFun: '',
        stances: [],
      };

      // ── Shared S/C/V fields ──
      mob.level = this.readNumber();
      mob.combat.hitroll = this.readNumber();
      mob.combat.armor = this.readNumber();

      // HP dice: "NdS+P" format
      const hitDiceStr = this.readWord();
      mob.combat.hitDice = hitDiceStr;

      // Damage dice: "NdS+P" format
      const damDiceStr = this.readWord();
      mob.combat.damDice = damDiceStr;

      // Gold and exp (S format stores gold/exp on one line)
      mob.economy.gold = this.readNumber();
      mob.economy.exp = this.readNumber();

      // Position, default position, sex
      mob.position = this.readNumber();
      mob.defaultPosition = this.readNumber();
      mob.sex = this.readNumber();

      // ── C/V additional fields ──
      if (complexity === 'C' || complexity === 'V') {
        mob.race = this.readNumber();
        mob.class = this.readNumber();
        this.readNumber(); // height (not stored in JSON)
        this.readNumber(); // weight (not stored in JSON)
        mob.languages.speaks = this.readNumber();
        mob.languages.speaking = this.readNumber();
        mob.combat.numAttacks = this.readNumber();
        mob.combat.hitroll = this.readNumber(); // overrides S-level hitroll
        mob.combat.damroll = this.readNumber();
      }

      // ── V additional fields ──
      if (complexity === 'V') {
        mob.stats.str = this.readNumber();
        mob.stats.int = this.readNumber();
        mob.stats.wis = this.readNumber();
        mob.stats.dex = this.readNumber();
        mob.stats.con = this.readNumber();
        mob.stats.cha = this.readNumber();
        mob.stats.lck = this.readNumber();

        mob.savingThrows.poison = this.readNumber();
        mob.savingThrows.rod = this.readNumber();
        mob.savingThrows.para = this.readNumber();
        mob.savingThrows.breath = this.readNumber();
        mob.savingThrows.spell = this.readNumber();

        mob.ris.immune = this.readNumber();
        mob.ris.resistant = this.readNumber();
        mob.ris.susceptible = this.readNumber();

        mob.combat.attacks = this.readNumber();
        mob.combat.defenses = this.readNumber();

        // 10 stance values
        for (let i = 0; i < 10; i++) {
          mob.stances.push(this.readNumber());
        }
      }

      mobs.push(mob);
    }

    return mobs;
  }

  /**
   * Parse #OBJECTS section.
   * Each object entry:
   *   #<vnum>
   *   <keywords>~
   *   <short_desc>~
   *   <description>~
   *   <action_desc>~
   *   <item_type> <extra_flags> <wear_flags> <magic_flags>
   *   <value0> <value1> <value2> <value3> <value4> <value5>
   *   <weight> <cost> <rent (ignored)> <layers> <timer>
   *
   * Then optional sub-entries:
   *   A <location> <modifier>    — Affect
   *   E                          — Extra description
   *     <keywords>~
   *     <description>~
   *
   * Section ends with #0.
   *
   * Note: Spell slot numbers in object values (e.g., potion/scroll/wand spell
   * slots) must be converted via slot_lookup() to skill numbers. We store raw
   * slot numbers and let the AreaManager handle conversion at load time.
   *
   * Replicates legacy load_objects() from db.c.
   */
  private parseObjects(): ParsedObject[] {
    const objects: ParsedObject[] = [];

    while (true) {
      this.skipWhitespace();
      if (this.peek() === '#' && this.peekWord() === '#0') {
        this.readWord(); // consume '#0'
        break;
      }

      const vnum = this.readVnum();
      if (vnum === 0) break;

      const name = this.readString();
      const shortDesc = this.readString();
      const description = this.readString();
      const actionDesc = this.readString();

      // Type, flags
      const itemType = this.readNumber();
      const extraFlags = this.readNumber();
      const wearFlags = this.readNumber();
      const magicFlags = this.readNumber();

      // Values (6 values — SMAUG uses 6; classic Merc uses 4)
      const values: number[] = [];
      for (let i = 0; i < 6; i++) {
        values.push(this.readNumber());
      }

      // Weight, cost, rent (ignored), layers, timer
      const weight = this.readNumber();
      const costRaw = this.readNumber();
      this.readNumber(); // rent — not used in SMAUG
      const layers = this.readNumber();
      const timer = this.readNumber();

      const obj: ParsedObject = {
        vnum,
        name,
        shortDescription: shortDesc,
        description,
        actionDescription: actionDesc,
        keywords: name.split(/\s+/).filter(k => k.length > 0),
        itemType,
        level: 0, // Calculated from area or mob level at load time
        weight,
        extraFlags,
        magicFlags,
        wearFlags,
        values,
        cost: { gold: costRaw, silver: 0, copper: 0 },
        layers,
        timer,
        affects: [],
        extraDescriptions: [],
      };

      // Parse sub-entries (A = affect, E = extra desc)
      let done = false;
      while (!done && this.pos < this.content.length) {
        this.skipWhitespace();
        const marker = this.peek();

        if (marker === 'A') {
          this.advance(); // consume 'A'
          const location = this.readNumber();
          const modifier = this.readNumber();
          obj.affects.push({ location, modifier });
        } else if (marker === 'E') {
          this.advance(); // consume 'E'
          const keywords = this.readString();
          const desc = this.readString();
          obj.extraDescriptions.push({
            keywords: keywords.split(/\s+/).filter(k => k.length > 0),
            description: desc,
          });
        } else {
          // Not A or E — end of this object's sub-entries
          done = true;
        }
      }

      objects.push(obj);
    }

    return objects;
  }

  /**
   * Parse #RESETS section.
   * Each line: <command> <arg1> <arg2> <arg3> [<extra>] [; comment]
   * Command letters: M, O, P, G, E, D, R
   * Section ends with 'S' on its own line.
   *
   * Replicates legacy load_resets() from db.c.
   */
  private parseResets(): ParsedReset[] {
    const resets: ParsedReset[] = [];

    while (true) {
      this.skipWhitespace();
      const cmd = this.readWord();
      if (cmd === 'S' || cmd === '#END' || cmd === '') break;

      if (cmd === '*') {
        // Comment line — skip to end of line
        this.readToEol();
        continue;
      }

      const reset: ParsedReset = {
        command: cmd,
        arg1: this.readNumber(),
        arg2: this.readNumber(),
        arg3: this.readNumber(),
      };

      // Some reset types have an extra (4th) argument
      this.skipWhitespace();
      if (this.isDigit(this.peek()) || this.peek() === '-') {
        reset.extra = this.readNumber();
      }

      // Skip remainder of line (comments after ';')
      this.readToEol();

      resets.push(reset);
    }

    return resets;
  }

  /**
   * Parse #SHOPS section.
   * Each line:
   *   <keeper_vnum> <buy_type1> <buy_type2> <buy_type3> <buy_type4> <buy_type5>
   *   <profit_buy> <profit_sell> <open_hour> <close_hour>
   * Section ends with '0' as keeper vnum.
   *
   * Replicates legacy load_shops() from db.c.
   */
  private parseShops(): ParsedShop[] {
    const shops: ParsedShop[] = [];

    while (true) {
      this.skipWhitespace();
      const keeperVnum = this.readNumber();
      if (keeperVnum === 0) break;

      const buyTypes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const bt = this.readNumber();
        if (bt > 0) buyTypes.push(bt);
      }

      shops.push({
        keeperVnum,
        buyTypes,
        profitBuy: this.readNumber(),
        profitSell: this.readNumber(),
        openHour: this.readNumber(),
        closeHour: this.readNumber(),
      });

      this.readToEol();
    }

    return shops;
  }

  /**
   * Parse #REPAIRSHOPS section.
   * Similar to shops:
   *   <keeper_vnum> <fix_type1> <fix_type2> <fix_type3>
   *   <profit_fix> <shop_type> <open_hour> <close_hour>
   * Section ends with '0'.
   *
   * Replicates legacy load_repairshops() from db.c.
   */
  private parseRepairShops(): ParsedRepairShop[] {
    const shops: ParsedRepairShop[] = [];

    while (true) {
      this.skipWhitespace();
      const keeperVnum = this.readNumber();
      if (keeperVnum === 0) break;

      const fixTypes: number[] = [];
      for (let i = 0; i < 3; i++) {
        const ft = this.readNumber();
        if (ft > 0) fixTypes.push(ft);
      }

      shops.push({
        keeperVnum,
        fixTypes,
        profitFix: this.readNumber(),
        shopType: this.readNumber(),
        openHour: this.readNumber(),
        closeHour: this.readNumber(),
      });

      this.readToEol();
    }

    return shops;
  }

  /**
   * Parse #SPECIALS section.
   * Each line: M <mob_vnum> <spec_fun_name>
   * Section ends with 'S'.
   *
   * Special procedures are function pointers attached to mob prototypes.
   * We record the association and apply it to parsed mobile data after
   * all sections are parsed.
   *
   * Replicates legacy load_specials() from db.c.
   */
  private parseSpecials(): ParsedSpecial[] {
    const specials: ParsedSpecial[] = [];

    while (true) {
      this.skipWhitespace();
      const marker = this.readWord();
      if (marker === 'S' || marker === '') break;

      if (marker === 'M') {
        const mobVnum = this.readNumber();
        const specFun = this.readWord();
        specials.push({ mobVnum, specFun });
      }

      this.readToEol();
    }

    return specials;
  }

  /**
   * Parse #CLIMATE section.
   * Format: <temp> <precip> <wind>
   * Modifies the area header's climate data.
   */
  private parseClimate(area: AreaHeaderData): void {
    area.climate.temp = this.readNumber();
    area.climate.precip = this.readNumber();
    area.climate.wind = this.readNumber();
  }

  /**
   * Parse #MUDPROGS / #OPROGS / #RPROGS section.
   * Each entry:
   *   M <entity_vnum>
   *   <trigger_type>~ <arg_list>~
   *   <command_list>~
   * Section ends with 'S' or '#0'.
   *
   * The trigger types include: act_prog, speech_prog, rand_prog,
   * fight_prog, death_prog, hitprcnt_prog, entry_prog, greet_prog,
   * all_greet_prog, give_prog, bribe_prog, time_prog, hour_prog,
   * script_prog, etc.
   *
   * Replicates legacy load_mudprogs() from db.c.
   */
  private parseMudProgs(): ParsedMudProg[] {
    const progs: ParsedMudProg[] = [];
    let currentVnum = 0;

    while (true) {
      this.skipWhitespace();
      const marker = this.peek();

      if (marker === 'S' || marker === '#') {
        // End of section — consume the marker
        if (marker === 'S') this.advance();
        break;
      }

      if (marker === 'M') {
        this.advance(); // consume 'M'
        currentVnum = this.readNumber();
        continue;
      }

      // Read trigger definition
      const trigger = this.readString();
      if (!trigger) break;

      const argList = this.readString();
      const commandList = this.readString();

      progs.push({
        entityVnum: currentVnum,
        trigger,
        argList,
        commandList,
      });
    }

    return progs;
  }

  // ─── Post-processing ──────────────────────────────────────────────────

  /**
   * Apply #SPECIALS data to parsed mobile entries.
   * Sets the specFun field on matching mobile prototypes.
   */
  private applySpecials(result: ParsedArea): void {
    for (const special of result.specials) {
      const mob = result.mobiles.find(m => m.vnum === special.mobVnum);
      if (mob) {
        mob.specFun = special.specFun;
      } else {
        logger.warn('migration',
          `${this.currentFile}: Special for mob vnum ${special.mobVnum} not found`);
      }
    }
  }

  // ─── Primitive Read Operations ────────────────────────────────────────

  /**
   * Read a section header (e.g., '#AREA', '#ROOMS').
   * Advances past the header word.
   */
  private readSection(): string | null {
    this.skipWhitespace();
    if (this.pos >= this.content.length) return null;
    const start = this.pos;
    while (this.pos < this.content.length && !this.isWhitespace(this.content[this.pos]!)) {
      this.pos++;
    }
    return this.content.substring(start, this.pos);
  }

  /**
   * Read a tilde-terminated string.
   * Legacy format uses ~ as the string terminator.
   * Multi-line strings are preserved (newlines kept as \n).
   */
  private readString(): string {
    this.skipWhitespace();
    const start = this.pos;
    const end = this.content.indexOf('~', this.pos);
    if (end === -1) {
      // No terminator found — read to end of content
      this.pos = this.content.length;
      return this.content.substring(start).trim();
    }
    this.pos = end + 1;
    // Count newlines in the consumed text for line tracking
    const consumed = this.content.substring(start, end);
    this.lineNumber += (consumed.match(/\n/g) || []).length;
    return consumed.trim();
  }

  /**
   * Read a single integer number (with optional leading minus sign).
   * Skips leading whitespace. Handles the case where the "number" is
   * actually a letter-based bitvector (falls back to 0).
   */
  private readNumber(): number {
    this.skipWhitespace();
    const start = this.pos;
    if (this.pos < this.content.length && this.content[this.pos] === '-') {
      this.pos++;
    }
    while (this.pos < this.content.length && /\d/.test(this.content[this.pos]!)) {
      this.pos++;
    }
    const str = this.content.substring(start, this.pos);
    return parseInt(str, 10) || 0;
  }

  /**
   * Read a vnum (#<number>).
   * Consumes the leading '#' if present.
   */
  private readVnum(): number {
    this.skipWhitespace();
    if (this.pos < this.content.length && this.content[this.pos] === '#') {
      this.pos++;
    }
    return this.readNumber();
  }

  /**
   * Read a whitespace-delimited word.
   */
  private readWord(): string {
    this.skipWhitespace();
    const start = this.pos;
    while (this.pos < this.content.length && !this.isWhitespace(this.content[this.pos]!)) {
      this.pos++;
    }
    return this.content.substring(start, this.pos);
  }

  /**
   * Read to end of current line.
   * Used to skip comments (after ';') and trailing content.
   */
  private readToEol(): void {
    while (this.pos < this.content.length && this.content[this.pos] !== '\n') {
      this.pos++;
    }
    if (this.pos < this.content.length) {
      this.pos++;
      this.lineNumber++;
    }
  }

  /**
   * Peek at the current character without consuming it.
   */
  private peek(): string {
    this.skipWhitespace();
    return this.content[this.pos] ?? '';
  }

  /**
   * Peek at the next word without consuming it.
   */
  private peekWord(): string {
    const saved = this.pos;
    const savedLine = this.lineNumber;
    const word = this.readWord();
    this.pos = saved;
    this.lineNumber = savedLine;
    return word;
  }

  /**
   * Advance the position by one character.
   */
  private advance(): void {
    if (this.pos < this.content.length) {
      if (this.content[this.pos] === '\n') this.lineNumber++;
      this.pos++;
    }
  }

  /**
   * Skip whitespace characters (space, tab, newline, carriage return).
   * Updates line counter for newlines.
   */
  private skipWhitespace(): void {
    while (this.pos < this.content.length && this.isWhitespace(this.content[this.pos]!)) {
      if (this.content[this.pos] === '\n') this.lineNumber++;
      this.pos++;
    }
  }

  /**
   * Skip to the next section header (next '#' at start of a line).
   * Used for recovery when an unknown section is encountered.
   */
  private skipToNextSection(): void {
    while (this.pos < this.content.length) {
      if (this.content[this.pos] === '\n') {
        this.lineNumber++;
        this.pos++;
        if (this.pos < this.content.length && this.content[this.pos] === '#') {
          return; // Found start of next section
        }
      } else {
        this.pos++;
      }
    }
  }

  private isWhitespace(ch: string): boolean {
    return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private createDefaultAreaHeader(): AreaHeaderData {
    return {
      name: 'Unknown Area',
      filename: '',
      author: 'Unknown',
      credits: '',
      resetMessage: '',
      flags: 0,
      resetFrequency: 15,
      vnumRanges: {
        rooms: { low: 0, high: 0 },
        mobiles: { low: 0, high: 0 },
        objects: { low: 0, high: 0 },
      },
      levelRange: { softLow: 0, softHigh: 65, hardLow: 0, hardHigh: 65 },
      economy: { highEconomy: 0, lowEconomy: 0 },
      climate: { temp: 0, precip: 0, wind: 0 },
    };
  }
}
```

---

### 2. `src/migration/PlayerFileParser.ts` — Legacy Player File Parser

Replace the stub. Parses legacy SMAUG player save files (key-value text format):

```typescript
// src/migration/PlayerFileParser.ts

import * as fs from 'fs/promises';
import { Logger } from '../utils/Logger.js';

const logger = new Logger();

/**
 * Structured output from parsing a legacy player file.
 */
export interface ParsedPlayer {
  name: string;
  password: string;        // Legacy SHA256 hex hash — must be re-hashed with bcrypt
  isLegacyPassword: true;  // Flag indicating password needs migration
  version: number;
  title: string;
  level: number;
  race: number;
  class: number;
  sex: number;
  trust: number;
  alignment: number;
  hp: { current: number; max: number };
  mana: { current: number; max: number };
  move: { current: number; max: number };
  gold: number;
  silver: number;
  copper: number;
  bankGold: number;
  bankSilver: number;
  bankCopper: number;
  experience: number;
  practiceCount: number;
  attrPerm: {
    str: number; int: number; wis: number;
    dex: number; con: number; cha: number; lck: number;
  };
  attrMod: {
    str: number; int: number; wis: number;
    dex: number; con: number; cha: number; lck: number;
  };
  conditions: { hunger: number; thirst: number; blood: number; bleed: number };
  skills: Array<{ name: string; percent: number }>;
  affects: Array<{
    skillName: string;
    duration: number;
    modifier: number;
    location: number;
    bitvector: string;
  }>;
  position: number;
  savedRoom: number;
  wimpy: number;
  pageLen: number;
  clan: string;
  council: string;
  deity: string;
  pkills: number;
  pdeaths: number;
  mkills: number;
  mdeaths: number;
  questPoints: number;
  played: number; // Seconds played
  items: ParsedPlayerItem[];
}

export interface ParsedPlayerItem {
  vnum: number;
  wearLocation: number;
  nestLevel: number;
  enchantments: Array<{ location: number; modifier: number }>;
  values: number[];
  timer: number;
  extraFlags: number;
}

/**
 * Parser for legacy SMAUG player save files.
 *
 * Legacy format is key-value text with #PLAYER / #END sections:
 *   #PLAYER
 *   Version      3
 *   Name         <name>~
 *   Password     <sha256_hash>~
 *   AttrPerm     <str> <int> <wis> <dex> <con> <cha> <lck>
 *   Skill        <percent> '<skill_name>'
 *   AffectData   '<skill>' <duration> <modifier> <location> <bitvector>
 *   #END
 *
 * Passwords are stored as unsalted SHA256 hex. Since we cannot reverse them,
 * we flag them for re-hashing on first login to the new system.
 *
 * Replicates legacy fread_char() from save.c.
 */
export class PlayerFileParser {

  /**
   * Parse a legacy player save file.
   */
  async parseFile(filePath: string): Promise<ParsedPlayer> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.parseContent(content, filePath);
  }

  /**
   * Parse player file content (for testing without filesystem).
   */
  parseContent(content: string, filename: string = 'unknown'): ParsedPlayer {
    const player = this.createDefaultPlayer();
    const lines = content.split('\n');
    let pos = 0;

    // Find #PLAYER section
    while (pos < lines.length && lines[pos]!.trim() !== '#PLAYER') {
      pos++;
    }
    pos++; // Skip #PLAYER line

    while (pos < lines.length) {
      const line = lines[pos]!.trim();
      pos++;

      if (line === '#END' || line === '') continue;
      if (line.startsWith('#OBJECT')) {
        // Parse equipment section
        pos = this.parsePlayerItems(lines, pos, player);
        continue;
      }

      const spaceIdx = line.indexOf(' ');
      if (spaceIdx === -1) continue;

      const key = line.substring(0, spaceIdx).trim();
      const value = line.substring(spaceIdx + 1).trim();

      this.parsePlayerField(player, key, value);
    }

    logger.debug('migration', `Parsed player: ${player.name} (level ${player.level})`);
    return player;
  }

  /**
   * Parse a single key-value field from the player file.
   */
  private parsePlayerField(player: ParsedPlayer, key: string, value: string): void {
    // Strip trailing tilde from string values
    const str = value.endsWith('~') ? value.slice(0, -1) : value;
    const nums = value.split(/\s+/).map(n => parseInt(n, 10) || 0);

    switch (key) {
      case 'Version':    player.version = nums[0]!; break;
      case 'Name':       player.name = str; break;
      case 'Password':   player.password = str; break;
      case 'Title':      player.title = str; break;
      case 'Level':      player.level = nums[0]!; break;
      case 'Race':       player.race = nums[0]!; break;
      case 'Class':      player.class = nums[0]!; break;
      case 'Sex':        player.sex = nums[0]!; break;
      case 'Trust':      player.trust = nums[0]!; break;
      case 'Alignment':  player.alignment = nums[0]!; break;
      case 'HpManaMove':
        player.hp = { current: nums[0]!, max: nums[1]! };
        player.mana = { current: nums[2]!, max: nums[3]! };
        player.move = { current: nums[4]!, max: nums[5]! };
        break;
      case 'Gold':       player.gold = nums[0]!; break;
      case 'Silver':     player.silver = nums[0]!; break;
      case 'Copper':     player.copper = nums[0]!; break;
      case 'Balance':
        player.bankGold = nums[0]!;
        player.bankSilver = nums[1] ?? 0;
        player.bankCopper = nums[2] ?? 0;
        break;
      case 'Exp':        player.experience = nums[0]!; break;
      case 'Practice':   player.practiceCount = nums[0]!; break;
      case 'AttrPerm':
        player.attrPerm = {
          str: nums[0]!, int: nums[1]!, wis: nums[2]!,
          dex: nums[3]!, con: nums[4]!, cha: nums[5]!, lck: nums[6]!,
        };
        break;
      case 'AttrMod':
        player.attrMod = {
          str: nums[0]!, int: nums[1]!, wis: nums[2]!,
          dex: nums[3]!, con: nums[4]!, cha: nums[5]!, lck: nums[6]!,
        };
        break;
      case 'Condition':
        player.conditions = {
          hunger: nums[0]!, thirst: nums[1]!, blood: nums[2]!, bleed: nums[3]!,
        };
        break;
      case 'Skill': {
        // Format: <percent> '<skill_name>'
        const match = value.match(/^(\d+)\s+'([^']+)'/);
        if (match) {
          player.skills.push({ percent: parseInt(match[1]!, 10), name: match[2]! });
        }
        break;
      }
      case 'AffectData': {
        // Format: '<skill>' <duration> <modifier> <location> <bitvector>
        const affMatch = value.match(/^'([^']+)'\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)/);
        if (affMatch) {
          player.affects.push({
            skillName: affMatch[1]!,
            duration: parseInt(affMatch[2]!, 10),
            modifier: parseInt(affMatch[3]!, 10),
            location: parseInt(affMatch[4]!, 10),
            bitvector: affMatch[5]!,
          });
        }
        break;
      }
      case 'Position':   player.position = nums[0]!; break;
      case 'SaveRoom':   player.savedRoom = nums[0]!; break;
      case 'Wimpy':      player.wimpy = nums[0]!; break;
      case 'Pagelen':    player.pageLen = nums[0]!; break;
      case 'Clan':       player.clan = str; break;
      case 'Council':    player.council = str; break;
      case 'Deity':      player.deity = str; break;
      case 'Pkills':     player.pkills = nums[0]!; break;
      case 'Pdeaths':    player.pdeaths = nums[0]!; break;
      case 'Mkills':     player.mkills = nums[0]!; break;
      case 'Mdeaths':    player.mdeaths = nums[0]!; break;
      case 'Quest':      player.questPoints = nums[0]!; break;
      case 'Played':     player.played = nums[0]!; break;
      // Additional fields are silently ignored — extensible format
    }
  }

  /**
   * Parse #OBJECT sections (player equipment/inventory).
   * Each item:
   *   Vnum <vnum>
   *   Nest <level>
   *   Wear <location>
   *   Val  <v0> <v1> <v2> <v3> <v4> <v5>
   *   Timer <ticks>
   *   Extraflags <flags>
   *   Enchant <location> <modifier>
   *   End
   */
  private parsePlayerItems(
    lines: string[],
    startPos: number,
    player: ParsedPlayer
  ): number {
    let pos = startPos;
    const item: ParsedPlayerItem = {
      vnum: 0,
      wearLocation: -1,
      nestLevel: 0,
      enchantments: [],
      values: [0, 0, 0, 0, 0, 0],
      timer: 0,
      extraFlags: 0,
    };

    while (pos < lines.length) {
      const line = lines[pos]!.trim();
      pos++;

      if (line === 'End') {
        player.items.push({ ...item, enchantments: [...item.enchantments] });
        break;
      }
      if (line === '#END') break;

      const spaceIdx = line.indexOf(' ');
      if (spaceIdx === -1) continue;

      const key = line.substring(0, spaceIdx).trim();
      const val = line.substring(spaceIdx + 1).trim();
      const nums = val.split(/\s+/).map(n => parseInt(n, 10) || 0);

      switch (key) {
        case 'Vnum':       item.vnum = nums[0]!; break;
        case 'Nest':       item.nestLevel = nums[0]!; break;
        case 'Wear':       item.wearLocation = nums[0]!; break;
        case 'Val':        item.values = nums.slice(0, 6); break;
        case 'Timer':      item.timer = nums[0]!; break;
        case 'Extraflags': item.extraFlags = nums[0]!; break;
        case 'Enchant':
          item.enchantments.push({ location: nums[0]!, modifier: nums[1]! });
          break;
      }
    }

    return pos;
  }

  private createDefaultPlayer(): ParsedPlayer {
    return {
      name: '',
      password: '',
      isLegacyPassword: true,
      version: 0,
      title: '',
      level: 1,
      race: 0,
      class: 0,
      sex: 0,
      trust: 0,
      alignment: 0,
      hp: { current: 20, max: 20 },
      mana: { current: 100, max: 100 },
      move: { current: 100, max: 100 },
      gold: 0, silver: 0, copper: 0,
      bankGold: 0, bankSilver: 0, bankCopper: 0,
      experience: 0,
      practiceCount: 0,
      attrPerm: { str: 13, int: 13, wis: 13, dex: 13, con: 13, cha: 13, lck: 13 },
      attrMod: { str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0, lck: 0 },
      conditions: { hunger: 48, thirst: 48, blood: 10, bleed: 0 },
      skills: [],
      affects: [],
      position: 8, // POS_STANDING
      savedRoom: 3001,
      wimpy: 0,
      pageLen: 24,
      clan: '',
      council: '',
      deity: '',
      pkills: 0, pdeaths: 0,
      mkills: 0, mdeaths: 0,
      questPoints: 0,
      played: 0,
      items: [],
    };
  }
}
```

---

### 3. `src/migration/MigrationRunner.ts` — Migration Orchestrator

Replace the stub. Orchestrates bulk conversion of legacy files:

```typescript
// src/migration/MigrationRunner.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { AreFileParser, ParsedArea } from './AreFileParser.js';
import { PlayerFileParser, ParsedPlayer } from './PlayerFileParser.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger();

export interface MigrationStats {
  areasProcessed: number;
  areasFailed: number;
  totalRooms: number;
  totalMobs: number;
  totalObjects: number;
  totalResets: number;
  playersProcessed: number;
  playersFailed: number;
}

/**
 * Migration Runner — orchestrates bulk conversion of legacy SMAUG files.
 *
 * Usage:
 *   const runner = new MigrationRunner();
 *   await runner.migrateAreas('./legacy/area/', './world/');
 *   await runner.migratePlayers('./legacy/player/', prismaClient);
 *
 * Replicates the conversion pipeline described in ARCHITECTURE.md §23.
 */
export class MigrationRunner {
  private areParser = new AreFileParser();
  private playerParser = new PlayerFileParser();
  private stats: MigrationStats = this.createEmptyStats();

  /**
   * Migrate all .are files from a legacy area directory.
   * Each .are file is parsed and written as a JSON area subdirectory
   * in the output directory, ready for AreaManager.loadAllAreas().
   *
   * @param legacyDir — Directory containing .are files.
   * @param outputDir — Target world/ directory for JSON output.
   */
  async migrateAreas(legacyDir: string, outputDir: string): Promise<MigrationStats> {
    this.stats = this.createEmptyStats();

    const files = (await fs.readdir(legacyDir)).filter(f => f.endsWith('.are'));
    logger.info('migration', `Found ${files.length} area files to migrate.`);

    for (const file of files) {
      const areaName = file.replace('.are', '');
      logger.info('migration', `Migrating: ${file}...`);

      try {
        const parsed = await this.areParser.parseFile(path.join(legacyDir, file));
        parsed.area.filename = areaName;

        const areaOutputDir = path.join(outputDir, areaName);
        await this.areParser.writeToJson(parsed, areaOutputDir);

        this.stats.areasProcessed++;
        this.stats.totalRooms += parsed.rooms.length;
        this.stats.totalMobs += parsed.mobiles.length;
        this.stats.totalObjects += parsed.objects.length;
        this.stats.totalResets += parsed.resets.length;

        logger.info('migration',
          `  → ${parsed.rooms.length} rooms, ${parsed.mobiles.length} mobs, ` +
          `${parsed.objects.length} objects, ${parsed.resets.length} resets`);
      } catch (err: any) {
        this.stats.areasFailed++;
        logger.error('migration', `  ✗ Failed to migrate ${file}: ${err.message}`);
      }
    }

    logger.info('migration',
      `Migration complete: ${this.stats.areasProcessed} areas ` +
      `(${this.stats.areasFailed} failed), ` +
      `${this.stats.totalRooms} rooms, ${this.stats.totalMobs} mobs, ` +
      `${this.stats.totalObjects} objects`);

    return this.stats;
  }

  /**
   * Migrate all legacy player files from a directory.
   * Each .plr file is parsed and inserted into the PostgreSQL database
   * via Prisma. Passwords are flagged for re-hashing on first login.
   *
   * @param legacyDir — Directory containing .plr player save files.
   * @param prisma — Prisma client instance for database writes.
   */
  async migratePlayers(legacyDir: string, prisma: any): Promise<MigrationStats> {
    const files = (await fs.readdir(legacyDir)).filter(f => f.endsWith('.plr'));
    logger.info('migration', `Found ${files.length} player files to migrate.`);

    for (const file of files) {
      try {
        const parsed = await this.playerParser.parseFile(path.join(legacyDir, file));

        await prisma.player.upsert({
          where: { name: parsed.name },
          update: this.playerToDbRecord(parsed),
          create: this.playerToDbRecord(parsed),
        });

        this.stats.playersProcessed++;
        logger.debug('migration', `  → Migrated player: ${parsed.name} (level ${parsed.level})`);
      } catch (err: any) {
        this.stats.playersFailed++;
        logger.error('migration', `  ✗ Failed to migrate ${file}: ${err.message}`);
      }
    }

    logger.info('migration',
      `Player migration complete: ${this.stats.playersProcessed} players ` +
      `(${this.stats.playersFailed} failed)`);

    return this.stats;
  }

  /**
   * Migrate a single .are file (for testing or selective migration).
   */
  async migrateSingleArea(filePath: string, outputDir: string): Promise<ParsedArea> {
    const parsed = await this.areParser.parseFile(filePath);
    const areaName = path.basename(filePath, '.are');
    parsed.area.filename = areaName;
    await this.areParser.writeToJson(parsed, path.join(outputDir, areaName));
    return parsed;
  }

  /**
   * Get the accumulated migration statistics.
   */
  getStats(): MigrationStats { return { ...this.stats }; }

  /**
   * Convert a ParsedPlayer to a Prisma-compatible database record.
   * Handles the password migration flag and field mapping.
   */
  private playerToDbRecord(parsed: ParsedPlayer): any {
    return {
      name: parsed.name,
      password: parsed.password,
      isLegacyPassword: true,
      title: parsed.title,
      level: parsed.level,
      race: parsed.race,
      class: parsed.class,
      sex: parsed.sex,
      trust: parsed.trust,
      alignment: parsed.alignment,
      hp: parsed.hp.current,
      maxHp: parsed.hp.max,
      mana: parsed.mana.current,
      maxMana: parsed.mana.max,
      move: parsed.move.current,
      maxMove: parsed.move.max,
      gold: parsed.gold,
      silver: parsed.silver,
      copper: parsed.copper,
      bankGold: parsed.bankGold,
      bankSilver: parsed.bankSilver,
      bankCopper: parsed.bankCopper,
      experience: parsed.experience,
      practiceCount: parsed.practiceCount,
      attrPermStr: parsed.attrPerm.str,
      attrPermInt: parsed.attrPerm.int,
      attrPermWis: parsed.attrPerm.wis,
      attrPermDex: parsed.attrPerm.dex,
      attrPermCon: parsed.attrPerm.con,
      attrPermCha: parsed.attrPerm.cha,
      attrPermLck: parsed.attrPerm.lck,
      conditions: JSON.stringify(parsed.conditions),
      skills: JSON.stringify(parsed.skills),
      savedRoom: parsed.savedRoom,
      wimpy: parsed.wimpy,
      pageLen: parsed.pageLen,
      clan: parsed.clan || null,
      council: parsed.council || null,
      deity: parsed.deity || null,
      pkills: parsed.pkills,
      pdeaths: parsed.pdeaths,
      mkills: parsed.mkills,
      mdeaths: parsed.mdeaths,
      questPoints: parsed.questPoints,
      played: parsed.played,
    };
  }

  private createEmptyStats(): MigrationStats {
    return {
      areasProcessed: 0, areasFailed: 0,
      totalRooms: 0, totalMobs: 0, totalObjects: 0, totalResets: 0,
      playersProcessed: 0, playersFailed: 0,
    };
  }
}
```

---

### 4. Test Fixture: `tests/fixtures/legacyFiles/test.are` — Sample Legacy Area File

Create a complete test area file in legacy SMAUG format for parser testing:

```
#AREA
Test Area~
test.are~
TestAuthor~
Testing Credits~
3001 3010
1 65 1 65
15 0
A mystical wind blows through the area.~
#ROOMS
#3001
The Temple of Midgaard~
You are in the southern end of the temple hall in the Temple of
Midgaard. The temple extends north. Large stone pillars line the
walls, and torches flicker in iron sconces.~
0 8 0
D0
You see the northern end of the temple.~
door~
1 3050 3002
D2
The south exit leads to the town square.~
~
0 -1 3005
E
pillar pillars~
The pillars are made of grey granite, carved with ancient runes.~
S
#3002
Temple Hall North~
The northern end of the temple hall. An altar stands here.~
0 0 0
D2
~
~
0 -1 3001
S
#3005
Town Square~
This is the town square of Midgaard. Roads lead in all directions.~
0 0 2
D0
~
~
0 -1 3001
D1
~
~
0 -1 3006
D3
~
~
0 -1 3007
S
#3006
East Road~
A well-paved road leading east.~
0 0 1
D3
~
~
0 -1 3005
S
#3007
West Road~
A dusty road heading west.~
0 0 1
D1
~
~
0 -1 3005
S
#0
#MOBILES
#3001
cityguard city guard~
the city guard~
A city guard stands here, protecting the town.~
The city guard is a burly fellow in chain mail armour.~
66 0 -750 S
20 5 -10
0d0+500 2d8+10
100 5000
8 8 1
#3002
janitor~
the janitor~
A weary-looking janitor is here, sweeping the floor.~
The janitor looks tired but diligent.~
2 0 500 S
8 2 0
0d0+100 1d4+2
20 500
8 8 1
#0
#OBJECTS
#3050
key temple key~
a small iron key~
A small iron key lies here.~
~
18 0 1 0
0 0 0 0 0 0
1 50 0 0 0
#3051
sword short sword~
a gleaming short sword~
A short sword has been left here.~
~
5 0 8193 0
3 1 8 0 0 0
5 200 0 0 0
A
19 2
A
18 1
#0
#RESETS
M 0 3001 1 3005 ; city guard in town square
M 0 3002 1 3001 ; janitor in temple
G 1 3050      ; give janitor the temple key
O 0 3051 0 3006 ; sword in east road
D 0 3001 0 1  ; north door in temple is closed
S
#SHOPS
3001 5 0 0 0 0 150 50 0 23
0
#SPECIALS
M 3001 spec_guard
S
#MUDPROGS
M 3001
greet_prog~ 100~
say Welcome to Midgaard, $n!~
M 3002
rand_prog~ 10~
emote sweeps the floor diligently.~
S
#CLIMATE
2 3 1
#END
```

---

## Tests for Sub-Phase 3E

- `tests/unit/migration/AreFileParser.test.ts` — Test the complete parser:
  - Parse `tests/fixtures/legacyFiles/test.are` and verify:
    - Area header: name "Test Area", author "TestAuthor", vnum range 3001-3010, reset frequency 15.
    - Rooms: 5 rooms parsed. Room 3001 has vnum 3001, 2 exits (N and S), 1 extra description. Room 3005 has 3 exits.
    - Mobiles: 2 mobs parsed. Mob 3001 is level 20, S complexity, alignment -750. Mob 3002 is level 8.
    - Objects: 2 objects parsed. Object 3050 is item type 18 (key), weight 1. Object 3051 is item type 5 (weapon) with 2 affects.
    - Resets: 5 resets (2 M, 1 G, 1 O, 1 D). Reset[0] is M with mob 3001 in room 3005.
    - Shops: 1 shop for keeper 3001 with buy type 5, hours 0-23.
    - Specials: 1 special — mob 3001 has spec_guard. Verify specFun is applied to the mobile.
    - MudProgs: 2 programs — greet_prog for mob 3001, rand_prog for mob 3002.
    - Climate: temp=2, precip=3, wind=1.
  - Test primitive readers:
    - `readString()` correctly handles tilde termination and multi-line strings.
    - `readNumber()` handles negative numbers and zero-padding.
    - `readVnum()` strips leading '#'.
  - Test error recovery: malformed section is skipped, rest of file parses correctly.
  - Test `writeToJson()`: verify output directory structure contains area.json, rooms.json, mobiles.json, objects.json, resets.json, shops.json, programs.json.
  - Test Merc/ROM format detection: area header with just name and vnum range.

- `tests/unit/migration/PlayerFileParser.test.ts` — Test player file parsing:
  - Parse a test player file. Verify name, level, stats, skills, affects, conditions.
  - Verify password is flagged as `isLegacyPassword: true`.
  - Verify skills parsing with quoted names.
  - Verify affect data parsing with bitvector.
  - Verify equipment (#OBJECT) section parsing with nested items.

- `tests/unit/migration/MigrationRunner.test.ts` — Test migration orchestration:
  - Test `migrateAreas()` with a directory containing the test.are fixture.
  - Verify stats: areasProcessed=1, totalRooms=5, totalMobs=2, totalObjects=2.
  - Verify JSON output files exist and contain valid data.
  - Test error handling: corrupt .are file increments areasFailed counter.

- `tests/integration/AreaParseThenLoad.test.ts` — End-to-end integration test:
  - Parse `tests/fixtures/legacyFiles/test.are` → write to temp directory → load via AreaManager.loadAllAreas() → verify VnumRegistry contains the expected rooms, mob prototypes, and object prototypes → run ResetEngine.resetArea() → verify mobs and objects are placed correctly.

---

## Acceptance Criteria

- [ ] `AreFileParser.parseFile('test.are')` parses all sections without errors.
- [ ] Parsed area header has correct name, author, vnum ranges, and reset frequency.
- [ ] All 5 rooms are parsed with correct exits, flags, sector types, and extra descriptions.
- [ ] Room 3001 exit north has exitFlags=1 (door), key=3050, destination=3002.
- [ ] Both mobiles are parsed with correct complexity (S), levels, stats, and economy data.
- [ ] Mobile act_flags and affected_by are correctly converted from legacy bitvector format to bigint-compatible strings.
- [ ] Both objects are parsed with correct item types, values, and affects.
- [ ] Object 3051 has 2 affect entries (location 19/modifier 2, location 18/modifier 1).
- [ ] All 5 resets are parsed with correct command types and arguments.
- [ ] Shop data associates correctly with keeper vnum 3001.
- [ ] Special procedure `spec_guard` is applied to mob 3001's specFun field.
- [ ] MudProg triggers are correctly parsed with entity vnum, trigger type, and command list.
- [ ] `writeToJson()` produces valid JSON files that `AreaManager.loadAllAreas()` can consume.
- [ ] `PlayerFileParser` correctly parses skills with quoted names and affect data with bitvectors.
- [ ] `MigrationRunner.migrateAreas()` processes all .are files and reports accurate statistics.
- [ ] Integration test: parse → write JSON → load via AreaManager → verify registry → reset → verify placement.
- [ ] Error recovery: a malformed #ROOMS section doesn't prevent parsing of subsequent sections.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
