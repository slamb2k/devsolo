# Hotfix

Create an emergency hotfix workflow with higher priority and optional fast-tracking.

## Arguments

- `issue` (optional): Issue number or description (used for branch name)
- `severity` (optional): Severity level - "critical", "high", "medium" (default: "high")
- `skipTests` (optional): Skip running tests before merge (default: false) - use with caution!
- `skipReview` (optional): Skip code review requirement (default: false) - use with caution!
- `autoMerge` (optional): Automatically merge when checks pass (default: true)
- `auto` (optional): Automatically use recommended options (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█░█░█▀█░▀█▀░█▀▀░▀█▀░█░█░
░█▀█░█░█░░█░░█▀▀░░█░░▄▀▄░
░▀░▀░▀▀▀░░▀░░▀░░░▀▀▀░▀░▀░
```

1. **Invoke git-droid sub-agent** to coordinate the hotfix workflow
2. git-droid will:
   - Validate severity level and adjust behavior accordingly
   - Generate hotfix branch name (from issue, description, or timestamp)
   - Check current state (on main, clean directory)
   - Call `mcp__devsolo__devsolo_hotfix` with parameters
   - Create hotfix branch from main
   - Create session with HOTFIX workflow type
   - Guide through rapid hotfix process
   - Format results following git-droid output style (see `.claude/output-styles/git-droid.md`)

**Output Formatting:** git-droid handles all output formatting including:
- Pre-flight Checks section
- Operations Executed section
- Post-flight Verifications section
- Result Summary section (with severity indication)
- Next Steps section (emphasizing urgency for critical hotfixes)

## Hotfix Workflow Details

```
1. Severity Assessment:
   - Critical: Production down, data loss, security breach
   - High: Major feature broken, significant user impact
   - Medium: Minor issue with workaround available

2. Branch Creation:
   - Create hotfix/ branch from latest main
   - Create HOTFIX session (tracked separately from features)

3. Rapid Development Cycle:
   - Make minimal changes to fix issue
   - Commit with hotfix message: "hotfix: <description>"
   - Push immediately

4. Fast-Track Review (based on severity):
   - Critical: Can skip review if --skipReview
   - High: Expedited review process
   - Medium: Normal review process

5. Accelerated CI/CD:
   - Run essential checks
   - Can skip comprehensive tests if --skipTests (use carefully!)
   - Auto-merge when checks pass (if --autoMerge)

6. Post-Merge Actions:
   - Merge to main with squash
   - Tag release if needed
   - Cleanup branches
   - Complete session
```

## Severity Levels

### Critical (severity: critical)
```
- Production is down or significantly impaired
- Data loss or corruption occurring
- Security vulnerability being actively exploited
- All users affected

Behavior:
- Highest priority
- Can use --skipReview and --skipTests if necessary
- Auto-merge enabled by default
- Immediate notification
```

### High (severity: high)
```
- Major functionality broken
- Significant user impact
- Revenue/business impact
- Large subset of users affected

Behavior:
- High priority
- Expedited review
- Can skip non-critical tests with --skipTests
- Auto-merge enabled by default
```

### Medium (severity: medium)
```
- Minor functionality issue
- Workaround available
- Small subset of users affected
- Low business impact

Behavior:
- Standard priority
- Normal review process
- All tests required
- Auto-merge optional
```

## Examples

```
# Critical hotfix with issue number
/devsolo:hotfix --issue="123" --severity="critical" --skipReview --autoMerge

# High severity hotfix with description
/devsolo:hotfix --issue="Fix login authentication bug" --severity="high"

# Medium hotfix (normal process)
/devsolo:hotfix --issue="456" --severity="medium"

# Critical hotfix, skip everything (use only in emergencies!)
/devsolo:hotfix --issue="production-down" --severity="critical" --skipTests --skipReview --autoMerge

# Auto mode for critical hotfix
/devsolo:hotfix --issue="789" --severity="critical" --auto
```

## Complete Hotfix Workflow Example

```
# 1. Start hotfix
/devsolo:hotfix --issue="critical-auth-bypass" --severity="critical"

git-droid output:
🔍 Analysis:
- Severity: CRITICAL
- Current branch: main ✓
- Working directory: clean ✓
- Generated branch: hotfix/critical-auth-bypass

Creating emergency hotfix branch...

Pre-flight checks:
✓ On main branch
✓ Working directory clean
✓ Hotfix branch name available
⚠ Critical severity: expedited process enabled

Operation: Creating hotfix branch...
Operation: Creating HOTFIX session...

✅ Hotfix session started on hotfix/critical-auth-bypass

Next steps:
1. Make MINIMAL changes to fix the issue
2. Test the fix locally
3. Run /devsolo:commit to commit changes
4. Run /devsolo:ship to deploy immediately

# 2. Make the fix (your code changes)

# 3. Commit the fix
/devsolo:commit --message="hotfix: fix critical authentication bypass vulnerability"

# 4. Ship immediately
/devsolo:ship --auto
# Auto-merge enabled, will merge as soon as CI passes
```

## Safety Considerations

### When to Use --skipTests
- **DO**: For critical production outages where fix is simple
- **DO**: When tests are flaky and blocking urgent fix
- **DON'T**: For complex changes
- **DON'T**: For security fixes without testing

### When to Use --skipReview
- **DO**: For critical production outages with small, obvious fixes
- **DO**: When all team members unavailable and fix is urgent
- **DON'T**: For complex or risky changes
- **DON'T**: As a regular practice

## Best Practices

1. **Keep Changes Minimal**: Only fix the specific issue
2. **Test Locally First**: Always test before committing
3. **Document in Commit**: Clear commit message explaining fix
4. **Notify Team**: Communicate about critical hotfixes
5. **Follow Up**: Create issue for proper fix if hotfix is temporary
6. **Post-Mortem**: Review what caused the issue

## Hotfix vs Feature Workflow

| Aspect | Feature | Hotfix |
|--------|---------|--------|
| Branch prefix | feature/ | hotfix/ |
| Source branch | main | main |
| Review | Standard | Expedited/Optional |
| Testing | Full suite | Can be minimal |
| Merge | After approval | Can be immediate |
| Priority | Normal | High/Critical |

## Notes

- Hotfix workflow is tracked separately from feature workflows
- Creates hotfix/ branch instead of feature/ branch
- Can fast-track review and testing for critical issues
- Use responsibly - skipping safeguards increases risk
- Always document the issue and fix clearly
- Consider creating follow-up issue for comprehensive fix
- Team should be notified of critical hotfixes
