# MUD Codebase Structure Analysis (WIP)

**Generated:** 2026-03-27
**Purpose:** Phase 1 - Legacy codebase inventory and subsystem grouping

## File Inventory

### Source Files by Location

#### `/legacy/src/` - Main source directory (108 files)
- 86 `.c` files
- 22 `.h` files

#### `/legacy/tools/` - Utility scripts (1 `.c` file)
- `file_header.c` (2,490 bytes)

## Largest Files by Line Count (Top 20)

| Rank | File | Lines | Category |
|------|------|-------|----------|
| 1 | act_wiz.c | 13,078 | World/Character actions |
| 2 | build.c | 11,286 | OLC (Online Building) |
| 3 | db.c | 8,814 | Database loading/parsing |
| 4 | magic.c | 8,749 | Spell system |
| 5 | skills.c | 6,845 | Player skills |
| 6 | mud.h | 6,703 | Main header (definitions) |
| 7 | act_info.c | 6,697 | Info commands (who, status) |
| 8 | handler.c | 5,863 | Object/npc handling |
| 9 | mongoose.c | 5,450 | HTTP server |
| 10 | fight.c | 5,117 | Combat system |
| 11 | tables.c | 5,068 | Data tables |
| 12 | act_comm.c | 4,847 | Communication (say, tell) |
| 13 | act_obj.c | 4,617 | Object actions |
| 14 | smaug.c | 4,498 | Entry point/main loop |
| 15 | mud_prog.c | 4,429 | MUD programming (mprog) |
| 16 | update.c | 4,067 | Game tick/update loop |
| 17 | ibuild.c | 3,976 | Interior building editor |
| 18 | player.c | 3,802 | Player management |
| 19 | overland.c | 3,752 | Overland travel system |
| 20 | mud_comm.c | 3,741 | Network communication |

## Subsystem Grouping Hypothesis

Based on filename patterns:

### Core Engine
- `smaug.c` - Main entry point
- `mud_comm.c` - Network communication layer
- `mongoose.c` / `httpd.c` - HTTP server
- `protocol.c` / `protocol.h` - Protocol handling
- `mccp.c` / `mccp.h` - MUD Client Compression Protocol
- `resolv.c` / `dns.c` - DNS resolution

### Database & Persistence
- `db.c` - Database I/O, loading
- `save.c` - Character/world saving
- `hashstr.c` - String hashing for optimization

### Game Logic
- `handler.c` - Object/npc handling
- `update.c` - Game tick/update logic
- `reset.c` - Area resets/monster spawning

### Character System
- `player.c` - Player creation/management
- `act_comm.c` - Communication (say, tell, emote)
- `act_info.c` - Info commands (who, look, stats)
- `act_wiz.c` - Wizard/admin commands
- `act_obj.c` - Object use/interaction
- `act_move.c` - Movement (north, south, etc.)

### Combat & Magic
- `fight.c` - Combat system
- `magic.c` - Spell system
- `skills.c` - Skill system
- `stances.c` - Combat stances

### World Building (OLC)
- `build.c` - Exterior building editor
- `ibuild.c` - Interior building editor
- `omedit.c` - Object editor
- `oredit.c` - Object editor (alternative)
- `ooedit.c` - Object editor (another)
- `mpxset.c` - MUD program editor

### Content Systems
- `liquids.c` / `liquids.h` - Liquid types
- `weather.c` / `weather.h` - Weather system
- `timezone.c` / `timezone.h` - Time management
- `overland.c` / `overland.h` - Overland travel
- `_planes.c` - Plane/layer system
- `dragonflight.c` / `dragonflight.h` - Dragon flight mechanic

### Social Systems
- `clans.c` - Clan management
- `house.c` / `house.h` - Housing system
- `boards.c` - Message boards
- `comments.c` - Comments system
- `marry.c` - Marriage system

### Quest & Economy
- `quest.c` / `quest.h` - Quest system
- `deity.c` - Deity/religion system
- `shops.c` - Shopkeeping
- `bank.c` - Banking system

### Utility & Infrastructure
- `interp.c` - Command interpreter
- `tables.c` - Data tables (colors, dice, etc.)
- `color.c` / `color.h` - Color codes
- `colorize.c` - Color formatting
- `dice.c` - Dice rolling
- `misc.c` - Miscellaneous utilities
- `track.c` - Tracking system
- `ident.c` - Identification system

### Security & Admin
- `ban.c` - IP/character banning
- `imm_host.c` - Immortal host filtering
- `adminlist.c` - Admin list management

### Tools
- `renumber.c` - Room renumbering utility
- `mapout.c` - Map export utility
- `grub.c` - GRUB (database cleanup?)
- `starmap.c` - Star map utility

### Third-party Integration
- `sha256.c` / `sha256.h` - SHA256 hashing
- `news.c` / `news.h` - News system

## Notes

- Total source lines: ~200,555 lines
- Largest header: `mud.h` (6,703 lines) - main definitions
- Largest implementation: `act_wiz.c` (13,078 lines) - wizard commands
- Multiple overlapping editors (omedit, oredit, ooedit, omedit) suggest iterative development
- HTTP server appears to be `mongoose.c` (not `httpd.c`)

## Next Steps

1. Read `mud.h` to understand core data structures
2. Read `db.c` to understand database format
3. Read `smaug.c` to understand program flow
4. Document data model in DATAMODEL.md
