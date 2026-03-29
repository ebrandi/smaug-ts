import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatEngine } from '../../../src/game/combat/CombatEngine.js';
import { DamageCalculator } from '../../../src/game/combat/DamageCalculator.js';
import { DeathHandler } from '../../../src/game/combat/DeathHandler.js';
import { Character, type CharacterInit } from '../../../src/game/entities/Character.js';
import { Room } from '../../../src/game/entities/Room.js';
import { Position, DamageType, AFF, WearLocation, ItemType } from '../../../src/game/entities/types.js';
import { EventBus } from '../../../src/core/EventBus.js';
import { Logger, LogLevel } from '../../../src/utils/Logger.js';
import { VnumRegistry } from '../../../src/game/world/VnumRegistry.js';
import { GameObject } from '../../../src/game/entities/GameObject.js';

// =============================================================================
// Test Character
// =============================================================================

class TestChar extends Character {
  messages: string[] = [];
  private readonly _isNpc: boolean;
  get isNpc(): boolean { return this._isNpc; }
  sendToChar(text: string): void { this.messages.push(text); }
  get lastMessage(): string { return this.messages[this.messages.length - 1] ?? ''; }
  clearMessages(): void { this.messages = []; }
  constructor(init?: CharacterInit, isNpc = false) {
    super(init);
    this._isNpc = isNpc;
  }
}

function makeChar(init?: Partial<CharacterInit>, isNpc = false): TestChar {
  return new TestChar({
    id: `test_${Math.random().toString(36).slice(2)}`,
    name: 'TestHero',
    level: 10,
    hit: 100,
    maxHit: 100,
    armor: 100,
    position: Position.Standing,
    permStats: { str: 15, int: 14, wis: 13, dex: 12, con: 11, cha: 10, lck: 9 },
    class_: 'warrior',
    ...init,
  }, isNpc);
}

function makeRoom(vnum: number): Room {
  return new Room(vnum, `Room ${vnum}`, `Description ${vnum}`);
}

function makeWeapon(): GameObject {
  GameObject.resetCounters();
  return new GameObject({
    vnum: 100,
    name: 'sword',
    shortDesc: 'a sword',
    longDesc: 'A sword lies here.',
    description: 'A gleaming sword.',
    itemType: ItemType.Weapon,
    extraFlags: 0n,
    wearFlags: 0n,
    values: [0, 3, 6, DamageType.Slash, 0, 0], // 3d6 slash
    weight: 5,
    cost: 100,
    rent: 0,
    level: 1,
    layers: 0,
    extraDescriptions: [],
    affects: [],
  });
}

describe('CombatEngine', () => {
  let engine: CombatEngine;
  let eventBus: EventBus;
  let logger: Logger;
  let damageCalc: DamageCalculator;
  let deathHandler: DeathHandler;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = new Logger(LogLevel.Error);
    damageCalc = new DamageCalculator();
    const vnumRegistry = new VnumRegistry();
    deathHandler = new DeathHandler(eventBus, logger, vnumRegistry);
    engine = new CombatEngine(eventBus, logger, damageCalc, deathHandler);
  });

  // ===========================================================================
  // startCombat / stopFighting
  // ===========================================================================

  describe('startCombat', () => {
    it('should set fighting references and positions', () => {
      const ch = makeChar({ name: 'Attacker' });
      const victim = makeChar({ name: 'Victim' });
      const room = makeRoom(1000);
      room.addCharacter(ch);
      room.addCharacter(victim);

      engine.startCombat(ch, victim);

      expect(ch.fighting).toBe(victim);
      expect(victim.fighting).toBe(ch);
      expect(ch.position).toBe(Position.Fighting);
      expect(victim.position).toBe(Position.Fighting);
    });

    it('should not overwrite existing fighting target', () => {
      const ch = makeChar({ name: 'A' });
      const v1 = makeChar({ name: 'V1' });
      const v2 = makeChar({ name: 'V2' });

      engine.startCombat(ch, v1);
      engine.startCombat(ch, v2); // should be ignored

      expect(ch.fighting).toBe(v1);
    });
  });

  describe('stopFighting', () => {
    it('should clear fighting and restore standing position', () => {
      const ch = makeChar();
      const victim = makeChar();
      engine.startCombat(ch, victim);

      engine.stopFighting(ch, false);

      expect(ch.fighting).toBeNull();
      expect(ch.position).toBe(Position.Standing);
      // victim still fighting
      expect(victim.fighting).toBe(ch);
    });

    it('should stop both when fBoth is true', () => {
      const ch = makeChar();
      const victim = makeChar();
      engine.startCombat(ch, victim);

      engine.stopFighting(ch, true);

      expect(ch.fighting).toBeNull();
      expect(victim.fighting).toBeNull();
      expect(ch.position).toBe(Position.Standing);
      expect(victim.position).toBe(Position.Standing);
    });
  });

  // ===========================================================================
  // inflictDamage
  // ===========================================================================

  describe('inflictDamage', () => {
    it('should reduce victim HP by damage amount', () => {
      const ch = makeChar({ name: 'Attacker' });
      const victim = makeChar({ name: 'Victim', hit: 50, maxHit: 100 });
      const room = makeRoom(1000);
      room.addCharacter(ch);
      room.addCharacter(victim);

      engine.inflictDamage(ch, victim, 10, DamageType.Slash);

      expect(victim.hit).toBe(40);
    });

    it('should send miss message for 0 damage', () => {
      const ch = makeChar({ name: 'Attacker' });
      const victim = makeChar({ name: 'Victim', hit: 50 });
      const room = makeRoom(1000);
      room.addCharacter(ch);
      room.addCharacter(victim);

      engine.inflictDamage(ch, victim, 0, DamageType.Hit);

      expect(ch.messages.some(m => m.includes('misses'))).toBe(true);
    });

    it('should trigger death when victim HP drops to lethal', () => {
      const ch = makeChar({ name: 'Attacker' });
      const victim = makeChar({ name: 'Victim', hit: 5 }, true);
      const room = makeRoom(1000);
      room.addCharacter(ch);
      room.addCharacter(victim);

      engine.startCombat(ch, victim);
      engine.inflictDamage(ch, victim, 20, DamageType.Slash);

      // Victim should be dead and removed from room
      expect(victim.position).toBe(Position.Dead);
    });
  });

  // ===========================================================================
  // applyDamageModifiers
  // ===========================================================================

  describe('applyDamageModifiers', () => {
    it('should halve damage with sanctuary', () => {
      const ch = makeChar();
      const victim = makeChar({ affectedBy: AFF.SANCTUARY });

      const result = engine.applyDamageModifiers(ch, victim, 100, DamageType.Slash);
      expect(result).toBe(50);
    });

    it('should return 0 for immune damage type', () => {
      const ch = makeChar();
      const victim = makeChar({ immune: 1n << 3n }); // Slash immune

      const result = engine.applyDamageModifiers(ch, victim, 100, DamageType.Slash);
      expect(result).toBe(0);
    });

    it('should double damage for susceptible damage type', () => {
      const ch = makeChar();
      const victim = makeChar({ susceptible: 1n << 3n }); // Slash susceptible

      const result = engine.applyDamageModifiers(ch, victim, 50, DamageType.Slash);
      expect(result).toBe(100);
    });

    it('should stack sanctuary with resistance', () => {
      const ch = makeChar();
      const victim = makeChar({
        affectedBy: AFF.SANCTUARY,
        resistant: 1n << 3n, // Slash resistant
      });

      // 100 → 50 (sanctuary) → 25 (resistant halved)
      const result = engine.applyDamageModifiers(ch, victim, 100, DamageType.Slash);
      expect(result).toBe(25);
    });
  });

  // ===========================================================================
  // violenceUpdate
  // ===========================================================================

  describe('violenceUpdate', () => {
    it('should process attacks for fighting characters', () => {
      const ch = makeChar({ name: 'A', hit: 100 });
      const victim = makeChar({ name: 'B', hit: 100 }, true);
      const room = makeRoom(1000);
      room.addCharacter(ch);
      room.addCharacter(victim);

      engine.startCombat(ch, victim);
      const initialHP = victim.hit;

      engine.violenceUpdate([ch, victim]);

      // Victim should have taken some damage (or miss messages sent)
      expect(ch.messages.length).toBeGreaterThan(0);
    });

    it('should stop fighting if characters are in different rooms', () => {
      const ch = makeChar({ name: 'A' });
      const victim = makeChar({ name: 'B' });
      const roomA = makeRoom(1000);
      const roomB = makeRoom(1001);
      roomA.addCharacter(ch);
      roomB.addCharacter(victim);

      ch.fighting = victim;
      ch.position = Position.Fighting;

      engine.violenceUpdate([ch]);

      expect(ch.fighting).toBeNull();
      expect(ch.position).toBe(Position.Standing);
    });
  });

  // ===========================================================================
  // multiHit
  // ===========================================================================

  describe('multiHit', () => {
    it('should execute at least one attack', () => {
      const ch = makeChar({ name: 'A', hit: 100 });
      const victim = makeChar({ name: 'B', hit: 100 }, true);
      const room = makeRoom(1000);
      room.addCharacter(ch);
      room.addCharacter(victim);

      engine.multiHit(ch, victim, null);

      // Should have generated at least one message (hit or miss)
      expect(ch.messages.length).toBeGreaterThanOrEqual(1);
    });

    it('should not attack if victim is already dead', () => {
      const ch = makeChar({ name: 'A', hit: 100 });
      const victim = makeChar({ name: 'B', hit: 0 }, true);

      engine.multiHit(ch, victim, null);

      expect(ch.messages.length).toBe(0);
    });
  });

  // ===========================================================================
  // oneHit
  // ===========================================================================

  describe('oneHit', () => {
    it('should deal at least 1 damage on a hit (non-miss)', () => {
      // Run many times to statistically ensure a hit
      const ch = makeChar({ name: 'A', hitroll: 50, level: 50, damroll: 20 });
      const victim = makeChar({ name: 'B', hit: 10000, maxHit: 10000, armor: 100 }, true);
      const room = makeRoom(1000);
      room.addCharacter(ch);
      room.addCharacter(victim);

      let hitOccurred = false;
      for (let i = 0; i < 100; i++) {
        const hpBefore = victim.hit;
        engine.oneHit(ch, victim, false);
        if (victim.hit < hpBefore) {
          hitOccurred = true;
          break;
        }
      }
      expect(hitOccurred).toBe(true);
    });
  });
});
