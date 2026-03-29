/**
 * AreaManager – Loads and manages all game areas from the world directory.
 *
 * Scans for area subdirectories, loads area.json/rooms.json/mobiles.json/
 * objects.json/resets.json/shops.json/programs.json from each, creates
 * entity instances, registers them in VnumRegistry, and resolves exits.
 */

import { Area, type ResetData } from '../entities/Area.js';
import { Room } from '../entities/Room.js';
import type {
  MobilePrototype,
  ObjectPrototype,
  ShopData,
  ExtraDescription,
  Exit,
} from '../entities/types.js';
import {
  Direction,
  SectorType,
  Sex,
  Position,
  ItemType,
  ApplyType,
} from '../entities/types.js';
import { VnumRegistry } from './VnumRegistry.js';
import { Logger } from '../../utils/Logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const LOG_DOMAIN = 'area-manager';

export class AreaManager {
  private readonly areas: Map<string, Area> = new Map();
  private readonly vnumRegistry: VnumRegistry;
  private readonly logger: Logger;

  constructor(vnumRegistry: VnumRegistry, logger: Logger) {
    this.vnumRegistry = vnumRegistry;
    this.logger = logger;
  }

  /**
   * Scan worldDir for subdirectories, each containing area data files.
   * Loads area.json, rooms.json, mobiles.json, objects.json, resets.json,
   * shops.json, and programs.json from each subdirectory.
   */
  async loadAllAreas(worldDir: string): Promise<void> {
    const resolvedDir = path.resolve(worldDir);
    let entries: string[];

    try {
      const dirEntries = await fs.readdir(resolvedDir, { withFileTypes: true });
      entries = dirEntries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch (err) {
      this.logger.error(LOG_DOMAIN, `Failed to read world directory: ${resolvedDir}: ${String(err)}`);
      return;
    }

    for (const dirName of entries) {
      const areaDir = path.join(resolvedDir, dirName);
      const areaJsonPath = path.join(areaDir, 'area.json');

      // Only process directories that contain area.json
      try {
        await fs.access(areaJsonPath);
      } catch {
        this.logger.debug(LOG_DOMAIN, `Skipping ${dirName}: no area.json`);
        continue;
      }

      try {
        const area = await this.loadArea(areaDir);
        this.areas.set(area.filename, area);
        this.logger.info(LOG_DOMAIN, `Loaded area: ${area.name} (${area.filename})`);
      } catch (err) {
        this.logger.error(LOG_DOMAIN, `Failed to load area ${dirName}: ${String(err)}`);
      }
    }
  }

  /**
   * Load a single area from a directory containing area.json and related files.
   */
  async loadArea(areaDir: string): Promise<Area> {
    const areaJsonPath = path.join(areaDir, 'area.json');
    const raw = await fs.readFile(areaJsonPath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;

    const filename = (data['filename'] as string) ?? path.basename(areaDir);
    const name = (data['name'] as string) ?? 'Unknown Area';
    const author = (data['author'] as string) ?? 'Unknown';

    const area = new Area(filename, name, author);

    // Parse vnum ranges
    const ranges = data['vnumRanges'] as Record<string, Record<string, number>> | undefined;
    if (ranges) {
      if (ranges['rooms']) {
        area.vnumRanges.rooms = { low: ranges['rooms']['low'] ?? 0, high: ranges['rooms']['high'] ?? 0 };
      }
      if (ranges['mobiles']) {
        area.vnumRanges.mobiles = { low: ranges['mobiles']['low'] ?? 0, high: ranges['mobiles']['high'] ?? 0 };
      }
      if (ranges['objects']) {
        area.vnumRanges.objects = { low: ranges['objects']['low'] ?? 0, high: ranges['objects']['high'] ?? 0 };
      }
    }

    area.resetFrequency = (data['resetFrequency'] as number) ?? 15;
    area.flags = BigInt((data['flags'] as number | string) ?? 0);

    // Load sub-files
    await this.loadRooms(areaDir, area);
    await this.loadMobiles(areaDir, area);
    await this.loadObjects(areaDir, area);
    await this.loadResets(areaDir, area);
    await this.loadShops(areaDir, area);
    await this.loadPrograms(areaDir, area);

    return area;
  }

  /**
   * Parse rooms.json and create Room instances, register in VnumRegistry.
   */
  async loadRooms(areaDir: string, area: Area): Promise<void> {
    const filePath = path.join(areaDir, 'rooms.json');
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      this.logger.debug(LOG_DOMAIN, `No rooms.json in ${area.filename}`);
      return;
    }

    const roomsData = JSON.parse(raw) as Array<Record<string, unknown>>;

    for (const rd of roomsData) {
      const vnum = rd['vnum'] as number;
      const roomName = (rd['name'] as string) ?? '';
      const description = (rd['description'] as string) ?? '';

      const room = new Room(vnum, roomName, description);
      room.area = area;
      room.sectorType = (rd['sectorType'] as SectorType) ?? SectorType.Inside;
      room.roomFlags = BigInt((rd['roomFlags'] as number | string) ?? 0);
      room.light = (rd['light'] as number) ?? 0;
      room.teleportVnum = (rd['teleportVnum'] as number) ?? -1;
      room.teleportDelay = (rd['teleportDelay'] as number) ?? 0;
      room.tunnel = (rd['tunnel'] as number) ?? 0;

      // Parse exits
      const exitsData = (rd['exits'] as Array<Record<string, unknown>>) ?? [];
      for (const ed of exitsData) {
        const exit: Exit = {
          direction: (ed['direction'] as Direction) ?? Direction.North,
          toRoom: (ed['toRoom'] as number) ?? 0,
          keyword: (ed['keyword'] as string) ?? '',
          description: (ed['description'] as string) ?? '',
          flags: BigInt((ed['flags'] as number | string) ?? 0),
          key: (ed['key'] as number) ?? -1,
        };
        room.exits.set(exit.direction, exit);
      }

      // Parse extra descriptions
      const extraDescs = (rd['extraDescriptions'] as Array<Record<string, string>>) ?? [];
      for (const ed of extraDescs) {
        room.extraDescriptions.push({
          keywords: ed['keywords'] ?? '',
          description: ed['description'] ?? '',
        });
      }

      area.rooms.set(vnum, room);
      this.vnumRegistry.registerRoom(vnum, room);
    }
  }

  /**
   * Parse mobiles.json and create MobilePrototype for each, register in VnumRegistry.
   */
  async loadMobiles(areaDir: string, area: Area): Promise<void> {
    const filePath = path.join(areaDir, 'mobiles.json');
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      this.logger.debug(LOG_DOMAIN, `No mobiles.json in ${area.filename}`);
      return;
    }

    const mobsData = JSON.parse(raw) as Array<Record<string, unknown>>;

    for (const md of mobsData) {
      const vnum = md['vnum'] as number;
      const hitDiceRaw = md['hitDice'] as Record<string, number> | undefined;
      const damageDiceRaw = md['damageDice'] as Record<string, number> | undefined;

      const proto: MobilePrototype = {
        vnum,
        name: (md['name'] as string) ?? '',
        shortDesc: (md['shortDescription'] as string) ?? (md['shortDesc'] as string) ?? '',
        longDesc: (md['longDescription'] as string) ?? (md['longDesc'] as string) ?? '',
        description: (md['description'] as string) ?? '',
        actFlags: BigInt((md['actFlags'] as number | string) ?? 0),
        affectedBy: BigInt((md['affectedBy'] as number | string) ?? 0),
        alignment: (md['alignment'] as number) ?? 0,
        level: (md['level'] as number) ?? 1,
        hitroll: (md['hitroll'] as number) ?? 0,
        damroll: (md['damroll'] as number) ?? 0,
        hitDice: {
          num: hitDiceRaw?.['numDice'] ?? 1,
          size: hitDiceRaw?.['sizeDice'] ?? 8,
          bonus: hitDiceRaw?.['bonus'] ?? 0,
        },
        damageDice: {
          num: damageDiceRaw?.['numDice'] ?? 1,
          size: damageDiceRaw?.['sizeDice'] ?? 4,
          bonus: damageDiceRaw?.['bonus'] ?? 0,
        },
        gold: (md['gold'] as number) ?? 0,
        exp: (md['exp'] as number) ?? 0,
        sex: (md['sex'] as Sex) ?? Sex.Neutral,
        position: (md['position'] as Position) ?? Position.Standing,
        defaultPosition: (md['defaultPosition'] as Position) ?? Position.Standing,
        race: String(md['race'] ?? 'human'),
        class: String(md['class'] ?? 'warrior'),
        savingThrows: [
          (md['savingPoison'] as number) ?? 0,
          (md['savingRod'] as number) ?? 0,
          (md['savingPara'] as number) ?? 0,
          (md['savingBreath'] as number) ?? 0,
          (md['savingSpell'] as number) ?? 0,
        ],
        resistant: BigInt((md['resistant'] as number | string) ?? 0),
        immune: BigInt((md['immune'] as number | string) ?? 0),
        susceptible: BigInt((md['susceptible'] as number | string) ?? 0),
        speaks: (md['speaks'] as number) ?? 0,
        speaking: (md['speaking'] as number) ?? 0,
        numAttacks: (md['numAttacks'] as number) ?? 1,
        extraDescriptions: ((md['extraDescriptions'] as Array<ExtraDescription>) ?? []),
        shop: null,
        repairShop: null,
      };

      area.mobilePrototypes.set(vnum, proto);
      this.vnumRegistry.registerMobile(vnum, proto);
    }
  }

  /**
   * Parse objects.json and create ObjectPrototype for each, register in VnumRegistry.
   */
  async loadObjects(areaDir: string, area: Area): Promise<void> {
    const filePath = path.join(areaDir, 'objects.json');
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      this.logger.debug(LOG_DOMAIN, `No objects.json in ${area.filename}`);
      return;
    }

    const objsData = JSON.parse(raw) as Array<Record<string, unknown>>;

    for (const od of objsData) {
      const vnum = od['vnum'] as number;

      const affects = ((od['affects'] as Array<Record<string, number>>) ?? []).map(a => ({
        location: (a['location'] as ApplyType) ?? ApplyType.None,
        modifier: a['modifier'] ?? 0,
      }));

      const proto: ObjectPrototype = {
        vnum,
        name: (od['name'] as string) ?? '',
        shortDesc: (od['shortDescription'] as string) ?? (od['shortDesc'] as string) ?? '',
        longDesc: (od['longDescription'] as string) ?? (od['longDesc'] as string) ?? '',
        description: (od['description'] as string) ?? '',
        itemType: (od['itemType'] as ItemType) ?? ItemType.None,
        extraFlags: BigInt((od['extraFlags'] as number | string) ?? 0),
        wearFlags: BigInt((od['wearFlags'] as number | string) ?? 0),
        values: (od['values'] as number[]) ?? [0, 0, 0, 0, 0, 0],
        weight: (od['weight'] as number) ?? 1,
        cost: (od['cost'] as number) ?? 0,
        rent: (od['rent'] as number) ?? 0,
        level: (od['level'] as number) ?? 1,
        layers: (od['layers'] as number) ?? 0,
        extraDescriptions: ((od['extraDescriptions'] as Array<ExtraDescription>) ?? []),
        affects,
      };

      area.objectPrototypes.set(vnum, proto);
      this.vnumRegistry.registerObject(vnum, proto);
    }
  }

  /**
   * Parse resets.json and attach to area.
   */
  private async loadResets(areaDir: string, area: Area): Promise<void> {
    const filePath = path.join(areaDir, 'resets.json');
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return;
    }

    const resetsData = JSON.parse(raw) as Array<Record<string, unknown>>;
    for (const rd of resetsData) {
      const reset: ResetData = {
        command: (rd['command'] as ResetData['command']) ?? 'M',
        extra: (rd['extra'] as number) ?? 0,
        arg1: (rd['arg1'] as number) ?? 0,
        arg2: (rd['arg2'] as number) ?? 0,
        arg3: (rd['arg3'] as number) ?? 0,
        arg4: (rd['arg4'] as number) ?? 0,
        arg5: (rd['arg5'] as number) ?? 0,
        arg6: (rd['arg6'] as number) ?? 0,
        arg7: (rd['arg7'] as number) ?? 0,
      };
      area.resets.push(reset);
    }
  }

  /**
   * Parse shops.json and attach ShopData to the corresponding mobile prototype.
   */
  async loadShops(areaDir: string, area: Area): Promise<void> {
    const filePath = path.join(areaDir, 'shops.json');
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return;
    }

    const shopsData = JSON.parse(raw) as Array<Record<string, unknown>>;
    for (const sd of shopsData) {
      const keeper = (sd['keeper'] as number) ?? 0;
      const shopData: ShopData = {
        keeper,
        buyType: (sd['buyType'] as number[]) ?? [],
        profitBuy: (sd['profitBuy'] as number) ?? 120,
        profitSell: (sd['profitSell'] as number) ?? 80,
        openHour: (sd['openHour'] as number) ?? 0,
        closeHour: (sd['closeHour'] as number) ?? 23,
      };

      // Attach to the mobile prototype
      const mobProto = area.mobilePrototypes.get(keeper);
      if (mobProto) {
        mobProto.shop = shopData;
      } else {
        this.logger.warn(LOG_DOMAIN, `Shop keeper vnum ${keeper} not found in area ${area.filename}`);
      }
    }
  }

  /**
   * Parse programs.json and attach MudProg data to mob/obj/room prototypes.
   */
  async loadPrograms(areaDir: string, area: Area): Promise<void> {
    const filePath = path.join(areaDir, 'programs.json');
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf-8');
    } catch {
      return;
    }

    const data = JSON.parse(raw) as Record<string, unknown>;

    // Attach mob programs
    const mobProgs = (data['mobProgs'] as Array<Record<string, unknown>>) ?? [];
    for (const mp of mobProgs) {
      const vnum = mp['vnum'] as number | undefined;
      if (vnum !== undefined) {
        const room = area.rooms.get(vnum);
        if (room) {
          room.programs.push(mp);
        }
      }
    }

    // Attach room programs
    const roomProgs = (data['roomProgs'] as Array<Record<string, unknown>>) ?? [];
    for (const rp of roomProgs) {
      const vnum = rp['vnum'] as number | undefined;
      if (vnum !== undefined) {
        const room = area.rooms.get(vnum);
        if (room) {
          room.programs.push(rp);
        }
      }
    }
  }

  /**
   * After all areas are loaded, resolve exit toRoom vnums to actual Room references.
   * Exit.toRoom stores the destination vnum; we don't change Exit interface, 
   * but we log warnings for unresolved exits.
   */
  resolveExits(): void {
    let resolved = 0;
    let unresolved = 0;

    for (const area of this.areas.values()) {
      for (const room of area.rooms.values()) {
        for (const [_dir, exit] of room.exits) {
          const targetRoom = this.vnumRegistry.getRoom(exit.toRoom);
          if (targetRoom) {
            resolved++;
          } else {
            unresolved++;
            this.logger.warn(
              LOG_DOMAIN,
              `Unresolved exit: room ${room.vnum} direction ${exit.direction} → vnum ${exit.toRoom}`,
            );
          }
        }
      }
    }

    this.logger.info(LOG_DOMAIN, `Exit resolution: ${resolved} resolved, ${unresolved} unresolved`);
  }

  /** Get all loaded areas. */
  getAllAreas(): Area[] {
    return Array.from(this.areas.values());
  }

  /** Look up an area by its filename. */
  getAreaByFilename(filename: string): Area | undefined {
    return this.areas.get(filename);
  }

  /** Get the total number of loaded areas. */
  getAreaCount(): number {
    return this.areas.size;
  }
}
