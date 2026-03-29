/**
 * BankSystem.ts – Banking system for SMAUG 2.0.
 *
 * Supports deposit, withdraw, balance, and transfer operations.
 * Requires a banker NPC in the room (ACT_BANKER flag or specific vnum).
 */

import type { Character } from '../entities/Character.js';
import type { Player } from '../entities/Player.js';
import type { Room } from '../entities/Room.js';
import { Mobile } from '../entities/Mobile.js';
import { ACT } from '../entities/types.js';
import { formatCurrency, normalizeCurrency } from './Currency.js';
import { Logger } from '../../utils/Logger.js';

const logger = new Logger();

// =============================================================================
// Helpers
// =============================================================================

/** Find a banker NPC in the room. */
export function findBanker(room: Room): Mobile | null {
  const mobiles = room.getMobiles() as Mobile[];
  for (const mob of mobiles) {
    if ((mob.actFlags & ACT.BANKER) !== 0n) {
      return mob;
    }
  }
  return null;
}

/** Parse a currency type string. Returns 'gold' | 'silver' | 'copper' | null. */
function parseCurrencyType(str: string): 'gold' | 'silver' | 'copper' | null {
  const lower = str.toLowerCase();
  if (lower.startsWith('gold') || lower === 'g') return 'gold';
  if (lower.startsWith('silver') || lower === 's') return 'silver';
  if (lower.startsWith('copper') || lower === 'c') return 'copper';
  return null;
}

// =============================================================================
// Player finder (injectable for testing)
// =============================================================================

let _findPlayerByName: (name: string) => Player | null = () => null;

/** Set the player finder function for bank transfers. */
export function setPlayerFinder(fn: (name: string) => Player | null): void {
  _findPlayerByName = fn;
}

// =============================================================================
// Command
// =============================================================================

/**
 * Bank command handler.
 * Subcommands:
 *   deposit <amount> <gold|silver|copper>
 *   withdraw <amount> <gold|silver|copper>
 *   balance
 *   transfer <amount> <gold|silver|copper> <player>
 */
export function doBank(ch: Character, argument: string): void {
  // Only players can use banking
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot use the bank.\r\n');
    return;
  }

  const player = ch as Player;
  const room = ch.inRoom as Room | null;
  if (!room) {
    ch.sendToChar('You are nowhere!\r\n');
    return;
  }

  const banker = findBanker(room);
  if (!banker) {
    ch.sendToChar('There is no banker here.\r\n');
    return;
  }

  const args = argument.trim().split(/\s+/);
  const subcmd = (args[0] ?? '').toLowerCase();

  switch (subcmd) {
    case 'deposit':
      handleDeposit(player, args);
      break;
    case 'withdraw':
      handleWithdraw(player, args);
      break;
    case 'balance':
    case '':
      handleBalance(player);
      break;
    case 'transfer':
      handleTransfer(player, args);
      break;
    default:
      ch.sendToChar('Usage: bank <deposit|withdraw|balance|transfer>\r\n');
      break;
  }
}

function handleDeposit(player: Player, args: string[]): void {
  if (args.length < 3) {
    player.sendToChar('Usage: bank deposit <amount> <gold|silver|copper>\r\n');
    return;
  }

  const amount = parseInt(args[1]!, 10);
  if (isNaN(amount) || amount <= 0) {
    player.sendToChar('How much do you want to deposit?\r\n');
    return;
  }

  const currType = parseCurrencyType(args[2]!);
  if (!currType) {
    player.sendToChar('Deposit gold, silver, or copper?\r\n');
    return;
  }

  // Check player has enough
  if (player[currType] < amount) {
    player.sendToChar(`You don't have that much ${currType}.\r\n`);
    return;
  }

  // Transfer
  player[currType] -= amount;
  const bankField = `${currType}Balance` as 'goldBalance' | 'silverBalance' | 'copperBalance';
  player.pcData[bankField] += amount;

  player.sendToChar(`You deposit ${amount} ${currType}.\r\n`);
  logger.debug('economy', `Bank: ${player.name} deposits ${amount} ${currType}`);
}

function handleWithdraw(player: Player, args: string[]): void {
  if (args.length < 3) {
    player.sendToChar('Usage: bank withdraw <amount> <gold|silver|copper>\r\n');
    return;
  }

  const amount = parseInt(args[1]!, 10);
  if (isNaN(amount) || amount <= 0) {
    player.sendToChar('How much do you want to withdraw?\r\n');
    return;
  }

  const currType = parseCurrencyType(args[2]!);
  if (!currType) {
    player.sendToChar('Withdraw gold, silver, or copper?\r\n');
    return;
  }

  const bankField = `${currType}Balance` as 'goldBalance' | 'silverBalance' | 'copperBalance';
  if (player.pcData[bankField] < amount) {
    player.sendToChar(`You don't have that much ${currType} in the bank.\r\n`);
    return;
  }

  // Transfer
  player.pcData[bankField] -= amount;
  player[currType] += amount;

  player.sendToChar(`You withdraw ${amount} ${currType}.\r\n`);
  logger.debug('economy', `Bank: ${player.name} withdraws ${amount} ${currType}`);
}

function handleBalance(player: Player): void {
  const balance = normalizeCurrency({
    gold: player.pcData.goldBalance,
    silver: player.pcData.silverBalance,
    copper: player.pcData.copperBalance,
  });
  player.sendToChar(`Your bank balance is: ${formatCurrency(balance)}.\r\n`);
}

function handleTransfer(player: Player, args: string[]): void {
  if (args.length < 4) {
    player.sendToChar('Usage: bank transfer <amount> <gold|silver|copper> <player>\r\n');
    return;
  }

  const amount = parseInt(args[1]!, 10);
  if (isNaN(amount) || amount <= 0) {
    player.sendToChar('How much do you want to transfer?\r\n');
    return;
  }

  const currType = parseCurrencyType(args[2]!);
  if (!currType) {
    player.sendToChar('Transfer gold, silver, or copper?\r\n');
    return;
  }

  const targetName = args[3]!;
  const target = _findPlayerByName(targetName);
  if (!target) {
    player.sendToChar(`Player '${targetName}' not found.\r\n`);
    return;
  }

  if (target === player) {
    player.sendToChar('You cannot transfer to yourself.\r\n');
    return;
  }

  const bankField = `${currType}Balance` as 'goldBalance' | 'silverBalance' | 'copperBalance';
  if (player.pcData[bankField] < amount) {
    player.sendToChar(`You don't have that much ${currType} in the bank.\r\n`);
    return;
  }

  // Transfer
  player.pcData[bankField] -= amount;
  target.pcData[bankField] += amount;

  player.sendToChar(`You transfer ${amount} ${currType} to ${target.name}'s account.\r\n`);
  target.sendToChar(`${player.name} transfers ${amount} ${currType} to your account.\r\n`);

  logger.debug('economy', `Bank: ${player.name} transfers ${amount} ${currType} to ${target.name}`);
}
