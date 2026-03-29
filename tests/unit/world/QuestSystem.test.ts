import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CharacterInit } from '../../../src/game/entities/Character.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Area } from '../../../src/game/entities/Area.js';
import { Position, Sex } from '../../../src/game/entities/types.js';
import type { MobilePrototype } from '../../../src/game/entities/types.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';
import {
  QuestType,
  QUEST_TIME_LIMIT,
  QUEST_TIME_MIN,
  QUEST_COOLDOWN,
  QUEST_QUIT_PENALTY,
  QUEST_LEVEL_RANGE,
  QUEST_SHOP_ITEMS,
  getQuestData,
  clearQuestData,
  resetAllQuests,
  calculateRewards,
  findQuestTarget,
  findAreaForMob,
  doQuest,
  questUpdate,
  notifyMobKill,
  setQuestVnumRegistry,
  setQuestAreaManager,
  setQuestLogger,
  registerQuestCommands,
} from '../../../src/game/world/QuestSystem.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';

// =============================================================================
// Test Helpers
// =============================================================================

function makePlayer(overrides?: Partial<CharacterInit>): Player {
  const p = new Player({
    id: `player_${Math.random().toString(36).slice(2)}`,
    name: 'QuestHero',
    level: overrides?.level ?? 20,
    trust: overrides?.trust ?? 0,
    hit: 100, maxHit: 100,
    mana: 100, maxMana: 100,
    move: 100, maxMove: 100,
    position: Position.Standing,
    permStats: { str: 15, int: 15, wis: 15, dex: 15, con: 15, cha: 15, lck: 15 },
    ...overrides,
  });
  (p as any)._messages = [] as string[];
  p.sendToChar = (text: string) => { (p as any)._messages.push(text); };
  // Stub gainXp
  (p as any).gainXp = vi.fn();
  return p;
}

function getMessages(p: Player): string[] {
  return (p as any)._messages ?? [];
}

function clearMessages(p: Player): void {
  (p as any)._messages = [];
}

function makeMobProto(vnum: number, level: number, name: string): MobilePrototype {
  return {
    vnum,
    name,
    shortDesc: name,
    longDesc: `${name} stands here.`,
    description: '',
    actFlags: 1n,
    affectedBy: 0n,
    alignment: 0,
    level,
    hitroll: 5,
    damroll: 5,
    hitDice: { num: 3, size: 8, bonus: 20 },
    damageDice: { num: 2, size: 6, bonus: 0 },
    gold: 100,
    exp: 500,
    sex: Sex.Male,
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
    shop: null,
    repairShop: null,
  };
}

function makeArea(name: string, mLow: number, mHigh: number): Area {
  const a = new Area(`${name}.are`, name, 'Test');
  a.vnumRanges.rooms = { low: mLow, high: mHigh };
  a.vnumRanges.mobiles = { low: mLow, high: mHigh };
  a.vnumRanges.objects = { low: mLow, high: mHigh };
  return a;
}

function setupWorldWithMobs(): { vnumRegistry: VnumRegistry; areaManager: any; areas: Area[] } {
  const vnumRegistry = new VnumRegistry();
  const area1 = makeArea('Hometown', 1000, 1099);
  const area2 = makeArea('Wilderness', 2000, 2099);

  // Register mobs in area2 at various levels
  const mobs = [
    makeMobProto(2001, 15, 'a wild wolf'),
    makeMobProto(2002, 18, 'a fierce bear'),
    makeMobProto(2003, 20, 'a bandit chief'),
    makeMobProto(2004, 22, 'an orc warrior'),
    makeMobProto(2005, 25, 'a dark mage'),
    makeMobProto(2006, 50, 'a dragon'),  // Way too high for level 20
  ];

  for (const mob of mobs) {
    vnumRegistry.registerMobile(mob.vnum, mob);
  }

  const areaManager = {
    getAllAreas: () => [area1, area2],
  };

  return { vnumRegistry, areaManager, areas: [area1, area2] };
}

// =============================================================================
// Tests
// =============================================================================

describe('QuestSystem', () => {
  beforeEach(() => {
    resetAllQuests();
    setQuestVnumRegistry(null);
    setQuestAreaManager(null);
    setQuestLogger(null);
  });

  // ===========================================================================
  // Quest Constants
  // ===========================================================================

  describe('Constants', () => {
    it('should have valid time limits', () => {
      expect(QUEST_TIME_LIMIT).toBeGreaterThan(QUEST_TIME_MIN);
      expect(QUEST_TIME_MIN).toBeGreaterThan(0);
    });

    it('should have positive cooldowns', () => {
      expect(QUEST_COOLDOWN).toBeGreaterThan(0);
      expect(QUEST_QUIT_PENALTY).toBeGreaterThan(QUEST_COOLDOWN);
    });

    it('should have quest shop items', () => {
      expect(QUEST_SHOP_ITEMS.length).toBeGreaterThan(0);
      for (const item of QUEST_SHOP_ITEMS) {
        expect(item.keyword).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.cost).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================================================
  // calculateRewards
  // ===========================================================================

  describe('calculateRewards', () => {
    it('should return positive rewards', () => {
      const r = calculateRewards(20);
      expect(r.questPoints).toBeGreaterThanOrEqual(15);
      expect(r.questPoints).toBeLessThanOrEqual(35);
      expect(r.gold).toBe(400); // 20 * 20
      expect(r.experience).toBe(2000); // 20 * 20 * 5
      expect(r.practices).toBeGreaterThanOrEqual(1);
      expect(r.practices).toBeLessThanOrEqual(3);
    });

    it('should scale gold and XP with level', () => {
      const r10 = calculateRewards(10);
      const r30 = calculateRewards(30);
      expect(r30.gold).toBeGreaterThan(r10.gold);
      expect(r30.experience).toBeGreaterThan(r10.experience);
    });
  });

  // ===========================================================================
  // Quest Data Management
  // ===========================================================================

  describe('Quest Data', () => {
    it('should return empty quest data for new characters', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      expect(qd.type).toBe(QuestType.None);
      expect(qd.targetVnum).toBe(0);
      expect(qd.countdown).toBe(0);
    });

    it('should persist quest data for the same character', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 1234;
      const qd2 = getQuestData(ch);
      expect(qd2.type).toBe(QuestType.Kill);
      expect(qd2.targetVnum).toBe(1234);
    });

    it('should clear quest data', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      clearQuestData(ch);
      const qd2 = getQuestData(ch);
      expect(qd2.type).toBe(QuestType.None);
    });

    it('resetAllQuests should clear all data', () => {
      const ch1 = makePlayer();
      const ch2 = makePlayer({ name: 'Hero2' });
      getQuestData(ch1).type = QuestType.Kill;
      getQuestData(ch2).type = QuestType.Retrieve;
      resetAllQuests();
      expect(getQuestData(ch1).type).toBe(QuestType.None);
      expect(getQuestData(ch2).type).toBe(QuestType.None);
    });
  });

  // ===========================================================================
  // findQuestTarget
  // ===========================================================================

  describe('findQuestTarget', () => {
    it('should return null when no registry is set', () => {
      const ch = makePlayer();
      expect(findQuestTarget(ch)).toBeNull();
    });

    it('should find a mob within level range', () => {
      const { vnumRegistry, areaManager, areas } = setupWorldWithMobs();
      setQuestVnumRegistry(vnumRegistry);
      setQuestAreaManager(areaManager);

      const ch = makePlayer({ level: 20 });
      // Place player in area1 so area2 mobs qualify
      const room = new Room(1001, 'Home', 'Your home.');
      room.area = areas[0];
      room.addCharacter(ch);

      // Run multiple times to verify we get results
      let found = false;
      for (let i = 0; i < 20; i++) {
        const target = findQuestTarget(ch);
        if (target) {
          found = true;
          expect(target.level).toBeGreaterThanOrEqual(20 - QUEST_LEVEL_RANGE);
          expect(target.level).toBeLessThanOrEqual(20 + QUEST_LEVEL_RANGE);
        }
      }
      expect(found).toBe(true);
    });

    it('should not return mobs from the same area', () => {
      const vnumRegistry = new VnumRegistry();
      const area = makeArea('Only', 1000, 1099);
      vnumRegistry.registerMobile(1001, makeMobProto(1001, 20, 'local mob'));

      const areaManager = { getAllAreas: () => [area] };
      setQuestVnumRegistry(vnumRegistry);
      setQuestAreaManager(areaManager);

      const ch = makePlayer({ level: 20 });
      const room = new Room(1000, 'Room', '');
      room.area = area;
      room.addCharacter(ch);

      // All mobs are in the player's area, so no target
      const target = findQuestTarget(ch);
      expect(target).toBeNull();
    });

    it('should not return mobs outside level range', () => {
      const { vnumRegistry, areaManager, areas } = setupWorldWithMobs();
      setQuestVnumRegistry(vnumRegistry);
      setQuestAreaManager(areaManager);

      const ch = makePlayer({ level: 5 }); // Too low for any mob in area2
      const room = new Room(1001, 'Home', '');
      room.area = areas[0];
      room.addCharacter(ch);

      const target = findQuestTarget(ch);
      // All mobs in area2 are level 15+ which is > 5+5=10
      expect(target).toBeNull();
    });
  });

  // ===========================================================================
  // findAreaForMob
  // ===========================================================================

  describe('findAreaForMob', () => {
    it('should return area name for known mob', () => {
      const { areaManager } = setupWorldWithMobs();
      setQuestAreaManager(areaManager);
      expect(findAreaForMob(2001)).toBe('Wilderness');
    });

    it('should return unknown for mob not in any area', () => {
      const { areaManager } = setupWorldWithMobs();
      setQuestAreaManager(areaManager);
      expect(findAreaForMob(9999)).toBe('an unknown area');
    });

    it('should return unknown when no area manager', () => {
      expect(findAreaForMob(2001)).toBe('an unknown area');
    });
  });

  // ===========================================================================
  // doQuest command
  // ===========================================================================

  describe('doQuest', () => {
    it('should reject NPC usage', () => {
      // Create a minimal NPC-like character
      const ch = makePlayer();
      Object.defineProperty(ch, 'isNpc', { get: () => true });
      doQuest(ch, 'request');
      expect(getMessages(ch)[0]).toContain('NPCs');
    });

    it('should show help for unknown subcommand', () => {
      const ch = makePlayer();
      doQuest(ch, '');
      expect(getMessages(ch)[0]).toContain('request');
      expect(getMessages(ch)[0]).toContain('complete');
    });

    it('should show help for invalid subcommand', () => {
      const ch = makePlayer();
      doQuest(ch, 'nonsense');
      expect(getMessages(ch)[0]).toContain('request');
    });
  });

  // ===========================================================================
  // quest request
  // ===========================================================================

  describe('quest request', () => {
    it('should assign a quest when targets are available', () => {
      const { vnumRegistry, areaManager, areas } = setupWorldWithMobs();
      setQuestVnumRegistry(vnumRegistry);
      setQuestAreaManager(areaManager);

      const ch = makePlayer({ level: 20 });
      const room = new Room(1001, 'Home', '');
      room.area = areas[0];
      room.addCharacter(ch);

      doQuest(ch, 'request');
      const qd = getQuestData(ch);
      expect(qd.type).not.toBe(QuestType.None);
      expect(qd.targetVnum).toBeGreaterThan(0);
      expect(qd.countdown).toBeGreaterThanOrEqual(QUEST_TIME_MIN);
      expect(qd.countdown).toBeLessThanOrEqual(QUEST_TIME_LIMIT);
      expect(getMessages(ch).some(m => m.includes('quest'))).toBe(true);
    });

    it('should reject request when already on a quest', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 1234;

      doQuest(ch, 'request');
      expect(getMessages(ch)[0]).toContain('already on a quest');
    });

    it('should reject request during cooldown', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.nextQuestTick = 3;

      doQuest(ch, 'request');
      expect(getMessages(ch)[0]).toContain('wait');
    });

    it('should report no targets when none available', () => {
      setQuestVnumRegistry(new VnumRegistry());
      setQuestAreaManager({ getAllAreas: () => [] } as any);

      const ch = makePlayer();
      doQuest(ch, 'request');
      expect(getMessages(ch)[0]).toContain('no suitable');
    });
  });

  // ===========================================================================
  // quest complete
  // ===========================================================================

  describe('quest complete', () => {
    it('should reject when not on a quest', () => {
      const ch = makePlayer();
      doQuest(ch, 'complete');
      expect(getMessages(ch)[0]).toContain('not on a quest');
    });

    it('should reject when objective not yet met', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      ch.pcData.questNumber = 0; // Not completed

      doQuest(ch, 'complete');
      expect(getMessages(ch)[0]).toContain('not yet completed');
    });

    it('should award rewards when objective is met', () => {
      const ch = makePlayer({ level: 20 });
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'a wild wolf';
      qd.countdown = 10;
      ch.pcData.questNumber = 2001; // Objective met

      const initialGold = ch.gold;
      const initialPractice = ch.practice;
      const initialQP = ch.pcData.questCurrent;

      doQuest(ch, 'complete');

      expect(ch.pcData.questCurrent).toBeGreaterThan(initialQP);
      expect(ch.gold).toBeGreaterThan(initialGold);
      expect(ch.practice).toBeGreaterThan(initialPractice);
      expect(getMessages(ch).some(m => m.includes('Congratulations'))).toBe(true);

      // Quest should be cleared
      expect(qd.type).toBe(QuestType.None);
      expect(qd.nextQuestTick).toBe(QUEST_COOLDOWN);
      expect(ch.pcData.questNumber).toBe(0);
    });

    it('should call gainXp on completion', () => {
      const ch = makePlayer({ level: 10 });
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'a wolf';
      ch.pcData.questNumber = 2001;

      doQuest(ch, 'complete');
      expect((ch as any).gainXp).toHaveBeenCalled();
    });

    it('should accumulate total quest points', () => {
      const ch = makePlayer();
      ch.pcData.questAccum = 50;
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 100;
      qd.targetName = 'target';
      ch.pcData.questNumber = 100;

      doQuest(ch, 'complete');
      expect(ch.pcData.questAccum).toBeGreaterThan(50);
    });
  });

  // ===========================================================================
  // quest quit
  // ===========================================================================

  describe('quest quit', () => {
    it('should reject when not on a quest', () => {
      const ch = makePlayer();
      doQuest(ch, 'quit');
      expect(getMessages(ch)[0]).toContain('not on a quest');
    });

    it('should abandon a quest with penalty cooldown', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'a wolf';
      qd.countdown = 20;

      doQuest(ch, 'quit');
      expect(qd.type).toBe(QuestType.None);
      expect(qd.nextQuestTick).toBe(QUEST_QUIT_PENALTY);
      expect(getMessages(ch).some(m => m.includes('abandon'))).toBe(true);
    });

    it('should accept "abandon" as alias for quit', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'a wolf';

      doQuest(ch, 'abandon');
      expect(qd.type).toBe(QuestType.None);
    });
  });

  // ===========================================================================
  // quest info
  // ===========================================================================

  describe('quest info', () => {
    it('should show no quest when idle', () => {
      const ch = makePlayer();
      doQuest(ch, 'info');
      expect(getMessages(ch)[0]).toContain('not on a quest');
    });

    it('should show cooldown when on cooldown', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.nextQuestTick = 3;

      doQuest(ch, 'info');
      expect(getMessages(ch)[0]).toContain('3');
    });

    it('should show active quest details', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'a fierce bear';
      qd.targetAreaName = 'Wilderness';
      qd.countdown = 15;
      ch.pcData.questCurrent = 100;
      ch.pcData.questAccum = 200;

      doQuest(ch, 'info');
      const msgs = getMessages(ch).join('\n');
      expect(msgs).toContain('Kill');
      expect(msgs).toContain('a fierce bear');
      expect(msgs).toContain('Wilderness');
      expect(msgs).toContain('15');
      expect(msgs).toContain('100');
      expect(msgs).toContain('200');
    });
  });

  // ===========================================================================
  // quest list
  // ===========================================================================

  describe('quest list', () => {
    it('should display all shop items', () => {
      const ch = makePlayer();
      ch.pcData.questCurrent = 500;

      doQuest(ch, 'list');
      const msgs = getMessages(ch).join('\n');
      for (const item of QUEST_SHOP_ITEMS) {
        expect(msgs).toContain(item.keyword);
      }
      expect(msgs).toContain('500');
    });
  });

  // ===========================================================================
  // quest buy
  // ===========================================================================

  describe('quest buy', () => {
    it('should reject empty keyword', () => {
      const ch = makePlayer();
      doQuest(ch, 'buy');
      expect(getMessages(ch)[0]).toContain('Buy what');
    });

    it('should reject unknown keyword', () => {
      const ch = makePlayer();
      doQuest(ch, 'buy unicorn');
      expect(getMessages(ch)[0]).toContain('Unknown');
    });

    it('should reject when not enough QP', () => {
      const ch = makePlayer();
      ch.pcData.questCurrent = 10;
      doQuest(ch, 'buy practices');
      expect(getMessages(ch)[0]).toContain('need');
    });

    it('should buy practices', () => {
      const ch = makePlayer();
      ch.pcData.questCurrent = 200;
      const initialPractice = ch.practice;
      doQuest(ch, 'buy practices');
      expect(ch.practice).toBe(initialPractice + 10);
      expect(ch.pcData.questCurrent).toBe(100); // 200 - 100
    });

    it('should buy gold', () => {
      const ch = makePlayer();
      ch.pcData.questCurrent = 100;
      const initialGold = ch.gold;
      doQuest(ch, 'buy gold');
      expect(ch.gold).toBe(initialGold + 50000);
      expect(ch.pcData.questCurrent).toBe(50); // 100 - 50
    });

    it('should buy HP boost', () => {
      const ch = makePlayer();
      ch.pcData.questCurrent = 300;
      const initialMaxHit = ch.maxHit;
      const initialHit = ch.hit;
      doQuest(ch, 'buy hp');
      expect(ch.maxHit).toBe(initialMaxHit + 25);
      expect(ch.hit).toBe(initialHit + 25);
      expect(ch.pcData.questCurrent).toBe(100); // 300 - 200
    });

    it('should buy mana boost', () => {
      const ch = makePlayer();
      ch.pcData.questCurrent = 250;
      const initialMaxMana = ch.maxMana;
      doQuest(ch, 'buy mana');
      expect(ch.maxMana).toBe(initialMaxMana + 25);
      expect(ch.pcData.questCurrent).toBe(50);
    });

    it('should buy move boost', () => {
      const ch = makePlayer();
      ch.pcData.questCurrent = 200;
      const initialMaxMove = ch.maxMove;
      doQuest(ch, 'buy move');
      expect(ch.maxMove).toBe(initialMaxMove + 25);
      expect(ch.pcData.questCurrent).toBe(50);
    });
  });

  // ===========================================================================
  // questUpdate (tick)
  // ===========================================================================

  describe('questUpdate', () => {
    it('should decrement countdown each tick', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'wolf';
      qd.countdown = 10;

      questUpdate([ch]);
      expect(qd.countdown).toBe(9);
    });

    it('should decrement cooldown each tick', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.nextQuestTick = 3;

      questUpdate([ch]);
      expect(qd.nextQuestTick).toBe(2);
    });

    it('should warn at 5 ticks remaining', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'wolf';
      qd.countdown = 6;

      questUpdate([ch]);
      expect(qd.countdown).toBe(5);
      expect(getMessages(ch).some(m => m.includes('5 ticks'))).toBe(true);
    });

    it('should expire quest when countdown reaches 0', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'wolf';
      qd.countdown = 1;

      questUpdate([ch]);
      expect(qd.type).toBe(QuestType.None);
      expect(qd.nextQuestTick).toBe(QUEST_COOLDOWN);
      expect(getMessages(ch).some(m => m.includes('run out of time'))).toBe(true);
    });

    it('should not affect players without active quests', () => {
      const ch = makePlayer();
      questUpdate([ch]);
      const qd = getQuestData(ch);
      expect(qd.type).toBe(QuestType.None);
      expect(qd.countdown).toBe(0);
    });

    it('should handle multiple players', () => {
      const ch1 = makePlayer({ name: 'Hero1' });
      const ch2 = makePlayer({ name: 'Hero2' });
      const qd1 = getQuestData(ch1);
      const qd2 = getQuestData(ch2);
      qd1.type = QuestType.Kill;
      qd1.countdown = 10;
      qd1.targetVnum = 1;
      qd1.targetName = 'a';
      qd2.nextQuestTick = 5;

      questUpdate([ch1, ch2]);
      expect(qd1.countdown).toBe(9);
      expect(qd2.nextQuestTick).toBe(4);
    });
  });

  // ===========================================================================
  // notifyMobKill
  // ===========================================================================

  describe('notifyMobKill', () => {
    it('should mark quest objective complete when target killed', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      qd.targetName = 'wolf';

      notifyMobKill(ch, 2001);
      expect(ch.pcData.questNumber).toBe(2001);
      expect(getMessages(ch).some(m => m.includes('completed your quest objective'))).toBe(true);
    });

    it('should not mark objective for wrong mob', () => {
      const ch = makePlayer();
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;

      notifyMobKill(ch, 9999);
      expect(ch.pcData.questNumber).toBe(0);
    });

    it('should do nothing when not on a quest', () => {
      const ch = makePlayer();
      notifyMobKill(ch, 2001);
      expect(ch.pcData.questNumber).toBe(0);
      expect(getMessages(ch)).toHaveLength(0);
    });

    it('should ignore NPC killers', () => {
      const ch = makePlayer();
      Object.defineProperty(ch, 'isNpc', { get: () => true });
      const qd = getQuestData(ch);
      qd.type = QuestType.Kill;
      qd.targetVnum = 2001;
      notifyMobKill(ch, 2001);
      // Should not crash and should not modify (since isNpc returns true)
    });
  });

  // ===========================================================================
  // registerQuestCommands
  // ===========================================================================

  describe('registerQuestCommands', () => {
    it('should register the quest command', () => {
      const logger = new Logger(LogLevel.Error);
      const registry = new CommandRegistry(logger);
      registerQuestCommands(registry);

      const ch = makePlayer();
      registry.dispatch(ch, 'quest');
      expect(getMessages(ch).some(m => m.includes('request'))).toBe(true);
    });
  });

  // ===========================================================================
  // Full quest lifecycle
  // ===========================================================================

  describe('Full Quest Lifecycle', () => {
    it('request → kill mob → complete → cooldown → request again', () => {
      const { vnumRegistry, areaManager, areas } = setupWorldWithMobs();
      setQuestVnumRegistry(vnumRegistry);
      setQuestAreaManager(areaManager);

      const ch = makePlayer({ level: 20 });
      const room = new Room(1001, 'Home', '');
      room.area = areas[0];
      room.addCharacter(ch);

      // Step 1: Request a quest
      doQuest(ch, 'request');
      const qd = getQuestData(ch);
      expect(qd.type).not.toBe(QuestType.None);
      const targetVnum = qd.targetVnum;
      clearMessages(ch);

      // Step 2: Kill the target mob
      notifyMobKill(ch, targetVnum);
      expect(ch.pcData.questNumber).toBe(targetVnum);
      clearMessages(ch);

      // Step 3: Complete the quest
      doQuest(ch, 'complete');
      expect(qd.type).toBe(QuestType.None);
      expect(ch.pcData.questCurrent).toBeGreaterThan(0);
      expect(qd.nextQuestTick).toBe(QUEST_COOLDOWN);
      clearMessages(ch);

      // Step 4: Cannot request during cooldown
      doQuest(ch, 'request');
      expect(getMessages(ch)[0]).toContain('wait');
      clearMessages(ch);

      // Step 5: Wait out cooldown
      for (let i = 0; i < QUEST_COOLDOWN; i++) {
        questUpdate([ch]);
      }
      expect(qd.nextQuestTick).toBe(0);

      // Step 6: Request a new quest
      doQuest(ch, 'request');
      expect(qd.type).not.toBe(QuestType.None);
    });
  });

  // --- PARITY: Partial implementation stubs ---
  it.todo('should trigger quest completion on mob kill');
  it.todo('should trigger quest completion on item delivery');
  it.todo('should support auto-quest generation');
  it.todo('should persist quest log across sessions');
  it.todo('should handle quest timer expiration');


});
