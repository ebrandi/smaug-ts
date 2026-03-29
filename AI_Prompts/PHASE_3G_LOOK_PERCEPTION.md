# SMAUG 2.0 TypeScript Port — Phase 3G: Look, Perception, and Room Rendering

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phases 1 and 2 have scaffolded the full project structure, installed all dependencies, created stub files with JSDoc headers, configured the build toolchain (TypeScript strict mode, Vitest, ESLint, Prisma), and wired up the core engine skeleton (GameLoop, TickEngine, EventBus, ConnectionManager, Telnet/WebSocket listeners, entity base classes, CommandRegistry with dispatch pipeline, admin module stubs, Prisma schema, and example world JSON). All stub files exist but contain only interfaces, type definitions, and empty method bodies. Phase 3 fills in every method body with working game logic.
>
> **Your role:** You are an expert TypeScript/Node.js engineer with deep knowledge of MUD engine architecture. You have access to five reference documents that describe the legacy C codebase in exhaustive detail:
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `COMMANDS.md` — Full command table with trust levels, positions, and flags
> - `STRUCTURE.md` — File inventory and subsystem grouping

## Cardinal Rules (apply to ALL code you produce)

1. **Preserve legacy gameplay exactly.** Every formula, threshold, constant, and order-of-operations must match the C original. When the architecture doc says "replicates legacy X", implement it verbatim.
2. **Use the scaffolded file paths.** Do not create new files or rename existing ones. Every file referenced below already exists as a stub.
3. **Follow the TypeScript patterns established in ARCHITECTURE.md.** Use the exact class names, method signatures, enum values, and interface shapes defined there.
4. **Emit EventBus events** at every documented hook point (combat start/end, room enter/leave, death, level gain, etc.) so that downstream systems (MUDprogs, logging, admin dashboard) can subscribe.
5. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
6. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
7. **Handle edge cases defensively.** Check for null rooms, dead characters, extracted objects before every operation. The legacy code is littered with `char_died()` and `obj_extracted()` guards — replicate them.
8. **No external runtime dependencies** beyond what's already in `package.json` (Prisma, Socket.IO, Express, jsonwebtoken, bcrypt, zlib).
9. **Maintain the pulse-based timing model.** 4 pulses/second, `PULSE_VIOLENCE` = 12, `PULSE_MOBILE` = 16, `PULSE_AUCTION` = 36, `PULSE_AREA` = 240, `PULSE_TICK` = 280. All durations and cooldowns are expressed in pulses.
10. **Log with the structured Logger** (`src/utils/Logger.ts`) using domain tags. Never use bare `console.log`.

## Folder Structure Reference

```
smaug-ts/
├── src/
│   ├── core/               # GameLoop, TickEngine, EventBus
│   ├── network/            # WebSocketServer, ConnectionManager, SocketIOAdapter, TelnetProtocol
│   ├── game/
│   │   ├── commands/       # CommandRegistry, movement, combat, communication, information, objects, magic, social, immortal, olc
│   │   ├── combat/         # CombatEngine, DamageCalculator, DeathHandler
│   │   ├── world/          # AreaManager, RoomManager, ResetEngine, VnumRegistry
│   │   ├── entities/       # Character, Player, Mobile, GameObject, Room, Area, Affect
│   │   ├── economy/        # Currency, ShopSystem, AuctionSystem, BankSystem
│   │   ├── spells/         # SpellEngine, SpellRegistry, SavingThrows, ComponentSystem
│   │   ├── affects/        # AffectManager, AffectRegistry, StatModifier
│   │   └── social/         # ClanSystem, CouncilSystem, DeitySystem, BoardSystem, HousingSystem
│   ├── persistence/        # PlayerRepository, WorldRepository
│   ├── admin/              # AdminRouter, AuthController, MonitoringController
│   ├── scripting/          # MudProgEngine, IfcheckRegistry, ScriptParser, VariableSubstitution
│   ├── utils/              # AnsiColors, Dice, StringUtils, BitVector, Logger
│   └── migration/          # AreFileParser, PlayerFileParser, MigrationRunner
├── prisma/schema.prisma
├── world/                  # JSON world data files (one subdirectory per area)
├── tests/                  # Unit, integration, e2e tests
└── public/                 # Browser client and admin dashboard static files
```

## Prior Sub-Phases Completed

**Sub-Phases 3A–3F** are complete. The following files are fully implemented and may be imported:

### Sub-Phase 3A (Utilities, World Loader, Command Parser)
- `src/utils/AnsiColors.ts` — `colorize()`, `colorStrlen()`, `stripColor()`, `padRight()`, `padCenter()`, `wordWrap()`
- `src/utils/Dice.ts` — `rollDice()`, `numberRange()`, `numberPercent()`, `numberFuzzy()`, `parseDiceString()`
- `src/utils/BitVector.ts` — `hasFlag()`, `setFlag()`, `removeFlag()`, `flagsToArray()`, `parseFlagString()`
- `src/utils/StringUtils.ts` — `isName()`, `isNamePrefix()`, `oneArgument()`, `strPrefix()`, `numberArgument()`
- `src/game/world/AreaManager.ts` — `loadAllAreas()`, `resolveExits()`
- `src/game/world/VnumRegistry.ts` — `getRoom()`, `getMobPrototype()`, `getObjPrototype()`
- `src/game/world/ResetEngine.ts` — `resetArea()`, `shouldReset()`
- `src/game/commands/CommandRegistry.ts` — `interpret()`, `registerCommand()`, `findCommand()`
- `src/game/commands/social.ts` — `loadSocials()`, `executeSocial()`
- `src/network/ConnectionManager.ts` — Full nanny state machine, output pager
- `src/main.ts` — Boot sequence

### Sub-Phase 3B (Movement, Look, Combat)
- `src/game/commands/movement.ts` — `moveChar()`, direction commands, door commands, `doRecall()`, `doFlee()`
- `src/game/commands/information.ts` — `doLook()`, `doExamine()`, `doScore()`, `doWho()`, `doHelp()`, `doAffects()`, `doEquipment()`, `doInventory()`, `doConsider()`
- `src/game/combat/CombatEngine.ts` — `violenceUpdate()`, `multiHit()`, `oneHit()`, `inflictDamage()`, `startCombat()`, `stopFighting()`
- `src/game/combat/DamageCalculator.ts` — `getDamageMessage()`, `calcThac0()`, `calcDamageBonus()`, `checkImmune()`
- `src/game/combat/DeathHandler.ts` — `handleDeath()`, `makeCorpse()`, XP award calculation
- `src/game/commands/combat.ts` — All combat skill commands (kill, bash, kick, backstab, etc.)
- `src/game/entities/Character.ts` — `hitGain()`, `manaGain()`, `moveGain()`, `updatePosition()`, `charUpdate()`

### Sub-Phase 3C (Magic, Skills, Affects)
- `src/game/spells/SpellEngine.ts` — Full 13-step `doCast()` pipeline, `castSpell()`
- `src/game/spells/SpellRegistry.ts` — All spell definitions and lookup
- `src/game/spells/SavingThrows.ts` — `savingThrow()`, class/level tables
- `src/game/spells/ComponentSystem.ts` — Component checks and consumption
- `src/game/commands/magic.ts` — `doCast()`, `doQuaff()`, `doRecite()`, `doBrandish()`, `doZap()`
- `src/game/affects/AffectManager.ts` — `applyAffect()`, `removeAffect()`, `findAffect()`
- `src/game/affects/AffectRegistry.ts` — All affect definitions
- `src/game/affects/StatModifier.ts` — Stat modification pipeline

### Sub-Phase 3D (Inventory, Economy, Progression)
- `src/game/commands/objects.ts` — `doGet()`, `doDrop()`, `doWear()`, `doRemove()`, `doGive()`, `doPut()`, `doEat()`, `doDrink()`, `doFill()`, `doSacrifice()`
- `src/game/economy/Currency.ts` — `CurrencyHelper`, gold/silver/copper conversion
- `src/game/economy/ShopSystem.ts` — `doBuy()`, `doSell()`, `doList()`, `doValue()`, `doRepair()`
- `src/game/economy/AuctionSystem.ts` — `doAuction()`, `auctionUpdate()`
- `src/game/economy/BankSystem.ts` — `doDeposit()`, `doWithdraw()`, `doBalance()`
- `src/game/entities/Player.ts` — `gainXp()`, `advanceLevel()`, `xpToNextLevel()`
- `src/game/entities/tables.ts` — Race and class tables

### Sub-Phase 3E (Communication, Social, Persistence, MUDprogs)
- `src/game/commands/communication.ts` — All channels, language system, tell/reply, ignore
- `src/game/social/ClanSystem.ts`, `src/game/social/BoardSystem.ts`, `src/game/social/DeitySystem.ts`, `src/game/social/HousingSystem.ts`
- `src/persistence/PlayerRepository.ts` — Full player save/load via Prisma
- `src/persistence/WorldRepository.ts` — Area save, world state persistence
- `src/scripting/MudProgEngine.ts` — Full MUDprog execution engine
- `src/scripting/IfcheckRegistry.ts` — 50+ ifcheck functions
- `src/scripting/ScriptParser.ts` — Trigger dispatcher
- `src/scripting/VariableSubstitution.ts` — `$n/$N/$i/$I/$t/$T` etc. expansion

### Sub-Phase 3F (Admin, OLC, Dashboard, Browser UI)
- `src/game/commands/immortal.ts` — All immortal commands (goto, transfer, set, stat, ban, authorize, etc.)
- `src/game/commands/olc.ts` — Full OLC system (redit, medit, oedit, mpedit, aedit)
- `src/admin/AdminRouter.ts` — REST API with JWT auth
- `src/admin/AuthController.ts` — JWT login/verification
- `src/admin/MonitoringController.ts` — Server stats collection
- `src/admin/DashboardUI.ts` — React admin dashboard
- `public/index.html` + `public/js/client.ts` — Browser play client
- `src/game/world/WeatherSystem.ts` — Weather and time system
- `src/game/world/QuestSystem.ts` — Auto-quest system

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3G Objective

Implement the complete look/perception subsystem as a standalone, deeply detailed module. This sub-phase extracts and fully specifies every visibility check, room rendering pipeline, character/object display, and perception-related command that was initially outlined in Sub-Phase 3B's `information.ts`. After this sub-phase, all visual output — room descriptions, character inspection, object examination, darkness handling, and directional scanning — is pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/perception/VisibilityManager.ts` — Core Visibility Engine

Implement all visibility and perception checks. Replicates the legacy `can_see()`, `can_see_obj()`, `room_is_dark()`, and related functions from `handler.c` and `act_info.c`:

- **`canSeeChar(looker, target)`** — Determine whether `looker` can perceive `target`. Replicates legacy `can_see()` (`handler.c`). Evaluate in this exact order:
  1. If `looker === target`, always `true`.
  2. If `looker` is NPC with no `inRoom`, `false`.
  3. If `target` has `AFF_WIZINVIS` and `target.pcData.wizInvisLevel > looker.trust`, `false`.
  4. If `target` has `PLR_WIZINVIS` and `looker.trust < target.pcData.wizInvisLevel`, `false` (immortal invisibility to lower-trust characters).
  5. If `looker` has `AFF_TRUESIGHT`, `true` (sees through all concealment).
  6. If `looker` has `AFF_BLIND` and does NOT have `AFF_TRUESIGHT`, `false`.
  7. If `roomIsDark(looker.inRoom)` and `looker` does NOT have `AFF_INFRARED` and `looker` is NOT immortal, `false`.
  8. If `target` has `AFF_INVISIBLE` and `looker` does NOT have `AFF_DETECT_INVIS`, `false`.
  9. If `target` has `AFF_HIDE` and `looker` does NOT have `AFF_DETECT_HIDDEN` and `looker` is NOT fighting `target`, `false`.
  10. Otherwise, `true`.

- **`canSeeObj(looker, obj)`** — Determine whether `looker` can perceive `obj`. Replicates legacy `can_see_obj()` (`handler.c`). Evaluate in order:
  1. If `obj` has `ITEM_BURIED` flag, only visible if `looker` has `AFF_DETECT_BURIED` or `looker` is immortal.
  2. If `looker` has `AFF_TRUESIGHT`, `true`.
  3. If `looker` has `AFF_BLIND`, `false`.
  4. If `obj` is a `ITEM_LIGHT` with `values[2] !== 0` (lit), `true` (lit lights always visible).
  5. If `obj` has `ITEM_INVIS` and `looker` lacks `AFF_DETECT_INVIS`, `false`.
  6. If `obj` has `ITEM_HIDDEN` and `looker` lacks `AFF_DETECT_HIDDEN`, `false`.
  7. If `roomIsDark(looker.inRoom)` and `looker` lacks `AFF_INFRARED` and `looker` is NOT immortal, `false`.
  8. Otherwise, `true`.

- **`roomIsDark(room)`** — Determine if a room is dark. Replicates legacy `room_is_dark()` (`handler.c`):
  1. If `room.light > 0` (at least one light source present), `false`.
  2. If `room` has `ROOM_DARK` flag, `true`.
  3. If `room.sectorType` is `SectorType.Inside`, check sunlight — dark only at night.
  4. For outdoor rooms, check global `sunlight` state: if `SUN_SET` or `SUN_DARK`, the room is dark.
  5. Otherwise, `false`.

- **`roomIsLit(room)`** — Inverse convenience wrapper: `!roomIsDark(room)`.

- **`canSeeRoom(ch, room)`** — Whether `ch` can perceive the room's contents. Returns `false` if `ch` has `AFF_BLIND` (without truesight). Returns `false` if `roomIsDark(room)` and `ch` lacks `AFF_INFRARED` and is not immortal. Otherwise `true`.

- **`checkBlind(ch)`** — Utility guard. If `ch` has `AFF_BLIND` and NOT `AFF_TRUESIGHT`, send "You can't see a thing!\n" and return `false`. Otherwise return `true`. Used at the top of look/examine/glance commands.

- **`getConditionString(ch, victim)`** — Return a health description string based on `victim.hit / victim.maxHit` percentage. Replicates legacy `condition_string()` from `act_info.c`:
  - 100%: "is in excellent condition."
  - 90–99%: "has a few scratches."
  - 75–89%: "has some small wounds and bruises."
  - 50–74%: "has quite a few wounds."
  - 30–49%: "has some big nasty wounds and scratches."
  - 15–29%: "looks pretty hurt."
  - 1–14%: "is in awful condition."
  - 0%: "is bleeding to death."

### 2. `src/game/perception/RoomRenderer.ts` — Room Description Rendering

Implement the full room display pipeline. Replicates the "no argument" branch of legacy `do_look()` (`act_info.c:1255–1520`):

- **`renderRoom(ch, isAutoLook)`** — Master room rendering function. Called by `doLook(ch, "")` and by auto-look after movement. Produces the complete room display:
  1. **Blindness check:** If `checkBlind(ch)` fails, return immediately.
  2. **Room name line:** Display room name. Format: `"&C{room.name}&w"`. If `ch` is immortal, prepend vnum: `"&w[{room.vnum}] &C{room.name}&w"`. If room has `ROOM_DARK` flag and room is dark, show `"&z{room.name} (dark)&w"` with dark-grey color.
  3. **Room description:** If `ch` does NOT have `PLR_BRIEF` flag, OR if `isAutoLook` is `false` (explicit "look" command), display `room.description` with word-wrapping at 78 columns.
  4. **Dark room handling:** If `roomIsDark(ch.inRoom)` and `ch` lacks `AFF_INFRARED` and is not immortal:
     - Show only: `"It is pitch dark...\n"`.
     - Do NOT display description, exits, items, or characters.
     - If `ch` has `AFF_INFRARED`, show room name in dark-red and limited content (characters with warm bodies only — NPCs and players, no objects).
  5. **Exits line:** Call `renderExits(ch, ch.inRoom)` to produce the exit string.
  6. **Room contents (objects):** Call `renderRoomObjects(ch, ch.inRoom)` to display visible items on the ground.
  7. **Room contents (characters):** Call `renderRoomCharacters(ch, ch.inRoom)` to display visible NPCs and players.

- **`renderExits(ch, room)`** — Build the exit display string. Two modes:
  - **Standard mode** (`PLR_AUTOEXIT` flag or explicit "exits" command): `"[Exits: N S E W]"`. Show each available exit direction as a letter. If a door is closed, show as `"(N)"` (parenthesized). If a door is secret (`EX_SECRET`) and not detected, omit entirely unless `ch` has `AFF_DETECT_HIDDEN` or is immortal. If the destination room is a death trap, show as `"#N"` for immortals. If no exits, show `"[Exits: None]"` .
  - **Compass mode** (`PLR_COMPASS` flag): Show exits as a compass rose:
    ```
           N
      NW - + - NE
     W  - + -  E
      SW - + - SE
           S
    ```
    Color available exits green, unavailable grey, closed doors yellow. This is an enhancement from later SMAUG versions. If `ch` has `PLR_COMPASS`, use compass mode; otherwise use standard.

- **`renderRoomObjects(ch, room)`** — Display objects on the ground. Replicates legacy `show_list_to_char()` (`act_info.c`):
  1. Iterate `room.contents` (objects on the floor).
  2. For each object, check `canSeeObj(ch, obj)`. Skip invisible/hidden objects the character can't see.
  3. **Grouping:** Group identical objects (same `prototype.vnum` and same `shortDescription`) and show a count: `"(3) a small wooden shield is here."`. Replicates legacy grouping with `nshow` counter.
  4. Display the object's `longDescription` (the ground-visible description) — NOT the `shortDescription` (which is the inventory name).
  5. **Special prefixes:** If object is `ITEM_INVIS`, prepend `"(Invis) "`. If `ITEM_HIDDEN`, prepend `"(Hidden) "`. If `ITEM_GLOW`, prepend `"(Glowing) "`. If `ITEM_HUM`, prepend `"(Humming) "`. If `ITEM_BURIED`, prepend `"(Buried) "`. If `ITEM_DONATION`, prepend `"(Donated) "`. Replicates legacy `extra_flags` display.
  6. **Light sources:** If object is `ITEM_LIGHT` with `values[2] > 0`, note `"(Lit)"` prefix.

- **`renderRoomCharacters(ch, room)`** — Display characters in the room. Replicates legacy `show_char_to_char()` (`act_info.c`):
  1. Iterate `room.characters`.
  2. Skip `ch` itself.
  3. For each character, check `canSeeChar(ch, target)`. Skip invisible characters.
  4. Call `renderCharacterShort(ch, target)` to produce the display line.

- **`renderCharacterShort(looker, target)`** — Single-line character summary for room listing. Replicates legacy `show_char_to_char_0()` (`act_info.c:574-720`):
  1. **Prefix flags:** Build a prefix string from target's state:
     - `"(Invis) "` if `target` has `AFF_INVISIBLE`.
     - `"(Hidden) "` if `target` has `AFF_HIDE`.
     - `"(Charmed) "` if `target` has `AFF_CHARM`.
     - `"(Translucent) "` if `target` has `AFF_PASS_DOOR`.
     - `"(Flaming) "` if `target` has `AFF_FIRESHIELD`.
     - `"(Shocked) "` if `target` has `AFF_SHOCKSHIELD`.
     - `"(Icy) "` if `target` has `AFF_ICESHIELD`.
     - `"(Red Aura) "` if `target` is evil and `looker` has `AFF_DETECT_EVIL`.
     - `"(Blue Aura) "` if `target` is good and `looker` has `AFF_DETECT_EVIL`.
     - `"(Sanctified) "` if `target` has `AFF_SANCTUARY`.
     - `"(White Aura) "` if `target` has `AFF_SANCTUARY` and `AFF_DETECT_MAGIC` on `looker`.
     - `"(WRITING) "` if PC is in editor mode (`connected === CON_EDITING`).
     - `"(AFK) "` if `target` has `PLR_AFK` flag.
  2. **Position text:** Append position-specific text based on `target.position`:
     - `Dead`: `"{name} is DEAD!!"` (should normally never display)
     - `Mortal`: `"{name} is mortally wounded."`
     - `Incapacitated`: `"{name} is incapacitated."`
     - `Stunned`: `"{name} is lying here stunned."`
     - `Sleeping`: `"{name} is sleeping here."`
     - `Resting`: `"{name} is resting here."`
     - `Sitting`: `"{name} is sitting here."`
     - `Standing` (NPC, not fighting): use `target.longDescription` (the area-file long desc).
     - `Standing` (PC, not fighting): `"{name} {title} is here."`
     - `Fighting`: `"{name} is here, fighting {opponent.name}."` If fighting `looker`: `"{name} is here, fighting YOU!"`
     - `Mounted`: `"{name} is here, mounted on {mount.shortDescription}."`
     - `Defensive/Aggressive/Evasive/Berserk`: `"{name} is here, fighting {style} against {opponent.name}."`
  3. For NPCs in standing position with no special state, use `target.longDescription` directly (the one from the area file).
  4. **Name resolution:** For NPCs, use `target.shortDescription`. For PCs, use `target.name + " " + target.pcData.title`.

### 3. `src/game/perception/CharacterInspection.ts` — Look at Character / Examine Character

Implement the "look at character" branch. Replicates legacy `show_char_to_char_1()` (`act_info.c:720-900`):

- **`inspectCharacter(looker, target)`** — Full character inspection (triggered by `look <character>`):
  1. **Blindness check:** If `checkBlind(looker)` fails, return.
  2. **Description display:** If `target` has a `description` field (long look-at description), display it. Otherwise display: `"You see nothing special about {name}.\n"`.
  3. **Health condition:** Call `getConditionString(looker, target)` and display: `"{name} {condition}\n"`.
  4. **Equipment display:** Show all visible equipped items. Iterate all wear locations in order. For each slot with an item:
     - Display: `"<worn {location}>     {item.shortDescription}\n"`.
     - Use wear location strings from the legacy table:
       ```
       <used as light>      
       <worn on finger>     (left/right)
       <worn around neck>   (slot 1/slot 2)
       <worn on body>       
       <worn on head>       
       <worn on legs>       
       <worn on feet>       
       <worn on hands>      
       <worn on arms>       
       <shield>             
       <worn about body>    
       <worn about waist>   
       <worn around wrist>  (left/right)
       <wielded>            
       <held>               
       <dual wielded>       
       <worn on ears>       
       <worn on eyes>       
       <missile wielded>    
       <worn on back>       
       <worn over face>     
       <worn around ankle>  (left/right)
       ```
     - If `looker` cannot see the item (`canSeeObj` fails), display `"<worn {location}>     something\n"`.
  5. **Inventory peek:** If `looker` has the `peek` skill (and passes proficiency check), show a partial inventory of `target`. Display: `"You peek at the inventory:\n"` followed by the first 5 visible items in `target.carrying`. Call `learn_from_success()` for the peek skill.
  6. **MUDprog trigger:** Fire `EXAMINE_PROG` on `target` if it's an NPC.

- **`doGlance(looker, arg)`** — Quick health check. Replicates legacy `do_glance()`. Find target in room by name. Display only the health condition string. Does NOT show description or equipment. Position requirement: `POS_STANDING`.

### 4. `src/game/perception/ObjectInspection.ts` — Look at Object / Examine Object

Implement the "look at object" and "examine" branches:

- **`inspectObject(looker, obj)`** — Look at an object. Replicates the object branch of legacy `do_look()` (`act_info.c`):
  1. **Extra descriptions:** Check `obj.extraDescriptions` for a matching keyword. If found, display the extra description text. Extra descriptions take priority over the default.
  2. **Default description:** If no extra description matched, display `obj.description` (the long description). If that's also empty: `"You see nothing special.\n"`.
  3. **Container contents:** If `obj.itemType === ITEM_CONTAINER` or `obj.itemType === ITEM_CORPSE_NPC` or `obj.itemType === ITEM_CORPSE_PC` or `obj.itemType === ITEM_KEYRING` or `obj.itemType === ITEM_QUIVER`:
     - If the container is closed (`CONT_CLOSED` flag), display: `"It is closed.\n"`.
     - Otherwise, display: `"{shortDescription} holds:\n"` followed by a list of visible contents.
  4. **MUDprog trigger:** Fire `EXAMINE_PROG` on the object.

- **`examineObject(looker, obj)`** — Extended examination. Replicates legacy `do_examine()`. Calls `inspectObject()` first, then adds:
  1. **Condition display:** Show `obj.condition` as a percentage with descriptor:
     - 100%: `"is in perfect condition."`
     - 75–99%: `"is in good condition."`
     - 50–74%: `"is in fair condition."`
     - 25–49%: `"is in poor condition."`
     - 1–24%: `"is in terrible condition."`
     - 0%: `"is about to break!"`
  2. **Type-specific details:**
     - **Weapon:** `"Damage is {dice}d{size} (average {avg}).\nWeapon type: {weaponType}.\nDamage type: {damType}."`. Show weapon condition affecting damage.
     - **Armour:** `"Armor class is {ac} pierce, {ac} bash, {ac} slash, {ac} magic."`
     - **Container:** Show capacity (`"Capacity: {weight}/{maxWeight} lbs."`) and lock state.
     - **Food:** Show fullness value and whether it's poisoned (if `looker` has `AFF_DETECT_POISON` or is immortal).
     - **Drink container:** Show liquid type, amount remaining, and poison status.
     - **Pill/Potion/Scroll/Wand/Staff:** If `looker` has `AFF_DETECT_MAGIC` or `identify` skill, show spell names and charges.
     - **Light:** Show remaining burn time: `"Light remaining: {hours} hours."` or `"Infinite light."` if `values[2] === -1`.
  3. **Trap detection:** If `looker` has `AFF_DETECT_TRAPS`, check for traps on the object. If trapped: `"You notice a trap on {shortDescription}!\nTrap type: {type}, damage: {damage}."`. Replicates legacy `do_examine()` trap detection.
  4. **MUDprog trigger:** Fire `EXAMINE_PROG` on the object.

### 5. `src/game/perception/ExtraDescriptions.ts` — Extra Description Matching

Implement extra description lookup for rooms and objects. Replicates legacy `get_extra_descr()` (`handler.c`):

- **`matchExtraDescription(keyword, room, objectsInRoom)`** — Search for a keyword match against extra descriptions:
  1. Check `room.extraDescriptions` — iterate and match with `isName(keyword, ed.keywords)`. If found, return the description text.
  2. Check objects in the room — for each visible object in `room.contents`, check `obj.extraDescriptions`. Return first match.
  3. Check objects in character's inventory and equipment — for each carried/worn item, check extra descriptions.
  4. Return `null` if no match.

- **`lookAtDirection(ch, direction)`** — Handle `look <direction>`. Replicates the directional branch of `do_look()`:
  1. Get exit in the specified direction from `ch.inRoom`.
  2. If exit has a description, display it.
  3. If exit has a door:
     - `"The {doorName} is open."` or `"The {doorName} is closed."` or `"The {doorName} is closed and locked."`
  4. If no exit: `"Nothing special in that direction.\n"`.

- **`lookUnder(ch, arg)`** — Handle `look under <object>`. Find the object. If `obj.itemType === ITEM_FURNITURE` and it has an `under` extra description, show it. Otherwise: `"You see nothing under {shortDescription}.\n"`.

- **`lookInside(ch, arg)`** — Handle `look in <container>`. Find the object. If it's a container, show contents. If it's a drink container, show liquid level and type. Replicates legacy `look in` handling.

### 6. `src/game/commands/information.ts` — Additions to Information Commands

Add the following commands (extending the existing `information.ts` file from Sub-Phase 3B):

- **`doExits(ch)`** — Explicit exit listing command. Calls `renderExits(ch, ch.inRoom)` with full format (include exit descriptions, show door keywords, show destination room names for immortals). Replicates legacy `do_exits()`.

- **`doScan(ch, arg)`** — Scan in a direction to see characters at a distance. Replicates legacy `do_scan()` (`act_info.c`):
  1. If no argument, scan all six directions.
  2. For each direction, check up to 3 rooms away (configurable by area `visibility` setting or `distance` exit property).
  3. For each room in range, list visible characters: `"{direction} ({distance}): {name}"`. Distance descriptors: 1 = "nearby", 2 = "a short distance", 3 = "off in the distance".
  4. Apply visibility checks: `canSeeChar()` and `canSeeRoom()`. Cannot scan through closed doors.
  5. Cannot scan if blind.

- **`doSearch(ch)`** — Search the room for hidden exits and objects. Replicates legacy `do_search()`:
  1. Check for `gsn_search` skill proficiency.
  2. Roll proficiency check. On success:
     - Reveal `EX_SECRET` exits: `"Your search reveals a hidden exit to the {direction}!"`
     - Reveal `ITEM_HIDDEN` objects: `"You discover {shortDescription} hidden here!"`
  3. On failure: `"You find nothing special.\n"`
  4. Applies command lag: `WAIT_STATE(ch, skill.beats)`.

- **`doCompass(ch, arg)`** — Toggle compass mode on/off. Sets/clears `PLR_COMPASS` flag. `"Compass mode {enabled|disabled}.\n"`.

### 7. `src/game/perception/LightManager.ts` — Light Source Tracking

Implement light level management for rooms. Replicates legacy light tracking in `handler.c` and `update.c`:

- **`addLight(room, amount)`** — Increment `room.light` by `amount`. Called when a lit light source enters a room (character carrying a lit lamp enters, or a light is ignited in the room).

- **`removeLight(room, amount)`** — Decrement `room.light` by `amount`. Called when a lit light source leaves a room or is extinguished.

- **`recalculateRoomLight(room)`** — Recalculate the room's light level from scratch. Count all lit `ITEM_LIGHT` objects carried by characters in the room, plus any room-inherent light. Used during area resets and error recovery.

- **`onCharacterEnterRoom(ch, room)`** — Event handler for `GameEvent.CharacterEnterRoom`. Check if `ch` is carrying a lit `ITEM_LIGHT` in the `WEAR_LIGHT` slot. If so, call `addLight(room, 1)`.

- **`onCharacterLeaveRoom(ch, room)`** — Event handler for `GameEvent.CharacterLeaveRoom`. If `ch` has a lit light, call `removeLight(room, 1)`.

- **`lightSourceUpdate()`** — Called every `PULSE_TICK`. Iterate all lit `ITEM_LIGHT` objects. Decrement `values[2]` (burn time). When it reaches 0:
  1. Send message to carrier's room: `"Your {shortDescription} flickers and goes out.\n"`
  2. Call `removeLight(carrierRoom, 1)`.
  3. Set `values[2] = 0` (extinguished).
  4. If object has `ITEM_BURNPROOF` flag, it does NOT consume fuel (infinite light with finite display). Replicates legacy `light_update()` behavior.

- **`doLight(ch, arg)`** / **`doExtinguish(ch, arg)`** — Light or put out a light source. Toggle `values[2]` and update room light accordingly.

- Wire `lightSourceUpdate()` into `TickEngine` via `EventBus.on(GameEvent.FullTick)`.
- Wire `onCharacterEnterRoom` / `onCharacterLeaveRoom` via `EventBus.on(GameEvent.CharacterEnterRoom)` / `EventBus.on(GameEvent.CharacterLeaveRoom)`.

### 8. `src/game/perception/SunlightCycle.ts` — Day/Night Cycle and Sunlight

Implement the sunlight state machine. Replicates legacy `time_update()` (`update.c`) sunlight transitions:

- **`SunPosition` enum:** `{ DARK = 0, RISE = 1, LIGHT = 2, SET = 3 }`

- **`sunlightState`** — Global mutable state holding the current `SunPosition`. Shared with `VisibilityManager.roomIsDark()` and `WeatherSystem`.

- **`updateSunlight(gameHour)`** — Called every in-game hour advancement. Transitions:
  - Hour 5 → `SUN_RISE`: `"The day has begun.\n"` (global message to all outdoor characters)
  - Hour 6 → `SUN_LIGHT`: `"The sun rises in the east.\n"`
  - Hour 19 → `SUN_SET`: `"The sun slowly disappears in the west.\n"`
  - Hour 20 → `SUN_DARK`: `"The night has begun.\n"`
  - These messages are sent to all players in non-indoor rooms.
  - Transition triggers `recalculateRoomLight()` for affected outdoor rooms (light level changes with sun position).

- **`getSunPosition()`** — Return current `SunPosition`. Used by `roomIsDark()` to determine outdoor light.

---

## Tests for Sub-Phase 3G

- `tests/unit/perception/VisibilityManager.test.ts` — Test all `canSeeChar()` branches: invisible vs detect_invis, hidden vs detect_hidden, wizinvis vs trust level, blind vs truesight, dark room vs infrared. Test `canSeeObj()`: buried, invis, hidden, lit light in darkness. Test `roomIsDark()`: ROOM_DARK flag, light sources, sunlight states, indoor rooms.
- `tests/unit/perception/RoomRenderer.test.ts` — Test `renderRoom()`: room name with/without vnum for immortals, brief mode vs full mode, dark room output ("pitch dark"), exit formatting (standard and compass), object grouping with counts, character position text for all positions, prefix flags (invis, sanctuary, AFK). Test `renderExits()`: open exits, closed doors as parenthesized, secret doors hidden, death trap markers for immortals.
- `tests/unit/perception/CharacterInspection.test.ts` — Test `inspectCharacter()`: description display, condition string at every percentage threshold, equipment list with all wear locations, peek skill integration. Test `doGlance()`: shows only condition string.
- `tests/unit/perception/ObjectInspection.test.ts` — Test `inspectObject()`: extra description priority, container contents, closed container message. Test `examineObject()`: weapon damage display, armour AC display, food poison detection, drink container details, trap detection with/without detect_traps, light burn time.
- `tests/unit/perception/ExtraDescriptions.test.ts` — Test `matchExtraDescription()`: room ed match, object ed match, inventory ed match, no match. Test `lookAtDirection()`: exit description, door state. Test `lookUnder()` and `lookInside()` edge cases.
- `tests/unit/perception/LightManager.test.ts` — Test `addLight()`/`removeLight()` correctly update `room.light`. Test `lightSourceUpdate()`: burn time decrement, flicker-out message, BURNPROOF flag. Test character enter/leave room light tracking.
- `tests/unit/perception/SunlightCycle.test.ts` — Test `updateSunlight()`: all four transitions at correct hours, global messages sent to outdoor characters only, `getSunPosition()` returns correct state.
- `tests/unit/commands/scan.test.ts` — Test `doScan()`: 3-room range, characters visible at distance, closed door blocking, blind character rejection, distance descriptors.
- `tests/integration/LookPipeline.test.ts` — Full integration: create a room with objects, characters, and extra descriptions. Verify `doLook(ch, "")` produces correct output including room name, description, exits, grouped objects, and character listings. Verify `doLook(ch, "north")` shows exit description. Verify `doLook(ch, "keyword")` matches extra descriptions.

---

## Acceptance Criteria

- [ ] `look` in a lit room shows room name, description, exits, objects (grouped with count), and characters with correct position text.
- [ ] `look` in a dark room (no light) shows "It is pitch dark..." and nothing else.
- [ ] `look` in a dark room with `AFF_INFRARED` shows room name (dark-red) and characters (no objects).
- [ ] `look goblin` shows the NPC's description, health condition, and visible equipment.
- [ ] `look sword` matches extra descriptions on the object or room, displaying the correct text.
- [ ] `look north` shows the exit description and door state (open/closed/locked).
- [ ] `examine sword` shows object condition, weapon damage dice, and type-specific details.
- [ ] `examine chest` shows container capacity and contents (or "It is closed." if locked).
- [ ] An invisible character is not visible to a player without `AFF_DETECT_INVIS`. With detect_invis, they appear prefixed with `"(Invis)"`.
- [ ] A hidden character is not visible without `AFF_DETECT_HIDDEN`. With detect_hidden, they appear prefixed with `"(Hidden)"`.
- [ ] Wizinvis immortals are invisible to characters with lower trust.
- [ ] A blind character sees "You can't see a thing!" for all look variants.
- [ ] Truesight bypasses all invisibility, darkness, and hidden states.
- [ ] Carrying a lit light source into a dark room makes it visible. Light burning out makes the room dark again.
- [ ] Sunlight transitions at hours 5/6/19/20 send global messages to outdoor characters and update room darkness.
- [ ] `scan north` shows characters up to 3 rooms away with distance descriptors. Closed doors block scanning.
- [ ] `search` with the search skill reveals hidden exits and objects.
- [ ] `glance goblin` shows only the health condition string.
- [ ] Object grouping correctly counts and displays `"(3) a small wooden shield is here."` for 3 identical objects.
- [ ] Compass mode exit display shows the directional compass rose with colored indicators.
- [ ] `exits` command lists all visible exits with door states and secret exit handling.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
