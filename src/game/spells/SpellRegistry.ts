/**
 * SpellRegistry – Registry of all spells and skills.
 *
 * Maps spell IDs to their definitions including name, level requirements
 * per class, mana cost, target type, damage type, saving throw,
 * components, and handler function reference.
 *
 * Contains 40+ spell definitions covering offensive, healing, buff,
 * debuff, and utility categories.
 */

import type { Character } from '../entities/Character.js';
import type { GameObject } from '../entities/GameObject.js';
import {
  TargetType,
  CharClass,
  DamageType,
  SaveType,
  ApplyType,
  AFF,
  Position,
  ItemType,
  ROOM_FLAGS,
  SectorType,
} from '../entities/types.js';
import { Affect } from '../entities/Affect.js';
import { SPELL } from '../affects/AffectRegistry.js';
import { rollDice, numberPercent } from '../../utils/Dice.js';
import { savingThrow } from './SavingThrows.js';
// Logger available if needed for spell debugging

// =============================================================================
// Spell Function Type
// =============================================================================

/** Spell handler function signature. */
export type SpellFunction = (
  level: number,
  ch: Character,
  target: Character | GameObject | null,
) => void;

// =============================================================================
// Spell Definition Interface
// =============================================================================

export interface SpellDefinition {
  /** Spell number (matches legacy sn). */
  id: number;
  /** Human-readable name. */
  name: string;
  /** Minimum level per class to learn. 0 = can't learn. */
  minLevel: Map<CharClass, number>;
  /** Target type. */
  target: TargetType;
  /** Minimum mana cost (at high level). */
  minMana: number;
  /** Maximum mana cost (at level 1). */
  maxMana: number;
  /** Command lag in pulses (beats). */
  beats: number;
  /** Damage type for offensive spells. */
  damageType: DamageType;
  /** Saving throw type. */
  savingThrow: SaveType;
  /** Required component item keywords. */
  components: string[];
  /** The spell handler function. */
  spellFun: SpellFunction;
  /** Restricted to guild/class (null = any). */
  guild: CharClass | null;
  /** Spell flags (bigint bitvector). */
  flags: bigint;
}

// =============================================================================
// Spell ID Constants (for spells that don't have SPELL.X in AffectRegistry)
// =============================================================================

/** Extended spell IDs beyond what AffectRegistry defines. */
export const SPELL_ID = {
  // Already defined in SPELL:
  ...SPELL,
  // Offensive spells
  MAGIC_MISSILE:    100,
  CHILL_TOUCH:      SPELL.CHILL_TOUCH,  // 5
  BURNING_HANDS:    101,
  SHOCKING_GRASP:   102,
  COLOUR_SPRAY:     103,
  LIGHTNING_BOLT:   104,
  FIREBALL:         105,
  ACID_BLAST:       106,
  CHAIN_LIGHTNING:  107,
  METEOR_SWARM:     108,
  // Healing spells
  CURE_LIGHT:       110,
  CURE_SERIOUS:     111,
  CURE_CRITICAL:    112,
  HEAL:             113,
  CURE_BLINDNESS:   114,
  CURE_POISON:      115,
  REMOVE_CURSE:     116,
  // Utility spells
  IDENTIFY:         120,
  LOCATE_OBJECT:    121,
  TELEPORT:         122,
  SUMMON:           123,
  GATE:             124,
  WORD_OF_RECALL:   125,
  CREATE_FOOD:      126,
  CREATE_WATER:     127,
  CREATE_SPRING:    128,
  CONTINUAL_LIGHT:  129,
  ENCHANT_WEAPON:   130,
  ENCHANT_ARMOR:    131,
  DISPEL_MAGIC:     132,
  EARTHQUAKE:       133,
  CALL_LIGHTNING:   134,
} as const;

// =============================================================================
// Helper: make minLevel map
// =============================================================================

function levels(mage: number, cleric: number, thief = 0, warrior = 0): Map<CharClass, number> {
  const m = new Map<CharClass, number>();
  if (mage > 0) m.set(CharClass.Mage, mage);
  if (cleric > 0) m.set(CharClass.Cleric, cleric);
  if (thief > 0) m.set(CharClass.Thief, thief);
  if (warrior > 0) m.set(CharClass.Warrior, warrior);
  return m;
}

// =============================================================================
// Spell Functions – Offensive
// =============================================================================

function spellDamage(
  level: number,
  ch: Character,
  victim: Character,
  numDice: number,
  sizeDice: number,
  bonus: number,
  saveType: SaveType,
  _damType: DamageType,
): void {
  let dam = rollDice(numDice, sizeDice) + bonus;
  if (savingThrow(level, victim, saveType)) {
    dam = Math.floor(dam / 2);
  }
  // Apply damage directly to victim
  victim.hit -= dam;
  victim.updatePosition();
  ch.sendToChar(`Your spell hits ${victim.name} for ${dam} damage!\r\n`);
  victim.sendToChar(`${ch.name}'s spell hits you for ${dam} damage!\r\n`);
}

function spellMagicMissile(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, Math.floor(level / 2));
  spellDamage(level, ch, victim, numDice, 4, Math.floor(level / 2), SaveType.SpellStaff, DamageType.Bolt);
}

function spellChillTouch(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, Math.floor(level / 2));
  spellDamage(level, ch, victim, numDice, 6, level, SaveType.SpellStaff, DamageType.Blast);
}

function spellBurningHands(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, Math.floor(level / 3));
  spellDamage(level, ch, victim, numDice, 8, level, SaveType.SpellStaff, DamageType.Blast);
}

function spellShockingGrasp(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, Math.floor(level / 2));
  spellDamage(level, ch, victim, numDice, 8, level, SaveType.SpellStaff, DamageType.Bolt);
}

function spellColourSpray(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, Math.floor(level / 2));
  spellDamage(level, ch, victim, numDice, 10, level, SaveType.SpellStaff, DamageType.Blast);
}

function spellLightningBolt(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, Math.floor(level / 2));
  spellDamage(level, ch, victim, numDice, 12, level, SaveType.SpellStaff, DamageType.Bolt);
}

function spellFireball(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, level);
  spellDamage(level, ch, victim, numDice, 6, level, SaveType.SpellStaff, DamageType.Blast);
}

function spellAcidBlast(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, level);
  spellDamage(level, ch, victim, numDice, 8, level, SaveType.SpellStaff, DamageType.Slash);
}

function spellChainLightning(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, level);
  spellDamage(level, ch, victim, numDice, 10, level, SaveType.SpellStaff, DamageType.Bolt);
}

function spellMeteorSwarm(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  const numDice = Math.max(1, level);
  spellDamage(level, ch, victim, numDice, 12, level * 2, SaveType.SpellStaff, DamageType.Blast);
}

// =============================================================================
// Spell Functions – Healing
// =============================================================================

function spellCureLight(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  const heal = rollDice(1, 8) + Math.floor(level / 3);
  victim.hit = Math.min(victim.hit + heal, victim.maxHit);
  victim.sendToChar('You feel a little better!\r\n');
  if (victim !== ch) {
    ch.sendToChar(`You heal ${victim.name}.\r\n`);
  }
}

function spellCureSerious(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  const heal = rollDice(2, 8) + Math.floor(level / 2);
  victim.hit = Math.min(victim.hit + heal, victim.maxHit);
  victim.sendToChar('You feel better!\r\n');
  if (victim !== ch) {
    ch.sendToChar(`You heal ${victim.name}.\r\n`);
  }
}

function spellCureCritical(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  const heal = rollDice(3, 8) + level;
  victim.hit = Math.min(victim.hit + heal, victim.maxHit);
  victim.sendToChar('You feel much better!\r\n');
  if (victim !== ch) {
    ch.sendToChar(`You heal ${victim.name}.\r\n`);
  }
}

function spellHeal(_level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  const heal = 100;
  victim.hit = Math.min(victim.hit + heal, victim.maxHit);
  victim.sendToChar('A warm feeling fills your body.\r\n');
  if (victim !== ch) {
    ch.sendToChar(`You heal ${victim.name}.\r\n`);
  }
}

function spellCureBlindness(_level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (!victim.isAffected(AFF.BLIND)) {
    if (victim === ch) {
      ch.sendToChar("You aren't blind.\r\n");
    } else {
      ch.sendToChar(`${victim.name} isn't blind.\r\n`);
    }
    return;
  }
  victim.stripAffect(SPELL.BLINDNESS);
  victim.affectedBy &= ~AFF.BLIND;
  victim.sendToChar('Your vision returns!\r\n');
  if (victim !== ch) {
    ch.sendToChar(`You restore ${victim.name}'s sight.\r\n`);
  }
}

function spellCurePoison(_level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (!victim.isAffected(AFF.POISON)) {
    if (victim === ch) {
      ch.sendToChar("You aren't poisoned.\r\n");
    } else {
      ch.sendToChar(`${victim.name} isn't poisoned.\r\n`);
    }
    return;
  }
  victim.stripAffect(SPELL.POISON);
  victim.affectedBy &= ~AFF.POISON;
  victim.sendToChar('A warm feeling runs through your body.\r\n');
  if (victim !== ch) {
    ch.sendToChar(`You cure ${victim.name}'s poison.\r\n`);
  }
}

function spellRemoveCurse(_level: number, ch: Character, target: Character | GameObject | null): void {
  // Can target character or object
  if (target && typeof (target as Character).sendToChar === 'function') {
    const victim = target as Character;
    if (!victim.isAffected(AFF.CURSE)) {
      if (victim === ch) {
        ch.sendToChar("You aren't cursed.\r\n");
      } else {
        ch.sendToChar(`${victim.name} isn't cursed.\r\n`);
      }
      return;
    }
    victim.stripAffect(SPELL.CURSE);
    victim.affectedBy &= ~AFF.CURSE;
    victim.sendToChar('You feel the curse lifted.\r\n');
    if (victim !== ch) {
      ch.sendToChar(`You remove the curse on ${victim.name}.\r\n`);
    }
  }
}

// =============================================================================
// Spell Functions – Buffs
// =============================================================================

function spellArmor(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.affects.some(a => a.type === SPELL.ARMOR)) {
    ch.sendToChar("They are already armored.\r\n");
    return;
  }
  const dur = Math.max(1, 24 - Math.floor(level / 2));
  const aff = new Affect(SPELL.ARMOR, dur, ApplyType.AC, -20);
  victim.applyAffect(aff);
  victim.sendToChar('You feel someone protecting you.\r\n');
  if (victim !== ch) ch.sendToChar(`You cast armor on ${victim.name}.\r\n`);
}

function spellBless(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.affects.some(a => a.type === SPELL.BLESS)) {
    ch.sendToChar("They are already blessed.\r\n");
    return;
  }
  const dur = 12 + Math.floor(level / 4);
  const aff1 = new Affect(SPELL.BLESS, dur, ApplyType.Hitroll, 1);
  const aff2 = new Affect(SPELL.BLESS, dur, ApplyType.SavingSpell, -1);
  victim.applyAffect(aff1);
  victim.applyAffect(aff2);
  victim.sendToChar('You feel righteous.\r\n');
  if (victim !== ch) ch.sendToChar(`You bless ${victim.name}.\r\n`);
}

function spellGiantStrength(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.affects.some(a => a.type === SPELL.GIANT_STRENGTH)) {
    ch.sendToChar("They are already empowered.\r\n");
    return;
  }
  const dur = level + 10;
  let mod = 1;
  if (level >= 20) mod = 2;
  if (level >= 40) mod = 3;
  const aff = new Affect(SPELL.GIANT_STRENGTH, dur, ApplyType.Str, mod);
  victim.applyAffect(aff);
  victim.sendToChar('Your muscles surge with heightened power!\r\n');
  if (victim !== ch) ch.sendToChar(`You empower ${victim.name} with giant strength.\r\n`);
}

function spellFly(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.FLYING)) {
    ch.sendToChar("They are already flying.\r\n");
    return;
  }
  const dur = level + 10;
  const aff = new Affect(SPELL.FLY, dur, ApplyType.None, 0, AFF.FLYING);
  victim.applyAffect(aff);
  victim.sendToChar('Your feet rise off the ground.\r\n');
  if (victim !== ch) ch.sendToChar(`${victim.name} rises off the ground.\r\n`);
}

function spellInvisibility(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.INVISIBLE)) {
    ch.sendToChar("They are already invisible.\r\n");
    return;
  }
  const dur = 24 + Math.floor(level / 2);
  const aff = new Affect(SPELL.INVIS, dur, ApplyType.None, 0, AFF.INVISIBLE);
  victim.applyAffect(aff);
  victim.sendToChar('You fade out of existence.\r\n');
  if (victim !== ch) ch.sendToChar(`${victim.name} fades out of existence.\r\n`);
}

function spellDetectInvis(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.DETECT_INVIS)) {
    ch.sendToChar("They can already see invisible.\r\n");
    return;
  }
  const dur = 24 + Math.floor(level / 2);
  const aff = new Affect(SPELL.DETECT_INVIS, dur, ApplyType.None, 0, AFF.DETECT_INVIS);
  victim.applyAffect(aff);
  victim.sendToChar('Your eyes tingle.\r\n');
  if (victim !== ch) ch.sendToChar(`You grant ${victim.name} the ability to see invisible.\r\n`);
}

function spellDetectHidden(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.DETECT_HIDDEN)) {
    ch.sendToChar("They can already detect hidden.\r\n");
    return;
  }
  const dur = 24 + Math.floor(level / 2);
  const aff = new Affect(SPELL.DETECT_HIDDEN, dur, ApplyType.None, 0, AFF.DETECT_HIDDEN);
  victim.applyAffect(aff);
  victim.sendToChar('Your awareness improves.\r\n');
  if (victim !== ch) ch.sendToChar(`You grant ${victim.name} heightened awareness.\r\n`);
}

function spellDetectMagic(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.DETECT_MAGIC)) {
    ch.sendToChar("They can already detect magic.\r\n");
    return;
  }
  const dur = 24 + Math.floor(level / 2);
  const aff = new Affect(SPELL.DETECT_MAGIC, dur, ApplyType.None, 0, AFF.DETECT_MAGIC);
  victim.applyAffect(aff);
  victim.sendToChar('Your eyes tingle.\r\n');
  if (victim !== ch) ch.sendToChar(`You grant ${victim.name} magical sight.\r\n`);
}

function spellSanctuary(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.SANCTUARY)) {
    ch.sendToChar("They are already in sanctuary.\r\n");
    return;
  }
  const dur = Math.max(1, Math.floor(level / 6) + 1);
  const aff = new Affect(SPELL.SANCTUARY, dur, ApplyType.None, 0, AFF.SANCTUARY);
  victim.applyAffect(aff);
  victim.sendToChar('You are surrounded by a white aura.\r\n');
  if (victim !== ch) ch.sendToChar(`${victim.name} is surrounded by a white aura.\r\n`);
}

function spellHaste(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.affects.some(a => a.type === SPELL.HASTE)) {
    ch.sendToChar("They are already hasted.\r\n");
    return;
  }
  const dur = Math.max(1, Math.floor(level / 4));
  // Use bitvector 0n (haste tracked via affect type, not a bitvector in legacy SMAUG)
  const aff = new Affect(SPELL.HASTE, dur, ApplyType.None, 0);
  victim.applyAffect(aff);
  victim.sendToChar('You feel yourself moving faster.\r\n');
  if (victim !== ch) ch.sendToChar(`${victim.name} starts moving faster.\r\n`);
}

function spellShield(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.affects.some(a => a.type === SPELL.SHIELD)) {
    ch.sendToChar("They are already shielded.\r\n");
    return;
  }
  const dur = 12 + Math.floor(level / 4);
  const aff = new Affect(SPELL.SHIELD, dur, ApplyType.AC, -20);
  victim.applyAffect(aff);
  victim.sendToChar('A force shield shimmers into existence around you.\r\n');
  if (victim !== ch) ch.sendToChar(`A force shield shimmers around ${victim.name}.\r\n`);
}

function spellStoneSkin(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.affects.some(a => a.type === SPELL.STONE_SKIN)) {
    ch.sendToChar("They already have stone skin.\r\n");
    return;
  }
  const dur = Math.max(1, Math.floor(level / 5));
  const aff = new Affect(SPELL.STONE_SKIN, dur, ApplyType.AC, -40);
  victim.applyAffect(aff);
  victim.sendToChar('Your skin turns to stone.\r\n');
  if (victim !== ch) ch.sendToChar(`${victim.name}'s skin turns to stone.\r\n`);
}

function spellProtectEvil(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.PROTECT)) {
    ch.sendToChar("They are already protected.\r\n");
    return;
  }
  const dur = 24;
  void level;
  const aff = new Affect(SPELL.PROTECT_EVIL, dur, ApplyType.None, 0, AFF.PROTECT);
  victim.applyAffect(aff);
  victim.sendToChar('You feel holy protection.\r\n');
  if (victim !== ch) ch.sendToChar(`You grant ${victim.name} holy protection.\r\n`);
}

function spellProtectGood(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.PROTECT)) {
    ch.sendToChar("They are already protected.\r\n");
    return;
  }
  const dur = 24;
  void level;
  const aff = new Affect(SPELL.PROTECT_GOOD, dur, ApplyType.None, 0, AFF.PROTECT);
  victim.applyAffect(aff);
  victim.sendToChar('You feel unholy protection.\r\n');
  if (victim !== ch) ch.sendToChar(`You grant ${victim.name} unholy protection.\r\n`);
}

function spellPassDoor(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.PASS_DOOR)) {
    ch.sendToChar("They can already pass through doors.\r\n");
    return;
  }
  const dur = Math.floor(level / 4) + 8;
  const aff = new Affect(SPELL.PASS_DOOR, dur, ApplyType.None, 0, AFF.PASS_DOOR);
  victim.applyAffect(aff);
  victim.sendToChar('You turn translucent.\r\n');
  if (victim !== ch) ch.sendToChar(`${victim.name} turns translucent.\r\n`);
}

function spellInfravision(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = (target as Character) ?? ch;
  if (victim.isAffected(AFF.INFRARED)) {
    ch.sendToChar("They can already see in the dark.\r\n");
    return;
  }
  const dur = 24 + Math.floor(level / 2);
  const aff = new Affect(SPELL.INFRARED, dur, ApplyType.None, 0, AFF.INFRARED);
  victim.applyAffect(aff);
  victim.sendToChar('Your eyes glow red.\r\n');
  if (victim !== ch) ch.sendToChar(`${victim.name}'s eyes glow red.\r\n`);
}

// =============================================================================
// Spell Functions – Debuffs
// =============================================================================

function spellBlindness(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.isAffected(AFF.BLIND)) {
    ch.sendToChar("They are already blinded.\r\n");
    return;
  }
  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    ch.sendToChar("They resist your blindness spell!\r\n");
    return;
  }
  const dur = 1 + Math.floor(level / 8);
  const aff = new Affect(SPELL.BLINDNESS, dur, ApplyType.Hitroll, -4, AFF.BLIND);
  victim.applyAffect(aff);
  victim.sendToChar('You are blinded!\r\n');
  ch.sendToChar(`You blind ${victim.name}!\r\n`);
}

function spellPoison(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.isAffected(AFF.POISON)) {
    ch.sendToChar("They are already poisoned.\r\n");
    return;
  }
  if (savingThrow(level, victim, SaveType.PoisonDeath)) {
    ch.sendToChar("They resist your poison!\r\n");
    return;
  }
  const dur = Math.max(1, Math.floor(level / 3));
  const aff = new Affect(SPELL.POISON, dur, ApplyType.Str, -2, AFF.POISON);
  victim.applyAffect(aff);
  victim.sendToChar('You feel very sick.\r\n');
  ch.sendToChar(`You poison ${victim.name}!\r\n`);
}

function spellCurse(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.isAffected(AFF.CURSE)) {
    ch.sendToChar("They are already cursed.\r\n");
    return;
  }
  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    ch.sendToChar("They resist your curse!\r\n");
    return;
  }
  const dur = Math.floor(level / 4) + 1;
  const aff1 = new Affect(SPELL.CURSE, dur, ApplyType.Hitroll, -1, AFF.CURSE);
  const aff2 = new Affect(SPELL.CURSE, dur, ApplyType.SavingSpell, 1, AFF.CURSE);
  victim.applyAffect(aff1);
  victim.applyAffect(aff2);
  victim.sendToChar('You feel unclean.\r\n');
  ch.sendToChar(`You curse ${victim.name}!\r\n`);
}

function spellSleep(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.isAffected(AFF.SLEEP)) {
    ch.sendToChar("They are already asleep.\r\n");
    return;
  }
  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    ch.sendToChar("They resist your sleep spell!\r\n");
    return;
  }
  const dur = 4 + Math.floor(level / 10);
  const aff = new Affect(SPELL.SLEEP, dur, ApplyType.None, 0, AFF.SLEEP);
  victim.applyAffect(aff);
  if (victim.position > Position.Sleeping) {
    victim.position = Position.Sleeping;
  }
  victim.sendToChar('You feel very sleepy ..... zzzzzz.\r\n');
  ch.sendToChar(`${victim.name} falls asleep.\r\n`);
}

function spellWeaken(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.affects.some(a => a.type === SPELL.WEAKEN)) {
    ch.sendToChar("They are already weakened.\r\n");
    return;
  }
  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    ch.sendToChar("They resist your weakening spell!\r\n");
    return;
  }
  const dur = Math.floor(level / 4) + 1;
  let mod = -1;
  if (level >= 20) mod = -2;
  if (level >= 40) mod = -3;
  const aff = new Affect(SPELL.WEAKEN, dur, ApplyType.Str, mod);
  victim.applyAffect(aff);
  victim.sendToChar('You feel your strength slip away.\r\n');
  ch.sendToChar(`You weaken ${victim.name}!\r\n`);
}

function spellFaerieFire(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.isAffected(AFF.FAERIE_FIRE)) {
    ch.sendToChar("They are already surrounded by a pink aura.\r\n");
    return;
  }
  const dur = Math.max(1, Math.floor(level / 3));
  const aff = new Affect(SPELL.FAERIE_FIRE, dur, ApplyType.AC, 10, AFF.FAERIE_FIRE);
  victim.applyAffect(aff);
  victim.sendToChar('You are surrounded by a pink outline.\r\n');
  ch.sendToChar(`${victim.name} is surrounded by a pink outline.\r\n`);
}

function spellSlow(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.affects.some(a => a.type === SPELL.SLOW)) {
    ch.sendToChar("They are already slowed.\r\n");
    return;
  }
  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    ch.sendToChar("They resist your slow spell!\r\n");
    return;
  }
  const dur = Math.max(1, Math.floor(level / 6));
  const aff = new Affect(SPELL.SLOW, dur, ApplyType.None, 0);
  victim.applyAffect(aff);
  victim.sendToChar('You feel yourself slowing down.\r\n');
  ch.sendToChar(`You slow ${victim.name}!\r\n`);
}

// =============================================================================
// Spell Functions – Utility
// =============================================================================

function spellIdentify(_level: number, ch: Character, target: Character | GameObject | null): void {
  const obj = target as GameObject;
  if (!obj) {
    ch.sendToChar("You can't identify that.\r\n");
    return;
  }
  const lines: string[] = [];
  lines.push(`Object: '${obj.name}', Type: ${ItemType[obj.itemType] ?? 'unknown'}`);
  lines.push(`Weight: ${obj.weight}, Cost: ${obj.cost}`);
  if (obj.values && obj.values.length > 0) {
    lines.push(`Values: ${obj.values.join(', ')}`);
  }
  if (obj.affects && obj.affects.length > 0) {
    for (const aff of obj.affects) {
      lines.push(`Affect: ${ApplyType[aff.location] ?? 'none'} by ${aff.modifier}`);
    }
  }
  ch.sendToChar(lines.join('\r\n') + '\r\n');
}

function spellLocateObject(_level: number, ch: Character, _target: Character | GameObject | null): void {
  // In a real implementation this would scan the world object list
  ch.sendToChar("You sense the direction of the object...\r\n");
}

function spellTeleport(_level: number, ch: Character, _target: Character | GameObject | null): void {
  const room = ch.inRoom as { hasFlag?: (f: bigint) => boolean } | null;
  if (room && room.hasFlag && room.hasFlag(ROOM_FLAGS.NO_RECALL)) {
    ch.sendToChar("Something prevents you from teleporting.\r\n");
    return;
  }
  ch.sendToChar("You are teleported!\r\n");
  // In full implementation: move ch to random room
}

function spellSummon(level: number, ch: Character, _target: Character | GameObject | null): void {
  void level;
  ch.sendToChar("You summon a powerful presence.\r\n");
  // In full implementation: bring target player to caster's room with level/PK checks
}

function spellGate(level: number, ch: Character, _target: Character | GameObject | null): void {
  void level;
  ch.sendToChar("A shimmering portal appears before you.\r\n");
  // In full implementation: create portal object
}

function spellWordOfRecall(_level: number, ch: Character, _target: Character | GameObject | null): void {
  ch.sendToChar("You are transported back to your recall point.\r\n");
  // In full implementation: move to recall room
}

function spellCreateFood(level: number, ch: Character, _target: Character | GameObject | null): void {
  void level;
  ch.sendToChar("A mushroom suddenly appears.\r\n");
  // In full implementation: create food object in room
}

function spellCreateWater(level: number, ch: Character, target: Character | GameObject | null): void {
  void level;
  const obj = target as GameObject | null;
  if (!obj || obj.itemType !== ItemType.DrinkCon) {
    ch.sendToChar("It can't hold water.\r\n");
    return;
  }
  ch.sendToChar("Water flows from your fingertips into the container.\r\n");
  // In full implementation: fill container values
}

function spellCreateSpring(level: number, ch: Character, _target: Character | GameObject | null): void {
  void level;
  ch.sendToChar("A spring of water bubbles up from the ground.\r\n");
  // In full implementation: create spring object in room
}

function spellContinualLight(level: number, ch: Character, _target: Character | GameObject | null): void {
  void level;
  ch.sendToChar("A ball of light appears.\r\n");
  // In full implementation: create light object
}

function spellEnchantWeapon(level: number, ch: Character, target: Character | GameObject | null): void {
  const obj = target as GameObject | null;
  if (!obj || obj.itemType !== ItemType.Weapon) {
    ch.sendToChar("That isn't a weapon.\r\n");
    return;
  }
  // Chance of failure
  if (numberPercent() > 50 + level) {
    ch.sendToChar("The enchantment fails.\r\n");
    return;
  }
  // Add hitroll and damroll affect
  const aff1 = new Affect(SPELL_ID.ENCHANT_WEAPON, -1, ApplyType.Hitroll, Math.max(1, Math.floor(level / 10)));
  const aff2 = new Affect(SPELL_ID.ENCHANT_WEAPON, -1, ApplyType.Damroll, Math.max(1, Math.floor(level / 10)));
  obj.affects.push(aff1);
  obj.affects.push(aff2);
  ch.sendToChar("The weapon glows blue.\r\n");
}

function spellEnchantArmor(level: number, ch: Character, target: Character | GameObject | null): void {
  const obj = target as GameObject | null;
  if (!obj || obj.itemType !== ItemType.Armor) {
    ch.sendToChar("That isn't armor.\r\n");
    return;
  }
  // Chance of failure
  if (numberPercent() > 50 + level) {
    ch.sendToChar("The enchantment fails.\r\n");
    return;
  }
  const aff = new Affect(SPELL_ID.ENCHANT_ARMOR, -1, ApplyType.AC, -Math.max(1, Math.floor(level / 8)));
  obj.affects.push(aff);
  ch.sendToChar("The armor shimmers with a gold aura.\r\n");
}

function spellDispelMagic(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  if (victim.affects.length === 0) {
    ch.sendToChar("Nothing happens.\r\n");
    return;
  }
  if (savingThrow(level, victim, SaveType.SpellStaff)) {
    ch.sendToChar("They resist your dispel!\r\n");
    return;
  }
  // Remove one random dispellable affect
  const dispellable = victim.affects.filter(a => {
    // All player-cast affects are dispellable
    return a.duration > 0;
  });
  if (dispellable.length === 0) {
    ch.sendToChar("Nothing happens.\r\n");
    return;
  }
  const idx = Math.floor(Math.random() * dispellable.length);
  const aff = dispellable[idx]!;
  aff.removeFrom(victim);
  const affIdx = victim.affects.indexOf(aff);
  if (affIdx !== -1) victim.affects.splice(affIdx, 1);
  ch.sendToChar(`You successfully dispel a spell on ${victim.name}.\r\n`);
  victim.sendToChar('You feel a spell stripped away.\r\n');
}

function spellEarthquake(level: number, ch: Character, _target: Character | GameObject | null): void {
  ch.sendToChar("The earth trembles beneath your feet!\r\n");
  const room = ch.inRoom as { characters?: Character[] } | null;
  if (!room || !room.characters) return;
  for (const victim of [...room.characters]) {
    if (victim === ch) continue;
    if (victim.position === Position.Dead) continue;
    // Skip grouped characters
    if (victim.master === ch || victim.leader === ch) continue;
    if (ch.master === victim || ch.leader === victim) continue;
    const dam = rollDice(level, 4) + Math.floor(level / 2);
    let finalDam = dam;
    if (savingThrow(level, victim, SaveType.SpellStaff)) {
      finalDam = Math.floor(dam / 2);
    }
    victim.hit -= finalDam;
    victim.sendToChar(`The earthquake hits you for ${finalDam} damage!\r\n`);
    victim.updatePosition();
  }
}

function spellCallLightning(level: number, ch: Character, target: Character | GameObject | null): void {
  const victim = target as Character;
  if (!victim) return;
  // Check outdoor + stormy
  const room = ch.inRoom as { hasFlag?: (f: bigint) => boolean; sectorType?: SectorType } | null;
  if (room && room.hasFlag && room.hasFlag(ROOM_FLAGS.INDOORS)) {
    ch.sendToChar("You must be outdoors to call lightning.\r\n");
    return;
  }
  // High damage
  const numDice = Math.max(1, level);
  spellDamage(level, ch, victim, numDice, 8, level * 2, SaveType.SpellStaff, DamageType.Bolt);
}

// =============================================================================
// Spell Registry
// =============================================================================

/** Map of spell ID → SpellDefinition. */
const spellMap: Map<number, SpellDefinition> = new Map();

/** Map of lowercase spell name → spell ID for name lookup. */
const nameIndex: Map<string, number> = new Map();

function reg(def: SpellDefinition): void {
  spellMap.set(def.id, def);
  nameIndex.set(def.name.toLowerCase(), def.id);
}

// ---------------------------------------------------------------------------
// Register all spells
// ---------------------------------------------------------------------------

// Offensive spells
reg({
  id: SPELL_ID.MAGIC_MISSILE, name: 'magic missile',
  minLevel: levels(1, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 5, maxMana: 15, beats: 12,
  damageType: DamageType.Bolt, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellMagicMissile, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CHILL_TOUCH, name: 'chill touch',
  minLevel: levels(4, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Blast, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellChillTouch, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.BURNING_HANDS, name: 'burning hands',
  minLevel: levels(7, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 15, maxMana: 30, beats: 12,
  damageType: DamageType.Blast, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellBurningHands, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.SHOCKING_GRASP, name: 'shocking grasp',
  minLevel: levels(10, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 15, maxMana: 30, beats: 12,
  damageType: DamageType.Bolt, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellShockingGrasp, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.COLOUR_SPRAY, name: 'colour spray',
  minLevel: levels(15, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Blast, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellColourSpray, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.LIGHTNING_BOLT, name: 'lightning bolt',
  minLevel: levels(20, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 25, maxMana: 50, beats: 12,
  damageType: DamageType.Bolt, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellLightningBolt, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.FIREBALL, name: 'fireball',
  minLevel: levels(25, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 30, maxMana: 60, beats: 12,
  damageType: DamageType.Blast, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellFireball, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.ACID_BLAST, name: 'acid blast',
  minLevel: levels(30, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 35, maxMana: 70, beats: 12,
  damageType: DamageType.Slash, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellAcidBlast, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CHAIN_LIGHTNING, name: 'chain lightning',
  minLevel: levels(35, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 40, maxMana: 80, beats: 12,
  damageType: DamageType.Bolt, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellChainLightning, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.METEOR_SWARM, name: 'meteor swarm',
  minLevel: levels(40, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 50, maxMana: 100, beats: 16,
  damageType: DamageType.Blast, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellMeteorSwarm, guild: null, flags: 0n,
});

// Healing spells
reg({
  id: SPELL_ID.CURE_LIGHT, name: 'cure light',
  minLevel: levels(0, 1), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 5, maxMana: 10, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCureLight, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CURE_SERIOUS, name: 'cure serious',
  minLevel: levels(0, 7), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCureSerious, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CURE_CRITICAL, name: 'cure critical',
  minLevel: levels(0, 13), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCureCritical, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.HEAL, name: 'heal',
  minLevel: levels(0, 25), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 50, maxMana: 100, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellHeal, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CURE_BLINDNESS, name: 'cure blindness',
  minLevel: levels(0, 6), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 5, maxMana: 10, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCureBlindness, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CURE_POISON, name: 'cure poison',
  minLevel: levels(0, 14), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCurePoison, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.REMOVE_CURSE, name: 'remove curse',
  minLevel: levels(0, 18), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellRemoveCurse, guild: null, flags: 0n,
});

// Buff spells
reg({
  id: SPELL.ARMOR, name: 'armor',
  minLevel: levels(5, 1), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellArmor, guild: null, flags: 0n,
});

reg({
  id: SPELL.BLESS, name: 'bless',
  minLevel: levels(0, 5), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellBless, guild: null, flags: 0n,
});

reg({
  id: SPELL.GIANT_STRENGTH, name: 'giant strength',
  minLevel: levels(10, 0), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellGiantStrength, guild: null, flags: 0n,
});

reg({
  id: SPELL.FLY, name: 'fly',
  minLevel: levels(12, 0), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 15, maxMana: 30, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellFly, guild: null, flags: 0n,
});

reg({
  id: SPELL.INVIS, name: 'invisibility',
  minLevel: levels(8, 0), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellInvisibility, guild: null, flags: 0n,
});

reg({
  id: SPELL.DETECT_INVIS, name: 'detect invis',
  minLevel: levels(5, 7), target: TargetType.TAR_CHAR_SELF,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellDetectInvis, guild: null, flags: 0n,
});

reg({
  id: SPELL.DETECT_HIDDEN, name: 'detect hidden',
  minLevel: levels(5, 8), target: TargetType.TAR_CHAR_SELF,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellDetectHidden, guild: null, flags: 0n,
});

reg({
  id: SPELL.DETECT_MAGIC, name: 'detect magic',
  minLevel: levels(3, 5), target: TargetType.TAR_CHAR_SELF,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellDetectMagic, guild: null, flags: 0n,
});

reg({
  id: SPELL.SANCTUARY, name: 'sanctuary',
  minLevel: levels(0, 30), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 75, maxMana: 150, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellSanctuary, guild: null, flags: 0n,
});

reg({
  id: SPELL.HASTE, name: 'haste',
  minLevel: levels(20, 0), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 30, maxMana: 60, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellHaste, guild: null, flags: 0n,
});

reg({
  id: SPELL.SHIELD, name: 'shield',
  minLevel: levels(15, 0), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 12, maxMana: 24, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellShield, guild: null, flags: 0n,
});

reg({
  id: SPELL.STONE_SKIN, name: 'stone skin',
  minLevel: levels(25, 0), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 25, maxMana: 50, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellStoneSkin, guild: null, flags: 0n,
});

reg({
  id: SPELL.PROTECT_EVIL, name: 'protection evil',
  minLevel: levels(0, 10), target: TargetType.TAR_CHAR_SELF,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellProtectEvil, guild: null, flags: 0n,
});

reg({
  id: SPELL.PROTECT_GOOD, name: 'protection good',
  minLevel: levels(0, 10), target: TargetType.TAR_CHAR_SELF,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellProtectGood, guild: null, flags: 0n,
});

reg({
  id: SPELL.PASS_DOOR, name: 'pass door',
  minLevel: levels(18, 0), target: TargetType.TAR_CHAR_SELF,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellPassDoor, guild: null, flags: 0n,
});

reg({
  id: SPELL.INFRARED, name: 'infravision',
  minLevel: levels(6, 10), target: TargetType.TAR_CHAR_DEFENSIVE,
  minMana: 5, maxMana: 12, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellInfravision, guild: null, flags: 0n,
});

// Debuff spells
reg({
  id: SPELL.BLINDNESS, name: 'blindness',
  minLevel: levels(10, 8), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellBlindness, guild: null, flags: 0n,
});

reg({
  id: SPELL.POISON, name: 'poison',
  minLevel: levels(15, 12), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.PoisonDeath,
  components: [], spellFun: spellPoison, guild: null, flags: 0n,
});

reg({
  id: SPELL.CURSE, name: 'curse',
  minLevel: levels(15, 15), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellCurse, guild: null, flags: 0n,
});

reg({
  id: SPELL.SLEEP, name: 'sleep',
  minLevel: levels(12, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 15, maxMana: 30, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellSleep, guild: null, flags: 0n,
});

reg({
  id: SPELL.WEAKEN, name: 'weaken',
  minLevel: levels(12, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellWeaken, guild: null, flags: 0n,
});

reg({
  id: SPELL.FAERIE_FIRE, name: 'faerie fire',
  minLevel: levels(6, 3), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 5, maxMana: 10, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellFaerieFire, guild: null, flags: 0n,
});

reg({
  id: SPELL.SLOW, name: 'slow',
  minLevel: levels(18, 0), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellSlow, guild: null, flags: 0n,
});

// Utility spells
reg({
  id: SPELL_ID.IDENTIFY, name: 'identify',
  minLevel: levels(10, 10), target: TargetType.TAR_OBJ_INV,
  minMana: 12, maxMana: 24, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellIdentify, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.LOCATE_OBJECT, name: 'locate object',
  minLevel: levels(10, 15), target: TargetType.TAR_IGNORE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellLocateObject, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.TELEPORT, name: 'teleport',
  minLevel: levels(15, 0), target: TargetType.TAR_CHAR_SELF,
  minMana: 30, maxMana: 60, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellTeleport, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.SUMMON, name: 'summon',
  minLevel: levels(0, 20), target: TargetType.TAR_IGNORE,
  minMana: 50, maxMana: 100, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellSummon, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.GATE, name: 'gate',
  minLevel: levels(20, 0), target: TargetType.TAR_IGNORE,
  minMana: 60, maxMana: 120, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellGate, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.WORD_OF_RECALL, name: 'word of recall',
  minLevel: levels(0, 15), target: TargetType.TAR_CHAR_SELF,
  minMana: 10, maxMana: 20, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellWordOfRecall, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CREATE_FOOD, name: 'create food',
  minLevel: levels(0, 5), target: TargetType.TAR_IGNORE,
  minMana: 5, maxMana: 10, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCreateFood, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CREATE_WATER, name: 'create water',
  minLevel: levels(0, 5), target: TargetType.TAR_OBJ_INV,
  minMana: 5, maxMana: 10, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCreateWater, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CREATE_SPRING, name: 'create spring',
  minLevel: levels(0, 12), target: TargetType.TAR_IGNORE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellCreateSpring, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CONTINUAL_LIGHT, name: 'continual light',
  minLevel: levels(6, 4), target: TargetType.TAR_IGNORE,
  minMana: 5, maxMana: 10, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellContinualLight, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.ENCHANT_WEAPON, name: 'enchant weapon',
  minLevel: levels(20, 0), target: TargetType.TAR_OBJ_INV,
  minMana: 50, maxMana: 100, beats: 24,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellEnchantWeapon, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.ENCHANT_ARMOR, name: 'enchant armor',
  minLevel: levels(20, 0), target: TargetType.TAR_OBJ_INV,
  minMana: 50, maxMana: 100, beats: 24,
  damageType: DamageType.Hit, savingThrow: SaveType.None,
  components: [], spellFun: spellEnchantArmor, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.DISPEL_MAGIC, name: 'dispel magic',
  minLevel: levels(15, 15), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 15, maxMana: 30, beats: 12,
  damageType: DamageType.Hit, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellDispelMagic, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.EARTHQUAKE, name: 'earthquake',
  minLevel: levels(0, 12), target: TargetType.TAR_IGNORE,
  minMana: 20, maxMana: 40, beats: 12,
  damageType: DamageType.Pound, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellEarthquake, guild: null, flags: 0n,
});

reg({
  id: SPELL_ID.CALL_LIGHTNING, name: 'call lightning',
  minLevel: levels(0, 18), target: TargetType.TAR_CHAR_OFFENSIVE,
  minMana: 25, maxMana: 50, beats: 12,
  damageType: DamageType.Bolt, savingThrow: SaveType.SpellStaff,
  components: [], spellFun: spellCallLightning, guild: null, flags: 0n,
});

// =============================================================================
// Public API
// =============================================================================

/**
 * Find a spell by prefix match on name.
 * Returns the first spell whose name starts with the given prefix (case-insensitive).
 */
export function findSpell(name: string): SpellDefinition | undefined {
  const lower = name.toLowerCase().trim();
  if (!lower) return undefined;

  // Exact match first
  const exactId = nameIndex.get(lower);
  if (exactId !== undefined) return spellMap.get(exactId);

  // Prefix match
  for (const [spellName, spellId] of nameIndex.entries()) {
    if (spellName.startsWith(lower)) {
      return spellMap.get(spellId);
    }
  }
  return undefined;
}

/**
 * Get a spell definition by its ID.
 */
export function getSpell(id: number): SpellDefinition | undefined {
  return spellMap.get(id);
}

/**
 * Get all registered spell definitions.
 */
export function getAllSpells(): SpellDefinition[] {
  return Array.from(spellMap.values());
}

/**
 * Get total number of registered spells.
 */
export function getSpellCount(): number {
  return spellMap.size;
}

/**
 * @deprecated Legacy class wrapper. Use standalone functions instead.
 */
export class SpellRegistry {
  private readonly spells = spellMap;
  private readonly nameIdx = nameIndex;

  register(spellNumber: number, definition: SpellDefinition): void {
    this.spells.set(spellNumber, definition);
    this.nameIdx.set(definition.name.toLowerCase(), spellNumber);
  }

  getSpell(spellNumber: number): SpellDefinition | undefined {
    return this.spells.get(spellNumber);
  }

  getSpellByName(name: string): SpellDefinition | undefined {
    return findSpell(name);
  }

  get spellCount(): number {
    return this.spells.size;
  }
}
