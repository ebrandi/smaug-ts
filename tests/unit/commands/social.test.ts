import { describe, it, expect, beforeEach } from 'vitest';
import { loadSocials, executeSocial, substituteVariables } from '../../../src/game/commands/social.js';
import { CommandRegistry } from '../../../src/game/commands/CommandRegistry.js';
import type { SocialDef } from '../../../src/game/commands/CommandRegistry.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { Sex, Position } from '../../../src/game/entities/types.js';
import { Room } from '../../../src/game/entities/Room.js';
import * as path from 'path';

// Simple mock character for testing
class MockCharacter {
  name: string;
  shortDescription: string;
  sex: Sex;
  keywords: string[];
  inRoom: Room | null = null;
  output: string[] = [];
  isNpc = false;
  position = Position.Standing;
  trust = 0;
  level = 1;
  wait = 0;
  actFlags = 0n;
  affectedBy = 0n;
  inventory: unknown[] = [];
  equipment = new Map();

  constructor(name: string, sex: Sex = Sex.Male) {
    this.name = name;
    this.shortDescription = name;
    this.sex = sex;
    this.keywords = [name.toLowerCase()];
  }

  sendToChar(text: string): void {
    this.output.push(text);
  }

  getTrust(): number { return this.trust; }
  isAffected(_flag: bigint): boolean { return false; }
  isPositionAtLeast(pos: Position): boolean { return this.position >= pos; }
  get isFighting(): boolean { return false; }
  get isImmortal(): boolean { return false; }
}

describe('social.ts', () => {
  let logger: Logger;
  let registry: CommandRegistry;

  beforeEach(() => {
    logger = new Logger(LogLevel.Error);
    registry = new CommandRegistry(logger);
  });

  describe('loadSocials', () => {
    it('should parse JSON correctly and register socials', async () => {
      const filePath = path.resolve(__dirname, '../../../world/socials.json');
      const count = await loadSocials(filePath, registry, logger);

      expect(count).toBeGreaterThan(0);
      expect(registry.getSocialTable().size).toBe(count);
    });

    it('should register known socials', async () => {
      const filePath = path.resolve(__dirname, '../../../world/socials.json');
      await loadSocials(filePath, registry, logger);

      expect(registry.getSocialTable().has('smile')).toBe(true);
      expect(registry.getSocialTable().has('wave')).toBe(true);
      expect(registry.getSocialTable().has('nod')).toBe(true);
    });

    it('should return 0 for missing file', async () => {
      const count = await loadSocials('/nonexistent/path.json', registry, logger);
      expect(count).toBe(0);
    });
  });

  describe('executeSocial', () => {
    const smileSocial: SocialDef = {
      name: 'smile',
      charNoArg: 'You smile happily.',
      othersNoArg: '$n smiles happily.',
      charFound: 'You smile at $N.',
      othersFound: '$n smiles at $N.',
      victFound: '$n smiles at you.',
      charAuto: 'You smile at yourself.',
      othersAuto: '$n smiles at $mself.',
    };

    it('should display charNoArg with no argument', () => {
      const ch = new MockCharacter('Alice', Sex.Female);
      const room = new Room(1000, 'Test Room', '');
      room.addCharacter(ch as unknown as import('../../../src/game/entities/Character.js').Character);

      executeSocial(
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        smileSocial,
        '',
      );

      expect(ch.output.some(o => o.includes('You smile happily.'))).toBe(true);
    });

    it('should display charFound with valid target', () => {
      const ch = new MockCharacter('Alice', Sex.Female);
      const victim = new MockCharacter('Bob', Sex.Male);
      const room = new Room(1000, 'Test Room', '');
      room.addCharacter(ch as unknown as import('../../../src/game/entities/Character.js').Character);
      room.addCharacter(victim as unknown as import('../../../src/game/entities/Character.js').Character);

      executeSocial(
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        smileSocial,
        'Bob',
      );

      expect(ch.output.some(o => o.includes('You smile at Bob.'))).toBe(true);
      expect(victim.output.some(o => o.includes('Alice smiles at you.'))).toBe(true);
    });

    it('should display charAuto with self target', () => {
      const ch = new MockCharacter('Alice', Sex.Female);
      const room = new Room(1000, 'Test Room', '');
      room.addCharacter(ch as unknown as import('../../../src/game/entities/Character.js').Character);

      executeSocial(
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        smileSocial,
        'Alice',
      );

      expect(ch.output.some(o => o.includes('You smile at yourself.'))).toBe(true);
    });

    it('should show error with invalid target', () => {
      const ch = new MockCharacter('Alice', Sex.Female);
      const room = new Room(1000, 'Test Room', '');
      room.addCharacter(ch as unknown as import('../../../src/game/entities/Character.js').Character);

      executeSocial(
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        smileSocial,
        'Nonexistent',
      );

      expect(ch.output.some(o => o.includes("They aren't here."))).toBe(true);
    });
  });

  describe('substituteVariables', () => {
    it('should substitute $n with ch name', () => {
      const ch = new MockCharacter('Alice', Sex.Female);
      const result = substituteVariables(
        '$n smiles.',
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        null,
      );
      expect(result).toBe('Alice smiles.');
    });

    it('should substitute $N with victim name', () => {
      const ch = new MockCharacter('Alice', Sex.Female);
      const victim = new MockCharacter('Bob', Sex.Male);
      const result = substituteVariables(
        '$n smiles at $N.',
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        victim as unknown as import('../../../src/game/entities/Character.js').Character,
      );
      expect(result).toBe('Alice smiles at Bob.');
    });

    it('should substitute pronouns based on sex', () => {
      const ch = new MockCharacter('Alice', Sex.Female);
      const victim = new MockCharacter('Bob', Sex.Male);
      const result = substituteVariables(
        '$e/$m/$s/$E/$M/$S',
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        victim as unknown as import('../../../src/game/entities/Character.js').Character,
      );
      expect(result).toBe('she/her/her/he/him/his');
    });

    it('should handle neutral sex', () => {
      const ch = new MockCharacter('Blob', Sex.Neutral);
      const result = substituteVariables(
        '$e/$m/$s',
        ch as unknown as import('../../../src/game/entities/Character.js').Character,
        null,
      );
      expect(result).toBe('it/it/its');
    });
  });
});
