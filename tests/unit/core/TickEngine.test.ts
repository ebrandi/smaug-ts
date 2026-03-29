import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, GameEvent } from '../../../src/core/EventBus.js';
import { TickEngine, PULSE } from '../../../src/core/TickEngine.js';

describe('TickEngine', () => {
  let bus: EventBus;
  let engine: TickEngine;

  beforeEach(() => {
    bus = new EventBus();
    engine = new TickEngine(bus);
  });

  it('should have correct PULSE constants', () => {
    expect(PULSE.PER_SECOND).toBe(4);
    expect(PULSE.VIOLENCE).toBe(12);
    expect(PULSE.MOBILE).toBe(16);
    expect(PULSE.AUCTION).toBe(36);
    expect(PULSE.AREA).toBe(240);
    expect(PULSE.TICK).toBe(280);
    expect(PULSE.CASINO).toBe(32);
  });

  it('should fire SecondTick every 4 pulses', () => {
    const handler = vi.fn();
    bus.on(GameEvent.SecondTick, handler);

    for (let i = 1; i <= 12; i++) {
      engine.pulse(i);
    }

    // Should fire at pulse 4, 8, 12
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('should fire ViolenceTick every 12 pulses', () => {
    const handler = vi.fn();
    bus.on(GameEvent.ViolenceTick, handler);

    for (let i = 1; i <= 24; i++) {
      engine.pulse(i);
    }

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should fire MobileTick every 16 pulses', () => {
    const handler = vi.fn();
    bus.on(GameEvent.MobileTick, handler);

    for (let i = 1; i <= 48; i++) {
      engine.pulse(i);
    }

    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('should fire AuctionTick every 36 pulses', () => {
    const handler = vi.fn();
    bus.on(GameEvent.AuctionTick, handler);

    for (let i = 1; i <= 72; i++) {
      engine.pulse(i);
    }

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should reset counters after firing', () => {
    const secondHandler = vi.fn();
    bus.on(GameEvent.SecondTick, secondHandler);

    // Fire 8 pulses — should get SecondTick at pulse 4 and 8
    for (let i = 1; i <= 8; i++) {
      engine.pulse(i);
    }
    expect(secondHandler).toHaveBeenCalledTimes(2);

    // Fire 4 more — should fire again at pulse 12
    for (let i = 9; i <= 12; i++) {
      engine.pulse(i);
    }
    expect(secondHandler).toHaveBeenCalledTimes(3);
  });

  it('should fire AreaTick within randomized range (120-360 pulses)', () => {
    const handler = vi.fn();
    bus.on(GameEvent.AreaTick, handler);

    // Run enough pulses to guarantee at least one area tick
    for (let i = 1; i <= 400; i++) {
      engine.pulse(i);
    }

    // Should have fired at least once (initial counter is randomized 120-360)
    expect(handler.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('should fire FullTick within randomized range (210-350 pulses)', () => {
    const handler = vi.fn();
    bus.on(GameEvent.FullTick, handler);

    // Run enough pulses to guarantee at least one full tick
    for (let i = 1; i <= 400; i++) {
      engine.pulse(i);
    }

    // Should have fired at least once
    expect(handler.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('should pass pulse number in tick payload', () => {
    const handler = vi.fn();
    bus.on(GameEvent.SecondTick, handler);

    for (let i = 1; i <= 4; i++) {
      engine.pulse(i);
    }

    expect(handler).toHaveBeenCalledWith({ pulse: 4 });
  });
});
