/**
 * DeathHandler – Character death processing.
 *
 * Handles corpse creation, experience loss/gain, PK tracking,
 * ghost penalties, and death-cry messages. Supports both
 * PC and NPC death paths.
 *
 * Death flow:
 *   1. Stop all fighting involving victim
 *   2. Emit death events
 *   3. Create corpse with victim's inventory/equipment/gold
 *   4. For PCs: XP loss, teleport to recall, restore to 1 HP
 *   5. For NPCs: award XP, extract from world
 *   6. Log the death
 */

import { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import { Mobile } from '../entities/Mobile.js';
import { GameObject } from '../entities/GameObject.js';
import { Room } from '../entities/Room.js';
import { ItemType, Position, WearLocation } from '../entities/types.js';
import type { ObjectPrototype, ExtraDescription } from '../entities/types.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { Logger } from '../../utils/Logger.js';
import { VnumRegistry } from '../world/VnumRegistry.js';

// =============================================================================
// Constants
// =============================================================================

/** Default recall room vnum (Midgaard temple). */
const DEFAULT_RECALL_VNUM = 3001;

/** PC corpse decay timer (ticks). */
const PC_CORPSE_TIMER = 25;

/** NPC corpse decay timer (ticks). */
const NPC_CORPSE_TIMER = 6;

/** Stub ObjectPrototype for corpse creation. */
function corpsePrototype(name: string, isPC: boolean): ObjectPrototype {
  return {
    vnum: 0,
    name: `corpse ${name}`,
    shortDesc: `the corpse of ${name}`,
    longDesc: `The corpse of ${name} is lying here.`,
    description: `The corpse of ${name} is lying here.`,
    itemType: isPC ? ItemType.Corpse_PC : ItemType.Corpse_NPC,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 0, 0, 0, 0, 0],
    weight: 75,
    cost: 0,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [] as ExtraDescription[],
    affects: [],
  };
}

// =============================================================================
// DeathHandler
// =============================================================================

export class DeathHandler {
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly vnumRegistry: VnumRegistry;

  constructor(eventBus: EventBus, logger: Logger, vnumRegistry: VnumRegistry) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.vnumRegistry = vnumRegistry;
  }

  /**
   * Main death handler — dispatches to PC or NPC path.
   */
  handleDeath(killer: Character | null, victim: Character): void {
    // Stop all fighting involving victim
    this.stopAllFighting(victim);

    // Emit events
    this.eventBus.emit(GameEvent.CombatDeath, {
      attackerId: killer?.id ?? 'none',
      victimId: victim.id,
      damage: 0,
      damageType: 'death',
    });
    this.eventBus.emit(GameEvent.CharacterDeath, {
      killer: killer?.id ?? null,
      victim: victim.id,
    });

    // Create corpse
    const corpse = this.makeCorpse(victim);

    if (victim instanceof Player) {
      this.handlePlayerDeath(killer, victim, corpse);
    } else if (victim instanceof Mobile) {
      this.handleNPCDeath(killer, victim);
    }
  }

  /**
   * Handle player death: XP loss, teleport to recall, restore to 1 HP.
   */
  handlePlayerDeath(killer: Character | null, victim: Player, _corpse: GameObject): void {
    // Calculate XP loss (victim level squared * 10, i.e. roughly 1/3 of a level)
    const xpLoss = Math.floor(victim.level * victim.level * 10 / 3);
    victim.exp = Math.max(0, victim.exp - xpLoss);

    // Teleport to recall room
    const recallRoom = this.vnumRegistry.getRoom(DEFAULT_RECALL_VNUM);
    if (recallRoom) {
      const currentRoom = victim.inRoom as Room | null;
      if (currentRoom) {
        currentRoom.removeCharacter(victim);
      }
      recallRoom.addCharacter(victim);
    }

    // Restore to 1 HP
    victim.hit = 1;
    victim.mana = 1;
    victim.move = 1;
    victim.position = Position.Resting;

    // Send death message
    victim.sendToChar("You have been KILLED!!\r\n\r\n");

    // Increment PC death counters
    victim.pcData.pdeaths++;

    // If killer is a player, increment their pkills
    if (killer instanceof Player) {
      killer.pcData.pkills++;
    }

    this.logger.info('death', `${victim.name} killed by ${killer?.name ?? 'unknown'}`);
  }

  /**
   * Handle NPC death: award XP, extract from world.
   */
  handleNPCDeath(killer: Character | null, victim: Mobile): void {
    // Award XP to killer (and group)
    if (killer) {
      const xp = this.calculateXPAward(killer, victim);
      this.awardXP(killer, xp);

      // Increment kill counters
      if (killer instanceof Player) {
        killer.pcData.mkills++;
      }
    }

    // Extract mobile from game
    const victimRoom = victim.inRoom as Room | null;
    if (victimRoom) {
      victimRoom.removeCharacter(victim);
    }

    this.logger.info('death', `${victim.name} killed by ${killer?.name ?? 'unknown'}`);
  }

  /**
   * Create a corpse object, transfer inventory/equipment/gold.
   */
  makeCorpse(victim: Character): GameObject {
    const isPlayer = victim instanceof Player;
    const proto = corpsePrototype(victim.name, isPlayer);
    const corpse = new GameObject(proto);

    corpse.timer = isPlayer ? PC_CORPSE_TIMER : NPC_CORPSE_TIMER;

    // Transfer inventory to corpse
    const inv = [...victim.inventory] as GameObject[];
    for (const obj of inv) {
      // Remove from victim
      const idx = victim.inventory.indexOf(obj);
      if (idx !== -1) {
        victim.inventory.splice(idx, 1);
      }
      obj.carriedBy = null;
      obj.inObject = corpse;
      corpse.contents.push(obj);
    }

    // Transfer equipment to corpse
    for (const [loc, item] of victim.equipment.entries()) {
      if (item) {
        victim.equipment.set(loc, undefined);
        const obj = item as GameObject;
        obj.wearLocation = WearLocation.None;
        obj.carriedBy = null;
        obj.inObject = corpse;
        corpse.contents.push(obj);
      }
    }

    // Transfer gold
    // Store gold in values[0] of the corpse
    corpse.values[0] = victim.gold;
    victim.gold = 0;

    // Place corpse in room
    const room = victim.inRoom as Room | null;
    if (room) {
      room.contents.push(corpse);
      corpse.inRoom = room;
    }

    return corpse;
  }

  /**
   * Calculate XP award for killing an NPC.
   * Base = victim level^2 * 10, adjusted by level difference and alignment.
   */
  calculateXPAward(killer: Character, victim: Mobile): number {
    // Base XP from victim level
    let xp = victim.level * victim.level * 10;

    // Level difference scaling
    const levelDiff = victim.level - killer.level;
    if (levelDiff > 5) {
      xp = Math.floor(xp * 1.5);
    } else if (levelDiff < -5) {
      xp = Math.floor(xp * 0.5);
    }

    // Alignment bonus: good killing evil or evil killing good
    if (
      (killer.alignment > 0 && victim.alignment < -500) ||
      (killer.alignment < 0 && victim.alignment > 500)
    ) {
      xp = Math.floor(xp * 1.2);
    }

    // Minimum XP
    return Math.max(1, xp);
  }

  /**
   * Distribute XP to killer (and group members in same room).
   */
  awardXP(ch: Character, xp: number): void {
    if (!(ch instanceof Player)) return;

    // Gather group members in same room
    const room = ch.inRoom as Room | null;
    const groupMembers: Player[] = [];

    if (room) {
      for (const member of room.characters) {
        if (
          member instanceof Player &&
          (member === ch || member.leader === ch || member.master === ch)
        ) {
          groupMembers.push(member);
        }
      }
    }

    if (groupMembers.length === 0) {
      groupMembers.push(ch);
    }

    // Split XP among group
    const splitXP = Math.floor(xp / groupMembers.length);
    for (const member of groupMembers) {
      member.exp += splitXP;
      member.sendToChar(`You gain ${splitXP} experience points.\r\n`);
    }
  }

  /**
   * Stop all fighting involving the victim.
   */
  private stopAllFighting(victim: Character): void {
    victim.fighting = null;
    victim.position = Position.Dead;

    // Stop anyone in the room fighting the victim
    const room = victim.inRoom as Room | null;
    if (room) {
      for (const ch of room.characters) {
        if (ch.fighting === victim) {
          ch.fighting = null;
          ch.position = Position.Standing;
        }
      }
    }
  }
}
