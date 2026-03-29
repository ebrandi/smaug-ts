# Phase 2A — Executive Summary, Technology Stack & Folder Structure

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

**Sub-phase:** 2A
**Title:** Executive Summary, Technology Stack & Folder Structure
**Sections covered:** §1

### Output Instructions

You are creating the **first section** of `ARCHITECTURE.md`. Create the file with the content specified below. All subsequent sub-phases will append to this file.

**File creation rule:** Create `ARCHITECTURE.md` and write your output to it. The file must begin with:

```
# ARCHITECTURE.md — SMAUG 2.0 → Node.js/TypeScript Port
```

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

### §1 — Executive Summary & Project Foundation

Write the opening section of ARCHITECTURE.md containing:

#### 1.1 Executive Summary
- One-paragraph project overview: what SMAUG 2.0 is, why we are porting it, and the target platform
- Key statistics from STRUCTURE.md: total C source lines, number of files, number of subsystems
- The guiding principle: **feature parity first, modernisation second**

#### 1.2 Design Philosophy
- Event-driven architecture with central EventBus
- Type-safe entity hierarchy replacing C structs and void pointers
- Dual persistence: PostgreSQL (Prisma) for player data, JSON flat files for world data
- WebSocket-first networking (replacing raw TCP/Telnet)
- Legacy command compatibility (same names, same abbreviations, same behaviour)

#### 1.3 Technology Stack
- Full table of technologies with version requirements and justification for each choice
- Explain why each technology was chosen over alternatives (e.g., why `ws` over `socket.io`, why Prisma over TypeORM, why Vitest over Jest)

#### 1.4 Folder Structure
- The canonical folder structure (as shown in the preamble) with a description of what each directory contains
- Explain the separation of concerns: why `entities/` is separate from `commands/`, why `persistence/` is separate from `entities/`, etc.

#### 1.5 Component Hierarchy Diagram
- Mermaid diagram showing the high-level component relationships
- Must show: Core Engine at the centre, with Network, Entities, Commands, Combat, Magic, Skills, World, Communication, Persistence, Admin as connected subsystems
- Show the direction of dependencies (which components depend on which)

#### 1.6 Section Index
- Numbered list of all 26 sections that will appear in the final document (§1 through §26)
- Brief one-line description of each section
- This serves as a table of contents for the complete ARCHITECTURE.md

### Quality Criteria for This Sub-Phase
- [ ] Executive summary references specific statistics from STRUCTURE.md
- [ ] Every technology choice has a justification
- [ ] Folder structure matches the canonical layout
- [ ] Component hierarchy Mermaid diagram renders correctly
- [ ] Section index lists all 26 sections with accurate descriptions
