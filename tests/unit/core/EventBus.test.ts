import { describe, it, expect, vi } from 'vitest';
import { EventBus, GameEvent } from '../../../src/core/EventBus.js';

describe('EventBus', () => {
  it('should emit and receive events synchronously', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on(GameEvent.SecondTick, handler);
    bus.emit(GameEvent.SecondTick, { pulse: 1 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ pulse: 1 });
  });

  it('should fire multiple listeners in registration order', () => {
    const bus = new EventBus();
    const order: number[] = [];

    bus.on(GameEvent.ViolenceTick, () => order.push(1));
    bus.on(GameEvent.ViolenceTick, () => order.push(2));
    bus.on(GameEvent.ViolenceTick, () => order.push(3));

    bus.emit(GameEvent.ViolenceTick, { pulse: 10 });

    expect(order).toEqual([1, 2, 3]);
  });

  it('should support typed emitEvent wrapper', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on(GameEvent.CombatDamage, handler);

    const payload = {
      attackerId: 'a1',
      victimId: 'v1',
      damage: 42,
      damageType: 'slash',
    };

    const result = bus.emitEvent(GameEvent.CombatDamage, payload);

    expect(result).toBe(true);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('should not throw when emitting unregistered events', () => {
    const bus = new EventBus();

    expect(() => {
      bus.emit(GameEvent.MudProgTrigger, { data: 'test' });
    }).not.toThrow();
  });

  it('should return false when no listeners for emitEvent', () => {
    const bus = new EventBus();
    const result = bus.emitEvent(GameEvent.Shutdown, { reason: 'test' });
    expect(result).toBe(false);
  });

  it('should have maxListeners set to 200', () => {
    const bus = new EventBus();
    expect(bus.getMaxListeners()).toBe(200);
  });
});
