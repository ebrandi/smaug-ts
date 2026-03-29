# Phase 2K — Persistence Layer + Prisma Schema

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

**Sub-phase:** 2K
**Title:** Persistence Layer + Prisma Schema
**Sections covered:** §13 + §21

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

### §13 — Persistence Layer

Design the dual persistence strategy: PostgreSQL for player data, JSON flat files for world data.

#### 13.1 Persistence Strategy
- **Why dual persistence**: Player data needs ACID transactions, concurrent access, and queryability (PostgreSQL). World data is read-mostly, loaded at boot, and edited via OLC (JSON files are simpler, version-controllable, and human-readable).
- Player data in PostgreSQL: accounts, characters, inventories, skills, affects, quest progress, clan membership, mail, boards
- World data in JSON files: areas, rooms, mobiles, objects, resets, shops, MUDprogs
- When world data is saved: OLC changes, area modifications, shutdown

#### 13.2 Player Repository (`src/persistence/PlayerRepository.ts`)
- `save(player: Player)`: serialise player state to database
- `load(name: string)`: deserialise player from database
- `exists(name: string)`: check if player file exists
- `delete(name: string)`: remove player data
- `listAll()`: list all player names (for admin)
- Save triggers from ANALYSIS.md: player death, player quit, auto-save (every N ticks), hotboot
- What is saved: all `pc_data` fields, inventory (recursive for containers), equipped items, active affects, skill proficiencies, quest state, aliases, ignored players, tell history
- Transaction handling: save player + inventory + affects in a single transaction

#### 13.3 World Repository (`src/persistence/WorldRepository.ts`)
- `loadArea(filename: string)`: read JSON area file, parse into entities
- `saveArea(area: Area)`: serialise area to JSON file
- `loadAllAreas()`: boot sequence — load all areas from `data/world/`
- Area file format: JSON structure matching the schema defined in §22
- Cross-area reference resolution: after all areas loaded, resolve exit vnums to Room references

#### 13.4 Auto-Save System
- Player auto-save: every N ticks (configurable), staggered across players to avoid I/O spikes
- Area auto-save: only when modified flag is set
- Crash recovery: what happens if the server crashes between saves

#### 13.5 Entity-Relationship Diagram
- Mermaid ER diagram showing the PostgreSQL schema relationships:
  - Account → Characters (one-to-many)
  - Character → Inventory Items (one-to-many)
  - Character → Equipped Items (one-to-many)
  - Character → Skills (one-to-many)
  - Character → Affects (one-to-many)
  - Character → Quest Progress (one-to-many)
  - Character → Aliases (one-to-many)
  - Clan → Members (one-to-many)
  - Board → Posts (one-to-many)

---

### §21 — Prisma Schema

Provide the complete `prisma/schema.prisma` file.

#### 21.1 Schema Design Principles
- One model per major entity that needs persistence
- Use `@id` with auto-increment for primary keys
- Use `@unique` for natural keys (player name, account email)
- Use JSON fields for complex nested data (inventory tree, affect list) where relational modelling would be over-complex
- Use enums for fixed value sets (race, class, sex)

#### 21.2 Complete Schema
Provide the full Prisma schema with models for:
- `Account` — email, password hash, created date, last login, ban status
- `Character` — all persistent player fields from §4 (name, race, class, level, stats, HP/mana/move, experience, alignment, gold, position, room vnum, title, description, prompt format, conditions, etc.)
- `CharacterInventory` — JSON field containing the full inventory tree (items, containers with contents, equipped items)
- `CharacterSkill` — skill name, proficiency percentage, per character
- `CharacterAffect` — active affects that persist across sessions (type, duration, location, modifier, bitvector)
- `CharacterAlias` — alias name, alias expansion, per character
- `CharacterQuest` — quest type, target, progress, timer, per character
- `Clan` — name, leader, members, motto, description, PKills, PDeaths, funds
- `ClanMember` — character reference, rank, join date
- `Board` — board name, read trust, write trust, location vnum
- `BoardPost` — board reference, author, subject, body, date
- `Mail` — sender, recipient, subject, body, date, read status
- `Ban` — banned name/site, ban type, ban date, banner name
- `HelpEntry` — keyword, trust level, text (if help is DB-stored)

#### 21.3 Indexes and Constraints
- Unique constraints: character name, account email, clan name
- Indexes: character name (for login lookup), account email, board posts by date
- Cascade deletes: deleting a character cascades to inventory, skills, affects, aliases, quests

#### 21.4 Migration Strategy
- Prisma migrate for schema evolution
- Seed script for initial data (default boards, help entries)

**Legacy files replaced:** `save.c`, `db.c` (player loading/saving), `boards.c` (board persistence), `clans.c` (clan persistence)

### Quality Criteria for This Sub-Phase
- [ ] Dual persistence strategy clearly justified
- [ ] Player save/load covers all `pc_data` fields
- [ ] Save triggers match ANALYSIS.md
- [ ] Complete Prisma schema with all models, fields, types, and relations
- [ ] ER diagram renders correctly
- [ ] Indexes and constraints specified
- [ ] Auto-save and crash recovery addressed
