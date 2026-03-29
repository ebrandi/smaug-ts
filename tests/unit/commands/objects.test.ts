import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Room } from '../../../src/game/entities/Room.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import {
  Position, WearLocation, ItemType, ApplyType, AFF,
  ITEM_EXTRA_FLAGS, WEAR_FLAGS, CONT_FLAGS,
  type ObjectPrototype,
} from '../../../src/game/entities/types.js';
import { EventBus } from '../../../src/core/EventBus.js';
import {
  doGet, doDrop, doPut, doGive, doWear, doRemove, doWearAll,
  doEat, doDrink, doFill, doSacrifice, doLoot,
  maxCarryWeight, maxCarryNumber, canCarryWeight, canCarryNumber,
  findObjInInventory, findObjInRoom, findObjInContainer,
  canWearAt, getWearLocation,
  setObjectEventBus,
  registerObjectCommands,
} from '../../../src/game/commands/objects.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';

// =============================================================================
// Test Character
// =============================================================================

class TestCharacter extends Character {
  messages: string[] = [];
  private readonly _isNpc: boolean;
  get isNpc(): boolean { return this._isNpc; }
  sendToChar(text: string): void { this.messages.push(text); }
  get lastMessage(): string { return this.messages[this.messages.length - 1] ?? ''; }
  clearMessages(): void { this.messages = []; }
  constructor(init?: CharacterInit, isNpc = false) {
    super(init);
    this._isNpc = isNpc;
  }
}

// =============================================================================
// Helpers
// =============================================================================

function makeChar(init?: CharacterInit): TestCharacter {
  return new TestCharacter({
    id: 'test_char_1',
    name: 'TestHero',
    shortDescription: 'a test hero',
    keywords: ['testhero'],
    level: 10,
    move: 100,
    maxMove: 100,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 15, con: 11, cha: 10, lck: 9 },
    gold: 100,
    silver: 50,
    copper: 25,
    ...init,
  });
}

function makeNpc(init?: CharacterInit): TestCharacter {
  return new TestCharacter({
    id: 'test_npc_1',
    name: 'Guard',
    shortDescription: 'a town guard',
    keywords: ['guard'],
    level: 5,
    position: Position.Standing,
    permStats: { str: 15, int: 10, wis: 10, dex: 12, con: 12, cha: 10, lck: 10 },
    ...init,
  }, true);
}

function makeRoom(vnum: number = 3000): Room {
  return new Room(vnum, `Room ${vnum}`, `A test room.`);
}

function makeProto(overrides: Partial<ObjectPrototype> = {}): ObjectPrototype {
  return {
    vnum: 1000,
    name: 'a sword',
    shortDesc: 'a gleaming sword',
    longDesc: 'A gleaming sword lies here.',
    description: 'It is sharp.',
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.WIELD,
    values: [0, 3, 8, 0, 1, 0],
    weight: 5,
    cost: 500,
    rent: 0,
    level: 10,
    layers: 0,
    extraDescriptions: [],
    affects: [],
    ...overrides,
  };
}

function makeObj(overrides: Partial<ObjectPrototype> = {}): GameObject {
  return new GameObject(makeProto(overrides));
}

function placeInRoom(obj: GameObject, room: Room): void {
  (room.contents as GameObject[]).push(obj);
  obj.inRoom = room;
}

function addToInventory(obj: GameObject, ch: Character): void {
  (ch.inventory as GameObject[]).push(obj);
  obj.carriedBy = ch;
}

// =============================================================================
// Setup
// =============================================================================

describe('Object Commands', () => {
  let ch: TestCharacter;
  let room: Room;
  let eventBus: EventBus;

  beforeEach(() => {
    GameObject.resetCounters();
    ch = makeChar();
    room = makeRoom();
    room.addCharacter(ch);
    eventBus = new EventBus();
    setObjectEventBus(eventBus);
  });

  // ===========================================================================
  // Carrying Capacity
  // ===========================================================================

  describe('Carrying Capacity', () => {
    it('maxCarryWeight uses str table', () => {
      // str=15 → carry=170, formula: 170*10 + 10*25 = 1700 + 250 = 1950
      expect(maxCarryWeight(ch)).toBe(1950);
    });

    it('maxCarryNumber uses dex and level', () => {
      // (10+15)/5 + (15-13) + 10 = 5 + 2 + 10 = 17
      expect(maxCarryNumber(ch)).toBe(17);
    });

    it('canCarryWeight returns true when under limit', () => {
      expect(canCarryWeight(ch, 100)).toBe(true);
    });

    it('canCarryWeight returns false when over limit', () => {
      expect(canCarryWeight(ch, 999999)).toBe(false);
    });

    it('canCarryNumber returns true when under limit', () => {
      expect(canCarryNumber(ch)).toBe(true);
    });

    it('canCarryNumber returns false when at limit', () => {
      const max = maxCarryNumber(ch);
      for (let i = 0; i < max; i++) {
        addToInventory(makeObj({ weight: 1 }), ch);
      }
      expect(canCarryNumber(ch)).toBe(false);
    });

    it('immortals have huge capacity', () => {
      const immChar = makeChar({ trust: 55 });
      room.addCharacter(immChar);
      expect(maxCarryWeight(immChar)).toBe(55 * 200 * 10);
      expect(maxCarryNumber(immChar)).toBe(55 * 200);
    });
  });

  // ===========================================================================
  // Object Finding
  // ===========================================================================

  describe('Object Finding', () => {
    it('findObjInInventory finds by keyword', () => {
      const obj = makeObj({ name: 'a red sword' });
      addToInventory(obj, ch);
      expect(findObjInInventory(ch, 'sword')).toBe(obj);
    });

    it('findObjInInventory returns null when not found', () => {
      expect(findObjInInventory(ch, 'shield')).toBeNull();
    });

    it('findObjInInventory handles numbered arguments', () => {
      const obj1 = makeObj({ name: 'a sword' });
      const obj2 = makeObj({ name: 'a sword' });
      addToInventory(obj1, ch);
      addToInventory(obj2, ch);
      expect(findObjInInventory(ch, '2.sword')).toBe(obj2);
    });

    it('findObjInRoom finds by keyword', () => {
      const obj = makeObj({ name: 'a shield' });
      placeInRoom(obj, room);
      expect(findObjInRoom(room, 'shield')).toBe(obj);
    });

    it('findObjInRoom returns null when not found', () => {
      expect(findObjInRoom(room, 'sword')).toBeNull();
    });

    it('findObjInContainer finds by keyword', () => {
      const container = makeObj({
        name: 'a bag',
        itemType: ItemType.Container,
        wearFlags: WEAR_FLAGS.TAKE,
        values: [100, 0, 0, 0, 0, 0],
      });
      const item = makeObj({ name: 'a gem' });
      container.contents.push(item);
      item.inObject = container;
      expect(findObjInContainer(container, 'gem')).toBe(item);
    });
  });

  // ===========================================================================
  // Wear Location
  // ===========================================================================

  describe('Wear Location', () => {
    it('getWearLocation returns Wield for weapon', () => {
      const obj = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.WIELD });
      expect(getWearLocation(obj)).toBe(WearLocation.Wield);
    });

    it('getWearLocation returns Body for armor', () => {
      const obj = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY });
      expect(getWearLocation(obj)).toBe(WearLocation.Body);
    });

    it('getWearLocation returns None for take-only item', () => {
      const obj = makeObj({ wearFlags: WEAR_FLAGS.TAKE });
      expect(getWearLocation(obj)).toBe(WearLocation.None);
    });

    it('canWearAt returns true for empty slot', () => {
      const obj = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY });
      expect(canWearAt(ch, obj, WearLocation.Body)).toBe(true);
    });

    it('canWearAt returns false when slot occupied and no layers', () => {
      const existing = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY, layers: 0 });
      const equipment = ch.equipment as Map<WearLocation, GameObject>;
      equipment.set(WearLocation.Body, existing);
      existing.wearLocation = WearLocation.Body;

      const newObj = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY, layers: 0 });
      expect(canWearAt(ch, newObj, WearLocation.Body)).toBe(false);
    });

    it('canWearAt allows layered items with non-conflicting layers', () => {
      const existing = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY, layers: 1 });
      const equipment = ch.equipment as Map<WearLocation, GameObject>;
      equipment.set(WearLocation.Body, existing);
      existing.wearLocation = WearLocation.Body;

      const newObj = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY, layers: 2 });
      expect(canWearAt(ch, newObj, WearLocation.Body)).toBe(true);
    });

    it('canWearAt rejects layered items with conflicting layers', () => {
      const existing = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY, layers: 3 });
      const equipment = ch.equipment as Map<WearLocation, GameObject>;
      equipment.set(WearLocation.Body, existing);
      existing.wearLocation = WearLocation.Body;

      const newObj = makeObj({ wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY, layers: 2 });
      // 3 & 2 = 2 !== 0, so they conflict
      expect(canWearAt(ch, newObj, WearLocation.Body)).toBe(false);
    });
  });

  // ===========================================================================
  // doGet
  // ===========================================================================

  describe('doGet', () => {
    it('picks up an item from the room', () => {
      const obj = makeObj({ name: 'a gem' });
      placeInRoom(obj, room);
      doGet(ch, 'gem');
      expect(ch.lastMessage).toContain('You get');
      expect((ch.inventory as GameObject[]).includes(obj)).toBe(true);
      expect((room.contents as GameObject[]).includes(obj)).toBe(false);
    });

    it('emits ObjectPickup event', () => {
      const obj = makeObj({ name: 'a gem' });
      placeInRoom(obj, room);
      const handler = vi.fn();
      eventBus.on('object:pickup', handler);
      doGet(ch, 'gem');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('refuses ITEM_NO_TAKE objects', () => {
      const obj = makeObj({ name: 'a statue', extraFlags: ITEM_EXTRA_FLAGS.NO_TAKE });
      placeInRoom(obj, room);
      doGet(ch, 'statue');
      expect(ch.lastMessage).toContain("can't take");
    });

    it('handles get all from room', () => {
      const obj1 = makeObj({ name: 'a gem' });
      const obj2 = makeObj({ name: 'a coin' });
      placeInRoom(obj1, room);
      placeInRoom(obj2, room);
      doGet(ch, 'all');
      expect((ch.inventory as GameObject[]).length).toBe(2);
    });

    it('handles get all.keyword from room', () => {
      const obj1 = makeObj({ name: 'a red gem' });
      const obj2 = makeObj({ name: 'a coin' });
      placeInRoom(obj1, room);
      placeInRoom(obj2, room);
      doGet(ch, 'all.gem');
      expect((ch.inventory as GameObject[]).length).toBe(1);
      expect((ch.inventory as GameObject[])[0]).toBe(obj1);
    });

    it('reports nothing when room is empty', () => {
      doGet(ch, 'all');
      expect(ch.lastMessage).toContain("don't see anything");
    });

    it('reports item not found', () => {
      doGet(ch, 'nonexistent');
      expect(ch.lastMessage).toContain("don't see that");
    });

    it('requires argument', () => {
      doGet(ch, '');
      expect(ch.lastMessage).toContain('Get what?');
    });

    it('refuses when carrying too many items', () => {
      const max = maxCarryNumber(ch);
      for (let i = 0; i < max; i++) {
        addToInventory(makeObj({ weight: 1 }), ch);
      }
      const obj = makeObj({ name: 'a gem' });
      placeInRoom(obj, room);
      doGet(ch, 'gem');
      expect(ch.lastMessage).toContain("can't carry that many");
    });

    it('refuses when item is too heavy', () => {
      const obj = makeObj({ name: 'a boulder', weight: 999999 });
      placeInRoom(obj, room);
      doGet(ch, 'boulder');
      expect(ch.lastMessage).toContain("can't carry that much weight");
    });

    // Container tests
    it('gets item from container', () => {
      const container = makeObj({
        name: 'a bag',
        itemType: ItemType.Container,
        wearFlags: WEAR_FLAGS.TAKE,
        values: [100, 0, 0, 0, 0, 0],
      });
      const item = makeObj({ name: 'a gem' });
      container.contents.push(item);
      item.inObject = container;
      addToInventory(container, ch);

      doGet(ch, 'gem bag');
      expect((ch.inventory as GameObject[]).includes(item)).toBe(true);
      expect(container.contents.includes(item)).toBe(false);
    });

    it('refuses to get from closed container', () => {
      const container = makeObj({
        name: 'a chest',
        itemType: ItemType.Container,
        wearFlags: WEAR_FLAGS.TAKE,
        values: [100, Number(CONT_FLAGS.CLOSEABLE | CONT_FLAGS.CLOSED), 0, 0, 0, 0],
      });
      const item = makeObj({ name: 'a gem' });
      container.contents.push(item);
      item.inObject = container;
      placeInRoom(container, room);

      doGet(ch, 'gem chest');
      expect(ch.lastMessage).toContain("closed");
    });

    it('gets all from container', () => {
      const container = makeObj({
        name: 'a bag',
        itemType: ItemType.Container,
        wearFlags: WEAR_FLAGS.TAKE,
        values: [100, 0, 0, 0, 0, 0],
      });
      const item1 = makeObj({ name: 'a gem' });
      const item2 = makeObj({ name: 'a coin' });
      container.contents.push(item1, item2);
      item1.inObject = container;
      item2.inObject = container;
      addToInventory(container, ch);

      doGet(ch, 'all bag');
      expect((ch.inventory as GameObject[]).includes(item1)).toBe(true);
      expect((ch.inventory as GameObject[]).includes(item2)).toBe(true);
    });
  });

  // ===========================================================================
  // doDrop
  // ===========================================================================

  describe('doDrop', () => {
    it('drops an item to the room', () => {
      const obj = makeObj({ name: 'a gem' });
      addToInventory(obj, ch);
      doDrop(ch, 'gem');
      expect(ch.lastMessage).toContain('You drop');
      expect((room.contents as GameObject[]).includes(obj)).toBe(true);
      expect((ch.inventory as GameObject[]).includes(obj)).toBe(false);
    });

    it('emits ObjectDrop event', () => {
      const obj = makeObj({ name: 'a gem' });
      addToInventory(obj, ch);
      const handler = vi.fn();
      eventBus.on('object:drop', handler);
      doDrop(ch, 'gem');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('refuses ITEM_NODROP objects', () => {
      const obj = makeObj({ name: 'a cursed ring', extraFlags: ITEM_EXTRA_FLAGS.NODROP });
      addToInventory(obj, ch);
      doDrop(ch, 'ring');
      expect(ch.lastMessage).toContain("stuck to your hand");
    });

    it('handles drop all', () => {
      const obj1 = makeObj({ name: 'a gem' });
      const obj2 = makeObj({ name: 'a coin' });
      addToInventory(obj1, ch);
      addToInventory(obj2, ch);
      doDrop(ch, 'all');
      expect((ch.inventory as GameObject[]).length).toBe(0);
      expect((room.contents as GameObject[]).length).toBe(2);
    });

    it('handles drop all.keyword', () => {
      const obj1 = makeObj({ name: 'a gem' });
      const obj2 = makeObj({ name: 'a coin' });
      addToInventory(obj1, ch);
      addToInventory(obj2, ch);
      doDrop(ch, 'all.gem');
      expect((ch.inventory as GameObject[]).length).toBe(1);
      expect((ch.inventory as GameObject[])[0]).toBe(obj2);
    });

    it('drops currency', () => {
      doDrop(ch, '10 gold');
      expect(ch.gold).toBe(90);
      expect(ch.lastMessage).toContain('You drop 10 gold');
    });

    it('refuses insufficient currency', () => {
      doDrop(ch, '999 gold');
      expect(ch.lastMessage).toContain("don't have that much");
      expect(ch.gold).toBe(100);
    });

    it('reports item not found', () => {
      doDrop(ch, 'nonexistent');
      expect(ch.lastMessage).toContain("don't have that");
    });

    it('requires argument', () => {
      doDrop(ch, '');
      expect(ch.lastMessage).toContain('Drop what?');
    });
  });

  // ===========================================================================
  // doPut
  // ===========================================================================

  describe('doPut', () => {
    let container: GameObject;

    beforeEach(() => {
      container = makeObj({
        name: 'a bag',
        itemType: ItemType.Container,
        wearFlags: WEAR_FLAGS.TAKE,
        values: [100, 0, 0, 0, 0, 0],
      });
      addToInventory(container, ch);
    });

    it('puts item in container', () => {
      const item = makeObj({ name: 'a gem' });
      addToInventory(item, ch);
      doPut(ch, 'gem bag');
      expect(container.contents.includes(item)).toBe(true);
      expect((ch.inventory as GameObject[]).includes(item)).toBe(false);
    });

    it('refuses put in non-container', () => {
      const notContainer = makeObj({ name: 'a rock' });
      addToInventory(notContainer, ch);
      const item = makeObj({ name: 'a gem' });
      addToInventory(item, ch);
      doPut(ch, 'gem rock');
      expect(ch.lastMessage).toContain("not a container");
    });

    it('refuses to put item into itself', () => {
      // Container can't go into itself
      doPut(ch, 'bag bag');
      expect(ch.lastMessage).toContain("inside itself");
    });

    it('refuses when container is full', () => {
      container.values[0] = 1; // 1 weight capacity
      const heavyItem = makeObj({ name: 'a heavy gem', weight: 10 });
      addToInventory(heavyItem, ch);
      doPut(ch, 'gem bag');
      expect(ch.lastMessage).toContain("won't fit");
    });

    it('handles put all in container', () => {
      const item1 = makeObj({ name: 'a gem' });
      const item2 = makeObj({ name: 'a coin' });
      addToInventory(item1, ch);
      addToInventory(item2, ch);
      doPut(ch, 'all bag');
      expect(container.contents.length).toBe(2);
    });

    it('handles put all.keyword in container', () => {
      const item1 = makeObj({ name: 'a red gem' });
      const item2 = makeObj({ name: 'a coin' });
      addToInventory(item1, ch);
      addToInventory(item2, ch);
      doPut(ch, 'all.gem bag');
      expect(container.contents.length).toBe(1);
    });

    it('requires two arguments', () => {
      doPut(ch, '');
      expect(ch.lastMessage).toContain('Put what');
    });

    it('requires container argument', () => {
      doPut(ch, 'gem');
      expect(ch.lastMessage).toContain('Put it in what?');
    });
  });

  // ===========================================================================
  // doGive
  // ===========================================================================

  describe('doGive', () => {
    let target: TestCharacter;

    beforeEach(() => {
      target = makeNpc();
      room.addCharacter(target);
    });

    it('gives item to another character', () => {
      const item = makeObj({ name: 'a gem' });
      addToInventory(item, ch);
      doGive(ch, 'gem guard');
      expect((target.inventory as GameObject[]).includes(item)).toBe(true);
      expect((ch.inventory as GameObject[]).includes(item)).toBe(false);
      expect(ch.lastMessage).toContain('You give');
    });

    it('gives currency to another character', () => {
      doGive(ch, '10 gold guard');
      expect(ch.gold).toBe(90);
      expect(target.gold).toBe(10);
    });

    it('refuses to give currency you dont have', () => {
      doGive(ch, '999 gold guard');
      expect(ch.lastMessage).toContain("don't have that much");
    });

    it('reports target not found', () => {
      doGive(ch, 'gem nobody');
      expect(ch.lastMessage).toContain("don't have that");
    });

    it('requires arguments', () => {
      doGive(ch, '');
      expect(ch.lastMessage).toContain('Give what');
    });
  });

  // ===========================================================================
  // doWear / doRemove
  // ===========================================================================

  describe('doWear', () => {
    it('equips a wearable item', () => {
      const armor = makeObj({
        name: 'a breastplate',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      addToInventory(armor, ch);
      doWear(ch, 'breastplate');
      expect(armor.wearLocation).toBe(WearLocation.Body);
      expect((ch.equipment as Map<WearLocation, GameObject>).get(WearLocation.Body)).toBe(armor);
      expect(ch.lastMessage).toContain('You wear');
    });

    it('emits ObjectEquip event', () => {
      const armor = makeObj({
        name: 'a breastplate',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      addToInventory(armor, ch);
      const handler = vi.fn();
      eventBus.on('object:equip', handler);
      doWear(ch, 'breastplate');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('refuses non-wearable item', () => {
      const item = makeObj({
        name: 'a rock',
        wearFlags: WEAR_FLAGS.TAKE,
      });
      addToInventory(item, ch);
      doWear(ch, 'rock');
      expect(ch.lastMessage).toContain("can't wear");
    });

    it('auto-removes existing equipment when replacing', () => {
      const oldArmor = makeObj({
        name: 'old armor',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      addToInventory(oldArmor, ch);
      doWear(ch, 'armor');
      expect(oldArmor.wearLocation).toBe(WearLocation.Body);

      ch.clearMessages();
      const newArmor = makeObj({
        name: 'new armor',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      addToInventory(newArmor, ch);
      doWear(ch, 'new');
      expect(newArmor.wearLocation).toBe(WearLocation.Body);
      expect(oldArmor.wearLocation).toBe(WearLocation.None);
    });

    it('refuses to replace NOREMOVE equipment', () => {
      const cursedArmor = makeObj({
        name: 'cursed armor',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
        extraFlags: ITEM_EXTRA_FLAGS.NOREMOVE,
      });
      const equipment = ch.equipment as Map<WearLocation, GameObject>;
      equipment.set(WearLocation.Body, cursedArmor);
      cursedArmor.wearLocation = WearLocation.Body;

      const newArmor = makeObj({
        name: 'new armor',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      addToInventory(newArmor, ch);
      doWear(ch, 'new');
      expect(ch.lastMessage).toContain("can't remove");
    });

    it('uses second finger slot when first is taken', () => {
      const ring1 = makeObj({
        name: 'ring one',
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.FINGER,
      });
      addToInventory(ring1, ch);
      doWear(ch, 'ring');
      expect(ring1.wearLocation).toBe(WearLocation.FingerL);

      const ring2 = makeObj({
        name: 'ring two',
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.FINGER,
      });
      addToInventory(ring2, ch);
      doWear(ch, 'ring');
      expect(ring2.wearLocation).toBe(WearLocation.FingerR);
    });

    it('applies object affects on equip', () => {
      const armor = makeObj({
        name: 'magic armor',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
        affects: [{ location: ApplyType.AC, modifier: -10 }],
      });
      addToInventory(armor, ch);
      const oldArmor = ch.armor;
      doWear(ch, 'armor');
      expect(ch.armor).toBe(oldArmor - 10);
    });
  });

  describe('doRemove', () => {
    it('removes equipped item', () => {
      const armor = makeObj({
        name: 'a breastplate',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      addToInventory(armor, ch);
      doWear(ch, 'breastplate');
      ch.clearMessages();

      doRemove(ch, 'breastplate');
      expect(armor.wearLocation).toBe(WearLocation.None);
      expect((ch.inventory as GameObject[]).includes(armor)).toBe(true);
      expect(ch.lastMessage).toContain('You remove');
    });

    it('emits ObjectRemove event', () => {
      const armor = makeObj({
        name: 'a breastplate',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      addToInventory(armor, ch);
      doWear(ch, 'breastplate');

      const handler = vi.fn();
      eventBus.on('object:remove', handler);
      doRemove(ch, 'breastplate');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('refuses to remove NOREMOVE item', () => {
      const cursed = makeObj({
        name: 'cursed ring',
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.FINGER,
        extraFlags: ITEM_EXTRA_FLAGS.NOREMOVE,
      });
      const equipment = ch.equipment as Map<WearLocation, GameObject>;
      equipment.set(WearLocation.FingerL, cursed);
      cursed.wearLocation = WearLocation.FingerL;

      doRemove(ch, 'ring');
      expect(ch.lastMessage).toContain("can't remove");
      expect(cursed.wearLocation).toBe(WearLocation.FingerL);
    });

    it('reports not wearing anything matching', () => {
      doRemove(ch, 'nonexistent');
      expect(ch.lastMessage).toContain("aren't wearing");
    });

    it('reverses object affects on remove', () => {
      const armor = makeObj({
        name: 'magic armor',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
        affects: [{ location: ApplyType.AC, modifier: -10 }],
      });
      addToInventory(armor, ch);
      const baseArmor = ch.armor;
      doWear(ch, 'armor');
      expect(ch.armor).toBe(baseArmor - 10);

      doRemove(ch, 'armor');
      expect(ch.armor).toBe(baseArmor);
    });
  });

  // ===========================================================================
  // doWearAll
  // ===========================================================================

  describe('doWearAll', () => {
    it('equips all equippable items', () => {
      const armor = makeObj({
        name: 'a breastplate',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.BODY,
      });
      const helm = makeObj({
        name: 'a helm',
        itemType: ItemType.Armor,
        wearFlags: WEAR_FLAGS.TAKE | WEAR_FLAGS.HEAD,
      });
      addToInventory(armor, ch);
      addToInventory(helm, ch);
      doWear(ch, 'all');
      expect(armor.wearLocation).toBe(WearLocation.Body);
      expect(helm.wearLocation).toBe(WearLocation.Head);
    });

    it('skips non-wearable items', () => {
      const rock = makeObj({
        name: 'a rock',
        wearFlags: WEAR_FLAGS.TAKE,
      });
      addToInventory(rock, ch);
      doWear(ch, 'all');
      expect(rock.wearLocation).toBe(WearLocation.None);
    });
  });

  // ===========================================================================
  // doEat
  // ===========================================================================

  describe('doEat', () => {
    it('eats food and destroys it', () => {
      const food = makeObj({
        name: 'a piece of bread',
        itemType: ItemType.Food,
        values: [5, 0, 0, 0, 0, 0],
      });
      addToInventory(food, ch);
      doEat(ch, 'bread');
      expect(ch.lastMessage).toContain('You eat');
      expect((ch.inventory as GameObject[]).includes(food)).toBe(false);
    });

    it('refuses non-food items', () => {
      const rock = makeObj({ name: 'a rock', itemType: ItemType.Trash });
      addToInventory(rock, ch);
      doEat(ch, 'rock');
      expect(ch.lastMessage).toContain("can't eat");
    });

    it('detects poisoned food', () => {
      const food = makeObj({
        name: 'a mushroom',
        itemType: ItemType.Food,
        values: [5, 0, 0, 1, 0, 0], // values[3]=1 means poisoned
      });
      addToInventory(food, ch);
      doEat(ch, 'mushroom');
      expect(ch.messages.some(m => m.includes('very sick'))).toBe(true);
    });

    it('requires argument', () => {
      doEat(ch, '');
      expect(ch.lastMessage).toContain('Eat what?');
    });
  });

  // ===========================================================================
  // doDrink
  // ===========================================================================

  describe('doDrink', () => {
    it('drinks from drink container', () => {
      const drink = makeObj({
        name: 'a waterskin',
        itemType: ItemType.DrinkCon,
        values: [10, 5, 0, 0, 0, 0], // capacity=10, charges=5
      });
      addToInventory(drink, ch);
      doDrink(ch, 'waterskin');
      expect(ch.lastMessage).toContain('You drink');
      expect(drink.values[1]).toBe(4); // decremented
    });

    it('refuses empty drink container', () => {
      const drink = makeObj({
        name: 'a waterskin',
        itemType: ItemType.DrinkCon,
        values: [10, 0, 0, 0, 0, 0], // charges=0
      });
      addToInventory(drink, ch);
      doDrink(ch, 'waterskin');
      expect(ch.lastMessage).toContain("empty");
    });

    it('drinks from fountain in room when no arg', () => {
      const fountain = makeObj({
        name: 'a fountain',
        itemType: ItemType.Fountain,
        values: [100, 100, 0, 0, 0, 0],
      });
      placeInRoom(fountain, room);
      doDrink(ch, '');
      expect(ch.lastMessage).toContain('You drink');
    });

    it('fountain charges dont decrement', () => {
      const fountain = makeObj({
        name: 'a fountain',
        itemType: ItemType.Fountain,
        values: [100, 100, 0, 0, 0, 0],
      });
      placeInRoom(fountain, room);
      doDrink(ch, 'fountain');
      expect(fountain.values[1]).toBe(100); // unchanged
    });

    it('detects poisoned drink', () => {
      const drink = makeObj({
        name: 'a waterskin',
        itemType: ItemType.DrinkCon,
        values: [10, 5, 0, 1, 0, 0], // poisoned
      });
      addToInventory(drink, ch);
      doDrink(ch, 'waterskin');
      expect(ch.messages.some(m => m.includes('very sick'))).toBe(true);
    });
  });

  // ===========================================================================
  // doFill
  // ===========================================================================

  describe('doFill', () => {
    it('fills drink container from fountain', () => {
      const drink = makeObj({
        name: 'a waterskin',
        itemType: ItemType.DrinkCon,
        values: [10, 2, 0, 0, 0, 0],
      });
      const fountain = makeObj({
        name: 'a fountain',
        itemType: ItemType.Fountain,
        values: [100, 100, 0, 0, 0, 0],
      });
      addToInventory(drink, ch);
      placeInRoom(fountain, room);

      doFill(ch, 'waterskin');
      expect(drink.values[1]).toBe(10); // filled to capacity
      expect(ch.lastMessage).toContain('You fill');
    });

    it('refuses when no fountain in room', () => {
      const drink = makeObj({
        name: 'a waterskin',
        itemType: ItemType.DrinkCon,
        values: [10, 2, 0, 0, 0, 0],
      });
      addToInventory(drink, ch);
      doFill(ch, 'waterskin');
      expect(ch.lastMessage).toContain('no fountain');
    });

    it('refuses when already full', () => {
      const drink = makeObj({
        name: 'a waterskin',
        itemType: ItemType.DrinkCon,
        values: [10, 10, 0, 0, 0, 0],
      });
      const fountain = makeObj({
        name: 'a fountain',
        itemType: ItemType.Fountain,
      });
      addToInventory(drink, ch);
      placeInRoom(fountain, room);
      doFill(ch, 'waterskin');
      expect(ch.lastMessage).toContain('already full');
    });

    it('requires argument', () => {
      doFill(ch, '');
      expect(ch.lastMessage).toContain('Fill what?');
    });
  });

  // ===========================================================================
  // doSacrifice
  // ===========================================================================

  describe('doSacrifice', () => {
    it('sacrifices object for gold', () => {
      const obj = makeObj({ name: 'a gem', cost: 500 });
      placeInRoom(obj, room);
      const oldGold = ch.gold;
      doSacrifice(ch, 'gem');
      expect(ch.gold).toBe(oldGold + Math.max(1, Math.floor(500 / 100)));
      expect(ch.messages.some(m => m.includes('sacrifice'))).toBe(true);
      expect((room.contents as GameObject[]).includes(obj)).toBe(false);
    });

    it('gives at least 1 gold for cheap items', () => {
      const obj = makeObj({ name: 'a pebble', cost: 1 });
      placeInRoom(obj, room);
      const oldGold = ch.gold;
      doSacrifice(ch, 'pebble');
      expect(ch.gold).toBeGreaterThanOrEqual(oldGold + 1);
    });

    it('refuses ITEM_NO_TAKE objects', () => {
      const obj = makeObj({ name: 'a statue', extraFlags: ITEM_EXTRA_FLAGS.NO_TAKE });
      placeInRoom(obj, room);
      doSacrifice(ch, 'statue');
      expect(ch.lastMessage).toContain("can't sacrifice");
    });

    it('requires argument', () => {
      doSacrifice(ch, '');
      expect(ch.lastMessage).toContain('Sacrifice what?');
    });
  });

  // ===========================================================================
  // doLoot
  // ===========================================================================

  describe('doLoot', () => {
    it('loots NPC corpse', () => {
      const corpse = makeObj({
        name: 'corpse of a guard',
        itemType: ItemType.Corpse_NPC,
        values: [0, 0, 0, 0, 0, 0],
      });
      const gem = makeObj({ name: 'a gem' });
      corpse.contents.push(gem);
      gem.inObject = corpse;
      placeInRoom(corpse, room);

      doLoot(ch, 'corpse');
      expect((ch.inventory as GameObject[]).includes(gem)).toBe(true);
    });

    it('refuses non-corpse objects', () => {
      const bag = makeObj({
        name: 'a bag',
        itemType: ItemType.Container,
      });
      placeInRoom(bag, room);
      doLoot(ch, 'bag');
      expect(ch.lastMessage).toContain("not a corpse");
    });

    it('requires argument', () => {
      doLoot(ch, '');
      expect(ch.lastMessage).toContain('Loot what?');
    });
  });

  // ===========================================================================
  // Command Registration
  // ===========================================================================

  describe('registerObjectCommands', () => {
    it('registers all object commands', () => {
      const registry = new CommandRegistry();
      registerObjectCommands(registry);
      const all = registry.getAllCommands();
      const names = all.map(c => c.name);
      const expected = ['get', 'drop', 'put', 'give', 'wear', 'remove', 'eat', 'drink', 'fill', 'sacrifice', 'loot'];
      for (const cmdName of expected) {
        expect(names, `Command '${cmdName}' should be registered`).toContain(cmdName);
      }
    });
  });

  // --- PARITY: Missing/Partial test stubs ---
  it.todo('doGive — should fire GIVE_PROG trigger on NPC recipient');
  it.todo('doEat — should apply pill spell effects (values[1-3]) via SpellEngine');
  it.todo('doLoot — should enforce PK loot ownership checks');
  it.todo('doAsk — should implement ask command for NPCs');
  it.todo('doCompare — should compare two items in inventory');
  it.todo('doCook — should implement cooking raw food items');
  it.todo('doCouncilInduct — should induct a player into a council');
  it.todo('doCouncilOutcast — should outcast a player from a council');
  it.todo('doFindnote — should search for notes by keyword');
  it.todo('doFire — should implement archery fire command');
  it.todo('doGohome — should teleport player to their house');
  it.todo('doGroup — should manage party group membership');
  it.todo('doGwhere — should show group member locations');
  it.todo('doHold — should hold an item in hand slot');
  it.todo('doHouse — should manage house commands');
  it.todo('doPlay — should play a musical instrument');
  it.todo('doPour — should pour liquid between containers');
  it.todo('doRent — should implement inn rental system');
  it.todo('doRest — should change position to resting');
  it.todo('doShare — should share experience with group members');
  it.todo('doSheath — should sheath wielded weapon');
  it.todo('doSit — should change position to sitting');
  it.todo('doSleep — should change position to sleeping');
  it.todo('doSplit — should split gold among group members');
  it.todo('doStand — should change position to standing');
  it.todo('doTake — should be alias for doGet');
  it.todo('doTip — should tip gold to another player');
  it.todo('doUnholster — should unholster a weapon');
  it.todo('doOrder — should order charmed followers to execute commands');


});
