/**
 * Affect – A temporary modifier applied to a character or object.
 *
 * Tracks the spell/skill source, duration (in ticks), stat location
 * being modified, modifier amount, and bitvector flags applied.
 * Decremented each tick and removed when expired.
 */

import { ApplyType } from './types.js';
import type { Character } from './Character.js';

export class Affect {
  type: number;           // Spell/skill number
  duration: number;       // Ticks remaining (-1 = permanent)
  location: ApplyType;    // What stat it modifies
  modifier: number;       // By how much
  bitvector: bigint;      // AFF flags it sets

  constructor(
    type: number,
    duration: number,
    location: ApplyType,
    modifier: number,
    bitvector: bigint = 0n,
  ) {
    this.type = type;
    this.duration = duration;
    this.location = location;
    this.modifier = modifier;
    this.bitvector = bitvector;
  }

  /**
   * Apply this affect's modifier to the given character.
   * Based on location, modify the appropriate field.
   */
  applyTo(character: Character): void {
    switch (this.location) {
      case ApplyType.Str:
        character.modStats.str += this.modifier;
        break;
      case ApplyType.Dex:
        character.modStats.dex += this.modifier;
        break;
      case ApplyType.Int:
        character.modStats.int += this.modifier;
        break;
      case ApplyType.Wis:
        character.modStats.wis += this.modifier;
        break;
      case ApplyType.Con:
        character.modStats.con += this.modifier;
        break;
      case ApplyType.Cha:
        character.modStats.cha += this.modifier;
        break;
      case ApplyType.Lck:
        character.modStats.lck += this.modifier;
        break;
      case ApplyType.Mana:
        character.maxMana += this.modifier;
        break;
      case ApplyType.Hit:
        character.maxHit += this.modifier;
        break;
      case ApplyType.Move:
        character.maxMove += this.modifier;
        break;
      case ApplyType.AC:
        character.armor += this.modifier;
        break;
      case ApplyType.Hitroll:
        character.hitroll += this.modifier;
        break;
      case ApplyType.Damroll:
        character.damroll += this.modifier;
        break;
      case ApplyType.SavingPoison:
        character.savingPoison += this.modifier;
        break;
      case ApplyType.SavingRod:
        character.savingRod += this.modifier;
        break;
      case ApplyType.SavingPara:
        character.savingPara += this.modifier;
        break;
      case ApplyType.SavingBreath:
        character.savingBreath += this.modifier;
        break;
      case ApplyType.SavingSpell:
        character.savingSpell += this.modifier;
        break;
      case ApplyType.Affect:
        character.affectedBy |= this.bitvector;
        break;
      default:
        // Other apply types handled elsewhere or no-op
        break;
    }

    // Set bitvector flags on character (for non-Affect apply types too)
    if (this.location !== ApplyType.Affect && this.bitvector !== 0n) {
      character.affectedBy |= this.bitvector;
    }
  }

  /**
   * Remove this affect's modifier from the given character.
   * Reverse of applyTo.
   */
  removeFrom(character: Character): void {
    switch (this.location) {
      case ApplyType.Str:
        character.modStats.str -= this.modifier;
        break;
      case ApplyType.Dex:
        character.modStats.dex -= this.modifier;
        break;
      case ApplyType.Int:
        character.modStats.int -= this.modifier;
        break;
      case ApplyType.Wis:
        character.modStats.wis -= this.modifier;
        break;
      case ApplyType.Con:
        character.modStats.con -= this.modifier;
        break;
      case ApplyType.Cha:
        character.modStats.cha -= this.modifier;
        break;
      case ApplyType.Lck:
        character.modStats.lck -= this.modifier;
        break;
      case ApplyType.Mana:
        character.maxMana -= this.modifier;
        break;
      case ApplyType.Hit:
        character.maxHit -= this.modifier;
        break;
      case ApplyType.Move:
        character.maxMove -= this.modifier;
        break;
      case ApplyType.AC:
        character.armor -= this.modifier;
        break;
      case ApplyType.Hitroll:
        character.hitroll -= this.modifier;
        break;
      case ApplyType.Damroll:
        character.damroll -= this.modifier;
        break;
      case ApplyType.SavingPoison:
        character.savingPoison -= this.modifier;
        break;
      case ApplyType.SavingRod:
        character.savingRod -= this.modifier;
        break;
      case ApplyType.SavingPara:
        character.savingPara -= this.modifier;
        break;
      case ApplyType.SavingBreath:
        character.savingBreath -= this.modifier;
        break;
      case ApplyType.SavingSpell:
        character.savingSpell -= this.modifier;
        break;
      case ApplyType.Affect:
        character.affectedBy &= ~this.bitvector;
        break;
      default:
        break;
    }

    // Remove bitvector flags
    if (this.location !== ApplyType.Affect && this.bitvector !== 0n) {
      character.affectedBy &= ~this.bitvector;
    }
  }

  /** Whether this affect has expired (duration reached 0). */
  get isExpired(): boolean {
    return this.duration === 0;
  }

  /**
   * Decrement duration by one tick.
   * Permanent affects (duration -1) are never decremented.
   * @returns true if the affect has expired after this tick
   */
  tick(): boolean {
    if (this.duration < 0) {
      return false; // permanent
    }
    if (this.duration > 0) {
      this.duration--;
    }
    return this.duration === 0;
  }
}
