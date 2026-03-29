# SMAUG 2.0 TypeScript Port — Phase 3N: Progression, Leveling, and Class/Race System

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phases 1 and 2 have scaffolded the full project structure, installed all dependencies, created stub files with JSDoc headers, configured the build toolchain (TypeScript strict mode, Vitest, ESLint, Prisma), and wired up the core engine skeleton (GameLoop, TickEngine, EventBus, ConnectionManager, Telnet/WebSocket listeners, entity base classes, CommandRegistry with dispatch pipeline, admin module stubs, Prisma schema, and example world JSON). All stub files exist but contain only interfaces, type definitions, and empty method bodies. Phase 3 fills in every method body with working game logic.
>
> **Your role:** You are an expert TypeScript/Node.js engineer with deep knowledge of MUD engine architecture. You have access to five reference documents that describe the legacy C codebase in exhaustive detail:
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `COMMANDS.md` — Full command table with trust levels, positions, and flags
> - `STRUCTURE.md` — File inventory and subsystem grouping

## Cardinal Rules (apply to ALL code you produce)

1. **Preserve legacy gameplay exactly.** Every formula, threshold, constant, and order-of-operations must match the C original. When the architecture doc says "replicates legacy X", implement it verbatim.
2. **Use the scaffolded file paths.** Do not create new files or rename existing ones. Every file referenced below already exists as a stub.
3. **Follow the TypeScript patterns established in ARCHITECTURE.md.** Use the exact class names, method signatures, enum values, and interface shapes defined there.
4. **Emit EventBus events** at every documented hook point (combat start/end, room enter/leave, death, level gain, etc.) so that downstream systems (MUDprogs, logging, admin dashboard) can subscribe.
5. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
6. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
7. **Handle edge cases defensively.** Check for null rooms, dead characters, extracted objects before every operation. The legacy code is littered with `char_died()` and `obj_extracted()` guards — replicate them.
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
│   ├── utils/              # AnsiColors, Dice, StringUtils, BitVector, Logger
│   └── migration/          # AreFileParser, PlayerFileParser, MigrationRunner
├── prisma/schema.prisma
├── world/                  # JSON world data files (one subdirectory per area)
├── tests/                  # Unit, integration, e2e tests
└── public/                 # Browser client and admin dashboard static files
```

## Prior Sub-Phases Completed

**Sub-Phases 3A–3M** are complete. The following files are fully implemented and may be imported:

### Sub-Phase 3A (Utilities, World Loader, Command Parser)
- `src/utils/AnsiColors.ts` — `colorize()`, `colorStrlen()`, `stripColor()`, `padRight()`, `padCenter()`, `wordWrap()`
- `src/utils/Dice.ts` — `rollDice()`, `numberRange()`, `numberPercent()`, `numberFuzzy()`, `parseDiceString()`
- `src/utils/BitVector.ts` — `hasFlag()`, `setFlag()`, `removeFlag()`, `flagsToArray()`, `parseFlagString()`
- `src/utils/StringUtils.ts` — `isName()`, `isNamePrefix()`, `oneArgument()`, `strPrefix()`, `numberArgument()`
- `src/game/world/AreaManager.ts` — `loadAllAreas()`, `resolveExits()`
- `src/game/world/VnumRegistry.ts` — `getRoom()`, `getMobPrototype()`, `getObjPrototype()`
- `src/game/world/ResetEngine.ts` — `resetArea()`, `shouldReset()`
- `src/game/commands/CommandRegistry.ts` — `interpret()`, `registerCommand()`, `findCommand()`
- `src/game/commands/social.ts` — `loadSocials()`, `executeSocial()`
- `src/network/ConnectionManager.ts` — Full nanny state machine, output pager
- `src/main.ts` — Boot sequence

### Sub-Phase 3B (Movement, Look, Combat)
- `src/game/commands/movement.ts` — `moveChar()`, direction commands, door commands, `doRecall()`, `doFlee()`
- `src/game/commands/information.ts` — `doLook()`, `doExamine()`, `doScore()`, `doWho()`, `doHelp()`, `doAffects()`, `doEquipment()`, `doInventory()`, `doConsider()`
- `src/game/combat/CombatEngine.ts` — `violenceUpdate()`, `multiHit()`, `oneHit()`, `inflictDamage()`, `startCombat()`, `stopFighting()`
- `src/game/combat/DamageCalculator.ts` — `getDamageMessage()`, `calcThac0()`, `calcDamageBonus()`, `checkImmune()`
- `src/game/combat/DeathHandler.ts` — `handleDeath()`, `makeCorpse()`, XP award calculation
- `src/game/commands/combat.ts` — All combat skill commands (kill, bash, kick, backstab, etc.)
- `src/game/entities/Character.ts` — `hitGain()`, `manaGain()`, `moveGain()`, `updatePosition()`, `charUpdate()`

### Sub-Phase 3C–3M (Magic, Skills, Affects, Inventory, Perception, Economy, etc.)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3N Objective

Implement the complete character progression system: experience points, level advancement, stat gains on level-up, race and class data tables, training, practice sessions, title system, multi-class considerations, and all level-related player and immortal commands. After this sub-phase, characters earn XP from kills and quests, advance through levels with proper HP/mana/move gains, train attributes at trainers, practice skills at guildmasters, and display progression information — all pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/entities/tables.ts` — Race and Class Data Tables

Define the canonical race and class data tables. Replicates legacy `race_table[]` and `class_table[]` from `tables.c`:

#### Race Table

```typescript
/**
 * Race data entry. Replicates legacy race_type structure from mud.h.
 */
export interface RaceEntry {
  /** Race name (display). */
  name: string;
  /** Race enum index. */
  index: number;
  /** Per-class availability: array of class indices this race can be. */
  classRestrictions: number[];
  /** Stat modifiers applied at character creation. */
  strMod: number;
  intMod: number;
  wisMod: number;
  dexMod: number;
  conMod: number;
  chaMod: number;
  lckMod: number;
  /** HP modifier per level (added to class HP roll). */
  hpMod: number;
  /** Mana modifier per level (added to class mana roll). */
  manaMod: number;
  /** Natural resistances (RIS bitmask). */
  resistances: number;
  /** Natural susceptibilities (RIS bitmask). */
  susceptibilities: number;
  /** Languages spoken (language bitmask). */
  languages: number;
  /** Size category (0=tiny, 1=small, 2=medium, 3=large, 4=huge, 5=giant). */
  size: number;
  /** Minimum starting alignment. */
  alignMin: number;
  /** Maximum starting alignment. */
  alignMax: number;
  /** Starting room vnum (0 = default recall). */
  startingRoom: number;
  /** Natural AC bonus. */
  acBonus: number;
  /** Innate affected-by flags (bigint). */
  affectedBy: bigint;
  /** Racial attack flags. */
  attacks: number;
  /** Racial defense flags. */
  defenses: number;
  /** Minimum stat limits. */
  minStats: { str: number; int: number; wis: number; dex: number; con: number; cha: number; lck: number };
  /** Maximum stat limits. */
  maxStats: { str: number; int: number; wis: number; dex: number; con: number; cha: number; lck: number };
  /** Race-specific XP modifier (percentage, 100 = normal). */
  expMultiplier: number;
  /** Height range (inches). */
  heightRange: [number, number];
  /** Weight range (lbs). */
  weightRange: [number, number];
}

/**
 * Complete race table. Indexes match RACE_* constants.
 * Replicates legacy race_table[] from tables.c.
 */
export const RACE_TABLE: RaceEntry[] = [
  // RACE_HUMAN (0)
  {
    name: 'Human',
    index: 0,
    classRestrictions: [], // All classes available
    strMod: 0, intMod: 0, wisMod: 0, dexMod: 0, conMod: 0, chaMod: 0, lckMod: 0,
    hpMod: 0, manaMod: 0,
    resistances: 0, susceptibilities: 0,
    languages: LANG_COMMON,
    size: 2, // Medium
    alignMin: -1000, alignMax: 1000,
    startingRoom: 0,
    acBonus: 0,
    affectedBy: 0n,
    attacks: 0, defenses: 0,
    minStats: { str: 3, int: 3, wis: 3, dex: 3, con: 3, cha: 3, lck: 3 },
    maxStats: { str: 18, int: 18, wis: 18, dex: 18, con: 18, cha: 18, lck: 18 },
    expMultiplier: 100,
    heightRange: [60, 78],
    weightRange: [120, 250],
  },
  // RACE_ELF (1)
  {
    name: 'Elf',
    index: 1,
    classRestrictions: [], // Most classes
    strMod: -1, intMod: 1, wisMod: 1, dexMod: 1, conMod: -1, chaMod: 1, lckMod: 0,
    hpMod: -2, manaMod: 3,
    resistances: RIS_CHARM,
    susceptibilities: RIS_IRON,
    languages: LANG_COMMON | LANG_ELVEN,
    size: 2, // Medium
    alignMin: -500, alignMax: 1000,
    startingRoom: 0,
    acBonus: 5,
    affectedBy: AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 3, int: 4, wis: 4, dex: 4, con: 2, cha: 4, lck: 3 },
    maxStats: { str: 16, int: 20, wis: 20, dex: 20, con: 15, cha: 20, lck: 18 },
    expMultiplier: 105,
    heightRange: [54, 72],
    weightRange: [80, 170],
  },
  // RACE_DWARF (2)
  {
    name: 'Dwarf',
    index: 2,
    classRestrictions: [], // Restricted from mage
    strMod: 1, intMod: -1, wisMod: 1, dexMod: -1, conMod: 2, chaMod: -1, lckMod: 0,
    hpMod: 3, manaMod: -3,
    resistances: RIS_POISON | RIS_MAGIC,
    susceptibilities: RIS_DROWNING,
    languages: LANG_COMMON | LANG_DWARVEN,
    size: 1, // Small
    alignMin: -200, alignMax: 1000,
    startingRoom: 0,
    acBonus: 0,
    affectedBy: AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 4, int: 2, wis: 4, dex: 2, con: 5, cha: 2, lck: 3 },
    maxStats: { str: 20, int: 16, wis: 20, dex: 16, con: 21, cha: 15, lck: 18 },
    expMultiplier: 100,
    heightRange: [42, 54],
    weightRange: [130, 220],
  },
  // RACE_HALFLING (3)
  {
    name: 'Halfling',
    index: 3,
    classRestrictions: [],
    strMod: -2, intMod: 0, wisMod: 0, dexMod: 2, conMod: 0, chaMod: 1, lckMod: 2,
    hpMod: -1, manaMod: 0,
    resistances: RIS_POISON,
    susceptibilities: 0,
    languages: LANG_COMMON | LANG_HALFLING,
    size: 1, // Small
    alignMin: -500, alignMax: 1000,
    startingRoom: 0,
    acBonus: 5,
    affectedBy: 0n,
    attacks: 0, defenses: 0,
    minStats: { str: 2, int: 3, wis: 3, dex: 5, con: 3, cha: 4, lck: 5 },
    maxStats: { str: 15, int: 18, wis: 18, dex: 21, con: 17, cha: 19, lck: 21 },
    expMultiplier: 100,
    heightRange: [30, 42],
    weightRange: [50, 80],
  },
  // RACE_PIXIE (4)
  {
    name: 'Pixie',
    index: 4,
    classRestrictions: [],
    strMod: -3, intMod: 2, wisMod: 1, dexMod: 2, conMod: -2, chaMod: 2, lckMod: 1,
    hpMod: -4, manaMod: 5,
    resistances: RIS_CHARM,
    susceptibilities: RIS_IRON,
    languages: LANG_COMMON | LANG_PIXIE,
    size: 0, // Tiny
    alignMin: 0, alignMax: 1000,
    startingRoom: 0,
    acBonus: 8,
    affectedBy: AFF.FLYING | AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 1, int: 5, wis: 4, dex: 5, con: 2, cha: 5, lck: 4 },
    maxStats: { str: 13, int: 21, wis: 20, dex: 21, con: 14, cha: 21, lck: 20 },
    expMultiplier: 110,
    heightRange: [10, 18],
    weightRange: [10, 25],
  },
  // RACE_HALF_ELF (5)
  {
    name: 'Half-Elf',
    index: 5,
    classRestrictions: [],
    strMod: 0, intMod: 0, wisMod: 0, dexMod: 1, conMod: 0, chaMod: 0, lckMod: 0,
    hpMod: -1, manaMod: 1,
    resistances: RIS_CHARM,
    susceptibilities: 0,
    languages: LANG_COMMON | LANG_ELVEN,
    size: 2, // Medium
    alignMin: -1000, alignMax: 1000,
    startingRoom: 0,
    acBonus: 2,
    affectedBy: AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 3, int: 3, wis: 3, dex: 4, con: 3, cha: 3, lck: 3 },
    maxStats: { str: 18, int: 19, wis: 19, dex: 19, con: 17, cha: 19, lck: 18 },
    expMultiplier: 100,
    heightRange: [56, 74],
    weightRange: [100, 200],
  },
  // RACE_HALF_ORC (6)
  {
    name: 'Half-Orc',
    index: 6,
    classRestrictions: [],
    strMod: 2, intMod: -2, wisMod: -1, dexMod: 0, conMod: 1, chaMod: -2, lckMod: 0,
    hpMod: 2, manaMod: -2,
    resistances: RIS_POISON,
    susceptibilities: 0,
    languages: LANG_COMMON | LANG_ORCISH,
    size: 2, // Medium
    alignMin: -1000, alignMax: 500,
    startingRoom: 0,
    acBonus: 0,
    affectedBy: AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 5, int: 2, wis: 2, dex: 3, con: 4, cha: 1, lck: 3 },
    maxStats: { str: 21, int: 15, wis: 16, dex: 18, con: 20, cha: 14, lck: 18 },
    expMultiplier: 100,
    heightRange: [60, 78],
    weightRange: [150, 280],
  },
  // RACE_HALF_TROLL (7)
  {
    name: 'Half-Troll',
    index: 7,
    classRestrictions: [],
    strMod: 3, intMod: -3, wisMod: -2, dexMod: -1, conMod: 3, chaMod: -3, lckMod: -1,
    hpMod: 5, manaMod: -5,
    resistances: RIS_CHARM | RIS_POISON,
    susceptibilities: RIS_FIRE | RIS_ACID,
    languages: LANG_COMMON | LANG_TROLLISH,
    size: 3, // Large
    alignMin: -1000, alignMax: 0,
    startingRoom: 0,
    acBonus: -5,
    affectedBy: AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 6, int: 1, wis: 1, dex: 2, con: 6, cha: 1, lck: 2 },
    maxStats: { str: 22, int: 14, wis: 14, dex: 16, con: 22, cha: 12, lck: 16 },
    expMultiplier: 110,
    heightRange: [72, 96],
    weightRange: [200, 400],
  },
  // RACE_HALF_OGRE (8)
  {
    name: 'Half-Ogre',
    index: 8,
    classRestrictions: [],
    strMod: 2, intMod: -2, wisMod: -1, dexMod: -1, conMod: 2, chaMod: -2, lckMod: 0,
    hpMod: 3, manaMod: -3,
    resistances: RIS_POISON,
    susceptibilities: RIS_MENTAL,
    languages: LANG_COMMON | LANG_OGRE,
    size: 3, // Large
    alignMin: -1000, alignMax: 500,
    startingRoom: 0,
    acBonus: -3,
    affectedBy: 0n,
    attacks: 0, defenses: 0,
    minStats: { str: 5, int: 2, wis: 2, dex: 2, con: 5, cha: 1, lck: 3 },
    maxStats: { str: 21, int: 15, wis: 16, dex: 16, con: 21, cha: 14, lck: 18 },
    expMultiplier: 105,
    heightRange: [72, 90],
    weightRange: [200, 380],
  },
  // RACE_GITH (9)
  {
    name: 'Gith',
    index: 9,
    classRestrictions: [],
    strMod: 1, intMod: 1, wisMod: 0, dexMod: 1, conMod: -1, chaMod: -2, lckMod: 0,
    hpMod: 0, manaMod: 1,
    resistances: 0,
    susceptibilities: 0,
    languages: LANG_COMMON | LANG_GITH,
    size: 2, // Medium
    alignMin: -1000, alignMax: 1000,
    startingRoom: 0,
    acBonus: 0,
    affectedBy: AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 4, int: 4, wis: 3, dex: 4, con: 2, cha: 1, lck: 3 },
    maxStats: { str: 19, int: 19, wis: 18, dex: 19, con: 16, cha: 14, lck: 18 },
    expMultiplier: 105,
    heightRange: [60, 76],
    weightRange: [110, 190],
  },
  // RACE_DROW (10)
  {
    name: 'Drow',
    index: 10,
    classRestrictions: [],
    strMod: 0, intMod: 2, wisMod: 0, dexMod: 1, conMod: -1, chaMod: 0, lckMod: 0,
    hpMod: -1, manaMod: 2,
    resistances: RIS_MAGIC,
    susceptibilities: RIS_LIGHT,
    languages: LANG_COMMON | LANG_ELVEN | LANG_DROW,
    size: 2, // Medium
    alignMin: -1000, alignMax: -200,
    startingRoom: 0,
    acBonus: 3,
    affectedBy: AFF.INFRARED | AFF.DETECT_INVIS,
    attacks: 0, defenses: 0,
    minStats: { str: 3, int: 5, wis: 3, dex: 4, con: 2, cha: 3, lck: 3 },
    maxStats: { str: 17, int: 21, wis: 18, dex: 20, con: 16, cha: 18, lck: 18 },
    expMultiplier: 110,
    heightRange: [50, 68],
    weightRange: [80, 160],
  },
  // RACE_SEA_ELF (11)
  {
    name: 'Sea-Elf',
    index: 11,
    classRestrictions: [],
    strMod: 0, intMod: 1, wisMod: 1, dexMod: 1, conMod: -1, chaMod: 1, lckMod: 0,
    hpMod: -1, manaMod: 2,
    resistances: RIS_DROWNING,
    susceptibilities: RIS_FIRE,
    languages: LANG_COMMON | LANG_ELVEN,
    size: 2, // Medium
    alignMin: -500, alignMax: 1000,
    startingRoom: 0,
    acBonus: 4,
    affectedBy: AFF.AQUA_BREATH,
    attacks: 0, defenses: 0,
    minStats: { str: 3, int: 4, wis: 4, dex: 4, con: 2, cha: 4, lck: 3 },
    maxStats: { str: 17, int: 20, wis: 20, dex: 20, con: 16, cha: 20, lck: 18 },
    expMultiplier: 105,
    heightRange: [54, 72],
    weightRange: [80, 170],
  },
  // RACE_LIZARDMAN (12)
  {
    name: 'Lizardman',
    index: 12,
    classRestrictions: [],
    strMod: 1, intMod: -2, wisMod: -1, dexMod: 0, conMod: 2, chaMod: -2, lckMod: 0,
    hpMod: 2, manaMod: -2,
    resistances: RIS_POISON,
    susceptibilities: RIS_COLD,
    languages: LANG_COMMON | LANG_LIZARD,
    size: 2, // Medium
    alignMin: -1000, alignMax: 500,
    startingRoom: 0,
    acBonus: -5,
    affectedBy: 0n,
    attacks: 0, defenses: 0,
    minStats: { str: 4, int: 1, wis: 2, dex: 3, con: 5, cha: 1, lck: 3 },
    maxStats: { str: 20, int: 15, wis: 16, dex: 18, con: 21, cha: 14, lck: 18 },
    expMultiplier: 100,
    heightRange: [60, 78],
    weightRange: [150, 260],
  },
  // RACE_GNOME (13)
  {
    name: 'Gnome',
    index: 13,
    classRestrictions: [],
    strMod: -1, intMod: 2, wisMod: 0, dexMod: 1, conMod: 0, chaMod: -1, lckMod: 1,
    hpMod: -1, manaMod: 2,
    resistances: RIS_ILLUSION,
    susceptibilities: 0,
    languages: LANG_COMMON | LANG_GNOMISH,
    size: 1, // Small
    alignMin: -500, alignMax: 1000,
    startingRoom: 0,
    acBonus: 3,
    affectedBy: AFF.INFRARED,
    attacks: 0, defenses: 0,
    minStats: { str: 2, int: 5, wis: 3, dex: 4, con: 3, cha: 2, lck: 4 },
    maxStats: { str: 16, int: 21, wis: 18, dex: 19, con: 17, cha: 16, lck: 20 },
    expMultiplier: 105,
    heightRange: [36, 48],
    weightRange: [50, 90],
  },
];
```

#### Lookup Helpers

```typescript
/**
 * Get race entry by index. Returns null if invalid.
 */
export function getRaceEntry(raceIndex: number): RaceEntry | null {
  return RACE_TABLE[raceIndex] ?? null;
}

/**
 * Get race entry by name (case-insensitive prefix match).
 */
export function findRaceByName(name: string): RaceEntry | null {
  const lower = name.toLowerCase();
  return RACE_TABLE.find(r => r.name.toLowerCase().startsWith(lower)) ?? null;
}

/**
 * Check if a race can be a given class.
 * If classRestrictions is empty, all classes are allowed.
 * If populated, only listed classes are allowed.
 */
export function raceCanBeClass(raceIndex: number, classIndex: number): boolean {
  const race = getRaceEntry(raceIndex);
  if (!race) return false;
  if (race.classRestrictions.length === 0) return true;
  return race.classRestrictions.includes(classIndex);
}
```

#### Class Table

```typescript
/**
 * Class data entry. Replicates legacy class_type structure from mud.h.
 */
export interface ClassEntry {
  /** Class name (display). */
  name: string;
  /** Class enum index. */
  index: number;
  /** Primary attribute key. */
  primeAttr: keyof StatBlock;
  /** Secondary attribute key. */
  secondAttr: keyof StatBlock;
  /** Starting weapon vnum (given at character creation). */
  weapon: number;
  /** Guild room vnum (where you practice). */
  guild: number;
  /** Maximum skill learn percentage (adept). Typically 75-95. */
  skillAdept: number;
  /** THAC0 at level 0. */
  thac0_00: number;
  /** THAC0 at level 32. */
  thac0_32: number;
  /** HP gain dice (number of dice). */
  hpDice: number;
  /** HP gain dice (sides per die). */
  hpSides: number;
  /** Mana gain dice (number). */
  manaDice: number;
  /** Mana gain dice (sides). */
  manaSides: number;
  /** Base experience modifier (percentage, 100 = normal). */
  expBase: number;
  /** Innate affected-by flags for the class (bigint). */
  affectedBy: bigint;
  /** Class-specific resist bitmask. */
  resistances: number;
  /** Class-specific suscept bitmask. */
  susceptibilities: number;
  /** Skill/spell level requirements per skill SN: Map<sn, minLevel>. */
  skillLevel: Map<number, number>;
  /** Titles per level. Array of [male_title, female_title] pairs. */
  titles: Array<[string, string]>;
  /** Whether this class can use mana. */
  fMana: boolean;
  /** Base mana at level 1. */
  baseMana: number;
}

/**
 * Complete class table. Indexes match CLASS_* constants.
 * Replicates legacy class_table[] from tables.c.
 */
export const CLASS_TABLE: ClassEntry[] = [
  // CLASS_MAGE (0)
  {
    name: 'Mage',
    index: 0,
    primeAttr: 'int',
    secondAttr: 'wis',
    weapon: 21002,  // Starting staff
    guild: 3018,
    skillAdept: 95,
    thac0_00: 21,
    thac0_32: 12,
    hpDice: 1,
    hpSides: 6,
    manaDice: 2,
    manaSides: 8,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Apprentice of Magic', 'Apprentice of Magic'],
      ['Spell Student', 'Spell Student'],
      ['Scholar of Magic', 'Scholar of Magic'],
      ['Delver in Spells', 'Delveress in Spells'],
      ['Medium of Magic', 'Medium of Magic'],
      ['Scribe of Magic', 'Scribe of Magic'],
      ['Seer', 'Seeress'],
      ['Sage', 'Sage'],
      ['Illusionist', 'Illusionist'],
      ['Abjurer', 'Abjuress'],
      ['Invoker', 'Invokeress'],
      ['Enchanter', 'Enchantress'],
      ['Conjurer', 'Conjuress'],
      ['Magician', 'Witch'],
      ['Creator', 'Creator'],
      ['Savant', 'Savant'],
      ['Magus', 'Craftswitch'],
      ['Wizard', 'Wizard'],
      ['Warlock', 'War Witch'],
      ['Sorcerer', 'Sorceress'],
    ],
    fMana: true,
    baseMana: 100,
  },
  // CLASS_CLERIC (1)
  {
    name: 'Cleric',
    index: 1,
    primeAttr: 'wis',
    secondAttr: 'int',
    weapon: 21002,  // Starting mace
    guild: 3003,
    skillAdept: 90,
    thac0_00: 20,
    thac0_32: 8,
    hpDice: 1,
    hpSides: 8,
    manaDice: 1,
    manaSides: 8,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Believer', 'Believer'],
      ['Attendant', 'Attendant'],
      ['Acolyte', 'Acolyte'],
      ['Novice', 'Novice'],
      ['Missionary', 'Missionary'],
      ['Adept', 'Adept'],
      ['Deacon', 'Deaconess'],
      ['Vicar', 'Vicaress'],
      ['Priest', 'Priestess'],
      ['Minister', 'Lady Minister'],
      ['Canon', 'Canon'],
      ['Levite', 'Levitess'],
      ['Curate', 'Curess'],
      ['Monk', 'Nun'],
      ['Healer', 'Healess'],
      ['Chaplain', 'Chaplain'],
      ['Expositor', 'Expositress'],
      ['Bishop', 'Bishop'],
      ['Arch Bishop', 'Arch Lady of the Church'],
      ['Patriarch', 'Matriarch'],
    ],
    fMana: true,
    baseMana: 100,
  },
  // CLASS_THIEF (2)
  {
    name: 'Thief',
    index: 2,
    primeAttr: 'dex',
    secondAttr: 'int',
    weapon: 21003,  // Starting dagger
    guild: 3028,
    skillAdept: 85,
    thac0_00: 20,
    thac0_32: 4,
    hpDice: 1,
    hpSides: 8,
    manaDice: 0,
    manaSides: 0,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Pilferer', 'Pilferess'],
      ['Footpad', 'Footpad'],
      ['Filcher', 'Filcheress'],
      ['Pick-Pocket', 'Pick-Pocket'],
      ['Sneak', 'Sneak'],
      ['Pincher', 'Pincheress'],
      ['Cut-Purse', 'Cut-Purse'],
      ['Snatcher', 'Snatcheress'],
      ['Sharper', 'Sharpress'],
      ['Rogue', 'Rogue'],
      ['Robber', 'Robber'],
      ['Magsman', 'Magswoman'],
      ['Highwayman', 'Highwaywoman'],
      ['Burglar', 'Burglaress'],
      ['Thief', 'Thief'],
      ['Knifer', 'Knifer'],
      ['Quick-Blade', 'Quick-Blade'],
      ['Killer', 'Murderess'],
      ['Brigand', 'Brigand'],
      ['Cut-Throat', 'Cut-Throat'],
    ],
    fMana: false,
    baseMana: 0,
  },
  // CLASS_WARRIOR (3)
  {
    name: 'Warrior',
    index: 3,
    primeAttr: 'str',
    secondAttr: 'con',
    weapon: 21001,  // Starting sword
    guild: 3022,
    skillAdept: 85,
    thac0_00: 20,
    thac0_32: 2,
    hpDice: 2,
    hpSides: 8,
    manaDice: 0,
    manaSides: 0,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Swordpupil', 'Swordpupil'],
      ['Recruit', 'Recruit'],
      ['Sentry', 'Sentress'],
      ['Fighter', 'Fighter'],
      ['Soldier', 'Soldier'],
      ['Warrior', 'Warrior'],
      ['Veteran', 'Veteran'],
      ['Swordsman', 'Swordswoman'],
      ['Fencer', 'Fenceress'],
      ['Combatant', 'Combatess'],
      ['Hero', 'Heroine'],
      ['Myrmidon', 'Myrmidon'],
      ['Swashbuckler', 'Swashbuckleress'],
      ['Mercenary', 'Mercenaress'],
      ['Swordmaster', 'Swordmistress'],
      ['Lieutenant', 'Lieutenant'],
      ['Champion', 'Lady Champion'],
      ['Lord', 'Lady'],
      ['Knight', 'Lady Knight'],
      ['Warlord', 'Warlady'],
    ],
    fMana: false,
    baseMana: 0,
  },
  // CLASS_VAMPIRE (4)
  {
    name: 'Vampire',
    index: 4,
    primeAttr: 'str',
    secondAttr: 'con',
    weapon: 21001,
    guild: 3002,
    skillAdept: 80,
    thac0_00: 20,
    thac0_32: 4,
    hpDice: 1,
    hpSides: 10,
    manaDice: 1,
    manaSides: 6,
    expBase: 120,
    affectedBy: AFF.INFRARED | AFF.DETECT_INVIS,
    resistances: RIS_CHARM | RIS_DRAIN,
    susceptibilities: RIS_LIGHT | RIS_FIRE | RIS_HOLY,
    skillLevel: new Map(),
    titles: [
      ['Vampire', 'Vampire'],
      ['Fledgling', 'Fledgling'],
      ['Blood Drinker', 'Blood Drinker'],
      ['Nightwalker', 'Nightwalker'],
      ['Shadow', 'Shadow'],
      ['Nosferatu', 'Nosferatu'],
      ['Blood Lord', 'Blood Lady'],
      ['Dark Prince', 'Dark Princess'],
      ['Elder Vampire', 'Elder Vampire'],
      ['Ancient', 'Ancient'],
      ['Vampire Lord', 'Vampire Lady'],
    ],
    fMana: true,
    baseMana: 50,
  },
  // CLASS_DRUID (5)
  {
    name: 'Druid',
    index: 5,
    primeAttr: 'wis',
    secondAttr: 'con',
    weapon: 21002,
    guild: 3020,
    skillAdept: 90,
    thac0_00: 20,
    thac0_32: 8,
    hpDice: 1,
    hpSides: 8,
    manaDice: 1,
    manaSides: 8,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Seedling', 'Seedling'],
      ['Tender', 'Tender'],
      ['Herbalist', 'Herbalist'],
      ['Naturalist', 'Naturalist'],
      ['Shaman', 'Shaman'],
      ['Warden', 'Warden'],
      ['Ovate', 'Ovate'],
      ['Bard', 'Bard'],
      ['Druid', 'Druidess'],
      ['Arch Druid', 'Arch Druidess'],
    ],
    fMana: true,
    baseMana: 100,
  },
  // CLASS_RANGER (6)
  {
    name: 'Ranger',
    index: 6,
    primeAttr: 'dex',
    secondAttr: 'wis',
    weapon: 21001,
    guild: 3024,
    skillAdept: 85,
    thac0_00: 20,
    thac0_32: 4,
    hpDice: 1,
    hpSides: 10,
    manaDice: 1,
    manaSides: 6,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Scout', 'Scout'],
      ['Tracker', 'Tracker'],
      ['Pathfinder', 'Pathfinder'],
      ['Strider', 'Strider'],
      ['Huntsman', 'Huntress'],
      ['Woodsman', 'Woodswoman'],
      ['Guide', 'Guide'],
      ['Ranger', 'Ranger'],
      ['Ranger Lord', 'Ranger Lady'],
      ['Ranger King', 'Ranger Queen'],
    ],
    fMana: true,
    baseMana: 50,
  },
  // CLASS_AUGURER (7)
  {
    name: 'Augurer',
    index: 7,
    primeAttr: 'int',
    secondAttr: 'wis',
    weapon: 21002,
    guild: 3003,
    skillAdept: 90,
    thac0_00: 21,
    thac0_32: 10,
    hpDice: 1,
    hpSides: 6,
    manaDice: 2,
    manaSides: 6,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Diviner', 'Divineress'],
      ['Reader', 'Readeress'],
      ['Oracle', 'Oracle'],
      ['Mystic', 'Mystic'],
      ['Prophet', 'Prophetess'],
      ['Seer', 'Seeress'],
      ['Sage', 'Sage'],
      ['Augurer', 'Auguress'],
      ['High Augurer', 'High Auguress'],
      ['Supreme Augurer', 'Supreme Auguress'],
    ],
    fMana: true,
    baseMana: 100,
  },
  // CLASS_PALADIN (8)
  {
    name: 'Paladin',
    index: 8,
    primeAttr: 'str',
    secondAttr: 'wis',
    weapon: 21001,
    guild: 3022,
    skillAdept: 85,
    thac0_00: 20,
    thac0_32: 4,
    hpDice: 1,
    hpSides: 10,
    manaDice: 1,
    manaSides: 4,
    expBase: 100,
    affectedBy: AFF.DETECT_EVIL,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Gallant', 'Gallant'],
      ['Keeper', 'Keeper'],
      ['Protector', 'Protectress'],
      ['Defender', 'Defender'],
      ['Warder', 'Warder'],
      ['Knight', 'Lady Knight'],
      ['Guardian', 'Guardian'],
      ['Chevalier', 'Chevalier'],
      ['Paladin', 'Paladin'],
      ['Holy Avenger', 'Holy Avenger'],
    ],
    fMana: true,
    baseMana: 50,
  },
  // CLASS_NEPHANDI (9)
  {
    name: 'Nephandi',
    index: 9,
    primeAttr: 'int',
    secondAttr: 'wis',
    weapon: 21002,
    guild: 3018,
    skillAdept: 90,
    thac0_00: 21,
    thac0_32: 10,
    hpDice: 1,
    hpSides: 6,
    manaDice: 2,
    manaSides: 6,
    expBase: 110,
    affectedBy: AFF.DETECT_INVIS,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Dark Initiate', 'Dark Initiate'],
      ['Corruptor', 'Corruptress'],
      ['Defiler', 'Defiler'],
      ['Shadow Mage', 'Shadow Mage'],
      ['Dark Weaver', 'Dark Weaver'],
      ['Nephandi', 'Nephandi'],
      ['Entropy Mage', 'Entropy Mage'],
      ['Lord of Entropy', 'Lady of Entropy'],
      ['Dark Master', 'Dark Mistress'],
      ['Archon of Chaos', 'Archon of Chaos'],
    ],
    fMana: true,
    baseMana: 100,
  },
  // CLASS_SAVAGE (10)
  {
    name: 'Savage',
    index: 10,
    primeAttr: 'str',
    secondAttr: 'dex',
    weapon: 21001,
    guild: 3022,
    skillAdept: 80,
    thac0_00: 20,
    thac0_32: 2,
    hpDice: 2,
    hpSides: 8,
    manaDice: 0,
    manaSides: 0,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Wild One', 'Wild One'],
      ['Hunter', 'Huntress'],
      ['Stalker', 'Stalker'],
      ['Predator', 'Predator'],
      ['Ravager', 'Ravager'],
      ['Berserker', 'Berserker'],
      ['Savage', 'Savage'],
      ['Tribal Chief', 'Tribal Chief'],
      ['Warchief', 'Warchief'],
      ['Primal Lord', 'Primal Lady'],
    ],
    fMana: false,
    baseMana: 0,
  },
  // CLASS_PIRATE (11)
  {
    name: 'Pirate',
    index: 11,
    primeAttr: 'dex',
    secondAttr: 'str',
    weapon: 21003,
    guild: 3028,
    skillAdept: 85,
    thac0_00: 20,
    thac0_32: 4,
    hpDice: 1,
    hpSides: 10,
    manaDice: 0,
    manaSides: 0,
    expBase: 100,
    affectedBy: 0n,
    resistances: 0,
    susceptibilities: 0,
    skillLevel: new Map(),
    titles: [
      ['Man', 'Woman'],
      ['Deck Hand', 'Deck Hand'],
      ['Mate', 'Mate'],
      ['Bosun', 'Bosun'],
      ['First Mate', 'First Mate'],
      ['Navigator', 'Navigator'],
      ['Privateer', 'Privateer'],
      ['Buccaneer', 'Buccaneer'],
      ['Pirate', 'Pirate'],
      ['Pirate Captain', 'Pirate Captain'],
      ['Pirate King', 'Pirate Queen'],
    ],
    fMana: false,
    baseMana: 0,
  },
];
```

#### Class Lookup Helpers

```typescript
/**
 * Get class entry by index. Returns null if invalid.
 */
export function getClassEntry(classIndex: number): ClassEntry | null {
  return CLASS_TABLE[classIndex] ?? null;
}

/**
 * Get class entry by name (case-insensitive prefix match).
 */
export function findClassByName(name: string): ClassEntry | null {
  const lower = name.toLowerCase();
  return CLASS_TABLE.find(c => c.name.toLowerCase().startsWith(lower)) ?? null;
}

/**
 * Get the title for a given class, level, and sex.
 * Replicates legacy title_table lookup.
 */
export function getTitle(classIndex: number, level: number, sex: Sex): string {
  const cls = getClassEntry(classIndex);
  if (!cls) return 'Unknown';
  const titleIdx = Math.min(Math.max(0, Math.floor(level / 5)), cls.titles.length - 1);
  return sex === Sex.Female ? cls.titles[titleIdx][1] : cls.titles[titleIdx][0];
}
```

#### Language Constants

```typescript
export const LANG_COMMON   = 1 << 0;
export const LANG_ELVEN    = 1 << 1;
export const LANG_DWARVEN  = 1 << 2;
export const LANG_PIXIE    = 1 << 3;
export const LANG_OGRE     = 1 << 4;
export const LANG_ORCISH   = 1 << 5;
export const LANG_TROLLISH = 1 << 6;
export const LANG_RODENT   = 1 << 7;
export const LANG_INSECTOID = 1 << 8;
export const LANG_MAMMAL   = 1 << 9;
export const LANG_REPTILE  = 1 << 10;
export const LANG_DRAGON   = 1 << 11;
export const LANG_SPIRITUAL = 1 << 12;
export const LANG_MAGICAL  = 1 << 13;
export const LANG_GOBLIN   = 1 << 14;
export const LANG_GOD      = 1 << 15;
export const LANG_ANCIENT  = 1 << 16;
export const LANG_HALFLING = 1 << 17;
export const LANG_CLAN     = 1 << 18;
export const LANG_GITH     = 1 << 19;
export const LANG_DROW     = 1 << 20;
export const LANG_LIZARD   = 1 << 21;
export const LANG_GNOMISH  = 1 << 22;
export const LANG_UNKNOWN  = 1 << 23;
```

#### RIS (Resist/Immune/Suscept) Constants

```typescript
export const RIS_FIRE       = 1 << 0;
export const RIS_COLD       = 1 << 1;
export const RIS_ELECTRICITY = 1 << 2;
export const RIS_ENERGY     = 1 << 3;
export const RIS_BLUNT      = 1 << 4;
export const RIS_PIERCE     = 1 << 5;
export const RIS_SLASH      = 1 << 6;
export const RIS_ACID       = 1 << 7;
export const RIS_POISON     = 1 << 8;
export const RIS_DRAIN      = 1 << 9;
export const RIS_SLEEP      = 1 << 10;
export const RIS_CHARM      = 1 << 11;
export const RIS_HOLD       = 1 << 12;
export const RIS_NONMAGIC   = 1 << 13;
export const RIS_PLUS1      = 1 << 14;
export const RIS_PLUS2      = 1 << 15;
export const RIS_PLUS3      = 1 << 16;
export const RIS_PLUS4      = 1 << 17;
export const RIS_PLUS5      = 1 << 18;
export const RIS_PLUS6      = 1 << 19;
export const RIS_MAGIC      = 1 << 20;
export const RIS_PARALYSIS  = 1 << 21;
export const RIS_IRON       = 1 << 22;
export const RIS_LIGHT      = 1 << 23;
export const RIS_HOLY       = 1 << 24;
export const RIS_MENTAL     = 1 << 25;
export const RIS_DISEASE    = 1 << 26;
export const RIS_DROWNING   = 1 << 27;
export const RIS_ILLUSION   = 1 << 28;
```

#### Level Constants

```typescript
export const MAX_LEVEL         = 65;
export const LEVEL_HERO        = 50;
export const LEVEL_IMMORTAL    = 51;
export const LEVEL_DEMI        = 52;
export const LEVEL_SAVIOR      = 53;
export const LEVEL_CREATOR     = 54;
export const LEVEL_SUPREME     = 55;
export const LEVEL_INFINITE    = 56;
export const LEVEL_ETERNAL     = 57;
export const LEVEL_IMPLEMENTOR = 58;
export const LEVEL_SUB_IMPLEM  = 59;
export const LEVEL_ASCENDANT   = 60;
export const LEVEL_GREATER     = 61;
export const LEVEL_GOD         = 62;
export const LEVEL_LESSER      = 63;
export const LEVEL_TRUEIMM     = 64;
export const LEVEL_AVATAR      = 65;

export const MAX_PC_CLASS  = 27;
export const MAX_PC_RACE   = 26;
```

---

### 2. `src/game/entities/Player.ts` — Progression System (additions)

Add experience gain, level advancement, and training methods to the existing `Player` class. These are the core progression mechanics:

#### `gainXp(amount)` — Gain Experience Points

Replicates legacy `gain_exp()` from `update.c`:

```typescript
/**
 * Add experience points and check for level advancement.
 * Replicates legacy gain_exp(). Handles both positive and negative XP.
 *
 * @param amount - Amount of XP to add (can be negative for XP loss).
 */
public gainXp(amount: number): void {
  if (this.isNpc) return;
  if (this.level >= LEVEL_HERO) return; // Immortals don't gain XP

  // Apply class XP modifier
  const classEntry = getClassEntry(this.class_);
  const raceEntry = getRaceEntry(this.race);

  // Clamp negative XP: can't go below 0
  this.exp = Math.max(0, this.exp + amount);

  // Check for level gain (loop to handle multi-level gains)
  while (this.level < LEVEL_HERO && this.exp >= xpToNextLevel(this.level)) {
    this.advanceLevel();
  }

  Logger.info('progression', `${this.name} gained ${amount} XP (total: ${this.exp}, level: ${this.level})`);
}
```

#### `xpToNextLevel(level)` — XP Required for Next Level

Replicates the legacy XP progression table. The formula used in SMAUG 2.0:

```typescript
/**
 * Calculate XP required to reach the next level.
 * Replicates legacy exp_level() from tables.c.
 *
 * SMAUG 2.0 formula: level * level * 500
 * This creates an accelerating curve:
 *   Level 1→2:      500 XP
 *   Level 5→6:    12,500 XP
 *   Level 10→11:  50,000 XP
 *   Level 20→21: 200,000 XP
 *   Level 30→31: 450,000 XP
 *   Level 49→50: 1,200,500 XP
 *
 * Class and race multipliers modify the total requirement:
 *   adjustedXp = baseXp * classEntry.expBase / 100 * raceEntry.expMultiplier / 100
 */
export function xpToNextLevel(level: number, classIndex?: number, raceIndex?: number): number {
  let base = level * level * 500;

  if (classIndex !== undefined) {
    const cls = getClassEntry(classIndex);
    if (cls) {
      base = Math.floor(base * cls.expBase / 100);
    }
  }

  if (raceIndex !== undefined) {
    const race = getRaceEntry(raceIndex);
    if (race) {
      base = Math.floor(base * race.expMultiplier / 100);
    }
  }

  return base;
}
```

#### `advanceLevel()` — Level Up

Replicates legacy `advance_level()` from `update.c`:

```typescript
/**
 * Advance this character one level.
 * Rolls HP, mana, and move gains based on class and stats.
 * Replicates legacy advance_level() exactly.
 */
public advanceLevel(): void {
  const classEntry = getClassEntry(this.class_);
  const raceEntry = getRaceEntry(this.race);

  if (!classEntry) {
    Logger.error('progression', `advanceLevel: invalid class ${this.class_} for ${this.name}`);
    return;
  }

  this.level++;

  // === HP Gain ===
  // Roll class HP dice + CON bonus + race HP modifier
  let hpGain = rollDice(classEntry.hpDice, classEntry.hpSides);
  hpGain += getConApp(this.getStat('con')).hitp;
  if (raceEntry) {
    hpGain += raceEntry.hpMod;
  }
  hpGain = Math.max(1, hpGain); // Minimum 1 HP per level
  this.maxHit += hpGain;
  this.hit += hpGain; // Also heal the gained amount

  // === Mana Gain ===
  // Only for classes that use mana (manaDice > 0)
  let manaGain = 0;
  if (classEntry.manaDice > 0) {
    manaGain = rollDice(classEntry.manaDice, classEntry.manaSides);
    manaGain += getIntApp(this.getStat('int')).mana;
    if (raceEntry) {
      manaGain += raceEntry.manaMod;
    }
    manaGain = Math.max(1, manaGain); // Minimum 1 mana per level
  }
  this.maxMana += manaGain;
  this.mana += manaGain;

  // === Move Gain ===
  // Always 1d6 + DEX bonus
  let moveGain = rollDice(1, 6);
  moveGain += getDexApp(this.getStat('dex')).move;
  moveGain = Math.max(1, moveGain); // Minimum 1 move per level
  this.maxMove += moveGain;
  this.move += moveGain;

  // === Practice Sessions ===
  // Gained per level based on WIS
  const practiceGain = getWisApp(this.getStat('wis')).practice;
  this.pcData.practice = (this.pcData.practice ?? 0) + practiceGain;

  // === Saving Throw Improvement ===
  // Saving throws improve every few levels (class-dependent formula)
  // Legacy: saving throws are recalculated based on level via reset_saving_throws()
  this.recalculateSavingThrows();

  // === Announcement ===
  // Message to character
  this.sendToChar(
    `\n&WYou have advanced to level ${this.level}!&w\n` +
    `  HP: +${hpGain}  Mana: +${manaGain}  Move: +${moveGain}  Practices: +${practiceGain}\n\n`
  );

  // Message to room
  if (this.inRoom) {
    actToRoom(this, '$n has advanced to level ' + this.level + '!', null);
  }

  // === EventBus ===
  EventBus.emit(GameEvent.CharacterLevelUp, {
    characterId: this.id,
    characterName: this.name,
    newLevel: this.level,
    hpGain,
    manaGain,
    moveGain,
    practiceGain,
  });

  // === Auto-Save ===
  this.save().catch(err =>
    Logger.error('progression', `Failed to save ${this.name} after level-up: ${err}`)
  );

  Logger.info('progression',
    `${this.name} advanced to level ${this.level} ` +
    `(HP+${hpGain}=${this.maxHit}, Mana+${manaGain}=${this.maxMana}, ` +
    `Move+${moveGain}=${this.maxMove}, Prac+${practiceGain})`
  );
}
```

#### `recalculateSavingThrows()` — Saving Throw Calculation

Replicates legacy saving throw tables:

```typescript
/**
 * Recalculate saving throws based on class and level.
 * Replicates legacy saving throw table lookup.
 * Saving throws decrease (improve) with level.
 */
public recalculateSavingThrows(): void {
  const classEntry = getClassEntry(this.class_);
  if (!classEntry) return;

  // Base saving throw: starts at ~16 and improves with level.
  // Formula: base - (level * reduction_per_level)
  // Class warriors/paladins have better save vs breath; mages better vs spell.
  const level = Math.min(this.level, LEVEL_HERO);

  this.savingPoison = Math.max(-20, 16 - Math.floor(level * 3 / 10));
  this.savingRod    = Math.max(-20, 14 - Math.floor(level * 3 / 10));
  this.savingPara   = Math.max(-20, 15 - Math.floor(level * 3 / 10));
  this.savingBreath = Math.max(-20, 17 - Math.floor(level * 3 / 10));
  this.savingSpell  = Math.max(-20, 15 - Math.floor(level * 3 / 10));

  // Class-specific bonuses
  switch (this.class_) {
    case 0: // Mage
      this.savingSpell -= Math.floor(level / 8);
      break;
    case 1: // Cleric
      this.savingPoison -= Math.floor(level / 8);
      this.savingSpell -= Math.floor(level / 10);
      break;
    case 2: // Thief
      this.savingPoison -= Math.floor(level / 6);
      break;
    case 3: // Warrior
      this.savingBreath -= Math.floor(level / 6);
      this.savingPara -= Math.floor(level / 8);
      break;
    case 8: // Paladin
      this.savingBreath -= Math.floor(level / 8);
      this.savingSpell -= Math.floor(level / 10);
      break;
    default:
      break;
  }
}
```

#### `doTrain(ch, argument)` — Train Attributes

Replicates legacy `do_train()` from `act_info.c`:

```typescript
/**
 * Train command — spend training sessions to improve attributes.
 * Replicates legacy do_train().
 *
 * Syntax:
 *   train                — Show trainable attributes
 *   train <attribute>    — Train an attribute (str, int, wis, dex, con, cha, lck)
 *   train hp             — Convert practice session to +2 HP
 *   train mana           — Convert practice session to +2 mana
 *
 * Requirements:
 *   - Must be in room with trainer NPC (ACT_TRAIN flag or mob vnum range)
 *   - Must have at least 1 training session (from pcData.trains)
 *   - Stat must not exceed racial maximum
 */
export function doTrain(ch: Player, argument: string): void {
  // Check for trainer NPC in room
  if (!ch.inRoom) {
    ch.sendToChar("You are nowhere.\n");
    return;
  }

  const trainer = findTrainerInRoom(ch);
  if (!trainer) {
    ch.sendToChar("You can't do that here.\n");
    return;
  }

  // No argument: show available training
  if (!argument || argument.trim() === '') {
    displayTrainableAttributes(ch);
    return;
  }

  const arg = argument.trim().toLowerCase();

  // Check trains available
  if ((ch.pcData.trains ?? 0) <= 0) {
    ch.sendToChar("You have no training sessions.\n");
    return;
  }

  const raceEntry = getRaceEntry(ch.race);

  if (arg === 'hp') {
    ch.pcData.trains!--;
    ch.maxHit += 2;
    ch.hit += 2;
    ch.sendToChar("Your durability increases!\n");
    return;
  }

  if (arg === 'mana') {
    const classEntry = getClassEntry(ch.class_);
    if (classEntry && !classEntry.fMana) {
      ch.sendToChar("You are not a spellcaster.\n");
      return;
    }
    ch.pcData.trains!--;
    ch.maxMana += 2;
    ch.mana += 2;
    ch.sendToChar("Your power increases!\n");
    return;
  }

  // Map argument to stat key
  const statMap: Record<string, keyof StatBlock> = {
    str: 'str', strength: 'str',
    int: 'int', intelligence: 'int',
    wis: 'wis', wisdom: 'wis',
    dex: 'dex', dexterity: 'dex',
    con: 'con', constitution: 'con',
    cha: 'cha', charisma: 'cha',
    lck: 'lck', luck: 'lck',
  };

  const statKey = statMap[arg];
  if (!statKey) {
    ch.sendToChar("You can train: str int wis dex con cha lck hp mana\n");
    return;
  }

  // Check racial max
  const maxStat = raceEntry ? raceEntry.maxStats[statKey] : 18;
  if (ch.permStats[statKey] >= maxStat) {
    ch.sendToChar(`Your ${statKey} is already at maximum for your race.\n`);
    return;
  }

  // Spend the train
  ch.pcData.trains!--;
  ch.permStats[statKey]++;

  // Apply stat effects
  const statNames: Record<string, string> = {
    str: 'strength', int: 'intelligence', wis: 'wisdom',
    dex: 'dexterity', con: 'constitution', cha: 'charisma', lck: 'luck',
  };
  ch.sendToChar(`Your ${statNames[statKey]} increases!\n`);
  actToRoom(ch, '$n looks more experienced.', null);
}

/**
 * Find a trainer NPC in the character's current room.
 * Trainers have ACT_TRAIN flag or specific vnum.
 */
function findTrainerInRoom(ch: Character): Mobile | null {
  if (!ch.inRoom) return null;
  for (const mob of ch.inRoom.characters) {
    if (mob.isNpc && hasFlag(mob.actFlags, ACT_TRAIN)) {
      return mob as Mobile;
    }
  }
  return null;
}

/**
 * Display the attributes a character can train.
 */
function displayTrainableAttributes(ch: Player): void {
  const raceEntry = getRaceEntry(ch.race);

  ch.sendToChar("You can train the following:\n");
  ch.sendToChar(`  Training sessions available: ${ch.pcData.trains ?? 0}\n\n`);

  const stats: (keyof StatBlock)[] = ['str', 'int', 'wis', 'dex', 'con', 'cha', 'lck'];
  const statNames: Record<string, string> = {
    str: 'Strength', int: 'Intelligence', wis: 'Wisdom',
    dex: 'Dexterity', con: 'Constitution', cha: 'Charisma', lck: 'Luck',
  };

  for (const stat of stats) {
    const current = ch.permStats[stat];
    const max = raceEntry ? raceEntry.maxStats[stat] : 18;
    const status = current >= max ? '(maxed)' : '';
    ch.sendToChar(`  ${padRight(statNames[stat], 14)} ${padRight(String(current), 4)} / ${max}  ${status}\n`);
  }

  ch.sendToChar(`  ${'HP'.padEnd(14)} ${ch.maxHit}\n`);

  const classEntry = getClassEntry(ch.class_);
  if (classEntry && classEntry.fMana) {
    ch.sendToChar(`  ${'Mana'.padEnd(14)} ${ch.maxMana}\n`);
  }
}
```

#### `doPractice(ch, argument)` — Practice Skills at Guildmaster

Replicates legacy `do_practice()` from `act_info.c`:

```typescript
/**
 * Practice command — learn/improve skills and spells at guildmaster.
 * Replicates legacy do_practice().
 *
 * Syntax:
 *   practice           — List all known skills/spells with proficiency
 *   practice <skill>   — Practice a skill (costs 1 practice session)
 *
 * Requirements:
 *   - When practicing a specific skill: must be in guild room for your class
 *   - Must have at least 1 practice session
 *   - Skill must be available to your class at your level
 *   - Skill cannot exceed adept (class-specific max, typically 75-95%)
 */
export function doPractice(ch: Player, argument: string): void {
  // No argument: list all skills/spells
  if (!argument || argument.trim() === '') {
    displayPracticeList(ch);
    return;
  }

  // Check for guildmaster in room
  const guildmaster = findGuildmasterInRoom(ch);
  if (!guildmaster) {
    ch.sendToChar("You can only practice at a guildmaster.\n");
    return;
  }

  // Check practice sessions
  if ((ch.pcData.practice ?? 0) <= 0) {
    ch.sendToChar("You have no practice sessions left.\n");
    return;
  }

  // Find the skill/spell
  const arg = argument.trim().toLowerCase();
  const sn = findSkillByName(arg);
  if (sn < 0) {
    ch.sendToChar("You can't practice that.\n");
    return;
  }

  // Check class availability
  const skillEntry = getSkillEntry(sn);
  if (!skillEntry) {
    ch.sendToChar("You can't practice that.\n");
    return;
  }

  const classEntry = getClassEntry(ch.class_);
  if (!classEntry) return;

  // Check level requirement for this class
  const minLevel = skillEntry.skillLevel?.[ch.class_] ?? MAX_LEVEL + 1;
  if (ch.level < minLevel) {
    ch.sendToChar("You are not experienced enough to practice that.\n");
    return;
  }

  // Check if already at adept
  const currentProficiency = ch.pcData.learned.get(sn) ?? 0;
  const adept = classEntry.skillAdept;

  if (currentProficiency >= adept) {
    ch.sendToChar(`You are already learned at ${skillEntry.name}.\n`);
    return;
  }

  // Spend practice session
  ch.pcData.practice!--;

  // Calculate gain: based on INT and WIS
  // Legacy formula: UMIN(adept, learned + int_app[getInt].learn)
  const learnRate = getIntApp(ch.getStat('int')).learn;
  const newProficiency = Math.min(adept, currentProficiency + learnRate);
  ch.pcData.learned.set(sn, newProficiency);

  if (newProficiency >= adept) {
    ch.sendToChar(`You are now learned at ${skillEntry.name}.\n`);
  } else {
    ch.sendToChar(`You practice ${skillEntry.name}. (${newProficiency}%)\n`);
  }

  actToRoom(ch, '$n practices a skill.', null);
}

/**
 * Display the list of all skills/spells known to the character.
 */
function displayPracticeList(ch: Player): void {
  ch.sendToChar(`You have ${ch.pcData.practice ?? 0} practice sessions remaining.\n\n`);

  const classEntry = getClassEntry(ch.class_);
  if (!classEntry) return;

  // Collect all skills available to this class at current level
  const spells: Array<{ name: string; level: number; proficiency: number }> = [];
  const skills: Array<{ name: string; level: number; proficiency: number }> = [];

  for (const [sn, entry] of getAllSkillEntries()) {
    const minLevel = entry.skillLevel?.[ch.class_] ?? MAX_LEVEL + 1;
    if (minLevel > ch.level) continue;

    const proficiency = ch.pcData.learned.get(sn) ?? 0;
    const item = { name: entry.name, level: minLevel, proficiency };

    if (entry.isSpell) {
      spells.push(item);
    } else {
      skills.push(item);
    }
  }

  // Display spells
  if (spells.length > 0) {
    ch.sendToChar("&CSpells:&w\n");
    for (const sp of spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))) {
      const profStr = sp.proficiency === 0 ? 'not learned' : `${sp.proficiency}%`;
      ch.sendToChar(`  ${padRight(sp.name, 24)} Lv ${padRight(String(sp.level), 3)} ${profStr}\n`);
    }
  }

  // Display skills
  if (skills.length > 0) {
    ch.sendToChar("\n&CSkills:&w\n");
    for (const sk of skills.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))) {
      const profStr = sk.proficiency === 0 ? 'not learned' : `${sk.proficiency}%`;
      ch.sendToChar(`  ${padRight(sk.name, 24)} Lv ${padRight(String(sk.level), 3)} ${profStr}\n`);
    }
  }
}

/**
 * Find a guildmaster NPC in the character's current room.
 * Guildmasters have ACT_PRACTICE flag.
 */
function findGuildmasterInRoom(ch: Character): Mobile | null {
  if (!ch.inRoom) return null;
  for (const mob of ch.inRoom.characters) {
    if (mob.isNpc && hasFlag(mob.actFlags, ACT_PRACTICE)) {
      return mob as Mobile;
    }
  }
  return null;
}
```

---

### 3. XP Award Calculation in `src/game/combat/DeathHandler.ts` (additions)

Add detailed XP award formulas. These methods are called from `handleDeath()` (already implemented in Phase 3H), but the calculation details are defined here:

```typescript
/**
 * Calculate XP award for killing a mob.
 * Replicates legacy xp_compute() from fight.c.
 *
 * Base formula:
 *   base = victim.level * victim.level * 80
 *
 * Modifiers:
 *   - Alignment bonus: +10% if killer is good and victim is evil, etc.
 *   - Level difference: +5% per level victim is above killer (capped at +50%)
 *   - NPC flags: +20% for ACT_AGGRESSIVE, +10% for spec_fun, +10% for spells
 *   - Act flags: +15% for ACT_WARRIOR, +15% for ACT_MAGE, etc.
 *   - Penalty: -10% per level victim is below killer (minimum 5% of base)
 *
 * @param killer - The character who dealt the killing blow.
 * @param victim - The victim (typically an NPC).
 * @returns XP amount to award.
 */
export function computeXpAward(killer: Character, victim: Character): number {
  if (victim.level <= 0) return 0;

  // Base XP
  let xp = victim.level * victim.level * 80;

  // === Alignment Modifier ===
  const killerAlign = killer.alignment;
  const victimAlign = victim.alignment;

  // Good killing evil: bonus
  if (killerAlign > 350 && victimAlign < -350) {
    xp = Math.floor(xp * 110 / 100); // +10%
  }
  // Evil killing good: bonus
  else if (killerAlign < -350 && victimAlign > 350) {
    xp = Math.floor(xp * 110 / 100); // +10%
  }
  // Same alignment: penalty
  else if ((killerAlign > 350 && victimAlign > 350) ||
           (killerAlign < -350 && victimAlign < -350)) {
    xp = Math.floor(xp * 90 / 100); // -10%
  }

  // === Level Difference Modifier ===
  const levelDiff = victim.level - killer.level;
  if (levelDiff > 0) {
    // Victim is higher level: bonus capped at +50%
    const bonus = Math.min(50, levelDiff * 5);
    xp = Math.floor(xp * (100 + bonus) / 100);
  } else if (levelDiff < 0) {
    // Victim is lower level: penalty, minimum 5%
    const penalty = Math.min(95, Math.abs(levelDiff) * 10);
    xp = Math.floor(xp * Math.max(5, 100 - penalty) / 100);
  }

  // === NPC Flag Modifiers (victim) ===
  if (victim.isNpc) {
    // Aggressive mobs give more XP
    if (hasFlag(victim.actFlags, ACT_AGGRESSIVE)) {
      xp = Math.floor(xp * 120 / 100); // +20%
    }
    // Mobs with special functions
    if ((victim as Mobile).specFun) {
      xp = Math.floor(xp * 110 / 100); // +10%
    }
    // Class-typed mobs
    if (hasFlag(victim.actFlags, ACT_WARRIOR) || hasFlag(victim.actFlags, ACT_MAGE) ||
        hasFlag(victim.actFlags, ACT_THIEF) || hasFlag(victim.actFlags, ACT_CLERIC)) {
      xp = Math.floor(xp * 115 / 100); // +15%
    }
    // Sanctuary
    if (victim.isAffected(AFF.SANCTUARY)) {
      xp = Math.floor(xp * 120 / 100); // +20%
    }
  }

  // Minimum XP: 1
  xp = Math.max(1, xp);

  return xp;
}

/**
 * Split XP among group members in the same room.
 * Replicates legacy group_gain() from fight.c.
 *
 * @param killer - Character who scored the kill.
 * @param victim - The slain character.
 */
export function groupGain(killer: Character, victim: Character): void {
  const totalXp = computeXpAward(killer, victim);

  // Find group members in the room
  const members = getGroupMembersInRoom(killer);

  if (members.length === 0) {
    // Solo kill: full XP to killer
    if (!killer.isNpc && killer instanceof Player) {
      killer.gainXp(totalXp);
      sendToChar(killer, `You receive ${totalXp} experience points.\n`);
    }
    return;
  }

  // Group kill: distribute XP
  // Legacy formula: each member gets (totalXp * member.level) / totalGroupLevel
  const totalGroupLevel = members.reduce((sum, m) => sum + m.level, 0);

  for (const member of members) {
    if (member.isNpc) continue;

    const share = Math.max(1, Math.floor(totalXp * member.level / totalGroupLevel));

    // Additional bonus for group size (1% per extra member, cap 35%)
    const groupBonus = Math.min(35, (members.length - 1) * 1);
    const adjustedShare = Math.floor(share * (100 + groupBonus) / 100);

    if (member instanceof Player) {
      member.gainXp(adjustedShare);
      sendToChar(member, `You receive ${adjustedShare} experience points.\n`);
    }
  }
}

/**
 * Get all group members of a character who are in the same room.
 */
function getGroupMembersInRoom(ch: Character): Character[] {
  if (!ch.inRoom) return [ch];

  const leader = ch.leader ?? ch;
  const members: Character[] = [];

  for (const rch of ch.inRoom.characters) {
    if (rch === leader || rch.leader === leader) {
      members.push(rch);
    }
  }

  return members.length > 0 ? members : [ch];
}
```

---

### 4. `src/game/entities/Player.ts` — Training Sessions Property

Add training session support to `PlayerData`:

```typescript
// Additions to PlayerData interface:
export interface PlayerData {
  // ... (existing fields) ...

  /** Training sessions (for stat improvement via `train` command). */
  trains: number;

  /** Practice sessions (for skill improvement via `practice` command). */
  practice: number;

  /** Played time in seconds. */
  played: number;

  /** Total XP earned (historical, not current). */
  totalXpEarned: number;
}
```

Training sessions are awarded:
- **1 train every 10 levels** — `if (this.level % 10 === 0) this.pcData.trains++` in `advanceLevel()`.
- **Quest rewards** — quest system may grant additional trains.

Add this to `advanceLevel()`:

```typescript
// In advanceLevel(), after practice gain:

// Training session every 10 levels
if (this.level % 10 === 0) {
  this.pcData.trains = (this.pcData.trains ?? 0) + 1;
  this.sendToChar("&WYou gain a training session!&w\n");
}
```

---

### 5. `src/game/commands/information.ts` — Level-Related Display Commands (additions)

Add progression-related display commands:

#### `doScore(ch, argument)` — Score Display (progression section)

Add to the existing `doScore()` implementation:

```typescript
// Progression section in doScore():
ch.sendToChar(`\n&CProgression:&w\n`);
ch.sendToChar(`  Level: ${ch.level}  Class: ${classEntry?.name ?? 'Unknown'}  Race: ${raceEntry?.name ?? 'Unknown'}\n`);
ch.sendToChar(`  Experience: ${ch.exp}  XP to next level: ${xpToNextLevel(ch.level, ch.class_, ch.race) - ch.exp}\n`);
ch.sendToChar(`  Title: ${getTitle(ch.class_, ch.level, ch.sex)}\n`);
ch.sendToChar(`  Practices: ${ch.pcData.practice ?? 0}  Trains: ${ch.pcData.trains ?? 0}\n`);
```

#### `doWorth(ch, argument)` — Display Character Value

Replicates legacy `do_worth()`:

```typescript
/**
 * Display character's experience, level, and gold.
 * Replicates legacy do_worth().
 */
export function doWorth(ch: Player, argument: string): void {
  if (ch.isNpc) return;

  const classEntry = getClassEntry(ch.class_);
  const raceEntry = getRaceEntry(ch.race);

  ch.sendToChar(`&CWorth for ${ch.name}:&w\n`);
  ch.sendToChar(`  Level:       ${ch.level}\n`);
  ch.sendToChar(`  Experience:  ${ch.exp}\n`);
  ch.sendToChar(`  XP to level: ${Math.max(0, xpToNextLevel(ch.level, ch.class_, ch.race) - ch.exp)}\n`);
  ch.sendToChar(`  Gold:        ${ch.gold}\n`);
  ch.sendToChar(`  Silver:      ${ch.silver}\n`);
  ch.sendToChar(`  Copper:      ${ch.copper}\n`);
  ch.sendToChar(`  Bank gold:   ${ch.pcData.goldBalance ?? 0}\n`);
  ch.sendToChar(`  Practices:   ${ch.pcData.practice ?? 0}\n`);
  ch.sendToChar(`  Trains:      ${ch.pcData.trains ?? 0}\n`);

  // PK stats
  ch.sendToChar(`\n  Player kills:  ${ch.pcData.pkills ?? 0}\n`);
  ch.sendToChar(`  Player deaths: ${ch.pcData.pdeaths ?? 0}\n`);
  ch.sendToChar(`  Mob kills:     ${ch.pcData.mkills ?? 0}\n`);
  ch.sendToChar(`  Mob deaths:    ${ch.pcData.mdeaths ?? 0}\n`);
}
```

#### `doSlist(ch, argument)` — Class Skill List

Replicates legacy `do_slist()`:

```typescript
/**
 * Display skills/spells available to a specific class, grouped by level.
 * Replicates legacy do_slist().
 *
 * Syntax:
 *   slist           — Show skills for your class
 *   slist <class>   — Show skills for another class
 */
export function doSlist(ch: Player, argument: string): void {
  let classIndex = ch.class_;

  if (argument && argument.trim() !== '') {
    const cls = findClassByName(argument.trim());
    if (!cls) {
      ch.sendToChar("That is not a valid class.\n");
      return;
    }
    classIndex = cls.index;
  }

  const classEntry = getClassEntry(classIndex);
  if (!classEntry) return;

  ch.sendToChar(`&CSkills and spells for ${classEntry.name}:&w\n\n`);

  // Group skills by level
  const byLevel = new Map<number, Array<{ name: string; isSpell: boolean }>>();

  for (const [sn, entry] of getAllSkillEntries()) {
    const minLevel = entry.skillLevel?.[classIndex] ?? MAX_LEVEL + 1;
    if (minLevel > LEVEL_HERO) continue;

    if (!byLevel.has(minLevel)) {
      byLevel.set(minLevel, []);
    }
    byLevel.get(minLevel)!.push({ name: entry.name, isSpell: entry.isSpell });
  }

  // Sort by level and display
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const entries = byLevel.get(level)!;
    ch.sendToChar(`&WLevel ${padRight(String(level), 3)}:&w `);

    const names = entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => e.name);

    ch.sendToChar(names.join(', ') + '\n');
  }
}
```

#### `doTitle(ch, argument)` — Set Custom Title

Replicates legacy `do_title()`:

```typescript
/**
 * Set a custom player title.
 * Replicates legacy do_title().
 *
 * Syntax:
 *   title <new title>   — Set your title
 *   title               — Reset to default class title
 */
export function doTitle(ch: Player, argument: string): void {
  if (ch.isNpc) return;

  if (!argument || argument.trim() === '') {
    // Reset to default title
    ch.pcData.title = getTitle(ch.class_, ch.level, ch.sex);
    ch.sendToChar(`Title reset to: ${ch.pcData.title}\n`);
    return;
  }

  const newTitle = argument.trim();

  // Check length limit
  if (stripColor(newTitle).length > 50) {
    ch.sendToChar("Title is too long (max 50 visible characters).\n");
    return;
  }

  // Check for forbidden characters
  if (newTitle.includes('~')) {
    ch.sendToChar("Titles cannot contain the tilde (~) character.\n");
    return;
  }

  ch.pcData.title = newTitle;
  ch.sendToChar(`Title set to: ${newTitle}\n`);
}
```

---

### 6. `src/game/commands/immortal.ts` — Immortal Level Commands (additions)

Add immortal commands related to progression:

#### `doAdvance(ch, argument)` — Advance/Demote Player Level

Replicates legacy `do_advance()`:

```typescript
/**
 * Advance or demote a player to a specific level.
 * Replicates legacy do_advance().
 * Trust level: LEVEL_IMPLEMENTOR (58)
 *
 * Syntax:
 *   advance <player> <level>
 */
export function doAdvance(ch: Player, argument: string): void {
  let [arg1, rest] = oneArgument(argument);
  let [arg2] = oneArgument(rest);

  if (!arg1 || !arg2) {
    ch.sendToChar("Syntax: advance <player> <level>\n");
    return;
  }

  const victim = getCharRoom(ch, arg1);
  if (!victim || victim.isNpc) {
    ch.sendToChar("That player is not here.\n");
    return;
  }

  const targetLevel = parseInt(arg2, 10);
  if (isNaN(targetLevel) || targetLevel < 1 || targetLevel > MAX_LEVEL) {
    ch.sendToChar(`Level must be between 1 and ${MAX_LEVEL}.\n`);
    return;
  }

  // Cannot advance someone to equal or higher trust than yourself
  if (targetLevel >= ch.getTrust()) {
    ch.sendToChar("You can't advance someone to your level or beyond.\n");
    return;
  }

  const player = victim as Player;

  if (targetLevel > player.level) {
    // Advance up
    ch.sendToChar(`${player.name} has been advanced to level ${targetLevel}.\n`);
    player.sendToChar(`You are advanced to level ${targetLevel}!\n`);

    while (player.level < targetLevel) {
      player.exp = xpToNextLevel(player.level, player.class_, player.race);
      player.advanceLevel();
    }
  } else if (targetLevel < player.level) {
    // Demote: reset to level 1, then advance to target
    ch.sendToChar(`${player.name} has been demoted to level ${targetLevel}.\n`);
    player.sendToChar(`You are demoted to level ${targetLevel}!\n`);

    // Reset stats to base
    player.level = 1;
    player.exp = 0;
    player.maxHit = 20;
    player.hit = 20;
    player.maxMana = player.class_ !== undefined ? getClassEntry(player.class_)?.baseMana ?? 100 : 100;
    player.mana = player.maxMana;
    player.maxMove = 100;
    player.move = 100;
    player.pcData.practice = 0;
    player.pcData.trains = 0;

    // Re-advance to target level
    while (player.level < targetLevel) {
      player.exp = xpToNextLevel(player.level, player.class_, player.race);
      player.advanceLevel();
    }
    player.exp = 0; // Reset XP after demotion
  } else {
    ch.sendToChar(`${player.name} is already level ${targetLevel}.\n`);
    return;
  }

  player.save().catch(err =>
    Logger.error('immortal', `Failed to save ${player.name} after advance: ${err}`)
  );
}
```

#### `doTrust(ch, argument)` — Modify Player Trust Level

Replicates legacy `do_trust()`:

```typescript
/**
 * Set a player's trust level (grants immortal privileges without changing level).
 * Replicates legacy do_trust().
 * Trust level: LEVEL_IMPLEMENTOR (58)
 *
 * Syntax:
 *   trust <player> <level>
 */
export function doTrust(ch: Player, argument: string): void {
  let [arg1, rest] = oneArgument(argument);
  let [arg2] = oneArgument(rest);

  if (!arg1 || !arg2) {
    ch.sendToChar("Syntax: trust <player> <level>\n");
    return;
  }

  const victim = getCharRoom(ch, arg1);
  if (!victim || victim.isNpc) {
    ch.sendToChar("That player is not here.\n");
    return;
  }

  const targetTrust = parseInt(arg2, 10);
  if (isNaN(targetTrust) || targetTrust < 0 || targetTrust > MAX_LEVEL) {
    ch.sendToChar(`Trust must be between 0 and ${MAX_LEVEL}.\n`);
    return;
  }

  if (targetTrust >= ch.getTrust()) {
    ch.sendToChar("You can't grant trust at or above your own level.\n");
    return;
  }

  victim.trust = targetTrust;
  ch.sendToChar(`${victim.name}'s trust set to ${targetTrust}.\n`);

  if (!victim.isNpc) {
    (victim as Player).save().catch(err =>
      Logger.error('immortal', `Failed to save ${victim.name} after trust change: ${err}`)
    );
  }
}
```

#### `doMortalize(ch, argument)` — Remove Immortal Status

Replicates legacy `do_mortalize()`:

```typescript
/**
 * Strip immortal status from a player, reverting them to mortal.
 * Replicates legacy do_mortalize().
 * Trust level: LEVEL_IMPLEMENTOR (58)
 *
 * Syntax:
 *   mortalize <player>
 */
export function doMortalize(ch: Player, argument: string): void {
  const [arg1] = oneArgument(argument);

  if (!arg1) {
    ch.sendToChar("Syntax: mortalize <player>\n");
    return;
  }

  const victim = getCharRoom(ch, arg1);
  if (!victim || victim.isNpc) {
    ch.sendToChar("That player is not here.\n");
    return;
  }

  const player = victim as Player;

  if (player.level <= LEVEL_HERO) {
    ch.sendToChar(`${player.name} is already mortal.\n`);
    return;
  }

  player.level = LEVEL_HERO;
  player.trust = 0;
  player.exp = 0;
  player.recalculateSavingThrows();

  ch.sendToChar(`${player.name} has been mortalized to level ${LEVEL_HERO}.\n`);
  player.sendToChar("You have been returned to mortal status.\n");

  player.save().catch(err =>
    Logger.error('immortal', `Failed to save ${player.name} after mortalize: ${err}`)
  );
}
```

#### `doBalzhur(ch, argument)` — Punishment Demotion

Replicates legacy `do_balzhur()`:

```typescript
/**
 * Severely punish a player by demoting them to level 2 and stripping skills.
 * Replicates legacy do_balzhur().
 * Trust level: LEVEL_IMPLEMENTOR (58)
 *
 * Syntax:
 *   balzhur <player>
 */
export function doBalzhur(ch: Player, argument: string): void {
  const [arg1] = oneArgument(argument);

  if (!arg1) {
    ch.sendToChar("Syntax: balzhur <player>\n");
    return;
  }

  const victim = getCharRoom(ch, arg1);
  if (!victim || victim.isNpc) {
    ch.sendToChar("That player is not here.\n");
    return;
  }

  const player = victim as Player;

  // Demote to level 2
  player.level = 2;
  player.trust = 0;
  player.exp = 0;

  // Reset vitals to base
  player.maxHit = 20;
  player.hit = 20;
  player.maxMana = 100;
  player.mana = 100;
  player.maxMove = 100;
  player.move = 100;

  // Strip all skills
  player.pcData.learned.clear();

  // Reset practice/train sessions
  player.pcData.practice = 0;
  player.pcData.trains = 0;

  // Announce
  sendToAll(`The Immortals have turned ${player.name} into a lowly slug!\n`);
  player.sendToChar("The Immortals are not amused by your behavior.\n");

  ch.sendToChar(`${player.name} has been balzhured.\n`);

  player.save().catch(err =>
    Logger.error('immortal', `Failed to save ${player.name} after balzhur: ${err}`)
  );
}
```

---

### 7. Character Creation Integration in `src/network/ConnectionManager.ts` (additions)

Add race and class selection integration to the nanny state machine:

```typescript
/**
 * Handle race selection during character creation.
 * State: ConnectionState.GetNewRace
 */
function handleGetNewRace(desc: Descriptor, input: string): void {
  const race = findRaceByName(input.trim());

  if (!race) {
    desc.write("That is not a valid race.\n");
    desc.write("Available races: ");
    desc.write(RACE_TABLE.map(r => r.name).join(', '));
    desc.write("\nChoose a race: ");
    return;
  }

  const player = desc.character as Player;
  player.race = race.index;

  // Apply racial stat modifiers to permanent stats
  player.permStats.str += race.strMod;
  player.permStats.int += race.intMod;
  player.permStats.wis += race.wisMod;
  player.permStats.dex += race.dexMod;
  player.permStats.con += race.conMod;
  player.permStats.cha += race.chaMod;
  player.permStats.lck += race.lckMod;

  // Set racial attributes
  player.resistant = race.resistances;
  player.susceptible = race.susceptibilities;
  player.speaking = race.languages & LANG_COMMON;
  player.speaks = race.languages;
  player.affectedBy = race.affectedBy;

  // Set size-based height/weight
  player.height = numberRange(race.heightRange[0], race.heightRange[1]);
  player.weight = numberRange(race.weightRange[0], race.weightRange[1]);

  // List available classes for this race
  desc.write(`\nYou are a ${race.name}.\n`);
  desc.write("Available classes: ");
  const availableClasses = CLASS_TABLE
    .filter(c => raceCanBeClass(race.index, c.index))
    .map(c => c.name);
  desc.write(availableClasses.join(', '));
  desc.write("\nChoose a class: ");

  desc.state = ConnectionState.GetNewClass;
}

/**
 * Handle class selection during character creation.
 * State: ConnectionState.GetNewClass
 */
function handleGetNewClass(desc: Descriptor, input: string): void {
  const cls = findClassByName(input.trim());

  if (!cls) {
    desc.write("That is not a valid class.\nChoose a class: ");
    return;
  }

  const player = desc.character as Player;

  // Check race/class compatibility
  if (!raceCanBeClass(player.race, cls.index)) {
    desc.write(`Your race cannot be a ${cls.name}.\nChoose a class: `);
    return;
  }

  player.class_ = cls.index;

  // Set class defaults
  player.maxMana = cls.baseMana;
  player.mana = cls.baseMana;
  player.affectedBy |= cls.affectedBy;
  player.resistant |= cls.resistances;
  player.susceptible |= cls.susceptibilities;

  // Set default title
  player.pcData.title = getTitle(cls.index, 1, player.sex);

  // Starting practice sessions: 5 + WIS bonus
  player.pcData.practice = 5 + getWisApp(player.getStat('wis')).practice;
  player.pcData.trains = 0;

  desc.write(`\nYou are a ${cls.name}.\n`);

  // Move to next creation step
  desc.state = ConnectionState.GetNewSex;
  desc.write("What is your sex? (male/female/neutral): ");
}
```

---

### 8. Stat Bonus Tables (referenced by progression formulas)

These are additions to `src/game/affects/StatModifier.ts`, used by `advanceLevel()`:

```typescript
/**
 * CON bonus table. Index by effective CON stat.
 * Replicates legacy con_app[] from const.c.
 */
export interface ConApp {
  hitp: number;   // HP bonus per level
  shock: number;  // Shock survival percentage
}

export const CON_APP: ConApp[] = [
  /* 0  */ { hitp: -4, shock: 20 },
  /* 1  */ { hitp: -3, shock: 25 },
  /* 2  */ { hitp: -2, shock: 30 },
  /* 3  */ { hitp: -2, shock: 35 },
  /* 4  */ { hitp: -1, shock: 40 },
  /* 5  */ { hitp: -1, shock: 45 },
  /* 6  */ { hitp: -1, shock: 50 },
  /* 7  */ { hitp:  0, shock: 55 },
  /* 8  */ { hitp:  0, shock: 60 },
  /* 9  */ { hitp:  0, shock: 65 },
  /* 10 */ { hitp:  0, shock: 70 },
  /* 11 */ { hitp:  0, shock: 75 },
  /* 12 */ { hitp:  0, shock: 80 },
  /* 13 */ { hitp:  0, shock: 85 },
  /* 14 */ { hitp:  1, shock: 88 },
  /* 15 */ { hitp:  1, shock: 90 },
  /* 16 */ { hitp:  2, shock: 95 },
  /* 17 */ { hitp:  2, shock: 97 },
  /* 18 */ { hitp:  3, shock: 99 },
  /* 19 */ { hitp:  3, shock: 99 },
  /* 20 */ { hitp:  4, shock: 99 },
  /* 21 */ { hitp:  4, shock: 99 },
  /* 22 */ { hitp:  5, shock: 99 },
  /* 23 */ { hitp:  5, shock: 99 },
  /* 24 */ { hitp:  6, shock: 99 },
  /* 25 */ { hitp:  7, shock: 99 },
];

export function getConApp(con: number): ConApp {
  return CON_APP[Math.max(0, Math.min(25, con))];
}

/**
 * INT bonus table. Index by effective INT stat.
 * Replicates legacy int_app[] from const.c.
 */
export interface IntApp {
  learn: number;  // Percentage gain per practice session
  mana: number;   // Mana bonus per level
}

export const INT_APP: IntApp[] = [
  /* 0  */ { learn:  3, mana:  0 },
  /* 1  */ { learn:  5, mana:  0 },
  /* 2  */ { learn:  7, mana:  0 },
  /* 3  */ { learn:  8, mana:  0 },
  /* 4  */ { learn:  9, mana:  0 },
  /* 5  */ { learn: 10, mana:  0 },
  /* 6  */ { learn: 11, mana:  0 },
  /* 7  */ { learn: 12, mana:  0 },
  /* 8  */ { learn: 13, mana:  0 },
  /* 9  */ { learn: 15, mana:  0 },
  /* 10 */ { learn: 17, mana:  0 },
  /* 11 */ { learn: 19, mana:  0 },
  /* 12 */ { learn: 22, mana:  0 },
  /* 13 */ { learn: 25, mana:  0 },
  /* 14 */ { learn: 28, mana:  1 },
  /* 15 */ { learn: 31, mana:  1 },
  /* 16 */ { learn: 34, mana:  2 },
  /* 17 */ { learn: 37, mana:  2 },
  /* 18 */ { learn: 40, mana:  3 },
  /* 19 */ { learn: 44, mana:  4 },
  /* 20 */ { learn: 49, mana:  5 },
  /* 21 */ { learn: 55, mana:  6 },
  /* 22 */ { learn: 60, mana:  7 },
  /* 23 */ { learn: 70, mana:  8 },
  /* 24 */ { learn: 85, mana: 10 },
  /* 25 */ { learn: 99, mana: 12 },
];

export function getIntApp(int: number): IntApp {
  return INT_APP[Math.max(0, Math.min(25, int))];
}

/**
 * WIS bonus table. Index by effective WIS stat.
 * Replicates legacy wis_app[] from const.c.
 */
export interface WisApp {
  practice: number;  // Practice sessions gained per level
}

export const WIS_APP: WisApp[] = [
  /* 0  */ { practice: 0 },
  /* 1  */ { practice: 0 },
  /* 2  */ { practice: 0 },
  /* 3  */ { practice: 0 },
  /* 4  */ { practice: 0 },
  /* 5  */ { practice: 1 },
  /* 6  */ { practice: 1 },
  /* 7  */ { practice: 1 },
  /* 8  */ { practice: 1 },
  /* 9  */ { practice: 1 },
  /* 10 */ { practice: 1 },
  /* 11 */ { practice: 2 },
  /* 12 */ { practice: 2 },
  /* 13 */ { practice: 2 },
  /* 14 */ { practice: 2 },
  /* 15 */ { practice: 3 },
  /* 16 */ { practice: 3 },
  /* 17 */ { practice: 4 },
  /* 18 */ { practice: 4 },
  /* 19 */ { practice: 4 },
  /* 20 */ { practice: 5 },
  /* 21 */ { practice: 5 },
  /* 22 */ { practice: 5 },
  /* 23 */ { practice: 5 },
  /* 24 */ { practice: 5 },
  /* 25 */ { practice: 6 },
];

export function getWisApp(wis: number): WisApp {
  return WIS_APP[Math.max(0, Math.min(25, wis))];
}

/**
 * DEX bonus table — move gain per level.
 * Replicates legacy dex_app[] from const.c.
 */
export interface DexAppMove {
  move: number;  // Move gain per level
}

export const DEX_APP_MOVE: DexAppMove[] = [
  /* 0  */ { move: -5 },
  /* 1  */ { move: -4 },
  /* 2  */ { move: -3 },
  /* 3  */ { move: -3 },
  /* 4  */ { move: -2 },
  /* 5  */ { move: -2 },
  /* 6  */ { move: -1 },
  /* 7  */ { move: -1 },
  /* 8  */ { move:  0 },
  /* 9  */ { move:  0 },
  /* 10 */ { move:  0 },
  /* 11 */ { move:  0 },
  /* 12 */ { move:  0 },
  /* 13 */ { move:  0 },
  /* 14 */ { move:  1 },
  /* 15 */ { move:  1 },
  /* 16 */ { move:  2 },
  /* 17 */ { move:  3 },
  /* 18 */ { move:  4 },
  /* 19 */ { move:  5 },
  /* 20 */ { move:  6 },
  /* 21 */ { move:  7 },
  /* 22 */ { move:  8 },
  /* 23 */ { move:  9 },
  /* 24 */ { move: 10 },
  /* 25 */ { move: 12 },
];

export function getDexAppMove(dex: number): DexAppMove {
  return DEX_APP_MOVE[Math.max(0, Math.min(25, dex))];
}
```

---

### 9. ACT Flag Constants for Trainers/Guildmasters

```typescript
// NPC act flags (bigint) — additions for progression-related NPCs
export const ACT_SENTINEL     = 1n << 0n;
export const ACT_SCAVENGER    = 1n << 1n;
export const ACT_AGGRESSIVE   = 1n << 5n;
export const ACT_STAYAREA     = 1n << 6n;
export const ACT_WIMPY        = 1n << 7n;
export const ACT_PET          = 1n << 8n;
export const ACT_TRAIN        = 1n << 9n;   // Can train stats
export const ACT_PRACTICE     = 1n << 10n;  // Can teach skills (guildmaster)
export const ACT_IMMORTAL     = 1n << 11n;
export const ACT_DEADLY       = 1n << 12n;
export const ACT_POLYSELF     = 1n << 13n;
export const ACT_META_AGGR    = 1n << 14n;
export const ACT_GUARDIAN     = 1n << 15n;
export const ACT_RUNNING      = 1n << 16n;
export const ACT_NOWANDER     = 1n << 17n;
export const ACT_MOUNTABLE    = 1n << 18n;
export const ACT_MOUNTED      = 1n << 19n;
export const ACT_SCHOLAR      = 1n << 20n;
export const ACT_SECRETIVE    = 1n << 21n;
export const ACT_HARDHAT      = 1n << 22n;
export const ACT_MOBINVIS     = 1n << 23n;
export const ACT_NOASSIST     = 1n << 24n;
export const ACT_AUTONOMOUS   = 1n << 25n;
export const ACT_PACIFIST     = 1n << 26n;
export const ACT_NOATTACK     = 1n << 27n;
export const ACT_ANNOYING     = 1n << 28n;
export const ACT_BANKER       = 1n << 29n;  // Used by BankSystem
export const ACT_WARRIOR      = 1n << 30n;
export const ACT_MAGE         = 1n << 31n;
export const ACT_THIEF        = 1n << 32n;
export const ACT_CLERIC       = 1n << 33n;
```

---

### 10. Multi-Class Considerations

SMAUG 2.0 does not implement traditional multi-classing, but supports the following:

#### Second Class / Class Change (optional)

```typescript
/**
 * Multi-class / second-class considerations.
 * SMAUG 2.0 supports a single class per character. However, the remort
 * system allows characters to restart at level 1 with a new class while
 * retaining some skills and stat bonuses.
 *
 * Remort is implemented as an immortal command:
 *   remort <player> <new_class>
 *
 * Effects:
 *   - Level reset to 1
 *   - XP reset to 0
 *   - Class changed to new_class
 *   - HP/Mana/Move recalculated from base
 *   - Retain: race, stats (permStats), some skills at reduced proficiency
 *   - Bonus: +1 to all stat caps (racial max + remort count)
 *   - pcData.remortCount incremented
 */
export function doRemort(ch: Player, argument: string): void {
  let [arg1, rest] = oneArgument(argument);
  let [arg2] = oneArgument(rest);

  if (!arg1 || !arg2) {
    ch.sendToChar("Syntax: remort <player> <new_class>\n");
    return;
  }

  const victim = getCharRoom(ch, arg1);
  if (!victim || victim.isNpc) {
    ch.sendToChar("That player is not here.\n");
    return;
  }

  const newClass = findClassByName(arg2);
  if (!newClass) {
    ch.sendToChar("That is not a valid class.\n");
    return;
  }

  const player = victim as Player;

  if (player.level < LEVEL_HERO) {
    ch.sendToChar(`${player.name} must be at least level ${LEVEL_HERO} to remort.\n`);
    return;
  }

  if (!raceCanBeClass(player.race, newClass.index)) {
    ch.sendToChar(`${player.name}'s race cannot be a ${newClass.name}.\n`);
    return;
  }

  // Track remort
  player.pcData.remortCount = (player.pcData.remortCount ?? 0) + 1;

  // Reduce all skill proficiencies by 50% (retain partial knowledge)
  for (const [sn, proficiency] of player.pcData.learned.entries()) {
    player.pcData.learned.set(sn, Math.floor(proficiency / 2));
  }

  // Reset level and class
  player.level = 1;
  player.exp = 0;
  player.class_ = newClass.index;

  // Reset vitals
  player.maxHit = 20;
  player.hit = 20;
  player.maxMana = newClass.baseMana;
  player.mana = player.maxMana;
  player.maxMove = 100;
  player.move = 100;

  // Reset practice/trains with small bonus for remort
  player.pcData.practice = 5 + player.pcData.remortCount;
  player.pcData.trains = 0;

  // Apply new class affects
  player.affectedBy = getRaceEntry(player.race)?.affectedBy ?? 0n;
  player.affectedBy |= newClass.affectedBy;

  // Update title
  player.pcData.title = getTitle(newClass.index, 1, player.sex);

  // Saving throws
  player.recalculateSavingThrows();

  // Announce
  sendToAll(`${player.name} has remorted as a ${newClass.name}!\n`);
  ch.sendToChar(`${player.name} has been remorted as a ${newClass.name}.\n`);
  player.sendToChar(`You have been reborn as a ${newClass.name}! Your remort count is ${player.pcData.remortCount}.\n`);

  player.save().catch(err =>
    Logger.error('immortal', `Failed to save ${player.name} after remort: ${err}`)
  );
}
```

Add to `PlayerData`:

```typescript
// Addition to PlayerData interface:
export interface PlayerData {
  // ... (existing fields) ...

  /** Number of times this character has remorted. */
  remortCount: number;
}
```

---

## Command Registration

Register all progression-related commands in `CommandRegistry`:

```typescript
// Player commands
registerCommand({
  name: 'train',     handler: doTrain,     position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'practice',  handler: doPractice,  position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'worth',     handler: doWorth,     position: Position.Resting,   trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'slist',     handler: doSlist,     position: Position.Dead,      trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'title',     handler: doTitle,     position: Position.Dead,      trust: 0,  log: LogAction.Normal });

// Immortal commands
registerCommand({
  name: 'advance',   handler: doAdvance,   position: Position.Dead,      trust: 58, log: LogAction.Always });
registerCommand({
  name: 'trust',     handler: doTrust,     position: Position.Dead,      trust: 58, log: LogAction.Always });
registerCommand({
  name: 'mortalize', handler: doMortalize, position: Position.Dead,      trust: 58, log: LogAction.Always });
registerCommand({
  name: 'balzhur',   handler: doBalzhur,   position: Position.Dead,      trust: 58, log: LogAction.Always });
registerCommand({
  name: 'remort',    handler: doRemort,    position: Position.Dead,      trust: 58, log: LogAction.Always });
```

---

## EventBus Events

Emit the following events at the documented hook points:

```typescript
// Character level-up event
EventBus.emit(GameEvent.CharacterLevelUp, {
  characterId: string,
  characterName: string,
  newLevel: number,
  hpGain: number,
  manaGain: number,
  moveGain: number,
  practiceGain: number,
});

// XP gain event
EventBus.emit(GameEvent.CharacterGainXp, {
  characterId: string,
  amount: number,
  totalXp: number,
  source: 'kill' | 'quest' | 'admin',
});

// Training event
EventBus.emit(GameEvent.CharacterTrain, {
  characterId: string,
  attribute: string,
  newValue: number,
});

// Practice event
EventBus.emit(GameEvent.CharacterPractice, {
  characterId: string,
  skillName: string,
  newProficiency: number,
});
```

---

## Persistence Integration

#### PlayerRepository Updates

Ensure the following fields are persisted/loaded for progression:

```typescript
// In src/persistence/PlayerRepository.ts — save/load additions:

// Save progression fields
async function savePlayer(player: Player): Promise<void> {
  await prisma.player.update({
    where: { name: player.name },
    data: {
      level: player.level,
      exp: player.exp,
      class_: player.class_,
      race: player.race,
      maxHit: player.maxHit,
      maxMana: player.maxMana,
      maxMove: player.maxMove,
      practice: player.pcData.practice,
      trains: player.pcData.trains,
      title: player.pcData.title,
      remortCount: player.pcData.remortCount ?? 0,
      savingPoison: player.savingPoison,
      savingRod: player.savingRod,
      savingPara: player.savingPara,
      savingBreath: player.savingBreath,
      savingSpell: player.savingSpell,
      // ... other fields ...
    },
  });
}

// Load progression fields
async function loadPlayer(name: string): Promise<Player | null> {
  const data = await prisma.player.findUnique({ where: { name } });
  if (!data) return null;

  const player = new Player(data.id, data.name, createDefaultPcData());
  player.level = data.level;
  player.exp = data.exp;
  player.class_ = data.class_;
  player.race = data.race;
  player.maxHit = data.maxHit;
  player.maxMana = data.maxMana;
  player.maxMove = data.maxMove;
  player.pcData.practice = data.practice;
  player.pcData.trains = data.trains;
  player.pcData.title = data.title;
  player.pcData.remortCount = data.remortCount ?? 0;
  // ... other fields ...
  return player;
}
```

#### Prisma Schema Additions

Ensure the `Player` model in `prisma/schema.prisma` includes:

```prisma
model Player {
  // ... existing fields ...
  practice    Int     @default(0)
  trains      Int     @default(0)
  title       String  @default("")
  remortCount Int     @default(0) @map("remort_count")
}
```

---

## Tests for Sub-Phase 3N

- `tests/unit/entities/tables.test.ts` — Race and class table tests:
  - All 14 races have valid stat modifiers and language flags.
  - All 12 classes have valid THAC0, HP dice, and mana dice values.
  - `getRaceEntry()` returns correct entry for valid indices, null for invalid.
  - `getClassEntry()` returns correct entry for valid indices, null for invalid.
  - `findRaceByName('elf')` finds Elf race; `findRaceByName('zz')` returns null.
  - `findClassByName('war')` finds Warrior; `findClassByName('xyz')` returns null.
  - `raceCanBeClass()` correctly validates race/class combinations.
  - `getTitle()` returns correct male/female titles for various level/class combos.
  - Race stat modifiers sum is reasonable (no race has >+5 net total).
  - All races have valid size, alignment range, and height/weight ranges.

- `tests/unit/entities/Progression.test.ts` — XP and leveling tests:
  - `xpToNextLevel(1)` returns 500.
  - `xpToNextLevel(10)` returns 50,000.
  - `xpToNextLevel(50)` returns 1,250,000.
  - `xpToNextLevel(1, 0, 1)` applies class/race multipliers correctly.
  - `gainXp(500)` at level 1 triggers `advanceLevel()` and sets level to 2.
  - `gainXp(-100)` does not reduce XP below 0.
  - Multi-level gain: `gainXp(50000)` at level 1 advances multiple levels.
  - `advanceLevel()` increases `maxHit` by at least 1.
  - `advanceLevel()` increases `maxMana` for mage class, not for warrior.
  - `advanceLevel()` increases `maxMove` by at least 1.
  - `advanceLevel()` awards practice sessions based on WIS.
  - `advanceLevel()` awards training session at level 10, 20, 30, etc.
  - `advanceLevel()` emits `GameEvent.CharacterLevelUp` event.
  - `advanceLevel()` calls `save()` on the player.
  - `recalculateSavingThrows()` produces better (lower) saves at higher levels.
  - Level cap: `gainXp()` stops at `LEVEL_HERO` (50).

- `tests/unit/entities/StatBonusTables.test.ts` — Stat bonus table tests:
  - `getConApp(18).hitp` returns 3.
  - `getConApp(3).hitp` returns -2.
  - `getIntApp(18).learn` returns 40.
  - `getIntApp(18).mana` returns 3.
  - `getWisApp(15).practice` returns 3.
  - `getDexAppMove(18).move` returns 4.
  - All tables have exactly 26 entries (indices 0-25).
  - Boundary clamping: `getConApp(-1)` returns index 0 values; `getConApp(30)` returns index 25 values.

- `tests/unit/commands/train.test.ts` — Training tests:
  - `doTrain()` with no trainer in room → "You can't do that here."
  - `doTrain('str')` with trainer → STR increases by 1.
  - `doTrain('str')` at racial max → "Your str is already at maximum."
  - `doTrain('hp')` → maxHit increases by 2.
  - `doTrain('mana')` for non-mana class → "You are not a spellcaster."
  - `doTrain()` with 0 trains → "You have no training sessions."
  - Display mode: `doTrain('')` lists all trainable stats with current/max values.

- `tests/unit/commands/practice.test.ts` — Practice tests:
  - `doPractice()` with no guildmaster → "You can only practice at a guildmaster."
  - `doPractice('fireball')` with guildmaster → proficiency increases.
  - `doPractice('fireball')` at adept → "You are already learned at fireball."
  - `doPractice('unknownskill')` → "You can't practice that."
  - `doPractice()` with 0 practices → "You have no practice sessions left."
  - Display mode: `doPractice('')` lists all known skills with proficiency.
  - Learn rate scales with INT (higher INT = more gain per practice).

- `tests/unit/combat/XpAward.test.ts` — XP award calculation tests:
  - `computeXpAward()` base formula: victim level 10 → base 8000.
  - Alignment bonus: good killing evil → +10%.
  - Level difference: victim 5 levels above → +25% bonus.
  - Level difference: victim 5 levels below → -50% penalty, minimum 5%.
  - NPC flags: aggressive mob → +20%.
  - `groupGain()` splits XP proportionally by level.
  - Solo kill gets full XP.
  - Group of 3 gets per-member share + group bonus.

- `tests/unit/commands/immortal.test.ts` — Immortal progression command tests:
  - `doAdvance()` advances player from level 1 to level 10 with proper stat gains.
  - `doAdvance()` demotes player and resets stats.
  - `doAdvance()` refuses to advance to own trust level.
  - `doTrust()` sets trust correctly.
  - `doMortalize()` resets immortal to LEVEL_HERO.
  - `doBalzhur()` resets to level 2 and clears skills.
  - `doRemort()` changes class, resets level, retains partial skills.

- `tests/integration/LevelUpFlow.test.ts` — Full progression flow:
  - Create level 1 warrior with 13 CON, 13 WIS.
  - Award enough XP to reach level 2: verify HP gain, move gain, practice gain.
  - Practice a skill at guildmaster: verify proficiency increases.
  - Train STR at trainer: verify STR perm stat increases.
  - Kill mob → verify XP award → verify level gain if threshold reached.
  - Score display shows correct XP to next level.

---

## Acceptance Criteria

- [ ] `xpToNextLevel()` returns correct values: level 1 = 500, level 10 = 50000, level 50 = 1250000.
- [ ] Class/race multipliers adjust `xpToNextLevel()` correctly.
- [ ] `gainXp()` adds XP and triggers `advanceLevel()` when threshold is met.
- [ ] `gainXp()` with negative amount does not reduce XP below 0.
- [ ] Multi-level gain works: gaining enough XP for 3 levels advances 3 times.
- [ ] `advanceLevel()` rolls HP gain from class dice + CON bonus + race modifier (minimum 1).
- [ ] `advanceLevel()` rolls mana gain for spellcaster classes (0 for warrior/thief/savage/pirate).
- [ ] `advanceLevel()` rolls move gain from 1d6 + DEX bonus (minimum 1).
- [ ] `advanceLevel()` awards practice sessions based on `wis_app[WIS].practice`.
- [ ] `advanceLevel()` awards 1 training session every 10 levels.
- [ ] `advanceLevel()` emits `GameEvent.CharacterLevelUp` with correct payload.
- [ ] `advanceLevel()` sends level-up announcement to character and room.
- [ ] `advanceLevel()` auto-saves the player.
- [ ] `recalculateSavingThrows()` produces improving saves with higher levels.
- [ ] Race table: all 14 races have correct stat modifiers, languages, sizes, and alignment ranges.
- [ ] Class table: all 12 classes have correct HP/mana dice, THAC0 values, and prime attributes.
- [ ] `getTitle()` returns correct male/female titles for level and class.
- [ ] `doTrain()` requires trainer NPC in room; increases stat by 1; enforces racial maximum.
- [ ] `doTrain('hp')` increases maxHit by 2; `doTrain('mana')` increases maxMana by 2 (mana classes only).
- [ ] `doPractice()` requires guildmaster NPC; increases skill proficiency; enforces adept cap.
- [ ] `doPractice()` learn rate scales with INT bonus.
- [ ] `doPractice('')` lists all available skills with current proficiency.
- [ ] `doWorth()` displays XP, level, gold, practices, trains, and kill stats.
- [ ] `doSlist()` displays skills grouped by level for the specified class.
- [ ] `doTitle()` sets custom title; resets to default when no argument.
- [ ] `doAdvance()` advances or demotes a player with correct stat adjustments.
- [ ] `doTrust()` modifies trust level without changing character level.
- [ ] `doMortalize()` reverts immortal to mortal at LEVEL_HERO.
- [ ] `doBalzhur()` punishes player: level 2, skills cleared, practices/trains reset.
- [ ] `doRemort()` changes class, resets level to 1, retains 50% skill proficiency, increments remort count.
- [ ] Character creation: race selection applies stat modifiers, resistances, languages, and innate affects.
- [ ] Character creation: class selection sets mana, affects, starting title, and practice sessions.
- [ ] `computeXpAward()` matches legacy formula with alignment, level difference, and NPC flag modifiers.
- [ ] `groupGain()` distributes XP proportionally by level with group bonus.
- [ ] Stat bonus tables (CON, INT, WIS, DEX) have correct 26-entry values matching legacy.
- [ ] All progression data (level, exp, practice, trains, remortCount) persists via PlayerRepository.
- [ ] All EventBus events emitted at correct hook points.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
