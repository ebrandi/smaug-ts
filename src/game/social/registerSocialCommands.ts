/**
 * registerSocialCommands – Register all social system commands
 * with the CommandRegistry.
 */

import type { CommandRegistry } from '../commands/CommandRegistry.js';
import { CommandLogLevel, defaultCommandFlags } from '../commands/CommandRegistry.js';
import { Position } from '../entities/types.js';
import { TRUST_LEVELS } from '../../admin/TrustLevels.js';

import { doInduct, doOutcast, doClanList, doClanInfo, doMakeClan, doCset, doClanDonate } from './ClanSystem.js';
import { doNote } from './BoardSystem.js';
import { doWorship, doSupplicate } from './DeitySystem.js';
import { doHomebuy, doGohome, doHomeSet, doHomeAccessory, doHomesell } from './HousingSystem.js';

/**
 * Register all social commands with the provided CommandRegistry instance.
 */
export function registerSocialCommands(registry: CommandRegistry): void {
  // ---- Clan commands ----
  registry.register({
    name: 'induct',
    handler: doInduct,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'outcast',
    handler: doOutcast,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'clans',
    handler: doClanList,
    minPosition: Position.Sleeping,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'claninfo',
    handler: doClanInfo,
    minPosition: Position.Sleeping,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'makeclan',
    handler: doMakeClan,
    minPosition: Position.Dead,
    minTrust: TRUST_LEVELS.GOD,
    logLevel: CommandLogLevel.Always,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'cset',
    handler: doCset,
    minPosition: Position.Dead,
    minTrust: TRUST_LEVELS.GOD,
    logLevel: CommandLogLevel.Always,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'donate',
    handler: doClanDonate,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  // ---- Board commands ----
  registry.register({
    name: 'note',
    handler: (ch, arg) => { doNote(ch, arg); },
    minPosition: Position.Sitting,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  // ---- Deity commands ----
  registry.register({
    name: 'worship',
    handler: doWorship,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'supplicate',
    handler: doSupplicate,
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  // ---- Housing commands ----
  registry.register({
    name: 'homebuy',
    handler: (ch, arg) => { doHomebuy(ch, arg); },
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'gohome',
    handler: (ch, arg) => { doGohome(ch, arg); },
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'homeset',
    handler: (ch, arg) => { doHomeSet(ch, arg); },
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'homeaccessory',
    handler: (ch, arg) => { doHomeAccessory(ch, arg); },
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });

  registry.register({
    name: 'homesell',
    handler: (ch, arg) => { doHomesell(ch, arg); },
    minPosition: Position.Standing,
    minTrust: 0,
    logLevel: CommandLogLevel.Normal,
    flags: defaultCommandFlags(),
    useCount: 0,
    lagCount: 0,
  });
}
