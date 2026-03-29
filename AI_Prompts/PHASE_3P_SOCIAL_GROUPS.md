# SMAUG 2.0 TypeScript Port — Phase 3P: Social Groups — Group Formation, Following, Orders, and Party Mechanics

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

**Sub-Phases 3A–3O** are complete. The following files are fully implemented and may be imported:

### Sub-Phase 3A (Utilities, World Loader, Command Parser)
- `src/utils/AnsiColors.ts` — `colorize()`, `colorStrlen()`, `stripColor()`, `padRight()`, `padCenter()`, `wordWrap()`
- `src/utils/Dice.ts` — `rollDice()`, `numberRange()`, `numberPercent()`, `numberFuzzy()`, `parseDiceString()`
- `src/utils/BitVector.ts` — `hasFlag()`, `setFlag()`, `removeFlag()`, `flagsToArray()`, `parseFlagString()`
- `src/utils/StringUtils.ts` — `isName()`, `isNamePrefix()`, `oneArgument()`, `strPrefix()`, `numberArgument()`
- `src/game/world/AreaManager.ts` — `loadAllAreas()`, `resolveExits()`
- `src/game/world/VnumRegistry.ts` — `getRoom()`, `getMobPrototype()`, `getObjPrototype()`
- `src/game/world/ResetEngine.ts` — `resetArea()`, `shouldReset()`
- `src/game/commands/CommandRegistry.ts` — `interpret()`, `registerCommand()`, `findCommand()`
- `src/game/commands/social.ts` — `loadSocials()`, `executeSocial()`
- `src/network/ConnectionManager.ts` — Full nanny state machine, output pager
- `src/main.ts` — Boot sequence

### Sub-Phase 3B (Movement, Look, Combat)
- `src/game/commands/movement.ts` — `moveChar()`, direction commands, door commands, `doRecall()`, `doFlee()`
- `src/game/commands/information.ts` — `doLook()`, `doExamine()`, `doScore()`, `doWho()`, `doHelp()`, `doAffects()`, `doEquipment()`, `doInventory()`, `doConsider()`
- `src/game/combat/CombatEngine.ts` — `violenceUpdate()`, `multiHit()`, `oneHit()`, `inflictDamage()`, `startCombat()`, `stopFighting()`
- `src/game/combat/DamageCalculator.ts` — `getDamageMessage()`, `calcThac0()`, `calcDamageBonus()`, `checkImmune()`
- `src/game/combat/DeathHandler.ts` — `handleDeath()`, `makeCorpse()`, XP award calculation
- `src/game/commands/combat.ts` — All combat skill commands (kill, bash, kick, backstab, etc.)
- `src/game/entities/Character.ts` — `hitGain()`, `manaGain()`, `moveGain()`, `updatePosition()`, `charUpdate()`

### Sub-Phase 3C–3O (Magic, Skills, Affects, Inventory, Perception, Economy, Progression, Communication, etc.)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.
- `src/game/commands/communication.ts` — `talkChannel()`, `doSay()`, `doTell()`, `doReply()`, `doEmote()`, `translateMessage()`, `doDeaf()`, `doIgnore()`, language system, all channel commands.

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3P Objective

Implement the complete group and social interaction system: group formation, following, group commands, the order/command system for charmed mobs, group XP splitting, group display, the split command for gold sharing, social actions (socials), and party mechanics. After this sub-phase, players can follow leaders, form groups with the `group` command, see group status, issue orders to charmed followers, split gold among group members, use the `gwhere` command to locate group members, and execute social actions — all pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/entities/Character.ts` — Group/Follow Fields and Helpers

Ensure the `Character` class has the following group/follow fields. These replicate legacy `char_data` fields `master`, `leader`, and the follower linked list:

#### 1.1 Group/Follow Properties

```typescript
/** The character this character is following (null = not following anyone). */
master: Character | null = null;

/** The group leader (null = self or not grouped). */
leader: Character | null = null;

/**
 * List of characters following this character.
 * Maintained by addFollower() and removeFollower().
 */
followers: Character[] = [];

/**
 * Whether this character is grouped with their leader.
 * Set by the 'group' command. Following alone does not make one grouped.
 * Replicates legacy PLR_GROUPED / ACT_GROUPED flag.
 */
isGrouped: boolean = false;
```

#### 1.2 `addFollower(follower)` — Add a Follower

Replicates legacy `add_follower()` from `handler.c`:

1. If `follower.master !== null`, call `follower.stopFollowing()` first.
2. Set `follower.master = this`.
3. Add `follower` to `this.followers[]`.
4. If `follower` is a charmed NPC (`hasFlag(follower.affectedBy, AFF_CHARM)`), set `follower.leader = this.leader || this`.

#### 1.3 `removeFollower(follower)` — Remove a Follower

Replicates legacy `stop_follower()` from `handler.c`:

1. Remove `follower` from `this.followers[]`.
2. Set `follower.master = null`.
3. Set `follower.leader = null`.
4. Set `follower.isGrouped = false`.
5. If `follower` was charmed (`hasFlag(follower.affectedBy, AFF_CHARM)`):
   - Remove `AFF_CHARM` from `follower.affectedBy`.
   - Strip the charm affect via `AffectManager.stripAffect(follower, 'charm person')`.
   - If `follower` is fighting the old master, call `stopFighting(follower)`.

#### 1.4 `stopFollowing()` — Stop Following Current Master

Replicates legacy `stop_follower()`:

1. If `this.master === null`, return (not following anyone).
2. If charmed, remove charm affect.
3. Call `this.master.removeFollower(this)`.
4. `this.master = null; this.leader = null; this.isGrouped = false;`

#### 1.5 `dieFollower()` — Clean Up All Followers on Death

Replicates legacy `die_follower()` from `handler.c`:

1. If `this.master !== null`, call `this.stopFollowing()`.
2. Set `this.leader = null`.
3. For each `fol` in `this.followers[]`:
   - Set `fol.master = null`.
   - Set `fol.leader = null`.
   - Set `fol.isGrouped = false`.
   - If `fol` was charmed, strip charm.
4. Clear `this.followers = []`.

#### 1.6 `isSameGroup(target)` — Check Group Membership

Replicates legacy `is_same_group()` from `handler.c`:

```typescript
/**
 * Check if two characters are in the same group.
 * Replicates legacy is_same_group():
 * - Both must be grouped (isGrouped flag).
 * - They share the same leader (or one is the leader of the other).
 * - Charmed characters are always in the group of their master.
 */
isSameGroup(target: Character): boolean {
  if (this === target) return true;

  const myLeader = this.leader || this;
  const theirLeader = target.leader || target;

  // Both must be grouped
  if (!this.isGrouped && this !== myLeader) return false;
  if (!target.isGrouped && target !== theirLeader) return false;

  return myLeader === theirLeader;
}
```

#### 1.7 `getGroupMembers()` — List All Group Members

```typescript
/**
 * Get all characters in this character's group.
 * Returns array including the leader and all grouped followers.
 */
getGroupMembers(): Character[] {
  const leader = this.leader || this;
  const members: Character[] = [leader];
  for (const fol of leader.followers) {
    if (fol.isGrouped || fol.leader === leader) {
      members.push(fol);
    }
  }
  return members;
}
```

#### 1.8 `getGroupSize()` — Count Group Members

```typescript
getGroupSize(): number {
  return this.getGroupMembers().length;
}
```

---

### 2. `src/game/commands/social.ts` — Follow, Group, and Order Commands

#### 2.1 `doFollow(ch, arg)` — Follow a Character

Replicates legacy `do_follow()` from `act_comm.c`:

1. If `arg` is empty, send "Follow whom?\r\n" and return.
2. Find target in room: `getCharRoom(ch, arg)`. If not found, send "They aren't here.\r\n" and return.
3. **Cannot follow self when already not following anyone:**
   - If `target === ch`:
     - If `ch.master === null`, send "You aren't following anyone.\r\n" and return.
     - Call `ch.stopFollowing()`.
     - Send `"You stop following.\r\n"`.
     - Return.
4. **Circle prevention:** If `target.master === ch` (would create circular follow), send "You can't follow someone who's following you.\r\n" and return.
5. **Charmed check:** If `ch` is charmed (`hasFlag(ch.affectedBy, AFF_CHARM)`) and `ch.master !== null`, send `"But you'd rather follow ${ch.master.name}!\r\n"` and return. *(Charmed characters can't voluntarily change who they follow.)*
6. **Level restriction for NPCs:** NPCs can only be followed by their charm master or by immortals. *(Legacy behavior: PCs can follow other PCs freely.)*
7. If `ch.master !== null`, call `ch.stopFollowing()`.
8. Call `target.addFollower(ch)`.
9. Send to `ch`: `"You now follow ${target.name}.\r\n"`.
10. Send to `target`: `"${ch.name} now follows you.\r\n"`.
11. Send to room (excluding ch and target): `"${ch.name} now follows ${target.name}.\r\n"`.
12. **Emit EventBus event** `GameEvent.CharacterFollow` with `{ follower: ch, leader: target }`.
13. **Registration:** name `'follow'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

#### 2.2 `doGroup(ch, arg)` — Group Management

Replicates legacy `do_group()` from `act_comm.c`. Multi-purpose command:

**Sub-command: No argument — Display group status:**

1. Determine the leader: `const leader = ch.leader || ch`.
2. Send header: `"${leader.name}'s group:\r\n"`.
3. For the leader and each follower where `fol.isGrouped` or `fol.leader === leader`:
   - Display: `"[${fol.level} ${raceAbbrev} ${classAbbrev}] ${fol.name.padEnd(16)} HP: ${fol.hit}/${fol.maxHit}  Mana: ${fol.mana}/${fol.maxMana}  Move: ${fol.move}/${fol.maxMove}  XP: ${fol.exp}\r\n"`.
   - Use colour coding: Green if HP > 75%, Yellow if 25–75%, Red if < 25%.
4. Show group size: `"Group has ${count} member(s).\r\n"`.

**Sub-command: `disband` — Disband the group:**

1. If `ch.leader !== null` (ch is not the leader), send "You can't disband someone else's group.\r\n" and return.
2. For each follower in `ch.followers[]` where `fol.isGrouped`:
   - Set `fol.isGrouped = false`.
   - Set `fol.leader = null`.
   - Send to `fol`: `"${ch.name} disbands the group.\r\n"`.
3. Send to `ch`: `"You disband the group.\r\n"`.
4. **Emit EventBus event** `GameEvent.GroupDisband` with `{ leader: ch }`.

**Sub-command: `all` — Group all followers in the room:**

1. If `ch.leader !== null` (ch is not leading), send "But you aren't the group leader!\r\n" and return.
2. For each character in `ch.inRoom.people`:
   - If `fol.master === ch` and `!fol.isGrouped`:
     - Apply level restriction: Legacy allows grouping only if `|ch.level - fol.level| <= 8` for mortal PCs. Immortals bypass.
     - Set `fol.isGrouped = true`.
     - Set `fol.leader = ch`.
     - Send to `ch`: `"${fol.name} joins your group.\r\n"`.
     - Send to `fol`: `"You join ${ch.name}'s group.\r\n"`.
3. If no one was added, send "No eligible followers to group.\r\n".

**Sub-command: `<name>` — Group/ungroup a specific follower:**

1. Find target in room: `getCharRoom(ch, arg)`.
2. If not found, send "They aren't here.\r\n" and return.
3. If `target === ch`, send "You can't group yourself. Use 'group' to see your group.\r\n" and return.
4. If `target.master !== ch`, send "They aren't following you.\r\n" and return.
5. **Toggle grouping:**
   - If `target.isGrouped`:
     - Set `target.isGrouped = false`.
     - Set `target.leader = null`.
     - Send to `ch`: `"You remove ${target.name} from your group.\r\n"`.
     - Send to `target`: `"${ch.name} removes you from the group.\r\n"`.
     - **Emit EventBus event** `GameEvent.GroupLeave` with `{ character: target, leader: ch }`.
   - Else:
     - **Level restriction:** If `|ch.level - target.level| > 8` and `ch.getTrust() < LEVEL_IMMORTAL`, send "They are too high or too low in level to join your group.\r\n" and return.
     - Set `target.isGrouped = true`.
     - Set `target.leader = ch`.
     - Send to `ch`: `"${target.name} joins your group.\r\n"`.
     - Send to `target`: `"You join ${ch.name}'s group.\r\n"`.
     - Send to room: `"${target.name} joins ${ch.name}'s group.\r\n"`.
     - **Emit EventBus event** `GameEvent.GroupJoin` with `{ character: target, leader: ch }`.
6. **Registration:** name `'group'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

#### 2.3 `doOrder(ch, arg)` — Order a Charmed Follower

Replicates legacy `do_order()` from `act_comm.c`:

1. Parse `arg` into `targetName` and `command` via `oneArgument()`.
2. If no `targetName` or no `command`, send "Order whom to do what?\r\n" and return.
3. **Anti-abuse:** If `command` starts with `'order'`, send "You can't order someone to order.\r\n" and return. *(Prevents recursive orders.)*
4. **Find target:**
   - If `targetName === 'all'`, order all charmed followers (see step 7).
   - Otherwise, find target in room: `getCharRoom(ch, arg)`.
5. **Validation (for single target):**
   - If target is self: "You can't order yourself.\r\n".
   - If target is a PC and ch is not an immortal: "You can't order other players.\r\n".
   - If `!hasFlag(target.affectedBy, AFF_CHARM)` or `target.master !== ch`: "They don't seem to want to take orders from you.\r\n" and return.
6. **Execute order (single target):**
   - Send to `ch`: `"You order ${target.name} to '${command}'.\r\n"`.
   - Send to `target`: `"${ch.name} orders you to '${command}'.\r\n"`.
   - Call `interpret(target, command)` — execute the command as if the target typed it.
   - **Safety:** After execution, check `charDied(target)`. If so, return.
7. **Execute order (all charmed followers):**
   - For each `fol` in `ch.followers[]`:
     - If `fol.inRoom === ch.inRoom` and `hasFlag(fol.affectedBy, AFF_CHARM)` and `fol.master === ch`:
       - Send order messages.
       - Call `interpret(fol, command)`.
       - Check `charDied(fol)`.
8. **Registration:** name `'order'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

#### 2.4 `doDismiss(ch, arg)` — Dismiss a Charmed Follower

Replicates legacy `do_dismiss()`:

1. If `arg` is empty, send "Dismiss whom?\r\n" and return.
2. Find target in room: `getCharRoom(ch, arg)`.
3. If not found, send "They aren't here.\r\n".
4. If `target.master !== ch`, send "They aren't following you.\r\n" and return.
5. If `!hasFlag(target.affectedBy, AFF_CHARM)`, send "You can only dismiss charmed followers.\r\n" and return.
6. Call `target.stopFollowing()`.
7. Stop `target` fighting if in combat.
8. Send to `ch`: `"You dismiss ${target.name}.\r\n"`.
9. Send to `target`: `"${ch.name} dismisses you.\r\n"`.
10. Send to room: `"${ch.name} dismisses ${target.name}.\r\n"`.
11. **Registration:** name `'dismiss'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

#### 2.5 `doSplit(ch, arg)` — Split Gold Among Group

Replicates legacy `do_split()` from `act_comm.c`:

1. Parse `arg` as a number: `const amount = parseInt(arg)`. If `NaN` or `<= 0`, send "Split how much?\r\n" and return.
2. If `amount > ch.gold`, send "You don't have that much gold.\r\n" and return.
3. **Count eligible group members in the room:**
   - Iterate `ch.inRoom.people`. Count characters where `isSameGroup(ch)` AND character is a PC (not NPC) AND character is in the same room.
   - Let `memberCount = count` (including ch).
4. If `memberCount < 2`, send "Just keep it all.\r\n" and return.
5. **Calculate share:** `const share = Math.floor(amount / memberCount)`. `const remainder = amount - share * memberCount`.
6. **Distribute:**
   - Deduct `amount` from `ch.gold`.
   - Give `ch` back `share + remainder` (leader keeps remainder).
   - For each other group member in the room:
     - Add `share` to `member.gold`.
     - Send to `member`: `"${ch.name} splits ${amount} gold. Your share is ${share} gold.\r\n"`.
7. Send to `ch`: `"You split ${amount} gold. Your share is ${share + remainder} gold.\r\n"`.
8. **Emit EventBus event** `GameEvent.GoldSplit` with `{ splitter: ch, amount, memberCount, share }`.
9. **Registration:** name `'split'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

#### 2.6 `doGwhere(ch, arg)` — Locate Group Members

Replicates legacy `do_gwhere()`:

1. If ch is not in a group, send "You are not in a group.\r\n" and return.
2. Determine leader: `const leader = ch.leader || ch`.
3. Send header: `"Members of ${leader.name}'s group:\r\n"`.
4. For the leader and each grouped follower:
   - Display: `"  ${member.name.padEnd(20)} ${member.inRoom?.name ?? 'Nowhere'} [${member.inRoom?.vnum ?? 0}]\r\n"`.
   - Only show room vnum to immortals (non-immortals see just the room name).
5. **Registration:** name `'gwhere'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

---

### 3. `src/game/commands/social.ts` — Social Actions (Emote-Based Socials)

#### 3.1 Social Action Data Structure

Replicates legacy `social_type` from `mud.h`. Social actions are pre-defined emote templates loaded from a `socials.dat` or `socials.json` data file:

```typescript
export interface SocialData {
  /** Social command name (e.g., 'bow', 'grin', 'hug'). */
  name: string;
  /** Message shown to character when no argument: e.g., "You bow gracefully." */
  charNoArg: string;
  /** Message shown to others when no argument: e.g., "$n bows gracefully." */
  othersNoArg: string;
  /** Message shown to character when target found: e.g., "You bow to $N." */
  charFound: string;
  /** Message shown to target: e.g., "$n bows before you." */
  victFound: string;
  /** Message shown to others: e.g., "$n bows before $N." */
  othersFound: string;
  /** Message shown when target not found: e.g., "They aren't here." */
  charNotFound: string;
  /** Message shown to character when targeting self: e.g., "You look silly bowing to yourself." */
  charAuto: string;
  /** Message shown to others when targeting self: e.g., "$n bows to $mself." */
  othersAuto: string;
}
```

#### 3.2 Social Loading — `loadSocials()`

*(Already implemented in Phase 3A. This section is for reference only.)*

Loads social action data from `world/socials.json` (or embedded defaults). Populates a `Map<string, SocialData>` keyed by social name (lowercase).

#### 3.3 Social Execution — `executeSocial(ch, socialName, arg)`

*(Already implemented in Phase 3A. Expand with the following refinements.)*

Replicates legacy social execution from `act_comm.c`:

1. Look up `socialName` in the social map. If not found, return `false` (command not recognized as social).
2. **Position check:** Socials require at least `Position.Resting`. If `ch.position < Position.Resting`, send position-based error.
3. **Room silence check:** If `ROOM_SILENCE` and not immortal, block: "The room absorbs your actions.\r\n".
4. If `arg` is empty:
   - Send `social.charNoArg` to `ch` (with `$n` replaced by ch's name).
   - Send `social.othersNoArg` to room (with `$n` replaced).
5. If `arg` is provided:
   - Find target in room: `getCharRoom(ch, arg)`.
   - If not found: send `social.charNotFound` to `ch`. Return.
   - If target is self:
     - Send `social.charAuto` to `ch` (substitute `$n`, `$m`, `$s` for self pronouns).
     - Send `social.othersAuto` to room (substitute `$n`, `$e`, `$m`, `$s`).
   - Else:
     - Send `social.charFound` to `ch` (substitute `$N` with target's name).
     - Send `social.victFound` to `target` (substitute `$n` with ch's name).
     - Send `social.othersFound` to room excluding ch and target.
6. **Fire social MUDprog triggers:** After executing the social, if the target is an NPC, check for `ACT_PROG` triggers on the NPC that match the social name.
7. Return `true`.

#### 3.4 Social Variable Substitution

The social display system uses the same variable substitution as the `act()` function from legacy code. Ensure the following replacements work in social messages:

| Variable | Replacement |
|----------|------------|
| `$n` | Character's name (or short description for NPCs) |
| `$N` | Victim's name (or short description) |
| `$e` | Character's subjective pronoun (he/she/it) |
| `$E` | Victim's subjective pronoun |
| `$m` | Character's objective pronoun (him/her/it) |
| `$M` | Victim's objective pronoun |
| `$s` | Character's possessive pronoun (his/her/its) |
| `$S` | Victim's possessive pronoun |
| `$t` | Target string argument |
| `$T` | Target string (uppercase) |

Use the `actSubstitute()` function from `StringUtils.ts` (implemented in Phase 3C).

---

### 4. `src/game/commands/social.ts` — Follower Movement Integration

#### 4.1 Follower Auto-Movement

When a character moves via `moveChar()` (already implemented in Phase 3B/3F), followers in the same room automatically move too. This section documents the integration points that already exist and the edge cases to handle:

1. **In `moveChar()` (already wired):** After the character moves successfully, iterate `ch.followers[]`:
   - For each follower in the **old room** (before the move):
     - If `fol.position >= Position.Standing` and `fol.inRoom === oldRoom`:
       - Call `moveChar(fol, direction, false)` (the `false` parameter suppresses the "You follow X" message duplication).
       - Send to `fol`: `"You follow ${ch.name}.\r\n"`.
2. **Charmed follower movement:** Charmed NPCs (`AFF_CHARM`) follow their master automatically. If the master flees, the charmed NPC also attempts to flee (but may fail due to its own movement costs).
3. **Mounted follower:** If `ch` is riding a mount, the mount moves with the rider (handled separately by the mount system). The mount is not in the followers list for this purpose.

#### 4.2 Follower Combat Integration

Existing integration points in `CombatEngine` and `DeathHandler`:

1. **Group XP sharing (already in Phase 3N):** When a mob is killed, `groupGain()` distributes XP among all group members in the room.
2. **Rescue:** `doRescue()` (Phase 3H) allows a group member to swap places as the target of an NPC's attack.
3. **Assist/auto-assist:** When a group member is attacked, other group members in the room may auto-assist (if they have the skill and are not already fighting). Wire this into `startCombat()`:
   - After `startCombat(attacker, victim)`, iterate `victim.getGroupMembers()` in the room.
   - For each group member with `auto_assist` enabled and not already fighting, call `startCombat(member, attacker)`.

---

### 5. `src/game/commands/social.ts` — Beckon and Related Social Commands

#### 5.1 `doBeckon(ch, arg)` — Beckon a Player

Replicates legacy `do_beckon()`:

1. If `arg` is empty, send "Beckon whom?\r\n" and return.
2. Find target in room: `getCharRoom(ch, arg)`.
3. If not found, send "They aren't here.\r\n" and return.
4. If target is self, send "You beckon to yourself.\r\n" and return.
5. Send to `ch`: `"You beckon to ${target.name}.\r\n"`.
6. Send to `target`: `"${ch.name} beckons to you.\r\n"`.
7. Send to room: `"${ch.name} beckons to ${target.name}.\r\n"`.
8. **Registration:** name `'beckon'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

#### 5.2 `doReport(ch, arg)` — Report Status to Room/Group

Replicates legacy `do_report()`:

1. Format: `"${ch.name} reports: ${ch.hit}/${ch.maxHit} hp ${ch.mana}/${ch.maxMana} mana ${ch.move}/${ch.maxMove} mv.\r\n"`.
2. Send to ch and room (or group, if grouped).
3. **Registration:** name `'report'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

---

### 6. `src/game/commands/movement.ts` — Drag Command

#### 6.1 `doDrag(ch, arg)` — Drag a Character

Replicates legacy `do_drag()`:

1. Parse `arg` into `targetName` and `directionStr` via `oneArgument()`.
2. If no target or no direction, send "Drag whom where?\r\n" and return.
3. Find target in room: `getCharRoom(ch, targetName)`.
4. If not found, send "They aren't here.\r\n" and return.
5. **Validation:**
   - Target must be incapacitated or sleeping (position ≤ `Position.Stunned` or sleeping) OR target must be consenting (not fighting).
   - Target must not be much heavier than the dragger: `target.getCarriedWeight() + target.weight > ch.maxCarryWeight() * 2` → "They are too heavy to drag.\r\n".
   - Cannot drag self: "You can't drag yourself.\r\n".
6. Parse direction: `parseDirection(directionStr)`. If invalid, send "That's not a direction.\r\n".
7. Move both characters in that direction (like `moveChar()` but with special messages):
   - Send to room (old): `"${ch.name} drags ${target.name} ${directionName}.\r\n"`.
   - Move ch via `moveChar()`.
   - Move target to the same room directly (set `target.inRoom`).
   - Send to room (new): `"${ch.name} drags ${target.name} in from the ${reverseDir}.\r\n"`.
8. **Registration:** name `'drag'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

---

### 7. EventBus Event Definitions

Add the following events to the `GameEvent` enum in `src/core/EventBus.ts` (if not already present):

```typescript
/** Fired when a character starts following another. */
CharacterFollow = 'character:follow',

/** Fired when a character joins a group. */
GroupJoin = 'group:join',

/** Fired when a character leaves a group. */
GroupLeave = 'group:leave',

/** Fired when a group is disbanded. */
GroupDisband = 'group:disband',

/** Fired when gold is split among group members. */
GoldSplit = 'gold:split',
```

Event payload interfaces:

```typescript
export interface CharacterFollowPayload {
  follower: Character;
  leader: Character;
}

export interface GroupJoinPayload {
  character: Character;
  leader: Character;
}

export interface GroupLeavePayload {
  character: Character;
  leader: Character;
}

export interface GroupDisbandPayload {
  leader: Character;
}

export interface GoldSplitPayload {
  splitter: Character;
  amount: number;
  memberCount: number;
  share: number;
}
```

---

### 8. Command Registration Summary

Register all group/social commands in `CommandRegistry`:

| Command | Function | Trust | Position | Log | Aliases |
|---------|----------|-------|----------|-----|---------|
| `follow` | `doFollow` | 0 | Standing | Normal | |
| `group` | `doGroup` | 0 | Standing | Normal | |
| `order` | `doOrder` | 0 | Standing | Normal | |
| `dismiss` | `doDismiss` | 0 | Standing | Normal | |
| `split` | `doSplit` | 0 | Standing | Normal | |
| `gwhere` | `doGwhere` | 0 | Standing | Normal | |
| `beckon` | `doBeckon` | 0 | Standing | Normal | |
| `report` | `doReport` | 0 | Resting | Normal | |
| `drag` | `doDrag` | 0 | Standing | Normal | |

*(Social actions are not individually registered commands; they are handled by the social lookup fallback in `CommandRegistry.interpret()` — if no command matches, check the social map.)*

---

## Tests for Sub-Phase 3P

- `tests/unit/entities/Character-group.test.ts` — Group/follow field tests:
  - `addFollower()` sets `follower.master` and adds to `followers[]`.
  - `removeFollower()` clears `follower.master` and removes from `followers[]`.
  - `removeFollower()` on charmed follower strips `AFF_CHARM`.
  - `stopFollowing()` calls `master.removeFollower(this)`.
  - `dieFollower()` clears all followers and master.
  - `isSameGroup()` returns true for members of the same group.
  - `isSameGroup()` returns false for characters in different groups.
  - `isSameGroup()` returns true for leader and their grouped follower.
  - `isSameGroup()` returns false for follower that is not grouped (following but not grouped).
  - `getGroupMembers()` returns all grouped characters under the same leader.
  - `getGroupSize()` returns correct count.

- `tests/unit/commands/follow.test.ts` — Follow command tests:
  - `doFollow('bob')` sets `ch.master = bob` and adds ch to bob's followers.
  - `doFollow('bob')` when bob is not in room → "They aren't here."
  - `doFollow('self')` when already following someone → stops following.
  - `doFollow('self')` when not following anyone → "You aren't following anyone."
  - `doFollow()` when charmed → "But you'd rather follow X!"
  - `doFollow()` circle prevention: A follows B, B tries to follow A → blocked.
  - `doFollow()` emits `CharacterFollow` event.

- `tests/unit/commands/group.test.ts` — Group command tests:
  - `doGroup('')` displays group status with HP/mana/move for all members.
  - `doGroup('bob')` when bob is following ch → bob joins group.
  - `doGroup('bob')` when bob is already grouped → bob is removed from group.
  - `doGroup('bob')` when bob is not following ch → "They aren't following you."
  - `doGroup('bob')` level difference > 8 → "They are too high or too low in level."
  - `doGroup('bob')` level difference > 8 but ch is immortal → allowed.
  - `doGroup('all')` groups all followers in the room.
  - `doGroup('all')` skips followers in different rooms.
  - `doGroup('disband')` removes all group members.
  - `doGroup('disband')` when not leader → "You can't disband someone else's group."
  - Group display shows colour-coded HP status.

- `tests/unit/commands/order.test.ts` — Order command tests:
  - `doOrder('pet sit')` when pet is charmed → pet executes 'sit'.
  - `doOrder('pet order bob sit')` → blocked (recursive order).
  - `doOrder('bob sit')` when bob is a PC → "You can't order other players."
  - `doOrder('bob sit')` when bob is NPC but not charmed → "They don't seem to want to take orders."
  - `doOrder('all sit')` orders all charmed followers to sit.

- `tests/unit/commands/dismiss.test.ts` — Dismiss command tests:
  - `doDismiss('pet')` when pet is charmed follower → stops following, strips charm.
  - `doDismiss('bob')` when bob is not charmed → "You can only dismiss charmed followers."
  - `doDismiss('pet')` when pet is not following ch → "They aren't following you."

- `tests/unit/commands/split.test.ts` — Split command tests:
  - `doSplit('100')` with 2 group members in room → each gets 50.
  - `doSplit('100')` with 3 group members → each gets 33, leader gets 34 (remainder).
  - `doSplit('0')` → "Split how much?"
  - `doSplit('999')` when ch has 100 gold → "You don't have that much gold."
  - `doSplit('100')` when alone → "Just keep it all."
  - `doSplit('100')` skips NPCs in group.
  - Split emits `GoldSplit` event.

- `tests/unit/commands/gwhere.test.ts` — Gwhere tests:
  - `doGwhere()` when grouped shows all members with room names.
  - `doGwhere()` when not grouped → "You are not in a group."
  - `doGwhere()` shows vnum only to immortals.

- `tests/unit/commands/social-actions.test.ts` — Social action execution tests:
  - `executeSocial(ch, 'bow', '')` with no target → shows charNoArg to ch, othersNoArg to room.
  - `executeSocial(ch, 'hug', 'bob')` with bob in room → shows charFound, victFound, othersFound.
  - `executeSocial(ch, 'hug', 'bob')` with bob not in room → shows charNotFound.
  - `executeSocial(ch, 'grin', 'self')` targeting self → shows charAuto, othersAuto.
  - Social variable substitution: `$n` → ch name, `$N` → target name, `$e/$m/$s` → correct pronouns.
  - Social on NPC target fires `ACT_PROG`.
  - Unknown social returns false.

- `tests/unit/commands/report.test.ts` — Report tests:
  - `doReport()` displays HP/mana/move to the room.

- `tests/unit/commands/drag.test.ts` — Drag tests:
  - `doDrag('bob north')` moves both characters north.
  - `doDrag('bob')` with no direction → "Drag whom where?"
  - `doDrag('bob north')` when bob is standing → blocked (bob must be incapacitated/sleeping).
  - `doDrag('bob north')` when bob is too heavy → "They are too heavy to drag."

- `tests/unit/commands/follower-movement.test.ts` — Follower auto-movement:
  - Leader moves north → follower automatically follows.
  - Leader moves north → follower who is sleeping does NOT follow.
  - Leader moves north → charmed NPC follower follows.
  - Leader moves → follower in a different room does NOT follow.
  - Leader flees → followers do NOT auto-flee (only charmed mobs might).

- `tests/integration/GroupFlow.test.ts` — Full group lifecycle:
  - Player A: Player B follows A. A groups B. Verify group display.
  - A moves north → B follows. Verify both in new room.
  - A splits 100 gold with B → 50 each.
  - A kills mob → XP is shared between A and B.
  - A disbands group → B is no longer grouped.
  - A orders charmed NPC "say hello" → NPC says hello.

---

## Acceptance Criteria

- [ ] `follow bob` sets the follower's master to bob and displays follow message.
- [ ] `follow self` stops following the current master.
- [ ] Charmed characters cannot voluntarily change who they follow.
- [ ] Circular follow chains are prevented (A follows B, B cannot follow A).
- [ ] `group` with no argument displays all group members with HP/mana/move/XP.
- [ ] `group bob` when bob is following → bob joins the group.
- [ ] `group bob` when bob is already grouped → bob is removed from the group.
- [ ] `group bob` enforces ±8 level restriction for mortals.
- [ ] `group all` groups all eligible followers in the room.
- [ ] `group disband` removes all members from the group.
- [ ] Only the group leader can disband.
- [ ] `isSameGroup()` correctly identifies group membership.
- [ ] `order pet sit` makes charmed pet execute 'sit' command.
- [ ] `order all sit` orders all charmed followers.
- [ ] `order` prevents recursive ordering (`order pet order ...`).
- [ ] `order` cannot be used on non-charmed NPCs or PCs.
- [ ] `dismiss pet` stops the charmed follower from following and strips charm.
- [ ] `split 100` with 2 group members in room → 50 each.
- [ ] `split 100` with 3 members → 33 each + leader gets remainder.
- [ ] `split` with solo player → "Just keep it all."
- [ ] `split` does not distribute to NPCs.
- [ ] `gwhere` displays all group members with their room locations.
- [ ] Social actions display correct messages for no-target, found-target, self-target, and not-found scenarios.
- [ ] Social variable substitution (`$n`, `$N`, `$e`, `$m`, `$s`, etc.) works correctly.
- [ ] Social actions fire `ACT_PROG` triggers on NPC targets.
- [ ] `report` displays HP/mana/move to the room.
- [ ] `drag bob north` moves both characters to the north room.
- [ ] `drag` validates target must be incapacitated/sleeping and not too heavy.
- [ ] Followers automatically move when their leader moves.
- [ ] Sleeping/incapacitated followers do NOT auto-follow.
- [ ] Charmed NPC followers auto-follow their master.
- [ ] Group XP sharing (from Phase 3N `groupGain()`) works with the group system.
- [ ] `dieFollower()` properly cleans up all follower/leader references on death.
- [ ] `stopFollowing()` strips `AFF_CHARM` from charmed followers.
- [ ] All `EventBus` events (`CharacterFollow`, `GroupJoin`, `GroupLeave`, `GroupDisband`, `GoldSplit`) are emitted at correct hook points.
- [ ] `beckon bob` displays beckon messages to ch, target, and room.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
