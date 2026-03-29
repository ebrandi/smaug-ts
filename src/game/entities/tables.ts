/**
 * tables.ts – Race and class data tables for SMAUG 2.0.
 *
 * Replicates the legacy race_table[] and class_table[] arrays from tables.c.
 * These drive character creation, level-up stat gains, and various
 * game-mechanic lookups.
 */

import { CharClass, Race, Size, Attribute, AFF } from './types.js';

// =============================================================================
// Race Table
// =============================================================================

export interface RaceData {
  name: string;
  strMod: number;
  intMod: number;
  wisMod: number;
  dexMod: number;
  conMod: number;
  chaMod: number;
  lckMod: number;
  hpMod: number;
  manaMod: number;
  resistances: bigint;
  susceptibilities: bigint;
  size: Size;
  minAlign: number;
  maxAlign: number;
  startingRoom: number;
}

/**
 * Race data table indexed by Race enum.
 * 14 races: Human, Elf, Dwarf, Halfling, Pixie, Half-Elf, Half-Orc,
 *           Half-Troll, Half-Ogre, Gith, Drow, Sea-Elf, Lizardman, Gnome
 */
export const raceTable: Record<Race, RaceData> = {
  [Race.Human]: {
    name: 'Human',
    strMod: 0, intMod: 0, wisMod: 0, dexMod: 0, conMod: 0, chaMod: 0, lckMod: 0,
    hpMod: 0, manaMod: 0,
    resistances: 0n, susceptibilities: 0n,
    size: Size.Medium, minAlign: -1000, maxAlign: 1000, startingRoom: 3001,
  },
  [Race.Elf]: {
    name: 'Elf',
    strMod: 0, intMod: 1, wisMod: 0, dexMod: 1, conMod: -1, chaMod: 0, lckMod: 0,
    hpMod: -2, manaMod: 5,
    resistances: AFF.CHARM, susceptibilities: AFF.INFRARED,
    size: Size.Small, minAlign: -350, maxAlign: 1000, startingRoom: 6000,
  },
  [Race.Dwarf]: {
    name: 'Dwarf',
    strMod: 0, intMod: 0, wisMod: 1, dexMod: -1, conMod: 1, chaMod: -1, lckMod: 0,
    hpMod: 3, manaMod: -3,
    resistances: AFF.POISON, susceptibilities: 0n,
    size: Size.Small, minAlign: -200, maxAlign: 1000, startingRoom: 6100,
  },
  [Race.Halfling]: {
    name: 'Halfling',
    strMod: -1, intMod: 0, wisMod: 0, dexMod: 1, conMod: 0, chaMod: 0, lckMod: 1,
    hpMod: -2, manaMod: 0,
    resistances: 0n, susceptibilities: 0n,
    size: Size.Small, minAlign: -350, maxAlign: 1000, startingRoom: 6200,
  },
  [Race.Pixie]: {
    name: 'Pixie',
    strMod: -3, intMod: 2, wisMod: 0, dexMod: 2, conMod: -2, chaMod: 0, lckMod: 1,
    hpMod: -5, manaMod: 10,
    resistances: AFF.CHARM, susceptibilities: 0n,
    size: Size.Tiny, minAlign: 250, maxAlign: 1000, startingRoom: 6300,
  },
  [Race.HalfElf]: {
    name: 'Half-Elf',
    strMod: 0, intMod: 1, wisMod: 0, dexMod: 0, conMod: 0, chaMod: 0, lckMod: 0,
    hpMod: -1, manaMod: 2,
    resistances: 0n, susceptibilities: 0n,
    size: Size.Medium, minAlign: -500, maxAlign: 1000, startingRoom: 3001,
  },
  [Race.HalfOrc]: {
    name: 'Half-Orc',
    strMod: 1, intMod: -1, wisMod: 0, dexMod: 0, conMod: 1, chaMod: -1, lckMod: 0,
    hpMod: 3, manaMod: -3,
    resistances: AFF.POISON, susceptibilities: 0n,
    size: Size.Medium, minAlign: -1000, maxAlign: 500, startingRoom: 6400,
  },
  [Race.HalfTroll]: {
    name: 'Half-Troll',
    strMod: 2, intMod: -2, wisMod: -1, dexMod: -1, conMod: 2, chaMod: -2, lckMod: 0,
    hpMod: 5, manaMod: -8,
    resistances: AFF.POISON, susceptibilities: AFF.FIRESHIELD,
    size: Size.Large, minAlign: -1000, maxAlign: 0, startingRoom: 6500,
  },
  [Race.HalfOgre]: {
    name: 'Half-Ogre',
    strMod: 2, intMod: -1, wisMod: -1, dexMod: -1, conMod: 1, chaMod: -1, lckMod: 0,
    hpMod: 4, manaMod: -5,
    resistances: 0n, susceptibilities: 0n,
    size: Size.Large, minAlign: -1000, maxAlign: 300, startingRoom: 6600,
  },
  [Race.Gith]: {
    name: 'Gith',
    strMod: 1, intMod: 1, wisMod: 0, dexMod: 1, conMod: -2, chaMod: -1, lckMod: 0,
    hpMod: -1, manaMod: 3,
    resistances: 0n, susceptibilities: 0n,
    size: Size.Medium, minAlign: -1000, maxAlign: 1000, startingRoom: 6700,
  },
  [Race.Drow]: {
    name: 'Drow',
    strMod: 0, intMod: 2, wisMod: 0, dexMod: 1, conMod: -1, chaMod: -1, lckMod: 0,
    hpMod: -3, manaMod: 5,
    resistances: AFF.CHARM, susceptibilities: 0n,
    size: Size.Small, minAlign: -1000, maxAlign: -350, startingRoom: 6800,
  },
  [Race.SeaElf]: {
    name: 'Sea-Elf',
    strMod: 0, intMod: 1, wisMod: 1, dexMod: 0, conMod: 0, chaMod: 0, lckMod: 0,
    hpMod: -1, manaMod: 3,
    resistances: AFF.AQUA_BREATH, susceptibilities: AFF.FIRESHIELD,
    size: Size.Medium, minAlign: -500, maxAlign: 1000, startingRoom: 6900,
  },
  [Race.Lizardman]: {
    name: 'Lizardman',
    strMod: 1, intMod: -1, wisMod: 0, dexMod: 0, conMod: 1, chaMod: -2, lckMod: 0,
    hpMod: 3, manaMod: -5,
    resistances: AFF.POISON, susceptibilities: AFF.ICESHIELD,
    size: Size.Medium, minAlign: -1000, maxAlign: 500, startingRoom: 7000,
  },
  [Race.Gnome]: {
    name: 'Gnome',
    strMod: -1, intMod: 1, wisMod: 1, dexMod: 0, conMod: 0, chaMod: 0, lckMod: 0,
    hpMod: -1, manaMod: 4,
    resistances: 0n, susceptibilities: 0n,
    size: Size.Small, minAlign: -300, maxAlign: 1000, startingRoom: 7100,
  },
};

// =============================================================================
// Class Table
// =============================================================================

export interface ClassData {
  name: string;
  primeAttr: Attribute;
  weapon: number;
  guild: number;
  skillAdept: number;
  thac0_00: number;
  thac0_32: number;
  hpDice: number;
  hpSides: number;
  manaDice: number;
  manaSides: number;
  expBase: number;
  affectedBy: bigint;
}

/**
 * Class data table indexed by CharClass enum.
 * 12 classes: Mage, Cleric, Thief, Warrior, Vampire, Druid,
 *             Ranger, Augurer, Paladin, Nephandi, Savage, Pirate
 */
export const classTable: Record<CharClass, ClassData> = {
  [CharClass.Mage]: {
    name: 'Mage',
    primeAttr: Attribute.Int,
    weapon: 3001, guild: 3018,
    skillAdept: 95,
    thac0_00: 20, thac0_32: 10,
    hpDice: 1, hpSides: 6,
    manaDice: 2, manaSides: 8,
    expBase: 1000,
    affectedBy: 0n,
  },
  [CharClass.Cleric]: {
    name: 'Cleric',
    primeAttr: Attribute.Wis,
    weapon: 3002, guild: 3003,
    skillAdept: 95,
    thac0_00: 20, thac0_32: 8,
    hpDice: 1, hpSides: 8,
    manaDice: 2, manaSides: 6,
    expBase: 1000,
    affectedBy: 0n,
  },
  [CharClass.Thief]: {
    name: 'Thief',
    primeAttr: Attribute.Dex,
    weapon: 3003, guild: 3028,
    skillAdept: 85,
    thac0_00: 20, thac0_32: 8,
    hpDice: 1, hpSides: 8,
    manaDice: 0, manaSides: 0,
    expBase: 1000,
    affectedBy: 0n,
  },
  [CharClass.Warrior]: {
    name: 'Warrior',
    primeAttr: Attribute.Str,
    weapon: 3004, guild: 3022,
    skillAdept: 85,
    thac0_00: 18, thac0_32: 6,
    hpDice: 1, hpSides: 12,
    manaDice: 0, manaSides: 0,
    expBase: 1000,
    affectedBy: 0n,
  },
  [CharClass.Vampire]: {
    name: 'Vampire',
    primeAttr: Attribute.Str,
    weapon: 3005, guild: 3040,
    skillAdept: 85,
    thac0_00: 18, thac0_32: 6,
    hpDice: 1, hpSides: 10,
    manaDice: 1, manaSides: 4,
    expBase: 1100,
    affectedBy: AFF.INFRARED,
  },
  [CharClass.Druid]: {
    name: 'Druid',
    primeAttr: Attribute.Wis,
    weapon: 3006, guild: 3050,
    skillAdept: 90,
    thac0_00: 20, thac0_32: 9,
    hpDice: 1, hpSides: 8,
    manaDice: 2, manaSides: 6,
    expBase: 1000,
    affectedBy: 0n,
  },
  [CharClass.Ranger]: {
    name: 'Ranger',
    primeAttr: Attribute.Dex,
    weapon: 3007, guild: 3060,
    skillAdept: 85,
    thac0_00: 19, thac0_32: 7,
    hpDice: 1, hpSides: 10,
    manaDice: 1, manaSides: 4,
    expBase: 1000,
    affectedBy: 0n,
  },
  [CharClass.Augurer]: {
    name: 'Augurer',
    primeAttr: Attribute.Int,
    weapon: 3008, guild: 3070,
    skillAdept: 90,
    thac0_00: 20, thac0_32: 9,
    hpDice: 1, hpSides: 6,
    manaDice: 2, manaSides: 8,
    expBase: 1050,
    affectedBy: 0n,
  },
  [CharClass.Paladin]: {
    name: 'Paladin',
    primeAttr: Attribute.Str,
    weapon: 3009, guild: 3080,
    skillAdept: 85,
    thac0_00: 19, thac0_32: 7,
    hpDice: 1, hpSides: 10,
    manaDice: 1, manaSides: 4,
    expBase: 1050,
    affectedBy: 0n,
  },
  [CharClass.Nephandi]: {
    name: 'Nephandi',
    primeAttr: Attribute.Int,
    weapon: 3010, guild: 3090,
    skillAdept: 90,
    thac0_00: 20, thac0_32: 9,
    hpDice: 1, hpSides: 6,
    manaDice: 2, manaSides: 8,
    expBase: 1050,
    affectedBy: 0n,
  },
  [CharClass.Savage]: {
    name: 'Savage',
    primeAttr: Attribute.Str,
    weapon: 3011, guild: 3100,
    skillAdept: 75,
    thac0_00: 18, thac0_32: 6,
    hpDice: 1, hpSides: 12,
    manaDice: 0, manaSides: 0,
    expBase: 1000,
    affectedBy: 0n,
  },
  [CharClass.Pirate]: {
    name: 'Pirate',
    primeAttr: Attribute.Dex,
    weapon: 3012, guild: 3110,
    skillAdept: 80,
    thac0_00: 19, thac0_32: 7,
    hpDice: 1, hpSides: 10,
    manaDice: 0, manaSides: 0,
    expBase: 1000,
    affectedBy: 0n,
  },
};

// =============================================================================
// Lookup Helpers
// =============================================================================

/** Get race data by Race enum. */
export function getRace(race: Race): RaceData {
  const data = raceTable[race];
  if (!data) {
    return raceTable[Race.Human]!;
  }
  return data;
}

/** Get class data by CharClass enum. */
export function getClass(charClass: CharClass): ClassData {
  const data = classTable[charClass];
  if (!data) {
    return classTable[CharClass.Warrior]!;
  }
  return data;
}

/** Look up a Race enum by name (case-insensitive). Returns undefined if not found. */
export function raceByName(name: string): Race | undefined {
  const lower = name.toLowerCase();
  for (const raceKey of Object.keys(raceTable)) {
    const r = Number(raceKey) as Race;
    if (raceTable[r]!.name.toLowerCase() === lower) {
      return r;
    }
  }
  return undefined;
}

/** Look up a CharClass enum by name (case-insensitive). Returns undefined if not found. */
export function classByName(name: string): CharClass | undefined {
  const lower = name.toLowerCase();
  for (const classKey of Object.keys(classTable)) {
    const c = Number(classKey) as CharClass;
    if (classTable[c]!.name.toLowerCase() === lower) {
      return c;
    }
  }
  return undefined;
}
