# Phase 2M — MUD Programming/Scripting + OLC System

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

**Sub-phase:** 2M
**Title:** MUD Programming/Scripting + OLC System
**Sections covered:** §16–§17

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

### §16 — MUD Programming / Scripting System

Design the MUDprog scripting engine that provides NPC AI and world interactivity.

#### 16.1 MudProg Engine (`src/scripting/MudProgEngine.ts`)
- What MUDprogs are: embedded scripts on mobiles, objects, and rooms that fire on specific triggers
- Script format: line-based commands with if/else/endif control flow
- Script execution: interpret line by line, execute MUD commands as the trigger entity
- Variable system: `$n` (trigger character), `$i` (scripted entity), `$o` (trigger object), `$r` (random character in room), etc.
- **Legacy reference**: Document the MUDprog syntax and execution model from ANALYSIS.md

#### 16.2 Trigger Manager (`src/scripting/TriggerManager.ts`)
- Trigger types from ANALYSIS.md:
  - **Mobile triggers**: `act_prog`, `speech_prog`, `rand_prog`, `fight_prog`, `hitprcnt_prog`, `death_prog`, `entry_prog`, `greet_prog`, `all_greet_prog`, `give_prog`, `bribe_prog`, `hour_prog`, `time_prog`, `wear_prog`, `remove_prog`, `sac_prog`, `look_prog`, `exa_prog`, `zap_prog`, `get_prog`, `drop_prog`, `damage_prog`, `repair_prog`, `pull_prog`, `push_prog`, `sleep_prog`, `rest_prog`, `leave_prog`, `script_prog`, `use_prog`
  - **Object triggers**: `wear_prog`, `remove_prog`, `sac_prog`, `zap_prog`, `get_prog`, `drop_prog`, `damage_prog`, `use_prog`, `pull_prog`, `push_prog`, `speech_prog`, `act_prog`
  - **Room triggers**: `enter_prog`, `leave_prog`, `sleep_prog`, `rest_prog`, `speech_prog`, `act_prog`, `rand_prog`, `hour_prog`, `time_prog`
- Trigger registration: how triggers are attached to entities during area loading
- Trigger firing: when and how triggers are checked and executed
- Trigger priority: what happens when multiple triggers match

#### 16.3 IfCheck Registry (`src/scripting/IfCheckRegistry.ts`)
- IfChecks: conditional tests used in MUDprog if statements
- Complete list of ifchecks from ANALYSIS.md:
  - `rand(percentage)`, `mobinroom(vnum)`, `objinroom(vnum)`, `mobinarea(vnum)`, `objinarea(vnum)`
  - `ispc($n)`, `isnpc($n)`, `isimmort($n)`, `ischarmed($n)`, `isfollow($n)`, `isaffected($n, affect)`
  - `hitprcnt($n, percentage)`, `inroom($n, vnum)`, `sex($n, value)`, `position($n, value)`
  - `level($n, value)`, `class($n, value)`, `race($n, value)`, `goldamt($n, value)`
  - `objtype($o, value)`, `objval0-5($o, value)`, `number($n, value)`, `name($n, string)`
  - `clanname($n, string)`, `multi($n, value)`, `qp($n, value)`, `hour(value)`, `isday()`, `isnight()`
  - etc.
- How to register custom ifchecks for extensibility

#### 16.4 MUDprog Commands
- Commands available within MUDprogs:
  - `mpasound`, `mpat`, `mpecho`, `mpechoaround`, `mpechoat`, `mpforce`, `mpgoto`, `mpjunk`, `mpkill`, `mpmload`, `mpoload`, `mppurge`, `mpstat`, `mptransfer`, `mpmorph`, `mpunmorph`, `mpdamage`, `mplog`, `mpapply`, `mpapplyb`, `mpgain`, `mppeace`, `mprestore`, `mpscatter`, `mpslay`, `mpdelay`, `mpnothing`, `mppkset`, `mpflag`, `mpquest`, `mpadvance`, `mpinvis`, `mpgold`, `mptoken`
- For each command: syntax, parameters, effect

---

### §17 — OLC (Online Creation) System

Design the in-game world editing system.

#### 17.1 OLC Architecture
- OLC editors: in-game commands that allow authorised builders to create and modify world content in real-time
- Editor types:
  - `REdit` — Room Editor
  - `MEdit` — Mobile Editor
  - `OEdit` — Object Editor
  - `AEdit` — Area Editor
  - `HEdit` — Help Editor
  - `CEdit` — Command Editor (admin)
  - `SEdit` — Social Editor
  - `PEdit` — MUDprog Editor
- Editor state: uses the substate system from §5 (Command System) to track editing mode
- How OLC changes are saved: modify in-memory entities, mark area as modified, save to JSON on area save

#### 17.2 Room Editor (`REdit`)
- Commands: `name`, `desc`, `ed` (extra descriptions), `flags`, `sector`, `exit` (create/modify exits), `door` (door properties), `reset` (add/remove resets), `mreset` (mobile reset), `oreset` (object reset)
- Exit editing: direction, destination vnum, door flags, key vnum, keywords
- Reset editing: add M/O/P/G/E/D/R resets with parameters

#### 17.3 Mobile Editor (`MEdit`)
- Commands: `name`, `short`, `long`, `desc`, `level`, `alignment`, `race`, `class`, `sex`, `flags`, `affected`, `stats`, `armor`, `hitdice`, `damdice`, `gold`, `position`, `defposition`, `attacks`, `defenses`, `speaks`, `speaking`, `resistant`, `immune`, `susceptible`, `absorb`, `prog` (attach MUDprog)
- Complexity levels: Simple (S), Complex (C), Very Complex (V) — matching legacy mobile complexity

#### 17.4 Object Editor (`OEdit`)
- Commands: `name`, `short`, `long`, `type`, `flags`, `wear`, `weight`, `cost`, `rent`, `value0-5`, `ed` (extra descriptions), `affect` (add/remove affects), `prog` (attach MUDprog), `layers`
- Value field editing: context-sensitive based on item type (See §4 Entity System for item type value interpretations)

#### 17.5 Area Editor (`AEdit`)
- Commands: `name`, `filename`, `author`, `vnums` (vnum range), `resetmsg`, `resetfreq`, `flags`, `climate`

#### 17.6 OLC Permissions
- Trust level requirements for each editor type
- Vnum range restrictions: builders can only edit within their assigned vnum ranges
- Area assignment: which builders are assigned to which areas

**Legacy files replaced:** `build.c`, `mudprog.c` (MUDprog engine), `olc_act.c`, `olc_save.c`

### Quality Criteria for This Sub-Phase
- [ ] All MUDprog trigger types listed for mobiles, objects, and rooms
- [ ] All ifchecks listed with parameters
- [ ] All MUDprog commands listed with syntax
- [ ] MUDprog execution model (line-by-line, variables, control flow) documented
- [ ] All OLC editor types listed with their commands
- [ ] OLC permission system specified
- [ ] OLC save mechanism described (in-memory → JSON)
