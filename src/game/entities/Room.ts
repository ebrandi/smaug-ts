/**
 * Room – A single room in the game world.
 *
 * Contains exits, characters present, objects on the ground,
 * extra descriptions, room flags, sector type, and reset data.
 */

import {
  Direction,
  SectorType,
  type Exit,
  type ExtraDescription,
} from './types.js';
import type { Character } from './Character.js';
import type { Area } from './Area.js';

export class Room {
  vnum: number;
  area: Area | null;
  name: string;
  description: string;
  sectorType: SectorType;
  roomFlags: bigint;
  exits: Map<Direction, Exit>;
  characters: Character[];
  contents: unknown[];
  extraDescriptions: ExtraDescription[];
  light: number;
  teleportVnum: number;
  teleportDelay: number;
  tunnel: number;
  programs: unknown[];

  constructor(vnum: number, name: string = '', description: string = '') {
    this.vnum = vnum;
    this.area = null;
    this.name = name;
    this.description = description;
    this.sectorType = SectorType.Inside;
    this.roomFlags = 0n;
    this.exits = new Map();
    this.characters = [];
    this.contents = [];
    this.extraDescriptions = [];
    this.light = 0;
    this.teleportVnum = 0;
    this.teleportDelay = 0;
    this.tunnel = 0;
    this.programs = [];
  }

  /** Get exit in the given direction, or undefined. */
  getExit(direction: Direction): Exit | undefined {
    return this.exits.get(direction);
  }

  /** Add a character to this room. */
  addCharacter(ch: Character): void {
    if (!this.characters.includes(ch)) {
      this.characters.push(ch);
      ch.inRoom = this;
    }
  }

  /** Remove a character from this room. */
  removeCharacter(ch: Character): void {
    const idx = this.characters.indexOf(ch);
    if (idx !== -1) {
      this.characters.splice(idx, 1);
      ch.wasInRoom = this;
      ch.inRoom = null;
    }
  }

  /** Check if a room flag is set. */
  hasFlag(flag: bigint): boolean {
    return (this.roomFlags & flag) !== 0n;
  }

  /** Get all player characters in this room. */
  getPlayers(): Character[] {
    return this.characters.filter(ch => !ch.isNpc);
  }

  /** Get all mobile (NPC) characters in this room. */
  getMobiles(): Character[] {
    return this.characters.filter(ch => ch.isNpc);
  }
}
