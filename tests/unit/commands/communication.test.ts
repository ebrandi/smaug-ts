import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Player, type PlayerData } from '../../../src/game/entities/Player.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Area } from '../../../src/game/entities/Area.js';
import { Position, SectorType, ROOM_FLAGS } from '../../../src/game/entities/types.js';
import { EventBus, GameEvent } from '../../../src/core/EventBus.js';
import { hasFlag, setFlag, toggleFlag } from '../../../src/utils/BitVector.js';
import {
  ChannelScope,
  CHANNEL_CONFIGS,
  Language,
  LANGUAGE_NAMES,
  // Deaf bit constants
  CHANNEL_CHAT,
  CHANNEL_YELL,
  CHANNEL_SHOUT,
  CHANNEL_MUSIC,
  CHANNEL_NEWBIE,
  CHANNEL_IMMTALK,
  CHANNEL_WARTALK,
  CHANNEL_RACETALK,
  CHANNEL_CLANTALK,
  CHANNEL_GUILDTALK,
  CHANNEL_ORDERTALK,
  CHANNEL_COUNCILTALK,
  CHANNEL_SAY,
  CHANNEL_WHISPER,
  CHANNEL_GTELL,
  CHANNEL_TELL,
  // Core functions
  talkChannel,
  translateMessage,
  scrambleMessage,
  isIgnoring,
  canSeeChannel,
  formatChannelMessage,
  // Commands
  doChat,
  doGossip,
  doYell,
  doShout,
  doSay,
  doTell,
  doReply,
  doWhisper,
  doGtell,
  doClanTalk,
  doOrderTalk,
  doCouncilTalk,
  doGuildTalk,
  doMusic,
  doNewbieChat,
  doImmtalk,
  doRaceTalk,
  doWartalk,
  doEmote,
  doDeaf,
  doIgnore,
  doSpeak,
  doLanguages,
  // DI setters
  setCommConnectionManager,
  setCommEventBus,
  // Language subs
  languageSubstitutions,
  // Registration
  registerCommunicationCommands,
  type ICommConnectionManager,
} from '../../../src/game/commands/communication.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';

// =============================================================================
// Test Helpers
// =============================================================================

class TestPlayer extends Player {
  messages: string[] = [];

  constructor(init?: CharacterInit, pcData?: Partial<PlayerData>) {
    super(init, pcData);
  }

  override sendToChar(text: string): void {
    this.messages.push(text);
  }

  get lastMessage(): string {
    return this.messages[this.messages.length - 1] ?? '';
  }

  clearMessages(): void {
    this.messages = [];
  }
}

class TestMobile extends Character {
  messages: string[] = [];
  get isNpc(): true { return true; }
  sendToChar(text: string): void { this.messages.push(text); }
  get lastMessage(): string { return this.messages[this.messages.length - 1] ?? ''; }
  clearMessages(): void { this.messages = []; }

  constructor(init?: CharacterInit) {
    super(init);
  }
}

function makePlayer(overrides?: Partial<CharacterInit>, pcOverrides?: Partial<PlayerData>): TestPlayer {
  return new TestPlayer({
    id: `player_${Math.random().toString(36).slice(2)}`,
    name: 'TestHero',
    shortDescription: 'a test hero',
    level: 10,
    trust: 0,
    move: 100,
    maxMove: 100,
    position: Position.Standing,
    race: 'human',
    class_: 'warrior',
    speaking: Language.Common,
    ...overrides,
  }, pcOverrides);
}

function makeRoom(vnum: number, name?: string, area?: Area): Room {
  const room = new Room(vnum, name ?? `Room ${vnum}`, `Description of room ${vnum}.`);
  room.sectorType = SectorType.City;
  if (area) room.area = area;
  return room;
}

function makeArea(name: string): Area {
  return new Area(`${name}.are`, name, 'TestAuthor');
}

/** Build a mock connection manager from a list of players. */
function mockConnectionMgr(players: TestPlayer[]): ICommConnectionManager {
  return {
    getPlayingDescriptors: () => players.map(p => ({ character: p })),
  };
}

/** Place a player into a room. */
function placeInRoom(player: Character, room: Room): void {
  room.addCharacter(player);
}

// =============================================================================
// Channel Config Tests
// =============================================================================

describe('Communication System', () => {
  let sender: TestPlayer;
  let receiver: TestPlayer;
  let room: Room;
  let area: Area;
  let mgr: ICommConnectionManager;

  beforeEach(() => {
    sender = makePlayer({ name: 'Sender' });
    receiver = makePlayer({ name: 'Receiver' });
    area = makeArea('TestArea');
    room = makeRoom(100, 'Test Room', area);
    placeInRoom(sender, room);
    placeInRoom(receiver, room);
    mgr = mockConnectionMgr([sender, receiver]);
    setCommConnectionManager(mgr);
    setCommEventBus(new EventBus());
  });

  afterEach(() => {
    setCommConnectionManager(null as unknown as ICommConnectionManager);
  });

  // ===========================================================================
  // Channel Configs
  // ===========================================================================

  describe('Channel Configurations', () => {
    it('should have 16 channel configurations', () => {
      expect(Object.keys(CHANNEL_CONFIGS).length).toBe(16);
    });

    it('should have correct scopes for known channels', () => {
      expect(CHANNEL_CONFIGS['chat'].scope).toBe(ChannelScope.Global);
      expect(CHANNEL_CONFIGS['yell'].scope).toBe(ChannelScope.Area);
      expect(CHANNEL_CONFIGS['say'].scope).toBe(ChannelScope.Room);
      expect(CHANNEL_CONFIGS['tell'].scope).toBe(ChannelScope.Private);
      expect(CHANNEL_CONFIGS['clantalk'].scope).toBe(ChannelScope.Group);
      expect(CHANNEL_CONFIGS['gtell'].scope).toBe(ChannelScope.Group);
    });

    it('should require PK for wartalk', () => {
      expect(CHANNEL_CONFIGS['wartalk'].requiresPK).toBe(true);
    });

    it('should require group membership for clan/order/council/guild/race', () => {
      expect(CHANNEL_CONFIGS['clantalk'].requiresGroup).toBe('clan');
      expect(CHANNEL_CONFIGS['ordertalk'].requiresGroup).toBe('order');
      expect(CHANNEL_CONFIGS['counciltalk'].requiresGroup).toBe('council');
      expect(CHANNEL_CONFIGS['guildtalk'].requiresGroup).toBe('guild');
      expect(CHANNEL_CONFIGS['racetalk'].requiresGroup).toBe('race');
    });

    it('should require trust 51 for immtalk', () => {
      expect(CHANNEL_CONFIGS['immtalk'].minTrust).toBe(51);
    });
  });

  // ===========================================================================
  // Deaf Bit Constants
  // ===========================================================================

  describe('Deaf Bit Constants', () => {
    it('should be unique bigint values', () => {
      const bits = [
        CHANNEL_CHAT, CHANNEL_YELL, CHANNEL_SHOUT, CHANNEL_MUSIC,
        CHANNEL_NEWBIE, CHANNEL_IMMTALK, CHANNEL_WARTALK, CHANNEL_RACETALK,
        CHANNEL_CLANTALK, CHANNEL_GUILDTALK, CHANNEL_ORDERTALK, CHANNEL_COUNCILTALK,
        CHANNEL_SAY, CHANNEL_WHISPER, CHANNEL_GTELL, CHANNEL_TELL,
      ];
      const set = new Set(bits.map(b => b.toString()));
      expect(set.size).toBe(bits.length);
    });

    it('should be powers of 2', () => {
      expect(CHANNEL_CHAT).toBe(1n);
      expect(CHANNEL_YELL).toBe(2n);
      expect(CHANNEL_SHOUT).toBe(4n);
      expect(CHANNEL_TELL).toBe(1n << 15n);
    });
  });

  // ===========================================================================
  // talkChannel Core
  // ===========================================================================

  describe('talkChannel()', () => {
    it('should send message to sender and receiver on global channel', () => {
      talkChannel(sender, 'Hello world', 'chat', mgr);
      expect(sender.lastMessage).toContain('You');
      expect(sender.lastMessage).toContain('Hello world');
      expect(receiver.lastMessage).toContain('Sender');
      expect(receiver.lastMessage).toContain('Hello world');
    });

    it('should block sender with insufficient trust', () => {
      sender = makePlayer({ name: 'Sender', trust: 0 });
      placeInRoom(sender, room);
      talkChannel(sender, 'Hello', 'immtalk', mgr);
      expect(sender.lastMessage).toContain("can't use that channel");
      expect(receiver.messages.length).toBe(0);
    });

    it('should block sender with deaf bit set', () => {
      sender.deaf = setFlag(sender.deaf, CHANNEL_CHAT);
      talkChannel(sender, 'Hello', 'chat', mgr);
      expect(sender.lastMessage).toContain('turned off');
      expect(receiver.messages.length).toBe(0);
    });

    it('should not send to receiver with deaf bit set', () => {
      receiver.deaf = setFlag(receiver.deaf, CHANNEL_CHAT);
      talkChannel(sender, 'Hello', 'chat', mgr);
      expect(sender.messages.length).toBe(1); // echo
      expect(receiver.messages.length).toBe(0);
    });

    it('should not send to receiver who is ignoring sender', () => {
      receiver.pcData.ignored.add('sender');
      talkChannel(sender, 'Hello', 'chat', mgr);
      expect(sender.messages.length).toBe(1);
      expect(receiver.messages.length).toBe(0);
    });

    it('should respect area scope (yell)', () => {
      const area2 = makeArea('OtherArea');
      const room2 = makeRoom(200, 'Other Room', area2);
      const farPlayer = makePlayer({ name: 'FarPlayer' });
      placeInRoom(farPlayer, room2);

      const allMgr = mockConnectionMgr([sender, receiver, farPlayer]);
      talkChannel(sender, 'Yelling!', 'yell', allMgr);

      expect(sender.messages.length).toBe(1);
      expect(receiver.lastMessage).toContain('Yelling!');
      expect(farPlayer.messages.length).toBe(0); // different area
    });

    it('should respect room scope (say)', () => {
      const room2 = makeRoom(200, 'Other Room', area);
      const otherRoomPlayer = makePlayer({ name: 'OtherRoom' });
      placeInRoom(otherRoomPlayer, room2);

      const allMgr = mockConnectionMgr([sender, receiver, otherRoomPlayer]);
      talkChannel(sender, 'Hello room', 'say', allMgr);

      expect(receiver.lastMessage).toContain('Hello room');
      expect(otherRoomPlayer.messages.length).toBe(0);
    });

    it('should block messages when sender room has SILENCE flag', () => {
      room.roomFlags = setFlag(room.roomFlags, ROOM_FLAGS.SILENCE);
      talkChannel(sender, 'Hello', 'chat', mgr);
      expect(sender.lastMessage).toContain('too quiet');
      expect(receiver.messages.length).toBe(0);
    });

    it('should not deliver to recipient in SILENCE room', () => {
      const silentRoom = makeRoom(300, 'Silent Room', area);
      silentRoom.roomFlags = setFlag(silentRoom.roomFlags, ROOM_FLAGS.SILENCE);
      const silentPlayer = makePlayer({ name: 'Silent' });
      placeInRoom(silentPlayer, silentRoom);

      const allMgr = mockConnectionMgr([sender, receiver, silentPlayer]);
      talkChannel(sender, 'Hello', 'chat', allMgr);

      expect(receiver.lastMessage).toContain('Hello');
      expect(silentPlayer.messages.length).toBe(0);
    });

    it('should not send to NPC characters', () => {
      const mob = new TestMobile({ name: 'Mob' });
      placeInRoom(mob, room);
      const allMgr: ICommConnectionManager = {
        getPlayingDescriptors: () => [
          { character: sender },
          { character: receiver },
          { character: mob },
        ],
      };
      talkChannel(sender, 'Hello', 'chat', allMgr);
      expect(mob.messages.length).toBe(0);
    });

    it('should check group membership for clan channel', () => {
      sender = makePlayer({ name: 'Sender' }, { clanName: 'Warriors' });
      receiver = makePlayer({ name: 'Receiver' }, { clanName: 'Mages' });
      const clanMate = makePlayer({ name: 'ClanMate' }, { clanName: 'Warriors' });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      placeInRoom(clanMate, room);

      const allMgr = mockConnectionMgr([sender, receiver, clanMate]);
      talkChannel(sender, 'Clan message', 'clantalk', allMgr);

      expect(clanMate.lastMessage).toContain('Clan message');
      expect(receiver.messages.length).toBe(0);
    });

    it('should require clan membership to use clantalk', () => {
      sender = makePlayer({ name: 'Sender' }, { clanName: null });
      talkChannel(sender, 'Hello clan', 'clantalk', mgr);
      expect(sender.lastMessage).toContain("aren't in a clan");
    });

    it('should check race for racetalk', () => {
      sender = makePlayer({ name: 'Sender', race: 'elf' });
      receiver = makePlayer({ name: 'Receiver', race: 'dwarf' });
      const raceMate = makePlayer({ name: 'RaceMate', race: 'elf' });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      placeInRoom(raceMate, room);

      const allMgr = mockConnectionMgr([sender, receiver, raceMate]);
      talkChannel(sender, 'Race msg', 'racetalk', allMgr);

      expect(raceMate.lastMessage).toContain('Race msg');
      expect(receiver.messages.length).toBe(0);
    });

    it('should check guild (class) for guildtalk', () => {
      sender = makePlayer({ name: 'Sender', class_: 'warrior' });
      receiver = makePlayer({ name: 'Receiver', class_: 'mage' });
      const guildMate = makePlayer({ name: 'GuildMate', class_: 'warrior' });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      placeInRoom(guildMate, room);

      const allMgr = mockConnectionMgr([sender, receiver, guildMate]);
      talkChannel(sender, 'Guild msg', 'guildtalk', allMgr);

      expect(guildMate.lastMessage).toContain('Guild msg');
      expect(receiver.messages.length).toBe(0);
    });

    it('should require PK for wartalk', () => {
      sender = makePlayer({ name: 'Sender' });
      sender.pcData.flags = 0n; // Not deadly
      talkChannel(sender, 'War!', 'wartalk', mgr);
      expect(sender.lastMessage).toContain('pkiller');
    });
  });

  // ===========================================================================
  // Channel Commands
  // ===========================================================================

  describe('doChat()', () => {
    it('should toggle deaf when called with no argument', () => {
      doChat(sender, '');
      expect(sender.lastMessage).toContain('OFF');
      expect(hasFlag(sender.deaf, CHANNEL_CHAT)).toBe(true);

      sender.clearMessages();
      doChat(sender, '');
      expect(sender.lastMessage).toContain('ON');
      expect(hasFlag(sender.deaf, CHANNEL_CHAT)).toBe(false);
    });

    it('should broadcast when called with argument', () => {
      doChat(sender, 'Hello everyone');
      expect(sender.lastMessage).toContain('You');
      expect(sender.lastMessage).toContain('Hello everyone');
      expect(receiver.lastMessage).toContain('Hello everyone');
    });
  });

  describe('doGossip()', () => {
    it('should alias to doChat', () => {
      doGossip(sender, 'Test gossip');
      expect(sender.lastMessage).toContain('Test gossip');
      expect(receiver.lastMessage).toContain('Test gossip');
    });
  });

  describe('doYell()', () => {
    it('should require an argument', () => {
      doYell(sender, '');
      expect(sender.lastMessage).toContain('Yell what?');
    });

    it('should broadcast to area', () => {
      doYell(sender, 'Help!');
      expect(receiver.lastMessage).toContain('Help!');
    });
  });

  describe('doShout()', () => {
    it('should toggle deaf when called with no argument', () => {
      doShout(sender, '');
      expect(sender.lastMessage).toContain('OFF');
    });

    it('should cost 10 move points', () => {
      const initialMove = sender.move;
      doShout(sender, 'Shouting!');
      expect(sender.move).toBe(initialMove - 10);
    });

    it('should fail when not enough move', () => {
      sender.move = 5;
      doShout(sender, 'Shout');
      expect(sender.lastMessage).toContain('too tired');
    });

    it('should require trust >= 3', () => {
      // getTrust() returns max(trust, level), so both must be below 3
      sender = makePlayer({ name: 'Sender', trust: 1, level: 2 });
      placeInRoom(sender, room);
      doShout(sender, 'Shout');
      // talkChannel will check trust 3
      expect(sender.lastMessage).toContain("can't use that channel");
    });
  });

  describe('doSay()', () => {
    it('should require an argument', () => {
      doSay(sender, '');
      expect(sender.lastMessage).toContain('Say what?');
    });

    it('should send to room only', () => {
      doSay(sender, 'Hello room');
      expect(sender.lastMessage).toContain("You say 'Hello room'");
      expect(receiver.lastMessage).toContain("Sender says 'Hello room'");
    });

    it('should not send to characters in different rooms', () => {
      const room2 = makeRoom(200, 'Other Room', area);
      const farPlayer = makePlayer({ name: 'FarPlayer' });
      placeInRoom(farPlayer, room2);
      setCommConnectionManager(mockConnectionMgr([sender, receiver, farPlayer]));

      doSay(sender, 'Hello');
      expect(farPlayer.messages.length).toBe(0);
    });

    it('should emit SayMessage event', () => {
      const eventBus = new EventBus();
      setCommEventBus(eventBus);
      const handler = vi.fn();
      eventBus.on(GameEvent.SayMessage, handler);

      doSay(sender, 'Test speech');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        speaker: sender,
        message: 'Test speech',
        room,
      }));
    });

    it('should block in SILENCE room', () => {
      room.roomFlags = setFlag(room.roomFlags, ROOM_FLAGS.SILENCE);
      doSay(sender, 'Hello');
      expect(sender.lastMessage).toContain('too quiet');
      expect(receiver.messages.length).toBe(0);
    });
  });

  describe('doTell()', () => {
    it('should require arguments', () => {
      doTell(sender, '');
      expect(sender.lastMessage).toContain('Tell whom what?');
    });

    it('should require message after target name', () => {
      doTell(sender, 'Receiver');
      expect(sender.lastMessage).toContain('Tell them what?');
    });

    it('should deliver a private message', () => {
      doTell(sender, 'Receiver Hello there!');
      expect(sender.lastMessage).toContain("You tell Receiver 'Hello there!'");
      expect(receiver.lastMessage).toContain("Sender tells you 'Hello there!'");
    });

    it('should fail if target not found', () => {
      doTell(sender, 'Nobody Hello');
      expect(sender.lastMessage).toContain('No one by that name');
    });

    it('should fail if target is ignoring sender', () => {
      receiver.pcData.ignored.add('sender');
      doTell(sender, 'Receiver Hello');
      expect(sender.lastMessage).toContain('ignoring you');
    });

    it('should set reply target on receiver', () => {
      doTell(sender, 'Receiver Hello');
      expect(receiver.reply).toBe(sender);
    });

    it('should store in tell history', () => {
      doTell(sender, 'Receiver Hello');
      expect(receiver.pcData.tellHistory.get('Sender')).toBe('Hello');
    });

    it('should not allow telling yourself', () => {
      const selfMgr = mockConnectionMgr([sender]);
      setCommConnectionManager(selfMgr);
      doTell(sender, 'Sender Hello');
      expect(sender.lastMessage).toContain('Talking to yourself');
    });
  });

  describe('doReply()', () => {
    it('should require an argument', () => {
      doReply(sender, '');
      expect(sender.lastMessage).toContain('Reply what?');
    });

    it('should fail if no one sent a tell', () => {
      doReply(sender, 'Hello');
      expect(sender.lastMessage).toContain('No one has sent you a tell');
    });

    it('should send reply to the last teller', () => {
      // Set up: receiver tells sender first
      doTell(receiver, 'Sender Hey');
      sender.clearMessages();
      receiver.clearMessages();

      // Now sender replies
      doReply(sender, 'Hey back');
      expect(sender.lastMessage).toContain("You tell Receiver 'Hey back'");
      expect(receiver.lastMessage).toContain("Sender tells you 'Hey back'");
    });

    it('should fail if reply target is no longer online', () => {
      sender.reply = receiver;
      // Remove receiver from connection manager
      setCommConnectionManager(mockConnectionMgr([sender]));
      doReply(sender, 'Hello');
      expect(sender.lastMessage).toContain('no longer playing');
    });
  });

  describe('doWhisper()', () => {
    it('should require arguments', () => {
      doWhisper(sender, '');
      expect(sender.lastMessage).toContain('Whisper to whom');
    });

    it('should require message', () => {
      doWhisper(sender, 'Receiver');
      expect(sender.lastMessage).toContain('Whisper what?');
    });

    it('should deliver whisper to target in same room', () => {
      doWhisper(sender, 'Receiver Secret message');
      expect(sender.lastMessage).toContain("You whisper to Receiver 'Secret message'");
      expect(receiver.lastMessage).toContain("Sender whispers to you 'Secret message'");
    });

    it('should show generic whisper message to others in room', () => {
      const bystander = makePlayer({ name: 'Bystander' });
      placeInRoom(bystander, room);

      doWhisper(sender, 'Receiver Secret');
      expect(bystander.lastMessage).toContain('whispers something to Receiver');
    });

    it('should fail if target not in room', () => {
      doWhisper(sender, 'Nobody Secret');
      expect(sender.lastMessage).toContain("aren't here");
    });
  });

  describe('doGtell()', () => {
    it('should require an argument', () => {
      doGtell(sender, '');
      expect(sender.lastMessage).toContain('Tell your group what?');
    });

    it('should require being in a group', () => {
      doGtell(sender, 'Hello group');
      expect(sender.lastMessage).toContain("aren't in a group");
    });

    it('should send to all group members', () => {
      const follower = makePlayer({ name: 'Follower' });
      placeInRoom(follower, room);
      follower.leader = sender;
      sender.followers.push(follower);

      doGtell(sender, 'Group message');
      expect(sender.lastMessage).toContain("You tell the group 'Group message'");
      expect(follower.lastMessage).toContain("Sender tells the group 'Group message'");
    });

    it('should send from follower to leader and other followers', () => {
      const follower1 = makePlayer({ name: 'Follower1' });
      const follower2 = makePlayer({ name: 'Follower2' });
      placeInRoom(follower1, room);
      placeInRoom(follower2, room);
      follower1.leader = sender;
      follower2.leader = sender;
      sender.followers.push(follower1, follower2);

      doGtell(follower1, 'From follower');
      expect(follower1.lastMessage).toContain("You tell the group");
      expect(sender.lastMessage).toContain("Follower1 tells the group");
      expect(follower2.lastMessage).toContain("Follower1 tells the group");
    });
  });

  describe('doClanTalk()', () => {
    it('should toggle deaf with no argument', () => {
      doClanTalk(sender, '');
      expect(sender.lastMessage).toContain('OFF');
    });

    it('should require clan membership', () => {
      doClanTalk(sender, 'Hello clan');
      expect(sender.lastMessage).toContain("aren't in a clan");
    });

    it('should broadcast to clan members', () => {
      sender = makePlayer({ name: 'Sender' }, { clanName: 'Warriors' });
      receiver = makePlayer({ name: 'Receiver' }, { clanName: 'Warriors' });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      setCommConnectionManager(mockConnectionMgr([sender, receiver]));

      doClanTalk(sender, 'Clan msg');
      expect(receiver.lastMessage).toContain('Clan msg');
    });
  });

  describe('doOrderTalk()', () => {
    it('should require order membership', () => {
      doOrderTalk(sender, 'Hello order');
      expect(sender.lastMessage).toContain("aren't in an order");
    });

    it('should broadcast to order members', () => {
      sender = makePlayer({ name: 'Sender' }, { orderName: 'Knights' });
      receiver = makePlayer({ name: 'Receiver' }, { orderName: 'Knights' });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      setCommConnectionManager(mockConnectionMgr([sender, receiver]));

      doOrderTalk(sender, 'Order msg');
      expect(receiver.lastMessage).toContain('Order msg');
    });
  });

  describe('doCouncilTalk()', () => {
    it('should require council membership', () => {
      doCouncilTalk(sender, 'Hello council');
      expect(sender.lastMessage).toContain("aren't in a council");
    });
  });

  describe('doGuildTalk()', () => {
    it('should send to same class only', () => {
      sender = makePlayer({ name: 'Sender', class_: 'warrior' });
      receiver = makePlayer({ name: 'Receiver', class_: 'warrior' });
      const mage = makePlayer({ name: 'Mage', class_: 'mage' });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      placeInRoom(mage, room);
      setCommConnectionManager(mockConnectionMgr([sender, receiver, mage]));

      doGuildTalk(sender, 'Warriors unite');
      expect(receiver.lastMessage).toContain('Warriors unite');
      expect(mage.messages.length).toBe(0);
    });
  });

  describe('doMusic()', () => {
    it('should toggle deaf with no argument', () => {
      doMusic(sender, '');
      expect(sender.lastMessage).toContain('OFF');
    });

    it('should broadcast globally', () => {
      doMusic(sender, 'A song');
      expect(receiver.lastMessage).toContain('A song');
    });
  });

  describe('doNewbieChat()', () => {
    it('should toggle deaf with no argument', () => {
      doNewbieChat(sender, '');
      expect(sender.lastMessage).toContain('OFF');
    });

    it('should not deliver to high level non-immortals', () => {
      receiver = makePlayer({ name: 'Receiver', level: 20, trust: 0 });
      placeInRoom(receiver, room);
      setCommConnectionManager(mockConnectionMgr([sender, receiver]));

      doNewbieChat(sender, 'Help!');
      expect(receiver.messages.length).toBe(0);
    });

    it('should deliver to immortals regardless of level', () => {
      receiver = makePlayer({ name: 'Receiver', level: 55, trust: 55 });
      placeInRoom(receiver, room);
      setCommConnectionManager(mockConnectionMgr([sender, receiver]));

      doNewbieChat(sender, 'Help!');
      expect(receiver.lastMessage).toContain('Help!');
    });
  });

  describe('doImmtalk()', () => {
    it('should require immortal trust', () => {
      sender = makePlayer({ name: 'Sender', trust: 10 });
      doImmtalk(sender, 'Imm message');
      expect(sender.lastMessage).toContain("can't use that channel");
    });

    it('should work for immortals', () => {
      sender = makePlayer({ name: 'Sender', trust: 55, level: 55 });
      receiver = makePlayer({ name: 'Receiver', trust: 55, level: 55 });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      setCommConnectionManager(mockConnectionMgr([sender, receiver]));

      doImmtalk(sender, 'Imm message');
      expect(receiver.lastMessage).toContain('Imm message');
    });
  });

  describe('doRaceTalk()', () => {
    it('should send to same race', () => {
      sender = makePlayer({ name: 'Sender', race: 'elf' });
      receiver = makePlayer({ name: 'Receiver', race: 'elf' });
      const dwarf = makePlayer({ name: 'Dwarf', race: 'dwarf' });
      placeInRoom(sender, room);
      placeInRoom(receiver, room);
      placeInRoom(dwarf, room);
      setCommConnectionManager(mockConnectionMgr([sender, receiver, dwarf]));

      doRaceTalk(sender, 'Elf message');
      expect(receiver.lastMessage).toContain('Elf message');
      expect(dwarf.messages.length).toBe(0);
    });
  });

  describe('doWartalk()', () => {
    it('should require PK status', () => {
      sender = makePlayer({ name: 'Sender' });
      sender.pcData.flags = 0n;
      doWartalk(sender, 'War!');
      expect(sender.lastMessage).toContain('pkiller');
    });

    it('should toggle deaf with no argument', () => {
      doWartalk(sender, '');
      expect(sender.lastMessage).toContain('OFF');
    });
  });

  // ===========================================================================
  // Emote
  // ===========================================================================

  describe('doEmote()', () => {
    it('should require an argument', () => {
      doEmote(sender, '');
      expect(sender.lastMessage).toContain('Emote what?');
    });

    it('should display emote to room', () => {
      doEmote(sender, 'dances happily.');
      expect(sender.lastMessage).toContain('Sender dances happily.');
      expect(receiver.lastMessage).toContain('Sender dances happily.');
    });

    it('should block in SILENCE room', () => {
      room.roomFlags = setFlag(room.roomFlags, ROOM_FLAGS.SILENCE);
      doEmote(sender, 'dances');
      expect(sender.lastMessage).toContain('too quiet');
    });
  });

  // ===========================================================================
  // Deaf Toggle
  // ===========================================================================

  describe('doDeaf()', () => {
    it('should list all channels when no argument', () => {
      doDeaf(sender, '');
      expect(sender.messages.some(m => m.includes('chat'))).toBe(true);
      expect(sender.messages.some(m => m.includes('ON'))).toBe(true);
    });

    it('should toggle a specific channel', () => {
      doDeaf(sender, 'chat');
      expect(sender.lastMessage).toContain('OFF');
      expect(hasFlag(sender.deaf, CHANNEL_CHAT)).toBe(true);

      sender.clearMessages();
      doDeaf(sender, 'chat');
      expect(sender.lastMessage).toContain('ON');
      expect(hasFlag(sender.deaf, CHANNEL_CHAT)).toBe(false);
    });

    it('should reject unknown channels', () => {
      doDeaf(sender, 'fakechannel');
      expect(sender.messages.some(m => m.includes('Unknown channel'))).toBe(true);
    });
  });

  // ===========================================================================
  // Ignore
  // ===========================================================================

  describe('doIgnore()', () => {
    it('should list empty ignore list', () => {
      doIgnore(sender, '');
      expect(sender.lastMessage).toContain("aren't ignoring");
    });

    it('should add a player to ignore list', () => {
      doIgnore(sender, 'Receiver');
      expect(sender.lastMessage).toContain('now ignoring Receiver');
      expect(sender.pcData.ignored.has('receiver')).toBe(true);
    });

    it('should toggle ignore off', () => {
      sender.pcData.ignored.add('receiver');
      doIgnore(sender, 'Receiver');
      expect(sender.lastMessage).toContain('no longer ignoring');
      expect(sender.pcData.ignored.has('receiver')).toBe(false);
    });

    it('should not allow ignoring yourself', () => {
      doIgnore(sender, 'Sender');
      expect(sender.lastMessage).toContain("can't ignore yourself");
    });

    it('should limit to 20 ignored players', () => {
      for (let i = 0; i < 20; i++) {
        sender.pcData.ignored.add(`player${i}`);
      }
      doIgnore(sender, 'OneMore');
      expect(sender.lastMessage).toContain("can't ignore any more");
    });

    it('should list ignored players', () => {
      sender.pcData.ignored.add('badplayer');
      doIgnore(sender, '');
      expect(sender.messages.some(m => m.includes('badplayer'))).toBe(true);
    });
  });

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  describe('isIgnoring()', () => {
    it('should return true when ignoring', () => {
      sender.pcData.ignored.add('receiver');
      expect(isIgnoring(sender, receiver)).toBe(true);
    });

    it('should return false when not ignoring', () => {
      expect(isIgnoring(sender, receiver)).toBe(false);
    });

    it('should be case-insensitive', () => {
      sender.pcData.ignored.add('receiver');
      const target = makePlayer({ name: 'Receiver' });
      expect(isIgnoring(sender, target)).toBe(true);
    });
  });

  describe('canSeeChannel()', () => {
    it('should return false when trust too low', () => {
      const config = CHANNEL_CONFIGS['immtalk'];
      receiver = makePlayer({ name: 'R', trust: 10 });
      expect(canSeeChannel(receiver, config)).toBe(false);
    });

    it('should return false when channel is deafened', () => {
      receiver.deaf = setFlag(receiver.deaf, CHANNEL_CHAT);
      expect(canSeeChannel(receiver, CHANNEL_CONFIGS['chat'])).toBe(false);
    });

    it('should return true normally', () => {
      expect(canSeeChannel(receiver, CHANNEL_CONFIGS['chat'])).toBe(true);
    });

    it('should respect maxLevel for newbie channel', () => {
      receiver = makePlayer({ name: 'R', level: 20, trust: 10 });
      expect(canSeeChannel(receiver, CHANNEL_CONFIGS['newbiechat'])).toBe(false);
    });

    it('should let immortals see newbie chat', () => {
      receiver = makePlayer({ name: 'R', level: 55, trust: 55 });
      expect(canSeeChannel(receiver, CHANNEL_CONFIGS['newbiechat'])).toBe(true);
    });
  });

  describe('formatChannelMessage()', () => {
    it('should format sender message with You', () => {
      const msg = formatChannelMessage(CHANNEL_CONFIGS['chat'], 'Sender', 'Hello', true);
      expect(msg).toContain('You');
      expect(msg).toContain('Hello');
      expect(msg).toContain('[chat]');
    });

    it('should format receiver message with sender name', () => {
      const msg = formatChannelMessage(CHANNEL_CONFIGS['chat'], 'Sender', 'Hello', false);
      expect(msg).toContain('Sender');
      expect(msg).toContain('Hello');
    });
  });

  // ===========================================================================
  // Language System
  // ===========================================================================

  describe('Language System', () => {
    describe('Language enum', () => {
      it('should have 20 languages', () => {
        expect(Object.keys(LANGUAGE_NAMES).length).toBe(20);
      });

      it('should start with Common at 0', () => {
        expect(Language.Common).toBe(0);
      });

      it('should end with Unknown at 19', () => {
        expect(Language.Unknown).toBe(19);
      });
    });

    describe('translateMessage()', () => {
      it('should pass through Common language unchanged', () => {
        sender.speaking = Language.Common;
        const result = translateMessage(sender, receiver, 'Hello world');
        expect(result).toBe('Hello world');
      });

      it('should pass through when listener comprehension >= 85%', () => {
        sender.speaking = Language.Elvish;
        receiver.pcData.learned.set(Language.Elvish, 90);
        const result = translateMessage(sender, receiver, 'Hello world');
        expect(result).toBe('Hello world');
      });

      it('should scramble when listener comprehension < 85%', () => {
        sender.speaking = Language.Elvish;
        receiver.pcData.learned.set(Language.Elvish, 10);

        // Run multiple times to ensure scrambling occurs (probabilistic)
        let scrambled = false;
        for (let i = 0; i < 20; i++) {
          const result = translateMessage(sender, receiver, 'Hello world');
          if (result !== 'Hello world') {
            scrambled = true;
            break;
          }
        }
        expect(scrambled).toBe(true);
      });

      it('should pass God language through for immortals', () => {
        sender.speaking = Language.God;
        receiver = makePlayer({ name: 'Receiver', trust: 55, level: 55 });
        const result = translateMessage(sender, receiver, 'Divine message');
        expect(result).toBe('Divine message');
      });

      it('should scramble God language for mortals', () => {
        sender.speaking = Language.God;
        receiver = makePlayer({ name: 'Receiver', trust: 0, level: 10 });

        let scrambled = false;
        for (let i = 0; i < 20; i++) {
          const result = translateMessage(sender, receiver, 'Hello world');
          if (result !== 'Hello world') {
            scrambled = true;
            break;
          }
        }
        expect(scrambled).toBe(true);
      });
    });

    describe('scrambleMessage()', () => {
      it('should preserve spaces and punctuation', () => {
        const result = scrambleMessage('Hello, world!', Language.Elvish, 0);
        expect(result).toContain(',');
        expect(result).toContain('!');
        expect(result).toContain(' ');
      });

      it('should scramble all characters at 0% comprehension', () => {
        // At 0% comprehension, 100% chance of scramble
        // Run it and check it changed (unless no substitution for all chars)
        let anyChanged = false;
        for (let i = 0; i < 10; i++) {
          const result = scrambleMessage('aeiou', Language.Elvish, 0);
          if (result !== 'aeiou') {
            anyChanged = true;
            break;
          }
        }
        expect(anyChanged).toBe(true);
      });

      it('should scramble less at higher comprehension', () => {
        // At 80% comprehension, only 20% chance per char
        let totalChanges = 0;
        const iterations = 100;
        for (let i = 0; i < iterations; i++) {
          const result = scrambleMessage('aaaaaa', Language.Elvish, 80);
          for (let j = 0; j < result.length; j++) {
            if (result[j] !== 'a') totalChanges++;
          }
        }
        // Roughly 20% of chars should change, so totalChanges should be
        // substantially less than 100% would be
        const avgChanges = totalChanges / iterations;
        expect(avgChanges).toBeLessThan(4); // less than ~66%
        expect(avgChanges).toBeGreaterThan(0);
      });

      it('should use language-specific substitution tables', () => {
        // Elvish: a→e, e→i, o→a
        const subs = languageSubstitutions[Language.Elvish];
        expect(subs).toBeDefined();
        expect(subs!['a']).toBe('e');
        expect(subs!['e']).toBe('i');
      });
    });

    describe('doSpeak()', () => {
      it('should show current language with no argument', () => {
        doSpeak(sender, '');
        expect(sender.lastMessage).toContain('common');
      });

      it('should change to a known language', () => {
        sender.pcData.learned.set(Language.Elvish, 50);
        doSpeak(sender, 'elvish');
        expect(sender.lastMessage).toContain('elvish');
        expect(sender.speaking).toBe(Language.Elvish);
      });

      it('should always allow common', () => {
        doSpeak(sender, 'common');
        expect(sender.lastMessage).toContain('common');
        expect(sender.speaking).toBe(Language.Common);
      });

      it('should reject unknown language', () => {
        doSpeak(sender, 'klingon');
        expect(sender.lastMessage).toContain('Unknown language');
      });

      it('should reject unlearned language', () => {
        doSpeak(sender, 'elvish');
        expect(sender.lastMessage).toContain("don't know");
      });

      it('should allow immortals to speak any language', () => {
        sender = makePlayer({ name: 'Sender', trust: 55, level: 55 });
        doSpeak(sender, 'dragon');
        expect(sender.lastMessage).toContain('dragon');
        expect(sender.speaking).toBe(Language.Dragon);
      });
    });

    describe('doLanguages()', () => {
      it('should list all 20 languages with comprehension', () => {
        doLanguages(sender, '');
        expect(sender.messages.some(m => m.includes('common'))).toBe(true);
        expect(sender.messages.some(m => m.includes('100%'))).toBe(true);
        expect(sender.messages.some(m => m.includes('elvish'))).toBe(true);
      });

      it('should show speaking indicator', () => {
        sender.speaking = Language.Elvish;
        sender.pcData.learned.set(Language.Elvish, 50);
        doLanguages(sender, '');
        expect(sender.messages.some(m => m.includes('(speaking)'))).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Command Registration
  // ===========================================================================

  describe('registerCommunicationCommands()', () => {
    it('should register all communication commands', () => {
      const registry = new CommandRegistry();
      registerCommunicationCommands(registry);

      const expectedCommands = [
        'chat', 'gossip', 'yell', 'shout', 'say', 'tell', 'reply',
        'whisper', 'gtell', 'clantalk', 'ordertalk', 'counciltalk',
        'guildtalk', 'music', 'newbiechat', 'immtalk', 'racetalk',
        'wartalk', 'emote', 'deaf', 'ignore', 'speak', 'languages',
      ];

      const allCmds = registry.getAllCommands();
      const registeredNames = new Set(allCmds.map(c => c.name));
      for (const cmdName of expectedCommands) {
        expect(registeredNames.has(cmdName), `Command '${cmdName}' should be registered`).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Integration: Language + Channels
  // ===========================================================================

  describe('Language translation through channels', () => {
    it('should translate say messages based on listener comprehension', () => {
      sender.speaking = Language.Elvish;
      sender.pcData.learned.set(Language.Elvish, 100);
      receiver.pcData.learned.set(Language.Elvish, 90);

      doSay(sender, 'Greetings');
      // Receiver has 90% comprehension (>= 85%), should get unscrambled
      expect(receiver.lastMessage).toContain('Greetings');
    });

    it('should scramble say for low comprehension listener', () => {
      sender.speaking = Language.Elvish;
      sender.pcData.learned.set(Language.Elvish, 100);
      // Receiver has 0 comprehension of Elvish

      let wasScrambled = false;
      for (let i = 0; i < 20; i++) {
        receiver.clearMessages();
        doSay(sender, 'Greetings');
        if (!receiver.lastMessage.includes('Greetings')) {
          wasScrambled = true;
          break;
        }
      }
      expect(wasScrambled).toBe(true);
    });

    it('should not scramble for sender echo', () => {
      sender.speaking = Language.Elvish;
      doSay(sender, 'Greetings');
      // Sender always sees their own message unscrambled
      expect(sender.lastMessage).toContain('Greetings');
    });
  });

  // --- PARITY: Missing/Partial test stubs ---
  it.todo('doChat — should verify channel-specific position and flag checks match legacy');
  it.todo('doYell — should verify area-scope broadcast matches legacy yell');
  it.todo('doClanTalk — should verify clan membership check and channel format');
  it.todo('doOrderTalk — should verify order membership and channel format');
  it.todo('doCouncilTalk — should verify council membership and channel format');
  it.todo('doGuildTalk — should verify guild/class channel format');
  it.todo('doMusic — should verify music channel format and restrictions');
  it.todo('doNewbieChat — should verify newbie channel level restrictions');
  it.todo('doWartalk — should verify PK requirement for war channel');
  it.todo('doSayTo — should implement say_to targeting a specific person');
  it.todo('doRetell — should resend last tell to previous recipient');
  it.todo('doBeckon — should beckon a player to approach');
  it.todo('doDismiss — should dismiss a charmed follower');
  it.todo('doRepeat — should display tell history by letter index (a-z)');


});
