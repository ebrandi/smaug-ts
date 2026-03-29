import { describe, it, expect, beforeEach } from 'vitest';
import { TriggerType, checkTrigger, checkGreetProg, checkSpeechProg } from '../../src/scripting/ScriptParser.js';
import { setInterpreter, type MudProg } from '../../src/scripting/MudProgEngine.js';
import { setGameHour } from '../../src/scripting/IfcheckRegistry.js';
import { Mobile } from '../../src/game/entities/Mobile.js';
import { Player } from '../../src/game/entities/Player.js';
import { Sex, Position } from '../../src/game/entities/types.js';

// =============================================================================
// Integration Tests – Full MudProg execution pipeline
// =============================================================================

const defaultProto = {
  vnum: 5000,
  name: 'shopkeeper',
  shortDesc: 'a friendly shopkeeper',
  longDesc: 'A friendly shopkeeper stands here, ready to help.',
  description: '',
  actFlags: 0n,
  affectedBy: 0n,
  alignment: 500,
  level: 15,
  hitroll: 3,
  damroll: 2,
  hitDice: { num: 3, size: 8, bonus: 30 },
  damageDice: { num: 1, size: 6, bonus: 2 },
  gold: 1000,
  exp: 1000,
  sex: Sex.Male,
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

describe('MudProg Execution Integration', () => {
  let executedCommands: Array<{ mob: any; command: string }>;

  beforeEach(() => {
    executedCommands = [];
    setInterpreter((ch, cmd) => {
      executedCommands.push({ mob: ch, command: cmd });
    });
    setGameHour(12);
  });

  it('greet prog says Welcome when a player enters', () => {
    const mob = new Mobile(defaultProto);
    (mob as any).mudProgs = [{
      triggerType: TriggerType.GREET_PROG,
      argList: '100',
      commandList: 'say Welcome to my shop, $n!',
    }] as MudProg[];
    (mob as any).inRoom = { characters: [], contents: [] };

    const player = new Player({ name: 'Adventurer', level: 5 });
    const result = checkGreetProg(mob, player);

    expect(result).toBe(true);
    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0]?.command).toBe('say Welcome to my shop, Adventurer!');
    expect(executedCommands[0]?.mob).toBe(mob);
  });

  it('speech prog responds to keyword with conditional logic', () => {
    const mob = new Mobile(defaultProto);
    (mob as any).mudProgs = [{
      triggerType: TriggerType.SPEECH_PROG,
      argList: 'quest',
      commandList: [
        'if level($n) > 10',
        '  say You look experienced enough for a quest, $n.',
        '  say Seek the dragon in the northern caves!',
        'else',
        '  say Come back when you are stronger, $n.',
        'endif',
      ].join('\n'),
    }] as MudProg[];
    (mob as any).inRoom = { characters: [], contents: [] };

    // Test with low-level player
    const lowPlayer = new Player({ name: 'Newbie', level: 5 });
    checkSpeechProg(mob, lowPlayer, 'I seek a quest');

    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0]?.command).toBe('say Come back when you are stronger, Newbie.');

    // Reset and test with high-level player
    executedCommands = [];
    const highPlayer = new Player({ name: 'Veteran', level: 20 });
    checkSpeechProg(mob, highPlayer, 'I seek a quest');

    expect(executedCommands).toHaveLength(2);
    expect(executedCommands[0]?.command).toBe('say You look experienced enough for a quest, Veteran.');
    expect(executedCommands[1]?.command).toBe('say Seek the dragon in the northern caves!');
  });

  it('death prog executes when triggered', () => {
    const mob = new Mobile(defaultProto);
    (mob as any).mudProgs = [{
      triggerType: TriggerType.DEATH_PROG,
      argList: '100',
      commandList: [
        'say I shall return!',
        'say Remember my name, $n!',
      ].join('\n'),
    }] as MudProg[];
    (mob as any).inRoom = { characters: [], contents: [] };

    const killer = new Player({ name: 'Slayer', level: 30 });
    const result = checkTrigger(TriggerType.DEATH_PROG, mob, killer);

    expect(result).toBe(true);
    expect(executedCommands).toHaveLength(2);
    expect(executedCommands[0]?.command).toBe('say I shall return!');
    expect(executedCommands[1]?.command).toBe('say Remember my name, Slayer!');
  });

  it('multiple progs on same mob with different triggers', () => {
    const mob = new Mobile(defaultProto);
    (mob as any).mudProgs = [
      {
        triggerType: TriggerType.GREET_PROG,
        argList: '100',
        commandList: 'say Hello there!',
      },
      {
        triggerType: TriggerType.SPEECH_PROG,
        argList: 'help',
        commandList: 'say How can I help you, $n?',
      },
    ] as MudProg[];
    (mob as any).inRoom = { characters: [], contents: [] };

    const player = new Player({ name: 'Visitor', level: 1 });

    // Trigger greet
    checkGreetProg(mob, player);
    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0]?.command).toBe('say Hello there!');

    // Trigger speech
    executedCommands = [];
    checkSpeechProg(mob, player, 'Can you help me?');
    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0]?.command).toBe('say How can I help you, Visitor?');
  });

  it('complex nested conditions with or', () => {
    const mob = new Mobile(defaultProto);
    (mob as any).mudProgs = [{
      triggerType: TriggerType.SPEECH_PROG,
      argList: 'p',
      commandList: [
        'if isgood($n)',
        'or isneutral($n)',
        '  say Welcome, friend.',
        'else',
        '  say Begone, villain!',
        'endif',
      ].join('\n'),
    }] as MudProg[];
    (mob as any).inRoom = { characters: [], contents: [] };

    // Good-aligned player
    const goodPlayer = new Player({ name: 'Paladin', level: 10 });
    goodPlayer.alignment = 750;
    checkSpeechProg(mob, goodPlayer, 'hello');
    expect(executedCommands[0]?.command).toBe('say Welcome, friend.');

    // Evil-aligned player
    executedCommands = [];
    const evilPlayer = new Player({ name: 'Necro', level: 10 });
    evilPlayer.alignment = -750;
    checkSpeechProg(mob, evilPlayer, 'hello');
    expect(executedCommands[0]?.command).toBe('say Begone, villain!');
  });

  it('break stops further execution in prog', () => {
    const mob = new Mobile(defaultProto);
    (mob as any).mudProgs = [{
      triggerType: TriggerType.GREET_PROG,
      argList: '100',
      commandList: [
        'say Step one',
        'if level($n) > 50',
        '  say Step two',
        '  break',
        'endif',
        'say Step three',
      ].join('\n'),
    }] as MudProg[];
    (mob as any).inRoom = { characters: [], contents: [] };

    // High level - should break after step two
    const highPlayer = new Player({ name: 'Legend', level: 60 });
    checkGreetProg(mob, highPlayer);
    expect(executedCommands.map(c => c.command)).toEqual(['say Step one', 'say Step two']);

    // Low level - should get all three steps
    executedCommands = [];
    const lowPlayer = new Player({ name: 'Newbie', level: 5 });
    checkGreetProg(mob, lowPlayer);
    expect(executedCommands.map(c => c.command)).toEqual(['say Step one', 'say Step three']);
  });
});
