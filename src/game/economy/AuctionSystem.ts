/**
 * AuctionSystem.ts – Global auction system for SMAUG 2.0.
 *
 * Replicates legacy auction_update() from update.c.
 * Three-round going-once/twice/sold mechanic with broadcast.
 * Wired to TickEngine via EventBus AuctionTick event.
 */

import type { Player } from '../entities/Player.js';
import type { GameObject } from '../entities/GameObject.js';
import { type EventBus, GameEvent } from '../../core/EventBus.js';
import {
  canAfford,
  deductCost,
  addCurrency,
  normalizeCurrency,
  formatCurrency,
} from './Currency.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// State
// =============================================================================

export interface AuctionState {
  item: GameObject | null;
  seller: Player | null;
  bidder: Player | null;
  currentBid: number;  // in copper
  startingBid: number; // in copper
  round: number;       // 0 = not active, 1-3 = going once/twice/sold
}

const auctionState: AuctionState = {
  item: null,
  seller: null,
  bidder: null,
  currentBid: 0,
  startingBid: 0,
  round: 0,
};

/** Get a readonly view of the current auction state (mainly for testing). */
export function getAuctionState(): Readonly<AuctionState> {
  return auctionState;
}

/** Reset auction state (for testing). */
export function resetAuction(): void {
  auctionState.item = null;
  auctionState.seller = null;
  auctionState.bidder = null;
  auctionState.currentBid = 0;
  auctionState.startingBid = 0;
  auctionState.round = 0;
}

// =============================================================================
// Broadcast
// =============================================================================

let _broadcastFn: (message: string) => void = (_msg: string) => {
  // Default no-op; set via setBroadcastFunction
};

/** Set the broadcast function used to send auction messages to all players. */
export function setBroadcastFunction(fn: (message: string) => void): void {
  _broadcastFn = fn;
}

function broadcast(message: string): void {
  _broadcastFn(`[AUCTION] ${message}\r\n`);
}

// =============================================================================
// Commands
// =============================================================================

/**
 * Start or stop an auction.
 * Syntax: auction <item> <startingBid>  — start
 *         auction stop                  — cancel
 */
export function doAuction(ch: Player, argument: string): void {
  const args = argument.trim().split(/\s+/);

  // auction stop
  if (args[0]?.toLowerCase() === 'stop') {
    if (auctionState.round === 0) {
      ch.sendToChar('There is no auction to stop.\r\n');
      return;
    }
    if (auctionState.seller !== ch && !ch.isImmortal) {
      ch.sendToChar('Only the seller or an immortal can stop the auction.\r\n');
      return;
    }
    // Return item to seller
    if (auctionState.item && auctionState.seller) {
      (auctionState.seller.inventory as GameObject[]).push(auctionState.item);
      auctionState.item.carriedBy = auctionState.seller;
    }
    broadcast(`Auction cancelled by ${ch.name}. Item returned to ${auctionState.seller?.name ?? 'seller'}.`);
    logger.info('economy', `Auction cancelled by ${ch.name}`);
    resetAuction();
    return;
  }

  // Start new auction
  if (auctionState.round !== 0) {
    ch.sendToChar('An auction is already in progress.\r\n');
    return;
  }

  if (args.length < 2) {
    ch.sendToChar('Usage: auction <item> <starting_bid>\r\n');
    return;
  }

  const itemName = args[0]!.toLowerCase();
  const bidStr = args[1]!;
  const startBid = parseInt(bidStr, 10);

  if (isNaN(startBid) || startBid <= 0) {
    ch.sendToChar('Starting bid must be a positive number.\r\n');
    return;
  }

  // Find item in player's inventory
  const playerItems = ch.inventory as GameObject[];
  const obj = playerItems.find(item => {
    const go = item as GameObject;
    return go.name.toLowerCase().includes(itemName) ||
           go.shortDescription.toLowerCase().includes(itemName);
  }) as GameObject | undefined;

  if (!obj) {
    ch.sendToChar("You don't have that item.\r\n");
    return;
  }

  // Remove item from inventory
  const idx = playerItems.indexOf(obj);
  if (idx !== -1) {
    playerItems.splice(idx, 1);
  }
  obj.carriedBy = null;

  // Set up auction
  auctionState.item = obj;
  auctionState.seller = ch;
  auctionState.bidder = null;
  auctionState.currentBid = startBid;
  auctionState.startingBid = startBid;
  auctionState.round = 1;

  const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: startBid }));
  broadcast(`${ch.name} is auctioning ${obj.shortDescription}. Starting bid: ${priceStr}.`);

  logger.info('economy', `Auction started by ${ch.name}: ${obj.name} at ${startBid} copper`);
}

/**
 * Place a bid on the current auction.
 * Bid must exceed current bid by at least 10% or 100 copper (whichever is greater).
 */
export function doBid(ch: Player, argument: string): void {
  if (auctionState.round === 0) {
    ch.sendToChar('There is no auction in progress.\r\n');
    return;
  }

  if (ch === auctionState.seller) {
    ch.sendToChar('You cannot bid on your own auction.\r\n');
    return;
  }

  const bidAmount = parseInt(argument.trim(), 10);
  if (isNaN(bidAmount) || bidAmount <= 0) {
    ch.sendToChar('How much do you want to bid?\r\n');
    return;
  }

  // Minimum increment: 10% of current bid or 100 copper, whichever is greater
  const minIncrement = Math.max(Math.floor(auctionState.currentBid * 0.1), 100);
  const minBid = auctionState.currentBid + minIncrement;

  if (bidAmount < minBid) {
    const minStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: minBid }));
    ch.sendToChar(`Your bid must be at least ${minStr}.\r\n`);
    return;
  }

  // Check bidder can afford
  const bidderCurrency = { gold: ch.gold, silver: ch.silver, copper: ch.copper };
  if (!canAfford(bidderCurrency, bidAmount)) {
    ch.sendToChar('You cannot afford that bid.\r\n');
    return;
  }

  auctionState.currentBid = bidAmount;
  auctionState.bidder = ch;
  auctionState.round = 1; // Reset to round 1 on new bid

  const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: bidAmount }));
  broadcast(`${ch.name} bids ${priceStr} on ${auctionState.item?.shortDescription ?? 'an item'}.`);

  logger.info('economy', `Bid: ${ch.name} bids ${bidAmount} copper`);
}

// =============================================================================
// Auction Tick Update
// =============================================================================

/**
 * Called every PULSE_AUCTION (36 pulses = 9 seconds).
 * Advances auction rounds: going once → going twice → sold.
 */
export function auctionUpdate(): void {
  if (auctionState.round === 0) {
    return;
  }

  const itemDesc = auctionState.item?.shortDescription ?? 'an item';

  if (auctionState.round === 1) {
    broadcast(`${itemDesc}: going once...`);
    auctionState.round = 2;
    return;
  }

  if (auctionState.round === 2) {
    broadcast(`${itemDesc}: going twice...`);
    auctionState.round = 3;
    return;
  }

  if (auctionState.round === 3) {
    if (auctionState.bidder && auctionState.seller && auctionState.item) {
      // SOLD!
      const bidder = auctionState.bidder;
      const seller = auctionState.seller;
      const item = auctionState.item;
      const price = auctionState.currentBid;

      // Transfer gold from bidder to seller
      const bidderCurrency = { gold: bidder.gold, silver: bidder.silver, copper: bidder.copper };
      const newBidderCurrency = deductCost(bidderCurrency, price);
      bidder.gold = newBidderCurrency.gold;
      bidder.silver = newBidderCurrency.silver;
      bidder.copper = newBidderCurrency.copper;

      const sellerCurrency = { gold: seller.gold, silver: seller.silver, copper: seller.copper };
      const newSellerCurrency = addCurrency(sellerCurrency, normalizeCurrency({ gold: 0, silver: 0, copper: price }));
      seller.gold = newSellerCurrency.gold;
      seller.silver = newSellerCurrency.silver;
      seller.copper = newSellerCurrency.copper;

      // Transfer item to bidder
      (bidder.inventory as GameObject[]).push(item);
      item.carriedBy = bidder;

      const priceStr = formatCurrency(normalizeCurrency({ gold: 0, silver: 0, copper: price }));
      broadcast(`SOLD! ${itemDesc} to ${bidder.name} for ${priceStr}.`);

      logger.info('economy', `Auction sold: ${item.name} to ${bidder.name} for ${price} copper`);

      // Emit auction sold event via the broadcast mechanism
      // (AuctionTick event is already emitted by TickEngine)
    } else if (auctionState.seller && auctionState.item) {
      // No bidder — return item
      const seller = auctionState.seller;
      const item = auctionState.item;

      (seller.inventory as GameObject[]).push(item);
      item.carriedBy = seller;

      broadcast(`No bids. ${itemDesc} returned to ${seller.name}.`);

      logger.info('economy', `Auction ended: no bids for ${item.name}`);
    }

    resetAuction();
  }
}

// =============================================================================
// EventBus Wiring
// =============================================================================

/** Wire the auction update to the TickEngine's AuctionTick event. */
export function wireAuctionToTick(eventBus: EventBus): void {
  eventBus.on(GameEvent.AuctionTick, () => {
    auctionUpdate();
  });
}
