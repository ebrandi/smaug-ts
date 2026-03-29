/**
 * Spell system barrel export.
 */

export { SpellEngine, doCast, castSpell, calculateManaCost } from './SpellEngine.js';
export {
  SpellRegistry,
  findSpell,
  getSpell,
  getAllSpells,
  getSpellCount,
  SPELL_ID,
  type SpellDefinition,
  type SpellFunction,
} from './SpellRegistry.js';
export { SavingThrows, savingThrow } from './SavingThrows.js';
export { ComponentSystem, checkComponents, consumeComponents } from './ComponentSystem.js';
