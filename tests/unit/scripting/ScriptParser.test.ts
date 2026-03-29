import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TriggerType,
  ScriptParser,
  checkTrigger,
  checkGreetProg,
  checkSpeechProg,
  checkDeathProg,
  checkBribeProg,
  checkRandProg,
  checkGiveProg,
} from '../../../src/scripting/ScriptParser.js';
import { setInterpreter } from '../../../src/scripting/MudProgEngine.js';
import { setGameHour } from '../../../src/scripting/IfcheckRegistry.js';
import { Mobile } from '../../../src/game/entities/Mobile.js';
import { Player } from '../../../src/game/entities/Player.js';
import { Sex, Position } from '../../../src/game/entities/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

const defaultProto = {
  vnum: 3001,
  name: 'guard',
  shortDesc: 'a city guard',
  longDesc: 'A city guard stands here.',
  description: '',
  actFlags: 0n,
  affectedBy: 0n,
  alignment: 0,
  level: 10,
  hitroll: 3,
  damroll: 2,
  hitDice: { num: 3, size: 8, bonus: 20 },
  damageDice: { num: 1, size: 6, bonus: 2 },
  gold: 100,
  exp: 500,
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

function makeMob(progs: Array<{ triggerType: number; argList: string; commandList: string }> = []): Mobile {
  const mob = new Mobile(defaultProto);
  (mob as any).mudProgs = progs;
  (mob as any).inRoom = { characters: [], contents: [] };
  return mob;
}

function makeObj(overrides: Record<string, unknown> = {}): any {
  return {
    name: 'golden key',
    shortDescription: 'a golden key',
    itemType: 18,
    values: [0, 0, 0, 0, 0, 0],
    prototype: { vnum: 5001 },
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('ScriptParser', () => {
  describe('TriggerType enum', () => {
    it('has all expected trigger types', () => {
      expect(TriggerType.ACT_PROG).toBe(0);
      expect(TriggerType.SPEECH_PROG).toBe(1);
      expect(TriggerType.RAND_PROG).toBe(2);
      expect(TriggerType.FIGHT_PROG).toBe(3);
      expect(TriggerType.DEATH_PROG).toBe(5);
      expect(TriggerType.GREET_PROG).toBe(7);
      expect(TriggerType.GIVE_PROG).toBe(9);
      expect(TriggerType.BRIBE_PROG).toBe(10);
      expect(TriggerType.LEAVE_PROG).toBe(27);
      expect(TriggerType.USE_PROG).toBe(29);
    });
  });

  describe('ScriptParser.parse()', () => {
    it('parses simple commands', () => {
      const parser = new ScriptParser();
      const nodes = parser.parse('say Hello\nemote waves');
      expect(nodes).toHaveLength(2);
      expect(nodes[0]?.type).toBe('command');
      expect(nodes[1]?.type).toBe('command');
    });

    it('parses if/else/endif nodes', () => {
      const parser = new ScriptParser();
      const nodes = parser.parse('if ispc($n)\nsay Hello\nelse\nsay Go away\nendif');
      expect(nodes).toHaveLength(5);
      expect(nodes[0]?.type).toBe('if');
      expect(nodes[1]?.type).toBe('command');
      expect(nodes[2]?.type).toBe('else');
      expect(nodes[3]?.type).toBe('command');
      expect(nodes[4]?.type).toBe('endif');
    });

    it('handles empty input', () => {
      const parser = new ScriptParser();
      const nodes = parser.parse('');
      expect(nodes).toHaveLength(0);
    });
  });

  describe('checkTrigger', () => {
    let executedCommands: string[];

    beforeEach(() => {
      executedCommands = [];
      setInterpreter((_ch, cmd) => {
        executedCommands.push(cmd);
      });
      setGameHour(12);
    });

    it('returns false when mob has no progs', () => {
      const mob = makeMob([]);
      expect(checkTrigger(TriggerType.GREET_PROG, mob, null)).toBe(false);
    });

    it('returns false when no matching trigger type', () => {
      const mob = makeMob([{
        triggerType: TriggerType.SPEECH_PROG,
        argList: 'hello',
        commandList: 'say Hi there!',
      }]);
      const actor = new Player({ name: 'Tester', level: 1 });
      expect(checkTrigger(TriggerType.GREET_PROG, mob, actor)).toBe(false);
    });

    it('executes matching greet prog', () => {
      const mob = makeMob([{
        triggerType: TriggerType.GREET_PROG,
        argList: '100',
        commandList: 'say Welcome!',
      }]);
      const actor = new Player({ name: 'Tester', level: 1 });
      const result = checkTrigger(TriggerType.GREET_PROG, mob, actor);
      expect(result).toBe(true);
      expect(executedCommands).toContain('say Welcome!');
    });

    it('executes matching speech prog', () => {
      const mob = makeMob([{
        triggerType: TriggerType.SPEECH_PROG,
        argList: 'hello',
        commandList: 'say Hi there, $n!',
      }]);
      const actor = new Player({ name: 'Wanderer', level: 5 });
      const result = checkTrigger(TriggerType.SPEECH_PROG, mob, actor, 'hello everyone');
      expect(result).toBe(true);
      expect(executedCommands[0]).toBe('say Hi there, Wanderer!');
    });

    it('speech prog with "p" matches any speech', () => {
      const mob = makeMob([{
        triggerType: TriggerType.SPEECH_PROG,
        argList: 'p',
        commandList: 'say I heard you!',
      }]);
      const actor = new Player({ name: 'Tester', level: 1 });
      expect(checkTrigger(TriggerType.SPEECH_PROG, mob, actor, 'anything at all')).toBe(true);
    });

    it('speech prog does not match unrelated speech', () => {
      const mob = makeMob([{
        triggerType: TriggerType.SPEECH_PROG,
        argList: 'password',
        commandList: 'say Secret!',
      }]);
      const actor = new Player({ name: 'Tester', level: 1 });
      expect(checkTrigger(TriggerType.SPEECH_PROG, mob, actor, 'good morning')).toBe(false);
    });

    it('bribe prog triggers when gold amount is sufficient', () => {
      const mob = makeMob([{
        triggerType: TriggerType.BRIBE_PROG,
        argList: '50',
        commandList: 'say Thank you for your generosity!',
      }]);
      const actor = new Player({ name: 'Tester', level: 1 });
      expect(checkTrigger(TriggerType.BRIBE_PROG, mob, actor, '100')).toBe(true);
      expect(executedCommands).toContain('say Thank you for your generosity!');
    });

    it('bribe prog does not trigger when gold is insufficient', () => {
      const mob = makeMob([{
        triggerType: TriggerType.BRIBE_PROG,
        argList: '100',
        commandList: 'say Thanks!',
      }]);
      const actor = new Player({ name: 'Tester', level: 1 });
      expect(checkTrigger(TriggerType.BRIBE_PROG, mob, actor, '50')).toBe(false);
    });
  });

  describe('exported trigger check functions', () => {
    let executedCommands: string[];

    beforeEach(() => {
      executedCommands = [];
      setInterpreter((_ch, cmd) => {
        executedCommands.push(cmd);
      });
    });

    it('checkGreetProg dispatches correctly', () => {
      const mob = makeMob([{
        triggerType: TriggerType.GREET_PROG,
        argList: '100',
        commandList: 'say Welcome!',
      }]);
      const actor = new Player({ name: 'Visitor', level: 1 });
      expect(checkGreetProg(mob, actor)).toBe(true);
      expect(executedCommands).toContain('say Welcome!');
    });

    it('checkSpeechProg dispatches correctly', () => {
      const mob = makeMob([{
        triggerType: TriggerType.SPEECH_PROG,
        argList: 'quest',
        commandList: 'say A quest, you say?',
      }]);
      const actor = new Player({ name: 'Adventurer', level: 1 });
      expect(checkSpeechProg(mob, actor, 'I seek a quest')).toBe(true);
    });

    it('checkDeathProg dispatches correctly', () => {
      const mob = makeMob([{
        triggerType: TriggerType.DEATH_PROG,
        argList: '100',
        commandList: 'say I shall return!',
      }]);
      const killer = new Player({ name: 'Slayer', level: 1 });
      expect(checkDeathProg(mob, killer)).toBe(true);
    });

    it('checkBribeProg dispatches correctly', () => {
      const mob = makeMob([{
        triggerType: TriggerType.BRIBE_PROG,
        argList: '10',
        commandList: 'say Bribed!',
      }]);
      const actor = new Player({ name: 'Briber', level: 1 });
      expect(checkBribeProg(mob, actor, 50)).toBe(true);
    });

    it('checkGiveProg dispatches correctly', () => {
      const mob = makeMob([{
        triggerType: TriggerType.GIVE_PROG,
        argList: 'all',
        commandList: 'say Thank you for the gift!',
      }]);
      const actor = new Player({ name: 'Giver', level: 1 });
      const obj = makeObj();
      expect(checkGiveProg(mob, actor, obj)).toBe(true);
    });
  });

  // --- PARITY: Partial implementation stubs ---
  it.todo('should parse and execute mpforce command');
  it.todo('should parse and execute mptransfer command');
  it.todo('should parse and execute mpechoat command');
  it.todo('should parse and execute mpoload command');
  it.todo('should parse and execute mpmload command');
  it.todo('should parse and execute mpkill command');
  it.todo('should parse and execute mpjunk command');
  it.todo('should parse and execute mpecho command');
  it.todo('should parse and execute mpechoaround command');
  it.todo('should parse and execute mpat command');


});
