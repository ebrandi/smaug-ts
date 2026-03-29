/**
 * MudProgEngine – MudProg script execution engine.
 *
 * Executes MudProg scripts attached to mobiles, objects, and rooms.
 * Processes triggers (greet, speech, give, death, etc.), evaluates
 * if-checks, and runs MudProg commands through the CommandRegistry.
 *
 * Replicates legacy mud_prog.c execution model:
 *   - Line-by-line execution
 *   - if/or/else/endif/break flow control
 *   - Nested if-depth up to MAX_IFS (20)
 *   - Variable substitution via $-variables
 *   - Commands executed as the mob via interpret()
 */

import { substituteVariables, type MudProgContext } from './VariableSubstitution.js';
import { IfcheckRegistry } from './IfcheckRegistry.js';
import { Logger } from '../utils/Logger.js';

const logger = new Logger();

/** Maximum nested if-depth before aborting. */
const MAX_IFS = 20;

/**
 * MudProg script definition.
 */
export interface MudProg {
  /** The trigger type that activates this program. */
  triggerType: number;
  /** Trigger argument (e.g., "hello" for SPEECH_PROG). */
  argList: string;
  /** The script commands, newline-separated. */
  commandList: string;
}

/**
 * Command interpreter function type.
 * Used to execute commands as the mob.
 */
export type InterpretFn = (ch: unknown, command: string) => void;

/** Default no-op interpreter. */
let _interpret: InterpretFn = (_ch, _cmd) => {
  // Default no-op - should be wired to CommandRegistry.dispatch
};

/**
 * Set the command interpreter function.
 * Should be called during game initialization to wire to CommandRegistry.
 */
export function setInterpreter(fn: InterpretFn): void {
  _interpret = fn;
}

/**
 * Check if a character is "dead" (extracted from the world).
 */
function charDied(ch: unknown): boolean {
  if (!ch || typeof ch !== 'object') return true;
  const character = ch as { position?: number; hit?: number; inRoom?: unknown };
  // Position.Dead = 0
  return character.position === 0 || (character.hit !== undefined && character.hit <= -11);
}

/**
 * Resolve a target variable string to the actual object.
 */
function resolveTarget(targetStr: string, context: MudProgContext): unknown {
  const trimmed = targetStr.trim();
  switch (trimmed) {
    case '$n': return context.actor;
    case '$i': return context.mob;
    case '$t': return context.victim;
    case '$r': return context.randomPC;
    case '$p': return context.obj;
    default:   return trimmed; // Literal value (e.g., for rand(25))
  }
}

/**
 * Evaluate an ifcheck condition string.
 *
 * Parses conditions in the form:
 *   ifcheck($target) [operator value]
 *
 * Examples:
 *   ispc($n)
 *   level($n) > 10
 *   rand(25)
 *   name($n) == Gandalf
 */
export function evaluateIfcheck(condition: string, context: MudProgContext): boolean {
  // Parse: checkName(args) [operator value]
  const match = condition.match(/^(\w+)\(([^)]*)\)\s*(.*)$/);
  if (!match) {
    logger.warn('scripting', `Invalid ifcheck syntax: ${condition}`);
    return false;
  }

  const checkName = match[1]!;
  const targetStr = match[2]!;
  const comparison = match[3] ?? '';

  // Resolve the target
  const target = resolveTarget(targetStr, context);

  // Parse comparison operator and value
  let operator = '';
  let value = '';
  if (comparison.trim()) {
    const compMatch = comparison.trim().match(/^(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (compMatch) {
      operator = compMatch[1]!;
      value = compMatch[2]!.trim();
    } else {
      // If no operator found, treat the whole comparison as a value with == operator
      operator = '==';
      value = comparison.trim();
    }
  }

  return IfcheckRegistry.evaluate(checkName.toLowerCase(), target, operator, value, context);
}

/**
 * Execute a MudProg script in the given context.
 *
 * Processes the script line-by-line, handling:
 *   - if/or/else/endif control flow
 *   - break statement (stops execution)
 *   - Variable substitution ($n, $i, etc.)
 *   - Command execution as the mob
 *
 * @param prog - The MudProg to execute
 * @param context - The execution context
 */
export function execute(prog: MudProg, context: MudProgContext): void {
  const lines = prog.commandList
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Stack of if-level active states
  // ifState[0] is always true (top-level)
  const ifState: boolean[] = [true];

  for (const line of lines) {
    // Check if mob died during execution
    if (charDied(context.mob)) return;

    const lowerLine = line.toLowerCase();

    // Handle flow control keywords
    if (lowerLine.startsWith('if ')) {
      // Nested if
      if (ifState.length >= MAX_IFS) {
        logger.error('scripting', 'MudProg if-depth exceeded');
        return;
      }

      // Only evaluate if the current level is active
      const parentActive = ifState.every(s => s);
      if (parentActive) {
        const condition = line.substring(3).trim();
        const result = evaluateIfcheck(condition, context);
        ifState.push(result);
      } else {
        // Parent is inactive, push false without evaluating
        ifState.push(false);
      }
    } else if (lowerLine.startsWith('or ')) {
      // OR: only evaluate if current level is false and parent is active
      if (ifState.length <= 1) continue;

      // Check if parent levels (all except last) are active
      const parentActive = ifState.slice(0, -1).every(s => s);
      if (parentActive && !ifState[ifState.length - 1]) {
        const condition = line.substring(3).trim();
        ifState[ifState.length - 1] = evaluateIfcheck(condition, context);
      }
    } else if (lowerLine === 'else') {
      if (ifState.length > 1) {
        // Only flip if parent levels are active
        const parentActive = ifState.slice(0, -1).every(s => s);
        if (parentActive) {
          ifState[ifState.length - 1] = !ifState[ifState.length - 1]!;
        }
      }
    } else if (lowerLine === 'endif') {
      if (ifState.length > 1) {
        ifState.pop();
      }
    } else if (lowerLine === 'break') {
      // Stop execution only if all if-levels are active
      if (ifState.every(s => s)) {
        return;
      }
    } else {
      // Regular command - only execute if all if-levels are true
      if (ifState.every(s => s)) {
        const expandedLine = substituteVariables(line, context);
        // Execute command as the mob
        _interpret(context.mob, expandedLine);
      }
    }
  }
}

/**
 * MudProgEngine class wrapper for compatibility with existing barrel export.
 */
// TODO PARITY: MudProgEngine — implement all trigger types (ACT_PROG, SPEECH_PROG, RAND_PROG, FIGHT_PROG, DEATH_PROG, HITPRCNT_PROG, ENTRY_PROG, GREET_PROG, ALL_GREET_PROG, GIVE_PROG, BRIBE_PROG, TIME_PROG)
export class MudProgEngine {
  /**
   * Execute a MudProg script for a given trigger.
   */
  static execute(prog: MudProg, context: MudProgContext): void {
    execute(prog, context);
  }

  /**
   * Evaluate an ifcheck condition.
   */
  static evaluateIfcheck(condition: string, context: MudProgContext): boolean {
    return evaluateIfcheck(condition, context);
  }

  /**
   * Set the command interpreter function.
   */
  static setInterpreter(fn: InterpretFn): void {
    setInterpreter(fn);
  }

  /**
   * Legacy instance method for backward compatibility.
   */
  executeProg(trigger: string, actor: unknown, target: unknown, args: string): void {
    void trigger;
    void actor;
    void target;
    void args;
    // This method exists for backward compatibility with the old stub interface.
    // Use MudProgEngine.execute() or the module-level execute() instead.
  }
}
