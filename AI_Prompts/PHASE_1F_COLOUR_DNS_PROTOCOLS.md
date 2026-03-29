# Phase 1F — Colour, DNS & Protocols

> **SMAUG 2.0 Legacy Codebase Analysis — Phase 1 Sub-Phase F**

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
| `color.c` / `colorize.c` | ~800 | ANSI colour code processing |
| `dns.c` / `resolv.c` | ~400 | DNS resolution for new connections |
| `protocol.c` | ~1,500 | Telnet option negotiation, MSDP, MSSP, MXP, GMCP |

---

## Specific Instructions

### Colour System
1. Document all colour code formats: `&X`, `^X`, `}X` — what each prefix means.
2. Document the mapping from colour codes to ANSI escape sequences.
3. How colour stripping works (for clients that don't support ANSI).
4. How `colorize.c` differs from `color.c` (if both exist).
5. The `char_data` fields that control colour preferences.

### DNS Resolution
1. How DNS lookups are performed for new connections.
2. Is it blocking or non-blocking? If non-blocking, how is the async result handled?
3. Caching mechanism (if any).

### Protocol Negotiation
1. **Telnet options:** Which options are negotiated (NAWS, TTYPE, etc.).
2. **MSDP** (MUD Server Data Protocol): What variables are exposed, how updates are sent.
3. **MSSP** (MUD Server Status Protocol): What server info is advertised.
4. **MXP** (MUD eXtension Protocol): What MXP tags are used.
5. **GMCP** (Generic MUD Communication Protocol): What packages are supported.
6. **ATCP:** Any ATCP support found.

---

## Output

- **Append** to `ANALYSIS.md` section `## 6. Colour, DNS & Protocols`.

---

## Acceptance Criteria

- [ ] All colour code formats documented with ANSI mappings.
- [ ] DNS resolution mechanism documented.
- [ ] Every supported protocol (MSDP, MSSP, MXP, GMCP, ATCP) documented.
- [ ] Telnet option negotiation sequence documented.

---

*End of PHASE_1F*
