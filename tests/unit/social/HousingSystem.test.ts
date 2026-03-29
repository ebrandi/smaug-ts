import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Position, SectorType } from '../../../src/game/entities/types.js';
import { hasFlag } from '../../../src/utils/BitVector.js';
import {
  PlayerHouse,
  HousePersistence,
  setHousePersistence,
  setMoveCharToRoom,
  doHomebuy,
  doGohome,
  doHomeSet,
  doHomeAccessory,
  doHomesell,
  HOUSE_BASE_PRICE,
  SELL_REFUND_PCT,
  MAX_ACCESSORIES,
  ROOM_HOUSE_FORSALE,
} from '../../../src/game/social/HousingSystem.js';
import { setFlag } from '../../../src/utils/BitVector.js';

// =============================================================================
// Helpers
// =============================================================================

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

let lastOutput: string;

function makePlayer(name: string, level = 15, gold = 200_000): Player {
  lastOutput = '';
  const p = new Player({
    name,
    level,
    position: Position.Standing,
    gold,
  });
  p.descriptor = {
    ...mockDescriptor,
    write(text: string) { lastOutput += text; },
  } as any;
  return p;
}

function makeRoom(vnum: number, forSale = false): Room {
  const r = new Room(vnum, 'A Room', 'A nice room.');
  if (forSale) {
    r.roomFlags = setFlag(r.roomFlags, ROOM_HOUSE_FORSALE);
  }
  return r;
}

/** In-memory housing persistence for testing. */
function createMemoryHousing(): { persistence: HousePersistence; houses: PlayerHouse[] } {
  const houses: PlayerHouse[] = [];
  let idCounter = 0;

  const persistence: HousePersistence = {
    async getHouseByOwner(owner: string) {
      return houses.find(h => h.owner.toLowerCase() === owner.toLowerCase());
    },
    async saveHouse(h) {
      const existing = houses.findIndex(x => x.id === h.id);
      if (existing >= 0) {
        houses[existing] = h as PlayerHouse;
        return h as PlayerHouse;
      }
      const house: PlayerHouse = {
        id: h.id ?? `house_${++idCounter}`,
        owner: h.owner,
        homeVnum: h.homeVnum,
        name: h.name,
        description: h.description,
        accessories: [...h.accessories],
        apartment: h.apartment,
      };
      houses.push(house);
      return house;
    },
    async deleteHouse(id: string) {
      const idx = houses.findIndex(h => h.id === id);
      if (idx >= 0) houses.splice(idx, 1);
    },
  };

  return { persistence, houses };
}

// =============================================================================
// Tests
// =============================================================================

describe('HousingSystem', () => {
  let mem: ReturnType<typeof createMemoryHousing>;

  beforeEach(() => {
    mem = createMemoryHousing();
    setHousePersistence(mem.persistence);
    setMoveCharToRoom(() => true);
  });

  // ---------------------------------------------------------------------------
  // doHomebuy
  // ---------------------------------------------------------------------------
  describe('doHomebuy', () => {
    it('buys a home in a for-sale room', async () => {
      const ch = makePlayer('Buyer', 20, 200_000);
      const room = makeRoom(5000, true);
      room.addCharacter(ch);

      await doHomebuy(ch, '');

      expect(ch.gold).toBe(200_000 - HOUSE_BASE_PRICE);
      expect(mem.houses).toHaveLength(1);
      expect(mem.houses[0]!.owner).toBe('Buyer');
      expect(mem.houses[0]!.homeVnum).toBe(5000);
      expect(lastOutput).toContain('proud owner');
      // Room should no longer be for sale
      expect(hasFlag(room.roomFlags, ROOM_HOUSE_FORSALE)).toBe(false);
    });

    it('rejects if room not for sale', async () => {
      const ch = makePlayer('Buyer', 20, 200_000);
      const room = makeRoom(5000, false);
      room.addCharacter(ch);

      await doHomebuy(ch, '');
      expect(lastOutput).toContain('not for sale');
      expect(mem.houses).toHaveLength(0);
    });

    it('rejects if already owns a home', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Buyer',
        homeVnum: 4000,
        name: 'Old Home',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Buyer', 20, 200_000);
      const room = makeRoom(5000, true);
      room.addCharacter(ch);

      await doHomebuy(ch, '');
      expect(lastOutput).toContain('already own');
    });

    it('rejects if not enough gold', async () => {
      const ch = makePlayer('Poor', 20, 100);
      const room = makeRoom(5000, true);
      room.addCharacter(ch);

      await doHomebuy(ch, '');
      expect(lastOutput).toContain('need');
      expect(lastOutput).toContain('gold');
    });
  });

  // ---------------------------------------------------------------------------
  // doGohome
  // ---------------------------------------------------------------------------
  describe('doGohome', () => {
    it('teleports player to home', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Homey',
        homeVnum: 5000,
        name: 'My Pad',
        description: '',
        accessories: [],
        apartment: false,
      });

      let movedTo = -1;
      setMoveCharToRoom((_, vnum) => { movedTo = vnum; return true; });

      const ch = makePlayer('Homey');
      await doGohome(ch, '');

      expect(movedTo).toBe(5000);
      expect(lastOutput).toContain('return to your home');
    });

    it('rejects if no home', async () => {
      const ch = makePlayer('Homeless');
      await doGohome(ch, '');
      expect(lastOutput).toContain('do not own');
    });

    it('handles move failure', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Homey',
        homeVnum: 5000,
        name: 'My Pad',
        description: '',
        accessories: [],
        apartment: false,
      });

      setMoveCharToRoom(() => false);

      const ch = makePlayer('Homey');
      await doGohome(ch, '');
      expect(lastOutput).toContain('cannot get to');
    });
  });

  // ---------------------------------------------------------------------------
  // doHomeSet
  // ---------------------------------------------------------------------------
  describe('doHomeSet', () => {
    it('sets home name', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: 'Old Name',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomeSet(ch, 'name My Cozy Cottage');
      expect(mem.houses[0]!.name).toBe('My Cozy Cottage');
      expect(lastOutput).toContain('name set');
    });

    it('sets home description', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomeSet(ch, 'desc A lovely room with a view.');
      expect(mem.houses[0]!.description).toBe('A lovely room with a view.');
      expect(lastOutput).toContain('description set');
    });

    it('rejects if not in home room', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(6000);  // Different vnum
      room.addCharacter(ch);

      await doHomeSet(ch, 'name New Name');
      expect(lastOutput).toContain('must be in your home');
    });

    it('rejects empty field', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomeSet(ch, '');
      expect(lastOutput).toContain('Syntax');
    });
  });

  // ---------------------------------------------------------------------------
  // doHomeAccessory
  // ---------------------------------------------------------------------------
  describe('doHomeAccessory', () => {
    it('adds an accessory', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomeAccessory(ch, 'add fireplace');
      expect(mem.houses[0]!.accessories).toContain('fireplace');
      expect(lastOutput).toContain('add fireplace');
    });

    it('removes an accessory', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories: ['fireplace', 'rug'],
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomeAccessory(ch, 'remove fireplace');
      expect(mem.houses[0]!.accessories).not.toContain('fireplace');
      expect(mem.houses[0]!.accessories).toContain('rug');
    });

    it('rejects adding beyond max', async () => {
      const accessories = Array.from({ length: MAX_ACCESSORIES }, (_, i) => `item${i}`);
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories,
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomeAccessory(ch, 'add oneMore');
      expect(lastOutput).toContain('cannot have more');
    });

    it('rejects removing non-existent item', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Owner');
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomeAccessory(ch, 'remove ghost');
      expect(lastOutput).toContain('not in your home');
    });
  });

  // ---------------------------------------------------------------------------
  // doHomesell
  // ---------------------------------------------------------------------------
  describe('doHomesell', () => {
    it('sells home and gets refund', async () => {
      mem.houses.push({
        id: 'h1',
        owner: 'Owner',
        homeVnum: 5000,
        name: '',
        description: '',
        accessories: [],
        apartment: false,
      });

      const ch = makePlayer('Owner', 20, 1000);
      const room = makeRoom(5000);
      room.addCharacter(ch);

      await doHomesell(ch, '');

      const expectedRefund = Math.floor(HOUSE_BASE_PRICE * SELL_REFUND_PCT);
      expect(ch.gold).toBe(1000 + expectedRefund);
      expect(mem.houses).toHaveLength(0);
      expect(lastOutput).toContain('sell your home');
      // Room should be for sale again
      expect(hasFlag(room.roomFlags, ROOM_HOUSE_FORSALE)).toBe(true);
    });

    it('rejects if no home', async () => {
      const ch = makePlayer('Homeless');
      await doHomesell(ch, '');
      expect(lastOutput).toContain('do not own');
    });
  });

  // --- PARITY: Partial implementation stubs ---
  it.todo('should support furniture placement in rooms');
  it.todo('should manage guest access lists');
  it.todo('should support house description editing via substate');
  it.todo('should handle house expiration and cleanup');


});
