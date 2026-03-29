/**
 * EventBus - Typed publish/subscribe event system for SMAUG 2.0
 *
 * Extends Node.js EventEmitter with a typed GameEvent enum and
 * payload interfaces. All listeners fire synchronously on the main
 * thread in registration order, matching legacy direct-call behavior.
 */

import { EventEmitter } from 'events';

/**
 * All game events as a string enum.
 * Organized by subsystem: tick, character, combat, object, communication,
 * world, admin, system, mudprog.
 */
export enum GameEvent {
  // Tick events
  SecondTick    = 'tick:second',
  ViolenceTick  = 'tick:violence',
  MobileTick    = 'tick:mobile',
  AreaTick      = 'tick:area',
  FullTick      = 'tick:full',
  AuctionTick   = 'tick:auction',

  // Character events
  CharacterEnterRoom  = 'char:enterRoom',
  CharacterLeaveRoom  = 'char:leaveRoom',
  CharacterDeath      = 'char:death',
  CharacterLogin      = 'char:login',
  CharacterLogout     = 'char:logout',
  CharacterLevelUp    = 'char:levelUp',

  // Combat events
  CombatStart     = 'combat:start',
  CombatEnd       = 'combat:end',
  CombatDamage    = 'combat:damage',
  CombatDeath     = 'combat:death',

  // Object events
  ObjectPickup    = 'object:pickup',
  ObjectDrop      = 'object:drop',
  ObjectEquip     = 'object:equip',
  ObjectRemove    = 'object:remove',
  ObjectDecay     = 'object:decay',

  // Communication events
  ChannelMessage  = 'comm:channel',
  TellMessage     = 'comm:tell',
  SayMessage      = 'comm:say',

  // World events
  AreaReset       = 'world:areaReset',
  WeatherChange   = 'world:weatherChange',
  TimeChange      = 'world:timeChange',

  // Admin events
  AdminAction     = 'admin:action',
  PlayerAuthorize = 'admin:authorize',

  // System events
  Shutdown        = 'system:shutdown',
  Reboot          = 'system:reboot',
  LagWarning      = 'system:lagWarning',

  // MudProg events
  MudProgTrigger  = 'mudprog:trigger',
}

/** Payload for tick events. */
export interface TickPayload {
  /** The pulse number at which this tick fired. */
  pulse: number;
}

/** Payload for character room-related events. */
export interface CharacterRoomPayload {
  characterId: string;
  roomVnum: number;
  direction?: number;
}

/** Payload for combat damage events. */
export interface CombatDamagePayload {
  attackerId: string;
  victimId: string;
  damage: number;
  damageType: string;
  skillName?: string;
}

/**
 * Synchronous event bus. All listeners fire on the main thread in
 * registration order, matching legacy direct-call behavior.
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    // Many subsystems register many listeners
    this.setMaxListeners(200);
  }

  /**
   * Type-safe emit wrapper.
   * @param event - The GameEvent to emit
   * @param payload - Typed payload for the event
   * @returns true if there were listeners for the event
   */
  emitEvent<T>(event: GameEvent, payload: T): boolean {
    return this.emit(event, payload);
  }
}
