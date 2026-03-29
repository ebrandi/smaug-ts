/**
 * CombatEngine – Core combat round processing.
 *
 * Manages the violence loop: iterates fighting characters each PULSE_VIOLENCE,
 * resolves multi-hit attacks, applies weapon effects, and dispatches
 * damage through DamageCalculator. Handles flee, stun, and death triggers.
 *
 * Combat flow per round:
 *   1. violenceUpdate() called on each PULSE_VIOLENCE
 *   2. For each fighting character, call multiHit()
 *   3. multiHit() calls oneHit() for each attack (dual wield, extra attacks)
 *   4. oneHit() rolls to-hit, calculates damage, applies result
 *   5. If victim HP <= 0, trigger DeathHandler
 */

import { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import { Mobile } from '../entities/Mobile.js';
import { GameObject } from '../entities/GameObject.js';
import { Room } from '../entities/Room.js';
import { Position, DamageType, WearLocation, AFF } from '../entities/types.js';
import { hasFlag } from '../../utils/BitVector.js';
import { rollDice, numberRange, numberPercent } from '../../utils/Dice.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { Logger } from '../../utils/Logger.js';
import { DamageCalculator } from './DamageCalculator.js';
import { DeathHandler } from './DeathHandler.js';

// =============================================================================
// CombatEngine
// =============================================================================

export class CombatEngine {
  private readonly eventBus: EventBus;
  private readonly logger: Logger;
  private readonly damageCalc: DamageCalculator;
  private readonly deathHandler: DeathHandler;

  constructor(
    eventBus: EventBus,
    logger: Logger,
    damageCalc: DamageCalculator,
    deathHandler: DeathHandler,
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.damageCalc = damageCalc;
    this.deathHandler = deathHandler;
  }

  // ===========================================================================
  // Violence Update (called every PULSE_VIOLENCE = 12 pulses = 3 seconds)
  // ===========================================================================

  /**
   * Process one round of violence for all fighting characters.
   * Iterates a snapshot so mutations during iteration are safe.
   */
  violenceUpdate(allCharacters: Character[]): void {
    // Snapshot to avoid mutation during iteration
    const snapshot = [...allCharacters];

    for (const ch of snapshot) {
      if (!ch.fighting) continue;

      const victim = ch.fighting;
      const chRoom = ch.inRoom as Room | null;
      const victimRoom = victim.inRoom as Room | null;

      // If they're no longer in the same room, stop fighting
      if (!chRoom || !victimRoom || chRoom !== victimRoom) {
        this.stopFighting(ch, false);
        continue;
      }

      // Dead characters don't attack
      if (ch.position === Position.Dead) continue;

      // Process attacks
      this.multiHit(ch, victim, null);

      // Auto-assist: group members join combat
      if (ch.fighting && chRoom) {
        for (const gch of chRoom.characters) {
          if (
            gch !== ch &&
            !gch.fighting &&
            (gch.master === ch || gch.leader === ch) &&
            gch.position === Position.Standing
          ) {
            this.startCombat(gch, victim);
          }
        }
      }
    }
  }

  // ===========================================================================
  // Multi-Hit (determine number of attacks and execute each)
  // ===========================================================================

  /**
   * Execute all attacks for an attacker against their victim.
   * Handles dual wield, extra attack skills, and haste.
   * @param _skill - reserved for future use (specific skill attacks)
   */
  multiHit(ch: Character, victim: Character, _skill: number | null): void {
    if (victim.hit <= 0 || ch.hit <= 0) return;

    let attacks = 1;

    // Dual wield: +1 attack if wielding second weapon
    const dualWeapon = ch.equipment.get(WearLocation.DualWield);
    if (dualWeapon) {
      attacks++;
    }

    // Second attack (based on numAttacks from prototype or learned skill)
    if (ch.numAttacks >= 2 || (ch instanceof Player && ch.getLearnedPercent(2) > 0 && numberPercent() < ch.getLearnedPercent(2))) {
      attacks++;
    }

    // Third attack
    if (ch.numAttacks >= 3 || (ch instanceof Player && ch.getLearnedPercent(3) > 0 && numberPercent() < ch.getLearnedPercent(3))) {
      attacks++;
    }

    // Fourth attack (primarily NPCs or high-level warriors)
    if (ch.numAttacks >= 4) {
      attacks++;
    }

    // Fifth attack (NPCs with numAttacks >= 5)
    if (ch instanceof Mobile && ch.numAttacks >= 5) {
      attacks++;
    }

    // Haste doubles attacks
    if (hasFlag(ch.affectedBy, AFF.BERSERK)) {
      // Berserk: +1 attack
      attacks++;
    }

    // Execute each attack
    for (let i = 0; i < attacks; i++) {
      // Check both still alive
      if (victim.hit <= 0 || ch.hit <= 0) break;
      // After first hit, stop if no longer fighting (e.g. death occurred)
      if (i > 0 && !ch.fighting) break;

      this.oneHit(ch, victim, i === 1 && dualWeapon ? true : false);
    }
  }

  // ===========================================================================
  // One Hit (single attack roll)
  // ===========================================================================

  /**
   * Execute a single attack roll and damage application.
   * @param dualWield - true if this is the off-hand weapon attack
   */
  oneHit(ch: Character, victim: Character, dualWield: boolean): void {
    // Get weapon
    const wearSlot = dualWield ? WearLocation.DualWield : WearLocation.Wield;
    const weapon = ch.equipment.get(wearSlot) as GameObject | undefined;

    // Calculate THAC0
    const thac0 = this.damageCalc.calcThac0(ch);
    const roll = numberRange(1, 20);
    const victimAC = Math.floor(victim.armor / 10);

    // Natural 1 always misses
    if (roll === 1) {
      this.inflictDamage(ch, victim, 0, DamageType.Hit);
      return;
    }

    // Natural 20 always hits; otherwise compare roll to needed value
    const hitNeeded = thac0 - victimAC;
    if (roll < 20 && roll < hitNeeded) {
      this.inflictDamage(ch, victim, 0, DamageType.Hit);
      return;
    }

    // Calculate damage
    let damage: number;
    let damType: DamageType;

    if (weapon && weapon.values.length >= 3) {
      // Weapon damage: values[1] = numDice, values[2] = sizeDice
      const numDice = weapon.values[1] ?? 1;
      const sizeDice = weapon.values[2] ?? 4;
      damage = rollDice(numDice, sizeDice);
      // Weapon damage type from values[3], or default to Slash
      damType = (weapon.values[3] ?? DamageType.Slash) as DamageType;
    } else {
      // Bare hands — damage scales with level
      damage = rollDice(1, Math.max(2, Math.floor(ch.level / 2) + 1));
      damType = DamageType.Hit;
    }

    // Add damroll and strength bonus
    damage += ch.damroll;
    damage += this.damageCalc.calcDamageBonus(ch);

    // Critical hit on natural 20
    if (roll === 20) {
      damage *= 2;
    }

    // Enhanced damage: +20% damage (simulated via numAttacks check for NPCs)
    if (ch instanceof Player && ch.getLearnedPercent(5) > 0 && numberPercent() < ch.getLearnedPercent(5)) {
      damage = Math.floor(damage * 1.2);
    }

    // Apply damage modifiers (sanctuary, protection, immunity)
    damage = this.applyDamageModifiers(ch, victim, damage, damType);

    // Minimum 1 damage on a hit
    damage = Math.max(1, damage);

    this.inflictDamage(ch, victim, damage, damType);
  }

  // ===========================================================================
  // Damage Modifiers
  // ===========================================================================

  /**
   * Apply sanctuary, protection, and immunity/resistance/susceptibility.
   */
  applyDamageModifiers(
    ch: Character,
    victim: Character,
    damage: number,
    damType: DamageType,
  ): number {
    // Sanctuary: half damage
    if (hasFlag(victim.affectedBy, AFF.SANCTUARY)) {
      damage = Math.floor(damage / 2);
    }

    // Protection (legacy AFF.PROTECT) — reduces damage by 25% from evil attackers
    if (hasFlag(victim.affectedBy, AFF.PROTECT) && ch.alignment < 0) {
      damage = Math.floor(damage * 0.75);
    }

    // Fireshield: attacker takes some reflected damage (not applied here, just noted)
    // Shockshield / Iceshield similarly are shield effects

    // Immune/resistant/susceptible
    const modifier = this.damageCalc.checkImmune(victim, damType);
    damage = Math.floor(damage * modifier);

    return damage;
  }

  // ===========================================================================
  // Inflict Damage
  // ===========================================================================

  /**
   * Apply damage to victim, display message, check for death/wimpy.
   */
  inflictDamage(
    ch: Character,
    victim: Character,
    damage: number,
    damType: DamageType,
  ): void {
    // Emit combat damage event
    this.eventBus.emit(GameEvent.CombatDamage, {
      attackerId: ch.id,
      victimId: victim.id,
      damage,
      damageType: DamageType[damType] ?? 'unknown',
    });

    // Apply damage
    victim.hit -= damage;

    // Display damage message
    const msg = this.damageCalc.getDamageMessage(damage);
    const damTypeName = DamageType[damType]?.toLowerCase() ?? 'attack';

    if (damage === 0) {
      ch.sendToChar(`Your ${damTypeName} misses ${victim.name}.\r\n`);
      victim.sendToChar(`${ch.name}'s ${damTypeName} misses you.\r\n`);
    } else {
      ch.sendToChar(`Your ${damTypeName} ${msg} ${victim.name}! [${damage}]\r\n`);
      victim.sendToChar(`${ch.name}'s ${damTypeName} ${msg} you! [${damage}]\r\n`);
    }

    // Room message to others
    const room = victim.inRoom as Room | null;
    if (room && damage > 0) {
      for (const bystander of room.characters) {
        if (bystander !== ch && bystander !== victim) {
          bystander.sendToChar(`${ch.name}'s ${damTypeName} ${msg} ${victim.name}.\r\n`);
        }
      }
    }

    // Update position based on HP
    victim.updatePosition();

    // Check for death
    if (victim.position === Position.Dead) {
      this.deathHandler.handleDeath(ch, victim);
      return;
    }

    // Wimpy check for players
    if (
      victim instanceof Player &&
      victim.wimpy > 0 &&
      victim.hit > 0 &&
      victim.hit < victim.wimpy
    ) {
      victim.sendToChar("You wimp out and attempt to flee!\r\n");
      // Flee is handled by the flee command; here we just notify
    }
  }

  // ===========================================================================
  // Start / Stop Combat
  // ===========================================================================

  /**
   * Initiate combat between two characters.
   */
  startCombat(ch: Character, victim: Character): void {
    if (ch.fighting) return;

    ch.fighting = victim;
    ch.position = Position.Fighting;

    if (!victim.fighting) {
      victim.fighting = ch;
      victim.position = Position.Fighting;
    }

    this.logger.debug('combat', `${ch.name} initiates combat with ${victim.name}`);
    this.eventBus.emit(GameEvent.CombatStart, {
      attackerId: ch.id,
      victimId: victim.id,
    });
  }

  /**
   * End combat for a character.
   * @param fBoth - if true, also stop the opponent's fighting
   */
  stopFighting(ch: Character, fBoth: boolean): void {
    if (fBoth && ch.fighting) {
      const opponent = ch.fighting;
      opponent.fighting = null;
      if (opponent.position === Position.Fighting) {
        opponent.position = Position.Standing;
      }
    }

    ch.fighting = null;
    if (ch.position === Position.Fighting) {
      ch.position = Position.Standing;
    }

    this.eventBus.emit(GameEvent.CombatEnd, {
      characterId: ch.id,
    });
  }
}
