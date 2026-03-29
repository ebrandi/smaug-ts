import { describe, it, expect } from 'vitest';
import {
  getStatModifier,
  getStrModifier,
  getIntModifier,
  getWisModifier,
  getDexModifier,
  getConModifier,
  getChaModifier,
  getLckModifier,
  type StrModifier,
  type IntModifier,
  type WisModifier,
  type DexModifier,
  type ConModifier,
  type ChaModifier,
  type LckModifier,
} from '../../../src/game/affects/StatModifier.js';

describe('StatModifier', () => {
  describe('getStatModifier', () => {
    it('should throw for unknown stat name', () => {
      expect(() => getStatModifier('foo', 10)).toThrow('Unknown stat: foo');
    });

    it('should clamp values below 0 to index 0', () => {
      const result = getStrModifier(-5);
      expect(result.toHit).toBe(-5);
      expect(result.toDam).toBe(-4);
    });

    it('should clamp values above 25 to index 25', () => {
      const result = getStrModifier(99);
      expect(result.toHit).toBe(10);
      expect(result.toDam).toBe(12);
    });

    it('should be case-insensitive for stat name', () => {
      const r1 = getStatModifier('STR', 18);
      const r2 = getStatModifier('str', 18);
      expect(r1).toEqual(r2);
    });
  });

  describe('STR table', () => {
    it('STR 1 should have toHit=-5, toDam=-4, carry=3, wield=1', () => {
      const m = getStrModifier(1);
      expect(m.toHit).toBe(-5);
      expect(m.toDam).toBe(-4);
      expect(m.carry).toBe(3);
      expect(m.wield).toBe(1);
    });

    it('STR 10 should have toHit=0, toDam=0, carry=115', () => {
      const m = getStrModifier(10);
      expect(m.toHit).toBe(0);
      expect(m.toDam).toBe(0);
      expect(m.carry).toBe(115);
    });

    it('STR 18 should have toHit=2, toDam=4, carry=250, wield=25', () => {
      const m = getStrModifier(18);
      expect(m.toHit).toBe(2);
      expect(m.toDam).toBe(4);
      expect(m.carry).toBe(250);
      expect(m.wield).toBe(25);
    });

    it('STR 25 should have toHit=10, toDam=12, carry=1000, wield=60', () => {
      const m = getStrModifier(25);
      expect(m.toHit).toBe(10);
      expect(m.toDam).toBe(12);
      expect(m.carry).toBe(1000);
      expect(m.wield).toBe(60);
    });

    it('STR 14 should have toDam=1', () => {
      expect(getStrModifier(14).toDam).toBe(1);
    });
  });

  describe('INT table', () => {
    it('INT 0 should have learn=3', () => {
      expect(getIntModifier(0).learn).toBe(3);
    });

    it('INT 10 should have learn=17', () => {
      expect(getIntModifier(10).learn).toBe(17);
    });

    it('INT 18 should have learn=34', () => {
      expect(getIntModifier(18).learn).toBe(34);
    });

    it('INT 25 should have learn=65', () => {
      expect(getIntModifier(25).learn).toBe(65);
    });
  });

  describe('WIS table', () => {
    it('WIS 1 should have practice=0', () => {
      expect(getWisModifier(1).practice).toBe(0);
    });

    it('WIS 11 should have practice=2', () => {
      expect(getWisModifier(11).practice).toBe(2);
    });

    it('WIS 18 should have practice=5', () => {
      expect(getWisModifier(18).practice).toBe(5);
    });

    it('WIS 25 should have practice=7', () => {
      expect(getWisModifier(25).practice).toBe(7);
    });
  });

  describe('DEX table', () => {
    it('DEX 0 should have defensive=60', () => {
      expect(getDexModifier(0).defensive).toBe(60);
    });

    it('DEX 10 should have defensive=0', () => {
      expect(getDexModifier(10).defensive).toBe(0);
    });

    it('DEX 18 should have defensive=-30', () => {
      expect(getDexModifier(18).defensive).toBe(-30);
    });

    it('DEX 25 should have defensive=-120', () => {
      expect(getDexModifier(25).defensive).toBe(-120);
    });
  });

  describe('CON table', () => {
    it('CON 0 should have hitp=-4, shock=20', () => {
      const m = getConModifier(0);
      expect(m.hitp).toBe(-4);
      expect(m.shock).toBe(20);
    });

    it('CON 10 should have hitp=0, shock=70', () => {
      const m = getConModifier(10);
      expect(m.hitp).toBe(0);
      expect(m.shock).toBe(70);
    });

    it('CON 15 should have hitp=1, shock=90', () => {
      const m = getConModifier(15);
      expect(m.hitp).toBe(1);
      expect(m.shock).toBe(90);
    });

    it('CON 18 should have hitp=4, shock=99', () => {
      const m = getConModifier(18);
      expect(m.hitp).toBe(4);
      expect(m.shock).toBe(99);
    });

    it('CON 25 should have hitp=11, shock=99', () => {
      const m = getConModifier(25);
      expect(m.hitp).toBe(11);
      expect(m.shock).toBe(99);
    });
  });

  describe('CHA table', () => {
    it('CHA 0 should have charm=-60', () => {
      expect(getChaModifier(0).charm).toBe(-60);
    });

    it('CHA 10 should have charm=0', () => {
      expect(getChaModifier(10).charm).toBe(0);
    });

    it('CHA 18 should have charm=15', () => {
      expect(getChaModifier(18).charm).toBe(15);
    });

    it('CHA 25 should have charm=50', () => {
      expect(getChaModifier(25).charm).toBe(50);
    });
  });

  describe('LCK table', () => {
    it('LCK 0 should have luck=-60', () => {
      expect(getLckModifier(0).luck).toBe(-60);
    });

    it('LCK 10 should have luck=0', () => {
      expect(getLckModifier(10).luck).toBe(0);
    });

    it('LCK 18 should have luck=15', () => {
      expect(getLckModifier(18).luck).toBe(15);
    });

    it('LCK 25 should have luck=50', () => {
      expect(getLckModifier(25).luck).toBe(50);
    });
  });

  describe('all tables have 26 entries (0-25)', () => {
    const stats = ['str', 'int', 'wis', 'dex', 'con', 'cha', 'lck'];
    for (const stat of stats) {
      it(`${stat} table should return values for 0-25`, () => {
        for (let i = 0; i <= 25; i++) {
          expect(() => getStatModifier(stat, i)).not.toThrow();
          expect(getStatModifier(stat, i)).toBeDefined();
        }
      });
    }
  });
});
