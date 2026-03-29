/**
 * VnumRegistry – Global vnum allocation and lookup.
 *
 * Tracks allocated vnum ranges for areas, provides O(1) lookup
 * of mobile prototypes, object prototypes, and rooms by vnum.
 * Prevents vnum collisions during OLC creation.
 */

import type { MobilePrototype, ObjectPrototype } from '../entities/types.js';
import type { Room } from '../entities/Room.js';

export class VnumRegistry {
  /** Map of mobile vnum → mobile prototype data. */
  private readonly mobIndex: Map<number, MobilePrototype> = new Map();

  /** Map of object vnum → object prototype data. */
  private readonly objIndex: Map<number, ObjectPrototype> = new Map();

  /** Map of room vnum → room instance data. */
  private readonly roomIndex: Map<number, Room> = new Map();

  /**
   * Register a mobile prototype by vnum.
   * @throws Error if vnum is already registered
   */
  registerMobile(vnum: number, prototype: MobilePrototype): void {
    if (this.mobIndex.has(vnum)) {
      throw new Error(`Duplicate mobile vnum: ${vnum}`);
    }
    this.mobIndex.set(vnum, prototype);
  }

  /**
   * Register an object prototype by vnum.
   * @throws Error if vnum is already registered
   */
  registerObject(vnum: number, prototype: ObjectPrototype): void {
    if (this.objIndex.has(vnum)) {
      throw new Error(`Duplicate object vnum: ${vnum}`);
    }
    this.objIndex.set(vnum, prototype);
  }

  /**
   * Register a room by vnum.
   * @throws Error if vnum is already registered
   */
  registerRoom(vnum: number, room: Room): void {
    if (this.roomIndex.has(vnum)) {
      throw new Error(`Duplicate room vnum: ${vnum}`);
    }
    this.roomIndex.set(vnum, room);
  }

  /** Look up a mobile prototype by vnum. */
  getMobile(vnum: number): MobilePrototype | undefined {
    return this.mobIndex.get(vnum);
  }

  /** Look up an object prototype by vnum. */
  getObject(vnum: number): ObjectPrototype | undefined {
    return this.objIndex.get(vnum);
  }

  /** Look up a room by vnum. */
  getRoom(vnum: number): Room | undefined {
    return this.roomIndex.get(vnum);
  }

  /** Get all registered mobile prototypes. */
  getAllMobiles(): MobilePrototype[] {
    return Array.from(this.mobIndex.values());
  }

  /** Get all registered object prototypes. */
  getAllObjects(): ObjectPrototype[] {
    return Array.from(this.objIndex.values());
  }

  /** Get all registered rooms. */
  getAllRooms(): Room[] {
    return Array.from(this.roomIndex.values());
  }

  /**
   * Find the next unused vnum in a given range.
   *
   * @param type - Type of entity to check
   * @param rangeStart - Start of vnum range (inclusive)
   * @param rangeEnd - End of vnum range (inclusive)
   * @returns Next free vnum, or null if none available
   */
  getNextFreeVnum(type: 'mobile' | 'object' | 'room', rangeStart: number, rangeEnd: number): number | null {
    const index = type === 'mobile' ? this.mobIndex
                : type === 'object' ? this.objIndex
                : this.roomIndex;

    for (let vnum = rangeStart; vnum <= rangeEnd; vnum++) {
      if (!index.has(vnum)) {
        return vnum;
      }
    }
    return null;
  }

  /** Get the total count of registered mobiles. */
  getMobileCount(): number {
    return this.mobIndex.size;
  }

  /** Get the total count of registered objects. */
  getObjectCount(): number {
    return this.objIndex.size;
  }

  /** Get the total count of registered rooms. */
  getRoomCount(): number {
    return this.roomIndex.size;
  }
}
