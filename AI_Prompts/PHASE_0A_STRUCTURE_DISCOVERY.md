# SMAUG 2.0 Legacy Codebase — Phase 0A: Structure Discovery

> **Context:** This is Phase 0A of a multi-phase analysis of the SMAUG 2.0 MUD engine's
> legacy C codebase. The source files reside in `legacy/` relative to your working directory.
> No analysis of file *contents* has been performed yet — this phase is strictly about
> cataloguing what exists and forming hypotheses from filenames and sizes alone.
>
> **Your role:** You are an expert C systems programmer and software archaeologist with
> deep knowledge of MUD engine architecture (Diku → Merc → SMAUG lineage). Your task is
> to produce a comprehensive structural inventory of the legacy codebase without reading
> any source file contents. You will use only filesystem metadata (filenames, extensions,
> sizes, line counts) to build a subsystem map.
>
> **Output:** A single Markdown file, `STRUCTURE.md`, placed in the project root.

---

## Cardinal Rules

1. **Do NOT read file contents.** You must not `cat`, `head`, `less`, or otherwise inspect
   the interior of any `.c` or `.h` file. All analysis is based on filenames, sizes, and
   line counts only.
2. **Use shell commands for data gathering.** Run `find`, `wc`, `ls`, `du`, and similar
   utilities to collect metadata. Record the exact commands you run and their output.
3. **Be exhaustive.** Every `.c` and `.h` file in `legacy/` and its subdirectories must
   appear in the inventory. Do not skip files.
4. **Hypothesise, don't assert.** When grouping files into subsystems, use language like
   "likely", "appears to be", "suggests" — you have not read the code yet.
5. **Preserve raw data.** Include the full output of your line-count and size commands in
   the document so that later phases can reference exact numbers.
6. **Write Markdown only.** Output must be well-structured Markdown with tables, headers,
   and bullet lists. No HTML, no LaTeX.
7. **Single output file.** All output goes into `STRUCTURE.md`. Do not create additional files.
8. **Do not modify any legacy files.** The `legacy/` directory is read-only for all phases.

---

## Deliverable: STRUCTURE.md

The file must contain the following sections in order.

### §1. Metadata

- Date generated
- Total number of `.c` files
- Total number of `.h` files
- Total number of other source-adjacent files (`.txt`, `.sh`, `Makefile`, etc.)
- Total lines of code (sum of all `.c` and `.h` files)
- Total size on disk

### §2. Directory Layout

Run and record:

```bash
find legacy/ -type f \( -name "*.c" -o -name "*.h" \) | head -5
# then the full listing
find legacy/ -type d | sort
```

Document every subdirectory under `legacy/` and what file types it contains.

### §3. Complete File Inventory

Produce a Markdown table with **every** `.c` and `.h` file, sorted by path:

| File | Extension | Lines | Bytes | Subdirectory |
|------|-----------|-------|-------|--------------|

Run and record:

```bash
find legacy/ -name "*.c" -o -name "*.h" | xargs wc -l | sort -rn
find legacy/ -name "*.c" -o -name "*.h" | xargs wc -c | sort -rn
```

### §4. Top 20 Largest Files by Line Count

Markdown table, descending by lines. Include rank, filename, line count, and byte size.

Run:

```bash
find legacy/ -name "*.c" -o -name "*.h" | xargs wc -l | sort -rn | head -21
```

(21 to account for the `total` line.)

### §5. Header vs Implementation Ratio

For each `.h` file, check whether a corresponding `.c` file exists (same basename).
Produce a table:

| Header File | Matching .c File | .h Lines | .c Lines | Ratio |
|-------------|------------------|----------|----------|-------|

List any orphan headers (no matching `.c`) and orphan implementations (no matching `.h`).

### §6. Subsystem Grouping Hypothesis

Group every file into one of the following candidate subsystems based on filename patterns.
If a file could belong to multiple groups, list it in the most likely one and note the
ambiguity.

Candidate subsystem categories (you may add more if the filenames suggest them):

- **Core Engine** — main loop, entry point, signal handling
- **Network & Protocol** — socket I/O, telnet, MCCP, MSDP, MSSP, MXP, DNS
- **Database & Persistence** — file I/O, loading, saving, string hashing
- **Command Interpreter** — command dispatch, command tables
- **Character System** — player management, creation, login
- **Action Handlers** — `act_*.c` files (wizard, info, communication, object, movement)
- **Combat & Stances** — fighting, damage, stances
- **Magic & Skills** — spells, skills, spell tables
- **World Building (OLC)** — online creation editors
- **World Systems** — areas, rooms, resets, overland, planes
- **Economy & Shops** — shops, repair, banking, currency
- **Social & Organisation** — clans, councils, deities, marriage, boards
- **Quest & Progression** — quests, experience, levelling
- **Communication** — channels, language, colour
- **Weather & Time** — weather simulation, time tracking, timezones
- **MUD Programs** — mprog scripting engine
- **Housing & Auction** — player housing, auction system
- **News & Content** — news system, help files
- **Security & Admin** — bans, admin lists, immortal host filtering
- **Utilities** — dice, colour, miscellaneous helpers
- **Third-Party / Vendored** — SHA256, mongoose/HTTP, external libraries
- **Tools** — standalone utilities (renumber, mapout, etc.)

For each group, list:
- Files assigned
- Estimated total lines
- Brief rationale for the grouping

### §7. Observations and Anomalies

Note anything unusual:
- Files with unexpectedly large or small sizes
- Naming inconsistencies (e.g., multiple object editors: `omedit.c`, `oredit.c`, `ooedit.c`)
- Files that don't fit any obvious subsystem
- Potential dead code or deprecated files
- Evidence of third-party code (different naming conventions, licence headers visible in filename)

### §8. Dependency Hints from Filenames

Without reading contents, hypothesise which files likely `#include` which headers based on
naming conventions. For example:
- `fight.c` likely includes `mud.h`
- `overland.c` likely includes `overland.h`
- All files likely include `mud.h` (the main header)

### §9. Recommended Reading Order

Based on the structural analysis, recommend an order for reading the source files in
subsequent phases. Prioritise:
1. The main header file(s) — to understand data structures
2. The entry point / main loop — to understand program flow
3. Database/loading — to understand data formats
4. The command interpreter — to understand dispatch
5. Core game systems in dependency order

---

## Acceptance Criteria

- [ ] `STRUCTURE.md` exists in the project root.
- [ ] Every `.c` and `.h` file under `legacy/` appears in the inventory table.
- [ ] The top-20 table matches the output of the `wc -l` command.
- [ ] Every file is assigned to exactly one subsystem group.
- [ ] No file contents were read (no code snippets, no struct definitions, no function names
      appear in the document — only filenames, sizes, and line counts).
- [ ] The document includes the raw shell command outputs used to gather data.
- [ ] The recommended reading order is provided and justified.

---

*End of PHASE_0A_STRUCTURE_DISCOVERY.md*
