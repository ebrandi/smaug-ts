/**
 * ClanSystem – Clan / Guild / Order / Council management.
 *
 * Replicates legacy clans.c: in-memory clan storage, induction,
 * outcasting, clan list/info, immortal clan management, and donations.
 */

import type { Character } from '../entities/Character.js';
import type { Player } from '../entities/Player.js';
import { CharClass } from '../entities/types.js';
import { oneArgument } from '../../utils/StringUtils.js';
import { setFlag } from '../../utils/BitVector.js';

// =============================================================================
// Enums & Interfaces
// =============================================================================

/** Clan organisation type – mirrors legacy CLAN_xxx defines. */
export enum ClanType {
  Clan    = 0,   // PK clan
  Guild   = 1,   // Class-based guild
  Order   = 2,   // Religious order
  Council = 3,   // Administrative council
}

/** Full in-memory clan data. */
export interface ClanData {
  name: string;
  filename: string;
  motto: string;
  description: string;
  leader: string;
  number1: string;   // First officer
  number2: string;   // Second officer
  clanType: ClanType;
  members: number;
  pkills: number;
  pdeaths: number;
  mkills: number;
  mdeaths: number;
  illegalPK: number;
  score: number;
  favour: number;
  strikes: number;
  treasury: number;
  recall: number;      // Recall room vnum
  storeroom: number;   // Storeroom vnum
  guard1: number;
  guard2: number;
  clanClass: number;   // For guilds, required class (-1 = any)
  minAlign: number;
  maxAlign: number;
  badge: string;
  deityName: string;
}

// =============================================================================
// PCFLAG_DEADLY – legacy bitvector flag for PK-enabled players
// =============================================================================

const PCFLAG_DEADLY = 1n << 12n;

// =============================================================================
// In-Memory Storage
// =============================================================================

const clanList: Map<string, ClanData> = new Map();

/** Retrieve a clan by (case-insensitive) name. */
export function getClan(name: string): ClanData | undefined {
  const lower = name.toLowerCase();
  for (const [key, clan] of clanList) {
    if (key.toLowerCase() === lower) return clan;
  }
  return undefined;
}

/** Return all clans as an array. */
export function getAllClans(): ClanData[] {
  return Array.from(clanList.values());
}

/** Store / update a clan in the in-memory map. */
export function setClan(clan: ClanData): void {
  clanList.set(clan.name, clan);
}

/** Remove a clan from the in-memory map. */
export function removeClanFromMemory(name: string): void {
  clanList.delete(name);
}

/** Clear all clans (for testing). */
export function clearClans(): void {
  clanList.clear();
}

// =============================================================================
// Persistence Delegates
// =============================================================================

export let saveClan: (clan: ClanData) => Promise<void> = async () => {};

export function setSaveClan(fn: (clan: ClanData) => Promise<void>): void {
  saveClan = fn;
}

export let loadClans: () => Promise<void> = async () => {};

export function setLoadClans(fn: () => Promise<void>): void {
  loadClans = fn;
}

// =============================================================================
// Player Finder Delegate
// =============================================================================

let findPlayer: (name: string) => Player | undefined = () => undefined;

export function setPlayerFinder(fn: (name: string) => Player | undefined): void {
  findPlayer = fn;
}

// =============================================================================
// Helpers
// =============================================================================

function clanTypeName(t: ClanType): string {
  switch (t) {
    case ClanType.Clan:    return 'Clan';
    case ClanType.Guild:   return 'Guild';
    case ClanType.Order:   return 'Order';
    case ClanType.Council: return 'Council';
  }
}

/** Create a default ClanData with the given name. */
export function createDefaultClan(name: string): ClanData {
  return {
    name,
    filename: name.toLowerCase().replace(/\s+/g, '_'),
    motto: '',
    description: '',
    leader: '',
    number1: '',
    number2: '',
    clanType: ClanType.Clan,
    members: 0,
    pkills: 0,
    pdeaths: 0,
    mkills: 0,
    mdeaths: 0,
    illegalPK: 0,
    score: 0,
    favour: 0,
    strikes: 0,
    treasury: 0,
    recall: 0,
    storeroom: 0,
    guard1: 0,
    guard2: 0,
    clanClass: -1,
    minAlign: -1000,
    maxAlign: 1000,
    badge: '',
    deityName: '',
  };
}

function isLeaderOrOfficer(ch: Character, clan: ClanData): boolean {
  const n = ch.name.toLowerCase();
  return (
    clan.leader.toLowerCase() === n ||
    (clan.number1 !== '' && clan.number1.toLowerCase() === n) ||
    (clan.number2 !== '' && clan.number2.toLowerCase() === n)
  );
}

function isLeader(ch: Character, clan: ClanData): boolean {
  return clan.leader.toLowerCase() === ch.name.toLowerCase();
}

function getPlayerClan(ch: Character): ClanData | undefined {
  const player = ch as Player;
  if (!player.pcData?.clanName) return undefined;
  return getClan(player.pcData.clanName);
}

// =============================================================================
// Commands
// =============================================================================

/**
 * doInduct – Induct a player into the acting character's clan.
 */
export function doInduct(ch: Character, argument: string): void {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot induct.\r\n');
    return;
  }

  const clan = getPlayerClan(ch);
  if (!clan) {
    ch.sendToChar('You are not in a clan.\r\n');
    return;
  }

  if (!isLeaderOrOfficer(ch, clan)) {
    ch.sendToChar('You are not an officer of your clan.\r\n');
    return;
  }

  const [targetName] = oneArgument(argument);
  if (!targetName) {
    ch.sendToChar('Induct whom?\r\n');
    return;
  }

  const target = findPlayer(targetName);
  if (!target) {
    ch.sendToChar('That player is not online.\r\n');
    return;
  }

  if (target.isNpc) {
    ch.sendToChar('You cannot induct NPCs.\r\n');
    return;
  }

  if (target.level < 10) {
    ch.sendToChar('That player must be at least level 10 to join a clan.\r\n');
    return;
  }

  if (target.pcData.clanName) {
    ch.sendToChar('That player is already in a clan.\r\n');
    return;
  }

  // Guild class restriction check
  if (clan.clanType === ClanType.Guild && clan.clanClass >= 0) {
    const targetClassValue = typeof target.class_ === 'number'
      ? target.class_
      : CharClass[target.class_ as keyof typeof CharClass] ?? -1;
    if (targetClassValue !== clan.clanClass) {
      ch.sendToChar('That player does not meet the class requirements of the guild.\r\n');
      return;
    }
  }

  // PK clans set deadly flag
  if (clan.clanType === ClanType.Clan) {
    target.pcData.flags = setFlag(target.pcData.flags, PCFLAG_DEADLY);
  }

  target.pcData.clanName = clan.name;
  clan.members++;

  ch.sendToChar(`You induct ${target.name} into ${clan.name}.\r\n`);
  target.sendToChar(`${ch.name} inducts you into ${clan.name}.\r\n`);

  saveClan(clan).catch(() => {});
}

/**
 * doOutcast – Remove a player from the acting character's clan.
 */
export function doOutcast(ch: Character, argument: string): void {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot outcast.\r\n');
    return;
  }

  const clan = getPlayerClan(ch);
  if (!clan) {
    ch.sendToChar('You are not in a clan.\r\n');
    return;
  }

  if (!isLeader(ch, clan)) {
    ch.sendToChar('Only the leader can outcast members.\r\n');
    return;
  }

  const [targetName] = oneArgument(argument);
  if (!targetName) {
    ch.sendToChar('Outcast whom?\r\n');
    return;
  }

  const target = findPlayer(targetName);
  if (!target) {
    ch.sendToChar('That player is not online.\r\n');
    return;
  }

  if (target.isNpc) {
    ch.sendToChar('You cannot outcast NPCs.\r\n');
    return;
  }

  if (!target.pcData.clanName ||
      target.pcData.clanName.toLowerCase() !== clan.name.toLowerCase()) {
    ch.sendToChar('That player is not in your clan.\r\n');
    return;
  }

  target.pcData.clanName = null;
  clan.members = Math.max(0, clan.members - 1);

  ch.sendToChar(`You outcast ${target.name} from ${clan.name}.\r\n`);
  target.sendToChar(`${ch.name} outcasts you from ${clan.name}!\r\n`);

  saveClan(clan).catch(() => {});
}

/**
 * doClanList – Display all clans in a table.
 */
export function doClanList(ch: Character, _argument: string): void {
  const clans = getAllClans();
  if (clans.length === 0) {
    ch.sendToChar('There are no clans.\r\n');
    return;
  }

  let buf = 'Clan                 Type     Members  PKills PDeaths  Score\r\n';
  buf += '-------------------- -------- -------- ------ ------- ------\r\n';

  for (const c of clans) {
    const name = c.name.substring(0, 20).padEnd(20);
    const type = clanTypeName(c.clanType).padEnd(8);
    const members = String(c.members).padStart(8);
    const pk = String(c.pkills).padStart(6);
    const pd = String(c.pdeaths).padStart(7);
    const sc = String(c.score).padStart(6);
    buf += `${name} ${type} ${members} ${pk} ${pd} ${sc}\r\n`;
  }

  ch.sendToChar(buf);
}

/**
 * doClanInfo – Display detailed info for a clan.
 */
export function doClanInfo(ch: Character, argument: string): void {
  let clan: ClanData | undefined;

  if (!argument.trim()) {
    clan = getPlayerClan(ch);
    if (!clan) {
      ch.sendToChar('You are not in a clan. Specify a clan name.\r\n');
      return;
    }
  } else {
    clan = getClan(argument.trim());
    if (!clan) {
      ch.sendToChar('No such clan.\r\n');
      return;
    }
  }

  let buf = '';
  buf += `Clan : ${clan.name}\r\n`;
  buf += `Type : ${clanTypeName(clan.clanType)}\r\n`;
  buf += `Motto: ${clan.motto || '(none)'}\r\n`;
  buf += `Leader: ${clan.leader || '(none)'}\r\n`;
  buf += `Officer 1: ${clan.number1 || '(none)'}\r\n`;
  buf += `Officer 2: ${clan.number2 || '(none)'}\r\n`;
  buf += `Members: ${clan.members}\r\n`;
  buf += `PKills: ${clan.pkills}  PDeaths: ${clan.pdeaths}\r\n`;
  buf += `MKills: ${clan.mkills}  MDeaths: ${clan.mdeaths}\r\n`;
  buf += `Score: ${clan.score}\r\n`;
  buf += `Treasury: ${clan.treasury} gold\r\n`;

  ch.sendToChar(buf);
}

/**
 * doMakeClan – Create a new clan (Immortal only).
 */
export function doMakeClan(ch: Character, argument: string): void {
  const name = argument.trim();
  if (!name) {
    ch.sendToChar('Create a clan with what name?\r\n');
    return;
  }

  if (getClan(name)) {
    ch.sendToChar('A clan with that name already exists.\r\n');
    return;
  }

  const clan = createDefaultClan(name);
  setClan(clan);

  ch.sendToChar(`Clan "${name}" created.\r\n`);

  saveClan(clan).catch(() => {});
}

/**
 * doCset – Modify clan properties (Immortal only).
 */
export function doCset(ch: Character, argument: string): void {
  let rest = argument;
  let clanName: string;
  [clanName, rest] = oneArgument(rest);
  if (!clanName) {
    ch.sendToChar('Syntax: cset <clan> <field> <value>\r\n');
    return;
  }

  const clan = getClan(clanName);
  if (!clan) {
    ch.sendToChar('No such clan.\r\n');
    return;
  }

  let field: string;
  [field, rest] = oneArgument(rest);
  if (!field) {
    ch.sendToChar('Syntax: cset <clan> <field> <value>\r\n');
    ch.sendToChar('Fields: leader number1 number2 motto recall storeroom clanclass minalign maxalign treasury pkills pdeaths score clantype\r\n');
    return;
  }

  const value = rest.trim();
  field = field.toLowerCase();

  switch (field) {
    case 'leader':
      clan.leader = value;
      break;
    case 'number1':
      clan.number1 = value;
      break;
    case 'number2':
      clan.number2 = value;
      break;
    case 'motto':
      clan.motto = value;
      break;
    case 'recall': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.recall = v;
      break;
    }
    case 'storeroom': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.storeroom = v;
      break;
    }
    case 'clanclass': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.clanClass = v;
      break;
    }
    case 'minalign': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.minAlign = v;
      break;
    }
    case 'maxalign': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.maxAlign = v;
      break;
    }
    case 'treasury': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.treasury = v;
      break;
    }
    case 'pkills': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.pkills = v;
      break;
    }
    case 'pdeaths': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.pdeaths = v;
      break;
    }
    case 'score': {
      const v = parseInt(value, 10);
      if (isNaN(v)) { ch.sendToChar('Value must be a number.\r\n'); return; }
      clan.score = v;
      break;
    }
    case 'clantype': {
      const v = parseInt(value, 10);
      if (isNaN(v) || v < 0 || v > 3) { ch.sendToChar('Clan type must be 0-3.\r\n'); return; }
      clan.clanType = v as ClanType;
      break;
    }
    default:
      ch.sendToChar(`Unknown field: ${field}\r\n`);
      ch.sendToChar('Fields: leader number1 number2 motto recall storeroom clanclass minalign maxalign treasury pkills pdeaths score clantype\r\n');
      return;
  }

  setClan(clan);
  ch.sendToChar(`Clan "${clan.name}" field "${field}" set to "${value}".\r\n`);

  saveClan(clan).catch(() => {});
}

/**
 * doClanDonate – Donate gold to your clan's treasury.
 */
export function doClanDonate(ch: Character, argument: string): void {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot donate to clans.\r\n');
    return;
  }

  const clan = getPlayerClan(ch);
  if (!clan) {
    ch.sendToChar('You are not in a clan.\r\n');
    return;
  }

  const amount = parseInt(argument.trim(), 10);
  if (isNaN(amount) || amount <= 0) {
    ch.sendToChar('Donate how much gold?\r\n');
    return;
  }

  if (ch.gold < amount) {
    ch.sendToChar('You do not have that much gold.\r\n');
    return;
  }

  ch.gold -= amount;
  clan.treasury += amount;

  ch.sendToChar(`You donate ${amount} gold to ${clan.name}.\r\n`);

  saveClan(clan).catch(() => {});
}

/**
 * getClanRecall – Return the recall vnum for a player's clan, or 0.
 */
export function getClanRecall(ch: Character): number {
  if (ch.isNpc) return 0;
  const clan = getPlayerClan(ch);
  return clan?.recall ?? 0;
}

/**
 * hasClanStoreAccess – Check if a player can access a clan storeroom.
 */
export function hasClanStoreAccess(ch: Character, roomVnum: number): boolean {
  if (ch.isNpc) return false;
  const clan = getPlayerClan(ch);
  if (!clan) return false;
  return clan.storeroom === roomVnum;
}
