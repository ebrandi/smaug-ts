import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerMagicCommands } from '../../../src/game/commands/magic.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Position, ItemType, WearLocation, type ObjectPrototype } from '../../../src/game/entities/types.js';
import { SPELL_ID } from '../../../src/game/spells/SpellRegistry.js';
import { SPELL } from '../../../src/game/affects/AffectRegistry.js';
import * as Dice from '../../../src/utils/Dice.js';

class TestNpc extends Character {
  messages: string[] = [];
  get isNpc(): boolean { return true; }
  sendToChar(text: string): void { this.messages.push(text); }
}

function makePlayer(init?: Partial<CharacterInit>): Player {
  const p = new Player(
    {
      name: 'TestPlayer',
      level: 20,
      mana: 200,
      maxMana: 200,
      hit: 100,
      maxHit: 100,
      position: Position.Standing,
      permStats: { str: 15, int: 18, wis: 14, dex: 12, con: 13, cha: 10, lck: 9 },
      ...init,
    },
  );
  // Intercept sendToChar
  (p as unknown as { messages: string[] }).messages = [];
  p.sendToChar = function (text: string) {
    (this as unknown as { messages: string[] }).messages.push(text);
  };
  return p;
}

function getMessages(ch: Character): string[] {
  return (ch as unknown as { messages: string[] }).messages ?? [];
}

function makePotion(spellId: number): GameObject {
  const proto: ObjectPrototype = {
    vnum: 100, name: 'healing potion', shortDesc: 'a healing potion',
    longDesc: 'A healing potion lies here.', description: '',
    itemType: ItemType.Potion, extraFlags: 0n, wearFlags: 0n,
    values: [20, spellId, 0, 0], weight: 1, cost: 50, rent: 0,
    level: 1, layers: 0, extraDescriptions: [], affects: [],
  };
  return new GameObject(proto);
}

function makeWand(spellId: number, charges: number): GameObject {
  const proto: ObjectPrototype = {
    vnum: 101, name: 'magic wand', shortDesc: 'a magic wand',
    longDesc: 'A magic wand lies here.', description: '',
    itemType: ItemType.Wand, extraFlags: 0n, wearFlags: 0n,
    values: [20, charges, charges, spellId], weight: 1, cost: 100, rent: 0,
    level: 1, layers: 0, extraDescriptions: [], affects: [],
  };
  return new GameObject(proto);
}

function makeStaff(spellId: number, charges: number): GameObject {
  const proto: ObjectPrototype = {
    vnum: 102, name: 'magic staff', shortDesc: 'a magic staff',
    longDesc: 'A magic staff lies here.', description: '',
    itemType: ItemType.Staff, extraFlags: 0n, wearFlags: 0n,
    values: [20, charges, charges, spellId], weight: 3, cost: 200, rent: 0,
    level: 1, layers: 0, extraDescriptions: [], affects: [],
  };
  return new GameObject(proto);
}

function makeRoom(): Room {
  return new Room(1000, 'Test Room', 'A test room.');
}

describe('Magic Commands', () => {
  let registry: CommandRegistry;
  let player: Player;
  let room: Room;

  beforeEach(() => {
    registry = new CommandRegistry();
    registerMagicCommands(registry);
    player = makePlayer();
    room = makeRoom();
    room.addCharacter(player);
    vi.spyOn(Dice, 'numberPercent').mockReturnValue(1);
    GameObject.resetCounters();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerMagicCommands()', () => {
    it('should register cast command', () => {
      expect(registry.getAllCommands().some(c => c.name === 'cast')).toBe(true);
    });

    it('should register quaff command', () => {
      expect(registry.getAllCommands().some(c => c.name === 'quaff')).toBe(true);
    });

    it('should register zap command', () => {
      expect(registry.getAllCommands().some(c => c.name === 'zap')).toBe(true);
    });

    it('should register brandish command', () => {
      expect(registry.getAllCommands().some(c => c.name === 'brandish')).toBe(true);
    });

    it('should register recite command', () => {
      expect(registry.getAllCommands().some(c => c.name === 'recite')).toBe(true);
    });

    it('should register practice command', () => {
      expect(registry.getAllCommands().some(c => c.name === 'practice')).toBe(true);
    });
  });

  describe('cmdQuaff', () => {
    it('should apply potion effects and destroy potion', () => {
      const potion = makePotion(SPELL_ID.CURE_LIGHT);
      player.inventory.push(potion);
      player.hit = 50;

      const quaffCmd = registry.getAllCommands().find(c => c.name === 'quaff')!;
      quaffCmd.handler(player, 'healing');

      expect(player.hit).toBeGreaterThan(50);
      expect(player.inventory).toHaveLength(0);
    });

    it('should error if no potion found', () => {
      const quaffCmd = registry.getAllCommands().find(c => c.name === 'quaff')!;
      quaffCmd.handler(player, 'nonexistent');
      expect(getMessages(player).some(m => m.includes("don't have that potion"))).toBe(true);
    });

    it('should error with no argument', () => {
      const quaffCmd = registry.getAllCommands().find(c => c.name === 'quaff')!;
      quaffCmd.handler(player, '');
      expect(getMessages(player).some(m => m.includes('Quaff what'))).toBe(true);
    });
  });

  describe('cmdZap', () => {
    it('should cast wand spell on target and decrement charges', () => {
      const victim = new TestNpc({ name: 'TestMob', level: 5, hit: 100, maxHit: 100, position: Position.Standing });
      room.addCharacter(victim);

      const wand = makeWand(SPELL_ID.MAGIC_MISSILE, 3);
      player.equipment.set(WearLocation.Hold, wand);

      const zapCmd = registry.getAllCommands().find(c => c.name === 'zap')!;
      zapCmd.handler(player, 'TestMob');

      expect(wand.values[2]).toBe(2);
      expect(victim.hit).toBeLessThan(100);
    });

    it('should error if not holding a wand', () => {
      const zapCmd = registry.getAllCommands().find(c => c.name === 'zap')!;
      zapCmd.handler(player, 'someone');
      expect(getMessages(player).some(m => m.includes("aren't holding a wand"))).toBe(true);
    });
  });

  describe('cmdBrandish', () => {
    it('should cast staff spell on all targets in room', () => {
      const victim1 = new TestNpc({ name: 'Mob1', level: 5, hit: 100, maxHit: 100, position: Position.Standing });
      const victim2 = new TestNpc({ name: 'Mob2', level: 5, hit: 100, maxHit: 100, position: Position.Standing });
      room.addCharacter(victim1);
      room.addCharacter(victim2);

      const staff = makeStaff(SPELL_ID.MAGIC_MISSILE, 5);
      player.equipment.set(WearLocation.Hold, staff);

      const brandishCmd = registry.getAllCommands().find(c => c.name === 'brandish')!;
      brandishCmd.handler(player, '');

      expect(staff.values[2]).toBe(4);
      expect(victim1.hit).toBeLessThan(100);
      expect(victim2.hit).toBeLessThan(100);
    });

    it('should error if not holding a staff', () => {
      const brandishCmd = registry.getAllCommands().find(c => c.name === 'brandish')!;
      brandishCmd.handler(player, '');
      expect(getMessages(player).some(m => m.includes("aren't holding a staff"))).toBe(true);
    });
  });

  describe('cmdPractice', () => {
    it('should list known spells with no argument', () => {
      player.pcData.learned.set(SPELL_ID.FIREBALL, 50);
      const practiceCmd = registry.getAllCommands().find(c => c.name === 'practice')!;
      practiceCmd.handler(player, '');
      expect(getMessages(player).some(m => m.includes('fireball'))).toBe(true);
    });

    it('should improve proficiency when practicing with a trainer', () => {
      const trainer = new TestNpc({ name: 'Trainer', level: 50 });
      room.addCharacter(trainer);

      (player.pcData as unknown as { practices: number }).practices = 5;
      player.pcData.learned.set(SPELL_ID.FIREBALL, 30);

      const practiceCmd = registry.getAllCommands().find(c => c.name === 'practice')!;
      practiceCmd.handler(player, 'fireball');

      expect(player.pcData.learned.get(SPELL_ID.FIREBALL)!).toBeGreaterThan(30);
      expect((player.pcData as unknown as { practices: number }).practices).toBe(4);
    });

    it('should error if no trainer present', () => {
      (player.pcData as unknown as { practices: number }).practices = 5;
      const practiceCmd = registry.getAllCommands().find(c => c.name === 'practice')!;
      practiceCmd.handler(player, 'fireball');
      expect(getMessages(player).some(m => m.includes('find a trainer'))).toBe(true);
    });
  });
});
