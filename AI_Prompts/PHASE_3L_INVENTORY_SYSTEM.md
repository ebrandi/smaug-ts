# SMAUG 2.0 TypeScript Port — Phase 3L: Inventory Management and Equipment System

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

**Sub-Phases 3A–3K** are complete. The following files are fully implemented and may be imported:

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

### Sub-Phase 3C–3K (Magic, Skills, Affects, Economy, Communication, Admin, Perception, Combat Core, Spellcasting, Skills/Proficiency, Affect/Condition Engine)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3L Objective

Implement the complete inventory management and equipment system as a standalone, deeply detailed module. This sub-phase covers all object manipulation commands (`get`, `drop`, `put`, `give`, `wear`, `remove`, `eat`, `drink`, `fill`, `sacrifice`, `loot`), the equipment slot and layer system, carrying capacity enforcement, and container interactions. After this sub-phase, players can fully manage their inventory, equip and unequip items with correct stat application, interact with containers, and handle food/drink consumption — all pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/commands/objects.ts` — Object Interaction Commands

Implement all object manipulation commands. Replicates legacy `act_obj.c`:

#### `doGet(ch, argument)` — Pick Up Objects

Replicates legacy `do_get()` from `act_obj.c`. Handle all variants:

- **`get <item>`** — Pick up a single item from the room:
  1. Parse argument with `oneArgument()`. If empty: `"Get what?\n"`. Return.
  2. Handle `"all"` and `"all.<keyword>"` variants (see below).
  3. Use `numberArgument(argument)` to handle `"2.sword"` targeting.
  4. Find object in room: `getObjList(ch, arg, ch.inRoom.contents)`.
  5. If not found: `"You see nothing like that here.\n"`. Return.
  6. Validate:
     - `hasFlag(obj.extraFlags, ITEM_NO_TAKE)`: `"You can't take that.\n"`. Return.
     - Carrying capacity: `canCarry(ch, obj)` — check both weight and count limits.
       - Weight check: `ch.carryWeight + obj.getWeight() > maxCarryWeight(ch)` → `"You can't carry that much weight.\n"`. Return.
       - Count check: `ch.carryNumber + 1 > maxCarryNumber(ch)` → `"You can't carry that many items.\n"`. Return.
  7. Transfer object: `objFromRoom(obj)` then `objToChar(obj, ch)`.
  8. Send messages:
     - To character: `"You get ${obj.shortDescription}.\n"`
     - To room: `actToRoom(ch, "$n gets $p.", obj)`
  9. Update carrying stats: `ch.carryWeight += obj.getWeight()`, `ch.carryNumber++`.
  10. If object is gold/silver/copper pile (`ITEM_MONEY`): Auto-split with group if `autoSplit` enabled. Add currency to character, destroy object.
  11. Emit `GameEvent.ObjectPickup` with `{ characterId: ch.id, objectId: obj.id, fromRoom: true }`.
  12. Fire `GET_PROG` on the object via MUDprog engine.

- **`get <item> <container>`** — Get item from a container:
  1. Parse both arguments with `oneArgument()`.
  2. Find container in inventory or room: `getObjHere(ch, containerArg)`.
  3. Validate container:
     - Must be `ITEM_CONTAINER`, `ITEM_CORPSE_NPC`, `ITEM_CORPSE_PC`, `ITEM_KEYRING`, or `ITEM_QUIVER`.
     - If not a valid container type: `"That is not a container.\n"`. Return.
     - If closed: `hasFlag(obj.values[1], CONT_CLOSED)` → `"The ${container.shortDescription} is closed.\n"`. Return.
  4. Find target item inside container: `getObjList(ch, itemArg, container.contents)`.
  5. If not found: `"There is nothing like that in the ${container.shortDescription}.\n"`. Return.
  6. Perform same ITEM_NO_TAKE and carrying capacity checks.
  7. Transfer: `objFromObj(item)` then `objToChar(item, ch)`.
  8. Update container weight: `container.carryWeight -= item.getWeight()`.
  9. Send messages and emit events.

- **`get all`** — Get all takeable objects from room:
  1. Iterate `ch.inRoom.contents[]` in reverse order (to handle removal during iteration).
  2. For each object: skip `ITEM_NO_TAKE`, check capacity. If capacity exceeded, stop with message.
  3. Transfer each, send individual messages.
  4. If nothing picked up: `"You see nothing here.\n"`.

- **`get all <container>`** — Get all from container:
  1. Find container. Validate as above.
  2. Iterate `container.contents[]` in reverse.
  3. Transfer each takeable item.
  4. If container is now empty: `"The ${container.shortDescription} is empty.\n"`.

- **`get all.<keyword>`** — Get all matching keyword from room:
  1. Iterate room contents. For each, check `isName(keyword, obj.name)`.
  2. Transfer matching items.

#### `doDrop(ch, argument)` — Drop Objects

Replicates legacy `do_drop()` from `act_obj.c`:

- **`drop <item>`** — Drop single item:
  1. Parse argument. If empty: `"Drop what?\n"`. Return.
  2. Find in inventory: `getObjCarry(ch, arg)`.
  3. If not found: `"You do not have that item.\n"`. Return.
  4. Check `ITEM_NODROP` flag: `"It's stuck to your hand!\n"`. Return.
  5. If `ITEM_NOREMOVE` flag and equipped: `"You can't remove it.\n"`. Return.
  6. Transfer: `objFromChar(obj)` then `objToRoom(obj, ch.inRoom)`.
  7. Update carrying stats.
  8. Send messages: `"You drop ${obj.shortDescription}.\n"` / `"$n drops $p."`
  9. Emit `GameEvent.ObjectDrop`.
  10. Fire `DROP_PROG` on the object.
  11. If room has `ROOM_DONATION`: auto-sacrifice after a delay.

- **`drop <amount> <gold|silver|copper>`** — Drop currency:
  1. Parse amount and currency type.
  2. Validate character has enough currency.
  3. Create a money pile object (`ITEM_MONEY`) with the specified amount.
  4. Place in room. Deduct from character.
  5. `"You drop ${amount} ${currencyName}.\n"`.

- **`drop all` / `drop all.<keyword>`** — Drop multiple:
  1. Iterate inventory in reverse.
  2. Skip equipped items, `ITEM_NODROP` items.
  3. Drop each matching item.

#### `doPut(ch, argument)` — Put Object in Container

Replicates legacy `do_put()` from `act_obj.c`:

1. Parse two arguments: `<item>` and `<container>`.
2. Find container: `getObjHere(ch, containerArg)`. Must be `ITEM_CONTAINER` or similar.
3. If closed: `"The ${container.shortDescription} is closed.\n"`. Return.
4. Find item in inventory: `getObjCarry(ch, itemArg)`.
5. If item === container: `"You can't fold it into itself.\n"`. Return.
6. Check `ITEM_NODROP` on item: `"It's stuck to your hand!\n"`. Return.
7. Check container capacity:
   - Weight: `container.carryWeight + item.getWeight() > container.values[0]` (max weight in values[0]). `"It won't fit.\n"`. Return.
   - Count: container has a max item count (optional, in values[2]). If exceeded: `"It's too full.\n"`. Return.
8. Transfer: `objFromChar(item)` then `objToObj(item, container)`.
9. Update weights.
10. Send: `"You put ${item.shortDescription} in ${container.shortDescription}.\n"` / `"$n puts $p in $P."`
11. Emit `GameEvent.ObjectPutInContainer`.

- **`put all <container>` / `put all.<keyword> <container>`** — Put multiple items.

#### `doGive(ch, argument)` — Give Object to Character

Replicates legacy `do_give()` from `act_obj.c`:

1. Parse `<item>` and `<character>` arguments.
2. Find recipient in room: `getCharRoom(ch, recipientArg)`.
3. If not found: `"They aren't here.\n"`. Return.
4. Find item in inventory: `getObjCarry(ch, itemArg)`.
5. If not found: `"You do not have that item.\n"`. Return.
6. Check `ITEM_NODROP`: `"It's stuck to your hand!\n"`. Return.
7. Check recipient can carry (weight + count limits).
8. Transfer: `objFromChar(obj)` then `objToChar(obj, victim)`.
9. Send messages: `"You give ${obj.shortDescription} to ${victim.name}.\n"` / `"${ch.name} gives you ${obj.shortDescription}.\n"`.
10. Emit `GameEvent.ObjectGive`.
11. Fire `GIVE_PROG` on recipient (if NPC) — this enables quest turn-in mechanics.

- **`give <amount> <gold|silver|copper> <character>`** — Currency transfer:
  1. Validate amount and currency type.
  2. Check sender has enough.
  3. Deduct from sender, add to recipient.
  4. Send messages.

#### `doWear(ch, argument)` — Equip an Item

Replicates legacy `do_wear()` and `wear_obj()` from `act_obj.c`. This is one of the most complex commands due to the SMAUG layer system:

1. Parse argument. If `"all"`: call `doWearAll(ch)`. Return.
2. Find item in inventory: `getObjCarry(ch, arg)`.
3. If not found: `"You do not have that item.\n"`. Return.
4. Check level restriction: `obj.level > ch.level` → `"You must be level ${obj.level} to use this object.\n"`. Return.
5. Check class restriction: `hasFlag(obj.classRestrictions, ch.class_)` → `"Your class cannot use this item.\n"`. Return.
6. Check race restriction: `hasFlag(obj.raceRestrictions, ch.race)` → `"Your race cannot use this item.\n"`. Return.
7. **Determine wear location** from `obj.wearFlags` bitmask:
   - Iterate through `ITEM_WEAR_FINGER`, `ITEM_WEAR_NECK`, `ITEM_WEAR_BODY`, `ITEM_WEAR_HEAD`, etc.
   - For each set wear flag, find the corresponding `WearLocation` enum value.
   - If multiple wear locations are possible (e.g., `ITEM_WEAR_FINGER` → `WearLocation.FingerL` or `WearLocation.FingerR`), pick the first empty slot.
   - If no empty slot: auto-remove the item in the first slot and equip the new item.

8. **Layer system** — SMAUG supports multiple items in the same wear location via layers:
   ```typescript
   function canLayer(ch: Character, obj: GameObject, wearLoc: WearLocation): boolean {
     // Get all items currently equipped at this wear location
     const equipped = getEquippedAtLocation(ch, wearLoc);
     if (equipped.length === 0) return true;

     // Check layer compatibility
     for (const existing of equipped) {
       // If either item has no layers set (layer = 0), they conflict
       if (obj.layers === 0 || existing.layers === 0) return false;
       // If any layer bits overlap, they conflict
       if ((obj.layers & existing.layers) !== 0) return false;
     }
     return true;
   }
   ```
   - If `canLayer()` returns false and only one item is equipped: auto-remove it.
   - If `canLayer()` returns false and multiple items: `"It won't fit over what you're already wearing.\n"`. Return.

9. **Equip the item:**
   ```typescript
   function equipChar(ch: Character, obj: GameObject, wearLoc: WearLocation): void {
     // Set wear location
     obj.wearLocation = wearLoc;

     // Add to equipment map
     ch.equipment.set(wearLoc, obj);
     // (For layered: use an array per location instead)

     // Apply object affects to character
     for (const af of obj.affects) {
       const affect = new Affect(
         -1,            // type = -1 for equipment affects
         -1,            // duration = -1 (permanent while equipped)
         af.location,
         af.modifier,
         af.bitvector
       );
       affectManager.addAffect(ch, affect);
     }

     // Apply object's inherent AC if armor
     if (obj.itemType === ItemType.Armor) {
       ch.armor -= obj.values[0]; // values[0] = AC bonus
     }

     // Light source handling
     if (wearLoc === WearLocation.Light && obj.itemType === ItemType.Light) {
       if (obj.values[2] !== 0) { // Has fuel
         lightManager.addLight(ch.inRoom, 1);
       }
     }
   }
   ```

10. Send wear message based on location:
    - `WearLocation.Light`: `"You light ${obj.shortDescription} and hold it.\n"`
    - `WearLocation.FingerL/R`: `"You wear ${obj.shortDescription} on your finger.\n"`
    - `WearLocation.Neck1/2`: `"You wear ${obj.shortDescription} around your neck.\n"`
    - `WearLocation.Body`: `"You wear ${obj.shortDescription} on your torso.\n"`
    - `WearLocation.Head`: `"You wear ${obj.shortDescription} on your head.\n"`
    - `WearLocation.Legs`: `"You wear ${obj.shortDescription} on your legs.\n"`
    - `WearLocation.Feet`: `"You wear ${obj.shortDescription} on your feet.\n"`
    - `WearLocation.Hands`: `"You wear ${obj.shortDescription} on your hands.\n"`
    - `WearLocation.Arms`: `"You wear ${obj.shortDescription} on your arms.\n"`
    - `WearLocation.Shield`: `"You wear ${obj.shortDescription} as a shield.\n"`
    - `WearLocation.About`: `"You wear ${obj.shortDescription} about your body.\n"`
    - `WearLocation.Waist`: `"You wear ${obj.shortDescription} about your waist.\n"`
    - `WearLocation.WristL/R`: `"You wear ${obj.shortDescription} around your wrist.\n"`
    - `WearLocation.Wield`: `"You wield ${obj.shortDescription}.\n"`
    - `WearLocation.Hold`: `"You hold ${obj.shortDescription} in your hand.\n"`
    - `WearLocation.DualWield`: `"You dual-wield ${obj.shortDescription}.\n"`
    - `WearLocation.Ears`: `"You wear ${obj.shortDescription} on your ears.\n"`
    - `WearLocation.Eyes`: `"You wear ${obj.shortDescription} over your eyes.\n"`
    - `WearLocation.Back`: `"You sling ${obj.shortDescription} across your back.\n"`
    - `WearLocation.Face`: `"You wear ${obj.shortDescription} on your face.\n"`
    - `WearLocation.AnkleL/R`: `"You wear ${obj.shortDescription} around your ankle.\n"`

11. Room message: `actToRoom(ch, "$n wears $p.", obj)`.
12. Emit `GameEvent.ObjectEquip` with `{ characterId: ch.id, objectId: obj.id, location: wearLoc }`.

#### Wear Location Mapping

Map `ITEM_WEAR_*` flags to `WearLocation` values:

```typescript
export const ITEM_TAKE        = 1 << 0;   // Can be picked up
export const ITEM_WEAR_FINGER = 1 << 1;
export const ITEM_WEAR_NECK   = 1 << 2;
export const ITEM_WEAR_BODY   = 1 << 3;
export const ITEM_WEAR_HEAD   = 1 << 4;
export const ITEM_WEAR_LEGS   = 1 << 5;
export const ITEM_WEAR_FEET   = 1 << 6;
export const ITEM_WEAR_HANDS  = 1 << 7;
export const ITEM_WEAR_ARMS   = 1 << 8;
export const ITEM_WEAR_SHIELD = 1 << 9;
export const ITEM_WEAR_ABOUT  = 1 << 10;
export const ITEM_WEAR_WAIST  = 1 << 11;
export const ITEM_WEAR_WRIST  = 1 << 12;
export const ITEM_WIELD       = 1 << 13;
export const ITEM_HOLD        = 1 << 14;
export const ITEM_DUAL_WIELD  = 1 << 15;
export const ITEM_WEAR_EARS   = 1 << 16;
export const ITEM_WEAR_EYES   = 1 << 17;
export const ITEM_MISSILE_WIELD = 1 << 18;
export const ITEM_WEAR_BACK   = 1 << 19;
export const ITEM_WEAR_FACE   = 1 << 20;
export const ITEM_WEAR_ANKLE  = 1 << 21;

/** Map wear flags to available WearLocation slots (ordered by preference). */
export const WEAR_FLAG_TO_LOCATIONS: Map<number, WearLocation[]> = new Map([
  [ITEM_WEAR_FINGER, [WearLocation.FingerL, WearLocation.FingerR]],
  [ITEM_WEAR_NECK,   [WearLocation.Neck1, WearLocation.Neck2]],
  [ITEM_WEAR_BODY,   [WearLocation.Body]],
  [ITEM_WEAR_HEAD,   [WearLocation.Head]],
  [ITEM_WEAR_LEGS,   [WearLocation.Legs]],
  [ITEM_WEAR_FEET,   [WearLocation.Feet]],
  [ITEM_WEAR_HANDS,  [WearLocation.Hands]],
  [ITEM_WEAR_ARMS,   [WearLocation.Arms]],
  [ITEM_WEAR_SHIELD, [WearLocation.Shield]],
  [ITEM_WEAR_ABOUT,  [WearLocation.About]],
  [ITEM_WEAR_WAIST,  [WearLocation.Waist]],
  [ITEM_WEAR_WRIST,  [WearLocation.WristL, WearLocation.WristR]],
  [ITEM_WIELD,       [WearLocation.Wield]],
  [ITEM_HOLD,        [WearLocation.Hold]],
  [ITEM_DUAL_WIELD,  [WearLocation.DualWield]],
  [ITEM_WEAR_EARS,   [WearLocation.Ears]],
  [ITEM_WEAR_EYES,   [WearLocation.Eyes]],
  [ITEM_MISSILE_WIELD, [WearLocation.MissileWield]],
  [ITEM_WEAR_BACK,   [WearLocation.Back]],
  [ITEM_WEAR_FACE,   [WearLocation.Face]],
  [ITEM_WEAR_ANKLE,  [WearLocation.AnkleL, WearLocation.AnkleR]],
]);
```

#### `doRemove(ch, argument)` — Unequip an Item

Replicates legacy `do_remove()` and `unequip_char()` from `act_obj.c`:

1. Parse argument. If empty: `"Remove what?\n"`. Return.
2. Find equipped item: search `ch.equipment` for item matching `arg` by name.
3. If not found: `"You are not using that.\n"`. Return.
4. Check `ITEM_NOREMOVE` flag: `"You can't remove it!\n"`. Return. (Cursed items.)
5. **Unequip the item:**
   ```typescript
   function unequipChar(ch: Character, obj: GameObject): void {
     // Remove object affects from character
     for (const af of obj.affects) {
       // Find matching equipment affect on character and remove it
       const charAf = ch.affects.find(
         a => a.type === -1 && a.location === af.location && a.modifier === af.modifier
       );
       if (charAf) {
         affectManager.removeAffect(ch, charAf);
       }
     }

     // Reverse inherent AC if armor
     if (obj.itemType === ItemType.Armor) {
       ch.armor += obj.values[0];
     }

     // Light source handling
     if (obj.wearLocation === WearLocation.Light && obj.itemType === ItemType.Light) {
       if (obj.values[2] !== 0) {
         lightManager.removeLight(ch.inRoom, 1);
       }
     }

     // Remove from equipment map
     ch.equipment.delete(obj.wearLocation);
     obj.wearLocation = WearLocation.None;
   }
   ```
6. Move to inventory (it stays in `ch.inventory`).
7. Send: `"You stop using ${obj.shortDescription}.\n"` / `"$n stops using $p."`
8. Emit `GameEvent.ObjectRemove`.

#### `doWearAll(ch)` — Equip All Equippable Items

1. Iterate `ch.inventory[]`.
2. For each item with `wearFlags != 0` and `wearLocation === WearLocation.None`:
   - Call `wearObj(ch, obj)` (the internal equip logic).
3. Skip items that can't be worn (wrong class/race/level).

#### `doEat(ch, argument)` — Eat Food

Replicates legacy `do_eat()` from `act_obj.c`:

1. Find item in inventory: `getObjCarry(ch, arg)`.
2. If not found: `"You do not have that item.\n"`. Return.
3. Validate item type:
   - `ITEM_FOOD`: Proceed with food eating.
   - `ITEM_PILL`: Proceed with pill ingestion (like potion but no liquid).
   - Other: `"You can't eat that.\n"`. Return.
4. **Food:**
   - Check `ch.pcData.condition[COND_FULL]`: If already at max (48): `"You are too full to eat more.\n"`. Return.
   - Set condition: `ch.pcData.condition[COND_FULL] = Math.min(48, ch.pcData.condition[COND_FULL] + obj.values[0])`.
   - `obj.values[0]` = hours of nourishment.
   - If `obj.values[3] !== 0` (poisoned food): Apply poison affect via `castSpell(GSN_POISON, obj.values[0], ch, ch)`. Send `"You feel very sick.\n"`.
5. **Pill:**
   - Apply up to 3 spell effects stored in `obj.values[1]`, `obj.values[2]`, `obj.values[3]`.
   - Each calls `castSpell(spellSn, obj.values[0], ch, ch)` where `values[0]` = spell level.
6. Destroy the item: `extractObj(obj)`.
7. Send: `"You eat ${obj.shortDescription}.\n"` / `"$n eats $p."`

#### `doDrink(ch, argument)` — Drink from Container/Fountain

Replicates legacy `do_drink()` from `act_obj.c`:

1. If no argument: Find a fountain in the room (`ITEM_FOUNTAIN`). If none: `"Drink what?\n"`. Return.
2. If argument provided: Find object `getObjHere(ch, arg)`. Must be `ITEM_DRINK_CON` or `ITEM_FOUNTAIN`.
3. **Drink container (`ITEM_DRINK_CON`):**
   - `values[0]` = max capacity, `values[1]` = current amount, `values[2]` = liquid type, `values[3]` = poisoned flag.
   - If `values[1] <= 0`: `"It is already empty.\n"`. Return.
   - Check thirst: If `ch.pcData.condition[COND_THIRST] >= 48`: `"You are not thirsty.\n"`. Return.
   - Calculate amount drunk: `amount = Math.min(3, values[1])`. Apply liquid properties from `LIQUID_TABLE`.
   - Update condition: `ch.pcData.condition[COND_THIRST] = Math.min(48, thirst + liquidTable[liquid].thirst * amount / 4)`.
   - Update intoxication: `ch.pcData.condition[COND_DRUNK] = Math.min(48, drunk + liquidTable[liquid].drunk * amount / 4)`.
   - Decrement charges: `values[1] -= amount`.
   - If poisoned (`values[3] !== 0`): Apply poison affect.
4. **Fountain (`ITEM_FOUNTAIN`):**
   - Infinite charges. Same thirst/drunk updates.
5. Send: `"You drink ${liquidName} from ${obj.shortDescription}.\n"`.

#### `doFill(ch, argument)` — Fill Drink Container

Replicates legacy `do_fill()` from `act_obj.c`:

1. Find drink container in inventory: `getObjCarry(ch, arg)`. Must be `ITEM_DRINK_CON`.
2. Find water source in room: fountain (`ITEM_FOUNTAIN`) or spring (`ITEM_FOUNTAIN`).
3. If no source: `"There is no water source here.\n"`. Return.
4. If container is full: `"It's already full.\n"`. Return.
5. If container has a different liquid and is not empty: `"You can't mix drinks. Empty it first.\n"`. Return.
6. Fill: `obj.values[1] = obj.values[0]`. Set liquid type to water (`0`). Clear poison flag.
7. Send: `"You fill ${obj.shortDescription} from ${source.shortDescription}.\n"`.

#### `doSacrifice(ch, argument)` — Sacrifice Object to the Gods

Replicates legacy `do_sacrifice()` from `act_obj.c`:

1. Find object in room: `getObjList(ch, arg, ch.inRoom.contents)`.
2. If not found: `"You see nothing like that here.\n"`. Return.
3. If object is `ITEM_CORPSE_PC` and not own corpse: `"You wouldn't want to desecrate ${name}'s corpse.\n"`. Return.
4. If object has `ITEM_NOSACRIFICE` flag: `"You can't sacrifice that.\n"`. Return.
5. Calculate gold reward: `gold = Math.max(1, Math.floor(obj.level / 2))`.
6. Add gold to character.
7. Send: `"${deityName} gives you ${gold} gold coin${gold !== 1 ? 's' : ''} for your sacrifice.\n"`.
8. Room message: `"$n sacrifices $p to the gods."`.
9. If object is a container, extract contents first (drop to room or destroy).
10. Extract object: `extractObj(obj)`.

#### `doLoot(ch, argument)` — Loot a Corpse

Alias for `get all corpse` with additional PK loot rules:

1. Find corpse in room. Must be `ITEM_CORPSE_NPC` or `ITEM_CORPSE_PC`.
2. For PC corpses: Check PK loot rules:
   - If `ch` is the corpse owner: allowed.
   - If `ch` is a killer or thief: allowed.
   - If room is not PK-legal: `"You cannot loot a player's corpse here.\n"`. Return.
3. Delegate to `doGet(ch, "all corpse")`.

---

### 2. Object Transfer Helper Functions

Implement the core object movement primitives used by all commands. These maintain consistency of inventory, room contents, container contents, and carrying stats.

```typescript
/**
 * Remove object from a character's inventory.
 * Replicates legacy obj_from_char().
 */
export function objFromChar(obj: GameObject): void {
  if (!obj.carriedBy) return;
  const ch = obj.carriedBy;
  ch.inventory = ch.inventory.filter(o => o !== obj);
  ch.carryWeight -= obj.getWeight();
  ch.carryNumber--;
  obj.carriedBy = null;
}

/**
 * Add object to a character's inventory.
 * Replicates legacy obj_to_char().
 */
export function objToChar(obj: GameObject, ch: Character): void {
  ch.inventory.push(obj);
  obj.carriedBy = ch;
  obj.inRoom = null;
  obj.inObj = null;
  ch.carryWeight += obj.getWeight();
  ch.carryNumber++;
}

/**
 * Remove object from a room.
 * Replicates legacy obj_from_room().
 */
export function objFromRoom(obj: GameObject): void {
  if (!obj.inRoom) return;
  obj.inRoom.contents = obj.inRoom.contents.filter(o => o !== obj);
  obj.inRoom = null;
}

/**
 * Add object to a room.
 * Replicates legacy obj_to_room().
 */
export function objToRoom(obj: GameObject, room: Room): void {
  room.contents.push(obj);
  obj.inRoom = room;
  obj.carriedBy = null;
  obj.inObj = null;
}

/**
 * Remove object from inside another object (container).
 * Replicates legacy obj_from_obj().
 */
export function objFromObj(obj: GameObject): void {
  if (!obj.inObj) return;
  const container = obj.inObj;
  container.contents = container.contents.filter(o => o !== obj);
  // Update nested weight tracking
  let outerObj: GameObject | null = container;
  while (outerObj) {
    outerObj.carryWeight -= obj.getWeight();
    outerObj = outerObj.inObj;
  }
  // If container is carried, update character's carry weight
  if (container.carriedBy) {
    container.carriedBy.carryWeight -= obj.getWeight();
  }
  obj.inObj = null;
}

/**
 * Put object inside another object (container).
 * Replicates legacy obj_to_obj().
 */
export function objToObj(obj: GameObject, container: GameObject): void {
  container.contents.push(obj);
  obj.inObj = container;
  obj.carriedBy = null;
  obj.inRoom = null;
  // Update nested weight tracking
  let outerObj: GameObject | null = container;
  while (outerObj) {
    outerObj.carryWeight += obj.getWeight();
    outerObj = outerObj.inObj;
  }
  // If container is carried, update character's carry weight
  if (container.carriedBy) {
    container.carriedBy.carryWeight += obj.getWeight();
  }
}

/**
 * Completely remove an object from the game.
 * Replicates legacy extract_obj().
 */
export function extractObj(obj: GameObject): void {
  // Recursively extract contents
  for (const item of [...obj.contents]) {
    extractObj(item);
  }
  // Remove from wherever it is
  if (obj.carriedBy) objFromChar(obj);
  else if (obj.inRoom) objFromRoom(obj);
  else if (obj.inObj) objFromObj(obj);

  obj.extracted = true;
  // Remove from global object list
  globalObjectList.delete(obj.id);
}
```

---

### 3. Carrying Capacity Functions

Replicates legacy carrying capacity calculations from `handler.c`:

```typescript
/**
 * Maximum weight a character can carry.
 * Replicates legacy can_carry_w().
 */
export function maxCarryWeight(ch: Character): number {
  return getStrApp(ch.getStr()).carry * 10 + ch.level * 25;
}

/**
 * Maximum number of items a character can carry.
 * Replicates legacy can_carry_n().
 */
export function maxCarryNumber(ch: Character): number {
  return ch.level + getDexApp(ch.getDex()).carry + 10;
}

/**
 * Check if character can carry an additional object.
 * Returns true if both weight and count limits allow it.
 */
export function canCarry(ch: Character, obj: GameObject): boolean {
  if (ch.carryNumber + 1 > maxCarryNumber(ch)) return false;
  if (ch.carryWeight + obj.getWeight() > maxCarryWeight(ch)) return false;
  return true;
}

/**
 * Get the effective weight of an object including contents.
 * Replicates legacy get_obj_weight().
 */
export function getObjWeight(obj: GameObject): number {
  let weight = obj.weight;
  for (const item of obj.contents) {
    weight += getObjWeight(item);
  }
  return weight;
}
```

---

### 4. Object Lookup Helper Functions

Replicates legacy object search functions from `handler.c`:

```typescript
/**
 * Find an object in a character's inventory by name.
 * Replicates legacy get_obj_carry().
 */
export function getObjCarry(ch: Character, arg: string): GameObject | null {
  const [count, name] = numberArgument(arg);
  let num = 0;
  for (const obj of ch.inventory) {
    if (obj.wearLocation !== WearLocation.None) continue; // Skip equipped
    if (isName(name, obj.name)) {
      num++;
      if (num === count) return obj;
    }
  }
  return null;
}

/**
 * Find an object in a character's equipment by name.
 * Replicates legacy get_obj_wear().
 */
export function getObjWear(ch: Character, arg: string): GameObject | null {
  const [count, name] = numberArgument(arg);
  let num = 0;
  for (const [, obj] of ch.equipment) {
    if (isName(name, obj.name)) {
      num++;
      if (num === count) return obj;
    }
  }
  return null;
}

/**
 * Find an object in a list (room contents, container contents) by name.
 * Replicates legacy get_obj_list().
 */
export function getObjList(ch: Character, arg: string, list: GameObject[]): GameObject | null {
  const [count, name] = numberArgument(arg);
  let num = 0;
  for (const obj of list) {
    if (!canSeeObj(ch, obj)) continue;
    if (isName(name, obj.name)) {
      num++;
      if (num === count) return obj;
    }
  }
  return null;
}

/**
 * Find an object anywhere accessible to the character (inventory, equipment, room).
 * Replicates legacy get_obj_here().
 */
export function getObjHere(ch: Character, arg: string): GameObject | null {
  let obj = getObjCarry(ch, arg);
  if (obj) return obj;
  obj = getObjWear(ch, arg);
  if (obj) return obj;
  if (ch.inRoom) {
    obj = getObjList(ch, arg, ch.inRoom.contents);
  }
  return obj;
}
```

---

### 5. Container Flag Constants

```typescript
export const CONT_CLOSEABLE  = 1 << 0;  // Container can be opened/closed
export const CONT_PICKPROOF  = 1 << 1;  // Cannot be pick-locked
export const CONT_CLOSED     = 1 << 2;  // Currently closed
export const CONT_LOCKED     = 1 << 3;  // Currently locked
export const CONT_EATKEY     = 1 << 4;  // Key is consumed on use
```

Container `values[]` mapping for `ITEM_CONTAINER`:
- `values[0]` = maximum weight capacity
- `values[1]` = container flags (CONT_* bitmask)
- `values[2]` = key vnum (0 = no key needed)
- `values[3]` = maximum item count (0 = unlimited)

---

### 6. Liquid Table

```typescript
interface LiquidEntry {
  name: string;
  color: string;
  drunk: number;    // Intoxication per serving
  full: number;     // Hunger satisfaction per serving
  thirst: number;   // Thirst satisfaction per serving
}

export const LIQUID_TABLE: LiquidEntry[] = [
  { name: 'water',          color: 'clear',        drunk:  0, full:  1, thirst: 10 },
  { name: 'beer',           color: 'amber',        drunk:  3, full:  2, thirst:  5 },
  { name: 'wine',           color: 'rose',         drunk:  5, full:  2, thirst:  5 },
  { name: 'ale',            color: 'brown',        drunk:  2, full:  2, thirst:  5 },
  { name: 'dark ale',       color: 'dark',         drunk:  1, full:  2, thirst:  5 },
  { name: 'whisky',         color: 'golden',       drunk:  6, full:  1, thirst:  4 },
  { name: 'lemonade',       color: 'pink',         drunk:  0, full:  1, thirst:  8 },
  { name: 'firebreather',   color: 'boiling',      drunk: 10, full:  0, thirst:  0 },
  { name: 'local specialty', color: 'evilly dark', drunk:  3, full:  1, thirst:  3 },
  { name: 'slime mold juice', color: 'green',      drunk:  0, full:  4, thirst: -8 },
  { name: 'milk',           color: 'white',        drunk:  0, full:  3, thirst:  6 },
  { name: 'tea',            color: 'tan',          drunk:  0, full:  1, thirst:  6 },
  { name: 'coffee',         color: 'black',        drunk:  0, full:  1, thirst:  6 },
  { name: 'blood',          color: 'red',          drunk:  0, full:  2, thirst: -1 },
  { name: 'salt water',     color: 'clear',        drunk:  0, full:  1, thirst: -2 },
  { name: 'cola',           color: 'cherry',       drunk:  0, full:  1, thirst:  5 },
];
```

---

### 7. Extra Flags Constants

Item extra flags used for inventory interactions (as `bigint`):

```typescript
export const ITEM_GLOW         = 1n << 0n;   // Glowing item
export const ITEM_HUM          = 1n << 1n;   // Humming item
export const ITEM_DARK         = 1n << 2n;   // Dark item
export const ITEM_LOYAL        = 1n << 3n;   // Returns to owner
export const ITEM_EVIL         = 1n << 4n;   // Evil-aligned
export const ITEM_INVIS        = 1n << 5n;   // Invisible
export const ITEM_MAGIC        = 1n << 6n;   // Magical
export const ITEM_NODROP       = 1n << 7n;   // Cannot be dropped
export const ITEM_BLESS        = 1n << 8n;   // Blessed
export const ITEM_ANTI_GOOD    = 1n << 9n;   // Anti-good alignment
export const ITEM_ANTI_EVIL    = 1n << 10n;  // Anti-evil alignment
export const ITEM_ANTI_NEUTRAL = 1n << 11n;  // Anti-neutral alignment
export const ITEM_NOREMOVE     = 1n << 12n;  // Cannot be removed (cursed)
export const ITEM_INVENTORY    = 1n << 13n;  // Always in inventory (shop restock)
export const ITEM_NOSACRIF     = 1n << 14n;  // Cannot be sacrificed
export const ITEM_DONATED      = 1n << 15n;  // Donated item
export const ITEM_CLANOBJECT   = 1n << 16n;  // Clan-specific item
export const ITEM_CLANCORPSE   = 1n << 17n;  // Clan corpse
export const ITEM_ANTI_MAGE    = 1n << 18n;  // Anti-mage class
export const ITEM_ANTI_THIEF   = 1n << 19n;  // Anti-thief class
export const ITEM_ANTI_WARRIOR = 1n << 20n;  // Anti-warrior class
export const ITEM_ANTI_CLERIC  = 1n << 21n;  // Anti-cleric class
export const ITEM_ORGANIC      = 1n << 22n;  // Organic material (decays)
export const ITEM_METAL        = 1n << 23n;  // Metallic material
export const ITEM_DONATION     = 1n << 24n;  // In donation room
export const ITEM_CLANWEAPON   = 1n << 25n;  // Clan weapon
export const ITEM_PROTOTYPE    = 1n << 26n;  // Prototype (OLC only)
export const ITEM_NO_TAKE      = 1n << 27n;  // Cannot be picked up
```

---

### 8. `src/game/entities/GameObject.ts` — Key Properties

Ensure the `GameObject` entity class has the following properties used by the inventory system:

```typescript
export class GameObject {
  id: string;
  /** Object prototype vnum. */
  vnum: number;
  /** Short description (e.g., "a gleaming sword"). */
  shortDescription: string;
  /** Long description (shown in room). */
  longDescription: string;
  /** Keywords for targeting (e.g., "sword gleaming"). */
  name: string;
  /** Item type (weapon, armor, container, food, etc.). */
  itemType: ItemType;
  /** Extra flags (ITEM_GLOW, ITEM_NODROP, etc.). */
  extraFlags: bigint;
  /** Wear flags (ITEM_WEAR_BODY, ITEM_WIELD, etc.). */
  wearFlags: number;
  /** Current wear location on a character. WearLocation.None = in inventory. */
  wearLocation: WearLocation;
  /** Layer value for SMAUG layered equipment. 0 = no layering. */
  layers: number;
  /** Item level (affects who can use it). */
  level: number;
  /** Weight in tenths of a pound. */
  weight: number;
  /** Base cost in copper. */
  cost: number;
  /** Type-specific values array. Meaning depends on itemType. */
  values: number[];
  /** Object affects (stat modifiers applied when equipped). */
  affects: ObjectAffect[];
  /** Extra descriptions. */
  extraDescriptions: ExtraDescription[];
  /** Timer: ticks until object decays. -1 = no decay. */
  timer: number;
  /** Current condition (0-100, 100 = pristine). */
  condition: number;

  /** Container/nested contents. */
  contents: GameObject[];
  /** Carried weight of contents (for containers). */
  carryWeight: number;

  /** Where is this object? Only one of these is set at a time. */
  carriedBy: Character | null;
  inRoom: Room | null;
  inObj: GameObject | null;

  /** Has this object been extracted from the game? */
  extracted: boolean;

  /** Class restrictions bitmask. */
  classRestrictions: number;
  /** Race restrictions bitmask. */
  raceRestrictions: number;

  /**
   * Get effective weight including contents.
   */
  getWeight(): number {
    let w = this.weight;
    for (const item of this.contents) {
      w += item.getWeight();
    }
    return w;
  }
}

export interface ObjectAffect {
  location: ApplyType;
  modifier: number;
  bitvector: bigint;
}
```

---

### 9. Object Decay System

Implement the object timer/decay system. Called every `PULSE_TICK`:

```typescript
/**
 * Update object timers. Extract objects whose timer reaches 0.
 * Replicates legacy obj_update() from update.c.
 */
export function objectUpdate(): void {
  for (const obj of globalObjectList.values()) {
    if (obj.extracted) continue;
    if (obj.timer < 0) continue; // No timer set

    obj.timer--;

    if (obj.timer === 0) {
      // Timer expired — decay the object
      handleObjectDecay(obj);
    }
  }
}

function handleObjectDecay(obj: GameObject): void {
  const room = obj.inRoom;

  switch (obj.itemType) {
    case ItemType.CorpseNpc:
      if (room) {
        // Drop contents to room before decaying
        for (const item of [...obj.contents]) {
          objFromObj(item);
          objToRoom(item, room);
        }
        actToRoom(null, "$p decays into dust.", room, obj);
      }
      extractObj(obj);
      break;

    case ItemType.CorpsePc:
      if (room) {
        // PC corpses drop contents to room
        for (const item of [...obj.contents]) {
          objFromObj(item);
          objToRoom(item, room);
        }
        actToRoom(null, "$p decays, revealing its contents.", room, obj);
      }
      extractObj(obj);
      break;

    case ItemType.Portal:
      if (room) {
        actToRoom(null, "$p winks out of existence.", room, obj);
      }
      extractObj(obj);
      break;

    case ItemType.Fountain:
      if (room) {
        actToRoom(null, "$p dries up.", room, obj);
      }
      extractObj(obj);
      break;

    default:
      if (room) {
        actToRoom(null, "$p crumbles into dust.", room, obj);
      } else if (obj.carriedBy) {
        sendToChar(obj.carriedBy, `${obj.shortDescription} crumbles into dust.\n`);
      }
      extractObj(obj);
      break;
  }
}
```

Wire `objectUpdate()` into `TickEngine` via `EventBus.on(GameEvent.FullTick)`.

---

## Command Registration

Register all object commands in `CommandRegistry`:

```typescript
// In CommandRegistry initialization or objects.ts registration function
registerCommand({
  name: 'get',       handler: doGet,       position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'take',      handler: doGet,       position: Position.Resting,  trust: 0,  log: LogAction.Normal }); // Alias
registerCommand({
  name: 'drop',      handler: doDrop,      position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'put',       handler: doPut,       position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'give',      handler: doGive,      position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'wear',      handler: doWear,      position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'remove',    handler: doRemove,    position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'eat',       handler: doEat,       position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'drink',     handler: doDrink,     position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'fill',      handler: doFill,      position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'sacrifice', handler: doSacrifice, position: Position.Resting,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'junk',      handler: doSacrifice, position: Position.Resting,  trust: 0,  log: LogAction.Normal }); // Alias
registerCommand({
  name: 'loot',      handler: doLoot,      position: Position.Resting,  trust: 0,  log: LogAction.Normal });
```

---

## Tests for Sub-Phase 3L

- `tests/unit/commands/objects.test.ts` — Comprehensive object command tests:
  - `get sword` from room → item in inventory, room contents updated.
  - `get 2.sword` → gets the second sword.
  - `get all` → all takeable items picked up.
  - `get sword bag` → item transferred from container.
  - `get all corpse` → loot all from corpse.
  - `ITEM_NO_TAKE` flag → rejected with message.
  - Carrying capacity exceeded → rejected with weight/count message.
  - `drop sword` → item in room, inventory updated.
  - `drop all.potion` → all potions dropped.
  - `drop 50 gold` → gold pile object created in room.
  - `ITEM_NODROP` flag → "It's stuck to your hand!".
  - `put sword bag` → item in container, weight updated.
  - Container full → "It won't fit."
  - Container closed → "The bag is closed."
  - Item === container → "You can't fold it into itself."
  - `give sword guard` → item transferred, GIVE_PROG fired on NPC.
  - `give 100 gold guard` → currency transferred.
  - Recipient can't carry → rejected.

- `tests/unit/commands/equipment.test.ts` — Equipment tests:
  - `wear chainmail` → equipped at Body, AC applied.
  - `wear ring` → first ring at FingerL, second at FingerR.
  - `wear ring` when both slots full → auto-remove from FingerL.
  - Layer system: cloak (layer 1) over armor (layer 2) → both equipped.
  - Layer conflict: two items with same layer → rejected.
  - `remove chainmail` → unequipped, AC reversed.
  - `ITEM_NOREMOVE` → "You can't remove it!"
  - Equipment affects: +2 STR ring → `ch.getStr()` increased by 2 on equip, decreased on remove.
  - Weapon wield → verify wearLocation = Wield.
  - Dual wield → verify DualWield slot used.
  - Light source → room light level increased on equip, decreased on remove.
  - Level restriction → "You must be level X".

- `tests/unit/commands/food_drink.test.ts` — Food and drink tests:
  - `eat bread` → hunger condition increased, item destroyed.
  - `eat` when full → "You are too full."
  - `eat poisoned_bread` → poison affect applied.
  - `eat pill` → up to 3 spell effects applied.
  - `drink fountain` → thirst decreased.
  - `drink waterskin` → charges decremented.
  - `drink` when not thirsty → "You are not thirsty."
  - Poisoned drink → poison affect applied.
  - `fill waterskin` → filled from fountain.
  - `fill` with different liquid → "You can't mix drinks."

- `tests/unit/objects/transfer.test.ts` — Object transfer primitive tests:
  - `objToChar` / `objFromChar` → weight and count tracking.
  - `objToRoom` / `objFromRoom` → room contents tracking.
  - `objToObj` / `objFromObj` → nested weight propagation.
  - `extractObj` → recursive extraction of contents, global list removal.

- `tests/unit/objects/capacity.test.ts` — Carrying capacity tests:
  - `maxCarryWeight` at various STR values.
  - `maxCarryNumber` at various DEX values and levels.
  - `canCarry` boundary conditions.
  - `getObjWeight` with nested containers.

- `tests/unit/objects/lookup.test.ts` — Object lookup tests:
  - `getObjCarry` — find by name, find by nth match, skip equipped items.
  - `getObjWear` — find equipped items only.
  - `getObjList` — find in room/container contents, visibility check.
  - `getObjHere` — searches inventory → equipment → room in order.

- `tests/unit/objects/decay.test.ts` — Object decay tests:
  - NPC corpse timer expires → contents drop to room, corpse extracted.
  - PC corpse timer expires → contents drop, message sent.
  - Portal timer expires → "winks out of existence".
  - No timer (`timer = -1`) → never decays.

- `tests/integration/InventoryEquipFlow.test.ts` — Full integration:
  - Create character with STR 18 → verify carry capacity.
  - Get sword from room → wear sword → verify wield slot, damage bonus applied.
  - Remove sword → verify bonus removed.
  - Get all from corpse → verify all items transferred.
  - Put items in bag → verify container weight updated → get from bag → verify weight reverted.
  - Eat food → verify hunger condition → eat poisoned food → verify poison affect.
  - Drop gold → verify pile object created → get gold → verify auto-split with group.

---

## Acceptance Criteria

- [ ] `get sword` picks up a sword from the room. Inventory and room contents updated. Weight/count tracked.
- [ ] `get 2.sword` picks up the second sword matching "sword" keyword.
- [ ] `get all corpse` loots all items from a corpse container.
- [ ] `get sword bag` gets from a container. Container weight updated.
- [ ] `ITEM_NO_TAKE` prevents picking up. `ITEM_NODROP` prevents dropping.
- [ ] Carrying capacity limits enforced: weight limit from `STR_APP`, count limit from level + DEX.
- [ ] `drop all.potion` drops all potions. `drop 50 gold` creates a gold pile object.
- [ ] `put sword bag` places item in container. Container weight and count limits enforced.
- [ ] `give sword guard` transfers item. `GIVE_PROG` fires on NPC recipients.
- [ ] `wear chainmail` equips it at correct body slot. Equipment AC and stat affects applied.
- [ ] `wear ring` when both finger slots full auto-removes from first slot.
- [ ] Layer system: layered items coexist if layer bits don't overlap. Conflicting layers rejected.
- [ ] `remove chainmail` unequips. All equipment affects reversed. `ITEM_NOREMOVE` blocks removal.
- [ ] `eat bread` restores hunger condition. Poisoned food applies poison affect. Pill applies spell effects.
- [ ] `drink fountain` restores thirst. Drink container charges decrement. Poisoned drink applies poison.
- [ ] `fill waterskin` fills from fountain. Mixing liquids rejected.
- [ ] `sacrifice sword` destroys object, awards gold.
- [ ] Object decay: corpse timer expires → contents drop to room. Portal timer expires → extracted.
- [ ] Object lookup functions handle `numberArgument()` correctly (e.g., `2.sword`).
- [ ] All object transfer helpers (`objToChar`, `objFromChar`, etc.) maintain correct weight tracking.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
