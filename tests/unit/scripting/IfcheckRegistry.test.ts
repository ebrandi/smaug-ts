import { describe, it, expect, beforeEach } from 'vitest';
import {
  IfcheckRegistry,
  compareNumeric,
  setGameHour,
} from '../../../src/scripting/IfcheckRegistry.js';
import type { MudProgContext } from '../../../src/scripting/VariableSubstitution.js';
import { Sex, AFF, Position } from '../../../src/game/entities/types.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Mobile as MobileClass } from '../../../src/game/entities/Mobile.js';

// =============================================================================
// Test Helpers
// =============================================================================

function makeChar(overrides: Record<string, unknown> = {}): any {
  return {
    name: 'TestMob',
    shortDescription: 'a test mob',
    sex: Sex.Male,
    level: 10,
    hit: 80,
    maxHit: 100,
    mana: 50,
    maxMana: 100,
    move: 60,
    maxMove: 100,
    gold: 500,
    alignment: 0,
    position: Position.Standing,
    affectedBy: 0n,
    actFlags: 0n,
    armor: 100,
    hitroll: 5,
    damroll: 3,
    fighting: null,
    master: null,
    mount: null,
    class_: 'warrior',
    race: 'human',
    trust: 0,
    wimpy: 0,
    numAttacks: 1,
    style: 0,
    affects: [],
    inventory: [],
    equipment: new Map(),
    inRoom: null,
    wasInRoom: null,
    permStats: { str: 15, int: 13, wis: 14, dex: 16, con: 15, cha: 12, lck: 13 },
    modStats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0, lck: 0 },
    getStat(stat: string) {
      const p = (this as any).permStats[stat] ?? 13;
      const m = (this as any).modStats[stat] ?? 0;
      return p + m;
    },
    ...overrides,
  };
}

function makePlayer(overrides: Record<string, unknown> = {}): any {
  const p = new Player({ name: 'TestPlayer', level: 10 });
  Object.assign(p, overrides);
  return p;
}

function makeContext(overrides: Partial<MudProgContext> = {}): MudProgContext {
  return {
    mob: makeChar({ name: 'GuardMob' }),
    actor: makeChar({ name: 'Hero' }),
    victim: null,
    obj: null,
    arg: '',
    randomPC: null,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('IfcheckRegistry', () => {
  describe('compareNumeric', () => {
    it('handles == operator', () => {
      expect(compareNumeric(10, '==', 10)).toBe(true);
      expect(compareNumeric(10, '==', 5)).toBe(false);
    });

    it('handles != operator', () => {
      expect(compareNumeric(10, '!=', 5)).toBe(true);
      expect(compareNumeric(10, '!=', 10)).toBe(false);
    });

    it('handles > operator', () => {
      expect(compareNumeric(10, '>', 5)).toBe(true);
      expect(compareNumeric(5, '>', 10)).toBe(false);
    });

    it('handles < operator', () => {
      expect(compareNumeric(5, '<', 10)).toBe(true);
      expect(compareNumeric(10, '<', 5)).toBe(false);
    });

    it('handles >= operator', () => {
      expect(compareNumeric(10, '>=', 10)).toBe(true);
      expect(compareNumeric(10, '>=', 5)).toBe(true);
      expect(compareNumeric(5, '>=', 10)).toBe(false);
    });

    it('handles <= operator', () => {
      expect(compareNumeric(10, '<=', 10)).toBe(true);
      expect(compareNumeric(5, '<=', 10)).toBe(true);
      expect(compareNumeric(10, '<=', 5)).toBe(false);
    });

    it('defaults to equality for unknown operators', () => {
      expect(compareNumeric(10, 'x', 10)).toBe(true);
      expect(compareNumeric(10, '', 10)).toBe(true);
    });
  });

  describe('registry size', () => {
    it('has 50+ registered ifchecks', () => {
      expect(IfcheckRegistry.size).toBeGreaterThanOrEqual(50);
    });
  });

  describe('boolean checks', () => {
    it('ispc returns true for Player instances', () => {
      const player = makePlayer();
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('ispc', player, '', '', ctx)).toBe(true);
    });

    it('ispc returns false for non-Player objects', () => {
      const mob = makeChar();
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('ispc', mob, '', '', ctx)).toBe(false);
    });

    it('isgood returns true for alignment > 350', () => {
      const ch = makeChar({ alignment: 500 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isgood', ch, '', '', ctx)).toBe(true);
    });

    it('isgood returns false for alignment <= 350', () => {
      const ch = makeChar({ alignment: 350 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isgood', ch, '', '', ctx)).toBe(false);
    });

    it('isevil returns true for alignment < -350', () => {
      const ch = makeChar({ alignment: -500 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isevil', ch, '', '', ctx)).toBe(true);
    });

    it('isevil returns false for alignment >= -350', () => {
      const ch = makeChar({ alignment: -350 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isevil', ch, '', '', ctx)).toBe(false);
    });

    it('isneutral returns true for -350 <= alignment <= 350', () => {
      const ch = makeChar({ alignment: 0 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isneutral', ch, '', '', ctx)).toBe(true);
    });

    it('isfight returns true when character is fighting', () => {
      const ch = makeChar({ fighting: makeChar() });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isfight', ch, '', '', ctx)).toBe(true);
    });

    it('isfight returns false when character is not fighting', () => {
      const ch = makeChar({ fighting: null });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isfight', ch, '', '', ctx)).toBe(false);
    });

    it('isimmort returns true for level >= 51', () => {
      const ch = makeChar({ level: 51 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isimmort', ch, '', '', ctx)).toBe(true);
    });

    it('isimmort returns false for level < 51', () => {
      const ch = makeChar({ level: 50 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isimmort', ch, '', '', ctx)).toBe(false);
    });

    it('ischarmed returns true when CHARM affect is set', () => {
      const ch = makeChar({ affectedBy: AFF.CHARM });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('ischarmed', ch, '', '', ctx)).toBe(true);
    });

    it('isfollow returns true when master is set', () => {
      const ch = makeChar({ master: makeChar() });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isfollow', ch, '', '', ctx)).toBe(true);
    });

    it('isflying returns true with FLYING affect', () => {
      const ch = makeChar({ affectedBy: AFF.FLYING });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isflying', ch, '', '', ctx)).toBe(true);
    });

    it('ispoisoned checks POISON affect', () => {
      const ch = makeChar({ affectedBy: AFF.POISON });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('ispoisoned', ch, '', '', ctx)).toBe(true);
    });

    it('issancted checks SANCTUARY affect', () => {
      const ch = makeChar({ affectedBy: AFF.SANCTUARY });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('issancted', ch, '', '', ctx)).toBe(true);
    });

    it('isblind checks BLIND affect', () => {
      const ch = makeChar({ affectedBy: AFF.BLIND });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isblind', ch, '', '', ctx)).toBe(true);
    });

    it('issleeping checks Position.Sleeping', () => {
      const ch = makeChar({ position: Position.Sleeping });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('issleeping', ch, '', '', ctx)).toBe(true);
    });

    it('isawake checks position > Sleeping', () => {
      const ch = makeChar({ position: Position.Standing });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isawake', ch, '', '', ctx)).toBe(true);
    });
  });

  describe('numeric comparisons', () => {
    it('level comparison works', () => {
      const ch = makeChar({ level: 15 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('level', ch, '>', '10', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('level', ch, '<', '10', ctx)).toBe(false);
      expect(IfcheckRegistry.evaluate('level', ch, '==', '15', ctx)).toBe(true);
    });

    it('hitprcnt calculates percentage correctly', () => {
      const ch = makeChar({ hit: 50, maxHit: 100 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('hitprcnt', ch, '==', '50', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('hitprcnt', ch, '<=', '60', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('hitprcnt', ch, '>', '60', ctx)).toBe(false);
    });

    it('goldamt comparison works', () => {
      const ch = makeChar({ gold: 500 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('goldamt', ch, '>=', '500', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('goldamt', ch, '>', '500', ctx)).toBe(false);
    });

    it('sex comparison works', () => {
      const ch = makeChar({ sex: Sex.Female });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('sex', ch, '==', '2', ctx)).toBe(true);
    });

    it('position comparison works', () => {
      const ch = makeChar({ position: Position.Standing });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('position', ch, '==', '11', ctx)).toBe(true);
    });

    it('armor comparison works', () => {
      const ch = makeChar({ armor: 80 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('armor', ch, '<', '100', ctx)).toBe(true);
    });

    it('hp comparison works', () => {
      const ch = makeChar({ hit: 42 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('hp', ch, '==', '42', ctx)).toBe(true);
    });

    it('mana comparison works', () => {
      const ch = makeChar({ mana: 75 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('mana', ch, '>=', '50', ctx)).toBe(true);
    });

    it('alignment comparison works', () => {
      const ch = makeChar({ alignment: -500 });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('alignment', ch, '<', '0', ctx)).toBe(true);
    });
  });

  describe('string comparisons', () => {
    it('name comparison (case-insensitive)', () => {
      const ch = makeChar({ name: 'Gandalf' });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('name', ch, '==', 'gandalf', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('name', ch, '!=', 'frodo', ctx)).toBe(true);
    });

    it('class comparison works', () => {
      const ch = makeChar({ class_: 'mage' });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('class', ch, '==', 'mage', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('class', ch, '!=', 'warrior', ctx)).toBe(true);
    });

    it('race comparison works', () => {
      const ch = makeChar({ race: 'elf' });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('race', ch, '==', 'elf', ctx)).toBe(true);
    });
  });

  describe('room checks', () => {
    it('inroom checks character room vnum', () => {
      const ch = makeChar({ inRoom: { vnum: 3001 } });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('inroom', ch, '==', '3001', ctx)).toBe(true);
    });

    it('inroom returns 0 for null room', () => {
      const ch = makeChar({ inRoom: null });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('inroom', ch, '==', '0', ctx)).toBe(true);
    });
  });

  describe('affect checks', () => {
    it('isaffected checks bitvector flag', () => {
      const ch = makeChar({ affectedBy: AFF.SANCTUARY | AFF.FLYING });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isaffected', ch, '', AFF.SANCTUARY.toString(), ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('isaffected', ch, '', AFF.BLIND.toString(), ctx)).toBe(false);
    });

    it('hasaffect checks affect type', () => {
      const ch = makeChar({ affects: [{ type: 42 }] });
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('hasaffect', ch, '', '42', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('hasaffect', ch, '', '99', ctx)).toBe(false);
    });
  });

  describe('random check', () => {
    it('rand(100) always returns true', () => {
      const ctx = makeContext();
      // rand passes the value as target
      expect(IfcheckRegistry.evaluate('rand', 100, '', '', ctx)).toBe(true);
    });

    it('rand(0) always returns false', () => {
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('rand', 0, '', '', ctx)).toBe(false);
    });
  });

  describe('time checks', () => {
    beforeEach(() => {
      setGameHour(12);
    });

    it('isday returns true during day hours (6-19)', () => {
      setGameHour(12);
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isday', null, '', '', ctx)).toBe(true);
    });

    it('isday returns false during night hours', () => {
      setGameHour(22);
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isday', null, '', '', ctx)).toBe(false);
    });

    it('isnight returns true during night hours', () => {
      setGameHour(3);
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('isnight', null, '', '', ctx)).toBe(true);
    });

    it('timeis comparison works', () => {
      setGameHour(14);
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('timeis', null, '==', '14', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('timeis', null, '>', '10', ctx)).toBe(true);
    });
  });

  describe('room existence checks', () => {
    it('mobinroom checks for mobile by vnum', () => {
      const proto = {
        vnum: 1001,
        name: 'guard',
        shortDesc: 'a guard',
        longDesc: '',
        description: '',
        actFlags: 0n,
        affectedBy: 0n,
        alignment: 0,
        level: 5,
        hitroll: 0,
        damroll: 0,
        hitDice: { num: 1, size: 8, bonus: 10 },
        damageDice: { num: 1, size: 4, bonus: 0 },
        gold: 0,
        exp: 0,
        sex: 0,
        position: 11,
        defaultPosition: 11,
        race: 'human',
        class: 'warrior',
        savingThrows: [0, 0, 0, 0, 0],
        resistant: 0n,
        immune: 0n,
        susceptible: 0n,
        speaks: 0,
        speaking: 0,
        numAttacks: 1,
        extraDescriptions: [],
        shop: null,
        repairShop: null,
      };
      const mob = new MobileClass(proto);
      const room = { characters: [mob], contents: [] };
      const ctx = makeContext({ mob: makeChar({ inRoom: room }) });
      expect(IfcheckRegistry.evaluate('mobinroom', null, '', '1001', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('mobinroom', null, '', '9999', ctx)).toBe(false);
    });
  });

  describe('visibility checks', () => {
    it('cansee returns true for visible characters', () => {
      const target = makeChar({ affectedBy: 0n });
      const ctx = makeContext({ mob: makeChar({ affectedBy: 0n }) });
      expect(IfcheckRegistry.evaluate('cansee', target, '', '', ctx)).toBe(true);
    });

    it('cansee returns false for invisible without detect invis', () => {
      const target = makeChar({ affectedBy: AFF.INVISIBLE });
      const ctx = makeContext({ mob: makeChar({ affectedBy: 0n }) });
      expect(IfcheckRegistry.evaluate('cansee', target, '', '', ctx)).toBe(false);
    });

    it('cansee returns true for invisible with detect invis', () => {
      const target = makeChar({ affectedBy: AFF.INVISIBLE });
      const ctx = makeContext({ mob: makeChar({ affectedBy: AFF.DETECT_INVIS }) });
      expect(IfcheckRegistry.evaluate('cansee', target, '', '', ctx)).toBe(true);
    });
  });

  describe('unknown checks', () => {
    it('returns false for unknown ifcheck names', () => {
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('nonexistent', null, '', '', ctx)).toBe(false);
    });

    it('has() returns false for unknown names', () => {
      expect(IfcheckRegistry.has('nonexistent')).toBe(false);
    });

    it('has() returns true for known names', () => {
      expect(IfcheckRegistry.has('ispc')).toBe(true);
      expect(IfcheckRegistry.has('level')).toBe(true);
      expect(IfcheckRegistry.has('rand')).toBe(true);
    });
  });

  describe('custom registration', () => {
    it('allows registering custom ifchecks', () => {
      IfcheckRegistry.register('customcheck', (target) => target === 'magic');
      const ctx = makeContext();
      expect(IfcheckRegistry.evaluate('customcheck', 'magic', '', '', ctx)).toBe(true);
      expect(IfcheckRegistry.evaluate('customcheck', 'mundane', '', '', ctx)).toBe(false);
    });
  });
});
