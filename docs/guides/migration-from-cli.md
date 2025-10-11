# Migrating from v1.x (CLI) to v2.0.0 (Pure MCP)

## Overview

devsolo v2.0.0 represents a **complete architectural pivot** from a dual CLI/MCP system to a pure MCP-only design. This guide helps v1.x users understand the changes and migrate successfully.

## What Changed

### Architecture Shift

| v1.x | v2.0.0 |
|------|--------|
| Dual CLI/MCP interface | Pure MCP-only |
| Terminal commands (`devsolo launch`) | Claude Code integration only |
| CLI dependencies (chalk, ora, boxen, inquirer) | Zero terminal dependencies |
| 15,000+ lines | ~9,300 lines (-37%) |
| Manual terminal workflow | AI-assisted workflow |

### Major Changes

**✅ Added:**
- Pure MCP tool architecture
- Structured JSON results
- Comprehensive pre/post-flight validation in every tool
- AI-native design for Claude Code

**❌ Removed:**
- ALL CLI commands
- Terminal UI layer
- Interactive prompts
- Shell completions
- Man pages
- CLI entry point (`devsolo` command)

**🔄 Changed:**
- Package name: `@devsolo/cli` → `devsolo-mcp`
- Installation method: npm global → MCP server configuration
- Interaction model: Terminal → Claude Code
- Result format: Terminal output → Structured JSON

## Should You Migrate?

### Stay on v1.x If:
- You need standalone CLI tool
- You don't use Claude Code
- You have automated scripts using `devsolo` commands
- You need terminal-only workflow
- **Recommendation**: Stay on v1.1.3 until you're ready for Claude Code

### Migrate to v2.0.0 If:
- You use Claude Code
- You want AI-assisted Git workflows
- You prefer natural language interactions
- You want structured validation
- **Recommendation**: Migrate now for best experience

## Migration Steps

### Step 1: Backup Your Configuration

```bash
# Backup existing .devsolo directory
cp -r .devsolo .devsolo.v1.backup

# Note your current configuration
cat .devsolo/config.yaml > ~/devsolo-config-backup.yaml
```

### Step 2: Uninstall v1.x

```bash
# Remove global CLI installation
npm uninstall -g @devsolo/cli

# Or remove from project
npm uninstall @devsolo/cli
```

### Step 3: Install v2.0.0 MCP Server

```bash
# Clone or download devsolo v2.0.0
git clone https://github.com/slamb2k/devsolo.git
cd devsolo

# Install dependencies
npm install

# Build MCP server
npm run build
npm run build:mcp
```

### Step 4: Configure Claude Code

Add devsolo to your Claude Code MCP configuration:

**Location**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration**:
```json
{
  "mcpServers": {
    "devsolo": {
      "command": "node",
      "args": ["/absolute/path/to/devsolo/bin/devsolo-mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Replace `/absolute/path/to/devsolo` with your actual path.

### Step 5: Restart Claude Code

Restart Claude Code to load the MCP server.

### Step 6: Initialize in Your Project

In Claude Code, in your project directory:

```
Use devsolo_init to initialize devsolo in this project
```

Or use the MCP tool directly:
```
/mcp__devsolo__devsolo_init
```

### Step 7: Verify Setup

Check that devsolo is working:

```
Use devsolo_status to check the current state
```

You should see your project status.

## Command Mapping

### Complete CLI → MCP Mapping

| v1.x CLI Command | v2.0.0 MCP Tool | Natural Language Example |
|------------------|-----------------|--------------------------|
| `devsolo init` | `devsolo_init` | "Initialize devsolo in this project" |
| `devsolo launch` | `devsolo_launch` | "Start a new feature for user authentication" |
| `devsolo commit` | `devsolo_commit` | "Commit these changes with message 'feat: add login'" |
| `devsolo ship` | `devsolo_ship` | "Ship this feature to production" |
| `devsolo status` | `devsolo_status` | "Show me the current workflow status" |
| `devsolo sessions` | `devsolo_sessions` | "List all active workflow sessions" |
| `devsolo swap <branch>` | `devsolo_swap` | "Switch to the feature/auth branch" |
| `devsolo abort` | `devsolo_abort` | "Abort the current workflow" |
| `devsolo hotfix` | `devsolo_hotfix` | "Create an emergency hotfix for bug XYZ" |
| `devsolo cleanup` | `devsolo_cleanup` | "Clean up old sessions and branches" |
| `devsolo config` | *(removed)* | Edit `.devsolo/config.yaml` directly |
| `devsolo validate` | *(removed)* | Pre-flight checks now automatic |
| `devsolo perf` | *(removed)* | Not applicable to MCP |
| `devsolo interactive` | *(removed)* | Replaced by natural language |
| `devsolo --help` | *(removed)* | Ask Claude about devsolo commands |
| `devsolo --version` | *(removed)* | Check package.json |

### Workflow Pattern Changes

**v1.x CLI Workflow**:
```bash
# Terminal commands
devsolo launch --branch feature/auth
vim src/auth.ts
devsolo commit --message "feat: add auth"
devsolo ship --pr-description "Add authentication"
```

**v2.0.0 MCP Workflow**:
```
# Natural language in Claude Code
"Start a new feature branch for authentication"
*make changes*
"Commit my changes with message 'feat: add authentication'"
"Ship this feature with PR description: Add authentication system"
```

**v2.0.0 MCP Tool Workflow** (more explicit):
```
Use devsolo_launch with branchName "feature/auth" and description "Authentication system"
*make changes*
Use devsolo_commit with message "feat: add authentication"
Use devsolo_ship with prDescription "Add authentication system"
```

## New Features in v2.0.0

### 1. Structured Results

All MCP tools return structured JSON with detailed validation results:

```typescript
{
  success: boolean;
  branchName?: string;
  state?: string;
  preFlightChecks?: CheckResult[];
  postFlightVerifications?: CheckResult[];
  errors?: string[];
  warnings?: string[];
  nextSteps?: string[];
}
```

### 2. Comprehensive Validation

Every tool includes:
- **Pre-flight checks**: Validate before operation
- **Post-flight verifications**: Confirm after operation
- **Detailed results**: See exactly what passed/failed

### 3. AI-Native Design

- Natural language understanding
- Context-aware suggestions
- Intelligent parameter filling
- Conversational workflow

### 4. Zero Dependencies

- No terminal UI libraries
- Smaller package size
- Faster installation
- Pure TypeScript/Node.js

## Troubleshooting Migration

### MCP Server Not Found

**Problem**: Claude Code can't find the devsolo MCP server

**Solutions**:
1. Verify path in `claude_desktop_config.json` is absolute
2. Check file exists: `ls /path/to/devsolo/bin/devsolo-mcp`
3. Verify it's executable: `chmod +x /path/to/devsolo/bin/devsolo-mcp`
4. Restart Claude Code after config changes

### Configuration Not Found

**Problem**: "devsolo is not initialized"

**Solution**:
```
Use devsolo_init to initialize devsolo in this project
```

This will create `.devsolo` directory in your project.

### Old Sessions

**Problem**: v1.x sessions not recognized

**Solution**: v1.x and v2.0.0 sessions are compatible. The session format hasn't changed. However, you may want to:
```
Use devsolo_sessions with all true to see all sessions
Use devsolo_cleanup to clean up old completed sessions
```

### Scripts Still Use CLI

**Problem**: CI/CD scripts use `devsolo` commands

**Solutions**:
1. **Option A**: Keep v1.x for CI/CD, use v2.0.0 locally
2. **Option B**: Rewrite scripts to use Git directly
3. **Option C**: Wait for potential CLI wrapper in future release

The v2.0.0 architecture makes it possible to add a thin CLI wrapper later if needed, but it's not a priority.

## Frequently Asked Questions

### Will v1.x still be supported?

v1.1.3 is the last v1.x release. Critical bugs may be patched, but new features will only be in v2.0.0+.

### Can I use both v1.x and v2.0.0?

Not in the same project. They use the same `.devsolo` directory structure, but v2.0.0 requires Claude Code.

### What about automation/CI/CD?

v2.0.0 is designed for interactive development with Claude Code, not automation. For CI/CD:
- Continue using v1.x CLI
- Use direct Git commands
- Wait for potential future CLI wrapper

### Can I go back to v1.x?

Yes! Your v1.x backup (Step 1) can be restored:
```bash
rm -rf .devsolo
cp -r .devsolo.v1.backup .devsolo
npm install -g @devsolo/cli@1.1.3
```

### Why remove the CLI entirely?

The CLI added ~8,000 lines of code, complex terminal dependencies, and testing challenges. By focusing purely on MCP:
- 37% smaller codebase
- Zero terminal dependencies
- Better for AI-assisted development
- Easier to maintain
- Can add CLI wrapper later if needed

### When will the CLI return?

Maybe never, maybe in v3.x as a thin wrapper over MCP. The current focus is on AI-native workflows. If there's strong demand, a CLI wrapper could be added without changing the core architecture.

## Getting Help

### Resources
- **New Documentation**: See `docs/guides/` for v2.0.0 guides
- **Old Documentation**: See `docs/archive/v1-cli/` for v1.x reference
- **Issues**: [GitHub Issues](https://github.com/slamb2k/devsolo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/slamb2k/devsolo/discussions)

### Common Migration Questions

Post in [GitHub Discussions](https://github.com/slamb2k/devsolo/discussions) with:
- v1.x version you're migrating from
- Your use case
- Specific migration challenges

## Next Steps

After migrating, see:
- [Quickstart Guide](quickstart.md) - Get started with v2.0.0
- [Usage Guide](usage.md) - Learn MCP workflow patterns
- [MCP Tools Reference](mcp-tools-reference.md) - Complete tool documentation
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

---

**Welcome to devsolo v2.0.0 - AI-native Git workflow automation!** 🤖
