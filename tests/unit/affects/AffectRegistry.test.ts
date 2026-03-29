import { describe, it, expect, beforeEach } from 'vitest';
import { AffectRegistry, SPELL, defaultAffectRegistry } from '../../../src/game/affects/AffectRegistry.js';
import { AFF } from '../../../src/game/entities/types.js';

describe('AffectRegistry', () => {
  let registry: AffectRegistry;

  beforeEach(() => {
    registry = new AffectRegistry();
  });

  describe('default registrations', () => {
    it('should have all default spell types registered', () => {
      const spellValues = Object.values(SPELL);
      for (const sn of spellValues) {
        expect(registry.has(sn)).toBe(true);
      }
    });

    it('should have the correct count of default registrations', () => {
      expect(registry.size).toBe(Object.keys(SPELL).length);
    });

    it('should return all registered type IDs', () => {
      const types = registry.getRegisteredTypes();
      expect(types.length).toBe(registry.size);
    });
  });

  describe('specific affect definitions', () => {
    it('BLINDNESS should have AFF.BLIND bitvector', () => {
      const def = registry.getDefinition(SPELL.BLINDNESS);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.BLIND);
      expect(def!.name).toBe('blindness');
      expect(def!.dispellable).toBe(true);
    });

    it('SANCTUARY should have AFF.SANCTUARY bitvector', () => {
      const def = registry.getDefinition(SPELL.SANCTUARY);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.SANCTUARY);
      expect(def!.wearOffMessage).toBe('The white aura around your body fades.');
    });

    it('POISON should have a tickMessage', () => {
      const def = registry.getDefinition(SPELL.POISON);
      expect(def).toBeDefined();
      expect(def!.tickMessage).toBe('You feel very sick.');
      expect(def!.bitvector).toBe(AFF.POISON);
    });

    it('INVIS should have AFF.INVISIBLE bitvector', () => {
      const def = registry.getDefinition(SPELL.INVIS);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.INVISIBLE);
    });

    it('FLY should have AFF.FLYING bitvector', () => {
      const def = registry.getDefinition(SPELL.FLY);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.FLYING);
    });

    it('BERSERK should not be dispellable', () => {
      const def = registry.getDefinition(SPELL.BERSERK);
      expect(def).toBeDefined();
      expect(def!.dispellable).toBe(false);
    });

    it('ARMOR should have no bitvector', () => {
      const def = registry.getDefinition(SPELL.ARMOR);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(0n);
    });

    it('CHARM_PERSON should have AFF.CHARM bitvector', () => {
      const def = registry.getDefinition(SPELL.CHARM_PERSON);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.CHARM);
    });

    it('SLEEP should have AFF.SLEEP bitvector', () => {
      const def = registry.getDefinition(SPELL.SLEEP);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.SLEEP);
    });

    it('FIRESHIELD should have AFF.FIRESHIELD bitvector', () => {
      const def = registry.getDefinition(SPELL.FIRESHIELD);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.FIRESHIELD);
    });

    it('SHOCKSHIELD should have AFF.SHOCKSHIELD bitvector', () => {
      const def = registry.getDefinition(SPELL.SHOCKSHIELD);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.SHOCKSHIELD);
    });

    it('ICESHIELD should have AFF.ICESHIELD bitvector', () => {
      const def = registry.getDefinition(SPELL.ICESHIELD);
      expect(def).toBeDefined();
      expect(def!.bitvector).toBe(AFF.ICESHIELD);
    });

    it('all definitions should have a non-empty name', () => {
      for (const sn of Object.values(SPELL)) {
        const def = registry.getDefinition(sn);
        expect(def).toBeDefined();
        expect(def!.name.length).toBeGreaterThan(0);
      }
    });

    it('all definitions should have a wearOffMessage', () => {
      for (const sn of Object.values(SPELL)) {
        const def = registry.getDefinition(sn);
        expect(def).toBeDefined();
        expect(typeof def!.wearOffMessage).toBe('string');
      }
    });
  });

  describe('custom registration', () => {
    it('should allow registering custom affect types', () => {
      registry.register(999, {
        name: 'custom',
        wearOffMessage: 'Custom wears off.',
        dispellable: true,
        bitvector: 0n,
        join: false,
      });
      expect(registry.has(999)).toBe(true);
      expect(registry.getDefinition(999)!.name).toBe('custom');
    });

    it('should override existing registrations', () => {
      registry.register(SPELL.ARMOR, {
        name: 'super armor',
        wearOffMessage: 'Super armor fades.',
        dispellable: false,
        bitvector: 0n,
        join: true,
      });
      expect(registry.getDefinition(SPELL.ARMOR)!.name).toBe('super armor');
    });

    it('should return undefined for unregistered types', () => {
      expect(registry.getDefinition(9999)).toBeUndefined();
    });
  });

  describe('defaultAffectRegistry singleton', () => {
    it('should be an instance of AffectRegistry', () => {
      expect(defaultAffectRegistry).toBeInstanceOf(AffectRegistry);
    });

    it('should have default registrations', () => {
      expect(defaultAffectRegistry.has(SPELL.SANCTUARY)).toBe(true);
    });
  });
});
