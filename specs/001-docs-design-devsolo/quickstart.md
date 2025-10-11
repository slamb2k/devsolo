# Quickstart: devsolo Git Workflow Automation

This quickstart validates the devsolo implementation by walking through the primary user scenarios from the specification.

## Prerequisites

- Node.js 20+ installed
- Git 2.30+ installed
- GitHub or GitLab account with API token

## Installation

```bash
# Install devsolo globally
npm install -g @devsolo/cli

# The interactive installer will launch automatically
# Choose your profile:
# - Solo Developer (recommended for individuals)
# - Team Workflow (for collaborative development)
# - Custom (pick specific components)
```

## Scenario 1: Initialize a New Project

**Given**: A new project without Git initialization
**When**: Developer runs initialization command
**Then**: System creates Git repository and configures devsolo

```bash
# Create a new project directory
mkdir my-awesome-project
cd my-awesome-project

# Initialize devsolo (MANDATORY first step)
/devsolo:init

# Expected output:
# 🚀 Initializing devsolo...
# ✅ Git repository created
# ✅ Remote repository created on GitHub
# ✅ Hooks installed to .devsolo/hooks/
# ✅ Status line configured
# ✅ Project marked as initialized (devsolo.yaml)
#
# Ready to use devsolo commands!
```

**Validation**:
- [ ] Git repository exists (.git directory)
- [ ] Remote repository created (if requested)
- [ ] devsolo.yaml file exists
- [ ] Hooks installed in .devsolo/hooks/
- [ ] Status line appears in terminal

## Scenario 2: Create and Develop a Feature

**Given**: An initialized project
**When**: Developer starts a new feature workflow
**Then**: System creates feature branch and tracks session

```bash
# Start a new feature workflow
/devsolo:launch

# System prompts for branch name or auto-generates
# Example: feature/add-user-authentication

# Make some changes to your code
echo "// New feature code" >> feature.js

# Check workflow status
/devsolo:status

# Expected output:
# 📊 devsolo Status
# ┌─────────────────────────────────────┐
# │ Active Session                      │
# ├─────────────────────────────────────┤
# │ ID: uuid-here                       │
# │ Branch: feature/add-user-auth       │
# │ State: BRANCH_READY                 │
# │ Type: launch                        │
# └─────────────────────────────────────┘
```

**Validation**:
- [ ] Feature branch created from main
- [ ] Branch is up-to-date with main
- [ ] Session tracked with unique ID
- [ ] Status shows current state

## Scenario 3: Ship Code to Production

**Given**: Changes ready to ship
**When**: Developer runs ship command
**Then**: System guides through complete merge workflow

```bash
# Ship your feature
/devsolo:ship

# System workflow:
# 1. Prompts for commit message (or generates with AI)
# 2. Commits all changes
# 3. Pushes to remote
# 4. Creates pull request
# 5. Waits for approval
# 6. Rebases on main
# 7. Squash-merges to main
# 8. Cleans up branch

# Expected interactions:
# > Ready to commit? (y/n): y
# > Commit message: Add user authentication feature
# > Push to remote? (y/n): y
# > Create PR? (y/n): y
#
# ✅ Changes committed
# ✅ Pushed to remote
# ✅ PR #123 created
# ⏳ Waiting for approval...
# ✅ Approved!
# ✅ Rebased on main
# ✅ Merged to main
# ✅ Branch deleted
#
# 🎉 Ship complete!
```

**Validation**:
- [ ] Linear history maintained (no merge commits)
- [ ] PR created with proper description
- [ ] Squash-merged to main
- [ ] Feature branch cleaned up
- [ ] Session marked as complete

## Scenario 4: Emergency Hotfix

**Given**: Critical production issue
**When**: Developer initiates hotfix workflow
**Then**: System creates hotfix and manages deployment

```bash
# Start emergency hotfix
/devsolo:hotfix

# System creates hotfix branch from main
# Example: hotfix/fix-critical-bug

# Fix the issue
echo "// Bug fix" >> bugfix.js

# Continue hotfix workflow
/devsolo:ship

# System fast-tracks the hotfix:
# - Validates changes
# - Creates expedited PR
# - Deploys to production
# - Backports to development branches
```

**Validation**:
- [ ] Hotfix branch created from main
- [ ] Changes validated before deployment
- [ ] Deployed without waiting for full review
- [ ] Backported to relevant branches

## Scenario 5: Multi-tasking with Sessions

**Given**: Multiple active workflows
**When**: Developer switches between sessions
**Then**: System preserves state of each session

```bash
# Start first feature
/devsolo:launch
# Branch: feature/feature-one

# Start second feature (switches automatically)
/devsolo:launch
# Branch: feature/feature-two

# List all sessions
/devsolo:sessions

# Expected output:
# 📋 Active Sessions
# ┌──────┬─────────────────────┬──────────────┐
# │ ID   │ Branch              │ State        │
# ├──────┼─────────────────────┼──────────────┤
# │ xxx1 │ feature/feature-one │ BRANCH_READY │
# │ xxx2 │ feature/feature-two │ BRANCH_READY │
# └──────┴─────────────────────┴──────────────┘

# Switch back to first feature
/devsolo:swap feature/feature-one

# Continue work on first feature
```

**Validation**:
- [ ] Multiple sessions tracked simultaneously
- [ ] Each session maintains independent state
- [ ] Switching preserves session state
- [ ] Git branch switches correctly

## Scenario 6: Graceful Degradation Without AI

**Given**: Workflow in progress
**When**: AI assistance unavailable
**Then**: System continues with manual fallbacks

```bash
# Disable AI for testing
export DEVSOLO_AI_ENABLED=false

# Continue workflow
/devsolo:ship

# System prompts for manual input:
# > Enter commit message manually: Fixed user authentication
# > Enter PR title: Fix authentication bug
# > Enter PR description: This PR fixes the authentication issue...

# Workflow continues normally with manual input
```

**Validation**:
- [ ] Workflow continues without AI
- [ ] Manual input accepted for all AI features
- [ ] No workflow blocking due to AI unavailability
- [ ] Same end result achieved

## Edge Case Testing

### Merge Conflict Handling
```bash
# Create a conflict scenario
/devsolo:launch
# Make changes that will conflict with main
# Someone else merges conflicting changes to main

/devsolo:ship
# System detects conflict during rebase
# > Conflict detected! Please resolve manually
# > Files with conflicts: [file1.js, file2.js]
# > Run '/devsolo:ship' again when resolved
```

### Interrupted Workflow Recovery
```bash
# Start a workflow
/devsolo:launch

# Simulate terminal crash (Ctrl+C or close terminal)
# Open new terminal

/devsolo:status
# System shows interrupted session and offers recovery
# > Found interrupted session on branch: feature/xxx
# > Resume workflow? (y/n): y
```

### No Remote Repository
```bash
# In a local-only repository
/devsolo:init

# System detects no remote
# > No remote repository found
# > Create one on GitHub? (y/n): y
# > Repository name: my-awesome-project
# > Visibility (public/private): private
# ✅ Repository created: https://github.com/user/my-awesome-project
```

## Validation Checklist

### Core Functionality
- [ ] Initialization creates all required files
- [ ] Linear history enforced (no merge commits)
- [ ] Pre-merge rebasing catches conflicts
- [ ] Session state persists across terminal sessions
- [ ] User approval required for critical operations

### User Experience
- [ ] Visual feedback with colors and icons
- [ ] Clear error messages with recovery steps
- [ ] Status line shows current context
- [ ] Commands respond in <100ms

### Safety Features
- [ ] Pre-commit hooks block direct main commits
- [ ] Workflow abortion available at safe points
- [ ] Automatic rollback on failures
- [ ] Audit trail captures all operations

### AI Integration
- [ ] Intelligent commit messages when AI available
- [ ] Manual fallbacks when AI unavailable
- [ ] No workflow blocking without AI

## Performance Validation

Run these tests to validate performance requirements:

```bash
# Test 1: Command response time
time /devsolo:status
# Expected: <100ms

# Test 2: Multiple session handling
for i in {1..10}; do
  /devsolo:launch --branch "test-$i" &
done
wait
/devsolo:sessions
# Expected: All 10 sessions tracked correctly

# Test 3: Large repository handling
# In a repository with 10,000+ files
/devsolo:ship
# Expected: No performance degradation
```

## Troubleshooting

### Common Issues

**"devsolo.yaml not found"**
- Run `/devsolo:init` first
- This is mandatory before any other command

**"Git hooks not executing"**
- Check hook permissions: `ls -la .devsolo/hooks/`
- Reinstall hooks: `/devsolo:config --reinstall-hooks`

**"Session state corrupted"**
- Run `/devsolo:validate` to check integrity
- Use `/devsolo:abort` to clean up if needed

**"Cannot create remote repository"**
- Verify API token is configured
- Check network connectivity
- Try manual creation and re-init

## Success Criteria

The implementation is considered successful when:

1. ✅ All 6 primary scenarios pass
2. ✅ Edge cases handled gracefully
3. ✅ Performance requirements met
4. ✅ No manual Git commands needed for standard workflows
5. ✅ 75% reduction in merge conflicts (measure over time)
6. ✅ 4 hours/week saved per developer (track with metrics)

## Next Steps

After validation:
1. Configure team settings: `/devsolo:config --team`
2. Set up CI/CD integration
3. Train team on workflows
4. Monitor metrics dashboard
5. Gather feedback for improvements

---

*This quickstart is part of the devsolo implementation validation suite.*