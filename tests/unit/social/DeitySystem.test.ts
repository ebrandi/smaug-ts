import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { Position } from '../../../src/game/entities/types.js';
import {
  DeityData,
  getDeity,
  getAllDeities,
  setDeity,
  clearDeities,
  setMoveCharToRoom,
  modifyFavour,
  doWorship,
  doSupplicate,
  createDefaultDeity,
} from '../../../src/game/social/DeitySystem.js';

// =============================================================================
// Helpers
// =============================================================================

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

let lastOutput: string;

function makePlayer(name: string, level = 15, alignment = 0): Player {
  lastOutput = '';
  const p = new Player({
    name,
    level,
    position: Position.Standing,
    gold: 1000,
    alignment,
  });
  p.descriptor = {
    ...mockDescriptor,
    write(text: string) { lastOutput += text; },
  } as any;
  return p;
}

function makeDeity(overrides: Partial<DeityData> = {}): DeityData {
  return { ...createDefaultDeity('TestGod'), ...overrides };
}

// =============================================================================
// Tests
// =============================================================================

describe('DeitySystem', () => {
  beforeEach(() => {
    clearDeities();
    setMoveCharToRoom(() => true);
  });

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------
  describe('storage', () => {
    it('setDeity / getDeity round trip', () => {
      const d = makeDeity({ name: 'Athena' });
      setDeity(d);
      expect(getDeity('Athena')).toBe(d);
      expect(getDeity('athena')).toBe(d);
    });

    it('getAllDeities returns all', () => {
      setDeity(makeDeity({ name: 'A' }));
      setDeity(makeDeity({ name: 'B' }));
      expect(getAllDeities()).toHaveLength(2);
    });

    it('clearDeities empties storage', () => {
      setDeity(makeDeity({ name: 'X' }));
      clearDeities();
      expect(getAllDeities()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // doWorship
  // ---------------------------------------------------------------------------
  describe('doWorship', () => {
    it('worship with no arg shows current deity', () => {
      setDeity(makeDeity({ name: 'Athena', description: 'Wisdom goddess' }));
      const ch = makePlayer('Worshipper');
      ch.pcData.deityName = 'Athena';
      ch.pcData.favour = 50;

      doWorship(ch, '');
      expect(lastOutput).toContain('Athena');
      expect(lastOutput).toContain('50');
    });

    it('worship with no arg and no deity', () => {
      const ch = makePlayer('Atheist');
      doWorship(ch, '');
      expect(lastOutput).toContain('do not worship');
    });

    it('successfully worships a deity', () => {
      const deity = makeDeity({ name: 'Athena', minAlign: -500, maxAlign: 500 });
      setDeity(deity);

      const ch = makePlayer('Devotee', 15, 0);  // alignment 0
      doWorship(ch, 'Athena');

      expect(ch.pcData.deityName).toBe('Athena');
      expect(ch.pcData.favour).toBe(0);
      expect(deity.worshippers).toBe(1);
      expect(lastOutput).toContain('worshipper of Athena');
    });

    it('rejects worship with incompatible alignment', () => {
      setDeity(makeDeity({ name: 'Evil', minAlign: -1000, maxAlign: -500 }));

      const ch = makePlayer('Good', 15, 500);  // alignment +500
      doWorship(ch, 'Evil');

      expect(ch.pcData.deityName).toBeNull();
      expect(lastOutput).toContain('alignment');
    });

    it('rejects worship with incompatible race', () => {
      setDeity(makeDeity({ name: 'ElfGod', race: 1 }));  // Elf

      const ch = makePlayer('Human', 15, 0);
      ch.race = 'human';
      doWorship(ch, 'ElfGod');

      expect(ch.pcData.deityName).toBeNull();
      expect(lastOutput).toContain('race');
    });

    it('rejects worship with incompatible class', () => {
      setDeity(makeDeity({ name: 'WarGod', charClass: 3 }));  // Warrior

      const ch = makePlayer('Mage', 15, 0);
      ch.class_ = 'mage';
      doWorship(ch, 'WarGod');

      expect(ch.pcData.deityName).toBeNull();
      expect(lastOutput).toContain('class');
    });

    it('must renounce current deity first', () => {
      setDeity(makeDeity({ name: 'OldGod' }));
      setDeity(makeDeity({ name: 'NewGod' }));

      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'OldGod';

      doWorship(ch, 'NewGod');
      expect(ch.pcData.deityName).toBe('OldGod');
      expect(lastOutput).toContain('renounce');
    });

    it('renounce current deity', () => {
      const deity = makeDeity({ name: 'OldGod', worshippers: 3 });
      setDeity(deity);

      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'OldGod';
      ch.pcData.favour = 100;

      doWorship(ch, 'renounce');
      expect(ch.pcData.deityName).toBeNull();
      expect(ch.pcData.favour).toBe(0);
      expect(deity.worshippers).toBe(2);
    });

    it('rejects unknown deity', () => {
      const ch = makePlayer('Devotee');
      doWorship(ch, 'Nonexistent');
      expect(lastOutput).toContain('No such deity');
    });
  });

  // ---------------------------------------------------------------------------
  // doSupplicate
  // ---------------------------------------------------------------------------
  describe('doSupplicate', () => {
    it('supplicate recall teleports player', () => {
      setDeity(makeDeity({ name: 'God', recallRoom: 3001, recallCost: 50 }));

      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 100;

      let movedTo = -1;
      setMoveCharToRoom((_, vnum) => { movedTo = vnum; return true; });

      doSupplicate(ch, 'recall');

      expect(movedTo).toBe(3001);
      expect(ch.pcData.favour).toBe(50);
      expect(lastOutput).toContain('transports you');
    });

    it('supplicate recall fails with insufficient favour', () => {
      setDeity(makeDeity({ name: 'God', recallRoom: 3001, recallCost: 50 }));

      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 10;

      doSupplicate(ch, 'recall');
      expect(lastOutput).toContain('not have enough favour');
    });

    it('supplicate recall refunds if move fails', () => {
      setDeity(makeDeity({ name: 'God', recallRoom: 3001, recallCost: 50 }));

      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 100;

      setMoveCharToRoom(() => false);

      doSupplicate(ch, 'recall');
      expect(ch.pcData.favour).toBe(100);
      expect(lastOutput).toContain('cannot transport');
    });

    it('supplicate heal restores HP', () => {
      setDeity(makeDeity({ name: 'God', spellAid: 30 }));

      const ch = makePlayer('Devotee', 20);
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 50;
      ch.hit = 50;
      ch.maxHit = 200;

      doSupplicate(ch, 'heal');

      // healAmount = level * 2 = 40
      expect(ch.hit).toBe(90);
      expect(ch.pcData.favour).toBe(20);
      expect(lastOutput).toContain('heals your wounds');
    });

    it('supplicate heal caps at maxHit', () => {
      setDeity(makeDeity({ name: 'God', spellAid: 10 }));

      const ch = makePlayer('Devotee', 20);
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 50;
      ch.hit = 195;
      ch.maxHit = 200;

      doSupplicate(ch, 'heal');
      expect(ch.hit).toBe(200);
    });

    it('supplicate avatar deducts favour', () => {
      setDeity(makeDeity({ name: 'God', avatarVnum: 9001, avatarCost: 500 }));

      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 600;

      doSupplicate(ch, 'avatar');
      expect(ch.pcData.favour).toBe(100);
      expect(lastOutput).toContain('sends an avatar');
    });

    it('supplicate avatar rejects without enough favour', () => {
      setDeity(makeDeity({ name: 'God', avatarVnum: 9001, avatarCost: 500 }));

      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 100;

      doSupplicate(ch, 'avatar');
      expect(lastOutput).toContain('not have enough');
    });

    it('rejects without deity', () => {
      const ch = makePlayer('Atheist');
      doSupplicate(ch, 'recall');
      expect(lastOutput).toContain('do not worship');
    });

    it('shows syntax on empty subcommand', () => {
      setDeity(makeDeity({ name: 'God' }));
      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      doSupplicate(ch, '');
      expect(lastOutput).toContain('recall, heal, avatar');
    });
  });

  // ---------------------------------------------------------------------------
  // modifyFavour
  // ---------------------------------------------------------------------------
  describe('modifyFavour', () => {
    it('increases favour', () => {
      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 100;

      modifyFavour(ch, 50);
      expect(ch.pcData.favour).toBe(150);
    });

    it('clamps to max 2500', () => {
      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 2400;

      modifyFavour(ch, 200);
      expect(ch.pcData.favour).toBe(2500);
    });

    it('clamps to min -2500', () => {
      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = -2400;

      modifyFavour(ch, -200);
      expect(ch.pcData.favour).toBe(-2500);
    });

    it('does nothing if no deity', () => {
      const ch = makePlayer('Atheist');
      ch.pcData.favour = 100;

      modifyFavour(ch, 50);
      expect(ch.pcData.favour).toBe(100);
    });

    it('decreases favour', () => {
      const ch = makePlayer('Devotee');
      ch.pcData.deityName = 'God';
      ch.pcData.favour = 100;

      modifyFavour(ch, -30);
      expect(ch.pcData.favour).toBe(70);
    });
  });
});
