# SMAUG 2.0 TypeScript Port — Phase 3H: Core Combat System

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

**Sub-Phases 3A–3G** are complete. The following files are fully implemented and may be imported:

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

### Sub-Phase 3G (Look, Perception, Room Rendering)
- `src/game/perception/VisibilityManager.ts` — `canSeeChar()`, `canSeeObj()`, `roomIsDark()`, `roomIsLit()`, `canSeeRoom()`, `checkBlind()`, `getConditionString()`
- `src/game/perception/RoomRenderer.ts` — `renderRoom()`, `renderExits()`, `renderRoomObjects()`, `renderRoomCharacters()`, `renderCharacterShort()`
- `src/game/perception/CharacterInspection.ts` — `inspectCharacter()`, `doGlance()`
- `src/game/perception/ObjectInspection.ts` — `inspectObject()`, `examineObject()`
- `src/game/perception/ExtraDescriptions.ts` — `matchExtraDescription()`, `lookAtDirection()`, `lookUnder()`, `lookInside()`
- `src/game/perception/LightManager.ts` — `addLight()`, `removeLight()`, `lightSourceUpdate()`, enter/leave room handlers
- `src/game/perception/SunlightCycle.ts` — `updateSunlight()`, `getSunPosition()`, `SunPosition` enum

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3H Objective

Implement the complete core combat system as a standalone, deeply detailed module. This sub-phase extracts and fully specifies the combat engine, damage calculation, hit/miss resolution, multi-attack logic, death handling, corpse creation, XP awards, and all combat commands that were initially outlined in Sub-Phase 3B. After this sub-phase, the full combat loop — from initiating combat through violence rounds to death and loot — is pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/combat/CombatEngine.ts` — Violence Loop and Attack Resolution

Implement the full combat engine. Replicates legacy `violence_update()` and `multi_hit()` from `fight.c`:

- **`violenceUpdate()`** — Called every `PULSE_VIOLENCE` (12 pulses = 3 seconds). Iterates the global character list. For every character currently fighting:
  1. **Pre-checks:** If `ch.fighting` is `null`, skip. If `ch.fighting.inRoom !== ch.inRoom` (opponent left), call `stopFighting(ch, false)` and skip. If `ch.position` <= `POS_STUNNED`, skip (stunned characters cannot attack).
  2. **Wait state:** If `ch.wait > 0`, decrement and skip the attack (command lag from skills).
  3. **Affect tick during combat:** Decrement all affect durations on `ch` by 1. If an affect expires (`duration === 0`), send the affect's wear-off message and remove it. Affects with `duration < 0` are permanent and never decrement. This replicates the legacy behavior where affect durations tick during combat rounds (in addition to the full-tick decrement).
  4. **Execute combat round:** Call `multiHit(ch, ch.fighting, TYPE_UNDEFINED)` where `TYPE_UNDEFINED = -1` indicates a standard weapon attack.
  5. **Post-round checks:** If `ch` or victim died (check `charDied()`), stop processing. If victim is still alive, check for auto-assist: iterate `ch.inRoom.characters` for group members of `ch` who are not already fighting. If they have `autoAssist` enabled (default for group members), call `multiHit(assistor, victim, TYPE_UNDEFINED)` to join the fight.
  6. **Fighting prompt:** After each round, send the combat prompt to both `ch` and victim showing current HP/mana/move and opponent's condition.

- **`multiHit(ch, victim, dt)`** — Determine number of attacks and execute each. Replicates legacy `multi_hit()` (`fight.c`). The `dt` parameter is the damage type / skill number (`-1` = default weapon):
  1. **Sanity checks:** If `ch` or `victim` is null, or either has no `inRoom`, return. If `charDied(ch)` or `charDied(victim)`, return.
  2. **NPC specfun:** If `ch` is NPC with a special function (`ch.specFun`), call it. If it returns `true`, the specfun handled the round — return without further attacks.
  3. **Main hand attack:** Call `oneHit(ch, victim, dt)`. If `charDied(victim)`, return.
  4. **Dual wield attack:** If `ch` has a weapon in `WEAR_DUAL_WIELD` slot AND `ch` has the `dual_wield` skill:
     - Roll proficiency check against `gsn_dual_wield`. If passes: call `oneHit(ch, victim, dt)`. If fails: `learn_from_failure(ch, gsn_dual_wield)`.
     - If `charDied(victim)`, return.
  5. **Second attack:** If `ch` has `gsn_second_attack` skill AND proficiency check passes (random percent < learned percentage): call `oneHit(ch, victim, dt)`. If `charDied(victim)`, return.
  6. **Third attack:** If `ch` has `gsn_third_attack` skill AND proficiency check passes: call `oneHit(ch, victim, dt)`. If `charDied(victim)`, return.
  7. **Fourth attack:** NPCs only, or warriors/rangers level 40+. If `ch` has `gsn_fourth_attack` AND passes: call `oneHit(ch, victim, dt)`. If `charDied(victim)`, return.
  8. **Fifth attack:** NPCs only (with `ACT_EXTRA_ATTACK` flag). If `ch` has `gsn_fifth_attack` AND passes: call `oneHit(ch, victim, dt)`. If `charDied(victim)`, return.
  9. **Haste bonus:** If `ch` has `AFF_HASTE`, call `oneHit(ch, victim, dt)` for one additional attack. If `charDied(victim)`, return.
  10. **NPC `numAttacks`:** If `ch` is NPC and `ch.numAttacks > 0`, execute up to `ch.numAttacks` additional attacks beyond the base. For each: call `oneHit(ch, victim, dt)`. If `charDied(victim)`, return.
  11. **Retort/Riposte/Counterattack:** After all attacks, if `victim` has `gsn_riposte` skill and passes proficiency:
     - Execute a single retaliatory `oneHit(victim, ch, TYPE_UNDEFINED)`.
     - This replicates the legacy retort mechanic.

- **`oneHit(ch, victim, dt)`** — Single attack roll. Replicates legacy `one_hit()` (`fight.c`). Returns a `CombatResult`:
  1. **Pre-checks:** If `ch` or `victim` is in `POS_DEAD`, return miss. If `ch.inRoom !== victim.inRoom`, return miss.
  2. **Weapon selection:** Get wielded weapon from `ch.equipment.get(WEAR_WIELD)`. If `dt === TYPE_UNDEFINED`, determine attack type from weapon. If no weapon, use bare-hand attack type `TYPE_HIT`.
  3. **Weapon proficiency bonus:** If `ch` has the weapon-type skill (e.g., `gsn_swords` for a sword), apply a proficiency bonus to the hit roll. If proficiency < 50%, penalty to hit.
  4. **THAC0 calculation:** Replicates legacy class-specific THAC0 tables:
     ```
     Mage:    20 - (level * 2/3)
     Cleric:  20 - (level * 3/4)
     Thief:   20 - (level * 3/4)
     Warrior: 20 - level
     Ranger:  20 - level
     Druid:   20 - (level * 3/4)
     Augurer:  20 - (level * 2/3)
     Vampire: 20 - level
     ```
     For NPCs: `ch.mobThac0` (stored on prototype). Subtract `ch.hitroll` from THAC0. Subtract strength-based hit bonus (from `str_app` table). Subtract weapon proficiency bonus.
  5. **Victim AC:** Calculate effective AC: `Math.max(-15, victim.armor / 10)`. Apply dexterity-based AC bonus from `dex_app` table.
  6. **Hit roll:** Roll `numberRange(1, 20)`. If roll === 1, automatic miss. If roll === 20, automatic hit. Otherwise, hit if `roll >= thac0 - victimAC`.
  7. **Miss handling:** If missed, call `inflictDamage(ch, victim, 0, dt)` (which displays the miss message) and return. Call `learn_from_failure()` for weapon proficiency if applicable.
  8. **Damage calculation:**
     - **Weapon damage:** `rollDice(weapon.values[1], weapon.values[2])` (number of dice, dice size). If bare hands: `rollDice(1, ch.barehanded)` where `barehanded` is level-based (1 at level 1, up to `1d12` at level 50).
     - **Damroll bonus:** Add `ch.damroll`.
     - **Strength bonus:** Add strength-based damage bonus from `str_app` table:
       ```
       STR 1-5:   0
       STR 6-7:   1
       STR 8-11:  2
       STR 12-15: 3
       STR 16-17: 4
       STR 18:    5
       STR 19-20: 6
       STR 21-22: 7
       STR 23-24: 8
       STR 25:    14 (superhuman)
       ```
     - **Enhanced damage skill:** If `ch` has `gsn_enhanced_damage` and proficiency check passes, add `dam * (learned / 100)` (up to double damage at 100% proficiency). Call `learn_from_success()`.
     - **Backstab multiplier:** If `dt === gsn_backstab`, multiply by backstab level multiplier:
       ```
       Level 1-7:    2×
       Level 8-15:   3×
       Level 16-25:  4×
       Level 26-35:  5×
       Level 36+:    6×
       ```
     - **Circle multiplier:** If `dt === gsn_circle`, multiply by `2×` (fixed).
     - **Critical hit:** If natural 20, double the final damage.
  9. **Damage modifiers (applied in order):**
     - **Sanctuary:** If victim has `AFF_SANCTUARY`, halve damage: `dam = Math.floor(dam / 2)`.
     - **Protect Evil/Good:** If victim has `AFF_PROTECT_EVIL` and `ch` is evil, reduce by `dam / 4`. If `AFF_PROTECT_GOOD` and `ch` is good, reduce by `dam / 4`.
     - **Shield block:** If victim has `gsn_shield_block` skill and has a shield equipped and proficiency check passes, reduce by `dam / 4`. Display: `"You block $N's attack with your shield."`
     - **Immune/Resistant/Susceptible (RIS):** Check `victim.immune`, `victim.resistant`, `victim.susceptible` bitvectors against the weapon's damage type:
       - `Immune`: `dam = 0`.
       - `Resistant`: `dam = Math.floor(dam / 2)`.
       - `Susceptible`: `dam = Math.floor(dam * 2)`.
       - If both resistant AND susceptible, they cancel out (normal damage).
     - **Absorb:** If victim has `AFF_ABSORB` and damage is magic-type, convert damage to healing: `victim.hit += dam` (capped at `victim.maxHit`). Send "You absorb the energy!". Return.
     - **Minimum damage:** `dam = Math.max(0, dam)`.
  10. **Apply damage:** Call `inflictDamage(ch, victim, dam, dt)`.
  11. **Weapon proficiency learning:** On hit, call `learn_from_success(ch, weaponSkillGsn)`. On miss, call `learn_from_failure()`.
  12. **Poison weapon:** If weapon has `AFF_POISON` flag, roll saving throw. If victim fails, apply poison affect (`gsn_poison`, duration 20, modifier -2 to STR).
  13. **Weapon condition:** Reduce `weapon.condition` by 1 on each hit. If condition reaches 0, weapon breaks: `"Your {weapon.shortDescription} breaks apart!\n"`. Remove weapon. Drop to room. Deal half damage to wielder.

- **`inflictDamage(ch, victim, damage, dt)`** — Apply damage, display messages, handle death. Replicates legacy `damage()` (`fight.c`):
  1. **Guard checks:** If `victim.position === POS_DEAD`, return. If `damage > 0` and victim is not already fighting `ch`, and `victim.position > POS_STUNNED`, set `victim.fighting = ch` (auto-retaliate).
  2. **Damage cap:** If `damage > 1600`, log a warning and cap at 1600 (prevent exploit damage).
  3. **Room safe check:** If room has `ROOM_SAFE` flag, damage = 0, display "A magical force prevents combat here.", stop fighting both.
  4. **Apply damage:** `victim.hit -= damage`.
  5. **Display damage message:** Call `damageMessage(ch, victim, damage, dt)` which formats and sends the appropriate severity message to `ch`, `victim`, and the room.
  6. **Update position:** Call `victim.updatePosition()`:
     - `hit > 0`: no change (unless was stunned and now recovered → `POS_STANDING`).
     - `hit === 0`: `POS_STUNNED`.
     - `hit -1 to -3`: `POS_STUNNED`.
     - `hit -4 to -5`: `POS_INCAPACITATED`.
     - `hit -6 to -9`: `POS_MORTAL`.
     - `hit <= -10`: `POS_DEAD`.
  7. **Position messages to victim:**
     - `POS_MORTAL`: `"You are mortally wounded, and will die soon, if not aided.\n"`.
     - `POS_INCAPACITATED`: `"You are incapacitated and will slowly die, if not aided.\n"`.
     - `POS_STUNNED`: `"You are stunned, but will probably recover.\n"`.
  8. **Wimpy check:** If `victim` is a player and `victim.hit > 0` and `victim.hit <= victim.wimpy` and `victim.wait === 0`: call `doFlee(victim)` (auto-flee).
  9. **Death check:** If `victim.position === POS_DEAD`:
     - Call `deathHandler.handleDeath(ch, victim)`.
     - Return.
  10. **Opponent tracking:** If victim is NPC and victim survived, update `victim.hating` and `victim.hunting` to target `ch` (NPC will seek revenge later).
  11. **Combat start:** If `ch` is not fighting, call `startCombat(ch, victim)`.
  12. **Emit `GameEvent.CombatDamage`** with `{ attackerId, victimId, damage, damageType, skillName }`.

- **`damageMessage(ch, victim, damage, dt)`** — Format and send the damage/miss message. Replicates legacy `dam_message()` and the extensive severity table:
  1. Look up the skill/spell name from `dt`. If `dt === TYPE_UNDEFINED` or `dt === TYPE_HIT`, use the weapon's attack noun (e.g., "slash", "pound", "bite") from the weapon type table, or "hit" for bare hands.
  2. Determine severity descriptor from damage amount:
     ```
     0:           "miss"        / "misses"
     1-4:         "scratch"     / "scratches"
     5-8:         "graze"       / "grazes"
     9-14:        "hit"         / "hits"
     15-22:       "injure"      / "injures"
     23-32:       "wound"       / "wounds"
     33-44:       "maul"        / "mauls"
     45-58:       "decimate"    / "decimates"
     59-74:       "devastate"   / "devastates"
     75-99:       "maim"        / "maims"
     100-139:     "MUTILATE"    / "MUTILATES"
     140-199:     "DISEMBOWEL"  / "DISEMBOWELS"
     200-299:     "DISMEMBER"   / "DISMEMBERS"
     300-499:     "MASSACRE"    / "MASSACRES"
     500-749:     "MANGLE"      / "MANGLES"
     750-1199:    "*** DEMOLISH ***"    / "*** DEMOLISHES ***"
     1200-1599:   "*** ANNIHILATE ***"  / "*** ANNIHILATES ***"
     1600+:       "=== OBLITERATE ==="  / "=== OBLITERATES ==="
     ```
  3. Send three messages:
     - To attacker: `"Your {noun} {verb_s} {victim.name}! [{damage}]\n"` (damage number shown only if `ch` has `PLR_SHOWDAMAGE` flag).
     - To victim: `"{ch.name}'s {noun} {verb_s} you! [{damage}]\n"` (damage number if victim has `PLR_SHOWDAMAGE`).
     - To room: `"{ch.name}'s {noun} {verb_s} {victim.name}.\n"`.
  4. For misses: `"You miss {victim.name} with your {noun}.\n"` / `"{ch.name} misses you with $s {noun}.\n"` / `"{ch.name} misses {victim.name} with $s {noun}.\n"`.

- **`startCombat(ch, victim)`** — Initiate combat. Replicates legacy `set_fighting()` (`fight.c`):
  1. If `ch.fighting` is already set, return (already fighting).
  2. Set `ch.fighting = victim`.
  3. Set `ch.position = POS_FIGHTING`.
  4. If `victim.fighting === null`, set `victim.fighting = ch` (auto-retaliate).
  5. Emit `GameEvent.CombatStart` with `{ attackerId: ch.id, victimId: victim.id }`.
  6. Fire `FIGHT_PROG` on both `ch` and `victim` (MUDprog combat trigger).

- **`stopFighting(ch, fBoth)`** — End combat. Replicates legacy `stop_fighting()` (`fight.c`):
  1. Set `ch.fighting = null`.
  2. Set `ch.position = ch.defaultPosition` (usually `POS_STANDING`).
  3. If `fBoth` is `true`, iterate ALL characters in the game. For any character whose `fighting === ch`, set their `fighting = null` and reset their position.
  4. Emit `GameEvent.CombatEnd` with `{ characterId: ch.id }`.

- **`charDied(ch)`** — Check if character is dead or extracted. Returns `true` if `ch.hit <= -10` OR `ch.position === POS_DEAD` OR `ch.extracted === true`.

- Wire `violenceUpdate()` into `TickEngine` via `EventBus.on(GameEvent.ViolenceTick)`.

### 2. `src/game/combat/DamageCalculator.ts` — THAC0, Damage Bonus, and RIS Tables

Implement all combat calculation tables. Replicates legacy `str_app`, `dex_app`, class THAC0 tables, and RIS checking from `const.c` and `fight.c`:

- **`calcThac0(ch)`** — Return base THAC0 for `ch`. For PCs, use the class-specific formula (see table in `oneHit` above). For NPCs, use `ch.mobThac0` (from prototype). Apply hitroll and strength bonus as modifiers.

- **`getStrengthDamageBonus(str)`** — Return strength-based damage bonus. Replicates legacy `str_app[str].todam`:
  ```
  STR  1: -6    STR  2: -4    STR  3: -2    STR  4: -1    STR  5: 0
  STR  6: 0     STR  7: 0     STR  8: 1     STR  9: 1     STR 10: 1
  STR 11: 2     STR 12: 2     STR 13: 3     STR 14: 3     STR 15: 3
  STR 16: 4     STR 17: 4     STR 18: 5     STR 19: 6     STR 20: 6
  STR 21: 7     STR 22: 7     STR 23: 8     STR 24: 8     STR 25: 14
  ```

- **`getStrengthHitBonus(str)`** — Return strength-based hit bonus. Replicates legacy `str_app[str].tohit`:
  ```
  STR  1: -5    STR  2: -3    STR  3: -1    STR  4: 0     STR  5: 0
  STR  6: 0     STR  7: 0     STR  8: 0     STR  9: 0     STR 10: 0
  STR 11: 0     STR 12: 0     STR 13: 0     STR 14: 0     STR 15: 0
  STR 16: 1     STR 17: 1     STR 18: 1     STR 19: 2     STR 20: 2
  STR 21: 3     STR 22: 3     STR 23: 4     STR 24: 4     STR 25: 7
  ```

- **`getDexArmorBonus(dex)`** — Return dex-based AC improvement. Replicates legacy `dex_app[dex].defensive`:
  ```
  DEX  1: 60    DEX  2: 50    DEX  3: 40    DEX  4: 30    DEX  5: 20
  DEX  6: 10    DEX  7: 0     DEX  8: 0     DEX  9: 0     DEX 10: 0
  DEX 11: 0     DEX 12: 0     DEX 13: 0     DEX 14: -10   DEX 15: -15
  DEX 16: -20   DEX 17: -30   DEX 18: -40   DEX 19: -50   DEX 20: -60
  DEX 21: -75   DEX 22: -90   DEX 23: -105  DEX 24: -120  DEX 25: -150
  ```
  (Negative = better defense / lower AC.)

- **`getStrengthCarryBonus(str)`** — Return max carry weight modifier. Replicates legacy `str_app[str].carry`:
  ```
  STR  1: 30    STR  5: 70    STR 10: 120   STR 15: 170
  STR 18: 230   STR 20: 280   STR 23: 380   STR 25: 550
  ```

- **`checkRIS(victim, damageType)`** — Check Resistant/Immune/Susceptible. Replicates legacy `check_ris()` (`fight.c`). Map the weapon/spell damage type to a RIS bitvector bit:
  ```
  RIS_FIRE, RIS_COLD, RIS_ELECTRICITY, RIS_ENERGY, RIS_ACID,
  RIS_POISON, RIS_DRAIN, RIS_SLEEP, RIS_CHARM, RIS_NONMAGIC,
  RIS_MAGIC, RIS_PLUS1-6, RIS_BLUNT, RIS_PIERCE, RIS_SLASH,
  RIS_HOLY, RIS_UNHOLY, RIS_LASH, RIS_HACK
  ```
  Return a multiplier:
  - Immune AND Susceptible: 1.0 (cancel out).
  - Immune: 0.0.
  - Resistant AND Susceptible: 1.0 (cancel out).
  - Resistant: 0.5.
  - Susceptible: 2.0.
  - None: 1.0.

- **`getDamageMessage(damage)`** — Return `{ singular, plural }` severity descriptor pair based on damage amount. Uses the severity table from `damageMessage()` above.

- **`getWeaponAttackNoun(weaponType)`** — Return the attack noun for a weapon type. Replicates legacy `attack_table[]`:
  ```
  0:  "hit"        1:  "slice"      2:  "stab"       3:  "slash"
  4:  "whip"       5:  "claw"       6:  "blast"      7:  "pound"
  8:  "crush"      9:  "grep"       10: "bite"       11: "pierce"
  12: "suction"    13: "bolt"       14: "arrow"      15: "dart"
  16: "stone"      17: "pea"        18: "sting"      19: "chomp"
  ```

- **`getBackstabMultiplier(level)`** — Return backstab damage multiplier based on level:
  ```
  Level 1-7:    2
  Level 8-15:   3
  Level 16-25:  4
  Level 26-35:  5
  Level 36+:    6
  ```

### 3. `src/game/combat/DeathHandler.ts` — Death, Corpse, and XP

Implement the complete death pipeline. Replicates legacy `raw_kill()` and `xp_compute()` from `fight.c`:

- **`handleDeath(killer, victim)`** — Master death handler:
  1. **Stop all combat:** Call `stopFighting(victim, true)` to stop victim and everyone fighting victim.
  2. **Cancel affects:** Remove all affects from victim. Clear `AFF_CHARM`, `AFF_POISON`, `AFF_SLEEP`, etc.
  3. **MUDprog DEATH_PROG:** Fire `DEATH_PROG` on victim if NPC. If the prog sets `global_retcode === rCHAR_DIED`, return immediately (prog handled the death).
  4. **Create corpse:** Call `makeCorpse(victim)`. 
  5. **Player death branch:**
     - Emit `GameEvent.CharacterDeath` with `{ victimId, killerId, wasPC: true }`.
     - XP penalty: Lose `xpToNextLevel(victim) / 3` XP (one-third of current level progress). Minimum 0 XP (never go below level threshold).
     - Deity favor: If victim worships a deity, lose `deity.susChance` favor.
     - If victim is `PKILL` enabled and killer is also `PKILL`, increment `victim.pcData.pDeaths` and `killer.pcData.pKills`. Update clan PK records.
     - Teleport victim to altar/recall room: Determine recall room from clan, race, or default (vnum 3001). Move victim to that room.
     - Restore: Set `victim.hit = 1`, `victim.mana = 1`, `victim.move = 1`. Set `victim.position = POS_RESTING`.
     - Remove all equipment flags that would prevent re-equipping.
     - Send messages: `"You have been KILLED!!\n\n"` to victim.
     - Save character immediately: `PlayerRepository.savePlayer(victim)`.
  6. **NPC death branch:**
     - Emit `GameEvent.CharacterDeath` with `{ victimId, killerId, wasPC: false }`.
     - Award XP to killer: Call `awardXp(killer, victim)`.
     - If killer is grouped, split XP among group: Call `groupXpSplit(killer, victim)`.
     - Increment `victim.prototype.killed`.
     - Extract mobile: Remove from room, remove from global character list, decrement `prototype.count`. Clean up all references.
  7. **Autogold / Autoloot:** If `killer` is a player:
     - If `killer` has `PLR_AUTOLOOT` flag: automatically loot all items from corpse.
     - If `killer` has `PLR_AUTOGOLD` flag: automatically take gold from corpse.
     - If `killer` has `PLR_AUTOSAC` flag and corpse is empty after looting: sacrifice the corpse automatically.

- **`makeCorpse(victim)`** — Create a corpse object. Replicates legacy `make_corpse()` (`fight.c`):
  1. Create a new `GameObject` instance:
     - `name`: `"corpse {victim.name}"`.
     - `shortDescription`: `"the corpse of {victim.shortDescription}"`.
     - `longDescription`: `"The corpse of {victim.shortDescription} is lying here."`.
     - `itemType`: `ITEM_CORPSE_NPC` (vnum-based) or `ITEM_CORPSE_PC`.
     - `wearFlags`: `0n` (cannot be worn).
     - `extraFlags`: `0n`.
     - `weight`: victim's carried weight.
  2. **Timer:** NPC corpse: `values[3] = 6` ticks. PC corpse: `values[3] = 25` ticks. Timer decremented by `objUpdate()` each tick; corpse decomposes when timer reaches 0.
  3. **Transfer inventory:** Move ALL objects from `victim.carrying` into the corpse's `contents`. Preserve the object chain.
  4. **Transfer equipment:** `unequip_char()` all worn items, then move into corpse.
  5. **Transfer gold:** Set `corpse.values[0] = victim.gold`, `corpse.values[1] = victim.silver`, `corpse.values[2] = victim.copper`. Zero out victim's currency.
  6. **Place corpse:** Add corpse to `victim.inRoom.contents`.
  7. Return the corpse object.

- **`awardXp(killer, victim)`** — Calculate and grant XP. Replicates legacy `xp_compute()` (`fight.c`):
  1. **Base XP:** From victim level using the XP table:
     ```
     Level 1:    25      Level 5:    125     Level 10:   400
     Level 15:   1000    Level 20:   2500    Level 25:   5000
     Level 30:   10000   Level 35:   20000   Level 40:   40000
     Level 45:   75000   Level 50:   150000
     ```
     For intermediate levels, interpolate linearly.
  2. **Level difference modifier:**
     - Victim higher than killer: `+5%` per level above.
     - Victim lower than killer: `-10%` per level below (minimum 5% of base).
  3. **Alignment bonus/penalty:**
     - Killer good, victim evil: `+20%`.
     - Killer evil, victim good: `+20%`.
     - Same alignment: `-20%`.
     - Neutral killing neutral: `+0%`.
  4. **NPC special modifiers:**
     - `ACT_SENTINEL` (doesn't move): `-25%` (easier target).
     - `ACT_AGGRESSIVE`: `+25%` (harder target).
     - `AFF_SANCTUARY` on victim: `+50%` (harder to kill).
     - `AFF_FIRESHIELD`/`SHOCKSHIELD`/`ICESHIELD`: `+10%` each.
  5. **Minimum XP:** 1 (always get at least 1 XP for a kill).
  6. **Maximum XP:** `victim.level * 500` (prevent exploits).
  7. Call `killer.gainXp(xp)` to apply the XP gain.

- **`groupXpSplit(killer, victim)`** — Split XP among group. Replicates legacy group XP split:
  1. Count group members in the same room who are alive.
  2. Calculate total XP as above.
  3. Apply group bonus: `+10%` per additional member (up to `+50%`).
  4. Split: each member gets `totalXp / memberCount`.
  5. Level cap: members more than 8 levels below the highest group member get `50%` XP.
  6. Call `member.gainXp(share)` for each group member.

### 4. `src/game/commands/combat.ts` — Combat Command Handlers

Implement all combat-related player commands:

- **`doKill(ch, arg)`** — Initiate combat with an NPC. Replicates legacy `do_kill()`:
  1. If no argument: `"Kill whom?\n"`. Return.
  2. Find target in room with `getCharRoom(ch, arg)`. If not found: `"They aren't here.\n"`. Return.
  3. If target is self: `"You hit yourself. Ouch!\n"`. Deal 5 damage to self. Return.
  4. If `ch.fighting !== null`: `"You are already fighting!\n"`. Return.
  5. If target is a player: `"You must MURDER players.\n"`. Return (use `murder` for PvP).
  6. If target is a shopkeeper (`ACT_SHOPKEEPER`): `"A shopkeeper?? That might not be wise...\n"` (warning but allow).
  7. Call `startCombat(ch, target)`. Call `multiHit(ch, target, TYPE_UNDEFINED)`.

- **`doMurder(ch, arg)`** — Initiate PvP combat. Replicates legacy `do_murder()`:
  1. Same target lookup as `doKill`.
  2. If target is NPC, just call `doKill(ch, arg)` instead.
  3. If `ch` is NOT `PKILL` enabled: `"You must be PK-enabled to murder players.\n"`. Return.
  4. If target is NOT `PKILL` enabled: `"That player is not PK-enabled.\n"`. Return.
  5. If room has `ROOM_SAFE` flag: `"A magical force prevents combat here.\n"`. Return.
  6. If `ch.level - target.level > 10` or `target.level - ch.level > 10`: `"That is not a fair fight.\n"`. Return (PK level range restriction).
  7. Announce: `"Help! {ch.name} is attacking me!\n"` (yelled by victim).
  8. Call `startCombat(ch, target)`. Call `multiHit(ch, target, TYPE_UNDEFINED)`.

- **`doFlee(ch)`** — Flee from combat. Replicates legacy `do_flee()` (`act_move.c`):
  1. If `ch.fighting === null`: `"You aren't fighting anyone.\n"`. Return.
  2. Attempt up to 3 times to find a random valid exit:
     - Pick a random direction (0–5).
     - Check if exit exists, is not closed, and destination room is safe to enter.
  3. On success:
     - Call `stopFighting(ch, true)`.
     - Deduct XP: `numberRange(ch.level * 5, ch.level * 25)`.
     - Move character to the exit room (use `moveChar()` without movement cost).
     - Send: `"You flee from combat!\n"` to `ch`.
     - Send: `"{ch.name} has fled!\n"` to old room.
  4. On failure (no valid exit found in 3 attempts): `"PANIC! You couldn't escape!\n"`.
  5. If victim was an NPC, set NPC's `hating` to track `ch` and `hunting` to pursue.

- **`doWimpy(ch, arg)`** — Set auto-flee threshold. Replicates legacy `do_wimpy()`:
  1. If no argument: display current wimpy setting.
  2. Parse number. Validate: 0 ≤ wimpy ≤ `ch.maxHit / 2`.
  3. Set `ch.wimpy = wimpy`.
  4. Display: `"Wimpy set to {wimpy} hit points.\n"`.

- **`doRescue(ch, arg)`** — Rescue a groupmate. Replicates legacy `do_rescue()`:
  1. If `ch.fighting === null`: `"You aren't fighting anyone!\n"`. Return.
  2. Find target in room. Target must be in `ch`'s group.
  3. If target is not being attacked by someone: `"{target.name} doesn't need rescuing.\n"`. Return.
  4. Skill check: `gsn_rescue`. If fails: `"You fail the rescue!\n"`. Apply lag. Return.
  5. On success: Find the character attacking `target` (call it `attacker`). Set `attacker.fighting = ch`. Set `ch.fighting = attacker`.
  6. Send: `"You rescue {target.name}!\n"` / `"{ch.name} rescues you!\n"` / `"{ch.name} rescues {target.name}!\n"`.
  7. Apply lag: `WAIT_STATE(ch, skill.beats)`.

- **`doKick(ch, arg)`** — Kick combat skill. Replicates legacy `do_kick()`:
  1. Position check: must be fighting. If `ch.fighting === null` and no arg: `"You aren't fighting anyone.\n"`.
  2. Target: `ch.fighting` or find by arg.
  3. Skill check: `gsn_kick`. If fail: `inflictDamage(ch, victim, 0, gsn_kick)` (miss message). Apply lag.
  4. On success: Damage = `numberRange(1, ch.level)`. Call `inflictDamage(ch, victim, damage, gsn_kick)`.
  5. Lag: `WAIT_STATE(ch, skill.beats)` (typically `1.5 * PULSE_VIOLENCE`).
  6. Call `learn_from_success()` or `learn_from_failure()`.

- **`doBash(ch, arg)`** — Bash combat skill. Replicates legacy `do_bash()`:
  1. Must be fighting or target specified.
  2. If `ch.position === POS_EVASIVE` or `POS_DEFENSIVE`: `"You can't bash while in a defensive stance!\n"`. Return.
  3. Skill check: `gsn_bash`. Modifiers: +bonus for strength advantage, -penalty for size disadvantage.
  4. On success: Damage = `numberRange(1, ch.level)`. Call `inflictDamage(ch, victim, damage, gsn_bash)`. Set `victim.position = POS_SITTING`. Apply lag to victim: `WAIT_STATE(victim, 2 * PULSE_VIOLENCE)`. Display: `"You slam into {victim.name}, sending them sprawling!\n"`.
  5. On failure: `ch.position = POS_SITTING`. `WAIT_STATE(ch, 2 * PULSE_VIOLENCE)`. Display: `"You fall flat on your face!\n"`.
  6. Lag: `WAIT_STATE(ch, skill.beats)`.

- **`doTrip(ch, arg)`** — Trip combat skill. Replicates legacy `do_trip()`:
  1. Must be fighting.
  2. Skill check: `gsn_trip`. Cannot trip flying targets (`AFF_FLYING`).
  3. On success: `victim.position = POS_SITTING`. Damage = `numberRange(1, ch.level / 2)`. `WAIT_STATE(victim, PULSE_VIOLENCE)`. Display: `"You trip {victim.name} and they go down!\n"`.
  4. On failure: `ch.position = POS_SITTING`. Display: `"You try to trip {victim.name} but stumble!\n"`.

- **`doBackstab(ch, arg)`** — Backstab thief skill. Replicates legacy `do_backstab()`:
  1. If no arg: `"Backstab whom?\n"`.
  2. Target must NOT already be fighting (must be unaware). If `victim.fighting`: `"You can't backstab someone who is already fighting!\n"`.
  3. Must have a piercing weapon equipped (`weapon.values[3]` must be `2` — stab damage type, or `11` — pierce).
  4. Skill check: `gsn_backstab`.
  5. On success: Call `multiHit(ch, victim, gsn_backstab)`. The `dt` parameter causes `oneHit()` to apply the backstab multiplier.
  6. On failure: `inflictDamage(ch, victim, 0, gsn_backstab)`. Initiates combat.
  7. Lag: `WAIT_STATE(ch, 2 * skill.beats)`.

- **`doCircle(ch, arg)`** — Circle thief skill. Replicates legacy `do_circle()`:
  1. Must be fighting (`ch.fighting !== null`).
  2. Must have someone else tanking (i.e., `victim.fighting !== ch`). If victim is fighting `ch`: `"You can't circle when you're the one being attacked!\n"`.
  3. Must have a piercing weapon.
  4. Skill check: `gsn_circle`.
  5. On success: Call `oneHit(ch, victim, gsn_circle)`. Circle multiplier (2×) applied in `oneHit()`.
  6. On failure: miss message.
  7. Lag: `WAIT_STATE(ch, 2 * skill.beats)`.

- **`doDisarm(ch, arg)`** — Disarm opponent. Replicates legacy `do_disarm()`:
  1. Must be fighting.
  2. Target must be wielding a weapon. If not: `"{victim.name} isn't wielding a weapon!\n"`.
  3. Attacker must be wielding a weapon (or have `gsn_bare_hand_fighting`).
  4. Skill check: `gsn_disarm`. Modifiers: weapon weight comparison (`ch` weapon lighter = harder), level difference bonus/penalty.
  5. On success: Unequip `victim`'s weapon. Drop to room. Display: `"You disarm {victim.name}!\n"` / `"{ch.name} DISARMS you!\n"`.
  6. On failure: Display: `"You fail to disarm {victim.name}.\n"`.
  7. Lag: `WAIT_STATE(ch, skill.beats)`.

- **`doGouge(ch, arg)`** — Gouge eyes. Replicates legacy `do_gouge()`:
  1. Must be fighting.
  2. Skill check: `gsn_gouge`.
  3. On success: Apply `AFF_BLIND` affect to victim for `numberRange(1, ch.level / 10)` rounds. Damage = `numberRange(5, ch.level)`. Display: `"You gouge at {victim.name}'s eyes!\n"`.
  4. On failure: miss.
  5. Lag: `WAIT_STATE(ch, skill.beats)`.

- **`doBite(ch, arg)`** — Vampire bite. Replicates legacy `do_bite()`:
  1. Race check: must be vampire or have `gsn_bite` skill.
  2. Must be fighting or target specified.
  3. Skill check: `gsn_bite`.
  4. On success: Damage = `numberRange(1, ch.level * 2)`. HP drain: `ch.hit += damage / 4` (capped at `ch.maxHit`). Call `inflictDamage(ch, victim, damage, gsn_bite)`.
  5. On failure: miss.
  6. Lag: `WAIT_STATE(ch, skill.beats)`.

- **`doClaw(ch, arg)`** — Racial claw attack. Replicates legacy `do_claw()`:
  1. Race check: must have `gsn_claw` racial skill.
  2. Skill check: `gsn_claw`.
  3. On success: Damage = `numberRange(1, ch.level * 3 / 2)`. Call `inflictDamage(ch, victim, damage, gsn_claw)`.
  4. On failure: miss.

- **`doTail(ch, arg)`** — Racial tail attack. Replicates legacy `do_tail()`:
  1. Race check: must have `gsn_tail` racial skill.
  2. Skill check: `gsn_tail`.
  3. On success: Damage = `numberRange(1, ch.level)`. Set `victim.position = POS_SITTING` (swept off feet). Call `inflictDamage(ch, victim, damage, gsn_tail)`.
  4. On failure: miss.

- **`doStun(ch, arg)`** — Stun combat skill. Replicates legacy `do_stun()`:
  1. Must be fighting.
  2. Skill check: `gsn_stun`.
  3. On success: `WAIT_STATE(victim, 2 * PULSE_VIOLENCE)`. Victim loses their next combat round. Display: `"You stun {victim.name}!\n"`.
  4. On failure: `WAIT_STATE(ch, PULSE_VIOLENCE)`. Display: `"You fail to stun {victim.name}.\n"`.

### 5. `src/game/entities/Character.ts` — Combat-Related Entity Methods (additions)

Add/extend the following methods on the `Character` class:

- **`updatePosition()`** — Update position based on HP. Replicates legacy `update_pos()` (`fight.c`):
  ```
  hit > 0:     no change (if was stunned, recover to POS_STANDING)
  hit === 0:   POS_STUNNED
  hit -1 to -3:  POS_STUNNED
  hit -4 to -5:  POS_INCAPACITATED
  hit -6 to -9:  POS_MORTAL
  hit <= -10:    POS_DEAD
  ```
  Recovery: If `hit > 0` and `position <= POS_STUNNED` and `position > POS_DEAD`, set `position = POS_STANDING` (character recovers from stun).

- **`isAffected(flag)`** — Check if `ch.affectedBy` bitvector has `flag` set. Uses `hasFlag(ch.affectedBy, flag)`.

- **`isEvil()`** — Return `ch.alignment < -350`.
- **`isGood()`** — Return `ch.alignment > 350`.
- **`isNeutral()`** — Return `!isEvil() && !isGood()`.

- **`getEffectiveArmor()`** — Return total armor class accounting for equipment, affects, and dexterity. Sum all `APPLY_AC` modifiers from equipment and affects. Add dex bonus from `getDexArmorBonus()`. Return total.

- **`getEquippedWeapon()`** — Return the weapon in `WEAR_WIELD` slot, or `null` for bare hands.

- **`getDualWeapon()`** — Return the weapon in `WEAR_DUAL_WIELD` slot, or `null`.

- **`getBareDamage()`** — Return bare-hand damage dice based on level:
  ```
  Level 1-5:    1d4
  Level 6-10:   1d6
  Level 11-20:  2d4
  Level 21-30:  2d6
  Level 31-40:  3d6
  Level 41-50:  4d6
  ```

- **`getCarriedWeight()`** — Sum weight of all carried objects.

- **`isInGroup(other)`** — Return `true` if `ch` and `other` are in the same group (either `ch.leader === other.leader` or `ch.leader === other` or `other.leader === ch`).

---

## Tests for Sub-Phase 3H

- `tests/unit/combat/CombatEngine.test.ts` — Test `violenceUpdate()`: verify it iterates fighting characters and calls `multiHit()`. Test `multiHit()`: verify correct number of attacks with second/third/fourth/fifth attack skills, dual wield, haste bonus, NPC `numAttacks`. Test `oneHit()`: verify hit/miss with known THAC0/AC values, natural 1 always misses, natural 20 always hits and doubles damage. Test damage modifiers: sanctuary halves, immune zeros, susceptible doubles, resist halves. Test `startCombat()` / `stopFighting()` state management.
- `tests/unit/combat/DamageCalculator.test.ts` — Test `calcThac0()` for all classes at various levels. Test `getStrengthDamageBonus()` for all STR values (1-25). Test `getStrengthHitBonus()` for all STR values. Test `getDexArmorBonus()` for all DEX values. Test `checkRIS()`: immune returns 0, resistant returns 0.5, susceptible returns 2.0, immune+susceptible returns 1.0. Test `getDamageMessage()` at every threshold boundary. Test `getWeaponAttackNoun()` for all weapon types. Test `getBackstabMultiplier()` at level boundaries.
- `tests/unit/combat/DeathHandler.test.ts` — Test `handleDeath()` NPC branch: corpse created in room with victim's inventory, XP awarded to killer, prototype.killed incremented, prototype.count decremented, mobile extracted. Test `handleDeath()` PC branch: victim teleported to recall, HP/mana/move set to 1, position = resting, XP loss applied, character saved. Test `makeCorpse()`: timer correct (6 for NPC, 25 for PC), all inventory transferred, all equipment transferred, gold transferred. Test `awardXp()`: level difference scaling, alignment bonus, NPC flag modifiers, min/max XP caps. Test `groupXpSplit()`: even split, group bonus, level penalty.
- `tests/unit/commands/combat.test.ts` — Test `doKill()`: rejects player target (must use murder), rejects self-target, finds NPC and starts combat. Test `doMurder()`: rejects non-PK characters, enforces level range, works for PK-enabled players. Test `doFlee()`: succeeds on valid exit, stops fighting, deducts XP, fails after 3 attempts with no valid exit. Test `doWimpy()`: validates range, sets threshold. Test `doBackstab()`: requires piercing weapon, rejects already-fighting target, applies multiplier. Test `doRescue()`: swaps tank, requires skill check, rejects non-group targets. Test `doBash()`: on success knocks victim to sitting, on failure basher sits. Test `doDisarm()`: drops victim weapon, requires wielded weapon. Test `doGouge()`: applies blind affect on success. Test `doBite()`: HP drain on vampire.
- `tests/unit/entities/Character.combat.test.ts` — Test `updatePosition()` at all HP thresholds. Test `isEvil()`/`isGood()`/`isNeutral()` at alignment boundaries (-350, 0, 350). Test `getBareDamage()` at level boundaries. Test `isInGroup()` leader/member detection. Test `getEffectiveArmor()` with equipment and dex bonus.
- `tests/integration/FullCombatRound.test.ts` — Full integration test: create player and NPC in same room. Player `kill npc`. Verify `startCombat()` sets fighting state. Advance violence tick. Verify `multiHit()` fires. Verify damage applied to victim. Advance multiple rounds. Verify NPC death, corpse created, XP awarded, loot in corpse. Verify player auto-wimpy triggers flee. Verify combat prompt sent each round.
- `tests/integration/PvPCombat.test.ts` — PvP integration: two PK-enabled players. `murder player2`. Verify combat starts. Verify PK restrictions (level range, safe room). On death: verify PK kill/death counters increment, corpse has inventory, victim teleported to recall.

---

## Acceptance Criteria

- [ ] `kill goblin` initiates combat. `ch.fighting` is set to goblin, goblin retaliates. `CombatStart` event emitted.
- [ ] Violence update fires every 12 pulses (3 seconds). Each round, `multiHit()` is called for every fighting character.
- [ ] A character with `second_attack` and `third_attack` skills makes 3 attacks per round (main + second + third). Haste adds a 4th.
- [ ] Dual wield: wielding two weapons grants an additional attack if `dual_wield` skill check passes.
- [ ] THAC0 calculation matches legacy class tables: a level 20 warrior has THAC0 = 0 (20 - 20).
- [ ] Hit roll: natural 1 always misses, natural 20 always hits and deals double damage.
- [ ] Damage from weapons uses the weapon's dice (`values[1]d values[2]`) plus damroll plus strength bonus.
- [ ] Enhanced damage skill at 100% proficiency doubles base weapon damage.
- [ ] Backstab multiplier: level 30 thief deals 5× weapon damage on backstab.
- [ ] Damage messages match the legacy severity table exactly: 0 = "miss", 45 = "decimate", 300 = "MASSACRE", 1600 = "=== OBLITERATE ===".
- [ ] Sanctuary halves all incoming damage. `AFF_PROTECT_EVIL` reduces by 25% from evil attackers.
- [ ] Immune damage type deals 0 damage. Susceptible deals double. Both cancel out to normal.
- [ ] Shield block reduces damage by 25% if skill check passes.
- [ ] Wimpy auto-flee: when HP drops below wimpy threshold, `doFlee()` is called automatically.
- [ ] Player death: lose 1/3 level XP, teleport to recall room, restored to 1 HP, position = resting, character saved. Corpse with inventory in death room.
- [ ] NPC death: XP awarded (with alignment and level-difference modifiers), corpse created with inventory, prototype.killed++, mob extracted.
- [ ] Group XP: split evenly among group members in room, with +10% per extra member bonus.
- [ ] `flee` picks random exit, moves character, stops combat, deducts XP. Fails after 3 attempts: "PANIC!"
- [ ] `backstab` requires piercing weapon and unaware target. Circle requires someone else tanking.
- [ ] `bash` on success: victim position = sitting, 2-round lag on victim. On failure: basher sits.
- [ ] `disarm` drops victim's weapon to the room.
- [ ] `gouge` applies `AFF_BLIND` on victim for level-based duration.
- [ ] `rescue` swaps the tank: attacker now targets the rescuer.
- [ ] `murder` enforces PK flag requirement and level range restriction.
- [ ] Weapon condition degrades on each hit. At 0, weapon breaks.
- [ ] Poison weapon applies poison affect on failed saving throw.
- [ ] NPC hatred tracking: after flee or death, surviving NPC sets `hating`/`hunting` for the killer.
- [ ] Autoloot/autogold/autosac triggers automatically after a kill for players with those flags.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
