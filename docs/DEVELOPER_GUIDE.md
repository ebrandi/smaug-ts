# SMAUG 2.0 TypeScript — Developer Guide

> Comprehensive reference for contributors, maintainers, and curious tinkerers.
> Assumes familiarity with TypeScript, Node.js, and basic MUD concepts.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Folder Structure Deep-Dive](#folder-structure-deep-dive)
3. [Core Systems](#core-systems)
4. [Coding Standards](#coding-standards)
5. [Tutorials](#tutorials)
6. [Admin Dashboard Development](#admin-dashboard-development)
7. [Browser Play Client Development](#browser-play-client-development)
8. [Testing Guide](#testing-guide)
9. [Debugging Tips](#debugging-tips)
10. [Legacy Migration Internals](#legacy-migration-internals)
11. [FAQ](#faq)

---

## Architecture Overview

SMAUG 2.0 TS is a **single-process, single-threaded** game server. All game
logic executes on the Node.js main thread — no worker threads for game state.
This mirrors the legacy C engine's `select()`-based loop and eliminates
concurrency bugs.

### High-Level Component Diagram

```
┌──────────────┐   WebSocket    ┌──────────────────────────────────────────┐
│  MUD Client  │───────────────▶│             NetworkServer                │
│ (Mudlet etc.)│   /ws          │  ┌──────────┐  ┌───────────────────┐    │
└──────────────┘                │  │ WSServer  │  │ SocketIOAdapter   │    │
                                │  └────┬─────┘  └────────┬──────────┘    │
┌──────────────┐   Socket.IO    │       │                  │              │
│   Browser    │───────────────▶│       ▼                  ▼              │
│   Client     │   /play        │  ┌──────────────────────────────────┐   │
└──────────────┘                │  │       ConnectionManager          │   │
                                │  │  Descriptors · State Machine     │   │
┌──────────────┐   REST         │  └──────────────┬───────────────────┘   │
│   Admin      │───────────────▶│                  │                      │
│  Dashboard   │   /api/admin   │  ┌───────────────▼──────────────────┐   │
└──────────────┘                │  │         GameLoop (250ms)         │   │
                                │  │  1. processInput()               │   │
                                │  │  2. tickEngine.pulse()           │   │
                                │  │  3. flushOutput()                │   │
                                │  └───────────────┬──────────────────┘   │
                                │                  │                      │
                                │  ┌───────────────▼──────────────────┐   │
                                │  │          TickEngine              │   │
                                │  │  Violence(12) Mobile(16)         │   │
                                │  │  Area(240)    FullTick(280)      │   │
                                │  └───────────────┬──────────────────┘   │
                                │                  │                      │
                                │  ┌───────────────▼──────────────────┐   │
                                │  │           EventBus               │   │
                                │  │  Synchronous pub/sub             │   │
                                │  │  30+ typed GameEvent channels    │   │
                                │  └──────────────────────────────────┘   │
                                └──────────────────────────────────────────┘
                                           │
              ┌────────────────┬───────────┼───────────┬────────────────┐
              ▼                ▼           ▼           ▼                ▼
        CommandRegistry  CombatEngine  SpellEngine  MudProgEngine  ResetEngine
              │                │           │           │                │
              ▼                ▼           ▼           ▼                ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │                      Entity Layer                               │
        │  Character → Player / Mobile   Room   Area   GameObject  Affect │
        └──────────────────────────────────────────────────────────────────┘
              │                                                    │
              ▼                                                    ▼
        ┌─────────────┐                                  ┌─────────────────┐
        │  PostgreSQL  │                                  │  JSON World     │
        │  (Prisma)    │                                  │  Files          │
        └─────────────┘                                  └─────────────────┘
```

### Design Principles

1. **Preserve game feel** — Tick timing (70 s), combat rounds (3 s), and
   command responsiveness are indistinguishable from the legacy C engine.
2. **Prototype-instance pattern** — Vnums identify prototypes; area resets
   create instances from prototypes. This is the core data model.
3. **Single-threaded model** — All game logic on one thread. No mutex, no
   race conditions, no distributed-state headaches.
4. **Backward compatibility** — Legacy `.are` files importable, player saves
   migratable, all commands support identical abbreviation matching.
5. **No over-engineering** — No CQRS, no event sourcing, no GraphQL, no
   microservices. One Node.js process serves the game, REST API, and
   WebSocket connections.

---

## Folder Structure Deep-Dive

```
smaug-ts/
├── src/
│   ├── core/                       # Engine heartbeat
│   │   ├── EventBus.ts             # Typed pub/sub with GameEvent enum
│   │   ├── TickEngine.ts           # Pulse counters: violence, mobile, area, tick
│   │   ├── GameLoop.ts             # setInterval(250ms) → processInput → pulse → flush
│   │   └── index.ts                # Barrel re-exports
│   │
│   ├── network/                    # Transport layer
│   │   ├── WebSocketServer.ts      # HTTP server + ws + Socket.IO bootstrap
│   │   ├── ConnectionManager.ts    # Descriptor lifecycle, nanny state machine
│   │   ├── SocketIOAdapter.ts      # Socket.IO transport wrapper
│   │   └── TelnetProtocol.ts       # Telnet option negotiation (MCCP, MSDP, MXP)
│   │
│   ├── game/
│   │   ├── commands/               # One file per command group
│   │   │   ├── CommandRegistry.ts  # Hash-table dispatch, trust/position checks
│   │   │   ├── movement.ts         # n/s/e/w/u/d, open, close, lock, unlock, flee
│   │   │   ├── combat.ts           # kill, backstab, bash, kick, disarm, etc.
│   │   │   ├── communication.ts    # say, tell, chat, shout, channels, languages
│   │   │   ├── information.ts      # look, score, who, help, inventory, equipment
│   │   │   ├── objects.ts          # get, drop, put, wear, remove, give, eat, drink
│   │   │   ├── magic.ts            # cast, quaff, recite, brandish, zap, practice
│   │   │   ├── economy.ts          # buy, sell, list, repair, bank, auction
│   │   │   ├── immortal.ts         # goto, transfer, purge, restore, ban, freeze, etc.
│   │   │   ├── olc.ts              # redit, medit, oedit, mpedit (in-game editors)
│   │   │   ├── social.ts           # Social loader and executor
│   │   │   └── index.ts            # Barrel re-exports
│   │   │
│   │   ├── combat/                 # Combat resolution engine
│   │   │   ├── CombatEngine.ts     # violenceUpdate(), multiHit(), oneHit()
│   │   │   ├── DamageCalculator.ts # AC, RIS, damage formula
│   │   │   └── DeathHandler.ts     # Death, corpse creation, XP award
│   │   │
│   │   ├── world/                  # World state management
│   │   │   ├── AreaManager.ts      # Load JSON areas, resolve exits
│   │   │   ├── RoomManager.ts      # Room lookups by vnum
│   │   │   ├── ResetEngine.ts      # M/O/P/G/E/D/R reset commands
│   │   │   ├── VnumRegistry.ts     # Global vnum→prototype maps
│   │   │   ├── WeatherSystem.ts    # Climate, temperature, precipitation
│   │   │   └── QuestSystem.ts      # Auto-quest generation and tracking
│   │   │
│   │   ├── entities/               # Core data model
│   │   │   ├── Character.ts        # Abstract base (stats, vitals, affects)
│   │   │   ├── Player.ts           # Player subclass (descriptor, XP, save)
│   │   │   ├── Mobile.ts           # NPC subclass (prototype, shop, specFun)
│   │   │   ├── Room.ts             # Room (exits, characters, contents)
│   │   │   ├── Area.ts             # Area (vnum ranges, resets, weather)
│   │   │   ├── GameObject.ts       # Object instance (prototype, values, wear)
│   │   │   ├── Affect.ts           # Buff/debuff (duration, location, modifier)
│   │   │   ├── types.ts            # Enums, interfaces, bitvector constants
│   │   │   └── tables.ts           # Class/race data tables
│   │   │
│   │   ├── spells/                 # Magic system
│   │   │   ├── SpellEngine.ts      # doCast(), castSpell() pipeline
│   │   │   ├── SpellRegistry.ts    # Spell/skill definitions and lookup
│   │   │   ├── SavingThrows.ts     # save_vs_*() with RIS modifiers
│   │   │   └── ComponentSystem.ts  # Spell component validation
│   │   │
│   │   ├── affects/                # Buff/debuff management
│   │   │   ├── AffectManager.ts    # Tick-down, expiry, reapplication
│   │   │   ├── AffectRegistry.ts   # Affect templates
│   │   │   └── StatModifier.ts     # Stat bonus/penalty application
│   │   │
│   │   ├── economy/                # Economic systems
│   │   │   ├── ShopSystem.ts       # Buy/sell with charisma/race modifiers
│   │   │   ├── BankSystem.ts       # Deposit, withdraw, transfer, balance
│   │   │   ├── AuctionSystem.ts    # Timed auction with bidding
│   │   │   └── Currency.ts         # Gold/silver/copper conversion utilities
│   │   │
│   │   └── social/                 # Social systems
│   │       ├── ClanSystem.ts       # Clan/guild/order management
│   │       ├── DeitySystem.ts      # Deity worship and favour
│   │       ├── BoardSystem.ts      # Message boards and notes
│   │       ├── HousingSystem.ts    # Player housing
│   │       └── registerSocialCommands.ts
│   │
│   ├── scripting/                  # MUDprog engine
│   │   ├── MudProgEngine.ts        # mprog_driver(), line-by-line execution
│   │   ├── IfcheckRegistry.ts      # 60+ if-check conditions
│   │   ├── ScriptParser.ts         # if/or/else/endif nesting
│   │   └── VariableSubstitution.ts # $n, $t, $i, $p variable expansion
│   │
│   ├── persistence/                # Database layer
│   │   ├── PlayerRepository.ts     # Load/save PlayerCharacter via Prisma
│   │   └── WorldRepository.ts      # World state persistence
│   │
│   ├── admin/                      # Administration
│   │   ├── AdminRouter.ts          # Express router for /api/admin
│   │   ├── AuthController.ts       # JWT + bcrypt authentication
│   │   ├── MonitoringController.ts # Server stats endpoint
│   │   ├── BanSystem.ts            # Site/name ban management
│   │   ├── TrustLevels.ts          # Trust level constants and helpers
│   │   └── DashboardUI.ts          # Dashboard HTML serving
│   │
│   ├── migration/                  # Legacy import tools
│   │   ├── AreFileParser.ts        # .are file section parser
│   │   ├── PlayerFileParser.ts     # .plr key-value parser
│   │   ├── MigrationRunner.ts      # Orchestrator
│   │   └── index.ts                # CLI entry point
│   │
│   ├── utils/                      # Shared utilities
│   │   ├── AnsiColors.ts           # SMAUG colour codes → ANSI escape sequences
│   │   ├── Dice.ts                 # rollDice(), numberRange(), parseDiceString()
│   │   ├── BitVector.ts            # bigint flag manipulation
│   │   ├── StringUtils.ts          # oneArgument(), isName(), numberArgument()
│   │   └── Logger.ts               # Structured logger with ring buffer
│   │
│   └── main.ts                     # Bootstrap entry point
│
├── prisma/
│   └── schema.prisma               # Full database schema
│
├── public/                         # Browser play client
│   ├── index.html                  # HTML shell
│   └── js/client.ts                # Socket.IO connection + ANSI rendering
│
├── world/                          # JSON world data
│   ├── _example/                   # Example area
│   │   ├── area.json
│   │   ├── rooms.json
│   │   ├── mobiles.json
│   │   ├── objects.json
│   │   ├── resets.json
│   │   ├── shops.json
│   │   └── programs.json
│   ├── helps.json                  # In-game help entries
│   └── socials.json                # Social command definitions
│
├── tests/
│   ├── unit/                       # Isolated unit tests
│   ├── integration/                # Multi-system tests
│   └── e2e/                        # End-to-end scenarios
│
└── docs/                           # Extended documentation
    ├── DEVELOPER_GUIDE.md          # This file
    ├── ADMIN_GUIDE.md              # Server administration
    └── PLAYER_GUIDE.md             # Player-facing guide
```

---

## Core Systems

### GameLoop (`src/core/GameLoop.ts`)

The `GameLoop` class is the heartbeat of the engine. It runs a `setInterval`
at 250 ms (4 pulses per second), matching the legacy `PULSE_PER_SECOND = 4`.

Each pulse executes three phases in strict order:

1. **`connectionManager.processInput()`** — Dequeues one line of input per
   descriptor, dispatches to the nanny state machine or
   `CommandRegistry.dispatch()`.
2. **`tickEngine.pulse(pulseCount)`** — Decrements all pulse counters and fires
   `GameEvent` payloads when counters reach zero.
3. **`connectionManager.flushOutput()`** — Sends accumulated output buffers
   to all connected clients.

Lag detection fires a `GameEvent.LagWarning` if any pulse takes longer than
100 ms.

```typescript
// Simplified pulse() from GameLoop.ts
private pulse(): void {
  this.pulseCount++;
  const startTime = performance.now();

  this.connectionManager.processInput();
  this.tickEngine.pulse(this.pulseCount);
  this.connectionManager.flushOutput();

  const elapsed = performance.now() - startTime;
  if (elapsed > 100) {
    this.emit('lagWarning', { pulseCount: this.pulseCount, elapsedMs: elapsed });
  }
}
```

### EventBus (`src/core/EventBus.ts`)

A synchronous, typed pub/sub system built on Node.js `EventEmitter`. Events
fire on the main thread in listener registration order — no async gaps.

Key event categories:

| Category | Events | Typical Listeners |
|---|---|---|
| Tick | `SecondTick`, `ViolenceTick`, `MobileTick`, `AreaTick`, `FullTick`, `AuctionTick` | CombatEngine, ResetEngine, AffectManager |
| Character | `CharacterEnterRoom`, `CharacterLeaveRoom`, `CharacterDeath`, `CharacterLogin`, `CharacterLogout`, `CharacterLevelUp` | MudProgEngine, QuestSystem |
| Combat | `CombatStart`, `CombatEnd`, `CombatDamage`, `CombatDeath` | DeathHandler, scoring |
| Object | `ObjectPickup`, `ObjectDrop`, `ObjectEquip`, `ObjectRemove`, `ObjectDecay` | MudProgEngine |
| Communication | `ChannelMessage`, `TellMessage`, `SayMessage` | MudProgEngine (speech triggers) |
| World | `AreaReset`, `WeatherChange`, `TimeChange` | WeatherSystem |
| System | `Shutdown`, `Reboot`, `LagWarning` | Main, Logger |

### TickEngine (`src/core/TickEngine.ts`)

Manages pulse-based counters that drive autonomous game updates:

| Counter | Pulses | Real Time | Randomised | Purpose |
|---|---|---|---|---|
| `second` | 4 | 1 s | No | Per-second housekeeping |
| `violence` | 12 | 3 s | No | Combat rounds |
| `mobile` | 16 | 4 s | No | NPC AI, wandering |
| `auction` | 36 | 9 s | No | Auction ticks |
| `area` | 120–360 | 30–90 s | Yes | Area reset checks |
| `tick` | 210–350 | 52–87 s | Yes | Full game tick (regen, affects) |

Area and tick counters use `numberRange()` to stagger updates, preventing all
entities from processing simultaneously — exactly as the legacy engine does.

### CommandRegistry (`src/game/commands/CommandRegistry.ts`)

Central command dispatch. Commands are registered at startup and stored in a
hash table indexed by the first character of the command name.

Dispatch pipeline:

1. Check `ch.wait > 0` (command lag) — skip if lagged.
2. If the descriptor state is `Editing`, route to the OLC editor.
3. Parse the first word of input via `oneArgument()`.
4. Check `PLR_FROZEN` — refuse all input from frozen players.
5. Walk the hash chain for `command[0]`, find the first match where
   `strPrefix(input, cmd.name)` and `cmd.level <= ch.getTrust()`.
6. Validate position via `checkPosition()`.
7. Execute the handler, wrapped in error isolation.
8. If no command matched, fall back to `checkSocial()`.
9. If still no match, send `"Huh?\r\n"`.

Key types:

```typescript
export interface CommandDef {
  name: string;
  handler: (ch: Character, argument: string) => void;
  position: Position;        // Minimum position required
  level: number;             // Minimum trust level
  log: CommandLogLevel;
  flags: CommandFlags;
}

export interface SocialDef {
  name: string;
  charNoArg: string;
  othersNoArg: string;
  charFound: string;
  othersFound: string;
  victFound: string;
  charAuto: string;
  othersAuto: string;
}
```

### Entity System

The entity system mirrors the legacy prototype-instance pattern:

- **Prototypes** (`MobilePrototype`, `ObjectPrototype`) are loaded from JSON
  files at startup and identified by vnum. They live in `VnumRegistry`.
- **Instances** (`Mobile`, `GameObject`) are created from prototypes at runtime
  via area resets or player actions.

**Class hierarchy:**

```
Character (abstract)
  ├── Player      # Connected human — has Descriptor, pcData, save()
  └── Mobile      # NPC — has MobilePrototype, shopData, specFun

Room              # Contains characters, objects, exits, extra descriptions
Area              # Collection of rooms + prototypes + resets
GameObject        # Item instance — weapon, armour, potion, container, etc.
Affect            # Temporary modifier — type, duration, location, modifier, bitvector
```

**Key design choices:**

- `Character.affectedBy` uses `bigint` bitvectors to support > 32 flags.
- `StatBlock` uses named fields (`str`, `int`, `wis`, `dex`, `con`, `cha`,
  `lck`) rather than an indexed array.
- `Equipment` is stored as `Map<WearLocation, GameObject>` with 26 wear slots.

### World Loading

`AreaManager.loadAllAreas()` scans the `./world/` directory for subdirectories,
each containing area JSON files. The loading sequence:

1. Read `area.json` → create `Area` instance.
2. Read `rooms.json` → create `Room` instances, register in `VnumRegistry`.
3. Read `mobiles.json` → create `MobilePrototype` entries.
4. Read `objects.json` → create `ObjectPrototype` entries.
5. Read `resets.json` → attach reset commands to the area.
6. Read `shops.json` → link shops to mobile prototypes.
7. Read `programs.json` → attach MUDprogs to entity prototypes.

After all areas load, `AreaManager.resolveExits()` walks every room and
resolves exit `toVnum` references to actual `Room` objects.

Initial area resets then run `ResetEngine.resetArea()` for each area, spawning
the starting population of mobiles and objects.

### Persistence

**Player data** flows through `PlayerRepository` using Prisma:

- `savePlayer(player)` → upserts `PlayerCharacter` plus related
  `PlayerAffect`, `PlayerSkill`, `PlayerEquipment`, and `PlayerInventory`
  records in a single transaction.
- `loadPlayer(name)` → fetches the full player record with all relations.

**World data** is stored as JSON files under `./world/`. Modified areas can
be written back via `WorldRepository`.

### Network Layer

`NetworkServer` creates an HTTP server and attaches both a `ws` WebSocket
server (path `/ws`) and a Socket.IO server (path `/play`).

`ConnectionManager` wraps each connection in a `Descriptor` — the TypeScript
equivalent of the legacy `descriptor_data`. The descriptor manages:

- **Connection state** via `ConnectionState` enum (mirrors legacy `CON_*`).
- **Input queue** — lines waiting to be processed.
- **Output buffer** — text waiting to be flushed.
- **Pager** — for long output.
- **OLC editor state** — tracks which entity is being edited.

---

## Coding Standards

### Language and Style

- **TypeScript strict mode** — `strict: true` in `tsconfig.json`. No `any`
  except when interfacing with legacy data structures (documented with a
  comment).
- **ES module syntax** — `import` / `export` exclusively. No `require()`.
- **British English** — Use British spelling throughout code, comments, and
  documentation: "colour", "behaviour", "initialise", "serialise".
- **Semicolons** — Always. Enforced by Prettier.
- **Single quotes** — For strings. Enforced by Prettier.
- **Trailing commas** — Always. Enforced by Prettier.
- **100-character line width** — Enforced by Prettier.

### Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Classes | PascalCase | `CombatEngine`, `MobilePrototype` |
| Interfaces | PascalCase, prefixed with `I` only when needed | `CommandDef`, `ITransport` |
| Enums | PascalCase | `Position`, `Direction`, `GameEvent` |
| Enum members | PascalCase | `Position.Standing`, `Direction.North` |
| Functions | camelCase | `registerMovementCommands()` |
| Constants | UPPER_SNAKE_CASE or PascalCase object | `PULSE`, `TRUST_LEVELS` |
| Files | PascalCase for classes, camelCase for modules | `CombatEngine.ts`, `movement.ts` |

### Error Handling

- Use `try/catch` around command handlers. The `CommandRegistry` wraps
  execution automatically.
- Never let an unhandled exception crash the game loop. The `Logger`'s
  `wrapCommandExecution()` helper catches and logs errors.
- Use `Logger.error()` for recoverable errors; `Logger.fatal()` for
  unrecoverable ones (triggers graceful shutdown).

### Git Practices

- Write commit messages in the imperative mood: "Add backstab command", not
  "Added backstab command".
- Keep commits atomic — one logical change per commit.
- Prefix branch names: `feat/`, `fix/`, `docs/`, `refactor/`.

---

## Tutorials

### Tutorial 1: Adding a New Command

Let us add a `recall` command that teleports the player to their recall point.

**Step 1.** Open `src/game/commands/movement.ts` (or create a new file if the
command belongs to a different group).

**Step 2.** Define the handler function:

```typescript
function doRecall(ch: Character, _argument: string): void {
  if (ch.isNpc) {
    ch.sendToChar('Only players may recall.\r\n');
    return;
  }

  const recallVnum = 3001; // Default temple of Midgaard
  const recallRoom = ch.inRoom; // TODO: resolve from vnumRegistry

  if (!recallRoom) {
    ch.sendToChar('You are completely lost.\r\n');
    return;
  }

  if (ch.fighting) {
    ch.sendToChar('You are too busy fighting!\r\n');
    return;
  }

  ch.sendToChar('You pray to the gods for transportation!\r\n');
  // Move the character (see movement helpers)
}
```

**Step 3.** Register the command in the registration function:

```typescript
export function registerMovementCommands(registry: CommandRegistry): void {
  // ... existing registrations ...

  registry.register({
    name: 'recall',
    handler: doRecall,
    position: Position.Standing,
    level: 0,
    log: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
  });
}
```

**Step 4.** Write a test in `tests/unit/commands/movement.test.ts`:

```typescript
describe('recall', () => {
  it('should refuse to recall while fighting', () => {
    const player = createMockPlayer();
    player.fighting = createMockMobile();
    doRecall(player, '');
    expect(player.lastOutput).toContain('too busy fighting');
  });
});
```

**Step 5.** Run `npm test` and `npm run lint` to verify.

---

### Tutorial 2: Adding a New Spell

**Step 1.** Register the spell definition in `src/game/spells/SpellRegistry.ts`:

```typescript
registerSpell({
  id: 'fireball',
  name: 'fireball',
  slot: 26,
  skillLevel: { mage: 22, cleric: 0, thief: 0, warrior: 0 },
  minMana: 15,
  beats: 12,
  target: TargetType.CharOffensive,
  minimumPosition: Position.Fighting,
  saves: SaveType.SpellStaff,
  difficulty: 1,
  nounDamage: 'fireball',
  msgOff: 'The flames around you die out.',
  diceString: '10d8+40',
});
```

**Step 2.** Implement the spell function in `src/game/spells/SpellEngine.ts`
or a dedicated spell file:

```typescript
export function spellFireball(
  sn: number,
  level: number,
  ch: Character,
  victim: Character,
): SpellResult {
  const dice = parseDiceString('10d8+40');
  let damage = rollDice(dice.numDice, dice.sizeDice) + dice.bonus;
  damage = Math.floor(damage * (level / 50));

  if (savingThrow(victim, SaveType.SpellStaff, level)) {
    damage = Math.floor(damage / 2);
  }

  return dealSpellDamage(ch, victim, damage, sn, 'fireball');
}
```

**Step 3.** Write tests covering: mana cost, saving throw halving, damage
range, and failure when silenced.

---

### Tutorial 3: Adding a New Skill

Skills differ from spells in their function signature and lack of mana cost.

**Step 1.** Register the skill in `SpellRegistry.ts`:

```typescript
registerSkill({
  id: 'trip',
  name: 'trip',
  skillLevel: { mage: 0, cleric: 0, thief: 5, warrior: 8 },
  beats: 12, // command lag in pulses
  target: TargetType.CharOffensive,
  minimumPosition: Position.Fighting,
});
```

**Step 2.** Implement the handler in `src/game/commands/combat.ts`:

```typescript
function doTrip(ch: Character, argument: string): void {
  const victim = findFightingTarget(ch, argument);
  if (!victim) return;

  const learned = (ch as Player).getLearnedPercent(gsn_trip);
  if (numberPercent() > learned) {
    ch.sendToChar('You stumble and fall!\r\n');
    return;
  }

  // Apply knockdown
  victim.position = Position.Sitting;
  victim.wait = 2 * PULSE.VIOLENCE;
  ch.sendToChar(`You trip ${victim.name} and they fall!\r\n`);
}
```

**Step 3.** Register the command with `Position.Fighting` and appropriate trust.

---

### Tutorial 4: Adding a New Entity Type

Suppose you want to add a `Vehicle` entity for ships or mounts with storage.

**Step 1.** Create `src/game/entities/Vehicle.ts`:

```typescript
import type { Room } from './Room.js';
import type { GameObject } from './GameObject.js';

export class Vehicle {
  readonly id: string;
  name: string;
  description: string;
  inRoom: Room | null = null;
  cargo: GameObject[] = [];
  speed: number = 1;
  maxCargo: number = 100;

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  addCargo(obj: GameObject): boolean {
    if (this.cargo.length >= this.maxCargo) return false;
    this.cargo.push(obj);
    return true;
  }
}
```

**Step 2.** Register a `VehiclePrototype` type in `types.ts` and add it to
`VnumRegistry` if it uses vnums.

**Step 3.** Write unit tests for all methods.

**Step 4.** Add commands (`board`, `disembark`, `stow`, `unstow`) in a new
`src/game/commands/vehicle.ts` module.

---

### Tutorial 5: Adding a New Communication Channel

**Step 1.** Add the channel constant to `src/game/commands/communication.ts`:

```typescript
export const CHANNEL_TRADE = 1n << 20n;
```

**Step 2.** Create the channel handler following the `talk_channel()` pattern:

```typescript
function doTrade(ch: Character, argument: string): void {
  if (!argument.trim()) {
    toggleDeaf(ch, CHANNEL_TRADE, 'Trade');
    return;
  }
  talkChannel(ch, argument, CHANNEL_TRADE, 'trade', '&Y[Trade] ');
}
```

**Step 3.** Register the command:

```typescript
registry.register({
  name: 'trade',
  handler: doTrade,
  position: Position.Resting,
  level: 0,
  log: CommandLogLevel.Normal,
  flags: defaultCommandFlags(),
});
```

**Step 4.** Add the channel to the deaf bitmask documentation and update tests.

---

### Tutorial 6: Adding a MUDprog

MUDprogs are event-driven scripts attached to mobiles, objects, or rooms.

**Step 1.** In the area's `programs.json`, add a new programme:

```json
{
  "vnum": 3001,
  "entityType": "mobile",
  "type": "GREET_PROG",
  "argList": "100",
  "comList": [
    "if ispc($n)",
    "  say Welcome, $n! How may I help you?",
    "endif"
  ]
}
```

- `type` — Trigger type (e.g. `GREET_PROG`, `SPEECH_PROG`, `DEATH_PROG`).
- `argList` — Trigger argument (percentage chance for `GREET_PROG`).
- `comList` — Script body, one line per array element.

**Step 2.** The `MudProgEngine` automatically attaches the programme to the
entity during area loading. No code changes needed.

**Step 3.** Test in-game by entering the room or interacting with the entity.
Use `mstat <mobile>` to verify programmes are attached.

**Available if-checks** (see `src/scripting/IfcheckRegistry.ts`):
`ispc`, `isnpc`, `level`, `class`, `race`, `sex`, `hitprcnt`, `goldamt`,
`isfight`, `isimmort`, `isaffected`, `inroom`, `rand`, `cansee`, `wearing`,
and many more.

**Variable substitution** (`$n` = actor name, `$t` = victim, `$i` = mob,
`$p` = object, etc.) is handled by `VariableSubstitution.ts`.

---

## Admin Dashboard Development

The admin REST API is served via Express middleware mounted on the same HTTP
server as the game. Endpoints live in `src/admin/AdminRouter.ts` and are
protected by JWT authentication via `AuthController.ts`.

### API Endpoints

| Method | Path | Description | Trust |
|---|---|---|---|
| `POST` | `/api/admin/login` | Authenticate, receive JWT | Any |
| `GET` | `/api/admin/status` | Server uptime, player count | 51+ |
| `GET` | `/api/admin/players` | List online players | 51+ |
| `GET` | `/api/admin/stats` | Detailed server statistics | 53+ |
| `GET` | `/api/admin/areas` | Area list with vnum ranges | 53+ |
| `GET` | `/api/admin/bans` | Active ban list | 55+ |
| `POST` | `/api/admin/bans` | Add a ban | 55+ |
| `DELETE` | `/api/admin/bans/:id` | Remove a ban | 55+ |
| `GET` | `/api/admin/audit` | Audit log entries | 58+ |
| `GET` | `/api/health` | Health check (no auth) | None |

### Adding a New Dashboard Endpoint

1. Define the route handler in `AdminRouter.ts`.
2. Use the `requireTrust(level)` middleware for access control.
3. Return JSON — the dashboard UI consumes REST responses.
4. Write an integration test in `tests/integration/AdminAPI.test.ts`.

### Dashboard UI

The browser-based admin panel is served from `src/admin/DashboardUI.ts`.
It renders server-side HTML that calls the REST API via `fetch()`. To extend
the dashboard:

1. Add a new panel method to `DashboardUI.ts`.
2. Include the panel in the navigation.
3. Use the existing CSS utility classes for consistent styling.

---

## Browser Play Client Development

The browser play client is a lightweight HTML/JS application served from
`public/`. It connects via Socket.IO to `SOCKETIO_PATH` (`/play`).

### Architecture

```
public/
├── index.html      # Shell HTML with terminal container
└── js/
    └── client.ts   # Socket.IO client + ANSI rendering
```

`client.ts` handles:

- Socket.IO connection lifecycle (connect, disconnect, reconnect).
- Rendering ANSI colour codes to styled `<span>` elements.
- Keyboard input capture and submission.
- Input history (up/down arrows).
- Automatic scrolling.

### Extending the Client

- **Add a minimap panel:** Create a `<div>` alongside the terminal. Listen for
  `room` events from Socket.IO and render a map grid.
- **Sound effects:** Listen for `sound` events (e.g. combat, spell) and play
  HTML5 Audio clips.
- **Mobile layout:** The CSS uses responsive breakpoints. Test changes at
  common viewport widths.

---

## Testing Guide

### Test Organisation

```
tests/
├── unit/           # Fast, isolated, no I/O
│   ├── core/       # EventBus, TickEngine
│   ├── utils/      # AnsiColors, Dice, BitVector, StringUtils
│   ├── entities/   # Character, Room, Affect, tables
│   ├── commands/   # Each command group
│   ├── combat/     # CombatEngine, DamageCalculator, DeathHandler
│   ├── spells/     # SpellEngine, SpellRegistry, SavingThrows
│   ├── affects/    # AffectManager, AffectRegistry, StatModifier
│   ├── economy/    # ShopSystem, BankSystem, AuctionSystem, Currency
│   ├── world/      # AreaManager, ResetEngine, VnumRegistry, WeatherSystem, QuestSystem
│   ├── social/     # ClanSystem, DeitySystem, BoardSystem, HousingSystem
│   ├── scripting/  # MudProgEngine, IfcheckRegistry, ScriptParser, VariableSubstitution
│   ├── admin/      # AuthController, BanSystem, MonitoringController, TrustLevels
│   ├── migration/  # AreFileParser, PlayerFileParser, MigrationRunner
│   ├── network/    # SocketIOAdapter, TelnetProtocol, ConnectionManager
│   ├── persistence/# PlayerRepository, WorldRepository
│   ├── systems/    # alias, authorize, hell, news, overland, substate, tellhistory, watch
│   └── client/     # BrowserPlayClient
├── integration/    # Tests requiring multiple subsystems
│   ├── AdminAPI.test.ts
│   ├── CombatRound.test.ts
│   ├── MudProgExecution.test.ts
│   ├── PlayerPersistence.test.ts
│   ├── ShopTransaction.test.ts
│   ├── SpellCombat.test.ts
│   └── WorldLoader.test.ts
└── e2e/            # Full end-to-end scenarios
    ├── CombatScenario.test.ts
    ├── PlayerLogin.test.ts
    └── ShopTransaction.test.ts
```

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# Run a specific test file
npx vitest run tests/unit/commands/movement.test.ts

# Run tests matching a pattern
npx vitest run -t "backstab"
```

### Writing Tests

Use Vitest's `describe`/`it`/`expect` syntax. Create mock objects using
factory functions:

```typescript
import { describe, it, expect } from 'vitest';

function createMockPlayer(overrides: Partial<Player> = {}): Player {
  // Return a minimal Player with sensible defaults
}

describe('doLook', () => {
  it('should show the room description to a sighted player', () => {
    const player = createMockPlayer();
    const room = createMockRoom({ name: 'Temple', description: 'A grand temple.' });
    player.inRoom = room;
    doLook(player, '');
    expect(player.lastOutput).toContain('A grand temple.');
  });
});
```

### Test Conventions

- One `describe` block per function or class method.
- Test both the happy path and edge cases (null inputs, boundary values).
- Use `it.todo('should handle X')` for planned but unimplemented tests (these
  are tracked in the Phase 4 parity verification).
- Integration tests may use a real Prisma client against a test database or
  mock the Prisma layer.

---

## Debugging Tips

### Enable Verbose Logging

Set `LOG_LEVEL=debug` in your `.env` file to see detailed output from all
subsystems.

### Inspect the Game Loop

Add temporary logging in `GameLoop.pulse()`:

```typescript
console.log(`Pulse #${this.pulseCount}, descriptors: ${this.connectionManager.getAllDescriptors().length}`);
```

### Trace Command Dispatch

`CommandRegistry.dispatch()` already logs command execution times. Enable
`CommandLogLevel.Always` on a specific command to see every invocation.

### Use the Logger Ring Buffer

`Logger` maintains a 10,000-entry ring buffer. Access recent entries via:

```typescript
const recentErrors = logger.getRecentEntries('error', 50);
```

### Debug MUDprogs

Set `silent` mode off in the programme and add `mpmset` commands to inspect
variables at runtime. The `MudProgEngine` logs each executed line when
`LOG_LEVEL=debug`.

### Common Pitfalls

1. **Circular imports** — Use `import type` for type-only imports to break
   cycles. The entity files (Character ↔ Room ↔ Area) are the most common
   offenders.
2. **BigInt comparisons** — Always use `===` with bigint literals (`0n`, not
   `0`). Mixing `number` and `bigint` throws at runtime.
3. **Missing `.js` extension** — ES module imports require the `.js` extension
   even though the source is `.ts`. TypeScript compiles but Node.js fails at
   runtime without it.
4. **Prototype vs instance** — Modifying a `MobilePrototype` affects all future
   instances. Always modify the `Mobile` instance unless you intend to change
   the prototype.

---

## Legacy Migration Internals

### AreFileParser (`src/migration/AreFileParser.ts`)

Parses legacy `.are` files section by section:

| Section | Method | Output |
|---|---|---|
| `#AREA` | `parseAreaHeader()` | `area.json` |
| `#MOBILES` | `parseMobiles()` | `mobiles.json` — handles S/C/V complexity |
| `#OBJECTS` | `parseObjects()` | `objects.json` — includes affects (A), extra descs (E) |
| `#ROOMS` | `parseRooms()` | `rooms.json` — exits (D), extra descs (E), resets |
| `#RESETS` | `parseResets()` | `resets.json` |
| `#SHOPS` | `parseShops()` | `shops.json` |
| `#REPAIRSHOPS` | `parseRepairShops()` | `shops.json` (merged) |
| `#SPECIALS` | `parseSpecials()` | Linked to mobile prototypes |
| `#MUDPROGS` | `parseMudProgs()` | `programs.json` |

String parsing uses `readString()` which reads until `~` (tilde terminator)
and `readNumber()` which reads whitespace-delimited integers.

### PlayerFileParser (`src/migration/PlayerFileParser.ts`)

Reads legacy key-value text format (`#PLAYER` … `#END`). Maps fields to the
Prisma `PlayerCharacter` model. Notable transformations:

- `AttrPerm`/`AttrMod` → JSON `permStats`/`modStats` objects.
- `Skill '<name>' <percent>` → `PlayerSkill` records.
- `AffectData '<name>' <dur> <mod> <loc> <bv>` → `PlayerAffect` records.
- Passwords are rehashed from unsalted SHA-256 to bcrypt.

### MigrationRunner (`src/migration/MigrationRunner.ts`)

Orchestrates the full migration pipeline:

1. Scan input directory for `.are` / `.plr` files.
2. Parse each file using the appropriate parser.
3. Write JSON output (areas) or insert into PostgreSQL (players).
4. Log statistics: files processed, entities created, warnings.

---

## FAQ

**Q: Why is the game loop 250 ms and not faster?**
A: The legacy engine uses `PULSE_PER_SECOND = 4`, meaning 250 ms per pulse.
All game timing (combat rounds at 12 pulses = 3 s, NPC AI at 16 pulses = 4 s)
is calibrated to this rate. Changing it would alter the game's feel.

**Q: Can I use `async`/`await` in command handlers?**
A: Generally no. The game loop is synchronous. If a command handler `await`s
a Prisma call, it introduces a gap where other commands could execute in an
inconsistent state. Use `async` only in the persistence layer, which runs
outside the critical game loop path (e.g. player save on quit).

**Q: Why `bigint` for bitvectors instead of a `Set<string>`?**
A: Performance and legacy compatibility. The C engine uses integer bitmasks
everywhere. `bigint` allows direct bitwise operations (AND, OR, XOR) that are
fast and familiar. Some flag fields exceed 32 bits, which JavaScript `number`
cannot represent faithfully.

**Q: How do I add a new race or class?**
A: Update `src/game/entities/tables.ts` to add the race/class definition.
Update `src/game/entities/types.ts` if new enum values are needed. Update
`SpellRegistry` skill-level arrays to include the new class index.

**Q: Why are imports suffixed with `.js`?**
A: TypeScript compiles `.ts` to `.js` but does not rewrite import paths.
Node.js ESM resolution requires the actual file extension. So you write
`import { Foo } from './Foo.js'` even though the source file is `Foo.ts`.

**Q: How do I run only one test file?**
A: `npx vitest run tests/unit/commands/movement.test.ts`

**Q: What is the `VnumRegistry` and why is it separate from `AreaManager`?**
A: `VnumRegistry` is a flat lookup table mapping vnums to prototypes and rooms
across all areas. `AreaManager` manages area lifecycle (loading, saving,
resetting). The separation avoids circular dependencies and allows any
subsystem to look up a vnum without depending on `AreaManager`.

**Q: How does the pager work?**
A: When output exceeds the player's screen height (`pcData.pagerLen`), the
`Descriptor` buffers the text in `pagerBuffer` and sends one page at a time.
The player presses Enter or Space to advance, or `q` to quit.

**Q: Can I run multiple instances of the server?**
A: Yes, but each needs its own database and port. Set different `PORT` and
`DATABASE_URL` values in each instance's `.env`.

**Q: How do I create a new area from scratch?**
A: See the [Admin Guide](ADMIN_GUIDE.md#olc-tutorials). You can use in-game
OLC commands (`redit`, `medit`, `oedit`) or create JSON files directly in the
`world/` directory following the `_example/` template.

**Q: What happens if the server crashes mid-save?**
A: Prisma transactions ensure atomicity. Either the full player save commits
or nothing does. World data JSON writes are atomic via write-to-temp-then-rename.

**Q: How do I contribute a bug fix?**
A: Fork the repository, create a branch, fix the bug, add a test, and submit
a pull request. See the [Contributing](../README.md#contributing) section.

**Q: Where is the legacy C source?**
A: The `legacy/` directory contains the original SMAUG 2.0 C source for
reference. It is read-only and not compiled as part of the TypeScript build.

**Q: How do I enable MCCP (MUD Client Compression Protocol)?**
A: MCCP negotiation is handled in `TelnetProtocol.ts`. It activates
automatically when a client signals support during option negotiation. No
configuration is needed.

**Q: What is `supermob`?**
A: When an object or room programme executes, a temporary "super mobile" is
configured with the entity's context so the scripting engine can use standard
NPC commands. This is a legacy pattern preserved from the C engine.
