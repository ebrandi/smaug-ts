/**
 * CommandRegistry – Central command lookup and dispatch.
 *
 * Maps command strings to handler functions with trust-level gating,
 * positional requirements, and logging. Uses a 126-bucket hash table
 * keyed by the first character of the command name.
 *
 * Enhanced with: command lag/wait handling, OLC editor routing,
 * freeze check, enhanced logging with logLevel, social fallback.
 */

import { Position } from '../entities/types.js';
import { AFF } from '../entities/types.js';
import type { Character } from '../entities/Character.js';
import { Logger } from '../../utils/Logger.js';
import { ConnectionState } from '../../network/ConnectionManager.js';

// =============================================================================
// Enums & Interfaces
// =============================================================================

/** Command logging level (separate from Logger.LogLevel). */
export enum CommandLogLevel {
  Never  = 0,
  Normal = 1,
  Build  = 2,
  High   = 3,
  Always = 4,
}

/** Flags controlling command availability. */
export interface CommandFlags {
  noPossess: boolean;
  noPolymorphed: boolean;
  watched: boolean;
  retired: boolean;
  noAbort: boolean;
}

/** Fully-defined command entry. */
export interface CommandDef {
  name: string;
  handler: (ch: Character, argument: string) => void;
  minPosition: Position;
  minTrust: number;
  logLevel: CommandLogLevel;
  flags: CommandFlags;
  useCount: number;
  lagCount: number;
}

/** Social command definition. */
export interface SocialDef {
  name: string;
  charNoArg: string;
  othersNoArg: string;
  charFound: string;
  othersFound: string;
  victFound: string;
  charAuto: string;
  othersAuto: string;
}

/** Default command flags. */
export function defaultCommandFlags(): CommandFlags {
  return {
    noPossess: false,
    noPolymorphed: false,
    watched: false,
    retired: false,
    noAbort: false,
  };
}

// =============================================================================
// Constants
// =============================================================================

const HASH_SIZE = 126;

/** Frozen flag – bit 6 in actFlags for players. */
const PLR_FROZEN = 1n << 6n;

/** Commands that are exempt from the freeze check. */
const FREEZE_EXEMPT = new Set(['quit', 'delete']);

// =============================================================================
// Queued command for lag handling
// =============================================================================

interface QueuedCommand {
  character: Character;
  input: string;
}

// =============================================================================
// CommandRegistry
// =============================================================================

export class CommandRegistry {
  private readonly hashTable: CommandDef[][];
  private readonly socialTable: Map<string, SocialDef> = new Map();
  private readonly logger: Logger;
  private fLogAll: boolean = false;
  private readonly commandQueue: QueuedCommand[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
    this.hashTable = new Array(HASH_SIZE);
    for (let i = 0; i < HASH_SIZE; i++) {
      this.hashTable[i] = [];
    }
  }

  /** Hash a command name by its first character code (mod HASH_SIZE). */
  private hash(name: string): number {
    const code = name.toLowerCase().charCodeAt(0);
    return code % HASH_SIZE;
  }

  /** Register a command definition. */
  register(cmd: CommandDef): void {
    const bucket = this.hash(cmd.name);
    this.hashTable[bucket]!.push(cmd);
  }

  /** Register a social definition. */
  registerSocial(social: SocialDef): void {
    this.socialTable.set(social.name.toLowerCase(), social);
  }

  /**
   * Toggle global command logging.
   * When enabled, all commands are logged regardless of individual logLevel.
   */
  setLogAll(enabled: boolean): void {
    this.fLogAll = enabled;
  }

  /** Get the logAll flag state. */
  getLogAll(): boolean {
    return this.fLogAll;
  }

  /**
   * Queue a command for later execution (when ch.wait expires).
   */
  queueCommand(ch: Character, input: string): void {
    this.commandQueue.push({ character: ch, input });
  }

  /**
   * Process any queued commands whose wait timers have expired.
   * Should be called each pulse.
   */
  processQueue(): void {
    const remaining: QueuedCommand[] = [];
    for (const queued of this.commandQueue) {
      if (queued.character.wait <= 0) {
        this.dispatch(queued.character, queued.input);
      } else {
        remaining.push(queued);
      }
    }
    this.commandQueue.length = 0;
    this.commandQueue.push(...remaining);
  }

  /**
   * Full command dispatch pipeline.
   *
   * 1. Command lag/wait check – queue if ch.wait > 0
   * 2. OLC editor routing
   * 3. Parse input into [command, argument]
   * 4. Freeze check
   * 5. Hash lookup by first char
   * 6. Abbreviation matching
   * 7. Trust gating
   * 8. Position checking with failure messages
   * 9. Flag checks
   * 10. Enhanced logging with logLevel
   * 11. Execute handler
   * 12. Track stats
   * 13. Social fallback → "Huh?" if nothing matched
   */
  dispatch(ch: Character, input: string): void {
    // 1. Command lag/wait handling
    if (ch.wait > 0) {
      this.queueCommand(ch, input);
      return;
    }

    // 2. OLC editor routing
    // Check if the character has a descriptor in editing state
    const descriptor = this.getDescriptor(ch);
    if (descriptor && descriptor.state === ConnectionState.Editing) {
      // OLC editor handles all input - stub for now
      this.logger.debug('command', `OLC editor routing for ${ch.name}`);
      return;
    }

    const [command, argument] = this.parseCommand(input);
    if (command.length === 0) return;

    // 3. Freeze check
    if ((ch.actFlags & PLR_FROZEN) !== 0n && !FREEZE_EXEMPT.has(command)) {
      ch.sendToChar('You are totally frozen!\r\n');
      return;
    }

    // 4. Hash lookup
    const bucket = this.hash(command);
    const candidates = this.hashTable[bucket]!;

    // Find matching command via abbreviation
    let found: CommandDef | null = null;
    for (const cmd of candidates) {
      if (cmd.flags.retired) continue;
      if (this.strPrefix(command, cmd.name)) {
        // Trust check – skip commands the character can't use
        if (ch.getTrust() < cmd.minTrust) continue;
        found = cmd;
        break;
      }
    }

    if (found) {
      // Position check
      if (!this.checkPosition(ch, found.minPosition)) {
        return;
      }

      // Flag checks
      if (found.flags.noPossess && ch.isAffected(AFF.POSSESS)) {
        ch.sendToChar("You can't do that while possessed!\r\n");
        return;
      }

      // 5. Enhanced logging
      this.logCommand(ch, found, argument);

      // Execute with error isolation and timing
      found.useCount++;
      const start = performance.now();

      this.logger.wrapCommandExecution(
        found.name,
        () => found.handler(ch, argument),
        ch.name,
      );

      const elapsed = performance.now() - start;
      if (elapsed > 1500) {
        found.lagCount++;
        this.logger.warn('command', `Command '${found.name}' took ${elapsed.toFixed(0)}ms for ${ch.name}`);
      }

      return;
    }

    // Social fallback
    if (this.checkSocial(ch, command, argument)) {
      return;
    }

    // Nothing matched
    ch.sendToChar('Huh?\r\n');
  }

  /**
   * Parse input into [command, argument].
   * Trims leading/trailing whitespace, splits on first whitespace.
   */
  parseCommand(input: string): [string, string] {
    const trimmed = input.trim();
    if (trimmed.length === 0) return ['', ''];

    const spaceIdx = trimmed.search(/\s/);
    if (spaceIdx === -1) {
      return [trimmed.toLowerCase(), ''];
    }

    const command = trimmed.slice(0, spaceIdx).toLowerCase();
    const argument = trimmed.slice(spaceIdx).trimStart();
    return [command, argument];
  }

  /**
   * Case-insensitive prefix check.
   * Returns true if `prefix` is a prefix of `full`.
   */
  strPrefix(prefix: string, full: string): boolean {
    if (prefix.length === 0) return false;
    if (prefix.length > full.length) return false;
    return full.toLowerCase().startsWith(prefix.toLowerCase());
  }

  /**
   * Check if the character's position meets the minimum requirement.
   * Sends appropriate failure message if not.
   */
  checkPosition(ch: Character, minPosition: Position): boolean {
    if (ch.position >= minPosition) return true;

    switch (ch.position) {
      case Position.Dead:
        ch.sendToChar('A little difficult to do when you are DEAD...\r\n');
        break;
      case Position.Mortal:
      case Position.Incap:
        ch.sendToChar('You are hurt far too badly for that.\r\n');
        break;
      case Position.Stunned:
        ch.sendToChar('You are too stunned to do that.\r\n');
        break;
      case Position.Sleeping:
        ch.sendToChar('In your dreams, or what?\r\n');
        break;
      case Position.Resting:
        ch.sendToChar('Nah... You feel too relaxed...\r\n');
        break;
      case Position.Sitting:
        ch.sendToChar("You can't do that sitting down.\r\n");
        break;
      case Position.Fighting:
      case Position.Defensive:
      case Position.Aggressive:
      case Position.Evasive:
      case Position.Berserk:
        ch.sendToChar('No way! You are still fighting!\r\n');
        break;
      default:
        ch.sendToChar('You are not in the correct position.\r\n');
        break;
    }

    return false;
  }

  /**
   * Check if the command matches a social and execute it.
   * Returns true if a social was found and executed.
   */
  checkSocial(ch: Character, command: string, argument: string): boolean {
    // Look up social by prefix matching
    for (const [name, social] of this.socialTable) {
      if (this.strPrefix(command, name)) {
        this.executeSocial(ch, social, argument);
        return true;
      }
    }
    return false;
  }

  /**
   * Execute a social command with variable substitution.
   */
  executeSocial(ch: Character, social: SocialDef, argument: string): void {
    // Imported lazily to avoid circular dependency
    const { executeSocial: execSoc } = require('./social.js') as {
      executeSocial: (ch: Character, social: SocialDef, argument: string) => void;
    };
    execSoc(ch, social, argument);
  }

  /**
   * Log a command execution based on logLevel and fLogAll settings.
   */
  logCommand(ch: Character, cmd: CommandDef, argument: string): void {
    if (cmd.logLevel === CommandLogLevel.Never) {
      return;
    }

    if (cmd.logLevel === CommandLogLevel.Always || this.fLogAll || cmd.logLevel >= CommandLogLevel.High) {
      this.logger.info('command', `${ch.name}: ${cmd.name} ${argument}`);
    }
  }

  /**
   * Try to get a descriptor from a character (for OLC editor routing).
   * Returns the descriptor if the character is a Player with one.
   */
  private getDescriptor(ch: Character): { state: ConnectionState } | null {
    // Players have a descriptor property
    const player = ch as unknown as { descriptor?: { state: ConnectionState } | null };
    return player.descriptor ?? null;
  }

  /** Get all registered commands (for listing/debugging). */
  getAllCommands(): CommandDef[] {
    const all: CommandDef[] = [];
    for (const bucket of this.hashTable) {
      all.push(...bucket);
    }
    return all;
  }

  /** Get all registered socials. */
  getAllSocials(): SocialDef[] {
    return Array.from(this.socialTable.values());
  }

  /** Get the social table (for testing/external access). */
  getSocialTable(): Map<string, SocialDef> {
    return this.socialTable;
  }
}
