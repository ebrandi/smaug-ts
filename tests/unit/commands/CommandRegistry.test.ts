import { describe, it, expect, beforeEach } from 'vitest';
import {
  CommandRegistry,
  CommandLogLevel,
  defaultCommandFlags,
  type CommandDef,
} from '../../../src/game/commands/CommandRegistry.js';
import { Character } from '../../../src/game/entities/Character.js';
import { Position } from '../../../src/game/entities/types.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';

/** Concrete test subclass of Character. */
class TestCharacter extends Character {
  lastMessage = '';
  get isNpc(): boolean { return false; }
  sendToChar(text: string): void { this.lastMessage += text; }
}

function makeChar(trust = 0, position = Position.Standing): TestCharacter {
  const ch = new TestCharacter({ name: 'Tester', trust, position });
  return ch;
}

function makeCommand(name: string, minTrust = 0, minPosition = Position.Standing): CommandDef {
  return {
    name,
    handler: () => {},
    minPosition,
    minTrust,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  };
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(LogLevel.Debug);
    registry = new CommandRegistry(logger);
  });

  describe('parseCommand', () => {
    it('should split input into command and argument', () => {
      expect(registry.parseCommand('look north')).toEqual(['look', 'north']);
    });

    it('should handle command with no argument', () => {
      expect(registry.parseCommand('look')).toEqual(['look', '']);
    });

    it('should trim whitespace', () => {
      expect(registry.parseCommand('  look  north  ')).toEqual(['look', 'north']);
    });

    it('should return empty for empty input', () => {
      expect(registry.parseCommand('')).toEqual(['', '']);
    });

    it('should lowercase the command', () => {
      expect(registry.parseCommand('LOOK north')).toEqual(['look', 'north']);
    });
  });

  describe('strPrefix', () => {
    it('should match exact prefix', () => {
      expect(registry.strPrefix('lo', 'look')).toBe(true);
    });

    it('should match full word', () => {
      expect(registry.strPrefix('look', 'look')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(registry.strPrefix('LO', 'look')).toBe(true);
    });

    it('should reject non-prefix', () => {
      expect(registry.strPrefix('ok', 'look')).toBe(false);
    });

    it('should reject empty prefix', () => {
      expect(registry.strPrefix('', 'look')).toBe(false);
    });

    it('should reject prefix longer than full', () => {
      expect(registry.strPrefix('looking', 'look')).toBe(false);
    });
  });

  describe('registration and dispatch', () => {
    it('should register and dispatch a command', () => {
      let called = false;
      const cmd = makeCommand('look');
      cmd.handler = () => { called = true; };
      registry.register(cmd);

      const ch = makeChar();
      registry.dispatch(ch, 'look');
      expect(called).toBe(true);
    });

    it('should match abbreviated commands', () => {
      let called = false;
      const cmd = makeCommand('look');
      cmd.handler = () => { called = true; };
      registry.register(cmd);

      const ch = makeChar();
      registry.dispatch(ch, 'lo');
      expect(called).toBe(true);
    });

    it('should pass argument to handler', () => {
      let receivedArg = '';
      const cmd = makeCommand('look');
      cmd.handler = (_ch, arg) => { receivedArg = arg; };
      registry.register(cmd);

      const ch = makeChar();
      registry.dispatch(ch, 'look north');
      expect(receivedArg).toBe('north');
    });

    it('should increment useCount', () => {
      const cmd = makeCommand('look');
      registry.register(cmd);

      const ch = makeChar();
      registry.dispatch(ch, 'look');
      registry.dispatch(ch, 'look');
      expect(cmd.useCount).toBe(2);
    });
  });

  describe('trust gating', () => {
    it('should deny commands above character trust', () => {
      const cmd = makeCommand('wizhelp', 60);
      registry.register(cmd);

      const ch = makeChar(0);
      registry.dispatch(ch, 'wizhelp');
      expect(ch.lastMessage).toContain('Huh?');
    });

    it('should allow commands at or below character trust', () => {
      let called = false;
      const cmd = makeCommand('wizhelp', 60);
      cmd.handler = () => { called = true; };
      registry.register(cmd);

      const ch = makeChar(65);
      registry.dispatch(ch, 'wizhelp');
      expect(called).toBe(true);
    });
  });

  describe('checkPosition', () => {
    it('should fail for sleeping character trying standing command', () => {
      const cmd = makeCommand('look', 0, Position.Standing);
      registry.register(cmd);

      const ch = makeChar(0, Position.Sleeping);
      registry.dispatch(ch, 'look');
      expect(ch.lastMessage).toContain('In your dreams, or what?');
    });

    it('should fail for dead character', () => {
      const cmd = makeCommand('look', 0, Position.Standing);
      registry.register(cmd);

      const ch = makeChar(0, Position.Dead);
      registry.dispatch(ch, 'look');
      expect(ch.lastMessage).toContain('DEAD');
    });

    it('should fail for stunned character', () => {
      const cmd = makeCommand('look', 0, Position.Standing);
      registry.register(cmd);

      const ch = makeChar(0, Position.Stunned);
      registry.dispatch(ch, 'look');
      expect(ch.lastMessage).toContain('too stunned');
    });

    it('should fail for resting character', () => {
      const cmd = makeCommand('look', 0, Position.Standing);
      registry.register(cmd);

      const ch = makeChar(0, Position.Resting);
      registry.dispatch(ch, 'look');
      expect(ch.lastMessage).toContain('too relaxed');
    });

    it('should fail for sitting character', () => {
      const cmd = makeCommand('look', 0, Position.Standing);
      registry.register(cmd);

      const ch = makeChar(0, Position.Sitting);
      registry.dispatch(ch, 'look');
      expect(ch.lastMessage).toContain('sitting down');
    });

    it('should fail for fighting character on standing-only commands', () => {
      const cmd = makeCommand('recite', 0, Position.Standing);
      registry.register(cmd);

      const ch = makeChar(0, Position.Fighting);
      registry.dispatch(ch, 'recite');
      expect(ch.lastMessage).toContain('still fighting');
    });
  });

  describe('unknown commands', () => {
    it('should send Huh? for unknown commands', () => {
      const ch = makeChar();
      registry.dispatch(ch, 'xyzzy');
      expect(ch.lastMessage).toContain('Huh?');
    });
  });

  describe('empty input', () => {
    it('should not crash on empty input', () => {
      const ch = makeChar();
      registry.dispatch(ch, '');
      expect(ch.lastMessage).toBe('');
    });
  });
});
