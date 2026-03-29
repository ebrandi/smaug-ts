# PHASE 5 — Developer Experience & Documentation

> **Prompt for AI Agent — Phase 5 of the SMAUG 2.0 → Node.js/TypeScript Port**

---

## Context

### Who You Are
You are an expert Node.js/TypeScript engineer and technical writer. You are working on a port of the SMAUG 2.0 MUD engine (~200,000 lines of ANSI C) to a modern Node.js/TypeScript application.

### Reference Documents (attached)
| Document | Purpose |
|---|---|
| `ARCHITECTURE.md` | Complete architecture specification for the TypeScript port |
| `DATAMODEL.md` | Legacy C data structures, enums, constants |
| `COMMANDS.md` | Every legacy command with handler, trust level, position, flags |
| `ANALYSIS.md` | Deep analysis of legacy game systems and mechanics |
| `STRUCTURE.md` | Legacy C file inventory and subsystem groupings |

### What Has Been Completed (Phases 1–4)

**Phase 1 — Project Scaffolding:**
- `package.json`, `tsconfig.json`, `.env`, project directory structure with stub files
- Core infrastructure: `EventBus`, `TickEngine`, `GameLoop`
- Network layer: `WebSocketServer`, `ConnectionManager`, `Descriptor`
- Utility modules: `AnsiColors`, `Dice`, `BitVector`, `Logger`
- Prisma schema for PostgreSQL, entity type definitions (`types.ts`)
- Basic tests (EventBus, TickEngine, Dice, AnsiColors, BitVector)
- `main.ts` application entry point

**Phase 2 — Entity & Command Scaffolding:**
- Full entity class implementations: `Character`, `Player`, `Mobile`, `Room`, `Area`, `GameObject`, `Affect`
- `CommandRegistry` with full dispatch pipeline (trust, position, lag, substate, flags)
- Admin modules: `TrustLevels`, `BanSystem`, `AdminRouter` (JWT-authenticated)
- Example world JSON files, migration stubs

**Phase 3 — Full Game System Implementation (6 sub-phases):**
- **3A:** String/ANSI utilities, world loader (`AreaManager`, `VnumRegistry`, `ResetEngine`), command parser with abbreviation matching
- **3B:** Movement system (sector costs, doors, mounts, followers, pathfinding), `do_look`/`do_examine`, full combat engine (`violence_update`, `multi_hit`, `one_hit`, damage, death, corpse, XP)
- **3C:** Spell system (`do_cast` pipeline, 50+ spell functions), skill system (proficiency, learning, `do_practice`), affect system (`AffectManager`, duration ticking, equipment affects)
- **3D:** Inventory/object interaction (get, drop, wear, remove, eat, drink, containers, sacrifice), economy (currency, shops, repair shops, banks), quest system, levelling/XP
- **3E:** Communication (all channels, language system, tell/reply, ignore, colour codes, pager, prompt), social commands, persistence (PlayerRepository save/load, auto-save, hotboot), MUDprog scripting engine
- **3F:** Admin commands (authorize, ban, freeze, trust, transfer, snoop, log, set, stat, mfind, ofind, rfind), OLC system (redit, medit, oedit, aedit), Admin Dashboard (React + Vite SPA with REST API, JWT auth, status/players/areas/bans/logs/config endpoints, real-time WebSocket updates), Browser Play UI (React terminal with ANSI rendering, Socket.IO, command history, scrollback)

**Phase 4 — Feature Parity Verification:**
- `PARITY.md` checklist auditing every command and game system against `COMMANDS.md`
- `// TODO PARITY:` comments and `it.todo()` test stubs for any PARTIAL or MISSING items

---

## Cardinal Rules

1. **TypeScript strict mode** — `"strict": true` in `tsconfig.json`. No `any` types except where interfacing with legacy data structures that genuinely require it.
2. **ES module syntax** — `import`/`export` throughout. No `require()`.
3. **British English** — All user-facing prose, comments, and documentation must use British English spelling (e.g. "colour", "behaviour", "initialise").
4. **No placeholder content** — Every section, tutorial, FAQ, and code example must contain real, substantive content. No "TODO" or "coming soon" placeholders.
5. **Accuracy** — All documentation must accurately reflect the actual codebase produced in Phases 1–4. Reference real file paths, class names, method signatures, and configuration keys.
6. **Consistency** — Use the same terminology throughout all documents. If the codebase calls it `VnumRegistry`, the docs call it `VnumRegistry`.
7. **Markdown best practices** — Proper heading hierarchy (h1 for document title only, h2 for major sections, h3+ for subsections), fenced code blocks with language tags, tables where appropriate.
8. **Cross-referencing** — Documents should link to each other where relevant (e.g. the Admin Guide links to the Developer Guide for extending OLC, the Player Guide links to the README for connection instructions).
9. **Do not modify game logic** — This phase produces documentation and configuration files only. No changes to `src/` game logic files.
10. **All existing tests must pass** — `npx tsc --noEmit` and `npx vitest run` must still succeed after this phase.

---

## Project Folder Structure (for reference)

```
smaug-ts/
├── src/
│   ├── core/                  # GameLoop, TickEngine, EventBus
│   ├── network/               # WebSocketServer, ConnectionManager, Pager, TelnetProtocol
│   ├── game/
│   │   ├── commands/          # CommandRegistry + all command handlers
│   │   ├── combat/            # CombatEngine, DamageCalculator, DeathHandler
│   │   ├── entities/          # Character, Player, Mobile, Room, Area, GameObject, Affect, types.ts
│   │   ├── world/             # AreaManager, VnumRegistry, ResetEngine
│   │   ├── spells/            # SpellEngine, spell functions
│   │   ├── skills/            # SkillSystem, skill definitions
│   │   ├── affects/           # AffectManager
│   │   ├── economy/           # Currency, ShopSystem, BankSystem
│   │   ├── communication/     # ChannelManager, LanguageSystem, SocialManager
│   │   ├── quest/             # QuestSystem
│   │   └── olc/               # OLC editors (redit, medit, oedit, aedit)
│   ├── scripting/             # MudProgEngine
│   ├── persistence/           # PlayerRepository, WorldRepository
│   ├── migration/             # AreFileParser, PlayerFileParser, MigrationRunner
│   ├── admin/                 # TrustLevels, BanSystem, AdminRouter
│   ├── utils/                 # AnsiColors, Dice, BitVector, Logger
│   └── main.ts
├── src/dashboard/             # Admin Dashboard (React + Vite SPA)
│   └── src/
│       ├── App.tsx
│       ├── components/        # StatusPanel, PlayerList, AreaList, BanManager, LogViewer, CommandConsole, ConfigEditor
│       └── ...
├── src/client/                # Browser Play UI (React + Vite SPA)
│   └── src/
│       ├── Terminal.tsx        # ANSI terminal renderer
│       ├── AnsiParser.ts      # ANSI escape code → styled spans
│       └── ...
├── world/                     # JSON world data files
│   └── midgaard/              # Example area
├── tests/
├── prisma/
│   └── schema.prisma
├── docs/                      # ← THIS PHASE CREATES THIS DIRECTORY
│   ├── DEVELOPER_GUIDE.md
│   ├── ADMIN_GUIDE.md
│   └── PLAYER_GUIDE.md
├── docker-compose.yml         # ← THIS PHASE CREATES THIS
├── Dockerfile                 # ← THIS PHASE CREATES THIS
├── .eslintrc.cjs              # ← THIS PHASE CREATES THIS
├── .prettierrc                # ← THIS PHASE CREATES THIS
├── .prettierignore            # ← THIS PHASE CREATES THIS
├── README.md                  # ← THIS PHASE CREATES THIS
└── package.json               # ← THIS PHASE UPDATES (adds lint/format scripts)
```

---

## Deliverables

### Deliverable 1 — `README.md`

Create `README.md` in the project root. It must contain the following sections:

#### 1.1 Project Overview
- One-paragraph description of the project (SMAUG 2.0 MUD engine ported to Node.js/TypeScript)
- Key features bullet list (WebSocket transport, PostgreSQL persistence, browser play client, admin dashboard, legacy `.are` file import)
- Technology stack table (Node.js, TypeScript, PostgreSQL, Prisma, React, Vite, Socket.IO, ws, Express, JWT, bcrypt)

#### 1.2 Prerequisites
**Hardware:**
- Minimum: 1 CPU core, 1 GB RAM, 5 GB disk
- Recommended: 2+ CPU cores, 2+ GB RAM, 20+ GB disk (for large world datasets)

**Software:**
- Node.js LTS (v20+) — include instructions for installing via `nvm`
- PostgreSQL 16+ — include instructions for installing on Ubuntu/Debian and macOS (Homebrew)
- npm (bundled with Node.js)
- Git

#### 1.3 Quick Start
Step-by-step numbered instructions:
1. Clone the repository
2. Install dependencies (`npm install`)
3. Copy `.env.example` to `.env` and configure
4. Start PostgreSQL
5. Run Prisma migrations (`npx prisma migrate deploy`)
6. Seed world data (`npm run seed`)
7. Start the server (`npm run dev`)
8. Connect via browser at `http://localhost:4000/play`
9. Connect via MUD client to `ws://localhost:4000/ws`

#### 1.4 NPM Scripts Reference
Document every script in `package.json`:

| Script | Description |
|---|---|
| `npm run dev` | Start game server + admin dashboard + browser client with hot reload (ts-node-dev or tsx) |
| `npm run build` | Compile TypeScript to JavaScript (`dist/`) and build dashboard + client (Vite) |
| `npm start` | Run production build from `dist/` |
| `npm run seed` | Load world JSON data into the database (if applicable) and verify world file integrity |
| `npm run migrate` | Run Prisma database migrations (`npx prisma migrate deploy`) |
| `npm run migrate:create` | Create a new Prisma migration (`npx prisma migrate dev`) |
| `npm run studio` | Open Prisma Studio for database inspection |
| `npm run lint` | Run ESLint on `src/` and `tests/` |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Run Prettier on all TypeScript files |
| `npm run format:check` | Check Prettier formatting without modifying files |
| `npm test` | Run all tests (`vitest run`) |
| `npm run test:watch` | Run tests in watch mode (`vitest`) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run import:areas` | Import legacy `.are` files → JSON (see Legacy Migration section) |
| `npm run import:players` | Import legacy player save files → PostgreSQL (see Legacy Migration section) |
| `npm run dashboard:dev` | Start admin dashboard in development mode (standalone) |
| `npm run client:dev` | Start browser play client in development mode (standalone) |

#### 1.5 Environment Variables Reference
Document every variable from `.env.example` in a table:

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment (`development`, `production`, `test`) |
| `DATABASE_URL` | `postgresql://smaug:smaug@localhost:5432/smaug` | PostgreSQL connection string |
| `WS_PORT` | `4000` | WebSocket and HTTP server port |
| `JWT_SECRET` | (none — must set) | Secret key for admin dashboard JWT tokens |
| `BCRYPT_ROUNDS` | `12` | bcrypt salt rounds for password hashing |
| `LOG_LEVEL` | `info` | Minimum log level (`debug`, `info`, `warn`, `error`) |
| `WORLD_DIR` | `./world` | Path to world JSON data directory |
| `MAX_PLAYERS` | `300` | Maximum concurrent player connections |
| `PULSE_PER_SECOND` | `4` | Game loop pulses per second |
| `GAME_NAME` | `SMAUG 2.0` | Server name shown in MSSP and login banner |
| `ADMIN_ENABLED` | `true` | Enable/disable admin dashboard |
| `TOTP_ENABLED` | `false` | Enable optional TOTP 2FA for player accounts |

#### 1.6 Legacy Migration
This section is **critical** and must be comprehensive. It covers converting data from the original SMAUG 2.0 C engine to the new TypeScript system.

**1.6.1 Overview**
- Explain what the migration utility does: converts legacy `.are` area files to JSON world data format, and legacy player save files (`.plr`) to PostgreSQL records.
- Explain why this is needed: existing SMAUG MUDs have hundreds of area files and thousands of player saves; a migration utility is essential for any port to be useful.

**1.6.2 Migrating Area Files (`.are` → JSON)**
Step-by-step instructions:
1. Locate your legacy area directory (typically `area/` in the SMAUG installation)
2. Run `npm run import:areas -- --input /path/to/legacy/area --output ./world`
3. Explain what happens: the `AreFileParser` reads each `.are` file, parses all sections (`#AREA`, `#MOBILES`, `#OBJECTS`, `#ROOMS`, `#RESETS`, `#SHOPS`, `#REPAIRSHOPS`, `#MUDPROGS`, `#OPROGS`, `#RPROGS`), and writes structured JSON files to a subdirectory per area
4. Explain the output structure:
   ```
   world/
   └── midgaard/
       ├── area.json      # Area metadata (name, author, vnum ranges, reset frequency)
       ├── rooms.json      # All rooms with exits, extra descriptions
       ├── mobiles.json    # Mobile prototypes (all S/C/V complexity levels)
       ├── objects.json    # Object prototypes with values, affects, extra descs
       ├── resets.json     # M/O/G/E/D/R reset commands
       ├── shops.json      # Shop data (keeper vnum, buy types, profit margins, hours)
       └── programs.json   # MUD programs (mob, obj, room progs)
   ```
5. Explain how to verify: run `npm run seed` to load the converted data and check for errors
6. Document known limitations and edge cases:
   - Spell slot-to-skill-number mapping (legacy uses numeric slot IDs that must be mapped to skill names)
   - Mobile complexity levels: Simple (`S`), Complex (`C`), and Very Complex (`V`) have different field counts
   - `~` string terminators and `#SECTION` headers in the legacy format
   - Object value semantics vary by item type (weapon values differ from armour values differ from potion values)
7. Troubleshooting: common errors and how to fix them (malformed `.are` files, encoding issues, missing sections)

**1.6.3 Migrating Player Files (`.plr` → PostgreSQL)**
Step-by-step instructions:
1. Locate your legacy player directory (typically `player/` in the SMAUG installation)
2. Run `npm run import:players -- --input /path/to/legacy/player`
3. Explain what happens: the `PlayerFileParser` reads each player file, parses the key-value format, and writes records to PostgreSQL via Prisma
4. **Password handling**: Legacy passwords are stored as unsalted SHA256 hex. Since SHA256 cannot be reversed, all migrated players get a placeholder bcrypt hash and a `MIGRATION_REQUIRED` flag. Players must reset their password on first login to the new system.
5. Explain what fields are migrated: name, level, sex, race, class, trust, stats (str/int/wis/dex/con/cha/lck), hp/mana/move, gold/silver/copper, exp, skills with proficiency, affects
6. Document the `MigrationRunner` class and its two methods: `migrateAreas()` and `migratePlayers()`
7. Explain the migration report output (migrated count, error list)
8. Troubleshooting: common errors (file encoding, missing fields, duplicate names)

**1.6.4 Post-Migration Verification**
- How to verify area data loaded correctly (check room/mob/object counts, test area resets)
- How to verify player data migrated correctly (log in as a migrated character, check stats/inventory/skills)
- How to handle migration errors (re-run with `--force`, manual fixes)

#### 1.7 Production Deployment
- Building for production: `npm run build`
- Running with PM2 or systemd (provide example service file)
- Nginx reverse proxy configuration (WebSocket upgrade headers, static file serving for dashboard and client)
- TLS/SSL setup with Let's Encrypt (certbot)
- Database backups (pg_dump cron job example)
- Log rotation
- Monitoring recommendations (Prometheus metrics endpoint, Grafana)

#### 1.8 Security Hardening
- Keep Node.js and PostgreSQL updated (provide update commands)
- Use strong `JWT_SECRET` (at least 64 random characters)
- Enable TOTP 2FA for admin accounts
- Firewall rules (only expose ports 80/443, keep 5432 internal)
- Rate limiting on WebSocket connections
- Regular dependency audits (`npm audit`)
- Database connection pooling and SSL

#### 1.9 Updating the Server
- How to pull latest changes and rebuild
- How to run database migrations after updates
- How to update Node.js via nvm
- How to update PostgreSQL (major version upgrades)
- How to update npm dependencies safely

#### 1.10 Project Structure Overview
- Brief description of each top-level directory and its purpose
- Link to `docs/DEVELOPER_GUIDE.md` for detailed architecture

#### 1.11 Contributing
- Link to `docs/DEVELOPER_GUIDE.md`
- Code style summary (ESLint + Prettier)
- Branch naming, PR process

#### 1.12 Licence
- Placeholder for licence (note: SMAUG has specific licence terms)

---

### Deliverable 2 — `docker-compose.yml` + `Dockerfile`

#### 2.1 `Dockerfile`
Create a multi-stage Dockerfile:
- **Stage 1 (build):** Node.js LTS Alpine, install dependencies, compile TypeScript, build dashboard and client with Vite
- **Stage 2 (production):** Node.js LTS Alpine, copy only `dist/`, `node_modules` (production), `prisma/`, `world/`, expose port 4000, run Prisma migrations on startup, then start the server

#### 2.2 `docker-compose.yml`
Create `docker-compose.yml` with two services:

**Service: `db`**
- Image: `postgres:16-alpine`
- Environment: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (matching `.env.example` defaults)
- Volume: `pgdata:/var/lib/postgresql/data` for persistence
- Health check: `pg_isready`
- Port: `5432:5432` (optional, for local development)

**Service: `game`**
- Build from `Dockerfile`
- Depends on `db` (with health check condition)
- Environment: `DATABASE_URL` pointing to the `db` service, `JWT_SECRET`, `NODE_ENV=production`
- Ports: `4000:4000`
- Volumes: `./world:/app/world` (mount world data for easy editing)
- Restart policy: `unless-stopped`

**Volume: `pgdata`**

Include comments explaining each section. Add a `docker-compose.dev.yml` override for development (mounts `src/` for hot reload, exposes Prisma Studio port).

#### 2.3 `.dockerignore`
Create `.dockerignore` excluding `node_modules`, `.git`, `dist/`, `.env`, test files.

---

### Deliverable 3 — ESLint + Prettier Configuration

#### 3.1 `.eslintrc.cjs`
Create ESLint configuration:
- Parser: `@typescript-eslint/parser`
- Plugins: `@typescript-eslint`, `import`, `prettier`
- Extends: `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:@typescript-eslint/recommended-requiring-type-checking`, `plugin:import/typescript`, `plugin:prettier/recommended`
- Parser options: `project: './tsconfig.json'`, `ecmaVersion: 2022`, `sourceType: 'module'`
- Rules (at minimum):
  - `@typescript-eslint/no-unused-vars`: `['error', { argsIgnorePattern: '^_' }]`
  - `@typescript-eslint/explicit-function-return-type`: `'off'` (too noisy for game logic)
  - `@typescript-eslint/no-explicit-any`: `'warn'`
  - `import/order`: grouped and alphabetised (builtin, external, internal, parent, sibling)
  - `no-console`: `'off'` (game server legitimately uses console for logging)
  - `prettier/prettier`: `'error'`

#### 3.2 `.prettierrc`
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

#### 3.3 `.prettierignore`
```
dist/
node_modules/
*.json
prisma/migrations/
world/
```

#### 3.4 `package.json` Updates
Add the following to `scripts`:
```json
{
  "lint": "eslint src/ tests/ --ext .ts,.tsx",
  "lint:fix": "eslint src/ tests/ --ext .ts,.tsx --fix",
  "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
  "format:check": "prettier --check \"src/**/*.ts\" \"tests/**/*.ts\""
}
```
Add the following to `devDependencies` (use latest stable versions):
- `eslint`
- `@typescript-eslint/parser`
- `@typescript-eslint/eslint-plugin`
- `eslint-plugin-import`
- `eslint-plugin-prettier`
- `eslint-config-prettier`
- `prettier`

---

### Deliverable 4 — `docs/DEVELOPER_GUIDE.md`

This document targets **developers** who want to understand the system architecture and contribute new features.

#### 4.1 Introduction
- Purpose of this guide
- Who it's for (TypeScript developers wanting to extend the MUD engine)
- Prerequisites (familiarity with TypeScript, Node.js, basic MUD concepts)

#### 4.2 Architecture Overview
- High-level architecture diagram description (single Node.js process, WebSocket + Socket.IO + REST, PostgreSQL + JSON files)
- The single-threaded model and why it matters (mirrors legacy `select()` loop, no concurrency bugs)
- The prototype-instance pattern (vnums, `pIndexData` → instances via area resets)
- The pulse/tick timing model (`PULSE_PER_SECOND=4`, `PULSE_VIOLENCE=12` (3s), `PULSE_MOBILE=16` (4s), `PULSE_TICK=280` (70s))

#### 4.3 Folder Structure Deep-Dive
For each directory under `src/`, explain:
- What it contains
- Key classes and their responsibilities
- How it interacts with other directories

#### 4.4 Core Systems Explained
For each core system, provide a detailed explanation:
- **Game Loop** (`GameLoop.ts`): pulse cycle, how `TickEngine` fires events
- **Event Bus** (`EventBus.ts`): pub/sub pattern, event types, how systems subscribe
- **Command Dispatch** (`CommandRegistry.ts`): hash lookup, abbreviation matching, trust/position/lag/substate/flag pipeline
- **Entity System**: class hierarchy (`Character` → `Player`/`Mobile`), `Room`, `Area`, `GameObject`, `Affect`
- **World Loading**: `AreaManager` → `VnumRegistry` → `ResetEngine` cycle
- **Persistence**: dual-layer (PostgreSQL for players, JSON for world), `PlayerRepository` save/load cycle
- **Network Layer**: `WebSocketServer`, `ConnectionManager`, `Descriptor`, connection state machine (GetName → Playing)

#### 4.5 Coding Standards
- TypeScript strict mode rules
- Naming conventions (PascalCase classes, camelCase methods/variables, UPPER_SNAKE constants)
- File naming (PascalCase for classes, camelCase for utilities)
- Import ordering (enforced by ESLint)
- Error handling patterns (never throw in game logic, use `Logger.wrapCommandExecution`)
- BigInt bitvectors (`bigint` for all flag sets, `hasFlag`/`setFlag`/`removeFlag` utilities)

#### 4.6 Tutorials

**Tutorial 1: Adding a New Command**
Step-by-step walkthrough of adding a new player command:
1. Create the handler function in the appropriate file under `src/game/commands/`
2. Register it in `CommandRegistry` with name, handler, trust level, minimum position, lag, flags
3. Add abbreviation support (explain `str_prefix` matching)
4. Write unit tests
5. Test in-game

**Tutorial 2: Adding a New Spell**
Step-by-step walkthrough:
1. Define the spell in the skill/spell definitions
2. Write the spell function (target validation, saving throw, effect application)
3. Register in the spell table
4. Add to a class's learnable spells
5. Write tests

**Tutorial 3: Adding a New Skill**
Similar to Tutorial 2 but for non-magical skills.

**Tutorial 4: Adding a New Entity Type**
How to add a new entity type (e.g. a new object type or a new mobile special procedure).

**Tutorial 5: Adding a New Communication Channel**
How to add a new chat channel with custom permissions and formatting.

**Tutorial 6: Writing a MUD Program**
How to write and attach a MUDprog script to a mob, object, or room:
1. Trigger types (greet, speech, act, random, fight, death, entry, etc.)
2. Variable substitution (`$n`, `$t`, `$i`, `$r`, etc.)
3. Ifchecks (level, class, race, ispc, isnpc, etc.)
4. Nesting rules
5. Common patterns (quest giver, shopkeeper banter, trap room)

#### 4.7 Admin Dashboard Development
- Architecture: React + Vite SPA served on `/admin`
- REST API endpoints reference (GET/POST/PUT/DELETE for status, players, areas, bans, logs, config, command execution, shutdown)
- JWT authentication flow (login → token → Bearer header)
- Real-time updates via WebSocket
- Component structure: `StatusPanel`, `PlayerList`, `AreaList`, `BanManager`, `LogViewer`, `CommandConsole`, `ConfigEditor`
- How to add a new dashboard page/component
- How to add a new REST API endpoint
- Development workflow: `npm run dashboard:dev` for standalone development with hot reload

#### 4.8 Browser Play Client Development
- Architecture: React + Vite SPA served on `/play`
- Socket.IO connection to the game server (path: `/play`)
- `Terminal.tsx` component: ANSI escape code rendering, scrollback buffer, command input with history (up/down arrow)
- `AnsiParser.ts`: converts ANSI escape sequences to styled `<span>` elements
- ANSI colour mapping (standard 8 colours + bright variants, `&X`/`^X`/`}X` SMAUG colour codes converted to ANSI by the server)
- How to customise the terminal appearance (CSS theming)
- How to add client-side features (e.g. minimap, health bars, clickable links)
- Development workflow: `npm run client:dev` for standalone development with hot reload

#### 4.9 Testing Guide
- Test structure (`tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/`)
- How to write unit tests (mock patterns for Character, Room, etc.)
- How to write integration tests (using real AreaManager + VnumRegistry)
- How to write e2e tests (simulating a full player session)
- Running tests: `npm test`, `npm run test:watch`, `npm run test:coverage`
- Test fixtures: `tests/fixtures/testArea/` (JSON area data), `tests/fixtures/legacyFiles/` (`.are` and `.plr` files for migration tests)

#### 4.10 Debugging Tips
- Using `LOG_LEVEL=debug` for verbose output
- Prisma Studio for database inspection (`npm run studio`)
- Common issues and solutions (port conflicts, database connection errors, world file parse errors)

#### 4.11 Legacy Migration Internals
- `AreFileParser` architecture: section-based parser, tilde-terminated strings, vnum reading, complexity levels (S/C/V)
- `PlayerFileParser` architecture: key-value line parser, password handling (SHA256 → bcrypt placeholder)
- `MigrationRunner`: orchestrates area and player migration
- How to extend the parser for custom `.are` sections
- How to handle edge cases in legacy data

#### 4.12 FAQ (minimum 15 questions)
Include at least these:
1. Why single-threaded? Won't it be slow?
2. Why PostgreSQL for players but JSON for world data?
3. How do vnums work?
4. How does the prototype-instance pattern work?
5. How do I hot-reload world data without restarting?
6. How do I add a new race or class?
7. How do I modify the combat formula?
8. How do I add a new OLC editor?
9. How do I debug a MUDprog that isn't firing?
10. How do I add a new telnet protocol option (MSDP, GMCP, etc.)?
11. How does the connection state machine work?
12. How do I add a new admin dashboard widget?
13. How do I add a new browser client feature?
14. How do I extend the legacy migration parser?
15. How do I run the test suite in CI?

---

### Deliverable 5 — `docs/ADMIN_GUIDE.md`

This document targets **Game Administrators / Game Masters** who deploy, configure, and manage the game server.

#### 5.1 Introduction
- Purpose of this guide
- Who it's for (server operators, head builders, game masters)
- Overview of admin tools: in-game immortal commands, web admin dashboard, CLI scripts

#### 5.2 Server Management

**5.2.1 Installation & First Run**
- Cross-reference to `README.md` Quick Start
- Detailed walkthrough for a fresh server setup on Ubuntu 22.04+

**5.2.2 Configuration**
- All environment variables explained (cross-reference to README)
- Game-specific tuning: pulse rates, max players, area reset frequency
- How to change the server name, MOTD, greeting

**5.2.3 Starting, Stopping, Restarting**
- `npm run dev` for development
- `npm start` for production
- PM2 commands: `pm2 start`, `pm2 stop`, `pm2 restart`, `pm2 logs`
- Graceful shutdown (saves all players, flushes data)
- Hotboot (restart without disconnecting players — if implemented)

**5.2.4 Monitoring**
- Admin dashboard overview (URL, login, what each panel shows)
- Log files and log levels
- Memory and performance monitoring via dashboard
- Health check endpoint

**5.2.5 Backups**
- Database: `pg_dump` commands and cron schedule
- World data: git-based versioning of `world/` directory
- Player data: database backups cover this

**5.2.6 Updating**
- Pulling latest code, rebuilding, running migrations
- Updating Node.js, PostgreSQL, npm dependencies

#### 5.3 Player Management

**5.3.1 Authentication & Authorisation**
- Trust level hierarchy (0=Mortal through 65=Supreme) — full table with level names and what each unlocks
- How to promote a player: `trust <player> <level>` in-game or via dashboard
- Authorization workflow for new characters (Created → WaitingApproval → Authorized)
- `authorize` command usage

**5.3.2 Discipline**
- `ban` / `unban` — site bans (newbie, mortal, all, level, warn), prefix/suffix matching, duration
- `freeze` / `unfreeze` — prevent a player from executing commands
- `silence` / `unsilence` — prevent a player from using communication channels
- `log` — enable logging for a specific player
- `snoop` — monitor a player's input/output
- `force` — force a player to execute a command
- `transfer` / `bamfin` / `bamfout` — teleport players

#### 5.4 Legacy Data Migration
This section provides the **administrator's perspective** on migrating from a legacy SMAUG 2.0 server.

**5.4.1 Pre-Migration Checklist**
- Back up your entire legacy SMAUG installation
- Note your area directory path and player directory path
- Document any custom modifications to your `.are` file format
- Ensure all area files are well-formed (no truncated files)

**5.4.2 Migrating Areas**
- Full walkthrough: `npm run import:areas -- --input /path/to/area --output ./world`
- Verifying the output: check room/mob/object counts per area
- Handling errors: common issues with malformed `.are` files
- Post-migration: run `npm run seed` and test area resets in-game

**5.4.3 Migrating Players**
- Full walkthrough: `npm run import:players -- --input /path/to/player`
- Password reset requirement: all migrated players must set a new password on first login
- Verifying migration: check player count, spot-check individual characters
- Handling errors: duplicate names, corrupted files

**5.4.4 Post-Migration Testing**
- Walk through key areas and verify rooms, mobs, objects, exits, shops
- Test area resets (wait for reset timer or force with `areset`)
- Test MUD programs (interact with scripted NPCs)
- Verify shop buy/sell prices
- Check player stats, skills, inventory after migration

#### 5.5 Content Creation with OLC

**5.5.1 Overview of OLC (Online Creation)**
- What OLC is and why it exists
- The vnum system: how rooms, mobs, and objects are identified
- Vnum ranges: how areas claim vnum ranges, how to assign ranges to builders

**5.5.2 Tutorial: Creating a New Area**
Step-by-step:
1. `aedit create <filename>` — create a new area
2. Set area properties: name, author, vnum ranges, reset frequency
3. `aedit save` — save the area

**5.5.3 Tutorial: Building Rooms**
Step-by-step:
1. `redit create <vnum>` — create a new room
2. Set room properties: name, description, sector type, room flags
3. Create exits: `redit exit <direction> <destination_vnum>`
4. Add extra descriptions: `redit ed add <keyword>`
5. Set door properties: `redit exit <direction> door <flags> <key_vnum>`
6. `redit save` — save changes

**5.5.4 Tutorial: Creating Mobiles (NPCs)**
Step-by-step:
1. `medit create <vnum>` — create a new mobile prototype
2. Set properties: name, short description, long description, full description
3. Set stats: level, alignment, race, class, act flags
4. Set combat: hitroll, damroll, hit dice, damage dice, armour class
5. Add special behaviours: shop, repair shop, MUD programs
6. `medit save` — save changes

**5.5.5 Tutorial: Creating Objects (Items)**
Step-by-step:
1. `oedit create <vnum>` — create a new object prototype
2. Set properties: name, short description, long description, item type
3. Set type-specific values (weapon: damage dice, weapon type; armour: AC values; potion: spell levels and spells; container: capacity, flags, key)
4. Add affects: `oedit affect add <apply_type> <modifier>`
5. Add extra descriptions
6. Set wear flags, extra flags
7. `oedit save` — save changes

**5.5.6 Tutorial: Setting Up Resets**
Explain each reset command type:
- `M` — place a mobile in a room (with max count)
- `O` — place an object in a room
- `P` — put an object inside another object
- `G` — give an object to the last mobile
- `E` — equip an object on the last mobile
- `D` — set a door state (open, closed, locked)
- `R` — randomise exits in a room

**5.5.7 Tutorial: Writing MUD Programs**
Step-by-step for common patterns:
1. Quest giver NPC (greet trigger → check quest state → give quest or reward)
2. Guard NPC (greet trigger → check alignment/race → block or allow passage)
3. Trap room (entry trigger → damage → message)
4. Shopkeeper banter (speech trigger → respond to keywords)
5. Timed event (random trigger → periodic action)

**5.5.8 Tutorial: Setting Up Shops**
1. Create a shopkeeper mobile
2. Assign shop data: buy types, profit margins, hours
3. Set up inventory via resets (G commands)
4. Test buy/sell interactions

**5.5.9 Tutorial: Setting Up Repair Shops**
Similar to shops but for item repair/recharge.

#### 5.6 Admin Dashboard Guide

**5.6.1 Accessing the Dashboard**
- URL: `http://your-server:4000/admin`
- Login: use an immortal character's credentials (trust level 60+ required)
- JWT token handling (automatic, stored in browser)

**5.6.2 Dashboard Panels**
For each panel, explain what it shows and what actions are available:
- **Status Panel**: uptime, current pulse, online player count, memory usage, area count
- **Player List**: online players with name, level, room, idle time, host; actions (kick, transfer, freeze)
- **Area List**: all loaded areas with name, author, age, reset frequency, player count
- **Ban Manager**: view/add/remove bans; ban types (newbie, mortal, all, level, warn); duration and pattern matching
- **Log Viewer**: recent log entries filtered by level and domain; real-time streaming
- **Command Console**: execute any immortal command from the browser and see output
- **Config Editor**: view and modify runtime configuration (game name, max players, pulse rates, etc.)

**5.6.3 Real-Time Updates**
- Dashboard receives live updates via WebSocket
- Player count, status, and logs update automatically
- No need to refresh the page

#### 5.7 Day-to-Day Administration

**5.7.1 Common Tasks Checklist**
- Checking server health (dashboard status panel or `GET /api/admin/status`)
- Reviewing logs for errors
- Managing player disputes (snoop, freeze, ban)
- Approving new characters (authorize)
- Deploying new content (edit world JSON, reload areas)
- Running backups

**5.7.2 Area Management**
- How areas are loaded at boot (from `world/` directory)
- How to add a new area (create directory + JSON files, or use OLC)
- How to modify an existing area (edit JSON files or use OLC)
- How to force an area reset (`areset <area>`)
- How to remove an area (delete directory, restart)

**5.7.3 Economy Tuning**
- Shop profit margins (profitBuy, profitSell)
- Racial price modifiers
- Currency ratios (gold:silver:copper = 100:10:1 in copper terms, i.e. 1 gold = 10000 copper, 1 silver = 100 copper)
- Bank interest (if applicable)

**5.7.4 Combat Tuning**
- Damage formulas and how to adjust
- Level scaling
- Saving throw mechanics

#### 5.8 FAQ (minimum 20 questions)
Include at least these:
1. How do I promote a player to immortal?
2. How do I ban a problem player?
3. How do I create a new area from scratch?
4. How do I import areas from another SMAUG server?
5. How do I back up the database?
6. How do I restore from a backup?
7. How do I change the server port?
8. How do I enable HTTPS/TLS?
9. How do I monitor server performance?
10. How do I handle a server crash?
11. How do I update the game server?
12. How do I add a new race or class?
13. How do I modify shop prices?
14. How do I set up a clan/guild?
15. How do I manage the board/note system?
16. How do I set up player housing?
17. How do I configure the quest system?
18. How do I write MUD programs for NPCs?
19. How do I use the admin dashboard?
20. How do I migrate from a legacy SMAUG 2.0 server?

---

### Deliverable 6 — `docs/PLAYER_GUIDE.md`

This document targets **players** who want to learn how to play the game.

#### 6.1 Welcome & Introduction
- What is a MUD? (brief explanation for newcomers)
- What makes this MUD special
- How to connect (browser: URL; MUD client: WebSocket address)

#### 6.2 Browser Play Client Guide
- Navigating to the play URL (`http://your-server:4000/play`)
- The terminal interface: output area, input box, scrollback
- Command input: type a command and press Enter
- Command history: use Up/Down arrow keys to recall previous commands
- ANSI colours: the game uses colours to highlight important information
- Tips for the best browser experience (font size, window size, keyboard shortcuts)

#### 6.3 Connecting with a MUD Client
- Recommended clients: Mudlet, TinTin++, Blightmud
- Connection details: WebSocket URL (`ws://server:4000/ws`)
- Basic client configuration tips

#### 6.4 Tutorial: Your First Session
Step-by-step walkthrough for a brand new player:
1. Connect to the server
2. Create a character (choose name, password, race, class, sex)
3. Read the MOTD and press Enter
4. You're in the game! Understanding the room description
5. Moving around: `north`, `south`, `east`, `west`, `up`, `down` (and abbreviations `n`, `s`, `e`, `w`, `u`, `d`)
6. Looking around: `look`, `look <object>`, `examine <object>`
7. Talking to others: `say <message>`, `tell <player> <message>`
8. Checking your character: `score`, `inventory`, `equipment`, `affects`
9. Getting help: `help <topic>`

#### 6.5 Character Creation
- Races: overview of available races and their stat bonuses/penalties
- Classes: overview of available classes and their playstyle
- Stats: what each stat does (Str, Int, Wis, Dex, Con, Cha, Lck)
- PK vs Non-PK: explain the deadly/non-deadly choice

#### 6.6 Movement & Exploration
- Directional movement commands
- `exits` — see available exits
- `scan` — see creatures in adjacent rooms
- Sector types and movement costs (city costs less than mountain)
- Doors: `open`, `close`, `lock`, `unlock`, `pick`
- Mounts: `mount`, `dismount` — reduced movement cost
- The overland map (if applicable)

#### 6.7 Combat
- Starting combat: `kill <target>`, `murder <target>` (for PK)
- Combat rounds: automatic attacks every 3 seconds
- Combat commands: `flee`, `rescue`, `kick`, `bash`, `backstab`, `circle`, `disarm`
- `consider <target>` — gauge difficulty before fighting
- `wimpy <hp>` — auto-flee when HP drops below threshold
- Death: what happens when you die (corpse, XP loss, recall to temple)
- Retrieving your corpse

#### 6.8 Magic & Spells
- Casting: `cast '<spell name>' [target]` (note the quotes around multi-word spells)
- Mana: spells cost mana, which regenerates over time
- Spell types: offensive, defensive, healing, utility, transportation
- Learning spells: `practice <spell>` at a trainer
- Components (if applicable)
- Common useful spells for beginners

#### 6.9 Skills
- Using skills: some are automatic (dodge, parry), some are commands (`backstab`, `kick`)
- Learning skills: `practice <skill>` at a trainer
- Proficiency: skills improve with use and practice
- `skills` / `spells` — view your known abilities and proficiency

#### 6.10 Inventory & Equipment
- `inventory` — see what you're carrying
- `equipment` — see what you're wearing/wielding
- `get <item>` / `get <item> <container>` — pick up items
- `drop <item>` — drop an item
- `wear <item>` / `wield <item>` / `hold <item>` — equip items
- `remove <item>` — unequip
- `put <item> <container>` — store items
- `sacrifice <item>` — destroy for gold
- `eat <food>` / `drink <source>` — consume food and drink
- Item types: weapons, armour, potions, scrolls, wands, staves, containers, food, drink, keys, lights

#### 6.11 Economy & Shopping
- Three currencies: gold, silver, copper (and their relative values)
- `buy <item>` / `sell <item>` / `list` — shop interactions
- `value <item>` — check what a shop will pay
- Banks: `deposit <amount>`, `withdraw <amount>`, `balance`
- `appraise <item>` — check repair cost at a repair shop

#### 6.12 Communication
- `say <message>` — speak to everyone in the room
- `tell <player> <message>` — private message
- `reply <message>` — reply to the last tell
- Channels: `chat`, `yell`, `shout`, `auction`, `music`, `ask`, `newbie`
- `ignore <player>` — block messages from a player
- Emotes: `emote <action>` — custom actions
- Social commands: `smile`, `wave`, `bow`, `laugh`, etc.
- Colour customisation: `colour` command to toggle colour preferences

#### 6.13 Groups & Parties
- `group <player>` — invite to group
- `follow <player>` — follow a leader
- `gtell <message>` — group chat
- `split <amount>` — split gold with group
- Group combat: how aggro and assists work

#### 6.14 Quests
- `quest request` — get a new quest from a questmaster
- `quest info` — view current quest details
- `quest complete` — turn in a completed quest
- `quest list` — view available quest rewards
- `quest buy <item>` — spend quest points
- Quest types: kill a mob, recover an object
- Rewards: gold, quest points, practices

#### 6.15 Clans & Guilds
- What clans and guilds are
- How to join (invitation from a leader)
- Clan channels and communication
- Clan halls and storerooms
- PK clans vs non-PK clans

#### 6.16 Housing
- `homebuy` — purchase a house
- `gohome` — teleport to your house
- Decorating with accessories
- Room limits and costs

#### 6.17 Information Commands
- `score` — full character sheet
- `who` — see who's online (with filters)
- `where` — find players in your area
- `time` — game time and date
- `weather` — current weather
- `help <topic>` — in-game help system
- `areas` — list all areas with level ranges
- `commands` — list all available commands
- `socials` — list all social commands

#### 6.18 Tips for New Players
- Start in the newbie area
- Practice your skills early
- Group with other players for harder content
- Save regularly (auto-save happens, but `save` is available)
- Use `consider` before attacking
- Keep food and drink in your inventory
- Read the help files

#### 6.19 FAQ (minimum 15 questions)
Include at least these:
1. How do I create a character?
2. How do I move around?
3. How do I fight monsters?
4. How do I heal?
5. How do I learn new spells/skills?
6. How do I make money?
7. How do I buy and sell items?
8. How do I talk to other players?
9. How do I join a group?
10. How do I join a clan?
11. What happens when I die?
12. How do I get my corpse back?
13. How do I save my character?
14. How do I change my password?
15. How do I report a bug or problem?

---

## Verification

Before considering this phase complete, verify:

1. **File existence** — All deliverable files exist at the specified paths.
2. **Markdown validity** — All `.md` files render correctly with proper heading hierarchy, tables, code blocks, and links.
3. **Cross-references** — All links between documents resolve correctly.
4. **Docker validation** — `docker compose config` validates without errors.
5. **ESLint validation** — `npx eslint src/ tests/ --ext .ts,.tsx` runs without configuration errors (lint warnings are acceptable for existing code).
6. **Prettier validation** — `npx prettier --check "src/**/*.ts" "tests/**/*.ts"` runs without configuration errors.
7. **No game logic changes** — `npx tsc --noEmit` and `npx vitest run` still pass.
8. **Content completeness** — No placeholder text, no "TODO" or "coming soon" sections.
9. **British English** — All user-facing text uses British English spelling.

---

## Acceptance Criteria

- [ ] `README.md` exists in the project root with all sections from Deliverable 1.
- [ ] `README.md` includes comprehensive Legacy Migration section covering `.are` file conversion, player file migration, and post-migration verification.
- [ ] `Dockerfile` exists and implements a multi-stage build.
- [ ] `docker-compose.yml` exists with `db` and `game` services, health checks, and volume mounts.
- [ ] `.dockerignore` exists.
- [ ] `.eslintrc.cjs` exists with TypeScript + Prettier integration.
- [ ] `.prettierrc` and `.prettierignore` exist.
- [ ] `package.json` has `lint`, `lint:fix`, `format`, `format:check`, `import:areas`, and `import:players` scripts.
- [ ] `docs/DEVELOPER_GUIDE.md` exists with all sections specified in Deliverable 4.
- [ ] `docs/DEVELOPER_GUIDE.md` includes Admin Dashboard development section (architecture, REST API, components, how to extend).
- [ ] `docs/DEVELOPER_GUIDE.md` includes Browser Play Client development section (architecture, Socket.IO, Terminal component, ANSI rendering, how to extend).
- [ ] `docs/DEVELOPER_GUIDE.md` includes Legacy Migration Internals section (AreFileParser, PlayerFileParser, MigrationRunner, how to extend).
- [ ] `docs/ADMIN_GUIDE.md` exists with all sections specified in Deliverable 5.
- [ ] `docs/ADMIN_GUIDE.md` includes Legacy Data Migration section with full walkthrough for areas and players.
- [ ] `docs/ADMIN_GUIDE.md` includes Admin Dashboard Guide section with panel-by-panel documentation.
- [ ] `docs/ADMIN_GUIDE.md` includes OLC tutorials for areas, rooms, mobiles, objects, resets, MUD programs, shops.
- [ ] `docs/PLAYER_GUIDE.md` exists with all sections specified in Deliverable 6.
- [ ] `docs/PLAYER_GUIDE.md` includes Browser Play Client Guide section.
- [ ] All `.md` files use proper heading hierarchy, tables, code blocks with language tags, and British English spelling.
- [ ] All tutorials are step-by-step with numbered instructions.
- [ ] All FAQs contain at least the minimum number of questions specified.
- [ ] All code examples in documentation are valid TypeScript that matches the project's coding standards.
- [ ] `npx tsc --noEmit` passes (no type errors introduced).
- [ ] `npx vitest run` passes (no test regressions).
- [ ] `docker compose config` validates without errors.
- [ ] `npx eslint src/ tests/ --ext .ts,.tsx` runs without configuration errors (lint warnings are acceptable).
- [ ] `npx prettier --check "src/**/*.ts" "tests/**/*.ts"` runs without configuration errors.

---

*End of PHASE_5_DEVEX_DOCUMENTATION.md*
