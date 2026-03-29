import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/game/entities/Player.js';
import { Mobile } from '../../src/game/entities/Mobile.js';
import { Room } from '../../src/game/entities/Room.js';
import { GameObject } from '../../src/game/entities/GameObject.js';
import {
  ItemType, Position,
  type MobilePrototype, type ObjectPrototype, type ShopData,
} from '../../src/game/entities/types.js';
import {
  doList, doBuy, doSell,
  setGameHourAccessor,
} from '../../src/game/economy/ShopSystem.js';
import { toCopper } from '../../src/game/economy/Currency.js';

// =============================================================================
// Setup
// =============================================================================

function makeShopData(): ShopData {
  return {
    keeper: 1000,
    buyType: [ItemType.Weapon, ItemType.Armor],
    profitBuy: 120,
    profitSell: 90,
    openHour: 0,
    closeHour: 24,
  };
}

function makeMobileProto(): MobilePrototype {
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
    hitDice: { num: 10, size: 8, bonus: 200 },
    damageDice: { num: 2, size: 6, bonus: 0 },
    gold: 500,
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
  };
}

function makeWeaponProto(cost: number = 5000): ObjectPrototype {
  return {
    vnum: 2000,
    name: 'sword',
    shortDesc: 'a fine sword',
    longDesc: 'A sword lies here.',
    description: '',
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 0, 0, 0],
    weight: 5,
    cost,
    rent: 0,
    level: 10,
    layers: 0,
    extraDescriptions: [],
    affects: [],
  };
}

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

describe('Shop Transaction Integration', () => {
  let room: Room;
  let keeper: Mobile;
  let player: Player;
  let sword: GameObject;
  let messages: string[];

  beforeEach(() => {
    GameObject.resetCounters();
    Mobile.resetInstanceCounter();
    Player.setEventBus(null);
    setGameHourAccessor(() => 12);

    room = new Room(3000, 'Shop', 'A weapon shop.');
    keeper = new Mobile(makeMobileProto());
    player = new Player({
      name: 'Hero',
      level: 15,
      position: Position.Standing,
      permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 13, lck: 9 },
      gold: 10,
      silver: 0,
      copper: 0,
    });

    room.addCharacter(keeper);
    room.addCharacter(player);

    sword = new GameObject(makeWeaponProto());
    (keeper.inventory as GameObject[]).push(sword);
    sword.carriedBy = keeper;

    messages = [];
    player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
  });

  it('should complete full list → buy → sell cycle', () => {
    // 1. List items
    doList(player, '');
    const listOutput = messages.join('');
    expect(listOutput).toContain('sword');
    messages = [];

    // Record starting wealth
    const startWealth = toCopper({ gold: player.gold, silver: player.silver, copper: player.copper });

    // 2. Buy the sword
    doBuy(player, 'sword');
    const buyOutput = messages.join('');
    expect(buyOutput).toContain('You buy');
    expect((player.inventory as GameObject[]).includes(sword)).toBe(true);
    expect((keeper.inventory as GameObject[]).includes(sword)).toBe(false);
    messages = [];

    // Wealth should have decreased
    const afterBuyWealth = toCopper({ gold: player.gold, silver: player.silver, copper: player.copper });
    expect(afterBuyWealth).toBeLessThan(startWealth);

    // 3. Sell it back
    doSell(player, 'sword');
    const sellOutput = messages.join('');
    expect(sellOutput).toContain('You sell');
    expect((keeper.inventory as GameObject[]).includes(sword)).toBe(true);
    expect((player.inventory as GameObject[]).includes(sword)).toBe(false);

    // Wealth should have increased (but still less than start due to spread)
    const afterSellWealth = toCopper({ gold: player.gold, silver: player.silver, copper: player.copper });
    expect(afterSellWealth).toBeGreaterThan(afterBuyWealth);
    expect(afterSellWealth).toBeLessThan(startWealth); // buy/sell spread means net loss
  });

  it('should handle multiple buy transactions', () => {
    // Add more items
    const sword2 = new GameObject(makeWeaponProto(3000));
    sword2.name = 'dagger';
    sword2.shortDescription = 'a sharp dagger';
    (keeper.inventory as GameObject[]).push(sword2);

    doBuy(player, 'sword');
    expect((player.inventory as GameObject[]).includes(sword)).toBe(true);

    messages = [];
    doBuy(player, 'dagger');
    expect((player.inventory as GameObject[]).includes(sword2)).toBe(true);
  });

  it('should maintain economic consistency (keeper gold changes)', () => {
    const keeperStartWealth = toCopper({ gold: keeper.gold, silver: keeper.silver, copper: keeper.copper });

    doBuy(player, 'sword');

    const keeperAfterWealth = toCopper({ gold: keeper.gold, silver: keeper.silver, copper: keeper.copper });
    expect(keeperAfterWealth).toBeGreaterThan(keeperStartWealth);
  });
});
