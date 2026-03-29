# SMAUG 2.0 TypeScript Port — Phase 3F: Movement System

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phases 3A through 3E have established the complete project infrastructure, world loading system, and legacy file migration pipeline. The project scaffold (package.json, tsconfig.json, ESLint, Vitest, Prisma schema, all stub files) exists. The core engine (EventBus, TickEngine, GameLoop), network layer (WebSocket/Socket.IO, ConnectionManager, Descriptor), comprehensive utility layer (Logger, AnsiColors, Dice, BitVector, StringUtils with `actSubstitute`, TextFormatter, FileIO helpers, LegacyConverter with `LegacyFieldReader`, TimeUtils, Tables), the complete world loading system (VnumRegistry, Room/Area entities, ResetEngine, AreaManager with JSON loading, exit resolution, and area reset lifecycle), and the migration pipeline (AreFileParser, PlayerFileParser, MigrationRunner) are all implemented and tested. The game world is fully populated from JSON files with rooms, NPCs, and objects. This phase implements character movement between rooms — the fundamental interaction that makes the world navigable.
>
> **Your role:** You are an expert TypeScript/Node.js engineer with deep knowledge of MUD engine architecture. You have access to five reference documents that describe the legacy C codebase in exhaustive detail:
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `COMMANDS.md` — Full command table with trust levels, positions, and flags
> - `STRUCTURE.md` — File inventory and subsystem grouping

## Cardinal Rules (apply to ALL code you produce)

1. **Preserve legacy gameplay exactly.** Every formula, threshold, constant, and order-of-operations must match the C original. When the architecture doc says "replicates legacy X", implement it verbatim.
2. **Use the scaffolded file paths.** Do not create new files or rename existing ones. Every file referenced below already exists as a stub from earlier phases.
3. **Follow the TypeScript patterns established in ARCHITECTURE.md.** Use the exact class names, method signatures, enum values, and interface shapes defined there.
4. **Emit EventBus events** at every documented hook point (room enter/leave, door open/close, flee, recall, portal enter) so that downstream systems (MUDprogs, logging, admin dashboard) can subscribe.
5. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
6. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`, `roomFlags`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
7. **Handle edge cases defensively.** Check for null rooms, dead characters, extracted objects before every operation. The legacy code is littered with `char_died()` and `obj_extracted()` guards — replicate them.
8. **No external runtime dependencies** beyond what's already in `package.json` (Prisma, Socket.IO, Express, jsonwebtoken, bcrypt, zlib).
9. **Maintain the pulse-based timing model.** 4 pulses/second, `PULSE_VIOLENCE` = 12, `PULSE_MOBILE` = 16, `PULSE_AUCTION` = 36, `PULSE_AREA` = 240, `PULSE_TICK` = 280. All durations and cooldowns are expressed in pulses.
10. **Log with the structured Logger** (`src/utils/Logger.ts`) using domain tags. Never use bare `console.log`.

## Folder Structure Reference

```
smaug-ts/
├── src/
│   ├── core/               # GameLoop, TickEngine, EventBus
│   ├── network/            # WebSocketServer, ConnectionManager, SocketIOAdapter, TelnetProtocol
│   ├── game/
│   │   ├── commands/       # CommandRegistry, movement, combat, communication, information, objects, magic, social, immortal, olc
│   │   ├── combat/         # CombatEngine, DamageCalculator, DeathHandler
│   │   ├── world/          # AreaManager, RoomManager, ResetEngine, VnumRegistry
│   │   ├── entities/       # Character, Player, Mobile, GameObject, Room, Area, Affect
│   │   ├── economy/        # Currency, ShopSystem, AuctionSystem, BankSystem
│   │   ├── spells/         # SpellEngine, SpellRegistry, SavingThrows, ComponentSystem
│   │   ├── affects/        # AffectManager, AffectRegistry, StatModifier
│   │   └── social/         # ClanSystem, CouncilSystem, DeitySystem, BoardSystem, HousingSystem
│   ├── persistence/        # PlayerRepository, WorldRepository
│   ├── admin/              # AdminRouter, AuthController, MonitoringController
│   ├── scripting/          # MudProgEngine, IfcheckRegistry, ScriptParser, VariableSubstitution
│   ├── utils/              # AnsiColors, Dice, StringUtils, BitVector, Logger, TextFormatter, FileIO, LegacyConverter, TimeUtils, Tables
│   └── migration/          # AreFileParser, PlayerFileParser, MigrationRunner
├── prisma/schema.prisma
├── world/                  # JSON world data files (one subdirectory per area)
├── tests/                  # Unit, integration, e2e tests
└── public/                 # Browser client and admin dashboard static files
```

## Prior Sub-Phases Completed

**Sub-Phase 3A (Project Initialisation)** — Complete. Full project scaffold with all dependencies and configuration.

**Sub-Phase 3B (Core Infrastructure)** — Complete. EventBus (72 events), TickEngine (6 pulse counters), GameLoop (250ms), Logger, AnsiColors, Dice, BitVector, StringUtils, WebSocketServer, ConnectionManager, entity type definitions, and main.ts entry point.

**Sub-Phase 3C (Utilities & Helpers)** — Complete. StringUtils (extended), TextFormatter, FileIO, LegacyConverter with `LegacyFieldReader`, TimeUtils, Tables (race/class/language), AnsiColors (extended with `wordWrap` and `colorizeByThreshold`).

**Sub-Phase 3D (World Loader)** — Complete. VnumRegistry, Room entity with exits/extra descriptions, Area entity with reset commands, ResetEngine (M/O/P/G/E/D/R), AreaManager with JSON loading and area lifecycle, RoomManager with pathfinding.

**Sub-Phase 3E (Area Parser)** — Complete. The following migration modules are fully implemented and tested:

| Module | File | Key Exports |
|---|---|---|
| AreFileParser | `src/migration/AreFileParser.ts` | `parseFile()`, `writeToJson()` — parses #AREA, #ROOMS, #MOBILES, #OBJECTS, #RESETS, #SHOPS, #REPAIRSHOPS, #SPECIALS, #CLIMATE, #MUDPROGS/#OPROGS/#RPROGS sections; handles S/C/V mobile complexity; tilde-terminated strings; error recovery |
| PlayerFileParser | `src/migration/PlayerFileParser.ts` | `parseFile()`, `parseContent()` — parses legacy player saves with skills, affects, equipment; flags passwords for bcrypt migration |
| MigrationRunner | `src/migration/MigrationRunner.ts` | `migrateAreas()`, `migratePlayers()`, `migrateSingleArea()` — bulk conversion with statistics tracking |

**Do NOT modify any of the above completed implementations** unless explicitly extending them. You may import from them freely.

---

## Sub-Phase 3F Objective

Implement the complete character movement system. After this sub-phase, characters can walk between rooms using directional commands, open/close/lock/unlock doors, flee from combat, recall to safe rooms, and enter/leave portals. Followers automatically follow their master. Movement costs are deducted based on terrain, and room capacity limits are enforced. This is the first phase where player input results in visible world-state changes — the foundation of all gameplay interaction.

---

## Files to Implement

### 1. `src/game/commands/movement.ts` — Core Movement System

Implement all movement commands. Replicates legacy `move_char()` in `act_move.c`:

```typescript
// src/game/commands/movement.ts

import { Room, RoomExit } from '../entities/Room.js';
import { EventBus, GameEvent } from '../../core/EventBus.js';
import { VnumRegistry } from '../world/VnumRegistry.js';
import { RoomManager } from '../world/RoomManager.js';
import { Logger } from '../../utils/Logger.js';
import { numberRange, numberPercent } from '../../utils/Dice.js';
import { hasFlag } from '../../utils/BitVector.js';

const logger = new Logger();

// ─── Direction Constants ─────────────────────────────────────────────

export enum Direction {
  North = 0,
  East  = 1,
  South = 2,
  West  = 3,
  Up    = 4,
  Down  = 5,
}

export const DIRECTION_NAMES: readonly string[] = [
  'north', 'east', 'south', 'west', 'up', 'down',
];

export const REVERSE_DIRECTION: readonly number[] = [
  Direction.South,  // reverse of North
  Direction.West,   // reverse of East
  Direction.North,  // reverse of South
  Direction.East,   // reverse of West
  Direction.Down,   // reverse of Up
  Direction.Up,     // reverse of Down
];

// ─── Room Flag Constants (bigint) ────────────────────────────────────

export const ROOM_DARK        = 1n;
export const ROOM_DEATH       = 2n;
export const ROOM_NO_MOB      = 4n;
export const ROOM_INDOORS     = 8n;
export const ROOM_SAFE        = 16n;
export const ROOM_PRIVATE     = 32n;
export const ROOM_SOLITARY    = 64n;
export const ROOM_PET_SHOP    = 128n;
export const ROOM_NO_RECALL   = 256n;
export const ROOM_DONATION    = 512n;
export const ROOM_NODROPALL   = 1024n;
export const ROOM_SILENCE     = 2048n;
export const ROOM_LOG         = 4096n;
export const ROOM_NO_MAGIC    = 8192n;
export const ROOM_TUNNEL      = 16384n;
export const ROOM_NO_SUMMON   = 32768n;
export const ROOM_NO_ASTRAL   = 65536n;
export const ROOM_TELEPORT    = 131072n;
export const ROOM_TELESHOWDESC = 262144n;
export const ROOM_NOFLOOR     = 524288n;
export const ROOM_PROTOTYPE   = 1048576n;

// ─── Exit Flag Constants ─────────────────────────────────────────────

export const EX_ISDOOR      = 1;
export const EX_CLOSED      = 2;
export const EX_LOCKED      = 4;
export const EX_SECRET      = 8;
export const EX_SWIM        = 16;
export const EX_PICKPROOF   = 32;
export const EX_FLY         = 64;
export const EX_CLIMB       = 128;
export const EX_DIG         = 256;
export const EX_NOPASSDOOR  = 512;
export const EX_HIDDEN      = 1024;
export const EX_PASSAGE     = 2048;
export const EX_PORTAL      = 4096;
export const EX_OVERLAND    = 8192;
export const EX_AUTOMAPPED  = 16384;

// ─── Sector Types and Movement Costs ─────────────────────────────────

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
  River       = 11,
  OceanFloor  = 12,
  Underground = 13,
  Lava        = 14,
  Swamp       = 15,
}

/**
 * Movement cost per sector type.
 * Replicates legacy movement_loss[] array from act_move.c.
 */
export const SECTOR_MOVE_COST: Record<number, number> = {
  [SectorType.Inside]:      1,
  [SectorType.City]:        2,
  [SectorType.Field]:       2,
  [SectorType.Forest]:      3,
  [SectorType.Hills]:       4,
  [SectorType.Mountain]:    6,
  [SectorType.WaterSwim]:   4,
  [SectorType.WaterNoSwim]: 1,
  [SectorType.Underwater]:  6,
  [SectorType.Air]:         10,
  [SectorType.Desert]:      6,
  [SectorType.River]:       5,
  [SectorType.OceanFloor]:  7,
  [SectorType.Underground]: 4,
  [SectorType.Lava]:        4,
  [SectorType.Swamp]:       4,
};

// ─── AFF Flag Constants (bigint) ─────────────────────────────────────

export const AFF_BLIND       = 1n;
export const AFF_INVISIBLE   = 2n;
export const AFF_DETECT_EVIL = 4n;
export const AFF_DETECT_INVIS = 8n;
export const AFF_DETECT_MAGIC = 16n;
export const AFF_DETECT_HIDDEN = 32n;
export const AFF_HOLD        = 64n;
export const AFF_SANCTUARY   = 128n;
export const AFF_FAERIE_FIRE = 256n;
export const AFF_INFRARED    = 512n;
export const AFF_CURSE       = 1024n;
export const AFF_POISON      = 4096n;
export const AFF_PROTECT     = 8192n;
export const AFF_PARALYSIS   = 16384n;
export const AFF_SNEAK       = 32768n;
export const AFF_HIDE        = 65536n;
export const AFF_SLEEP       = 131072n;
export const AFF_CHARM       = 262144n;
export const AFF_FLYING      = 524288n;
export const AFF_PASS_DOOR   = 1048576n;
export const AFF_FLOATING    = 2097152n;

// ─── Position Constants ──────────────────────────────────────────────

export enum Position {
  Dead         = 0,
  Mortal       = 1,
  Incapacitated = 2,
  Stunned      = 3,
  Sleeping     = 4,
  Resting      = 5,
  Sitting      = 6,
  Fighting     = 7,
  Standing     = 8,
  Mounted      = 9,
  Shove        = 10,
  Drag         = 11,
}
```

**Core movement function:**

```typescript
/**
 * Move a character in the specified direction.
 * This is the core movement function — all directional commands
 * (north, south, etc.) are convenience wrappers around this.
 *
 * Replicates legacy move_char() from act_move.c.
 *
 * @param ch     — The character attempting to move.
 * @param dir    — Direction enum value (0=N, 1=E, 2=S, 3=W, 4=U, 5=D).
 * @param fleeing — If true, skip some checks (movement during flee).
 * @returns true if the character moved successfully, false otherwise.
 */
export function moveChar(ch: any, dir: number, fleeing: boolean = false): boolean {
  // ── 1. Null/state guards ──
  if (!ch || !ch.inRoom) return false;

  const fromRoom: Room = ch.inRoom;

  // ── 2. Position check ──
  if (ch.position < Position.Standing && !fleeing) {
    if (ch.position === Position.Fighting) {
      ch.send('You are fighting! Use "flee" to escape.\r\n');
    } else if (ch.position === Position.Sleeping) {
      ch.send('In your dreams, or what?\r\n');
    } else if (ch.position === Position.Resting || ch.position === Position.Sitting) {
      ch.send('Nah... You feel too relaxed...\r\n');
    } else if (ch.position <= Position.Stunned) {
      ch.send('You are too stunned to move.\r\n');
    }
    return false;
  }

  // Cannot move while fighting unless fleeing
  if (ch.fighting && !fleeing) {
    ch.send('You are fighting! Use "flee" to escape.\r\n');
    return false;
  }

  // ── 3. Exit check ──
  const exit: RoomExit | undefined = fromRoom.getExit(dir);
  if (!exit || !exit.toRoom) {
    ch.send('Alas, you cannot go that way.\r\n');
    return false;
  }

  const toRoom: Room = exit.toRoom;

  // ── 4. Door check ──
  if (exit.hasFlag(EX_CLOSED)) {
    // PASS_DOOR affect bypasses closed doors (unless EX_NOPASSDOOR)
    const hasPassDoor = ch.affectedBy !== undefined &&
      (BigInt(ch.affectedBy) & AFF_PASS_DOOR) !== 0n;

    if (hasPassDoor && !exit.hasFlag(EX_NOPASSDOOR)) {
      // Pass through the door silently
    } else {
      if (exit.hasFlag(EX_SECRET) || exit.hasFlag(EX_HIDDEN)) {
        ch.send('Alas, you cannot go that way.\r\n');
      } else {
        const doorName = exit.keyword || 'door';
        ch.send(`The ${doorName} is closed.\r\n`);
      }
      return false;
    }
  }

  // ── 5. Flight requirements ──
  if (exit.hasFlag(EX_FLY)) {
    const isFlying = ch.affectedBy !== undefined &&
      (BigInt(ch.affectedBy) & AFF_FLYING) !== 0n;
    if (!isFlying) {
      ch.send('You would need to fly to go there.\r\n');
      return false;
    }
  }

  // Sector air requires flight
  if (toRoom.sectorType === SectorType.Air) {
    const isFlying = ch.affectedBy !== undefined &&
      (BigInt(ch.affectedBy) & AFF_FLYING) !== 0n;
    if (!isFlying) {
      ch.send('You would need to fly to go there.\r\n');
      return false;
    }
  }

  // Water sectors require swimming or a boat
  if (toRoom.sectorType === SectorType.WaterNoSwim) {
    let hasBoat = false;
    if (ch.inventory) {
      hasBoat = ch.inventory.some((obj: any) => obj.itemType === 22); // ITEM_BOAT
    }
    const isFlying = ch.affectedBy !== undefined &&
      (BigInt(ch.affectedBy) & AFF_FLYING) !== 0n;
    if (!hasBoat && !isFlying) {
      ch.send('You need a boat to go there.\r\n');
      return false;
    }
  }

  // ── 6. Room flag checks ──
  // ROOM_NO_MOB blocks NPCs
  if (ch.isNPC && toRoom.hasFlag(ROOM_NO_MOB)) {
    ch.send('Alas, you cannot go that way.\r\n');
    return false;
  }

  // ROOM_PRIVATE — limit to 2 characters
  if (toRoom.hasFlag(ROOM_PRIVATE)) {
    if (toRoom.characters.length >= 2) {
      ch.send('That room is private right now.\r\n');
      return false;
    }
  }

  // ROOM_SOLITARY — limit to 1 character
  if (toRoom.hasFlag(ROOM_SOLITARY)) {
    if (toRoom.characters.length >= 1) {
      ch.send('That room is solitary right now.\r\n');
      return false;
    }
  }

  // ROOM_TUNNEL — limit to tunnel value
  if (toRoom.tunnel > 0) {
    if (toRoom.characters.length >= toRoom.tunnel) {
      ch.send('There is no room for you in there.\r\n');
      return false;
    }
  }

  // ── 7. Movement cost calculation ──
  const moveCost = calculateMovementCost(ch, toRoom);

  // Mount handling: deduct from mount if mounted
  const moveTarget = ch.mount ?? ch;

  if (!fleeing && moveTarget.move < moveCost) {
    if (ch.mount) {
      ch.send('Your mount is too exhausted.\r\n');
    } else {
      ch.send('You are too exhausted.\r\n');
    }
    return false;
  }

  if (!fleeing) {
    moveTarget.move -= moveCost;
  }

  // ── 8. ROOM_DEATH — death trap check on destination ──
  // (checked after move cost deduction, matching legacy behavior)

  // ── 9. Emit CharacterLeaveRoom event ──
  if (ch.eventBus) {
    ch.eventBus.emit(GameEvent.CharacterLeaveRoom ?? 'character:leave_room', {
      character: ch,
      fromRoom,
      direction: dir,
    });
  }

  // ── 10. Send departure message to old room ──
  const dirName = DIRECTION_NAMES[dir] ?? 'somewhere';
  if (!ch.isNPC || !(BigInt(ch.actFlags ?? 0n) & 128n)) { // !ACT_SECRETIVE
    const sneaking = ch.affectedBy !== undefined &&
      (BigInt(ch.affectedBy) & AFF_SNEAK) !== 0n;
    if (!sneaking) {
      if (ch.mount) {
        sendToRoom(fromRoom, ch,
          `$n leaves ${dirName}, riding $N.`, ch.mount);
      } else {
        sendToRoom(fromRoom, ch, `$n leaves ${dirName}.`);
      }
    }
  }

  // ── 11. Move character between rooms ──
  charFromRoom(ch, fromRoom);
  charToRoom(ch, toRoom);

  // ── 12. Send arrival message to new room ──
  const arriveDir = DIRECTION_NAMES[REVERSE_DIRECTION[dir]!] ?? 'somewhere';
  if (!ch.isNPC || !(BigInt(ch.actFlags ?? 0n) & 128n)) {
    const sneaking = ch.affectedBy !== undefined &&
      (BigInt(ch.affectedBy) & AFF_SNEAK) !== 0n;
    if (!sneaking) {
      if (ch.mount) {
        sendToRoom(toRoom, ch,
          `$n has arrived from the ${arriveDir}, riding $N.`, ch.mount);
      } else {
        sendToRoom(toRoom, ch,
          `$n has arrived.`);
      }
    }
  }

  // ── 13. Emit CharacterEnterRoom event ──
  if (ch.eventBus) {
    ch.eventBus.emit(GameEvent.CharacterEnterRoom ?? 'character:enter_room', {
      character: ch,
      toRoom,
      fromRoom,
      direction: dir,
    });
  }

  // ── 14. Auto-look ──
  if (ch.doLook) {
    ch.doLook(ch, 'auto');
  }

  // ── 15. Death trap ──
  if (toRoom.hasFlag(ROOM_DEATH) && !ch.isImmortal) {
    logger.info('movement', `${ch.name} hit death trap in room ${toRoom.vnum}`);
    ch.send('&RYou are engulfed by a wave of deadly energy!&D\r\n');
    if (ch.deathHandler) {
      ch.deathHandler.handleDeath(null, ch);
    }
    return true; // Character moved (then died)
  }

  // ── 16. Follower movement ──
  moveFollowers(ch, fromRoom, dir);

  // ── 17. MUDprog triggers ──
  fireMoveProgs(ch, fromRoom, toRoom, dir);

  // ── 18. Room teleport check ──
  if (toRoom.teleport && toRoom.hasFlag(ROOM_TELEPORT)) {
    // Schedule teleport after delay
    if (ch.scheduleEvent) {
      ch.scheduleEvent('teleport', toRoom.teleport.delay, () => {
        const destRoom = ch.vnumRegistry?.getRoom(toRoom.teleport!.vnum);
        if (destRoom && ch.inRoom === toRoom) {
          ch.send('You feel a strange pulling sensation...\r\n');
          charFromRoom(ch, toRoom);
          charToRoom(ch, destRoom);
          if (toRoom.hasFlag(ROOM_TELESHOWDESC) && ch.doLook) {
            ch.doLook(ch, 'auto');
          }
        }
      });
    }
  }

  return true;
}

/**
 * Calculate the movement cost for a character entering a room.
 * Base cost from sector type + encumbrance modifier.
 *
 * Replicates legacy encumbrance() and movement cost from act_move.c.
 */
export function calculateMovementCost(ch: any, toRoom: Room): number {
  // Flying characters always pay 1 move
  const isFlying = ch.affectedBy !== undefined &&
    (BigInt(ch.affectedBy) & AFF_FLYING) !== 0n;
  if (isFlying) return 1;

  // Floating characters also pay reduced cost
  const isFloating = ch.affectedBy !== undefined &&
    (BigInt(ch.affectedBy) & AFF_FLOATING) !== 0n;
  if (isFloating) return 1;

  // Base cost from sector type
  let cost = SECTOR_MOVE_COST[toRoom.sectorType] ?? 2;

  // Encumbrance modifier
  const encMult = getEncumbranceMultiplier(ch);
  cost = Math.ceil(cost * encMult);

  return Math.max(1, cost);
}

/**
 * Calculate encumbrance multiplier based on carry weight as a
 * percentage of max carry capacity.
 *
 * Replicates legacy encumbrance() from act_move.c:
 *   < 80%  → ×1.0 (no penalty)
 *   80-84% → ×2.0
 *   85-89% → ×2.5
 *   90-94% → ×3.0
 *   95-99% → ×3.5
 *   100%+  → ×4.0
 */
export function getEncumbranceMultiplier(ch: any): number {
  if (!ch.carryWeight || !ch.maxCarryWeight || ch.maxCarryWeight <= 0) {
    return 1.0;
  }

  const pct = (ch.carryWeight / ch.maxCarryWeight) * 100;

  if (pct >= 100) return 4.0;
  if (pct >= 95)  return 3.5;
  if (pct >= 90)  return 3.0;
  if (pct >= 85)  return 2.5;
  if (pct >= 80)  return 2.0;
  return 1.0;
}

/**
 * Remove a character from a room's character list.
 */
export function charFromRoom(ch: any, room: Room): void {
  const idx = room.characters.indexOf(ch);
  if (idx !== -1) {
    room.characters.splice(idx, 1);
  }
  // Update area player count
  if (!ch.isNPC && room.area) {
    room.area.playerCount = Math.max(0, room.area.playerCount - 1);
  }
}

/**
 * Add a character to a room's character list.
 */
export function charToRoom(ch: any, room: Room): void {
  ch.inRoom = room;
  room.characters.push(ch);
  // Update area player count
  if (!ch.isNPC && room.area) {
    room.area.playerCount++;
  }
  // Update light level
  if (ch.lightCount && ch.lightCount > 0) {
    room.light++;
  }
}

/**
 * Move all followers of a character from their room.
 * Replicates the follower loop in legacy move_char().
 * Only followers who are standing and in the same room follow.
 */
export function moveFollowers(leader: any, fromRoom: Room, dir: number): void {
  if (!fromRoom.characters) return;

  // Copy the array to avoid modification during iteration
  const followers = [...fromRoom.characters].filter(
    (fch: any) =>
      fch.master === leader &&
      fch.position === Position.Standing &&
      fch.inRoom === fromRoom
  );

  for (const follower of followers) {
    // Skip if follower died or was extracted
    if (!follower.inRoom) continue;

    follower.send(`You follow ${leader.name}.\r\n`);
    moveChar(follower, dir, false);
  }
}

/**
 * Send a message to all characters in a room except the actor.
 * Uses act() string substitution for $n/$N tokens.
 */
function sendToRoom(room: Room, actor: any, message: string, target?: any): void {
  for (const ch of room.characters) {
    if (ch === actor) continue;
    if (ch.send) {
      let msg = message
        .replace(/\$n/g, actor.name ?? 'someone')
        .replace(/\$N/g, target?.name ?? 'someone');
      ch.send(msg + '\r\n');
    }
  }
}

/**
 * Fire movement-related MUDprog triggers.
 * - GREET_PROG on NPCs in the destination room.
 * - ENTRY_PROG on the moving character (if NPC).
 * - LEAVE_PROG on NPCs in the origin room.
 */
function fireMoveProgs(
  ch: any,
  fromRoom: Room,
  toRoom: Room,
  dir: number
): void {
  // GREET_PROG on mobs in destination room
  for (const mob of toRoom.characters) {
    if (mob === ch || !mob.isNPC) continue;
    if (mob.programs && mob.programs.length > 0) {
      for (const prog of mob.programs) {
        if (prog.trigger === 'greet_prog' || prog.trigger === 'all_greet_prog') {
          if (mob.fireProg) {
            mob.fireProg(prog, ch);
          }
        }
      }
    }
  }

  // ENTRY_PROG on the moving character (if NPC)
  if (ch.isNPC && ch.programs) {
    for (const prog of ch.programs) {
      if (prog.trigger === 'entry_prog') {
        if (ch.fireProg) {
          ch.fireProg(prog, ch);
        }
      }
    }
  }
}
```

**Directional command functions (registered in CommandRegistry):**

```typescript
// ─── Direction Commands ──────────────────────────────────────────────
// These are convenience wrappers registered as individual commands.
// Each calls moveChar() with the appropriate direction.

export function doNorth(ch: any, _argument: string): void {
  moveChar(ch, Direction.North);
}

export function doSouth(ch: any, _argument: string): void {
  moveChar(ch, Direction.South);
}

export function doEast(ch: any, _argument: string): void {
  moveChar(ch, Direction.East);
}

export function doWest(ch: any, _argument: string): void {
  moveChar(ch, Direction.West);
}

export function doUp(ch: any, _argument: string): void {
  moveChar(ch, Direction.Up);
}

export function doDown(ch: any, _argument: string): void {
  moveChar(ch, Direction.Down);
}
```

---

### 2. Door Handling — `doDoor()` and Door Commands

Add door operations to `src/game/commands/movement.ts`:

```typescript
// ─── Door Commands ───────────────────────────────────────────────────

/**
 * Core door operation handler.
 * Handles open, close, lock, unlock, and pick for doors.
 * Always updates both sides of the door (the exit and its
 * reverse in the destination room).
 *
 * Replicates legacy do_open/do_close/do_lock/do_unlock from act_move.c.
 *
 * @param ch        — Character performing the action.
 * @param argument  — Door name or direction keyword.
 * @param action    — 'open' | 'close' | 'lock' | 'unlock' | 'pick'
 */
export function doDoor(
  ch: any,
  argument: string,
  action: 'open' | 'close' | 'lock' | 'unlock' | 'pick'
): void {
  if (!ch || !ch.inRoom) return;
  if (!argument || argument.trim() === '') {
    ch.send(`${capitalize(action)} what?\r\n`);
    return;
  }

  const room: Room = ch.inRoom;
  const target = argument.trim().toLowerCase();

  // ── Find the exit by direction name or door keyword ──
  let exit: RoomExit | undefined;
  let direction: number = -1;

  // First try matching a direction name
  for (let d = 0; d < DIRECTION_NAMES.length; d++) {
    if (DIRECTION_NAMES[d]!.startsWith(target)) {
      const e = room.getExit(d);
      if (e && e.hasFlag(EX_ISDOOR)) {
        exit = e;
        direction = d;
        break;
      }
    }
  }

  // If not found by direction, try matching door keyword
  if (!exit) {
    for (const [d, e] of room.exits) {
      if (e.keyword && e.keyword.toLowerCase().includes(target) && e.hasFlag(EX_ISDOOR)) {
        exit = e;
        direction = d;
        break;
      }
    }
  }

  if (!exit) {
    // Check if the argument is a container object (handled elsewhere)
    // For now, just report not found
    ch.send(`You see no ${target} here.\r\n`);
    return;
  }

  const doorName = exit.keyword || 'door';

  // ── Execute the action ──
  switch (action) {
    case 'open':
      doorOpen(ch, exit, direction, doorName);
      break;
    case 'close':
      doorClose(ch, exit, direction, doorName);
      break;
    case 'lock':
      doorLock(ch, exit, direction, doorName);
      break;
    case 'unlock':
      doorUnlock(ch, exit, direction, doorName);
      break;
    case 'pick':
      doorPick(ch, exit, direction, doorName);
      break;
  }
}

/**
 * Open a door.
 * Check: not already open, not locked.
 * Update both sides of the door.
 */
function doorOpen(ch: any, exit: RoomExit, dir: number, doorName: string): void {
  if (!exit.hasFlag(EX_CLOSED)) {
    ch.send(`The ${doorName} is already open.\r\n`);
    return;
  }
  if (exit.hasFlag(EX_LOCKED)) {
    ch.send(`The ${doorName} is locked.\r\n`);
    return;
  }

  // Open the door
  exit.exitFlags &= ~EX_CLOSED;

  // Notify room
  ch.send(`You open the ${doorName}.\r\n`);
  sendToRoom(ch.inRoom, ch, `$n opens the ${doorName}.`);

  // Update reverse exit
  updateReverseExit(exit, dir, (revExit) => {
    revExit.exitFlags &= ~EX_CLOSED;
    // Notify the other room
    if (exit.toRoom) {
      for (const och of exit.toRoom.characters) {
        if (och.send) {
          och.send(`The ${revExit.keyword || 'door'} opens.\r\n`);
        }
      }
    }
  });
}

/**
 * Close a door.
 * Check: not already closed.
 * Update both sides.
 */
function doorClose(ch: any, exit: RoomExit, dir: number, doorName: string): void {
  if (exit.hasFlag(EX_CLOSED)) {
    ch.send(`The ${doorName} is already closed.\r\n`);
    return;
  }

  exit.exitFlags |= EX_CLOSED;

  ch.send(`You close the ${doorName}.\r\n`);
  sendToRoom(ch.inRoom, ch, `$n closes the ${doorName}.`);

  updateReverseExit(exit, dir, (revExit) => {
    revExit.exitFlags |= EX_CLOSED;
    if (exit.toRoom) {
      for (const och of exit.toRoom.characters) {
        if (och.send) {
          och.send(`The ${revExit.keyword || 'door'} closes.\r\n`);
        }
      }
    }
  });
}

/**
 * Lock a door.
 * Check: door is closed, character has the key.
 * Update both sides.
 */
function doorLock(ch: any, exit: RoomExit, dir: number, doorName: string): void {
  if (!exit.hasFlag(EX_CLOSED)) {
    ch.send(`The ${doorName} is not closed.\r\n`);
    return;
  }
  if (exit.hasFlag(EX_LOCKED)) {
    ch.send(`The ${doorName} is already locked.\r\n`);
    return;
  }
  if (!hasKey(ch, exit.key)) {
    ch.send('You lack the key.\r\n');
    return;
  }

  exit.exitFlags |= EX_LOCKED;

  ch.send(`*Click* You lock the ${doorName}.\r\n`);
  sendToRoom(ch.inRoom, ch, `$n locks the ${doorName}.`);

  updateReverseExit(exit, dir, (revExit) => {
    revExit.exitFlags |= EX_LOCKED;
  });
}

/**
 * Unlock a door.
 * Check: door is locked, character has the key.
 * Update both sides.
 */
function doorUnlock(ch: any, exit: RoomExit, dir: number, doorName: string): void {
  if (!exit.hasFlag(EX_CLOSED)) {
    ch.send(`The ${doorName} is not closed.\r\n`);
    return;
  }
  if (!exit.hasFlag(EX_LOCKED)) {
    ch.send(`The ${doorName} is already unlocked.\r\n`);
    return;
  }
  if (!hasKey(ch, exit.key)) {
    ch.send('You lack the key.\r\n');
    return;
  }

  exit.exitFlags &= ~EX_LOCKED;

  ch.send(`*Click* You unlock the ${doorName}.\r\n`);
  sendToRoom(ch.inRoom, ch, `$n unlocks the ${doorName}.`);

  updateReverseExit(exit, dir, (revExit) => {
    revExit.exitFlags &= ~EX_LOCKED;
  });
}

/**
 * Pick a lock on a door.
 * Skill check against gsn_pick_lock. EX_PICKPROOF blocks all attempts.
 * Update both sides on success.
 *
 * Replicates legacy do_pick() from act_move.c.
 */
function doorPick(ch: any, exit: RoomExit, dir: number, doorName: string): void {
  if (!exit.hasFlag(EX_CLOSED)) {
    ch.send(`The ${doorName} is not closed.\r\n`);
    return;
  }
  if (!exit.hasFlag(EX_LOCKED)) {
    ch.send(`The ${doorName} is already unlocked.\r\n`);
    return;
  }
  if (exit.hasFlag(EX_PICKPROOF)) {
    ch.send('You failed.\r\n');
    return;
  }

  // Skill check
  const pickSkill = ch.getSkillPercent ? ch.getSkillPercent('pick lock') : 0;
  if (pickSkill <= 0) {
    ch.send("You don't know how to pick locks.\r\n");
    return;
  }

  if (numberPercent() > pickSkill) {
    ch.send('You failed.\r\n');
    // Improve skill on failure
    if (ch.improveSkill) ch.improveSkill('pick lock');
    return;
  }

  exit.exitFlags &= ~EX_LOCKED;

  ch.send(`*Click* You pick the lock on the ${doorName}.\r\n`);
  sendToRoom(ch.inRoom, ch, `$n picks the lock on the ${doorName}.`);

  // Improve skill on success
  if (ch.improveSkill) ch.improveSkill('pick lock');

  updateReverseExit(exit, dir, (revExit) => {
    revExit.exitFlags &= ~EX_LOCKED;
  });
}

/**
 * Update the reverse exit in the destination room.
 * Ensures both sides of a door are always in sync.
 * Replicates legacy set_bexit_flag() / remove_bexit_flag().
 */
function updateReverseExit(
  exit: RoomExit,
  dir: number,
  callback: (revExit: RoomExit) => void
): void {
  if (!exit.toRoom) return;
  const reverseDir = REVERSE_DIRECTION[dir];
  if (reverseDir === undefined) return;
  const revExit = exit.toRoom.getExit(reverseDir);
  if (revExit && revExit.toRoom) {
    callback(revExit);
  }
}

/**
 * Check if character possesses a key object by vnum.
 * Searches both inventory and equipment.
 * Replicates legacy has_key() from act_move.c.
 */
export function hasKey(ch: any, keyVnum: number): boolean {
  if (keyVnum <= 0) return false;

  // Check inventory
  if (ch.inventory) {
    for (const obj of ch.inventory) {
      if (obj.vnum === keyVnum) return true;
    }
  }

  // Check equipment
  if (ch.equipment) {
    for (const [, obj] of ch.equipment) {
      if (obj.vnum === keyVnum) return true;
    }
  }

  return false;
}

/**
 * Capitalize first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Door Command Wrappers ───────────────────────────────────────────
// Registered in CommandRegistry.

export function doOpen(ch: any, argument: string): void {
  doDoor(ch, argument, 'open');
}

export function doClose(ch: any, argument: string): void {
  doDoor(ch, argument, 'close');
}

export function doLock(ch: any, argument: string): void {
  doDoor(ch, argument, 'lock');
}

export function doUnlock(ch: any, argument: string): void {
  doDoor(ch, argument, 'unlock');
}

export function doPick(ch: any, argument: string): void {
  doDoor(ch, argument, 'pick');
}
```

---

### 3. Special Movement Commands — Flee, Recall, Enter/Leave

Continue in `src/game/commands/movement.ts`:

```typescript
// ─── Flee ────────────────────────────────────────────────────────────

/**
 * Attempt to flee from combat.
 * Pick a random valid exit. 3 attempts.
 * On success: stop fighting, move, lose XP.
 * On failure: "PANIC! You couldn't escape!"
 *
 * Replicates legacy do_flee() from act_move.c.
 */
export function doFlee(ch: any, _argument: string): void {
  if (!ch || !ch.inRoom) return;

  if (!ch.fighting) {
    ch.send("You aren't fighting anyone.\r\n");
    return;
  }

  const room: Room = ch.inRoom;
  const exitDirs = Array.from(room.exits.keys()).filter(d => {
    const e = room.exits.get(d)!;
    return e.toRoom && !e.hasFlag(EX_CLOSED);
  });

  if (exitDirs.length === 0) {
    ch.send('PANIC! You couldn\'t escape!\r\n');
    return;
  }

  // 3 attempts to find a valid exit
  let fled = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const randomIdx = numberRange(0, exitDirs.length - 1);
    const dir = exitDirs[randomIdx]!;

    // Attempt the move
    if (moveChar(ch, dir, true)) {
      fled = true;

      // XP loss
      const xpLoss = numberRange(ch.level * 5, ch.level * 25);
      if (ch.experience !== undefined) {
        ch.experience = Math.max(0, ch.experience - xpLoss);
      }
      ch.send(`You flee head over heels! You lost ${xpLoss} experience.\r\n`);

      // Stop fighting
      if (ch.stopFighting) {
        ch.stopFighting(true);
      } else if (ch.fighting) {
        ch.fighting = null;
        ch.position = Position.Standing;
      }

      break;
    }
  }

  if (!fled) {
    ch.send('PANIC! You couldn\'t escape!\r\n');
  }
}

// ─── Recall ──────────────────────────────────────────────────────────

/**
 * Recall to the character's recall room (race hometown or clan recall).
 * Costs half current move points.
 * Cannot recall while fighting unless below 50% HP.
 *
 * Replicates legacy do_recall() from act_move.c.
 */
export function doRecall(ch: any, _argument: string): void {
  if (!ch || !ch.inRoom) return;

  // Determine recall room vnum
  // Priority: clan recall > race recall > default (3001)
  let recallVnum = 3001; // Default: Temple of Midgaard
  if (ch.clan && ch.clan.recall && ch.clan.recall > 0) {
    recallVnum = ch.clan.recall;
  } else if (ch.raceRecall && ch.raceRecall > 0) {
    recallVnum = ch.raceRecall;
  } else if (ch.pcData && ch.pcData.recall > 0) {
    recallVnum = ch.pcData.recall;
  }

  const recallRoom = ch.vnumRegistry?.getRoom(recallVnum);
  if (!recallRoom) {
    ch.send('You are completely lost.\r\n');
    return;
  }

  if (ch.inRoom === recallRoom) {
    ch.send('You are already there!\r\n');
    return;
  }

  // No recall flag on room
  if (ch.inRoom.hasFlag(ROOM_NO_RECALL)) {
    ch.send('Something prevents you from recalling.\r\n');
    return;
  }

  // Fighting check
  if (ch.fighting) {
    const hpPercent = (ch.hit / Math.max(1, ch.maxHit)) * 100;
    if (hpPercent >= 50) {
      ch.send('You are too busy fighting to recall!\r\n');
      return;
    }
    // Allow recall below 50% HP but stop fighting
    if (ch.stopFighting) {
      ch.stopFighting(true);
    }
  }

  // Movement cost: half current move
  const moveCost = Math.floor(ch.move / 2);
  ch.move -= moveCost;

  // Departure
  sendToRoom(ch.inRoom, ch, '$n prays for transportation!');
  const fromRoom = ch.inRoom;

  charFromRoom(ch, ch.inRoom);
  charToRoom(ch, recallRoom);

  // Arrival
  sendToRoom(recallRoom, ch, '$n appears in the room.');
  ch.send('You pray to the gods for transportation!\r\n');

  // Auto-look
  if (ch.doLook) {
    ch.doLook(ch, 'auto');
  }

  // Events
  if (ch.eventBus) {
    ch.eventBus.emit(GameEvent.CharacterLeaveRoom ?? 'character:leave_room', {
      character: ch, fromRoom, direction: -1,
    });
    ch.eventBus.emit(GameEvent.CharacterEnterRoom ?? 'character:enter_room', {
      character: ch, toRoom: recallRoom, fromRoom, direction: -1,
    });
  }
}

// ─── Enter / Leave (Portals) ─────────────────────────────────────────

/**
 * Enter a portal object or named room transition.
 *
 * Portals are objects with item type ITEM_PORTAL (27).
 * value[0] = charges (-1 = unlimited)
 * value[1] = exit flags
 * value[2] = portal flags
 * value[3] = destination room vnum
 *
 * Replicates legacy do_enter() from act_move.c.
 */
export function doEnter(ch: any, argument: string): void {
  if (!ch || !ch.inRoom) return;
  const arg = argument.trim();

  if (!arg) {
    ch.send('Enter what?\r\n');
    return;
  }

  // Find portal object in room
  const room: Room = ch.inRoom;
  const portal = room.contents?.find(
    (obj: any) => obj.itemType === 27 && // ITEM_PORTAL
      (obj.name?.toLowerCase().includes(arg.toLowerCase()) ||
       obj.keywords?.some((k: string) => k.toLowerCase().startsWith(arg.toLowerCase())))
  );

  if (!portal) {
    ch.send(`You don't see any ${arg} here.\r\n`);
    return;
  }

  const destVnum = portal.values?.[3] ?? 0;
  const destRoom = ch.vnumRegistry?.getRoom(destVnum);
  if (!destRoom) {
    ch.send('The portal leads nowhere...\r\n');
    return;
  }

  // Check charges
  if (portal.values[0] !== -1) {
    portal.values[0]--;
    if (portal.values[0] <= 0) {
      // Portal crumbles
      ch.send('The portal crumbles into dust as you pass through.\r\n');
      const idx = room.contents.indexOf(portal);
      if (idx !== -1) room.contents.splice(idx, 1);
    }
  }

  // Move through portal
  const fromRoom = ch.inRoom;
  ch.send(`You enter ${portal.shortDescription ?? 'a portal'}.\r\n`);
  sendToRoom(fromRoom, ch, `$n enters ${portal.shortDescription ?? 'a portal'}.`);

  charFromRoom(ch, fromRoom);
  charToRoom(ch, destRoom);

  sendToRoom(destRoom, ch, '$n steps out of a portal.');

  if (ch.doLook) {
    ch.doLook(ch, 'auto');
  }

  // Events
  if (ch.eventBus) {
    ch.eventBus.emit(GameEvent.CharacterEnterRoom ?? 'character:enter_room', {
      character: ch, toRoom: destRoom, fromRoom, direction: -1,
    });
  }

  // Followers follow through portal
  if (fromRoom.characters) {
    const followers = [...fromRoom.characters].filter(
      (fch: any) => fch.master === ch && fch.position === Position.Standing
    );
    for (const follower of followers) {
      if (!follower.inRoom) continue;
      follower.send(`You follow ${ch.name} through the portal.\r\n`);
      doEnter(follower, arg);
    }
  }
}

/**
 * Leave a building, vehicle, or portal.
 * Looks for an exit with the EX_PASSAGE flag or simply
 * moves the character outside if they're in a "nested" room.
 *
 * Replicates legacy do_leave() from act_move.c.
 */
export function doLeave(ch: any, _argument: string): void {
  if (!ch || !ch.inRoom) return;

  // If the room is indoors, look for an exit leading outdoors
  if (ch.inRoom.hasFlag(ROOM_INDOORS)) {
    for (const [dir, exit] of ch.inRoom.exits) {
      if (exit.toRoom && !exit.toRoom.hasFlag(ROOM_INDOORS)) {
        moveChar(ch, dir);
        return;
      }
    }
    ch.send("You see no obvious way out.\r\n");
    return;
  }

  ch.send("You aren't in a building.\r\n");
}
```

---

### 4. `src/game/world/RoomManager.ts` — Room Utilities (Additions)

Extend the existing `RoomManager` with movement-related utility functions:

```typescript
// Additions to src/game/world/RoomManager.ts

/**
 * Get the direction name string for a direction number.
 * Returns 'somewhere' for invalid directions.
 *
 * Replicates legacy dir_name[] from act_move.c.
 */
export function directionName(dir: number): string {
  return DIRECTION_NAMES[dir] ?? 'somewhere';
}

/**
 * Get the reverse of a direction.
 * North ↔ South, East ↔ West, Up ↔ Down.
 *
 * Replicates legacy rev_dir[] from act_move.c.
 */
export function reverseDirection(dir: number): number {
  return REVERSE_DIRECTION[dir] ?? dir;
}

/**
 * Parse a direction string into a Direction enum value.
 * Supports abbreviations: "n" → North, "nw" → invalid (only cardinal + up/down).
 * Returns -1 if the string is not a valid direction.
 */
export function parseDirection(str: string): number {
  const lower = str.toLowerCase().trim();
  for (let d = 0; d < DIRECTION_NAMES.length; d++) {
    if (DIRECTION_NAMES[d]!.startsWith(lower) && lower.length > 0) {
      return d;
    }
  }
  return -1;
}

/**
 * Find a path from one room to another using BFS.
 * Returns an array of direction numbers representing the shortest path,
 * or null if no path exists within the distance limit.
 *
 * @param from     — Starting room.
 * @param to       — Target room.
 * @param maxDist  — Maximum search depth (default 100).
 * @param throughDoors — Whether to consider closed doors as passable.
 * @returns Array of direction numbers, or null.
 *
 * Replicates legacy find_first_step() from track.c.
 */
export function findPath(
  from: Room,
  to: Room,
  maxDist: number = 100,
  throughDoors: boolean = false
): number[] | null {
  if (from === to) return [];

  interface BfsNode {
    room: Room;
    path: number[];
  }

  const visited = new Set<number>();
  const queue: BfsNode[] = [{ room: from, path: [] }];
  visited.add(from.vnum);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.path.length >= maxDist) continue;

    for (const [dir, exit] of current.room.exits) {
      if (!exit.toRoom) continue;
      if (visited.has(exit.toRoom.vnum)) continue;

      // Skip closed doors unless throughDoors is set
      if (exit.hasFlag(EX_CLOSED) && !throughDoors) continue;

      const newPath = [...current.path, dir];

      if (exit.toRoom === to) {
        return newPath;
      }

      visited.add(exit.toRoom.vnum);
      queue.push({ room: exit.toRoom, path: newPath });
    }
  }

  return null; // No path found
}

/**
 * Check if a room has available capacity for another character.
 * Accounts for tunnel limits, private, and solitary flags.
 */
export function isRoomFull(room: Room): boolean {
  if (room.hasFlag(ROOM_SOLITARY) && room.characters.length >= 1) return true;
  if (room.hasFlag(ROOM_PRIVATE) && room.characters.length >= 2) return true;
  if (room.tunnel > 0 && room.characters.length >= room.tunnel) return true;
  return false;
}

/**
 * Count the number of player characters in a room.
 */
export function getRoomPlayerCount(room: Room): number {
  return room.characters.filter((ch: any) => !ch.isNPC).length;
}

/**
 * Get all valid exits from a room for display purposes.
 * Optionally includes secret/hidden exits based on detection.
 *
 * @param room          — The room to examine.
 * @param detectHidden  — Whether the viewer can see hidden exits.
 * @returns Array of { direction, exit, isSecret } objects.
 */
export function getVisibleExits(
  room: Room,
  detectHidden: boolean = false
): Array<{ direction: number; exit: RoomExit; isSecret: boolean }> {
  const visible: Array<{ direction: number; exit: RoomExit; isSecret: boolean }> = [];

  for (const [dir, exit] of room.exits) {
    if (!exit.toRoom) continue;

    const isSecret = exit.hasFlag(EX_SECRET) || exit.hasFlag(EX_HIDDEN);
    if (isSecret && !detectHidden) continue;

    visible.push({ direction: dir, exit, isSecret });
  }

  return visible;
}
```

---

### 5. Command Registration

Register all movement commands in the CommandRegistry. Add to the boot sequence in `src/main.ts` or in a dedicated command registration file:

```typescript
// Movement command registrations
// These should be registered in CommandRegistry during boot.

import { CommandRegistry, CommandEntry, LOG_NORMAL } from './CommandRegistry.js';
import {
  doNorth, doSouth, doEast, doWest, doUp, doDown,
  doOpen, doClose, doLock, doUnlock, doPick,
  doFlee, doRecall, doEnter, doLeave,
  Position,
} from './movement.js';

export function registerMovementCommands(registry: CommandRegistry): void {
  // Direction commands — highest priority (single-letter abbreviation)
  registry.registerCommand({
    name: 'north',    doFun: doNorth,    position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'south',    doFun: doSouth,    position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'east',     doFun: doEast,     position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'west',     doFun: doWest,     position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'up',       doFun: doUp,       position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'down',     doFun: doDown,     position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });

  // Door commands
  registry.registerCommand({
    name: 'open',     doFun: doOpen,     position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'close',    doFun: doClose,    position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'lock',     doFun: doLock,     position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'unlock',   doFun: doUnlock,   position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'pick',     doFun: doPick,     position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });

  // Special movement
  registry.registerCommand({
    name: 'flee',     doFun: doFlee,     position: Position.Fighting,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'recall',   doFun: doRecall,   position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'enter',    doFun: doEnter,    position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
  registry.registerCommand({
    name: 'leave',    doFun: doLeave,    position: Position.Standing,
    level: 0,         log: LOG_NORMAL,   flags: 0,
  });
}
```

---

## Tests for Sub-Phase 3F

- `tests/unit/commands/movement.test.ts` — Movement system unit tests:
  - **`moveChar()` basic movement:**
    - Create 2 rooms connected by a north/south exit. Move character north. Verify character is in room 2, room 1 no longer contains character.
    - Verify movement cost is deducted from `ch.move`.
    - Verify auto-look is triggered (mock `doLook`).
  - **Sector-based movement costs:**
    - Test `calculateMovementCost()` for each sector type.
    - SectorType.Inside = 1, City = 2, Mountain = 6, Air = 10.
    - Flying characters always pay 1.
    - Floating characters always pay 1.
  - **Encumbrance:**
    - Test `getEncumbranceMultiplier()` at various carry weight percentages.
    - 50% → ×1.0, 80% → ×2.0, 90% → ×3.0, 100% → ×4.0.
    - Verify total cost: Mountain (6) × encumbrance (×2.0 at 80%) = 12.
  - **Closed door blocking:**
    - Create rooms with a closed door. Attempt to move. Verify "The door is closed." message.
    - Verify secret/hidden doors show "Alas, you cannot go that way." instead of door name.
  - **PASS_DOOR affect:**
    - Character with AFF_PASS_DOOR can move through closed doors.
    - Character with AFF_PASS_DOOR is blocked by EX_NOPASSDOOR.
  - **Room flag blocking:**
    - ROOM_PRIVATE blocks when 2 characters already present.
    - ROOM_SOLITARY blocks when 1 character already present.
    - ROOM_NO_MOB blocks NPCs but allows players.
    - Tunnel limit blocks when at capacity.
  - **Flight requirements:**
    - Movement to SECT_AIR room requires AFF_FLYING.
    - EX_FLY exit requires AFF_FLYING.
    - Water (no swim) requires boat or AFF_FLYING.
  - **Position checks:**
    - Sleeping character cannot move.
    - Fighting character gets "Use flee" message.
    - Resting character gets "too relaxed" message.
  - **Death trap:**
    - Moving into ROOM_DEATH triggers death handler.
    - Verify death handler is called.
  - **Insufficient movement:**
    - Character with 0 move points gets "too exhausted" message.
    - Mount movement: deducted from mount, not rider.
  - **Follower movement:**
    - Set follower.master = leader. Move leader. Verify follower also moved.
    - Followers who are sleeping/resting do NOT follow.
    - Followers in a different room do NOT follow.
  - **`charFromRoom()` / `charToRoom()`:**
    - Verify character is removed from old room's list.
    - Verify character is added to new room's list.
    - Verify `ch.inRoom` is updated.
    - Verify area player count is updated for player characters.

- `tests/unit/commands/doors.test.ts` — Door handling tests:
  - **Open/Close:**
    - Open a closed door. Verify exit flags cleared. Verify reverse exit also opened.
    - Close an open door. Verify both sides.
    - Attempt to open an already-open door. Verify error message.
    - Attempt to open a locked door. Verify "locked" message.
  - **Lock/Unlock:**
    - Unlock a locked door with the correct key. Verify both sides unlocked.
    - Attempt to unlock without key. Verify "You lack the key." message.
    - Lock an unlocked, closed door. Verify both sides locked.
    - Attempt to lock an already-locked door. Verify error message.
  - **Pick:**
    - Pick a locked door with sufficient skill. Verify unlocked.
    - Fail pick attempt when skill check fails (mock `numberPercent`).
    - Attempt to pick a PICKPROOF door. Verify failure.
    - Attempt to pick without the skill. Verify "don't know how" message.
  - **`hasKey()`:**
    - Key in inventory returns true.
    - Key in equipment returns true.
    - No key returns false.
  - **Door finding:**
    - Find door by direction abbreviation ("n" finds north door).
    - Find door by keyword ("gate" matches exit with keyword "gate").
    - No door found shows error message.

- `tests/unit/commands/flee.test.ts` — Flee tests:
  - Flee picks a random exit and moves the character.
  - XP is deducted (between level×5 and level×25).
  - Fighting state is cleared after successful flee.
  - Failed flee after 3 attempts shows "PANIC!" message.
  - Cannot flee if not fighting.

- `tests/unit/commands/recall.test.ts` — Recall tests:
  - Recall moves to default room 3001.
  - Clan recall overrides default.
  - Move cost is half current move.
  - ROOM_NO_RECALL blocks recall.
  - Cannot recall while fighting at ≥50% HP.
  - Can recall while fighting at <50% HP.

- `tests/unit/commands/enter.test.ts` — Portal tests:
  - Enter a portal object. Character moves to destination room.
  - Portal with limited charges decrements.
  - Portal with 0 charges crumbles.
  - Followers follow through portal.

- `tests/unit/world/RoomManager.test.ts` — Room utility tests (additions):
  - `findPath()` returns shortest path between rooms.
  - `findPath()` returns null when no path exists.
  - `findPath()` respects maxDist limit.
  - `parseDirection()` handles abbreviations.
  - `isRoomFull()` checks all capacity constraints.
  - `getVisibleExits()` hides secret exits, shows them with detectHidden.

- `tests/integration/MovementFlow.test.ts` — Integration test:
  - Load the test area (from Phase 3D/3E). Place a character in room 3001.
  - Move north (to 3002), verify position.
  - Move south back (to 3001), verify.
  - Open the north door in room 3001, move north, verify.
  - Lock the door with the key (give janitor's key to player), verify both sides locked.
  - Walk a complete circuit: temple → town square → east road → back.
  - Verify movement points are correctly decremented for each sector type.

---

## Acceptance Criteria

- [ ] `north` moves the player to the room connected by the north exit and deducts movement points.
- [ ] Moving south from room 3002 returns to room 3001 (bidirectional exits work).
- [ ] Movement cost for Inside sector is 1, City is 2, Mountain is 6, Air is 10.
- [ ] Flying characters (`AFF_FLYING`) always pay 1 movement point regardless of terrain.
- [ ] Encumbrance at 80% carry weight doubles the movement cost.
- [ ] Moving into a room with a closed door shows "The {doorName} is closed."
- [ ] Secret/hidden closed doors show "Alas, you cannot go that way." (no door name revealed).
- [ ] Character with `AFF_PASS_DOOR` can move through closed (but not `EX_NOPASSDOOR`) doors.
- [ ] `open north` opens the door and updates the reverse exit in the destination room.
- [ ] `close door` / `lock door` / `unlock door` all update both sides of the door.
- [ ] `lock` requires the correct key object in inventory or equipment.
- [ ] `pick` performs a skill check and respects `EX_PICKPROOF`.
- [ ] `ROOM_PRIVATE` limits entry to 2 characters; `ROOM_SOLITARY` limits to 1.
- [ ] `ROOM_NO_MOB` blocks NPC movement but allows players.
- [ ] `ROOM_DEATH` kills the character upon entry (death trap).
- [ ] `ROOM_TUNNEL` enforces the `tunnel` field as max occupancy.
- [ ] Sector `SECT_AIR` and `EX_FLY` exits require `AFF_FLYING`.
- [ ] Water (no swim) sectors require a boat object or `AFF_FLYING`.
- [ ] Sleeping/resting/stunned characters cannot move (appropriate messages displayed).
- [ ] Fighting characters are told to use "flee" instead of moving normally.
- [ ] `flee` picks a random valid exit, moves the character, deducts XP, and stops fighting.
- [ ] `flee` fails after 3 attempts if all attempts fail (bad luck or no exits).
- [ ] `recall` teleports to room 3001 (or clan recall), costs half current movement.
- [ ] `recall` is blocked by `ROOM_NO_RECALL` flag.
- [ ] `recall` during combat requires HP < 50%.
- [ ] `enter portal` moves through a portal object to its destination room.
- [ ] Portal charges decrement; portal crumbles at 0 charges.
- [ ] Followers automatically follow their master when master moves.
- [ ] Followers who are sleeping/resting/in different rooms do NOT follow.
- [ ] Mount movement deducts from mount's move pool, not rider's.
- [ ] Departure/arrival messages are sent to both rooms.
- [ ] Sneaking characters (`AFF_SNEAK`) produce no departure/arrival messages.
- [ ] `GameEvent.CharacterLeaveRoom` and `GameEvent.CharacterEnterRoom` events are emitted.
- [ ] GREET_PROG triggers fire on NPCs in the destination room.
- [ ] Area player count is updated when players move between areas.
- [ ] `findPath()` returns the shortest BFS path between two rooms.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
