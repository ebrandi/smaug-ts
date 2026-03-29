/**
 * GameObject – In-world object instance.
 *
 * Instantiated from ObjectPrototype. Tracks current state: wear location,
 * timer, contained-in references, extra descriptions, applied affects,
 * and value overrides.
 */

import {
  ItemType,
  WearLocation,
  type ObjectPrototype,
  type ExtraDescription,
} from './types.js';
import { Affect } from './Affect.js';
import type { Character } from './Character.js';

export class GameObject {
  id: string;
  prototype: ObjectPrototype;
  name: string;
  shortDescription: string;
  description: string;
  keywords: string[];
  itemType: ItemType;
  values: number[];
  wearFlags: bigint;
  extraFlags: bigint;
  wearLocation: WearLocation;
  weight: number;
  cost: number;
  timer: number;
  serial: number;
  contents: GameObject[];
  carriedBy: Character | null;
  inRoom: unknown | null;
  inObject: GameObject | null;
  extraDescriptions: ExtraDescription[];
  affects: Affect[];

  /** Global instance counter for unique object IDs. */
  private static instanceCounter = 0;
  /** Global serial counter. */
  private static serialCounter = 0;

  constructor(proto: ObjectPrototype) {
    GameObject.instanceCounter++;
    GameObject.serialCounter++;

    this.id = `obj_${GameObject.instanceCounter}`;
    this.prototype = proto;
    this.name = proto.name;
    this.shortDescription = proto.shortDesc;
    this.description = proto.description;
    this.keywords = proto.name.split(/\s+/);
    this.itemType = proto.itemType;
    this.values = [...proto.values];
    // Pad values to 6 entries
    while (this.values.length < 6) {
      this.values.push(0);
    }
    this.wearFlags = proto.wearFlags;
    this.extraFlags = proto.extraFlags;
    this.wearLocation = WearLocation.None;
    this.weight = proto.weight;
    this.cost = proto.cost;
    this.timer = 0;
    this.serial = GameObject.serialCounter;
    this.contents = [];
    this.carriedBy = null;
    this.inRoom = null;
    this.inObject = null;
    this.extraDescriptions = [...proto.extraDescriptions];
    this.affects = [];
  }

  /** Get total weight including contents. */
  getTotalWeight(): number {
    let total = this.weight;
    for (const obj of this.contents) {
      total += obj.getTotalWeight();
    }
    return total;
  }

  /** Check if an extra flag is set. */
  hasExtraFlag(flag: bigint): boolean {
    return (this.extraFlags & flag) !== 0n;
  }

  /** Check if a wear flag is set. */
  hasWearFlag(flag: bigint): boolean {
    return (this.wearFlags & flag) !== 0n;
  }

  /** Reset the static counters (for testing). */
  static resetCounters(): void {
    GameObject.instanceCounter = 0;
    GameObject.serialCounter = 0;
  }
}
