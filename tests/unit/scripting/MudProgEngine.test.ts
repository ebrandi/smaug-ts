import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  execute,
  evaluateIfcheck,
  setInterpreter,
  type MudProg,
} from '../../../src/scripting/MudProgEngine.js';
import type { MudProgContext } from '../../../src/scripting/VariableSubstitution.js';
import { setGameHour } from '../../../src/scripting/IfcheckRegistry.js';
import { Sex, Position } from '../../../src/game/entities/types.js';
import { Player } from '../../../src/game/entities/Player.js';

// =============================================================================
// Test Helpers
// =============================================================================

function makeChar(overrides: Record<string, unknown> = {}): any {
  return {
    name: 'TestMob',
    shortDescription: 'a test mob',
    sex: Sex.Male,
    level: 10,
    hit: 100,
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

function makeProg(commandList: string, triggerType: number = 0, argList: string = ''): MudProg {
  return { triggerType, argList, commandList };
}

// =============================================================================
// Tests
// =============================================================================

describe('MudProgEngine', () => {
  let executedCommands: Array<{ mob: unknown; command: string }>;

  beforeEach(() => {
    executedCommands = [];
    setInterpreter((ch, cmd) => {
      executedCommands.push({ mob: ch, command: cmd });
    });
    setGameHour(12);
  });

  describe('basic command execution', () => {
    it('executes simple commands', () => {
      const prog = makeProg('say Hello world!\nsay Goodbye!');
      const ctx = makeContext();
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(2);
      expect(executedCommands[0]?.command).toBe('say Hello world!');
      expect(executedCommands[1]?.command).toBe('say Goodbye!');
    });

    it('executes commands as the mob', () => {
      const mob = makeChar({ name: 'SpecialMob' });
      const prog = makeProg('say Test');
      const ctx = makeContext({ mob });
      execute(prog, ctx);

      expect(executedCommands[0]?.mob).toBe(mob);
    });

    it('substitutes variables in commands', () => {
      const prog = makeProg('say Welcome $n!');
      const ctx = makeContext({ actor: makeChar({ name: 'Frodo' }) });
      execute(prog, ctx);

      expect(executedCommands[0]?.command).toBe('say Welcome Frodo!');
    });

    it('handles empty command list', () => {
      const prog = makeProg('');
      const ctx = makeContext();
      execute(prog, ctx);
      expect(executedCommands).toHaveLength(0);
    });

    it('skips blank lines', () => {
      const prog = makeProg('say Hello\n\n\nsay World');
      const ctx = makeContext();
      execute(prog, ctx);
      expect(executedCommands).toHaveLength(2);
    });
  });

  describe('if/else/endif', () => {
    it('executes if-block when condition is true', () => {
      const prog = makeProg([
        'if ispc($n)',
        '  say You are a player!',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: new Player({ name: 'TestPC', level: 1 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say You are a player!');
    });

    it('skips if-block when condition is false', () => {
      const prog = makeProg([
        'if ispc($n)',
        '  say You are a player!',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar() }); // Not a Player instance
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(0);
    });

    it('executes else-block when condition is false', () => {
      const prog = makeProg([
        'if ispc($n)',
        '  say You are a player!',
        'else',
        '  say You are not a player!',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar() });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say You are not a player!');
    });

    it('handles nested if/else/endif', () => {
      const prog = makeProg([
        'if level($n) > 5',
        '  if level($n) > 20',
        '    say You are very powerful!',
        '  else',
        '    say You are strong.',
        '  endif',
        'else',
        '  say You are weak.',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say You are strong.');
    });

    it('handles deeply nested if/else/endif', () => {
      const prog = makeProg([
        'if level($n) > 0',
        '  if level($n) > 5',
        '    if level($n) > 10',
        '      say Level > 10',
        '    endif',
        '  endif',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say Level > 10');
    });

    it('skips nested blocks when parent is false', () => {
      const prog = makeProg([
        'if level($n) > 100',
        '  if level($n) > 0',
        '    say Should not execute',
        '  endif',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(0);
    });
  });

  describe('or conditions', () => {
    it('or succeeds when initial if fails but or matches', () => {
      const prog = makeProg([
        'if level($n) > 100',
        'or level($n) > 5',
        '  say Matched via or!',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say Matched via or!');
    });

    it('or does not re-evaluate when if already true', () => {
      const prog = makeProg([
        'if level($n) > 5',
        'or level($n) > 100',
        '  say Matched!',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
    });

    it('multiple or conditions', () => {
      const prog = makeProg([
        'if level($n) > 100',
        'or level($n) > 200',
        'or level($n) > 5',
        '  say Finally matched!',
        'endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say Finally matched!');
    });
  });

  describe('break statement', () => {
    it('stops execution immediately', () => {
      const prog = makeProg([
        'say Before break',
        'break',
        'say After break',
      ].join('\n'));
      const ctx = makeContext();
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say Before break');
    });

    it('break inside if block stops all execution', () => {
      const prog = makeProg([
        'if level($n) > 5',
        '  say Inside if',
        '  break',
        'endif',
        'say After endif',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(1);
      expect(executedCommands[0]?.command).toBe('say Inside if');
    });
  });

  describe('mob death during execution', () => {
    it('stops execution if mob dies', () => {
      const mob = makeChar({ name: 'DyingMob', position: Position.Standing });
      const prog = makeProg([
        'say First command',
        'say Second command',
      ].join('\n'));
      const ctx = makeContext({ mob });

      // Make the mob "die" after first command
      setInterpreter((ch, cmd) => {
        executedCommands.push({ mob: ch, command: cmd });
        (ch as any).position = Position.Dead;
      });

      execute(prog, ctx);
      expect(executedCommands).toHaveLength(1);
    });
  });

  describe('evaluateIfcheck', () => {
    it('parses simple boolean ifcheck', () => {
      const ctx = makeContext({ actor: new Player({ name: 'TestPC', level: 1 }) });
      expect(evaluateIfcheck('ispc($n)', ctx)).toBe(true);
    });

    it('parses numeric comparison ifcheck', () => {
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      expect(evaluateIfcheck('level($n) > 10', ctx)).toBe(true);
      expect(evaluateIfcheck('level($n) < 10', ctx)).toBe(false);
    });

    it('parses rand ifcheck', () => {
      const ctx = makeContext();
      // rand(100) should always be true
      expect(evaluateIfcheck('rand(100)', ctx)).toBe(true);
      // rand(0) should always be false
      expect(evaluateIfcheck('rand(0)', ctx)).toBe(false);
    });

    it('returns false for invalid syntax', () => {
      const ctx = makeContext();
      expect(evaluateIfcheck('invalid syntax here', ctx)).toBe(false);
    });

    it('returns false for unknown ifcheck', () => {
      const ctx = makeContext();
      expect(evaluateIfcheck('unknowncheck($n)', ctx)).toBe(false);
    });

    it('handles $i target (mob itself)', () => {
      const ctx = makeContext({ mob: makeChar({ level: 20 }) });
      expect(evaluateIfcheck('level($i) > 15', ctx)).toBe(true);
    });
  });

  describe('commands after flow control', () => {
    it('executes commands before and after if block', () => {
      const prog = makeProg([
        'say Before if',
        'if level($n) > 5',
        '  say Inside if',
        'endif',
        'say After if',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(3);
      expect(executedCommands[0]?.command).toBe('say Before if');
      expect(executedCommands[1]?.command).toBe('say Inside if');
      expect(executedCommands[2]?.command).toBe('say After if');
    });

    it('executes commands after false if block', () => {
      const prog = makeProg([
        'say Before if',
        'if level($n) > 100',
        '  say Should not run',
        'endif',
        'say After if',
      ].join('\n'));
      const ctx = makeContext({ actor: makeChar({ level: 15 }) });
      execute(prog, ctx);

      expect(executedCommands).toHaveLength(2);
      expect(executedCommands[0]?.command).toBe('say Before if');
      expect(executedCommands[1]?.command).toBe('say After if');
    });
  });

  // --- PARITY: Partial implementation stubs ---
  it.todo('should support ACT_PROG trigger on character action');
  it.todo('should support SPEECH_PROG trigger on spoken keywords');
  it.todo('should support RAND_PROG random trigger each tick');
  it.todo('should support FIGHT_PROG trigger during combat');
  it.todo('should support DEATH_PROG trigger on NPC death');
  it.todo('should support HITPRCNT_PROG trigger at health thresholds');
  it.todo('should support ENTRY_PROG trigger when NPC enters room');
  it.todo('should support GREET_PROG trigger when player enters room');
  it.todo('should support ALL_GREET_PROG trigger for any entry');
  it.todo('should support GIVE_PROG trigger when item given to NPC');
  it.todo('should support BRIBE_PROG trigger when gold given to NPC');
  it.todo('should support TIME_PROG trigger at specific game times');


});
