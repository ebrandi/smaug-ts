/**
 * QuestSystem – Auto-quest system for SMAUG 2.0
 *
 * Provides automated quests: kill mob or retrieve object.
 * Players request quests, complete them for rewards, and can buy
 * items/bonuses with accumulated quest points.
 * Replicates legacy quest.c from SMAUG 2.0.
 *
 * Quest timer decremented each PULSE_TICK via questUpdate().
 */

import type { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import type { Room } from '../entities/Room.js';
import type { MobilePrototype } from '../entities/types.js';
import { Position } from '../entities/types.js';
import type { VnumRegistry } from './VnumRegistry.js';
import type { AreaManager } from './AreaManager.js';
import { Logger } from '../../utils/Logger.js';
import { numberRange } from '../../utils/Dice.js';
import { CommandLogLevel, defaultCommandFlags } from '../commands/CommandRegistry.js';

const LOG_DOMAIN = 'quest';

// =============================================================================
// Quest Types and State
// =============================================================================

export enum QuestType {
  None = 0,
  Kill = 1,
  Retrieve = 2,
}

/**
 * Active quest data stored per-player.
 * Kept in a WeakMap keyed by Player instance to avoid polluting the entity.
 */
export interface QuestData {
  type: QuestType;
  targetVnum: number;       // vnum of the mob to kill (or mob carrying the item)
  targetName: string;       // display name of the target
  targetAreaName: string;   // area name where the target was found
  countdown: number;        // ticks remaining (full ticks)
  nextQuestTick: number;    // ticks until allowed to request again (cooldown)
}

/** Default empty quest state. */
function emptyQuest(): QuestData {
  return {
    type: QuestType.None,
    targetVnum: 0,
    targetName: '',
    targetAreaName: '',
    countdown: 0,
    nextQuestTick: 0,
  };
}

// =============================================================================
// Quest storage — module-level Map keyed by player id
// =============================================================================

const activeQuests: Map<string, QuestData> = new Map();

export function getQuestData(ch: Character): QuestData {
  if (!activeQuests.has(ch.id)) {
    activeQuests.set(ch.id, emptyQuest());
  }
  return activeQuests.get(ch.id)!;
}

export function clearQuestData(ch: Character): void {
  activeQuests.delete(ch.id);
}

/** Expose for testing: clear all quests. */
export function resetAllQuests(): void {
  activeQuests.clear();
}

// =============================================================================
// Quest Constants
// =============================================================================

/** Maximum countdown ticks for a quest. */
export const QUEST_TIME_LIMIT = 30;

/** Minimum countdown ticks for a quest. */
export const QUEST_TIME_MIN = 15;

/** Cooldown ticks after completing or quitting a quest. */
export const QUEST_COOLDOWN = 5;

/** Penalty cooldown ticks for quitting a quest. */
export const QUEST_QUIT_PENALTY = 8;

/** Level range for finding quest target mobs. */
export const QUEST_LEVEL_RANGE = 5;

// =============================================================================
// Dependency Injection
// =============================================================================

let _vnumRegistry: VnumRegistry | null = null;
let _areaManager: AreaManager | null = null;
let _logger: Logger | null = null;

export function setQuestVnumRegistry(vr: VnumRegistry | null): void { _vnumRegistry = vr; }
export function setQuestAreaManager(am: AreaManager | null): void { _areaManager = am; }
export function setQuestLogger(l: Logger | null): void { _logger = l; }

// =============================================================================
// Quest Rewards
// =============================================================================

export interface QuestReward {
  questPoints: number;
  gold: number;
  experience: number;
  practices: number;
}

/**
 * Calculate rewards for completing a quest based on character level.
 * Replicates legacy quest reward formulas.
 */
export function calculateRewards(level: number): QuestReward {
  return {
    questPoints: numberRange(15, 35),
    gold: level * 20,
    experience: level * level * 5,
    practices: numberRange(1, 3),
  };
}

// =============================================================================
// Quest Point Shop Items
// =============================================================================

export interface QuestShopItem {
  keyword: string;
  name: string;
  cost: number;
  description: string;
}

export const QUEST_SHOP_ITEMS: ReadonlyArray<QuestShopItem> = [
  { keyword: 'practices', name: '10 Practice Sessions', cost: 100, description: 'Gain 10 practice sessions.' },
  { keyword: 'gold',      name: '50,000 Gold Coins',    cost: 50,  description: 'Receive 50,000 gold coins.' },
  { keyword: 'hp',        name: '+25 Max Hit Points',   cost: 200, description: 'Permanently gain 25 max HP.' },
  { keyword: 'mana',      name: '+25 Max Mana',         cost: 200, description: 'Permanently gain 25 max mana.' },
  { keyword: 'move',      name: '+25 Max Move',         cost: 150, description: 'Permanently gain 25 max move.' },
];

// =============================================================================
// Target Selection
// =============================================================================

/**
 * Find a suitable quest target mob. Must be:
 * - Within `level ± QUEST_LEVEL_RANGE` of the player
 * - In a different area than the player
 * - An NPC (has actFlags)
 * Returns a random matching MobilePrototype, or null if none found.
 */
export function findQuestTarget(ch: Character): MobilePrototype | null {
  if (!_vnumRegistry || !_areaManager) return null;

  const room = ch.inRoom as Room | null;
  const playerArea = room?.area ?? null;
  const allMobs = _vnumRegistry.getAllMobiles();

  // Filter eligible mobs
  const eligible: MobilePrototype[] = [];
  for (const mob of allMobs) {
    if (mob.level < ch.level - QUEST_LEVEL_RANGE) continue;
    if (mob.level > ch.level + QUEST_LEVEL_RANGE) continue;
    if (mob.level < 1) continue;

    // Must be in a different area than the player
    if (playerArea) {
      const inSameArea =
        mob.vnum >= playerArea.vnumRanges.mobiles.low &&
        mob.vnum <= playerArea.vnumRanges.mobiles.high;
      if (inSameArea) continue;
    }

    eligible.push(mob);
  }

  if (eligible.length === 0) return null;

  // Pick a random one
  const idx = numberRange(0, eligible.length - 1);
  return eligible[idx] ?? null;
}

/**
 * Find the area name that contains a given mob vnum.
 */
export function findAreaForMob(mobVnum: number): string {
  if (!_areaManager) return 'an unknown area';
  for (const area of _areaManager.getAllAreas()) {
    if (mobVnum >= area.vnumRanges.mobiles.low && mobVnum <= area.vnumRanges.mobiles.high) {
      return area.name;
    }
  }
  return 'an unknown area';
}

// =============================================================================
// Command: quest
// =============================================================================

/**
 * doQuest — Main quest command dispatcher.
 * Subcommands: request, complete, quit, info, list, buy
 */
export function doQuest(ch: Character, argument: string): void {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot quest.\r\n');
    return;
  }

  const player = ch as Player;
  const args = argument.trim().split(/\s+/);
  const subcommand = (args[0] ?? '').toLowerCase();

  switch (subcommand) {
    case 'request':
      questRequest(player);
      break;
    case 'complete':
      questComplete(player);
      break;
    case 'quit':
    case 'abandon':
      questQuit(player);
      break;
    case 'info':
      questInfo(player);
      break;
    case 'list':
      questList(player);
      break;
    case 'buy':
      questBuy(player, args.slice(1).join(' '));
      break;
    default:
      ch.sendToChar('Quest commands: request, complete, quit, info, list, buy <item>\r\n');
      break;
  }
}

/**
 * quest request — Generate a random quest for the player.
 */
function questRequest(ch: Player): void {
  const qd = getQuestData(ch);

  // Check if already on a quest
  if (qd.type !== QuestType.None) {
    ch.sendToChar('You are already on a quest! Use "quest info" to see details.\r\n');
    return;
  }

  // Check cooldown
  if (qd.nextQuestTick > 0) {
    ch.sendToChar(`You must wait ${qd.nextQuestTick} more tick(s) before requesting a new quest.\r\n`);
    return;
  }

  // Find a target
  const target = findQuestTarget(ch);
  if (!target) {
    ch.sendToChar('There are no suitable quest targets available at this time. Try again later.\r\n');
    return;
  }

  // Determine quest type (kill or retrieve)
  const questType = numberRange(1, 2) as QuestType;
  const areaName = findAreaForMob(target.vnum);

  qd.type = questType;
  qd.targetVnum = target.vnum;
  qd.targetName = target.shortDesc || target.name;
  qd.targetAreaName = areaName;
  qd.countdown = numberRange(QUEST_TIME_MIN, QUEST_TIME_LIMIT);
  qd.nextQuestTick = 0;

  if (questType === QuestType.Kill) {
    ch.sendToChar(
      `Your quest is to slay ${qd.targetName}!\r\n` +
      `They were last seen in ${qd.targetAreaName}.\r\n` +
      `You have ${qd.countdown} ticks to complete this quest.\r\n`
    );
  } else {
    ch.sendToChar(
      `Your quest is to retrieve an item from ${qd.targetName}!\r\n` +
      `They were last seen in ${qd.targetAreaName}.\r\n` +
      `You have ${qd.countdown} ticks to complete this quest.\r\n`
    );
  }

  _logger?.info(LOG_DOMAIN, `${ch.name} requested quest: ${QuestType[questType]} ${qd.targetName} (vnum ${target.vnum})`);
}

/**
 * quest complete — Attempt to turn in a completed quest.
 * For kill quests, checks if the player's pcData.mkills incremented
 * (simplified: we check that the target mob vnum matches a recent kill).
 * In this implementation, we check a simple "questComplete" flag.
 */
function questComplete(ch: Player): void {
  const qd = getQuestData(ch);

  if (qd.type === QuestType.None) {
    ch.sendToChar('You are not on a quest.\r\n');
    return;
  }

  // Check if the quest objective is met.
  // We use pcData.questNumber to track that the target was killed/retrieved.
  // questNumber is set to the target vnum when the objective is complete.
  if (ch.pcData.questNumber !== qd.targetVnum) {
    ch.sendToChar('You have not yet completed your quest objective.\r\n');
    ch.sendToChar(`Use "quest info" to review your current quest.\r\n`);
    return;
  }

  // Quest completed! Award rewards.
  const rewards = calculateRewards(ch.level);

  ch.pcData.questCurrent += rewards.questPoints;
  ch.pcData.questAccum += rewards.questPoints;
  ch.gold += rewards.gold;
  ch.practice += rewards.practices;

  ch.sendToChar(
    `Congratulations! You have completed your quest!\r\n` +
    `You receive ${rewards.questPoints} quest points, ${rewards.gold} gold, ` +
    `${rewards.practices} practices, and ${rewards.experience} experience.\r\n`
  );

  // Grant XP
  if (typeof (ch as Player).gainXp === 'function') {
    (ch as Player).gainXp(rewards.experience);
  }

  // Reset quest state
  ch.pcData.questNumber = 0;
  qd.type = QuestType.None;
  qd.targetVnum = 0;
  qd.targetName = '';
  qd.targetAreaName = '';
  qd.countdown = 0;
  qd.nextQuestTick = QUEST_COOLDOWN;

  _logger?.info(LOG_DOMAIN, `${ch.name} completed quest, earned ${rewards.questPoints} QP`);
}

/**
 * quest quit — Abandon the current quest with a cooldown penalty.
 */
function questQuit(ch: Player): void {
  const qd = getQuestData(ch);

  if (qd.type === QuestType.None) {
    ch.sendToChar('You are not on a quest.\r\n');
    return;
  }

  ch.sendToChar(
    `You abandon your quest to deal with ${qd.targetName}.\r\n` +
    `You must wait ${QUEST_QUIT_PENALTY} ticks before requesting a new quest.\r\n`
  );

  // Reset quest state with penalty cooldown
  qd.type = QuestType.None;
  qd.targetVnum = 0;
  qd.targetName = '';
  qd.targetAreaName = '';
  qd.countdown = 0;
  qd.nextQuestTick = QUEST_QUIT_PENALTY;
  ch.pcData.questNumber = 0;

  _logger?.info(LOG_DOMAIN, `${ch.name} abandoned quest`);
}

/**
 * quest info — Show current quest details.
 */
function questInfo(ch: Player): void {
  const qd = getQuestData(ch);

  if (qd.type === QuestType.None) {
    if (qd.nextQuestTick > 0) {
      ch.sendToChar(`You are not on a quest. You can request a new quest in ${qd.nextQuestTick} tick(s).\r\n`);
    } else {
      ch.sendToChar('You are not on a quest. Use "quest request" to start one.\r\n');
    }
    return;
  }

  const typeStr = qd.type === QuestType.Kill ? 'Kill' : 'Retrieve item from';

  ch.sendToChar(
    `Current Quest:\r\n` +
    `  Objective: ${typeStr} ${qd.targetName}\r\n` +
    `  Location:  ${qd.targetAreaName}\r\n` +
    `  Time left: ${qd.countdown} tick(s)\r\n`
  );
  ch.sendToChar(
    `Quest Points: ${ch.pcData.questCurrent} (${ch.pcData.questAccum} total earned)\r\n`
  );
}

/**
 * quest list — Show quest point shop items.
 */
function questList(ch: Player): void {
  ch.sendToChar('Quest Point Shop:\r\n');
  ch.sendToChar('  Keyword      Cost   Description\r\n');
  ch.sendToChar('  ----------   -----  -----------------------------------\r\n');
  for (const item of QUEST_SHOP_ITEMS) {
    const kw = item.keyword.padEnd(12);
    const cost = String(item.cost).padStart(5);
    ch.sendToChar(`  ${kw} ${cost}  ${item.description}\r\n`);
  }
  ch.sendToChar(`\r\nYou have ${ch.pcData.questCurrent} quest points.\r\n`);
}

/**
 * quest buy <item> — Spend quest points on a reward.
 */
function questBuy(ch: Player, keyword: string): void {
  if (!keyword) {
    ch.sendToChar('Buy what? Use "quest list" to see available items.\r\n');
    return;
  }

  const item = QUEST_SHOP_ITEMS.find(
    i => i.keyword.toLowerCase() === keyword.toLowerCase()
  );

  if (!item) {
    ch.sendToChar(`Unknown quest item "${keyword}". Use "quest list" to see available items.\r\n`);
    return;
  }

  if (ch.pcData.questCurrent < item.cost) {
    ch.sendToChar(
      `You need ${item.cost} quest points for ${item.name}, ` +
      `but you only have ${ch.pcData.questCurrent}.\r\n`
    );
    return;
  }

  // Deduct quest points
  ch.pcData.questCurrent -= item.cost;

  // Apply reward
  switch (item.keyword) {
    case 'practices':
      ch.practice += 10;
      ch.sendToChar('You gain 10 practice sessions!\r\n');
      break;
    case 'gold':
      ch.gold += 50000;
      ch.sendToChar('You receive 50,000 gold coins!\r\n');
      break;
    case 'hp':
      ch.maxHit += 25;
      ch.hit += 25;
      ch.sendToChar('You permanently gain 25 max hit points!\r\n');
      break;
    case 'mana':
      ch.maxMana += 25;
      ch.mana += 25;
      ch.sendToChar('You permanently gain 25 max mana!\r\n');
      break;
    case 'move':
      ch.maxMove += 25;
      ch.move += 25;
      ch.sendToChar('You permanently gain 25 max move!\r\n');
      break;
  }

  _logger?.info(LOG_DOMAIN, `${ch.name} bought quest item: ${item.name} for ${item.cost} QP`);
}

// =============================================================================
// Quest Tick Update
// =============================================================================

/**
 * questUpdate — Called every PULSE_TICK. Decrements quest timers for all
 * players with active quests. Expires overdue quests and decrements cooldowns.
 *
 * @param onlinePlayers - Array of all online players to update
 */
export function questUpdate(onlinePlayers: Player[]): void {
  for (const ch of onlinePlayers) {
    const qd = getQuestData(ch);

    // Decrement cooldown
    if (qd.nextQuestTick > 0) {
      qd.nextQuestTick--;
    }

    // Decrement active quest countdown
    if (qd.type !== QuestType.None && qd.countdown > 0) {
      qd.countdown--;

      // Warn at 5 ticks remaining
      if (qd.countdown === 5) {
        ch.sendToChar('You have only 5 ticks left to complete your quest!\r\n');
      }

      // Expired
      if (qd.countdown <= 0) {
        ch.sendToChar(
          `You have run out of time to complete your quest!\r\n` +
          `Your quest to deal with ${qd.targetName} has been cancelled.\r\n`
        );
        qd.type = QuestType.None;
        qd.targetVnum = 0;
        qd.targetName = '';
        qd.targetAreaName = '';
        qd.countdown = 0;
        qd.nextQuestTick = QUEST_COOLDOWN;
        ch.pcData.questNumber = 0;

        _logger?.info(LOG_DOMAIN, `${ch.name}'s quest expired`);
      }
    }
  }
}

/**
 * Notify the quest system that a mob was killed.
 * If the killer is on a quest targeting that mob vnum, mark objective complete.
 */
export function notifyMobKill(killer: Character, mobVnum: number): void {
  if (killer.isNpc) return;
  const player = killer as Player;
  const qd = getQuestData(player);

  if (qd.type === QuestType.None) return;
  if (qd.targetVnum !== mobVnum) return;

  // Mark objective as complete — questNumber set to target vnum
  player.pcData.questNumber = mobVnum;
  player.sendToChar('You have completed your quest objective! Return and use "quest complete".\r\n');
}

// =============================================================================
// Registration
// =============================================================================

/**
 * Register quest commands with the CommandRegistry.
 */
export function registerQuestCommands(registry: import('../commands/CommandRegistry.js').CommandRegistry): void {
  registry.register({
    name: 'quest',
    handler: doQuest,
    minPosition: Position.Resting,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });
}
