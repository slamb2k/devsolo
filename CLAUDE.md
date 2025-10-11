# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## ⚠️ CRITICAL RULES - READ FIRST

### 🚫 NEVER Create Documentation Outside docs/

**BEFORE writing ANY .md file, you MUST:**

1. ✅ **Check**: Is this documentation? → **MUST** go in `docs/` folder
2. ✅ **Determine location** using decision tree in `docs/README.md`
3. ✅ **Use correct naming**: `lowercase-with-hyphens.md`
4. ✅ **Update README.md** in the target folder

**FORBIDDEN locations for documentation:**
- ❌ Root directory (e.g., `CLEANUP-SUMMARY.md`, `PLAN.md`)
- ❌ `specs/` (this is for product specs only, NOT implementation plans)
- ❌ Any directory outside `docs/`

**Correct locations:**
- ✅ Implementation plans → `docs/dev/plans/`
- ✅ Bug reports, reviews, summaries → `docs/dev/reports/`
- ✅ User guides → `docs/guides/`
- ✅ Product specs → `docs/specs/`

**If you create a file in the wrong location, you WILL be asked to fix it.**

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
- `git push` → Use `/hansolo:ship` instead
- `gh pr create` → Use `/hansolo:ship` instead
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

## 📚 Documentation Guidelines

When creating or updating documentation, follow the structure defined in `docs/README.md`.

### Folder Structure

- **`docs/guides/`** - User-facing how-to documentation (installation, quickstart, usage, troubleshooting, integrations)
- **`docs/reference/`** - External references and AI context (cached external docs, repomix snapshots)
- **`docs/dev/system/`** - Internal system documentation (source of truth for generating user docs)
- **`docs/dev/plans/`** - Implementation plans, task lists, roadmaps
- **`docs/dev/reports/`** - Bug reports, reviews, implementation summaries
- **`docs/dev/learnings/`** - Reusable patterns, strategies, best practices
- **`docs/specs/`** - Product specifications and design philosophy
- **`docs/archive/`** - Superseded or historical documentation

### Naming Conventions

Always use **lowercase-with-hyphens.md** format:

```
✅ CORRECT: quickstart.md, mcp-integration.md, feature-plan.md
❌ INCORRECT: QuickStart.md, mcp_integration.md, Feature Plan.md
```

For dated snapshots: `repomix-2025-10-09.md`, `export-2025-01-15.md`

### Placement Rules

**Before creating documentation**, read `docs/README.md` for the complete decision tree. Quick guide:

- **User guides** (how-to for end users) → `docs/guides/`
- **External references** (cached external docs, repomix snapshots) → `docs/reference/`
- **Internal system docs** (APIs, commands, config schema) → `docs/dev/system/`
- **Implementation plans** → `docs/dev/plans/`
- **Bug reports, reviews** → `docs/dev/reports/`
- **Patterns, learnings** → `docs/dev/learnings/`
- **Product specs** → `docs/specs/`
- **Completed/superseded docs** → `docs/archive/`

### Using the /hansolo:doc Command

The `/hansolo:doc` slash command has two modes:

**AUDIT MODE** (no arguments): `/hansolo:doc`
- Scans all documentation for naming and placement issues
- Checks for missing README.md entries
- Identifies documents that should be archived
- Offers to fix issues automatically
- Updates all README.md files
- Reports all findings and actions

**CREATE MODE** (with content): `/hansolo:doc <name> <content>`
- Analyzes your content to determine correct placement
- Applies naming conventions automatically
- Updates relevant README.md files
- Archives superseded documents
- Reports all actions taken

### Maintaining READMEs

When adding significant documentation:
1. Create the document in the appropriate folder
2. Update that folder's README.md with an entry
3. Link related documents for cross-references