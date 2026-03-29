/**
 * Mobile – NPC entity instantiated from MobilePrototype.
 *
 * Extends Character with NPC-specific behaviour: prototype reference,
 * shop data, spec functions, and reset tracking.
 */

import { Character, type CharacterInit } from './Character.js';
import type { MobilePrototype, ShopData, RepairShopData } from './types.js';
import { rollDice } from '../../utils/Dice.js';

export class Mobile extends Character {
  prototype: MobilePrototype;
  shopData: ShopData | null;
  repairShopData: RepairShopData | null;
  specFun: ((mob: Mobile) => boolean) | null;
  resetRoom: number;

  /** Global instance counter for unique NPC IDs. */
  private static instanceCounter = 0;

  constructor(proto: MobilePrototype) {
    const init: CharacterInit = {
      name: proto.name,
      shortDescription: proto.shortDesc,
      longDescription: proto.longDesc,
      description: proto.description,
      level: proto.level,
      sex: proto.sex,
      race: proto.race,
      class_: proto.class,
      hitroll: proto.hitroll,
      damroll: proto.damroll,
      alignment: proto.alignment,
      position: proto.position,
      defaultPosition: proto.defaultPosition,
      actFlags: proto.actFlags,
      affectedBy: proto.affectedBy,
      resistant: proto.resistant,
      immune: proto.immune,
      susceptible: proto.susceptible,
      speaks: proto.speaks,
      speaking: proto.speaking,
      numAttacks: proto.numAttacks,
      gold: proto.gold,
      exp: proto.exp,
    };

    super(init);

    Mobile.instanceCounter++;
    this.id = `mob_${Mobile.instanceCounter}`;

    this.prototype = proto;
    this.shopData = proto.shop;
    this.repairShopData = proto.repairShop;
    this.specFun = null;
    this.resetRoom = 0;

    // Parse maxHit from dice string
    const hd = proto.hitDice;
    const rolled = rollDice(hd.num, hd.size);
    this.maxHit = rolled + hd.bonus;
    this.hit = this.maxHit;

    // Copy saving throws
    if (proto.savingThrows.length >= 5) {
      this.savingPoison = proto.savingThrows[0] ?? 0;
      this.savingRod = proto.savingThrows[1] ?? 0;
      this.savingPara = proto.savingThrows[2] ?? 0;
      this.savingBreath = proto.savingThrows[3] ?? 0;
      this.savingSpell = proto.savingThrows[4] ?? 0;
    }
  }

  get isNpc(): true {
    return true;
  }

  /** NPCs don't have a descriptor – no-op. */
  sendToChar(_text: string): void {
    // no-op for NPCs
  }

  /** NPCs have a flat 75% proficiency for all skills. */
  getLearnedPercent(_skillNumber: number): number {
    return 75;
  }

  /** Reset the static instance counter (for testing). */
  static resetInstanceCounter(): void {
    Mobile.instanceCounter = 0;
  }
}
