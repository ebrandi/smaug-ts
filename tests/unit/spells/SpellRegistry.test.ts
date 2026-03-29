import { describe, it, expect } from 'vitest';
import {
  findSpell,
  getSpell,
  getAllSpells,
  getSpellCount,
  SPELL_ID,
} from '../../../src/game/spells/SpellRegistry.js';
import { TargetType, CharClass } from '../../../src/game/entities/types.js';
import { SPELL } from '../../../src/game/affects/AffectRegistry.js';

describe('SpellRegistry', () => {
  describe('spell count', () => {
    it('should have at least 40 spells registered', () => {
      expect(getSpellCount()).toBeGreaterThanOrEqual(40);
    });
  });

  describe('findSpell()', () => {
    it('should find spell by exact name', () => {
      const spell = findSpell('magic missile');
      expect(spell).toBeDefined();
      expect(spell!.name).toBe('magic missile');
    });

    it('should find spell by prefix', () => {
      const spell = findSpell('fire');
      expect(spell).toBeDefined();
      expect(spell!.name).toBe('fireball');
    });

    it('should be case-insensitive', () => {
      const spell = findSpell('MAGIC MISSILE');
      expect(spell).toBeDefined();
      expect(spell!.name).toBe('magic missile');
    });

    it('should return undefined for unknown spells', () => {
      expect(findSpell('xyzzy')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(findSpell('')).toBeUndefined();
    });

    it('should find heal spell', () => {
      const spell = findSpell('heal');
      expect(spell).toBeDefined();
      expect(spell!.name).toBe('heal');
    });

    it('should find armor spell', () => {
      const spell = findSpell('armor');
      expect(spell).toBeDefined();
      expect(spell!.id).toBe(SPELL.ARMOR);
    });

    it('should find blindness spell', () => {
      const spell = findSpell('blindness');
      expect(spell).toBeDefined();
      expect(spell!.target).toBe(TargetType.TAR_CHAR_OFFENSIVE);
    });
  });

  describe('getSpell()', () => {
    it('should retrieve spell by ID', () => {
      const spell = getSpell(SPELL_ID.FIREBALL);
      expect(spell).toBeDefined();
      expect(spell!.name).toBe('fireball');
    });

    it('should return undefined for unknown ID', () => {
      expect(getSpell(99999)).toBeUndefined();
    });
  });

  describe('getAllSpells()', () => {
    it('should return all spells as array', () => {
      const spells = getAllSpells();
      expect(spells.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('spell level requirements', () => {
    it('magic missile should be available to mages at level 1', () => {
      const spell = findSpell('magic missile')!;
      expect(spell.minLevel.get(CharClass.Mage)).toBe(1);
      expect(spell.minLevel.has(CharClass.Cleric)).toBe(false);
    });

    it('cure light should be available to clerics at level 1', () => {
      const spell = findSpell('cure light')!;
      expect(spell.minLevel.get(CharClass.Cleric)).toBe(1);
      expect(spell.minLevel.has(CharClass.Mage)).toBe(false);
    });

    it('fireball should require mage level 25', () => {
      const spell = findSpell('fireball')!;
      expect(spell.minLevel.get(CharClass.Mage)).toBe(25);
    });
  });

  describe('spell target types', () => {
    it('offensive spells should target TAR_CHAR_OFFENSIVE', () => {
      expect(findSpell('magic missile')!.target).toBe(TargetType.TAR_CHAR_OFFENSIVE);
      expect(findSpell('fireball')!.target).toBe(TargetType.TAR_CHAR_OFFENSIVE);
      expect(findSpell('lightning bolt')!.target).toBe(TargetType.TAR_CHAR_OFFENSIVE);
    });

    it('healing spells should target TAR_CHAR_DEFENSIVE', () => {
      expect(findSpell('cure light')!.target).toBe(TargetType.TAR_CHAR_DEFENSIVE);
      expect(findSpell('heal')!.target).toBe(TargetType.TAR_CHAR_DEFENSIVE);
    });

    it('self-only spells should target TAR_CHAR_SELF', () => {
      expect(findSpell('detect invis')!.target).toBe(TargetType.TAR_CHAR_SELF);
      expect(findSpell('detect hidden')!.target).toBe(TargetType.TAR_CHAR_SELF);
    });

    it('identify should target TAR_OBJ_INV', () => {
      expect(findSpell('identify')!.target).toBe(TargetType.TAR_OBJ_INV);
    });

    it('earthquake should target TAR_IGNORE', () => {
      expect(findSpell('earthquake')!.target).toBe(TargetType.TAR_IGNORE);
    });
  });

  describe('spell mana costs', () => {
    it('magic missile should have low mana cost', () => {
      const spell = findSpell('magic missile')!;
      expect(spell.minMana).toBeLessThanOrEqual(10);
    });

    it('meteor swarm should have high mana cost', () => {
      const spell = findSpell('meteor swarm')!;
      expect(spell.maxMana).toBeGreaterThanOrEqual(80);
    });
  });

  describe('spell functions', () => {
    it('all spells should have a spellFun', () => {
      const spells = getAllSpells();
      for (const spell of spells) {
        expect(typeof spell.spellFun).toBe('function');
      }
    });
  });
});
