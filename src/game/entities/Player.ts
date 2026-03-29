/**
 * Player – Player character entity, extends Character.
 *
 * Adds PC-specific state: descriptor link, quest tracking,
 * PK stats, learned skills, and persistence hooks.
 */

import { Character, type CharacterInit } from './Character.js';
import type { Descriptor } from '../../network/ConnectionManager.js';
import { CharClass } from './types.js';
import { classTable, type ClassData } from './tables.js';
import { rollDice } from '../../utils/Dice.js';
import { getConModifier, getWisModifier, getDexModifier, getIntModifier } from '../affects/StatModifier.js';
import { type EventBus, GameEvent } from '../../core/EventBus.js';

/** PC-specific persistent data. */
export interface PlayerData {
  passwordHash: string;
  email: string | null;
  title: string;
  rank: string;
  bio: string;
  prompt: string;
  fightPrompt: string;
  bamfIn: string;
  bamfOut: string;
  homepage: string;
  clanName: string | null;
  councilName: string | null;
  orderName: string | null;
  deityName: string | null;
  favour: number;
  noteInProgress: { subject: string; toList: string; text: string } | null;
  learned: Map<number, number>;  // skillNumber → proficiency 0-100
  conditions: [number, number, number, number];  // hunger, thirst, blood, bleed
  pkills: number;
  pdeaths: number;
  mkills: number;
  mdeaths: number;
  illegalPk: number;
  authState: number;
  wizInvis: number;
  minSnoop: number;
  bestowments: string;
  flags: bigint;
  rRangeLo: number;
  rRangeHi: number;
  mRangeLo: number;
  mRangeHi: number;
  oRangeLo: number;
  oRangeHi: number;
  questNumber: number;
  questCurrent: number;
  questAccum: number;
  goldBalance: number;
  silverBalance: number;
  copperBalance: number;
  ignored: Set<string>;
  tellHistory: Map<string, string>;
  stances: Record<string, number>;
  pagerLen: number;
  pagerOn: boolean;
  colors: Map<string, string>;
  spouse: string | null;
  played: number;
  lastLogin: Date | null;
  releaseDate: Date | null;
  helledBy: string | null;

  // OLC editor state
  editingMob: unknown | null;
  editingObj: unknown | null;
  editingProg: unknown | null;
  editMode: string | null;
  editBuffer: string[];
  editKeyword: string;

  // Snoop chain
  snooping: Player | null;
  snoopedBy: Player | null;

  // Switch state
  switched: unknown | null;
}

/** Create default PlayerData. */
function defaultPlayerData(): PlayerData {
  return {
    passwordHash: '',
    email: null,
    title: '',
    rank: '',
    bio: '',
    prompt: '<%hhp %mm %vmv> ',
    fightPrompt: '<%hhp %mm %vmv> [%e] ',
    bamfIn: '$n appears in a swirling mist.',
    bamfOut: '$n leaves in a swirling mist.',
    homepage: '',
    clanName: null,
    councilName: null,
    orderName: null,
    deityName: null,
    favour: 0,
    noteInProgress: null,
    learned: new Map(),
    conditions: [48, 48, 48, 0],
    pkills: 0,
    pdeaths: 0,
    mkills: 0,
    mdeaths: 0,
    illegalPk: 0,
    authState: 0,
    wizInvis: 0,
    minSnoop: 0,
    bestowments: '',
    flags: 0n,
    rRangeLo: 0,
    rRangeHi: 0,
    mRangeLo: 0,
    mRangeHi: 0,
    oRangeLo: 0,
    oRangeHi: 0,
    questNumber: 0,
    questCurrent: 0,
    questAccum: 0,
    goldBalance: 0,
    silverBalance: 0,
    copperBalance: 0,
    ignored: new Set(),
    tellHistory: new Map(),
    stances: {},
    pagerLen: 24,
    pagerOn: true,
    colors: new Map(),
    spouse: null,
    played: 0,
    lastLogin: null,
    releaseDate: null,
    helledBy: null,

    // OLC editor state
    editingMob: null,
    editingObj: null,
    editingProg: null,
    editMode: null,
    editBuffer: [],
    editKeyword: '',

    // Snoop chain
    snooping: null,
    snoopedBy: null,

    // Switch state
    switched: null,
  };
}

export class Player extends Character {
  descriptor: Descriptor | null;
  pcData: PlayerData;

  /** Optional EventBus for emitting game events (set at startup). */
  private static _eventBus: EventBus | null = null;

  /** Set the shared EventBus instance for all Player event emissions. */
  static setEventBus(bus: EventBus | null): void {
    Player._eventBus = bus;
  }

  constructor(init: CharacterInit = {}, pcData?: Partial<PlayerData>) {
    super(init);
    this.descriptor = null;
    this.pcData = { ...defaultPlayerData(), ...pcData };
  }

  get isNpc(): false {
    return false;
  }

  /** Send text to the player's descriptor if connected. */
  sendToChar(text: string): void {
    if (this.descriptor) {
      this.descriptor.write(text);
    }
  }

  /**
   * Get effective trust level.
   * If switched, use original's trust. Otherwise max(trust, level).
   */
  getTrust(): number {
    if (this.descriptor?.original) {
      // switched – use original character's trust
      const orig = this.descriptor.original as Player;
      return orig.getTrust();
    }
    return Math.max(this.trust, this.level);
  }

  /** Whether the player has learned the given skill. */
  hasLearned(skillNumber: number): boolean {
    return this.pcData.learned.has(skillNumber);
  }

  /** Get learned proficiency for a skill (0 if not learned). */
  getLearnedPercent(skillNumber: number): number {
    return this.pcData.learned.get(skillNumber) ?? 0;
  }

  /** Interpret a command line (stub). */
  interpretCommand(_input: string): void {
    // TODO: Phase 3 – delegate to CommandRegistry
  }

  /** Save player data to persistence (stub). */
  async save(): Promise<void> {
    // TODO: Phase 3 – delegate to PlayerRepository
  }

  // =========================================================================
  // Progression
  // =========================================================================

  /**
   * Number of practice sessions available.
   * Stored directly on the player (not in pcData for legacy compat).
   */
  practice: number = 0;

  /**
   * Calculate XP required to reach the next level.
   * Formula: level * level * 500
   * With optional class-specific expBase modifier.
   */
  static xpToNextLevel(level: number, classData?: ClassData): number {
    const base = level * level * 500;
    if (classData && classData.expBase !== 1000) {
      return Math.floor(base * classData.expBase / 1000);
    }
    return base;
  }

  /**
   * Add experience points.
   * XP cannot go below 0.
   * Checks for level advancement after adding.
   */
  gainXp(amount: number): void {
    this.exp += amount;
    if (this.exp < 0) this.exp = 0;

    // Resolve the class data
    const classData = this.getClassData();

    // Check for level-up (loop for multi-level gains)
    while (this.exp >= Player.xpToNextLevel(this.level, classData)) {
      this.advanceLevel();
    }
  }

  /**
   * Advance one level.
   * Increases HP, mana, move, practice sessions based on class and stats.
   * Emits CharacterLevelUp event.
   */
  advanceLevel(): void {
    this.level++;
    const classData = this.getClassData();

    // HP gain: rollDice(class.hpDice, class.hpSides) + con_app[CON].hitp, min 1
    const conMod = getConModifier(this.getStat('con'));
    let hpGain = rollDice(classData.hpDice, classData.hpSides) + conMod.hitp;
    if (hpGain < 1) hpGain = 1;
    this.maxHit += hpGain;
    this.hit += hpGain;

    // Mana gain: rollDice(class.manaDice, class.manaSides) + int_app[INT].learn/4, min 1
    // Warriors and similar classes with 0d0 mana get 0
    let manaGain = 0;
    if (classData.manaDice > 0 && classData.manaSides > 0) {
      const intMod = getIntModifier(this.getStat('int'));
      manaGain = rollDice(classData.manaDice, classData.manaSides) + Math.floor(intMod.learn / 4);
      if (manaGain < 1) manaGain = 1;
    }
    this.maxMana += manaGain;
    this.mana += manaGain;

    // Move gain: rollDice(1, 6) + dex_app[DEX].defensive (use absolute value; legacy uses a formula)
    const dexMod = getDexModifier(this.getStat('dex'));
    let moveGain = rollDice(1, 6) + Math.floor(Math.abs(dexMod.defensive) / 10);
    if (moveGain < 1) moveGain = 1;
    this.maxMove += moveGain;
    this.move += moveGain;

    // Practice sessions: wis_app[WIS].practice (1-7)
    const wisMod = getWisModifier(this.getStat('wis'));
    this.practice += wisMod.practice;

    // Announce
    this.sendToChar(`You have advanced to level ${this.level}!\r\n`);
    this.sendToChar(`HP: +${hpGain}  Mana: +${manaGain}  Move: +${moveGain}  Practice: +${wisMod.practice}\r\n`);

    // Emit level-up event
    if (Player._eventBus) {
      Player._eventBus.emitEvent(GameEvent.CharacterLevelUp, {
        character: this.name,
        level: this.level,
      });
    }
  }

  /** Resolve the player's class data from the class table. */
  private getClassData(): ClassData {
    // Try to match class_ string to CharClass enum
    const classLower = this.class_.toLowerCase();
    for (const key of Object.keys(classTable)) {
      const cc = Number(key) as CharClass;
      if (classTable[cc]!.name.toLowerCase() === classLower) {
        return classTable[cc]!;
      }
    }
    // Default to warrior
    return classTable[CharClass.Warrior]!;
  }
}
