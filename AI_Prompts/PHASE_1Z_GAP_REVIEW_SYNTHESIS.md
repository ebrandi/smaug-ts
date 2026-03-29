# Phase 1Z — Gap Review & Synthesis

> **SMAUG 2.0 Legacy Codebase Analysis — Phase 1 Sub-Phase Z (Final)**

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

**No new source files.** This sub-phase reads only the output files.

---

## Required Reading

Read these files completely before starting:
1. `STRUCTURE.md` — the complete file inventory
2. `DATAMODEL.md` — the complete data model from headers
3. `ANALYSIS.md` — all accumulated analysis from sub-phases 1A–1Y
4. `COMMANDS.md` — all accumulated command documentation

---

## Specific Instructions

### §1. Coverage Audit

1. Open `STRUCTURE.md` and list every `.c` file in the codebase.
2. For each file, verify it has been analysed in `ANALYSIS.md`.
3. Produce a coverage table:

| File | Analysed? | Sub-Phase | Notes |
|------|-----------|-----------|-------|

4. If any files are missing, read them now and append their analysis to `ANALYSIS.md`.

### §2. Phase 0B Unknown Resolution

1. Search `DATAMODEL.md` for every `[UNCLEAR` marker.
2. For each, verify it has been resolved in `ANALYSIS.md` by the sub-phase that
   analysed the relevant `.c` file.
3. If any remain unresolved, investigate now and document the resolution.

### §3. Architecture Overview

Produce a high-level architecture overview to be **prepended** to `ANALYSIS.md`
(after the title). This should include:

1. **System dependency graph** — which subsystems depend on which others.
   Produce as a Mermaid diagram.
2. **Data flow overview** — how data flows from area files through boot loading
   into runtime structures, and how player data flows between memory and disk.
3. **Event/pulse architecture** — the complete timing hierarchy from `game_loop()`
   through all pulse-driven updates.

### §4. Cross-Cutting Synthesis

Produce synthesis sections that span multiple sub-phases:

1. **Entity Lifecycle** — birth to death for Characters, Objects, Rooms.
   Synthesised from 1C + 1D + 1H + 1W.
2. **The Complete Login Flow** — from TCP accept to playing. Synthesised from
   1E + 1D + 1W.
3. **Area Lifecycle** — load → play → reset → save. Synthesised from 1C + 1D + 1Y.
4. **Command Execution Pipeline** — synthesised from 1G + 1H.
5. **Combat Round Flow** — synthesised from 1I + 1Y.
6. **Spell Casting Pipeline** — synthesised from 1J.
7. **Experience & Levelling** — synthesised from 1I + 1K + 1Y.
8. **NPC AI Behaviour** — synthesised from 1Y + 1S.

### §5. Legacy Quirks Catalogue

Compile from all sub-phases into a single table:

| ID | File | Description | Severity | Port Decision |
|----|------|-------------|----------|---------------|

Severity: `info`, `warn`, `bug`.
Port Decision: `replicate`, `fix`, `investigate`.

### §6. Port Recommendations

Based on the complete analysis:
- Systems that can be simplified or modernised.
- Systems that must be replicated exactly for gameplay fidelity.
- Performance concerns (O(n²) loops, global scans, etc.).
- Data structures that should change (linked lists → Maps/Sets).
- Features that may be candidates for removal or deprecation.

### §7. COMMANDS.md Finalisation

Review `COMMANDS.md` for completeness:
1. Verify every command from `interp.c`'s command table is listed.
2. Verify all OLC commands are listed.
3. Verify all immortal commands are listed.
4. Add any missing commands found during the gap review.
5. Ensure consistent formatting throughout.

---

## Output

- **Prepend** Architecture Overview to `ANALYSIS.md` (after title).
- **Append** Cross-Cutting Synthesis, Legacy Quirks, and Port Recommendations to `ANALYSIS.md`.
- **Update** `COMMANDS.md` with any missing commands.

---

## Acceptance Criteria

- [ ] Every `.c` file in `STRUCTURE.md` has been analysed (coverage = 100%).
- [ ] Every Phase 0B `[UNCLEAR]` item is resolved.
- [ ] Architecture Overview section exists at the top of `ANALYSIS.md`.
- [ ] Cross-Cutting Synthesis sections are complete.
- [ ] Legacy Quirks catalogue is populated.
- [ ] Port Recommendations are provided.
- [ ] `COMMANDS.md` is complete and consistently formatted.
- [ ] No legacy files were modified.

---

*End of PHASE_1Z — this completes Phase 1 of the legacy codebase analysis.*
