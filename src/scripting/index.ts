/**
 * Scripting engine barrel export.
 */

export { MudProgEngine, execute, evaluateIfcheck, setInterpreter, type MudProg, type InterpretFn } from './MudProgEngine.js';
export { IfcheckRegistry, type IfcheckHandler, compareNumeric, setGameHour, getGameHour } from './IfcheckRegistry.js';
export { ScriptParser, TriggerType, type ScriptNode } from './ScriptParser.js';
export {
  substituteVariables,
  getHeSheIt,
  getHimHerIt,
  getHisHerIts,
  type MudProgContext,
} from './VariableSubstitution.js';
export {
  checkTrigger,
  checkGreetProg,
  checkAllGreetProg,
  checkSpeechProg,
  checkDeathProg,
  checkFightProg,
  checkHitPrcntProg,
  checkGiveProg,
  checkBribeProg,
  checkRandProg,
  checkEntryProg,
  checkActProg,
  checkHourProg,
  checkTimeProg,
  checkWearProg,
  checkRemoveProg,
  checkSacProg,
  checkLookProg,
  checkExaProg,
  checkGetProg,
  checkDropProg,
  checkDamageProg,
  checkLeaveProg,
  checkSleepProg,
  checkRestProg,
  checkUseProg,
  checkPullProg,
  checkPushProg,
} from './ScriptParser.js';
