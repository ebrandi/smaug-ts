/**
 * Character – Abstract base class for all characters (PCs and NPCs).
 *
 * Holds shared state: stats, affects, position, room, equipment,
 * inventory, and provides common methods like applyAffect(),
 * isAffected(), and stat calculations.
 */

import {
  Sex,
  Position,
  WearLocation,
  AFF,
  type StatBlock,
} from './types.js';
import { Affect } from './Affect.js';

/** Default stat block (all zeros). */
function defaultStatBlock(): StatBlock {
  return { str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0, lck: 0 };
}

/** Partial initializer for Character properties. */
export interface CharacterInit {
  id?: string;
  name?: string;
  shortDescription?: string;
  longDescription?: string;
  description?: string;
  keywords?: string[];
  level?: number;
  sex?: Sex;
  race?: string;
  class_?: string;
  trust?: number;
  hit?: number;
  maxHit?: number;
  mana?: number;
  maxMana?: number;
  move?: number;
  maxMove?: number;
  position?: Position;
  defaultPosition?: Position;
  style?: number;
  permStats?: Partial<StatBlock>;
  modStats?: Partial<StatBlock>;
  hitroll?: number;
  damroll?: number;
  armor?: number;
  numAttacks?: number;
  alignment?: number;
  wimpy?: number;
  actFlags?: bigint;
  affectedBy?: bigint;
  immune?: bigint;
  resistant?: bigint;
  susceptible?: bigint;
  attacks?: bigint;
  defenses?: bigint;
  speaking?: number;
  speaks?: number;
  deaf?: bigint;
  timer?: number;
  wait?: number;
  mentalState?: number;
  emotionalState?: number;
  substate?: number;
  height?: number;
  weight?: number;
  gold?: number;
  silver?: number;
  copper?: number;
  exp?: number;
  savingPoison?: number;
  savingRod?: number;
  savingPara?: number;
  savingBreath?: number;
  savingSpell?: number;
}

export abstract class Character {
  // Identity
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  description: string;
  keywords: string[];

  // Core
  level: number;
  sex: Sex;
  race: string;
  class_: string;
  trust: number;

  // Vitals
  hit: number;
  maxHit: number;
  mana: number;
  maxMana: number;
  move: number;
  maxMove: number;

  // Position
  position: Position;
  defaultPosition: Position;
  style: number;

  // Stats
  permStats: StatBlock;
  modStats: StatBlock;

  // Combat
  hitroll: number;
  damroll: number;
  armor: number;
  numAttacks: number;
  alignment: number;
  wimpy: number;
  fighting: Character | null;

  // Bitvectors
  actFlags: bigint;
  affectedBy: bigint;
  immune: bigint;
  resistant: bigint;
  susceptible: bigint;
  attacks: bigint;
  defenses: bigint;

  // Language
  speaking: number;
  speaks: number;

  // Deaf bitvector (muted channels)
  deaf: bigint;

  // Group/followers
  followers: Character[];

  // Timers
  timer: number;
  wait: number;
  mentalState: number;
  emotionalState: number;
  substate: number;

  // Location
  inRoom: unknown | null;
  wasInRoom: unknown | null;

  // Relations
  master: Character | null;
  leader: Character | null;
  mount: Character | null;
  reply: Character | null;

  // Collections
  affects: Affect[];
  inventory: unknown[];
  equipment: Map<WearLocation, unknown>;

  // Physical
  height: number;
  weight: number;

  // Economy
  gold: number;
  silver: number;
  copper: number;
  exp: number;

  // Saving throws
  savingPoison: number;
  savingRod: number;
  savingPara: number;
  savingBreath: number;
  savingSpell: number;

  // Combat tracking
  numFighting: number;

  constructor(init: CharacterInit = {}) {
    this.id = init.id ?? '';
    this.name = init.name ?? '';
    this.shortDescription = init.shortDescription ?? '';
    this.longDescription = init.longDescription ?? '';
    this.description = init.description ?? '';
    this.keywords = init.keywords ?? [];
    this.level = init.level ?? 1;
    this.sex = init.sex ?? Sex.Neutral;
    this.race = init.race ?? 'human';
    this.class_ = init.class_ ?? 'warrior';
    this.trust = init.trust ?? 0;
    this.hit = init.hit ?? 20;
    this.maxHit = init.maxHit ?? 20;
    this.mana = init.mana ?? 100;
    this.maxMana = init.maxMana ?? 100;
    this.move = init.move ?? 100;
    this.maxMove = init.maxMove ?? 100;
    this.position = init.position ?? Position.Standing;
    this.defaultPosition = init.defaultPosition ?? Position.Standing;
    this.style = init.style ?? 0;
    this.permStats = { ...defaultStatBlock(), ...init.permStats };
    this.modStats = { ...defaultStatBlock(), ...init.modStats };
    this.hitroll = init.hitroll ?? 0;
    this.damroll = init.damroll ?? 0;
    this.armor = init.armor ?? 100;
    this.numAttacks = init.numAttacks ?? 1;
    this.alignment = init.alignment ?? 0;
    this.wimpy = init.wimpy ?? 0;
    this.fighting = null;
    this.actFlags = init.actFlags ?? 0n;
    this.affectedBy = init.affectedBy ?? 0n;
    this.immune = init.immune ?? 0n;
    this.resistant = init.resistant ?? 0n;
    this.susceptible = init.susceptible ?? 0n;
    this.attacks = init.attacks ?? 0n;
    this.defenses = init.defenses ?? 0n;
    this.speaking = init.speaking ?? 0;
    this.speaks = init.speaks ?? 0;
    this.deaf = init.deaf ?? 0n;
    this.followers = [];
    this.timer = init.timer ?? 0;
    this.wait = init.wait ?? 0;
    this.mentalState = init.mentalState ?? 0;
    this.emotionalState = init.emotionalState ?? 0;
    this.substate = init.substate ?? 0;
    this.inRoom = null;
    this.wasInRoom = null;
    this.master = null;
    this.leader = null;
    this.mount = null;
    this.reply = null;
    this.affects = [];
    this.inventory = [];
    this.equipment = new Map();
    this.height = init.height ?? 72;
    this.weight = init.weight ?? 150;
    this.gold = init.gold ?? 0;
    this.silver = init.silver ?? 0;
    this.copper = init.copper ?? 0;
    this.exp = init.exp ?? 0;
    this.savingPoison = init.savingPoison ?? 0;
    this.savingRod = init.savingRod ?? 0;
    this.savingPara = init.savingPara ?? 0;
    this.savingBreath = init.savingBreath ?? 0;
    this.savingSpell = init.savingSpell ?? 0;
    this.numFighting = 0;
  }

  /** Get effective stat value (permanent + modifier). */
  getStat(stat: keyof StatBlock): number {
    return this.permStats[stat] + this.modStats[stat];
  }

  /** Get effective trust level. */
  getTrust(): number {
    return this.trust;
  }

  /** Check if a specific affect bitvector flag is set. */
  isAffected(flag: bigint): boolean {
    return (this.affectedBy & flag) !== 0n;
  }

  /** Check if character's position is at least the given minimum. */
  isPositionAtLeast(pos: Position): boolean {
    return this.position >= pos;
  }

  /** Whether this character is currently fighting. */
  get isFighting(): boolean {
    return this.fighting !== null;
  }

  /** Whether this character is an immortal (trust >= 51). */
  get isImmortal(): boolean {
    return this.getTrust() >= 51;
  }

  /** Apply an affect to this character. */
  applyAffect(affect: Affect): void {
    this.affects.push(affect);
    affect.applyTo(this);
  }

  /** Remove a specific affect from this character. */
  removeAffect(affect: Affect): void {
    const idx = this.affects.indexOf(affect);
    if (idx !== -1) {
      affect.removeFrom(this);
      this.affects.splice(idx, 1);
    }
  }

  /** Remove all affects of the given spell/skill type. */
  stripAffect(type: number): void {
    for (let i = this.affects.length - 1; i >= 0; i--) {
      const aff = this.affects[i];
      if (aff && aff.type === type) {
        aff.removeFrom(this);
        this.affects.splice(i, 1);
      }
    }
  }

  /** Get total wealth in copper equivalent. */
  getTotalWealth(): number {
    return this.gold * 10000 + this.silver * 100 + this.copper;
  }

  // =========================================================================
  // Stat Accessors (for regen calculations)
  // =========================================================================

  /** Get effective intelligence (perm + mod). */
  getModifiedInt(): number {
    return this.permStats.int + this.modStats.int;
  }

  /** Get effective dexterity (perm + mod). */
  getModifiedDex(): number {
    return this.permStats.dex + this.modStats.dex;
  }

  /** Get effective constitution (perm + mod). */
  getModifiedCon(): number {
    return this.permStats.con + this.modStats.con;
  }

  // =========================================================================
  // Regeneration
  // =========================================================================

  /**
   * HP regeneration per tick.
   * Base: level * 1.5 + 5
   * Position modifiers: sleeping ×1.5, resting ×1.25
   * Poison: ÷4, Sanctuary: ×1.1
   * Warrior class bonus: ×1.2
   */
  hitGain(): number {
    let gain = Math.floor(this.level * 1.5) + 5;

    switch (this.position) {
      case Position.Sleeping: gain = Math.floor(gain * 1.5); break;
      case Position.Resting:  gain = Math.floor(gain * 1.25); break;
    }

    if (this.isAffected(AFF.POISON)) gain = Math.floor(gain / 4);
    if (this.isAffected(AFF.SANCTUARY)) gain = Math.floor(gain * 1.1);

    // Class bonus (warriors)
    if (this.class_.toLowerCase() === 'warrior') gain = Math.floor(gain * 1.2);

    return Math.min(gain, this.maxHit - this.hit);
  }

  /**
   * Mana regeneration per tick.
   * Base: level * 1.5 + 5
   * Position modifiers: sleeping ×1.5, resting ×1.25
   * Intelligence bonus: int - 10
   * Mage/Cleric class bonus: ×1.3
   */
  manaGain(): number {
    let gain = Math.floor(this.level * 1.5) + 5;

    switch (this.position) {
      case Position.Sleeping: gain = Math.floor(gain * 1.5); break;
      case Position.Resting:  gain = Math.floor(gain * 1.25); break;
    }

    // Int bonus
    gain += this.getModifiedInt() - 10;

    // Class bonus (mages, clerics)
    const cls = this.class_.toLowerCase();
    if (cls === 'mage' || cls === 'cleric') {
      gain = Math.floor(gain * 1.3);
    }

    return Math.min(gain, this.maxMana - this.mana);
  }

  /**
   * Move regeneration per tick.
   * Base: level + 10
   * Position modifiers: sleeping ×2, resting ×1.5
   * Dexterity bonus: dex - 10
   */
  moveGain(): number {
    let gain = this.level + 10;

    switch (this.position) {
      case Position.Sleeping: gain = Math.floor(gain * 2); break;
      case Position.Resting:  gain = Math.floor(gain * 1.5); break;
    }

    // Dex bonus
    gain += this.getModifiedDex() - 10;

    return Math.min(gain, this.maxMove - this.move);
  }

  /**
   * Set position based on current HP thresholds.
   * Called after taking damage or during recovery.
   */
  updatePosition(): void {
    if (this.hit > 0) {
      if (this.position <= Position.Stunned) {
        this.position = Position.Standing;
      }
      return;
    }

    if (this.hit <= -10) {
      this.position = Position.Dead;
    } else if (this.hit <= -6) {
      this.position = Position.Mortal;
    } else if (this.hit <= -3) {
      this.position = Position.Incap;
    } else {
      this.position = Position.Stunned;
    }
  }

  /**
   * Called every PULSE_TICK (70 seconds).
   * Applies regeneration, decrements affect durations, and handles
   * poison damage and hunger/thirst for players.
   */
  charUpdate(): void {
    // Apply regeneration
    if (this.position >= Position.Stunned) {
      this.hit  += this.hitGain();
      this.mana += this.manaGain();
      this.move += this.moveGain();

      // Clamp to max
      this.hit  = Math.min(this.hit, this.maxHit);
      this.mana = Math.min(this.mana, this.maxMana);
      this.move = Math.min(this.move, this.maxMove);
    }

    // Decrement affect durations
    for (let i = this.affects.length - 1; i >= 0; i--) {
      const affect = this.affects[i]!;
      if (affect.duration > 0) {
        affect.duration--;
        if (affect.duration === 0) {
          this.removeAffect(affect);
        }
      }
    }

    // Check for poison damage
    if (this.isAffected(AFF.POISON) && this.position >= Position.Stunned) {
      const damage = Math.floor(this.level / 10) + 1;
      this.hit -= damage;
      this.sendToChar("You feel very sick.\r\n");
      this.updatePosition();
    }

    // Timer decrement
    if (this.timer > 0) {
      this.timer--;
    }
  }

  /** Whether this character is an NPC. */
  abstract get isNpc(): boolean;

  /** Send text to this character (for output). */
  abstract sendToChar(text: string): void;
}
