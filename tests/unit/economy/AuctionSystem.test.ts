import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import { ItemType, Position, type ObjectPrototype } from '../../../src/game/entities/types.js';
import {
  doAuction, doBid, auctionUpdate,
  getAuctionState, resetAuction,
  setBroadcastFunction,
} from '../../../src/game/economy/AuctionSystem.js';

// =============================================================================
// Helpers
// =============================================================================

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

function makeObjProto(overrides: Partial<ObjectPrototype> = {}): ObjectPrototype {
  return {
    vnum: 3000,
    name: 'amulet',
    shortDesc: 'a golden amulet',
    longDesc: 'An amulet lies here.',
    description: '',
    itemType: ItemType.Treasure,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 0, 0, 0],
    weight: 1,
    cost: 50000,
    rent: 0,
    level: 15,
    layers: 0,
    extraDescriptions: [],
    affects: [],
    ...overrides,
  };
}

function makePlayer_(name: string, gold: number = 100): Player {
  const p = new Player({
    name,
    level: 10,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 13, lck: 9 },
    gold,
  });
  p.descriptor = mockDescriptor as any;
  return p;
}

let broadcasts: string[] = [];

describe('AuctionSystem', () => {
  beforeEach(() => {
    resetAuction();
    GameObject.resetCounters();
    broadcasts = [];
    setBroadcastFunction((msg: string) => broadcasts.push(msg));
    Player.setEventBus(null);
  });

  describe('doAuction - start', () => {
    it('should start an auction with valid item and bid', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);

      doAuction(seller, 'amulet 1000');

      const state = getAuctionState();
      expect(state.item).toBe(item);
      expect(state.seller).toBe(seller);
      expect(state.startingBid).toBe(1000);
      expect(state.round).toBe(1);
      expect((seller.inventory as GameObject[]).includes(item)).toBe(false);
      expect(broadcasts.length).toBeGreaterThan(0);
    });

    it('should reject if already an auction in progress', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      const seller2 = makePlayer_('Seller2');
      const item2 = new GameObject(makeObjProto({ name: 'ring' }));
      (seller2.inventory as GameObject[]).push(item2);
      const messages: string[] = [];
      seller2.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doAuction(seller2, 'ring 500');
      expect(messages.join('')).toContain('already in progress');
    });

    it('should reject with missing arguments', () => {
      const seller = makePlayer_('Seller');
      const messages: string[] = [];
      seller.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doAuction(seller, 'amulet');
      expect(messages.join('')).toContain('Usage');
    });
  });

  describe('doAuction - stop', () => {
    it('should cancel auction and return item', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      doAuction(seller, 'stop');

      expect(getAuctionState().round).toBe(0);
      expect((seller.inventory as GameObject[]).includes(item)).toBe(true);
    });

    it('should reject non-seller stop (non-immortal)', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      const other = makePlayer_('Other');
      const messages: string[] = [];
      other.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doAuction(other, 'stop');
      expect(messages.join('')).toContain('Only the seller');
      expect(getAuctionState().round).not.toBe(0);
    });
  });

  describe('doBid', () => {
    it('should place a valid bid', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      const bidder = makePlayer_('Bidder', 100);
      doBid(bidder, '1200');

      expect(getAuctionState().bidder).toBe(bidder);
      expect(getAuctionState().currentBid).toBe(1200);
    });

    it('should reject bid below minimum increment', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      const bidder = makePlayer_('Bidder', 100);
      const messages: string[] = [];
      bidder.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doBid(bidder, '1050'); // min increment is 100 (10% of 1000)
      expect(messages.join('')).toContain('must be at least');
    });

    it('should reject bid from seller', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      const messages: string[] = [];
      seller.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doBid(seller, '2000');
      expect(messages.join('')).toContain('cannot bid on your own');
    });

    it('should reject bid if cannot afford', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      const poorBidder = makePlayer_('Poor', 0);
      poorBidder.silver = 0;
      poorBidder.copper = 0;
      const messages: string[] = [];
      poorBidder.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doBid(poorBidder, '1200');
      expect(messages.join('')).toContain('cannot afford');
    });

    it('should reset round to 1 on new bid', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      // Advance to round 2
      auctionUpdate();
      expect(getAuctionState().round).toBe(2);

      // Place bid resets to 1
      const bidder = makePlayer_('Bidder', 100);
      doBid(bidder, '1200');
      expect(getAuctionState().round).toBe(1);
    });
  });

  describe('auctionUpdate', () => {
    it('should do nothing if no auction active', () => {
      auctionUpdate();
      expect(getAuctionState().round).toBe(0);
    });

    it('should advance through three rounds', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      expect(getAuctionState().round).toBe(1);
      auctionUpdate(); // going once, round -> 2
      expect(getAuctionState().round).toBe(2);
      auctionUpdate(); // going twice, round -> 3
      expect(getAuctionState().round).toBe(3);
    });

    it('should return item to seller if no bids after 3 rounds', () => {
      const seller = makePlayer_('Seller');
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      auctionUpdate(); // round 2
      auctionUpdate(); // round 3
      auctionUpdate(); // sold/returned

      expect(getAuctionState().round).toBe(0);
      expect((seller.inventory as GameObject[]).includes(item)).toBe(true);
      expect(broadcasts.some(b => b.includes('No bids'))).toBe(true);
    });

    it('should complete sale when bidder exists', () => {
      const seller = makePlayer_('Seller', 0);
      const item = new GameObject(makeObjProto());
      (seller.inventory as GameObject[]).push(item);
      doAuction(seller, 'amulet 1000');

      const bidder = makePlayer_('Bidder', 100);
      doBid(bidder, '1200');

      // Advance through 3 rounds
      auctionUpdate(); // round 2
      auctionUpdate(); // round 3
      auctionUpdate(); // sold!

      expect(getAuctionState().round).toBe(0);
      expect((bidder.inventory as GameObject[]).includes(item)).toBe(true);
      expect(broadcasts.some(b => b.includes('SOLD'))).toBe(true);
      // Seller should have received gold
      expect(seller.gold * 10000 + seller.silver * 100 + seller.copper).toBeGreaterThan(0);
    });
  });
});
