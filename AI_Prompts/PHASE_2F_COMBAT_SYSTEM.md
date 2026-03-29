# Phase 2F — Combat System

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

**Sub-phase:** 2F
**Title:** Combat System
**Sections covered:** §6

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

### §6 — Combat System

Design the complete combat system that replaces the legacy `fight.c` and related files.

#### 6.1 Combat Overview
- Round-based combat driven by `PULSE_VIOLENCE` (every 12 pulses = 3 seconds, matching §2 Core Engine)
- How combat starts: `multi_hit()` called when a character attacks
- How combat ends: death, flee, recall, calm, charm
- The fighting list: how characters in combat are tracked globally

#### 6.2 Combat Round Flow
Document the complete sequence of a single combat round:
1. `violence_update()` — called every PULSE_VIOLENCE
2. For each character in the fighting list:
   a. Check if still fighting (target alive, in same room)
   b. `multi_hit(ch, victim)` — determine number of attacks
   c. For each attack: `one_hit(ch, victim, weapon)` — single attack resolution
   d. Check for dual wield, extra attacks from skills/affects
   e. Process riposte, parry, dodge, shield block
   f. Apply damage
   g. Check for death
3. Process area effects (AoE spells active in room)
4. Process poison/bleeding/other periodic damage

#### 6.3 Hit Resolution (`one_hit`)
- Attack roll calculation: thac0, AC, hitroll modifiers, weapon skill
- Damage calculation: damroll, weapon damage dice, strength modifier, vulnerability/resistance, damage type
- Critical hits and fumbles
- Damage types: SLASH, STAB, HACK, CRUSH, LASH, PIERCE, BITE, CLAW, BLAST, POUND, BOLT, ARROW, etc.
- Damage reduction: armour, magical protection, racial resistance
- **Legacy reference**: Document the exact formulas from `fight.c` as described in ANALYSIS.md

#### 6.4 Defence System
- Parry: skill check, weapon requirement, formula
- Dodge: skill check, dexterity modifier, formula
- Shield block: shield requirement, skill check
- Riposte: counter-attack on successful parry
- Tumble: monk/thief special dodge
- Each defence: trigger conditions, success formula, message output

#### 6.5 Death Handling (`src/combat/DeathHandler.ts`)
- Player death: create corpse, transfer inventory, experience loss, ghost state, respawn location
- Mobile death: create corpse, transfer inventory, experience/gold reward to killer, death triggers (MUDprog `death_prog`)
- Corpse creation: corpse object with timer, contents from victim's inventory
- Death cry: room and adjacent room messages
- Group experience splitting
- Alignment changes from kills

#### 6.6 Special Combat Features
- **Stances**: offensive, defensive, evasive, etc. — how they modify hit/damage/AC
- **Fighting styles**: how character class affects combat behaviour
- **Mounted combat**: bonuses/penalties when mounted
- **Ranged combat**: projectile weapons, ammunition tracking
- **Dual wield**: second weapon attacks, skill check
- **Berserk**: rage state, bonuses, duration

#### 6.7 Combat Events
- Events emitted to EventBus (See §2):
  - `combat.start`, `combat.round`, `combat.hit`, `combat.miss`, `combat.death`, `combat.end`
  - `combat.parry`, `combat.dodge`, `combat.flee`
- Events consumed:
  - `tick.violence` (triggers violence_update)
  - `affect.expire` (combat-relevant affects wearing off)

#### 6.8 Combat Round Flow Diagram
- Mermaid flowchart showing the complete combat round from `violence_update()` through hit resolution, damage application, and death check

**Legacy files replaced:** `fight.c`, `skills.c` (combat skills), portions of `update.c` (violence_update)

### Quality Criteria for This Sub-Phase
- [ ] Complete combat round sequence documented step by step
- [ ] Hit resolution formula matches legacy code from ANALYSIS.md
- [ ] All defence types documented with formulas
- [ ] Death handling covers both player and mobile death
- [ ] All damage types listed
- [ ] Stances, mounted combat, ranged combat, dual wield all addressed
- [ ] Combat events catalogue is complete
- [ ] Flow diagram renders correctly
