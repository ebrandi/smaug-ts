# SMAUG 2.0 TypeScript Port — Phase 3J: Skills, Proficiency, and Learning System

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

**Sub-Phases 3A–3I** are complete. The following files are fully implemented and may be imported:

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

### Sub-Phase 3I (Magic and Spellcasting System)
- `src/game/spells/SpellEngine.ts` — Full 13-step `doCast()` pipeline with all validation, `castSpell()`, `WAIT_STATE()`, target resolution helpers
- `src/game/spells/SpellRegistry.ts` — All 55+ spell definitions (offensive, healing, buff, debuff, utility), GSN constants, lookup methods
- `src/game/spells/SavingThrows.ts` — `savingThrow()`, `risSave()`, `SaveType` enum, class save tables
- `src/game/spells/ComponentSystem.ts` — `checkComponents()`, `consumeComponents()`, `parseComponents()`, component string parsing
- `src/game/commands/magic.ts` — `doCast()`, `doBrandish()`, `doZap()`, `doQuaff()`, `doRecite()`, `doPractice()`
- `src/game/affects/AffectManager.ts` — `addAffect()`, `joinAffect()`, `removeAffect()`, `stripAffects()`, `isAffectedBy()`, `findAffect()`, `affectUpdate()`
- `src/game/affects/AffectRegistry.ts` — All 34+ affect definitions with wear-off messages and metadata
- `src/game/affects/StatModifier.ts` — All stat bonus tables (INT, WIS, CON, CHA, LCK), `applyStatModifier()`

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3J Objective

Implement the complete skill system, proficiency engine, and skill-related mechanics as a standalone, deeply detailed module. This sub-phase covers: the unified skill/spell table architecture, skill lookup and dispatch, proficiency checks and success/failure resolution, the learning system (practice at trainers, learn-from-success, learn-from-failure), weapon proficiency skills, passive/utility skills, language skills, combat skill integration, and the administrative `sset` command for skill editing. After this sub-phase, skills are a fully functional parallel track to spells — invoked via direct commands, checked against proficiency percentages, and improved through use and practice — pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Background: Skills vs Spells in the Unified Table

In the legacy SMAUG engine, skills and spells share the same `skill_table[]` array and the same `SpellDef` data structure. They are distinguished by the `type` field:

| Aspect | Spells (`type: 'spell'`) | Skills (`type: 'skill'`) |
|---|---|---|
| **Invocation** | `cast '<name>' [target]` via `do_cast()` pipeline | Direct command (e.g., `backstab <target>`, `dodge`) |
| **Function signature** | `SpellFunction: (sn, level, ch, vo) => SpellReturn` | `DO_FUN: (ch, argument) => void` — implemented as combat/command handlers |
| **Resource cost** | Always mana (or blood for vampires) | Typically none; some have optional `minMana` (e.g., `meditate`) |
| **Components** | Full `process_spell_components()` | None |
| **Target resolution** | Full `locate_targets()` with PK checks and target type validation | Minimal — handled by the command function itself |
| **Success check** | `(numberPercent() + difficulty * 5) > LEARNED(ch, sn)` in `doCast()` | Same formula, but checked inside each skill's command handler |
| **Learning** | `learnFromSuccess()` / `learnFromFailure()` on cast | Same functions, called from within each skill handler |
| **Lag (beats)** | Applied after cast via `WAIT_STATE(ch, spell.beats)` | Applied by each command handler: `WAIT_STATE(ch, skill.beats)` |
| **Practice** | Same `doPractice()` handler for both | Same |
| **`sset` admin** | Same `doSset()` handler for both | Same |

The `SpellRegistry` stores both skills and spells. The `type` field determines dispatch. Skills with `type: 'skill'` are never invoked through `doCast()` — they are invoked by their own command handler (e.g., `doBackstab()`, `doKick()`, `doDodge()`), which internally calls `canUseSkill()`, `skillSuccessCheck()`, and `learnFromSuccess()`/`learnFromFailure()`.

---

## Files to Implement

### 1. `src/game/spells/SkillSystem.ts` — Core Skill Engine

Implement the skill proficiency, success check, and learning functions. These are the backbone functions called by every skill command handler. Replicates legacy `skills.c`:

- **`canUseSkill(ch, sn, skill)`** — Check if a character can use a skill. Replicates legacy `can_use_skill()`:
  ```typescript
  export function canUseSkill(ch: Character, sn: number, skill: SpellDef): boolean {
    // NPCs can use all skills
    if (ch.isNpc) return true;

    const player = ch as Player;
    const learned = player.getLearnedPercent(sn);
    if (learned <= 0) return false;

    // Check class level requirement
    if (skill.skillLevel[ch.class_] > ch.level) return false;

    // Check race level requirement (if applicable)
    if (skill.raceLevel && skill.raceLevel[ch.race] > ch.level) return false;

    return true;
  }
  ```

- **`skillSuccessCheck(ch, sn, skill)`** — Roll proficiency check. Replicates legacy success formula from `skills.c:227`:
  ```typescript
  export function skillSuccessCheck(ch: Character, sn: number, skill: SpellDef): boolean {
    const learned = ch.isNpc ? 75 : (ch as Player).getLearnedPercent(sn);
    const roll = numberPercent(); // 1-100
    return (roll + skill.difficulty * 5) <= learned;
  }
  ```
  **Formula breakdown:**
  - `numberPercent()` returns 1–100.
  - `skill.difficulty` is 0–3 typically. Each point adds +5 to the roll, making success harder.
  - A difficulty of 0 means: succeed if `roll <= learned`.
  - A difficulty of 2 means: succeed if `roll + 10 <= learned` (i.e., need 10% more proficiency).
  - NPCs always use 75% proficiency for skill checks.

- **`learnFromSuccess(ch, sn, skill)`** — Improve proficiency on successful use. Replicates legacy `learn_from_success()` (`skills.c:1621`):
  ```typescript
  export function learnFromSuccess(ch: Character, sn: number, skill: SpellDef): void {
    if (ch.isNpc) return;
    const player = ch as Player;
    const current = player.getLearnedPercent(sn);
    const adept = skill.skillAdept[ch.class_] ?? 95;

    if (current >= adept) return; // Already at max

    // Learning chance based on INT + WIS
    const chance = ch.getStat('int') + ch.getStat('wis');

    if (numberRange(1, 1000) <= chance) {
      // Determine gain amount
      const gain = (chance - current <= 25) ? 1 : 2;
      const newValue = Math.min(current + gain, adept);
      player.pcData.learned.set(sn, newValue);

      // Adept achievement bonus
      if (newValue >= adept && current < adept) {
        sendToChar(player, `You are now an adept of ${skill.name}!\r\n`);
        // Bonus XP: class-specific
        let xpBonus = 0;
        switch (ch.class_) {
          case CLASS_MAGE:
          case CLASS_AUGURER:
            xpBonus = 1000 * skill.minLevel * 5; break; // ×5 for primary casters
          case CLASS_CLERIC:
          case CLASS_DRUID:
            xpBonus = 1000 * skill.minLevel * 2; break; // ×2 for secondary casters
          default:
            xpBonus = 1000 * skill.minLevel; break;
        }
        player.gainXp(xpBonus);
      }
    }
  }
  ```

- **`learnFromFailure(ch, sn, skill)`** — Improve proficiency on failure (if informative). Replicates legacy `learn_from_failure()`:
  ```typescript
  export function learnFromFailure(ch: Character, sn: number, skill: SpellDef): void {
    if (ch.isNpc) return;
    const player = ch as Player;
    const current = player.getLearnedPercent(sn);
    const adept = skill.skillAdept[ch.class_] ?? 95;

    if (current >= adept - 1) return; // Can only learn from failure up to adept-1

    // Only learn if failure was "informative" — within 25% of threshold
    const chance = ch.getStat('int') + ch.getStat('wis');
    if (chance - current > 25) return; // Too easy, nothing to learn from failure

    if (numberRange(1, 1000) <= chance) {
      player.pcData.learned.set(sn, current + 1);
    }
  }
  ```

- **`getLearnedPercent(ch, sn)`** — Get the proficiency percentage for a skill:
  ```typescript
  export function getLearnedPercent(ch: Character, sn: number): number {
    if (ch.isNpc) return 75; // NPCs always 75%
    return (ch as Player).pcData.learned.get(sn) ?? 0;
  }
  ```

- **`findSkillByCommand(ch, command)`** — Search the skill table for a skill matching a player command. Replicates legacy `check_skill()` (`skills.c:227`):
  1. Iterate skills in the registry where `type === 'skill'`.
  2. Match by prefix: `strPrefix(command, skill.name)`.
  3. Skill must have a non-null function pointer (or equivalent command registration).
  4. `canUseSkill(ch, sn, skill)` must return true.
  5. Return the matched `SpellDef` or `null`.

- **`skillLookup(name)`** — Exact match skill/spell lookup by name. Replicates legacy `skill_lookup()`:
  ```typescript
  export function skillLookup(name: string): SpellDef | null {
    return spellRegistry.getByName(name);
  }
  ```

- **`chSlookup(ch, name)`** — Player-specific skill lookup. Returns skill only if player has `learned > 0`. Replicates legacy `ch_slookup()`.

- **`personalLookup(ch, name)`** — Combine name-match with knowledge check. Used by the `practice` display.

### 2. `src/game/spells/SkillRegistry.ts` — Skill Definitions

Extend the `SpellRegistry` with all skill definitions. Each skill uses the same `SpellDef` interface but with `type: 'skill'`. Skills are distinguished from spells by the `type` field and are invoked via their own command handlers rather than `doCast()`.

#### Global Skill Numbers (GSN) — Combat Skills

```typescript
// Combat skills — correspond to command handlers in combat.ts
export const GSN_BACKSTAB       = 100;
export const GSN_BASH           = 101;
export const GSN_CIRCLE         = 102;
export const GSN_DISARM         = 103;
export const GSN_DODGE          = 104;
export const GSN_DUAL_WIELD     = 105;
export const GSN_ENHANCED_DAMAGE = 106;
export const GSN_FLEE           = 107;
export const GSN_GOUGE          = 108;
export const GSN_KICK           = 109;
export const GSN_PARRY          = 110;
export const GSN_RESCUE         = 111;
export const GSN_SECOND_ATTACK  = 112;
export const GSN_THIRD_ATTACK   = 113;
export const GSN_FOURTH_ATTACK  = 114;
export const GSN_FIFTH_ATTACK   = 115;
export const GSN_TRIP            = 116;
export const GSN_STUN           = 117;
export const GSN_RIPOSTE        = 118;
export const GSN_SHIELD_BLOCK   = 119;
export const GSN_BARE_HAND      = 120;
export const GSN_BITE           = 121;
export const GSN_CLAW           = 122;
export const GSN_TAIL           = 123;
export const GSN_STING          = 124;
export const GSN_GRAPPLE        = 125;
export const GSN_CLEAVE         = 126;
export const GSN_POUNCE         = 127;
```

#### Global Skill Numbers (GSN) — Passive/Utility Skills

```typescript
// Passive/utility skills
export const GSN_HIDE           = 150;
export const GSN_SNEAK          = 151;
export const GSN_PICK_LOCK      = 152;
export const GSN_STEAL          = 153;
export const GSN_MEDITATE       = 154;
export const GSN_TRANCE         = 155;
export const GSN_SEARCH         = 156;
export const GSN_DIG            = 157;
export const GSN_DETRAP         = 158;
export const GSN_MOUNT          = 159;
export const GSN_TRACK          = 160;
export const GSN_PEEK           = 161;
export const GSN_SCAN           = 162;
export const GSN_CLIMB          = 163;
export const GSN_SWIM           = 164;
export const GSN_FORAGE         = 165;
export const GSN_CAMP           = 166;
export const GSN_COOK           = 167;
export const GSN_TAN            = 168;
export const GSN_SHARPEN        = 169;
```

#### Global Skill Numbers (GSN) — Weapon Proficiency Skills

```typescript
// Weapon proficiency skills (gsn_first_weapon to gsn_first_tongue)
export const GSN_PUGILISM       = 200; // barehanded
export const GSN_SWORDS         = 201;
export const GSN_DAGGERS        = 202;
export const GSN_WHIPS          = 203;
export const GSN_TALONOUS_ARMS  = 204;
export const GSN_MACES_HAMMERS  = 205;
export const GSN_AXES           = 206;
export const GSN_SPEARS_STAVES  = 207;
export const GSN_FLEXIBLE_ARMS  = 208;
export const GSN_BOWS_MISSILES  = 209;
export const GSN_POLEARMS       = 210;
```

#### Global Skill Numbers (GSN) — Language Skills

```typescript
// Language/tongue skills (gsn_first_tongue to top_sn)
export const GSN_COMMON         = 250;
export const GSN_ELVEN          = 251;
export const GSN_DWARVEN        = 252;
export const GSN_PIXIE          = 253;
export const GSN_OGRE           = 254;
export const GSN_ORCISH         = 255;
export const GSN_TROLLISH       = 256;
export const GSN_RODENT         = 257;
export const GSN_INSECTOID      = 258;
export const GSN_MAMMAL         = 259;
export const GSN_REPTILE        = 260;
export const GSN_DRACONIC       = 261;
export const GSN_SPIRITUAL      = 262;
export const GSN_MAGICAL        = 263;
export const GSN_GOBLIN         = 264;
export const GSN_GOD            = 265;
export const GSN_ANCIENT        = 266;
export const GSN_HALFLING       = 267;
export const GSN_CLAN           = 268;
export const GSN_GITH           = 269;
```

#### Global Skill Numbers (GSN) — Magic Item Usage Skills

```typescript
// Magic item usage proficiency
export const GSN_SCROLLS        = 280;
export const GSN_STAVES         = 281;
export const GSN_WANDS          = 282;
export const GSN_BREW           = 283;
export const GSN_SCRIBE         = 284;
```

#### Skill Definitions — Complete Table

Define each skill with full `SpellDef` structure. Key fields for skills:

**Combat Skills:**

| Skill | Type | Class Levels (Mage/Cleric/Thief/Warrior/Ranger/Druid/Augurer/Vampire) | Difficulty | Beats | Adept |
|---|---|---|---|---|---|
| `backstab` | skill | 53/53/5/53/53/53/53/53 | 1 | 24 | 0/0/90/0/0/0/0/0 |
| `bash` | skill | 53/53/53/1/6/53/53/53 | 1 | 24 | 0/0/0/90/80/0/0/0 |
| `circle` | skill | 53/53/15/53/53/53/53/53 | 1 | 36 | 0/0/85/0/0/0/0/0 |
| `disarm` | skill | 53/53/12/7/10/53/53/53 | 2 | 24 | 0/0/80/85/80/0/0/0 |
| `dodge` | skill | 20/22/1/13/5/22/22/2 | 0 | 0 | 60/55/90/75/85/55/55/90 |
| `dual wield` | skill | 53/53/15/10/12/53/53/5 | 1 | 0 | 0/0/80/85/80/0/0/85 |
| `enhanced damage` | skill | 53/30/20/1/5/30/53/3 | 0 | 0 | 0/70/75/90/85/70/0/85 |
| `kick` | skill | 53/12/14/3/5/12/53/4 | 0 | 18 | 0/70/70/85/80/70/0/80 |
| `parry` | skill | 53/53/22/1/5/53/53/3 | 0 | 0 | 0/0/70/90/85/0/0/85 |
| `rescue` | skill | 53/53/53/3/5/53/53/53 | 0 | 12 | 0/0/0/85/80/0/0/0 |
| `second attack` | skill | 30/24/14/5/7/24/30/3 | 0 | 0 | 60/65/80/90/85/65/60/85 |
| `third attack` | skill | 53/53/24/12/16/53/53/10 | 0 | 0 | 0/0/70/85/80/0/0/80 |
| `fourth attack` | skill | 53/53/53/40/45/53/53/30 | 1 | 0 | 0/0/0/75/70/0/0/75 |
| `fifth attack` | skill | 53/53/53/53/53/53/53/53 | 2 | 0 | 0/0/0/0/0/0/0/0 |
| `trip` | skill | 53/53/5/15/10/53/53/53 | 0 | 18 | 0/0/85/70/80/0/0/0 |
| `stun` | skill | 53/53/53/25/53/53/53/53 | 2 | 36 | 0/0/0/75/0/0/0/0 |
| `riposte` | skill | 53/53/53/20/25/53/53/15 | 2 | 0 | 0/0/0/80/75/0/0/75 |
| `shield block` | skill | 53/53/53/5/8/53/53/53 | 0 | 0 | 0/0/0/85/80/0/0/0 |
| `gouge` | skill | 53/53/3/53/53/53/53/53 | 1 | 18 | 0/0/85/0/0/0/0/0 |
| `bite` | skill | 53/53/53/53/53/53/53/1 | 0 | 18 | 0/0/0/0/0/0/0/90 |
| `claw` | skill | 53/53/53/53/53/53/53/3 | 0 | 18 | 0/0/0/0/0/0/0/85 |
| `tail` | skill | 53/53/53/53/53/53/53/53 | 0 | 18 | 0/0/0/0/0/0/0/0 |

(Level 53 = unavailable for that class. Adept 0 = cannot learn.)

**Passive/Utility Skills:**

| Skill | Class Levels | Difficulty | Beats | Adept | Description |
|---|---|---|---|---|---|
| `hide` | 53/53/1/53/10/53/53/2 | 0 | 12 | 0/0/90/0/75/0/0/85 | Set `AFF_HIDE`. Broken on any action. |
| `sneak` | 53/53/4/53/8/53/53/5 | 0 | 12 | 0/0/90/0/80/0/0/85 | Set `AFF_SNEAK`. Affects movement visibility. |
| `pick lock` | 53/53/7/53/53/53/53/53 | 1 | 24 | 0/0/85/0/0/0/0/0 | Open locked doors/containers. |
| `steal` | 53/53/5/53/53/53/53/53 | 1 | 24 | 0/0/85/0/0/0/0/0 | Take items/gold from other characters. |
| `meditate` | 8/5/53/53/53/5/8/53 | 0 | 0 | 70/80/0/0/0/80/70/0 | Mana regen bonus while sitting. |
| `trance` | 15/12/53/53/53/12/15/53 | 0 | 0 | 60/70/0/0/0/70/60/0 | Advanced mana regen while sleeping. |
| `search` | 53/53/10/53/8/53/53/53 | 0 | 36 | 0/0/80/0/85/0/0/0 | Find hidden objects/exits. |
| `dig` | 53/53/15/53/10/53/53/53 | 0 | 36 | 0/0/75/0/80/0/0/0 | Dig up buried items. Multi-phase skill with timer. |
| `detrap` | 53/53/18/53/53/53/53/53 | 2 | 24 | 0/0/80/0/0/0/0/0 | Disarm traps on containers/exits. |
| `mount` | 53/53/53/5/1/53/53/53 | 0 | 12 | 0/0/0/80/90/0/0/0 | Mount a rideable mobile. |
| `track` | 53/53/8/20/3/53/53/53 | 0 | 36 | 0/0/75/65/90/0/0/0 | Track a mobile/player, showing direction. |
| `peek` | 53/53/1/53/53/53/53/53 | 0 | 0 | 0/0/85/0/0/0/0/0 | See another character's inventory. |
| `climb` | 30/30/5/15/3/30/30/10 | 0 | 0 | 50/50/80/70/85/50/50/70 | Traverse climbable terrain. |
| `swim` | 30/30/10/15/5/30/30/10 | 0 | 0 | 50/50/75/70/85/50/50/70 | Traverse water without drowning. |

**Weapon Proficiency Skills:**

| Skill | Class Levels | Difficulty | Adept | Weapon Types Covered |
|---|---|---|---|---|
| `pugilism` (bare hands) | 1/1/1/1/1/1/1/1 | 0 | 75/75/80/90/85/75/75/90 | Bare-handed attacks |
| `swords` | 30/30/10/1/3/30/30/5 | 0 | 55/55/80/95/90/55/55/85 | Sword, two-handed sword |
| `daggers` | 20/20/1/5/5/20/20/1 | 0 | 65/65/95/80/80/65/65/95 | Dagger, knife |
| `whips` | 30/30/8/15/8/30/30/53 | 0 | 55/55/85/75/80/55/55/0 | Whip, lash |
| `talonous arms` | 53/53/53/53/53/53/53/1 | 0 | 0/0/0/0/0/0/0/95 | Claw attacks (vampire racial) |
| `maces & hammers` | 10/1/30/5/8/1/10/30 | 0 | 70/90/55/85/80/90/70/55 | Mace, hammer, flail |
| `axes` | 53/53/30/5/8/53/53/30 | 0 | 0/0/55/90/85/0/0/55 | Axe, battle axe |
| `spears & staves` | 1/1/30/10/5/1/1/30 | 0 | 80/80/55/80/85/80/80/55 | Spear, staff, javelin |
| `flexible arms` | 53/53/10/20/15/53/53/53 | 0 | 0/0/80/70/75/0/0/0 | Nunchaku, chain |
| `bows & missiles` | 53/53/15/10/1/53/53/53 | 0 | 0/0/75/80/95/0/0/0 | Bow, crossbow, sling |
| `polearms` | 53/53/53/15/12/53/53/53 | 0 | 0/0/0/80/85/0/0/0 | Halberd, lance, pike |

**Weapon type → Weapon skill mapping:**
```typescript
export function getWeaponSkillGsn(weaponType: number): number {
  switch (weaponType) {
    case WEAPON_SWORD:      return GSN_SWORDS;
    case WEAPON_DAGGER:     return GSN_DAGGERS;
    case WEAPON_WHIP:       return GSN_WHIPS;
    case WEAPON_CLAW:       return GSN_TALONOUS_ARMS;
    case WEAPON_MACE:
    case WEAPON_HAMMER:     return GSN_MACES_HAMMERS;
    case WEAPON_AXE:        return GSN_AXES;
    case WEAPON_SPEAR:
    case WEAPON_STAFF:      return GSN_SPEARS_STAVES;
    case WEAPON_FLEXIBLE:   return GSN_FLEXIBLE_ARMS;
    case WEAPON_BOW:
    case WEAPON_CROSSBOW:
    case WEAPON_SLING:      return GSN_BOWS_MISSILES;
    case WEAPON_POLEARM:    return GSN_POLEARMS;
    default:                return GSN_PUGILISM;
  }
}
```

**Language Skills:**

| Skill | Starting Races | Difficulty | Description |
|---|---|---|---|
| `common` | All | 0 | Universal language. All start at 100%. |
| `elven` | Elf, Half-elf | 0 | Elvish tongue |
| `dwarven` | Dwarf | 0 | Dwarvish tongue |
| `pixie` | Pixie | 0 | Pixie language |
| `ogre` | Ogre | 0 | Ogre language |
| `orcish` | Orc, Half-orc | 0 | Orcish tongue |
| `trollish` | Troll | 0 | Troll language |
| `goblin` | Goblin | 0 | Goblin tongue |
| `halfling` | Halfling | 0 | Halfling language |
| `gith` | Gith | 0 | Githyanki tongue |
| `draconic` | Dragonborn | 0 | Dragon tongue |

Languages use `type: 'tongue'` in the `SpellDef`. Racial languages start at 100% proficiency. Others are learned through practice. Language proficiency affects communication: if proficiency < 100%, text is garbled proportionally.

### 3. `src/game/commands/skills.ts` — Skill Command Handlers

Implement all skill-invoked command handlers that are NOT combat skills (combat skills are in `combat.ts`). Each handler follows the pattern: check skill availability, roll proficiency, apply effect, learn from success/failure.

- **`doHide(ch, argument)`** — Attempt to hide. Replicates legacy `do_hide()`:
  1. If `ch.fighting !== null`: `"You can't hide while fighting!\n"`. Return.
  2. If already hidden (`AFF_HIDE`): `"You are already hidden.\n"`. Return.
  3. Skill check: `skillSuccessCheck(ch, GSN_HIDE, skill)`.
  4. On success: Set `ch.affectedBy |= AFF_HIDE`. Send: `"You attempt to hide.\n"`.
     - Note: AFF_HIDE does NOT send a visible message — other players don't see you hide. Only the hiding player gets feedback.
     - Call `learnFromSuccess(ch, GSN_HIDE, skill)`.
  5. On failure: Send: `"You attempt to hide.\n"` (same message — player doesn't know if they succeeded until someone notices them).
     - Call `learnFromFailure(ch, GSN_HIDE, skill)`.
  6. Apply lag: `WAIT_STATE(ch, skill.beats)`.
  7. `AFF_HIDE` is automatically removed on any action: movement, casting, attacking, speaking. The movement and combat systems already check this.

- **`doSneak(ch, argument)`** — Attempt to sneak. Replicates legacy `do_sneak()`:
  1. Remove existing sneak affect if present: `affectManager.stripAffects(ch, GSN_SNEAK)`.
  2. Skill check: `skillSuccessCheck(ch, GSN_SNEAK, skill)`.
  3. On success: Create `Affect(GSN_SNEAK, ch.level, ApplyType.None, 0, AFF_SNEAK)`. Apply to character.
     - Duration: `ch.level` ticks.
     - While sneaking, movement enter/leave messages are suppressed for characters who fail their `canDetectHidden()` check.
  4. On failure: No affect applied, but player is unaware of failure.
  5. Send: `"You attempt to move silently.\n"`.
  6. Apply lag: `WAIT_STATE(ch, skill.beats)`.

- **`doPickLock(ch, argument)`** — Pick a locked door or container. Replicates legacy `do_pick()`:
  1. Parse target from argument.
  2. First check for a door in the specified direction:
     - Find exit matching argument (e.g., "north", "door").
     - If exit found and `EX_LOCKED`: attempt pick.
  3. If no door, check for a container in the room or inventory:
     - If container found and `CONT_LOCKED`: attempt pick.
  4. Check `EX_PICKPROOF` / `CONT_PICKPROOF`: `"You failed.\n"`. Return.
  5. Skill check: `skillSuccessCheck(ch, GSN_PICK_LOCK, skill)`.
  6. On success: Remove `EX_LOCKED` flag. Send: `"*Click*\n"`. Update bidirectional door state.
     - Call `learnFromSuccess()`.
  7. On failure: Send: `"You failed.\n"`. Call `learnFromFailure()`.
  8. Apply lag: `WAIT_STATE(ch, skill.beats)`.

- **`doSteal(ch, argument)`** — Steal from another character. Replicates legacy `do_steal()`:
  1. Parse target item name and victim name from argument: `{arg1} = item, {arg2} = victim`.
  2. Find victim in room: `getCharRoom(ch, arg2)`. If not found: `"Steal what from whom?\n"`.
  3. If victim is NPC with `ACT_NOSTEAQL` flag: `"You can't steal from that mob.\n"`.
  4. If room has `ROOM_SAFE`: `"You can't do that here.\n"`.
  5. Thief level check: `ch.level + 10 < victim.level`: `"You'd better not try.\n"`.
  6. **Stealing gold:** If `arg1` is "gold", "coins", "silver", "copper":
     - Skill check: `skillSuccessCheck(ch, GSN_STEAL, skill)`.
     - On success: `amount = Math.min(victim.gold, numberRange(1, ch.level * 10))`. Transfer gold. Send: `"Bingo! You got {amount} gold coins.\n"`.
     - On failure: goto caught section.
  7. **Stealing item:** Find item in `victim.carrying` by name.
     - If not found: `"You can't find it.\n"`.
     - If `ITEM_INVENTORY` flag (shop stock): `"You can't steal that.\n"`.
     - If item weight exceeds carry capacity: `"You can't carry that much weight.\n"`.
     - Skill check: modifier for item weight, victim level, visibility.
     - On success: Transfer item from victim to ch. Send: `"You got it!\n"`.
     - On failure: goto caught section.
  8. **Caught section:**
     - Send: `"Oops.\n"` to ch.
     - Send: `"{ch.name} tried to steal from you!\n"` to victim.
     - Act to room: `"{ch.name} tried to steal from {victim.name}.\n"`.
     - If victim is NPC: `multiHit(victim, ch, TYPE_UNDEFINED)` (NPC attacks thief).
     - If victim is PC and has `PLR_PKILL`: may initiate PK retaliation.
     - Set `PLR_THIEF` flag on `ch` for 10 minutes (thief flag).
  9. Apply lag: `WAIT_STATE(ch, skill.beats)`.

- **`doTrack(ch, argument)`** — Track a mobile or player. Replicates legacy `do_track()`:
  1. If no argument: `"Whom are you trying to track?\n"`. Return.
  2. If room has `ROOM_NOTRACK`: `"You can't track here.\n"`. Return.
  3. Find target globally: search all characters in the game by name.
  4. If not found: `"You can't find a trail.\n"`. Return.
  5. Skill check: `skillSuccessCheck(ch, GSN_TRACK, skill)`.
  6. On failure: send a random wrong direction. Call `learnFromFailure()`.
  7. On success: Use `findPath(ch.inRoom, victim.inRoom)` (BFS pathfinding from RoomManager).
     - If path found: `"You sense a trail {direction} from here.\n"`.
     - If no path: `"You can't find a trail.\n"`.
     - Call `learnFromSuccess()`.
  8. Apply lag: `WAIT_STATE(ch, skill.beats)`.

- **`doMount(ch, argument)`** — Mount a rideable NPC. Replicates legacy `do_mount()`:
  1. Find mount in room by argument. Must be NPC with `ACT_MOUNTABLE` flag.
  2. If not found: `"You don't see that here.\n"`.
  3. If mount is already being ridden: `"That mount already has a rider.\n"`.
  4. If ch is already mounted: `"You are already mounted.\n"`.
  5. Skill check: `skillSuccessCheck(ch, GSN_MOUNT, skill)`.
  6. On success: `ch.mount = mount; mount.rider = ch;`. Send: `"You mount {mount.shortDescription}.\n"`.
  7. On failure: Send: `"You fail to mount {mount.shortDescription}.\n"`. Apply lag.

- **`doDismount(ch, argument)`** — Dismount from a mount. No skill check needed:
  1. If not mounted: `"You aren't mounted.\n"`.
  2. Clear mount/rider references.
  3. Send: `"You dismount.\n"`.

- **`doMeditate(ch, argument)`** — Enter meditation for enhanced mana regen. Replicates legacy:
  1. If fighting: `"You can't meditate while fighting!\n"`. Return.
  2. If `ch.position !== POS_SITTING` and `ch.position !== POS_RESTING`: `"You must be sitting or resting to meditate.\n"`. Return.
  3. If not learned: `"You don't know how to meditate.\n"`. Return.
  4. Skill check: `skillSuccessCheck(ch, GSN_MEDITATE, skill)`.
  5. On success: Set `ch.substate = SUB_MEDITATE`. The `manaGain()` function in `Character.ts` already checks for meditate skill and applies a 50% bonus to mana regeneration.
  6. Send: `"You close your eyes and begin meditating...\n"`.

- **`doTrance(ch, argument)`** — Advanced meditation (sleeping). Replicates legacy:
  1. If fighting: `"You can't trance while fighting!\n"`. Return.
  2. Must be sleeping: `ch.position = POS_SLEEPING`.
  3. Skill check: success sets a trance regen bonus (100% mana regen boost).
  4. Send: `"You enter a deep trance...\n"`.

- **`doDetrap(ch, argument)`** — Disarm a trap on a container or exit. Replicates legacy `do_detrap()`:
  1. Parse target (container or exit direction).
  2. Find the trap (object with `ITEM_TRAP` type inside container, or `trapFlags` on exit).
  3. Skill check: `skillSuccessCheck(ch, GSN_DETRAP, skill)`.
  4. On success: Remove trap object or clear trap flags. Send: `"You successfully disarm the trap.\n"`.
  5. On failure: Trip the trap — deal trap damage: `dam = rollDice(trapLevel, trapDiceSize)`. Send: `"You set off the trap!\n"`. Call `inflictDamage()`.
  6. Apply lag: `WAIT_STATE(ch, skill.beats)`.

- **`doDig(ch, argument)`** — Dig for buried items. Replicates legacy `do_dig()` multi-phase skill:
  1. **Phase 1 (initiate):** If `ch.substate !== SUB_DIGGING`:
     - Check for shovel in inventory (item with `ITEM_SHOVEL` type). If none: `"You need a shovel to dig.\n"`.
     - Skill check: If fails: `"You swing your shovel wildly but fail to dig anything.\n"`. Return.
     - Set `ch.substate = SUB_DIGGING`.
     - Add timer: `addTimer(ch, TIMER_DO_FUN, Math.min(skill.beats / 10, 3), doDig, 1)`.
     - Send: `"You begin digging...\n"`.
     - Return (timer will re-invoke this function).
  2. **Phase 2 (complete):** When timer fires and `ch.substate === SUB_DIGGING`:
     - Clear substate: `ch.substate = SUB_NONE`.
     - Search for buried objects in room (objects with `ITEM_BURIED` extra flag).
     - If found: Remove `ITEM_BURIED` flag. Send: `"You dig up {obj.shortDescription}!\n"`.
     - If not found: `"You find nothing buried here.\n"`.
     - Call `learnFromSuccess()` or `learnFromFailure()`.

- **`doBrew(ch, argument)`** — Create a potion from a spell. Replicates legacy `do_brew()`:
  1. Must have `GSN_BREW` skill.
  2. Find an empty vial in inventory (`ITEM_DRINK_CON` with no current liquid, or specific vial item).
  3. Parse spell name from argument.
  4. Skill check: Modified by spell difficulty.
  5. On success: Transform vial into `ITEM_POTION`. Set `values[0]` = ch level, `values[1]` = spell sn. Set appropriate name/description.
  6. On failure: `"The potion fizzes and explodes!\n"`. Deal minor damage. Destroy vial.
  7. Apply lag: `WAIT_STATE(ch, skill.beats)`.

- **`doScribe(ch, argument)`** — Create a scroll from a spell. Replicates legacy `do_scribe()`:
  1. Must have `GSN_SCRIBE` skill.
  2. Find blank parchment in inventory.
  3. Parse spell name.
  4. Skill check.
  5. On success: Transform parchment into `ITEM_SCROLL`. Set spell values.
  6. On failure: `"The scroll catches fire!\n"`. Destroy parchment.
  7. Apply lag.

- **`doSharpen(ch, argument)`** — Sharpen a weapon. Replicates legacy:
  1. Find weapon in inventory.
  2. Must be a bladed weapon (sword, dagger, axe, spear).
  3. Skill check.
  4. On success: Improve weapon condition by `numberRange(5, 15)` (capped at max condition). Optionally add +1 damroll temporarily.
  5. On failure: `"You nick the blade.\n"`. Reduce condition slightly.

### 4. `src/game/spells/SkillSystem.ts` (Continued) — Passive Skill Integration Points

Describe how passive skills integrate with other systems. These skills are NOT invoked directly as commands — they are checked automatically during other actions:

- **`GSN_DODGE`** — Checked during `oneHit()` in `CombatEngine.ts`. After a successful hit roll, if victim has `GSN_DODGE`:
  1. Roll: `skillSuccessCheck(victim, GSN_DODGE, skill)`.
  2. On success: The attack misses. Send: `"You dodge $N's attack.\n"` / `"$n dodges your attack.\n"`.
  3. Call `learnFromSuccess(victim, GSN_DODGE, skill)`.
  4. On failure (if applicable): Call `learnFromFailure(victim, GSN_DODGE, skill)`.

- **`GSN_PARRY`** — Checked during `oneHit()`. After hit roll, if victim has `GSN_PARRY` AND is wielding a weapon:
  1. Roll: `skillSuccessCheck(victim, GSN_PARRY, skill)`.
  2. On success: Attack is parried. Send: `"You parry $N's attack.\n"`.
  3. Call `learnFromSuccess()`.

- **`GSN_SHIELD_BLOCK`** — Checked during `oneHit()`. If victim has `GSN_SHIELD_BLOCK` AND has a shield equipped:
  1. Roll: `skillSuccessCheck(victim, GSN_SHIELD_BLOCK, skill)`.
  2. On success: Reduce damage by 25%. Send: `"You block $N's attack with your shield.\n"`.
  3. Call `learnFromSuccess()`.

- **`GSN_ENHANCED_DAMAGE`** — Checked during `oneHit()` damage calculation. If attacker has the skill:
  1. Roll: `skillSuccessCheck(ch, GSN_ENHANCED_DAMAGE, skill)`.
  2. On success: Add `dam * (learned / 100)` to damage (up to double at 100%).
  3. Call `learnFromSuccess()`.

- **`GSN_DUAL_WIELD`** — Checked during `multiHit()`. If attacker has a weapon in `WEAR_DUAL_WIELD`:
  1. Roll: `skillSuccessCheck(ch, GSN_DUAL_WIELD, skill)`.
  2. On success: Execute an additional `oneHit()` with the dual weapon.
  3. On failure: Call `learnFromFailure()`. No extra attack.

- **`GSN_SECOND_ATTACK`**, **`GSN_THIRD_ATTACK`**, **`GSN_FOURTH_ATTACK`**, **`GSN_FIFTH_ATTACK`** — Each checked sequentially in `multiHit()`:
  1. Roll: `skillSuccessCheck(ch, gsn, skill)`.
  2. On success: Execute an additional `oneHit()`.
  3. Call `learnFromSuccess()` or `learnFromFailure()`.

- **`GSN_RIPOSTE`** — Checked at the end of `multiHit()`. If victim has `GSN_RIPOSTE`:
  1. Roll: `skillSuccessCheck(victim, GSN_RIPOSTE, skill)`.
  2. On success: Execute a retaliatory `oneHit(victim, ch, TYPE_UNDEFINED)`.

- **`GSN_PEEK`** — Checked during `doLook(ch, arg)` when looking at another character. If viewer has `GSN_PEEK`:
  1. Roll: `skillSuccessCheck(ch, GSN_PEEK, skill)`.
  2. On success: Display victim's inventory after the description.

- **`GSN_MEDITATE`** — Checked during `manaGain()` in `Character.ts`. If character has `GSN_MEDITATE` and is sitting:
  1. Multiply mana regen by 1.5.
  2. Small chance to call `learnFromSuccess()`.

- **`GSN_TRANCE`** — Checked during `manaGain()`. If character has `GSN_TRANCE` and is sleeping:
  1. Multiply mana regen by 2.0.

- **`GSN_CLIMB`** — Checked during `moveChar()` in `movement.ts`. When moving to a room with `SectorType.Mountain` or `SectorType.HighMountain`:
  1. Roll: `skillSuccessCheck(ch, GSN_CLIMB, skill)`.
  2. On failure: `"You fail to scale the terrain.\n"`. Movement blocked. Deduct half movement cost.
  3. On success: Normal movement. Call `learnFromSuccess()`.

- **`GSN_SWIM`** — Checked during `moveChar()`. When moving to water sectors:
  1. If character has `AFF_FLYING` or `AFF_FLOATING`: bypass check.
  2. Roll: `skillSuccessCheck(ch, GSN_SWIM, skill)`.
  3. On failure: `"You thrash about in the water!\n"`. Lose extra movement points. Small drowning damage if deep water.
  4. On success: Normal movement.

- **Weapon proficiency skills** (`GSN_SWORDS`, `GSN_DAGGERS`, etc.) — Checked during `oneHit()`:
  1. Determine weapon skill from equipped weapon type using `getWeaponSkillGsn()`.
  2. Get proficiency: `getLearnedPercent(ch, weaponSkillGsn)`.
  3. Apply proficiency bonus to hit roll: if proficiency > 50%, bonus = `+(proficiency - 50) / 10`. If proficiency < 50%, penalty = `-(50 - proficiency) / 10`.
  4. On hit: `learnFromSuccess(ch, weaponSkillGsn, skill)`.
  5. On miss: `learnFromFailure(ch, weaponSkillGsn, skill)`.

### 5. `src/game/commands/information.ts` (additions) — Skill Display Commands

Add skill-related display commands to the information command set:

- **`doSkills(ch, argument)`** — Display all known skills (not spells). Replicates legacy:
  1. Iterate all skills in the registry where `type === 'skill'`.
  2. For each skill the player has learned (or can learn at current level):
     ```
     Skills available to you:
     backstab            85%     kick                72%
     dodge               90%     parry               45%
     second attack       78%     enhanced damage     60%
     ```
  3. Format in two columns, padded and aligned.
  4. If argument is "all": show ALL skills including unlearned ones with `(not learned)`.

- **`doSpells(ch, argument)`** — Display all known spells (not skills). Similar to `doSkills` but for `type === 'spell'`:
  1. Show spell name, mana cost at current level, and current proficiency:
     ```
     Spells available to you:             Mana  Prac
     magic missile                          5    92%
     fireball                              25    67%
     sanctuary                             75    34%
     ```
  2. Group by level learned.

- **`doSlist(ch, argument)`** — Show all spells/skills available to a class at each level. Replicates legacy `do_slist()`:
  1. Parse class from argument (or use character's class if none).
  2. For each level (1 to LEVEL_HERO):
     ```
     Level  1: magic missile, cure light, dodge
     Level  5: chill touch, backstab, sneak
     Level 10: shocking grasp, kick, second attack
     ```
  3. Only show skills/spells that the class can learn (skillLevel < LEVEL_HERO).

- **`doWhere(ch, argument)` enhancement** — If character has `GSN_TRACK` skill and is searching for a player, show distance indicator.

### 6. `src/game/commands/immortal.ts` (additions) — Admin Skill Commands

- **`doSset(ch, argument)`** — Set skill/spell proficiency. Replicates legacy `do_sset()`:
  1. Syntax: `sset <character> <skill/spell name> <value>` or `sset <character> all <value>`.
  2. Find target character.
  3. Find skill/spell by name in registry.
  4. If `all`: set ALL skills/spells to `value` for target.
  5. Validate value: 0–100.
  6. Set: `target.pcData.learned.set(sn, value)`.
  7. Send: `"Ok.\n"`.
  8. Trust level: `LEVEL_GREATER` (trust ≥ 103).

- **`doSkillstat(ch, argument)`** — Display detailed skill/spell info for admin. Replicates legacy:
  1. Show all `SpellDef` fields: name, sn, type, skillLevel per class, skillAdept per class, difficulty, beats, minMana, target, saves, guild, components, dice, messages.
  2. Format as detailed admin output.

### 7. Skill Data on Characters — `Player.ts` Integration

Ensure the following fields and methods exist on the `Player` class:

- **`pcData.learned: Map<number, number>`** — Maps skill/spell sn to proficiency (0–100).
- **`pcData.practice: number`** — Available practice sessions.
- **`getLearnedPercent(sn: number): number`** — Return proficiency or 0.
- **`setLearnedPercent(sn: number, value: number): void`** — Set proficiency, clamped 0–100.
- **Practice gain on level:** When leveling up, gain `getWisPractice(ch.getStat('wis'))` practice sessions (2-5 based on WIS score).

### 8. Language System Integration — `src/game/commands/communication.ts` (additions)

Skills of type `'tongue'` integrate with the communication system:

- **`doSpeak(ch, argument)`** — Switch current speaking language. Replicates legacy `do_speak()`:
  1. List known languages if no argument.
  2. Find language skill by name.
  3. Check proficiency: must have `learned > 0`.
  4. Set `ch.speaking = languageSn`.
  5. Send: `"You now speak {languageName}.\n"`.

- **`doLanguages(ch, argument)`** — List all known languages with proficiency:
  ```
  Languages known:
  Common               100%  (current)
  Elven                 85%
  Dwarven               40%
  ```

- **Language translation in channels:** When a character speaks in a language, listeners with lower proficiency hear garbled text:
  ```typescript
  function translateSpeech(text: string, speakerLang: number, listenerProficiency: number): string {
    if (listenerProficiency >= 100) return text; // Perfect understanding
    if (listenerProficiency <= 0) return garbleText(text); // Complete garble

    // Partial translation: replace (100 - proficiency)% of characters
    let result = '';
    for (const char of text) {
      if (char === ' ' || char === '.' || char === '!' || char === '?') {
        result += char; // Keep punctuation
      } else if (numberPercent() <= listenerProficiency) {
        result += char; // Understood
      } else {
        result += garbleChar(char); // Replace with random letter
      }
    }
    return result;
  }
  ```

- **Language learning:** Hearing speech in an unknown language may improve proficiency. Each time garbled speech is received:
  1. Small chance (5%) to gain 1% proficiency.
  2. Capped at `raceAdept` for the language.

---

## Wiring and Integration

### EventBus Events to Emit
- `GameEvent.SkillUsed` — `{ characterId, skillSn, skillName, success }` — Emitted when any skill is attempted.
- `GameEvent.SkillLearned` — `{ characterId, skillSn, skillName, newProficiency }` — Emitted when proficiency improves.
- `GameEvent.SkillAdept` — `{ characterId, skillSn, skillName }` — Emitted when reaching adept level.
- `GameEvent.PracticeDone` — `{ characterId, skillSn, skillName, newProficiency, remainingPractices }` — Emitted after practicing.

### Command Registration
Register all new commands in `CommandRegistry`:
```typescript
{ name: 'hide',       fun: doHide,       position: POS_RESTING,  level: 0, log: LOG_NORMAL }
{ name: 'sneak',      fun: doSneak,      position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'pick',       fun: doPickLock,   position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'steal',      fun: doSteal,      position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'track',      fun: doTrack,      position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'mount',      fun: doMount,      position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'dismount',   fun: doDismount,   position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'meditate',   fun: doMeditate,   position: POS_RESTING,  level: 0, log: LOG_NORMAL }
{ name: 'trance',     fun: doTrance,     position: POS_SLEEPING, level: 0, log: LOG_NORMAL }
{ name: 'detrap',     fun: doDetrap,     position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'dig',        fun: doDig,        position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'brew',       fun: doBrew,       position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'scribe',     fun: doScribe,     position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'sharpen',    fun: doSharpen,    position: POS_STANDING, level: 0, log: LOG_NORMAL }
{ name: 'skills',     fun: doSkills,     position: POS_DEAD,     level: 0, log: LOG_NORMAL }
{ name: 'spells',     fun: doSpells,     position: POS_DEAD,     level: 0, log: LOG_NORMAL }
{ name: 'slist',      fun: doSlist,      position: POS_DEAD,     level: 0, log: LOG_NORMAL }
{ name: 'speak',      fun: doSpeak,      position: POS_RESTING,  level: 0, log: LOG_NORMAL }
{ name: 'languages',  fun: doLanguages,  position: POS_DEAD,     level: 0, log: LOG_NORMAL }
{ name: 'sset',       fun: doSset,       position: POS_DEAD,     level: 103, log: LOG_ALWAYS }
{ name: 'skillstat',  fun: doSkillstat,  position: POS_DEAD,     level: 103, log: LOG_NORMAL }
```

### Integration Points with Prior Sub-Phases

1. **`CombatEngine.ts` (3H):** Import `skillSuccessCheck()`, `learnFromSuccess()`, `learnFromFailure()` for dodge, parry, shield block, enhanced damage, dual wield, multi-attack, riposte, and weapon proficiency.
2. **`combat.ts` (3H):** Each combat skill handler already calls the skill system functions. Verify integration.
3. **`movement.ts` (3B/3F):** Import climb/swim checks for mountain and water sectors.
4. **`information.ts` (3B):** Import peek skill check for `doLook()`.
5. **`magic.ts` (3I):** Practice command delegates to skill system. Scroll/wand usage checks `gsn_scrolls`/`gsn_wands`.
6. **`communication.ts` (3E):** Language translation integrates with `tongue` type skills.
7. **`Character.ts` (3B):** `manaGain()` checks meditate/trance skills. `hitGain()` and `moveGain()` may check other passive skills.
8. **`PlayerRepository.ts` (3E):** Save and load `pcData.learned` map (skill proficiencies).

---

## Tests for Sub-Phase 3J

### `tests/unit/spells/SkillSystem.test.ts`
- **`canUseSkill()` tests:**
  - NPC: always returns true.
  - PC with learned > 0 and level meets requirement: returns true.
  - PC with learned === 0: returns false.
  - PC with level below skillLevel: returns false.
  - PC with race level restriction: returns false when race level too low.

- **`skillSuccessCheck()` tests:**
  - With learned = 80 and difficulty = 0: success when roll ≤ 80.
  - With learned = 80 and difficulty = 2: success when roll + 10 ≤ 80 (i.e., roll ≤ 70).
  - NPC always uses 75% proficiency.
  - Mock RNG to test boundary cases: roll exactly at learned, one above, one below.

- **`learnFromSuccess()` tests:**
  - Already at adept: no gain.
  - INT + WIS within 25 of current: 1-point gain.
  - INT + WIS more than 25 above current: 2-point gain.
  - Reaching adept triggers bonus XP: verify mage gets ×5, cleric ×2, warrior ×1.
  - NPC: function returns immediately, no gain.
  - RNG: mock to verify 1/1000 chance-based gating.

- **`learnFromFailure()` tests:**
  - Already at adept-1: no gain.
  - INT + WIS - current > 25: no gain (too easy).
  - Within 25: 1-point gain on success roll.
  - NPC: no gain.

- **`getLearnedPercent()` tests:**
  - Returns 0 for unlearned skill.
  - Returns stored value for learned skill.
  - Returns 75 for NPC.

### `tests/unit/spells/SkillRegistry.test.ts`
- All combat skills registered with correct GSN numbers.
- All passive skills registered with correct class level requirements.
- All weapon proficiency skills registered.
- All language skills registered.
- `getWeaponSkillGsn()` maps correctly for all weapon types.
- `findSkill()` prefix match works: "back" matches "backstab".
- `findSkill()` exact match: "backstab" matches exactly.
- Skill level array: backstab available to thief at level 5, not to mage (level 53).
- Skill adept array: backstab adept for thief is 90, for warrior is 0.

### `tests/unit/commands/skills.test.ts`
- **`doHide()` tests:**
  - Not fighting: succeed or fail based on skill check.
  - Already hidden: "You are already hidden."
  - Success: AFF_HIDE set on character.
  - AFF_HIDE removed on movement (verify integration).

- **`doSneak()` tests:**
  - Success: AFF_SNEAK affect applied with correct duration.
  - Failure: no affect, but player gets same message (unaware).
  - Existing sneak stripped before reapply.

- **`doPickLock()` tests:**
  - Door is locked: skill check success unlocks.
  - Pickproof door: always fails.
  - Container is locked: skill check success unlocks.
  - No lockable target: error message.

- **`doSteal()` tests:**
  - Steal gold: success transfers gold, failure triggers caught.
  - Steal item: success transfers item, failure triggers caught.
  - NPC victim with NOSTEAQL flag: blocked.
  - ROOM_SAFE: blocked.
  - Caught: PLR_THIEF flag set, NPC attacks.

- **`doTrack()` tests:**
  - Target found: shows correct direction.
  - Target not found: "You can't find a trail."
  - Skill failure: shows random wrong direction.
  - ROOM_NOTRACK: blocked.

- **`doMount()` tests:**
  - Target is mountable NPC: success mounts.
  - Target already ridden: error message.
  - Already mounted: error message.
  - Skill failure: "You fail to mount."

- **`doMeditate()` tests:**
  - Wrong position: error message.
  - In combat: error message.
  - Success: substate set, mana regen boosted.

- **`doDig()` tests:**
  - Phase 1: initiate digging with shovel, timer set.
  - Phase 2: timer fires, buried object found and uncovered.
  - No shovel: error message.
  - No buried items: "You find nothing buried here."

### `tests/unit/commands/skillDisplay.test.ts`
- `doSkills()`: lists all learned skills with correct proficiency percentages.
- `doSpells()`: lists all learned spells with mana costs and proficiency.
- `doSlist()`: shows level-grouped skills/spells for a class.
- `doPractice()` no arg: lists all skills with percentages.
- `doPractice('backstab')`: increases proficiency by INT-based rate.

### `tests/unit/commands/language.test.ts`
- `doSpeak('elven')`: switches speaking language.
- `doLanguages()`: lists all known languages with proficiency.
- `translateSpeech()`: full proficiency → no garble. Zero proficiency → complete garble. 50% → partial garble.
- Language learning: hearing foreign speech has small chance to improve.

### `tests/unit/commands/immortal-skills.test.ts`
- `doSset('player backstab 100')`: sets proficiency to 100.
- `doSset('player all 80')`: sets all skills to 80.
- `doSset()` by non-admin: denied.

### `tests/integration/SkillCombat.test.ts`
- **Dodge integration:** Attack a character with dodge skill. Verify some attacks are dodged (skill check succeeds). Verify `learnFromSuccess()` called on dodge.
- **Parry integration:** Attack a character with parry skill and wielded weapon. Verify parry messages.
- **Backstab:** Use `doBackstab()` on unaware NPC. Verify backstab multiplier applied. Verify skill check, learning.
- **Multi-attack chain:** Character with second/third/fourth attack. Verify correct number of attacks based on skill checks.
- **Weapon proficiency:** Attack with sword. Verify `GSN_SWORDS` proficiency affects hit bonus. Verify learning on hit/miss.
- **Hide + sneak + backstab combo:** Hide, sneak into room (no enter message for observers who fail detect), backstab for surprise damage.
- **Steal and get caught:** Attempt steal on NPC, fail skill check, NPC attacks thief.

### `tests/integration/SkillPractice.test.ts`
- **Full practice workflow:**
  1. Player with practice sessions at trainer mob.
  2. `practice 'backstab'` → proficiency increases by INT-based rate.
  3. Repeat until adept → "You are already an adept."
  4. Verify practice sessions decremented.
  5. Verify no practice possible without trainer mob in room.
  6. Verify can't practice skills above level requirement.

---

## Acceptance Criteria

- [ ] `canUseSkill()` correctly validates class level, race level, and learned percentage.
- [ ] `skillSuccessCheck()` uses formula `(roll + difficulty * 5) <= learned`. NPCs always use 75%.
- [ ] `learnFromSuccess()` grants 1-2 points based on INT+WIS vs current percentage.
- [ ] `learnFromFailure()` grants at most 1 point, only if within 25% of threshold.
- [ ] Reaching adept triggers "You are now an adept of X!" and grants class-specific bonus XP.
- [ ] `practice 'backstab'` at a trainer increases proficiency by INT-based learn rate, costs 1 practice session.
- [ ] `practice` with no argument lists all known skills/spells with proficiency percentages.
- [ ] Already at adept: `practice 'backstab'` shows "You are already an adept."
- [ ] No practice mob in room: "You can't do that here."
- [ ] `hide` sets `AFF_HIDE`, broken on any visible action.
- [ ] `sneak` applies `AFF_SNEAK` affect with duration, suppresses movement messages.
- [ ] `pick lock` unlocks doors with skill check, blocked by pickproof.
- [ ] `steal` transfers item/gold on success, triggers caught on failure (NPC attacks, PLR_THIEF set).
- [ ] `track` shows direction to target via BFS pathfinding, wrong direction on failure.
- [ ] `mount` / `dismount` correctly link rider/mount with skill check.
- [ ] `meditate` boosts mana regeneration by 50% while sitting.
- [ ] `trance` boosts mana regeneration by 100% while sleeping.
- [ ] `dig` is a multi-phase skill: initiate with timer, complete after delay, finds buried items.
- [ ] `detrap` disarms traps on success, triggers trap on failure.
- [ ] `brew` creates potion from spell, `scribe` creates scroll from spell.
- [ ] Passive skills (dodge, parry, shield block, enhanced damage) checked automatically during combat.
- [ ] Weapon proficiency affects hit bonus in `oneHit()`. Learning occurs on each attack.
- [ ] Multi-attack skills (second/third/fourth/fifth) checked sequentially in `multiHit()`.
- [ ] Dual wield skill check gates the second weapon's attack.
- [ ] Riposte: victim retaliates at end of attacker's round on skill success.
- [ ] Language skills: `speak elven` switches language, `languages` lists known tongues.
- [ ] Garbled speech: low proficiency listeners receive partially garbled text.
- [ ] `sset player backstab 100` sets proficiency (admin command, trust ≥ 103).
- [ ] `skills` command lists all learned skills with proficiency percentages.
- [ ] `spells` command lists all learned spells with mana costs.
- [ ] `slist` shows level-grouped skills/spells for a class.
- [ ] Climb skill checked when entering mountain sectors — failure blocks movement.
- [ ] Swim skill checked when entering water sectors — failure causes extra move cost.
- [ ] Peek skill checked when looking at another character — success shows inventory.
- [ ] All skill/spell proficiencies saved and loaded correctly via `PlayerRepository`.
- [ ] Level-up grants practice sessions based on WIS score.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
