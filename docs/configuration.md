# han-solo Configuration Guide

## Overview

han-solo uses a hierarchical configuration system with three levels:

1. **Global Configuration** (`~/.hansolo/config.yaml`)
2. **Project Configuration** (`<project>/.hansolo/config.yaml`)
3. **Session Configuration** (runtime overrides)

Settings cascade from global → project → session, with more specific settings overriding broader ones.

## Configuration File Format

All configuration files use YAML format:

```yaml
version: 1.0.0
defaults:
  autoRebase: true
  squashMerge: true
```

## Global Configuration

Located at `~/.hansolo/config.yaml`, created automatically on first install.

### Default Settings

```yaml
# han-solo Global Configuration
version: 1.0.0

# Default settings for all projects
defaults:
  autoRebase: true              # Auto-rebase before ship
  squashMerge: true             # Use squash-merge for PRs
  deleteAfterMerge: true        # Delete branch after merge
  requireApproval: true         # Require PR approval
  linearHistory: true           # Enforce linear history (REQUIRED)

# Git platform preferences
platform:
  type: auto                    # auto | github | gitlab | bitbucket
  github:
    token: ${GITHUB_TOKEN}      # Or set in environment
    enterprise: false
    host: api.github.com
  gitlab:
    token: ${GITLAB_TOKEN}
    host: gitlab.com

# Visual output preferences
ui:
  colors: true                  # Color output
  emoji: true                   # Show emoji icons
  timestamps: false             # Show timestamps
  verbose: false                # Verbose logging
  progressBars: true            # Show progress bars
  banners: true                 # Show ASCII banners

# Session management
sessions:
  maxConcurrent: 10             # Max concurrent sessions
  autoCleanup: true             # Auto-cleanup old sessions
  cleanupAfterDays: 30          # Days before cleanup
  persistState: true            # Persist state between runs

# Workflow settings
workflows:
  launch:
    baseBranch: main            # Default base branch
    branchPrefix: feature/      # Branch name prefix
    autoStash: true             # Auto-stash changes
  ship:
    runTests: true              # Run tests before ship
    updateDependencies: false   # Update deps on ship
    generateChangelog: false    # Generate changelog
  hotfix:
    baseBranch: main
    branchPrefix: hotfix/
    autoBackport: true          # Backport to release branches

# Git hooks
hooks:
  install: true                 # Install git hooks
  preCommit: true              # Enable pre-commit hook
  prePush: true                # Enable pre-push hook
  postMerge: true              # Enable post-merge hook

# MCP Server settings
mcp:
  port: 0                      # 0 = auto-select port
  host: localhost
  timeout: 30000               # Timeout in ms
  maxRetries: 3
```

## Project Configuration

Located at `<project>/.hansolo/config.yaml`, created by `hansolo init`.

### Project-Specific Settings

```yaml
version: 1.0.0

# Project metadata
project:
  name: my-project
  repository: https://github.com/user/repo
  mainBranch: main              # or master, develop

# Override global defaults
defaults:
  requireApproval: false        # Skip approval for this project

# Project-specific platform settings
platform:
  type: github                  # Force GitHub for this project
  github:
    owner: myorg
    repo: myrepo

# Custom branch naming
branches:
  feature: feat/                # Override feature prefix
  hotfix: fix/                  # Override hotfix prefix
  release: release/             # Release branch prefix

# CI/CD integration
ci:
  provider: github-actions      # github-actions | gitlab-ci | jenkins
  waitForChecks: true          # Wait for CI checks
  requiredChecks:
    - build
    - test
    - lint

# Team settings
team:
  defaultReviewers:
    - @teamlead
    - @senior-dev
  codeowners: true              # Use CODEOWNERS file

# Templates
templates:
  commitMessage: .hansolo/templates/commit.txt
  pullRequest: .hansolo/templates/pr.md
```

## Environment Variables

han-solo respects these environment variables:

```bash
# Authentication tokens
GITHUB_TOKEN=ghp_xxxx
GITLAB_TOKEN=glpat-xxxx
BITBUCKET_TOKEN=xxx

# Configuration paths
HANSOLO_CONFIG_DIR=~/.config/hansolo
HANSOLO_PROJECT_CONFIG=./custom-config.yaml

# Runtime overrides
HANSOLO_NO_COLOR=1              # Disable colors
HANSOLO_VERBOSE=1               # Enable verbose output
HANSOLO_DRY_RUN=1              # Dry run mode
HANSOLO_SKIP_HOOKS=1           # Skip git hooks
HANSOLO_AUTO_YES=1             # Auto-confirm prompts

# MCP Server
HANSOLO_MCP_PORT=8080
HANSOLO_MCP_HOST=0.0.0.0
```

## Command-Line Overrides

Most configuration options can be overridden via CLI flags:

```bash
# Override configuration
hansolo launch --no-rebase
hansolo ship --no-squash
hansolo ship --skip-tests

# Platform selection
hansolo init --platform github
hansolo init --platform gitlab

# UI preferences
hansolo status --no-color
hansolo status --verbose
hansolo sessions --json
```

## Configuration Commands

### View Configuration

```bash
# Show effective configuration
hansolo config

# Show specific setting
hansolo config defaults.autoRebase

# Show configuration source
hansolo config --source
```

### Set Configuration

```bash
# Set global configuration
hansolo config --global defaults.autoRebase false

# Set project configuration
hansolo config defaults.requireApproval true

# Set platform token
hansolo config --global platform.github.token ghp_xxxx
```

### Reset Configuration

```bash
# Reset to defaults
hansolo config --reset

# Reset specific setting
hansolo config --unset defaults.autoRebase
```

## Configuration Validation

han-solo validates configuration on load:

1. **Schema Validation**: Ensures valid YAML and correct types
2. **Dependency Check**: Verifies required tools are available
3. **Permission Check**: Ensures write access to required directories
4. **Token Validation**: Tests API tokens if provided

Run validation manually:

```bash
hansolo validate --config
```

## Migration from Other Tools

### From git-flow

```bash
# Import git-flow configuration
hansolo migrate git-flow

# Maps git-flow settings to han-solo:
# - master → mainBranch
# - develop → removed (linear history)
# - feature/ → branches.feature
# - hotfix/ → branches.hotfix
```

### From GitHub Flow

```bash
# Import GitHub Flow settings
hansolo migrate github-flow

# Simple mapping:
# - main branch preserved
# - feature branches preserved
# - Linear history already enforced
```

## Troubleshooting Configuration

### Configuration Not Loading

```bash
# Check configuration paths
hansolo config --paths

# Validate configuration files
hansolo validate --config

# Show parse errors
hansolo config --debug
```

### Token Issues

```bash
# Test platform authentication
hansolo validate --auth

# Clear cached tokens
hansolo config --clear-tokens
```

### Performance Tuning

```yaml
# Optimize for large repositories
performance:
  parallelOperations: true
  shallowClone: true
  sparseCheckout: false
  gcAuto: 1000

# Optimize for slow networks
network:
  timeout: 60000
  retries: 5
  compression: 9
```

## Best Practices

1. **Version Control Config**: Commit `.hansolo/config.yaml` to share project settings
2. **Use Environment Variables**: Store tokens in environment, not config files
3. **Project Templates**: Create template configurations for different project types
4. **Regular Cleanup**: Enable `autoCleanup` to prevent session accumulation
5. **CI Integration**: Configure CI settings for automated workflows

## Security Considerations

1. **Never commit tokens** to version control
2. **Use environment variables** or secure credential stores
3. **Restrict file permissions** on config files with tokens
4. **Rotate tokens regularly**
5. **Use read-only tokens** where possible

## Example Configurations

### Open Source Project

```yaml
version: 1.0.0
defaults:
  requireApproval: true
  deleteAfterMerge: true
platform:
  type: github
team:
  defaultReviewers: []  # Community reviews
ci:
  requiredChecks:
    - continuous-integration
```

### Enterprise Project

```yaml
version: 1.0.0
defaults:
  requireApproval: true
platform:
  type: github
  github:
    enterprise: true
    host: github.enterprise.com
team:
  defaultReviewers:
    - @security-team
    - @architecture-team
  codeowners: true
ci:
  requiredChecks:
    - security-scan
    - compliance-check
    - integration-test
```

### Personal Project

```yaml
version: 1.0.0
defaults:
  requireApproval: false
  autoRebase: true
ui:
  verbose: true
  emoji: false
workflows:
  ship:
    runTests: false
```