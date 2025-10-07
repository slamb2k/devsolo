# Cleanup Opportunities

This document outlines potential cleanup tasks identified after the v2 architecture simplification. These can be tackled in future PRs.

## 1. Eliminate Remaining Adapter Layer (Optional but Recommended)

### Current State
- `command-adapters.ts` (162 lines) contains wrapper classes for 7 commands
- Only 5 commands implement `CommandHandler` directly:
  - ✅ `CleanupCommand`
  - ✅ `ConfigCommand`
  - ✅ `StatusCommand`
  - ✅ `StatusLineCommand`
  - ✅ `ValidateCommand`
- Remaining 7 commands use adapters that just parse `string[]` args and call the real commands:
  - ❌ `InitCommand` → uses `InitCommandAdapter`
  - ❌ `LaunchCommand` → uses `LaunchCommandAdapter`
  - ❌ `ShipCommand` → uses `ShipCommandAdapter`
  - ❌ `HotfixCommand` → uses `HotfixCommandAdapter`
  - ❌ `SessionsCommand` → uses `SessionsCommandAdapter`
  - ❌ `SwapCommand` → uses `SwapCommandAdapter`
  - ❌ `AbortCommand` → uses `AbortCommandAdapter`

### Proposed Simplification
1. Make all 7 remaining commands implement `CommandHandler` interface
2. Each command parses its own `args: string[]` in `execute()`
3. Delete `command-adapters.ts` entirely
4. Update `command-registry.ts` to instantiate commands directly

### Impact
- **Lines removed:** ~200 lines
- **Architecture:** One less layer of indirection
- **Maintenance:** Simpler, more consistent codebase

### Example
```typescript
// Before (with adapter)
export class LaunchCommandAdapter implements CommandHandler {
  private command = new LaunchCommand();
  async execute(args: string[]): Promise<void> {
    const options: any = {};
    if (args[0]) options.branchName = args[0];
    return this.command.execute(options);
  }
}

// After (direct implementation)
export class LaunchCommand implements CommandHandler {
  name = 'hansolo:launch';
  description = 'Create feature branch and start workflow';

  async execute(args: string[]): Promise<void> {
    const options: any = {};
    if (args[0]) options.branchName = args[0];
    // ... rest of implementation
  }

  validate(_args: string[]): boolean {
    return true;
  }
}
```

---

## 2. Clean Up Stale Documentation Files

### Files to Delete
These are historical documents about the v2 migration that are no longer relevant:

- `ADAPTER-LAYER-IMPLEMENTATION.md` - Documents the adapter layer we just removed
- `V2_IMPLEMENTATION_COMPLETE.md` - Migration completion report
- `CHANGELOG-V2.md` - V2 changelog (can be merged into main CHANGELOG if needed)
- `COMMAND-REVIEW-REPORT.md` - Pre-migration command review
- `CRITICAL-BUG-REPORT.md` - Bug that was fixed during migration
- `IMPLEMENTATION_SUMMARY.md` - Summary of v2 implementation

### Reason
Historical documentation about a completed migration adds clutter without providing ongoing value. The final architecture is now the only version users need to understand.

### Alternative
Archive these files in a `docs/archive/v2-migration/` directory if historical context is valuable.

---

## 3. Update API Documentation

### Issue
`docs/API.md` (lines 121-125) still documents `abortAll()` as a public API:

```typescript
abortAll(options?: {
  force?: boolean;
  yes?: boolean;
}): Promise<void>
```

### Fix
Remove `abortAll()` from API documentation since it's now:
- Inlined directly in CLI's `runAbort()` function
- CLI-only feature (not available programmatically)
- Called via `hansolo abort --all` flag

### Additional Check
Review entire API.md for other outdated references to:
- `resume` command
- v2 classes
- Adapter layer

---

## 4. Review User-Facing Documentation

### Files to Check

#### README.md
- Look for mentions of "resume" command
- Check for "v2" references
- Verify command examples are current
- Ensure architecture diagrams reflect simplified structure

#### docs/design/hansolo-prd.md
- Update architecture section if it mentions adapters
- Remove outdated v2 migration notes
- Verify command list is accurate (no resume)

#### QUICKSTART.md
- Verify all command examples work with current implementation
- Check that swap is documented as the way to switch sessions (not resume)
- Update any outdated workflow examples

#### docs/BANNER_CONSOLIDATION.md
- Verify banner implementation matches current code (capturedOutput.push vs originalConsoleLog)

### Automated Check
```bash
# Search for potentially outdated content
grep -r "resume" docs/ README.md QUICKSTART.md | grep -v "Resume the"
grep -r "abortAll" docs/
grep -r "v2\|V2" docs/ README.md | grep -v "IPv"
grep -r "adapter\|Adapter" docs/ README.md
```

---

## Priority Ranking

### High Priority (High Value, Low Risk)
1. **#1: Eliminate adapter layer** - Major simplification, consistent architecture
2. **#3: Update API.md** - Documentation accuracy matters

### Medium Priority (Housekeeping)
3. **#2: Delete stale docs** - Reduce clutter, easier navigation
4. **#4: Review user docs** - Ensure consistency and accuracy

---

## Notes

- All changes should be made in separate PRs after the initial v2 simplification is merged
- Each cleanup item is independent and can be tackled separately
- Tests should continue to pass after each cleanup
- Consider creating GitHub issues for tracking these items
