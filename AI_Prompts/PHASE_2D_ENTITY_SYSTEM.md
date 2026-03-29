# Phase 2D — Entity System — Character Hierarchy, Types, Enums

## Your Role

You are a **senior software architect** designing the complete technical architecture for a port of the **SMAUG 2.0 MUD engine** from C to Node.js/TypeScript. You are producing a section of `ARCHITECTURE.md` — the master design document that will guide all implementation work.

## Reference Documents

You have access to four analysis documents produced in Phase 0/1:

| Document | Contains |
|---|---|
| `STRUCTURE.md` | Inventory of every C source file, line counts, subsystem groupings |
| `DATAMODEL.md` | Every C struct, enum, constant, macro, and type definition |
| `COMMANDS.md` | Every player/admin command, dispatch mechanism, trust levels |
| `ANALYSIS.md` | Deep analysis of 15 game subsystems, algorithms, data flows |

**You must reference these documents constantly.** Every design decision must trace back to a specific legacy behaviour documented in these files.

## This Sub-Phase

**Sub-phase:** 2D
**Title:** Entity System — Character Hierarchy, Types, Enums
**Sections covered:** §4

### Output Instructions

**Read-and-append rule:** Read the existing `ARCHITECTURE.md` file (produced by prior sub-phases) and **append** your new section(s) to the end. Do **not** overwrite, reorder, or modify any previously written content.

Before appending, perform a **local consistency check**:
- Verify that any class, interface, enum, or type names you reference from earlier sections match exactly what is already written in the file
- Verify that any cross-references (e.g., "See §X") point to sections that already exist in the file
- Use the same naming conventions already established (check the Entity System section if it exists for canonical type/interface names)
- Use the same pulse constant values already established (check the Core Engine section if it exists)
- If you spot an inconsistency between your planned content and what's already in the file, **match the existing file** — do not introduce a conflicting name

## Design Constraints (apply to ALL sections)

1. **Feature parity first**: The TypeScript port must replicate every behaviour of the C original. Do not omit features, simplify mechanics, or "modernise" gameplay. If the legacy code does something, the port must do it too.

2. **Type safety**: Every C struct becomes a TypeScript interface or class. Every C enum becomes a TypeScript enum. Every bitfield becomes a `bigint`-based `BitVector`. No `any` types.

3. **Event-driven architecture**: Use a central `EventBus` for decoupled communication between subsystems. Document which events each subsystem emits and consumes.

4. **Backward compatibility**: World data files must be importable from the legacy format. Player save files must be migratable. The command set must be identical (same names, same abbreviations, same behaviour).

5. **No over-engineering**: Do not introduce patterns that the legacy system does not need (e.g., no CQRS, no event sourcing, no GraphQL). The architecture should be as simple as possible while being maintainable and type-safe.

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ LTS |
| Language | TypeScript 5.x (strict mode) |
| Database | PostgreSQL 16 (player data) |
| ORM | Prisma 5.x |
| Network | `ws` (WebSocket library) |
| Admin UI | React 18 + Vite |
| Browser Play | React 18 + xterm.js |
| Testing | Vitest |
| Logging | Winston |
| Process Mgr | PM2 |

## Canonical Folder Structure

```
smaug-ts/
├── src/
│   ├── core/           # GameLoop, TickEngine, EventBus, StateManager
│   ├── network/        # WebSocketServer, ConnectionManager, Descriptor
│   ├── entities/       # Character, Player, Mobile, Room, Area, GameObject, Affect
│   ├── commands/       # CommandRegistry, command handlers (movement, combat, info, admin, etc.)
│   ├── combat/         # CombatManager, DamageCalculator, DeathHandler
│   ├── magic/          # SpellRegistry, SpellCaster, spell implementations
│   ├── skills/         # SkillManager, skill implementations
│   ├── affects/        # AffectManager, affect handlers
│   ├── world/          # VnumRegistry, AreaManager, ResetEngine, RoomManager
│   ├── movement/       # MovementHandler, DoorManager, MountManager, Pathfinder
│   ├── communication/  # ChannelManager, LanguageSystem, ColorParser, Pager
│   ├── economy/        # CurrencyManager, ShopKeeper, AuctionSystem
│   ├── social/         # ClanManager, CouncilManager, BoardManager, HousingManager
│   ├── scripting/      # MudProgEngine, TriggerManager, IfCheckRegistry
│   ├── olc/            # OLC editors (REdit, MEdit, OEdit, AEdit, etc.)
│   ├── admin/          # TrustLevels, BanSystem, WizardCommands
│   ├── persistence/    # PlayerRepository, WorldRepository, Prisma client
│   ├── dashboard/      # Express REST API for admin dashboard
│   ├── browser-ui/     # React app for browser-based play
│   ├── migration/      # AreFileParser, PlayerFileParser, MigrationRunner
│   ├── utils/          # Dice, BitVector, AnsiColors, Logger, StringUtils
│   └── types/          # Shared TypeScript types, enums, constants
├── prisma/
│   └── schema.prisma
├── data/
│   └── world/          # JSON area files (converted from .are)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
└── tools/              # Legacy import scripts, data conversion utilities
```

## Output Quality Requirements

For your section(s), you must provide:
- **Exhaustive detail**: Every field, every method signature, every enum value. A developer must be able to implement from this document alone.
- **Decision justification**: Every design choice must include a "Why" explanation tracing back to the legacy behaviour.
- **TypeScript code sketches**: Provide interface definitions, class signatures, key method signatures, and enum definitions as fenced TypeScript code blocks.
- **Mermaid diagrams**: Where the original prompt specifies a diagram, include it as a fenced Mermaid code block.
- **Cross-references**: Reference other sections by number (e.g., "See §4 Entity System") when your section depends on or relates to another.
- **Legacy file mapping**: Note which C source files from STRUCTURE.md each module replaces.

---


## Section Requirements

### §4 — Entity System

Design the complete entity class hierarchy that replaces the C struct system.

#### 4.1 Design Philosophy
- Why a class hierarchy instead of ECS (Entity Component System): the legacy code uses inheritance-like patterns (char_data → pc_data/mob_index_data), and a class hierarchy maps more directly
- How TypeScript classes replace C structs with function pointers
- The role of interfaces vs. abstract classes vs. concrete classes

#### 4.2 Core Entity Interfaces
Define the foundational interfaces in `src/types/`:
- `IEntity` — base interface for all game entities (id, vnum, name, description)
- `ICharacter` — extends IEntity, adds all fields from `char_data` in DATAMODEL.md
- `IPlayer` — extends ICharacter, adds all fields from `pc_data`
- `IMobile` — extends ICharacter, adds all fields from `mob_index_data`
- `IGameObject` — maps to `obj_data` and `obj_index_data`
- `IRoom` — maps to `room_index_data`
- `IArea` — maps to `area_data`
- `IAffect` — maps to `affect_data` and `smaug_affect`
- `IExit` — maps to `exit_data`
- `IExtraDescription` — maps to `extra_descr_data`
- `IReset` — maps to `reset_data`

**For each interface**: list every field with its TypeScript type, and note which C struct field it maps from. Use `bigint`-based `BitVector` for all bitfield types.

#### 4.3 Character Class (`src/entities/Character.ts`)
- Abstract base class implementing `ICharacter`
- All shared fields between players and mobiles
- Key methods: `send()`, `act()`, `isAffectedBy()`, `applyAffect()`, `removeAffect()`, `getModifiedStat()`, `canSee()`, `isImmortal()`, `isMounted()`, `isCharmed()`
- How `act()` works: the legacy `act_string()` formatting system with `$n`, `$N`, `$e`, `$m`, `$s`, etc. tokens
- Stat calculation: base stats + racial modifiers + equipment modifiers + affect modifiers + spell modifiers

#### 4.4 Player Class (`src/entities/Player.ts`)
- Extends Character
- All fields from `pc_data` in DATAMODEL.md: conditions (hunger, thirst, drunk), learned skills map, clan membership, quest data, aliases, ignored players, tell history, prompt format, title, homepage, email, etc.
- Player-specific methods: `save()`, `load()`, `gainExperience()`, `advanceLevel()`, `addPractice()`
- Password handling: bcrypt hashing (replacing legacy SHA256 unsalted)

#### 4.5 Mobile Class (`src/entities/Mobile.ts`)
- Extends Character
- Prototype/instance pattern: `MobilePrototype` (from `mob_index_data`) vs `Mobile` (runtime instance)
- Fields from `mob_index_data`: vnum, count, killed count, spec_fun, MUDprog triggers
- Instance fields: current HP, position, fighting target, etc.
- How instances are created from prototypes (the `create_mobile()` equivalent)

#### 4.6 GameObject Class (`src/entities/GameObject.ts`)
- Prototype/instance pattern: `ObjectPrototype` (from `obj_index_data`) vs `GameObject` (runtime instance)
- All item types from the legacy code: LIGHT, SCROLL, WAND, STAFF, WEAPON, TREASURE, ARMOR, POTION, FURNITURE, TRASH, CONTAINER, DRINK_CON, KEY, FOOD, MONEY, BOAT, CORPSE_NPC, CORPSE_PC, FOUNTAIN, PILL, PIPE, HERB_CON, INCENSE, FIRE, BOOK, SWITCH, LEVER, PULLCHAIN, BUTTON, RUNE, RUNEPOUCH, MATCH, TRAP, MAP, PORTAL, PAPER, TINDER, LOCKPICK, MISSILE_WEAPON, PROJECTILE, QUIVER, SHOVEL, SALVE, COOK, KEYRING, ODOR, CHANCE
- The `value[0..5]` system: how each item type interprets its 6 value fields differently
- Extra flags, wear flags, magic flags as BitVectors
- Container mechanics: open/close/lock/pick, capacity, key vnum
- Weapon mechanics: damage type, condition, special flags

#### 4.7 Room Class (`src/entities/Room.ts`)
- Maps to `room_index_data` from DATAMODEL.md
- Fields: vnum, area reference, name, description, exits (6 cardinal + up/down + custom), extra descriptions, room flags, sector type, light level, contents (objects), characters present, resets
- Exit system: `Exit` class with destination vnum, flags (door, locked, hidden, etc.), key vnum, keywords
- Sector types: all legacy sector types with movement cost table
- Room flags as BitVector: DARK, NO_MOB, INDOORS, NO_MAGIC, TUNNEL, PRIVATE, SAFE, SOLITARY, PET_SHOP, NO_RECALL, DONATION, NO_DROP, TELEPORT, etc.

#### 4.8 Area Class (`src/entities/Area.ts`)
- Maps to `area_data` from DATAMODEL.md
- Fields: filename, name, author, vnum ranges (low/high for rooms, mobs, objects), reset interval, age, player count, weather data, flags
- Area status tracking: loaded, modified, needs reset

#### 4.9 Enums and Constants (`src/types/enums.ts`, `src/types/constants.ts`)
- **Every** enum from DATAMODEL.md must be defined as a TypeScript enum
- Key enums: `Position`, `Sex`, `Race`, `CharacterClass`, `SectorType`, `ItemType`, `WearLocation`, `DamageType`, `SpellTarget`, `AffectLocation`, `ApplyType`, `Direction`, `DoorState`, `ChannelType`, `TrustLevel`, `LogLevel`
- Constants: MAX_LEVEL, MAX_SKILL, MAX_RACE, MAX_CLASS, level thresholds (LEVEL_AVATAR, LEVEL_IMMORTAL, LEVEL_SUPREME), stat caps, experience tables

#### 4.10 Entity Class Hierarchy Diagram
- Mermaid class diagram showing:
  - IEntity → ICharacter → Character (abstract) → Player, Mobile
  - IGameObject → ObjectPrototype, GameObject
  - IRoom → Room
  - IArea → Area
  - IAffect → Affect
  - Show key fields and methods on each class

**Legacy files replaced:** `mud.h` (all struct definitions), `build.c` (entity creation), `db.c` (entity loading), `save.c` (entity saving)

### Quality Criteria for This Sub-Phase
- [ ] Every field of `char_data`, `pc_data`, `mob_index_data`, `obj_data`, `obj_index_data`, `room_index_data`, `area_data` is mapped
- [ ] Every enum from DATAMODEL.md has a TypeScript equivalent
- [ ] All item types are listed with their value field interpretations
- [ ] All room flags and sector types are defined
- [ ] The prototype/instance pattern is clearly explained for both Mobiles and GameObjects
- [ ] Class hierarchy diagram renders correctly
- [ ] `act()` token system is fully documented
