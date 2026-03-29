/**
 * SpellEngine – Spell casting pipeline.
 *
 * Implements the full 13-step doCast() pipeline and a direct castSpell()
 * for item-based invocations (scrolls, wands, staves, potions).
 *
 * Casting flow (doCast):
 *   1. Parse arguments - extract spell name and target
 *   2. Find spell - SpellRegistry.findSpell() by prefix
 *   3. Proficiency check - ch.learned for players
 *   4. Position check - Standing or Fighting
 *   5. Room flag check - ROOM_NO_MAGIC, ROOM_SAFE
 *   6. Sector check - Some spells need specific sectors
 *   7. Mana check - calculated mana cost
 *   8. Target resolution - based on TargetType
 *   9. Component check - ComponentSystem.checkComponents()
 *  10. Failure chance - proficiency roll
 *  11. Deduct mana
 *  12. Execute spell - spell.spellFun()
 *  13. Improve proficiency - learn_from_success
 */

import type { Character } from '../entities/Character.js';
import type { GameObject } from '../entities/GameObject.js';
import { Player } from '../entities/Player.js';
import { Room } from '../entities/Room.js';
import { Position, TargetType, ROOM_FLAGS } from '../entities/types.js';
import { oneArgument, isNamePrefix } from '../../utils/StringUtils.js';
import { numberPercent } from '../../utils/Dice.js';
import { findSpell, getSpell, type SpellDefinition } from './SpellRegistry.js';
import { checkComponents, consumeComponents } from './ComponentSystem.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// Mana Cost Calculation
// =============================================================================

/**
 * Calculate mana cost for a spell at a given character level.
 * Cost decreases as level increases:
 *   manaCost = spell.minMana + (spell.maxMana - spell.minMana) * (1 - ch.level / 50)
 * Clamped to at least spell.minMana.
 */
export function calculateManaCost(spell: SpellDefinition, ch: Character): number {
  const levelFactor = Math.max(0, 1 - ch.level / 50);
  const cost = Math.floor(spell.minMana + (spell.maxMana - spell.minMana) * levelFactor);
  return Math.max(spell.minMana, cost);
}

// =============================================================================
// Target Resolution
// =============================================================================

/**
 * Find a character in the room by keyword prefix.
 */
function findCharInRoom(ch: Character, arg: string): Character | null {
  const room = ch.inRoom as Room | null;
  if (!room || !room.characters) return null;
  for (const victim of room.characters) {
    if (victim.name && isNamePrefix(arg, victim.name)) {
      return victim;
    }
    if (victim.keywords && isNamePrefix(arg, victim.keywords.join(' '))) {
      return victim;
    }
  }
  return null;
}

/**
 * Find an object in character's inventory by keyword prefix.
 */
function findObjInInventory(ch: Character, arg: string): GameObject | null {
  for (const item of ch.inventory) {
    const obj = item as GameObject;
    if (obj && obj.name && isNamePrefix(arg, obj.name)) {
      return obj;
    }
    if (obj && obj.keywords && isNamePrefix(arg, obj.keywords.join(' '))) {
      return obj;
    }
  }
  return null;
}

/**
 * Find an object in the room by keyword prefix.
 */
function findObjInRoom(ch: Character, arg: string): GameObject | null {
  const room = ch.inRoom as Room | null;
  if (!room) return null;
  const contents = (room as unknown as { contents?: unknown[] }).contents;
  if (!contents) return null;
  for (const item of contents) {
    const obj = item as GameObject;
    if (obj && obj.name && isNamePrefix(arg, obj.name)) {
      return obj;
    }
  }
  return null;
}

// =============================================================================
// Proficiency improvement (learn_from_success)
// =============================================================================

/**
 * Small chance to improve a spell's learned percentage after successful cast.
 */
function learnFromSuccess(ch: Character, spellId: number): void {
  if (!(ch instanceof Player)) return;
  const current = ch.pcData.learned.get(spellId) ?? 0;
  if (current >= 100) return;
  // Base 5% chance to improve
  if (numberPercent() > 5) return;
  const intBonus = Math.max(1, Math.floor(ch.getStat('int') / 5));
  const gain = Math.min(100 - current, intBonus);
  if (gain > 0) {
    ch.pcData.learned.set(spellId, current + gain);
    ch.sendToChar("You have become better at that spell!\r\n");
  }
}

// =============================================================================
// SpellEngine - Public API
// =============================================================================

/**
 * Full 13-step casting pipeline. Called by the 'cast' command.
 */
export function doCast(ch: Character, argument: string): void {
  // Step 1: Parse arguments
  if (!argument || argument.trim() === '') {
    ch.sendToChar("Cast which spell?\r\n");
    return;
  }

  const [spellName, targetArg] = oneArgument(argument);

  // Step 2: Find spell
  const spell = findSpell(spellName);
  if (!spell) {
    ch.sendToChar("You don't know any spells by that name.\r\n");
    return;
  }

  // Step 3: Proficiency check
  if (ch instanceof Player) {
    const learned = ch.pcData.learned.get(spell.id) ?? 0;
    if (learned <= 0) {
      ch.sendToChar("You don't know that spell.\r\n");
      return;
    }
  }
  // NPCs always know spells (no check needed)

  // Step 4: Position check
  if (ch.position < Position.Fighting && ch.position !== Position.Standing) {
    // Allow Standing (11) and Fighting (7) and above-Standing positions
    if (ch.position < Position.Fighting) {
      ch.sendToChar("You can't concentrate enough.\r\n");
      return;
    }
  }

  // Step 5: Room flag check
  const room = ch.inRoom as Room | null;
  if (room && room.hasFlag) {
    if (room.hasFlag(ROOM_FLAGS.NO_MAGIC)) {
      ch.sendToChar("You failed. This room is devoid of magic.\r\n");
      return;
    }
    if (room.hasFlag(ROOM_FLAGS.SAFE) && spell.target === TargetType.TAR_CHAR_OFFENSIVE) {
      ch.sendToChar("You can't cast offensive spells here.\r\n");
      return;
    }
  }

  // Step 6: Sector check (placeholder – specific spells check in their function)
  // No general sector restrictions in legacy SMAUG; specific spells handle this.

  // Step 7: Mana check
  const manaCost = calculateManaCost(spell, ch);
  if (ch.mana < manaCost) {
    ch.sendToChar("You don't have enough mana.\r\n");
    return;
  }

  // Step 8: Target resolution
  let target: Character | GameObject | null = null;

  switch (spell.target) {
    case TargetType.TAR_CHAR_OFFENSIVE: {
      if (targetArg && targetArg.trim() !== '') {
        const victim = findCharInRoom(ch, targetArg.trim());
        if (!victim) {
          ch.sendToChar("They aren't here.\r\n");
          return;
        }
        if (victim === ch) {
          ch.sendToChar("You can't cast that on yourself.\r\n");
          return;
        }
        target = victim;
      } else if (ch.fighting) {
        target = ch.fighting;
      } else {
        ch.sendToChar("Cast the spell on whom?\r\n");
        return;
      }
      break;
    }
    case TargetType.TAR_CHAR_DEFENSIVE: {
      if (targetArg && targetArg.trim() !== '') {
        const victim = findCharInRoom(ch, targetArg.trim());
        if (!victim) {
          ch.sendToChar("They aren't here.\r\n");
          return;
        }
        target = victim;
      } else {
        target = ch; // Default to self
      }
      break;
    }
    case TargetType.TAR_CHAR_SELF: {
      target = ch;
      break;
    }
    case TargetType.TAR_OBJ_INV: {
      if (!targetArg || targetArg.trim() === '') {
        ch.sendToChar("Cast the spell on what?\r\n");
        return;
      }
      const obj = findObjInInventory(ch, targetArg.trim());
      if (!obj) {
        ch.sendToChar("You don't have that item.\r\n");
        return;
      }
      target = obj;
      break;
    }
    case TargetType.TAR_OBJ_ROOM: {
      if (!targetArg || targetArg.trim() === '') {
        ch.sendToChar("Cast the spell on what?\r\n");
        return;
      }
      const roomObj = findObjInRoom(ch, targetArg.trim());
      if (!roomObj) {
        ch.sendToChar("You don't see that here.\r\n");
        return;
      }
      target = roomObj;
      break;
    }
    case TargetType.TAR_IGNORE: {
      target = null;
      break;
    }
  }

  // Step 9: Component check
  if (!checkComponents(ch, spell.components)) {
    return;
  }

  // Step 10: Failure chance (proficiency roll)
  if (ch instanceof Player) {
    const learned = ch.pcData.learned.get(spell.id) ?? 0;
    if (numberPercent() > learned) {
      ch.sendToChar("You lost your concentration.\r\n");
      // Half mana on fizzle
      ch.mana -= Math.floor(manaCost / 2);
      return;
    }
  }

  // Step 11: Deduct mana
  ch.mana -= manaCost;

  // Step 12: Execute spell
  try {
    spell.spellFun(ch.level, ch, target);
    consumeComponents(ch, spell.components);
  } catch (err) {
    logger.error('spells', `Error executing spell ${spell.name}: ${err}`);
  }

  // Apply command lag (beats)
  ch.wait += spell.beats;

  // Step 13: Improve proficiency
  learnFromSuccess(ch, spell.id);

  logger.debug('spells', `${ch.name} cast ${spell.name} (mana: ${manaCost})`);
}

/**
 * Direct spell invocation – used by scrolls, wands, staves, potions.
 * Skips steps 1-7 (parsing, finding, proficiency, position, room, sector, mana)
 * and steps 10-11 (failure chance, mana deduction).
 * Only does target resolution (if needed), component check (skipped for items),
 * and spell execution.
 */
export function castSpell(
  ch: Character,
  spellId: number,
  level: number,
  target: Character | GameObject | null,
): void {
  const spell = getSpell(spellId);
  if (!spell) {
    logger.warn('spells', `castSpell: unknown spell ID ${spellId}`);
    return;
  }

  try {
    spell.spellFun(level, ch, target);
  } catch (err) {
    logger.error('spells', `Error in castSpell ${spell.name}: ${err}`);
  }
}

/**
 * @deprecated Legacy class wrapper. Use standalone functions instead.
 */
export class SpellEngine {
  cast(caster: Character, spellName: string, argument: string): void {
    doCast(caster, `'${spellName}' ${argument}`);
  }
}
