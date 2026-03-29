# SMAUG 2.0 Legacy Codebase — Phase 0B: Header File Analysis

> **Context:** This is Phase 0B of a multi-phase analysis of the SMAUG 2.0 MUD engine's
> legacy C codebase. Phase 0A produced `STRUCTURE.md` — a complete file inventory and
> subsystem grouping hypothesis based on filenames and sizes only. No file contents have
> been read yet.
>
> **Prior work available:** `STRUCTURE.md` (file inventory, line counts, subsystem groups,
> recommended reading order). Consult it for file locations and sizes.
>
> **Your role:** You are an expert C systems programmer and software archaeologist with
> deep knowledge of MUD engine architecture (Diku → Merc → SMAUG lineage). Your task is
> to perform a thorough analysis of **only the header (`.h`) files** in the legacy codebase.
> You will extract every data structure, enum, constant, macro, and function prototype to
> build a comprehensive data model document.
>
> **Output:** A single Markdown file, `DATAMODEL.md`, placed in the project root.

---

## Cardinal Rules

1. **Read ONLY `.h` files.** You must not open, read, `cat`, or inspect any `.c` file.
   All analysis is derived exclusively from header files.
2. **Be exhaustive.** Every struct, union, enum, typedef, `#define` constant, and function
   prototype found in any `.h` file must be documented. Do not skip fields or members.
3. **Preserve field-level detail.** For every struct, list every field with its C type,
   name, and a brief description of its likely purpose (inferred from naming conventions
   and MUD domain knowledge).
4. **Document relationships.** When a struct field is a pointer to another struct, note the
   relationship explicitly (e.g., "`char_data.desc` → `descriptor_data`").
5. **Group logically.** Organise structs and constants by subsystem, not by which header
   file they appear in. Cross-reference the subsystem groups from `STRUCTURE.md`.
6. **Record the source.** For each item, note which header file it was found in.
7. **Flag ambiguities.** If a field's purpose is unclear from the header alone, mark it
   with `[UNCLEAR — verify in .c phase]`.
8. **Write Markdown only.** Output must be well-structured Markdown. No HTML, no LaTeX.
9. **Single output file.** All output goes into `DATAMODEL.md`. Do not create additional files.
10. **Do not modify any legacy files.** The `legacy/` directory is read-only.

---

## Reading Order

Process the header files in this order to build understanding incrementally:

1. **`mud.h`** — The master header. Contains the majority of structs, enums, and constants.
   This is the single most important file and will likely take the most time.
2. **`mud_comm.h`** / **`protocol.h`** — Network and protocol structures.
3. **`mccp.h`** — MUD Client Compression Protocol definitions.
4. **`overland.h`** — Overland map system structures.
5. **`dragonflight.h`** — Dragon flight module structures.
6. **`weather.h`** — Weather system structures (may have its own `WeatherCell` struct).
7. **`timezone.h`** — Time zone definitions.
8. **`house.h`** — Housing system structures.
9. **`quest.h`** — Quest system structures.
10. **`news.h`** — News system structures.
11. **`liquids.h`** — Liquid type definitions.
12. **`color.h`** — Colour code definitions.
13. **`sha256.h`** — SHA256 hashing (third-party).
14. **Any remaining `.h` files** found in the inventory.

---

## Deliverable: DATAMODEL.md

The file must contain the following sections in order.

### §1. Metadata

- Date generated
- Total number of `.h` files analysed
- Total lines of header code analysed
- List of all `.h` files read, with line counts

### §2. Master Struct Index

A quick-reference table listing every struct/typedef found, its source header, approximate
line count, and primary subsystem:

| Struct Name | Header File | ~Lines | Subsystem |
|-------------|-------------|--------|-----------|

### §3. Core Engine Structures

For each struct in this category, document:

#### `struct_name` (from `header.h`, lines N–M)

**Purpose:** Brief description of what this struct represents.

**Fields:**

| Type | Field | Description |
|------|-------|-------------|
| `type` | `field_name` | Description, noting pointer targets and bitvector usage |

**Relationships:** List all pointer fields that reference other structs.

**Notes:** Any observations about design patterns, legacy quirks, or unclear fields.

Document at minimum these core structs (and any others found):
- `descriptor_data` — Client connection descriptor
- `char_data` — Player/NPC character (the central game entity)
- `pc_data` / `_pc_data` — Player-specific data extension
- `mob_index_data` — Mobile (NPC) prototype/template
- `obj_index_data` — Object prototype/template
- `obj_data` — Object instance
- `room_index_data` — Room definition
- `area_data` — Area container
- `system_data` — Global MUD configuration

### §4. Combat & Magic Structures

- `affect_data` — Spell/effect application
- `smaug_affect` — Extended SMAUG-specific affect
- `skill_type` — Skill/spell definition (this is critical — document every field)
- Any stance-related structures

### §5. World System Structures

- `exit_data` — Room exits
- `reset_data` — Area reset commands
- `extra_descr_data` — Extra descriptions
- `neighbor_data` — Area weather neighbours

### §6. Economy & Shop Structures

- `shop_data` — Shop definition
- `repairshop_data` — Repair shop definition

### §7. Social & Organisation Structures

- `clan_data` — Clan/guild/order/council
- `council_data` — Council definition
- `deity_data` — Deity definition
- `member_data` / `member_list` — Membership tracking

### §8. Time & Weather Structures

- `time_info_data` — Game calendar
- `weather_data` — Area weather
- `WeatherCell` — Weather map cell (if in `weather.h`)

### §9. MUD Program Structures

- `mob_prog_data` — MUD program definition
- `mob_prog_act_list` — Action queue
- `mpsleep_data` — Sleeping program state

### §10. Character Morphing Structures

- `char_morph` — Active morph state
- `morph_data` — Morph definition/template

### §11. Language & Localisation Structures

- `lcnv_data` — Language conversion rules
- `lang_data` — Language definition
- `locale_data` — Locale data

### §12. Security & Ban Structures

- `ban_data` — Site ban entry
- `nuisance_data` — Nuisance flag data

### §13. Housing, Quest, News Structures

- Any structs found in `house.h`, `quest.h`, `news.h`

### §14. Overland & Dragonflight Structures

- Any structs found in `overland.h`, `dragonflight.h`

### §15. Enumerations

Document every `enum` and every set of sequential `#define` constants that function as
an enumeration. For each:

- Name (or descriptive label if anonymous)
- Source header
- All values with their numeric assignments
- Brief description of what the enum represents

At minimum, document:
- Connection states (`CON_*`)
- Character substates (`SUB_*`)
- Sex types
- Position types (`POS_*`)
- Sector types (`SECT_*`)
- Direction types (`DIR_*`)
- Wear locations (`WEAR_*`)
- Item types (`ITEM_*`)
- Class types (`CLASS_*`)
- Race types (`RACE_*`)
- Clan types
- Damage types (`DAM_*`)
- Weapon types (`WEP_*`)
- Trap types (`TRAP_TYPE_*`)
- Sun positions, sky conditions
- Save types (`SS_*`)
- Climate types
- Apply types (`APPLY_*`)
- Spell target types (`TAR_*`)
- Log levels

### §16. Bitvector Constants

Document all `#define` constants used as bitvectors (bit flags). Group by category:

- **ACT flags** (`ACT_*`) — NPC behaviour flags
- **PLR flags** (`PLR_*`) — Player flags
- **PCFLAG flags** (`PCFLAG_*`) — PC-specific flags
- **AFF flags** (`AFF_*`) — Affected-by flags
- **Room flags** (`ROOM_*`)
- **Exit flags** (`EX_*`)
- **Item extra flags** (`ITEM_*` that are bitvectors, not types)
- **Item wear flags** (bitvector form)
- **Channel flags** (`CHANNEL_*`)
- **CMD flags** (`CMD_FLAG_*`)
- **Resistance/immunity/susceptibility flags**
- **Attack/defence bitvectors**
- Any other bitvector groups found

For each, list the constant name, its bit position or value, and a brief description.

### §17. Numeric Constants and Limits

Document all `#define` constants that set limits or configuration values:

- `MAX_*` constants (MAX_SKILL, MAX_CLASS, MAX_RACE, MAX_LEVEL, etc.)
- `LEVEL_*` constants (immortal level thresholds)
- `PULSE_*` constants (tick timing)
- `SECONDS_PER_TICK`
- Hash table sizes
- Buffer sizes
- Any other numeric configuration constants

### §18. Macro Definitions

Document significant macros (not simple constants), especially:

- Character attribute accessors (`GET_*`, `IS_*`, `CAN_*`)
- Bitvector manipulation macros (`IS_SET`, `SET_BIT`, `REMOVE_BIT`, `TOGGLE_BIT`)
- String handling macros (`STRALLOC`, `STRFREE`, `DISPOSE`)
- Memory management macros (`CREATE`, `RECREATE`)
- Linked list manipulation macros (`LINK`, `UNLINK`)
- Range/bounds macros (`UMIN`, `UMAX`, `URANGE`)
- Any other utility macros

### §19. Function Prototypes

List all function prototypes found in header files, grouped by subsystem. For each:

| Return Type | Function Name | Parameters | Source Header |
|-------------|---------------|------------|---------------|

Focus on prototypes that reveal the public API of each subsystem. Note any functions
declared `extern` or with special calling conventions.

### §20. Typedef Summary

List all `typedef` declarations, showing the original type and the alias:

| Original Type | Typedef Name | Source Header |
|---------------|--------------|---------------|

### §21. Preprocessor Conditionals

Document all `#ifdef` / `#ifndef` / `#if defined()` guards found in headers that control
feature compilation:

- `OVERLANDCODE` — Overland map system
- `ENABLE_QUEST` — Quest system
- Any others found

Note which structs or fields are conditionally compiled.

### §22. Cross-Reference: Struct Relationships

Produce a relationship diagram in text/ASCII or Mermaid format showing how the major
structs reference each other through pointer fields. At minimum show:

- `descriptor_data` ↔ `char_data`
- `char_data` → `pc_data`, `mob_index_data`, `room_index_data`
- `char_data` → `affect_data` (linked list)
- `char_data` → `obj_data` (inventory)
- `room_index_data` → `exit_data`, `extra_descr_data`, `area_data`
- `area_data` → `reset_data`
- `obj_data` → `obj_index_data`

### §23. Observations and Questions for Phase 0C

List anything that requires `.c` file analysis to resolve:
- Fields whose purpose is unclear from headers alone
- Macros that expand to complex expressions
- Function prototypes whose behaviour needs investigation
- Apparent inconsistencies or duplications
- Deprecated or unused-looking definitions

---

## Acceptance Criteria

- [ ] `DATAMODEL.md` exists in the project root.
- [ ] Every `.h` file listed in `STRUCTURE.md` has been read and analysed.
- [ ] Every struct found in any `.h` file is documented with all fields.
- [ ] Every enum and `#define` enumeration is documented with all values.
- [ ] Every bitvector constant group is documented.
- [ ] Every `MAX_*`, `LEVEL_*`, and `PULSE_*` constant is documented.
- [ ] Significant macros are documented with their expansion patterns.
- [ ] Function prototypes are listed and grouped by subsystem.
- [ ] The struct relationship cross-reference is provided.
- [ ] No `.c` file was read during this phase.
- [ ] All items note their source header file.
- [ ] Unclear items are flagged with `[UNCLEAR — verify in .c phase]`.

---

*End of PHASE_0B_HEADER_ANALYSIS.md*
