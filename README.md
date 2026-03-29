# SMAUG 2.0 — TypeScript Edition

A faithful, ground-up port of the **SMAUG 2.0 MUD engine** from ~200,000 lines
of ANSI C to modern **Node.js / TypeScript**. Every gameplay mechanic, timing
characteristic, and world-building capability of the original is preserved while
introducing modern infrastructure: WebSocket transport, PostgreSQL persistence,
a browser-based play client, and a React admin dashboard.

> *"The same game feel, with none of the segfaults."*

---

### Key Features

| Category | Highlights |
|---|---|
| **Core Engine** | 4-pulse/sec game loop, pulse-based tick engine, typed `EventBus` |
| **Entities** | `Character` → `Player` / `Mobile`, `Room`, `Area`, `GameObject`, `Affect` |
| **Combat** | Multi-round violence, damage types, saving throws, dual wield, combat skills |
| **Magic** | 150+ spells, component system, saving throws, target resolution |
| **Skills** | Class/race gating, proficiency learning, weapon skills, languages |
| **World** | JSON area files (rooms, mobiles, objects, resets, shops, MUDprogs) |
| **Communication** | 15+ channels, language translation, tell history, ignore system |
| **Economy** | Tri-currency (gold/silver/copper), shops, repair shops, banks, auctions |
| **Social** | Clans, councils, guilds, deities, boards, housing, marriage |
| **MUDprogs** | Full scripting engine with 40+ triggers, if-checks, variable substitution |
| **OLC** | In-game room/mobile/object/area/shop/MUDprog editors |
| **Admin** | Trust-gated immortal commands, ban system, watch system, audit logging |
| **Dashboard** | REST API + browser-based admin panel (player list, stats, config) |
| **Browser Play** | Socket.IO client with ANSI rendering — play from any modern browser |
| **Migration** | Import legacy `.are` files and `.plr` player saves directly |

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20+ (LTS) | Single-threaded event loop mirrors legacy `select()` model |
| Language | TypeScript 5+ (strict) | Type safety across 200k+ LOC port |
| Transport | `ws` + Socket.IO | Raw WebSocket for MUD clients; Socket.IO for browser |
| Database | PostgreSQL + Prisma ORM | Relational model suits entity relationships; type-safe queries |
| World Data | JSON flat files | Human-readable, git-diffable, hot-reloadable |
| Admin UI | Express REST API | Lightweight admin endpoints |
| Browser Client | HTML/JS + Socket.IO | Full play experience in-browser with ANSI rendering |
| Testing | Vitest | Fast, native ESM support, compatible with the project tooling |

---

## Prerequisites

### Hardware

- **CPU:** Any modern x86-64 or ARM64 processor
- **RAM:** 512 MB minimum, 2 GB recommended for a populated world
- **Disc:** 200 MB for the application; additional space for PostgreSQL data

### Software

| Requirement | Version | Install |
|---|---|---|
| **Node.js** | ≥ 20.0.0 | <https://nodejs.org/> or via `nvm install 20` |
| **npm** | ≥ 10 | Ships with Node.js |
| **PostgreSQL** | ≥ 14 | `sudo apt install postgresql` (Debian/Ubuntu) or <https://www.postgresql.org/download/> |
| **Git** | ≥ 2.30 | `sudo apt install git` |

Optional:

| Tool | Purpose | Install |
|---|---|---|
| **Docker** | Containerised deployment | <https://docs.docker.com/get-docker/> |
| **PM2** | Process manager for production | `npm i -g pm2` |
| **Nginx** | Reverse proxy / TLS termination | `sudo apt install nginx` |

---

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/smaug-ts.git
   cd smaug-ts
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create and configure your environment file**

   ```bash
   cp .env .env.local
   ```

   Edit `.env.local` and set at minimum:

   ```env
   DATABASE_URL=postgresql://smaug:smaug@localhost:5432/smaug
   JWT_SECRET=replace-with-a-strong-random-string
   ```

4. **Create the PostgreSQL database**

   ```bash
   sudo -u postgres createuser --createdb smaug
   sudo -u postgres psql -c "ALTER USER smaug PASSWORD 'smaug';"
   createdb -U smaug smaug
   ```

5. **Push the Prisma schema to the database**

   ```bash
   npx prisma db push
   npx prisma generate
   ```

6. **Build the TypeScript source**

   ```bash
   npm run build
   ```

7. **Run the test suite to verify everything is working**

   ```bash
   npm test
   ```

8. **Start the server in development mode (with auto-reload)**

   ```bash
   npm run dev
   ```

9. **Connect and play**

   - **Browser:** Open `http://localhost:4000` in any modern browser.
   - **MUD client (Mudlet, TinTin++, etc.):** Connect via WebSocket to
     `ws://localhost:4000/ws`.

---

## NPM Scripts Reference

| Script | Command | Description |
|---|---|---|
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/main.js` | Run the compiled production server |
| `dev` | `tsx watch src/main.ts` | Development server with hot-reload |
| `lint` | `eslint src/ tests/ --ext .ts,.tsx` | Run ESLint checks |
| `lint:fix` | `eslint src/ tests/ --ext .ts,.tsx --fix` | Auto-fix ESLint issues |
| `format` | `prettier --write "src/**/*.ts" "tests/**/*.ts"` | Format code with Prettier |
| `format:check` | `prettier --check "src/**/*.ts" "tests/**/*.ts"` | Check formatting |
| `test` | `vitest run` | Run the full Vitest test suite once |
| `test:watch` | `vitest` | Vitest in interactive watch mode |
| `db:generate` | `prisma generate` | Regenerate the Prisma client |
| `db:push` | `prisma db push` | Push schema changes to the database |
| `db:migrate` | `prisma migrate dev` | Create and run a new migration |
| `db:studio` | `prisma studio` | Open Prisma Studio (database browser) |
| `migrate:areas` | `tsx src/migration/index.ts areas` | Import legacy `.are` area files |
| `migrate:players` | `tsx src/migration/index.ts players` | Import legacy `.plr` player files |

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://smaug:smaug@localhost:5432/smaug` | PostgreSQL connection string |
| `JWT_SECRET` | `change-me-in-production` | Secret key for JWT token signing |
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `4000` | HTTP / WebSocket listen port |
| `WS_PATH` | `/ws` | Path for raw WebSocket connections |
| `SOCKETIO_PATH` | `/play` | Path for Socket.IO (browser client) |
| `MAX_CONNECTIONS` | `256` | Maximum simultaneous connections |
| `IDLE_TIMEOUT_SEC` | `600` | Seconds before idle disconnect |
| `LOG_LEVEL` | `info` | Minimum log level (`debug`, `info`, `warn`, `error`, `fatal`) |
| `PULSE_INTERVAL_MS` | `250` | Milliseconds per game loop pulse |
| `DB_LOG` | `false` | Enable verbose Prisma query logging |

---

## Legacy Migration

If you are migrating from an existing SMAUG 2.0 C-based MUD, the built-in
migration utilities can convert your world data and player saves.

### Migrating Area Files (`.are` → JSON)

1. Place all legacy `.are` files in a directory, e.g. `./legacy/areas/`.

2. Run the area migration tool:

   ```bash
   npm run migrate:areas -- --input ./legacy/areas --output ./world
   ```

   This parses each `.are` file — including `#AREA`, `#MOBILES` (S/C/V
   complexity), `#OBJECTS`, `#ROOMS`, `#RESETS`, `#SHOPS`, `#REPAIRSHOPS`,
   `#SPECIALS`, `#CLIMATE`, `#MUDPROGS`, `#OPROGS`, `#RPROGS` sections — and
   writes one JSON directory per area under `./world/`. Each directory contains:

   | File | Content |
   |---|---|
   | `area.json` | Area metadata (name, author, flags, vnum ranges, weather) |
   | `rooms.json` | Room definitions with exits and extra descriptions |
   | `mobiles.json` | Mobile prototypes (stats, combat, descriptions) |
   | `objects.json` | Object prototypes (values, affects, extra descriptions) |
   | `resets.json` | Reset commands (M/O/P/G/E/D/R) |
   | `shops.json` | Shop and repair-shop definitions |
   | `programs.json` | MUDprog scripts (mob, object, and room programmes) |

3. The parser handles:
   - Spell slot → skill-number conversion via `slot_lookup()`
   - Tilde-terminated strings
   - All three mobile complexity levels (Simple, Complex, full V-format)
   - Extended object affects and extra descriptions
   - Exit flags, door keys, and distance values

### Migrating Player Files (`.plr` → PostgreSQL)

1. Place legacy player save files in `./legacy/players/`.

2. Run the player migration tool:

   ```bash
   npm run migrate:players -- --input ./legacy/players
   ```

   This reads the key-value text format used by legacy SMAUG `save.c`, maps
   fields to the Prisma `PlayerCharacter` model, rehashes passwords from
   unsalted SHA-256 to bcrypt, and inserts records into PostgreSQL. Preserved
   data includes:

   - Core attributes (level, race, class, stats, vitals)
   - Economy (gold, silver, copper, bank balances)
   - Clan / council / deity affiliations
   - Skill proficiencies (`learned[]`)
   - Active affects (with preserved durations)
   - Equipment and inventory
   - Quest progress, conditions, pager preferences
   - Editor vnum ranges, bestowments, flags

3. **Post-migration verification:**

   ```bash
   npx prisma studio
   ```

   Open Prisma Studio and inspect the `PlayerCharacter`, `PlayerSkill`,
   `PlayerAffect`, and `PlayerEquipment` tables. Spot-check a handful of
   characters against their original `.plr` files to verify fidelity.

### Verification Checklist

- [ ] Area count matches the number of `.are` files processed
- [ ] Room, mobile, and object counts match legacy `vnums`
- [ ] Shop and repair-shop keepers resolve to valid mobile vnums
- [ ] Reset commands reference existing room, mobile, and object vnums
- [ ] Player characters load successfully and can log in
- [ ] Affects and equipment persist across login/logout cycles

---

## Production Deployment

### PM2 Process Manager

```bash
npm run build
pm2 start dist/main.js --name smaug-ts --max-memory-restart 512M
pm2 save
pm2 startup  # follow the printed command to enable boot persistence
```

Monitor with:

```bash
pm2 monit
pm2 logs smaug-ts
```

### systemd Service

Create `/etc/systemd/system/smaug-ts.service`:

```ini
[Unit]
Description=SMAUG 2.0 TypeScript MUD Server
After=network.target postgresql.service

[Service]
Type=simple
User=smaug
WorkingDirectory=/opt/smaug-ts
EnvironmentFile=/opt/smaug-ts/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable smaug-ts
sudo systemctl start smaug-ts
sudo journalctl -u smaug-ts -f   # tail logs
```

### Nginx Reverse Proxy

```nginx
upstream smaug_backend {
    server 127.0.0.1:4000;
}

server {
    listen 80;
    server_name mud.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mud.example.com;

    ssl_certificate     /etc/letsencrypt/live/mud.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mud.example.com/privkey.pem;

    # WebSocket proxy for MUD clients
    location /ws {
        proxy_pass http://smaug_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # Socket.IO proxy for browser client
    location /play {
        proxy_pass http://smaug_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # Admin API and static assets
    location / {
        proxy_pass http://smaug_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### TLS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mud.example.com
```

Certbot automatically installs the certificate and configures auto-renewal.

### Backups

**Database:**

```bash
# Daily PostgreSQL dump
pg_dump -U smaug -Fc smaug > /backups/smaug-$(date +%Y%m%d).dump

# Restore
pg_restore -U smaug -d smaug /backups/smaug-20260329.dump
```

**World data:**

```bash
tar czf /backups/world-$(date +%Y%m%d).tar.gz ./world/
```

Automate both with a cron job:

```cron
0 3 * * * /opt/smaug-ts/scripts/backup.sh >> /var/log/smaug-backup.log 2>&1
```

---

## Security Hardening

- **Change `JWT_SECRET`** to a cryptographically random string (≥ 64 characters).
- **Use bcrypt** for all password hashing (the migration tool rehashes legacy
  SHA-256 passwords automatically).
- **Enable TOTP 2FA** for immortal accounts via the `totpSecret` field on
  `PlayerCharacter`.
- **Restrict database access:** Ensure PostgreSQL listens only on `127.0.0.1`
  and uses strong credentials.
- **Run as a non-root user** with minimal filesystem permissions.
- **Firewall:** Expose only ports 80/443 (via Nginx) externally. Keep port 4000
  bound to localhost.
- **Rate-limit** the admin API in Nginx:

  ```nginx
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  location /api/ {
      limit_req zone=api burst=20 nodelay;
      proxy_pass http://smaug_backend;
  }
  ```

- **Audit logging:** All administrative actions are recorded in the `AuditLog`
  table with actor, action, target, and timestamp.

---

## Updating the Server

```bash
cd /opt/smaug-ts
git pull origin main

# Install any new dependencies
npm ci

# Apply database schema changes
npx prisma migrate deploy

# Rebuild
npm run build

# Run the test suite
npm test

# Restart
pm2 restart smaug-ts
# or: sudo systemctl restart smaug-ts
```

---

## Project Structure Overview

```
smaug-ts/
├── src/
│   ├── core/                  # GameLoop, TickEngine, EventBus
│   ├── network/               # WebSocketServer, ConnectionManager, SocketIOAdapter, TelnetProtocol
│   ├── game/
│   │   ├── commands/          # CommandRegistry + command modules (movement, combat, communication, etc.)
│   │   ├── combat/            # CombatEngine, DamageCalculator, DeathHandler
│   │   ├── world/             # AreaManager, RoomManager, ResetEngine, VnumRegistry, WeatherSystem, QuestSystem
│   │   ├── entities/          # Character, Player, Mobile, Room, Area, GameObject, Affect, types, tables
│   │   ├── spells/            # SpellEngine, SpellRegistry, SavingThrows, ComponentSystem
│   │   ├── affects/           # AffectManager, AffectRegistry, StatModifier
│   │   ├── economy/           # ShopSystem, BankSystem, AuctionSystem, Currency
│   │   └── social/            # ClanSystem, DeitySystem, BoardSystem, HousingSystem
│   ├── scripting/             # MudProgEngine, IfcheckRegistry, ScriptParser, VariableSubstitution
│   ├── persistence/           # PlayerRepository, WorldRepository
│   ├── admin/                 # AdminRouter, AuthController, MonitoringController, BanSystem, TrustLevels, DashboardUI
│   ├── migration/             # AreFileParser, PlayerFileParser, MigrationRunner
│   ├── utils/                 # AnsiColors, Dice, BitVector, StringUtils, Logger
│   └── main.ts               # Bootstrap entry point
├── prisma/
│   └── schema.prisma          # Database schema (PlayerCharacter, Clan, Council, Deity, Board, etc.)
├── public/                    # Browser play client (HTML + JS)
│   ├── index.html
│   └── js/client.ts
├── world/                     # JSON world data files
│   ├── _example/              # Example area (area.json, rooms.json, mobiles.json, etc.)
│   ├── helps.json             # Help file entries
│   └── socials.json           # Social command definitions
├── tests/
│   ├── unit/                  # Unit tests (core, utils, entities, commands, systems, etc.)
│   ├── integration/           # Integration tests (AdminAPI, CombatRound, WorldLoader, etc.)
│   └── e2e/                   # End-to-end tests (PlayerLogin, CombatScenario, ShopTransaction)
├── docs/                      # Extended documentation
│   ├── DEVELOPER_GUIDE.md
│   ├── ADMIN_GUIDE.md
│   └── PLAYER_GUIDE.md
├── legacy/                    # Original C source (read-only reference)
├── docker-compose.yml         # Production Docker Compose
├── docker-compose.dev.yml     # Development Docker Compose override
├── Dockerfile                 # Multi-stage Docker build
├── .dockerignore
├── .eslintrc.cjs              # ESLint configuration
├── .prettierrc                # Prettier configuration
├── .prettierignore
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── .env                       # Environment variables (not committed)
```

For an in-depth walkthrough of the architecture and every subsystem, see
[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md).

---

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Follow the coding standards documented in
   [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md#coding-standards).
3. Write tests for all new functionality.
4. Ensure `npm run lint`, `npm run format:check`, `npx tsc --noEmit`, and
   `npm test` all pass.
5. Open a pull request with a clear description of your changes.

See the full [Developer Guide](docs/DEVELOPER_GUIDE.md) for tutorials on adding
commands, spells, skills, entity types, and more.

---

## Licence

This project is derived from the SMAUG 2.0 MUD codebase. The original SMAUG
licence (a derivative of the Diku/Merc licence) applies to all gameplay logic
and world data. The TypeScript port code, tooling, and documentation are
released under the same terms. See the `LICENSE` file for the full text.

Portions of this codebase (Prisma schema, admin API, browser client, Docker
configuration) are original work and are additionally available under the MIT
licence where they do not incorporate SMAUG-derived logic.
