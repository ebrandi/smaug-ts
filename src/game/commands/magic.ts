/**
 * magic.ts – Magic / spell-casting command handlers.
 *
 * Implements cast, brandish, zap, quaff, recite, and practice commands.
 * Delegates spell execution to SpellEngine.
 */

import type { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import { Room } from '../entities/Room.js';
import { GameObject } from '../entities/GameObject.js';
import {
  Position,
  ItemType,
  WearLocation,
} from '../entities/types.js';
import { oneArgument, isNamePrefix } from '../../utils/StringUtils.js';
import { numberPercent } from '../../utils/Dice.js';
import { doCast as spellEngineDoCast, castSpell } from '../spells/SpellEngine.js';
import { getSpell, getAllSpells, findSpell } from '../spells/SpellRegistry.js';
import type { CommandRegistry } from './CommandRegistry.js';
import { defaultCommandFlags } from './CommandRegistry.js';
import { CommandLogLevel } from './CommandRegistry.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// Command: cast
// =============================================================================

/**
 * Cast a spell.
 * Syntax: cast <spell> [target]
 */
function cmdCast(ch: Character, argument: string): void {
  spellEngineDoCast(ch, argument);
}

// =============================================================================
// Command: brandish
// =============================================================================

/**
 * Use a staff – cast spell on all valid targets in room.
 * Staff item: itemType = Staff, values[0] = spell level,
 * values[1] = max charges, values[2] = current charges, values[3] = spell ID
 */
function cmdBrandish(ch: Character, _argument: string): void {
  const staff = ch.equipment.get(WearLocation.Hold) as GameObject | undefined;
  if (!staff || staff.itemType !== ItemType.Staff) {
    ch.sendToChar("You aren't holding a staff.\r\n");
    return;
  }

  const spellLevel = staff.values[0] ?? 1;
  const charges = staff.values[2] ?? 0;
  const spellId = staff.values[3] ?? 0;

  if (charges <= 0) {
    ch.sendToChar("The staff has no more charges.\r\n");
    return;
  }

  // Decrement charges
  staff.values[2] = charges - 1;

  const spell = getSpell(spellId);
  if (!spell) {
    ch.sendToChar("Nothing seems to happen.\r\n");
    return;
  }

  ch.sendToChar(`You brandish ${staff.shortDescription || staff.name}.\r\n`);

  // Cast on all valid targets in room
  const room = ch.inRoom as Room | null;
  if (room && room.characters) {
    for (const victim of [...room.characters]) {
      if (victim === ch) continue;
      castSpell(ch, spellId, spellLevel, victim);
    }
  }

  // Destroy staff if no charges remain
  if (staff.values[2] <= 0) {
    ch.sendToChar("The staff blazes bright and is gone.\r\n");
    ch.equipment.delete(WearLocation.Hold);
  }

  ch.wait += 12; // 3 seconds lag
}

// =============================================================================
// Command: zap
// =============================================================================

/**
 * Zap with a wand at a target.
 * Wand item: itemType = Wand, values[0] = spell level,
 * values[1] = max charges, values[2] = current charges, values[3] = spell ID
 * Syntax: zap [target]
 */
function cmdZap(ch: Character, argument: string): void {
  const wand = ch.equipment.get(WearLocation.Hold) as GameObject | undefined;
  if (!wand || wand.itemType !== ItemType.Wand) {
    ch.sendToChar("You aren't holding a wand.\r\n");
    return;
  }

  const spellLevel = wand.values[0] ?? 1;
  const charges = wand.values[2] ?? 0;
  const spellId = wand.values[3] ?? 0;

  if (charges <= 0) {
    ch.sendToChar("The wand has no more charges.\r\n");
    return;
  }

  // Find target
  let target: Character | null = null;
  if (argument && argument.trim() !== '') {
    const room = ch.inRoom as Room | null;
    if (room && room.characters) {
      for (const victim of room.characters) {
        if (isNamePrefix(argument.trim(), victim.name)) {
          target = victim;
          break;
        }
      }
    }
    if (!target) {
      ch.sendToChar("They aren't here.\r\n");
      return;
    }
  } else if (ch.fighting) {
    target = ch.fighting;
  } else {
    ch.sendToChar("Zap whom or what?\r\n");
    return;
  }

  // Decrement charges
  wand.values[2] = charges - 1;

  const spell = getSpell(spellId);
  if (!spell) {
    ch.sendToChar("Nothing seems to happen.\r\n");
    return;
  }

  ch.sendToChar(`You zap ${target.name} with ${wand.shortDescription || wand.name}.\r\n`);
  castSpell(ch, spellId, spellLevel, target);

  // Destroy wand if no charges remain
  if (wand.values[2] <= 0) {
    ch.sendToChar("The wand fizzles and is gone.\r\n");
    ch.equipment.delete(WearLocation.Hold);
  }

  ch.wait += 8; // 2 seconds lag
}

// =============================================================================
// Command: quaff
// =============================================================================

/**
 * Drink a potion – apply up to 3 spell effects.
 * Potion: itemType = Potion, values[0] = spell level,
 * values[1..3] = spell IDs (up to 3 spells)
 * Syntax: quaff <potion>
 */
function cmdQuaff(ch: Character, argument: string): void {
  if (!argument || argument.trim() === '') {
    ch.sendToChar("Quaff what?\r\n");
    return;
  }

  // Find potion in inventory
  let obj: GameObject | null = null;
  for (const item of ch.inventory) {
    const o = item as GameObject;
    if (o && o.itemType === ItemType.Potion) {
      if (isNamePrefix(argument.trim(), o.name) ||
          (o.keywords && isNamePrefix(argument.trim(), o.keywords.join(' ')))) {
        obj = o;
        break;
      }
    }
  }

  if (!obj) {
    ch.sendToChar("You don't have that potion.\r\n");
    return;
  }

  ch.sendToChar(`You quaff ${obj.shortDescription || obj.name}.\r\n`);

  const spellLevel = obj.values[0] ?? 1;

  // Apply up to 3 spells from values[1], values[2], values[3]
  for (let i = 1; i <= 3; i++) {
    const spellId = obj.values[i];
    if (spellId && spellId > 0) {
      castSpell(ch, spellId, spellLevel, ch);
    }
  }

  // Destroy potion
  const idx = ch.inventory.indexOf(obj);
  if (idx !== -1) {
    ch.inventory.splice(idx, 1);
  }

  ch.wait += 12; // 3 seconds lag
}

// =============================================================================
// Command: recite
// =============================================================================

/**
 * Recite a scroll – apply up to 3 spell effects.
 * Scroll: itemType = Scroll, values[0] = spell level,
 * values[1..3] = spell IDs (up to 3 spells)
 * Syntax: recite <scroll> [target]
 */
function cmdRecite(ch: Character, argument: string): void {
  if (!argument || argument.trim() === '') {
    ch.sendToChar("Recite what?\r\n");
    return;
  }

  const [scrollName, targetArg] = oneArgument(argument);

  // Find scroll in inventory
  let obj: GameObject | null = null;
  for (const item of ch.inventory) {
    const o = item as GameObject;
    if (o && o.itemType === ItemType.Scroll) {
      if (isNamePrefix(scrollName, o.name) ||
          (o.keywords && isNamePrefix(scrollName, o.keywords.join(' ')))) {
        obj = o;
        break;
      }
    }
  }

  if (!obj) {
    ch.sendToChar("You don't have that scroll.\r\n");
    return;
  }

  // Skill check for recite (percentage chance based on intelligence)
  if (ch instanceof Player) {
    const chance = 70 + ch.getStat('int') * 2;
    if (numberPercent() > chance) {
      ch.sendToChar("You mangle the recitation.\r\n");
      // Destroy scroll on failure
      const idx = ch.inventory.indexOf(obj);
      if (idx !== -1) ch.inventory.splice(idx, 1);
      return;
    }
  }

  ch.sendToChar(`You recite ${obj.shortDescription || obj.name}.\r\n`);

  const spellLevel = obj.values[0] ?? 1;

  // Determine target
  let target: Character | GameObject | null = ch;
  if (targetArg && targetArg.trim() !== '') {
    const room = ch.inRoom as Room | null;
    if (room && room.characters) {
      for (const victim of room.characters) {
        if (isNamePrefix(targetArg.trim(), victim.name)) {
          target = victim;
          break;
        }
      }
    }
  }

  // Apply up to 3 spells
  for (let i = 1; i <= 3; i++) {
    const spellId = obj.values[i];
    if (spellId && spellId > 0) {
      castSpell(ch, spellId, spellLevel, target);
    }
  }

  // Destroy scroll
  const idx = ch.inventory.indexOf(obj);
  if (idx !== -1) {
    ch.inventory.splice(idx, 1);
  }

  ch.wait += 12; // 3 seconds lag
}

// =============================================================================
// Command: practice
// =============================================================================

/**
 * Practice a spell/skill at a trainer.
 * With no argument: list all available spells/skills.
 * With argument: practice the named spell (costs 1 practice session).
 *
 * Syntax: practice [spell]
 */
function cmdPractice(ch: Character, argument: string): void {
  if (!(ch instanceof Player)) {
    ch.sendToChar("NPCs don't practice.\r\n");
    return;
  }

  // Check if at a trainer (mobile with ACT_PRACTICE flag in room)
  // For simplicity, we check if there's any NPC in the room
  const room = ch.inRoom as Room | null;
  const hasMob = room && room.characters && room.characters.some(
    (c: Character) => c.isNpc,
  );

  if (!argument || argument.trim() === '') {
    // List known spells
    const lines: string[] = ['You know the following spells:\r\n'];
    const allSpells = getAllSpells();
    for (const spell of allSpells) {
      const learned = ch.pcData.learned.get(spell.id);
      if (learned !== undefined && learned > 0) {
        lines.push(`  ${spell.name.padEnd(25)} ${learned}%\r\n`);
      }
    }
    if (lines.length === 1) {
      lines.push("  (none)\r\n");
    }

    // Show practice sessions remaining
    const practices = (ch.pcData as unknown as { practices?: number }).practices ?? 0;
    lines.push(`\r\nYou have ${practices} practice sessions remaining.\r\n`);

    ch.sendToChar(lines.join(''));
    return;
  }

  if (!hasMob) {
    ch.sendToChar("You need to find a trainer to practice.\r\n");
    return;
  }

  // Practice specific spell
  const spell = findSpell(argument.trim());
  if (!spell) {
    ch.sendToChar("You can't practice that.\r\n");
    return;
  }

  // Check if player has practice sessions
  const pcDataAny = ch.pcData as unknown as { practices?: number };
  const practices = pcDataAny.practices ?? 0;
  if (practices <= 0) {
    ch.sendToChar("You have no practice sessions left.\r\n");
    return;
  }

  // Check current proficiency
  const current = ch.pcData.learned.get(spell.id) ?? 0;

  // Adept percentage (cap) based on class: 75-95%
  const adept = 75 + Math.floor(ch.getStat('wis') / 2);
  const clampedAdept = Math.min(95, adept);

  if (current >= clampedAdept) {
    ch.sendToChar(`You are already as good as you can get at ${spell.name}.\r\n`);
    return;
  }

  // Consume practice session
  pcDataAny.practices = practices - 1;

  // Improve: int_app learn rate (5-25%)
  const intLearn = Math.max(5, Math.min(25, 5 + Math.floor(ch.getStat('int') / 3)));
  const newLevel = Math.min(clampedAdept, current + intLearn);
  ch.pcData.learned.set(spell.id, newLevel);

  ch.sendToChar(
    newLevel >= clampedAdept
      ? `You are now learned at ${spell.name}.\r\n`
      : `You practice ${spell.name}. (${newLevel}%)\r\n`,
  );
}

// =============================================================================
// Registration
// =============================================================================

/** Register all magic-related commands with the command registry. */
export function registerMagicCommands(registry: CommandRegistry): void {
  registry.register({
    name: 'cast',
    handler: cmdCast,
    minPosition: Position.Fighting,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'brandish',
    handler: cmdBrandish,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'zap',
    handler: cmdZap,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'quaff',
    handler: cmdQuaff,
    minPosition: Position.Resting,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'recite',
    handler: cmdRecite,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'practice',
    handler: cmdPractice,
    minPosition: Position.Sleeping,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  logger.info('commands', 'Registered magic commands: cast, brandish, zap, quaff, recite, practice');
}
