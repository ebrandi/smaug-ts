# Phase 2C — Network Layer — WebSocket Server, Connection Manager, Protocols

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

**Sub-phase:** 2C
**Title:** Network Layer — WebSocket Server, Connection Manager, Protocols
**Sections covered:** §3

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

### §3 — Network Layer

Design the network infrastructure that replaces the legacy TCP/Telnet system.

#### 3.1 WebSocket Server (`src/network/WebSocketServer.ts`)
- Server initialisation: port binding, TLS configuration, connection acceptance
- Why WebSocket over raw TCP: browser compatibility, built-in framing, no Telnet negotiation complexity
- Connection lifecycle: accept → authenticate → play → disconnect
- Backpressure handling: what happens when a client stops reading
- Maximum connections limit and rejection behaviour
- Integration with the GameLoop (how network I/O fits into the game tick)

#### 3.2 Connection Manager (`src/network/ConnectionManager.ts`)
- Tracks all active connections (Map of connection ID → Descriptor)
- Connection states: `NEW`, `GET_NAME`, `GET_PASSWORD`, `CONFIRM_NAME`, `GET_NEW_PASSWORD`, `CONFIRM_PASSWORD`, `CHOOSE_RACE`, `CHOOSE_CLASS`, `ROLL_STATS`, `MOTD`, `PLAYING`, `EDITING`, `PAGING`
- **Legacy reference**: Map every `CON_*` state from `mud.h` to the new enum
- State machine transitions: document every valid transition and what triggers it
- Idle timeout handling
- Linkdead detection and reconnection

#### 3.3 Descriptor (`src/network/Descriptor.ts`)
- The `Descriptor` class: the per-connection object that replaces `descriptor_data` from DATAMODEL.md
- Full interface definition with every field from the legacy struct mapped to TypeScript
- Output buffer management: how text is queued and flushed
- Input buffer management: how commands are received and queued
- Pager integration: how multi-page output is handled (See §12 Communication System)
- Snoop chain: how admin snooping works
- Character association: how a Descriptor links to a Player entity

#### 3.4 Protocol Support
- **Telnet option negotiation**: NAWS (window size), TTYPE (terminal type), EOR (end of record)
- **MSDP** (MUD Server Data Protocol): variable reporting for MUD clients
- **MSSP** (MUD Server Status Protocol): server information for MUD crawlers
- **MCCP** (MUD Client Compression Protocol): zlib compression — document whether to support or deprecate
- **MSP** (MUD Sound Protocol): sound triggers
- **MXP** (MUD eXtension Protocol): clickable links, inline images
- **ATCP/GMCP**: JSON-based client communication
- For each protocol: describe the negotiation handshake, the data format, and the TypeScript implementation approach
- **Decision**: Which protocols are essential for the port vs. which can be deferred?

#### 3.5 Connection State Diagram
- Mermaid state diagram showing all connection states and transitions
- Must include: initial connection, name entry, password, character creation flow, MOTD, playing state, editing state, paging state, disconnection

#### 3.6 Network Data Flow Diagram
- Mermaid sequence diagram showing:
  1. Client sends WebSocket message
  2. Server receives and parses
  3. Command queued in Descriptor input buffer
  4. GameLoop processes command
  5. Output queued in Descriptor output buffer
  6. Network layer flushes output to client

**Legacy files replaced:** `comm.c`, `mccp.c`, `msp.c`, `mxp.c`, `mud.h` (descriptor/connection types)

### Quality Criteria for This Sub-Phase
- [ ] Every `CON_*` state from the legacy code is mapped
- [ ] Every field of `descriptor_data` is mapped to the Descriptor class
- [ ] All 7 protocols are addressed (support, defer, or deprecate with justification)
- [ ] Connection state diagram covers all states and transitions
- [ ] Data flow diagram shows the complete request/response cycle
- [ ] Backpressure and idle timeout strategies are specified
