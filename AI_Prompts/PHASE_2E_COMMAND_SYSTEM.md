# Phase 2E — Command System — Registry, Dispatch, Socials

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

**Sub-phase:** 2E
**Title:** Command System — Registry, Dispatch, Socials
**Sections covered:** §5

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

### §5 — Command System

Design the command processing pipeline that replaces the legacy hash-table dispatch.

#### 5.1 Command Registry (`src/commands/CommandRegistry.ts`)
- How commands are registered: decorator-based or explicit registration
- Command definition interface:
  ```typescript
  interface CommandDefinition {
    name: string;
    handler: (ch: Character, argument: string) => void | Promise<void>;
    position: Position;      // minimum position to use command
    trust: TrustLevel;       // minimum trust level
    log: LogLevel;           // logging behaviour
    flags: bigint;           // CMD_FLAG_* bitvector
    category: CommandCategory;
  }
  ```
- Hash table indexed by first character (matching legacy `cmd_table` from COMMANDS.md)
- Abbreviation matching: `str_prefix()` equivalent — "n" matches "north", "ki" matches "kill"
- Disambiguation: what happens when multiple commands match (e.g., "s" could be "south" or "say")

#### 5.2 Command Dispatch Pipeline
Document the complete flow from raw input to command execution:
1. **Input parsing**: Split input into command word + argument string
2. **Alias expansion**: Check player aliases first (See §4 Player)
3. **Command lookup**: Hash table lookup + prefix matching
4. **Trust check**: Verify `ch.trust >= command.trust`
5. **Position check**: Verify `ch.position >= command.position`
6. **Lag check**: If `ch.wait > 0`, queue the command (command lag from combat/skills)
7. **Substate check**: If `ch.substate !== NONE`, route to substate handler (multi-step commands like OLC editing)
8. **Flag checks**: CMD_FLAG_POSSESS (allow while possessed), CMD_FLAG_POLYMORPHED (allow while polymorphed), etc.
9. **Logging**: Based on command log level — LOG_NORMAL, LOG_ALWAYS, LOG_NEVER, LOG_BUILD, LOG_HIGH, LOG_COMM
10. **Execution**: Call the handler
11. **Social fallback**: If no command matches, check the social table
12. **Failure**: "Huh?" message

#### 5.3 Command Lag System
- `ch.wait` field: decremented each pulse, blocks command execution while > 0
- How different commands set different lag values
- Combat commands and skill commands as primary lag sources
- **Legacy reference**: Document the exact lag values for key commands from COMMANDS.md

#### 5.4 Substate System
- `ch.substate` field: tracks multi-step command state
- Used by: OLC editors, note writing, description editing, forge commands
- How substate handlers intercept input before normal command dispatch
- State machine for each substate type

#### 5.5 Social Commands
- Separate social table loaded from data files
- Social definition: name, character message, victim message, room message (for each of: no target, self target, victim target, not found)
- How socials interact with position checks
- Social command lookup as fallback after main command table

#### 5.6 Command Categories
- Group all commands from COMMANDS.md into categories:
  - Movement: north, south, east, west, up, down, enter, leave, climb, etc.
  - Combat: kill, flee, rescue, disarm, kick, bash, etc.
  - Communication: say, tell, yell, shout, chat, whisper, etc.
  - Information: look, score, who, where, time, weather, help, etc.
  - Interaction: get, drop, put, give, wear, remove, eat, drink, etc.
  - Magic: cast, brew, scribe, etc.
  - Skill: practice, train, etc.
  - Admin: goto, transfer, slay, purge, restore, etc.
  - OLC: redit, medit, oedit, aedit, etc.
  - System: save, quit, password, title, description, etc.
- For each category, list the commands and their trust/position requirements

**Legacy files replaced:** `interp.c`, `tables.c` (command table), `mud.h` (CMD_FLAG_*, substate enums)

### Quality Criteria for This Sub-Phase
- [ ] Complete dispatch pipeline with all 12 steps documented
- [ ] Every CMD_FLAG_* from the legacy code is mapped
- [ ] Abbreviation matching algorithm is specified
- [ ] Lag system mechanics are documented with specific values
- [ ] Substate system is fully described
- [ ] Social command system is specified
- [ ] All command categories from COMMANDS.md are represented
