import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { Mobile } from '../../../src/game/entities/Mobile.js';
import { Room } from '../../../src/game/entities/Room.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import {
  ItemType, Position,
  type MobilePrototype, type ObjectPrototype, type ShopData,
} from '../../../src/game/entities/types.js';
import {
  doList, doBuy, doSell, doValue,
  findShopkeeper, isShopOpen,
  shopBuyPrice, shopSellPrice,
  getRacePriceModifier,
  setGameHourAccessor,
} from '../../../src/game/economy/ShopSystem.js';

// =============================================================================
// Helpers
// =============================================================================

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

function makeShopData(overrides: Partial<ShopData> = {}): ShopData {
  return {
    keeper: 1000,
    buyType: [ItemType.Weapon, ItemType.Armor],
    profitBuy: 120,
    profitSell: 90,
    openHour: 6,
    closeHour: 20,
    ...overrides,
  };
}

function makeMobileProto(overrides: Partial<MobilePrototype> = {}): MobilePrototype {
  return {
    vnum: 1000,
    name: 'shopkeeper',
    shortDesc: 'a shopkeeper',
    longDesc: 'A shopkeeper stands here.',
    description: '',
    actFlags: 0n,
    affectedBy: 0n,
    alignment: 0,
    level: 30,
    hitroll: 5,
    damroll: 5,
    hitDice: { num: 10, size: 8, bonus: 100 },
    damageDice: { num: 2, size: 6, bonus: 0 },
    gold: 100000,
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
    shop: makeShopData(),
    repairShop: null,
    ...overrides,
  };
}

function makeObjProto(overrides: Partial<ObjectPrototype> = {}): ObjectPrototype {
  return {
    vnum: 2000,
    name: 'sword',
    shortDesc: 'a gleaming sword',
    longDesc: 'A sword lies here.',
    description: '',
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 0, 0, 0],
    weight: 5,
    cost: 10000, // 1 gold
    rent: 0,
    level: 10,
    layers: 0,
    extraDescriptions: [],
    affects: [],
    ...overrides,
  };
}

function makeKeeper(shopData?: ShopData): Mobile {
  const proto = makeMobileProto({ shop: shopData ?? makeShopData() });
  const mob = new Mobile(proto);
  mob.gold = 100;
  return mob;
}

function makePlayer_(overrides: Record<string, any> = {}): Player {
  const p = new Player({
    name: 'Buyer',
    level: 10,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 13, lck: 9 },
    gold: 10,
    silver: 50,
    copper: 0,
    ...overrides,
  });
  p.descriptor = mockDescriptor as any;
  return p;
}

function setupShopRoom(): { room: Room; keeper: Mobile; player: Player; sword: GameObject } {
  const room = new Room(3000, 'Shop', 'A shop.');
  const keeper = makeKeeper();
  const player = makePlayer_();
  room.addCharacter(keeper);
  room.addCharacter(player);

  const sword = new GameObject(makeObjProto());
  (keeper.inventory as GameObject[]).push(sword);
  sword.carriedBy = keeper;

  setGameHourAccessor(() => 12); // noon, within shop hours
  return { room, keeper, player, sword };
}

describe('ShopSystem', () => {
  beforeEach(() => {
    setGameHourAccessor(() => 12);
    GameObject.resetCounters();
    Mobile.resetInstanceCounter();
  });

  describe('getRacePriceModifier', () => {
    it('Elf should get -10', () => {
      expect(getRacePriceModifier('elf')).toBe(-10);
    });

    it('Dwarf should get +3', () => {
      expect(getRacePriceModifier('dwarf')).toBe(3);
    });

    it('Halfling should get -2', () => {
      expect(getRacePriceModifier('halfling')).toBe(-2);
    });

    it('Pixie should get -8', () => {
      expect(getRacePriceModifier('pixie')).toBe(-8);
    });

    it('Half-Orc should get +7', () => {
      expect(getRacePriceModifier('half-orc')).toBe(7);
    });

    it('Human should get 0', () => {
      expect(getRacePriceModifier('human')).toBe(0);
    });
  });

  describe('isShopOpen', () => {
    const shop = makeShopData({ openHour: 6, closeHour: 20 });

    it('should return true during open hours', () => {
      expect(isShopOpen(shop, 12)).toBe(true);
    });

    it('should return false before opening', () => {
      expect(isShopOpen(shop, 5)).toBe(false);
    });

    it('should return false at closing', () => {
      expect(isShopOpen(shop, 20)).toBe(false);
    });

    it('should handle midnight wrapping', () => {
      const nightShop = makeShopData({ openHour: 22, closeHour: 6 });
      expect(isShopOpen(nightShop, 23)).toBe(true);
      expect(isShopOpen(nightShop, 2)).toBe(true);
      expect(isShopOpen(nightShop, 12)).toBe(false);
    });
  });

  describe('shopBuyPrice', () => {
    it('should calculate price with default race and CHA', () => {
      const { keeper, player, sword } = setupShopRoom();
      const price = shopBuyPrice(sword, keeper.shopData!, player);
      expect(price).toBeGreaterThan(0);
    });

    it('higher CHA should reduce buy price', () => {
      const { keeper, player, sword } = setupShopRoom();
      const normalPrice = shopBuyPrice(sword, keeper.shopData!, player);

      const highChaPlayer = makePlayer_({ permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 20, lck: 9 } });
      const lowPrice = shopBuyPrice(sword, keeper.shopData!, highChaPlayer);

      expect(lowPrice).toBeLessThan(normalPrice);
    });

    it('minimum price should be 1', () => {
      const cheapProto = makeObjProto({ cost: 0 });
      const cheapObj = new GameObject(cheapProto);
      const { keeper, player } = setupShopRoom();
      const price = shopBuyPrice(cheapObj, keeper.shopData!, player);
      expect(price).toBeGreaterThanOrEqual(1);
    });
  });

  describe('shopSellPrice', () => {
    it('should be less than buy price', () => {
      const { keeper, player, sword } = setupShopRoom();
      const buyPrice = shopBuyPrice(sword, keeper.shopData!, player);
      const sellPrice = shopSellPrice(sword, keeper.shopData!, player);
      expect(sellPrice).toBeLessThan(buyPrice);
    });
  });

  describe('findShopkeeper', () => {
    it('should find keeper in room', () => {
      const { room, keeper } = setupShopRoom();
      expect(findShopkeeper(room)).toBe(keeper);
    });

    it('should return null if no keeper', () => {
      const room = new Room(3001, 'Empty', 'Nothing.');
      expect(findShopkeeper(room)).toBeNull();
    });
  });

  describe('doList', () => {
    it('should list items for sale', () => {
      const { player } = setupShopRoom();
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doList(player, '');
      const output = messages.join('');
      expect(output).toContain('sword');
    });

    it('should say no shopkeeper if not in shop', () => {
      const room = new Room(3001, 'Street', 'A street.');
      const player = makePlayer_();
      room.addCharacter(player);
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doList(player, '');
      expect(messages.join('')).toContain('no shopkeeper');
    });

    it('should say closed if shop is closed', () => {
      const { player } = setupShopRoom();
      setGameHourAccessor(() => 3); // 3am
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doList(player, '');
      expect(messages.join('')).toContain('closed');
    });
  });

  describe('doBuy', () => {
    it('should transfer item to buyer and deduct gold', () => {
      const { player, keeper, sword } = setupShopRoom();
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      const startGold = player.gold;

      doBuy(player, 'sword');

      expect((player.inventory as GameObject[]).some(o => o === sword)).toBe(true);
      // Gold should have decreased
      expect(player.gold * 10000 + player.silver * 100 + player.copper)
        .toBeLessThan(startGold * 10000 + 50 * 100);
    });

    it('should reject if cannot afford', () => {
      const { player } = setupShopRoom();
      player.gold = 0;
      player.silver = 0;
      player.copper = 0;
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doBuy(player, 'sword');
      expect(messages.join('')).toContain('cannot afford');
    });

    it('should reject if item not found', () => {
      const { player } = setupShopRoom();
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doBuy(player, 'nonexistent');
      expect(messages.join('')).toContain('does not sell');
    });
  });

  describe('doSell', () => {
    it('should transfer item to keeper and add gold', () => {
      const { room, keeper, player } = setupShopRoom();
      const armor = new GameObject(makeObjProto({ vnum: 2001, name: 'armor', shortDesc: 'a suit of armor', itemType: ItemType.Armor, cost: 5000 }));
      (player.inventory as GameObject[]).push(armor);
      armor.carriedBy = player;

      const startWealth = player.gold * 10000 + player.silver * 100 + player.copper;
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doSell(player, 'armor');

      expect((keeper.inventory as GameObject[]).some(o => o === armor)).toBe(true);
      expect(player.gold * 10000 + player.silver * 100 + player.copper).toBeGreaterThan(startWealth);
    });

    it('should reject items the shopkeeper does not buy', () => {
      const { player } = setupShopRoom();
      const food = new GameObject(makeObjProto({ vnum: 2002, name: 'bread', shortDesc: 'a loaf of bread', itemType: ItemType.Food, cost: 100 }));
      (player.inventory as GameObject[]).push(food);
      food.carriedBy = player;

      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doSell(player, 'bread');
      expect(messages.join('')).toContain('not interested');
    });
  });

  describe('doValue', () => {
    it('should show sell price for an item', () => {
      const { player } = setupShopRoom();
      const armor = new GameObject(makeObjProto({ vnum: 2001, name: 'armor', shortDesc: 'a suit of armor', itemType: ItemType.Armor, cost: 5000 }));
      (player.inventory as GameObject[]).push(armor);
      armor.carriedBy = player;

      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doValue(player, 'armor');
      expect(messages.join('')).toContain('would pay');
    });
  });
});
