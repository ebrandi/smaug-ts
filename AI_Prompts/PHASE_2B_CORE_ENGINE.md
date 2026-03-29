# Phase 2B — Core Engine — Game Loop, Tick Engine, Event Bus

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

**Sub-phase:** 2B
**Title:** Core Engine — Game Loop, Tick Engine, Event Bus
**Sections covered:** §2

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

### §2 — Core Engine

Design the heartbeat of the MUD — the systems that drive all time-based updates.

#### 2.1 Game Loop (`src/core/GameLoop.ts`)
- Main loop architecture: how it starts, runs, and shuts down
- Integration with Node.js event loop (no busy-wait — use `setInterval` or `setTimeout`)
- Startup sequence: what initialises in what order
- Shutdown sequence: graceful shutdown with player save, area save, connection close
- Hotboot support: serialise game state, exec new process, deserialise
- **Legacy reference**: `update_handler()` in `update.c` — document how each legacy update call maps to the new system

#### 2.2 Tick Engine (`src/core/TickEngine.ts`)
- Pulse system: define all pulse intervals matching the legacy values from ANALYSIS.md
  - `PULSE_PER_SECOND` (4 pulses)
  - `PULSE_VIOLENCE` (12 pulses = 3 seconds)
  - `PULSE_MOBILE` (16 pulses = 4 seconds)
  - `PULSE_TICK` (280 pulses = 70 seconds)
  - `PULSE_AREA` (240 pulses = 60 seconds)
  - `PULSE_AUCTION` (40 pulses = 10 seconds)
- TypeScript interface for `TickEngine` with methods: `start()`, `stop()`, `registerPulse()`, `onPulse()`
- How tick callbacks are registered and invoked
- Jitter/stagger strategy to prevent all updates firing on the same frame

#### 2.3 Event Bus (`src/core/EventBus.ts`)
- Typed event system: define the `GameEvent` interface and the `EventBus` class
- Event catalogue: list **every** event type that will be used across the system, grouped by subsystem:
  - Core events: `server.start`, `server.shutdown`, `tick.*`
  - Connection events: `connection.new`, `connection.close`, `connection.authenticated`
  - Player events: `player.login`, `player.logout`, `player.save`, `player.death`, `player.levelUp`
  - Combat events: `combat.start`, `combat.round`, `combat.hit`, `combat.miss`, `combat.death`, `combat.end`
  - Movement events: `movement.enter`, `movement.leave`, `movement.blocked`
  - Communication events: `channel.message`, `tell.send`, `tell.receive`
  - World events: `area.reset`, `room.update`, `mobile.spawn`, `object.spawn`
  - Magic events: `spell.cast`, `spell.success`, `spell.fail`, `affect.apply`, `affect.expire`
  - Admin events: `admin.command`, `admin.ban`, `admin.shutdown`
- Listener registration with typed payloads
- Wildcard listeners (e.g., `combat.*`)
- Error handling in listeners (one failing listener must not crash others)

#### 2.4 State Management Flow Diagram
- Mermaid sequence diagram showing a single game tick:
  1. TickEngine fires pulse
  2. Relevant handlers execute (combat update, mobile update, weather update, etc.)
  3. Events emitted
  4. Listeners process events
  5. Output queued to descriptors
  6. Network layer flushes output

**Legacy files replaced:** `update.c`, portions of `mud.h` (pulse constants)

### Quality Criteria for This Sub-Phase
- [ ] All pulse constants match legacy values from ANALYSIS.md
- [ ] Event catalogue is comprehensive (covers all subsystems)
- [ ] GameLoop startup/shutdown sequence is fully specified
- [ ] Hotboot mechanism is described
- [ ] State management flow diagram renders correctly
- [ ] Every event type has a typed payload interface
