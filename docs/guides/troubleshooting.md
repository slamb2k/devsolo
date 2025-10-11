# devsolo Troubleshooting Guide

## Common Issues

### Installation Issues

#### Error: Command not found: devsolo

**Cause**: devsolo is not in your PATH after installation.

**Solution**:
```bash
# Check if installed globally
npm list -g @devsolo/cli

# If not installed, install globally
npm install -g @devsolo/cli

# If installed but not found, check npm bin path
npm bin -g

# Add to PATH (in ~/.bashrc or ~/.zshrc)
export PATH="$(npm bin -g):$PATH"
```

#### Error: EACCES permission denied

**Cause**: Insufficient permissions for global npm install.

**Solution**:
```bash
# Option 1: Use npm's directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g @devsolo/cli

# Option 2: Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Option 3: Use a Node version manager (recommended)
# Install nvm, then:
nvm install node
npm install -g @devsolo/cli
```

### Initialization Issues

#### Error: Not a git repository

**Cause**: Running devsolo init outside a Git repository.

**Solution**:
```bash
# Initialize git first
git init

# Then initialize devsolo
devsolo init
```

#### Error: devsolo.yaml already exists

**Cause**: Project already initialized with devsolo.

**Solution**:
```bash
# Force reinitialize (CAUTION: overwrites configuration)
devsolo init --force

# Or manually edit devsolo.yaml
vim .devsolo/devsolo.yaml
```

### Workflow Issues

#### Error: No active session found

**Cause**: Trying to execute workflow commands without starting a workflow.

**Solution**:
```bash
# Start a new workflow
devsolo launch feature/my-feature

# Or check existing sessions
devsolo sessions

# Resume an existing session
devsolo swap <session-id>
```

#### Error: Cannot launch from dirty working directory

**Cause**: Uncommitted changes in working directory.

**Solution**:
```bash
# Option 1: Commit changes
git add .
git commit -m "WIP: Save changes"

# Option 2: Stash changes
git stash

# Option 3: Force launch (not recommended)
devsolo launch feature/new --force
```

#### Error: Branch already exists

**Cause**: Trying to create a branch that already exists.

**Solution**:
```bash
# Check existing branches
git branch -a

# Delete old branch
git branch -D feature/old-branch
git push origin --delete feature/old-branch

# Or use a different name
devsolo launch feature/new-name
```

### State Machine Issues

#### Error: Invalid state transition

**Cause**: Attempting an invalid workflow state transition.

**Solution**:
```bash
# Check current state
devsolo status

# Review valid transitions
devsolo status --transitions

# Reset session if stuck (CAUTION: loses state)
devsolo abort
devsolo launch feature/branch
```

#### Error: Session corrupted

**Cause**: Session file corrupted or incomplete.

**Solution**:
```bash
# View session details
devsolo sessions --verbose

# Export session for debugging
devsolo debug export-session <session-id>

# Remove corrupted session
rm ~/.devsolo/sessions/<session-id>.json

# Start fresh
devsolo launch feature/new
```

### Git Operation Issues

#### Error: Merge conflict during rebase

**Cause**: Conflicts when rebasing on main.

**Solution**:
```bash
# Resolve conflicts manually
git status  # See conflicted files
# Edit files to resolve conflicts
git add <resolved-files>
git rebase --continue

# Or abort and try different approach
git rebase --abort
devsolo abort
```

#### Error: Cannot push to remote

**Cause**: Remote branch protection or authentication issues.

**Solution**:
```bash
# Check remote configuration
git remote -v

# Test authentication
ssh -T git@github.com  # For SSH
git ls-remote origin   # For HTTPS

# Force push if necessary (CAUTION)
git push --force-with-lease

# Check branch protection rules
# Visit GitHub/GitLab settings
```

### Branch Sync Issues

#### Error: Local main out of sync after PR merge

**Cause**: PR was merged on GitHub (squash merge), but local main doesn't have the squashed commit.

**Solution**:
```bash
# Run cleanup which automatically syncs main
devsolo cleanup

# Or manually sync
git checkout main
git pull origin main
```

**Prevention**: Always run `devsolo cleanup` after merging PRs on GitHub.

#### Error: Cleanup not detecting merged branches

**Cause**: Local main is behind remote, so cleanup can't detect which branches have been merged.

**Solution**:
```bash
# Ensure main is synced (cleanup does this automatically)
devsolo cleanup

# If you used --no-sync, run again without it
devsolo cleanup  # Will sync main first
```

**Why**: Squash merges create new commits on remote that don't exist locally. Cleanup needs the latest main to determine which branches are truly merged.

#### Error: "Cannot fast-forward" during cleanup

**Cause**: Local main has commits that conflict with remote main.

**Solution**:
```bash
# Check what's on local main that shouldn't be
git checkout main
git log origin/main..HEAD

# If local commits are wrong, reset to remote
git reset --hard origin/main

# Then run cleanup
devsolo cleanup
```

**Prevention**: Never commit directly to main. Always use `devsolo launch` for feature work.

### Platform Integration Issues

#### Error: GitHub API rate limit exceeded

**Cause**: Too many API requests without authentication.

**Solution**:
```bash
# Option 1: Use GitHub CLI authentication (recommended for local dev)
gh auth login

# Option 2: Set GitHub token explicitly (for CI/CD)
export GITHUB_TOKEN=ghp_your_token_here

# Or configure in devsolo
devsolo config --global platform.github.token ghp_xxx

# Check rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

**Note**: devsolo automatically uses `gh` CLI authentication if available, so `gh auth login` is often sufficient.

#### Error: GitLab authentication failed

**Cause**: Invalid or missing GitLab token.

**Solution**:
```bash
# Create personal access token in GitLab
# Settings > Access Tokens > Create with 'api' scope

# Set token
export GITLAB_TOKEN=glpat_your_token

# Test authentication
curl --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  https://gitlab.com/api/v4/user
```

### MCP Server Issues

#### Error: Cannot connect to MCP server

**Cause**: MCP server not running or connection issues.

**Solution**:
```bash
# Check if MCP server is running
ps aux | grep devsolo-mcp

# Start MCP server manually
devsolo-mcp serve

# Check port availability
lsof -i :8080  # Default port

# Use different port
DEVSOLO_MCP_PORT=8081 devsolo status
```

#### Error: MCP server timeout

**Cause**: Operations taking too long.

**Solution**:
```bash
# Increase timeout
export DEVSOLO_MCP_TIMEOUT=60000  # 60 seconds

# Or in config
devsolo config mcp.timeout 60000

# Check server logs
tail -f ~/.devsolo/logs/mcp-server.log
```

### Performance Issues

#### Slow operations on large repositories

**Solution**:
```bash
# Enable shallow clone
devsolo config performance.shallowClone true

# Use sparse checkout
git sparse-checkout init --cone
git sparse-checkout set src tests

# Optimize git
git gc --aggressive
git repack -Ad
```

#### High memory usage

**Solution**:
```bash
# Limit concurrent operations
devsolo config sessions.maxConcurrent 3

# Clear old sessions
devsolo cleanup --all

# Reduce git memory usage
git config pack.windowMemory "100m"
git config pack.packSizeLimit "100m"
```

## Diagnostic Commands

### System Information

```bash
# Show environment and versions
devsolo doctor

# Output:
# ✓ Node.js: v20.0.0
# ✓ Git: 2.40.0
# ✓ devsolo: 1.0.0
# ✓ Platform: darwin
# ✗ GitHub token: not set
```

### Debug Mode

```bash
# Enable debug output
DEVSOLO_DEBUG=1 devsolo status

# Or verbose mode
devsolo status --verbose

# Log to file
DEVSOLO_LOG_FILE=debug.log devsolo ship
```

### Session Debugging

```bash
# Export session for analysis
devsolo debug export-session <session-id> > session.json

# Validate session file
devsolo debug validate-session session.json

# Replay session
devsolo debug replay-session session.json
```

## Recovery Procedures

### Recover from Aborted Workflow

```bash
# Check last known state
devsolo sessions --all

# Find your branch
git branch | grep feature/

# Create new session from branch
git checkout feature/your-branch
devsolo recover

# Continue workflow
devsolo ship
```

### Reset devsolo Completely

```bash
# WARNING: Loses all sessions and configuration

# Backup current state
cp -r ~/.devsolo ~/.devsolo.backup

# Remove devsolo data
rm -rf ~/.devsolo
rm -rf ./.devsolo

# Reinitialize
devsolo init
```

### Manual State Recovery

```bash
# If automatic recovery fails

# 1. Check git state
git status
git branch

# 2. Find session file
ls ~/.devsolo/sessions/

# 3. Manually edit state
vim ~/.devsolo/sessions/<session-id>.json
# Change "state": "ERROR" to last known good state

# 4. Resume
devsolo status
```

## Getting Help

### Built-in Help

```bash
# General help
devsolo --help

# Command-specific help
devsolo launch --help
devsolo ship --help

# Show examples
devsolo examples
```

### Logs and Debugging

```bash
# View logs
tail -f ~/.devsolo/logs/devsolo.log

# Enable trace logging
DEVSOLO_LOG_LEVEL=trace devsolo status

# MCP server logs
tail -f ~/.devsolo/logs/mcp-server.log
```

### Community Support

1. **GitHub Issues**: https://github.com/yourusername/devsolo/issues
2. **Documentation**: https://github.com/yourusername/devsolo/wiki
3. **Discord**: Join our Discord server for real-time help

### Reporting Bugs

When reporting bugs, include:

```bash
# Generate bug report
devsolo debug report > bug-report.txt

# Includes:
# - System information
# - Configuration (sanitized)
# - Recent commands
# - Error logs
# - Session state
```

## Prevention Tips

1. **Always run `devsolo validate` after configuration changes**
2. **Keep devsolo updated**: `npm update -g @devsolo/cli`
3. **Regular cleanup**: `devsolo cleanup --old`
4. **Use `--dry-run` for testing**: `devsolo ship --dry-run`
5. **Enable verbose mode when troubleshooting**: `--verbose`
6. **Check status before operations**: `devsolo status`
7. **Backup sessions before major operations**

## FAQ

**Q: Can I use devsolo with existing Git workflows?**
A: Yes, devsolo is additive and doesn't break existing workflows.

**Q: What happens if devsolo crashes mid-operation?**
A: Session state is preserved. Run `devsolo recover` to continue.

**Q: Can I disable specific features?**
A: Yes, most features can be disabled in configuration.

**Q: How do I migrate from git-flow?**
A: Run `devsolo migrate git-flow` for automatic migration.

**Q: My local main is out of sync after merging PR on GitHub. How do I fix this?**
A: Run `devsolo cleanup` which automatically syncs main with remote before cleaning up branches. This ensures your local main has the squashed PR commits.

**Q: Why does cleanup want to sync main before cleaning branches?**
A: When PRs are merged on GitHub with squash merge, the squashed commit only exists on the remote. Your local main needs to pull this commit before cleanup can properly detect which branches have been merged. Skipping this step (with `--no-sync`) may result in cleanup not detecting merged branches.

**Q: Is devsolo compatible with CI/CD?**
A: Yes, use `DEVSOLO_AUTO_YES=1` for non-interactive mode.