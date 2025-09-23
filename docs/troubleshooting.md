# han-solo Troubleshooting Guide

## Common Issues

### Installation Issues

#### Error: Command not found: hansolo

**Cause**: han-solo is not in your PATH after installation.

**Solution**:
```bash
# Check if installed globally
npm list -g @hansolo/cli

# If not installed, install globally
npm install -g @hansolo/cli

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
npm install -g @hansolo/cli

# Option 2: Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Option 3: Use a Node version manager (recommended)
# Install nvm, then:
nvm install node
npm install -g @hansolo/cli
```

### Initialization Issues

#### Error: Not a git repository

**Cause**: Running hansolo init outside a Git repository.

**Solution**:
```bash
# Initialize git first
git init

# Then initialize han-solo
hansolo init
```

#### Error: hansolo.yaml already exists

**Cause**: Project already initialized with han-solo.

**Solution**:
```bash
# Force reinitialize (CAUTION: overwrites configuration)
hansolo init --force

# Or manually edit hansolo.yaml
vim .hansolo/hansolo.yaml
```

### Workflow Issues

#### Error: No active session found

**Cause**: Trying to execute workflow commands without starting a workflow.

**Solution**:
```bash
# Start a new workflow
hansolo launch feature/my-feature

# Or check existing sessions
hansolo sessions

# Resume an existing session
hansolo swap <session-id>
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
hansolo launch feature/new --force
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
hansolo launch feature/new-name
```

### State Machine Issues

#### Error: Invalid state transition

**Cause**: Attempting an invalid workflow state transition.

**Solution**:
```bash
# Check current state
hansolo status

# Review valid transitions
hansolo status --transitions

# Reset session if stuck (CAUTION: loses state)
hansolo abort
hansolo launch feature/branch
```

#### Error: Session corrupted

**Cause**: Session file corrupted or incomplete.

**Solution**:
```bash
# View session details
hansolo sessions --verbose

# Export session for debugging
hansolo debug export-session <session-id>

# Remove corrupted session
rm ~/.hansolo/sessions/<session-id>.json

# Start fresh
hansolo launch feature/new
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
hansolo abort
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

### Platform Integration Issues

#### Error: GitHub API rate limit exceeded

**Cause**: Too many API requests without authentication.

**Solution**:
```bash
# Set GitHub token
export GITHUB_TOKEN=ghp_your_token_here

# Or configure in han-solo
hansolo config --global platform.github.token ghp_xxx

# Check rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

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
ps aux | grep hansolo-mcp

# Start MCP server manually
hansolo-mcp serve

# Check port availability
lsof -i :8080  # Default port

# Use different port
HANSOLO_MCP_PORT=8081 hansolo status
```

#### Error: MCP server timeout

**Cause**: Operations taking too long.

**Solution**:
```bash
# Increase timeout
export HANSOLO_MCP_TIMEOUT=60000  # 60 seconds

# Or in config
hansolo config mcp.timeout 60000

# Check server logs
tail -f ~/.hansolo/logs/mcp-server.log
```

### Performance Issues

#### Slow operations on large repositories

**Solution**:
```bash
# Enable shallow clone
hansolo config performance.shallowClone true

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
hansolo config sessions.maxConcurrent 3

# Clear old sessions
hansolo cleanup --all

# Reduce git memory usage
git config pack.windowMemory "100m"
git config pack.packSizeLimit "100m"
```

## Diagnostic Commands

### System Information

```bash
# Show environment and versions
hansolo doctor

# Output:
# ✓ Node.js: v20.0.0
# ✓ Git: 2.40.0
# ✓ han-solo: 1.0.0
# ✓ Platform: darwin
# ✗ GitHub token: not set
```

### Debug Mode

```bash
# Enable debug output
HANSOLO_DEBUG=1 hansolo status

# Or verbose mode
hansolo status --verbose

# Log to file
HANSOLO_LOG_FILE=debug.log hansolo ship
```

### Session Debugging

```bash
# Export session for analysis
hansolo debug export-session <session-id> > session.json

# Validate session file
hansolo debug validate-session session.json

# Replay session
hansolo debug replay-session session.json
```

## Recovery Procedures

### Recover from Aborted Workflow

```bash
# Check last known state
hansolo sessions --all

# Find your branch
git branch | grep feature/

# Create new session from branch
git checkout feature/your-branch
hansolo recover

# Continue workflow
hansolo ship
```

### Reset han-solo Completely

```bash
# WARNING: Loses all sessions and configuration

# Backup current state
cp -r ~/.hansolo ~/.hansolo.backup

# Remove han-solo data
rm -rf ~/.hansolo
rm -rf ./.hansolo

# Reinitialize
hansolo init
```

### Manual State Recovery

```bash
# If automatic recovery fails

# 1. Check git state
git status
git branch

# 2. Find session file
ls ~/.hansolo/sessions/

# 3. Manually edit state
vim ~/.hansolo/sessions/<session-id>.json
# Change "state": "ERROR" to last known good state

# 4. Resume
hansolo status
```

## Getting Help

### Built-in Help

```bash
# General help
hansolo --help

# Command-specific help
hansolo launch --help
hansolo ship --help

# Show examples
hansolo examples
```

### Logs and Debugging

```bash
# View logs
tail -f ~/.hansolo/logs/hansolo.log

# Enable trace logging
HANSOLO_LOG_LEVEL=trace hansolo status

# MCP server logs
tail -f ~/.hansolo/logs/mcp-server.log
```

### Community Support

1. **GitHub Issues**: https://github.com/yourusername/hansolo/issues
2. **Documentation**: https://github.com/yourusername/hansolo/wiki
3. **Discord**: Join our Discord server for real-time help

### Reporting Bugs

When reporting bugs, include:

```bash
# Generate bug report
hansolo debug report > bug-report.txt

# Includes:
# - System information
# - Configuration (sanitized)
# - Recent commands
# - Error logs
# - Session state
```

## Prevention Tips

1. **Always run `hansolo validate` after configuration changes**
2. **Keep han-solo updated**: `npm update -g @hansolo/cli`
3. **Regular cleanup**: `hansolo cleanup --old`
4. **Use `--dry-run` for testing**: `hansolo ship --dry-run`
5. **Enable verbose mode when troubleshooting**: `--verbose`
6. **Check status before operations**: `hansolo status`
7. **Backup sessions before major operations**

## FAQ

**Q: Can I use han-solo with existing Git workflows?**
A: Yes, han-solo is additive and doesn't break existing workflows.

**Q: What happens if han-solo crashes mid-operation?**
A: Session state is preserved. Run `hansolo recover` to continue.

**Q: Can I disable specific features?**
A: Yes, most features can be disabled in configuration.

**Q: How do I migrate from git-flow?**
A: Run `hansolo migrate git-flow` for automatic migration.

**Q: Is han-solo compatible with CI/CD?**
A: Yes, use `HANSOLO_AUTO_YES=1` for non-interactive mode.