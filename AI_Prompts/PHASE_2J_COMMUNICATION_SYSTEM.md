# Phase 2J — Communication System

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

**Sub-phase:** 2J
**Title:** Communication System
**Sections covered:** §12

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

### §12 — Communication System

Design the complete communication infrastructure.

#### 12.1 Channel Manager (`src/communication/ChannelManager.ts`)
- Channel types from ANALYSIS.md: CHAT, IMMTALK, MUSIC, ASK, SHOUT, YELL, CLAN, COUNCIL, GUILD, AUCTION, SAY, WHISPER, TELL, REPLY, GTELL (group tell), RACETALK, WARTALK
- Channel subscription: bitmask-based, stored in `char_data.deaf` bitvector
- Channel permissions: trust level requirements, clan membership requirements
- Channel message flow:
  1. Sender issues channel command
  2. Validate sender permissions and position
  3. Format message with sender name/title
  4. Iterate all characters in game
  5. For each: check subscription, check ignore list, check range (for local channels)
  6. Deliver formatted message
- Channel history: last N messages per channel for late joiners

#### 12.2 Language System (`src/communication/LanguageSystem.ts`)
- Languages from ANALYSIS.md: common, elvish, dwarven, pixie, ogre, orcish, trollish, goblin, halfling, etc.
- Per-character language knowledge: proficiency percentage
- `translate()` function: garble message based on listener's proficiency in speaker's language
- Comprehension threshold: below X% proficiency, message is fully garbled
- Language learning: improve through exposure and practice
- **Legacy reference**: Document the exact garbling algorithm from ANALYSIS.md

#### 12.3 Color System (`src/communication/ColorParser.ts`)
- ANSI color codes: the `&X`, `^X`, `}X` syntax from ANALYSIS.md
  - `&X` — foreground colours
  - `^X` — background colours  
  - `}X` — blinking/bold variants
- Color code table: map every code to its ANSI escape sequence
- Color stripping: remove color codes for clients that don't support ANSI
- Player color preferences: toggle ANSI on/off, custom color schemes
- **WebSocket consideration**: How ANSI codes are transmitted over WebSocket (raw escape sequences vs. HTML/CSS conversion for browser client)

#### 12.4 Pager System (`src/communication/Pager.ts`)
- Multi-page output: when output exceeds screen height, paginate
- Pager commands: ENTER (next page), `b` (back), `q` (quit), `r` (refresh), line number (jump)
- Screen height detection: from NAWS telnet negotiation or client-reported height
- Integration with Descriptor output buffer (See §3)
- How the pager interacts with connection state (CON_PAGING state)

#### 12.5 Prompt System
- Customisable prompt: `%h` (HP), `%m` (mana), `%v` (moves), `%x` (XP), `%g` (gold), `%a` (alignment), `%r` (room name), `%e` (exits), `%c` (condition of fighting target), etc.
- Prompt format string stored per player
- Prompt rendering: replace tokens with current values each time prompt is displayed
- Combat prompt: additional information shown during combat (opponent's condition)

#### 12.6 Act System
- The `act()` function: the core message formatting system used throughout the codebase
- Token system: `$n` (character name to observer), `$N` (victim name to observer), `$e`/`$E` (he/she/it), `$m`/`$M` (him/her/it), `$s`/`$S` (his/her/its), `$p`/`$P` (object short description), `$d` (door name), `$t`/`$T` (text arguments)
- Target types: TO_CHAR, TO_VICT, TO_ROOM, TO_NOTVICT, TO_CANSEE
- How `act()` generates different messages for different observers based on visibility, language, and relationship to the action
- **This is one of the most-called functions in the entire codebase** — design for performance

#### 12.7 Tell and Reply System
- `tell` command: private message to online player
- `reply` command: reply to last person who sent you a tell
- Tell history: last N tells stored per player
- AFK handling: tells queued when player is AFK, delivered on return
- Ignore system: blocked players cannot send tells

**Legacy files replaced:** `act_comm.c`, `act_info.c` (prompt), `comm.c` (color/act), `mud.h` (channel types, language types)

### Quality Criteria for This Sub-Phase
- [ ] All channel types listed with permissions and subscription mechanics
- [ ] Language system with garbling algorithm documented
- [ ] Complete color code table (all `&X`, `^X`, `}X` codes)
- [ ] Pager system fully specified with all commands
- [ ] Prompt token system complete
- [ ] Act system with all tokens and target types documented
- [ ] Tell/reply/ignore system specified
