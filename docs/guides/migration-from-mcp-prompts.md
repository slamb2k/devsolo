# Migration Guide: Legacy MCP Server to Plugin Architecture

This guide helps existing devsolo users understand the evolution from pure MCP tools to the current plugin architecture with slash commands and specialized sub-agents.

## What Changed?

devsolo has evolved from a pure MCP tool implementation to Claude Code's plugin architecture with slash commands and specialized sub-agents (git-droid, docs-droid). This provides better orchestration, coordination, and user experience while maintaining all existing MCP tools.

### Architecture Evolution

**Before (Pure MCP):**
```
User → Natural Language → MCP Tool → Git/GitHub
                           ↓
                    Everything Mixed
```

**Now (Plugin Architecture):**
```
User → Slash Command → Sub-Agent → MCP Tools → Git/GitHub
         ↓              ↓            ↓
    Orchestration   Coordination   Execution
```

## Command Usage

**MCP Prompts remain unchanged** - the syntax is still `/devsolo:command`:

### Available Slash Commands
```
/devsolo:init
/devsolo:launch
/devsolo:commit
/devsolo:ship
/devsolo:status
/devsolo:sessions
/devsolo:swap
/devsolo:abort
/devsolo:cleanup
/devsolo:hotfix
/devsolo:status-line
/devsolo:prime
/devsolo:docs
```

**Note:** These are slash commands that invoke MCP tools, not the MCP tools themselves.

## New Features

### 1. Specialized Sub-Agents

devsolo now includes two specialized sub-agents:

- **git-droid** 🤖 - Coordinates git workflows with intelligent defaults
- **docs-droid** 📚 - Manages documentation structure and validation

These sub-agents provide smarter workflows with better error handling and recovery.

### 2. Visual Feedback

Each slash command displays a unique ASCII art banner immediately when invoked, providing instant visual feedback that the command is running.

### 3. Better Auto-Completion

Native slash commands integrate with Claude Code's auto-completion system, making commands more discoverable.

### 4. Enhanced Documentation Commands

Two new commands for managing the codebase:

- `/devsolo prime` - Prime Claude's understanding of the codebase
- `/devsolo docs` - Manage documentation with automatic placement and validation

## What's New

### Enhanced Workflow

The new architecture provides:

- Immediate visual feedback (banners)
- Better error messages with actionable suggestions
- Intelligent coordination via sub-agents
- Consistent formatting and output styles

### New Commands

Two new powerful commands are now available:

```bash
# Prime codebase understanding
/devsolo:prime

# Manage documentation
/devsolo:docs  # Audit mode - scans and fixes docs
/devsolo:docs "feature-name" "# Documentation content"  # Create mode
```

## Backward Compatibility

### MCP Tools Still Work

All underlying MCP tools (`devsolo_init`, `devsolo_launch`, etc.) still work exactly as before. You can still use natural language to invoke them:

```
"Use devsolo_ship to commit, push, create PR, and merge"
```

However, we recommend using slash commands for the best experience.

### Configuration Unchanged

Your `.devsolo/` directory structure remains the same:
- Configuration files
- Session storage
- Workflow state

No migration or data conversion needed!

### GitHub Integration Unchanged

All GitHub integration features work exactly as before:
- PR creation
- CI monitoring
- Auto-merging
- Branch cleanup

## Benefits of the New Architecture

### For Users
- 🎯 **More discoverable** - Commands show up in `/` menu
- ⚡ **Faster feedback** - Immediate banner display
- 📝 **Better guided** - Parameter hints built into commands
- 🤖 **Smarter workflows** - Sub-agents provide intelligent coordination

### For Developers
- 🧩 **Better separation of concerns** - Orchestration, coordination, and execution are separate
- 🧪 **Easier testing** - Each layer can be tested independently
- 📚 **Better maintainability** - Clear boundaries between components
- 🔧 **Extensible** - Easy to add new sub-agents or commands

## Troubleshooting

### Using Slash Commands vs MCP Tools

**Slash commands (recommended):**
```
/devsolo:launch "Add authentication feature"
```

**Direct MCP tool calls (still supported):**
```
"Use devsolo_launch to start a new feature for authentication"
```

Both work - slash commands provide better orchestration via sub-agents.

### Commands Not Appearing in Menu

Make sure you've restarted Claude Code after updating devsolo. The plugin architecture requires a restart to load new slash commands.

### Need More Control?

You can still invoke MCP tools directly via natural language if you need fine-grained control:

```
"Use devsolo_launch with parameters: branchName='feature/test', auto=true"
```

However, slash commands provide better orchestration and user experience.

## FAQ

### Q: Do I need to reinstall devsolo?

**A:** No! The update is transparent. Just pull the latest version and restart Claude Code.

### Q: Will my existing sessions work?

**A:** Yes! All session data is backward compatible. Active sessions will continue to work exactly as before.

### Q: What's the difference between slash commands and MCP tools?

**A:** Slash commands (e.g., `/devsolo:launch`) provide orchestration and invoke MCP tools (e.g., `devsolo_launch`) for execution. Slash commands add coordination via sub-agents, while MCP tools remain focused on execution.

### Q: Should I use slash commands or direct MCP tool calls?

**A:** Use slash commands for the best experience - they provide visual feedback, better error handling, and intelligent coordination via sub-agents. Direct MCP tool calls are still supported for advanced use cases.

### Q: Are there any breaking changes?

**A:** No breaking changes. All MCP tools, workflows, and data remain fully compatible. The plugin architecture adds new capabilities without removing existing functionality.

## Getting Help

If you encounter any issues during migration:

1. Check the [main README](../../README.md) for updated documentation
2. Review the [slash commands reference](slash-commands-reference.md)
3. Open an issue on [GitHub](https://github.com/slamb2k/devsolo/issues)

## Summary

The plugin architecture evolution enhances devsolo while maintaining full compatibility:

1. Continue using `/devsolo:command` syntax (no changes needed)
2. Enjoy enhanced features (banners, sub-agents, better orchestration)
3. Explore new commands (`/devsolo:prime`, `/devsolo:docs`)
4. All MCP tools, workflows, and data remain unchanged!

Welcome to the enhanced devsolo plugin architecture! 🚀
