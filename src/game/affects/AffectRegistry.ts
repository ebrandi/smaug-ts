/**
 * AffectRegistry – Known affect type definitions and metadata.
 *
 * Maps affect type IDs (spell/skill numbers) to their metadata:
 * display name, wear-off message, tick message, bitvector flag,
 * whether the affect is dispellable, and whether it stacks (join).
 *
 * This registry holds the "template" data for known affects.
 * The AffectManager uses this to look up messages and behaviors.
 */

import { AFF } from '../entities/types.js';

// =============================================================================
// Interfaces
// =============================================================================

/** Metadata for a known affect type. */
export interface AffectDefinition {
  /** Human-readable name for the affect. */
  name: string;
  /** Message sent to character when affect wears off. Empty = silent. */
  wearOffMessage: string;
  /** Message sent each tick while affect is active (e.g., poison). */
  tickMessage?: string;
  /** Whether dispel magic can remove this affect. */
  dispellable: boolean;
  /** Bitvector flag associated with this affect (0n = none). */
  bitvector: bigint;
  /** Whether duplicate affects should stack (join) or be rejected. */
  join: boolean;
}

// =============================================================================
// Spell/Skill Number Constants (matches legacy gsn_ values)
// These are the type IDs used in Affect.type
// =============================================================================

export const SPELL = {
  ARMOR:            1,
  BLESS:            2,
  BLINDNESS:        3,
  CHARM_PERSON:     4,
  CHILL_TOUCH:      5,
  CURSE:            6,
  DETECT_EVIL:      7,
  DETECT_INVIS:     8,
  DETECT_MAGIC:     9,
  DETECT_HIDDEN:   10,
  DETECT_POISON:   11,
  FAERIE_FIRE:     12,
  FLY:             13,
  GIANT_STRENGTH:  14,
  INVIS:           15,
  PASS_DOOR:       16,
  POISON:          17,
  PROTECT_EVIL:    18,
  SANCTUARY:       19,
  SLEEP:           20,
  SNEAK:           21,
  HIDE:            22,
  HASTE:           23,
  SLOW:            24,
  INFRARED:        25,
  TRUESIGHT:       26,
  SCRYING:         27,
  FIRESHIELD:      28,
  SHOCKSHIELD:     29,
  ICESHIELD:       30,
  ACIDMIST:        31,
  VENOMSHIELD:     32,
  PARALYSIS:       33,
  BERSERK:         34,
  AQUA_BREATH:     35,
  SHIELD:          36,
  STONE_SKIN:      37,
  WEAKEN:          38,
  ENHANCE_ARMOR:   39,
  PROTECT_GOOD:    40,
  FLOATING:        41,
  DETECT_TRAPS:    42,
} as const;

// =============================================================================
// AffectRegistry Class
// =============================================================================

export class AffectRegistry {
  /** Map of affect type ID → definition. */
  private readonly affects: Map<number, AffectDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  /** Register an affect type definition. */
  register(type: number, definition: AffectDefinition): void {
    this.affects.set(type, definition);
  }

  /** Look up an affect definition by type ID. */
  getDefinition(type: number): AffectDefinition | undefined {
    return this.affects.get(type);
  }

  /** Check if a type ID is registered. */
  has(type: number): boolean {
    return this.affects.has(type);
  }

  /** Get total number of registered affect types. */
  get size(): number {
    return this.affects.size;
  }

  /** Get all registered type IDs. */
  getRegisteredTypes(): number[] {
    return Array.from(this.affects.keys());
  }

  /**
   * Register all default SMAUG 2.0 affect definitions.
   * These replicate the legacy spell/skill affect behaviors.
   */
  private registerDefaults(): void {
    this.register(SPELL.ARMOR, {
      name: 'armor',
      wearOffMessage: 'You feel less armored.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.BLESS, {
      name: 'bless',
      wearOffMessage: 'You feel less righteous.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.BLINDNESS, {
      name: 'blindness',
      wearOffMessage: 'You can see again.',
      dispellable: true,
      bitvector: AFF.BLIND,
      join: false,
    });

    this.register(SPELL.CHARM_PERSON, {
      name: 'charm person',
      wearOffMessage: 'You feel more self-confident.',
      dispellable: true,
      bitvector: AFF.CHARM,
      join: false,
    });

    this.register(SPELL.CHILL_TOUCH, {
      name: 'chill touch',
      wearOffMessage: 'You feel less cold.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.CURSE, {
      name: 'curse',
      wearOffMessage: 'The curse wears off.',
      dispellable: true,
      bitvector: AFF.CURSE,
      join: false,
    });

    this.register(SPELL.DETECT_EVIL, {
      name: 'detect evil',
      wearOffMessage: 'The red in your vision disappears.',
      dispellable: true,
      bitvector: AFF.DETECT_EVIL,
      join: false,
    });

    this.register(SPELL.DETECT_INVIS, {
      name: 'detect invis',
      wearOffMessage: 'You no longer see invisible objects.',
      dispellable: true,
      bitvector: AFF.DETECT_INVIS,
      join: false,
    });

    this.register(SPELL.DETECT_MAGIC, {
      name: 'detect magic',
      wearOffMessage: 'The detect magic wears off.',
      dispellable: true,
      bitvector: AFF.DETECT_MAGIC,
      join: false,
    });

    this.register(SPELL.DETECT_HIDDEN, {
      name: 'detect hidden',
      wearOffMessage: 'You feel less aware of your surroundings.',
      dispellable: true,
      bitvector: AFF.DETECT_HIDDEN,
      join: false,
    });

    this.register(SPELL.DETECT_POISON, {
      name: 'detect poison',
      wearOffMessage: 'The detect poison wears off.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.FAERIE_FIRE, {
      name: 'faerie fire',
      wearOffMessage: 'The pink aura around you fades.',
      dispellable: true,
      bitvector: AFF.FAERIE_FIRE,
      join: false,
    });

    this.register(SPELL.FLY, {
      name: 'fly',
      wearOffMessage: 'You slowly float to the ground.',
      dispellable: true,
      bitvector: AFF.FLYING,
      join: false,
    });

    this.register(SPELL.GIANT_STRENGTH, {
      name: 'giant strength',
      wearOffMessage: 'You feel weaker.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.INVIS, {
      name: 'invisibility',
      wearOffMessage: 'You are no longer invisible.',
      dispellable: true,
      bitvector: AFF.INVISIBLE,
      join: false,
    });

    this.register(SPELL.PASS_DOOR, {
      name: 'pass door',
      wearOffMessage: 'You feel solid again.',
      dispellable: true,
      bitvector: AFF.PASS_DOOR,
      join: false,
    });

    this.register(SPELL.POISON, {
      name: 'poison',
      wearOffMessage: 'You feel less sick.',
      tickMessage: 'You feel very sick.',
      dispellable: true,
      bitvector: AFF.POISON,
      join: false,
    });

    this.register(SPELL.PROTECT_EVIL, {
      name: 'protection evil',
      wearOffMessage: 'You feel less protected.',
      dispellable: true,
      bitvector: AFF.PROTECT,
      join: false,
    });

    this.register(SPELL.SANCTUARY, {
      name: 'sanctuary',
      wearOffMessage: 'The white aura around your body fades.',
      dispellable: true,
      bitvector: AFF.SANCTUARY,
      join: false,
    });

    this.register(SPELL.SLEEP, {
      name: 'sleep',
      wearOffMessage: 'You feel less tired.',
      dispellable: true,
      bitvector: AFF.SLEEP,
      join: false,
    });

    this.register(SPELL.SNEAK, {
      name: 'sneak',
      wearOffMessage: 'You no longer feel stealthy.',
      dispellable: true,
      bitvector: AFF.SNEAK,
      join: false,
    });

    this.register(SPELL.HIDE, {
      name: 'hide',
      wearOffMessage: 'You are no longer hidden.',
      dispellable: true,
      bitvector: AFF.HIDE,
      join: false,
    });

    this.register(SPELL.HASTE, {
      name: 'haste',
      wearOffMessage: 'You feel yourself slow down.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.SLOW, {
      name: 'slow',
      wearOffMessage: 'You feel yourself speed up.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.INFRARED, {
      name: 'infravision',
      wearOffMessage: 'You no longer see in the dark.',
      dispellable: true,
      bitvector: AFF.INFRARED,
      join: false,
    });

    this.register(SPELL.TRUESIGHT, {
      name: 'truesight',
      wearOffMessage: 'Your vision returns to normal.',
      dispellable: true,
      bitvector: AFF.TRUESIGHT,
      join: false,
    });

    this.register(SPELL.SCRYING, {
      name: 'scrying',
      wearOffMessage: 'Your vision of faraway places fades.',
      dispellable: true,
      bitvector: AFF.SCRYING,
      join: false,
    });

    this.register(SPELL.FIRESHIELD, {
      name: 'fireshield',
      wearOffMessage: 'The fiery shield around you gutters out.',
      dispellable: true,
      bitvector: AFF.FIRESHIELD,
      join: false,
    });

    this.register(SPELL.SHOCKSHIELD, {
      name: 'shockshield',
      wearOffMessage: 'The electricity sparking around you fades.',
      dispellable: true,
      bitvector: AFF.SHOCKSHIELD,
      join: false,
    });

    this.register(SPELL.ICESHIELD, {
      name: 'iceshield',
      wearOffMessage: 'The ice crystals around you melt away.',
      dispellable: true,
      bitvector: AFF.ICESHIELD,
      join: false,
    });

    this.register(SPELL.ACIDMIST, {
      name: 'acidmist',
      wearOffMessage: 'The acid mist around you dissipates.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.VENOMSHIELD, {
      name: 'venomshield',
      wearOffMessage: 'The venomous aura around you fades.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.PARALYSIS, {
      name: 'paralysis',
      wearOffMessage: 'You can move again!',
      dispellable: true,
      bitvector: AFF.PARALYSIS,
      join: false,
    });

    this.register(SPELL.BERSERK, {
      name: 'berserk',
      wearOffMessage: 'Your rage ebbs.',
      dispellable: false,
      bitvector: AFF.BERSERK,
      join: false,
    });

    this.register(SPELL.AQUA_BREATH, {
      name: 'aqua breath',
      wearOffMessage: 'You feel you can no longer breathe underwater.',
      dispellable: true,
      bitvector: AFF.AQUA_BREATH,
      join: false,
    });

    this.register(SPELL.SHIELD, {
      name: 'shield',
      wearOffMessage: 'Your force shield shimmers then fades away.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.STONE_SKIN, {
      name: 'stone skin',
      wearOffMessage: 'Your skin feels soft again.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.WEAKEN, {
      name: 'weaken',
      wearOffMessage: 'You feel stronger.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.ENHANCE_ARMOR, {
      name: 'enhanced armor',
      wearOffMessage: 'You feel less armored.',
      dispellable: true,
      bitvector: 0n,
      join: false,
    });

    this.register(SPELL.PROTECT_GOOD, {
      name: 'protection good',
      wearOffMessage: 'You feel less protected.',
      dispellable: true,
      bitvector: AFF.PROTECT,
      join: false,
    });

    this.register(SPELL.FLOATING, {
      name: 'floating',
      wearOffMessage: 'You slowly float to the ground.',
      dispellable: true,
      bitvector: AFF.FLOATING,
      join: false,
    });

    this.register(SPELL.DETECT_TRAPS, {
      name: 'detect traps',
      wearOffMessage: 'You can no longer sense traps.',
      dispellable: true,
      bitvector: AFF.DETECT_TRAPS,
      join: false,
    });
  }
}

/** Singleton registry instance for convenience. */
export const defaultAffectRegistry = new AffectRegistry();
