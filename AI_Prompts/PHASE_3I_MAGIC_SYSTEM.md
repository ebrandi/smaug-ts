# SMAUG 2.0 TypeScript Port — Phase 3I: Magic and Spellcasting System

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

**Sub-Phases 3A–3H** are complete. The following files are fully implemented and may be imported:

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

### Sub-Phase 3C (Magic, Skills, Affects) — Stub pass
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

### Sub-Phase 3G (Look, Perception, Room Rendering)
- `src/game/perception/VisibilityManager.ts` — `canSeeChar()`, `canSeeObj()`, `roomIsDark()`, `roomIsLit()`, `canSeeRoom()`, `checkBlind()`, `getConditionString()`
- `src/game/perception/RoomRenderer.ts` — `renderRoom()`, `renderExits()`, `renderRoomObjects()`, `renderRoomCharacters()`, `renderCharacterShort()`
- `src/game/perception/CharacterInspection.ts` — `inspectCharacter()`, `doGlance()`
- `src/game/perception/ObjectInspection.ts` — `inspectObject()`, `examineObject()`
- `src/game/perception/ExtraDescriptions.ts` — `matchExtraDescription()`, `lookAtDirection()`, `lookUnder()`, `lookInside()`
- `src/game/perception/LightManager.ts` — `addLight()`, `removeLight()`, `lightSourceUpdate()`, enter/leave room handlers
- `src/game/perception/SunlightCycle.ts` — `updateSunlight()`, `getSunPosition()`, `SunPosition` enum

### Sub-Phase 3H (Core Combat System)
- `src/game/combat/CombatEngine.ts` — `violenceUpdate()`, `multiHit()`, `oneHit()`, `inflictDamage()`, `damageMessage()`, `startCombat()`, `stopFighting()`, `charDied()`
- `src/game/combat/DamageCalculator.ts` — `calcThac0()`, `getStrengthDamageBonus()`, `getStrengthHitBonus()`, `getDexArmorBonus()`, `checkRIS()`, `getDamageMessage()`, `getWeaponAttackNoun()`, `getBackstabMultiplier()`
- `src/game/combat/DeathHandler.ts` — `handleDeath()`, `makeCorpse()`, `awardXp()`, `groupXpSplit()`
- `src/game/commands/combat.ts` — `doKill()`, `doMurder()`, `doFlee()`, `doWimpy()`, `doRescue()`, `doKick()`, `doBash()`, `doTrip()`, `doBackstab()`, `doCircle()`, `doDisarm()`, `doGouge()`, `doBite()`, `doClaw()`, `doTail()`, `doStun()`

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3I Objective

Implement the complete magic and spellcasting system as a standalone, deeply detailed module. This sub-phase extracts and fully specifies the spell engine casting pipeline, spell definitions and registry, saving throw mechanics, spell component system, spell function implementations for all spell categories (offensive, healing, buff, debuff, utility), and all magic-related commands. After this sub-phase, players can cast all spells, use magic items (potions, scrolls, wands, staves), and the full casting pipeline — from incantation through target resolution, mana deduction, component consumption, spell execution, and affect application — is pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/spells/SpellEngine.ts` — Spell Casting Pipeline

Implement the full 13-step `do_cast()` pipeline. Replicates legacy `do_cast()` in `magic.c` (line 1599+):

- **`doCast(ch, argument)`** — The master casting entry point. Execute the following steps in exact order:

  1. **Parse arguments:** Extract spell name and optional target string from `argument` using `oneArgument()`. If no spell name: `"Cast which what where?\n"`. Return.

  2. **Find spell:** Look up spell in `SpellRegistry` using prefix match (`strPrefix()`). Search only entries where `type === 'spell'`. Mortals: search only spells they know (`ch.learned.get(sn) > 0`). Immortals use `skillLookup()` for exact match. If not found: `"You don't know any spells by that name.\n"`. Return.

  3. **Proficiency check:** Player must have the spell learned (`ch.learned.get(sn) > 0`). NPCs always pass this check (they know all spells on their prototype). If unlearned: `"You have not learned that spell.\n"`. Return.

  4. **Position check:** Character must be in `minimumPosition` or higher for the spell. Most spells require `POS_STANDING`; combat spells allow `POS_FIGHTING`. If position too low: `"You can't concentrate enough.\n"`. Return.

  5. **Room flag check:** If room has `ROOM_NO_MAGIC` flag: `"You failed.\n"`. Return. If spell has `SF_PKSENSITIVE` flag and room has `ROOM_SAFE` flag: `"You cannot cast that here.\n"`. Return.

  6. **Guild restriction check:** If spell has a `guild` value ≥ 0, only characters of that class can cast it. If wrong class: `"Only {className}s can cast that spell.\n"`. Return.

  7. **Sector check:** Some spells are blocked in specific sectors:
     - `create spring` requires non-water, non-air, non-underwater sector. If invalid: `"You can't do that here.\n"`.
     - `call lightning` requires outdoors (`SectorType.Field`, `SectorType.Hills`, etc.) AND stormy weather. If invalid: `"You need to be outside in a storm.\n"`.
     - Water-walk/water-breathe only usable when water is relevant.

  8. **Mana cost calculation:** Replicates legacy formula exactly:
     ```
     mana = Math.max(spell.minMana, Math.floor(100 / (2 + ch.level - spell.skillLevel[ch.class_])))
     ```
     For vampires: convert to blood cost: `blood = Math.max(1, Math.floor((mana + 4) / 8))`.
     If `ch.mana < mana` (or `ch.pcData.condition[COND_BLOODTHIRST] < blood` for vampires): `"You don't have enough mana.\n"`. Return.

  9. **Target resolution:** Based on `spell.target` enum. Replicates legacy `locate_targets()`:
     - **`TargetType.Ignore`** — No target needed. Set `vo = null`.
     - **`TargetType.CharOffensive`** — Find victim in room using `getCharRoom(ch, targetArg)`.
       - If no argument and `ch.fighting !== null`, default to `ch.fighting`.
       - If no argument and not fighting: `"Cast the spell on whom?\n"`. Return.
       - If not found: `"They aren't here.\n"`. Return.
       - Cannot target self (unless spell overrides): `"You can't cast that on yourself.\n"`. Return.
       - Check `isSafe(ch, victim)` — PK restrictions, room safe, level limits. If blocked, return.
       - If victim is not fighting ch, initiate combat: `startCombat(ch, victim)`.
     - **`TargetType.CharDefensive`** — Find friendly target in room.
       - If no argument, default to `ch` (self-cast).
       - If argument provided, find with `getCharRoom(ch, targetArg)`.
       - If not found: `"They aren't here.\n"`. Return.
     - **`TargetType.CharSelf`** — Must target self.
       - If argument provided and doesn't match `ch.name`: `"You can only cast this spell on yourself.\n"`. Return.
       - Set `vo = ch`.
     - **`TargetType.ObjInventory`** — Find object in character's inventory.
       - Use `getObjCarry(ch, targetArg)`.
       - If not found: `"You are not carrying that.\n"`. Return.
     - **`TargetType.ObjRoom`** — Find object in the room.
       - Use `getObjList(ch, targetArg, ch.inRoom.contents)`.
       - If not found: `"You don't see that here.\n"`. Return.

  10. **Component check:** Call `ComponentSystem.checkComponents(ch, spell)`. If components are missing: `"You are missing a required spell component.\n"`. Return.

  11. **Failure chance (mental state / proficiency roll):** Roll against learned proficiency. Replicates legacy:
      ```
      if (numberPercent() + spell.difficulty * 5 > ch.learned.get(sn))
      ```
      On failure:
      - Send: `"You lost your concentration.\n"`.
      - Deduct half mana: `ch.mana -= Math.floor(mana / 2)`.
      - Call `learnFromFailure(ch, sn, spell)`.
      - Emit `GameEvent.SpellFizzle` with `{ casterId: ch.id, spellId: sn }`.
      - Apply command lag: `WAIT_STATE(ch, spell.beats)`.
      - Return.

  12. **Deduct mana (or blood):**
      - `ch.mana -= mana`.
      - For vampires: `ch.pcData.condition[COND_BLOODTHIRST] -= blood`.

  13. **Consume components:** Call `ComponentSystem.consumeComponents(ch, spell)`.

  14. **Execute spell function:** Call `spell.spellFun(sn, ch.level, ch, vo)`. Capture the `SpellReturn` result.

  15. **Post-execution handling:**
      - If result === `SpellReturn.None` (success): Call `learnFromSuccess(ch, sn, spell)`.
      - If result === `SpellReturn.SpellFailed`: Call `learnFromFailure(ch, sn, spell)`.
      - If result === `SpellReturn.CharDied`: Character died during casting — do not process further.
      - Apply command lag: `WAIT_STATE(ch, spell.beats)`.
      - Emit `GameEvent.SpellCast` with `{ casterId: ch.id, spellId: sn, targetId: vo?.id, success: result === SpellReturn.None }`.

  16. **PK retaliation:** If target is a player and spell was offensive, and target is not already fighting caster, target auto-retaliates: `multiHit(victim, ch, TYPE_UNDEFINED)`.

  17. **Deity favor:** If `ch` worships a deity, adjust favor based on spell usage: `+deity.susChance` for successful offensive spells, `-deity.susChance / 2` for failures.

- **`castSpell(sn, level, ch, vo)`** — Direct spell invocation. Used by scrolls, wands, staves, potions. Skips steps 1–8 and 11–12:
  1. Validate spell exists in registry.
  2. Call `spell.spellFun(sn, level, ch, vo)`.
  3. Handle return code (CharDied, etc.).
  4. No mana cost, no proficiency check, no component consumption.
  5. No command lag.

- **`WAIT_STATE(ch, pulses)`** — Set command lag. Replicates legacy:
  ```typescript
  ch.wait = Math.max(ch.wait, pulses);
  ```

- **Helper: `getCharRoom(ch, arg)`** — Find character in room by name/keyword prefix. Returns `Character | null`.

- **Helper: `getObjCarry(ch, arg)`** — Find object in character's inventory by name/keyword prefix. Returns `GameObject | null`.

- **Helper: `getObjList(ch, arg, list)`** — Find object in an item list by name/keyword prefix. Returns `GameObject | null`.

- **Helper: `isSafe(ch, victim)`** — Check PK safety restrictions. Returns `true` if combat is disallowed. Checks: room `ROOM_SAFE`, level range (±10 for PKill), `PLR_PKILL` flags on both sides, NPC `ACT_NOFIGHT` flag.

### 2. `src/game/spells/SpellRegistry.ts` — Spell Definitions and Lookup

Implement the complete spell table as a `Map<number, SpellDef>` keyed by spell number (sn). Each entry uses the `SpellDef` interface from ARCHITECTURE.md §7.2.

- **`SpellRegistry` class:**
  - `private spells: Map<number, SpellDef>` — Master spell table.
  - `register(spell: SpellDef): void` — Add spell to registry.
  - `findByName(name: string): SpellDef | null` — Prefix match on spell name using `strPrefix()`.
  - `findById(sn: number): SpellDef | null` — Exact lookup by spell number.
  - `findSpell(name: string): SpellDef | null` — Search only entries where `type === 'spell'`.
  - `findSkill(name: string): SpellDef | null` — Search only entries where `type === 'skill'`.
  - `getByName(name: string): SpellDef | null` — Exact name match.
  - `getAllSpells(): SpellDef[]` — Return all entries where `type === 'spell'`.
  - `getAllSkills(): SpellDef[]` — Return all entries where `type === 'skill'`.
  - `getSpellsForClass(classNum: number, level: number): SpellDef[]` — Return spells available to a class at a given level.
  - `initializeSpells(): void` — Populate the registry with all spell definitions.

- **Global Spell Numbers (GSN):** Define constants for all spell numbers, matching legacy `gsn_*`:
  ```typescript
  export const GSN_MAGIC_MISSILE    = 1;
  export const GSN_CHILL_TOUCH      = 2;
  export const GSN_BURNING_HANDS    = 3;
  export const GSN_SHOCKING_GRASP   = 4;
  export const GSN_COLOUR_SPRAY     = 5;
  export const GSN_LIGHTNING_BOLT   = 6;
  export const GSN_FIREBALL         = 7;
  export const GSN_ACID_BLAST       = 8;
  export const GSN_CHAIN_LIGHTNING  = 9;
  export const GSN_METEOR_SWARM    = 10;
  export const GSN_CURE_LIGHT      = 11;
  export const GSN_CURE_SERIOUS    = 12;
  export const GSN_CURE_CRITICAL   = 13;
  export const GSN_HEAL            = 14;
  export const GSN_CURE_BLINDNESS  = 15;
  export const GSN_CURE_POISON     = 16;
  export const GSN_REMOVE_CURSE    = 17;
  export const GSN_ARMOR           = 18;
  export const GSN_BLESS           = 19;
  export const GSN_GIANT_STRENGTH  = 20;
  export const GSN_FLY             = 21;
  export const GSN_INVISIBILITY    = 22;
  export const GSN_DETECT_INVIS    = 23;
  export const GSN_DETECT_HIDDEN   = 24;
  export const GSN_DETECT_MAGIC    = 25;
  export const GSN_SANCTUARY       = 26;
  export const GSN_HASTE           = 27;
  export const GSN_SHIELD          = 28;
  export const GSN_STONE_SKIN      = 29;
  export const GSN_PROT_EVIL       = 30;
  export const GSN_PROT_GOOD       = 31;
  export const GSN_PASS_DOOR       = 32;
  export const GSN_INFRAVISION     = 33;
  export const GSN_BLINDNESS       = 34;
  export const GSN_POISON          = 35;
  export const GSN_CURSE           = 36;
  export const GSN_SLEEP           = 37;
  export const GSN_WEAKEN          = 38;
  export const GSN_FAERIE_FIRE     = 39;
  export const GSN_SLOW            = 40;
  export const GSN_IDENTIFY        = 41;
  export const GSN_LOCATE_OBJ      = 42;
  export const GSN_TELEPORT        = 43;
  export const GSN_SUMMON          = 44;
  export const GSN_GATE            = 45;
  export const GSN_WORD_OF_RECALL  = 46;
  export const GSN_CREATE_FOOD     = 47;
  export const GSN_CREATE_WATER    = 48;
  export const GSN_CREATE_SPRING   = 49;
  export const GSN_CONTINUAL_LIGHT = 50;
  export const GSN_ENCHANT_WEAPON  = 51;
  export const GSN_ENCHANT_ARMOR   = 52;
  export const GSN_DISPEL_MAGIC    = 53;
  export const GSN_EARTHQUAKE      = 54;
  export const GSN_CALL_LIGHTNING  = 55;
  export const GSN_FIRESHIELD      = 56;
  export const GSN_SHOCKSHIELD     = 57;
  export const GSN_ICESHIELD       = 58;
  export const GSN_ACIDMIST        = 59;
  export const GSN_VENOMSHIELD     = 60;
  // ... continue numbering for all spells
  ```

- **Spell definitions — implement ALL categories:**

#### Offensive (Damage) Spells

Define each with exact legacy damage formulas. All check saving throw via `savingThrow()` — on save, halve damage. All set `target: TargetType.CharOffensive`, `saves: SaveType.SpellStaff`.

| Spell | Class | Level | Damage Formula | Mana (min/max) | Beats | Noun |
|---|---|---|---|---|---|---|
| `magic missile` | Mage | 1 | `rollDice(Math.max(1, Math.floor(level / 5)), 4) + level` | 5 / 15 | 12 | "magic missile" |
| `chill touch` | Mage | 4 | `rollDice(Math.max(1, Math.floor(level / 4)), 6) + level` | 10 / 20 | 12 | "chilling touch" |
| `burning hands` | Mage | 7 | `rollDice(Math.max(1, Math.floor(level / 3)), 6) + level * 2` | 12 / 25 | 12 | "burning hands" |
| `shocking grasp` | Mage | 10 | `rollDice(Math.max(1, Math.floor(level / 3)), 8) + level * 2` | 15 / 30 | 12 | "shocking grasp" |
| `colour spray` | Mage | 15 | `rollDice(Math.max(1, Math.floor(level / 2)), 8) + level * 3` | 18 / 35 | 12 | "colour spray" |
| `lightning bolt` | Mage | 20 | `rollDice(Math.max(1, Math.floor(level / 2)), 10) + level * 3` | 22 / 45 | 12 | "lightning bolt" |
| `fireball` | Mage | 25 | `rollDice(Math.max(1, Math.floor(level / 2)), 12) + level * 4` | 25 / 50 | 12 | "fireball" |
| `acid blast` | Mage | 30 | `rollDice(Math.max(1, Math.floor(level / 2)), 14) + level * 4` | 30 / 55 | 12 | "acid blast" |
| `chain lightning` | Mage | 35 | `rollDice(Math.max(1, Math.floor(level / 2)), 16) + level * 5` | 35 / 65 | 12 | "chain lightning" |
| `meteor swarm` | Mage | 40 | `rollDice(level, 6) + level * 6` | 50 / 80 | 16 | "meteor swarm" |

**Spell function implementation pattern (offensive):**
```typescript
function spellFireball(sn: number, level: number, ch: Character, vo: Character | GameObject | null): SpellReturn {
  const victim = vo as Character;
  if (!victim || charDied(victim)) return SpellReturn.Error;

  let dam = rollDice(Math.max(1, Math.floor(level / 2)), 12) + level * 4;

  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    dam = Math.floor(dam / 2);
  }

  return inflictDamage(ch, victim, dam, sn) as unknown as SpellReturn;
}
```

**Area-effect offensive spells** (earthquake, chain lightning, meteor swarm) iterate all characters in the room and damage non-grouped characters:
```typescript
function spellEarthquake(sn: number, level: number, ch: Character, vo: Character | GameObject | null): SpellReturn {
  sendToChar(ch, "The earth trembles beneath your feet!\n");
  actToRoom(ch, "$n makes the earth tremble and shiver.", ch.inRoom);

  for (const victim of ch.inRoom.characters) {
    if (victim === ch) continue;
    if (ch.isNpc === victim.isNpc) continue; // Same type = skip
    if (isInGroup(ch, victim)) continue;
    if (isSafe(ch, victim)) continue;

    let dam = rollDice(level, 6) + level * 2;
    if (savingThrow(level, victim, SaveType.SpellStaff)) {
      dam = Math.floor(dam / 2);
    }
    inflictDamage(ch, victim, dam, sn);
  }
  return SpellReturn.None;
}
```

#### Healing Spells

All set `target: TargetType.CharDefensive`, `saves: SaveType.SpellStaff` (no saving throw for heals).

| Spell | Class | Level | Heal Formula | Mana (min/max) | Beats |
|---|---|---|---|---|---|
| `cure light` | Cleric | 1 | `rollDice(1, 8) + Math.floor(level / 3)` | 10 / 15 | 12 |
| `cure serious` | Cleric | 7 | `rollDice(2, 8) + Math.floor(level / 2)` | 15 / 25 | 12 |
| `cure critical` | Cleric | 13 | `rollDice(3, 8) + level` | 20 / 35 | 12 |
| `heal` | Cleric | 25 | `Math.min(victim.maxHit - victim.hit, 100 + level * 2)` | 50 / 80 | 16 |

**Spell function pattern (healing):**
```typescript
function spellCureLight(sn: number, level: number, ch: Character, vo: Character | GameObject | null): SpellReturn {
  const victim = (vo as Character) ?? ch;
  const heal = rollDice(1, 8) + Math.floor(level / 3);
  victim.hit = Math.min(victim.hit + heal, victim.maxHit);
  sendToChar(victim, "You feel better!\n");
  if (ch !== victim) {
    sendToChar(ch, "Ok.\n");
  }
  return SpellReturn.None;
}
```

**Cure condition spells:**
- `cure blindness` — Call `affectManager.stripAffects(victim, GSN_BLINDNESS)`. If victim has `AFF_BLIND`: remove flag. `"Your vision returns!\n"`. If not blind: `"They aren't blind.\n"`.
- `cure poison` — Call `affectManager.stripAffects(victim, GSN_POISON)`. Remove `AFF_POISON` flag. `"A warm feeling runs through your body.\n"`.
- `remove curse` — Strip `GSN_CURSE` affects. Remove `AFF_CURSE` flag. Also checks equipment for `ITEM_NODROP`/`ITEM_NOREMOVE` cursed flags and clears them.

#### Buff Spells (Apply Affects)

All set `target: TargetType.CharDefensive` (unless noted). Each creates an `Affect` object and calls `affectManager.addAffect()` or `affectManager.joinAffect()`. If the target already has the affect, send: `"You are already affected by {spellName}.\n"`.

| Spell | AFF Flag | Modifier | Duration (ticks) | Mana (min) | Class/Level |
|---|---|---|---|---|---|
| `armor` | — | AC: `-20` | `24 - Math.floor(level / 2)` | 5 | Mage 7, Cleric 1 |
| `bless` | — | Hitroll: `+Math.floor(level / 8)`, SaveSpell: `-Math.floor(level / 8)` | `12 + Math.floor(level / 4)` | 5 | Cleric 5 |
| `giant strength` | — | STR: `+1 + Math.floor(level / 18)` | `level + 10` | 20 | Mage 11 |
| `fly` | `AFF_FLYING` | — | `level + 10` | 10 | Mage 10 |
| `invisibility` | `AFF_INVISIBLE` | — | `24 + Math.floor(level / 2)` | 5 | Mage 5 |
| `detect invisible` | `AFF_DETECT_INVIS` | — | `24 + Math.floor(level / 2)` | 5 | Mage 3, Cleric 6 |
| `detect hidden` | `AFF_DETECT_HIDDEN` | — | `24 + Math.floor(level / 2)` | 5 | Mage 8, Cleric 8 |
| `detect magic` | `AFF_DETECT_MAGIC` | — | `24 + Math.floor(level / 2)` | 5 | Mage 2 |
| `sanctuary` | `AFF_SANCTUARY` | — | `Math.floor(level / 6) + 1` | 75 | Cleric 20 |
| `haste` | `AFF_HASTE` | — | `Math.floor(level / 4)` | 30 | Mage 24 |
| `shield` | — | AC: `-20` | `12 + Math.floor(level / 4)` | 12 | Mage 15 |
| `stone skin` | — | AC: `-40` | `Math.floor(level / 5)` | 25 | Mage 25 |
| `protection evil` | `AFF_PROTECT_EVIL` | SaveSpell: `-1` | `24` | 5 | Cleric 9 |
| `protection good` | `AFF_PROTECT_GOOD` | SaveSpell: `-1` | `24` | 5 | Cleric 9 |
| `pass door` | `AFF_PASS_DOOR` | — | `Math.floor(level / 4) + 8` | 20 | Mage 18 |
| `infravision` | `AFF_INFRARED` | — | `24 + Math.floor(level / 2)` | 5 | Mage 6, Cleric 9 |
| `fireshield` | `AFF_FIRESHIELD` | — | `Math.floor(level / 8) + 1` | 40 | Mage 30 |
| `shockshield` | `AFF_SHOCKSHIELD` | — | `Math.floor(level / 8) + 1` | 40 | Mage 32 |
| `iceshield` | `AFF_ICESHIELD` | — | `Math.floor(level / 8) + 1` | 40 | Mage 34 |

**Spell function pattern (buff):**
```typescript
function spellArmor(sn: number, level: number, ch: Character, vo: Character | GameObject | null): SpellReturn {
  const victim = (vo as Character) ?? ch;

  if (affectManager.isAffectedBy(victim, sn)) {
    sendToChar(ch, victim === ch ? "You are already armored.\n" : "They are already armored.\n");
    return SpellReturn.SpellFailed;
  }

  const af = new Affect(sn, 24 - Math.floor(level / 2), ApplyType.Ac, -20, 0n);
  affectManager.addAffect(victim, af);
  sendToChar(victim, "You feel someone protecting you.\n");
  if (ch !== victim) {
    sendToChar(ch, "Ok.\n");
  }
  return SpellReturn.None;
}
```

**Sanctuary special handling:**
- Only one character per room may have sanctuary at a time (SMAUG restriction for NPCs if `sysdata.noplayer_sanc` is set).
- Check alignment restrictions: standard sanctuary requires non-evil alignment. Evil characters use `demonic sanctuary` or are rejected.
- Display: `"$n is surrounded by a white aura."` / `"You are surrounded by a white aura.\n"`.

#### Debuff Spells

All set `target: TargetType.CharOffensive`. Each checks saving throw — if victim saves, spell fails. Apply `Affect` on failure.

| Spell | AFF Flag | Modifier | Duration (ticks) | Save | Mana (min) | Class/Level |
|---|---|---|---|---|---|---|
| `blindness` | `AFF_BLIND` | Hitroll: `-4`, AC: `+40` | `1 + Math.floor(level / 8)` | SpellStaff | 5 | Mage 9, Cleric 7 |
| `poison` | `AFF_POISON` | STR: `-2` | `Math.floor(level / 3)` | PoisonDeath | 10 | Mage 14, Cleric 12 |
| `curse` | `AFF_CURSE` | Hitroll: `-1`, SaveSpell: `+1` | `Math.floor(level / 4) + 1` | SpellStaff | 20 | Mage 18, Cleric 15 |
| `sleep` | `AFF_SLEEP` | — | `4 + Math.floor(level / 10)` | SpellStaff | 15 | Mage 10 |
| `weaken` | — | STR: `-2 - Math.floor(level / 20)` | `Math.floor(level / 4) + 1` | SpellStaff | 20 | Mage 11, Cleric 14 |
| `faerie fire` | `AFF_FAERIE_FIRE` | AC: `+2 * level` | `Math.floor(level / 3)` | SpellStaff | 5 | Mage 4, Cleric 3 |
| `slow` | `AFF_SLOW` | DEX: `-2` | `Math.floor(level / 6)` | SpellStaff | 30 | Mage 23 |

**Spell function pattern (debuff):**
```typescript
function spellBlindness(sn: number, level: number, ch: Character, vo: Character | GameObject | null): SpellReturn {
  const victim = vo as Character;
  if (!victim) return SpellReturn.Error;

  if (hasFlag(victim.affectedBy, AFF_BLIND)) {
    sendToChar(ch, "They are already blinded.\n");
    return SpellReturn.SpellFailed;
  }

  if (hasFlag(victim.immune, RIS_MAGIC)) {
    immuneMessage(ch, victim);
    return SpellReturn.SpellFailed;
  }

  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    sendToChar(ch, "You failed.\n");
    return SpellReturn.SpellFailed;
  }

  const af = new Affect(sn, 1 + Math.floor(level / 8), ApplyType.Hitroll, -4, AFF_BLIND);
  affectManager.addAffect(victim, af);

  // Also add AC penalty as second affect
  const af2 = new Affect(sn, 1 + Math.floor(level / 8), ApplyType.Ac, 40, 0n);
  affectManager.addAffect(victim, af2);

  sendToChar(victim, "You are blinded!\n");
  actToRoom(victim, "$n appears to be blinded.", victim.inRoom);
  return SpellReturn.None;
}
```

**Sleep special handling:** On success, set `victim.position = POS_SLEEPING`. If victim was fighting, call `stopFighting(victim, true)`. If victim is a player, this is PK-sensitive — check `SF_PKSENSITIVE` restrictions.

**Poison periodic effect:** During `affectUpdate()` (called each `PULSE_TICK`), if character has `AFF_POISON`: deal `rollDice(2, 4)` damage per tick, send `"You feel very sick.\n"`, and deduct 1 move point. Check for death after damage.

#### Utility Spells

| Spell | Target | Description |
|---|---|---|
| `identify` | `ObjInventory` | Display full object stats. See implementation below. |
| `locate object` | `Ignore` | Find all instances of a named object in the world. |
| `teleport` | `Ignore` | Move caster to a random non-private, non-no-recall room. |
| `summon` | `Ignore` | Bring a named player to caster's room. |
| `gate` | `Ignore` | Create a two-way portal object to a player's location. |
| `word of recall` | `CharSelf` | Teleport to recall room (like `doRecall` but as spell). |
| `create food` | `Ignore` | Create a mushroom food object in the room. |
| `create water` | `ObjInventory` | Fill a drink container with water. |
| `create spring` | `Ignore` | Create a spring (fountain) object in the room. |
| `continual light` | `Ignore` | Create a light ball object in the room. |
| `enchant weapon` | `ObjInventory` | Add hitroll/damroll affects to a weapon. |
| `enchant armor` | `ObjInventory` | Add AC bonus affect to armour. |
| `dispel magic` | `CharOffensive` | Remove one random buff from target. |
| `earthquake` | `Ignore` | Area damage to all non-grouped in room. |
| `call lightning` | `CharOffensive` | High damage, requires outdoor + stormy weather. |

**`identify` implementation:**
```typescript
function spellIdentify(sn: number, level: number, ch: Character, vo: Character | GameObject | null): SpellReturn {
  const obj = vo as GameObject;
  if (!obj) return SpellReturn.Error;

  sendToChar(ch, `Object: '${obj.shortDescription}'\n`);
  sendToChar(ch, `Type: ${getItemTypeName(obj.itemType)}, Extra flags: ${formatFlags(obj.extraFlags)}\n`);
  sendToChar(ch, `Weight: ${obj.weight}, Value: ${obj.cost}, Level: ${obj.level}\n`);

  switch (obj.itemType) {
    case ITEM_SCROLL:
    case ITEM_POTION:
    case ITEM_PILL:
      sendToChar(ch, `Level ${obj.values[0]} spells of:`);
      for (let i = 1; i <= 3; i++) {
        if (obj.values[i] > 0) {
          const sp = spellRegistry.findById(obj.values[i]);
          sendToChar(ch, ` '${sp?.name ?? 'unknown'}'`);
        }
      }
      sendToChar(ch, "\n");
      break;

    case ITEM_WAND:
    case ITEM_STAFF:
      sendToChar(ch, `Has ${obj.values[2]} of ${obj.values[1]} charges of level ${obj.values[0]}`);
      const sp = spellRegistry.findById(obj.values[3]);
      sendToChar(ch, ` '${sp?.name ?? 'unknown'}'\n`);
      break;

    case ITEM_WEAPON:
      sendToChar(ch, `Damage is ${obj.values[1]}d${obj.values[2]} (average ${Math.floor((obj.values[1] * (obj.values[2] + 1)) / 2)})\n`);
      sendToChar(ch, `Weapon type: ${getWeaponAttackNoun(obj.values[3])}\n`);
      break;

    case ITEM_ARMOR:
      sendToChar(ch, `Armor class is ${obj.values[0]}\n`);
      break;
  }

  // Display affects
  for (const af of obj.affects) {
    sendToChar(ch, `Affects ${getApplyTypeName(af.location)} by ${af.modifier}\n`);
  }
  return SpellReturn.None;
}
```

**`enchant weapon` implementation details:**
1. Object must be `ITEM_WEAPON`. If already enchanted (has magical affects > 2), chance of failure increases.
2. Success: Add `Affect` with `ApplyType.Hitroll` modifier `+1 + Math.floor(level / 18)` and `ApplyType.Damroll` modifier `+1 + Math.floor(level / 22)`. Set `ITEM_MAGIC` extra flag.
3. Failure (roll): If `numberPercent() < failChance`, weapon is destroyed: `"$p shivers violently and explodes!\n"`. Extract object. Deal `rollDice(level, 2)` damage to caster.
4. Fail chance: `5 + (existingEnchants * 20)` percent.

**`dispel magic` implementation:**
1. Check saving throw. If victim saves: `"You failed.\n"`. Return `SpellFailed`.
2. Collect all non-permanent, non-equipment affects on victim.
3. Pick one at random.
4. Remove it via `affectManager.stripAffects(victim, affect.type)`.
5. Send: `"One of your magical enchantments fades away.\n"` to victim.
6. Send: `"You successfully dispel a spell on $N.\n"` to caster.

**`gate` implementation:**
1. Parse target player name from argument.
2. Find player in game. If not found or same room: `"You failed.\n"`.
3. Check restrictions: `ROOM_NO_RECALL` on either room, `PLR_NOSUMMON` on target, level too low for target.
4. Create a portal `GameObject` with `ITEM_PORTAL`:
   - `values[0]` = destination room vnum.
   - `values[3]` = charge count (1 = one-time use, or `level / 10` charges).
   - Timer: `level / 5` ticks.
5. Place portal in caster's room.
6. Optionally create a return portal in target's room.
7. Send: `"A shimmering gate rises up before you.\n"` to caster and room.

**`create food`/`create water`/`create spring`/`continual light`:** Each creates a temporary `GameObject`:
- `create food`: `ITEM_FOOD` object, `values[0]` = `5 + level / 2` (hours of nourishment), timer = 24 ticks. Name: `"mushroom"`.
- `create water`: Find drink container in inventory (`ITEM_DRINK_CON`). Fill it: `values[1] = Math.min(values[0], values[1] + level * 2)`. Liquid type = water (`0`).
- `create spring`: `ITEM_FOUNTAIN` object, timer = `level` ticks. Placed in room.
- `continual light`: `ITEM_LIGHT` object, `values[2]` = `-1` (infinite burn). Placed in room.

### 3. `src/game/spells/SavingThrows.ts` — Saving Throw System

Implement the full saving throw calculation. Replicates legacy `saves_spell_staff()` et al. from `fight.c`:

- **`savingThrow(level, victim, saveType)`** — Core save function:
  1. Determine victim's save value based on `saveType`:
     ```typescript
     switch (saveType) {
       case SaveType.PoisonDeath: saveValue = victim.savingPoison; break;
       case SaveType.RodWands:    saveValue = victim.savingRod; break;
       case SaveType.ParaPetri:   saveValue = victim.savingPara; break;
       case SaveType.Breath:      saveValue = victim.savingBreath; break;
       case SaveType.SpellStaff:  saveValue = victim.savingSpell; break;
       default: saveValue = 0;
     }
     ```
  2. Calculate save chance: `save = 50 + (victim.level - level - saveValue) * 5`.
  3. **RIS modifiers** via `risSave()`: Check victim's `immune`, `resistant`, `susceptible` bitvectors against the spell's damage type:
     - If `immune`: save = 1000 (automatic save).
     - If `resistant`: `save -= 2` (easier to save).
     - If `susceptible`: `save += 2` (harder to save).
  4. Clamp: `save = Math.max(5, Math.min(95, save))`.
  5. Roll: `return numberPercent() < save`.

- **`SaveType` enum:** Matches legacy constants:
  ```typescript
  export enum SaveType {
    PoisonDeath = 0,  // SS_POISON_DEATH
    RodWands    = 1,  // SS_ROD_WANDS
    ParaPetri   = 2,  // SS_PARA_PETRI
    Breath      = 3,  // SS_BREATH
    SpellStaff  = 4,  // SS_SPELL_STAFF
  }
  ```

- **`risSave(victim, damageType)`** — Check RIS bitvectors and return modifier. Replicates legacy `ris_save()`:
  1. Map the spell/damage type to a RIS bit (e.g., fire spell → `RIS_FIRE`).
  2. Check `victim.immune` — if bit set, return -10 (auto-save).
  3. Check `victim.resistant` — if bit set, return -2.
  4. Check `victim.susceptible` — if bit set, return +2.
  5. If both resistant and susceptible, cancel: return 0.
  6. Default: return 0.

- **Base saving throw tables by class and level:** Define class-specific saving throw improvement rates. Replicates legacy `save_vs_*` tables:
  ```typescript
  // Warriors save better vs physical, Mages save better vs spells
  export function getBaseSave(classNum: number, level: number, saveType: SaveType): number {
    // Level 1 base: all saves start at 0 (modified by equipment/spells)
    // Each level improves saves by class-specific rates
    // Warriors: -0.5/level for Breath, -0.4/level for others
    // Mages: -0.5/level for SpellStaff, -0.3/level for others
    // Clerics: -0.5/level for PoisonDeath, -0.4/level for others
    // Thieves: -0.5/level for ParaPetri, -0.4/level for others
  }
  ```

### 4. `src/game/spells/ComponentSystem.ts` — Spell Components

Implement the spell component processing system. Replicates legacy `process_spell_components()` from `magic.c`:

- **Component string format:** Each spell's `components` field is a space-separated string of component codes:
  ```
  V1234    — Require item with vnum 1234
  T5       — Require item with item type 5
  Ksilver  — Require item with keyword "silver"
  G100     — Require 100 gold
  H10      — Require 10 HP (costs HP to cast)
  ```
  Prefix modifiers:
  - `!` — Require the character does NOT have the item (inverse check).
  - `+` — Check for item but do NOT consume it.

- **`checkComponents(ch, spell)`** — Validate all components are present:
  1. Parse the `spell.components` string into individual component descriptors.
  2. For each descriptor:
     - `V####`: Find object in `ch.carrying` with matching vnum. If `!` prefix, fail if found. Otherwise fail if not found.
     - `T#`: Find object in `ch.carrying` with matching `itemType`. Same negation logic.
     - `K<word>`: Find object in `ch.carrying` with matching keyword. Same negation logic.
     - `G####`: Check `ch.gold >= amount`. If `!` prefix, fail if character HAS enough gold.
     - `H####`: Check `ch.hit > amount` (must have MORE than the amount, not die from component cost).
  3. Return `true` if all checks pass, `false` if any fail.

- **`consumeComponents(ch, spell)`** — Remove/consume components after casting:
  1. Parse component string again.
  2. For each descriptor (skip those with `+` prefix — non-consumed):
     - `V####`/`T#`/`K<word>`: Find the matching object and call `extractObj(obj)` to destroy it.
     - `G####`: Deduct gold: `ch.gold -= amount`.
     - `H####`: Deduct HP: `ch.hit -= amount`. Check if this kills the character.
  3. Log consumed components for debugging.

- **`parseComponents(componentStr)`** — Parse the component string into a structured array:
  ```typescript
  interface ComponentDescriptor {
    type: 'vnum' | 'itemtype' | 'keyword' | 'gold' | 'hp';
    value: number | string;
    negate: boolean;    // ! prefix
    noConsume: boolean; // + prefix
  }
  ```

### 5. `src/game/commands/magic.ts` — Magic Commands

Implement all magic-related player commands. Register each in `CommandRegistry`.

- **`doCast(ch, argument)`** — Entry point for spell casting. Delegates to `SpellEngine.doCast()`:
  ```typescript
  export function doCast(ch: Character, argument: string): void {
    SpellEngine.doCast(ch, argument);
  }
  ```
  Register: `{ name: 'cast', fun: doCast, position: POS_FIGHTING, level: 0, log: LOG_NORMAL }`.

- **`doBrandish(ch, argument)`** — Use a staff. Replicates legacy `do_brandish()` (`act_obj.c`):
  1. Find staff in `ch.equipment.get(WEAR_HOLD)`. If not found or not `ITEM_STAFF`: `"You aren't holding a staff.\n"`. Return.
  2. Get spell from `staff.values[3]` (spell sn).
  3. If `staff.values[2] <= 0` (no charges left): `"The {staff.shortDescription} has lost its power.\n"`. Return.
  4. Decrement charges: `staff.values[2] -= 1`.
  5. Target resolution: Based on staff's target type. For `TAR_CHAR_OFFENSIVE`: iterate all non-grouped characters in room as targets. For `TAR_CHAR_DEFENSIVE`: cast on self. For `TAR_IGNORE`: cast once with null target.
  6. For each valid target: Call `castSpell(spell.sn, staff.values[0], ch, target)`.
  7. Apply lag: `WAIT_STATE(ch, 2 * PULSE_VIOLENCE)`.
  8. If charges exhausted after use: `"The {staff.shortDescription} blazes bright and is gone.\n"`. Extract object.

- **`doZap(ch, argument)`** — Use a wand. Replicates legacy `do_zap()` (`act_obj.c`):
  1. Find wand in `ch.equipment.get(WEAR_HOLD)`. If not found or not `ITEM_WAND`: `"You aren't holding a wand.\n"`. Return.
  2. Parse target from `argument`. Target resolution based on wand's target type.
  3. If no target and spell is offensive: default to `ch.fighting`. If still no target: `"Zap whom or what?\n"`. Return.
  4. If `wand.values[2] <= 0`: `"The {wand.shortDescription} has lost its power.\n"`. Return.
  5. Decrement: `wand.values[2] -= 1`.
  6. Skill check: Roll against `gsn_wands` proficiency. If fails: `"You fumble and fail to zap your wand properly.\n"`. Call `learnFromFailure(ch, gsn_wands)`. Return.
  7. Call `castSpell(spell.sn, wand.values[0], ch, target)`.
  8. Apply lag: `WAIT_STATE(ch, 2 * PULSE_VIOLENCE)`.
  9. If charges exhausted: `"The {wand.shortDescription} blazes bright and is gone.\n"`. Extract.

- **`doQuaff(ch, argument)`** — Drink a potion. Replicates legacy `do_quaff()` (`act_obj.c`):
  1. Find potion in `ch.carrying` by argument. If not found: `"You don't have that potion.\n"`. Return.
  2. If `obj.itemType !== ITEM_POTION`: `"You can only quaff potions.\n"`. Return.
  3. If `ch.position === POS_FIGHTING`: 50% chance to fumble and drop potion: `"You fumble the potion and it smashes on the floor!\n"`. Extract potion. Return.
  4. Act messages: `"You quaff $p."` / `"$n quaffs $p."`.
  5. Apply up to 3 spell effects stored in the potion's `values[1]`, `values[2]`, `values[3]` (spell sns). The potion's level is `values[0]`. For each non-zero spell sn:
     ```typescript
     castSpell(values[i], values[0], ch, ch);
     ```
     (Potions always target the quaffer.)
  6. After all spells applied, destroy potion: `extractObj(obj)`.
  7. Apply lag: `WAIT_STATE(ch, PULSE_VIOLENCE)`.
  8. If `ch` is an NPC, check for self-healing behavior: if hit < maxHit/4 and has healing potion, quaff it.

- **`doRecite(ch, argument)`** — Read a scroll. Replicates legacy `do_recite()` (`act_obj.c`):
  1. Find scroll in `ch.carrying` by first argument. If not found: `"You don't have that scroll.\n"`. Return.
  2. If `obj.itemType !== ITEM_SCROLL`: `"You can only recite scrolls.\n"`. Return.
  3. Parse target from remaining argument.
  4. Skill check: Roll against `gsn_scrolls` proficiency. If fails: `"You mangle the scroll and it bursts into flames!\n"`. Extract scroll. Call `learnFromFailure(ch, gsn_scrolls)`. Return.
  5. Act messages: `"You recite $p."` / `"$n recites $p."`.
  6. Apply up to 3 spell effects from `values[1-3]` at level `values[0]`:
     ```typescript
     castSpell(values[i], values[0], ch, target);
     ```
     Target depends on the spell's target type.
  7. Destroy scroll: `extractObj(obj)`.
  8. Apply lag: `WAIT_STATE(ch, 2 * PULSE_VIOLENCE)`.

- **`doPractice(ch, argument)`** — Practice a spell or skill at a trainer mob. Replicates legacy `do_practice()`:
  1. **No argument:** List all known spells/skills with current proficiency percentages:
     ```
     Spell/Skill              Prac Level
     magic missile             85%   1
     fireball                  23%   25
     dodge                     67%   1
     ```
     Group by spell/skill type. Show only entries where player has learned > 0 or can learn (level meets requirement).
  2. **With argument:**
     a. Check for a practice mob in the room: find an NPC with `ACT_PRACTICE` flag. If none: `"You can't do that here.\n"`. Return.
     b. Look up the spell/skill by prefix match in the registry.
     c. If not found or level too high: `"You can't practice that.\n"`. Return.
     d. If `ch.practice <= 0`: `"You have no practice sessions left.\n"`. Return.
     e. If already at adept: `"You are already an adept of {skillName}.\n"`. Return.
     f. Deduct: `ch.practice -= 1`.
     g. Increase learned percentage: `current + int_app[ch.intelligence].learn`. The `int_app` table maps INT scores to learn rates:
        ```
        INT 1-8:   3
        INT 9-11:  5
        INT 12-14: 7
        INT 15-17: 9
        INT 18-19: 11
        INT 20-21: 13
        INT 22-24: 15
        INT 25:    17
        ```
     h. Cap at adept: `skill.skillAdept[ch.class_]` (typically 75-95% depending on class and skill).
     i. Display: `"You practice {skillName}. ({newPercent}%)\n"`.

### 6. `src/game/affects/AffectManager.ts` — Affect Application and Removal

Implement the complete affect lifecycle management. Replicates legacy `affect_to_char()`, `affect_join()`, `affect_remove()`, `affect_strip()` from `handler.c`:

- **`addAffect(ch, affect)`** — Apply a new affect to a character. Replicates `affect_to_char()`:
  1. Push `affect` to `ch.affects` array.
  2. Call `affect.applyTo(ch)` — applies stat modifications and sets bitvector flags.
  3. Handle special side-effects:
     - `AFF_BLIND`: If character was in combat, they cannot flee effectively. No position change.
     - `AFF_SLEEP`: Force `ch.position = POS_SLEEPING`. If fighting, call `stopFighting(ch, true)`.
     - `AFF_FLYING`: Character can now traverse air sectors and avoids ground traps.
     - `AFF_INVISIBLE`: Remove from room's "visible" cache.
     - `AFF_CHARM`: Set `ch.master = affect originator` (if applicable). NPC becomes charmed pet.
     - `AFF_PARALYSIS`: Character cannot act. Skip their turn in violence loop.
  4. Emit `GameEvent.AffectApplied` with `{ characterId: ch.id, affectType: affect.type, duration: affect.duration }`.

- **`joinAffect(ch, affect)`** — Merge with existing affect of same type, or add new. Replicates `affect_join()`:
  1. Find existing affect with same `type` AND same `location`.
  2. If found:
     - `existing.duration = Math.max(existing.duration, affect.duration)` (take longer duration).
     - Remove old modifier: `existing.removeFrom(ch)`.
     - `existing.modifier += affect.modifier` (stack modifiers).
     - Re-apply: `existing.applyTo(ch)`.
  3. If not found: call `addAffect(ch, affect)`.

- **`removeAffect(ch, affect)`** — Remove a specific affect instance. Replicates `affect_remove()`:
  1. Call `affect.removeFrom(ch)` — reverses stat modifications.
  2. Handle bitvector removal carefully: only clear `affect.bitvector` from `ch.affectedBy` if NO other affect on the character sets the same bitvector bit. This prevents removing sanctuary when two different spells both grant it.
     ```typescript
     if (affect.bitvector !== 0n) {
       const otherSets = ch.affects.some(a => a !== affect && (a.bitvector & affect.bitvector) !== 0n);
       if (!otherSets) {
         ch.affectedBy &= ~affect.bitvector;
       }
     }
     ```
  3. Remove from `ch.affects` array by reference.
  4. Handle special removal side-effects:
     - `AFF_FLYING` removal: If character is in an air sector or above water, apply fall damage: `dam = rollDice(ch.level, 6)`. `inflictDamage(null, ch, dam, TYPE_UNDEFINED)`. Send: `"You plummet to the ground!\n"`.
     - `AFF_INVISIBLE` removal: Character becomes visible.
     - `AFF_SLEEP` removal: Character wakes up. `ch.position = POS_RESTING`.
     - `AFF_CHARM` removal: NPC is freed. Clear `ch.master`.
  5. Emit `GameEvent.AffectRemoved` with `{ characterId: ch.id, affectType: affect.type }`.

- **`stripAffects(ch, spellSn)`** — Remove ALL affects of a given spell/skill type. Replicates `affect_strip()`:
  1. Iterate `ch.affects` in reverse order (to safely remove during iteration).
  2. For each affect where `affect.type === spellSn`: call `removeAffect(ch, affect)`.

- **`isAffectedBy(ch, spellSn)`** — Check if character has any active affect of a given type:
  ```typescript
  return ch.affects.some(a => a.type === spellSn);
  ```

- **`findAffect(ch, spellSn)`** — Find first affect of a given type:
  ```typescript
  return ch.affects.find(a => a.type === spellSn) ?? null;
  ```

- **`affectUpdate()`** — Called every `PULSE_TICK` (280 pulses = 70 seconds). Replicates legacy `affect_update()`:
  1. Iterate all characters in the global character list.
  2. For each character, iterate their `affects` array (in reverse for safe removal).
  3. For each affect:
     - If `affect.duration > 0`: decrement `affect.duration -= 1`.
     - If `affect.duration === 0`: The spell is about to expire.
       - Send the spell's wear-off message (`spell.msgOff`): `"{msgOff}\n"`. If no message, use generic: `"A spell wears off.\n"`.
       - Call `removeAffect(ch, affect)`.
     - If `affect.duration < 0`: Permanent affect — do NOT decrement. Skip.
  4. **Periodic effects during tick:**
     - `AFF_POISON`: Deal `rollDice(2, 4)` damage. Send: `"You feel very sick.\n"`. `worsenMentalState(ch, 1)`.
     - `AFF_PLAGUE` (if implemented): Spread to others in room, deal damage.
     - `AFF_BERSERK`: Small chance to attack random character in room.
  5. Wire into `TickEngine`: `EventBus.on(GameEvent.FullTick, () => affectManager.affectUpdate())`.

### 7. `src/game/affects/AffectRegistry.ts` — Affect Type Definitions

Define all affect types with their metadata for display and management:

```typescript
export interface AffectDefinition {
  sn: number;              // Spell/skill number
  name: string;            // Display name
  wearOffMsg: string;      // Message when affect expires
  bitvector: bigint;       // AFF_* flag this affect sets
  defaultLocation: ApplyType;
  hasPeriodic: boolean;    // Has periodic tick effect
  isDebuff: boolean;       // Considered negative
  canDispel: boolean;      // Can be removed by dispel magic
}
```

Define entries for ALL `AFF_*` flags. The complete list:

| AFF Flag | Bit | Name | Wear-off Message |
|---|---|---|---|
| `AFF_BLIND` | `1n << 0n` | "blindness" | "You can see again." |
| `AFF_INVISIBLE` | `1n << 1n` | "invisibility" | "You are no longer invisible." |
| `AFF_DETECT_EVIL` | `1n << 2n` | "detect evil" | "The red in your vision fades." |
| `AFF_DETECT_INVIS` | `1n << 3n` | "detect invisible" | "You no longer see invisible objects." |
| `AFF_DETECT_MAGIC` | `1n << 4n` | "detect magic" | "The detect magic wears off." |
| `AFF_DETECT_HIDDEN` | `1n << 5n` | "detect hidden" | "You feel less aware of your surroundings." |
| `AFF_HOLD` | `1n << 6n` | "hold" | "You are no longer paralyzed." |
| `AFF_SANCTUARY` | `1n << 7n` | "sanctuary" | "The white aura around your body fades." |
| `AFF_FAERIE_FIRE` | `1n << 8n` | "faerie fire" | "The pink aura around you fades." |
| `AFF_INFRARED` | `1n << 9n` | "infravision" | "You no longer see in the dark." |
| `AFF_CURSE` | `1n << 10n` | "curse" | "The curse wears off." |
| `AFF_FLAMING` | `1n << 11n` | "flaming" | "Your flaming aura fades." |
| `AFF_POISON` | `1n << 12n` | "poison" | "You feel better." |
| `AFF_PROTECT_EVIL` | `1n << 13n` | "protection evil" | "You feel less protected." |
| `AFF_PROTECT_GOOD` | `1n << 14n` | "protection good" | "You feel less protected." |
| `AFF_SNEAK` | `1n << 15n` | "sneak" | "You no longer feel stealthy." |
| `AFF_HIDE` | `1n << 16n` | "hide" | "You are no longer hidden." |
| `AFF_SLEEP` | `1n << 17n` | "sleep" | "You feel less tired." |
| `AFF_CHARM` | `1n << 18n` | "charm" | "You feel more self-confident." |
| `AFF_FLYING` | `1n << 19n` | "fly" | "You slowly float to the ground." |
| `AFF_PASS_DOOR` | `1n << 20n` | "pass door" | "You feel solid again." |
| `AFF_FLOATING` | `1n << 21n` | "float" | "You slowly float to the ground." |
| `AFF_TRUESIGHT` | `1n << 22n` | "true sight" | "You feel less aware." |
| `AFF_DETECT_TRAPS` | `1n << 23n` | "detect traps" | "You no longer feel alert for traps." |
| `AFF_SCRYING` | `1n << 24n` | "scrying" | "Your magic mirror fades." |
| `AFF_FIRESHIELD` | `1n << 25n` | "fireshield" | "The fiery aura around your body fades." |
| `AFF_SHOCKSHIELD` | `1n << 26n` | "shockshield" | "The crackling energy around your body fades." |
| `AFF_ICESHIELD` | `1n << 27n` | "iceshield" | "The icy aura around your body fades." |
| `AFF_ACIDMIST` | `1n << 28n` | "acidmist" | "The acid mist around your body fades." |
| `AFF_VENOMSHIELD` | `1n << 29n` | "venomshield" | "The venom shield around your body fades." |
| `AFF_HASTE` | `1n << 30n` | "haste" | "You feel yourself slow down." |
| `AFF_SLOW` | `1n << 31n` | "slow" | "You feel yourself speed up." |
| `AFF_PARALYSIS` | `1n << 32n` | "paralysis" | "You can move again." |
| `AFF_BERSERK` | `1n << 33n` | "berserk" | "Your blood rage fades." |

- **`getAffectDefinition(sn: number): AffectDefinition | null`** — Look up affect metadata by spell number.
- **`getAffectByBitvector(bit: bigint): AffectDefinition | null`** — Look up by AFF flag.
- **`getWearOffMessage(sn: number): string`** — Return the wear-off message for a spell.

### 8. `src/game/affects/StatModifier.ts` — Stat Modification Tables

Implement all attribute bonus tables. Replicates legacy `str_app`, `int_app`, `wis_app`, `dex_app`, `con_app`, `cha_app`, `lck_app` from `const.c`:

- **`getIntLearnRate(int_stat: number): number`** — Return learning rate bonus from INT:
  ```
  INT  1-8:   3      INT  9-11:  5      INT 12-14:  7
  INT 15-17:  9      INT 18-19: 11      INT 20-21: 13
  INT 22-24: 15      INT 25:    17
  ```

- **`getIntManaPer(int_stat: number): number`** — Return mana bonus per level from INT:
  ```
  INT  1-5:   0      INT  6-8:   1      INT  9-11:  2
  INT 12-14:  3      INT 15-17:  4      INT 18-19:  5
  INT 20-21:  6      INT 22-24:  8      INT 25:    10
  ```

- **`getWisPractice(wis_stat: number): number`** — Return practice bonus from WIS:
  ```
  WIS  1-8:   0      WIS  9-11:  1      WIS 12-14:  1
  WIS 15-17:  2      WIS 18-19:  2      WIS 20-21:  3
  WIS 22-24:  4      WIS 25:     5
  ```

- **`getConHpPer(con_stat: number): number`** — Return HP bonus per level from CON:
  ```
  CON  1:    -4      CON  2-3:  -2      CON  4-5:  -1
  CON  6-7:   0      CON  8-13:  0      CON 14-15:  1
  CON 16-17:  2      CON 18-19:  3      CON 20-21:  4
  CON 22-24:  5      CON 25:     6
  ```

- **`getConShock(con_stat: number): number`** — Return shock survival percentage:
  ```
  CON  1:    20      CON  2-3:  30      CON  4-7:  40
  CON  8-13: 75      CON 14-17: 90      CON 18-24: 99
  CON 25:   100
  ```

- **`getChaShopMod(cha_stat: number): number`** — Return shop price modifier (percentage):
  ```
  CHA  1-5:  125     CHA  6-8:  115     CHA  9-11: 110
  CHA 12-14: 105     CHA 15-17: 100     CHA 18-19:  95
  CHA 20-22:  90     CHA 23-24:  85     CHA 25:     80
  ```

- **`getLckModifier(lck_stat: number): number`** — Return luck modifier (added to various random rolls):
  ```
  LCK  1-4:  -3      LCK  5-7:  -2      LCK  8-10: -1
  LCK 11-14:  0      LCK 15-17:  1      LCK 18-20:  2
  LCK 21-23:  3      LCK 24-25:  4
  ```

- **`applyStatModifier(ch, location, modifier)`** — Apply a stat modification to a character. Switch on `ApplyType`:
  - `ApplyType.Str` through `ApplyType.Lck`: Modify `ch.modStats.*`.
  - `ApplyType.Hit`: Modify `ch.maxHit`.
  - `ApplyType.Mana`: Modify `ch.maxMana`.
  - `ApplyType.Move`: Modify `ch.maxMove`.
  - `ApplyType.Ac`: Modify `ch.armor`.
  - `ApplyType.Hitroll`: Modify `ch.hitroll`.
  - `ApplyType.Damroll`: Modify `ch.damroll`.
  - `ApplyType.SavePoison` through `ApplyType.SaveSpell`: Modify respective save fields.
  - `ApplyType.Affect`: Set/clear AFF bitvector bit.
  - `ApplyType.Resistant`/`Immune`/`Susceptible`: Set/clear RIS bitvector bit.
  - `ApplyType.WearSpell`: Cast a spell when equipped.
  - `ApplyType.RemoveSpell`: Cast a spell when unequipped.

---

## Wiring and Integration

### EventBus Events to Emit
- `GameEvent.SpellCast` — `{ casterId, spellId, targetId, success, spellName }` — Emitted after any successful or failed spell cast.
- `GameEvent.SpellFizzle` — `{ casterId, spellId }` — Emitted when proficiency check fails.
- `GameEvent.AffectApplied` — `{ characterId, affectType, duration, modifier }` — Emitted when an affect is applied.
- `GameEvent.AffectRemoved` — `{ characterId, affectType }` — Emitted when an affect expires or is stripped.
- `GameEvent.AffectTick` — `{ characterId, affectType }` — Emitted for periodic effects (poison damage, etc.).

### TickEngine Wiring
- `affectUpdate()` → `EventBus.on(GameEvent.FullTick)` — Decrement affect durations, handle expiry.
- Poison periodic damage → Inside `affectUpdate()`, not a separate timer.

### Command Registration
Register all commands in `CommandRegistry`:
```typescript
{ name: 'cast',      fun: doCast,      position: POS_FIGHTING, level: 0, log: LOG_NORMAL, flags: 0 }
{ name: 'brandish',  fun: doBrandish,  position: POS_RESTING,  level: 0, log: LOG_NORMAL, flags: 0 }
{ name: 'zap',       fun: doZap,       position: POS_RESTING,  level: 0, log: LOG_NORMAL, flags: 0 }
{ name: 'quaff',     fun: doQuaff,     position: POS_RESTING,  level: 0, log: LOG_NORMAL, flags: 0 }
{ name: 'recite',    fun: doRecite,    position: POS_RESTING,  level: 0, log: LOG_NORMAL, flags: 0 }
{ name: 'practice',  fun: doPractice,  position: POS_SLEEPING, level: 0, log: LOG_NORMAL, flags: 0 }
```

---

## Tests for Sub-Phase 3I

### `tests/unit/spells/SpellEngine.test.ts`
- **Casting pipeline validation:**
  - Test step 1: no argument → "Cast which what where?"
  - Test step 2: unknown spell → "You don't know any spells by that name."
  - Test step 3: unlearned spell → "You have not learned that spell."
  - Test step 4: wrong position → "You can't concentrate enough."
  - Test step 5: ROOM_NO_MAGIC → "You failed."
  - Test step 8: insufficient mana → "You don't have enough mana."
  - Test step 9: offensive target not found → "They aren't here."
  - Test step 9: defensive no arg → defaults to self
  - Test step 11: proficiency failure → "You lost your concentration." + half mana deducted
  - Test step 14: successful cast → mana deducted, spell function called, learning triggered
- **`castSpell()` tests:** Verify no mana cost, no proficiency check, spell executes directly.
- **Target resolution tests:** Each `TargetType` case with valid and invalid inputs.

### `tests/unit/spells/SpellRegistry.test.ts`
- Spell lookup by prefix: "fire" matches "fireball", "fir" matches "fireball".
- Level requirements per class: mage can learn fireball at 25, cleric cannot.
- Damage formula verification: fireball at level 25 produces expected damage range.
- All 40+ spells registered and accessible.
- `getSpellsForClass()` returns correct list for mage level 10 vs level 30.

### `tests/unit/spells/SavingThrows.test.ts`
- Save chance at equal level: 50% base (minus save modifier).
- Clamping: never below 5%, never above 95%.
- Level difference: +5 per victim level above.
- RIS: immune → auto-save, resistant → easier, susceptible → harder.
- All 5 save types use correct character field.

### `tests/unit/spells/ComponentSystem.test.ts`
- `V####` component: found/not found in inventory.
- `K<word>` component: keyword match on inventory item.
- `G####` component: gold check pass/fail.
- `H####` component: HP check pass/fail (and HP deduction on consume).
- `+` prefix: check but don't consume.
- `!` prefix: negation logic (fail if has item).
- `consumeComponents()` removes items and gold correctly.

### `tests/unit/commands/magic.test.ts`
- `doCast('fireball goblin')`: damage dealt, mana deducted, combat initiated.
- `doQuaff('potion')`: 3 spell effects applied, potion destroyed.
- `doZap('wand goblin')`: wand charges decremented, spell cast on target.
- `doBrandish()`: staff spell cast on all valid targets in room.
- `doRecite('scroll self')`: scroll spells applied, scroll destroyed. Skill check for scrolls proficiency.
- `doPractice()` with no arg: lists all skills with percentages.
- `doPractice('fireball')`: learned percentage increases by INT-based learn rate, costs 1 practice.
- `doPractice('fireball')` when already adept: "You are already an adept."
- `doPractice('fireball')` with no practice mob: "You can't do that here."

### `tests/unit/affects/AffectManager.test.ts`
- `addAffect()`: stat modifier applied correctly (e.g., +2 STR → ch.modStats.str increases by 2).
- `addAffect()`: bitvector flag set on character (e.g., AFF_INVISIBLE set on ch.affectedBy).
- `removeAffect()`: stat modifier reversed. Bitvector cleared only if no other affect sets it.
- `stripAffects()`: all affects of a type removed.
- `joinAffect()`: existing affect's duration extended, modifier stacked.
- `affectUpdate()`: duration decrements each tick. At 0, wear-off message sent, affect removed.
- Permanent affects (duration -1): never decrement.
- Poison periodic: damage dealt each tick, damage is `2d4`.
- AFF_SLEEP side effect: position set to sleeping.
- AFF_FLYING removal in air sector: fall damage applied.
- Multiple affects setting same AFF flag: removing one doesn't clear flag if other remains.

### `tests/unit/affects/StatModifier.test.ts`
- `getIntLearnRate(18)` returns 11.
- `getConHpPer(18)` returns 3.
- `getChaShopMod(25)` returns 80.
- `getLckModifier(14)` returns 0.
- `applyStatModifier()` correctly modifies all stat types.
- All tables have entries for values 1 through 25.

### `tests/integration/SpellCombat.test.ts`
- Cast `fireball` at a mob: verify damage dealt (within formula range), saving throw halves damage (test with mock RNG), mana deducted by correct amount, proficiency may improve (test with mock RNG).
- Cast `sanctuary` on self: verify `AFF_SANCTUARY` flag set. Then take damage: verify damage is halved.
- Cast `blindness` at mob: saving throw may resist. On success: `AFF_BLIND` flag set, hitroll reduced.
- Affect expires after duration ticks: simulate multiple `affectUpdate()` calls, verify affect removed and wear-off message sent.
- Cast `cure blindness` on blinded character: `AFF_BLIND` removed, "Your vision returns!"
- Quaff potion with 3 spells: all 3 effects applied.
- Dispel magic on buffed target: one random buff removed.
- Enchant weapon: hitroll/damroll modifiers added to weapon. Second enchant: higher failure chance.

---

## Acceptance Criteria

- [ ] `cast 'magic missile' goblin` deals damage, deducts mana, and initiates combat.
- [ ] Casting with insufficient mana shows "You don't have enough mana."
- [ ] Failed proficiency check: "You lost your concentration." — half mana deducted, no effect.
- [ ] `cast 'sanctuary'` applies the `AFF_SANCTUARY` flag and halves incoming damage in combat.
- [ ] `cast 'blindness' goblin` — saving throw may resist. On failure, applies `AFF_BLIND` with hitroll penalty.
- [ ] Affect durations decrement each tick. Expiry message shown when duration reaches 0.
- [ ] Permanent affects (duration -1) never expire.
- [ ] `cast 'cure blindness'` strips the `AFF_BLIND` affect and restores vision.
- [ ] Poison periodic damage: `2d4` per tick while `AFF_POISON` is active.
- [ ] `quaff potion` applies up to 3 spell effects and destroys the potion object.
- [ ] `zap wand goblin` decrements wand charges and casts spell on target.
- [ ] `brandish` uses staff to cast spell on all valid targets in room.
- [ ] `recite scroll self` applies scroll spells with proficiency check on `gsn_scrolls`.
- [ ] `practice` with no arg lists all known spells/skills with percentages.
- [ ] `practice 'fireball'` at a trainer increases learned percentage by INT-based rate. Costs 1 practice session.
- [ ] Already at adept: `practice 'fireball'` shows "You are already an adept."
- [ ] `dispel magic` removes one random buff from the target (saving throw to resist).
- [ ] `enchant weapon` adds hitroll/damroll affects. Failure may destroy weapon.
- [ ] `identify` displays complete object stats (type, values, affects, weight, cost, spells).
- [ ] `gate` creates a portal object leading to target player's location.
- [ ] `create food` creates a food object in the room.
- [ ] Area spells (earthquake) damage all non-grouped characters in room.
- [ ] `call lightning` requires outdoor + stormy weather.
- [ ] Equipment affects apply when equipped and remove when unequipped (via `applyStatModifier`).
- [ ] Sanctuary + poison: sanctuary halves combat damage, poison deals periodic tick damage independently.
- [ ] AFF_FLYING removal in air sector causes fall damage.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
