/**
 * combat.ts – Combat command handlers for SMAUG 2.0.
 *
 * Implements kill, murder, wimpy, rescue, kick, bash, trip, backstab,
 * circle, disarm, gouge, bite, claw, tail, stun, and registration.
 *
 * All combat commands delegate to CombatEngine for damage resolution.
 */

import type { Character } from '../entities/Character.js';
import { Player } from '../entities/Player.js';
import { GameObject } from '../entities/GameObject.js';
import { Room } from '../entities/Room.js';
import { Position, WearLocation, DamageType, AFF } from '../entities/types.js';
import { CombatEngine } from '../combat/CombatEngine.js';
import { numberPercent, numberRange, rollDice } from '../../utils/Dice.js';
import { isName } from '../../utils/StringUtils.js';
import {
  CommandRegistry,
  type CommandDef,
  defaultCommandFlags,
  CommandLogLevel,
} from './CommandRegistry.js';

// =============================================================================
// Module-level combat engine reference
// =============================================================================

let combatEngine: CombatEngine | null = null;

/** Inject the CombatEngine reference. Called during bootstrap. */
export function setCombatEngine(engine: CombatEngine): void {
  combatEngine = engine;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find a character in the same room by name/keyword.
 * Supports "N.keyword" prefix matching.
 */
function findCharInRoom(ch: Character, arg: string): Character | null {
  const room = ch.inRoom as Room | null;
  if (!room) return null;

  const trimmed = arg.trim().toLowerCase();
  if (!trimmed) return null;

  // Parse N.keyword
  let count = 0;
  let keyword = trimmed;
  const dotIdx = trimmed.indexOf('.');
  if (dotIdx > 0) {
    const numStr = trimmed.slice(0, dotIdx);
    const parsed = parseInt(numStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      count = parsed;
      keyword = trimmed.slice(dotIdx + 1);
    }
  }

  let found = 0;
  for (const target of room.characters) {
    if (target === ch) continue;
    const nameMatch = isName(keyword, target.name.toLowerCase()) ||
                      target.keywords.some(kw => kw.toLowerCase().startsWith(keyword));
    if (nameMatch) {
      found++;
      if (count === 0 || found === count) {
        return target;
      }
    }
  }
  return null;
}

function getEngine(): CombatEngine {
  if (!combatEngine) {
    throw new Error('CombatEngine not initialized. Call setCombatEngine() first.');
  }
  return combatEngine;
}

// =============================================================================
// Kill
// =============================================================================

export function doKill(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar("Kill whom?\r\n");
    return;
  }

  const victim = findCharInRoom(ch, arg);
  if (!victim) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  if (victim === ch) {
    ch.sendToChar("Suicide is a mortal sin.\r\n");
    return;
  }

  // Kill only works on NPCs
  if (victim instanceof Player) {
    ch.sendToChar("You must MURDER players.\r\n");
    return;
  }

  if (ch.fighting) {
    ch.sendToChar("You are already fighting!\r\n");
    return;
  }

  const engine = getEngine();
  engine.startCombat(ch, victim);
  engine.multiHit(ch, victim, null);
}

// =============================================================================
// Murder
// =============================================================================

export function doMurder(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar("Murder whom?\r\n");
    return;
  }

  const victim = findCharInRoom(ch, arg);
  if (!victim) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  if (victim === ch) {
    ch.sendToChar("Suicide is a mortal sin.\r\n");
    return;
  }

  if (ch.fighting) {
    ch.sendToChar("You are already fighting!\r\n");
    return;
  }

  const engine = getEngine();
  engine.startCombat(ch, victim);
  engine.multiHit(ch, victim, null);
}

// =============================================================================
// Wimpy
// =============================================================================

export function doWimpy(ch: Character, argument: string): void {
  if (!(ch instanceof Player)) return;

  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar(`Your current wimpy is ${ch.wimpy} hit points.\r\n`);
    return;
  }

  const wimpy = parseInt(arg, 10);
  if (isNaN(wimpy) || wimpy < 0) {
    ch.sendToChar("Wimpy must be a positive number.\r\n");
    return;
  }

  const maxWimpy = Math.floor(ch.maxHit / 2);
  if (wimpy > maxWimpy) {
    ch.sendToChar(`Your wimpy cannot exceed ${maxWimpy} hit points.\r\n`);
    return;
  }

  ch.wimpy = wimpy;
  ch.sendToChar(`Wimpy set to ${wimpy} hit points.\r\n`);
}

// =============================================================================
// Rescue
// =============================================================================

export function doRescue(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar("Rescue whom?\r\n");
    return;
  }

  const victim = findCharInRoom(ch, arg);
  if (!victim) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  if (victim === ch) {
    ch.sendToChar("What about fleeing instead?\r\n");
    return;
  }

  if (!ch.fighting) {
    ch.sendToChar("You're not fighting anyone.\r\n");
    return;
  }

  if (!victim.fighting) {
    ch.sendToChar("They're not fighting anyone.\r\n");
    return;
  }

  // Skill check (base 50% chance)
  if (numberPercent() > 50 + ch.level - victim.level) {
    ch.sendToChar("You fail the rescue.\r\n");
    return;
  }

  // Swap targets
  const attacker = victim.fighting;
  if (attacker) {
    attacker.fighting = ch;
    ch.fighting = attacker;
    victim.fighting = null;
    if (victim.position === Position.Fighting) {
      victim.position = Position.Standing;
    }
  }

  ch.sendToChar(`You rescue ${victim.name}!\r\n`);
  victim.sendToChar(`${ch.name} rescues you!\r\n`);

  // Room message
  const room = ch.inRoom as Room | null;
  if (room) {
    for (const bystander of room.characters) {
      if (bystander !== ch && bystander !== victim) {
        bystander.sendToChar(`${ch.name} rescues ${victim.name}!\r\n`);
      }
    }
  }
}

// =============================================================================
// Kick
// =============================================================================

export function doKick(ch: Character, argument: string): void {
  const arg = argument.trim();
  const victim = arg ? findCharInRoom(ch, arg) : ch.fighting;

  if (!victim) {
    ch.sendToChar("Kick whom?\r\n");
    return;
  }

  if (victim === ch) {
    ch.sendToChar("You kick yourself. Ouch!\r\n");
    return;
  }

  // Skill check (level-based chance)
  if (numberPercent() > 50 + ch.level) {
    ch.sendToChar("Your kick misses.\r\n");
    ch.wait = 12; // 1 round lag
    return;
  }

  const engine = getEngine();
  const damage = numberRange(1, ch.level);
  engine.inflictDamage(ch, victim, damage, DamageType.Hit);
  ch.wait = 12;

  if (!ch.fighting) {
    engine.startCombat(ch, victim);
  }
}

// =============================================================================
// Bash
// =============================================================================

export function doBash(ch: Character, argument: string): void {
  const arg = argument.trim();
  const victim = arg ? findCharInRoom(ch, arg) : ch.fighting;

  if (!victim) {
    ch.sendToChar("Bash whom?\r\n");
    return;
  }

  if (victim === ch) {
    ch.sendToChar("You bash yourself. Brilliant.\r\n");
    return;
  }

  // Skill check
  if (numberPercent() > 50 + ch.level) {
    ch.sendToChar("You fall flat on your face!\r\n");
    ch.position = Position.Sitting;
    ch.wait = 24; // 2 round lag on fail
    return;
  }

  const engine = getEngine();
  const damage = ch.level + rollDice(1, 4);
  engine.inflictDamage(ch, victim, damage, DamageType.Hit);

  // Stun victim
  victim.position = Position.Stunned;
  victim.wait = numberRange(12, 24);

  ch.wait = 12;

  if (!ch.fighting) {
    engine.startCombat(ch, victim);
  }
}

// =============================================================================
// Trip
// =============================================================================

export function doTrip(ch: Character, argument: string): void {
  const arg = argument.trim();
  const victim = arg ? findCharInRoom(ch, arg) : ch.fighting;

  if (!victim) {
    ch.sendToChar("Trip whom?\r\n");
    return;
  }

  if (victim === ch) {
    ch.sendToChar("You trip over your own feet!\r\n");
    return;
  }

  // Skill check
  if (numberPercent() > 50 + ch.level) {
    ch.sendToChar("You fail to trip them.\r\n");
    ch.wait = 12;
    return;
  }

  victim.position = Position.Sitting;
  victim.wait = 12;

  ch.sendToChar(`You trip ${victim.name} and they go down!\r\n`);
  victim.sendToChar(`${ch.name} trips you and you go down!\r\n`);

  ch.wait = 12;

  const engine = getEngine();
  if (!ch.fighting) {
    engine.startCombat(ch, victim);
  }
}

// =============================================================================
// Backstab
// =============================================================================

export function doBackstab(ch: Character, argument: string): void {
  const arg = argument.trim();
  if (!arg) {
    ch.sendToChar("Backstab whom?\r\n");
    return;
  }

  const victim = findCharInRoom(ch, arg);
  if (!victim) {
    ch.sendToChar("They aren't here.\r\n");
    return;
  }

  if (victim === ch) {
    ch.sendToChar("How can you backstab yourself?\r\n");
    return;
  }

  if (ch.fighting) {
    ch.sendToChar("You're too busy fighting!\r\n");
    return;
  }

  if (victim.fighting) {
    ch.sendToChar("You can't backstab someone who is fighting.\r\n");
    return;
  }

  // Requires a wielded weapon with piercing damage type
  const weapon = ch.equipment.get(WearLocation.Wield) as GameObject | undefined;
  if (!weapon) {
    ch.sendToChar("You need a weapon to backstab.\r\n");
    return;
  }

  const weaponDamType = (weapon.values[3] ?? DamageType.Slash) as DamageType;
  if (weaponDamType !== DamageType.Pierce && weaponDamType !== DamageType.Stab) {
    ch.sendToChar("You need a piercing weapon to backstab.\r\n");
    return;
  }

  const engine = getEngine();

  // Skill check
  if (numberPercent() > 50 + ch.level) {
    ch.sendToChar("You fail to backstab.\r\n");
    engine.startCombat(ch, victim);
    ch.wait = 24;
    return;
  }

  // Calculate multiplier based on level
  let multiplier: number;
  if (ch.level < 10) multiplier = 2;
  else if (ch.level < 20) multiplier = 3;
  else if (ch.level < 30) multiplier = 4;
  else multiplier = 5;

  // Calculate damage
  const numDice = weapon.values[1] ?? 1;
  const sizeDice = weapon.values[2] ?? 4;
  const baseDamage = rollDice(numDice, sizeDice) + ch.damroll;
  const damage = baseDamage * multiplier;

  ch.sendToChar(`You backstab ${victim.name}!\r\n`);
  victim.sendToChar(`${ch.name} backstabs you!\r\n`);

  engine.inflictDamage(ch, victim, damage, DamageType.Pierce);
  engine.startCombat(ch, victim);
  ch.wait = 24;
}

// =============================================================================
// Circle
// =============================================================================

export function doCircle(ch: Character, _argument: string): void {
  if (!ch.fighting) {
    ch.sendToChar("You must be fighting to circle.\r\n");
    return;
  }

  const victim = ch.fighting;

  // Check someone else is tanking
  if (victim.fighting === ch) {
    ch.sendToChar("You can't circle when you're the tank!\r\n");
    return;
  }

  // Requires a wielded weapon with piercing damage type
  const weapon = ch.equipment.get(WearLocation.Wield) as GameObject | undefined;
  if (!weapon) {
    ch.sendToChar("You need a weapon to circle.\r\n");
    return;
  }

  const weaponDamType = (weapon.values[3] ?? DamageType.Slash) as DamageType;
  if (weaponDamType !== DamageType.Pierce && weaponDamType !== DamageType.Stab) {
    ch.sendToChar("You need a piercing weapon to circle.\r\n");
    return;
  }

  // Skill check
  if (numberPercent() > 50 + ch.level) {
    ch.sendToChar("You fail to circle behind them.\r\n");
    ch.wait = 24;
    return;
  }

  const multiplier = 2;
  const numDice = weapon.values[1] ?? 1;
  const sizeDice = weapon.values[2] ?? 4;
  const baseDamage = rollDice(numDice, sizeDice) + ch.damroll;
  const damage = baseDamage * multiplier;

  ch.sendToChar(`You circle around and stab ${victim.name}!\r\n`);
  victim.sendToChar(`${ch.name} circles around and stabs you!\r\n`);

  const engine = getEngine();
  engine.inflictDamage(ch, victim, damage, DamageType.Pierce);
  ch.wait = 24;
}

// =============================================================================
// Disarm
// =============================================================================

export function doDisarm(ch: Character, _argument: string): void {
  const victim = ch.fighting;
  if (!victim) {
    ch.sendToChar("You aren't fighting anyone.\r\n");
    return;
  }

  const victimWeapon = victim.equipment.get(WearLocation.Wield) as GameObject | undefined;
  if (!victimWeapon) {
    ch.sendToChar("Your opponent is not wielding a weapon.\r\n");
    return;
  }

  // Must be wielding a weapon yourself
  if (!ch.equipment.get(WearLocation.Wield)) {
    ch.sendToChar("You must wield a weapon to disarm.\r\n");
    return;
  }

  // Skill check modified by level difference and weapon weight
  let chance = 50 + (ch.level - victim.level) * 2 - victimWeapon.weight;
  chance = Math.max(5, Math.min(95, chance));

  if (numberPercent() > chance) {
    ch.sendToChar("You fail to disarm.\r\n");
    ch.wait = 12;
    return;
  }

  // Disarm! Remove weapon from victim and drop to room
  victim.equipment.set(WearLocation.Wield, undefined);
  victimWeapon.wearLocation = WearLocation.None;
  victimWeapon.carriedBy = null;

  const room = victim.inRoom as Room | null;
  if (room) {
    room.contents.push(victimWeapon);
    victimWeapon.inRoom = room;
  }

  ch.sendToChar(`You disarm ${victim.name}!\r\n`);
  victim.sendToChar(`${ch.name} disarms you!\r\n`);

  // Room message
  if (room) {
    for (const bystander of room.characters) {
      if (bystander !== ch && bystander !== victim) {
        bystander.sendToChar(`${ch.name} disarms ${victim.name}!\r\n`);
      }
    }
  }

  ch.wait = 12;
}

// =============================================================================
// Gouge
// =============================================================================

export function doGouge(ch: Character, _argument: string): void {
  const victim = ch.fighting;
  if (!victim) {
    ch.sendToChar("You aren't fighting anyone.\r\n");
    return;
  }

  // Skill check
  if (numberPercent() > 50 + ch.level) {
    ch.sendToChar("You fail to gouge their eyes.\r\n");
    ch.wait = 12;
    return;
  }

  ch.sendToChar(`You gouge ${victim.name}'s eyes!\r\n`);
  victim.sendToChar(`${ch.name} gouges your eyes!\r\n`);

  // Apply AFF.BLIND for 1-2 ticks via affectedBy bitvector
  victim.affectedBy = victim.affectedBy | AFF.BLIND;

  ch.wait = 12;
}

// =============================================================================
// Bite (vampire racial attack)
// =============================================================================

export function doBite(ch: Character, argument: string): void {
  const arg = argument.trim();
  const victim = arg ? findCharInRoom(ch, arg) : ch.fighting;

  if (!victim) {
    ch.sendToChar("Bite whom?\r\n");
    return;
  }

  const damage = ch.level + rollDice(1, 6);
  const drain = Math.floor(damage / 4);

  const engine = getEngine();
  engine.inflictDamage(ch, victim, damage, DamageType.Bite);

  // Drain life
  ch.hit = Math.min(ch.maxHit, ch.hit + drain);
  ch.sendToChar(`You bite ${victim.name} and drain their life force!\r\n`);
  ch.wait = 12;

  if (!ch.fighting && victim.hit > 0) {
    engine.startCombat(ch, victim);
  }
}

// =============================================================================
// Claw (racial attack)
// =============================================================================

export function doClaw(ch: Character, argument: string): void {
  const arg = argument.trim();
  const victim = arg ? findCharInRoom(ch, arg) : ch.fighting;

  if (!victim) {
    ch.sendToChar("Claw whom?\r\n");
    return;
  }

  const damage = ch.level + rollDice(2, 4);
  const engine = getEngine();
  engine.inflictDamage(ch, victim, damage, DamageType.Claw);
  ch.wait = 12;

  if (!ch.fighting && victim.hit > 0) {
    engine.startCombat(ch, victim);
  }
}

// =============================================================================
// Tail (racial attack)
// =============================================================================

export function doTail(ch: Character, argument: string): void {
  const arg = argument.trim();
  const victim = arg ? findCharInRoom(ch, arg) : ch.fighting;

  if (!victim) {
    ch.sendToChar("Tail whom?\r\n");
    return;
  }

  const damage = ch.level + rollDice(1, 8);
  const engine = getEngine();
  engine.inflictDamage(ch, victim, damage, DamageType.Hit);
  ch.wait = 12;

  if (!ch.fighting && victim.hit > 0) {
    engine.startCombat(ch, victim);
  }
}

// =============================================================================
// Stun (monk skill)
// =============================================================================

export function doStun(ch: Character, _argument: string): void {
  const victim = ch.fighting;
  if (!victim) {
    ch.sendToChar("You aren't fighting anyone.\r\n");
    return;
  }

  // Skill check
  if (numberPercent() > 50 + ch.level) {
    ch.sendToChar("You fail to stun them.\r\n");
    ch.wait = 24;
    return;
  }

  victim.position = Position.Stunned;
  victim.wait = 12;

  ch.sendToChar(`You stun ${victim.name}!\r\n`);
  victim.sendToChar(`${ch.name} stuns you!\r\n`);
  ch.wait = 24;
}

// =============================================================================
// Registration
// =============================================================================

/** Register all combat-related commands with the command registry. */
// TODO PARITY: Missing combat commands — berserk, bloodlet, cleave, draw, poison_weapon, pounce, slice
export function registerCombatCommands(registry: CommandRegistry): void {
  const combatCommands: Omit<CommandDef, 'useCount' | 'lagCount' | 'flags'>[] = [
    { name: 'kill',     handler: doKill,     minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'murder',   handler: doMurder,   minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Always },
    { name: 'wimpy',    handler: doWimpy,    minPosition: Position.Dead,     minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'rescue',   handler: doRescue,   minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'kick',     handler: doKick,     minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'bash',     handler: doBash,     minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'trip',     handler: doTrip,     minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'backstab', handler: doBackstab, minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'circle',   handler: doCircle,   minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'disarm',   handler: doDisarm,   minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'gouge',    handler: doGouge,    minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'bite',     handler: doBite,     minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'claw',     handler: doClaw,     minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'tail',     handler: doTail,     minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'stun',     handler: doStun,     minPosition: Position.Fighting, minTrust: 0, logLevel: CommandLogLevel.Normal },
  ];

  for (const cmd of combatCommands) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
