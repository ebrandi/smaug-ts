# SMAUG 2.0 TypeScript Port — Phase 3O: Communication System — Channels, Tells, Language, and Chat Commands

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

**Sub-Phases 3A–3N** are complete. The following files are fully implemented and may be imported:

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

### Sub-Phase 3C–3N (Magic, Skills, Affects, Inventory, Perception, Economy, Progression, etc.)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3O Objective

Implement the complete communication system: chat channels with scoping and access control, private tells and reply, room-based say/yell/shout, emotes, the language translation/scramble system, the deaf bitvector for channel muting, the ignore system for per-player message suppression, and tell history. After this sub-phase, players can communicate on all legacy channels (chat, yell, shout, clantalk, ordertalk, counciltalk, guildtalk, music, newbiechat, immtalk, racetalk, wartalk, etc.), send and reply to private tells, speak in different languages with comprehension-based scrambling, mute specific channels, and ignore individual players — all pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/commands/communication.ts` — Channel Enum, Config, and Core Broadcast

#### 1.1 Channel Enum

Define the `Channel` enum matching legacy channel constants from `mud.h`:

```typescript
export enum Channel {
  Chat      = 'chat',
  Yell      = 'yell',
  Shout     = 'shout',
  Tell      = 'tell',
  Clan      = 'clantalk',
  Order     = 'ordertalk',
  Council   = 'counciltalk',
  Guild     = 'guildtalk',
  Music     = 'music',
  Newbie    = 'newbiechat',
  Immtalk   = 'immtalk',
  Muse      = 'muse',
  Think     = 'think',
  Avatar    = 'avtalk',
  Wartalk   = 'wartalk',
  Racetalk  = 'racetalk',
}
```

#### 1.2 Channel Deaf Bitvector Flags

Define `CHANNEL_*` bigint flags for the `ch.deaf` bitvector. Each channel has a corresponding bit. Replicates legacy `CHANNEL_*` constants from `mud.h`:

```typescript
export const CHANNEL_CHAT      = 1n << 0n;
export const CHANNEL_YELL      = 1n << 1n;
export const CHANNEL_SHOUT     = 1n << 2n;
export const CHANNEL_TELLS     = 1n << 3n;
export const CHANNEL_CLAN      = 1n << 4n;
export const CHANNEL_ORDER     = 1n << 5n;
export const CHANNEL_COUNCIL   = 1n << 6n;
export const CHANNEL_GUILD     = 1n << 7n;
export const CHANNEL_MUSIC     = 1n << 8n;
export const CHANNEL_NEWBIE    = 1n << 9n;
export const CHANNEL_IMMTALK   = 1n << 10n;
export const CHANNEL_MUSE      = 1n << 11n;
export const CHANNEL_THINK     = 1n << 12n;
export const CHANNEL_AVATAR    = 1n << 13n;
export const CHANNEL_WARTALK   = 1n << 14n;
export const CHANNEL_RACETALK  = 1n << 15n;
export const CHANNEL_WHISPER   = 1n << 16n;
export const CHANNEL_ASK       = 1n << 17n;
export const CHANNEL_LOG       = 1n << 18n;
export const CHANNEL_HIGHGOD   = 1n << 19n;
```

#### 1.3 Channel Configuration Table

Define the `ChannelConfig` interface and `CHANNEL_CONFIGS` array matching legacy `talk_channel()` dispatch logic from `act_comm.c`:

```typescript
export interface ChannelConfig {
  /** Channel identifier. */
  name: Channel;
  /** Broadcast scope. */
  scope: 'global' | 'area' | 'room' | 'group' | 'private';
  /** Minimum trust level required to use this channel. */
  minTrust: number;
  /** If set, membership in this group type is required. */
  requiresGroup?: 'clan' | 'order' | 'council' | 'guild' | 'race';
  /** If true, the PK flag is required. */
  requiresPK?: boolean;
  /** Corresponding deaf bitvector flag. */
  deafFlag: bigint;
  /** Color code for the channel tag (e.g., '&G' for green). */
  color: string;
  /** Verb used in display (e.g., 'chat', 'yell', 'shout'). */
  verb: string;
  /** Verb used for sender echo (e.g., 'You chat', 'You yell'). */
  selfVerb: string;
}

const CHANNEL_CONFIGS: ChannelConfig[] = [
  { name: Channel.Chat,    scope: 'global',  minTrust: 0,  deafFlag: CHANNEL_CHAT,    color: '&G', verb: 'chat',    selfVerb: 'You chat' },
  { name: Channel.Yell,    scope: 'area',    minTrust: 0,  deafFlag: CHANNEL_YELL,    color: '&R', verb: 'yell',    selfVerb: 'You yell' },
  { name: Channel.Shout,   scope: 'global',  minTrust: 0,  deafFlag: CHANNEL_SHOUT,   color: '&Y', verb: 'shout',   selfVerb: 'You shout' },
  { name: Channel.Tell,    scope: 'private', minTrust: 0,  deafFlag: CHANNEL_TELLS,   color: '&G', verb: 'tell',    selfVerb: 'You tell' },
  { name: Channel.Clan,    scope: 'group',   minTrust: 0,  deafFlag: CHANNEL_CLAN,    color: '&c', verb: 'clantalk', selfVerb: 'You clantalk', requiresGroup: 'clan' },
  { name: Channel.Order,   scope: 'group',   minTrust: 0,  deafFlag: CHANNEL_ORDER,   color: '&c', verb: 'ordertalk', selfVerb: 'You ordertalk', requiresGroup: 'order' },
  { name: Channel.Council, scope: 'group',   minTrust: 0,  deafFlag: CHANNEL_COUNCIL, color: '&C', verb: 'counciltalk', selfVerb: 'You counciltalk', requiresGroup: 'council' },
  { name: Channel.Guild,   scope: 'group',   minTrust: 0,  deafFlag: CHANNEL_GUILD,   color: '&C', verb: 'guildtalk', selfVerb: 'You guildtalk', requiresGroup: 'guild' },
  { name: Channel.Music,   scope: 'global',  minTrust: 0,  deafFlag: CHANNEL_MUSIC,   color: '&P', verb: 'music',   selfVerb: 'You music' },
  { name: Channel.Newbie,  scope: 'global',  minTrust: 0,  deafFlag: CHANNEL_NEWBIE,  color: '&G', verb: 'newbiechat', selfVerb: 'You newbiechat' },
  { name: Channel.Immtalk, scope: 'global',  minTrust: 51, deafFlag: CHANNEL_IMMTALK, color: '&c', verb: 'immtalk', selfVerb: 'You immtalk' },
  { name: Channel.Muse,    scope: 'global',  minTrust: 58, deafFlag: CHANNEL_MUSE,    color: '&p', verb: 'muse',    selfVerb: 'You muse' },
  { name: Channel.Think,   scope: 'global',  minTrust: 55, deafFlag: CHANNEL_THINK,   color: '&b', verb: 'think',   selfVerb: 'You think' },
  { name: Channel.Avatar,  scope: 'global',  minTrust: 50, deafFlag: CHANNEL_AVATAR,  color: '&B', verb: 'avtalk',  selfVerb: 'You avtalk' },
  { name: Channel.Wartalk, scope: 'global',  minTrust: 0,  deafFlag: CHANNEL_WARTALK, color: '&R', verb: 'wartalk', selfVerb: 'You wartalk', requiresPK: true },
  { name: Channel.Racetalk, scope: 'group',  minTrust: 0,  deafFlag: CHANNEL_RACETALK, color: '&w', verb: 'racetalk', selfVerb: 'You racetalk', requiresGroup: 'race' },
];
```

#### 1.4 `talkChannel(ch, message, channel, connectionMgr)` — Core Channel Broadcast

Implement the core broadcast function. Replicates legacy `talk_channel()` from `act_comm.c`:

1. **Look up channel config** from `CHANNEL_CONFIGS` by `channel` enum value. If not found, return silently.
2. **Trust check:** If `ch.getTrust() < config.minTrust`, send "You can't use that channel.\r\n" and return.
3. **Deaf self-check:** If `hasFlag(ch.deaf, config.deafFlag)`, send "You have that channel turned off.\r\n" and return. *(Legacy behavior: the channel deafness is checked for the sender too.)*
4. **Position check:** If `ch.position` is below `Position.Resting`, send "In your dreams, or what?\r\n" and return. For `Channel.Shout`, require `Position.Standing`.
5. **Group membership check (if `config.requiresGroup` is set):**
   - `'clan'` → `ch.pcData?.clanName` must be set (non-empty). Otherwise: "You are not a member of an organization.\r\n"
   - `'order'` → `ch.pcData?.orderName` must be set.
   - `'council'` → `ch.pcData?.councilName` must be set.
   - `'guild'` → `ch.pcData?.guildName` must be set.
   - `'race'` → No additional check (all characters have a race).
6. **PK check (if `config.requiresPK`):** If `!ch.isPKill()`, send "You must be deadly to use wartalk.\r\n" and return.
7. **Room silence check:** If `ch.inRoom` has `ROOM_SILENCE` flag set, send "The room absorbs your words.\r\n" and return. *(Exception: Immortals bypass silence.)*
8. **Apply language translation:** Call `translateMessage(ch, null, message)` to get the default scrambled version for general use. *(Per-recipient translation is done in the loop.)*
9. **Emit EventBus event** `GameEvent.ChannelMessage` with `{ channel, speaker: ch, message }`.
10. **Iterate all playing descriptors** from `connectionMgr.getPlayingDescriptors()`:
    - Let `victim = desc.character`. Skip if `!victim` or `victim === ch`.
    - **Deaf check:** If `hasFlag(victim.deaf, config.deafFlag)`, skip.
    - **Ignore check:** If `isIgnoring(victim, ch)`, skip.
    - **Scope filtering:**
      - `'global'` → no additional filter.
      - `'area'` → skip if `victim.inRoom?.area !== ch.inRoom?.area`.
      - `'room'` → skip if `victim.inRoom !== ch.inRoom`.
      - `'group'` → apply group filter based on `config.requiresGroup`:
        - `'clan'` → skip if `victim.pcData?.clanName !== ch.pcData?.clanName`.
        - `'order'` → skip if `victim.pcData?.orderName !== ch.pcData?.orderName`.
        - `'council'` → skip if `victim.pcData?.councilName !== ch.pcData?.councilName`.
        - `'guild'` → skip if `victim.pcData?.guildName !== ch.pcData?.guildName`.
        - `'race'` → skip if `victim.race !== ch.race`.
      - `'private'` → handled separately by `doTell()`; skip all in generic broadcast.
    - **Room silence on recipient:** If `victim.inRoom` has `ROOM_SILENCE`, skip. *(Exception: Immortals bypass.)*
    - **Per-recipient language translation:** Call `translateMessage(ch, victim, message)`.
    - **Format and send:** `victim.sendToChar(\`${config.color}${ch.name} ${config.verb}s '${translatedMsg}'&D\r\n\`)`.
11. **Send echo to sender:** `ch.sendToChar(\`${config.color}${config.selfVerb} '${message}'&D\r\n\`)`.

#### 1.5 Helper: `getChannelConfig(channel: Channel): ChannelConfig | undefined`

Lookup utility that returns the channel config entry. Used by multiple command handlers.

---

### 2. `src/game/commands/communication.ts` — Channel Command Handlers

Each channel command is a thin wrapper around `talkChannel()`. Register all in `CommandRegistry` with the correct trust level and minimum position.

#### 2.1 `doChat(ch, arg)` — Global Chat

- If `arg` is empty, toggle `CHANNEL_CHAT` on `ch.deaf` and confirm: "Chat channel is now ON/OFF."
- Otherwise, call `talkChannel(ch, arg, Channel.Chat, connectionMgr)`.
- **Registration:** name `'chat'`, trust 0, position `Position.Dead`, log `LOG_NORMAL`. Aliases: `'.'` (period).

#### 2.2 `doYell(ch, arg)` — Area-Scoped Yell

- If `arg` is empty, toggle `CHANNEL_YELL`. Otherwise, call `talkChannel(ch, arg, Channel.Yell, connectionMgr)`.
- **Registration:** name `'yell'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.3 `doShout(ch, arg)` — Global Shout

- If `arg` is empty, toggle `CHANNEL_SHOUT`. Otherwise, call `talkChannel(ch, arg, Channel.Shout, connectionMgr)`.
- Requires `Position.Standing`.
- **Registration:** name `'shout'`, trust 0, position `Position.Standing`, log `LOG_NORMAL`.

#### 2.4 `doSay(ch, arg)` — Room-Only Speech

- **Not a channel broadcast.** `doSay` sends to the current room only.
- If `arg` is empty, send "Say what?\r\n" and return.
- **Room silence check:** If `ROOM_SILENCE` and not immortal, send "The room absorbs your words.\r\n" and return.
- **Apply language:** For each character in `ch.inRoom.people`, call `translateMessage(ch, victim, arg)`.
- **Format output to room:** `"$n says '$t'"` using `actToRoom()` or equivalent, where `$t` is the per-recipient translated message.
- **Send echo to speaker:** `ch.sendToChar(\`&cYou say '${arg}'&D\r\n\`)`.
- **Fire SPEECH_PROG:** After display, iterate NPCs in the room. For each NPC with a `SPEECH_PROG` trigger, call `ScriptParser.checkTrigger(MudProgTrigger.SpeechProg, npc, ch, arg)`. The `SPEECH_PROG` `argList` is matched against the spoken text (keyword or regex match as per legacy `mprog_wordlist_check()`).
- **Emit EventBus event** `GameEvent.CharacterSay` with `{ speaker: ch, message: arg, room: ch.inRoom }`.
- **Registration:** name `'say'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`. Alias: `"'"` (single quote).

#### 2.5 `doSayTo(ch, arg)` — Directed Room Speech

- Parse `arg` into `targetName` and `message` via `oneArgument()`.
- Find target in room: `ch.inRoom.people.find(v => isNamePrefix(targetName, v.name))`.
- If not found, send "They aren't here.\r\n" and return.
- Same silence/language handling as `doSay`.
- **Format output:** `"$n says to $N '$t'"` — shown to target. Room sees `"$n says to $N something."` if they don't understand the language.
- **Registration:** name `'say_to'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.6 `doTell(ch, arg)` — Private Tell

Replicates legacy `do_tell()` from `act_comm.c`:

1. Parse `arg` into `targetName` and `message` via `oneArgument()`.
2. If no `targetName` or no `message`, send "Tell whom what?\r\n" and return.
3. **Sender deaf check:** If `hasFlag(ch.deaf, CHANNEL_TELLS)`, send "You have tells turned off.\r\n" and return.
4. **Find target:** Search `connectionMgr.getPlayingDescriptors()` for a character matching `targetName` via `isNamePrefix()`. If not found, send "They aren't here.\r\n" and return.
5. **Target is self:** Send "Talking to yourself again?\r\n" and return.
6. **Target deaf check:** If `hasFlag(victim.deaf, CHANNEL_TELLS)` and `ch.getTrust() < LEVEL_IMMORTAL`, send "That player has tells turned off.\r\n" and return.
7. **Target ignore check:** If `isIgnoring(victim, ch)` and `ch.getTrust() < LEVEL_IMMORTAL`, send "That player is ignoring you.\r\n" and return.
8. **Target busy check:** If `victim.desc?.connectionState !== ConnState.Playing`, send "That player is currently occupied.\r\n" and return. *(Allow tells to AFK players but note it.)*
9. **Room silence:** Does NOT block tells (private channel bypasses silence).
10. **Language translation:** `const translated = translateMessage(ch, victim, message)`.
11. **Send to victim:** `victim.sendToChar(\`&G${ch.name} tells you '${translated}'&D\r\n\`)`.
12. **Send echo to sender:** `ch.sendToChar(\`&GYou tell ${victim.name} '${message}'&D\r\n\`)`.
13. **Set reply target:** `victim.replyTo = ch`.
14. **Tell history:** Append to `victim.pcData.tellHistory[]`. Maintain max 20 entries (FIFO).
15. **Store retell:** `ch.retellTo = victim; ch.retellMessage = message`. *(Used by `doRetell()`.)*
16. **Emit EventBus event** `GameEvent.CharacterTell` with `{ sender: ch, target: victim, message }`.
17. **Registration:** name `'tell'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.7 `doReply(ch, arg)` — Reply to Last Tell

Replicates legacy `do_reply()`:

1. If `!ch.replyTo`, send "They aren't here.\r\n" and return.
2. Verify `ch.replyTo` is still connected (still in playing descriptors). If not, send "They aren't here.\r\n", clear `ch.replyTo`, and return.
3. Delegate to `doTell()` with `arg = \`${ch.replyTo.name} ${arg}\``.
4. **Registration:** name `'reply'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.8 `doRetell(ch, arg)` — Resend Last Tell

Replicates legacy `do_retell()`:

1. If `!ch.retellTo` or `!ch.retellMessage`, send "You haven't sent a tell recently.\r\n" and return.
2. Verify `ch.retellTo` is still connected. If not, clear and error.
3. If `arg` is non-empty, use `arg` as the new message; otherwise use `ch.retellMessage`.
4. Delegate to `doTell()` with `\`${ch.retellTo.name} ${message}\``.
5. **Registration:** name `'retell'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.9 `doRepeat(ch, arg)` — Show Tell History

Replicates legacy `do_repeat()`:

1. If `arg` is empty, display the full tell history as a numbered list.
2. If `arg` is a letter (a–z), display tells starting from that letter index in `ch.pcData.tellHistory[]`. *(Legacy stores per-letter: `tell_history[26]`, indexed by `lt_index 'a'-'z'`.)*
3. If no tells stored, send "No tells to repeat.\r\n".
4. **Registration:** name `'repeat'`, trust 0, position `Position.Dead`, log `LOG_NORMAL`.

#### 2.10 `doWhisper(ch, arg)` — Whisper to Nearby Player

Replicates legacy `do_whisper()`:

1. Parse `arg` into `targetName` and `message` via `oneArgument()`.
2. Find target **in the same room**: `ch.inRoom.people.find(...)`.
3. If not found, send "They aren't here.\r\n".
4. **Deaf check:** If `hasFlag(victim.deaf, CHANNEL_WHISPER)`, send "That player has whisper turned off.\r\n".
5. **Ignore check:** If `isIgnoring(victim, ch)`, send "That player is ignoring you.\r\n".
6. **Language translation:** `translateMessage(ch, victim, message)`.
7. **Send to victim:** `victim.sendToChar(\`${ch.name} whispers to you '${translated}'&D\r\n\`)`.
8. **Send echo to sender:** `ch.sendToChar(\`You whisper to ${victim.name} '${message}'&D\r\n\`)`.
9. **Room notice:** Others in room see `"${ch.name} whispers something to ${victim.name}.\r\n"`.
10. **Registration:** name `'whisper'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.11 `doGtell(ch, arg)` — Group Tell

Replicates legacy `do_gtell()`:

1. If `arg` is empty, send "Tell your group what?\r\n" and return.
2. If `!ch.leader && !ch.isGrouped()`, send "You are not in a group.\r\n" and return. *(A character is grouped if they have a leader or followers with the `isGrouped` flag.)*
3. Determine the group leader: `const leader = ch.leader || ch`.
4. **Iterate group members:** For the leader and all characters whose `leader === leader` (followers in any room):
   - Skip if `isIgnoring(member, ch)`.
   - Send `"&P${ch.name} tells the group '${arg}'&D\r\n"` to each member.
5. **Registration:** name `'gtell'`, trust 0, position `Position.Dead`, log `LOG_NORMAL`. Alias: `';'`.

#### 2.12 `doClanTalk(ch, arg)`, `doOrderTalk(ch, arg)`, `doCouncilTalk(ch, arg)`, `doGuildTalk(ch, arg)`

Each is a wrapper around `talkChannel()` with the appropriate `Channel` enum value:

- `doClanTalk` → `Channel.Clan` — requires `ch.pcData?.clanName`.
- `doOrderTalk` → `Channel.Order` — requires `ch.pcData?.orderName`.
- `doCouncilTalk` → `Channel.Council` — requires `ch.pcData?.councilName`.
- `doGuildTalk` → `Channel.Guild` — requires `ch.pcData?.guildName`.

Toggle behavior on empty arg (same pattern as `doChat`).

**Registration:** name `'clantalk'/'ordertalk'/'counciltalk'/'guildtalk'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.13 `doMusic(ch, arg)` — Music Channel

- Wrapper around `talkChannel(ch, arg, Channel.Music, connectionMgr)`.
- Toggle on empty arg.
- **Registration:** name `'music'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.14 `doNewbieChat(ch, arg)` — Newbie Channel

- Wrapper around `talkChannel(ch, arg, Channel.Newbie, connectionMgr)`.
- Toggle on empty arg.
- Immortals can always use this channel regardless of level.
- **Registration:** name `'newbiechat'`, trust 0, position `Position.Dead`, log `LOG_NORMAL`.

#### 2.15 `doImmtalk(ch, arg)` — Immortal Channel

- Wrapper around `talkChannel(ch, arg, Channel.Immtalk, connectionMgr)`.
- Requires `ch.getTrust() >= LEVEL_IMMORTAL` (handled by `talkChannel` trust check and command registration).
- Toggle on empty arg.
- **Registration:** name `'immtalk'`, trust `LEVEL_IMMORTAL`, position `Position.Dead`, log `LOG_NORMAL`. Alias: `':'`.

#### 2.16 `doRaceTalk(ch, arg)` — Race Channel

- Wrapper around `talkChannel(ch, arg, Channel.Racetalk, connectionMgr)`.
- Only characters of the same race receive the message.
- Toggle on empty arg.
- **Registration:** name `'racetalk'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 2.17 `doWartalk(ch, arg)` — PK War Channel

- Wrapper around `talkChannel(ch, arg, Channel.Wartalk, connectionMgr)`.
- Requires PK flag (`ch.isPKill()`).
- Toggle on empty arg.
- **Registration:** name `'wartalk'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

---

### 3. `src/game/commands/communication.ts` — Emote System

#### 3.1 `doEmote(ch, arg)` — Custom Emote

Replicates legacy `do_emote()` from `act_comm.c`:

1. If `arg` is empty, send "Emote what?\r\n" and return.
2. **Room silence check:** If `ROOM_SILENCE` and not immortal, block.
3. **Format:** Display `"${ch.name} ${arg}"` to all characters in the room (including the sender).
4. **No language translation applied** — emotes are assumed to be action descriptions, not speech.
5. **Registration:** name `'emote'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`. Alias: `','`.

#### 3.2 `doPmote(ch, arg)` — Possessive Emote

Replicates legacy `do_pmote()`:

1. If `arg` is empty, send "Emote what?\r\n".
2. Display `"${ch.name}'s ${arg}"` to the room.
3. For each mention of a character name in `arg`, replace it with "you" for that character and "them" for others.
4. **Registration:** name `'pmote'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

---

### 4. `src/game/commands/communication.ts` — Language System

#### 4.1 Language Enum

Define all languages matching legacy `lang_array[]` from `mud.h`:

```typescript
export enum Language {
  Common     = 0,
  Elvish     = 1,
  Dwarvish   = 2,
  Pixie      = 3,
  Ogre       = 4,
  Orcish     = 5,
  Trollish   = 6,
  Rodent     = 7,
  Insectoid  = 8,
  Mammalian  = 9,
  Reptile    = 10,
  Dragon     = 11,
  Spiritual  = 12,
  Magical    = 13,
  Goblin     = 14,
  God        = 15,
  Ancient    = 16,
  Halfling   = 17,
  Clan       = 18,
  Unknown    = 19,
}
```

#### 4.2 Language Bitvector Flags

Define `LANG_*` bigint flags for `ch.speaks` (languages known) and `ch.speaking` (current spoken language):

```typescript
export const LANG_COMMON     = 1n << 0n;
export const LANG_ELVISH     = 1n << 1n;
export const LANG_DWARVISH   = 1n << 2n;
export const LANG_PIXIE      = 1n << 3n;
export const LANG_OGRE       = 1n << 4n;
export const LANG_ORCISH     = 1n << 5n;
export const LANG_TROLLISH   = 1n << 6n;
export const LANG_RODENT     = 1n << 7n;
export const LANG_INSECTOID  = 1n << 8n;
export const LANG_MAMMALIAN  = 1n << 9n;
export const LANG_REPTILE    = 1n << 10n;
export const LANG_DRAGON     = 1n << 11n;
export const LANG_SPIRITUAL  = 1n << 12n;
export const LANG_MAGICAL    = 1n << 13n;
export const LANG_GOBLIN     = 1n << 14n;
export const LANG_GOD        = 1n << 15n;
export const LANG_ANCIENT    = 1n << 16n;
export const LANG_HALFLING   = 1n << 17n;
export const LANG_CLAN       = 1n << 18n;
export const LANG_UNKNOWN    = 1n << 19n;
```

#### 4.3 Language Scramble Tables

Define per-language character substitution tables. Replicates legacy `lang_table[]` from `act_comm.c`. Each language has a 26-character substitution string for lowercase letters and an equivalent for uppercase:

```typescript
/**
 * Scramble substitution tables per language.
 * Index: language enum value. Value: 26-char substitution string (a→z).
 * Replicates legacy scramble() tables from act_comm.c.
 */
const SCRAMBLE_TABLES: Record<number, string> = {
  [Language.Common]:    'abcdefghijklmnopqrstuvwxyz', // identity — Common is never scrambled
  [Language.Elvish]:    'eaibydoshpcmultrfvgznwjqkx',
  [Language.Dwarvish]:  'dwarfishbcegljkmnopqtuvxyz',
  [Language.Pixie]:     'pixeafbcdghjklmnoqrstuvwyz',
  [Language.Ogre]:      'ogurakbcdefhijlmnpqstvwxyz',
  [Language.Orcish]:    'orkacbdefghijlmnpqstuvwxyz',
  [Language.Trollish]:  'trollakbcdefghijmnpqsuvwxy',
  [Language.Rodent]:    'squeakbcdfghijlmnoprtuvwxy',
  [Language.Insectoid]: 'ixtkbcdefghjlmnopqrsuvwayz',
  [Language.Mammalian]: 'growlabcdefhijkmnpqstuvwxy',
  [Language.Reptile]:   'haborslcdefgijkmnpqtuvwxyz',
  [Language.Dragon]:    'dragnobcefhijklmpqstuvwxyz',
  [Language.Spiritual]: 'spirtalcdefghjkmnoquvwxyzb',
  [Language.Magical]:   'magickbcdefhjlnopqrstuvwxy',
  [Language.Goblin]:    'goblinacdefhjkmpqrstuvwxyz',
  [Language.God]:       'abcdefghijklmnopqrstuvwxyz', // God tongue: pass-through
  [Language.Ancient]:   'ancietbdfghjklmopqrsuvwxyz',
  [Language.Halfling]:  'halfingbcdejkmnopqrstuvwxy',
  [Language.Clan]:      'abcdefghijklmnopqrstuvwxyz', // Clan: pass-through for members
  [Language.Unknown]:   'zyxwvutsrqponmlkjihgfedcba', // reverse alphabet
};
```

#### 4.4 `scramble(message, language)` — Character Substitution

Replicates legacy `scramble()` from `act_comm.c`:

1. Look up the substitution table for `language`.
2. For each character in `message`:
   - If lowercase letter (`a-z`), replace with `table[charCode - 97]`.
   - If uppercase letter (`A-Z`), replace with `table[charCode - 65].toUpperCase()`.
   - Otherwise, keep unchanged (spaces, punctuation, digits pass through).
3. Return the scrambled string.

#### 4.5 `translateMessage(speaker, listener, message)` — Language Comprehension

Replicates legacy `translate()` from `act_comm.c`:

```typescript
/**
 * Translate a message from the speaker's current language for the listener.
 *
 * @param speaker - The character speaking.
 * @param listener - The character listening (null for broadcast preview).
 * @param message - The raw message.
 * @returns The message as heard by the listener (potentially scrambled).
 *
 * Rules (from legacy translate()):
 * 1. Common language is always understood at 100%.
 * 2. If speaker is speaking Common, return message unchanged.
 * 3. If listener is null, return message unchanged (sender echo).
 * 4. If listener is an NPC, return message unchanged (NPCs understand all).
 * 5. If listener is an immortal (trust >= LEVEL_IMMORTAL), return unchanged.
 * 6. Look up listener's proficiency in speaker's current language:
 *    proficiency = listener.pcData.learned[langSkillId] ?? 0.
 * 7. If proficiency >= 85, return message unchanged.
 * 8. Otherwise, apply partial scramble:
 *    - For each character, roll numberPercent(). If roll > proficiency, scramble it.
 *    - This produces a proportional scramble: 0% = fully scrambled, 84% = mostly clear.
 * 9. Return the partially scrambled message.
 */
export function translateMessage(
  speaker: Character,
  listener: Character | null,
  message: string
): string;
```

#### 4.6 `doSpeak(ch, arg)` — Change Active Language

Replicates legacy `do_speak()`:

1. If `arg` is empty, display current speaking language: `"You are speaking ${languageName(ch.speaking)}.\r\n"`.
2. Parse `arg` as a language name (case-insensitive match against language names).
3. If not found, send "You don't know that language.\r\n" and return.
4. Check if the character knows the language: `hasFlag(ch.speaks, langFlag)`. If not, send "You don't know that language.\r\n".
5. Set `ch.speaking = langFlag`.
6. Send `"You now speak ${languageName(ch.speaking)}.\r\n"`.
7. **Registration:** name `'speak'`, trust 0, position `Position.Resting`, log `LOG_NORMAL`.

#### 4.7 `doLanguages(ch, arg)` — List Known Languages

Replicates legacy `do_languages()`:

1. Display header: `"Languages known:\r\n"`.
2. Iterate all `LANG_*` flags. For each that `hasFlag(ch.speaks, langFlag)`:
   - Look up proficiency: `ch.pcData.learned[langSkillId] ?? 0`.
   - Display: `"  ${languageName} ${proficiency}%${ch.speaking === langFlag ? ' (speaking)' : ''}\r\n"`.
3. If character speaks no languages beyond Common, note it.
4. **Registration:** name `'languages'`, trust 0, position `Position.Dead`, log `LOG_NORMAL`.

#### 4.8 `languageName(langFlag)` and `languageToFlag(name)` — Helper Functions

- `languageName(flag: bigint): string` — Converts a `LANG_*` flag to its display name.
- `languageToFlag(name: string): bigint | null` — Converts a language name string to its `LANG_*` flag (case-insensitive).
- `getLanguageSkillId(langFlag: bigint): number` — Maps a language flag to the corresponding skill ID in the skill system (for proficiency lookups).

---

### 5. `src/game/commands/communication.ts` — Deaf Toggle and Ignore System

#### 5.1 `doDeaf(ch, arg)` — Channel Toggle

Replicates legacy `do_deaf()`:

1. If `arg` is empty, display all channel states:
   - Iterate `CHANNEL_CONFIGS`. For each, show `"${config.verb}: ${hasFlag(ch.deaf, config.deafFlag) ? 'OFF' : 'ON'}\r\n"`.
2. If `arg` matches a channel verb name (case-insensitive):
   - Toggle the corresponding deaf flag: `ch.deaf = toggleFlag(ch.deaf, config.deafFlag)`.
   - Send `"${config.verb} channel is now ${hasFlag(ch.deaf, config.deafFlag) ? 'OFF' : 'ON'}.\r\n"`.
3. If `arg` is `'all'`:
   - Set all channel deaf flags ON (deafen everything).
   - Send `"All channels turned off.\r\n"`.
4. If `arg` is `'none'`:
   - Clear all channel deaf flags (enable everything).
   - Send `"All channels turned on.\r\n"`.
5. If `arg` doesn't match any known channel, send `"Unknown channel: ${arg}.\r\n"`.
6. **Registration:** name `'deaf'`, trust 0, position `Position.Dead`, log `LOG_NORMAL`. Alias: `'channels'`.

#### 5.2 `isIgnoring(victim, ch)` — Ignore Check

Replicates legacy `is_ignoring()`:

1. If `ch` is an NPC, return `false` (NPCs can't be ignored).
2. If `ch.getTrust() >= LEVEL_IMMORTAL`, return `false` (Immortals bypass ignore).
3. Check if `ch.name` is in `victim.pcData.ignoreList[]` (case-insensitive match).
4. Return `true` if found, `false` otherwise.

#### 5.3 `doIgnore(ch, arg)` — Manage Ignore List

Replicates legacy `do_ignore()`:

1. If `arg` is empty, display current ignore list:
   - If empty: `"You are not ignoring anyone.\r\n"`.
   - Otherwise: `"Ignoring: ${list.join(', ')}\r\n"`.
2. If `arg` matches an already-ignored name, remove from list: `"You are no longer ignoring ${name}.\r\n"`.
3. If `arg` is a valid player name (check `connectionMgr` or `PlayerRepository.playerExists()`):
   - Prevent ignoring self: `"You can't ignore yourself.\r\n"`.
   - Prevent ignoring immortals: `"You can't ignore immortals.\r\n"`.
   - Add to `ch.pcData.ignoreList[]`: `"You are now ignoring ${name}.\r\n"`.
   - Enforce max ignore list size (20 entries): `"Your ignore list is full.\r\n"`.
4. If name not found: `"No such player.\r\n"`.
5. **Registration:** name `'ignore'`, trust 0, position `Position.Dead`, log `LOG_NORMAL`.

---

### 6. Character Entity Updates

#### 6.1 `src/game/entities/Character.ts` — Communication Fields

Ensure the `Character` class (or `Player` subclass) has the following communication-related fields, initialized during character creation or load:

```typescript
/** Bitvector of muted channels. CHANNEL_* flags. */
deaf: bigint = 0n;

/** Bitvector of known languages. LANG_* flags. */
speaks: bigint = LANG_COMMON;

/** Bitvector of the currently spoken language. */
speaking: bigint = LANG_COMMON;

/** Last character who sent us a tell (for reply). */
replyTo: Character | null = null;

/** Last character we sent a tell to (for retell). */
retellTo: Character | null = null;

/** Last tell message we sent (for retell). */
retellMessage: string = '';
```

#### 6.2 `src/game/entities/Player.ts` — PC Data Communication Fields

Ensure `pcData` includes:

```typescript
/** Tell history (last 20 tells received). FIFO. */
tellHistory: Array<{ sender: string; message: string; timestamp: Date }> = [];

/** Ignore list (player names, max 20). */
ignoreList: string[] = [];
```

---

### 7. EventBus Event Definitions

Add the following events to the `GameEvent` enum in `src/core/EventBus.ts` (if not already present):

```typescript
/** Fired when a message is sent on a channel. */
ChannelMessage = 'channel:message',

/** Fired when a player says something in a room. */
CharacterSay = 'character:say',

/** Fired when a tell is sent. */
CharacterTell = 'character:tell',
```

Event payload interfaces:

```typescript
export interface ChannelMessagePayload {
  channel: Channel;
  speaker: Character;
  message: string;
}

export interface CharacterSayPayload {
  speaker: Character;
  message: string;
  room: Room;
}

export interface CharacterTellPayload {
  sender: Character;
  target: Character;
  message: string;
}
```

---

### 8. Command Registration Summary

Register all communication commands in `CommandRegistry` during boot (in `src/game/commands/communication.ts` or the registration loader):

| Command | Function | Trust | Position | Log | Aliases |
|---------|----------|-------|----------|-----|---------|
| `chat` | `doChat` | 0 | Dead | Normal | `.` |
| `yell` | `doYell` | 0 | Resting | Normal | |
| `shout` | `doShout` | 0 | Standing | Normal | |
| `say` | `doSay` | 0 | Resting | Normal | `'` |
| `say_to` | `doSayTo` | 0 | Resting | Normal | |
| `tell` | `doTell` | 0 | Resting | Normal | |
| `reply` | `doReply` | 0 | Resting | Normal | |
| `retell` | `doRetell` | 0 | Resting | Normal | |
| `repeat` | `doRepeat` | 0 | Dead | Normal | |
| `whisper` | `doWhisper` | 0 | Resting | Normal | |
| `gtell` | `doGtell` | 0 | Dead | Normal | `;` |
| `clantalk` | `doClanTalk` | 0 | Resting | Normal | |
| `ordertalk` | `doOrderTalk` | 0 | Resting | Normal | |
| `counciltalk` | `doCouncilTalk` | 0 | Resting | Normal | |
| `guildtalk` | `doGuildTalk` | 0 | Resting | Normal | |
| `music` | `doMusic` | 0 | Resting | Normal | |
| `newbiechat` | `doNewbieChat` | 0 | Dead | Normal | |
| `immtalk` | `doImmtalk` | `LEVEL_IMMORTAL` | Dead | Normal | `:` |
| `racetalk` | `doRaceTalk` | 0 | Resting | Normal | |
| `wartalk` | `doWartalk` | 0 | Resting | Normal | |
| `emote` | `doEmote` | 0 | Resting | Normal | `,` |
| `pmote` | `doPmote` | 0 | Resting | Normal | |
| `speak` | `doSpeak` | 0 | Resting | Normal | |
| `languages` | `doLanguages` | 0 | Dead | Normal | |
| `deaf` | `doDeaf` | 0 | Dead | Normal | `channels` |
| `ignore` | `doIgnore` | 0 | Dead | Normal | |

---

## Tests for Sub-Phase 3O

- `tests/unit/commands/communication.test.ts` — Channel broadcast tests:
  - `talkChannel()` with `Channel.Chat` broadcasts to all playing descriptors.
  - `talkChannel()` with `Channel.Yell` only reaches characters in the same area.
  - `talkChannel()` with `Channel.Shout` reaches all characters globally.
  - `talkChannel()` with `Channel.Clan` only reaches characters with the same `clanName`.
  - `talkChannel()` with `Channel.Racetalk` only reaches characters of the same `race`.
  - `talkChannel()` with `Channel.Wartalk` requires PK flag; non-PK sender is rejected.
  - `talkChannel()` with `Channel.Immtalk` requires trust >= `LEVEL_IMMORTAL`; mortal sender is rejected.
  - `talkChannel()` skips recipients with the channel deaf flag set.
  - `talkChannel()` skips recipients who are ignoring the sender.
  - `talkChannel()` skips recipients in rooms with `ROOM_SILENCE` flag.
  - `talkChannel()` sender in `ROOM_SILENCE` room is blocked (non-immortal).
  - `talkChannel()` immortal in `ROOM_SILENCE` room can still broadcast.

- `tests/unit/commands/communication-say.test.ts` — Say/emote tests:
  - `doSay('Hello')` sends to all characters in the room.
  - `doSay('')` with empty arg sends "Say what?"
  - `doSay()` in `ROOM_SILENCE` sends "The room absorbs your words."
  - `doSay()` fires `SPEECH_PROG` on NPCs in the room.
  - `doEmote('dances')` displays "$n dances" to the room.
  - `doEmote('')` sends "Emote what?"
  - `doSayTo('bob hello')` sends directed speech to Bob.

- `tests/unit/commands/communication-tell.test.ts` — Tell/reply/retell tests:
  - `doTell('bob hello')` sends tell to bob and sets `bob.replyTo`.
  - `doTell()` with no args sends "Tell whom what?"
  - `doTell('bob hello')` when bob has `CHANNEL_TELLS` deaf → "That player has tells turned off."
  - `doTell('bob hello')` when bob is ignoring sender → "That player is ignoring you."
  - `doTell()` stores message in `victim.pcData.tellHistory[]` (max 20).
  - `doReply('thanks')` sends tell to `ch.replyTo`.
  - `doReply()` when no `replyTo` → "They aren't here."
  - `doRetell()` resends last tell message to last target.
  - `doRepeat()` with no args shows full tell history.
  - Tell history FIFO: 21st tell evicts the oldest.

- `tests/unit/commands/communication-language.test.ts` — Language system tests:
  - `translateMessage()` with Common language → message unchanged.
  - `translateMessage()` with Elvish, listener knows Elvish at 90% → message unchanged.
  - `translateMessage()` with Elvish, listener knows Elvish at 50% → partially scrambled.
  - `translateMessage()` with Elvish, listener knows Elvish at 0% → fully scrambled.
  - `translateMessage()` with NPC listener → message unchanged.
  - `translateMessage()` with immortal listener → message unchanged.
  - `scramble('hello', Language.Elvish)` produces consistent substitution.
  - `scramble()` preserves spaces, punctuation, and digits.
  - `doSpeak('elvish')` sets `ch.speaking = LANG_ELVISH`.
  - `doSpeak('unknown_lang')` → "You don't know that language."
  - `doLanguages()` lists all known languages with proficiency.

- `tests/unit/commands/communication-deaf-ignore.test.ts` — Deaf/ignore tests:
  - `doDeaf('')` lists all channel states.
  - `doDeaf('chat')` toggles chat channel off.
  - `doDeaf('chat')` again toggles chat channel on.
  - `doDeaf('all')` mutes all channels.
  - `doDeaf('none')` unmutes all channels.
  - `doIgnore('')` lists current ignore list (empty → "You are not ignoring anyone.").
  - `doIgnore('bob')` adds Bob to ignore list.
  - `doIgnore('bob')` when already ignoring removes Bob.
  - `doIgnore()` prevents ignoring self.
  - `doIgnore()` prevents ignoring immortals.
  - `doIgnore()` enforces max 20 entries.
  - `isIgnoring()` returns true for ignored player.
  - `isIgnoring()` returns false for immortal sender.
  - `isIgnoring()` returns false for NPC sender.

- `tests/unit/commands/communication-whisper-gtell.test.ts` — Whisper/gtell tests:
  - `doWhisper('bob hello')` sends to Bob in same room.
  - `doWhisper('bob hello')` when Bob is ignoring → blocked.
  - `doWhisper()` others in room see "X whispers something to Y."
  - `doGtell('rally!')` sends to all group members.
  - `doGtell()` when not in group → "You are not in a group."
  - `doGtell()` skips group members who are ignoring sender.

- `tests/integration/CommunicationFlow.test.ts` — Full communication flow:
  - Player A chats "Hello" → Player B receives `[chat] A: Hello`.
  - Player A tells Player B "Secret" → B receives tell; B uses reply "Got it" → A receives tell.
  - Player A speaks Elvish, says "Hello" → Player B (knows Elvish at 20%) sees scrambled text; Player C (knows Elvish at 90%) sees clear text.
  - Player A ignores Player B → B's tells and channel messages are suppressed for A.
  - Player A deafens chat → no longer receives chat messages.
  - Player A yells "Help" → only players in the same area hear it.
  - Clan member A uses clantalk → only same-clan members receive.

---

## Acceptance Criteria

- [ ] `chat Hello everyone` broadcasts to all connected players with `[chat]` prefix and green color.
- [ ] `chat` with no argument toggles the chat channel off/on for the sender.
- [ ] `yell Help!` broadcasts to all players in the same area.
- [ ] `shout Rally!` broadcasts globally to all players.
- [ ] `say Hello` displays "$n says 'Hello'" to all characters in the room.
- [ ] `say Hello` in a room with an NPC that has a `SPEECH_PROG` matching "hello" triggers the prog.
- [ ] `say` in a `ROOM_SILENCE` room sends "The room absorbs your words." (non-immortal).
- [ ] `say_to bob Hello` sends directed speech to Bob in the room.
- [ ] `tell Bob Hi there` sends a private message to Bob with green color.
- [ ] `tell Bob Hi there` stores the tell in Bob's tell history.
- [ ] `tell Bob Hi there` sets `Bob.replyTo = sender`.
- [ ] Bob can `reply Thanks` to respond to the last teller.
- [ ] `retell` resends the last tell to the last recipient.
- [ ] `repeat` shows the tell history.
- [ ] `whisper bob secret` sends only to Bob; others see "X whispers something to Y."
- [ ] `gtell Rally at the gates!` sends to all group members.
- [ ] `clantalk Rally!` only reaches clan members with the same `clanName`.
- [ ] `ordertalk`, `counciltalk`, `guildtalk` only reach respective group members.
- [ ] `racetalk` only reaches characters of the same race.
- [ ] `wartalk Let's fight!` requires PK flag; non-PK players are rejected.
- [ ] `immtalk Admin notice` requires trust >= `LEVEL_IMMORTAL`; mortals are rejected.
- [ ] `music`, `newbiechat` broadcast globally with correct colors.
- [ ] `emote dances a jig` displays "Player dances a jig" to the room.
- [ ] Speaking Elvish to a player who doesn't know Elvish produces scrambled output.
- [ ] Speaking Elvish to a player with 90% Elvish proficiency passes through unchanged.
- [ ] Speaking Common is always understood at 100% by everyone.
- [ ] `speak elvish` changes the active spoken language.
- [ ] `languages` lists all known languages with proficiency percentages.
- [ ] `deaf chat` toggles the chat channel off. Subsequent chat messages are not received.
- [ ] `deaf all` mutes all channels. `deaf none` unmutes all.
- [ ] `deaf` with no argument displays all channel states.
- [ ] `ignore bob` adds Bob to the ignore list. Bob's tells and channel messages are suppressed.
- [ ] `ignore bob` when already ignoring removes Bob from the list.
- [ ] Immortals bypass the ignore system — their messages always get through.
- [ ] NPC senders are never ignored.
- [ ] Max ignore list size (20) is enforced.
- [ ] Tell history maintains max 20 entries (FIFO eviction).
- [ ] All `EventBus` events (`ChannelMessage`, `CharacterSay`, `CharacterTell`) are emitted at correct hook points.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
