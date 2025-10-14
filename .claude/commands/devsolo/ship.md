# Ship

Complete the entire workflow: commit any uncommitted changes, push to remote, create PR, wait for CI, merge, cleanup, and return to main. All in one command!

## Arguments

- `prDescription` (optional): Custom PR description (default: auto-generated from commits)
- `push` (optional): Push to remote (default: true)
- `createPR` (optional): Create pull request (default: true)
- `merge` (optional): Merge PR after CI passes (default: true)
- `stagedOnly` (optional): When committing, only commit staged files (default: false)
- `auto` (optional): Automatically use recommended options (default: false)

## Workflow

**Display the following banner immediately before commencing the workflow:**

```
░█▀▀░█░█░▀█▀░█▀█░█▀█░▀█▀░█▀█░█▀▀░
░▀▀█░█▀█░░█░░█▀▀░█▀▀░░█░░█░█░█░█░
░▀▀▀░▀░▀░▀▀▀░▀░░░▀░░░▀▀▀░▀░▀░▀▀▀░
```

1. **Invoke git-droid sub-agent** to coordinate the ship workflow
2. git-droid will:
   - Check for uncommitted changes (use SlashCommand to invoke `/devsolo:commit` if needed)
   - Check for active session
   - Generate PR description if not provided (analyze commits since main)
   - Call `mcp__devsolo__devsolo_ship` with parameters
   - Monitor CI checks (MCP tool handles)
   - Format results following git-droid output style (see `.claude/output-styles/git-droid.md`)

**Output Formatting:** git-droid handles all output formatting including:
- Pre-flight Checks section
- Operations Executed section
- Post-flight Verifications section
- Result Summary section with PR link and stats
- Next Steps section

## Ship Workflow Details

**Step 1: Handle Uncommitted Changes**
   - Check for uncommitted changes using `git status`
   - If present: Invoke `/devsolo:commit` using SlashCommand tool
   - Wait for commit to complete before proceeding

**Step 2: Generate PR Description** (if not provided)
   - Analyze all commits since main branch
   - Extract key changes and organize by component/area
   - Generate structured PR description:
     ```
     ## Summary
     Brief overview (1-3 sentences)

     ## Changes
     - Key change 1
     - Key change 2

     ## Testing
     How to test these changes

     ## Related Issues
     Fixes #123
     ```

   **Step 3: Ship the Feature**
   - Call `mcp__devsolo__devsolo_ship` with all parameters
   - This single tool call handles:
     - Push to remote
     - Create or update GitHub PR
     - Wait for CI checks to pass (20 minute timeout)
     - Auto-merge PR with squash
     - Sync local main branch
     - Delete feature branches (local & remote)
     - Mark session as complete

   **Step 4: Report Results**
   - Show PR URL and number
   - Show merge status
   - Show cleanup results
   - Report any errors with actionable guidance
   - Follow git-droid output style

## PR Description Generation Rules

### Summary Section
- 1-3 sentences describing the overall purpose
- What problem does this solve?
- What value does it add?

### Changes Section
- Bulleted list of key changes
- Organized by component/area if possible
- Focus on user-facing or significant changes
- Derived from commit messages and diff

### Testing Section
- How to verify these changes work
- Any special test cases to run
- Manual testing steps if needed

### Related Issues Section
- Extract issue numbers from commit messages
- Format: "Fixes #123, Relates to #456"
- Only include if issues are mentioned

## Examples

```
# Ship with auto-generated PR description
/devsolo:ship

# Ship with custom PR description
/devsolo:ship --prDescription="Add OAuth2 authentication

This PR implements OAuth2 support for user authentication.

## Changes
- Add OAuth2 provider configuration
- Implement token exchange flow
- Add refresh token handling

## Testing
1. Configure OAuth2 provider
2. Test login flow
3. Verify token refresh

Fixes #42"

# Ship but don't merge (for manual review)
/devsolo:ship --merge=false

# Ship only staged changes
/devsolo:ship --stagedOnly

# Push and create PR, but don't merge
/devsolo:ship --createPR --merge=false
```

## What Happens During Ship

```
1. Pre-flight Checks:
   ✓ All changes committed
   ✓ Session ready to ship
   ✓ GitHub authentication configured
   ✓ CI configured in repository

2. Push Operation:
   - Push commits to remote branch
   - Set upstream tracking

3. PR Creation:
   - Create or update pull request
   - Set title from first commit
   - Set description (auto-generated or custom)
   - Add devsolo footer

4. CI Wait:
   - Monitor CI check status
   - Report progress (build, test, lint, etc)
   - Timeout after 20 minutes
   - Report failed checks with logs

5. Merge Operation:
   - Squash merge to main
   - Delete remote branch
   - Update main branch

6. Local Cleanup:
   - Checkout main branch
   - Pull latest changes
   - Delete feature branch (local)
   - Mark session complete

7. Post-flight Verifications:
   ✓ Pushed to remote
   ✓ PR created (#123)
   ✓ CI checks passed
   ✓ PR merged
   ✓ Branches deleted
   ✓ On main branch
   ✓ Session completed
```

## Notes

- Requires an active devsolo session
- Requires GitHub authentication (gh CLI or GITHUB_TOKEN)
- Will commit any uncommitted changes automatically
- Waits up to 20 minutes for CI checks
- Uses squash merge to maintain linear history
- Prevents branch reuse after merge
- Adds devsolo footer to PR automatically
- Reports PR URL for easy access

## Error Handling

git-droid will handle common errors and provide guidance:

- **No active session**: Guide to /devsolo:launch
- **GitHub auth missing**: Guide to run `gh auth login`
- **CI checks failing**: Report which checks failed with logs
- **Merge conflict**: Guide to resolve conflicts manually
- **Network timeout**: Report timeout, preserve branch for retry
- **Permission denied**: Check repository permissions
