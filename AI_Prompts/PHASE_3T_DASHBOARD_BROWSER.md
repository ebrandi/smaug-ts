# SMAUG 2.0 TypeScript Port — Phase 3T: Web Admin Dashboard, REST API, JWT Authentication, Server Monitoring, Browser Play Client, Weather System, and Quest System

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
│   │   ├── world/          # AreaManager, RoomManager, ResetEngine, VnumRegistry, WeatherSystem, QuestSystem
│   │   ├── entities/       # Character, Player, Mobile, GameObject, Room, Area, Affect
│   │   ├── economy/        # Currency, ShopSystem, AuctionSystem, BankSystem
│   │   ├── spells/         # SpellEngine, SpellRegistry, SavingThrows, ComponentSystem
│   │   ├── affects/        # AffectManager, AffectRegistry, StatModifier
│   │   └── social/         # ClanSystem, CouncilSystem, DeitySystem, BoardSystem, HousingSystem
│   ├── persistence/        # PlayerRepository, WorldRepository
│   ├── admin/              # AdminRouter, AuthController, MonitoringController, DashboardUI
│   ├── scripting/          # MudProgEngine, IfcheckRegistry, ScriptParser, VariableSubstitution
│   ├── utils/              # AnsiColors, Dice, StringUtils, BitVector, Logger
│   └── migration/          # AreFileParser, PlayerFileParser, MigrationRunner
├── prisma/schema.prisma
├── world/                  # JSON world data files (one subdirectory per area)
├── tests/                  # Unit, integration, e2e tests
└── public/                 # Browser client and admin dashboard static files
    ├── index.html          # Browser play client entry point
    ├── js/
    │   └── client.ts       # Browser play client TypeScript source
    ├── css/
    │   └── style.css       # Browser play client styles
    └── admin/              # Admin dashboard SPA
        ├── index.html
        ├── app.js
        └── style.css
```

## Prior Sub-Phases Completed

**Sub-Phases 3A–3S** are complete. The following files are fully implemented and may be imported:

### From Sub-Phase 3A (Utilities, World Loader, Command Parser)
- `src/utils/AnsiColors.ts`, `src/utils/Dice.ts`, `src/utils/BitVector.ts`, `src/utils/StringUtils.ts`
- `src/game/world/AreaManager.ts`, `src/game/world/VnumRegistry.ts`, `src/game/world/ResetEngine.ts`
- `src/game/commands/CommandRegistry.ts`, `src/game/commands/social.ts`
- `src/network/ConnectionManager.ts` — Full nanny state machine, output pager

### From Sub-Phase 3B (Movement, Look, Combat)
- `src/game/commands/movement.ts`, `src/game/commands/information.ts`
- `src/game/combat/CombatEngine.ts`, `src/game/combat/DamageCalculator.ts`, `src/game/combat/DeathHandler.ts`
- `src/game/commands/combat.ts`
- `src/game/entities/Character.ts` — Regeneration, position update, char update

### From Sub-Phase 3C (Magic, Skills, Affects)
- `src/game/spells/SpellEngine.ts`, `src/game/spells/SpellRegistry.ts`, `src/game/spells/SavingThrows.ts`, `src/game/spells/ComponentSystem.ts`
- `src/game/commands/magic.ts`
- `src/game/affects/AffectManager.ts`, `src/game/affects/AffectRegistry.ts`, `src/game/affects/StatModifier.ts`

### From Sub-Phase 3D (Inventory, Economy, Progression)
- `src/game/commands/objects.ts`, `src/game/economy/*`, `src/game/entities/Player.ts`, `src/game/entities/tables.ts`

### From Sub-Phases 3E–3R (Perception, Communication, Social, Persistence, MUDprogs)
- All game logic systems fully implemented.
- `src/persistence/PlayerRepository.ts`, `src/persistence/WorldRepository.ts`
- `src/scripting/MudProgEngine.ts`, `src/scripting/IfcheckRegistry.ts`, `src/scripting/ScriptParser.ts`, `src/scripting/VariableSubstitution.ts`

### From Sub-Phase 3S (Admin Commands, OLC)
- `src/game/commands/immortal.ts` — All immortal commands (authorize, freeze, goto, transfer, at, purge, mload, oload, slay, force, snoop, switch, return, reboot, shutdown, copyover, set, stat, advance, trust, restore, peace, echo, gecho, ban, allow, users, memory, wizhelp, wizinvis, holylight)
- `src/game/commands/olc.ts` — Full OLC (redit, medit, oedit, mpedit, aedit, savearea, text editor)
- `src/admin/BanSystem.ts` — Ban management, host matching, persistence

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3T Objective

Implement the web admin dashboard (REST API, JWT authentication, server monitoring, React SPA), the browser play client (Socket.IO terminal emulator with ANSI rendering), the weather/time system, and the auto-quest system. This is the **final sub-phase** — after completion, the SMAUG 2.0 TypeScript port is fully functional with all game logic, administration, persistence, browser UI, and dashboard operational.

---

## Files to Implement

### 1. `src/admin/AuthController.ts` — JWT Authentication

```typescript
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/Logger';

const prisma = new PrismaClient();

/**
 * JWT authentication controller for the admin REST API.
 * Replicates modern auth patterns — the legacy engine had no web API.
 *
 * Only players with trust >= 51 (LEVEL_NEOPHYTE, first immortal rank)
 * can authenticate to the API. JWT tokens contain the player's name,
 * trust level, and expiration.
 */
export class AuthController {
  private readonly jwtSecret: string;
  private readonly tokenExpiry: string = '24h';

  /**
   * @param jwtSecret The secret used to sign/verify JWT tokens.
   *                  Read from process.env.JWT_SECRET or a default.
   */
  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
  }

  /**
   * Authenticate a player and return a signed JWT.
   *
   * @param name Player character name.
   * @param password Plain-text password to verify.
   * @returns A signed JWT string, or null if authentication fails.
   *
   * Steps:
   *   1. Look up the player in PostgreSQL via Prisma.
   *   2. Verify the password using bcrypt.compare().
   *   3. Check trust level >= 51.
   *   4. Sign and return a JWT with payload { name, trust, iat, exp }.
   *   5. Log the authentication attempt (success or failure).
   *
   * Failure reasons: player not found, wrong password, insufficient trust.
   * All failures return null (do not reveal which step failed to callers).
   */
  async login(name: string, password: string): Promise<{ token: string; trust: number } | null> {
    try {
      const player = await prisma.playerCharacter.findUnique({
        where: { name: name.toLowerCase() },
      });

      if (!player) {
        Logger.info('auth', `Login failed: player '${name}' not found`);
        return null;
      }

      const passwordValid = await bcrypt.compare(password, player.passwordHash);
      if (!passwordValid) {
        Logger.info('auth', `Login failed: invalid password for '${name}'`);
        return null;
      }

      const trust = player.trust ?? 0;
      if (trust < 51) {
        Logger.info('auth', `Login failed: '${name}' has insufficient trust (${trust})`);
        return null;
      }

      const token = jwt.sign(
        { name: player.name, trust },
        this.jwtSecret,
        { expiresIn: this.tokenExpiry }
      );

      Logger.info('auth', `Login successful: '${name}' (trust ${trust})`);

      // Audit log
      await prisma.auditLog.create({
        data: {
          actor: player.name,
          action: 'login',
          detail: `Dashboard login from API`,
          timestamp: new Date(),
        },
      });

      return { token, trust };
    } catch (err) {
      Logger.error('auth', `Login error: ${err}`);
      return null;
    }
  }

  /**
   * Verify and decode a JWT token.
   *
   * @param token The JWT token string.
   * @returns The decoded payload { name, trust }, or null if invalid/expired.
   */
  verifyToken(token: string): { name: string; trust: number } | null {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as { name: string; trust: number };
      return { name: payload.name, trust: payload.trust };
    } catch {
      return null;
    }
  }
}
```

### 2. `src/admin/MonitoringController.ts` — Server Monitoring

```typescript
import { PrismaClient } from '@prisma/client';
import { GameLoop } from '../core/GameLoop';
import { ConnectionManager } from '../network/ConnectionManager';
import { AreaManager } from '../game/world/AreaManager';
import { VnumRegistry } from '../game/world/VnumRegistry';
import { Logger } from '../utils/Logger';

const prisma = new PrismaClient();

/**
 * Server monitoring controller.
 * Collects real-time metrics from the game engine for the admin dashboard.
 */
export class MonitoringController {
  private gameLoop: GameLoop;
  private connectionMgr: ConnectionManager;

  constructor(gameLoop: GameLoop, connectionMgr: ConnectionManager) {
    this.gameLoop = gameLoop;
    this.connectionMgr = connectionMgr;
  }

  /**
   * Get comprehensive server statistics.
   *
   * Returns:
   *   - uptime: Process uptime in seconds.
   *   - memoryUsage: Heap used/total and RSS in MB.
   *   - onlinePlayers: Number of players currently in-game (CON_PLAYING state).
   *   - totalPlayers: Total registered players in the database.
   *   - areaCount: Number of loaded areas.
   *   - roomCount: Number of rooms in VnumRegistry.
   *   - mobPrototypeCount: Number of mobile prototypes.
   *   - objPrototypeCount: Number of object prototypes.
   *   - activeMobCount: Number of live mobile instances in the game world.
   *   - activeObjCount: Number of live object instances in the game world.
   *   - currentPulse: Current pulse number from the game loop.
   *   - averageTickMs: Average time to process a game tick (last 100 ticks).
   *   - peakPlayers: Peak concurrent players since boot.
   */
  async getServerStats(): Promise<ServerStats> {
    const mem = process.memoryUsage();
    const onlinePlayers = this.connectionMgr.getPlayingDescriptors().length;

    let totalPlayers = 0;
    try {
      totalPlayers = await prisma.playerCharacter.count();
    } catch {
      // DB may be unavailable
    }

    return {
      uptime: Math.floor(process.uptime()),
      memoryUsage: {
        heapUsedMB: +(mem.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMB: +(mem.heapTotal / 1024 / 1024).toFixed(1),
        rssMB: +(mem.rss / 1024 / 1024).toFixed(1),
      },
      onlinePlayers,
      totalPlayers,
      areaCount: AreaManager.getAllAreas().length,
      roomCount: VnumRegistry.getRoomCount(),
      mobPrototypeCount: VnumRegistry.getMobilePrototypeCount(),
      objPrototypeCount: VnumRegistry.getObjectPrototypeCount(),
      activeMobCount: VnumRegistry.getActiveMobileCount(),
      activeObjCount: VnumRegistry.getActiveObjectCount(),
      currentPulse: this.gameLoop.currentPulse,
      averageTickMs: this.gameLoop.getAverageTickMs(),
      peakPlayers: this.connectionMgr.peakPlayerCount,
    };
  }

  /**
   * Get recent audit log entries.
   *
   * @param limit Maximum number of entries to return (default 50, max 500).
   * @param actor Optional: filter by actor name.
   * @param action Optional: filter by action type.
   * @param from Optional: filter entries after this date.
   * @param to Optional: filter entries before this date.
   */
  async getRecentLogs(
    limit: number = 50,
    actor?: string,
    action?: string,
    from?: Date,
    to?: Date,
  ): Promise<AuditLogEntry[]> {
    const where: any = {};
    if (actor) where.actor = actor;
    if (action) where.action = action;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = from;
      if (to) where.timestamp.lte = to;
    }

    try {
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: Math.min(limit, 500),
      });

      return logs.map(l => ({
        id: l.id,
        actor: l.actor,
        action: l.action,
        detail: l.detail ?? '',
        timestamp: l.timestamp.toISOString(),
      }));
    } catch (err) {
      Logger.error('monitoring', `Failed to query audit logs: ${err}`);
      return [];
    }
  }

  /**
   * Get online player list with details.
   */
  getOnlinePlayers(): OnlinePlayerInfo[] {
    return this.connectionMgr.getPlayingDescriptors().map(d => ({
      name: d.character?.name ?? 'unknown',
      level: d.character?.level ?? 0,
      class: d.character?.charClass ?? 'unknown',
      race: d.character?.race ?? 'unknown',
      room: d.character?.inRoom?.vnum ?? 0,
      roomName: d.character?.inRoom?.name ?? 'unknown',
      idle: Math.floor((d.idle ?? 0) / 60), // minutes
      host: d.host ?? 'unknown',
      connectedAt: d.connectedAt?.toISOString() ?? '',
    }));
  }
}

export interface ServerStats {
  uptime: number;
  memoryUsage: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
  onlinePlayers: number;
  totalPlayers: number;
  areaCount: number;
  roomCount: number;
  mobPrototypeCount: number;
  objPrototypeCount: number;
  activeMobCount: number;
  activeObjCount: number;
  currentPulse: number;
  averageTickMs: number;
  peakPlayers: number;
}

export interface AuditLogEntry {
  id: number;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface OnlinePlayerInfo {
  name: string;
  level: number;
  class: string;
  race: string;
  room: number;
  roomName: string;
  idle: number;
  host: string;
  connectedAt: string;
}
```

### 3. `src/admin/AdminRouter.ts` — REST API

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from './AuthController';
import { MonitoringController } from './MonitoringController';
import { ConnectionManager } from '../network/ConnectionManager';
import { AreaManager } from '../game/world/AreaManager';
import { BanSystem, BanEntry } from './BanSystem';
import { VnumRegistry } from '../game/world/VnumRegistry';
import { PlayerRepository } from '../persistence/PlayerRepository';
import { WorldRepository } from '../persistence/WorldRepository';
import { EventBus, GameEvent } from '../core/EventBus';
import { Logger } from '../utils/Logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Create the admin REST API router.
 * All endpoints require JWT authentication via Bearer token.
 *
 * Replicates the admin functionality described in ARCHITECTURE.md §19.
 * The legacy engine had no web API — this is a modern addition.
 *
 * Endpoint groups:
 *   POST /api/auth/login      — Authenticate, get JWT token
 *   GET  /api/dashboard       — Server stats overview
 *   GET  /api/players         — Online player list
 *   POST /api/players/:name/freeze     — Toggle freeze
 *   POST /api/players/:name/disconnect — Force disconnect
 *   POST /api/players/:name/advance    — Set player level
 *   GET  /api/areas           — Area list
 *   GET  /api/areas/:name     — Area details
 *   POST /api/areas/:name/reset — Force area reset
 *   GET  /api/bans            — List bans
 *   POST /api/bans            — Create ban
 *   DELETE /api/bans/:id      — Remove ban
 *   GET  /api/logs            — Query audit logs
 *   POST /api/system/reboot   — Trigger reboot
 *   POST /api/system/shutdown — Trigger shutdown
 *
 * Rate limiting: 100 requests/minute per IP using a simple in-memory counter.
 * Audit logging: All admin API actions are logged to the AuditLog Prisma model.
 */
export function createAdminRouter(
  authController: AuthController,
  monitoringController: MonitoringController,
  connectionMgr: ConnectionManager,
  banSystem: BanSystem,
): Router {
  const router = Router();

  // ─── Rate Limiter ────
  const rateLimits = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT = 100; // requests
  const RATE_WINDOW = 60_000; // 1 minute

  const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const entry = rateLimits.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
      return next();
    }

    if (entry.count >= RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    entry.count++;
    next();
  };

  router.use(rateLimitMiddleware);

  // ─── Auth Endpoint (no JWT required) ────

  /**
   * POST /api/auth/login
   * Body: { name: string, password: string }
   * Returns: { token: string, trust: number } or 401
   *
   * Authenticates a player with name + password.
   * Only immortals (trust >= 51) can obtain a token.
   */
  router.post('/auth/login', async (req: Request, res: Response) => {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password required.' });
    }

    const result = await authController.login(name, password);
    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials or insufficient trust.' });
    }

    res.json({ token: result.token, trust: result.trust });
  });

  // ─── JWT Verification Middleware ────

  /**
   * JWT auth middleware. Applied to all routes below.
   * Extracts Bearer token from Authorization header.
   * Verifies token signature and expiration.
   * Attaches decoded payload to req.admin.
   */
  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided.' });
    }

    const payload = authController.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    (req as any).admin = payload;
    next();
  };

  // Apply JWT middleware to all subsequent routes
  router.use(authMiddleware);

  // ─── Trust Level Middleware Factory ────
  const requireTrust = (minTrust: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const admin = (req as any).admin;
      if (!admin || admin.trust < minTrust) {
        return res.status(403).json({ error: `Requires trust level ${minTrust}+.` });
      }
      next();
    };
  };

  // ─── Audit Helper ────
  async function auditLog(actor: string, action: string, detail: string): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: { actor, action, detail, timestamp: new Date() },
      });
    } catch {
      Logger.error('admin-api', `Failed to write audit log: ${action} by ${actor}`);
    }
  }

  // ─── Dashboard ────

  /**
   * GET /api/dashboard
   * Returns server stats: uptime, player count, area count, memory, etc.
   * Trust required: 51 (any immortal).
   */
  router.get('/dashboard', async (_req: Request, res: Response) => {
    const stats = await monitoringController.getServerStats();
    res.json(stats);
  });

  // ─── Players ────

  /**
   * GET /api/players
   * Returns list of online players with name, level, class, race, room, idle, host.
   */
  router.get('/players', (_req: Request, res: Response) => {
    const players = monitoringController.getOnlinePlayers();
    res.json(players);
  });

  /**
   * POST /api/players/:name/freeze
   * Toggle freeze flag on a player.
   * Trust required: 55 (DEMI_GOD).
   */
  router.post('/players/:name/freeze', requireTrust(55), async (req: Request, res: Response) => {
    const { name } = req.params;
    const admin = (req as any).admin;
    const victim = connectionMgr.findCharacterByName(name);
    if (!victim) {
      return res.status(404).json({ error: 'Player not found or not online.' });
    }

    const wasFrozen = victim.isFrozen?.() ?? false;
    // Toggle freeze via the same mechanism as immortal.ts doFreeze
    if (wasFrozen) {
      victim.actFlags = victim.actFlags & ~(1n << 14n); // PLR_FREEZE bit
    } else {
      victim.actFlags = victim.actFlags | (1n << 14n);
    }

    await auditLog(admin.name, 'freeze', `${wasFrozen ? 'Unfroze' : 'Froze'} ${name}`);
    res.json({ success: true, frozen: !wasFrozen });
  });

  /**
   * POST /api/players/:name/disconnect
   * Force disconnect a player.
   * Trust required: 55 (DEMI_GOD).
   */
  router.post('/players/:name/disconnect', requireTrust(55), async (req: Request, res: Response) => {
    const { name } = req.params;
    const admin = (req as any).admin;
    const victim = connectionMgr.findCharacterByName(name);
    if (!victim || !victim.descriptor) {
      return res.status(404).json({ error: 'Player not found or not online.' });
    }

    victim.sendToChar('You have been disconnected by an administrator.\r\n');
    // Save before disconnect
    if (!victim.isNPC()) {
      PlayerRepository.save(victim as any);
    }
    victim.descriptor.close();

    await auditLog(admin.name, 'disconnect', `Disconnected ${name}`);
    res.json({ success: true });
  });

  /**
   * POST /api/players/:name/advance
   * Set player level. Body: { level: number }
   * Trust required: 58 (GREATER_GOD).
   */
  router.post('/players/:name/advance', requireTrust(58), async (req: Request, res: Response) => {
    const { name } = req.params;
    const { level } = req.body;
    const admin = (req as any).admin;

    if (!level || typeof level !== 'number' || level < 1 || level > 65) {
      return res.status(400).json({ error: 'Level must be 1-65.' });
    }

    const victim = connectionMgr.findCharacterByName(name);
    if (!victim || victim.isNPC()) {
      return res.status(404).json({ error: 'Player not found or not online.' });
    }

    victim.level = level;
    PlayerRepository.save(victim as any);

    await auditLog(admin.name, 'advance', `Set ${name} to level ${level}`);
    res.json({ success: true, newLevel: level });
  });

  // ─── Areas ────

  /**
   * GET /api/areas
   * List all areas with name, author, vnum ranges, age, player count.
   */
  router.get('/areas', (_req: Request, res: Response) => {
    const areas = AreaManager.getAllAreas().map(a => ({
      name: a.name,
      filename: a.filename,
      author: a.author,
      lowVnum: a.lowVnum,
      highVnum: a.highVnum,
      lowLevel: a.lowLevel,
      highLevel: a.highLevel,
      age: a.age,
      resetFrequency: a.resetFrequency,
      playerCount: a.getPlayerCount(),
      isModified: a.isModified,
      roomCount: a.rooms.length,
      mobCount: a.mobiles.length,
      objCount: a.objects.length,
    }));
    res.json(areas);
  });

  /**
   * GET /api/areas/:name
   * Detailed area info: rooms, mobs, objects, resets.
   */
  router.get('/areas/:name', (req: Request, res: Response) => {
    const area = AreaManager.findAreaByName(req.params.name);
    if (!area) {
      return res.status(404).json({ error: 'Area not found.' });
    }

    res.json({
      name: area.name,
      author: area.author,
      filename: area.filename,
      lowVnum: area.lowVnum,
      highVnum: area.highVnum,
      resetFrequency: area.resetFrequency,
      resetMessage: area.resetMessage,
      rooms: area.rooms.map(r => ({
        vnum: r.vnum,
        name: r.name,
        sector: r.sectorType,
        exits: Array.from(r.exits.entries()).map(([dir, ex]) => ({
          direction: dir,
          toVnum: ex?.toVnum,
        })).filter(e => e.toVnum),
      })),
      mobiles: area.mobiles.map(m => ({
        vnum: m.vnum,
        name: m.shortDescription,
        level: m.level,
      })),
      objects: area.objects.map(o => ({
        vnum: o.vnum,
        name: o.shortDescription,
        type: o.itemType,
        level: o.level,
      })),
    });
  });

  /**
   * POST /api/areas/:name/reset
   * Force area reset. Trust required: 55.
   */
  router.post('/areas/:name/reset', requireTrust(55), async (req: Request, res: Response) => {
    const admin = (req as any).admin;
    const area = AreaManager.findAreaByName(req.params.name);
    if (!area) {
      return res.status(404).json({ error: 'Area not found.' });
    }

    AreaManager.resetArea(area);
    await auditLog(admin.name, 'area_reset', `Force reset area: ${area.name}`);
    res.json({ success: true });
  });

  // ─── Bans ────

  /**
   * GET /api/bans
   * List all active bans.
   */
  router.get('/bans', (_req: Request, res: Response) => {
    const bans = banSystem.getAllBans().map((b, i) => ({
      id: i,
      site: (b.suffix ? '*' : '') + b.name + (b.prefix ? '*' : ''),
      type: b.flagType,
      bannedBy: b.bannedBy,
      bannedAt: b.bannedAt.toISOString(),
      duration: b.duration,
      unbanDate: b.unbanDate?.toISOString() ?? null,
      note: b.note,
    }));
    res.json(bans);
  });

  /**
   * POST /api/bans
   * Create a ban. Body: { site, type, duration, note }
   * Trust required: 55 (DEMI_GOD).
   */
  router.post('/bans', requireTrust(55), async (req: Request, res: Response) => {
    const admin = (req as any).admin;
    const { site, type, duration, note } = req.body;

    if (!site || !type) {
      return res.status(400).json({ error: 'Site and type are required.' });
    }

    const validTypes = ['all', 'newbie', 'mortal', 'level', 'warn'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
    }

    const dur = duration ?? -1;
    const prefix = site.endsWith('*');
    const suffix = site.startsWith('*');
    const cleanSite = site.replace(/^\*|\*$/g, '');

    const entry: BanEntry = {
      name: cleanSite,
      user: '',
      note: note ?? '',
      bannedBy: admin.name,
      bannedAt: new Date(),
      flagType: type,
      level: 0,
      unbanDate: dur > 0 ? new Date(Date.now() + dur * 86400000) : null,
      duration: dur,
      prefix,
      suffix,
    };

    banSystem.addBan(entry);
    await auditLog(admin.name, 'ban_add', `Banned ${site} (${type}, ${dur === -1 ? 'permanent' : dur + ' days'})`);
    res.json({ success: true });
  });

  /**
   * DELETE /api/bans/:id
   * Remove a ban by index. Trust required: 55.
   */
  router.delete('/bans/:id', requireTrust(55), async (req: Request, res: Response) => {
    const admin = (req as any).admin;
    const id = parseInt(req.params.id, 10);
    const bans = banSystem.getAllBans();

    if (isNaN(id) || id < 0 || id >= bans.length) {
      return res.status(404).json({ error: 'Ban not found.' });
    }

    const ban = bans[id];
    banSystem.removeBan(ban.name);
    await auditLog(admin.name, 'ban_remove', `Removed ban: ${ban.name}`);
    res.json({ success: true });
  });

  // ─── Logs ────

  /**
   * GET /api/logs
   * Query audit logs. Params: actor, action, from, to, limit.
   */
  router.get('/logs', async (req: Request, res: Response) => {
    const { actor, action, from, to, limit } = req.query;
    const logs = await monitoringController.getRecentLogs(
      limit ? parseInt(limit as string, 10) : 50,
      actor as string,
      action as string,
      from ? new Date(from as string) : undefined,
      to ? new Date(to as string) : undefined,
    );
    res.json(logs);
  });

  // ─── System ────

  /**
   * POST /api/system/reboot
   * Trigger server reboot. Trust required: 58 (GREATER_GOD).
   */
  router.post('/system/reboot', requireTrust(58), async (req: Request, res: Response) => {
    const admin = (req as any).admin;
    await auditLog(admin.name, 'reboot', 'Reboot triggered via API');
    Logger.info('admin-api', `API reboot by ${admin.name}`);

    res.json({ success: true, message: 'Reboot initiated.' });

    // Delayed reboot to allow response to be sent
    setTimeout(() => {
      EventBus.emit(GameEvent.ServerReboot, { actor: admin.name, source: 'api' });
    }, 1000);
  });

  /**
   * POST /api/system/shutdown
   * Trigger server shutdown. Trust required: 58 (GREATER_GOD).
   */
  router.post('/system/shutdown', requireTrust(58), async (req: Request, res: Response) => {
    const admin = (req as any).admin;
    await auditLog(admin.name, 'shutdown', 'Shutdown triggered via API');
    Logger.info('admin-api', `API shutdown by ${admin.name}`);

    res.json({ success: true, message: 'Shutdown initiated.' });

    setTimeout(() => {
      EventBus.emit(GameEvent.ServerShutdown, { actor: admin.name, source: 'api' });
    }, 1000);
  });

  return router;
}
```

### 4. `src/admin/DashboardUI.ts` — Dashboard Static File Serving

```typescript
import express, { Express } from 'express';
import * as path from 'path';
import { Logger } from '../utils/Logger';

/**
 * Configure serving of the admin dashboard static files and browser client.
 *
 * The admin dashboard is a single-page application served from /admin/.
 * The browser play client is served from / (root).
 *
 * File layout:
 *   public/index.html         — Browser play client
 *   public/js/client.js       — Compiled client JavaScript
 *   public/css/style.css      — Client styles
 *   public/admin/index.html   — Admin dashboard SPA
 *   public/admin/app.js       — Dashboard JavaScript
 *   public/admin/style.css    — Dashboard styles
 *
 * This function attaches middleware to the Express app.
 */
export function configureDashboardRoutes(app: Express): void {
  const publicDir = path.join(process.cwd(), 'public');

  // Serve static files for the browser client
  app.use(express.static(publicDir));

  // Serve admin dashboard (SPA — all /admin/* routes return index.html)
  app.use('/admin', express.static(path.join(publicDir, 'admin')));
  app.get('/admin/*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'admin', 'index.html'));
  });

  Logger.info('dashboard', `Serving browser client from ${publicDir}`);
  Logger.info('dashboard', `Serving admin dashboard from ${path.join(publicDir, 'admin')}`);
}
```

### 5. `public/admin/index.html` — Admin Dashboard HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMAUG 2.0 — Admin Dashboard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app"></div>
  <script src="app.js"></script>
</body>
</html>
```

### 6. `public/admin/app.js` — Admin Dashboard SPA

```javascript
/**
 * SMAUG 2.0 Admin Dashboard — Single Page Application
 *
 * A lightweight vanilla JavaScript SPA (no React build step required)
 * that consumes the REST API defined in AdminRouter.ts.
 *
 * Pages:
 *   - Login: JWT authentication form.
 *   - Dashboard: Server stats (uptime, memory, player count, pulse).
 *                Auto-refreshes every 5 seconds.
 *   - Players: Online player list with actions (freeze, disconnect, advance).
 *   - Areas: Area list with room/mob/obj counts and reset button.
 *   - Bans: Ban list with add/remove controls.
 *   - Logs: Searchable, filterable audit log viewer.
 *
 * Architecture:
 *   - State stored in a global `state` object.
 *   - Navigation via hash-based routing (#dashboard, #players, etc.).
 *   - API calls via fetch() with JWT Authorization header.
 *   - Token stored in localStorage.
 *   - All rendering is DOM-based (createElement).
 */

const API_BASE = '/api';
const state = {
  token: localStorage.getItem('admin_token') || '',
  trust: parseInt(localStorage.getItem('admin_trust') || '0', 10),
  currentPage: 'login',
};

// ─── API Helpers ────

async function apiCall(method, endpoint, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (state.token) {
    opts.headers['Authorization'] = 'Bearer ' + state.token;
  }
  if (body) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + endpoint, opts);
  if (res.status === 401) {
    // Token expired — redirect to login
    state.token = '';
    localStorage.removeItem('admin_token');
    navigate('login');
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ─── Navigation ────

function navigate(page) {
  state.currentPage = page;
  window.location.hash = '#' + page;
  render();
}

window.addEventListener('hashchange', () => {
  const page = window.location.hash.substring(1) || 'login';
  state.currentPage = page;
  render();
});

// ─── Rendering ────

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (!state.token && state.currentPage !== 'login') {
    navigate('login');
    return;
  }

  switch (state.currentPage) {
    case 'login':     renderLogin(app); break;
    case 'dashboard': renderDashboard(app); break;
    case 'players':   renderPlayers(app); break;
    case 'areas':     renderAreas(app); break;
    case 'bans':      renderBans(app); break;
    case 'logs':      renderLogs(app); break;
    default:          renderDashboard(app); break;
  }
}

// ─── Navbar ────

function createNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  const links = [
    { label: 'Dashboard', page: 'dashboard' },
    { label: 'Players', page: 'players' },
    { label: 'Areas', page: 'areas' },
    { label: 'Bans', page: 'bans' },
    { label: 'Logs', page: 'logs' },
  ];

  const title = document.createElement('span');
  title.className = 'nav-title';
  title.textContent = 'SMAUG 2.0 Admin';
  nav.appendChild(title);

  for (const link of links) {
    const a = document.createElement('a');
    a.href = '#' + link.page;
    a.textContent = link.label;
    a.className = state.currentPage === link.page ? 'active' : '';
    nav.appendChild(a);
  }

  const logout = document.createElement('a');
  logout.href = '#';
  logout.textContent = 'Logout';
  logout.onclick = (e) => {
    e.preventDefault();
    state.token = '';
    state.trust = 0;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_trust');
    navigate('login');
  };
  nav.appendChild(logout);

  return nav;
}

// ─── Login Page ────

function renderLogin(app) {
  const container = document.createElement('div');
  container.className = 'login-container';

  const h1 = document.createElement('h1');
  h1.textContent = 'SMAUG 2.0 Admin Login';
  container.appendChild(h1);

  const form = document.createElement('form');
  form.innerHTML = `
    <input type="text" id="login-name" placeholder="Character Name" required>
    <input type="password" id="login-pass" placeholder="Password" required>
    <button type="submit">Login</button>
    <p id="login-error" class="error"></p>
  `;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('login-name').value;
    const pass = document.getElementById('login-pass').value;
    try {
      const data = await apiCall('POST', '/auth/login', { name, password: pass });
      if (data.token) {
        state.token = data.token;
        state.trust = data.trust;
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_trust', String(data.trust));
        navigate('dashboard');
      }
    } catch (err) {
      document.getElementById('login-error').textContent = 'Login failed. Check credentials.';
    }
  };

  container.appendChild(form);
  app.appendChild(container);
}

// ─── Dashboard Page ────

let dashboardInterval = null;

function renderDashboard(app) {
  if (dashboardInterval) clearInterval(dashboardInterval);
  app.appendChild(createNavbar());

  const content = document.createElement('div');
  content.className = 'content';

  const h2 = document.createElement('h2');
  h2.textContent = 'Server Dashboard';
  content.appendChild(h2);

  const statsDiv = document.createElement('div');
  statsDiv.className = 'stats-grid';
  statsDiv.id = 'stats-grid';
  content.appendChild(statsDiv);

  app.appendChild(content);

  async function refreshStats() {
    try {
      const stats = await apiCall('GET', '/dashboard');
      const grid = document.getElementById('stats-grid');
      if (!grid) return;
      grid.innerHTML = '';

      const cards = [
        { label: 'Players Online', value: stats.onlinePlayers, sub: `Peak: ${stats.peakPlayers}` },
        { label: 'Total Players', value: stats.totalPlayers },
        { label: 'Uptime', value: formatUptime(stats.uptime) },
        { label: 'Memory (Heap)', value: stats.memoryUsage.heapUsedMB + ' MB', sub: `Total: ${stats.memoryUsage.heapTotalMB} MB` },
        { label: 'Areas', value: stats.areaCount },
        { label: 'Rooms', value: stats.roomCount },
        { label: 'Mob Prototypes', value: stats.mobPrototypeCount, sub: `Active: ${stats.activeMobCount}` },
        { label: 'Obj Prototypes', value: stats.objPrototypeCount, sub: `Active: ${stats.activeObjCount}` },
        { label: 'Pulse', value: stats.currentPulse },
        { label: 'Avg Tick', value: stats.averageTickMs.toFixed(1) + ' ms' },
      ];

      for (const card of cards) {
        const div = document.createElement('div');
        div.className = 'stat-card';
        div.innerHTML = `<div class="stat-value">${card.value}</div>
                         <div class="stat-label">${card.label}</div>
                         ${card.sub ? '<div class="stat-sub">' + card.sub + '</div>' : ''}`;
        grid.appendChild(div);
      }
    } catch { /* ignore refresh errors */ }
  }

  refreshStats();
  dashboardInterval = setInterval(refreshStats, 5000);
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h + 'h ' + m + 'm';
}

// ─── Players Page ────

function renderPlayers(app) {
  if (dashboardInterval) { clearInterval(dashboardInterval); dashboardInterval = null; }
  app.appendChild(createNavbar());

  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = '<h2>Online Players</h2><div id="player-list">Loading...</div>';
  app.appendChild(content);

  loadPlayers();
}

async function loadPlayers() {
  try {
    const players = await apiCall('GET', '/players');
    const container = document.getElementById('player-list');
    if (!container) return;

    if (players.length === 0) {
      container.innerHTML = '<p>No players online.</p>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Name</th><th>Level</th><th>Class</th><th>Race</th>
      <th>Room</th><th>Idle</th><th>Host</th><th>Actions</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    for (const p of players) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.name}</td><td>${p.level}</td><td>${p.class}</td><td>${p.race}</td>
        <td>${p.room} (${p.roomName})</td><td>${p.idle}m</td><td>${p.host}</td>
        <td>
          <button onclick="freezePlayer('${p.name}')">Freeze</button>
          <button onclick="disconnectPlayer('${p.name}')">Disconnect</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  } catch { /* ignore */ }
}

window.freezePlayer = async (name) => {
  await apiCall('POST', '/players/' + name + '/freeze');
  loadPlayers();
};

window.disconnectPlayer = async (name) => {
  if (confirm('Disconnect ' + name + '?')) {
    await apiCall('POST', '/players/' + name + '/disconnect');
    loadPlayers();
  }
};

// ─── Areas Page ────

function renderAreas(app) {
  if (dashboardInterval) { clearInterval(dashboardInterval); dashboardInterval = null; }
  app.appendChild(createNavbar());

  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = '<h2>Areas</h2><div id="area-list">Loading...</div>';
  app.appendChild(content);

  loadAreas();
}

async function loadAreas() {
  try {
    const areas = await apiCall('GET', '/areas');
    const container = document.getElementById('area-list');
    if (!container) return;

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Name</th><th>Author</th><th>Vnums</th><th>Levels</th>
      <th>Rooms</th><th>Mobs</th><th>Objs</th><th>Age</th><th>Players</th><th>Actions</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    for (const a of areas) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.name}${a.isModified ? ' *' : ''}</td><td>${a.author}</td>
        <td>${a.lowVnum}-${a.highVnum}</td><td>${a.lowLevel}-${a.highLevel}</td>
        <td>${a.roomCount}</td><td>${a.mobCount}</td><td>${a.objCount}</td>
        <td>${a.age}/${a.resetFrequency}</td><td>${a.playerCount}</td>
        <td><button onclick="resetArea('${a.name}')">Reset</button></td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  } catch { /* ignore */ }
}

window.resetArea = async (name) => {
  await apiCall('POST', '/areas/' + encodeURIComponent(name) + '/reset');
  loadAreas();
};

// ─── Bans Page ────

function renderBans(app) {
  if (dashboardInterval) { clearInterval(dashboardInterval); dashboardInterval = null; }
  app.appendChild(createNavbar());

  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = `<h2>Ban Management</h2>
    <div class="ban-form">
      <input id="ban-site" placeholder="Site (e.g., 192.168.*)">
      <select id="ban-type"><option>all</option><option>newbie</option><option>mortal</option><option>warn</option></select>
      <input id="ban-duration" placeholder="Days (-1=permanent)" type="number" value="-1">
      <input id="ban-note" placeholder="Note">
      <button onclick="addBan()">Add Ban</button>
    </div>
    <div id="ban-list">Loading...</div>`;
  app.appendChild(content);

  loadBans();
}

async function loadBans() {
  try {
    const bans = await apiCall('GET', '/bans');
    const container = document.getElementById('ban-list');
    if (!container) return;

    if (bans.length === 0) {
      container.innerHTML = '<p>No active bans.</p>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Site</th><th>Type</th><th>Duration</th><th>Banned By</th><th>Date</th><th>Note</th><th>Actions</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    for (const b of bans) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.site}</td><td>${b.type}</td>
        <td>${b.duration === -1 ? 'permanent' : b.duration + ' days'}</td>
        <td>${b.bannedBy}</td><td>${new Date(b.bannedAt).toLocaleDateString()}</td>
        <td>${b.note}</td>
        <td><button onclick="removeBan(${b.id})">Remove</button></td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  } catch { /* ignore */ }
}

window.addBan = async () => {
  const site = document.getElementById('ban-site').value;
  const type = document.getElementById('ban-type').value;
  const duration = parseInt(document.getElementById('ban-duration').value, 10);
  const note = document.getElementById('ban-note').value;
  if (!site) return;
  await apiCall('POST', '/bans', { site, type, duration, note });
  loadBans();
};

window.removeBan = async (id) => {
  await apiCall('DELETE', '/bans/' + id);
  loadBans();
};

// ─── Logs Page ────

function renderLogs(app) {
  if (dashboardInterval) { clearInterval(dashboardInterval); dashboardInterval = null; }
  app.appendChild(createNavbar());

  const content = document.createElement('div');
  content.className = 'content';
  content.innerHTML = `<h2>Audit Logs</h2>
    <div class="log-filters">
      <input id="log-actor" placeholder="Filter by actor">
      <input id="log-action" placeholder="Filter by action">
      <input id="log-limit" type="number" value="50" placeholder="Limit">
      <button onclick="loadLogs()">Search</button>
    </div>
    <div id="log-list">Loading...</div>`;
  app.appendChild(content);

  loadLogs();
}

window.loadLogs = async () => {
  try {
    const actor = document.getElementById('log-actor')?.value || '';
    const action = document.getElementById('log-action')?.value || '';
    const limit = document.getElementById('log-limit')?.value || '50';

    let url = '/logs?limit=' + limit;
    if (actor) url += '&actor=' + encodeURIComponent(actor);
    if (action) url += '&action=' + encodeURIComponent(action);

    const logs = await apiCall('GET', url);
    const container = document.getElementById('log-list');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = '<p>No log entries found.</p>';
      return;
    }

    const table = document.createElement('table');
    table.innerHTML = `<thead><tr>
      <th>Time</th><th>Actor</th><th>Action</th><th>Detail</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    for (const l of logs) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(l.timestamp).toLocaleString()}</td>
        <td>${l.actor}</td><td>${l.action}</td><td>${l.detail}</td>
      `;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  } catch { /* ignore */ }
};

// ─── Init ────

if (state.token) {
  navigate(window.location.hash.substring(1) || 'dashboard');
} else {
  navigate('login');
}
```

### 7. `public/admin/style.css` — Dashboard Styles

```css
/**
 * Admin Dashboard Stylesheet
 * Dark theme matching the terminal aesthetic of a MUD engine.
 */

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  min-height: 100vh;
}

.navbar {
  background: #16213e;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 2px solid #0f3460;
}

.nav-title {
  font-weight: bold;
  font-size: 18px;
  color: #e94560;
  margin-right: 20px;
}

.navbar a {
  color: #a0a0b0;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 4px;
  transition: background 0.2s;
}

.navbar a:hover { background: #0f3460; color: #fff; }
.navbar a.active { background: #0f3460; color: #e94560; }

.content { padding: 24px; max-width: 1200px; margin: 0 auto; }

h2 { color: #e94560; margin-bottom: 20px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-value { font-size: 28px; font-weight: bold; color: #e94560; }
.stat-label { font-size: 14px; color: #a0a0b0; margin-top: 4px; }
.stat-sub { font-size: 12px; color: #666; margin-top: 4px; }

table { width: 100%; border-collapse: collapse; margin-top: 12px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #0f3460; }
th { background: #16213e; color: #e94560; }
tr:hover { background: #16213e44; }

button {
  background: #0f3460;
  color: #e0e0e0;
  border: 1px solid #e94560;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
button:hover { background: #e94560; color: #fff; }

input, select {
  background: #16213e;
  color: #e0e0e0;
  border: 1px solid #0f3460;
  padding: 8px 12px;
  border-radius: 4px;
  margin-right: 8px;
}
input:focus, select:focus { border-color: #e94560; outline: none; }

.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 40px;
  background: #16213e;
  border-radius: 12px;
  text-align: center;
}
.login-container h1 { color: #e94560; margin-bottom: 24px; font-size: 22px; }
.login-container input { width: 100%; margin-bottom: 12px; display: block; }
.login-container button { width: 100%; padding: 12px; font-size: 16px; }
.error { color: #e94560; margin-top: 12px; }

.ban-form, .log-filters { margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 8px; }
```

### 8. `public/index.html` — Browser Play Client

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SMAUG 2.0 — Play</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="mud-client">
    <div id="sidebar">
      <div id="vitals">
        <h3>Vitals</h3>
        <div id="hp-bar" class="bar-container">
          <div class="bar-label">HP</div>
          <div class="bar-fill hp"></div>
          <div class="bar-text"></div>
        </div>
        <div id="mana-bar" class="bar-container">
          <div class="bar-label">Mana</div>
          <div class="bar-fill mana"></div>
          <div class="bar-text"></div>
        </div>
        <div id="move-bar" class="bar-container">
          <div class="bar-label">Move</div>
          <div class="bar-fill move"></div>
          <div class="bar-text"></div>
        </div>
        <div id="room-info">
          <h4 id="room-name"></h4>
          <div id="room-exits"></div>
        </div>
      </div>
      <button id="sidebar-toggle" aria-label="Toggle sidebar">☰</button>
    </div>
    <div id="main-panel">
      <div id="output"></div>
      <div id="input-area">
        <input type="text" id="command-input" placeholder="Enter command..." autocomplete="off" autofocus>
      </div>
    </div>
  </div>
  <script src="/socket.io/socket.io.js"></script>
  <script src="js/client.js"></script>
</body>
</html>
```

### 9. `public/js/client.ts` — Browser Play Client

This file is compiled to `public/js/client.js`. It may be written directly as plain JavaScript if a build step is not desired.

```typescript
/**
 * SMAUG 2.0 Browser Play Client
 *
 * Connects to the game server via Socket.IO and renders the MUD's
 * ANSI-colored text output in a terminal-like interface.
 *
 * Features:
 *   - Socket.IO connection to /play namespace.
 *   - ANSI escape code → HTML/CSS conversion.
 *   - Command input with history (up/down arrows cycle through previous commands).
 *   - Scrollable output area with auto-scroll to bottom.
 *   - GMCP support for structured data (vitals, room info).
 *   - Responsive layout with collapsible sidebar for vitals.
 *   - Pager support (handles pager prompts from the server).
 *
 * ANSI color mapping (from ARCHITECTURE.md §20.3):
 *   - Foreground codes 30-37 → 8 standard colors.
 *   - Bold (code 1) → bright variants of the 8 colors.
 *   - Background codes 40-47 → 8 standard background colors.
 *   - Reset (code 0) → clear all styles.
 *   - Blink (code 5) → CSS animation (subtle glow).
 *
 * The parseAnsi() function scans the text for ANSI escape sequences
 * (\x1b[NNm or \x1b[NN;NNm) and converts each segment into a
 * <span> element with the appropriate inline CSS styles.
 */

(function () {
  'use strict';

  // ─── ANSI Color Tables ────

  const ANSI_COLORS = [
    '#000000', // 0 black
    '#aa0000', // 1 red
    '#00aa00', // 2 green
    '#aa5500', // 3 yellow/brown
    '#0000aa', // 4 blue
    '#aa00aa', // 5 magenta
    '#00aaaa', // 6 cyan
    '#aaaaaa', // 7 white
  ];

  const ANSI_BRIGHT = [
    '#555555', // 0 bright black (dark gray)
    '#ff5555', // 1 bright red
    '#55ff55', // 2 bright green
    '#ffff55', // 3 bright yellow
    '#5555ff', // 4 bright blue
    '#ff55ff', // 5 bright magenta
    '#55ffff', // 6 bright cyan
    '#ffffff', // 7 bright white
  ];

  // ─── ANSI Parser ────

  /**
   * Parse ANSI escape sequences in text and return an array of
   * { text, fg, bg, bold, blink } segments.
   *
   * Handles:
   *   \x1b[0m     — reset
   *   \x1b[1m     — bold
   *   \x1b[5m     — blink
   *   \x1b[30-37m — foreground
   *   \x1b[40-47m — background
   *   \x1b[1;31m  — compound codes (bold + red)
   *
   * Also handles the SMAUG custom color codes (&R, &G, etc.)
   * which are converted to ANSI by the server before sending.
   */
  function parseAnsi(text) {
    const parts = [];
    const regex = /\x1b\[([0-9;]*)m/g;
    let lastIndex = 0;
    let bold = false;
    let fg = null;
    let bg = null;
    let blink = false;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Push text before this escape sequence
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), fg, bg, bold, blink });
      }

      // Process codes
      const codes = match[1].split(';').map(Number);
      for (const code of codes) {
        if (code === 0) { bold = false; fg = null; bg = null; blink = false; }
        else if (code === 1) { bold = true; }
        else if (code === 5) { blink = true; }
        else if (code >= 30 && code <= 37) { fg = code - 30; }
        else if (code >= 40 && code <= 47) { bg = code - 40; }
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last escape
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), fg, bg, bold, blink });
    }

    // If no escapes found, return the whole text
    if (parts.length === 0) {
      parts.push({ text, fg: null, bg: null, bold: false, blink: false });
    }

    return parts;
  }

  /**
   * Render a line of text with ANSI colors as a DOM element.
   */
  function renderLine(text) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'terminal-line';

    const segments = parseAnsi(text);
    for (const seg of segments) {
      if (!seg.text) continue;
      const span = document.createElement('span');
      span.textContent = seg.text;

      let color = null;
      if (seg.fg !== null) {
        color = seg.bold ? ANSI_BRIGHT[seg.fg] : ANSI_COLORS[seg.fg];
      } else if (seg.bold) {
        color = '#ffffff';
      }

      if (color) span.style.color = color;
      if (seg.bg !== null) span.style.backgroundColor = ANSI_COLORS[seg.bg];
      if (seg.blink) span.classList.add('blink');

      lineDiv.appendChild(span);
    }

    return lineDiv;
  }

  // ─── Socket.IO Connection ────

  const socket = io({ path: '/play' });
  const output = document.getElementById('output');
  const input = document.getElementById('command-input');
  const commandHistory = [];
  let historyIndex = -1;

  // Maximum lines in scrollback buffer
  const MAX_LINES = 5000;

  socket.on('connect', () => {
    appendSystemMessage('Connected to SMAUG 2.0.');
  });

  socket.on('disconnect', () => {
    appendSystemMessage('Disconnected from server.');
  });

  socket.on('output', (data) => {
    // Split by newlines and render each line
    const lines = data.split(/\r?\n/);
    for (const line of lines) {
      output.appendChild(renderLine(line));
    }

    // Trim excess lines
    while (output.children.length > MAX_LINES) {
      output.removeChild(output.firstChild);
    }

    // Auto-scroll to bottom
    output.scrollTop = output.scrollHeight;
  });

  // ─── GMCP Support ────

  /**
   * Handle GMCP messages for structured game data.
   * The server sends GMCP as JSON via a dedicated Socket.IO event.
   *
   * Supported GMCP packages:
   *   char.vitals — { hp, maxhp, mana, maxmana, move, maxmove }
   *   room.info   — { name, vnum, exits }
   */
  socket.on('gmcp', (pkg, data) => {
    switch (pkg) {
      case 'char.vitals':
        updateVitals(data);
        break;
      case 'room.info':
        updateRoomInfo(data);
        break;
    }
  });

  function updateVitals(data) {
    updateBar('hp-bar', data.hp, data.maxhp);
    updateBar('mana-bar', data.mana, data.maxmana);
    updateBar('move-bar', data.move, data.maxmove);
  }

  function updateBar(id, current, max) {
    const container = document.getElementById(id);
    if (!container) return;
    const fill = container.querySelector('.bar-fill');
    const text = container.querySelector('.bar-text');
    const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    fill.style.width = pct + '%';
    text.textContent = current + '/' + max;
  }

  function updateRoomInfo(data) {
    const nameEl = document.getElementById('room-name');
    const exitsEl = document.getElementById('room-exits');
    if (nameEl) nameEl.textContent = data.name || '';
    if (exitsEl) exitsEl.textContent = data.exits ? 'Exits: ' + data.exits.join(' ') : '';
  }

  // ─── Input Handling ────

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value;
      if (cmd.trim()) {
        socket.emit('input', cmd + '\n');
        commandHistory.push(cmd);
        // Cap history at 100 entries
        if (commandHistory.length > 100) commandHistory.shift();
        historyIndex = -1;
      } else {
        // Empty enter — still send (for pager, etc.)
        socket.emit('input', '\n');
      }
      input.value = '';
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      if (historyIndex < 0) {
        historyIndex = commandHistory.length - 1;
      } else if (historyIndex > 0) {
        historyIndex--;
      }
      input.value = commandHistory[historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < 0) return;
      historyIndex++;
      if (historyIndex >= commandHistory.length) {
        historyIndex = -1;
        input.value = '';
      } else {
        input.value = commandHistory[historyIndex];
      }
    }
  });

  // Keep focus on input
  document.addEventListener('click', () => { input.focus(); });

  // ─── Sidebar Toggle ────

  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // ─── Helpers ────

  function appendSystemMessage(msg) {
    const div = document.createElement('div');
    div.className = 'terminal-line system-message';
    div.textContent = '>> ' + msg;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }
})();
```

### 10. `public/css/style.css` — Browser Play Client Styles

```css
/**
 * SMAUG 2.0 Browser Play Client Stylesheet
 *
 * Terminal-like dark theme for MUD gameplay.
 * Responsive layout with collapsible sidebar for vitals/room info.
 */

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  height: 100%;
  background: #000;
  color: #aaa;
  font-family: 'Courier New', 'Consolas', 'Lucida Console', monospace;
  font-size: 14px;
  overflow: hidden;
}

#mud-client {
  display: flex;
  height: 100vh;
  width: 100%;
}

/* ─── Sidebar ──── */

#sidebar {
  width: 220px;
  background: #111;
  border-right: 1px solid #333;
  padding: 12px;
  display: flex;
  flex-direction: column;
  transition: width 0.3s, padding 0.3s;
  overflow: hidden;
}

#sidebar.collapsed {
  width: 40px;
  padding: 12px 4px;
}

#sidebar.collapsed #vitals { display: none; }

#sidebar-toggle {
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  text-align: center;
  padding: 4px;
  margin-bottom: 12px;
}

#sidebar-toggle:hover { color: #fff; }

#vitals h3 {
  color: #0f0;
  font-size: 13px;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Vitals bars */
.bar-container {
  margin-bottom: 8px;
  position: relative;
  height: 22px;
  background: #222;
  border: 1px solid #333;
  border-radius: 3px;
  overflow: hidden;
}

.bar-label {
  position: absolute;
  left: 6px;
  top: 2px;
  font-size: 11px;
  color: #888;
  z-index: 2;
}

.bar-fill {
  height: 100%;
  transition: width 0.3s;
  border-radius: 2px;
}

.bar-fill.hp { background: linear-gradient(to right, #800, #f00); }
.bar-fill.mana { background: linear-gradient(to right, #008, #00f); }
.bar-fill.move { background: linear-gradient(to right, #080, #0f0); }

.bar-text {
  position: absolute;
  right: 6px;
  top: 2px;
  font-size: 11px;
  color: #ccc;
  z-index: 2;
}

#room-info {
  margin-top: 16px;
  border-top: 1px solid #333;
  padding-top: 10px;
}

#room-name { color: #ff5; font-size: 13px; margin-bottom: 4px; }
#room-exits { color: #5ff; font-size: 12px; }

/* ─── Main Panel ──── */

#main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

#output {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  line-height: 1.4;
  /* Custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #333 #000;
}

#output::-webkit-scrollbar { width: 8px; }
#output::-webkit-scrollbar-track { background: #000; }
#output::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }

.terminal-line {
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 1.4em;
}

.system-message { color: #ff0; font-style: italic; }

/* Blink effect for ANSI blink code */
.blink {
  animation: blink-animation 1.5s steps(2) infinite;
}

@keyframes blink-animation {
  50% { opacity: 0.3; }
}

/* ─── Input Area ──── */

#input-area {
  padding: 8px 12px;
  background: #111;
  border-top: 1px solid #333;
}

#command-input {
  width: 100%;
  background: #1a1a1a;
  color: #0f0;
  border: 1px solid #333;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 14px;
  border-radius: 4px;
  outline: none;
}

#command-input:focus {
  border-color: #0f0;
  box-shadow: 0 0 4px rgba(0, 255, 0, 0.2);
}

#command-input::placeholder { color: #444; }

/* ─── Responsive ──── */

@media (max-width: 768px) {
  #sidebar {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 10;
    height: 100%;
  }

  #sidebar.collapsed {
    width: 40px;
  }

  #main-panel {
    margin-left: 40px;
  }
}
```

### 11. `src/game/world/WeatherSystem.ts` — Weather and Time

```typescript
import { EventBus, GameEvent } from '../../core/EventBus';
import { AreaManager } from './AreaManager';
import { Area } from '../entities/Area';
import { ConnectionManager } from '../../network/ConnectionManager';
import { Logger } from '../../utils/Logger';
import { Dice } from '../../utils/Dice';

/**
 * Weather and time management system.
 * Replicates legacy weather.c and timezone.c.
 *
 * Time system:
 *   - 24 in-game hours per real-time tick cycle.
 *   - Each game hour = 1 full tick (PULSE_TICK = 280 pulses = 70 seconds real time).
 *   - Track hour, day, month, year.
 *   - Sun position affects room lighting (dark rooms at night unless lit).
 *   - 4 sun positions: dark, sunrise, daylight, sunset.
 *
 * Weather:
 *   - Per-area climate with temperature, precipitation, wind.
 *   - Weather changes on each tick based on area climate settings and season.
 *   - Neighbour area influence: areas geographically adjacent share weather trends.
 *   - Sky conditions: cloudless, cloudy, rainy, lightning.
 *   - Temperature affects comfort messages.
 *   - Wind affects movement messages.
 *
 * Constants from legacy:
 *   HOURS_PER_DAY = 24
 *   DAYS_PER_MONTH = 35
 *   MONTHS_PER_YEAR = 17
 *   Sun positions: DARK (0-4), SUNRISE (5), DAYLIGHT (6-18), SUNSET (19), DARK (20-23)
 */

export const HOURS_PER_DAY = 24;
export const DAYS_PER_MONTH = 35;
export const MONTHS_PER_YEAR = 17;

export enum SunPosition {
  Dark = 0,
  Sunrise = 1,
  Light = 2,
  Sunset = 3,
}

export enum SkyCondition {
  Cloudless = 0,
  Cloudy = 1,
  Rainy = 2,
  Lightning = 3,
}

/**
 * Global game time state.
 */
export interface GameTime {
  hour: number;    // 0–23
  day: number;     // 0–34
  month: number;   // 0–16
  year: number;    // Starting year (typically 300)
}

/**
 * Per-area weather state.
 */
export interface AreaWeather {
  temperature: number;     // -30 to 50 (Celsius-like)
  precipitation: number;   // 0–100
  wind: number;            // 0–100
  sky: SkyCondition;
  change: number;          // Pressure change direction (-10 to +10)
}

export class WeatherSystem {
  private static gameTime: GameTime = { hour: 0, day: 0, month: 0, year: 300 };
  private static sunPosition: SunPosition = SunPosition.Dark;
  private static areaWeather: Map<string, AreaWeather> = new Map();

  /**
   * Initialize the weather system. Called once during boot.
   * Sets the starting time based on real-world clock (or configured start).
   */
  static initialize(): void {
    // Initialize game time — use a deterministic start
    // Legacy starts at year 300, month 0, day 0, hour 6 (sunrise)
    WeatherSystem.gameTime = { hour: 6, day: 0, month: 0, year: 300 };
    WeatherSystem.updateSunPosition();

    // Initialize per-area weather
    for (const area of AreaManager.getAllAreas()) {
      const climate = area.climate ?? { temperature: 20, precipitation: 30, wind: 20 };
      WeatherSystem.areaWeather.set(area.filename, {
        temperature: climate.temperature,
        precipitation: climate.precipitation,
        wind: climate.wind,
        sky: SkyCondition.Cloudless,
        change: 0,
      });
    }

    Logger.info('weather', `Weather initialized. Time: ${WeatherSystem.formatGameTime()}`);
  }

  /**
   * Weather and time update. Called every PULSE_TICK via EventBus.
   *
   * Replicates legacy weather_update() from update.c.
   *
   * Steps:
   *   1. Advance game time by 1 hour.
   *   2. Handle day/month/year rollover.
   *   3. Update sun position and send transition messages to outdoor players.
   *   4. Update weather for each area:
   *      a. Calculate base pressure change from season and time of day.
   *      b. Add randomness (Dice.roll for variation).
   *      c. Apply climate influence (areas tend toward their default climate).
   *      d. Determine sky condition from precipitation level.
   *      e. Send weather change messages to players in the area.
   *   5. Emit GameEvent.WeatherChange.
   */
  static weatherUpdate(): void {
    const oldHour = WeatherSystem.gameTime.hour;

    // Advance time
    WeatherSystem.gameTime.hour++;
    if (WeatherSystem.gameTime.hour >= HOURS_PER_DAY) {
      WeatherSystem.gameTime.hour = 0;
      WeatherSystem.gameTime.day++;
      if (WeatherSystem.gameTime.day >= DAYS_PER_MONTH) {
        WeatherSystem.gameTime.day = 0;
        WeatherSystem.gameTime.month++;
        if (WeatherSystem.gameTime.month >= MONTHS_PER_YEAR) {
          WeatherSystem.gameTime.month = 0;
          WeatherSystem.gameTime.year++;
        }
      }
    }

    // Update sun position
    const oldSun = WeatherSystem.sunPosition;
    WeatherSystem.updateSunPosition();

    // Send sun transition messages to outdoor characters
    if (oldSun !== WeatherSystem.sunPosition) {
      let message = '';
      switch (WeatherSystem.sunPosition) {
        case SunPosition.Sunrise:
          message = 'The sun rises in the east.\r\n';
          break;
        case SunPosition.Light:
          if (oldSun === SunPosition.Sunrise) {
            message = 'The day has begun.\r\n';
          }
          break;
        case SunPosition.Sunset:
          message = 'The sun slowly disappears in the west.\r\n';
          break;
        case SunPosition.Dark:
          if (oldSun === SunPosition.Sunset) {
            message = 'The night has begun.\r\n';
          }
          break;
      }

      if (message) {
        WeatherSystem.sendToOutdoorPlayers(message);
      }
    }

    // Update weather per area
    for (const area of AreaManager.getAllAreas()) {
      const weather = WeatherSystem.areaWeather.get(area.filename);
      if (!weather) continue;

      WeatherSystem.updateAreaWeather(area, weather);
    }

    EventBus.emit(GameEvent.WeatherChange, {
      time: { ...WeatherSystem.gameTime },
      sun: WeatherSystem.sunPosition,
    });
  }

  /**
   * Update weather for a single area.
   */
  private static updateAreaWeather(area: Area, weather: AreaWeather): void {
    const oldSky = weather.sky;
    const climate = area.climate ?? { temperature: 20, precipitation: 30, wind: 20 };

    // Seasonal temperature modifier
    // Months 0-4: winter, 5-8: spring, 9-12: summer, 13-16: autumn
    let seasonTempMod = 0;
    if (WeatherSystem.gameTime.month <= 4) seasonTempMod = -10;
    else if (WeatherSystem.gameTime.month <= 8) seasonTempMod = 0;
    else if (WeatherSystem.gameTime.month <= 12) seasonTempMod = 10;
    else seasonTempMod = 0;

    // Pressure change — random drift
    weather.change += Dice.roll(1, 5) - 3; // -2 to +2
    weather.change = Math.max(-10, Math.min(10, weather.change));

    // Temperature: drift toward climate default + season modifier
    const targetTemp = climate.temperature + seasonTempMod;
    if (weather.temperature < targetTemp) weather.temperature += Dice.roll(1, 3) - 1;
    if (weather.temperature > targetTemp) weather.temperature -= Dice.roll(1, 3) - 1;
    weather.temperature = Math.max(-30, Math.min(50, weather.temperature));

    // Precipitation: drift based on pressure change
    weather.precipitation += weather.change + Dice.roll(1, 5) - 3;
    weather.precipitation = Math.max(0, Math.min(100, weather.precipitation));

    // Wind: random variation around climate default
    weather.wind += Dice.roll(1, 5) - 3;
    const targetWind = climate.wind;
    if (weather.wind < targetWind - 10) weather.wind += 2;
    if (weather.wind > targetWind + 10) weather.wind -= 2;
    weather.wind = Math.max(0, Math.min(100, weather.wind));

    // Determine sky condition from precipitation
    if (weather.precipitation < 20) weather.sky = SkyCondition.Cloudless;
    else if (weather.precipitation < 50) weather.sky = SkyCondition.Cloudy;
    else if (weather.precipitation < 80) weather.sky = SkyCondition.Rainy;
    else weather.sky = SkyCondition.Lightning;

    // Send weather transition messages
    if (oldSky !== weather.sky) {
      let message = '';
      if (oldSky === SkyCondition.Cloudless && weather.sky === SkyCondition.Cloudy) {
        message = 'The sky is getting cloudy.\r\n';
      } else if (oldSky === SkyCondition.Cloudy && weather.sky === SkyCondition.Rainy) {
        message = 'It starts to rain.\r\n';
      } else if (oldSky === SkyCondition.Rainy && weather.sky === SkyCondition.Lightning) {
        message = 'Lightning flashes in the sky.\r\n';
      } else if (weather.sky === SkyCondition.Cloudless) {
        message = 'The clouds disappear.\r\n';
      } else if (oldSky === SkyCondition.Lightning && weather.sky === SkyCondition.Rainy) {
        message = 'The lightning has stopped.\r\n';
      } else if (oldSky === SkyCondition.Rainy && weather.sky === SkyCondition.Cloudy) {
        message = 'The rain stops.\r\n';
      }

      if (message) {
        WeatherSystem.sendToAreaOutdoorPlayers(area, message);
      }
    }
  }

  /**
   * Update sun position based on current hour.
   * Replicates legacy sunlight calculation.
   */
  private static updateSunPosition(): void {
    const hour = WeatherSystem.gameTime.hour;
    if (hour >= 6 && hour < 7) {
      WeatherSystem.sunPosition = SunPosition.Sunrise;
    } else if (hour >= 7 && hour < 19) {
      WeatherSystem.sunPosition = SunPosition.Light;
    } else if (hour >= 19 && hour < 20) {
      WeatherSystem.sunPosition = SunPosition.Sunset;
    } else {
      WeatherSystem.sunPosition = SunPosition.Dark;
    }
  }

  /**
   * Send a message to all outdoor players.
   */
  private static sendToOutdoorPlayers(message: string): void {
    for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
      const ch = desc.character;
      if (ch && ch.inRoom && !ch.inRoom.isIndoors()) {
        ch.sendToChar(message);
      }
    }
  }

  /**
   * Send a message to outdoor players in a specific area.
   */
  private static sendToAreaOutdoorPlayers(area: Area, message: string): void {
    for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
      const ch = desc.character;
      if (ch && ch.inRoom && ch.inRoom.area === area && !ch.inRoom.isIndoors()) {
        ch.sendToChar(message);
      }
    }
  }

  // ─── Query Methods ────

  static getGameTime(): GameTime { return { ...WeatherSystem.gameTime }; }
  static getSunPosition(): SunPosition { return WeatherSystem.sunPosition; }

  static getAreaWeather(areaFilename: string): AreaWeather | null {
    return WeatherSystem.areaWeather.get(areaFilename) ?? null;
  }

  static formatGameTime(): string {
    const t = WeatherSystem.gameTime;
    const MONTH_NAMES = [
      'the Winter Wolf', 'the Frost Giant', 'the Old Forces',
      'the Grand Struggle', 'the Spring', 'Nature',
      'Futility', 'the Dragon', 'the Sun',
      'the Heat', 'the Battle', 'the Dark Shades',
      'the Shadows', 'the Long Shadows', 'the Ancient Darkness',
      'the Great Evil', 'the Alchem',
    ];
    const DAY_NAMES = ['the Moon', 'the Bull', 'Deception', 'Thunder', 'Freedom', 'the Great Gods', 'the Sun'];

    const dayName = DAY_NAMES[t.day % 7];
    const monthName = MONTH_NAMES[t.month] ?? 'Unknown';
    const hourStr = t.hour < 12 ? `${t.hour}am` : t.hour === 12 ? '12pm' : `${t.hour - 12}pm`;

    return `It is ${hourStr} on the Day of ${dayName}, ${t.day + 1}th the Month of ${monthName}, Year ${t.year}.`;
  }

  static getSkyDescription(areaFilename: string): string {
    const weather = WeatherSystem.areaWeather.get(areaFilename);
    if (!weather) return 'The sky is clear.';

    const skyDescs = [
      'The sky is cloudless and clear.',
      'The sky is cloudy and grey.',
      'It is raining.',
      'Lightning flashes across the sky.',
    ];

    let desc = skyDescs[weather.sky] ?? 'The sky is clear.';

    if (weather.temperature < 0) desc += ' It is freezing cold.';
    else if (weather.temperature < 10) desc += ' It is cold.';
    else if (weather.temperature > 35) desc += ' It is very hot.';
    else if (weather.temperature > 25) desc += ' It is warm.';

    if (weather.wind > 70) desc += ' A strong wind blows.';
    else if (weather.wind > 40) desc += ' A breeze blows.';

    return desc;
  }
}

// ─── Player Commands ────

/**
 * doTime — Show current in-game time and date.
 * Replicates legacy do_time() from act_info.c.
 */
export function doTime(ch: any): void {
  ch.sendToChar(WeatherSystem.formatGameTime() + '\r\n');

  const sun = WeatherSystem.getSunPosition();
  const sunNames = ['dark', 'sunrise', 'daylight', 'sunset'];
  ch.sendToChar(`The sun is at ${sunNames[sun]}.\r\n`);
}

/**
 * doWeather — Show current weather conditions in the character's area.
 * Replicates legacy do_weather() from act_info.c.
 */
export function doWeather(ch: any): void {
  if (!ch.inRoom) return;

  if (ch.inRoom.isIndoors()) {
    ch.sendToChar('You can\'t see the weather indoors.\r\n');
    return;
  }

  const areaFile = ch.inRoom.area?.filename;
  if (!areaFile) {
    ch.sendToChar('The weather is unremarkable.\r\n');
    return;
  }

  ch.sendToChar(WeatherSystem.getSkyDescription(areaFile) + '\r\n');
}
```

### 12. `src/game/world/QuestSystem.ts` — Auto-Quest System

```typescript
import { Character } from '../entities/Character';
import { Player } from '../entities/Player';
import { Mobile, MobilePrototype } from '../entities/Mobile';
import { VnumRegistry } from './VnumRegistry';
import { AreaManager } from './AreaManager';
import { ConnectionManager } from '../../network/ConnectionManager';
import { EventBus, GameEvent } from '../../core/EventBus';
import { Logger } from '../../utils/Logger';
import { Dice } from '../../utils/Dice';

/**
 * Auto-quest system. Generates random quests for players.
 * Replicates legacy quest.c.
 *
 * Quest types:
 *   KILL  — Kill a specific mob.
 *   FETCH — Retrieve a specific object from a mob (the mob drops it on death).
 *
 * Quest flow:
 *   1. Player types 'quest request' → system picks a target mob.
 *   2. Player hunts the target and completes the objective.
 *   3. Player returns and types 'quest complete' → rewards granted.
 *   4. Timer: 30 ticks to complete. Expired quests are void.
 *   5. 'quest quit' abandons with a 5-tick cooldown penalty.
 *
 * Rewards:
 *   - Quest Points (QP): 10–30 based on difficulty.
 *   - Gold: ch.level * 20.
 *   - Experience: ch.level * ch.level * 5.
 *   - Practices: 1–3 (random).
 *
 * Quest Point shop:
 *   - 'quest list' shows available QP rewards.
 *   - 'quest buy <item>' spends QP on rewards (practices, gold, stat boosts).
 *
 * Timer management:
 *   - questUpdate() is called every PULSE_TICK.
 *   - Decrements quest timers for all online players.
 *   - Expires overdue quests with a warning message.
 */

export enum QuestType {
  None = 0,
  Kill = 1,
  Fetch = 2,
}

export interface QuestData {
  type: QuestType;
  targetMobVnum: number;    // Vnum of the mob to kill or fetch from
  targetMobName: string;    // Short description for display
  targetAreaName: string;   // Area where the target lives
  targetObjVnum: number;    // For FETCH quests: vnum of the object
  timer: number;            // Ticks remaining
  completed: boolean;       // Whether the objective has been met
}

/**
 * Default quest timer in ticks.
 */
const QUEST_TIMER = 30;

/**
 * Cooldown after abandoning a quest (in ticks).
 */
const QUEST_COOLDOWN = 5;

export class QuestSystem {
  /**
   * Handle the 'quest' command with subcommands.
   * Syntax:
   *   quest request   — Generate a new quest.
   *   quest complete  — Turn in a completed quest.
   *   quest quit      — Abandon the current quest.
   *   quest info      — Show current quest details.
   *   quest list      — Show quest point shop.
   *   quest buy <item> — Buy a reward with quest points.
   *   quest points    — Show current QP balance.
   *
   * Replicates legacy do_quest() from quest.c.
   */
  static doQuest(ch: Character, argument: string): void {
    const player = ch as Player;
    if (!player.pcData) {
      ch.sendToChar('Only players can quest.\r\n');
      return;
    }

    const [subCmd, rest] = splitArgs(argument);

    switch (subCmd.toLowerCase()) {
      case 'request':
        QuestSystem.questRequest(player);
        break;
      case 'complete':
        QuestSystem.questComplete(player);
        break;
      case 'quit':
        QuestSystem.questQuit(player);
        break;
      case 'info':
        QuestSystem.questInfo(player);
        break;
      case 'list':
        QuestSystem.questList(player);
        break;
      case 'buy':
        QuestSystem.questBuy(player, rest.trim());
        break;
      case 'points':
        ch.sendToChar(`You have ${player.pcData.questPoints} quest points.\r\n`);
        break;
      default:
        ch.sendToChar('Quest commands: request, complete, quit, info, list, buy, points.\r\n');
        break;
    }
  }

  /**
   * Generate a random quest for the player.
   *
   * Target mob selection:
   *   1. Gather all mobile prototypes within ch.level ± 5 range.
   *   2. Exclude mobs in the same area as the player (quest should require travel).
   *   3. Exclude mobs with ACT_SENTINEL or ACT_PET flags.
   *   4. Pick one at random.
   *   5. Quest type: 70% kill, 30% fetch.
   */
  private static questRequest(player: Player): void {
    if (player.pcData.quest && player.pcData.quest.type !== QuestType.None) {
      player.sendToChar('You already have an active quest. Complete it or quit first.\r\n');
      return;
    }

    if (player.pcData.nextQuestTimer > 0) {
      player.sendToChar(`You must wait ${player.pcData.nextQuestTimer} more ticks before requesting a new quest.\r\n`);
      return;
    }

    // Gather eligible mob prototypes
    const minLevel = Math.max(1, player.level - 5);
    const maxLevel = player.level + 5;
    const playerArea = player.inRoom?.area;

    const candidates: MobilePrototype[] = [];
    for (const proto of VnumRegistry.getAllMobilePrototypes()) {
      if (proto.level < minLevel || proto.level > maxLevel) continue;
      // Must be in a different area
      const mobArea = AreaManager.findAreaByVnum(proto.vnum, 'mobile');
      if (mobArea === playerArea) continue;
      // Exclude sentinels and pets (less interesting targets)
      if (proto.actFlags & ACT_SENTINEL) continue;
      if (proto.actFlags & ACT_PET) continue;
      candidates.push(proto);
    }

    if (candidates.length === 0) {
      player.sendToChar('No suitable quest targets could be found. Try again later.\r\n');
      return;
    }

    const target = candidates[Dice.roll(1, candidates.length) - 1];
    const targetArea = AreaManager.findAreaByVnum(target.vnum, 'mobile');
    const questType = Dice.roll(1, 10) <= 7 ? QuestType.Kill : QuestType.Fetch;

    player.pcData.quest = {
      type: questType,
      targetMobVnum: target.vnum,
      targetMobName: target.shortDescription,
      targetAreaName: targetArea?.name ?? 'unknown',
      targetObjVnum: 0, // For fetch quests, would reference a virtual quest token
      timer: QUEST_TIMER,
      completed: false,
    };

    if (questType === QuestType.Kill) {
      player.sendToChar(`&YQUEST: &wKill &c${target.shortDescription}&w in &c${player.pcData.quest.targetAreaName}&w.\r\n`);
      player.sendToChar(`You have ${QUEST_TIMER} ticks to complete this quest.\r\n`);
    } else {
      player.sendToChar(`&YQUEST: &wRetrieve an item from &c${target.shortDescription}&w in &c${player.pcData.quest.targetAreaName}&w.\r\n`);
      player.sendToChar(`You have ${QUEST_TIMER} ticks to complete this quest.\r\n`);
    }

    Logger.info('quest', `${player.name} received quest: ${questType === QuestType.Kill ? 'KILL' : 'FETCH'} ${target.shortDescription} (${target.vnum})`);
  }

  /**
   * Complete a quest and award rewards.
   *
   * Verification:
   *   For KILL quests: check that the target mob vnum is in the player's
   *   recent kill list (set by DeathHandler when a quest target dies).
   *   For FETCH quests: check that the player is carrying the quest object.
   *
   * Rewards:
   *   QP: 10 + (target level - player level) * 2, minimum 5, max 30.
   *   Gold: player.level * 20.
   *   XP: player.level * player.level * 5.
   *   Practices: Dice.roll(1, 3).
   */
  private static questComplete(player: Player): void {
    if (!player.pcData.quest || player.pcData.quest.type === QuestType.None) {
      player.sendToChar('You don\'t have an active quest.\r\n');
      return;
    }

    const quest = player.pcData.quest;

    if (!quest.completed) {
      // Check if objective is met
      if (quest.type === QuestType.Kill) {
        if (!player.pcData.recentKills?.includes(quest.targetMobVnum)) {
          player.sendToChar(`You haven't killed ${quest.targetMobName} yet.\r\n`);
          return;
        }
      } else if (quest.type === QuestType.Fetch) {
        // Check inventory for quest object
        const hasObj = player.carrying.some(o => o.vnum === quest.targetObjVnum);
        if (!hasObj) {
          player.sendToChar(`You don't have the quest item yet.\r\n`);
          return;
        }
      }

      quest.completed = true;
    }

    // Calculate rewards
    const targetProto = VnumRegistry.getMobilePrototype(quest.targetMobVnum);
    const levelDiff = (targetProto?.level ?? player.level) - player.level;
    const qp = Math.max(5, Math.min(30, 10 + levelDiff * 2));
    const gold = player.level * 20;
    const xp = player.level * player.level * 5;
    const practices = Dice.roll(1, 3);

    player.pcData.questPoints += qp;
    player.gold += gold;
    player.gainXp(xp);
    player.pcData.practice += practices;

    player.sendToChar(`&YQUEST COMPLETE!&w\r\n`);
    player.sendToChar(`Rewards: &Y${qp} QP&w, &Y${gold} gold&w, &Y${xp} XP&w, &Y${practices} practice(s)&w.\r\n`);

    // Clear quest
    player.pcData.quest = { type: QuestType.None, targetMobVnum: 0, targetMobName: '', targetAreaName: '', targetObjVnum: 0, timer: 0, completed: false };
    player.pcData.nextQuestTimer = 0;

    // Clear recent kills tracking for this mob
    if (player.pcData.recentKills) {
      const idx = player.pcData.recentKills.indexOf(quest.targetMobVnum);
      if (idx >= 0) player.pcData.recentKills.splice(idx, 1);
    }

    Logger.info('quest', `${player.name} completed quest for ${quest.targetMobName}: ${qp} QP, ${gold} gold, ${xp} XP`);
  }

  /**
   * Abandon the current quest. Incurs a cooldown penalty.
   */
  private static questQuit(player: Player): void {
    if (!player.pcData.quest || player.pcData.quest.type === QuestType.None) {
      player.sendToChar('You don\'t have an active quest.\r\n');
      return;
    }

    player.sendToChar('You abandon your quest.\r\n');
    player.pcData.quest = { type: QuestType.None, targetMobVnum: 0, targetMobName: '', targetAreaName: '', targetObjVnum: 0, timer: 0, completed: false };
    player.pcData.nextQuestTimer = QUEST_COOLDOWN;
    player.sendToChar(`You must wait ${QUEST_COOLDOWN} ticks before requesting a new quest.\r\n`);
  }

  /**
   * Show current quest details.
   */
  private static questInfo(player: Player): void {
    if (!player.pcData.quest || player.pcData.quest.type === QuestType.None) {
      player.sendToChar('You don\'t have an active quest.\r\n');
      return;
    }

    const q = player.pcData.quest;
    const typeStr = q.type === QuestType.Kill ? 'Kill' : 'Retrieve an item from';
    player.sendToChar(`&YQUEST: &w${typeStr} &c${q.targetMobName}&w in &c${q.targetAreaName}&w.\r\n`);
    player.sendToChar(`Time remaining: ${q.timer} ticks.\r\n`);
    player.sendToChar(`Status: ${q.completed ? '&GCOMPLETED — use \'quest complete\' to turn in.&w' : '&RIn progress.&w'}\r\n`);
  }

  /**
   * Show available quest point rewards.
   */
  private static questList(player: Player): void {
    player.sendToChar('&c--- Quest Point Rewards ---&w\r\n');
    player.sendToChar('  1. 500 gold          — 5 QP\r\n');
    player.sendToChar('  2. 1 practice        — 10 QP\r\n');
    player.sendToChar('  3. 5 practices       — 40 QP\r\n');
    player.sendToChar('  4. +10 max HP        — 50 QP\r\n');
    player.sendToChar('  5. +10 max mana      — 50 QP\r\n');
    player.sendToChar('  6. +10 max move      — 50 QP\r\n');
    player.sendToChar('  7. 1 train session   — 75 QP\r\n');
    player.sendToChar(`\r\nYou have &Y${player.pcData.questPoints}&w quest points.\r\n`);
    player.sendToChar('Usage: quest buy <number>\r\n');
  }

  /**
   * Buy a reward with quest points.
   */
  private static questBuy(player: Player, item: string): void {
    const num = parseInt(item, 10);
    const qp = player.pcData.questPoints;

    const rewards: { cost: number; apply: () => void; desc: string }[] = [
      { cost: 5,  apply: () => { player.gold += 500; }, desc: '500 gold' },
      { cost: 10, apply: () => { player.pcData.practice += 1; }, desc: '1 practice' },
      { cost: 40, apply: () => { player.pcData.practice += 5; }, desc: '5 practices' },
      { cost: 50, apply: () => { player.maxHitPoints += 10; player.hitPoints += 10; }, desc: '+10 max HP' },
      { cost: 50, apply: () => { player.maxMana += 10; player.mana += 10; }, desc: '+10 max mana' },
      { cost: 50, apply: () => { player.maxMove += 10; player.move += 10; }, desc: '+10 max move' },
      { cost: 75, apply: () => { player.pcData.train += 1; }, desc: '1 train session' },
    ];

    if (isNaN(num) || num < 1 || num > rewards.length) {
      player.sendToChar('Invalid item. Use \'quest list\' to see options.\r\n');
      return;
    }

    const reward = rewards[num - 1];
    if (qp < reward.cost) {
      player.sendToChar(`You need ${reward.cost} QP but only have ${qp}.\r\n`);
      return;
    }

    player.pcData.questPoints -= reward.cost;
    reward.apply();
    player.sendToChar(`You purchased: ${reward.desc} for ${reward.cost} QP.\r\n`);
  }

  /**
   * Quest timer update. Called every PULSE_TICK via EventBus.
   * Decrements quest timers and cooldowns for all online players.
   * Expires overdue quests.
   */
  static questUpdate(): void {
    for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
      const player = desc.character as Player;
      if (!player?.pcData) continue;

      // Decrement quest cooldown
      if (player.pcData.nextQuestTimer > 0) {
        player.pcData.nextQuestTimer--;
      }

      // Decrement active quest timer
      if (player.pcData.quest && player.pcData.quest.type !== QuestType.None) {
        player.pcData.quest.timer--;

        if (player.pcData.quest.timer <= 0) {
          player.sendToChar('&RYour quest has expired!&w\r\n');
          player.pcData.quest = {
            type: QuestType.None, targetMobVnum: 0, targetMobName: '',
            targetAreaName: '', targetObjVnum: 0, timer: 0, completed: false,
          };
          player.pcData.nextQuestTimer = QUEST_COOLDOWN;
        } else if (player.pcData.quest.timer === 5) {
          player.sendToChar('&YWarning: Only 5 ticks remaining on your quest!&w\r\n');
        }
      }
    }
  }
}

// ─── Helper ────

function splitArgs(str: string): [string, string] {
  const trimmed = str.trim();
  const idx = trimmed.indexOf(' ');
  if (idx < 0) return [trimmed, ''];
  return [trimmed.substring(0, idx), trimmed.substring(idx + 1)];
}

// ─── ACT flag stubs for quest filtering ────
const ACT_SENTINEL = 1n << 1n;
const ACT_PET = 1n << 6n;
```

### 13. `src/main.ts` Updates — Wire Everything Together

```typescript
/**
 * main.ts integration additions for Sub-Phase 3T.
 *
 * Add the following to the existing boot sequence in main.ts:
 *
 * 1. Import and initialize the admin modules:
 *    - AuthController with JWT_SECRET from environment
 *    - MonitoringController with gameLoop and connectionMgr references
 *    - BanSystem.getInstance().load() to load persisted bans
 *
 * 2. Create the Express app and wire up routes:
 *    - express.json() middleware for parsing request bodies
 *    - createAdminRouter() mounted at /api
 *    - configureDashboardRoutes() for static file serving
 *
 * 3. Wire the Express app into the HTTP server:
 *    - httpServer = createServer(expressApp)
 *    - Socket.IO attached to the same HTTP server
 *
 * 4. Initialize weather system:
 *    - WeatherSystem.initialize()
 *    - EventBus.on(GameEvent.FullTick, WeatherSystem.weatherUpdate)
 *
 * 5. Initialize quest system:
 *    - EventBus.on(GameEvent.FullTick, QuestSystem.questUpdate)
 *    - Register 'quest' command in CommandRegistry
 *    - Register 'time' and 'weather' commands
 *
 * 6. Register all Phase 3S commands:
 *    - registerImmortalCommands()
 *    - registerOlcCommands()
 *
 * Example boot sequence addition:
 */

// --- In main.ts boot function ---

/*
import express from 'express';
import { createServer } from 'http';
import { AuthController } from './admin/AuthController';
import { MonitoringController } from './admin/MonitoringController';
import { createAdminRouter } from './admin/AdminRouter';
import { configureDashboardRoutes } from './admin/DashboardUI';
import { BanSystem } from './admin/BanSystem';
import { WeatherSystem, doTime, doWeather } from './game/world/WeatherSystem';
import { QuestSystem } from './game/world/QuestSystem';
import { registerImmortalCommands } from './game/commands/immortal';
import { registerOlcCommands } from './game/commands/olc';

// Express app
const app = express();
app.use(express.json());

// Auth
const jwtSecret = process.env.JWT_SECRET || 'smaug-2-secret-change-me';
const authController = new AuthController(jwtSecret);

// Monitoring
const monitoringController = new MonitoringController(gameLoop, connectionMgr);

// Ban system
BanSystem.getInstance().load();

// Admin API
const adminRouter = createAdminRouter(authController, monitoringController, connectionMgr, BanSystem.getInstance());
app.use('/api', adminRouter);

// Dashboard and browser client static files
configureDashboardRoutes(app);

// HTTP server with Express
const httpServer = createServer(app);

// Socket.IO on same server
const io = new SocketIOServer(httpServer, { path: '/play', cors: { origin: '*' } });

// ... existing Socket.IO connection handling ...

// Weather & Time
WeatherSystem.initialize();
EventBus.on(GameEvent.FullTick, () => WeatherSystem.weatherUpdate());

// Quest system
EventBus.on(GameEvent.FullTick, () => QuestSystem.questUpdate());

// Register commands
registerImmortalCommands();
registerOlcCommands();
CommandRegistry.register('quest',   QuestSystem.doQuest,  0, Position.Resting, LOG_NORMAL);
CommandRegistry.register('time',    doTime,               0, Position.Dead,    LOG_NORMAL);
CommandRegistry.register('weather', doWeather,            0, Position.Resting, LOG_NORMAL);

// Ban check in ConnectionManager during connection acceptance
connectionMgr.onNewConnection((desc) => {
  const ban = BanSystem.getInstance().checkBan(desc.host ?? '', 0);
  if (ban && ban.flagType !== 'warn') {
    desc.send('Your site has been banned.\r\n');
    desc.close();
    return false;
  }
  if (ban && ban.flagType === 'warn') {
    Logger.info('ban', `WARNING: Connection from banned site ${desc.host} (warn only)`);
  }
  return true;
});

// Start listening
httpServer.listen(config.port, () => {
  Logger.info('main', `SMAUG 2.0 listening on port ${config.port}`);
  Logger.info('main', `Admin dashboard: http://localhost:${config.port}/admin`);
  Logger.info('main', `Browser client: http://localhost:${config.port}`);
});
*/
```

---

## Tests for Sub-Phase 3T

### `tests/integration/AdminAPI.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// import supertest from 'supertest'; // or use fetch
// import { createAdminRouter, ... } from test setup

describe('Admin REST API', () => {
  describe('POST /api/auth/login', () => {
    it('should return JWT token for valid immortal credentials', async () => {
      // POST with valid name/password for a trust >= 51 player
      // Verify response has { token, trust }
      // Verify token is a valid JWT
    });

    it('should reject mortal credentials (trust < 51)', async () => {
      // POST with valid name/password but trust 0
      // Verify 401 response
    });

    it('should reject invalid password', async () => {
      // POST with wrong password
      // Verify 401 response
    });

    it('should reject non-existent player', async () => {
      // POST with unknown name
      // Verify 40
1 response
    });
  });

  describe('GET /api/dashboard', () => {
    it('should return server stats with valid token', async () => {
      // GET with Authorization: Bearer <token>
      // Verify response contains uptime, onlinePlayers, areaCount, memoryUsage, etc.
    });

    it('should reject request without token', async () => {
      // GET without Authorization header
      // Verify 401 response
    });

    it('should reject expired/invalid token', async () => {
      // GET with malformed token
      // Verify 401 response
    });
  });

  describe('GET /api/players', () => {
    it('should return online player list', async () => {
      // Verify response is an array with player objects
      // Each player should have: name, level, class, race, room, idle, host
    });
  });

  describe('POST /api/players/:name/freeze', () => {
    it('should toggle freeze on a player', async () => {
      // POST to freeze endpoint
      // Verify response { success: true, frozen: true/false }
    });

    it('should require trust >= 55', async () => {
      // Use a token with trust 51
      // Verify 403 response
    });
  });

  describe('POST /api/players/:name/disconnect', () => {
    it('should disconnect a player', async () => {
      // POST to disconnect endpoint
      // Verify response { success: true }
      // Verify player is no longer in online list
    });
  });

  describe('POST /api/players/:name/advance', () => {
    it('should set player level', async () => {
      // POST { level: 30 }
      // Verify response { success: true, newLevel: 30 }
    });

    it('should reject invalid level', async () => {
      // POST { level: 100 }
      // Verify 400 response
    });
  });

  describe('GET /api/areas', () => {
    it('should return area list with metadata', async () => {
      // Verify response is an array
      // Each area has: name, author, lowVnum, highVnum, roomCount, etc.
    });
  });

  describe('POST /api/areas/:name/reset', () => {
    it('should force area reset', async () => {
      // POST to reset endpoint
      // Verify response { success: true }
    });
  });

  describe('Ban CRUD', () => {
    it('should create a ban via POST /api/bans', async () => {
      // POST { site: '192.168.*', type: 'all', duration: -1 }
      // Verify success
    });

    it('should list bans via GET /api/bans', async () => {
      // Verify the ban appears in the list
    });

    it('should remove a ban via DELETE /api/bans/:id', async () => {
      // DELETE the ban
      // Verify it no longer appears in list
    });
  });

  describe('GET /api/logs', () => {
    it('should return audit logs', async () => {
      // Verify response is an array of log entries
      // Each entry has: actor, action, detail, timestamp
    });

    it('should filter by actor', async () => {
      // GET /api/logs?actor=Admin
      // Verify all results have actor === 'Admin'
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 after exceeding rate limit', async () => {
      // Send 101 requests in rapid succession
      // Verify the 101st returns 429
    });
  });
});
```

### `tests/unit/weather.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
// import { WeatherSystem, SunPosition, SkyCondition } from '../../src/game/world/WeatherSystem';

describe('WeatherSystem', () => {
  describe('Time advancement', () => {
    it('should advance hour on each weatherUpdate call', () => {
      // Initialize at hour 0
      // Call weatherUpdate()
      // Verify hour is now 1
    });

    it('should roll over day when hour reaches 24', () => {
      // Set hour to 23, call weatherUpdate()
      // Verify hour is 0, day incremented
    });

    it('should roll over month when day reaches 35', () => {
      // Set day to 34, hour to 23
      // Call weatherUpdate()
      // Verify day is 0, month incremented
    });

    it('should roll over year when month reaches 17', () => {
      // Set month to 16, day to 34, hour to 23
      // Call weatherUpdate()
      // Verify month is 0, year incremented
    });
  });

  describe('Sun position', () => {
    it('should be Dark for hours 0-4 and 20-23', () => {
      // Verify getSunPosition() returns Dark
    });

    it('should be Sunrise at hour 5-6', () => {
      // Verify getSunPosition() returns Sunrise
    });

    it('should be Light for hours 7-18', () => {
      // Verify getSunPosition() returns Light
    });

    it('should be Sunset at hour 19', () => {
      // Verify getSunPosition() returns Sunset
    });
  });

  describe('Weather changes', () => {
    it('should change sky condition based on precipitation', () => {
      // Force precipitation to 0 — should be cloudless
      // Force precipitation to 80 — should be lightning
    });

    it('should generate weather description string', () => {
      // Verify getSkyDescription returns non-empty string
    });
  });

  describe('formatGameTime', () => {
    it('should produce a readable time string', () => {
      // Verify includes hour, day name, month name, year
    });
  });
});
```

### `tests/unit/quest.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
// import { QuestSystem, QuestType } from '../../src/game/world/QuestSystem';
// import mock helpers

describe('QuestSystem', () => {
  describe('quest request', () => {
    it('should generate a quest with valid target mob', () => {
      // Call doQuest(player, 'request')
      // Verify player.pcData.quest.type !== QuestType.None
      // Verify target mob level is within ±5 of player level
    });

    it('should refuse if player already has an active quest', () => {
      // Set up active quest, call request again
      // Verify error message
    });

    it('should enforce cooldown after abandoning', () => {
      // Set nextQuestTimer > 0, call request
      // Verify cooldown message
    });
  });

  describe('quest complete', () => {
    it('should award QP, gold, XP, and practices on completion', () => {
      // Set up completed quest (target in recentKills)
      // Call doQuest(player, 'complete')
      // Verify QP, gold, XP increased
    });

    it('should refuse if objective not met', () => {
      // Set up active kill quest, don't add to recentKills
      // Verify "haven't killed" message
    });
  });

  describe('quest quit', () => {
    it('should clear quest and set cooldown', () => {
      // Call doQuest(player, 'quit')
      // Verify quest cleared, nextQuestTimer === QUEST_COOLDOWN
    });
  });

  describe('quest buy', () => {
    it('should deduct QP and apply reward', () => {
      // Set QP to 50, buy +10 HP
      // Verify QP decreased, maxHitPoints increased
    });

    it('should refuse if insufficient QP', () => {
      // Set QP to 0, try buy
      // Verify error message
    });
  });

  describe('questUpdate', () => {
    it('should decrement quest timer each tick', () => {
      // Set timer to 10, call questUpdate()
      // Verify timer is now 9
    });

    it('should expire quest when timer reaches 0', () => {
      // Set timer to 1, call questUpdate()
      // Verify quest type is None, cooldown set
    });

    it('should warn at 5 ticks remaining', () => {
      // Set timer to 6, call questUpdate()
      // Verify warning message sent
    });
  });
});
```

### `tests/e2e/PlayerLogin.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
// End-to-end test: full login flow via WebSocket

describe('Player Login E2E', () => {
  it('should complete full character creation and login flow', async () => {
    // 1. Connect via Socket.IO to /play
    // 2. Receive welcome/name prompt
    // 3. Send new character name
    // 4. Receive password prompt, send password
    // 5. Confirm password
    // 6. Choose race, class, sex
    // 7. Read MOTD, press enter
    // 8. Verify character is in game (receives room description)
    // 9. Send 'north' — verify movement
    // 10. Send 'look' — verify room display
    // 11. Send 'quit' — verify save message
    // 12. Verify player data persisted in database
  });
});
```

### `tests/e2e/CombatScenario.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
// End-to-end test: full combat scenario

describe('Combat Scenario E2E', () => {
  it('should complete a full combat encounter', async () => {
    // 1. Connect and login
    // 2. Walk to a room with a mob (via movement commands)
    // 3. Send 'kill <mob>'
    // 4. Verify violence_update fires (receive combat round messages)
    // 5. Send 'kick' — verify skill execution
    // 6. Send 'cast magic missile <mob>' — verify spell
    // 7. Continue until mob dies
    // 8. Verify XP gained (check score)
    // 9. Send 'get all corpse' — verify item pickup
    // 10. Verify item in inventory
  });
});
```

### `tests/e2e/ShopTransaction.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
// End-to-end test: shop interaction

describe('Shop Transaction E2E', () => {
  it('should complete a buy/sell transaction at a shop', async () => {
    // 1. Connect and login
    // 2. Walk to a shop room
    // 3. Send 'list' — verify shop inventory displayed
    // 4. Send 'buy sword' — verify gold deducted, sword in inventory
    // 5. Send 'sell sword' — verify gold received, sword removed
  });
});
```

---

## Acceptance Criteria

### REST API & Authentication
- [ ] `POST /api/auth/login` with valid immortal credentials returns a JWT token with `{ token, trust }`.
- [ ] `POST /api/auth/login` with mortal credentials (trust < 51) returns 401.
- [ ] `POST /api/auth/login` with wrong password returns 401.
- [ ] All `/api/*` endpoints (except login) return 401 without a valid Bearer token.
- [ ] Endpoints with trust requirements return 403 for insufficient trust levels.
- [ ] Rate limiter returns 429 after 100 requests per minute from the same IP.

### Dashboard API
- [ ] `GET /api/dashboard` returns correct uptime, player count, area count, memory usage, pulse, and average tick time.
- [ ] `GET /api/players` returns the list of online players with name, level, class, race, room, idle, and host.
- [ ] `POST /api/players/:name/freeze` toggles freeze flag on the player.
- [ ] `POST /api/players/:name/disconnect` force-disconnects the player after saving.
- [ ] `POST /api/players/:name/advance` sets player level (trust 58+ required).
- [ ] `GET /api/areas` returns all areas with metadata (name, author, vnums, room/mob/obj counts, age).
- [ ] `GET /api/areas/:name` returns detailed area data including room list, mob list, and object list.
- [ ] `POST /api/areas/:name/reset` forces an area reset.
- [ ] `GET /api/bans` returns the current ban list. `POST /api/bans` creates a ban. `DELETE /api/bans/:id` removes one.
- [ ] `GET /api/logs` returns audit log entries, filterable by actor, action, date range, and limit.
- [ ] `POST /api/system/reboot` and `POST /api/system/shutdown` trigger the respective events (trust 58+ required).
- [ ] All admin API actions are audit-logged in the Prisma `AuditLog` table.

### Admin Dashboard UI
- [ ] Dashboard login page authenticates and stores JWT in localStorage.
- [ ] Dashboard page shows server stats (uptime, player count, memory, areas, pulse) and auto-refreshes every 5 seconds.
- [ ] Players page lists online players with freeze/disconnect action buttons.
- [ ] Areas page lists all areas with room/mob/obj counts and reset button.
- [ ] Bans page shows ban list with add/remove controls.
- [ ] Logs page displays searchable, filterable audit log entries.
- [ ] Logout clears token and returns to login page.

### Browser Play Client
- [ ] Browser client connects via Socket.IO to the `/play` path.
- [ ] ANSI color codes are correctly rendered as styled `<span>` elements (foreground, background, bold, blink).
- [ ] Command input field captures text and sends it to the server on Enter.
- [ ] Up/down arrow keys cycle through command history (up to 100 entries).
- [ ] Output area auto-scrolls to bottom on new content. Scrollback buffer capped at 5000 lines.
- [ ] GMCP `char.vitals` updates HP/mana/move bars in the sidebar.
- [ ] GMCP `room.info` updates room name and exits in the sidebar.
- [ ] Sidebar is collapsible on mobile (≤768px viewport).
- [ ] Empty Enter sends `\n` to the server (for pager interaction).
- [ ] System messages (connected/disconnected) display in yellow italics.

### Weather System
- [ ] Game time advances by 1 hour per PULSE_TICK. Day/month/year roll over correctly.
- [ ] Sun position transitions at correct hours: Dark (0-4, 20-23), Sunrise (5-6), Light (7-18), Sunset (19).
- [ ] Sun transition messages ("The sun rises in the east.") are sent only to outdoor characters.
- [ ] Weather changes per area based on climate settings, season, and random variation.
- [ ] Sky condition transitions (cloudless → cloudy → rainy → lightning) generate messages to outdoor characters in the area.
- [ ] `time` command displays formatted game time with day name, month name, and year.
- [ ] `weather` command displays sky condition, temperature, and wind for the current area. Refuses indoors.

### Quest System
- [ ] `quest request` generates a level-appropriate quest targeting a mob in a different area.
- [ ] Kill quest: verified by checking recent kills list. Fetch quest: verified by checking inventory.
- [ ] `quest complete` awards QP (5–30), gold (level × 20), XP (level² × 5), and practices (1–3).
- [ ] `quest quit` abandons the quest and sets a 5-tick cooldown.
- [ ] `quest info` displays quest target, area, type, time remaining, and completion status.
- [ ] `quest list` shows available QP rewards with costs. `quest buy` deducts QP and applies the reward.
- [ ] Quest timer decrements each tick. Expired quests are voided with a warning at 5 ticks.
- [ ] Quest cooldown is enforced — cannot request a new quest during cooldown.

### Final Integration
- [ ] Server boots cleanly: loads areas, registers all commands (including immortal, OLC, quest, time, weather), opens WebSocket/Socket.IO listeners, initializes weather.
- [ ] Admin dashboard accessible at `/admin`, browser client at `/`.
- [ ] A player can connect via the browser client and perform all game actions with ANSI colors rendered correctly.
- [ ] An immortal can log in, use OLC, authorize players, ban sites, and view the admin dashboard.
- [ ] Ban system checks are enforced during new connections.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
- [ ] ESLint passes with zero warnings.
- [ ] The game is fully functional — identical to legacy SMAUG 2.0 in combat timing, movement costs, spell effects, and command responsiveness.
