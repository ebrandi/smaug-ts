/**
 * AffectManager – Central affect lifecycle manager.
 *
 * Applies, removes, and ticks down affects on characters and objects.
 * Replicates legacy affect_to_char(), affect_join(), affect_remove(),
 * affect_strip(), and the affect portion of char_update().
 *
 * Lifecycle:
 *   1. applyAffect()   – Add affect, apply stat modifiers, set bitvector
 *   2. joinAffect()    – Merge with existing or add new
 *   3. removeAffect()  – Reverse stat modifiers, clear bitvector, remove
 *   4. stripAffect()   – Remove all affects of a given type
 *   5. affectUpdate()  – Called every PULSE_TICK, decrements durations
 *
 * Wired to EventBus GameEvent.FullTick for automatic ticking.
 */

import { Character } from '../entities/Character.js';
import { Affect } from '../entities/Affect.js';
import { AFF, Position } from '../entities/types.js';
import { AffectRegistry, defaultAffectRegistry } from './AffectRegistry.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// Character Tracker
// =============================================================================

/**
 * Maintains a set of all active characters for affectUpdate().
 * Characters must be registered/unregistered as they enter/leave the world.
 */
const activeCharacters: Set<Character> = new Set();

/** Register a character for affect ticking. */
export function registerCharacter(ch: Character): void {
  activeCharacters.add(ch);
}

/** Unregister a character from affect ticking. */
export function unregisterCharacter(ch: Character): void {
  activeCharacters.delete(ch);
}

/** Get all currently registered characters (for testing). */
export function getActiveCharacters(): ReadonlySet<Character> {
  return activeCharacters;
}

/** Clear all registered characters (for testing). */
export function clearActiveCharacters(): void {
  activeCharacters.clear();
}

// =============================================================================
// AffectManager
// =============================================================================

export class AffectManager {
  private readonly registry: AffectRegistry;

  constructor(registry: AffectRegistry = defaultAffectRegistry) {
    this.registry = registry;
  }

  /**
   * Add an affect to a character.
   * Replicates legacy affect_to_char().
   *
   * 1. Add to ch.affects array
   * 2. Apply stat modification via affect.applyTo()
   * 3. Handle special cases (blind → sleep forced, etc.)
   */
  applyAffect(ch: Character, affect: Affect): void {
    if (!ch) {
      logger.error('affects', 'applyAffect: null character');
      return;
    }

    // Add and apply
    ch.applyAffect(affect);

    // Handle special bitvector cases
    this.handleApplySpecialCases(ch, affect);

    logger.debug('affects', `Affect applied: type=${affect.type} dur=${affect.duration} to ${ch.name}`);
  }

  /**
   * Merge or add affect. If an affect of the same type and location
   * already exists, combine durations (take max) and stack modifiers.
   * Replicates legacy affect_join().
   */
  joinAffect(ch: Character, affect: Affect): void {
    if (!ch) {
      logger.error('affects', 'joinAffect: null character');
      return;
    }

    const existing = ch.affects.find(
      (a) => a.type === affect.type && a.location === affect.location,
    );

    if (existing) {
      // Unapply old modifier, combine, re-apply
      existing.removeFrom(ch);
      existing.duration = Math.max(existing.duration, affect.duration);
      existing.modifier += affect.modifier;
      existing.applyTo(ch);

      logger.debug('affects', `Affect joined: type=${affect.type} on ${ch.name}`);
    } else {
      this.applyAffect(ch, affect);
    }
  }

  /**
   * Remove a specific affect instance from a character.
   * Replicates legacy affect_remove().
   *
   * 1. Reverse stat modifications
   * 2. Clear bitvector flags (only if no other affect sets same flag)
   * 3. Remove from ch.affects array
   * 4. Handle special cases (fly removal in air = fall)
   */
  removeAffect(ch: Character, affect: Affect): void {
    if (!ch) {
      logger.error('affects', 'removeAffect: null character');
      return;
    }

    const idx = ch.affects.indexOf(affect);
    if (idx === -1) {
      logger.warn('affects', 'removeAffect: affect not found on character');
      return;
    }

    // Reverse stat modification
    affect.removeFrom(ch);
    ch.affects.splice(idx, 1);

    // Re-check bitvector: only clear if no other affect sets the same flag
    if (affect.bitvector !== 0n) {
      const otherSetsFlag = ch.affects.some(
        (a) => (a.bitvector & affect.bitvector) !== 0n,
      );
      if (!otherSetsFlag) {
        ch.affectedBy &= ~affect.bitvector;
      } else {
        // Restore the bitvector since removeFrom cleared it
        ch.affectedBy |= affect.bitvector;
      }
    }

    // Handle special removal cases
    this.handleRemoveSpecialCases(ch, affect);

    logger.debug('affects', `Affect removed: type=${affect.type} from ${ch.name}`);
  }

  /**
   * Remove all affects of a given spell/skill type from a character.
   * Replicates legacy affect_strip().
   * Used by cure blindness, cure poison, dispel magic, etc.
   */
  stripAffect(ch: Character, affectType: number): void {
    if (!ch) {
      logger.error('affects', 'stripAffect: null character');
      return;
    }

    // Iterate in reverse to safely remove during iteration
    for (let i = ch.affects.length - 1; i >= 0; i--) {
      const aff = ch.affects[i];
      if (aff && aff.type === affectType) {
        this.removeAffect(ch, aff);
      }
    }
  }

  /**
   * Check if a character has any affect of a given type.
   * Replicates legacy is_affected().
   */
  isAffectedBy(ch: Character, affectType: number): boolean {
    return ch.affects.some((a) => a.type === affectType);
  }

  /**
   * Process affect ticks for all registered characters.
   * Called every PULSE_TICK (via EventBus GameEvent.FullTick).
   *
   * For each character, for each affect:
   *   1. Apply periodic effects (poison damage)
   *   2. Decrement duration (skip permanent affects with duration -1)
   *   3. If duration reaches 0, send expiry message and remove
   */
  affectUpdate(): void {
    for (const ch of activeCharacters) {
      if (!ch || ch.position === Position.Dead) continue;

      // Process affects in reverse for safe removal
      for (let i = ch.affects.length - 1; i >= 0; i--) {
        const affect = ch.affects[i];
        if (!affect) continue;

        // Apply periodic effects before decrementing
        this.applyPeriodicEffect(ch, affect);

        // Tick the affect (decrement duration)
        const expired = affect.tick();

        if (expired) {
          // Send wear-off message
          const def = this.registry.getDefinition(affect.type);
          if (def && def.wearOffMessage) {
            ch.sendToChar(def.wearOffMessage + '\r\n');
          }

          // Remove the affect
          this.removeAffect(ch, affect);
        }
      }
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Handle special cases when applying an affect.
   * Certain bitvector flags have immediate gameplay effects.
   */
  private handleApplySpecialCases(ch: Character, affect: Affect): void {
    // AFF_SLEEP forces character to sleeping position
    if (affect.bitvector !== 0n && (affect.bitvector & AFF.SLEEP) !== 0n) {
      if (ch.position > Position.Sleeping) {
        ch.position = Position.Sleeping;
      }
    }
  }

  /**
   * Handle special cases when removing an affect.
   */
  private handleRemoveSpecialCases(ch: Character, affect: Affect): void {
    // Removing FLY in air sector could cause fall damage
    // (actual fall damage logic will be handled by movement system)
    if (
      affect.bitvector !== 0n &&
      (affect.bitvector & AFF.FLYING) !== 0n &&
      !ch.isAffected(AFF.FLYING)
    ) {
      logger.debug('affects', `${ch.name} is no longer flying`);
    }
  }

  /**
   * Apply periodic effects for certain affect types.
   * Called each tick before duration decrement.
   */
  private applyPeriodicEffect(ch: Character, affect: Affect): void {
    // Poison periodic damage
    if (
      affect.bitvector !== 0n &&
      (affect.bitvector & AFF.POISON) !== 0n &&
      ch.position >= Position.Stunned
    ) {
      const def = this.registry.getDefinition(affect.type);
      if (def?.tickMessage) {
        ch.sendToChar(def.tickMessage + '\r\n');
      }
      const damage = Math.floor(ch.level / 10) + 1;
      ch.hit -= damage;
      ch.updatePosition();
    }
  }
}

// =============================================================================
// EventBus Wiring
// =============================================================================

/** Singleton AffectManager instance. */
let _singletonManager: AffectManager | null = null;

/**
 * Get or create the singleton AffectManager.
 */
export function getAffectManager(registry?: AffectRegistry): AffectManager {
  if (!_singletonManager) {
    _singletonManager = new AffectManager(registry);
  }
  return _singletonManager;
}

/**
 * Reset the singleton (for testing).
 */
export function resetAffectManager(): void {
  _singletonManager = null;
}

/**
 * Wire affectUpdate() to the EventBus FullTick event.
 * Should be called once during game initialization.
 */
export function wireAffectUpdate(eventBus: EventBus, manager?: AffectManager): void {
  const mgr = manager ?? getAffectManager();
  eventBus.on(GameEvent.FullTick, () => {
    mgr.affectUpdate();
  });
  logger.info('affects', 'AffectManager wired to GameEvent.FullTick');
}
