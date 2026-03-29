import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { Position } from '../../../src/game/entities/types.js';
import { hasFlag } from '../../../src/utils/BitVector.js';
import {
  ClanType,
  ClanData,
  getClan,
  getAllClans,
  setClan,
  clearClans,
  createDefaultClan,
  doInduct,
  doOutcast,
  doClanList,
  doClanInfo,
  doMakeClan,
  doCset,
  doClanDonate,
  getClanRecall,
  hasClanStoreAccess,
  setPlayerFinder,
} from '../../../src/game/social/ClanSystem.js';

// =============================================================================
// Helpers
// =============================================================================

const PCFLAG_DEADLY = 1n << 12n;

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

let lastOutput: string;

function makePlayer(name: string, level = 15, gold = 1000): Player {
  lastOutput = '';
  const p = new Player({
    name,
    level,
    position: Position.Standing,
    gold,
  });
  p.descriptor = {
    ...mockDescriptor,
    write(text: string) { lastOutput += text; },
  } as any;
  return p;
}

function makeClan(overrides: Partial<ClanData> = {}): ClanData {
  return { ...createDefaultClan('TestClan'), leader: 'Leader', ...overrides };
}

// =============================================================================
// Tests
// =============================================================================

describe('ClanSystem', () => {
  beforeEach(() => {
    clearClans();
    setPlayerFinder(() => undefined);
  });

  // ---------------------------------------------------------------------------
  // In-memory storage
  // ---------------------------------------------------------------------------
  describe('storage', () => {
    it('setClan / getClan round trip', () => {
      const clan = makeClan({ name: 'Alpha' });
      setClan(clan);
      expect(getClan('Alpha')).toBe(clan);
      expect(getClan('alpha')).toBe(clan);  // case-insensitive
    });

    it('getAllClans returns all', () => {
      setClan(makeClan({ name: 'A' }));
      setClan(makeClan({ name: 'B' }));
      expect(getAllClans()).toHaveLength(2);
    });

    it('getClan returns undefined for unknown', () => {
      expect(getClan('nonexistent')).toBeUndefined();
    });

    it('clearClans empties the map', () => {
      setClan(makeClan({ name: 'X' }));
      clearClans();
      expect(getAllClans()).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // doInduct
  // ---------------------------------------------------------------------------
  describe('doInduct', () => {
    it('inducts an eligible player', () => {
      const clan = makeClan({ name: 'Warriors', leader: 'Boss' });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'Warriors';

      const recruit = makePlayer('Recruit', 15);
      setPlayerFinder((n) => n.toLowerCase() === 'recruit' ? recruit : undefined);

      let bossOutput = '';
      boss.descriptor = { ...mockDescriptor, write(t: string) { bossOutput += t; } } as any;
      let recruitOutput = '';
      recruit.descriptor = { ...mockDescriptor, write(t: string) { recruitOutput += t; } } as any;

      doInduct(boss, 'Recruit');

      expect(recruit.pcData.clanName).toBe('Warriors');
      expect(clan.members).toBe(1);
      expect(bossOutput).toContain('You induct Recruit into Warriors');
      expect(recruitOutput).toContain('Boss inducts you into Warriors');
    });

    it('rejects if target level < 10', () => {
      const clan = makeClan({ name: 'C', leader: 'Boss' });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'C';

      const lowbie = makePlayer('Lowbie', 5);
      setPlayerFinder((n) => n.toLowerCase() === 'lowbie' ? lowbie : undefined);

      let output = '';
      boss.descriptor = { ...mockDescriptor, write(t: string) { output += t; } } as any;

      doInduct(boss, 'Lowbie');
      expect(lowbie.pcData.clanName).toBeNull();
      expect(output).toContain('at least level 10');
    });

    it('rejects if target already in a clan', () => {
      const clan = makeClan({ name: 'C', leader: 'Boss' });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'C';

      const taken = makePlayer('Taken', 20);
      taken.pcData.clanName = 'Other';
      setPlayerFinder((n) => n.toLowerCase() === 'taken' ? taken : undefined);

      let output = '';
      boss.descriptor = { ...mockDescriptor, write(t: string) { output += t; } } as any;

      doInduct(boss, 'Taken');
      expect(output).toContain('already in a clan');
    });

    it('checks guild class restriction', () => {
      const clan = makeClan({
        name: 'MageGuild',
        leader: 'Boss',
        clanType: ClanType.Guild,
        clanClass: 0,  // Mage
      });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'MageGuild';

      const warrior = makePlayer('Fighter', 20);
      warrior.class_ = 'warrior';  // class_ is string
      setPlayerFinder((n) => n.toLowerCase() === 'fighter' ? warrior : undefined);

      let output = '';
      boss.descriptor = { ...mockDescriptor, write(t: string) { output += t; } } as any;

      doInduct(boss, 'Fighter');
      expect(warrior.pcData.clanName).toBeNull();
      expect(output).toContain('class requirements');
    });

    it('sets PCFLAG_DEADLY for PK clan', () => {
      const clan = makeClan({ name: 'PKClan', leader: 'Boss', clanType: ClanType.Clan });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'PKClan';

      const recruit = makePlayer('NewPKer', 15);
      setPlayerFinder((n) => n.toLowerCase() === 'newpker' ? recruit : undefined);

      let bossOutput = '';
      boss.descriptor = { ...mockDescriptor, write(t: string) { bossOutput += t; } } as any;

      doInduct(boss, 'NewPKer');
      expect(hasFlag(recruit.pcData.flags, PCFLAG_DEADLY)).toBe(true);
    });

    it('rejects if ch is not leader/officer', () => {
      const clan = makeClan({ name: 'C', leader: 'Boss' });
      setClan(clan);

      const nobody = makePlayer('Nobody', 50);
      nobody.pcData.clanName = 'C';

      let output = '';
      nobody.descriptor = { ...mockDescriptor, write(t: string) { output += t; } } as any;

      doInduct(nobody, 'someone');
      expect(output).toContain('not an officer');
    });

    it('rejects when not in a clan', () => {
      const ch = makePlayer('Solo');
      doInduct(ch, 'someone');
      expect(lastOutput).toContain('not in a clan');
    });

    it('rejects empty argument', () => {
      const clan = makeClan({ name: 'C', leader: 'Boss' });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'C';

      doInduct(boss, '');
      expect(lastOutput).toContain('Induct whom');
    });
  });

  // ---------------------------------------------------------------------------
  // doOutcast
  // ---------------------------------------------------------------------------
  describe('doOutcast', () => {
    it('outcasts a member', () => {
      const clan = makeClan({ name: 'C', leader: 'Boss', members: 5 });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'C';

      const member = makePlayer('Member', 20);
      member.pcData.clanName = 'C';
      setPlayerFinder((n) => n.toLowerCase() === 'member' ? member : undefined);

      let bossOut = '';
      boss.descriptor = { ...mockDescriptor, write(t: string) { bossOut += t; } } as any;
      let memOut = '';
      member.descriptor = { ...mockDescriptor, write(t: string) { memOut += t; } } as any;

      doOutcast(boss, 'Member');

      expect(member.pcData.clanName).toBeNull();
      expect(clan.members).toBe(4);
      expect(bossOut).toContain('outcast Member from C');
      expect(memOut).toContain('outcasts you from C');
    });

    it('only leader can outcast', () => {
      const clan = makeClan({ name: 'C', leader: 'Boss', number1: 'Officer' });
      setClan(clan);

      const officer = makePlayer('Officer', 50);
      officer.pcData.clanName = 'C';

      let output = '';
      officer.descriptor = { ...mockDescriptor, write(t: string) { output += t; } } as any;

      doOutcast(officer, 'someone');
      expect(output).toContain('Only the leader');
    });

    it('rejects target not in clan', () => {
      const clan = makeClan({ name: 'C', leader: 'Boss' });
      setClan(clan);

      const boss = makePlayer('Boss', 50);
      boss.pcData.clanName = 'C';

      const outsider = makePlayer('Outsider', 20);
      outsider.pcData.clanName = 'OtherClan';
      setPlayerFinder((n) => n.toLowerCase() === 'outsider' ? outsider : undefined);

      let output = '';
      boss.descriptor = { ...mockDescriptor, write(t: string) { output += t; } } as any;

      doOutcast(boss, 'Outsider');
      expect(output).toContain('not in your clan');
    });
  });

  // ---------------------------------------------------------------------------
  // doClanList
  // ---------------------------------------------------------------------------
  describe('doClanList', () => {
    it('lists all clans', () => {
      setClan(makeClan({ name: 'Alpha', members: 10, pkills: 5, pdeaths: 2, score: 100 }));
      setClan(makeClan({ name: 'Beta', clanType: ClanType.Guild, members: 3 }));

      const ch = makePlayer('Viewer');
      doClanList(ch, '');

      expect(lastOutput).toContain('Alpha');
      expect(lastOutput).toContain('Beta');
      expect(lastOutput).toContain('Guild');
    });

    it('handles no clans', () => {
      const ch = makePlayer('Viewer');
      doClanList(ch, '');
      expect(lastOutput).toContain('no clans');
    });
  });

  // ---------------------------------------------------------------------------
  // doClanInfo
  // ---------------------------------------------------------------------------
  describe('doClanInfo', () => {
    it('shows own clan info', () => {
      setClan(makeClan({
        name: 'MyClan',
        leader: 'Boss',
        motto: 'Victory!',
        treasury: 5000,
        members: 12,
      }));

      const ch = makePlayer('Boss');
      ch.pcData.clanName = 'MyClan';

      doClanInfo(ch, '');

      expect(lastOutput).toContain('MyClan');
      expect(lastOutput).toContain('Victory!');
      expect(lastOutput).toContain('5000');
      expect(lastOutput).toContain('12');
    });

    it('shows named clan info', () => {
      setClan(makeClan({ name: 'OtherClan', leader: 'Lord' }));

      const ch = makePlayer('Anyone');
      doClanInfo(ch, 'OtherClan');
      expect(lastOutput).toContain('OtherClan');
      expect(lastOutput).toContain('Lord');
    });

    it('handles unknown clan', () => {
      const ch = makePlayer('Anyone');
      doClanInfo(ch, 'Nonexistent');
      expect(lastOutput).toContain('No such clan');
    });
  });

  // ---------------------------------------------------------------------------
  // doMakeClan
  // ---------------------------------------------------------------------------
  describe('doMakeClan', () => {
    it('creates a new clan', () => {
      const imm = makePlayer('God', 57);
      doMakeClan(imm, 'NewClan');

      const clan = getClan('NewClan');
      expect(clan).toBeDefined();
      expect(clan!.name).toBe('NewClan');
      expect(lastOutput).toContain('created');
    });

    it('rejects duplicate name', () => {
      setClan(makeClan({ name: 'Existing' }));
      const imm = makePlayer('God', 57);
      doMakeClan(imm, 'Existing');
      expect(lastOutput).toContain('already exists');
    });

    it('rejects empty name', () => {
      const imm = makePlayer('God', 57);
      doMakeClan(imm, '');
      expect(lastOutput).toContain('what name');
    });
  });

  // ---------------------------------------------------------------------------
  // doCset
  // ---------------------------------------------------------------------------
  describe('doCset', () => {
    it('sets clan leader', () => {
      setClan(makeClan({ name: 'C' }));
      const imm = makePlayer('God', 57);
      doCset(imm, 'C leader NewLeader');
      expect(getClan('C')!.leader).toBe('NewLeader');
    });

    it('sets numeric fields', () => {
      setClan(makeClan({ name: 'C' }));
      const imm = makePlayer('God', 57);

      doCset(imm, 'C treasury 9999');
      expect(getClan('C')!.treasury).toBe(9999);

      doCset(imm, 'C recall 3001');
      expect(getClan('C')!.recall).toBe(3001);

      doCset(imm, 'C score 42');
      expect(getClan('C')!.score).toBe(42);
    });

    it('rejects invalid field', () => {
      setClan(makeClan({ name: 'C' }));
      const imm = makePlayer('God', 57);
      doCset(imm, 'C badfield value');
      expect(lastOutput).toContain('Unknown field');
    });

    it('rejects unknown clan', () => {
      const imm = makePlayer('God', 57);
      doCset(imm, 'Unknown leader A');
      expect(lastOutput).toContain('No such clan');
    });

    it('sets clantype', () => {
      setClan(makeClan({ name: 'C' }));
      const imm = makePlayer('God', 57);
      doCset(imm, 'C clantype 1');
      expect(getClan('C')!.clanType).toBe(ClanType.Guild);
    });
  });

  // ---------------------------------------------------------------------------
  // doClanDonate
  // ---------------------------------------------------------------------------
  describe('doClanDonate', () => {
    it('donates gold', () => {
      setClan(makeClan({ name: 'C', treasury: 100 }));

      const ch = makePlayer('Donor', 20, 500);
      ch.pcData.clanName = 'C';

      doClanDonate(ch, '200');

      expect(ch.gold).toBe(300);
      expect(getClan('C')!.treasury).toBe(300);
      expect(lastOutput).toContain('donate 200 gold');
    });

    it('rejects if not enough gold', () => {
      setClan(makeClan({ name: 'C' }));
      const ch = makePlayer('Poor', 20, 10);
      ch.pcData.clanName = 'C';
      doClanDonate(ch, '100');
      expect(lastOutput).toContain('not have that much');
    });

    it('rejects if not in a clan', () => {
      const ch = makePlayer('Solo', 20, 500);
      doClanDonate(ch, '100');
      expect(lastOutput).toContain('not in a clan');
    });

    it('rejects invalid amount', () => {
      setClan(makeClan({ name: 'C' }));
      const ch = makePlayer('Donor', 20, 500);
      ch.pcData.clanName = 'C';
      doClanDonate(ch, 'abc');
      expect(lastOutput).toContain('how much');
    });
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  describe('helpers', () => {
    it('getClanRecall returns clan recall vnum', () => {
      setClan(makeClan({ name: 'C', recall: 3001 }));
      const ch = makePlayer('Member');
      ch.pcData.clanName = 'C';
      expect(getClanRecall(ch)).toBe(3001);
    });

    it('getClanRecall returns 0 for non-members', () => {
      const ch = makePlayer('Solo');
      expect(getClanRecall(ch)).toBe(0);
    });

    it('hasClanStoreAccess checks storeroom', () => {
      setClan(makeClan({ name: 'C', storeroom: 4001 }));
      const ch = makePlayer('Member');
      ch.pcData.clanName = 'C';
      expect(hasClanStoreAccess(ch, 4001)).toBe(true);
      expect(hasClanStoreAccess(ch, 4002)).toBe(false);
    });
  });
});
