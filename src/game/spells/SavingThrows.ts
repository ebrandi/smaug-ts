/**
 * SavingThrows – Saving throw computation.
 *
 * Replicates legacy saves_spell_staff() from save.c.
 * Base save chance: 50 + (victim.level - level) * 2 + victim.savingSpell
 * Clamped between 5% and 95%.
 * Returns true if the save succeeds (spell resisted).
 *
 * Save types:
 *   SaveType.PoisonDeath (1) – uses savingPoison
 *   SaveType.Wands       (2) – uses savingRod
 *   SaveType.ParaPetri   (3) – uses savingPara
 *   SaveType.Breath      (4) – uses savingBreath
 *   SaveType.SpellStaff  (5) – uses savingSpell
 */

import type { Character } from '../entities/Character.js';
import { SaveType } from '../entities/types.js';
import { numberPercent } from '../../utils/Dice.js';

/**
 * Get the character's saving throw modifier for the given save type.
 */
function getSavingThrowModifier(victim: Character, saveType: SaveType): number {
  switch (saveType) {
    case SaveType.PoisonDeath: return victim.savingPoison;
    case SaveType.Wands:       return victim.savingRod;
    case SaveType.ParaPetri:   return victim.savingPara;
    case SaveType.Breath:      return victim.savingBreath;
    case SaveType.SpellStaff:  return victim.savingSpell;
    default:                   return victim.savingSpell;
  }
}

/**
 * Check if the victim makes their saving throw against an effect.
 *
 * @param level - The caster/effect level
 * @param victim - The character making the save
 * @param saveType - The type of saving throw
 * @returns true if the save succeeds (resisted), false if it fails
 */
export function savingThrow(level: number, victim: Character, saveType: SaveType): boolean {
  const saveMod = getSavingThrowModifier(victim, saveType);

  // Base save: 50% + level advantage + saving throw modifier
  let saveChance = 50 + (victim.level - level) * 2 + saveMod;

  // Clamp between 5% and 95%
  saveChance = Math.max(5, Math.min(95, saveChance));

  // Roll: succeed if roll < saveChance
  return numberPercent() < saveChance;
}

/**
 * @deprecated Use the standalone savingThrow() function instead.
 */
export class SavingThrows {
  checkSave(victim: Character, saveType: SaveType, level: number): boolean {
    return savingThrow(level, victim, saveType);
  }
}
