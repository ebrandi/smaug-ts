/**
 * objects.ts – Object manipulation command handlers for SMAUG 2.0.
 *
 * Implements get, drop, put, give, wear, remove, eat, drink, fill,
 * sacrifice, loot, and all related object interaction commands.
 * Replicates legacy act_obj.c behavior.
 *
 * Commands registered:
 *   get, drop, put, give, wear, remove, eat, drink, fill, sacrifice, loot
 */

import type { Character } from '../entities/Character.js';
import { GameObject } from '../entities/GameObject.js';
import { Room } from '../entities/Room.js';
import {
  Position,
  WearLocation,
  ItemType,
  AFF,
  ITEM_EXTRA_FLAGS,
  WEAR_FLAGS,
  CONT_FLAGS,
} from '../entities/types.js';
import { Affect } from '../entities/Affect.js';
import { hasFlag } from '../../utils/BitVector.js';
import { oneArgument, isName, numberArgument } from '../../utils/StringUtils.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { getStrModifier } from '../affects/StatModifier.js';
import { CommandRegistry, type CommandDef, defaultCommandFlags, CommandLogLevel } from './CommandRegistry.js';

// =============================================================================
// Module-level injectable dependencies (for testing)
// =============================================================================

let eventBus: EventBus = new EventBus();

/** Set the EventBus instance (for testing). */
export function setObjectEventBus(bus: EventBus): void {
  eventBus = bus;
}

// =============================================================================
// Carrying Capacity
// =============================================================================

/**
 * Maximum weight a character can carry.
 * Legacy: str_app[get_curr_str(ch)].carry * 10 + ch->level * 25
 */
export function maxCarryWeight(ch: Character): number {
  if (ch.isImmortal) return ch.getTrust() * 200 * 10;
  const strMod = getStrModifier(ch.getStat('str'));
  return strMod.carry * 10 + ch.level * 25;
}

/**
 * Maximum number of items a character can carry.
 * Legacy: can_carry_n approximation: level + dex_based + 10
 */
export function maxCarryNumber(ch: Character): number {
  if (ch.isImmortal) return ch.getTrust() * 200;
  // Legacy: can_carry_n = (level+15)/5 + dex - 13 + 10
  const dexCarry = ch.getStat('dex') - 13;
  return Math.floor((ch.level + 15) / 5) + dexCarry + 10;
}

/** Check if character can carry additional weight. */
export function canCarryWeight(ch: Character, weight: number): boolean {
  return getCarryWeight(ch) + weight <= maxCarryWeight(ch);
}

/** Check if character can carry additional items. */
export function canCarryNumber(ch: Character, count: number = 1): boolean {
  return getCarryCount(ch) + count <= maxCarryNumber(ch);
}

/** Get current carrying weight. */
function getCarryWeight(ch: Character): number {
  let total = 0;
  for (const obj of ch.inventory as GameObject[]) {
    total += obj.getTotalWeight();
  }
  return total;
}

/** Get current number of items carried. */
function getCarryCount(ch: Character): number {
  return (ch.inventory as GameObject[]).length;
}

// =============================================================================
// Object Finding Helpers
// =============================================================================

/**
 * Find an object in a character's inventory by name/number.
 * Supports "N.keyword" syntax (e.g., "2.sword").
 */
export function findObjInInventory(ch: Character, arg: string): GameObject | null {
  const { number, keyword } = numberArgument(arg);
  let count = 0;

  for (const obj of ch.inventory as GameObject[]) {
    if (isName(keyword, obj.keywords.join(' '))) {
      count++;
      if (number === 0 || count === number) {
        return obj;
      }
    }
  }
  return null;
}

/**
 * Find an object in a room by name/number.
 */
export function findObjInRoom(room: Room, arg: string): GameObject | null {
  const { number, keyword } = numberArgument(arg);
  let count = 0;

  for (const obj of room.contents as GameObject[]) {
    if (isName(keyword, obj.keywords.join(' '))) {
      count++;
      if (number === 0 || count === number) {
        return obj;
      }
    }
  }
  return null;
}

/**
 * Find an object inside a container by name/number.
 */
export function findObjInContainer(container: GameObject, arg: string): GameObject | null {
  const { number, keyword } = numberArgument(arg);
  let count = 0;

  for (const obj of container.contents) {
    if (isName(keyword, obj.keywords.join(' '))) {
      count++;
      if (number === 0 || count === number) {
        return obj;
      }
    }
  }
  return null;
}

/**
 * Find an object in a character's equipment by name/number.
 */
function findObjEquipped(ch: Character, arg: string): GameObject | null {
  const { number, keyword } = numberArgument(arg);
  let count = 0;

  for (const [_loc, obj] of ch.equipment as Map<WearLocation, GameObject>) {
    if (isName(keyword, obj.keywords.join(' '))) {
      count++;
      if (number === 0 || count === number) {
        return obj;
      }
    }
  }
  return null;
}

/**
 * Find a character in the room by name/number.
 */
function findCharInRoom(ch: Character, arg: string): Character | null {
  if (!ch.inRoom) return null;
  const room = ch.inRoom as Room;
  const { number, keyword } = numberArgument(arg);
  let count = 0;

  for (const target of room.characters) {
    if (target === ch) continue;
    if (isName(keyword, target.keywords.join(' ')) || isName(keyword, target.name)) {
      count++;
      if (number === 0 || count === number) {
        return target;
      }
    }
  }
  return null;
}

// =============================================================================
// Object Transfer Helpers
// =============================================================================

/** Transfer object from room to character inventory. */
function objFromRoom(obj: GameObject, room: Room): void {
  const idx = (room.contents as GameObject[]).indexOf(obj);
  if (idx !== -1) {
    (room.contents as GameObject[]).splice(idx, 1);
  }
  obj.inRoom = null;
}

/** Place object into room. */
function objToRoom(obj: GameObject, room: Room): void {
  (room.contents as GameObject[]).push(obj);
  obj.inRoom = room;
  obj.carriedBy = null;
  obj.inObject = null;
}

/** Transfer object to character inventory. */
function objToChar(obj: GameObject, ch: Character): void {
  (ch.inventory as GameObject[]).push(obj);
  obj.carriedBy = ch;
  obj.inRoom = null;
  obj.inObject = null;
}

/** Remove object from character inventory. */
function objFromChar(obj: GameObject, ch: Character): void {
  const idx = (ch.inventory as GameObject[]).indexOf(obj);
  if (idx !== -1) {
    (ch.inventory as GameObject[]).splice(idx, 1);
  }
  obj.carriedBy = null;
}

/** Put object into container. */
function objToObj(obj: GameObject, container: GameObject): void {
  container.contents.push(obj);
  obj.inObject = container;
  obj.carriedBy = null;
  obj.inRoom = null;
}

/** Remove object from container. */
function objFromObj(obj: GameObject): void {
  if (obj.inObject) {
    const idx = obj.inObject.contents.indexOf(obj);
    if (idx !== -1) {
      obj.inObject.contents.splice(idx, 1);
    }
    obj.inObject = null;
  }
}

/** Destroy an object (remove from all locations). */
function extractObj(obj: GameObject): void {
  if (obj.carriedBy) {
    objFromChar(obj, obj.carriedBy);
  }
  if (obj.inRoom) {
    objFromRoom(obj, obj.inRoom as Room);
  }
  if (obj.inObject) {
    objFromObj(obj);
  }
  // Recursively extract contents
  for (const contained of [...obj.contents]) {
    extractObj(contained);
  }
}

// =============================================================================
// Wear Location Helpers
// =============================================================================

/** Mapping from WEAR_FLAGS bits to WearLocation values. */
const WEAR_FLAG_TO_LOCATION: Array<[bigint, WearLocation]> = [
  [WEAR_FLAGS.FINGER,     WearLocation.FingerL],
  [WEAR_FLAGS.NECK,       WearLocation.Neck1],
  [WEAR_FLAGS.BODY,       WearLocation.Body],
  [WEAR_FLAGS.HEAD,       WearLocation.Head],
  [WEAR_FLAGS.LEGS,       WearLocation.Legs],
  [WEAR_FLAGS.FEET,       WearLocation.Feet],
  [WEAR_FLAGS.HANDS,      WearLocation.Hands],
  [WEAR_FLAGS.ARMS,       WearLocation.Arms],
  [WEAR_FLAGS.SHIELD,     WearLocation.Shield],
  [WEAR_FLAGS.ABOUT,      WearLocation.About],
  [WEAR_FLAGS.WAIST,      WearLocation.Waist],
  [WEAR_FLAGS.WRIST,      WearLocation.WristL],
  [WEAR_FLAGS.WIELD,      WearLocation.Wield],
  [WEAR_FLAGS.HOLD,       WearLocation.Hold],
  [WEAR_FLAGS.DUAL_WIELD, WearLocation.DualWield],
  [WEAR_FLAGS.EARS,       WearLocation.Ears],
  [WEAR_FLAGS.EYES,       WearLocation.Eyes],
  [WEAR_FLAGS.MISSILE,    WearLocation.MissileWield],
  [WEAR_FLAGS.BACK,       WearLocation.Back],
  [WEAR_FLAGS.FACE,       WearLocation.Face],
  [WEAR_FLAGS.ANKLE,      WearLocation.AnkleL],
];

/**
 * Determine the best wear location from an object's wearFlags.
 * Returns the first matching location, or WearLocation.None if not wearable.
 */
export function getWearLocation(obj: GameObject): WearLocation {
  for (const [flag, location] of WEAR_FLAG_TO_LOCATION) {
    if (obj.hasWearFlag(flag)) {
      return location;
    }
  }
  return WearLocation.None;
}

/**
 * Check if a character can wear an object at a given location,
 * including the layer system check.
 *
 * Layer system: Multiple items can occupy same wear location if
 * layer values don't conflict. Items conflict if
 * (item1.layers & item2.layers) !== 0.
 * Items with layers === 0 always conflict (only one can occupy the slot).
 */
export function canWearAt(ch: Character, obj: GameObject, location: WearLocation): boolean {
  const equipment = ch.equipment as Map<WearLocation, GameObject>;
  const existing = equipment.get(location);

  if (!existing) return true;

  // Check layers
  const objLayers = obj.prototype.layers ?? 0;
  const existingLayers = existing.prototype.layers ?? 0;

  // If either has no layers (0), they conflict
  if (objLayers === 0 || existingLayers === 0) return false;

  // Check for layer bit overlap
  return (objLayers & existingLayers) === 0;
}

/**
 * Equip a character with an object.
 * Applies object affects via the Affect system.
 */
function equipChar(ch: Character, obj: GameObject, location: WearLocation): void {
  const equipment = ch.equipment as Map<WearLocation, GameObject>;
  equipment.set(location, obj);
  obj.wearLocation = location;

  // Apply object affects
  for (const affData of obj.prototype.affects) {
    const affect = new Affect(0, -1, affData.location, affData.modifier, 0n);
    obj.affects.push(affect);
    affect.applyTo(ch);
  }

  // Handle light items
  if (location === WearLocation.Light && obj.itemType === ItemType.Light) {
    const room = ch.inRoom as Room | null;
    if (room) room.light++;
  }

  eventBus.emitEvent(GameEvent.ObjectEquip, { character: ch, object: obj, location });
}

/**
 * Unequip a character from an item.
 * Removes object affects.
 */
function unequipChar(ch: Character, obj: GameObject): void {
  const equipment = ch.equipment as Map<WearLocation, GameObject>;
  const location = obj.wearLocation;

  // Remove object affects
  for (const affect of [...obj.affects]) {
    affect.removeFrom(ch);
  }
  obj.affects = [];

  // Handle light items
  if (location === WearLocation.Light && obj.itemType === ItemType.Light) {
    const room = ch.inRoom as Room | null;
    if (room) room.light = Math.max(0, room.light - 1);
  }

  equipment.delete(location);
  obj.wearLocation = WearLocation.None;

  eventBus.emitEvent(GameEvent.ObjectRemove, { character: ch, object: obj, location });
}

// =============================================================================
// doGet – Pick up objects
// =============================================================================

/**
 * get <item> [container]
 * get all [container]
 * get all.<keyword> [container]
 */
export function doGet(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Get what?\r\n');
    return;
  }

  const room = ch.inRoom as Room | null;
  if (!room) return;

  let [arg1, rest] = oneArgument(argument);
  let [arg2] = rest ? oneArgument(rest) : ['', ''];

  // get <item> <container>
  if (arg2 && arg2.length > 0) {
    getFromContainer(ch, arg1, arg2, room);
    return;
  }

  // get all
  if (arg1.toLowerCase() === 'all') {
    getAllFromRoom(ch, room, '');
    return;
  }

  // get all.<keyword>
  if (arg1.toLowerCase().startsWith('all.')) {
    const keyword = arg1.substring(4);
    getAllFromRoom(ch, room, keyword);
    return;
  }

  // get <item>
  const obj = findObjInRoom(room, arg1);
  if (!obj) {
    ch.sendToChar("You don't see that here.\r\n");
    return;
  }

  getObj(ch, obj, room, null);
}

function getObj(ch: Character, obj: GameObject, room: Room, container: GameObject | null): void {
  // Check ITEM_NO_TAKE
  if (obj.hasExtraFlag(ITEM_EXTRA_FLAGS.NO_TAKE)) {
    ch.sendToChar("You can't take that.\r\n");
    return;
  }

  // Check carrying capacity
  if (!canCarryNumber(ch)) {
    ch.sendToChar("You can't carry that many items.\r\n");
    return;
  }
  if (!canCarryWeight(ch, obj.getTotalWeight())) {
    ch.sendToChar("You can't carry that much weight.\r\n");
    return;
  }

  if (container) {
    objFromObj(obj);
  } else {
    objFromRoom(obj, room);
  }
  objToChar(obj, ch);

  ch.sendToChar(`You get ${obj.shortDescription}.\r\n`);

  eventBus.emitEvent(GameEvent.ObjectPickup, { character: ch, object: obj });

  // TODO: Fire GET_PROG on object (stub for now)
}

function getAllFromRoom(ch: Character, room: Room, keyword: string): void {
  let found = false;
  const objects = [...(room.contents as GameObject[])];

  for (const obj of objects) {
    if (obj.hasExtraFlag(ITEM_EXTRA_FLAGS.NO_TAKE)) continue;
    if (keyword && !isName(keyword, obj.keywords.join(' '))) continue;

    if (!canCarryNumber(ch)) {
      ch.sendToChar("You can't carry that many items.\r\n");
      break;
    }
    if (!canCarryWeight(ch, obj.getTotalWeight())) {
      ch.sendToChar("You can't carry that much weight.\r\n");
      break;
    }

    objFromRoom(obj, room);
    objToChar(obj, ch);
    ch.sendToChar(`You get ${obj.shortDescription}.\r\n`);
    eventBus.emitEvent(GameEvent.ObjectPickup, { character: ch, object: obj });
    found = true;
  }

  if (!found) {
    ch.sendToChar("You don't see anything here.\r\n");
  }
}

function getFromContainer(ch: Character, objArg: string, containerArg: string, room: Room): void {
  // Find container in inventory or room
  let container = findObjInInventory(ch, containerArg);
  if (!container) {
    container = findObjInRoom(room, containerArg);
  }

  if (!container) {
    ch.sendToChar("You don't see that here.\r\n");
    return;
  }

  if (container.itemType !== ItemType.Container &&
      container.itemType !== ItemType.Corpse_NPC &&
      container.itemType !== ItemType.Corpse_PC) {
    ch.sendToChar("That's not a container.\r\n");
    return;
  }

  // Check if closed
  if (hasFlag(BigInt(container.values[1] ?? 0), CONT_FLAGS.CLOSED)) {
    ch.sendToChar("It's closed.\r\n");
    return;
  }

  // get all <container>
  if (objArg.toLowerCase() === 'all') {
    getAllFromContainer(ch, container, '', room);
    return;
  }

  // get all.<keyword> <container>
  if (objArg.toLowerCase().startsWith('all.')) {
    const keyword = objArg.substring(4);
    getAllFromContainer(ch, container, keyword, room);
    return;
  }

  // get <item> <container>
  const obj = findObjInContainer(container, objArg);
  if (!obj) {
    ch.sendToChar("You don't see that in there.\r\n");
    return;
  }

  getObj(ch, obj, room, container);
}

function getAllFromContainer(ch: Character, container: GameObject, keyword: string, _room: Room): void {
  let found = false;
  const objects = [...container.contents];

  for (const obj of objects) {
    if (obj.hasExtraFlag(ITEM_EXTRA_FLAGS.NO_TAKE)) continue;
    if (keyword && !isName(keyword, obj.keywords.join(' '))) continue;

    if (!canCarryNumber(ch)) {
      ch.sendToChar("You can't carry that many items.\r\n");
      break;
    }
    if (!canCarryWeight(ch, obj.getTotalWeight())) {
      ch.sendToChar("You can't carry that much weight.\r\n");
      break;
    }

    objFromObj(obj);
    objToChar(obj, ch);
    ch.sendToChar(`You get ${obj.shortDescription} from ${container.shortDescription}.\r\n`);
    eventBus.emitEvent(GameEvent.ObjectPickup, { character: ch, object: obj });
    found = true;
  }

  if (!found) {
    ch.sendToChar("You don't see anything in there.\r\n");
  }
}

// =============================================================================
// doDrop – Drop objects
// =============================================================================

/**
 * drop <item>
 * drop all / drop all.<keyword>
 * drop <amount> gold/silver/copper
 */
export function doDrop(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Drop what?\r\n');
    return;
  }

  const room = ch.inRoom as Room | null;
  if (!room) return;

  let [arg1, rest] = oneArgument(argument);

  // Check for currency drop: "drop 50 gold"
  if (rest && rest.trim().length > 0) {
    const amount = parseInt(arg1, 10);
    const [currType] = oneArgument(rest);
    if (!isNaN(amount) && amount > 0 && ['gold', 'silver', 'copper'].includes(currType.toLowerCase())) {
      dropCurrency(ch, amount, currType.toLowerCase(), room);
      return;
    }
  }

  // drop all
  if (arg1.toLowerCase() === 'all') {
    dropAll(ch, room, '');
    return;
  }

  // drop all.<keyword>
  if (arg1.toLowerCase().startsWith('all.')) {
    const keyword = arg1.substring(4);
    dropAll(ch, room, keyword);
    return;
  }

  // drop <item>
  const obj = findObjInInventory(ch, arg1);
  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  dropObj(ch, obj, room);
}

function dropObj(ch: Character, obj: GameObject, room: Room): void {
  // Check ITEM_NODROP
  if (obj.hasExtraFlag(ITEM_EXTRA_FLAGS.NODROP)) {
    ch.sendToChar("It's stuck to your hand!\r\n");
    return;
  }

  objFromChar(obj, ch);
  objToRoom(obj, room);

  ch.sendToChar(`You drop ${obj.shortDescription}.\r\n`);
  eventBus.emitEvent(GameEvent.ObjectDrop, { character: ch, object: obj });
}

function dropAll(ch: Character, room: Room, keyword: string): void {
  let found = false;
  const objects = [...(ch.inventory as GameObject[])];

  for (const obj of objects) {
    if (keyword && !isName(keyword, obj.keywords.join(' '))) continue;
    if (obj.wearLocation !== WearLocation.None) continue;

    if (obj.hasExtraFlag(ITEM_EXTRA_FLAGS.NODROP)) {
      ch.sendToChar(`You can't drop ${obj.shortDescription} — it's stuck to your hand!\r\n`);
      continue;
    }

    objFromChar(obj, ch);
    objToRoom(obj, room);
    ch.sendToChar(`You drop ${obj.shortDescription}.\r\n`);
    eventBus.emitEvent(GameEvent.ObjectDrop, { character: ch, object: obj });
    found = true;
  }

  if (!found) {
    ch.sendToChar("You don't have anything to drop.\r\n");
  }
}

function dropCurrency(ch: Character, amount: number, type: string, _room: Room): void {
  let has: number;
  switch (type) {
    case 'gold':   has = ch.gold; break;
    case 'silver': has = ch.silver; break;
    case 'copper': has = ch.copper; break;
    default: return;
  }

  if (has < amount) {
    ch.sendToChar(`You don't have that much ${type}.\r\n`);
    return;
  }

  switch (type) {
    case 'gold':   ch.gold -= amount; break;
    case 'silver': ch.silver -= amount; break;
    case 'copper': ch.copper -= amount; break;
  }

  ch.sendToChar(`You drop ${amount} ${type}.\r\n`);
  // In the legacy engine, currency piles become objects in the room.
  // For now, we just subtract from character. A proper implementation
  // would create a money object.
}

// =============================================================================
// doPut – Put objects in container
// =============================================================================

/**
 * put <item> <container>
 * put all <container>
 * put all.<keyword> <container>
 */
export function doPut(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Put what in what?\r\n');
    return;
  }

  const [arg1, rest] = oneArgument(argument);
  if (!rest || rest.trim().length === 0) {
    ch.sendToChar('Put it in what?\r\n');
    return;
  }
  const [arg2] = oneArgument(rest);

  // Find container
  let container = findObjInInventory(ch, arg2);
  if (!container && ch.inRoom) {
    container = findObjInRoom(ch.inRoom as Room, arg2);
  }

  if (!container) {
    ch.sendToChar("You don't see that here.\r\n");
    return;
  }

  if (container.itemType !== ItemType.Container) {
    ch.sendToChar("That's not a container.\r\n");
    return;
  }

  // Check if closed
  if (hasFlag(BigInt(container.values[1] ?? 0), CONT_FLAGS.CLOSED)) {
    ch.sendToChar("It's closed.\r\n");
    return;
  }

  // put all <container>
  if (arg1.toLowerCase() === 'all') {
    putAll(ch, container, '');
    return;
  }

  // put all.<keyword> <container>
  if (arg1.toLowerCase().startsWith('all.')) {
    const keyword = arg1.substring(4);
    putAll(ch, container, keyword);
    return;
  }

  // put <item> <container>
  const obj = findObjInInventory(ch, arg1);
  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  putObj(ch, obj, container);
}

function putObj(ch: Character, obj: GameObject, container: GameObject): void {
  if (obj === container) {
    ch.sendToChar("You can't put something inside itself.\r\n");
    return;
  }

  // Check weight limit (values[0] = weight capacity)
  const capacity = container.values[0] ?? 0;
  if (capacity > 0) {
    let currentWeight = 0;
    for (const c of container.contents) {
      currentWeight += c.getTotalWeight();
    }
    if (currentWeight + obj.getTotalWeight() > capacity) {
      ch.sendToChar("It won't fit.\r\n");
      return;
    }
  }

  objFromChar(obj, ch);
  objToObj(obj, container);

  ch.sendToChar(`You put ${obj.shortDescription} in ${container.shortDescription}.\r\n`);
}

function putAll(ch: Character, container: GameObject, keyword: string): void {
  let found = false;
  const objects = [...(ch.inventory as GameObject[])];

  for (const obj of objects) {
    if (obj === container) continue;
    if (obj.wearLocation !== WearLocation.None) continue;
    if (keyword && !isName(keyword, obj.keywords.join(' '))) continue;

    // Check weight limit
    const capacity = container.values[0] ?? 0;
    if (capacity > 0) {
      let currentWeight = 0;
      for (const c of container.contents) {
        currentWeight += c.getTotalWeight();
      }
      if (currentWeight + obj.getTotalWeight() > capacity) {
        ch.sendToChar(`${obj.shortDescription} won't fit.\r\n`);
        continue;
      }
    }

    objFromChar(obj, ch);
    objToObj(obj, container);
    ch.sendToChar(`You put ${obj.shortDescription} in ${container.shortDescription}.\r\n`);
    found = true;
  }

  if (!found) {
    ch.sendToChar("You don't have anything to put in it.\r\n");
  }
}

// =============================================================================
// doGive – Give item or currency to character
// =============================================================================

/**
 * give <item> <character>
 * give <amount> gold/silver/copper <character>
 */
export function doGive(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Give what to whom?\r\n');
    return;
  }

  const [arg1, rest1] = oneArgument(argument);
  if (!rest1 || rest1.trim().length === 0) {
    ch.sendToChar('Give it to whom?\r\n');
    return;
  }
  const [arg2, rest2] = oneArgument(rest1);

  // Check for currency give: "give 50 gold player"
  const amount = parseInt(arg1, 10);
  if (!isNaN(amount) && amount > 0 && ['gold', 'silver', 'copper'].includes(arg2.toLowerCase())) {
    const [targetArg] = rest2 ? oneArgument(rest2) : ['', ''];
    if (!targetArg || targetArg.length === 0) {
      ch.sendToChar('Give it to whom?\r\n');
      return;
    }
    giveCurrency(ch, amount, arg2.toLowerCase(), targetArg);
    return;
  }

  // give <item> <character>
  const obj = findObjInInventory(ch, arg1);
  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  const target = findCharInRoom(ch, arg2);
  if (!target) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  // Check recipient can carry
  if (!canCarryNumber(target)) {
    target.sendToChar("They can't carry any more items.\r\n");
    ch.sendToChar("They can't carry any more items.\r\n");
    return;
  }
  if (!canCarryWeight(target, obj.getTotalWeight())) {
    ch.sendToChar("They can't carry that much weight.\r\n");
    return;
  }

  objFromChar(obj, ch);
  objToChar(obj, target);

  ch.sendToChar(`You give ${obj.shortDescription} to ${target.name}.\r\n`);
  target.sendToChar(`${ch.name} gives you ${obj.shortDescription}.\r\n`);

  // TODO: Fire GIVE_PROG on recipient if NPC
}

function giveCurrency(ch: Character, amount: number, type: string, targetArg: string): void {
  const target = findCharInRoom(ch, targetArg);
  if (!target) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  let has: number;
  switch (type) {
    case 'gold':   has = ch.gold; break;
    case 'silver': has = ch.silver; break;
    case 'copper': has = ch.copper; break;
    default: return;
  }

  if (has < amount) {
    ch.sendToChar(`You don't have that much ${type}.\r\n`);
    return;
  }

  switch (type) {
    case 'gold':   ch.gold -= amount; target.gold += amount; break;
    case 'silver': ch.silver -= amount; target.silver += amount; break;
    case 'copper': ch.copper -= amount; target.copper += amount; break;
  }

  ch.sendToChar(`You give ${amount} ${type} to ${target.name}.\r\n`);
  target.sendToChar(`${ch.name} gives you ${amount} ${type}.\r\n`);
}

// =============================================================================
// doWear – Equip item
// =============================================================================

/**
 * wear <item>
 */
export function doWear(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Wear what?\r\n');
    return;
  }

  const [arg1] = oneArgument(argument);

  // wear all
  if (arg1.toLowerCase() === 'all') {
    doWearAll(ch);
    return;
  }

  const obj = findObjInInventory(ch, arg1);
  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  wearObj(ch, obj);
}

function wearObj(ch: Character, obj: GameObject): void {
  // Check WEAR_TAKE only means it can be picked up, not worn
  // Need at least one wear flag beyond TAKE
  if ((obj.wearFlags & ~WEAR_FLAGS.TAKE) === 0n) {
    ch.sendToChar("You can't wear that.\r\n");
    return;
  }

  let location = getWearLocation(obj);
  if (location === WearLocation.None) {
    ch.sendToChar("You can't wear that.\r\n");
    return;
  }

  // Handle dual locations (finger left/right, wrist left/right, ankle left/right, neck 1/2)
  location = findAvailableLocation(ch, obj, location);

  if (!canWearAt(ch, obj, location)) {
    // Try auto-removing existing item
    const existing = (ch.equipment as Map<WearLocation, GameObject>).get(location);
    if (existing) {
      if (existing.hasExtraFlag(ITEM_EXTRA_FLAGS.NOREMOVE)) {
        ch.sendToChar(`You can't remove ${existing.shortDescription}.\r\n`);
        return;
      }
      doRemoveObj(ch, existing);
    }

    if (!canWearAt(ch, obj, location)) {
      ch.sendToChar("You're already wearing something there.\r\n");
      return;
    }
  }

  // Move from inventory to equipment
  objFromChar(obj, ch);
  equipChar(ch, obj, location);

  ch.sendToChar(`You wear ${obj.shortDescription}.\r\n`);
}

/**
 * Find an available slot for dual-location items.
 * E.g., if FingerL is taken, try FingerR.
 */
function findAvailableLocation(ch: Character, _obj: GameObject, location: WearLocation): WearLocation {
  const equipment = ch.equipment as Map<WearLocation, GameObject>;

  switch (location) {
    case WearLocation.FingerL:
      if (equipment.has(WearLocation.FingerL) && !equipment.has(WearLocation.FingerR)) {
        return WearLocation.FingerR;
      }
      break;
    case WearLocation.Neck1:
      if (equipment.has(WearLocation.Neck1) && !equipment.has(WearLocation.Neck2)) {
        return WearLocation.Neck2;
      }
      break;
    case WearLocation.WristL:
      if (equipment.has(WearLocation.WristL) && !equipment.has(WearLocation.WristR)) {
        return WearLocation.WristR;
      }
      break;
    case WearLocation.AnkleL:
      if (equipment.has(WearLocation.AnkleL) && !equipment.has(WearLocation.AnkleR)) {
        return WearLocation.AnkleR;
      }
      break;
  }
  return location;
}

// =============================================================================
// doRemove – Unequip item
// =============================================================================

/**
 * remove <item>
 */
export function doRemove(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Remove what?\r\n');
    return;
  }

  const [arg1] = oneArgument(argument);

  const obj = findObjEquipped(ch, arg1);
  if (!obj) {
    ch.sendToChar("You aren't wearing that.\r\n");
    return;
  }

  doRemoveObj(ch, obj);
}

function doRemoveObj(ch: Character, obj: GameObject): void {
  // Check ITEM_NOREMOVE
  if (obj.hasExtraFlag(ITEM_EXTRA_FLAGS.NOREMOVE)) {
    ch.sendToChar("You can't remove it!\r\n");
    return;
  }

  unequipChar(ch, obj);
  objToChar(obj, ch);

  ch.sendToChar(`You remove ${obj.shortDescription}.\r\n`);
}

// =============================================================================
// doWearAll – Equip all equippable items in inventory
// =============================================================================

export function doWearAll(ch: Character): void {
  const objects = [...(ch.inventory as GameObject[])];
  let found = false;

  for (const obj of objects) {
    if (obj.wearLocation !== WearLocation.None) continue;
    if ((obj.wearFlags & ~WEAR_FLAGS.TAKE) === 0n) continue;

    const location = getWearLocation(obj);
    if (location === WearLocation.None) continue;

    const loc = findAvailableLocation(ch, obj, location);
    if (!canWearAt(ch, obj, loc)) continue;

    objFromChar(obj, ch);
    equipChar(ch, obj, loc);
    ch.sendToChar(`You wear ${obj.shortDescription}.\r\n`);
    found = true;
  }

  if (!found) {
    ch.sendToChar("You have nothing you can wear.\r\n");
  }
}

// =============================================================================
// doEat – Eat food or pill
// =============================================================================

/**
 * eat <item>
 */
export function doEat(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Eat what?\r\n');
    return;
  }

  const [arg1] = oneArgument(argument);
  const obj = findObjInInventory(ch, arg1);
  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  if (obj.itemType !== ItemType.Food && obj.itemType !== ItemType.Pill) {
    ch.sendToChar("You can't eat that.\r\n");
    return;
  }

  if (obj.itemType === ItemType.Food) {
    // values[0] = hours of food, values[3] = poisoned flag
    ch.sendToChar(`You eat ${obj.shortDescription}.\r\n`);

    // Restore hunger if player has pcData
    if (!ch.isNpc && (ch as any).pcData?.conditions) {
      const conditions = (ch as any).pcData.conditions;
      conditions.hunger = Math.min((conditions.hunger ?? 0) + (obj.values[0] ?? 1), 48);
    }

    // Check for poison
    if (obj.values[3] !== 0) {
      ch.sendToChar("You feel very sick.\r\n");
      const poisonAffect = new Affect(
        0, // poison type
        Math.max(1, Math.floor(obj.values[0] ?? 1)),
        0, // ApplyType.None
        0,
        AFF.POISON,
      );
      ch.applyAffect(poisonAffect);
    }
  } else if (obj.itemType === ItemType.Pill) {
    // values[0] = spell level, values[1-3] = spell SNs
    ch.sendToChar(`You eat ${obj.shortDescription}.\r\n`);

    // TODO: Apply up to 3 spell effects from values[1-3] via SpellEngine.castSpell()
    // For now, stub spell casting
  }

  extractObj(obj);
}

// =============================================================================
// doDrink – Drink from container or fountain
// =============================================================================

/**
 * drink <item>
 */
export function doDrink(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    // Try to find a fountain in the room
    if (ch.inRoom) {
      const room = ch.inRoom as Room;
      const fountain = (room.contents as GameObject[]).find(
        o => o.itemType === ItemType.Fountain
      );
      if (fountain) {
        drinkFrom(ch, fountain);
        return;
      }
    }
    ch.sendToChar('Drink what?\r\n');
    return;
  }

  const [arg1] = oneArgument(argument);

  // Check inventory first, then room
  let obj = findObjInInventory(ch, arg1);
  if (!obj && ch.inRoom) {
    obj = findObjInRoom(ch.inRoom as Room, arg1);
  }

  if (!obj) {
    ch.sendToChar("You can't find that.\r\n");
    return;
  }

  if (obj.itemType !== ItemType.DrinkCon && obj.itemType !== ItemType.Fountain) {
    ch.sendToChar("You can't drink from that.\r\n");
    return;
  }

  drinkFrom(ch, obj);
}

function drinkFrom(ch: Character, obj: GameObject): void {
  // values[0] = capacity, values[1] = current charges, values[2] = liquid type, values[3] = poisoned
  if (obj.itemType === ItemType.DrinkCon && (obj.values[1] ?? 0) <= 0) {
    ch.sendToChar("It's empty.\r\n");
    return;
  }

  ch.sendToChar(`You drink from ${obj.shortDescription}.\r\n`);

  // Restore thirst if player
  if (!ch.isNpc && (ch as any).pcData?.conditions) {
    const conditions = (ch as any).pcData.conditions;
    conditions.thirst = Math.min((conditions.thirst ?? 0) + 1, 48);
  }

  // Check for poison
  if (obj.values[3] !== 0) {
    ch.sendToChar("You feel very sick.\r\n");
  }

  // Decrement charges (fountains are infinite)
  if (obj.itemType === ItemType.DrinkCon) {
    obj.values[1] = Math.max(0, (obj.values[1] ?? 0) - 1);
  }
}

// =============================================================================
// doFill – Fill drink container from fountain/spring
// =============================================================================

/**
 * fill <container>
 */
export function doFill(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Fill what?\r\n');
    return;
  }

  const [arg1] = oneArgument(argument);

  const obj = findObjInInventory(ch, arg1);
  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  if (obj.itemType !== ItemType.DrinkCon) {
    ch.sendToChar("You can't fill that.\r\n");
    return;
  }

  // Find fountain in room
  if (!ch.inRoom) return;
  const room = ch.inRoom as Room;
  const fountain = (room.contents as GameObject[]).find(
    o => o.itemType === ItemType.Fountain
  );

  if (!fountain) {
    ch.sendToChar("There is no fountain here.\r\n");
    return;
  }

  // Fill to capacity (values[0])
  const capacity = obj.values[0] ?? 10;
  if ((obj.values[1] ?? 0) >= capacity) {
    ch.sendToChar("It's already full.\r\n");
    return;
  }

  obj.values[1] = capacity;
  // Set liquid type to fountain's liquid type
  obj.values[2] = fountain.values[2] ?? 0;
  // Clear any poison if fountain isn't poisoned
  obj.values[3] = fountain.values[3] ?? 0;

  ch.sendToChar(`You fill ${obj.shortDescription} from ${fountain.shortDescription}.\r\n`);
}

// =============================================================================
// doSacrifice – Sacrifice object for gold
// =============================================================================

/**
 * sacrifice <item>
 */
export function doSacrifice(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Sacrifice what?\r\n');
    return;
  }

  const [arg1] = oneArgument(argument);

  if (!ch.inRoom) return;
  const room = ch.inRoom as Room;

  const obj = findObjInRoom(room, arg1);
  if (!obj) {
    ch.sendToChar("You don't see that here.\r\n");
    return;
  }

  if (obj.hasExtraFlag(ITEM_EXTRA_FLAGS.NO_TAKE)) {
    ch.sendToChar("You can't sacrifice that.\r\n");
    return;
  }

  const goldReward = Math.max(1, Math.floor(obj.cost / 100));
  ch.gold += goldReward;

  ch.sendToChar(`You sacrifice ${obj.shortDescription} to the gods.\r\n`);
  ch.sendToChar(`The gods give you ${goldReward} gold for your sacrifice.\r\n`);

  extractObj(obj);
}

// =============================================================================
// doLoot – Loot corpse
// =============================================================================

/**
 * loot <corpse>
 * Alias for `get all corpse` with PK loot rules.
 */
export function doLoot(ch: Character, argument: string): void {
  if (!argument || argument.trim().length === 0) {
    ch.sendToChar('Loot what?\r\n');
    return;
  }

  const [arg1] = oneArgument(argument);

  if (!ch.inRoom) return;
  const room = ch.inRoom as Room;

  const container = findObjInRoom(room, arg1);
  if (!container) {
    ch.sendToChar("You don't see that here.\r\n");
    return;
  }

  if (container.itemType !== ItemType.Corpse_NPC && container.itemType !== ItemType.Corpse_PC) {
    ch.sendToChar("That's not a corpse.\r\n");
    return;
  }

  // PK loot rules: check if player corpse and ownership
  if (container.itemType === ItemType.Corpse_PC) {
    // In legacy, the corpse's name field contains the owner
    // For now, allow looting NPC corpses freely; PC corpses need ownership check
    // TODO: Implement proper PK loot ownership check
  }

  // Get all from corpse
  getAllFromContainer(ch, container, '', room);
}

// =============================================================================
// Command Registration
// =============================================================================

/** Register all object manipulation commands with the command registry. */
export function registerObjectCommands(registry: CommandRegistry): void {
  const objectCommands: Omit<CommandDef, 'useCount' | 'lagCount' | 'flags'>[] = [
    { name: 'get',       handler: doGet,       minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'drop',      handler: doDrop,      minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'put',       handler: doPut,       minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'give',      handler: doGive,      minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'wear',      handler: doWear,      minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'remove',    handler: doRemove,    minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'eat',       handler: doEat,       minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'drink',     handler: doDrink,     minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'fill',      handler: doFill,      minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'sacrifice', handler: doSacrifice, minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'loot',      handler: doLoot,      minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
  ];

  // TODO PARITY: Missing object/interaction commands — ask, compare, cook, council_induct, council_outcast, findnote, fire, gohome, group, gwhere, hold, house, play, pour, rent, rest, share, sheath, sit, sleep, split, stand, take, tip, unholster, order
  for (const cmd of objectCommands) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
