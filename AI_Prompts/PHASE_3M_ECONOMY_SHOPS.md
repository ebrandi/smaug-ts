# SMAUG 2.0 TypeScript Port — Phase 3M: Economy System and Shops

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

**Sub-Phases 3A–3L** are complete. The following files are fully implemented and may be imported:

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

### Sub-Phase 3C–3L (Magic, Skills, Affects, Inventory, Perception, etc.)
- All files from these sub-phases are fully implemented — see prior phase documents for complete listings.

**Do NOT modify any of the above files.** You may import from them freely.

---

## Sub-Phase 3M Objective

Implement the complete economy system: the three-currency model, shop buy/sell/list/value interactions, repair shop mechanics, the global auction system, and the banking system. After this sub-phase, players can buy and sell items at NPC-run shops, have items repaired, participate in timed auctions, and deposit/withdraw currency at banks — all pixel-perfect with the legacy SMAUG 2.0 engine.

---

## Files to Implement

### 1. `src/game/economy/Currency.ts` — Three-Currency System

Implement the three-currency model. Replicates legacy `conv_currency()` and related helpers:

```typescript
/**
 * Three-currency system: gold, silver, copper.
 * Fixed ratios: 1 gold = 100 silver = 10,000 copper.
 * Replicates legacy currency handling throughout the engine.
 */

export interface Currency {
  gold: number;
  silver: number;
  copper: number;
}

/** Convert a currency triple to total copper value. */
export function toCopper(c: Currency): number {
  return c.gold * 10000 + c.silver * 100 + c.copper;
}

/**
 * Normalize excess copper/silver upward.
 * E.g., 150 copper → 1 silver, 50 copper.
 * E.g., 150 silver → 1 gold, 50 silver.
 */
export function normalizeCurrency(c: Currency): Currency {
  let total = toCopper(c);
  const gold = Math.floor(total / 10000);
  total -= gold * 10000;
  const silver = Math.floor(total / 100);
  const copper = total - silver * 100;
  return { gold, silver, copper };
}

/** Check if a currency amount can afford a cost denominated in copper. */
export function canAfford(c: Currency, costInCopper: number): boolean {
  return toCopper(c) >= costInCopper;
}

/**
 * Deduct a copper-denominated cost from a currency triple.
 * Returns new normalized currency. Caller must verify canAfford() first.
 */
export function deductCost(c: Currency, costInCopper: number): Currency {
  const remaining = toCopper(c) - costInCopper;
  return normalizeCurrency({ gold: 0, silver: 0, copper: Math.max(0, remaining) });
}

/**
 * Add two currency values and normalize the result.
 */
export function addCurrency(a: Currency, b: Currency): Currency {
  return normalizeCurrency({
    gold: a.gold + b.gold,
    silver: a.silver + b.silver,
    copper: a.copper + b.copper,
  });
}

/**
 * Subtract currency b from currency a. Returns normalized result.
 * Does NOT check for negative — caller must use canAfford() first.
 */
export function subtractCurrency(a: Currency, b: Currency): Currency {
  const diff = toCopper(a) - toCopper(b);
  return normalizeCurrency({ gold: 0, silver: 0, copper: Math.max(0, diff) });
}

/**
 * Format a Currency for display.
 * Examples:
 *   { gold: 3, silver: 2, copper: 15 } → "3 gold, 2 silver, 15 copper"
 *   { gold: 0, silver: 0, copper: 0 }  → "0 copper"
 *   { gold: 1, silver: 0, copper: 0 }  → "1 gold"
 * Only shows non-zero denominations, except if all zero shows "0 copper".
 */
export function formatCurrency(c: Currency): string {
  const parts: string[] = [];
  if (c.gold > 0) parts.push(`${c.gold} gold`);
  if (c.silver > 0) parts.push(`${c.silver} silver`);
  if (c.copper > 0 || parts.length === 0) parts.push(`${c.copper} copper`);
  return parts.join(', ');
}

/**
 * Create a Currency from a copper amount.
 */
export function fromCopper(copper: number): Currency {
  return normalizeCurrency({ gold: 0, silver: 0, copper: Math.max(0, copper) });
}

/**
 * Zero currency constant.
 */
export const ZERO_CURRENCY: Currency = { gold: 0, silver: 0, copper: 0 };

/**
 * Parse a currency string like "50 gold" or "100 silver" into a Currency.
 * Used by bank/give commands.
 */
export function parseCurrencyArg(amountStr: string, typeStr: string): Currency | null {
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) return null;
  switch (typeStr.toLowerCase()) {
    case 'gold':   return { gold: amount, silver: 0, copper: 0 };
    case 'silver': return { gold: 0, silver: amount, copper: 0 };
    case 'copper': return { gold: 0, silver: 0, copper: amount };
    default: return null;
  }
}
```

---

### 2. `src/game/economy/ShopSystem.ts` — Shop Buy/Sell System

Implement shop interactions. Replicates legacy `do_buy()`, `do_sell()`, `do_list()`, `do_value()` from `shops.c`:

#### Shop Data Interfaces

```typescript
import { Currency, toCopper, canAfford, deductCost, formatCurrency, fromCopper, addCurrency } from './Currency';
import { Logger } from '../../utils/Logger';
import { EventBus, GameEvent } from '../../core/EventBus';
import { Character } from '../entities/Character';
import { GameObject } from '../entities/GameObject';
import { Mobile } from '../entities/Mobile';
import { sendToChar, actToRoom } from '../../network/ConnectionManager';
import { oneArgument, isName, numberArgument } from '../../utils/StringUtils';
import { colorize } from '../../utils/AnsiColors';
import { ItemType } from '../entities/types';

export interface ShopData {
  keeperVnum: number;
  buyTypes: number[];        // Up to 5 item types the shop accepts for purchase
  profitBuy: number;         // Markup percentage for buying (default 120)
  profitSell: number;        // Sell-back percentage for selling (default 90)
  openHour: number;          // Hour the shop opens (0–23)
  closeHour: number;         // Hour the shop closes (0–23)
}

export interface RepairShopData {
  keeperVnum: number;
  fixTypes: number[];        // Up to 3 repairable item types
  profitFix: number;         // Repair markup (default 1000 = 100%)
  shopType: 'fix' | 'recharge'; // Repair or recharge
  openHour: number;
  closeHour: number;
}
```

#### `findKeeper(ch)` — Locate the Shopkeeper NPC

Replicates legacy `find_keeper()` from `shops.c`:

1. Scan all characters in `ch.inRoom.people`.
2. Find the first NPC with `shopData !== null`.
3. If not found: `sendToChar(ch, "There is no shopkeeper here.\n")`. Return `null`.
4. Check shop hours against current game time:
   - Get current in-game hour from `TimeUtils.getGameTime()`.
   - If `currentHour < shopData.openHour`: Keeper says `"Sorry, I am closed. Come back later."`. Return `null`.
   - If `currentHour > shopData.closeHour`: Keeper says `"Sorry, I am closed. Come back tomorrow."`. Return `null`.
5. Return the keeper character and their `shopData`.

```typescript
function findKeeper(ch: Character): { keeper: Mobile; shop: ShopData } | null {
  if (!ch.inRoom) return null;

  for (const person of ch.inRoom.people) {
    if (!person.isNPC()) continue;
    const mob = person as Mobile;
    if (!mob.shopData) continue;

    // Check shop hours
    const gameHour = getGameHour();
    if (gameHour < mob.shopData.openHour) {
      interpretSay(mob, 'Sorry, I am closed. Come back later.');
      return null;
    }
    if (gameHour > mob.shopData.closeHour) {
      interpretSay(mob, 'Sorry, I am closed. Come back tomorrow.');
      return null;
    }

    return { keeper: mob, shop: mob.shopData };
  }

  sendToChar(ch, 'There is no shopkeeper here.\n');
  return null;
}
```

#### `shopBuyPrice(objCost, profitBuy, profitSell, buyerLevel, buyerCha, buyerRace)` — Buy Price Calculation

Replicates legacy `get_cost()` from `shops.c`:

```typescript
/**
 * Calculate the price a buyer must pay for an item.
 * Replicates legacy get_cost() for buy transactions.
 *
 * Formula:
 *   cost = baseCost * max(profitSell + 1, profitBuy + raceProfitMod) / 100
 *        * (80 + min(buyerLevel, LEVEL_AVATAR)) / 100
 *   CHA modifier: cost = cost * (100 - (buyerCha - 13) * 2) / 100
 *
 * LEVEL_AVATAR = 65 (max mortal level for price scaling).
 */
export function shopBuyPrice(
  objCostCopper: number,
  profitBuy: number,
  profitSell: number,
  buyerLevel: number,
  buyerCha: number,
  buyerRace: number
): number {
  const LEVEL_AVATAR = 65;
  const profitMod = getRaceProfitMod(buyerRace);

  let cost = Math.floor(
    objCostCopper * Math.max(profitSell + 1, profitBuy + profitMod) / 100
  );
  cost = Math.floor(cost * (80 + Math.min(buyerLevel, LEVEL_AVATAR)) / 100);

  // CHA modifier: higher charisma = lower price
  cost = Math.floor(cost * (100 - (buyerCha - 13) * 2) / 100);

  return Math.max(1, cost); // Minimum 1 copper
}
```

#### `shopSellPrice(objCost, profitBuy, profitSell, sellerCha, sellerRace)` — Sell Price Calculation

Replicates legacy `get_cost()` for sell transactions:

```typescript
/**
 * Calculate the price a seller receives for an item.
 * Replicates legacy get_cost() for sell transactions.
 *
 * Formula:
 *   cost = baseCost * min(profitBuy - 1, profitSell + raceProfitMod) / 100
 *   CHA modifier: cost = cost * (100 + (sellerCha - 13) * 2) / 100
 */
export function shopSellPrice(
  objCostCopper: number,
  profitBuy: number,
  profitSell: number,
  sellerCha: number,
  sellerRace: number
): number {
  const profitMod = getRaceProfitMod(sellerRace);

  let cost = Math.floor(
    objCostCopper * Math.min(profitBuy - 1, profitSell + profitMod) / 100
  );

  // CHA modifier: higher charisma = higher sell price
  cost = Math.floor(cost * (100 + (sellerCha - 13) * 2) / 100);

  return Math.max(1, cost); // Minimum 1 copper
}
```

#### Race Profit Modifiers

```typescript
/**
 * Legacy racial modifiers for shop prices.
 * Replicates race-based profit adjustments from shops.c.
 */
function getRaceProfitMod(race: number): number {
  switch (race) {
    case 1:  return -10; // Elf — better haggling
    case 2:  return 3;   // Dwarf — slightly worse
    case 3:  return -2;  // Halfling — slightly better
    case 4:  return -8;  // Pixie — good haggling
    case 6:  return 7;   // Half-orc — poor haggling
    default: return 0;   // Human, others — neutral
  }
}
```

#### `doList(ch, argument)` — List Shop Items

Replicates legacy `do_list()` from `shops.c`:

1. Call `findKeeper(ch)`. If null, return.
2. If argument provided, filter keeper inventory by keyword.
3. Iterate keeper's inventory (sorted by level, then name — shopkeeper inventories are insert-sorted):
   - Skip items not visible to buyer: `canSeeObj(ch, obj)`.
   - Calculate buy price for each item via `shopBuyPrice()`.
   - Format output in columns:

```typescript
export function doList(ch: Character, argument: string): void {
  const result = findKeeper(ch);
  if (!result) return;
  const { keeper, shop } = result;

  let [, keyword] = oneArgument(argument);
  const found: { obj: GameObject; cost: number }[] = [];

  for (const obj of keeper.inventory) {
    if (obj.wearLocation !== WearLocation.None) continue; // Skip equipped
    if (!canSeeObj(ch, obj)) continue;
    if (keyword && !isName(keyword, obj.name)) continue;

    const cost = shopBuyPrice(
      toCopper(obj.cost),
      shop.profitBuy,
      shop.profitSell,
      ch.level,
      ch.getCha(),
      ch.race
    );
    found.push({ obj, cost });
  }

  if (found.length === 0) {
    sendToChar(ch, 'You can\'t buy anything here.\n');
    return;
  }

  // Header
  sendToChar(ch, colorize('&W[Num] [ Level]  Price  Item\n'));
  sendToChar(ch, colorize('&w───── ──────── ────── ─────────────────────────────\n'));

  let num = 0;
  for (const { obj, cost } of found) {
    num++;
    const priceStr = formatCurrency(fromCopper(cost));
    const levelStr = String(obj.level).padStart(3);
    const numStr = String(num).padStart(3);
    sendToChar(ch, `[${numStr}] [Lvl ${levelStr}] ${priceStr.padEnd(20)} ${obj.shortDescription}\n`);
  }
}
```

#### `doBuy(ch, argument)` — Buy an Item

Replicates legacy `do_buy()` from `shops.c`:

1. Parse argument. If empty: `"Buy what?\n"`. Return.
2. Call `findKeeper(ch)`. If null, return.
3. Handle `numberArgument()` for `"2.sword"` targeting.
4. Find item in keeper's inventory by name: iterate keeper inventory, match by `isName()`.
5. If not found: Keeper says `"I don't sell that — try 'list'."`. Return.
6. Check level restriction: `obj.level > ch.level` → Keeper says `"You can't use that yet."`. Return.
7. Calculate buy price via `shopBuyPrice()`.
8. Check buyer can afford: `canAfford(ch.currency, cost)`. If not: Keeper says `"You can't afford it."`. Return.
9. Check buyer can carry (weight + count): `canCarry(ch, obj)`. If not: `"You can't carry that much.\n"`. Return.
10. Deduct currency from buyer: `ch.currency = deductCost(ch.currency, cost)`.
11. Transfer item: `objFromChar(obj)` (from keeper), `objToChar(obj, ch)` (to buyer).
12. Send messages:
    - To buyer: `"You buy ${obj.shortDescription} for ${formatCurrency(fromCopper(cost))}.\n"`
    - To room: `"$n buys $p."`
13. Emit `GameEvent.ShopBuy` with `{ buyerId: ch.id, keeperId: keeper.id, objectId: obj.id, cost }`.
14. Fire `BUY_PROG` on the object if defined.
15. **Shopkeeper restocking:** If the item was the last instance of its prototype (same vnum), schedule a restock:
    - After a delay (next area reset), create a new instance from `VnumRegistry.getObjPrototype(obj.protoVnum)`.
    - Insert into keeper's inventory sorted by level then name.

```typescript
export function doBuy(ch: Character, argument: string): void {
  if (!argument.trim()) {
    sendToChar(ch, 'Buy what?\n');
    return;
  }

  const result = findKeeper(ch);
  if (!result) return;
  const { keeper, shop } = result;

  const [count, name] = numberArgument(argument.trim());
  let num = 0;
  let targetObj: GameObject | null = null;

  for (const obj of keeper.inventory) {
    if (obj.wearLocation !== WearLocation.None) continue;
    if (!canSeeObj(ch, obj)) continue;
    if (isName(name, obj.name)) {
      num++;
      if (num === count) {
        targetObj = obj;
        break;
      }
    }
  }

  if (!targetObj) {
    interpretSay(keeper, "I don't sell that — try 'list'.");
    return;
  }

  if (targetObj.level > ch.level) {
    interpretSay(keeper, "You can't use that yet.");
    return;
  }

  const cost = shopBuyPrice(
    toCopper(targetObj.cost),
    shop.profitBuy,
    shop.profitSell,
    ch.level,
    ch.getCha(),
    ch.race
  );

  if (!canAfford(ch.currency, cost)) {
    interpretSay(keeper, "You can't afford it.");
    return;
  }

  if (!canCarry(ch, targetObj)) {
    sendToChar(ch, "You can't carry that much.\n");
    return;
  }

  // Transaction
  ch.currency = deductCost(ch.currency, cost);

  // Add gold to keeper (keeper wealth limit: keeper.level² × 50000)
  const keeperMaxGold = keeper.level * keeper.level * 50000;
  const keeperGoldCopper = toCopper(keeper.currency);
  if (keeperGoldCopper + cost <= keeperMaxGold) {
    keeper.currency = addCurrency(keeper.currency, fromCopper(cost));
  }
  // Excess goes to area economy pool (tracked in area.highEconomy)

  const protoVnum = targetObj.protoVnum;
  objFromChar(targetObj);   // Remove from keeper inventory
  objToChar(targetObj, ch); // Place in buyer inventory

  sendToChar(ch, `You buy ${targetObj.shortDescription} for ${formatCurrency(fromCopper(cost))}.\n`);
  actToRoom(ch, '$n buys $p.', targetObj);

  EventBus.emit(GameEvent.ShopBuy, {
    buyerId: ch.id,
    keeperId: keeper.id,
    objectId: targetObj.id,
    cost,
  });

  // Restock check: if keeper no longer has this prototype, flag for restock
  const hasProto = keeper.inventory.some(o => o.protoVnum === protoVnum);
  if (!hasProto) {
    scheduleRestock(keeper, protoVnum);
  }
}
```

#### `doSell(ch, argument)` — Sell an Item

Replicates legacy `do_sell()` from `shops.c`:

1. Parse argument. If empty: `"Sell what?\n"`. Return.
2. Call `findKeeper(ch)`. If null, return.
3. Find item in character's inventory: `getObjCarry(ch, arg)`.
4. If not found: `"You don't have that item.\n"`. Return.
5. Validate keeper accepts item type: check `obj.itemType` against `shop.buyTypes[]`.
   - If item type not in `buyTypes`: Keeper says `"I don't buy that type of merchandise."`. Return.
6. Check `ITEM_NODROP` flag: `"It's stuck to your hand!\n"`. Return.
7. Calculate sell price via `shopSellPrice()`.
8. If sell price <= 0: Keeper says `"That's worthless to me."`. Return.
9. Check keeper can afford: verify keeper has enough gold.
   - If keeper can't afford: Keeper says `"I can't afford to buy that right now."`. Return.
10. Deduct from keeper, add to seller:
    - `keeper.currency = deductCost(keeper.currency, sellPrice)`.
    - `ch.currency = addCurrency(ch.currency, fromCopper(sellPrice))`.
11. Transfer item: `objFromChar(obj)` (from seller), `objToChar(obj, keeper)` (to keeper).
12. Send messages:
    - To seller: `"You sell ${obj.shortDescription} for ${formatCurrency(fromCopper(sellPrice))}.\n"`
    - To room: `"$n sells $p."`
13. Emit `GameEvent.ShopSell` with `{ sellerId: ch.id, keeperId: keeper.id, objectId: obj.id, price: sellPrice }`.

```typescript
export function doSell(ch: Character, argument: string): void {
  if (!argument.trim()) {
    sendToChar(ch, 'Sell what?\n');
    return;
  }

  const result = findKeeper(ch);
  if (!result) return;
  const { keeper, shop } = result;

  const obj = getObjCarry(ch, argument.trim());
  if (!obj) {
    sendToChar(ch, "You don't have that item.\n");
    return;
  }

  // Check if keeper buys this item type
  if (!shop.buyTypes.includes(obj.itemType)) {
    interpretSay(keeper, "I don't buy that type of merchandise.");
    return;
  }

  // Check ITEM_NODROP
  if (hasFlag(obj.extraFlags, ITEM_NODROP)) {
    sendToChar(ch, "It's stuck to your hand!\n");
    return;
  }

  const sellPrice = shopSellPrice(
    toCopper(obj.cost),
    shop.profitBuy,
    shop.profitSell,
    ch.getCha(),
    ch.race
  );

  if (sellPrice <= 0) {
    interpretSay(keeper, "That's worthless to me.");
    return;
  }

  if (!canAfford(keeper.currency, sellPrice)) {
    interpretSay(keeper, "I can't afford to buy that right now.");
    return;
  }

  // Transaction
  keeper.currency = deductCost(keeper.currency, sellPrice);
  ch.currency = addCurrency(ch.currency, fromCopper(sellPrice));

  objFromChar(obj);
  objToChar(obj, keeper);

  sendToChar(ch, `You sell ${obj.shortDescription} for ${formatCurrency(fromCopper(sellPrice))}.\n`);
  actToRoom(ch, '$n sells $p.', obj);

  EventBus.emit(GameEvent.ShopSell, {
    sellerId: ch.id,
    keeperId: keeper.id,
    objectId: obj.id,
    price: sellPrice,
  });
}
```

#### `doValue(ch, argument)` — Appraise an Item

Replicates legacy `do_value()` from `shops.c`:

1. Parse argument. If empty: `"Value what?\n"`. Return.
2. Call `findKeeper(ch)`. If null, return.
3. Find item in inventory: `getObjCarry(ch, arg)`.
4. If not found: `"You don't have that item.\n"`. Return.
5. Check keeper buys this type: if not in `buyTypes`, Keeper says `"I don't buy that type."`. Return.
6. Calculate sell price via `shopSellPrice()`.
7. If price <= 0: Keeper says `"That's worthless to me."`. Return.
8. Keeper says: `"I'd give you ${formatCurrency(fromCopper(price))} for ${obj.shortDescription}."`.

```typescript
export function doValue(ch: Character, argument: string): void {
  if (!argument.trim()) {
    sendToChar(ch, 'Value what?\n');
    return;
  }

  const result = findKeeper(ch);
  if (!result) return;
  const { keeper, shop } = result;

  const obj = getObjCarry(ch, argument.trim());
  if (!obj) {
    sendToChar(ch, "You don't have that item.\n");
    return;
  }

  if (!shop.buyTypes.includes(obj.itemType)) {
    interpretSay(keeper, "I don't buy that type.");
    return;
  }

  const price = shopSellPrice(
    toCopper(obj.cost),
    shop.profitBuy,
    shop.profitSell,
    ch.getCha(),
    ch.race
  );

  if (price <= 0) {
    interpretSay(keeper, "That's worthless to me.");
    return;
  }

  interpretSay(keeper, `I'd give you ${formatCurrency(fromCopper(price))} for ${obj.shortDescription}.`);
}
```

#### Shopkeeper Restocking

```typescript
/**
 * Schedule a restock of a prototype in a keeper's inventory.
 * Called when the last instance of a prototype is sold.
 * Restock occurs on next area reset via ResetEngine.
 */
function scheduleRestock(keeper: Mobile, protoVnum: number): void {
  if (!keeper.restockList) {
    keeper.restockList = [];
  }
  if (!keeper.restockList.includes(protoVnum)) {
    keeper.restockList.push(protoVnum);
    Logger.debug('economy', `Shopkeeper ${keeper.name} queued restock for vnum ${protoVnum}`);
  }
}

/**
 * Process restocking for a keeper during area reset.
 * Called by ResetEngine after area resets.
 */
export function processRestock(keeper: Mobile): void {
  if (!keeper.restockList || keeper.restockList.length === 0) return;

  for (const vnum of keeper.restockList) {
    const proto = VnumRegistry.getObjPrototype(vnum);
    if (!proto) continue;

    // Only restock if keeper doesn't already have one
    const hasIt = keeper.inventory.some(o => o.protoVnum === vnum);
    if (hasIt) continue;

    const newObj = createObjectInstance(proto, proto.level);
    objToChar(newObj, keeper);
    Logger.debug('economy', `Restocked ${newObj.shortDescription} for ${keeper.name}`);
  }

  keeper.restockList = [];
}

/**
 * Sort keeper inventory by level (ascending) then short description (alphabetical).
 * Replicates legacy insert-sort for shopkeeper inventory.
 */
export function sortKeeperInventory(keeper: Mobile): void {
  keeper.inventory.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.shortDescription.localeCompare(b.shortDescription);
  });
}
```

---

### 3. `src/game/economy/ShopSystem.ts` — Repair Shop System (additions)

Implement repair shop interactions. Replicates legacy `do_repair()`, `do_repairall()`:

#### `doRepair(ch, argument)` — Repair an Item

Replicates legacy `do_repair()`:

1. Find repair keeper: same as `findKeeper()` but checks `repairShopData !== null`.
2. Find item in inventory: `getObjCarry(ch, arg)`.
3. Validate keeper can fix this item type: check against `repairShop.fixTypes[]`.
4. Calculate repair cost:
   - **Armor:** `cost = obj.cost * (obj.values[0] - obj.values[1]) / obj.values[0]` (ratio of max AC to current AC).
     - `values[0]` = max AC (original), `values[1]` = current AC.
   - **Weapon:** `cost = obj.cost * (obj.values[0] - obj.condition) / 12` (based on weapon condition 0-12).
   - **Wand/Staff:** `cost = obj.cost * (obj.values[1] - obj.values[2]) / obj.values[1]` (missing charges ratio).
     - `values[1]` = max charges, `values[2]` = current charges.
   - Apply `repairShop.profitFix / 100` markup.
5. If cost <= 0: Keeper says `"It doesn't need any repairs."`. Return.
6. Check buyer can afford.
7. Deduct cost. Apply repair:
   - Armor: `obj.values[1] = obj.values[0]`.
   - Weapon: `obj.condition = 12`.
   - Wand/Staff (recharge type): `obj.values[2] = obj.values[1]`.
8. Send: `"${keeper.shortDescription} repairs ${obj.shortDescription} for ${cost}.\n"`.

```typescript
export function doRepair(ch: Character, argument: string): void {
  if (!argument.trim()) {
    sendToChar(ch, 'Repair what?\n');
    return;
  }

  const result = findRepairKeeper(ch);
  if (!result) return;
  const { keeper, repairShop } = result;

  const obj = getObjCarry(ch, argument.trim());
  if (!obj) {
    sendToChar(ch, "You don't have that item.\n");
    return;
  }

  if (!repairShop.fixTypes.includes(obj.itemType)) {
    interpretSay(keeper, "I can't fix that type of item.");
    return;
  }

  const baseCost = calculateRepairCost(obj, repairShop);
  if (baseCost <= 0) {
    interpretSay(keeper, "It doesn't need any repairs.");
    return;
  }

  if (!canAfford(ch.currency, baseCost)) {
    interpretSay(keeper, "You can't afford that repair.");
    return;
  }

  ch.currency = deductCost(ch.currency, baseCost);
  applyRepair(obj, repairShop.shopType);

  sendToChar(ch, `${keeper.shortDescription} repairs ${obj.shortDescription} for ${formatCurrency(fromCopper(baseCost))}.\n`);
  actToRoom(ch, '$n gets $p repaired.', obj);
}
```

#### `doRepairAll(ch, argument)` — Repair All Damaged Items

1. Find repair keeper.
2. Iterate inventory. For each repairable item:
   - Calculate cost. Add 10% surcharge: `cost = Math.floor(cost * 1.10)`.
   - Sum total cost.
3. If total cost > 0 and character can afford:
   - Deduct total. Repair all items.
   - Show summary.
4. If nothing needs repair: `"None of your items need repairs.\n"`.

```typescript
function calculateRepairCost(obj: GameObject, repairShop: RepairShopData): number {
  const objCostCopper = toCopper(obj.cost);
  let cost = 0;

  switch (obj.itemType) {
    case ItemType.Armor:
      if (obj.values[0] <= 0) return 0; // No max AC
      cost = Math.floor(objCostCopper * (obj.values[0] - obj.values[1]) / obj.values[0]);
      break;
    case ItemType.Weapon:
      if (obj.condition >= 12) return 0; // Already perfect
      cost = Math.floor(objCostCopper * (12 - obj.condition) / 12);
      break;
    case ItemType.Wand:
    case ItemType.Staff:
      if (obj.values[1] <= 0) return 0;
      cost = Math.floor(objCostCopper * (obj.values[1] - obj.values[2]) / obj.values[1]);
      break;
    default:
      return 0;
  }

  // Apply profit markup
  cost = Math.floor(cost * repairShop.profitFix / 100);
  return Math.max(0, cost);
}

function applyRepair(obj: GameObject, shopType: 'fix' | 'recharge'): void {
  switch (obj.itemType) {
    case ItemType.Armor:
      obj.values[1] = obj.values[0]; // Restore to max AC
      break;
    case ItemType.Weapon:
      obj.condition = 12; // Perfect condition
      break;
    case ItemType.Wand:
    case ItemType.Staff:
      if (shopType === 'recharge') {
        obj.values[2] = obj.values[1]; // Restore to max charges
      } else {
        obj.condition = 12; // Fix physical condition
      }
      break;
  }
}
```

---

### 4. `src/game/economy/AuctionSystem.ts` — Global Auction System

Implement the global auction system. Replicates legacy `auction_update()` from `auction.c`:

#### Auction State

```typescript
import { Currency, toCopper, canAfford, deductCost, addCurrency, formatCurrency, fromCopper } from './Currency';
import { Character } from '../entities/Character';
import { GameObject } from '../entities/GameObject';
import { EventBus, GameEvent } from '../../core/EventBus';
import { Logger } from '../../utils/Logger';
import { sendToChar, sendToAll } from '../../network/ConnectionManager';
import { objFromChar, objToChar, extractObj } from '../commands/objects';
import { oneArgument } from '../../utils/StringUtils';

interface AuctionData {
  item: GameObject | null;
  seller: Character | null;
  bidder: Character | null;
  currentBid: number;      // In copper
  startingBid: number;     // In copper
  round: number;           // 0 = not started, 1–3 = going once/twice/sold
  pulseTimer: number;      // Pulses until next round
}

const AUCTION_MINIMUM_INCREMENT = 100; // Minimum bid increment (1 silver in copper)
const AUCTION_ROUND_PULSES = 36;       // PULSE_AUCTION = 36 (9 seconds per round)
const AUCTION_MAX_ROUNDS = 3;

const auctionState: AuctionData = {
  item: null,
  seller: null,
  bidder: null,
  currentBid: 0,
  startingBid: 0,
  round: 0,
  pulseTimer: 0,
};
```

#### `doAuction(ch, argument)` — Auction Commands

Replicates legacy `do_auction()`:

```typescript
export function doAuction(ch: Character, argument: string): void {
  if (!argument.trim()) {
    // Show current auction status
    if (!auctionState.item) {
      sendToChar(ch, 'There is no auction in progress.\n');
      return;
    }
    showAuctionStatus(ch);
    return;
  }

  const [first, rest] = oneArgument(argument);

  switch (first.toLowerCase()) {
    case 'stop':
      doAuctionStop(ch);
      break;
    case 'bid':
      doAuctionBid(ch, rest);
      break;
    default:
      // Treat as: auction <item> [starting bid]
      doAuctionStart(ch, first, rest);
      break;
  }
}
```

#### `doAuctionStart(ch, itemArg, bidArg)` — Start an Auction

1. If auction already in progress: `"There is already an auction going on.\n"`. Return.
2. Find item in inventory: `getObjCarry(ch, itemArg)`.
3. If not found: `"You don't have that item.\n"`. Return.
4. Parse starting bid: `parseInt(bidArg) || 100`. Minimum 100 copper (1 silver).
5. Check `ITEM_NODROP`: `"You can't auction that!\n"`. Return.
6. Remove item from inventory: `objFromChar(obj)`.
7. Set auction state:
   ```
   auctionState.item = obj;
   auctionState.seller = ch;
   auctionState.bidder = null;
   auctionState.currentBid = startingBid;
   auctionState.startingBid = startingBid;
   auctionState.round = 1;
   auctionState.pulseTimer = AUCTION_ROUND_PULSES;
   ```
8. Broadcast: `"${ch.name} auctions ${obj.shortDescription} for a starting bid of ${formatCurrency(fromCopper(startingBid))}."`.
9. Emit `GameEvent.AuctionStart`.

```typescript
function doAuctionStart(ch: Character, itemArg: string, bidArg: string): void {
  if (auctionState.item) {
    sendToChar(ch, 'There is already an auction going on.\n');
    return;
  }

  const obj = getObjCarry(ch, itemArg);
  if (!obj) {
    sendToChar(ch, "You don't have that item.\n");
    return;
  }

  if (hasFlag(obj.extraFlags, ITEM_NODROP)) {
    sendToChar(ch, "You can't auction that!\n");
    return;
  }

  const startingBid = Math.max(100, parseInt(bidArg, 10) || 100);

  objFromChar(obj);
  auctionState.item = obj;
  auctionState.seller = ch;
  auctionState.bidder = null;
  auctionState.currentBid = startingBid;
  auctionState.startingBid = startingBid;
  auctionState.round = 1;
  auctionState.pulseTimer = AUCTION_ROUND_PULSES;

  sendToAll(
    `${ch.name} auctions ${obj.shortDescription} for a starting bid of ${formatCurrency(fromCopper(startingBid))}.\n`
  );

  EventBus.emit(GameEvent.AuctionStart, {
    sellerId: ch.id,
    objectId: obj.id,
    startingBid,
  });
}
```

#### `doAuctionBid(ch, amountArg)` — Place a Bid

1. If no auction in progress: `"There is no auction to bid on.\n"`. Return.
2. If bidder is the seller: `"You can't bid on your own item.\n"`. Return.
3. Parse bid amount: `parseInt(amountArg)`. Must be in copper.
4. If bid <= current bid: `"You must bid at least ${currentBid + AUCTION_MINIMUM_INCREMENT} copper.\n"`. Return.
5. Check bidder can afford: `canAfford(ch.currency, bid)`.
6. Update auction state:
   - `auctionState.bidder = ch`
   - `auctionState.currentBid = bid`
   - Reset round timer: `auctionState.pulseTimer = AUCTION_ROUND_PULSES`
7. Broadcast: `"${ch.name} bids ${formatCurrency(fromCopper(bid))} on ${item.shortDescription}."`.

```typescript
function doAuctionBid(ch: Character, amountArg: string): void {
  if (!auctionState.item) {
    sendToChar(ch, 'There is no auction to bid on.\n');
    return;
  }

  if (ch === auctionState.seller) {
    sendToChar(ch, "You can't bid on your own item.\n");
    return;
  }

  const bid = parseInt(amountArg, 10);
  if (isNaN(bid) || bid < auctionState.currentBid + AUCTION_MINIMUM_INCREMENT) {
    sendToChar(ch, `You must bid at least ${formatCurrency(fromCopper(auctionState.currentBid + AUCTION_MINIMUM_INCREMENT))}.\n`);
    return;
  }

  if (!canAfford(ch.currency, bid)) {
    sendToChar(ch, "You can't afford that bid.\n");
    return;
  }

  auctionState.bidder = ch;
  auctionState.currentBid = bid;
  auctionState.pulseTimer = AUCTION_ROUND_PULSES;

  sendToAll(
    `${ch.name} bids ${formatCurrency(fromCopper(bid))} on ${auctionState.item.shortDescription}.\n`
  );
}
```

#### `doAuctionStop(ch)` — Cancel Auction

1. If no auction: `"There is no auction to stop.\n"`. Return.
2. Only seller or immortal can stop: `ch !== auctionState.seller && ch.trust < LEVEL_IMMORTAL` → `"You can't stop someone else's auction.\n"`. Return.
3. Return item to seller: `objToChar(auctionState.item, auctionState.seller)`.
4. Broadcast: `"The auction of ${item.shortDescription} has been cancelled."`.
5. Reset auction state.

```typescript
function doAuctionStop(ch: Character): void {
  if (!auctionState.item) {
    sendToChar(ch, 'There is no auction to stop.\n');
    return;
  }

  if (ch !== auctionState.seller && ch.trust < LEVEL_IMMORTAL) {
    sendToChar(ch, "You can't stop someone else's auction.\n");
    return;
  }

  const item = auctionState.item;
  const seller = auctionState.seller;

  if (seller && item) {
    objToChar(item, seller);
  }

  sendToAll(`The auction of ${item?.shortDescription ?? 'an item'} has been cancelled.\n`);

  resetAuction();
}
```

#### `auctionUpdate()` — Auction Tick Processing

Called every `PULSE_AUCTION` (36 pulses = 9 seconds) by the `TickEngine`:

```typescript
/**
 * Process auction timer. Called every PULSE_AUCTION.
 * Replicates legacy auction_update() from auction.c.
 *
 * Three rounds:
 *   Round 1: "Going once..."
 *   Round 2: "Going twice..."
 *   Round 3: "SOLD!" or "No bidders — item returned."
 */
export function auctionUpdate(): void {
  if (!auctionState.item) return;

  auctionState.pulseTimer--;
  if (auctionState.pulseTimer > 0) return;

  // Round expired — advance
  switch (auctionState.round) {
    case 1:
      sendToAll(
        `${auctionState.item.shortDescription}: going once for ${formatCurrency(fromCopper(auctionState.currentBid))}...\n`
      );
      auctionState.round = 2;
      auctionState.pulseTimer = AUCTION_ROUND_PULSES;
      break;

    case 2:
      sendToAll(
        `${auctionState.item.shortDescription}: going twice for ${formatCurrency(fromCopper(auctionState.currentBid))}...\n`
      );
      auctionState.round = 3;
      auctionState.pulseTimer = AUCTION_ROUND_PULSES;
      break;

    case 3:
      if (auctionState.bidder) {
        // SOLD!
        completeAuction();
      } else {
        // No bidders — return to seller
        returnItemToSeller();
      }
      break;
  }
}

function completeAuction(): void {
  const { item, seller, bidder, currentBid } = auctionState;
  if (!item || !seller || !bidder) return;

  // Deduct from bidder
  bidder.currency = deductCost(bidder.currency, currentBid);

  // Pay seller
  seller.currency = addCurrency(seller.currency, fromCopper(currentBid));

  // Transfer item to winner
  objToChar(item, bidder);

  sendToAll(
    `SOLD! ${item.shortDescription} to ${bidder.name} for ${formatCurrency(fromCopper(currentBid))}!\n`
  );

  EventBus.emit(GameEvent.AuctionSold, {
    sellerId: seller.id,
    bidderId: bidder.id,
    objectId: item.id,
    price: currentBid,
  });

  Logger.info('economy', `Auction complete: ${item.shortDescription} sold to ${bidder.name} for ${currentBid}cp`);

  resetAuction();
}

function returnItemToSeller(): void {
  const { item, seller } = auctionState;
  if (!item || !seller) {
    // Seller disconnected — extract item
    if (item) extractObj(item);
    resetAuction();
    return;
  }

  objToChar(item, seller);
  sendToAll(`No bidders for ${item.shortDescription} — item returned to ${seller.name}.\n`);

  EventBus.emit(GameEvent.AuctionExpired, {
    sellerId: seller.id,
    objectId: item.id,
  });

  resetAuction();
}

function resetAuction(): void {
  auctionState.item = null;
  auctionState.seller = null;
  auctionState.bidder = null;
  auctionState.currentBid = 0;
  auctionState.startingBid = 0;
  auctionState.round = 0;
  auctionState.pulseTimer = 0;
}

function showAuctionStatus(ch: Character): void {
  if (!auctionState.item) {
    sendToChar(ch, 'There is no auction in progress.\n');
    return;
  }
  sendToChar(ch,
    `Current auction: ${auctionState.item.shortDescription}\n` +
    `Seller: ${auctionState.seller?.name ?? 'Unknown'}\n` +
    `Current bid: ${formatCurrency(fromCopper(auctionState.currentBid))}` +
    (auctionState.bidder ? ` by ${auctionState.bidder.name}` : ' (no bids yet)') +
    `\nRound: ${auctionState.round} of 3\n`
  );
}
```

Wire into `TickEngine`:
```typescript
// In main.ts or TickEngine setup
EventBus.on(GameEvent.AuctionTick, () => {
  auctionUpdate();
});
```

---

### 5. `src/game/economy/BankSystem.ts` — Banking System

Implement bank deposit/withdraw/balance/transfer. Replicates legacy `bank.c`:

#### Bank Data

```typescript
import { Currency, toCopper, canAfford, deductCost, addCurrency, formatCurrency, fromCopper, parseCurrencyArg } from './Currency';
import { Character } from '../entities/Character';
import { Player } from '../entities/Player';
import { sendToChar } from '../../network/ConnectionManager';
import { oneArgument } from '../../utils/StringUtils';
import { Logger } from '../../utils/Logger';
import { ACT_BANKER } from '../entities/constants';
import { hasFlag } from '../../utils/BitVector';

/**
 * Bank balance stored in player.pcData:
 *   bankGold: number
 *   bankSilver: number
 *   bankCopper: number
 */
```

#### `findBanker(ch)` — Locate Banker NPC

```typescript
function findBanker(ch: Character): Character | null {
  if (!ch.inRoom) return null;

  for (const person of ch.inRoom.people) {
    if (!person.isNPC()) continue;
    if (hasFlag(person.actFlags, ACT_BANKER)) {
      return person;
    }
  }

  sendToChar(ch, 'You are not in a bank.\n');
  return null;
}
```

#### `doBank(ch, argument)` — Bank Command Dispatcher

```typescript
export function doBank(ch: Character, argument: string): void {
  if (ch.isNPC()) {
    sendToChar(ch, "NPCs don't have bank accounts.\n");
    return;
  }

  const banker = findBanker(ch);
  if (!banker) return;

  const [subcmd, rest] = oneArgument(argument);

  switch (subcmd.toLowerCase()) {
    case 'deposit':
      doBankDeposit(ch as Player, rest);
      break;
    case 'withdraw':
      doBankWithdraw(ch as Player, rest);
      break;
    case 'balance':
      doBankBalance(ch as Player);
      break;
    case 'transfer':
      doBankTransfer(ch as Player, rest);
      break;
    default:
      sendToChar(ch, 'Bank commands: deposit, withdraw, balance, transfer.\n');
      break;
  }
}
```

#### `doBankDeposit(ch, argument)` — Deposit Currency

Replicates legacy bank deposit from `bank.c`:

1. Parse `<amount> <gold|silver|copper>`.
2. Validate amount > 0.
3. Check character has enough carried currency.
4. Deduct from carried. Add to bank balance.
5. Send: `"You deposit ${amount} ${type}. Your balance is now ${balance}.\n"`.

```typescript
function doBankDeposit(ch: Player, argument: string): void {
  const [amountStr, rest] = oneArgument(argument);
  const [typeStr] = oneArgument(rest);

  if (!amountStr || !typeStr) {
    sendToChar(ch, 'Syntax: deposit <amount> <gold|silver|copper>\n');
    return;
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    sendToChar(ch, 'You must deposit a positive amount.\n');
    return;
  }

  const depositCurrency = parseCurrencyArg(amountStr, typeStr);
  if (!depositCurrency) {
    sendToChar(ch, 'Syntax: deposit <amount> <gold|silver|copper>\n');
    return;
  }

  const depositCopper = toCopper(depositCurrency);
  if (!canAfford(ch.currency, depositCopper)) {
    sendToChar(ch, "You don't have that much.\n");
    return;
  }

  // Deduct from carried
  ch.currency = deductCost(ch.currency, depositCopper);

  // Add to bank
  ch.pcData.bankBalance = addCurrency(ch.pcData.bankBalance, depositCurrency);

  sendToChar(ch,
    `You deposit ${amount} ${typeStr}.\n` +
    `Your bank balance is now ${formatCurrency(ch.pcData.bankBalance)}.\n`
  );

  Logger.debug('economy', `${ch.name} deposited ${amount} ${typeStr}`);
}
```

#### `doBankWithdraw(ch, argument)` — Withdraw Currency

Replicates legacy bank withdraw from `bank.c`:

1. Parse `<amount> <gold|silver|copper>`.
2. Validate amount > 0.
3. Check bank balance has enough.
4. Deduct from bank. Add to carried.
5. Send: `"You withdraw ${amount} ${type}. Your balance is now ${balance}.\n"`.

```typescript
function doBankWithdraw(ch: Player, argument: string): void {
  const [amountStr, rest] = oneArgument(argument);
  const [typeStr] = oneArgument(rest);

  if (!amountStr || !typeStr) {
    sendToChar(ch, 'Syntax: withdraw <amount> <gold|silver|copper>\n');
    return;
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    sendToChar(ch, 'You must withdraw a positive amount.\n');
    return;
  }

  const withdrawCurrency = parseCurrencyArg(amountStr, typeStr);
  if (!withdrawCurrency) {
    sendToChar(ch, 'Syntax: withdraw <amount> <gold|silver|copper>\n');
    return;
  }

  const withdrawCopper = toCopper(withdrawCurrency);
  if (!canAfford(ch.pcData.bankBalance, withdrawCopper)) {
    sendToChar(ch, "You don't have that much in the bank.\n");
    return;
  }

  // Deduct from bank
  ch.pcData.bankBalance = deductCost(ch.pcData.bankBalance, withdrawCopper);

  // Add to carried
  ch.currency = addCurrency(ch.currency, withdrawCurrency);

  sendToChar(ch,
    `You withdraw ${amount} ${typeStr}.\n` +
    `Your bank balance is now ${formatCurrency(ch.pcData.bankBalance)}.\n`
  );

  Logger.debug('economy', `${ch.name} withdrew ${amount} ${typeStr}`);
}
```

#### `doBankBalance(ch)` — Check Balance

```typescript
function doBankBalance(ch: Player): void {
  sendToChar(ch, `Your bank balance is ${formatCurrency(ch.pcData.bankBalance)}.\n`);
}
```

#### `doBankTransfer(ch, argument)` — Transfer Between Accounts

Replicates legacy bank transfer from `bank.c`:

1. Parse `<amount> <gold|silver|copper> <player>`.
2. Validate amount > 0.
3. Find target player (online): `getCharWorld(ch, playerName)`. Must be a PC.
4. Check sender's bank balance.
5. Deduct from sender's bank. Add to target's bank.
6. Send to sender: `"You transfer ${amount} ${type} to ${target.name}'s account.\n"`.
7. Send to target: `"${ch.name} has transferred ${amount} ${type} to your bank account.\n"`.

```typescript
function doBankTransfer(ch: Player, argument: string): void {
  const [amountStr, rest1] = oneArgument(argument);
  const [typeStr, rest2] = oneArgument(rest1);
  const [targetName] = oneArgument(rest2);

  if (!amountStr || !typeStr || !targetName) {
    sendToChar(ch, 'Syntax: transfer <amount> <gold|silver|copper> <player>\n');
    return;
  }

  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    sendToChar(ch, 'You must transfer a positive amount.\n');
    return;
  }

  const transferCurrency = parseCurrencyArg(amountStr, typeStr);
  if (!transferCurrency) {
    sendToChar(ch, 'Syntax: transfer <amount> <gold|silver|copper> <player>\n');
    return;
  }

  const target = getCharWorld(ch, targetName);
  if (!target || target.isNPC()) {
    sendToChar(ch, 'That player is not online.\n');
    return;
  }

  const targetPlayer = target as Player;
  const transferCopper = toCopper(transferCurrency);

  if (!canAfford(ch.pcData.bankBalance, transferCopper)) {
    sendToChar(ch, "You don't have that much in the bank.\n");
    return;
  }

  // Deduct from sender's bank
  ch.pcData.bankBalance = deductCost(ch.pcData.bankBalance, transferCopper);

  // Add to target's bank
  targetPlayer.pcData.bankBalance = addCurrency(targetPlayer.pcData.bankBalance, transferCurrency);

  sendToChar(ch, `You transfer ${amount} ${typeStr} to ${target.name}'s account.\n`);
  sendToChar(target, `${ch.name} has transferred ${amount} ${typeStr} to your bank account.\n`);

  Logger.info('economy', `${ch.name} transferred ${amount} ${typeStr} to ${target.name}`);
}
```

---

### 6. Shopkeeper NPC Integration

Add shop data fields to the `Mobile` entity class (additions to `src/game/entities/Mobile.ts`):

```typescript
// In Mobile class (additions only — do not overwrite existing Mobile code)

/** Shop data — set when this NPC is a shopkeeper. Loaded from area shops.json. */
shopData: ShopData | null = null;

/** Repair shop data — set when this NPC is a repair shopkeeper. */
repairShopData: RepairShopData | null = null;

/** Queue of prototype vnums to restock on next area reset. */
restockList: number[] = [];
```

#### Loading Shop Data from Area JSON

In `AreaManager.loadArea()` or during area post-processing, after mobiles are loaded:

```typescript
/**
 * Associate shop data with keeper mobiles.
 * Called during area loading after all mobiles are registered.
 * Reads shops.json and links ShopData to the corresponding mob prototype.
 */
function loadShopData(area: Area, shopsJson: any[]): void {
  for (const shopEntry of shopsJson) {
    const mobProto = VnumRegistry.getMobPrototype(shopEntry.keeperVnum);
    if (!mobProto) {
      Logger.warn('economy', `Shop keeper vnum ${shopEntry.keeperVnum} not found in area ${area.name}`);
      continue;
    }
    mobProto.shopData = {
      keeperVnum: shopEntry.keeperVnum,
      buyTypes: shopEntry.buyTypes || [],
      profitBuy: shopEntry.profitBuy ?? 120,
      profitSell: shopEntry.profitSell ?? 90,
      openHour: shopEntry.openHour ?? 0,
      closeHour: shopEntry.closeHour ?? 23,
    };
    Logger.debug('economy', `Loaded shop for keeper vnum ${shopEntry.keeperVnum} in ${area.name}`);
  }
}

/**
 * Associate repair shop data with keeper mobiles.
 */
function loadRepairShopData(area: Area, repairShopsJson: any[]): void {
  for (const entry of repairShopsJson) {
    const mobProto = VnumRegistry.getMobPrototype(entry.keeperVnum);
    if (!mobProto) {
      Logger.warn('economy', `Repair shop keeper vnum ${entry.keeperVnum} not found in area ${area.name}`);
      continue;
    }
    mobProto.repairShopData = {
      keeperVnum: entry.keeperVnum,
      fixTypes: entry.fixTypes || [],
      profitFix: entry.profitFix ?? 1000,
      shopType: entry.shopType === 'recharge' ? 'recharge' : 'fix',
      openHour: entry.openHour ?? 0,
      closeHour: entry.closeHour ?? 23,
    };
  }
}
```

---

### 7. Keeper Say Helper

```typescript
/**
 * Make a keeper NPC "say" something to the room.
 * Replicates legacy shopkeeper communication in shops.c.
 */
function interpretSay(keeper: Character, message: string): void {
  const room = keeper.inRoom;
  if (!room) return;
  for (const person of room.people) {
    if (person === keeper) continue;
    sendToChar(person, `${keeper.shortDescription} says '${message}'\n`);
  }
}
```

---

## Command Registration

Register all economy commands in `CommandRegistry`:

```typescript
registerCommand({
  name: 'buy',       handler: doBuy,       position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'sell',      handler: doSell,      position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'list',      handler: doList,      position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'value',     handler: doValue,     position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'repair',    handler: doRepair,    position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'auction',   handler: doAuction,   position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'bid',       handler: (ch, arg) => doAuction(ch, `bid ${arg}`), position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'deposit',   handler: (ch, arg) => doBank(ch, `deposit ${arg}`), position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'withdraw',  handler: (ch, arg) => doBank(ch, `withdraw ${arg}`), position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'balance',   handler: (ch, _arg) => doBank(ch, 'balance'),       position: Position.Standing,  trust: 0,  log: LogAction.Normal });
registerCommand({
  name: 'bank',      handler: doBank,      position: Position.Standing,  trust: 0,  log: LogAction.Normal });
```

---

## EventBus Events

Add the following events to `GameEvent` enum in `src/core/EventBus.ts`:

```typescript
// Economy events
ShopBuy        = 'economy:shopBuy',
ShopSell       = 'economy:shopSell',
AuctionStart   = 'economy:auctionStart',
AuctionBid     = 'economy:auctionBid',
AuctionSold    = 'economy:auctionSold',
AuctionExpired = 'economy:auctionExpired',
AuctionTick    = 'economy:auctionTick',
BankDeposit    = 'economy:bankDeposit',
BankWithdraw   = 'economy:bankWithdraw',
BankTransfer   = 'economy:bankTransfer',
```

---

## Tests for Sub-Phase 3M

- `tests/unit/economy/Currency.test.ts` — Currency system tests:
  - `toCopper({ gold: 1, silver: 1, copper: 1 })` → 10101.
  - `toCopper({ gold: 0, silver: 0, copper: 0 })` → 0.
  - `normalizeCurrency({ gold: 0, silver: 0, copper: 10101 })` → `{ gold: 1, silver: 1, copper: 1 }`.
  - `normalizeCurrency({ gold: 0, silver: 150, copper: 50 })` → `{ gold: 1, silver: 50, copper: 50 }`.
  - `canAfford({ gold: 1, silver: 0, copper: 0 }, 10000)` → true.
  - `canAfford({ gold: 0, silver: 99, copper: 99 }, 10000)` → false.
  - `deductCost({ gold: 2, silver: 0, copper: 0 }, 10001)` → `{ gold: 0, silver: 99, copper: 99 }`.
  - `addCurrency()` normalizes result.
  - `subtractCurrency()` handles underflow to 0.
  - `formatCurrency({ gold: 3, silver: 2, copper: 15 })` → "3 gold, 2 silver, 15 copper".
  - `formatCurrency({ gold: 0, silver: 0, copper: 0 })` → "0 copper".
  - Round-trip: `fromCopper(toCopper(c))` equals `normalizeCurrency(c)` for any valid input.

- `tests/unit/economy/ShopSystem.test.ts` — Shop buy/sell tests:
  - `shopBuyPrice()` with default profits (120/90): verify markup is ~120%.
  - `shopBuyPrice()` with Elf race (race=1): verify 10% discount applied.
  - `shopBuyPrice()` with Half-orc race (race=6): verify 7% surcharge.
  - `shopBuyPrice()` with high CHA (18): lower price than CHA 8.
  - `shopSellPrice()` returns less than buy price for same item.
  - `shopSellPrice()` with high CHA: higher sell price.
  - `findKeeper()` returns null when no NPC with shopData in room.
  - `findKeeper()` returns null when shop is closed (outside hours).
  - `doList()` shows items with correct prices.
  - `doBuy()` deducts correct gold, transfers item.
  - `doBuy()` rejects when can't afford.
  - `doBuy()` rejects when level too low.
  - `doSell()` pays correct gold, transfers item to keeper.
  - `doSell()` rejects item types not in buyTypes.
  - `doValue()` shows correct appraisal price.
  - Repair shop: `calculateRepairCost()` for armor with half AC → 50% of item cost.
  - Repair shop: `doRepair()` restores armor to full AC.
  - Repair shop: wand recharge restores charges.

- `tests/unit/economy/AuctionSystem.test.ts` — Auction lifecycle tests:
  - Start auction → verify state set, broadcast sent.
  - Bid on auction → verify bid recorded, broadcast sent.
  - Bid below minimum → rejected.
  - Bid on own auction → rejected.
  - Three rounds with no bids → item returned to seller.
  - Three rounds with bid → item transferred to winner, gold deducted/paid.
  - Cancel auction → item returned to seller.
  - Cancel by non-seller non-immortal → rejected.
  - Auction status display shows current state.

- `tests/unit/economy/BankSystem.test.ts` — Bank tests:
  - `deposit 100 gold` → gold deducted from carried, added to bank balance.
  - `withdraw 50 gold` → gold moved from bank to carried.
  - `withdraw` more than balance → rejected.
  - `deposit` more than carried → rejected.
  - `balance` → shows correct bank balance.
  - `transfer 100 gold playerB` → deducted from sender bank, added to target bank.
  - Transfer to offline player → rejected.
  - Transfer to NPC → rejected.
  - No banker in room → "You are not in a bank."

- `tests/integration/ShopTransaction.test.ts` — Full shop flow integration:
  - Create room with shopkeeper NPC. Load shop data.
  - `list` → shows items.
  - `buy sword` → gold deducted, sword in buyer inventory.
  - `sell sword` back → gold received (less than buy price), sword in keeper inventory.
  - `value sword` → shows sell price.
  - Full auction flow: start → bid → 3 rounds → sold → verify currency and item transfer.
  - Full bank flow: deposit → balance → withdraw → verify carried and bank amounts.

---

## Acceptance Criteria

- [ ] `Currency.toCopper()` converts correctly: 1 gold = 10000 copper, 1 silver = 100 copper.
- [ ] `normalizeCurrency()` promotes excess copper/silver correctly.
- [ ] `canAfford()` and `deductCost()` work correctly for all denominations.
- [ ] `formatCurrency()` produces readable output with only non-zero denominations.
- [ ] `shopBuyPrice()` matches legacy `get_cost()` formula exactly, including race and CHA modifiers.
- [ ] `shopSellPrice()` returns correct sell-back values, always less than buy price.
- [ ] `findKeeper()` correctly locates NPC shopkeepers and enforces shop hours.
- [ ] `doList()` shows items with accurate prices in formatted columns.
- [ ] `doBuy()` deducts correct currency, transfers item, shopkeeper restocks after area reset.
- [ ] `doSell()` pays correct currency, validates item type against `buyTypes[]`, checks keeper gold.
- [ ] `doValue()` reports accurate appraisal matching `shopSellPrice()`.
- [ ] Repair shop correctly calculates cost based on item damage/missing charges.
- [ ] `doRepair()` restores armor AC, weapon condition, or wand charges.
- [ ] Auction lifecycle: start → bid → three rounds → sold (or returned if no bids).
- [ ] Auction bid validation: minimum increment, can't bid on own, must afford.
- [ ] Auction cancel works for seller and immortals only.
- [ ] `auctionUpdate()` advances rounds on `PULSE_AUCTION` timing.
- [ ] Bank deposit/withdraw correctly moves currency between carried and bank balance.
- [ ] Bank transfer moves currency between player accounts.
- [ ] Banker NPC (`ACT_BANKER`) required in room for all bank operations.
- [ ] All EventBus events emitted at correct hook points.
- [ ] All Vitest tests pass. `npx vitest run` exits with code 0.
- [ ] `npx tsc --noEmit` produces zero errors.
