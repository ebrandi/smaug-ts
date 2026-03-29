# SMAUG 2.0 TypeScript Port — Phase 3D: World Loader

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phases 3A through 3C have established the complete project infrastructure. The project scaffold (package.json, tsconfig.json, ESLint, Vitest, Prisma schema, all stub files) exists. The core engine (EventBus, TickEngine, GameLoop), network layer (WebSocket/Socket.IO, ConnectionManager, Descriptor), and comprehensive utility layer (Logger, AnsiColors, Dice, BitVector, StringUtils with `actSubstitute`, TextFormatter, FileIO helpers, LegacyConverter with `LegacyFieldReader`, TimeUtils, Tables with race/class/language definitions) are all implemented and tested. This phase implements the world loading system that reads JSON area files from disk, populates the VnumRegistry with rooms/mobs/objects, resolves inter-area exit references, and manages area lifecycle including periodic resets.
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
4. **Emit EventBus events** at every documented hook point (area reset, world loaded, exit resolution) so that downstream systems (MUDprogs, logging, admin dashboard) can subscribe.
5. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
6. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`, `roomFlags`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
7. **Handle edge cases defensively.** Check for null rooms, missing files, duplicate vnums, circular exit references, and malformed JSON before every operation. Log warnings rather than crashing.
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
│   └── fixtures/testArea/  # Test area data for integration tests
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

**Do NOT modify any of the above completed implementations** unless explicitly extending them. You may import from them freely.

---

## Sub-Phase 3D Objective

Implement the complete world loading system. At boot time, the AreaManager scans the `world/` directory for area subdirectories, loads all JSON data files (area metadata, rooms, mobiles, objects, resets, shops, programs), registers all entities in the VnumRegistry, resolves cross-area exit references, and performs initial area resets to populate the world. After this phase, the game world is fully populated and navigable — rooms contain NPCs and objects, exits link between areas, and the area reset cycle operates on the TickEngine's area pulse.

---

## Files to Implement

### 1. `src/game/world/VnumRegistry.ts` — Vnum Hash Tables

Replace the stub. Three parallel registries matching legacy `mob_index_hash`, `obj_index_hash`, `room_index_hash`:

```typescript
// src/game/world/VnumRegistry.ts

import { Room } from '../entities/Room.js';
import { Logger } from '../../utils/Logger.js';

/**
 * Prototypes are read-only templates. Instances are created from prototypes.
 * These interfaces define the minimum shape for registry storage.
 * Full definitions are in entities/types.ts.
 */
export interface MobilePrototype {
  vnum: number;
  name: string;
  shortDescription: string;
  longDescription: string;
  description: string;
  keywords: string[];
  level: number;
  sex: number;
  race: number;
  class: number;
  alignment: number;
  actFlags: bigint;
  affectedBy: bigint;
  position: number;
  defaultPosition: number;
  stats: { str: number; int: number; wis: number; dex: number; con: number; cha: number; lck: number };
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
  savingThrows: { poison: number; rod: number; para: number; breath: number; spell: number };
  ris: { immune: number; resistant: number; susceptible: number };
  economy: { gold: number; silver: number; copper: number; exp: number };
  languages: { speaking: number; speaks: number };
  specFun: string;
  stances: number[];
  /** Runtime: number of currently active instances. */
  count: number;
  /** Runtime: shop data if this mob is a shopkeeper. */
  shop?: ShopData;
  /** Runtime: repair shop data if this mob is a repairman. */
  repairShop?: RepairShopData;
  /** Runtime: MudProg programs attached to this mob. */
  programs: MudProgData[];
}

export interface ObjectPrototype {
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
  /** Runtime: number of currently active instances. */
  count: number;
  /** Runtime: unique serial counter for instances. */
  serial: number;
  /** Runtime: MudProg programs attached to this object. */
  programs: MudProgData[];
}

export interface ShopData {
  keeperVnum: number;
  buyTypes: number[];
  profitBuy: number;
  profitSell: number;
  openHour: number;
  closeHour: number;
}

export interface RepairShopData {
  keeperVnum: number;
  fixTypes: number[];
  profitFix: number;
  shopType: number;
  openHour: number;
  closeHour: number;
}

export interface MudProgData {
  trigger: string;
  argList: string;
  commandList: string;
}

const logger = new Logger();

/**
 * Central vnum registry — the TypeScript equivalent of legacy
 * mob_index_hash, obj_index_hash, room_index_hash.
 *
 * All rooms, mobile prototypes, and object prototypes are registered
 * here by vnum during world loading. Every game system that needs
 * to look up an entity by vnum goes through this registry.
 */
export class VnumRegistry {
  private rooms: Map<number, Room> = new Map();
  private mobPrototypes: Map<number, MobilePrototype> = new Map();
  private objPrototypes: Map<number, ObjectPrototype> = new Map();

  // ─── Rooms ────

  registerRoom(vnum: number, room: Room): void {
    if (this.rooms.has(vnum)) {
      logger.warn('world', `Duplicate room vnum ${vnum} — overwriting`);
    }
    this.rooms.set(vnum, room);
  }

  getRoom(vnum: number): Room | undefined {
    return this.rooms.get(vnum);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  // ─── Mobile Prototypes ────

  registerMobPrototype(vnum: number, proto: MobilePrototype): void {
    if (this.mobPrototypes.has(vnum)) {
      logger.warn('world', `Duplicate mobile vnum ${vnum} — overwriting`);
    }
    this.mobPrototypes.set(vnum, proto);
  }

  getMobPrototype(vnum: number): MobilePrototype | undefined {
    return this.mobPrototypes.get(vnum);
  }

  getAllMobPrototypes(): MobilePrototype[] {
    return Array.from(this.mobPrototypes.values());
  }

  get mobCount(): number {
    return this.mobPrototypes.size;
  }

  // ─── Object Prototypes ────

  registerObjPrototype(vnum: number, proto: ObjectPrototype): void {
    if (this.objPrototypes.has(vnum)) {
      logger.warn('world', `Duplicate object vnum ${vnum} — overwriting`);
    }
    this.objPrototypes.set(vnum, proto);
  }

  getObjPrototype(vnum: number): ObjectPrototype | undefined {
    return this.objPrototypes.get(vnum);
  }

  getAllObjPrototypes(): ObjectPrototype[] {
    return Array.from(this.objPrototypes.values());
  }

  get objCount(): number {
    return this.objPrototypes.size;
  }

  // ─── OLC Helpers ────

  /**
   * Find the next unused vnum in a range. Used by OLC (Online Level Creation).
   * Searches type: 'room' | 'mob' | 'obj'.
   * Returns -1 if no free vnum exists in the range.
   */
  getNextFreeVnum(type: 'room' | 'mob' | 'obj', rangeStart: number, rangeEnd: number): number {
    const registry = type === 'room' ? this.rooms
      : type === 'mob' ? this.mobPrototypes
      : this.objPrototypes;

    for (let vnum = rangeStart; vnum <= rangeEnd; vnum++) {
      if (!registry.has(vnum)) return vnum;
    }
    return -1;
  }

  /**
   * Check if a vnum exists in any registry.
   */
  vnumExists(vnum: number): boolean {
    return this.rooms.has(vnum) || this.mobPrototypes.has(vnum) || this.objPrototypes.has(vnum);
  }

  /**
   * Get statistics about registered entities.
   */
  getStats(): { rooms: number; mobs: number; objects: number } {
    return {
      rooms: this.rooms.size,
      mobs: this.mobPrototypes.size,
      objects: this.objPrototypes.size,
    };
  }

  /**
   * Clear all registries. Used for testing and hot-reload.
   */
  clear(): void {
    this.rooms.clear();
    this.mobPrototypes.clear();
    this.objPrototypes.clear();
  }
}
```

---

### 2. `src/game/entities/Room.ts` — Room Entity

Replace the stub with the Room class that holds all room data loaded from JSON:

```typescript
// src/game/entities/Room.ts

import { Direction, SectorType, ExtraDescription, Exit } from './types.js';

/**
 * A single room in the game world.
 * Rooms are loaded from rooms.json during world boot and registered
 * in VnumRegistry. Characters, objects, and exits reference rooms by vnum.
 *
 * Replicates legacy room_index_data from mud.h.
 */
export class Room {
  readonly vnum: number;
  name: string;
  description: string;
  area: any; // Area reference, set during loading
  sectorType: SectorType;
  roomFlags: bigint;
  light: number;
  tunnel: number; // Max occupants, 0 = unlimited
  teleport: { vnum: number; delay: number } | null;

  /** Exits indexed by Direction enum. */
  exits: Map<number, RoomExit> = new Map();

  /** Extra descriptions for 'look' at keywords. */
  extraDescriptions: ExtraDescription[] = [];

  /** Runtime: characters currently in this room. */
  characters: any[] = []; // Character[]

  /** Runtime: objects on the floor in this room. */
  contents: any[] = []; // GameObject[]

  /** Runtime: MudProg programs attached to this room. */
  programs: Array<{ trigger: string; argList: string; commandList: string }> = [];

  constructor(data: RoomJsonData) {
    this.vnum = data.vnum;
    this.name = data.name ?? 'Unnamed Room';
    this.description = data.description ?? '';
    this.sectorType = data.sectorType ?? SectorType.Inside;
    this.roomFlags = BigInt(data.roomFlags ?? 0);
    this.light = data.light ?? 0;
    this.tunnel = data.tunnel ?? 0;
    this.teleport = data.teleport ?? null;

    // Parse exits
    if (data.exits) {
      for (const exitData of data.exits) {
        const exit = new RoomExit(exitData);
        this.exits.set(exit.direction, exit);
      }
    }

    // Parse extra descriptions
    if (data.extraDescriptions) {
      this.extraDescriptions = data.extraDescriptions.map(ed => ({
        keywords: ed.keywords ?? [],
        description: ed.description ?? '',
      }));
    }
  }

  /**
   * Get exit in a direction, or undefined.
   */
  getExit(direction: number): RoomExit | undefined {
    return this.exits.get(direction);
  }

  /**
   * Check if a room flag is set.
   */
  hasFlag(flag: bigint): boolean {
    return (this.roomFlags & flag) !== 0n;
  }

  /**
   * Count the number of player characters in the room.
   */
  get playerCount(): number {
    return this.characters.filter((ch: any) => ch.isPlayer === true).length;
  }

  /**
   * Check if the room is dark (no light sources).
   * Replicates legacy room_is_dark().
   */
  get isDark(): boolean {
    if (this.light > 0) return false;
    // ROOM_DARK flag check (flag value 1n)
    if ((this.roomFlags & 1n) === 0n) return false;
    return true;
  }
}

/**
 * A single exit from a room.
 * Replicates legacy exit_data from mud.h.
 */
export class RoomExit {
  direction: number;
  toVnum: number;
  toRoom: Room | null = null; // Resolved during resolveExits()
  keyword: string;
  description: string;
  exitFlags: number;
  key: number; // Object vnum of key, -1 = none
  distance: number;
  pull: number;
  pullType: number;

  constructor(data: ExitJsonData) {
    this.direction = data.direction;
    this.toVnum = data.toVnum;
    this.keyword = data.keyword ?? '';
    this.description = data.description ?? '';
    this.exitFlags = data.exitFlags ?? 0;
    this.key = data.key ?? -1;
    this.distance = data.distance ?? 1;
    this.pull = data.pull ?? 0;
    this.pullType = data.pullType ?? 0;
  }

  /** Check if exit has a specific flag. */
  hasFlag(flag: number): boolean {
    return (this.exitFlags & flag) !== 0;
  }

  /** Check if exit is a door (has keyword). */
  get isDoor(): boolean {
    return this.keyword !== '';
  }

  /** Check if exit is closed. Flag bit 1 = closed. */
  get isClosed(): boolean {
    return (this.exitFlags & 1) !== 0;
  }

  /** Check if exit is locked. Flag bit 2 = locked. */
  get isLocked(): boolean {
    return (this.exitFlags & 2) !== 0;
  }
}

/** JSON shape for room data (matches world/*/rooms.json). */
export interface RoomJsonData {
  vnum: number;
  name?: string;
  description?: string;
  sectorType?: number;
  roomFlags?: number | string;
  light?: number;
  tunnel?: number;
  teleport?: { vnum: number; delay: number } | null;
  exits?: ExitJsonData[];
  extraDescriptions?: Array<{ keywords: string[]; description: string }>;
}

/** JSON shape for exit data. */
export interface ExitJsonData {
  direction: number;
  toVnum: number;
  keyword?: string;
  description?: string;
  exitFlags?: number;
  key?: number;
  distance?: number;
  pull?: number;
  pullType?: number;
}
```

---

### 3. `src/game/entities/Area.ts` — Area Entity

Replace the stub with the Area class that represents an entire game area:

```typescript
// src/game/entities/Area.ts

import { Room, RoomJsonData } from './Room.js';

/**
 * An area in the game world — a collection of rooms, mobiles, and objects
 * with metadata and reset instructions.
 *
 * Replicates legacy area_data from mud.h.
 */
export class Area {
  name: string;
  filename: string;
  author: string;
  credits: string;
  resetMessage: string;
  flags: number;
  resetFrequency: number; // In area ticks (each area tick = PULSE_AREA)

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

  economy: {
    highEconomy: number;
    lowEconomy: number;
  };

  climate: {
    temp: number;
    precip: number;
    wind: number;
  };

  /** All rooms in this area (populated during loading). */
  rooms: Room[] = [];

  /** Reset commands for this area (loaded from resets.json). */
  resets: ResetCommand[] = [];

  /** Runtime: area age counter (incremented each area tick). */
  age: number = 0;

  /** Runtime: number of players currently in this area. */
  playerCount: number = 0;

  constructor(data: AreaJsonData) {
    this.name = data.name ?? 'Unknown Area';
    this.filename = data.filename ?? '';
    this.author = data.author ?? 'Unknown';
    this.credits = data.credits ?? '';
    this.resetMessage = data.resetMessage ?? '';
    this.flags = data.flags ?? 0;
    this.resetFrequency = data.resetFrequency ?? 15;
    this.vnumRanges = data.vnumRanges ?? {
      rooms: { low: 0, high: 0 },
      mobiles: { low: 0, high: 0 },
      objects: { low: 0, high: 0 },
    };
    this.levelRange = data.levelRange ?? {
      softLow: 0, softHigh: 65, hardLow: 0, hardHigh: 65,
    };
    this.economy = data.economy ?? { highEconomy: 0, lowEconomy: 0 };
    this.climate = data.climate ?? { temp: 0, precip: 0, wind: 0 };
  }

  /**
   * Create a Room from JSON data and add it to this area.
   */
  createRoom(data: RoomJsonData): Room {
    const room = new Room(data);
    room.area = this;
    this.rooms.push(room);
    return room;
  }

  /**
   * Check if a vnum falls within this area's room range.
   */
  containsRoomVnum(vnum: number): boolean {
    return vnum >= this.vnumRanges.rooms.low && vnum <= this.vnumRanges.rooms.high;
  }

  /**
   * Check if a vnum falls within this area's mobile range.
   */
  containsMobVnum(vnum: number): boolean {
    return vnum >= this.vnumRanges.mobiles.low && vnum <= this.vnumRanges.mobiles.high;
  }

  /**
   * Check if a vnum falls within this area's object range.
   */
  containsObjVnum(vnum: number): boolean {
    return vnum >= this.vnumRanges.objects.low && vnum <= this.vnumRanges.objects.high;
  }
}

/** Reset command structure matching legacy reset_data. */
export interface ResetCommand {
  command: 'M' | 'O' | 'P' | 'G' | 'E' | 'D' | 'R';
  arg1: number;
  arg2: number;
  arg3: number;
  extra?: number;
}

/** JSON shape for area metadata (matches world/*/area.json). */
export interface AreaJsonData {
  name?: string;
  filename?: string;
  author?: string;
  credits?: string;
  resetMessage?: string;
  flags?: number;
  resetFrequency?: number;
  vnumRanges?: {
    rooms: { low: number; high: number };
    mobiles: { low: number; high: number };
    objects: { low: number; high: number };
  };
  levelRange?: {
    softLow: number;
    softHigh: number;
    hardLow: number;
    hardHigh: number;
  };
  economy?: {
    highEconomy: number;
    lowEconomy: number;
  };
  climate?: {
    temp: number;
    precip: number;
    wind: number;
  };
}
```

---

### 4. `src/game/world/ResetEngine.ts` — Area Reset System

Replace the stub. Implements the full reset command set that populates rooms with NPCs and objects. Replicates legacy `reset_area()` in `reset.c`:

```typescript
// src/game/world/ResetEngine.ts

import { Area, ResetCommand } from '../entities/Area.js';
import { Room } from '../entities/Room.js';
import { VnumRegistry, MobilePrototype, ObjectPrototype } from './VnumRegistry.js';
import { Logger } from '../../utils/Logger.js';
import { parseDiceString, rollDice } from '../../utils/Dice.js';

const logger = new Logger();

/**
 * Runtime mobile instance created from a prototype during reset.
 * Full Character/Mobile class is defined in later phases;
 * this is the minimal shape needed for reset operations.
 */
export interface MobileInstance {
  prototype: MobilePrototype;
  vnum: number;
  name: string;
  shortDescription: string;
  longDescription: string;
  level: number;
  hit: number;
  maxHit: number;
  mana: number;
  maxMana: number;
  move: number;
  maxMove: number;
  gold: number;
  silver: number;
  copper: number;
  alignment: number;
  position: number;
  inRoom: Room | null;
  resetRoom: Room | null;
  inventory: ObjectInstance[];
  equipment: Map<number, ObjectInstance>;
  isNPC: boolean;
}

/**
 * Runtime object instance created from a prototype during reset.
 */
export interface ObjectInstance {
  prototype: ObjectPrototype;
  vnum: number;
  name: string;
  shortDescription: string;
  description: string;
  itemType: number;
  level: number;
  weight: number;
  values: number[];
  extraFlags: number;
  wearFlags: number;
  timer: number;
  serial: number;
  inRoom: Room | null;
  carriedBy: MobileInstance | null;
  inObject: ObjectInstance | null;
  contents: ObjectInstance[];
}

/**
 * Area Reset Engine.
 * Processes reset commands for an area, creating mob and object
 * instances from prototypes and placing them in the world.
 *
 * Replicates legacy reset_area() from reset.c.
 */
export class ResetEngine {

  /**
   * Reset an area — repopulate mobs and objects per reset commands.
   * Called during initial boot and periodically by the area update cycle.
   *
   * Processing order matches legacy exactly:
   * M (load mob) → O (load obj in room) → P (put obj in obj) →
   * G (give obj to mob) → E (equip obj on mob) → D (set door) → R (randomize exits)
   */
  resetArea(area: Area, vnums: VnumRegistry): void {
    let lastMob: MobileInstance | null = null;
    let lastObj: ObjectInstance | null = null;

    for (const reset of area.resets) {
      switch (reset.command) {
        case 'M': {
          lastMob = this.resetMobile(reset, vnums);
          break;
        }
        case 'O': {
          lastObj = this.resetObject(reset, vnums);
          break;
        }
        case 'P': {
          this.resetPutInObject(reset, vnums, lastObj);
          break;
        }
        case 'G': {
          this.resetGiveToMobile(reset, vnums, lastMob);
          break;
        }
        case 'E': {
          this.resetEquipOnMobile(reset, vnums, lastMob);
          break;
        }
        case 'D': {
          this.resetDoor(reset, vnums);
          break;
        }
        case 'R': {
          this.resetRandomizeExits(reset, vnums);
          break;
        }
        default:
          logger.warn('world', `Unknown reset command '${reset.command}' in area ${area.name}`);
      }
    }

    logger.debug('world', `Reset area: ${area.name}`);
  }

  /**
   * M — Load a mobile into a room.
   * reset.arg1 = mob vnum, reset.arg3 = room vnum, reset.extra = max count.
   */
  private resetMobile(reset: ResetCommand, vnums: VnumRegistry): MobileInstance | null {
    const proto = vnums.getMobPrototype(reset.arg1);
    const room = vnums.getRoom(reset.arg3);

    if (!proto) {
      logger.warn('world', `Reset M: mob vnum ${reset.arg1} not found`);
      return null;
    }
    if (!room) {
      logger.warn('world', `Reset M: room vnum ${reset.arg3} not found`);
      return null;
    }

    // Max count check — don't exceed the limit
    const maxCount = reset.extra ?? 1;
    if (proto.count >= maxCount) {
      return null;
    }

    const mob = this.createMobileInstance(proto);
    mob.inRoom = room;
    mob.resetRoom = room;
    room.characters.push(mob);
    proto.count++;

    return mob;
  }

  /**
   * O — Load an object into a room.
   * reset.arg1 = obj vnum, reset.arg2 = room vnum (legacy uses arg3 for some formats).
   */
  private resetObject(reset: ResetCommand, vnums: VnumRegistry): ObjectInstance | null {
    const proto = vnums.getObjPrototype(reset.arg1);
    // Legacy uses arg3 for room vnum in O resets
    const roomVnum = reset.arg3 !== 0 ? reset.arg3 : reset.arg2;
    const room = vnums.getRoom(roomVnum);

    if (!proto) {
      logger.warn('world', `Reset O: obj vnum ${reset.arg1} not found`);
      return null;
    }
    if (!room) {
      logger.warn('world', `Reset O: room vnum ${roomVnum} not found`);
      return null;
    }

    const obj = this.createObjectInstance(proto);
    obj.inRoom = room;
    room.contents.push(obj);
    proto.count++;

    return obj;
  }

  /**
   * P — Put object inside another object (container).
   * reset.arg1 = obj vnum to create, reset.arg3 = container obj vnum.
   */
  private resetPutInObject(
    reset: ResetCommand,
    vnums: VnumRegistry,
    lastObj: ObjectInstance | null
  ): void {
    const proto = vnums.getObjPrototype(reset.arg1);
    if (!proto) {
      logger.warn('world', `Reset P: obj vnum ${reset.arg1} not found`);
      return;
    }

    if (!lastObj) {
      logger.warn('world', `Reset P: no last object to put vnum ${reset.arg1} into`);
      return;
    }

    const obj = this.createObjectInstance(proto);
    obj.inObject = lastObj;
    lastObj.contents.push(obj);
    proto.count++;
  }

  /**
   * G — Give object to last loaded mobile.
   * reset.arg1 = obj vnum.
   */
  private resetGiveToMobile(
    reset: ResetCommand,
    vnums: VnumRegistry,
    lastMob: MobileInstance | null
  ): void {
    if (!lastMob) {
      logger.warn('world', `Reset G: no last mob to give obj vnum ${reset.arg1} to`);
      return;
    }

    const proto = vnums.getObjPrototype(reset.arg1);
    if (!proto) {
      logger.warn('world', `Reset G: obj vnum ${reset.arg1} not found`);
      return;
    }

    const obj = this.createObjectInstance(proto);
    obj.carriedBy = lastMob;
    lastMob.inventory.push(obj);
    proto.count++;
  }

  /**
   * E — Equip last loaded mobile with an object.
   * reset.arg1 = obj vnum, reset.arg2 = wear location.
   */
  private resetEquipOnMobile(
    reset: ResetCommand,
    vnums: VnumRegistry,
    lastMob: MobileInstance | null
  ): void {
    if (!lastMob) {
      logger.warn('world', `Reset E: no last mob to equip obj vnum ${reset.arg1} on`);
      return;
    }

    const proto = vnums.getObjPrototype(reset.arg1);
    if (!proto) {
      logger.warn('world', `Reset E: obj vnum ${reset.arg1} not found`);
      return;
    }

    const obj = this.createObjectInstance(proto);
    obj.carriedBy = lastMob;
    lastMob.equipment.set(reset.arg2, obj);
    proto.count++;
  }

  /**
   * D — Set door state on a room exit.
   * reset.arg1 = room vnum, reset.arg2 = direction, reset.arg3 = door state flags.
   */
  private resetDoor(reset: ResetCommand, vnums: VnumRegistry): void {
    const room = vnums.getRoom(reset.arg1);
    if (!room) {
      logger.warn('world', `Reset D: room vnum ${reset.arg1} not found`);
      return;
    }

    const exit = room.getExit(reset.arg2);
    if (!exit) {
      logger.warn('world', `Reset D: no exit direction ${reset.arg2} in room ${reset.arg1}`);
      return;
    }

    // arg3: 0=open, 1=closed, 2=closed+locked
    switch (reset.arg3) {
      case 0:
        exit.exitFlags &= ~3; // Clear closed and locked bits
        break;
      case 1:
        exit.exitFlags |= 1;  // Set closed
        exit.exitFlags &= ~2; // Clear locked
        break;
      case 2:
        exit.exitFlags |= 3;  // Set closed and locked
        break;
    }
  }

  /**
   * R — Randomize exit directions in a room (used for mazes).
   * reset.arg1 = room vnum, reset.arg2 = number of exits to randomize.
   * Shuffles the first N exit directions randomly.
   */
  private resetRandomizeExits(reset: ResetCommand, vnums: VnumRegistry): void {
    const room = vnums.getRoom(reset.arg1);
    if (!room) {
      logger.warn('world', `Reset R: room vnum ${reset.arg1} not found`);
      return;
    }

    const maxDir = reset.arg2;
    const directions = Array.from(room.exits.keys()).filter(d => d < maxDir);

    if (directions.length < 2) return;

    // Fisher-Yates shuffle on exit destinations
    const exits = directions.map(d => room.exits.get(d)!);
    for (let i = exits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // Swap toVnum and toRoom between exits[i] and exits[j]
      const tmpVnum = exits[i]!.toVnum;
      const tmpRoom = exits[i]!.toRoom;
      exits[i]!.toVnum = exits[j]!.toVnum;
      exits[i]!.toRoom = exits[j]!.toRoom;
      exits[j]!.toVnum = tmpVnum;
      exits[j]!.toRoom = tmpRoom;
    }
  }

  /**
   * Create a mobile instance from a prototype.
   * Deep-copies prototype fields to the instance.
   * Replicates legacy create_mobile() from handler.c.
   */
  createMobileInstance(proto: MobilePrototype): MobileInstance {
    // Calculate HP from hit dice
    const hitDice = parseDiceString(proto.combat.hitDice);
    const maxHit = rollDice(hitDice.count, hitDice.sides) + hitDice.plus;

    return {
      prototype: proto,
      vnum: proto.vnum,
      name: proto.name,
      shortDescription: proto.shortDescription,
      longDescription: proto.longDescription,
      level: proto.level,
      hit: maxHit,
      maxHit: maxHit,
      mana: 100,
      maxMana: 100,
      move: 100,
      maxMove: 100,
      gold: proto.economy.gold,
      silver: proto.economy.silver,
      copper: proto.economy.copper,
      alignment: proto.alignment,
      position: proto.position,
      inRoom: null,
      resetRoom: null,
      inventory: [],
      equipment: new Map(),
      isNPC: true,
    };
  }

  /**
   * Create an object instance from a prototype.
   * Deep-copies prototype fields to the instance.
   * Replicates legacy create_object() from handler.c.
   */
  createObjectInstance(proto: ObjectPrototype): ObjectInstance {
    proto.serial++;

    return {
      prototype: proto,
      vnum: proto.vnum,
      name: proto.name,
      shortDescription: proto.shortDescription,
      description: proto.description,
      itemType: proto.itemType,
      level: proto.level,
      weight: proto.weight,
      values: [...proto.values], // Deep copy
      extraFlags: proto.extraFlags,
      wearFlags: proto.wearFlags,
      timer: proto.timer,
      serial: proto.serial,
      inRoom: null,
      carriedBy: null,
      inObject: null,
      contents: [],
    };
  }

  /**
   * Check if an area should be reset based on its age and player presence.
   * Replicates legacy area_update() reset condition.
   */
  shouldReset(area: Area): boolean {
    if (area.age < area.resetFrequency) return false;
    // Reset if no players or area is well past due
    return area.playerCount === 0 || area.age >= area.resetFrequency * 2;
  }
}
```

---

### 5. `src/game/world/AreaManager.ts` — Area and World Loader

Replace the stub. This is the central world loading orchestrator that reads all area directories, loads JSON files, populates registries, and manages the area reset lifecycle:

```typescript
// src/game/world/AreaManager.ts

import * as path from 'path';
import { Area, AreaJsonData, ResetCommand } from '../entities/Area.js';
import { Room } from '../entities/Room.js';
import {
  VnumRegistry, MobilePrototype, ObjectPrototype,
  ShopData, RepairShopData, MudProgData
} from './VnumRegistry.js';
import { ResetEngine } from './ResetEngine.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { Logger } from '../../utils/Logger.js';
import {
  readJsonFile, readJsonFileRequired,
  listSubdirectories, exists
} from '../../utils/FileIO.js';
import { numberRange } from '../../utils/Dice.js';

const logger = new Logger();

/**
 * Area Manager — loads, manages, and resets all game areas.
 * Orchestrates the world loading pipeline at boot time and
 * handles periodic area resets via the EventBus tick system.
 *
 * Replicates legacy boot_db() area loading from db.c and
 * area_update() from update.c.
 */
export class AreaManager {
  private areas: Map<string, Area> = new Map();

  constructor(
    private readonly vnumRegistry: VnumRegistry,
    private readonly resetEngine: ResetEngine,
    private readonly eventBus: EventBus
  ) {
    // Subscribe to area tick for periodic resets
    this.eventBus.on(GameEvent.AreaTick ?? 'tick:area', () => this.areaUpdate());
  }

  /**
   * Load all areas from the world/ directory.
   * Each area is a subdirectory containing JSON files.
   * This is the main boot-time world loading entry point.
   *
   * Replicates legacy boot_db() area loading sequence.
   */
  async loadAllAreas(worldDir: string): Promise<void> {
    logger.info('world', `Loading world data from ${worldDir}...`);

    const areaDirs = await listSubdirectories(worldDir);

    if (areaDirs.length === 0) {
      logger.warn('world', `No area directories found in ${worldDir}`);
      return;
    }

    for (const areaDir of areaDirs) {
      try {
        await this.loadArea(areaDir);
      } catch (err: any) {
        logger.error('world', `Failed to load area from ${areaDir}: ${err.message}`);
      }
    }

    logger.info('world', `Loaded ${this.areas.size} areas`);
    logger.info('world', `  Rooms: ${this.vnumRegistry.roomCount}`);
    logger.info('world', `  Mobiles: ${this.vnumRegistry.mobCount}`);
    logger.info('world', `  Objects: ${this.vnumRegistry.objCount}`);
  }

  /**
   * Load a single area from its directory.
   * Reads area.json, rooms.json, mobiles.json, objects.json,
   * resets.json, shops.json, and programs.json.
   */
  private async loadArea(areaDir: string): Promise<void> {
    const areaName = path.basename(areaDir);

    // ── area.json (required) ──
    const areaJsonPath = path.join(areaDir, 'area.json');
    if (!(await exists(areaJsonPath))) {
      logger.warn('world', `Skipping ${areaName}: no area.json found`);
      return;
    }

    const areaJson = await readJsonFileRequired<AreaJsonData>(areaJsonPath);
    const area = new Area(areaJson);
    if (!area.filename) {
      area.filename = areaName;
    }

    // ── rooms.json ──
    await this.loadRooms(areaDir, area);

    // ── mobiles.json ──
    await this.loadMobiles(areaDir, area);

    // ── objects.json ──
    await this.loadObjects(areaDir, area);

    // ── resets.json ──
    await this.loadResets(areaDir, area);

    // ── shops.json ──
    await this.loadShops(areaDir);

    // ── programs.json ──
    await this.loadPrograms(areaDir, area);

    this.areas.set(area.filename, area);
    logger.debug('world', `Loaded area: ${area.name} (${area.rooms.length} rooms)`);
  }

  /**
   * Load rooms from rooms.json and register in VnumRegistry.
   */
  private async loadRooms(areaDir: string, area: Area): Promise<void> {
    const roomsPath = path.join(areaDir, 'rooms.json');
    const roomsJson = await readJsonFile<any[]>(roomsPath);
    if (!roomsJson) return;

    for (const roomData of roomsJson) {
      const room = area.createRoom(roomData);
      this.vnumRegistry.registerRoom(room.vnum, room);
    }
  }

  /**
   * Load mobile prototypes from mobiles.json and register in VnumRegistry.
   */
  private async loadMobiles(areaDir: string, area: Area): Promise<void> {
    const mobsPath = path.join(areaDir, 'mobiles.json');
    const mobsJson = await readJsonFile<any[]>(mobsPath);
    if (!mobsJson) return;

    for (const mobData of mobsJson) {
      const proto: MobilePrototype = {
        vnum: mobData.vnum,
        name: mobData.name ?? '',
        shortDescription: mobData.shortDescription ?? mobData.name ?? '',
        longDescription: mobData.longDescription ?? '',
        description: mobData.description ?? '',
        keywords: mobData.keywords ?? (mobData.name ?? '').split(/\s+/),
        level: mobData.level ?? 1,
        sex: mobData.sex ?? 0,
        race: mobData.race ?? 0,
        class: mobData.class ?? 0,
        alignment: mobData.alignment ?? 0,
        actFlags: BigInt(mobData.actFlags ?? '0'),
        affectedBy: BigInt(mobData.affectedBy ?? '0'),
        position: mobData.position ?? 8,   // standing
        defaultPosition: mobData.defaultPosition ?? mobData.position ?? 8,
        stats: {
          str: mobData.stats?.str ?? 13,
          int: mobData.stats?.int ?? 13,
          wis: mobData.stats?.wis ?? 13,
          dex: mobData.stats?.dex ?? 13,
          con: mobData.stats?.con ?? 13,
          cha: mobData.stats?.cha ?? 13,
          lck: mobData.stats?.lck ?? 13,
        },
        combat: {
          hitDice: mobData.combat?.hitDice ?? '1d8+0',
          damDice: mobData.combat?.damDice ?? '1d4+0',
          hitroll: mobData.combat?.hitroll ?? 0,
          damroll: mobData.combat?.damroll ?? 0,
          armor: mobData.combat?.armor ?? 100,
          numAttacks: mobData.combat?.numAttacks ?? 1,
          attacks: mobData.combat?.attacks ?? 0,
          defenses: mobData.combat?.defenses ?? 0,
        },
        savingThrows: {
          poison: mobData.savingThrows?.poison ?? 0,
          rod: mobData.savingThrows?.rod ?? 0,
          para: mobData.savingThrows?.para ?? 0,
          breath: mobData.savingThrows?.breath ?? 0,
          spell: mobData.savingThrows?.spell ?? 0,
        },
        ris: {
          immune: mobData.ris?.immune ?? 0,
          resistant: mobData.ris?.resistant ?? 0,
          susceptible: mobData.ris?.susceptible ?? 0,
        },
        economy: {
          gold: mobData.economy?.gold ?? 0,
          silver: mobData.economy?.silver ?? 0,
          copper: mobData.economy?.copper ?? 0,
          exp: mobData.economy?.exp ?? 0,
        },
        languages: {
          speaking: mobData.languages?.speaking ?? 0,
          speaks: mobData.languages?.speaks ?? 0,
        },
        specFun: mobData.specFun ?? '',
        stances: mobData.stances ?? [],
        count: 0,
        programs: [],
      };

      this.vnumRegistry.registerMobPrototype(proto.vnum, proto);
    }
  }

  /**
   * Load object prototypes from objects.json and register in VnumRegistry.
   */
  private async loadObjects(areaDir: string, area: Area): Promise<void> {
    const objsPath = path.join(areaDir, 'objects.json');
    const objsJson = await readJsonFile<any[]>(objsPath);
    if (!objsJson) return;

    for (const objData of objsJson) {
      const proto: ObjectPrototype = {
        vnum: objData.vnum,
        name: objData.name ?? '',
        shortDescription: objData.shortDescription ?? objData.name ?? '',
        description: objData.description ?? '',
        actionDescription: objData.actionDescription ?? '',
        keywords: objData.keywords ?? (objData.name ?? '').split(/\s+/),
        itemType: objData.itemType ?? 0,
        level: objData.level ?? 1,
        weight: objData.weight ?? 1,
        extraFlags: objData.extraFlags ?? 0,
        magicFlags: objData.magicFlags ?? 0,
        wearFlags: objData.wearFlags ?? 0,
        values: objData.values ?? [0, 0, 0, 0, 0, 0],
        cost: {
          gold: objData.cost?.gold ?? 0,
          silver: objData.cost?.silver ?? 0,
          copper: objData.cost?.copper ?? 0,
        },
        layers: objData.layers ?? 0,
        timer: objData.timer ?? 0,
        affects: (objData.affects ?? []).map((a: any) => ({
          location: a.location ?? 0,
          modifier: a.modifier ?? 0,
        })),
        extraDescriptions: (objData.extraDescriptions ?? []).map((ed: any) => ({
          keywords: ed.keywords ?? [],
          description: ed.description ?? '',
        })),
        count: 0,
        serial: 0,
        programs: [],
      };

      this.vnumRegistry.registerObjPrototype(proto.vnum, proto);
    }
  }

  /**
   * Load reset commands from resets.json.
   */
  private async loadResets(areaDir: string, area: Area): Promise<void> {
    const resetsPath = path.join(areaDir, 'resets.json');
    const resetsJson = await readJsonFile<ResetCommand[]>(resetsPath);
    if (!resetsJson) return;

    area.resets = resetsJson;
  }

  /**
   * Load shop data from shops.json and attach to mobile prototypes.
   */
  private async loadShops(areaDir: string): Promise<void> {
    const shopsPath = path.join(areaDir, 'shops.json');
    const shopsJson = await readJsonFile<any[]>(shopsPath);
    if (!shopsJson) return;

    for (const shopData of shopsJson) {
      const keeperVnum = shopData.keeperVnum;
      const proto = this.vnumRegistry.getMobPrototype(keeperVnum);
      if (!proto) {
        logger.warn('world', `Shop keeper vnum ${keeperVnum} not found`);
        continue;
      }

      if (shopData.fixTypes) {
        // Repair shop
        proto.repairShop = {
          keeperVnum,
          fixTypes: shopData.fixTypes ?? [],
          profitFix: shopData.profitFix ?? 100,
          shopType: shopData.shopType ?? 0,
          openHour: shopData.openHour ?? 0,
          closeHour: shopData.closeHour ?? 23,
        };
      } else {
        // Regular shop
        proto.shop = {
          keeperVnum,
          buyTypes: shopData.buyTypes ?? [],
          profitBuy: shopData.profitBuy ?? 120,
          profitSell: shopData.profitSell ?? 90,
          openHour: shopData.openHour ?? 0,
          closeHour: shopData.closeHour ?? 23,
        };
      }
    }
  }

  /**
   * Load MUD programs from programs.json and attach to prototypes.
   */
  private async loadPrograms(areaDir: string, area: Area): Promise<void> {
    const progsPath = path.join(areaDir, 'programs.json');
    const progsJson = await readJsonFile<any>(progsPath);
    if (!progsJson) return;

    // Attach mob programs
    if (progsJson.mobProgs) {
      for (const entry of progsJson.mobProgs) {
        const proto = this.vnumRegistry.getMobPrototype(entry.mobVnum);
        if (proto && entry.programs) {
          proto.programs = entry.programs;
        }
      }
    }

    // Attach object programs
    if (progsJson.objProgs) {
      for (const entry of progsJson.objProgs) {
        const proto = this.vnumRegistry.getObjPrototype(entry.mobVnum ?? entry.objVnum);
        if (proto && entry.programs) {
          proto.programs = entry.programs;
        }
      }
    }

    // Attach room programs
    if (progsJson.roomProgs) {
      for (const entry of progsJson.roomProgs) {
        const room = this.vnumRegistry.getRoom(entry.mobVnum ?? entry.roomVnum);
        if (room && entry.programs) {
          room.programs = entry.programs;
        }
      }
    }
  }

  /**
   * Resolve all exit destinations across all loaded areas.
   * Must be called after all areas are loaded because exits
   * can reference rooms in other areas.
   *
   * Replicates the exit linking pass in legacy boot_db().
   */
  resolveExits(): void {
    let resolved = 0;
    let unresolved = 0;

    for (const room of this.vnumRegistry.getAllRooms()) {
      for (const exit of room.exits.values()) {
        if (exit.toVnum <= 0) continue;

        const targetRoom = this.vnumRegistry.getRoom(exit.toVnum);
        if (targetRoom) {
          exit.toRoom = targetRoom;
          resolved++;
        } else {
          logger.warn('world',
            `Unresolved exit: room ${room.vnum} direction ${exit.direction} → vnum ${exit.toVnum}`
          );
          unresolved++;
        }
      }
    }

    logger.info('world', `Exit resolution: ${resolved} resolved, ${unresolved} unresolved`);
  }

  /**
   * Run initial area resets for all loaded areas.
   * Called once at boot time after all areas are loaded and exits resolved.
   */
  performInitialResets(): void {
    for (const area of this.areas.values()) {
      this.resetEngine.resetArea(area, this.vnumRegistry);
      // Randomize initial age so areas don't all reset simultaneously
      area.age = Math.floor(Math.random() * (area.resetFrequency / 2));
    }
    logger.info('world', `Initial resets completed for ${this.areas.size} areas`);
  }

  /**
   * Area update — called every PULSE_AREA (randomized ~60s).
   * Checks each area's age against reset frequency.
   * Replicates legacy area_update() from update.c.
   */
  private areaUpdate(): void {
    for (const area of this.areas.values()) {
      area.age++;

      if (this.resetEngine.shouldReset(area)) {
        // Clear existing mob/obj counts before reset
        this.clearAreaInstances(area);

        this.resetEngine.resetArea(area, this.vnumRegistry);

        // Randomize next reset age
        area.age = numberRange(0, Math.floor(area.resetFrequency / 2));

        // Emit area reset event
        this.eventBus.emit(
          GameEvent.AreaReset ?? 'world:areaReset',
          { areaName: area.name, filename: area.filename }
        );

        // Show reset message to players in the area
        if (area.resetMessage) {
          this.sendResetMessage(area);
        }
      }
    }
  }

  /**
   * Clear mob/obj instance counts for prototypes in an area's vnum range.
   * Called before re-running resets to prevent count accumulation.
   */
  private clearAreaInstances(area: Area): void {
    // Reset mob prototype counts in this area's range
    for (const proto of this.vnumRegistry.getAllMobPrototypes()) {
      if (area.containsMobVnum(proto.vnum)) {
        proto.count = 0;
      }
    }

    // Reset obj prototype counts in this area's range
    for (const proto of this.vnumRegistry.getAllObjPrototypes()) {
      if (area.containsObjVnum(proto.vnum)) {
        proto.count = 0;
      }
    }

    // Clear characters and contents from rooms in this area
    for (const room of area.rooms) {
      room.characters = room.characters.filter((ch: any) => ch.isNPC !== true);
      room.contents = [];
    }
  }

  /**
   * Send the area's reset message to all players in the area.
   */
  private sendResetMessage(area: Area): void {
    for (const room of area.rooms) {
      for (const ch of room.characters) {
        if (ch.isNPC === false && ch.sendToChar) {
          ch.sendToChar(`${area.resetMessage}\r\n`);
        }
      }
    }
  }

  // ─── Accessors ────

  getArea(filename: string): Area | undefined {
    return this.areas.get(filename);
  }

  getAreaByName(name: string): Area | undefined {
    for (const area of this.areas.values()) {
      if (area.name.toLowerCase() === name.toLowerCase()) return area;
    }
    return undefined;
  }

  getAllAreas(): Area[] {
    return Array.from(this.areas.values());
  }

  get areaCount(): number {
    return this.areas.size;
  }

  /**
   * Find the area that contains a given room vnum.
   */
  getAreaForRoom(vnum: number): Area | undefined {
    for (const area of this.areas.values()) {
      if (area.containsRoomVnum(vnum)) return area;
    }
    return undefined;
  }
}
```

---

### 6. `src/game/world/RoomManager.ts` — Room Utility Functions

Replace the stub with room lookup and management utilities used by movement, combat, and information commands:

```typescript
// src/game/world/RoomManager.ts

import { Room, RoomExit } from '../entities/Room.js';
import { VnumRegistry } from './VnumRegistry.js';
import { Direction } from '../entities/types.js';

/**
 * Room management utilities.
 * Provides convenience functions for room lookups, distance calculations,
 * and room-related queries used by multiple subsystems.
 */
export class RoomManager {
  constructor(private readonly vnumRegistry: VnumRegistry) {}

  /**
   * Get a room by vnum. Convenience wrapper around VnumRegistry.
   */
  getRoom(vnum: number): Room | undefined {
    return this.vnumRegistry.getRoom(vnum);
  }

  /**
   * Find the reverse direction for an exit.
   * N↔S, E↔W, U↔D, NE↔SW, NW↔SE.
   */
  reverseDirection(direction: number): number {
    const REVERSE_MAP: Record<number, number> = {
      0: 2,   // North → South
      1: 3,   // East → West
      2: 0,   // South → North
      3: 1,   // West → East
      4: 5,   // Up → Down
      5: 4,   // Down → Up
      6: 9,   // NorthEast → SouthWest
      7: 8,   // NorthWest → SouthEast
      8: 7,   // SouthEast → NorthWest
      9: 6,   // SouthWest → NorthEast
    };
    return REVERSE_MAP[direction] ?? direction;
  }

  /**
   * Get the short direction name.
   */
  directionName(direction: number): string {
    const NAMES: readonly string[] = [
      'north', 'east', 'south', 'west', 'up', 'down',
      'northeast', 'northwest', 'southeast', 'southwest', 'somewhere',
    ];
    return NAMES[direction] ?? 'somewhere';
  }

  /**
   * Get the short direction abbreviation.
   */
  directionAbbrev(direction: number): string {
    const ABBREVS: readonly string[] = [
      'n', 'e', 's', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw', '?',
    ];
    return ABBREVS[direction] ?? '?';
  }

  /**
   * Find a path between two rooms using BFS (for tracking skill).
   * Returns the first direction to move, or -1 if no path found.
   * maxDepth limits search depth (default 100, matching legacy TRACK_THROUGH).
   */
  findPath(fromVnum: number, toVnum: number, maxDepth: number = 100): number {
    const from = this.vnumRegistry.getRoom(fromVnum);
    const to = this.vnumRegistry.getRoom(toVnum);
    if (!from || !to || fromVnum === toVnum) return -1;

    const visited = new Set<number>();
    const queue: Array<{ room: Room; firstDirection: number; depth: number }> = [];

    visited.add(fromVnum);

    for (const [dir, exit] of from.exits) {
      if (exit.toRoom && !exit.isClosed) {
        if (exit.toRoom.vnum === toVnum) return dir;
        visited.add(exit.toRoom.vnum);
        queue.push({ room: exit.toRoom, firstDirection: dir, depth: 1 });
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      for (const [dir, exit] of current.room.exits) {
        if (!exit.toRoom || exit.isClosed) continue;
        if (visited.has(exit.toRoom.vnum)) continue;

        if (exit.toRoom.vnum === toVnum) return current.firstDirection;
        visited.add(exit.toRoom.vnum);
        queue.push({
          room: exit.toRoom,
          firstDirection: current.firstDirection,
          depth: current.depth + 1,
        });
      }
    }

    return -1; // No path found
  }

  /**
   * Count characters in a room (for tunnel limit checks).
   */
  roomOccupantCount(room: Room): number {
    return room.characters.length;
  }

  /**
   * Check if a room is at its tunnel capacity.
   */
  isRoomFull(room: Room): boolean {
    if (room.tunnel === 0) return false; // Unlimited
    return room.characters.length >= room.tunnel;
  }

  /**
   * Get a formatted exit list string for a room (used by 'exits' command).
   */
  getExitString(room: Room, showClosed: boolean = false): string {
    const exitParts: string[] = [];
    for (const [dir, exit] of room.exits) {
      if (!exit.toRoom && !showClosed) continue;
      const name = this.directionName(dir);
      if (exit.isClosed && !showClosed) {
        continue;
      }
      if (exit.isClosed) {
        exitParts.push(`(${name})`);
      } else {
        exitParts.push(name);
      }
    }
    return exitParts.length > 0 ? exitParts.join(' ') : 'none';
  }
}
```

---

### 7. Test Fixture: `tests/fixtures/testArea/`

Create a minimal test area with realistic data for integration testing. This area should exercise all reset types and entity features:

#### `tests/fixtures/testArea/midgaard/area.json`
```json
{
  "name": "Midgaard",
  "filename": "midgaard",
  "author": "Test",
  "resetMessage": "You hear the city bells toll.",
  "resetFrequency": 15,
  "vnumRanges": {
    "rooms": { "low": 3000, "high": 3099 },
    "mobiles": { "low": 3000, "high": 3099 },
    "objects": { "low": 3000, "high": 3099 }
  },
  "levelRange": { "softLow": 1, "softHigh": 15, "hardLow": 0, "hardHigh": 30 }
}
```

#### `tests/fixtures/testArea/midgaard/rooms.json`
```json
[
  {
    "vnum": 3001,
    "name": "The Temple of Mota",
    "description": "You are in the southern end of the temple hall...",
    "sectorType": 0,
    "roomFlags": 8,
    "exits": [
      { "direction": 0, "toVnum": 3005 },
      { "direction": 2, "toVnum": 3006 },
      { "direction": 3, "toVnum": 3054 }
    ]
  },
  {
    "vnum": 3005,
    "name": "The Temple Square",
    "description": "The temple square is a busy place...",
    "sectorType": 1,
    "exits": [
      { "direction": 0, "toVnum": 3004 },
      { "direction": 1, "toVnum": 3003 },
      { "direction": 2, "toVnum": 3001 },
      { "direction": 3, "toVnum": 3021 }
    ]
  },
  {
    "vnum": 3003,
    "name": "The Market Street",
    "description": "A busy market street...",
    "sectorType": 1,
    "exits": [
      { "direction": 3, "toVnum": 3005 }
    ]
  },
  {
    "vnum": 3004,
    "name": "North Temple Square",
    "description": "The northern part of the temple square...",
    "sectorType": 1,
    "exits": [
      { "direction": 2, "toVnum": 3005 }
    ]
  },
  {
    "vnum": 3006,
    "name": "South Temple",
    "description": "The southern part of the temple...",
    "sectorType": 0,
    "exits": [
      { "direction": 0, "toVnum": 3001 }
    ]
  },
  {
    "vnum": 3021,
    "name": "The General Store",
    "description": "A well-stocked general store...",
    "sectorType": 0,
    "exits": [
      { "direction": 1, "toVnum": 3005 }
    ]
  },
  {
    "vnum": 3054,
    "name": "The City Gate",
    "description": "The main gate of the city...",
    "sectorType": 1,
    "roomFlags": 0,
    "exits": [
      { "direction": 1, "toVnum": 3001 },
      { "direction": 3, "toVnum": 9999, "keyword": "gate", "exitFlags": 1, "key": 3098 }
    ]
  }
]
```

#### `tests/fixtures/testArea/midgaard/mobiles.json`
```json
[
  {
    "vnum": 3001,
    "name": "cityguard guard",
    "shortDescription": "the cityguard",
    "longDescription": "A cityguard stands here, protecting the citizens.",
    "level": 15,
    "sex": 1,
    "alignment": 1000,
    "actFlags": "2",
    "combat": {
      "hitDice": "5d8+100",
      "damDice": "2d6+5",
      "hitroll": 5,
      "damroll": 5,
      "armor": 50,
      "numAttacks": 2
    },
    "economy": { "gold": 50 }
  },
  {
    "vnum": 3010,
    "name": "shopkeeper merchant",
    "shortDescription": "the shopkeeper",
    "longDescription": "A friendly shopkeeper tends the store.",
    "level": 10,
    "sex": 1,
    "actFlags": "2",
    "economy": { "gold": 500 }
  }
]
```

#### `tests/fixtures/testArea/midgaard/objects.json`
```json
[
  {
    "vnum": 3001,
    "name": "short sword",
    "shortDescription": "a short sword",
    "description": "A short sword lies here.",
    "itemType": 5,
    "level": 3,
    "weight": 5,
    "wearFlags": 8193,
    "values": [0, 1, 6, 3, 0, 0],
    "cost": { "gold": 25 }
  },
  {
    "vnum": 3010,
    "name": "bread loaf",
    "shortDescription": "a loaf of bread",
    "description": "A loaf of bread has been left here.",
    "itemType": 19,
    "level": 1,
    "weight": 1,
    "values": [12, 12, 0, 0, 0, 0],
    "cost": { "copper": 50 }
  },
  {
    "vnum": 3098,
    "name": "gate key",
    "shortDescription": "a rusty gate key",
    "description": "A rusty key lies here.",
    "itemType": 18,
    "level": 1,
    "weight": 1,
    "values": [0, 0, 0, 0, 0, 0]
  }
]
```

#### `tests/fixtures/testArea/midgaard/resets.json`
```json
[
  { "command": "M", "arg1": 3001, "arg2": 1, "arg3": 3001, "extra": 2 },
  { "command": "E", "arg1": 3001, "arg2": 16, "arg3": 0 },
  { "command": "M", "arg1": 3001, "arg2": 1, "arg3": 3005, "extra": 2 },
  { "command": "M", "arg1": 3010, "arg2": 1, "arg3": 3021, "extra": 1 },
  { "command": "G", "arg1": 3010, "arg2": 0, "arg3": 0 },
  { "command": "O", "arg1": 3010, "arg2": 0, "arg3": 3005 },
  { "command": "D", "arg1": 3054, "arg2": 3, "arg3": 1 }
]
```

#### `tests/fixtures/testArea/midgaard/shops.json`
```json
[
  {
    "keeperVnum": 3010,
    "buyTypes": [5, 9, 19],
    "profitBuy": 120,
    "profitSell": 90,
    "openHour": 6,
    "closeHour": 20
  }
]
```

#### `tests/fixtures/testArea/midgaard/programs.json`
```json
{
  "mobProgs": [],
  "objProgs": [],
  "roomProgs": []
}
```

---

### 8. `src/main.ts` — Updated Boot Sequence

Update the existing `main.ts` to incorporate world loading:

Add these steps after the existing boot sequence (Prisma connect, EventBus, TickEngine, GameLoop creation):

```typescript
// ── After existing infrastructure setup ──

import { VnumRegistry } from './game/world/VnumRegistry.js';
import { ResetEngine } from './game/world/ResetEngine.js';
import { AreaManager } from './game/world/AreaManager.js';
import { RoomManager } from './game/world/RoomManager.js';

// 5. Create world management instances
const vnumRegistry = new VnumRegistry();
const resetEngine = new ResetEngine();
const areaManager = new AreaManager(vnumRegistry, resetEngine, eventBus);
const roomManager = new RoomManager(vnumRegistry);

// 6. Load all areas from world/ directory
await areaManager.loadAllAreas('./world');

// 7. Resolve cross-area exit references
areaManager.resolveExits();

// 8. Run initial area resets
areaManager.performInitialResets();

// 9. Log world statistics
const stats = vnumRegistry.getStats();
logger.info('boot', `World loaded: ${areaManager.areaCount} areas, ${stats.rooms} rooms, ${stats.mobs} mobs, ${stats.objects} objects`);

// ── Continue with existing network/gameloop startup ──
```

---

## Tests for Sub-Phase 3D

### `tests/unit/world/VnumRegistry.test.ts`

- Test `registerRoom()` stores and retrieves rooms by vnum correctly.
- Test `getRoom()` returns `undefined` for unregistered vnums.
- Test duplicate vnum registration logs a warning but does not throw.
- Test `registerMobPrototype()` and `registerObjPrototype()` work correctly.
- Test `getNextFreeVnum('room', 100, 110)` returns the first unused vnum.
- Test `getNextFreeVnum()` returns -1 when range is fully occupied.
- Test `getStats()` returns correct counts.
- Test `clear()` empties all registries.
- Test `vnumExists()` returns true for registered vnums across all types.

### `tests/unit/world/ResetEngine.test.ts`

- Test `M` reset: Creates a mobile instance in the target room. Verify `room.characters` contains the new mob.
- Test `M` reset with max count: When `proto.count >= maxCount`, no new mob is created.
- Test `O` reset: Creates an object in the target room. Verify `room.contents` contains the new object.
- Test `G` reset: Creates an object in the last mob's inventory.
- Test `E` reset: Creates an object and equips it on the last mob at the specified wear location.
- Test `P` reset: Creates an object inside the last created object (container nesting).
- Test `D` reset: Sets door flags on the specified exit. Verify `exit.exitFlags` matches the expected state (open, closed, locked).
- Test `R` reset: Randomizes exits. Run multiple times and verify exit destinations change.
- Test `createMobileInstance()`: Verify HP is rolled from hit dice, fields are copied from prototype.
- Test `createObjectInstance()`: Verify serial counter increments, values array is deep-copied.
- Test `shouldReset()`: Returns false when age < resetFrequency; returns true when age >= resetFrequency and playerCount is 0.

### `tests/unit/world/Room.test.ts`

- Test Room constructor correctly parses JSON data with all fields.
- Test Room constructor with minimal JSON (just vnum and name) applies defaults.
- Test `room.getExit()` returns the correct exit or undefined.
- Test `room.hasFlag()` with bigint room flags.
- Test `room.isDark` returns true when ROOM_DARK flag is set and light is 0.
- Test RoomExit properties: `isClosed`, `isLocked`, `isDoor`.

### `tests/unit/world/Area.test.ts`

- Test Area constructor parses all JSON fields correctly.
- Test `createRoom()` adds the room to `area.rooms` and sets `room.area`.
- Test `containsRoomVnum()` returns true/false for vnums inside/outside the range.
- Test `containsMobVnum()` and `containsObjVnum()` range checks.

### `tests/unit/world/RoomManager.test.ts`

- Test `reverseDirection()` for all 10 directions.
- Test `directionName()` returns correct names.
- Test `directionAbbrev()` returns correct abbreviations.
- Test `findPath()` finds a path between two connected rooms.
- Test `findPath()` returns -1 when no path exists.
- Test `findPath()` respects closed doors.
- Test `isRoomFull()` with tunnel limits.
- Test `getExitString()` formats exits correctly.

### `tests/integration/WorldLoader.test.ts`

- Load the test fixture area from `tests/fixtures/testArea/midgaard/`.
- Verify `vnumRegistry.getRoom(3001)` returns the Temple of Mota.
- Verify room 3001 has exits to rooms 3005, 3006, and 3054.
- Verify `vnumRegistry.getMobPrototype(3001)` returns the cityguard with level 15.
- Verify `vnumRegistry.getObjPrototype(3001)` returns the short sword with itemType 5.
- After `resolveExits()`, verify `room3001.getExit(0).toRoom` is `room3005`.
- After `performInitialResets()`, verify room 3001 has at least one cityguard character.
- After reset, verify the shopkeeper (vnum 3010) is in room 3021 and has shop data.
- After reset, verify the bread object (vnum 3010) is on the ground in room 3005.
- After `D` reset, verify the gate exit in room 3054 direction 3 has exitFlags with closed bit set.
- Verify exit to unresolvable vnum 9999 has `toRoom === null` and generates a warning.
- Verify total room count matches the 7 rooms in the test fixture.
- Verify area `resetMessage` is set correctly.

---

## Acceptance Criteria

- [ ] `VnumRegistry` stores and retrieves rooms, mob prototypes, and object prototypes by vnum. Duplicate vnums log warnings.
- [ ] `VnumRegistry.getRoom(3001)` returns the Temple of Mota after loading the test fixture.
- [ ] `getNextFreeVnum('room', 3000, 3099)` returns the first unused vnum in the range.
- [ ] `Room` constructor correctly parses all JSON fields: vnum, name, description, sectorType, roomFlags (as bigint), exits, extra descriptions, tunnel, teleport.
- [ ] `RoomExit` correctly reports `isClosed`, `isLocked`, and `isDoor` properties.
- [ ] `Area` constructor parses all metadata including vnumRanges, levelRange, economy, climate.
- [ ] `ResetEngine` processes all 7 reset command types (M, O, P, G, E, D, R) correctly.
- [ ] `M` reset respects max count — does not create mobs beyond the limit.
- [ ] `E` reset equips objects on the last loaded mob at the correct wear location.
- [ ] `D` reset sets door states: arg3=0 → open, arg3=1 → closed, arg3=2 → closed+locked.
- [ ] `AreaManager.loadAllAreas()` scans directories, loads all JSON files, and registers all entities.
- [ ] `AreaManager.resolveExits()` links exit vnums to Room references across areas. Unresolved exits log warnings.
- [ ] `AreaManager.performInitialResets()` populates rooms with NPCs and objects per reset commands.
- [ ] After loading the test fixture: room 3001 contains cityguard characters; room 3021 contains the shopkeeper; room 3005 contains bread on the ground.
- [ ] Area update cycle (`areaUpdate()`) increments area age and triggers resets when conditions are met.
- [ ] `RoomManager.reverseDirection(0)` returns 2 (North → South), and all 10 direction pairs are correct.
- [ ] `RoomManager.findPath()` finds a path between connected rooms via BFS and returns -1 for disconnected rooms.
- [ ] `main.ts` boot sequence includes world loading, exit resolution, and initial resets. Logs area/room/mob/object counts.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
