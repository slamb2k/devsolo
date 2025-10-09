# Chore: Codebase Cleanup - Phase 1 Quick Wins

## Chore Description

Based on comprehensive codebase analysis, this chore implements Phase 1 (Quick Wins) of the han-solo optimization plan. The goal is to remove redundant files, clean up build artifacts, eliminate unused dependencies, and improve repository hygiene without introducing any behavioral changes or regressions.

**Key Issues Identified:**
- 13 compiled JavaScript and TypeScript declaration files incorrectly committed to `/src` directory
- 49 stale lock files in `.hansolo/locks/` directory
- 1 temporary test file (`test-stash2.txt`) in repository root
- Runtime debug log (`debug.log`) not properly ignored
- Unused npm dependencies (`playwright`, `@types/rimraf`)
- Potentially unused build configuration (`rollup.config.js`)

**Expected Impact:**
- **File Reduction**: ~90 unnecessary files removed
- **Dependency Size**: ~20MB reduction in `node_modules`
- **Build Time**: Faster npm installs
- **Repository Clarity**: Cleaner git status, no confusion between source and compiled code
- **Zero Regressions**: Only removing files that are regenerated or ephemeral

**Estimated Effort**: 1-2 hours
**Complexity**: Low
**Risk**: Low (all changes are reversible, files are regenerated on build)

---

## Relevant Files

### Files to Remove/Clean

**Compiled Files in Source (13 files):**
- `src/models/types.js` - Compiled JavaScript (should only have .ts)
- `src/models/types.d.ts` - Generated declaration file
- `src/models/workflow-session.js` - Compiled JavaScript
- `src/models/workflow-session.d.ts` - Generated declaration file
- `src/models/audit-entry.js` - Compiled JavaScript
- `src/models/audit-entry.d.ts` - Generated declaration file
- `src/models/configuration.js` - Compiled JavaScript
- `src/models/configuration.d.ts` - Generated declaration file
- `src/services/session-repository.js` - Compiled JavaScript
- `src/services/git-operations.js` - Compiled JavaScript
- `src/services/git-operations.d.ts` - Generated declaration file
- `src/services/github-integration.js` - Compiled JavaScript
- `src/services/github-integration.d.ts` - Generated declaration file
- `src/services/configuration-manager.js` - Compiled JavaScript
- `src/services/configuration-manager.d.ts` - Generated declaration file
- `src/services/mcp-config-service.js` - Compiled JavaScript
- `src/services/hooks-strategy.js` - Compiled JavaScript
- `src/services/hooks-strategy.d.ts` - Generated declaration file
- `src/services/installation-strategy.js` - Compiled JavaScript
- `src/services/installation-strategy.d.ts` - Generated declaration file

**Why relevant**: These are TypeScript compilation outputs that should only exist in `/dist`, not `/src`. Their presence creates confusion and can cause build issues.

**Runtime Files (49+ files):**
- `.hansolo/locks/*.lock` - 49 stale session lock files
- `.hansolo/debug.log` - Runtime debug log (56KB)
- `test-stash2.txt` - Temporary test file in root

**Why relevant**: These are ephemeral runtime files that accumulate during development and should not be committed to the repository.

**Build Configuration:**
- `rollup.config.js` - Potentially unused build configuration

**Why relevant**: The `build` script uses `tsc`, not rollup. If rollup is truly unused, the config file adds confusion.

**Package Dependencies:**
- `package.json` dependencies section - Contains unused packages

**Why relevant**: `playwright` and `@types/rimraf` appear to be unused based on codebase analysis.

### Files to Modify

**`.gitignore`**
- Add explicit rules for runtime files to prevent future commits
- Ensure `.hansolo/debug.log` and `.hansolo/locks/*.lock` are excluded

**Why relevant**: Prevents runtime files from being accidentally committed in the future.

**`package.json`**
- Remove unused dependencies from `dependencies` and `devDependencies`
- Optionally remove rollup-related packages if confirmed unused

**Why relevant**: Reduces installation time and package size.

### New Files

None required - this is purely a cleanup operation.

---

## Step by Step Tasks

### Step 1: Backup Current State
- Create a full backup of the current branch state
- Verify we're on the `refactor/codebase-cleanup` branch
- Ensure all current work is committed or stashed
- Document current file count and repository size for comparison

**Rationale**: Safety first - ensure we can revert if anything goes wrong.

### Step 2: Remove Compiled Files from Source Directory
- Find all `.js` files in `/src` directory (excluding node_modules)
- Find all `.d.ts` files in `/src` directory (excluding node_modules)
- Delete these files from the filesystem
- Remove from git tracking with `git rm --cached` (if tracked)
- Verify TypeScript source files (`.ts`) are intact
- Run `npm run build` to confirm files regenerate correctly in `/dist`

**Rationale**: Source directory should only contain TypeScript source files, not compilation outputs.

**Expected Result**: `/src` directory contains only `.ts` files.

### Step 3: Clean Stale Runtime Files
- Remove all lock files from `.hansolo/locks/` directory
- Truncate or delete `.hansolo/debug.log` file
- Delete `test-stash2.txt` from repository root
- Verify no active sessions are using these lock files (check `.hansolo/sessions/`)

**Rationale**: These files are generated during runtime and should not be committed. They accumulate over time and pollute the repository.

**Expected Result**: Clean runtime directories, no temporary files in git status.

### Step 4: Update .gitignore
- Add explicit exclusion for `.hansolo/debug.log`
- Add explicit exclusion for `.hansolo/locks/*.lock`
- Add rule for any `*.tmp` files
- Add rule for `test-stash*.txt` patterns
- Verify the rules are properly formatted and will be respected

**Rationale**: Prevent these file types from being committed in the future.

**Expected Result**: Runtime files are ignored by git.

### Step 5: Verify Rollup Configuration Usage
- Search codebase for any imports or references to rollup
- Check `package.json` scripts for rollup usage
- Confirm `npm run build` uses `tsc`, not rollup
- If rollup is truly unused, delete `rollup.config.js`
- If rollup is used (even indirectly), document why and keep it

**Rationale**: No point keeping configuration files for unused tools. However, must verify it's actually unused before deletion.

**Expected Result**: Either confirmed rollup is unused (delete config) or documented why it exists (keep it).

### Step 6: Remove Unused NPM Dependencies
- Verify `playwright` is not imported anywhere in `/src` or `/tests`
- Verify `@types/rimraf` is not needed (rimraf is pure JS, doesn't need types)
- Run `npm uninstall playwright @types/rimraf`
- Check if rollup packages are unused: `rollup`, `@rollup/plugin-typescript`, `@rollup/plugin-json`
- If rollup packages are confirmed unused, run `npm uninstall rollup @rollup/plugin-typescript @rollup/plugin-json`
- Verify `package.json` and `package-lock.json` are updated

**Rationale**: Unused dependencies increase installation time, package size, and security surface area.

**Expected Result**: Cleaner dependency tree, faster `npm install`.

### Step 7: Verify Build and Type Checking
- Run `npm run clean` to remove existing build artifacts
- Run `npm run build` to rebuild from clean slate
- Verify build completes without errors
- Run `npm run typecheck` to verify TypeScript compilation
- Run `npm run lint` to ensure no linting issues introduced
- Check that all compiled outputs are in `/dist`, not `/src`

**Rationale**: Ensure cleanup didn't break the build process.

**Expected Result**: Clean build with all outputs in correct locations.

### Step 8: Run Validation Commands
Execute all validation commands to ensure zero regressions (see Validation Commands section below).

**Rationale**: Comprehensive validation before committing changes.

**Expected Result**: All validation commands pass.

### Step 9: Document Changes
- Update commit message with detailed list of files removed
- Note the repository size before/after
- Document dependency changes
- Add statistics (X files removed, Y MB saved, etc.)

**Rationale**: Clear documentation of cleanup scope and impact.

**Expected Result**: Comprehensive commit message with metrics.

### Step 10: Commit and Ship
- Stage all changes (deletions, package.json updates, .gitignore changes)
- Create commit with clear message following conventional commits format
- Use han-solo ship command to complete the workflow
- Verify post-flight checks pass

**Rationale**: Proper workflow completion using han-solo's own tools.

**Expected Result**: Changes merged to main via PR.

---

## Validation Commands

Execute every command to validate the chore is complete with zero regressions.

- `npm run clean` - Clean all build artifacts before validation
- `npm run build` - Rebuild project from scratch, ensure no compilation errors
- `npm run build:mcp` - Build MCP server configuration, ensure MCP still works
- `npm run typecheck` - Run TypeScript type checking, ensure no type errors
- `npm run lint` - Run ESLint, ensure no linting errors introduced
- `npm test` - Run test suite (skipped tests will still be skipped, but enabled tests must pass)
- `find src -name "*.js" -o -name "*.d.ts" | grep -v node_modules` - Verify NO .js or .d.ts files in src/
- `ls dist/` - Verify build outputs exist in dist/ directory
- `git status` - Verify clean working directory (or only expected changes staged)
- `npm ls playwright` - Verify playwright is not installed
- `npm ls @types/rimraf` - Verify @types/rimraf is not installed
- `ls .hansolo/locks/ | wc -l` - Verify lock files are cleaned (should be 0 or very few)
- `test -f test-stash2.txt && echo "FAIL: temp file exists" || echo "PASS: temp file removed"` - Verify temp file removed
- `node dist/index.js --help` - Verify CLI still works
- `node dist/mcp/hansolo-mcp-server.js --help 2>/dev/null || echo "MCP server binary check"` - Verify MCP server builds correctly

---

## Notes

### Why These Changes Are Safe

1. **Compiled Files Removal**: TypeScript automatically regenerates these during build. They should never be in source control.

2. **Lock Files Removal**: These are ephemeral session locks created/destroyed during runtime. Stale locks are normal after development.

3. **Dependency Removal**:
   - `playwright` - 0 references in codebase, safe to remove
   - `@types/rimraf` - rimraf is pure JavaScript package, doesn't need type definitions
   - rollup (conditional) - Only if confirmed unused via investigation

4. **Debug Log Cleanup**: Runtime log file that grows during development, safe to truncate/delete.

### Potential Issues and Mitigations

**Issue**: What if some compiled files were manually edited?
**Mitigation**: Compare timestamps - if `.ts` file is older than `.js` file, investigate before deleting.

**Issue**: What if active sessions have lock files?
**Mitigation**: Check `.hansolo/sessions/` for active sessions before cleaning locks. Only remove locks older than 24 hours.

**Issue**: What if rollup is used indirectly by another tool?
**Mitigation**: Search entire codebase and package.json scripts before removing. If in doubt, keep it and document.

**Issue**: Build might fail after dependency removal?
**Mitigation**: Run full build and test suite before committing. Easy to restore with `npm install`.

### Expected Metrics

**Before Cleanup:**
- Source files with compiled outputs: 13 .js + ~15 .d.ts = ~28 files
- Lock files: 49 files
- Temp files: 1 file
- Total unnecessary files: ~79 files
- node_modules size: ~175MB
- Repository cleanliness: Mixed (source + compiled)

**After Cleanup:**
- Source directory: Only .ts files ✅
- Lock files: 0-5 (only active)
- Temp files: 0
- Files removed: ~75-80 files
- node_modules size: ~155MB (playwright + types removed)
- Repository cleanliness: Clean separation ✅

**Time Savings:**
- npm install: ~5-10 seconds faster
- Build clarity: No confusion about which files are source vs. compiled
- Git operations: Smaller diffs, clearer history

### Related Issues

This chore addresses issues identified in the comprehensive optimization report:
- **Issue #1**: Compiled files in source directory
- **Issue #2**: Stale runtime files
- **Issue #3**: Unused dependencies
- **Issue #4**: Repository hygiene

### Future Work (Not In This Chore)

This is Phase 1 (Quick Wins) only. Future phases will address:
- **Phase 2**: MCP server consolidation, test suite recovery, command refactoring
- **Phase 3**: Validation consolidation, logging standardization, import path optimization

See the full optimization report for details on Phase 2 and Phase 3 work.

### References

- Original optimization report in `/docs/dev/reports/` (if saved)
- TypeScript build configuration: `tsconfig.json`
- Package configuration: `package.json`
- Git ignore rules: `.gitignore`
