import { describe, it, expect } from 'vitest';
import {
  substituteVariables,
  getHeSheIt,
  getHimHerIt,
  getHisHerIts,
  type MudProgContext,
} from '../../../src/scripting/VariableSubstitution.js';
import { Sex } from '../../../src/game/entities/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

function makeChar(overrides: Partial<{ name: string; shortDescription: string; sex: number }> = {}): any {
  return {
    name: overrides.name ?? 'TestChar',
    shortDescription: overrides.shortDescription ?? 'a test character',
    sex: overrides.sex ?? Sex.Male,
    level: 10,
    hit: 100,
    maxHit: 100,
    ...overrides,
  };
}

function makeObj(overrides: Partial<{ name: string; shortDescription: string }> = {}): any {
  return {
    name: overrides.name ?? 'test sword',
    shortDescription: overrides.shortDescription ?? 'a gleaming test sword',
    itemType: 5,
    values: [0, 0, 0, 0, 0, 0],
    ...overrides,
  };
}

function makeContext(overrides: Partial<MudProgContext> = {}): MudProgContext {
  return {
    mob: makeChar({ name: 'Guardian', shortDescription: 'the Guardian', sex: Sex.Male }),
    actor: makeChar({ name: 'Frodo', shortDescription: 'Frodo the Hobbit', sex: Sex.Male }),
    victim: makeChar({ name: 'Sauron', shortDescription: 'the Dark Lord', sex: Sex.Male }),
    obj: makeObj({ name: 'the ring', shortDescription: 'the One Ring' }),
    arg: '',
    randomPC: makeChar({ name: 'Gandalf', shortDescription: 'Gandalf the Grey', sex: Sex.Male }),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('VariableSubstitution', () => {
  describe('getHeSheIt', () => {
    it('returns "he" for male characters', () => {
      expect(getHeSheIt(makeChar({ sex: Sex.Male }))).toBe('he');
    });

    it('returns "she" for female characters', () => {
      expect(getHeSheIt(makeChar({ sex: Sex.Female }))).toBe('she');
    });

    it('returns "it" for neutral characters', () => {
      expect(getHeSheIt(makeChar({ sex: Sex.Neutral }))).toBe('it');
    });

    it('returns "it" for null', () => {
      expect(getHeSheIt(null)).toBe('it');
    });
  });

  describe('getHimHerIt', () => {
    it('returns "him" for male characters', () => {
      expect(getHimHerIt(makeChar({ sex: Sex.Male }))).toBe('him');
    });

    it('returns "her" for female characters', () => {
      expect(getHimHerIt(makeChar({ sex: Sex.Female }))).toBe('her');
    });

    it('returns "it" for neutral characters', () => {
      expect(getHimHerIt(makeChar({ sex: Sex.Neutral }))).toBe('it');
    });

    it('returns "it" for null', () => {
      expect(getHimHerIt(null)).toBe('it');
    });
  });

  describe('getHisHerIts', () => {
    it('returns "his" for male characters', () => {
      expect(getHisHerIts(makeChar({ sex: Sex.Male }))).toBe('his');
    });

    it('returns "her" for female characters', () => {
      expect(getHisHerIts(makeChar({ sex: Sex.Female }))).toBe('her');
    });

    it('returns "its" for neutral characters', () => {
      expect(getHisHerIts(makeChar({ sex: Sex.Neutral }))).toBe('its');
    });

    it('returns "its" for null', () => {
      expect(getHisHerIts(null)).toBe('its');
    });
  });

  describe('substituteVariables', () => {
    it('substitutes $n with actor name', () => {
      const ctx = makeContext();
      expect(substituteVariables('Hello $n!', ctx)).toBe('Hello Frodo!');
    });

    it('substitutes $N with actor short description', () => {
      const ctx = makeContext();
      expect(substituteVariables('Hello $N!', ctx)).toBe('Hello Frodo the Hobbit!');
    });

    it('substitutes $i with mob name', () => {
      const ctx = makeContext();
      expect(substituteVariables('I am $i.', ctx)).toBe('I am Guardian.');
    });

    it('substitutes $I with mob short description', () => {
      const ctx = makeContext();
      expect(substituteVariables('I am $I.', ctx)).toBe('I am the Guardian.');
    });

    it('substitutes $t with victim name', () => {
      const ctx = makeContext();
      expect(substituteVariables('Beware of $t!', ctx)).toBe('Beware of Sauron!');
    });

    it('substitutes $T with victim short description', () => {
      const ctx = makeContext();
      expect(substituteVariables('Beware of $T!', ctx)).toBe('Beware of the Dark Lord!');
    });

    it('substitutes $r with random PC name', () => {
      const ctx = makeContext();
      expect(substituteVariables('Hey $r!', ctx)).toBe('Hey Gandalf!');
    });

    it('substitutes $R with random PC short description', () => {
      const ctx = makeContext();
      expect(substituteVariables('Hey $R!', ctx)).toBe('Hey Gandalf the Grey!');
    });

    it('substitutes $p with object name', () => {
      const ctx = makeContext();
      expect(substituteVariables('You see $p.', ctx)).toBe('You see the ring.');
    });

    it('substitutes $P with object short description', () => {
      const ctx = makeContext();
      expect(substituteVariables('You see $P.', ctx)).toBe('You see the One Ring.');
    });

    it('substitutes actor pronouns ($e, $m, $s)', () => {
      const ctx = makeContext({ actor: makeChar({ sex: Sex.Female }) });
      expect(substituteVariables('$e picks up $s sword.', ctx)).toBe('she picks up her sword.');
    });

    it('substitutes victim pronouns ($E, $M, $S)', () => {
      const ctx = makeContext({ victim: makeChar({ sex: Sex.Female }) });
      expect(substituteVariables('$E drops $S shield.', ctx)).toBe('she drops her shield.');
    });

    it('substitutes mob pronouns ($j, $k, $l)', () => {
      const ctx = makeContext({ mob: makeChar({ sex: Sex.Female }) });
      expect(substituteVariables('$j laughs at $k.', ctx)).toBe('she laughs at her.');
    });

    it('handles $$ as literal dollar sign', () => {
      const ctx = makeContext();
      expect(substituteVariables('Pay $$100 gold.', ctx)).toBe('Pay $100 gold.');
    });

    it('handles null actor gracefully', () => {
      const ctx = makeContext({ actor: null });
      expect(substituteVariables('Hello $n!', ctx)).toBe('Hello someone!');
    });

    it('handles null victim gracefully', () => {
      const ctx = makeContext({ victim: null });
      expect(substituteVariables('Beware of $t!', ctx)).toBe('Beware of someone!');
    });

    it('handles null object gracefully', () => {
      const ctx = makeContext({ obj: null });
      expect(substituteVariables('You see $p.', ctx)).toBe('You see something.');
    });

    it('handles null random PC gracefully', () => {
      const ctx = makeContext({ randomPC: null });
      expect(substituteVariables('Hey $r!', ctx)).toBe('Hey someone!');
    });

    it('handles multiple variables in one line', () => {
      const ctx = makeContext();
      expect(substituteVariables('$n gives $p to $t.', ctx)).toBe('Frodo gives the ring to Sauron.');
    });

    it('leaves unknown $-codes as-is', () => {
      const ctx = makeContext();
      expect(substituteVariables('$x is unknown.', ctx)).toBe('$x is unknown.');
    });

    it('handles empty string', () => {
      const ctx = makeContext();
      expect(substituteVariables('', ctx)).toBe('');
    });

    it('handles string with no variables', () => {
      const ctx = makeContext();
      expect(substituteVariables('Hello world!', ctx)).toBe('Hello world!');
    });
  });
});
