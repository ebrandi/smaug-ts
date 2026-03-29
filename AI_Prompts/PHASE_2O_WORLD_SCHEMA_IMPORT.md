# Phase 2O — World Data Schema + Legacy Import Utility

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

**Sub-phase:** 2O
**Title:** World Data Schema + Legacy Import Utility
**Sections covered:** §22–§23

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

### §22 — World Data Schema (JSON)

Define the complete JSON schema for world data files stored in `data/world/`.

#### 22.1 Area File Schema
Each area is stored as a single JSON file. Define the complete schema:

```typescript
interface AreaFile {
  metadata: AreaMetadata;
  rooms: RoomData[];
  mobiles: MobilePrototypeData[];
  objects: ObjectPrototypeData[];
  resets: ResetData[];
  shops: ShopData[];
  repairShops: RepairShopData[];
  mudprogs: MudProgData[];
  specials: SpecialData[];
}
```

For each sub-schema, define every field with types and descriptions.

#### 22.2 Room Data Schema
- vnum, name, description, sector type, room flags, light level
- Exits: array of exit definitions (direction, destination vnum, description, keywords, door flags, key vnum)
- Extra descriptions: array of keyword → description pairs
- Room resets: inline reset definitions

#### 22.3 Mobile Prototype Schema
- vnum, name, short description, long description, full description
- Level, alignment, race, class, sex, position, default position
- Hit dice, damage dice, gold, experience
- Act flags, affected_by flags, body parts, resistant/immune/susceptible
- Attacks, defenses, speaks, speaking language
- Stats: STR, INT, WIS, DEX, CON, CHA, LCK
- Complexity level: Simple (S), Complex (C), Very Complex (V)
- Stances (if applicable)

#### 22.4 Object Prototype Schema
- vnum, name, short description, long description, action description
- Item type, extra flags, wear flags, magic flags
- Weight, cost, rent, level, layers
- Values 0–5 (interpretation depends on item type — provide a table mapping item type to value meanings)
- Extra descriptions
- Affects: array of affect definitions (location, modifier)

#### 22.5 Reset Data Schema
- Reset type (M, O, P, G, E, D, R)
- Parameters for each type (document what each parameter means for each reset type)
- Nesting: how G/E resets relate to the preceding M reset

#### 22.6 Shop and Repair Shop Schema
- Keeper vnum, buy/sell percentages, hours, item types traded
- Repair shop: keeper vnum, repair types, profit percentage

#### 22.7 MUDprog Schema
- Trigger type, trigger argument, script body
- Attached to: mobile vnum, object vnum, or room vnum

#### 22.8 Schema Validation
- JSON Schema (draft 2020-12) definitions for validation
- How schemas are validated at load time
- Error reporting for invalid area files

---

### §23 — Legacy Import Utility

Design the tools that convert legacy `.are` files and player files to the new format.

#### 23.1 ARE File Parser (`src/migration/AreFileParser.ts`)
- Parse the legacy `.are` text format into the JSON schema defined in §22
- Section parsing: `#AREA`, `#MOBILES`, `#OBJECTS`, `#ROOMS`, `#RESETS`, `#SHOPS`, `#REPAIRSHOPS`, `#SPECIALS`, `#MUDPROGS`
- Mobile complexity handling: S (simple), C (complex), V (very complex) — different field counts
- Spell slot number resolution: convert legacy spell slot numbers to spell names
- String handling: tilde-terminated strings, `~` as delimiter
- Vnum parsing: `#vnum` markers
- Bitvector parsing: convert legacy integer bitvectors to the new format
- Error handling: report parsing errors with file name, line number, and context

#### 23.2 Player File Parser (`src/migration/PlayerFileParser.ts`)
- Parse legacy `.plr` text files into database records
- Key-value format: `Key Value` pairs, one per line
- Password migration: legacy SHA256 unsalted → bcrypt rehash (require password reset on first login)
- Inventory migration: nested object format → JSON inventory tree
- Affect migration: legacy affect format → new affect records
- Skill migration: skill slot numbers → skill names
- Field mapping: document every legacy player file field and its new equivalent

#### 23.3 Migration Runner (`src/migration/MigrationRunner.ts`)
- CLI tool: `npx ts-node tools/migrate.ts --areas <path> --players <path>`
- Area migration: scan directory for `.are` files, parse each, write JSON to `data/world/`
- Player migration: scan directory for `.plr` files, parse each, insert into PostgreSQL
- Progress reporting: file count, success/failure count, error log
- Dry-run mode: parse and validate without writing
- Idempotent: re-running migration overwrites existing data safely

#### 23.4 Validation and Verification
- Post-migration validation: load all converted areas, verify vnum cross-references resolve
- Player validation: verify all migrated players can be loaded by the game
- Comparison tool: load an area in both legacy and new format, compare entity counts and key fields

**Legacy files replaced:** No direct equivalent — this is a new tool. Replaces the need to manually convert data.

### Quality Criteria for This Sub-Phase
- [ ] Complete JSON schema for area files with every field defined
- [ ] Item type → value field interpretation table provided
- [ ] Reset type parameter documentation complete
- [ ] ARE file parser handles all section types
- [ ] Mobile complexity levels (S, C, V) handled
- [ ] Player file parser maps every field
- [ ] Password migration strategy specified
- [ ] Migration runner CLI interface defined
- [ ] Validation and verification steps documented
