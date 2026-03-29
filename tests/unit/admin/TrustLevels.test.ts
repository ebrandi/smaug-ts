import { describe, it, expect } from 'vitest';
import {
  TRUST_LEVELS,
  isImmortal,
  isHero,
  getTrustName,
} from '../../../src/admin/TrustLevels.js';

describe('TrustLevels', () => {
  describe('TRUST_LEVELS', () => {
    it('should have expected values', () => {
      expect(TRUST_LEVELS.MORTAL).toBe(0);
      expect(TRUST_LEVELS.AVATAR).toBe(50);
      expect(TRUST_LEVELS.NEOPHYTE).toBe(51);
      expect(TRUST_LEVELS.SUPREME).toBe(65);
    });
  });

  describe('isImmortal', () => {
    it('should return false for trust < 51', () => {
      expect(isImmortal(0)).toBe(false);
      expect(isImmortal(50)).toBe(false);
    });

    it('should return true for trust >= 51', () => {
      expect(isImmortal(51)).toBe(true);
      expect(isImmortal(65)).toBe(true);
    });
  });

  describe('isHero', () => {
    it('should return false for trust < 50', () => {
      expect(isHero(0)).toBe(false);
      expect(isHero(49)).toBe(false);
    });

    it('should return true for trust >= 50', () => {
      expect(isHero(50)).toBe(true);
      expect(isHero(51)).toBe(true);
    });
  });

  describe('getTrustName', () => {
    it('should return Mortal for 0', () => {
      expect(getTrustName(0)).toBe('Mortal');
    });

    it('should return Avatar for 50', () => {
      expect(getTrustName(50)).toBe('Avatar');
    });

    it('should return Neophyte for 51', () => {
      expect(getTrustName(51)).toBe('Neophyte');
    });

    it('should return Sub Implem for 60', () => {
      expect(getTrustName(60)).toBe('Sub Implem');
    });

    it('should return closest lower trust name for in-between values', () => {
      // Trust 5 is between MORTAL(0) and AVATAR(50)
      expect(getTrustName(5)).toBe('Mortal');
    });

    it('should return Supreme for 65', () => {
      expect(getTrustName(65)).toBe('Supreme');
    });
  });
});
