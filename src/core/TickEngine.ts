/**
 * TickEngine - Pulse-based counter system for SMAUG 2.0
 *
 * Manages decrementing counters that drive autonomous game updates.
 * Each subsystem fires at its own cadence, matching the legacy
 * update_handler() in update.c exactly.
 *
 * All PULSE constants replicate the legacy mud.h values.
 */

import { EventBus, GameEvent } from './EventBus.js';
import { numberRange } from '../utils/Dice.js';

/** Pulse constants matching legacy mud.h values exactly. */
export const PULSE = {
  /** Pulses per second: 4 (each pulse = 0.25s). */
  PER_SECOND: 4,
  /** Combat round interval: 12 pulses (3s). */
  VIOLENCE: 12,
  /** NPC AI interval: 16 pulses (4s). */
  MOBILE: 16,
  /** Auction interval: 36 pulses (9s). */
  AUCTION: 36,
  /** Area reset check interval: 240 pulses (60s). */
  AREA: 240,
  /** Full game tick interval: 280 pulses (70s). */
  TICK: 280,
  /** Casino interval: 32 pulses (8s). */
  CASINO: 32,
} as const;

export class TickEngine {
  private counters = {
    violence: PULSE.VIOLENCE,
    mobile: PULSE.MOBILE,
    area: this.randomizeArea(),
    tick: this.randomizeTick(),
    second: PULSE.PER_SECOND,
    auction: PULSE.AUCTION,
  };

  constructor(private readonly eventBus: EventBus) {}

  /**
   * Called once per game loop pulse (~250ms).
   * Decrements all counters and fires events when they reach zero.
   */
  pulse(pulseNumber: number): void {
    // Per-second updates
    if (--this.counters.second <= 0) {
      this.counters.second = PULSE.PER_SECOND;
      this.eventBus.emitEvent(GameEvent.SecondTick, { pulse: pulseNumber });
    }

    // Combat round
    if (--this.counters.violence <= 0) {
      this.counters.violence = PULSE.VIOLENCE;
      this.eventBus.emitEvent(GameEvent.ViolenceTick, { pulse: pulseNumber });
    }

    // NPC AI
    if (--this.counters.mobile <= 0) {
      this.counters.mobile = PULSE.MOBILE;
      this.eventBus.emitEvent(GameEvent.MobileTick, { pulse: pulseNumber });
    }

    // Area reset check (randomized interval)
    if (--this.counters.area <= 0) {
      this.counters.area = this.randomizeArea();
      this.eventBus.emitEvent(GameEvent.AreaTick, { pulse: pulseNumber });
    }

    // Full game tick (randomized interval)
    if (--this.counters.tick <= 0) {
      this.counters.tick = this.randomizeTick();
      this.eventBus.emitEvent(GameEvent.FullTick, { pulse: pulseNumber });
    }

    // Auction
    if (--this.counters.auction <= 0) {
      this.counters.auction = PULSE.AUCTION;
      this.eventBus.emitEvent(GameEvent.AuctionTick, { pulse: pulseNumber });
    }
  }

  /**
   * Legacy: numberRange(PULSE_AREA / 2, 3 * PULSE_AREA / 2) = 120–360 pulses.
   */
  private randomizeArea(): number {
    return numberRange(PULSE.AREA / 2, (3 * PULSE.AREA) / 2);
  }

  /**
   * Legacy: numberRange(PULSE_TICK * 0.75, PULSE_TICK * 1.25) = 210–350 pulses.
   */
  private randomizeTick(): number {
    return numberRange(
      Math.floor(PULSE.TICK * 0.75),
      Math.floor(PULSE.TICK * 1.25)
    );
  }
}
