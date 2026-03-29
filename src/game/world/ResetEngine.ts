/**
 * ResetEngine – Area reset / repopulation processor.
 *
 * Executes area reset commands (M, O, P, G, E, D, R) to repopulate
 * mobiles, place objects, set door states, and randomize exits on
 * each area tick.
 *
 * Reset command types:
 *   M – Load a mobile into a room
 *   O – Load an object into a room
 *   P – Put an object into another object
 *   G – Give an object to the last mobile loaded
 *   E – Equip the last mobile with an object
 *   D – Set a door state
 *   R – Randomize room exits
 */

import { Area } from '../entities/Area.js';
import type { ResetData } from '../entities/Area.js';
import { Room } from '../entities/Room.js';
import { Mobile } from '../entities/Mobile.js';
import { GameObject } from '../entities/GameObject.js';
import type { WearLocation } from '../entities/types.js';
import { Direction } from '../entities/types.js';
import { VnumRegistry } from './VnumRegistry.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { Logger } from '../../utils/Logger.js';

const LOG_DOMAIN = 'reset-engine';

/** Tracks context during area reset processing. */
interface ResetContext {
  lastMob: Mobile | null;
  lastObj: GameObject | null;
  lastRoom: Room | null;
}

export class ResetEngine {
  private readonly vnumRegistry: VnumRegistry;
  private readonly eventBus: EventBus;
  private readonly logger: Logger;

  constructor(vnumRegistry: VnumRegistry, eventBus: EventBus, logger: Logger) {
    this.vnumRegistry = vnumRegistry;
    this.eventBus = eventBus;
    this.logger = logger;
  }

  /**
   * Process all resets for an area in order.
   * Tracks lastMob and lastObj for G/E/P commands.
   */
  resetArea(area: Area): void {
    const context: ResetContext = {
      lastMob: null,
      lastObj: null,
      lastRoom: null,
    };

    for (const reset of area.resets) {
      this.processReset(reset, area, context);
    }

    area.resetAge();
    this.logger.debug(LOG_DOMAIN, `Reset area: ${area.name}`);
  }

  /**
   * Dispatch a single reset to the appropriate handler.
   */
  private processReset(reset: ResetData, area: Area, context: ResetContext): void {
    switch (reset.command) {
      case 'M':
        this.resetMobile(reset, area, context);
        break;
      case 'O':
        this.resetObject(reset, area, context);
        break;
      case 'P':
        this.resetPut(reset, context);
        break;
      case 'G':
        this.resetGive(reset, context);
        break;
      case 'E':
        this.resetEquip(reset, context);
        break;
      case 'D':
        this.resetDoor(reset);
        break;
      case 'R':
        this.resetRandomize(reset);
        break;
      default:
        this.logger.warn(LOG_DOMAIN, `Unknown reset command: ${reset.command}`);
        break;
    }
  }

  /**
   * M command: Load a mobile into a room.
   * arg1 = mobile vnum, arg2 = max count, arg3 = room vnum
   */
  private resetMobile(reset: ResetData, _area: Area, context: ResetContext): void {
    const proto = this.vnumRegistry.getMobile(reset.arg1);
    if (!proto) {
      this.logger.warn(LOG_DOMAIN, `Reset M: mobile vnum ${reset.arg1} not found`);
      context.lastMob = null;
      return;
    }

    const room = this.vnumRegistry.getRoom(reset.arg3);
    if (!room) {
      this.logger.warn(LOG_DOMAIN, `Reset M: room vnum ${reset.arg3} not found`);
      context.lastMob = null;
      return;
    }

    // Check max count: count existing mobs of this prototype in the room
    const maxCount = reset.arg2;
    if (maxCount > 0) {
      const existingCount = room.getMobiles().filter(
        ch => (ch as Mobile).prototype?.vnum === proto.vnum,
      ).length;
      if (existingCount >= maxCount) {
        context.lastMob = null;
        return;
      }
    }

    // Create mobile instance from prototype
    const mob = new Mobile(proto);
    mob.resetRoom = room.vnum;
    room.addCharacter(mob);
    context.lastMob = mob;
    context.lastRoom = room;
  }

  /**
   * O command: Load an object into a room.
   * arg1 = object vnum, arg2 = max count, arg3 = room vnum
   */
  private resetObject(reset: ResetData, _area: Area, context: ResetContext): void {
    const proto = this.vnumRegistry.getObject(reset.arg1);
    if (!proto) {
      this.logger.warn(LOG_DOMAIN, `Reset O: object vnum ${reset.arg1} not found`);
      context.lastObj = null;
      return;
    }

    const room = this.vnumRegistry.getRoom(reset.arg3);
    if (!room) {
      this.logger.warn(LOG_DOMAIN, `Reset O: room vnum ${reset.arg3} not found`);
      context.lastObj = null;
      return;
    }

    // Check max count of this object type in the room
    const maxCount = reset.arg2;
    if (maxCount > 0) {
      const existingCount = (room.contents as GameObject[]).filter(
        obj => obj.prototype?.vnum === proto.vnum,
      ).length;
      if (existingCount >= maxCount) {
        context.lastObj = null;
        return;
      }
    }

    const obj = new GameObject(proto);
    obj.inRoom = room;
    (room.contents as GameObject[]).push(obj);
    context.lastObj = obj;
    context.lastRoom = room;
  }

  /**
   * P command: Put an object into another object (the last loaded object).
   * arg1 = object vnum, arg2 = max count, arg3 = container vnum (unused if lastObj set)
   */
  private resetPut(reset: ResetData, context: ResetContext): void {
    const proto = this.vnumRegistry.getObject(reset.arg1);
    if (!proto) {
      this.logger.warn(LOG_DOMAIN, `Reset P: object vnum ${reset.arg1} not found`);
      return;
    }

    if (!context.lastObj) {
      this.logger.warn(LOG_DOMAIN, `Reset P: no last object for put`);
      return;
    }

    const obj = new GameObject(proto);
    obj.inObject = context.lastObj;
    context.lastObj.contents.push(obj);
  }

  /**
   * G command: Give an object to the last loaded mobile.
   * arg1 = object vnum, arg2 = max count
   */
  private resetGive(reset: ResetData, context: ResetContext): void {
    const proto = this.vnumRegistry.getObject(reset.arg1);
    if (!proto) {
      this.logger.warn(LOG_DOMAIN, `Reset G: object vnum ${reset.arg1} not found`);
      return;
    }

    if (!context.lastMob) {
      this.logger.warn(LOG_DOMAIN, `Reset G: no last mob for give`);
      return;
    }

    const obj = new GameObject(proto);
    obj.carriedBy = context.lastMob;
    (context.lastMob.inventory as GameObject[]).push(obj);
  }

  /**
   * E command: Equip an object on the last loaded mobile.
   * arg1 = object vnum, arg2 = max count, arg3 = wear location
   */
  private resetEquip(reset: ResetData, context: ResetContext): void {
    const proto = this.vnumRegistry.getObject(reset.arg1);
    if (!proto) {
      this.logger.warn(LOG_DOMAIN, `Reset E: object vnum ${reset.arg1} not found`);
      return;
    }

    if (!context.lastMob) {
      this.logger.warn(LOG_DOMAIN, `Reset E: no last mob for equip`);
      return;
    }

    const obj = new GameObject(proto);
    obj.carriedBy = context.lastMob;
    obj.wearLocation = reset.arg3 as WearLocation;
    context.lastMob.equipment.set(reset.arg3 as WearLocation, obj);
    context.lastObj = obj;
  }

  /**
   * D command: Set a door state.
   * arg1 = room vnum, arg2 = direction, arg3 = state (0=open, 1=closed, 2=locked)
   */
  private resetDoor(reset: ResetData): void {
    const room = this.vnumRegistry.getRoom(reset.arg1);
    if (!room) {
      this.logger.warn(LOG_DOMAIN, `Reset D: room vnum ${reset.arg1} not found`);
      return;
    }

    const direction = reset.arg2 as Direction;
    const exit = room.getExit(direction);
    if (!exit) {
      this.logger.warn(LOG_DOMAIN, `Reset D: no exit direction ${direction} in room ${reset.arg1}`);
      return;
    }

    // Door state flags: bit 0 = closed, bit 1 = locked
    const EX_CLOSED = 1n;
    const EX_LOCKED = 2n;

    switch (reset.arg3) {
      case 0: // Open
        exit.flags = exit.flags & ~EX_CLOSED & ~EX_LOCKED;
        break;
      case 1: // Closed
        exit.flags = (exit.flags | EX_CLOSED) & ~EX_LOCKED;
        break;
      case 2: // Locked
        exit.flags = exit.flags | EX_CLOSED | EX_LOCKED;
        break;
      default:
        break;
    }
  }

  /**
   * R command: Randomize exits in a room.
   * arg1 = room vnum, arg2 = number of directions to randomize
   */
  private resetRandomize(reset: ResetData): void {
    const room = this.vnumRegistry.getRoom(reset.arg1);
    if (!room) {
      this.logger.warn(LOG_DOMAIN, `Reset R: room vnum ${reset.arg1} not found`);
      return;
    }

    const numDirs = Math.min(reset.arg2, 10); // max 10 directions
    const directions = Array.from(room.exits.keys()).slice(0, numDirs);

    // Fisher-Yates shuffle of exit destinations
    if (directions.length < 2) return;

    const exits = directions.map(d => room.exits.get(d)!);
    const toRooms = exits.map(e => e.toRoom);

    for (let i = toRooms.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = toRooms[i]!;
      toRooms[i] = toRooms[j]!;
      toRooms[j] = tmp;
    }

    for (let i = 0; i < exits.length; i++) {
      exits[i]!.toRoom = toRooms[i]!;
    }
  }

  /**
   * Check if an area needs to be reset.
   * Returns true when area.age >= area.resetFrequency AND
   * there are no players in the area (or the area has no mobs).
   */
  shouldReset(area: Area): boolean {
    if (area.age < area.resetFrequency) {
      return false;
    }

    // Check for players in the area
    for (const room of area.rooms.values()) {
      if (room.getPlayers().length > 0) {
        // Still reset if area has been waiting too long (2x frequency)
        return area.age >= area.resetFrequency * 2;
      }
    }

    return true;
  }

  /**
   * Called on area tick. Increments age for each area, checks
   * shouldReset, and calls resetArea if needed.
   */
  tickAreas(areas: Area[]): void {
    for (const area of areas) {
      area.age++;
      if (this.shouldReset(area)) {
        this.resetArea(area);
        this.eventBus.emitEvent(GameEvent.AreaReset, { areaName: area.name });
      }
    }
  }
}
