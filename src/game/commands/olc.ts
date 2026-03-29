/**
 * olc.ts – Online Creation System for SMAUG 2.0.
 *
 * Provides in-game editing of rooms, mobiles, objects, MUDprogs, and areas.
 * Trust-gated to LEVEL_CREATOR (53+). Enforces vnum range assignments
 * per builder, with LEVEL_GREATER (58+) bypassing range checks.
 */

import type { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import { Room } from '../entities/Room.js';
import { Area } from '../entities/Area.js';
import {
  Position,
  Direction,
  SectorType,
  ItemType,
  ApplyType,
  EX_FLAGS,
  ROOM_FLAGS,
  ACT,
} from '../entities/types.js';
import type { MobilePrototype, ObjectPrototype, Exit } from '../entities/types.js';
import { toggleFlag } from '../../utils/BitVector.js';
import { Logger } from '../../utils/Logger.js';
import { CommandRegistry, type CommandDef, defaultCommandFlags, CommandLogLevel } from './CommandRegistry.js';
import { TRUST_LEVELS } from '../../admin/TrustLevels.js';
import type { VnumRegistry } from '../world/VnumRegistry.js';
import type { AreaManager } from '../world/AreaManager.js';

// =============================================================================
// Trust Level Constants
// =============================================================================

const LEVEL_CREATOR = TRUST_LEVELS.CREATOR;      // 53
const LEVEL_GREATER = TRUST_LEVELS.GREATER_GOD;   // 58

// =============================================================================
// Module-level dependencies (injected at registration)
// =============================================================================

// eslint-disable-next-line prefer-const
let logger: Logger | null = null;
let vnumRegistry: VnumRegistry | null = null;
let areaManager: AreaManager | null = null;

/** Set the logger instance for OLC commands. */
export function setOlcLogger(l: Logger): void { logger = l; }
/** Set the VnumRegistry instance. */
export function setOlcVnumRegistry(vr: VnumRegistry): void { vnumRegistry = vr; }
/** Set the AreaManager instance. */
export function setOlcAreaManager(am: AreaManager): void { areaManager = am; }

// =============================================================================
// Vnum Range Enforcement
// =============================================================================

/** Types of vnums. */
export type VnumType = 'room' | 'mobile' | 'object';

/**
 * Check if a player can modify a vnum.
 * Trust >= LEVEL_GREATER bypasses range checks.
 */
export function canModifyVnum(player: Player, vnum: number, type: VnumType): boolean {
  if (player.getTrust() >= LEVEL_GREATER) return true;

  const pd = player.pcData;

  switch (type) {
    case 'room':
      return vnum >= pd.rRangeLo && vnum <= pd.rRangeHi;
    case 'mobile':
      return vnum >= pd.mRangeLo && vnum <= pd.mRangeHi;
    case 'object':
      return vnum >= pd.oRangeLo && vnum <= pd.oRangeHi;
  }
}

// =============================================================================
// Direction helpers
// =============================================================================

const DIR_MAP: Record<string, Direction> = {
  north: Direction.North, south: Direction.South,
  east: Direction.East, west: Direction.West,
  up: Direction.Up, down: Direction.Down,
  n: Direction.North, s: Direction.South,
  e: Direction.East, w: Direction.West,
  u: Direction.Up, d: Direction.Down,
};

function getDirectionNumber(name: string): Direction | -1 {
  return DIR_MAP[name.toLowerCase()] ?? -1;
}

// =============================================================================
// Exit flag helpers
// =============================================================================

const EXIT_FLAG_MAP: Record<string, bigint> = {
  door:      EX_FLAGS.ISDOOR,
  closed:    EX_FLAGS.CLOSED,
  locked:    EX_FLAGS.LOCKED,
  hidden:    EX_FLAGS.HIDDEN,
  pickproof: EX_FLAGS.PICKPROOF,
  secret:    EX_FLAGS.SECRET,
};

function getExitFlag(name: string): bigint {
  return EXIT_FLAG_MAP[name.toLowerCase()] ?? 0n;
}

// =============================================================================
// Sector type helpers
// =============================================================================

const SECTOR_MAP: Record<string, SectorType> = {
  inside:        SectorType.Inside,
  city:          SectorType.City,
  field:         SectorType.Field,
  forest:        SectorType.Forest,
  hills:         SectorType.Hills,
  mountain:      SectorType.Mountain,
  water_swim:    SectorType.WaterSwim,
  water_noswim:  SectorType.WaterNoSwim,
  air:           SectorType.Air,
  desert:        SectorType.Desert,
  underwater:    SectorType.Underwater,
  lava:          SectorType.Lava,
  swamp:         SectorType.Swamp,
};

function getSectorType(name: string): SectorType | -1 {
  return SECTOR_MAP[name.toLowerCase()] ?? -1;
}

// =============================================================================
// Room flag helpers
// =============================================================================

const ROOM_FLAG_MAP: Record<string, bigint> = {
  dark:       ROOM_FLAGS.DARK,
  death:      ROOM_FLAGS.DEATH,
  nomob:      ROOM_FLAGS.NO_MOB,
  indoors:    ROOM_FLAGS.INDOORS,
  nomagic:    ROOM_FLAGS.NO_MAGIC,
  tunnel:     ROOM_FLAGS.TUNNEL,
  private:    ROOM_FLAGS.PRIVATE,
  safe:       ROOM_FLAGS.SAFE,
  norecall:   ROOM_FLAGS.NO_RECALL,
  teleport:   ROOM_FLAGS.TELEPORT,
  silence:    ROOM_FLAGS.SILENCE,
};

function getRoomFlag(name: string): bigint {
  return ROOM_FLAG_MAP[name.toLowerCase()] ?? 0n;
}

// =============================================================================
// Item type helpers
// =============================================================================

const ITEM_TYPE_MAP: Record<string, ItemType> = {
  light:     ItemType.Light,
  scroll:    ItemType.Scroll,
  wand:      ItemType.Wand,
  staff:     ItemType.Staff,
  weapon:    ItemType.Weapon,
  treasure:  ItemType.Treasure,
  armor:     ItemType.Armor,
  potion:    ItemType.Potion,
  furniture: ItemType.Furniture,
  trash:     ItemType.Trash,
  container: ItemType.Container,
  drink:     ItemType.DrinkCon,
  key:       ItemType.Key,
  food:      ItemType.Food,
  money:     ItemType.Money,
  boat:      ItemType.Boat,
  fountain:  ItemType.Fountain,
  pill:      ItemType.Pill,
  map:       ItemType.Map,
  portal:    ItemType.Portal,
};

function getItemType(name: string): ItemType | -1 {
  return ITEM_TYPE_MAP[name.toLowerCase()] ?? -1;
}

// =============================================================================
// Apply type helpers
// =============================================================================

const APPLY_TYPE_MAP: Record<string, ApplyType> = {
  str:      ApplyType.Str,
  int:      ApplyType.Int,
  wis:      ApplyType.Wis,
  dex:      ApplyType.Dex,
  con:      ApplyType.Con,
  cha:      ApplyType.Cha,
  lck:      ApplyType.Lck,
  hp:       ApplyType.Hit,
  mana:     ApplyType.Mana,
  move:     ApplyType.Move,
  ac:       ApplyType.AC,
  hitroll:  ApplyType.Hitroll,
  damroll:  ApplyType.Damroll,
  saves:    ApplyType.SavingSpell,
};

function getApplyType(name: string): ApplyType | -1 {
  return APPLY_TYPE_MAP[name.toLowerCase()] ?? -1;
}

// =============================================================================
// Area lookup helper
// =============================================================================

function findAreaForVnum(vnum: number, type: VnumType): Area | null {
  if (!areaManager) return null;
  for (const area of areaManager.getAllAreas()) {
    switch (type) {
      case 'room':
        if (vnum >= area.vnumRanges.rooms.low && vnum <= area.vnumRanges.rooms.high) return area;
        break;
      case 'mobile':
        if (vnum >= area.vnumRanges.mobiles.low && vnum <= area.vnumRanges.mobiles.high) return area;
        break;
      case 'object':
        if (vnum >= area.vnumRanges.objects.low && vnum <= area.vnumRanges.objects.high) return area;
        break;
    }
  }
  return null;
}

// =============================================================================
// Room Editor (redit)
// =============================================================================

/**
 * doRedit – Room editor.
 * Syntax: redit [subcommand] [args]
 */
export function doRedit(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;
  const room = ch.inRoom as Room | null;
  if (!room) return;

  if (!canModifyVnum(ch, room.vnum, 'room')) {
    ch.sendToChar('That room is not in your assigned vnum range.\r\n');
    return;
  }

  const args = arg.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase() || '';

  switch (subcommand) {
    case 'name':
      room.name = args.slice(1).join(' ');
      if (room.area) (room.area as any).modified = true;
      ch.sendToChar('Room name set.\r\n');
      break;

    case 'desc':
      ch.pcData.editMode = 'room_desc';
      ch.pcData.editBuffer = room.description.split('\n');
      ch.sendToChar('Enter room description. Type @ on a blank line to finish.\r\n');
      break;

    case 'ed': {
      const keyword = args[1];
      if (!keyword) {
        ch.sendToChar('Syntax: redit ed <keyword>\r\n');
        return;
      }
      ch.pcData.editMode = 'room_ed';
      ch.pcData.editKeyword = keyword;
      ch.pcData.editBuffer = [];
      ch.sendToChar(`Enter extra description for '${keyword}'. Type @ to finish.\r\n`);
      break;
    }

    case 'exit': {
      const dirName = args[1]?.toLowerCase() || '';
      const destVnum = parseInt(args[2] ?? "", 10);

      const dir = getDirectionNumber(dirName);
      if (dir === -1) {
        ch.sendToChar('Invalid direction. Use: north, south, east, west, up, down.\r\n');
        return;
      }

      if (isNaN(destVnum)) {
        ch.sendToChar('Syntax: redit exit <direction> <destination_vnum>\r\n');
        return;
      }

      if (vnumRegistry) {
        const destRoom = vnumRegistry.getRoom(destVnum);
        if (!destRoom) {
          ch.sendToChar('Destination room does not exist.\r\n');
          return;
        }
      }

      // Create or modify exit
      const existing = room.exits.get(dir);
      if (existing) {
        existing.toRoom = destVnum;
      } else {
        const newExit: Exit = {
          direction: dir,
          description: '',
          keyword: '',
          flags: 0n,
          key: 0,
          toRoom: destVnum,
        };
        room.exits.set(dir, newExit);
      }

      if (room.area) (room.area as any).modified = true;
      ch.sendToChar(`Exit ${dirName} now leads to room ${destVnum}.\r\n`);
      break;
    }

    case 'exflag': {
      const dirName = args[1]?.toLowerCase() || '';
      const flagName = args[2]?.toLowerCase() || '';

      const dir = getDirectionNumber(dirName);
      if (dir === -1 || !room.exits.has(dir)) {
        ch.sendToChar('No exit in that direction.\r\n');
        return;
      }

      const flag = getExitFlag(flagName);
      if (flag === 0n) {
        ch.sendToChar('Valid flags: door, closed, locked, hidden, pickproof, secret.\r\n');
        return;
      }

      const exit = room.exits.get(dir)!;
      exit.flags = toggleFlag(exit.flags, flag);
      if (room.area) (room.area as any).modified = true;
      ch.sendToChar(`Exit flag ${flagName} toggled.\r\n`);
      break;
    }

    case 'exkey': {
      const dirName = args[1]?.toLowerCase() || '';
      const keyVnum = parseInt(args[2] ?? "", 10);

      const dir = getDirectionNumber(dirName);
      if (dir === -1 || !room.exits.has(dir)) {
        ch.sendToChar('No exit in that direction.\r\n');
        return;
      }

      room.exits.get(dir)!.key = keyVnum;
      if (room.area) (room.area as any).modified = true;
      ch.sendToChar(`Exit key set to ${keyVnum}.\r\n`);
      break;
    }

    case 'sector': {
      const sectorName = args[1]?.toLowerCase() || '';
      const sector = getSectorType(sectorName);
      if (sector === -1) {
        ch.sendToChar('Valid sectors: inside, city, field, forest, hills, mountain, water_swim, water_noswim, air, desert.\r\n');
        return;
      }
      room.sectorType = sector;
      if (room.area) (room.area as any).modified = true;
      ch.sendToChar(`Sector type set to ${sectorName}.\r\n`);
      break;
    }

    case 'flags': {
      const flagNames = args.slice(1);
      for (const flagName of flagNames) {
        const flag = getRoomFlag(flagName.toLowerCase());
        if (flag !== 0n) {
          room.roomFlags = toggleFlag(room.roomFlags, flag);
          ch.sendToChar(`Room flag ${flagName} toggled.\r\n`);
        } else {
          ch.sendToChar(`Unknown room flag: ${flagName}\r\n`);
        }
      }
      if (room.area) (room.area as any).modified = true;
      break;
    }

    case 'tunnel': {
      const count = parseInt(args[1] ?? "", 10);
      if (isNaN(count) || count < 0) {
        ch.sendToChar('Syntax: redit tunnel <count>\r\n');
        return;
      }
      room.tunnel = count;
      if (room.area) (room.area as any).modified = true;
      ch.sendToChar(`Tunnel limit set to ${count}.\r\n`);
      break;
    }

    case 'teleport': {
      const destVnum = parseInt(args[1] ?? "", 10);
      const delay = parseInt(args[2] ?? "", 10) || 0;

      if (isNaN(destVnum)) {
        ch.sendToChar('Syntax: redit teleport <vnum> [delay]\r\n');
        return;
      }

      room.teleportVnum = destVnum;
      room.teleportDelay = delay;
      if (room.area) (room.area as any).modified = true;
      ch.sendToChar(`Teleport set to room ${destVnum} with ${delay} tick delay.\r\n`);
      break;
    }

    case 'create': {
      const newVnum = parseInt(args[1] ?? "", 10);
      if (isNaN(newVnum)) {
        ch.sendToChar('Syntax: redit create <vnum>\r\n');
        return;
      }

      if (!canModifyVnum(ch, newVnum, 'room')) {
        ch.sendToChar('That vnum is not in your assigned range.\r\n');
        return;
      }

      if (vnumRegistry?.getRoom(newVnum)) {
        ch.sendToChar('A room with that vnum already exists.\r\n');
        return;
      }

      const newRoom = new Room(newVnum, 'A New Room', 'You are in an unfinished room.\r\n');
      newRoom.area = room.area;

      if (vnumRegistry) {
        vnumRegistry.registerRoom(newVnum, newRoom);
      }
      if (room.area) {
        room.area.rooms.set(newVnum, newRoom);
        (room.area as any).modified = true;
      }

      ch.sendToChar(`Room ${newVnum} created.\r\n`);
      break;
    }

    case 'done':
    case '': {
      // Show current room stats
      let output = `Room: ${room.vnum}  Name: ${room.name}\r\n`;
      output += `Sector: ${room.sectorType}  Flags: ${room.roomFlags.toString(16)}\r\n`;
      output += `Tunnel: ${room.tunnel}  Teleport: ${room.teleportVnum}\r\n`;
      output += `Description:\r\n${room.description}\r\n`;

      const exits: string[] = [];
      for (const [dir, exit] of room.exits) {
        exits.push(`${dir}→${exit.toRoom}`);
      }
      output += `Exits: ${exits.length > 0 ? exits.join(', ') : 'none'}\r\n`;

      ch.sendToChar(output);
      break;
    }

    default:
      ch.sendToChar('Redit subcommands: name, desc, ed, exit, exflag, exkey, sector, flags, tunnel, teleport, create, done\r\n');
  }
}

// =============================================================================
// Mobile Editor (medit)
// =============================================================================

/**
 * doMedit – Mobile editor.
 * Syntax: medit <vnum> | medit create <vnum> | medit <subcommand> <args>
 */
export function doMedit(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  const args = arg.trim().split(/\s+/);

  // Check for create subcommand
  if (args[0]?.toLowerCase() === 'create') {
    const vnum = parseInt(args[1] ?? "", 10);
    if (isNaN(vnum)) {
      ch.sendToChar('Syntax: medit create <vnum>\r\n');
      return;
    }

    if (!canModifyVnum(ch, vnum, 'mobile')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }

    if (vnumRegistry?.getMobile(vnum)) {
      ch.sendToChar('A mobile with that vnum already exists.\r\n');
      return;
    }

    // Create new mobile prototype
    const proto: MobilePrototype = {
      vnum,
      name: 'a new mobile',
      shortDesc: 'a new mobile',
      longDesc: 'A new mobile stands here.\r\n',
      description: '',
      actFlags: ACT.IS_NPC,
      affectedBy: 0n,
      alignment: 0,
      level: 1,
      hitroll: 0,
      damroll: 0,
      hitDice: { num: 1, size: 8, bonus: 10 },
      damageDice: { num: 1, size: 4, bonus: 0 },
      gold: 0,
      exp: 0,
      sex: 0,
      position: Position.Standing,
      defaultPosition: Position.Standing,
      race: 'human',
      class: 'warrior',
      savingThrows: [0, 0, 0, 0, 0],
      resistant: 0n,
      immune: 0n,
      susceptible: 0n,
      speaks: 0,
      speaking: 0,
      numAttacks: 1,
      extraDescriptions: [],
      shop: null,
      repairShop: null,
    };

    const area = findAreaForVnum(vnum, 'mobile');
    if (area) {
      area.mobilePrototypes.set(vnum, proto);
      (area as any).modified = true;
    }

    if (vnumRegistry) {
      vnumRegistry.registerMobile(vnum, proto);
    }

    ch.pcData.editingMob = proto;
    ch.sendToChar(`Mobile ${vnum} created. Use medit subcommands to modify.\r\n`);
    logger?.info('olc', `${ch.name} created mobile ${vnum}`);
    return;
  }

  // Try to select an existing mob by vnum
  const vnum = parseInt(args[0] ?? "", 10);
  if (!isNaN(vnum)) {
    if (!vnumRegistry) { ch.sendToChar('VnumRegistry not available.\r\n'); return; }
    const proto = vnumRegistry.getMobile(vnum);
    if (!proto) {
      ch.sendToChar('No mobile has that vnum.\r\n');
      return;
    }

    if (!canModifyVnum(ch, vnum, 'mobile')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }

    ch.pcData.editingMob = proto;
    showMobStats(ch, proto);
    return;
  }

  // Subcommand on currently editing mob
  if (!ch.pcData.editingMob) {
    ch.sendToChar('You are not editing a mobile. Use: medit <vnum>\r\n');
    return;
  }

  const mob = ch.pcData.editingMob as MobilePrototype;
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(' ');

  switch (subcommand) {
    case 'name':
      mob.name = value;
      ch.sendToChar('Name set.\r\n');
      break;
    case 'short':
      mob.shortDesc = value;
      ch.sendToChar('Short description set.\r\n');
      break;
    case 'long':
      mob.longDesc = value + '\r\n';
      ch.sendToChar('Long description set.\r\n');
      break;
    case 'desc':
      ch.pcData.editMode = 'mob_desc';
      ch.pcData.editBuffer = mob.description.split('\n');
      ch.sendToChar('Enter description. Type @ to finish.\r\n');
      break;
    case 'level': {
      const level = parseInt(value, 10);
      if (isNaN(level) || level < 1 || level > 100) {
        ch.sendToChar('Level must be 1-100.\r\n');
        return;
      }
      mob.level = level;
      // Auto-calculate stats from level (legacy formula)
      mob.hitDice = { num: level, size: 8, bonus: level * 4 };
      mob.damroll = Math.floor(level / 4);
      mob.hitroll = Math.floor(level / 3);
      ch.sendToChar(`Level set to ${level}. Stats auto-calculated.\r\n`);
      break;
    }
    case 'alignment': {
      const align = parseInt(value, 10);
      if (isNaN(align)) { ch.sendToChar('Alignment must be a number.\r\n'); return; }
      mob.alignment = Math.max(-1000, Math.min(1000, align));
      ch.sendToChar(`Alignment set to ${mob.alignment}.\r\n`);
      break;
    }
    case 'act': {
      const flagValue = parseBigintValue(value);
      if (flagValue !== null) {
        mob.actFlags = flagValue | ACT.IS_NPC;
        ch.sendToChar('Act flags set.\r\n');
      } else {
        ch.sendToChar('Invalid flag value.\r\n');
      }
      break;
    }
    case 'affected': {
      const flagValue = parseBigintValue(value);
      if (flagValue !== null) {
        mob.affectedBy = flagValue;
        ch.sendToChar('Affected-by flags set.\r\n');
      } else {
        ch.sendToChar('Invalid flag value.\r\n');
      }
      break;
    }
    case 'race':
      mob.race = value;
      ch.sendToChar(`Race set to ${value}.\r\n`);
      break;
    case 'class':
      mob.class = value;
      ch.sendToChar(`Class set to ${value}.\r\n`);
      break;
    case 'sex': {
      const sexMap: Record<string, number> = { neutral: 0, male: 1, female: 2 };
      const sex = sexMap[value.toLowerCase()];
      if (sex === undefined) { ch.sendToChar('Valid sex: neutral, male, female.\r\n'); return; }
      mob.sex = sex;
      ch.sendToChar(`Sex set to ${value}.\r\n`);
      break;
    }
    case 'gold':
      mob.gold = parseInt(value, 10) || 0;
      ch.sendToChar(`Gold set to ${mob.gold}.\r\n`);
      break;
    case 'position': {
      const posMap: Record<string, Position> = {
        standing: Position.Standing,
        sitting: Position.Sitting,
        resting: Position.Resting,
        sleeping: Position.Sleeping,
        fighting: Position.Fighting,
      };
      const pos = posMap[value.toLowerCase()];
      if (pos === undefined) { ch.sendToChar('Valid positions: standing, sitting, resting, sleeping.\r\n'); return; }
      mob.position = pos;
      mob.defaultPosition = pos;
      ch.sendToChar(`Position set to ${value}.\r\n`);
      break;
    }
    case 'done': {
      const area = findAreaForVnum(mob.vnum, 'mobile');
      if (area) (area as any).modified = true;
      ch.pcData.editingMob = null;
      ch.sendToChar('Mobile editing complete.\r\n');
      break;
    }
    default:
      ch.sendToChar('Medit subcommands: name, short, long, desc, level, alignment, act, affected, race, class, sex, gold, position, done\r\n');
  }
}

function showMobStats(ch: Character, mob: MobilePrototype): void {
  let output = `Vnum: ${mob.vnum}  Name: ${mob.name}\r\n`;
  output += `Short: ${mob.shortDesc}\r\n`;
  output += `Long: ${mob.longDesc}`;
  output += `Level: ${mob.level}  Alignment: ${mob.alignment}\r\n`;
  output += `Race: ${mob.race}  Class: ${mob.class}  Sex: ${mob.sex}\r\n`;
  output += `HP Dice: ${mob.hitDice.num}d${mob.hitDice.size}+${mob.hitDice.bonus}\r\n`;
  output += `Dam Dice: ${mob.damageDice.num}d${mob.damageDice.size}+${mob.damageDice.bonus}\r\n`;
  output += `Hitroll: ${mob.hitroll}  Damroll: ${mob.damroll}  Gold: ${mob.gold}\r\n`;
  output += `Act: ${mob.actFlags.toString(16)}  Affected: ${mob.affectedBy.toString(16)}\r\n`;
  ch.sendToChar(output);
}

// =============================================================================
// Object Editor (oedit)
// =============================================================================

/**
 * doOedit – Object editor.
 * Syntax: oedit <vnum> | oedit create <vnum> | oedit <subcommand> <args>
 */
export function doOedit(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  const args = arg.trim().split(/\s+/);

  // Check for create subcommand
  if (args[0]?.toLowerCase() === 'create') {
    const vnum = parseInt(args[1] ?? "", 10);
    if (isNaN(vnum)) {
      ch.sendToChar('Syntax: oedit create <vnum>\r\n');
      return;
    }

    if (!canModifyVnum(ch, vnum, 'object')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }

    if (vnumRegistry?.getObject(vnum)) {
      ch.sendToChar('An object with that vnum already exists.\r\n');
      return;
    }

    // Create new object prototype
    const proto: ObjectPrototype = {
      vnum,
      name: 'a new object',
      shortDesc: 'a new object',
      longDesc: 'A new object is here.\r\n',
      description: '',
      itemType: ItemType.Trash,
      extraFlags: 0n,
      wearFlags: 0n,
      values: [0, 0, 0, 0, 0, 0],
      weight: 1,
      cost: 0,
      rent: 0,
      level: 1,
      layers: 0,
      extraDescriptions: [],
      affects: [],
    };

    const area = findAreaForVnum(vnum, 'object');
    if (area) {
      area.objectPrototypes.set(vnum, proto);
      (area as any).modified = true;
    }

    if (vnumRegistry) {
      vnumRegistry.registerObject(vnum, proto);
    }

    ch.pcData.editingObj = proto;
    ch.sendToChar(`Object ${vnum} created. Use oedit subcommands to modify.\r\n`);
    return;
  }

  // Try to select an existing object by vnum
  const vnum = parseInt(args[0] ?? "", 10);
  if (!isNaN(vnum)) {
    if (!vnumRegistry) { ch.sendToChar('VnumRegistry not available.\r\n'); return; }
    const proto = vnumRegistry.getObject(vnum);
    if (!proto) {
      ch.sendToChar('No object has that vnum.\r\n');
      return;
    }

    if (!canModifyVnum(ch, vnum, 'object')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }

    ch.pcData.editingObj = proto;
    showObjStats(ch, proto);
    return;
  }

  // Subcommand on currently editing object
  if (!ch.pcData.editingObj) {
    ch.sendToChar('You are not editing an object. Use: oedit <vnum>\r\n');
    return;
  }

  const obj = ch.pcData.editingObj as ObjectPrototype;
  const subcommand = args[0]?.toLowerCase();
  const value = args.slice(1).join(' ');

  switch (subcommand) {
    case 'name':
      obj.name = value;
      ch.sendToChar('Name set.\r\n');
      break;
    case 'short':
      obj.shortDesc = value;
      ch.sendToChar('Short description set.\r\n');
      break;
    case 'long':
      obj.longDesc = value + '\r\n';
      ch.sendToChar('Long description set.\r\n');
      break;
    case 'type': {
      const itemType = getItemType(value);
      if (itemType === -1) {
        ch.sendToChar('Valid types: light, scroll, wand, staff, weapon, treasure, armor, potion, furniture, trash, container, drink, key, food, money, boat, fountain, pill, map, portal.\r\n');
        return;
      }
      obj.itemType = itemType;
      ch.sendToChar(`Item type set to ${value}.\r\n`);
      break;
    }
    case 'flags': {
      const flagValue = parseBigintValue(value);
      if (flagValue !== null) {
        obj.extraFlags = flagValue;
        ch.sendToChar('Extra flags set.\r\n');
      } else {
        ch.sendToChar('Invalid flag value.\r\n');
      }
      break;
    }
    case 'wear': {
      const flagValue = parseBigintValue(value);
      if (flagValue !== null) {
        obj.wearFlags = flagValue;
        ch.sendToChar('Wear flags set.\r\n');
      } else {
        ch.sendToChar('Invalid flag value.\r\n');
      }
      break;
    }
    case 'weight':
      obj.weight = parseInt(value, 10) || 0;
      ch.sendToChar(`Weight set to ${obj.weight}.\r\n`);
      break;
    case 'cost':
      obj.cost = parseInt(value, 10) || 0;
      ch.sendToChar(`Cost set to ${obj.cost}.\r\n`);
      break;
    case 'value0':
    case 'value1':
    case 'value2':
    case 'value3':
    case 'value4':
    case 'value5': {
      const idx = parseInt(subcommand.charAt(5), 10);
      obj.values[idx] = parseInt(value, 10) || 0;
      ch.sendToChar(`Value${idx} set to ${obj.values[idx]}.\r\n`);
      break;
    }
    case 'affect': {
      const affParts = value.split(/\s+/);
      const applyTypeName = affParts[0];
      const modifier = parseInt(affParts[1] ?? '', 10);

      if (!applyTypeName || isNaN(modifier)) {
        ch.sendToChar('Syntax: oedit affect <type> <modifier>\r\n');
        ch.sendToChar('Valid apply types: str, int, wis, dex, con, cha, lck, hp, mana, move, ac, hitroll, damroll, saves.\r\n');
        return;
      }

      const location = getApplyType(applyTypeName);
      if (location === -1) {
        ch.sendToChar('Valid apply types: str, int, wis, dex, con, cha, lck, hp, mana, move, ac, hitroll, damroll, saves.\r\n');
        return;
      }

      obj.affects.push({ location, modifier });
      ch.sendToChar(`Affect added: ${applyTypeName} ${modifier}.\r\n`);
      break;
    }
    case 'layers':
      obj.layers = parseInt(value, 10) || 0;
      ch.sendToChar(`Layers set to ${obj.layers}.\r\n`);
      break;
    case 'done': {
      const area = findAreaForVnum(obj.vnum, 'object');
      if (area) (area as any).modified = true;
      ch.pcData.editingObj = null;
      ch.sendToChar('Object editing complete.\r\n');
      break;
    }
    default:
      ch.sendToChar('Oedit subcommands: name, short, long, type, flags, wear, weight, cost, value0-5, affect, layers, done\r\n');
  }
}

function showObjStats(ch: Character, obj: ObjectPrototype): void {
  let output = `Vnum: ${obj.vnum}  Name: ${obj.name}\r\n`;
  output += `Short: ${obj.shortDesc}\r\n`;
  output += `Type: ${obj.itemType}  Level: ${obj.level}\r\n`;
  output += `Weight: ${obj.weight}  Cost: ${obj.cost}  Layers: ${obj.layers}\r\n`;
  output += `Values: ${obj.values.join(' ')}\r\n`;
  output += `Extra flags: ${obj.extraFlags.toString(16)}\r\n`;
  output += `Wear flags: ${obj.wearFlags.toString(16)}\r\n`;

  if (obj.affects.length > 0) {
    output += 'Affects:\r\n';
    for (const aff of obj.affects) {
      output += `  location ${aff.location} modifier ${aff.modifier}\r\n`;
    }
  }

  ch.sendToChar(output);
}

// =============================================================================
// MUDprog Editor (mpedit)
// =============================================================================

/** MUDprog trigger types. */
const TRIGGER_MAP: Record<string, number> = {
  greet: 0, speech: 1, death: 2, fight: 3, hitprcnt: 4,
  give: 5, bribe: 6, rand: 7, entry: 8, act: 9,
};

const TRIGGER_NAMES: Record<number, string> = {};
for (const [name, num] of Object.entries(TRIGGER_MAP)) {
  TRIGGER_NAMES[num] = name;
}

/** MUDprog structure (stored on prototype). */
export interface MudProg {
  triggerType: number;
  argList: string;
  commandList: string;
}

/**
 * doMpedit – MUDprog editor.
 * Syntax: mpedit <vnum> <add|edit|delete|list> [args]
 */
export function doMpedit(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  const args = arg.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase();

  // Get the mob being edited
  const mob = ch.pcData.editingMob as MobilePrototype | null;
  if (!mob) {
    ch.sendToChar('No mobile to edit. Use medit first.\r\n');
    return;
  }

  // Ensure mudprogs array exists on prototype (extend if needed)
  if (!(mob as any).mudProgs) {
    (mob as any).mudProgs = [];
  }
  const mudProgs: MudProg[] = (mob as any).mudProgs;

  switch (subcommand) {
    case 'add': {
      const triggerName = args[1]?.toLowerCase();
      const triggerArg = args.slice(2).join(' ');

      if (!triggerName || TRIGGER_MAP[triggerName] === undefined) {
        ch.sendToChar('Valid triggers: greet, speech, death, fight, hitprcnt, give, bribe, rand, entry, act.\r\n');
        return;
      }

      const prog: MudProg = {
        triggerType: TRIGGER_MAP[triggerName],
        argList: triggerArg,
        commandList: '',
      };

      mudProgs.push(prog);
      ch.pcData.editingProg = prog;
      ch.pcData.editMode = 'mudprog';
      ch.pcData.editBuffer = [];
      ch.sendToChar('MUDprog added. Enter commands, type @ to finish.\r\n');
      break;
    }

    case 'edit': {
      const progNum = parseInt(args[1] ?? "", 10) - 1;
      if (progNum < 0 || progNum >= mudProgs.length) {
        ch.sendToChar('Invalid program number.\r\n');
        return;
      }

      const prog = mudProgs[progNum];
      if (!prog) { ch.sendToChar('Invalid program number.\r\n'); return; }
      ch.pcData.editingProg = prog;
      ch.pcData.editMode = 'mudprog';
      ch.pcData.editBuffer = prog.commandList.split('\n');
      ch.sendToChar(`Editing program ${progNum + 1}. Current commands:\r\n${prog.commandList}\r\nType @ to finish.\r\n`);
      break;
    }

    case 'delete': {
      const progNum = parseInt(args[1] ?? "", 10) - 1;
      if (progNum < 0 || progNum >= mudProgs.length) {
        ch.sendToChar('Invalid program number.\r\n');
        return;
      }

      mudProgs.splice(progNum, 1);
      ch.sendToChar(`Program ${progNum + 1} deleted.\r\n`);
      break;
    }

    case 'list': {
      if (mudProgs.length === 0) {
        ch.sendToChar('No MUDprogs on this mobile.\r\n');
        return;
      }

      let output = `MUDprogs on ${mob.shortDesc}:\r\n`;
      for (let i = 0; i < mudProgs.length; i++) {
        const prog = mudProgs[i]!;
        const trigName = TRIGGER_NAMES[prog.triggerType] ?? 'unknown';
        output += `${i + 1}. ${trigName} (${prog.argList})\r\n`;
      }
      ch.sendToChar(output);
      break;
    }

    default:
      ch.sendToChar('Mpedit subcommands: add, edit, delete, list\r\n');
  }
}

// =============================================================================
// Area Editor (aedit)
// =============================================================================

/**
 * doAedit – Area editor.
 * Syntax: aedit [subcommand] [args]
 */
export function doAedit(ch: Character, arg: string): void {
  if (ch.getTrust() < LEVEL_CREATOR) { ch.sendToChar('Huh?\r\n'); return; }
  if (!(ch instanceof Player)) return;

  const room = ch.inRoom as Room | null;
  if (!room?.area) {
    ch.sendToChar('You are not in an area.\r\n');
    return;
  }

  const area = room.area;
  const args = arg.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase() || '';

  switch (subcommand) {
    case 'name':
      area.name = args.slice(1).join(' ');
      (area as any).modified = true;
      ch.sendToChar('Area name set.\r\n');
      break;

    case 'author':
      area.author = args.slice(1).join(' ');
      (area as any).modified = true;
      ch.sendToChar('Area author set.\r\n');
      break;

    case 'resetfreq': {
      const freq = parseInt(args[1] ?? "", 10);
      if (isNaN(freq) || freq < 1) {
        ch.sendToChar('Syntax: aedit resetfreq <minutes>\r\n');
        return;
      }
      area.resetFrequency = freq;
      (area as any).modified = true;
      ch.sendToChar(`Reset frequency set to ${freq} minutes.\r\n`);
      break;
    }

    case 'resetmsg':
      (area as any).resetMessage = args.slice(1).join(' ');
      (area as any).modified = true;
      ch.sendToChar('Reset message set.\r\n');
      break;

    case 'levelrange': {
      const parsed = args.slice(1).map(v => parseInt(v, 10));
      const low = parsed[0] ?? NaN;
      const high = parsed[1] ?? NaN;
      if (isNaN(low) || isNaN(high)) {
        ch.sendToChar('Syntax: aedit levelrange <low> <high>\r\n');
        return;
      }
      (area as any).lowLevel = low;
      (area as any).highLevel = high;
      (area as any).modified = true;
      ch.sendToChar(`Level range set to ${low}-${high}.\r\n`);
      break;
    }

    case 'vnumrange': {
      const parsed = args.slice(1).map(v => parseInt(v, 10));
      const low = parsed[0] ?? NaN;
      const high = parsed[1] ?? NaN;
      if (isNaN(low) || isNaN(high)) {
        ch.sendToChar('Syntax: aedit vnumrange <low> <high>\r\n');
        return;
      }
      area.vnumRanges.rooms = { low, high };
      area.vnumRanges.mobiles = { low, high };
      area.vnumRanges.objects = { low, high };
      (area as any).modified = true;
      ch.sendToChar(`Vnum range set to ${low}-${high}.\r\n`);
      break;
    }

    case 'done':
    case '': {
      let output = `Area: ${area.name}\r\n`;
      output += `Author: ${area.author}  Filename: ${area.filename}\r\n`;
      output += `Reset freq: ${area.resetFrequency}  Age: ${area.age}\r\n`;
      output += `Room vnums: ${area.vnumRanges.rooms.low}-${area.vnumRanges.rooms.high}\r\n`;
      output += `Mob vnums: ${area.vnumRanges.mobiles.low}-${area.vnumRanges.mobiles.high}\r\n`;
      output += `Obj vnums: ${area.vnumRanges.objects.low}-${area.vnumRanges.objects.high}\r\n`;
      output += `Rooms: ${area.rooms.size}  Mobs: ${area.mobilePrototypes.size}  Objects: ${area.objectPrototypes.size}\r\n`;
      ch.sendToChar(output);
      break;
    }

    default:
      ch.sendToChar('Aedit subcommands: name, author, resetfreq, resetmsg, levelrange, vnumrange, done\r\n');
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse a bigint value from a string (supports hex with 0x prefix or decimal).
 */
function parseBigintValue(str: string): bigint | null {
  try {
    const trimmed = str.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      return BigInt(trimmed);
    }
    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return null;
    return BigInt(num);
  } catch {
    return null;
  }
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register all OLC commands with the CommandRegistry.
 */
export function registerOlcCommands(registry: CommandRegistry): void {
  const olcCommands: Omit<CommandDef, 'useCount' | 'lagCount' | 'flags'>[] = [
    { name: 'redit',  handler: doRedit,  minPosition: Position.Dead, minTrust: LEVEL_CREATOR, logLevel: CommandLogLevel.Build },
    { name: 'medit',  handler: doMedit,  minPosition: Position.Dead, minTrust: LEVEL_CREATOR, logLevel: CommandLogLevel.Build },
    { name: 'oedit',  handler: doOedit,  minPosition: Position.Dead, minTrust: LEVEL_CREATOR, logLevel: CommandLogLevel.Build },
    { name: 'mpedit', handler: doMpedit, minPosition: Position.Dead, minTrust: LEVEL_CREATOR, logLevel: CommandLogLevel.Build },
    { name: 'aedit',  handler: doAedit,  minPosition: Position.Dead, minTrust: LEVEL_CREATOR, logLevel: CommandLogLevel.Build },
  ];

  for (const cmd of olcCommands) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
