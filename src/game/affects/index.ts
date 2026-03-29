/**
 * Affect system barrel export.
 */

export {
  AffectManager,
  wireAffectUpdate,
  getAffectManager,
  resetAffectManager,
  registerCharacter,
  unregisterCharacter,
  getActiveCharacters,
  clearActiveCharacters,
} from './AffectManager.js';

export {
  AffectRegistry,
  defaultAffectRegistry,
  SPELL,
  type AffectDefinition,
} from './AffectRegistry.js';

export {
  getStatModifier,
  getStrModifier,
  getIntModifier,
  getWisModifier,
  getDexModifier,
  getConModifier,
  getChaModifier,
  getLckModifier,
  type StrModifier,
  type IntModifier,
  type WisModifier,
  type DexModifier,
  type ConModifier,
  type ChaModifier,
  type LckModifier,
  type StatModifierResult,
} from './StatModifier.js';
