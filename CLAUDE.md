# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

<!-- BEGIN HAN-SOLO MANAGED SECTION - DO NOT EDIT -->

## 🚀 han-solo Git Workflow Management

This section is automatically managed by han-solo. Last updated: 2025-09-25T18:39:38.122Z

### Workflow Detection

Before performing git operations, check for active han-solo session:

```javascript
// Check if han-solo is managing current work
if (fs.existsSync('.hansolo/session.json')) {
  // han-solo is active - MUST use MCP tools
  return 'use-hansolo-mcp';
} else {
  // No active session - can use standard git
  return 'use-standard-git';
}
```

### ⛔ When han-solo Session is Active

If `.hansolo/session.json` exists, **NEVER** use these commands:
- `git commit` → Use `/hansolo:ship` instead
- `git push` → Use `/hansolo:ship --push` instead
- `gh pr create` → Use `/hansolo:ship --create-pr` instead
- `git checkout -b` → Use `/hansolo:launch` instead
- `git rebase` → han-solo handles this automatically

### ✅ When No Session Exists

If no `.hansolo/session.json` file:
- Safe to use standard git commands
- Can optionally start han-solo workflow with `/hansolo:launch`
- Direct git operations won't conflict with han-solo

### Why This Enforcement?

han-solo maintains a state machine tracking:
- Linear history enforcement
- Automatic rebasing and conflict resolution
- PR readiness validation
- Workflow audit trail

Direct git operations bypass this state tracking and will cause workflow corruption.

### Team Collaboration

- **With han-solo**: Follow session-based rules above
- **Without han-solo**: Use standard git workflow
- **Mixed teams**: Both can work simultaneously using session detection

<!-- END HAN-SOLO MANAGED SECTION -->