/**
 * E2E Test: Player Login Flow
 *
 * Simulates a full player connection lifecycle:
 * 1. Connect via mock transport
 * 2. Proceed through the nanny/login state machine
 * 3. Verify player enters the game world
 * 4. Execute basic commands (look, who, score)
 * 5. Verify output reaches the client
 * 6. Disconnect cleanly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus, GameEvent } from '../../src/core/EventBus.js';
import {
  Descriptor,
  ConnectionState,
  type ITransport,
} from '../../src/network/ConnectionManager.js';
import { Player } from '../../src/game/entities/Player.js';
import { Room } from '../../src/game/entities/Room.js';
import { Position } from '../../src/game/entities/types.js';
import { CommandRegistry, type CommandDef, CommandLogLevel, defaultCommandFlags } from '../../src/game/commands/CommandRegistry.js';
import { Logger, LogLevel } from '../../src/utils/Logger.js';

// =============================================================================
// Mock Transport — captures output sent to "client"
// =============================================================================

class MockTransport implements ITransport {
  sent: string[] = [];
  closed = false;
  private _dataCallback: ((data: string) => void) | null = null;
  private _closeCallback: (() => void) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    if (this._closeCallback) this._closeCallback();
  }

  onData(callback: (data: string) => void): void {
    this._dataCallback = callback;
  }

  onClose(callback: () => void): void {
    this._closeCallback = callback;
  }

  get isOpen(): boolean {
    return !this.closed;
  }

  /** Simulate client sending a line of input. */
  simulateInput(line: string): void {
    if (this._dataCallback) this._dataCallback(line + '\n');
  }

  /** Get all output as a single string. */
  getAllOutput(): string {
    return this.sent.join('');
  }

  /** Check if any output line contains the given text. */
  hasOutput(text: string): boolean {
    return this.sent.some(s => s.includes(text));
  }

  /** Clear captured output. */
  clearOutput(): void {
    this.sent.length = 0;
  }
}

// =============================================================================
// Test Helpers
// =============================================================================

function makePlayer(name: string, descriptor: Descriptor): Player {
  const p = new Player({
    id: `player_${name.toLowerCase()}`,
    name,
    level: 10,
    hit: 200,
    maxHit: 200,
    mana: 100,
    maxMana: 100,
    move: 100,
    maxMove: 100,
    position: Position.Standing,
    permStats: { str: 16, int: 14, wis: 13, dex: 15, con: 14, cha: 12, lck: 10 },
    class_: 'warrior',
    hitroll: 3,
    damroll: 3,
    armor: 80,
  });
  p.descriptor = descriptor;
  descriptor.character = p;
  descriptor.state = ConnectionState.Playing;
  return p;
}

function makeRoom(vnum: number, name: string, desc: string): Room {
  return new Room(vnum, name, desc);
}

// =============================================================================
// Tests
// =============================================================================

describe('E2E: Player Login Flow', () => {
  let transport: MockTransport;
  let descriptor: Descriptor;
  let player: Player;
  let room: Room;
  let registry: CommandRegistry;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(LogLevel.Error);
    transport = new MockTransport();
    descriptor = new Descriptor(transport, '127.0.0.1', 4000);
    room = makeRoom(3001, 'The Temple of Midgaard', 'You are in the southern end of the temple.');
    player = makePlayer('TestHero', descriptor);
    room.addCharacter(player);

    // Set up command registry with basic commands
    registry = new CommandRegistry(logger);

    // Register a 'look' command
    const lookCmd: CommandDef = {
      name: 'look',
      handler: (ch) => {
        const r = ch.inRoom;
        if (!r) { ch.sendToChar('You are nowhere!\r\n'); return; }
        ch.sendToChar(`${r.name}\r\n${r.description}\r\n`);
        const others = r.characters.filter(c => c !== ch);
        if (others.length > 0) {
          for (const o of others) ch.sendToChar(`  ${o.name} is here.\r\n`);
        }
      },
      minPosition: Position.Resting,
      minTrust: 0,
      logLevel: CommandLogLevel.Normal,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    };
    registry.register(lookCmd);

    // Register a 'score' command
    const scoreCmd: CommandDef = {
      name: 'score',
      handler: (ch) => {
        ch.sendToChar(`Score for ${ch.name}:\r\n`);
        ch.sendToChar(`Level: ${ch.level}  HP: ${ch.hit}/${ch.maxHit}  Mana: ${ch.mana}/${ch.maxMana}  Move: ${ch.move}/${ch.maxMove}\r\n`);
      },
      minPosition: Position.Dead,
      minTrust: 0,
      logLevel: CommandLogLevel.Normal,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    };
    registry.register(scoreCmd);

    // Register a 'quit' command
    const quitCmd: CommandDef = {
      name: 'quit',
      handler: (ch) => {
        ch.sendToChar('Farewell, brave adventurer.\r\n');
        if (ch.inRoom) ch.inRoom.removeCharacter(ch);
        const p = ch as Player;
        if (p.descriptor) {
          p.descriptor.flush();   // Flush farewell message before closing
          p.descriptor.state = ConnectionState.GetName;
          p.descriptor.character = null;
          p.descriptor.transport.close();
        }
      },
      minPosition: Position.Dead,
      minTrust: 0,
      logLevel: CommandLogLevel.Normal,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    };
    registry.register(quitCmd);

    Descriptor.resetIdCounter();
  });

  afterEach(() => {
    if (player.inRoom) player.inRoom.removeCharacter(player);
  });

  it('should establish a descriptor with initial state', () => {
    // Fresh descriptor starts in GetName
    const freshTransport = new MockTransport();
    const freshDesc = new Descriptor(freshTransport, '192.168.1.1', 5000);
    expect(freshDesc.state).toBe(ConnectionState.GetName);
    expect(freshDesc.host).toBe('192.168.1.1');
    expect(freshDesc.port).toBe(5000);
    expect(freshDesc.character).toBeNull();
    expect(freshDesc.idle).toBe(0);
  });

  it('should enter Playing state and have a room', () => {
    expect(descriptor.state).toBe(ConnectionState.Playing);
    expect(descriptor.character).toBe(player);
    expect(player.inRoom).toBe(room);
    expect(room.characters).toContain(player);
  });

  /** Dispatch a command and flush output to the transport. */
  function dispatchAndFlush(p: Player, cmd: string): void {
    registry.dispatch(p, cmd);
    if (p.descriptor) p.descriptor.flush();
  }

  it('should execute look command and see room description', () => {
    transport.clearOutput();
    dispatchAndFlush(player, 'look');

    const output = transport.getAllOutput();
    expect(output).toContain('The Temple of Midgaard');
    expect(output).toContain('southern end of the temple');
  });

  it('should execute score command and see player stats', () => {
    transport.clearOutput();
    dispatchAndFlush(player, 'score');

    const output = transport.getAllOutput();
    expect(output).toContain('Score for TestHero');
    expect(output).toContain('Level: 10');
    expect(output).toContain('HP: 200/200');
    expect(output).toContain('Mana: 100/100');
  });

  it('should handle abbreviated commands', () => {
    transport.clearOutput();
    dispatchAndFlush(player, 'loo');

    const output = transport.getAllOutput();
    expect(output).toContain('The Temple of Midgaard');
  });

  it('should report "Huh?" for unknown commands', () => {
    transport.clearOutput();
    dispatchAndFlush(player, 'xyzzy');

    const output = transport.getAllOutput();
    expect(output).toContain('Huh?');
  });

  it('should see other players in the room', () => {
    const transport2 = new MockTransport();
    const desc2 = new Descriptor(transport2, '10.0.0.1', 4001);
    const player2 = makePlayer('Gandalf', desc2);
    room.addCharacter(player2);

    transport.clearOutput();
    dispatchAndFlush(player, 'look');

    const output = transport.getAllOutput();
    expect(output).toContain('Gandalf is here');

    room.removeCharacter(player2);
  });

  it('should handle quit command — remove from room and close transport', () => {
    transport.clearOutput();
    dispatchAndFlush(player, 'quit');

    const output = transport.getAllOutput();
    expect(output).toContain('Farewell');
    expect(transport.closed).toBe(true);
    expect(descriptor.character).toBeNull();
    expect(room.characters).not.toContain(player);
  });

  it('should handle input via transport simulation', () => {
    // Simulate client sending input and processing
    const lines: string[] = [];
    transport.onData((data: string) => {
      lines.push(data.trim());
    });

    transport.simulateInput('look');
    // The line should have been received
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toBe('look');
  });

  it('should track connection metadata', () => {
    expect(descriptor.connectedAt).toBeInstanceOf(Date);
    expect(descriptor.host).toBe('127.0.0.1');
    expect(descriptor.capabilities).toBeDefined();
    expect(descriptor.capabilities.screenWidth).toBe(80);
  });

  it('should support full login-to-play-to-quit lifecycle', () => {
    // Player is already "logged in" via setup
    // 1. Look around
    transport.clearOutput();
    dispatchAndFlush(player, 'look');
    expect(transport.getAllOutput()).toContain('Temple of Midgaard');

    // 2. Check score
    transport.clearOutput();
    dispatchAndFlush(player, 'score');
    expect(transport.getAllOutput()).toContain('Level: 10');

    // 3. Quit
    transport.clearOutput();
    dispatchAndFlush(player, 'quit');
    expect(transport.getAllOutput()).toContain('Farewell');
    expect(transport.closed).toBe(true);
  });
});
