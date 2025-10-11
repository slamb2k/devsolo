# devsolo Usage Guide

Practical examples and best practices for using devsolo in real-world development scenarios.

## Table of Contents

- [Basic Workflows](#basic-workflows)
- [Team Collaboration](#team-collaboration)
- [CI/CD Integration](#cicd-integration)
- [Advanced Workflows](#advanced-workflows)
- [Best Practices](#best-practices)
- [Common Scenarios](#common-scenarios)

## Basic Workflows

### Simple Feature Development

The most common workflow: develop a feature and ship it.

```bash
# 1. Start new feature
devsolo launch
# Generated branch: feature/2025-01-15-14-30-45

# 2. Make your changes
vim src/new-feature.ts
vim tests/new-feature.test.ts

# 3. Commit your changes
devsolo commit --message "feat: add new feature

Implemented new feature with comprehensive tests.
Updated documentation to reflect changes."

# 4. Ship it (pushes, creates PR, merges, cleans up)
devsolo ship --pr-description "## Summary
Adds new feature functionality

## Changes
- New feature implementation
- Comprehensive test coverage

## Testing
All tests passing"
```

**Timeline**: ~2 minutes from launch to merged PR (excluding CI time)

### Named Feature Branch

When you want a specific branch name:

```bash
# Start with custom name
devsolo launch --branch feature/user-authentication

# Work on the feature
vim src/auth-endpoints.ts

# Commit changes
devsolo commit --message "feat: implement user authentication

Added OAuth2 endpoints and JWT token validation.
Includes middleware for protected routes."

# Ship it
devsolo ship --pr-description "## Summary
Implements user authentication system

## Changes
- OAuth2 endpoints
- JWT token validation
- Protected route middleware"
```

### Quick Hotfix

For urgent bug fixes:

```bash
# Launch hotfix
devsolo launch --branch hotfix/critical-security-bug

# Fix the bug
vim src/security-fix.ts

# Commit the fix
devsolo commit --message "fix: patch critical security vulnerability"

# Ship immediately (bypasses waiting for approvals if configured)
devsolo ship --force
```

## Team Collaboration

### Working with Multiple Developers

devsolo prevents conflicts when multiple developers work on different features.

**Developer A:**
```bash
# Start feature A
devsolo launch --branch feature/api-integration

# Work...
vim src/api-client.ts

# Commit
devsolo commit --message "feat: add API client integration"

# Ship
devsolo ship
```

**Developer B (at the same time):**
```bash
# Start feature B (independent of A)
devsolo launch --branch feature/ui-redesign

# Work...
vim src/components/Header.tsx

# Commit
devsolo commit --message "feat: redesign header component"

# Ship (devsolo handles any rebasing automatically)
devsolo ship
```

**Key Benefits:**
- Each developer has isolated sessions
- No stepping on each other's toes
- Linear history maintained automatically
- No merge commits cluttering history

### Code Review Workflow

Integrate devsolo with your team's review process:

```bash
# 1. Commit and ship to create PR (but don't auto-merge)
devsolo commit --message "feat: initial implementation"
devsolo ship

# This creates the PR and waits for CI
# Reviewers can now review on GitHub

# 2. If changes needed, make them, commit, and ship again
vim src/requested-changes.ts
devsolo commit --message "fix: address review comments"
devsolo ship  # Updates existing PR

# 3. Once approved, ship merges automatically
```

### Pair Programming

Two developers working on the same feature:

**Developer 1:**
```bash
# Start the feature
devsolo launch --branch feature/complex-algorithm

# Push work-in-progress
git push origin feature/complex-algorithm

# Share session ID with Developer 2
devsolo status  # Shows session ID
```

**Developer 2:**
```bash
# Pull the branch
git fetch origin
git checkout feature/complex-algorithm

# Continue work
vim src/algorithm.ts

# Either developer can ship when ready
devsolo ship
```

## CI/CD Integration

### GitHub Actions Integration

devsolo works seamlessly in CI/CD pipelines:

**.github/workflows/deploy.yml:**
```yaml
name: Deploy Feature

on:
  push:
    branches:
      - feature/**

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install devsolo
        run: npm install -g @devsolo/cli

      - name: Ship feature
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          devsolo ship --yes  # Auto-confirm prompts
```

### GitLab CI Integration

**.gitlab-ci.yml:**
```yaml
stages:
  - deploy

deploy-feature:
  stage: deploy
  only:
    - feature/*
  script:
    - npm install -g @devsolo/cli
    - export GITLAB_TOKEN=$CI_JOB_TOKEN
    - devsolo ship --yes
  when: manual  # Trigger manually
```

### Jenkins Pipeline

**Jenkinsfile:**
```groovy
pipeline {
    agent any

    stages {
        stage('Deploy Feature') {
            when {
                branch 'feature/*'
            }
            steps {
                sh 'npm install -g @devsolo/cli'
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh 'devsolo ship --yes'
                }
            }
        }
    }
}
```

## Advanced Workflows

### Managing Multiple Features Simultaneously

Work on multiple features and switch between them:

```bash
# Start feature 1
devsolo launch --branch feature/database-migration
# Work...
vim src/migrations/001_initial.sql
devsolo commit --message "feat: add migration scripts"

# Need to work on something else - launch feature 2
devsolo launch --branch feature/api-docs
# Work...
vim docs/api.md
devsolo commit --message "docs: add API documentation"

# Switch back to feature 1
devsolo swap feature/database-migration
# Continue work...

# Ship feature 1
devsolo ship

# Switch to feature 2
devsolo swap feature/api-docs
# Ship feature 2
devsolo ship
```

### Long-Running Feature Branches

For features that take days or weeks:

```bash
# Day 1: Start feature
devsolo launch --branch feature/major-refactor
vim src/refactor-1.ts
devsolo commit --message "WIP: Initial refactoring"
git push  # Save work

# Day 2: Continue
git pull  # Get latest if working from different machine
# More work...
vim src/refactor-2.ts
devsolo commit --message "WIP: Refactor services"
git push

# Day 5: Ready to ship
# devsolo rebases on latest main automatically
devsolo ship --pr-description "## Summary
Major refactoring of core services

## Changes
- Refactored service layer
- Improved error handling
- Better test coverage"
```

### Handling Merge Conflicts

devsolo automates rebasing, but conflicts may still occur:

```bash
# Ship your feature
devsolo ship

# If conflicts occur during rebase:
# devsolo stops and shows conflicted files

# 1. Resolve conflicts manually
git status  # See conflicted files
vim src/conflicted-file.ts  # Fix conflicts
git add src/conflicted-file.ts

# 2. Continue
git rebase --continue

# 3. Ship again
devsolo ship
```

### Feature Flags Integration

Combine devsolo with feature flags:

```bash
# Launch feature with flag
devsolo launch --branch feature/beta-ui

# Implement behind feature flag
cat > src/featureFlags.ts << EOF
export const BETA_UI = process.env.ENABLE_BETA_UI === 'true';
EOF

# Ship to production (feature disabled)
devsolo ship

# Enable for testing
export ENABLE_BETA_UI=true

# Enable for all users later (separate ship)
devsolo launch --branch feature/enable-beta-ui
vim src/featureFlags.ts  # Change default to true
devsolo ship
```

## Best Practices

### 1. Always Launch Before Starting Work

❌ **Bad:**
```bash
git checkout -b feature/my-feature
# devsolo doesn't know about this!
```

✅ **Good:**
```bash
devsolo launch --branch feature/my-feature
# devsolo tracks everything
```

### 2. Use Descriptive Branch Names

❌ **Bad:**
```bash
devsolo launch --branch feature/fix
devsolo launch --branch feature/stuff
```

✅ **Good:**
```bash
devsolo launch --branch feature/user-authentication
devsolo launch --branch feature/payment-integration
devsolo launch --branch hotfix/memory-leak-in-parser
```

**Branch Naming Rules:**
- **Maximum length**: 80 characters
- **Format**: `type/description-in-kebab-case`
- **Valid types**: feature, bugfix, hotfix, release, chore, docs, test, refactor
- Names exceeding 80 characters will be rejected with truncated suggestions
- Auto-generated names are automatically truncated to fit

**PR Title Prefixes:**
- **Launch workflows**: PRs are prefixed with `[ship]`
- **Hotfix workflows**: PRs are prefixed with `[hotfix]`
- Example: `[ship] feature/user-authentication`

### 3. Check Status Before Shipping

✅ **Good:**
```bash
# Always check status first
devsolo status

# Review what will be committed
git status
git diff

# Then ship
devsolo ship
```

### 4. Clean Up Regularly

```bash
# After merging PRs manually on GitHub
devsolo cleanup

# Or run periodically
devsolo cleanup --days 7  # Clean up sessions older than 7 days
```

### 5. Use Commit and Ship for Everything

❌ **Bad:**
```bash
git add .
git commit -m "My feature"
git push
# Now manually create PR on GitHub
# Manually merge after CI
# Manually delete branches
# Manually sync main
```

✅ **Good:**
```bash
devsolo commit --message "feat: my feature"
devsolo ship
# Commit handles staging and committing
# Ship handles push, PR, merge, cleanup automatically!
```

### 6. Commit Incrementally, Ship When Ready

✅ **Good:**
```bash
# Make some changes
devsolo commit --message "feat: add user model"

# Make more changes
devsolo commit --message "feat: add user controller"

# Make final changes
devsolo commit --message "feat: add user routes"

# Now ship all commits together
devsolo ship
```

### 7. Leverage Claude Code Integration

If using Claude Code:

```bash
# Enable status line for constant visibility
/mcp__devsolo__status_line enable

# Use MCP tools for convenience
/mcp__devsolo__launch
/mcp__devsolo__commit
/mcp__devsolo__ship

# Let Claude Code generate commit messages and PR descriptions
# Just call the commands without parameters!
```

## Common Scenarios

### Scenario 1: Forgot to Launch

You started coding without running `devsolo launch`:

```bash
# You have uncommitted changes on main
git status  # Shows modified files

# Stash changes
git stash

# Launch properly
devsolo launch --branch feature/my-feature

# Restore changes
git stash pop

# Continue normally
devsolo ship
```

### Scenario 2: Need to Abort Feature

Started a feature but decided not to continue:

```bash
# Abort the workflow
devsolo abort

# Keep the branch (for later)
devsolo abort --no-delete

# Or delete everything
devsolo abort --delete-branch
```

### Scenario 3: CI Failed

Your CI checks failed after shipping:

```bash
# Fix the issue
vim src/broken-test.ts

# Commit the fix
devsolo commit --message "fix: broken test"

# Ship again (updates the same PR)
devsolo ship
```

### Scenario 4: Need to Update Dependencies

Mid-feature, you need to update packages:

```bash
# Update dependencies
npm update

# Commit the dependency changes
devsolo commit --message "chore: update dependencies"

# Continue with your feature
vim src/my-feature.ts

# Commit feature changes
devsolo commit --message "feat: implement feature"

# Ship everything together
devsolo ship
```

### Scenario 5: Working Across Multiple Machines

Started work on laptop, continuing on desktop:

**On Laptop:**
```bash
devsolo launch --branch feature/mobile-app
# Work...
git push  # Save work to remote
```

**On Desktop:**
```bash
# Fetch and checkout
git fetch origin
git checkout feature/mobile-app

# Resume work...
# devsolo automatically detects the session

# Ship when done
devsolo ship
```

### Scenario 6: Emergency Rollback

Need to quickly rollback a deployed feature:

```bash
# Create rollback branch from last good commit
git checkout main
git checkout -b hotfix/rollback-bad-feature HEAD~1

# Ship the rollback
devsolo launch --branch hotfix/rollback-bad-feature
devsolo ship --force  # Skip some checks for urgency
```

## Tips for Different Team Sizes

### Solo Developer

```bash
# Simple workflow
devsolo launch
# work...
devsolo ship

# Can skip some checks
devsolo ship --yes  # Auto-confirm everything
```

### Small Team (2-5 developers)

```bash
# Use named branches for clarity
devsolo launch --branch feature/your-name-feature-description

# Regular cleanup
devsolo cleanup  # Run weekly

# Communicate about long-running branches
```

### Large Team (5+ developers)

```bash
# Strict branch naming convention
devsolo launch --branch feature/TICKET-123-short-description

# Integrate with project management
devsolo launch --branch feature/JIRA-456-user-auth

# Regular cleanup is critical
devsolo cleanup --days 7  # Run daily in CI

# Use configuration to enforce standards
devsolo config --global workflows.launch.branchPrefix feature/TEAM-
```

## Keyboard Shortcuts & Aliases

Speed up your workflow with bash aliases:

```bash
# Add to ~/.bashrc or ~/.zshrc

alias hl='devsolo launch'
alias hs='devsolo ship'
alias hst='devsolo status'
alias hsw='devsolo swap'
alias ha='devsolo abort'
alias hc='devsolo cleanup'

# Use them
hl --branch feature/quick-fix
# work...
hs
```

## Conclusion

devsolo is designed to make Git workflows effortless. The key is:

1. **Always launch** before starting work
2. **Commit incrementally** as you make changes
3. **Ship when ready** to push, PR, merge, and cleanup
4. **Always cleanup** after merging
5. **Let devsolo handle** the Git complexity

The separation of commit (version control) and ship (delivery pipeline) gives you flexibility to:
- Commit multiple times during development
- Review your commits before shipping
- Ship only when you're ready to create a PR
- Let Claude Code help generate commit messages and PR descriptions

For more help:
- [Quick Start Guide](QUICKSTART.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Configuration](docs/configuration.md)
- [Full README](README.md)
