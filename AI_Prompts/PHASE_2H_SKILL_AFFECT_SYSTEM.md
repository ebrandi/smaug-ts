# Phase 2H — Skill System + Affect/Buff System

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

**Sub-phase:** 2H
**Title:** Skill System + Affect/Buff System
**Sections covered:** §8–§9

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

### §8 — Skill System

Design the skill proficiency and learning system.

#### 8.1 Skill Manager (`src/skills/SkillManager.ts`)
- How skills are defined: reuse `SpellDefinition` from §7 (skills and spells share the `skill_type` struct in legacy code)
- Skill vs. spell distinction: skills don't cost mana, use different failure mechanics
- Skill categories: combat skills (kick, bash, disarm, backstab), passive skills (dodge, parry, dual wield), crafting skills (brew, scribe, forge), language skills, weapon proficiencies

#### 8.2 Proficiency System
- Per-character skill proficiency: 0–100% (stored in `pc_data.learned` map)
- How proficiency affects success chance
- Proficiency improvement on use: formula for gaining proficiency through practice
- Level-gated learning: skills become available at specific levels per class
- **Legacy reference**: Document the exact proficiency check formula from ANALYSIS.md

#### 8.3 Practice and Training
- `practice` command: spend practice sessions to improve skill proficiency
- Practice session gains: formula based on intelligence, wisdom, class
- Trainer NPCs: which skills each trainer can teach
- `train` command: spend training sessions to improve base stats
- Training limits: stat caps, session costs

#### 8.4 Skill Execution Flow
1. Check skill known and proficiency > 0
2. Check position requirements
3. Check target requirements
4. Roll proficiency check (random 1–100 vs. proficiency percentage)
5. On failure: failure message, possible self-damage, lag
6. On success: apply skill effect, lag
7. Improve proficiency (small chance on each use)

#### 8.5 Weapon Proficiencies
- Weapon types: sword, dagger, mace, axe, whip, polearm, etc.
- Per-weapon proficiency affecting hit chance and damage
- How weapon proficiency interacts with combat (See §6)

---

### §9 — Affect/Buff System

Design the system for temporary effects applied to characters and objects.

#### 9.1 Affect Class (`src/entities/Affect.ts`)
- Maps to both `affect_data` and `smaug_affect` from DATAMODEL.md
- Interface definition:
  ```typescript
  interface Affect {
    type: string;           // spell/skill name that created this affect
    duration: number;       // ticks remaining (-1 = permanent)
    location: AffectLocation; // what stat is modified
    modifier: number;       // how much the stat is modified
    bitvector: bigint;      // AFF_* flags this affect grants
    caster: string | null;  // who applied this affect
  }
  ```
- SMAUG-style affects: more complex, with multiple apply locations per affect
- How `affect_data` (simple) vs `smaug_affect` (complex) are unified in TypeScript

#### 9.2 Affect Manager (`src/affects/AffectManager.ts`)
- `applyAffect(ch, affect)`: add affect to character, modify stats
- `removeAffect(ch, affect)`: remove affect, reverse stat modifications
- `updateAffects()`: called every PULSE_TICK, decrement durations, remove expired affects
- `isAffectedBy(ch, affectType)`: check if character has a specific affect
- `stripAffect(ch, affectType)`: remove all affects of a given type
- Affect stacking rules: can the same affect be applied multiple times? Which ones stack?

#### 9.3 AFF_* Flags
- Complete list of all `AFF_*` flags from DATAMODEL.md as a TypeScript enum/bitvector:
  - AFF_BLIND, AFF_INVISIBLE, AFF_DETECT_EVIL, AFF_DETECT_INVIS, AFF_DETECT_MAGIC, AFF_DETECT_HIDDEN, AFF_HOLD, AFF_SANCTUARY, AFF_FAERIE_FIRE, AFF_INFRARED, AFF_CURSE, AFF_FLAMING, AFF_POISON, AFF_PROTECT, AFF_PARALYSIS, AFF_SNEAK, AFF_HIDE, AFF_SLEEP, AFF_CHARM, AFF_FLYING, AFF_PASS_DOOR, AFF_FLOATING, AFF_TRUESIGHT, AFF_DETECTTRAPS, AFF_SCRYING, AFF_FIRESHIELD, AFF_SHOCKSHIELD, AFF_ICESHIELD, AFF_POSSESS, AFF_BERSERK, AFF_AQUA_BREATH, AFF_RECURRINGSPELL, AFF_CONTAGIOUS, AFF_ACIDMIST, AFF_VENOMSHIELD
- For each flag: what it does, how it affects gameplay, which spells/skills apply it

#### 9.4 Affect Locations (Apply Types)
- Complete list of `APPLY_*` constants: APPLY_STR, APPLY_DEX, APPLY_INT, APPLY_WIS, APPLY_CON, APPLY_CHA, APPLY_LCK, APPLY_SEX, APPLY_CLASS, APPLY_LEVEL, APPLY_AGE, APPLY_MANA, APPLY_HIT, APPLY_MOVE, APPLY_GOLD, APPLY_AC, APPLY_HITROLL, APPLY_DAMROLL, APPLY_SAVING_POISON, APPLY_SAVING_ROD, APPLY_SAVING_PARA, APPLY_SAVING_BREATH, APPLY_SAVING_SPELL, etc.
- How each apply type modifies the character's effective stats

#### 9.5 Equipment Affects
- How worn equipment applies permanent affects (while worn)
- Equipment affect removal on unequip
- Interaction between equipment affects and spell affects

#### 9.6 Room and Object Affects
- Affects that apply to rooms (e.g., room-wide silence, darkness)
- Affects on objects (e.g., enchanted weapons, cursed items)
- How room affects interact with character affects

**Legacy files replaced:** `handler.c` (affect functions), `magic.c` (affect application), `update.c` (affect_update), `mud.h` (AFF_*, APPLY_*)

### Quality Criteria for This Sub-Phase
- [ ] Skill proficiency formula matches ANALYSIS.md
- [ ] Practice/training mechanics fully specified
- [ ] Skill execution flow documented step by step
- [ ] Affect interface maps all fields from both `affect_data` and `smaug_affect`
- [ ] All AFF_* flags listed with descriptions
- [ ] All APPLY_* locations listed
- [ ] Affect stacking rules defined
- [ ] Equipment affect interaction explained
