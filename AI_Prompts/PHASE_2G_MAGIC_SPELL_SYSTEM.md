# Phase 2G — Magic and Spell System

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

**Sub-phase:** 2G
**Title:** Magic and Spell System
**Sections covered:** §7

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

### §7 — Magic and Spell System

Design the complete magic system that replaces the legacy `magic.c`, `smaug.c`, and spell files.

#### 7.1 Spell Registry (`src/magic/SpellRegistry.ts`)
- How spells are defined and registered
- Spell definition interface:
  ```typescript
  interface SpellDefinition {
    name: string;
    slot: number;           // legacy spell slot number
    minLevel: Map<CharacterClass, number>;  // per-class minimum level
    minMana: number;
    target: SpellTarget;    // CHAR_OFFENSIVE, CHAR_DEFENSIVE, CHAR_SELF, OBJ_INV, etc.
    component: string | null;
    participants: number;   // group spell requirement
    savingThrow: SavingThrowType;
    handler: SpellHandler;
    damageType: DamageType;
    flags: bigint;          // spell flags bitvector
    guild: number;          // guild restriction
    difficulty: number;
  }
  ```
- Spell slot numbering: maintain legacy slot numbers for backward compatibility with world data
- How `skill_type` from DATAMODEL.md maps to `SpellDefinition`

#### 7.2 Casting Pipeline (`src/magic/SpellCaster.ts`)
Document the complete `do_cast()` flow from ANALYSIS.md:
1. Parse spell name from argument (abbreviation matching)
2. Validate caster position (must be standing or fighting, depending on spell)
3. Check room flags: NO_MAGIC, SAFE
4. Check guild restrictions
5. Check sector restrictions (some spells only work outdoors, underwater, etc.)
6. Calculate mana cost (base + level modifier)
7. Check sufficient mana
8. Resolve target (self, victim, object, room, direction)
9. Validate target (can't cast offensive on self in safe room, etc.)
10. Check spell components (consumed on cast)
11. Calculate failure chance (based on skill proficiency, See §8)
12. Deduct mana (even on failure)
13. On failure: fizzle message, possible backfire
14. On success: execute spell handler
15. Apply saving throw if applicable
16. Set command lag based on spell

#### 7.3 Spell Categories
Group all spells by function:
- **Damage spells**: magic missile, fireball, lightning bolt, etc. — direct damage with saving throw
- **Healing spells**: cure light, cure serious, heal, etc. — HP restoration
- **Buff spells**: armor, bless, giant strength, haste, etc. — apply affects (See §9)
- **Debuff spells**: curse, poison, blindness, weaken, etc. — apply negative affects
- **Utility spells**: detect magic, identify, locate object, teleport, gate, etc.
- **Area spells**: earthquake, chain lightning, etc. — hit all valid targets in room
- **Summoning spells**: summon, charm, animate dead, etc. — create/control mobiles
- **Transportation spells**: recall, teleport, gate, portal, astral walk, etc.
- For each category: list the spells, their effects, and their key parameters

#### 7.4 Saving Throws
- Saving throw types: POISON_DEATH, ROD_WANDS, PARA_PETRI, BREATH, SPELL_STAFF
- Calculation formula: base save + level modifier + stat modifier + racial modifier + affect modifier
- How saving throws reduce or negate spell effects
- **Legacy reference**: Document the exact formula from ANALYSIS.md

#### 7.5 Spell Components
- Component system: some spells require items to cast
- Component consumption: item destroyed on successful cast
- How components are checked and consumed in the casting pipeline

#### 7.6 Brew, Scribe, and Imbue
- `brew`: Create potions from spells — skill check, failure consequences (explosion)
- `scribe`: Create scrolls from spells — skill check, failure consequences
- `imbue`: Enchant objects with spell effects
- Each: required materials, skill check formula, output object creation

#### 7.7 Spell Casting Pipeline Diagram
- Mermaid flowchart showing the complete casting pipeline from step 1 through step 16

**Legacy files replaced:** `magic.c`, `smaug.c`, `spell_*.c` files, portions of `skills.c`

### Quality Criteria for This Sub-Phase
- [ ] Complete casting pipeline matches ANALYSIS.md (all 16 steps)
- [ ] Spell definition interface covers all fields from `skill_type`
- [ ] All spell categories listed with representative spells
- [ ] Saving throw formula documented
- [ ] Component system described
- [ ] Brew/scribe/imbue mechanics specified
- [ ] Pipeline diagram renders correctly
