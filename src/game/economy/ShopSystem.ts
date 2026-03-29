/**
 * ShopSystem.ts – Shop buy/sell system for SMAUG 2.0.
 *
 * Replicates legacy shops.c: doList, doBuy, doSell, doValue, doRepair.
 * Uses Currency module from Phase 3D-1. Prices include race and
 * charisma modifiers matching the legacy get_cost() formula.
 */

import type { Character } from '../entities/Character.js';
import { Mobile } from '../entities/Mobile.js';
import type { Room } from '../entities/Room.js';
import type { ShopData } from '../entities/types.js';
import { GameObject } from '../entities/GameObject.js';
import {
  toCopper,
  canAfford,
  deductCost,
  addCurrency,
  formatCurrency,
  normalizeCurrency,
} from './Currency.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// Helper Functions
// =============================================================================

/** Find a shopkeeper NPC in the room. */
export function findShopkeeper(room: Room): Mobile | null {
  const mobiles = room.getMobiles() as Mobile[];
  for (const mob of mobiles) {
    if (mob.shopData) {
      return mob;
    }
  }
  return null;
}

/** Check if the shop is open at the given game hour. */
export function isShopOpen(shop: ShopData, gameHour: number): boolean {
  if (shop.openHour <= shop.closeHour) {
    return gameHour >= shop.openHour && gameHour < shop.closeHour;
  }
  // Wraps midnight
  return gameHour >= shop.openHour || gameHour < shop.closeHour;
}

/**
 * Get racial price modifier for shop transactions.
 * Replicates legacy racial modifiers from get_cost().
 */
export function getRacePriceModifier(race: string): number {
  switch (race.toLowerCase()) {
    case 'elf':      return -10;
    case 'dwarf':    return 3;
    case 'halfling': return -2;
    case 'pixie':    return -8;
    case 'half-orc': return 7;
    default:         return 0;
  }
}

/**
 * Calculate buy price for an item.
 * Legacy get_cost() formula:
 *   cost = baseCost * max(profitSell + 1, profitBuy + raceProfitMod) / 100
 *   cost = cost * (80 + min(buyerLevel, 65)) / 100
 *   CHA modifier: cost = cost * (100 - (buyerCha - 13) * 2) / 100
 */
export function shopBuyPrice(
  obj: GameObject,
  shop: ShopData,
  buyer: Character,
): number {
  const baseCost = obj.cost;
  const raceMod = getRacePriceModifier(buyer.race);
  const profitFactor = Math.max(shop.profitSell + 1, shop.profitBuy + raceMod);
  let cost = Math.floor(baseCost * profitFactor / 100);
  cost = Math.floor(cost * (80 + Math.min(buyer.level, 65)) / 100);
  // CHA modifier
  const cha = buyer.getStat('cha');
  cost = Math.floor(cost * (100 - (cha - 13) * 2) / 100);
  return Math.max(cost, 1); // minimum 1 copper
}

/**
 * Calculate sell price for an item.
 * Legacy formula: baseCost * profitSell / 100, apply CHA modifier.
 */
export function shopSellPrice(
  obj: GameObject,
  shop: ShopData,
  seller: Character,
): number {
  const baseCost = obj.cost;
  let cost = Math.floor(baseCost * shop.profitSell / 100);
  // CHA modifier (seller gets more with higher CHA)
  const cha = seller.getStat('cha');
  cost = Math.floor(cost * (100 + (cha - 13) * 2) / 100);
  return Math.max(cost, 1); // minimum 1 copper
}

// =============================================================================
// Game Time Accessor (injectable for testing)
// =============================================================================

let _getGameHour: () => number = () => 12; // default: always open

/** Set the game hour accessor function. */
export function setGameHourAccessor(fn: () => number): void {
  _getGameHour = fn;
}

// =============================================================================
// Commands
// =============================================================================

/** List items for sale. */
export function doList(ch: Character, _argument: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar('You are nowhere!\r\n');
    return;
  }

  const keeper = findShopkeeper(room);
  if (!keeper || !keeper.shopData) {
    ch.sendToChar('There is no shopkeeper here.\r\n');
    return;
  }

  const shop = keeper.shopData;
  if (!isShopOpen(shop, _getGameHour())) {
    ch.sendToChar('The shop is closed.\r\n');
    return;
  }

  const items = keeper.inventory as GameObject[];
  if (items.length === 0) {
    ch.sendToChar('The shopkeeper has nothing for sale.\r\n');
    return;
  }

  ch.sendToChar('[Num] Level  Price             Item\r\n');
  ch.sendToChar('─────────────────────────────────────────\r\n');

  for (let i = 0; i < items.length; i++) {
    const obj = items[i]!;
    const price = shopBuyPrice(obj, shop, ch);
    const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: price }));
    const num = String(i + 1).padStart(3);
    const lvl = String(obj.prototype?.level ?? 1).padStart(5);
    ch.sendToChar(`[${num}] ${lvl}  ${priceStr.padEnd(18)} ${obj.shortDescription}\r\n`);
  }
}

/** Buy an item from a shopkeeper. */
export function doBuy(ch: Character, argument: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar('You are nowhere!\r\n');
    return;
  }

  const keeper = findShopkeeper(room);
  if (!keeper || !keeper.shopData) {
    ch.sendToChar('There is no shopkeeper here.\r\n');
    return;
  }

  const shop = keeper.shopData;
  if (!isShopOpen(shop, _getGameHour())) {
    ch.sendToChar('The shop is closed.\r\n');
    return;
  }

  if (!argument.trim()) {
    ch.sendToChar('Buy what?\r\n');
    return;
  }

  // Find item in keeper's inventory
  const items = keeper.inventory as GameObject[];
  const searchName = argument.trim().toLowerCase();
  const obj = items.find(item => {
    const go = item as GameObject;
    return go.name.toLowerCase().includes(searchName) ||
           go.shortDescription.toLowerCase().includes(searchName);
  }) as GameObject | undefined;

  if (!obj) {
    ch.sendToChar('The shopkeeper does not sell that.\r\n');
    return;
  }

  const price = shopBuyPrice(obj, shop, ch);
  const buyerCurrency = { gold: ch.gold, silver: ch.silver, copper: ch.copper };

  if (!canAfford(buyerCurrency, price)) {
    ch.sendToChar('You cannot afford that.\r\n');
    return;
  }

  // Deduct cost
  const remaining = deductCost(buyerCurrency, price);
  ch.gold = remaining.gold;
  ch.silver = remaining.silver;
  ch.copper = remaining.copper;

  // Add gold to keeper
  const keeperCurrency = { gold: keeper.gold, silver: keeper.silver, copper: keeper.copper };
  const newKeeperCurrency = addCurrency(keeperCurrency, normalizeCurrency({ gold: 0, silver: 0, copper: price }));
  keeper.gold = newKeeperCurrency.gold;
  keeper.silver = newKeeperCurrency.silver;
  keeper.copper = newKeeperCurrency.copper;

  // Transfer item
  const idx = items.indexOf(obj);
  if (idx !== -1) {
    items.splice(idx, 1);
  }
  (ch.inventory as GameObject[]).push(obj);
  obj.carriedBy = ch;

  const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: price }));
  ch.sendToChar(`You buy ${obj.shortDescription} for ${priceStr}.\r\n`);
  keeper.sendToChar(`You sell ${obj.shortDescription}.\r\n`);

  logger.debug('economy', `ShopSystem: ${ch.name} bought ${obj.name} for ${price} copper`);
}

/** Sell an item to a shopkeeper. */
export function doSell(ch: Character, argument: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar('You are nowhere!\r\n');
    return;
  }

  const keeper = findShopkeeper(room);
  if (!keeper || !keeper.shopData) {
    ch.sendToChar('There is no shopkeeper here.\r\n');
    return;
  }

  const shop = keeper.shopData;
  if (!isShopOpen(shop, _getGameHour())) {
    ch.sendToChar('The shop is closed.\r\n');
    return;
  }

  if (!argument.trim()) {
    ch.sendToChar('Sell what?\r\n');
    return;
  }

  // Find item in player's inventory
  const playerItems = ch.inventory as GameObject[];
  const searchName = argument.trim().toLowerCase();
  const obj = playerItems.find(item => {
    const go = item as GameObject;
    return go.name.toLowerCase().includes(searchName) ||
           go.shortDescription.toLowerCase().includes(searchName);
  }) as GameObject | undefined;

  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  // Check keeper buys this item type
  if (shop.buyType.length > 0 && !shop.buyType.includes(obj.itemType)) {
    ch.sendToChar('The shopkeeper is not interested in that.\r\n');
    return;
  }

  const price = shopSellPrice(obj, shop, ch);

  // Check keeper can afford
  const keeperWealth = toCopper({ gold: keeper.gold, silver: keeper.silver, copper: keeper.copper });
  if (keeperWealth < price) {
    ch.sendToChar('The shopkeeper cannot afford that.\r\n');
    return;
  }

  // Transfer item to keeper
  const idx = playerItems.indexOf(obj);
  if (idx !== -1) {
    playerItems.splice(idx, 1);
  }
  (keeper.inventory as GameObject[]).push(obj);
  obj.carriedBy = keeper;

  // Add currency to seller
  const sellerCurrency = { gold: ch.gold, silver: ch.silver, copper: ch.copper };
  const newSellerCurrency = addCurrency(sellerCurrency, normalizeCurrency({ gold: 0, silver: 0, copper: price }));
  ch.gold = newSellerCurrency.gold;
  ch.silver = newSellerCurrency.silver;
  ch.copper = newSellerCurrency.copper;

  // Deduct from keeper
  const keeperCurrency = { gold: keeper.gold, silver: keeper.silver, copper: keeper.copper };
  const newKeeperCurrency = deductCost(keeperCurrency, price);
  keeper.gold = newKeeperCurrency.gold;
  keeper.silver = newKeeperCurrency.silver;
  keeper.copper = newKeeperCurrency.copper;

  const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: price }));
  ch.sendToChar(`You sell ${obj.shortDescription} for ${priceStr}.\r\n`);

  logger.debug('economy', `ShopSystem: ${ch.name} sold ${obj.name} for ${price} copper`);
}

/** Appraise an item (show its sell price). */
export function doValue(ch: Character, argument: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar('You are nowhere!\r\n');
    return;
  }

  const keeper = findShopkeeper(room);
  if (!keeper || !keeper.shopData) {
    ch.sendToChar('There is no shopkeeper here.\r\n');
    return;
  }

  if (!isShopOpen(keeper.shopData, _getGameHour())) {
    ch.sendToChar('The shop is closed.\r\n');
    return;
  }

  if (!argument.trim()) {
    ch.sendToChar('Value what?\r\n');
    return;
  }

  // Find item in player's inventory
  const playerItems = ch.inventory as GameObject[];
  const searchName = argument.trim().toLowerCase();
  const obj = playerItems.find(item => {
    const go = item as GameObject;
    return go.name.toLowerCase().includes(searchName) ||
           go.shortDescription.toLowerCase().includes(searchName);
  }) as GameObject | undefined;

  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  // Check keeper buys this item type
  if (keeper.shopData.buyType.length > 0 && !keeper.shopData.buyType.includes(obj.itemType)) {
    ch.sendToChar('The shopkeeper is not interested in that.\r\n');
    return;
  }

  const price = shopSellPrice(obj, keeper.shopData, ch);
  const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: price }));
  ch.sendToChar(`The shopkeeper would pay ${priceStr} for ${obj.shortDescription}.\r\n`);
}

/** Repair a damaged item at a repair shop. */
export function doRepair(ch: Character, argument: string): void {
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar('You are nowhere!\r\n');
    return;
  }

  // Find a mobile with repairShopData
  const mobiles = room.getMobiles() as Mobile[];
  let repairMob: Mobile | null = null;
  for (const mob of mobiles) {
    if (mob.repairShopData) {
      repairMob = mob;
      break;
    }
  }

  if (!repairMob || !repairMob.repairShopData) {
    ch.sendToChar('There is no repair shop here.\r\n');
    return;
  }

  const rshop = repairMob.repairShopData;
  if (!isShopOpen({ keeper: rshop.keeper, buyType: [], profitBuy: 100, profitSell: 100, openHour: rshop.openHour, closeHour: rshop.closeHour }, _getGameHour())) {
    ch.sendToChar('The repair shop is closed.\r\n');
    return;
  }

  if (!argument.trim()) {
    ch.sendToChar('Repair what?\r\n');
    return;
  }

  // Find item in player's inventory
  const playerItems = ch.inventory as GameObject[];
  const searchName = argument.trim().toLowerCase();
  const obj = playerItems.find(item => {
    const go = item as GameObject;
    return go.name.toLowerCase().includes(searchName) ||
           go.shortDescription.toLowerCase().includes(searchName);
  }) as GameObject | undefined;

  if (!obj) {
    ch.sendToChar("You don't have that.\r\n");
    return;
  }

  // Check this item type is repairable
  if (rshop.fixType.length > 0 && !rshop.fixType.includes(obj.itemType)) {
    ch.sendToChar('They cannot repair that type of item.\r\n');
    return;
  }

  // Check condition (values[0] for weapons = current condition, values[1] = max)
  // For simplicity, use cost-based repair pricing
  const repairCost = Math.floor(obj.cost * rshop.profitFix / 1000);
  if (repairCost <= 0) {
    ch.sendToChar('That item does not need repair.\r\n');
    return;
  }

  const buyerCurrency = { gold: ch.gold, silver: ch.silver, copper: ch.copper };
  if (!canAfford(buyerCurrency, repairCost)) {
    ch.sendToChar(`You cannot afford the ${formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: repairCost }))} repair cost.\r\n`);
    return;
  }

  // Deduct cost
  const remaining = deductCost(buyerCurrency, repairCost);
  ch.gold = remaining.gold;
  ch.silver = remaining.silver;
  ch.copper = remaining.copper;

  const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: repairCost }));
  ch.sendToChar(`You pay ${priceStr} to repair ${obj.shortDescription}.\r\n`);

  logger.debug('economy', `ShopSystem: ${ch.name} repaired ${obj.name} for ${repairCost} copper`);
}
