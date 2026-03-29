# SMAUG 2.0 TypeScript Port — Phase 3R: MUDprog Scripting System — Script Engine, Triggers, Ifchecks, Variable Substitution, and Scripting Commands

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

**Sub-Phases 3A–3Q** are complete. The following files are fully implemented and may be imported:

### From Sub-Phase 3A (Utilities, World Loader, Command Parser)
- `src/utils/AnsiColors.ts`, `src/utils/Dice.ts`, `src/utils/BitVector.ts`, `src/utils/StringUtils.ts`
- `src/game/world/AreaManager.ts`, `src/game/world/VnumRegistry.ts`, `src/game/world/ResetEngine.ts`
- `src/game/commands/CommandRegistry.ts`, `src/game/commands/social.ts`
- `src/network/ConnectionManager.ts` — Full nanny state machine, output pager

### From Sub-Phase 3B (Movement, Look, Combat)
- `src/game/commands/movement.ts` — `moveChar()`, direction commands, door commands, `doRecall()`, `doFlee()`
- `src/game/commands/information.ts` — `doLook()`, `doExamine()`, `doScore()`, `doWho()`, `doHelp()`, `doAffects()`, `doEquipment()`, `doInventory()`, `doConsider()`
- `src/game/combat/CombatEngine.ts` — `violenceUpdate()`, `multiHit()`, `oneHit()`, `inflictDamage()`, `startCombat()`, `stopFighting()`
- `src/game/combat/DamageCalculator.ts`, `src/game/combat/DeathHandler.ts`
- `src/game/commands/combat.ts` — All combat skill commands
- `src/game/entities/Character.ts` — Regeneration, position update, char update

### From Sub-Phase 3C (Magic, Skills, Affects)
- `src/game/spells/SpellEngine.ts` — Full casting pipeline, `castSpell()`
- `src/game/spells/SpellRegistry.ts` — 40+ spell definitions
- `src/game/spells/SavingThrows.ts`, `src/game/spells/ComponentSystem.ts`
- `src/game/commands/magic.ts` — `doCast()`, `doBrandish()`, `doZap()`, `doQuaff()`, `doRecite()`, `doPractice()`
- `src/game/affects/AffectManager.ts` — `applyAffect()`, `removeAffect()`, `stripAffect()`, `affectUpdate()`
- `src/game/affects/AffectRegistry.ts`, `src/game/affects/StatModifier.ts`

### From Sub-Phase 3D (Inventory, Economy, Progression)
- `src/game/commands/objects.ts` — `doGet()`, `doDrop()`, `doPut()`, `doGive()`, `doWear()`, `doRemove()`, `doEat()`, `doDrink()`, `doSacrifice()`
- `src/game/economy/Currency.ts`, `src/game/economy/ShopSystem.ts`, `src/game/economy/AuctionSystem.ts`, `src/game/economy/BankSystem.ts`
- `src/game/entities/Player.ts` — `gainXp()`, `advanceLevel()`, `xpToNextLevel()`
- `src/game/entities/tables.ts` — Race and class tables

### From Sub-Phases 3E–3Q (Perception, Communication, Social, Persistence, etc.)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.
- `src/persistence/PlayerRepository.ts` — Full save/load via Prisma
- `src/persistence/WorldRepository.ts` — Area save, world state snapshots

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3R Objective

Implement the complete MUDprog scripting system: the line-based script execution engine with if/or/else/endif conditionals, the full library of 50+ ifcheck conditions, variable substitution for `$n/$N/$i/$I/$t/$T/$r/$R/$p/$P` and pronoun variables, the trigger dispatcher that wires MUDprog triggers into all existing game systems (movement, combat, communication, inventory, etc.), the supermob abstraction for object and room programs, the `mpsleep` pause/resume mechanism, runtime entity modification commands (`mpmset`/`mposet`), and all mp-prefixed scripting commands. After this sub-phase, NPCs can execute scripted behaviours triggered by player actions — quest mobs that check conditions, shopkeepers that banter, trap rooms that fire on entry, and scripted boss encounters. This replicates the legacy `mud_prog.c`, `mpxset.c`, `mprog_driver()`, `mprog_do_command()`, `mprog_do_ifcheck()`, and `mprog_translate()`.

---

## Files to Implement

### 1. `src/scripting/VariableSubstitution.ts` — MUDprog Variable Expansion

Standalone module for `$`-variable substitution. Used by both the MUDprog engine and the social command display system. Replicates legacy `mprog_translate()` from `mud_prog.c`:

#### 1.1 Context Interface

```typescript
import { Character } from '../game/entities/Character';
import { Mobile } from '../game/entities/Mobile';
import { GameObject } from '../game/entities/GameObject';
import { Room } from '../game/entities/Room';

export interface MudProgContext {
  /** The executing mob (or supermob for obj/room progs). */
  mob: Mobile;
  /** The actor that triggered the prog (e.g., player who entered room). */
  actor: Character | null;
  /** The victim/secondary target. */
  victim: Character | null;
  /** The object involved in the trigger. */
  obj: GameObject | null;
  /** The target character (for targeted triggers). */
  target: Character | null;
  /** The room where the trigger fired. */
  room: Room | null;
}
```

#### 1.2 `substituteVariables(line, context): string`

Implement the full variable substitution table. Replicates legacy `mprog_translate()`:

```typescript
export function substituteVariables(line: string, ctx: MudProgContext): string {
  let result = '';
  let i = 0;

  while (i < line.length) {
    if (line[i] === '$' && i + 1 < line.length) {
      const varChar = line[i + 1];
      const replacement = resolveVariable(varChar, ctx);
      if (replacement !== null) {
        result += replacement;
        i += 2;
        continue;
      }
    }
    result += line[i];
    i++;
  }

  return result;
}
```

**`resolveVariable(varChar, ctx)` — Complete variable table:**

| Variable | Resolution | Safety Check |
|---|---|---|
| `$n` | `ctx.actor?.name ?? 'someone'` | Check `charDied(ctx.actor)` → return `'someone'` |
| `$N` | `ctx.actor?.shortDescription ?? 'someone'` | Same |
| `$i` | `ctx.mob.name` | Always present |
| `$I` | `ctx.mob.shortDescription` | Always present |
| `$t` | `ctx.victim?.name ?? 'someone'` | Check `charDied(ctx.victim)` |
| `$T` | `ctx.victim?.shortDescription ?? 'someone'` | Same |
| `$r` | Random PC in `ctx.mob.inRoom` name, or `'someone'` | Pick random from room occupants where `!isNpc` |
| `$R` | Random PC in room short description, or `'someone'` | Same |
| `$p` | `ctx.obj?.name ?? 'something'` | Check `objExtracted(ctx.obj)` |
| `$P` | `ctx.obj?.shortDescription ?? 'something'` | Same |
| `$e` | `heShePronoun(ctx.actor)` → `'he'`/`'she'`/`'it'` | Based on `actor.sex` |
| `$m` | `himHerPronoun(ctx.actor)` → `'him'`/`'her'`/`'it'` | Same |
| `$s` | `hisHerPronoun(ctx.actor)` → `'his'`/`'her'`/`'its'` | Same |
| `$E` | `heShePronoun(ctx.victim)` | Based on `victim.sex` |
| `$M` | `himHerPronoun(ctx.victim)` | Same |
| `$S` | `hisHerPronoun(ctx.victim)` | Same |
| `$j` | `heShePronoun(ctx.mob)` | Based on `mob.sex` |
| `$k` | `himHerPronoun(ctx.mob)` | Same |
| `$l` | `hisHerPronoun(ctx.mob)` | Same |
| `$J` | `heShePronoun(randomPC)` | Random PC in room |
| `$K` | `himHerPronoun(randomPC)` | Same |
| `$L` | `hisHerPronoun(randomPC)` | Same |
| `$a` | `aOrAn(ctx.obj?.name)` + `' '` + `ctx.obj?.name` | Article + object |
| `$A` | `aOrAn(ctx.obj?.shortDescription)` + `' '` + short desc | Same |
| `$$` | `'$'` | Literal dollar sign |

**Pronoun helper functions:**

```typescript
function heShePronoun(ch: Character | null): string {
  if (!ch) return 'it';
  switch (ch.sex) {
    case 1: return 'he';   // SEX_MALE
    case 2: return 'she';  // SEX_FEMALE
    default: return 'it';  // SEX_NEUTRAL
  }
}

function himHerPronoun(ch: Character | null): string {
  if (!ch) return 'it';
  switch (ch.sex) {
    case 1: return 'him';
    case 2: return 'her';
    default: return 'it';
  }
}

function hisHerPronoun(ch: Character | null): string {
  if (!ch) return 'its';
  switch (ch.sex) {
    case 1: return 'his';
    case 2: return 'her';
    default: return 'its';
  }
}
```

**Random PC selection:**

```typescript
function getRandomPC(room: Room | null): Character | null {
  if (!room) return null;
  const pcs = room.characters.filter(ch => !ch.isNpc);
  if (pcs.length === 0) return null;
  return pcs[Math.floor(Math.random() * pcs.length)];
}
```

**Entity existence checks** — Before using any actor/victim/obj reference, check that the entity still exists (wasn't extracted during prog execution):

```typescript
export function charDied(ch: Character | null): boolean {
  if (!ch) return true;
  return ch.extracted ?? false;
}

export function objExtracted(obj: GameObject | null): boolean {
  if (!obj) return true;
  return obj.extracted ?? false;
}
```

---

### 2. `src/scripting/IfcheckRegistry.ts` — Ifcheck Function Registry

Register all 50+ ifcheck functions as a `Map<string, IfcheckFunction>`. Replicates legacy `mprog_do_ifcheck()` from `mud_prog.c`. Each ifcheck evaluates a condition about a target entity and returns `boolean`:

#### 2.1 Ifcheck Function Signature

```typescript
import { Character } from '../game/entities/Character';
import { GameObject } from '../game/entities/GameObject';
import { MudProgContext } from './VariableSubstitution';

export type IfcheckTarget = Character | GameObject | null;

export type IfcheckFunction = (
  target: IfcheckTarget,
  operator: string | undefined,
  value: string | undefined,
  context: MudProgContext
) => boolean;

export class IfcheckRegistry {
  private static readonly checks = new Map<string, IfcheckFunction>();

  static register(name: string, fn: IfcheckFunction): void {
    IfcheckRegistry.checks.set(name.toLowerCase(), fn);
  }

  static get(name: string): IfcheckFunction | undefined {
    return IfcheckRegistry.checks.get(name.toLowerCase());
  }

  static has(name: string): boolean {
    return IfcheckRegistry.checks.has(name.toLowerCase());
  }
}
```

#### 2.2 Comparison Helpers

```typescript
function compareNumber(actual: number, operator: string | undefined, expected: string | undefined): boolean {
  const val = parseInt(expected ?? '0', 10);
  switch (operator) {
    case '==': return actual === val;
    case '!=': return actual !== val;
    case '>':  return actual > val;
    case '<':  return actual < val;
    case '>=': return actual >= val;
    case '<=': return actual <= val;
    default:   return actual !== 0; // No operator: treat as boolean (non-zero = true)
  }
}

function compareString(actual: string, operator: string | undefined, expected: string | undefined): boolean {
  const exp = expected ?? '';
  switch (operator) {
    case '==': return actual.toLowerCase() === exp.toLowerCase();
    case '!=': return actual.toLowerCase() !== exp.toLowerCase();
    case '/':  return actual.toLowerCase().includes(exp.toLowerCase());  // Substring match
    case '!/': return !actual.toLowerCase().includes(exp.toLowerCase()); // No substring
    default:   return actual.length > 0;
  }
}
```

#### 2.3 Character Ifchecks — Register All

Implement each ifcheck as a separate registered function. The complete list from the legacy `mprog_do_ifcheck()`:

```typescript
// ─── Boolean Checks (no operator/value) ───

IfcheckRegistry.register('ispc', (target) => {
  return target instanceof Character && !target.isNpc;
});

IfcheckRegistry.register('isnpc', (target) => {
  return target instanceof Character && target.isNpc;
});

IfcheckRegistry.register('isgood', (target) => {
  return target instanceof Character && target.alignment >= 350;
});

IfcheckRegistry.register('isevil', (target) => {
  return target instanceof Character && target.alignment <= -350;
});

IfcheckRegistry.register('isneutral', (target) => {
  return target instanceof Character && target.alignment > -350 && target.alignment < 350;
});

IfcheckRegistry.register('isfight', (target) => {
  return target instanceof Character && target.fighting !== null;
});

IfcheckRegistry.register('isimmort', (target) => {
  return target instanceof Character && target.getTrust() >= 50; // LEVEL_AVATAR
});

IfcheckRegistry.register('ischarmed', (target) => {
  if (!(target instanceof Character)) return false;
  return (target.affectedBy & AFF_CHARM) !== 0n;
});

IfcheckRegistry.register('isfollow', (target) => {
  return target instanceof Character && target.master !== null;
});

IfcheckRegistry.register('ispkill', (target) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  return (target.pcData?.flags ?? 0) & PCFLAG_DEADLY ? true : false;
});

IfcheckRegistry.register('isdevoted', (target) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  return !!target.pcData?.deityName;
});

IfcheckRegistry.register('canpkill', (target) => {
  if (!(target instanceof Character)) return false;
  if (target.isNpc) return false;
  return target.level >= 5 && ((target.pcData?.flags ?? 0) & PCFLAG_DEADLY) !== 0;
});
```

```typescript
// ─── Numeric Comparison Checks ───

IfcheckRegistry.register('level', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.level, op, val);
});

IfcheckRegistry.register('hitprcnt', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  const pct = Math.floor((target.hit * 100) / Math.max(1, target.maxHit));
  return compareNumber(pct, op, val);
});

IfcheckRegistry.register('hps', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.hit, op, val);
});

IfcheckRegistry.register('mana', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.mana, op, val);
});

IfcheckRegistry.register('goldamt', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.gold, op, val);
});

IfcheckRegistry.register('sex', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.sex, op, val);
});

IfcheckRegistry.register('position', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.position, op, val);
});

IfcheckRegistry.register('class', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.class_, op, val);
});

IfcheckRegistry.register('race', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.race, op, val);
});

IfcheckRegistry.register('alignment', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.alignment, op, val);
});

IfcheckRegistry.register('favor', (target, op, val) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  return compareNumber(target.pcData?.favour ?? 0, op, val);
});

IfcheckRegistry.register('number', (target, op, val) => {
  if (!(target instanceof Character) || !target.isNpc) return false;
  return compareNumber(target.pIndexData?.vnum ?? 0, op, val);
});
```

```typescript
// ─── Stat Checks ───

IfcheckRegistry.register('str', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.getStr(), op, val);
});

IfcheckRegistry.register('int', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.getInt(), op, val);
});

IfcheckRegistry.register('wis', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.getWis(), op, val);
});

IfcheckRegistry.register('dex', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.getDex(), op, val);
});

IfcheckRegistry.register('con', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.getCon(), op, val);
});

IfcheckRegistry.register('cha', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.getCha(), op, val);
});

IfcheckRegistry.register('lck', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.getLck(), op, val);
});
```

```typescript
// ─── String / Name Checks ───

IfcheckRegistry.register('name', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareString(target.name, op, val);
});

IfcheckRegistry.register('clan', (target, op, val) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  return compareString(target.pcData?.clanName ?? '', op, val);
});

IfcheckRegistry.register('clantype', (target, op, val) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  // Resolve clan type from ClanSystem
  const clanName = target.pcData?.clanName;
  if (!clanName) return false;
  // 0=clan, 1=guild, 2=order
  return compareNumber(getClanType(clanName), op, val);
});

IfcheckRegistry.register('council', (target, op, val) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  return compareString(target.pcData?.councilName ?? '', op, val);
});

IfcheckRegistry.register('deity', (target, op, val) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  return compareString(target.pcData?.deityName ?? '', op, val);
});
```

```typescript
// ─── Affect Checks ───

IfcheckRegistry.register('isaffected', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  const flag = BigInt(val ?? '0');
  return (target.affectedBy & flag) !== 0n;
});

IfcheckRegistry.register('wearing', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  // Check if wearing an object whose name matches val
  for (const [, obj] of target.equipment) {
    if (obj.name.toLowerCase().includes((val ?? '').toLowerCase())) return true;
  }
  return false;
});

IfcheckRegistry.register('wearingvnum', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  const vnum = parseInt(val ?? '0', 10);
  for (const [, obj] of target.equipment) {
    if (obj.pIndexData?.vnum === vnum) return true;
  }
  return false;
});

IfcheckRegistry.register('carryingvnum', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  const vnum = parseInt(val ?? '0', 10);
  for (const obj of target.carrying) {
    if (obj.pIndexData?.vnum === vnum) return true;
  }
  return false;
});

IfcheckRegistry.register('numfighting', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.numFighting ?? 0, op, val);
});

IfcheckRegistry.register('waitstate', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  return compareNumber(target.wait ?? 0, op, val);
});
```

```typescript
// ─── Object Checks ───

IfcheckRegistry.register('objtype', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.itemType, op, val);
});

IfcheckRegistry.register('objval0', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.values[0] ?? 0, op, val);
});

IfcheckRegistry.register('objval1', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.values[1] ?? 0, op, val);
});

IfcheckRegistry.register('objval2', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.values[2] ?? 0, op, val);
});

IfcheckRegistry.register('objval3', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.values[3] ?? 0, op, val);
});

IfcheckRegistry.register('objval4', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.values[4] ?? 0, op, val);
});

IfcheckRegistry.register('objval5', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.values[5] ?? 0, op, val);
});

IfcheckRegistry.register('leverpos', (target, op, val) => {
  if (!(target instanceof GameObject)) return false;
  return compareNumber(target.values[0] ?? 0, op, val);
});
```

```typescript
// ─── Room / Environment Checks ───

IfcheckRegistry.register('inroom', (target, op, val, ctx) => {
  const room = (target instanceof Character) ? target.inRoom : ctx.room;
  if (!room) return false;
  return compareNumber(room.vnum, op, val);
});

IfcheckRegistry.register('inarea', (target, op, val, ctx) => {
  const room = (target instanceof Character) ? target.inRoom : ctx.room;
  if (!room || !room.area) return false;
  return compareString(room.area.filename, op, val);
});

IfcheckRegistry.register('indoors', (target, op, val, ctx) => {
  const room = (target instanceof Character) ? target.inRoom : ctx.room;
  if (!room) return false;
  return (room.flags & ROOM_INDOORS) !== 0n;
});

IfcheckRegistry.register('nomagic', (target, op, val, ctx) => {
  const room = (target instanceof Character) ? target.inRoom : ctx.room;
  if (!room) return false;
  return (room.flags & ROOM_NO_MAGIC) !== 0n;
});

IfcheckRegistry.register('safe', (target, op, val, ctx) => {
  const room = (target instanceof Character) ? target.inRoom : ctx.room;
  if (!room) return false;
  return (room.flags & ROOM_SAFE) !== 0n;
});

IfcheckRegistry.register('economy', (target, op, val, ctx) => {
  const room = (target instanceof Character) ? target.inRoom : ctx.room;
  if (!room || !room.area) return false;
  return compareNumber(room.area.economy ?? 0, op, val);
});
```

```typescript
// ─── Counting Checks ───

IfcheckRegistry.register('mobinroom', (target, op, val, ctx) => {
  const vnum = parseInt(val ?? '0', 10);
  const room = ctx.mob.inRoom;
  if (!room) return false;
  const count = room.characters.filter(ch => ch.isNpc && ch.pIndexData?.vnum === vnum).length;
  return compareNumber(count, op ?? '>', '0');
});

IfcheckRegistry.register('mobinarea', (target, op, val, ctx) => {
  const vnum = parseInt(val ?? '0', 10);
  const area = ctx.mob.inRoom?.area;
  if (!area) return false;
  let count = 0;
  for (const room of area.rooms) {
    count += room.characters.filter(ch => ch.isNpc && ch.pIndexData?.vnum === vnum).length;
  }
  return compareNumber(count, op ?? '>', '0');
});

IfcheckRegistry.register('mobinworld', (target, op, val) => {
  const vnum = parseInt(val ?? '0', 10);
  const proto = VnumRegistry.getMobile(vnum);
  if (!proto) return false;
  return compareNumber(proto.instanceCount ?? 0, op ?? '>', '0');
});

IfcheckRegistry.register('objinroom', (target, op, val, ctx) => {
  const vnum = parseInt(val ?? '0', 10);
  const room = ctx.mob.inRoom;
  if (!room) return false;
  const count = room.objects.filter(o => o.pIndexData?.vnum === vnum).length;
  return compareNumber(count, op ?? '>', '0');
});

IfcheckRegistry.register('objinworld', (target, op, val) => {
  const vnum = parseInt(val ?? '0', 10);
  const proto = VnumRegistry.getObject(vnum);
  if (!proto) return false;
  return compareNumber(proto.instanceCount ?? 0, op ?? '>', '0');
});

IfcheckRegistry.register('ovnumhere', (target, op, val, ctx) => {
  const vnum = parseInt(val ?? '0', 10);
  const room = ctx.mob.inRoom;
  if (!room) return false;
  // Check room objects + carried by characters in room
  for (const obj of room.objects) {
    if (obj.pIndexData?.vnum === vnum) return true;
  }
  for (const ch of room.characters) {
    for (const obj of ch.carrying) {
      if (obj.pIndexData?.vnum === vnum) return true;
    }
  }
  return false;
});

IfcheckRegistry.register('ovnumcarry', (target, op, val, ctx) => {
  if (!(target instanceof Character)) return false;
  const vnum = parseInt(val ?? '0', 10);
  for (const obj of target.carrying) {
    if (obj.pIndexData?.vnum === vnum) return true;
  }
  return false;
});

IfcheckRegistry.register('ovnumwear', (target, op, val) => {
  if (!(target instanceof Character)) return false;
  const vnum = parseInt(val ?? '0', 10);
  for (const [, obj] of target.equipment) {
    if (obj.pIndexData?.vnum === vnum) return true;
  }
  return false;
});

IfcheckRegistry.register('mortcount', (target, op, val, ctx) => {
  const room = ctx.mob.inRoom;
  if (!room) return false;
  const count = room.characters.filter(ch => !ch.isNpc && ch.getTrust() < 50).length;
  return compareNumber(count, op, val);
});

IfcheckRegistry.register('mobcount', (target, op, val, ctx) => {
  const room = ctx.mob.inRoom;
  if (!room) return false;
  const count = room.characters.filter(ch => ch.isNpc).length;
  return compareNumber(count, op, val);
});

IfcheckRegistry.register('charcount', (target, op, val, ctx) => {
  const room = ctx.mob.inRoom;
  if (!room) return false;
  return compareNumber(room.characters.length, op, val);
});

IfcheckRegistry.register('objexists', (target, op, val) => {
  const vnum = parseInt(val ?? '0', 10);
  const proto = VnumRegistry.getObject(vnum);
  return proto !== null && proto !== undefined;
});
```

```typescript
// ─── Special Checks ───

IfcheckRegistry.register('rand', (target, op, val) => {
  const chance = parseInt(val ?? '50', 10);
  return Math.random() * 100 < chance;
});

IfcheckRegistry.register('cansee', (target, op, val, ctx) => {
  if (!(target instanceof Character)) return false;
  // Check if the mob can see the target
  return VisibilityManager.canSeeChar(ctx.mob, target);
});

IfcheckRegistry.register('isopen', (target, op, val, ctx) => {
  // Check if exit in direction val is open
  const dir = parseInt(val ?? '0', 10);
  const room = ctx.mob.inRoom;
  if (!room) return false;
  const exit = room.exits[dir];
  if (!exit) return false;
  return (exit.flags & EX_CLOSED) === 0n;
});

IfcheckRegistry.register('islocked', (target, op, val, ctx) => {
  const dir = parseInt(val ?? '0', 10);
  const room = ctx.mob.inRoom;
  if (!room) return false;
  const exit = room.exits[dir];
  if (!exit) return false;
  return (exit.flags & EX_LOCKED) !== 0n;
});

IfcheckRegistry.register('isday', () => {
  // Game time: day = hours 6-20
  const hour = getGameHour();
  return hour >= 6 && hour <= 20;
});

IfcheckRegistry.register('isnight', () => {
  const hour = getGameHour();
  return hour < 6 || hour > 20;
});

IfcheckRegistry.register('timeis', (target, op, val) => {
  const hour = getGameHour();
  return compareNumber(hour, op, val);
});

IfcheckRegistry.register('multi', (target, op, val) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  // Check if player is multiclassed — number of classes
  return compareNumber(target.pcData?.multiClass ?? 1, op, val);
});

IfcheckRegistry.register('isnuisance', (target) => {
  if (!(target instanceof Character) || target.isNpc) return false;
  return (target.pcData?.flags ?? 0) & PCFLAG_NUISANCE ? true : false;
});

IfcheckRegistry.register('vession', (target, op, val) => {
  // Version session — returns descriptor version (protocol version)
  if (!(target instanceof Character)) return false;
  return compareNumber(target.descriptor?.version ?? 0, op, val);
});

IfcheckRegistry.register('gession', (target, op, val) => {
  // Gression — global session count
  if (!(target instanceof Character)) return false;
  return compareNumber(target.descriptor?.sessionId ?? 0, op, val);
});
```

---

### 3. `src/scripting/MudProgEngine.ts` — MUDprog Script Execution Engine

Implement the complete MUDprog execution engine. Replicates legacy `mprog_driver()` from `mud_prog.c`:

#### 3.1 Trigger Types Enum

```typescript
export enum MudProgTrigger {
  // ─── Mob triggers ───
  ActProg          = 'ACT_PROG',
  AllGreetProg     = 'ALL_GREET_PROG',
  BribeGoldProg    = 'BRIBE_GOLD_PROG',
  BribeSilverProg  = 'BRIBE_SILVER_PROG',
  BribeCopperProg  = 'BRIBE_COPPER_PROG',
  CmdProg          = 'CMD_PROG',
  DeathProg        = 'DEATH_PROG',
  EntryProg        = 'ENTRY_PROG',
  FightProg        = 'FIGHT_PROG',
  GiveProg         = 'GIVE_PROG',
  GreetProg        = 'GREET_PROG',
  GreetInFightProg = 'GREET_IN_FIGHT_PROG',
  HitPrcntProg     = 'HITPRCNT_PROG',
  HourProg         = 'HOUR_PROG',
  LoginProg        = 'LOGIN_PROG',
  RandProg         = 'RAND_PROG',
  SellProg         = 'SELL_PROG',
  SpeechProg       = 'SPEECH_PROG',
  TellProg         = 'TELL_PROG',
  TimeProg         = 'TIME_PROG',
  ScriptProg       = 'SCRIPT_PROG',
  VoidProg         = 'VOID_PROG',

  // ─── Object triggers ───
  DropProg         = 'DROP_PROG',
  ExamineProg      = 'EXA_PROG',
  GetProg          = 'GET_PROG',
  PullProg         = 'PULL_PROG',
  PushProg         = 'PUSH_PROG',
  UseProg          = 'USE_PROG',
  WearProg         = 'WEAR_PROG',
  RemoveProg       = 'REMOVE_PROG',
  ZapProg          = 'ZAP_PROG',
  DamageProg       = 'DAMAGE_PROG',
  SacProg          = 'SAC_PROG',
  RepairProg       = 'REPAIR_PROG',
  LookProg         = 'LOOK_PROG',

  // ─── Room triggers ───
  EnterProg        = 'ENTER_PROG',
  LeaveProg        = 'LEAVE_PROG',
  RFightProg       = 'RFIGHT_PROG',
  RDeathProg       = 'RDEATH_PROG',
  RestProg         = 'REST_PROG',
  SleepProg        = 'SLEEP_PROG',
  ImmInfoProg      = 'IMMINFO_PROG',
}
```

#### 3.2 MUDprog Data Structure

```typescript
export interface MudProgData {
  trigger: MudProgTrigger;
  argList: string;       // Trigger argument (e.g., keyword for SPEECH_PROG, percentage for RAND_PROG)
  commandList: string;   // The script body (multi-line, newline-separated)
}
```

#### 3.3 Sleep State for `mpsleep`

```typescript
export interface MpSleepData {
  /** The mob that is sleeping. */
  mob: Mobile;
  /** Remaining lines to execute after waking. */
  remainingLines: string[];
  /** Current if-state stack when sleep was invoked. */
  ifState: boolean[];
  /** Current if-level when sleep was invoked. */
  ifLevel: number;
  /** Timer in pulses until wake. */
  timer: number;
  /** The context at time of sleep. */
  context: MudProgContext;
}
```

#### 3.4 `MudProgEngine` Class

```typescript
import { substituteVariables, charDied, objExtracted, MudProgContext } from './VariableSubstitution';
import { IfcheckRegistry, IfcheckTarget } from './IfcheckRegistry';
import { CommandRegistry } from '../game/commands/CommandRegistry';
import { Logger } from '../utils/Logger';
import { EventBus, GameEvent } from '../core/EventBus';

export class MudProgEngine {
  private static readonly MAX_IFS = 20;
  private static readonly MAX_PROG_NEST = 20;
  private static nestLevel = 0;

  private readonly log = Logger.getLogger('mudprog');

  /** Global list of sleeping programs awaiting resume. */
  private sleepingProgs: MpSleepData[] = [];
}
```

#### 3.5 `execute(prog, context): void` — Main Execution Loop

Replicates legacy `mprog_driver()`:

```typescript
execute(prog: MudProgData, context: MudProgContext): void {
  // Nesting guard
  if (MudProgEngine.nestLevel >= MudProgEngine.MAX_PROG_NEST) {
    this.progbug('Max nesting exceeded', context);
    return;
  }
  MudProgEngine.nestLevel++;

  try {
    const lines = prog.commandList.split('\n');
    this.executeLines(lines, 0, context);
  } finally {
    MudProgEngine.nestLevel--;
  }
}

private executeLines(
  lines: string[],
  startIndex: number,
  context: MudProgContext
): void {
  const ifState: boolean[] = new Array(MudProgEngine.MAX_IFS).fill(true);
  let ifLevel = 0;
  let silentMode = false;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // ─── Directive: silent ───
    if (rawLine === 'silent') {
      silentMode = true;
      continue;
    }

    // ─── Directive: break ───
    if (rawLine === 'break') {
      break;
    }

    // ─── Directive: mpsleep <pulses> ───
    if (rawLine.startsWith('mpsleep ')) {
      const pulses = parseInt(rawLine.substring(8).trim(), 10);
      if (!isNaN(pulses) && pulses > 0) {
        this.sleepingProgs.push({
          mob: context.mob,
          remainingLines: lines.slice(i + 1),
          ifState: [...ifState],
          ifLevel,
          timer: pulses,
          context: { ...context },
        });
      }
      return; // Stop execution until wake
    }

    // ─── Conditional: if <condition> ───
    if (rawLine.startsWith('if ')) {
      ifLevel++;
      if (ifLevel >= MudProgEngine.MAX_IFS) {
        this.progbug('Max if-nesting exceeded', context);
        break;
      }
      if (ifState[ifLevel - 1]) {
        // Only evaluate if outer scope is true
        ifState[ifLevel] = this.evaluateIfcheck(rawLine.substring(3).trim(), context);
      } else {
        ifState[ifLevel] = false;
      }
      continue;
    }

    // ─── Conditional: or <condition> ───
    if (rawLine.startsWith('or ')) {
      if (ifLevel <= 0) {
        this.progbug('"or" without "if"', context);
        continue;
      }
      if (!ifState[ifLevel] && ifState[ifLevel - 1]) {
        ifState[ifLevel] = this.evaluateIfcheck(rawLine.substring(3).trim(), context);
      }
      continue;
    }

    // ─── Conditional: else ───
    if (rawLine === 'else') {
      if (ifLevel <= 0) {
        this.progbug('"else" without "if"', context);
        continue;
      }
      if (ifState[ifLevel - 1]) {
        ifState[ifLevel] = !ifState[ifLevel];
      }
      continue;
    }

    // ─── Conditional: endif ───
    if (rawLine === 'endif') {
      if (ifLevel <= 0) {
        this.progbug('"endif" without "if"', context);
        continue;
      }
      ifLevel--;
      continue;
    }

    // ─── Command execution ───
    if (ifState[ifLevel]) {
      const expanded = substituteVariables(rawLine, context);

      if (silentMode) {
        // Suppress output during this command
        context.mob.suppressOutput = true;
      }

      // Execute the command as the mob
      CommandRegistry.interpret(context.mob, expanded);

      if (silentMode) {
        context.mob.suppressOutput = false;
        silentMode = false;
      }

      // Safety: check if mob died during command execution
      if (charDied(context.mob)) return;
    }
  }
}
```

#### 3.6 `evaluateIfcheck(condition, context): boolean`

Parse the ifcheck format and delegate to the `IfcheckRegistry`. Replicates legacy `mprog_do_ifcheck()`:

```typescript
private evaluateIfcheck(condition: string, ctx: MudProgContext): boolean {
  // Format: checkname($var) [operator value]
  // or:     checkname($var)
  // or:     checkname(value)
  const match = condition.match(
    /^(\w+)\((\$\w|[^)]*)\)\s*(?:(==|!=|>=|<=|>|<|\/|!\/|&|\|)\s*(.+))?$/
  );

  if (!match) {
    this.progbug(`Bad ifcheck syntax: ${condition}`, ctx);
    return false;
  }

  const [, checkName, targetArg, operator, value] = match;

  // Resolve target
  const target = this.resolveTarget(targetArg.trim(), ctx);

  // Look up ifcheck
  const checkFn = IfcheckRegistry.get(checkName);
  if (!checkFn) {
    this.progbug(`Unknown ifcheck: ${checkName}`, ctx);
    return false;
  }

  try {
    return checkFn(target, operator, value?.trim(), ctx);
  } catch (err) {
    this.progbug(`Ifcheck error in ${checkName}: ${err}`, ctx);
    return false;
  }
}
```

#### 3.7 `resolveTarget(varName, context): IfcheckTarget`

```typescript
private resolveTarget(varName: string, ctx: MudProgContext): IfcheckTarget {
  switch (varName) {
    case '$n': return ctx.actor;
    case '$i': return ctx.mob;
    case '$t': return ctx.victim;
    case '$r': {
      // Random PC in room
      const room = ctx.mob.inRoom;
      if (!room) return null;
      const pcs = room.characters.filter(ch => !ch.isNpc);
      return pcs.length > 0 ? pcs[Math.floor(Math.random() * pcs.length)] : null;
    }
    case '$p': return ctx.obj;
    case '$o': return ctx.obj; // Alias
    default:
      // Could be a literal value (e.g., for objexists check)
      return null;
  }
}
```

#### 3.8 `mprogUpdate(): void` — Process Sleeping Programs

Called every `PULSE_MOBILE` (16 pulses = 4 seconds). Decrements sleep timers and resumes expired progs:

```typescript
mprogUpdate(): void {
  const stillSleeping: MpSleepData[] = [];

  for (const sleep of this.sleepingProgs) {
    sleep.timer--;

    if (sleep.timer <= 0) {
      // Resume execution
      if (!charDied(sleep.mob)) {
        this.executeLines(sleep.remainingLines, 0, sleep.context);
      }
    } else {
      stillSleeping.push(sleep);
    }
  }

  this.sleepingProgs = stillSleeping;
}
```

#### 3.9 Error Reporting

```typescript
private progbug(message: string, ctx: MudProgContext): void {
  const vnum = ctx.mob.pIndexData?.vnum ?? 0;
  const room = ctx.mob.inRoom?.vnum ?? 0;
  this.log.error(`PROGBUG [Mob ${vnum} Room ${room}]: ${message}`);
}
```

---

### 4. `src/scripting/ScriptParser.ts` — MUDprog Trigger Dispatcher

Implement the trigger dispatcher that checks whether a mob/object/room has a MUDprog for a given trigger type and fires it. This is the glue between game systems and the MUDprog engine:

#### 4.1 Trigger Check Functions

```typescript
import { MudProgEngine, MudProgTrigger, MudProgData } from './MudProgEngine';
import { MudProgContext } from './VariableSubstitution';
import { Character } from '../game/entities/Character';
import { Mobile } from '../game/entities/Mobile';
import { GameObject } from '../game/entities/GameObject';
import { Room } from '../game/entities/Room';
import { Logger } from '../utils/Logger';

const log = Logger.getLogger('mudprog');
const engine = new MudProgEngine();
```

#### 4.2 `HAS_PROG` Macro Equivalent

Fast trigger detection using a progtypes bitmask on the entity's prototype:

```typescript
export function hasProg(entity: Mobile | GameObject | Room, triggerType: MudProgTrigger): boolean {
  if (!entity.programs || entity.programs.length === 0) return false;
  // Fast bitmask check if available
  if (entity.progTypes !== undefined) {
    return (entity.progTypes & getTriggerBit(triggerType)) !== 0;
  }
  // Fallback: linear search
  return entity.programs.some(p => p.trigger === triggerType);
}

function getTriggerBit(trigger: MudProgTrigger): number {
  // Map trigger types to bit positions matching legacy BV* values
  const bits: Record<string, number> = {
    'ACT_PROG':        1 << 0,
    'SPEECH_PROG':     1 << 1,
    'RAND_PROG':       1 << 2,
    'FIGHT_PROG':      1 << 3,
    'HITPRCNT_PROG':   1 << 4,
    'DEATH_PROG':      1 << 5,
    'ENTRY_PROG':      1 << 6,
    'GREET_PROG':      1 << 7,
    'ALL_GREET_PROG':  1 << 8,
    'GIVE_PROG':       1 << 9,
    'BRIBE_GOLD_PROG': 1 << 10,
    'HOUR_PROG':       1 << 11,
    'TIME_PROG':       1 << 12,
    'WEAR_PROG':       1 << 13,
    'REMOVE_PROG':     1 << 14,
    'SAC_PROG':        1 << 15,
    'LOOK_PROG':       1 << 16,
    'EXA_PROG':        1 << 17,
    'ZAP_PROG':        1 << 18,
    'GET_PROG':        1 << 19,
    'DROP_PROG':       1 << 20,
    'DAMAGE_PROG':     1 << 21,
    'REPAIR_PROG':     1 << 22,
    'PULL_PROG':       1 << 23,
    'PUSH_PROG':       1 << 24,
    'SLEEP_PROG':      1 << 25,
    'REST_PROG':       1 << 26,
    'LEAVE_PROG':      1 << 27,
    'SCRIPT_PROG':     1 << 28,
    'USE_PROG':        1 << 29,
  };
  return bits[trigger] ?? 0;
}
```

#### 4.3 `checkMobTrigger` — Mob Program Trigger

```typescript
export function checkMobTrigger(
  triggerType: MudProgTrigger,
  mob: Mobile,
  actor: Character | null,
  arg?: string,
  obj?: GameObject | null,
  victim?: Character | null
): boolean {
  if (!hasProg(mob, triggerType)) return false;

  for (const prog of mob.programs) {
    if (prog.trigger !== triggerType) continue;

    // Check trigger-specific argument matching
    if (!matchesTriggerArg(triggerType, prog, arg, actor)) continue;

    const context: MudProgContext = {
      mob,
      actor: actor ?? null,
      victim: victim ?? null,
      obj: obj ?? null,
      target: null,
      room: mob.inRoom ?? null,
    };

    engine.execute(prog, context);
    return true;
  }

  return false;
}
```

#### 4.4 Trigger Argument Matching

Different trigger types match their `argList` differently:

```typescript
function matchesTriggerArg(
  triggerType: MudProgTrigger,
  prog: MudProgData,
  arg?: string,
  actor?: Character | null
): boolean {
  const progArg = prog.argList.toLowerCase().trim();

  switch (triggerType) {
    case MudProgTrigger.SpeechProg:
      // Match if spoken text contains the keyword(s)
      if (progArg === 'all') return true;
      if (!arg) return false;
      // Support 'p' prefix for exact phrase match
      if (progArg.startsWith('p ')) {
        return arg.toLowerCase() === progArg.substring(2).trim();
      }
      // Otherwise, check if any word in argList appears in arg
      return progArg.split(/\s+/).some(word => arg.toLowerCase().includes(word));

    case MudProgTrigger.ActProg:
      // Match act message text
      if (progArg === 'all') return true;
      if (!arg) return false;
      if (progArg.startsWith('p ')) {
        return arg.toLowerCase().includes(progArg.substring(2).trim());
      }
      return progArg.split(/\s+/).some(word => arg.toLowerCase().includes(word));

    case MudProgTrigger.RandProg:
      // argList is a percentage (e.g., "25")
      const chance = parseInt(progArg, 10);
      return Math.random() * 100 < chance;

    case MudProgTrigger.HitPrcntProg:
      // argList is the HP percentage threshold (fires when mob drops below)
      if (!actor) return false;
      const threshold = parseInt(progArg, 10);
      const mob = actor as Mobile; // Actually the mob being hit
      const pct = Math.floor((mob.hit * 100) / Math.max(1, mob.maxHit));
      return pct <= threshold;

    case MudProgTrigger.BribeGoldProg:
    case MudProgTrigger.BribeSilverProg:
    case MudProgTrigger.BribeCopperProg:
      // argList is the minimum amount
      const minAmount = parseInt(progArg, 10);
      const givenAmount = parseInt(arg ?? '0', 10);
      return givenAmount >= minAmount;

    case MudProgTrigger.GiveProg:
      // argList is the object keyword or vnum
      if (progArg === 'all') return true;
      if (!arg) return false;
      return arg.toLowerCase().includes(progArg);

    case MudProgTrigger.HourProg:
      // argList is the game hour
      const hour = parseInt(progArg, 10);
      return getGameHour() === hour;

    case MudProgTrigger.TimeProg:
      // argList is the real-time hour
      const realHour = parseInt(progArg, 10);
      return new Date().getHours() === realHour;

    case MudProgTrigger.CmdProg:
      // argList is the command name
      if (!arg) return false;
      return arg.toLowerCase().startsWith(progArg);

    // Triggers that always fire if present:
    case MudProgTrigger.GreetProg:
    case MudProgTrigger.AllGreetProg:
    case MudProgTrigger.GreetInFightProg:
    case MudProgTrigger.EntryProg:
    case MudProgTrigger.DeathProg:
    case MudProgTrigger.FightProg:
    case MudProgTrigger.ScriptProg:
    case MudProgTrigger.LoginProg:
    case MudProgTrigger.VoidProg:
      return true;

    default:
      return true;
  }
}
```

#### 4.5 Object Program Trigger — Supermob Pattern

For object and room programs, a global "supermob" NPC is configured to act as the command executor. Replicates legacy supermob abstraction:

```typescript
/** Global supermob instance for object/room program execution. */
let supermob: Mobile | null = null;

export function initSupermob(mob: Mobile): void {
  supermob = mob;
}

export function checkObjTrigger(
  triggerType: MudProgTrigger,
  obj: GameObject,
  actor: Character | null,
  arg?: string
): boolean {
  if (!obj.pIndexData?.programs) return false;
  if (!hasProg(obj as any, triggerType)) return false;

  if (!supermob) {
    log.error('Supermob not initialized — cannot execute object program');
    return false;
  }

  for (const prog of obj.pIndexData.programs) {
    if (prog.trigger !== triggerType) continue;
    if (!matchesTriggerArg(triggerType, prog, arg, actor)) continue;

    // Configure supermob with object context
    const savedRoom = supermob.inRoom;
    const savedName = supermob.name;
    const savedShort = supermob.shortDescription;

    supermob.inRoom = actor?.inRoom ?? obj.inRoom ?? null;
    supermob.name = obj.name;
    supermob.shortDescription = obj.shortDescription;

    const context: MudProgContext = {
      mob: supermob,
      actor: actor ?? null,
      victim: null,
      obj,
      target: null,
      room: supermob.inRoom,
    };

    engine.execute(prog, context);

    // Restore supermob
    supermob.inRoom = savedRoom;
    supermob.name = savedName;
    supermob.shortDescription = savedShort;

    return true;
  }

  return false;
}
```

#### 4.6 Room Program Trigger

```typescript
export function checkRoomTrigger(
  triggerType: MudProgTrigger,
  room: Room,
  actor: Character | null,
  arg?: string
): boolean {
  if (!room.programs || room.programs.length === 0) return false;

  if (!supermob) {
    log.error('Supermob not initialized — cannot execute room program');
    return false;
  }

  for (const prog of room.programs) {
    if (prog.trigger !== triggerType) continue;
    if (!matchesTriggerArg(triggerType, prog, arg, actor)) continue;

    // Configure supermob with room context
    const savedRoom = supermob.inRoom;
    const savedName = supermob.name;
    const savedShort = supermob.shortDescription;

    supermob.inRoom = room;
    supermob.name = room.name;
    supermob.shortDescription = room.name;

    const context: MudProgContext = {
      mob: supermob,
      actor: actor ?? null,
      victim: null,
      obj: null,
      target: null,
      room,
    };

    engine.execute(prog, context);

    // Restore supermob
    supermob.inRoom = savedRoom;
    supermob.name = savedName;
    supermob.shortDescription = savedShort;

    return true;
  }

  return false;
}
```

#### 4.7 Convenience Trigger Functions

High-level functions for common trigger points used by other systems:

```typescript
/** Called from moveChar() when a character enters a room. */
export function triggerGreetProgs(room: Room, actor: Character): void {
  // Check mobs in the room for GREET_PROG and ALL_GREET_PROG
  for (const ch of room.characters) {
    if (!ch.isNpc || ch === actor) continue;
    if (charDied(ch)) continue;

    const mob = ch as Mobile;

    // GREET_PROG only fires for visible characters
    if (hasProg(mob, MudProgTrigger.GreetProg)) {
      if (VisibilityManager.canSeeChar(mob, actor)) {
        checkMobTrigger(MudProgTrigger.GreetProg, mob, actor);
        if (charDied(actor)) return;
      }
    }

    // ALL_GREET_PROG fires for all characters (even invisible)
    if (hasProg(mob, MudProgTrigger.AllGreetProg)) {
      checkMobTrigger(MudProgTrigger.AllGreetProg, mob, actor);
      if (charDied(actor)) return;
    }

    // GREET_IN_FIGHT_PROG fires even when mob is fighting
    if (mob.fighting && hasProg(mob, MudProgTrigger.GreetInFightProg)) {
      checkMobTrigger(MudProgTrigger.GreetInFightProg, mob, actor);
      if (charDied(actor)) return;
    }
  }

  // Check room programs for ENTER_PROG
  checkRoomTrigger(MudProgTrigger.EnterProg, room, actor);
}

/** Called from moveChar() when a character leaves a room. */
export function triggerLeaveProgs(room: Room, actor: Character): void {
  checkRoomTrigger(MudProgTrigger.LeaveProg, room, actor);
}

/** Called from doSay() for SPEECH_PROG. */
export function triggerSpeechProgs(room: Room, actor: Character, speech: string): void {
  for (const ch of room.characters) {
    if (!ch.isNpc || ch === actor) continue;
    if (charDied(ch)) continue;
    checkMobTrigger(MudProgTrigger.SpeechProg, ch as Mobile, actor, speech);
    if (charDied(actor)) return;
  }
  // Room speech progs
  checkRoomTrigger(MudProgTrigger.SpeechProg, room, actor, speech);
}

/** Called from doGive() for GIVE_PROG and BRIBE_PROG. */
export function triggerGiveProgs(mob: Mobile, actor: Character, obj: GameObject): void {
  checkMobTrigger(MudProgTrigger.GiveProg, mob, actor, obj.name, obj);
}

export function triggerBribeProgs(mob: Mobile, actor: Character, amount: number, currency: 'gold' | 'silver' | 'copper'): void {
  const trigger = currency === 'gold' ? MudProgTrigger.BribeGoldProg
    : currency === 'silver' ? MudProgTrigger.BribeSilverProg
    : MudProgTrigger.BribeCopperProg;
  checkMobTrigger(trigger, mob, actor, amount.toString());
}

/** Called from handleDeath() for DEATH_PROG. */
export function triggerDeathProgs(mob: Mobile, killer: Character): boolean {
  if (!hasProg(mob, MudProgTrigger.DeathProg)) return false;
  checkMobTrigger(MudProgTrigger.DeathProg, mob, killer);
  return true; // Signal that death prog was fired (may override death)
}

/** Called from violenceUpdate() for FIGHT_PROG and HITPRCNT_PROG. */
export function triggerFightProgs(mob: Mobile, attacker: Character): void {
  // FIGHT_PROG
  if (hasProg(mob, MudProgTrigger.FightProg)) {
    checkMobTrigger(MudProgTrigger.FightProg, mob, attacker);
    if (charDied(mob)) return;
  }

  // HITPRCNT_PROG
  if (hasProg(mob, MudProgTrigger.HitPrcntProg)) {
    for (const prog of mob.programs) {
      if (prog.trigger !== MudProgTrigger.HitPrcntProg) continue;
      const threshold = parseInt(prog.argList, 10);
      const pct = Math.floor((mob.hit * 100) / Math.max(1, mob.maxHit));
      if (pct <= threshold) {
        const ctx: MudProgContext = {
          mob, actor: attacker, victim: null, obj: null, target: null, room: mob.inRoom,
        };
        engine.execute(prog, ctx);
        if (charDied(mob)) return;
        break; // Only fire once per round
      }
    }
  }
}

/** Called from mobile_update() for RAND_PROG. */
export function triggerRandProgs(mob: Mobile): void {
  if (!hasProg(mob, MudProgTrigger.RandProg)) return;
  checkMobTrigger(MudProgTrigger.RandProg, mob, null);
}

/** Called from mobile_update() for HOUR_PROG and TIME_PROG. */
export function triggerTimeProgs(mob: Mobile): void {
  if (hasProg(mob, MudProgTrigger.HourProg)) {
    checkMobTrigger(MudProgTrigger.HourProg, mob, null);
  }
  if (hasProg(mob, MudProgTrigger.TimeProg)) {
    checkMobTrigger(MudProgTrigger.TimeProg, mob, null);
  }
}

/** Called from act output functions for ACT_PROG. */
export function triggerActProgs(mob: Mobile, actText: string, actor: Character): void {
  if (!hasProg(mob, MudProgTrigger.ActProg)) return;
  checkMobTrigger(MudProgTrigger.ActProg, mob, actor, actText);
}

/** Called from doWear() for WEAR_PROG. */
export function triggerWearProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.WearProg, obj, actor);
}

/** Called from doRemove() for REMOVE_PROG. */
export function triggerRemoveProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.RemoveProg, obj, actor);
}

/** Called from doGet() for GET_PROG. */
export function triggerGetProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.GetProg, obj, actor);
}

/** Called from doDrop() for DROP_PROG. */
export function triggerDropProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.DropProg, obj, actor);
}

/** Called from doExamine() for EXA_PROG. */
export function triggerExamineProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.ExamineProg, obj, actor);
}

/** Called from doSacrifice() for SAC_PROG. */
export function triggerSacProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.SacProg, obj, actor);
}

/** Called from doZap() for ZAP_PROG. */
export function triggerZapProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.ZapProg, obj, actor);
}

/** Called from pull/push actions for PULL_PROG/PUSH_PROG. */
export function triggerPullProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.PullProg, obj, actor);
}

export function triggerPushProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.PushProg, obj, actor);
}

/** Called from doUse() for USE_PROG. */
export function triggerUseProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.UseProg, obj, actor);
}

/** Called for DAMAGE_PROG. */
export function triggerDamageProgs(obj: GameObject, actor: Character): void {
  checkObjTrigger(MudProgTrigger.DamageProg, obj, actor);
}
```

---

### 5. MP-Prefixed Scripting Commands — `src/game/commands/scripting.ts`

Implement all `mp` commands that MUDprogs can use. These are NPC-only commands executed via `interpret()` during script execution. Replicates legacy `mpcommands` from `mud_prog.c`:

#### 5.1 Command Registration

```typescript
// All mp-commands have trust level 0 but check isNpc or isSupermob
CommandRegistry.register('mpasound',    doMpAsound,    0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpat',        doMpAt,        0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpecho',      doMpEcho,      0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpechoat',    doMpEchoAt,    0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpechoaround', doMpEchoAround, 0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpforce',     doMpForce,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpgoto',      doMpGoto,      0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpjunk',      doMpJunk,      0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpkill',      doMpKill,      0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpmload',     doMpMload,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpoload',     doMpOload,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mppurge',     doMpPurge,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mptransfer',  doMpTransfer,  0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpdamage',    doMpDamage,    0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mprestore',   doMpRestore,   0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpapply',     doMpApply,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpapplyb',    doMpApplyb,    0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpfleefrom',  doMpFleefrom,  0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpfleeall',   doMpFleeall,   0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpsleep',     doMpSleep,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpmset',      doMpMset,      0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mposet',      doMpOset,      0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpnothing',   doMpNothing,   0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpdelay',     doMpDelay,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mppeace',     doMpPeace,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mplog',       doMpLog,       0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpmorph',     doMpMorph,     0, POS_DEAD, LOG_NORMAL);
CommandRegistry.register('mpunmorph',   doMpUnmorph,   0, POS_DEAD, LOG_NORMAL);
```

#### 5.2 NPC-Only Guard

```typescript
function mpGuard(ch: Character): boolean {
  if (!ch.isNpc) {
    ch.sendToChar("Huh?\r\n");
    return false;
  }
  return true;
}
```

#### 5.3 Key MP-Command Implementations

**`mpasound` — Send message to all adjacent rooms:**

```typescript
function doMpAsound(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  if (!arg || !ch.inRoom) return;

  for (const exit of ch.inRoom.exits) {
    if (!exit || !exit.toRoom || exit.toRoom === ch.inRoom) continue;
    sendToRoom(exit.toRoom, arg + '\r\n');
  }
}
```

**`mpecho` — Send message to mob's room:**

```typescript
function doMpEcho(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  if (!arg || !ch.inRoom) return;
  sendToRoom(ch.inRoom, arg + '\r\n');
}
```

**`mpechoat` — Send message to specific character:**

```typescript
function doMpEchoAt(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const [targetName, message] = oneArgument(arg);
  if (!targetName || !message) return;
  const target = getCharRoom(ch, targetName);
  if (!target) return;
  target.sendToChar(message + '\r\n');
}
```

**`mpechoaround` — Send message to room except target:**

```typescript
function doMpEchoAround(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const [targetName, message] = oneArgument(arg);
  if (!targetName || !message || !ch.inRoom) return;
  const target = getCharRoom(ch, targetName);
  if (!target) return;

  for (const vch of ch.inRoom.characters) {
    if (vch === target) continue;
    vch.sendToChar(message + '\r\n');
  }
}
```

**`mpforce` — Force a character to execute a command:**

```typescript
function doMpForce(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const [targetName, command] = oneArgument(arg);
  if (!targetName || !command) return;

  const target = getCharWorld(ch, targetName);
  if (!target) return;

  // Cannot force immortals
  if (!target.isNpc && target.getTrust() >= ch.getTrust()) return;

  CommandRegistry.interpret(target, command);
}
```

**`mpgoto` — Teleport mob to a room:**

```typescript
function doMpGoto(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const vnum = parseInt(arg, 10);
  if (isNaN(vnum)) return;

  const room = VnumRegistry.getRoom(vnum);
  if (!room) return;

  if (ch.inRoom) charFromRoom(ch);
  charToRoom(ch, room);
}
```

**`mptransfer` — Transfer a character to mob's room or specified room:**

```typescript
function doMpTransfer(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const [targetName, rest] = oneArgument(arg);
  if (!targetName) return;

  let destination = ch.inRoom;
  if (rest) {
    const vnum = parseInt(rest, 10);
    if (!isNaN(vnum)) {
      const room = VnumRegistry.getRoom(vnum);
      if (room) destination = room;
    }
  }

  if (!destination) return;

  if (targetName === 'all') {
    // Transfer all characters in the mob's room
    const chars = [...(ch.inRoom?.characters ?? [])];
    for (const vch of chars) {
      if (vch === ch || vch.isNpc) continue;
      if (vch.inRoom) charFromRoom(vch);
      charToRoom(vch, destination);
    }
  } else {
    const target = getCharWorld(ch, targetName);
    if (!target) return;
    if (target.inRoom) charFromRoom(target);
    charToRoom(target, destination);
  }
}
```

**`mpmload` — Load a mobile by vnum into mob's room:**

```typescript
function doMpMload(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const vnum = parseInt(arg, 10);
  if (isNaN(vnum)) return;

  const proto = VnumRegistry.getMobile(vnum);
  if (!proto) {
    progbug(`MpMload: vnum ${vnum} not found`, ch);
    return;
  }

  const mob = createMobileInstance(proto);
  charToRoom(mob, ch.inRoom!);
}
```

**`mpoload` — Load an object by vnum:**

```typescript
function doMpOload(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const [vnumStr, levelStr] = arg.split(/\s+/);
  const vnum = parseInt(vnumStr, 10);
  if (isNaN(vnum)) return;

  const proto = VnumRegistry.getObject(vnum);
  if (!proto) {
    progbug(`MpOload: vnum ${vnum} not found`, ch);
    return;
  }

  const level = levelStr ? parseInt(levelStr, 10) : ch.level;
  const obj = createObjectInstance(proto, level);

  // If room load keyword is present, put in room; otherwise give to mob
  if (arg.includes('room') && ch.inRoom) {
    objToRoom(obj, ch.inRoom);
  } else {
    objToChar(obj, ch);
  }
}
```

**`mppurge` — Remove all NPCs and objects from room, or a specific target:**

```typescript
function doMpPurge(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;

  if (!arg || arg.trim() === '') {
    // Purge everything in room except self
    if (!ch.inRoom) return;
    const chars = [...ch.inRoom.characters];
    for (const vch of chars) {
      if (vch === ch) continue;
      if (!vch.isNpc) continue; // Don't purge players
      extractChar(vch);
    }
    const objs = [...ch.inRoom.objects];
    for (const obj of objs) {
      extractObj(obj);
    }
  } else {
    // Purge specific target
    const target = getCharRoom(ch, arg);
    if (target && target.isNpc && target !== ch) {
      extractChar(target);
      return;
    }
    const obj = getObjHere(ch, arg);
    if (obj) {
      extractObj(obj);
    }
  }
}
```

**`mpjunk` — Destroy an object carried by mob:**

```typescript
function doMpJunk(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const obj = getObjCarry(ch, arg);
  if (obj) extractObj(obj);
}
```

**`mpkill` — Initiate combat:**

```typescript
function doMpKill(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const target = getCharRoom(ch, arg);
  if (!target) return;
  if (target === ch) return;
  startCombat(ch, target);
}
```

**`mpdamage` — Inflict damage without combat:**

```typescript
function doMpDamage(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const [targetName, amountStr] = arg.split(/\s+/);
  const target = getCharRoom(ch, targetName);
  if (!target) return;
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount < 0) return;

  target.hit -= amount;
  target.updatePosition();

  if (target.hit <= 0) {
    handleDeath(ch, target);
  }
}
```

**`mprestore` — Restore HP/mana/move:**

```typescript
function doMpRestore(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const [targetName, what] = arg.split(/\s+/);
  const target = getCharRoom(ch, targetName);
  if (!target) return;

  switch (what?.toLowerCase()) {
    case 'hp': target.hit = target.maxHit; break;
    case 'mana': target.mana = target.maxMana; break;
    case 'move': target.move = target.maxMove; break;
    default:
      target.hit = target.maxHit;
      target.mana = target.maxMana;
      target.move = target.maxMove;
      break;
  }
  target.updatePosition();
}
```

**`mppeace` — Stop all combat in room:**

```typescript
function doMpPeace(ch: Character, _arg: string): void {
  if (!mpGuard(ch)) return;
  if (!ch.inRoom) return;
  for (const vch of ch.inRoom.characters) {
    if (vch.fighting) stopFighting(vch, true);
  }
}
```

**`mplog` — Write to the MUDprog log:**

```typescript
function doMpLog(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const vnum = ch.pIndexData?.vnum ?? 0;
  Logger.getLogger('mudprog').info(`[MOB ${vnum}] ${arg}`);
}
```

**`mpnothing` — No-op command (used as placeholder in scripts):**

```typescript
function doMpNothing(_ch: Character, _arg: string): void {
  // Intentional no-op
}
```

**`mpdelay` — Set a delayed SCRIPT_PROG execution:**

```typescript
function doMpDelay(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const pulses = parseInt(arg, 10);
  if (isNaN(pulses) || pulses < 1) return;

  // Register a delayed SCRIPT_PROG trigger
  (ch as Mobile).scriptDelay = pulses;
}
```

#### 5.4 Runtime Entity Modification — `mpmset` / `mposet`

Replicates legacy `mpxset.c`. Allows MUDprogs to modify mob and object **instances** at runtime:

**`mpmset` — Modify mob instance:**

```typescript
function doMpMset(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const parts = arg.split(/\s+/);
  if (parts.length < 3) return;

  const [targetName, field, ...valueParts] = parts;
  const value = valueParts.join(' ');
  const target = getCharRoom(ch, targetName);
  if (!target) return;

  // Cannot modify prototype mobs
  if (target.isNpc && (target.actFlags & ACT_PROTOTYPE) !== 0n) {
    progbug('MpMset: cannot modify prototype mob', ch);
    return;
  }

  switch (field.toLowerCase()) {
    case 'str':   target.permStr = parseInt(value, 10); break;
    case 'int':   target.permInt = parseInt(value, 10); break;
    case 'wis':   target.permWis = parseInt(value, 10); break;
    case 'dex':   target.permDex = parseInt(value, 10); break;
    case 'con':   target.permCon = parseInt(value, 10); break;
    case 'cha':   target.permCha = parseInt(value, 10); break;
    case 'lck':   target.permLck = parseInt(value, 10); break;
    case 'hp':    target.maxHit = parseInt(value, 10); target.hit = target.maxHit; break;
    case 'mana':  target.maxMana = parseInt(value, 10); target.mana = target.maxMana; break;
    case 'move':  target.maxMove = parseInt(value, 10); target.move = target.maxMove; break;
    case 'level': target.level = parseInt(value, 10); break;
    case 'gold':  target.gold = parseInt(value, 10); break;
    case 'hitroll': target.hitroll = parseInt(value, 10); break;
    case 'damroll': target.damroll = parseInt(value, 10); break;
    case 'armor': target.armor = parseInt(value, 10); break;
    case 'alignment': target.alignment = parseInt(value, 10); break;
    case 'name':  target.name = value; break;
    case 'short': target.shortDescription = value; break;
    case 'long':  target.longDescription = value; break;
    case 'title':
      if (!target.isNpc && target.pcData) target.pcData.title = value;
      break;
    default:
      progbug(`MpMset: unknown field '${field}'`, ch);
      break;
  }
}
```

**`mposet` — Modify object instance:**

```typescript
function doMpOset(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const parts = arg.split(/\s+/);
  if (parts.length < 3) return;

  const [targetName, field, ...valueParts] = parts;
  const value = valueParts.join(' ');
  const obj = getObjHere(ch, targetName);
  if (!obj) return;

  // Cannot modify prototype objects
  if ((obj.extraFlags & ITEM_PROTOTYPE) !== 0n) {
    progbug('MpOset: cannot modify prototype object', ch);
    return;
  }

  switch (field.toLowerCase()) {
    case 'value0': case 'v0': obj.values[0] = parseInt(value, 10); break;
    case 'value1': case 'v1': obj.values[1] = parseInt(value, 10); break;
    case 'value2': case 'v2': obj.values[2] = parseInt(value, 10); break;
    case 'value3': case 'v3': obj.values[3] = parseInt(value, 10); break;
    case 'value4': case 'v4': obj.values[4] = parseInt(value, 10); break;
    case 'value5': case 'v5': obj.values[5] = parseInt(value, 10); break;
    case 'type':   obj.itemType = parseInt(value, 10); break;
    case 'flags':  obj.extraFlags = BigInt(value); break;
    case 'wear':   obj.wearFlags = parseInt(value, 10); break;
    case 'level':  obj.level = parseInt(value, 10); break;
    case 'weight': obj.weight = parseInt(value, 10); break;
    case 'cost':   obj.cost = parseInt(value, 10); break;
    case 'timer':  obj.timer = parseInt(value, 10); break;
    case 'name':   obj.name = value; break;
    case 'short':  obj.shortDescription = value; break;
    case 'long':   obj.longDescription = value; break;
    default:
      progbug(`MpOset: unknown field '${field}'`, ch);
      break;
  }
}
```

**`mpapply` / `mpapplyb` — Apply affect to target:**

```typescript
function doMpApply(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const parts = arg.split(/\s+/);
  if (parts.length < 3) return;

  const [targetName, location, modifier] = parts;
  const target = getCharRoom(ch, targetName);
  if (!target) return;

  const aff = new Affect(
    -1,                           // type: -1 = MUDprog-applied
    -1,                           // duration: -1 = permanent
    parseInt(location, 10),       // location (ApplyType enum)
    parseInt(modifier, 10),       // modifier value
    0n                            // bitvector
  );
  target.applyAffect(aff);
}

function doMpApplyb(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const parts = arg.split(/\s+/);
  if (parts.length < 2) return;

  const [targetName, bitvectorStr] = parts;
  const target = getCharRoom(ch, targetName);
  if (!target) return;

  const aff = new Affect(
    -1,                           // type: -1 = MUDprog-applied
    -1,                           // duration: -1 = permanent
    0,                            // no stat location
    0,                            // no modifier
    BigInt(bitvectorStr)          // bitvector flags to set
  );
  target.applyAffect(aff);
}
```

**`mpfleefrom` / `mpfleeall` — Force characters to flee:**

```typescript
function doMpFleefrom(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const target = getCharRoom(ch, arg);
  if (!target) return;
  doFlee(target, '');
}

function doMpFleeall(ch: Character, _arg: string): void {
  if (!mpGuard(ch)) return;
  if (!ch.inRoom) return;
  const chars = [...ch.inRoom.characters];
  for (const vch of chars) {
    if (vch === ch || vch.isNpc) continue;
    doFlee(vch, '');
  }
}
```

**`mpmorph` / `mpunmorph` — Morph system:**

```typescript
function doMpMorph(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const target = getCharRoom(ch, arg);
  if (!target) return;
  // Set morph flag — implementation depends on morph system
  target.morphed = true;
}

function doMpUnmorph(ch: Character, arg: string): void {
  if (!mpGuard(ch)) return;
  const target = getCharRoom(ch, arg);
  if (!target) return;
  target.morphed = false;
}
```

---

### 6. Integration Points — Wiring Triggers into Existing Systems

These integration points are documentation for where `ScriptParser` trigger functions must be called from existing systems. The calls should be added at the specified hook points:

| Trigger | System / File | Hook Point | Call |
|---|---|---|---|
| `GREET_PROG` / `ALL_GREET_PROG` / `ENTRY_PROG` | `src/game/commands/movement.ts` | After `charToRoom()` in `moveChar()` | `triggerGreetProgs(room, ch)` |
| `LEAVE_PROG` | `src/game/commands/movement.ts` | Before `charFromRoom()` in `moveChar()` | `triggerLeaveProgs(room, ch)` |
| `SPEECH_PROG` | `src/game/commands/communication.ts` | End of `doSay()` | `triggerSpeechProgs(room, ch, arg)` |
| `GIVE_PROG` | `src/game/commands/objects.ts` | After `objToChar()` in `doGive()` | `triggerGiveProgs(victim, ch, obj)` |
| `BRIBE_PROG` | `src/game/commands/objects.ts` | After gold transfer in `doGive()` | `triggerBribeProgs(victim, ch, amount, currency)` |
| `DEATH_PROG` | `src/game/combat/DeathHandler.ts` | Before `makeCorpse()` in `handleDeath()` | `triggerDeathProgs(mob, killer)` |
| `FIGHT_PROG` / `HITPRCNT_PROG` | `src/game/combat/CombatEngine.ts` | End of each `violenceUpdate()` round | `triggerFightProgs(mob, attacker)` |
| `RAND_PROG` | `src/game/entities/Character.ts` | In `mobileUpdate()` loop | `triggerRandProgs(mob)` |
| `HOUR_PROG` / `TIME_PROG` | `src/game/entities/Character.ts` | In `mobileUpdate()` loop | `triggerTimeProgs(mob)` |
| `ACT_PROG` | `src/network/ConnectionManager.ts` | In `sendToRoom()` / `actToRoom()` output | `triggerActProgs(mob, text, actor)` |
| `WEAR_PROG` | `src/game/commands/objects.ts` | After equipping in `doWear()` | `triggerWearProgs(obj, ch)` |
| `REMOVE_PROG` | `src/game/commands/objects.ts` | After removing in `doRemove()` | `triggerRemoveProgs(obj, ch)` |
| `GET_PROG` | `src/game/commands/objects.ts` | After `objToChar()` in `doGet()` | `triggerGetProgs(obj, ch)` |
| `DROP_PROG` | `src/game/commands/objects.ts` | After `objToRoom()` in `doDrop()` | `triggerDropProgs(obj, ch)` |
| `EXA_PROG` | `src/game/commands/information.ts` | End of `doExamine()` | `triggerExamineProgs(obj, ch)` |
| `SAC_PROG` | `src/game/commands/objects.ts` | Before extract in `doSacrifice()` | `triggerSacProgs(obj, ch)` |
| `ZAP_PROG` | `src/game/commands/magic.ts` | After `doZap()` usage | `triggerZapProgs(obj, ch)` |
| `USE_PROG` | `src/game/commands/objects.ts` | After using object | `triggerUseProgs(obj, ch)` |
| `PULL_PROG` / `PUSH_PROG` | `src/game/commands/objects.ts` | After pull/push | `triggerPullProgs(obj, ch)` / `triggerPushProgs(obj, ch)` |
| `SLEEP_PROG` / `REST_PROG` | `src/game/commands/movement.ts` | After `doSleep()` / `doRest()` | `checkRoomTrigger(SleepProg/RestProg, room, ch)` |
| `RFIGHT_PROG` / `RDEATH_PROG` | `src/game/combat/CombatEngine.ts` | On combat start / death in room | `checkRoomTrigger(RFightProg/RDeathProg, room, ch)` |
| `SCRIPT_PROG` | `src/core/TickEngine.ts` | In `mobileUpdate()` when `mob.scriptDelay` expires | `checkMobTrigger(ScriptProg, mob, null)` |
| `LOGIN_PROG` | `src/network/ConnectionManager.ts` | After player enters game | `checkMobTrigger(LoginProg, mob, player)` for mobs with LoginProg; `checkRoomTrigger(LoginProg, room, player)` |
| `mpsleep` resume | `src/core/TickEngine.ts` | Every `PULSE_MOBILE` | `engine.mprogUpdate()` |

---

## Tests for Sub-Phase 3R

- `tests/unit/scripting/VariableSubstitution.test.ts` — Variable expansion tests:
  - Test `$n` expands to actor name.
  - Test `$N` expands to actor short description.
  - Test `$i` expands to mob name.
  - Test `$t` expands to victim name. With null victim → `'someone'`.
  - Test `$p` expands to object name. With null object → `'something'`.
  - Test `$e/$m/$s` expand to correct pronouns for male/female/neutral actors.
  - Test `$E/$M/$S` expand to correct pronouns for victims.
  - Test `$j/$k/$l` expand to correct pronouns for mob.
  - Test `$r` expands to a random PC in room (verify it's a valid PC name).
  - Test `$$` expands to literal `$`.
  - Test mixed variables: `"$n says hello to $t"` → `"Gandalf says hello to Frodo"`.
  - Test `charDied()` returns `'someone'` when actor is extracted.
  - Test `objExtracted()` returns `'something'` when obj is extracted.

- `tests/unit/scripting/IfcheckRegistry.test.ts` — Ifcheck function tests:
  - **Boolean checks:** `ispc` on Player → true, on Mobile → false. `isnpc` opposite. `isgood` with alignment 500 → true, -200 → false. `isevil` with alignment -500 → true. `isneutral` with alignment 0 → true. `isfight` when fighting → true, not fighting → false. `isimmort` with trust 50+ → true. `ischarmed` with `AFF_CHARM` → true. `isfollow` with master set → true. `ispkill` with PCFLAG_DEADLY → true.
  - **Numeric checks:** `level($n) > 10` with level 15 → true, level 5 → false. `hitprcnt($n) < 50` with 40% HP → true. `goldamt($n) >= 100` with 200 gold → true. `sex($n) == 1` for male → true.
  - **Stat checks:** `str($n) > 18` with strength 20 → true. Same for int, wis, dex, con, cha, lck.
  - **String checks:** `name($n) == gandalf` → true. `clan($n) == warriors` with matching clan → true.
  - **Object checks:** `objtype($p) == 5` (weapon type). `objval0($p) == 3`.
  - **Room checks:** `inroom($n) == 3001` with player in room 3001 → true. `indoors` in indoor room → true.
  - **Count checks:** `mobinroom` with 2 mobs of matching vnum → count 2. `mortcount` with 3 mortal PCs.
  - **Special checks:** `rand` — run 1000 times with `50` arg, expect ~50% true (within statistical tolerance). `cansee` with visible target → true, invisible target → false. `isopen`/`islocked` door checks.

- `tests/unit/scripting/MudProgEngine.test.ts` — Script engine tests:
  - **Simple command:** Script `say Hello` → mob executes `say Hello`.
  - **If/endif:** `if ispc($n)\nsay You are a player\nendif` with PC actor → says message. With NPC actor → does not.
  - **If/else/endif:** `if level($n) > 10\nsay High level\nelse\nsay Low level\nendif` with level 15 → "High level". Level 5 → "Low level".
  - **Or condition:** `if isevil($n)\nor level($n) > 50\nsay Powerful or evil\nendif` with evil alignment → fires. With level 60 non-evil → fires. With neutral level 5 → does not.
  - **Nested if:** `if ispc($n)\nif level($n) > 10\nsay Experienced player\nendif\nendif` → only fires for PC with level > 10.
  - **Break statement:** `say Before\nbreak\nsay After` → only "Before" is executed.
  - **Variable substitution in commands:** `say Welcome $n, I am $i` → expands both variables.
  - **Max nesting:** 21 nested `if` statements → triggers progbug and stops.
  - **Max prog nesting:** Prog that triggers another prog 21 levels deep → stops at limit.
  - **Mob death check:** If mob dies during command execution, remaining lines are not executed.
  - **mpsleep:** `say Before\nmpsleep 10\nsay After` → "Before" immediately, "After" after 10 pulses.

- `tests/unit/scripting/ScriptParser.test.ts` — Trigger dispatcher tests:
  - **GREET_PROG:** Place mob with GREET_PROG in room. Move PC into room → prog fires.
  - **ALL_GREET_PROG:** Same but PC is invisible → still fires (ALL_GREET triggers regardless of visibility).
  - **SPEECH_PROG:** Mob with `SPEECH_PROG hello`. PC says "hello world" → prog fires. PC says "goodbye" → does not fire.
  - **SPEECH_PROG exact:** Mob with `SPEECH_PROG p hello world`. PC says "hello world" → fires. "hello" alone → does not.
  - **GIVE_PROG:** Give matching object to mob → fires.
  - **BRIBE_PROG:** Give 100 gold to mob with `BRIBE_GOLD_PROG 50` → fires. Give 30 gold → does not.
  - **DEATH_PROG:** Kill mob with DEATH_PROG → prog fires before corpse creation.
  - **RAND_PROG:** Mob with `RAND_PROG 100` → always fires. `RAND_PROG 0` → never fires.
  - **FIGHT_PROG:** Mob in combat → fires every combat round.
  - **HITPRCNT_PROG:** Mob drops below threshold → fires.
  - **Object WEAR_PROG:** Equip object with WEAR_PROG → fires. Object GET_PROG, DROP_PROG similarly.
  - **Room ENTER_PROG / LEAVE_PROG:** PC enters/leaves room → fires.
  - **Supermob:** Object prog executes command → supermob acts in correct room.

- `tests/integration/MudProgExecution.test.ts` — Full integration test:
  - Create a mob at vnum 3000 with a GREET_PROG: `if ispc($n)\nsay Welcome, $n! I have been expecting you.\nendif`
  - Place mob in room 3001.
  - Move a PC into room 3001.
  - Verify the PC receives: `A mob says 'Welcome, TestPlayer! I have been expecting you.'`
  - Create a mob with SPEECH_PROG on "quest": `if ispc($n)\nif level($n) > 5\nsay You are worthy! Here is your quest.\nmpoload 3050\ngive quest_item $n\nelse\nsay Come back when you are stronger.\nendif\nendif`
  - PC (level 10) says "quest" → mob loads and gives item. PC (level 3) says "quest" → gets rejection message.
  - Create a room with ENTER_PROG: `mpecho The walls begin to glow...`
  - PC enters room → sees "The walls begin to glow..."

---

## Acceptance Criteria

- [ ] `substituteVariables()` correctly expands all 24 variable types (`$n`, `$N`, `$i`, `$I`, `$t`, `$T`, `$r`, `$R`, `$p`, `$P`, `$e`, `$m`, `$s`, `$E`, `$M`, `$S`, `$j`, `$k`, `$l`, `$J`, `$K`, `$L`, `$a`, `$$`).
- [ ] Pronoun substitution respects character sex (male/female/neutral).
- [ ] `$r` selects a random PC from the room (not NPCs).
- [ ] Entity existence checks (`charDied`, `objExtracted`) return safe fallbacks.
- [ ] All 50+ ifchecks are registered and evaluate correctly: `ispc`, `isnpc`, `isgood`, `isevil`, `isneutral`, `isfight`, `isimmort`, `ischarmed`, `isfollow`, `ispkill`, `isdevoted`, `canpkill`, `level`, `hitprcnt`, `hps`, `mana`, `goldamt`, `sex`, `position`, `class`, `race`, `alignment`, `favor`, `number`, `str`–`lck` (7 stats), `name`, `clan`, `clantype`, `council`, `deity`, `isaffected`, `wearing`, `wearingvnum`, `carryingvnum`, `numfighting`, `waitstate`, `objtype`, `objval0`–`objval5`, `leverpos`, `inroom`, `inarea`, `indoors`, `nomagic`, `safe`, `economy`, `mobinroom`, `mobinarea`, `mobinworld`, `objinroom`, `objinworld`, `ovnumhere`, `ovnumcarry`, `ovnumwear`, `mortcount`, `mobcount`, `charcount`, `objexists`, `rand`, `cansee`, `isopen`, `islocked`, `isday`, `isnight`, `timeis`, `multi`, `isnuisance`.
- [ ] Comparison operators `==`, `!=`, `>`, `<`, `>=`, `<=`, `/`, `!/` all work correctly.
- [ ] `MudProgEngine.execute()` processes `if`/`or`/`else`/`endif` with correct nesting up to `MAX_IFS = 20`.
- [ ] `or` provides logical OR with the current if-level condition.
- [ ] `else` inverts the current if-level (only within outer true scope).
- [ ] `break` stops script execution.
- [ ] `silent` suppresses output for the next command.
- [ ] `mpsleep <pulses>` pauses execution and resumes after the timer expires.
- [ ] `mprogUpdate()` correctly decrements sleep timers and resumes expired progs.
- [ ] Nesting depth is limited to `MAX_PROG_NEST = 20` to prevent infinite recursion.
- [ ] After each command, `charDied(mob)` is checked — execution stops if mob was extracted.
- [ ] `progbug()` logs errors with mob vnum and room vnum context.
- [ ] `GREET_PROG` fires when a visible character enters a room with a mob that has the trigger.
- [ ] `ALL_GREET_PROG` fires for all characters regardless of visibility.
- [ ] `SPEECH_PROG` fires when a character says a matching keyword in the mob's room.
- [ ] `SPEECH_PROG` with `p` prefix requires exact phrase match.
- [ ] `DEATH_PROG` fires when a mob with the trigger is killed, before corpse creation.
- [ ] `FIGHT_PROG` fires every combat round.
- [ ] `HITPRCNT_PROG` fires when mob HP drops below the specified percentage.
- [ ] `RAND_PROG` fires based on probability percentage during mobile_update.
- [ ] `BRIBE_PROG` fires only when the given amount meets the minimum threshold.
- [ ] `GIVE_PROG` fires when a matching object is given to the mob.
- [ ] Object triggers (`WEAR_PROG`, `REMOVE_PROG`, `GET_PROG`, `DROP_PROG`, `EXA_PROG`, `SAC_PROG`, `ZAP_PROG`, `USE_PROG`, `PULL_PROG`, `PUSH_PROG`, `DAMAGE_PROG`) fire at the correct hook points.
- [ ] Room triggers (`ENTER_PROG`, `LEAVE_PROG`, `SLEEP_PROG`, `REST_PROG`, `RFIGHT_PROG`, `RDEATH_PROG`) fire at the correct hook points.
- [ ] Supermob abstraction correctly executes object/room programs in the right room context.
- [ ] All mp-commands work: `mpasound`, `mpat`, `mpecho`, `mpechoat`, `mpechoaround`, `mpforce`, `mpgoto`, `mpjunk`, `mpkill`, `mpmload`, `mpoload`, `mppurge`, `mptransfer`, `mpdamage`, `mprestore`, `mpapply`, `mpapplyb`, `mpfleefrom`, `mpfleeall`, `mpsleep`, `mpmset`, `mposet`, `mpnothing`, `mpdelay`, `mppeace`, `mplog`, `mpmorph`, `mpunmorph`.
- [ ] Mp-commands are NPC-only — PCs receive "Huh?" when attempting to use them.
- [ ] `mpmset` and `mposet` cannot modify prototype entities (checked via `ACT_PROTOTYPE`/`ITEM_PROTOTYPE` flags).
- [ ] `mptransfer all` transfers all PCs in room to destination.
- [ ] `mppurge` without argument purges all NPCs and objects in room (not PCs, not self).
- [ ] `mpoload` with `room` keyword places object in room; without keyword gives to mob.
- [ ] `mpdamage` inflicts damage and triggers death if HP reaches 0.
- [ ] `mpapply` applies a permanent stat affect. `mpapplyb` applies a permanent bitvector affect.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
