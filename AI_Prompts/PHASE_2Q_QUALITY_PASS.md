# Phase 2Q — ARCHITECTURE.md Quality Pass: Cross-Reference Audit, Consistency Check, Gap Analysis & Appendices

## Your Role

You are a **senior software architect** performing the final quality assurance pass on `ARCHITECTURE.md` — the master design document for the SMAUG 2.0 → Node.js/TypeScript port. This document was built incrementally across sub-phases 2A through 2P, with each sub-phase appending its section(s) to the file.

Your job is to **read the entire document**, identify and fix any inconsistencies, fill gaps, and add the appendices. You are the last line of defence before this document is handed to developers for implementation.

## Reference Documents

You have access to four analysis documents produced in Phase 0/1:

| Document | Contains |
|---|---|
| `STRUCTURE.md` | Inventory of every C source file, line counts, subsystem groupings |
| `DATAMODEL.md` | Every C struct, enum, constant, macro, and type definition |
| `COMMANDS.md` | Every player/admin command, dispatch mechanism, trust levels |
| `ANALYSIS.md` | Deep analysis of 15 game subsystems, algorithms, data flows |

## Output Instructions

**Read-and-edit rule:** Read the existing `ARCHITECTURE.md` file in its entirety. You will:
1. Fix any issues found during the audit steps below (in-place edits to existing sections)
2. Replace the appendix stub at the end with the full appendices
3. The final document must be a single, complete, internally consistent `ARCHITECTURE.md`

**Do not remove or rewrite sections wholesale.** Make targeted fixes: rename a mismatched type, add a missing cross-reference, correct a pulse constant, fill a gap. Preserve the original author's structure and prose.

---

## Task 1: Cross-Reference Audit

Scan every cross-reference in the document (any mention of "See §X", "defined in §X", "from §X", etc.) and verify:

- [ ] Every "See §X" reference points to a section that actually exists in the document
- [ ] The referenced section actually contains the information being referenced
- [ ] Every dependency noted in one section is acknowledged in the referenced section (bidirectional references)
- [ ] No circular dependencies that would prevent phased implementation
- [ ] All TypeScript interfaces referenced across sections use the **exact same name** (e.g., if §4 defines `ICharacter`, §6 must not call it `CharacterInterface`)

**Output:** For each issue found, fix it in-place. After all fixes, add a comment block at the very end of the document (before the appendices) summarising what was fixed:

```markdown
<!-- Cross-Reference Audit: [N] issues found and fixed. Summary: ... -->
```

---

## Task 2: Consistency Check

Verify consistency across all 26 sections:

### 2.1 Naming Conventions
- Same class/interface/enum names used everywhere
- Check specifically: `Character` vs `CharacterData`, `Affect` vs `AffectData`, `Mobile` vs `MobileInstance`, `GameObject` vs `GameObjectInstance`
- The canonical names from §4 (Entity System) must be used in all other sections

### 2.2 Pulse Constants
- §2 (Core Engine) defines pulse intervals — verify the same values are used in:
  - §6 (Combat): `PULSE_VIOLENCE`
  - §9 (Affects): affect duration ticks
  - §10 (World Management): `PULSE_AREA`, `PULSE_TICK`
  - §14 (Economy): `PULSE_AUCTION`

### 2.3 Trust Levels
- §18 (Administration) defines trust levels — verify the same level numbers appear in:
  - §5 (Command System): command trust requirements
  - §17 (OLC): builder permissions
  - §19 (Dashboard): API role mapping

### 2.4 Entity Fields
- §4 (Entity System) defines entity interfaces — verify field names match in:
  - §13 (Persistence): what is saved/loaded
  - §21 (Prisma Schema): database column names
  - §22 (World Data Schema): JSON field names

### 2.5 Event Names
- §2 (Core Engine) defines the event catalogue — verify:
  - Events emitted in §6, §7, §10, §11, §12 match the catalogue
  - Events consumed in each section match what other sections emit
  - No event is referenced that isn't in the catalogue (or add it to the catalogue)

### 2.6 Enum Values
- Enums defined in §4 (Entity System) must be used consistently:
  - `Position` enum values in §5 (Command System position checks) and §6 (Combat)
  - `SectorType` values in §10 (World) and §11 (Movement)
  - `ItemType` values in §4 (Entity) and §22 (World Data Schema)
  - `Direction` values in §11 (Movement) and §17 (OLC REdit)

**Output:** Fix all inconsistencies in-place. Add a summary comment:

```markdown
<!-- Consistency Check: [N] inconsistencies found and fixed. Summary: ... -->
```

---

## Task 3: Gap Analysis

Cross-reference the document against the four analysis documents to identify missing coverage:

### 3.1 Subsystem Coverage
- Read ANALYSIS.md and list every subsystem it describes
- Verify each subsystem has corresponding coverage in ARCHITECTURE.md
- If a subsystem is missing or under-specified, add the missing content to the appropriate section

### 3.2 Data Structure Coverage
- Read DATAMODEL.md and list every major C struct
- Verify each struct has a TypeScript equivalent defined in ARCHITECTURE.md
- If a struct is missing, add its TypeScript mapping to §4 (Entity System) or the appropriate section

### 3.3 Command Coverage
- Read COMMANDS.md and list every command category
- Verify each category is represented in §5 (Command System) or the appropriate subsystem section
- If commands are missing, add them to the appropriate section

### 3.4 File Coverage
- Read STRUCTURE.md and list every C source file
- Verify each file is mentioned in at least one "Legacy files replaced" note
- If a file is not covered, determine which section should reference it and add the mapping

**Output:** Fix all gaps in-place. Add a summary comment:

```markdown
<!-- Gap Analysis: [N] gaps found and filled. Summary: ... -->
```

---

## Task 4: Quality Checklist

Verify the final document against this master checklist. For any item that fails, fix it.

- [ ] All 26 sections present (§1 through §26) with consistent heading levels
- [ ] Section numbering is sequential with no gaps or duplicates
- [ ] Covers all 15+ subsystems from ANALYSIS.md
- [ ] Maps every major C struct from DATAMODEL.md to a TypeScript equivalent
- [ ] Accounts for all command categories from COMMANDS.md (movement, combat, communication, information, interaction, admin, OLC, system)
- [ ] References specific legacy file names from STRUCTURE.md when explaining what each module replaces
- [ ] Includes TypeScript code sketches for all major interfaces, class signatures, and enum definitions
- [ ] Every design decision includes a "Why" justification tracing back to legacy behaviour
- [ ] Addresses all 5 design constraints (feature parity, type safety, event-driven, backward compatibility, no over-engineering)
- [ ] Provides the complete Prisma schema (§21)
- [ ] Provides JSON schemas for world data files (§22)
- [ ] Defines the migration path with clear phases and acceptance criteria (§26)
- [ ] All Mermaid diagrams are present and syntactically correct (test by reading the Mermaid syntax)
- [ ] No TODO, TBD, FIXME, or placeholder text remains in any section
- [ ] No empty sections or stub content
- [ ] Cross-references are all valid (verified in Task 1)
- [ ] Naming is consistent (verified in Task 2)
- [ ] No gaps in coverage (verified in Task 3)

**Output:** Add a summary comment:

```markdown
<!-- Quality Checklist: [N]/[Total] items passed. [M] items required fixes. Summary: ... -->
```

---

## Task 5: Generate Appendices

Replace the appendix stub (added by Phase 2P) with the full appendices:

### Appendix A: Legacy File Mapping

Create a comprehensive table mapping **every** C source file from STRUCTURE.md to its TypeScript replacement module(s):

| Legacy C File | Lines | TypeScript Module(s) | Section Reference |
|---|---|---|---|
| `act_comm.c` | X,XXX | `src/communication/ChannelManager.ts`, `src/communication/LanguageSystem.ts` | §12 |
| `act_info.c` | X,XXX | `src/commands/info/*.ts` | §5 |
| `act_move.c` | X,XXX | `src/movement/MovementHandler.ts`, `src/movement/DoorManager.ts` | §11 |
| ... | ... | ... | ... |

**Every file from STRUCTURE.md must appear in this table.** Use the line counts from STRUCTURE.md. If a C file maps to multiple TypeScript modules, list them all. If a C file has no direct equivalent (e.g., it's obsoleted by the new architecture), note that.

### Appendix B: Utility Classes

Document the common utility classes referenced across multiple sections:

#### B.1 BitVector (`src/utils/BitVector.ts`)
- `bigint`-based bitvector implementation
- Methods: `has(flag)`, `set(flag)`, `clear(flag)`, `toggle(flag)`, `toString()`, `fromString()`
- Used by: entity flags, room flags, affect flags, command flags, channel subscriptions

#### B.2 Dice (`src/utils/Dice.ts`)
- Dice roller: `roll(count, sides)`, `rollRange(min, max)`
- Dice string parser: `parse("3d6+2")` → `{ count: 3, sides: 6, bonus: 2 }`
- Used by: combat damage, mobile hit dice, object damage dice, skill checks

#### B.3 StringUtils (`src/utils/StringUtils.ts`)
- `strPrefix(short, full)`: abbreviation matching (legacy `str_prefix()`)
- `oneArgument(input)`: extract first word from input string (legacy `one_argument()`)
- `isName(str, namelist)`: check if string matches any name in a space-separated name list
- `capitalize(str)`, `toLower(str)`, `smash_tilde(str)`
- Used by: command dispatch, entity matching, input parsing

#### B.4 NumberUtils (`src/utils/NumberUtils.ts`)
- `numberRange(min, max)`: random integer in range (legacy `number_range()`)
- `numberPercent()`: random 1–100 (legacy `number_percent()`)
- `numberBits(width)`: random bits (legacy `number_bits()`)
- `UMIN(a, b)`, `UMAX(a, b)`, `URANGE(min, val, max)`: clamping utilities
- Used by: combat, skills, movement, spawning

### Appendix C: Configuration Reference

List every configurable value in the system with its default and description:

| Config Key | Default | Type | Description |
|---|---|---|---|
| `SERVER_PORT` | `4000` | `number` | WebSocket server port |
| `DATABASE_URL` | — | `string` | PostgreSQL connection string |
| `MAX_CONNECTIONS` | `256` | `number` | Maximum simultaneous connections |
| `PULSE_PER_SECOND` | `4` | `number` | Game pulses per real second |
| `AUTO_SAVE_INTERVAL` | `15` | `number` | Minutes between player auto-saves |
| `LOG_LEVEL` | `info` | `string` | Minimum log level |
| `JWT_SECRET` | — | `string` | Secret for dashboard JWT tokens |
| `BCRYPT_ROUNDS` | `12` | `number` | Bcrypt hashing rounds |
| ... | ... | ... | ... |

Include **every** configurable value mentioned anywhere in the document. Scan all 26 sections for values that should be configurable rather than hard-coded.

### Appendix D: Glossary

Define every domain-specific term used in the document:

| Term | Definition |
|---|---|
| **Vnum** | Virtual Number — unique identifier for room, mobile, and object prototypes |
| **Prototype** | Template definition (e.g., MobilePrototype) from which runtime instances are created |
| **Instance** | Runtime copy of a prototype (e.g., a specific goblin spawned from goblin prototype #3001) |
| **Pulse** | The smallest time unit in the game loop (250ms at 4 pulses/second) |
| **Tick** | A major game update cycle (70 seconds = 280 pulses) |
| **Affect** | A temporary modification to a character's stats or abilities (buff or debuff) |
| **Bitvector** | A set of boolean flags stored as bits in a `bigint` value |
| **Trust Level** | A character's administrative privilege level (0–65) |
| **Descriptor** | The network connection object associated with a player |
| **OLC** | Online Creation — the in-game world editing system |
| **MUDprog** | Scripted behaviour attached to mobiles, objects, or rooms |
| **Sector Type** | The terrain type of a room (affects movement cost, available actions) |
| **Act Flags** | Bitvector flags on mobiles controlling their behaviour (aggressive, sentinel, scavenger, etc.) |
| ... | ... |

Include **every** term that a developer unfamiliar with MUD development would need defined. Err on the side of including too many rather than too few.

---

## Final Output

After completing all 5 tasks, the `ARCHITECTURE.md` file should be:
- Internally consistent (no naming conflicts, no broken cross-references)
- Complete (no gaps in legacy feature coverage)
- Fully appendixed (A through D)
- Ready for developers to implement from

The audit summary comments (from Tasks 1–4) should remain in the document as a record of the quality pass.

### Acceptance Criteria
- [ ] All cross-references verified and fixed (Task 1)
- [ ] All naming/constant/enum inconsistencies resolved (Task 2)
- [ ] All coverage gaps filled (Task 3)
- [ ] Quality checklist fully passed (Task 4)
- [ ] Appendix A contains every C file from STRUCTURE.md
- [ ] Appendix B documents all utility classes
- [ ] Appendix C lists every configurable value
- [ ] Appendix D defines every domain term
- [ ] No TODO, TBD, FIXME, or placeholder text remains
- [ ] Document is a single, complete, self-contained `ARCHITECTURE.md`
