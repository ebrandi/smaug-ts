import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AreaManager } from '../../../src/game/world/AreaManager.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('AreaManager', () => {
  let vnumRegistry: VnumRegistry;
  let logger: Logger;
  let areaManager: AreaManager;
  const worldDir = path.resolve(__dirname, '../../../world');

  beforeEach(() => {
    vnumRegistry = new VnumRegistry();
    logger = new Logger(LogLevel.Error); // quiet for tests
    areaManager = new AreaManager(vnumRegistry, logger);
  });

  describe('loadArea', () => {
    it('should parse area.json correctly', async () => {
      const areaDir = path.join(worldDir, '_example');
      const area = await areaManager.loadArea(areaDir);

      expect(area.filename).toBe('_example');
      expect(area.name).toBe('Example Area');
      expect(area.author).toBe('System');
      expect(area.resetFrequency).toBe(15);
      expect(area.vnumRanges.rooms.low).toBe(100);
      expect(area.vnumRanges.rooms.high).toBe(109);
      expect(area.vnumRanges.mobiles.low).toBe(100);
      expect(area.vnumRanges.objects.low).toBe(100);
    });
  });

  describe('loadRooms', () => {
    it('should create Room instances with correct properties', async () => {
      const areaDir = path.join(worldDir, '_example');
      const area = await areaManager.loadArea(areaDir);

      expect(area.rooms.size).toBe(3);

      const townSquare = area.rooms.get(100);
      expect(townSquare).toBeDefined();
      expect(townSquare!.name).toBe('Town Square');
      expect(townSquare!.vnum).toBe(100);
      expect(townSquare!.area).toBe(area);
      expect(townSquare!.exits.size).toBe(2);

      // Check exit data
      const northExit = townSquare!.exits.get(0); // Direction.North = 0
      expect(northExit).toBeDefined();
      expect(northExit!.toRoom).toBe(101);

      // Check extra descriptions
      expect(townSquare!.extraDescriptions.length).toBe(1);
      expect(townSquare!.extraDescriptions[0]!.keywords).toBe('fountain');
    });

    it('should register rooms in VnumRegistry', async () => {
      const areaDir = path.join(worldDir, '_example');
      await areaManager.loadArea(areaDir);

      expect(vnumRegistry.getRoom(100)).toBeDefined();
      expect(vnumRegistry.getRoom(101)).toBeDefined();
      expect(vnumRegistry.getRoom(102)).toBeDefined();
      expect(vnumRegistry.getRoomCount()).toBe(3);
    });
  });

  describe('loadMobiles', () => {
    it('should create MobilePrototype with correct stats', async () => {
      const areaDir = path.join(worldDir, '_example');
      const area = await areaManager.loadArea(areaDir);

      expect(area.mobilePrototypes.size).toBe(1);

      const guard = area.mobilePrototypes.get(100);
      expect(guard).toBeDefined();
      expect(guard!.name).toBe('city guard');
      expect(guard!.level).toBe(10);
      expect(guard!.alignment).toBe(1000);
      expect(guard!.sex).toBe(1); // Male
      expect(guard!.hitDice.num).toBe(3);
      expect(guard!.hitDice.size).toBe(8);
      expect(guard!.hitDice.bonus).toBe(20);
      expect(guard!.gold).toBe(50);
    });

    it('should register mobiles in VnumRegistry', async () => {
      const areaDir = path.join(worldDir, '_example');
      await areaManager.loadArea(areaDir);

      expect(vnumRegistry.getMobile(100)).toBeDefined();
      expect(vnumRegistry.getMobileCount()).toBe(1);
    });
  });

  describe('loadObjects', () => {
    it('should create ObjectPrototype with correct values', async () => {
      const areaDir = path.join(worldDir, '_example');
      const area = await areaManager.loadArea(areaDir);

      expect(area.objectPrototypes.size).toBe(1);

      const sword = area.objectPrototypes.get(100);
      expect(sword).toBeDefined();
      expect(sword!.name).toBe('short sword');
      expect(sword!.itemType).toBe(5); // ItemType.Weapon
      expect(sword!.weight).toBe(5);
      expect(sword!.cost).toBe(100);
      expect(sword!.values).toEqual([0, 1, 6, 3, 0, 0]);
      expect(sword!.wearFlags).toBe(8193n);
      expect(sword!.extraDescriptions.length).toBe(1);
    });

    it('should register objects in VnumRegistry', async () => {
      const areaDir = path.join(worldDir, '_example');
      await areaManager.loadArea(areaDir);

      expect(vnumRegistry.getObject(100)).toBeDefined();
      expect(vnumRegistry.getObjectCount()).toBe(1);
    });
  });

  describe('loadAllAreas', () => {
    it('should load all areas from the world directory', async () => {
      await areaManager.loadAllAreas(worldDir);

      expect(areaManager.getAreaCount()).toBeGreaterThanOrEqual(1);
      expect(areaManager.getAreaByFilename('_example')).toBeDefined();
    });

    it('should return all areas via getAllAreas()', async () => {
      await areaManager.loadAllAreas(worldDir);

      const areas = areaManager.getAllAreas();
      expect(areas.length).toBe(areaManager.getAreaCount());
    });
  });

  describe('resolveExits', () => {
    it('should resolve exits linking rooms correctly', async () => {
      await areaManager.loadAllAreas(worldDir);
      areaManager.resolveExits();

      // Room 100 exit north → room 101 should be resolved
      const room100 = vnumRegistry.getRoom(100);
      expect(room100).toBeDefined();
      const northExit = room100!.exits.get(0);
      expect(northExit).toBeDefined();
      expect(vnumRegistry.getRoom(northExit!.toRoom)).toBeDefined();
    });

    it('should log warning for invalid vnum', async () => {
      // Create a room with an exit to a non-existent room
      const warnSpy = vi.spyOn(logger, 'warn');

      await areaManager.loadAllAreas(worldDir);

      // Add a bad exit to room 101
      const room101 = vnumRegistry.getRoom(101);
      if (room101) {
        room101.exits.set(0, { // North
          direction: 0,
          toRoom: 99999,
          keyword: '',
          description: '',
          flags: 0n,
          key: -1,
        });
      }

      areaManager.resolveExits();

      expect(warnSpy).toHaveBeenCalledWith(
        'area-manager',
        expect.stringContaining('Unresolved exit'),
      );
    });
  });

  describe('loadResets', () => {
    it('should load resets from resets.json', async () => {
      const areaDir = path.join(worldDir, '_example');
      const area = await areaManager.loadArea(areaDir);

      expect(area.resets.length).toBe(2);
      expect(area.resets[0]!.command).toBe('M');
      expect(area.resets[0]!.arg1).toBe(100); // mob vnum
      expect(area.resets[0]!.arg3).toBe(100); // room vnum
      expect(area.resets[1]!.command).toBe('E');
      expect(area.resets[1]!.arg3).toBe(16); // WearLocation.Wield
    });
  });
});
