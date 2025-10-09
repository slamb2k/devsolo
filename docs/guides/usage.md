# han-solo Usage Guide

Practical examples and best practices for using han-solo in real-world development scenarios.

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
hansolo launch
# Generated branch: feature/2025-01-15-14-30-45

# 2. Make your changes
vim src/new-feature.ts
vim tests/new-feature.test.ts

# 3. Commit your changes
hansolo commit --message "feat: add new feature

Implemented new feature with comprehensive tests.
Updated documentation to reflect changes."

# 4. Ship it (pushes, creates PR, merges, cleans up)
hansolo ship --pr-description "## Summary
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
hansolo launch --branch feature/user-authentication

# Work on the feature
vim src/auth-endpoints.ts

# Commit changes
hansolo commit --message "feat: implement user authentication

Added OAuth2 endpoints and JWT token validation.
Includes middleware for protected routes."

# Ship it
hansolo ship --pr-description "## Summary
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
hansolo launch --branch hotfix/critical-security-bug

# Fix the bug
vim src/security-fix.ts

# Commit the fix
hansolo commit --message "fix: patch critical security vulnerability"

# Ship immediately (bypasses waiting for approvals if configured)
hansolo ship --force
```

## Team Collaboration

### Working with Multiple Developers

han-solo prevents conflicts when multiple developers work on different features.

**Developer A:**
```bash
# Start feature A
hansolo launch --branch feature/api-integration

# Work...
vim src/api-client.ts

# Commit
hansolo commit --message "feat: add API client integration"

# Ship
hansolo ship
```

**Developer B (at the same time):**
```bash
# Start feature B (independent of A)
hansolo launch --branch feature/ui-redesign

# Work...
vim src/components/Header.tsx

# Commit
hansolo commit --message "feat: redesign header component"

# Ship (han-solo handles any rebasing automatically)
hansolo ship
```

**Key Benefits:**
- Each developer has isolated sessions
- No stepping on each other's toes
- Linear history maintained automatically
- No merge commits cluttering history

### Code Review Workflow

Integrate han-solo with your team's review process:

```bash
# 1. Commit and ship to create PR (but don't auto-merge)
hansolo commit --message "feat: initial implementation"
hansolo ship

# This creates the PR and waits for CI
# Reviewers can now review on GitHub

# 2. If changes needed, make them, commit, and ship again
vim src/requested-changes.ts
hansolo commit --message "fix: address review comments"
hansolo ship  # Updates existing PR

# 3. Once approved, ship merges automatically
```

### Pair Programming

Two developers working on the same feature:

**Developer 1:**
```bash
# Start the feature
hansolo launch --branch feature/complex-algorithm

# Push work-in-progress
git push origin feature/complex-algorithm

# Share session ID with Developer 2
hansolo status  # Shows session ID
```

**Developer 2:**
```bash
# Pull the branch
git fetch origin
git checkout feature/complex-algorithm

# Continue work
vim src/algorithm.ts

# Either developer can ship when ready
hansolo ship
```

## CI/CD Integration

### GitHub Actions Integration

han-solo works seamlessly in CI/CD pipelines:

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

      - name: Install han-solo
        run: npm install -g @hansolo/cli

      - name: Ship feature
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          hansolo ship --yes  # Auto-confirm prompts
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
    - npm install -g @hansolo/cli
    - export GITLAB_TOKEN=$CI_JOB_TOKEN
    - hansolo ship --yes
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
                sh 'npm install -g @hansolo/cli'
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh 'hansolo ship --yes'
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
hansolo launch --branch feature/database-migration
# Work...
vim src/migrations/001_initial.sql
hansolo commit --message "feat: add migration scripts"

# Need to work on something else - launch feature 2
hansolo launch --branch feature/api-docs
# Work...
vim docs/api.md
hansolo commit --message "docs: add API documentation"

# Switch back to feature 1
hansolo swap feature/database-migration
# Continue work...

# Ship feature 1
hansolo ship

# Switch to feature 2
hansolo swap feature/api-docs
# Ship feature 2
hansolo ship
```

### Long-Running Feature Branches

For features that take days or weeks:

```bash
# Day 1: Start feature
hansolo launch --branch feature/major-refactor
vim src/refactor-1.ts
hansolo commit --message "WIP: Initial refactoring"
git push  # Save work

# Day 2: Continue
git pull  # Get latest if working from different machine
# More work...
vim src/refactor-2.ts
hansolo commit --message "WIP: Refactor services"
git push

# Day 5: Ready to ship
# han-solo rebases on latest main automatically
hansolo ship --pr-description "## Summary
Major refactoring of core services

## Changes
- Refactored service layer
- Improved error handling
- Better test coverage"
```

### Handling Merge Conflicts

han-solo automates rebasing, but conflicts may still occur:

```bash
# Ship your feature
hansolo ship

# If conflicts occur during rebase:
# han-solo stops and shows conflicted files

# 1. Resolve conflicts manually
git status  # See conflicted files
vim src/conflicted-file.ts  # Fix conflicts
git add src/conflicted-file.ts

# 2. Continue
git rebase --continue

# 3. Ship again
hansolo ship
```

### Feature Flags Integration

Combine han-solo with feature flags:

```bash
# Launch feature with flag
hansolo launch --branch feature/beta-ui

# Implement behind feature flag
cat > src/featureFlags.ts << EOF
export const BETA_UI = process.env.ENABLE_BETA_UI === 'true';
EOF

# Ship to production (feature disabled)
hansolo ship

# Enable for testing
export ENABLE_BETA_UI=true

# Enable for all users later (separate ship)
hansolo launch --branch feature/enable-beta-ui
vim src/featureFlags.ts  # Change default to true
hansolo ship
```

## Best Practices

### 1. Always Launch Before Starting Work

❌ **Bad:**
```bash
git checkout -b feature/my-feature
# han-solo doesn't know about this!
```

✅ **Good:**
```bash
hansolo launch --branch feature/my-feature
# han-solo tracks everything
```

### 2. Use Descriptive Branch Names

❌ **Bad:**
```bash
hansolo launch --branch feature/fix
hansolo launch --branch feature/stuff
```

✅ **Good:**
```bash
hansolo launch --branch feature/user-authentication
hansolo launch --branch feature/payment-integration
hansolo launch --branch hotfix/memory-leak-in-parser
```

### 3. Check Status Before Shipping

✅ **Good:**
```bash
# Always check status first
hansolo status

# Review what will be committed
git status
git diff

# Then ship
hansolo ship
```

### 4. Clean Up Regularly

```bash
# After merging PRs manually on GitHub
hansolo cleanup

# Or run periodically
hansolo cleanup --days 7  # Clean up sessions older than 7 days
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
hansolo commit --message "feat: my feature"
hansolo ship
# Commit handles staging and committing
# Ship handles push, PR, merge, cleanup automatically!
```

### 6. Commit Incrementally, Ship When Ready

✅ **Good:**
```bash
# Make some changes
hansolo commit --message "feat: add user model"

# Make more changes
hansolo commit --message "feat: add user controller"

# Make final changes
hansolo commit --message "feat: add user routes"

# Now ship all commits together
hansolo ship
```

### 7. Leverage Claude Code Integration

If using Claude Code:

```bash
# Enable status line for constant visibility
/mcp__hansolo__status_line enable

# Use MCP tools for convenience
/mcp__hansolo__launch
/mcp__hansolo__commit
/mcp__hansolo__ship

# Let Claude Code generate commit messages and PR descriptions
# Just call the commands without parameters!
```

## Common Scenarios

### Scenario 1: Forgot to Launch

You started coding without running `hansolo launch`:

```bash
# You have uncommitted changes on main
git status  # Shows modified files

# Stash changes
git stash

# Launch properly
hansolo launch --branch feature/my-feature

# Restore changes
git stash pop

# Continue normally
hansolo ship
```

### Scenario 2: Need to Abort Feature

Started a feature but decided not to continue:

```bash
# Abort the workflow
hansolo abort

# Keep the branch (for later)
hansolo abort --no-delete

# Or delete everything
hansolo abort --delete-branch
```

### Scenario 3: CI Failed

Your CI checks failed after shipping:

```bash
# Fix the issue
vim src/broken-test.ts

# Commit the fix
hansolo commit --message "fix: broken test"

# Ship again (updates the same PR)
hansolo ship
```

### Scenario 4: Need to Update Dependencies

Mid-feature, you need to update packages:

```bash
# Update dependencies
npm update

# Commit the dependency changes
hansolo commit --message "chore: update dependencies"

# Continue with your feature
vim src/my-feature.ts

# Commit feature changes
hansolo commit --message "feat: implement feature"

# Ship everything together
hansolo ship
```

### Scenario 5: Working Across Multiple Machines

Started work on laptop, continuing on desktop:

**On Laptop:**
```bash
hansolo launch --branch feature/mobile-app
# Work...
git push  # Save work to remote
```

**On Desktop:**
```bash
# Fetch and checkout
git fetch origin
git checkout feature/mobile-app

# Resume work...
# han-solo automatically detects the session

# Ship when done
hansolo ship
```

### Scenario 6: Emergency Rollback

Need to quickly rollback a deployed feature:

```bash
# Create rollback branch from last good commit
git checkout main
git checkout -b hotfix/rollback-bad-feature HEAD~1

# Ship the rollback
hansolo launch --branch hotfix/rollback-bad-feature
hansolo ship --force  # Skip some checks for urgency
```

## Tips for Different Team Sizes

### Solo Developer

```bash
# Simple workflow
hansolo launch
# work...
hansolo ship

# Can skip some checks
hansolo ship --yes  # Auto-confirm everything
```

### Small Team (2-5 developers)

```bash
# Use named branches for clarity
hansolo launch --branch feature/your-name-feature-description

# Regular cleanup
hansolo cleanup  # Run weekly

# Communicate about long-running branches
```

### Large Team (5+ developers)

```bash
# Strict branch naming convention
hansolo launch --branch feature/TICKET-123-short-description

# Integrate with project management
hansolo launch --branch feature/JIRA-456-user-auth

# Regular cleanup is critical
hansolo cleanup --days 7  # Run daily in CI

# Use configuration to enforce standards
hansolo config --global workflows.launch.branchPrefix feature/TEAM-
```

## Keyboard Shortcuts & Aliases

Speed up your workflow with bash aliases:

```bash
# Add to ~/.bashrc or ~/.zshrc

alias hl='hansolo launch'
alias hs='hansolo ship'
alias hst='hansolo status'
alias hsw='hansolo swap'
alias ha='hansolo abort'
alias hc='hansolo cleanup'

# Use them
hl --branch feature/quick-fix
# work...
hs
```

## Conclusion

han-solo is designed to make Git workflows effortless. The key is:

1. **Always launch** before starting work
2. **Commit incrementally** as you make changes
3. **Ship when ready** to push, PR, merge, and cleanup
4. **Always cleanup** after merging
5. **Let han-solo handle** the Git complexity

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
