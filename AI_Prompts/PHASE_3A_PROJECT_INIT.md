# SMAUG 2.0 TypeScript Port — Phase 3A: Project Initialisation

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** This is the very first implementation phase. No prior code exists yet. You are creating the project from scratch: npm initialisation, TypeScript configuration, linting, environment setup, the complete directory tree with stub files, the Prisma schema, and the application entry point.
>
> **Your role:** You are an expert TypeScript/Node.js engineer with deep knowledge of MUD engine architecture. You have access to five reference documents that describe the legacy C codebase in exhaustive detail:
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `COMMANDS.md` — Full command table with trust levels, positions, and flags
> - `STRUCTURE.md` — File inventory and subsystem grouping

## Cardinal Rules (apply to ALL code you produce)

1. **Preserve legacy gameplay exactly.** Every formula, threshold, constant, and order-of-operations must match the C original. When the architecture doc says "replicates legacy X", implement it verbatim.
2. **Follow the TypeScript patterns established in ARCHITECTURE.md.** Use the exact class names, method signatures, enum values, and interface shapes defined there.
3. **Use ES module syntax** (`import`/`export`) throughout. Prefer `const` over `let`. Never use `var`.
4. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
5. **No external runtime dependencies** beyond what is specified in the dependency tables below.
6. **All code must compile cleanly** under the strict `tsconfig.json` defined in this phase, and all tests must pass with `vitest run`.
7. **Log with the structured Logger** (`src/utils/Logger.ts`) using domain tags. Never use bare `console.log`.
8. **Maintain the pulse-based timing model.** 4 pulses/second, `PULSE_VIOLENCE` = 12, `PULSE_MOBILE` = 16, `PULSE_AUCTION` = 36, `PULSE_AREA` = 240, `PULSE_TICK` = 280. All durations and cooldowns are expressed in pulses.
9. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
10. **Handle edge cases defensively.** Check for null rooms, dead characters, extracted objects before every operation.

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

*This is the first sub-phase. No prior sub-phases have been completed. You are starting from an empty directory.*

---

## Sub-Phase 3A Objective

Create the entire project skeleton from scratch: npm project, TypeScript configuration, linting, environment files, the full directory tree with stub files for every future module, the complete Prisma schema, and the `.gitignore`. After this phase, `npx tsc --noEmit` must pass cleanly and the directory structure must exactly match the folder structure reference above.

---

## Steps to Implement

### 1. Project Initialisation — `package.json`

Create the root directory `smaug-ts/` and initialise `package.json`:

```json
{
  "name": "smaug-ts",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "tsx watch src/main.ts",
    "lint": "eslint src/ --ext .ts,.tsx",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "migrate:areas": "tsx src/migration/index.ts areas",
    "migrate:players": "tsx src/migration/index.ts players"
  }
}
```

**Runtime Dependencies:**

| Package | Purpose |
|---|---|
| `ws` | WebSocket server for MUD clients (Mudlet, TinTin++) |
| `socket.io` | Socket.IO for browser client |
| `@prisma/client` | Prisma ORM client |
| `express` | REST API for admin dashboard |
| `jsonwebtoken` | JWT authentication |
| `bcrypt` | Password hashing |
| `dotenv` | Environment variables |
| `winston` | Structured logging (optional fallback — we implement our own Logger) |

**Dev Dependencies:**

| Package | Purpose |
|---|---|
| `typescript` | TypeScript compiler |
| `tsx` | TypeScript execution for dev |
| `@types/node` | Node.js type definitions |
| `@types/ws` | ws type definitions |
| `@types/express` | Express type definitions |
| `@types/jsonwebtoken` | JWT type definitions |
| `@types/bcrypt` | bcrypt type definitions |
| `prisma` | Prisma CLI |
| `vitest` | Test runner |
| `eslint` | Linter |
| `@typescript-eslint/parser` | TypeScript ESLint parser |
| `@typescript-eslint/eslint-plugin` | TypeScript ESLint rules |

Run `npm install` after creating the file.

---

### 2. TypeScript Configuration — `tsconfig.json`

Create `tsconfig.json` with strict settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests", "src/dashboard", "src/client"]
}
```

---

### 3. ESLint Configuration — `.eslintrc.cjs`

Create `.eslintrc.cjs`:

- Extend: `eslint:recommended`, `plugin:@typescript-eslint/recommended`
- Parser: `@typescript-eslint/parser`
- Rules:
  - `@typescript-eslint/no-explicit-any`: `warn`
  - `@typescript-eslint/no-unused-vars`: `error`
  - `no-console`: `warn` (we use the Logger, not raw console)

---

### 4. Vitest Configuration — `vitest.config.ts`

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/**/index.ts'],
    },
  },
});
```

---

### 5. Environment Configuration

Create `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/smaug_dev"
JWT_SECRET="change-me-in-production"
NODE_ENV="development"
PORT=4000
WS_PATH="/ws"
SOCKETIO_PATH="/play"
MAX_CONNECTIONS=256
IDLE_TIMEOUT_SEC=600
LOG_LEVEL="info"
PULSE_INTERVAL_MS=250
```

Create `.env.example` as a copy with blank/placeholder values for documentation.

Create `.gitignore`:

```
node_modules/
dist/
.env
*.js.map
*.d.ts
prisma/*.db
prisma/migrations/
coverage/
```

---

### 6. Directory Structure and Stub Files

Create the full directory tree. For every file that will be implemented in a future phase, create an **empty stub with a JSDoc comment** explaining the file's future purpose.

Example stub format:

```typescript
// src/game/combat/CombatEngine.ts
/**
 * Combat engine — processes violence ticks and multi-hit rounds.
 * Implementation deferred to a later phase.
 */
export class CombatEngine {}
```

Create ALL of the following files:

#### `src/core/`
| File | Status |
|---|---|
| `GameLoop.ts` | Stub (Phase 3B) |
| `TickEngine.ts` | Stub (Phase 3B) |
| `EventBus.ts` | Stub (Phase 3B) |
| `index.ts` | Barrel export |

#### `src/network/`
| File | Status |
|---|---|
| `WebSocketServer.ts` | Stub (Phase 3B) |
| `ConnectionManager.ts` | Stub (Phase 3B) |
| `SocketIOAdapter.ts` | Stub |
| `TelnetProtocol.ts` | Stub |
| `index.ts` | Barrel export |

#### `src/game/commands/`
| File | Status |
|---|---|
| `CommandRegistry.ts` | Stub (Phase 3B) |
| `movement.ts` | Stub |
| `combat.ts` | Stub |
| `communication.ts` | Stub |
| `information.ts` | Stub |
| `objects.ts` | Stub |
| `magic.ts` | Stub |
| `social.ts` | Stub |

#### `src/game/combat/`
| File | Status |
|---|---|
| `CombatEngine.ts` | Stub |
| `DamageCalculator.ts` | Stub |
| `DeathHandler.ts` | Stub |

#### `src/game/world/`
| File | Status |
|---|---|
| `AreaManager.ts` | Stub |
| `RoomManager.ts` | Stub |
| `ResetEngine.ts` | Stub |
| `VnumRegistry.ts` | Stub |

#### `src/game/entities/`
| File | Status |
|---|---|
| `types.ts` | Stub with enum/interface forward declarations |
| `Character.ts` | Stub |
| `Player.ts` | Stub |
| `Mobile.ts` | Stub |
| `GameObject.ts` | Stub |
| `Room.ts` | Stub |
| `Area.ts` | Stub |
| `Affect.ts` | Stub |

#### `src/game/economy/`
| File | Status |
|---|---|
| `Currency.ts` | Stub |
| `ShopSystem.ts` | Stub |
| `AuctionSystem.ts` | Stub |
| `BankSystem.ts` | Stub |

#### `src/game/spells/`
| File | Status |
|---|---|
| `SpellEngine.ts` | Stub |
| `SpellRegistry.ts` | Stub |
| `SavingThrows.ts` | Stub |
| `ComponentSystem.ts` | Stub |

#### `src/game/affects/`
| File | Status |
|---|---|
| `AffectManager.ts` | Stub |
| `AffectRegistry.ts` | Stub |
| `StatModifier.ts` | Stub |

#### `src/game/social/`
| File | Status |
|---|---|
| `ClanSystem.ts` | Stub |
| `CouncilSystem.ts` | Stub |
| `DeitySystem.ts` | Stub |
| `BoardSystem.ts` | Stub |
| `HousingSystem.ts` | Stub |

#### `src/persistence/`
| File | Status |
|---|---|
| `PlayerRepository.ts` | Stub |
| `WorldRepository.ts` | Stub |
| `index.ts` | Barrel export |

#### `src/admin/`
| File | Status |
|---|---|
| `AdminRouter.ts` | Stub |
| `AuthController.ts` | Stub |
| `TrustLevels.ts` | Stub |
| `BanSystem.ts` | Stub |
| `MonitoringController.ts` | Stub |

#### `src/scripting/`
| File | Status |
|---|---|
| `MudProgEngine.ts` | Stub |
| `IfcheckRegistry.ts` | Stub |
| `ScriptParser.ts` | Stub |
| `VariableSubstitution.ts` | Stub |

#### `src/utils/`
| File | Status |
|---|---|
| `AnsiColors.ts` | Stub |
| `Dice.ts` | Stub |
| `StringUtils.ts` | Stub |
| `BitVector.ts` | Stub |
| `Logger.ts` | Stub |

#### `src/migration/`
| File | Status |
|---|---|
| `AreFileParser.ts` | Stub |
| `PlayerFileParser.ts` | Stub |
| `MigrationRunner.ts` | Stub |
| `index.ts` | Stub |

#### `src/main.ts`
Stub entry point — minimal `console.log('SMAUG 2.0 TypeScript — Phase 3A scaffold complete.')`. Will be fully implemented in Phase 3B.

#### Other top-level directories
| Directory | Contents |
|---|---|
| `prisma/` | `schema.prisma` (Step 7) |
| `world/_example/` | Empty placeholder |
| `legacy/src/` | Read-only reference placeholder |
| `tests/unit/core/` | Empty directory |
| `tests/unit/utils/` | Empty directory |
| `tests/unit/entities/` | Empty directory |
| `tests/integration/` | Empty directory |
| `tests/fixtures/testArea/` | Empty directory |
| `public/` | Empty placeholder |

---

### 7. Prisma Schema — `prisma/schema.prisma`

Create the complete, production-ready Prisma schema. This covers ALL persistence needs for the entire project lifecycle.

#### Generator & Datasource

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Enums

```prisma
enum Sex {
  NEUTRAL
  MALE
  FEMALE
}

enum ClanType {
  PLAIN
  VAMPIRE
  WARRIOR
  DRUID
  MAGE
  CELTIC
  DEMON
  ANGEL
  ARCHER
  THIEF
  CLERIC
  PIRATE
  ASSASSIN
  UNDEAD
  CHAOTIC
  NEUTRAL_ALIGN
  LAWFUL
  NOKILL
  ORDER
  GUILD
}

enum BanType {
  NEWBIE
  MORTAL
  ALL
  LEVEL
  WARN
}

enum BoardVoteType {
  NONE
  OPEN
  CLOSED
  BALLOT
}

enum AuthState {
  CREATED
  NAME_CHOSEN
  PASSWORD_SET
  WAITING_APPROVAL
  AUTHORIZED
}
```

#### Models

Implement ALL of the following models with full field definitions:

**PlayerCharacter** — The central player model:

| Field Group | Fields |
|---|---|
| Identity | `id` (cuid, PK), `name` (unique), `displayName`, `passwordHash`, `email?`, `totpSecret?` |
| Core | `level`, `sex` (Sex enum), `race`, `class`, `trust` |
| Vitals | `hit`, `maxHit`, `mana`, `maxMana`, `move`, `maxMove` |
| Stats | `permStats` (Json), `modStats` (Json) |
| Combat | `hitroll`, `damroll`, `armor`, `alignment`, `wimpy`, `numAttacks` |
| Saving throws | `savingPoison`, `savingRod`, `savingPara`, `savingBreath`, `savingSpell` |
| Economy | `gold`, `silver`, `copper`, `exp`, `goldBalance`, `silverBalance`, `copperBalance` |
| Bitvectors | `actFlags` (String for bigint), `affectedBy` (String), `immune`, `resistant`, `susceptible` |
| Position | `position`, `style` |
| Language | `speaking`, `speaks` |
| Physical | `height`, `weight` |
| Identity text | `title`, `rank`, `bio`, `homepage`, `prompt`, `fightPrompt`, `bamfIn`, `bamfOut` |
| Affiliations | `clanName?`, `councilName?`, `deityName?` |
| Conditions | `conditions` (Json array — [hunger, thirst, blood, bleed]) |
| PK stats | `pkills`, `pdeaths`, `mkills`, `mdeaths`, `illegalPk` |
| Admin | `authState` (AuthState enum), `wizInvis`, `minSnoop`, `bestowments`, `flags` |
| Editor ranges | `rRangeLo`, `rRangeHi`, `mRangeLo`, `mRangeHi`, `oRangeLo`, `oRangeHi` |
| Quest | `questNumber`, `questCurrent`, `questAccum` |
| Pager | `pagerLen`, `pagerOn` |
| Misc | `stances` (Json), `colors` (Json), `ignored` (String), `spouse?` |
| Room | `lastRoom` |
| Timing | `played`, `lastLogin?`, `createdAt`, `updatedAt` |
| Hell | `releaseDate?`, `helledBy?` |
| Relations | `affects` → PlayerAffect[], `skills` → PlayerSkill[], `equipment` → PlayerEquipment[], `aliases` → PlayerAlias[], `inventory` → PlayerInventory[] |
| FK relations | `Clan?`, `Council?`, `Deity?` |
| Indexes | on `level`, `clanName`, `lastLogin` |

**PlayerAffect** — Active affects on a player:
- `id` (cuid), `playerName` (FK → PlayerCharacter.name, onDelete Cascade), `type` (Int — spell/skill number), `duration`, `location` (Int — ApplyType), `modifier`, `bitvector` (String for bigint). Index on `playerName`.

**PlayerSkill** — Learned skill proficiencies:
- `id` (cuid), `playerName` (FK), `skillNumber`, `proficiency` (0–100). Unique constraint on `[playerName, skillNumber]`.

**PlayerEquipment** — Equipped items:
- `id` (cuid), `playerName` (FK), `wearLocation`, `objectVnum`, `objectLevel`, `objectValues` (Json), `objectAffects` (Json), `extraFlags`, `timer`.

**PlayerInventory** — Carried items:
- `id` (cuid), `playerName` (FK), `objectVnum`, `objectLevel`, `objectValues` (Json), `objectAffects` (Json), `extraFlags`, `timer`, `containedIn?` (self-referencing FK for nested containers). Index on `containedIn`.

**PlayerAlias** — Command aliases:
- `id` (cuid), `playerName` (FK), `alias`, `expansion`. Unique on `[playerName, alias]`.

**Clan** — Clans, guilds, orders, nokill groups:
- `id` (cuid), `name` (unique), `filename` (unique), `abbrev`, `motto`, `description`, `leader`, `number1`, `number2`, `clanType` (ClanType), `members`, `memLimit`, `alignment`, `classRestr`, `board`, `recall`, `storeroom`, `guard1`, `guard2`, `clanObjects` (Json), `pkills` (Json array of 7), `pdeaths` (Json array of 7), `mkills`, `mdeaths`, `score`, `favour`, `strikes`. Relation: `playerMembers` → PlayerCharacter[].

**Council** — Councils:
- `id` (cuid), `name` (unique), `filename` (unique), `description`, `head`, `head2`, `powers`, `abbrev`, `members`, `board`, `meeting`, `storeroom`. Relation: `playerMembers` → PlayerCharacter[].

**Deity** — Deities:
- `id` (cuid), `name` (unique), `filename` (unique), `description`, `alignment`, `worshippers`, `recall`, `race`, `class`, `sex`, `actions` (Json). Relation: `followers` → PlayerCharacter[].

**Ban** — Site/character bans:
- `id` (cuid), `name`, `user`, `note`, `bannedBy`, `bannedAt`, `banType` (BanType), `level`, `unbanDate?`, `duration` (-1 = permanent), `prefix` (Boolean), `suffix` (Boolean). Indexes on `name`, `banType`.

**Board** — Message boards:
- `id` (cuid), `name` (unique), `filename` (unique), `minReadLevel`, `minPostLevel`, `minRemoveLevel`, `readGroup?`, `postGroup?`, `extraReaders`, `extraRemovers`. Relation: `notes` → BoardNote[].

**BoardNote** — Individual board posts:
- `id` (cuid), `boardId` (FK → Board.id, onDelete Cascade), `sender`, `subject`, `text`, `dateStamp`, `voting` (BoardVoteType), `yeaVotes`, `nayVotes`, `abstainVotes`. Indexes on `boardId`, `sender`.

**PlayerHouse** — Player housing:
- `id` (cuid), `owner` (unique), `apartment` (Boolean), `rooms` (Json array of vnums).

**SystemConfig** — Key-value system configuration:
- `key` (PK), `value`, `category`. Index on `category`.

**AuditLog** — Admin action audit trail:
- `id` (cuid), `actor`, `action`, `target?`, `details?`, `timestamp`. Indexes on `actor`, `timestamp`, `action`.

After creating the schema, run `npx prisma generate` to generate the client.

---

### 8. README.md

Create a `README.md` with:

- Project title and one-sentence description
- Technology stack summary
- Prerequisites (Node.js ≥20, PostgreSQL)
- Setup instructions (`npm install`, `npx prisma generate`, `cp .env.example .env`)
- Scripts reference (`npm run build`, `npm run dev`, `npm test`)
- Project structure overview
- Note that this is Phase 3A — the scaffold; game logic is implemented in later phases

---

## Tests for Sub-Phase 3A

- **`tests/unit/scaffold/projectStructure.test.ts`** — Verify that all expected directories and stub files exist. Walk the directory tree and assert each file from the folder structure reference is present.
- **`tests/unit/scaffold/tsconfig.test.ts`** — Verify `tsconfig.json` can be read and contains the expected `compilerOptions` (strict mode, target ES2022, module Node16).
- **`tests/unit/scaffold/packageJson.test.ts`** — Verify `package.json` has all expected dependencies and scripts.

---

## Acceptance Criteria

- [ ] `smaug-ts/` directory exists with the complete directory tree matching the folder structure reference.
- [ ] `package.json` contains all listed dependencies and scripts.
- [ ] `npm install` completes without errors.
- [ ] `tsconfig.json` is valid and uses strict mode with target ES2022.
- [ ] `.eslintrc.cjs` is configured with TypeScript parser and recommended rules.
- [ ] `vitest.config.ts` is configured to discover tests in `tests/**/*.test.ts`.
- [ ] `.env` and `.env.example` exist with all documented environment variables.
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `.env`, and build artifacts.
- [ ] Every stub file exists and exports an empty class or function with a JSDoc comment.
- [ ] `prisma/schema.prisma` contains all models, enums, and relations. `npx prisma generate` succeeds.
- [ ] `src/main.ts` exists and can be executed with `tsx src/main.ts`.
- [ ] `npx tsc --noEmit` produces zero errors.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `README.md` documents setup instructions and project structure.
