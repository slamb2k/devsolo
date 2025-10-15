# devsolo Usage Guide

Practical examples and best practices for using devsolo with Claude Code in real-world development scenarios.

## Table of Contents

- [Basic Workflows](#basic-workflows)
- [Team Collaboration](#team-collaboration)
- [Advanced Workflows](#advanced-workflows)
- [Best Practices](#best-practices)
- [Common Scenarios](#common-scenarios)
- [Tips for Different Team Sizes](#tips-for-different-team-sizes)

## Basic Workflows

### Simple Feature Development

The most common workflow: develop a feature with Claude Code and ship it.

**Natural Language Pattern:**

```
"Start a new feature for improving the search functionality"
*work with Claude to implement the feature*
"Commit these changes with message 'feat: improve search with fuzzy matching'"
"Ship this feature with PR description: Improve search with fuzzy matching algorithm"
```

**With Direct MCP Tools:**

```
Use devsolo_launch with description "Improve search functionality"
# Generated branch: feature/improve-search-functionality

*implement the feature*

Use devsolo_commit with message "feat: improve search with fuzzy matching"

Use devsolo_ship with createPR true, merge true, and prDescription "Improve search with fuzzy matching algorithm"
```

**Timeline**: ~2 minutes from launch to merged PR (excluding CI time)

**What devsolo does automatically:**
- ✅ Creates feature branch
- ✅ Tracks workflow state
- ✅ Commits changes
- ✅ Pushes to GitHub
- ✅ Creates pull request
- ✅ Waits for CI checks
- ✅ Auto-merges PR
- ✅ Cleans up branches
- ✅ Returns you to main

### Named Feature Branch

When you want a specific branch name:

**Natural Language:**

```
"Start a feature branch called feature/user-authentication for implementing OAuth"
*work on authentication*
"Commit with message 'feat: implement OAuth2 authentication'"
"Ship this feature"
```

**Direct Tools:**

```
Use devsolo_launch with branchName "feature/user-authentication" and description "OAuth2 authentication system"

Use devsolo_commit with message "feat: implement OAuth2 authentication"

Use devsolo_ship with createPR true and merge true
```

### Quick Hotfix

For urgent bug fixes:

**Natural Language:**

```
"Create a hotfix for the critical security vulnerability in the auth module"
*fix the vulnerability*
"Commit this security fix"
"Ship the hotfix immediately"
```

**Direct Tools:**

```
Use devsolo_hotfix with issue "security vulnerability in auth module" and severity "critical"

Use devsolo_commit with message "fix: patch critical security vulnerability in auth"

Use devsolo_ship with merge true
```

## Team Collaboration

### Working with Multiple Developers

devsolo prevents conflicts when multiple developers work on different features.

**Developer A:**

```
"Start a new feature for API client integration"
*implement API client*
"Commit with message 'feat: add REST API client with retry logic'"
"Ship this feature"
```

**Developer B (at the same time):**

```
"Start a feature for redesigning the header component"
*redesign header*
"Commit with message 'feat: redesign header with responsive layout'"
"Ship the header redesign"
```

**Key Benefits:**
- Each developer has isolated workflow sessions
- No stepping on each other's toes
- Linear history maintained automatically
- No merge commits cluttering history
- devsolo handles rebasing automatically

### Code Review Workflow

Integrate devsolo with your team's review process:

**Initial Implementation:**

```
"Start a new feature for the payment integration"
*implement payment flow*
"Commit with message 'feat: initial payment integration'"
"Create a PR for this feature but don't merge yet"
```

**With direct tools:**

```
Use devsolo_ship with push true, createPR true, merge false
```

**After Review Feedback:**

```
*address review comments*
"Commit with message 'fix: address code review feedback'"
"Update the PR and merge if approved"
```

**With direct tools:**

```
Use devsolo_commit with message "fix: address code review feedback"
Use devsolo_ship with push true
```

### Pair Programming

Two developers working on the same feature:

**Developer 1:**

```
"Start a feature called feature/complex-algorithm for the new sorting algorithm"
*implement initial version*
"Commit the work in progress"
```

Then push manually:
```bash
git push origin feature/complex-algorithm
```

**Developer 2:**

```bash
# Pull the branch
git fetch origin
git checkout feature/complex-algorithm
```

Then in Claude Code:
```
*continue the implementation*
"Commit with message 'feat: optimize algorithm performance'"
"Ship this feature when ready"
```

Either developer can ship when the feature is complete.

## Advanced Workflows

### Managing Multiple Features Simultaneously

Work on multiple features and switch between them:

**Starting Multiple Features:**

```
"Start a feature for database migration scripts"
*work on migrations*
"Commit with message 'feat: add initial migration scripts'"

"Start another feature for API documentation"
*work on docs*
"Commit with message 'docs: add comprehensive API documentation'"

"Switch back to the database migration feature"
*continue migration work*
"Commit more changes to migrations"

"Ship the database migration feature"

"Switch to the API documentation feature"
*finish documentation*
"Ship the API documentation feature"
```

**With Direct Tools:**

```
Use devsolo_launch with branchName "feature/database-migration"
Use devsolo_commit with message "feat: add initial migration scripts"

Use devsolo_launch with branchName "feature/api-docs"
Use devsolo_commit with message "docs: add comprehensive API documentation"

Use devsolo_swap with branchName "feature/database-migration"
Use devsolo_commit with message "feat: add remaining migrations"
Use devsolo_ship with merge true

Use devsolo_swap with branchName "feature/api-docs"
Use devsolo_ship with merge true
```

**View All Sessions:**

```
"Show me all my active devsolo sessions"
```

Or:

```
Use devsolo_sessions with verbose true
```

### Long-Running Feature Branches

For features that take days or weeks:

**Day 1:**

```
"Start a feature for the major service layer refactor"
*work on refactoring*
"Commit with message 'WIP: initial service refactoring'"
```

Push manually to save work:
```bash
git push origin feature/major-refactor
```

**Day 2:**

```bash
git pull  # Get latest if working from different machine
```

```
*continue refactoring*
"Commit with message 'WIP: refactor authentication service'"
```

**Day 5:**

```
*finish refactoring*
"Commit with message 'feat: complete service layer refactoring'"
"Ship this feature with PR description: Major service layer refactoring with improved error handling and test coverage"
```

devsolo automatically rebases on latest main when shipping.

### Handling Merge Conflicts

devsolo automates rebasing, but conflicts may still occur:

**When Shipping:**

```
"Ship this feature"
```

If conflicts occur during rebase, devsolo will report them. Then:

```bash
# 1. Check conflicted files
git status

# 2. Resolve conflicts manually
vim src/conflicted-file.ts  # Fix conflicts
git add src/conflicted-file.ts

# 3. Continue rebase
git rebase --continue
```

Then in Claude Code:

```
"Ship this feature again"
```

### Feature Flags Integration

Combine devsolo with feature flags for gradual rollouts:

**Implement Behind Feature Flag:**

```
"Start a feature for the new beta UI design"
*implement new UI with feature flag check*
"Commit with message 'feat: add beta UI behind feature flag'"
"Ship to production (feature disabled by default)"
```

The feature is in production but disabled:

```typescript
// In code
export const BETA_UI = process.env.ENABLE_BETA_UI === 'true';

if (BETA_UI) {
  // New beta UI
} else {
  // Existing UI
}
```

**Enable Feature Later:**

```
"Start a feature to enable the beta UI for all users"
*change feature flag default*
"Commit with message 'feat: enable beta UI for all users'"
"Ship this change"
```

## Best Practices

### 1. Always Launch Before Starting Work

**❌ Bad (breaks devsolo tracking):**

```bash
git checkout -b feature/my-feature
# devsolo doesn't know about this!
```

**✅ Good:**

```
"Start a new feature for my awesome feature"
# devsolo tracks everything
```

### 2. Use Descriptive Branch Names and Descriptions

**❌ Bad:**

```
"Start a feature"
# Generates: feature/2025-10-10-14-30-45 (timestamp only)
```

**✅ Good:**

```
"Start a feature for user authentication with OAuth2"
# Generates: feature/user-authentication-with-oauth2 (descriptive)
```

Or with explicit name:

```
Use devsolo_launch with branchName "feature/oauth2-integration" and description "OAuth2 authentication system"
```

**Branch Naming Rules:**
- **Maximum length**: 80 characters
- **Format**: `type/description-in-kebab-case`
- **Valid types**: feature, bugfix, hotfix, release, chore, docs, test, refactor
- Names exceeding 80 characters will be rejected with truncated suggestions
- Auto-generated names are automatically truncated to fit

**PR Title Prefixes:**
- **Launch workflows**: PRs are prefixed with `[launch]`
- **Hotfix workflows**: PRs are prefixed with `[hotfix]`
- Example: `[launch] feature/user-authentication`

### 3. Check Status Before Shipping

**✅ Good:**

```
# Always check status first
"What's my current workflow status?"

# Review what will be committed
"Show me what changes are staged"

# Then ship
"Ship this feature"
```

### 4. Clean Up Regularly

After merging PRs or finishing features:

```
"Clean up old devsolo sessions and merged branches"
```

Or with direct tools:

```
Use devsolo_cleanup with deleteBranches true
```

### 5. Let devsolo Handle Git Operations

During an active devsolo session, avoid direct git commands:

**❌ Avoid during active sessions:**

```bash
git commit -m "my changes"
git push origin feature/my-branch
gh pr create
```

**✅ Use devsolo tools instead:**

```
"Commit these changes with message 'feat: my changes'"
"Ship this feature"
```

**Why?** devsolo maintains a state machine that tracks your workflow. Direct git operations bypass this tracking and can cause workflow corruption.

### 6. Commit Incrementally, Ship When Ready

**✅ Good workflow:**

```
*implement user model*
"Commit with message 'feat: add user model with validation'"

*implement user controller*
"Commit with message 'feat: add user controller with CRUD operations'"

*implement user routes*
"Commit with message 'feat: add user API routes'"

# Now ship all commits together
"Ship this feature"
```

This creates a clean PR with multiple well-described commits.

### 7. Leverage Natural Language

Claude Code understands your intent:

**✅ Preferred approach:**

```
"Start working on the shopping cart feature"
"Commit my changes with a good message"  # Claude generates appropriate message
"Ship this when tests pass"
```

**Also valid (more explicit):**

```
Use devsolo_launch with description "Shopping cart functionality"
Use devsolo_commit with message "feat: add shopping cart with item management"
Use devsolo_ship with createPR true and merge true
```

### 8. Enable Status Line for Visibility

See your workflow state at all times:

```
"Enable the devsolo status line in Claude Code"
```

You'll see:

```
[devsolo] 📝 0c2a20a7 | feature/user-auth | CHANGES_COMMITTED
```

This helps you always know:
- Current session ID
- Active branch
- Workflow state

## Common Scenarios

### Scenario 1: Forgot to Launch

You started coding without launching a devsolo workflow:

```bash
# You have uncommitted changes on main
git status  # Shows modified files

# Stash changes
git stash
```

Then in Claude Code:

```
"Start a feature for my changes"
```

```bash
# Restore changes
git stash pop
```

```
"Commit and ship normally"
```

### Scenario 2: Need to Abort Feature

Started a feature but decided not to continue:

**Abort and return to main:**

```
"Abort this workflow"
```

**Abort but keep branch for later:**

```
Use devsolo_abort with deleteBranch false
```

**Abort and delete everything:**

```
Use devsolo_abort with deleteBranch true
```

### Scenario 3: CI Failed

Your CI checks failed after shipping:

```
*fix the failing tests*
"Commit with message 'fix: resolve failing tests'"
"Ship again to update the PR"
```

devsolo updates the existing PR instead of creating a new one.

### Scenario 4: Need to Update Dependencies

Mid-feature, you need to update packages:

```bash
npm update
```

```
"Commit with message 'chore: update dependencies'"
*continue feature work*
"Commit with message 'feat: implement feature with updated dependencies'"
"Ship the complete feature"
```

All commits ship together in one PR.

### Scenario 5: Working Across Multiple Machines

Started work on laptop, continuing on desktop:

**On Laptop:**

```
"Start a feature for the mobile app redesign"
*work on mobile UI*
"Commit the work in progress"
```

```bash
git push  # Save work to remote
```

**On Desktop:**

```bash
# Fetch and checkout
git fetch origin
git checkout feature/mobile-app-redesign
```

```
*resume work*
"Commit additional changes"
"Ship when done"
```

devsolo automatically detects the existing session.

### Scenario 6: Emergency Rollback

Need to quickly rollback a deployed feature:

```bash
# Create rollback branch from last good commit
git checkout main
git pull
git checkout -b hotfix/rollback-problematic-feature
git revert HEAD~1  # Revert the problematic commit
```

```
"Ship this rollback immediately"
```

Or:

```
Use devsolo_hotfix with issue "rollback problematic feature" and severity "critical"
Use devsolo_ship with merge true
```

### Scenario 7: Want to See All Sessions

Check what workflows you have active:

```
"Show me all my active devsolo sessions"
```

**With details:**

```
Use devsolo_sessions with verbose true
```

**Including completed:**

```
Use devsolo_sessions with all true
```

## Tips for Different Team Sizes

### Solo Developer

```
# Simple workflow
"Start a new feature"
*work*
"Ship it"

# Can be more casual with naming
"Start working on that bug I found"
```

### Small Team (2-5 developers)

```
# Use descriptive names for clarity
"Start a feature called feature/john-user-profile for the user profile page"

# Communicate about long-running branches
"Show me all active sessions to see what everyone is working on"

# Regular cleanup
"Clean up old sessions"  # Weekly
```

### Large Team (5+ developers)

```
# Strict naming with ticket numbers
"Start a feature called feature/JIRA-456-oauth-integration for OAuth integration"

# Integrate with project management
Use devsolo_launch with branchName "feature/TICKET-123-user-dashboard" and description "Implement user dashboard per TICKET-123"

# Regular automated cleanup
Use devsolo_cleanup with deleteBranches true  # Daily via automation
```

## Understanding Workflow States

devsolo tracks your progress through these states:

| State | Meaning | What You Can Do |
|-------|---------|-----------------|
| `INIT` | Just initialized | Launch a feature |
| `BRANCH_READY` | Feature branch created | Make changes, commit |
| `CHANGES_COMMITTED` | Changes committed | Ship or commit more |
| `PUSHED` | Pushed to remote | Create PR |
| `PR_CREATED` | PR is open | Merge or wait for CI |
| `WAITING_APPROVAL` | Awaiting review | Get approval, address feedback |
| `MERGED` | PR merged | Launch next feature |
| `COMPLETE` | Workflow finished | Launch next feature |

Ask Claude anytime:

```
"What state am I in and what should I do next?"
```

## Natural Language vs Direct Tools

devsolo supports both interaction styles:

### Natural Language (Recommended)

**Advantages:**
- More intuitive and conversational
- Claude understands intent and context
- Can handle complex requests
- Generates good commit messages and PR descriptions

**Examples:**

```
"Start working on the user profile feature"
"Commit my authentication changes with an appropriate message"
"Ship this feature when all tests pass"
"Clean up my old branches"
```

### Direct MCP Tools (More Control)

**Advantages:**
- Explicit parameter control
- Predictable behavior
- Good for automation patterns
- Clear what's happening

**Examples:**

```
Use devsolo_launch with branchName "feature/user-profile" and description "User profile page implementation"
Use devsolo_commit with message "feat: add user profile page" and stagedOnly false
Use devsolo_ship with push true, createPR true, merge true, and prDescription "Add user profile page with edit functionality"
Use devsolo_cleanup with deleteBranches true
```

### Hybrid Approach (Best of Both)

Mix both styles as needed:

```
"Start a feature for the payment integration"
*work on implementation*
Use devsolo_commit with message "feat: add Stripe payment integration" and stagedOnly false
"Ship this feature when ready with a detailed PR description"
```

## Troubleshooting Tips

### Check Current State

```
"What's my current devsolo status?"
```

### View Detailed Session Info

```
Use devsolo_sessions with verbose true
```

### Fix Stuck Workflow

```
"Abort the current workflow"
"Start a fresh feature"
```

### Verify MCP Server

```
"Test the devsolo connection"
```

If issues persist, see the [Troubleshooting Guide](troubleshooting.md).

## Conclusion

devsolo with Claude Code makes Git workflows effortless through AI-native interaction. The key principles:

1. **Always launch** before starting work
2. **Commit incrementally** as you make changes
3. **Ship when ready** to push, PR, merge, and cleanup
4. **Clean up regularly** to remove old sessions
5. **Let devsolo handle Git complexity** while you focus on code
6. **Use natural language** for intuitive interaction
7. **Enable status line** for constant workflow visibility

The separation of commit (version control) and ship (delivery pipeline) gives you flexibility to:
- Commit multiple times during development
- Review your commits before shipping
- Ship only when you're ready to create a PR
- Let Claude Code help generate commit messages and PR descriptions
- Maintain clean, linear Git history automatically

For more help:
- [Quick Start Guide](quickstart.md)
- [MCP Tools Reference](mcp-tools-reference.md)
- [Troubleshooting](troubleshooting.md)
- [Migration from v1.x](migration-from-cli.md)
- [MCP Architecture](../dev/system/mcp-architecture.md)

---

**Ready to ship features faster?** Start your first workflow:

```
"Start a new feature for [your feature description]"
```

🚀 Welcome to AI-native Git workflow automation!
