# Phase 2I — World Management + Movement System

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

**Sub-phase:** 2I
**Title:** World Management + Movement System
**Sections covered:** §10–§11

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

### §10 — World Management

Design the systems that load, store, and manage the game world.

#### 10.1 Vnum Registry (`src/world/VnumRegistry.ts`)
- Three parallel registries: mob prototypes, object prototypes, room instances
- Hash table implementation matching legacy `mob_index_hash`, `obj_index_hash`, `room_index_hash`
- Vnum allocation for OLC: finding the next available vnum in a range
- Lookup methods: `getMobPrototype(vnum)`, `getObjPrototype(vnum)`, `getRoom(vnum)`
- Instance creation: `createMobile(vnum)` → creates Mobile from MobilePrototype, `createObject(vnum)` → creates GameObject from ObjectPrototype

#### 10.2 Area Manager (`src/world/AreaManager.ts`)
- Area loading: read JSON area files from `data/world/`, parse into Area + Room + MobilePrototype + ObjectPrototype entities
- Area list management: sorted area list, area lookup by filename/name/vnum range
- Area status tracking: age counter, player count, modified flag
- Area saving: serialise modified areas back to JSON (for OLC changes)
- Boot sequence: load all areas in order, resolve cross-area references (exits pointing to rooms in other areas)

#### 10.3 Reset Engine (`src/world/ResetEngine.ts`)
- Reset types from ANALYSIS.md:
  - `M` — spawn mobile at room (if count < max)
  - `O` — spawn object at room (if not already present)
  - `P` — put object inside container
  - `G` — give object to last spawned mobile
  - `E` — equip object on last spawned mobile
  - `D` — set door state (open/closed/locked)
  - `R` — randomise exits in room
- Reset timing: areas reset every `PULSE_AREA` (60 seconds) when age exceeds reset interval AND no players present (or force reset)
- Reset execution order: process resets sequentially, track "last mobile" for G/E resets
- **Legacy reference**: Document the exact reset logic from ANALYSIS.md

#### 10.4 Room Manager (`src/world/RoomManager.ts`)
- Room lookup by vnum
- Room contents management: characters entering/leaving, objects placed/removed
- Light level tracking: how room light is calculated (room flags + objects with LIGHT type + spells)
- Virtual rooms: dynamically created rooms (e.g., inside vehicles, pocket dimensions)

#### 10.5 Time and Weather System
- Game time: accelerated clock (1 real hour = 1 game day, or similar ratio from legacy)
- Time of day affects: darkness, NPC schedules, shop hours
- Weather system: temperature, precipitation, wind — changes every PULSE_TICK
- Weather affects by area/region
- **Legacy reference**: `time_update()` and `weather_update()` from ANALYSIS.md

---

### §11 — Movement System

Design the movement system that handles all character locomotion.

#### 11.1 Movement Handler (`src/movement/MovementHandler.ts`)
- Basic movement: process direction commands (north, south, east, west, up, down)
- Movement cost: base cost by sector type + encumbrance modifier + mount modifier
  - Sector costs from ANALYSIS.md: INSIDE(1), CITY(1), FIELD(2), FOREST(3), HILLS(4), MOUNTAIN(6), WATER_SWIM(4), WATER_NOSWIM(blocked), AIR(1), DESERT(5), LAVA(6), etc.
- Movement validation sequence:
  1. Check exit exists in direction
  2. Check exit is not closed door
  3. Check sector type passability (water requires boat/fly/swim, air requires fly)
  4. Check room flags (PRIVATE, SOLITARY, TUNNEL — occupancy limits)
  5. Check movement points sufficient
  6. Deduct movement points
  7. Move character: remove from old room, add to new room
  8. Trigger: room messages (leaves/arrives), look at new room, MUDprog triggers

#### 11.2 Door Manager (`src/movement/DoorManager.ts`)
- Door states: open, closed, locked, hidden, pickproof, bashproof
- Door commands: open, close, lock, unlock, pick, bash
- Key system: doors reference key object vnum
- Two-way doors: opening a door from one side opens it from the other
- Hidden doors: not visible until searched/detected

#### 11.3 Mount Manager (`src/movement/MountManager.ts`)
- Mount/dismount mechanics
- Mounted movement: reduced movement cost, different messages
- Mount stamina: mounts have their own movement points
- Flying mounts: access to air sector rooms
- **Legacy reference**: Mount system from ANALYSIS.md

#### 11.4 Pathfinder (`src/movement/Pathfinder.ts`)
- BFS pathfinding: find shortest path between two rooms
- Used by: `hunt` skill, `track` skill, `find` command, NPC AI (flee, wander home)
- Path cost calculation: factor in sector types, closed doors
- Maximum search depth to prevent infinite loops
- **Legacy reference**: BFS implementation from ANALYSIS.md

#### 11.5 Special Movement
- `enter`/`leave` commands: portals, buildings, vehicles
- Teleportation rooms: rooms with TELEPORT flag that randomly move occupants
- Falling: rooms with no floor exit and no fly affect
- Swimming: water rooms requiring swim skill or boat
- Overland map: coordinate-based movement system (if implementing the overland module)
- Follower movement: followers automatically follow their leader

#### 11.6 Movement Events
- Events emitted: `movement.leave(ch, fromRoom, direction)`, `movement.enter(ch, toRoom, direction)`, `movement.blocked(ch, direction, reason)`
- Events consumed: MUDprog triggers on room enter/leave

**Legacy files replaced:** `db.c` (world loading), `reset.c` (reset engine), `act_move.c` (movement), `handler.c` (room management), `update.c` (time/weather)

### Quality Criteria for This Sub-Phase
- [ ] All reset types (M, O, P, G, E, D, R) documented with exact behaviour
- [ ] Area loading sequence fully specified
- [ ] All sector types listed with movement costs matching ANALYSIS.md
- [ ] Movement validation sequence complete (all checks)
- [ ] Door mechanics fully specified
- [ ] Mount system documented
- [ ] BFS pathfinder algorithm described
- [ ] Time and weather system specified
