/**
 * information.ts – Information / query command handlers for SMAUG 2.0.
 *
 * Implements look, examine, score, who, where, consider, help,
 * inventory, equipment, affects, time, and weather commands.
 */

import { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import { Room } from '../entities/Room.js';
import { GameObject } from '../entities/GameObject.js';
import {
  Direction, Position, Sex, ItemType, WearLocation,
  AFF, ROOM_FLAGS, EX_FLAGS,
} from '../entities/types.js';
import { hasFlag } from '../../utils/BitVector.js';
import { padRight } from '../../utils/AnsiColors.js';
import { isNamePrefix, oneArgument, strPrefix, capitalize } from '../../utils/StringUtils.js';
import { CommandRegistry, type CommandDef, defaultCommandFlags, CommandLogLevel } from './CommandRegistry.js';
import * as fs from 'fs';

// =============================================================================
// Constants
// =============================================================================

const DIR_NAMES: Record<number, string> = {
  [Direction.North]: 'north',
  [Direction.South]: 'south',
  [Direction.East]:  'east',
  [Direction.West]:  'west',
  [Direction.Up]:    'up',
  [Direction.Down]:  'down',
};

const WEAR_LOCATION_NAMES: Record<number, string> = {
  [WearLocation.Light]:       '<used as light>     ',
  [WearLocation.FingerL]:     '<worn on finger>    ',
  [WearLocation.FingerR]:     '<worn on finger>    ',
  [WearLocation.Neck1]:       '<worn around neck>  ',
  [WearLocation.Neck2]:       '<worn around neck>  ',
  [WearLocation.Body]:        '<worn on body>      ',
  [WearLocation.Head]:        '<worn on head>      ',
  [WearLocation.Legs]:        '<worn on legs>      ',
  [WearLocation.Feet]:        '<worn on feet>      ',
  [WearLocation.Hands]:       '<worn on hands>     ',
  [WearLocation.Arms]:        '<worn on arms>      ',
  [WearLocation.Shield]:      '<worn as shield>    ',
  [WearLocation.About]:       '<worn about body>   ',
  [WearLocation.Waist]:       '<worn about waist>  ',
  [WearLocation.WristL]:      '<worn on wrist>     ',
  [WearLocation.WristR]:      '<worn on wrist>     ',
  [WearLocation.Wield]:       '<wielded>           ',
  [WearLocation.Hold]:        '<held>              ',
  [WearLocation.DualWield]:   '<dual wielded>      ',
  [WearLocation.Ears]:        '<worn on ears>      ',
  [WearLocation.Eyes]:        '<worn over eyes>    ',
  [WearLocation.MissileWield]:'<missile wielded>   ',
  [WearLocation.Back]:        '<worn on back>      ',
  [WearLocation.Face]:        '<worn on face>      ',
  [WearLocation.AnkleL]:      '<worn on ankle>     ',
  [WearLocation.AnkleR]:      '<worn on ankle>     ',
};

// =============================================================================
// Help system
// =============================================================================

interface HelpEntry {
  level: number;
  keywords: string;
  text: string;
}

let helpTable: HelpEntry[] = [];

/** Load help entries from a JSON file. */
export function loadHelps(filePath: string): number {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    helpTable = JSON.parse(data) as HelpEntry[];
    return helpTable.length;
  } catch {
    helpTable = [];
    return 0;
  }
}

/** Set help table directly (for testing). */
export function setHelpTable(entries: HelpEntry[]): void {
  helpTable = entries;
}

// =============================================================================
// Player tracking (for doWho/doWhere)
// =============================================================================

let playerListFn: (() => Player[]) | null = null;

/** Set function to retrieve list of online players. */
export function setPlayerListProvider(fn: () => Player[]): void {
  playerListFn = fn;
}

function getOnlinePlayers(): Player[] {
  return playerListFn ? playerListFn() : [];
}

// =============================================================================
// doLook
// =============================================================================

export function doLook(ch: Character, argument: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar("You are in limbo.\r\n");
    return;
  }

  if (ch.position < Position.Sleeping) {
    ch.sendToChar("You can't see anything but stars!\r\n");
    return;
  }

  if (ch.position === Position.Sleeping) {
    ch.sendToChar("You can't see anything, you're sleeping!\r\n");
    return;
  }

  if (!argument || argument.trim().length === 0) {
    // Look at room
    lookRoom(ch, room);
    return;
  }

  const [firstArg, rest] = oneArgument(argument);

  // Look 'in' container
  if (firstArg.toLowerCase() === 'in') {
    if (!rest || rest.trim().length === 0) {
      ch.sendToChar("Look in what?\r\n");
      return;
    }
    lookInContainer(ch, rest.trim());
    return;
  }

  // Look at a direction
  for (const [dirStr, dirName] of Object.entries(DIR_NAMES)) {
    if (strPrefix(firstArg, dirName)) {
      lookDirection(ch, room, parseInt(dirStr) as Direction);
      return;
    }
  }

  // Look at a character in the room
  for (const rch of room.characters) {
    if (rch === ch) continue;
    const namelist = rch.isNpc
      ? rch.name
      : rch.name;
    if (isNamePrefix(firstArg, namelist)) {
      lookAtCharacter(ch, rch);
      return;
    }
  }

  // Look at an object in inventory
  for (const item of ch.inventory) {
    const obj = item as GameObject;
    if (obj.keywords && isNamePrefix(firstArg, obj.keywords.join(' '))) {
      lookAtObject(ch, obj);
      return;
    }
  }

  // Look at equipment
  for (const [_loc, item] of ch.equipment) {
    const obj = item as GameObject;
    if (obj.keywords && isNamePrefix(firstArg, obj.keywords.join(' '))) {
      lookAtObject(ch, obj);
      return;
    }
  }

  // Look at an object in the room
  for (const item of room.contents) {
    const obj = item as GameObject;
    if (obj.keywords && isNamePrefix(firstArg, obj.keywords.join(' '))) {
      lookAtObject(ch, obj);
      return;
    }
  }

  // Look at room extra descriptions
  for (const ed of room.extraDescriptions) {
    if (isNamePrefix(firstArg, ed.keywords)) {
      ch.sendToChar(ed.description + '\r\n');
      return;
    }
  }

  ch.sendToChar("You do not see that here.\r\n");
}

function lookRoom(ch: Character, room: Room): void {
  // Room name
  ch.sendToChar(`&c${room.name}&D\r\n`);

  // Description (check brief mode)
  const player = ch as unknown as Player;
  const BRIEF_FLAG = 1n << 4n;
  const isBrief = !ch.isNpc && player.pcData && (player.pcData.flags & BRIEF_FLAG) !== 0n;

  if (!isBrief && room.description) {
    ch.sendToChar(room.description);
    if (!room.description.endsWith('\r\n') && !room.description.endsWith('\n')) {
      ch.sendToChar('\r\n');
    }
  }

  // Exits
  ch.sendToChar(formatExits(room, ch));

  // Room contents (objects)
  ch.sendToChar(formatRoomContents(room, ch));

  // Room characters
  ch.sendToChar(formatRoomCharacters(room, ch));
}

function lookDirection(ch: Character, room: Room, dir: Direction): void {
  const exit = room.getExit(dir);
  if (!exit) {
    ch.sendToChar("Nothing special there.\r\n");
    return;
  }

  if (exit.description) {
    ch.sendToChar(exit.description + '\r\n');
  } else {
    ch.sendToChar("Nothing special there.\r\n");
  }

  if (hasFlag(exit.flags, EX_FLAGS.ISDOOR)) {
    const doorName = exit.keyword || 'door';
    if (hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
      ch.sendToChar(`The ${doorName} is closed.\r\n`);
    } else {
      ch.sendToChar(`The ${doorName} is open.\r\n`);
    }
    if (hasFlag(exit.flags, EX_FLAGS.LOCKED)) {
      ch.sendToChar(`The ${doorName} is locked.\r\n`);
    }
  }
}

function lookAtCharacter(ch: Character, victim: Character): void {
  const displayName = victim.isNpc ? victim.shortDescription : victim.name;

  if (victim.description) {
    ch.sendToChar(victim.description + '\r\n');
  } else {
    ch.sendToChar(`You see nothing special about ${displayName}.\r\n`);
  }

  // Show condition
  ch.sendToChar(`${capitalize(displayName)} ${getConditionString(victim)}.\r\n`);

  // Show equipment
  let hasEquip = false;
  for (const [loc, item] of victim.equipment) {
    const obj = item as GameObject;
    const locName = WEAR_LOCATION_NAMES[loc] ?? '<unknown>';
    if (!hasEquip) {
      ch.sendToChar(`${capitalize(displayName)} is using:\r\n`);
      hasEquip = true;
    }
    ch.sendToChar(`${locName}${obj.shortDescription}\r\n`);
  }
}

function lookAtObject(ch: Character, obj: GameObject): void {
  // Check extra descriptions first
  for (const ed of obj.extraDescriptions) {
    ch.sendToChar(ed.description + '\r\n');
    return;
  }

  if (obj.description) {
    ch.sendToChar(obj.description + '\r\n');
  } else {
    ch.sendToChar(`You see nothing special about ${obj.shortDescription}.\r\n`);
  }
}

function lookInContainer(ch: Character, keyword: string): void {
  // Find container in inventory or room
  let container: GameObject | null = null;

  for (const item of ch.inventory) {
    const obj = item as GameObject;
    if (obj.keywords && isNamePrefix(keyword, obj.keywords.join(' '))) {
      container = obj;
      break;
    }
  }

  if (!container) {
    const room = ch.inRoom as Room | null;
    if (room) {
      for (const item of room.contents) {
        const obj = item as GameObject;
        if (obj.keywords && isNamePrefix(keyword, obj.keywords.join(' '))) {
          container = obj;
          break;
        }
      }
    }
  }

  if (!container) {
    ch.sendToChar("You don't see that here.\r\n");
    return;
  }

  if (container.itemType !== ItemType.Container
    && container.itemType !== ItemType.Corpse_NPC
    && container.itemType !== ItemType.Corpse_PC
    && container.itemType !== ItemType.DrinkCon
    && container.itemType !== ItemType.Quiver) {
    ch.sendToChar("That's not a container.\r\n");
    return;
  }

  // Check if closed
  if (container.itemType === ItemType.Container && (container.values[1] ?? 0) !== 0) {
    ch.sendToChar("It is closed.\r\n");
    return;
  }

  ch.sendToChar(`${capitalize(container.shortDescription)} contains:\r\n`);
  if (container.contents.length === 0) {
    ch.sendToChar("  Nothing.\r\n");
  } else {
    for (const item of container.contents) {
      ch.sendToChar(`  ${item.shortDescription}\r\n`);
    }
  }
}

// =============================================================================
// doExamine
// =============================================================================

export function doExamine(ch: Character, arg: string): void {
  if (!arg || arg.trim().length === 0) {
    ch.sendToChar("Examine what?\r\n");
    return;
  }

  // First do a normal look
  doLook(ch, arg);

  // Then show additional details for objects
  const [keyword] = oneArgument(arg);

  // Find object
  let obj: GameObject | null = null;
  for (const item of ch.inventory) {
    const o = item as GameObject;
    if (o.keywords && isNamePrefix(keyword, o.keywords.join(' '))) {
      obj = o;
      break;
    }
  }
  if (!obj) {
    const room = ch.inRoom as Room | null;
    if (room) {
      for (const item of room.contents) {
        const o = item as GameObject;
        if (o.keywords && isNamePrefix(keyword, o.keywords.join(' '))) {
          obj = o;
          break;
        }
      }
    }
  }

  if (!obj) return;

  switch (obj.itemType) {
    case ItemType.Weapon:
      ch.sendToChar(`Damage dice: ${obj.values[1] ?? 0}d${obj.values[2] ?? 0}.\r\n`);
      break;
    case ItemType.Armor:
      ch.sendToChar(`Armor class: ${obj.values[0] ?? 0}.\r\n`);
      break;
    case ItemType.Container:
    case ItemType.Quiver:
      ch.sendToChar(`Capacity: ${obj.values[0] ?? 0} lbs. Items: ${obj.contents.length}.\r\n`);
      break;
    case ItemType.Food:
      ch.sendToChar(`Servings: ${obj.values[0] ?? 0}. Nutrition: ${obj.values[1] ?? 0}.\r\n`);
      break;
    case ItemType.DrinkCon:
      ch.sendToChar(`Capacity: ${obj.values[0] ?? 0}. Contains: ${obj.values[1] ?? 0}.\r\n`);
      break;
  }
}

// =============================================================================
// doScore
// =============================================================================

export function doScore(ch: Character, _arg: string): void {
  const sexStr = ch.sex === Sex.Male ? 'Male' : ch.sex === Sex.Female ? 'Female' : 'Neutral';

  ch.sendToChar('&Y+-------------------------------------------------------------+&D\r\n');
  ch.sendToChar(`&Y|&D ${padRight(`&W${ch.name}`, 30)} Level: ${padRight(String(ch.level), 5)} &Y|&D\r\n`);
  ch.sendToChar(`&Y|&D Race: ${padRight(capitalize(ch.race), 12)} Class: ${padRight(capitalize(ch.class_), 12)} Sex: ${padRight(sexStr, 8)} &Y|&D\r\n`);
  ch.sendToChar('&Y+-------------------------------------------------------------+&D\r\n');

  // Vitals
  ch.sendToChar(`&Y|&D HP: &R${ch.hit}&D/${ch.maxHit}  Mana: &B${ch.mana}&D/${ch.maxMana}  Move: &G${ch.move}&D/${ch.maxMove}  &Y|&D\r\n`);

  // Stats
  ch.sendToChar('&Y+-------------------------------------------------------------+&D\r\n');
  ch.sendToChar(`&Y|&D Str: ${padRight(String(ch.getStat('str')), 4)} Int: ${padRight(String(ch.getStat('int')), 4)} Wis: ${padRight(String(ch.getStat('wis')), 4)} &Y|&D\r\n`);
  ch.sendToChar(`&Y|&D Dex: ${padRight(String(ch.getStat('dex')), 4)} Con: ${padRight(String(ch.getStat('con')), 4)} Cha: ${padRight(String(ch.getStat('cha')), 4)} &Y|&D\r\n`);
  ch.sendToChar(`&Y|&D Lck: ${padRight(String(ch.getStat('lck')), 4)}                               &Y|&D\r\n`);

  // Combat
  ch.sendToChar('&Y+-------------------------------------------------------------+&D\r\n');
  ch.sendToChar(`&Y|&D Hitroll: ${padRight(String(ch.hitroll), 5)} Damroll: ${padRight(String(ch.damroll), 5)} Armor: ${padRight(String(ch.armor), 5)} &Y|&D\r\n`);
  ch.sendToChar(`&Y|&D Alignment: ${padRight(String(ch.alignment), 7)} Wimpy: ${padRight(String(ch.wimpy), 5)}             &Y|&D\r\n`);

  // Economy
  ch.sendToChar('&Y+-------------------------------------------------------------+&D\r\n');
  ch.sendToChar(`&Y|&D Gold: ${padRight(String(ch.gold), 10)} Silver: ${padRight(String(ch.silver), 10)} Copper: ${padRight(String(ch.copper), 6)} &Y|&D\r\n`);
  ch.sendToChar(`&Y|&D Experience: ${padRight(String(ch.exp), 12)}                              &Y|&D\r\n`);

  // Position
  const posNames: Record<number, string> = {
    [Position.Dead]: 'dead', [Position.Mortal]: 'mortally wounded',
    [Position.Incap]: 'incapacitated', [Position.Stunned]: 'stunned',
    [Position.Sleeping]: 'sleeping', [Position.Resting]: 'resting',
    [Position.Sitting]: 'sitting', [Position.Fighting]: 'fighting',
    [Position.Standing]: 'standing', [Position.Mounted]: 'mounted',
  };
  const posStr = posNames[ch.position] ?? 'standing';
  ch.sendToChar(`&Y|&D Position: ${padRight(posStr, 15)}                              &Y|&D\r\n`);

  // Player-specific data
  if (!ch.isNpc) {
    const player = ch as unknown as { pcData?: Player['pcData'] };
    if (player.pcData) {
      if (player.pcData.clanName) {
        ch.sendToChar(`&Y|&D Clan: ${padRight(player.pcData.clanName, 20)}                         &Y|&D\r\n`);
      }
      ch.sendToChar(`&Y|&D Kills: ${padRight(String(player.pcData.mkills), 8)} Deaths: ${padRight(String(player.pcData.mdeaths), 8)}                &Y|&D\r\n`);
    }
  }

  ch.sendToChar('&Y+-------------------------------------------------------------+&D\r\n');

  // Affects summary
  if (ch.affects.length > 0) {
    ch.sendToChar(`&Y|&D Active affects: ${ch.affects.length}                                    &Y|&D\r\n`);
    ch.sendToChar('&Y+-------------------------------------------------------------+&D\r\n');
  }
}

// =============================================================================
// doWho
// =============================================================================

export function doWho(ch: Character, argument: string): void {
  const players = getOnlinePlayers();

  // Parse filters
  let filterRace: string | null = null;
  let filterClass: string | null = null;
  let filterMinLevel = 0;
  let filterClan: string | null = null;
  let filterImmortal = false;

  if (argument && argument.trim().length > 0) {
    let remaining = argument.trim();
    while (remaining.length > 0) {
      const [flag, rest] = oneArgument(remaining);
      remaining = rest;
      if (flag === '-r' || flag === '-R') {
        const [val, rest2] = oneArgument(remaining);
        filterRace = val.toLowerCase();
        remaining = rest2;
      } else if (flag === '-c' || flag === '-C') {
        const [val, rest2] = oneArgument(remaining);
        filterClass = val.toLowerCase();
        remaining = rest2;
      } else if (flag === '-l' || flag === '-L') {
        const [val, rest2] = oneArgument(remaining);
        filterMinLevel = parseInt(val) || 0;
        remaining = rest2;
      } else if (flag === '-g' || flag === '-G') {
        const [val, rest2] = oneArgument(remaining);
        filterClan = val.toLowerCase();
        remaining = rest2;
      } else if (flag === '-i' || flag === '-I') {
        filterImmortal = true;
      }
    }
  }

  ch.sendToChar('&W[ Level  Race  Class ] Name                 Title&D\r\n');
  ch.sendToChar('&Y--------------------------------------------------------------&D\r\n');

  let count = 0;
  for (const player of players) {
    // Apply filters
    if (filterRace && player.race.toLowerCase() !== filterRace) continue;
    if (filterClass && player.class_.toLowerCase() !== filterClass) continue;
    if (filterMinLevel > 0 && player.level < filterMinLevel) continue;
    if (filterClan && (!player.pcData.clanName || player.pcData.clanName.toLowerCase() !== filterClan)) continue;
    if (filterImmortal && !player.isImmortal) continue;

    // WizInvis check
    if (player.pcData.wizInvis > ch.getTrust()) continue;

    const levelStr = padRight(String(player.level), 4);
    const raceStr = padRight(capitalize(player.race), 6);
    const classStr = padRight(capitalize(player.class_), 6);
    const title = player.pcData.title || '';
    const clanTag = player.pcData.clanName ? `[${player.pcData.clanName}] ` : '';

    ch.sendToChar(`&W[${levelStr} ${raceStr} ${classStr}]&D ${clanTag}${player.name} ${title}\r\n`);
    count++;
  }

  ch.sendToChar('&Y--------------------------------------------------------------&D\r\n');
  ch.sendToChar(`${count} player${count !== 1 ? 's' : ''} found.\r\n`);
}

// =============================================================================
// doWhere
// =============================================================================

export function doWhere(ch: Character, arg: string): void {
  const room = ch.inRoom as Room | null;
  if (!room || !room.area) {
    ch.sendToChar("You are lost.\r\n");
    return;
  }

  if (!arg || arg.trim().length === 0) {
    ch.sendToChar(`Players near you in ${room.area.name}:\r\n`);
    const players = getOnlinePlayers();
    let found = false;
    for (const player of players) {
      const pRoom = player.inRoom as Room | null;
      if (pRoom && pRoom.area === room.area && player !== ch) {
        if (player.pcData.wizInvis > ch.getTrust()) continue;
        ch.sendToChar(`  ${padRight(player.name, 20)} ${pRoom.name}\r\n`);
        found = true;
      }
    }
    if (!found) {
      ch.sendToChar("  No one found.\r\n");
    }
    return;
  }

  // Search for a specific mob or player by name
  const keyword = arg.trim();
  let found = false;

  // Search players
  for (const player of getOnlinePlayers()) {
    if (isNamePrefix(keyword, player.name)) {
      const pRoom = player.inRoom as Room | null;
      if (pRoom) {
        ch.sendToChar(`  ${padRight(player.name, 20)} ${pRoom.name}\r\n`);
        found = true;
      }
    }
  }

  // Search mobs in the same area
  if (room.area) {
    for (const [_vnum, areaRoom] of room.area.rooms) {
      for (const rch of areaRoom.characters) {
        if (rch.isNpc && isNamePrefix(keyword, rch.name)) {
          ch.sendToChar(`  ${padRight(rch.shortDescription, 20)} ${areaRoom.name}\r\n`);
          found = true;
        }
      }
    }
  }

  if (!found) {
    ch.sendToChar("You didn't find it.\r\n");
  }
}

// =============================================================================
// doHelp
// =============================================================================

export function doHelp(ch: Character, argument: string): void {
  const keyword = (!argument || argument.trim().length === 0) ? 'MOTD' : argument.trim().toUpperCase();

  for (const help of helpTable) {
    if (help.level > ch.getTrust()) continue;
    if (isNamePrefix(keyword, help.keywords.toUpperCase())) {
      ch.sendToChar(help.text + '\r\n');
      return;
    }
  }

  ch.sendToChar(`No help found for '${keyword}'.\r\n`);
}

// =============================================================================
// doTime
// =============================================================================

export function doTime(ch: Character, _arg: string): void {
  // Simplified in-game time (based on real time)
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfMonth = now.getUTCDate();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();

  const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const monthNames = [
    'the Winter Wolf', 'the Frost Giant', 'the Old Forces',
    'the Grand Struggle', 'the Spring', 'Nature',
    'Futility', 'the Dragon', 'the Sun',
    'the Heat', 'the Battle', 'the Dark Shades',
  ];
  const dayNames = ['the Moon', 'the Bull', 'Deception', 'Thunder', 'Freedom', 'the Great Gods', 'the Sun'];
  const dayName = dayNames[now.getUTCDay()] ?? 'the Moon';
  const monthName = monthNames[month] ?? 'the Unknown';

  ch.sendToChar(`It is ${hour} o'clock ${timeOfDay}, Day of ${dayName}.\r\n`);
  ch.sendToChar(`${dayOfMonth}th the Month of ${monthName}, Year ${year}.\r\n`);
}

// =============================================================================
// doWeather
// =============================================================================

export function doWeather(ch: Character, _arg: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) return;

  if (room.hasFlag(ROOM_FLAGS.INDOORS)) {
    ch.sendToChar("You can't see the weather indoors.\r\n");
    return;
  }

  const area = room.area;
  if (!area) {
    ch.sendToChar("The sky is clear.\r\n");
    return;
  }

  const weather = area.weather;
  const skyDescriptions = ['cloudless', 'cloudy', 'rainy', 'lit by flashes of lightning'];
  const skyIdx = Math.min(Math.floor(weather.cloudCover / 25), 3);
  const skyDesc = skyDescriptions[skyIdx] ?? 'cloudless';

  const windDesc = weather.windSpeed < 10 ? 'calm' :
    weather.windSpeed < 30 ? 'breezy' :
    weather.windSpeed < 60 ? 'windy' : 'very windy';

  ch.sendToChar(`The sky is ${skyDesc} and a ${windDesc} wind blows.\r\n`);
  if (weather.temperature < 32) {
    ch.sendToChar("It is bitterly cold.\r\n");
  } else if (weather.temperature < 50) {
    ch.sendToChar("It is cold.\r\n");
  } else if (weather.temperature < 70) {
    ch.sendToChar("The temperature is mild.\r\n");
  } else if (weather.temperature < 90) {
    ch.sendToChar("It is warm.\r\n");
  } else {
    ch.sendToChar("It is hot.\r\n");
  }
}

// =============================================================================
// doAffects
// =============================================================================

export function doAffects(ch: Character, _arg: string): void {
  if (ch.affects.length === 0) {
    ch.sendToChar("You are not affected by any spells.\r\n");
    return;
  }

  ch.sendToChar("You are affected by the following:\r\n");
  for (const aff of ch.affects) {
    const durStr = aff.duration < 0 ? 'permanent' : `${aff.duration} hour${aff.duration !== 1 ? 's' : ''}`;
    const typeStr = `Spell: '${aff.type}'`;
    ch.sendToChar(`  ${typeStr} modifies by ${aff.modifier} for ${durStr}.\r\n`);
  }
}

// =============================================================================
// doEquipment
// =============================================================================

export function doEquipment(ch: Character, _arg: string): void {
  ch.sendToChar("You are using:\r\n");
  let hasEquip = false;

  for (const [loc, item] of ch.equipment) {
    const obj = item as GameObject;
    const locName = WEAR_LOCATION_NAMES[loc] ?? '<unknown>           ';
    ch.sendToChar(`${locName}${obj.shortDescription}\r\n`);
    hasEquip = true;
  }

  if (!hasEquip) {
    ch.sendToChar("  Nothing.\r\n");
  }
}

// =============================================================================
// doInventory
// =============================================================================

export function doInventory(ch: Character, _arg: string): void {
  ch.sendToChar("You are carrying:\r\n");

  if (ch.inventory.length === 0) {
    ch.sendToChar("  Nothing.\r\n");
    return;
  }

  // Group identical items
  const groups = new Map<string, { name: string; count: number }>();
  for (const item of ch.inventory) {
    const obj = item as GameObject;
    const name = obj.shortDescription || obj.name || 'something';
    const existing = groups.get(name);
    if (existing) {
      existing.count++;
    } else {
      groups.set(name, { name, count: 1 });
    }
  }

  for (const [_key, group] of groups) {
    if (group.count > 1) {
      ch.sendToChar(`  (${group.count}) ${group.name}\r\n`);
    } else {
      ch.sendToChar(`  ${group.name}\r\n`);
    }
  }
}

// =============================================================================
// doConsider
// =============================================================================

export function doConsider(ch: Character, arg: string): void {
  if (!arg || arg.trim().length === 0) {
    ch.sendToChar("Consider killing whom?\r\n");
    return;
  }

  const room = ch.inRoom as Room | null;
  if (!room) return;

  const keyword = arg.trim();
  let victim: Character | null = null;

  for (const rch of room.characters) {
    if (rch === ch) continue;
    const nameList = rch.isNpc ? rch.name : rch.name;
    if (isNamePrefix(keyword, nameList)) {
      victim = rch;
      break;
    }
  }

  if (!victim) {
    ch.sendToChar("They're not here.\r\n");
    return;
  }

  const diff = victim.level - ch.level;
  let message: string;

  if (diff <= -10) {
    message = "Now where did that chicken go?";
  } else if (diff <= -5) {
    message = "You could do it with a needle!";
  } else if (diff <= -2) {
    message = "Easy.";
  } else if (diff <= 1) {
    message = "The perfect match!";
  } else if (diff <= 4) {
    message = "You would need some luck!";
  } else if (diff <= 9) {
    message = "You would need a lot of luck!";
  } else {
    message = "Death will thank you for your gift.";
  }

  ch.sendToChar(`${message}\r\n`);

  // HP comparison hint
  const hpDiff = victim.maxHit - ch.maxHit;
  if (hpDiff > 200) {
    ch.sendToChar(`${victim.isNpc ? victim.shortDescription : victim.name} looks much tougher than you.\r\n`);
  } else if (hpDiff > 50) {
    ch.sendToChar(`${victim.isNpc ? victim.shortDescription : victim.name} looks tougher than you.\r\n`);
  } else if (hpDiff < -200) {
    ch.sendToChar(`${victim.isNpc ? victim.shortDescription : victim.name} looks much weaker than you.\r\n`);
  } else if (hpDiff < -50) {
    ch.sendToChar(`${victim.isNpc ? victim.shortDescription : victim.name} looks weaker than you.\r\n`);
  }
}

// =============================================================================
// Helper Functions (exported)
// =============================================================================

/** Format exit list: [Exits: N S E (W)] */
export function formatExits(room: Room, ch: Character): string {
  const exits: string[] = [];
  for (const [dir, exit] of room.exits) {
    if (hasFlag(exit.flags, EX_FLAGS.SECRET) || hasFlag(exit.flags, EX_FLAGS.HIDDEN)) {
      // Don't show secret exits unless character has detect hidden
      if (!ch.isAffected(AFF.DETECT_HIDDEN) && !ch.isImmortal) continue;
    }
    const name = (DIR_NAMES[dir] ?? 'somewhere').charAt(0).toUpperCase();
    if (hasFlag(exit.flags, EX_FLAGS.CLOSED)) {
      exits.push(`(${name})`);
    } else {
      exits.push(name);
    }
  }
  if (exits.length === 0) return '&D[Exits: none]\r\n';
  return `&D[Exits: ${exits.join(' ')}]\r\n`;
}

/** List objects on the ground, group identical items. */
export function formatRoomContents(room: Room, _ch: Character): string {
  if (room.contents.length === 0) return '';

  const groups = new Map<string, { name: string; count: number }>();
  for (const item of room.contents) {
    const obj = item as { shortDescription?: string; longDescription?: string; name?: string };
    const name = obj.longDescription || obj.shortDescription || obj.name || 'something';
    const existing = groups.get(name);
    if (existing) {
      existing.count++;
    } else {
      groups.set(name, { name, count: 1 });
    }
  }

  let result = '';
  for (const [_key, group] of groups) {
    if (group.count > 1) {
      result += `  (${group.count}) ${group.name}\r\n`;
    } else {
      result += `  ${group.name}\r\n`;
    }
  }
  return result;
}

/** List NPCs and players with their position. */
export function formatRoomCharacters(room: Room, ch: Character): string {
  let result = '';
  for (const rch of room.characters) {
    if (rch === ch) continue;

    // Check visibility (sneaking, invisible, etc.)
    if (rch.isAffected(AFF.INVISIBLE) && !ch.isAffected(AFF.DETECT_INVIS) && !ch.isImmortal) continue;
    if (rch.isAffected(AFF.HIDE) && !ch.isAffected(AFF.DETECT_HIDDEN) && !ch.isImmortal) continue;

    if (rch.isNpc) {
      if (rch.position === rch.defaultPosition && rch.longDescription) {
        result += `${rch.longDescription}\r\n`;
      } else {
        result += `${capitalize(rch.shortDescription)} ${getPositionString(rch)}\r\n`;
      }
    } else {
      const title = (rch as Player).pcData?.title ?? '';
      result += `${rch.name}${title ? ' ' + title : ''} ${getPositionString(rch)}\r\n`;
    }
  }
  return result;
}

/** Get HP condition string. */
export function getConditionString(victim: Character): string {
  if (victim.maxHit <= 0) return 'is in perfect health';
  const percent = Math.floor((victim.hit * 100) / victim.maxHit);

  if (percent >= 100) return 'is in excellent condition';
  if (percent >= 90) return 'has a few scratches';
  if (percent >= 75) return 'has some small wounds and bruises';
  if (percent >= 50) return 'has quite a few wounds';
  if (percent >= 30) return 'has some big nasty wounds and scratches';
  if (percent >= 15) return 'looks pretty hurt';
  if (percent > 0) return 'is in awful condition';
  return 'is bleeding to death';
}

function getPositionString(ch: Character): string {
  switch (ch.position) {
    case Position.Dead: return 'is DEAD!!';
    case Position.Mortal: return 'is mortally wounded.';
    case Position.Incap: return 'is incapacitated.';
    case Position.Stunned: return 'is lying here stunned.';
    case Position.Sleeping: return 'is sleeping here.';
    case Position.Resting: return 'is resting here.';
    case Position.Sitting: return 'is sitting here.';
    case Position.Standing: return 'is here.';
    case Position.Fighting: return `is here, fighting ${ch.fighting ? (ch.fighting.isNpc ? ch.fighting.shortDescription : ch.fighting.name) : 'someone'}.`;
    case Position.Mounted: return 'is here, mounted.';
    default: return 'is here.';
  }
}

// =============================================================================
// Registration
// =============================================================================

// TODO PARITY: Missing information commands — glance, wizwho, changes, news, hlist
export function registerInformationCommands(registry: CommandRegistry): void {
  const infoCommands: Omit<CommandDef, 'useCount' | 'lagCount' | 'flags'>[] = [
    { name: 'look',      handler: doLook,      minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'examine',   handler: doExamine,   minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'score',     handler: doScore,     minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'who',       handler: doWho,       minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'where',     handler: doWhere,     minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'help',      handler: doHelp,      minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'time',      handler: doTime,      minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'weather',   handler: doWeather,   minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'affects',   handler: doAffects,   minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'equipment', handler: doEquipment, minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'inventory', handler: doInventory, minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'consider',  handler: doConsider,  minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
  ];

  for (const cmd of infoCommands) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
