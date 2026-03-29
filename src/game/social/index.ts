/**
 * Social Systems – barrel export.
 */

export {
  // ClanSystem
  ClanType,
  type ClanData,
  getClan,
  getAllClans,
  setClan,
  removeClanFromMemory,
  clearClans,
  saveClan,
  setSaveClan,
  loadClans,
  setLoadClans,
  setPlayerFinder,
  createDefaultClan,
  doInduct,
  doOutcast,
  doClanList,
  doClanInfo,
  doMakeClan,
  doCset,
  doClanDonate,
  getClanRecall,
  hasClanStoreAccess,
} from './ClanSystem.js';

export {
  // BoardSystem
  type BoardData,
  type NoteData,
  type BoardPersistence,
  getBoard,
  getBoardById,
  registerBoard,
  clearBoards,
  setBoardPersistence,
  setBoardFinder,
  doNote,
} from './BoardSystem.js';

export {
  // DeitySystem
  type DeityData,
  getDeity,
  getAllDeities,
  setDeity,
  clearDeities,
  loadDeities,
  setLoadDeities,
  saveDeity,
  setSaveDeity,
  setMoveCharToRoom as setDeityMoveCharToRoom,
  modifyFavour,
  doWorship,
  doSupplicate,
  createDefaultDeity,
} from './DeitySystem.js';

export {
  // HousingSystem
  type PlayerHouse,
  type HousePersistence,
  setHousePersistence,
  setMoveCharToRoom as setHousingMoveCharToRoom,
  doHomebuy,
  doGohome,
  doHomeSet,
  doHomeAccessory,
  doHomesell,
  HOUSE_BASE_PRICE,
  APARTMENT_PRICE,
  SELL_REFUND_PCT,
  MAX_ACCESSORIES,
  ROOM_HOUSE_FORSALE,
} from './HousingSystem.js';

export { registerSocialCommands } from './registerSocialCommands.js';
