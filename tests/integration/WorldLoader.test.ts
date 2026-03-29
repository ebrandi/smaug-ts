import { describe, it, expect, beforeEach } from 'vitest';
import { AreaManager } from '../../src/game/world/AreaManager.js';
import { ResetEngine } from '../../src/game/world/ResetEngine.js';
import { VnumRegistry } from '../../src/game/world/VnumRegistry.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Logger, LogLevel } from '../../src/utils/Logger.js';
import { Mobile } from '../../src/game/entities/Mobile.js';
import { GameObject } from '../../src/game/entities/GameObject.js';
import * as path from 'path';

describe('WorldLoader Integration', () => {
  let vnumRegistry: VnumRegistry;
  let eventBus: EventBus;
  let logger: Logger;
  let areaManager: AreaManager;
  let resetEngine: ResetEngine;
  const worldDir = path.resolve(__dirname, '../../world');

  beforeEach(() => {
    vnumRegistry = new VnumRegistry();
    eventBus = new EventBus();
    logger = new Logger(LogLevel.Error);
    areaManager = new AreaManager(vnumRegistry, logger);
    resetEngine = new ResetEngine(vnumRegistry, eventBus, logger);
    Mobile.resetInstanceCounter();
    GameObject.resetCounters();
  });

  it('should load example area from world/_example/', async () => {
    await areaManager.loadAllAreas(worldDir);

    const area = areaManager.getAreaByFilename('_example');
    expect(area).toBeDefined();
    expect(area!.name).toBe('Example Area');
  });

  it('should verify room count matches', async () => {
    await areaManager.loadAllAreas(worldDir);

    // _example area has 3 rooms
    expect(vnumRegistry.getRoomCount()).toBeGreaterThanOrEqual(3);
    expect(vnumRegistry.getRoom(100)).toBeDefined();
    expect(vnumRegistry.getRoom(101)).toBeDefined();
    expect(vnumRegistry.getRoom(102)).toBeDefined();
  });

  it('should verify exit resolution works', async () => {
    await areaManager.loadAllAreas(worldDir);
    areaManager.resolveExits();

    const room100 = vnumRegistry.getRoom(100);
    expect(room100).toBeDefined();

    // Room 100 has exits north (101) and east (102)
    const northExit = room100!.exits.get(0); // Direction.North
    const eastExit = room100!.exits.get(1); // Direction.East

    expect(northExit).toBeDefined();
    expect(northExit!.toRoom).toBe(101);
    expect(vnumRegistry.getRoom(101)).toBeDefined();

    expect(eastExit).toBeDefined();
    expect(eastExit!.toRoom).toBe(102);
    expect(vnumRegistry.getRoom(102)).toBeDefined();
  });

  it('should verify mob placement after reset', async () => {
    await areaManager.loadAllAreas(worldDir);
    areaManager.resolveExits();

    const area = areaManager.getAreaByFilename('_example');
    expect(area).toBeDefined();

    // Run resets
    resetEngine.resetArea(area!);

    // Check that the city guard was placed in room 100
    const room100 = vnumRegistry.getRoom(100);
    expect(room100).toBeDefined();
    expect(room100!.characters.length).toBeGreaterThanOrEqual(1);

    const guard = room100!.characters[0] as Mobile;
    expect(guard).toBeInstanceOf(Mobile);
    expect(guard.name).toBe('city guard');
    expect(guard.resetRoom).toBe(100);
  });

  it('should verify object equipping after reset', async () => {
    await areaManager.loadAllAreas(worldDir);
    areaManager.resolveExits();

    const area = areaManager.getAreaByFilename('_example');
    expect(area).toBeDefined();

    resetEngine.resetArea(area!);

    // The guard (mob 100) should have the short sword (obj 100) equipped at Wield (16)
    const room100 = vnumRegistry.getRoom(100);
    const guard = room100!.characters[0] as Mobile;
    expect(guard.equipment.size).toBeGreaterThanOrEqual(1);

    const wieldedItem = guard.equipment.get(16); // WearLocation.Wield
    expect(wieldedItem).toBeDefined();
    expect((wieldedItem as GameObject).name).toBe('short sword');
  });

  it('should support full boot sequence (load → resolve → reset)', async () => {
    // Load all areas
    await areaManager.loadAllAreas(worldDir);
    expect(areaManager.getAreaCount()).toBeGreaterThanOrEqual(1);

    // Resolve exits
    areaManager.resolveExits();

    // Run initial resets
    for (const area of areaManager.getAllAreas()) {
      resetEngine.resetArea(area);
    }

    // Verify boot stats
    expect(vnumRegistry.getRoomCount()).toBeGreaterThanOrEqual(3);
    expect(vnumRegistry.getMobileCount()).toBeGreaterThanOrEqual(1);
    expect(vnumRegistry.getObjectCount()).toBeGreaterThanOrEqual(1);
  });
});
