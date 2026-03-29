import { describe, it, expect } from 'vitest';
import {
  raceTable, classTable,
  getRace, getClass,
  raceByName, classByName,
  type RaceData, type ClassData,
} from '../../../src/game/entities/tables.js';
import { CharClass, Race, Size, Attribute, AFF } from '../../../src/game/entities/types.js';

describe('tables', () => {
  describe('raceTable', () => {
    it('should contain 14 races', () => {
      const raceKeys = Object.keys(raceTable).map(Number);
      expect(raceKeys).toHaveLength(14);
    });

    it('Human should have all zero stat modifiers', () => {
      const human = raceTable[Race.Human]!;
      expect(human.name).toBe('Human');
      expect(human.strMod).toBe(0);
      expect(human.intMod).toBe(0);
      expect(human.wisMod).toBe(0);
      expect(human.dexMod).toBe(0);
      expect(human.conMod).toBe(0);
      expect(human.chaMod).toBe(0);
      expect(human.lckMod).toBe(0);
      expect(human.size).toBe(Size.Medium);
    });

    it('Human should allow any alignment', () => {
      const human = raceTable[Race.Human]!;
      expect(human.minAlign).toBe(-1000);
      expect(human.maxAlign).toBe(1000);
    });

    it('Elf should have +1 INT, +1 DEX, -1 CON', () => {
      const elf = raceTable[Race.Elf]!;
      expect(elf.name).toBe('Elf');
      expect(elf.intMod).toBe(1);
      expect(elf.dexMod).toBe(1);
      expect(elf.conMod).toBe(-1);
      expect(elf.size).toBe(Size.Small);
    });

    it('Dwarf should have +1 CON, +1 WIS, -1 DEX, -1 CHA', () => {
      const dwarf = raceTable[Race.Dwarf]!;
      expect(dwarf.conMod).toBe(1);
      expect(dwarf.wisMod).toBe(1);
      expect(dwarf.dexMod).toBe(-1);
      expect(dwarf.chaMod).toBe(-1);
      expect(dwarf.size).toBe(Size.Small);
    });

    it('Pixie should be Tiny size with large stat mods', () => {
      const pixie = raceTable[Race.Pixie]!;
      expect(pixie.size).toBe(Size.Tiny);
      expect(pixie.strMod).toBe(-3);
      expect(pixie.intMod).toBe(2);
      expect(pixie.dexMod).toBe(2);
      expect(pixie.conMod).toBe(-2);
      expect(pixie.manaMod).toBe(10);
    });

    it('Half-Troll should be Large size', () => {
      const halfTroll = raceTable[Race.HalfTroll]!;
      expect(halfTroll.size).toBe(Size.Large);
      expect(halfTroll.strMod).toBe(2);
      expect(halfTroll.conMod).toBe(2);
    });

    it('Drow should have evil-only alignment', () => {
      const drow = raceTable[Race.Drow]!;
      expect(drow.maxAlign).toBeLessThan(0);
    });

    it('all races should have a starting room', () => {
      for (const key of Object.keys(raceTable)) {
        const race = raceTable[Number(key) as Race]!;
        expect(race.startingRoom).toBeGreaterThan(0);
      }
    });

    it('all races should have a name', () => {
      for (const key of Object.keys(raceTable)) {
        const race = raceTable[Number(key) as Race]!;
        expect(race.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('classTable', () => {
    it('should contain 12 classes', () => {
      const classKeys = Object.keys(classTable).map(Number);
      expect(classKeys).toHaveLength(12);
    });

    it('Mage should have INT prime, 1d6 HP, 2d8 mana', () => {
      const mage = classTable[CharClass.Mage]!;
      expect(mage.name).toBe('Mage');
      expect(mage.primeAttr).toBe(Attribute.Int);
      expect(mage.hpDice).toBe(1);
      expect(mage.hpSides).toBe(6);
      expect(mage.manaDice).toBe(2);
      expect(mage.manaSides).toBe(8);
    });

    it('Warrior should have STR prime, 1d12 HP, 0d0 mana', () => {
      const warrior = classTable[CharClass.Warrior]!;
      expect(warrior.name).toBe('Warrior');
      expect(warrior.primeAttr).toBe(Attribute.Str);
      expect(warrior.hpDice).toBe(1);
      expect(warrior.hpSides).toBe(12);
      expect(warrior.manaDice).toBe(0);
      expect(warrior.manaSides).toBe(0);
    });

    it('Warrior THAC0 should be 18 at level 0 and 6 at level 32', () => {
      const warrior = classTable[CharClass.Warrior]!;
      expect(warrior.thac0_00).toBe(18);
      expect(warrior.thac0_32).toBe(6);
    });

    it('Mage THAC0 should be 20 at level 0 and 10 at level 32', () => {
      const mage = classTable[CharClass.Mage]!;
      expect(mage.thac0_00).toBe(20);
      expect(mage.thac0_32).toBe(10);
    });

    it('Vampire should have innate AFF.INFRARED', () => {
      const vampire = classTable[CharClass.Vampire]!;
      expect(vampire.affectedBy & AFF.INFRARED).not.toBe(0n);
    });

    it('all classes should have a guild room', () => {
      for (const key of Object.keys(classTable)) {
        const cls = classTable[Number(key) as CharClass]!;
        expect(cls.guild).toBeGreaterThan(0);
      }
    });

    it('all classes should have expBase >= 1000', () => {
      for (const key of Object.keys(classTable)) {
        const cls = classTable[Number(key) as CharClass]!;
        expect(cls.expBase).toBeGreaterThanOrEqual(1000);
      }
    });

    it('skillAdept should be between 75 and 95', () => {
      for (const key of Object.keys(classTable)) {
        const cls = classTable[Number(key) as CharClass]!;
        expect(cls.skillAdept).toBeGreaterThanOrEqual(75);
        expect(cls.skillAdept).toBeLessThanOrEqual(95);
      }
    });
  });

  describe('getRace', () => {
    it('should return human data for Race.Human', () => {
      const data = getRace(Race.Human);
      expect(data.name).toBe('Human');
    });

    it('should return human data for unknown race', () => {
      const data = getRace(999 as Race);
      expect(data.name).toBe('Human');
    });
  });

  describe('getClass', () => {
    it('should return warrior data for CharClass.Warrior', () => {
      const data = getClass(CharClass.Warrior);
      expect(data.name).toBe('Warrior');
    });

    it('should return warrior data for unknown class', () => {
      const data = getClass(999 as CharClass);
      expect(data.name).toBe('Warrior');
    });
  });

  describe('raceByName', () => {
    it('should find Elf by name', () => {
      expect(raceByName('Elf')).toBe(Race.Elf);
    });

    it('should be case-insensitive', () => {
      expect(raceByName('DWARF')).toBe(Race.Dwarf);
    });

    it('should return undefined for unknown race', () => {
      expect(raceByName('Hobbit')).toBeUndefined();
    });
  });

  describe('classByName', () => {
    it('should find Mage by name', () => {
      expect(classByName('Mage')).toBe(CharClass.Mage);
    });

    it('should be case-insensitive', () => {
      expect(classByName('warrior')).toBe(CharClass.Warrior);
    });

    it('should return undefined for unknown class', () => {
      expect(classByName('Monk')).toBeUndefined();
    });
  });
});
