# SMAUG 2.0 TypeScript Port — Phase 3Q: Persistence and Save System — Player Saves, World State, Auto-Save, Backup, and Data Integrity

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

**Sub-Phases 3A–3P** are complete. The following files are fully implemented and may be imported:

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

### From Sub-Phases 3E–3P (Perception, Communication, Social, etc.)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3Q Objective

Implement the complete persistence and save system: player character save/load to PostgreSQL via Prisma, equipment and inventory persistence (including nested containers), affect and skill persistence, world state persistence for OLC-modified areas, auto-save integration with the tick engine, backup strategies, data integrity guarantees via transactions, and hot reboot state preservation. After this sub-phase, players can log in, play, log out, and return with all their data intact — stats, equipment, affects, skills, aliases, clan membership, conditions, quest state — and builders can save OLC changes that persist across restarts. This replicates the legacy `save_char_obj()`, `load_char_obj()`, `fwrite_char()`, `fread_char()` from `save.c` and the area save logic from `db.c`.

---

## Files to Implement

### 1. `src/persistence/PlayerRepository.ts` — Player Save/Load

Implement full player persistence via Prisma. Replicates legacy `save_char_obj()` and `load_char_obj()` from `save.c`:

#### 1.1 Class Definition

```typescript
import { PrismaClient, Prisma } from '@prisma/client';
import { Player, PlayerData } from '../game/entities/Player';
import { Affect } from '../game/entities/Affect';
import { GameObject } from '../game/entities/GameObject';
import { VnumRegistry } from '../game/world/VnumRegistry';
import { Logger } from '../utils/Logger';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export class PlayerRepository {
  private readonly log = Logger.getLogger('persistence');

  constructor(private readonly prisma: PrismaClient) {}
}
```

#### 1.2 `save(player: Player): Promise<void>` — Full Player Save

Implement the complete save pipeline. Replicates legacy `fwrite_char()` from `save.c:192-323`. Must use a Prisma transaction to ensure atomicity — if any part of the save fails, the entire save is rolled back:

```typescript
async save(player: Player): Promise<void> {
  const name = player.name.toLowerCase();
  const now = new Date();

  await this.prisma.$transaction(async (tx) => {
    // 1. Upsert core character record
    await tx.playerCharacter.upsert({
      where: { name },
      create: this.mapToCreateRecord(player, now),
      update: this.mapToUpdateRecord(player, now),
    });

    // 2. Delete and re-create affects
    await tx.playerAffect.deleteMany({ where: { playerName: name } });
    await this.saveAffects(tx, player, name);

    // 3. Delete and re-create skills
    await tx.playerSkill.deleteMany({ where: { playerName: name } });
    await this.saveSkills(tx, player, name);

    // 4. Delete and re-create equipment
    await tx.playerEquipment.deleteMany({ where: { playerName: name } });
    await this.saveEquipment(tx, player, name);

    // 5. Delete and re-create inventory (including nested containers)
    await tx.playerInventory.deleteMany({ where: { playerName: name } });
    await this.saveInventory(tx, player, name);

    // 6. Delete and re-create aliases
    await tx.playerAlias.deleteMany({ where: { playerName: name } });
    await this.saveAliases(tx, player, name);
  });

  this.log.info(`Saved player: ${player.name}`);
}
```

**Step-by-step for each sub-save:**

1. **Core character record** — Map all fields from the `Player` entity to the `PlayerCharacter` Prisma model:
   - **Identity:** `name` (lowercase, unique key), `displayName`, `passwordHash`, `email`.
   - **Core attributes:** `level`, `sex`, `race`, `class`, `trust`.
   - **Vitals:** `hit`, `maxHit`, `mana`, `maxMana`, `move`, `maxMove`.
   - **Stats:** `permStats` (JSON: `{str, int, wis, dex, con, cha, lck}`), `modStats` (JSON: same shape).
   - **Combat:** `hitroll`, `damroll`, `armor`, `alignment`, `wimpy`, `numAttacks`, `savingPoison`, `savingRod`, `savingPara`, `savingBreath`, `savingSpell`.
   - **Economy:** `gold`, `silver`, `copper`, `exp`, `goldBalance`, `silverBalance`, `copperBalance`.
   - **Bitvectors:** `actFlags` (stored as string of bigint), `affectedBy` (string of bigint), `immune`, `resistant`, `susceptible`.
   - **Position:** `position`, `style`.
   - **Language:** `speaking`, `speaks`.
   - **Physical:** `height`, `weight`.
   - **Identity strings:** `title`, `rank`, `bio`, `homepage`, `prompt`, `fightPrompt`, `bamfIn`, `bamfOut`.
   - **Affiliations:** `clanName`, `councilName`, `deityName`.
   - **Conditions:** `conditions` (JSON array: `[hunger, thirst, blood, bleed]`).
   - **PK stats:** `pkills`, `pdeaths`, `mkills`, `mdeaths`, `illegalPk`.
   - **Admin:** `authState`, `wizInvis`, `minSnoop`, `bestowments`, `flags`.
   - **Editor ranges:** `rRangeLo`, `rRangeHi`, `mRangeLo`, `mRangeHi`, `oRangeLo`, `oRangeHi`.
   - **Quest:** `questNumber`, `questCurrent`, `questAccum`.
   - **Pager:** `pagerLen`, `pagerOn`.
   - **Stances:** `stances` (JSON array).
   - **Colors:** `colors` (JSON map).
   - **Ignored:** `ignored` (comma-separated string from Set).
   - **Spouse:** `spouse`.
   - **Room:** `lastRoom` = `player.inRoom?.vnum ?? 0`.
   - **Timestamps:** `played` (total seconds), `lastLogin`, `updatedAt`.
   - **Hell/jail:** `releaseDate`, `helledBy`.

2. **Affects** — Iterate `player.affects` (the active affect list). For each affect:
   ```typescript
   private async saveAffects(
     tx: Prisma.TransactionClient,
     player: Player,
     playerName: string
   ): Promise<void> {
     for (const aff of player.affects) {
       await tx.playerAffect.create({
         data: {
           playerName,
           type: aff.type,
           duration: aff.duration,
           location: aff.location,
           modifier: aff.modifier,
           bitvector: aff.bitvector.toString(),
         },
       });
     }
   }
   ```
   - `type` = spell/skill number that created the affect.
   - `duration` = remaining ticks (-1 for permanent).
   - `location` = `ApplyType` enum value (what stat it modifies).
   - `modifier` = numeric modifier value.
   - `bitvector` = string representation of `bigint` bitvector flags.

3. **Skills** — Iterate `player.pcData.learned` Map (skill/spell number → proficiency %):
   ```typescript
   private async saveSkills(
     tx: Prisma.TransactionClient,
     player: Player,
     playerName: string
   ): Promise<void> {
     for (const [skillNumber, proficiency] of player.pcData.learned) {
       await tx.playerSkill.create({
         data: { playerName, skillNumber, proficiency },
       });
     }
   }
   ```

4. **Equipment** — Iterate `player.equipment` (Map of wear location → `GameObject`):
   ```typescript
   private async saveEquipment(
     tx: Prisma.TransactionClient,
     player: Player,
     playerName: string
   ): Promise<void> {
     for (const [wearLoc, obj] of player.equipment) {
       await tx.playerEquipment.create({
         data: {
           playerName,
           wearLocation: wearLoc,
           objectVnum: obj.pIndexData.vnum,
           objectLevel: obj.level,
           objectValues: JSON.stringify(obj.values),
           objectAffects: JSON.stringify(
             obj.affects.map(a => ({
               type: a.type, duration: a.duration,
               location: a.location, modifier: a.modifier,
               bitvector: a.bitvector.toString(),
             }))
           ),
           extraFlags: Number(obj.extraFlags & 0xFFFFFFFFn),
           timer: obj.timer,
         },
       });
     }
   }
   ```

5. **Inventory** — Save all carried objects recursively. Containers may hold other objects, which may themselves be containers. Use a recursive helper that tracks the parent container's database ID:
   ```typescript
   private async saveInventory(
     tx: Prisma.TransactionClient,
     player: Player,
     playerName: string
   ): Promise<void> {
     for (const obj of player.carrying) {
       await this.saveInventoryObject(tx, playerName, obj, null);
     }
   }

   private async saveInventoryObject(
     tx: Prisma.TransactionClient,
     playerName: string,
     obj: GameObject,
     containedIn: string | null
   ): Promise<void> {
     const record = await tx.playerInventory.create({
       data: {
         playerName,
         objectVnum: obj.pIndexData.vnum,
         objectLevel: obj.level,
         objectValues: JSON.stringify(obj.values),
         objectAffects: JSON.stringify(
           obj.affects.map(a => ({
             type: a.type, duration: a.duration,
             location: a.location, modifier: a.modifier,
             bitvector: a.bitvector.toString(),
           }))
         ),
         extraFlags: Number(obj.extraFlags & 0xFFFFFFFFn),
         timer: obj.timer,
         containedIn,
       },
     });

     // Recursively save contents of containers
     if (obj.contents && obj.contents.length > 0) {
       for (const contained of obj.contents) {
         await this.saveInventoryObject(tx, playerName, contained, record.id);
       }
     }
   }
   ```

6. **Aliases** — Iterate `player.pcData.aliases` (Map of alias → expansion):
   ```typescript
   private async saveAliases(
     tx: Prisma.TransactionClient,
     player: Player,
     playerName: string
   ): Promise<void> {
     if (!player.pcData.aliases) return;
     for (const [alias, expansion] of player.pcData.aliases) {
       await tx.playerAlias.create({
         data: { playerName, alias, expansion },
       });
     }
   }
   ```

#### 1.3 `findByName(name: string): Promise<Player | null>` — Full Player Load

Implement the complete load pipeline. Replicates legacy `fread_char()` from `save.c`. Query the `PlayerCharacter` with all relations and reconstruct a fully hydrated `Player` instance:

```typescript
async findByName(name: string): Promise<Player | null> {
  const record = await this.prisma.playerCharacter.findUnique({
    where: { name: name.toLowerCase() },
    include: {
      affects: true,
      skills: true,
      equipment: true,
      inventory: true,
      aliases: true,
    },
  });

  if (!record) return null;
  return this.mapToPlayer(record);
}
```

**`mapToPlayer(record)` implementation — step by step:**

1. **Construct `PlayerData`** from the record:
   ```typescript
   private mapToPlayer(record: any): Player {
     const pcData: PlayerData = {
       passwordHash: record.passwordHash,
       email: record.email ?? '',
       title: record.title ?? '',
       rank: record.rank ?? '',
       bio: record.bio ?? '',
       prompt: record.prompt ?? '<%h/%Hhp %m/%Mmana %v/%Vmv> ',
       fightPrompt: record.fightPrompt ?? '<%h/%Hhp %m/%Mmana %v/%Vmv> [%c: %C] ',
       bamfIn: record.bamfIn ?? '',
       bamfOut: record.bamfOut ?? '',
       homepage: record.homepage ?? '',
       clanName: record.clanName,
       councilName: record.councilName,
       deityName: record.deityName,
       learned: new Map(
         record.skills?.map((s: any) => [s.skillNumber, s.proficiency]) ?? []
       ),
       condition: record.conditions
         ? (typeof record.conditions === 'string'
             ? JSON.parse(record.conditions)
             : record.conditions)
         : [48, 48, 0, 0],
       pkills: record.pkills ?? 0,
       pdeaths: record.pdeaths ?? 0,
       mkills: record.mkills ?? 0,
       mdeaths: record.mdeaths ?? 0,
       illegalPk: record.illegalPk ?? 0,
       authState: record.authState ?? 0,
       wizInvis: record.wizInvis ?? 0,
       minSnoop: record.minSnoop ?? 0,
       bestowments: record.bestowments ?? '',
       flags: record.flags ?? 0,
       rRangeLo: record.rRangeLo ?? 0, rRangeHi: record.rRangeHi ?? 0,
       mRangeLo: record.mRangeLo ?? 0, mRangeHi: record.mRangeHi ?? 0,
       oRangeLo: record.oRangeLo ?? 0, oRangeHi: record.oRangeHi ?? 0,
       questNumber: record.questNumber ?? 0,
       questCurrent: record.questCurrent ?? 0,
       questAccum: record.questAccum ?? 0,
       goldBalance: record.goldBalance ?? 0,
       silverBalance: record.silverBalance ?? 0,
       copperBalance: record.copperBalance ?? 0,
       ignored: new Set(
         record.ignored ? record.ignored.split(',').filter((s: string) => s.length > 0) : []
       ),
       tellHistory: new Map(),
       stances: record.stances
         ? (typeof record.stances === 'string' ? JSON.parse(record.stances) : record.stances)
         : [],
       pagerLen: record.pagerLen ?? 24,
       pagerOn: record.pagerOn ?? true,
       colors: record.colors
         ? new Map(Object.entries(
             typeof record.colors === 'string' ? JSON.parse(record.colors) : record.colors
           ))
         : new Map(),
       aliases: new Map(
         record.aliases?.map((a: any) => [a.alias, a.expansion]) ?? []
       ),
     };

     const player = new Player(record.id, record.displayName, pcData);
     // ... continue below
   }
   ```

2. **Restore core attributes** — Map every scalar field from the database record back to the Player entity:
   ```typescript
     player.level = record.level;
     player.hit = record.hit;
     player.maxHit = record.maxHit;
     player.mana = record.mana;
     player.maxMana = record.maxMana;
     player.move = record.move;
     player.maxMove = record.maxMove;
     player.gold = record.gold;
     player.silver = record.silver;
     player.copper = record.copper;
     player.exp = record.exp;
     player.alignment = record.alignment;
     player.sex = record.sex;
     player.race = record.race;
     player.class_ = record.class;
     player.trust = record.trust ?? 0;
     player.hitroll = record.hitroll ?? 0;
     player.damroll = record.damroll ?? 0;
     player.armor = record.armor ?? 100;
     player.wimpy = record.wimpy ?? 0;
     player.numAttacks = record.numAttacks ?? 1;
     player.position = record.position ?? 12; // POS_STANDING
     player.style = record.style ?? 0;
     player.speaking = record.speaking ?? 0;
     player.speaks = record.speaks ?? 0;
     player.height = record.height ?? 72;
     player.weight = record.weight ?? 180;
     player.played = record.played ?? 0;
     player.lastRoom = record.lastRoom ?? 0;

     // Restore permStats / modStats from JSON
     const permStats = typeof record.permStats === 'string'
       ? JSON.parse(record.permStats) : record.permStats;
     player.permStr = permStats.str ?? 13;
     player.permInt = permStats.int ?? 13;
     player.permWis = permStats.wis ?? 13;
     player.permDex = permStats.dex ?? 13;
     player.permCon = permStats.con ?? 13;
     player.permCha = permStats.cha ?? 13;
     player.permLck = permStats.lck ?? 13;

     const modStats = typeof record.modStats === 'string'
       ? JSON.parse(record.modStats) : record.modStats;
     player.modStr = modStats.str ?? 0;
     player.modInt = modStats.int ?? 0;
     player.modWis = modStats.wis ?? 0;
     player.modDex = modStats.dex ?? 0;
     player.modCon = modStats.con ?? 0;
     player.modCha = modStats.cha ?? 0;
     player.modLck = modStats.lck ?? 0;

     // Restore bitvectors
     player.actFlags = BigInt(record.actFlags ?? '0');
     player.affectedBy = BigInt(record.affectedBy ?? '0');
     player.immune = record.immune ?? 0;
     player.resistant = record.resistant ?? 0;
     player.susceptible = record.susceptible ?? 0;

     // Saving throws
     player.savingPoison = record.savingPoison ?? 0;
     player.savingRod = record.savingRod ?? 0;
     player.savingPara = record.savingPara ?? 0;
     player.savingBreath = record.savingBreath ?? 0;
     player.savingSpell = record.savingSpell ?? 0;
   ```

3. **Restore affects** — Iterate `record.affects`, create `Affect` instances, and apply them to the player. Affects are applied (not just stored) so that stat modifications are recalculated:
   ```typescript
     for (const affData of record.affects ?? []) {
       const aff = new Affect(
         affData.type,
         affData.duration,
         affData.location,
         affData.modifier,
         BigInt(affData.bitvector ?? '0')
       );
       player.applyAffect(aff);
     }
   ```
   - **Important:** `applyAffect()` must modify the player's stats (`modStr`, `hitroll`, etc.) based on the affect's `location` and `modifier`, AND set the affect's bitvector bits on `player.affectedBy`. This matches legacy `affect_modify()`.

4. **Restore equipment** — For each equipment record, look up the object prototype via `VnumRegistry.getObject(vnum)`, create an instance, override its values/affects/flags from the saved data, and equip it:
   ```typescript
     for (const eqData of record.equipment ?? []) {
       const proto = VnumRegistry.getObject(eqData.objectVnum);
       if (!proto) {
         this.log.warn(`Equipment vnum ${eqData.objectVnum} not found for ${player.name}`);
         continue;
       }
       const obj = GameObject.createInstance(proto);
       obj.level = eqData.objectLevel;
       obj.values = typeof eqData.objectValues === 'string'
         ? JSON.parse(eqData.objectValues) : eqData.objectValues;
       obj.timer = eqData.timer;
       obj.extraFlags = BigInt(eqData.extraFlags ?? 0);

       // Restore object affects
       const savedAffects = typeof eqData.objectAffects === 'string'
         ? JSON.parse(eqData.objectAffects) : eqData.objectAffects;
       for (const sa of savedAffects ?? []) {
         obj.affects.push(new Affect(
           sa.type, sa.duration, sa.location, sa.modifier, BigInt(sa.bitvector ?? '0')
         ));
       }

       player.equipObject(obj, eqData.wearLocation);
     }
   ```

5. **Restore inventory** — Load inventory records, build the containment tree, and add objects to the player's carrying list. Process top-level items first (where `containedIn` is null), then recursively add contents:
   ```typescript
     const invRecords = record.inventory ?? [];
     const topLevel = invRecords.filter((r: any) => !r.containedIn);
     const byContainer = new Map<string, any[]>();
     for (const r of invRecords) {
       if (r.containedIn) {
         if (!byContainer.has(r.containedIn)) byContainer.set(r.containedIn, []);
         byContainer.get(r.containedIn)!.push(r);
       }
     }

     const restoreObj = (data: any): GameObject | null => {
       const proto = VnumRegistry.getObject(data.objectVnum);
       if (!proto) {
         this.log.warn(`Inventory vnum ${data.objectVnum} not found for ${player.name}`);
         return null;
       }
       const obj = GameObject.createInstance(proto);
       obj.level = data.objectLevel;
       obj.values = typeof data.objectValues === 'string'
         ? JSON.parse(data.objectValues) : data.objectValues;
       obj.timer = data.timer;
       obj.extraFlags = BigInt(data.extraFlags ?? 0);

       const savedAffects = typeof data.objectAffects === 'string'
         ? JSON.parse(data.objectAffects) : data.objectAffects;
       for (const sa of savedAffects ?? []) {
         obj.affects.push(new Affect(
           sa.type, sa.duration, sa.location, sa.modifier, BigInt(sa.bitvector ?? '0')
         ));
       }

       // Recursively restore contents
       const children = byContainer.get(data.id) ?? [];
       for (const childData of children) {
         const childObj = restoreObj(childData);
         if (childObj) obj.addContent(childObj);
       }

       return obj;
     };

     for (const topData of topLevel) {
       const obj = restoreObj(topData);
       if (obj) player.addCarrying(obj);
     }
   ```

6. **Place in last room** — After loading, attempt to place the player in their `lastRoom` vnum:
   ```typescript
     if (record.lastRoom) {
       const room = VnumRegistry.getRoom(record.lastRoom);
       if (room) {
         player.inRoom = room;
       }
     }

     return player;
   ```
   - If the room is not found (area removed, etc.), the caller (`ConnectionManager` nanny) should place the player in the default recall room (vnum 3001 or configurable).

#### 1.4 `verifyPassword(name, password): Promise<boolean>` — Password Verification

```typescript
async verifyPassword(name: string, password: string): Promise<boolean> {
  const record = await this.prisma.playerCharacter.findUnique({
    where: { name: name.toLowerCase() },
    select: { passwordHash: true },
  });
  if (!record) return false;
  return bcrypt.compare(password, record.passwordHash);
}
```

#### 1.5 `createAccount(name, password): Promise<string>` — Account Creation

```typescript
async createAccount(name: string, password: string): Promise<string> {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const record = await this.prisma.playerCharacter.create({
    data: {
      name: name.toLowerCase(),
      displayName: name,
      passwordHash: hash,
      level: 1,
      hit: 20, maxHit: 20,
      mana: 100, maxMana: 100,
      move: 100, maxMove: 100,
      gold: 0, silver: 0, copper: 0,
      exp: 0, alignment: 0,
      permStats: JSON.stringify({ str: 13, int: 13, wis: 13, dex: 13, con: 13, cha: 13, lck: 13 }),
      modStats: JSON.stringify({ str: 0, int: 0, wis: 0, dex: 0, con: 0, cha: 0, lck: 0 }),
      conditions: JSON.stringify([48, 48, 0, 0]),
      stances: JSON.stringify([]),
      colors: JSON.stringify({}),
    },
  });
  return record.id;
}
```

#### 1.6 `deletePlayer(name: string): Promise<boolean>` — Player Deletion

Delete a player and all related data. Prisma cascade deletes handle child records:

```typescript
async deletePlayer(name: string): Promise<boolean> {
  try {
    await this.prisma.playerCharacter.delete({
      where: { name: name.toLowerCase() },
    });
    this.log.info(`Deleted player: ${name}`);
    return true;
  } catch {
    return false;
  }
}
```

#### 1.7 `playerExists(name: string): Promise<boolean>` — Existence Check

```typescript
async playerExists(name: string): Promise<boolean> {
  const count = await this.prisma.playerCharacter.count({
    where: { name: name.toLowerCase() },
  });
  return count > 0;
}
```

#### 1.8 `getPlayerList(options?): Promise<PlayerSummary[]>` — Player List Queries

Utility for `doWho()`, admin dashboard, and other lookups:

```typescript
export interface PlayerSummary {
  name: string;
  displayName: string;
  level: number;
  race: number;
  class_: number;
  clanName: string | null;
  lastLogin: Date | null;
}

async getPlayerList(options?: {
  minLevel?: number;
  maxLevel?: number;
  clanName?: string;
  limit?: number;
  offset?: number;
}): Promise<PlayerSummary[]> {
  const where: any = {};
  if (options?.minLevel !== undefined) where.level = { gte: options.minLevel };
  if (options?.maxLevel !== undefined) where.level = { ...where.level, lte: options.maxLevel };
  if (options?.clanName) where.clanName = options.clanName;

  const records = await this.prisma.playerCharacter.findMany({
    where,
    select: {
      name: true, displayName: true, level: true, race: true,
      class: true, clanName: true, lastLogin: true,
    },
    orderBy: { level: 'desc' },
    take: options?.limit ?? 100,
    skip: options?.offset ?? 0,
  });

  return records.map(r => ({
    name: r.name, displayName: r.displayName, level: r.level,
    race: r.race, class_: r.class, clanName: r.clanName, lastLogin: r.lastLogin,
  }));
}
```

#### 1.9 `updatePassword(name, newPassword): Promise<void>` — Password Change

```typescript
async updatePassword(name: string, newPassword: string): Promise<void> {
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await this.prisma.playerCharacter.update({
    where: { name: name.toLowerCase() },
    data: { passwordHash: hash },
  });
  this.log.info(`Password updated for ${name}`);
}
```

---

### 2. `src/persistence/WorldRepository.ts` — World Data Persistence

Implement world data save/load for OLC changes and hot reboot recovery. World data stays in JSON flat files (not PostgreSQL) because builders need to edit them with text editors and version them with git:

#### 2.1 Class Definition

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { Area } from '../game/entities/Area';
import { Room } from '../game/entities/Room';
import { AreaManager } from '../game/world/AreaManager';
import { Logger } from '../utils/Logger';

export class WorldRepository {
  private readonly log = Logger.getLogger('persistence');

  constructor(
    private readonly worldDir: string,
    private readonly areaManager: AreaManager
  ) {}
}
```

#### 2.2 `saveArea(area: Area): Promise<void>` — Save an Individual Area

Write area data back to its JSON files. Used by OLC when builders modify rooms/mobs/objects. Replicates legacy `fold_area()` from `db.c`:

```typescript
async saveArea(area: Area): Promise<void> {
  const areaDir = path.join(this.worldDir, area.filename);
  await fs.mkdir(areaDir, { recursive: true });

  // Save area metadata
  await this.writeJsonSafe(path.join(areaDir, 'area.json'), {
    name: area.name,
    filename: area.filename,
    author: area.author,
    vnumRangeLo: area.vnumRangeLo,
    vnumRangeHi: area.vnumRangeHi,
    resetFrequency: area.resetFrequency,
    resetMessage: area.resetMessage,
    flags: area.flags.toString(),
    climate: area.climate,
  });

  // Save rooms
  const rooms = area.rooms.map(r => this.serializeRoom(r));
  await this.writeJsonSafe(path.join(areaDir, 'rooms.json'), rooms);

  // Save mobiles
  const mobiles = area.mobiles.map(m => this.serializeMobile(m));
  await this.writeJsonSafe(path.join(areaDir, 'mobiles.json'), mobiles);

  // Save objects
  const objects = area.objects.map(o => this.serializeObject(o));
  await this.writeJsonSafe(path.join(areaDir, 'objects.json'), objects);

  // Save resets
  await this.writeJsonSafe(path.join(areaDir, 'resets.json'), area.resets);

  // Save shops
  await this.writeJsonSafe(path.join(areaDir, 'shops.json'), area.shops);

  // Save programs
  await this.writeJsonSafe(path.join(areaDir, 'programs.json'), area.programs);

  area.modified = false;
  this.log.info(`Saved area: ${area.name} (${area.filename})`);
}
```

#### 2.3 `saveModifiedAreas(): Promise<number>` — Save Dirty Areas

Save only areas with `area.modified = true`. Called on shutdown and periodically by the `TickEngine`:

```typescript
async saveModifiedAreas(): Promise<number> {
  let count = 0;
  for (const area of this.areaManager.getAllAreas()) {
    if (area.modified) {
      try {
        await this.saveArea(area);
        count++;
      } catch (err) {
        this.log.error(`Failed to save area ${area.name}: ${err}`);
      }
    }
  }
  if (count > 0) {
    this.log.info(`Saved ${count} modified area(s)`);
  }
  return count;
}
```

#### 2.4 `saveWorldState(): Promise<void>` — Transient World State for Hot Reboot

Save transient world state (corpse locations, dropped items in rooms, door states) for hot reboot recovery. Replicates the concept of legacy hotboot/copyover data preservation:

```typescript
async saveWorldState(): Promise<void> {
  const statePath = path.join(this.worldDir, '.world_state.json');

  const state: WorldStateSnapshot = {
    timestamp: new Date().toISOString(),
    roomItems: this.collectRoomItems(),
    doorStates: this.collectDoorStates(),
    corpses: this.collectCorpses(),
  };

  await this.writeJsonSafe(statePath, state);
  this.log.info('World state snapshot saved');
}
```

**`WorldStateSnapshot` interface:**

```typescript
interface WorldStateSnapshot {
  timestamp: string;
  roomItems: Array<{
    roomVnum: number;
    objects: Array<{
      vnum: number;
      level: number;
      values: number[];
      extraFlags: string;
      timer: number;
      contents: any[]; // Recursive for containers
    }>;
  }>;
  doorStates: Array<{
    roomVnum: number;
    direction: number;
    flags: string; // e.g., closed, locked
  }>;
  corpses: Array<{
    roomVnum: number;
    name: string;
    timer: number;
    contents: any[];
  }>;
}
```

**Helper methods for collecting transient state:**

- `collectRoomItems()` — Iterate all rooms via `VnumRegistry`. For each room with objects on the ground (excluding prototypes), serialize the object and its contents.
- `collectDoorStates()` — Iterate all rooms. For each exit with a door whose runtime state differs from its prototype (e.g., closed at runtime but open in prototype), save the state.
- `collectCorpses()` — Iterate all rooms. For each corpse object (`ITEM_CORPSE_NPC` or `ITEM_CORPSE_PC`), save the corpse data and its contents.

#### 2.5 `loadWorldState(): Promise<void>` — Restore Transient State After Hot Reboot

```typescript
async loadWorldState(): Promise<void> {
  const statePath = path.join(this.worldDir, '.world_state.json');

  try {
    const data = await fs.readFile(statePath, 'utf-8');
    const state: WorldStateSnapshot = JSON.parse(data);

    // Restore room items
    for (const roomData of state.roomItems) {
      const room = VnumRegistry.getRoom(roomData.roomVnum);
      if (!room) continue;
      for (const objData of roomData.objects) {
        const obj = this.deserializeObject(objData);
        if (obj) room.addObject(obj);
      }
    }

    // Restore door states
    for (const doorData of state.doorStates) {
      const room = VnumRegistry.getRoom(doorData.roomVnum);
      if (!room) continue;
      const exit = room.exits[doorData.direction];
      if (exit) exit.flags = BigInt(doorData.flags);
    }

    // Restore corpses
    for (const corpseData of state.corpses) {
      const room = VnumRegistry.getRoom(corpseData.roomVnum);
      if (!room) continue;
      const corpse = this.deserializeCorpse(corpseData);
      if (corpse) room.addObject(corpse);
    }

    this.log.info(`World state restored from ${state.timestamp}`);
    // Remove the snapshot file after successful load
    await fs.unlink(statePath).catch(() => {});
  } catch {
    this.log.info('No world state snapshot found (clean boot)');
  }
}
```

#### 2.6 Safe JSON Write Helper

Write to a temporary file then rename, preventing partial writes from corrupting data:

```typescript
private async writeJsonSafe(filePath: string, data: any): Promise<void> {
  const tmpPath = filePath + '.tmp';
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(tmpPath, content, 'utf-8');
  await fs.rename(tmpPath, filePath);
}
```

#### 2.7 Room/Mobile/Object Serialization Helpers

```typescript
private serializeRoom(room: Room): any {
  return {
    vnum: room.vnum,
    name: room.name,
    description: room.description,
    sector: room.sector,
    flags: room.flags.toString(),
    exits: room.exits.map(e => e ? {
      direction: e.direction,
      toRoom: e.toRoom?.vnum ?? e.toVnum,
      keyword: e.keyword,
      flags: e.flags.toString(),
      key: e.key,
      distance: e.distance,
      description: e.description,
    } : null),
    extraDescriptions: room.extraDescriptions,
    teleDelay: room.teleDelay,
    teleVnum: room.teleVnum,
    tunnel: room.tunnel,
  };
}

// Similar serializers for serializeMobile() and serializeObject()
// mapping all prototype fields to JSON-safe representations.
```

---

### 3. Auto-Save Integration — `src/core/TickEngine.ts` Updates

Wire player auto-save into the existing `TickEngine` pulse system. Replicates legacy `char_update()` auto-save behavior from `update.c`:

#### 3.1 Save Frequency Constants

```typescript
/**
 * Save frequency in real seconds. Legacy default: sysdata.save_frequency = 20 minutes.
 * We check every PULSE_TICK (280 pulses = 70 seconds), but only save players
 * whose time-since-last-save exceeds SAVE_FREQUENCY_MS.
 */
export const SAVE_FREQUENCY_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
```

#### 3.2 Auto-Save on PULSE_TICK

Add to the `tickUpdate()` handler (called every `PULSE_TICK` = 280 pulses = 70 seconds):

```typescript
private async autoSavePlayers(): Promise<void> {
  const now = Date.now();

  for (const player of this.connectionManager.getOnlinePlayers()) {
    // Skip level 1 characters (legacy: level < 2 not saved)
    if (player.level < 2) continue;

    // Skip if saved recently
    if (player.lastSaveTime && (now - player.lastSaveTime) < SAVE_FREQUENCY_MS) continue;

    try {
      await this.playerRepository.save(player);
      player.lastSaveTime = now;
    } catch (err) {
      this.log.error(`Auto-save failed for ${player.name}: ${err}`);
    }
  }
}
```

#### 3.3 Save Triggers

Beyond auto-save, wire `playerRepository.save()` into these existing hook points:

| Trigger | Location | Notes |
|---|---|---|
| Player quit | `doQuit()` in `src/game/commands/information.ts` | Save before extracting character |
| Player death | `handleDeath()` in `src/game/combat/DeathHandler.ts` | Save after XP loss and room move |
| Level gain | `advanceLevel()` in `src/game/entities/Player.ts` | Save after level-up stat changes |
| Password change | `doPassword()` in `src/game/commands/information.ts` | Save immediately |
| Equipment change | When `SV_PUT`, `SV_DROP`, `SV_GIVE`, `SV_AUCTION`, `SV_ZAPDROP` flags are set in `sysdata.save_flags` | Conditional save on inventory-modifying actions |
| Shutdown/reboot | `doShutdown()` / `doReboot()` in `src/game/commands/immortal.ts` | Save all online players |
| Idle timeout | `idleCheck()` in `ConnectionManager.ts` | Save before disconnecting idle player |

**Save flags system** — Implement the legacy `SV_*` flag system:

```typescript
export enum SaveFlag {
  SV_DEATH       = 1 << 0,
  SV_PASSCHG     = 1 << 1,
  SV_AUTO        = 1 << 2,
  SV_PUT         = 1 << 3,
  SV_DROP        = 1 << 4,
  SV_GIVE        = 1 << 5,
  SV_AUCTION     = 1 << 6,
  SV_ZAPDROP     = 1 << 7,
  SV_IDLE        = 1 << 8,
  SV_BACKUP      = 1 << 9,
  SV_QUITBACKUP  = 1 << 10,
  SV_TMPSAVE     = 1 << 11,
}

/** Global save configuration — loaded from SystemConfig. */
export let saveFlags: number = SaveFlag.SV_DEATH | SaveFlag.SV_PASSCHG
                             | SaveFlag.SV_AUTO | SaveFlag.SV_IDLE;
```

**Conditional save helper:**

```typescript
export function shouldSave(trigger: SaveFlag): boolean {
  return (saveFlags & trigger) !== 0;
}
```

---

### 4. Backup Strategy — `src/persistence/BackupManager.ts`

Implement periodic backup of player data and world files:

#### 4.1 Class Definition

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { createGzip } from 'zlib';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Logger } from '../utils/Logger';

export class BackupManager {
  private readonly log = Logger.getLogger('backup');
  private readonly backupDir: string;
  private readonly maxBackups: number;

  constructor(backupDir: string, maxBackups: number = 10) {
    this.backupDir = backupDir;
    this.maxBackups = maxBackups;
  }
}
```

#### 4.2 `backupWorldFiles(): Promise<string>` — Backup World Directory

Create a gzipped tar-like backup of all world JSON files:

```typescript
async backupWorldFiles(worldDir: string): Promise<string> {
  await fs.mkdir(this.backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `world-backup-${timestamp}.json.gz`;
  const backupPath = path.join(this.backupDir, backupName);

  // Collect all area JSON files into a single object
  const areas: Record<string, any> = {};
  const areaDirs = await fs.readdir(worldDir, { withFileTypes: true });

  for (const entry of areaDirs) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const areaDir = path.join(worldDir, entry.name);
    const areaData: Record<string, any> = {};

    for (const file of await fs.readdir(areaDir)) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(areaDir, file), 'utf-8');
        areaData[file] = JSON.parse(content);
      }
    }
    areas[entry.name] = areaData;
  }

  // Write compressed
  const jsonData = JSON.stringify(areas);
  const tmpPath = backupPath + '.tmp';
  await fs.writeFile(tmpPath, jsonData, 'utf-8');

  // Compress with gzip
  await pipeline(
    createReadStream(tmpPath),
    createGzip(),
    createWriteStream(backupPath)
  );
  await fs.unlink(tmpPath);

  this.log.info(`World backup created: ${backupName}`);
  await this.pruneOldBackups('world-backup-');
  return backupPath;
}
```

#### 4.3 `backupPlayerData(playerName): Promise<string>` — Individual Player Backup

Create a backup snapshot of a single player's data. Used on quit when `SV_QUITBACKUP` is set:

```typescript
async backupPlayerData(playerName: string, playerData: any): Promise<string> {
  const playerBackupDir = path.join(this.backupDir, 'players');
  await fs.mkdir(playerBackupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${playerName}-${timestamp}.json`;
  const backupPath = path.join(playerBackupDir, backupName);

  await fs.writeFile(backupPath, JSON.stringify(playerData, null, 2), 'utf-8');
  this.log.debug(`Player backup created: ${backupName}`);

  // Prune old backups for this player (keep last 5)
  await this.prunePlayerBackups(playerName, 5);
  return backupPath;
}
```

#### 4.4 `pruneOldBackups(prefix, maxKeep?)` — Backup Rotation

```typescript
private async pruneOldBackups(prefix: string, maxKeep?: number): Promise<void> {
  const max = maxKeep ?? this.maxBackups;
  const files = await fs.readdir(this.backupDir);
  const matching = files
    .filter(f => f.startsWith(prefix))
    .sort()
    .reverse();

  for (let i = max; i < matching.length; i++) {
    const filePath = path.join(this.backupDir, matching[i]);
    await fs.unlink(filePath);
    this.log.debug(`Pruned old backup: ${matching[i]}`);
  }
}

private async prunePlayerBackups(playerName: string, maxKeep: number): Promise<void> {
  const playerBackupDir = path.join(this.backupDir, 'players');
  try {
    const files = await fs.readdir(playerBackupDir);
    const matching = files
      .filter(f => f.startsWith(`${playerName}-`))
      .sort()
      .reverse();

    for (let i = maxKeep; i < matching.length; i++) {
      await fs.unlink(path.join(playerBackupDir, matching[i]));
    }
  } catch {
    // Directory may not exist yet
  }
}
```

#### 4.5 Periodic Backup Schedule

Wire into `TickEngine` or `GameLoop`:

```typescript
/** Backup interval in milliseconds. Default: 6 hours. */
export const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

// In GameLoop or TickEngine initialization:
setInterval(async () => {
  try {
    await backupManager.backupWorldFiles(worldDir);
  } catch (err) {
    log.error(`Periodic backup failed: ${err}`);
  }
}, BACKUP_INTERVAL_MS);
```

---

### 5. Data Integrity and Error Recovery

#### 5.1 Transaction Safety

All player saves use Prisma interactive transactions (`$transaction(async (tx) => { ... })`). If any step fails (e.g., database constraint violation, disk full), the entire transaction is rolled back and the player data on disk remains consistent from the last successful save.

#### 5.2 Stale Data Protection

When loading a player who is already online (e.g., linkdead reconnect), do NOT load from database — use the in-memory `Player` instance. Only load from database when no in-memory instance exists:

```typescript
async loadOrReconnect(name: string): Promise<Player | null> {
  // Check for existing in-memory instance (linkdead)
  const existing = this.connectionManager.findPlayerByName(name);
  if (existing) {
    this.log.info(`Reconnecting linkdead player: ${name}`);
    return existing;
  }

  // Load from database
  return this.findByName(name);
}
```

#### 5.3 Corruption Detection

After loading a player, validate critical invariants:

```typescript
private validatePlayer(player: Player): void {
  // Level bounds
  if (player.level < 1) player.level = 1;
  if (player.level > 65) player.level = 65;

  // HP/mana/move bounds
  if (player.maxHit < 1) player.maxHit = 20;
  if (player.hit > player.maxHit) player.hit = player.maxHit;
  if (player.maxMana < 0) player.maxMana = 100;
  if (player.mana > player.maxMana) player.mana = player.maxMana;
  if (player.maxMove < 0) player.maxMove = 100;
  if (player.move > player.maxMove) player.move = player.maxMove;

  // Negative currency
  if (player.gold < 0) player.gold = 0;
  if (player.silver < 0) player.silver = 0;
  if (player.copper < 0) player.copper = 0;

  // Experience bounds
  if (player.exp < 0) player.exp = 0;

  this.log.debug(`Validated player: ${player.name} (level ${player.level})`);
}
```

#### 5.4 Emergency Save on Crash

Register a process-level handler to attempt saving all online players before the process exits:

```typescript
// In main.ts or GameLoop initialization:
process.on('uncaughtException', async (err) => {
  log.error(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  try {
    await emergencySaveAll();
  } catch (saveErr) {
    log.error(`Emergency save failed: ${saveErr}`);
  }
  process.exit(1);
});

process.on('SIGTERM', async () => {
  log.info('SIGTERM received — saving all players...');
  await emergencySaveAll();
  await saveModifiedAreas();
  process.exit(0);
});

async function emergencySaveAll(): Promise<void> {
  const players = connectionManager.getOnlinePlayers();
  for (const player of players) {
    try {
      await playerRepository.save(player);
    } catch (err) {
      log.error(`Emergency save failed for ${player.name}: ${err}`);
    }
  }
  log.info(`Emergency save complete: ${players.length} player(s) saved`);
}
```

---

### 6. `main.ts` Integration Updates

Update the main application entry point to wire up persistence:

```typescript
// In main.ts boot sequence:

import { PrismaClient } from '@prisma/client';
import { PlayerRepository } from './persistence/PlayerRepository';
import { WorldRepository } from './persistence/WorldRepository';
import { BackupManager } from './persistence/BackupManager';

// Initialize Prisma
const prisma = new PrismaClient();
await prisma.$connect();

// Initialize repositories
const playerRepository = new PlayerRepository(prisma);
const worldRepository = new WorldRepository(worldDir, areaManager);
const backupManager = new BackupManager(path.join(worldDir, '..', 'backups'));

// Restore world state if hot rebooting
await worldRepository.loadWorldState();

// Wire auto-save into tick engine
tickEngine.on('tick', async () => {
  await autoSavePlayers();
});

// Wire area save into area update
tickEngine.on('areaUpdate', async () => {
  await worldRepository.saveModifiedAreas();
});

// Shutdown handler
async function shutdown(): Promise<void> {
  log.info('Shutting down...');

  // Save all online players
  for (const player of connectionManager.getOnlinePlayers()) {
    await playerRepository.save(player);
  }

  // Save modified areas
  await worldRepository.saveModifiedAreas();

  // Save world state for hot reboot
  await worldRepository.saveWorldState();

  // Create final backup
  await backupManager.backupWorldFiles(worldDir);

  // Disconnect database
  await prisma.$disconnect();

  log.info('Shutdown complete');
}
```

---

## Tests for Sub-Phase 3Q

- `tests/unit/persistence/PlayerRepository.test.ts` — Core save/load round-trip tests:
  - **Test save/load basic fields:** Create a player with specific level, stats, HP, mana, move, gold, exp, alignment, race, class. Save, then load by name. Verify all fields match exactly.
  - **Test save/load affects:** Apply 3 affects (one permanent with duration -1, one temporary with duration 10, one with bitvector flags). Save, load, verify all affect properties preserved — including that stat modifications are reapplied on load.
  - **Test save/load skills:** Set 10 skills with varying proficiencies (0–100). Save, load, verify the `learned` Map has all 10 entries with correct values.
  - **Test save/load equipment:** Equip a weapon (with custom values and enchantment affects) and armor. Save, load, verify objects are in correct wear locations with correct values, affects, and flags.
  - **Test save/load nested containers:** Create a bag containing a potion and a sub-bag containing a scroll. Put in inventory. Save, load, verify the containment hierarchy is preserved.
  - **Test save/load aliases:** Set 5 aliases. Save, load, verify all aliases round-trip.
  - **Test save/load conditions:** Set hunger=20, thirst=5, blood=48. Save, load, verify conditions match.
  - **Test save/load bitvectors:** Set `actFlags` and `affectedBy` to specific bigint values. Save, load, verify exact match.
  - **Test createAccount/verifyPassword:** Create account with password "test123". Verify correct password returns true. Verify wrong password returns false.
  - **Test deletePlayer:** Create, save, delete. Verify `playerExists` returns false. Verify `findByName` returns null.
  - **Test player list queries:** Create 3 players at levels 5, 15, 30. Query with `minLevel: 10` — expect 2 results.
  - **Test transaction atomicity:** Mock a failure in the skills save step. Verify that no partial data is written (affects should also be rolled back).

- `tests/unit/persistence/WorldRepository.test.ts` — World persistence tests:
  - **Test saveArea/loadArea round-trip:** Create a test area with 3 rooms, 2 mobiles, 2 objects, and 1 reset. Save to a temp directory, read back the JSON files, verify all data matches.
  - **Test saveModifiedAreas:** Create 3 areas, mark 2 as modified. Call `saveModifiedAreas()`. Verify only 2 are saved. Verify `modified` flag is cleared after save.
  - **Test writeJsonSafe atomicity:** Verify that the `.tmp` file is created first, then renamed. If the process crashes during write, the original file is untouched.
  - **Test saveWorldState/loadWorldState:** Place objects in 2 rooms, modify a door state. Save world state, clear the rooms, load world state. Verify objects and door states are restored.

- `tests/unit/persistence/BackupManager.test.ts` — Backup tests:
  - **Test backupWorldFiles:** Create backup, verify compressed file exists.
  - **Test pruneOldBackups:** Create 15 backups with `maxBackups=10`. Verify only 10 remain (the 10 newest).
  - **Test backupPlayerData:** Backup a player, verify JSON file exists with correct content.

- `tests/integration/PlayerPersistence.test.ts` — Full integration test:
  - Create a player from scratch through the nanny flow.
  - Equip items, apply affects, learn skills, set aliases, set conditions.
  - Save via `playerRepository.save()`.
  - Create a completely new `Player` instance via `playerRepository.findByName()`.
  - Verify EVERYTHING matches: level, all 7 stats (perm and mod), HP/mana/move (current and max), gold/silver/copper, XP, alignment, race, class, trust, hitroll, damroll, armor, all 5 saving throws, position, speaking/speaks, height/weight, title, prompt, fightPrompt, bamfIn/bamfOut, bio, homepage, clanName, councilName, deityName, conditions, PK stats, authState, wizInvis, flags, editor ranges, quest state, pager settings, stances, colors, ignored set, all affects (type/duration/location/modifier/bitvector), all skills (skillNumber/proficiency), all equipment (vnum/level/values/affects/wearLocation), all inventory including nested containers (vnum/level/values/affects/containedIn), all aliases (alias/expansion).

---

## Acceptance Criteria

- [ ] `playerRepository.save(player)` writes all player data to PostgreSQL in a single transaction.
- [ ] `playerRepository.findByName('testplayer')` returns a fully hydrated `Player` instance with all data restored.
- [ ] Save/load round-trip preserves: level, all 7 permanent stats, all 7 modified stats, HP/mana/move (current and max), gold/silver/copper, XP, alignment, race, class, trust, hitroll, damroll, armor, all 5 saving throws, wimpy, numAttacks, position, style.
- [ ] Save/load round-trip preserves bitvectors: `actFlags` and `affectedBy` as exact bigint values.
- [ ] Save/load round-trip preserves all affects with type, duration, location, modifier, and bitvector.
- [ ] Affects loaded from the database are reapplied (stat modifications recalculated) — not just stored.
- [ ] Save/load round-trip preserves all skill proficiencies in the `learned` map.
- [ ] Save/load round-trip preserves all equipped objects in correct wear locations with correct vnum, level, values, affects, extra flags, and timer.
- [ ] Save/load round-trip preserves inventory including nested containers (bag inside bag with items).
- [ ] Save/load round-trip preserves all aliases.
- [ ] Save/load round-trip preserves conditions (hunger, thirst, blood, bleed).
- [ ] Save/load round-trip preserves: title, prompt, fightPrompt, bamfIn/bamfOut, bio, homepage.
- [ ] Save/load round-trip preserves: clanName, councilName, deityName.
- [ ] Save/load round-trip preserves: PK stats, quest state, editor ranges, pager settings, stances, colors, ignored set.
- [ ] `createAccount` hashes passwords with bcrypt (12 rounds). `verifyPassword` correctly validates.
- [ ] `deletePlayer` removes the player and all related records (cascade).
- [ ] `playerExists` returns correct boolean.
- [ ] Auto-save fires every 20 minutes for all online players level ≥ 2.
- [ ] Players are saved on quit, death, level gain, and password change.
- [ ] All online players are saved on shutdown/SIGTERM.
- [ ] Emergency save attempts on uncaught exceptions.
- [ ] `worldRepository.saveArea()` writes all area JSON files (area.json, rooms.json, mobiles.json, objects.json, resets.json, shops.json, programs.json).
- [ ] `worldRepository.saveModifiedAreas()` only saves areas with `modified = true` and clears the flag.
- [ ] `writeJsonSafe()` uses atomic write-then-rename pattern.
- [ ] `saveWorldState()` / `loadWorldState()` correctly captures and restores room items, door states, and corpses.
- [ ] Backup rotation keeps only `maxBackups` most recent backup files.
- [ ] Player validation corrects out-of-bounds values on load.
- [ ] Reconnecting a linkdead player uses the in-memory instance, not the database.
- [ ] `SaveFlag` system controls which events trigger saves.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
