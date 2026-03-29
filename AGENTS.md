# AGENTS.md - SMAUG 2.0 TypeScript MUD Engine

## Build & Development Commands

### Core Commands
- **Build:** `npm run build` - Compile TypeScript to `dist/`
- **Start (production):** `npm start` - Run compiled server
- **Dev (watch mode):** `npm run dev` - Hot-reload development server

### Linting & Formatting
- **Lint:** `npm run lint` - ESLint checks on `src/` and `tests/`
- **Lint & fix:** `npm run lint:fix` - Auto-fix lint errors
- **Format:** `npm run format` - Prettier format all `.ts` files
- **Format check:** `npm run format:check` - Verify formatting without modifying

### Testing
- **Run all tests:** `npm test` - Full Vitest suite once
- **Watch mode:** `npm run test:watch` - Vitest interactive watch mode
- **Single test file:** `npx vitest run tests/unit/commands/movement.test.ts`
- **Test by pattern:** `npx vitest run -t "backstab"` - Match test descriptions

### Database
- **Generate Prisma client:** `npm run db:generate`
- **Push schema:** `npm run db:push`
- **Create migration:** `npm run db:migrate`
- **Open Prisma Studio:** `npm run db:studio`

### Legacy Migration
- **Migrate areas:** `npm run migrate:areas -- --input ./legacy/areas --output ./world`
- **Migrate players:** `npm run migrate:players -- --input ./legacy/players`

---

## Code Style Guidelines

### TypeScript & Language
- **Strict mode enabled** (`strict: true` in `tsconfig.json`)
- **ES modules only** - Use `import`/`export`, never `require()`
- **No `any`** except with documented comments for legacy interop
- **`.js` extension** required in imports (e.g., `import { X } from './X.js'`)
- **Node.js 20+** minimum, TypeScript 5+

### Formatting (Prettier)
- **Semicolons:** Always
- **Quotes:** Single quotes for strings
- **Trailing commas:** Always (all collections)
- **Line width:** 100 characters
- **Tab width:** 2 spaces
- **Arrow parentheses:** Always (`(x) =>`)

### Naming Conventions
| Entity | Style | Examples |
|--------|-------|----------|
| Classes | PascalCase | `CombatEngine`, `MobilePrototype` |
| Interfaces | PascalCase | `CommandDef`, `ITransport` |
| Enums | PascalCase | `Position`, `Direction`, `GameEvent` |
| Enum members | PascalCase | `Position.Standing`, `Direction.North` |
| Functions | camelCase | `registerMovementCommands()` |
| Constants | UPPER_SNAKE_CASE or object PascalCase | `PULSE`, `TRUST_LEVELS` |
| Files | PascalCase for classes, camelCase for modules | `CombatEngine.ts`, `movement.ts` |

### English Spelling
- **British English** throughout code, comments, and docs:
  `colour`, `behaviour`, `initialise`, `serialise`, `colour`, `favour`

### Error Handling
- **Try/catch** around command handlers (CommandRegistry wraps automatically)
- **Never crash** game loop - log recoverable errors with `Logger.error()`
- **Fatal errors** trigger graceful shutdown via `Logger.fatal()`
- **No unhandled rejections** - all async operations must handle errors

### Import Conventions (ESLint)
- **Type imports** as `type-imports` when possible
- **Unused variables** ignored if prefixed with `_` (`_unusedParam`)
- **No `console.log`** in production code - use `Logger` instead
- **Strict equality** - always `===` (no `==`)

---

## Testing Strategy

### Test Structure
```
tests/
├── unit/           # Fast, isolated tests, no I/O
├── integration/    # Multi-system interaction tests
└── e2e/            # Full end-to-end scenarios
```

### Test Patterns
- Use Vitest's `describe`/`it`/`expect` syntax
- One `describe` block per function/method
- Create **mock objects** using factory functions
- Test happy paths **and** edge cases (null, boundaries)
- Use `it.todo()` for planned tests (tracked in Phase 4 parity)`

### Running Tests
- **Specific file:** `npx vitest run tests/unit/path/to/test.test.ts`
- **Pattern match:** `npx vitest run -t "backstab"`
- **Watch:** `npm run test:watch` (re-runs on file changes)

---

## Architecture Rules

### Core Principles
1. **Single-threaded** - All game logic on main thread (no worker threads)
2. **250ms pulse interval** - Matches legacy `PULSE_PER_SECOND = 4`
3. **Prototype-instance pattern** - Vnums identify prototypes; area resets create instances
4. **Synchronous event bus** - Events fire in registration order, no async gaps
5. **No over-engineering** - One process serves game, REST API, WebSocket

### Key Timing Constants
| Counter | Pulses | Real Time | Purpose |
|---------|--------|-----------|---------|
| `second` | 4 | 1 s | Housekeeping |
| `violence` | 12 | 3 s | Combat rounds |
| `mobile` | 16 | 4 s | NPC AI |
| `area` | 120–360 | 30–90 s | Area resets (randomized) |
| `tick` | 210–350 | 52–87 s | Full tick (randomized) |

### Bitvectors
- Use **bigint** for bitvectors to support > 32 flags
- Comparison: always use `===` with `0n`, never mix `number`/`bigint`

---

## Project Structure

```
src/
├── core/              # GameLoop, TickEngine, EventBus
├── network/           # WebSocket, ConnectionManager, SocketIO
├── game/              # Commands, combat, world, entities, spells, affects
├── scripting/         # MudProg engine, if-checks, variable substitution
├── persistence/       # Prisma repositories (Player, World)
├── admin/             # REST API, authentication, dashboard
├── migration/         # Legacy .are/.plr importers
└── utils/             # AnsiColors, Dice, BitVector, StringUtils
```

---

## Git Practices

- **Branch names:** `feat/`, `fix/`, `docs/`, `refactor/`
- **Commit messages:** Imperative mood ("Add backstab", not "Added backstab")
- **Atomic commits:** One logical change per commit
- **Run before merge:** `npm run lint`, `npm run format:check`, `npm test`, `npx tsc --noEmit`

---

## Cursor / Copilot Rules

No Cursor rules (`.cursor/rules/` or `.cursorrules`) or Copilot rules (`.github/copilot-instructions.md`) found.

---

## Quick Reference: Running Single Tests

```bash
# Unit test for movement commands
npx vitest run tests/unit/commands/movement.test.ts

# Integration test for combat
npx vitest run tests/integration/CombatRound.test.ts

# E2E test for login
npx vitest run tests/e2e/PlayerLogin.test.ts

# All tests matching pattern
npx vitest run -t "ShopTransaction"
npx vitest run -t "Combat"

# Watch mode (restart on file changes)
npx vitest
```

---

## Code Quality Checklist

Before committing:
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm test` passes (or relevant subset)
- [ ] `npx tsc --noEmit` passes (type check)
- [ ] No `console.log` in production code
- [ ] British English spelling
- [ ] `.js` extension in all imports
