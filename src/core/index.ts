/**
 * Core module barrel export.
 */
export { EventBus, GameEvent } from './EventBus.js';
export type { TickPayload, CharacterRoomPayload, CombatDamagePayload } from './EventBus.js';
export { TickEngine, PULSE } from './TickEngine.js';
export { GameLoop } from './GameLoop.js';
export type { GameLoopConfig, IConnectionManager } from './GameLoop.js';
