/**
 * economy.ts – Register all economy-related commands.
 *
 * Commands: list, buy, sell, value, repair, auction, bid, bank
 */

import type { CommandRegistry } from './CommandRegistry.js';
import { CommandLogLevel, defaultCommandFlags } from './CommandRegistry.js';
import { Position } from '../entities/types.js';
import { doList, doBuy, doSell, doValue, doRepair } from '../economy/ShopSystem.js';
import { doAuction, doBid } from '../economy/AuctionSystem.js';
import { doBank } from '../economy/BankSystem.js';

/** Register all economy commands with the given registry. */
export function registerEconomyCommands(registry: CommandRegistry): void {
  const defs = [
    { name: 'list',    handler: doList,    minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'buy',     handler: doBuy,     minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'sell',    handler: doSell,    minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'value',   handler: doValue,   minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'repair',  handler: doRepair,  minPosition: Position.Resting,  minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'auction', handler: (ch: any, arg: string) => doAuction(ch, arg), minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'bid',     handler: (ch: any, arg: string) => doBid(ch, arg),     minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
    { name: 'bank',    handler: doBank,    minPosition: Position.Standing, minTrust: 0, logLevel: CommandLogLevel.Normal },
  ];

  for (const cmd of defs) {
    registry.register({
      ...cmd,
      flags: defaultCommandFlags(),
      useCount: 0,
      lagCount: 0,
    });
  }
}
