# SMAUG 2.0 Command Documentation

**Generated from legacy/src/interp.c and legacy/src/tables.c analysis**

---

## 1. Command Table Structure

**CMDTYPE structure (mud.h:4233-4244):**
```c
struct cmd_type {
  CMDTYPE *next;        // Linked list pointer
  char *name;           // Command name
  DO_FUN *do_fun;       // Function pointer
  int flags;            // Command flags
  sh_int position;      // Minimum position required
  sh_int level;         // Minimum trust level
  sh_int log;           // Log level (LOG_NEVER/LOG_NORMAL/LOG_BUILD/LOG_HIGH/LOG_ALWAYS)
  struct timerset userec;  // Usage statistics
  int lag_count;        // Lag tracking counter
};
```

**Registration:**
- Hash table: `command_hash[126]` indexed by `command[0] % 126`
- Loaded from `commands.dat` via `fread_command()` (tables.c:4615-4728)
- Added via `add_command()` (act_wiz.c:9276-9350)

**Command file format (commands.dat):**
```
#COMMAND
Name <command_name>
Code <function_name>
Level <trust_level>
Position <position_value>
Flags <bitmask>
Log <log_level>
End
```

---

## 2. Command Lookup & Abbreviation Matching

**Lookup algorithm (interp.c:398-413):**
```c
trust = get_trust(ch);
for (cmd = command_hash[LOWER(command[0]) % 126]; cmd; cmd = cmd->next)
  if (!str_prefix(command, cmd->name) && 
      (cmd->level <= trust || ...))
```

**Matching behavior:**
- Uses `str_prefix()` - matches abbreviations (e.g., "nor" → "north")
- Only checks first character of command for hash lookup
- Returns first match satisfying trust level and flags
- Case-insensitive matching via `LOWER()` macro

**find_command() (interp.c:857-870):** External command lookup

---

## 3. Trust/Privilege System

**char_data.trust levels:**
- Player characters: 0-60 (based on level)
- Immortals: LEVEL_IMMORTAL (61) through LEVEL_AVATAR (65)
- `get_trust(ch)` returns effective trust (respects wizinvis, etc.)

**Access checks (interp.c:400-410):**
1. Direct: `cmd->level <= get_trust(ch)`
2. Council power: trust + MAX_CPD if command in council powers
3. Retired: if CMD_FLAG_RETIRED set and PCFLAG_RETIRED
4. Bestowments: trust + bestow_dif if in bestowments list

**Privilege macros (mud.h:4022-4023):**
```c
IS_IMMORTAL(ch)  // get_trust(ch) >= LEVEL_IMMORTAL (61)
IS_HERO(ch)      // get_trust(ch) >= LEVEL_HERO (62)
```

---

## 4. Position Checking

**Position hierarchy (DATAMODEL.md:610-614):**
```
POS_DEAD (0) < POS_MORTAL (1) < POS_INCAP (2) < POS_STUNNED (3) <
POS_SLEEPING (4) < POS_BERSERK (5) < POS_RESTING (6) < POS_AGGRESSIVE (7) <
POS_SITTING (8) < POS_FIGHTING (9) < POS_DEFENSIVE (10) < POS_EVASIVE (11) <
POS_STANDING (12) < POS_MOUNTED (13) < POSIX_SHOVE (14) < POSIX_DRAG (15)
```

**check_pos() (interp.c:72-161):**
```c
if (ch->position < cmd->position) {
  // Send appropriate message
  return FALSE;
}
```

**Special handling:**
- NPCs with position > 3 bypass position check
- Fighting stances have unique messages:
  - DEFENSIVE/AGGRESSIVE/EVASIVE: "This fighting style is too demanding"
  - Other fighting positions: "No way! You are still fighting!"
- Position values > 100 in commands.dat are normalized (tables.c:4715-4716)

---

## 5. Wait/Lag System

**char_data.wait:** Command delay timer
- Decremented each game tick (update.c)
- Command blocked if `wait > 0`

**WAIT_STATE macro (mud.h:4097-4103):**
```c
#define WAIT_STATE(ch, npulse) \
  ((ch)->wait = (!IS_NPC(ch) && ch->pcdata->nuisance && \
   ch->pcdata->nuisance->flags > 4) ? UMAX((ch)->wait, \
   (npulse) + (ch)->pcdata->nuisance->flags * 2) : \
   UMAX((ch)->wait, (npulse)))
```

**Lag detection (interp.c:836-852):**
- Monitors command execution time
- Flags commands > 1.5 seconds (1,500,000 microseconds)
- Counts in `cmd->lag_count`
- Logs to log file with LAG prefix

---

## 6. Substate System (SUB_* constants)

**char_data.substate:** Handles nested/multi-step commands

**Substate values (DATAMODEL.md:598-605):**
```
SUB_NONE              0  - Normal operation
SUB_PAUSE             1  - Pause for input
SUB_PERSONAL_DESC     2  - Personal description editing
SUB_BAN_DESC          3  - Ban description editing
SUB_OBJ_SHORT         4  - Object short description
SUB_OBJ_LONG          5  - Object long description
SUB_OBJ_EXTRA         6  - Object extra descriptions
SUB_MOB_LONG          7  - Mob long description
SUB_MOB_DESC          8  - Mob description
SUB_ROOM_DESC         9  - Room description
SUB_ROOM_EXTRA       10  - Room extra descriptions
SUB_ROOM_EXIT_DESC   11  - Room exit descriptions
SUB_WRITING_NOTE     12  - Note writing
SUB_MPROG_EDIT       13  - MUD program editing
SUB_HELP_EDIT        14  - Help editing
SUB_WRITING_MAP      15  - Map writing
SUB_PERSONAL_BIO     16  - Personal bio editing
SUB_REPEATCMD        17  - Repeat last command with new arg
SUB_RESTRICTED       18  - Restricted state
SUB_DEITYDESC        19  - Deity description
SUB_MORPH_DESC       20  - Morph description
SUB_MORPH_HELP       21  - Morph help
SUB_PROJ_DESC        22  - Project description
SUB_JOURNAL_WRITE    23  - Journal writing
SUB_NEWS_POST        24  - News posting
SUB_NEWS_EDIT        25  - News editing
```

**Timer substates (mud.h:925-926):**
```
SUB_TIMER_DO_ABORT   128 - Abortable timer
SUB_TIMER_CANT_ABORT 129 - Non-abortable timer
```

**SUB_REPEATCMD use (interp.c:309-346):**
- Re-executes last command with new argument
- Look up command by function pointer in hash table
- Rebuilds logline as `(<cmdname>) <argument>`

---

## 7. Social Commands

**Separate system from command table:**

**SOCIALTYPE structure:**
```c
struct social_type {
  SOCIALTYPE *next;
  char *name;
  char *char_no_arg;      // When no target
  char *others_no_arg;    // Target not visible to room
  char *char_found;       // When target found (self)
  char *others_found;     // Others see interaction
  char *vict_found;       // What victim sees
  char *char_auto;        // When auto-targeting
  char *others_auto;      // Others see auto-target
};
```

**Storage:** `social_index[27]` hash table (index 0 + letters a-z)

**Lookup via check_social() (interp.c:890-1063):**
1. Find social by name
2. Check position (same checks as commands)
3. Handle ignore system (temporarily remove ignoring chars)
4. Dispatch to proper act() message based on targets

**Socials loaded from** `socials.dat` via `load_socials()` (tables.c:4559-4608)

---

## 8. Admin/Immortal Command Distinction

**Threshold:** `level >= LEVEL_IMMORTAL` (61)

**Command flags (mud.h:4224-4228):**
```
CMD_FLAG_POSSESS     BV00 - Blocked if AFF_POSSESS
CMD_FLAG_POLYMORPHED BV01 - Blocked if polymorphed
CMD_WATCH            BV02 - Watch list logging
CMD_FLAG_RETIRED     BV03 - Available to retired players
CMD_FLAG_NO_ABORT    BV04 - Cannot abort via timers
```

**Log levels (mud.h: cmd->log field):**
- `LOG_NEVER` - Never logged
- `LOG_NORMAL` - Standard logging
- `LOG_BUILD` - Building-related
- `LOG_HIGH` - High-priority
- `LOG_ALWAYS` - Always logged

**Immortal-specific commands:**
- invis, ghost, switch, return, at, force, freeze, thaw
- wiznet, wizhelp, wizlock
- immortalize, mortalize
- dnd, holylight
- trust,bestow,authorize

---

## 9. Command Logging

**Three mechanisms:**

**1. Global log (interp.c:473-499):**
```c
if (ch->desc && ch->desc->original)
  sprintf(log_buf, "Log %s (%s): %s", ...);
else
  sprintf(log_buf, "Log %s: %s", ...);
log_string_plus(log_buf, loglvl, get_trust(ch));
```

**2. Watch files (interp.c:193-271):**
- Per-imm watch list via `WATCH_DATA`
- Logs to `WATCH_DIR/<imm>.log`
- Filtered by: target_name, player_site, trust level
- Uses `valid_watch()` to filter movement commands

**3. Command timing (interp.c:836-852):**
- Commands > 1.5 seconds flagged
- Logs: `[*** **] LAG: <name>: <cmd> <args> (R:<room> S:<sect>.<usec>)`

---

## 10. Command Alias System

**ENABLE_ALIAS compile-time flag (interp.c:744-745):**
```c
#ifdef ENABLE_ALIAS
  && !check_alias(ch, command, argument)
#endif
```

**Implementation:** `check_alias()` function (not visible in tables.c)
- Allows player-defined command aliases
- Loaded/saved per-character
- Not documented in current codebase

---

## 11. Player Commands (min trust < LEVEL_IMMORTAL = 61)

All movement commands: `POS_STANDING`

**Movement:**
- north, northwest, northeast, south, southwest, southeast, east, west, up, down

**Combat:**
- backstab - POS_STANDING
- bash - POS_STANDING  
- bashdoor - POS_STANDING
- berserk - POS_STANDING (enters berserk position)
- bite - POS_FIGHTING (vampire)
- bloodlet - POS_STANDING (vampire)
- cleave - POS_FIGHTING
- disarm - POS_FIGHTING
- draw - POS_STANDING (archery)
- flee - POS_FIGHTING (all fighting positions)
- gouge - POS_FIGHTING
- grapple - POS_FIGHTING
- kick - POS_FIGHTING
- kill - POS_FIGHTING
- murder - POS_FIGHTING
- poison_weapon - POS_STANDING
- pounce - POS_STANDING
- slice - POS_FIGHTING
- stun - POS_STANDING
- withdraw - POS_STANDING (arena)

**Travel:**
- enter - POS_STANDING
- exits - POS_STANDING
- follow - POS_STANDING
- climb - POS_STANDING
- drag - POS_STANDING
- dismount - POS_MOUNTED
- mount - POS_STANDING
- shove - POS_STANDING
- survey - POS_STANDING (overland)
- withdraw - POS_STANDING (arena)

**Information & Status:**
- look - View room, objects, characters
- examine - Examine object details and condition
- glance - Quick health/status check
- score - View character stats (HP, mana, move, gold, exp, position, etc.)
- time - Display current time and date
- weather - Show weather conditions in current area
- who - List connected players (with filters: level, class, race, clan, council, deity, immortal, deadly, leader, www, retired, group)
- wizwho - List immortals only
- changes - View recent MUD changes
- news - View news file
- help - View help files (with similar help auto-fallback)
- hlist - List help files by level range

**Interaction:**
- ask - POS_STANDING
- buy - POS_STANDING
- cast - POS_STANDING
- close - POS_STANDING
- compare - POS_STANDING
- consider - POS_STANDING
- cook - POS_RESTING
- council_induct - POS_STANDING
- council_outcast - POS_STANDING
- drop - POS_STANDING
- eat - POS_RESTING
- examine - POS_STANDING
- fill - POS_STANDING
- findnote - POS_STANDING
- fire - POS_STANDING (archery)
- give - POS_STANDING
- glance - POS_STANDING
- gohome - POS_STANDING
- group - POS_STANDING
- gtell - POS_STANDING
- gwhere - POS_STANDING
- hold - POS_STANDING
- house - POS_STANDING
- ignore - POS_STANDING
- invis - POS_STANDING (immortal-level feature)
- lock - POS_STANDING
- look - POS_STANDING
- open - POS_STANDING
- order - POS_STANDING
- pick - POS_STANDING
- play - POS_STANDING
- pour - POS_STANDING
- practice - POS_STANDING
- put - POS_STANDING
- quaff - POS_STANDING
- recite - POS_STANDING
- remove - POS_STANDING
- rent - POS_STANDING
- repair - POS_STANDING
- rest - POS_RESTING
- restore - POS_STANDING
- sell - POS_STANDING
- set - POS_STANDING
- share - POS_STANDING
- sheath - POS_STANDING
- sit - POS_SITTING
- sleep - POS_SLEEPING
- speak - POS_STANDING
- split - POS_STANDING
- stand - POS_STANDING
- take - POS_STANDING
- tell - POS_STANDING
- tip - POS_STANDING
- unholster - POS_STANDING
- unlock - POS_STANDING
- wear - POS_STANDING
- wield - POS_STANDING
- wimpy - POS_STANDING
- yell - POS_STANDING

**Communication:**
- say - Talk to room
- say_to <person> - Talk to specific person
- tell <person> <message> - Send tell to player
- reply - Reply to last tell
- retell <message> - Resend tell
- whisper <person> <message> - Whisper nearby
- shout - Shout to continent
- chat - Chat channel
- clantalk - Clan-specific channel
- ordertalk - Order channel
- counciltalk - Council channel
- guildtalk - Guild channel
- music - Music channel
- newbiechat - Newbie channel
- immtalk - Immortal channel
- muse - High god channel
- retiredtalk - Retired immortal channel
- think - Think level channel
- avtalk - Avatar channel
- wartalk - War chat
- ask - Question/answer style
- answer - Answer question
- racetalk - Race-specific channel
- traffic - Traffic information
- repeat [letter] - Look up tell history
- emote - Roleplay action
- beckon - Beckon to player
- follow <person> - Follow another player
- dismiss <person> - Dismiss follower
- group [person] [disband] [all] - Manage group
- q - Quit pager (pager command)

**Commands with unique positions:**
- eat, drink, cook - POS_RESTING
- sleep - POS_SLEEPING (except snore which works in sleep)
- sit - POS_SITTING
- flee - Any fighting position (POS_FIGHTING, POS_DEFENSIVE, POS_AGGRESSIVE, POS_EVASIVE)

**Color System Commands:**
- color [type] [color] - Set color
- color default - Reset to defaults
- color theme <name> - Apply theme
- color theme list - List themes
- color theme savetheme <name> - Save theme (immortal)
- color ansi - Toggle ANSI
- color ansi ON/OFF - Toggle ANSI mode

**Pager System:**
- Uses descriptor_data.pagebuf for output buffering
- Automatically triggered for long output
- Controlled by PCFLAG_PAGERON flag
- Page size grows from MAX_STRING_LENGTH (doubles when needed)
- Maximum size: MAX_STRING_LENGTH * 64
- Pager colors stored in descriptor_data.pagecolor

**Ignore System:**
- **ignore** <person> - Add person to ignore list
- is_ignoring() checks ignore list (pc_data.first_ignored/last_ignored)
- Players blocked when trust(sender) <= trust(receiver)
- Immortals bypass ignore checks

**Tell History:**
- pc_data.tell_history[26]: per-letter storage
- pc_data.lt_index: current tell index ('a'-'z')
- do_repeat() shows tells by letter

**Language System:**
- char_data.speaking: current language bit
- char_data.speaks: known languages bitvector
- translate(): 85% threshold translation
- scramble(): fallback obfuscation
- knows_language(): 100% for known languages
- speak <language>: set current language
- languages: list known languages

---

## 12. Immortal/Admin Commands (trust >= LEVEL_IMMORTAL = 61)

**Core Immortal Commands:**
- invis - Set invisibility level
- ghost - Become invisible
- switch - Switch to another character
- return - Return from switch
- at - Execute command at room
- force - Force command on character
- freeze - Freeze player
- thaw - Thaw frozen player

**Player Management:**
- wizlock - Wizlock the MUD
- wizhelp - Immortal command list (shows commands by level)
- restrict <command> <level> - Restrict command access
- ban <type> <name> <type> <duration> - Ban site/character
- allow <type> <name> - Unban entry
- warn <type> <name> - Toggle warning flag
- deny - Deny character access
- disconnect <player> - Disconnect player
- forceclose <descriptor#> - Close specific descriptor
- pcrename - Rename player
- delete_char - Delete character
- advance <player> <level> - Advance/demote player level
- mortalize - Demote to mortal
- immortalize - Promote to immortal
- trust <player> <level> - Modify trust level
- dnd - Do not disturb (prevents DND flag on higher imms)
- holylight - See in dark

**World Building:**
- reset - Reset area
- reboot - Reboot MUD
- shutdown - Shutdown MUD
- loadup - Load areas
- savearea - Save area
- installarea - Install area

**World Editing:**
- redit - Room editing
- mredit - Mobile editing
- oredit - Object editing
- wstat - World statistics

**Command Management:**
- bestow - Bestow command to player
- bestowarea - Bestow commands for area
- cset - Character setting
- mset - Mobile setting
- oset - Object setting
- rset - Reset setting
- sset - Spell/skill setting
- hset - House setting
- aassign - Assign OLC object
- massign - Assign OLC mobile
- rassign - Assign OLC reset
- vassign - Assign OLC zone

**World Manipulation:**
- transfer <player> [location] - Transfer player to location
- retransfer <player> - Retransfer player to saved location
- regoto - Goto saved location
- goto <location> - Move to room
- rat <start> <end> <command> - Run command across vnum range
- restore <player/all> [boost] - Restore HP/mana/move
- restoretime - Show restore cooldown info
- purge - Remove NPCs/objects from room
- minvoke <vnum> - Invoke mobile
- oinvoke <vnum> <level> <qty> - Invoke object
- statshield <player> - Toggle mob statshield
- scatter <player> - Scatter player to random room
- strew <player> <what> - Scatter coins/object

**Monitoring:**
- snoop <player> - Monitor player input
- watch player <name> - Watch a player
- watch site <address> - Watch a site
- watch command <name> - Watch a command
- watch show - Show your watches
- watch clear - Clear watch file
- watch size - Show watch file size
- watch print <start> [end] - Print watch file
- mwhere - Show mobile locations
- ofind <keyword> - Find object by vnum
- mfind <keyword> - Find mobile by vnum
- gwhere <low> <high> [mobs] - Global level search
- gfighting <low> <high> [mobs/hating/hunting] - Global combat search
- oclaim <object> [from player] [+silent] - Claim object
- bodybag <character> [yes/bag/now] - Find corpse

**System Operations:**
- reboot <portname> now/nosave - Reboot MUD
- shutdown <portname> now/nosave - Shutdown MUD
- makeadminlist - Regenerate admin list
- adminlist - Display admin list
- immhost - Show host protections
- immhost add <name> <host> - Add host protection
- immhost delete <name> <host> - Remove host protection
- immhost save - Save immhost file
- setvault show - Show vault rooms
- setvault <vnum> create/delete - Manage vault rooms

**Audit/Investigation:**
- last - Last players
- users - Show connected users
- wizlist - Show immortals
- adminlist - Show administrators
- retiredlist - Show retired immortals
- ipcompare - Compare IP addresses
- check_vnums - Validate vnums
- vnums - Show vnums
- vsearch - Search vnums
- vstat - vnum statistics
- rstat - Room statistics
- mstat - Mobile statistics
- ostat - Object statistics

**Retired Commands (CMD_FLAG_RETIRED):**
- Commands available to retired immortals

**Authorization System:**

The authorization system manages character approval state through a 0-4 workflow:

**`auth_state` Values:**
- `0`: Character created, waiting for name selection
- `1`: Name chosen, waiting for password selection
- `2`: Password chosen, waiting for email/password confirmation (denied names)
- `3`: Waiting for administrator authorization (new character creation complete)
- `4`: Fully authorized, normal play allowed

**`authorize` Command:**
```
authorize <player> <option>
```

**Options:**
- `yes/name` - Approve character, `auth_state` becomes 3
- `immsim/i` - Deny name (similar to immortal name), `auth_state` becomes 2
- `mobsim/m` - Deny name (similar to mob name), `auth_state` becomes 2  
- `swear/s` - Deny name (contains profanity), `auth_state` becomes 2
- `plain/p` - Deny name (not medieval enough), `auth_state` becomes 2
- `unpronu/u` - Deny name (unpronounceable), `auth_state` becomes 2
- `no/deny` - Deny authorization completely (forces quit)

**Authorization Workflow:**
1. New character finishes creation with `auth_state=3`
2. Character appears in `authorize` command's pending list
3. Immortal uses `authorize <player> yes` to approve
4. Character's `auth_state` becomes 3 (waiting for realm entry)
5. Upon logging back in, character is placed in realm and `auth_state` becomes 4
6. Character can now play normally

**Authorization Channel:**
- Messages sent to `CHANNEL_AUTH` (channel 10)
- Minimum level: `LEVEL_NEOPHYTE` (51)
- Logs approval/denial decisions with character name and decision reason

**Hell/Jail System:**

The hell system temporarily restricts players to a special waiting area.

**Commands:**
- `hell <player> <time> <hours/days>` - Send player to hell
- `unhell <player>` - Release player from hell early

**Hell Locations:**
- VNUM 8: Standard hell location
- VNUM 1206: Alternative hell location  
- VNUM 6: Another hell location

**Data Fields (`_pc_data`):**
- `time_t release_date` - When hell time expires (automatically released when current_time >= release_date)
- `char *helled_by` - Who sent the character to hell (stored for reference)

**`hell` Command Syntax:**
```
hell <player> <time> <hours/days>
```

**Parameters:**
- `<time>` - Positive integer (1-30 for days, any positive for hours)
- `<hours/days>` - Time unit (default: hours)

**Restrictions:**
- Cannot hell for zero or negative time
- Maximum 30 days at a time
- Cannot hell immortals (no point in sending them to hell)

**`unhell` Command:**
- Releases player from hell to their deity's recall or temple
- Sets `release_date` to 0
- Clears `helled_by` field
- Sends notification to the released player

**Auto-Release:**
- When `current_time >= release_date`, character is automatically released
- Character is moved to temple/deity recall
- No immortals needed to manually unhell

**Special Commands:**
- loop <cmd> <start> <end> <params> - Loop command across vnums
- low_purge - Purge room items without NPC check
- balzhur <player> - Demote player to level 2 (punishment)
- elevate <player> - Elevate level 51 to 52
- nohomepage <player> - Prevent homepage setting
- nodesc <player> - Prevent description setting
- nohttp <player> - Prevent HTTP homepage
- nobio <player> - Prevent bio setting
- nobeckon <player> - Prevent beckon ability
- delay <player> <rounds> - Delay player actions

---

## 13. Command Execution Flow

1. **Input received** → `interpret(ch, argument)`
2. **Substate check** (if SUB_REPEATCMD, use last command)
3. **Parse command word** (one_argument)
4. **Hash lookup** by first character
5. **Trust/privilege check** (trust, council, bestow, retired)
6. **Position check** (check_pos)
7. **Command flags check** (check_cmd_flags)
8. **Command execution** (`(*cmd->do_fun)(ch, argument)`)
9. **Lag timing** if > 1.5 seconds
10. **Logging** to file, watch files, or both

---

## 14. File Locations

- **Commands:** `commands.dat` in `SYSTEM_DIR/SMAUGlocale/`
- **Socials:** `socials.dat` in `SYSTEM_DIR/SMAUGlocale/`
- **Command loader:** `fread_command()` in tables.c:4615-4728
- **Social loader:** `fread_social()` in tables.c:4487-4556
- **Add command:** `add_command()` in act_wiz.c:9276-9350
- **Lookup:** `interpret()` in interp.c:279-855
- **Position check:** `check_pos()` in interp.c:72-161
- **Social handler:** `check_social()` in interp.c:890-1063

---

## 15. Information & Communication Commands

### Look & Examine
- **look** [auto|under|in|sky|door|object|person] - View room or examine object/person
- **examine** [object|person] - Examine object (shows condition, extra descriptions)
- **glance** [person] - Quick status check
- **exits** - List obvious room exits
- **score** - View character stats (HP, mana, move, gold, exp, etc.)
- **time** - Display time and date
- **weather** - Show current weather conditions

### Communication
- **say** <message> - Say to room
- **say_to** <person> <message> - Say to specific person
- **tell** <person> <message> - Send tell to player
- **reply** - Reply to last tell
- **retell** <message> - Resend tell to last recipient
- **whisper** <person> <message> - Whisper to neighbor
- **yell** <message> - Shout to area
- **shout** <message> - Shout to continent
- **chat** <message> - Chat channel
- **clantalk** <message> - Clan channel
- **ordertalk** <message> - Order channel
- **counciltalk** <message> - Council channel
- **guildtalk** <message> - Guild channel
- **music** <message> - Music channel
- **newbiechat** <message> - Newbie channel
- **immtalk** <message> - Immortal channel
- **muse** <message> - High god channel
- **retiredtalk** <message> - Retired immortal channel
- **think** <message> - Think level channel
- **avtalk** <message> - Avatar channel
- **wartalk** <message> - War chat
- **ask** <message> - Ask question
- **answer** <message> - Answer question
- **racetalk** <message> - Race channel
- **traffic** <message> - Traffic information
- **q** - Quit pager
- **repeat** [letter] - Show tell history by letter

### Language
- **speak** <language> - Set current speaking language
- **languages** - List known languages

### Who List
- **who** <level> [level] [class] [race] [clan] [council] [deity] [immortal] [deadly] [leader] [www] [retired] [group] - List players
- **wizwho** <level> [level] <immortal> - List immortals

### Social/Interaction
- **beacon** <person> - Beacon player to you
- **beckon** <person> - Beckon to player
- **emote** <action> - Roleplay action
- **group** [person] [disband] [all] - Manage group
- **follow** <person> - Follow another player
- **dismiss** <person> - Dismiss charmed follower

### Pager System
- Uses color codes (&X syntax)
- Controlled by PCFLAG_PAGERON flag
- Page size: MAX_STRING_LENGTH (grows dynamically)
-Pager colors set via descriptor_data.pagecolor

### Channel Deaf System
- char_data.deaf: bitvector for channel flags
-CHANNEL_TELLS, CHANNEL_WHISPER: individual toggle
-CHANNEL_CHAT, CHANNEL_YELL, etc.: channel-specific bits
- deaf bit removed on successful message send

### Ignore System
- **ignore** <person> - Add person to ignore list
- is_ignoring() checks ignore list
- Immortals bypass ignore checks

### Color System
- **color** [color type] [color] - Set color
- **color default** - Reset to defaults
- **color theme <name>** - Apply color theme
- **color theme list** - List themes
- **color theme savetheme <name>** - Save theme (immortal only)
- **color ansi** - Toggle ANSI colors
- **color _all_ <color>** - Set all colors to one color
- **color _reset_** - Reset to defaults

### Tell History
- pc_data.tell_history[26]: array of last tells per letter
- do_repeat() shows tells by letter index (a-z)
- Storage format: "%s told you '%s'\n"

### Language System
- char_data.speaking: current language bit
- char_data.speaks: known languages bitvector
- translate(): 85% threshold for translation
- scramble(): fallback obfuscation

### Pager System
- descriptor_data.pagebuf: allocated buffer
- descriptor_data.pagesize: buffer size (starts at MAX_STRING_LENGTH, doubles when full)
- descriptor_data.pagetop: write position
- descriptor_data.pagepoint: read position
- Maximum buffer size: MAX_STRING_LENGTH * 64

---

**Generated:** 2026-03-28
**Source files:** legacy/src/interp.c, legacy/src/tables.c, legacy/src/mud.h, legacy/src/act_info.c, legacy/src/act_comm.c, legacy/src/color.c
**Data model:** DATAMODEL.md, STRUCTURE.md
