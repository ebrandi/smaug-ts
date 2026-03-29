/**
 * WorldRepository – World data persistence via JSON files.
 *
 * Manages loading and saving of area data from the world/ directory.
 * Each area is stored as a set of JSON files (area.json, rooms.json,
 * mobiles.json, objects.json, resets.json, shops.json, programs.json).
 *
 * Also handles transient world state for hot reboot recovery.
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { Area, type ResetData } from '../game/entities/Area.js';
import type { Room } from '../game/entities/Room.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger();

/** Serialized area data for JSON persistence. */
interface SerializedArea {
  filename: string;
  name: string;
  author: string;
  vnumRanges: {
    rooms: { low: number; high: number };
    mobiles: { low: number; high: number };
    objects: { low: number; high: number };
  };
  resetFrequency: number;
  flags: string; // stringified bigint
}

/** Serialized room for JSON output. */
interface SerializedRoom {
  vnum: number;
  name: string;
  description: string;
  sectorType: number;
  roomFlags: string;
  exits: Array<{
    direction: number;
    description: string;
    keyword: string;
    flags: string;
    key: number;
    toRoom: number;
  }>;
  extraDescriptions: Array<{ keywords: string; description: string }>;
  teleportVnum: number;
  teleportDelay: number;
  tunnel: number;
}

/** Transient world state for hot reboot recovery. */
interface WorldState {
  timestamp: string;
  corpses: Array<{
    roomVnum: number;
    objectVnum: number;
    contents: Array<{ vnum: number; values: number[] }>;
  }>;
  droppedItems: Array<{
    roomVnum: number;
    objectVnum: number;
    values: number[];
  }>;
  roomAffects: Array<{
    roomVnum: number;
    affects: Array<{ type: number; duration: number }>;
  }>;
}

export class WorldRepository {
  /**
   * Load all area JSON files from the world directory.
   * Scans each subdirectory for area.json and loads associated files.
   */
  async loadAllAreas(worldDir: string): Promise<unknown[]> {
    const areas: unknown[] = [];

    try {
      const entries = await readdir(worldDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const area = await this.loadArea(entry.name, worldDir);
        if (area) {
          areas.push(area);
        }
      }
    } catch (err) {
      logger.error('persistence', `Failed to scan world directory: ${err}`);
    }

    logger.info('persistence', `Loaded ${areas.length} areas from ${worldDir}`);
    return areas;
  }

  /**
   * Save an area's data back to JSON files in the world directory.
   * Creates the subdirectory if it does not exist.
   * Used by OLC when builders modify areas.
   */
  async saveArea(area: Area, worldDir: string): Promise<void> {
    const areaDir = join(worldDir, area.filename);

    try {
      await mkdir(areaDir, { recursive: true });
    } catch {
      // Directory may already exist
    }

    // Serialize area metadata
    const areaData: SerializedArea = {
      filename: area.filename,
      name: area.name,
      author: area.author,
      vnumRanges: area.vnumRanges,
      resetFrequency: area.resetFrequency,
      flags: area.flags.toString(),
    };

    await writeFile(
      join(areaDir, 'area.json'),
      JSON.stringify(areaData, null, 2),
      'utf-8',
    );

    // Serialize rooms
    const rooms: SerializedRoom[] = [];
    for (const [_vnum, room] of area.rooms) {
      rooms.push(serializeRoom(room));
    }
    await writeFile(
      join(areaDir, 'rooms.json'),
      JSON.stringify(rooms, null, 2),
      'utf-8',
    );

    // Serialize mobile prototypes
    const mobiles = [];
    for (const [_vnum, proto] of area.mobilePrototypes) {
      mobiles.push({
        ...proto,
        actFlags: proto.actFlags.toString(),
        affectedBy: proto.affectedBy.toString(),
        resistant: proto.resistant.toString(),
        immune: proto.immune.toString(),
        susceptible: proto.susceptible.toString(),
      });
    }
    await writeFile(
      join(areaDir, 'mobiles.json'),
      JSON.stringify(mobiles, null, 2),
      'utf-8',
    );

    // Serialize object prototypes
    const objects = [];
    for (const [_vnum, proto] of area.objectPrototypes) {
      objects.push({
        ...proto,
        extraFlags: proto.extraFlags.toString(),
        wearFlags: proto.wearFlags.toString(),
      });
    }
    await writeFile(
      join(areaDir, 'objects.json'),
      JSON.stringify(objects, null, 2),
      'utf-8',
    );

    // Serialize resets
    await writeFile(
      join(areaDir, 'resets.json'),
      JSON.stringify(area.resets, null, 2),
      'utf-8',
    );

    logger.debug('persistence', `Area saved: ${area.name} (${area.filename})`);
  }

  /**
   * Save all modified areas.
   * Iterates all areas and saves those with modified flag set.
   * Resets modified flag after save.
   * Called on shutdown and periodically.
   */
  async saveModifiedAreas(areas: Area[], worldDir: string): Promise<void> {
    let savedCount = 0;
    for (const area of areas) {
      if ((area as Area & { modified?: boolean }).modified) {
        await this.saveArea(area, worldDir);
        (area as Area & { modified?: boolean }).modified = false;
        savedCount++;
      }
    }
    if (savedCount > 0) {
      logger.info('persistence', `Saved ${savedCount} modified areas`);
    }
  }

  /**
   * Save transient world state for hot reboot recovery.
   * Includes corpse locations, dropped items, and room affects.
   */
  async saveWorldState(worldDir: string, state: WorldState): Promise<void> {
    const statePath = join(worldDir, 'worldstate.json');
    state.timestamp = new Date().toISOString();

    try {
      await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
      logger.debug('persistence', 'World state saved');
    } catch (err) {
      logger.error('persistence', `Failed to save world state: ${err}`);
    }
  }

  /**
   * Load transient world state after reboot.
   */
  async loadWorldState(worldDir: string): Promise<WorldState | null> {
    const statePath = join(worldDir, 'worldstate.json');

    try {
      const raw = await readFile(statePath, 'utf-8');
      const state = JSON.parse(raw) as WorldState;
      logger.info('persistence', `World state loaded (saved at ${state.timestamp})`);
      return state;
    } catch {
      logger.debug('persistence', 'No world state file found');
      return null;
    }
  }

  /**
   * Load a single area by its directory name.
   * Returns null if the directory or area.json does not exist.
   */
  async loadArea(filename: string, worldDir: string): Promise<unknown | null> {
    const areaDir = join(worldDir, filename);

    try {
      const areaRaw = await readFile(join(areaDir, 'area.json'), 'utf-8');
      const areaData = JSON.parse(areaRaw);

      // Load associated files
      let rooms = [];
      let mobiles = [];
      let objects = [];
      let resets: ResetData[] = [];

      try {
        rooms = JSON.parse(await readFile(join(areaDir, 'rooms.json'), 'utf-8'));
      } catch { /* no rooms file */ }

      try {
        mobiles = JSON.parse(await readFile(join(areaDir, 'mobiles.json'), 'utf-8'));
      } catch { /* no mobiles file */ }

      try {
        objects = JSON.parse(await readFile(join(areaDir, 'objects.json'), 'utf-8'));
      } catch { /* no objects file */ }

      try {
        resets = JSON.parse(await readFile(join(areaDir, 'resets.json'), 'utf-8'));
      } catch { /* no resets file */ }

      return {
        ...areaData,
        rooms,
        mobiles,
        objects,
        resets,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Serialize a Room to a plain object for JSON.
 */
function serializeRoom(room: Room): SerializedRoom {
  const exits: SerializedRoom['exits'] = [];
  for (const [_dir, exit] of room.exits) {
    exits.push({
      direction: exit.direction,
      description: exit.description,
      keyword: exit.keyword,
      flags: exit.flags.toString(),
      key: exit.key,
      toRoom: exit.toRoom,
    });
  }

  return {
    vnum: room.vnum,
    name: room.name,
    description: room.description,
    sectorType: room.sectorType,
    roomFlags: room.roomFlags.toString(),
    exits,
    extraDescriptions: room.extraDescriptions,
    teleportVnum: room.teleportVnum,
    teleportDelay: room.teleportDelay,
    tunnel: room.tunnel,
  };
}
