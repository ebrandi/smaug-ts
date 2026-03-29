import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import http from 'http';
import {
  createAdminRouter,
  clearRateLimits,
  type PlayerInfoProvider,
  type AreaInfoProvider,
  type SystemOpsProvider,
  type AdminRouterDeps,
} from '../../src/admin/AdminRouter.js';
import { AuthController, type PlayerCredentials } from '../../src/admin/AuthController.js';
import { MonitoringController, type MetricsProviders } from '../../src/admin/MonitoringController.js';
import { BanSystem } from '../../src/admin/BanSystem.js';
import { TRUST_LEVELS } from '../../src/admin/TrustLevels.js';

// =============================================================================
// Test Infrastructure
// =============================================================================

const TEST_SECRET = 'admin-api-test-secret';
const TEST_PORT = 0; // Random port

let server: http.Server;
let baseUrl: string;
let immortalToken: string;
let godToken: string;

// Mock providers
const mockPlayers = [
  { name: 'Alice', level: 20, class: 'warrior', race: 'human', roomVnum: 3001, idleTime: 5, host: '10.0.0.1' },
  { name: 'Bob', level: 15, class: 'mage', race: 'elf', roomVnum: 3005, idleTime: 120, host: '10.0.0.2' },
];

let frozenPlayers: Set<string>;
let disconnectedPlayers: Set<string>;
let advancedPlayers: Map<string, number>;
let resetAreas: Set<string>;
let rebootCalled: boolean;
let shutdownCalled: boolean;
let shutdownSave: boolean;

function makePlayerProvider(): PlayerInfoProvider {
  return {
    getOnlinePlayers: () => [...mockPlayers],
    freezePlayer: (name: string) => {
      if (!mockPlayers.find(p => p.name === name)) return false;
      frozenPlayers.add(name);
      return true;
    },
    disconnectPlayer: (name: string) => {
      if (!mockPlayers.find(p => p.name === name)) return false;
      disconnectedPlayers.add(name);
      return true;
    },
    advancePlayer: (name: string, level: number) => {
      if (!mockPlayers.find(p => p.name === name)) return false;
      advancedPlayers.set(name, level);
      return true;
    },
  };
}

function makeAreaProvider(): AreaInfoProvider {
  return {
    getAreaList: () => [
      {
        name: 'Midgaard',
        author: 'Diku',
        vnumRanges: { rooms: { low: 3000, high: 3099 }, mobiles: { low: 3000, high: 3099 }, objects: { low: 3000, high: 3099 } },
        age: 5,
        resetFrequency: 15,
        playerCount: 2,
      },
    ],
    getAreaDetail: (name: string) => {
      if (name === 'Midgaard') return { name: 'Midgaard', rooms: 50, mobs: 20 };
      return null;
    },
    resetArea: (name: string) => {
      if (name === 'Midgaard') { resetAreas.add(name); return true; }
      return false;
    },
  };
}

function makeSystemOps(): SystemOpsProvider {
  return {
    reboot: () => { rebootCalled = true; },
    shutdown: (save: boolean) => { shutdownCalled = true; shutdownSave = save; },
  };
}

function makeMetricsProviders(): MetricsProviders {
  return {
    getOnlinePlayerCount: () => 2,
    getTotalRegisteredCount: async () => 50,
    getAreaCount: () => 1,
    getRoomCount: () => 100,
    getMobileCount: () => 50,
    getObjectCount: () => 75,
    getCurrentTick: () => 1000,
  };
}

async function makeHash(password: string): Promise<string> {
  return AuthController.hashPassword(password);
}

async function request(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; body: any }> {
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const resBody = await res.json().catch(() => null);
  return { status: res.status, body: resBody };
}

// =============================================================================
// Setup / Teardown
// =============================================================================

beforeAll(async () => {
  const hash = await makeHash('password123');

  const lookup = async (name: string): Promise<PlayerCredentials | null> => {
    const creds: Record<string, PlayerCredentials> = {
      'immplayer': { name: 'ImmPlayer', passwordHash: hash, trust: TRUST_LEVELS.NEOPHYTE, level: 51 },
      'godplayer': { name: 'GodPlayer', passwordHash: hash, trust: TRUST_LEVELS.GREATER_GOD, level: 58 },
      'mortal': { name: 'Mortal', passwordHash: hash, trust: 0, level: 10 },
    };
    return creds[name.toLowerCase()] ?? null;
  };

  const authController = new AuthController(TEST_SECRET, lookup);
  const monitoringController = new MonitoringController(makeMetricsProviders());
  const banSystem = new BanSystem();

  const deps: AdminRouterDeps = {
    authController,
    monitoringController,
    banSystem,
    playerInfo: makePlayerProvider(),
    areaInfo: makeAreaProvider(),
    systemOps: makeSystemOps(),
  };

  const app = express();
  app.use(express.json());
  app.use('/api', createAdminRouter(deps));

  await new Promise<void>((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}/api`;
      resolve();
    });
  });

  // Get tokens for tests
  const immRes = await request('POST', '/auth/login', { name: 'ImmPlayer', password: 'password123' });
  immortalToken = immRes.body.token;

  const godRes = await request('POST', '/auth/login', { name: 'GodPlayer', password: 'password123' });
  godToken = godRes.body.token;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

beforeEach(() => {
  frozenPlayers = new Set();
  disconnectedPlayers = new Set();
  advancedPlayers = new Map();
  resetAreas = new Set();
  rebootCalled = false;
  shutdownCalled = false;
  shutdownSave = false;
  clearRateLimits();
});

// =============================================================================
// Tests
// =============================================================================

describe('Admin API', () => {
  // ===========================================================================
  // Authentication
  // ===========================================================================

  describe('POST /api/auth/login', () => {
    it('should return a JWT token for valid immortal', async () => {
      const res = await request('POST', '/auth/login', { name: 'ImmPlayer', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it('should reject invalid password', async () => {
      const res = await request('POST', '/auth/login', { name: 'ImmPlayer', password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('should reject mortal player', async () => {
      const res = await request('POST', '/auth/login', { name: 'Mortal', password: 'password123' });
      expect(res.status).toBe(401);
    });

    it('should reject missing credentials', async () => {
      const res = await request('POST', '/auth/login', {});
      expect(res.status).toBe(400);
    });

    it('should reject unknown player', async () => {
      const res = await request('POST', '/auth/login', { name: 'Nobody', password: 'x' });
      expect(res.status).toBe(401);
    });
  });

  // ===========================================================================
  // JWT Middleware
  // ===========================================================================

  describe('JWT Middleware', () => {
    it('should reject requests without token', async () => {
      const res = await request('GET', '/dashboard');
      expect(res.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const res = await request('GET', '/dashboard', undefined, 'bad-token');
      expect(res.status).toBe(401);
    });

    it('should accept requests with valid token', async () => {
      const res = await request('GET', '/dashboard', undefined, immortalToken);
      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // Dashboard
  // ===========================================================================

  describe('GET /api/dashboard', () => {
    it('should return server stats', async () => {
      const res = await request('GET', '/dashboard', undefined, immortalToken);
      expect(res.status).toBe(200);
      expect(res.body.onlinePlayers).toBe(2);
      expect(res.body.totalRegistered).toBe(50);
      expect(res.body.areaCount).toBe(1);
      expect(res.body.roomCount).toBe(100);
      expect(res.body.mobileCount).toBe(50);
      expect(res.body.objectCount).toBe(75);
      expect(res.body.uptime).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Players
  // ===========================================================================

  describe('GET /api/players', () => {
    it('should return online players', async () => {
      const res = await request('GET', '/players', undefined, immortalToken);
      expect(res.status).toBe(200);
      expect(res.body.players).toHaveLength(2);
      expect(res.body.players[0].name).toBe('Alice');
    });
  });

  describe('POST /api/players/:name/freeze', () => {
    it('should freeze an online player (requires ACOLYTE trust)', async () => {
      const res = await request('POST', '/players/Alice/freeze', undefined, godToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(frozenPlayers.has('Alice')).toBe(true);
    });

    it('should reject freeze below ACOLYTE trust', async () => {
      const res = await request('POST', '/players/Alice/freeze', undefined, immortalToken);
      expect(res.status).toBe(403);
    });

    it('should return 404 for unknown player', async () => {
      const res = await request('POST', '/players/Unknown/freeze', undefined, godToken);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/players/:name/disconnect', () => {
    it('should disconnect an online player (requires ACOLYTE trust)', async () => {
      const res = await request('POST', '/players/Bob/disconnect', undefined, godToken);
      expect(res.status).toBe(200);
      expect(disconnectedPlayers.has('Bob')).toBe(true);
    });
  });

  describe('POST /api/players/:name/advance', () => {
    it('should require GREATER_GOD trust', async () => {
      const res = await request('POST', '/players/Alice/advance', { level: 30 }, immortalToken);
      expect(res.status).toBe(403);
    });

    it('should advance player with sufficient trust', async () => {
      const res = await request('POST', '/players/Alice/advance', { level: 30 }, godToken);
      expect(res.status).toBe(200);
      expect(advancedPlayers.get('Alice')).toBe(30);
    });

    it('should reject invalid level', async () => {
      const res = await request('POST', '/players/Alice/advance', { level: 999 }, godToken);
      expect(res.status).toBe(400);
    });

    it('should reject missing level', async () => {
      const res = await request('POST', '/players/Alice/advance', {}, godToken);
      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // Areas
  // ===========================================================================

  describe('GET /api/areas', () => {
    it('should return area list', async () => {
      const res = await request('GET', '/areas', undefined, immortalToken);
      expect(res.status).toBe(200);
      expect(res.body.areas).toHaveLength(1);
      expect(res.body.areas[0].name).toBe('Midgaard');
    });
  });

  describe('GET /api/areas/:name', () => {
    it('should return area detail', async () => {
      const res = await request('GET', '/areas/Midgaard', undefined, immortalToken);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Midgaard');
    });

    it('should return 404 for unknown area', async () => {
      const res = await request('GET', '/areas/Unknown', undefined, immortalToken);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/areas/:name/reset', () => {
    it('should reset an area', async () => {
      const res = await request('POST', '/areas/Midgaard/reset', undefined, godToken);
      expect(res.status).toBe(200);
      expect(resetAreas.has('Midgaard')).toBe(true);
    });

    it('should return 404 for unknown area', async () => {
      const res = await request('POST', '/areas/Unknown/reset', undefined, godToken);
      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // Bans
  // ===========================================================================

  describe('Ban CRUD', () => {
    it('should create and list a ban', async () => {
      const createRes = await request('POST', '/bans', {
        site: '192.168.*',
        type: 'all',
        duration: 24,
        note: 'Test ban',
      }, godToken);
      expect(createRes.status).toBe(200);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.ban.name).toBe('192.168.*');

      const listRes = await request('GET', '/bans', undefined, immortalToken);
      expect(listRes.status).toBe(200);
      expect(listRes.body.bans.length).toBeGreaterThanOrEqual(1);
    });

    it('should delete a ban', async () => {
      const createRes = await request('POST', '/bans', {
        site: '10.0.0.*',
        type: 'newbie',
      }, godToken);
      const banId = createRes.body.ban.id;

      const deleteRes = await request('DELETE', `/bans/${banId}`, undefined, godToken);
      expect(deleteRes.status).toBe(200);
    });

    it('should return 404 when deleting non-existent ban', async () => {
      const res = await request('DELETE', '/bans/nonexistent', undefined, godToken);
      expect(res.status).toBe(404);
    });

    it('should require DEMI_GOD trust for ban creation', async () => {
      const res = await request('POST', '/bans', {
        site: 'test.*',
        type: 'all',
      }, immortalToken);
      expect(res.status).toBe(403);
    });

    it('should reject ban creation without site', async () => {
      const res = await request('POST', '/bans', { type: 'all' }, godToken);
      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // Logs
  // ===========================================================================

  describe('GET /api/logs', () => {
    it('should return audit logs', async () => {
      // Trigger some logged actions first
      await request('POST', '/players/Alice/freeze', undefined, immortalToken);

      const res = await request('GET', '/logs', undefined, immortalToken);
      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const res = await request('GET', '/logs?limit=1', undefined, immortalToken);
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeLessThanOrEqual(1);
    });
  });

  // ===========================================================================
  // System Operations
  // ===========================================================================

  describe('POST /api/system/reboot', () => {
    it('should require GREATER_GOD trust', async () => {
      const res = await request('POST', '/system/reboot', undefined, immortalToken);
      expect(res.status).toBe(403);
    });

    it('should initiate reboot with sufficient trust', async () => {
      const res = await request('POST', '/system/reboot', undefined, godToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Wait for setTimeout to fire
      await new Promise(r => setTimeout(r, 600));
      expect(rebootCalled).toBe(true);
    });
  });

  describe('POST /api/system/shutdown', () => {
    it('should initiate shutdown', async () => {
      const res = await request('POST', '/system/shutdown', { save: true }, godToken);
      expect(res.status).toBe(200);
      await new Promise(r => setTimeout(r, 600));
      expect(shutdownCalled).toBe(true);
      expect(shutdownSave).toBe(true);
    });

    it('should default to save=true', async () => {
      const res = await request('POST', '/system/shutdown', {}, godToken);
      expect(res.status).toBe(200);
      await new Promise(r => setTimeout(r, 600));
      expect(shutdownSave).toBe(true);
    });
  });
});
