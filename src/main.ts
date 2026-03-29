/**
 * main.ts – SMAUG 2.0 Bootstrap Entry Point
 *
 * Initialises all subsystems in order:
 *   1. Environment / configuration
 *   2. Logger
 *   3. EventBus
 *   4. Prisma (database)
 *   5. TickEngine
 *   6. ConnectionManager
 *   7. GameLoop
 *   8. NetworkServer (HTTP + WS + Socket.IO)
 *   9. CommandRegistry + command registration
 *  10. BanSystem
 *  11. Admin API (Express middleware)
 *  12. VnumRegistry + AreaManager + ResetEngine (world loading)
 *  13. Social commands
 *  14. Area tick handler
 *  15. Process signal handlers for graceful shutdown
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { EventBus, GameEvent } from './core/EventBus.js';
import { TickEngine } from './core/TickEngine.js';
import { GameLoop } from './core/GameLoop.js';
import { Logger, LogLevel } from './utils/Logger.js';
import { ConnectionManager, DEFAULT_NETWORK_CONFIG } from './network/ConnectionManager.js';
import { NetworkServer } from './network/WebSocketServer.js';
import { CommandRegistry } from './game/commands/CommandRegistry.js';
import { registerMovementCommands } from './game/commands/movement.js';
import { registerCombatCommands, setCombatEngine } from './game/commands/combat.js';
import { CombatEngine } from './game/combat/CombatEngine.js';
import { DamageCalculator } from './game/combat/DamageCalculator.js';
import { DeathHandler } from './game/combat/DeathHandler.js';
import { registerCommunicationCommands } from './game/commands/communication.js';
import { registerInformationCommands } from './game/commands/information.js';
import { registerObjectCommands } from './game/commands/objects.js';
import { registerMagicCommands } from './game/commands/magic.js';
import { loadSocials } from './game/commands/social.js';
import { registerImmortalCommands, setImmortalLogger, setImmortalBanSystem, setImmortalVnumRegistry, setImmortalAreaManager, setImmortalConnectionManager } from './game/commands/immortal.js';
import { registerOlcCommands, setOlcLogger, setOlcVnumRegistry, setOlcAreaManager } from './game/commands/olc.js';
import { BanSystem } from './admin/BanSystem.js';
// Admin router import available for full wiring when providers are ready
// import { createAdminRouter } from './admin/AdminRouter.js';
import { VnumRegistry } from './game/world/VnumRegistry.js';
import { AreaManager } from './game/world/AreaManager.js';
import { ResetEngine } from './game/world/ResetEngine.js';

// =============================================================================
// Configuration
// =============================================================================

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const DB_LOG = process.env.DB_LOG === 'true';
export const JWT_SECRET = process.env.JWT_SECRET ?? 'smaug-dev-secret';

const networkConfig = {
  ...DEFAULT_NETWORK_CONFIG,
  port: PORT,
  maxConnections: parseInt(process.env.MAX_CONNECTIONS ?? '256', 10),
  idleTimeoutSec: parseInt(process.env.IDLE_TIMEOUT ?? '300', 10),
};

const gameLoopConfig = {
  pulseInterval: parseInt(process.env.PULSE_INTERVAL ?? '250', 10),
  randomizePulses: true,
};

// =============================================================================
// Subsystem Instances
// =============================================================================

const logger = new Logger(LogLevel.Info);
const LOG_DOMAIN = 'main';
const eventBus = new EventBus();
const prisma = new PrismaClient({
  log: DB_LOG ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});
const tickEngine = new TickEngine(eventBus);
const connectionManager = new ConnectionManager(eventBus, networkConfig);
const gameLoop = new GameLoop(tickEngine, connectionManager, gameLoopConfig);
const networkServer = new NetworkServer(connectionManager, networkConfig);

// =============================================================================
// Phase 2: Command Registry
// =============================================================================

const commandRegistry = new CommandRegistry(logger);

// Register all command groups
registerMovementCommands(commandRegistry);
registerCombatCommands(commandRegistry);
registerCommunicationCommands(commandRegistry);
registerInformationCommands(commandRegistry);
registerObjectCommands(commandRegistry);
registerMagicCommands(commandRegistry);
registerImmortalCommands(commandRegistry);
registerOlcCommands(commandRegistry);

// =============================================================================
// Phase 2: Ban System
// =============================================================================

const banSystem = new BanSystem();

// =============================================================================
// Phase 2: Admin API (Express middleware on the HTTP server)
// =============================================================================

const adminApp = express();
adminApp.use(express.json());

// Mount admin routes at /api/admin
// NOTE: Full admin router wiring deferred until all providers are available.
// For now, mount a minimal stub:
adminApp.get('/api/admin/status', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Health check endpoint (no auth required)
adminApp.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// =============================================================================
// Wire Player.interpretCommand to CommandRegistry
// =============================================================================

/**
 * Hook the command registry into the player input pipeline.
 * When a player's input is processed, it delegates to commandRegistry.dispatch().
 *
 * This is done by monkey-patching the Player prototype's interpretCommand
 * method to use the global command registry. In the future, this will be
 * done via dependency injection.
 */
import { Player } from './game/entities/Player.js';

Player.prototype.interpretCommand = function (this: Player, input: string): void {
  commandRegistry.dispatch(this, input);
};

// =============================================================================
// Phase 3A-2: World Management Instances
// =============================================================================

const vnumRegistry = new VnumRegistry();
const areaManager = new AreaManager(vnumRegistry, logger);
const resetEngine = new ResetEngine(vnumRegistry, eventBus, logger);

// Inject dependencies into immortal and OLC command modules
setImmortalLogger(logger);
setImmortalBanSystem(banSystem);
setImmortalVnumRegistry(vnumRegistry);
setImmortalAreaManager(areaManager);
setImmortalConnectionManager(connectionManager);
setOlcLogger(logger);
setOlcVnumRegistry(vnumRegistry);
setOlcAreaManager(areaManager);

// =============================================================================
// Phase 3B-2: Combat System
// =============================================================================

const damageCalculator = new DamageCalculator();
const deathHandler = new DeathHandler(eventBus, logger, vnumRegistry);
const combatEngineInstance = new CombatEngine(eventBus, logger, damageCalculator, deathHandler);

// Inject combat engine into combat commands module
setCombatEngine(combatEngineInstance);

// Wire violence update to the ViolenceTick event
eventBus.on(GameEvent.ViolenceTick, () => {
  // Gather all characters from all rooms
  const allChars: import('./game/entities/Character.js').Character[] = [];
  for (const room of vnumRegistry.getAllRooms()) {
    allChars.push(...room.characters);
  }
  combatEngineInstance.violenceUpdate(allChars);
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

let shuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(LOG_DOMAIN, `Received ${signal} – initiating graceful shutdown...`);

  // 1. Stop the game loop (no more pulses)
  gameLoop.stop();
  logger.info(LOG_DOMAIN, 'Game loop stopped.');

  // 2. Disconnect all players
  for (const desc of connectionManager.getAllDescriptors()) {
    desc.write('\n\r\x1bServer shutting down. Goodbye!\x1b\n\r');
    desc.flush();
    desc.close();
  }
  logger.info(LOG_DOMAIN, 'All connections closed.');

  // 3. Stop network server
  networkServer.stop();
  logger.info(LOG_DOMAIN, 'Network server stopped.');

  // 4. Disconnect Prisma
  await prisma.$disconnect();
  logger.info(LOG_DOMAIN, 'Database disconnected.');

  logger.info(LOG_DOMAIN, 'Shutdown complete.');
  process.exit(0);
}

// =============================================================================
// Process Signal Handlers
// =============================================================================

process.on('uncaughtException', (err: Error) => {
  logger.fatal(LOG_DOMAIN, `Uncaught exception: ${err.message}\n${err.stack ?? ''}`);
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(LOG_DOMAIN, `Unhandled rejection: ${String(reason)}`);
});

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));

// =============================================================================
// Event Listeners (diagnostics)
// =============================================================================

eventBus.on(GameEvent.LagWarning, (payload: { pulseCount: number; elapsedMs: number }) => {
  logger.warn(LOG_DOMAIN, `Lag detected on pulse ${payload.pulseCount}: ${payload.elapsedMs.toFixed(1)}ms`);
});

// =============================================================================
// Area tick handler
// =============================================================================

eventBus.on(GameEvent.AreaTick, () => {
  resetEngine.tickAreas(areaManager.getAllAreas());
});

// =============================================================================
// Startup
// =============================================================================

async function main(): Promise<void> {
  logger.info(LOG_DOMAIN, 'SMAUG 2.0 – Starting up...');

  // Connect to database
  await prisma.$connect();
  logger.info(LOG_DOMAIN, 'Database connected.');

  // Mount Express admin app as request handler on the HTTP server
  const httpServer = networkServer.getHttpServer();
  httpServer.removeAllListeners('request');
  httpServer.on('request', adminApp);

  // Start network server
  await networkServer.start();
  logger.info(LOG_DOMAIN, `Network server listening on port ${PORT} (ws: ${networkConfig.wsPath}, socket.io: ${networkConfig.socketioPath})`);
  logger.info(LOG_DOMAIN, `Admin API available at http://localhost:${PORT}/api/admin`);

  // Log Phase 2 component status
  logger.info(LOG_DOMAIN, `CommandRegistry initialized with ${commandRegistry.getAllCommands().length} commands`);
  logger.info(LOG_DOMAIN, `BanSystem initialized with ${banSystem.getAllBans().length} bans`);

  // =========================================================================
  // Phase 3A-2: Load world data
  // =========================================================================

  logger.info(LOG_DOMAIN, 'Loading world data...');
  await areaManager.loadAllAreas('./world');
  logger.info(LOG_DOMAIN, `Loaded ${areaManager.getAreaCount()} areas`);

  // Resolve exits
  areaManager.resolveExits();
  logger.info(LOG_DOMAIN, `Resolved exits for ${vnumRegistry.getRoomCount()} rooms`);

  // Run initial area resets
  for (const area of areaManager.getAllAreas()) {
    resetEngine.resetArea(area);
  }
  logger.info(LOG_DOMAIN, 'Initial area resets complete');

  // Load socials
  const socialCount = await loadSocials('./world/socials.json', commandRegistry, logger);
  logger.info(LOG_DOMAIN, `Loaded ${socialCount} socials`);

  // Log boot complete with stats
  logger.info(LOG_DOMAIN, `Boot complete: ${vnumRegistry.getRoomCount()} rooms, ${vnumRegistry.getMobileCount()} mob prototypes, ${vnumRegistry.getObjectCount()} obj prototypes`);

  // Start game loop
  gameLoop.start();
  logger.info(LOG_DOMAIN, 'Game loop started – SMAUG 2.0 is ready for connections.');
}

main().catch((err: unknown) => {
  logger.fatal(LOG_DOMAIN, `Startup failed: ${String(err)}`);
  process.exit(1);
});

// Suppress unused import warnings for subsystems that are used indirectly
void prisma;
void banSystem;
