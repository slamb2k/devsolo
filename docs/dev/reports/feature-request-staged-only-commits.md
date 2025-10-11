# Feature Request: Staged-Only Commits

**Date**: 2025-10-10
**Status**: Proposed
**Priority**: High (Developer Experience)

## Problem

Currently, `devsolo commit` and `devsolo ship` automatically stage ALL changes before committing. This causes issues when:

1. **Incremental Work**: Developer has completed documentation but code is still WIP
2. **Selective Commits**: Want to commit only specific files while leaving others untouched
3. **Build Failures**: Unstaged WIP code has errors, blocking commit of completed work

### Real-World Scenario (Just Experienced)

```bash
# We had:
✓ Completed planning docs (ready to commit)
✗ WIP validation service (has TypeScript errors)

# Tried:
git add docs/dev/plans/*.md  # Stage only docs
devsolo commit               # FAILS - stages ALL files, build breaks

# Had to:
git restore <wip-files>      # Revert WIP files
devsolo commit               # Now works, but lost WIP progress
```

## Proposed Solution

### Option A: `--staged-only` Flag (Recommended)

Add flag to commit/ship that respects git staging:

```bash
# Stage what you want to commit
git add docs/dev/plans/*.md
git add src/services/completed-feature.ts

# Commit ONLY staged files
devsolo commit --staged-only --message "docs: planning complete"

# Or with ship
devsolo ship --staged-only --message "feat: add feature"
```

**Behavior:**
- If `--staged-only` flag present: commit only staged files
- If flag absent: maintain current behavior (stage all changes)
- Pre-commit hooks run only on staged files
- Build validation runs only on staged + committed code

### Option B: `--no-stage-all` Flag

Negative flag to disable auto-staging:

```bash
git add docs/
devsolo commit --no-stage-all --message "docs update"
```

**Less intuitive** than Option A.

### Option C: Auto-Detect Staged Files

If files are already staged, commit only those. Otherwise stage all:

```bash
# Auto-detects staged files
git add docs/
devsolo commit --message "docs update"  # Commits only docs

# No staged files - stages everything
devsolo commit --message "commit all"   # Current behavior
```

**Pro**: No new flag needed
**Con**: Less explicit, could be confusing

## Recommended Implementation

**Go with Option A: `--staged-only`**

### API Changes

**devsolo_commit MCP tool:**
```typescript
export interface CommitToolInput {
  message?: string;
  stagedOnly?: boolean;  // NEW
  force?: boolean;
  yes?: boolean;
}
```

**Command behavior:**
```typescript
async commit(options: CommitOptions) {
  if (options.stagedOnly) {
    // Get list of staged files
    const staged = await gitOps.getStagedFiles();

    if (staged.length === 0) {
      throw new Error('No files staged for commit. Use git add to stage files.');
    }

    // Commit only staged files
    await gitOps.commit(options.message, { stagedOnly: true });
  } else {
    // Current behavior: stage all and commit
    await gitOps.stageAll();
    await gitOps.commit(options.message);
  }
}
```

### Git Operations

Add to `GitOperations` class:

```typescript
/**
 * Get list of staged files
 */
async getStagedFiles(): Promise<string[]> {
  const status = await this.getStatus();
  return status.staged;
}

/**
 * Commit with options
 */
async commit(message: string, options?: {
  stagedOnly?: boolean;
  noVerify?: boolean;
}): Promise<{ commit: string }> {
  const args = ['commit', '-m', message];

  if (options?.noVerify) {
    args.push('--no-verify');
  }

  // If stagedOnly, don't add -a flag
  // If not stagedOnly, add -a to include all changes
  if (!options?.stagedOnly) {
    args.splice(1, 0, '-a');  // git commit -a -m "message"
  }

  const result = await this.git.raw(args);
  return { commit: result };
}
```

### Pre-Flight Checks

Update pre-flight checks for `ship` command:

```typescript
preFlightChecks.push({
  id: 'hasStagedFiles',
  name: 'Has staged files',
  execute: async (context) => {
    if (!context.stagedOnly) {
      return { passed: true, level: 'info', message: 'Will stage all files' };
    }

    const staged = await gitOps.getStagedFiles();
    const hasStaged = staged.length > 0;

    return {
      passed: hasStaged,
      level: hasStaged ? 'info' : 'error',
      message: hasStaged
        ? `${staged.length} file(s) staged`
        : 'No files staged',
      suggestions: hasStaged
        ? undefined
        : ['Stage files with: git add <files>', 'Or remove --staged-only flag'],
    };
  }
});
```

## Benefits

✅ **Incremental Commits**: Commit documentation separately from code
✅ **Build Safety**: Don't commit WIP code with errors
✅ **Git Workflow**: Respects standard git staging area
✅ **Developer Control**: Explicit about what gets committed
✅ **Backwards Compatible**: Default behavior unchanged

## Implementation Checklist

**Phase 1: Core Functionality**
- [ ] Add `getStagedFiles()` to GitOperations
- [ ] Update `commit()` method to support `stagedOnly` option
- [ ] Add tests for git operations

**Phase 2: MCP Tool Integration**
- [ ] Add `stagedOnly` parameter to devsolo_commit tool
- [ ] Add `stagedOnly` parameter to devsolo_ship tool
- [ ] Update tool schemas
- [ ] Add pre-flight check for staged files

**Phase 3: CLI Integration** (if keeping CLI)
- [ ] Add `--staged-only` flag to commit command
- [ ] Add `--staged-only` flag to ship command
- [ ] Update help text

**Phase 4: Documentation**
- [ ] Update MCP tool reference
- [ ] Add examples to user guide
- [ ] Update README with use cases

## Testing Scenarios

```typescript
describe('commit with --staged-only', () => {
  it('should commit only staged files', async () => {
    await gitOps.add('docs/plan.md');
    // Leave src/wip.ts unstaged

    await commitTool.execute({
      message: 'docs: add plan',
      stagedOnly: true
    });

    // Assert: docs/plan.md committed
    // Assert: src/wip.ts still modified (not committed)
  });

  it('should fail if no files staged', async () => {
    await expect(commitTool.execute({
      message: 'empty commit',
      stagedOnly: true
    })).rejects.toThrow('No files staged');
  });

  it('should stage all if flag not set', async () => {
    // Leave both files unstaged
    await commitTool.execute({
      message: 'commit all'
      // stagedOnly: false (default)
    });

    // Assert: both files committed
  });
});
```

## Timeline

**Estimate**: 4-6 hours
- Phase 1: 2 hours (git operations + tests)
- Phase 2: 2 hours (MCP integration + tests)
- Phase 3: 1 hour (CLI if needed)
- Phase 4: 1 hour (documentation)

## Priority Justification

**High Priority** because:
1. Just hit this limitation in real development
2. Common workflow pattern for developers
3. Low complexity, high value
4. Improves developer experience significantly
5. Aligns with standard git workflows

## Related Issues

- None yet - this is first documentation

## Implementation Notes

- Should NOT change default behavior (backwards compatibility)
- Flag name should be clear and self-documenting
- Error messages should guide users on how to stage files
- Consider adding `--list-staged` helper command

---

**Next Steps**: Get approval, then implement in Phase 3 or Phase 4.
