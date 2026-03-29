/**
 * ComponentSystem – Spell component / reagent tracking.
 *
 * Manages material components required for certain spells,
 * checks inventory for required items, and consumes them
 * on successful casting.
 *
 * Components are specified as item keywords in the SpellDefinition.
 * The system searches the caster's inventory for matching items.
 */

import type { Character } from '../entities/Character.js';
import type { GameObject } from '../entities/GameObject.js';
import { isName } from '../../utils/StringUtils.js';

/**
 * Find an object in a character's inventory by keyword.
 */
function findInInventory(ch: Character, keyword: string): GameObject | null {
  for (const item of ch.inventory) {
    const obj = item as GameObject;
    if (obj && obj.keywords && isName(keyword, obj.keywords.join(' '))) {
      return obj;
    }
    // Also check obj.name as a fallback
    if (obj && obj.name && isName(keyword, obj.name)) {
      return obj;
    }
  }
  return null;
}

/**
 * Check if the caster has all required components for a spell.
 * Returns true if all components are present (or spell has no components).
 *
 * @param ch - The character casting the spell
 * @param components - Array of component item keywords required
 * @returns true if all required components are present
 */
export function checkComponents(ch: Character, components: string[]): boolean {
  if (!components || components.length === 0) return true;

  for (const keyword of components) {
    if (!findInInventory(ch, keyword)) {
      ch.sendToChar(`You lack the required component: ${keyword}.\r\n`);
      return false;
    }
  }
  return true;
}

/**
 * Consume the required components from caster's inventory.
 * Should only be called after checkComponents() returns true.
 *
 * @param ch - The character casting the spell
 * @param components - Array of component item keywords to consume
 */
export function consumeComponents(ch: Character, components: string[]): void {
  if (!components || components.length === 0) return;

  for (const keyword of components) {
    const obj = findInInventory(ch, keyword);
    if (obj) {
      const idx = ch.inventory.indexOf(obj);
      if (idx !== -1) {
        ch.inventory.splice(idx, 1);
      }
    }
  }
}

/**
 * @deprecated Use the standalone functions instead.
 */
export class ComponentSystem {
  hasComponents(caster: Character, components: string[]): boolean {
    return checkComponents(caster, components);
  }

  consumeComponents(caster: Character, components: string[]): void {
    consumeComponents(caster, components);
  }
}
