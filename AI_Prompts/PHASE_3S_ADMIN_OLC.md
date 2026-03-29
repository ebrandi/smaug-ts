# SMAUG 2.0 TypeScript Port — Phase 3S: Admin Commands, Immortal Toolkit, Ban System, and Online Creation (OLC) — Room, Mobile, Object, Area, and MUDprog Editors

> **Project:** SMAUG 2.0 MUD engine port from ~200,000 lines of C to Node.js/TypeScript.
>
> **Context:** Phases 1 and 2 have scaffolded the full project structure, installed all dependencies, created stub files with JSDoc headers, configured the build toolchain (TypeScript strict mode, Vitest, ESLint, Prisma), and wired up the core engine skeleton (GameLoop, TickEngine, EventBus, ConnectionManager, Telnet/WebSocket listeners, entity base classes, CommandRegistry with dispatch pipeline, admin module stubs, Prisma schema, and example world JSON). All stub files exist but contain only interfaces, type definitions, and empty method bodies. Phase 3 fills in every method body with working game logic.
>
> **Your role:** You are an expert TypeScript/Node.js engineer with deep knowledge of MUD engine architecture. You have access to five reference documents that describe the legacy C codebase in exhaustive detail:
> - `ARCHITECTURE.md` — Full TypeScript architecture with code samples for every subsystem
> - `ANALYSIS.md` — Line-by-line analysis of the legacy C source (200k lines)
> - `DATAMODEL.md` — Complete data structure inventory from `mud.h`
> - `COMMANDS.md` — Full command table with trust levels, positions, and flags
> - `STRUCTURE.md` — File inventory and subsystem grouping

## Cardinal Rules (apply to ALL code you produce)

1. **Preserve legacy gameplay exactly.** Every formula, threshold, constant, and order-of-operations must match the C original. When the architecture doc says "replicates legacy X", implement it verbatim.
2. **Use the scaffolded file paths.** Do not create new files or rename existing ones. Every file referenced below already exists as a stub.
3. **Follow the TypeScript patterns established in ARCHITECTURE.md.** Use the exact class names, method signatures, enum values, and interface shapes defined there.
4. **Emit EventBus events** at every documented hook point (combat start/end, room enter/leave, death, level gain, etc.) so that downstream systems (MUDprogs, logging, admin dashboard) can subscribe.
5. **Write Vitest unit tests** for every pure function and critical method. Place tests in the `tests/` directory mirroring the `src/` structure. Aim for ≥80% coverage of game logic.
6. **Use `bigint` for bitvector flags** (`actFlags`, `affectedBy`, `immune`, `resistant`, `susceptible`) as defined in the `AFF`, `ACT`, `ROOM_FLAGS` constants.
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
│   ├── utils/              # AnsiColors, Dice, StringUtils, BitVector, Logger
│   └── migration/          # AreFileParser, PlayerFileParser, MigrationRunner
├── prisma/schema.prisma
├── world/                  # JSON world data files (one subdirectory per area)
├── tests/                  # Unit, integration, e2e tests
└── public/                 # Browser client and admin dashboard static files
```

## Prior Sub-Phases Completed

**Sub-Phases 3A–3R** are complete. The following files are fully implemented and may be imported:

### From Sub-Phase 3A (Utilities, World Loader, Command Parser)
- `src/utils/AnsiColors.ts`, `src/utils/Dice.ts`, `src/utils/BitVector.ts`, `src/utils/StringUtils.ts`
- `src/game/world/AreaManager.ts`, `src/game/world/VnumRegistry.ts`, `src/game/world/ResetEngine.ts`
- `src/game/commands/CommandRegistry.ts`, `src/game/commands/social.ts`
- `src/network/ConnectionManager.ts` — Full nanny state machine, output pager

### From Sub-Phase 3B (Movement, Look, Combat)
- `src/game/commands/movement.ts` — `moveChar()`, direction commands, door commands, `doRecall()`, `doFlee()`
- `src/game/commands/information.ts` — `doLook()`, `doExamine()`, `doScore()`, `doWho()`, `doHelp()`, `doAffects()`, `doEquipment()`, `doInventory()`, `doConsider()`
- `src/game/combat/CombatEngine.ts` — `violenceUpdate()`, `multiHit()`, `oneHit()`, `inflictDamage()`, `startCombat()`, `stopFighting()`
- `src/game/combat/DamageCalculator.ts`, `src/game/combat/DeathHandler.ts`
- `src/game/commands/combat.ts` — All combat skill commands
- `src/game/entities/Character.ts` — Regeneration, position update, char update

### From Sub-Phase 3C (Magic, Skills, Affects)
- `src/game/spells/SpellEngine.ts` — Full casting pipeline, `castSpell()`
- `src/game/spells/SpellRegistry.ts` — 40+ spell definitions
- `src/game/spells/SavingThrows.ts`, `src/game/spells/ComponentSystem.ts`
- `src/game/commands/magic.ts` — `doCast()`, `doBrandish()`, `doZap()`, `doQuaff()`, `doRecite()`, `doPractice()`
- `src/game/affects/AffectManager.ts` — `applyAffect()`, `removeAffect()`, `stripAffect()`, `affectUpdate()`
- `src/game/affects/AffectRegistry.ts`, `src/game/affects/StatModifier.ts`

### From Sub-Phase 3D (Inventory, Economy, Progression)
- `src/game/commands/objects.ts` — `doGet()`, `doDrop()`, `doPut()`, `doGive()`, `doWear()`, `doRemove()`, `doEat()`, `doDrink()`, `doSacrifice()`
- `src/game/economy/Currency.ts`, `src/game/economy/ShopSystem.ts`, `src/game/economy/AuctionSystem.ts`, `src/game/economy/BankSystem.ts`
- `src/game/entities/Player.ts` — `gainXp()`, `advanceLevel()`, `xpToNextLevel()`
- `src/game/entities/tables.ts` — Race and class tables

### From Sub-Phases 3E–3R (Perception, Communication, Social, Persistence, MUDprogs, etc.)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.
- `src/persistence/PlayerRepository.ts` — Full save/load via Prisma
- `src/persistence/WorldRepository.ts` — Area save, world state snapshots
- `src/scripting/MudProgEngine.ts` — Full MUDprog execution engine
- `src/scripting/IfcheckRegistry.ts` — 50+ ifcheck functions
- `src/scripting/ScriptParser.ts` — Trigger dispatcher
- `src/scripting/VariableSubstitution.ts` — `$n/$N/$i/$I/$t/$T` etc. expansion

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3S Objective

Implement the complete immortal/admin command set and the Online Creation (OLC) system. This sub-phase covers all in-game administration commands (teleportation, player management, world manipulation, system control, ban management, information), the trust level framework, and the full OLC suite for building and editing rooms, mobiles, objects, areas, and MUDprogs in real-time. After this sub-phase, immortals can fully administrate the game and builders can create/edit all world content through in-game commands. This replicates the legacy `act_wiz.c` (13,078 lines), `build.c` (11,286 lines), and `ibuild.c` (3,976 lines).

---

## Files to Implement

### 1. `src/game/commands/immortal.ts` — Immortal Command Set

Implement all immortal/admin commands. Replicates legacy `act_wiz.c`. Each command has a minimum trust level (from COMMANDS.md). Register all commands in the `CommandRegistry` with appropriate trust levels, minimum positions, and log flags.

#### 1.1 Trust Level Constants

```typescript
import { Player } from '../entities/Player';
import { Character } from '../entities/Character';
import { Mobile } from '../entities/Mobile';
import { GameObject } from '../entities/GameObject';
import { Room } from '../entities/Room';
import { Area } from '../entities/Area';
import { VnumRegistry } from '../world/VnumRegistry';
import { AreaManager } from '../world/AreaManager';
import { ConnectionManager, Descriptor } from '../../network/ConnectionManager';
import { CommandRegistry } from './CommandRegistry';
import { EventBus, GameEvent } from '../../core/EventBus';
import { Logger } from '../../utils/Logger';
import { BitVector } from '../../utils/BitVector';
import { StringUtils } from '../../utils/StringUtils';
import { AnsiColors } from '../../utils/AnsiColors';
import { PlayerRepository } from '../../persistence/PlayerRepository';
import { CombatEngine } from '../combat/CombatEngine';

/**
 * Trust level thresholds for immortal commands.
 * Replicates legacy LEVEL_* constants from mud.h.
 */
export const TRUST = {
  AVATAR:       50,
  NEOPHYTE:     51,
  ACOLYTE:      52,
  CREATOR:      53,
  SAVANT:       54,
  DEMI_GOD:     55,
  LESSER_GOD:   56,
  GOD:          57,
  GREATER_GOD:  58,
  ASCENDANT:    59,
  SUB_IMPLEM:   60,
  IMPLEMENTOR:  61,
  ETERNAL:      62,
  INFINITE:     63,
  SUPREME:      65,
} as const;
```

#### 1.2 Character Management Commands (Trust 51+)

##### `doAuthorize(ch, argument)`

Approve or deny pending new characters. Replicates legacy `do_authorize()`.

```typescript
/**
 * Approve or deny a pending new character.
 * Syntax: authorize <name> yes|no|immsim|mobsim|swear|plain|unpronu|deny
 *
 * Replicates legacy do_authorize() from act_wiz.c.
 *
 * auth_state progression:
 *   0 = created → 1 = name chosen → 2 = password set →
 *   3 = waiting for approval → 4 = authorized (normal play)
 *
 * Denial reasons map to DenialReason type:
 *   'immsim' — name too similar to immortal
 *   'mobsim' — name too similar to an NPC
 *   'swear'  — offensive name
 *   'plain'  — name too plain/common
 *   'unpronu' — name unpronounceable
 *   'deny'   — outright denial, force disconnect
 *
 * When denied with a reason (not 'deny'/'no'), auth_state resets to 2
 * and the player must re-choose their name. When denied with 'deny' or 'no',
 * the player is force-disconnected.
 */
export function doAuthorize(ch: Character, argument: string): void {
  const [name, rest] = StringUtils.oneArgument(argument);
  const [action] = StringUtils.oneArgument(rest);

  if (!name) {
    // List all pending authorizations
    let found = false;
    for (const desc of ConnectionManager.getInstance().getAllDescriptors()) {
      if (desc.character && desc.character.pcData?.authState === AuthState.WaitingApproval) {
        ch.sendToChar(`  ${desc.character.name} [${desc.host}]\r\n`);
        found = true;
      }
    }
    if (!found) {
      ch.sendToChar('No characters pending authorization.\r\n');
    }
    return;
  }

  // Find the pending character by name
  const target = ConnectionManager.getInstance().findCharacterByName(name);
  if (!target || !target.pcData || target.pcData.authState !== AuthState.WaitingApproval) {
    ch.sendToChar('No pending character by that name.\r\n');
    return;
  }

  if (!action) {
    ch.sendToChar('Authorize them how? yes/no/immsim/mobsim/swear/plain/unpronu/deny\r\n');
    return;
  }

  switch (action.toLowerCase()) {
    case 'yes':
      target.pcData.authState = AuthState.Authorized;
      target.sendToChar('You have been authorized to play. Enjoy the game!\r\n');
      ch.sendToChar(`${target.name} has been authorized.\r\n`);
      Logger.info('admin', `${ch.name} authorized ${target.name}`);
      EventBus.emit(GameEvent.AdminAction, {
        actor: ch.name, action: 'authorize', target: target.name, detail: 'approved',
      });
      break;

    case 'no':
    case 'deny':
      target.sendToChar('Your character has been denied. Disconnecting.\r\n');
      ch.sendToChar(`${target.name} has been denied and disconnected.\r\n`);
      Logger.info('admin', `${ch.name} denied ${target.name}`);
      if (target.descriptor) {
        target.descriptor.close();
      }
      break;

    case 'immsim':
    case 'mobsim':
    case 'swear':
    case 'plain':
    case 'unpronu':
      target.pcData.authState = AuthState.PasswordSet; // Reset to name selection
      target.pcData.denialReason = action.toLowerCase() as DenialReason;
      const DENIAL_MESSAGES: Record<DenialReason, string> = {
        immsim:  'Your name is too similar to an immortal\'s name.',
        mobsim:  'Your name is too similar to an existing NPC.',
        swear:   'Your name contains offensive language.',
        plain:   'Your name is too plain or common.',
        unpronu: 'Your name is unpronounceable.',
        deny:    'Your name has been denied.',
      };
      target.sendToChar(`${DENIAL_MESSAGES[action.toLowerCase() as DenialReason]} Please choose a new name.\r\n`);
      ch.sendToChar(`${target.name} has been denied (${action}). They must rechoose a name.\r\n`);
      Logger.info('admin', `${ch.name} denied ${target.name}: ${action}`);
      break;

    default:
      ch.sendToChar('Invalid option. Use: yes, no, immsim, mobsim, swear, plain, unpronu, deny.\r\n');
      break;
  }
}
```

##### `doFreeze(ch, argument)`

Toggle freeze flag on a player. Frozen players cannot execute any commands except `quit`. Replicates legacy `do_freeze()`.

```typescript
/**
 * Toggle freeze flag on a player.
 * Frozen players can only execute 'quit'. All other commands are blocked
 * in the command interpreter by checking PLR_FREEZE flag.
 *
 * Replicates legacy do_freeze() from act_wiz.c.
 * Trust check: cannot freeze players of equal or higher trust.
 */
export function doFreeze(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) {
    ch.sendToChar('Freeze whom?\r\n');
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  if (victim.isNPC()) {
    ch.sendToChar('Not on NPCs.\r\n');
    return;
  }

  if (victim.getTrust() >= ch.getTrust()) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  if (BitVector.isSet(victim.actFlags, PLR_FREEZE)) {
    victim.actFlags = BitVector.removeBit(victim.actFlags, PLR_FREEZE);
    victim.sendToChar('You can play again.\r\n');
    ch.sendToChar(`${victim.name} is now unfrozen.\r\n`);
    Logger.info('admin', `${ch.name} unfroze ${victim.name}`);
  } else {
    victim.actFlags = BitVector.setBit(victim.actFlags, PLR_FREEZE);
    victim.sendToChar('You are now frozen. Only \'quit\' is available.\r\n');
    ch.sendToChar(`${victim.name} is now frozen.\r\n`);
    Logger.info('admin', `${ch.name} froze ${victim.name}`);
  }

  PlayerRepository.save(victim as Player);
}
```

##### `doSilence(ch, argument)`

Toggle silence flag. Silenced players cannot use communication channels.

```typescript
/**
 * Toggle silence flag on a player.
 * Silenced players cannot use any communication channels (say, tell, chat, etc.).
 * Replicates legacy do_silence() from act_wiz.c.
 */
export function doSilence(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) {
    ch.sendToChar('Silence whom?\r\n');
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim || victim.isNPC()) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  if (victim.getTrust() >= ch.getTrust()) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  if (BitVector.isSet(victim.actFlags, PLR_SILENCE)) {
    victim.actFlags = BitVector.removeBit(victim.actFlags, PLR_SILENCE);
    victim.sendToChar('You can use channels again.\r\n');
    ch.sendToChar(`${victim.name} is no longer silenced.\r\n`);
  } else {
    victim.actFlags = BitVector.setBit(victim.actFlags, PLR_SILENCE);
    victim.sendToChar('You have been silenced!\r\n');
    ch.sendToChar(`${victim.name} is now silenced.\r\n`);
  }

  Logger.info('admin', `${ch.name} toggled silence on ${victim.name}`);
}
```

##### `doNoshout(ch, argument)` and `doNotell(ch, argument)`

```typescript
/**
 * Toggle noshout flag. Prevents target from using shout/yell.
 * Replicates legacy do_noshout().
 */
export function doNoshout(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) { ch.sendToChar('Noshout whom?\r\n'); return; }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim || victim.isNPC()) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (victim.getTrust() >= ch.getTrust()) { ch.sendToChar('You failed.\r\n'); return; }

  if (BitVector.isSet(victim.actFlags, PLR_NO_SHOUT)) {
    victim.actFlags = BitVector.removeBit(victim.actFlags, PLR_NO_SHOUT);
    victim.sendToChar('You can shout again.\r\n');
    ch.sendToChar(`${victim.name} can shout again.\r\n`);
  } else {
    victim.actFlags = BitVector.setBit(victim.actFlags, PLR_NO_SHOUT);
    victim.sendToChar('You can\'t shout!\r\n');
    ch.sendToChar(`${victim.name} can no longer shout.\r\n`);
  }
  Logger.info('admin', `${ch.name} toggled noshout on ${victim.name}`);
}

/**
 * Toggle notell flag. Prevents target from using tell/reply.
 * Replicates legacy do_notell().
 */
export function doNotell(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) { ch.sendToChar('Notell whom?\r\n'); return; }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim || victim.isNPC()) { ch.sendToChar('They aren\'t here.\r\n'); return; }
  if (victim.getTrust() >= ch.getTrust()) { ch.sendToChar('You failed.\r\n'); return; }

  if (BitVector.isSet(victim.actFlags, PLR_NO_TELL)) {
    victim.actFlags = BitVector.removeBit(victim.actFlags, PLR_NO_TELL);
    victim.sendToChar('You can use tells again.\r\n');
    ch.sendToChar(`${victim.name} can use tells again.\r\n`);
  } else {
    victim.actFlags = BitVector.setBit(victim.actFlags, PLR_NO_TELL);
    victim.sendToChar('You can\'t use tells!\r\n');
    ch.sendToChar(`${victim.name} can no longer use tells.\r\n`);
  }
  Logger.info('admin', `${ch.name} toggled notell on ${victim.name}`);
}
```

##### `doLog(ch, argument)`

```typescript
/**
 * Toggle command logging for a specific player.
 * When logging is active, all commands issued by the player are written
 * to the structured Logger with domain 'player-log'.
 * Replicates legacy do_log() from act_wiz.c.
 */
export function doLog(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) { ch.sendToChar('Log whom?\r\n'); return; }

  if (name.toLowerCase() === 'all') {
    // Toggle global logging
    globalLogAll = !globalLogAll;
    ch.sendToChar(`Log ALL is now ${globalLogAll ? 'ON' : 'OFF'}.\r\n`);
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim || victim.isNPC()) { ch.sendToChar('They aren\'t here.\r\n'); return; }

  if (BitVector.isSet(victim.actFlags, PLR_LOG)) {
    victim.actFlags = BitVector.removeBit(victim.actFlags, PLR_LOG);
    ch.sendToChar(`LOG removed from ${victim.name}.\r\n`);
  } else {
    victim.actFlags = BitVector.setBit(victim.actFlags, PLR_LOG);
    ch.sendToChar(`LOG set on ${victim.name}.\r\n`);
  }
  Logger.info('admin', `${ch.name} toggled logging on ${victim.name}`);
}

/** Global flag: when true, ALL player commands are logged. */
let globalLogAll = false;
export function isGlobalLogAll(): boolean { return globalLogAll; }
```

#### 1.3 Teleportation Commands (Trust 52+)

##### `doGoto(ch, argument)`

```typescript
/**
 * Teleport to a room by vnum, or to a player/mob by name.
 * Syntax: goto <vnum> | goto <player_name> | goto <mob_name>
 *
 * Replicates legacy do_goto() from act_wiz.c.
 *
 * Behavior:
 *   1. Display bamfout message to current room (custom or default).
 *   2. Remove character from current room.
 *   3. If argument is numeric, look up room by vnum in VnumRegistry.
 *   4. If argument is a name, search online players first, then visible mobs.
 *   5. Place character in target room.
 *   6. Display bamfin message to new room.
 *   7. Execute doLook() for the character.
 *
 * Bamfin/Bamfout: Custom messages stored in pcData.bamfin / pcData.bamfout.
 * Default bamfin: "$n appears in a swirling mist."
 * Default bamfout: "$n leaves in a swirling mist."
 *
 * Guards:
 *   - Cannot goto a room that doesn't exist.
 *   - Cannot goto if target has DND (Do Not Disturb) and ch.trust < target.trust.
 *   - Respects ROOM_PRIVATE / ROOM_SOLITARY for mortals (immortals bypass).
 */
export function doGoto(ch: Character, argument: string): void {
  const [arg] = StringUtils.oneArgument(argument);
  if (!arg) {
    ch.sendToChar('Goto where?\r\n');
    return;
  }

  let targetRoom: Room | null = null;

  // Try numeric vnum first
  const vnum = parseInt(arg, 10);
  if (!isNaN(vnum)) {
    targetRoom = VnumRegistry.getRoom(vnum) ?? null;
    if (!targetRoom) {
      ch.sendToChar(`No room with vnum ${vnum}.\r\n`);
      return;
    }
  } else {
    // Try to find a player by name
    const targetChar = ConnectionManager.getInstance().findCharacterByName(arg);
    if (targetChar && targetChar.inRoom) {
      // DND check
      if (!targetChar.isNPC() && targetChar.pcData &&
          BitVector.isSet(targetChar.actFlags, PCFLAG_DND) &&
          ch.getTrust() < targetChar.getTrust()) {
        ch.sendToChar('That player does not wish to be disturbed.\r\n');
        return;
      }
      targetRoom = targetChar.inRoom;
    } else {
      // Try mob search via VnumRegistry
      const mob = VnumRegistry.findMobileByName(arg);
      if (mob && mob.inRoom) {
        targetRoom = mob.inRoom;
      }
    }
  }

  if (!targetRoom) {
    ch.sendToChar('No such location.\r\n');
    return;
  }

  if (ch.fighting) {
    CombatEngine.stopFighting(ch, true);
  }

  // Bamfout message to current room
  if (ch.inRoom) {
    const bamfout = (ch as Player).pcData?.bamfout || `${ch.name} leaves in a swirling mist.`;
    for (const rch of ch.inRoom.characters) {
      if (rch !== ch && rch.canSee(ch)) {
        rch.sendToChar(`${bamfout}\r\n`);
      }
    }
    ch.inRoom.removeCharacter(ch);
  }

  // Move to target room
  targetRoom.addCharacter(ch);
  ch.inRoom = targetRoom;

  // Bamfin message to new room
  const bamfin = (ch as Player).pcData?.bamfin || `${ch.name} appears in a swirling mist.`;
  for (const rch of targetRoom.characters) {
    if (rch !== ch && rch.canSee(ch)) {
      rch.sendToChar(`${bamfin}\r\n`);
    }
  }

  ch.doLook('auto');
}
```

##### `doTransfer(ch, argument)`

```typescript
/**
 * Teleport one or all players to your room.
 * Syntax: transfer <name> [room_vnum] | transfer all
 *
 * Replicates legacy do_transfer() from act_wiz.c.
 *
 * 'transfer all' moves every online mortal player to ch's room.
 * 'transfer <name>' moves a single player to ch's room (or to room_vnum if specified).
 *
 * Behavior:
 *   1. Validate target exists and is connected.
 *   2. If target is in combat, stop fighting.
 *   3. Show arrival/departure messages.
 *   4. Move target to ch.inRoom (or specified room).
 *   5. Execute doLook() for the target.
 *   6. Emit GameEvent.AdminAction.
 */
export function doTransfer(ch: Character, argument: string): void {
  const [arg1, rest] = StringUtils.oneArgument(argument);
  const [arg2] = StringUtils.oneArgument(rest);

  if (!arg1) {
    ch.sendToChar('Transfer whom (and where)?\r\n');
    return;
  }

  const destinationRoom = arg2
    ? VnumRegistry.getRoom(parseInt(arg2, 10)) ?? ch.inRoom
    : ch.inRoom;

  if (!destinationRoom) {
    ch.sendToChar('Invalid destination.\r\n');
    return;
  }

  if (arg1.toLowerCase() === 'all') {
    for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
      const victim = desc.character;
      if (victim && victim !== ch && victim.inRoom && !victim.isNPC()) {
        transferOne(ch, victim, destinationRoom);
      }
    }
    ch.sendToChar('All players transferred.\r\n');
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(arg1);
  if (!victim) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  transferOne(ch, victim, destinationRoom);
  ch.sendToChar(`${victim.name} has been transferred.\r\n`);
}

function transferOne(ch: Character, victim: Character, destination: Room): void {
  if (victim.fighting) {
    CombatEngine.stopFighting(victim, true);
  }

  if (victim.inRoom) {
    victim.inRoom.sendToRoom(`${victim.name} disappears in a cloud of smoke.\r\n`, victim);
    victim.inRoom.removeCharacter(victim);
  }

  destination.addCharacter(victim);
  victim.inRoom = destination;
  victim.inRoom.sendToRoom(`${victim.name} arrives in a puff of smoke.\r\n`, victim);
  victim.doLook('auto');

  Logger.info('admin', `${ch.name} transferred ${victim.name} to room ${destination.vnum}`);
  EventBus.emit(GameEvent.AdminAction, {
    actor: ch.name, action: 'transfer', target: victim.name, detail: `room ${destination.vnum}`,
  });
}
```

##### `doAt(ch, argument)`

```typescript
/**
 * Execute a command at a remote location.
 * Syntax: at <vnum|player_name> <command>
 *
 * Replicates legacy do_at() from act_wiz.c.
 *
 * Behavior:
 *   1. Save ch's current room.
 *   2. Move ch to the target room (silently).
 *   3. Execute the command via CommandRegistry.interpret().
 *   4. Move ch back to the original room (silently).
 *
 * Guards:
 *   - Target room must exist.
 *   - Cannot use 'at' recursively (prevent 'at X at Y command').
 */
export function doAt(ch: Character, argument: string): void {
  const [arg, rest] = StringUtils.oneArgument(argument);
  if (!arg || !rest) {
    ch.sendToChar('At where what?\r\n');
    return;
  }

  let targetRoom: Room | null = null;
  const vnum = parseInt(arg, 10);
  if (!isNaN(vnum)) {
    targetRoom = VnumRegistry.getRoom(vnum) ?? null;
  } else {
    const victim = ConnectionManager.getInstance().findCharacterByName(arg);
    if (victim && victim.inRoom) {
      targetRoom = victim.inRoom;
    }
  }

  if (!targetRoom) {
    ch.sendToChar('No such location.\r\n');
    return;
  }

  const originalRoom = ch.inRoom;
  if (!originalRoom) return;

  // Silent move to target
  originalRoom.removeCharacter(ch);
  targetRoom.addCharacter(ch);
  ch.inRoom = targetRoom;

  // Execute command
  CommandRegistry.interpret(ch, rest.trim());

  // Silent return — character may have moved during command, only return if still in target
  if (ch.inRoom === targetRoom) {
    targetRoom.removeCharacter(ch);
    originalRoom.addCharacter(ch);
    ch.inRoom = originalRoom;
  }
}
```

##### `doBamfin(ch, argument)` and `doBamfout(ch, argument)`

```typescript
/**
 * Set custom arrival message for goto.
 * Syntax: bamfin <message>
 * If no argument, displays current bamfin.
 * Replicates legacy do_bamfin().
 */
export function doBamfin(ch: Character, argument: string): void {
  if (!ch.pcData) return;
  if (!argument.trim()) {
    ch.sendToChar(`Your bamfin is: ${ch.pcData.bamfin || '(default)'}\r\n`);
    return;
  }
  ch.pcData.bamfin = argument.trim();
  ch.sendToChar(`Bamfin set to: ${ch.pcData.bamfin}\r\n`);
}

/**
 * Set custom departure message for goto.
 * Syntax: bamfout <message>
 */
export function doBamfout(ch: Character, argument: string): void {
  if (!ch.pcData) return;
  if (!argument.trim()) {
    ch.sendToChar(`Your bamfout is: ${ch.pcData.bamfout || '(default)'}\r\n`);
    return;
  }
  ch.pcData.bamfout = argument.trim();
  ch.sendToChar(`Bamfout set to: ${ch.pcData.bamfout}\r\n`);
}
```

#### 1.4 World Manipulation Commands (Trust 53+)

##### `doPurge(ch, argument)`

```typescript
/**
 * Remove all NPCs and objects from the room, or a specific one.
 * Syntax: purge | purge <name>
 *
 * Replicates legacy do_purge() from act_wiz.c.
 *
 * Without argument: removes all NPCs and objects from the room.
 * With argument: removes a specific NPC or object by name.
 *
 * Guards:
 *   - Never purges player characters.
 *   - Does not purge NPCs that are switched (possessed by an immortal).
 *   - Extracts NPCs via Character.extract(), objects via GameObject.extract().
 */
export function doPurge(ch: Character, argument: string): void {
  const [arg] = StringUtils.oneArgument(argument);

  if (!ch.inRoom) return;

  if (!arg) {
    // Purge all NPCs and objects in the room
    const toExtractChars: Character[] = [];
    const toExtractObjs: GameObject[] = [];

    for (const rch of ch.inRoom.characters) {
      if (rch.isNPC() && rch !== ch && !rch.switched) {
        toExtractChars.push(rch);
      }
    }
    for (const obj of ch.inRoom.contents) {
      toExtractObjs.push(obj);
    }

    for (const rch of toExtractChars) { rch.extract(true); }
    for (const obj of toExtractObjs) { obj.extract(); }

    ch.sendToChar('Room purged.\r\n');
    ch.inRoom.sendToRoom('A divine wind sweeps through the room!\r\n', ch);
    Logger.info('admin', `${ch.name} purged room ${ch.inRoom.vnum}`);
    return;
  }

  // Purge specific target
  const victim = ch.inRoom.findCharByName(arg);
  if (victim) {
    if (!victim.isNPC()) {
      ch.sendToChar('You cannot purge player characters.\r\n');
      return;
    }
    if (victim.switched) {
      ch.sendToChar('That NPC is being possessed. Use \'return\' first.\r\n');
      return;
    }
    victim.extract(true);
    ch.sendToChar('Done.\r\n');
    return;
  }

  const obj = ch.inRoom.findObjByName(arg);
  if (obj) {
    obj.extract();
    ch.sendToChar('Done.\r\n');
    return;
  }

  ch.sendToChar('Nothing by that name here.\r\n');
}
```

##### `doLoad(ch, argument)` — Load mob or object by vnum

```typescript
/**
 * Load a mob or object by vnum into the room.
 * Syntax: mload <vnum> | oload <vnum> [level]
 *
 * Replicates legacy do_mload() and do_oload() from act_wiz.c.
 *
 * mload: Creates a runtime instance from the MobilePrototype and places it in ch.inRoom.
 * oload: Creates a runtime instance from the ObjectPrototype and places it in ch.inRoom
 *        or ch.inventory if the object is takeable.
 *
 * The prototype must exist in VnumRegistry. The instantiation uses the same
 * createMobileInstance() and createObjectInstance() functions from ResetEngine.
 */
export function doMload(ch: Character, argument: string): void {
  const [arg] = StringUtils.oneArgument(argument);
  if (!arg) {
    ch.sendToChar('Syntax: mload <vnum>\r\n');
    return;
  }

  const vnum = parseInt(arg, 10);
  if (isNaN(vnum)) {
    ch.sendToChar('That is not a number.\r\n');
    return;
  }

  const proto = VnumRegistry.getMobilePrototype(vnum);
  if (!proto) {
    ch.sendToChar(`No mobile has vnum ${vnum}.\r\n`);
    return;
  }

  if (!ch.inRoom) return;

  const mob = ResetEngine.createMobileInstance(proto);
  mob.inRoom = ch.inRoom;
  ch.inRoom.addCharacter(mob);

  ch.sendToChar(`You created ${mob.shortDescription}.\r\n`);
  ch.inRoom.sendToRoom(`${mob.shortDescription} suddenly appears.\r\n`, ch);
  Logger.info('admin', `${ch.name} mloaded vnum ${vnum}`);
}

export function doOload(ch: Character, argument: string): void {
  const [arg1, rest] = StringUtils.oneArgument(argument);
  const [arg2] = StringUtils.oneArgument(rest);

  if (!arg1) {
    ch.sendToChar('Syntax: oload <vnum> [level]\r\n');
    return;
  }

  const vnum = parseInt(arg1, 10);
  if (isNaN(vnum)) {
    ch.sendToChar('That is not a number.\r\n');
    return;
  }

  const proto = VnumRegistry.getObjectPrototype(vnum);
  if (!proto) {
    ch.sendToChar(`No object has vnum ${vnum}.\r\n`);
    return;
  }

  if (!ch.inRoom) return;

  const level = arg2 ? parseInt(arg2, 10) : ch.level;
  const obj = ResetEngine.createObjectInstance(proto, level);

  // If the object is takeable, put it in inventory; otherwise in room
  if (BitVector.isSet(obj.wearFlags, ITEM_TAKE)) {
    obj.carriedBy = ch;
    ch.addObject(obj);
  } else {
    obj.inRoom = ch.inRoom;
    ch.inRoom.addObject(obj);
  }

  ch.sendToChar(`You created ${obj.shortDescription}.\r\n`);
  Logger.info('admin', `${ch.name} oloaded vnum ${vnum}`);
}
```

##### `doSlay(ch, argument)`

```typescript
/**
 * Instantly kill a character. Bypasses all protections.
 * Syntax: slay <name>
 *
 * Replicates legacy do_slay() from act_wiz.c.
 * Cannot slay characters of equal or higher trust.
 * Triggers death handling via DeathHandler.handleDeath().
 */
export function doSlay(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) {
    ch.sendToChar('Slay whom?\r\n');
    return;
  }

  const victim = ch.inRoom?.findCharByName(name) ?? null;
  if (!victim) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  if (ch === victim) {
    ch.sendToChar('Suicide is a mortal sin.\r\n');
    return;
  }

  if (!victim.isNPC() && victim.getTrust() >= ch.getTrust()) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  ch.sendToChar('You slay them in cold blood!\r\n');
  victim.sendToChar(`${ch.name} slays you in cold blood!\r\n`);
  ch.inRoom?.sendToRoom(`${ch.name} slays ${victim.name} in cold blood!\r\n`, ch, victim);

  victim.hitPoints = -10;
  DeathHandler.handleDeath(victim, ch);
  Logger.info('admin', `${ch.name} slayed ${victim.name}`);
}
```

##### `doForce(ch, argument)`

```typescript
/**
 * Force a player or all players to execute a command.
 * Syntax: force <name|all> <command>
 *
 * Replicates legacy do_force() from act_wiz.c.
 *
 * Guards:
 *   - Cannot force characters of equal or higher trust.
 *   - Cannot force NPCs to execute admin commands.
 *   - 'force all' only affects players (not NPCs) of lower trust.
 *   - Logs the forced command.
 */
export function doForce(ch: Character, argument: string): void {
  const [arg, rest] = StringUtils.oneArgument(argument);
  if (!arg || !rest.trim()) {
    ch.sendToChar('Force whom to do what?\r\n');
    return;
  }

  if (arg.toLowerCase() === 'all') {
    for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
      const victim = desc.character;
      if (victim && victim !== ch && victim.getTrust() < ch.getTrust()) {
        CommandRegistry.interpret(victim, rest.trim());
      }
    }
    ch.sendToChar('Done.\r\n');
    Logger.info('admin', `${ch.name} forced all: ${rest.trim()}`);
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(arg)
    ?? ch.inRoom?.findCharByName(arg) ?? null;

  if (!victim) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  if (!victim.isNPC() && victim.getTrust() >= ch.getTrust()) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  victim.sendToChar(`${ch.name} forces you to '${rest.trim()}'.\r\n`);
  CommandRegistry.interpret(victim, rest.trim());
  ch.sendToChar('Done.\r\n');
  Logger.info('admin', `${ch.name} forced ${victim.name}: ${rest.trim()}`);
}
```

##### `doSnoop(ch, argument)`

```typescript
/**
 * See all input/output of another player's session.
 * Syntax: snoop <name> | snoop (to stop snooping)
 *
 * Replicates legacy do_snoop() from act_wiz.c.
 *
 * Behavior:
 *   1. If no argument, stop all active snoops.
 *   2. If snooping self, stop snooping.
 *   3. Otherwise, set descriptor.snoopBy to ch's descriptor.
 *   4. All output sent to the target's descriptor is also relayed to the snooper.
 *
 * Guards:
 *   - Cannot snoop characters of equal or higher trust.
 *   - Cannot create circular snoops (A snoops B who snoops A).
 *   - Respects min_snoop level setting.
 *   - Respects DND (Do Not Disturb) flag.
 *   - Notifies high-level immortals (>= IMPLEMENTOR) when someone is snooped.
 */
export function doSnoop(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);

  if (!name) {
    // Stop all snoops
    for (const desc of ConnectionManager.getInstance().getAllDescriptors()) {
      if (desc.snoopBy === ch.descriptor) {
        desc.snoopBy = null;
      }
    }
    ch.sendToChar('All snoops stopped.\r\n');
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim || !victim.descriptor) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  if (victim === ch) {
    // Stop snooping
    for (const desc of ConnectionManager.getInstance().getAllDescriptors()) {
      if (desc.snoopBy === ch.descriptor) {
        desc.snoopBy = null;
      }
    }
    ch.sendToChar('Snooping stopped.\r\n');
    return;
  }

  if (!victim.isNPC() && victim.getTrust() >= ch.getTrust()) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  // Circular snoop check
  let d: Descriptor | null = ch.descriptor;
  while (d) {
    if (d === victim.descriptor) {
      ch.sendToChar('No circular snoops allowed.\r\n');
      return;
    }
    d = d.snoopBy;
  }

  // DND check
  if (!victim.isNPC() && victim.pcData &&
      BitVector.isSet(victim.actFlags, PCFLAG_DND) &&
      ch.getTrust() < victim.getTrust()) {
    ch.sendToChar('That player does not wish to be disturbed.\r\n');
    return;
  }

  // Clear any existing snoop on victim
  if (victim.descriptor.snoopBy) {
    victim.descriptor.snoopBy.character?.sendToChar(
      'Your snoop has been overridden.\r\n'
    );
  }

  victim.descriptor.snoopBy = ch.descriptor ?? null;
  ch.sendToChar(`You are now snooping ${victim.name}.\r\n`);
  Logger.info('admin', `${ch.name} is snooping ${victim.name}`);

  // Notify high-level immortals
  for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
    if (desc.character && desc.character.getTrust() >= TRUST.IMPLEMENTOR && desc.character !== ch) {
      desc.character.sendToChar(
        `[WIZNET] ${ch.name} is snooping ${victim.name}.\r\n`
      );
    }
  }
}
```

##### `doSwitch(ch, argument)` and `doReturn(ch)`

```typescript
/**
 * Possess an NPC body. Commands execute as the NPC.
 * Syntax: switch <mob_name>
 *
 * Replicates legacy do_switch() from act_wiz.c.
 *
 * Behavior:
 *   1. Validate target is an NPC in the same room.
 *   2. Target must not already be switched/possessed.
 *   3. Set ch.descriptor.original to ch.
 *   4. Set ch.descriptor.character to the NPC.
 *   5. Set NPC.switched = ch.
 *   6. ch effectively "becomes" the NPC for command execution.
 *
 * Use 'return' to return to the original body.
 */
export function doSwitch(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) {
    ch.sendToChar('Switch into whom?\r\n');
    return;
  }

  if (!ch.descriptor) return;

  if (ch.descriptor.original) {
    ch.sendToChar('You are already switched. Use \'return\' first.\r\n');
    return;
  }

  const victim = ch.inRoom?.findCharByName(name) ?? null;
  if (!victim) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  if (!victim.isNPC()) {
    ch.sendToChar('You can only switch into NPCs.\r\n');
    return;
  }

  if (victim.switched) {
    ch.sendToChar('That NPC is already possessed.\r\n');
    return;
  }

  if (victim.descriptor) {
    ch.sendToChar('That NPC already has a descriptor.\r\n');
    return;
  }

  ch.descriptor.original = ch;
  ch.descriptor.character = victim;
  victim.descriptor = ch.descriptor;
  victim.switched = ch;

  ch.sendToChar(`You switch into ${victim.shortDescription}.\r\n`);
  Logger.info('admin', `${ch.name} switched into mob vnum ${(victim as Mobile).vnum}`);
}

/**
 * Return from switch/possess back to original body.
 * Replicates legacy do_return() from act_wiz.c.
 */
export function doReturn(ch: Character): void {
  if (!ch.descriptor || !ch.descriptor.original) {
    ch.sendToChar('You aren\'t switched.\r\n');
    return;
  }

  const original = ch.descriptor.original;

  ch.sendToChar('You return to your original body.\r\n');
  ch.switched = null;
  ch.descriptor.character = original;
  ch.descriptor.original = null;
  original.descriptor = ch.descriptor;
  ch.descriptor = null;

  Logger.info('admin', `${original.name} returned from switch`);
}
```

#### 1.5 System Administration Commands (Trust 58+)

##### `doReboot(ch)` and `doShutdown(ch, argument)`

```typescript
/**
 * Initiate server reboot. Saves all players and world state,
 * closes connections, and restarts the process.
 *
 * Replicates legacy do_reboot() from act_wiz.c.
 *
 * Behavior:
 *   1. Broadcast "Reboot by <name>. Stand by..." to all players.
 *   2. Save all online players via PlayerRepository.save().
 *   3. Save all modified areas via WorldRepository.saveAllAreas().
 *   4. Emit GameEvent.ServerReboot.
 *   5. Close all connections gracefully.
 *   6. Exit process with code 0 (supervisor restarts).
 *
 * Note: The legacy engine uses a typo check — 'reboo' warns but doesn't reboot.
 * We replicate this by requiring the full word.
 */
export function doReboot(ch: Character, argument: string): void {
  // Typo protection
  const cmd = argument.trim().toLowerCase();
  if (cmd === 'reboo') {
    ch.sendToChar('If you want to REBOOT, spell it out.\r\n');
    return;
  }

  ch.sendToChar('Reboot initiated.\r\n');
  Logger.info('admin', `REBOOT by ${ch.name}`);

  // Broadcast to all
  ConnectionManager.getInstance().broadcastToAll(
    `\r\nReboot by ${ch.name}. Please stand by...\r\n`
  );

  // Save all players
  for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
    if (desc.character && !desc.character.isNPC()) {
      PlayerRepository.save(desc.character as Player);
    }
  }

  // Save world state
  WorldRepository.saveAllAreas();
  WorldRepository.saveWorldState();

  EventBus.emit(GameEvent.ServerReboot, { actor: ch.name });

  // Close all connections
  ConnectionManager.getInstance().closeAll();

  // Exit — process manager should restart
  setTimeout(() => process.exit(0), 500);
}

/**
 * Shut down the server. Optionally skip saving.
 * Syntax: shutdown [nosave]
 *
 * Replicates legacy do_shutdown() from act_wiz.c.
 * Typo check: 'shutdow' warns but doesn't shutdown.
 */
export function doShutdown(ch: Character, argument: string): void {
  const arg = argument.trim().toLowerCase();

  if (arg === 'shutdow') {
    ch.sendToChar('If you want to SHUTDOWN, spell it out.\r\n');
    return;
  }

  const nosave = arg === 'nosave';

  ch.sendToChar('Shutdown initiated.\r\n');
  Logger.info('admin', `SHUTDOWN by ${ch.name}${nosave ? ' (nosave)' : ''}`);

  ConnectionManager.getInstance().broadcastToAll(
    `\r\nShutdown by ${ch.name}.${nosave ? '' : ' Saving...'}\r\n`
  );

  if (!nosave) {
    for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
      if (desc.character && !desc.character.isNPC()) {
        PlayerRepository.save(desc.character as Player);
      }
    }
    WorldRepository.saveAllAreas();
    WorldRepository.saveWorldState();
  }

  EventBus.emit(GameEvent.ServerShutdown, { actor: ch.name, nosave });
  ConnectionManager.getInstance().closeAll();

  setTimeout(() => process.exit(0), 500);
}
```

##### `doCopyover(ch)`

```typescript
/**
 * Hot reboot: save all player descriptors and re-exec the process.
 * Players remain connected and are recovered on the new process.
 *
 * Replicates legacy do_copyover() from act_wiz.c.
 *
 * Behavior:
 *   1. Save all players.
 *   2. Write a copyover descriptor file listing all connected file descriptors,
 *      host addresses, and player names.
 *   3. Save world state snapshot (.world_state.json).
 *   4. Send "Copyover in progress..." to all connected players.
 *   5. exec() the new process with the copyover descriptor file as an argument.
 *   6. On new process boot, read the copyover file, re-associate descriptors,
 *      load players, and resume play.
 *
 * Recovery is handled in main.ts boot sequence when --copyover flag is detected.
 */
export function doCopyover(ch: Character): void {
  Logger.info('admin', `COPYOVER by ${ch.name}`);

  // Save all players
  for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
    if (desc.character && !desc.character.isNPC()) {
      PlayerRepository.save(desc.character as Player);
    }
  }

  WorldRepository.saveWorldState();

  // Write copyover recovery file
  const recoveryData: CopyoverEntry[] = [];
  for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
    if (desc.character && desc.socket) {
      desc.character.sendToChar('\r\n *** Copyover in progress — please remain connected ***\r\n');
      recoveryData.push({
        fd: desc.socket.fd ?? -1,
        host: desc.host,
        playerName: desc.character.name,
      });
    }
  }

  const recoveryPath = path.join(process.cwd(), 'copyover.dat');
  fs.writeFileSync(recoveryPath, JSON.stringify(recoveryData));

  EventBus.emit(GameEvent.ServerCopyover, { actor: ch.name });

  // Re-exec: in production, this would use child_process.execSync or similar.
  // For the TypeScript port, we emit the event and let main.ts handle the restart.
  Logger.info('admin', `Copyover recovery file written with ${recoveryData.length} descriptors`);

  // The actual process re-exec depends on deployment:
  // process.execArgv... — left to main.ts integration
}

interface CopyoverEntry {
  fd: number;
  host: string;
  playerName: string;
}
```

##### `doSet(ch, argument)` — Universal property setter

```typescript
/**
 * Set player/mob/object/room properties.
 * Syntax: set <char|mob|obj|room> <name|vnum> <field> <value>
 *
 * Replicates legacy do_set() from act_wiz.c.
 * This is the most versatile admin command. Handles all entity field mutations.
 *
 * Examples:
 *   set char Bob level 50
 *   set char Bob hp 500
 *   set char Bob gold 10000
 *   set char Bob str 25
 *   set char Bob class mage
 *   set char Bob race elf
 *   set char Bob align -1000
 *   set char Bob practice 100
 *   set char Bob title "the Destroyer"
 *   set mob 3001 level 30
 *   set obj 3001 value0 5
 *   set room 3001 flags dark nomob
 *
 * Character fields supported:
 *   str, int, wis, dex, con, cha, lck — Attributes (capped 3–25)
 *   hp, maxhp, mana, maxmana, move, maxmove — Vitals
 *   level — Level (1–65, recalculates stats)
 *   gold, silver, copper — Currency
 *   align — Alignment (-1000 to 1000)
 *   thirst, full, drunk, bloodthirst — Conditions (-1 = exempt, 0-100)
 *   practice, train — Practice/training sessions
 *   hitroll, damroll — Combat bonuses
 *   armor — Base armor class
 *   name, title, description — Text fields
 *   sex — Sex (neutral/male/female)
 *   class — Character class
 *   race — Character race
 *   position — Position (standing, sitting, sleeping, etc.)
 *   trust — Trust level (0–65)
 *   favor — Deity favor
 *   quest, questnext — Quest points / cooldown
 *   mentalstate — Mental state (-100 to 100)
 *   password — Password (hashed with bcrypt)
 *   bamfin, bamfout — Goto messages
 *   rRangeLo, rRangeHi, mRangeLo, mRangeHi, oRangeLo, oRangeHi — OLC vnum ranges
 *
 * Object fields supported:
 *   value0-value5 — Type-specific values
 *   flags — Extra flags
 *   wear — Wear flags
 *   level, weight, cost, timer — Properties
 *   name, short, long — Text fields
 *
 * Room fields supported:
 *   flags — Room flags
 *   sector — Sector type
 *   name, desc — Text fields
 *   tunnel — Tunnel limit
 *   televnum, teledelay — Teleport settings
 */
export function doSet(ch: Character, argument: string): void {
  const [type, rest1] = StringUtils.oneArgument(argument);
  const [target, rest2] = StringUtils.oneArgument(rest1);
  const [field, rest3] = StringUtils.oneArgument(rest2);
  const value = rest3.trim();

  if (!type || !target || !field) {
    ch.sendToChar('Syntax: set <char|mob|obj|room> <name|vnum> <field> <value>\r\n');
    return;
  }

  switch (type.toLowerCase()) {
    case 'char':
    case 'mob':
      setCharacter(ch, target, field, value);
      break;
    case 'obj':
      setObject(ch, target, field, value);
      break;
    case 'room':
      setRoom(ch, target, field, value);
      break;
    default:
      ch.sendToChar('Type must be: char, mob, obj, or room.\r\n');
      break;
  }
}

/**
 * Internal: Set a character field.
 * Finds character by name (online players and mobs in current room).
 * Validates field name and value, applies the change, logs it.
 */
function setCharacter(ch: Character, name: string, field: string, value: string): void {
  const victim = ConnectionManager.getInstance().findCharacterByName(name)
    ?? ch.inRoom?.findCharByName(name) ?? null;

  if (!victim) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  if (!victim.isNPC() && victim.getTrust() >= ch.getTrust() && victim !== ch) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  const numVal = parseInt(value, 10);

  switch (field.toLowerCase()) {
    case 'str':
      victim.permStr = Math.max(3, Math.min(25, numVal));
      break;
    case 'int':
      victim.permInt = Math.max(3, Math.min(25, numVal));
      break;
    case 'wis':
      victim.permWis = Math.max(3, Math.min(25, numVal));
      break;
    case 'dex':
      victim.permDex = Math.max(3, Math.min(25, numVal));
      break;
    case 'con':
      victim.permCon = Math.max(3, Math.min(25, numVal));
      break;
    case 'cha':
      victim.permCha = Math.max(3, Math.min(25, numVal));
      break;
    case 'lck':
      victim.permLck = Math.max(3, Math.min(25, numVal));
      break;
    case 'hp':
      victim.hitPoints = numVal;
      break;
    case 'maxhp':
      victim.maxHitPoints = numVal;
      break;
    case 'mana':
      victim.mana = numVal;
      break;
    case 'maxmana':
      victim.maxMana = numVal;
      break;
    case 'move':
      victim.move = numVal;
      break;
    case 'maxmove':
      victim.maxMove = numVal;
      break;
    case 'level':
      victim.level = Math.max(1, Math.min(TRUST.SUPREME, numVal));
      break;
    case 'gold':
      victim.gold = Math.max(0, numVal);
      break;
    case 'silver':
      victim.silver = Math.max(0, numVal);
      break;
    case 'copper':
      victim.copper = Math.max(0, numVal);
      break;
    case 'align':
    case 'alignment':
      victim.alignment = Math.max(-1000, Math.min(1000, numVal));
      break;
    case 'thirst':
      if (victim.pcData) victim.pcData.conditions.thirst = numVal;
      break;
    case 'full':
    case 'hunger':
      if (victim.pcData) victim.pcData.conditions.full = numVal;
      break;
    case 'drunk':
      if (victim.pcData) victim.pcData.conditions.drunk = numVal;
      break;
    case 'bloodthirst':
      if (victim.pcData) victim.pcData.conditions.bloodthirst = numVal;
      break;
    case 'practice':
      if (victim.pcData) victim.pcData.practice = Math.max(0, numVal);
      break;
    case 'train':
      if (victim.pcData) victim.pcData.train = Math.max(0, numVal);
      break;
    case 'hitroll':
      victim.hitroll = numVal;
      break;
    case 'damroll':
      victim.damroll = numVal;
      break;
    case 'armor':
      victim.armor = numVal;
      break;
    case 'name':
      victim.name = value;
      break;
    case 'title':
      if (victim.pcData) victim.pcData.title = value;
      break;
    case 'description':
    case 'desc':
      victim.description = value;
      break;
    case 'sex':
      {
        const sexMap: Record<string, number> = { neutral: 0, male: 1, female: 2 };
        const s = sexMap[value.toLowerCase()];
        if (s !== undefined) victim.sex = s;
        else { ch.sendToChar('Sex must be: neutral, male, or female.\r\n'); return; }
      }
      break;
    case 'class':
      victim.charClass = value.toLowerCase();
      break;
    case 'race':
      victim.race = value.toLowerCase();
      break;
    case 'position':
      {
        const posMap: Record<string, number> = {
          dead: 0, mortal: 1, incap: 2, stunned: 3, sleeping: 4,
          resting: 6, sitting: 8, fighting: 9, standing: 12,
        };
        const p = posMap[value.toLowerCase()];
        if (p !== undefined) victim.position = p;
        else { ch.sendToChar('Invalid position.\r\n'); return; }
      }
      break;
    case 'trust':
      if (victim.pcData) {
        victim.pcData.trust = Math.max(0, Math.min(TRUST.SUPREME, numVal));
      }
      break;
    case 'favor':
      if (victim.pcData) victim.pcData.favor = numVal;
      break;
    case 'quest':
    case 'questpoints':
      if (victim.pcData) victim.pcData.questPoints = Math.max(0, numVal);
      break;
    case 'questnext':
    case 'questcooldown':
      if (victim.pcData) victim.pcData.nextQuestTimer = Math.max(0, numVal);
      break;
    case 'mentalstate':
      victim.mentalState = Math.max(-100, Math.min(100, numVal));
      break;
    case 'password':
      if (victim.pcData) {
        // Hash with bcrypt asynchronously, but we use the sync version for admin set
        const bcrypt = require('bcrypt');
        victim.pcData.passwordHash = bcrypt.hashSync(value, 10);
        ch.sendToChar(`Password for ${victim.name} has been changed.\r\n`);
        Logger.info('admin', `${ch.name} changed password for ${victim.name}`);
        return; // Early return — don't display generic "Ok"
      }
      break;
    case 'bamfin':
      if (victim.pcData) victim.pcData.bamfin = value;
      break;
    case 'bamfout':
      if (victim.pcData) victim.pcData.bamfout = value;
      break;
    case 'rrangelo':
      if (victim.pcData) victim.pcData.rRangeLo = numVal;
      break;
    case 'rrangehi':
      if (victim.pcData) victim.pcData.rRangeHi = numVal;
      break;
    case 'mrangelo':
      if (victim.pcData) victim.pcData.mRangeLo = numVal;
      break;
    case 'mrangehi':
      if (victim.pcData) victim.pcData.mRangeHi = numVal;
      break;
    case 'orangelo':
      if (victim.pcData) victim.pcData.oRangeLo = numVal;
      break;
    case 'orangehi':
      if (victim.pcData) victim.pcData.oRangeHi = numVal;
      break;
    default:
      ch.sendToChar(`Unknown field: ${field}\r\n`);
      ch.sendToChar('Fields: str int wis dex con cha lck hp maxhp mana maxmana move maxmove\r\n');
      ch.sendToChar('        level gold silver copper align thirst full drunk practice train\r\n');
      ch.sendToChar('        hitroll damroll armor name title desc sex class race position\r\n');
      ch.sendToChar('        trust favor quest questnext mentalstate password bamfin bamfout\r\n');
      ch.sendToChar('        rrangelo rrangehi mrangelo mrangehi orangelo orangehi\r\n');
      return;
  }

  ch.sendToChar('Ok.\r\n');
  Logger.info('admin', `${ch.name} set ${victim.name} ${field} to ${value}`);
}

/**
 * Internal: Set an object field. Finds object by vnum in VnumRegistry prototypes.
 */
function setObject(ch: Character, target: string, field: string, value: string): void {
  const vnum = parseInt(target, 10);
  // Try finding object in room, inventory, or by vnum
  let obj: GameObject | null = null;

  if (!isNaN(vnum)) {
    // Find first runtime instance of this vnum, or prototype
    obj = ch.inRoom?.findObjByVnum(vnum) ?? ch.findObjByVnum(vnum) ?? null;
  } else {
    obj = ch.inRoom?.findObjByName(target) ?? ch.findObjByName(target) ?? null;
  }

  if (!obj) {
    ch.sendToChar('No such object.\r\n');
    return;
  }

  const numVal = parseInt(value, 10);

  switch (field.toLowerCase()) {
    case 'value0': obj.values[0] = numVal; break;
    case 'value1': obj.values[1] = numVal; break;
    case 'value2': obj.values[2] = numVal; break;
    case 'value3': obj.values[3] = numVal; break;
    case 'value4': obj.values[4] = numVal; break;
    case 'value5': obj.values[5] = numVal; break;
    case 'flags': case 'extra':
      obj.extraFlags = BitVector.parseFlags(value);
      break;
    case 'wear':
      obj.wearFlags = BitVector.parseFlags(value);
      break;
    case 'level':
      obj.level = Math.max(0, numVal);
      break;
    case 'weight':
      obj.weight = Math.max(0, numVal);
      break;
    case 'cost':
      obj.cost = Math.max(0, numVal);
      break;
    case 'timer':
      obj.timer = numVal;
      break;
    case 'name':
      obj.name = value;
      break;
    case 'short':
      obj.shortDescription = value;
      break;
    case 'long':
      obj.description = value;
      break;
    default:
      ch.sendToChar(`Unknown field: ${field}\r\n`);
      ch.sendToChar('Fields: value0-5 flags wear level weight cost timer name short long\r\n');
      return;
  }

  ch.sendToChar('Ok.\r\n');
  Logger.info('admin', `${ch.name} set obj ${target} ${field} to ${value}`);
}

/**
 * Internal: Set a room field. Target is the current room or a vnum.
 */
function setRoom(ch: Character, target: string, field: string, value: string): void {
  let room: Room | null = null;
  const vnum = parseInt(target, 10);
  if (!isNaN(vnum)) {
    room = VnumRegistry.getRoom(vnum) ?? null;
  } else {
    room = ch.inRoom;
  }

  if (!room) {
    ch.sendToChar('No such room.\r\n');
    return;
  }

  switch (field.toLowerCase()) {
    case 'flags':
      room.roomFlags = BitVector.parseFlags(value);
      break;
    case 'sector':
      room.sectorType = parseSectorType(value);
      break;
    case 'name':
      room.name = value;
      break;
    case 'desc':
    case 'description':
      room.description = value;
      break;
    case 'tunnel':
      room.tunnel = parseInt(value, 10);
      break;
    case 'televnum':
      room.teleVnum = parseInt(value, 10);
      break;
    case 'teledelay':
      room.teleDelay = parseInt(value, 10);
      break;
    default:
      ch.sendToChar(`Unknown field: ${field}\r\n`);
      ch.sendToChar('Fields: flags sector name desc tunnel televnum teledelay\r\n');
      return;
  }

  ch.sendToChar('Ok.\r\n');
  room.area?.markModified();
  Logger.info('admin', `${ch.name} set room ${room.vnum} ${field} to ${value}`);
}
```

##### `doStat(ch, argument)`

```typescript
/**
 * Display detailed stats of a player, mob, object, or room.
 * Syntax: stat <name|vnum> | stat room | stat mob <name> | stat obj <name>
 *
 * Replicates legacy do_stat() from act_wiz.c.
 *
 * Without type prefix, auto-detects: checks room first, then characters, then objects.
 * Shows all internal fields for debugging/admin purposes.
 */
export function doStat(ch: Character, argument: string): void {
  const [arg1, rest] = StringUtils.oneArgument(argument);
  const [arg2] = StringUtils.oneArgument(rest);

  if (!arg1) {
    // Stat the current room
    if (ch.inRoom) statRoom(ch, ch.inRoom);
    return;
  }

  switch (arg1.toLowerCase()) {
    case 'room':
      {
        const room = arg2
          ? VnumRegistry.getRoom(parseInt(arg2, 10)) ?? ch.inRoom
          : ch.inRoom;
        if (room) statRoom(ch, room);
        else ch.sendToChar('No such room.\r\n');
      }
      return;
    case 'mob':
    case 'char':
      {
        if (!arg2) { ch.sendToChar('Stat whom?\r\n'); return; }
        const victim = ch.inRoom?.findCharByName(arg2)
          ?? ConnectionManager.getInstance().findCharacterByName(arg2);
        if (victim) statCharacter(ch, victim);
        else ch.sendToChar('They aren\'t here.\r\n');
      }
      return;
    case 'obj':
      {
        if (!arg2) { ch.sendToChar('Stat what?\r\n'); return; }
        const obj = ch.inRoom?.findObjByName(arg2)
          ?? ch.findObjByName(arg2);
        if (obj) statObject(ch, obj);
        else ch.sendToChar('Nothing like that.\r\n');
      }
      return;
  }

  // Auto-detect: try character, then object, then room by vnum
  const victim = ch.inRoom?.findCharByName(arg1)
    ?? ConnectionManager.getInstance().findCharacterByName(arg1);
  if (victim) { statCharacter(ch, victim); return; }

  const obj = ch.inRoom?.findObjByName(arg1) ?? ch.findObjByName(arg1);
  if (obj) { statObject(ch, obj); return; }

  const vnum = parseInt(arg1, 10);
  if (!isNaN(vnum)) {
    const room = VnumRegistry.getRoom(vnum);
    if (room) { statRoom(ch, room); return; }
  }

  ch.sendToChar('Nothing by that name found.\r\n');
}

/**
 * Display full character stats. Shows name, level, class, race, HP/mana/move,
 * attributes, alignment, position, room, area, act flags, affected_by,
 * equipment summary, affect list, gold, hitroll/damroll, armor, saving throws,
 * trust, auth state (for PCs), vnum (for NPCs), and more.
 */
function statCharacter(ch: Character, victim: Character): void {
  const buf: string[] = [];
  buf.push(`&cName: &w${victim.name}`);
  if (!victim.isNPC() && victim.pcData?.title) buf[0] += ` ${victim.pcData.title}`;
  buf.push(`&cVnum: &w${victim.isNPC() ? (victim as Mobile).vnum : 'N/A (player)'}  &cRoom: &w${victim.inRoom?.vnum ?? 'none'}`);
  buf.push(`&cLevel: &w${victim.level}  &cTrust: &w${victim.getTrust()}  &cSex: &w${['Neutral','Male','Female'][victim.sex] ?? 'Unknown'}`);
  buf.push(`&cRace: &w${victim.race}  &cClass: &w${victim.charClass}`);
  buf.push(`&cHP: &w${victim.hitPoints}/${victim.maxHitPoints}  &cMana: &w${victim.mana}/${victim.maxMana}  &cMove: &w${victim.move}/${victim.maxMove}`);
  buf.push(`&cStr: &w${victim.getStr()}  &cInt: &w${victim.getInt()}  &cWis: &w${victim.getWis()}  &cDex: &w${victim.getDex()}  &cCon: &w${victim.getCon()}  &cCha: &w${victim.getCha()}  &cLck: &w${victim.getLck()}`);
  buf.push(`&cHitroll: &w${victim.hitroll}  &cDamroll: &w${victim.damroll}  &cArmor: &w${victim.armor}`);
  buf.push(`&cAlignment: &w${victim.alignment}  &cPosition: &w${victim.position}  &cMentalState: &w${victim.mentalState}`);
  buf.push(`&cGold: &w${victim.gold}  &cSilver: &w${victim.silver}  &cCopper: &w${victim.copper}`);
  buf.push(`&cAct Flags: &w${BitVector.toString(victim.actFlags)}`);
  buf.push(`&cAffected By: &w${BitVector.toString(victim.affectedBy)}`);

  if (victim.fighting) {
    buf.push(`&cFighting: &w${victim.fighting.name}`);
  }

  if (!victim.isNPC() && victim.pcData) {
    const pc = victim.pcData;
    buf.push(`&cPractice: &w${pc.practice}  &cTrain: &w${pc.train}`);
    buf.push(`&cPlayed: &w${pc.played}s  &cAuth State: &w${pc.authState}`);
    if (pc.clan) buf.push(`&cClan: &w${pc.clan.name}`);
    buf.push(`&cR Range: &w${pc.rRangeLo}-${pc.rRangeHi}  &cM Range: &w${pc.mRangeLo}-${pc.mRangeHi}  &cO Range: &w${pc.oRangeLo}-${pc.oRangeHi}`);
  }

  // Affects
  if (victim.affects.length > 0) {
    buf.push('&c--- Affects ---&w');
    for (const af of victim.affects) {
      buf.push(`  ${af.type ?? 'unknown'}: duration ${af.duration}, modifier ${af.modifier}, location ${af.location}`);
    }
  }

  ch.sendToChar(buf.join('\r\n') + '\r\n');
}

/**
 * Display full object stats.
 */
function statObject(ch: Character, obj: GameObject): void {
  const buf: string[] = [];
  buf.push(`&cName: &w${obj.name}`);
  buf.push(`&cShort: &w${obj.shortDescription}`);
  buf.push(`&cLong: &w${obj.description}`);
  buf.push(`&cVnum: &w${obj.vnum}  &cType: &w${obj.itemType}  &cLevel: &w${obj.level}`);
  buf.push(`&cWeight: &w${obj.weight}  &cCost: &w${obj.cost}  &cTimer: &w${obj.timer}`);
  buf.push(`&cExtra Flags: &w${BitVector.toString(obj.extraFlags)}`);
  buf.push(`&cWear Flags: &w${BitVector.toString(obj.wearFlags)}`);
  buf.push(`&cValues: &w[${obj.values.join(', ')}]`);
  buf.push(`&cIn Room: &w${obj.inRoom?.vnum ?? 'none'}  &cCarried By: &w${obj.carriedBy?.name ?? 'none'}  &cIn Object: &w${obj.inObject?.shortDescription ?? 'none'}`);
  buf.push(`&cLayers: &w${obj.layers}`);

  if (obj.affects.length > 0) {
    buf.push('&c--- Object Affects ---&w');
    for (const af of obj.affects) {
      buf.push(`  Location: ${af.location}  Modifier: ${af.modifier}`);
    }
  }

  if (obj.extraDescriptions.length > 0) {
    buf.push('&c--- Extra Descriptions ---&w');
    for (const ed of obj.extraDescriptions) {
      buf.push(`  Keyword: ${ed.keyword}`);
    }
  }

  ch.sendToChar(buf.join('\r\n') + '\r\n');
}

/**
 * Display full room stats.
 */
function statRoom(ch: Character, room: Room): void {
  const buf: string[] = [];
  buf.push(`&cRoom: &w${room.vnum}  &cName: &w${room.name}`);
  buf.push(`&cArea: &w${room.area?.name ?? 'none'}  &cSector: &w${room.sectorType}`);
  buf.push(`&cFlags: &w${BitVector.toString(room.roomFlags)}`);
  buf.push(`&cDescription:&w\r\n${room.description}`);
  buf.push(`&cTunnel: &w${room.tunnel}  &cTeleVnum: &w${room.teleVnum}  &cTeleDelay: &w${room.teleDelay}`);
  buf.push(`&cLight: &w${room.light}  &cCharacters: &w${room.characters.length}  &cObjects: &w${room.contents.length}`);

  buf.push('&c--- Exits ---&w');
  for (const [dir, exit] of room.exits) {
    if (exit) {
      buf.push(`  ${dir}: to ${exit.toVnum} [${BitVector.toString(exit.flags)}] key=${exit.key} keyword="${exit.keyword ?? ''}"`);
    }
  }

  if (room.extraDescriptions.length > 0) {
    buf.push('&c--- Extra Descriptions ---&w');
    for (const ed of room.extraDescriptions) {
      buf.push(`  Keyword: ${ed.keyword}`);
    }
  }

  ch.sendToChar(buf.join('\r\n') + '\r\n');
}
```

##### `doAdvance(ch, argument)`, `doTrust(ch, argument)`, `doRestore(ch, argument)`

```typescript
/**
 * Set a player's level. Recalculates all level-dependent stats.
 * Syntax: advance <player> <level>
 *
 * Replicates legacy do_advance() from act_wiz.c.
 * Trust check: ch.getTrust() must exceed target trust and new level.
 * When advancing up, calls advanceLevel() for each level gained.
 * When demoting, simply sets level and recalculates base stats.
 */
export function doAdvance(ch: Character, argument: string): void {
  const [name, rest] = StringUtils.oneArgument(argument);
  const [levelStr] = StringUtils.oneArgument(rest);

  if (!name || !levelStr) {
    ch.sendToChar('Syntax: advance <player> <level>\r\n');
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim || victim.isNPC()) {
    ch.sendToChar('That player is not here.\r\n');
    return;
  }

  const newLevel = parseInt(levelStr, 10);
  if (isNaN(newLevel) || newLevel < 1 || newLevel > TRUST.SUPREME) {
    ch.sendToChar(`Level must be 1 to ${TRUST.SUPREME}.\r\n`);
    return;
  }

  if (newLevel >= ch.getTrust()) {
    ch.sendToChar('You can\'t advance them to or above your own trust.\r\n');
    return;
  }

  if (!victim.isNPC() && victim.getTrust() >= ch.getTrust()) {
    ch.sendToChar('You failed.\r\n');
    return;
  }

  const oldLevel = victim.level;
  if (newLevel > oldLevel) {
    // Advance up — call advanceLevel for each level
    for (let i = oldLevel; i < newLevel; i++) {
      (victim as Player).advanceLevel();
    }
    victim.level = newLevel;
    victim.sendToChar(`You have been advanced to level ${newLevel}!\r\n`);
  } else if (newLevel < oldLevel) {
    // Demote — set level and recalculate
    victim.level = newLevel;
    // Reset HP/mana/move to base for new level
    victim.maxHitPoints = Math.max(10, newLevel * 20);
    victim.maxMana = Math.max(100, newLevel * 15);
    victim.maxMove = Math.max(100, newLevel * 10);
    victim.hitPoints = Math.min(victim.hitPoints, victim.maxHitPoints);
    victim.mana = Math.min(victim.mana, victim.maxMana);
    victim.move = Math.min(victim.move, victim.maxMove);
    victim.sendToChar(`You have been demoted to level ${newLevel}.\r\n`);
  } else {
    ch.sendToChar('They are already at that level.\r\n');
    return;
  }

  ch.sendToChar(`${victim.name} is now level ${newLevel}.\r\n`);
  PlayerRepository.save(victim as Player);
  Logger.info('admin', `${ch.name} advanced ${victim.name} from ${oldLevel} to ${newLevel}`);
}

/**
 * Set a player's trust level.
 * Syntax: trust <player> <trust_level>
 * Replicates legacy do_trust().
 */
export function doTrust(ch: Character, argument: string): void {
  const [name, rest] = StringUtils.oneArgument(argument);
  const [trustStr] = StringUtils.oneArgument(rest);

  if (!name || !trustStr) {
    ch.sendToChar('Syntax: trust <player> <level>\r\n');
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(name);
  if (!victim || victim.isNPC()) {
    ch.sendToChar('That player is not here.\r\n');
    return;
  }

  const newTrust = parseInt(trustStr, 10);
  if (isNaN(newTrust) || newTrust < 0 || newTrust > TRUST.SUPREME) {
    ch.sendToChar(`Trust must be 0 to ${TRUST.SUPREME}.\r\n`);
    return;
  }

  if (newTrust >= ch.getTrust()) {
    ch.sendToChar('You can\'t set trust to or above your own.\r\n');
    return;
  }

  if (victim.pcData) {
    victim.pcData.trust = newTrust;
  }

  ch.sendToChar(`${victim.name}'s trust is now ${newTrust}.\r\n`);
  victim.sendToChar(`Your trust has been set to ${newTrust}.\r\n`);
  PlayerRepository.save(victim as Player);
  Logger.info('admin', `${ch.name} set ${victim.name}'s trust to ${newTrust}`);
}

/**
 * Restore a player to full HP/mana/move.
 * Syntax: restore <player|all>
 *
 * Replicates legacy do_restore() from act_wiz.c.
 * 'restore all' has a 6-hour cooldown (RESTORE_INTERVAL = 21600 seconds).
 * Trust >= SUB_IMPLEM bypasses cooldown.
 */
const RESTORE_INTERVAL = 21600; // 6 hours in seconds
let lastRestoreAllTime = 0;

export function doRestore(ch: Character, argument: string): void {
  const [name] = StringUtils.oneArgument(argument);
  if (!name) {
    ch.sendToChar('Restore whom?\r\n');
    return;
  }

  if (name.toLowerCase() === 'all') {
    const now = Math.floor(Date.now() / 1000);
    if (ch.getTrust() < TRUST.SUB_IMPLEM && (now - lastRestoreAllTime) < RESTORE_INTERVAL) {
      const remaining = RESTORE_INTERVAL - (now - lastRestoreAllTime);
      ch.sendToChar(`Restore all is on cooldown. ${Math.ceil(remaining / 60)} minutes remaining.\r\n`);
      return;
    }

    lastRestoreAllTime = now;
    for (const desc of ConnectionManager.getInstance().getPlayingDescriptors()) {
      const victim = desc.character;
      if (victim) {
        victim.hitPoints = victim.maxHitPoints;
        victim.mana = victim.maxMana;
        victim.move = victim.maxMove;
        victim.sendToChar('You feel a warm glow suffuse your body.\r\n');
      }
    }
    ch.sendToChar('All players restored.\r\n');
    Logger.info('admin', `${ch.name} restored all players`);
    return;
  }

  const victim = ConnectionManager.getInstance().findCharacterByName(name)
    ?? ch.inRoom?.findCharByName(name) ?? null;
  if (!victim) {
    ch.sendToChar('They aren\'t here.\r\n');
    return;
  }

  victim.hitPoints = victim.maxHitPoints;
  victim.mana = victim.maxMana;
  victim.move = victim.maxMove;

  if (victim.pcData) {
    victim.pcData.conditions.full = -1;
    victim.pcData.conditions.thirst = -1;
  }

  victim.sendToChar('You have been restored.\r\n');
  if (ch !== victim) {
    ch.sendToChar(`${victim.name} restored.\r\n`);
  }
  Logger.info('admin', `${ch.name} restored ${victim.name}`);
}
```

##### `doPeace(ch)`, `doEcho(ch, argument)`

```typescript
/**
 * Stop all combat in the room.
 * Replicates legacy do_peace().
 */
export function doPeace(ch: Character): void {
  if (!ch.inRoom) return;

  for (const rch of ch.inRoom.characters) {
    if (rch.fighting) {
      CombatEngine.stopFighting(rch, true);
    }
  }

  ch.sendToChar('Peace descends upon the room.\r\n');
  ch.inRoom.sendToRoom('Peace descends upon the room.\r\n', ch);
  Logger.info('admin', `${ch.name} used peace in room ${ch.inRoom.vnum}`);
}

/**
 * Send a message to all players in the room or globally.
 * Syntax: echo <message> (room echo)
 *         gecho <message> (global echo)
 * Replicates legacy do_echo() and do_gecho().
 */
export function doEcho(ch: Character, argument: string): void {
  if (!argument.trim()) {
    ch.sendToChar('Echo what?\r\n');
    return;
  }

  if (!ch.inRoom) return;

  ch.inRoom.sendToRoom(`${argument}\r\n`);
  ch.sendToChar(`${argument}\r\n`);
}

export function doGecho(ch: Character, argument: string): void {
  if (!argument.trim()) {
    ch.sendToChar('Global echo what?\r\n');
    return;
  }

  ConnectionManager.getInstance().broadcastToAll(`${argument}\r\n`);
}
```

#### 1.6 Ban System (Trust 55+)

```typescript
/**
 * Ban a site/IP.
 * Syntax: ban add <site> <type> [duration_days]
 *         ban list
 *
 * Replicates legacy do_ban() from act_wiz.c.
 *
 * Ban types: 'all', 'newbie', 'mortal', 'level', 'warn'
 * Duration: number of days, or 'permanent' (-1)
 *
 * Supports prefix matching with wildcard:
 *   ban add 192.168.* all permanent — matches 192.168.x.x
 *   ban add *.badhost.com all 30 — matches anything ending in .badhost.com
 *
 * Bans are checked in ConnectionManager during connection acceptance.
 * Ban data is persisted via BanSystem.save() to a JSON file.
 */
export function doBan(ch: Character, argument: string): void {
  const [subCmd, rest1] = StringUtils.oneArgument(argument);
  if (!subCmd || subCmd.toLowerCase() === 'list') {
    doBanList(ch);
    return;
  }

  if (subCmd.toLowerCase() !== 'add') {
    ch.sendToChar('Syntax: ban add <site> <type> [duration_days|permanent]\r\n');
    ch.sendToChar('        ban list\r\n');
    return;
  }

  const [site, rest2] = StringUtils.oneArgument(rest1);
  const [banType, rest3] = StringUtils.oneArgument(rest2);
  const [durationStr] = StringUtils.oneArgument(rest3);

  if (!site || !banType) {
    ch.sendToChar('Syntax: ban add <site> <all|newbie|mortal|level|warn> [duration|permanent]\r\n');
    return;
  }

  const validTypes = ['all', 'newbie', 'mortal', 'level', 'warn'];
  if (!validTypes.includes(banType.toLowerCase())) {
    ch.sendToChar(`Ban type must be one of: ${validTypes.join(', ')}\r\n`);
    return;
  }

  const duration = (!durationStr || durationStr.toLowerCase() === 'permanent')
    ? -1
    : parseInt(durationStr, 10);

  if (duration !== -1 && (isNaN(duration) || duration < 1 || duration > 1000)) {
    ch.sendToChar('Duration must be 1-1000 days, or "permanent".\r\n');
    return;
  }

  // Determine prefix/suffix from wildcard
  const prefix = site.endsWith('*');
  const suffix = site.startsWith('*');
  const cleanSite = site.replace(/^\*|\*$/g, '');

  const entry: BanEntry = {
    name: cleanSite,
    user: '',
    note: '',
    bannedBy: ch.name,
    bannedAt: new Date(),
    flagType: banType.toLowerCase() as BanEntry['flagType'],
    level: 0,
    unbanDate: duration > 0 ? new Date(Date.now() + duration * 86400000) : null,
    duration,
    prefix,
    suffix,
  };

  BanSystem.getInstance().addBan(entry);
  ch.sendToChar(`Ban added: ${site} (${banType}, ${duration === -1 ? 'permanent' : duration + ' days'}).\r\n`);
  Logger.info('admin', `${ch.name} banned ${site} type=${banType} duration=${duration}`);
}

/**
 * Remove a ban.
 * Syntax: allow <site>
 * Replicates legacy do_allow().
 */
export function doAllow(ch: Character, argument: string): void {
  const [site] = StringUtils.oneArgument(argument);
  if (!site) {
    ch.sendToChar('Allow which site?\r\n');
    return;
  }

  const removed = BanSystem.getInstance().removeBan(site);
  if (removed) {
    ch.sendToChar(`Ban on ${site} removed.\r\n`);
    Logger.info('admin', `${ch.name} unbanned ${site}`);
  } else {
    ch.sendToChar(`No ban found for ${site}.\r\n`);
  }
}

/**
 * List all active bans.
 */
export function doBanList(ch: Character): void {
  const bans = BanSystem.getInstance().getAllBans();
  if (bans.length === 0) {
    ch.sendToChar('No active bans.\r\n');
    return;
  }

  ch.sendToChar('&c--- Active Bans ---&w\r\n');
  ch.sendToChar(StringUtils.padRight('Site', 30) + StringUtils.padRight('Type', 10) +
                StringUtils.padRight('Duration', 15) + 'Banned By\r\n');
  ch.sendToChar('-'.repeat(70) + '\r\n');

  for (const ban of bans) {
    const siteDisplay = (ban.suffix ? '*' : '') + ban.name + (ban.prefix ? '*' : '');
    const durDisplay = ban.duration === -1 ? 'permanent' : `${ban.duration} days`;
    const expired = ban.unbanDate && new Date() > ban.unbanDate;
    if (expired) continue;

    ch.sendToChar(
      StringUtils.padRight(siteDisplay, 30) +
      StringUtils.padRight(ban.flagType, 10) +
      StringUtils.padRight(durDisplay, 15) +
      ban.bannedBy + '\r\n'
    );
  }
}
```

#### 1.7 Information Commands (Trust 51+)

```typescript
/**
 * List all connected descriptors with state, host, idle time.
 * Replicates legacy do_users().
 */
export function doUsers(ch: Character): void {
  const descriptors = ConnectionManager.getInstance().getAllDescriptors();

  ch.sendToChar(`&c${descriptors.length} connection(s) found.&w\r\n`);
  ch.sendToChar(StringUtils.padRight('Desc', 6) + StringUtils.padRight('State', 18) +
                StringUtils.padRight('Idle', 8) + StringUtils.padRight('Player', 16) +
                'Host\r\n');
  ch.sendToChar('-'.repeat(75) + '\r\n');

  for (const desc of descriptors) {
    const playerName = desc.character?.name ?? '(none)';
    const state = desc.connectionState ?? 'unknown';
    const idle = desc.idle ? `${Math.floor(desc.idle / 60)}m` : '0m';
    const host = desc.host ?? 'unknown';

    ch.sendToChar(
      StringUtils.padRight(String(desc.id), 6) +
      StringUtils.padRight(state, 18) +
      StringUtils.padRight(idle, 8) +
      StringUtils.padRight(playerName, 16) +
      host + '\r\n'
    );
  }
}

/**
 * Show memory usage: area count, room count, mob count, object count,
 * affect count, player count.
 * Replicates legacy do_memory().
 */
export function doMemory(ch: Character): void {
  const areas = AreaManager.getAllAreas();
  const roomCount = VnumRegistry.getRoomCount();
  const mobCount = VnumRegistry.getMobilePrototypeCount();
  const objCount = VnumRegistry.getObjectPrototypeCount();
  const onlinePlayers = ConnectionManager.getInstance().getPlayingDescriptors().length;
  const memUsage = process.memoryUsage();

  ch.sendToChar('&c--- Memory & System Report ---&w\r\n');
  ch.sendToChar(`Areas loaded:       ${areas.length}\r\n`);
  ch.sendToChar(`Rooms:              ${roomCount}\r\n`);
  ch.sendToChar(`Mobile prototypes:  ${mobCount}\r\n`);
  ch.sendToChar(`Object prototypes:  ${objCount}\r\n`);
  ch.sendToChar(`Players online:     ${onlinePlayers}\r\n`);
  ch.sendToChar(`Heap used:          ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB\r\n`);
  ch.sendToChar(`Heap total:         ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB\r\n`);
  ch.sendToChar(`RSS:                ${(memUsage.rss / 1024 / 1024).toFixed(1)} MB\r\n`);
  ch.sendToChar(`Uptime:             ${Math.floor(process.uptime())} seconds\r\n`);
}

/**
 * List all immortal commands available at the player's trust level.
 * Replicates legacy do_wizhelp().
 */
export function doWizhelp(ch: Character): void {
  const trust = ch.getTrust();
  const commands = CommandRegistry.getAllCommands()
    .filter(cmd => cmd.level > 0 && cmd.level <= trust)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (commands.length === 0) {
    ch.sendToChar('No immortal commands available.\r\n');
    return;
  }

  ch.sendToChar('&c--- Immortal Commands ---&w\r\n');

  // Display in columns (4 per row)
  const cols = 4;
  const colWidth = 18;
  let line = '';
  for (let i = 0; i < commands.length; i++) {
    line += StringUtils.padRight(`${commands[i].name}(${commands[i].level})`, colWidth);
    if ((i + 1) % cols === 0) {
      ch.sendToChar(line + '\r\n');
      line = '';
    }
  }
  if (line) ch.sendToChar(line + '\r\n');
  ch.sendToChar(`\r\n${commands.length} commands available.\r\n`);
}
```

#### 1.8 WIZINVIS System

```typescript
/**
 * Toggle wizard invisibility or set a specific wizinvis level.
 * Syntax: wizinvis | wizinvis <level>
 *
 * Replicates legacy do_invis() from act_wiz.c.
 *
 * When wizinvis is active, mortals and immortals below the wizinvis level
 * cannot see the character in who lists, room displays, or communication channels.
 */
export function doWizinvis(ch: Character, argument: string): void {
  if (!ch.pcData) return;

  const [arg] = StringUtils.oneArgument(argument);

  if (!arg) {
    // Toggle on/off
    if (BitVector.isSet(ch.actFlags, PLR_WIZINVIS)) {
      ch.actFlags = BitVector.removeBit(ch.actFlags, PLR_WIZINVIS);
      ch.pcData.wizInvisLevel = 0;
      ch.sendToChar('You are now visible.\r\n');
      ch.inRoom?.sendToRoom(`${ch.name} slowly fades into existence.\r\n`, ch);
    } else {
      ch.actFlags = BitVector.setBit(ch.actFlags, PLR_WIZINVIS);
      ch.pcData.wizInvisLevel = ch.getTrust();
      ch.sendToChar(`You slowly vanish into thin air. (WizInvis level ${ch.pcData.wizInvisLevel})\r\n`);
      ch.inRoom?.sendToRoom(`${ch.name} slowly fades into thin air.\r\n`, ch);
    }
    return;
  }

  const level = parseInt(arg, 10);
  if (isNaN(level) || level < 0 || level > ch.getTrust()) {
    ch.sendToChar(`Level must be 0 to ${ch.getTrust()}.\r\n`);
    return;
  }

  if (level === 0) {
    ch.actFlags = BitVector.removeBit(ch.actFlags, PLR_WIZINVIS);
    ch.pcData.wizInvisLevel = 0;
    ch.sendToChar('You are now visible.\r\n');
  } else {
    ch.actFlags = BitVector.setBit(ch.actFlags, PLR_WIZINVIS);
    ch.pcData.wizInvisLevel = level;
    ch.sendToChar(`WizInvis level set to ${level}.\r\n`);
  }
}

/**
 * Toggle holylight — see everything regardless of dark rooms, invisibility, etc.
 * Replicates legacy do_holylight().
 */
export function doHolylight(ch: Character): void {
  if (BitVector.isSet(ch.actFlags, PLR_HOLYLIGHT)) {
    ch.actFlags = BitVector.removeBit(ch.actFlags, PLR_HOLYLIGHT);
    ch.sendToChar('Holy light mode OFF.\r\n');
  } else {
    ch.actFlags = BitVector.setBit(ch.actFlags, PLR_HOLYLIGHT);
    ch.sendToChar('Holy light mode ON.\r\n');
  }
}
```

#### 1.9 Command Registration

```typescript
/**
 * Register all immortal commands with the CommandRegistry.
 * Called once during boot from main.ts.
 */
export function registerImmortalCommands(): void {
  const R = CommandRegistry;

  // Character Management (Trust 51+)
  R.register('authorize',  doAuthorize,  TRUST.NEOPHYTE,  Position.Dead,     LOG_ALWAYS);
  R.register('freeze',     doFreeze,     TRUST.NEOPHYTE,  Position.Dead,     LOG_ALWAYS);
  R.register('silence',    doSilence,    TRUST.NEOPHYTE,  Position.Dead,     LOG_ALWAYS);
  R.register('noshout',    doNoshout,    TRUST.NEOPHYTE,  Position.Dead,     LOG_ALWAYS);
  R.register('notell',     doNotell,     TRUST.NEOPHYTE,  Position.Dead,     LOG_ALWAYS);
  R.register('log',        doLog,        TRUST.NEOPHYTE,  Position.Dead,     LOG_ALWAYS);

  // Teleportation (Trust 52+)
  R.register('goto',       doGoto,       TRUST.ACOLYTE,   Position.Dead,     LOG_NORMAL);
  R.register('transfer',   doTransfer,   TRUST.ACOLYTE,   Position.Dead,     LOG_ALWAYS);
  R.register('at',         doAt,         TRUST.ACOLYTE,   Position.Dead,     LOG_NORMAL);
  R.register('bamfin',     doBamfin,     TRUST.ACOLYTE,   Position.Dead,     LOG_NORMAL);
  R.register('bamfout',    doBamfout,    TRUST.ACOLYTE,   Position.Dead,     LOG_NORMAL);

  // World Manipulation (Trust 53+)
  R.register('purge',      doPurge,      TRUST.CREATOR,   Position.Dead,     LOG_NORMAL);
  R.register('mload',      doMload,      TRUST.CREATOR,   Position.Dead,     LOG_ALWAYS);
  R.register('oload',      doOload,      TRUST.CREATOR,   Position.Dead,     LOG_ALWAYS);
  R.register('slay',       doSlay,       TRUST.CREATOR,   Position.Dead,     LOG_ALWAYS);
  R.register('force',      doForce,      TRUST.CREATOR,   Position.Dead,     LOG_ALWAYS);
  R.register('snoop',      doSnoop,      TRUST.CREATOR,   Position.Dead,     LOG_ALWAYS);
  R.register('switch',     doSwitch,     TRUST.CREATOR,   Position.Dead,     LOG_ALWAYS);
  R.register('return',     doReturn,     TRUST.CREATOR,   Position.Dead,     LOG_NORMAL);

  // System Administration (Trust 58+)
  R.register('reboot',     doReboot,     TRUST.GREATER_GOD, Position.Dead,   LOG_ALWAYS);
  R.register('shutdown',   doShutdown,   TRUST.GREATER_GOD, Position.Dead,   LOG_ALWAYS);
  R.register('copyover',   doCopyover,   TRUST.GREATER_GOD, Position.Dead,   LOG_ALWAYS);
  R.register('set',        doSet,        TRUST.GREATER_GOD, Position.Dead,   LOG_ALWAYS);
  R.register('stat',       doStat,       TRUST.NEOPHYTE,    Position.Dead,   LOG_NORMAL);
  R.register('advance',    doAdvance,    TRUST.GREATER_GOD, Position.Dead,   LOG_ALWAYS);
  R.register('trust',      doTrust,      TRUST.GREATER_GOD, Position.Dead,   LOG_ALWAYS);
  R.register('restore',    doRestore,    TRUST.CREATOR,     Position.Dead,   LOG_ALWAYS);
  R.register('peace',      doPeace,      TRUST.CREATOR,     Position.Dead,   LOG_NORMAL);
  R.register('echo',       doEcho,       TRUST.CREATOR,     Position.Dead,   LOG_NORMAL);
  R.register('gecho',      doGecho,      TRUST.GREATER_GOD, Position.Dead,   LOG_ALWAYS);

  // Ban System (Trust 55+)
  R.register('ban',        doBan,        TRUST.DEMI_GOD,  Position.Dead,     LOG_ALWAYS);
  R.register('allow',      doAllow,      TRUST.DEMI_GOD,  Position.Dead,     LOG_ALWAYS);

  // Information (Trust 51+)
  R.register('users',      doUsers,      TRUST.NEOPHYTE,  Position.Dead,     LOG_NORMAL);
  R.register('memory',     doMemory,     TRUST.NEOPHYTE,  Position.Dead,     LOG_NORMAL);
  R.register('wizhelp',    doWizhelp,    TRUST.NEOPHYTE,  Position.Dead,     LOG_NORMAL);

  // WIZINVIS & Holylight (Trust 51+)
  R.register('wizinvis',   doWizinvis,   TRUST.NEOPHYTE,  Position.Dead,     LOG_NORMAL);
  R.register('invis',      doWizinvis,   TRUST.NEOPHYTE,  Position.Dead,     LOG_NORMAL);
  R.register('holylight',  doHolylight,  TRUST.NEOPHYTE,  Position.Dead,     LOG_NORMAL);
}
```

---

### 2. `src/game/commands/olc.ts` — Online Creation System

Implement the two-tiered OLC system. Replicates legacy `build.c` (11,286 lines) and `ibuild.c` (3,976 lines). Uses the substate system to put the connection into editing mode.

#### 2.1 OLC Types and Vnum Range Enforcement

```typescript
import { Player } from '../entities/Player';
import { Character } from '../entities/Character';
import { Room, RoomExit } from '../entities/Room';
import { Area } from '../entities/Area';
import { MobilePrototype } from '../entities/Mobile';
import { ObjectPrototype, GameObject } from '../entities/GameObject';
import { VnumRegistry } from '../world/VnumRegistry';
import { AreaManager } from '../world/AreaManager';
import { WorldRepository } from '../../persistence/WorldRepository';
import { CommandRegistry } from './CommandRegistry';
import { Descriptor } from '../../network/ConnectionManager';
import { Logger } from '../../utils/Logger';
import { BitVector } from '../../utils/BitVector';
import { StringUtils } from '../../utils/StringUtils';

export type OlcMode = 'room' | 'mobile' | 'object' | 'area' | 'mpedit';

/**
 * OLC editor state stored on the Descriptor.
 * Replicates legacy OLC_DATA from descriptor_data.olc.
 */
export interface OlcEditorData {
  mode: OlcMode;
  vnum: number;
  modified: boolean;
  /** For text editing substates (room desc, mob desc, etc.) */
  editBuffer?: string[];
  /** Substate identifier for the text being edited */
  editSubstate?: string;
}

/**
 * Check if a player can modify a given vnum.
 * Replicates legacy can_rmodify(), can_mmodify(), can_oedit().
 *
 * Builders are assigned vnum ranges per entity type:
 *   pcData.rRangeLo/rRangeHi — rooms
 *   pcData.mRangeLo/mRangeHi — mobs
 *   pcData.oRangeLo/oRangeHi — objects
 *
 * Trust >= 59 (LEVEL_GREATER / ASCENDANT) bypasses range checks entirely.
 *
 * @param player The builder attempting the modification.
 * @param vnum The vnum of the entity to modify.
 * @param type The type of entity: 'room', 'mobile', 'object', or 'area'.
 * @returns true if the player can modify the vnum.
 */
export function canModifyVnum(player: Player, vnum: number, type: OlcMode): boolean {
  // High-level immortals bypass
  if (player.getTrust() >= 59) return true; // LEVEL_GREATER

  const pc = player.pcData;
  if (!pc) return false;

  switch (type) {
    case 'room':
      return vnum >= pc.rRangeLo && vnum <= pc.rRangeHi;
    case 'mobile':
      return vnum >= pc.mRangeLo && vnum <= pc.mRangeHi;
    case 'object':
      return vnum >= pc.oRangeLo && vnum <= pc.oRangeHi;
    case 'area':
      return true; // Area editing checks done via area's own vnum ranges
    case 'mpedit':
      return true; // MUDprog editing follows the entity's vnum range check
  }
}
```

#### 2.2 Room Editor (`redit`)

```typescript
/**
 * Room editor command handler.
 * Syntax: redit [subcommand] [arguments]
 *
 * Replicates legacy do_redit() from build.c.
 *
 * Without arguments: Enter room editing mode on the current room (if within vnum range).
 * With subcommands:
 *   redit name <text>               — Set room name.
 *   redit desc                      — Enter text editor for room description.
 *                                     Uses the string editor substate SUB_ROOM_DESC.
 *                                     Type '/s' to save, '/c' to clear, '/l' to list.
 *   redit ed <keyword>              — Add/edit extra description on the room.
 *                                     Enters text editor with SUB_ROOM_EXTRA substate.
 *   redit rmed <keyword>            — Remove an extra description.
 *   redit exit <direction> <vnum>   — Create or modify an exit.
 *                                     Creates a new exit linking to destination vnum.
 *                                     If exit already exists, updates the destination.
 *   redit exflag <dir> <flag>       — Set exit flags (door, closed, locked, hidden,
 *                                     pickproof, secret, fly, climb, dig, window,
 *                                     auto, nopassdoor, can_look, can_climb).
 *   redit exkey <direction> <vnum>  — Set the key vnum for an exit's door.
 *   redit exdesc <direction>        — Edit exit description (text editor).
 *   redit exname <direction> <kw>   — Set exit keywords (for door commands).
 *   redit bexit <direction> <vnum>  — Create bidirectional exit (both rooms linked).
 *   redit rmexit <direction>        — Remove an exit.
 *   redit sector <type>             — Set sector type (inside, city, field, forest,
 *                                     hills, mountain, water_swim, water_noswim,
 *                                     underwater, air, desert, lava, swamp, underground).
 *   redit flags <flag_list>         — Set room flags (dark, death, nomob, indoors,
 *                                     safe, private, solitary, nomagic, norecall,
 *                                     nosummon, tunnel, silence, nosupplicate, etc.).
 *   redit tunnel <count>            — Set tunnel limit (0 = unlimited).
 *   redit teleport <vnum> <delay>   — Set teleport destination and delay in pulses.
 *   redit create <vnum>             — Create a new room at the specified vnum.
 *                                     Vnum must be within the builder's assigned range.
 *                                     Creates a default room with "Newly created room" name.
 *   done                            — Exit editor, mark area as modified for saving.
 *
 * When a room is modified through any redit subcommand, the containing area's
 * 'modified' flag is set. The area is saved when 'done' is typed or when
 * WorldRepository.saveAllAreas() is called (e.g., during shutdown).
 */
export function doRedit(ch: Character, argument: string): void {
  if (!ch.inRoom) return;

  const player = ch as Player;
  if (!player.pcData) return;

  const [subCmd, rest] = StringUtils.oneArgument(argument);

  // If no argument, enter editing mode on current room
  if (!subCmd) {
    if (!canModifyVnum(player, ch.inRoom.vnum, 'room')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }

    if (ch.descriptor) {
      ch.descriptor.olcData = {
        mode: 'room',
        vnum: ch.inRoom.vnum,
        modified: false,
      };
    }

    ch.sendToChar(`[Editing room ${ch.inRoom.vnum}: ${ch.inRoom.name}]\r\n`);
    ch.sendToChar("Type 'done' to exit the editor. Type 'redit ?' for help.\r\n");
    return;
  }

  // Help subcommand
  if (subCmd === '?') {
    ch.sendToChar('Redit subcommands:\r\n');
    ch.sendToChar('  name <text>           - Set room name\r\n');
    ch.sendToChar('  desc                  - Edit room description\r\n');
    ch.sendToChar('  ed <keyword>          - Add/edit extra description\r\n');
    ch.sendToChar('  rmed <keyword>        - Remove extra description\r\n');
    ch.sendToChar('  exit <dir> <vnum>     - Create/modify exit\r\n');
    ch.sendToChar('  bexit <dir> <vnum>    - Create bidirectional exit\r\n');
    ch.sendToChar('  rmexit <dir>          - Remove exit\r\n');
    ch.sendToChar('  exflag <dir> <flag>   - Set exit flags\r\n');
    ch.sendToChar('  exkey <dir> <vnum>    - Set exit key\r\n');
    ch.sendToChar('  exdesc <dir>          - Edit exit description\r\n');
    ch.sendToChar('  exname <dir> <kw>     - Set exit keywords\r\n');
    ch.sendToChar('  sector <type>         - Set sector type\r\n');
    ch.sendToChar('  flags <flags>         - Set room flags\r\n');
    ch.sendToChar('  tunnel <count>        - Set tunnel limit\r\n');
    ch.sendToChar('  teleport <vnum> <ms>  - Set teleport\r\n');
    ch.sendToChar('  create <vnum>         - Create new room\r\n');
    ch.sendToChar('  done                  - Exit editor\r\n');
    return;
  }

  const room = ch.inRoom;

  if (!canModifyVnum(player, room.vnum, 'room')) {
    ch.sendToChar('That vnum is not in your assigned range.\r\n');
    return;
  }

  switch (subCmd.toLowerCase()) {
    case 'name':
      if (!rest.trim()) { ch.sendToChar('Set the room name to what?\r\n'); return; }
      room.name = rest.trim();
      ch.sendToChar(`Room name set to: ${room.name}\r\n`);
      room.area?.markModified();
      break;

    case 'desc':
      // Enter text editor substate
      if (ch.descriptor) {
        ch.descriptor.olcData = {
          mode: 'room',
          vnum: room.vnum,
          modified: true,
          editBuffer: room.description ? room.description.split('\n') : [],
          editSubstate: 'SUB_ROOM_DESC',
        };
        ch.sendToChar('Enter room description. /s to save, /c to clear, /l to list.\r\n');
        ch.sendToChar('---\r\n');
        if (room.description) ch.sendToChar(room.description + '\r\n');
        ch.sendToChar('---\r\n');
      }
      break;

    case 'ed':
      {
        const [keyword] = StringUtils.oneArgument(rest);
        if (!keyword) { ch.sendToChar('Syntax: redit ed <keyword>\r\n'); return; }
        if (ch.descriptor) {
          ch.descriptor.olcData = {
            mode: 'room',
            vnum: room.vnum,
            modified: true,
            editBuffer: [],
            editSubstate: `SUB_ROOM_EXTRA:${keyword}`,
          };
          ch.sendToChar(`Editing extra description for keyword '${keyword}'.\r\n`);
          ch.sendToChar('/s to save, /c to clear, /l to list.\r\n');
        }
      }
      break;

    case 'rmed':
      {
        const [keyword] = StringUtils.oneArgument(rest);
        if (!keyword) { ch.sendToChar('Syntax: redit rmed <keyword>\r\n'); return; }
        const idx = room.extraDescriptions.findIndex(
          ed => ed.keyword.toLowerCase() === keyword.toLowerCase()
        );
        if (idx >= 0) {
          room.extraDescriptions.splice(idx, 1);
          ch.sendToChar(`Extra description '${keyword}' removed.\r\n`);
          room.area?.markModified();
        } else {
          ch.sendToChar('No extra description with that keyword.\r\n');
        }
      }
      break;

    case 'exit':
      {
        const [dirStr, destStr] = StringUtils.oneArgument(rest).concat(StringUtils.oneArgument(rest.substring(rest.indexOf(' ') + 1)));
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 2) { ch.sendToChar('Syntax: redit exit <direction> <destination_vnum>\r\n'); return; }
        const dir = parseDirection(parts[0]);
        if (dir === undefined) { ch.sendToChar('Invalid direction.\r\n'); return; }
        const destVnum = parseInt(parts[1], 10);
        if (isNaN(destVnum)) { ch.sendToChar('Invalid vnum.\r\n'); return; }
        const destRoom = VnumRegistry.getRoom(destVnum);
        if (!destRoom) { ch.sendToChar(`No room with vnum ${destVnum}.\r\n`); return; }

        let exit = room.getExit(dir);
        if (!exit) {
          exit = new RoomExit();
          room.setExit(dir, exit);
        }
        exit.toVnum = destVnum;
        exit.toRoom = destRoom;
        ch.sendToChar(`Exit ${directionName(dir)} now leads to room ${destVnum}.\r\n`);
        room.area?.markModified();
      }
      break;

    case 'bexit':
      {
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 2) { ch.sendToChar('Syntax: redit bexit <direction> <destination_vnum>\r\n'); return; }
        const dir = parseDirection(parts[0]);
        if (dir === undefined) { ch.sendToChar('Invalid direction.\r\n'); return; }
        const destVnum = parseInt(parts[1], 10);
        if (isNaN(destVnum)) { ch.sendToChar('Invalid vnum.\r\n'); return; }
        const destRoom = VnumRegistry.getRoom(destVnum);
        if (!destRoom) { ch.sendToChar(`No room with vnum ${destVnum}.\r\n`); return; }

        // Forward exit
        let exit = room.getExit(dir);
        if (!exit) { exit = new RoomExit(); room.setExit(dir, exit); }
        exit.toVnum = destVnum;
        exit.toRoom = destRoom;

        // Reverse exit
        const revDir = reverseDirection(dir);
        let revExit = destRoom.getExit(revDir);
        if (!revExit) { revExit = new RoomExit(); destRoom.setExit(revDir, revExit); }
        revExit.toVnum = room.vnum;
        revExit.toRoom = room;

        ch.sendToChar(`Bidirectional exit created: ${directionName(dir)} ↔ room ${destVnum}.\r\n`);
        room.area?.markModified();
        destRoom.area?.markModified();
      }
      break;

    case 'rmexit':
      {
        const [dirArg] = StringUtils.oneArgument(rest);
        if (!dirArg) { ch.sendToChar('Syntax: redit rmexit <direction>\r\n'); return; }
        const dir = parseDirection(dirArg);
        if (dir === undefined) { ch.sendToChar('Invalid direction.\r\n'); return; }
        room.setExit(dir, null);
        ch.sendToChar(`Exit ${directionName(dir)} removed.\r\n`);
        room.area?.markModified();
      }
      break;

    case 'exflag':
      {
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 2) { ch.sendToChar('Syntax: redit exflag <direction> <flag>\r\n'); return; }
        const dir = parseDirection(parts[0]);
        if (dir === undefined) { ch.sendToChar('Invalid direction.\r\n'); return; }
        const exit = room.getExit(dir);
        if (!exit) { ch.sendToChar('No exit in that direction.\r\n'); return; }
        const flagName = parts[1].toLowerCase();
        const exitFlagMap: Record<string, bigint> = {
          door: EX_ISDOOR, closed: EX_CLOSED, locked: EX_LOCKED,
          hidden: EX_HIDDEN, secret: EX_SECRET, pickproof: EX_PICKPROOF,
          fly: EX_FLY, climb: EX_CLIMB, dig: EX_DIG, window: EX_WINDOW,
          auto: EX_AUTO, nopassdoor: EX_NOPASSDOOR,
        };
        const flag = exitFlagMap[flagName];
        if (!flag) {
          ch.sendToChar(`Unknown exit flag. Valid: ${Object.keys(exitFlagMap).join(', ')}\r\n`);
          return;
        }
        exit.flags = BitVector.toggleBit(exit.flags, flag);
        ch.sendToChar(`Exit flag '${flagName}' toggled on ${directionName(dir)} exit.\r\n`);
        room.area?.markModified();
      }
      break;

    case 'exkey':
      {
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 2) { ch.sendToChar('Syntax: redit exkey <direction> <key_vnum>\r\n'); return; }
        const dir = parseDirection(parts[0]);
        if (dir === undefined) { ch.sendToChar('Invalid direction.\r\n'); return; }
        const exit = room.getExit(dir);
        if (!exit) { ch.sendToChar('No exit in that direction.\r\n'); return; }
        exit.key = parseInt(parts[1], 10);
        ch.sendToChar(`Exit key set to vnum ${exit.key} on ${directionName(dir)} exit.\r\n`);
        room.area?.markModified();
      }
      break;

    case 'exdesc':
      {
        const [dirArg] = StringUtils.oneArgument(rest);
        if (!dirArg) { ch.sendToChar('Syntax: redit exdesc <direction>\r\n'); return; }
        const dir = parseDirection(dirArg);
        if (dir === undefined) { ch.sendToChar('Invalid direction.\r\n'); return; }
        const exit = room.getExit(dir);
        if (!exit) { ch.sendToChar('No exit in that direction.\r\n'); return; }
        if (ch.descriptor) {
          ch.descriptor.olcData = {
            mode: 'room', vnum: room.vnum, modified: true,
            editBuffer: exit.description ? exit.description.split('\n') : [],
            editSubstate: `SUB_EXIT_DESC:${dir}`,
          };
          ch.sendToChar('Enter exit description. /s to save, /c to clear.\r\n');
        }
      }
      break;

    case 'exname':
      {
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 2) { ch.sendToChar('Syntax: redit exname <direction> <keywords>\r\n'); return; }
        const dir = parseDirection(parts[0]);
        if (dir === undefined) { ch.sendToChar('Invalid direction.\r\n'); return; }
        const exit = room.getExit(dir);
        if (!exit) { ch.sendToChar('No exit in that direction.\r\n'); return; }
        exit.keyword = parts.slice(1).join(' ');
        ch.sendToChar(`Exit keywords set to '${exit.keyword}' on ${directionName(dir)}.\r\n`);
        room.area?.markModified();
      }
      break;

    case 'sector':
      {
        const [sectorArg] = StringUtils.oneArgument(rest);
        if (!sectorArg) { ch.sendToChar('Syntax: redit sector <type>\r\n'); return; }
        const sector = parseSectorType(sectorArg);
        if (sector === undefined) {
          ch.sendToChar('Valid sectors: inside city field forest hills mountain water_swim water_noswim underwater air desert lava swamp underground\r\n');
          return;
        }
        room.sectorType = sector;
        ch.sendToChar(`Sector type set to: ${sectorArg}\r\n`);
        room.area?.markModified();
      }
      break;

    case 'flags':
      {
        if (!rest.trim()) { ch.sendToChar('Syntax: redit flags <flag_list>\r\n'); return; }
        room.roomFlags = BitVector.parseFlags(rest.trim());
        ch.sendToChar(`Room flags set to: ${BitVector.toString(room.roomFlags)}\r\n`);
        room.area?.markModified();
      }
      break;

    case 'tunnel':
      {
        const val = parseInt(rest.trim(), 10);
        if (isNaN(val)) { ch.sendToChar('Syntax: redit tunnel <count>\r\n'); return; }
        room.tunnel = Math.max(0, val);
        ch.sendToChar(`Tunnel limit set to: ${room.tunnel}\r\n`);
        room.area?.markModified();
      }
      break;

    case 'teleport':
      {
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 2) { ch.sendToChar('Syntax: redit teleport <vnum> <delay_pulses>\r\n'); return; }
        room.teleVnum = parseInt(parts[0], 10);
        room.teleDelay = parseInt(parts[1], 10);
        ch.sendToChar(`Teleport set: destination ${room.teleVnum}, delay ${room.teleDelay} pulses.\r\n`);
        room.area?.markModified();
      }
      break;

    case 'create':
      {
        const vnumStr = rest.trim();
        if (!vnumStr) { ch.sendToChar('Syntax: redit create <vnum>\r\n'); return; }
        const newVnum = parseInt(vnumStr, 10);
        if (isNaN(newVnum)) { ch.sendToChar('Invalid vnum.\r\n'); return; }
        if (!canModifyVnum(player, newVnum, 'room')) {
          ch.sendToChar('That vnum is not in your assigned range.\r\n');
          return;
        }
        if (VnumRegistry.getRoom(newVnum)) {
          ch.sendToChar(`Room ${newVnum} already exists.\r\n`);
          return;
        }

        const newRoom = new Room(newVnum);
        newRoom.name = 'Newly created room';
        newRoom.description = 'This is a newly created room.\r\n';
        newRoom.area = room.area; // Assign to same area as current room
        VnumRegistry.addRoom(newRoom);
        if (room.area) {
          room.area.rooms.push(newRoom);
          room.area.markModified();
        }
        ch.sendToChar(`Room ${newVnum} created.\r\n`);
        Logger.info('olc', `${ch.name} created room ${newVnum}`);
      }
      break;

    case 'done':
      if (ch.descriptor?.olcData) {
        ch.descriptor.olcData = undefined;
      }
      room.area?.markModified();
      ch.sendToChar('Exited room editor. Area marked as modified.\r\n');
      break;

    default:
      ch.sendToChar(`Unknown redit subcommand: '${subCmd}'. Type 'redit ?' for help.\r\n`);
      break;
  }
}
```

#### 2.3 Mobile Editor (`medit`)

```typescript
/**
 * Mobile editor command handler.
 * Syntax: medit <vnum> | medit create <vnum> | medit <subcommand>
 *
 * Replicates legacy do_medit() from build.c.
 *
 * 'medit <vnum>': Enter editing mode on an existing mobile prototype.
 * 'medit create <vnum>': Create a new mobile prototype at the specified vnum.
 *
 * Subcommands (while in editing mode):
 *   medit name <text>                — Set mobile keywords/name.
 *   medit short <text>               — Set short description (e.g., "a cityguard").
 *   medit long <text>                — Set long description (shown in room, e.g., "A cityguard stands here.").
 *   medit desc                       — Enter text editor for full description (seen with 'look mob').
 *   medit level <num>                — Set level. Auto-calculates HP, damage, AC, THAC0:
 *                                       HP dice: level*8 d level/2 + level*20
 *                                       Damage dice: level/4 d level/3 + level/2
 *                                       AC: -(level * 2 + 10), min -200
 *                                       THAC0: 20 - (level * 0.75), min 0
 *   medit alignment <num>            — Set alignment (-1000 to 1000).
 *   medit act <flags>                — Set act flags (sentinel, aggressive, wimpy, etc.).
 *                                       Toggles individual flags: 'medit act sentinel aggressive'.
 *   medit affected <flags>           — Set affected-by flags (sanctuary, invisible, etc.).
 *   medit race <race>                — Set race from RACE_TABLE.
 *   medit class <class>              — Set class from CLASS_TABLE.
 *   medit sex <sex>                  — Set sex (neutral, male, female).
 *   medit gold <amount>              — Set carried gold.
 *   medit silver <amount>            — Set carried silver.
 *   medit copper <amount>            — Set carried copper.
 *   medit position <pos>             — Set default position.
 *   medit defposition <pos>          — Set default standing position (when not fighting).
 *   medit attacks <flags>            — Set attack type flags (bite, claw, sting, punch, etc.).
 *   medit defenses <flags>           — Set defense type flags (dodge, parry, etc.).
 *   medit speaks <languages>         — Set spoken languages.
 *   medit speaking <language>        — Set current speaking language.
 *   medit immune <flags>             — Set damage immunity flags.
 *   medit resistant <flags>          — Set damage resistance flags.
 *   medit susceptible <flags>        — Set damage susceptibility flags.
 *   medit numattacks <num>           — Set number of attacks per round.
 *   medit hitdice <num>d<num>+<num>  — Set HP dice manually (overrides level auto-calc).
 *   medit damdice <num>d<num>+<num>  — Set damage dice manually.
 *   medit hitroll <num>              — Set hitroll bonus.
 *   medit damroll <num>              — Set damroll bonus.
 *   medit str/int/wis/dex/con/cha/lck <num> — Set individual attributes.
 *   medit spec <function_name>       — Set special function.
 *   medit thac0 <num>                — Set THAC0 manually.
 *   medit armor <num>                — Set armor class manually.
 *   medit parts <flags>              — Set body parts (head, arms, legs, tail, etc.).
 *   done                             — Exit editor, mark area as modified.
 */
export function doMedit(ch: Character, argument: string): void {
  const player = ch as Player;
  if (!player.pcData) return;

  const [subCmd, rest] = StringUtils.oneArgument(argument);
  if (!subCmd) {
    ch.sendToChar('Syntax: medit <vnum> | medit create <vnum>\r\n');
    return;
  }

  // Check for 'create' subcommand
  if (subCmd.toLowerCase() === 'create') {
    const vnumStr = rest.trim();
    if (!vnumStr) { ch.sendToChar('Syntax: medit create <vnum>\r\n'); return; }
    const vnum = parseInt(vnumStr, 10);
    if (isNaN(vnum)) { ch.sendToChar('Invalid vnum.\r\n'); return; }
    if (!canModifyVnum(player, vnum, 'mobile')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }
    if (VnumRegistry.getMobilePrototype(vnum)) {
      ch.sendToChar(`Mobile ${vnum} already exists.\r\n`);
      return;
    }

    const proto = new MobilePrototype(vnum);
    proto.name = 'newly created mobile';
    proto.shortDescription = 'a newly created mobile';
    proto.longDescription = 'A newly created mobile stands here.';
    proto.description = '';
    proto.level = 1;
    VnumRegistry.addMobilePrototype(proto);

    // Assign to an area based on vnum range
    const area = AreaManager.findAreaByVnum(vnum, 'mobile');
    if (area) {
      area.mobiles.push(proto);
      area.markModified();
    }

    ch.sendToChar(`Mobile ${vnum} created.\r\n`);
    Logger.info('olc', `${ch.name} created mobile ${vnum}`);

    if (ch.descriptor) {
      ch.descriptor.olcData = { mode: 'mobile', vnum, modified: true };
    }
    return;
  }

  // Check for vnum entry — enter editing mode on existing prototype
  const vnum = parseInt(subCmd, 10);
  if (!isNaN(vnum)) {
    const proto = VnumRegistry.getMobilePrototype(vnum);
    if (!proto) {
      ch.sendToChar(`No mobile with vnum ${vnum}. Use 'medit create ${vnum}' to create.\r\n`);
      return;
    }
    if (!canModifyVnum(player, vnum, 'mobile')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }
    if (ch.descriptor) {
      ch.descriptor.olcData = { mode: 'mobile', vnum, modified: false };
    }
    ch.sendToChar(`[Editing mobile ${vnum}: ${proto.shortDescription}]\r\n`);
    ch.sendToChar("Type 'done' to exit the editor.\r\n");
    return;
  }

  // Must be an editing subcommand — check for active OLC session
  if (!ch.descriptor?.olcData || ch.descriptor.olcData.mode !== 'mobile') {
    ch.sendToChar('You are not currently editing a mobile. Use medit <vnum> first.\r\n');
    return;
  }

  const editVnum = ch.descriptor.olcData.vnum;
  const proto = VnumRegistry.getMobilePrototype(editVnum);
  if (!proto) {
    ch.sendToChar('Error: mobile prototype not found.\r\n');
    return;
  }

  switch (subCmd.toLowerCase()) {
    case 'name':
      proto.name = rest.trim() || proto.name;
      ch.sendToChar(`Name set to: ${proto.name}\r\n`);
      break;
    case 'short':
      proto.shortDescription = rest.trim() || proto.shortDescription;
      ch.sendToChar(`Short description set to: ${proto.shortDescription}\r\n`);
      break;
    case 'long':
      proto.longDescription = rest.trim() || proto.longDescription;
      ch.sendToChar(`Long description set to: ${proto.longDescription}\r\n`);
      break;
    case 'desc':
      if (ch.descriptor) {
        ch.descriptor.olcData.editBuffer = proto.description ? proto.description.split('\n') : [];
        ch.descriptor.olcData.editSubstate = 'SUB_MOB_DESC';
        ch.sendToChar('Enter mob description. /s to save, /c to clear, /l to list.\r\n');
      }
      break;
    case 'level':
      {
        const lvl = parseInt(rest.trim(), 10);
        if (isNaN(lvl) || lvl < 1 || lvl > 100) { ch.sendToChar('Level must be 1-100.\r\n'); return; }
        proto.level = lvl;
        // Auto-calculate combat stats from level
        proto.hitDice = { count: lvl * 8, sides: Math.max(1, Math.floor(lvl / 2)), bonus: lvl * 20 };
        proto.damDice = { count: Math.max(1, Math.floor(lvl / 4)), sides: Math.max(1, Math.floor(lvl / 3)), bonus: Math.floor(lvl / 2) };
        proto.armor = Math.max(-200, -(lvl * 2 + 10));
        proto.thac0 = Math.max(0, Math.floor(20 - lvl * 0.75));
        ch.sendToChar(`Level set to ${lvl}. HP: ${proto.hitDice.count}d${proto.hitDice.sides}+${proto.hitDice.bonus}, Dam: ${proto.damDice.count}d${proto.damDice.sides}+${proto.damDice.bonus}, AC: ${proto.armor}, THAC0: ${proto.thac0}\r\n`);
      }
      break;
    case 'alignment':
    case 'align':
      proto.alignment = Math.max(-1000, Math.min(1000, parseInt(rest.trim(), 10)));
      ch.sendToChar(`Alignment set to: ${proto.alignment}\r\n`);
      break;
    case 'act':
      proto.actFlags = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Act flags set to: ${BitVector.toString(proto.actFlags)}\r\n`);
      break;
    case 'affected':
      proto.affectedBy = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Affected-by flags set to: ${BitVector.toString(proto.affectedBy)}\r\n`);
      break;
    case 'race':
      proto.race = rest.trim().toLowerCase();
      ch.sendToChar(`Race set to: ${proto.race}\r\n`);
      break;
    case 'class':
      proto.charClass = rest.trim().toLowerCase();
      ch.sendToChar(`Class set to: ${proto.charClass}\r\n`);
      break;
    case 'sex':
      {
        const sexMap: Record<string, number> = { neutral: 0, male: 1, female: 2 };
        const s = sexMap[rest.trim().toLowerCase()];
        if (s !== undefined) { proto.sex = s; ch.sendToChar(`Sex set to: ${rest.trim()}\r\n`); }
        else { ch.sendToChar('Sex must be: neutral, male, or female.\r\n'); }
      }
      break;
    case 'gold':
      proto.gold = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Gold set to: ${proto.gold}\r\n`);
      break;
    case 'silver':
      proto.silver = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Silver set to: ${proto.silver}\r\n`);
      break;
    case 'copper':
      proto.copper = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Copper set to: ${proto.copper}\r\n`);
      break;
    case 'position':
      proto.position = parsePosition(rest.trim());
      ch.sendToChar(`Position set to: ${rest.trim()}\r\n`);
      break;
    case 'defposition':
      proto.defaultPosition = parsePosition(rest.trim());
      ch.sendToChar(`Default position set to: ${rest.trim()}\r\n`);
      break;
    case 'attacks':
      proto.attacks = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Attack flags set to: ${BitVector.toString(proto.attacks)}\r\n`);
      break;
    case 'defenses':
      proto.defenses = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Defense flags set to: ${BitVector.toString(proto.defenses)}\r\n`);
      break;
    case 'speaks':
      proto.speaks = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Speaks set to: ${BitVector.toString(proto.speaks)}\r\n`);
      break;
    case 'speaking':
      proto.speaking = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Speaking set to: ${BitVector.toString(proto.speaking)}\r\n`);
      break;
    case 'immune':
      proto.immune = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Immune set to: ${BitVector.toString(proto.immune)}\r\n`);
      break;
    case 'resistant':
      proto.resistant = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Resistant set to: ${BitVector.toString(proto.resistant)}\r\n`);
      break;
    case 'susceptible':
      proto.susceptible = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Susceptible set to: ${BitVector.toString(proto.susceptible)}\r\n`);
      break;
    case 'numattacks':
      proto.numAttacks = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Number of attacks set to: ${proto.numAttacks}\r\n`);
      break;
    case 'hitdice':
      {
        const dice = parseDiceString(rest.trim());
        if (dice) { proto.hitDice = dice; ch.sendToChar(`HP dice set to: ${rest.trim()}\r\n`); }
        else { ch.sendToChar('Invalid dice format. Use NdN+N (e.g., 10d8+100).\r\n'); }
      }
      break;
    case 'damdice':
      {
        const dice = parseDiceString(rest.trim());
        if (dice) { proto.damDice = dice; ch.sendToChar(`Damage dice set to: ${rest.trim()}\r\n`); }
        else { ch.sendToChar('Invalid dice format. Use NdN+N.\r\n'); }
      }
      break;
    case 'hitroll':
      proto.hitroll = parseInt(rest.trim(), 10);
      ch.sendToChar(`Hitroll set to: ${proto.hitroll}\r\n`);
      break;
    case 'damroll':
      proto.damroll = parseInt(rest.trim(), 10);
      ch.sendToChar(`Damroll set to: ${proto.damroll}\r\n`);
      break;
    case 'str': proto.permStr = Math.max(3, Math.min(25, parseInt(rest.trim(), 10))); ch.sendToChar(`Str set to: ${proto.permStr}\r\n`); break;
    case 'int': proto.permInt = Math.max(3, Math.min(25, parseInt(rest.trim(), 10))); ch.sendToChar(`Int set to: ${proto.permInt}\r\n`); break;
    case 'wis': proto.permWis = Math.max(3, Math.min(25, parseInt(rest.trim(), 10))); ch.sendToChar(`Wis set to: ${proto.permWis}\r\n`); break;
    case 'dex': proto.permDex = Math.max(3, Math.min(25, parseInt(rest.trim(), 10))); ch.sendToChar(`Dex set to: ${proto.permDex}\r\n`); break;
    case 'con': proto.permCon = Math.max(3, Math.min(25, parseInt(rest.trim(), 10))); ch.sendToChar(`Con set to: ${proto.permCon}\r\n`); break;
    case 'cha': proto.permCha = Math.max(3, Math.min(25, parseInt(rest.trim(), 10))); ch.sendToChar(`Cha set to: ${proto.permCha}\r\n`); break;
    case 'lck': proto.permLck = Math.max(3, Math.min(25, parseInt(rest.trim(), 10))); ch.sendToChar(`Lck set to: ${proto.permLck}\r\n`); break;
    case 'thac0':
      proto.thac0 = parseInt(rest.trim(), 10);
      ch.sendToChar(`THAC0 set to: ${proto.thac0}\r\n`);
      break;
    case 'armor':
      proto.armor = parseInt(rest.trim(), 10);
      ch.sendToChar(`Armor set to: ${proto.armor}\r\n`);
      break;
    case 'parts':
      proto.bodyParts = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Body parts set to: ${BitVector.toString(proto.bodyParts)}\r\n`);
      break;
    case 'spec':
      proto.specFun = rest.trim();
      ch.sendToChar(`Special function set to: ${proto.specFun}\r\n`);
      break;
    case 'done':
      ch.descriptor.olcData = undefined;
      const area = AreaManager.findAreaByVnum(editVnum, 'mobile');
      area?.markModified();
      ch.sendToChar('Exited mobile editor. Area marked as modified.\r\n');
      break;
    default:
      ch.sendToChar(`Unknown medit subcommand: '${subCmd}'. Valid: name short long desc level alignment act affected race class sex gold silver copper position defposition attacks defenses speaks speaking immune resistant susceptible numattacks hitdice damdice hitroll damroll str int wis dex con cha lck thac0 armor parts spec done\r\n`);
      break;
  }

  if (subCmd.toLowerCase() !== 'done' && ch.descriptor?.olcData) {
    ch.descriptor.olcData.modified = true;
  }
}
```

#### 2.4 Object Editor (`oedit`)

```typescript
/**
 * Object editor command handler.
 * Syntax: oedit <vnum> | oedit create <vnum> | oedit <subcommand>
 *
 * Replicates legacy do_oedit() from build.c.
 *
 * 'oedit <vnum>': Enter editing mode on an existing object prototype.
 * 'oedit create <vnum>': Create a new object prototype at the specified vnum.
 *
 * Subcommands (while in editing mode):
 *   oedit name <text>                — Set object keywords/name.
 *   oedit short <text>               — Set short description (e.g., "a long sword").
 *   oedit long <text>                — Set long/room description (e.g., "A long sword lies here.").
 *   oedit desc                       — Enter text editor for full description.
 *   oedit type <item_type>           — Set item type (weapon, armor, container, potion,
 *                                       scroll, wand, staff, pill, food, drink_con,
 *                                       fountain, light, money, boat, corpse_npc, key,
 *                                       treasure, furniture, trash, map, portal,
 *                                       trap, etc.).
 *   oedit flags <extra_flags>        — Set extra flags (glow, hum, dark, loyal, evil,
 *                                       invis, magic, nodrop, bless, anti_good, anti_evil,
 *                                       anti_neutral, noremove, inventory, deathrot,
 *                                       donation, clanobj, clancorpse, prototype, etc.).
 *   oedit wear <wear_flags>          — Set wear flags (take, finger, neck, body,
 *                                       head, legs, feet, hands, arms, shield, about,
 *                                       waist, wrist, wield, hold, dual, ears, eyes,
 *                                       missile, back, face, ankle, etc.).
 *   oedit weight <num>               — Set weight.
 *   oedit cost <amount>              — Set cost in gold.
 *   oedit level <num>                — Set minimum level.
 *   oedit timer <num>                — Set object timer (-1 = no timer).
 *   oedit value0 <num>               — Set type-specific value 0.
 *   oedit value1 <num>               — Set type-specific value 1.
 *   oedit value2 <num>               — Set type-specific value 2.
 *   oedit value3 <num>               — Set type-specific value 3.
 *   oedit value4 <num>               — Set type-specific value 4.
 *   oedit value5 <num>               — Set type-specific value 5.
 *
 * Value meanings by type (from DATAMODEL.md):
 *   weapon:     v0=condition, v1=numDice, v2=sizeDice, v3=attackType, v4=special
 *   armor:      v0=AC, v1=condition
 *   container:  v0=capacity, v1=flags, v2=key_vnum, v3=condition
 *   food:       v0=hours_food, v1=hours_full, v3=poisoned(1/0)
 *   drink_con:  v0=capacity, v1=current, v2=liquid_type, v3=poisoned
 *   light:      v2=hours_remaining (-1=infinite)
 *   potion:     v0=spell_level, v1-v3=spell_gsn
 *   scroll:     v0=spell_level, v1-v3=spell_gsn
 *   wand:       v0=spell_level, v1=max_charges, v2=current_charges, v3=spell_gsn
 *   staff:      v0=spell_level, v1=max_charges, v2=current_charges, v3=spell_gsn
 *   pill:       v0=spell_level, v1-v3=spell_gsn
 *   portal:     v0=charges(-1=inf), v1=exit_flags, v2=key_vnum, v3=dest_vnum
 *   trap:       v0=charges, v1=trap_type, v2=damage_dice, v3=trigger_flags
 *   money:      v0=gold, v1=silver, v2=copper
 *   furniture:  v0=max_people, v1=max_weight, v2=furniture_flags
 *
 *   oedit affect <apply_type> <mod>  — Add an object affect.
 *                                       apply_type: str, dex, int, wis, con, cha, lck,
 *                                       sex, class, level, age, mana, hp, move, gold,
 *                                       ac, hitroll, damroll, saves, etc.
 *   oedit rmaffect <index>           — Remove object affect by index.
 *   oedit ed <keyword>               — Add/edit extra description.
 *   oedit rmed <keyword>             — Remove extra description.
 *   oedit layers <layer_value>       — Set layer value for equipment stacking.
 *   done                             — Exit editor, mark area as modified.
 */
export function doOedit(ch: Character, argument: string): void {
  const player = ch as Player;
  if (!player.pcData) return;

  const [subCmd, rest] = StringUtils.oneArgument(argument);
  if (!subCmd) {
    ch.sendToChar('Syntax: oedit <vnum> | oedit create <vnum>\r\n');
    return;
  }

  // Create subcommand
  if (subCmd.toLowerCase() === 'create') {
    const vnumStr = rest.trim();
    if (!vnumStr) { ch.sendToChar('Syntax: oedit create <vnum>\r\n'); return; }
    const vnum = parseInt(vnumStr, 10);
    if (isNaN(vnum)) { ch.sendToChar('Invalid vnum.\r\n'); return; }
    if (!canModifyVnum(player, vnum, 'object')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }
    if (VnumRegistry.getObjectPrototype(vnum)) {
      ch.sendToChar(`Object ${vnum} already exists.\r\n`);
      return;
    }

    const proto = new ObjectPrototype(vnum);
    proto.name = 'newly created object';
    proto.shortDescription = 'a newly created object';
    proto.description = 'A newly created object is here.';
    proto.level = 1;
    proto.weight = 1;
    proto.cost = 0;
    proto.values = [0, 0, 0, 0, 0, 0];
    VnumRegistry.addObjectPrototype(proto);

    const area = AreaManager.findAreaByVnum(vnum, 'object');
    if (area) {
      area.objects.push(proto);
      area.markModified();
    }

    ch.sendToChar(`Object ${vnum} created.\r\n`);
    Logger.info('olc', `${ch.name} created object ${vnum}`);

    if (ch.descriptor) {
      ch.descriptor.olcData = { mode: 'object', vnum, modified: true };
    }
    return;
  }

  // Enter editing mode by vnum
  const vnum = parseInt(subCmd, 10);
  if (!isNaN(vnum)) {
    const proto = VnumRegistry.getObjectPrototype(vnum);
    if (!proto) {
      ch.sendToChar(`No object with vnum ${vnum}. Use 'oedit create ${vnum}' to create.\r\n`);
      return;
    }
    if (!canModifyVnum(player, vnum, 'object')) {
      ch.sendToChar('That vnum is not in your assigned range.\r\n');
      return;
    }
    if (ch.descriptor) {
      ch.descriptor.olcData = { mode: 'object', vnum, modified: false };
    }
    ch.sendToChar(`[Editing object ${vnum}: ${proto.shortDescription}]\r\n`);
    ch.sendToChar("Type 'done' to exit the editor.\r\n");
    return;
  }

  // Editing subcommand
  if (!ch.descriptor?.olcData || ch.descriptor.olcData.mode !== 'object') {
    ch.sendToChar('You are not currently editing an object. Use oedit <vnum> first.\r\n');
    return;
  }

  const editVnum = ch.descriptor.olcData.vnum;
  const proto = VnumRegistry.getObjectPrototype(editVnum);
  if (!proto) {
    ch.sendToChar('Error: object prototype not found.\r\n');
    return;
  }

  switch (subCmd.toLowerCase()) {
    case 'name':
      proto.name = rest.trim() || proto.name;
      ch.sendToChar(`Name set to: ${proto.name}\r\n`);
      break;
    case 'short':
      proto.shortDescription = rest.trim() || proto.shortDescription;
      ch.sendToChar(`Short description set to: ${proto.shortDescription}\r\n`);
      break;
    case 'long':
      proto.description = rest.trim() || proto.description;
      ch.sendToChar(`Long description set to: ${proto.description}\r\n`);
      break;
    case 'desc':
      if (ch.descriptor) {
        ch.descriptor.olcData.editBuffer = proto.actionDescription ? proto.actionDescription.split('\n') : [];
        ch.descriptor.olcData.editSubstate = 'SUB_OBJ_EXTRA';
        ch.sendToChar('Enter object description. /s to save, /c to clear.\r\n');
      }
      break;
    case 'type':
      proto.itemType = parseItemType(rest.trim());
      ch.sendToChar(`Item type set to: ${rest.trim()}\r\n`);
      break;
    case 'flags':
    case 'extra':
      proto.extraFlags = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Extra flags set to: ${BitVector.toString(proto.extraFlags)}\r\n`);
      break;
    case 'wear':
      proto.wearFlags = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Wear flags set to: ${BitVector.toString(proto.wearFlags)}\r\n`);
      break;
    case 'weight':
      proto.weight = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Weight set to: ${proto.weight}\r\n`);
      break;
    case 'cost':
      proto.cost = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Cost set to: ${proto.cost}\r\n`);
      break;
    case 'level':
      proto.level = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Level set to: ${proto.level}\r\n`);
      break;
    case 'timer':
      proto.timer = parseInt(rest.trim(), 10);
      ch.sendToChar(`Timer set to: ${proto.timer}\r\n`);
      break;
    case 'value0': proto.values[0] = parseInt(rest.trim(), 10); ch.sendToChar(`Value0 set to: ${proto.values[0]}\r\n`); break;
    case 'value1': proto.values[1] = parseInt(rest.trim(), 10); ch.sendToChar(`Value1 set to: ${proto.values[1]}\r\n`); break;
    case 'value2': proto.values[2] = parseInt(rest.trim(), 10); ch.sendToChar(`Value2 set to: ${proto.values[2]}\r\n`); break;
    case 'value3': proto.values[3] = parseInt(rest.trim(), 10); ch.sendToChar(`Value3 set to: ${proto.values[3]}\r\n`); break;
    case 'value4': proto.values[4] = parseInt(rest.trim(), 10); ch.sendToChar(`Value4 set to: ${proto.values[4]}\r\n`); break;
    case 'value5': proto.values[5] = parseInt(rest.trim(), 10); ch.sendToChar(`Value5 set to: ${proto.values[5]}\r\n`); break;
    case 'affect':
      {
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 2) { ch.sendToChar('Syntax: oedit affect <apply_type> <modifier>\r\n'); return; }
        const applyType = parseApplyType(parts[0]);
        const modifier = parseInt(parts[1], 10);
        if (applyType === undefined || isNaN(modifier)) { ch.sendToChar('Invalid apply type or modifier.\r\n'); return; }
        proto.affects.push({ location: applyType, modifier });
        ch.sendToChar(`Affect added: ${parts[0]} ${modifier}\r\n`);
      }
      break;
    case 'rmaffect':
      {
        const idx = parseInt(rest.trim(), 10);
        if (isNaN(idx) || idx < 0 || idx >= proto.affects.length) {
          ch.sendToChar('Invalid affect index.\r\n');
          return;
        }
        proto.affects.splice(idx, 1);
        ch.sendToChar('Affect removed.\r\n');
      }
      break;
    case 'ed':
      {
        const [keyword] = StringUtils.oneArgument(rest);
        if (!keyword) { ch.sendToChar('Syntax: oedit ed <keyword>\r\n'); return; }
        if (ch.descriptor) {
          ch.descriptor.olcData.editBuffer = [];
          ch.descriptor.olcData.editSubstate = `SUB_OBJ_EXTRA:${keyword}`;
          ch.sendToChar(`Editing extra description for keyword '${keyword}'. /s to save.\r\n`);
        }
      }
      break;
    case 'rmed':
      {
        const [keyword] = StringUtils.oneArgument(rest);
        if (!keyword) { ch.sendToChar('Syntax: oedit rmed <keyword>\r\n'); return; }
        const idx = proto.extraDescriptions.findIndex(
          ed => ed.keyword.toLowerCase() === keyword.toLowerCase()
        );
        if (idx >= 0) {
          proto.extraDescriptions.splice(idx, 1);
          ch.sendToChar(`Extra description '${keyword}' removed.\r\n`);
        } else {
          ch.sendToChar('No extra description with that keyword.\r\n');
        }
      }
      break;
    case 'layers':
      proto.layers = parseInt(rest.trim(), 10);
      ch.sendToChar(`Layers set to: ${proto.layers}\r\n`);
      break;
    case 'done':
      ch.descriptor.olcData = undefined;
      const area = AreaManager.findAreaByVnum(editVnum, 'object');
      area?.markModified();
      ch.sendToChar('Exited object editor. Area marked as modified.\r\n');
      break;
    default:
      ch.sendToChar(`Unknown oedit subcommand: '${subCmd}'.\r\n`);
      ch.sendToChar('Valid: name short long desc type flags wear weight cost level timer value0-5 affect rmaffect ed rmed layers done\r\n');
      break;
  }

  if (subCmd.toLowerCase() !== 'done' && ch.descriptor?.olcData) {
    ch.descriptor.olcData.modified = true;
  }
}
```

#### 2.5 MUDprog Editor (`mpedit`)

```typescript
/**
 * MUDprog editor. Add, edit, delete, and list MUDprogs on entities.
 * Syntax: mpedit <mob|obj|room> <vnum> <subcommand>
 *
 * Replicates legacy do_mpedit() from build.c and mpxset.c.
 *
 * Subcommands:
 *   mpedit <type> <vnum> add <trigger_type> <argument>
 *       — Add a new program. Enter text editor for the program's command list.
 *         Trigger types: act, speech, rand, fight, greet, allgreet, entry,
 *         give, bribe, death, time, hour, login, void, keyword, social,
 *         tell, command, hpchange, use, get, drop, damage, repair, pull,
 *         push, sleep, rest, leave, script, exit, load.
 *
 *   mpedit <type> <vnum> edit <number>
 *       — Enter text editor for an existing program's command list.
 *         The number is the 1-based index of the program on the entity.
 *
 *   mpedit <type> <vnum> delete <number>
 *       — Remove a program by its 1-based index.
 *
 *   mpedit <type> <vnum> list
 *       — List all programs on the entity with their trigger types,
 *         arguments, and the first line of each program's command list.
 *
 * After editing, the containing area is marked as modified.
 */
export function doMpedit(ch: Character, argument: string): void {
  const player = ch as Player;
  if (!player.pcData) return;

  const [typeStr, rest1] = StringUtils.oneArgument(argument);
  const [vnumStr, rest2] = StringUtils.oneArgument(rest1);
  const [subCmd, rest3] = StringUtils.oneArgument(rest2);

  if (!typeStr || !vnumStr || !subCmd) {
    ch.sendToChar('Syntax: mpedit <mob|obj|room> <vnum> <add|edit|delete|list> [args]\r\n');
    return;
  }

  const vnum = parseInt(vnumStr, 10);
  if (isNaN(vnum)) { ch.sendToChar('Invalid vnum.\r\n'); return; }

  // Get the entity's program list
  let progs: MudProgEntry[] | null = null;
  let entityName = '';

  switch (typeStr.toLowerCase()) {
    case 'mob':
      {
        const proto = VnumRegistry.getMobilePrototype(vnum);
        if (!proto) { ch.sendToChar('No mobile with that vnum.\r\n'); return; }
        if (!canModifyVnum(player, vnum, 'mobile')) { ch.sendToChar('Vnum not in your range.\r\n'); return; }
        progs = proto.programs;
        entityName = proto.shortDescription;
      }
      break;
    case 'obj':
      {
        const proto = VnumRegistry.getObjectPrototype(vnum);
        if (!proto) { ch.sendToChar('No object with that vnum.\r\n'); return; }
        if (!canModifyVnum(player, vnum, 'object')) { ch.sendToChar('Vnum not in your range.\r\n'); return; }
        progs = proto.programs;
        entityName = proto.shortDescription;
      }
      break;
    case 'room':
      {
        const room = VnumRegistry.getRoom(vnum);
        if (!room) { ch.sendToChar('No room with that vnum.\r\n'); return; }
        if (!canModifyVnum(player, vnum, 'room')) { ch.sendToChar('Vnum not in your range.\r\n'); return; }
        progs = room.programs;
        entityName = room.name;
      }
      break;
    default:
      ch.sendToChar('Type must be: mob, obj, or room.\r\n');
      return;
  }

  if (!progs) {
    ch.sendToChar('This entity does not support programs.\r\n');
    return;
  }

  switch (subCmd.toLowerCase()) {
    case 'list':
      if (progs.length === 0) {
        ch.sendToChar(`No programs on ${entityName} (${vnum}).\r\n`);
        return;
      }
      ch.sendToChar(`&c--- Programs on ${entityName} (${vnum}) ---&w\r\n`);
      for (let i = 0; i < progs.length; i++) {
        const prog = progs[i];
        const firstLine = prog.commandList.split('\n')[0] || '(empty)';
        ch.sendToChar(`  ${i + 1}. [${prog.triggerType}] ${prog.argument} — ${firstLine}\r\n`);
      }
      break;

    case 'add':
      {
        const [trigType, trigArg] = StringUtils.oneArgument(rest3);
        if (!trigType) { ch.sendToChar('Syntax: mpedit <type> <vnum> add <trigger_type> [argument]\r\n'); return; }
        const newProg: MudProgEntry = {
          triggerType: trigType.toLowerCase(),
          argument: trigArg || '',
          commandList: '',
        };
        progs.push(newProg);
        const idx = progs.length;

        if (ch.descriptor) {
          ch.descriptor.olcData = {
            mode: 'mpedit',
            vnum,
            modified: true,
            editBuffer: [],
            editSubstate: `SUB_MPROG_EDIT:${typeStr}:${vnum}:${idx - 1}`,
          };
          ch.sendToChar(`Program #${idx} added (trigger: ${trigType}). Enter commands. /s to save.\r\n`);
        }
      }
      break;

    case 'edit':
      {
        const idx = parseInt(rest3.trim(), 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= progs.length) {
          ch.sendToChar('Invalid program number.\r\n');
          return;
        }

        if (ch.descriptor) {
          ch.descriptor.olcData = {
            mode: 'mpedit',
            vnum,
            modified: true,
            editBuffer: progs[idx].commandList ? progs[idx].commandList.split('\n') : [],
            editSubstate: `SUB_MPROG_EDIT:${typeStr}:${vnum}:${idx}`,
          };
          ch.sendToChar(`Editing program #${idx + 1}. /s to save, /l to list, /c to clear.\r\n`);
          if (progs[idx].commandList) {
            ch.sendToChar(progs[idx].commandList + '\r\n');
          }
        }
      }
      break;

    case 'delete':
      {
        const idx = parseInt(rest3.trim(), 10) - 1;
        if (isNaN(idx) || idx < 0 || idx >= progs.length) {
          ch.sendToChar('Invalid program number.\r\n');
          return;
        }
        progs.splice(idx, 1);
        ch.sendToChar(`Program #${idx + 1} deleted.\r\n`);
        const area = AreaManager.findAreaByVnum(vnum, typeStr.toLowerCase() as any);
        area?.markModified();
      }
      break;

    default:
      ch.sendToChar('Subcommand must be: add, edit, delete, or list.\r\n');
      break;
  }
}

interface MudProgEntry {
  triggerType: string;
  argument: string;
  commandList: string;
}
```

#### 2.6 Area Editor (`aedit`)

```typescript
/**
 * Area editor command handler.
 * Syntax: aedit [subcommand] [arguments]
 *
 * Replicates legacy do_aedit() from build.c.
 *
 * Without argument: Edit the area that contains the current room.
 *
 * Subcommands:
 *   aedit name <text>              — Set area name.
 *   aedit author <name>            — Set area author.
 *   aedit resetmsg <text>          — Set area reset message.
 *   aedit resetfreq <pulses>       — Set reset frequency in ticks (default 15).
 *   aedit lowlevel <num>           — Set recommended low level.
 *   aedit highlevel <num>          — Set recommended high level.
 *   aedit lowvnum <num>            — Set low vnum range for the area.
 *   aedit highvnum <num>           — Set high vnum range for the area.
 *   aedit flags <flags>            — Set area flags (nopkill, freekill, etc.).
 *   aedit climate <temp> <precip> <wind> — Set climate defaults for weather.
 *   done                           — Exit editor, mark area as modified.
 */
export function doAedit(ch: Character, argument: string): void {
  const player = ch as Player;
  if (!player.pcData) return;

  if (!ch.inRoom || !ch.inRoom.area) {
    ch.sendToChar('You are not in an area.\r\n');
    return;
  }

  const area = ch.inRoom.area;
  const [subCmd, rest] = StringUtils.oneArgument(argument);

  if (!subCmd) {
    ch.sendToChar(`[Editing area: ${area.name}]\r\n`);
    ch.sendToChar(`Author: ${area.author}\r\n`);
    ch.sendToChar(`Vnums: ${area.lowVnum}-${area.highVnum}\r\n`);
    ch.sendToChar(`Levels: ${area.lowLevel}-${area.highLevel}\r\n`);
    ch.sendToChar(`Reset frequency: ${area.resetFrequency}\r\n`);
    ch.sendToChar(`Reset message: ${area.resetMessage}\r\n`);
    ch.sendToChar("Type 'aedit ?' for subcommands.\r\n");
    return;
  }

  if (subCmd === '?') {
    ch.sendToChar('Aedit subcommands:\r\n');
    ch.sendToChar('  name <text>         author <name>        resetmsg <text>\r\n');
    ch.sendToChar('  resetfreq <ticks>   lowlevel <num>       highlevel <num>\r\n');
    ch.sendToChar('  lowvnum <num>       highvnum <num>       flags <flags>\r\n');
    ch.sendToChar('  climate <t> <p> <w> done\r\n');
    return;
  }

  switch (subCmd.toLowerCase()) {
    case 'name':
      area.name = rest.trim();
      ch.sendToChar(`Area name set to: ${area.name}\r\n`);
      break;
    case 'author':
      area.author = rest.trim();
      ch.sendToChar(`Author set to: ${area.author}\r\n`);
      break;
    case 'resetmsg':
      area.resetMessage = rest.trim();
      ch.sendToChar(`Reset message set to: ${area.resetMessage}\r\n`);
      break;
    case 'resetfreq':
      area.resetFrequency = Math.max(1, parseInt(rest.trim(), 10));
      ch.sendToChar(`Reset frequency set to: ${area.resetFrequency}\r\n`);
      break;
    case 'lowlevel':
      area.lowLevel = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Low level set to: ${area.lowLevel}\r\n`);
      break;
    case 'highlevel':
      area.highLevel = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`High level set to: ${area.highLevel}\r\n`);
      break;
    case 'lowvnum':
      area.lowVnum = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`Low vnum set to: ${area.lowVnum}\r\n`);
      break;
    case 'highvnum':
      area.highVnum = Math.max(0, parseInt(rest.trim(), 10));
      ch.sendToChar(`High vnum set to: ${area.highVnum}\r\n`);
      break;
    case 'flags':
      area.flags = BitVector.parseFlags(rest.trim());
      ch.sendToChar(`Area flags set to: ${BitVector.toString(area.flags)}\r\n`);
      break;
    case 'climate':
      {
        const parts = rest.trim().split(/\s+/);
        if (parts.length < 3) { ch.sendToChar('Syntax: aedit climate <temp> <precip> <wind>\r\n'); return; }
        area.climate = {
          temperature: parseInt(parts[0], 10),
          precipitation: parseInt(parts[1], 10),
          wind: parseInt(parts[2], 10),
        };
        ch.sendToChar(`Climate set: temp=${area.climate.temperature} precip=${area.climate.precipitation} wind=${area.climate.wind}\r\n`);
      }
      break;
    case 'done':
      area.markModified();
      ch.sendToChar('Exited area editor. Area marked as modified.\r\n');
      break;
    default:
      ch.sendToChar(`Unknown aedit subcommand: '${subCmd}'. Type 'aedit ?' for help.\r\n`);
      break;
  }

  if (subCmd.toLowerCase() !== 'done') {
    area.markModified();
  }
}
```

#### 2.7 OLC Text Editor Integration

```typescript
/**
 * Text editor input handler for OLC substates.
 * Called from ConnectionManager when the player is in an editing substate.
 *
 * Replicates legacy string_add() from db.c and the editor loop in build.c.
 *
 * Editor commands:
 *   /s — Save the buffer and exit the editor. Applies the text to the
 *         appropriate entity field based on the editSubstate tag.
 *   /c — Clear the edit buffer.
 *   /l — List the current contents of the edit buffer.
 *   /a — Abort editing without saving.
 *   Any other line — Append to the edit buffer.
 *
 * The editSubstate string encodes what we're editing:
 *   'SUB_ROOM_DESC'           — Room description (room identified by olcData.vnum)
 *   'SUB_ROOM_EXTRA:<kw>'     — Room extra description for keyword <kw>
 *   'SUB_EXIT_DESC:<dir>'     — Exit description for direction <dir>
 *   'SUB_MOB_DESC'            — Mobile prototype full description
 *   'SUB_OBJ_EXTRA'           — Object action description
 *   'SUB_OBJ_EXTRA:<kw>'      — Object extra description for keyword <kw>
 *   'SUB_MPROG_EDIT:<t>:<v>:<i>' — MUDprog command list (type, vnum, index)
 */
export function handleEditorInput(ch: Character, input: string): boolean {
  if (!ch.descriptor?.olcData?.editSubstate) return false;

  const olc = ch.descriptor.olcData;
  if (!olc.editBuffer) olc.editBuffer = [];

  if (input.startsWith('/')) {
    const cmd = input.substring(1).toLowerCase().trim();
    switch (cmd) {
      case 's':
        saveEditorBuffer(ch, olc);
        olc.editSubstate = undefined;
        olc.editBuffer = undefined;
        ch.sendToChar('Text saved.\r\n');
        return true;

      case 'c':
        olc.editBuffer = [];
        ch.sendToChar('Buffer cleared.\r\n');
        return true;

      case 'l':
        if (olc.editBuffer.length === 0) {
          ch.sendToChar('(empty)\r\n');
        } else {
          for (let i = 0; i < olc.editBuffer.length; i++) {
            ch.sendToChar(`${i + 1}: ${olc.editBuffer[i]}\r\n`);
          }
        }
        return true;

      case 'a':
        olc.editSubstate = undefined;
        olc.editBuffer = undefined;
        ch.sendToChar('Editing aborted.\r\n');
        return true;
    }
  }

  // Append line to buffer
  olc.editBuffer.push(input);
  return true;
}

/**
 * Apply the edit buffer to the appropriate entity field.
 */
function saveEditorBuffer(ch: Character, olc: OlcEditorData): void {
  const text = olc.editBuffer?.join('\n') ?? '';
  const substate = olc.editSubstate ?? '';

  if (substate === 'SUB_ROOM_DESC') {
    const room = VnumRegistry.getRoom(olc.vnum);
    if (room) {
      room.description = text;
      room.area?.markModified();
    }
  } else if (substate.startsWith('SUB_ROOM_EXTRA:')) {
    const keyword = substate.substring('SUB_ROOM_EXTRA:'.length);
    const room = VnumRegistry.getRoom(olc.vnum);
    if (room) {
      const existing = room.extraDescriptions.find(ed => ed.keyword.toLowerCase() === keyword.toLowerCase());
      if (existing) {
        existing.description = text;
      } else {
        room.extraDescriptions.push({ keyword, description: text });
      }
      room.area?.markModified();
    }
  } else if (substate.startsWith('SUB_EXIT_DESC:')) {
    const dir = parseInt(substate.substring('SUB_EXIT_DESC:'.length), 10);
    const room = VnumRegistry.getRoom(olc.vnum);
    if (room) {
      const exit = room.getExit(dir);
      if (exit) {
        exit.description = text;
        room.area?.markModified();
      }
    }
  } else if (substate === 'SUB_MOB_DESC') {
    const proto = VnumRegistry.getMobilePrototype(olc.vnum);
    if (proto) {
      proto.description = text;
      const area = AreaManager.findAreaByVnum(olc.vnum, 'mobile');
      area?.markModified();
    }
  } else if (substate === 'SUB_OBJ_EXTRA') {
    const proto = VnumRegistry.getObjectPrototype(olc.vnum);
    if (proto) {
      proto.actionDescription = text;
      const area = AreaManager.findAreaByVnum(olc.vnum, 'object');
      area?.markModified();
    }
  } else if (substate.startsWith('SUB_OBJ_EXTRA:')) {
    const keyword = substate.substring('SUB_OBJ_EXTRA:'.length);
    const proto = VnumRegistry.getObjectPrototype(olc.vnum);
    if (proto) {
      const existing = proto.extraDescriptions.find(ed => ed.keyword.toLowerCase() === keyword.toLowerCase());
      if (existing) {
        existing.description = text;
      } else {
        proto.extraDescriptions.push({ keyword, description: text });
      }
      const area = AreaManager.findAreaByVnum(olc.vnum, 'object');
      area?.markModified();
    }
  } else if (substate.startsWith('SUB_MPROG_EDIT:')) {
    const parts = substate.substring('SUB_MPROG_EDIT:'.length).split(':');
    if (parts.length >= 3) {
      const [type, vnumStr, idxStr] = parts;
      const progVnum = parseInt(vnumStr, 10);
      const progIdx = parseInt(idxStr, 10);
      let progs: MudProgEntry[] | null = null;

      if (type === 'mob') {
        const proto = VnumRegistry.getMobilePrototype(progVnum);
        progs = proto?.programs ?? null;
      } else if (type === 'obj') {
        const proto = VnumRegistry.getObjectPrototype(progVnum);
        progs = proto?.programs ?? null;
      } else if (type === 'room') {
        const room = VnumRegistry.getRoom(progVnum);
        progs = room?.programs ?? null;
      }

      if (progs && progIdx >= 0 && progIdx < progs.length) {
        progs[progIdx].commandList = text;
        const area = AreaManager.findAreaByVnum(progVnum, type as any);
        area?.markModified();
      }
    }
  }
}
```

#### 2.8 OLC Save Command

```typescript
/**
 * Save all modified areas to disk.
 * Syntax: savearea | asave
 *
 * Replicates legacy do_savearea() / fold_area() from build.c.
 * Only saves areas that have been marked as modified.
 * Uses WorldRepository to write JSON files.
 */
export function doSaveArea(ch: Character, argument: string): void {
  const [arg] = StringUtils.oneArgument(argument);

  if (arg && arg.toLowerCase() === 'all') {
    const areas = AreaManager.getAllAreas();
    let count = 0;
    for (const area of areas) {
      WorldRepository.saveArea(area);
      area.clearModified();
      count++;
    }
    ch.sendToChar(`${count} areas saved.\r\n`);
    Logger.info('olc', `${ch.name} saved all ${count} areas`);
    return;
  }

  // Save only modified areas
  const areas = AreaManager.getAllAreas().filter(a => a.isModified);
  if (areas.length === 0) {
    ch.sendToChar('No areas have been modified.\r\n');
    return;
  }

  for (const area of areas) {
    WorldRepository.saveArea(area);
    area.clearModified();
  }

  ch.sendToChar(`${areas.length} modified area(s) saved.\r\n`);
  Logger.info('olc', `${ch.name} saved ${areas.length} modified areas`);
}
```

#### 2.9 OLC Utility Functions

```typescript
/**
 * Parse a direction string to numeric direction index.
 * Returns undefined if invalid.
 */
function parseDirection(str: string): number | undefined {
  const dirMap: Record<string, number> = {
    north: 0, n: 0, east: 1, e: 1, south: 2, s: 2,
    west: 3, w: 3, up: 4, u: 4, down: 5, d: 5,
    northeast: 6, ne: 6, northwest: 7, nw: 7,
    southeast: 8, se: 8, southwest: 9, sw: 9,
  };
  return dirMap[str.toLowerCase()];
}

function directionName(dir: number): string {
  const names = ['north', 'east', 'south', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'];
  return names[dir] ?? 'unknown';
}

function reverseDirection(dir: number): number {
  const rev = [2, 3, 0, 1, 5, 4, 9, 8, 7, 6]; // n→s, e→w, etc.
  return rev[dir] ?? dir;
}

function parseSectorType(str: string): number {
  const map: Record<string, number> = {
    inside: 0, city: 1, field: 2, forest: 3, hills: 4,
    mountain: 5, water_swim: 6, water_noswim: 7,
    underwater: 8, air: 9, desert: 10, lava: 14, swamp: 15,
    underground: 13,
  };
  return map[str.toLowerCase()] ?? 0;
}

function parsePosition(str: string): number {
  const map: Record<string, number> = {
    dead: 0, mortal: 1, incap: 2, stunned: 3, sleeping: 4,
    resting: 6, sitting: 8, fighting: 9, standing: 12,
  };
  return map[str.toLowerCase()] ?? 12;
}

function parseItemType(str: string): number {
  const map: Record<string, number> = {
    light: 1, scroll: 2, wand: 3, staff: 4, weapon: 5,
    treasure: 8, armor: 9, potion: 10, furniture: 12,
    trash: 13, container: 15, drink_con: 17, key: 18,
    food: 19, money: 20, boat: 22, corpse_npc: 23,
    corpse_pc: 24, fountain: 25, pill: 26, map: 28,
    portal: 29, trap: 31,
  };
  return map[str.toLowerCase()] ?? 0;
}

function parseApplyType(str: string): number | undefined {
  const map: Record<string, number> = {
    str: 1, dex: 2, int: 3, wis: 4, con: 5, cha: 7, lck: 13,
    sex: 6, class: 8, level: 9, age: 10, mana: 12, hp: 14, move: 15,
    gold: 16, ac: 17, hitroll: 18, damroll: 19, saves: 20,
  };
  return map[str.toLowerCase()];
}

function parseDiceString(str: string): { count: number; sides: number; bonus: number } | null {
  const match = str.match(/^(\d+)d(\d+)\+?(\d+)?$/i);
  if (!match) return null;
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
    bonus: match[3] ? parseInt(match[3], 10) : 0,
  };
}
```

#### 2.10 OLC Command Registration

```typescript
/**
 * Register all OLC commands with the CommandRegistry.
 * Called once during boot from main.ts.
 */
export function registerOlcCommands(): void {
  const R = CommandRegistry;

  R.register('redit',     doRedit,     TRUST.CREATOR,     Position.Dead, LOG_BUILD);
  R.register('medit',     doMedit,     TRUST.CREATOR,     Position.Dead, LOG_BUILD);
  R.register('oedit',     doOedit,     TRUST.CREATOR,     Position.Dead, LOG_BUILD);
  R.register('mpedit',    doMpedit,    TRUST.CREATOR,     Position.Dead, LOG_BUILD);
  R.register('aedit',     doAedit,     TRUST.CREATOR,     Position.Dead, LOG_BUILD);
  R.register('savearea',  doSaveArea,  TRUST.CREATOR,     Position.Dead, LOG_BUILD);
  R.register('asave',     doSaveArea,  TRUST.CREATOR,     Position.Dead, LOG_BUILD);
}
```

---

### 3. `src/admin/BanSystem.ts` — Ban Management

```typescript
import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Ban entry structure.
 * Replicates legacy BAN_DATA from mud.h.
 */
export interface BanEntry {
  name: string;          // Site or character name (without wildcard symbols)
  user: string;          // Optional: specific username
  note: string;          // Admin note about the ban
  bannedBy: string;      // Name of the immortal who created the ban
  bannedAt: Date;        // When the ban was created
  flagType: 'newbie' | 'mortal' | 'all' | 'level' | 'warn';
  level: number;         // Level cap for 'level' type bans
  unbanDate: Date | null; // When the ban expires (null = permanent)
  duration: number;      // Days, -1 = permanent
  prefix: boolean;       // Match as prefix (site ends with *)
  suffix: boolean;       // Match as suffix (site starts with *)
}

/**
 * Singleton ban system. Manages the ban list, persistence, and host matching.
 * Replicates legacy check_bans() logic from ban.c.
 */
export class BanSystem {
  private static instance: BanSystem;
  private bans: BanEntry[] = [];
  private savePath: string;

  private constructor() {
    this.savePath = path.join(process.cwd(), 'data', 'bans.json');
  }

  static getInstance(): BanSystem {
    if (!BanSystem.instance) {
      BanSystem.instance = new BanSystem();
    }
    return BanSystem.instance;
  }

  /**
   * Check if a connection should be banned.
   * Replicates legacy check_bans() from ban.c.
   *
   * @param host The connecting host/IP address.
   * @param level The character's level (0 for new connections).
   * @returns The matching BanEntry, or null if not banned.
   */
  checkBan(host: string, level: number = 0): BanEntry | null {
    const now = new Date();
    for (const ban of this.bans) {
      // Check expiration
      if (ban.unbanDate && now > ban.unbanDate) continue;

      // Match host
      if (!this.matchHost(host, ban)) continue;

      // Check ban type vs level
      switch (ban.flagType) {
        case 'newbie': if (level > 1) continue; break;
        case 'mortal': if (level > 50) continue; break;
        case 'level':  if (level > ban.level) continue; break;
        case 'warn':   return ban;  // Warning only — still returns the ban for logging
        case 'all':    return ban;  // Block all levels
      }

      return ban;
    }
    return null;
  }

  private matchHost(host: string, ban: BanEntry): boolean {
    const lowerHost = host.toLowerCase();
    const lowerBan = ban.name.toLowerCase();

    if (ban.prefix && ban.suffix) return lowerHost.includes(lowerBan);
    if (ban.prefix) return lowerHost.startsWith(lowerBan);
    if (ban.suffix) return lowerHost.endsWith(lowerBan);
    return lowerHost === lowerBan;
  }

  addBan(entry: BanEntry): void {
    this.bans.push(entry);
    this.save();
    Logger.info('ban', `Ban added: ${entry.name} by ${entry.bannedBy}`);
  }

  removeBan(site: string): boolean {
    const idx = this.bans.findIndex(b => b.name.toLowerCase() === site.toLowerCase());
    if (idx >= 0) {
      this.bans.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  getAllBans(): BanEntry[] {
    return [...this.bans];
  }

  /**
   * Load bans from disk. Called during boot.
   */
  load(): void {
    try {
      if (fs.existsSync(this.savePath)) {
        const data = JSON.parse(fs.readFileSync(this.savePath, 'utf-8'));
        this.bans = data.map((b: any) => ({
          ...b,
          bannedAt: new Date(b.bannedAt),
          unbanDate: b.unbanDate ? new Date(b.unbanDate) : null,
        }));
        Logger.info('ban', `Loaded ${this.bans.length} bans`);
      }
    } catch (err) {
      Logger.error('ban', `Failed to load bans: ${err}`);
    }
  }

  /**
   * Save bans to disk.
   */
  save(): void {
    try {
      const dir = path.dirname(this.savePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.savePath, JSON.stringify(this.bans, null, 2));
    } catch (err) {
      Logger.error('ban', `Failed to save bans: ${err}`);
    }
  }

  /** Remove expired bans. Called periodically. */
  purgeExpired(): void {
    const now = new Date();
    const before = this.bans.length;
    this.bans = this.bans.filter(b => !b.unbanDate || now <= b.unbanDate);
    if (this.bans.length < before) {
      this.save();
      Logger.info('ban', `Purged ${before - this.bans.length} expired bans`);
    }
  }
}
```

---

## Tests for Sub-Phase 3S

### `tests/unit/commands/immortal.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { doAuthorize, doFreeze, doGoto, doSet, doStat, doBan, doAllow,
//          doBanList, doUsers, doMemory, doAdvance, doTrust, doRestore } from '../../../src/game/commands/immortal';
// import { BanSystem } from '../../../src/admin/BanSystem';
// import mock helpers for Character, Player, Room, ConnectionManager, etc.

describe('Immortal Commands', () => {
  describe('doAuthorize', () => {
    it('should list pending characters when no argument given', () => {
      // Create a mock descriptor with a character in WaitingApproval state
      // Call doAuthorize(ch, '')
      // Verify ch.sendToChar was called with the pending character's name
    });

    it('should approve a pending character with "yes"', () => {
      // Create mock pending character
      // Call doAuthorize(ch, 'TestPlayer yes')
      // Verify target.pcData.authState changed to Authorized
      // Verify target received approval message
    });

    it('should deny with reason and reset auth_state to PasswordSet', () => {
      // Call doAuthorize(ch, 'TestPlayer immsim')
      // Verify target.pcData.authState === AuthState.PasswordSet
      // Verify target received denial message with reason
    });

    it('should force disconnect on outright denial', () => {
      // Call doAuthorize(ch, 'TestPlayer deny')
      // Verify descriptor.close() was called
    });
  });

  describe('doFreeze', () => {
    it('should toggle PLR_FREEZE flag on target', () => {
      // Verify flag is set, then unset on second call
    });

    it('should refuse to freeze equal or higher trust', () => {
      // Set victim trust >= ch trust
      // Verify 'You failed.' message
    });

    it('should not freeze NPCs', () => {
      // Verify 'Not on NPCs.' message
    });
  });

  describe('doGoto', () => {
    it('should teleport to room by vnum', () => {
      // Call doGoto(ch, '3001')
      // Verify ch.inRoom.vnum === 3001
    });

    it('should teleport to player by name', () => {
      // Create mock player in room 5000
      // Call doGoto(ch, 'Bob')
      // Verify ch.inRoom === bob.inRoom
    });

    it('should display custom bamfin/bamfout messages', () => {
      // Set pcData.bamfin and bamfout
      // Call doGoto, verify room messages match custom text
    });

    it('should refuse goto to non-existent room', () => {
      // Call doGoto(ch, '99999')
      // Verify error message
    });
  });

  describe('doSet', () => {
    it('should set character level', () => {
      // Call doSet(ch, 'char Bob level 50')
      // Verify victim.level === 50
    });

    it('should set character attributes within bounds', () => {
      // Call doSet(ch, 'char Bob str 30')
      // Verify victim.permStr === 25 (capped)
    });

    it('should refuse to set equal/higher trust targets', () => {
      // Verify trust check
    });

    it('should set object values', () => {
      // Call doSet(ch, 'obj sword value0 5')
      // Verify obj.values[0] === 5
    });

    it('should set room flags and mark area modified', () => {
      // Call doSet(ch, 'room 3001 flags dark nomob')
      // Verify room.roomFlags updated, area.isModified === true
    });
  });

  describe('doAdvance', () => {
    it('should advance player up with advanceLevel calls', () => {
      // Spy on advanceLevel
      // Call doAdvance(ch, 'Bob 10') from level 1
      // Verify advanceLevel called 9 times
    });

    it('should demote player and cap vitals', () => {
      // Set victim level 50
      // Call doAdvance(ch, 'Bob 5')
      // Verify level === 5 and maxHitPoints recalculated
    });
  });

  describe('doRestore', () => {
    it('should restore HP/mana/move to max', () => {
      // Set victim HP to 1
      // Call doRestore(ch, 'Bob')
      // Verify victim.hitPoints === victim.maxHitPoints
    });

    it('should enforce cooldown on restore all', () => {
      // Call doRestore(ch, 'all') twice
      // Second call should report cooldown
    });
  });
});

describe('Ban System', () => {
  describe('BanSystem.checkBan', () => {
    it('should match exact host', () => {
      // Add ban for 'badhost.com'
      // Verify checkBan('badhost.com', 0) returns the ban
    });

    it('should match prefix wildcard', () => {
      // Add ban for '192.168' with prefix=true
      // Verify checkBan('192.168.1.1', 0) returns the ban
    });

    it('should match suffix wildcard', () => {
      // Add ban for '.badhost.com' with suffix=true
      // Verify checkBan('user.badhost.com', 0) returns the ban
    });

    it('should skip expired bans', () => {
      // Add ban with unbanDate in the past
      // Verify checkBan returns null
    });

    it('should respect ban type vs level', () => {
      // Add 'newbie' ban
      // Verify level 0 is banned, level 2 is not
    });
  });

  describe('doBan / doAllow', () => {
    it('should add a ban via doBan', () => {
      // Call doBan(ch, 'add test.com all permanent')
      // Verify ban list contains the entry
    });

    it('should remove a ban via doAllow', () => {
      // Add ban, then call doAllow(ch, 'test.com')
      // Verify ban list is empty
    });
  });
});
```

### `tests/unit/commands/olc.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { canModifyVnum, doRedit, doMedit, doOedit, doAedit, doMpedit } from '../../../src/game/commands/olc';
// import mock helpers

describe('OLC System', () => {
  describe('canModifyVnum', () => {
    it('should allow vnum within assigned range', () => {
      // Set pcData.rRangeLo=100, rRangeHi=200
      // Verify canModifyVnum(player, 150, 'room') === true
    });

    it('should deny vnum outside assigned range', () => {
      // Verify canModifyVnum(player, 300, 'room') === false
    });

    it('should bypass range check for trust >= 59', () => {
      // Set trust to 59
      // Verify canModifyVnum(player, 9999, 'room') === true
    });
  });

  describe('doRedit', () => {
    it('should set room name with redit name subcommand', () => {
      // Call doRedit(ch, 'name The Grand Hall')
      // Verify ch.inRoom.name === 'The Grand Hall'
    });

    it('should create a new room with redit create', () => {
      // Call doRedit(ch, 'create 5000')
      // Verify VnumRegistry.getRoom(5000) exists
    });

    it('should refuse creation outside vnum range', () => {
      // Set limited range, try create outside
      // Verify error message
    });

    it('should create an exit with redit exit', () => {
      // Call doRedit(ch, 'exit north 3002')
      // Verify ch.inRoom.getExit(0).toVnum === 3002
    });

    it('should toggle exit flags', () => {
      // Create exit, then call doRedit(ch, 'exflag north door')
      // Verify exit has EX_ISDOOR flag
    });

    it('should mark area as modified on changes', () => {
      // Make a change, verify area.isModified === true
    });
  });

  describe('doMedit', () => {
    it('should create a new mob prototype', () => {
      // Call doMedit(ch, 'create 5000')
      // Verify VnumRegistry.getMobilePrototype(5000) exists
    });

    it('should auto-calculate combat stats from level', () => {
      // Enter edit mode, call medit level 30
      // Verify hitDice, damDice, armor, thac0 are calculated
    });

    it('should set individual attributes', () => {
      // Call medit str 20
      // Verify proto.permStr === 20
    });
  });

  describe('doOedit', () => {
    it('should create a new object prototype', () => {
      // Call doOedit(ch, 'create 5000')
      // Verify VnumRegistry.getObjectPrototype(5000) exists
    });

    it('should set type-specific values', () => {
      // Edit object, call oedit value0 5
      // Verify proto.values[0] === 5
    });

    it('should add and remove object affects', () => {
      // Add: oedit affect str 3
      // Verify affect added
      // Remove: oedit rmaffect 0
      // Verify affect removed
    });
  });

  describe('doMpedit', () => {
    it('should list programs on entity', () => {
      // Add programs to mob, call mpedit mob 3001 list
      // Verify output lists all programs
    });

    it('should delete a program by index', () => {
      // Add 2 programs, delete #1
      // Verify only 1 program remains
    });
  });

  describe('doAedit', () => {
    it('should display area info without arguments', () => {
      // Call doAedit(ch, '')
      // Verify area name, author, vnums displayed
    });

    it('should set area name', () => {
      // Call doAedit(ch, 'name New Area Name')
      // Verify area.name updated
    });
  });
});
```

---

## Acceptance Criteria

- [ ] `authorize Gandalf yes` approves a pending character, sets `authState` to `Authorized`, and allows them to enter the game.
- [ ] `authorize Gandalf immsim` denies the character, resets `authState` to `PasswordSet`, and sends a denial reason message.
- [ ] `freeze Bob` toggles `PLR_FREEZE`; frozen Bob can only type `quit`.
- [ ] `goto 3001` teleports the immortal to room 3001. Custom `bamfin`/`bamfout` messages display to the old and new rooms.
- [ ] `goto Bob` teleports to Bob's room. Respects DND flag on higher-trust targets.
- [ ] `transfer Bob` moves Bob to the immortal's room. `transfer all` moves all online mortals.
- [ ] `at 3001 look` executes `look` in room 3001 and returns the immortal to their original room.
- [ ] `purge` removes all NPCs and objects from the room. `purge <mob>` removes a specific NPC.
- [ ] `mload 3001` creates a mob instance of vnum 3001 in the room. `oload 3001` creates an object.
- [ ] `slay Bob` instantly kills Bob (bypasses all protections). NPC death triggers XP/corpse. PC death triggers respawn.
- [ ] `force Bob drop all` makes Bob execute `drop all`.
- [ ] `snoop Bob` relays all of Bob's input/output to the snooper. Detects circular snoops.
- [ ] `switch mob` possesses the NPC. Commands execute as the NPC. `return` restores original body.
- [ ] `set char Bob level 50` changes level and recalculates stats. `set char Bob str 25` caps at 25.
- [ ] `stat Bob` displays all internal fields (HP, mana, attributes, flags, affects, equipment, vnum ranges).
- [ ] `stat room` displays room vnum, name, flags, sector, exits, extra descriptions.
- [ ] `advance Bob 50` calls `advanceLevel()` for each level gained. `advance Bob 5` demotes and recalculates.
- [ ] `trust Bob 55` sets Bob's trust level to 55.
- [ ] `restore Bob` sets HP/mana/move to max. `restore all` has a 6-hour cooldown.
- [ ] `ban add 192.168.* all permanent` creates a prefix-matching ban. New connections from 192.168.x.x are blocked.
- [ ] `allow 192.168` removes the ban. `ban list` displays all active bans.
- [ ] `reboot` saves all players and areas, then exits process. `shutdown nosave` exits without saving.
- [ ] `wizinvis` toggles wizard invisibility. `wizinvis 55` sets visibility threshold to level 55.
- [ ] `users` lists all connected descriptors with state, idle time, and host.
- [ ] `memory` shows area/room/mob/object counts and memory usage.
- [ ] `redit name The Grand Hall` changes the current room's name. Area is marked as modified.
- [ ] `redit create 5000` creates a new room at vnum 5000 (within builder's assigned range).
- [ ] `redit exit north 3002` creates an exit linking north to room 3002.
- [ ] `redit exflag north door` toggles the `EX_ISDOOR` flag on the north exit.
- [ ] OLC enforces vnum ranges — a builder with range 100–200 cannot `redit create 9999`.
- [ ] `medit create 5000` creates a new mob prototype at vnum 5000.
- [ ] `medit level 30` on an existing mob auto-calculates HP dice, damage dice, AC, and THAC0.
- [ ] `oedit create 5000` creates a new object prototype at vnum 5000.
- [ ] `oedit value0 5` sets the first type-specific value on the object being edited.
- [ ] `oedit affect str 3` adds a +3 strength affect to the object.
- [ ] `mpedit mob 3001 add speech hello` adds a speech-triggered MUDprog to mob 3001.
- [ ] `mpedit mob 3001 list` shows all programs on the mob with trigger types and arguments.
- [ ] `aedit name Midgaard` changes the area name. `aedit resetfreq 20` changes reset frequency.
- [ ] `savearea` saves all modified areas to JSON files. `savearea all` saves every area.
- [ ] Text editor commands work: `/s` saves, `/c` clears, `/l` lists, `/a` aborts.
- [ ] `done` exits any OLC editor and marks the area as modified.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
