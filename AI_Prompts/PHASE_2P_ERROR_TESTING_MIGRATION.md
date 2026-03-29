# Phase 2P — Error Handling, Testing Strategy, Migration Path

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

**Sub-phase:** 2P
**Title:** Error Handling, Testing Strategy, Migration Path
**Sections covered:** §24–§26 + Appendix stub

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

### §24 — Error Handling and Logging

#### 24.1 Error Handling Strategy
- Error categories: fatal (server crash), recoverable (command failure), warning (degraded state)
- Fatal errors: log, save all players, graceful shutdown
- Recoverable errors: log, notify admin via wiznet, continue operation
- Command errors: catch in command dispatch, send error message to player, log if unusual
- Unhandled promise rejections: global handler, log, do not crash

#### 24.2 Logger (`src/utils/Logger.ts`)
- Winston-based logging with multiple transports:
  - Console: coloured output for development
  - File: rotating log files (daily rotation, configurable retention)
  - Syslog: optional syslog transport for production
- Log levels: ERROR, WARN, INFO, DEBUG, TRACE
- Structured logging: JSON format with timestamp, level, module, message, metadata
- Game-specific log categories: COMMAND, COMBAT, MAGIC, MOVEMENT, COMMUNICATION, ADMIN, OLC, BUG, TYPO
- Performance logging: command execution time, tick duration, database query time
- **Legacy reference**: `bug()`, `log_string()`, `log_printf()` from the C codebase

#### 24.3 Bug and Typo Reporting
- `bug` command: players report bugs, logged to file and database
- `typo` command: players report typos, logged to file and database
- Admin review: dashboard interface for reviewing bug/typo reports (See §19)

---

### §25 — Testing Strategy

#### 25.1 Testing Framework
- Vitest for all test types
- Test directory structure: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- Coverage target: 80%+ for core systems

#### 25.2 Unit Tests
- **Core Engine**: EventBus event delivery, TickEngine pulse timing, GameLoop lifecycle
- **Entities**: Character stat calculation, Player save/load round-trip, Mobile prototype instantiation, GameObject value interpretation by item type
- **Commands**: CommandRegistry lookup and abbreviation matching, dispatch pipeline (trust check, position check, lag check)
- **Combat**: Hit resolution formula, damage calculation, defence checks (parry, dodge, shield block)
- **Magic**: Casting pipeline validation steps, saving throw calculation, mana cost calculation
- **Skills**: Proficiency check formula, practice session gains
- **Affects**: Apply/remove affect stat modification, duration countdown, stacking rules
- **World**: Vnum registry lookup, reset execution, sector movement costs
- **Communication**: Color code parsing, act() token replacement, language garbling
- **Economy**: Currency conversion, shop price calculation
- **Utilities**: Dice roller distribution, BitVector operations, string utilities

#### 25.3 Integration Tests
- **Network → Command**: WebSocket message → command dispatch → response
- **Combat round**: Full combat round with hit resolution, damage, and death
- **Spell casting**: Full casting pipeline from command to affect application
- **Movement**: Room-to-room movement with exit validation, door interaction, follower movement
- **Persistence**: Player save → shutdown → reload → verify all data intact
- **Area loading**: Load JSON area file → verify all entities created with correct properties
- **Reset engine**: Area reset → verify mobiles and objects spawned correctly

#### 25.4 End-to-End Tests
- **Login flow**: Connect → create character → enter game → verify in room
- **Combat scenario**: Two characters fight → one dies → verify corpse, experience, respawn
- **OLC workflow**: Create area → create room → create mobile → verify in game
- **Migration**: Import legacy .are file → verify converted data matches original

#### 25.5 Test Utilities
- `TestWorld`: factory that creates a minimal game world for testing (one area, a few rooms, test mobiles/objects)
- `TestPlayer`: factory that creates a test player with configurable stats
- `MockDescriptor`: mock network descriptor for testing without real WebSocket connections
- `TestEventBus`: event bus that records all emitted events for assertion

---

### §26 — Migration Path

#### 26.1 Phased Implementation Approach
Define the implementation phases with dependencies and acceptance criteria:

**Phase A — Foundation** (corresponds to scaffolding Phase 1):
- Project setup, core infrastructure, network layer, utility modules
- Acceptance: server starts, accepts WebSocket connections, echoes input

**Phase B — World & Movement** (corresponds to implementation Phase 3A–3B):
- Entity system, world loading, room display, basic movement
- Acceptance: player can log in, see room descriptions, move between rooms

**Phase C — Combat & Magic** (corresponds to implementation Phase 3B–3C):
- Combat system, spell system, skill system, affect system
- Acceptance: player can fight mobiles, cast spells, use skills, see affects

**Phase D — Economy & Social** (corresponds to implementation Phase 3D–3E):
- Inventory, shops, clans, boards, communication channels
- Acceptance: player can buy/sell items, join clans, post on boards, use channels

**Phase E — Building & Admin** (corresponds to implementation Phase 3F):
- OLC system, MUDprogs, admin commands, dashboard, browser UI
- Acceptance: builders can create content in-game, admins can manage via dashboard

**Phase F — Polish & Parity** (corresponds to Phases 4–6):
- Parity verification, documentation, deployment scripts
- Acceptance: all legacy commands work, all tests pass, deployment automated

#### 26.2 Dependency Graph
- Mermaid diagram showing phase dependencies (which phases must complete before others can start)

#### 26.3 Risk Mitigation
- Identify the highest-risk components and mitigation strategies:
  - Combat formula accuracy: extensive unit testing against legacy output
  - MUDprog compatibility: test with real legacy MUDprog scripts
  - Performance: load testing with simulated players
  - Data migration: validate with real legacy area and player files

#### 26.4 Appendix Stub
Add a placeholder for the appendices that will be completed in Phase 2Q:
```
## Appendices

> **Note:** Appendices A–D are generated in the final quality pass (Phase 2Q).
>
> - Appendix A: Legacy File Mapping
> - Appendix B: Utility Classes
> - Appendix C: Configuration Reference
> - Appendix D: Glossary
```

**Legacy files replaced:** N/A — this section is project management guidance.

### Quality Criteria for This Sub-Phase
- [ ] Error handling covers fatal, recoverable, and command errors
- [ ] Logger configuration specified with all transports and categories
- [ ] Unit tests cover all major subsystems
- [ ] Integration tests cover key cross-system flows
- [ ] E2E tests cover critical user journeys
- [ ] Test utilities (TestWorld, TestPlayer, MockDescriptor) specified
- [ ] Migration phases defined with clear acceptance criteria
- [ ] Dependency graph diagram renders correctly
- [ ] Risk mitigation strategies identified
- [ ] Appendix stub present
