/**
 * Entity classes barrel export.
 */

export { Affect } from './Affect.js';
export { Character, type CharacterInit } from './Character.js';
export { Player, type PlayerData } from './Player.js';
export { Mobile } from './Mobile.js';
export { Room } from './Room.js';
export { Area, type VnumRange, type ResetData, type AreaWeather } from './Area.js';
export { GameObject } from './GameObject.js';

// Re-export all types
export {
  Sex,
  Position,
  Direction,
  SectorType,
  WearLocation,
  ItemType,
  ApplyType,
  SaveType,
  DamageType,
  CharClass,
  Race,
  Size,
  Attribute,
  AFF,
  ACT,
  ROOM_FLAGS,
  type StatBlock,
  type Currency,
  type ExtraDescription,
  type Exit,
  type ShopData,
  type RepairShopData,
  type MobilePrototype,
  type ObjectPrototype,
} from './types.js';

// Tables
export {
  raceTable, classTable,
  getRace, getClass,
  raceByName, classByName,
  type RaceData, type ClassData,
} from './tables.js';
