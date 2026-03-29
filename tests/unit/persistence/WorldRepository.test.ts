import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorldRepository } from '../../../src/persistence/WorldRepository.js';
import { Area } from '../../../src/game/entities/Area.js';
import { Room } from '../../../src/game/entities/Room.js';
import { SectorType, Direction } from '../../../src/game/entities/types.js';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// =============================================================================
// Tests
// =============================================================================

describe('WorldRepository', () => {
  let worldDir: string;
  let repo: WorldRepository;

  beforeEach(async () => {
    worldDir = await mkdtemp(join(tmpdir(), 'smaug-world-'));
    repo = new WorldRepository();
  });

  afterEach(async () => {
    await rm(worldDir, { recursive: true, force: true });
  });

  describe('saveArea()', () => {
    it('saves area metadata to area.json', async () => {
      const area = new Area('midgaard', 'Midgaard', 'Diku');
      area.vnumRanges.rooms = { low: 3000, high: 3099 };
      area.vnumRanges.mobiles = { low: 3000, high: 3099 };
      area.vnumRanges.objects = { low: 3000, high: 3099 };

      await repo.saveArea(area, worldDir);

      const areaJson = JSON.parse(await readFile(join(worldDir, 'midgaard', 'area.json'), 'utf-8'));
      expect(areaJson.name).toBe('Midgaard');
      expect(areaJson.author).toBe('Diku');
      expect(areaJson.vnumRanges.rooms.low).toBe(3000);
    });

    it('saves rooms to rooms.json', async () => {
      const area = new Area('test_area', 'Test Area', 'Tester');
      const room = new Room(3001, 'Town Square', 'A bustling town square.');
      room.sectorType = SectorType.City;
      area.rooms.set(3001, room);

      await repo.saveArea(area, worldDir);

      const roomsJson = JSON.parse(await readFile(join(worldDir, 'test_area', 'rooms.json'), 'utf-8'));
      expect(roomsJson).toHaveLength(1);
      expect(roomsJson[0].vnum).toBe(3001);
      expect(roomsJson[0].name).toBe('Town Square');
    });

    it('saves resets to resets.json', async () => {
      const area = new Area('test_area2', 'Test Area 2', 'Tester');
      area.resets.push({
        command: 'M',
        extra: 0,
        arg1: 3001,
        arg2: 1,
        arg3: 3001,
        arg4: 0,
        arg5: 0,
        arg6: 0,
        arg7: 0,
      });

      await repo.saveArea(area, worldDir);

      const resetsJson = JSON.parse(await readFile(join(worldDir, 'test_area2', 'resets.json'), 'utf-8'));
      expect(resetsJson).toHaveLength(1);
      expect(resetsJson[0].command).toBe('M');
    });

    it('creates directory if not exists', async () => {
      const area = new Area('new_area', 'New Area', 'Builder');
      await repo.saveArea(area, worldDir);

      const areaJson = JSON.parse(await readFile(join(worldDir, 'new_area', 'area.json'), 'utf-8'));
      expect(areaJson.name).toBe('New Area');
    });
  });

  describe('loadArea()', () => {
    it('loads a previously saved area', async () => {
      const area = new Area('loadtest', 'Load Test', 'Tester');
      area.resetFrequency = 15;
      await repo.saveArea(area, worldDir);

      const loaded = await repo.loadArea('loadtest', worldDir) as any;
      expect(loaded).not.toBeNull();
      expect(loaded.name).toBe('Load Test');
      expect(loaded.resetFrequency).toBe(15);
    });

    it('returns null for non-existent area', async () => {
      const loaded = await repo.loadArea('nonexistent', worldDir);
      expect(loaded).toBeNull();
    });

    it('includes rooms, mobiles, objects, resets arrays', async () => {
      const area = new Area('fulltest', 'Full Test', 'Tester');
      const room = new Room(5001, 'Test Room', 'A test room.');
      area.rooms.set(5001, room);
      await repo.saveArea(area, worldDir);

      const loaded = await repo.loadArea('fulltest', worldDir) as any;
      expect(loaded.rooms).toHaveLength(1);
      expect(loaded.rooms[0].vnum).toBe(5001);
    });
  });

  describe('loadAllAreas()', () => {
    it('loads all area directories', async () => {
      const area1 = new Area('area1', 'Area One', 'Builder1');
      const area2 = new Area('area2', 'Area Two', 'Builder2');
      await repo.saveArea(area1, worldDir);
      await repo.saveArea(area2, worldDir);

      const areas = await repo.loadAllAreas(worldDir);
      expect(areas).toHaveLength(2);
    });

    it('returns empty array for empty directory', async () => {
      const areas = await repo.loadAllAreas(worldDir);
      expect(areas).toHaveLength(0);
    });
  });

  describe('saveModifiedAreas()', () => {
    it('saves only modified areas', async () => {
      const area1 = new Area('mod1', 'Modified', 'Builder') as Area & { modified: boolean };
      area1.modified = true;
      const area2 = new Area('unmod', 'Unmodified', 'Builder') as Area & { modified: boolean };
      area2.modified = false;

      await repo.saveModifiedAreas([area1, area2], worldDir);

      const loaded1 = await repo.loadArea('mod1', worldDir);
      const loaded2 = await repo.loadArea('unmod', worldDir);
      expect(loaded1).not.toBeNull();
      expect(loaded2).toBeNull();
    });

    it('resets modified flag after save', async () => {
      const area = new Area('flagtest', 'Flag Test', 'Builder') as Area & { modified: boolean };
      area.modified = true;
      await repo.saveModifiedAreas([area], worldDir);
      expect(area.modified).toBe(false);
    });
  });

  describe('saveWorldState() / loadWorldState()', () => {
    it('saves and loads world state', async () => {
      const state = {
        timestamp: '',
        corpses: [{
          roomVnum: 3001,
          objectVnum: 10,
          contents: [{ vnum: 100, values: [0, 0, 0] }],
        }],
        droppedItems: [{
          roomVnum: 3002,
          objectVnum: 200,
          values: [1, 2, 3],
        }],
        roomAffects: [],
      };

      await repo.saveWorldState(worldDir, state);
      const loaded = await repo.loadWorldState(worldDir);

      expect(loaded).not.toBeNull();
      expect(loaded!.corpses).toHaveLength(1);
      expect(loaded!.corpses[0]!.roomVnum).toBe(3001);
      expect(loaded!.droppedItems).toHaveLength(1);
    });

    it('returns null when no world state file exists', async () => {
      const loaded = await repo.loadWorldState(worldDir);
      expect(loaded).toBeNull();
    });
  });
});
