import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { Mobile } from '../../../src/game/entities/Mobile.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Position, ACT, type MobilePrototype } from '../../../src/game/entities/types.js';
import {
  doBank, findBanker, setPlayerFinder,
} from '../../../src/game/economy/BankSystem.js';

// =============================================================================
// Helpers
// =============================================================================

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

function makeBankerProto(): MobilePrototype {
  return {
    vnum: 5000,
    name: 'banker',
    shortDesc: 'a banker',
    longDesc: 'A banker stands here.',
    description: '',
    actFlags: ACT.IS_NPC | ACT.BANKER,
    affectedBy: 0n,
    alignment: 0,
    level: 50,
    hitroll: 0,
    damroll: 0,
    hitDice: { num: 10, size: 8, bonus: 100 },
    damageDice: { num: 1, size: 4, bonus: 0 },
    gold: 0,
    exp: 0,
    sex: 0,
    position: Position.Standing,
    defaultPosition: Position.Standing,
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
}

function makePlayer_(name: string = 'TestPlayer'): Player {
  const p = new Player({
    name,
    level: 10,
    position: Position.Standing,
    gold: 50,
    silver: 100,
    copper: 500,
  });
  p.descriptor = mockDescriptor as any;
  return p;
}

function setupBankRoom(): { room: Room; banker: Mobile; player: Player } {
  const room = new Room(4000, 'Bank', 'The bank.');
  const banker = new Mobile(makeBankerProto());
  const player = makePlayer_();
  room.addCharacter(banker);
  room.addCharacter(player);
  return { room, banker, player };
}

describe('BankSystem', () => {
  beforeEach(() => {
    Mobile.resetInstanceCounter();
    Player.setEventBus(null);
  });

  describe('findBanker', () => {
    it('should find banker in room', () => {
      const { room, banker } = setupBankRoom();
      expect(findBanker(room)).toBe(banker);
    });

    it('should return null if no banker', () => {
      const room = new Room(4001, 'Street', 'A street.');
      expect(findBanker(room)).toBeNull();
    });
  });

  describe('doBank - no banker', () => {
    it('should reject if no banker in room', () => {
      const room = new Room(4001, 'Street', 'A street.');
      const player = makePlayer_();
      room.addCharacter(player);
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      doBank(player, 'balance');
      expect(messages.join('')).toContain('no banker');
    });
  });

  describe('doBank - deposit', () => {
    it('should deposit gold into bank', () => {
      const { player } = setupBankRoom();
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;

      doBank(player, 'deposit 10 gold');

      expect(player.gold).toBe(40);
      expect(player.pcData.goldBalance).toBe(10);
      expect(messages.join('')).toContain('deposit 10 gold');
    });

    it('should reject if not enough on hand', () => {
      const { player } = setupBankRoom();
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;

      doBank(player, 'deposit 999 gold');
      expect(messages.join('')).toContain("don't have");
      expect(player.gold).toBe(50);
    });

    it('should deposit silver', () => {
      const { player } = setupBankRoom();
      doBank(player, 'deposit 30 silver');
      expect(player.silver).toBe(70);
      expect(player.pcData.silverBalance).toBe(30);
    });

    it('should deposit copper', () => {
      const { player } = setupBankRoom();
      doBank(player, 'deposit 100 copper');
      expect(player.copper).toBe(400);
      expect(player.pcData.copperBalance).toBe(100);
    });
  });

  describe('doBank - withdraw', () => {
    it('should withdraw gold from bank', () => {
      const { player } = setupBankRoom();
      player.pcData.goldBalance = 20;
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;

      doBank(player, 'withdraw 10 gold');

      expect(player.gold).toBe(60);
      expect(player.pcData.goldBalance).toBe(10);
    });

    it('should reject if insufficient bank balance', () => {
      const { player } = setupBankRoom();
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;

      doBank(player, 'withdraw 999 gold');
      expect(messages.join('')).toContain("don't have");
    });
  });

  describe('doBank - balance', () => {
    it('should show bank balance', () => {
      const { player } = setupBankRoom();
      player.pcData.goldBalance = 5;
      player.pcData.silverBalance = 10;
      player.pcData.copperBalance = 25;
      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;

      doBank(player, 'balance');
      const output = messages.join('');
      expect(output).toContain('balance');
      expect(output).toContain('gold');
    });
  });

  describe('doBank - transfer', () => {
    it('should transfer gold to another player', () => {
      const { player } = setupBankRoom();
      player.pcData.goldBalance = 20;

      const target = makePlayer_('TargetPlayer');
      setPlayerFinder((name: string) => name.toLowerCase() === 'targetplayer' ? target : null);

      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;
      const targetMessages: string[] = [];
      target.descriptor = { write: (t: string) => targetMessages.push(t), original: null } as any;

      doBank(player, 'transfer 5 gold TargetPlayer');

      expect(player.pcData.goldBalance).toBe(15);
      expect(target.pcData.goldBalance).toBe(5);
      expect(messages.join('')).toContain('transfer 5 gold');
      expect(targetMessages.join('')).toContain('transfers 5 gold');
    });

    it('should reject transfer to self', () => {
      const { player } = setupBankRoom();
      player.pcData.goldBalance = 20;
      setPlayerFinder(() => player);

      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;

      doBank(player, 'transfer 5 gold Self');
      expect(messages.join('')).toContain('cannot transfer to yourself');
    });

    it('should reject if target not found', () => {
      const { player } = setupBankRoom();
      player.pcData.goldBalance = 20;
      setPlayerFinder(() => null);

      const messages: string[] = [];
      player.descriptor = { write: (t: string) => messages.push(t), original: null } as any;

      doBank(player, 'transfer 5 gold Nobody');
      expect(messages.join('')).toContain('not found');
    });
  });
});
