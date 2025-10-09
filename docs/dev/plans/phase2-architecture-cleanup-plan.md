# Chore: Phase 2 Architecture Cleanup

## Chore Description

Phase 2 of the codebase optimization plan focuses on architectural improvements with high impact on maintainability and test reliability. This phase addresses three critical issues identified in the comprehensive codebase analysis:

1. **Remove Dead MCP Server Code** - Delete 2,595 lines of unused legacy MCP server implementation that's only referenced in tests but not used in production
2. **Fix Test Suite** - Re-enable ~50% of tests currently skipped, fix type issues, and restore proper test coverage
3. **Refactor Large Command Files** - Extract business logic from oversized command files (700+ lines) into services

**Expected Impact:**
- **Code Reduction**: ~2,600 lines removed (dead code)
- **Test Coverage**: 3% → 80%+ (currently effectively disabled)
- **Maintainability**: Command files reduced from 700+ lines to <300 lines each
- **Test Reliability**: Tests will validate actual production code instead of dead legacy code

**Complexity**: High (touching tests, build system, and core architecture)
**Time Estimate**: 1 week
**Risk**: Medium (extensive test changes, but dead code removal is safe)

---

## Relevant Files

### Dead MCP Server Code (To Delete)

**src/mcp-server/** - 2,595 lines of legacy MCP implementation
- `src/mcp-server/server.ts` (795 lines) - Old MCP server, not used in production
- `src/mcp-server/tool-registry.ts` (3.4k) - Legacy tool registry
- `src/mcp-server/tools/*.ts` (11 files) - Old tool implementations
- **Why relevant**: Dead code that only exists for tests, creates confusion, uses 96KB

**bin/hansolo-mcp-enhanced** - Broken binary
- References non-existent `dist/mcp/hansolo-mcp-server-enhanced.js`
- **Why relevant**: Non-functional binary that should be removed

**Tests importing old server** (12 files):
- `tests/contracts/cleanup-operations.test.ts`
- `tests/contracts/create-branch.test.ts`
- `tests/contracts/manage-status-line.test.ts`
- `tests/contracts/rebase-on-main.test.ts`
- `tests/contracts/swap-session.test.ts`
- `tests/contracts/validate-environment.test.ts`
- `tests/integration/scenario-1-init-project.test.ts`
- `tests/integration/scenario-2-feature-development.test.ts`
- `tests/integration/scenario-3-ship-code.test.ts`
- `tests/integration/scenario-4-hotfix.test.ts`
- `tests/integration/scenario-5-multi-session.test.ts`
- `tests/integration/scenario-6-no-ai-fallback.test.ts`
- **Why relevant**: All import from dead `mcp-server/server`, need to be updated to use `mcp/hansolo-mcp-server`

### Production MCP Server (Keep)

**src/mcp/hansolo-mcp-server.ts** (1,180 lines)
- **Why relevant**: This is the ACTUAL production server used by `bin/hansolo-mcp`

**bin/hansolo-mcp**
- **Why relevant**: Working binary that uses correct server, should be kept

### Test Configuration

**jest.config.js**
- Has 19 test files/directories in `testPathIgnorePatterns`
- Coverage threshold set to 3% (effectively disabled)
- **Why relevant**: Need to remove ignore patterns, fix ESM issues, raise coverage threshold

**Skipped tests** (from testPathIgnorePatterns):
```
/src/__tests__/models/workflow-session.test.ts
/src/__tests__/services/session-repository.test.ts
/src/__tests__/state-machines/
/tests/integration/                              (all 6 scenario tests)
/tests/contracts/                                (all 6 contract tests)
/tests/mcp/hansolo-mcp-server.test.ts
/tests/models/audit-entry.test.ts
/tests/models/configuration.test.ts
/tests/models/state-transition.test.ts
/tests/models/workflow-state.test.ts
/tests/state-machines/ship-workflow.test.ts
/tests/state-machines/hotfix-workflow.test.ts
```
- **Why relevant**: These need to be re-enabled and fixed

### Large Command Files (For Refactoring)

**High Priority** (>500 lines):
- `src/commands/hansolo-ship.ts` (708 lines) - Ship workflow orchestration
- `src/commands/hansolo-status-line.ts` (643 lines) - Status line management
- `src/commands/hansolo-validate.ts` (580 lines) - Validation command
- `src/commands/hansolo-config.ts` (578 lines) - Configuration management
- `src/commands/hansolo-launch.ts` (561 lines) - Launch workflow
- `src/commands/hansolo-hotfix.ts` (544 lines) - Hotfix workflow
- `src/commands/hansolo-cleanup.ts` (521 lines) - Cleanup operations

**Why relevant**: Violate single responsibility principle, mix business logic with CLI concerns, difficult to test and maintain

### Package Configuration

**package.json**
- `bin.hansolo-mcp-enhanced` - Broken binary to remove
- `scripts.mcp:start` - References non-existent file
- **Why relevant**: Need to clean up broken binaries and scripts

### New Files

None required - this is primarily deletion and refactoring work.

---

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Step 1: Audit Current State and Create Baseline

- Run current test suite to establish baseline: `npm test`
- Document which tests pass (should be 132 tests in 8 suites)
- Save test output to docs/dev/reports/phase2-baseline-tests.txt
- Run coverage report to document current state: `npm run test:coverage`
- Count total lines of code: `find src -name "*.ts" | xargs wc -l | tail -1`
- Document current state in docs/dev/reports/phase2-before-metrics.md

**Rationale**: Establish baseline to measure impact and ensure no regressions in currently passing tests.

### Step 2: Remove Dead MCP Server Directory

- Delete entire `src/mcp-server/` directory: `rm -rf src/mcp-server/`
- Verify deletion: `ls src/mcp-server/ 2>&1 | grep "No such file"`
- Remove from git: `git rm -rf src/mcp-server/`

**Rationale**: This code is not imported anywhere in production (verified via grep). Only tests use it, and those tests don't validate production behavior.

**Expected Result**: -2,595 lines of dead code, -96KB

### Step 3: Remove Broken Binary and Scripts

- Delete broken binary: `rm bin/hansolo-mcp-enhanced`
- Update package.json to remove `hansolo-mcp-enhanced` from bin section
- Update package.json scripts:
  - Remove `mcp:start` (references non-existent file)
  - Rename `mcp:start:legacy` to `mcp:start` (this is the real one)
- Update package.json to reflect single MCP implementation

**Rationale**: Binary doesn't work (references non-existent file), creates confusion about which server to use.

**Expected Result**: Single clear MCP binary and script.

### Step 4: Update Contract Tests to Use Production Server

Update all 6 contract tests to import from production server:

**For each test in tests/contracts/:**
- Change: `import { MCPServer } from '../../src/mcp-server/server';`
- To: `import { HanSoloMCPServer } from '../../src/mcp/hansolo-mcp-server';`
- Update test setup to use `HanSoloMCPServer` class
- Update test expectations to match production server API (may differ from old server)

**Files to update:**
1. tests/contracts/cleanup-operations.test.ts
2. tests/contracts/create-branch.test.ts
3. tests/contracts/manage-status-line.test.ts
4. tests/contracts/rebase-on-main.test.ts
5. tests/contracts/swap-session.test.ts
6. tests/contracts/validate-environment.test.ts

**Rationale**: Tests should validate production code, not legacy dead code.

### Step 5: Update Integration Tests to Use Production Server

Update all 6 integration scenario tests similarly:

**For each test in tests/integration/:**
- Change import from `mcp-server/server` to `mcp/hansolo-mcp-server`
- Update instantiation to use `HanSoloMCPServer`
- Fix any API differences between old and new server
- Verify test scenarios still make sense

**Files to update:**
1. tests/integration/scenario-1-init-project.test.ts
2. tests/integration/scenario-2-feature-development.test.ts
3. tests/integration/scenario-3-ship-code.test.ts
4. tests/integration/scenario-4-hotfix.test.ts
5. tests/integration/scenario-5-multi-session.test.ts
6. tests/integration/scenario-6-no-ai-fallback.test.ts

**Rationale**: Integration tests should test actual production workflows.

### Step 6: Fix Model Tests with Type Issues

Re-enable and fix model tests (currently skipped due to type issues):

**Files to fix:**
- tests/models/audit-entry.test.ts
- tests/models/configuration.test.ts
- tests/models/state-transition.test.ts
- tests/models/workflow-state.test.ts

**For each test:**
- Review TypeScript errors
- Fix type assertions and mocks
- Update test data to match current type definitions
- Ensure tests pass

**Rationale**: Model tests are foundational - they validate core data structures.

### Step 7: Fix State Machine Tests

Re-enable and fix state machine tests:

**Files to fix:**
- tests/state-machines/ship-workflow.test.ts
- tests/state-machines/hotfix-workflow.test.ts
- src/__tests__/state-machines/* (all files)

**For each test:**
- Fix type issues
- Update mocks to match current interfaces
- Verify state transitions test correctly
- Ensure all state machine paths are tested

**Rationale**: State machines are core to han-solo's workflow management.

### Step 8: Fix ESM Module Issues for MCP Server Test

Re-enable tests/mcp/hansolo-mcp-server.test.ts:

**Issue**: Test fails due to ESM module handling for chalk/boxen

**Solutions to try:**
1. Mock chalk and boxen in test setup
2. Use jest's ESM support (update jest.config.js)
3. Convert problematic imports to dynamic imports in tests
4. Use ts-jest's transform options for ESM packages

**Rationale**: The production MCP server needs test coverage.

### Step 9: Remove Duplicate Tests

Remove duplicate tests from src/__tests__/:

**Files to delete (duplicates exist in tests/):**
- src/__tests__/models/workflow-session.test.ts (duplicate of tests/models/workflow-session.test.ts)
- src/__tests__/services/session-repository.test.ts (duplicate exists)

**Rationale**: Tests should be in /tests directory, not scattered in /src. Eliminates duplication and confusion.

### Step 10: Update jest.config.js

Update test configuration to reflect fixed tests:

**Changes:**
1. Remove ALL entries from `testPathIgnorePatterns` except `/node_modules/`
2. Update `coverageThreshold` from 3% to reasonable targets:
   ```javascript
   coverageThreshold: {
     global: {
       branches: 60,
       functions: 70,
       lines: 75,
       statements: 75
     }
   }
   ```
3. Ensure ESM support is configured for chalk/boxen
4. Keep `testTimeout: 10000` for integration tests

**Rationale**: All tests should run, coverage should be meaningful.

### Step 11: Run Full Test Suite and Fix Failures

- Run complete test suite: `npm test`
- Identify all failures
- Fix failures one by one:
  - Type errors
  - Mock issues
  - API changes between old and new MCP server
  - Timing issues in integration tests
- Document each fix
- Ensure all tests pass

**Rationale**: Verify test suite is fully functional before proceeding.

### Step 12: Refactor hansolo-ship.ts (Highest Priority)

**Current**: 708 lines, mixes business logic with CLI concerns

**Refactoring plan:**
1. Extract ship workflow logic to `src/services/ship-workflow-service.ts`
2. Extract PR operations to `src/services/pr-service.ts` (or extend github-integration.ts)
3. Extract commit operations to separate methods in git-operations.ts
4. Keep command file as thin orchestrator (~200-250 lines)

**Service responsibilities:**
- **ShipWorkflowService**: Orchestrate entire ship workflow, state transitions
- **PRService**: Handle PR creation, updates, waiting for CI, merging
- **GitOperations** (extend): Add commit, push methods if missing

**Rationale**: Separation of concerns, easier to test, easier to understand.

### Step 13: Refactor hansolo-status-line.ts

**Current**: 643 lines

**Refactoring plan:**
1. Extract status line formatting to `src/services/status-line-formatter.ts`
2. Extract status line configuration to `src/services/status-line-config.ts`
3. Keep command as orchestrator

**Target**: <250 lines

**Rationale**: Status line logic is reusable, should be in service layer.

### Step 14: Refactor hansolo-validate.ts

**Current**: 580 lines

**Refactoring plan:**
1. Extract validation logic to existing validation services
2. Use `src/services/validation/` directory structure
3. Command should just call validators and format output

**Target**: <250 lines

**Rationale**: Validation logic already has a service structure, command shouldn't implement it.

### Step 15: Consider Refactoring Other Large Commands

**If time permits**, apply same pattern to:
- hansolo-config.ts (578 lines)
- hansolo-launch.ts (561 lines)
- hansolo-hotfix.ts (544 lines)
- hansolo-cleanup.ts (521 lines)

**If not enough time**, document plan for future work and move on.

**Rationale**: These are lower priority than fixing tests and removing dead code.

### Step 16: Run All Validation Commands

Execute comprehensive validation (see Validation Commands section below).

**Rationale**: Ensure zero regressions before shipping.

### Step 17: Document Changes and Metrics

Create summary report in docs/dev/reports/phase2-architecture-cleanup-summary.md:

**Include:**
- Lines of code removed
- Test coverage before/after
- Number of tests re-enabled
- Command file size reductions
- Build time impact
- Any breaking changes or API changes

**Rationale**: Track impact and provide reference for future work.

---

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

**Build and Type Checking:**
- `npm run clean` - Clean all build artifacts
- `npm run build` - Build main project
- `npm run build:mcp` - Build MCP server
- `npm run typecheck` - Verify no type errors
- `npm run lint` - Verify no linting errors (should be 0 errors, warnings OK)

**Test Suite:**
- `npm test` - Run full test suite (should pass 100%)
- `npm run test:coverage` - Generate coverage report (should meet new thresholds)
- `npm run test:unit` - Run unit tests specifically
- `npm run test:integration` - Run integration tests (currently disabled, should work after fix)
- `npm run test:mcp` - Run MCP tests (currently disabled, should work after fix)

**Functionality Verification:**
- `node dist/index.js --help` - Verify CLI works
- `node dist/mcp/hansolo-mcp-server.js --help` - Verify MCP server starts (should error or show help)
- `npm run mcp:start` - Verify MCP start script works (kill after startup)

**Code Quality:**
- `find src -name "*.ts" | xargs wc -l | tail -1` - Count total source lines (should be ~2,600 less)
- `find src/mcp-server -type f 2>&1 | grep "No such file"` - Verify mcp-server deleted
- `find src/commands -name "*.ts" -exec wc -l {} \; | awk '{if ($1 > 300) print}'` - Verify no command >300 lines (after refactoring)
- `grep -r "from.*mcp-server/server" src tests` - Verify no imports from old server (should return nothing)

**Package Integrity:**
- `npm ls` - Verify no broken dependencies
- `npm audit` - Check for security issues (fix if introduced)
- `cat package.json | grep hansolo-mcp-enhanced` - Verify broken binary removed (should return nothing)

**Git Status:**
- `git status` - Should show only intended changes
- `git diff --stat` - Review all changes

---

## Notes

### Why This Is High Impact

1. **Test Reliability**: Currently testing dead code that isn't used in production. After this, tests validate actual production behavior.
2. **Code Reduction**: Removing 2,600 lines of dead code reduces maintenance burden and confusion.
3. **Coverage**: Going from 3% (effectively disabled) to 75%+ gives confidence in refactoring and future changes.
4. **Maintainability**: Smaller command files (300 lines vs 700) are easier to understand and modify.

### Risks and Mitigations

**Risk 1: Tests may reveal bugs in production code**
- **Mitigation**: This is actually good! Better to find them now. Fix bugs as they're discovered.

**Risk 2: Integration tests may be flaky**
- **Mitigation**: Increase test timeout, add retries, improve mocking. Document flaky tests separately.

**Risk 3: MCP server API may differ between old and new**
- **Mitigation**: Update tests to match production API. If production API is wrong, file separate issue.

**Risk 4: Refactoring large commands may introduce bugs**
- **Mitigation**: Test coverage must pass before and after refactoring. Refactor incrementally.

### Dependencies Between Steps

**Must be sequential:**
- Steps 1-3 (baseline, delete dead code, remove binary)
- Steps 4-5 (update tests to use new server) must happen before Step 11 (run tests)
- Step 10 (update jest.config) must happen before Step 11 (run full test suite)
- Steps 12-15 (refactoring) can only happen after tests pass (Step 11)

**Can be parallel:**
- Steps 4-9 (fixing different test categories) can be done in any order
- Steps 12-15 (refactoring different commands) can be done in any order

### Time Estimates

- Steps 1-3 (Dead code removal): 2 hours
- Steps 4-5 (Update contract/integration tests): 1 day
- Steps 6-9 (Fix model/state machine/MCP tests): 1 day
- Step 10-11 (Jest config and run tests): 4 hours
- Steps 12-14 (Refactor top 3 commands): 2 days
- Step 15 (Optional: refactor remaining): 1 day (if time)
- Steps 16-17 (Validation and documentation): 4 hours

**Total**: 5-6 days (1 week sprint)

### Success Criteria

✅ **Code Cleanup:**
- `src/mcp-server/` directory deleted (~2,600 lines removed)
- No imports from `mcp-server/` anywhere in codebase
- Broken binary and scripts removed

✅ **Test Coverage:**
- All 19+ skipped test files re-enabled
- Test suite passes 100%
- Coverage ≥75% lines, ≥70% functions, ≥60% branches
- Tests validate production code, not legacy code

✅ **Command Refactoring:**
- At minimum: ship.ts, status-line.ts, validate.ts refactored
- All refactored commands <300 lines
- Business logic in services, commands are thin orchestrators

✅ **Zero Regressions:**
- All builds pass
- All current tests still pass
- CLI functionality preserved
- No new TypeScript errors

### Related Documentation

- Phase 1 cleanup summary: docs/dev/reports/codebase-cleanup-phase1-summary.md
- Original optimization report: Created during codebase analysis
- Test organization: jest.config.js
- MCP integration: docs/guides/mcp-integration.md

### Future Work (Phase 3)

After Phase 2 completes, Phase 3 will address:
- Consolidate validation logic (scattered across 11 files)
- Replace 281+ console.log calls with centralized logger
- Adopt path aliases (@/ imports) throughout codebase
- Refactor remaining large commands (config, launch, hotfix, cleanup)
