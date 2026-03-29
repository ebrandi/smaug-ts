/**
 * Area – Represents a loaded game area.
 *
 * Contains area metadata, vnum ranges, resets, weather,
 * and collections of rooms/mobile/object prototypes.
 */

import type { MobilePrototype, ObjectPrototype } from './types.js';
import type { Room } from './Room.js';

/** Vnum range (inclusive). */
export interface VnumRange {
  low: number;
  high: number;
}

/** Reset command data. */
export interface ResetData {
  command: 'M' | 'O' | 'P' | 'G' | 'E' | 'D' | 'R';
  extra: number;
  arg1: number;
  arg2: number;
  arg3: number;
  arg4: number;
  arg5: number;
  arg6: number;
  arg7: number;
}

/** Area weather state. */
export interface AreaWeather {
  cloudCover: number;
  temperature: number;
  windSpeed: number;
  precipitation: number;
}

export class Area {
  filename: string;
  name: string;
  author: string;
  vnumRanges: {
    rooms: VnumRange;
    mobiles: VnumRange;
    objects: VnumRange;
  };
  resets: ResetData[];
  age: number;
  resetFrequency: number;
  flags: bigint;
  weather: AreaWeather;
  rooms: Map<number, Room>;
  mobilePrototypes: Map<number, MobilePrototype>;
  objectPrototypes: Map<number, ObjectPrototype>;

  constructor(filename: string, name: string, author: string = 'Unknown') {
    this.filename = filename;
    this.name = name;
    this.author = author;
    this.vnumRanges = {
      rooms: { low: 0, high: 0 },
      mobiles: { low: 0, high: 0 },
      objects: { low: 0, high: 0 },
    };
    this.resets = [];
    this.age = 0;
    this.resetFrequency = 15;
    this.flags = 0n;
    this.weather = { cloudCover: 0, temperature: 50, windSpeed: 0, precipitation: 0 };
    this.rooms = new Map();
    this.mobilePrototypes = new Map();
    this.objectPrototypes = new Map();
  }

  /** Check if a room vnum falls within this area's room range. */
  containsRoomVnum(vnum: number): boolean {
    return vnum >= this.vnumRanges.rooms.low && vnum <= this.vnumRanges.rooms.high;
  }

  /**
   * Tick the area age. Returns true if the area should be reset.
   */
  tick(): boolean {
    this.age++;
    return this.age >= this.resetFrequency;
  }

  /** Reset the area age counter. */
  resetAge(): void {
    this.age = 0;
  }
}
