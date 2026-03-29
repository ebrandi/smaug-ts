# Phase 1G — Command Interpreter

> **SMAUG 2.0 Legacy Codebase Analysis — Phase 1 Sub-Phase G**

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
| `interp.c` | ~2,500 | Command interpreter — dispatch, abbreviation matching, trust checks, lag |

---

## Specific Instructions

1. **Command table structure:** How commands are registered — name, function pointer,
   trust level, minimum position, log flag, command flags.
2. **Command lookup:** How `interpret()` finds the matching command. Document the hash
   table (indexed by first character) and `str_prefix()` abbreviation matching.
3. **Trust/privilege gating:** How `char_data.trust` is compared against the command's
   required trust level. How `get_trust()` works.
4. **Position checking:** How `char_data.position` is validated against the command's
   minimum position requirement.
5. **Command lag:** How `char_data.wait` is set after command execution and how it
   prevents subsequent commands.
6. **Substate system:** How `char_data.substate` (`SUB_*` values) enables multi-step
   commands (e.g., editing, writing).
7. **Command flags:** Document all `CMD_FLAG_*` values and their effects.
8. **Social commands:** Are socials in the same table or a separate system? How are
   they dispatched?
9. **Command logging:** Global log, per-command log flags, watch files, timing.
10. **Disabled commands:** How commands can be disabled at runtime.

---

## Output

- **Create** `COMMANDS.md` with heading `# SMAUG 2.0 Command Inventory`.
- Add section `## Command Dispatch System` with the interpreter analysis.
- Add section `## Player Commands` — list every player command found in the command
  table with: name, minimum trust, minimum position, log flag, brief description.
- **Append** to `ANALYSIS.md` section `## 7. Command Interpreter`.

---

## Acceptance Criteria

- [ ] `COMMANDS.md` created with dispatch system documentation.
- [ ] Every command in the command table listed with trust/position/flags.
- [ ] Hash table and abbreviation matching documented.
- [ ] Substate system documented with all `SUB_*` values found.
- [ ] Social command system documented.

---

*End of PHASE_1G*
