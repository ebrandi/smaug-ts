# SMAUG 2.0 TypeScript Port — Phase 4: Feature Parity Verification

> **Context:** This is Phase 4 of a multi-phase port of the SMAUG 2.0 MUD engine from C to Node.js/TypeScript. Phases 1–2 scaffolded the full project structure, installed dependencies, created stub files, configured the build toolchain (TypeScript, Vitest, ESLint, Prisma), and wired up the core engine skeleton. Phase 3 (sub-phases 3A–3F) implemented all game systems: utilities, world loader, command parser, movement, look/examine, combat, magic, skills, affects, inventory, economy, progression, communication, social systems, persistence, MUDprogs, admin tools, OLC, the admin dashboard, and the browser play UI.
>
> **Your role:** You are an expert TypeScript/Node.js engineer performing a systematic feature parity audit of the completed port against the legacy SMAUG 2.0 C codebase. You have access to five reference documents:
> - `COMMANDS.md` — Full command table with trust levels, positions, flags, and execution flow
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `STRUCTURE.md` — File inventory and subsystem grouping
>
> **Cardinal rules:**
> 1. **Be exhaustive.** Every single command, system, and feature documented in the reference files must be checked. Do not skip anything because it "seems minor".
> 2. **Check the actual code, not just file existence.** A stub file with empty method bodies is MISSING, not DONE. A file with partial logic (e.g. handles 3 of 7 sub-commands) is PARTIAL.
> 3. **Use the exact status labels:** `DONE`, `PARTIAL`, or `MISSING`. No other labels.
> 4. **For PARTIAL or MISSING items, add a `// TODO PARITY:` comment** in the relevant source file explaining what is missing and referencing the legacy behaviour from the docs.
> 5. **Do not change any working game logic.** This phase is read-heavy. The only code changes permitted are adding `// TODO PARITY:` comments.
> 6. **Preserve all existing tests.** Do not modify or delete any test file. You may add new test stubs (empty `it.todo(...)` blocks) for missing features.
> 7. **Use TypeScript and ES module syntax** for any new test stubs.
> 8. **Output `PARITY.md` in the project root** as the primary deliverable.

---

## Phase 4 Deliverables

### 1. `PARITY.md` — Master Checklist

Generate a markdown file at the project root called `PARITY.md` with the following structure:

```markdown
# SMAUG 2.0 TypeScript Port — Feature Parity Report

Generated: <current date>
Audited against: COMMANDS.md, ANALYSIS.md, DATAMODEL.md, ARCHITECTURE.md

## Summary

| Status  | Count |
|---------|-------|
| DONE    | ???   |
| PARTIAL | ???   |
| MISSING | ???   |
| **Total** | **???** |

## 1. Player Commands

| # | Command | Position | Trust | Status | Notes |
|---|---------|----------|-------|--------|-------|
| 1 | north | POS_STANDING | 0 | DONE / PARTIAL / MISSING | ... |
| 2 | south | POS_STANDING | 0 | DONE / PARTIAL / MISSING | ... |
| ... | ... | ... | ... | ... | ... |

## 2. Immortal / Admin Commands

| # | Command | Position | Trust | Status | Notes |
|---|---------|----------|-------|--------|-------|
| 1 | goto | POS_DEAD | 61 | DONE / PARTIAL / MISSING | ... |
| ... | ... | ... | ... | ... | ... |

## 3. Social Commands

| # | Social | Status | Notes |
|---|--------|--------|-------|
| 1 | social system loader | DONE / PARTIAL / MISSING | ... |
| 2 | social dispatch (check_social) | DONE / PARTIAL / MISSING | ... |
| 3 | ignore filtering in socials | DONE / PARTIAL / MISSING | ... |

## 4. Game Systems

| # | System | Status | Notes |
|---|--------|--------|-------|
| 1 | Combat round engine | DONE / PARTIAL / MISSING | ... |
| 2 | Spell casting pipeline | DONE / PARTIAL / MISSING | ... |
| ... | ... | ... | ... |

## 5. Data Persistence

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Player save (PostgreSQL) | DONE / PARTIAL / MISSING | ... |
| ... | ... | ... | ... |

## 6. Network & Protocol

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Telnet negotiation | DONE / PARTIAL / MISSING | ... |
| ... | ... | ... | ... |

## 7. Admin Dashboard & Browser UI

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | REST API endpoints | DONE / PARTIAL / MISSING | ... |
| ... | ... | ... | ... |
```

### 2. `// TODO PARITY:` Comments in Source Files

For every item marked **PARTIAL** or **MISSING** in `PARITY.md`, insert a comment in the most relevant source file:

```typescript
// TODO PARITY: <command/feature name> — <status>
// Legacy behaviour: <1-2 sentence description from COMMANDS.md / ANALYSIS.md>
// Reference: <doc name> § <section number>
```

**Placement rules:**
- For a MISSING command: place the comment in the command handler file where it would be registered (e.g. `src/commands/handlers/combat.ts` for a missing combat command).
- For a PARTIAL command: place the comment inside the existing handler function, immediately before the `return` or at the end of the function body.
- For a MISSING system: place the comment at the top of the most relevant module file.
- Group related TODO comments together; do not scatter them randomly.

### 3. Test Stubs for Missing Features

For every MISSING or PARTIAL item, add a `it.todo(...)` block in the appropriate test file:

```typescript
it.todo('should implement <command/feature> — see PARITY.md');
```

If no test file exists for the relevant module, create one with the standard structure:

```typescript
import { describe, it } from 'vitest';

describe('<ModuleName> — Parity Gaps', () => {
  it.todo('should implement <feature> — see PARITY.md');
});
```

---

## Audit Scope — Complete Command Inventory

The following is the **complete list of commands** extracted from `COMMANDS.md` that must each be verified. Check every single one.

### Player Movement Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| north | POS_STANDING | 0 |
| south | POS_STANDING | 0 |
| east | POS_STANDING | 0 |
| west | POS_STANDING | 0 |
| up | POS_STANDING | 0 |
| down | POS_STANDING | 0 |
| northeast | POS_STANDING | 0 |
| northwest | POS_STANDING | 0 |
| southeast | POS_STANDING | 0 |
| southwest | POS_STANDING | 0 |

### Player Combat Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| backstab | POS_STANDING | 0 |
| bash | POS_STANDING | 0 |
| bashdoor | POS_STANDING | 0 |
| berserk | POS_STANDING | 0 |
| bite | POS_FIGHTING | 0 |
| bloodlet | POS_STANDING | 0 |
| cleave | POS_FIGHTING | 0 |
| disarm | POS_FIGHTING | 0 |
| draw | POS_STANDING | 0 |
| flee | POS_FIGHTING | 0 |
| gouge | POS_FIGHTING | 0 |
| grapple | POS_FIGHTING | 0 |
| kick | POS_FIGHTING | 0 |
| kill | POS_FIGHTING | 0 |
| murder | POS_FIGHTING | 0 |
| poison_weapon | POS_STANDING | 0 |
| pounce | POS_STANDING | 0 |
| slice | POS_FIGHTING | 0 |
| stun | POS_STANDING | 0 |
| withdraw | POS_STANDING | 0 |

### Player Travel Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| enter | POS_STANDING | 0 |
| exits | POS_STANDING | 0 |
| follow | POS_STANDING | 0 |
| climb | POS_STANDING | 0 |
| drag | POS_STANDING | 0 |
| dismount | POS_MOUNTED | 0 |
| mount | POS_STANDING | 0 |
| shove | POS_STANDING | 0 |
| survey | POS_STANDING | 0 |

### Player Information & Status Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| look | POS_STANDING | 0 |
| examine | POS_STANDING | 0 |
| glance | POS_STANDING | 0 |
| score | POS_STANDING | 0 |
| time | POS_STANDING | 0 |
| weather | POS_STANDING | 0 |
| who | POS_STANDING | 0 |
| wizwho | POS_STANDING | 0 |
| changes | POS_STANDING | 0 |
| news | POS_STANDING | 0 |
| help | POS_STANDING | 0 |
| hlist | POS_STANDING | 0 |

### Player Interaction Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| ask | POS_STANDING | 0 |
| buy | POS_STANDING | 0 |
| cast | POS_STANDING | 0 |
| close | POS_STANDING | 0 |
| compare | POS_STANDING | 0 |
| consider | POS_STANDING | 0 |
| cook | POS_RESTING | 0 |
| council_induct | POS_STANDING | 0 |
| council_outcast | POS_STANDING | 0 |
| drop | POS_STANDING | 0 |
| eat | POS_RESTING | 0 |
| fill | POS_STANDING | 0 |
| findnote | POS_STANDING | 0 |
| fire | POS_STANDING | 0 |
| give | POS_STANDING | 0 |
| gohome | POS_STANDING | 0 |
| group | POS_STANDING | 0 |
| gtell | POS_STANDING | 0 |
| gwhere | POS_STANDING | 0 |
| hold | POS_STANDING | 0 |
| house | POS_STANDING | 0 |
| ignore | POS_STANDING | 0 |
| lock | POS_STANDING | 0 |
| open | POS_STANDING | 0 |
| order | POS_STANDING | 0 |
| pick | POS_STANDING | 0 |
| play | POS_STANDING | 0 |
| pour | POS_STANDING | 0 |
| practice | POS_STANDING | 0 |
| put | POS_STANDING | 0 |
| quaff | POS_STANDING | 0 |
| recite | POS_STANDING | 0 |
| remove | POS_STANDING | 0 |
| rent | POS_STANDING | 0 |
| repair | POS_STANDING | 0 |
| rest | POS_RESTING | 0 |
| sell | POS_STANDING | 0 |
| share | POS_STANDING | 0 |
| sheath | POS_STANDING | 0 |
| sit | POS_SITTING | 0 |
| sleep | POS_SLEEPING | 0 |
| speak | POS_STANDING | 0 |
| split | POS_STANDING | 0 |
| stand | POS_STANDING | 0 |
| take | POS_STANDING | 0 |
| tell | POS_STANDING | 0 |
| tip | POS_STANDING | 0 |
| unholster | POS_STANDING | 0 |
| unlock | POS_STANDING | 0 |
| wear | POS_STANDING | 0 |
| wield | POS_STANDING | 0 |
| wimpy | POS_STANDING | 0 |
| yell | POS_STANDING | 0 |

### Player Communication Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| say | POS_RESTING | 0 |
| say_to | POS_RESTING | 0 |
| tell | POS_RESTING | 0 |
| reply | POS_RESTING | 0 |
| retell | POS_RESTING | 0 |
| whisper | POS_RESTING | 0 |
| shout | POS_RESTING | 0 |
| chat | POS_RESTING | 0 |
| clantalk | POS_RESTING | 0 |
| ordertalk | POS_RESTING | 0 |
| counciltalk | POS_RESTING | 0 |
| guildtalk | POS_RESTING | 0 |
| music | POS_RESTING | 0 |
| newbiechat | POS_RESTING | 0 |
| immtalk | POS_RESTING | 61 |
| muse | POS_RESTING | 62 |
| retiredtalk | POS_RESTING | 0 |
| think | POS_RESTING | 0 |
| avtalk | POS_RESTING | 0 |
| wartalk | POS_RESTING | 0 |
| ask | POS_RESTING | 0 |
| answer | POS_RESTING | 0 |
| racetalk | POS_RESTING | 0 |
| traffic | POS_RESTING | 0 |
| repeat | POS_RESTING | 0 |
| emote | POS_RESTING | 0 |
| beckon | POS_STANDING | 0 |
| languages | POS_RESTING | 0 |

### Player Colour & Display Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| color | POS_DEAD | 0 |
| color default | POS_DEAD | 0 |
| color theme | POS_DEAD | 0 |
| color ansi | POS_DEAD | 0 |

### Player Economy Commands
| Command | Min Position | Trust |
|---------|-------------|-------|
| bank (balance) | POS_STANDING | 0 |
| bank (deposit) | POS_STANDING | 0 |
| bank (withdraw) | POS_STANDING | 0 |
| bank (transfer) | POS_STANDING | 0 |
| quest | POS_STANDING | 0 |
| homebuy | POS_STANDING | 0 |
| sellhouse | POS_STANDING | 0 |
| accessories | POS_STANDING | 0 |

### Immortal / Admin Commands (trust ≥ 61)
| Command | Trust | Category |
|---------|-------|----------|
| invis | 61 | Core Immortal |
| ghost | 61 | Core Immortal |
| switch | 61 | Core Immortal |
| return | 61 | Core Immortal |
| at | 61 | Core Immortal |
| force | 61 | Core Immortal |
| freeze | 61 | Player Management |
| thaw | 61 | Player Management |
| wizlock | 65 | System |
| wizhelp | 61 | Information |
| restrict | 65 | System |
| ban | 61 | Player Management |
| allow | 61 | Player Management |
| warn | 61 | Player Management |
| deny | 61 | Player Management |
| disconnect | 61 | Player Management |
| forceclose | 61 | Player Management |
| pcrename | 65 | Player Management |
| delete_char | 65 | Player Management |
| advance | 65 | Player Management |
| mortalize | 65 | Player Management |
| immortalize | 65 | Player Management |
| trust | 65 | Player Management |
| dnd | 61 | Core Immortal |
| holylight | 61 | Core Immortal |
| reset | 61 | World Building |
| reboot | 65 | System |
| shutdown | 65 | System |
| loadup | 61 | World Building |
| savearea | 61 | World Building |
| installarea | 65 | World Building |
| redit | 61 | OLC |
| mredit | 61 | OLC |
| oredit | 61 | OLC |
| wstat | 61 | Information |
| bestow | 65 | Player Management |
| bestowarea | 65 | Player Management |
| cset | 65 | Settings |
| mset | 61 | OLC |
| oset | 61 | OLC |
| rset | 61 | OLC |
| sset | 65 | OLC |
| hset | 65 | OLC |
| aassign | 61 | OLC |
| massign | 61 | OLC |
| rassign | 61 | OLC |
| vassign | 61 | OLC |
| transfer | 61 | World Manipulation |
| retransfer | 61 | World Manipulation |
| regoto | 61 | World Manipulation |
| goto | 61 | World Manipulation |
| rat | 61 | World Manipulation |
| restore | 61 | World Manipulation |
| restoretime | 61 | Information |
| purge | 61 | World Manipulation |
| minvoke | 61 | World Manipulation |
| oinvoke | 61 | World Manipulation |
| statshield | 61 | Player Management |
| scatter | 61 | World Manipulation |
| strew | 61 | World Manipulation |
| snoop | 61 | Monitoring |
| watch | 61 | Monitoring |
| mwhere | 61 | Monitoring |
| ofind | 61 | Monitoring |
| mfind | 61 | Monitoring |
| gwhere | 61 | Monitoring |
| gfighting | 61 | Monitoring |
| oclaim | 61 | Monitoring |
| bodybag | 61 | Monitoring |
| last | 61 | Audit |
| users | 61 | Audit |
| wizlist | 61 | Information |
| adminlist | 61 | Information |
| retiredlist | 61 | Information |
| ipcompare | 61 | Audit |
| check_vnums | 61 | Audit |
| vnums | 61 | Audit |
| vsearch | 61 | Audit |
| vstat | 61 | Audit |
| rstat | 61 | Audit |
| mstat | 61 | Audit |
| ostat | 61 | Audit |
| loop | 65 | Special |
| low_purge | 61 | World Manipulation |
| balzhur | 65 | Punishment |
| elevate | 65 | Player Management |
| nohomepage | 61 | Player Management |
| nodesc | 61 | Player Management |
| nohttp | 61 | Player Management |
| nobio | 61 | Player Management |
| nobeckon | 61 | Player Management |
| delay | 61 | Player Management |
| authorize | 61 | Authorization |
| hell | 61 | Punishment |
| unhell | 61 | Punishment |
| makeadminlist | 65 | System |
| immhost | 65 | System |
| setvault | 65 | System |

---

## Audit Scope — Game Systems

Beyond individual commands, verify the following **systems** are fully implemented. For each, check the specific sub-features listed.

### Combat System
- [ ] Combat round engine (`violence_update`, multi-attack, dual wield)
- [ ] Damage calculation (damroll, weapon dice, strength bonus, vulnerability)
- [ ] Death handling (corpse creation, gold split, experience loss, ghost state)
- [ ] Flee mechanics (random exit, experience loss, mount handling)
- [ ] Position-based combat stances (defensive, aggressive, evasive, berserk)
- [ ] Disarm, bash, kick, gouge, grapple, cleave, backstab, stun, pounce
- [ ] Archery system (draw, fire, ammunition tracking)
- [ ] Poison weapon skill

### Magic & Spell System
- [ ] `do_cast()` full pipeline (position, room flags, guild, sector, mana, target, components, failure chance)
- [ ] Spell slot resolution (slot numbers → spell lookup)
- [ ] All spell target types (offensive, defensive, self, object, room)
- [ ] Spell components system
- [ ] Spell failure chance based on class/level
- [ ] Mana deduction (full on success, half on failure)

### Skill & Proficiency System
- [ ] Skill learning via `practice` command at guild masters
- [ ] Proficiency improvement on use (LEARNED percentage)
- [ ] Skill availability by class/level
- [ ] Adept cap per class

### Affect / Buff System
- [ ] Affect application with duration, modifier, location, bitvector
- [ ] Affect stacking rules (same spell replaces or extends)
- [ ] Affect tick-down and removal
- [ ] Equipment affects (APPLY_WEARSPELL, APPLY_REMOVESPELL)
- [ ] SMAUG affect format (duration formula, modifier formula, location, bitvector)

### World Management
- [ ] Vnum system (three parallel hash tables: mob, obj, room)
- [ ] Area loading from JSON files
- [ ] Reset engine (M, O, P, G, E, D, R reset types)
- [ ] Area reset timer and conditions
- [ ] Teleport rooms (tele_vnum, tele_delay)
- [ ] Virtual rooms (generate_exit)

### Movement System
- [ ] Sector-based movement costs
- [ ] Encumbrance multiplier
- [ ] Exit validation (closed, locked, secret, fly, climb)
- [ ] Door mechanics (open, close, lock, unlock, pick, bashdoor)
- [ ] Mount system (movement from mount's pool, floating mounts)
- [ ] Follower/group movement
- [ ] BFS pathfinding (track command)
- [ ] Overland map system (coordinate movement, map display, landmarks, entrances)
- [ ] Dragonflight module (call, release, land, fly, landing_sites, setlanding)

### Communication System
- [ ] All channels (chat, clantalk, ordertalk, counciltalk, guildtalk, music, newbiechat, immtalk, muse, retiredtalk, think, avtalk, wartalk, racetalk, traffic)
- [ ] Channel deaf system (bitvector toggling)
- [ ] Language system (speak, languages, translate, scramble, comprehension threshold)
- [ ] Ignore system (ignore command, is_ignoring checks on all comm)
- [ ] Tell history (26-slot array, repeat command)
- [ ] Pager system (buffered output, Space/Enter/Q navigation)
- [ ] Prompt system (main prompt, fight prompt, sub-prompt, variable substitution)
- [ ] ANSI colour system (&X, ^X, }X syntax, per-character colour customisation)

### Economy System
- [ ] Three-currency system (gold, silver, copper) with conversion
- [ ] Shop buy/sell with charisma/race modifiers and trade restrictions
- [ ] Repair shop system (fix types, recharge, repairall surcharge)
- [ ] Bank system (deposit, withdraw, transfer, balance)
- [ ] Quest system (automated generation, kill/recover types, rewards, timers, cooldowns)
- [ ] Housing system (room limits, keys, accessories, gohome)
- [ ] Auction system (homebuy, sellhouse, bidding, penalties)

### Social & Guild Systems
- [ ] Clan system (types, leadership hierarchy, induction, outcast, PK tracking)
- [ ] Council system (head/head2, no PK)
- [ ] Guild system (class-specific, skill grants)
- [ ] PK mechanics (PCFLAG_DEADLY, shove/drag, PK timers)
- [ ] Board system (note, mail, voting, journal)
- [ ] Marriage system (marry, divorce, rings)

### MUD Programming (Scripting)
- [ ] Mob/Object/Room program execution engine
- [ ] All trigger types (43 mob, 14 object, 14 room)
- [ ] Script language (if/or/else/endif, operators, directives)
- [ ] Variable substitution ($n, $t, $i, $r, $p, etc.)
- [ ] Ifcheck conditions (full library: ispc, isnpc, level, class, rand, etc.)
- [ ] mpsleep system (pause and resume execution)
- [ ] supermob abstraction for object/room progs
- [ ] mpxset runtime entity modification (mpmset, mposet)

### Persistence
- [ ] Player save to PostgreSQL via Prisma (all fields from pc_data)
- [ ] Player load with full state restoration (affects, inventory, equipment, skills, clan, quest)
- [ ] World data in JSON flat files (areas, rooms, mobs, objects, resets, shops)
- [ ] Save triggers (death, quit, auto-save, hotboot)
- [ ] Object serial number tracking

### Network & Protocol
- [ ] Telnet listener (port 4000)
- [ ] WebSocket listener (port 3001)
- [ ] Login state machine (Nanny: name → password → race → class → stats → MOTD → playing)
- [ ] Telnet option negotiation (CHARSET, NAWS, TTYPE)
- [ ] MSDP (37 variables, report/dirty tracking)
- [ ] MSSP (server statistics)
- [ ] MCCP (zlib compression)
- [ ] MSP (sound triggers)
- [ ] MXP (rich text, hyperlinks)
- [ ] ATCP / GMCP
- [ ] DNS caching for new connections
- [ ] Command alias system

### Admin & OLC
- [ ] Trust level hierarchy (50–65)
- [ ] Authorization workflow (auth_state 0–4)
- [ ] Hell/jail system (hell, unhell, auto-release)
- [ ] Ban system (site, race, class bans with duration and types)
- [ ] Immortal host filtering (immhost)
- [ ] Snoop system (permission checks, DND respect)
- [ ] Restore system (restore all cooldown, boost multiplier)
- [ ] Watch system (player, site, command watches with log files)
- [ ] WIZINVIS system (level-based invisibility)
- [ ] OLC room editor (all properties: text, flags, exits, teleport, tunnel)
- [ ] OLC mob editor (all properties: combat, attributes, RIS, behaviour)
- [ ] OLC object editor (all properties: type, flags, values, affects)
- [ ] OLC area file saving (fold_area equivalent)
- [ ] Vnum range enforcement for builders
- [ ] Editor state machine (CON_EDITING, substates, /s /c /l commands)
- [ ] Interior building (menu-driven OLC)

### Admin Dashboard & Browser UI
- [ ] REST API: GET /api/stats (player count, uptime, area count)
- [ ] REST API: GET /api/players (online player list)
- [ ] REST API: GET /api/areas (area list with reset timers)
- [ ] REST API: POST /api/admin/broadcast (send global message)
- [ ] REST API: POST /api/admin/shutdown (graceful shutdown)
- [ ] REST API: POST /api/admin/reboot (reboot)
- [ ] JWT authentication for admin routes
- [ ] Browser play UI (React terminal with ANSI rendering)
- [ ] WebSocket integration for browser client

### Time, Weather & NPC AI
- [ ] Time system (time_update on PULSE_TICK / 70s)
- [ ] Weather system (weather_update on PULSE_TICK)
- [ ] NPC AI (mobile_update on 4s: special procs, MUDprog scripts, wandering, fleeing, scavenging, random triggers, time-based AI)

### News System
- [ ] Multi-category news (10 types)
- [ ] HTML output generation
- [ ] Extended buffer for multi-line posts

### Substate System
- [ ] All SUB_* constants (SUB_NONE through SUB_NEWS_EDIT, plus timer substates)
- [ ] SUB_REPEATCMD handling (re-execute last command with new argument)
- [ ] Multi-step command support via substate transitions

### Wait/Lag System
- [ ] WAIT_STATE macro equivalent (nuisance modifier)
- [ ] Command lag detection (>1.5s flagging)
- [ ] Lag counter per command

### Command Flags
- [ ] CMD_FLAG_POSSESS (blocked if AFF_POSSESS)
- [ ] CMD_FLAG_POLYMORPHED (blocked if polymorphed)
- [ ] CMD_WATCH (watch list logging)
- [ ] CMD_FLAG_RETIRED (available to retired players)
- [ ] CMD_FLAG_NO_ABORT (cannot abort via timers)

### Logging
- [ ] Global command logging (log_string_plus with log levels)
- [ ] Watch file logging (per-immortal watch files in WATCH_DIR)
- [ ] Command timing logging (LAG prefix for slow commands)

---

## Procedure

Follow these steps in order:

### Step 1: Inventory Scan
Read every file in `src/` recursively. For each file, note:
- Whether it contains actual implementation (not just stubs/interfaces)
- Which commands/features it implements
- Any obvious gaps (empty method bodies, placeholder comments, unfinished switch cases)

### Step 2: Cross-Reference Against COMMANDS.md
Go through the **complete command inventory** above (Sections: Player Movement, Player Combat, Player Travel, Player Information, Player Interaction, Player Communication, Player Colour, Player Economy, Immortal/Admin). For each command:
1. Find the handler function in the codebase
2. Verify it is registered in the CommandRegistry
3. Check that the handler implements the full behaviour described in COMMANDS.md (not just a skeleton)
4. Assign status: DONE, PARTIAL, or MISSING

### Step 3: Cross-Reference Against ANALYSIS.md Systems
Go through the **game systems checklist** above. For each system and sub-feature:
1. Find the implementing module
2. Verify the logic matches the legacy behaviour documented in ANALYSIS.md
3. Assign status: DONE, PARTIAL, or MISSING

### Step 4: Generate PARITY.md
Write the complete `PARITY.md` file with all tables populated and summary counts.

### Step 5: Insert TODO Comments
For every PARTIAL or MISSING item, add `// TODO PARITY:` comments in the relevant source files as specified above.

### Step 6: Add Test Stubs
For every PARTIAL or MISSING item, add `it.todo(...)` blocks in the appropriate test files.

### Step 7: Final Verification
- Run `npx tsc --noEmit` — must produce zero errors (TODO comments don't break compilation)
- Run `npx vitest run` — all existing tests must still pass
- Verify `PARITY.md` exists and is well-formed markdown
- Verify the summary counts in `PARITY.md` match the actual table entries

---

## Acceptance Criteria

- [ ] `PARITY.md` exists in the project root with all sections populated.
- [ ] Every command from the inventory above appears in `PARITY.md` with a status.
- [ ] Every game system from the systems checklist appears in `PARITY.md` with a status.
- [ ] Summary counts (DONE / PARTIAL / MISSING / Total) are accurate.
- [ ] Every PARTIAL or MISSING item has a corresponding `// TODO PARITY:` comment in a source file.
- [ ] Every PARTIAL or MISSING item has a corresponding `it.todo(...)` in a test file.
- [ ] `npx tsc --noEmit` produces zero errors.
- [ ] `npx vitest run` passes (all existing tests still green).
- [ ] No working game logic has been modified — only comments and test stubs added.
