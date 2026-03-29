# SMAUG 2.0 TypeScript — Admin Guide

> Everything a MUD administrator needs to install, configure, manage, and
> maintain a SMAUG 2.0 TypeScript server. Covers first-time setup through
> day-to-day operations, with tutorials for the Online Creation system.

---

## Table of Contents

1. [Server Management](#server-management)
2. [Player Management](#player-management)
3. [Legacy Data Migration](#legacy-data-migration)
4. [OLC Tutorials](#olc-tutorials)
5. [Admin Dashboard Guide](#admin-dashboard-guide)
6. [Day-to-Day Administration](#day-to-day-administration)
7. [FAQ](#faq)

---

## Server Management

### Installation

Follow the [Quick Start](../README.md#quick-start) in the project README for
initial setup. In summary:

1. Install Node.js ≥ 20, PostgreSQL ≥ 14, and Git.
2. Clone the repository.
3. Run `npm install`.
4. Create the PostgreSQL database and user.
5. Copy `.env` → `.env.local` and configure `DATABASE_URL` and `JWT_SECRET`.
6. Run `npx prisma db push && npx prisma generate`.
7. Run `npm run build`.
8. Run `npm test` to verify.

### Configuration

All configuration is done through environment variables in the `.env` file.
See the [Environment Variables Reference](../README.md#environment-variables-reference)
in the README for the full list.

Key variables for administrators:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | The port the game server listens on |
| `MAX_CONNECTIONS` | `256` | Maximum simultaneous player connections |
| `IDLE_TIMEOUT_SEC` | `600` | Idle timeout before automatic disconnect (10 min) |
| `JWT_SECRET` | (must change) | Secret for admin API authentication |
| `LOG_LEVEL` | `info` | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `PULSE_INTERVAL_MS` | `250` | Game loop pulse interval (do not change unless you know what you are doing) |

### Starting the Server

**Development mode** (auto-reload on source changes):

```bash
npm run dev
```

**Production mode:**

```bash
npm run build
npm start
```

**With PM2 (recommended for production):**

```bash
npm run build
pm2 start dist/main.js --name smaug-ts --max-memory-restart 512M
pm2 save
```

**With Docker:**

```bash
docker compose up -d
```

### Stopping the Server

The server handles `SIGINT` and `SIGTERM` gracefully:

1. Game loop stops (no further pulses).
2. All connected players receive a shutdown message.
3. Connections close.
4. Database disconnects.
5. Process exits.

```bash
# If running directly
Ctrl+C

# If running with PM2
pm2 stop smaug-ts

# If running with Docker
docker compose down

# If running with systemd
sudo systemctl stop smaug-ts
```

### Monitoring

**Game logs** are written to stdout/stderr (captured by PM2, systemd, or
Docker). Set `LOG_LEVEL=debug` for maximum detail.

**PM2 monitoring:**

```bash
pm2 monit                  # Real-time CPU/memory dashboard
pm2 logs smaug-ts          # Tail log output
pm2 info smaug-ts          # Process details
```

**Admin API health check:**

```bash
curl http://localhost:4000/api/health
# Returns: { "status": "ok", "uptime": 12345.678 }
```

**Server statistics (requires admin JWT):**

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/admin/stats
```

### Backups

**Database backup (PostgreSQL):**

```bash
pg_dump -U smaug -Fc smaug > /backups/smaug-$(date +%Y%m%d).dump
```

**Database restore:**

```bash
pg_restore -U smaug -d smaug /backups/smaug-20260329.dump
```

**World data backup:**

```bash
tar czf /backups/world-$(date +%Y%m%d).tar.gz ./world/
```

**Automated daily backup (cron):**

```cron
0 3 * * * cd /opt/smaug-ts && pg_dump -U smaug -Fc smaug > /backups/smaug-$(date +\%Y\%m\%d).dump && tar czf /backups/world-$(date +\%Y\%m\%d).tar.gz ./world/ >> /var/log/smaug-backup.log 2>&1
```

Keep at least 7 daily backups and 4 weekly backups. Rotate old backups
automatically with `logrotate` or a simple `find ... -delete` cleanup.

---

## Player Management

### Trust Levels

Trust determines what a character can do. The system is defined in
`src/admin/TrustLevels.ts`:

| Level | Name | Description |
|---|---|---|
| 0–49 | Mortal | Normal player |
| 50 | Avatar | Hero — maximum mortal level |
| 51 | Neophyte | Junior immortal — can view admin info |
| 52 | Acolyte | Can teleport and transfer |
| 53 | Creator | Can use OLC (world building) |
| 54 | Savant | Senior builder |
| 55 | Demi-God | Can manage bans and discipline players |
| 56 | God | Full world manipulation |
| 57 | Greater God | System-level access |
| 58 | Supreme | Full administrative control |
| 60 | Implementor | Owner — unrestricted access |

### Promoting a Player

In-game (as an Implementor):

```
trust <player> <level>
```

Example:

```
trust Gandalf 53
```

This sets Gandalf's effective trust to Creator level, allowing access to OLC
commands.

### Discipline

**Freeze a player** (prevents all commands):

```
freeze <player>
```

**Thaw a frozen player:**

```
thaw <player>
```

**Send a player to hell** (temporary restriction):

```
hell <player> <time> <hours|days>
```

Example: `hell Sauron 24 hours` — restricted for 24 hours. Players in hell are
moved to a special waiting room and released automatically when the timer
expires. Release early with:

```
unhell <player>
```

**Silence a player** (prevents channel use):

```
silence <player>
```

**Ban a site:**

```
ban all evil-isp.example.com
ban newbie 192.168.1.*
ban mortal spammer.example.com 7 days
```

**Remove a ban:**

```
allow all evil-isp.example.com
```

**View active bans:**

```
ban list
```

### Player Information

```
mstat <player>          # Full character statistics
ostat <object>          # Object details
rstat                   # Current room details
users                   # Connected players with host info
last                    # Recent login history
```

### Snooping

Monitor a player's input (for investigating abuse):

```
snoop <player>
```

Stop snooping:

```
snoop
```

### Watch System

Set up persistent watches that log to files:

```
watch player <name>            # Watch a specific player
watch site <host-pattern>      # Watch connections from a site
watch command <command-name>   # Watch a specific command
watch show                     # Show your active watches
watch clear                    # Clear your watch file
```

---

## Legacy Data Migration

If you are migrating from an existing SMAUG 2.0 C-based MUD, follow these
steps carefully.

### Prerequisites

- A backup of your legacy area files (`.are`) and player files (`.plr`).
- The SMAUG 2.0 TS server installed and the database created.

### Step 1: Migrate Area Files

Place all `.are` files in a directory:

```bash
mkdir -p legacy/areas
cp /path/to/old-mud/area/*.are legacy/areas/
```

Run the migration:

```bash
npm run migrate:areas -- --input ./legacy/areas --output ./world
```

The parser handles all `.are` file sections:

- `#AREA` — name, author, flags, vnum ranges, economy
- `#MOBILES` — all three complexity levels (S = simple, C = basic, V = full)
- `#OBJECTS` — item types, values, affects, extra descriptions
- `#ROOMS` — exits, extra descriptions, sector types
- `#RESETS` — mob/object spawn commands (M, O, P, G, E, D, R)
- `#SHOPS` / `#REPAIRSHOPS` — shopkeeper definitions
- `#SPECIALS` — special procedure assignments
- `#CLIMATE` / `#NEIGHBOR` — weather data
- `#MUDPROGS` / `#OPROGS` / `#RPROGS` — scripting

### Step 2: Migrate Player Files

Place `.plr` files:

```bash
mkdir -p legacy/players
cp /path/to/old-mud/player/*/*.plr legacy/players/
```

Run the migration:

```bash
npm run migrate:players -- --input ./legacy/players
```

This reads the legacy key-value text format, maps fields to the Prisma schema,
rehashes passwords from unsalted SHA-256 to bcrypt, and inserts records.

### Step 3: Verify

1. Start the server: `npm run dev`
2. Connect and check area counts: `areas` (in-game)
3. Spot-check rooms: `goto <vnum>` and `look`
4. Spot-check mobiles: `goto <room>` and check NPC presence
5. Check player login with migrated accounts
6. Verify affects persist across login/logout
7. Open Prisma Studio (`npx prisma studio`) and inspect tables

### Troubleshooting

- **Missing spell slots:** The parser converts legacy spell slot numbers to
  skill numbers via `slot_lookup()`. If a spell is not registered, the affect
  is imported with `type = -1` and a warning is logged.
- **Corrupt area files:** If an `.are` file has malformed sections, the parser
  logs warnings and skips the problematic section. Check the migration log.
- **Password mismatch:** Legacy passwords are rehashed. Players will need to
  use their original password — the bcrypt hash is computed from the same
  plaintext the SHA-256 was derived from. If the original plaintext is
  unknown, an admin can reset the password via `mset <player> password`.

---

## OLC Tutorials

The Online Creation (OLC) system allows immortals with trust level 53+ to
create and edit game content in real time. Changes take effect immediately.

### Prerequisites

- Trust level 53 (Creator) or higher.
- Assigned vnum ranges via `trust` or the admin dashboard.

Vnum ranges restrict which vnums a builder can edit. Implementors (60) bypass
range checks. Assign ranges to a builder:

```
mset <player> rrangelo <low>
mset <player> rrangehi <high>
mset <player> mrangelo <low>
mset <player> mrangehi <high>
mset <player> orangelo <low>
mset <player> orangehi <high>
```

### Tutorial: Creating an Area

1. **Plan your area.** Decide on a theme, name, level range, and vnum range.
   Each area needs room, mobile, and object vnums that do not overlap with
   existing areas.

2. **Create the area directory** under `world/`:

   ```
   world/myarea/
   ├── area.json
   ├── rooms.json
   ├── mobiles.json
   ├── objects.json
   ├── resets.json
   ├── shops.json
   └── programs.json
   ```

   You can copy `world/_example/` as a starting template.

3. **Edit `area.json`:**

   ```json
   {
     "filename": "myarea",
     "name": "The Enchanted Forest",
     "author": "Gandalf",
     "flags": 0,
     "vnumRanges": {
       "rooms": { "low": 10000, "high": 10099 },
       "mobiles": { "low": 10000, "high": 10099 },
       "objects": { "low": 10000, "high": 10099 }
     },
     "resetFrequency": 15,
     "weather": {
       "cloudCover": 30,
       "temperature": 65,
       "windSpeed": 10,
       "precipitation": 20
     }
   }
   ```

4. **Restart** or use `loadarea myarea` in-game to load the new area.

### Tutorial: Creating Rooms

In `rooms.json`, each room is an object:

```json
[
  {
    "vnum": 10000,
    "name": "Forest Entrance",
    "description": "Tall oaks tower above you, their branches forming a natural archway. A mossy path leads deeper into the forest to the north.",
    "sectorType": 3,
    "roomFlags": 0,
    "exits": [
      {
        "direction": 0,
        "toVnum": 10001,
        "keyword": "",
        "description": "",
        "exitFlags": 0,
        "key": -1,
        "distance": 1
      }
    ],
    "extraDescriptions": [
      {
        "keywords": ["oaks", "trees"],
        "description": "Ancient oaks with gnarled trunks, their bark covered in luminescent moss."
      }
    ]
  }
]
```

Sector types: 0 = Inside, 1 = City, 2 = Field, 3 = Forest, 4 = Hills,
5 = Mountain, 6 = Water (swim), 7 = Water (no swim), 8 = Underwater,
9 = Air, 10 = Desert.

Direction values: 0 = North, 1 = East, 2 = South, 3 = West, 4 = Up,
5 = Down, 6 = Northeast, 7 = Northwest, 8 = Southeast, 9 = Southwest.

**In-game alternative** — use `redit`:

```
redit create 10000
redit name Forest Entrance
redit desc
(enter description, end with @)
redit sect forest
redit exit north 10001
redit done
```

### Tutorial: Creating Mobiles

In `mobiles.json`:

```json
[
  {
    "vnum": 10000,
    "name": "forest guardian",
    "shortDescription": "a tall forest guardian",
    "longDescription": "A tall elf in green armour stands guard here.",
    "description": "This guardian of the forest watches you with keen, silver eyes.",
    "keywords": "guardian elf forest",
    "level": 15,
    "sex": 1,
    "race": 1,
    "class": 3,
    "alignment": 750,
    "actFlags": "0",
    "affectedBy": "0",
    "hitDice": { "numDice": 3, "sizeDice": 8, "bonus": 120 },
    "damDice": { "numDice": 3, "sizeDice": 6, "bonus": 5 },
    "armor": 50,
    "hitroll": 8,
    "damroll": 5,
    "gold": 50,
    "position": 12,
    "defaultPosition": 12,
    "permStats": { "str": 16, "int": 14, "wis": 14, "dex": 18, "con": 15, "cha": 15, "lck": 13 }
  }
]
```

**In-game alternative** — use `medit`:

```
medit create 10000
medit name forest guardian
medit short a tall forest guardian
medit long A tall elf in green armour stands guard here.
medit level 15
medit sex male
medit race elf
medit alignment 750
medit done
```

### Tutorial: Creating Objects

In `objects.json`:

```json
[
  {
    "vnum": 10000,
    "name": "a gleaming elven sword",
    "shortDescription": "a gleaming elven sword",
    "description": "A finely crafted elven sword lies here, glowing faintly.",
    "keywords": "sword elven gleaming",
    "itemType": 5,
    "level": 15,
    "weight": 8,
    "cost": 5000,
    "values": [0, 4, 8, 0, 1, 0],
    "wearFlags": "8193",
    "extraFlags": "0",
    "affects": [
      { "location": 18, "modifier": 3 },
      { "location": 19, "modifier": 2 }
    ],
    "extraDescriptions": [
      {
        "keywords": ["runes", "inscription"],
        "description": "Delicate elvish runes are etched along the blade."
      }
    ]
  }
]
```

Item types: 1 = Light, 2 = Scroll, 3 = Wand, 4 = Staff, 5 = Weapon,
9 = Armour, 10 = Potion, 12 = Furniture, 15 = Container, 17 = DrinkCon,
18 = Key, 19 = Food, 20 = Money, 26 = Fountain, 47 = Portal.

For weapons, `values` are: `[condition, numDice, sizeDice, 0, weaponType, 0]`.
For armour, `values[0]` is the AC value.

Apply types: 1 = Str, 2 = Dex, 3 = Int, 4 = Wis, 5 = Con, 17 = AC,
18 = Hitroll, 19 = Damroll.

**In-game alternative** — use `oedit`:

```
oedit create 10000
oedit name a gleaming elven sword
oedit short a gleaming elven sword
oedit type weapon
oedit level 15
oedit weight 8
oedit value 0 0
oedit value 1 4
oedit value 2 8
oedit affect hitroll 3
oedit affect damroll 2
oedit done
```

### Tutorial: Setting Up Resets

Resets control how areas repopulate after a reset cycle.

In `resets.json`:

```json
[
  { "command": "M", "arg1": 10000, "arg2": 10000, "arg3": 1 },
  { "command": "E", "arg1": 10000, "arg2": 16 },
  { "command": "O", "arg1": 10001, "arg2": 10001 }
]
```

Reset commands:

| Command | Arguments | Description |
|---|---|---|
| `M` | `mobVnum, roomVnum, maxCount` | Spawn mobile in room |
| `O` | `objVnum, roomVnum` | Place object in room |
| `P` | `objVnum, roomVnum, containerVnum` | Place object in container |
| `G` | `objVnum` | Give object to last spawned mob |
| `E` | `objVnum, wearLocation` | Equip last mob with object |
| `D` | `roomVnum, direction, lockState` | Set door state |
| `R` | `roomVnum, maxDirection` | Randomise exits |

### Tutorial: Creating MUDprogs

In `programs.json`:

```json
[
  {
    "vnum": 10000,
    "entityType": "mobile",
    "type": "GREET_PROG",
    "argList": "80",
    "comList": [
      "if ispc($n)",
      "  if level($n) < 10",
      "    say Greetings, young adventurer. Take care in these woods.",
      "  else",
      "    say Welcome back, $n. The forest remembers you.",
      "  endif",
      "endif"
    ]
  },
  {
    "vnum": 10000,
    "entityType": "mobile",
    "type": "DEATH_PROG",
    "argList": "100",
    "comList": [
      "mpmset $i act noscavenger",
      "say The forest... will remember... this..."
    ]
  }
]
```

Common trigger types:

| Trigger | Fires When | argList |
|---|---|---|
| `GREET_PROG` | A character enters the room | Percentage chance |
| `SPEECH_PROG` | A character says something | Keywords to match |
| `DEATH_PROG` | The mob dies | Percentage chance |
| `FIGHT_PROG` | Each combat round | Percentage chance |
| `BRIBE_PROG` | A character gives gold | Minimum gold amount |
| `GIVE_PROG` | A character gives an object | Object keyword |
| `RAND_PROG` | Random chance each mobile tick | Percentage chance |
| `CMD_PROG` | A character uses a command | Command name |
| `ENTRY_PROG` | The mob enters a room | Percentage chance |
| `HOUR_PROG` | At a specific game hour | Hour number |

### Tutorial: Setting Up Shops

In `shops.json`:

```json
[
  {
    "keeper": 10001,
    "buyTypes": [5, 9],
    "profitBuy": 120,
    "profitSell": 80,
    "openHour": 6,
    "closeHour": 20
  }
]
```

- `keeper` — Vnum of the shopkeeper mobile.
- `buyTypes` — Array of item types the shop buys (5 = Weapon, 9 = Armour).
- `profitBuy` — Buy price multiplier (120 = 120% of base cost).
- `profitSell` — Sell price multiplier (80 = 80% of base cost).
- `openHour` / `closeHour` — Business hours (game time, 0–23).

Give the shopkeeper objects via `G` resets to stock the shop.

---

## Admin Dashboard Guide

Access the admin dashboard at `http://localhost:4000/api/admin` (or via the
browser with a logged-in admin session).

### Authentication

1. **Obtain a JWT** by POSTing to `/api/admin/login`:

   ```bash
   curl -X POST http://localhost:4000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"name": "YourAdmin", "password": "yourpassword"}'
   ```

2. Use the returned token in the `Authorization` header for all subsequent
   requests:

   ```
   Authorization: Bearer <token>
   ```

### Dashboard Panels

#### Server Status Panel

- **Uptime** — How long the server has been running.
- **Active connections** — Number of connected descriptors.
- **Game loop pulse** — Current pulse count.
- **Memory usage** — Node.js heap statistics.

#### Player List Panel

- Online players with name, level, class, race, idle time, and host.
- Actions: disconnect, freeze/thaw, transfer.

#### Area Overview Panel

- List of loaded areas with name, author, vnum ranges, room count.
- Current age (ticks since last reset) and reset frequency.

#### Ban Management Panel

- Active bans with type, name, banned-by, date, and duration.
- Add new bans: select type (all, mortal, newbie, level, warn), enter pattern,
  optional duration.
- Remove bans by clicking the delete button.

#### Audit Log Panel

- Chronological list of administrative actions.
- Filterable by actor, action type, and date range.
- Each entry shows: timestamp, actor, action, target, details.

#### System Configuration Panel

- View and edit key-value system configuration from the `SystemConfig` table.
- Changes take effect immediately (no server restart required for most settings).

---

## Day-to-Day Administration

### Starting Your Day

1. Check server health: `curl http://localhost:4000/api/health`
2. Review overnight logs: `pm2 logs smaug-ts --lines 100` or
   `journalctl -u smaug-ts --since yesterday`
3. Check the audit log for any unusual admin activity.
4. Verify backups ran successfully.

### Handling Player Issues

**Stuck player** — cannot move or execute commands:

```
at <player> restore <player>
at <player> transfer <player> 3001
```

**Player lost equipment** — check the audit log and restore from backup if
necessary. Use `oinvoke <vnum>` to recreate items.

**Abusive player** — use the progressive discipline ladder:
1. Verbal warning via `tell`.
2. `silence` for channel abuse.
3. `freeze` for short-term restriction.
4. `hell <player> <time> hours` for temporary ban.
5. `ban` for persistent offenders.

### Server Maintenance

**Updating the server:**

```bash
git pull origin main
npm ci
npx prisma migrate deploy
npm run build
npm test
pm2 restart smaug-ts
```

**Database maintenance:**

```bash
# Vacuum and analyse (run weekly)
psql -U smaug -d smaug -c "VACUUM ANALYZE;"

# Check database size
psql -U smaug -d smaug -c "SELECT pg_size_pretty(pg_database_size('smaug'));"
```

**Clearing old audit logs** (optional, if the table grows large):

```sql
DELETE FROM "AuditLog" WHERE timestamp < NOW() - INTERVAL '90 days';
```

### Monitoring Area Resets

Area resets occur on a randomised schedule (approximately every 60 seconds,
with variation). To force-reset a specific area:

```
reset <area-name>
```

To check area status:

```
astat <area-name>
```

This shows the area's current age, reset frequency, and vnum ranges.

---

## FAQ

**Q: How do I create the first immortal account?**
A: Create a normal player character by connecting and going through character
creation. Then, in PostgreSQL, update the trust level directly:

```sql
UPDATE "PlayerCharacter" SET trust = 60 WHERE name = 'YourName';
```

Reconnect and you will have full Implementor access. Use the in-game `trust`
command for subsequent promotions.

**Q: How do I change the server port?**
A: Edit the `PORT` variable in your `.env` file and restart the server.

**Q: How many players can the server handle?**
A: The default `MAX_CONNECTIONS` is 256. On modern hardware, the engine can
comfortably handle 200+ concurrent players. If you need more, increase the
limit and ensure you have sufficient RAM (approximately 2 MB per connection).

**Q: How do I add help files?**
A: Edit `world/helps.json` and add entries. Each help entry has a `keywords`
array and a `text` field. Changes are picked up on server restart.

**Q: How do I enable the authorisation system for new characters?**
A: Characters start with `authState = CREATED`. Set the `WAIT_FOR_AUTH`
system config to require admin approval before new characters can play.
Use `authorize <player> yes` to approve.

**Q: How do I reset a player's password?**
A: Use `mset <player> password <new-password>` in-game, or update the
`passwordHash` field directly in the database using a bcrypt hash.

**Q: How often does the server auto-save players?**
A: Players are saved on quit, on death, and periodically during the full
game tick (approximately every 70 seconds). The save frequency is configurable
via the `SystemConfig` table.

**Q: Can I run the server without PostgreSQL?**
A: No. PostgreSQL is required for player persistence, clan data, boards, and
system configuration. You can run it in Docker if you do not want a system
installation.

**Q: How do I view MUDprog triggers on a mobile?**
A: Use `mstat <mobile>` in-game. The output includes the list of attached
MUDprog triggers with their type and argument.

**Q: How do I add a new social command?**
A: Edit `world/socials.json` and add a new entry following the existing format.
The server loads socials at startup.

**Q: How do I change the MOTD (Message of the Day)?**
A: Edit the greeting text in `src/network/ConnectionManager.ts` (the
`getGreeting()` method) and rebuild, or add a `motd` entry to the help files.

**Q: How do I schedule a reboot?**
A: Use the `reboot` command in-game (trust 58+). The server saves all players,
notifies all connections, and restarts. With PM2 or systemd, the process
restarts automatically.

**Q: How do I check for vnum conflicts?**
A: Use `vnums <low> <high>` in-game to list all entities in a vnum range.
The `VnumRegistry` enforces uniqueness — duplicate vnums trigger a warning
during area loading.

**Q: How do I restore a player from a backup?**
A: Restore the specific player record from a PostgreSQL backup:

```bash
pg_restore -U smaug -d smaug --data-only -t "PlayerCharacter" \
  --use-set-session-authorization /backups/smaug-20260329.dump
```

Or use Prisma Studio to manually edit the player record.

**Q: How do I add a new deity?**
A: Insert a record into the `Deity` table via Prisma Studio or SQL:

```sql
INSERT INTO "Deity" (id, name, filename, description, alignment)
VALUES (gen_random_uuid(), 'Athena', 'athena', 'Goddess of wisdom', 1000);
```

Players can then `worship athena` in-game.

**Q: How do I increase the maximum level?**
A: The current maximum mortal level is 50 (Avatar). This is defined in
`src/game/entities/types.ts` and `src/admin/TrustLevels.ts`. Changing it
requires updating constants, class tables, and XP curves.

**Q: How do I enable HTTPS?**
A: Use Nginx as a reverse proxy with TLS termination. See the
[Nginx Reverse Proxy](../README.md#nginx-reverse-proxy) section in the README.

**Q: How do I view server memory usage?**
A: Use `pm2 monit` for real-time monitoring. The admin API's `/api/admin/stats`
endpoint also returns memory statistics.

**Q: How do I export world data for version control?**
A: The `world/` directory contains all area data as JSON files. Commit it
directly to Git. Changes are human-readable and easily diffable.

**Q: What happens if the database goes down while the server is running?**
A: Player saves will fail but the game continues running from in-memory state.
Reconnect the database and the next save cycle will succeed. Check logs for
Prisma connection errors.
