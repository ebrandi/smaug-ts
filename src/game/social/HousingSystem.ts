/**
 * HousingSystem – Player housing.
 *
 * Replicates legacy housing.c: buy/sell homes, go home,
 * set room descriptions, add accessories.
 */

import type { Character } from '../entities/Character.js';
import { oneArgument } from '../../utils/StringUtils.js';
import { hasFlag, setFlag, removeFlag } from '../../utils/BitVector.js';

// =============================================================================
// Interfaces
// =============================================================================

/** Persistent player house record. */
export interface PlayerHouse {
  id: string;
  owner: string;
  homeVnum: number;
  name: string;
  description: string;
  accessories: string[];
  apartment: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const HOUSE_BASE_PRICE = 100_000;
const APARTMENT_PRICE = 50_000;
const SELL_REFUND_PCT = 0.5;
const MAX_ACCESSORIES = 10;

/** Room flag indicating a house is for sale. */
const ROOM_HOUSE_FORSALE = 1n << 25n;

// =============================================================================
// Persistence Delegates
// =============================================================================

export interface HousePersistence {
  getHouseByOwner(owner: string): Promise<PlayerHouse | undefined>;
  saveHouse(house: Omit<PlayerHouse, 'id'> & { id?: string }): Promise<PlayerHouse>;
  deleteHouse(id: string): Promise<void>;
}

let persistence: HousePersistence = {
  async getHouseByOwner() { return undefined; },
  async saveHouse(h) {
    return { id: h.id ?? `house_${Date.now()}`, ...h } as PlayerHouse;
  },
  async deleteHouse() {},
};

export function setHousePersistence(p: HousePersistence): void {
  persistence = p;
}

// =============================================================================
// Room Mover Delegate
// =============================================================================

let moveCharToRoom: (ch: Character, vnum: number) => boolean = () => false;

export function setMoveCharToRoom(fn: (ch: Character, vnum: number) => boolean): void {
  moveCharToRoom = fn;
}

// =============================================================================
// Room helpers – cast inRoom from unknown
// =============================================================================

interface RoomLike {
  vnum: number;
  name: string;
  description: string;
  roomFlags: bigint;
}

function getInRoom(ch: Character): RoomLike | null {
  return ch.inRoom as RoomLike | null;
}

function getRoomVnum(ch: Character): number {
  return getInRoom(ch)?.vnum ?? 0;
}

function getRoomFlags(ch: Character): bigint {
  return getInRoom(ch)?.roomFlags ?? 0n;
}

function setRoomFlags(ch: Character, flags: bigint): void {
  const room = getInRoom(ch);
  if (room) room.roomFlags = flags;
}

// =============================================================================
// Commands
// =============================================================================

/**
 * doHomebuy – Purchase the current room as a home.
 */
export async function doHomebuy(ch: Character, _argument: string): Promise<void> {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot buy homes.\r\n');
    return;
  }

  const roomFlags = getRoomFlags(ch);

  if (!hasFlag(roomFlags, ROOM_HOUSE_FORSALE)) {
    ch.sendToChar('This room is not for sale.\r\n');
    return;
  }

  const existing = await persistence.getHouseByOwner(ch.name);
  if (existing) {
    ch.sendToChar('You already own a home.\r\n');
    return;
  }

  const price = HOUSE_BASE_PRICE;

  if (ch.gold < price) {
    ch.sendToChar(`You need ${price} gold to buy this home.\r\n`);
    return;
  }

  ch.gold -= price;

  setRoomFlags(ch, removeFlag(roomFlags, ROOM_HOUSE_FORSALE));

  const room = getInRoom(ch);
  await persistence.saveHouse({
    owner: ch.name,
    homeVnum: getRoomVnum(ch),
    name: room?.name ?? 'Your Home',
    description: room?.description ?? '',
    accessories: [],
    apartment: false,
  });

  ch.sendToChar('Congratulations! You are now the proud owner of this home.\r\n');
}

/**
 * doGohome – Teleport to your home.
 */
export async function doGohome(ch: Character, _argument: string): Promise<void> {
  if (ch.isNpc) {
    ch.sendToChar('NPCs do not have homes.\r\n');
    return;
  }

  const house = await persistence.getHouseByOwner(ch.name);
  if (!house) {
    ch.sendToChar('You do not own a home.\r\n');
    return;
  }

  const success = moveCharToRoom(ch, house.homeVnum);
  if (success) {
    ch.sendToChar('You return to your home.\r\n');
  } else {
    ch.sendToChar('You cannot get to your home right now.\r\n');
  }
}

/**
 * doHomeSet – Set custom name or description for your home.
 *
 * Syntax: homeset name <text>
 *         homeset desc <text>
 */
export async function doHomeSet(ch: Character, argument: string): Promise<void> {
  if (ch.isNpc) {
    ch.sendToChar('NPCs do not have homes.\r\n');
    return;
  }

  const house = await persistence.getHouseByOwner(ch.name);
  if (!house) {
    ch.sendToChar('You do not own a home.\r\n');
    return;
  }

  if (getRoomVnum(ch) !== house.homeVnum) {
    ch.sendToChar('You must be in your home to change its settings.\r\n');
    return;
  }

  const [field, rest] = oneArgument(argument);
  if (!field) {
    ch.sendToChar('Syntax: homeset <name|desc> <text>\r\n');
    return;
  }

  const sub = field.toLowerCase();
  const room = getInRoom(ch);

  switch (sub) {
    case 'name': {
      const name = rest.trim();
      if (!name) {
        ch.sendToChar('Set the room name to what?\r\n');
        return;
      }
      house.name = name;
      if (room) room.name = name;
      await persistence.saveHouse(house);
      ch.sendToChar(`Home name set to: ${name}\r\n`);
      break;
    }
    case 'desc': {
      const desc = rest.trim();
      if (!desc) {
        ch.sendToChar('Set the room description to what?\r\n');
        return;
      }
      house.description = desc;
      if (room) room.description = desc;
      await persistence.saveHouse(house);
      ch.sendToChar('Home description set.\r\n');
      break;
    }
    default:
      ch.sendToChar('Syntax: homeset <name|desc> <text>\r\n');
      break;
  }
}

/**
 * doHomeAccessory – Add or remove furniture / decorations.
 *
 * Syntax: homeaccessory add <item>
 *         homeaccessory remove <item>
 */
export async function doHomeAccessory(ch: Character, argument: string): Promise<void> {
  if (ch.isNpc) {
    ch.sendToChar('NPCs do not have homes.\r\n');
    return;
  }

  const house = await persistence.getHouseByOwner(ch.name);
  if (!house) {
    ch.sendToChar('You do not own a home.\r\n');
    return;
  }

  if (getRoomVnum(ch) !== house.homeVnum) {
    ch.sendToChar('You must be in your home to manage accessories.\r\n');
    return;
  }

  const [action, rest] = oneArgument(argument);
  if (!action) {
    ch.sendToChar('Syntax: homeaccessory <add|remove> <item>\r\n');
    return;
  }

  const sub = action.toLowerCase();
  const itemName = rest.trim();

  if (!itemName) {
    ch.sendToChar('Specify an item.\r\n');
    return;
  }

  switch (sub) {
    case 'add': {
      if (house.accessories.length >= MAX_ACCESSORIES) {
        ch.sendToChar(`You cannot have more than ${MAX_ACCESSORIES} accessories.\r\n`);
        return;
      }
      house.accessories.push(itemName);
      await persistence.saveHouse(house);
      ch.sendToChar(`You add ${itemName} to your home.\r\n`);
      break;
    }
    case 'remove': {
      const idx = house.accessories.indexOf(itemName);
      if (idx === -1) {
        ch.sendToChar('That accessory is not in your home.\r\n');
        return;
      }
      house.accessories.splice(idx, 1);
      await persistence.saveHouse(house);
      ch.sendToChar(`You remove ${itemName} from your home.\r\n`);
      break;
    }
    default:
      ch.sendToChar('Syntax: homeaccessory <add|remove> <item>\r\n');
      break;
  }
}

/**
 * doHomesell – Sell your home back for a partial refund.
 */
export async function doHomesell(ch: Character, _argument: string): Promise<void> {
  if (ch.isNpc) {
    ch.sendToChar('NPCs do not have homes.\r\n');
    return;
  }

  const house = await persistence.getHouseByOwner(ch.name);
  if (!house) {
    ch.sendToChar('You do not own a home.\r\n');
    return;
  }

  const basePrice = house.apartment ? APARTMENT_PRICE : HOUSE_BASE_PRICE;
  const refund = Math.floor(basePrice * SELL_REFUND_PCT);

  ch.gold += refund;

  // Restore for-sale flag if in the home room
  if (getRoomVnum(ch) === house.homeVnum) {
    setRoomFlags(ch, setFlag(getRoomFlags(ch), ROOM_HOUSE_FORSALE));
  }

  await persistence.deleteHouse(house.id);

  ch.sendToChar(`You sell your home and receive ${refund} gold.\r\n`);
}

// =============================================================================
// Exports for testing
// =============================================================================

export { HOUSE_BASE_PRICE, APARTMENT_PRICE, SELL_REFUND_PCT, MAX_ACCESSORIES, ROOM_HOUSE_FORSALE };
