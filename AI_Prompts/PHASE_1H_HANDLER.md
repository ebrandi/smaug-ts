# Phase 1H — Core Handler Functions

> **SMAUG 2.0 Legacy Codebase Analysis — Phase 1 Sub-Phase H**

---

## Project Overview

You are analysing the legacy C source code of **SMAUG 2.0**, a MUD (Multi-User Dungeon)
engine descended from the Diku → Merc → SMAUG lineage. The ultimate goal is to port this
engine to **Node.js / TypeScript**. Before any code is written, we need a thorough,
precise analysis of every game system in the legacy codebase.

The legacy source lives in `legacy/src/`. There are **86 `.c` files** and **22 `.h` files**
totalling approximately **200,555 lines** of C code.

---

## Prior Work Available

Before starting any sub-phase, you **must** read these files (if they exist) to
understand what has already been documented:

| File | Created By | Contents |
|------|-----------|----------|
| `STRUCTURE.md` | Phase 0A | File inventory, line counts, subsystem groupings, reading order |
| `DATAMODEL.md` | Phase 0B | All structs, enums, constants, macros, and function prototypes from `.h` files |
| `ANALYSIS.md` | Phase 1 (progressive) | Accumulated analysis from prior sub-phases — **read before appending** |
| `COMMANDS.md` | Phase 1G+ (progressive) | Command inventory — **read before appending** |

If `ANALYSIS.md` or `COMMANDS.md` do not yet exist, the current sub-phase will create them.

---

## Your Role

You are an expert C systems programmer and software archaeologist with deep knowledge of
MUD engine architecture (Diku → Merc → SMAUG lineage). You read C source code with
precision, extract exact algorithms and formulas, and document behaviour in clear,
structured Markdown.

---

## Cardinal Rules

1. **Read only the files specified in the sub-phase instructions.** Do not read files
   assigned to other sub-phases unless explicitly told to.
2. **Always read prior work first.** Before writing anything, read `STRUCTURE.md`,
   `DATAMODEL.md`, and any existing `ANALYSIS.md` / `COMMANDS.md` content.
3. **Do not re-read `.h` files.** All struct definitions, enums, constants, macros, and
   function prototypes are already in `DATAMODEL.md`. Reference them by name.
4. **Document behaviour, not just structure.** Phase 0B captured *what* the data looks
   like. Your job is to capture *how* the code uses that data — algorithms, decision
   trees, formulas, state machines, and side effects.
5. **Extract exact formulas.** When the code computes damage, XP, shop prices, spell
   effects, movement costs, mana costs, or any other numeric value, extract the exact
   formula as a mathematical expression. Do not paraphrase.
6. **Document control flow.** For complex functions, describe the step-by-step flow using
   numbered lists or pseudocode. Note early returns, error conditions, and edge cases.
7. **Capture magic numbers.** When the code uses hardcoded numeric values
   (e.g., `if (level > 32)`), document them and note whether they correspond to named
   constants from `DATAMODEL.md`.
8. **Note legacy quirks.** Document any code that appears buggy, inconsistent, or relies
   on undefined behaviour. Tag with severity: `info`, `warn`, or `bug`.
9. **Cross-reference `DATAMODEL.md`.** When a function manipulates a struct field,
   reference the struct and field by name as documented in `DATAMODEL.md`.
10. **Write Markdown only.** No HTML, no LaTeX. Use fenced code blocks for C snippets
    and pseudocode.
11. **Append, never overwrite.** When adding to `ANALYSIS.md` or `COMMANDS.md`, append
    your new sections after the existing content. Never delete or modify prior sections.
12. **Do not modify any legacy files.** The `legacy/` directory is read-only.
13. **Stay focused.** If you encounter interesting code outside your assigned files,
    note it briefly as a cross-reference but do not analyse it in depth.

---

## Per-File Analysis Template

For each `.c` file you analyse, produce these sections:

### File Overview
- **File:** `filename.c` (N lines)
- **Subsystem:** (from `STRUCTURE.md` grouping)
- **Purpose:** One-paragraph summary.
- **Key dependencies:** Headers included, other `.c` files it interacts with.

### Public Functions
For each non-static function, document:
- **Purpose:** What it does.
- **Called by:** Where it is invoked from (if determinable).
- **Algorithm:** Step-by-step logic (numbered list for complex flows).
- **Formulas:** Any mathematical computations, extracted exactly.
- **Side effects:** Global state or struct fields modified.
- **Return value:** What and when.
- **Edge cases:** Error handling, early returns, boundary conditions.
- **Legacy quirks:** Anything unusual or potentially buggy.

### Static/Internal Functions
Same format, but briefer. Focus on functions with significant logic.

### Global Variables
| Type | Name | Purpose | Initial Value |
|------|------|---------|---------------|

### State Machines (if applicable)
- States, transitions, and ASCII/Mermaid diagram.

### Data Flow (if applicable)
- Input → parsing → intermediate → final storage.

---

## Output File Locations

- `ANALYSIS.md` — in the project root (create or append)
- `COMMANDS.md` — in the project root (create or append, starting from sub-phase 1G)

---

## Acceptance Criteria (per sub-phase)

Each sub-phase prompt includes its own specific acceptance criteria. In addition,
**every sub-phase** must satisfy:

- [ ] All assigned files have been read and analysed.
- [ ] Prior `ANALYSIS.md` / `COMMANDS.md` content was read before appending.
- [ ] Every public function in the assigned files is documented.
- [ ] Exact formulas are extracted (not paraphrased).
- [ ] Magic numbers are identified and cross-referenced.
- [ ] Legacy quirks are tagged with severity.
- [ ] No legacy files were modified.

---

## Assigned Files

| File | Lines | Why |
|------|-------|-----|
| `handler.c` | 5,863 | Core manipulation — affect_to_char, char_to_room, obj_to_char, etc. |

---

## Specific Instructions

This file contains the fundamental operations that every other system depends on.

1. **Character-Room operations:** `char_to_room()`, `char_from_room()` — what state
   changes occur, what events are triggered, what linked lists are updated.
2. **Object-Character operations:** `obj_to_char()`, `obj_from_char()` — inventory
   management, weight tracking.
3. **Object-Room operations:** `obj_to_room()`, `obj_from_room()`.
4. **Object-Object operations:** `obj_to_obj()`, `obj_from_obj()` — container nesting.
5. **Affect operations:** `affect_to_char()`, `affect_remove()`, `affect_strip()`,
   `affect_join()` — how affects modify character stats, how they are added/removed.
6. **Equipment operations:** `equip_char()`, `unequip_char()` — how wearing/removing
   items applies/removes stat modifiers.
7. **Extraction:** `extract_char()`, `extract_obj()` — cleanup and memory freeing.
8. **Lookup functions:** `get_char_room()`, `get_char_world()`, `get_obj_carry()`,
   `get_obj_wear()`, `get_obj_here()` — how entities are found by name/keyword.
9. **Stat calculation:** `get_curr_str()`, `get_curr_int()`, etc. — how base stats
   plus modifiers are computed.
10. **Can-see checks:** `can_see()`, `can_see_obj()` — visibility rules.

---

## Output

- **Append** to `ANALYSIS.md` section `## 8. Core Handler Functions`.

---

## Acceptance Criteria

- [ ] All char/obj/room transfer functions documented with state changes.
- [ ] Affect application and removal fully documented.
- [ ] Equipment stat modifier application documented.
- [ ] Entity extraction (cleanup) documented.
- [ ] All lookup functions documented with their search scopes.

---

*End of PHASE_1H*
