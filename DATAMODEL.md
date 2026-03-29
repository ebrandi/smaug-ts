# MUD Data Model

**Generated:** 2026-03-27  
**Source:** `/legacy/src/` header files only

---

## Overview

This document captures all major data structures, enums, and constants found in the legacy SMAUG 2.0 MUD codebase. This is a comprehensive analysis of the header files only, with no .c files examined.

---

## Major Structs

### Core Engine

#### `descriptor_data`
Client connection descriptor
- `next`, `prev` - linked list pointers
- `character`, `original` - player character data
- `host`, `port` - connection info
- `descriptor` - socket fd
- `connected` - connection state (CON_PLAYING, CON_GET_NAME, etc.)
- `idle` - idle timer
- `lines`, `scrlen` - display settings
- `inbuf`, `incomm`, `inlast` - input buffers
- `outbuf`, `outsize`, `outtop` - output buffer
- `pagebuf`, `pagesize`, `pagetop` - paging
- `olc` - OLC data pointer (when in OLC mode)

#### `char_data`
Player or NPC character
- `next`, `prev` - global linked list
- `next_in_room`, `prev_in_room` - room list
- `master`, `leader` - social relationships
- `fighting` - combat data
- `reply`, `retell`, `switched` - target chars
- `mount` - mount character
- `hunting`, `fearing`, `hating` - mob relationships
- `spec_fun` - special function
- `pIndexData` - pointer to prototype
- `desc` - descriptor link
- `first_affect`, `last_affect` - affect list
- `first_carrying`, `last_carrying` - inventory list
- `in_room`, `was_in_room` - room pointers
- `pcdata` - player-specific data (NULL for NPCs)
- `name`, `short_descr`, `long_descr`, `description` - text
- `num_fighting` - multi-fight counter
- `substate` - substate (for nested commands)
- `sex`, `class`, `race`, `level`, `trust` - attributes
- `played`, `logon`, `save_time` - timing
- `timer`, `wait` - timers
- `hit`, `max_hit`, `mana`, `max_mana`, `move`, `max_move` - VFS
- `practice`, `numattacks` - stats
- `gold`, `exp` - economy
- `act`, `affected_by`, `no_affected_by` - bitvectors
- `no_immune`, `no_resistant`, `no_susceptible` - resistances
- `immune`, `resistant`, `susceptible` - resistance values
- `stance_immune`, `stance_resistant`, `stance_susceptible` - stance resistances
- `attacks`, `defenses` - combat bitvectors
- `speaking`, `speaks` - language settings
- `saving_*` - save modifiers
- `alignment` - moral alignment
- `barenumdie`, `baresizedie`, `mobthac0`, `hitroll`, `damroll` - combat
- `hitplus`, `damplus` - combat bonuses
- `position`, `defposition`, `style` - stance
- `height`, `weight` - physical
- `armor`, `wimpy` - combat stats
- `deaf` - hearing impairments
- `perm_*`, `mod_*` - attribute arrays (str, int, wis, dex, con, cha, lck)
- `mental_state`, `emotional_state` - psychological
- `colorize` - color settings
- Quest variables (if ENABLE_QUEST)
- Overland coordinates (if OVERLANDCODE)

#### `_pc_data`
Player character specific data
- `pet` - pet character
- `clan`, `council`, `deity` - affiliations
- `area` - current area
- `lang` - language
- `homepage`, `email`, `icq` - contact info
- `clan_name`, `council_name`, `deity_name` - names
- `pwd` - password
- `bamfin`, `bamfout` - entry/exit messages
- `filename`, `rank`, `title`, `bestowments` - identity
- `betted_on` - betting info
- `flags` - player flags (deadly, wizinvis, etc.)
- `pkills`, `pdeaths`, `mkills`, `mdeaths`, `illegal_pk` - combat stats
- `bet_amt` - bet amount
- `outcast_time`, `restore_time` - timers
- `r_range_lo`, `r_range_hi`, `m_range_lo`, `m_range_hi`, `o_range_lo`, `o_range_hi` - editor ranges
- `wizinvis`, `min_snoop` - levels
- `condition` - hunger/thirst states
- `learned` - skill/spell proficiencies
- `killed` - mob kill tracking
- `quest_number`, `quest_curr`, `quest_accum` - quest system
- `honour`, `favor` - systems
- `charmies` - charm count
- `auth_state`, `release_date`, `helled_by` - admin
- `bio` - biography
- `authed_by` - who approved
- `special_skills` - personal spells
- `prompt`, `fprompt`, `subprompt` - prompts
- `pagerlen` - pager settings
- `stances` - stance array
- `openedtourney` - tournament flag
- `first_ignored`, `last_ignored` - ignore list
- `tell_history` - tell log
- `see_me` - who can see (imm only)
- `recent_site`, `prev_site` - tracking

#### `mob_index_data`
Mobile (NPC) prototype
- `next`, `next_sort` - linked list
- `spec_fun` - special function
- `pShop`, `rShop` - shop pointers
- `mudprogs`, `progtypes` - MUD program
- `player_name`, `short_descr`, `long_descr`, `description` - text
- `vnum` - virtual number
- `count`, `killed` - stats
- `sex`, `level` - attributes
- `act`, `affected_by` - bitvectors
- `alignment` - alignment
- `mobthac0`, `ac`, `hitnodice`, `hitsizedice`, `hitplus` - combat
- `damnodice`, `damsizedice`, `damplus` - damage
- `numattacks` - attack count
- `gold`, `exp` - economy
- `xflags`, `immune`, `resistant`, `susceptible` - resistances
- `attacks`, `defenses` - combat bitvectors
- `speaks`, `speaking` - language
- `position`, `defposition`, `height`, `weight` - physical
- `race`, `class` - attributes
- `hitroll`, `damroll` - combat
- `perm_*` - attribute arrays
- `saving_*` - save modifiers
- `silver`, `copper` - currency
- `stances` - stance array

#### `obj_index_data`
Object prototype
- `next`, `next_sort` - linked list
- `first_extradesc`, `last_extradesc` - descriptions
- `first_affect`, `last_affect` - affects
- `mudprogs`, `progtypes` - MUD program
- `name`, `short_descr`, `description`, `action_desc` - text
- `vnum` - virtual number
- `level` - level requirement
- `item_type` - type enum
- `extra_flags`, `magic_flags` - bitvectors
- `wear_flags` - wear locations
- `count`, `weight` - physical
- `gold_cost`, `silver_cost`, `copper_cost` - cost
- `value[6]` - values
- `serial` - unique serial
- `layers` - clothing layers

#### `obj_data`
Instance of an object
- `next`, `prev`, `next_content`, `prev_content` - linked lists
- `first_content`, `last_content` - container contents
- `in_obj` - container pointer
- `carried_by` - carrier
- `extra_desc`, `affect` - extended data
- `pIndexData` - prototype
- `in_room` - location
- `name`, `short_descr`, `extra_descr`, `description`, `action_desc` - text
- `owner` - owner name
- `item_type`, `extra_flags`, `magic_flags`, `wear_flags` - flags
- `wear_loc` - equipped location
- `weight` - weight
- `gold_cost`, `silver_cost`, `copper_cost` - cost
- `level`, `timer` - timing
- `value[6]` - values
- `count` - stack count
- `serial` - unique serial

#### `room_index_data`
Room prototype
- `next`, `next_sort` - linked list
- `first_person`, `last_person` - occupants
- `first_content`, `last_content` - floor items
- `extra_desc` - descriptions
- `area` - area pointer
- `first_exit`, `last_exit` - exits
- `affect` - affects
- `map` - map data
- `plane` - plane pointer
- `mudprogs`, `progtypes` - MUD program
- `name`, `description` - text
- `vnum` - virtual number
- `weight`, `max_weight` - capacity
- `room_flags`, `progtypes` - flags
- `light` - light level
- `sector_type` - terrain type
- `tele_vnum`, `tele_delay` - teleport
- `tunnel` - capacity

#### `area_data`
Area definition
- `next`, `prev`, `next_sort`, `prev_sort`, `next_sort_name`, `prev_sort_name` - lists
- `first_reset`, `last_reset` - reset commands
- `name`, `filename` - info
- `flags` - area flags
- `status` - loaded state
- `age`, `nplayer` - stats
- `reset_frequency` - reset timer
- `low_r_vnum`, `hi_r_vnum` - room range
- `low_o_vnum`, `hi_o_vnum` - object range
- `low_m_vnum`, `hi_m_vnum` - mob range
- `low_soft_range`, `hi_soft_range` - soft range
- `low_hard_range`, `hi_hard_range` - hard range
- `spelllimit`, `curr_spell_count` - spell tracking
- `author`, `credits`, `resetmsg` - metadata
- `last_mob_reset`, `last_obj_reset` - reset tracking
- `max_players` - capacity
- `mkills`, `mdeaths`, `pkills`, `pdeaths`, `illegal_pk` - stats
- `gold_looted`, `silver_looted`, `copper_looted` - economy
- `high_economy`, `low_economy` - tier
- `weather` - weather pointer

### Combat & Magic

#### `affect_data`
Spell/effect application
- `next`, `prev` - linked list
- `type` - spell/skill number
- `duration` - duration
- `location` - apply type (APPLY_STR, etc.)
- `modifier` - amount to modify
- `bitvector` - bitvector to set

#### `smaug_affect`
Extended affect (SMAUG-specific)
- `next` - linked list
- `duration` - duration
- `location` - affect type
- `modifier` - value
- `bitvector` - bit position

#### `skill_type`
Skill/spell definition
- `name` - name
- `skill_level[MAX_CLASS]` - level per class
- `skill_adept[MAX_CLASS]` - max % per class
- `race_level[MAX_RACE]` - racial levels
- `race_adept[MAX_RACE]` - racial max %
- `spell_fun` - spell function
- `skill_fun` - skill function
- `target` - target types
- `minimum_position` - min position
- `slot` - slot for object loading
- `min_mana` - min mana
- `beats` - rounds required
- `noun_damage` - damage message
- `msg_off` - wear off message
- `guild` - guild
- `min_level` - minimum level
- `type` - skill/spell type
- `range` - spell range
- `info` - spell info bits
- `flags` - skill flags
- `alignment` - alignment requirement
- `hit_char`, `hit_vict`, `hit_room`, `hit_dest` - success messages
- `miss_char`, `miss_vict`, `miss_room` - failure messages
- `die_char`, `die_vict`, `die_room` - death messages
- `imm_char`, `imm_vict`, `imm_room` - immune messages
- `dice` - dice string
- `value` - misc value
- `spell_sector` - sector
- `saves` - save type
- `difficulty` - difficulty
- `affects` - smaug affects
- `components` - components
- `teachers` - teacher requirements
- `participants` - participants needed
- `userec` - usage record

### World System

#### `exit_data`
Room exit
- `prev`, `next` - linked list
- `rexit` - reverse exit
- `to_room` - destination room
- `keyword` - exit keywords
- `description` - description
- `vnum`, `rvnum` - virtual numbers
- `exit_info` - exit flags
- `key` - key vnum
- `vdir`, `orig_door` - direction
- `distance` - distance to next room
- `pull`, `pulltype` - push/pull

#### `reset_data`
Area reset command
- `next`, `prev` - linked list
- `command` - reset command char
- `extra` - extra data
- `arg1`, `arg2`, `arg3` - arguments

#### `extra_descr_data`
Extra description
- `next`, `prev` - linked list
- `keyword` - keyword
- `description` - description

### Shop & Economy

#### `shop_data`
Shop definition
- `next`, `prev` - linked list
- `keeper` - keeper mob vnum
- `buy_type[MAX_TRADE]` - buyable items
- `profit_buy`, `profit_sell` - profit margins
- `open_hour`, `close_hour` - hours

#### `repairshop_data`
Repair shop
- `next`, `prev` - linked list
- `keeper` - keeper mob vnum
- `fix_type[MAX_FIX]` - fixable items
- `profit_fix` - profit margin
- `shop_type` - shop type
- `open_hour`, `close_hour` - hours

### Social Systems

#### `clan_data`
Clan/guild information
- `next`, `prev` - linked list
- `filename`, `name`, `abbrev`, `motto` - identity
- `description`, `deity`, `leader` - info
- `number1`, `number2` - officers
- `badge` - badge string
- `leadrank`, `onerank`, `tworank` - ranks
- `pkills[7]`, `pdeaths[7]` - pkill stats
- `mkills`, `mdeaths` - mob stats
- `illegal_pk` - illegal pk count
- `score` - overall score
- `clan_type` - clan type
- `favour` - deity favor
- `strikes` - strike count
- `members`, `mem_limit` - membership
- `alignment` - alignment
- `board` - board vnum
- `clanobj1-5` - clan objects
- `recall`, `storeroom` - room vnums
- `guard1`, `guard2` - guards
- `class` - class for guilds

#### `council_data`
Council information
- `next`, `prev` - linked list
- `filename`, `name`, `description` - info
- `head`, `head2` - leaders
- `powers` - powers
- `abbrev` - abbreviation
- `members` - member count
- `board`, `meeting`, `storeroom` - room vnums

#### `deity_data`
Deity information
- `next`, `prev` - linked list
- `filename`, `name`, `description` - info
- `alignment` - alignment
- `worshippers` - worshipper count
- `scorpse`, `sdeityobj`, `savatar`, `srecall` - object vnums
- `flee`, `flee_npcrace`, `flee_npcfoe` - flee flags
- `kill`, `kill_magic`, `kill_npcrace`, `kill_npcfoe` - kill flags
- `sac` - sacrifice
- `bury_corpse`, `aid_spell`, `aid` - actions
- `backstab`, `steal`, `die`, `die_npcrace`, `die_npcfoe` - flags
- `spell_aid`, `dig_corpse` - actions
- `race`, `race2`, `class`, `sex` - restrictions
- `npcrace`, `npcfoe` - NPC restrictions
- `suscept`, `element` - susceptibility
- `affected` - affects
- `susceptnum`, `elementnum`, `affectednum` - counts
- `objstat` - object stat

#### `member_data`, `member_list`
Clan membership
- `name`, `since`, `class`, `level`, `deaths`, `kills` - member info
- `next`, `prev` - linked list

### Time & Weather

#### `time_info_data`
Time information
- `hour`, `day`, `month`, `year` - calendar
- `season` - season enum
- `sunlight` - sun position

#### `weather_data`
Weather system
- `temp`, `precip`, `wind` - weather stats
- `temp_vector`, `precip_vector`, `wind_vector` - change vectors
- `climate_temp`, `climate_precip`, `climate_wind` - climate
- `first_neighbor`, `last_neighbor` - neighbor areas
- `echo` - echo string
- `echo_color` - echo color

#### `neighbor_data`
Neighbor area
- `next`, `prev` - linked list
- `name` - area name
- `address` - area pointer

#### `WeatherCell` (weather.h)
Weather map cell
- `climate` - climate type
- `hemisphere` - hemisphere
- `temperature` - temp (Fahrenheit)
- `pressure` - pressure
- `cloudcover` - cloud cover
- `humidity` - humidity
- `precipitation` - precipitation
- `energy` - storm energy
- `windSpeedX`, `windSpeedY` - wind velocity

### MUD Programs

#### `mob_prog_data`
MUD program
- `next` - linked list
- `type` - prog type
- `triggered` - triggered flag
- `resetdelay` - reset delay
- `arglist` - argument list
- `comlist` - command list

#### `mob_prog_act_list`
MUD program action list
- `next` - linked list
- `buf` - buffer
- `ch`, `obj`, `victim`, `target` - targets

#### `mpsleep_data`
Sleeping MUD program
- `next`, `prev` - linked list
- `timer` - sleep timer
- `type` - MP type
- `room` - room pointer
- `ignorelevel`, `iflevel` - state
- `ifstate[MAX_IFS][DO_ELSE]` - if state
- `com_list`, `mob`, `actor`, `obj`, `victim`, `target` - args
- `single_step` - step flag

### Character Morphing

#### `char_morph`
Active character morph
- `morph` - morph data
- `affected_by`, `no_affected_by` - affect bitvectors
- `no_immune`, `no_resistant`, `no_suscept` - resistance
- `immune`, `resistant`, `suscept` - values
- `timer` - duration
- `ac`, `blood`, `cha`, `con`, `damroll` - stats
- `dex`, `dodge`, `hit`, `hitroll`, `inte` - more stats
- `lck`, `mana`, `move`, `parry` - combat
- `saving_*` - save modifiers
- `str`, `tumble`, `wis` - attributes

#### `morph_data`
Morph definition
- `next`, `prev` - linked list
- `blood`, `damroll`, `deity`, `description` - text
- `help`, `hit`, `hitroll`, `key_words` - more text
- `long_desc`, `mana`, `morph_other`, `morph_self` - text
- `move`, `name`, `short_desc`, `no_skills`, `skills` - text
- `unmorph_other`, `unmorph_self` - text
- `affected_by`, `no_affected_by` - affect bitvectors
- `class`, `defpos` - class/position
- `no_immune`, `no_resistant`, `no_suscept` - resistance
- `immune`, `resistant`, `suscept` - values
- `obj[3]` - requirements
- `race` - race
- `timer` - duration
- `used` - usage count
- `vnum` - vnum
- `ac`, `bloodused`, `cha`, `con`, `dayfrom`, `dayto` - stats
- `dex`, `dodge`, `favourused`, `gloryused`, `hpused` - more stats
- `inte`, `lck`, `level`, `manaused`, `moveused` - even more
- `parry`, `pkill`, `saving_*` - combat
- `sex`, `str`, `timefrom`, `timeto`, `tumble`, `wis` - attributes
- `no_cast` - cast flag
- `objuse[3]` - object uses

### Language & Localization

#### `lcnv_data`
Language conversion
- `next`, `prev` - linked list
- `old`, `olen` - old string
- `new`, `nlen` - new string

#### `lang_data`
Language definition
- `next`, `prev` - linked list
- `name` - language name
- `first_precnv`, `last_precnv` - pre-conversion
- `alphabet` - alphabet
- `first_cnv`, `last_cnv` - conversion

#### `locale_data`
Locale data
- `next`, `prev` - linked list
- `filename`, `name`, `lang` - info
- `mem_limit` - memory limit

### Security & Ban

#### `ban_data`
Site ban
- `next`, `prev` - linked list
- `name`, `user`, `note` - info
- `ban_by`, `ban_time` - admin info
- `flag` - flag type
- `unban_date`, `duration` - timing
- `level` - level banned
- `warn`, `prefix`, `suffix` - flags

#### `nuisance_data`
Nuisance flag data
- `time`, `max_time` - timing
- `flags` - stage
- `power` - power

### System & Global

#### `system_data`
System settings and stats
- `maxplayers`, `alltimemax` - player stats
- `global_gold_looted`, `global_silver_looted`, `global_copper_looted` - economy
- `upill_val`, `upotion_val`, `brewed_used`, `scribed_used` - usage
- `time_of_max` - time record
- `mud_name`, `port_name` - identity
- `NO_NAME_RESOLVING`, `DENY_NEW_PLAYERS`, `WAIT_FOR_AUTH` - flags
- `read_all_mail`, `read_mail_free`, `write_mail_free`, `take_others_mail` - mail
- `muse_level`, `think_level`, `build_level`, `log_level` - levels
- `level_modify_proto`, `level_override_private`, `level_mset_player` - levels
- `bash_plr_vs_plr`, `bash_nontank`, `gouge_plr_vs_plr`, `gouge_nontank` - combat
- `stun_plr_vs_plr`, `stun_regular` - stun
- `dodge_mod`, `parry_mod`, `tumble_mod`, `tumble_pk` - combat mods
- `dam_*` - damage modifiers
- `level_getobjnotake`, `level_forcepc` - levels
- `bestow_dif` - bestow diff
- `max_sn` - max skills
- `peaceful_exp_mod`, `deadly_exp_mod` - exp
- `guild_overseer`, `guild_advisor` - guild
- `save_flags`, `save_frequency` - save
- `check_imm_host`, `morph_opt`, `save_pets` - flags
- `pk_channels`, `pk_silence` - pk
- `ban_site_level`, `ban_class_level`, `ban_race_level` - ban
- `ident_retries` - retries
- `pk_loot` - loot flag
- `news_html_path`, `max_html_news` - news
- `save_version` - version
- `wizlock`, `magichell` - flags
- Various timezone settings
- `maxholiday` - holiday count

#### `affect_data`
Spell affect
- `next`, `prev` - linked list
- `type` - spell num
- `duration` - duration
- `location` - apply type
- `modifier` - modifier
- `bitvector` - bitvector

### Game Entities

#### `CHAR_DATA` - Player/NPC
#### `PC_DATA` - Player data only
#### `MOB_INDEX_DATA` - Mob prototype
#### `OBJ_DATA` - Object instance
#### `OBJ_INDEX_DATA` - Object prototype
#### `ROOM_INDEX_DATA` - Room prototype
#### `EXTRA_DESCR_DATA` - Extra description
#### `EXIT_DATA` - Room exit
#### `RESET_DATA` - Area reset

### Enums

#### `connection_types`
- `CON_PLAYING`, `CON_GET_NAME`, `CON_GET_OLD_PASSWORD`
- `CON_CONFIRM_NEW_NAME`, `CON_GET_NEW_PASSWORD`, `CON_CONFIRM_NEW_PASSWORD`
- `CON_GET_NEW_SEX`, `CON_GET_NEW_CLASS`, `CON_READ_MOTD`
- `CON_GET_NEW_RACE`, `CON_GET_EMULATION`, `CON_EDITING`
- `CON_GET_WANT_RIPANSI`, `CON_TITLE`, `CON_PRESS_ENTER`
- `CON_WAIT_1`, `CON_WAIT_2`, `CON_WAIT_3`
- `CON_ACCEPTED`, `CON_GET_PKILL`, `CON_READ_IMOTD`
- `CON_COPYOVER_RECOVER`

#### `char_substates`
- `SUB_NONE`, `SUB_PAUSE`, `SUB_PERSONAL_DESC`, `SUB_BAN_DESC`
- `SUB_OBJ_SHORT`, `SUB_OBJ_LONG`, `SUB_OBJ_EXTRA`, `SUB_MOB_LONG`, `SUB_MOB_DESC`
- `SUB_ROOM_DESC`, `SUB_ROOM_EXTRA`, `SUB_ROOM_EXIT_DESC`
- `SUB_WRITING_NOTE`, `SUB_MPROG_EDIT`, `SUB_HELP_EDIT`
- `SUB_WRITING_MAP`, `SUB_PERSONAL_BIO`, `SUB_REPEATCMD`
- `SUB_RESTRICTED`, `SUB_DEITYDESC`, `SUB_MORPH_DESC`, `SUB_MORPH_HELP`
- `SUB_PROJ_DESC`, `SUB_JOURNAL_WRITE`, `SUB_NEWS_POST`, `SUB_NEWS_EDIT`

#### `sex_types`
- `SEX_NEUTRAL`, `SEX_MALE`, `SEX_FEMALE`

#### `positions`
- `POS_DEAD`, `POS_MORTAL`, `POS_INCAP`, `POS_STUNNED`
- `POS_SLEEPING`, `POS_BERSERK`, `POS_RESTING`, `POS_AGGRESSIVE`
- `POS_SITTING`, `POS_FIGHTING`, `POS_DEFENSIVE`, `POS_EVASIVE`
- `POS_STANDING`, `POS_MOUNTED`, `POS_SHOVE`, `POS_DRAG`

#### `sector_types`
- `SECT_INSIDE`, `SECT_CITY`, `SECT_FIELD`, `SECT_FOREST`
- `SECT_HILLS`, `SECT_MOUNTAIN`, `SECT_WATER_SWIM`, `SECT_WATER_NOSWIM`
- `SECT_UNDERWATER`, `SECT_AIR`, `SECT_DESERT`, `SECT_DUNNO`
- `SECT_OCEANFLOOR`, `SECT_UNDERGROUND`, `SECT_LAVA`, `SECT_SWAMP`

#### `dir_types`
- `DIR_NORTH`, `DIR_EAST`, `DIR_SOUTH`, `DIR_WEST`, `DIR_UP`, `DIR_DOWN`
- `DIR_NORTHEAST`, `DIR_NORTHWEST`, `DIR_SOUTHEAST`, `DIR_SOUTHWEST`, `DIR_SOMEWHERE`

#### `wear_locations`
- `WEAR_NONE`, `WEAR_LIGHT`, `WEAR_FINGER_L`, `WEAR_FINGER_R`
- `WEAR_NECK_1`, `WEAR_NECK_2`, `WEAR_BODY`, `WEAR_HEAD`, `WEAR_LEGS`
- `WEAR_FEET`, `WEAR_HANDS`, `WEAR_ARMS`, `WEAR_SHIELD`, `WEAR_ABOUT`
- `WEAR_WAIST`, `WEAR_WRIST_L`, `WEAR_WRIST_R`, `WEAR_WIELD`, `WEAR_HOLD`
- `WEAR_DUAL_WIELD`, `WEAR_EARS`, `WEAR_EYES`, `WEAR_MISSILE_WIELD`, `WEAR_BACK`
- `WEAR_FACE`, `WEAR_ANKLE_L`, `WEAR_ANKLE_R`, `MAX_WEAR`

#### `item_types`
- `ITEM_NONE`, `ITEM_LIGHT`, `ITEM_SCROLL`, `ITEM_WAND`, `ITEM_STAFF`, `ITEM_WEAPON`
- `ITEM_FIREWEAPON`, `ITEM_MISSILE`, `ITEM_TREASURE`, `ITEM_ARMOR`, `ITEM_POTION`
- `ITEM_WORN`, `ITEM_FURNITURE`, `ITEM_TRASH`, `ITEM_OLDTRAP`, `ITEM_CONTAINER`
- `ITEM_NOTE`, `ITEM_DRINK_CON`, `ITEM_KEY`, `ITEM_FOOD`, `ITEM_GOLD`/`ITEM_MONEY`
- `ITEM_PEN`, `ITEM_BOAT`, `ITEM_CORPSE_NPC`, `ITEM_CORPSE_PC`
- `ITEM_FOUNTAIN`, `ITEM_PILL`, `ITEM_BLOOD`, `ITEM_BLOODSTAIN`, `ITEM_SCRAPS`
- `ITEM_PIPE`, `ITEM_HERB_CON`, `ITEM_HERB`, `ITEM_INCENSE`, `ITEM_FIRE`
- `ITEM_BOOK`, `ITEM_SWITCH`, `ITEM_LEVER`, `ITEM_PULLCHAIN`, `ITEM_BUTTON`
- `ITEM_DIAL`, `ITEM_RUNE`, `ITEM_RUNEPOUCH`, `ITEM_MATCH`, `ITEM_TRAP`, `ITEM_MAP`
- `ITEM_PORTAL`, `ITEM_PAPER`, `ITEM_TINDER`, `ITEM_LOCKPICK`, `ITEM_SPIKE`
- `ITEM_DISEASE`, `ITEM_OIL`, `ITEM_FUEL`, `ITEM_PUDDLE`, `ITEM_ABACUS`
- `ITEM_MISSILE_WEAPON`, `ITEM_PROJECTILE`, `ITEM_QUIVER`, `ITEM_SHOVEL`, `ITEM_SALVE`
- `ITEM_COOK`, `ITEM_KEYRING`, `ITEM_ODOR`, `ITEM_CHANCE`
- `ITEM_SILVER`, `ITEM_COPPER`, `ITEM_ONMAP`, `ITEM_PIECE`, `ITEM_HOUSEKEY`, `ITEM_JOURNAL`, `ITEM_DRINK_MIX`

#### `clan_types`
- `CLAN_PLAIN`, `CLAN_VAMPIRE`, `CLAN_WARRIOR`, `CLAN_DRUID`, `CLAN_MAGE`
- `CLAN_CELTIC`, `CLAN_DEMON`, `CLAN_ANGEL`, `CLAN_ARCHER`, `CLAN_THIEF`
- `CLAN_CLERIC`, `CLAN_PIRATE`, `CLAN_ASSASSIN`, `CLAN_UNDEAD`
- `CLAN_CHAOTIC`, `CLAN_NEUTRAL`, `CLAN_LAWFUL`, `CLAN_NOKILL`, `CLAN_ORDER`, `CLAN_GUILD`

#### `group_types`
- `GROUP_CLAN`, `GROUP_COUNCIL`, `GROUP_GUILD`

#### `race_types`
- `RACE_HUMAN`, `RACE_ELF`, `RACE_DWARF`, `RACE_HALFLING`, `RACE_PIXIE`
- `RACE_HALF_OGRE`, `RACE_HALF_ORC`, `RACE_HALF_TROLL`, `RACE_HALF_ELF`
- `RACE_GITH`, `RACE_DROW`, `RACE_SEA_ELF`, `RACE_VAMPIRE`, `RACE_DEMON`
- `RACE_LIZARDMAN`, `RACE_GNOME`, `RACE_ANGEL`

#### `class_types`
- `CLASS_MAGE`, `CLASS_CLERIC`, `CLASS_THIEF`, `CLASS_WARRIOR`, `CLASS_VAMPIRE`
- `CLASS_DRUID`, `CLASS_RANGER`, `CLASS_AUGURER`, `CLASS_PALADIN`, `CLASS_NEPHANDI`
- `CLASS_SAVAGE`, `CLASS_FATHOMER`, `CLASS_ARCHER`, `CLASS_DEMON`, `CLASS_ASSASSIN`
- `CLASS_ANGEL`, `CLASS_WEREWOLF`, `CLASS_LICANTHROPE`, `CLASS_LICH`, `CLASS_MONGER`
- `CLASS_PIRATE`

#### `climates` (weather.h)
- `CLIMATE_RAINFOREST`, `CLIMATE_SAVANNA`, `CLIMATE_DESERT`, `CLIMATE_STEPPE`
- `CLIMATE_CHAPPARAL`, `CLIMATE_GRASSLANDS`, `CLIMATE_DECIDUOUS`, `CLIMATE_TAIGA`
- `CLIMATE_TUNDRA`, `CLIMATE_ALPINE`, `CLIMATE_ARCTIC`

#### `sun_positions`
- `SUN_DARK`, `SUN_RISE`, `SUN_LIGHT`, `SUN_SET`

#### `sky_conditions`
- `SKY_CLOUDLESS`, `SKY_CLOUDY`, `SKY_RAINING`, `SKY_LIGHTNING`

#### `save_types`
- `SS_NONE`, `SS_POISON_DEATH`, `SS_ROD_WANDS`, `SS_PARA_PETRI`
- `SS_BREATH`, `SS_SPELL_STAFF`

#### `damage_types` (new)
- `DAM_HIT`, `DAM_SLASH`, `DAM_STAB`, `DAM_HACK`, `DAM_CRUSH`, `DAM_LASH`
- `DAM_PIERCE`, `DAM_THRUST`, `DAM_MAX_TYPE`

#### `damage_types` (old)
- `DAM_HIT`, `DAM_SLICE`, `DAM_STAB`, `DAM_SLASH`, `DAM_WHIP`, `DAM_CLAW`
- `DAM_BLAST`, `DAM_POUND`, `DAM_CRUSH`, `DAM_GREP`, `DAM_BITE`, `DAM_PIERCE`
- `DAM_SUCTION`, `DAM_BOLT`, `DAM_ARROW`, `DAM_DART`, `DAM_STONE`, `DAM_PEA`

#### `weapon_types` (new)
- `WEP_BAREHAND`, `WEP_SWORD`, `WEP_DAGGER`, `WEP_WHIP`, `WEP_TALON`, `WEP_MACE`
- `WEP_ARCHERY`, `WEP_BLOWGUN`, `WEP_SLING`, `WEP_AXE`, `WEP_SPEAR`, `WEP_STAFF`, `WEP_MAX`

#### `projectile_types`
- `PROJ_BOLT`, `PROJ_ARROW`, `PROJ_DART`, `PROJ_STONE`, `PROJ_MAX`

#### `trap_types`
- `TRAP_TYPE_POISON_GAS`, `TRAP_TYPE_POISON_DART`, `TRAP_TYPE_POISON_NEEDLE`
- `TRAP_TYPE_POISON_DAGGER`, `TRAP_TYPE_POISON_ARROW`, `TRAP_TYPE_BLINDNESS_GAS`
- `TRAP_TYPE_SLEEPING_GAS`, `TRAP_TYPE_FLAME`, `TRAP_TYPE_EXPLOSION`
- `TRAP_TYPE_ACID_SPRAY`, `TRAP_TYPE_ELECTRIC_SHOCK`, `TRAP_TYPE_BLADE`
- `TRAP_TYPE_SEX_CHANGE`

---

## Constants

### Bit Flags (32-bit)
- `BV00` through `BV31` - bit positions
- `ALL_BITS` - all bits set

### Position Constants
- `LEVEL_HERO` through `LEVEL_AVATAR` - immortal levels
- `SECONDS_PER_TICK` - 70
- `PULSE_PER_SECOND` - 4
- `PULSE_VIOLENCE` - 12
- `PULSE_MOBILE` - 16
- `PULSE_TICK` - 280
- `PULSE_AREA` - 240
- `PULSE_AUCTION` - 36
- `PULSE_CASINO` - 32

### Max Values
- `MAX_SKILL` - 600
- `MAX_CLASS` - 27
- `MAX_RACE` - 26
- `MAX_LEVEL` - 65
- `MAX_CLAN` - 50
- `MAX_DEITY` - 50
- `MAX_STANCE` - 200
- `MAX_TRADE` - 5
- `MAX_FIX` - 3
- `MAX_IFS` - 20
- `MAX_PROG_NEST` - 20

### Object Value Indices
- `CONT_CLOSEABLE`, `CONT_PICKPROOF`, `CONT_CLOSED`, `CONT_LOCKED`, `CONT_EATKEY` - container flags

### Sector Bit Flags
- `BVSECT_INSIDE`, `BVSECT_CITY`, `BVSECT_FIELD`, `BVSECT_FOREST`, etc.

### Room Flags
- `ROOM_DARK`, `ROOM_DEATH`, `ROOM_NO_MOB`, `ROOM_INDOORS`, `ROOM_HOUSE`, etc.

### Exit Flags
- `EX_ISDOOR`, `EX_CLOSED`, `EX_LOCKED`, `EX_SECRET`, etc.

### Item Wear Flags
- `ITEM_TAKE`, `ITEM_WEAR_FINGER`, `ITEM_WEAR_NECK`, etc.

### Apply Types
- `APPLY_NONE`, `APPLY_STR`, `APPLY_DEX`, etc.

### Item Extra Flags
- `ITEM_GLOW`, `ITEM_HUM`, `ITEM_DARK`, etc.

### Affected By Flags
- `AFF_BLIND`, `AFF_INVISIBLE`, `AFF_DETECT_EVIL`, etc.

---

## Summary

This MUD uses a comprehensive object-oriented design with linked-list structures for all major game entities. The data model includes:

1. **Core structures** for characters, mobs, objects, rooms
2. **Combat system** with affects, spells, attacks, defenses
3. **Economy** with shops, repair shops, currency
4. **Social systems** with clans, councils, deities
5. **World system** with areas, exits, resets
6. **Time & weather** with climate modeling
7. **MUD programming** with MUD progs
8. **Character customization** with morphing, stances
9. **Language system** with translation tables
10. **Security** with bans and nuisance flags

All datastructures use doubly-linked lists for efficient management, with bitvectors for flag systems and pointers for relational data.
