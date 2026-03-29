/**
 * GameLoop - Main heartbeat of the SMAUG 2.0 engine.
 *
 * Runs on setInterval at 250ms (4 pulses per second), matching the
 * legacy select()-based loop. Each pulse:
 *   1. Processes pending input from connections
 *   2. Runs tick-based updates via TickEngine
 *   3. Flushes output buffers to connections
 *   4. Monitors performance for lag warnings
 */

import { EventEmitter } from 'events';
import { TickEngine } from './TickEngine.js';
import { GameEvent } from './EventBus.js';

/** Minimal interface for the connection manager consumed by GameLoop. */
export interface IConnectionManager {
  processInput(): void;
  flushOutput(): void;
}

export interface GameLoopConfig {
  /** Milliseconds per pulse. Default 250 (4 pulses/sec). */
  pulseInterval: number;
  /** Whether to randomize area/tick pulse intervals like legacy. */
  randomizePulses: boolean;
}

export class GameLoop extends EventEmitter {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private _pulseCount: number = 0;
  private _running: boolean = false;
  private readonly tickEngine: TickEngine;
  private readonly connectionManager: IConnectionManager;
  private readonly config: GameLoopConfig;

  constructor(
    tickEngine: TickEngine,
    connectionManager: IConnectionManager,
    config: Partial<GameLoopConfig> = {}
  ) {
    super();
    this.tickEngine = tickEngine;
    this.connectionManager = connectionManager;
    this.config = {
      pulseInterval: config.pulseInterval ?? 250,
      randomizePulses: config.randomizePulses ?? true,
    };
  }

  /** Start the game loop. Idempotent if already running. */
  start(): void {
    if (this._running) return;
    this._running = true;
    this.emit('start');

    this.intervalHandle = setInterval(() => {
      this.pulse();
    }, this.config.pulseInterval);
  }

  /** Stop the game loop. Idempotent if already stopped. */
  stop(): void {
    if (!this._running) return;
    this._running = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.emit('stop');
  }

  /** Execute one pulse. */
  private pulse(): void {
    this._pulseCount++;
    const startTime = performance.now();

    // 1. Process all pending input from connections
    this.connectionManager.processInput();

    // 2. Run tick-based updates (combat, mobile AI, area resets, etc.)
    this.tickEngine.pulse(this._pulseCount);

    // 3. Flush output buffers to all connections
    this.connectionManager.flushOutput();

    // 4. Performance monitoring
    const elapsed = performance.now() - startTime;
    if (elapsed > 100) {
      this.emit(GameEvent.LagWarning, {
        pulseCount: this._pulseCount,
        elapsedMs: elapsed,
      });
    }
  }

  /** Whether the game loop is currently running. */
  get isRunning(): boolean {
    return this._running;
  }

  /** The current pulse count since start. */
  get currentPulse(): number {
    return this._pulseCount;
  }
}
