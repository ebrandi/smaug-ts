# SMAUG 2.0 TypeScript Port — Phase 3K: Affect System, Conditions, and Buff/Debuff Engine

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

**Sub-Phases 3A–3J** are complete. The following files are fully implemented and may be imported:

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

### Sub-Phase 3C–3J (Magic, Skills, Inventory, Economy, Communication, Admin, Perception, Combat Core, Spellcasting, Skills/Proficiency)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3K Objective

Implement the complete affect/condition engine as a standalone, deeply detailed module. This sub-phase fully specifies the `Affect` entity class, the `AffectManager` lifecycle controller, the `AffectRegistry` containing all affect type definitions and metadata, and the `StatModifier` attribute bonus tables. After this sub-phase, the full affect lifecycle — creation, application to character stats, stacking/joining, duration tracking, periodic effects (poison tick damage, regen bonuses), expiry with messages, and removal with stat reversal — is pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/entities/Affect.ts` — Affect Entity Class

Implement the core `Affect` class that represents a single affect instance. Replicates legacy `affect_data` struct from `mud.h`:

```typescript
import { Character } from './Character';
import { ApplyType } from './types';

export class Affect {
  /** Spell/skill number that created this affect. -1 for equipment affects. */
  type: number;
  /** Duration in game ticks. -1 = permanent (equipment, racial). 0 = expires this tick. */
  duration: number;
  /** Which stat/attribute to modify. Uses ApplyType enum. */
  location: ApplyType;
  /** Amount to modify the stat (positive = buff, negative = debuff, or vice versa for AC). */
  modifier: number;
  /** Bitvector flag to set on the character's affectedBy field (e.g., AFF_INVISIBLE). 0n = no flag. */
  bitvector: bigint;

  constructor(
    type: number,
    duration: number,
    location: ApplyType,
    modifier: number,
    bitvector: bigint = 0n
  ) {
    this.type = type;
    this.duration = duration;
    this.location = location;
    this.modifier = modifier;
    this.bitvector = bitvector;
  }

  /**
   * Apply this affect's stat modification to a character.
   * Replicates legacy affect_modify() with fAdd=true.
   * Called when affect is first applied or re-applied after join.
   */
  applyTo(ch: Character): void {
    this.modifyStat(ch, this.modifier);
    if (this.bitvector !== 0n) {
      ch.affectedBy |= this.bitvector;
    }
  }

  /**
   * Remove this affect's stat modification from a character.
   * Replicates legacy affect_modify() with fAdd=false.
   * Only clears the bitvector flag if no other active affect on the character
   * sets the same flag — caller (AffectManager) is responsible for the flag check.
   */
  removeFrom(ch: Character): void {
    this.modifyStat(ch, -this.modifier);
    // Note: bitvector flag removal is handled by AffectManager.removeAffect()
    // to prevent removing a flag still set by another affect.
  }

  /**
   * Core stat modification switch. Replicates legacy affect_modify() body.
   * Handles all ApplyType values.
   */
  private modifyStat(ch: Character, mod: number): void {
    switch (this.location) {
      case ApplyType.None:      break; // No-op, bitvector-only affect
      case ApplyType.Str:       ch.modStats.str += mod; break;
      case ApplyType.Dex:       ch.modStats.dex += mod; break;
      case ApplyType.Int:       ch.modStats.int += mod; break;
      case ApplyType.Wis:       ch.modStats.wis += mod; break;
      case ApplyType.Con:       ch.modStats.con += mod; break;
      case ApplyType.Cha:       ch.modStats.cha += mod; break;
      case ApplyType.Lck:       ch.modStats.lck += mod; break;
      case ApplyType.Sex:       ch.sex += mod; break;
      case ApplyType.Class:     break; // Class cannot be modified
      case ApplyType.Level:     break; // Level cannot be modified by affects
      case ApplyType.Age:       break; // Age modification (cosmetic)
      case ApplyType.Height:    break; // Height modification (cosmetic)
      case ApplyType.Weight:    break; // Weight modification (cosmetic)
      case ApplyType.Mana:      ch.maxMana += mod; break;
      case ApplyType.Hit:       ch.maxHit += mod; break;
      case ApplyType.Move:      ch.maxMove += mod; break;
      case ApplyType.Gold:      break; // Gold not modifiable by affects
      case ApplyType.Exp:       break; // XP not modifiable by affects
      case ApplyType.Ac:        ch.armor += mod; break;
      case ApplyType.Hitroll:   ch.hitroll += mod; break;
      case ApplyType.Damroll:   ch.damroll += mod; break;
      case ApplyType.SavePoison:  ch.savingPoison += mod; break;
      case ApplyType.SaveRod:     ch.savingRod += mod; break;
      case ApplyType.SavePara:    ch.savingPara += mod; break;
      case ApplyType.SaveBreath:  ch.savingBreath += mod; break;
      case ApplyType.SaveSpell:   ch.savingSpell += mod; break;
      case ApplyType.Affect:      ch.affectedBy |= BigInt(mod); break;
      case ApplyType.Resistant:   ch.resistant |= BigInt(mod); break;
      case ApplyType.Immune:      ch.immune |= BigInt(mod); break;
      case ApplyType.Susceptible: ch.susceptible |= BigInt(mod); break;
      case ApplyType.Backstab:    ch.modStats.backstab = (ch.modStats.backstab ?? 0) + mod; break;
      case ApplyType.Pick:        ch.modStats.pick = (ch.modStats.pick ?? 0) + mod; break;
      case ApplyType.Track:       ch.modStats.track = (ch.modStats.track ?? 0) + mod; break;
      case ApplyType.Steal:       ch.modStats.steal = (ch.modStats.steal ?? 0) + mod; break;
      case ApplyType.Sneak:       ch.modStats.sneak = (ch.modStats.sneak ?? 0) + mod; break;
      case ApplyType.Hide:        ch.modStats.hide = (ch.modStats.hide ?? 0) + mod; break;
      case ApplyType.Palm:        ch.modStats.palm = (ch.modStats.palm ?? 0) + mod; break;
      case ApplyType.DetectTraps: ch.modStats.detectTraps = (ch.modStats.detectTraps ?? 0) + mod; break;
      case ApplyType.Dodge:       ch.modStats.dodge = (ch.modStats.dodge ?? 0) + mod; break;
      case ApplyType.SpellAffect: ch.affectedBy |= BigInt(mod); break;
      case ApplyType.Parry:       ch.modStats.parry = (ch.modStats.parry ?? 0) + mod; break;
      case ApplyType.Tumble:      ch.modStats.tumble = (ch.modStats.tumble ?? 0) + mod; break;
      case ApplyType.RoomFlag:    break; // Room flag modification (special)
      case ApplyType.SectorFlag:  break; // Sector modification (special)
      case ApplyType.TeleDest:    break; // Teleport destination (special)
      case ApplyType.TeleDelay:   break; // Teleport delay (special)
      case ApplyType.CurrentHealth: ch.hit = Math.min(ch.hit + mod, ch.maxHit); break;
      case ApplyType.CurrentMana:   ch.mana = Math.min(ch.mana + mod, ch.maxMana); break;
      case ApplyType.CurrentMove:   ch.move = Math.min(ch.move + mod, ch.maxMove); break;
      default:
        // Unknown apply type — log warning but do not crash
        break;
    }
  }
}
```

**Key design decisions:**
- `duration: -1` means permanent (never decremented, never expires). Used for equipment affects and innate racial traits.
- `duration: 0` means the affect expires at the next `affectUpdate()` tick.
- `duration > 0` is decremented each `PULSE_TICK` by `affectUpdate()`.
- The `bitvector` field uses `bigint` because SMAUG 2.0 has more than 32 AFF flags (the legacy code uses extended bitvectors stored across multiple 32-bit integers).
- The `modifyStat()` switch must handle all `ApplyType` values defined in ARCHITECTURE.md §4.4. Missing cases log a warning but do not throw.

---

### 2. `src/game/affects/AffectManager.ts` — Affect Lifecycle Controller

Implement the complete affect lifecycle: application, joining/stacking, stripping, periodic effects, duration tracking, and expiry. This is the central controller that all other systems (spells, equipment, potions, MUDprogs) call to modify character states.

#### `addAffect(ch, affect)` — Apply a New Affect

Replicates legacy `affect_to_char()` in `handler.c`:

1. Push `affect` onto `ch.affects[]` array.
2. Call `affect.applyTo(ch)` — this modifies the character's stats and sets bitvector flags.
3. Handle special-case side effects:
   - If `affect.bitvector` includes `AFF_BLIND`: Log perception change. If character was fighting, they continue fighting (no auto-stop).
   - If `affect.bitvector` includes `AFF_SLEEP`: Set `ch.position = Position.Sleeping`. If fighting, call `stopFighting(ch, true)`.
   - If `affect.bitvector` includes `AFF_FLYING`: Character can now traverse air sectors. If character was falling, cancel fall.
   - If `affect.bitvector` includes `AFF_INVISIBLE`: Remove character from `canSee` checks for other characters until they attack or cast.
   - If `affect.bitvector` includes `AFF_CHARM`: Set `ch.master` to caster if not already set.
4. Emit `GameEvent.AffectApplied` with `{ characterId: ch.id, affectType: affect.type, duration: affect.duration }`.

```typescript
addAffect(ch: Character, affect: Affect): void {
  if (!ch || ch.extracted) return; // Defensive guard

  ch.affects.push(affect);
  affect.applyTo(ch);

  // Special-case side effects
  if (affect.bitvector !== 0n) {
    if ((affect.bitvector & AFF_SLEEP) !== 0n) {
      if (ch.fighting) {
        stopFighting(ch, true);
      }
      ch.position = Position.Sleeping;
    }
  }

  this.eventBus.emit(GameEvent.AffectApplied, {
    characterId: ch.id,
    affectType: affect.type,
    duration: affect.duration,
  });
}
```

#### `joinAffect(ch, affect)` — Merge or Stack an Affect

Replicates legacy `affect_join()` in `handler.c`. Used when a spell is re-cast and should extend duration or stack modifiers rather than being rejected:

1. Search `ch.affects[]` for an existing affect with the same `type` AND same `location`.
2. If found:
   - Take the **maximum** of the two durations: `existing.duration = Math.max(existing.duration, affect.duration)`.
   - Remove the existing affect's stat modification: `existing.removeFrom(ch)`.
   - Add the new modifier to the existing: `existing.modifier += affect.modifier`.
   - Re-apply the combined modification: `existing.applyTo(ch)`.
   - Do NOT create a new affect entry.
3. If not found:
   - Call `addAffect(ch, affect)` to apply as a new affect.

```typescript
joinAffect(ch: Character, affect: Affect): void {
  const existing = ch.affects.find(
    a => a.type === affect.type && a.location === affect.location
  );
  if (existing) {
    existing.duration = Math.max(existing.duration, affect.duration);
    existing.removeFrom(ch);
    existing.modifier += affect.modifier;
    existing.applyTo(ch);
  } else {
    this.addAffect(ch, affect);
  }
}
```

#### `removeAffect(ch, affect)` — Remove a Single Affect Instance

Replicates legacy `affect_remove()` in `handler.c`:

1. Call `affect.removeFrom(ch)` — reverses the stat modification.
2. Clear the bitvector flag **only if** no other active affect on the character sets the same flag:
   ```typescript
   if (affect.bitvector !== 0n) {
     const othersHaveFlag = ch.affects.some(
       a => a !== affect && (a.bitvector & affect.bitvector) !== 0n
     );
     if (!othersHaveFlag) {
       ch.affectedBy &= ~affect.bitvector;
     }
   }
   ```
3. Remove from `ch.affects[]` array: `ch.affects.splice(ch.affects.indexOf(affect), 1)`.
4. Handle special-case removal side effects:
   - If removing `AFF_FLYING` and character is in an `AIR` sector room: apply fall damage `rollDice(ch.level, 6)` and move to a ground room if possible. Send `"You fall to the ground!\n"`.
   - If removing `AFF_SLEEP`: Set `ch.position = Position.Standing` if HP > 0. Send `"You wake up.\n"`.
   - If removing `AFF_BLIND`: Send `"Your vision returns!\n"`.
   - If removing `AFF_INVISIBLE`: Send `"You fade into existence.\n"`.
   - If removing `AFF_CHARM`: Clear `ch.master` if set by charm.
5. Emit `GameEvent.AffectRemoved` with `{ characterId: ch.id, affectType: affect.type }`.

#### `stripAffects(ch, spellSn)` — Remove All Affects of a Given Type

Replicates legacy `affect_strip()` in `handler.c`:

1. Iterate `ch.affects[]` **in reverse order** (to handle splice during iteration).
2. For each affect where `affect.type === spellSn`, call `removeAffect(ch, affect)`.
3. This is used by cure spells (`cure blindness`, `cure poison`, `remove curse`) and `dispel magic`.

```typescript
stripAffects(ch: Character, spellSn: number): void {
  for (let i = ch.affects.length - 1; i >= 0; i--) {
    if (ch.affects[i].type === spellSn) {
      this.removeAffect(ch, ch.affects[i]);
    }
  }
}
```

#### `isAffectedBy(ch, spellSn)` — Check for Affect Presence

Replicates legacy `is_affected()` in `handler.c`:

```typescript
isAffectedBy(ch: Character, spellSn: number): boolean {
  return ch.affects.some(a => a.type === spellSn);
}
```

#### `findAffect(ch, spellSn)` — Get First Affect of a Type

```typescript
findAffect(ch: Character, spellSn: number): Affect | null {
  return ch.affects.find(a => a.type === spellSn) ?? null;
}
```

#### `affectUpdate()` — Tick-Based Duration Processing

Replicates legacy `affect_update()` in `update.c`. Called every `PULSE_TICK` (280 pulses = 70 seconds) via `EventBus.on(GameEvent.FullTick)`:

1. Iterate all characters in the global character list.
2. For each character, iterate their `affects[]` in **reverse order** (to safely remove expired affects during iteration).
3. For each affect:
   a. **Skip permanent affects:** If `affect.duration < 0`, skip entirely (permanent, never expires).
   b. **Decrement duration:** `affect.duration--`.
   c. **Warning message at duration 1:** When `affect.duration === 0` after decrement (i.e., it will expire next tick), send a pre-expiry warning if one is defined in `AffectRegistry`:
      - Example: Sanctuary at 1 tick remaining: `"Your white aura is starting to fade.\n"`
      - Invisibility: `"You start to feel visible again.\n"`
      - Fly: `"You feel less buoyant.\n"`
   d. **Expire at duration 0:** If `affect.duration` is now `0` (or was already 0):
      - Send the expiry message from `AffectRegistry` (e.g., `"The armor spell wears off.\n"`, `"You feel weaker.\n"`).
      - Call `removeAffect(ch, affect)` to reverse the stat change and clear flags.
   e. **Periodic effects:** If the affect has periodic effects defined in `AffectRegistry`, apply them:
      - **Poison (`AFF_POISON`):** Deal `rollDice(2, 4)` damage per tick. Deduct 1 move point. Send `"You feel very sick.\n"`. Check for death after damage — if character dies, skip remaining affects.
      - **Regen aura:** Heal `rollDice(1, 6)` HP per tick.
      - **Mana drain:** Deduct `rollDice(1, 4)` mana per tick.
      - **Burning (fireshield damage):** Deal `rollDice(1, 8)` fire damage per tick if in combat.

```typescript
affectUpdate(): void {
  for (const ch of globalCharacterList()) {
    if (ch.extracted) continue;

    for (let i = ch.affects.length - 1; i >= 0; i--) {
      const af = ch.affects[i];
      if (af.duration < 0) continue; // Permanent

      // Apply periodic effects BEFORE decrementing duration
      if (af.type === GSN_POISON && hasFlag(ch.affectedBy, AFF_POISON)) {
        const dam = rollDice(2, 4);
        ch.move = Math.max(0, ch.move - 1);
        sendToChar(ch, "You feel very sick.\n");
        inflictDamage(null, ch, dam, GSN_POISON);
        if (ch.extracted || ch.hit <= 0) break; // Character died, stop processing
      }

      af.duration--;

      // Warning at 1 tick remaining
      if (af.duration === 0) {
        const registry = this.affectRegistry.get(af.type);
        if (registry?.warnMessage) {
          sendToChar(ch, registry.warnMessage);
        }
      }

      // Expired
      if (af.duration <= 0 && af.duration !== -1) {
        const registry = this.affectRegistry.get(af.type);
        if (registry?.expiryMessage) {
          sendToChar(ch, registry.expiryMessage);
        }
        this.removeAffect(ch, af);
      }
    }
  }
}
```

#### `applyEquipmentAffects(ch, obj)` — Apply Object Affects on Equip

Called when a character equips an item. Replicates legacy equip_char() affect handling:

1. For each affect in `obj.affects[]`:
   - Create a new `Affect` with `duration = -1` (permanent while equipped), copying `location`, `modifier`, and `bitvector` from the object affect.
   - Call `addAffect(ch, affect)`.
2. Also apply the object's innate properties:
   - If `ITEM_MAGIC`: No additional effect (just a flag).
   - If `ITEM_GLOW`: Apply light to room.
   - If `ITEM_DARK`: Remove light from room.

#### `removeEquipmentAffects(ch, obj)` — Remove Object Affects on Unequip

Called when a character removes an item. Reverse of `applyEquipmentAffects()`:

1. For each affect in `obj.affects[]`, find the matching equipment affect on the character (by `type === -1` and matching `location`/`modifier`) and call `removeAffect()`.

#### Wire into TickEngine

```typescript
constructor(private eventBus: EventBus, private affectRegistryMap: Map<number, AffectRegistryEntry>) {
  this.eventBus.on(GameEvent.FullTick, () => this.affectUpdate());
}
```

---

### 3. `src/game/affects/AffectRegistry.ts` — Affect Type Definitions and Metadata

Define all affect types with their default properties, messages, and periodic behaviors. This registry is queried by `AffectManager` during tick processing.

#### AFF Flag Constants (bigint)

Define all `AFF_*` flags as `bigint` values matching the legacy bitvector positions. The legacy engine uses extended bitvectors that span multiple 32-bit integers; we represent them as single `bigint` values:

```typescript
export const AFF_BLIND          = 1n << 0n;   // Cannot see
export const AFF_INVISIBLE      = 1n << 1n;   // Invisible
export const AFF_DETECT_EVIL    = 1n << 2n;   // Detect evil alignment
export const AFF_DETECT_INVIS   = 1n << 3n;   // See invisible entities
export const AFF_DETECT_MAGIC   = 1n << 4n;   // See magical auras
export const AFF_DETECT_HIDDEN  = 1n << 5n;   // See hidden entities
export const AFF_HOLD           = 1n << 6n;   // Paralysis hold
export const AFF_SANCTUARY      = 1n << 7n;   // Half damage from all sources
export const AFF_FAERIE_FIRE    = 1n << 8n;   // Glowing outline, AC penalty
export const AFF_INFRARED       = 1n << 9n;   // See in the dark
export const AFF_CURSE           = 1n << 10n;  // Cursed
export const AFF_FLAMING        = 1n << 11n;  // On fire (deprecated, use fireshield)
export const AFF_POISON          = 1n << 12n;  // Poisoned, periodic damage
export const AFF_PROTECT_EVIL   = 1n << 13n;  // Protection from evil
export const AFF_PROTECT_GOOD   = 1n << 14n;  // Protection from good
export const AFF_SNEAK           = 1n << 15n;  // Sneaking, no room enter message
export const AFF_HIDE            = 1n << 16n;  // Hidden, must be searched
export const AFF_SLEEP           = 1n << 17n;  // Magically asleep
export const AFF_CHARM           = 1n << 18n;  // Charmed, follows master
export const AFF_FLYING          = 1n << 19n;  // Can fly / traverse air sectors
export const AFF_PASS_DOOR       = 1n << 20n;  // Can pass through closed doors
export const AFF_FLOATING        = 1n << 21n;  // Floating (like fly but no air sector)
export const AFF_TRUESIGHT       = 1n << 22n;  // See all (invis + hidden + sneaking)
export const AFF_DETECT_TRAPS   = 1n << 23n;  // Detect traps
export const AFF_SCRYING         = 1n << 24n;  // Remote viewing
export const AFF_FIRESHIELD      = 1n << 25n;  // Fire damage shield — retaliatory fire damage
export const AFF_SHOCKSHIELD     = 1n << 26n;  // Lightning damage shield
export const AFF_ICESHIELD       = 1n << 27n;  // Ice damage shield
export const AFF_POSSESS         = 1n << 28n;  // Possessing another body (immortal)
export const AFF_BERSERK         = 1n << 29n;  // Berserker rage
export const AFF_AQUA_BREATH    = 1n << 30n;  // Water breathing
export const AFF_RECURRINGSPELL  = 1n << 31n;  // Spell recurs each tick
export const AFF_CONTAGIOUS      = 1n << 32n;  // Disease is contagious
export const AFF_ACIDMIST        = 1n << 33n;  // Acid mist damage shield
export const AFF_VENOMSHIELD     = 1n << 34n;  // Venom damage shield
export const AFF_HASTE           = 1n << 35n;  // Double attack speed
export const AFF_SLOW            = 1n << 36n;  // Half attack speed
export const AFF_PARALYSIS       = 1n << 37n;  // Cannot act
```

#### AffectRegistryEntry Interface

```typescript
export interface AffectRegistryEntry {
  /** Spell/skill number (matches GSN_* constants). */
  spellSn: number;
  /** Human-readable name. */
  name: string;
  /** Message sent to character when affect expires. */
  expiryMessage: string;
  /** Message sent 1 tick before expiry (optional). */
  warnMessage?: string;
  /** Message sent to room when affect expires (optional). */
  roomExpiryMessage?: string;
  /** Whether this affect stacks via joinAffect() or rejects duplicates. */
  joinable: boolean;
  /** Whether this is a harmful debuff (for dispel magic targeting). */
  isDebuff: boolean;
  /** Periodic effect function called each tick while active (optional). */
  periodicFn?: (ch: Character, affect: Affect) => void;
}
```

#### Registry Entries

Populate the registry with entries for all affect types. Include expiry messages matching the legacy `skill_table[].msg_off` field:

| Affect Type | Expiry Message | Warn Message (1 tick before) | Joinable | isDebuff |
|---|---|---|---|---|
| `GSN_ARMOR` | `"The armor spell wears off.\n"` | `"You feel the armor spell weakening.\n"` | No | No |
| `GSN_BLESS` | `"You feel less righteous.\n"` | — | No | No |
| `GSN_GIANT_STRENGTH` | `"You feel weaker.\n"` | `"Your muscles start to ache.\n"` | No | No |
| `GSN_FLY` | `"You slowly float to the ground.\n"` | `"You feel less buoyant.\n"` | No | No |
| `GSN_INVISIBILITY` | `"You fade into existence.\n"` | `"You start to feel visible again.\n"` | No | No |
| `GSN_DETECT_INVIS` | `"You can no longer see invisible objects.\n"` | — | No | No |
| `GSN_DETECT_HIDDEN` | `"You feel less aware of your surroundings.\n"` | — | No | No |
| `GSN_DETECT_MAGIC` | `"The detect magic wears off.\n"` | — | No | No |
| `GSN_SANCTUARY` | `"The white aura around your body fades.\n"` | `"Your white aura is starting to fade.\n"` | No | No |
| `GSN_HASTE` | `"You feel yourself slow down.\n"` | — | No | No |
| `GSN_SHIELD` | `"Your force shield shimmers then fades away.\n"` | — | No | No |
| `GSN_STONE_SKIN` | `"Your skin returns to normal.\n"` | — | No | No |
| `GSN_PROT_EVIL` | `"You feel less protected.\n"` | — | No | No |
| `GSN_PROT_GOOD` | `"You feel less protected.\n"` | — | No | No |
| `GSN_PASS_DOOR` | `"You feel solid again.\n"` | — | No | No |
| `GSN_INFRAVISION` | `"You can no longer see in the dark.\n"` | — | No | No |
| `GSN_FIRESHIELD` | `"The fireshield around you fades.\n"` | — | No | No |
| `GSN_SHOCKSHIELD` | `"The shockshield around you fades.\n"` | — | No | No |
| `GSN_ICESHIELD` | `"The iceshield around you fades.\n"` | — | No | No |
| `GSN_ACIDMIST` | `"The acid mist around you dissipates.\n"` | — | No | No |
| `GSN_VENOMSHIELD` | `"The venom shield around you fades.\n"` | — | No | No |
| `GSN_BLINDNESS` | `"You can see again!\n"` | — | No | Yes |
| `GSN_POISON` | `"You feel better now. The poison has worn off.\n"` | — | No | Yes |
| `GSN_CURSE` | `"The curse wears off.\n"` | — | No | Yes |
| `GSN_SLEEP` | `"You feel less tired.\n"` | — | No | Yes |
| `GSN_WEAKEN` | `"You feel stronger.\n"` | — | No | Yes |
| `GSN_FAERIE_FIRE` | `"The pink aura around you fades.\n"` | — | No | Yes |
| `GSN_SLOW` | `"You feel yourself speed up.\n"` | — | No | Yes |
| `GSN_CHARM_PERSON` | `"You feel more self-confident.\n"` | — | No | Yes |
| `GSN_PARALYSIS` | `"You can move again!\n"` | — | No | Yes |

#### `initializeRegistry()` — Populate All Entries

```typescript
export class AffectRegistry {
  private entries: Map<number, AffectRegistryEntry> = new Map();

  initializeRegistry(): void {
    this.register({
      spellSn: GSN_ARMOR,
      name: 'armor',
      expiryMessage: 'The armor spell wears off.\n',
      warnMessage: 'You feel the armor spell weakening.\n',
      joinable: false,
      isDebuff: false,
    });
    // ... register all entries from the table above
  }

  register(entry: AffectRegistryEntry): void {
    this.entries.set(entry.spellSn, entry);
  }

  get(spellSn: number): AffectRegistryEntry | undefined {
    return this.entries.get(spellSn);
  }

  getAllDebuffs(): AffectRegistryEntry[] {
    return [...this.entries.values()].filter(e => e.isDebuff);
  }

  getAllBuffs(): AffectRegistryEntry[] {
    return [...this.entries.values()].filter(e => !e.isDebuff);
  }
}
```

---

### 4. `src/game/affects/StatModifier.ts` — Attribute Bonus Tables

Implement the legacy `str_app`, `int_app`, `wis_app`, `dex_app`, `con_app`, `cha_app`, `lck_app` attribute bonus tables. These are fixed lookup tables indexed by effective stat value (3–25+) that provide derived bonuses used throughout the engine.

#### Strength Table (`str_app`)

Replicates legacy `str_app[]` from `const.c`:

```typescript
interface StrAppEntry {
  toHit: number;     // Bonus to-hit roll
  toDam: number;     // Bonus damage
  carry: number;     // Carry weight multiplier (×10 = max carry in pounds)
  wield: number;     // Max weapon weight character can wield
}

export const STR_APP: Record<number, StrAppEntry> = {
  //  stat:  toHit, toDam, carry, wield
  0:  { toHit: -5, toDam: -4, carry:   0, wield:  0 },
  1:  { toHit: -5, toDam: -4, carry:   3, wield:  1 },
  2:  { toHit: -3, toDam: -2, carry:   3, wield:  2 },
  3:  { toHit: -3, toDam: -1, carry:  10, wield:  3 },
  4:  { toHit: -2, toDam: -1, carry:  25, wield:  4 },
  5:  { toHit: -2, toDam: -1, carry:  55, wield:  5 },
  6:  { toHit: -1, toDam:  0, carry:  80, wield:  6 },
  7:  { toHit: -1, toDam:  0, carry:  90, wield:  7 },
  8:  { toHit:  0, toDam:  0, carry: 100, wield:  8 },
  9:  { toHit:  0, toDam:  0, carry: 100, wield:  9 },
  10: { toHit:  0, toDam:  0, carry: 115, wield: 10 },
  11: { toHit:  0, toDam:  0, carry: 115, wield: 11 },
  12: { toHit:  0, toDam:  0, carry: 130, wield: 12 },
  13: { toHit:  0, toDam:  0, carry: 130, wield: 13 },
  14: { toHit:  0, toDam:  1, carry: 140, wield: 14 },
  15: { toHit:  1, toDam:  1, carry: 150, wield: 15 },
  16: { toHit:  1, toDam:  2, carry: 165, wield: 16 },
  17: { toHit:  2, toDam:  3, carry: 180, wield: 22 },
  18: { toHit:  2, toDam:  4, carry: 200, wield: 25 },
  19: { toHit:  3, toDam:  5, carry: 225, wield: 30 },
  20: { toHit:  3, toDam:  6, carry: 250, wield: 35 },
  21: { toHit:  4, toDam:  7, carry: 300, wield: 40 },
  22: { toHit:  4, toDam:  7, carry: 350, wield: 45 },
  23: { toHit:  5, toDam:  8, carry: 400, wield: 50 },
  24: { toHit:  5, toDam:  8, carry: 450, wield: 55 },
  25: { toHit:  6, toDam:  9, carry: 500, wield: 60 },
};
```

#### Intelligence Table (`int_app`)

```typescript
interface IntAppEntry {
  learn: number;     // Learn rate percentage (for practice command)
  mana: number;      // Mana bonus per level
}

export const INT_APP: Record<number, IntAppEntry> = {
  0:  { learn:  3, mana:  0 },
  1:  { learn:  5, mana:  0 },
  2:  { learn:  7, mana:  0 },
  3:  { learn:  8, mana:  0 },
  4:  { learn:  9, mana:  0 },
  5:  { learn: 10, mana:  0 },
  6:  { learn: 11, mana:  1 },
  7:  { learn: 12, mana:  1 },
  8:  { learn: 13, mana:  1 },
  9:  { learn: 15, mana:  2 },
  10: { learn: 17, mana:  2 },
  11: { learn: 19, mana:  3 },
  12: { learn: 22, mana:  3 },
  13: { learn: 25, mana:  4 },
  14: { learn: 28, mana:  4 },
  15: { learn: 31, mana:  5 },
  16: { learn: 34, mana:  6 },
  17: { learn: 37, mana:  7 },
  18: { learn: 40, mana:  8 },
  19: { learn: 44, mana:  9 },
  20: { learn: 49, mana: 10 },
  21: { learn: 55, mana: 11 },
  22: { learn: 60, mana: 12 },
  23: { learn: 70, mana: 13 },
  24: { learn: 80, mana: 15 },
  25: { learn: 85, mana: 17 },
};
```

#### Wisdom Table (`wis_app`)

```typescript
interface WisAppEntry {
  practice: number;  // Practice sessions gained per level
  mana: number;      // Mana bonus per level (for clerics)
}

export const WIS_APP: Record<number, WisAppEntry> = {
  0:  { practice: 0, mana:  0 },
  1:  { practice: 0, mana:  0 },
  2:  { practice: 0, mana:  0 },
  3:  { practice: 0, mana:  0 },
  4:  { practice: 0, mana:  0 },
  5:  { practice: 1, mana:  0 },
  6:  { practice: 1, mana:  0 },
  7:  { practice: 1, mana:  0 },
  8:  { practice: 1, mana:  0 },
  9:  { practice: 1, mana:  0 },
  10: { practice: 1, mana:  0 },
  11: { practice: 1, mana:  0 },
  12: { practice: 1, mana:  1 },
  13: { practice: 1, mana:  2 },
  14: { practice: 1, mana:  2 },
  15: { practice: 2, mana:  3 },
  16: { practice: 2, mana:  3 },
  17: { practice: 2, mana:  4 },
  18: { practice: 3, mana:  5 },
  19: { practice: 3, mana:  6 },
  20: { practice: 3, mana:  6 },
  21: { practice: 3, mana:  7 },
  22: { practice: 4, mana:  8 },
  23: { practice: 4, mana:  9 },
  24: { practice: 4, mana: 10 },
  25: { practice: 5, mana: 12 },
};
```

#### Dexterity Table (`dex_app`)

```typescript
interface DexAppEntry {
  defensive: number; // AC bonus (negative = better)
  carry: number;     // Additional carry slots
  toHit: number;     // Bonus to-hit (ranged/finesse)
}

export const DEX_APP: Record<number, DexAppEntry> = {
  0:  { defensive:  60, carry: 0, toHit: -5 },
  1:  { defensive:  50, carry: 0, toHit: -4 },
  2:  { defensive:  50, carry: 0, toHit: -3 },
  3:  { defensive:  40, carry: 0, toHit: -2 },
  4:  { defensive:  30, carry: 0, toHit: -1 },
  5:  { defensive:  20, carry: 0, toHit:  0 },
  6:  { defensive:  10, carry: 0, toHit:  0 },
  7:  { defensive:   0, carry: 0, toHit:  0 },
  8:  { defensive:   0, carry: 0, toHit:  0 },
  9:  { defensive:   0, carry: 0, toHit:  0 },
  10: { defensive:   0, carry: 1, toHit:  0 },
  11: { defensive:   0, carry: 1, toHit:  0 },
  12: { defensive:   0, carry: 1, toHit:  0 },
  13: { defensive:   0, carry: 1, toHit:  0 },
  14: { defensive:  -5, carry: 2, toHit:  0 },
  15: { defensive: -10, carry: 2, toHit:  1 },
  16: { defensive: -15, carry: 2, toHit:  1 },
  17: { defensive: -20, carry: 3, toHit:  2 },
  18: { defensive: -30, carry: 3, toHit:  2 },
  19: { defensive: -40, carry: 3, toHit:  3 },
  20: { defensive: -50, carry: 4, toHit:  3 },
  21: { defensive: -60, carry: 4, toHit:  4 },
  22: { defensive: -75, carry: 5, toHit:  4 },
  23: { defensive: -90, carry: 5, toHit:  5 },
  24: { defensive:-105, carry: 6, toHit:  5 },
  25: { defensive:-120, carry: 7, toHit:  6 },
};
```

#### Constitution Table (`con_app`)

```typescript
interface ConAppEntry {
  hitp: number;      // HP bonus per level
  shock: number;     // % chance to survive system shock
}

export const CON_APP: Record<number, ConAppEntry> = {
  0:  { hitp: -4, shock: 20 },
  1:  { hitp: -3, shock: 25 },
  2:  { hitp: -2, shock: 30 },
  3:  { hitp: -2, shock: 35 },
  4:  { hitp: -1, shock: 40 },
  5:  { hitp: -1, shock: 45 },
  6:  { hitp: -1, shock: 50 },
  7:  { hitp:  0, shock: 55 },
  8:  { hitp:  0, shock: 60 },
  9:  { hitp:  0, shock: 65 },
  10: { hitp:  0, shock: 70 },
  11: { hitp:  0, shock: 75 },
  12: { hitp:  0, shock: 80 },
  13: { hitp:  0, shock: 85 },
  14: { hitp:  1, shock: 88 },
  15: { hitp:  1, shock: 90 },
  16: { hitp:  2, shock: 95 },
  17: { hitp:  2, shock: 97 },
  18: { hitp:  3, shock: 99 },
  19: { hitp:  3, shock: 99 },
  20: { hitp:  4, shock: 99 },
  21: { hitp:  4, shock: 99 },
  22: { hitp:  5, shock: 99 },
  23: { hitp:  6, shock: 99 },
  24: { hitp:  7, shock: 99 },
  25: { hitp:  8, shock: 99 },
};
```

#### Charisma Table (`cha_app`)

```typescript
interface ChaAppEntry {
  priceModifier: number; // % adjustment to shop prices (negative = discount)
}

export const CHA_APP: Record<number, ChaAppEntry> = {
  0:  { priceModifier:  25 },
  1:  { priceModifier:  20 },
  2:  { priceModifier:  18 },
  3:  { priceModifier:  16 },
  4:  { priceModifier:  14 },
  5:  { priceModifier:  12 },
  6:  { priceModifier:  10 },
  7:  { priceModifier:   8 },
  8:  { priceModifier:   6 },
  9:  { priceModifier:   4 },
  10: { priceModifier:   2 },
  11: { priceModifier:   0 },
  12: { priceModifier:   0 },
  13: { priceModifier:   0 },
  14: { priceModifier:  -1 },
  15: { priceModifier:  -2 },
  16: { priceModifier:  -3 },
  17: { priceModifier:  -4 },
  18: { priceModifier:  -5 },
  19: { priceModifier:  -7 },
  20: { priceModifier:  -9 },
  21: { priceModifier: -11 },
  22: { priceModifier: -13 },
  23: { priceModifier: -15 },
  24: { priceModifier: -18 },
  25: { priceModifier: -25 },
};
```

#### Luck Table (`lck_app`)

```typescript
interface LckAppEntry {
  morale: number;    // Morale modifier for random event rolls
}

export const LCK_APP: Record<number, LckAppEntry> = {
  0:  { morale: -10 },
  1:  { morale:  -8 },
  2:  { morale:  -6 },
  3:  { morale:  -5 },
  4:  { morale:  -4 },
  5:  { morale:  -3 },
  6:  { morale:  -2 },
  7:  { morale:  -1 },
  8:  { morale:   0 },
  9:  { morale:   0 },
  10: { morale:   0 },
  11: { morale:   0 },
  12: { morale:   0 },
  13: { morale:   0 },
  14: { morale:   1 },
  15: { morale:   2 },
  16: { morale:   3 },
  17: { morale:   4 },
  18: { morale:   5 },
  19: { morale:   7 },
  20: { morale:  10 },
  21: { morale:  12 },
  22: { morale:  15 },
  23: { morale:  18 },
  24: { morale:  22 },
  25: { morale:  25 },
};
```

#### Helper Functions

```typescript
/**
 * Clamp a stat value to the valid table range.
 * Replicates legacy URANGE(3, stat, 25) pattern.
 */
function clampStat(value: number): number {
  return Math.max(0, Math.min(25, value));
}

/** Get strength bonuses for a given effective STR value. */
export function getStrApp(str: number): StrAppEntry {
  return STR_APP[clampStat(str)] ?? STR_APP[10];
}

/** Get intelligence bonuses. */
export function getIntApp(int: number): IntAppEntry {
  return INT_APP[clampStat(int)] ?? INT_APP[10];
}

/** Get wisdom bonuses. */
export function getWisApp(wis: number): WisAppEntry {
  return WIS_APP[clampStat(wis)] ?? WIS_APP[10];
}

/** Get dexterity bonuses. */
export function getDexApp(dex: number): DexAppEntry {
  return DEX_APP[clampStat(dex)] ?? DEX_APP[10];
}

/** Get constitution bonuses. */
export function getConApp(con: number): ConAppEntry {
  return CON_APP[clampStat(con)] ?? CON_APP[10];
}

/** Get charisma bonuses. */
export function getChaApp(cha: number): ChaAppEntry {
  return CHA_APP[clampStat(cha)] ?? CHA_APP[10];
}

/** Get luck bonuses. */
export function getLckApp(lck: number): LckAppEntry {
  return LCK_APP[clampStat(lck)] ?? LCK_APP[10];
}

/**
 * Apply all attribute modifiers to derived stats.
 * Called during character loading and after stat-modifying affects change.
 * Replicates legacy reset_char() stat recalculation.
 */
export function applyStatModifiers(ch: Character): void {
  const str = ch.getStr();
  const dex = ch.getDex();
  const con = ch.getCon();

  // Strength affects carry capacity and combat bonuses
  ch.carryWeightMax = getStrApp(str).carry * 10 + ch.level * 25;
  ch.carryNumberMax = ch.level + getDexApp(dex).carry + 10;
}
```

---

## Stacking and Interaction Rules

Document the following stacking and conflict rules for the affect system. These must be enforced by `AffectManager` and the spell functions:

### Duplicate Affect Rejection

Most buffs **reject** duplicate application. When a spell is cast and the target already has an affect of that `type`, the spell function checks `affectManager.isAffectedBy(victim, sn)` and sends:
- Self-target: `"You are already affected by {spellName}.\n"`
- Other target: `"They are already affected by {spellName}.\n"`
- Return `SpellReturn.SpellFailed`.

### Join/Stack Affects

A few affects use `joinAffect()` instead of `addAffect()`, allowing them to extend duration or stack modifiers:
- **Poison stacking:** Multiple poison applications extend duration but do NOT stack the STR penalty.
- **Cure light/serious/critical:** Healing does not use affects (directly modifies HP), so no stacking issue.
- Equipment affects are always additive (each piece contributes independently).

### Mutual Exclusion Rules

| Affect A | Affect B | Rule |
|---|---|---|
| `AFF_HASTE` | `AFF_SLOW` | Cannot coexist. Casting haste on a slowed target strips slow first. Casting slow on a hasted target strips haste first. |
| `AFF_SANCTUARY` | `AFF_FIRESHIELD` | Can coexist. Sanctuary halves base damage; fireshield retaliates separately. |
| `AFF_PROTECT_EVIL` | `AFF_PROTECT_GOOD` | Cannot coexist. Applying one strips the other. |
| `AFF_INVISIBLE` | `AFF_FAERIE_FIRE` | Faerie fire strips invisibility. |
| `AFF_BLIND` | `AFF_TRUESIGHT` | Truesight overrides blind for visibility checks but does NOT remove the blind affect. |
| `AFF_SNEAK` | `AFF_FAERIE_FIRE` | Faerie fire negates sneak (glowing outline visible). |

### Shield Stacking

Damage shields (`AFF_FIRESHIELD`, `AFF_SHOCKSHIELD`, `AFF_ICESHIELD`, `AFF_ACIDMIST`, `AFF_VENOMSHIELD`) can coexist. Each triggers independently when the character is hit in combat:
- Fireshield: `rollDice(1, 6) + Math.floor(ch.level / 10)` fire damage to attacker.
- Shockshield: `rollDice(1, 6) + Math.floor(ch.level / 10)` lightning damage to attacker.
- Iceshield: `rollDice(1, 6) + Math.floor(ch.level / 10)` cold damage to attacker.
- Acidmist: `rollDice(1, 6) + Math.floor(ch.level / 10)` acid damage to attacker.
- Venomshield: `rollDice(1, 6) + Math.floor(ch.level / 10)` poison damage to attacker.

---

## Condition System

Characters have physical conditions tracked as integer values. These interact with the affect system:

### Condition Types

```typescript
export enum ConditionType {
  Drunk       = 0,  // Intoxication level (0-48)
  Full        = 1,  // Hunger satisfaction (0-48, 48 = stuffed)
  Thirst      = 2,  // Thirst satisfaction (0-48, 48 = not thirsty)
  Bloodthirst = 3,  // Vampire blood level (0-10+)
}
```

### `conditionUpdate()` — Called Every `PULSE_TICK`

Replicates legacy condition processing in `update.c`:

1. For each player character:
   - **Drunk:** Decrement by 1 per tick. When reaching 0: `"You feel sober.\n"`.
   - **Full (hunger):** Decrement by 1 per tick. Stages:
     - At 5: `"You are getting hungry.\n"`
     - At 2: `"You are really hungry.\n"`
     - At 0: `"You are STARVING!\n"` — deal `rollDice(1, 4)` damage per tick. No HP regen while starving.
   - **Thirst:** Decrement by 1 per tick. Stages:
     - At 5: `"You are getting thirsty.\n"`
     - At 2: `"You are really thirsty.\n"`
     - At 0: `"You are DYING of THIRST!\n"` — deal `rollDice(1, 4)` damage per tick. No HP regen while dehydrated.
   - **Bloodthirst (vampire):** Decrement by 1 per tick. At 0: `"You are DYING for blood!\n"` — cannot cast spells, movement cost doubled.

2. Immortals (level ≥ `LEVEL_IMMORTAL`) are exempt from hunger/thirst decrements.

### Condition Interaction with Affects

- **Poison affect + hunger:** Poison damage is independent of hunger. Both can deal damage simultaneously.
- **Create food spell:** Sets `Full` condition to `48` (stuffed).
- **Create water / drink:** Sets `Thirst` condition based on liquid amount.
- **Intoxication:** Affects spell casting (higher failure chance) and communication (slurred speech in `say`/`tell` commands — character substitution).

---

## Tests for Sub-Phase 3K

- `tests/unit/entities/Affect.test.ts` — Test `applyTo()` and `removeFrom()` for all `ApplyType` values. Verify STR modifier changes `ch.modStats.str`, AC modifier changes `ch.armor`, bitvector is set/cleared correctly.
- `tests/unit/affects/AffectManager.test.ts` — Comprehensive lifecycle tests:
  - Apply affect → verify stat changed.
  - Remove affect → verify stat reverted.
  - Strip by type → verify all matching affects removed.
  - Join affect → verify duration extended and modifier stacked.
  - Duration decrement → verify countdown works correctly.
  - Expiry → verify affect removed and message sent.
  - Periodic poison → verify damage dealt per tick, death handled.
  - Permanent affect (`duration = -1`) → verify never expires.
  - Bitvector safety: two affects set same flag, remove one → flag still set.
  - `AFF_FLY` removal in air → verify fall damage.
  - `AFF_SLEEP` removal → verify position set to standing.
- `tests/unit/affects/AffectRegistry.test.ts` — Verify all entries have expiry messages. Verify debuff/buff categorization. Verify `getAllDebuffs()` returns expected entries.
- `tests/unit/affects/StatModifier.test.ts` — Test all attribute tables:
  - `STR_APP[18]` → `{ toHit: 2, toDam: 4, carry: 200, wield: 25 }`.
  - `INT_APP[18]` → `{ learn: 40, mana: 8 }`.
  - `CON_APP[18]` → `{ hitp: 3, shock: 99 }`.
  - `DEX_APP[15]` → `{ defensive: -10, carry: 2, toHit: 1 }`.
  - Out-of-range clamping: `getStrApp(30)` → uses value at 25.
  - `getStrApp(-1)` → uses value at 0.
- `tests/unit/affects/Conditions.test.ts` — Test condition update:
  - Hunger decrement to 0 → damage dealt.
  - Thirst warning messages at thresholds.
  - Immortal exemption.
  - Drunk decrement to 0 → sober message.
- `tests/integration/AffectCombatIntegration.test.ts` — Full integration:
  - Cast sanctuary → verify `AFF_SANCTUARY` set → take combat damage → verify halved.
  - Cast poison → verify periodic tick damage → cure poison → verify damage stops.
  - Equip +2 STR ring → verify `ch.getStr()` increases → remove ring → verify reverts.
  - Cast haste on slowed target → verify slow stripped, haste applied.
  - Dispel magic → verify random buff removed.

---

## Acceptance Criteria

- [ ] `Affect.applyTo()` correctly modifies all stat types (STR through SaveSpell, hitroll, damroll, AC).
- [ ] `Affect.removeFrom()` correctly reverses all stat modifications.
- [ ] `AffectManager.addAffect()` pushes affect, applies stats, sets bitvector, handles `AFF_SLEEP`/`AFF_FLY` side effects.
- [ ] `AffectManager.removeAffect()` reverses stats, only clears bitvector flag if no other affect sets it.
- [ ] `AffectManager.joinAffect()` extends duration and stacks modifiers for matching affects.
- [ ] `AffectManager.stripAffects()` removes all affects of a given spell type.
- [ ] `affectUpdate()` decrements durations, sends warning messages at 1 tick remaining, sends expiry messages, removes expired affects.
- [ ] Poison periodic effect deals `rollDice(2, 4)` damage per tick. Character can die from poison.
- [ ] Permanent affects (duration = -1) are never decremented or expired.
- [ ] Equipment affects apply on equip and remove on unequip with correct stat changes.
- [ ] `AFF_HASTE` and `AFF_SLOW` are mutually exclusive — applying one strips the other.
- [ ] `AFF_FAERIE_FIRE` strips `AFF_INVISIBLE`.
- [ ] Damage shields (fireshield, etc.) trigger independently when character is hit.
- [ ] All `STR_APP` through `LCK_APP` tables match legacy values.
- [ ] Condition system: hunger/thirst decrement per tick, damage at 0, immortal exemption.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
