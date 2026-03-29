# SMAUG 2.0 MUD Engine — Consolidated System Analysis

## Architecture Overview

**Author:** Automated analysis (2026-03-28)  
**Last Updated:** 2026-03-28  
**MUD Type:** SMAUG 2.0 (Multi-User Dungeon)  
**Language:** C (ANSI C89 with POSIX extensions)

### High-Level Architecture

SMAUG 2.0 is a single-threaded, event-driven MUD engine built around a `select()`-based I/O multiplexing loop. The engine maintains a persistent virtual world through in-memory data structures backed by human-readable text files. At its core lies a pulse-based timer system that orchestrates asynchronous updates across the game world.

#### Core Engine Components

The engine consists of several major layers:

1. **Network Layer** (`mud_comm.c`, `mongoose.c`) handles client connections via TCP sockets, managing both telnet and HTTP connections on port 4444. Protocol negotiation supports telnet options (MCCP compression, MSDP/MSSP for GUI clients, MXP for rich text, charset UTF-8) and modern client features (256-color support, unicode character rendering, sound triggers)

2. **Game Loop** (`smaug.c`) operates on a `select()` polling model with pulse-based timing. Four primary pulses orchestrate game ticks: violence (combat, 12 pulses), mobile (NPC AI, 16 pulses), area (reset/check, 240 pulses), and full tick (status updates, 280 pulses). All pulses use randomized intervals to prevent concurrent processing of all entities

3. **Database Layer** (`db.c`, `hashstr.c`) manages the virtual number (vnum) system for entity identification and persistence. The three core entity types (rooms, mobiles, objects) exist as prototypes identified by vnums and instanced at runtime. String interning deduplicates text across the codebase

4. **State Management** uses linked lists for all major entity collections (characters, objects, rooms, affects, exits) with hash tables for fast prototype lookup. The `descriptor_data` structure serves as the primary connection context, linking network clients to in-game characters

#### Data Flow: Player Input to Game Output

1. **Input Processing** (`mud_comm.c`, `interp.c`)  
   - TCP connections accepted and added to descriptor list  
   - Input buffer parsing via `read_from_descriptor()` with protocol-level handling  
   - Command splitting, buffering, and line ending normalization  
   - Command lookup in hash table (`command_hash[126]`) via prefix matching  
   - Trust/position validation before execution  

2. **Command Dispatch** (`interp.c`, `act_*.c`)  
   - Command function invocation via function pointer in `cmd_type`  
   - Argument parsing with `one_argument()`, `fread_string()` utilities  
   - Substate tracking for multi-step commands (OLC editing, delayed skills)  
   - Lag management via `char_data.wait` counters  

3. **Game Logic Updates** (`update.c`, `fight.c`)  
   - Pulse counters decrement each game tick  
   - Combat pulse (`violence_update()`) processes all active fights  
   - Mobile pulse (`mobile_update()`) handles NPC AI, MUDprogs, wandering  
   - Full tick (`char_update()`) regenerates HP/mana/move, decrements timers  

4. **Output Generation** (`send_to_char()`, `act()`, `ch_printf()`)  
   - Color code substitution via `ProtocolOutput()`  
   - Output buffering in `descriptor_data.outbuf`  
   - MCCP compression applied if negotiated  
   - Pager integration for long text output  
   - Flush on next select() loop iteration  

#### 5 Most Critical Files

| File | Lines | Purpose | Why Critical |
|------|-------|---------|-------------|
| `smaug.c` | 4,498 | Main loop, connection handling, command dispatch | Engine heartbeat; without it, no game runs |
| `interp.c` | ~4,000 | Command lookup, parsing, trust validation | Routes all player input to handlers |
| `handler.c` | 5,863 | Object/npc instance creation, movement | Core entity manipulation |
| `db.c` | 8,814 | Area loading, vnum system, string hashing | World state initialization and persistence |
| `mud.h` | 6,703 | Data structures, macros, prototypes | Single source of truth for all types |

#### Top 3 Technical Debt Areas

1. **Giant Header File (`mud.h`)** — 6,703 lines of definitions, macros, and prototypes. Violates single responsibility, increases compile times, makes refactoring difficult. Should be split by domain (data-structs.h, macros.h, config.h)

2. **God-Functions** — `act_wiz.c` (13,078 lines), `build.c` (11,286 lines), `db.c` (8,814 lines). Single files handling too many responsibilities. Hard to test, maintain, or parallelize. Should be split into command modules

3. **Global State** — Linked list heads (`first_descriptor`, `first_char`, `first_obj`) and global `system_data sysdata`. Makes testing difficult, prevents multiple world instances, complicates scaling. Should use context pointers passed to functions

---

# 1. Game Loop and Timing

# 1. Game Loop and Timing

The game loop is the heartbeat of the engine. Understanding its structure is essential for reasoning about when and how all other systems execute.

## 1.1 Main Game Loop Structure

The main loop in `smaug.c:592-828` follows a classic select/poll pattern:

```c
void game_loop() {
  while (!mud_down) {
    // 1. Accept new connections
    accept_new(control); accept_new(control2);
    accept_new(conclient); accept_new(conjava);

    // 2. Poll descriptors (non-blocking select)
    auth_check(&in_set, &out_set, &exc_set);

    // 3. Handle input for all descriptors
    for (d = first_descriptor; d; d = d_next) { /* read/process commands */ }

    // 4. Autonomous game motion
    update_handler();

    // 5. Check requests pipe
    check_requests();

    // 6. Flush output buffers
    for (d = first_descriptor; d; d = d_next) {
      if ((d->fcommand || d->outtop > 0) && FD_ISSET(d->descriptor, &out_set))
        flush_buffer(d, TRUE);
    }

    // 7. Sleep to maintain pulse rate
    // select(0, NULL, NULL, NULL, &stall_time) sleeps until next pulse
  }
}
```

**Timing constants** (from `mud.h`):

| Constant | Value | Real Time | Purpose |
|---|---|---|---|
| `PULSE_PER_SECOND` | 4 | 0.25s per pulse | Base tick rate |
| `PULSE_VIOLENCE` | 12 | 3s | Combat rounds |
| `PULSE_MOBILE` | 16 | 4s | NPC AI updates |
| `PULSE_AUCTION` | 36 | 9s | Auction ticks |
| `PULSE_AREA` | 240 | 60s | Area reset checks |
| `PULSE_TICK` | 280 | 70s | Full game tick |
| `SECONDS_PER_TICK` | 70 | — | Game tick duration |

## 1.2 Pulse Counters and Update Frequencies

`update_handler()` in `update.c:2666-2736` uses static counters that decrement each loop iteration. When a counter reaches zero, the corresponding update fires and the counter resets:

```c
void update_handler(void) {
  static int pulse_area, pulse_mobile, pulse_violence, pulse_point,
             pulse_second, pulse_houseauc;

  if (--pulse_area <= 0) {
    pulse_area = number_range(PULSE_AREA / 2, 3 * PULSE_AREA / 2); // 120-360 pulses
    area_update();
  }
  if (--pulse_mobile <= 0)  { pulse_mobile = PULSE_MOBILE; mobile_update(); }
  if (--pulse_violence <= 0){ pulse_violence = PULSE_VIOLENCE; violence_update(); }
  if (--pulse_point <= 0) {
    pulse_point = number_range(PULSE_TICK * 0.75, PULSE_TICK * 1.25); // 210-350 pulses
    auth_update(); time_update(); weather_update(); hint_update();
    char_update(); obj_update(); clear_vrooms();
  }
  if (--pulse_second <= 0)  { pulse_second = PULSE_PER_SECOND; /* per-second updates */ }
  if (--pulse_houseauc <= 0){ pulse_houseauc = PULSE_AUCTION; auction_update(); }
}
```

**Randomization strategy:** Area and tick counters use `number_range()` to stagger updates, preventing all areas/entities from updating simultaneously.

## 1.3 Combat Update (PULSE_VIOLENCE)

Every 12 pulses (~3s), `violence_update()` processes all active combat. During this pulse, affect durations also decrement (`fight.c:439-468`):

```c
for (paf = ch->first_affect; paf; paf = paf_next) {
  paf_next = paf->next;
  if (paf->duration > 0)      paf->duration--;      // Countdown
  else if (paf->duration < 0) ;                      // Permanent (never expires)
  else {
    // duration == 0: expired — send wear-off message, remove affect
    affect_remove(ch, paf);
  }
}
```

**WAIT_STATE macro** (`mud.h:4099`):
```c
#define WAIT_STATE(ch, npulse) ((ch)->wait = (!IS_NPC(ch) && ch->pcdata->nuisance ? 12 : (npulse)))
```

## 1.4 NPC AI Update (PULSE_MOBILE)

Every 16 pulses (~4s), `mobile_update()` iterates all NPCs and processes: special procedures, MUDprog scripts, wandering, fleeing, scavenging, random triggers, and time-based AI. Skips charmed, paralyzed, possessed, or dead mobs.

## 1.5 Full Game Tick (PULSE_TICK)

Every ~70s (randomized 210-350 pulses), `char_update()` processes:

1. Room/NPC random and time triggers
2. Player auto-save checks (every `sysdata.save_frequency` minutes, default 20)
3. **HP/mana/move regeneration** via `hit_gain()`, `mana_gain()`, `move_gain()`
4. **Hunger/thirst** countdown via `gain_condition()`
5. Affect duration countdown
6. Idle timer: `ch->timer >= 12` → move to limbo; `ch->timer > 24` → auto-quit
7. Mental state changes, alignment checks, bleeding damage, morph expiration

`obj_update()` handles object decay, light timers, and corpse decomposition.

## 1.6 Area Reset Triggering (PULSE_AREA)

Every ~60s (randomized 120-360 pulses), `area_update()` checks each area's age against its `reset_frequency`. If the area needs resetting (or has no players), it repopulates mobs and objects per the area's reset commands. Age is randomized after reset to distribute load.

## 1.7 Timer and Wait Decrements

- `char_data.timer` — Idle counter, reset to 0 on any player input (`smaug.c:662`). Incremented in `char_update()`.
- `char_data.wait` — Command lag counter, decremented each loop iteration (`smaug.c:1448`). While `wait > 0`, command processing is skipped for that character.

---

# 2. Database and Persistence

## 2.1 The Vnum System

Virtual numbers (vnums) are integer keys that uniquely identify prototypes across the entire world. Three parallel hash tables (1024 buckets each) store prototypes:

```c
MOB_INDEX_DATA *get_mob_index(int vnum) {
  for (pMobIndex = mob_index_hash[vnum % MAX_KEY_HASH]; pMobIndex; pMobIndex = pMobIndex->next)
    if (pMobIndex->vnum == vnum) return pMobIndex;
  return NULL;
}
```

Each area defines its own vnum ranges (`low_r_vnum`/`hi_r_vnum`, `low_o_vnum`/`hi_o_vnum`, `low_m_vnum`/`hi_m_vnum`). Vnums must be globally unique.

**Prototype vs instance:** `mob_index_data`, `obj_index_data`, `room_index_data` are prototypes. `char_data` and `obj_data` are runtime instances that point back to their prototype via `pIndexData`.

## 2.2 Area File Format

Area files (`.are`) use a section-based text format parsed in `db.c:969-2527`:

```
#AREA       — Area header (name, author, flags, ranges, economy)
#MOBILES    — Mobile prototypes (S/C/V complexity levels)
#OBJECTS    — Object prototypes with affects (A) and extra descriptions (E)
#ROOMS      — Room definitions with exits (D) and extra descriptions (E)
#RESETS     — Reset commands for mob/object placement
#SHOPS      — Shopkeeper definitions
#REPAIRSHOPS — Repair shop data
#SPECIALS   — Special procedure assignments
#CLIMATE    — Weather climate data
#NEIGHBOR   — Neighbor weather systems
#MUDPROGS/#OPROGS/#RPROGS — Entity scripts
#END        — Section terminator
```

**Mobile complexity levels:**
- `S` — Simple mob (minimal attributes)
- `C` — Basic mob (no stat attributes)
- `V` — Complex mob (full stats, stances, saving throws)

**Special handling:** Spell slot numbers are converted to skill numbers via `slot_lookup()`. Objects inherit cost/weight from prototypes on creation.

## 2.3 Reset System

Reset commands repopulate areas with mobs and objects. Stored as a linked list per area (`area_data.first_reset`/`last_reset`):

| Command | Format | Description |
|---|---|---|
| `M` | `<max_count> <mob_vnum> <room_vnum>` | Spawn mob in room |
| `O` | `<obj_vnum> <room_vnum>` | Place object in room |
| `P` | `<obj_vnum> <room_vnum> <dest_vnum>` | Object in container |
| `G` | `<obj_vnum>` | Give object to most recently created mob |
| `E` | `<obj_vnum> <wear_loc>` | Equip mob with object |
| `D` | `<room_vnum> <door> <locks>` | Set door lock state |
| `R` | `<room_vnum> <max_dir>` | Randomize exits |

Reset process: `area_update()` → `reset_area()` every `PULSE_AREA` (240 pulses). Randomizes mob counts up to `max_count`.

## 2.4 Player File Format

Player saves use a human-readable key-value text format (`save.c:192-323`):

```
#PLAYER
Version      3
Name         <name>~
Password     <sha256_hash>~
AttrPerm     <str> <int> <wis> <dex> <con> <cha> <lck>
AttrMod      <str> <int> ...
Condition    <hunger> <thirst> <blood> <bleed>
Skill        <percent> '<skill_name>'
AffectData   '<skill>' <duration> <modifier> <location> <bitvector>
#END
```

**Key saved fields:** Password (SHA256 hex, unsalted), clan/council/deity affiliations, skill proficiencies (`learned[]`), conditions, combat stats, equipped items, active affects (duration preserved across login/logout), editor ranges, quest state, ignore list.

## 2.5 Affects Persistence

Affects survive login/logout because durations are saved and restored directly:

```c
// Saving
fprintf(fp, "AffectData '%s' %3d %3d %3d %s\n",
        skill->name, paf->duration, paf->modifier, paf->location,
        print_bitvector(&paf->bitvector));

// Loading
paf->duration = fread_number(fp);  // Preserved from save
```

Negative duration = permanent effect (never decrements). Positive duration decrements during gameplay via combat pulse.

## 2.6 String Hashing

The engine uses reference-counted string interning (`hashstr.c`) to deduplicate the thousands of repeated strings (room names, skill names, mob names):

```c
char *str_alloc(char *str) {
  hash = strlen(str) % STR_HASH_SIZE;  // 1024 buckets
  for (ptr = string_hash[hash]; ptr; ptr = ptr->next)
    if (len == ptr->length && !strcmp(str, (char *)ptr + psize)) {
      ptr->links++;  // Increase reference count
      return (char *)ptr + psize;
    }
  // Not found: allocate new entry
}
```

- `STRALLOC()`/`STRFREE()` for hashed strings (most game strings)
- `str_dup()`/`DISPOSE()` for non-hashed strings (passwords, temporary buffers)
- 16-bit link counter per unique string (max 65535 references)

## 2.7 World Save Triggers

| Trigger | Mechanism |
|---|---|
| Player death | `save_char_obj()` |
| Player quit | `do_quit()` → `save_char_obj()` |
| Auto-save | `char_update()` every `sysdata.save_frequency` minutes (default 20), level 2+ only |
| Hotboot | Equipment array preserved during copyover |

Save flags (`sysdata.save_flags`): `SV_DEATH`, `SV_PASSCHG`, `SV_AUTO`, `SV_PUT`, `SV_DROP`, `SV_GIVE`, `SV_AUCTION`, `SV_ZAPDROP`, `SV_IDLE`, `SV_BACKUP`, `SV_QUITBACKUP`, `SV_TMPSAVE`.

## 2.8 Text-Based Format Design

All game data is text-based ASCII — no binary `fwrite()` for game data. Advantages: debuggable with text editors, easy field addition, no endianness issues, hot-reloadable areas. Strings terminated with `~` in save files. No compression on save files (mccp handles compressed TCP streams only).

---

# 3. Command System

## 3.1 Command Table Structure

Commands are stored in a hash table indexed by first character:

```c
struct cmd_type {
  CMDTYPE *next;         // Hash chain pointer
  char *name;            // Command name (lowercase)
  DO_FUN *do_fun;        // Handler function pointer
  int flags;             // CMD_FLAG_* flags
  sh_int position;       // Minimum position required
  sh_int level;          // Minimum trust level required
  sh_int log;            // Logging level
  struct timerset userec; // Usage statistics
  int lag_count;
};
```

`command_hash[126]` — hash table indexed by `name[0] % 126`. Commands loaded from `COMMAND_FILE` (commands.dat) at startup.

## 3.2 Command Lookup and Abbreviation Matching

```c
for (cmd = command_hash[LOWER(command[0]) % 126]; cmd; cmd = cmd->next)
  if (!str_prefix(command, cmd->name) && trust_checks...)
    { found = TRUE; break; }
```

Abbreviation matching via `str_prefix()`: typing "nor" matches "north". If no command matches, the system checks skills (`check_skill()`), then socials (`check_social()`), then optionally aliases (`check_alias()`). Unmatched input yields "Huh?\n".

## 3.3 Trust and Privilege Gating

`get_trust(ch)` returns effective trust level. Command access requires:

1. `cmd->level <= get_trust(ch)` — direct trust check
2. Council powers override via `ch->pcdata->council->powers`
3. Bestowments: `ch->pcdata->bestowments` adds `sysdata.bestow_dif` to trust
4. Retired flag: `PCFLAG_RETIRED` + `CMD_FLAG_RETIRED`

## 3.4 Position Checking

`check_pos()` returns FALSE if `ch->position < cmd->position`, with position-specific failure messages (dead, stunned, sleeping, resting, sitting, fighting). Position constants range from `POS_DEAD` through `POS_MOUNTED`.

## 3.5 Command Lag (Wait State)

`char_data.wait` counts pulses until next command is allowed. While `wait > 0`, the main loop skips command processing for that character. Set via `WAIT_STATE(ch, pulses)`. Examples: skill beats, `2 * PULSE_VIOLENCE` for combat knockdowns.

## 3.6 Multi-Step Commands (Substate System)

`char_data.substate` tracks multi-step command state. Key substates:

- `SUB_NONE` (0) — Normal operation
- `SUB_REPEATCMD` — Repeating last command (oedit, medit, redit)
- `SUB_ROOM_DESC`, `SUB_MOB_DESC`, `SUB_OBJ_LONG` — Text editing modes
- `SUB_MPROG_EDIT`, `SUB_HELP_EDIT` — Script/help editing
- `SUB_TIMER_DO_ABORT` — Timer-based skill cancellation

Timer-delayed commands use `add_timer(ch, TIMER_DO_FUN, delay, callback, substate)`.

**Command flags:**
- `CMD_FLAG_POSSESS` (1) — Blocked when `AF_POSSESS`
- `CMD_FLAG_POLYMORPHED` (2) — Blocked when polymorphed
- `CMD_FLAG_RETIRED` (4) — Requires `PCFLAG_RETIRED`
- `CMD_FLAG_NO_ABORT` (8) — Prevents abort on timer

## 3.7 Social Commands

Socials use a separate hash table (`social_index[27]`, 26 letter buckets + 1 overflow):

```c
struct social_type {
  char *name;
  char *char_no_arg;    // User sees (no target)
  char *others_no_arg;  // Room sees (no target)
  char *char_found;     // User sees (target found)
  char *others_found;   // Room sees (target found)
  char *vict_found;     // Target sees
  char *char_auto;      // User sees (self-target)
  char *others_auto;    // Room sees (self-target)
};
```

Loaded from `SOCIAL_FILE` (socials.dat). Lookup via `find_social()` with prefix matching, executed via `check_social()`.

## 3.8 Command Logging

- `cmd->log` controls logging level: `LOG_NEVER` (0) through `LOG_ALWAYS` (4)
- `LOG_NEVER` replaces log content with "XXXX XXXX XXXX"
- Watch system: `WATCH_DATA` tracks per-immortal watches on players/sites/commands, writing to per-immortal log files
- Movement commands (n/s/e/w/u/d/ne/nw/se/sw) excluded from watches to prevent spam

---

# 4. Magic and Spell System

## 4.1 Spell Dispatch Pipeline

`do_cast()` (`magic.c:1599`) orchestrates the full casting sequence:

1. Validate spell name via `find_spell()` (mortals) or `skill_lookup()` (gods)
2. Check position requirements (`minimum_position`)
3. Check room flags (`ROOM_NO_MAGIC`, `AFLAG_NOMAGIC`)
4. Check guild/class restrictions
5. Check sector types (`spell_sector` bitfield)
6. Calculate mana cost: `UMAX(skill->min_mana, 100 / (2 + level - skill_level[class]))`
7. For vampires/demons: check blood pool instead of mana
8. Locate target via `locate_targets()` with target type validation
9. Process spell components via `process_spell_components()`
10. Check for failure (mental state/nuisance flag)
11. Deduct mana/blood
12. Call spell function: `(*skill->spell_fun)(sn, ch->level, ch, vo)`
13. Handle result (learning, PK retaliation, favor adjustments)

## 4.2 Spell Function Signature

All spell functions follow a uniform signature:

```c
ch_ret spell_<name>(int sn, int level, CHAR_DATA *ch, void *vo)
```

- `sn` — Spell number/slot
- `level` — Caster's level (scales damage/duration)
- `ch` — Caster
- `vo` — Target (cast to `CHAR_DATA*`, `OBJ_DATA*`, or `NULL`)
- Returns `ch_ret`: `rNONE`, `rSPELL_FAILED`, `rCHAR_DIED`, `rERROR`

## 4.3 Saving Throws

Five saving throw types: `SS_POISON_DEATH`, `SS_ROD_WANDS`, `SS_PARA_PETRI`, `SS_BREATH`, `SS_SPELL_STAFF`.

**Formula:**
```
save = 50 + (victim->level - level - victim->saving_<type>) * 5
save = URANGE(5, save, 95)
```

**RIS modifiers** via `ris_save()`:
- Immune: modifier = -10 (save = 1000, auto-success)
- Resistant: modifier = -2
- Susceptible: modifier = +2

## 4.4 Target Types

| Target Type | Description | Default |
|---|---|---|
| `TAR_IGNORE` | No target (self-effect, object creation) | — |
| `TAR_CHAR_OFFENSIVE` | Enemy target | Current fighting opponent |
| `TAR_CHAR_DEFENSIVE` | Friendly target | Self |
| `TAR_CHAR_SELF` | Self only | — |
| `TAR_OBJ_INV` | Inventory object | — |

**AOE patterns:**
- Single target: cast on `vo` directly
- Multi-target: iterate `first_char` global list, filter by room and NPC/PC status
- Room-based: iterate `ch->in_room->first_person`, filter by room membership

## 4.5 Affect System

`affect_data` structure:
- `type` — Spell number
- `duration` — In pulse units (`DUR_CONV` ≈ 17.5 real seconds)
- `location` — `APPLY_*` enum (e.g., `APPLY_STR`, `APPLY_HITROLL`)
- `modifier` — Integer value to apply
- `bitvector` — Affected bit (`AFF_*`, `RIS_*`)

**Functions:** `affect_to_char()` (add), `affect_join()` (merge same type), `affect_remove()` (remove specific), `affect_strip()` (remove all by spell number).

## 4.6 Mana Cost Determination

```c
mana = UMAX(skill->min_mana, 100 / (2 + ch->level - skill->skill_level[ch->class]));
```

With `sysdata.magichell` enabled, cost is randomized ×1.0–2.0. Vampires/demons use blood: `blood = UMAX(1, (mana + 4) / 8)`.

On failure: 1/2 to 2/3 mana refunded. Multi-caster: each participant pays full cost.

## 4.7 Spell Failure Conditions

1. Insufficient mana/blood
2. Wrong position
3. Room flags (`ROOM_NO_MAGIC`, `AFLAG_NOMAGIC`)
4. Sector type mismatch
5. Missing component (`T###`=item type, `V####`=vnum, `Kword`=keyword, `G####`=gold, `H####`=HP; `!`=fail if has, `+`=don't consume)
6. Invalid target (is_safe, PK restrictions)
7. Mental state/nuisance failure
8. Resistance (saving throw success)
9. Already affected (non-stacking spells)
10. Level too low

## 4.8 Spell Classification

- **skill_type.type:** `SKILL_SPELL`, `SKILL_SKILL`, `SKILL_WEAPON`, `SKILL_HERB`
- **skill_type.guild:** `CLASS_*` constants
- **skill_level[MAX_CLASS]** — Per-class level requirements
- **skill_adept[MAX_CLASS]** — Per-class max proficiency

**Spell info bits:** `SF_PKSENSITIVE`, `SF_NOMOB`, `SF_NOSELF`, `SF_NODISPEL`

**Skill table ranges:** Spells → Skills → Weapons → Tongues (ordered by gsn ranges)

---

# 5. Skills System

## 5.1 Skills vs Spells

| Aspect | Skills | Spells |
|---|---|---|
| Function signature | `void func(CHAR_DATA *ch, char *argument)` | `ch_ret func(int sn, int level, CHAR_DATA *ch, void *vo)` |
| Resource cost | Optional `min_mana` | Always mana or blood |
| Components | None | Full `process_spell_components()` |
| Target resolution | Minimal validation | Full `locate_targets()` with PK checks |
| Success check | `can_use_skill()` with percent roll | Full `do_cast()` pipeline |

## 5.2 Skill Lookup

Binary search in `check_skill()` (`skills.c:227`) searches the sorted `skill_table` array between `gsn_first_skill` and `gsn_first_weapon`. Match requires: prefix match on name, non-null function pointer, and `can_use_skill()` returning TRUE.

Additional lookup functions:
- `skill_lookup()` — Exact match binary search
- `ch_slookup()` — Player-specific, filters by `learned > 0`
- `find_skill()` / `find_spell()` — Wrappers with player knowledge option

## 5.3 Proficiency and Success Checks

```c
if ((number_percent() + skill->difficulty * 5) > (IS_NPC(ch) ? 75 : LEARNED(ch, sn))) {
  failed_casting(skill, ch, vo, obj);
  learn_from_failure(ch, sn);
  if (mana) ch->mana -= mana / 2;  // Partial refund
  return TRUE;
}
```

- `LEARNED(ch, sn)` — Proficiency as 0-100%. NPCs always use 75.
- `can_use_skill()` — Validates class level requirement, then rolls against `LEARNED + 5 * difficulty`.
- High difficulty adds +5% per point to the success calculation.

## 5.4 Skill Learning and Practice

**`learn_from_success()`** (`skills.c:1621`):
- 2-point gain: random percent ≥ calculated chance
- 1-point gain: chance − percent ≤ 25
- 0-point gain: chance − percent > 25 (too easy)
- Capped at `skill_adept[class]` (typically 95%)
- On reaching adept: bonus XP (×5 for mages, ×2 for clerics)

**`learn_from_failure()`**: Only 1-point gain, only if failure was informative (within 25% of threshold), capped at adept−1.

## 5.5 Class and Race Restrictions

```c
skill_table[sn]->skill_level[MAX_PC_CLASS]  // Per-class level requirement
skill_table[sn]->skill_adept[MAX_PC_CLASS]  // Per-class max proficiency
skill_table[sn]->race_level[MAX_PC_RACE]    // Per-race level requirement
skill_table[sn]->race_adept[MAX_PC_RACE]    // Per-race max proficiency
```

NPCs bypass all restrictions. Guild restrictions via `skill_type.guild` field (-1 = no restriction, `CLASS_*` = specific class).

## 5.6 Combat Skills Integration

Combat skills integrate with `fight.c` through:

1. **`multi_hit()` calls** — e.g., `global_retcode = multi_hit(ch, victim, gsn_backstab)`
2. **`damage()` calls** — e.g., `damage(ch, victim, number_range(1, ch->level), gsn_kick)`
3. **Combat state management** — `set_fighting(ch, victim)` / `set_fighting(victim, ch)`
4. **Wait states** — `WAIT_STATE(victim, 2 * PULSE_VIOLENCE)` for knockdowns
5. **Position changes** — `victim->position = POS_SITTING` after bash
6. **Affect application** — e.g., stun applies `AFF_PARALYSIS`

**Examples of combat skills:** backstab, bash, kick, trip, stun, gouge, grapple, disarm, cleave, pounce, bite, claw, sting, tail.

**Passive/utility skills:** meditate (mana regen), trance (advanced mana regen), rescue (protect ally), detrap (remove traps), dig (find hidden objects), search.

## 5.7 Skill Lag (Wait/Beats)

```c
WAIT_STATE(ch, skill_table[sn]->beats);
```

The `beats` field converts directly to pulses. Multi-phase skills use `add_timer()` with substate tracking:

```c
// do_dig: Phase 1
add_timer(ch, TIMER_DO_FUN, UMIN(skill->beats/10, 3), do_dig, 1);
// Phase 2 executes when timer fires, checking ch->substate
```

## 5.8 Special Skill Categories

- **Weapon skills** (gsn_first_weapon to gsn_first_tongue): whip, dart, knife, sword, spear, mace, axe, club, staff, bow. Checked via `obj->value[4]` weapon type.
- **Languages** (gsn_first_tongue to top_sn): common, elven, dwarven, etc. Stored in `speaking`/`speaks` bitvectors. Used in communication for translation.
- **Vampire/demon skills**: Blood-based resources (`COND_BLOODTHIRST`), `do_bloodlet`, `do_feed`.

---

# 6. Objects and Inventory

## 6.1 Object Instance Creation

`create_object(obj_index, level)` creates a runtime `obj_data` from an `obj_index_data` prototype:
- Copies `item_type`, `wear_flags`, `extra_flags`, `value[6]`
- Assigns unique `serial` number
- Points to prototype via `obj->pIndexData`
- Creates independent linked list nodes

## 6.2 Inventory Linked Lists

Character inventory uses a doubly-linked list via `char_data.first_carrying`/`last_carrying`. Each object links via `next_content`/`prev_content`. Mutually exclusive location tracking:
- `obj->carried_by = ch` — In character inventory
- `obj->in_obj = container` — Inside a container
- `obj->in_room = room` — On the ground

Shopkeeper inventories are insert-sorted by level then short description.

## 6.3 Wear and Layer System

**Wear process** (`wear_obj`, `act_obj.c:2014`):
1. Check `CAN_WEAR(obj, 1 << bit)` against `wear_flags`
2. For layered locations, call `can_layer()` to verify fit
3. Layer check: `obj->pIndexData->layers` bitmask vs existing items

**Layer logic:** Lower layer numbers go underneath. If an existing item has layers and the new item's layers conflict (existing & ~new != 0), the wear fails. Applies to: body, legs, feet, hands, arms, about, waist, wrist, ankle.

**Remove:** Checks `ITEM_NOREMOVE` flag. Handles dual-wield removal (removes dual if main hand unequipped). Calls `unequip_char()`.

## 6.4 Container System

- `obj.first_content`/`last_content` — Linked list of contained objects
- `obj.in_obj` — Parent container pointer
- `obj_to_obj()` / `obj_from_obj()` — Insert/remove operations
- Magic containers (`ITEM_MAGIC`) don't contribute to carrying weight
- `in_magic_container()` recursively checks parent chain

## 6.5 The value[6] Array by Item Type

| Item Type | v0 | v1 | v2 | v3 | v4 | v5 |
|---|---|---|---|---|---|---|
| Container | weight limit | flags (CONT_*) | — | condition | — | loot counter |
| Potion/Scroll/Pill | level | spell1 SN | spell2 SN | spell3 SN | — | — |
| Wand/Staff | level | max charges | current charges | spell SN | — | — |
| Weapon | condition | damage dice count | damage dice size | — | weapon type | — |
| Armor | AC value | — | — | condition | — | — |
| Light | hours remaining | — | — | — | — | — |
| Trap | charges | trap type | level | — | — | — |
| Salve | level | max doses | doses | delay | spell1 | spell2 |

## 6.6 Carrying Capacity

- **Item limit:** `can_carry_n(ch)` = `(level+15)/5 + dex - 13 - penalty` (penalty: +1 per equipped weapon/shield/hold)
- **Weight limit:** `can_carry_w(ch)` = `str_app[strength].carry`
- Immortals: `trust * 200` items. Pets: 0.
- `get_obj_weight()` recursively includes contents (except magic containers)

## 6.7 Equipment Affects

`equip_char()` applies affects from both `obj->first_affect` and `obj->pIndexData->first_affect` via `affect_modify()`. `unequip_char()` reverses them. Light items modify `ch->in_room->light`. Special: `APPLY_WEARSPELL`/`REMOVESPELL` cast spells on equip/remove (blocked in `NO_MAGIC` rooms and during save/load).

## 6.8 Object Destruction

`extract_obj()` performs full cleanup:
1. Remove portal references
2. Remove from carrier (`obj_from_char`), room (`obj_from_room`), or container (`obj_from_obj`)
3. Recursively extract all contents
4. Free affect and extra description lists
5. Remove from global object list
6. Decrement prototype count and global counters

---

# 7. Movement System

## 7.1 Standard Room Movement

Movement cost per sector type (`movement_loss[]` array):

| Sector | Cost | Sector | Cost |
|---|---|---|---|
| Inside | 1 | Water (swim) | 4 |
| City | 2 | Water (no swim) | 1-2 |
| Field | 2 | Underwater | 6 |
| Forest | 3 | Air | 10 |
| Hills | 4 | Desert | 6 |
| Mountain | 6 | Ocean floor | 7 |
| River | 5 | Underground | 4 |

**Encumbrance multiplier** (`encumbrance()`): Based on carry weight as % of max — 80%: ×2, 85%: ×2.5, 90%: ×3, 95%: ×3.5, 100%: ×4.

**Exit validation:** `get_exit()` retrieves exits from room's `first_exit` linked list. Checks: `EX_CLOSED`, `EX_SECRET`, `EX_ISDOOR`. Room capacity enforced via `to_room->tunnel` field.

## 7.2 Door Mechanics

**Exit flags:** `EX_ISDOOR` (has door), `EX_CLOSED`, `EX_LOCKED`, `EX_SECRET` (hidden), `EX_NOPASSDOOR`, `EX_FLY` (requires flight), `EX_CLIMB` (requires climbing skill).

`has_key()` checks if character possesses the required key object. Locked doors require key to open. `PASS_DOOR` effect bypasses closed (but not `EX_NOPASSDOOR`) doors.

## 7.3 Mount System

- `char_data.mount` points to mount character
- Movement deducted from mount's move pool, not rider's
- Floating mounts (`AFF_FLOATING`) use 1 move regardless of terrain
- Mount must have `AFF_FLYING` if flying is required
- Followers follow mounted master automatically

## 7.4 Overland Map System

Alternative to room-based movement using coordinate grids:
- Character position: `char_data.map`, `char_data.x`, `char_data.y`
- `PLR_ONMAP`/`ACT_ONMAP` flags toggle overland mode
- Movement by coordinate shift (north: y−1, east: x+1, etc.)
- Map sector array: `map_sector[MAP_MAX][MAX_X][MAX_Y]`
- Exits marked with `EX_OVERLAND` flag link rooms to overland

## 7.5 Flight and Falling

- `AFF_FLYING` required for `SECT_AIR` sectors and `EX_FLY` exits
- Mounts must also have `AFF_FLYING` when flying
- Falling logic checks for `AFF_FLYING` or `AFF_FLOATING`
- Flight bypasses terrain movement penalties

## 7.6 Tracking (Pathfinding)

BFS-based pathfinding in `track.c`:
- `find_first_step()` returns direction to target
- `valid_edge()` checks exit validity (optionally ignoring closed doors with `TRACK_THROUGH_DOORS`)
- Distance limit: `100 + ch->level * 30`, modified by `LEARNED(ch, gsn_track)`

## 7.7 Follower and Group Movement

- `char_data.master` → leader pointer; followers check `fch->master == ch && fch->position == POS_STANDING`
- When leader moves, all qualifying followers move recursively
- Loop protection via room occupant counting
- Works for both room-based and overland movement

## 7.8 Teleportation and Virtual Rooms

- Room fields: `tele_vnum` (destination), `tele_delay` (delay before trigger)
- `generate_exit()` creates virtual rooms on-demand for distance > 1
- Virtual room vnums encoded as `(high_16 << 16) | low_16`

---

# 8. Communication and Information

## 8.1 Look/Examine Pipeline

`do_look()` (`act_info.c:1255-1905`):
1. Parse arguments (auto, under, in, sky, or target)
2. Check blindness (`AFF_BLIND` without truesight)
3. Handle dark rooms (show only blinded characters)
4. No argument/auto: display room name, description, exits, items, characters
5. Compass mode (`PLR_COMPASS`): directional colors for exits
6. Handle special cases: under (container contents), in (container inspection), sky (weather)
7. Match extra descriptions (`extra_descr_data`), objects, characters by keyword

`do_examine()` extends look with: equipment condition inspection, food/container details, trap detection (`AFF_DETECTTRAPS`), and MUDprog examine triggers.

## 8.2 Who List

`do_who()` (`act_info.c:3238-3928`) with extensive filtering:
- Level range, class, race, clan, council, deity
- Immortal only, deadly/PK, grouped, leader, retired
- Group hierarchy via `whogr_s` linked list structures
- Output sorted by category: mortal, deadly, grouped, immortal
- Shows: class, level, wizinvis level, flags ([WRITING], [AFK]), name, title, clan, council

## 8.3 Communication Channels

Channels use `talk_channel()` with bitmask-based subscription:

| Channel | Scope | Restriction |
|---|---|---|
| CHANNEL_CHAT | Global | Default |
| CHANNEL_CLAN/ORDER/COUNCIL/GUILD | Group-specific | Membership required |
| CHANNEL_SHOUT | Area-wide | — |
| CHANNEL_YELL | Room-level | — |
| CHANNEL_IMMTALK | Immortals | LEVEL_IMMORTAL+ |
| CHANNEL_HIGHGOD (muse) | High immortals | muse_level+ |
| CHANNEL_WARTALK | PK players | IS_PKILL required |
| CHANNEL_TELLS | Private | — |

`char_data.deaf` bitvector disables channels. Filters: `ROOM_SILENCE`, `ROOM_NOYELL`, `AFLAG_SILENCE`, NPC restrictions, auth status.

## 8.4 Language System

- `char_data.speaking` — Current language (single bit)
- `char_data.speaks` — Known languages (bitvector)
- `translate()` uses `LCNV_DATA` conversion tables
- Below 85% comprehension: translation/scrambling applied
- Common tongue always known at 100%
- Commands: `speak <language>`, `languages`, `learn <language>` (via scholar NPC)

## 8.5 Ignore System

- `pc_data.first_ignored`/`last_ignored` — Linked list
- `is_ignoring(victim, ch)` checks if victim ignores ch
- Immortals bypass ignore (`get_trust(ch) > get_trust(victim)`)
- Applied to: tells, whispers, say, emote, beckon, follow

## 8.6 Tell History

- `pc_data.tell_history[26]` — Array indexed by first letter (a-z)
- Stores last tell per letter: `"%s told you '%s'\n"` format
- `do_repeat()` retrieves by letter index

## 8.7 Color System

Three syntax types:
- `&X` — Foreground color
- `^X` — Background color
- `}X` — Blinking foreground

Functions: `colorize()` (convert codes to ANSI), `color_strlen()` (visible length), `set_char_color()` (set output color). Per-character color customization via `char_data.colors[MAX_COLORS]`.

## 8.8 Pager System

Buffered output paging for long text:
- `descriptor_data.pagebuf` — Allocated buffer (starts at `MAX_STRING_LENGTH`, doubles up to 64×)
- `write_to_pager()` appends text; `send_to_pager()` checks `PCFLAG_PAGERON`
- Pager commands: `q` (quit), Space (next page), Enter (next line)

## 8.9 Prompt System

- `pc_data.prompt` — Main prompt string
- `pc_data.fprompt` — Fight prompt (shown during combat)
- `pc_data.subprompt` — Sub-state prompt (editing modes)
- Variable substitution: HP, mana, move, experience, gold, etc.

---

# 9. Economy System

## 9.1 Multi-Currency System

Three currencies with fixed conversion rates:
- **1 gold = 100 silver = 10,000 copper**
- Stored as separate fields: `char_data.gold`, `.silver`, `.copper`
- `get_value(gold, silver, copper)` converts to copper for comparisons
- `conv_currency()` normalizes excess copper/silver to higher denominations

## 9.2 Shop System

Shopkeepers linked via `mob_index_data.pShop` → `shop_data`. `find_keeper()` scans room for NPCs with `pShop` set.

**Buy price:**
```
cost = get_value(obj costs) * UMAX(profit_sell+1, profit_buy+profitmod) / 100
     * (80 + UMIN(level, AVATAR)) / 100
```

**Sell price:**
```
cost = get_value(obj costs) * UMIN(profit_buy-1, profit_sell+profitmod) / 100
```

`profitmod` influenced by charisma and race: elves −10%, dwarves +3%, halflings −2%, pixies −8%, half-orcs +7%.

**Trade restrictions:** `shop_data.buy_type[MAX_TRADE=5]` — Array of 5 item types the shop accepts.

**Shopkeeper wealth limit:** `keeper->level² × 50000` gold max. Excess boosted to area economy pool.

## 9.3 Repair Shop System

`mob_index_data.rShop` → `repairshop_data`:
- `fix_type[MAX_FIX=3]` — 3 repairable item types
- `profit_fix` — Markup (default 1000 = 100%)
- Shop types: `SHOP_FIX` (repair) or `SHOP_RECHARGE` (recharge)

Cost formulas: armor (cost × damage), weapons (cost × wear), wands/staves (cost × missing charges). `repairall` adds 10% surcharge.

## 9.4 Bank System

Bank operations (`bank.c`): deposit, withdraw, transfer (between player accounts), balance. Stored in `pc_data.gbalance`/`.sbalance`/`.cbalance`. Requires `ACT_BANKER` flag on NPC. No interest rate.

## 9.5 Quest System

- Quest types: kill mob or recover item
- Rewards: 2,500–45,000 gold + 25–75 quest points + 1–6 practices
- Timer: 10–30 minute countdown (`ch->countdown`)
- Cooldown: 10 minutes between quests (`ch->nextquest`)
- Tracking: `pc_data.quest_number`, `quest_curr`, `quest_accum`

## 9.6 Object Serial Numbers

- `obj_index_data.serial` — Unique prototype serial
- `obj_data.serial` — Unique instance serial
- Used for tracking unique items across instances and resets

---

# 10. Social and Guild Systems

## 10.1 Clan System

**Clan types:** CLAN_PLAIN, CLAN_VAMPIRE, CLAN_WARRIOR, CLAN_DRUID, CLAN_MAGE, CLAN_CELTIC, CLAN_DEMON, CLAN_ANGEL, CLAN_ARCHER, CLAN_THIEF, CLAN_CLERIC, CLAN_PIRATE, CLAN_ASSASSIN, CLAN_UNDEAD, CLAN_CHAOTIC, CLAN_NEUTRAL, CLAN_LAWFUL, CLAN_NOKILL, CLAN_ORDER, CLAN_GUILD.

**Leadership hierarchy:** Leader (authority=3), NumberOne (2), NumberTwo (1). Outcasting requires higher or equal authority.

**Key fields:** `clanobj1-5` (clan item vnums), `members`/`mem_limit`, `pkills[7]`/`pdeaths[7]` (level-range PK tracking), `score`/`favour`/`strikes`, `board`/`recall`/`storeroom` vnums, `guard1`/`guard2` mob vnums.

## 10.2 Clan Membership

**Induction:** Requires level ≥ 10, inducer permission (leader/number1/number2/bestowment). PK clans set `PCFLAG_DEADLY` and remove `PLR_NICE`. Guilds check class match. Sets `LANG_CLAN` speaking bit. Assigns guild skills to full proficiency.

**Outcast:** Hierarchical authority check. Removes clan skills, `LANG_CLAN`, rank. Member count decremented.

## 10.3 Council System

Differs from clans: co-leaders (head/head2) instead of hierarchical leadership, no clan type distinctions, no PK mechanics, no deadly flag changes, no skill instruction, no clan language.

## 10.4 Guild System

`clan_type = CLAN_GUILD`. Class-specific (requires `clan.class` match). No PK requirement. Grants full proficiency in class guild skills on induction. Tracks mob kills/deaths instead of PK.

## 10.5 PK and Clan Wars

- `PCFLAG_DEADLY` required for PK (set on non-GUILD/ORDER/NOKILL clan induction)
- Shove/drag: deadly required for both parties, 5-level difference max, class-based success chance (warrior 70%, vampire 65%), STR modifier (+3/point above 15), race bonuses
- PK tracking: `clan.pkills[7]`/`pdeaths[7]` by level range (1-9, 10-14, 15-19, 20-29, 30-39, 40-49, 50+)
- Timers: `TIMER_PKILLED` (10min cooldown), `TIMER_SHOVEDRAG` (10 pulse cooldown in safe rooms)

## 10.6 Board System

**Board types:** `BOARD_NOTE` (standard) and `BOARD_MAIL` (mail).

**Access control:** `min_read_level`/`min_post_level`/`min_remove_level`, `read_group`/`post_group` (clan/council), `extra_readers`/`extra_removers` (individual permissions).

**Operations:** list, read, post, remove/take, vote, reply.

**Voting:** `VOTE_NONE`, `VOTE_OPEN` (public yes/no/abstain), `VOTE_CLOSED` (anonymous), `VOTE_BALLOT` (hidden counts).

**Mail costs:** 10 copper to read, 50 copper to take (bypassed by `sysdata` flags).

**Journal system:** Per-character journals using extra descriptions for page storage (max 50 pages).

## 10.7 Marriage System

Social-only system: `pc_data.spouse` holds spouse name. `do_marry` sets spouse names both directions. `do_divorce` clears them. `do_rings` creates inscribed wedding rings (diamond ring for wife, wedding band for husband). No mechanical combat/economy effects.

## 10.8 Player Housing

- `HOME_DATA`: player name, apartment flag, room vnums (1-6 rooms)
- House setup: sets `ROOM_HOUSE`/`NO_SUMMON`/`NO_ASTRAL`/`INDOORS` flags, locks exits with house key
- Additional rooms: 100 gold cost, created in `ADDED_ROOM_HOUSING` area
- `gohome` command: recall to house entrance
- Accessories system: buy furniture/pets/guards via `accessories` command
- House buying/auction: `homebuy`/`sellhouse` commands with bidding

---

# 11. MUD Programming (Scripting) System

## 11.1 Overview

MUD programs (mprogs) are event-driven scripts attached to mobs, objects, or rooms. Each program consists of a trigger type, argument list, and command list. Stored in the `mudprogs` linked list of each entity's index data structure. Fast trigger detection via `progtypes` bitmask and `HAS_PROG()` macro.

## 11.2 Trigger Types

**Mob triggers (43 types):** `ACT_PROG`, `ALL_GREET_PROG`, `BRIBE_PROG` (gold/silver/copper), `CMD_PROG`, `DEATH_PROG`, `ENTRY_PROG`, `FIGHT_PROG`, `GIVE_PROG`, `GREET_PROG`, `GREET_IN_FIGHT_PROG`, `HITPRCNT_PROG`, `HOUR_PROG`, `LOGIN_PROG`, `RAND_PROG`, `SELL_PROG`, `SPEECH_PROG`, `TELL_PROG`, `TIME_PROG`, `VOID_PROG`, `SCRIPT_PROG`.

**Object triggers:** `ACT_PROG`, `DAMAGE_PROG`, `DROP_PROG`, `EXA_PROG`, `GET_PROG`, `GREET_PROG`, `PULL_PROG`, `PUSH_PROG`, `REPAIR_PROG`, `REMOVE_PROG`, `SAC_PROG`, `USE_PROG`, `WEAR_PROG`, `ZAP_PROG`.

**Room triggers:** `ACT_PROG`, `CMD_PROG`, `ENTER_PROG`, `IMMINFO_PROG`, `LEAVE_PROG`, `LOGIN_PROG`, `RAND_PROG`, `RFIGHT_PROG`, `RDEATH_PROG`, `REST_PROG`, `SLEEP_PROG`, `SPEECH_PROG`, `VOID_PROG`, `TIME_PROG`.

## 11.3 Script Language

Line-based interpreted language with:

**Conditionals** (max nesting: `MAX_IFS=20`):
```
if (ifcheck) [operator value]
or (ifcheck) [operator value]
else
endif
```

**Operators:** `==`, `!=`, `>`, `<`, `>=`, `<=`, `/` (substring), `!/` (no substring), `&` (bitwise AND), `|` (bitwise OR).

**Directives:** `silent` (suppress output), `mpsleep <time>` (pause execution), `break` (terminate).

**Commands:** Any command NPCs can normally perform via `interpret(mob, buf)`: movement, speech, combat, inventory manipulation.

## 11.4 Variable Substitution

`mprog_translate()` processes `$`-variables before command execution:

| Variable | Meaning | Variable | Meaning |
|---|---|---|---|
| `$n`/`$N` | Actor name / full name+title | `$i`/`$I` | Mob name / short desc |
| `$t`/`$T` | Victim name / full name+title | `$r`/`$R` | Random PC name / full |
| `$e`/`$m`/`$s` | Actor he-she/him-her/his-her | `$j`/`$k`/`$l` | Mob he-she/him-her/his-her |
| `$E`/`$M`/`$S` | Victim pronouns | `$J`/`$K`/`$L` | Random PC pronouns |
| `$p`/`$P` | Object name / short desc | `$a`/`$A` | Article + object name |
| `$$` | Literal dollar sign | | |

Safety: checks `char_died()` and `obj_extracted()` before use, returning "someone"/"something" if entity no longer exists.

## 11.5 Ifcheck Conditions

Extensive condition library including:

- **Character checks:** `ispc`, `isnpc`, `level`, `class`, `race`, `sex`, `hitprcnt`, `hps`, `mana`, `str`/`int`/`wis`/`dex`/`con`/`cha`/`lck`, `goldamt`, `isfight`, `isimmort`, `isaffected`, `position`, `clan`, `deity`, `favor`, `alignment` (isgood/isevil/isneutral)
- **Object checks:** `objtype`, `objval0-5`, `leverpos`
- **Room checks:** `inroom`, `indoors`, `nomagic`, `safe`, `economy`, `inarea`
- **Counting:** `mobinarea`, `mobinroom`, `mobinworld`, `objinworld`, `ovnumhere`, `ovnumcarry`, `ovnumwear`, `mortcount`, `mobcount`, `charcount`
- **Special:** `rand` (percentage), `time` (in-game hour), `cansee`, `isfollow`, `numfighting`, `waitstate`, `wearing`, `wearingvnum`, `carryingvnum`

## 11.6 Execution Model

- `mprog_driver()` — Main engine, parses command list line by line
- `mprog_do_command()` — Processes each line (ifchecks or commands)
- `mprog_do_ifcheck()` — Evaluates conditions
- Max nesting: `MAX_PROG_NEST=20`
- After each command: checks `char_died(mob)` to prevent crashes

**Sleep system:** `mpsleep <time>` creates `MPSLEEP_DATA` saving full execution state (ifstate, ignorelevel, command position). Resumes via `mprog_update()` after timer expires.

## 11.7 Mob vs Object vs Room Programs

All three use the same execution engine (`mprog_driver`, `mprog_do_command`, `mprog_do_ifcheck`, `mprog_translate`).

| Aspect | Mob Progs | Object Progs | Room Progs |
|---|---|---|---|
| Context | Runs as the mob itself | Uses `supermob` abstraction | Uses `supermob` abstraction |
| Stored in | `mob_index_data.mudprogs` | `obj_index_data.mudprogs` | `room_index_data.mudprogs` |
| Focus | Character-centric, combat, self-modification | State-based, inventory context | Environment, area-wide effects |
| Unique triggers | SCRIPT_PROG, BRIBE_*, DEATH_PROG | PULL/PUSH/REPAIR/ZAP_PROG | RFIGHT/RDEATH_PROG |

`supermob` abstraction: For object and room progs, a global "supermob" NPC is configured with the entity's context (name, description, position) to act as the command executor.

## 11.8 Runtime Entity Modification (mpxset)

`mpxset.c` provides in-game commands for runtime modification of mob/object **instances** (not prototypes):

- **do_mpmset** — Modify mob: stats, combat values, HP/mana/move, economy, flags, RIS, descriptions, spec functions
- **do_mposet** — Modify object: values (type-specific), type, flags, wear, level, weight, cost, affects, descriptions

Changes persist until object reset or game restart. Cannot modify prototypes (checked via `ACT_PROTOTYPE`/`ITEM_PROTOTYPE` flags).

## 11.9 Security

MUD programs **can** execute all NPC-accessible commands. They **cannot** perform direct file I/O, shell commands, raw memory access, or bypass command permission systems. Safety mechanisms: entity existence checks, nesting limits, `progbug()` error reporting with vnum context.

---

# 12. World Building (OLC) System

## 12.1 Architecture

Two-tiered online building:

- **Exterior building** (`build.c`): Direct command-line OLC (`redit`, `mset`, `oset`). Uses `EDITOR_DATA` for multi-line text. Editor state via `CHAR_DATA.substate`.
- **Interior building** (`ibuild.c`): Menu-driven OLC with screen-based numbered menus. Uses `MENU_DATA` structures and page-based display.

**OLC data structure:** `descriptor_data.olc` → `OLC_DATA` containing mode, current entity pointers (room/mob/obj/area/shop), vnum, modified flag.

## 12.2 Editor State Machine

```
CON_PLAYING → CON_EDITING (text buffer) or CON_REDIT/CON_OEDIT/CON_MEDIT
```

Multi-line text substates: `SUB_ROOM_DESC`, `SUB_ROOM_EXTRA`, `SUB_MOB_DESC`, `SUB_OBJ_LONG`, `SUB_OBJ_EXTRA`, `SUB_MPROG_EDIT`, `SUB_HELP_EDIT`.

Editor commands: `/s` (save+exit), `/c` (clear), `/l` (list buffer).

## 12.3 Vnum Range Enforcement

Builders are assigned vnum ranges via `pc_data.r_range_lo`/`hi`, `m_range_lo`/`hi`, `o_range_lo`/`hi`. Validation functions (`can_rmodify`, `can_mmodify`, `can_oedit`) check that the target entity's vnum falls within the builder's assigned range and has the prototype flag set. High-level immortals (≥ `level_modify_proto`) bypass range checks.

## 12.4 Room Editor Properties

- **Text:** name, description (multi-line), extra descriptions
- **Flags:** room flags (dark, death, nomob, indoors, safe, private, nomagic, norecall, etc.), sector type
- **Exits:** direction, destination vnum, flags (isdoor, closed, locked, secret, fly, climb, etc.), key vnum, distance, push/pull mechanics
- **Teleport:** `televnum` (destination), `teledelay` (delay in pulses)
- **Tunnel:** max occupants (0 = unlimited)

## 12.5 Mob Editor Properties

- **Basic:** vnum, level, name, short/long/full descriptions, sex
- **Combat:** attack flags, defense flags, numattacks, hit/dam dice, hitroll/damroll, armor
- **Attributes:** str/int/wis/dex/con/cha/lck, saving throws, race, class
- **RIS:** resistant/immune/susceptible flags
- **Behavior:** act flags (sentinel, aggressive, wimpy, mountable, etc.), affected_by flags, position, alignment, special function, body parts, stance, languages

## 12.6 Object Editor Properties

- **Text:** name, short/long/action descriptions, extra descriptions
- **Type/flags:** item type, extra flags (glow, nodrop, magic, etc.), wear flags
- **Physical:** level, weight, gold/silver/copper cost, timer, layers
- **Values:** value0-5 (type-specific)
- **Affects:** add/remove affects with location and modifier

## 12.7 Area File Saving

`fold_area()` generates `.are` files from in-memory structures. Creates `.bak` backup before writing. Builders must manually trigger saves (not automatic). All modifications are made in-memory immediately upon editing.

---

# 13. Administration System

## 13.1 Trust Level Hierarchy

| Level Name | Value | Description |
|---|---|---|
| LEVEL_AVATAR | 50 | First immortal level |
| LEVEL_NEOPHYTE | 51 | Basic immortal commands |
| LEVEL_ACOLYTE–LEVEL_GOD | 52–58 | Progressively more powerful |
| LEVEL_GREATER | 59 | Area override capabilities |
| LEVEL_ASCENDANT | 60 | Full admin access begins |
| LEVEL_SUB_IMPLEM | 61 | Sub-implementor |
| LEVEL_IMPLEMENTOR | 62 | Implementor |
| LEVEL_ETERNAL | 63 | Near-maximum authority |
| LEVEL_INFINITE | 64 | — |
| LEVEL_SUPREME | 65 | MAX_LEVEL, highest authority |

`get_trust(ch)` returns effective trust level for command access.

## 13.2 Key Admin Commands

**Player control:** `authorize` (approve/deny new characters), `deny`, `freeze`, `disconnect`, `pardon`, `delay`, `trust`, `advance`, `mortalize`, `immortalize`.

**World manipulation:** `purge`, `minvoke`/`oinvoke` (create mobs/objects), `goto`, `transfer`, `at`, `force`, `mwhere`, `gwhere`, `gfighting`.

**System:** `reboot`, `shutdown` (with typo checks: `reboo`/`shutdow`), `restrict`, `wizhelp`.

**Monitoring:** `snoop` (monitor player I/O), `watch` (player/site/command watches), `bodybag` (find corpses).

## 13.3 WIZINVIS System

- `PLR_WIZINVIS` flag + `pc_data.wizinvis` level
- Mortals cannot see wizinvis immortals in who, gwhere, or visibility lists
- `wizmode` toggles on/off or sets specific level
- `PCFLAG_DND` (Do Not Disturb) prevents lower-level immortals from using transfer/goto/at/snoop on higher-level immortals

## 13.4 Authorization Workflow

New character `auth_state` progression: 0 (created) → 1 (name chosen) → 2 (password set) → 3 (waiting for admin approval) → 4 (authorized, normal play).

`authorize` command options: `yes` (approve), `immsim`/`mobsim`/`swear`/`plain`/`unpronu` (deny with reason → state 2), `no`/`deny` (deny completely → force quit).

## 13.5 Hell/Jail System

- `hell <player> <time> <hours|days>` — Send to jail (max 30 days)
- Hell locations: VNUMs 6, 8, 1206
- `pc_data.release_date` tracks expiration; auto-release when `current_time >= release_date`
- `unhell` releases early

## 13.6 Ban System

```
ban site|race|class <name> <type> <duration>
allow site|race|class <name>
```

**Ban types:** `newbie` (level 1), `mortal` (≤ level 50), `all` (all levels), `level` (specific cap), `warn` (monitoring only, `BAN_WARN = -1`).

Duration: 1-1000 days or -1 for permanent. Warning bans log connections without blocking.

## 13.7 Immortal Host Filtering

`IMMORTAL_HOST` restricts which hosts can log in as specific immortals. Supports prefix/suffix/exact host matching. Prevents unauthorized logins from unknown hosts.

## 13.8 Snoop System

`snoop <player>` monitors player I/O. Permission checks: cannot snoop equals or higher trust, respects `min_snoop` level setting and DND flag. Optional notification to high-level immortals when snooped.

## 13.9 Restore System

`restore <player|all> [boost]` restores HP/mana/move. `restore all` has a 6-hour cooldown (`RESTORE_INTERVAL = 21600`). Boost multipliers: normal (1.0×), boost (1.5×, requires LEVEL_SUB_IMPLEM+).

## 13.10 Admin List

`makeadminlist` auto-generates from god directory files. Extracts level and council membership, sorts by name/level/council leadership. `adminlist` displays the result.

---

# 14. Missing Systems Documentation

This section documents systems identified in `STRUCTURE.md` that were not covered in Sessions 3.1-3.15.

## 14.1 Protocol & Client Integration

**Files:** `protocol.c`, `protocol.h`, `mongoose.c`/`httpd.c`, `mccp.c`, `mccp.h`, `dns.c`, `dns.h`

**Overview:** SMAUG 2.0 implements a comprehensive protocol negotiation system that supports modern MUD client features beyond plain telnet. The system handles telnet option negotiation, MSDP/MSSP for GUI client integration, MXP for rich text, and MCCP for output compression.

### Protocol Negotiation

Protocol negotiation occurs once per connection using the telnet protocol. Available options:

| Option | Code | Description |
|--------|------|-|--|
| CHARSET | 42 | UTF-8 encoding negotiation |
| MSDP | 69 | MUD Server Data Protocol (variable reporting) |
| MSSP | 70 | MUD Server State Protocol (player counts, uptime) |
| MCCP | 86 | MUD Client Compression Protocol (zlib) |
| MSP | 90 | Mud Sound Protocol (sound triggers) |
| MXP | 91 | Mud eXtension Protocol (rich text, hyperlinks) |
| ATCP | 200 | ATCP (Diku-derived GUI protocol) |
| GMCP | 201 | Generic Mud Control Protocol |

**`protocol_t` structure** (from `protocol.h:183-240`):
- `Negotiated[eNEGOTIATED_MAX]` — boolean flags for each negotiated option
- `bNAWS` — client screen dimensions support
- `b256Support` — XTerm 256-color capability
- `bTTYPE` — terminal type reporting
- `bMCCP` — compression enabled

### MSDP (MUD Server Data Protocol)

MSDP allows clients to request real-time updates of game variables. 37 predefined variables across categories:

**General:**
- `eMSDP_CHARACTER_NAME`, `eMSDP_SERVER_ID`, `eMSDP_SERVER_TIME`, `eMSDP_SNIPPET_VERSION`

**Character:**
- `eMSDP_HEALTH`, `eMSDP_HEALTH_MAX`, `eMSDP_MANA`, `eMSDP_MANA_MAX`, `eMSDP_MOVEMENT`, `eMSDP_MOVEMENT_MAX`
- `eMSDP_STR`, `eMSDP_INT`, `eMSDP_WIS`, `eMSDP_DEX`, `eMSDP_CON`
- `eMSDP_LEVEL`, `eMSDP_RACE`, `eMSDP_CLASS`, `eMSDP_ALIGNMENT`, `eMSDP_EXPERIENCE`

**Combat:**
- `eMSDP_OPPONENT_HEALTH`, `eMSDP_OPPONENT_LEVEL`, `eMSDP_OPPONENT_NAME`
- `eMSDP_HITROLL`, `eMSDP_DAMROLL`, `eMSDP_AC`

**World:**
- `eMSDP_AREA_NAME`, `eMSDP_ROOM_NAME`, `eMSDP_ROOM_EXITS`, `eMSDP_ROOM_VNUM`
- `eMSDP_WORLD_TIME`

**Configuration:**
- `eMSDP_CLIENT_ID`, `eMSDP_CLIENT_VERSION`, `eMSDP_ANSI_COLORS`, `eMSDP_XTERM_256_COLORS`, `eMSDP_UTF_8`

**`MSDP_t` structure** stores per-variable state:
- `bReport` — whether client has requested this variable
- `bDirty` — whether value has changed since last report
- `ValueInt`/`pValueString` — current value

### MSSP (MUD Server State Protocol)

MSSP provides server statistics for client directory listings. Key variables:
- `TOTAL_PLAYERS`, `PLAYER_USERS`, `UPTIME`, `UPTIME_ROUNDS`
- `BYTES_IN`, `BYTES_OUT`, `MEMORY`, `MEMORY_PEAK`
- `MUD_NAME`, `MUD_PORT`, `MUD_HOST`

### MCCP (MUD Client Compression Protocol)

Uses zlib to compress output after negotiation. Client sends `WILL MCCP`, server responds `DO MCCP`. All subsequent output compressed until negotiation ends.

### DNS Caching System

**`dns_data` structure** (from `dns.h:37-49`):
- `ip` — resolved IP address string
- `name` — resolved hostname
- `time` — cache timestamp
- Linked list (`first_cache`, `last_cache`)

**Functions:**
- `resolve_dns()` — asynchronous DNS lookup (non-blocking)
- `process_dns()` — check for completed lookups
- `in_dns_cache()` — lookup cached result

### HTTP Integration (`mongoose.c`, 5,450 lines)

Mongoose web server listens on port 4444 (configurable). Capabilities:
- HTTP/HTTPS support (SSL optional)
- CGI integration for dynamic responses
- Static file serving for web UI
- Integration with MUD commands via hooks

---

## 14.2 Quest System

**Files:** `quest.c`, `quest.h`

### Quest Architecture

Thequest system implements automated quest generation and tracking. Players become `PLR_QUESTOR` when accepting quests.

### Quest Types

| Type | Description |
|------|-|--|
| Mob kill | Kill specific NPC |
| Object recovery | Recover named item |

### Quest Data Fields

**Character:**
- `pc_data.quest_number` — quest ID
- `pc_data.quest_curr` — current progress
- `pc_data.quest_accum` — total accumulated

**Timers:**
- `ch->countdown` — 10-30 minute quest timer
- `ch->nextquest` — 10 minute cooldown between quests

### Quest Rewards

| Reward | Range |
|--------|-|--|
| Gold | 2,500 - 45,000 |
| Quest Points | 25 - 75 |
| Practices | 1 - 6 |

### Quest Tokens

Quest items marked with `QUEST_OBJQUEST1`-`QUEST_OBJQUEST5` (vnums 8326-8330). Used for object recovery quests.

### Key Functions

- `do_quest()` — command handler
- `quest_update()` — timer decrement (global)
- `generate_quest()` — quest generation algorithm
- `quest_level_diff()` — difficulty calculation

---

## 14.3 Housing & Auction System

**Files:** `house.c`, `house.h`

### Housing Data Structures

**`HOME_DATA`** — Player house:
- `vnum[MAX_HOUSE_ROOMS]` — 5 rooms maximum
- `apartment` — boolean (true = apartment)
- Linked list (`first_home`, `last_home`)

**`HOMEBUY_DATA`** — Auction:
- `bidder`/`seller` — player names
- `vnum` — house room vnum
- `bid` — current bid amount
- `endtime` — auction expiration
- `apartment` — item type

**`ACCESSORIES_DATA`** — Furniture/units:
- `vnum` — item vnum
- `price` — cost
- `mob` — true = NPC, false = object

### House Features

- **Room limit:** 5 rooms per house (1 original + 4 additional)
- **Additional room cost:** 100,000,000 gold
- **House flags:** `ROOM_HOUSE`, `NO_SUMMON`, `NO_ASTRAL`, `INDOORS`
- **Key system:** House key objects lock all house exits

### Auction Mechanics

**Bidding:**
- Minimum house: 5,000,000 gold
- Minimum apartment: 2,000,000 gold
- Bid increment: 3% (configurable)
- Penalty on cancellation: 20%

**Commands:**
- `homebuy` — bid on house
- `sellhouse` — put house up for auction
- `gohome` — recall to house (all house rooms)
- `house` — edit house (immortal)

### Accessories System

Furniture/pets/guards可 purchased for houses:
- `do_accessories` — browse and buy
- `set_house()` — install item in house
- `delete_reset()` — remove item from room

---

## 14.4 Extended News System

**Files:** `news.c`, `news.h`

### News Data Structure

**`NEWS_TYPE`** — News category:
- `cmd_name` — command name
- `header` — display header
- `level` — minimum read level
- `first_news`/`last_news` — linked list of articles

**`NEWS`** — Single article:
- `title` — article title
- `name` — author
- `post` — full content (multi-line)
- `date` — posting timestamp

### Features

- **Multi-type system:** 10 news categories (configurable)
- **HTML output:** `write_html_news()` generates web pages
- **PHP/SSL integration:** Include in web pages
- **Extended buffer:** Multi-line posts (unlike note boards)

### Key Functions

- `grab_news()` — retrieve single article
- `figure_type()` — parse news type from argument
- `display_news_type()` — list articles by type
- `fread_news_type()` — load news category file
- `renumber_news()` — renumber articles on deletion

---

## 14.5 Bank System

**Files:** `bank.c`

### Account Data

Stored in `pc_data`:
- `gbalance` — gold balance
- `sbalance` — silver balance  
- `cbalance` — copper balance

### Operations

**`do_bank()` command arguments:**
- `balance` — show carried + banked amounts
- `deposit <amount>` — move from carried to bank
- `withdraw <amount>` — move from bank to carried
- `transfer <player> <amount>` — inter-player transfer

**Validation:**
- NPC check — blocks mob transactions
- Banker NPC check — requires `ACT_BANKER` flag

### Transaction Flow

1. Look up banker NPC in room
2. Parse arguments (deposit/withdraw/transfer)
3. Validate player character (not NPC)
4. Check sufficient funds
5. Update carried/bank balances
6. Send confirmation messages

---

## 14.6 Overland Map System

**Files:** `overland.c`, `overland.h`

### Coordinate System

**Map layout:**
- 3 maps (`MAP_C1`, `MAP_C2`, `MAP_C3`)
- Each: 1000×1000 coordinates (0-999)
- Origin: Northwest corner (0,0)

**Coordinate fields**: `char_data.map`, `x`, `y`

### Sector Types

| Sector | Move Loss | Description |
|--------|-|--|-|
| `SECT_C1`-`SECT_C3` | 1-10 | Terrain sectors per map |
| `SECT_OVERLAND` | 1 | Default overland terrain |

### Key Structures

**`MAPRESET_DATA`** — Overland resets:
- `type` — `TYPE_MOBILE` or `TYPE_OBJECT`
- `vnum` — entity vnum
- `map`, `x`, `y` — placement coordinates

**`LANDMARK_DATA`** — Distant features:
- `description` — visible text
- `distance` — visibility range
- `map`, `x`, `y` — location

**`ENTRANCE_DATA`** — Map transitions:
- `herex`, `herey` — entrance coordinates
- `therex`, `therey` — destination
- `tomap` — target map

### Movement

- `process_exit()` — handle direction commands
- `display_map()` — render visual map
- `collect_followers()` — move all followers
- `fix_maps()` — sync coordinates on map change

---

## 14.7 Dragonflight Module

**Files:** `dragonflight.c`, `dragonflight.h`

### Integration

Extends overland system with dragon-based fast travel.

**Requires:** `OVERLANDCODE` enabled in `overland.h`

### Dragon Flight Data

**`LANDING_DATA`** — Landing sites:
- `area` — destination area name
- `map`, `x`, `y` — coordinates

**Pulse:** `PULSE_DFLIGHT` = `PULSE_MOBILE` (16 pulses)

### Commands

- `do_call()` — summon dragon
- `do_release()` — release dragon
- `do_land()` — dismount
- `do_fly()` — fly to destination
- `do_landing_sites()` — list available sites
- `do_setlanding()` — set default landing

---

## 14.8 DNS Resolution System

**Files:** `dns.c`, `dns.h`

### Cache Structure

**`DNS_DATA`:**
- `ip` — resolved IP
- `name` — resolved hostname
- `time` — cache timestamp
- Linked list for eviction

### Integration

- Called during `accept_new()` for new connections
- Non-blocking lookup via system DNS
- cached results avoid repeated lookups

---

# 15. Refactoring Recommendations

## 15.1 Suggested Module Boundaries

### Core Engine Module
- `core/engine.c` (smaug.c, interp.c)
- `core/network.c` (mud_comm.c, protocol.c, mongoose.c)
- `core/database.c` (db.c, hashstr.c)
- `core/timing.c` (update.c, reset.c)

### Character Module
- `char/character.c` (handler.c)
- `char/player.c` (player.c)
- `char/state.c` (char_update.c, char_regen.c)

### Combat Module
- `combat/fight.c` (fight.c)
- `combat/spells.c` (magic.c)
- `combat/skills.c` (skills.c)
- `combat/stances.c`

### World Module
- `world/room.c` (room manipulation)
- `world/movement.c` (act_move.c, overland.c)
- `world/entities.c` (mobile, object instance management)

### Content Module
- `content/economy.c` (shop.c, bank.c, quest.c)
- `content/social.c` (clans.c, house.c, boards.c)
- `content/time.c` (weather.c, timezone.c)

### Systems Module
- `systems/olc.c` (build.c, ibuild.c, omedit.c)
- `systems/mudprog.c` (mud_prog.c, mpxset.c)
- `systems/admin.c` (ban.c, imm_host.c)

### Utilities Module
- `util/color.c` (color.c, colorize.c)
- `util/dice.c` (dice.c)
- `util/string.c` (misc.c, track.c)
- `util/hash.c` (hashstr.c, tables.c)

---

## 15.2 Refactoring Priority

### Easiest to Refactor (Self-Contained)

1. **Bank System** (3,000 tokens)
   - Isolated in `bank.c` (555 lines)
   - Clear API: `do_bank()`
   - No dependencies on critical path

2. **DNS Resolution** (1,500 tokens)
   - Standalone module
   - Only dependency: `mud_comm.c` connection handling
   - Can be made async with minimal changes

3. **Protocol Negotiation** (15,000 tokens — but can be extracted)
   - Well-encapsulated header (`protocol.h`)
   - Only called during connection setup
   - MSSP/MSDP updates can be decoupled

### Moderate Difficulty

4. **Quest System** (5,000 tokens)
   - Tied to player data (`pc_data`)
   - Requires timer integration
   - Can be extracted to module with `do_quest()`

5. **Housing/Auction** (6,000 tokens)
   - Integration with room system
   - Requires `reset.c` modifications
   - Can isolate with `HOME_DATA` abstraction

6. **News System** (4,000 tokens)
   - Self-contained data structures
   - Similar to note board module
   - HTML generation can be external service

### Hardest to Refactor (Deeply Entangled)

1. **MUD Programs** (11.9:6)
   - Deep integration with character/mobile entities
   - Uses `supermob` global abstraction
   - Command execution via `interpret()` hook

2. **OLC System** (12.1:14)
   - Spans 4 files (build.c, ibuild.c, omedit.c, mpxset.c)
   - Interlaces with command system
   - Substate management affects all editors

3. **Command/Interpreter** (3.1:62)
   - Central to all player input
   - Trust checks scattered throughout
   - Requires restructure of `cmd_type` and dispatch

---

## 15.3 Suggested File Structure for Refactored Version

```
src/
├── core/
│   ├── engine.c          (main loop, accept_new)
│   ├── network.c         (mud_comm, protocol, mccp, dns)
│   ├── database.c        (db, hashstr, save.c)
│   └── timing.c          (update, reset, pulse handlers)
│
├── char/
│   ├── character.c       (handler, player)
│   ├── state.c           (char_update, hit_gain, etc.)
│   └── inventory.c       (obj manipulation, inventory)
│
├── combat/
│   ├── combat.c          (fight, violence_update)
│   ├── magic.c           (spell system)
│   ├── skills.c          (skill system)
│   └── affect.c          (affect_data operations)
│
├── world/
│   ├── room.c            (room manipulation, exits)
│   ├── movement.c        (act_move, overland)
│   └── entities.c        (mobile/object instance mgmt)
│
├── content/
│   ├── economy.c         (shop, bank, quest, quest_update)
│   ├── social.c          (clans, house, boards)
│   ├── time_weather.c    (weather, timezone)
│   └── communication.c   (act_comm, channels, languages)
│
├── systems/
│   ├── olc.c             (build.c, ibuild.c, omedit.c)
│   ├── mudprog.c         (mud_prog, mpxset, mprog_driver)
│   └── admin.c           (ban, imm_host, authorization)
│
└── util/
    ├── color.c           (color, protocol output)
    ├── dice.c            (dice rolling)
    ├── hash.c            (tables, hashstr)
    └── string.c          (misc, track, ident)
```

---

**End of Analysis**
