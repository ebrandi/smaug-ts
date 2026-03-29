import { describe, it, expect, vi, beforeEach } from 'vitest';
import { savingThrow } from '../../../src/game/spells/SavingThrows.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { SaveType } from '../../../src/game/entities/types.js';
import * as Dice from '../../../src/utils/Dice.js';

class TestCharacter extends Character {
  messages: string[] = [];
  get isNpc(): boolean { return false; }
  sendToChar(text: string): void { this.messages.push(text); }
}

function makeChar(init?: Partial<CharacterInit>): TestCharacter {
  return new TestCharacter({
    name: 'TestVictim',
    level: 10,
    ...init,
  });
}

describe('SavingThrows', () => {
  describe('savingThrow()', () => {
    it('should return true (saved) when roll is low and victim has level advantage', () => {
      const victim = makeChar({ level: 30, savingSpell: -5 });
      // saveChance = 50 + (30-10)*2 + (-5) = 50 + 40 - 5 = 85
      // Roll < 85 = save
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(50);
      const result = savingThrow(10, victim, SaveType.SpellStaff);
      expect(result).toBe(true);
      vi.restoreAllMocks();
    });

    it('should return false (failed) when roll is high and attacker has level advantage', () => {
      const victim = makeChar({ level: 5, savingSpell: 0 });
      // saveChance = 50 + (5-20)*2 + 0 = 50 - 30 = 20
      // Roll 90 >= 20 → fail
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(90);
      const result = savingThrow(20, victim, SaveType.SpellStaff);
      expect(result).toBe(false);
      vi.restoreAllMocks();
    });

    it('should clamp save chance to minimum 5%', () => {
      const victim = makeChar({ level: 1, savingSpell: 20 });
      // saveChance = 50 + (1-50)*2 + 20 = 50 - 98 + 20 = -28 → clamped to 5
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(3);
      const result = savingThrow(50, victim, SaveType.SpellStaff);
      expect(result).toBe(true); // 3 < 5
      vi.restoreAllMocks();
    });

    it('should clamp save chance to maximum 95%', () => {
      const victim = makeChar({ level: 50, savingSpell: -30 });
      // saveChance = 50 + (50-1)*2 + (-30) = 50 + 98 - 30 = 118 → clamped to 95
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(96);
      const result = savingThrow(1, victim, SaveType.SpellStaff);
      expect(result).toBe(false); // 96 >= 95
      vi.restoreAllMocks();
    });

    it('should use savingPoison for PoisonDeath save type', () => {
      const victim = makeChar({ level: 10, savingPoison: -10 });
      // saveChance = 50 + (10-10)*2 + (-10) = 40
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(30);
      const result = savingThrow(10, victim, SaveType.PoisonDeath);
      expect(result).toBe(true); // 30 < 40
      vi.restoreAllMocks();
    });

    it('should use savingRod for Wands save type', () => {
      const victim = makeChar({ level: 10, savingRod: -15 });
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(30);
      const result = savingThrow(10, victim, SaveType.Wands);
      expect(result).toBe(true); // 30 < 35
      vi.restoreAllMocks();
    });

    it('should use savingPara for ParaPetri save type', () => {
      const victim = makeChar({ level: 10, savingPara: -5 });
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(44);
      const result = savingThrow(10, victim, SaveType.ParaPetri);
      expect(result).toBe(true); // 44 < 45
      vi.restoreAllMocks();
    });

    it('should use savingBreath for Breath save type', () => {
      const victim = makeChar({ level: 10, savingBreath: 5 });
      // saveChance = 50 + 0 + 5 = 55
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(56);
      const result = savingThrow(10, victim, SaveType.Breath);
      expect(result).toBe(false); // 56 >= 55
      vi.restoreAllMocks();
    });

    it('should handle equal levels', () => {
      const victim = makeChar({ level: 10, savingSpell: 0 });
      // saveChance = 50 + 0 + 0 = 50
      vi.spyOn(Dice, 'numberPercent').mockReturnValue(49);
      expect(savingThrow(10, victim, SaveType.SpellStaff)).toBe(true);
      vi.restoreAllMocks();
    });
  });
});
