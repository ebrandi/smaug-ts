# Phase 2N — Administration + Admin Dashboard + Browser Play UI

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

**Sub-phase:** 2N
**Title:** Administration + Admin Dashboard + Browser Play UI
**Sections covered:** §18–§20

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

### §18 — Administration System

Design the in-game administration and moderation tools.

#### 18.1 Trust Level System (`src/admin/TrustLevels.ts`)
- Trust levels from ANALYSIS.md/COMMANDS.md:
  - `LEVEL_AVATAR` (50) — mortal cap
  - `LEVEL_IMMORTAL` (51) — basic immortal
  - `LEVEL_DEMI` (52), `LEVEL_SAVIOR` (53), `LEVEL_CREATOR` (54), `LEVEL_SAINT` (55)
  - `LEVEL_ANGEL` (56), `LEVEL_DEITY` (57), `LEVEL_GOD` (58), `LEVEL_GREATER` (59)
  - `LEVEL_ASCENDANT` (60), `LEVEL_SUB_IMPLEM` (64), `LEVEL_IMPLEMENTOR` (65), `LEVEL_SUPREME` (MAX_LEVEL)
- How trust level gates command access (See §5 Command System)
- Trust level assignment: `advance` and `trust` commands

#### 18.2 Ban System (`src/admin/BanSystem.ts`)
- Ban types: site ban (IP/hostname pattern), player name ban, class ban, race ban
- Ban storage: PostgreSQL (See §21 Prisma Schema)
- Ban checking: on connection (site ban), on character creation (name/class/race ban)
- Ban commands: `ban`, `unban`, `permban`, `ipcompare`
- Ban duration: permanent vs. temporary

#### 18.3 Wizard Commands
- Categorise all admin commands from COMMANDS.md by trust level:
  - **Immortal (51+)**: `goto`, `transfer`, `at`, `bamfin`, `bamfout`, `holylight`, `invis` (immortal invisibility)
  - **Demi (52+)**: `echo`, `recho`, `pecho`, `peace`, `restore`
  - **Creator (54+)**: `mfind`, `ofind`, `rfind`, `mstat`, `ostat`, `rstat`, `redit`, `medit`, `oedit`
  - **God (58+)**: `slay`, `purge`, `advance`, `trust`, `force`, `snoop`, `switch`, `return`
  - **Implementor (65+)**: `shutdown`, `reboot`, `hotboot`, `copyover`, `set`, `mset`, `oset`, `rset`
- For each command: brief description, trust level, key parameters

#### 18.4 Logging and Monitoring
- Command logging: LOG_NORMAL, LOG_ALWAYS, LOG_NEVER, LOG_BUILD, LOG_HIGH, LOG_COMM
- Watch system: monitor specific players' commands
- Snoop system: see everything a player sees
- Wiznet: immortal notification channel for game events (deaths, logins, bugs, etc.)

---

### §19 — Admin Dashboard

Design the web-based administration interface.

#### 19.1 Dashboard Architecture
- Express.js REST API (`src/dashboard/`)
- React 18 + Vite frontend
- JWT authentication: admin accounts with role-based access
- WebSocket connection for real-time updates (player count, recent events)

#### 19.2 REST API Endpoints
Design the complete API:
- **Authentication**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Players**: `GET /api/players` (list), `GET /api/players/:name` (detail), `PUT /api/players/:name` (edit), `DELETE /api/players/:name`, `POST /api/players/:name/kick`, `POST /api/players/:name/ban`
- **World**: `GET /api/areas` (list), `GET /api/areas/:filename` (detail), `GET /api/rooms/:vnum`, `GET /api/mobs/:vnum`, `GET /api/objects/:vnum`
- **Server**: `GET /api/server/status` (uptime, player count, memory), `POST /api/server/shutdown`, `POST /api/server/hotboot`, `GET /api/server/logs`
- **Bans**: `GET /api/bans`, `POST /api/bans`, `DELETE /api/bans/:id`
- **Config**: `GET /api/config`, `PUT /api/config`

#### 19.3 Admin Router (`src/dashboard/AdminRouter.ts`)
- Express router with JWT middleware
- Role-based access control: map dashboard roles to MUD trust levels
- Rate limiting on sensitive endpoints
- Input validation and sanitisation

#### 19.4 Dashboard React Components
- Login page
- Dashboard home: server status, player count graph, recent events
- Player management: searchable player list, player detail/edit form
- World browser: area list → room list → room detail with exits visualised
- Ban management: ban list, add/remove bans
- Log viewer: filterable server logs
- Server controls: shutdown, hotboot, configuration

#### 19.5 API Architecture Diagram
- Mermaid diagram showing: Browser → REST API → Express Router → Game Engine → Database

---

### §20 — Browser Play UI

Design the browser-based MUD client.

#### 20.1 Browser Client Architecture
- React 18 + xterm.js for terminal emulation
- WebSocket connection to the game server
- ANSI color rendering via xterm.js
- Input handling: command line with history (up/down arrows)
- Mobile-responsive layout

#### 20.2 Terminal Component
- xterm.js configuration: font, colors, scrollback buffer size
- ANSI escape sequence handling: how the server's ANSI codes render in the browser
- Copy/paste support
- Screen reader accessibility considerations

#### 20.3 UI Enhancements (beyond basic terminal)
- Optional side panels: minimap, character stats, inventory
- Clickable elements: MXP-style clickable links for objects, exits, NPCs
- Command shortcuts: configurable hotkeys
- Sound support: MSP sound triggers played via Web Audio API
- Connection status indicator
- Auto-reconnect on disconnect

#### 20.4 Client-Server Protocol
- WebSocket message format: JSON wrapper around raw MUD text
- Client-to-server: command strings
- Server-to-client: ANSI-formatted text, GMCP data (for side panels), MSDP updates
- Compression: consider WebSocket per-message deflate

**Legacy files replaced:** No direct legacy equivalent — this is a new addition. Replaces the need for external MUD clients (MUSHclient, Mudlet, etc.)

### Quality Criteria for This Sub-Phase
- [ ] All trust levels listed with exact level numbers
- [ ] All admin commands categorised by trust level
- [ ] Ban system fully specified (types, storage, checking)
- [ ] Complete REST API endpoint list with methods and paths
- [ ] JWT authentication flow described
- [ ] Dashboard components listed with functionality
- [ ] Browser client architecture specified
- [ ] API architecture diagram renders correctly
