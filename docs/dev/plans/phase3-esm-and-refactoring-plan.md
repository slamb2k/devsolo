# Phase 3: Balanced ESM Fixes & Ship Command Refactoring

**Date**: 2025-10-10
**Branch**: test/balanced-refactoring-and-esm-tests
**Goal**: Enable MCP server test + Refactor hansolo-ship.ts
**Time Estimate**: 4-5 days

## Overview

Phase 3 takes a balanced approach to address both deferred items from Phase 2:
1. **ESM Module Issues** - Fix MCP server test by lazy-loading ESM dependencies
2. **Command Refactoring** - Extract ship-orchestrator service from hansolo-ship.ts

This approach delivers quick wins on test coverage while making meaningful progress on code quality.

## Part 1: ESM Module Resolution Strategy

### The Problem

The MCP server test (`tests/mcp/hansolo-mcp-server.test.ts`) fails because:
- MCP server imports commands → Commands import UI modules → UI modules are ESM-only
- Jest (CommonJS) cannot easily mock ESM modules (ora, chalk, boxen, inquirer)
- Current workaround: test is skipped with `@ts-nocheck`

### ESM Dependencies Analysis

**ESM Modules Used:**
- `ora` - Spinners and progress indicators
- `chalk` - Terminal colors
- `boxen` - Box drawing
- `inquirer` - Interactive prompts

**Files Importing ESM Modules:**

**Commands (9 files):**
- `src/commands/hansolo-init.ts` - inquirer
- `src/commands/hansolo-validate.ts` - chalk
- `src/commands/hansolo-config.ts` - chalk
- `src/commands/hansolo-cleanup.ts` - chalk
- `src/commands/hansolo-status.ts` - chalk
- `src/commands/hansolo-sessions.ts` - chalk
- `src/commands/hansolo-perf.ts` - chalk
- `src/commands/hansolo-status-line.ts` - chalk
- `src/commands/interactive.ts` - chalk

**UI Layer (5 files):**
- `src/ui/console-output.ts` - chalk, boxen
- `src/ui/box-formatter.ts` - boxen
- `src/ui/table-formatter.ts` - chalk
- `src/ui/progress-indicators.ts` - ora
- `src/ui/banners.ts` - (check if uses chalk)

**CLI Layer (7 files):**
- `src/cli/InstallerWizard.ts` - inquirer, chalk, ora
- `src/cli/components/ProgressIndicator.ts` - chalk
- `src/cli/components/WelcomeBanner.ts` - chalk
- `src/cli/components/ThemeManager.ts` - chalk
- `src/cli/steps/IntegrationStep.ts` - inquirer, chalk
- `src/cli/steps/WorkflowStep.ts` - inquirer, chalk
- `src/cli/steps/UIStep.ts` - inquirer, chalk
- `src/cli/steps/ReviewStep.ts` - inquirer, chalk

**Total**: 21 files

### Chosen Solution: Lazy-Loading (Option C)

**Why Lazy-Loading?**
- ✅ Minimal code changes
- ✅ Preserves current Jest setup
- ✅ Enables testing immediately
- ✅ Low risk
- ✅ No experimental flags needed

**Implementation Strategy:**

1. **Create ESM Loader Utilities** (`src/utils/esm-loaders.ts`)
   - Centralized dynamic import functions
   - Type-safe wrappers
   - Caching for performance

2. **Refactor UI Layer First** (highest impact)
   - `src/ui/console-output.ts`
   - `src/ui/box-formatter.ts`
   - `src/ui/table-formatter.ts`
   - `src/ui/progress-indicators.ts`

3. **Refactor Commands** (medium impact)
   - Update 9 command files to use loaders

4. **Update CLI Layer** (lower priority)
   - CLI is used during `hansolo init`, less critical for testing

### Implementation Details

#### Step 1: Create ESM Loader Utilities

```typescript
// src/utils/esm-loaders.ts

import type { Ora } from 'ora';
import type { ChalkInstance } from 'chalk';
import type { default as BoxenType } from 'boxen';
import type { default as InquirerType } from 'inquirer';

// Cache loaded modules
let _chalk: ChalkInstance | null = null;
let _boxen: typeof BoxenType | null = null;
let _ora: typeof import('ora').default | null = null;
let _inquirer: typeof InquirerType | null = null;

/**
 * Lazy-load chalk module
 */
export async function loadChalk(): Promise<ChalkInstance> {
  if (!_chalk) {
    const chalkModule = await import('chalk');
    _chalk = chalkModule.default;
  }
  return _chalk;
}

/**
 * Lazy-load boxen module
 */
export async function loadBoxen(): Promise<typeof BoxenType> {
  if (!_boxen) {
    const boxenModule = await import('boxen');
    _boxen = boxenModule.default;
  }
  return _boxen;
}

/**
 * Lazy-load ora module
 */
export async function loadOra(): Promise<typeof import('ora').default> {
  if (!_ora) {
    const oraModule = await import('ora');
    _ora = oraModule.default;
  }
  return _ora;
}

/**
 * Lazy-load inquirer module
 */
export async function loadInquirer(): Promise<typeof InquirerType> {
  if (!_inquirer) {
    const inquirerModule = await import('inquirer');
    _inquirer = inquirerModule.default;
  }
  return _inquirer;
}

/**
 * Reset cached modules (for testing)
 */
export function resetESMCache(): void {
  _chalk = null;
  _boxen = null;
  _ora = null;
  _inquirer = null;
}
```

#### Step 2: Refactor UI Layer Example

**Before** (`src/ui/console-output.ts`):
```typescript
import chalk from 'chalk';
import boxen from 'boxen';

export function success(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}

export function box(message: string): void {
  console.log(boxen(message, { padding: 1 }));
}
```

**After**:
```typescript
import { loadChalk, loadBoxen } from '../utils/esm-loaders';

export async function success(message: string): Promise<void> {
  const chalk = await loadChalk();
  console.log(chalk.green(`✓ ${message}`));
}

export async function box(message: string): Promise<void> {
  const boxen = await loadBoxen();
  console.log(boxen(message, { padding: 1 }));
}
```

#### Step 3: Update Test Mocks

**Update** (`tests/setup.ts`):
```typescript
// Mock ESM loaders instead of ESM modules
jest.mock('../src/utils/esm-loaders', () => ({
  loadChalk: jest.fn().mockResolvedValue({
    green: (str: string) => str,
    red: (str: string) => str,
    blue: (str: string) => str,
    // ... other chalk methods
  }),
  loadBoxen: jest.fn().mockResolvedValue((str: string) => str),
  loadOra: jest.fn().mockResolvedValue(() => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  })),
  loadInquirer: jest.fn().mockResolvedValue({
    prompt: jest.fn().mockResolvedValue({}),
  }),
  resetESMCache: jest.fn(),
}));
```

### Migration Checklist

**Phase 1: Infrastructure (0.5 days)**
- [ ] Create `src/utils/esm-loaders.ts`
- [ ] Add type definitions
- [ ] Add unit tests for loaders
- [ ] Update `tests/setup.ts` with new mocks

**Phase 2: UI Layer (1 day)**
- [ ] Refactor `src/ui/console-output.ts`
- [ ] Refactor `src/ui/box-formatter.ts`
- [ ] Refactor `src/ui/table-formatter.ts`
- [ ] Refactor `src/ui/progress-indicators.ts`
- [ ] Refactor `src/ui/banners.ts` (if needed)
- [ ] Update callers to handle async
- [ ] Run tests to verify

**Phase 3: Commands (1 day)**
- [ ] Refactor `src/commands/hansolo-init.ts`
- [ ] Refactor `src/commands/hansolo-validate.ts`
- [ ] Refactor `src/commands/hansolo-config.ts`
- [ ] Refactor `src/commands/hansolo-cleanup.ts`
- [ ] Refactor `src/commands/hansolo-status.ts`
- [ ] Refactor `src/commands/hansolo-sessions.ts`
- [ ] Refactor `src/commands/hansolo-perf.ts`
- [ ] Refactor `src/commands/hansolo-status-line.ts`
- [ ] Refactor `src/commands/interactive.ts`
- [ ] Run tests to verify

**Phase 4: Enable MCP Test (0.5 days)**
- [ ] Remove MCP test from `testPathIgnorePatterns`
- [ ] Run MCP server test
- [ ] Fix any remaining issues
- [ ] Verify all 40+ test cases pass

**Phase 5: CLI Layer (Optional - defer if time-constrained)**
- [ ] Refactor CLI installer files
- [ ] Run integration tests

---

## Part 2: Ship Command Refactoring

### Current State

**File**: `src/commands/hansolo-ship.ts`
**Lines**: 756
**Problems**:
- Mixes CLI concerns with business logic
- Difficult to test in isolation
- Hard to understand workflow flow
- Violates Single Responsibility Principle

### Refactoring Goals

1. **Extract business logic** to service layer
2. **Reduce command file** from 756 → ~250 lines
3. **Improve testability** with unit tests for services
4. **Maintain functionality** - zero regressions

### Architecture Plan

```
BEFORE:
┌─────────────────────────────────────┐
│   hansolo-ship.ts (756 lines)      │
│                                     │
│  - Parse arguments                  │
│  - Validate state                   │
│  - Pre-flight checks                │
│  - Commit changes                   │
│  - Push to remote                   │
│  - Create/update PR                 │
│  - Wait for CI                      │
│  - Merge PR                         │
│  - Cleanup branches                 │
│  - Post-flight checks               │
│  - Format output                    │
└─────────────────────────────────────┘

AFTER:
┌─────────────────────────────────────┐
│  hansolo-ship.ts (~250 lines)       │
│  - Parse arguments                  │
│  - Call orchestrator                │
│  - Format output                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  ship-orchestrator.ts (~300 lines)  │
│  - Pre/post-flight checks           │
│  - Workflow state management        │
│  - Orchestrate services             │
└─────────────────────────────────────┘
              ↓
      ┌───────┴────────┐
      ↓                ↓
┌─────────────┐  ┌─────────────┐
│ git-ops     │  │ pr-manager  │
│ (extend)    │  │ (~200 lines)│
│             │  │             │
│ - commit    │  │ - create PR │
│ - push      │  │ - wait CI   │
│             │  │ - merge     │
└─────────────┘  └─────────────┘
```

### New Service: ShipOrchestrator

**File**: `src/services/ship-orchestrator.ts`
**Responsibilities**:
- Execute pre-flight checks
- Orchestrate ship workflow steps
- Handle state transitions
- Execute post-flight verifications
- Coordinate between git-ops and pr-manager

**Public API**:
```typescript
export class ShipOrchestrator {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    private prManager: PRManager,
    private validator: ValidationService
  );

  /**
   * Execute complete ship workflow
   */
  async ship(options: ShipOptions): Promise<ShipResult>;

  /**
   * Execute pre-flight checks
   */
  async preFlightChecks(session: WorkflowSession): Promise<ValidationResult>;

  /**
   * Execute post-flight verifications
   */
  async postFlightVerifications(session: WorkflowSession): Promise<ValidationResult>;
}

export interface ShipOptions {
  message?: string;
  push?: boolean;
  createPR?: boolean;
  merge?: boolean;
  force?: boolean;
  yes?: boolean;
}

export interface ShipResult {
  success: boolean;
  committed: boolean;
  pushed: boolean;
  prCreated: boolean;
  prUrl?: string;
  merged: boolean;
  errors: string[];
}
```

### New Service: PRManager

**File**: `src/services/pr-manager.ts`
**Responsibilities**:
- Create pull requests
- Update existing PRs
- Wait for CI checks
- Auto-merge when ready
- Handle PR errors

**Public API**:
```typescript
export class PRManager {
  constructor(
    private githubClient: GitHubClient,
    private config: Configuration
  );

  /**
   * Create or update pull request
   */
  async createOrUpdatePR(options: PROptions): Promise<PRResult>;

  /**
   * Wait for CI checks to pass
   */
  async waitForCI(prNumber: number, options: WaitOptions): Promise<boolean>;

  /**
   * Merge pull request
   */
  async mergePR(prNumber: number, options: MergeOptions): Promise<void>;
}

export interface PROptions {
  branchName: string;
  title: string;
  body: string;
  base?: string;
}

export interface PRResult {
  prNumber: number;
  prUrl: string;
  created: boolean; // true if new, false if updated
}

export interface WaitOptions {
  timeout?: number;
  pollInterval?: number;
}

export interface MergeOptions {
  method?: 'squash' | 'merge' | 'rebase';
  commitTitle?: string;
  commitMessage?: string;
}
```

### Refactoring Checklist

**Phase 1: Create PRManager Service (1 day)**
- [ ] Create `src/services/pr-manager.ts`
- [ ] Extract PR creation logic from hansolo-ship.ts
- [ ] Extract CI waiting logic
- [ ] Extract merge logic
- [ ] Add comprehensive type definitions
- [ ] Write unit tests for PRManager
- [ ] Verify tests pass

**Phase 2: Create ShipOrchestrator Service (1 day)**
- [ ] Create `src/services/ship-orchestrator.ts`
- [ ] Extract pre-flight check orchestration
- [ ] Extract workflow orchestration
- [ ] Extract post-flight verification
- [ ] Add state management
- [ ] Write unit tests for ShipOrchestrator
- [ ] Verify tests pass

**Phase 3: Refactor hansolo-ship.ts (0.5 days)**
- [ ] Update hansolo-ship.ts to use new services
- [ ] Keep only CLI concerns (parsing, output)
- [ ] Remove extracted business logic
- [ ] Verify functionality unchanged
- [ ] Run all tests
- [ ] Verify line count reduced to ~250

**Phase 4: Integration Testing (0.5 days)**
- [ ] Run full test suite
- [ ] Manual testing of ship command
- [ ] Verify all workflow states work
- [ ] Check error handling
- [ ] Validate pre/post-flight checks

---

## Success Criteria

### ESM Module Resolution
- ✅ `src/utils/esm-loaders.ts` created and tested
- ✅ All UI layer files refactored (5 files)
- ✅ All command files refactored (9 files)
- ✅ MCP server test enabled and passing (40+ test cases)
- ✅ Test coverage increased from 10% → 15-20%
- ✅ Zero regressions in existing tests

### Ship Command Refactoring
- ✅ `ship-orchestrator.ts` created with full test coverage
- ✅ `pr-manager.ts` created with full test coverage
- ✅ `hansolo-ship.ts` reduced from 756 → ~250 lines
- ✅ All ship command tests passing
- ✅ Manual testing confirms zero regressions
- ✅ Improved code maintainability

### Overall
- ✅ All builds pass (TypeScript, lint, tests)
- ✅ Test suite shows 230+ tests passing (up from 191)
- ✅ Coverage at or above 15%
- ✅ Documentation complete

---

## Timeline

**Day 1**: ESM Infrastructure + UI Layer
- Create esm-loaders.ts (2 hours)
- Refactor UI layer (4 hours)
- Update test mocks (2 hours)

**Day 2**: Commands + Enable MCP Test
- Refactor 9 command files (5 hours)
- Enable MCP test (1 hour)
- Fix any issues (2 hours)

**Day 3**: Create PRManager Service
- Extract PR logic (4 hours)
- Write tests (3 hours)
- Integration testing (1 hour)

**Day 4**: Create ShipOrchestrator Service
- Extract orchestration logic (4 hours)
- Write tests (3 hours)
- Integration testing (1 hour)

**Day 5**: Refactor Ship Command + Validation
- Update hansolo-ship.ts (2 hours)
- Full test suite (1 hour)
- Manual testing (2 hours)
- Documentation (2 hours)
- Final validation (1 hour)

**Total**: 4-5 days

---

## Risk Mitigation

**Risk 1**: Async functions break calling code
- **Mitigation**: Update callers systematically, test frequently

**Risk 2**: Test mocks don't match real module APIs
- **Mitigation**: Type-check mocks, add integration tests

**Risk 3**: Ship command refactoring introduces bugs
- **Mitigation**: Comprehensive tests before and after, manual testing

**Risk 4**: Timeline slips
- **Mitigation**: ESM fixes are priority, ship refactor can slip to Phase 4 if needed

---

## Next Steps

1. Create `src/utils/esm-loaders.ts`
2. Update `tests/setup.ts` with new mocks
3. Start refactoring UI layer files
4. Run tests frequently to catch issues early
5. Track progress with TodoWrite tool
