# Phase 3: Pure MCP Architecture (The Bold Pivot)

**Date**: 2025-10-10
**Branch**: test/balanced-refactoring-and-esm-tests
**Type**: Architectural Pivot
**Time Estimate**: 3-4 days

## Executive Summary

**MAJOR ARCHITECTURAL DECISION**: Pivot han-solo from a dual CLI/MCP tool to a **pure MCP server** with optional CLI wrapper layer for future.

This eliminates:
- ❌ All ESM module issues (no more ora, chalk, boxen, inquirer complexity)
- ❌ Complex CLI argument parsing (~2,000 lines)
- ❌ Terminal output formatting overhead
- ❌ Shell completions, man pages, CLI documentation
- ❌ Testing complexity from mocking terminal libraries

This enables:
- ✅ Native ESM support throughout
- ✅ AI-first development paradigm
- ✅ Rich structured responses for AI context
- ✅ Simpler testing (test MCP tools directly)
- ✅ ~40% codebase reduction
- ✅ **Strong pre/post-flight checks** in every MCP tool
- ✅ Future-proof architecture aligned with Anthropic's strategy

## Vision

han-solo becomes a **pure MCP server** that provides Git workflow automation tools exclusively through the Model Context Protocol. This makes it:

1. **AI-Native** - Designed for Claude Code and other MCP clients
2. **Clean Architecture** - Single interface, single responsibility
3. **Maintainable** - Less code, fewer dependencies, simpler tests
4. **Extensible** - Easy to add new MCP tools
5. **Future-Ready** - Aligned with AI development trends

**If CLI is needed later**, it becomes a thin wrapper (100-200 lines) that:
- Imports MCP server
- Calls MCP tools internally
- Formats structured responses for terminal
- Single source of truth (MCP server)

## Current Architecture (To Remove)

```
┌─────────────────────────────────────┐
│         CLI Entry (bin/hansolo.js)   │  ❌ DELETE
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Command Files (src/commands/)     │  ❌ DELETE (keep logic)
│    - Argument parsing                │
│    - Help text                       │
│    - Terminal output                 │
│    - ora/chalk/boxen/inquirer        │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Services Layer                    │  ✅ KEEP
│    - git-operations                  │
│    - session-repository              │
│    - github-integration              │
└─────────────────────────────────────┘

ALSO DELETE:
- completions/ (bash, zsh)
- man/ (man pages)
- src/ui/ (terminal formatting)
- src/cli/ (installer wizard)
```

## New Architecture (Pure MCP)

```
┌─────────────────────────────────────┐
│      MCP Server (bin/hansolo-mcp)    │  ✅ MAIN ENTRY
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   MCP Tools (src/mcp/tools/)         │  ✅ NEW STRUCTURE
│   - hansolo_init                     │
│   - hansolo_launch                   │
│   - hansolo_ship                     │
│   - hansolo_swap                     │
│   - hansolo_abort                    │
│   - hansolo_sessions                 │
│   - hansolo_status                   │
│   - hansolo_cleanup                  │
│   - hansolo_hotfix                   │
│                                      │
│   Each tool:                         │
│   - Pre-flight checks ✓              │
│   - Business logic                   │
│   - Post-flight verifications ✓      │
│   - Structured response              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Services Layer                    │  ✅ KEEP & ENHANCE
│    - git-operations                  │
│    - session-repository              │
│    - github-integration              │
│    - validation-service              │
│    - pre-flight-checks               │
│    - post-flight-checks              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│    Models & State Machines           │  ✅ KEEP
│    - workflow-session                │
│    - workflow-state                  │
│    - launch-workflow                 │
│    - ship-workflow                   │
└─────────────────────────────────────┘
```

## What to DELETE

### 1. CLI Infrastructure (~1,500 lines)
```bash
# Binaries
bin/hansolo.js                          # CLI entry point

# Completions
completions/hansolo.bash
completions/hansolo.zsh

# Man pages
man/hansolo.1

# Examples
examples/basic-workflow.sh
examples/advanced-workflow.js
```

### 2. Command Files (~5,000 lines - keep logic, delete CLI)
```bash
src/commands/
├── hansolo-init.ts          (578 lines) - Extract logic, delete CLI
├── hansolo-launch.ts        (561 lines) - Extract logic, delete CLI
├── hansolo-ship.ts          (756 lines) - Extract logic, delete CLI
├── hansolo-swap.ts          (xxx lines) - Extract logic, delete CLI
├── hansolo-abort.ts         (xxx lines) - Extract logic, delete CLI
├── hansolo-sessions.ts      (xxx lines) - Extract logic, delete CLI
├── hansolo-status.ts        (xxx lines) - Extract logic, delete CLI
├── hansolo-cleanup.ts       (521 lines) - Extract logic, delete CLI
├── hansolo-hotfix.ts        (544 lines) - Extract logic, delete CLI
├── hansolo-config.ts        (578 lines) - Extract logic, delete CLI
├── hansolo-validate.ts      (580 lines) - Extract logic, delete CLI
├── hansolo-perf.ts          (xxx lines) - Extract logic, delete CLI
├── hansolo-status-line.ts   (643 lines) - DELETE (MCP handles this)
├── interactive.ts           (xxx lines) - DELETE
├── command-registry.ts      (xxx lines) - DELETE
└── command-adapters.ts      (xxx lines) - DELETE
```

### 3. UI Layer (~1,000 lines - no longer needed)
```bash
src/ui/
├── console-output.ts       # DELETE (no terminal output)
├── box-formatter.ts        # DELETE
├── table-formatter.ts      # DELETE
├── progress-indicators.ts  # DELETE (no ora spinners)
├── banners.ts             # DELETE
└── ascii-art.ts           # DELETE
```

### 4. CLI Components (~800 lines)
```bash
src/cli/
├── InstallerWizard.ts     # DELETE
├── components/
│   ├── ProgressIndicator.ts
│   ├── WelcomeBanner.ts
│   └── ThemeManager.ts
└── steps/
    ├── IntegrationStep.ts
    ├── WorkflowStep.ts
    ├── UIStep.ts
    └── ReviewStep.ts
```

### 5. Dependencies (package.json)
```json
{
  "dependencies": {
    // DELETE - no longer needed
    "ora": "^6.x",
    "chalk": "^5.x",
    "boxen": "^7.x",
    "inquirer": "^9.x",
    "cli-spinners": "^2.x",
    "cli-table3": "^0.6.x",

    // KEEP - still needed
    "@modelcontextprotocol/sdk": "^x.x",
    "simple-git": "^3.x",
    "@octokit/rest": "^20.x",
    "yaml": "^2.x"
  }
}
```

**Total Deletion**: ~8,300 lines of code

## What to KEEP

### 1. Core Services (Already Good!)
```bash
src/services/
├── git-operations.ts           ✅ KEEP
├── session-repository.ts       ✅ KEEP
├── github-integration.ts       ✅ KEEP
├── configuration-manager.ts    ✅ KEEP
├── validation-service.ts       ✅ KEEP
├── branch-naming.ts           ✅ KEEP
├── stash-manager.ts           ✅ KEEP
├── audit-logger.ts            ✅ KEEP
└── validation/
    ├── pre-flight-checks.ts   ✅ KEEP & ENHANCE
    ├── post-flight-checks.ts  ✅ KEEP & ENHANCE (create if missing)
    ├── branch-validator.ts    ✅ KEEP
    └── pr-validator.ts        ✅ KEEP
```

### 2. Models & State Machines
```bash
src/models/                    ✅ KEEP ALL
src/state-machines/            ✅ KEEP ALL
```

### 3. MCP Server (The Star!)
```bash
src/mcp/
├── hansolo-mcp-server.ts     ✅ KEEP & ENHANCE
└── index.ts                  ✅ KEEP
```

### 4. Core Infrastructure
```bash
src/
├── index.ts                  ✅ KEEP (exports for testing)
├── integrations/             ✅ KEEP
├── plugins/                  ✅ KEEP
└── utils/                    ✅ KEEP (minus esm-loaders.ts - no longer needed!)
```

## New MCP Tool Structure

Each MCP tool will have this structure:

```typescript
// src/mcp/tools/hansolo-launch.ts

import { PreFlightChecks } from '../../services/validation/pre-flight-checks';
import { PostFlightVerification } from '../../services/validation/post-flight-verification';
import { LaunchWorkflow } from '../../state-machines/launch-workflow';
import { SessionRepository } from '../../services/session-repository';
import { GitOperations } from '../../services/git-operations';
import { BranchNaming } from '../../services/branch-naming';

export interface LaunchToolInput {
  branchName?: string;
  description?: string;
  force?: boolean;
  stashRef?: string;
  popStash?: boolean;
}

export interface LaunchToolResult {
  success: boolean;
  sessionId: string;
  branchName: string;
  state: string;
  preFlightChecks: PreFlightCheckResult[];
  postFlightVerifications: PostFlightCheckResult[];
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}

export class LaunchTool {
  constructor(
    private sessionRepo: SessionRepository,
    private gitOps: GitOperations,
    private branchNaming: BranchNaming,
    private preFlightChecks: PreFlightChecks,
    private postFlightVerification: PostFlightVerification
  ) {}

  async execute(input: LaunchToolInput): Promise<LaunchToolResult> {
    // 1. PRE-FLIGHT CHECKS ✓
    const preFlightResults = await this.preFlightChecks.runAll([
      'onMainBranch',
      'workingDirectoryClean',
      'mainUpToDate',
      'noExistingSession',
      'branchNameAvailable'
    ]);

    if (!preFlightResults.allPassed && !input.force) {
      return {
        success: false,
        preFlightChecks: preFlightResults.checks,
        errors: preFlightResults.failures,
        warnings: ['Use force: true to override pre-flight failures']
      };
    }

    // 2. GENERATE BRANCH NAME
    const branchName = input.branchName ||
      await this.branchNaming.generateBranchName(input.description || 'feature');

    // 3. EXECUTE WORKFLOW
    const workflow = new LaunchWorkflow(this.sessionRepo, this.gitOps);
    const session = await workflow.execute({
      branchName,
      description: input.description,
      stashRef: input.stashRef,
      popStash: input.popStash
    });

    // 4. POST-FLIGHT VERIFICATIONS ✓
    const postFlightResults = await this.postFlightVerification.runAll([
      'sessionCreated',
      'featureBranchCreated',
      'branchCheckedOut',
      'sessionStateCorrect',
      'noUncommittedChanges'
    ], { session });

    // 5. RETURN STRUCTURED RESULT
    return {
      success: postFlightResults.allPassed,
      sessionId: session.id,
      branchName: session.branchName,
      state: session.currentState,
      preFlightChecks: preFlightResults.checks,
      postFlightVerifications: postFlightResults.checks,
      errors: postFlightResults.failures,
      warnings: postFlightResults.warnings,
      nextSteps: [
        'Make your code changes',
        'Use hansolo_ship to commit, push, and create PR',
        'Use hansolo_status to check current state'
      ]
    };
  }
}
```

## Implementation Plan

### Phase 1: Preparation (Day 1 Morning)

**1.1 Create Pre/Post-Flight Check Services**
- [ ] Create `src/services/validation/post-flight-verification.ts`
- [ ] Enhance `src/services/validation/pre-flight-checks.ts`
- [ ] Add comprehensive check definitions
- [ ] Add structured result types

**1.2 Create New MCP Tool Structure**
- [ ] Create `src/mcp/tools/` directory
- [ ] Create base tool interface/class
- [ ] Define structured result types
- [ ] Create error handling utilities

### Phase 2: Extract Business Logic (Day 1 Afternoon)

For each command, extract business logic to MCP tools:

**2.1 Launch Command**
- [ ] Create `src/mcp/tools/hansolo-launch.ts`
- [ ] Extract logic from `src/commands/hansolo-launch.ts`
- [ ] Add pre-flight checks
- [ ] Add post-flight verifications
- [ ] Write unit tests

**2.2 Ship Command**
- [ ] Create `src/mcp/tools/hansolo-ship.ts`
- [ ] Extract logic from `src/commands/hansolo-ship.ts`
- [ ] Add pre-flight checks
- [ ] Add post-flight verifications
- [ ] Write unit tests

**2.3 Other Commands**
- [ ] sessions, swap, abort, status, cleanup, hotfix, init
- [ ] Follow same pattern for each

### Phase 3: Update MCP Server (Day 2 Morning)

**3.1 Refactor MCP Server**
- [ ] Update `src/mcp/hansolo-mcp-server.ts`
- [ ] Import new tool implementations
- [ ] Update tool handlers to use new tools
- [ ] Return structured responses
- [ ] Remove CLI-specific formatting

**3.2 Enhance Tool Schemas**
- [ ] Update input schemas with better descriptions
- [ ] Add output schema definitions
- [ ] Add examples to tool definitions

### Phase 4: Delete CLI Infrastructure (Day 2 Afternoon)

**4.1 Delete Files**
```bash
rm -rf bin/hansolo.js
rm -rf completions/
rm -rf man/
rm -rf src/commands/
rm -rf src/ui/
rm -rf src/cli/
rm -rf examples/*.sh examples/*.js
rm src/utils/esm-loaders.ts  # No longer needed!
```

**4.2 Update package.json**
- [ ] Remove CLI dependencies (ora, chalk, boxen, inquirer, cli-table3)
- [ ] Update bin section (keep only hansolo-mcp)
- [ ] Update scripts (remove CLI-related scripts)
- [ ] Update exports

**4.3 Update TypeScript Config**
- [ ] Remove CLI entry points
- [ ] Update paths
- [ ] Verify build configuration

### Phase 5: Update Tests (Day 3 Morning)

**5.1 Delete CLI Tests**
```bash
rm -rf tests/commands/      # CLI command tests
rm -rf tests/cli/           # CLI component tests
rm -rf tests/integration/   # CLI integration tests
rm -rf tests/contracts/     # CLI contract tests
```

**5.2 Enhance MCP Tests**
- [ ] Update `tests/mcp/hansolo-mcp-server.test.ts`
- [ ] Add tests for new tool structure
- [ ] Test pre-flight checks
- [ ] Test post-flight verifications
- [ ] Test structured responses

**5.3 Keep Service Tests**
- [ ] All tests in `tests/services/` ✓
- [ ] All tests in `tests/models/` ✓
- [ ] All tests in `tests/state-machines/` ✓

### Phase 6: Update Documentation (Day 3 Afternoon)

**6.1 Update README.md**
- [ ] Remove CLI examples
- [ ] Add MCP-only setup instructions
- [ ] Update Quick Start for Claude Code
- [ ] Add MCP tool reference
- [ ] Update architecture diagram

**6.2 Update docs/**
- [ ] Archive CLI documentation
- [ ] Create MCP tool reference
- [ ] Update quickstart guide
- [ ] Update troubleshooting for MCP
- [ ] Add migration guide for existing users

**6.3 Add MIGRATION.md**
- [ ] Document architectural change
- [ ] Explain benefits
- [ ] Show before/after examples
- [ ] Provide migration path
- [ ] Add "Future CLI" section

### Phase 7: Validation & Polish (Day 4)

**7.1 Build & Test**
- [ ] `npm run build` - should pass
- [ ] `npm test` - all tests pass
- [ ] `npm run typecheck` - no errors
- [ ] Manual MCP testing in Claude Code

**7.2 Metrics**
- [ ] Count lines removed
- [ ] Measure test coverage
- [ ] Document dependencies removed
- [ ] Measure build time improvement

**7.3 Documentation**
- [ ] Create phase 3 summary report
- [ ] Document architectural decision
- [ ] Update changelog
- [ ] Create release notes

## Success Criteria

✅ **Code Quality:**
- ~8,000 lines of code removed
- Zero CLI dependencies (ora, chalk, boxen, inquirer)
- All service layer tests passing
- MCP server tests passing (40+ test cases)
- Build time reduced by ~30%

✅ **Functionality:**
- All MCP tools working in Claude Code
- Strong pre-flight checks on every tool
- Strong post-flight verifications on every tool
- Structured responses for AI context
- Zero regressions in Git operations

✅ **Architecture:**
- Single interface (MCP)
- Clean separation of concerns
- Native ESM support
- Testable without mocking terminal
- Future-ready for additional MCP clients

✅ **Documentation:**
- README updated for MCP-only
- Migration guide complete
- MCP tool reference created
- Architecture decision documented

## Benefits Realized

1. **No More ESM Issues** - Native ESM, no lazy-loading, no mocking complexity
2. **Simpler Codebase** - 40% reduction, easier to understand and maintain
3. **Better Testing** - Test MCP tools directly, no terminal mocking
4. **AI-First** - Designed for Claude Code, structured responses
5. **Future-Proof** - Aligned with MCP ecosystem growth
6. **Faster Development** - Less code to maintain, clearer architecture

## Migration Path for Users

**Existing CLI Users:**
```bash
# Before (CLI)
hansolo init
hansolo launch --branch feature/auth
hansolo ship --message "feat: add auth"

# After (MCP via Claude Code)
/hansolo:init
/hansolo:launch --branchName feature/auth
/hansolo:ship --message "feat: add auth"
```

**CI/CD Users:**
- Wait for thin CLI wrapper (Phase 4)
- Or use MCP programmatically
- Or fork and maintain CLI version

**Claude Code Users:**
- No change needed!
- Better experience with structured responses
- More reliable with pre/post-flight checks

## Future: Optional Thin CLI Wrapper

If CLI is needed later (Phase 4+):

```typescript
// bin/hansolo-cli.ts (~100-200 lines)

import { HanSoloMCPServer } from '../src/mcp/hansolo-mcp-server';

async function cli() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse args to MCP tool input
  const input = parseArgsToMCPInput(args);

  // Call MCP server internally
  const server = new HanSoloMCPServer();
  const result = await server.executeTool(command, input);

  // Format structured response for terminal
  formatForTerminal(result);
}

cli().catch(console.error);
```

**Benefits:**
- Single source of truth (MCP server)
- CLI is just a formatter
- Easy to maintain
- Can add later without disruption

## Risk Mitigation

**Risk 1:** Breaking change for current users
- **Mitigation:** Clear migration guide, version bump to 2.0.0, maintain 1.x branch

**Risk 2:** Lost functionality
- **Mitigation:** All functionality preserved in MCP tools, just different interface

**Risk 3:** CI/CD breakage
- **Mitigation:** Document MCP programmatic usage, plan thin CLI wrapper

**Risk 4:** Timeline slip
- **Mitigation:** Mostly deletions, clear plan, can ship incrementally

## Conclusion

This architectural pivot positions han-solo as a **best-in-class AI-native Git workflow tool**. By embracing MCP as the primary interface, we:

- Solve technical debt (ESM issues)
- Reduce complexity (40% less code)
- Improve quality (better testing)
- Future-proof the architecture
- Deliver better user experience

The bold move pays off. Let's ship it! 🚀

---

**Next Steps:**
1. Get approval on this plan
2. Start with Phase 1 (preparation)
3. Execute methodically
4. Ship han-solo 2.0 as pure MCP server
