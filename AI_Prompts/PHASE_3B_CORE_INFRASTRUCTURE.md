# SMAUG 2.0 TypeScript Port — Phase 3B: Core Infrastructure

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phase 3A has created the complete project skeleton: npm initialisation, TypeScript strict-mode configuration, ESLint, Vitest, environment files, the full directory tree with JSDoc-annotated stub files for every module, the complete Prisma schema (generated successfully), and a stub entry point. All stub files compile cleanly. The project is ready for core infrastructure implementation.
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

**Sub-Phase 3A (Project Initialisation)** is complete. The following artefacts exist and must not be modified:

| Artefact | Status |
|---|---|
| `package.json` | All dependencies installed, all scripts configured |
| `tsconfig.json` | Strict mode, ES2022, Node16 modules |
| `.eslintrc.cjs` | TypeScript parser, recommended rules |
| `vitest.config.ts` | Configured for `tests/**/*.test.ts` |
| `.env` / `.env.example` | All environment variables defined |
| `.gitignore` | Excludes build artefacts, `.env`, `node_modules/` |
| `prisma/schema.prisma` | Complete schema with all models and enums, Prisma client generated |
| All `src/` stub files | Empty classes/functions with JSDoc comments |
| `README.md` | Setup instructions and project overview |

**Do NOT modify any of the above configuration files.** You may import from them freely and will replace stub file contents with full implementations.

---

## Sub-Phase 3B Objective

Replace stubs with working implementations for the core engine layer (EventBus, TickEngine, GameLoop), the network layer (WebSocketServer, ConnectionManager, Descriptor), utility modules (Logger, AnsiColors, Dice, BitVector), entity type definitions, and the application entry point. After this phase, the server boots, accepts WebSocket and Socket.IO connections, runs the pulse-based game loop, and presents the login prompt.

---

## Files to Implement

### 1. `src/core/EventBus.ts` — Typed Event System

Replace the stub with a synchronous, typed pub/sub system built on Node.js `EventEmitter`.

- Extend `EventEmitter` with `setMaxListeners(200)`.
- Define a `GameEvent` string enum with ALL event names grouped by domain:

| Domain | Events |
|---|---|
| Tick | `tick:second`, `tick:violence`, `tick:mobile`, `tick:area`, `tick:full`, `tick:auction` |
| Character | `char:enterRoom`, `char:leaveRoom`, `char:death`, `char:login`, `char:logout`, `char:levelUp` |
| Combat | `combat:start`, `combat:end`, `combat:damage`, `combat:death` |
| Object | `object:pickup`, `object:drop`, `object:equip`, `object:remove`, `object:decay` |
| Communication | `comm:channel`, `comm:tell`, `comm:say` |
| World | `world:areaReset`, `world:weatherChange`, `world:timeChange` |
| Admin | `admin:action`, `admin:authorize` |
| System | `system:shutdown`, `system:reboot`, `system:lagWarning` |
| MudProg | `mudprog:trigger` |

- Define typed payload interfaces for each event group:
  - `TickPayload { pulse: number }`
  - `CharacterRoomPayload { characterId: string; roomVnum: number; direction?: number }`
  - `CombatDamagePayload { attackerId: string; victimId: string; damage: number; damageType: string; skillName?: string }`
- Provide a type-safe `emitEvent<T>(event: GameEvent, payload: T)` wrapper.
- All listeners fire synchronously on the main thread (no async) to match legacy direct-call behaviour and prevent state inconsistency.

### 2. `src/core/TickEngine.ts` — Pulse-Based Timer System

Replace the stub. Manages all pulse-based counters.

- Define PULSE constants matching legacy values exactly:

| Constant | Value | Real Time | Purpose |
|---|---|---|---|
| `PER_SECOND` | 4 | 0.25s per pulse | Base pulse rate |
| `VIOLENCE` | 12 | 3s | Combat rounds |
| `MOBILE` | 16 | 4s | NPC AI ticks |
| `AUCTION` | 36 | 9s | Auction ticks |
| `AREA` | 240 | 60s | Area reset checks |
| `TICK` | 280 | 70s | Full game tick (SECONDS_PER_TICK = 70) |
| `CASINO` | 32 | 8s | Casino ticks |

- Maintain decrementing counters for: `violence`, `mobile`, `area`, `tick`, `second`, `auction`.
- On each `pulse(pulseNumber)` call, decrement all counters and emit the corresponding `GameEvent` via the EventBus when a counter reaches zero, then reset the counter.
- Area counter randomised on reset: `numberRange(PULSE_AREA / 2, 3 * PULSE_AREA / 2)` → 120–360.
- Tick counter randomised on reset: `numberRange(PULSE_TICK * 0.75, PULSE_TICK * 1.25)` → 210–350.
- Import `numberRange` from the Dice utility.

### 3. `src/core/GameLoop.ts` — Engine Heartbeat

Replace the stub. The main game loop that drives every subsystem.

- Configurable via `GameLoopConfig` interface: `pulseInterval` (default 250ms), `randomizePulses` (default true).
- Uses `setInterval` at `pulseInterval` ms.
- Each pulse executes in this exact order:
  1. `connectionManager.processInput()` — process one input line per descriptor.
  2. `tickEngine.pulse(pulseCount)` — fire tick-based events.
  3. `connectionManager.flushOutput()` — flush all output buffers.
- Tracks `pulseCount` (incrementing integer).
- **Performance monitoring:** If pulse processing exceeds 100ms, emit a `system:lagWarning` event with `{ pulseCount, elapsedMs }`.
- Provides `start()`, `stop()`, `isRunning` (getter), `currentPulse` (getter).

### 4. `src/utils/Logger.ts` — Structured Logger

Replace the stub. Domain-tagged structured logging.

- **Log levels:** `error`, `warn`, `info`, `debug`, `trace`.
- **Domain tags:** `[BOOT]`, `[NET]`, `[CMD]`, `[COMBAT]`, `[MAGIC]`, `[WORLD]`, `[SAVE]`, `[ADMIN]`, `[MUDPROG]`, `[SYSTEM]`.
- **Output format:** `[YYYY-MM-DD HH:mm:ss] [LEVEL] [DOMAIN] message`.
- **Methods:**
  - `error(domain, message, ...args)`
  - `warn(domain, message, ...args)`
  - `info(domain, message, ...args)`
  - `debug(domain, message, ...args)`
  - `trace(domain, message, ...args)`
- **Configuration:** Set minimum log level from `LOG_LEVEL` environment variable.
- **`wrapCommandExecution(domain, fn)`** — Execute a function with try-catch, log errors with domain tag, return elapsed time in ms.
- Write to `stdout` using `process.stdout.write()` (not `console.log`).

### 5. `src/utils/AnsiColors.ts` — ANSI Color System

Replace the stub. Implement the complete SMAUG color code system:

- **`COLOR_MAP`** — Full mapping of `&x`/`&r`/`&g`/`&O`/`&b`/`&p`/`&c`/`&w` (normal foreground), `&z`/`&R`/`&G`/`&Y`/`&B`/`&P`/`&C`/`&W` (bold/bright foreground), `^X` codes (background), `}X` codes (blink). Include `&D`/`&d` for reset (`\x1b[0m`).
- **`colorize(text, ansiEnabled)`** — Convert SMAUG `&X`/`^X`/`}X` codes to ANSI escape sequences. If `ansiEnabled` is false, strip all color codes entirely. Must handle nested/adjacent codes.
- **`colorStrlen(text)`** — Calculate visible string length excluding both SMAUG color codes (`&X`, `^X`, `}X`) and raw ANSI escape sequences (`\x1b[...m`). Replicates legacy `color_strlen()`.
- **`stripColor(text)`** — Remove all color codes (both SMAUG and ANSI) returning plain text.
- **`padRight(text, width)`** / **`padCenter(text, width)`** — Pad strings using `colorStrlen` for width calculation so colored strings align correctly in columns.
- **`wordWrap(text, width)`** — Word-wrap text at `width` visible characters, respecting color codes that span line breaks (re-emit the active color code at the start of each new line).

### 6. `src/utils/Dice.ts` — Dice and Random Utilities

Replace the stub:

- **`rollDice(count, sides)`** — Roll `count` dice of `sides` sides, return sum. Replicates legacy `dice()`.
- **`numberRange(low, high)`** — Random integer in [low, high] inclusive. Replicates legacy `number_range()`.
- **`numberPercent()`** — Random 1–100. Replicates legacy `number_percent()`.
- **`numberBits(width)`** — Random number using `width` bits. Replicates legacy `number_bits()`.
- **`numberFuzzy(number)`** — Return number ±1 randomly. Replicates legacy `number_fuzzy()`.
- **`parseDiceString(str)`** — Parse `"NdS+P"` format strings (used in spell damage definitions) into `{count, sides, plus}`.

### 7. `src/utils/BitVector.ts` — Bitvector Utilities

Replace the stub. All flag fields use `bigint`:

- **`hasFlag(flags, flag)`** — `(flags & flag) !== 0n`
- **`setFlag(flags, flag)`** — `flags | flag`
- **`removeFlag(flags, flag)`** — `flags & ~flag`
- **`toggleFlag(flags, flag)`** — `flags ^ flag`
- **`flagsToArray(flags, flagMap)`** — Convert a bigint to an array of human-readable flag names using a `Record<string, bigint>` map.
- **`arrayToFlags(names, flagMap)`** — Reverse of `flagsToArray`.
- **`parseFlagString(str, flagMap)`** — Parse space-separated flag names into a bigint. Used by the world loader and OLC.

### 8. `src/utils/StringUtils.ts` — String Matching and Formatting

Replace the stub:

- **`isName(str, namelist)`** — Check if `str` matches any keyword in a space-separated `namelist`. Case-insensitive. Replicates legacy `is_name()`.
- **`isNamePrefix(str, namelist)`** — Prefix-match variant. Replicates legacy `is_name_prefix()`.
- **`oneArgument(argument)`** — Extract the first word from `argument`, return `[firstWord, rest]`. Handle single-quoted multi-word arguments (`'two words'`). Replicates legacy `one_argument()`.
- **`strPrefix(astr, bstr)`** — Return true if `astr` is a prefix of `bstr`. Case-insensitive. Replicates legacy `str_prefix()` — this is the core of command abbreviation matching.
- **`smash_tilde(str)`** — Replace `~` with `-`. Legacy uses `~` as a string terminator in files.
- **`capitalize(str)`** — Capitalise first letter.
- **`numberArgument(argument)`** — Parse `"N.keyword"` into `{number, keyword}`. Replicates legacy `number_argument()` for targeting the Nth matching item.
- **`formatString(str)`** — Capitalise first letter, ensure trailing newline. Replicates legacy `format_string()`.

### 9. `src/game/entities/types.ts` — Entity Type Definitions

Replace the stub with ALL enums, bitvector constants, and interfaces:

#### Enums (match legacy values exactly)

- **`Sex`** — `Neutral = 0`, `Male = 1`, `Female = 2`
- **`Position`** (all 16 values) — `Dead = 0` through `Berserk = 15`
- **`Direction`** (all 11 values) — `North = 0` through `Somewhere = 10`
- **`SectorType`** (all 16 values) — `Inside = 0` through `Swamp = 15`
- **`WearLocation`** (all 27 values) — `None = -1` through `AnkleR = 25`
- **`ItemType`** (all ~65 values) — `None = 0` through `Piece = 69`
- **`ApplyType`** (all 67 values) — `None = 0` through `Blood = 66`
- **`SaveType`** — `None = 0` through `SpellStaff = 5`
- **`DamageType`** — `Hit = 0` through `Thrust = 17`

#### Bitvector Constants (as `bigint`)

- **`AFF`** — All affect flags (`BLIND`, `INVISIBLE`, `DETECT_EVIL`, `DETECT_INVIS`, `DETECT_MAGIC`, `DETECT_HIDDEN`, `HOLD`, `SANCTUARY`, `FAERIE_FIRE`, `INFRARED`, `CURSE`, `FLAMING`, `POISON`, `PROTECT`, `PARALYSIS`, `SNEAK`, `HIDE`, `SLEEP`, `CHARM`, `FLYING`, `PASS_DOOR`, `FLOATING`, `TRUESIGHT`, `DETECT_TRAPS`, `SCRYING`, `FIRESHIELD`, `SHOCKSHIELD`, `HAUS1`, `ICESHIELD`, `POSSESS`, `BERSERK`, `AQUA_BREATH`). Each as `1n << Nn`.
- **`ROOM_FLAGS`** — All room flags (`DARK`, `DEATH`, `NO_MOB`, `INDOORS`, etc.) as `1 << N` integers.

#### Interfaces

- **`StatBlock`** — `{ str, int, wis, dex, con, cha, lck }` (all `number`).
- **`Currency`** — `{ gold, silver, copper }` (all `number`).
- **`ExtraDescription`** — `{ keywords: string[], description: string }`.
- **`Exit`** — `{ direction, toRoom, toVnum, keyword, description, exitFlags, key, distance, pull, pullType }`.
- **`ShopData`** — `{ keeperVnum, buyTypes, profitBuy, profitSell, openHour, closeHour }`.
- **`RepairShopData`** — `{ keeperVnum, fixTypes, profitFix, shopType, openHour, closeHour }`.
- **`MobilePrototype`** — Full prototype with all fields (vnum, name, descriptions, level, stats, actFlags as bigint, etc.).
- **`ObjectPrototype`** — Full prototype with all fields (vnum, name, itemType, values, affects, etc.).

### 10. `src/network/WebSocketServer.ts` — Network Layer

Replace the stub:

- Creates a single HTTP server (`http.createServer()`).
- Attaches a `ws` WebSocketServer on configurable path (default `/ws`) for MUD clients.
- Attaches a Socket.IO server on configurable path (default `/play`) for the browser client, with CORS enabled.
- `NetworkConfig` interface: `port`, `wsPath`, `socketioPath`, `maxConnections`, `idleTimeoutSec`.
- On new WebSocket connection: delegate to `connectionManager.acceptWebSocket()`.
- On new Socket.IO connection: delegate to `connectionManager.acceptSocketIO()`.
- Provides `start()` (returns `Promise<void>`), `stop()`, `getConnectionManager()`.

### 11. `src/network/ConnectionManager.ts` — Descriptor and Connection State Machine

Replace the stub. Implements the `Descriptor` class and `ConnectionManager`:

#### ConnectionState enum

Replicate ALL legacy nanny states:
```
GetName, GetOldPassword, ConfirmNewName, GetNewPassword, ConfirmPassword,
GetNewSex, GetNewRace, GetNewClass, GetPKill, ReadMotd, ReadImotd,
PressEnter, Playing, Editing, CopyoverRecover
```

#### ProtocolCapabilities interface

```typescript
{
  msdp: boolean; mssp: boolean; mccp: boolean; mxp: boolean;
  color256: boolean; utf8: boolean; gmcp: boolean;
  screenWidth: number;   // default 80
  screenHeight: number;  // default 24
}
```

#### ITransport interface

Abstract transport over WebSocket and Socket.IO:
```typescript
interface ITransport {
  send(data: string): void;
  close(): void;
  onData(callback: (data: string) => void): void;
  onClose(callback: () => void): void;
  readonly isOpen: boolean;
}
```

#### WebSocketTransport / SocketIOTransport classes

Implement `ITransport` wrapping `ws` WebSocket and Socket.IO socket respectively.

#### Descriptor class

The TypeScript equivalent of legacy `descriptor_data`:

- **Properties:** `id`, `host`, `port`, `connectedAt`, `state` (ConnectionState), `character` (Player | null), `original` (Player | null — for switch/return), `idle` counter, `capabilities` (ProtocolCapabilities), `olcData`.
- **Input queue:** `string[]` — lines waiting to be processed. Transport `onData` splits incoming data by `\r?\n` and queues non-empty lines.
- **Output buffer:** `string` — text waiting to be flushed.
- **Pager buffer** and position for long output.
- **Methods:** `nextInput()`, `write(text)`, `writePaged(text)`, `flush()`, `close()`, `isConnected` (getter).

#### ConnectionManager class

- Maintains a `Map<string, Descriptor>` of active descriptors.
- `acceptWebSocket(ws, host, port)`: creates Descriptor with WebSocketTransport, sends greeting banner and `"By what name do you wish to be known?"` prompt, returns Descriptor or null if server full.
- `acceptSocketIO(socket, host, port)`: same but with SocketIOTransport.
- `processInput()`: iterates all descriptors, increments idle counter, dequeues one input line per descriptor per pulse, resets idle on input, handles idle timeout disconnect. For `Playing` state, delegates to `character.interpretCommand()`. For other states, delegates to `handleNannyState()` (**leave as stub**).
- `flushOutput()`: calls `flush()` on all descriptors.
- `getAllDescriptors()`, `getPlayingDescriptors()` accessors.
- **Greeting banner:** ASCII art welcome message with ANSI colour.

### 12. `src/main.ts` — Application Entry Point

Replace the stub with the full boot sequence:

1. Load environment config from `.env` via `dotenv`.
2. Initialise Logger.
3. Connect to PostgreSQL via Prisma.
4. Create EventBus, TickEngine, GameLoop instances.
5. Create NetworkServer (WebSocket + Socket.IO).
6. Start the network server on configured port.
7. Start the GameLoop.
8. Log boot complete message with connection info.
9. Register graceful shutdown handlers (SIGINT, SIGTERM).

---

## Tests for Sub-Phase 3B

- **`tests/unit/core/EventBus.test.ts`** — Test event emission with typed payloads, multiple listeners, listener removal, `emitEvent()` type safety.
- **`tests/unit/core/TickEngine.test.ts`** — Test all pulse counters decrement correctly, events fire at the right pulse count, counter randomisation on reset falls within expected ranges.
- **`tests/unit/utils/Dice.test.ts`** — Test `rollDice()` bounds, `numberRange()` distribution, `parseDiceString()` parsing of `"2d6+3"`, `"1d20"`, `"3d8"`.
- **`tests/unit/utils/AnsiColors.test.ts`** — Test `colorize()` with all code types, `colorStrlen()` accuracy, `stripColor()`, `wordWrap()` with embedded color codes, `padRight()`/`padCenter()` with colored strings.
- **`tests/unit/utils/BitVector.test.ts`** — Test all flag operations with `bigint`, `flagsToArray()` round-trip, `parseFlagString()`.
- **`tests/unit/utils/StringUtils.test.ts`** — Test `isName()`, `isNamePrefix()`, `oneArgument()` with quotes, `strPrefix()`, `numberArgument()` with `"2.sword"`.
- **`tests/unit/utils/Logger.test.ts`** — Test log level filtering, domain tag formatting, output format, `wrapCommandExecution()` error handling.
- **`tests/unit/network/Descriptor.test.ts`** — Test input queue, output buffer, pager buffer, `nextInput()` dequeuing, `flush()` behaviour.
- **`tests/unit/entities/types.test.ts`** — Verify enum values match legacy constants, AFF bigint flag values are correct, interface shapes compile correctly.

---

## Acceptance Criteria

- [ ] `EventBus` emits typed events and payloads. Multiple listeners receive the same event synchronously.
- [ ] `TickEngine` fires `tick:violence` every 12 pulses, `tick:mobile` every 16 pulses, `tick:full` every ~280 pulses (randomised 210–350).
- [ ] `GameLoop` runs at 4 pulses/second (250ms interval). `start()` begins the loop, `stop()` halts it. Lag warning emits if a pulse takes >100ms.
- [ ] `Logger` outputs `[YYYY-MM-DD HH:mm:ss] [LEVEL] [DOMAIN] message` format. Respects `LOG_LEVEL` filtering.
- [ ] `colorize("&RHello &Gworld&D", true)` produces correct ANSI escape sequences; `colorize("&RHello", false)` returns `"Hello"`.
- [ ] `colorStrlen("&RHello&D")` returns `5`.
- [ ] `rollDice(2, 6)` always returns a value between 2 and 12.
- [ ] `parseDiceString("3d8+5")` returns `{count: 3, sides: 8, plus: 5}`.
- [ ] `strPrefix("no", "north")` returns `true`; `strPrefix("nox", "north")` returns `false`.
- [ ] `oneArgument("'magic missile' goblin")` returns `["magic missile", "goblin"]`.
- [ ] All entity enums have values matching the C legacy exactly (e.g., `Position.Dead === 0`, `Direction.North === 0`, `ItemType.Weapon === 5`).
- [ ] `AFF.SANCTUARY === 1n << 7n` and other bigint flag constants are correct.
- [ ] `WebSocketServer` starts on the configured port and accepts both ws and Socket.IO connections.
- [ ] `Descriptor` queues input lines, buffers output, and flushes to transport. Pager activates for long output.
- [ ] `ConnectionManager` accepts connections, sends greeting banner, and processes input at one line per descriptor per pulse.
- [ ] `main.ts` boots the server: Prisma connects, EventBus/TickEngine/GameLoop initialise, network layer starts, game loop begins.
- [ ] Graceful shutdown via SIGINT/SIGTERM stops the game loop and closes all connections.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
