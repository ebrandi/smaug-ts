# Phase 2L — Economy System + Social/Guild Systems

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

**Sub-phase:** 2L
**Title:** Economy System + Social/Guild Systems
**Sections covered:** §14–§15

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

### §14 — Economy System

Design the complete economy system.

#### 14.1 Currency Manager (`src/economy/CurrencyManager.ts`)
- Three-currency system from ANALYSIS.md: gold, silver, copper
- Fixed exchange ratios: 1 gold = 10 silver = 100 copper (verify against ANALYSIS.md)
- Currency conversion utilities: `toCopper()`, `fromCopper()`, `formatCurrency()`
- Character wealth: stored as separate gold/silver/copper fields on Character (See §4)

#### 14.2 Shop System (`src/economy/ShopKeeper.ts`)
- Shop definition: maps to `shop_data` from DATAMODEL.md
  - Keeper mobile vnum, buy/sell profit percentages, opening/closing hours, item types traded
- Buy/sell price calculation from ANALYSIS.md:
  - Buy price: base cost × shop buy percentage × charisma modifier × race modifier
  - Sell price: base cost × shop sell percentage × charisma modifier × race modifier
- Trade restrictions: shops only buy/sell specific item types
- Shop inventory: items the shopkeeper has for sale (restocked on area reset)
- Haggling: charisma-based price negotiation
- `list`, `buy`, `sell`, `value` commands

#### 14.3 Repair Shop System
- Maps to `repairshop_data` from DATAMODEL.md
- Repair cost calculation: based on item condition, type, and shop rates
- Item types that can be repaired
- `repair`, `estimate` commands

#### 14.4 Auction System (`src/economy/AuctionSystem.ts`)
- Auction mechanics from ANALYSIS.md:
  - `auction` command to start an auction
  - `bid` command to place a bid
  - Auction timer: ticks down every PULSE_AUCTION
  - Three calls: "going once", "going twice", "sold"
  - Winner receives item, seller receives gold (minus house cut if applicable)
  - Failed auction: item returned to seller

#### 14.5 Bank System
- Bank operations from ANALYSIS.md: deposit, withdraw, transfer, balance
- NPC banker validation: must be in room with banker NPC
- Interest: does the legacy system support interest? Document accordingly
- Multi-currency banking: deposit/withdraw in gold, silver, or copper

#### 14.6 Housing Economy
- House purchase: cost based on room count
- House accessories: furniture, decorations — purchased from shops
- House auction: buying/selling houses between players
- Rent/maintenance: recurring costs (if applicable in legacy)

---

### §15 — Social and Guild Systems

Design clan, council, and social organisation systems.

#### 15.1 Clan Manager (`src/social/ClanManager.ts`)
- Clan data structure from DATAMODEL.md (`clan_data`):
  - Name, leader, number one, number two, members list
  - Motto, description, deity
  - PKills, PDeaths, MKills, MDeaths
  - Clan funds (treasury)
  - Clan hall vnum, clan storeroom vnum
  - Clan type: ORDER, GUILD, CLAN
- Clan commands: `clantalk`, `clan info`, `clan roster`, `clan donate`, `clan withdraw`
- Clan leadership: leader, first officer, second officer — appointment and succession
- Clan membership: induction, outcast, resignation
- Clan wars: PK tracking between clans

#### 15.2 Council Manager (`src/social/CouncilManager.ts`)
- Council system: similar to clans but for administrative/RP purposes
- Council data structure
- Council commands and permissions

#### 15.3 Board Manager (`src/social/BoardManager.ts`)
- Board system from ANALYSIS.md:
  - Multiple boards at different locations (general, immortal, clan, etc.)
  - Read/write trust level restrictions
  - Post creation: subject + body (multi-line editor)
  - Post reading: list posts, read specific post
  - Post removal: by author or admin
- Board persistence: stored in PostgreSQL (See §13/§21)
- Board commands: `note list`, `note read`, `note write`, `note remove`, `note to`

#### 15.4 Housing Manager (`src/social/HousingManager.ts`)
- Player housing from ANALYSIS.md:
  - Room limits per house
  - Key system: house key object
  - Accessories: furniture placement
  - House commands: `homebuy`, `homeaccess`, `homeacclist`
  - Guest access: allow specific players to enter
- Housing persistence: house data stored with area data or separately

#### 15.5 Quest System
- Automated quest system from ANALYSIS.md:
  - Quest generation: mob kill quests, object recovery quests
  - Quest tracking: target, progress, timer, cooldown
  - Quest rewards: gold, quest points, practices
  - Quest commands: `quest request`, `quest complete`, `quest info`, `quest list`
  - Quest points: currency for special purchases
- Quest master NPCs: specific mobiles that offer quests

#### 15.6 News System
- Multi-category news from ANALYSIS.md
- News posting and reading
- News categories and permissions

**Legacy files replaced:** `shops.c`, `auction.c`, `clans.c`, `boards.c`, `housing.c`, `quest.c`

### Quality Criteria for This Sub-Phase
- [ ] Three-currency system with exchange ratios documented
- [ ] Shop buy/sell formulas match ANALYSIS.md
- [ ] Auction system fully specified with timer mechanics
- [ ] Bank system documented
- [ ] Clan data structure maps all fields from `clan_data`
- [ ] Board system with trust-based permissions specified
- [ ] Housing system documented
- [ ] Quest system with generation, tracking, and rewards specified
