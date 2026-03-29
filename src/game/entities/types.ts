/**
 * types.ts – Entity type definitions for SMAUG 2.0
 *
 * Contains all game-engine enums, bitvector flag constants, and prototype
 * interfaces that mirror the legacy C structures. These are runtime values
 * (not Prisma enums) used throughout the in-memory game world.
 */

// =============================================================================
// Enums
// =============================================================================

/** Biological sex. */
export enum Sex {
  Neutral = 0,
  Male    = 1,
  Female  = 2,
}

/** Character position / stance in the world. */
export enum Position {
  Dead       = 0,
  Mortal     = 1,
  Incap      = 2,
  Stunned    = 3,
  Sleeping   = 4,
  Resting    = 5,
  Sitting    = 6,
  Fighting   = 7,
  Defensive  = 8,
  Aggressive = 9,
  Evasive    = 10,
  Standing   = 11,
  Mounted    = 12,
  Shove      = 13,
  Drag       = 14,
  Berserk    = 15,
}

/** Cardinal (and special) movement directions. */
export enum Direction {
  North     = 0,
  East      = 1,
  South     = 2,
  West      = 3,
  Up        = 4,
  Down      = 5,
  NorthEast = 6,
  NorthWest = 7,
  SouthEast = 8,
  SouthWest = 9,
  Somewhere = 10,
}

/** Terrain / sector types for rooms. */
export enum SectorType {
  Inside      = 0,
  City        = 1,
  Field       = 2,
  Forest      = 3,
  Hills       = 4,
  Mountain    = 5,
  WaterSwim   = 6,
  WaterNoSwim = 7,
  Underwater  = 8,
  Air         = 9,
  Desert      = 10,
  Dunno       = 11,
  OceanFloor  = 12,
  Underground = 13,
  Lava        = 14,
  Swamp       = 15,
}

/** Wear / equipment slot locations. */
export enum WearLocation {
  None     = -1,
  Light    = 0,
  FingerL  = 1,
  FingerR  = 2,
  Neck1    = 3,
  Neck2    = 4,
  Body     = 5,
  Head     = 6,
  Legs     = 7,
  Feet     = 8,
  Hands    = 9,
  Arms     = 10,
  Shield   = 11,
  About    = 12,
  Waist    = 13,
  WristL   = 14,
  WristR   = 15,
  Wield    = 16,
  Hold     = 17,
  DualWield = 18,
  Ears     = 19,
  Eyes     = 20,
  MissileWield = 21,
  Back     = 22,
  Face     = 23,
  AnkleL   = 24,
  AnkleR   = 25,
}

/** Object / item type identifiers. */
export enum ItemType {
  None          = 0,
  Light         = 1,
  Scroll        = 2,
  Wand          = 3,
  Staff         = 4,
  Weapon        = 5,
  Fireweapon    = 6,
  Missile       = 7,
  Treasure      = 8,
  Armor         = 9,
  Potion        = 10,
  Worn          = 11,
  Furniture     = 12,
  Trash         = 13,
  OldTrap       = 14,
  Container     = 15,
  NoteDep       = 16,
  DrinkCon      = 17,
  Key           = 18,
  Food          = 19,
  Money         = 20,
  Pen           = 21,
  Boat          = 22,
  Corpse_NPC    = 23,
  Corpse_PC     = 24,
  Fountain      = 25,
  Pill          = 26,
  Blood         = 27,
  Bloodstain    = 28,
  Scraps        = 29,
  Pipe          = 30,
  HerbCon       = 31,
  Herb          = 32,
  Incense       = 33,
  Fire          = 34,
  Book          = 35,
  Switch        = 36,
  Lever         = 37,
  PullChain     = 38,
  Button        = 39,
  Dial          = 40,
  Rune          = 41,
  RunePouch     = 42,
  Match         = 43,
  Trap          = 44,
  Map           = 45,
  Portal        = 46,
  Paper         = 47,
  Tinder        = 48,
  Lockpick      = 49,
  Spike         = 50,
  Disease       = 51,
  Oil           = 52,
  Fuel          = 53,
  ShortBow      = 54,
  LongBow       = 55,
  Crossbow      = 56,
  Ammo          = 57,
  Quiver        = 58,
  Shovel        = 59,
  Salve         = 60,
  Cook          = 61,
  Keyring       = 62,
  Odor          = 63,
  Chance        = 64,
  MixedHerb     = 65,
  Craft         = 66,
  Drink         = 67,
  DualDisc      = 68,
  Piece         = 69,
}

/** Apply (modifier) types for affects and equipment. */
export enum ApplyType {
  None          = 0,
  Str           = 1,
  Dex           = 2,
  Int           = 3,
  Wis           = 4,
  Con           = 5,
  Sex           = 6,
  Class         = 7,
  Level         = 8,
  Age           = 9,
  Height        = 10,
  Weight        = 11,
  Mana          = 12,
  Hit           = 13,
  Move          = 14,
  Gold          = 15,
  Exp           = 16,
  AC            = 17,
  Hitroll       = 18,
  Damroll       = 19,
  SavingPoison  = 20,
  SavingRod     = 21,
  SavingPara    = 22,
  SavingBreath  = 23,
  SavingSpell   = 24,
  Cha           = 25,
  Affect        = 26,
  Resistant     = 27,
  Immune        = 28,
  Susceptible   = 29,
  WeaponSpell   = 30,
  Lck           = 31,
  Backstab      = 32,
  Pick          = 33,
  Track         = 34,
  Steal         = 35,
  Sneak         = 36,
  Hide          = 37,
  Palm          = 38,
  Detrap        = 39,
  Dodge         = 40,
  Peek          = 41,
  Scan          = 42,
  Gouge         = 43,
  Search        = 44,
  Mount         = 45,
  Disarm        = 46,
  Kick          = 47,
  Parry         = 48,
  Bash          = 49,
  Stun          = 50,
  Punch         = 51,
  Climb         = 52,
  Grip          = 53,
  ScribeLearn   = 54,
  BrewLearn     = 55,
  WearSpell     = 56,
  RemoveSpell   = 57,
  Emotion       = 58,
  MentalState   = 59,
  StripSN       = 60,
  Remove        = 61,
  Dig           = 62,
  Full          = 63,
  Thirst        = 64,
  Drunk         = 65,
  Blood         = 66,
}

/** Saving throw categories. */
export enum SaveType {
  None        = 0,
  PoisonDeath = 1,
  Wands       = 2,
  ParaPetri   = 3,
  Breath      = 4,
  SpellStaff  = 5,
}

/** Damage / attack types. */
export enum DamageType {
  Hit     = 0,
  Slice   = 1,
  Stab    = 2,
  Slash   = 3,
  Whip    = 4,
  Claw    = 5,
  Blast   = 6,
  Pound   = 7,
  Crush   = 8,
  Grep    = 9,
  Bite    = 10,
  Pierce  = 11,
  Suction = 12,
  Bolt    = 13,
  Arrow   = 14,
  Dart    = 15,
  Stone   = 16,
  Thrust  = 17,
}

// =============================================================================
// Bitvector Constants (bigint for >32-bit flags)
// =============================================================================

/** Item extra flags bitvector (extraFlags on objects). */
export const ITEM_EXTRA_FLAGS = {
  GLOW:           1n << 0n,
  HUM:            1n << 1n,
  DARK:           1n << 2n,
  LOYAL:          1n << 3n,
  EVIL:           1n << 4n,
  INVIS:          1n << 5n,
  MAGIC:          1n << 6n,
  NODROP:         1n << 7n,
  BLESS:          1n << 8n,
  ANTI_GOOD:      1n << 9n,
  ANTI_EVIL:      1n << 10n,
  ANTI_NEUTRAL:   1n << 11n,
  NOREMOVE:       1n << 12n,
  INVENTORY:      1n << 13n,
  ANTI_MAGE:      1n << 14n,
  ANTI_THIEF:     1n << 15n,
  ANTI_WARRIOR:   1n << 16n,
  ANTI_CLERIC:    1n << 17n,
  ORGANIC:        1n << 18n,
  METAL:          1n << 19n,
  DONATION:       1n << 20n,
  CLANOBJECT:     1n << 21n,
  CLANCORPSE:     1n << 22n,
  ANTI_VAMPIRE:   1n << 23n,
  ANTI_DRUID:     1n << 24n,
  ANTI_RANGER:    1n << 25n,
  ANTI_AUGURER:   1n << 26n,
  NO_TAKE:        1n << 27n,
  DEATHROT:       1n << 28n,
  BURIED:         1n << 29n,
  PROTOTYPE:      1n << 30n,
  NOLOCATE:       1n << 31n,
} as const;

/** Item wear flags bitvector (wearFlags on objects). */
export const WEAR_FLAGS = {
  TAKE:       1n << 0n,
  FINGER:     1n << 1n,
  NECK:       1n << 2n,
  BODY:       1n << 3n,
  HEAD:       1n << 4n,
  LEGS:       1n << 5n,
  FEET:       1n << 6n,
  HANDS:      1n << 7n,
  ARMS:       1n << 8n,
  SHIELD:     1n << 9n,
  ABOUT:      1n << 10n,
  WAIST:      1n << 11n,
  WRIST:      1n << 12n,
  WIELD:      1n << 13n,
  HOLD:       1n << 14n,
  DUAL_WIELD: 1n << 15n,
  EARS:       1n << 16n,
  EYES:       1n << 17n,
  MISSILE:    1n << 18n,
  BACK:       1n << 19n,
  FACE:       1n << 20n,
  ANKLE:      1n << 21n,
} as const;

/** Affected-by bitvector flags. */
export const AFF = {
  BLIND:            1n << 0n,
  INVISIBLE:        1n << 1n,
  DETECT_EVIL:      1n << 2n,
  DETECT_INVIS:     1n << 3n,
  DETECT_MAGIC:     1n << 4n,
  DETECT_HIDDEN:    1n << 5n,
  HOLD:             1n << 6n,
  SANCTUARY:        1n << 7n,
  FAERIE_FIRE:      1n << 8n,
  INFRARED:         1n << 9n,
  CURSE:            1n << 10n,
  FLAMING:          1n << 11n,
  POISON:           1n << 12n,
  PROTECT:          1n << 13n,
  PARALYSIS:        1n << 14n,
  SNEAK:            1n << 15n,
  HIDE:             1n << 16n,
  SLEEP:            1n << 17n,
  CHARM:            1n << 18n,
  FLYING:           1n << 19n,
  PASS_DOOR:        1n << 20n,
  FLOATING:         1n << 21n,
  TRUESIGHT:        1n << 22n,
  DETECT_TRAPS:     1n << 23n,
  SCRYING:          1n << 24n,
  FIRESHIELD:       1n << 25n,
  SHOCKSHIELD:      1n << 26n,
  HAUS1:            1n << 27n,
  ICESHIELD:        1n << 28n,
  POSSESS:          1n << 29n,
  BERSERK:          1n << 30n,
  AQUA_BREATH:      1n << 31n,
} as const;

/** Exit flags bitvector. */
export const EX_FLAGS = {
  ISDOOR:       1n << 0n,
  CLOSED:       1n << 1n,
  LOCKED:       1n << 2n,
  SECRET:       1n << 3n,
  SWIM:         1n << 4n,
  PICKPROOF:    1n << 5n,
  FLY:          1n << 6n,
  CLIMB:        1n << 7n,
  DIG:          1n << 8n,
  EATKEY:       1n << 9n,
  NOPASSDOOR:   1n << 10n,
  HIDDEN:       1n << 11n,
  PASSAGE:      1n << 12n,
  PORTAL:       1n << 13n,
  OVERLAND:     1n << 14n,
  AUTO:         1n << 15n,
  NKEY:         1n << 16n,
  SEARCHABLE:   1n << 17n,
  BASHED:       1n << 18n,
  BASHPROOF:    1n << 19n,
  NOMOB:        1n << 20n,
  WINDOW:       1n << 21n,
  XLOCKED:      1n << 22n,
} as const;

/** Container flags. */
export const CONT_FLAGS = {
  CLOSEABLE:  1n << 0n,
  PICKPROOF:  1n << 1n,
  CLOSED:     1n << 2n,
  LOCKED:     1n << 3n,
  EATKEY:     1n << 4n,
} as const;

/** Room flags bitvector. */
export const ROOM_FLAGS = {
  DARK:           1n << 0n,
  DEATH:          1n << 1n,
  NO_MOB:         1n << 2n,
  INDOORS:        1n << 3n,
  LAWFUL:         1n << 4n,
  NEUTRAL:        1n << 5n,
  CHAOTIC:        1n << 6n,
  NO_MAGIC:       1n << 7n,
  TUNNEL:         1n << 8n,
  PRIVATE:        1n << 9n,
  SAFE:           1n << 10n,
  SOLITARY:       1n << 11n,
  PET_SHOP:       1n << 12n,
  NO_RECALL:      1n << 13n,
  DONATION:       1n << 14n,
  NO_DROP:        1n << 15n,
  CLANSTOREROOM:  1n << 16n,
  TELEPORT:       1n << 17n,
  TELESHOWDESC:   1n << 18n,
  NO_FLOOR:       1n << 19n,
  SOLITARY2:      1n << 20n,
  LOGGING:        1n << 21n,
  STORMY:         1n << 22n,
  NO_ASTRAL:      1n << 23n,
  SILENCE:        1n << 24n,
} as const;

// =============================================================================
// Interfaces
// =============================================================================

/** Core stat block shared by characters and prototypes. */
export interface StatBlock {
  str: number;
  int: number;
  wis: number;
  dex: number;
  con: number;
  cha: number;
  lck: number;
}

/** Multi-denomination currency. */
export interface Currency {
  gold: number;
  silver: number;
  copper: number;
}

/** Extra description attached to rooms or objects. */
export interface ExtraDescription {
  keywords: string;
  description: string;
}

/** A single exit from a room. */
export interface Exit {
  direction: Direction;
  description: string;
  keyword: string;
  flags: bigint;
  key: number;
  toRoom: number; // destination vnum
}

/** Shop data attached to a mobile prototype. */
export interface ShopData {
  keeper: number;       // mobile vnum
  buyType: number[];    // item types bought
  profitBuy: number;    // markup percentage
  profitSell: number;   // markdown percentage
  openHour: number;
  closeHour: number;
}

/** Repair-shop data attached to a mobile prototype. */
export interface RepairShopData {
  keeper: number;
  fixType: number[];
  profitFix: number;
  shopType: number;
  openHour: number;
  closeHour: number;
}

/** In-memory mobile (NPC) prototype loaded from area files. */
export interface MobilePrototype {
  vnum: number;
  name: string;
  shortDesc: string;
  longDesc: string;
  description: string;
  actFlags: bigint;
  affectedBy: bigint;
  alignment: number;
  level: number;
  hitroll: number;
  damroll: number;
  hitDice: { num: number; size: number; bonus: number };
  damageDice: { num: number; size: number; bonus: number };
  gold: number;
  exp: number;
  sex: Sex;
  position: Position;
  defaultPosition: Position;
  race: string;
  class: string;
  savingThrows: number[];
  resistant: bigint;
  immune: bigint;
  susceptible: bigint;
  speaks: number;
  speaking: number;
  numAttacks: number;
  extraDescriptions: ExtraDescription[];
  shop: ShopData | null;
  repairShop: RepairShopData | null;
}

/** In-memory object prototype loaded from area files. */
export interface ObjectPrototype {
  vnum: number;
  name: string;
  shortDesc: string;
  longDesc: string;
  description: string;
  itemType: ItemType;
  extraFlags: bigint;
  wearFlags: bigint;
  values: number[];
  weight: number;
  cost: number;
  rent: number;
  level: number;
  layers: number;
  extraDescriptions: ExtraDescription[];
  affects: Array<{ location: ApplyType; modifier: number }>;
}



// =============================================================================
// Target Types (for spell targeting)
// =============================================================================

/** Spell target types – mirrors legacy TAR_* constants. */
export enum TargetType {
  TAR_IGNORE          = 0,
  TAR_CHAR_OFFENSIVE  = 1,
  TAR_CHAR_DEFENSIVE  = 2,
  TAR_CHAR_SELF       = 3,
  TAR_OBJ_INV         = 4,
  TAR_OBJ_ROOM        = 5,
}

// =============================================================================
// Character Classes
// =============================================================================

/** Character class identifiers. */
export enum CharClass {
  Mage     = 0,
  Cleric   = 1,
  Thief    = 2,
  Warrior  = 3,
  Vampire  = 4,
  Druid    = 5,
  Ranger   = 6,
  Augurer  = 7,
  Paladin  = 8,
  Nephandi = 9,
  Savage   = 10,
  Pirate   = 11,
}

/** Character race identifiers. */
export enum Race {
  Human    = 0,
  Elf      = 1,
  Dwarf    = 2,
  Halfling = 3,
  Pixie    = 4,
  HalfElf  = 5,
  HalfOrc  = 6,
  HalfTroll = 7,
  HalfOgre = 8,
  Gith     = 9,
  Drow     = 10,
  SeaElf   = 11,
  Lizardman = 12,
  Gnome    = 13,
}

/** Character size categories. */
export enum Size {
  Tiny   = 0,
  Small  = 1,
  Medium = 2,
  Large  = 3,
  Huge   = 4,
}

/** Primary attribute identifiers. */
export enum Attribute {
  Str = 0,
  Int = 1,
  Wis = 2,
  Dex = 3,
  Con = 4,
  Cha = 5,
  Lck = 6,
}

/** NPC act flags bitvector (actFlags on mobiles). */
export const ACT = {
  IS_NPC:       1n << 0n,
  SENTINEL:     1n << 1n,
  SCAVENGER:    1n << 2n,
  AGGRESSIVE:   1n << 5n,
  STAY_AREA:    1n << 6n,
  WIMPY:        1n << 7n,
  PET:          1n << 8n,
  TRAIN:        1n << 9n,
  PRACTICE:     1n << 10n,
  IMMORTAL:     1n << 11n,
  DEADLY:       1n << 12n,
  POLYSELF:     1n << 13n,
  META_AGGR:    1n << 14n,
  GUARDIAN:     1n << 15n,
  RUNNING:      1n << 16n,
  NOWANDER:     1n << 17n,
  MOUNTABLE:    1n << 18n,
  MOUNTED:      1n << 19n,
  SCHOLAR:      1n << 20n,
  SECRETIVE:    1n << 21n,
  HARDHAT:      1n << 22n,
  MOBINVIS:     1n << 23n,
  NOASSIST:     1n << 24n,
  AUTONOMOUS:   1n << 25n,
  PACIFIST:     1n << 26n,
  NOATTACK:     1n << 27n,
  ANNOYING:     1n << 28n,
  BANKER:       1n << 29n,
  SHOPKEEPER:   1n << 30n,
} as const;
