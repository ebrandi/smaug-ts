/**
 * Commands barrel export.
 */

export {
  CommandRegistry,
  CommandLogLevel,
  defaultCommandFlags,
  type CommandDef,
  type CommandFlags,
  type SocialDef,
} from './CommandRegistry.js';

export { registerMovementCommands } from './movement.js';
export { registerCombatCommands } from './combat.js';
export {
  registerCommunicationCommands,
  setCommConnectionManager,
  setCommEventBus,
  ChannelScope,
  Language,
  LANGUAGE_NAMES,
  CHANNEL_CONFIGS,
  CHANNEL_CHAT,
  CHANNEL_YELL,
  CHANNEL_SHOUT,
  CHANNEL_MUSIC,
  CHANNEL_NEWBIE,
  CHANNEL_IMMTALK,
  CHANNEL_WARTALK,
  CHANNEL_RACETALK,
  CHANNEL_CLANTALK,
  CHANNEL_GUILDTALK,
  CHANNEL_ORDERTALK,
  CHANNEL_COUNCILTALK,
  CHANNEL_SAY,
  CHANNEL_WHISPER,
  CHANNEL_GTELL,
  CHANNEL_TELL,
  talkChannel,
  translateMessage,
  scrambleMessage,
  isIgnoring,
  canSeeChannel,
  formatChannelMessage,
  doChat, doGossip, doYell, doShout, doSay, doTell, doReply,
  doWhisper, doGtell, doClanTalk, doOrderTalk, doCouncilTalk,
  doGuildTalk, doMusic, doNewbieChat, doImmtalk, doRaceTalk, doWartalk,
  doEmote, doDeaf, doIgnore, doSpeak, doLanguages,
  type ChannelConfig,
  type ICommConnectionManager,
} from './communication.js';
export { registerInformationCommands } from './information.js';
export {
  registerObjectCommands,
  doGet, doDrop, doPut, doGive, doWear, doRemove, doWearAll,
  doEat, doDrink, doFill, doSacrifice, doLoot,
  maxCarryWeight, maxCarryNumber, canCarryWeight, canCarryNumber,
  findObjInInventory, findObjInRoom, findObjInContainer,
  canWearAt, getWearLocation,
  setObjectEventBus,
} from './objects.js';
export { registerMagicCommands } from './magic.js';
export { loadSocials, executeSocial, substituteVariables, type SocialData } from './social.js';
export { registerEconomyCommands } from './economy.js';
export {
  registerImmortalCommands,
  setImmortalLogger,
  setImmortalBanSystem,
  setImmortalVnumRegistry,
  setImmortalAreaManager,
  setImmortalConnectionManager,
  doAuthorize, doFreeze, doSilence, doNoshout, doNotell, doLog,
  doGoto, doTransfer, doAt, doBamfin, doBamfout,
  doPurge, doMload, doOload, doSlay, doForce, doSnoop, doSwitch, doReturn,
  doReboot, doShutdown, doCopyover, doSet, doStat, doAdvance, doTrust,
  doRestore, doHeal, doPeace, doEcho, doGecho,
  doBan, doAllow,
  doUsers, doMemory, doWizhelp,
  PLR_UNAUTHED, PLR_FREEZE, PLR_SILENCE, PLR_NOSHOUT, PLR_NOTELL, PLR_LOG,
} from './immortal.js';
export {
  registerOlcCommands,
  setOlcLogger,
  setOlcVnumRegistry,
  setOlcAreaManager,
  canModifyVnum,
  doRedit, doMedit, doOedit, doMpedit, doAedit,
  type VnumType,
  type MudProg,
} from './olc.js';
