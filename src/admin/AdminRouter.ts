/**
 * AdminRouter – Express router for the admin REST API.
 *
 * Mounts endpoints for authentication, player management, server status,
 * area management, ban CRUD, audit logs, and system operations.
 * All routes (except /api/auth/login) require JWT authentication
 * with trust >= LEVEL_NEOPHYTE (51). Higher trust needed for some endpoints.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { AuthController, type AdminTokenPayload } from './AuthController.js';
import { MonitoringController } from './MonitoringController.js';
import { BanSystem, type BanEntry } from './BanSystem.js';
import { TRUST_LEVELS } from './TrustLevels.js';
import { Logger } from '../utils/Logger.js';

const LOG_DOMAIN = 'admin-api';

// =============================================================================
// Types
// =============================================================================

/** JWT payload shape for admin tokens (re-exported for consumers). */
export interface AdminJwtPayload extends AdminTokenPayload {}

/** Extend Express Request with admin payload. */
export interface AdminRequest extends Request {
  admin?: AdminJwtPayload;
}

/** Online player info returned by the players endpoint. */
export interface OnlinePlayerInfo {
  name: string;
  level: number;
  class: string;
  race: string;
  roomVnum: number;
  idleTime: number;
  host: string;
}

/** Provider for online player data — injected to avoid coupling. */
export interface PlayerInfoProvider {
  getOnlinePlayers: () => OnlinePlayerInfo[];
  freezePlayer: (name: string) => boolean;
  disconnectPlayer: (name: string) => boolean;
  advancePlayer: (name: string, level: number) => boolean;
}

/** Provider for area data. */
export interface AreaInfoProvider {
  getAreaList: () => Array<{
    name: string;
    author: string;
    vnumRanges: { rooms: { low: number; high: number }; mobiles: { low: number; high: number }; objects: { low: number; high: number } };
    age: number;
    resetFrequency: number;
    playerCount: number;
  }>;
  getAreaDetail: (name: string) => unknown | null;
  resetArea: (name: string) => boolean;
}

/** System operations provider. */
export interface SystemOpsProvider {
  reboot: () => void;
  shutdown: (save: boolean) => void;
}

// =============================================================================
// Rate Limiter (simple in-memory)
// =============================================================================

interface RateBucket {
  count: number;
  resetAt: number;
}

const RATE_LIMIT = 100;          // requests per window
const RATE_WINDOW_MS = 60_000;   // 1 minute window

const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateBuckets.set(ip, bucket);
  }

  bucket.count++;
  return bucket.count <= RATE_LIMIT;
}

/** Clear rate limiter state (for testing). */
export function clearRateLimits(): void {
  rateBuckets.clear();
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * JWT authentication middleware.
 * Verifies the token and attaches the payload to req.admin.
 */
function jwtMiddleware(authController: AuthController) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = authController.verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    if (payload.trust < TRUST_LEVELS.NEOPHYTE) {
      res.status(403).json({ error: `Insufficient trust level (requires >= ${TRUST_LEVELS.NEOPHYTE})` });
      return;
    }

    req.admin = payload;
    next();
  };
}

/**
 * Trust-level gating middleware factory.
 * Returns middleware that rejects requests below the specified trust level.
 */
function requireTrust(minTrust: number) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    if (!req.admin || req.admin.trust < minTrust) {
      res.status(403).json({ error: `This action requires trust level >= ${minTrust}` });
      return;
    }
    next();
  };
}

/**
 * Rate limiting middleware.
 */
function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: 'Rate limit exceeded. Try again in a minute.' });
    return;
  }
  next();
}

// =============================================================================
// Router Factory
// =============================================================================

export interface AdminRouterDeps {
  authController: AuthController;
  monitoringController: MonitoringController;
  banSystem: BanSystem;
  playerInfo: PlayerInfoProvider;
  areaInfo: AreaInfoProvider;
  systemOps: SystemOpsProvider;
  logger?: Logger;
}

/**
 * Create the admin Express router with all endpoints.
 */
/** Extract IP from request, always returns a string. */
function getIp(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? '') as string;
}

/** Safe param extraction — always returns string. */
function param(req: Request, key: string): string {
  return (req.params[key] ?? '') as string;
}

export function createAdminRouter(deps: AdminRouterDeps): Router {
  const {
    authController,
    monitoringController,
    banSystem,
    playerInfo,
    areaInfo,
    systemOps,
    logger,
  } = deps;

  const router = Router();

  // Rate limiting on all routes
  router.use(rateLimitMiddleware);

  // ===========================================================================
  // POST /api/auth/login — No JWT required
  // ===========================================================================
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { name, password } = req.body ?? {};
      if (!name || !password) {
        res.status(400).json({ error: 'Name and password are required' });
        return;
      }

      const token = await authController.login(name, password);
      if (!token) {
        res.status(401).json({ error: 'Invalid credentials or insufficient trust level' });
        return;
      }

      const ip = getIp(req);
      monitoringController.logAction(name, 'auth.login', name, 'Successful API login', ip);
      res.json({ token });
    } catch (err) {
      logger?.error(LOG_DOMAIN, `Login error: ${err}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // All subsequent routes require JWT
  router.use(jwtMiddleware(authController));

  // ===========================================================================
  // GET /api/dashboard — Server stats
  // ===========================================================================
  router.get('/dashboard', async (_req: AdminRequest, res: Response) => {
    try {
      const stats = await monitoringController.getServerStats();
      res.json(stats);
    } catch (err) {
      logger?.error(LOG_DOMAIN, `Dashboard error: ${err}`);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ===========================================================================
  // GET /api/players — Online player list
  // ===========================================================================
  router.get('/players', (_req: AdminRequest, res: Response) => {
    const players = playerInfo.getOnlinePlayers();
    res.json({ players });
  });

  // ===========================================================================
  // POST /api/players/:name/freeze — Toggle freeze
  // ===========================================================================
  router.post('/players/:name/freeze', requireTrust(TRUST_LEVELS.ACOLYTE), (req: AdminRequest, res: Response) => {
    const name = param(req, 'name');
    const success = playerInfo.freezePlayer(name);
    if (!success) {
      res.status(404).json({ error: `Player "${name}" not found online` });
      return;
    }
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'player.freeze', name, 'Toggled freeze', ip);
    res.json({ success: true, message: `Freeze toggled for ${name}` });
  });

  // ===========================================================================
  // POST /api/players/:name/disconnect — Force disconnect
  // ===========================================================================
  router.post('/players/:name/disconnect', requireTrust(TRUST_LEVELS.ACOLYTE), (req: AdminRequest, res: Response) => {
    const name = param(req, 'name');
    const success = playerInfo.disconnectPlayer(name);
    if (!success) {
      res.status(404).json({ error: `Player "${name}" not found online` });
      return;
    }
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'player.disconnect', name, 'Force disconnected', ip);
    res.json({ success: true, message: `${name} disconnected` });
  });

  // ===========================================================================
  // POST /api/players/:name/advance — Set player level
  // ===========================================================================
  router.post('/players/:name/advance', requireTrust(TRUST_LEVELS.GREATER_GOD), (req: AdminRequest, res: Response) => {
    const name = param(req, 'name');
    const { level } = req.body ?? {};
    if (typeof level !== 'number' || level < 1 || level > 65) {
      res.status(400).json({ error: 'Level must be a number between 1 and 65' });
      return;
    }
    const success = playerInfo.advancePlayer(name, level);
    if (!success) {
      res.status(404).json({ error: `Player "${name}" not found online` });
      return;
    }
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'player.advance', name, `Advanced to level ${level}`, ip);
    res.json({ success: true, message: `${name} advanced to level ${level}` });
  });

  // ===========================================================================
  // GET /api/areas — Area list
  // ===========================================================================
  router.get('/areas', (_req: AdminRequest, res: Response) => {
    const areas = areaInfo.getAreaList();
    res.json({ areas });
  });

  // ===========================================================================
  // GET /api/areas/:name — Area detail
  // ===========================================================================
  router.get('/areas/:name', (req: AdminRequest, res: Response) => {
    const name = param(req, 'name');
    const detail = areaInfo.getAreaDetail(name);
    if (!detail) {
      res.status(404).json({ error: `Area "${name}" not found` });
      return;
    }
    res.json(detail);
  });

  // ===========================================================================
  // POST /api/areas/:name/reset — Force area reset
  // ===========================================================================
  router.post('/areas/:name/reset', requireTrust(TRUST_LEVELS.CREATOR), (req: AdminRequest, res: Response) => {
    const name = param(req, 'name');
    const success = areaInfo.resetArea(name);
    if (!success) {
      res.status(404).json({ error: `Area "${name}" not found` });
      return;
    }
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'area.reset', name, 'Forced area reset', ip);
    res.json({ success: true, message: `Area "${name}" reset` });
  });

  // ===========================================================================
  // GET /api/bans — List all bans
  // ===========================================================================
  router.get('/bans', (_req: AdminRequest, res: Response) => {
    const bans = banSystem.getAllBans();
    res.json({ bans });
  });

  // ===========================================================================
  // POST /api/bans — Create a ban
  // ===========================================================================
  router.post('/bans', requireTrust(TRUST_LEVELS.DEMI_GOD), (req: AdminRequest, res: Response) => {
    const { site, type, duration, note } = req.body ?? {};
    if (!site || !type) {
      res.status(400).json({ error: 'Site and type are required' });
      return;
    }

    const banEntry: BanEntry = {
      id: `ban_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: site,
      user: '',
      note: note ?? '',
      bannedBy: req.admin!.name,
      bannedAt: new Date(),
      flagType: type as BanEntry['flagType'],
      level: 0,
      unbanDate: duration && duration > 0
        ? new Date(Date.now() + duration * 60 * 60 * 1000)
        : null,
      duration: duration ?? -1,
      prefix: site.startsWith('*'),
      suffix: site.endsWith('*'),
    };

    banSystem.addBan(banEntry);
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'ban.add', site, `Type: ${type}, Duration: ${duration ?? 'permanent'}`, ip);
    res.json({ success: true, ban: banEntry });
  });

  // ===========================================================================
  // DELETE /api/bans/:id — Remove a ban
  // ===========================================================================
  router.delete('/bans/:id', requireTrust(TRUST_LEVELS.DEMI_GOD), (req: AdminRequest, res: Response) => {
    const id = param(req, 'id');
    const success = banSystem.removeBan(id);
    if (!success) {
      res.status(404).json({ error: `Ban "${id}" not found` });
      return;
    }
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'ban.remove', id, 'Removed ban', ip);
    res.json({ success: true, message: `Ban "${id}" removed` });
  });

  // ===========================================================================
  // GET /api/logs — Query audit logs
  // ===========================================================================
  router.get('/logs', (req: AdminRequest, res: Response) => {
    const { actor, action, from, to, limit } = req.query;
    const logs = monitoringController.getAuditLogs({
      actor: actor as string | undefined,
      action: action as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    res.json({ logs, total: monitoringController.getAuditLogCount() });
  });

  // ===========================================================================
  // POST /api/system/reboot — Trigger server reboot
  // ===========================================================================
  router.post('/system/reboot', requireTrust(TRUST_LEVELS.GREATER_GOD), (req: AdminRequest, res: Response) => {
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'system.reboot', 'server', 'Initiated reboot via API', ip);
    res.json({ success: true, message: 'Reboot initiated' });
    // Schedule reboot after response is sent
    setTimeout(() => systemOps.reboot(), 500);
  });

  // ===========================================================================
  // POST /api/system/shutdown — Trigger server shutdown
  // ===========================================================================
  router.post('/system/shutdown', requireTrust(TRUST_LEVELS.GREATER_GOD), (req: AdminRequest, res: Response) => {
    const save = req.body?.save !== false; // Default to saving
    const ip = getIp(req);
    monitoringController.logAction(req.admin!.name, 'system.shutdown', 'server', `Shutdown (save=${save}) via API`, ip);
    res.json({ success: true, message: `Shutdown initiated (save=${save})` });
    setTimeout(() => systemOps.shutdown(save), 500);
  });

  return router;
}
